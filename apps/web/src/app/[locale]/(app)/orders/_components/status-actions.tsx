'use client';

import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { ApiError } from '@/lib/api';
import { useCurrentUser } from '@/lib/current-user';
import { changeOrderStatus, type Order, type OrderStatus } from '@/lib/orders';
import type { Action } from '@/lib/permissions';

const NEXT_STATUSES: Record<OrderStatus, OrderStatus[]> = {
  NEW: ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['PACKING', 'CANCELLED'],
  PACKING: ['SHIPPED', 'CANCELLED'],
  SHIPPED: ['DELIVERED', 'CANCELLED'],
  // A delivered order can still be returned. Mirrors the backend's
  // ALLOWED_TRANSITIONS table in apps/api/src/modules/orders/orders.service.ts.
  DELIVERED: ['RETURNED'],
  CANCELLED: [],
  RETURNED: [],
};

const ACTION_FOR_STATUS: Record<OrderStatus, Action | null> = {
  NEW: null, // never a target of "go to"
  CONFIRMED: 'order.confirm',
  PACKING: 'order.pack',
  SHIPPED: 'order.ship',
  DELIVERED: 'order.deliver',
  CANCELLED: 'order.cancel',
  RETURNED: 'order.return',
};

interface Props {
  order: Order;
  onUpdated: (o: Order) => void;
}

export function StatusActions({ order, onUpdated }: Props) {
  const t = useTranslations('orders');
  const { can } = useCurrentUser();
  const [pending, setPending] = useState<OrderStatus | null>(null);
  const [error, setError] = useState<string | null>(null);

  const targets = NEXT_STATUSES[order.status].filter((s) => {
    const action = ACTION_FOR_STATUS[s];
    return action ? can(action) : true;
  });
  if (targets.length === 0) return null;

  async function go(target: OrderStatus) {
    setPending(target);
    setError(null);
    try {
      const updated = await changeOrderStatus(order.id, target);
      onUpdated(updated);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('errorInvalidTransition'));
    } finally {
      setPending(null);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {targets.map((s) => {
        const danger = s === 'CANCELLED' || s === 'RETURNED';
        return (
          <button
            key={s}
            type="button"
            onClick={() => go(s)}
            disabled={pending !== null}
            className={
              danger
                ? 'rounded-md border border-red-300 px-3 py-1.5 text-sm text-red-700 hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-950/40 disabled:opacity-60'
                : 'rounded-md bg-slate-900 px-3 py-1.5 text-sm text-white dark:bg-slate-200 dark:text-slate-900 hover:bg-slate-800 disabled:opacity-60'
            }
          >
            {pending === s ? '…' : t(`transitions.${s}` as const)}
          </button>
        );
      })}
      {error && <span className="text-sm text-red-600">{error}</span>}
    </div>
  );
}
