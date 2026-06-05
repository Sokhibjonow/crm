'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { formatMoney } from '@/lib/format';
import { listOrders, type OrderListItem } from '@/lib/orders';
import {
  OrderStatusBadge,
  PaymentStatusBadge,
} from '../../../orders/_components/status-badge';

interface Props {
  customerId: string;
  locale: string;
}

export function CustomerOrderHistory({ customerId, locale }: Props) {
  const t = useTranslations('orders');
  const [orders, setOrders] = useState<OrderListItem[] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    listOrders({ customerId, take: 50 })
      .then((res) => {
        if (!cancelled) setOrders(res.items);
      })
      .catch(() => {
        if (!cancelled) setOrders([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [customerId]);

  return (
    <section className="mt-10">
      <h2 className="mb-2 text-sm font-medium text-slate-700 dark:text-slate-300">
        {t('title')}
      </h2>
      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500 dark:bg-slate-800/50 dark:text-slate-400">
            <tr>
              <th className="px-4 py-2 font-medium">{t('orderNumber')}</th>
              <th className="px-4 py-2 font-medium">{t('createdAt')}</th>
              <th className="px-4 py-2 font-medium">{t('status')}</th>
              <th className="px-4 py-2 font-medium">{t('paymentStatus')}</th>
              <th className="px-4 py-2 font-medium text-right">{t('total')}</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td
                  colSpan={5}
                  className="px-4 py-6 text-center text-slate-500 dark:text-slate-400"
                >
                  …
                </td>
              </tr>
            )}
            {!loading && orders && orders.length === 0 && (
              <tr>
                <td
                  colSpan={5}
                  className="px-4 py-6 text-center text-slate-500 dark:text-slate-400"
                >
                  {t('noResults')}
                </td>
              </tr>
            )}
            {!loading &&
              orders?.map((o) => (
                <tr
                  key={o.id}
                  className="border-t border-slate-100 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/50"
                >
                  <td className="px-4 py-2">
                    <Link
                      href={`/${locale}/orders/${o.id}`}
                      className="font-medium text-slate-900 hover:underline dark:text-slate-100"
                    >
                      #{o.number}
                    </Link>
                  </td>
                  <td className="px-4 py-2 text-slate-500 dark:text-slate-400">
                    {new Date(o.createdAt).toLocaleDateString(
                      locale === 'uz' ? 'uz-Latn-UZ' : 'ru-RU',
                    )}
                  </td>
                  <td className="px-4 py-2">
                    <OrderStatusBadge status={o.status} />
                  </td>
                  <td className="px-4 py-2">
                    <PaymentStatusBadge status={o.paymentStatus} />
                  </td>
                  <td className="px-4 py-2 text-right text-slate-700 dark:text-slate-300">
                    {formatMoney(o.total, locale)}
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
