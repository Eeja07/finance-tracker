'use client';

import React, { useState, useEffect } from 'react';
import {
  QrCode,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Send,
  LogOut,
  ShieldCheck,
  Terminal,
  Smartphone,
} from 'lucide-react';
import { whatsappApi, WhatsappStatus } from '../../../lib/api';
import styles from './whatsapp.module.css';

export default function WhatsAppPage() {
  const [waState, setWaState] = useState<WhatsappStatus>({
    status: 'disconnected',
    connectedUser: null,
    hasQr: false,
  });
  const [loading, setLoading] = useState(true);
  const [resetting, setResetting] = useState(false);
  const [testPhone, setTestPhone] = useState('');
  const [testMessage, setTestMessage] = useState('!hariini');
  const [sendingMsg, setSendingMsg] = useState(false);
  const [msgResult, setMsgResult] = useState<{ success: boolean; message: string } | null>(null);

  const fetchStatus = async () => {
    try {
      const data = await whatsappApi.getStatus();
      setWaState(data);
    } catch {
      setWaState({ status: 'disconnected', connectedUser: null, hasQr: false });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
    const timer = setInterval(() => {
      fetchStatus();
    }, 3000);
    return () => clearInterval(timer);
  }, []);

  const handleLogout = async () => {
    if (!confirm('Apakah Anda yakin ingin melepaskan koneksi WhatsApp Bot? Anda perlu scan ulang QR code untuk terhubung kembali.')) {
      return;
    }
    setResetting(true);
    try {
      await whatsappApi.resetSession();
      await fetchStatus();
    } catch (err: any) {
      alert('Gagal memutuskan koneksi WhatsApp: ' + (err.message || 'Error'));
    } finally {
      setResetting(false);
    }
  };

  const handleSendTestMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testPhone) {
      setMsgResult({ success: false, message: 'Masukkan nomor HP tujuan!' });
      return;
    }

    setSendingMsg(true);
    setMsgResult(null);
    try {
      await whatsappApi.sendWebhookTest(testPhone, testMessage);
      setMsgResult({
        success: true,
        message: `Pesan uji coba "${testMessage}" berhasil dikirim ke gateway untuk nomor ${testPhone}.`,
      });
    } catch (err: any) {
      setMsgResult({
        success: false,
        message: `Gagal mengirim pesan: ${err.message || 'Network error'}`,
      });
    } finally {
      setSendingMsg(false);
    }
  };

  const isConnected = waState.status === 'connected';

  return (
    <div className={styles.container}>
      {/* Header Banner */}
      <div className={styles.headerBanner}>
        <div>
          <h2>Integrasi Bot WhatsApp</h2>
          <p>Terhubung langsung dengan gateway WhatsApp private untuk pencatatan transaksi & reminder otomatis.</p>
        </div>
      </div>

      <div className={styles.contentGrid}>
        {/* Card 1: Connection & QR Scan */}
        <div className={styles.card}>
          <h3 className={styles.cardHeaderTitle}>
            <QrCode size={18} className={styles.accentIcon} />
            Koneksi WhatsApp Gateway
          </h3>

          <div className={styles.qrContainer}>
            {loading ? (
              <div style={{ padding: '3rem 0', color: 'var(--text-muted)' }}>
                <RefreshCw size={28} className={styles.spinningIcon} style={{ margin: '0 auto 0.75rem' }} />
                <p style={{ margin: 0, fontSize: '0.85rem' }}>Memeriksa status koneksi...</p>
              </div>
            ) : isConnected ? (
              <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <div className={styles.badgeConnected}>
                  <CheckCircle2 size={16} />
                  STATUS: TERHUBUNG
                </div>

                <div className={styles.connectedDetails}>
                  <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.85rem' }}>Nomor WA Terhubung:</p>
                  <p className={styles.connectedUser}>+{waState.connectedUser}</p>
                  <p style={{ margin: '0.75rem 0 0', color: 'var(--text-subtle)', fontSize: '0.8rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.35rem' }}>
                    <ShieldCheck size={14} />
                    Koneksi Multi-Project Persistent (Aktif bersama Job Tracker)
                  </p>
                </div>

                <button onClick={handleLogout} disabled={resetting} className={styles.logoutBtn}>
                  <LogOut size={16} />
                  {resetting ? 'Memutuskan...' : 'Putuskan Koneksi (Logout)'}
                </button>
              </div>
            ) : waState.qrDataUrl || waState.hasQr || waState.status === 'qr_ready' ? (
              <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <div className={styles.badgeQrReady}>
                  <Smartphone size={15} />
                  SILAKAN SCAN QR CODE
                </div>

                {waState.qrDataUrl ? (
                  <div className={styles.qrCodeFrame}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={waState.qrDataUrl} alt="WhatsApp QR Code" className={styles.qrImage} />
                  </div>
                ) : (
                  <div style={{ padding: '2rem 0', color: 'var(--text-muted)' }}>
                    <RefreshCw size={28} className={styles.spinningIcon} style={{ margin: '0 auto 0.75rem' }} />
                    <p style={{ margin: 0, fontSize: '0.85rem' }}>Menyiapkan gambar QR Code...</p>
                  </div>
                )}

                <ol className={styles.qrInstructions}>
                  <li>Buka aplikasi WhatsApp di HP.</li>
                  <li>Pilih <strong>Perangkat Tertaut (Linked Devices)</strong>.</li>
                  <li>Klik <strong>Tautkan Perangkat</strong> &amp; Scan QR Code di atas.</li>
                </ol>
              </div>
            ) : (
              <div style={{ padding: '2rem 0', color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <AlertCircle size={32} style={{ color: 'var(--text-subtle)', margin: '0 auto 0.75rem' }} />
                <p style={{ fontWeight: 600, color: 'var(--text)', margin: 0, fontSize: '0.9rem' }}>Gateway Belum Siap / Disconnected</p>
                <p style={{ fontSize: '0.82rem', marginTop: '0.35rem' }}>Menyiapkan koneksi WhatsApp Gateway baru...</p>
              </div>
            )}
          </div>
        </div>

        {/* Card 2: Test WhatsApp Notification */}
        <div className={styles.card}>
          <h3 className={styles.cardHeaderTitle}>
            <Send size={18} className={styles.accentIcon} />
            Kirim Pesan Uji Coba (Test Message)
          </h3>

          <form onSubmit={handleSendTestMessage} style={{ display: 'flex', flexDirection: 'column', width: '100%', flex: 1, gap: '12px' }}>
            <div className={styles.formGroup}>
              <label className={styles.label}>Nomor WhatsApp Tujuan (cth: 081234567890)</label>
              <input
                type="text"
                value={testPhone}
                onChange={(e) => setTestPhone(e.target.value)}
                placeholder="08xxxxxxxxxx"
                className={styles.input}
              />
            </div>

            <div className={styles.formGroup} style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
              <label className={styles.label}>Isi Perintah / Pesan</label>
              <input
                type="text"
                value={testMessage}
                onChange={(e) => setTestMessage(e.target.value)}
                placeholder="!hariini"
                className={styles.input}
              />
            </div>

            {msgResult && (
              <div className={styles.msgResultBox}>
                {msgResult.message}
              </div>
            )}

            <button
              type="submit"
              disabled={sendingMsg || !isConnected}
              className={styles.submitBtn}
              style={{ marginTop: 'auto' }}
            >
              <Send size={15} />
              {sendingMsg ? 'Mengirim Pesan...' : 'Kirim Pesan WhatsApp'}
            </button>
          </form>
        </div>
      </div>

      {/* Card 3: Interactive Bot Commands Cheat Sheet */}
      <div className={styles.card} style={{ marginTop: '0.5rem' }}>
        <h3 className={styles.cardHeaderTitle}>
          <Terminal size={18} className={styles.accentIcon} />
          Daftar Perintah WhatsApp Bot Interaktif
        </h3>

        <p className={styles.subtitle} style={{ marginBottom: '1rem', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
          Kirim pesan chat berikut langsung ke nomor bot WhatsApp yang terhubung untuk mengontrol pencatatan keuangan Anda:
        </p>

        <div className={styles.cheatGrid}>
          <div className={styles.cheatCard}>
            <span className={styles.cmdTag}>!overview</span>
            <p className={styles.cheatDesc}>
              Cek total aset dompet, saldo per bank/e-wallet, &amp; cashflow bulan ini.
            </p>
          </div>

          <div className={styles.cheatCard}>
            <span className={styles.cmdTag}>!hariini</span>
            <p className={styles.cheatDesc}>
              Cek total &amp; rincian pengeluaran harian kamu untuk hari ini.
            </p>
          </div>

          <div className={styles.cheatCard}>
            <span className={styles.cmdTag}>!cicilan</span>
            <p className={styles.cheatDesc}>
              Cek daftar cicilan aktif yang sedang berjalan, sisa bulan, &amp; tanggal jatuh tempo.
            </p>
          </div>

          <div className={styles.cheatCard}>
            <span className={styles.cmdTag}>!tambah pengeluaran 35000 | Makanan | Makan Siang</span>
            <p className={styles.cheatDesc}>
              Catat transaksi baru langsung via chat WhatsApp secara instan.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
