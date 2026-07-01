import bcrypt from 'bcryptjs';
import { Router } from 'express';
import { AuthRequest, requireAuth, requireAdmin, requireRole } from '../middleware/auth';
import { prisma } from '../lib/prisma';
import { getStoreSettingsMap } from '../lib/storeSettings';
import { sendOrderOutForDeliveryEmail } from '../lib/mailer';
import { quoteShipping } from '../lib/shipping';
import { canViewCostData, isSellerRole, normalizeRole, sanitizeStaffRole } from '../lib/roles';

const router = Router();
const PROTECTED_SETTINGS = new Set(['storeCode', 'storeName', 'paymentGateway']);
const isPerfumariaCategory = (value: unknown) =>
  String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .includes('perfumaria');
const normalizePaymentMethod = (value: unknown) =>
  String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
const singleQueryValue = (value: unknown) => Array.isArray(value) ? value[0] : value;
const sanitizeDashboardUser = (user: { id: string; name: string; email: string; role: string; active: boolean; createdAt: Date; updatedAt: Date }) => ({
  id: user.id,
  name: user.name,
  email: user.email,
  role: normalizeRole(user.role),
  active: user.active,
  createdAt: user.createdAt,
  updatedAt: user.updatedAt,
});
const resolvePaymentMethodColor = (method: string) => {
  const normalizedMethod = normalizePaymentMethod(method);

  if (normalizedMethod.includes('pix')) return '#22C55E';
  if (normalizedMethod.includes('cartao') || normalizedMethod.includes('credito')) return '#d8a84a';
  if (normalizedMethod.includes('debito')) return '#b8842c';

  return '#555';
};

// Todas as rotas do painel exigem autenticação; permissões específicas são aplicadas por rota.
router.use(requireAuth);

// GET /api/dashboard/overview
router.get('/overview', requireRole('master', 'manager', 'seller'), async (_req, res) => {
  try {
    const [totalOrders, totalRevenue, totalCustomers, totalProducts, recentOrders, topProducts] = await Promise.all([
      prisma.order.count(),
      prisma.order.aggregate({ _sum: { total: true }, where: { status: { not: 'cancelado' } } }),
      prisma.customer.count(),
      prisma.product.count({ where: { active: true } }),
      prisma.order.findMany({
        take: 8,
        orderBy: { createdAt: 'desc' },
        include: { items: true },
      }),
      prisma.orderItem.groupBy({
        by: ['productName'],
        _sum: { quantity: true, price: true },
        orderBy: { _sum: { quantity: 'desc' } },
        take: 5,
      }),
    ]);

    // Monthly sales (last 6 months)
    const months = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const start = new Date(d.getFullYear(), d.getMonth(), 1);
      const end = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59);
      const agg = await prisma.order.aggregate({
        _sum: { total: true },
        _count: { id: true },
        where: { createdAt: { gte: start, lte: end }, status: { not: 'cancelado' } },
      });
      months.push({
        month: start.toLocaleString('pt-BR', { month: 'short' }),
        vendas: agg._sum.total || 0,
        pedidos: agg._count.id,
        meta: 30000,
      });
    }

    // Category breakdown from order items → products
    const allItems = await prisma.orderItem.findMany({
      include: { product: { select: { category: true } } },
      where: { order: { status: { not: 'cancelado' } } },
    });
    const catMap: Record<string, number> = {};
    for (const item of allItems) {
      const cat = item.product?.category ?? 'Outros';
      catMap[cat] = (catMap[cat] || 0) + item.quantity;
    }
    const catTotal = Object.values(catMap).reduce((s, v) => s + v, 1);
    const categoryBreakdown = Object.entries(catMap)
      .map(([name, qty]) => ({ name, value: Math.round((qty / catTotal) * 100), qty }))
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 5);

    res.json({
      stats: {
        totalOrders,
        totalRevenue: totalRevenue._sum.total || 0,
        totalCustomers,
        totalProducts,
      },
      salesData: months,
      recentOrders,
      topProducts: topProducts.map(p => ({
        name: p.productName,
        sales: p._sum.quantity || 0,
        revenue: (p._sum.price || 0) * (p._sum.quantity || 0),
      })),
      categoryBreakdown,
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Erro interno' });
  }
});

