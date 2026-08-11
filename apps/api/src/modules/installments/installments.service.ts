import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { InstallmentStatus, PaymentStatus, Prisma, TransactionType } from '@prisma/client';

@Injectable()
export class InstallmentsService {
  constructor(private readonly prisma: PrismaService) {}

  private normalizeRupiahAmount(amount: number, label: string): number {
    if (!Number.isFinite(amount) || amount <= 0) {
      throw new BadRequestException(`${label} harus lebih dari 0`);
    }
    if (Number.isInteger(amount)) {
      return amount;
    }

    const scaledByThousand = amount * 1000;
    if (amount < 1000 && Number.isInteger(scaledByThousand)) {
      return scaledByThousand;
    }

    throw new BadRequestException(`${label} harus bilangan bulat Rupiah (tanpa desimal)`);
  }

  private validateDueDateDay(day: number): number {
    if (!Number.isInteger(day) || day < 1 || day > 31) {
      throw new BadRequestException('Tanggal jatuh tempo harus di antara 1 sampai 31');
    }
    return day;
  }

  private validateTenorMonths(tenor: number): number {
    if (!Number.isInteger(tenor) || tenor < 1) {
      throw new BadRequestException('Tenor cicilan minimal 1 bulan');
    }
    return tenor;
  }

  private buildDueDate(startDate: Date, dueDateDay: number, tenorNumber: number): Date {
    const startYear = startDate.getFullYear();
    const startMonth = startDate.getMonth(); // 0-indexed
    const totalMonthsFromStart = startMonth + (tenorNumber - 1);
    const targetYear = startYear + Math.floor(totalMonthsFromStart / 12);
    const targetMonth = totalMonthsFromStart % 12;
    const maxDaysInMonth = new Date(targetYear, targetMonth + 1, 0).getDate();
    const actualDay = Math.min(Math.max(1, dueDateDay), maxDaysInMonth);

    return new Date(targetYear, targetMonth, actualDay, 12, 0, 0);
  }

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
    const monthlyAmount = this.normalizeRupiahAmount(data.monthlyAmount, 'Nominal cicilan per bulan');
    const totalAmount = this.normalizeRupiahAmount(data.totalAmount, 'Total harga / pinjaman');
    const totalTenorMonths = this.validateTenorMonths(data.totalTenorMonths);
    const dueDateDay = this.validateDueDateDay(data.dueDateDay);

