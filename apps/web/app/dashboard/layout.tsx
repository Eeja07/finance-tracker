'use client';

import React, { useState, useEffect } from 'react';
import { Menu } from 'lucide-react';
import { Sidebar } from '../../components/Sidebar';
import { useAuth } from '../../lib/auth-context';
import { whatsappApi } from '../../lib/api';
import styles from './layout.module.css';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [waConnected, setWaConnected] = useState(false);
  const displayName = user?.fullName || 'Pengguna';

  useEffect(() => {
    const checkWa = async () => {
      try {
        const status = await whatsappApi.getStatus();
        setWaConnected(status.status === 'connected');
      } catch {
        setWaConnected(false);
      }
    };
    checkWa();
    const timer = setInterval(checkWa, 10000);
    return () => clearInterval(timer);
  }, []);

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
              <span className={styles.welcomeText}>Halo, {displayName}</span>
              <span className={styles.dateBadge}>
                {new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
              </span>
            </div>
          </div>
          <div className={styles.navActions}>
            <div className={waConnected ? styles.waStatusBadge : styles.waDisconnectedBadge}>
              <span className={waConnected ? styles.onlineDot : styles.offlineDot}></span>
              <span>{waConnected ? 'WA Bot Terhubung' : 'WA Bot Terputus'}</span>
            </div>
          </div>
        </div>
        <div className={styles.contentBody}>{children}</div>
      </main>
    </div>
  );
}
