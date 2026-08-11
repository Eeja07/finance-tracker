'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  Receipt,
  Wallet,
  CreditCard,
  Target,
  MessageSquare,
  Settings,
  Sun,
  Moon,
  Heart,
  TrendingUp,
  X,
  LogOut,
} from 'lucide-react';
import { useTheme } from '../lib/theme-context';
import { useAuth } from '../lib/auth-context';
import styles from './Sidebar.module.css';

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export function Sidebar({ isOpen = false, onClose }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const { user, logout } = useAuth();

  const displayName = user?.fullName || 'Pengguna';
  const initials = user?.fullName
    ? user.fullName.split(' ').map((n) => n[0]).join('').substring(0, 2).toUpperCase()
    : 'FT';

  const handleLogout = async () => {
    if (confirm('Apakah Anda yakin ingin keluar dari akun?')) {
      await logout();
      router.push('/login');
    }
  };

  const navItems = [
    { href: '/dashboard', label: 'Overview', icon: LayoutDashboard },
    { href: '/dashboard/transactions', label: 'Transaksi', icon: Receipt },
    { href: '/dashboard/accounts', label: 'Dompet & Bank', icon: Wallet },
    { href: '/dashboard/installments', label: 'Cicilan & Hutang', icon: CreditCard, badge: 'Penting' },
    { href: '/dashboard/budgets', label: 'Target Anggaran', icon: Target },
    { href: '/dashboard/whatsapp', label: 'WhatsApp Bot', icon: MessageSquare },
    { href: '/dashboard/settings', label: 'Pengaturan', icon: Settings },
  ];

  return (
    <>
      <div
        className={`${styles.overlay} ${isOpen ? styles.overlayOpen : ''}`}
        onClick={onClose}
      />
      <aside className={`${styles.sidebar} ${isOpen ? styles.sidebarOpen : ''}`}>
        <div className={styles.header}>
          <div className={styles.logo}>
            <div className={styles.logoIcon}>
              <TrendingUp size={18} />
            </div>
            <div className={styles.logoText}>
              <span className={styles.appName}>FinanceTracker</span>
              <span className={styles.appTag}>Personal Vault</span>
            </div>
          </div>
          {onClose && (
            <button className={styles.closeBtn} onClick={onClose} aria-label="Tutup menu">
              <X size={18} />
            </button>
          )}
        </div>

        <nav className={styles.nav}>
          <div className={styles.navGroupTitle}>MENU UTAMA</div>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname?.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={`${styles.navLink} ${isActive ? styles.active : ''}`}
              >
                <Icon size={16} />
                <span>{item.label}</span>
                {item.badge && <span className={styles.badge}>{item.badge}</span>}
              </Link>
            );
          })}
        </nav>

        <div className={styles.footer}>
          <div className={styles.themeSection}>
            <span className={styles.themeLabel}>TEMA TAMPILAN</span>
            <div className={styles.themeToggleGroup}>
              <button
                onClick={() => setTheme('light')}
                className={`${styles.themeBtn} ${theme === 'light' ? styles.activeTheme : ''}`}
                title="Light Theme"
              >
                <Sun size={14} />
                <span>Light</span>
              </button>
              <button
                onClick={() => setTheme('dark')}
                className={`${styles.themeBtn} ${theme === 'dark' ? styles.activeTheme : ''}`}
                title="Dark Theme"
              >
                <Moon size={14} />
                <span>Dark</span>
              </button>
              <button
                onClick={() => setTheme('pink')}
                className={`${styles.themeBtn} ${theme === 'pink' ? styles.pinkBtnActive : ''}`}
                title="Pink Female Theme"
              >
                <Heart size={14} />
                <span>Pink</span>
              </button>
            </div>
          </div>

          <div className={styles.userCard}>
            <div className={styles.avatar}>{initials}</div>
            <div className={styles.userInfo}>
              <div className={styles.userName}>{displayName}</div>
              <div className={styles.userRole}>PRO Member</div>
            </div>
            <button
              onClick={handleLogout}
              className={styles.logoutBtn}
              title="Keluar dari Akun (Logout)"
              aria-label="Keluar dari Akun"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
