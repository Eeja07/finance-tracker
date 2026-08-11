'use client';

import React, { useState, useEffect } from 'react';
import {
  Plus,
  Search,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  ArrowUpRight,
  ArrowDownLeft,
  Trash2,
  Edit2,
  Loader2,
  Package,
  ChevronDown,
  ChevronUp,
  X,
  Receipt,
  Calendar,
  Camera,
  FileText,
  Image as ImageIcon,
} from 'lucide-react';
import { transactionsApi, accountsApi, categoriesApi, Transaction, Account, Category } from '@/lib/api';
import styles from './transactions.module.css';

interface TransactionItemInput {
  name: string;
  qty: number;
  price: number;
}

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('ALL');
  const [sortColumn, setSortColumn] = useState<'description' | 'category' | 'account' | 'date' | 'amount'>('date');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [expandedTxId, setExpandedTxId] = useState<string | null>(null);

  // Helper date function (YYYY-MM-DD)
  const getTodayString = () => new Date().toISOString().split('T')[0]!;

  // Form states
  const [txDate, setTxDate] = useState<string>(getTodayString());
  const [newDesc, setNewDesc] = useState('');
  const [newAmount, setNewAmount] = useState('');
  const [newType, setNewType] = useState<'EXPENSE' | 'INCOME'>('EXPENSE');
  const [selectedCategoryId, setSelectedCategoryId] = useState('');
  const [selectedAccountId, setSelectedAccountId] = useState('');
  const [recipientOrPayer, setRecipientOrPayer] = useState('');

  // Optional photo attachments
  const [receiptImage, setReceiptImage] = useState<string | null>(null);
  const [itemImage, setItemImage] = useState<string | null>(null);
  const [viewingImage, setViewingImage] = useState<{ url: string; title: string } | null>(null);

  // Multi-item transaction feature
  const [isMultiItem, setIsMultiItem] = useState(false);
  const [itemList, setItemList] = useState<TransactionItemInput[]>([
    { name: '', qty: 1, price: 0 },
  ]);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const loadAllData = async () => {
    try {
      setLoading(true);
      const [txRes, accRes, catRes] = await Promise.all([
        transactionsApi.list({ limit: 100 }),
        accountsApi.list(),
        categoriesApi.list(),
      ]);

      setTransactions(txRes.items || []);
      setAccounts(accRes || []);
      setCategories(catRes || []);

      if (catRes && catRes.length > 0) {
        const firstMatchingCat = catRes.find((c) => c.type === newType) || catRes[0];
        if (firstMatchingCat) setSelectedCategoryId(firstMatchingCat.id);
      }
      if (accRes && accRes.length > 0 && accRes[0]) {
        setSelectedAccountId(accRes[0].id);
      }
    } catch (err) {
      console.error('Failed to load transaction data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllData();
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const typeParam = new URLSearchParams(window.location.search).get('type');
    if (typeParam === 'EXPENSE' || typeParam === 'INCOME') {
      setFilterType(typeParam);
    }
  }, []);

  useEffect(() => {
    if (categories.length > 0 && !editingTransaction) {
      const match = categories.find((c) => c.type === newType);
      if (match) setSelectedCategoryId(match.id);
    }
  }, [newType, categories, editingTransaction]);

  // Recalculate amount if multi-item is active
  useEffect(() => {
    if (isMultiItem) {
      const total = itemList.reduce((acc, item) => acc + (item.qty || 0) * (item.price || 0), 0);
      setNewAmount(total > 0 ? String(total) : '');
    }
  }, [itemList, isMultiItem]);

  const recalculateMultiTotal = (items: TransactionItemInput[]) => {
    const total = items.reduce((acc, it) => acc + ((Number(it.qty) || 1) * (Number(it.price) || 0)), 0);
    setNewAmount(total > 0 ? String(total) : '');
  };

  const handleAddItemRow = () => {
    setItemList((prev) => {
      const updated = [...prev, { name: '', qty: 1, price: 0 }];
      if (isMultiItem) recalculateMultiTotal(updated);
      return updated;
    });
  };

  const handleRemoveItemRow = (index: number) => {
    if (itemList.length <= 1) return;
    setItemList((prev) => {
      const updated = prev.filter((_, i) => i !== index);
      if (isMultiItem) recalculateMultiTotal(updated);
      return updated;
    });
  };

  const handleItemChange = (index: number, field: keyof TransactionItemInput, value: string | number) => {
    setItemList((prev) => {
      const updated = [...prev];
      const item = updated[index];
      if (!item) return prev;
      const current: TransactionItemInput = {
        name: field === 'name' ? String(value) : item.name,
        qty: field === 'qty' ? Math.max(1, parseInt(String(value)) || 1) : item.qty,
        price: field === 'price' ? Math.max(0, parseFloat(String(value)) || 0) : item.price,
      };
      updated[index] = current;
      if (isMultiItem) recalculateMultiTotal(updated);
      return updated;
    });
  };

  // Image upload helper (resizes to compact base64)
  const handleImageSelect = (file: File, callback: (base64: string) => void) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        const maxDim = 900;
        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        callback(canvas.toDataURL('image/jpeg', 0.85));
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const filtered = transactions.filter((t) => {
    const matchesSearch =
      t.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (t.recipientOrPayer && t.recipientOrPayer.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (t.notes && t.notes.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesType = filterType === 'ALL' || t.type === filterType;
    return matchesSearch && matchesType;
  });

  const sortedFiltered = [...filtered].sort((a, b) => {
    switch (sortColumn) {
      case 'description':
        return sortDirection === 'asc'
          ? a.description.localeCompare(b.description, 'id')
          : b.description.localeCompare(a.description, 'id');
      case 'category':
        return sortDirection === 'asc'
          ? (a.category?.name || '').localeCompare(b.category?.name || '', 'id')
          : (b.category?.name || '').localeCompare(a.category?.name || '', 'id');
      case 'account':
        return sortDirection === 'asc'
          ? (a.account?.name || '').localeCompare(b.account?.name || '', 'id')
          : (b.account?.name || '').localeCompare(a.account?.name || '', 'id');
      case 'amount':
        return sortDirection === 'asc' ? a.amount - b.amount : b.amount - a.amount;
      case 'date':
      default: {
        const timeA = new Date(a.date).getTime();
        const timeB = new Date(b.date).getTime();
        return sortDirection === 'asc' ? timeA - timeB : timeB - timeA;
      }
    }
  });

  const handleSort = (column: 'description' | 'category' | 'account' | 'date' | 'amount') => {
    if (sortColumn === column) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
      return;
    }
    setSortColumn(column);
    setSortDirection(column === 'date' || column === 'amount' ? 'desc' : 'asc');
  };

  const renderSortIcon = (column: 'description' | 'category' | 'account' | 'date' | 'amount') => {
    if (sortColumn !== column) return <ArrowUpDown size={13} />;
    return sortDirection === 'asc' ? <ArrowUp size={13} /> : <ArrowDown size={13} />;
  };

  const resetFormState = () => {
    setEditingTransaction(null);
    setTxDate(getTodayString());
    setNewDesc('');
    setNewAmount('');
    setRecipientOrPayer('');
    setReceiptImage(null);
    setItemImage(null);
    setIsMultiItem(false);
    setItemList([{ name: '', qty: 1, price: 0 }]);
  };

  const openCreateModal = () => {
    setError('');
    resetFormState();
    setIsModalOpen(true);
  };

  const openEditModal = (t: Transaction) => {
    setError('');
    setEditingTransaction(t);
    setNewType(t.type as 'EXPENSE' | 'INCOME');
    const dateFormatted = new Date(t.date).toISOString().split('T')[0]!;
    setTxDate(dateFormatted);
    setNewDesc(t.description);
    setNewAmount(String(t.amount));
    setSelectedCategoryId(t.categoryId);
    setSelectedAccountId(t.accountId);
    setRecipientOrPayer(t.recipientOrPayer || '');
    setReceiptImage(t.receiptUrl || null);
    setItemImage(t.itemImageUrl || null);
    setIsMultiItem(false);
    setItemList([{ name: '', qty: 1, price: 0 }]);
    setIsModalOpen(true);
  };

  const handleSaveTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDesc || !newAmount) return;
    if (!selectedAccountId) {
      setError('Silakan pilih dompet / akun terlebih dahulu.');
      return;
    }
    if (!selectedCategoryId) {
      setError('Silakan pilih kategori transaksi.');
      return;
    }

    let notesFormatted = undefined;
    if (isMultiItem) {
      const validItems = itemList.filter((i) => i.name.trim().length > 0 && i.price > 0);
      if (validItems.length === 0) {
        setError('Mohon isi minimal 1 rincian nama barang & harga.');
        return;
      }
      notesFormatted = `📦 Rincian Barang (${validItems.length} items):\n` +
        validItems.map((item, idx) => `${idx + 1}. ${item.name} (x${item.qty}) @ Rp ${item.price.toLocaleString('id-ID')} = Rp ${(item.qty * item.price).toLocaleString('id-ID')}`).join('\n');
    }

    setError('');
    setSubmitting(true);

    try {
      if (editingTransaction) {
        await transactionsApi.update(editingTransaction.id, {
          accountId: selectedAccountId,
          categoryId: selectedCategoryId,
          type: newType,
          amount: parseFloat(newAmount),
          description: isMultiItem ? `${newDesc} (${itemList.length} barang)` : newDesc,
          recipientOrPayer: recipientOrPayer || undefined,
          notes: notesFormatted !== undefined ? notesFormatted : editingTransaction.notes,
          date: txDate,
          receiptUrl: receiptImage || undefined,
          itemImageUrl: newType === 'EXPENSE' ? (itemImage || undefined) : undefined,
        });
      } else {
        await transactionsApi.create({
          accountId: selectedAccountId,
          categoryId: selectedCategoryId,
          type: newType,
          amount: parseFloat(newAmount),
          description: isMultiItem ? `${newDesc} (${itemList.length} barang)` : newDesc,
          recipientOrPayer: recipientOrPayer || undefined,
          notes: notesFormatted,
          date: txDate,
          receiptUrl: receiptImage || undefined,
          itemImageUrl: newType === 'EXPENSE' ? (itemImage || undefined) : undefined,
        });
      }

      setIsModalOpen(false);
      resetFormState();
      await loadAllData();
    } catch (err: any) {
      setError(err.message || 'Gagal menyimpan transaksi');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Apakah kamu yakin ingin menghapus transaksi ini? Saldo dompet akan disesuaikan secara otomatis.')) return;
    try {
      await transactionsApi.delete(id);
      await loadAllData();
    } catch (err: any) {
      alert(err.message || 'Gagal menghapus transaksi');
    }
  };

  const availableCategories = categories.filter((c) => c.type === newType);

  return (
    <div className={styles.container}>
      {/* Header Banner */}
      <div className={styles.headerBanner}>
        <div>
          <h2>Daftar Transaksi</h2>
          <p>Catat, kelola rincian multi-barang, lampiran foto nota &amp; barang, serta atur seluruh cashflow kamu secara terorganisir.</p>
        </div>
        <button onClick={openCreateModal} className={styles.addBtn}>
          <Plus size={18} />
          <span>Tambah Transaksi</span>
        </button>
      </div>

      {/* Filter & Search Bar */}
      <div className={styles.filterBar} id="transactions-filters">
        <div className={styles.searchBox}>
          <Search size={18} />
          <input
            type="text"
            placeholder="Cari transaksi / rincian barang..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className={styles.filterGroup}>
          <button
            onClick={() => setFilterType('ALL')}
            className={`${styles.filterBtn} ${filterType === 'ALL' ? styles.activeFilter : ''}`}
          >
            Semua
          </button>
          <button
            onClick={() => setFilterType('EXPENSE')}
            className={`${styles.filterBtn} ${filterType === 'EXPENSE' ? styles.activeFilter : ''}`}
          >
            Pengeluaran
          </button>
          <button
            onClick={() => setFilterType('INCOME')}
            className={`${styles.filterBtn} ${filterType === 'INCOME' ? styles.activeFilter : ''}`}
          >
            Pemasukan
          </button>
        </div>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem 0' }}>
          <Loader2 size={24} style={{ animation: 'spin 0.8s linear infinite', color: 'var(--primary)' }} />
        </div>
      ) : (
        <>
          {/* Desktop & Tablet Table View */}
          <div className={styles.tableCard}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>
                    <button type="button" className={styles.sortHeaderBtn} onClick={() => handleSort('description')}>
                      <span>Deskripsi &amp; Rincian</span>
                      {renderSortIcon('description')}
                    </button>
                  </th>
                  <th>
                    <button type="button" className={styles.sortHeaderBtn} onClick={() => handleSort('category')}>
                      <span>Kategori</span>
                      {renderSortIcon('category')}
                    </button>
                  </th>
                  <th>
                    <button type="button" className={styles.sortHeaderBtn} onClick={() => handleSort('account')}>
                      <span>Dompet</span>
                      {renderSortIcon('account')}
                    </button>
                  </th>
                  <th>
                    <button type="button" className={styles.sortHeaderBtn} onClick={() => handleSort('date')}>
                      <span>Tanggal</span>
                      {renderSortIcon('date')}
                    </button>
                  </th>
                  <th>
                    <button type="button" className={styles.sortHeaderBtn} onClick={() => handleSort('amount')}>
                      <span>Jumlah</span>
                      {renderSortIcon('amount')}
                    </button>
                  </th>
                  <th>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {sortedFiltered.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ padding: '3rem 1rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                      Belum ada data transaksi. Klik "Tambah Transaksi" untuk mencatat pengeluaran/pemasukan.
                    </td>
                  </tr>
                ) : (
                  sortedFiltered.map((t) => {
                    const formattedDate = new Date(t.date).toLocaleDateString('id-ID', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    });
                    const isExpanded = expandedTxId === t.id;
                    const hasNotes = !!t.notes;

                    return (
                      <React.Fragment key={t.id}>
                        <tr>
                          <td>
                            <div className={styles.txDescGroup}>
                              <div className={t.type === 'INCOME' ? styles.incomeBadge : styles.expenseBadge}>
                                {t.type === 'INCOME' ? <ArrowDownLeft size={16} /> : <ArrowUpRight size={16} />}
                              </div>
                              <div>
                                <span className={styles.txDesc}>{t.description}</span>
                                {t.recipientOrPayer && (
                                  <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                    Penerima/Pemberi: {t.recipientOrPayer}
                                  </span>
                                )}
                                
                                {/* Photo preview badges */}
                                {(t.receiptUrl || t.itemImageUrl) && (
                                  <div className={styles.photoBadgeGroup}>
                                    {t.receiptUrl && (
                                      <button
                                        type="button"
                                        onClick={() => setViewingImage({ url: t.receiptUrl!, title: `${t.type === 'INCOME' ? 'Bukti Transfer' : 'Foto Nota'} - ${t.description}` })}
                                        className={styles.photoBadge}
                                      >
                                        <FileText size={12} />
                                        <span>{t.type === 'INCOME' ? 'Bukti Transfer' : 'Foto Nota'}</span>
                                      </button>
                                    )}
                                    {t.itemImageUrl && (
                                      <button
                                        type="button"
                                        onClick={() => setViewingImage({ url: t.itemImageUrl!, title: `Foto Barang - ${t.description}` })}
                                        className={styles.photoBadge}
                                      >
                                        <ImageIcon size={12} />
                                        <span>Foto Barang</span>
                                      </button>
                                    )}
                                  </div>
                                )}

                                {hasNotes && (
                                  <button
                                    onClick={() => setExpandedTxId(isExpanded ? null : t.id)}
                                    className={styles.multiItemToggleBtn}
                                    style={{ marginTop: '4px' }}
                                  >
                                    <Package size={13} />
                                    <span>Rincian Barang</span>
                                    {isExpanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                                  </button>
                                )}
                              </div>
                            </div>
                          </td>
                          <td><span className={styles.categoryChip}>{t.category?.name || 'Kategori'}</span></td>
                          <td><span className={styles.accountChip}>{t.account?.name || 'Dompet'}</span></td>
                          <td>{formattedDate}</td>
                          <td className={t.type === 'INCOME' ? styles.incomeText : styles.expenseText}>
                            {t.type === 'INCOME' ? '+' : '-'} Rp {t.amount.toLocaleString('id-ID')}
                          </td>
                          <td>
                            <div style={{ display: 'flex', gap: '0.4rem' }}>
                              <button onClick={() => openEditModal(t)} className={styles.deleteBtn} aria-label="Edit transaksi" title="Edit Transaksi">
                                <Edit2 size={16} />
                              </button>
                              <button onClick={() => handleDelete(t.id)} className={styles.deleteBtn} aria-label="Hapus transaksi" title="Hapus Transaksi">
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </td>
                        </tr>
                        {isExpanded && t.notes && (
                          <tr className={styles.expandedRow}>
                            <td colSpan={6}>
                              <div className={styles.notesBox}>
                                <pre className={styles.notesPre}>{t.notes}</pre>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile Card List View */}
          <div className={styles.mobileList}>
            {sortedFiltered.length === 0 ? (
              <div className={styles.mobileEmptyState}>
                Belum ada data transaksi. Tambah transaksi baru untuk mencatat pengeluaran/pemasukan kamu.
              </div>
            ) : (
              sortedFiltered.map((t) => {
                const formattedDate = new Date(t.date).toLocaleDateString('id-ID', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                });
                const isExpanded = expandedTxId === t.id;

                return (
                  <div key={t.id} className={styles.mobileCard}>
                    <div className={styles.mobileCardHeader}>
                      <div className={styles.mobileTitleGroup}>
                        <div className={t.type === 'INCOME' ? styles.incomeBadge : styles.expenseBadge}>
                          {t.type === 'INCOME' ? <ArrowDownLeft size={16} /> : <ArrowUpRight size={16} />}
                        </div>
                        <span className={styles.mobileTitle}>{t.description}</span>
                      </div>
                      <div style={{ display: 'flex', gap: '0.4rem' }}>
                        <button onClick={() => openEditModal(t)} className={styles.deleteBtn} aria-label="Edit transaksi" title="Edit Transaksi">
                          <Edit2 size={16} />
                        </button>
                        <button onClick={() => handleDelete(t.id)} className={styles.deleteBtn} aria-label="Hapus transaksi" title="Hapus Transaksi">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>

                    <div className={styles.mobileCardBody}>
                      <div className={styles.mobileTags}>
                        <span className={styles.categoryChip}>{t.category?.name || 'Kategori'}</span>
                        <span className={styles.accountChip}>{t.account?.name || 'Dompet'}</span>
                      </div>
                      <div className={styles.mobileMetaRight}>
                        <span className={styles.mobileDate}>{formattedDate}</span>
                        <span className={t.type === 'INCOME' ? styles.incomeText : styles.expenseText}>
                          {t.type === 'INCOME' ? '+' : '-'} Rp {t.amount.toLocaleString('id-ID')}
                        </span>
                      </div>
                    </div>

                    {/* Photo preview badges for mobile */}
                    {(t.receiptUrl || t.itemImageUrl) && (
                      <div className={styles.photoBadgeGroup}>
                        {t.receiptUrl && (
                          <button
                            type="button"
                            onClick={() => setViewingImage({ url: t.receiptUrl!, title: `${t.type === 'INCOME' ? 'Bukti Transfer' : 'Foto Nota'} - ${t.description}` })}
                            className={styles.photoBadge}
                          >
                            <FileText size={12} />
                            <span>{t.type === 'INCOME' ? 'Bukti Transfer' : 'Foto Nota'}</span>
                          </button>
                        )}
                        {t.itemImageUrl && (
                          <button
                            type="button"
                            onClick={() => setViewingImage({ url: t.itemImageUrl!, title: `Foto Barang - ${t.description}` })}
                            className={styles.photoBadge}
                          >
                            <ImageIcon size={12} />
                            <span>Foto Barang</span>
                          </button>
                        )}
                      </div>
                    )}

                    {t.notes && (
                      <div style={{ marginTop: '8px' }}>
                        <button
                          onClick={() => setExpandedTxId(isExpanded ? null : t.id)}
                          className={styles.multiItemToggleBtn}
                        >
                          <Package size={13} />
                          <span>Rincian Barang</span>
                          {isExpanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                        </button>
                        {isExpanded && (
                          <div className={styles.notesBox} style={{ marginTop: '6px' }}>
                            <pre className={styles.notesPre}>{t.notes}</pre>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </>
      )}

      {/* Modal with Date Selector & Optional Photos */}
      {isModalOpen && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <div className={styles.modalHeader}>
              <Receipt size={20} style={{ color: 'var(--accent)' }} />
              <h3>{editingTransaction ? 'Edit Transaksi' : 'Catat Transaksi Baru'}</h3>
            </div>

            <form onSubmit={handleSaveTransaction} className={styles.form}>
              {error && <div className={styles.errorAlert}>{error}</div>}

              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Tipe Transaksi</label>
                <div className={styles.typeSelector}>
                  <button
                    type="button"
                    onClick={() => setNewType('EXPENSE')}
                    className={`${styles.typeBtn} ${newType === 'EXPENSE' ? styles.activeExpense : ''}`}
                  >
                    Pengeluaran
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setNewType('INCOME');
                      setIsMultiItem(false);
                      setItemImage(null);
                    }}
                    className={`${styles.typeBtn} ${newType === 'INCOME' ? styles.activeIncome : ''}`}
                  >
                    Pemasukan
                  </button>
                </div>
              </div>

              {/* Date Selector Default to Today */}
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Tanggal Transaksi</label>
                <input
                  type="date"
                  value={txDate}
                  onChange={(e) => setTxDate(e.target.value)}
                  className={styles.textInput}
                  required
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Judul / Keterangan Utama</label>
                <input
                  type="text"
                  placeholder="Misal: Belanja Bulanan Supermarket / Gaji Bulanan"
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  className={styles.textInput}
                  required
                />
              </div>

              {/* Multi-Item Toggle Checkbox Option - ONLY AVAILABLE FOR EXPENSES */}
              {newType === 'EXPENSE' && (
                <div className={styles.multiItemToggleContainer}>
                  <label className={styles.checkboxLabel}>
                    <input
                      type="checkbox"
                      checked={isMultiItem}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        setIsMultiItem(checked);
                        if (checked) {
                          const total = itemList.reduce((acc, it) => acc + ((Number(it.qty) || 1) * (Number(it.price) || 0)), 0);
                          setNewAmount(total > 0 ? String(total) : '');
                        }
                      }}
                      className={styles.checkboxInput}
                    />
                    <Package size={16} className={styles.toggleIcon} />
                    <span>Rincian Banyak Barang (Multi-Item Pengeluaran)</span>
                  </label>
                </div>
              )}

              {/* Dynamic Item List Table */}
              {isMultiItem && newType === 'EXPENSE' ? (
                <div className={styles.multiItemBox}>
                  <div className={styles.multiItemHeader}>
                    <span className={styles.multiItemBoxTitle}>Daftar Rincian Barang</span>
                    <span className={styles.multiItemCountBadge}>{itemList.length} Items</span>
                  </div>

                  <div className={styles.itemTableHeader}>
                    <span>Nama Barang</span>
                    <span>Qty</span>
                    <span>Harga Satuan</span>
                    <span style={{ textAlign: 'right' }}>Subtotal</span>
                    <span></span>
                  </div>

                  {itemList.map((item, idx) => (
                    <div key={idx} className={styles.itemRow}>
                      <input
                        type="text"
                        placeholder={`Minyak, Beras... #${idx + 1}`}
                        value={item.name}
                        onChange={(e) => handleItemChange(idx, 'name', e.target.value)}
                        className={styles.itemNameInput}
                      />
                      <input
                        type="number"
                        min="1"
                        placeholder="1"
                        value={item.qty}
                        onChange={(e) => handleItemChange(idx, 'qty', e.target.value)}
                        className={styles.itemQtyInput}
                      />
                      <input
                        type="number"
                        placeholder="Harga (Rp)"
                        value={item.price || ''}
                        onChange={(e) => handleItemChange(idx, 'price', e.target.value)}
                        className={styles.itemPriceInput}
                      />
                      <span className={styles.itemSubtotal}>
                        Rp {((item.qty || 1) * (item.price || 0)).toLocaleString('id-ID')}
                      </span>
                      {itemList.length > 1 ? (
                        <button
                          type="button"
                          onClick={() => handleRemoveItemRow(idx)}
                          className={styles.removeItemBtn}
                          title="Hapus baris barang"
                        >
                          <X size={15} />
                        </button>
                      ) : (
                        <span></span>
                      )}
                    </div>
                  ))}

                  <button
                    type="button"
                    onClick={handleAddItemRow}
                    className={styles.addItemBtn}
                  >
                    <Plus size={14} />
                    <span>Tambah Baris Barang</span>
                  </button>
                </div>
              ) : null}

              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Total Nominal (Rp)</label>
                <input
                  type="number"
                  placeholder="50000"
                  value={newAmount}
                  onChange={(e) => setNewAmount(e.target.value)}
                  readOnly={isMultiItem}
                  className={`${styles.textInput} ${isMultiItem ? styles.readOnlyInput : ''}`}
                  required
                />
              </div>

              <div className={styles.formGrid}>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Kategori</label>
                  <select
                    value={selectedCategoryId}
                    onChange={(e) => setSelectedCategoryId(e.target.value)}
                    className={styles.selectInput}
                    required
                  >
                    {availableCategories.length === 0 ? (
                      <option value="">Tidak ada kategori</option>
                    ) : (
                      availableCategories.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))
                    )}
                  </select>
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Dompet / Akun</label>
                  <select
                    value={selectedAccountId}
                    onChange={(e) => setSelectedAccountId(e.target.value)}
                    className={styles.selectInput}
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
              </div>

              <div className={styles.formGroup}>
                <label className={styles.formLabel}>
                  {newType === 'EXPENSE' ? 'Penerima / Toko (Opsional)' : 'Pemberi / Sumber Dana (Opsional)'}
                </label>
                <input
                  type="text"
                  placeholder={newType === 'EXPENSE' ? 'Misal: RM Sederhana / Tokopedia / Superindo' : 'Misal: PT Client / Bos / Transfer Teman'}
                  value={recipientOrPayer}
                  onChange={(e) => setRecipientOrPayer(e.target.value)}
                  className={styles.textInput}
                />
              </div>

              {/* Optional Photo Inputs */}
              {newType === 'EXPENSE' ? (
                <div className={styles.formGrid}>
                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Foto Nota / Struk (Opsional)</label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleImageSelect(file, setReceiptImage);
                      }}
                      className={styles.fileInput}
                    />
                    {receiptImage && (
                      <div className={styles.imagePreviewContainer}>
                        <img src={receiptImage} alt="Preview Nota" className={styles.imagePreview} />
                        <button type="button" onClick={() => setReceiptImage(null)} className={styles.removeImgBtn}>
                          Hapus Foto
                        </button>
                      </div>
                    )}
                  </div>

                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Foto Barang / Fisik (Opsional)</label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleImageSelect(file, setItemImage);
                      }}
                      className={styles.fileInput}
                    />
                    {itemImage && (
                      <div className={styles.imagePreviewContainer}>
                        <img src={itemImage} alt="Preview Barang" className={styles.imagePreview} />
                        <button type="button" onClick={() => setItemImage(null)} className={styles.removeImgBtn}>
                          Hapus Foto
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Foto Bukti Transfer / Resi Pemasukan (Opsional)</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleImageSelect(file, setReceiptImage);
                    }}
                    className={styles.fileInput}
                  />
                  {receiptImage && (
                    <div className={styles.imagePreviewContainer}>
                      <img src={receiptImage} alt="Preview Bukti Transfer" className={styles.imagePreview} />
                      <button type="button" onClick={() => setReceiptImage(null)} className={styles.removeImgBtn}>
                        Hapus Foto
                      </button>
                    </div>
                  )}
                </div>
              )}

              <div className={styles.modalActions}>
                <button type="button" onClick={() => setIsModalOpen(false)} className={styles.cancelBtn}>
                  Batal
                </button>
                <button type="submit" className={styles.submitBtn} disabled={submitting}>
                  {submitting ? <Loader2 size={16} className={styles.spinningIcon} /> : (editingTransaction ? 'Simpan Perubahan' : 'Simpan Transaksi')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Viewing Photo Modal */}
      {viewingImage && (
        <div className={styles.imageModalOverlay} onClick={() => setViewingImage(null)}>
          <div className={styles.imageModalContent} onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setViewingImage(null)} className={styles.closeImageBtn}>
              <X size={18} />
            </button>
            <h4 style={{ color: '#fff', marginBottom: '12px', fontSize: '0.9rem', textAlign: 'center' }}>{viewingImage.title}</h4>
            <img src={viewingImage.url} alt={viewingImage.title} className={styles.imageModalImg} />
          </div>
        </div>
      )}
    </div>
  );
}
