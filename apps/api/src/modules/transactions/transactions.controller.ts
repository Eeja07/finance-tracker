import { Controller, Get, Post, Patch, Delete, Param, Query, Body, Request, UseGuards } from '@nestjs/common';
import { TransactionsService } from './transactions.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TransactionType } from '@prisma/client';

@Controller('transactions')
@UseGuards(JwtAuthGuard)
export class TransactionsController {
  constructor(private readonly transactionsService: TransactionsService) {}

  @Get()
  async findAll(
    @Request() req: any,
    @Query('accountId') accountId?: string,
    @Query('categoryId') categoryId?: string,
    @Query('type') type?: TransactionType,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.transactionsService.findAll(req.user.id, {
      accountId,
      categoryId,
      type,
      startDate,
      endDate,
      page,
      limit,
    });
  }

  @Get('summary')
  async getSummary(@Request() req: any) {
    return this.transactionsService.getSummary(req.user.id);
  }

  @Get('daily')
  async getDailyExpenseStats(@Request() req: any, @Query('date') date?: string) {
    return this.transactionsService.getDailyExpenseStats(req.user.id, date);
  }

  @Get(':id')
  async findOne(@Request() req: any, @Param('id') id: string) {
    return this.transactionsService.findOne(req.user.id, id);
  }

  @Post()
  async create(
    @Request() req: any,
    @Body()
    body: {
      accountId: string;
      categoryId: string;
      type: TransactionType;
      amount: number;
      description: string;
      recipientOrPayer?: string;
      notes?: string;
      date?: string;
      receiptUrl?: string;
      itemImageUrl?: string;
    },
  ) {
    return this.transactionsService.create(req.user.id, body);
  }

  @Patch(':id')
  async update(
    @Request() req: any,
    @Param('id') id: string,
    @Body()
    body: Partial<{
      accountId: string;
      categoryId: string;
      type: TransactionType;
      amount: number;
      description: string;
      recipientOrPayer?: string;
      notes?: string;
      date?: string;
      receiptUrl?: string;
      itemImageUrl?: string;
    }>,
  ) {
    return this.transactionsService.update(req.user.id, id, body);
  }

  @Delete(':id')
  async delete(@Request() req: any, @Param('id') id: string) {
    return this.transactionsService.delete(req.user.id, id);
  }
}
