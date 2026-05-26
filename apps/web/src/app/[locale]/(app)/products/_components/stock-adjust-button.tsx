'use client';

import { useTranslations } from 'next-intl';
import { FormEvent, useState } from 'react';
import { ApiError } from '@/lib/api';
import { adjustProductStock, type Product } from '@/lib/products';

interface Props {
  product: Product;
  onAdjusted: (p: Product) => void;
}

export function StockAdjustButton({ product, onAdjusted }: Props) {
  const tInv = useTranslations('inventory');
  const [open, setOpen] = useState(false);
  const [delta, setDelta] = useState('');
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    const n = Number(delta);
    if (!Number.isFinite(n) || n === 0) {
      setError(tInv('errorZeroDelta'));
      return;
    }
    setPending(true);
    try {
      const updated = await adjustProductStock(product.id, {
        delta: n,
        reason: reason.trim() || undefined,
      });
      onAdjusted(updated);
      setOpen(false);
      setDelta('');
      setReason('');
    } catch (err) {
      if (err instanceof ApiError && err.status === 400) {
        setError(tInv('errorNegative'));
      } else {
        setError(tInv('errorNegative'));
      }
    } finally {
      setPending(false);
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-md border border-slate-300 px-3 py-1.5 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800 text-sm hover:bg-slate-50"
      >
        {tInv('adjustStock')}
      </button>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex items-center gap-2 rounded-md border border-slate-300 bg-white dark:border-slate-700 dark:bg-slate-900 p-2"
    >
      <span className="text-xs text-slate-500 dark:text-slate-400">
        {tInv('currentStock')}: <span className="font-medium text-slate-900 dark:text-slate-100">{product.stock}</span>
      </span>
      <input
        type="number"
        step={1}
        required
        placeholder={tInv('delta')}
        value={delta}
        onChange={(e) => setDelta(e.target.value)}
        className="w-20 rounded-md border border-slate-300 px-2 py-1 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 text-sm"
      />
      <input
        type="text"
        maxLength={200}
        placeholder={tInv('reason')}
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        className="w-40 rounded-md border border-slate-300 px-2 py-1 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 text-sm"
      />
      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-slate-900 px-3 py-1 text-sm text-white dark:bg-slate-200 dark:text-slate-900 disabled:opacity-60"
      >
        ✓
      </button>
      <button
        type="button"
        onClick={() => {
          setOpen(false);
          setError(null);
        }}
        className="rounded-md border border-slate-300 px-2 py-1 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 text-sm hover:bg-slate-50"
      >
        ✕
      </button>
      {error && <span className="text-xs text-red-600">{error}</span>}
    </form>
  );
}
