import { Controller, Get, Post, Param, Query, Body, Request, UseGuards } from '@nestjs/common';
import { InstallmentsService } from './installments.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { InstallmentStatus } from '@prisma/client';

@Controller('installments')
@UseGuards(JwtAuthGuard)
export class InstallmentsController {
  constructor(private readonly installmentsService: InstallmentsService) {}

  @Get()
  async findAll(@Request() req: any, @Query('status') status?: InstallmentStatus) {
    return this.installmentsService.findAll(req.user.id, status);
  }

  @Get('reminders')
  async getUpcomingReminders(@Request() req: any) {
    return this.installmentsService.getUpcomingReminders(req.user.id);
  }

  @Get(':id')
  async findOne(@Request() req: any, @Param('id') id: string) {
    return this.installmentsService.findOne(req.user.id, id);
  }

  @Post()
  async create(
    @Request() req: any,
    @Body()
    body: {
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
    return this.installmentsService.create(req.user.id, body);
  }

  @Post('payments/:id/pay')
  async payInstallment(
    @Request() req: any,
    @Param('id') id: string,
    @Body() body: { accountId?: string; paidDate?: string },
  ) {
    return this.installmentsService.payInstallment(req.user.id, id, body);
  }
}
