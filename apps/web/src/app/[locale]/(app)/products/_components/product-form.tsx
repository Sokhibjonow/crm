'use client';

import { useTranslations } from 'next-intl';
import { FormEvent, useState } from 'react';
import { ApiError } from '@/lib/api';
import type { ProductInput } from '@/lib/products';

interface Props {
  initial?: ProductInput;
  submitLabel: string;
  onSubmit: (input: ProductInput) => Promise<void>;
}

function num(value: string): number | undefined {
  if (value === '') return undefined;
  const n = Number(value);
  return Number.isFinite(n) ? n : undefined;
}

export function ProductForm({ initial, submitLabel, onSubmit }: Props) {
  const t = useTranslations('products');
  const tAuth = useTranslations('auth');

  const [name, setName] = useState(initial?.name ?? '');
  const [sku, setSku] = useState(initial?.sku ?? '');
  const [category, setCategory] = useState(initial?.category ?? '');
  const [size, setSize] = useState(initial?.size ?? '');
  const [color, setColor] = useState(initial?.color ?? '');
  const [stock, setStock] = useState(String(initial?.stock ?? 0));
  const [lowStockThreshold, setLowStockThreshold] = useState(
    String(initial?.lowStockThreshold ?? 0),
  );
  const [costPrice, setCostPrice] = useState(String(initial?.costPrice ?? 0));
  const [salePrice, setSalePrice] = useState(String(initial?.salePrice ?? 0));
  const [supplier, setSupplier] = useState(initial?.supplier ?? '');
  const [isActive, setIsActive] = useState(initial?.isActive ?? true);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);
    try {
      await onSubmit({
        name: name.trim(),
        sku: sku.trim() || undefined,
        category: category.trim() || undefined,
        size: size.trim() || undefined,
        color: color.trim() || undefined,
        stock: num(stock),
        lowStockThreshold: num(lowStockThreshold),
        costPrice: num(costPrice),
        salePrice: num(salePrice),
        supplier: supplier.trim() || undefined,
        isActive,
      });
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        setError(t('errorSkuTaken'));
      } else {
        setError(tAuth('errorGeneric'));
      }
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex max-w-2xl flex-col gap-4">
      <label className="flex flex-col gap-1 text-sm">
        {t('name')} *
        <input
          type="text"
          required
          minLength={1}
          maxLength={160}
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="rounded-md border border-slate-300 px-3 py-2"
        />
      </label>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-sm">
          {t('sku')}
          <input
            type="text"
            maxLength={80}
            value={sku}
            onChange={(e) => setSku(e.target.value)}
            className="rounded-md border border-slate-300 px-3 py-2"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          {t('category')}
          <input
            type="text"
            maxLength={80}
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="rounded-md border border-slate-300 px-3 py-2"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          {t('size')}
          <input
            type="text"
            maxLength={40}
            value={size}
            onChange={(e) => setSize(e.target.value)}
            className="rounded-md border border-slate-300 px-3 py-2"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          {t('color')}
          <input
            type="text"
            maxLength={40}
            value={color}
            onChange={(e) => setColor(e.target.value)}
            className="rounded-md border border-slate-300 px-3 py-2"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          {t('stock')}
          <input
            type="number"
            min={0}
            step={1}
            value={stock}
            onChange={(e) => setStock(e.target.value)}
            className="rounded-md border border-slate-300 px-3 py-2"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          {t('lowStockThreshold')}
          <input
            type="number"
            min={0}
            step={1}
            value={lowStockThreshold}
            onChange={(e) => setLowStockThreshold(e.target.value)}
            className="rounded-md border border-slate-300 px-3 py-2"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          {t('costPrice')} ({t('currency')})
          <input
            type="number"
            min={0}
            step="0.01"
            value={costPrice}
            onChange={(e) => setCostPrice(e.target.value)}
            className="rounded-md border border-slate-300 px-3 py-2"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          {t('salePrice')} ({t('currency')})
          <input
            type="number"
            min={0}
            step="0.01"
            value={salePrice}
            onChange={(e) => setSalePrice(e.target.value)}
            className="rounded-md border border-slate-300 px-3 py-2"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm sm:col-span-2">
          {t('supplier')}
          <input
            type="text"
            maxLength={160}
            value={supplier}
            onChange={(e) => setSupplier(e.target.value)}
            className="rounded-md border border-slate-300 px-3 py-2"
          />
        </label>
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={isActive}
          onChange={(e) => setIsActive(e.target.checked)}
        />
        {t('isActive')}
      </label>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div>
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
        >
          {pending ? tAuth('submitting') : submitLabel}
        </button>
      </div>
    </form>
  );
}
