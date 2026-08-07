import { Controller, Get, Post, Delete, Param, Query, Body, Request, UseGuards } from '@nestjs/common';
import { CategoriesService } from './categories.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TransactionType } from '@prisma/client';

@Controller('categories')
@UseGuards(JwtAuthGuard)
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Get()
  async findAll(@Request() req: any, @Query('type') type?: TransactionType) {
    return this.categoriesService.findAll(req.user.id, type);
  }

  @Post()
  async create(
    @Request() req: any,
    @Body() body: { name: string; type: TransactionType; icon?: string; color?: string },
  ) {
    return this.categoriesService.create(req.user.id, body);
  }

  @Delete(':id')
  async delete(@Request() req: any, @Param('id') id: string) {
    return this.categoriesService.delete(req.user.id, id);
  }
}
