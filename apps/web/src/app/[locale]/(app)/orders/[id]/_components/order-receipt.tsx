'use client';

import { useTranslations } from 'next-intl';
import { useCurrentUser } from '@/lib/current-user';
import { formatMoney } from '@/lib/format';
import type { Order } from '@/lib/orders';

interface Props {
  order: Order;
  locale: string;
}

/**
 * Receipt body — hidden on screen, visible only when the browser prints.
 * `globals.css` adds print:* rules so the screen UI is hidden during print.
 */
export function OrderReceipt({ order, locale }: Props) {
  const t = useTranslations('orders');
  const tMethods = useTranslations('orders.methodValues');
  const tCommon = useTranslations('common');
  const { user } = useCurrentUser();

  const date = new Date(order.createdAt);
  const localeTag = locale === 'uz' ? 'uz-Latn-UZ' : 'ru-RU';

  return (
    <div className="hidden print:block">
      <div className="mx-auto max-w-md p-6 text-black">
        <header className="border-b border-black/40 pb-3 text-center">
          <h1 className="text-xl font-bold uppercase">
            {user?.storeName ?? tCommon('appName')}
          </h1>
          <p className="mt-1 text-xs">
            {date.toLocaleString(localeTag)}
          </p>
        </header>

        <div className="mt-4 text-sm">
          <div className="flex justify-between">
            <span>{t('orderNumber')}</span>
            <span className="font-semibold">#{order.number}</span>
          </div>
          {order.customer && (
            <div className="mt-1 flex justify-between">
              <span>{t('customer')}</span>
              <span>{order.customer.name}</span>
            </div>
          )}
          {order.customer?.phone && (
            <div className="mt-1 flex justify-between">
              <span>{t('phone' as never) || 'Phone'}</span>
              <span>{order.customer.phone}</span>
            </div>
          )}
        </div>

        <table className="mt-4 w-full text-sm">
          <thead className="border-b border-black/40">
            <tr>
              <th className="py-1 text-left font-medium">{t('selectProduct')}</th>
              <th className="py-1 text-right font-medium">{t('qty')}</th>
              <th className="py-1 text-right font-medium">{t('lineTotal')}</th>
            </tr>
          </thead>
          <tbody>
            {order.items.map((it) => (
              <tr key={it.id} className="border-b border-black/10 align-top">
                <td className="py-1 pr-2">
                  <div>{it.product.name}</div>
                  <div className="text-xs">
                    {it.qty} × {formatMoney(it.unitPrice, locale)}
                  </div>
                </td>
                <td className="py-1 text-right">{it.qty}</td>
                <td className="py-1 text-right">{formatMoney(it.lineTotal, locale)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="mt-3 space-y-1 border-t border-black/40 pt-2 text-sm">
          <div className="flex justify-between">
            <span>{t('subtotal')}</span>
            <span>{formatMoney(order.subtotal, locale)}</span>
          </div>
          <div className="flex justify-between">
            <span>{t('discount')}</span>
            <span>−{formatMoney(order.discount, locale)}</span>
          </div>
          <div className="flex justify-between border-t border-black/40 pt-1 font-bold">
            <span>{t('total')}</span>
            <span>{formatMoney(order.total, locale)}</span>
          </div>
          <div className="flex justify-between">
            <span>{t('paid')}</span>
            <span>{formatMoney(order.paidAmount, locale)}</span>
          </div>
        </div>

        {order.payments.length > 0 && (
          <div className="mt-3 border-t border-black/40 pt-2 text-xs">
            <div className="mb-1 font-semibold">{t('payments')}</div>
            {order.payments.map((p) => (
              <div key={p.id} className="flex justify-between">
                <span>{tMethods(p.method)}</span>
                <span>{formatMoney(p.amount, locale)}</span>
              </div>
            ))}
          </div>
        )}

        {order.notes && (
          <div className="mt-3 border-t border-black/40 pt-2 text-xs">
            <div className="font-semibold">{t('notes')}</div>
            <p className="whitespace-pre-wrap">{order.notes}</p>
          </div>
        )}

        <p className="mt-6 text-center text-xs">
          {tCommon('appName')} · {localeTag === 'uz-Latn-UZ' ? 'Rahmat!' : 'Спасибо!'}
        </p>
      </div>
    </div>
  );
}
