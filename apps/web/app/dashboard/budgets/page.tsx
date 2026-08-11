'use client';

import React, { useState, useEffect } from 'react';
import {
  Plus,
  Loader2,
  Trash2,
  Pencil,
  AlertTriangle,
  CheckCircle2,
} from 'lucide-react';
import { budgetsApi, categoriesApi, Budget, Category } from '@/lib/api';
import styles from './budgets.module.css';

export default function BudgetsPage() {
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBudget, setEditingBudget] = useState<Budget | null>(null);
  const [selectedCategoryId, setSelectedCategoryId] = useState('');
  const [amountLimit, setAmountLimit] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const loadData = async () => {
    try {
      setLoading(true);
      const [budRes, catRes] = await Promise.all([
        budgetsApi.list(),
        categoriesApi.list('EXPENSE'),
      ]);
      setBudgets(budRes || []);
      setCategories(catRes || []);
      if (catRes && catRes.length > 0 && catRes[0]) {
        setSelectedCategoryId(catRes[0].id);
      }
    } catch (err) {
      console.error('Failed to load budget data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleOpenAddModal = () => {
    setEditingBudget(null);
    setAmountLimit('');
    if (categories.length > 0 && categories[0]) {
      setSelectedCategoryId(categories[0].id);
    }
    setError('');
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (b: Budget) => {
    setEditingBudget(b);
    setSelectedCategoryId(b.categoryId);
    setAmountLimit(String(b.amountLimit));
    setError('');
    setIsModalOpen(true);
  };

  const handleUpsertBudget = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCategoryId || !amountLimit) return;

    setError('');
    setSubmitting(true);

    try {
      await budgetsApi.upsert({
        categoryId: selectedCategoryId,
        amountLimit: parseFloat(amountLimit),
      });

      setIsModalOpen(false);
      setAmountLimit('');
      setEditingBudget(null);
      await loadData();
    } catch (err: any) {
      setError(err.message || 'Gagal menyimpan batas anggaran');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteBudget = async (id: string) => {
    if (!confirm('Apakah Anda yakin ingin menghapus batasan anggaran untuk kategori ini?')) return;
    try {
      await budgetsApi.delete(id);
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Gagal menghapus anggaran');
    }
  };

  const totalLimit = budgets.reduce((acc, b) => acc + (b.amountLimit || 0), 0);
  const totalSpent = budgets.reduce((acc, b) => acc + (b.spent || 0), 0);
  const totalRemaining = totalLimit - totalSpent;
  const exceededCount = budgets.filter((b) => b.isExceeded).length;
  const overallPct = totalLimit > 0 ? Math.round((totalSpent / totalLimit) * 100) : 0;

  return (
    <div className={styles.container}>
      {/* Header Banner - Clean Typography, No Icons */}
      <div className={styles.headerBanner}>
        <div>
          <h2>Alokasi Anggaran Bulanan</h2>
          <p>Kelola batasan pengeluaran per kategori secara terencana untuk menjaga stabilitas finansial Anda.</p>
        </div>
        <button onClick={handleOpenAddModal} className={styles.addBtn}>
          <Plus size={16} />
          <span>Tambah Anggaran</span>
        </button>
      </div>

      {/* Clean KPI Cards - No Icons */}
      <div className={styles.kpiGrid}>
        <div className={styles.kpiCard}>
          <div>
            <span className={styles.kpiLabel}>Total Plafon Anggaran</span>
            <div className={styles.kpiValue}>Rp {totalLimit.toLocaleString('id-ID')}</div>
            <span className={styles.kpiSub}>Terdistribusi ke {budgets.length} Kategori</span>
          </div>
        </div>

        <div className={styles.kpiCard}>
          <div>
            <span className={styles.kpiLabel}>Realisasi Pengeluaran</span>
            <div className={`${styles.kpiValue} ${totalSpent > totalLimit && totalLimit > 0 ? styles.exceededText : ''}`}>
              Rp {totalSpent.toLocaleString('id-ID')}
            </div>
            <span className={styles.kpiSub}>{overallPct}% dari total alokasi bulanan</span>
          </div>
        </div>

        <div className={styles.kpiCard}>
          <div>
            <span className={styles.kpiLabel}>Sisa Alokasi Tersedia</span>
            <div className={`${styles.kpiValue} ${totalRemaining < 0 ? styles.exceededText : styles.safeText}`}>
              Rp {Math.max(0, totalRemaining).toLocaleString('id-ID')}
            </div>
            <span className={styles.kpiSub}>
              {totalRemaining < 0 ? 'Melampaui alokasi' : 'Batas kuota aman'}
            </span>
          </div>
        </div>

        <div className={styles.kpiCard}>
          <div>
            <span className={styles.kpiLabel}>Status Kategori</span>
            <div className={`${styles.kpiValue} ${exceededCount > 0 ? styles.exceededText : styles.safeText}`} style={{ fontSize: '1.05rem' }}>
              {exceededCount > 0 ? `${exceededCount} Over Limit` : 'Seluruh Kategori Terkendali'}
            </div>
            <span className={styles.kpiSub}>
              {budgets.length === 0
                ? 'Belum ada alokasi aktif'
                : `${budgets.length - exceededCount} dari ${budgets.length} kategori dalam batas aman`}
            </span>
          </div>
        </div>
      </div>

      {loading ? (
        <div className={styles.loadingBox}>
          <Loader2 size={24} className={styles.spinningIcon} />
          <p>Memuat alokasi anggaran bulanan...</p>
        </div>
      ) : budgets.length === 0 ? (
        <div className={styles.emptyState}>
          <h3>Belum Ada Alokasi Anggaran</h3>
          <p>Tetapkan batas pengeluaran bulanan untuk setiap kategori agar arus kas Anda tetap terarah dengan baik.</p>
          <button onClick={handleOpenAddModal} className={styles.emptyAddBtn}>
            <Plus size={16} />
            <span>Atur Alokasi Pertama</span>
          </button>
        </div>
      ) : (
        <div className={styles.grid}>
          {budgets.map((b) => {
            const pct = b.percentage || 0;
            const isExceeded = b.isExceeded;
            const categoryName = b.category?.name || 'Kategori';

            let statusClass = styles.progressFillSafe;
            if (pct >= 100 || isExceeded) statusClass = styles.progressFillDanger;
            else if (pct >= 75) statusClass = styles.progressFillWarning;

            return (
              <div key={b.id} className={`${styles.card} ${isExceeded ? styles.cardExceeded : ''}`}>
                <div className={styles.cardHeader}>
                  <div>
                    <h3 className={styles.categoryTitle}>{categoryName}</h3>
                    <span className={styles.monthBadge}>Periode Bulan Ini</span>
                  </div>

                  <div className={styles.cardActions}>
                    {isExceeded ? (
                      <span className={styles.exceededTag}>
                        <AlertTriangle size={12} /> Melebihi Limit
                      </span>
                    ) : (
                      <span className={styles.normalTag}>
                        <CheckCircle2 size={12} /> Batas Aman
                      </span>
                    )}

                    <button
                      onClick={() => handleOpenEditModal(b)}
                      className={styles.actionBtn}
                      title="Edit Alokasi Anggaran"
                    >
                      <Pencil size={15} />
                    </button>
                    <button
                      onClick={() => handleDeleteBudget(b.id)}
                      className={`${styles.actionBtn} ${styles.deleteActionBtn}`}
                      title="Hapus Anggaran"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>

                <div className={styles.cardBody}>
                  <div className={styles.amountRow}>
                    <div>
                      <span className={styles.label}>Realisasi Saat Ini</span>
                      <div className={`${styles.value} ${isExceeded ? styles.exceededText : ''}`}>
                        Rp {b.spent.toLocaleString('id-ID')}
                      </div>
                    </div>
                    <div className={styles.rightAlign}>
                      <span className={styles.label}>Batas Plafon</span>
                      <div className={styles.limitValue}>
                        Rp {b.amountLimit.toLocaleString('id-ID')}
                      </div>
                    </div>
                  </div>

                  <div className={styles.progressBg}>
                    <div
                      className={`${styles.progressFill} ${statusClass}`}
                      style={{ width: `${Math.min(100, pct)}%` }}
                    />
                  </div>

                  <div className={styles.metaRow}>
                    <span className={styles.pctText}>{pct}% terpakai</span>
                    <span className={isExceeded ? styles.exceededSubtext : styles.remainingText}>
                      {isExceeded
                        ? `Melampaui Rp ${Math.abs(b.remaining).toLocaleString('id-ID')}`
                        : `Sisa Kuota: Rp ${b.remaining.toLocaleString('id-ID')}`}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Upsert Modal */}
      {isModalOpen && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <div className={styles.modalHeader}>
              <h3>{editingBudget ? 'Edit Alokasi Anggaran' : 'Atur Alokasi Anggaran Baru'}</h3>
            </div>

            <form onSubmit={handleUpsertBudget} className={styles.form}>
              {error && <div className={styles.errorAlert}>{error}</div>}

              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Pilih Kategori Pengeluaran</label>
                <select
                  value={selectedCategoryId}
                  onChange={(e) => setSelectedCategoryId(e.target.value)}
                  disabled={!!editingBudget}
                  className={styles.selectInput}
                  required
                >
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Batas Nominal Anggaran Bulanan (Rp)</label>
                <div className={styles.currencyInputWrapper}>
                  <span className={styles.currencyPrefix}>Rp</span>
                  <input
                    type="number"
                    placeholder="2500000"
                    value={amountLimit}
                    onChange={(e) => setAmountLimit(e.target.value)}
                    className={styles.currencyInput}
                    required
                  />
                </div>
              </div>

              <div className={styles.modalActions}>
                <button type="button" onClick={() => setIsModalOpen(false)} className={styles.cancelBtn}>
                  Batal
                </button>
                <button type="submit" className={styles.submitBtn} disabled={submitting}>
                  {submitting ? <Loader2 size={16} className={styles.spinningIcon} /> : 'Simpan Anggaran'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
