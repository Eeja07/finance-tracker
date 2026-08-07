'use client';

import React, { useState } from 'react';
import { Menu } from 'lucide-react';
import { Sidebar } from '../../components/Sidebar';
import { useAuth } from '../../lib/auth-context';
import styles from './layout.module.css';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const displayName = user?.fullName || 'Pengguna';

  return (
    <div className={styles.layoutContainer}>
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <main className={styles.mainContent}>
        <div className={styles.topNavbar}>
          <div className={styles.navTitleGroup}>
            <button
              className={styles.menuToggleBtn}
              onClick={() => setSidebarOpen(true)}
              aria-label="Buka menu navigasi"
            >
              <Menu size={18} />
            </button>
            <div className={styles.navTitle}>
              <span className={styles.welcomeText}>Halo, {displayName} 👋</span>
              <span className={styles.dateBadge}>
                {new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
              </span>
            </div>
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