// GET /api/dashboard/orders
router.get('/orders', requireRole('master', 'manager', 'seller'), async (req, res) => {
  try {
    const status = singleQueryValue(req.query.status);
    const search = singleQueryValue(req.query.search);
    const page = singleQueryValue(req.query.page);
    const take = 20;
    const skip = (parseInt(String(page || '1'), 10) - 1 || 0) * take;
    const where: Record<string, unknown> = {};
    if (status) where.status = status;
    if (search) {
      where.OR = [
        { customerName: { contains: String(search), mode: 'insensitive' } },
        { customerEmail: { contains: String(search), mode: 'insensitive' } },
        { id: { contains: String(search), mode: 'insensitive' } },
      ];
    }
    const [orders, total] = await Promise.all([
      prisma.order.findMany({ where, orderBy: { createdAt: 'desc' }, take, skip, include: { items: true } }),
      prisma.order.count({ where }),
    ]);
    res.json({ orders, total });
  } catch {
    res.status(500).json({ error: 'Erro interno' });
  }
});

// PATCH /api/dashboard/orders/:id/status
router.patch('/orders/:id/status', requireRole('master', 'manager', 'seller'), async (req: AuthRequest, res) => {
  try {
    const orderId = String(req.params.id);
    const status = String(req.body?.status || '');
    const currentRole = normalizeRole(req.user?.role);
    const validStatuses = isSellerRole(currentRole)
      ? ['em_preparo', 'saiu_para_entrega']
      : ['em_preparo', 'saiu_para_entrega', 'cancelado'];
    if (!validStatuses.includes(status)) return res.status(400).json({ error: 'Status inválido' });
    const existingOrder = await prisma.order.findUnique({
      where: { id: orderId },
      include: { items: true },
    });
    if (!existingOrder) return res.status(404).json({ error: 'Pedido não encontrado' });

    await prisma.order.update({ where: { id: orderId }, data: { status } });
    const order = await prisma.order.findUnique({ where: { id: orderId } });
    const orderItems = await prisma.orderItem.findMany({ where: { orderId } });
    if (!order) return res.status(404).json({ error: 'Pedido não encontrado' });

    let notification: { sent: boolean; reason?: string } | null = null;
    if (status === 'saiu_para_entrega') {
      try {
        const settings = await getStoreSettingsMap(prisma);
        const address =
          existingOrder.address && typeof existingOrder.address === 'object'
            ? (existingOrder.address as Record<string, unknown>)
            : null;

        notification = await sendOrderOutForDeliveryEmail(prisma, {
          orderId: order.id,
          customerName: order.customerName,
          customerEmail: order.customerEmail,
          total: order.total,
          items: orderItems.map((item: { productName: string; quantity: number; size: string; color: string }) => ({
            productName: item.productName,
            quantity: item.quantity,
            size: item.size,
            color: item.color,
          })),
          address,
          storeName: settings.smtpFromName || settings.storeName || 'Loja',
        });
      } catch (error) {
        console.error('Erro ao enviar e-mail de pedido em rota:', error);
        notification = { sent: false, reason: 'Falha ao enviar notificação por e-mail' };
      }
    }

    res.json({ ...order, notification });
  } catch {
    res.status(500).json({ error: 'Erro interno' });
  }
});

// GET /api/dashboard/customers
router.get('/customers', requireRole('master', 'manager'), async (req, res) => {
  try {
    const search = singleQueryValue(req.query.search);
    const where: Record<string, unknown> = {};
    if (search) {
      where.OR = [
        { name: { contains: String(search), mode: 'insensitive' } },
        { email: { contains: String(search), mode: 'insensitive' } },
      ];
    }
    const customers = await prisma.customer.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: { orders: { select: { total: true, createdAt: true } } },
    });
    const result = customers.map(c => ({
      ...c,
      totalOrders: c.orders.length,
      totalSpent: c.orders.reduce((a, o) => a + o.total, 0),
      lastOrder: c.orders[0]?.createdAt?.toISOString().split('T')[0] || null,
    }));
    res.json(result);
  } catch {
    res.status(500).json({ error: 'Erro interno' });
  }
});

