'use client';

import React from 'react';
import { Sidebar } from '../../components/Sidebar';
import styles from './layout.module.css';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={styles.layoutContainer}>
      <Sidebar />
      <main className={styles.mainContent}>
        <div className={styles.topNavbar}>
          <div className={styles.navTitle}>
            <span className={styles.welcomeText}>Halo, Eeja Makkutujuh 👋</span>
            <span className={styles.dateBadge}>
              {new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            </span>
          </div>
          <div className={styles.navActions}>
            <div className={styles.waStatusBadge}>
              <span className={styles.onlineDot}></span>
              <span>WA Bot Aktif</span>
            </div>
          </div>
        </div>
        <div className={styles.contentBody}>{children}</div>
      </main>
    </div>
  );
}
