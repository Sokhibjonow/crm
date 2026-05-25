'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useState } from 'react';
import { formatStock } from '@/lib/format';
import { listProducts, type Product, type ProductListResult } from '@/lib/products';
import { StockAdjustButton } from '../products/_components/stock-adjust-button';

const PAGE_SIZE = 50;

interface Props {
  params: { locale: string };
}

export default function InventoryPage({ params: { locale } }: Props) {
  const t = useTranslations('inventory');
  const tProducts = useTranslations('products');

  const [lowOnly, setLowOnly] = useState(true);
  const [page, setPage] = useState(1);
  const [data, setData] = useState<ProductListResult | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await listProducts({
        lowStock: lowOnly || undefined,
        page,
        take: PAGE_SIZE,
      });
      setData(res);
    } finally {
      setLoading(false);
    }
  }, [lowOnly, page]);

  useEffect(() => {
    load();
  }, [load]);

  function handleAdjusted(updated: Product) {
    setData((prev) =>
      prev
        ? {
            ...prev,
            items: prev.items.map((p) => (p.id === updated.id ? updated : p)),
          }
        : prev,
    );
  }

  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.take)) : 1;

  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <h1 className="text-2xl font-semibold">{t('title')}</h1>
      {lowOnly && <p className="mt-2 text-sm text-slate-500">{t('lowStockHint')}</p>}

      <div className="mt-6 flex items-center justify-between">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={!lowOnly}
            onChange={(e) => {
              setPage(1);
              setLowOnly(!e.target.checked);
            }}
          />
          {t('showAll')}
        </label>
      </div>

      <div className="mt-4 overflow-hidden rounded-lg border border-slate-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-2 font-medium">{tProducts('name')}</th>
              <th className="px-4 py-2 font-medium">{tProducts('sku')}</th>
              <th className="px-4 py-2 font-medium text-right">{tProducts('stock')}</th>
              <th className="px-4 py-2 font-medium text-right">
                {tProducts('lowStockThreshold')}
              </th>
              <th className="px-4 py-2 font-medium">{tProducts('category')}</th>
              <th className="px-4 py-2 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-slate-500">
                  …
                </td>
              </tr>
            )}
            {!loading && data && data.items.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-slate-500">
                  {tProducts('noResults')}
                </td>
              </tr>
            )}
            {!loading &&
              data?.items.map((p) => {
                const low = p.lowStockThreshold > 0 && p.stock <= p.lowStockThreshold;
                return (
                  <tr key={p.id} className="border-t border-slate-100">
                    <td className="px-4 py-2">
                      <Link
                        href={`/${locale}/products/${p.id}`}
                        className="font-medium text-slate-900 hover:underline"
                      >
                        {p.name}
                      </Link>
                    </td>
                    <td className="px-4 py-2 text-slate-700">{p.sku ?? '—'}</td>
                    <td className="px-4 py-2 text-right">
                      <span className={low ? 'font-semibold text-red-600' : 'text-slate-700'}>
                        {formatStock(p.stock, locale)}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-right text-slate-700">
                      {formatStock(p.lowStockThreshold, locale)}
                    </td>
                    <td className="px-4 py-2 text-slate-700">{p.category ?? '—'}</td>
                    <td className="px-4 py-2 text-right">
                      <StockAdjustButton product={p} onAdjusted={handleAdjusted} />
                    </td>
                  </tr>
                );
              })}
          </tbody>
        </table>
      </div>

      {data && data.total > 0 && (
        <div className="mt-4 flex items-center justify-between text-sm text-slate-600">
          <span>
            {tProducts('page')} {page} / {totalPages} · {data.total}
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="rounded-md border border-slate-300 px-3 py-1.5 disabled:opacity-50"
            >
              ←
            </button>
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="rounded-md border border-slate-300 px-3 py-1.5 disabled:opacity-50"
            >
              →
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
