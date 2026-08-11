'use client';

import React, { useState, useEffect } from 'react';
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
  Loader2,
} from 'lucide-react';
import { transactionsApi, installmentsApi, DashboardSummary, DailyExpenseSummary, Installment } from '@/lib/api';
import styles from './dashboard.module.css';

export default function DashboardOverview() {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [daily, setDaily] = useState<DailyExpenseSummary | null>(null);
  const [installments, setInstallments] = useState<Installment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const [sumRes, dailyRes, instRes] = await Promise.all([
          transactionsApi.getSummary().catch(() => null),
          transactionsApi.getDaily().catch(() => null),
          installmentsApi.list('ACTIVE').catch(() => []),
        ]);
        if (sumRes) setSummary(sumRes);
        if (dailyRes) setDaily(dailyRes);
        if (Array.isArray(instRes)) setInstallments(instRes);
      } catch (err) {
        console.error('Failed to load dashboard overview data:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const totalAssets = summary?.totalAssets ?? 0;
  const monthlyIncome = summary?.monthlyIncome ?? 0;
  const monthlyExpense = summary?.monthlyExpense ?? 0;
  const netCashflow = summary?.netCashflow ?? 0;
  const accountCount = summary?.accountCount ?? 0;

  const todayExpenses = daily?.transactions ?? [];
  const todayTotal = daily?.totalExpense ?? 0;

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

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem 0' }}>
          <Loader2 size={24} style={{ animation: 'spin 0.8s linear infinite', color: 'var(--primary)' }} />
        </div>
      ) : (
        <>
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
              <div className={styles.kpiFooter}>{accountCount} Dompet & Bank Terhubung</div>
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
              <div className={styles.kpiFooter}>Terhitung real-time DB</div>
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
              <div className={styles.kpiFooter}>Terhitung real-time DB</div>
            </div>

            <div className={styles.kpiCard}>
              <div className={styles.kpiHeader}>
                <span className={styles.kpiTitle}>Cashflow Bersih</span>
                <div className={styles.kpiIconNet}>
                  <Scale size={20} />
                </div>
              </div>
              <div className={styles.kpiValue}>Rp {netCashflow.toLocaleString('id-ID')}</div>
              <div className={styles.kpiFooter}>{netCashflow >= 0 ? 'Surplus bulan ini' : 'Defisit bulan ini'}</div>
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
                    <span className={styles.subTitle}>Terhubung langsung dengan database</span>
                  </div>
                </div>
                <div className={styles.dailyTotalBadge}>
                  Total: Rp {todayTotal.toLocaleString('id-ID')}
                </div>
              </div>

              <div className={styles.expenseList}>
                {todayExpenses.length === 0 ? (
                  <div style={{ padding: '2rem 1rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                    Belum ada transaksi pengeluaran hari ini. Catat transaksi baru untuk memulai.
                  </div>
                ) : (
                  todayExpenses.map((exp) => (
                    <div key={exp.id} className={styles.expenseRow}>
                      <div className={styles.expenseIcon}>
                        <Receipt size={18} />
                      </div>
                      <div className={styles.expenseDetails}>
                        <span className={styles.expenseName}>{exp.description}</span>
                        <span className={styles.expenseMeta}>
                          {exp.category?.name || 'Umum'} • {exp.account?.name || 'Dompet'}
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
                    <span className={styles.subTitle}>Daftar cicilan aktif kamu saat ini</span>
                  </div>
                </div>
                <Link href="/dashboard/installments" className={styles.viewMoreLink}>
                  <span>Kelola</span>
                  <ArrowRight size={16} />
                </Link>
              </div>

              <div className={styles.installmentList}>
                {installments.length === 0 ? (
                  <div style={{ padding: '2rem 1rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                    Belum ada cicilan aktif. Tambah cicilan baru di menu Cicilan.
                  </div>
                ) : (
                  installments.map((inst) => {
                    const paidCount = inst.totalTenorMonths - inst.remainingTenorMonths;
                    const progressPct = Math.round((paidCount / inst.totalTenorMonths) * 100);
                    return (
                      <div key={inst.id} className={styles.installmentCard}>
                        <div className={styles.instHeader}>
                          <div>
                            <span className={styles.instTitle}>{inst.title}</span>
                            <span className={styles.instProvider}>{inst.provider}</span>
                          </div>
                          <div className={styles.instBadge}>
                            <AlertTriangle size={12} />
                            <span>Tgl {inst.dueDateDay} / bln</span>
                          </div>
                        </div>

                        <div className={styles.instBody}>
                          <div className={styles.instPrice}>
                            Rp {inst.monthlyAmount.toLocaleString('id-ID')} <span>/ bulan</span>
                          </div>
                          <div className={styles.instTenor}>
                            Sisa {inst.remainingTenorMonths} dari {inst.totalTenorMonths} bulan ({progressPct}% Lunas)
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
        </>
      )}
    </div>
  );
}
