'use client';

import { useTranslations } from 'next-intl';
import type { OrderStatus, PaymentStatus } from '@/lib/orders';

const ORDER_COLORS: Record<OrderStatus, string> = {
  NEW: 'bg-slate-200 text-slate-700',
  CONFIRMED: 'bg-blue-100 text-blue-700',
  PACKING: 'bg-amber-100 text-amber-700',
  SHIPPED: 'bg-indigo-100 text-indigo-700',
  DELIVERED: 'bg-green-100 text-green-700',
  CANCELLED: 'bg-red-100 text-red-700',
};

const PAYMENT_COLORS: Record<PaymentStatus, string> = {
  UNPAID: 'bg-slate-200 text-slate-700',
  PARTIAL: 'bg-amber-100 text-amber-700',
  PAID: 'bg-green-100 text-green-700',
  REFUNDED: 'bg-red-100 text-red-700',
};

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  const t = useTranslations('orders.statusValues');
  return (
    <span className={`rounded px-2 py-0.5 text-xs font-medium ${ORDER_COLORS[status]}`}>
      {t(status)}
    </span>
  );
}

export function PaymentStatusBadge({ status }: { status: PaymentStatus }) {
  const t = useTranslations('orders.paymentStatusValues');
  return (
    <span className={`rounded px-2 py-0.5 text-xs font-medium ${PAYMENT_COLORS[status]}`}>
      {t(status)}
    </span>
  );
}
