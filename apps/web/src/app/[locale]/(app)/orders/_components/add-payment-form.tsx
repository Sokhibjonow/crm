'use client';

import { useTranslations } from 'next-intl';
import { FormEvent, useState } from 'react';
import { toast } from 'sonner';
import { ApiError } from '@/lib/api';
import { addOrderPayment, type Order, type PaymentMethod } from '@/lib/orders';

const METHODS: PaymentMethod[] = ['CASH', 'CARD', 'CLICK', 'PAYME', 'DEBT', 'OTHER'];

interface Props {
  order: Order;
  onAdded: (o: Order) => void;
}

export function AddPaymentForm({ order, onAdded }: Props) {
  const t = useTranslations('orders');
  const tMethods = useTranslations('orders.methodValues');
  const tAuth = useTranslations('auth');

  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState<PaymentMethod>('CASH');
  const [reference, setReference] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const remaining = Number(order.total) - Number(order.paidAmount);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    const n = Number(amount);
    if (!Number.isFinite(n) || n <= 0) {
      setError(tAuth('errorGeneric'));
      return;
    }
    setPending(true);
    try {
      const updated = await addOrderPayment(order.id, {
        amount: n,
        method,
        reference: reference.trim() || undefined,
      });
      onAdded(updated);
      setAmount('');
      setReference('');
      toast.success(t('addPayment'));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : tAuth('errorGeneric'));
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 p-4 dark:border-slate-800 dark:bg-slate-900">
      <div className="mb-3 flex items-baseline justify-between">
        <h3 className="text-sm font-semibold">{t('addPayment')}</h3>
        <span className="text-xs text-slate-500 dark:text-slate-400">
          {t('remaining')}: <span className="font-medium text-slate-900 dark:text-slate-100">{remaining}</span>
        </span>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
        <label className="flex flex-col gap-1 text-xs">
          {t('paymentAmount')}
          <input
            type="number"
            min="0.01"
            step="0.01"
            required
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="rounded-md border border-slate-300 px-3 py-2 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 text-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
          />
        </label>
        <label className="flex flex-col gap-1 text-xs">
          {t('paymentMethod')}
          <select
            value={method}
            onChange={(e) => setMethod(e.target.value as PaymentMethod)}
            className="rounded-md border border-slate-300 bg-white dark:border-slate-700 dark:bg-slate-900 px-3 py-2 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500 text-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500"
          >
            {METHODS.map((m) => (
              <option key={m} value={m}>
                {tMethods(m)}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs sm:col-span-2">
          {t('paymentReference')}
          <input
            type="text"
            maxLength={120}
            value={reference}
            onChange={(e) => setReference(e.target.value)}
            className="rounded-md border border-slate-300 px-3 py-2 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 text-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
          />
        </label>
      </div>
      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
      <div className="mt-3">
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white dark:bg-slate-200 dark:text-slate-900 disabled:opacity-60"
        >
          {pending ? tAuth('submitting') : t('addPayment')}
        </button>
      </div>
    </form>
  );
}
