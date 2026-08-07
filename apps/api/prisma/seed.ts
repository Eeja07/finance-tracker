import { PrismaClient, AccountType, TransactionType, InstallmentStatus, PaymentStatus } from '@prisma/client';
import * as argon2 from 'argon2';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding Finance Tracker database...');

  // 1. Create Demo User
  const passwordHash = await argon2.hash('eejamakkutujuh');
  const user = await prisma.user.upsert({
    where: { email: 'eeja@finance.fun' },
    update: {
      phone: '6281234567890',
      themePreference: 'pink',
    },
    create: {
      email: 'eeja@finance.fun',
      fullName: 'Eeja Makkutujuh',
      passwordHash,
      phone: '6281234567890',
      themePreference: 'pink',
      currency: 'IDR',
    },
  });

  console.log(`👤 User created/updated: ${user.email} (${user.id})`);

  // 2. Default Categories
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

  const categoryMap: Record<string, string> = {};

  for (const cat of defaultCategories) {
    let existing = await prisma.category.findFirst({
      where: { name: cat.name, userId: user.id },
    });

    if (!existing) {
      existing = await prisma.category.create({
        data: {
          name: cat.name,
          type: cat.type,
          icon: cat.icon,
          color: cat.color,
          isSystemDefault: cat.isSystemDefault,
          userId: user.id,
        },
      });
    }

    categoryMap[cat.name] = existing.id;
  }

  console.log('🏷️ Categories seeded');

  // 3. Create Sample Accounts / Wallets
  const bca = await prisma.account.upsert({
    where: { id: '00000000-0000-0000-0000-000000000001' },
    update: { balance: 12500000 },
    create: {
      id: '00000000-0000-0000-0000-000000000001',
      userId: user.id,
      name: 'Bank BCA Utama',
      type: AccountType.BANK,
      accountNumber: '8830912831',
      balance: 12500000,
      color: '#2563EB',
      icon: 'Building2',
    },
  });

  const gopay = await prisma.account.upsert({
    where: { id: '00000000-0000-0000-0000-000000000002' },
    update: { balance: 850000 },
    create: {
      id: '00000000-0000-0000-0000-000000000002',
      userId: user.id,
      name: 'GoPay / OVO',
      type: AccountType.EWALLET,
      accountNumber: '081234567890',
      balance: 850000,
      color: '#00AED6',
      icon: 'Wallet',
    },
  });

  const cash = await prisma.account.upsert({
    where: { id: '00000000-0000-0000-0000-000000000003' },
    update: { balance: 450000 },
    create: {
      id: '00000000-0000-0000-0000-000000000003',
      userId: user.id,
      name: 'Uang Tunai (Dompet)',
      type: AccountType.CASH,
      balance: 450000,
      color: '#10B981',
      icon: 'Banknote',
    },
  });

  console.log('💳 Accounts seeded');

  // 4. Create Sample Installments (Cicilan yang dijalani)
  const laptopInstallment = await prisma.installment.upsert({
    where: { id: '11111111-1111-1111-1111-111111111111' },
    update: {},
    create: {
      id: '11111111-1111-1111-1111-111111111111',
      userId: user.id,
      accountId: bca.id,
      title: 'Cicilan Laptop Gaming ASUS ROG',
      provider: 'BCA Credit Card',
      totalAmount: 18000000,
      monthlyAmount: 1500000,
      totalTenorMonths: 12,
      remainingTenorMonths: 5,
      startDate: new Date('2026-01-10'),
      dueDateDay: 10,
      interestRate: 0,
      status: InstallmentStatus.ACTIVE,
      notes: 'Cicilan 0% 12 Bulan Tokopedia x BCA',
    },
  });

  const kprInstallment = await prisma.installment.upsert({
    where: { id: '22222222-2222-2222-2222-222222222222' },
    update: {},
    create: {
      id: '22222222-2222-2222-2222-222222222222',
      userId: user.id,
      accountId: bca.id,
      title: 'Cicilan KPR Rumah Cluster Rose',
      provider: 'Bank Mandiri',
      totalAmount: 360000000,
      monthlyAmount: 3200000,
      totalTenorMonths: 120,
      remainingTenorMonths: 96,
      startDate: new Date('2024-08-15'),
      dueDateDay: 15,
      interestRate: 6.5,
      status: InstallmentStatus.ACTIVE,
      notes: 'Auto debet setiap tanggal 15',
    },
  });

  // Seed installment payments
  const now = new Date();
  const currentMonthDueDate = new Date(now.getFullYear(), now.getMonth(), 10);
  const nextMonthDueDate = new Date(now.getFullYear(), now.getMonth() + 1, 10);

  await prisma.installmentPayment.upsert({
    where: { id: '33333333-3333-3333-3333-333333333333' },
    update: {},
    create: {
      id: '33333333-3333-3333-3333-333333333333',
      installmentId: laptopInstallment.id,
      tenorNumber: 7,
      amount: 1500000,
      dueDate: currentMonthDueDate,
      status: PaymentStatus.PENDING,
    },
  });

  await prisma.installmentPayment.upsert({
    where: { id: '44444444-4444-4444-4444-444444444444' },
    update: {},
    create: {
      id: '44444444-4444-4444-4444-444444444444',
      installmentId: kprInstallment.id,
      tenorNumber: 25,
      amount: 3200000,
      dueDate: new Date(now.getFullYear(), now.getMonth(), 15),
      status: PaymentStatus.PENDING,
    },
  });

  console.log('📌 Installments & Payments seeded');

  // 5. Sample Transactions for today & past days
  const today = new Date();
  const txs = [
    {
      userId: user.id,
      accountId: bca.id,
      categoryId: categoryMap['Gaji & Pendapatan Utama'],
      type: TransactionType.INCOME,
      amount: 15000000,
      date: new Date(today.getFullYear(), today.getMonth(), 1),
      description: 'Gaji Bulanan PT Maju Bersama',
      recipientOrPayer: 'PT Maju Bersama',
    },
    {
      userId: user.id,
      accountId: gopay.id,
      categoryId: categoryMap['Makanan & Minuman'],
      type: TransactionType.EXPENSE,
      amount: 45000,
      date: today,
      description: 'Makan Siang Nasi Padang',
      recipientOrPayer: 'RM Sederhana',
    },
    {
      userId: user.id,
      accountId: gopay.id,
      categoryId: categoryMap['Makanan & Minuman'],
      type: TransactionType.EXPENSE,
      amount: 28000,
      date: today,
      description: 'Kopi Susu Gula Aren',
      recipientOrPayer: 'Kopi Janji Jiwa',
    },
    {
      userId: user.id,
      accountId: bca.id,
      categoryId: categoryMap['Transportasi'],
      type: TransactionType.EXPENSE,
      amount: 150000,
      date: today,
      description: 'Isi Bensin Pertamax',
      recipientOrPayer: 'SPBU Shell',
    },
    {
      userId: user.id,
      accountId: bca.id,
      categoryId: categoryMap['Tagihan & Utilitas'],
      type: TransactionType.EXPENSE,
      amount: 350000,
      date: new Date(today.getFullYear(), today.getMonth(), 3),
      description: 'Tagihan Listrik PLN & Wi-Fi IndiHome',
      recipientOrPayer: 'PLN & Telkom',
    },
  ];

  for (const t of txs) {
    await prisma.transaction.create({ data: t });
  }

  console.log('💸 Sample transactions seeded');

  // 6. Sample Budget
  await prisma.budget.upsert({
    where: {
      userId_categoryId_month_year: {
        userId: user.id,
        categoryId: categoryMap['Makanan & Minuman'],
        month: today.getMonth() + 1,
        year: today.getFullYear(),
      },
    },
    update: { amountLimit: 2500000 },
    create: {
      userId: user.id,
      categoryId: categoryMap['Makanan & Minuman'],
      month: today.getMonth() + 1,
      year: today.getFullYear(),
      amountLimit: 2500000,
    },
  });

  console.log('📊 Budget seeded');
  console.log('✅ Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
