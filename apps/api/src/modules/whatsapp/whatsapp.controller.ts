import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { WhatsappService } from './whatsapp.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('whatsapp')
export class WhatsappController {
  constructor(private readonly whatsappService: WhatsappService) {}

  @Get('status')
  @UseGuards(JwtAuthGuard)
  async getStatus() {
    return this.whatsappService.getStatus();
  }

  @Post('webhook')
  async handleWebhook(@Body() body: { from: string; body: string; pushName?: string }) {
    await this.whatsappService.handleIncomingWebhook(body);
    return { success: true };
  }

  @Post('trigger-reminders')
  @UseGuards(JwtAuthGuard)
  async triggerReminders() {
    const count = await this.whatsappService.checkAndSendInstallmentReminders();
    return { success: true, remindersSent: count };
  }

  @Post('reset-session')
  @UseGuards(JwtAuthGuard)
  async resetSession() {
    const success = await this.whatsappService.resetSession();
    return { success };
  }
}
