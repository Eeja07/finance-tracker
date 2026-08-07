import { Controller, Get, Patch, Body, Request, UseGuards } from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  async getProfile(@Request() req: any) {
    return this.usersService.getProfile(req.user.id);
  }

  @Patch('theme')
  async updateTheme(@Request() req: any, @Body('theme') theme: string) {
    return this.usersService.updateTheme(req.user.id, theme);
  }

  @Patch('profile')
  async updateProfile(
    @Request() req: any,
    @Body() body: { fullName?: string; phone?: string; currency?: string },
  ) {
    return this.usersService.updateProfile(req.user.id, body);
  }
}
