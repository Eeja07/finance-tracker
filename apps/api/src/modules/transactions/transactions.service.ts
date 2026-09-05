import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Prisma, TransactionType, PaymentStatus, InstallmentStatus } from '@prisma/client';

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

    const where: Prisma.TransactionWhereInput = { userId };

    if (options?.accountId) where.accountId = options.accountId;
    if (options?.categoryId) where.categoryId = options.categoryId;
    if (options?.type) where.type = options.type;

    if (options?.startDate || options?.endDate) {
      const dateRange: Prisma.DateTimeFilter = {};
      if (options?.startDate) dateRange.gte = new Date(options.startDate);
      if (options?.endDate) dateRange.lte = new Date(options.endDate);

      where.AND = [
        {
          OR: [
            {
              date: dateRange,
            },
            {
              installmentPayment: {
                dueDate: dateRange,
              },
            },
          ],
        },
      ];
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
          installmentPayment: {
            select: {
              id: true,
              dueDate: true,
              paidDate: true,
              tenorNumber: true,
              status: true,
              installment: {
                select: {
                  id: true,
                  title: true,
                  provider: true,
                  totalTenorMonths: true,
                },
              },
            },
          },
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
        installmentPayment: {
          include: {
            installment: true,
          },
        },
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
      installmentPaymentId?: string;
    },
  ) {
    if (data.amount <= 0) {
      throw new BadRequestException('Jumlah transaksi harus lebih dari 0');
    }

    const account = await this.prisma.account.findFirst({
      where: { id: data.accountId, userId },
    });
    if (!account) throw new NotFoundException('Akun / Dompet tidak ditemukan');

    let payment: any = null;
    if (data.installmentPaymentId) {
      payment = await this.prisma.installmentPayment.findFirst({
        where: { id: data.installmentPaymentId },
        include: { installment: true },
      });
      if (!payment || payment.installment.userId !== userId) {
        throw new NotFoundException('Tagihan cicilan tidak ditemukan');
      }
      if (payment.status === PaymentStatus.PAID) {
        throw new BadRequestException('Tagihan cicilan ini sudah berstatus lunas');
      }
    }

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
          installmentPaymentId: data.installmentPaymentId || null,
        },
        include: {
          account: true,
          category: true,
          installmentPayment: {
            include: {
              installment: true,
            },
          },
        },
      });

      // Update account balance
      const balanceChange = data.type === TransactionType.INCOME ? data.amount : -data.amount;
      await tx.account.update({
        where: { id: data.accountId },
        data: { balance: { increment: balanceChange } },
      });

      // If linked to installment payment, mark it as PAID and update installment
      if (data.installmentPaymentId && payment) {
        await tx.installmentPayment.update({
          where: { id: data.installmentPaymentId },
          data: {
            amount: data.amount,
            status: PaymentStatus.PAID,
            paidDate: txDate,
          },
        });

        const remainingPending = await tx.installmentPayment.count({
          where: {
            installmentId: payment.installmentId,
            status: { not: PaymentStatus.PAID },
          },
        });

        await tx.installment.update({
          where: { id: payment.installmentId },
          data: {
            remainingTenorMonths: remainingPending,
            status: remainingPending === 0 ? InstallmentStatus.COMPLETED : InstallmentStatus.ACTIVE,
          },
        });
      }

      return createdTx;
    });
  }

  async update(
    userId: string,
    id: string,
    data: Partial<{
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
      installmentPaymentId?: string;
    }>,
  ) {
    const existing = await this.findOne(userId, id);

    if (data.amount !== undefined && data.amount <= 0) {
      throw new BadRequestException('Jumlah transaksi harus lebih dari 0');
    }

    const newAccountId = data.accountId || existing.accountId;
    const newType = data.type || existing.type;
    const newAmount = data.amount !== undefined ? data.amount : existing.amount;

    return this.prisma.$transaction(async (tx) => {
      // 1. Revert old balance impact on existing account
      const oldRevertImpact = existing.type === TransactionType.INCOME ? -existing.amount : existing.amount;
      await tx.account.update({
        where: { id: existing.accountId },
        data: { balance: { increment: oldRevertImpact } },
      });

      // 2. Update transaction
      const updatedTx = await tx.transaction.update({
        where: { id },
        data: {
          ...(data.accountId ? { accountId: data.accountId } : {}),
          ...(data.categoryId ? { categoryId: data.categoryId } : {}),
          ...(data.type ? { type: data.type } : {}),
          ...(data.amount !== undefined ? { amount: data.amount } : {}),
          ...(data.description !== undefined ? { description: data.description } : {}),
          ...(data.recipientOrPayer !== undefined ? { recipientOrPayer: data.recipientOrPayer } : {}),
          ...(data.notes !== undefined ? { notes: data.notes } : {}),
          ...(data.date ? { date: new Date(data.date) } : {}),
          ...(data.receiptUrl !== undefined ? { receiptUrl: data.receiptUrl } : {}),
          ...(data.itemImageUrl !== undefined ? { itemImageUrl: data.itemImageUrl } : {}),
          ...(data.installmentPaymentId !== undefined ? { installmentPaymentId: data.installmentPaymentId } : {}),
        },
        include: {
          account: true,
          category: true,
          installmentPayment: {
            include: {
              installment: true,
            },
          },
        },
      });

      // 3. Apply new balance impact on target account
      const newApplyImpact = newType === TransactionType.INCOME ? newAmount : -newAmount;
      await tx.account.update({
        where: { id: newAccountId },
        data: { balance: { increment: newApplyImpact } },
      });

      // 4. Synchronize installment payment status if changed
      if (data.installmentPaymentId !== undefined && data.installmentPaymentId !== existing.installmentPaymentId) {
        if (existing.installmentPaymentId) {
          const oldPayment = await tx.installmentPayment.findUnique({
            where: { id: existing.installmentPaymentId },
          });
          if (oldPayment) {
            await tx.installmentPayment.update({
              where: { id: existing.installmentPaymentId },
              data: { status: PaymentStatus.PENDING, paidDate: null },
            });
            const remaining = await tx.installmentPayment.count({
              where: { installmentId: oldPayment.installmentId, status: { not: PaymentStatus.PAID } },
            });
            await tx.installment.update({
              where: { id: oldPayment.installmentId },
              data: {
                remainingTenorMonths: remaining,
                status: InstallmentStatus.ACTIVE,
              },
            });
          }
        }

        if (data.installmentPaymentId) {
          const newPayment = await tx.installmentPayment.findFirst({
            where: { id: data.installmentPaymentId },
            include: { installment: true },
          });
          if (!newPayment || newPayment.installment.userId !== userId) {
            throw new NotFoundException('Tagihan cicilan tidak ditemukan');
          }
          await tx.installmentPayment.update({
            where: { id: data.installmentPaymentId },
            data: {
              status: PaymentStatus.PAID,
              paidDate: data.date ? new Date(data.date) : existing.date,
              amount: newAmount,
            },
          });
          const remaining = await tx.installmentPayment.count({
            where: { installmentId: newPayment.installmentId, status: { not: PaymentStatus.PAID } },
          });
          await tx.installment.update({
            where: { id: newPayment.installmentId },
            data: {
              remainingTenorMonths: remaining,
              status: remaining === 0 ? InstallmentStatus.COMPLETED : InstallmentStatus.ACTIVE,
            },
          });
        }
      }

      return updatedTx;
    });
  }

  async delete(userId: string, id: string) {
    const existing = await this.findOne(userId, id);

    return this.prisma.$transaction(async (tx) => {
      // 1. Revert account balance
      const balanceChange = existing.type === TransactionType.INCOME ? -existing.amount : existing.amount;
      await tx.account.update({
        where: { id: existing.accountId },
        data: { balance: { increment: balanceChange } },
      });

      // 2. If this transaction is linked to an installment payment, revert installment payment & remaining tenor
      if (existing.installmentPaymentId) {
        const payment = await tx.installmentPayment.findUnique({
          where: { id: existing.installmentPaymentId },
          include: { installment: true },
        });

        if (payment) {
          await tx.installmentPayment.update({
            where: { id: existing.installmentPaymentId },
            data: {
              status: PaymentStatus.PENDING,
              paidDate: null,
            },
          });

          const remainingPending = await tx.installmentPayment.count({
            where: {
              installmentId: payment.installmentId,
              status: { not: PaymentStatus.PAID },
            },
          });

          await tx.installment.update({
            where: { id: payment.installmentId },
            data: {
              remainingTenorMonths: remainingPending,
              status: InstallmentStatus.ACTIVE,
            },
          });
        }
      }

      return tx.transaction.delete({ where: { id } });
    });
  }

  async getDailyExpenseStats(userId: string, targetDate?: string) {
    let year: number;
    let month: number;
    let day: number;

    if (targetDate && /^\d{4}-\d{2}-\d{2}$/.test(targetDate)) {
      const parts = targetDate.split('-').map(Number);
      year = parts[0];
      month = parts[1] - 1;
      day = parts[2];
    } else {
      const date = targetDate ? new Date(targetDate) : new Date();
      year = date.getFullYear();
      month = date.getMonth();
      day = date.getDate();
    }

    const startOfDay = new Date(year, month, day, 0, 0, 0, 0);
    const endOfDay = new Date(year, month, day, 23, 59, 59, 999);

    const txs = await this.prisma.transaction.findMany({
      where: {
        userId,
        type: TransactionType.EXPENSE,
        OR: [
          {
            date: { gte: startOfDay, lte: endOfDay },
          },
          {
            installmentPayment: {
              dueDate: { gte: startOfDay, lte: endOfDay },
            },
          },
        ],
      },
      include: {
        category: true,
        account: true,
        installmentPayment: true,
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

  async getSummary(userId: string, month?: number, year?: number) {
    const now = new Date();
    const targetMonth = month ? Math.max(1, Math.min(12, Number(month))) : now.getMonth() + 1;
    const targetYear = year ? Number(year) : now.getFullYear();

    // Boundary calculation covering local, UTC, and WIB (UTC+7)
    const localStart = new Date(targetYear, targetMonth - 1, 1, 0, 0, 0, 0);
    const localEnd = new Date(targetYear, targetMonth, 0, 23, 59, 59, 999);

    const utcStart = new Date(Date.UTC(targetYear, targetMonth - 1, 1, 0, 0, 0, 0));
    const wibStart = new Date(utcStart.getTime() - 7 * 3600 * 1000);
    const startOfMonth = new Date(Math.min(localStart.getTime(), utcStart.getTime(), wibStart.getTime()));

    const nextMonthUtc = new Date(Date.UTC(targetYear, targetMonth, 1, 0, 0, 0, 0));
    const utcEnd = new Date(nextMonthUtc.getTime() - 1);
    const wibEnd = new Date(nextMonthUtc.getTime() - 7 * 3600 * 1000 - 1);
    const endOfMonth = new Date(Math.max(localEnd.getTime(), utcEnd.getTime(), wibEnd.getTime()));

    const accounts = await this.prisma.account.findMany({
      where: { userId, isArchived: false },
    });
    const totalAssets = accounts.reduce((acc, a) => acc + a.balance, 0);

    const monthlyTxs = await this.prisma.transaction.findMany({
      where: {
        userId,
        OR: [
          {
            date: { gte: startOfMonth, lte: endOfMonth },
          },
          {
            installmentPayment: {
              dueDate: { gte: startOfMonth, lte: endOfMonth },
            },
          },
        ],
      },
      include: { category: true, installmentPayment: true },
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
      month: targetMonth,
      year: targetYear,
    };
  }
}