// GET /api/dashboard/products
router.get('/products', requireRole('master', 'manager'), async (req: AuthRequest, res) => {
  try {
    const products = await prisma.product.findMany({ orderBy: { createdAt: 'desc' } });
    const canViewCosts = canViewCostData(req.user?.role);
    res.json(products.map((product) => (
      canViewCosts
        ? product
        : { ...product, costPrice: null }
    )));
  } catch {
    res.status(500).json({ error: 'Erro interno' });
  }
});

// POST /api/dashboard/products
router.post('/products', requireRole('master', 'manager'), async (req: AuthRequest, res) => {
  try {
    const { name, sku, category, categorySlug, price, costPrice, pixPrice, originalPrice, stock, description, image, sizes, tags, colors, collection, isNew, isBestSeller, active } = req.body;
    if (!name || !sku || !category || !price) return res.status(400).json({ error: 'Campos obrigatórios: name, sku, category, price' });
    const slug = (name as string).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') + '-' + Date.now();
    const normalizedCategorySlug = String(categorySlug || category)
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '');
    const normalizedColors = isPerfumariaCategory(normalizedCategorySlug) ? [] : (colors || []);
    const sanitizedCostPrice = canViewCostData(req.user?.role) && costPrice ? parseFloat(costPrice) : null;
    const product = await prisma.product.create({
      data: {
        name, sku: (sku as string).toUpperCase(), slug,
        category, categorySlug: normalizedCategorySlug,
        price: parseFloat(price), costPrice: sanitizedCostPrice,
        pixPrice: pixPrice ? parseFloat(pixPrice) : parseFloat(price) * 0.95,
        originalPrice: originalPrice ? parseFloat(originalPrice) : null,
        stock: parseInt(stock ?? 0),
        description: description || '',
        image: image || 'https://placehold.co/400x500/111117/444?text=Produto',
        images: image ? [image] : [],
        installments: { count: 6, value: parseFloat(price) / 6 },
        sizes: sizes || [],
        tags: tags || [],
        collection: collection || null,
        colors: normalizedColors,
        isNew: isNew ?? false,
        isBestSeller: isBestSeller ?? false,
        active: active ?? true,
      },
    });
    res.status(201).json(product);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Erro ao criar produto';
    if (msg.includes('Unique constraint')) return res.status(400).json({ error: 'SKU já existe' });
    res.status(500).json({ error: msg });
  }
});

// PATCH /api/dashboard/products/:id
router.patch('/products/:id', requireRole('master', 'manager'), async (req: AuthRequest, res) => {
  try {
    const productId = String(req.params.id);
    const data = { ...req.body };
    if (!canViewCostData(req.user?.role)) {
      delete data.costPrice;
    } else if (data.costPrice !== undefined) {
      data.costPrice = data.costPrice ? parseFloat(data.costPrice) : null;
    }
    if (data.price !== undefined) data.price = parseFloat(data.price);
    if (data.stock !== undefined) data.stock = parseInt(data.stock);
    if (isPerfumariaCategory(data.categorySlug || data.category)) data.colors = [];
    const product = await prisma.product.update({ where: { id: productId }, data });
    res.json(canViewCostData(req.user?.role) ? product : { ...product, costPrice: null });
  } catch {
    res.status(500).json({ error: 'Erro interno' });
  }
});

// GET /api/dashboard/coupons
router.get('/coupons', requireAdmin, async (_req, res) => {
  try {
    const coupons = await prisma.coupon.findMany({ orderBy: { createdAt: 'desc' } });
    res.json(coupons);
  } catch {
    res.status(500).json({ error: 'Erro interno' });
  }
});

// POST /api/dashboard/coupons
router.post('/coupons', requireAdmin, async (req, res) => {
  try {
    const coupon = await prisma.coupon.create({ data: { ...req.body, code: req.body.code.toUpperCase() } });
    res.status(201).json(coupon);
  } catch {
    res.status(500).json({ error: 'Erro ao criar cupom' });
  }
});

// PATCH /api/dashboard/coupons/:id
router.patch('/coupons/:id', requireAdmin, async (req, res) => {
  try {
    const coupon = await prisma.coupon.update({ where: { id: String(req.params.id) }, data: req.body });
    res.json(coupon);
  } catch {
    res.status(500).json({ error: 'Erro interno' });
  }
});

