import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { InstallmentStatus, TransactionType } from '@prisma/client';

@Injectable()
export class WhatsappService {
  private readonly logger = new Logger(WhatsappService.name);
  private readonly gatewayUrl: string;
  private readonly apiKey: string;

  constructor(private readonly prisma: PrismaService) {
    this.gatewayUrl = process.env.WA_GATEWAY_URL || 'http://gateway-whatsapp-bot:3001';
    this.apiKey = process.env.WA_GATEWAY_API_KEY || 'eeja_wa_gateway_secret_key_2026';
  }

  private normalizePhone(phone: string): string {
    if (!phone) return '';
    const cleaned = phone.split('@')[0].replace(/\D/g, '');
    if (!cleaned) return '';
    if (cleaned.startsWith('0')) return `62${cleaned.slice(1)}`;
    return cleaned;
  }

  private parsePhoneList(raw?: string | null): string[] {
    if (!raw) return [];
    return Array.from(
      new Set(
        raw
          .split(',')
          .map((item) => this.normalizePhone(item))
          .filter(Boolean),
      ),
    );
  }

  private async getNotificationPhones(userPhone?: string | null): Promise<string[]> {
    const configuredPhones = this.parsePhoneList(
      process.env.WA_NOTIFICATION_PHONES || process.env.WA_NOTIFICATION_PHONE,
    );
    if (configuredPhones.length > 0) {
      return configuredPhones;
    }

    const defaultPhones = ['6281288092766', '6287700288297'];
    const normalizedUserPhone = this.normalizePhone(userPhone || '');
    if (normalizedUserPhone && !defaultPhones.includes(normalizedUserPhone)) {
      return Array.from(new Set([normalizedUserPhone, ...defaultPhones]));
    }

    return defaultPhones;
  }

  private normalizeStoredRupiahAmount(amount: number): number {
    if (Number.isInteger(amount)) return amount;
    const scaled = amount * 1000;
    return amount > 0 && amount < 1000 && Number.isInteger(scaled) ? scaled : amount;
  }

