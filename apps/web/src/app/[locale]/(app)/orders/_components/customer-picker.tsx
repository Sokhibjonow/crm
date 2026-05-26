'use client';

import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { type Customer, listCustomers } from '@/lib/customers';

interface Props {
  selected: { id: string; name: string; phone: string | null } | null;
  onSelect: (customer: { id: string; name: string; phone: string | null } | null) => void;
}

export function CustomerPicker({ selected, onSelect }: Props) {
  const t = useTranslations('orders');
  const [q, setQ] = useState('');
  const [results, setResults] = useState<Customer[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (!q) {
      setResults([]);
      return;
    }
    let cancelled = false;
    const timer = setTimeout(() => {
      listCustomers({ q, take: 10 })
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

  if (selected) {
    return (
      <div className="flex items-center gap-2 rounded-md border border-slate-300 bg-white dark:border-slate-700 dark:bg-slate-900 px-3 py-2 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500 text-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500">
        <span className="font-medium">{selected.name}</span>
        {selected.phone && <span className="text-slate-500">{selected.phone}</span>}
        <button
          type="button"
          onClick={() => onSelect(null)}
          className="ml-auto rounded px-1 text-slate-500 hover:bg-slate-100"
          aria-label="Clear"
        >
          ✕
        </button>
      </div>
    );
  }

  return (
    <div className="relative">
      <input
        type="text"
        placeholder={t('searchCustomer')}
        value={q}
        onFocus={() => setOpen(true)}
        onChange={(e) => {
          setQ(e.target.value);
          setOpen(true);
        }}
        className="w-full rounded-md border border-slate-300 px-3 py-2 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 text-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
      />
      {open && results.length > 0 && (
        <ul className="absolute z-10 mt-1 max-h-64 w-full overflow-auto rounded-md border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 shadow-lg dark:border-slate-800 dark:bg-slate-900">
          {results.map((c) => (
            <li
              key={c.id}
              className="cursor-pointer px-3 py-2 text-sm hover:bg-slate-50"
              onClick={() => {
                onSelect({ id: c.id, name: c.name, phone: c.phone });
                setQ('');
                setOpen(false);
              }}
            >
              <div className="font-medium">{c.name}</div>
              {c.phone && <div className="text-xs text-slate-500 dark:text-slate-400">{c.phone}</div>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
