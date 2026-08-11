'use client';

import React, { useState } from 'react';
import { Menu, LogOut } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Sidebar } from '../../components/Sidebar';
import { useAuth } from '../../lib/auth-context';
import styles from './layout.module.css';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const displayName = user?.fullName || 'Pengguna';

  const handleLogout = async () => {
    if (confirm('Apakah Anda yakin ingin keluar dari akun?')) {
      await logout();
      router.push('/login');
    }
  };

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

          <button
            onClick={handleLogout}
            className={styles.navLogoutBtn}
            title="Keluar dari Akun"
            aria-label="Keluar dari Akun"
          >
            <LogOut size={15} />
            <span>Keluar</span>
          </button>
        </div>
        <div className={styles.contentBody}>{children}</div>
      </main>
    </div>
  );
}
