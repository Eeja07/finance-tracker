'use client';

import React, { useState } from 'react';
import { Wallet, Building2, CreditCard, Plus, ArrowUpRight, ArrowDownLeft } from 'lucide-react';
import styles from './accounts.module.css';

export default function AccountsPage() {
  const [accounts, setAccounts] = useState([
    { id: '1', name: 'Bank BCA Utama', type: 'BANK', accountNumber: '8830912831', balance: 12500000, color: '#2563EB', icon: Building2 },
    { id: '2', name: 'GoPay / OVO', type: 'EWALLET', accountNumber: '081234567890', balance: 850000, color: '#00AED6', icon: Wallet },
    { id: '3', name: 'Uang Tunai Dompet', type: 'CASH', accountNumber: '-', balance: 450000, color: '#10B981', icon: CreditCard },
  ]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newType, setNewType] = useState('BANK');
  const [newBalance, setNewBalance] = useState('');
  const [newAccountNum, setNewAccountNum] = useState('');

  const totalBalance = accounts.reduce((acc, a) => acc + a.balance, 0);

  const handleAddAccount = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName || !newBalance) return;

    const created = {
      id: Date.now().toString(),
      name: newName,
      type: newType,
      accountNumber: newAccountNum || '-',
      balance: parseFloat(newBalance),
      color: newType === 'BANK' ? '#2563EB' : newType === 'EWALLET' ? '#00AED6' : '#10B981',
      icon: newType === 'BANK' ? Building2 : Wallet,
    };

    setAccounts([...accounts, created]);
    setIsModalOpen(false);
    setNewName('');
    setNewBalance('');
    setNewAccountNum('');
  };

  return (
    <div className={styles.container}>
      <div className={styles.headerBanner}>
        <div>
          <h2>Dompet & Akun Bank</h2>
          <p>Kelola rekening bank, e-wallet, dan uang tunai kamu di satu tempat.</p>
        </div>
        <button onClick={() => setIsModalOpen(true)} className={styles.addBtn}>
          <Plus size={18} />
          <span>Tambah Dompet</span>
        </button>
      </div>

      <div className={styles.totalBar}>
        <span>Total Kekayaan Bersih (Aset):</span>
        <strong className={styles.totalValue}>Rp {totalBalance.toLocaleString('id-ID')}</strong>
      </div>

      <div className={styles.grid}>
        {accounts.map((acc) => {
          const Icon = acc.icon;
          return (
            <div key={acc.id} className={styles.card}>
              <div className={styles.cardHeader}>
                <div className={styles.iconCircle} style={{ background: `${acc.color}20`, color: acc.color }}>
                  <Icon size={22} />
                </div>
                <span className={styles.typeBadge}>{acc.type}</span>
              </div>

              <div className={styles.cardBody}>
                <h3 className={styles.accountName}>{acc.name}</h3>
                <span className={styles.accountNo}>No: {acc.accountNumber}</span>
                <div className={styles.balanceValue}>
                  Rp {acc.balance.toLocaleString('id-ID')}
                </div>
              </div>

              <div className={styles.cardFooter}>
                <span>Terverifikasi Real-time</span>
              </div>
            </div>
          );
        })}
      </div>

      {isModalOpen && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <h3>Tambah Dompet / Bank Baru</h3>
            <form onSubmit={handleAddAccount} className={styles.form}>
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
                  <select value={newType} onChange={(e) => setNewType(e.target.value)}>
                    <option value="BANK">BANK</option>
                    <option value="EWALLET">E-WALLET</option>
                    <option value="CASH">UANG TUNAI</option>
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
                <button type="submit" className={styles.submitBtn}>
                  Simpan Dompet
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
