'use client';

import React, { useState } from 'react';
import { Target, Plus, AlertCircle, CheckCircle2 } from 'lucide-react';
import styles from './budgets.module.css';

export default function BudgetsPage() {
  const [budgets, setBudgets] = useState([
    { id: '1', category: 'Makanan & Minuman', limit: 2500000, spent: 1850000, color: '#F43F5E' },
    { id: '2', category: 'Transportasi', limit: 1000000, spent: 450000, color: '#3B82F6' },
    { id: '3', category: 'Belanja & Lifestyle', limit: 1500000, spent: 1650000, color: '#EC4899' },
    { id: '4', category: 'Hiburan', limit: 800000, spent: 320000, color: '#8B5CF6' },
  ]);

  return (
    <div className={styles.container}>
      <div className={styles.headerBanner}>
        <div>
          <h2>Target Anggaran Bulanan</h2>
          <p>Tetapkan batas pengeluaran per kategori agar kondisi keuangan tetap terkontrol.</p>
        </div>
      </div>

      <div className={styles.grid}>
        {budgets.map((b) => {
          const pct = Math.round((b.spent / b.limit) * 100);
          const isExceeded = b.spent > b.limit;

          return (
            <div key={b.id} className={styles.card}>
              <div className={styles.cardHeader}>
                <div className={styles.categoryInfo}>
                  <div className={styles.colorDot} style={{ background: b.color }}></div>
                  <h3>{b.category}</h3>
                </div>
                {isExceeded ? (
                  <span className={styles.exceededTag}>
                    <AlertCircle size={12} /> Exceeded
                  </span>
                ) : (
                  <span className={styles.normalTag}>
                    <CheckCircle2 size={12} /> Safe
                  </span>
                )}
              </div>

              <div className={styles.cardBody}>
                <div className={styles.amountRow}>
                  <div>
                    <span className={styles.label}>Terpakai</span>
                    <div className={`${styles.value} ${isExceeded ? styles.exceededText : ''}`}>
                      Rp {b.spent.toLocaleString('id-ID')}
                    </div>
                  </div>
                  <div className={styles.rightAlign}>
                    <span className={styles.label}>Batas Anggaran</span>
                    <div className={styles.limitValue}>
                      Rp {b.limit.toLocaleString('id-ID')}
                    </div>
                  </div>
                </div>

                <div className={styles.progressBg}>
                  <div
                    className={`${styles.progressFill} ${isExceeded ? styles.exceededFill : ''}`}
                    style={{ width: `${Math.min(100, pct)}%` }}
                  ></div>
                </div>

                <div className={styles.metaRow}>
                  <span>{pct}% dari batas anggaran</span>
                  <span>Sisa: Rp {Math.max(0, b.limit - b.spent).toLocaleString('id-ID')}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
