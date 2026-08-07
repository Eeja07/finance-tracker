import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        fullName: true,
        phone: true,
        avatarUrl: true,
        themePreference: true,
        currency: true,
        createdAt: true,
      },
    });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async updateTheme(userId: string, theme: string) {
    const validThemes = ['light', 'dark', 'pink'];
    const selectedTheme = validThemes.includes(theme) ? theme : 'pink';

    return this.prisma.user.update({
      where: { id: userId },
      data: { themePreference: selectedTheme },
      select: {
        id: true,
        email: true,
        themePreference: true,
      },
    });
  }

  async updateProfile(userId: string, data: { fullName?: string; phone?: string; currency?: string }) {
    return this.prisma.user.update({
      where: { id: userId },
      data,
      select: {
        id: true,
        email: true,
        fullName: true,
        phone: true,
        currency: true,
        themePreference: true,
      },
    });
  }
}
