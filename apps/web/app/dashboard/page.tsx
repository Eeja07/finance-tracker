'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  Scale,
  CreditCard,
  Calendar,
  PlusCircle,
  ArrowRight,
  Receipt,
  AlertTriangle,
  CheckCircle2,
} from 'lucide-react';
import styles from './dashboard.module.css';

export default function DashboardOverview() {
  const [totalAssets] = useState(0);
  const [monthlyIncome] = useState(0);
  const [monthlyExpense] = useState(0);
  const netCashflow = monthlyIncome - monthlyExpense;

  const todayExpenses: any[] = [];
  const activeInstallments: any[] = [];

  return (
    <div className={styles.container}>
      {/* Header Banner */}
      <div className={styles.heroBanner}>
        <div className={styles.heroText}>
          <h2>Ringkasan Keuangan Saya</h2>
          <p>Pantau arus kas, total aset, pengeluaran harian, dan cicilan yang sedang berlangsung secara real-time.</p>
        </div>
        <div className={styles.heroActions}>
          <Link href="/dashboard/transactions" className={styles.primaryBtn}>
            <PlusCircle size={18} />
            <span>Tambah Transaksi</span>
          </Link>
          <Link href="/dashboard/installments" className={styles.secondaryBtn}>
            <CreditCard size={18} />
            <span>Cek Cicilan</span>
          </Link>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className={styles.kpiGrid}>
        <div className={styles.kpiCard}>
          <div className={styles.kpiHeader}>
            <span className={styles.kpiTitle}>Total Aset Keuangan</span>
            <div className={styles.kpiIconWallet}>
              <Wallet size={20} />
            </div>
          </div>
          <div className={styles.kpiValue}>Rp {totalAssets.toLocaleString('id-ID')}</div>
          <div className={styles.kpiFooter}>3 Dompet & Bank Terhubung</div>
        </div>

        <div className={styles.kpiCard}>
          <div className={styles.kpiHeader}>
            <span className={styles.kpiTitle}>Pemasukan Bulan Ini</span>
            <div className={styles.kpiIconIncome}>
              <TrendingUp size={20} />
            </div>
          </div>
          <div className={`${styles.kpiValue} ${styles.incomeText}`}>
            Rp {monthlyIncome.toLocaleString('id-ID')}
          </div>
          <div className={styles.kpiFooter}>+12.5% vs bulan lalu</div>
        </div>

        <div className={styles.kpiCard}>
          <div className={styles.kpiHeader}>
            <span className={styles.kpiTitle}>Pengeluaran Bulan Ini</span>
            <div className={styles.kpiIconExpense}>
              <TrendingDown size={20} />
            </div>
          </div>
          <div className={`${styles.kpiValue} ${styles.expenseText}`}>
            Rp {monthlyExpense.toLocaleString('id-ID')}
          </div>
          <div className={styles.kpiFooter}>Terhitung dari 24 transaksi</div>
        </div>

        <div className={styles.kpiCard}>
          <div className={styles.kpiHeader}>
            <span className={styles.kpiTitle}>Cashflow Bersih</span>
            <div className={styles.kpiIconNet}>
              <Scale size={20} />
            </div>
          </div>
          <div className={styles.kpiValue}>Rp {netCashflow.toLocaleString('id-ID')}</div>
          <div className={styles.kpiFooter}>Surplus bulan ini</div>
        </div>
      </div>

      {/* Main Content Grid: Daily Expense & Active Installments */}
      <div className={styles.mainGrid}>
        {/* Daily Expenses Section */}
        <div className={styles.cardSection}>
          <div className={styles.sectionHeader}>
            <div className={styles.sectionTitleGroup}>
              <Calendar size={20} className={styles.accentIcon} />
              <div>
                <h3>Pengeluaran Hari Ini</h3>
                <span className={styles.subTitle}>Dapat dicek via WA Bot (!hariini)</span>
              </div>
            </div>
            <div className={styles.dailyTotalBadge}>
              Total: Rp {todayExpenses.reduce((acc, x) => acc + x.amount, 0).toLocaleString('id-ID')}
            </div>
          </div>

          <div className={styles.expenseList}>
            {todayExpenses.length === 0 ? (
              <div style={{ padding: '2rem 1rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                Belum ada transaksi pengeluaran hari ini. Catat transaksi baru atau kirim via WA Bot (!tambah).
              </div>
            ) : (
              todayExpenses.map((exp) => (
                <div key={exp.id} className={styles.expenseRow}>
                  <div className={styles.expenseIcon}>
                    <Receipt size={18} />
                  </div>
                  <div className={styles.expenseDetails}>
                    <span className={styles.expenseName}>{exp.name}</span>
                    <span className={styles.expenseMeta}>
                      {exp.category} • {exp.wallet} • {exp.time}
                    </span>
                  </div>
                  <div className={styles.expenseAmount}>
                    - Rp {exp.amount.toLocaleString('id-ID')}
                  </div>
                </div>
              ))
            )}
          </div>

          <div className={styles.cardFooter}>
            <Link href="/dashboard/transactions" className={styles.viewMoreLink}>
              <span>Lihat Semua Transaksi</span>
              <ArrowRight size={16} />
            </Link>
          </div>
        </div>

        {/* Active Installments Section (Cicilan yang dijalani) */}
        <div className={styles.cardSection}>
          <div className={styles.sectionHeader}>
            <div className={styles.sectionTitleGroup}>
              <CreditCard size={20} className={styles.accentIcon} />
              <div>
                <h3>Cicilan Yang Dijalani</h3>
                <span className={styles.subTitle}>Dapat dicek & direminder via WA Bot (!cicilan)</span>
              </div>
            </div>
            <Link href="/dashboard/installments" className={styles.viewMoreLink}>
              <span>Kelola</span>
              <ArrowRight size={16} />
            </Link>
          </div>

          <div className={styles.installmentList}>
            {activeInstallments.length === 0 ? (
              <div style={{ padding: '2rem 1rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                Belum ada cicilan aktif. Tambah cicilan baru untuk mendapatkan pengingat otomatis.
              </div>
            ) : (
              activeInstallments.map((inst) => {
                const progressPct = Math.round(((inst.totalTenor - inst.remainingTenor) / inst.totalTenor) * 100);
                return (
                  <div key={inst.id} className={styles.installmentCard}>
                    <div className={styles.instHeader}>
                      <div>
                        <span className={styles.instTitle}>{inst.title}</span>
                        <span className={styles.instProvider}>{inst.provider}</span>
                      </div>
                      <div className={styles.instBadge}>
                        <AlertTriangle size={12} />
                        <span>Jatuh Tempo {inst.nextDueDate}</span>
                      </div>
                    </div>

                    <div className={styles.instBody}>
                      <div className={styles.instPrice}>
                        Rp {inst.monthlyAmount.toLocaleString('id-ID')} <span>/ bulan</span>
                      </div>
                      <div className={styles.instTenor}>
                        Sisa {inst.remainingTenor} dari {inst.totalTenor} bulan ({progressPct}% Lunas)
                      </div>
                    </div>

                    <div className={styles.progressBarBg}>
                      <div className={styles.progressBarFill} style={{ width: `${progressPct}%` }}></div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
