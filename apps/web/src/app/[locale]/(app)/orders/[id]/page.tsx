'use client';

import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { useCurrentUser } from '@/lib/current-user';
import { formatMoney } from '@/lib/format';
import { getOrder, removeOrderItem, type Order } from '@/lib/orders';
import { AddPaymentForm } from '../_components/add-payment-form';
import { OrderStatusBadge, PaymentStatusBadge } from '../_components/status-badge';
import { StatusActions } from '../_components/status-actions';

interface Props {
  params: { locale: string; id: string };
}

export default function OrderDetailPage({ params: { locale, id } }: Props) {
  const t = useTranslations('orders');
  const tMethods = useTranslations('orders.methodValues');
  const { can } = useCurrentUser();
  const [order, setOrder] = useState<Order | null>(null);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getOrder(id)
      .then((o) => {
        if (!cancelled) setOrder(o);
      })
      .catch(() => {
        if (!cancelled) setLoadError(true);
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  async function handleRemoveItem(itemId: string) {
    if (!order) return;
    try {
      const updated = await removeOrderItem(order.id, itemId);
      setOrder(updated);
    } catch {
      // surface via reload
    }
  }

  if (loadError) {
    return (
      <main className="mx-auto max-w-4xl px-6 py-10">
        <p className="text-sm text-red-600">{t('noResults')}</p>
      </main>
    );
  }

  if (!order) {
    return (
      <main className="mx-auto max-w-4xl px-6 py-10">
        <p className="text-sm text-slate-500 dark:text-slate-400">…</p>
      </main>
    );
  }

  const remaining = Number(order.total) - Number(order.paidAmount);
  const editable = order.status === 'NEW' && can('order.edit');
  const canAddPayment = can('order.payment.add');

  return (
    <main className="mx-auto max-w-4xl px-6 py-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-semibold">
            {t('orderNumber')}{order.number}
          </h1>
          <OrderStatusBadge status={order.status} />
          <PaymentStatusBadge status={order.paymentStatus} />
        </div>
        <StatusActions order={order} onUpdated={setOrder} />
      </div>

      <section className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-3">
        <div>
          <h2 className="text-xs uppercase text-slate-500">{t('customer')}</h2>
          <p className="mt-1 text-sm">
            {order.customer ? (
              <>
                <span className="font-medium">{order.customer.name}</span>
                {order.customer.phone && (
                  <span className="ml-2 text-slate-500">{order.customer.phone}</span>
                )}
              </>
            ) : (
              <span className="text-slate-400">{t('noCustomer')}</span>
            )}
          </p>
        </div>
        <div>
          <h2 className="text-xs uppercase text-slate-500">{t('total')}</h2>
          <p className="mt-1 text-lg font-semibold">{formatMoney(order.total, locale)}</p>
        </div>
        <div>
          <h2 className="text-xs uppercase text-slate-500">{t('remaining')}</h2>
          <p className="mt-1 text-lg font-semibold">{formatMoney(remaining, locale)}</p>
        </div>
      </section>

      <section className="mt-8">
        <h2 className="mb-2 text-sm font-medium text-slate-700">{t('items')}</h2>
        <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500 dark:bg-slate-800/50 dark:text-slate-400">
              <tr>
                <th className="px-4 py-2 font-medium">{t('selectProduct')}</th>
                <th className="px-4 py-2 font-medium text-right">{t('qty')}</th>
                <th className="px-4 py-2 font-medium text-right">{t('unitPrice')}</th>
                <th className="px-4 py-2 font-medium text-right">{t('lineTotal')}</th>
                {editable && <th className="px-4 py-2"></th>}
              </tr>
            </thead>
            <tbody>
              {order.items.map((it) => (
                <tr key={it.id} className="border-t border-slate-100 dark:border-slate-800">
                  <td className="px-4 py-2">
                    <div className="font-medium">{it.product.name}</div>
                    {it.product.sku && (
                      <div className="text-xs text-slate-500 dark:text-slate-400">{it.product.sku}</div>
                    )}
                  </td>
                  <td className="px-4 py-2 text-right">{it.qty}</td>
                  <td className="px-4 py-2 text-right">{formatMoney(it.unitPrice, locale)}</td>
                  <td className="px-4 py-2 text-right">{formatMoney(it.lineTotal, locale)}</td>
                  {editable && (
                    <td className="px-4 py-2 text-right">
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(it.id)}
                        className="rounded-md border border-red-300 px-2 py-1 text-xs text-red-700 hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-950/40"
                      >
                        {t('removeItem')}
                      </button>
                    </td>
                  )}
                </tr>
              ))}
              <tr className="border-t border-slate-200 bg-slate-50 text-sm">
                <td colSpan={3} className="px-4 py-2 text-right text-slate-500">
                  {t('subtotal')}
                </td>
                <td className="px-4 py-2 text-right">{formatMoney(order.subtotal, locale)}</td>
                {editable && <td></td>}
              </tr>
              <tr className="bg-slate-50 text-sm">
                <td colSpan={3} className="px-4 py-2 text-right text-slate-500">
                  {t('discount')}
                </td>
                <td className="px-4 py-2 text-right">−{formatMoney(order.discount, locale)}</td>
                {editable && <td></td>}
              </tr>
              <tr className="bg-slate-50 text-sm font-semibold">
                <td colSpan={3} className="px-4 py-2 text-right">
                  {t('total')}
                </td>
                <td className="px-4 py-2 text-right">{formatMoney(order.total, locale)}</td>
                {editable && <td></td>}
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {order.notes && (
        <section className="mt-6">
          <h2 className="mb-1 text-xs uppercase text-slate-500">{t('notes')}</h2>
          <p className="text-sm text-slate-700 dark:text-slate-300">{order.notes}</p>
        </section>
      )}

      {order.status !== 'CANCELLED' && canAddPayment && (
        <section className="mt-8">
          <AddPaymentForm order={order} onAdded={setOrder} />
        </section>
      )}

      <section className="mt-8">
        <h2 className="mb-2 text-sm font-medium text-slate-700">{t('payments')}</h2>
        {order.payments.length === 0 ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">{t('noPayments')}</p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500 dark:bg-slate-800/50 dark:text-slate-400">
                <tr>
                  <th className="px-4 py-2 font-medium">{t('paymentMethod')}</th>
                  <th className="px-4 py-2 font-medium text-right">{t('paymentAmount')}</th>
                  <th className="px-4 py-2 font-medium">{t('paymentReference')}</th>
                  <th className="px-4 py-2 font-medium">{t('createdAt')}</th>
                </tr>
              </thead>
              <tbody>
                {order.payments.map((p) => (
                  <tr key={p.id} className="border-t border-slate-100 dark:border-slate-800">
                    <td className="px-4 py-2">{tMethods(p.method)}</td>
                    <td className="px-4 py-2 text-right">{formatMoney(p.amount, locale)}</td>
                    <td className="px-4 py-2 text-slate-500">{p.reference ?? '—'}</td>
                    <td className="px-4 py-2 text-slate-500">
                      {new Date(p.createdAt).toLocaleString(
                        locale === 'uz' ? 'uz-Latn-UZ' : 'ru-RU',
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}
