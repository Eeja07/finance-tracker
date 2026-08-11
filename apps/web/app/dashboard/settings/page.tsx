'use client';

import React, { useState, useEffect } from 'react';
import { Settings, Sun, Moon, Heart, User, Check, Phone, Loader2 } from 'lucide-react';
import { useTheme } from '../../../lib/theme-context';
import { useAuth } from '../../../lib/auth-context';
import { usersApi } from '@/lib/api';
import styles from './settings.module.css';

export default function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const { user } = useAuth();
  const [fullName, setFullName] = useState(user?.fullName || '');
  const [email, setEmail] = useState(user?.email || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [currency, setCurrency] = useState(user?.currency || 'IDR');
  const [submitting, setSubmitting] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    async function loadProfile() {
      try {
        const prof = await usersApi.getProfile();
        if (prof) {
          if (prof.fullName) setFullName(prof.fullName);
          if (prof.email) setEmail(prof.email);
          if (prof.phone) setPhone(prof.phone);
          if (prof.currency) setCurrency(prof.currency);
          if (prof.themePreference && ['light', 'dark', 'pink'].includes(prof.themePreference)) {
            setTheme(prof.themePreference as any);
          }
        }
      } catch (err) {
        console.error('Failed to load profile settings:', err);
      }
    }
    loadProfile();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await usersApi.updateProfile({
        fullName,
        phone,
        currency,
      });
      await usersApi.updateTheme(theme);
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    } catch (err: any) {
      setError(err.message || 'Gagal menyimpan profil');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSelectTheme = (selectedTheme: 'light' | 'dark' | 'pink') => {
    setTheme(selectedTheme);
    usersApi.updateTheme(selectedTheme).catch(() => {});
  };

  return (
    <div className={styles.container}>
      <div className={styles.headerBanner}>
        <div>
          <h2>Pengaturan Akun & Tampilan</h2>
          <p>Atur profil pengguna, pilihan tema (Light, Dark, Pink), dan mata uang bawaan.</p>
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
              onClick={() => handleSelectTheme('light')}
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
              onClick={() => handleSelectTheme('dark')}
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
              onClick={() => handleSelectTheme('pink')}
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
            {error && <div style={{ color: '#EF4444', fontSize: '0.85rem', marginBottom: '0.5rem' }}>{error}</div>}

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
                disabled
                style={{ opacity: 0.7, cursor: 'not-allowed' }}
              />
            </div>

            <div className={styles.formGroup}>
              <label>Nomor WhatsApp (Untuk Reminder Cicilan & Bot)</label>
              <div className={styles.inputWithIcon}>
                <Phone size={18} />
                <input
                  type="text"
                  placeholder="081234567890"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>
            </div>

            <div className={styles.formGroup}>
              <label>Mata Uang Bawaan</label>
              <select value={currency} onChange={(e) => setCurrency(e.target.value)}>
                <option value="IDR">IDR (Rupiah Indonesia)</option>
                <option value="USD">USD (US Dollar)</option>
                <option value="SGD">SGD (Singapore Dollar)</option>
              </select>
            </div>

            <div className={styles.formActions}>
              <button type="submit" className={styles.saveBtn} disabled={submitting}>
                {submitting ? <Loader2 size={16} style={{ animation: 'spin 0.8s linear infinite' }} /> : 'Simpan Perubahan'}
              </button>
            </div>

            {savedSuccess && (
              <div className={styles.successNotice}>
                <Check size={16} />
                <span>Pengaturan profil dan tema berhasil tersimpan di DB!</span>
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}