    return this.prisma.$transaction(async (tx) => {
      const installment = await tx.installment.create({
        data: {
          userId,
          accountId: data.accountId || null,
          title: data.title,
          provider: data.provider,
          totalAmount,
          monthlyAmount,
          totalTenorMonths,
          remainingTenorMonths: totalTenorMonths,
          startDate,
          dueDateDay,
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

      for (let i = 1; i <= totalTenorMonths; i++) {
        paymentsData.push({
          installmentId: installment.id,
          tenorNumber: i,
          amount: monthlyAmount,
          dueDate: this.buildDueDate(startDate, dueDateDay, i),
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
            date: payment.dueDate,
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

  async update(
    userId: string,
    id: string,
    data: Partial<{
      title: string;
      provider: string;
      totalAmount: number;
      monthlyAmount: number;
      totalTenorMonths: number;
      startDate: string;
      dueDateDay: number;
      accountId?: string;
      notes?: string;
      status?: InstallmentStatus;
    }>,
  ) {
    const existing = await this.findOne(userId, id);
    const startDate = data.startDate ? new Date(data.startDate) : existing.startDate;
    const dueDateDay =
      data.dueDateDay !== undefined
        ? this.validateDueDateDay(data.dueDateDay)
        : existing.dueDateDay;
    const normalizedMonthlyAmount =
      data.monthlyAmount !== undefined
        ? this.normalizeRupiahAmount(data.monthlyAmount, 'Nominal cicilan per bulan')
        : undefined;
    const monthlyAmount = normalizedMonthlyAmount ?? existing.monthlyAmount;
    const normalizedTotalAmount =
      data.totalAmount !== undefined
        ? this.normalizeRupiahAmount(data.totalAmount, 'Total harga / pinjaman')
        : undefined;
    const requestedTotalTenor =
      data.totalTenorMonths !== undefined
        ? this.validateTenorMonths(data.totalTenorMonths)
        : existing.totalTenorMonths;

    return this.prisma.$transaction(async (tx) => {
      const allPayments = await tx.installmentPayment.findMany({
        where: { installmentId: id },
        orderBy: { tenorNumber: 'asc' },
      });
      const paidPayments = allPayments.filter((p) => p.status === PaymentStatus.PAID);

      if (requestedTotalTenor < paidPayments.length) {
        throw new BadRequestException(
          `Tenor tidak boleh kurang dari jumlah tenor yang sudah dibayar (${paidPayments.length} bulan)`,
        );
      }

      if (requestedTotalTenor > allPayments.length) {
        const newPayments = Array.from(
          { length: requestedTotalTenor - allPayments.length },
          (_, index) => {
            const tenorNumber = allPayments.length + index + 1;
            return {
              installmentId: id,
              tenorNumber,
              amount: monthlyAmount,
              dueDate: this.buildDueDate(startDate, dueDateDay, tenorNumber),
              status: PaymentStatus.PENDING,
            };
          },
        );

        await tx.installmentPayment.createMany({ data: newPayments });
      } else if (requestedTotalTenor < allPayments.length) {
        const paymentsToRemove = allPayments.filter((payment) => payment.tenorNumber > requestedTotalTenor);
        const paidToRemove = paymentsToRemove.filter((payment) => payment.status === PaymentStatus.PAID);

        if (paidToRemove.length > 0) {
          throw new BadRequestException(
            'Tenor tidak bisa dipotong karena ada pembayaran lunas di periode yang akan dihapus',
          );
        }

        if (paymentsToRemove.length > 0) {
          await tx.installmentPayment.deleteMany({
            where: { id: { in: paymentsToRemove.map((payment) => payment.id) } },
          });
        }
      }

      // Update PENDING payments if monthlyAmount or dueDateDay/startDate changed
      if (data.monthlyAmount !== undefined || data.dueDateDay !== undefined || data.startDate !== undefined) {
        const pendingPayments = await tx.installmentPayment.findMany({
          where: { installmentId: id, status: PaymentStatus.PENDING },
          orderBy: { tenorNumber: 'asc' },
        });

        for (const p of pendingPayments) {
          const updateObj: Prisma.InstallmentPaymentUpdateInput = {};
          if (normalizedMonthlyAmount !== undefined) {
            updateObj.amount = normalizedMonthlyAmount;
          }
          if (data.dueDateDay !== undefined || data.startDate !== undefined) {
            updateObj.dueDate = this.buildDueDate(startDate, dueDateDay, p.tenorNumber);
          }

          if (Object.keys(updateObj).length > 0) {
            await tx.installmentPayment.update({
              where: { id: p.id },
              data: updateObj,
            });
          }
        }
      }

      const remainingPending = await tx.installmentPayment.count({
        where: { installmentId: id, status: PaymentStatus.PENDING },
      });

      const derivedStatus =
        data.status !== undefined
          ? data.status
          : existing.status === InstallmentStatus.CANCELLED
          ? InstallmentStatus.CANCELLED
          : remainingPending === 0
          ? InstallmentStatus.COMPLETED
          : InstallmentStatus.ACTIVE;

      const updated = await tx.installment.update({
        where: { id },
        data: {
          ...(data.title ? { title: data.title } : {}),
          ...(data.provider ? { provider: data.provider } : {}),
          ...(normalizedTotalAmount !== undefined ? { totalAmount: normalizedTotalAmount } : {}),
          ...(normalizedMonthlyAmount !== undefined ? { monthlyAmount: normalizedMonthlyAmount } : {}),
          ...(data.totalTenorMonths !== undefined ? { totalTenorMonths: data.totalTenorMonths } : {}),
          ...(data.dueDateDay !== undefined ? { dueDateDay: data.dueDateDay } : {}),
          ...(data.accountId !== undefined ? { accountId: data.accountId } : {}),
          ...(data.notes !== undefined ? { notes: data.notes } : {}),
          ...(data.startDate ? { startDate: new Date(data.startDate) } : {}),
          remainingTenorMonths: remainingPending,
          status: derivedStatus,
        },
        include: {
          account: true,
          payments: { orderBy: { tenorNumber: 'asc' } },
        },
      });

      return updated;
    });
  }

  async delete(userId: string, id: string) {
    await this.findOne(userId, id);
    return this.prisma.installment.delete({ where: { id } });
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