// DELETE /api/dashboard/coupons/:id
router.delete('/coupons/:id', requireAdmin, async (req, res) => {
  try {
    await prisma.coupon.delete({ where: { id: String(req.params.id) } });
    res.json({ ok: true });
  } catch {
    res.status(500).json({ error: 'Erro interno' });
  }
});

// GET /api/dashboard/finance?period=mensal|trimestral|anual
router.get('/finance', requireRole('master'), async (req, res) => {
  try {
    const period = String(singleQueryValue(req.query.period) || 'mensal');

    // Build time buckets
    const buckets: { label: string; start: Date; end: Date }[] = [];
    const now = new Date();

    if (period === 'mensal') {
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        buckets.push({
          label: d.toLocaleString('pt-BR', { month: 'short' }).replace('.', ''),
          start: new Date(d.getFullYear(), d.getMonth(), 1),
          end:   new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59),
        });
      }
    } else if (period === 'trimestral') {
      for (let i = 3; i >= 0; i--) {
        const q = Math.floor((now.getMonth()) / 3) - i;
        const year = now.getFullYear() + Math.floor(q / 4);
        const qMod = ((q % 4) + 4) % 4;
        buckets.push({
          label: `T${qMod + 1}/${year.toString().slice(2)}`,
          start: new Date(year, qMod * 3, 1),
          end:   new Date(year, qMod * 3 + 3, 0, 23, 59, 59),
        });
      }
    } else {
      for (let i = 2; i >= 0; i--) {
        const year = now.getFullYear() - i;
        buckets.push({
          label: String(year),
          start: new Date(year, 0, 1),
          end:   new Date(year, 11, 31, 23, 59, 59),
        });
      }
    }

    // Revenue per bucket (real orders, excluding cancelled)
    const chartData = await Promise.all(buckets.map(async b => {
      const agg = await prisma.order.aggregate({
        _sum: { total: true },
        _count: { id: true },
        where: { createdAt: { gte: b.start, lte: b.end }, status: { not: 'cancelado' } },
      });
      const receita = agg._sum.total || 0;
      const pedidos = agg._count.id;
      return {
        mes: b.label,
        receita,
        pedidos,
        ticketMedio: pedidos > 0 ? +(receita / pedidos).toFixed(2) : 0,
      };
    }));

    // Payment methods breakdown from ALL non-cancelled orders in period range
    const periodStart = buckets[0].start;
    const periodEnd   = buckets[buckets.length - 1].end;

    const allOrders = await prisma.order.findMany({
      select: { paymentMethod: true, total: true },
      where: { createdAt: { gte: periodStart, lte: periodEnd }, status: { not: 'cancelado' } },
    });

    const pmMap: Record<string, { count: number; total: number }> = {};
    for (const o of allOrders) {
      const key = o.paymentMethod || 'outros';
      if (!pmMap[key]) pmMap[key] = { count: 0, total: 0 };
      pmMap[key].count++;
      pmMap[key].total += o.total;
    }
    const grandTotal = Object.values(pmMap).reduce((s, v) => s + v.total, 0) || 1;

    const paymentMethods = Object.entries(pmMap).map(([method, v]) => ({
      method,
      count: v.count,
      total: v.total,
      pct: Math.round((v.total / grandTotal) * 100),
      color: resolvePaymentMethodColor(method),
    })).sort((a, b) => b.total - a.total);

    const [totalsAgg, activeCustomers] = await Promise.all([
      prisma.order.aggregate({
        _sum: { total: true },
        _count: { id: true },
        where: { createdAt: { gte: periodStart, lte: periodEnd }, status: { not: 'cancelado' } },
      }),
      prisma.customer.count({
        where: {
          orders: {
            some: {
              createdAt: { gte: periodStart, lte: periodEnd },
              status: { not: 'cancelado' },
            },
          },
        },
      }),
    ]);

    const totReceita = totalsAgg._sum.total || 0;
    const totalPedidos = totalsAgg._count.id;

    res.json({
      chartData,
      paymentMethods,
      totals: {
        receita: totReceita,
        pedidos: totalPedidos,
        ticketMedio: totalPedidos > 0 ? +(totReceita / totalPedidos).toFixed(2) : 0,
        clientes: activeCustomers,
      },
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Erro interno' });
  }
});

