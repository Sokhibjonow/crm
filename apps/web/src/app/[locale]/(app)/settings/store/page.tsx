'use client';

import { useTranslations } from 'next-intl';
import { FormEvent, useEffect, useState } from 'react';
import { type AuthUser, getCurrentUser } from '@/lib/auth';
import { getStore, type Store, type StoreLocale, updateStore } from '@/lib/stores';

export default function StoreSettingsPage() {
  const t = useTranslations('settings');
  const tCommon = useTranslations('common');
  const tAuth = useTranslations('auth');

  const [me, setMe] = useState<AuthUser | null>(null);
  const [store, setStore] = useState<Store | null>(null);
  const [name, setName] = useState('');
  const [locale, setLocale] = useState<StoreLocale>('ru');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([getCurrentUser(), getStore()])
      .then(([u, s]) => {
        if (cancelled) return;
        setMe(u);
        setStore(s);
        setName(s.name);
        setLocale(s.locale);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSaved(false);
    setSaving(true);
    try {
      const updated = await updateStore({ name: name.trim(), locale });
      setStore(updated);
      setSaved(true);
    } catch {
      setError(tAuth('errorGeneric'));
    } finally {
      setSaving(false);
    }
  }

  if (!me || !store) {
    return (
      <main className="mx-auto max-w-xl px-6 py-10">
        <p className="text-sm text-slate-500">…</p>
      </main>
    );
  }

  const readOnly = me.role !== 'OWNER';

  return (
    <main className="mx-auto max-w-xl px-6 py-10">
      <h1 className="text-2xl font-semibold">{t('store')}</h1>
      {readOnly && <p className="mt-2 text-sm text-slate-500">{t('ownerOnly')}</p>}

      <form onSubmit={onSubmit} className="mt-6 flex flex-col gap-4">
        <label className="flex flex-col gap-1 text-sm">
          {t('storeNameLabel')}
          <input
            type="text"
            required
            minLength={2}
            maxLength={120}
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={readOnly}
            className="rounded-md border border-slate-300 px-3 py-2 disabled:bg-slate-50"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          {t('localeLabel')}
          <select
            value={locale}
            onChange={(e) => setLocale(e.target.value as StoreLocale)}
            disabled={readOnly}
            className="rounded-md border border-slate-300 bg-white px-3 py-2 disabled:bg-slate-50"
          >
            <option value="ru">{t('localeRu')}</option>
            <option value="uz">{t('localeUz')}</option>
          </select>
        </label>

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <div className="text-xs text-slate-500">{t('subscriptionPlan')}</div>
            <div className="mt-1 font-medium">{store.subscriptionPlan}</div>
          </div>
          <div>
            <div className="text-xs text-slate-500">{t('currency')}</div>
            <div className="mt-1 font-medium">{store.currency}</div>
          </div>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}
        {saved && <p className="text-sm text-green-700">{t('saved')}</p>}

        {!readOnly && (
          <div>
            <button
              type="submit"
              disabled={saving}
              className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
            >
              {saving ? tAuth('submitting') : tCommon('save')}
            </button>
          </div>
        )}
      </form>
    </main>
  );
}
