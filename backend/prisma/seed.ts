import { PrismaClient } from '../src/generated/prisma';
import { ensureStoreBootstrap } from '../src/lib/bootstrapStore';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');
  await ensureStoreBootstrap(prisma);
  console.log('✅ Seed complete!');
  console.log('👤 Alisson: admin@suhconcept.com.br / suh@2026');
  console.log('👤 Nexus: nexus@suhconcept.com.br / nexus@2026');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
