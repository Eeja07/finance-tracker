import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { TransactionType } from '@prisma/client';

@Injectable()
export class BudgetsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(userId: string, month?: number, year?: number) {
    const now = new Date();
    const targetMonth = month || now.getMonth() + 1;
    const targetYear = year || now.getFullYear();

    const budgets = await this.prisma.budget.findMany({
      where: { userId, month: targetMonth, year: targetYear },
      include: { category: true },
    });

    const startOfMonth = new Date(targetYear, targetMonth - 1, 1);
    const endOfMonth = new Date(targetYear, targetMonth, 0, 23, 59, 59);

    const budgetsWithSpent = await Promise.all(
      budgets.map(async (b) => {
        const spentSum = await this.prisma.transaction.aggregate({
          where: {
            userId,
            categoryId: b.categoryId,
            type: TransactionType.EXPENSE,
            date: { gte: startOfMonth, lte: endOfMonth },
          },
          _sum: { amount: true },
        });

        const spent = spentSum._sum.amount || 0;
        const percentage = Math.min(100, Math.round((spent / b.amountLimit) * 100));

        return {
          ...b,
          spent,
          remaining: Math.max(0, b.amountLimit - spent),
          percentage,
          isExceeded: spent > b.amountLimit,
        };
      }),
    );

    return budgetsWithSpent;
  }

  async upsertBudget(userId: string, categoryId: string, amountLimit: number, month?: number, year?: number) {
    const now = new Date();
    const targetMonth = month || now.getMonth() + 1;
    const targetYear = year || now.getFullYear();

    return this.prisma.budget.upsert({
      where: {
        userId_categoryId_month_year: {
          userId,
          categoryId,
          month: targetMonth,
          year: targetYear,
        },
      },
      update: { amountLimit },
      create: {
        userId,
        categoryId,
        amountLimit,
        month: targetMonth,
        year: targetYear,
      },
      include: { category: true },
    });
  }

  async delete(userId: string, id: string) {
    const b = await this.prisma.budget.findFirst({
      where: { id, userId },
    });
    if (!b) throw new NotFoundException('Budget not found');
    return this.prisma.budget.delete({ where: { id } });
  }
}
