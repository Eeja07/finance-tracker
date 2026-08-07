'use client';

import React, { useState } from 'react';
import { Receipt, Plus, Search, Filter, ArrowUpRight, ArrowDownLeft, Trash2, Calendar } from 'lucide-react';
import styles from './transactions.module.css';

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState([
    { id: '1', type: 'INCOME', description: 'Gaji Bulanan PT Maju Bersama', amount: 15000000, category: 'Gaji', account: 'BCA', date: '2026-08-01' },
    { id: '2', type: 'EXPENSE', description: 'Makan Siang Nasi Padang', amount: 45000, category: 'Makanan & Minuman', account: 'GoPay', date: '2026-08-07' },
    { id: '3', type: 'EXPENSE', description: 'Kopi Susu Gula Aren', amount: 28000, category: 'Makanan & Minuman', account: 'GoPay', date: '2026-08-07' },
    { id: '4', type: 'EXPENSE', description: 'Isi Bensin Pertamax', amount: 150000, category: 'Transportasi', account: 'BCA', date: '2026-08-07' },
    { id: '5', type: 'EXPENSE', description: 'Tagihan Listrik PLN & IndiHome', amount: 350000, category: 'Tagihan', account: 'BCA', date: '2026-08-03' },
  ]);

  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('ALL');
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [newDesc, setNewDesc] = useState('');
  const [newAmount, setNewAmount] = useState('');
  const [newType, setNewType] = useState<'EXPENSE' | 'INCOME'>('EXPENSE');
  const [newCategory, setNewCategory] = useState('Makanan & Minuman');
  const [newAccount, setNewAccount] = useState('GoPay');

  const filtered = transactions.filter((t) => {
    const matchesSearch = t.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === 'ALL' || t.type === filterType;
    return matchesSearch && matchesType;
  });

  const handleAddTransaction = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDesc || !newAmount) return;

    const created = {
      id: Date.now().toString(),
      type: newType,
      description: newDesc,
      amount: parseFloat(newAmount),
      category: newCategory,
      account: newAccount,
      date: new Date().toISOString().split('T')[0],
    };

    setTransactions([created, ...transactions]);
    setIsModalOpen(false);
    setNewDesc('');
    setNewAmount('');
  };

  const handleDelete = (id: string) => {
    setTransactions(transactions.filter((x) => x.id !== id));
  };

  return (
    <div className={styles.container}>
      <div className={styles.headerBanner}>
        <div>
          <h2>Daftar Transaksi</h2>
          <p>Catat dan filter seluruh transaksi pemasukan serta pengeluaran harian kamu.</p>
        </div>
        <button onClick={() => setIsModalOpen(true)} className={styles.addBtn}>
          <Plus size={18} />
          <span>Tambah Transaksi</span>
        </button>
      </div>

      {/* Filter & Search Bar */}
      <div className={styles.filterBar}>
        <div className={styles.searchBox}>
          <Search size={18} />
          <input
            type="text"
            placeholder="Cari transaksi..."
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

      {/* Table */}
      <div className={styles.tableCard}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Deskripsi</th>
              <th>Kategori</th>
              <th>Dompet</th>
              <th>Tanggal</th>
              <th>Jumlah</th>
              <th>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((t) => (
              <tr key={t.id}>
                <td>
                  <div className={styles.txDescGroup}>
                    <div className={t.type === 'INCOME' ? styles.incomeBadge : styles.expenseBadge}>
                      {t.type === 'INCOME' ? <ArrowDownLeft size={16} /> : <ArrowUpRight size={16} />}
                    </div>
                    <span className={styles.txDesc}>{t.description}</span>
                  </div>
                </td>
                <td><span className={styles.categoryChip}>{t.category}</span></td>
                <td><span className={styles.accountChip}>{t.account}</span></td>
                <td>{t.date}</td>
                <td className={t.type === 'INCOME' ? styles.incomeText : styles.expenseText}>
                  {t.type === 'INCOME' ? '+' : '-'} Rp {t.amount.toLocaleString('id-ID')}
                </td>
                <td>
                  <button onClick={() => handleDelete(t.id)} className={styles.deleteBtn}>
                    <Trash2 size={16} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <h3>Catat Transaksi Baru</h3>
            <form onSubmit={handleAddTransaction} className={styles.form}>
              <div className={styles.formGroup}>
                <label>Tipe Transaksi</label>
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
                    onClick={() => setNewType('INCOME')}
                    className={`${styles.typeBtn} ${newType === 'INCOME' ? styles.activeIncome : ''}`}
                  >
                    Pemasukan
                  </button>
                </div>
              </div>

              <div className={styles.formGroup}>
                <label>Deskripsi Transaksi</label>
                <input
                  type="text"
                  placeholder="Misal: Makan Siang Ayam Goreng"
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  required
                />
              </div>

              <div className={styles.formGroup}>
                <label>Jumlah Nominal (Rp)</label>
                <input
                  type="number"
                  placeholder="50000"
                  value={newAmount}
                  onChange={(e) => setNewAmount(e.target.value)}
                  required
                />
              </div>

              <div className={styles.formGrid}>
                <div className={styles.formGroup}>
                  <label>Kategori</label>
                  <select value={newCategory} onChange={(e) => setNewCategory(e.target.value)}>
                    <option value="Makanan & Minuman">Makanan & Minuman</option>
                    <option value="Transportasi">Transportasi</option>
                    <option value="Tagihan">Tagihan</option>
                    <option value="Belanja">Belanja</option>
                    <option value="Gaji">Gaji</option>
                  </select>
                </div>
                <div className={styles.formGroup}>
                  <label>Dompet / Akun</label>
                  <select value={newAccount} onChange={(e) => setNewAccount(e.target.value)}>
                    <option value="BCA">BCA</option>
                    <option value="GoPay">GoPay</option>
                    <option value="Uang Tunai">Uang Tunai</option>
                  </select>
                </div>
              </div>

              <div className={styles.modalActions}>
                <button type="button" onClick={() => setIsModalOpen(false)} className={styles.cancelBtn}>
                  Batal
                </button>
                <button type="submit" className={styles.submitBtn}>
                  Simpan Transaksi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
