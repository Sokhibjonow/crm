'use client';

import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { FormEvent, useMemo, useState } from 'react';
import { ApiError } from '@/lib/api';
import { formatMoney } from '@/lib/format';
import { createOrder, type CreateOrderInput } from '@/lib/orders';
import type { Product } from '@/lib/products';
import { CustomerPicker } from '../_components/customer-picker';
import { ProductPicker } from '../_components/product-picker';

interface Line {
  productId: string;
  name: string;
  sku: string | null;
  qty: number;
  unitPrice: number;
}

export default function NewOrderPage({ params: { locale } }: { params: { locale: string } }) {
  const t = useTranslations('orders');
  const tAuth = useTranslations('auth');
  const router = useRouter();

  const [customer, setCustomer] = useState<{ id: string; name: string; phone: string | null } | null>(null);
  const [lines, setLines] = useState<Line[]>([]);
  const [discount, setDiscount] = useState('0');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  function handleProductSelect(p: Product) {
    setLines((prev) => {
      const existing = prev.find((l) => l.productId === p.id);
      if (existing) {
        return prev.map((l) =>
          l.productId === p.id ? { ...l, qty: l.qty + 1 } : l,
        );
      }
      return [
        ...prev,
        {
          productId: p.id,
          name: p.name,
          sku: p.sku,
          qty: 1,
          unitPrice: Number(p.salePrice),
        },
      ];
    });
  }

  function updateLine(idx: number, patch: Partial<Line>) {
    setLines((prev) => prev.map((l, i) => (i === idx ? { ...l, ...patch } : l)));
  }

  function removeLine(idx: number) {
    setLines((prev) => prev.filter((_, i) => i !== idx));
  }

  const subtotal = useMemo(
    () => lines.reduce((s, l) => s + l.qty * l.unitPrice, 0),
    [lines],
  );
  const discountNum = Number(discount) || 0;
  const total = Math.max(0, subtotal - discountNum);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (lines.length === 0) return;
    setError(null);
    setPending(true);
    try {
      const input: CreateOrderInput = {
        customerId: customer?.id,
        items: lines.map((l) => ({
          productId: l.productId,
          qty: l.qty,
          unitPrice: l.unitPrice,
        })),
        discount: discountNum,
        notes: notes.trim() || undefined,
      };
      const created = await createOrder(input);
      router.push(`/${locale}/orders/${created.id}`);
      router.refresh();
    } catch (err) {
      if (err instanceof ApiError && err.status === 400) {
        setError(err.message || t('errorNotEnoughStock'));
      } else {
        setError(tAuth('errorGeneric'));
      }
    } finally {
      setPending(false);
    }
  }

  return (
    <main className="mx-auto max-w-4xl px-6 py-10">
      <h1 className="text-2xl font-semibold">{t('newTitle')}</h1>

      <form onSubmit={onSubmit} className="mt-6 flex flex-col gap-6">
        <section>
          <h2 className="mb-2 text-sm font-medium text-slate-700">{t('customer')}</h2>
          <CustomerPicker selected={customer} onSelect={setCustomer} />
        </section>

        <section>
          <h2 className="mb-2 text-sm font-medium text-slate-700">{t('items')}</h2>
          <div className="mb-3">
            <ProductPicker onSelect={handleProductSelect} />
          </div>
          {lines.length === 0 ? (
            <p className="text-sm text-slate-500">—</p>
          ) : (
            <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                  <tr>
                    <th className="px-4 py-2 font-medium">{t('selectProduct')}</th>
                    <th className="px-4 py-2 font-medium text-right">{t('qty')}</th>
                    <th className="px-4 py-2 font-medium text-right">{t('unitPrice')}</th>
                    <th className="px-4 py-2 font-medium text-right">{t('lineTotal')}</th>
                    <th className="px-4 py-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {lines.map((l, idx) => (
                    <tr key={l.productId} className="border-t border-slate-100">
                      <td className="px-4 py-2">
                        <div className="font-medium">{l.name}</div>
                        {l.sku && <div className="text-xs text-slate-500">{l.sku}</div>}
                      </td>
                      <td className="px-4 py-2 text-right">
                        <input
                          type="number"
                          min={1}
                          step={1}
                          value={l.qty}
                          onChange={(e) =>
                            updateLine(idx, { qty: Math.max(1, Number(e.target.value) || 1) })
                          }
                          className="w-20 rounded-md border border-slate-300 px-2 py-1 text-right text-sm"
                        />
                      </td>
                      <td className="px-4 py-2 text-right">
                        <input
                          type="number"
                          min={0}
                          step="0.01"
                          value={l.unitPrice}
                          onChange={(e) =>
                            updateLine(idx, { unitPrice: Number(e.target.value) || 0 })
                          }
                          className="w-28 rounded-md border border-slate-300 px-2 py-1 text-right text-sm"
                        />
                      </td>
                      <td className="px-4 py-2 text-right text-slate-700">
                        {formatMoney(l.qty * l.unitPrice, locale)}
                      </td>
                      <td className="px-4 py-2 text-right">
                        <button
                          type="button"
                          onClick={() => removeLine(idx)}
                          className="rounded-md border border-red-300 px-2 py-1 text-xs text-red-700 hover:bg-red-50"
                        >
                          {t('removeItem')}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label className="flex flex-col gap-1 text-sm">
            {t('discount')}
            <input
              type="number"
              min={0}
              step="0.01"
              value={discount}
              onChange={(e) => setDiscount(e.target.value)}
              className="rounded-md border border-slate-300 px-3 py-2"
            />
          </label>
          <div className="flex flex-col items-end justify-end gap-1 text-sm">
            <div className="text-slate-500">
              {t('subtotal')}:{' '}
              <span className="text-slate-900">{formatMoney(subtotal, locale)}</span>
            </div>
            <div className="text-lg font-semibold">
              {t('total')}: {formatMoney(total, locale)}
            </div>
          </div>
        </section>

        <label className="flex flex-col gap-1 text-sm">
          {t('notes')}
          <textarea
            rows={3}
            maxLength={2000}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="rounded-md border border-slate-300 px-3 py-2"
          />
        </label>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div>
          <button
            type="submit"
            disabled={pending || lines.length === 0}
            className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
          >
            {pending ? tAuth('submitting') : t('create')}
          </button>
        </div>
      </form>
    </main>
  );
}
