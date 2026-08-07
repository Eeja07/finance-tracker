import { Controller, Get, Post, Patch, Delete, Param, Body, Request, UseGuards } from '@nestjs/common';
import { AccountsService } from './accounts.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AccountType } from '@prisma/client';

@Controller('accounts')
@UseGuards(JwtAuthGuard)
export class AccountsController {
  constructor(private readonly accountsService: AccountsService) {}

  @Get()
  async findAll(@Request() req: any) {
    return this.accountsService.findAll(req.user.id);
  }

  @Get(':id')
  async findOne(@Request() req: any, @Param('id') id: string) {
    return this.accountsService.findOne(req.user.id, id);
  }

  @Post()
  async create(
    @Request() req: any,
    @Body() body: { name: string; type: AccountType; balance?: number; color?: string; accountNumber?: string },
  ) {
    return this.accountsService.create(req.user.id, body);
  }

  @Patch(':id')
  async update(
    @Request() req: any,
    @Param('id') id: string,
    @Body() body: Partial<{ name: string; type: AccountType; balance: number; color: string; accountNumber: string }>,
  ) {
    return this.accountsService.update(req.user.id, id, body);
  }

  @Delete(':id')
  async archive(@Request() req: any, @Param('id') id: string) {
    return this.accountsService.archive(req.user.id, id);
  }
}
