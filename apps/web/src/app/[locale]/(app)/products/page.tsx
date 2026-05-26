'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { FormEvent, useCallback, useEffect, useState } from 'react';
import { formatMoney, formatStock } from '@/lib/format';
import {
  listProductCategories,
  listProducts,
  type ProductListResult,
} from '@/lib/products';

const PAGE_SIZE = 25;

interface Props {
  params: { locale: string };
}

export default function ProductsPage({ params: { locale } }: Props) {
  const t = useTranslations('products');

  const [q, setQ] = useState('');
  const [queryQ, setQueryQ] = useState('');
  const [category, setCategory] = useState('');
  const [lowStock, setLowStock] = useState(false);
  const [categories, setCategories] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  const [data, setData] = useState<ProductListResult | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    listProductCategories().then(setCategories).catch(() => {});
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await listProducts({
        q: queryQ || undefined,
        category: category || undefined,
        lowStock: lowStock || undefined,
        page,
        take: PAGE_SIZE,
      });
      setData(res);
    } finally {
      setLoading(false);
    }
  }, [queryQ, category, lowStock, page]);

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
          href={`/${locale}/products/new`}
          className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white dark:bg-slate-200 dark:text-slate-900 hover:bg-slate-800"
        >
          + {t('addNew')}
        </Link>
      </div>

      <div className="mt-6 flex flex-wrap items-end gap-3">
        <form onSubmit={onSearch} className="flex-1 min-w-[260px]">
          <input
            type="search"
            placeholder={t('search')}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="w-full rounded-md border border-slate-300 px-3 py-2 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 text-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
          />
        </form>
        <select
          value={category}
          onChange={(e) => {
            setPage(1);
            setCategory(e.target.value);
          }}
          className="rounded-md border border-slate-300 bg-white dark:border-slate-700 dark:bg-slate-900 px-3 py-2 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500 text-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500"
        >
          <option value="">{t('categoryAll')}</option>
          {categories.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={lowStock}
            onChange={(e) => {
              setPage(1);
              setLowStock(e.target.checked);
            }}
          />
          {t('lowStockOnly')}
        </label>
      </div>

      <div className="mt-6 overflow-x-auto rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500 dark:bg-slate-800/50 dark:text-slate-400">
            <tr>
              <th className="px-4 py-2 font-medium">{t('name')}</th>
              <th className="px-4 py-2 font-medium">{t('sku')}</th>
              <th className="px-4 py-2 font-medium">{t('category')}</th>
              <th className="px-4 py-2 font-medium text-right">{t('stock')}</th>
              <th className="px-4 py-2 font-medium text-right">{t('salePrice')}</th>
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
              data?.items.map((p) => {
                const low = p.lowStockThreshold > 0 && p.stock <= p.lowStockThreshold;
                return (
                  <tr key={p.id} className="border-t border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/50">
                    <td className="px-4 py-2">
                      <Link
                        href={`/${locale}/products/${p.id}`}
                        className="font-medium text-slate-900 dark:text-slate-100 hover:underline"
                      >
                        {p.name}
                      </Link>
                      {!p.isActive && (
                        <span className="ml-2 rounded bg-slate-200 px-1.5 py-0.5 text-xs text-slate-600 dark:bg-slate-700 dark:text-slate-300">
                          ✕
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-2 text-slate-700">{p.sku ?? '—'}</td>
                    <td className="px-4 py-2 text-slate-700">{p.category ?? '—'}</td>
                    <td className="px-4 py-2 text-right">
                      <span className={low ? 'font-semibold text-red-600' : 'text-slate-700'}>
                        {formatStock(p.stock, locale)}
                      </span>
                      {low && (
                        <span className="ml-2 rounded bg-red-100 px-1.5 py-0.5 text-xs text-red-700 dark:bg-red-900/40 dark:text-red-300">
                          {t('lowStockBadge')}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-2 text-right text-slate-700">
                      {formatMoney(p.salePrice, locale)}
                    </td>
                  </tr>
                );
              })}
          </tbody>
        </table>
      </div>

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
