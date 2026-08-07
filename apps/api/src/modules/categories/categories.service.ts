import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { TransactionType } from '@prisma/client';

@Injectable()
export class CategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(userId: string, type?: TransactionType) {
    return this.prisma.category.findMany({
      where: {
        OR: [{ userId }, { isSystemDefault: true }],
        ...(type ? { type } : {}),
      },
      orderBy: { name: 'asc' },
    });
  }

  async create(userId: string, data: { name: string; type: TransactionType; icon?: string; color?: string }) {
    return this.prisma.category.create({
      data: {
        userId,
        name: data.name,
        type: data.type || TransactionType.EXPENSE,
        icon: data.icon,
        color: data.color,
      },
    });
  }

  async delete(userId: string, id: string) {
    const cat = await this.prisma.category.findFirst({
      where: { id, userId },
    });
    if (!cat) throw new NotFoundException('Category not found or not editable');
    return this.prisma.category.delete({ where: { id } });
  }
}
