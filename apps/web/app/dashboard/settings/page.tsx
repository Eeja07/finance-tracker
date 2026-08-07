'use client';

import React, { useState } from 'react';
import { Settings, Sun, Moon, Heart, User, Shield, Check, Phone } from 'lucide-react';
import { useTheme } from '../../../lib/theme-context';
import { useAuth } from '../../../lib/auth-context';
import styles from './settings.module.css';

export default function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const { user } = useAuth();
  const [fullName, setFullName] = useState(user?.fullName || 'Pengguna');
  const [email, setEmail] = useState(user?.email || 'user@example.com');
  const [phone, setPhone] = useState('081234567890');
  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  return (
    <div className={styles.container}>
      <div className={styles.headerBanner}>
        <div>
          <h2>Pengaturan Akun & Tampilan</h2>
          <p>Atur profil pengguna, pilihan tema (Light, Dark, Pink), dan integrasi WhatsApp.</p>
        </div>
      </div>

      <div className={styles.grid}>
        {/* Theme Selector Section */}
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <Settings size={20} className={styles.accentIcon} />
            <h3>Pilihan Tema Aplikasi</h3>
          </div>
          <p className={styles.sectionSub}>
            Pilih dari 3 tema eksklusif: <b>Light</b> untuk tampilan bersih, <b>Dark</b> untuk malam hari, atau <b>Pink</b> dengan nuansa pastel romantis khas cewe.
          </p>

          <div className={styles.themeCardsGrid}>
            <div
              onClick={() => setTheme('light')}
              className={`${styles.themeOptionCard} ${theme === 'light' ? styles.activeOption : ''}`}
            >
              <div className={styles.themeIconBox} style={{ background: '#F8FAFC', color: '#0F172A' }}>
                <Sun size={24} />
              </div>
              <div className={styles.themeInfo}>
                <span className={styles.themeTitle}>Light Theme</span>
                <span className={styles.themeDesc}>Clean, bright & modern</span>
              </div>
              {theme === 'light' && <Check size={18} className={styles.checkIcon} />}
            </div>

            <div
              onClick={() => setTheme('dark')}
              className={`${styles.themeOptionCard} ${theme === 'dark' ? styles.activeOption : ''}`}
            >
              <div className={styles.themeIconBox} style={{ background: '#0B0F19', color: '#6366F1' }}>
                <Moon size={24} />
              </div>
              <div className={styles.themeInfo}>
                <span className={styles.themeTitle}>Dark Theme</span>
                <span className={styles.themeDesc}>Sleek obsidian night mode</span>
              </div>
              {theme === 'dark' && <Check size={18} className={styles.checkIcon} />}
            </div>

            <div
              onClick={() => setTheme('pink')}
              className={`${styles.themeOptionCard} ${theme === 'pink' ? styles.activePinkOption : ''}`}
            >
              <div className={styles.themeIconBox} style={{ background: '#FFF1F2', color: '#F43F5E' }}>
                <Heart size={24} color="#F43F5E" />
              </div>
              <div className={styles.themeInfo}>
                <span className={styles.themeTitle}>Pink Female Theme</span>
                <span className={styles.themeDesc}>Soft rose, pastel & feminine</span>
              </div>
              {theme === 'pink' && <Check size={18} className={styles.pinkCheckIcon} />}
            </div>
          </div>
        </div>

        {/* Profile Settings */}
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <User size={20} className={styles.accentIcon} />
            <h3>Profil Pengguna & Keamanan</h3>
          </div>

          <form onSubmit={handleSave} className={styles.form}>
            <div className={styles.formGroup}>
              <label>Nama Lengkap</label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
              />
            </div>

            <div className={styles.formGroup}>
              <label>Alamat Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className={styles.formGroup}>
              <label>Nomor WhatsApp (Untuk Reminder Cicilan & Bot)</label>
              <div className={styles.inputWithIcon}>
                <Phone size={18} />
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className={styles.formActions}>
              <button type="submit" className={styles.saveBtn}>
                Simpan Perubahan
              </button>
            </div>

            {savedSuccess && (
              <div className={styles.successNotice}>
                <Check size={16} />
                <span>Pengaturan profil dan tema berhasil diperbarui!</span>
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}
