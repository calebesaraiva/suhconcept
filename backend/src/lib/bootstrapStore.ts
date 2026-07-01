import bcrypt from 'bcryptjs';
import type { PrismaClient } from '../generated/prisma';
import { adminUsers, demoCouponCodes, productData, sampleCustomerEmails, settings } from '../data/storeSeedData';

let bootstrapPromise: Promise<void> | null = null;

async function syncStore(prisma: PrismaClient) {
  for (const user of adminUsers) {
    const hashedPassword = await bcrypt.hash(user.password, 10);
    await prisma.user.upsert({
      where: { email: user.email },
      update: {
        name: user.name,
        password: hashedPassword,
        role: user.role,
        active: true,
      },
      create: {
        email: user.email,
        password: hashedPassword,
        name: user.name,
        role: user.role,
        active: true,
      },
    });
  }

  for (const product of productData) {
    const existingProduct = await prisma.product.findFirst({
      where: {
        OR: [{ slug: product.slug }, { sku: product.sku }],
      },
      select: { id: true, active: true },
    });

    if (!existingProduct) {
      await prisma.product.create({
        data: {
          slug: product.slug,
          name: product.name,
          price: product.price,
          originalPrice: product.originalPrice ?? null,
          pixPrice: product.pixPrice,
          installments: product.installments,
          image: product.image,
          images: product.images,
          category: product.category,
          categorySlug: product.categorySlug,
          collection: product.collection ?? null,
          tags: product.tags,
          description: product.description,
          sizes: product.sizes,
          colors: product.colors,
          stock: product.stock,
          rating: product.rating,
          reviewCount: product.reviewCount,
          isNew: product.isNew ?? false,
          isBestSeller: product.isBestSeller ?? false,
          discount: product.discount ?? null,
          sku: product.sku,
          active: true,
        },
      });
      continue;
    }

    if (!existingProduct.active) {
      await prisma.product.update({
        where: { id: existingProduct.id },
        data: { active: true },
      });
    }
  }

  for (const [key, value] of Object.entries(settings)) {
    const existingSetting = await prisma.setting.findUnique({ where: { key } });
    if (!existingSetting) {
      await prisma.setting.create({ data: { key, value } });
    }
  }

  await prisma.coupon.deleteMany({
    where: {
      code: { in: demoCouponCodes },
    },
  });

  await prisma.customer.deleteMany({
    where: {
      email: { in: sampleCustomerEmails },
      orders: { none: {} },
    },
  });
}

export function ensureStoreBootstrap(prisma: PrismaClient) {
  if (!bootstrapPromise) {
    bootstrapPromise = syncStore(prisma).catch((error) => {
      bootstrapPromise = null;
      throw error;
    });
  }
  return bootstrapPromise;
}
