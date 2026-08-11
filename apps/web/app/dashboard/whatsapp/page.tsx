'use client';

import React, { useState, useEffect, useRef } from 'react';
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
  Radio,
  Zap,
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

  const fetchStatus = async (): Promise<WhatsappStatus> => {
    try {
      const data = await whatsappApi.getStatus();
      setWaState(data);
      return data;
    } catch {
      const fallback: WhatsappStatus = { status: 'disconnected', connectedUser: null, hasQr: false };
      setWaState(fallback);
      return fallback;
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

  // Robust QR Code re-generation handler
  const handleReconnect = async () => {
    setResetting(true);
    setWaState({ status: 'connecting', connectedUser: null, hasQr: false });
    try {
      await whatsappApi.resetSession();
      
      // Fast polling every 500ms to catch the newly generated QR Code immediately
      let attempts = 0;
      const pollInterval = setInterval(async () => {
        attempts++;
        const currentData = await fetchStatus();
        if (currentData.qrDataUrl || currentData.hasQr || currentData.status === 'qr_ready' || currentData.status === 'connected' || attempts >= 20) {
          clearInterval(pollInterval);
          setResetting(false);
        }
      }, 500);
    } catch (err: any) {
      console.error('Reconnect failed:', err);
      alert('Gagal meminta QR Code baru: ' + (err.message || 'Error koneksi'));
      setResetting(false);
      await fetchStatus();
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
          <p>Terhubung langsung dengan gateway WhatsApp private untuk pencatatan transaksi &amp; reminder otomatis.</p>
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
            {loading || resetting ? (
              <div style={{ padding: '3rem 0', color: 'var(--text-muted)', textAlign: 'center' }}>
                <RefreshCw size={28} className={styles.spinningIcon} style={{ margin: '0 auto 0.75rem' }} />
                <p style={{ margin: 0, fontWeight: 600, color: 'var(--text)', fontSize: '0.9rem' }}>
                  {resetting ? 'Membuat QR Code Baru...' : 'Memeriksa status WhatsApp...'}
                </p>
                <p style={{ margin: '0.35rem 0 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  {resetting ? 'Mohon tunggu 2-3 detik hingga scanner QR siap.' : 'Menghubungkan ke layanan gateway'}
                </p>
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
                  <div style={{ padding: '2rem 0', color: 'var(--text-muted)', textAlign: 'center' }}>
                    <RefreshCw size={28} className={styles.spinningIcon} style={{ margin: '0 auto 0.75rem' }} />
                    <p style={{ margin: 0, fontSize: '0.85rem' }}>Menyiapkan gambar QR Code...</p>
                  </div>
                )}

                <ol className={styles.qrInstructions}>
                  <li>Buka aplikasi WhatsApp di HP.</li>
                  <li>Pilih <strong>Perangkat Tertaut (Linked Devices)</strong>.</li>
                  <li>Klik <strong>Tautkan Perangkat</strong> &amp; Scan QR Code di atas.</li>
                </ol>

                <button
                  onClick={handleReconnect}
                  disabled={resetting}
                  className={styles.refreshQrBtn}
                >
                  <RefreshCw size={14} />
                  <span>Minta QR Code Baru</span>
                </button>
              </div>
            ) : (
              <div style={{ padding: '2rem 0', color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
                {waState.status === 'connecting' ? (
                  <RefreshCw size={32} className={styles.spinningIcon} style={{ color: 'var(--accent)', margin: '0 auto 0.75rem' }} />
                ) : (
                  <Radio size={32} style={{ color: 'var(--accent)', margin: '0 auto 0.75rem' }} />
                )}
                <p style={{ fontWeight: 600, color: 'var(--text)', margin: 0, fontSize: '0.95rem' }}>
                  {waState.status === 'connecting' ? 'Menyiapkan WhatsApp Gateway...' : 'Gateway Belum Siap / Disconnected'}
                </p>
                <p style={{ fontSize: '0.82rem', marginTop: '0.35rem', color: 'var(--text-muted)' }}>
                  {waState.status === 'connecting'
                    ? 'Sedang membuat QR Code baru, mohon tunggu sebentar...'
                    : 'Klik tombol di bawah untuk membuat QR Code tautan perangkat WhatsApp baru secara langsung.'}
                </p>

                <button
                  onClick={handleReconnect}
                  disabled={resetting}
                  className={styles.submitBtn}
                  style={{ marginTop: '1.25rem', width: 'auto', padding: '10px 22px' }}
                >
                  {resetting ? (
                    <>
                      <RefreshCw size={15} className={styles.spinningIcon} />
                      <span>Menyiapkan QR Code...</span>
                    </>
                  ) : (
                    <>
                      <Zap size={15} />
                      <span>Generasi QR Code Baru</span>
                    </>
                  )}
                </button>
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
