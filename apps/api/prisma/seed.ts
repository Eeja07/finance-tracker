import { PrismaClient, TransactionType } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding default system categories for Finance Tracker...');

  const defaultCategories = [
    { name: 'Makanan & Minuman', type: TransactionType.EXPENSE, icon: 'Utensils', color: '#F43F5E', isSystemDefault: true },
    { name: 'Transportasi', type: TransactionType.EXPENSE, icon: 'Car', color: '#3B82F6', isSystemDefault: true },
    { name: 'Tagihan & Utilitas', type: TransactionType.EXPENSE, icon: 'Zap', color: '#EAB308', isSystemDefault: true },
    { name: 'Belanja & Lifestyle', type: TransactionType.EXPENSE, icon: 'ShoppingBag', color: '#EC4899', isSystemDefault: true },
    { name: 'Hiburan', type: TransactionType.EXPENSE, icon: 'Film', color: '#8B5CF6', isSystemDefault: true },
    { name: 'Kesehatan', type: TransactionType.EXPENSE, icon: 'Heart', color: '#10B981', isSystemDefault: true },
    { name: 'Cicilan & Hutang', type: TransactionType.EXPENSE, icon: 'CreditCard', color: '#F97316', isSystemDefault: true },
    { name: 'Gaji & Pendapatan Utama', type: TransactionType.INCOME, icon: 'Briefcase', color: '#22C55E', isSystemDefault: true },
    { name: 'Bonus & Freelance', type: TransactionType.INCOME, icon: 'Gift', color: '#06B6D4', isSystemDefault: true },
    { name: 'Investasi & Passive Income', type: TransactionType.INCOME, icon: 'TrendingUp', color: '#A855F7', isSystemDefault: true },
  ];

  for (const cat of defaultCategories) {
    const existing = await prisma.category.findFirst({
      where: { name: cat.name, isSystemDefault: true },
    });

    if (!existing) {
      await prisma.category.create({
        data: {
          name: cat.name,
          type: cat.type,
          icon: cat.icon,
          color: cat.color,
          isSystemDefault: true,
          userId: null,
        },
      });
    }
  }

  console.log('🏷️ System default categories seeded successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

