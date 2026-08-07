'use client';

import React, { useState, useEffect } from 'react';
import { Bot, CheckCircle, Smartphone, Send, Terminal, QrCode, AlertCircle, RefreshCw, LogOut } from 'lucide-react';
import { whatsappApi, WhatsappStatus } from '../../../lib/api';
import styles from './whatsapp.module.css';

export default function WhatsAppPage() {
  const [statusData, setStatusData] = useState<WhatsappStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [resetting, setResetting] = useState(false);
  const [testPhone, setTestPhone] = useState('6281288092766');
  const [testMessage, setTestMessage] = useState('!hariini');
  const [logResponse, setLogResponse] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  const fetchStatus = async () => {
    try {
      const res = await whatsappApi.getStatus();
      setStatusData(res);
    } catch (err: any) {
      setStatusData({ status: 'disconnected', connectedUser: null, hasQr: false });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleResetSession = async () => {
    if (!confirm('Apakah kamu yakin ingin mereset sesi WhatsApp & memutus koneksi?')) return;
    setResetting(true);
    try {
      await whatsappApi.resetSession();
      setLogResponse('🔄 Sesi WhatsApp berhasil di-reset. Menyiapkan QR Code baru...');
      await fetchStatus();
    } catch (err: any) {
      setLogResponse(`❌ Gagal reset sesi: ${err.message || 'Error'}`);
    } finally {
      setResetting(false);
    }
  };

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

  const handleSendTest = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    try {
      await whatsappApi.sendWebhookTest(testPhone, testMessage);
      setLogResponse(`✅ Pesan simulasi terkirim ke ${testPhone}: "${testMessage}"\n[Bot Reply]: Perintah berhasil dikirim ke gateway WA! Cek balasan di aplikasi WA kamu.`);
    } catch (err: any) {
      setLogResponse(`❌ Gagal mengirim perintah: ${err.message || 'Network error'}`);
    } finally {
      setSending(false);
    }
  };

  const isConnected = statusData?.status === 'connected';

  return (
    <div className={styles.container}>
      {/* Banner */}
      <div className={styles.headerBanner}>
        <div>
          <h2>Integrasi Bot WhatsApp</h2>
          <p>Terhubung langsung dengan gateway WhatsApp untuk cek pengeluaran, cicilan, dan reminder otomatis.</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {isConnected ? (
            <div className={styles.statusBadge}>
              <CheckCircle size={16} />
              <span>Status Bot: Connected (+{statusData?.connectedUser || 'WA Active'})</span>
            </div>
          ) : (
            <div className={styles.disconnectedBadge}>
              <AlertCircle size={16} />
              <span>Status Bot: Disconnected</span>
            </div>
          )}

          <button
            onClick={handleResetSession}
            disabled={resetting}
            className={styles.sendBtn}
            style={{ background: 'var(--bg-subtle)', color: 'var(--text)', border: '1px solid var(--border)' }}
            title="Reset Sesi & Generate QR Baru"
          >
            <LogOut size={14} />
            <span>{resetting ? 'Resetting...' : 'Reset Sesi / QR Baru'}</span>
          </button>
        </div>
      </div>

      {/* QR Code Section if disconnected or QR ready */}
      {!isConnected && (
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <QrCode size={20} className={styles.accentIcon} />
            <h3>Pindai QR Code WhatsApp</h3>
          </div>
          <div className={styles.qrContainer}>
            {statusData?.qrDataUrl ? (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={statusData.qrDataUrl} alt="WhatsApp QR Code" className={styles.qrImage} />
                <p className={styles.qrText}>
                  Buka WhatsApp di ponsel kamu &gt; Menu &gt; Perangkat Tertaut (Linked Devices) &gt; Tautkan Perangkat (Link a Device), lalu pindai kode QR di atas.
                </p>
              </>
            ) : (
              <>
                <RefreshCw size={24} className={styles.accentIcon} />
                <p className={styles.qrText}>
                  {loading ? 'Memuat QR Code...' : 'Sedang menyiapkan sesi WhatsApp baru... Jika QR tidak muncul dalam 10 detik, klik tombol "Reset Sesi / QR Baru" di atas.'}
                </p>
              </>
            )}
          </div>
        </div>
      )}

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
                <label>Perintah (Command)</label>
                <input
                  type="text"
                  value={testMessage}
                  onChange={(e) => setTestMessage(e.target.value)}
                />
              </div>

              <button type="submit" className={styles.sendBtn} disabled={sending}>
                <Send size={16} />
                <span>{sending ? 'Mengirim...' : 'Kirim Tes Perintah'}</span>
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
