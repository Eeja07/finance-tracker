import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { TransactionType } from '@prisma/client';

@Injectable()
export class TransactionsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(
    userId: string,
    options?: {
      accountId?: string;
      categoryId?: string;
      type?: TransactionType;
      startDate?: string;
      endDate?: string;
      page?: number;
      limit?: number;
    },
  ) {
    const page = Number(options?.page) || 1;
    const limit = Number(options?.limit) || 20;
    const skip = (page - 1) * limit;

    const where: any = { userId };

    if (options?.accountId) where.accountId = options.accountId;
    if (options?.categoryId) where.categoryId = options.categoryId;
    if (options?.type) where.type = options.type;

    if (options?.startDate || options?.endDate) {
      where.date = {};
      if (options?.startDate) where.date.gte = new Date(options.startDate);
      if (options?.endDate) where.date.lte = new Date(options.endDate);
    }

    const [items, total] = await Promise.all([
      this.prisma.transaction.findMany({
        where,
        orderBy: { date: 'desc' },
        skip,
        take: limit,
        include: {
          account: { select: { id: true, name: true, color: true, type: true } },
          category: { select: { id: true, name: true, color: true, icon: true } },
        },
      }),
      this.prisma.transaction.count({ where }),
    ]);

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(userId: string, id: string) {
    const tx = await this.prisma.transaction.findFirst({
      where: { id, userId },
      include: {
        account: true,
        category: true,
      },
    });
    if (!tx) throw new NotFoundException('Transaction not found');
    return tx;
  }

  async create(
    userId: string,
    data: {
      accountId: string;
      categoryId: string;
      type: TransactionType;
      amount: number;
      description: string;
      recipientOrPayer?: string;
      notes?: string;
      date?: string | Date;
      receiptUrl?: string;
      itemImageUrl?: string;
    },
  ) {
    if (data.amount <= 0) {
      throw new BadRequestException('Jumlah transaksi harus lebih dari 0');
    }

    const account = await this.prisma.account.findFirst({
      where: { id: data.accountId, userId },
    });
    if (!account) throw new NotFoundException('Akun / Dompet tidak ditemukan');

    const txDate = data.date ? new Date(data.date) : new Date();

    return this.prisma.$transaction(async (tx) => {
      const createdTx = await tx.transaction.create({
        data: {
          userId,
          accountId: data.accountId,
          categoryId: data.categoryId,
          type: data.type,
          amount: data.amount,
          description: data.description,
          recipientOrPayer: data.recipientOrPayer,
          notes: data.notes,
          date: txDate,
          receiptUrl: data.receiptUrl,
          itemImageUrl: data.itemImageUrl,
        },
        include: {
          account: true,
          category: true,
        },
      });

      // Update account balance
      const balanceChange = data.type === TransactionType.INCOME ? data.amount : -data.amount;
      await tx.account.update({
        where: { id: data.accountId },
        data: { balance: { increment: balanceChange } },
      });

      return createdTx;
    });
  }

  async delete(userId: string, id: string) {
    const existing = await this.findOne(userId, id);

    return this.prisma.$transaction(async (tx) => {
      // Revert account balance
      const balanceChange = existing.type === TransactionType.INCOME ? -existing.amount : existing.amount;
      await tx.account.update({
        where: { id: existing.accountId },
        data: { balance: { increment: balanceChange } },
      });

      return tx.transaction.delete({ where: { id } });
    });
  }

  async getDailyExpenseStats(userId: string, targetDate?: string) {
    const date = targetDate ? new Date(targetDate) : new Date();
    const startOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0);
    const endOfDay = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59);

    const txs = await this.prisma.transaction.findMany({
      where: {
        userId,
        type: TransactionType.EXPENSE,
        date: { gte: startOfDay, lte: endOfDay },
      },
      include: {
        category: true,
        account: true,
      },
      orderBy: { date: 'desc' },
    });

    const totalExpense = txs.reduce((acc, t) => acc + t.amount, 0);

    const categoryBreakdown: Record<string, number> = {};
    txs.forEach((t) => {
      const catName = t.category?.name || 'Lainnya';
      categoryBreakdown[catName] = (categoryBreakdown[catName] || 0) + t.amount;
    });

    return {
      date: startOfDay.toISOString().split('T')[0],
      totalExpense,
      count: txs.length,
      transactions: txs,
      categoryBreakdown,
    };
  }

  async getSummary(userId: string) {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    const accounts = await this.prisma.account.findMany({
      where: { userId, isArchived: false },
    });
    const totalAssets = accounts.reduce((acc, a) => acc + a.balance, 0);

    const monthlyTxs = await this.prisma.transaction.findMany({
      where: {
        userId,
        date: { gte: startOfMonth, lte: endOfMonth },
      },
      include: { category: true },
    });

    let monthlyIncome = 0;
    let monthlyExpense = 0;
    const categoryBreakdown: Record<string, { name: string; color: string; amount: number }> = {};

    monthlyTxs.forEach((t) => {
      if (t.type === TransactionType.INCOME) {
        monthlyIncome += t.amount;
      } else if (t.type === TransactionType.EXPENSE) {
        monthlyExpense += t.amount;
        const catId = t.categoryId;
        if (!categoryBreakdown[catId]) {
          categoryBreakdown[catId] = {
            name: t.category.name,
            color: t.category.color || '#EC4899',
            amount: 0,
          };
        }
        categoryBreakdown[catId].amount += t.amount;
      }
    });

    return {
      totalAssets,
      monthlyIncome,
      monthlyExpense,
      netCashflow: monthlyIncome - monthlyExpense,
      categoryBreakdown: Object.values(categoryBreakdown),
      accountCount: accounts.length,
    };
  }
}
