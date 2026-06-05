'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { FormEvent, useCallback, useEffect, useState } from 'react';
import { EmptyState } from '@/components/empty-state';
import { useCurrentUser } from '@/lib/current-user';
import { formatMoney } from '@/lib/format';
import {
  downloadOrdersExport,
  listOrders,
  type OrderListResult,
  type OrderStatus,
} from '@/lib/orders';
import { OrderStatusBadge, PaymentStatusBadge } from './_components/status-badge';

const PAGE_SIZE = 25;
const STATUSES: OrderStatus[] = [
  'NEW',
  'CONFIRMED',
  'PACKING',
  'SHIPPED',
  'DELIVERED',
  'CANCELLED',
];

interface Props {
  params: { locale: string };
}

export default function OrdersPage({ params: { locale } }: Props) {
  const t = useTranslations('orders');
  const tStatuses = useTranslations('orders.statusValues');
  const tExtra = useTranslations('ordersExtra');
  const { can } = useCurrentUser();

  const [q, setQ] = useState('');
  const [queryQ, setQueryQ] = useState('');
  const [status, setStatus] = useState<OrderStatus | ''>('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [page, setPage] = useState(1);
  const [data, setData] = useState<OrderListResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState<'csv' | 'xlsx' | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);

  const filters = {
    q: queryQ || undefined,
    status: status || undefined,
    dateFrom: dateFrom || undefined,
    dateTo: dateTo || undefined,
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await listOrders({ ...filters, page, take: PAGE_SIZE });
      setData(res);
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queryQ, status, dateFrom, dateTo, page]);

  useEffect(() => {
    load();
  }, [load]);

  function onSearch(e: FormEvent) {
    e.preventDefault();
    setPage(1);
    setQueryQ(q);
  }

  function onDateChange(which: 'from' | 'to', value: string) {
    setPage(1);
    if (which === 'from') setDateFrom(value);
    else setDateTo(value);
  }

  function clearDates() {
    setPage(1);
    setDateFrom('');
    setDateTo('');
  }

  async function onExport(format: 'csv' | 'xlsx') {
    setExporting(format);
    setExportError(null);
    try {
      await downloadOrdersExport(filters, format);
    } catch {
      setExportError(tExtra('exportFailed'));
    } finally {
      setExporting(null);
    }
  }

  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.take)) : 1;

  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">{t('title')}</h1>
        {can('order.create') && (
          <Link
            href={`/${locale}/orders/new`}
            className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white dark:bg-slate-200 dark:text-slate-900 hover:bg-slate-800"
          >
            + {t('addNew')}
          </Link>
        )}
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
          value={status}
          onChange={(e) => {
            setPage(1);
            setStatus(e.target.value as OrderStatus | '');
          }}
          className="rounded-md border border-slate-300 bg-white dark:border-slate-700 dark:bg-slate-900 px-3 py-2 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500 text-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500"
        >
          <option value="">{t('allStatuses')}</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {tStatuses(s)}
            </option>
          ))}
        </select>
      </div>

      <div className="mt-3 flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1 text-xs text-slate-500 dark:text-slate-400">
          {tExtra('dateFrom')}
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => onDateChange('from', e.target.value)}
            className="rounded-md border border-slate-300 px-3 py-2 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 text-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 text-slate-900"
          />
        </label>
        <label className="flex flex-col gap-1 text-xs text-slate-500 dark:text-slate-400">
          {tExtra('dateTo')}
          <input
            type="date"
            value={dateTo}
            onChange={(e) => onDateChange('to', e.target.value)}
            className="rounded-md border border-slate-300 px-3 py-2 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 text-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 text-slate-900"
          />
        </label>
        {(dateFrom || dateTo) && (
          <button
            type="button"
            onClick={clearDates}
            className="rounded-md border border-slate-300 px-3 py-2 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 text-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 hover:bg-slate-50"
          >
            {tExtra('clearDates')}
          </button>
        )}
        <div className="ml-auto flex items-center gap-2">
          <span className="text-xs text-slate-500 dark:text-slate-400">{tExtra('export')}:</span>
          <button
            type="button"
            onClick={() => onExport('csv')}
            disabled={exporting !== null}
            className="rounded-md border border-slate-300 px-3 py-2 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 text-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 hover:bg-slate-50 disabled:opacity-60"
          >
            {exporting === 'csv' ? '…' : tExtra('exportCsv')}
          </button>
          <button
            type="button"
            onClick={() => onExport('xlsx')}
            disabled={exporting !== null}
            className="rounded-md border border-slate-300 px-3 py-2 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 text-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 hover:bg-slate-50 disabled:opacity-60"
          >
            {exporting === 'xlsx' ? '…' : tExtra('exportXlsx')}
          </button>
        </div>
      </div>

      {exportError && <p className="mt-2 text-sm text-red-600">{exportError}</p>}

      {!loading && data && data.total === 0 && !queryQ && !status && !dateFrom && !dateTo ? (
        <div className="mt-6 rounded-lg border border-dashed border-slate-300 bg-white dark:border-slate-700 dark:bg-slate-900">
          <EmptyState
            title={t('noResults')}
            description={t('search')}
            cta={
              can('order.create')
                ? { href: `/${locale}/orders/new`, label: `+ ${t('addNew')}` }
                : undefined
            }
          />
        </div>
      ) : (
      <div className="mt-6 overflow-x-auto rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500 dark:bg-slate-800/50 dark:text-slate-400">
            <tr>
              <th className="px-4 py-2 font-medium">{t('orderNumber')}</th>
              <th className="px-4 py-2 font-medium">{t('customer')}</th>
              <th className="px-4 py-2 font-medium">{t('status')}</th>
              <th className="px-4 py-2 font-medium">{t('paymentStatus')}</th>
              <th className="px-4 py-2 font-medium text-right">{t('total')}</th>
              <th className="px-4 py-2 font-medium text-right">{t('items')}</th>
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
                  {t('noResults')}
                </td>
              </tr>
            )}
            {!loading &&
              data?.items.map((o) => (
                <tr key={o.id} className="border-t border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/50">
                  <td className="px-4 py-2">
                    <Link
                      href={`/${locale}/orders/${o.id}`}
                      className="font-medium text-slate-900 dark:text-slate-100 hover:underline"
                    >
                      #{o.number}
                    </Link>
                  </td>
                  <td className="px-4 py-2 text-slate-700">
                    {o.customer ? o.customer.name : <span className="text-slate-400">—</span>}
                  </td>
                  <td className="px-4 py-2">
                    <OrderStatusBadge status={o.status} />
                  </td>
                  <td className="px-4 py-2">
                    <PaymentStatusBadge status={o.paymentStatus} />
                  </td>
                  <td className="px-4 py-2 text-right text-slate-700">
                    {formatMoney(o.total, locale)}
                  </td>
                  <td className="px-4 py-2 text-right text-slate-500">{o._count.items}</td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
      )}

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