  async sendTextMessage(to: string, message: string): Promise<boolean> {
    try {
      const normalizedTo = this.normalizePhone(to);
      const response = await fetch(`${this.gatewayUrl}/api/v1/messages/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-KEY': this.apiKey,
        },
        body: JSON.stringify({ to: normalizedTo || to, message }),
      });
      const data = (await response.json()) as { success?: boolean };
      return data.success === true;
    } catch (err: any) {
      this.logger.error(`Failed to send WA message to ${to}: ${err.message}`);
      return false;
    }
  }

  async getStatus(): Promise<{ status: string; connectedUser: string | null; hasQr: boolean; qrDataUrl?: string }> {
    try {
      const response = await fetch(`${this.gatewayUrl}/health`);
      const data = (await response.json()) as any;
      return {
        status: data.status || 'disconnected',
        connectedUser: data.connectedUser || null,
        hasQr: !!data.hasQr,
        qrDataUrl: data.qrDataUrl || undefined,
      };
    } catch (err: any) {
      return { status: 'disconnected', connectedUser: null, hasQr: false };
    }
  }

  async resetSession(): Promise<boolean> {
    try {
      const response = await fetch(`${this.gatewayUrl}/api/v1/messages/logout`, {
        method: 'POST',
        headers: {
          'X-API-KEY': this.apiKey,
        },
      });
      const data = (await response.json()) as { success?: boolean };
      return data.success === true;
    } catch (err: any) {
      this.logger.error(`Failed to reset WA session: ${err.message}`);
      return false;
    }
  }

  private async getPrimaryUserId(phone?: string): Promise<string> {
    if (phone) {
      const cleanPhone = this.normalizePhone(phone);
      const digitsOnly = cleanPhone.replace(/\D/g, '');
      const lastDigits = digitsOnly.length >= 9 ? digitsOnly.slice(-9) : digitsOnly;

      const user = await this.prisma.user.findFirst({
        where: {
          OR: [
            { phone: cleanPhone },
            { phone: `+${cleanPhone}` },
            { phone: { contains: lastDigits } },
          ],
        },
      });
      if (user) return user.id;
    }

    const firstUser = await this.prisma.user.findFirst({
      orderBy: { createdAt: 'asc' },
    });
    return firstUser?.id || '';
  }

  async handleIncomingWebhook(payload: { from: string; body: string; pushName?: string }): Promise<void> {
    const { from, body, pushName } = payload;
    const text = (body || '').trim();
    if (!text || !from) return;

    // Must start with ! or /
    if (!text.startsWith('!') && !text.startsWith('/')) return;

    const lower = text.toLowerCase();
    // Ignore Job Tracker commands explicitly
    if (lower.startsWith('!loker') || lower.startsWith('/loker') || lower.startsWith('!email') || lower.startsWith('/email') || lower.startsWith('!job') || lower.startsWith('/job')) {
      return;
    }

    this.logger.log(`Processing WA Finance Bot Command from ${from} (${pushName}): ${text}`);
    const userId = await this.getPrimaryUserId(from);
    let reply = '';

    if (lower.startsWith('!saldo') || lower.startsWith('/saldo') || lower.startsWith('!fin') || lower.startsWith('/fin') || lower.startsWith('!overview') || lower.startsWith('/overview')) {
      reply = await this.getOverviewMessage(userId);
    } else if (lower.startsWith('!cicilan') || lower.startsWith('/cicilan')) {
      reply = await this.getActiveInstallmentsMessage(userId);
    } else if (lower.startsWith('!hariini') || lower.startsWith('/hariini') || lower.startsWith('!pengeluaran') || lower.startsWith('/pengeluaran')) {
      reply = await this.getDailyExpenseMessage(userId);
    } else if (lower.startsWith('!tambah') || lower.startsWith('/tambah')) {
      reply = await this.addTransactionFromWa(userId, text);
    }

    if (reply) {
      await this.sendTextMessage(from, reply);
    }
  }

  private getHelpMessage(pushName?: string): string {
    return `💰 *FINANCE TRACKER BOT MENU*
Halo ${pushName || 'Teman'}! Berikut adalah daftar perintah yang bisa kamu gunakan:

📊 *!hariini* / *!pengeluaran*
Lihat rincian total pengeluaran harian kamu hari ini.

💳 *!cicilan*
Cek daftar cicilan aktif, sisa tenor, & tanggal jatuh tempo.

💼 *!overview* / *!saldo*
Lihat total aset, saldo dompet, & cashflow bulan ini.

➕ *!tambah [pengeluaran/pemasukan] [jumlah] | [kategori] | [deskripsi]*
Tambah transaksi baru langsung via WA!
_Contoh:_ \`!tambah pengeluaran 35000 | Makanan | Makan Siang\`
_Atau:_ \`!tambah pemasukan 5000000 | Gaji | Bonus Proyek\`

💡 _Ketik salah satu perintah di atas untuk mulai._`;
  }

  async getDailyExpenseMessage(userId: string): Promise<string> {
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0);
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59);

    const txs = await this.prisma.transaction.findMany({
      where: {
        userId,
        type: TransactionType.EXPENSE,
        date: { gte: startOfDay, lte: endOfDay },
      },
      include: { category: true, account: true },
      orderBy: { date: 'desc' },
    });

    const dateStr = today.toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    const totalExpense = txs.reduce((acc, t) => acc + t.amount, 0);

    if (txs.length === 0) {
      return `💸 *REKAP PENGELUARAN HARIAN*\n📅 *${dateStr}*\n\nBelum ada pengeluaran yang dicatat hari ini! Ketik *!tambah pengeluaran [jumlah] | [kategori] | [deskripsi]* untuk mencatat.`;
    }

    let msg = `💸 *REKAP PENGELUARAN HARIAN*\n📅 *${dateStr}*\n\n`;
    msg += `💵 *Total Pengeluaran*: Rp ${totalExpense.toLocaleString('id-ID')}\n`;
    msg += `🔢 *Jumlah Transaksi*: ${txs.length}\n\n`;
    msg += `📋 *Rincian Pengeluaran:*\n`;

    txs.forEach((t, idx) => {
      msg += `${idx + 1}. *${t.description}*\n   💰 Rp ${t.amount.toLocaleString('id-ID')} (${t.category?.name || 'Umum'})\n   💳 Dompet: ${t.account?.name || 'N/A'}\n`;
    });

    msg += `\n🔗 _Dashboard Finance:_ https://money.eeja.fun`;
    return msg;
  }

  async getActiveInstallmentsMessage(userId: string): Promise<string> {
    const installments = await this.prisma.installment.findMany({
      where: { userId, status: InstallmentStatus.ACTIVE },
      include: {
        payments: {
          where: { status: 'PENDING' },
          orderBy: { dueDate: 'asc' },
          take: 1,
        },
      },
      orderBy: { dueDateDay: 'asc' },
    });

    if (installments.length === 0) {
      return `💳 *DAFTAR CICILAN AKTIF*\n\nSelamat! Kamu tidak memiliki cicilan yang sedang berjalan. 🎉`;
    }

    let totalMonthly = 0;
    let msg = `💳 *DAFTAR CICILAN YANG DIJALANI*\n\n`;

    installments.forEach((inst, idx) => {
      const monthlyAmount = this.normalizeStoredRupiahAmount(inst.monthlyAmount);
      totalMonthly += monthlyAmount;
      const nextPayment = inst.payments[0];
      const dueDateStr = nextPayment
        ? new Date(nextPayment.dueDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })
        : `Tgl ${inst.dueDateDay}`;

      msg += `${idx + 1}. *${inst.title}*\n`;
      msg += `   🏢 Penyedia: ${inst.provider}\n`;
      msg += `   💰 Cicilan/Bln: *Rp ${monthlyAmount.toLocaleString('id-ID')}*\n`;
      msg += `   ⏳ Sisa Tenor: ${inst.remainingTenorMonths} dari ${inst.totalTenorMonths} bulan\n`;
      msg += `   📅 Jatuh Tempo Berikutnya: *${dueDateStr}*\n\n`;
    });

