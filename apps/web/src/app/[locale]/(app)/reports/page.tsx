'use client';

import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useState } from 'react';
import { formatMoney, formatStock } from '@/lib/format';
import { getReportsSummary, type ReportsSummary } from '@/lib/reports';
import { OrderStatusBadge } from '../orders/_components/status-badge';
import { DailyRevenueBars } from './_components/daily-revenue-bars';

const RANGES = [7, 30, 90] as const;

interface Props {
  params: { locale: string };
}

export default function ReportsPage({ params: { locale } }: Props) {
  const t = useTranslations('reports');

  const [days, setDays] = useState<number>(30);
  const [data, setData] = useState<ReportsSummary | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getReportsSummary(days);
      setData(res);
    } finally {
      setLoading(false);
    }
  }, [days]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">{t('title')}</h1>
        <div className="flex items-center gap-2 text-sm">
          <span className="text-slate-500">{t('range')}:</span>
          {RANGES.map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setDays(r)}
              className={
                r === days
                  ? 'rounded-md bg-slate-900 px-3 py-1.5 text-white'
                  : 'rounded-md border border-slate-300 px-3 py-1.5 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800 hover:bg-slate-50'
              }
            >
              {r === 7 ? t('last7') : r === 30 ? t('last30') : t('last90')}
            </button>
          ))}
        </div>
      </div>

      <section className="mt-6">
        <div className="rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 p-5 dark:border-slate-800 dark:bg-slate-900">
          <div className="text-sm text-slate-500 dark:text-slate-400">{t('totalRevenue')}</div>
          <div className="mt-1 text-3xl font-semibold">
            {data ? formatMoney(data.totalRevenue, locale) : '…'}
          </div>
        </div>
      </section>

      <section className="mt-6">
        <h2 className="mb-2 text-sm font-medium text-slate-700">{t('dailyRevenue')}</h2>
        {loading || !data ? (
          <div className="h-44 rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900" />
        ) : (
          <DailyRevenueBars data={data.daily} locale={locale} />
        )}
      </section>

      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <section>
          <h2 className="mb-2 text-sm font-medium text-slate-700">{t('statusBreakdown')}</h2>
          <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500 dark:bg-slate-800/50 dark:text-slate-400">
                <tr>
                  <th className="px-3 py-2 font-medium">{t('statusBreakdown')}</th>
                  <th className="px-3 py-2 font-medium text-right">{t('count')}</th>
                  <th className="px-3 py-2 font-medium text-right">{t('revenue')}</th>
                </tr>
              </thead>
              <tbody>
                {(!data || data.statusBreakdown.length === 0) && (
                  <tr>
                    <td colSpan={3} className="px-3 py-4 text-center text-slate-500">
                      {loading ? '…' : '—'}
                    </td>
                  </tr>
                )}
                {data?.statusBreakdown.map((row) => (
                  <tr key={row.status} className="border-t border-slate-100 dark:border-slate-800">
                    <td className="px-3 py-2">
                      <OrderStatusBadge status={row.status} />
                    </td>
                    <td className="px-3 py-2 text-right">{formatStock(row.count, locale)}</td>
                    <td className="px-3 py-2 text-right">{formatMoney(row.total, locale)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section>
          <h2 className="mb-2 text-sm font-medium text-slate-700">{t('staff')}</h2>
          <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500 dark:bg-slate-800/50 dark:text-slate-400">
                <tr>
                  <th className="px-3 py-2 font-medium">{t('user')}</th>
                  <th className="px-3 py-2 font-medium text-right">{t('orders')}</th>
                  <th className="px-3 py-2 font-medium text-right">{t('revenue')}</th>
                </tr>
              </thead>
              <tbody>
                {(!data || data.staff.length === 0) && (
                  <tr>
                    <td colSpan={3} className="px-3 py-4 text-center text-slate-500">
                      {loading ? '…' : '—'}
                    </td>
                  </tr>
                )}
                {data?.staff.map((row, idx) => (
                  <tr key={row.userId ?? `unknown-${idx}`} className="border-t border-slate-100 dark:border-slate-800">
                    <td className="px-3 py-2">
                      <div className="font-medium">{row.name ?? t('unknown')}</div>
                      {row.email && <div className="text-xs text-slate-500 dark:text-slate-400">{row.email}</div>}
                    </td>
                    <td className="px-3 py-2 text-right">{formatStock(row.orders, locale)}</td>
                    <td className="px-3 py-2 text-right">{formatMoney(row.revenue, locale)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      <section className="mt-8">
        <h2 className="mb-2 text-sm font-medium text-slate-700">{t('topProducts')}</h2>
        <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500 dark:bg-slate-800/50 dark:text-slate-400">
              <tr>
                <th className="px-3 py-2 font-medium">{t('product')}</th>
                <th className="px-3 py-2 font-medium text-right">{t('soldQty')}</th>
                <th className="px-3 py-2 font-medium text-right">{t('revenue')}</th>
                <th className="px-3 py-2 font-medium text-right">{t('inStock')}</th>
              </tr>
            </thead>
            <tbody>
              {(!data || data.topProducts.length === 0) && (
                <tr>
                  <td colSpan={4} className="px-3 py-4 text-center text-slate-500">
                    {loading ? '…' : '—'}
                  </td>
                </tr>
              )}
              {data?.topProducts.map((row) => (
                <tr key={row.id} className="border-t border-slate-100 dark:border-slate-800">
                  <td className="px-3 py-2">
                    <div className="font-medium">{row.name}</div>
                    {row.sku && <div className="text-xs text-slate-500 dark:text-slate-400">{row.sku}</div>}
                  </td>
                  <td className="px-3 py-2 text-right">{formatStock(row.qty, locale)}</td>
                  <td className="px-3 py-2 text-right">{formatMoney(row.revenue, locale)}</td>
                  <td className="px-3 py-2 text-right">{formatStock(row.stock, locale)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-8">
        <h2 className="mb-2 text-sm font-medium text-slate-700">{t('topCustomers')}</h2>
        <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500 dark:bg-slate-800/50 dark:text-slate-400">
              <tr>
                <th className="px-3 py-2 font-medium">{t('topCustomers')}</th>
                <th className="px-3 py-2 font-medium text-right">{t('orders')}</th>
                <th className="px-3 py-2 font-medium text-right">{t('revenue')}</th>
              </tr>
            </thead>
            <tbody>
              {(!data || data.topCustomers.length === 0) && (
                <tr>
                  <td colSpan={3} className="px-3 py-4 text-center text-slate-500">
                    {loading ? '…' : '—'}
                  </td>
                </tr>
              )}
              {data?.topCustomers.map((row) => (
                <tr key={row.id} className="border-t border-slate-100 dark:border-slate-800">
                  <td className="px-3 py-2">
                    <div className="font-medium">{row.name}</div>
                    {row.phone && <div className="text-xs text-slate-500 dark:text-slate-400">{row.phone}</div>}
                  </td>
                  <td className="px-3 py-2 text-right">{formatStock(row.orders, locale)}</td>
                  <td className="px-3 py-2 text-right">{formatMoney(row.total, locale)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
