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
  ChevronLeft,
  ChevronRight,
  RotateCcw,
} from 'lucide-react';
import { transactionsApi, installmentsApi, DashboardSummary, DailyExpenseSummary, Installment } from '@/lib/api';
import styles from './dashboard.module.css';

const MONTH_NAMES = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

export default function DashboardOverview() {
  const now = new Date();
  const currentRealMonth = now.getMonth() + 1;
  const currentRealYear = now.getFullYear();

  const [selectedMonth, setSelectedMonth] = useState<number>(currentRealMonth);
  const [selectedYear, setSelectedYear] = useState<number>(currentRealYear);

  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [daily, setDaily] = useState<DailyExpenseSummary | null>(null);
  const [installments, setInstallments] = useState<Installment[]>([]);
  const [loading, setLoading] = useState(true);
  const [summaryLoading, setSummaryLoading] = useState(false);

  // Initial load for daily and installments
  useEffect(() => {
    async function loadStaticData() {
      try {
        setLoading(true);
        const [dailyRes, instRes] = await Promise.all([
          transactionsApi.getDaily().catch(() => null),
          installmentsApi.list('ACTIVE').catch(() => []),
        ]);
        if (dailyRes) setDaily(dailyRes);
        if (Array.isArray(instRes)) setInstallments(instRes);
      } catch (err) {
        console.error('Failed to load static overview data:', err);
      } finally {
        setLoading(false);
      }
    }
    loadStaticData();
  }, []);

  // Fetch summary dynamically whenever selected month or year changes
  useEffect(() => {
    async function loadMonthlySummary() {
      try {
        setSummaryLoading(true);
        const sumRes = await transactionsApi.getSummary({
          month: selectedMonth,
          year: selectedYear,
        }).catch(() => null);
        if (sumRes) setSummary(sumRes);
      } catch (err) {
        console.error('Failed to load dashboard overview data:', err);
      } finally {
        setSummaryLoading(false);
      }
    }
    loadMonthlySummary();
  }, [selectedMonth, selectedYear]);

  const isCurrentMonth = selectedMonth === currentRealMonth && selectedYear === currentRealYear;
  const selectedMonthName = MONTH_NAMES[selectedMonth - 1] || 'Bulan Ini';

  const handlePrevMonth = () => {
    if (selectedMonth === 1) {
      setSelectedMonth(12);
      setSelectedYear((y) => y - 1);
    } else {
      setSelectedMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (selectedMonth === 12) {
      setSelectedMonth(1);
      setSelectedYear((y) => y + 1);
    } else {
      setSelectedMonth((m) => m + 1);
    }
  };

  const handleCurrentMonth = () => {
    setSelectedMonth(currentRealMonth);
    setSelectedYear(currentRealYear);
  };

  // Generate options for dropdown
  const monthOptions: Array<{ value: string; label: string }> = [];
  const startYear = currentRealYear - 2;
  const endYear = currentRealYear + 1;
  for (let y = startYear; y <= endYear; y++) {
    for (let m = 1; m <= 12; m++) {
      monthOptions.push({
        value: `${y}-${m}`,
        label: `${MONTH_NAMES[m - 1]} ${y}`,
      });
    }
  }

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

      {/* Month Navigation & Analysis Period Toolbar */}
      <div className={styles.monthNavBanner}>
        <div className={styles.monthNavLeft}>
          <span className={styles.periodLabel}>Periode Analisis:</span>
          <div className={styles.monthNavControls}>
            <button
              onClick={handlePrevMonth}
              className={styles.monthArrowBtn}
              title="Bulan Sebelumnya"
              aria-label="Bulan Sebelumnya"
            >
              <ChevronLeft size={16} />
            </button>
            <div className={styles.monthSelectWrap}>
              <select
                value={`${selectedYear}-${selectedMonth}`}
                onChange={(e) => {
                  const parts = e.target.value.split('-').map(Number);
                  const y = parts[0];
                  const m = parts[1];
                  if (typeof y === 'number' && typeof m === 'number' && !isNaN(y) && !isNaN(m)) {
                    setSelectedYear(y);
                    setSelectedMonth(m);
                  }
                }}
                className={styles.monthDropdown}
                aria-label="Pilih Bulan dan Tahun Analisis"
              >
                {monthOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
            <button
              onClick={handleNextMonth}
              className={styles.monthArrowBtn}
              title="Bulan Berikutnya"
              aria-label="Bulan Berikutnya"
            >
              <ChevronRight size={16} />
            </button>
          </div>
          {!isCurrentMonth && (
            <button
              onClick={handleCurrentMonth}
              className={styles.resetMonthBtn}
              title="Kembali ke Bulan Berjalan"
            >
              <RotateCcw size={12} />
              <span>Bulan Ini</span>
            </button>
          )}
        </div>
        <div className={styles.monthNavRight}>
          <span className={styles.monthActiveTag}>
            <Calendar size={13} />
            <span>{selectedMonthName} {selectedYear} {isCurrentMonth ? '(Bulan Ini)' : ''}</span>
          </span>
        </div>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem 0' }}>
          <Loader2 size={24} style={{ animation: 'spin 0.8s linear infinite', color: 'var(--primary)' }} />
        </div>
      ) : (
        <>
          {/* Summary KPI Cards */}
          <div className={styles.kpiGrid} style={{ opacity: summaryLoading ? 0.6 : 1, transition: 'opacity 0.2s ease' }}>
            <div className={styles.kpiCard}>
              <div className={styles.kpiHeader}>
                <span className={styles.kpiTitle}>Total Aset Keuangan</span>
                <div className={styles.kpiIconWallet}>
                  <Wallet size={20} />
                </div>
              </div>
              <div className={styles.kpiValue}>Rp {totalAssets.toLocaleString('id-ID')}</div>
              <div className={styles.kpiFooter}>{accountCount} Dompet &amp; Bank Terhubung</div>
            </div>

            <div className={styles.kpiCard}>
              <div className={styles.kpiHeader}>
                <span className={styles.kpiTitle}>
                  Pemasukan {isCurrentMonth ? 'Bulan Ini' : `(${selectedMonthName})`}
                </span>
                <div className={styles.kpiIconIncome}>
                  <TrendingUp size={20} />
                </div>
              </div>
              <div className={`${styles.kpiValue} ${styles.incomeText}`}>
                Rp {monthlyIncome.toLocaleString('id-ID')}
              </div>
              <div className={styles.kpiFooter}>
                {isCurrentMonth ? 'Terhitung bulan berjalan' : `Periode ${selectedMonthName} ${selectedYear}`}
              </div>
            </div>

            <Link href="/dashboard/transactions?type=EXPENSE#transactions-filters" className={styles.kpiCardLink}>
              <div className={styles.kpiCard}>
                <div className={styles.kpiHeader}>
                  <span className={styles.kpiTitle}>
                    Pengeluaran {isCurrentMonth ? 'Bulan Ini' : `(${selectedMonthName})`}
                  </span>
                  <div className={styles.kpiIconExpense}>
                    <TrendingDown size={20} />
                  </div>
                </div>
                <div className={`${styles.kpiValue} ${styles.expenseText}`}>
                  Rp {monthlyExpense.toLocaleString('id-ID')}
                </div>
                <div className={styles.kpiFooter}>
                  {isCurrentMonth ? 'Terhitung bulan berjalan' : `Periode ${selectedMonthName} ${selectedYear}`}
                </div>
              </div>
            </Link>

            <div className={styles.kpiCard}>
              <div className={styles.kpiHeader}>
                <span className={styles.kpiTitle}>
                  Cashflow Bersih {isCurrentMonth ? 'Bulan Ini' : `(${selectedMonthName})`}
                </span>
                <div className={styles.kpiIconNet}>
                  <Scale size={20} />
                </div>
              </div>
              <div className={styles.kpiValue}>Rp {netCashflow.toLocaleString('id-ID')}</div>
              <div className={styles.kpiFooter}>
                {netCashflow >= 0
                  ? `Surplus ${isCurrentMonth ? 'bulan ini' : `di bulan ${selectedMonthName}`}`
                  : `Defisit ${isCurrentMonth ? 'bulan ini' : `di bulan ${selectedMonthName}`}`}
              </div>
            </div>
          </div>

          {/* Main Content Grid: Daily Expense & Active Installments */}
          <div className={styles.mainGrid}>
            {/* Daily Expenses Section (Pengeluaran Hari Ini) */}
            <div className={styles.cardSection}>
              <div className={styles.sectionHeader}>
                <div className={styles.sectionTitleGroup}>
                  <Calendar size={20} className={styles.accentIcon} />
                  <div>
                    <h3>Pengeluaran Hari Ini</h3>
                    <span className={styles.subTitle}>
                      {new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric' })}
                    </span>
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
