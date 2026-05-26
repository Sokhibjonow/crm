'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { FormEvent, useCallback, useEffect, useState } from 'react';
import { type CustomerListResult, listCustomers } from '@/lib/customers';

const PAGE_SIZE = 25;

export default function CustomersPage({ params: { locale } }: { params: { locale: string } }) {
  const t = useTranslations('customers');

  const [q, setQ] = useState('');
  const [queryQ, setQueryQ] = useState('');
  const [page, setPage] = useState(1);
  const [data, setData] = useState<CustomerListResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await listCustomers({ q: queryQ || undefined, page, take: PAGE_SIZE });
      setData(res);
    } catch {
      setError('error');
    } finally {
      setLoading(false);
    }
  }, [queryQ, page]);

  useEffect(() => {
    load();
  }, [load]);

  function onSearch(e: FormEvent) {
    e.preventDefault();
    setPage(1);
    setQueryQ(q);
  }

  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.take)) : 1;

  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">{t('title')}</h1>
        <Link
          href={`/${locale}/customers/new`}
          className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white dark:bg-slate-200 dark:text-slate-900 hover:bg-slate-800"
        >
          + {t('addNew')}
        </Link>
      </div>

      <form onSubmit={onSearch} className="mt-6">
        <input
          type="search"
          placeholder={t('search')}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="w-full max-w-md rounded-md border border-slate-300 px-3 py-2 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 text-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
        />
      </form>

      <div className="mt-6 overflow-x-auto rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500 dark:bg-slate-800/50 dark:text-slate-400">
            <tr>
              <th className="px-4 py-2 font-medium">{t('name')}</th>
              <th className="px-4 py-2 font-medium">{t('phone')}</th>
              <th className="px-4 py-2 font-medium">{t('telegram')}</th>
              <th className="px-4 py-2 font-medium">{t('totalSpent')}</th>
              <th className="px-4 py-2 font-medium">{t('tags')}</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-slate-500">
                  …
                </td>
              </tr>
            )}
            {!loading && data && data.items.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-slate-500">
                  {t('noResults')}
                </td>
              </tr>
            )}
            {!loading &&
              data?.items.map((c) => (
                <tr key={c.id} className="border-t border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/50">
                  <td className="px-4 py-2">
                    <Link
                      href={`/${locale}/customers/${c.id}`}
                      className="font-medium text-slate-900 dark:text-slate-100 hover:underline"
                    >
                      {c.name}
                    </Link>
                  </td>
                  <td className="px-4 py-2 text-slate-700">{c.phone ?? '—'}</td>
                  <td className="px-4 py-2 text-slate-700">{c.telegram ?? '—'}</td>
                  <td className="px-4 py-2 text-slate-700">{c.totalSpent}</td>
                  <td className="px-4 py-2 text-slate-500">{c.tags.join(', ')}</td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

      {data && data.total > 0 && (
        <div className="mt-4 flex items-center justify-between text-sm text-slate-600 dark:text-slate-400">
          <span>
            {t('page')} {page} / {totalPages} · {data.total}
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="rounded-md border border-slate-300 px-3 py-1.5 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800 disabled:opacity-50"
            >
              ←
            </button>
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="rounded-md border border-slate-300 px-3 py-1.5 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800 disabled:opacity-50"
            >
              →
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
