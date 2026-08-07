'use client';

import React, { useState } from 'react';
import { CreditCard, Plus, CheckCircle, AlertTriangle, Calendar, Building2, Bell } from 'lucide-react';
import styles from './installments.module.css';

interface Installment {
  id: string;
  title: string;
  provider: string;
  totalAmount: number;
  monthlyAmount: number;
  totalTenorMonths: number;
  remainingTenorMonths: number;
  dueDateDay: number;
  status: 'ACTIVE' | 'COMPLETED';
}

export default function InstallmentsPage() {
  const [installments, setInstallments] = useState<Installment[]>([
    {
      id: '1',
      title: 'Cicilan Laptop Gaming ASUS ROG',
      provider: 'BCA Credit Card',
      totalAmount: 18000000,
      monthlyAmount: 1500000,
      totalTenorMonths: 12,
      remainingTenorMonths: 5,
      dueDateDay: 10,
      status: 'ACTIVE',
    },
    {
      id: '2',
      title: 'Cicilan KPR Rumah Cluster Rose',
      provider: 'Bank Mandiri',
      totalAmount: 360000000,
      monthlyAmount: 3200000,
      totalTenorMonths: 120,
      remainingTenorMonths: 96,
      dueDateDay: 15,
      status: 'ACTIVE',
    },
    {
      id: '3',
      title: 'Cicilan Smartphone iPhone 15 Pro',
      provider: 'Shopee PayLater',
      totalAmount: 12000000,
      monthlyAmount: 2000000,
      totalTenorMonths: 6,
      remainingTenorMonths: 0,
      dueDateDay: 25,
      status: 'COMPLETED',
    },
  ]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newProvider, setNewProvider] = useState('');
  const [newTotalAmount, setNewTotalAmount] = useState('');
  const [newMonthlyAmount, setNewMonthlyAmount] = useState('');
  const [newTenor, setNewTenor] = useState('');
  const [newDueDateDay, setNewDueDateDay] = useState('');

  const activeInstallments = installments.filter((x) => x.status === 'ACTIVE');
  const totalMonthlyCommitment = activeInstallments.reduce((acc, x) => acc + x.monthlyAmount, 0);

  const handlePayInstallment = (id: string) => {
    setInstallments((prev) =>
      prev.map((inst) => {
        if (inst.id === id && inst.remainingTenorMonths > 0) {
          const nextRemaining = inst.remainingTenorMonths - 1;
          return {
            ...inst,
            remainingTenorMonths: nextRemaining,
            status: nextRemaining === 0 ? 'COMPLETED' : 'ACTIVE',
          };
        }
        return inst;
      }),
    );
    alert('✅ Pembayaran cicilan bulan ini berhasil dicatat! Saldo dompet telah dipotong.');
  };

  const handleAddInstallment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle || !newMonthlyAmount) return;

    const tenor = parseInt(newTenor) || 12;
    const monthly = parseFloat(newMonthlyAmount);
    const total = parseFloat(newTotalAmount) || monthly * tenor;

    const created: Installment = {
      id: Date.now().toString(),
      title: newTitle,
      provider: newProvider || 'Bank / Provider',
      totalAmount: total,
      monthlyAmount: monthly,
      totalTenorMonths: tenor,
      remainingTenorMonths: tenor,
      dueDateDay: parseInt(newDueDateDay) || 10,
      status: 'ACTIVE',
    };

    setInstallments([created, ...installments]);
    setIsModalOpen(false);
    setNewTitle('');
    setNewProvider('');
    setNewTotalAmount('');
    setNewMonthlyAmount('');
    setNewTenor('');
    setNewDueDateDay('');
  };

  return (
    <div className={styles.container}>
      {/* Top Banner */}
      <div className={styles.headerBanner}>
        <div>
          <h2>Cicilan Yang Dijalani</h2>
          <p>Pantau sisa tenor, tagihan bulanan, dan notifikasi pengingat otomatis via WhatsApp Bot.</p>
        </div>
        <button onClick={() => setIsModalOpen(true)} className={styles.addBtn}>
          <Plus size={18} />
          <span>Tambah Cicilan</span>
        </button>
      </div>

      {/* Summary Widget */}
      <div className={styles.summaryBar}>
        <div className={styles.summaryItem}>
          <span className={styles.summaryLabel}>Total Cicilan Aktif</span>
          <span className={styles.summaryValue}>{activeInstallments.length} Cicilan</span>
        </div>
        <div className={styles.summaryDivider}></div>
        <div className={styles.summaryItem}>
          <span className={styles.summaryLabel}>Total Komitmen Bulanan</span>
          <span className={`${styles.summaryValue} ${styles.accentText}`}>
            Rp {totalMonthlyCommitment.toLocaleString('id-ID')} / bln
          </span>
        </div>
        <div className={styles.summaryDivider}></div>
        <div className={styles.summaryItem}>
          <span className={styles.summaryLabel}>Notifikasi WhatsApp Bot</span>
          <span className={styles.waBadge}>
            <Bell size={14} />
            <span>Aktif H-3 & H-1</span>
          </span>
        </div>
      </div>

      {/* Installments List Grid */}
      <div className={styles.grid}>
        {installments.map((inst) => {
          const completedTenor = inst.totalTenorMonths - inst.remainingTenorMonths;
          const progressPct = Math.round((completedTenor / inst.totalTenorMonths) * 100);

          return (
            <div
              key={inst.id}
              className={`${styles.card} ${inst.status === 'COMPLETED' ? styles.cardCompleted : ''}`}
            >
              <div className={styles.cardHeader}>
                <div className={styles.titleGroup}>
                  <div className={styles.cardIcon}>
                    <CreditCard size={20} />
                  </div>
                  <div>
                    <h3 className={styles.cardTitle}>{inst.title}</h3>
                    <span className={styles.cardProvider}>{inst.provider}</span>
                  </div>
                </div>
                {inst.status === 'ACTIVE' ? (
                  <span className={styles.activeTag}>
                    <Calendar size={12} />
                    Jatuh Tempo Tgl {inst.dueDateDay}
                  </span>
                ) : (
                  <span className={styles.completedTag}>
                    <CheckCircle size={12} />
                    Lunas
                  </span>
                )}
              </div>

              <div className={styles.cardBody}>
                <div className={styles.priceRow}>
                  <div>
                    <span className={styles.priceLabel}>Tagihan per Bulan</span>
                    <div className={styles.priceValue}>
                      Rp {inst.monthlyAmount.toLocaleString('id-ID')}
                    </div>
                  </div>
                  <div className={styles.rightAlign}>
                    <span className={styles.priceLabel}>Total Pinjaman/Harga</span>
                    <div className={styles.totalValue}>
                      Rp {inst.totalAmount.toLocaleString('id-ID')}
                    </div>
                  </div>
                </div>

                <div className={styles.progressSection}>
                  <div className={styles.progressMeta}>
                    <span>
                      Tenor {completedTenor} dari {inst.totalTenorMonths} bulan
                    </span>
                    <span>{progressPct}% Terbayar</span>
                  </div>
                  <div className={styles.progressBarBg}>
                    <div
                      className={styles.progressBarFill}
                      style={{ width: `${progressPct}%` }}
                    ></div>
                  </div>
                </div>
              </div>

              {inst.status === 'ACTIVE' && (
                <div className={styles.cardFooter}>
                  <button
                    onClick={() => handlePayInstallment(inst.id)}
                    className={styles.payBtn}
                  >
                    <CheckCircle size={16} />
                    <span>Bayar Tagihan Bulan Ini</span>
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Add Modal */}
      {isModalOpen && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <h3>Tambah Cicilan Baru</h3>
            <form onSubmit={handleAddInstallment} className={styles.form}>
              <div className={styles.formGroup}>
                <label>Nama Cicilan / Barang</label>
                <input
                  type="text"
                  placeholder="Misal: Cicilan Laptop ASUS ROG"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  required
                />
              </div>

              <div className={styles.formGroup}>
                <label>Penyedia / Bank / E-Wallet</label>
                <input
                  type="text"
                  placeholder="Misal: BCA Credit Card / Shopee PayLater"
                  value={newProvider}
                  onChange={(e) => setNewProvider(e.target.value)}
                  required
                />
              </div>

              <div className={styles.formGrid}>
                <div className={styles.formGroup}>
                  <label>Cicilan per Bulan (Rp)</label>
                  <input
                    type="number"
                    placeholder="1500000"
                    value={newMonthlyAmount}
                    onChange={(e) => setNewMonthlyAmount(e.target.value)}
                    required
                  />
                </div>
                <div className={styles.formGroup}>
                  <label>Total Tenor (Bulan)</label>
                  <input
                    type="number"
                    placeholder="12"
                    value={newTenor}
                    onChange={(e) => setNewTenor(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className={styles.formGrid}>
                <div className={styles.formGroup}>
                  <label>Total Harga / Pinjaman (Rp)</label>
                  <input
                    type="number"
                    placeholder="18000000"
                    value={newTotalAmount}
                    onChange={(e) => setNewTotalAmount(e.target.value)}
                  />
                </div>
                <div className={styles.formGroup}>
                  <label>Tanggal Jatuh Tempo (1-31)</label>
                  <input
                    type="number"
                    placeholder="10"
                    value={newDueDateDay}
                    onChange={(e) => setNewDueDateDay(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className={styles.modalActions}>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className={styles.cancelBtn}
                >
                  Batal
                </button>
                <button type="submit" className={styles.submitBtn}>
                  Simpan Cicilan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
