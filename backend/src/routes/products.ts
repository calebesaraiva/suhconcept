import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { getStorePricingSettings, serializeProductWithStorePricing } from '../lib/storePricing';

const router = Router();

// GET /api/products
router.get('/', async (req, res) => {
  try {
    const { category, search, sort, collection, bestSeller, isNew, limit, page } = req.query;
    const take = parseInt(limit as string) || 500;
    const skip = (parseInt(page as string) - 1 || 0) * take;

    const where: Record<string, unknown> = { active: true };
    const andConditions: Array<{ OR: Record<string, unknown>[] }> = [];

    if (category && category !== 'todos') {
      andConditions.push({
        OR: [
          { categorySlug: category },
          { tags: { has: category } },
          { collection: { contains: category as string, mode: 'insensitive' } },
        ],
      });
    }
    if (collection) where.collection = { contains: collection as string, mode: 'insensitive' };
    if (bestSeller === 'true') where.isBestSeller = true;
    if (isNew === 'true') where.isNew = true;
    if (search) {
      andConditions.push({
        OR: [
          { name: { contains: search as string, mode: 'insensitive' } },
          { description: { contains: search as string, mode: 'insensitive' } },
          { tags: { has: search as string } },
          { category: { contains: search as string, mode: 'insensitive' } },
        ],
      });
    }

    if (andConditions.length) {
      where.AND = andConditions;
    }

    let orderBy: Record<string, string> = { createdAt: 'desc' };
    if (sort === 'price_asc') orderBy = { price: 'asc' };
    else if (sort === 'price_desc') orderBy = { price: 'desc' };
    else if (sort === 'rating') orderBy = { rating: 'desc' };
    else if (sort === 'new') orderBy = { createdAt: 'desc' };

    const [raw, total, pricingSettings] = await Promise.all([
      prisma.product.findMany({ where, orderBy, take, skip }),
      prisma.product.count({ where }),
      getStorePricingSettings(prisma),
    ]);

    const products = raw.map((p) => serializeProductWithStorePricing(p, pricingSettings));
    res.json({ products, total, page: parseInt(page as string) || 1, pages: Math.ceil(total / take) });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Erro ao buscar produtos' });
  }
});

// GET /api/products/:slug
router.get('/:slug', async (req, res) => {
  try {
    const [product, pricingSettings] = await Promise.all([
      prisma.product.findFirst({ where: { slug: req.params.slug, active: true } }),
      getStorePricingSettings(prisma),
    ]);
    if (!product) return res.status(404).json({ error: 'Produto não encontrado' });
    res.json(serializeProductWithStorePricing(product, pricingSettings));
  } catch {
    res.status(500).json({ error: 'Erro interno' });
  }
});

export default router;
