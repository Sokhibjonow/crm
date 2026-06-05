'use client';

import { useTranslations } from 'next-intl';
import { FormEvent, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { ApiError } from '@/lib/api';
import { formatMoney } from '@/lib/format';
import {
  createPromoCode,
  deletePromoCode,
  listPromoCodes,
  type PromoCode,
  type PromoCodeType,
  updatePromoCode,
} from '@/lib/promo';

interface Props {
  params: { locale: string };
}

const BLANK = {
  code: '',
  type: 'PERCENT' as PromoCodeType,
  value: '',
  minOrderTotal: '',
  maxUses: '',
  validFrom: '',
  validUntil: '',
  isActive: true,
};

export default function PromoSettingsPage({ params: { locale } }: Props) {
  const t = useTranslations('promo');
  const tCommon = useTranslations('common');
  const tAuth = useTranslations('auth');

  const [items, setItems] = useState<PromoCode[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(BLANK);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function reload() {
    setLoading(true);
    try {
      const res = await listPromoCodes();
      setItems(res);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    reload();
  }, []);

  function startEdit(p: PromoCode) {
    setEditingId(p.id);
    setForm({
      code: p.code,
      type: p.type,
      value: p.value,
      minOrderTotal: p.minOrderTotal,
      maxUses: p.maxUses !== null ? String(p.maxUses) : '',
      validFrom: p.validFrom ? p.validFrom.slice(0, 10) : '',
      validUntil: p.validUntil ? p.validUntil.slice(0, 10) : '',
      isActive: p.isActive,
    });
    setError(null);
  }

  function resetForm() {
    setEditingId(null);
    setForm(BLANK);
    setError(null);
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const payload = {
        code: form.code.trim(),
        type: form.type,
        value: Number(form.value),
        minOrderTotal: form.minOrderTotal ? Number(form.minOrderTotal) : undefined,
        maxUses: form.maxUses ? Number(form.maxUses) : null,
        validFrom: form.validFrom ? new Date(form.validFrom).toISOString() : null,
        validUntil: form.validUntil
          ? new Date(`${form.validUntil}T23:59:59.999`).toISOString()
          : null,
        isActive: form.isActive,
      };
      if (editingId) {
        await updatePromoCode(editingId, payload);
        toast.success(tCommon('saved'));
      } else {
        await createPromoCode(payload);
        toast.success(tCommon('created'));
      }
      resetForm();
      await reload();
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        setError(t('errorDuplicate'));
      } else {
        setError(tAuth('errorGeneric'));
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function onDelete(id: string) {
    if (!confirm(t('deleteConfirm'))) return;
    try {
      await deletePromoCode(id);
      toast.success(tCommon('deleted'));
      await reload();
    } catch {
      toast.error(tAuth('errorGeneric'));
    }
  }

  return (
    <main className="mx-auto max-w-4xl px-6 py-10">
      <h1 className="text-2xl font-semibold">{t('title')}</h1>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{t('subtitle')}</p>

      <form onSubmit={onSubmit} className="mt-6 rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
        <h2 className="text-sm font-medium">
          {editingId ? t('editTitle') : t('newTitle')}
        </h2>
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <label className="flex flex-col gap-1 text-xs">
            {t('code')} *
            <input
              type="text"
              required
              minLength={2}
              maxLength={40}
              pattern="[A-Za-z0-9_\-]+"
              value={form.code}
              onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
              className="rounded-md border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
              placeholder="SUMMER15"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs">
            {t('type')} *
            <select
              value={form.type}
              onChange={(e) => setForm({ ...form, type: e.target.value as PromoCodeType })}
              className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
            >
              <option value="PERCENT">{t('typePercent')}</option>
              <option value="FIXED">{t('typeFixed')}</option>
            </select>
          </label>
          <label className="flex flex-col gap-1 text-xs">
            {form.type === 'PERCENT' ? t('valuePercent') : t('valueFixed')} *
            <input
              type="number"
              required
              min={0}
              step="0.01"
              value={form.value}
              onChange={(e) => setForm({ ...form, value: e.target.value })}
              className="rounded-md border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs">
            {t('minOrderTotal')}
            <input
              type="number"
              min={0}
              step="0.01"
              value={form.minOrderTotal}
              onChange={(e) => setForm({ ...form, minOrderTotal: e.target.value })}
              className="rounded-md border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs">
            {t('maxUses')}
            <input
              type="number"
              min={1}
              step={1}
              value={form.maxUses}
              onChange={(e) => setForm({ ...form, maxUses: e.target.value })}
              placeholder={t('maxUsesHint')}
              className="rounded-md border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
            />
          </label>
          <label className="flex items-center gap-2 text-xs">
            <input
              type="checkbox"
              checked={form.isActive}
              onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
            />
            {t('isActive')}
          </label>
          <label className="flex flex-col gap-1 text-xs">
            {t('validFrom')}
            <input
              type="date"
              value={form.validFrom}
              onChange={(e) => setForm({ ...form, validFrom: e.target.value })}
              className="rounded-md border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs">
            {t('validUntil')}
            <input
              type="date"
              value={form.validUntil}
              onChange={(e) => setForm({ ...form, validUntil: e.target.value })}
              className="rounded-md border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
            />
          </label>
        </div>
        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
        <div className="mt-3 flex gap-2">
          <button
            type="submit"
            disabled={submitting}
            className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-60 dark:bg-slate-200 dark:text-slate-900"
          >
            {submitting ? tAuth('submitting') : editingId ? tCommon('save') : t('create')}
          </button>
          {editingId && (
            <button
              type="button"
              onClick={resetForm}
              className="rounded-md border border-slate-300 px-3 py-2 text-sm hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              {tCommon('cancel')}
            </button>
          )}
        </div>
      </form>

      <section className="mt-6 overflow-x-auto rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500 dark:bg-slate-800/50 dark:text-slate-400">
            <tr>
              <th className="px-4 py-2 font-medium">{t('code')}</th>
              <th className="px-4 py-2 font-medium">{t('type')}</th>
              <th className="px-4 py-2 font-medium text-right">{t('value')}</th>
              <th className="px-4 py-2 font-medium text-right">{t('uses')}</th>
              <th className="px-4 py-2 font-medium">{t('validity')}</th>
              <th className="px-4 py-2 font-medium">{t('status')}</th>
              <th className="px-4 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={7} className="px-4 py-4 text-center text-slate-500">
                  {tCommon('loading')}
                </td>
              </tr>
            )}
            {!loading && items && items.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-4 text-center text-slate-500">
                  {t('empty')}
                </td>
              </tr>
            )}
            {items?.map((p) => (
              <tr key={p.id} className="border-t border-slate-100 dark:border-slate-800">
                <td className="px-4 py-2 font-mono text-sm">{p.code}</td>
                <td className="px-4 py-2">
                  {p.type === 'PERCENT' ? t('typePercent') : t('typeFixed')}
                </td>
                <td className="px-4 py-2 text-right">
                  {p.type === 'PERCENT' ? `${p.value}%` : formatMoney(p.value, locale)}
                </td>
                <td className="px-4 py-2 text-right text-xs text-slate-600 dark:text-slate-400">
                  {p.usedCount}
                  {p.maxUses !== null && ` / ${p.maxUses}`}
                </td>
                <td className="px-4 py-2 text-xs text-slate-600 dark:text-slate-400">
                  {p.validFrom && new Date(p.validFrom).toLocaleDateString()}
                  {(p.validFrom || p.validUntil) && ' – '}
                  {p.validUntil && new Date(p.validUntil).toLocaleDateString()}
                  {!p.validFrom && !p.validUntil && '—'}
                </td>
                <td className="px-4 py-2">
                  {p.isActive ? (
                    <span className="rounded bg-green-100 px-2 py-0.5 text-xs text-green-700 dark:bg-green-900/40 dark:text-green-300">
                      {t('statusActive')}
                    </span>
                  ) : (
                    <span className="rounded bg-slate-200 px-2 py-0.5 text-xs text-slate-600 dark:bg-slate-700 dark:text-slate-300">
                      {t('statusInactive')}
                    </span>
                  )}
                </td>
                <td className="px-4 py-2 text-right">
                  <button
                    type="button"
                    onClick={() => startEdit(p)}
                    className="mr-2 text-xs text-slate-700 hover:underline dark:text-slate-200"
                  >
                    {t('edit')}
                  </button>
                  <button
                    type="button"
                    onClick={() => onDelete(p.id)}
                    className="text-xs text-red-700 hover:underline dark:text-red-400"
                  >
                    {t('delete')}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </main>
  );
}
