'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { type DashboardSummary, getDashboardSummary } from '@/lib/dashboard';
import { formatMoney, formatStock } from '@/lib/format';
import {
  OrderStatusBadge,
  PaymentStatusBadge,
} from '../orders/_components/status-badge';

interface Props {
  params: { locale: string };
}

function StatCard({
  label,
  value,
  href,
  highlight,
}: {
  label: string;
  value: string;
  href?: string;
  highlight?: boolean;
}) {
  const content = (
    <div
      className={`rounded-lg border p-5 shadow-sm ${
        highlight ? 'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950/30' : 'border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900'
      }`}
    >
      <div className={`text-sm ${highlight ? 'text-red-700 dark:text-red-400' : 'text-slate-500 dark:text-slate-400'}`}>{label}</div>
      <div className="mt-2 text-2xl font-semibold">{value}</div>
    </div>
  );
  return href ? (
    <Link href={href} className="block hover:opacity-90">
      {content}
    </Link>
  ) : (
    content
  );
}

export default function DashboardPage({ params: { locale } }: Props) {
  const t = useTranslations('dashboard');
  const tOrders = useTranslations('orders');
  const [data, setData] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    getDashboardSummary()
      .then((d) => {
        if (!cancelled) setData(d);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <h1 className="text-2xl font-semibold">{t('title')}</h1>

      <section className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label={t('ordersToday')}
          value={data ? formatStock(data.ordersToday, locale) : '—'}
        />
        <StatCard
          label={t('revenueToday')}
          value={data ? formatMoney(data.revenueToday, locale) : '—'}
        />
        <StatCard
          label={t('pendingOrders')}
          value={data ? formatStock(data.pendingOrders, locale) : '—'}
          href={`/${locale}/orders?status=NEW`}
        />
        <StatCard
          label={t('lowStock')}
          value={data ? formatStock(data.lowStockProducts, locale) : '—'}
          href={`/${locale}/inventory`}
          highlight={!!data && data.lowStockProducts > 0}
        />
      </section>

      <div className="mt-10 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <section>
          <div className="flex items-baseline justify-between">
            <h2 className="text-sm font-medium text-slate-700 dark:text-slate-300">{t('recentOrders')}</h2>
            <Link
              href={`/${locale}/orders`}
              className="text-xs text-slate-500 hover:text-slate-900 hover:underline dark:text-slate-400 dark:hover:text-slate-100"
            >
              {t('viewAll')} →
            </Link>
          </div>
          <div className="mt-2 overflow-x-auto rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500 dark:bg-slate-800/50 dark:text-slate-400">
                <tr>
                  <th className="px-3 py-2 font-medium">{tOrders('orderNumber')}</th>
                  <th className="px-3 py-2 font-medium">{tOrders('customer')}</th>
                  <th className="px-3 py-2 font-medium">{tOrders('status')}</th>
                  <th className="px-3 py-2 font-medium text-right">{tOrders('total')}</th>
                </tr>
              </thead>
              <tbody>
                {loading && (
                  <tr>
                    <td colSpan={4} className="px-3 py-4 text-center text-slate-500 dark:text-slate-400">
                      …
                    </td>
                  </tr>
                )}
                {!loading && data && data.recentOrders.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-3 py-4 text-center text-slate-500 dark:text-slate-400">
                      —
                    </td>
                  </tr>
                )}
                {!loading &&
                  data?.recentOrders.map((o) => (
                    <tr key={o.id} className="border-t border-slate-100 dark:border-slate-800">
                      <td className="px-3 py-2">
                        <Link
                          href={`/${locale}/orders/${o.id}`}
                          className="font-medium hover:underline"
                        >
                          #{o.number}
                        </Link>
                      </td>
                      <td className="px-3 py-2 text-slate-700 dark:text-slate-300">
                        {o.customer?.name ?? <span className="text-slate-400 dark:text-slate-500">—</span>}
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex flex-wrap gap-1">
                          <OrderStatusBadge status={o.status} />
                          <PaymentStatusBadge status={o.paymentStatus} />
                        </div>
                      </td>
                      <td className="px-3 py-2 text-right">{formatMoney(o.total, locale)}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </section>

        <section>
          <div className="flex items-baseline justify-between">
            <h2 className="text-sm font-medium text-slate-700 dark:text-slate-300">{t('topProducts')}</h2>
            <Link
              href={`/${locale}/products`}
              className="text-xs text-slate-500 hover:text-slate-900 hover:underline dark:text-slate-400 dark:hover:text-slate-100"
            >
              {t('viewAll')} →
            </Link>
          </div>
          <div className="mt-2 overflow-x-auto rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500 dark:bg-slate-800/50 dark:text-slate-400">
                <tr>
                  <th className="px-3 py-2 font-medium">{tOrders('selectProduct')}</th>
                  <th className="px-3 py-2 font-medium text-right">{t('topProductsQty')}</th>
                  <th className="px-3 py-2 font-medium text-right">
                    {t('topProductsRevenue')}
                  </th>
                </tr>
              </thead>
              <tbody>
                {loading && (
                  <tr>
                    <td colSpan={3} className="px-3 py-4 text-center text-slate-500 dark:text-slate-400">
                      …
                    </td>
                  </tr>
                )}
                {!loading && data && data.topProducts.length === 0 && (
                  <tr>
                    <td colSpan={3} className="px-3 py-4 text-center text-slate-500 dark:text-slate-400">
                      —
                    </td>
                  </tr>
                )}
                {!loading &&
                  data?.topProducts.map((p) => (
                    <tr key={p.id} className="border-t border-slate-100 dark:border-slate-800">
                      <td className="px-3 py-2">
                        <Link
                          href={`/${locale}/products/${p.id}`}
                          className="font-medium hover:underline"
                        >
                          {p.name}
                        </Link>
                        {p.sku && (
                          <span className="ml-2 text-xs text-slate-500 dark:text-slate-400">{p.sku}</span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-right">{formatStock(p.qty, locale)}</td>
                      <td className="px-3 py-2 text-right">{formatMoney(p.revenue, locale)}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  );
}