    msg += `📊 *Total Komitmen Cicilan/Bulan*: Rp ${totalMonthly.toLocaleString('id-ID')}\n\n`;
    msg += `🔗 _Kelola Cicilan:_ https://money.eeja.fun/dashboard/installments`;
    return msg;
  }

  async getOverviewMessage(userId: string): Promise<string> {
    const accounts = await this.prisma.account.findMany({ where: { userId, isArchived: false } });
    const totalAssets = accounts.reduce((acc, a) => acc + a.balance, 0);

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const monthlyTxs = await this.prisma.transaction.findMany({
      where: { userId, date: { gte: startOfMonth } },
    });

    let monthlyIncome = 0;
    let monthlyExpense = 0;

    monthlyTxs.forEach((t) => {
      if (t.type === TransactionType.INCOME) monthlyIncome += t.amount;
      if (t.type === TransactionType.EXPENSE) monthlyExpense += t.amount;
    });

    let msg = `📊 *RINGKASAN KEUANGAN SAYA*\n\n`;
    msg += `🏦 *Total Aset (Semua Dompet)*: Rp ${totalAssets.toLocaleString('id-ID')}\n\n`;
    msg += `💳 *Rincian Saldo Dompet:*\n`;
    accounts.forEach((a) => {
      msg += `• ${a.name}: Rp ${a.balance.toLocaleString('id-ID')}\n`;
    });

    msg += `\n📈 *Statistik Bulan Ini:*\n`;
    msg += `• Pemasukan: Rp ${monthlyIncome.toLocaleString('id-ID')}\n`;
    msg += `• Pengeluaran: Rp ${monthlyExpense.toLocaleString('id-ID')}\n`;
    msg += `• Cashflow Bersih: Rp ${(monthlyIncome - monthlyExpense).toLocaleString('id-ID')}\n\n`;

    msg += `🔗 _Buka Web Finance Tracker:_ https://money.eeja.fun`;
    return msg;
  }

  private async addTransactionFromWa(userId: string, text: string): Promise<string> {
    if (!userId) {
      return `❌ *Gagal!* Pengguna belum terdaftar di sistem.`;
    }

    // Format: !tambah [pengeluaran/pemasukan] [jumlah] | [kategori] | [deskripsi]
    const content = text.replace(/^[!/]tambah/i, '').trim();
    if (!content) {
      return `⚠️ *Format Salah!*\n\n*Format:* \`!tambah [pengeluaran/pemasukan] [jumlah] | [kategori] | [deskripsi]\`\n\n*Contoh:* \`!tambah pengeluaran 25000 | Makanan | Nasi Goreng\``;
    }

    let typeStr = '';
    let amountStr = '0';
    let catName = '';
    let description = '';

    const parts = content.split('|').map((s) => s.trim());
    if (parts.length >= 2) {
      const firstPart = parts[0].split(/\s+/);
      typeStr = (firstPart[0] || '').toLowerCase();
      amountStr = firstPart[1] || '0';

      // If firstPart only has 1 word and it's a number (e.g. !tambah 25000 | Makanan | Nasi Goreng)
      if (!firstPart[1] && !isNaN(parseFloat(typeStr.replace(/[^0-9.]/g, '')))) {
        amountStr = typeStr;
        typeStr = 'pengeluaran';
      }

      catName = parts[1] || '';
      description = parts[2] || '';
    } else {
      // Space separated format without pipes
      const tokens = content.split(/\s+/);
      const firstTokenLower = (tokens[0] || '').toLowerCase();

      if (firstTokenLower.includes('pengeluaran') || firstTokenLower.includes('pemasukan') || firstTokenLower.includes('masuk') || firstTokenLower.includes('keluar')) {
        typeStr = firstTokenLower;
        amountStr = tokens[1] || '0';
        catName = tokens[2] || '';
        description = tokens.slice(3).join(' ');
      } else {
        amountStr = tokens[0] || '0';
        catName = tokens[1] || '';
        description = tokens.slice(2).join(' ');
      }
    }

    const amount = parseFloat(amountStr.replace(/[^0-9.]/g, ''));
    if (isNaN(amount) || amount <= 0) {
      return `⚠️ *Jumlah Saldo Tidak Valid!*\n\n*Contoh:* \`!tambah pengeluaran 50000 | Makanan | Makan Siang\``;
    }

    const type = (typeStr.includes('masuk') || typeStr.includes('in') || typeStr.includes('pemasukan'))
      ? TransactionType.INCOME
      : TransactionType.EXPENSE;

    if (!catName) {
      catName = type === TransactionType.INCOME ? 'Gaji & Pendapatan Utama' : 'Makanan & Minuman';
    }
    if (!description) {
      description = catName;
    }

    // 1. Search category by exact/contains name matching user or system default
    let category = await this.prisma.category.findFirst({
      where: {
        OR: [{ userId }, { isSystemDefault: true }],
        type,
        name: { contains: catName, mode: 'insensitive' },
      },
    });

    // 2. Search category by individual tokens (e.g. "Makanan", "Minuman", "Kopi", "Bensin", etc.)
    if (!category && catName) {
      const keywords = catName.split(/[\s&,/]+/).filter((k) => k.length >= 3);
      for (const kw of keywords) {
        category = await this.prisma.category.findFirst({
          where: {
            OR: [{ userId }, { isSystemDefault: true }],
            type,
            name: { contains: kw, mode: 'insensitive' },
          },
        });
        if (category) break;
      }
    }

    // 3. Search category without name filtering (any matching type for user or system default)
    if (!category) {
      category = await this.prisma.category.findFirst({
        where: {
          OR: [{ userId }, { isSystemDefault: true }],
          type,
        },
      });
    }

    // 4. Fallback to any system default category
    if (!category) {
      category = await this.prisma.category.findFirst({
        where: { isSystemDefault: true },
      });
    }

    // 5. Ultimate Fallback: Auto-create category for user if none exists
    if (!category) {
      category = await this.prisma.category.create({
        data: {
          userId,
          name: catName || 'Umum',
          type,
          isSystemDefault: false,
        },
      });
    }

    // Find active user account
    let account = await this.prisma.account.findFirst({
      where: { userId, isArchived: false },
      orderBy: { balance: 'desc' },
    });

    // Auto-create default account if none exists for this user
    if (!account) {
      account = await this.prisma.account.create({
        data: {
          userId,
          name: 'Dompet Utama',
          type: 'BANK',
          balance: 0,
          color: '#EC4899',
        },
      });
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.transaction.create({
        data: {
          userId,
          accountId: account!.id,
          categoryId: category!.id,
          type,
          amount,
          description,
        },
      });

      const change = type === TransactionType.INCOME ? amount : -amount;
      await tx.account.update({
        where: { id: account!.id },
        data: { balance: { increment: change } },
      });
    });

    return `✅ *BERHASIL DICATAT!*

${type === TransactionType.EXPENSE ? '💸' : '💰'} *Tipe*: ${type === TransactionType.EXPENSE ? 'Pengeluaran' : 'Pemasukan'}
💵 *Jumlah*: Rp ${amount.toLocaleString('id-ID')}
🏷️ *Kategori*: ${category.name}
📝 *Deskripsi*: ${description}
💳 *Dompet*: ${account.name}

🔗 _Lihat Transaksi:_ https://money.eeja.fun/transactions`;
  }

  // Automatic installment reminder checker
  async checkAndSendInstallmentReminders(): Promise<number> {
    const now = new Date();
    const threeDaysLater = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 3, 23, 59, 59);

    const pendingPayments = await this.prisma.installmentPayment.findMany({
      where: {
        status: 'PENDING',
        dueDate: { lte: threeDaysLater },
      },
      include: {
        installment: {
          include: { user: true },
        },
      },
    });

    let sentCount = 0;
    for (const payment of pendingPayments) {
      const user = payment.installment.user;
      const phones = await this.getNotificationPhones(user?.phone);
      if (phones.length === 0) continue;

      const dueDateStr = new Date(payment.dueDate).toLocaleDateString('id-ID', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });

      const message = `⏰ *REMINDER CICILAN JATUH TEMPO!*

Halo ${user.fullName}, pengingat untuk cicilan kamu:
📌 *${payment.installment.title}*
🏢 *Penyedia*: ${payment.installment.provider}
💰 *Jumlah Tagihan*: *Rp ${payment.amount.toLocaleString('id-ID')}*
📅 *Jatuh Tempo*: *${dueDateStr}*
⏳ *Tenor*: Bulan Ke-${payment.tenorNumber} dari ${payment.installment.totalTenorMonths}

Mohon siapkan dana di dompet kamu agar tidak terkena denda keterlambatan! 🙏

🔗 _Bayar / Catat Pembayaran:_ https://finance.eeja.fun/installments`;

      const results = await Promise.allSettled(
        phones.map((phone) => this.sendTextMessage(phone, message)),
      );
      sentCount += results.filter(
        (result) => result.status === 'fulfilled' && result.value === true,
      ).length;
    }

    return sentCount;
  }
}
