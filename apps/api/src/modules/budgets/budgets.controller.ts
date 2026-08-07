import { Controller, Get, Post, Delete, Param, Query, Body, Request, UseGuards } from '@nestjs/common';
import { BudgetsService } from './budgets.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('budgets')
@UseGuards(JwtAuthGuard)
export class BudgetsController {
  constructor(private readonly budgetsService: BudgetsService) {}

  @Get()
  async findAll(@Request() req: any, @Query('month') month?: number, @Query('year') year?: number) {
    return this.budgetsService.findAll(req.user.id, month ? Number(month) : undefined, year ? Number(year) : undefined);
  }

  @Post()
  async upsert(
    @Request() req: any,
    @Body() body: { categoryId: string; amountLimit: number; month?: number; year?: number },
  ) {
    return this.budgetsService.upsertBudget(req.user.id, body.categoryId, body.amountLimit, body.month, body.year);
  }

  @Delete(':id')
  async delete(@Request() req: any, @Param('id') id: string) {
    return this.budgetsService.delete(req.user.id, id);
  }
}
