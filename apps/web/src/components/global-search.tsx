'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useEffect, useRef, useState } from 'react';
import { useCurrentUser } from '@/lib/current-user';
import { listCustomers, type Customer } from '@/lib/customers';
import { listOrders, type OrderListItem } from '@/lib/orders';
import { listProducts, type Product } from '@/lib/products';

interface Results {
  customers: Customer[];
  products: Product[];
  orders: OrderListItem[];
}

const EMPTY: Results = { customers: [], products: [], orders: [] };
const TAKE = 5;

export function GlobalSearch() {
  const t = useTranslations('search');
  const tNav = useTranslations('nav');
  const router = useRouter();
  const params = useParams<{ locale?: string }>();
  const locale = params.locale ?? 'uz';
  const { can } = useCurrentUser();

  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const [results, setResults] = useState<Results>(EMPTY);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const wrapRef = useRef<HTMLDivElement | null>(null);

  // Cmd/Ctrl+K focuses the input.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
        setOpen(true);
      } else if (e.key === 'Escape') {
        setOpen(false);
        inputRef.current?.blur();
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // Close on click outside.
  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  // Debounced fetch.
  useEffect(() => {
    if (!q.trim()) {
      setResults(EMPTY);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    const timer = setTimeout(async () => {
      try {
        const [cs, ps, os] = await Promise.all([
          can('customer.view')
            ? listCustomers({ q, take: TAKE }).then((r) => r.items).catch(() => [])
            : Promise.resolve([] as Customer[]),
          can('product.view')
            ? listProducts({ q, take: TAKE }).then((r) => r.items).catch(() => [])
            : Promise.resolve([] as Product[]),
          can('order.view')
            ? listOrders({ q, take: TAKE }).then((r) => r.items).catch(() => [])
            : Promise.resolve([] as OrderListItem[]),
        ]);
        if (!cancelled) setResults({ customers: cs, products: ps, orders: os });
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  function go(href: string) {
    setOpen(false);
    setQ('');
    router.push(href);
  }

  const total = results.customers.length + results.products.length + results.orders.length;

  return (
    <div
      ref={wrapRef}
      className="relative hidden flex-1 md:block max-w-md"
    >
      <input
        ref={inputRef}
        type="search"
        value={q}
        placeholder={t('placeholder')}
        onChange={(e) => {
          setQ(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        className="w-full rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm placeholder:text-slate-400 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500"
      />
      <kbd className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 rounded border border-slate-200 px-1.5 py-0.5 text-[10px] text-slate-500 dark:border-slate-700 dark:text-slate-400">
        Ctrl K
      </kbd>

      {open && q.trim().length > 0 && (
        <div className="absolute left-0 right-0 top-full z-50 mt-1 max-h-[28rem] overflow-auto rounded-lg border border-slate-200 bg-white shadow-lg dark:border-slate-700 dark:bg-slate-900">
          {loading && (
            <div className="px-3 py-4 text-center text-sm text-slate-500 dark:text-slate-400">
              …
            </div>
          )}
          {!loading && total === 0 && (
            <div className="px-3 py-4 text-center text-sm text-slate-500 dark:text-slate-400">
              {t('noResults')}
            </div>
          )}
          {!loading && results.customers.length > 0 && (
            <Section title={tNav('customers')}>
              {results.customers.map((c) => (
                <Result
                  key={c.id}
                  href={`/${locale}/customers/${c.id}`}
                  primary={c.name}
                  secondary={c.phone ?? c.telegram ?? ''}
                  onSelect={go}
                />
              ))}
            </Section>
          )}
          {!loading && results.products.length > 0 && (
            <Section title={tNav('products')}>
              {results.products.map((p) => (
                <Result
                  key={p.id}
                  href={`/${locale}/products/${p.id}`}
                  primary={p.name}
                  secondary={p.sku ?? p.category ?? ''}
                  onSelect={go}
                />
              ))}
            </Section>
          )}
          {!loading && results.orders.length > 0 && (
            <Section title={tNav('orders')}>
              {results.orders.map((o) => (
                <Result
                  key={o.id}
                  href={`/${locale}/orders/${o.id}`}
                  primary={`#${o.number}`}
                  secondary={o.customer?.name ?? ''}
                  onSelect={go}
                />
              ))}
            </Section>
          )}
        </div>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="px-3 pb-1 pt-2 text-[10px] font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
        {title}
      </div>
      {children}
    </div>
  );
}

function Result({
  href,
  primary,
  secondary,
  onSelect,
}: {
  href: string;
  primary: string;
  secondary: string;
  onSelect: (href: string) => void;
}) {
  return (
    <Link
      href={href}
      onClick={(e) => {
        e.preventDefault();
        onSelect(href);
      }}
      className="block px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-800"
    >
      <div className="text-sm font-medium text-slate-900 dark:text-slate-100">{primary}</div>
      {secondary && (
        <div className="text-xs text-slate-500 dark:text-slate-400">{secondary}</div>
      )}
    </Link>
  );
}
