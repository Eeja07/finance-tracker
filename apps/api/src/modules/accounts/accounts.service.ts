import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AccountType } from '@prisma/client';

@Injectable()
export class AccountsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(userId: string) {
    return this.prisma.account.findMany({
      where: { userId, isArchived: false },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(userId: string, id: string) {
    const account = await this.prisma.account.findFirst({
      where: { id, userId, isArchived: false },
    });
    if (!account) throw new NotFoundException('Account not found');
    return account;
  }

  async create(userId: string, data: { name: string; type: AccountType; balance?: number; color?: string; accountNumber?: string }) {
    return this.prisma.account.create({
      data: {
        userId,
        name: data.name,
        type: data.type || AccountType.BANK,
        balance: data.balance || 0,
        color: data.color || '#EC4899',
        accountNumber: data.accountNumber,
      },
    });
  }

  async update(userId: string, id: string, data: Partial<{ name: string; type: AccountType; balance: number; color: string; accountNumber: string }>) {
    await this.findOne(userId, id);
    return this.prisma.account.update({
      where: { id },
      data,
    });
  }

  async archive(userId: string, id: string) {
    await this.findOne(userId, id);
    return this.prisma.account.update({
      where: { id },
      data: { isArchived: true },
    });
  }
}