// GET /api/dashboard/settings
router.get('/settings', requireRole('master'), async (_req, res) => {
  try {
    const rows = await prisma.setting.findMany();
    const map: Record<string, string> = {};
    for (const r of rows) map[r.key] = r.value;
    res.json(map);
  } catch { res.status(500).json({ error: 'Erro interno' }); }
});

// PUT /api/dashboard/settings
router.put('/settings', requireRole('master'), async (req, res) => {
  try {
    const entries = Object.entries(req.body as Record<string, string>).filter(([key]) => !PROTECTED_SETTINGS.has(key));
    await Promise.all(entries.map(([key, value]) =>
      prisma.setting.upsert({ where: { key }, update: { value: String(value) }, create: { key, value: String(value) } })
    ));
    res.json({ ok: true });
  } catch { res.status(500).json({ error: 'Erro interno' }); }
});

// GET /api/dashboard/alerts — real-time bell notifications
router.get('/alerts', requireRole('master', 'manager', 'seller'), async (_req, res) => {
  try {
    const [pendingOrders, lowStockProducts] = await Promise.all([
      prisma.order.findMany({
        where: { status: { in: ['pendente', 'aguardando_pagamento'] } },
        orderBy: { createdAt: 'desc' },
        take: 10,
        include: { items: true },
      }),
      prisma.product.findMany({
        where: { active: true, stock: { lte: 5, gt: 0 } },
        orderBy: { stock: 'asc' },
        take: 5,
        select: { id: true, name: true, stock: true },
      }),
    ]);

    const alerts = [
      ...pendingOrders.map(o => ({
        id: `order-${o.id}`,
        type: 'order' as const,
        title: 'Novo pedido — aguardando separação',
        desc: `${o.customerName} · R$ ${o.total.toFixed(2).replace('.', ',')} · ${o.paymentMethod}`,
        orderId: o.id,
        customerName: o.customerName,
        customerEmail: o.customerEmail,
        customerPhone: o.customerPhone,
        total: o.total,
        paymentMethod: o.paymentMethod,
        itemsCount: o.items.length,
        itemsSummary: o.items.map(item => `${item.productName} x${item.quantity}`).join(', '),
        addressSummary: o.deliveryMethod === 'delivery' && o.address && typeof o.address === 'object'
          ? [
              (o.address as Record<string, unknown>).rua,
              (o.address as Record<string, unknown>).num,
              (o.address as Record<string, unknown>).bairro,
              (o.address as Record<string, unknown>).cidade,
              (o.address as Record<string, unknown>).estado,
            ].filter(Boolean).join(' · ')
          : 'Retirada na loja',
        time: o.createdAt,
        color: '#a855f7',
        urgent: true,
      })),
      ...lowStockProducts.map(p => ({
        id: `stock-${p.id}`,
        type: 'stock' as const,
        title: 'Estoque crítico',
        desc: `${p.name} — apenas ${p.stock} unidade${p.stock !== 1 ? 's' : ''}`,
        time: null,
        color: '#f59e0b',
        urgent: p.stock <= 2,
      })),
    ];

    res.json({ alerts, urgentCount: alerts.filter(a => a.urgent).length });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Erro interno' });
  }
});

