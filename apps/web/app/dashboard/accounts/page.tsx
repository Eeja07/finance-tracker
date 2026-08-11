'use client';

import React, { useState, useEffect } from 'react';
import { Wallet, Building2, CreditCard, Plus, Loader2, Trash2 } from 'lucide-react';
import { accountsApi, Account } from '@/lib/api';
import styles from './accounts.module.css';

export default function AccountsPage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newType, setNewType] = useState<'BANK' | 'EWALLET' | 'CASH' | 'CREDIT_CARD'>('BANK');
  const [newBalance, setNewBalance] = useState('');
  const [newAccountNum, setNewAccountNum] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const loadAccounts = async () => {
    try {
      setLoading(true);
      const data = await accountsApi.list();
      setAccounts(data);
    } catch (err: any) {
      console.error('Failed to load accounts:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAccounts();
  }, []);

  const totalBalance = accounts.reduce((acc, a) => acc + a.balance, 0);

  const handleAddAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName || !newBalance) return;
    setError('');
    setSubmitting(true);

    try {
      await accountsApi.create({
        name: newName,
        type: newType,
        balance: parseFloat(newBalance),
        accountNumber: newAccountNum || undefined,
        color: 'var(--accent)',
      });
      setIsModalOpen(false);
      setNewName('');
      setNewBalance('');
      setNewAccountNum('');
      await loadAccounts();
    } catch (err: any) {
      setError(err.message || 'Gagal membuat akun');
    } finally {
      setSubmitting(false);
    }
  };

  const handleArchive = async (id: string) => {
    if (!confirm('Apakah kamu yakin ingin menghapus/mengarsipkan dompet ini?')) return;
    try {
      await accountsApi.archive(id);
      await loadAccounts();
    } catch (err: any) {
      alert(err.message || 'Gagal menghapus dompet');
    }
  };

  const getAccountIcon = (type: string) => {
    switch (type) {
      case 'BANK': return Building2;
      case 'EWALLET': return Wallet;
      case 'CASH': return CreditCard;
      default: return Wallet;
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.headerBanner}>
        <div>
          <h2>Dompet &amp; Akun Bank</h2>
          <p>Kelola rekening bank, e-wallet, dan uang tunai kamu di satu tempat.</p>
        </div>
        <button onClick={() => { setError(''); setIsModalOpen(true); }} className={styles.addBtn}>
          <Plus size={18} />
          <span>Tambah Dompet</span>
        </button>
      </div>

      <div className={styles.totalBar}>
        <span>Total Kekayaan Bersih (Aset):</span>
        <strong className={styles.totalValue}>Rp {totalBalance.toLocaleString('id-ID')}</strong>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem 0' }}>
          <Loader2 size={24} style={{ animation: 'spin 0.8s linear infinite', color: 'var(--accent)' }} />
        </div>
      ) : accounts.length === 0 ? (
        <div style={{ padding: '3rem 1rem', textAlign: 'center', color: 'var(--text-muted)' }}>
          Belum ada akun atau dompet yang terdaftar. Klik <strong>"Tambah Dompet"</strong> untuk mendaftarkan akun bank / e-wallet kamu.
        </div>
      ) : (
        <div className={styles.grid}>
          {accounts.map((acc) => {
            const Icon = getAccountIcon(acc.type);
            return (
              <div key={acc.id} className={styles.card}>
                <div className={styles.cardHeader}>
                  <div className={styles.iconCircle}>
                    <Icon size={22} />
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span className={styles.typeBadge}>{acc.type}</span>
                    <button
                      onClick={() => handleArchive(acc.id)}
                      className={styles.deleteBtn}
                      title="Hapus / Arsipkan"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>

                <div className={styles.cardBody}>
                  <h3 className={styles.accountName}>{acc.name}</h3>
                  <span className={styles.accountNo}>No: {acc.accountNumber || '-'}</span>
                  <div className={styles.balanceValue}>
                    Rp {acc.balance.toLocaleString('id-ID')}
                  </div>
                </div>

                <div className={styles.cardFooter}>
                  <span>Tersimpan di Database</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {isModalOpen && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <h3>Tambah Dompet / Bank Baru</h3>
            <form onSubmit={handleAddAccount} className={styles.form}>
              {error && <div className={styles.errorAlert}>{error}</div>}

              <div className={styles.formGroup}>
                <label>Nama Akun / Bank</label>
                <input
                  type="text"
                  placeholder="Misal: Bank Mandiri / DANA"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  required
                />
              </div>

              <div className={styles.formGrid}>
                <div className={styles.formGroup}>
                  <label>Tipe Akun</label>
                  <select value={newType} onChange={(e) => setNewType(e.target.value as any)}>
                    <option value="BANK">BANK</option>
                    <option value="EWALLET">E-WALLET</option>
                    <option value="CASH">UANG TUNAI</option>
                    <option value="CREDIT_CARD">KARTU KREDIT</option>
                  </select>
                </div>

                <div className={styles.formGroup}>
                  <label>Saldo Awal (Rp)</label>
                  <input
                    type="number"
                    placeholder="1000000"
                    value={newBalance}
                    onChange={(e) => setNewBalance(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className={styles.formGroup}>
                <label>Nomor Rekening / HP (Opsional)</label>
                <input
                  type="text"
                  placeholder="123-00-112233-4"
                  value={newAccountNum}
                  onChange={(e) => setNewAccountNum(e.target.value)}
                />
              </div>

              <div className={styles.modalActions}>
                <button type="button" onClick={() => setIsModalOpen(false)} className={styles.cancelBtn}>
                  Batal
                </button>
                <button type="submit" className={styles.submitBtn} disabled={submitting}>
                  {submitting ? <Loader2 size={16} className={styles.spinningIcon} /> : 'Simpan Dompet'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
