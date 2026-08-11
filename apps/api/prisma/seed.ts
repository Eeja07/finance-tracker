import { PrismaClient, TransactionType } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding default system categories for Finance Tracker...');

  const defaultCategories = [
    // === EXPENSE (Pengeluaran) ===
    { name: 'Makanan & Minuman', type: TransactionType.EXPENSE, icon: 'Utensils', color: '#F43F5E', isSystemDefault: true },
    { name: 'Sembako & Belanja Dapur', type: TransactionType.EXPENSE, icon: 'ShoppingBag', color: '#FB7185', isSystemDefault: true },
    { name: 'Kafe, Kopi & Nongkrong', type: TransactionType.EXPENSE, icon: 'Coffee', color: '#E11D48', isSystemDefault: true },
    
    { name: 'Transportasi & Ojol', type: TransactionType.EXPENSE, icon: 'Car', color: '#3B82F6', isSystemDefault: true },
    { name: 'Bensin & Bahan Bakar', type: TransactionType.EXPENSE, icon: 'Fuel', color: '#2563EB', isSystemDefault: true },
    { name: 'Parkir, Tol & Servis', type: TransactionType.EXPENSE, icon: 'Wrench', color: '#1D4ED8', isSystemDefault: true },
    
    { name: 'Tagihan Listrik, Air & Gas', type: TransactionType.EXPENSE, icon: 'Zap', color: '#EAB308', isSystemDefault: true },
    { name: 'Pulsa, Paket Data & Wi-Fi', type: TransactionType.EXPENSE, icon: 'Wifi', color: '#CA8A04', isSystemDefault: true },
    { name: 'Sewa Rumah / Kos', type: TransactionType.EXPENSE, icon: 'Home', color: '#A16207', isSystemDefault: true },

    { name: 'Belanja & Lifestyle', type: TransactionType.EXPENSE, icon: 'ShoppingBag', color: '#EC4899', isSystemDefault: true },
    { name: 'Pakaian & Aksesoris', type: TransactionType.EXPENSE, icon: 'Shirt', color: '#DB2777', isSystemDefault: true },
    { name: 'Elektronik & Gadget', type: TransactionType.EXPENSE, icon: 'Smartphone', color: '#BE185D', isSystemDefault: true },

    { name: 'Kesehatan & Obat', type: TransactionType.EXPENSE, icon: 'HeartPulse', color: '#10B981', isSystemDefault: true },
    { name: 'Skincare & Perawatan Diri', type: TransactionType.EXPENSE, icon: 'Sparkles', color: '#059669', isSystemDefault: true },
    { name: 'Asuransi', type: TransactionType.EXPENSE, icon: 'ShieldCheck', color: '#047857', isSystemDefault: true },

    { name: 'Cicilan & Hutang', type: TransactionType.EXPENSE, icon: 'CreditCard', color: '#F97316', isSystemDefault: true },
    { name: 'Tabungan & Investasi', type: TransactionType.EXPENSE, icon: 'PiggyBank', color: '#EA580C', isSystemDefault: true },
    { name: 'Biaya Admin & Pajak', type: TransactionType.EXPENSE, icon: 'Receipt', color: '#C2410C', isSystemDefault: true },

    { name: 'Pendidikan & Buku', type: TransactionType.EXPENSE, icon: 'GraduationCap', color: '#6366F1', isSystemDefault: true },
    { name: 'Langganan & App Premium', type: TransactionType.EXPENSE, icon: 'Tv', color: '#4F46E5', isSystemDefault: true },

    { name: 'Hiburan & Game', type: TransactionType.EXPENSE, icon: 'Gamepad2', color: '#8B5CF6', isSystemDefault: true },
    { name: 'Liburan & Traveling', type: TransactionType.EXPENSE, icon: 'Plane', color: '#7C3AED', isSystemDefault: true },

    { name: 'Keluarga & Orang Tua', type: TransactionType.EXPENSE, icon: 'Users', color: '#14B8A6', isSystemDefault: true },
    { name: 'Hewan Peliharaan', type: TransactionType.EXPENSE, icon: 'Dog', color: '#0D9488', isSystemDefault: true },

    { name: 'Zakat, Infaq & Sedekah', type: TransactionType.EXPENSE, icon: 'HeartHandshake', color: '#06B6D4', isSystemDefault: true },
    { name: 'Hadiah, Kondangan & Donor', type: TransactionType.EXPENSE, icon: 'Gift', color: '#0891B2', isSystemDefault: true },

    // === INCOME (Pemasukan) ===
    { name: 'Gaji Pokok & Upah', type: TransactionType.INCOME, icon: 'Briefcase', color: '#22C55E', isSystemDefault: true },
    { name: 'Tunjangan & THR', type: TransactionType.INCOME, icon: 'Award', color: '#16A34A', isSystemDefault: true },
    { name: 'Freelance & Side Job', type: TransactionType.INCOME, icon: 'Laptop', color: '#15803D', isSystemDefault: true },
    { name: 'Hasil Usaha & Penjualan', type: TransactionType.INCOME, icon: 'Store', color: '#166534', isSystemDefault: true },

    { name: 'Investasi & Dividen', type: TransactionType.INCOME, icon: 'TrendingUp', color: '#A855F7', isSystemDefault: true },
    { name: 'Hasil Sewa Properti', type: TransactionType.INCOME, icon: 'Building', color: '#9333EA', isSystemDefault: true },

    { name: 'Bonus & Komisi', type: TransactionType.INCOME, icon: 'Coins', color: '#06B6D4', isSystemDefault: true },
    { name: 'Cashback & Reward', type: TransactionType.INCOME, icon: 'BadgePercent', color: '#0284C7', isSystemDefault: true },
    { name: 'Hadiah & Hibah', type: TransactionType.INCOME, icon: 'Gift', color: '#0369A1', isSystemDefault: true },

    { name: 'Pengembalian Dana (Refund)', type: TransactionType.INCOME, icon: 'RotateCcw', color: '#64748B', isSystemDefault: true },
    { name: 'Pelunasan Piutang', type: TransactionType.INCOME, icon: 'HandCoins', color: '#475569', isSystemDefault: true },
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


