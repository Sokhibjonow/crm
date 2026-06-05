'use client';

import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { ApiError } from '@/lib/api';
import { formatMoney } from '@/lib/format';
import {
  addOrderPayment,
  createOrder,
  type PaymentMethod,
} from '@/lib/orders';
import { lookupProductByBarcode, type Product } from '@/lib/products';
import { previewPromoCode } from '@/lib/promo';

interface CartLine {
  productId: string;
  name: string;
  sku: string | null;
  barcode: string | null;
  qty: number;
  unitPrice: number;
  stock: number;
}

const METHODS: PaymentMethod[] = ['CASH', 'CARD', 'CLICK', 'PAYME'];

interface Props {
  params: { locale: string };
}

export default function SalePage({ params: { locale } }: Props) {
  const t = useTranslations('sale');
  const tOrders = useTranslations('orders');
  const tMethods = useTranslations('orders.methodValues');
  const tAuth = useTranslations('auth');
  const router = useRouter();

  const scanInputRef = useRef<HTMLInputElement>(null);
  const [scan, setScan] = useState('');
  const [lines, setLines] = useState<CartLine[]>([]);
  const [method, setMethod] = useState<PaymentMethod>('CASH');
  const [promoInput, setPromoInput] = useState('');
  const [appliedPromo, setAppliedPromo] = useState<{ code: string; discount: number } | null>(null);
  const [promoError, setPromoError] = useState<string | null>(null);
  const [promoPending, setPromoPending] = useState(false);
  const [lookupPending, setLookupPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Auto-focus the scanner input on mount + every time the cart changes (so
  // the next scan lands here even after the cashier clicked qty +/-).
  useEffect(() => {
    scanInputRef.current?.focus();
  }, [lines.length]);

  // Re-validate the active promo when the cart changes — the discount may
  // need to be recomputed against the new subtotal.
  const subtotal = useMemo(
    () => lines.reduce((s, l) => s + l.qty * l.unitPrice, 0),
    [lines],
  );
  const discount = appliedPromo ? Math.min(appliedPromo.discount, subtotal) : 0;
  const total = Math.max(0, subtotal - discount);

  useEffect(() => {
    if (!appliedPromo || subtotal === 0) return;
    previewPromoCode(appliedPromo.code, subtotal)
      .then((res) => setAppliedPromo({ code: res.code, discount: Number(res.discount) }))
      .catch(() => {
        // Promo no longer valid against the new subtotal; drop it silently.
        setAppliedPromo(null);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subtotal]);

  function addLine(product: Product) {
    setLines((prev) => {
      const existing = prev.find((l) => l.productId === product.id);
      if (existing) {
        if (existing.qty + 1 > product.stock) {
          toast.error(t('errorOutOfStock', { name: product.name }));
          return prev;
        }
        return prev.map((l) =>
          l.productId === product.id ? { ...l, qty: l.qty + 1 } : l,
        );
      }
      if (product.stock < 1) {
        toast.error(t('errorOutOfStock', { name: product.name }));
        return prev;
      }
      return [
        ...prev,
        {
          productId: product.id,
          name: product.name,
          sku: product.sku,
          barcode: product.barcode,
          qty: 1,
          unitPrice: Number(product.salePrice),
          stock: product.stock,
        },
      ];
    });
  }

  function updateQty(productId: string, qty: number) {
    setLines((prev) =>
      prev.map((l) =>
        l.productId === productId
          ? { ...l, qty: Math.max(1, Math.min(qty, l.stock)) }
          : l,
      ),
    );
  }

  function removeLine(productId: string) {
    setLines((prev) => prev.filter((l) => l.productId !== productId));
  }

  function resetCart() {
    setLines([]);
    setScan('');
    setMethod('CASH');
    setPromoInput('');
    setAppliedPromo(null);
    setPromoError(null);
    setError(null);
    scanInputRef.current?.focus();
  }

  async function onScan(e: FormEvent) {
    e.preventDefault();
    const code = scan.trim();
    if (!code) return;
    setLookupPending(true);
    try {
      const product = await lookupProductByBarcode(code);
      addLine(product);
      setScan('');
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) {
        toast.error(t('errorBarcodeNotFound', { code }));
      } else {
        toast.error(tAuth('errorGeneric'));
      }
    } finally {
      setLookupPending(false);
      // Re-focus so the next scan is captured immediately.
      scanInputRef.current?.focus();
    }
  }

  async function applyPromo() {
    const code = promoInput.trim();
    if (!code) return;
    if (subtotal === 0) {
      setPromoError(t('errorPromoNoItems'));
      return;
    }
    setPromoError(null);
    setPromoPending(true);
    try {
      const res = await previewPromoCode(code, subtotal);
      setAppliedPromo({ code: res.code, discount: Number(res.discount) });
      toast.success(t('promoApplied'));
    } catch (err) {
      setAppliedPromo(null);
      setPromoError(err instanceof ApiError ? err.message : tAuth('errorGeneric'));
    } finally {
      setPromoPending(false);
    }
  }

  async function checkout() {
    if (lines.length === 0 || submitting) return;
    setError(null);
    setSubmitting(true);
    try {
      // 1. Create the order with the cart contents.
      const created = await createOrder({
        items: lines.map((l) => ({
          productId: l.productId,
          qty: l.qty,
          unitPrice: l.unitPrice,
        })),
        promoCode: appliedPromo?.code,
      });

      // 2. Add the payment for the full order total.
      if (Number(created.total) > 0) {
        await addOrderPayment(created.id, {
          amount: Number(created.total),
          method,
        });
      }

      toast.success(t('saleCompleted', { number: created.number }));
      // Reset for next sale and refocus the scanner.
      resetCart();
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : tAuth('errorGeneric'));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">{t('title')}</h1>
        <span className="text-xs text-slate-500 dark:text-slate-400">{t('hint')}</span>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-[1fr,360px]">
        {/* LEFT: scanner + cart */}
        <section className="flex flex-col gap-4">
          <form
            onSubmit={onScan}
            className="rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900"
          >
            <label className="flex flex-col gap-1 text-xs">
              {t('scanLabel')}
              <input
                ref={scanInputRef}
                type="text"
                inputMode="text"
                autoComplete="off"
                autoFocus
                value={scan}
                onChange={(e) => setScan(e.target.value)}
                disabled={lookupPending}
                placeholder={t('scanPlaceholder')}
                className="rounded-md border border-slate-300 px-3 py-3 text-lg font-mono dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
              />
            </label>
          </form>

          <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500 dark:bg-slate-800/50 dark:text-slate-400">
                <tr>
                  <th className="px-3 py-2 font-medium">{tOrders('selectProduct')}</th>
                  <th className="px-3 py-2 font-medium text-right">{tOrders('qty')}</th>
                  <th className="px-3 py-2 font-medium text-right">{tOrders('unitPrice')}</th>
                  <th className="px-3 py-2 font-medium text-right">{tOrders('lineTotal')}</th>
                  <th className="px-3 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {lines.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-3 py-6 text-center text-slate-500">
                      {t('emptyCart')}
                    </td>
                  </tr>
                )}
                {lines.map((l) => (
                  <tr key={l.productId} className="border-t border-slate-100 dark:border-slate-800">
                    <td className="px-3 py-2">
                      <div className="font-medium">{l.name}</div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">
                        {l.barcode ?? l.sku ?? '—'}
                      </div>
                    </td>
                    <td className="px-3 py-2 text-right">
                      <div className="inline-flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => updateQty(l.productId, l.qty - 1)}
                          className="rounded border border-slate-300 px-2 dark:border-slate-700"
                        >
                          −
                        </button>
                        <input
                          type="number"
                          min={1}
                          max={l.stock}
                          value={l.qty}
                          onChange={(e) =>
                            updateQty(l.productId, Number(e.target.value) || 1)
                          }
                          className="w-14 rounded-md border border-slate-300 px-2 py-1 text-right text-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                        />
                        <button
                          type="button"
                          onClick={() => updateQty(l.productId, l.qty + 1)}
                          className="rounded border border-slate-300 px-2 dark:border-slate-700"
                        >
                          +
                        </button>
                      </div>
                    </td>
                    <td className="px-3 py-2 text-right text-slate-700 dark:text-slate-300">
                      {formatMoney(l.unitPrice, locale)}
                    </td>
                    <td className="px-3 py-2 text-right font-medium">
                      {formatMoney(l.qty * l.unitPrice, locale)}
                    </td>
                    <td className="px-3 py-2 text-right">
                      <button
                        type="button"
                        onClick={() => removeLine(l.productId)}
                        className="rounded-md border border-red-300 px-2 py-1 text-xs text-red-700 hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-950/40"
                      >
                        ✕
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* RIGHT: totals + payment */}
        <aside className="flex flex-col gap-4">
          <div className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
            <label className="flex flex-col gap-1 text-xs">
              {tOrders('promoCode')}
              {appliedPromo ? (
                <div className="flex items-center justify-between rounded-md border border-green-300 bg-green-50 px-3 py-2 text-sm dark:border-green-800 dark:bg-green-950/40">
                  <span>
                    <span className="font-medium">{appliedPromo.code}</span>
                    <span className="ml-2 text-slate-600 dark:text-slate-400">
                      −{formatMoney(discount, locale)}
                    </span>
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setAppliedPromo(null);
                      setPromoInput('');
                    }}
                    className="text-xs text-red-700 hover:underline dark:text-red-400"
                  >
                    {tOrders('promoClear')}
                  </button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={promoInput}
                    onChange={(e) => setPromoInput(e.target.value.toUpperCase())}
                    placeholder={tOrders('promoPlaceholder')}
                    className="flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                  />
                  <button
                    type="button"
                    onClick={applyPromo}
                    disabled={!promoInput.trim() || promoPending}
                    className="rounded-md border border-slate-300 px-3 py-2 text-sm disabled:opacity-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
                  >
                    {promoPending ? '…' : tOrders('promoApply')}
                  </button>
                </div>
              )}
              {promoError && <p className="text-xs text-red-600">{promoError}</p>}
            </label>
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
            <h3 className="text-sm font-medium">{tOrders('paymentMethod')}</h3>
            <div className="mt-2 grid grid-cols-2 gap-2">
              {METHODS.map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMethod(m)}
                  className={
                    m === method
                      ? 'rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white dark:bg-slate-200 dark:text-slate-900'
                      : 'rounded-md border border-slate-300 px-3 py-2 text-sm hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800'
                  }
                >
                  {tMethods(m)}
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
            <div className="flex justify-between text-sm text-slate-500">
              <span>{tOrders('subtotal')}</span>
              <span className="text-slate-900 dark:text-slate-100">
                {formatMoney(subtotal, locale)}
              </span>
            </div>
            {discount > 0 && (
              <div className="mt-1 flex justify-between text-sm text-slate-500">
                <span>{tOrders('discount')}</span>
                <span className="text-slate-900 dark:text-slate-100">
                  −{formatMoney(discount, locale)}
                </span>
              </div>
            )}
            <div className="mt-2 flex justify-between border-t border-slate-200 pt-2 text-lg font-semibold dark:border-slate-700">
              <span>{tOrders('total')}</span>
              <span>{formatMoney(total, locale)}</span>
            </div>
            {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
            <button
              type="button"
              onClick={checkout}
              disabled={lines.length === 0 || submitting}
              className="mt-4 w-full rounded-md bg-green-600 px-4 py-3 text-base font-semibold text-white hover:bg-green-700 disabled:opacity-60"
            >
              {submitting ? tAuth('submitting') : t('checkout')}
            </button>
            <button
              type="button"
              onClick={resetCart}
              disabled={lines.length === 0}
              className="mt-2 w-full rounded-md border border-slate-300 px-4 py-2 text-sm hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              {t('clearCart')}
            </button>
          </div>
        </aside>
      </div>
    </main>
  );
}