router.post('/shipping/simulate', requireRole('master', 'manager', 'seller'), async (req, res) => {
  try {
    const cepDestino = String(req.body?.cepDestino || '');
    const items = Array.isArray(req.body?.items) ? req.body.items : [];
    if (!items.length) {
      return res.status(400).json({ error: 'Selecione ao menos um produto para simular o frete' });
    }

    const ids = items.map((item: { productId: string }) => item.productId).filter(Boolean);
    const products = await prisma.product.findMany({ where: { id: { in: ids } } });
    const normalizedItems = (items as Array<{ productId: string; quantity: number }>)
      .map((item: { productId: string; quantity: number }) => {
        const product = products.find((entry) => entry.id === item.productId);
        if (!product) return null;
        return {
          id: product.id,
          name: product.name,
          quantity: Math.max(1, Math.trunc(Number(item.quantity) || 1)),
          unitPrice: product.price,
        };
      })
      .filter((item): item is { id: string; name: string; quantity: number; unitPrice: number } => Boolean(item));

    if (!normalizedItems.length) {
      return res.status(400).json({ error: 'Nenhum produto válido foi informado na simulação' });
    }

    const subtotal = normalizedItems.reduce((acc: number, item: { quantity: number; unitPrice: number }) => acc + item.unitPrice * item.quantity, 0);
    const itemCount = normalizedItems.reduce((acc: number, item: { quantity: number }) => acc + item.quantity, 0);
    const quote = await quoteShipping(prisma, {
      cepDestino,
      subtotal,
      itemCount,
    });

    res.json({
      subtotal,
      itemCount,
      quote,
      products: normalizedItems,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro ao simular frete';
    res.status(400).json({ error: message });
  }
});

router.get('/users', requireRole('master'), async (_req, res) => {
  try {
    const users = await prisma.user.findMany({
      where: { role: { in: ['admin', 'staff', 'master', 'manager', 'seller'] } },
      orderBy: [{ active: 'desc' }, { createdAt: 'asc' }],
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        active: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    res.json(users.map(sanitizeDashboardUser));
  } catch {
    res.status(500).json({ error: 'Erro interno' });
  }
});

router.post('/users', requireRole('master'), async (req: AuthRequest, res) => {
  try {
    const { name, email, password, role, active } = req.body ?? {};
    const cleanName = String(name || '').trim();
    const cleanEmail = String(email || '').trim().toLowerCase();
    const cleanPassword = String(password || '');
    const cleanRole = sanitizeStaffRole(role);

    if (cleanName.length < 2) {
      return res.status(400).json({ error: 'Informe um nome válido' });
    }

    if (!cleanEmail || !cleanEmail.includes('@')) {
      return res.status(400).json({ error: 'Informe um e-mail válido' });
    }

    if (cleanPassword.length < 6) {
      return res.status(400).json({ error: 'A senha deve ter pelo menos 6 caracteres' });
    }

    const existingUser = await prisma.user.findUnique({ where: { email: cleanEmail } });
    if (existingUser) {
      return res.status(409).json({ error: 'Já existe um usuário com esse e-mail' });
    }

    const hashedPassword = await bcrypt.hash(cleanPassword, 10);
    const user = await prisma.user.create({
      data: {
        name: cleanName,
        email: cleanEmail,
        password: hashedPassword,
        role: cleanRole,
        active: active !== false,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        active: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    res.status(201).json(sanitizeDashboardUser(user));
  } catch {
    res.status(500).json({ error: 'Erro interno' });
  }
});

router.patch('/users/:id', requireRole('master'), async (req: AuthRequest, res) => {
  try {
    const userId = String(req.params.id);
    const currentUserId = req.user?.id;
    const existingUser = await prisma.user.findUnique({ where: { id: userId } });
    if (!existingUser) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    const data: Record<string, unknown> = {};

    if (req.body?.name !== undefined) {
      const cleanName = String(req.body.name || '').trim();
      if (cleanName.length < 2) {
        return res.status(400).json({ error: 'Informe um nome válido' });
      }
      data.name = cleanName;
    }

    if (req.body?.email !== undefined) {
      const cleanEmail = String(req.body.email || '').trim().toLowerCase();
      if (!cleanEmail || !cleanEmail.includes('@')) {
        return res.status(400).json({ error: 'Informe um e-mail válido' });
      }
      const collision = await prisma.user.findFirst({
        where: { email: cleanEmail, id: { not: userId } },
        select: { id: true },
      });
      if (collision) {
        return res.status(409).json({ error: 'Já existe um usuário com esse e-mail' });
      }
      data.email = cleanEmail;
    }

    if (req.body?.role !== undefined) {
      data.role = sanitizeStaffRole(req.body.role);
    }

    if (req.body?.active !== undefined) {
      if (currentUserId === userId && req.body.active === false) {
        return res.status(400).json({ error: 'Você não pode desativar o próprio acesso' });
      }
      data.active = Boolean(req.body.active);
    }

    if (req.body?.password) {
      const cleanPassword = String(req.body.password);
      if (cleanPassword.length < 6) {
        return res.status(400).json({ error: 'A senha deve ter pelo menos 6 caracteres' });
      }
      data.password = await bcrypt.hash(cleanPassword, 10);
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        active: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    res.json(sanitizeDashboardUser(user));
  } catch {
    res.status(500).json({ error: 'Erro interno' });
  }
});

export default router;
