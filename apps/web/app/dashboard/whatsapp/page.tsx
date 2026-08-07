'use client';

import React, { useState } from 'react';
import { MessageSquare, Bot, CheckCircle, Smartphone, Send, HelpCircle, Terminal } from 'lucide-react';
import styles from './whatsapp.module.css';

export default function WhatsAppPage() {
  const [testPhone, setTestPhone] = useState('6281234567890');
  const [testMessage, setTestMessage] = useState('!hariini');
  const [logResponse, setLogResponse] = useState<string | null>(null);

  const commands = [
    {
      cmd: '!hariini atau !pengeluaran',
      desc: 'Cek total & rincian pengeluaran harian kamu untuk hari ini.',
      example: '!hariini',
    },
    {
      cmd: '!cicilan',
      desc: 'Cek daftar cicilan aktif yang sedang berjalan, sisa bulan, & tanggal jatuh tempo.',
      example: '!cicilan',
    },
    {
      cmd: '!overview atau !saldo',
      desc: 'Cek total aset dompet, saldo per bank/e-wallet, & cashflow bulan ini.',
      example: '!overview',
    },
    {
      cmd: '!tambah [tipe] [jumlah] | [kategori] | [deskripsi]',
      desc: 'Catat transaksi pemasukan/pengeluaran baru secara instan dari WhatsApp.',
      example: '!tambah pengeluaran 35000 | Makanan | Makan Siang',
    },
    {
      cmd: '!help atau !bantuan',
      desc: 'Tampilkan menu bantuan bot dan seluruh perintah yang tersedia.',
      example: '!help',
    },
  ];

  const handleSendTest = (e: React.FormEvent) => {
    e.preventDefault();
    setLogResponse(`✅ Pesan simulasi terkirim ke ${testPhone}: "${testMessage}"\n[Bot Reply]: Rincian pengeluaran hari ini telah diproses!`);
  };

  return (
    <div className={styles.container}>
      {/* Banner */}
      <div className={styles.headerBanner}>
        <div>
          <h2>Integrasi Bot WhatsApp</h2>
          <p>Terhubung langsung dengan gateway WhatsApp untuk cek pengeluaran, cicilan, dan reminder otomatis.</p>
        </div>
        <div className={styles.statusBadge}>
          <CheckCircle size={16} />
          <span>Status Bot: Connected</span>
        </div>
      </div>

      <div className={styles.contentGrid}>
        {/* Available Commands */}
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <Terminal size={20} className={styles.accentIcon} />
            <h3>Daftar Perintah WA Bot</h3>
          </div>
          <div className={styles.commandList}>
            {commands.map((c, i) => (
              <div key={i} className={styles.commandRow}>
                <div className={styles.commandCode}>{c.cmd}</div>
                <div className={styles.commandDesc}>{c.desc}</div>
                <div className={styles.commandExample}>
                  <span>Contoh:</span> <code>{c.example}</code>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Test Console & Status */}
        <div className={styles.sidebarSection}>
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <Bot size={20} className={styles.accentIcon} />
              <h3>Uji Coba Perintah Bot</h3>
            </div>
            <form onSubmit={handleSendTest} className={styles.form}>
              <div className={styles.formGroup}>
                <label>Nomor WhatsApp</label>
                <input
                  type="text"
                  value={testPhone}
                  onChange={(e) => setTestPhone(e.target.value)}
                />
              </div>

              <div className={styles.formGroup}>
                <label>Perintah Perintah (Command)</label>
                <input
                  type="text"
                  value={testMessage}
                  onChange={(e) => setTestMessage(e.target.value)}
                />
              </div>

              <button type="submit" className={styles.sendBtn}>
                <Send size={16} />
                <span>Kirim Tes Perintah</span>
              </button>
            </form>

            {logResponse && (
              <div className={styles.logBox}>
                <pre>{logResponse}</pre>
              </div>
            )}
          </div>

          {/* Reminder Cron Info */}
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <Smartphone size={20} className={styles.accentIcon} />
              <h3>Pengingat Otomatis Cicilan</h3>
            </div>
            <p className={styles.infoText}>
              Sistem akan secara otomatis mengirim pesan pengingat jatuh tempo cicilan ke WhatsApp kamu pada <b>H-3</b>, <b>H-1</b>, dan pada <b>Hari-H</b> jatuh tempo setiap jam 08:00 WIB.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
