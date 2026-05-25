'use client';

import { useTranslations } from 'next-intl';
import { FormEvent, useEffect, useState } from 'react';
import { ApiError } from '@/lib/api';
import {
  type AuthUser,
  changePassword,
  getCurrentUser,
  updateProfile,
} from '@/lib/auth';

export default function ProfileSettingsPage() {
  const t = useTranslations('settings');
  const tCommon = useTranslations('common');
  const tAuth = useTranslations('auth');

  const [user, setUser] = useState<AuthUser | null>(null);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [pwSaving, setPwSaving] = useState(false);
  const [pwOk, setPwOk] = useState(false);
  const [pwError, setPwError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getCurrentUser()
      .then((u) => {
        if (cancelled) return;
        setUser(u);
        setName(u.name);
        setPhone(u.phone ?? '');
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  async function onSubmitProfile(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSaved(false);
    setSaving(true);
    try {
      const updated = await updateProfile({
        name: name.trim(),
        phone: phone.trim() || undefined,
      });
      setUser(updated);
      setSaved(true);
    } catch {
      setError(tAuth('errorGeneric'));
    } finally {
      setSaving(false);
    }
  }

  async function onSubmitPassword(e: FormEvent) {
    e.preventDefault();
    setPwError(null);
    setPwOk(false);
    setPwSaving(true);
    try {
      await changePassword({ currentPassword, newPassword });
      setPwOk(true);
      setCurrentPassword('');
      setNewPassword('');
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        setPwError(t('errorWrongPassword'));
      } else {
        setPwError(tAuth('errorGeneric'));
      }
    } finally {
      setPwSaving(false);
    }
  }

  if (!user) {
    return (
      <main className="mx-auto max-w-xl px-6 py-10">
        <p className="text-sm text-slate-500">…</p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-xl px-6 py-10">
      <h1 className="text-2xl font-semibold">{t('yourProfile')}</h1>

      <form onSubmit={onSubmitProfile} className="mt-6 flex flex-col gap-4">
        <label className="flex flex-col gap-1 text-sm">
          {t('name')}
          <input
            type="text"
            required
            minLength={2}
            maxLength={80}
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="rounded-md border border-slate-300 px-3 py-2"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          {t('email')}
          <input
            type="email"
            value={user.email}
            disabled
            className="rounded-md border border-slate-300 bg-slate-50 px-3 py-2"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          {t('phone')}
          <input
            type="tel"
            maxLength={40}
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="rounded-md border border-slate-300 px-3 py-2"
          />
        </label>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <div className="text-xs text-slate-500">{t('role')}</div>
            <div className="mt-1 font-medium">{user.role}</div>
          </div>
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        {saved && <p className="text-sm text-green-700">{t('saved')}</p>}
        <div>
          <button
            type="submit"
            disabled={saving}
            className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
          >
            {saving ? tAuth('submitting') : tCommon('save')}
          </button>
        </div>
      </form>

      <section className="mt-10 rounded-lg border border-slate-200 bg-white p-4">
        <h2 className="text-sm font-semibold">{t('changePasswordTitle')}</h2>
        <form onSubmit={onSubmitPassword} className="mt-3 flex flex-col gap-3">
          <label className="flex flex-col gap-1 text-xs">
            {t('currentPassword')}
            <input
              type="password"
              required
              autoComplete="current-password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs">
            {t('newPassword')}
            <input
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
          </label>
          {pwError && <p className="text-sm text-red-600">{pwError}</p>}
          {pwOk && <p className="text-sm text-green-700">{t('passwordChanged')}</p>}
          <div>
            <button
              type="submit"
              disabled={pwSaving}
              className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
            >
              {pwSaving ? tAuth('submitting') : t('changePasswordTitle')}
            </button>
          </div>
        </form>
      </section>
    </main>
  );
}
