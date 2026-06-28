import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { createPagBankCheckout, getPagBankConfig } from '../lib/pagbank';
import { getProductPricing, getStorePricingSettings } from '../lib/storePricing';
import { getStoreSettingsMap, parseBool, parseNumber } from '../lib/storeSettings';

const router = Router();

const REQUIRED_DELIVERY_FIELDS = ['cep', 'rua', 'num', 'bairro', 'cidade', 'estado'] as const;
const normalizeEmail = (value: unknown) => String(value ?? '').trim().toLowerCase();
const normalizeCpf = (value: unknown) => String(value ?? '').replace(/\D/g, '').trim();
const normalizePhone = (value: unknown) => String(value ?? '').replace(/\D/g, '').trim();

// POST /api/orders — create order from checkout
router.post('/', async (req, res) => {
  try {
    const {
      customerName,
      customerEmail,
      customerPhone,
      customerCpf,
      items,
      paymentMethod,
      deliveryMethod,
      address,
      couponCode,
      discount,
      installments,
    } = req.body;

    if (!customerName || !customerEmail || !items?.length || !paymentMethod) {
      return res.status(400).json({ error: 'Dados incompletos' });
    }

    const normalizedCustomerEmail = normalizeEmail(customerEmail);
    const normalizedCustomerCpf = normalizeCpf(customerCpf) || undefined;
    const normalizedCustomerPhone = normalizePhone(customerPhone) || undefined;

    const selectedDeliveryMethod = deliveryMethod === 'pickup' ? 'pickup' : 'delivery';
    const normalizedAddress = address && typeof address === 'object' ? address : null;
    const paymentMethodText = String(paymentMethod).trim();
    const isPixPayment = paymentMethodText.toLowerCase().includes('pix');

    const [settings, pricingSettings, pagBankConfig] = await Promise.all([
      getStoreSettingsMap(prisma),
      getStorePricingSettings(prisma),
      getPagBankConfig(prisma),
    ]);
    const deliveryEnabled = settings.deliveryEnabled !== undefined ? parseBool(settings.deliveryEnabled) : true;
    const pickupEnabled = settings.pickupEnabled !== undefined ? parseBool(settings.pickupEnabled) : true;
    const freeShipPromo = parseBool(settings.freeShipPromo);
    const freeShipThreshold = parseNumber(settings.freeShipThreshold);
    const whatsapp = settings.whatsapp?.trim();
    const manualShippingMessage = whatsapp
      ? `Valor do frete informado manualmente no WhatsApp ${whatsapp}`
      : 'Valor do frete informado manualmente pelo WhatsApp após o pedido';
    const requestedInstallments = Math.max(1, Math.trunc(Number(installments) || 1));
    const isCardPayment = paymentMethodText.toLowerCase().includes('cart');

    if ((isPixPayment || isCardPayment) && !normalizedCustomerCpf) {
      return res.status(400).json({ error: 'Informe um CPF válido para pagamentos online' });
    }

    if ((isPixPayment || isCardPayment) && (!normalizedCustomerPhone || normalizedCustomerPhone.length < 10)) {
      return res.status(400).json({ error: 'Informe um telefone válido com DDD para pagamentos online' });
    }

    if (selectedDeliveryMethod === 'delivery' && !deliveryEnabled) {
      return res.status(400).json({ error: 'Entrega a domicílio indisponível no momento' });
    }
    if (selectedDeliveryMethod === 'pickup' && !pickupEnabled) {
      return res.status(400).json({ error: 'Retirada na loja indisponível no momento' });
    }

    if (selectedDeliveryMethod === 'delivery') {
      const missingField = REQUIRED_DELIVERY_FIELDS.find((field) => !normalizedAddress?.[field]?.trim?.());
      if (missingField) {
        return res.status(400).json({ error: 'Preencha todos os dados de entrega obrigatórios' });
      }
    }

    const productIds = items.map((i: { productId: string }) => i.productId);
    const products = await prisma.product.findMany({ where: { id: { in: productIds } } });

    for (const item of items) {
      const prod = products.find((p) => p.id === item.productId);
      if (!prod) return res.status(400).json({ error: `Produto ${item.productId} não encontrado` });
      if (!prod.active) {
        return res.status(400).json({ error: `${prod.name} está desativado e não pode ser vendido no momento` });
      }
      if (prod.stock < item.quantity) {
        return res.status(400).json({ error: `Estoque insuficiente para ${prod.name}. Disponível: ${prod.stock}` });
      }
    }

    const baseSubtotal = items.reduce((acc: number, item: { productId: string; quantity: number }) => {
      const prod = products.find((p) => p.id === item.productId)!;
      const pricing = getProductPricing(prod, pricingSettings, item.quantity, isPixPayment ? 'pix' : 'card');
      return acc + pricing.baseTotalPrice;
    }, 0);

    const productOfferDiscount = items.reduce((acc: number, item: { productId: string; quantity: number }) => {
      const prod = products.find((p) => p.id === item.productId)!;
      const pricing = getProductPricing(prod, pricingSettings, item.quantity, isPixPayment ? 'pix' : 'card');
      return acc + pricing.comboSavings;
    }, 0);

    const subtotal = +(baseSubtotal - productOfferDiscount).toFixed(2);

    let appliedCouponCode: string | null = null;
    let discountAmount = 0;
    let couponFreeShipping = false;

    if (couponCode) {
      const coupon = await prisma.coupon.findUnique({
        where: { code: String(couponCode).toUpperCase() },
      });

      if (!coupon || !coupon.active) {
        return res.status(400).json({ error: 'Cupom inválido ou inativo' });
      }
      if (coupon.expiresAt && coupon.expiresAt < new Date()) {
        return res.status(400).json({ error: 'Cupom expirado' });
      }
      if (coupon.maxUses && coupon.uses >= coupon.maxUses) {
        return res.status(400).json({ error: 'Cupom esgotado' });
      }
      if (subtotal < coupon.minOrder) {
        return res.status(400).json({ error: `Pedido mínimo de R$ ${coupon.minOrder.toFixed(2)} para este cupom` });
      }

      appliedCouponCode = coupon.code;
      discountAmount = coupon.type === 'percent'
        ? (subtotal * coupon.value) / 100
        : coupon.type === 'frete'
          ? 0
          : coupon.value;
      couponFreeShipping = coupon.freeShipping || coupon.type === 'frete';
    } else if (discount) {
      discountAmount = Number(discount) || 0;
    }

    discountAmount = +Math.max(0, Math.min(subtotal, discountAmount)).toFixed(2);
    const totalDiscount = +(productOfferDiscount + discountAmount).toFixed(2);

    const freeShippingApplied =
      selectedDeliveryMethod === 'delivery' &&
      (freeShipPromo || subtotal >= freeShipThreshold || couponFreeShipping);

    const shippingMessage = selectedDeliveryMethod === 'pickup'
      ? 'Retirada na loja'
      : freeShippingApplied
        ? 'Frete grátis aplicado'
        : manualShippingMessage;

    const total = +Math.max(0, subtotal - discountAmount).toFixed(2);
    const cashback = +(total * 0.05).toFixed(2);
    const paymentMethodLabel = isPixPayment
      ? 'PagBank PIX'
      : isCardPayment
        ? `PagBank Cartão ${requestedInstallments}x`
        : paymentMethodText;

    let customer = await prisma.customer.findFirst({
      where: {
        OR: [
          { email: normalizedCustomerEmail },
          ...(normalizedCustomerCpf ? [{ cpf: normalizedCustomerCpf }] : []),
        ],
      },
    });

    if (!customer) {
      customer = await prisma.customer.create({
        data: {
          name: customerName,
          email: normalizedCustomerEmail,
          phone: normalizedCustomerPhone,
          cpf: normalizedCustomerCpf,
          city: normalizedAddress?.cidade,
          state: normalizedAddress?.estado,
        },
      });
    } else {
      customer = await prisma.customer.update({
        where: { id: customer.id },
        data: {
          name: customerName,
          phone: normalizedCustomerPhone,
          city: normalizedAddress?.cidade ?? customer.city,
          state: normalizedAddress?.estado ?? customer.state,
          ...(customer.email === normalizedCustomerEmail ? { email: normalizedCustomerEmail } : {}),
          ...(!customer.cpf && normalizedCustomerCpf ? { cpf: normalizedCustomerCpf } : {}),
        },
      });
    }

    let shouldCreateCheckout = false;
    let order = await prisma.$transaction(async (tx) => {
      const createdOrder = await tx.order.create({
        data: {
          customerId: customer.id,
          customerName,
          customerEmail: normalizedCustomerEmail,
          customerPhone: normalizedCustomerPhone,
          customerCpf: normalizedCustomerCpf,
          subtotal: baseSubtotal,
          total,
          discount: totalDiscount,
          cashback,
          paymentMethod: paymentMethodLabel,
          deliveryMethod: selectedDeliveryMethod,
          address: {
            ...(normalizedAddress || {}),
            freeShippingApplied,
            shippingMessage,
            payment: {
              provider: pagBankConfig ? 'pagbank' : 'manual',
              method: isPixPayment ? 'PIX' : isCardPayment ? 'CREDIT_CARD' : paymentMethodText,
              installments: requestedInstallments,
              checkoutEligible: pagBankConfig ? (selectedDeliveryMethod === 'pickup' || freeShippingApplied) : false,
            },
          },
          couponCode: appliedCouponCode,
          notes: productOfferDiscount > 0 ? `${shippingMessage} | Combo promocional aplicado.` : shippingMessage,
          status: isPixPayment || isCardPayment ? 'aguardando_pagamento' : 'pendente',
          items: {
            create: items.map((item: { productId: string; productName: string; quantity: number; size: string; color: string }) => {
              const prod = products.find((p) => p.id === item.productId)!;
              const productPricing = getProductPricing(prod, pricingSettings);
              const unitPrice = isPixPayment ? productPricing.pixPrice : prod.price;
              return {
                productId: item.productId,
                productName: item.productName,
                quantity: item.quantity,
                price: unitPrice,
                pixPrice: productPricing.pixPrice,
                size: item.size,
                color: item.color,
              };
            }),
          },
        },
        include: { items: true },
      });

      for (const item of items) {
        await tx.product.update({
          where: { id: item.productId },
          data: { stock: { decrement: item.quantity } },
        });
      }

      if (appliedCouponCode) {
        await tx.coupon.update({
          where: { code: appliedCouponCode },
          data: { uses: { increment: 1 } },
        });
      }

      shouldCreateCheckout = Boolean(
        pagBankConfig &&
        (isPixPayment || isCardPayment) &&
        (selectedDeliveryMethod === 'pickup' || freeShippingApplied),
      );

      return createdOrder;
    });

    let payment:
      | {
          provider: 'pagbank';
          method: 'PIX' | 'CREDIT_CARD';
          checkoutId: string;
          checkoutUrl: string;
        }
      | {
          provider: 'manual';
          reason: string;
        }
      | null = null;

    if ((isPixPayment || isCardPayment) && !pagBankConfig) {
      order = await prisma.order.update({
        where: { id: order.id },
        data: {
          status: 'pendente',
          notes: `${shippingMessage} | PagBank ainda não configurado.`,
        },
        include: { items: true },
      });
      payment = {
        provider: 'manual',
        reason: 'Pagamento online temporariamente indisponível. A loja continuará o atendimento manualmente.',
      };
    }

    if ((isPixPayment || isCardPayment) && !shouldCreateCheckout) {
      order = await prisma.order.update({
        where: { id: order.id },
        data: {
          status: 'pendente',
          notes: `${shippingMessage} | Pagamento online liberado após confirmação manual do frete.`,
        },
        include: { items: true },
      });
      payment = {
        provider: 'manual',
        reason: selectedDeliveryMethod === 'delivery' && !freeShippingApplied
          ? 'Pagamento online liberado após a confirmação manual do frete pela loja.'
          : 'Pagamento online indisponível para este pedido.',
      };
    }

    if (shouldCreateCheckout && pagBankConfig) {
      try {
        const checkout = await createPagBankCheckout(pagBankConfig, {
          orderId: order.id,
          customerName,
          customerEmail: normalizedCustomerEmail,
          customerPhone: normalizedCustomerPhone,
          customerCpf: normalizedCustomerCpf,
          discountAmount,
          paymentMethod: isPixPayment ? 'PIX' : 'CREDIT_CARD',
          items: items.map((item: { productId: string; productName: string; quantity: number }) => {
            const prod = products.find((p) => p.id === item.productId)!;
            const unitPrice = isPixPayment ? getProductPricing(prod, pricingSettings).pixPrice : prod.price;
            return {
              referenceId: item.productId,
              name: item.productName,
              quantity: item.quantity,
              unitAmount: unitPrice,
            };
          }),
          shippingType: selectedDeliveryMethod === 'delivery'
            ? (freeShippingApplied ? 'FREE' : undefined)
            : undefined,
          shippingAmount: 0,
          shippingAddress: selectedDeliveryMethod === 'delivery' ? normalizedAddress || undefined : undefined,
        });

        const addressData = order.address && typeof order.address === 'object'
          ? order.address as Record<string, unknown>
          : {};
        const previousPayment = addressData.payment && typeof addressData.payment === 'object'
          ? addressData.payment as Record<string, unknown>
          : {};

        order = await prisma.order.update({
          where: { id: order.id },
          data: {
            address: {
              ...addressData,
              payment: {
                ...previousPayment,
                provider: 'pagbank',
                method: isPixPayment ? 'PIX' : 'CREDIT_CARD',
                checkoutId: checkout.checkoutId,
                redirectUrl: checkout.redirectUrl,
                status: 'WAITING',
                createdAt: new Date().toISOString(),
              },
            },
          },
          include: { items: true },
        });

        payment = {
          provider: 'pagbank',
          method: isPixPayment ? 'PIX' : 'CREDIT_CARD',
          checkoutId: checkout.checkoutId,
          checkoutUrl: checkout.redirectUrl,
        };
      } catch (paymentError) {
        const message = paymentError instanceof Error ? paymentError.message : 'Falha ao iniciar pagamento PagBank';
        order = await prisma.order.update({
          where: { id: order.id },
          data: {
            status: 'pendente',
            notes: `Falha ao iniciar checkout PagBank: ${message}. Atendimento seguirá manualmente.`,
          },
          include: { items: true },
        });
        payment = {
          provider: 'manual',
          reason: `Pagamento online indisponível no momento: ${message}. A loja seguirá o atendimento manualmente.`,
        };
      }
    }

    res.status(201).json({
      order,
      cashback,
      payment,
      shipping: {
        method: selectedDeliveryMethod,
        freeShippingApplied,
        message: shippingMessage,
      },
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Erro ao criar pedido' });
  }
});

// GET /api/orders/:id
router.get('/:id', async (req, res) => {
  try {
    const order = await prisma.order.findUnique({
      where: { id: req.params.id },
      include: { items: true, customer: true },
    });
    if (!order) return res.status(404).json({ error: 'Pedido não encontrado' });
    res.json(order);
  } catch {
    res.status(500).json({ error: 'Erro interno' });
  }
});

export default router;
