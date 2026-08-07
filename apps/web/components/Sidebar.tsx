'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
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
} from 'lucide-react';
import { useTheme, Theme } from '../lib/theme-context';
import styles from './Sidebar.module.css';

export function Sidebar() {
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();

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
    <aside className={styles.sidebar}>
      <div className={styles.header}>
        <div className={styles.logo}>
          <div className={styles.logoIcon}>
            <TrendingUp size={22} />
          </div>
          <div className={styles.logoText}>
            <span className={styles.appName}>FinanceTracker</span>
            <span className={styles.appTag}>Personal Vault</span>
          </div>
        </div>
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
              className={`${styles.navLink} ${isActive ? styles.active : ''}`}
            >
              <Icon size={18} />
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
              <Sun size={15} />
              <span>Light</span>
            </button>
            <button
              onClick={() => setTheme('dark')}
              className={`${styles.themeBtn} ${theme === 'dark' ? styles.activeTheme : ''}`}
              title="Dark Theme"
            >
              <Moon size={15} />
              <span>Dark</span>
            </button>
            <button
              onClick={() => setTheme('pink')}
              className={`${styles.themeBtn} ${theme === 'pink' ? styles.pinkBtnActive : ''}`}
              title="Pink Female Theme"
            >
              <Heart size={15} color="#ec4899" />
              <span>Pink</span>
            </button>
          </div>
        </div>

        <div className={styles.userCard}>
          <div className={styles.avatar}>EM</div>
          <div className={styles.userInfo}>
            <div className={styles.userName}>Eeja Makkutujuh</div>
            <div className={styles.userRole}>PRO Member</div>
          </div>
        </div>
      </div>
    </aside>
  );
}
