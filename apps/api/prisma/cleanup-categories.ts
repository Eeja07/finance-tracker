import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function cleanup() {
  console.log('🧹 Cleaning up duplicate & outdated categories...');

  // 1. Fix "Cicilan & Hutang"
  const usedCicilanCat = await prisma.category.findUnique({
    where: { id: '104adc76-f608-4688-aaf7-eba48c21e883' },
  });

  if (usedCicilanCat) {
    // Make the one with 34 transactions system default
    await prisma.category.update({
      where: { id: '104adc76-f608-4688-aaf7-eba48c21e883' },
      data: { isSystemDefault: true, userId: null },
    });
    console.log('✅ Promoted used Cicilan & Hutang category to system default');

    // Delete unused duplicate "Cicilan & Hutang" categories
    const deletedCicilan = await prisma.category.deleteMany({
      where: {
        name: 'Cicilan & Hutang',
        id: { not: '104adc76-f608-4688-aaf7-eba48c21e883' },
      },
    });
    console.log(`✅ Deleted ${deletedCicilan.count} duplicate Cicilan & Hutang categories`);
  }

  // 2. Remove old redundant generic category names
  const oldCategoryNames = [
    'Transportasi',
    'Tagihan & Utilitas',
    'Hiburan',
    'Kesehatan',
    'Gaji & Pendapatan Utama',
    'Bonus & Freelance',
    'Investasi & Passive Income',
  ];

  for (const name of oldCategoryNames) {
    const deleted = await prisma.category.deleteMany({
      where: { name, isSystemDefault: true },
    });
    if (deleted.count > 0) {
      console.log(`✅ Removed redundant old category: "${name}" (${deleted.count} removed)`);
    }
  }

  const finalCount = await prisma.category.count();
  console.log(`🎉 Cleanup complete! Total unique categories remaining: ${finalCount}`);
}

cleanup()
  .catch((e) => console.error(e))
  .finally(() => prisma.$disconnect());
