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
    const rawText = (body || '').trim();
    if (!rawText || !from) return;

    const lowerRaw = rawText.toLowerCase();
    // Ignore Job Tracker commands explicitly
    if (lowerRaw.startsWith('!loker') || lowerRaw.startsWith('/loker') || lowerRaw.startsWith('loker') || lowerRaw.startsWith('!email') || lowerRaw.startsWith('/email') || lowerRaw.startsWith('!job') || lowerRaw.startsWith('/job')) {
      return;
    }

    // Strip leading ! or / if present
    const text = rawText.replace(/^[!/]/, '').trim();
    const lower = text.toLowerCase();

    // Known command prefixes
    const knownCommands = ['help', 'menu', 'start', 'saldo', 'fin', 'overview', 'cicilan', 'hariini', 'pengeluaran', 'kategori', 'cat', 'dompet', 'rekening', 'riwayat', 'transaksi', 'history', 'hapus', 'delete', 'edit', 'ubah', 'tambah'];
    const isCommand = rawText.startsWith('!') || rawText.startsWith('/') || knownCommands.some((cmd) => lower.startsWith(cmd));
    if (!isCommand) return;

    this.logger.log(`Processing WA Finance Bot Command from ${from} (${pushName}): ${rawText}`);
    const userId = await this.getPrimaryUserId(from);
    let reply = '';

    if (lower.startsWith('help') || lower.startsWith('menu') || lower.startsWith('start')) {
      reply = this.getHelpMessage(pushName);
    } else if (lower.startsWith('saldo') || lower.startsWith('fin') || lower.startsWith('overview')) {
      reply = await this.getOverviewMessage(userId);
    } else if (lower.startsWith('cicilan')) {
      reply = await this.getActiveInstallmentsMessage(userId);
    } else if (lower.startsWith('hariini') || lower.startsWith('pengeluaran')) {
      reply = await this.getDailyExpenseMessage(userId);
    } else if (lower.startsWith('kategori') || lower.startsWith('cat')) {
      reply = await this.getCategoriesMessage(userId);
    } else if (lower.startsWith('dompet') || lower.startsWith('rekening')) {
      reply = await this.getAccountsMessage(userId);
    } else if (lower.startsWith('riwayat') || lower.startsWith('transaksi') || lower.startsWith('history')) {
      reply = await this.getRecentTransactionsMessage(userId);
    } else if (lower.startsWith('hapus') || lower.startsWith('delete')) {
      reply = await this.deleteTransactionFromWa(userId, text);
    } else if (lower.startsWith('edit') || lower.startsWith('ubah')) {
      reply = await this.editTransactionFromWa(userId, text);
    } else if (lower.startsWith('tambah')) {
      reply = await this.addTransactionFromWa(userId, text);
    }

    if (reply) {
      await this.sendTextMessage(from, reply);
    }
  }

  private getHelpMessage(pushName?: string): string {
    return `💰 *FINANCE TRACKER BOT MENU*
Halo ${pushName || 'Teman'}! Berikut adalah daftar perintah yang bisa kamu gunakan:

📊 *INFORMASI & SALDO*
• *!saldo* / *!overview* - Lihat total aset & cashflow bulan ini
• *!hariini* / *!pengeluaran* - Lihat rincian pengeluaran hari ini
• *!cicilan* - Daftar cicilan aktif & pengingat jatuh tempo
• *!dompet* / *!rekening* - Daftar dompet & saldo per akun
• *!kategori* - Lihat daftar semua kategori pemasukan/pengeluaran

📝 *KELOLA TRANSAKSI*
➕ *!tambah [pengeluaran/pemasukan] [jumlah] | [kategori] | [deskripsi] | [dompet]*
_Contoh:_ \`!tambah pengeluaran 35000 | Makanan | Makan Siang | GoPay\`

📋 *!riwayat* / *!transaksi*
Lihat 10 transaksi terakhir beserta kode & nomor urut.

✏️ *!edit #no [jumlah] | [kategori] | [deskripsi] | [dompet]*
Ubah transaksi berdasarkan nomor urut di riwayat.
_Contoh:_ \`!edit #1 40000 | Makanan | Makan Siang Komplit\`

❌ *!hapus #no* atau *!hapus [code]*
Hapus transaksi & kembalikan saldo dompet secara otomatis.
_Contoh:_ \`!hapus #1\`

💡 _Ketik salah satu perintah di atas untuk mulai._`;
  }

  async getCategoriesMessage(userId: string): Promise<string> {
    const categories = await this.prisma.category.findMany({
      where: {
        OR: [{ userId }, { isSystemDefault: true }],
      },
      orderBy: { name: 'asc' },
    });

    const expenses = categories.filter((c) => c.type === TransactionType.EXPENSE);
    const incomes = categories.filter((c) => c.type === TransactionType.INCOME);

    let msg = `🏷️ *DAFTAR KATEGORI KEUANGAN*\n\n`;

    msg += `💸 *PENGELUARAN (${expenses.length}):*\n`;
    if (expenses.length > 0) {
      expenses.forEach((c) => {
        msg += `• ${c.name}\n`;
      });
    } else {
      msg += `(Belum ada kategori pengeluaran)\n`;
    }

    msg += `\n💰 *PEMASUKAN (${incomes.length}):*\n`;
    if (incomes.length > 0) {
      incomes.forEach((c) => {
        msg += `• ${c.name}\n`;
      });
    } else {
      msg += `(Belum ada kategori pemasukan)\n`;
    }

    msg += `\n💡 *Tips Mencatat:*
\`!tambah pengeluaran 50000 | Makanan & Minuman | Makan Siang\`
_Catatan: Jika kategori belum ada, sistem akan otomatis mencarikannya atau membuatnya untukmu!_`;

    return msg;
  }

  async getAccountsMessage(userId: string): Promise<string> {
    const accounts = await this.prisma.account.findMany({
      where: { userId, isArchived: false },
      orderBy: { name: 'asc' },
    });

    if (accounts.length === 0) {
      return `💳 *DAFTAR DOMPET / REKENING*\n\nBelum ada dompet terdaftar. Dompet utama akan dibuat otomatis saat kamu mencatat transaksi pertama!`;
    }

    let totalBalance = 0;
    let msg = `💳 *DAFTAR DOMPET & REKENING*\n\n`;

    accounts.forEach((a, idx) => {
      totalBalance += a.balance;
      const typeLabel = a.type || 'BANK';
      msg += `${idx + 1}. *${a.name}* (${typeLabel})\n   💰 Saldo: *Rp ${a.balance.toLocaleString('id-ID')}*\n\n`;
    });

    msg += `📊 *Total Saldo Keseluruhan*: Rp ${totalBalance.toLocaleString('id-ID')}\n\n`;
    msg += `💡 *Tips:* Kamu bisa menentukan dompet saat mencatat:
\`!tambah pengeluaran 35000 | Makanan | Bakso | ${accounts[0]?.name || 'BCA'}\``;

    return msg;
  }

  async getRecentTransactionsMessage(userId: string): Promise<string> {
    const txs = await this.prisma.transaction.findMany({
      where: { userId },
      include: { category: true, account: true },
      orderBy: { date: 'desc' },
      take: 10,
    });

    if (txs.length === 0) {
      return `📋 *RIWAYAT TRANSAKSI*\n\nBelum ada riwayat transaksi. Gunakan perintah *!tambah* untuk mencatat transaksi baru.`;
    }

    let msg = `📋 *10 TRANSAKSI TERAKHIR*\n\n`;

    txs.forEach((t, idx) => {
      const icon = t.type === TransactionType.EXPENSE ? '💸' : '💰';
      const typeLabel = t.type === TransactionType.EXPENSE ? 'Pengeluaran' : 'Pemasukan';
      const dateStr = new Date(t.date).toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      });
      const shortId = t.id.slice(0, 8);

      msg += `*#${idx + 1}* ${icon} [${typeLabel}] *${t.description}*\n`;
      msg += `   💰 Rp ${t.amount.toLocaleString('id-ID')} | 🏷️ ${t.category?.name || 'Umum'}\n`;
      msg += `   💳 ${t.account?.name || 'N/A'} | 📅 ${dateStr}\n`;
      msg += `   🆔 Code: \`${shortId}\`\n\n`;
    });

    msg += `💡 *Aksi:*
❌ *Hapus:* \`!hapus #1\` atau \`!hapus [code]\`
✏️ *Edit:* \`!edit #1 50000 | Makanan | Makan Siang\`
_Gunakan nomor urut #1-#10 atau 8 digit kode unik di atas._`;

    return msg;
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

  private async findTransactionByRef(userId: string, refStr: string) {
    const cleanRef = refStr.trim().replace(/^#/, '');
    if (!cleanRef) return null;

    const txs = await this.prisma.transaction.findMany({
      where: { userId },
      include: { category: true, account: true },
      orderBy: { date: 'desc' },
      take: 20,
    });

    const index = parseInt(cleanRef, 10);
    if (!isNaN(index) && index >= 1 && index <= txs.length) {
      return txs[index - 1];
    }

    const found = txs.find(
      (t) => t.id === cleanRef || t.id.startsWith(cleanRef) || t.id.replace(/-/g, '').startsWith(cleanRef.replace(/-/g, '')),
    );
    return found || null;
  }

  private async resolveCategory(userId: string, type: TransactionType, catName: string) {
    let category = await this.prisma.category.findFirst({
      where: {
        OR: [{ userId }, { isSystemDefault: true }],
        type,
        name: { contains: catName, mode: 'insensitive' },
      },
    });

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

    if (!category) {
      category = await this.prisma.category.findFirst({
        where: {
          OR: [{ userId }, { isSystemDefault: true }],
          type,
        },
      });
    }

    if (!category) {
      category = await this.prisma.category.findFirst({
        where: { isSystemDefault: true },
      });
    }

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

    return category;
  }

  private async deleteTransactionFromWa(userId: string, text: string): Promise<string> {
    if (!userId) {
      return `❌ *Gagal!* Pengguna belum terdaftar di sistem.`;
    }

    const refStr = text.replace(/^[!/]?(hapus|delete)/i, '').trim();
    if (!refStr) {
      return `⚠️ *Format Salah!*\n\n*Format:* \`!hapus #no_atau_id\`\n*Contoh:* \`!hapus #1\` atau \`!hapus a1b2c3d4\`\n\n💡 Ketik *!riwayat* untuk melihat nomor transaksi.`;
    }

    const tx = await this.findTransactionByRef(userId, refStr);
    if (!tx) {
      return `❌ *Transaksi tidak ditemukan!*\n\nSilakan cek nomor transaksi melalui perintah *!riwayat*.`;
    }

    await this.prisma.$transaction(async (prismaTx) => {
      const change = tx.type === TransactionType.INCOME ? -tx.amount : tx.amount;
      await prismaTx.account.update({
        where: { id: tx.accountId },
        data: { balance: { increment: change } },
      });

      await prismaTx.transaction.delete({
        where: { id: tx.id },
      });
    });

    return `🗑️ *BERHASIL DIHAPUS!*

📌 *Deskripsi*: ${tx.description}
💰 *Jumlah*: Rp ${tx.amount.toLocaleString('id-ID')} (${tx.type === TransactionType.EXPENSE ? 'Pengeluaran' : 'Pemasukan'})
🏷️ *Kategori*: ${tx.category?.name || 'Umum'}
💳 *Dompet*: ${tx.account?.name || 'N/A'}

✅ Saldo dompet *${tx.account?.name || 'Dompet'}* telah diperbarui.`;
  }

  private async editTransactionFromWa(userId: string, text: string): Promise<string> {
    if (!userId) {
      return `❌ *Gagal!* Pengguna belum terdaftar di sistem.`;
    }

    const body = text.replace(/^[!/]?(edit|ubah)/i, '').trim();
    if (!body) {
      return `⚠️ *Format Salah!*

*Format:* \`!edit #no_atau_id [jumlah/tipe_jumlah] | [kategori] | [deskripsi] | [dompet]\`
*Contoh:* \`!edit #1 45000 | Makanan & Minuman | Makan Siang Lengkap\`
*Contoh 2:* \`!edit #1 pengeluaran 50000 | Makanan | Bakso | GoPay\`

💡 Ketik *!riwayat* untuk melihat nomor transaksi.`;
    }

    const spaceIndex = body.search(/\s/);
    if (spaceIndex === -1) {
      return `⚠️ *Format Salah!* Mohon cantumkan rincian perubahan setelah nomor/id transaksi.\n\n*Contoh:* \`!edit #1 50000 | Makanan | Makan Siang\``;
    }

    const refStr = body.slice(0, spaceIndex).trim();
    const content = body.slice(spaceIndex).trim();

    const existingTx = await this.findTransactionByRef(userId, refStr);
    if (!existingTx) {
      return `❌ *Transaksi tidak ditemukan!*\n\nSilakan cek nomor transaksi melalui perintah *!riwayat*.`;
    }

    let typeStr = '';
    let amountStr = '0';
    let catName = '';
    let description = '';
    let accountName = '';

    const parts = content.split('|').map((s) => s.trim());
    if (parts.length >= 2) {
      const firstPart = parts[0].split(/\s+/);
      typeStr = (firstPart[0] || '').toLowerCase();
      amountStr = firstPart[1] || '0';

      if (!firstPart[1] && !isNaN(parseFloat(typeStr.replace(/[^0-9.]/g, '')))) {
        amountStr = typeStr;
        typeStr = existingTx.type === TransactionType.INCOME ? 'pemasukan' : 'pengeluaran';
      }

      catName = parts[1] || '';
      description = parts[2] || '';
      accountName = parts[3] || '';
    } else {
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

    let amount = parseFloat(amountStr.replace(/[^0-9.]/g, ''));
    if (isNaN(amount) || amount <= 0) {
      amount = existingTx.amount;
    }

    const type = typeStr ? ((typeStr.includes('masuk') || typeStr.includes('in') || typeStr.includes('pemasukan'))
      ? TransactionType.INCOME
      : TransactionType.EXPENSE) : existingTx.type;

    if (!catName) catName = existingTx.category?.name || 'Umum';
    if (!description) description = existingTx.description || catName;

    const category = await this.resolveCategory(userId, type, catName);

    let targetAccount = existingTx.account;
    if (accountName) {
      const foundAcc = await this.prisma.account.findFirst({
        where: {
          userId,
          isArchived: false,
          name: { contains: accountName, mode: 'insensitive' },
        },
      });
      if (foundAcc) targetAccount = foundAcc;
    }

    if (!targetAccount) {
      targetAccount = await this.prisma.account.findFirst({
        where: { userId, isArchived: false },
      }) || existingTx.account;
    }

    const oldAccount = existingTx.account;
    const oldAmount = existingTx.amount;
    const oldType = existingTx.type;

    await this.prisma.$transaction(async (prismaTx) => {
      const revertChange = oldType === TransactionType.INCOME ? -oldAmount : oldAmount;
      await prismaTx.account.update({
        where: { id: oldAccount.id },
        data: { balance: { increment: revertChange } },
      });

      const newChange = type === TransactionType.INCOME ? amount : -amount;
      await prismaTx.account.update({
        where: { id: targetAccount.id },
        data: { balance: { increment: newChange } },
      });

      await prismaTx.transaction.update({
        where: { id: existingTx.id },
        data: {
          amount,
          type,
          categoryId: category.id,
          accountId: targetAccount.id,
          description,
        },
      });
    });

    return `✏️ *TRANSAKSI BERHASIL DIPERBARUI!*

${type === TransactionType.EXPENSE ? '💸' : '💰'} *Tipe*: ${type === TransactionType.EXPENSE ? 'Pengeluaran' : 'Pemasukan'}
💵 *Jumlah*: Rp ${amount.toLocaleString('id-ID')} ${(amount !== oldAmount ? `_(sebelumnya Rp ${oldAmount.toLocaleString('id-ID')})_` : '')}
🏷️ *Kategori*: ${category.name}
📝 *Deskripsi*: ${description}
💳 *Dompet*: ${targetAccount.name}

🔗 _Lihat Transaksi:_ https://money.eeja.fun/transactions`;
  }

  private async addTransactionFromWa(userId: string, text: string): Promise<string> {
    if (!userId) {
      return `❌ *Gagal!* Pengguna belum terdaftar di sistem.`;
    }

    // Format: !tambah [pengeluaran/pemasukan] [jumlah] | [kategori] | [deskripsi] | [dompet]
    const content = text.replace(/^[!/]?tambah/i, '').trim();
    if (!content) {
      return `⚠️ *Format Salah!*\n\n*Format:* \`!tambah [pengeluaran/pemasukan] [jumlah] | [kategori] | [deskripsi] | [dompet]\`\n\n*Contoh:* \`!tambah pengeluaran 25000 | Makanan | Nasi Goreng | GoPay\``;
    }

    let typeStr = '';
    let amountStr = '0';
    let catName = '';
    let description = '';
    let accountName = '';

    const parts = content.split('|').map((s) => s.trim());
    if (parts.length >= 2) {
      const firstPart = parts[0].split(/\s+/);
      typeStr = (firstPart[0] || '').toLowerCase();
      amountStr = firstPart[1] || '0';

      if (!firstPart[1] && !isNaN(parseFloat(typeStr.replace(/[^0-9.]/g, '')))) {
        amountStr = typeStr;
        typeStr = 'pengeluaran';
      }

      catName = parts[1] || '';
      description = parts[2] || '';
      accountName = parts[3] || '';
    } else {
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

    const category = await this.resolveCategory(userId, type, catName);

    let account: any = null;
    if (accountName) {
      account = await this.prisma.account.findFirst({
        where: {
          userId,
          isArchived: false,
          name: { contains: accountName, mode: 'insensitive' },
        },
      });
    }

    if (!account) {
      account = await this.prisma.account.findFirst({
        where: { userId, isArchived: false },
        orderBy: { balance: 'desc' },
      });
    }

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
          categoryId: category.id,
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
