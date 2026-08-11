import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { InstallmentStatus, PaymentStatus, TransactionType } from '@prisma/client';

@Injectable()
export class InstallmentsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(userId: string, status?: InstallmentStatus) {
    return this.prisma.installment.findMany({
      where: {
        userId,
        ...(status ? { status } : {}),
      },
      include: {
        account: { select: { id: true, name: true, color: true } },
        payments: {
          orderBy: { tenorNumber: 'asc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(userId: string, id: string) {
    const installment = await this.prisma.installment.findFirst({
      where: { id, userId },
      include: {
        account: true,
        payments: {
          orderBy: { tenorNumber: 'asc' },
        },
      },
    });
    if (!installment) throw new NotFoundException('Cicilan tidak ditemukan');
    return installment;
  }

  async create(
    userId: string,
    data: {
      title: string;
      provider: string;
      totalAmount: number;
      monthlyAmount: number;
      totalTenorMonths: number;
      startDate: string;
      dueDateDay: number;
      accountId?: string;
      interestRate?: number;
      notes?: string;
    },
  ) {
    const startDate = data.startDate ? new Date(data.startDate) : new Date();

    return this.prisma.$transaction(async (tx) => {
      const installment = await tx.installment.create({
        data: {
          userId,
          accountId: data.accountId || null,
          title: data.title,
          provider: data.provider,
          totalAmount: data.totalAmount,
          monthlyAmount: data.monthlyAmount,
          totalTenorMonths: data.totalTenorMonths,
          remainingTenorMonths: data.totalTenorMonths,
          startDate,
          dueDateDay: data.dueDateDay,
          interestRate: data.interestRate || 0,
          status: InstallmentStatus.ACTIVE,
          notes: data.notes || null,
        },
      });

      // Generate payment schedule for all tenor months accurately
      const paymentsData: {
        installmentId: string;
        tenorNumber: number;
        amount: number;
        dueDate: Date;
        status: PaymentStatus;
      }[] = [];

      const startYear = startDate.getFullYear();
      const startMonth = startDate.getMonth(); // 0-indexed

      for (let i = 1; i <= data.totalTenorMonths; i++) {
        const totalMonthsFromStart = startMonth + (i - 1);
        const targetYear = startYear + Math.floor(totalMonthsFromStart / 12);
        const targetMonth = totalMonthsFromStart % 12;

        const maxDaysInMonth = new Date(targetYear, targetMonth + 1, 0).getDate();
        const actualDay = Math.min(Math.max(1, data.dueDateDay), maxDaysInMonth);

        const dueDate = new Date(targetYear, targetMonth, actualDay, 12, 0, 0);

        paymentsData.push({
          installmentId: installment.id,
          tenorNumber: i,
          amount: data.monthlyAmount,
          dueDate,
          status: PaymentStatus.PENDING,
        });
      }

      await tx.installmentPayment.createMany({ data: paymentsData });

      return tx.installment.findUnique({
        where: { id: installment.id },
        include: {
          payments: {
            orderBy: { tenorNumber: 'asc' },
          },
        },
      });
    });
  }

  async payInstallment(
    userId: string,
    paymentId: string,
    data?: { accountId?: string; paidDate?: string },
  ) {
    const payment = await this.prisma.installmentPayment.findFirst({
      where: { id: paymentId },
      include: { installment: true },
    });

    if (!payment || payment.installment.userId !== userId) {
      throw new NotFoundException('Tagihan cicilan tidak ditemukan');
    }

    if (payment.status === PaymentStatus.PAID) {
      throw new BadRequestException('Tagihan cicilan ini sudah lunas dibayar');
    }

    const accountId = data?.accountId || payment.installment.accountId;
    if (!accountId) {
      throw new BadRequestException('Pilih dompet / akun bank pembayaran');
    }

    const account = await this.prisma.account.findFirst({
      where: { id: accountId, userId },
    });
    if (!account) {
      throw new NotFoundException('Akun dompet pembayaran tidak ditemukan');
    }

    // Find or create 'Cicilan' category
    let category = await this.prisma.category.findFirst({
      where: {
        OR: [
          { userId, name: { contains: 'Cicilan', mode: 'insensitive' } },
          { isSystemDefault: true, name: { contains: 'Cicilan', mode: 'insensitive' } },
        ],
      },
    });

    if (!category) {
      category = await this.prisma.category.create({
        data: {
          userId,
          name: 'Cicilan & Hutang',
          type: TransactionType.EXPENSE,
          color: '#F97316',
          icon: 'CreditCard',
        },
      });
    }

    const paidDate = data?.paidDate ? new Date(data.paidDate) : new Date();

    return this.prisma.$transaction(async (tx) => {
      // 1. Create or update EXPENSE transaction
      const existingTx = await tx.transaction.findUnique({
        where: { installmentPaymentId: paymentId },
      });

      if (!existingTx) {
        await tx.transaction.create({
          data: {
            userId,
            accountId,
            categoryId: category.id,
            installmentPaymentId: paymentId,
            type: TransactionType.EXPENSE,
            amount: payment.amount,
            date: paidDate,
            description: `Pembayaran ${payment.installment.title} (Bulan Ke-${payment.tenorNumber}/${payment.installment.totalTenorMonths})`,
            recipientOrPayer: payment.installment.provider,
          },
        });
      }

      // 2. Update account balance
      await tx.account.update({
        where: { id: accountId },
        data: { balance: { decrement: payment.amount } },
      });

      // 3. Update payment status
      const updatedPayment = await tx.installmentPayment.update({
        where: { id: paymentId },
        data: {
          status: PaymentStatus.PAID,
          paidDate,
        },
      });

      // 4. Update remaining tenor months on installment dynamically
      const remainingPending = await tx.installmentPayment.count({
        where: {
          installmentId: payment.installmentId,
          status: PaymentStatus.PENDING,
        },
      });

      await tx.installment.update({
        where: { id: payment.installmentId },
        data: {
          remainingTenorMonths: remainingPending,
          status: remainingPending === 0 ? InstallmentStatus.COMPLETED : InstallmentStatus.ACTIVE,
        },
      });

      return updatedPayment;
    });
  }

  async getUpcomingReminders(userId?: string) {
    const now = new Date();
    const threeDaysLater = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 3, 23, 59, 59);

    return this.prisma.installmentPayment.findMany({
      where: {
        status: PaymentStatus.PENDING,
        dueDate: { lte: threeDaysLater },
        ...(userId ? { installment: { userId } } : {}),
      },
      include: {
        installment: {
          include: {
            user: { select: { id: true, fullName: true, phone: true } },
          },
        },
      },
      orderBy: { dueDate: 'asc' },
    });
  }
}
