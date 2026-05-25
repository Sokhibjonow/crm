'use client';

import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { listProducts, type Product } from '@/lib/products';

interface Props {
  onSelect: (product: Product) => void;
}

export function ProductPicker({ onSelect }: Props) {
  const t = useTranslations('orders');
  const [q, setQ] = useState('');
  const [results, setResults] = useState<Product[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open || !q) {
      setResults([]);
      return;
    }
    let cancelled = false;
    const timer = setTimeout(() => {
      listProducts({ q, take: 10 })
        .then((r) => {
          if (!cancelled) setResults(r.items);
        })
        .catch(() => {
          if (!cancelled) setResults([]);
        });
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [q, open]);

  return (
    <div className="relative">
      <input
        type="text"
        placeholder={t('searchProduct')}
        value={q}
        onFocus={() => setOpen(true)}
        onChange={(e) => {
          setQ(e.target.value);
          setOpen(true);
        }}
        className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
      />
      {open && results.length > 0 && (
        <ul className="absolute z-10 mt-1 max-h-64 w-full overflow-auto rounded-md border border-slate-200 bg-white shadow-lg">
          {results.map((p) => (
            <li
              key={p.id}
              className="cursor-pointer px-3 py-2 text-sm hover:bg-slate-50"
              onClick={() => {
                onSelect(p);
                setQ('');
                setOpen(false);
              }}
            >
              <div className="flex items-baseline justify-between gap-3">
                <span className="font-medium">{p.name}</span>
                <span className="text-xs text-slate-500">{p.sku ?? '—'}</span>
              </div>
              <div className="text-xs text-slate-500">
                {p.salePrice} · stock: {p.stock}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
