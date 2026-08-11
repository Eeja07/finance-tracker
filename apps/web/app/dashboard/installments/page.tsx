'use client';

import React, { useState, useEffect } from 'react';
import { CreditCard, Plus, CheckCircle, Calendar, Loader2, ChevronDown, ChevronUp, Clock, AlertCircle, Edit2, Trash2 } from 'lucide-react';
import { installmentsApi, accountsApi, Installment, InstallmentPayment, Account } from '@/lib/api';
import styles from './installments.module.css';

export default function InstallmentsPage() {
  const [installments, setInstallments] = useState<Installment[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);

  // Form states for creating / editing installment
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingInstallment, setEditingInstallment] = useState<Installment | null>(null);

  const [newTitle, setNewTitle] = useState('');
  const [newProvider, setNewProvider] = useState('');
  const [newTotalAmount, setNewTotalAmount] = useState('');
  const [newMonthlyAmount, setNewMonthlyAmount] = useState('');
  const [newTenor, setNewTenor] = useState('');
  const [newDueDateDay, setNewDueDateDay] = useState('10');
  
  // Start Month & Year selector (Format YYYY-MM)
  const nowStr = new Date().toISOString().slice(0, 7); // e.g. "2026-08"
  const [startMonthYear, setStartMonthYear] = useState(nowStr);
  const [selectedAccountId, setSelectedAccountId] = useState('');

  // Expanded Tenors state per installment ID
  const [expandedTenors, setExpandedTenors] = useState<Record<string, boolean>>({});

  // Pay Modal states
  const [payModalOpen, setPayModalOpen] = useState(false);
  const [payPaymentId, setPayPaymentId] = useState('');
  const [payAccountId, setPayAccountId] = useState('');
  const [payPaymentInfo, setPayPaymentInfo] = useState<{
    installmentTitle: string;
    tenorNumber: number;
    totalTenor: number;
    amount: number;
    monthYear: string;
  } | null>(null);
  const [paySubmitting, setPaySubmitting] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const parseRupiahInput = (value: string): number | null => {
    const digitsOnly = value.replace(/[^\d]/g, '');
    if (!digitsOnly) return null;
    const parsed = Number.parseInt(digitsOnly, 10);
    if (!Number.isFinite(parsed) || parsed <= 0) return null;
    return parsed;
  };

  const formatRupiahInput = (amount: number): string =>
    Math.round(amount).toLocaleString('id-ID', { maximumFractionDigits: 0 });

  const loadData = async () => {
    try {
      setLoading(true);
      const [instRes, accRes] = await Promise.all([
        installmentsApi.list(),
        accountsApi.list(),
      ]);
      setInstallments(instRes || []);
      setAccounts(accRes || []);
      if (accRes && accRes.length > 0 && accRes[0]) {
        setSelectedAccountId(accRes[0].id);
        setPayAccountId(accRes[0].id);
      }
    } catch (err) {
      console.error('Failed to load installment data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const activeInstallments = installments.filter((x) => x.status === 'ACTIVE');
  const totalMonthlyCommitment = activeInstallments.reduce((acc, x) => acc + x.monthlyAmount, 0);
  const currentDate = new Date();
  const currentMonth = currentDate.getMonth();
  const currentYear = currentDate.getFullYear();
  const getCurrentMonthPayment = (inst: Installment) =>
    inst.payments?.find((payment) => {
      const dueDate = new Date(payment.dueDate);
      return dueDate.getMonth() === currentMonth && dueDate.getFullYear() === currentYear;
    });
  const unpaidThisMonth = activeInstallments.filter((inst) => {
    const payment = getCurrentMonthPayment(inst);
    return payment && payment.status !== 'PAID';
  });
  const currentMonthLabel = currentDate.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });

  const openCreateModal = () => {
    setEditingInstallment(null);
    setNewTitle('');
    setNewProvider('');
    setNewTotalAmount('');
    setNewMonthlyAmount('');
    setNewTenor('');
    setNewDueDateDay('10');
    setStartMonthYear(nowStr);
    setError('');
    setIsModalOpen(true);
  };

  const openEditModal = (inst: Installment) => {
    setEditingInstallment(inst);
    setNewTitle(inst.title);
    setNewProvider(inst.provider);
    setNewTotalAmount(formatRupiahInput(inst.totalAmount));
    setNewMonthlyAmount(formatRupiahInput(inst.monthlyAmount));
    setNewTenor(String(inst.totalTenorMonths));
    setNewDueDateDay(String(inst.dueDateDay));
    const d = new Date(inst.startDate);
    const yrStr = d.getFullYear();
    const moStr = String(d.getMonth() + 1).padStart(2, '0');
    setStartMonthYear(`${yrStr}-${moStr}`);
    setSelectedAccountId(inst.account?.id || '');
    setError('');
    setIsModalOpen(true);
  };

  const handleDeleteInstallment = async (id: string) => {
    if (!confirm('Apakah kamu yakin ingin menghapus cicilan ini? Data tenor dan riwayat pembayaran cicilan ini akan dihapus.')) return;
    try {
      await installmentsApi.delete(id);
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Gagal menghapus cicilan');
    }
  };

  const openPayModalForPayment = (inst: Installment, p: InstallmentPayment) => {
    setPayPaymentId(p.id);
    const dateObj = new Date(p.dueDate);
    const monthYear = dateObj.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });

    setPayPaymentInfo({
      installmentTitle: inst.title,
      tenorNumber: p.tenorNumber,
      totalTenor: inst.totalTenorMonths,
      amount: p.amount,
      monthYear,
    });

    if (inst.account?.id) setPayAccountId(inst.account.id);
    else if (accounts.length > 0 && accounts[0]) setPayAccountId(accounts[0].id);

    setPayModalOpen(true);
  };

  const openPayModalDefault = (inst: Installment, paymentId?: string) => {
    const pendingPayment = paymentId
      ? inst.payments?.find((p) => p.id === paymentId && p.status !== 'PAID')
      : inst.payments?.find((p) => p.status !== 'PAID');
    if (!pendingPayment) {
      alert('Semua tagihan untuk cicilan ini sudah lunas.');
      return;
    }
    openPayModalForPayment(inst, pendingPayment);
  };

  const handlePayInstallment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payPaymentId || !payAccountId) return;
    setPaySubmitting(true);
    try {
      await installmentsApi.pay(payPaymentId, { accountId: payAccountId });
      alert('✅ Pembayaran cicilan berhasil dicatat! Saldo dompet telah dipotong dan pengeluaran dicatat.');
      setPayModalOpen(false);
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Gagal membayar cicilan');
    } finally {
      setPaySubmitting(false);
    }
  };

  const handleSaveInstallment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle || !newMonthlyAmount) {
      setError('Nama cicilan dan nominal cicilan per bulan wajib diisi.');
      return;
    }

    setError('');
    setSubmitting(true);

    const tenor = parseInt(newTenor) || 12;
    const monthly = parseRupiahInput(newMonthlyAmount);
    const totalInput = parseRupiahInput(newTotalAmount);
    const total = totalInput ?? ((monthly ?? 0) * tenor);
    const dueDay = parseInt(newDueDateDay) || 10;

    if (!monthly) {
      setError('Nominal cicilan per bulan harus angka Rupiah yang valid.');
      setSubmitting(false);
      return;
    }
    if (!Number.isInteger(tenor) || tenor < 1) {
      setError('Total tenor minimal 1 bulan.');
      setSubmitting(false);
      return;
    }
    if (!Number.isInteger(dueDay) || dueDay < 1 || dueDay > 31) {
      setError('Tanggal jatuh tempo harus di antara 1 sampai 31.');
      setSubmitting(false);
      return;
    }

    // Construct start date based on startMonthYear input
    let startDateObj = new Date();
    if (startMonthYear) {
      const parts = startMonthYear.split('-');
      const yr = parseInt(parts[0] || '', 10) || new Date().getFullYear();
      const mo = parseInt(parts[1] || '', 10) || (new Date().getMonth() + 1);
      startDateObj = new Date(yr, mo - 1, dueDay, 12, 0, 0);
    }

    try {
      if (editingInstallment) {
        await installmentsApi.update(editingInstallment.id, {
          title: newTitle,
          provider: newProvider || 'Bank / Provider',
          totalAmount: total,
          monthlyAmount: monthly,
          totalTenorMonths: tenor,
          startDate: startDateObj.toISOString(),
          dueDateDay: dueDay,
          accountId: selectedAccountId || undefined,
        });
      } else {
        await installmentsApi.create({
          title: newTitle,
          provider: newProvider || 'Bank / Provider',
          totalAmount: total,
          monthlyAmount: monthly,
          totalTenorMonths: tenor,
          startDate: startDateObj.toISOString(),
          dueDateDay: dueDay,
          accountId: selectedAccountId || undefined,
        });
      }

      setIsModalOpen(false);
      await loadData();
    } catch (err: any) {
      setError(err.message || 'Gagal menyimpan cicilan');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={styles.container}>
      {/* Top Banner */}
      <div className={styles.headerBanner}>
        <div>
          <h2>Cicilan Yang Dijalani</h2>
          <p>Pantau sisa tenor bulanan, jadwal yang sudah & belum dibayar, serta pengingat otomatis via WhatsApp Bot.</p>
        </div>
        <button onClick={openCreateModal} className={styles.addBtn}>
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
      </div>

      <section className={styles.monthlyDueSection}>
        <div className={styles.monthlyDueHeader}>
          <div>
            <span className={styles.summaryLabel}>Perlu Perhatian</span>
            <h3>Cicilan yang Belum Dibayar Bulan Ini</h3>
          </div>
          <span className={styles.monthlyDueCount}>{unpaidThisMonth.length} cicilan</span>
        </div>
        {unpaidThisMonth.length === 0 ? (
          <div className={styles.monthlyAllPaid}>
            <CheckCircle size={18} /> Semua cicilan bulan {currentMonthLabel} sudah lunas.
          </div>
        ) : (
          <div className={styles.monthlyDueList}>
            {unpaidThisMonth.map((inst) => {
              const payment = getCurrentMonthPayment(inst);
              return (
                <div className={styles.monthlyDueItem} key={inst.id}>
                  <div>
                    <strong>{inst.title}</strong>
                    <span>
                      {payment
                        ? `Jatuh tempo ${new Date(payment.dueDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}`
                        : `Jatuh tempo setiap tanggal ${inst.dueDateDay}`}
                    </span>
                  </div>
                  <span className={styles.monthlyDueAmount}>Rp {inst.monthlyAmount.toLocaleString('id-ID')}</span>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem 0' }}>
          <Loader2 size={24} style={{ animation: 'spin 0.8s linear infinite', color: 'var(--primary)' }} />
        </div>
      ) : installments.length === 0 ? (
        <div style={{ padding: '3rem 1rem', textAlign: 'center', color: 'var(--text-muted)' }}>
          Belum ada cicilan aktif. Klik <strong>"Tambah Cicilan"</strong> untuk mendaftarkan barang atau pinjaman kamu.
        </div>
      ) : (
        /* Installments List Grid */
        <div className={styles.grid}>
          {installments.map((inst) => {
            const paidTenor = inst.payments
              ? inst.payments.filter((p) => p.status === 'PAID').length
              : inst.totalTenorMonths - inst.remainingTenorMonths;
            const completedTenor = Math.min(paidTenor, inst.totalTenorMonths);
            const remainingTenor = Math.max(inst.totalTenorMonths - completedTenor, 0);
            const progressPct = Math.round((completedTenor / inst.totalTenorMonths) * 100);
            const isExpanded = !!expandedTenors[inst.id];
            const currentMonthPayment = getCurrentMonthPayment(inst);
            const currentMonthPaid = currentMonthPayment?.status === 'PAID';

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
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    {inst.status === 'ACTIVE' ? (
                      <span className={styles.activeTag}>
                        <Calendar size={12} />
                        Tgl {inst.dueDateDay}
                      </span>
                    ) : (
                      <span className={styles.completedTag}>
                        <CheckCircle size={12} />
                        Lunas
                      </span>
                    )}
                    <button
                      onClick={() => openEditModal(inst)}
                      style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: 4 }}
                      title="Edit Cicilan"
                    >
                      <Edit2 size={16} />
                    </button>
                    <button
                      onClick={() => handleDeleteInstallment(inst.id)}
                      style={{ background: 'transparent', border: 'none', color: '#EF4444', cursor: 'pointer', padding: 4 }}
                      title="Hapus Cicilan"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
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
                        Sisa <strong>{inst.remainingTenorMonths} Bulan</strong> (Terbayar {completedTenor}/{inst.totalTenorMonths})
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

                  <div className={`${styles.currentMonthStatus} ${currentMonthPaid ? styles.currentMonthPaid : styles.currentMonthPending}`}>
                    {currentMonthPaid ? <CheckCircle size={15} /> : <Clock size={15} />}
                    <span>
                      {currentMonthPaid
                        ? `Bulan ${currentMonthLabel} sudah lunas`
                        : currentMonthPayment
                        ? `Bulan ${currentMonthLabel} belum dibayar`
                        : 'Tidak ada tagihan pada bulan ini'}
                    </span>
                  </div>

                  {/* Tenor Monthly Schedule Breakdown */}
                  {isExpanded && (
                    <div className={styles.tenorSchedule}>
                      <div className={styles.tenorScheduleHeader}>
                        <span>Jadwal Masa Tenor ({inst.totalTenorMonths} Bulan)</span>
                        <span>{completedTenor} Lunas • {remainingTenor} Belum</span>
                      </div>
                      <div className={styles.tenorList}>
                        {inst.payments?.map((p) => {
                          const dueDateObj = new Date(p.dueDate);
                          const monthYearStr = dueDateObj.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
                          const isOverdue = dueDateObj < new Date() && p.status === 'PENDING';

                          return (
                            <div
                              key={p.id}
                              className={`${styles.tenorItem} ${
                                p.status === 'PAID'
                                  ? styles.tenorItemPaid
                                  : isOverdue
                                  ? styles.tenorItemOverdue
                                  : styles.tenorItemPending
                              }`}
                            >
                              <div className={styles.tenorInfo}>
                                <span className={styles.tenorMonth}>
                                  Tenor {p.tenorNumber}: {monthYearStr}
                                </span>
                                <span className={styles.tenorMeta}>
                                  Jatuh Tempo: {dueDateObj.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                                  {p.paidDate && ` • Dibayar: ${new Date(p.paidDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}`}
                                </span>
                              </div>
                              <div className={styles.tenorRight}>
                                {p.status === 'PAID' ? (
                                  <span className={styles.badgePaid}>
                                    <CheckCircle size={12} /> Lunas
                                  </span>
                                ) : isOverdue ? (
                                  <span className={styles.badgeOverdue}>
                                    <AlertCircle size={12} /> Terlambat
                                  </span>
                                ) : (
                                  <span className={styles.badgePending}>
                                    <Clock size={12} /> Belum Dibayar
                                  </span>
                                )}

                                {p.status !== 'PAID' && (
                                  <button
                                    onClick={() => openPayModalForPayment(inst, p)}
                                    className={styles.payMiniBtn}
                                  >
                                    Bayar
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>

                <div className={styles.cardFooter}>
                  <button
                    type="button"
                    onClick={() =>
                      setExpandedTenors((prev) => ({
                        ...prev,
                        [inst.id]: !prev[inst.id],
                      }))
                    }
                    className={styles.toggleTenorBtn}
                  >
                    {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    <span>{isExpanded ? 'Tutup Rincian' : `Rincian Tenor (${inst.totalTenorMonths} Bln)`}</span>
                  </button>

                  {inst.status === 'ACTIVE' && (
                    <button
                      onClick={() => openPayModalDefault(inst, currentMonthPaid ? undefined : currentMonthPayment?.id)}
                      className={styles.payBtn}
                    >
                      {currentMonthPaid ? <Calendar size={16} /> : <CheckCircle size={16} />}
                      <span>{currentMonthPaid ? 'Bayar Bulan Lainnya' : 'Bayar Bulan Ini'}</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pay Modal */}
      {payModalOpen && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <h3>Bayar Tagihan Cicilan</h3>

            {payPaymentInfo && (
              <div className={styles.payTargetInfo}>
                <div><strong>{payPaymentInfo.installmentTitle}</strong></div>
                <div>Tagihan Tenor Ke-{payPaymentInfo.tenorNumber} dari {payPaymentInfo.totalTenor} ({payPaymentInfo.monthYear})</div>
                <div style={{ color: 'var(--accent)', fontWeight: 600, marginTop: 4 }}>
                  Jumlah: Rp {payPaymentInfo.amount.toLocaleString('id-ID')}
                </div>
              </div>
            )}

            <form onSubmit={handlePayInstallment} className={styles.form}>
              <div className={styles.formGroup}>
                <label>Pilih Dompet / Akun Pembayaran</label>
                <select
                  value={payAccountId}
                  onChange={(e) => setPayAccountId(e.target.value)}
                  required
                >
                  {accounts.length === 0 ? (
                    <option value="">Buat dompet terlebih dahulu</option>
                  ) : (
                    accounts.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name} (Saldo: Rp {a.balance.toLocaleString('id-ID')})
                      </option>
                    ))
                  )}
                </select>
              </div>

              <div className={styles.modalActions}>
                <button
                  type="button"
                  onClick={() => setPayModalOpen(false)}
                  className={styles.cancelBtn}
                >
                  Batal
                </button>
                <button type="submit" className={styles.submitBtn} disabled={paySubmitting}>
                  {paySubmitting ? <Loader2 size={16} style={{ animation: 'spin 0.8s linear infinite' }} /> : 'Konfirmasi Pembayaran'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add / Edit Modal */}
      {isModalOpen && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <h3>{editingInstallment ? 'Edit Cicilan' : 'Tambah Cicilan Baru'}</h3>
            <form onSubmit={handleSaveInstallment} className={styles.form}>
              {error && <div style={{ color: '#EF4444', fontSize: '0.85rem', marginBottom: '0.5rem' }}>{error}</div>}

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
                  <label>Mulai dari Bulan & Tahun</label>
                  <input
                    type="month"
                    value={startMonthYear}
                    onChange={(e) => setStartMonthYear(e.target.value)}
                    required
                  />
                </div>
                <div className={styles.formGroup}>
                  <label>Tanggal Jatuh Tempo (1-31)</label>
                  <input
                    type="number"
                    min="1"
                    max="31"
                    placeholder="10"
                    value={newDueDateDay}
                    onChange={(e) => setNewDueDateDay(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className={styles.formGrid}>
                <div className={styles.formGroup}>
                  <label>Cicilan per Bulan (Rp)</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    placeholder="1.500.000"
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

              <div className={styles.formGroup}>
                <label>Total Harga / Pinjaman (Rp)</label>
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="18.000.000"
                  value={newTotalAmount}
                  onChange={(e) => setNewTotalAmount(e.target.value)}
                />
              </div>

              <div className={styles.formGroup}>
                <label>Dompet Pemotong Otomatis (Opsional)</label>
                <select
                  value={selectedAccountId}
                  onChange={(e) => setSelectedAccountId(e.target.value)}
                >
                  <option value="">-- Tanpa dompet default --</option>
                  {accounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className={styles.modalActions}>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className={styles.cancelBtn}
                >
                  Batal
                </button>
                <button type="submit" className={styles.submitBtn} disabled={submitting}>
                  {submitting ? <Loader2 size={16} style={{ animation: 'spin 0.8s linear infinite' }} /> : (editingInstallment ? 'Simpan Perubahan' : 'Simpan Cicilan')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
