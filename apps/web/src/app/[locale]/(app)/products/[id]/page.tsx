'use client';

import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { Skeleton } from '@/components/skeleton';
import { ApiError } from '@/lib/api';
import { useCurrentUser } from '@/lib/current-user';
import {
  deleteProduct,
  getProduct,
  type Product,
  type ProductInput,
  updateProduct,
} from '@/lib/products';
import { ProductForm } from '../_components/product-form';
import { StockAdjustButton } from '../_components/stock-adjust-button';

interface Props {
  params: { locale: string; id: string };
}

export default function EditProductPage({ params: { locale, id } }: Props) {
  const t = useTranslations('products');
  const tCommon = useTranslations('common');
  const router = useRouter();
  const { can } = useCurrentUser();

  const [product, setProduct] = useState<Product | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getProduct(id)
      .then((p) => {
        if (!cancelled) setProduct(p);
      })
      .catch(() => {
        if (!cancelled) setLoadError(true);
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  async function handleSubmit(input: ProductInput) {
    const updated = await updateProduct(id, input);
    setProduct(updated);
  }

  async function handleDelete() {
    if (!confirm(t('deleteConfirm'))) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      await deleteProduct(id);
      router.push(`/${locale}/products`);
      router.refresh();
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        setDeleteError(t('errorInUse'));
      } else {
        setDeleteError(t('errorInUse'));
      }
      setDeleting(false);
    }
  }

  if (loadError) {
    return (
      <main className="mx-auto max-w-4xl px-6 py-10">
        <p className="text-sm text-red-600">{t('noResults')}</p>
      </main>
    );
  }

  if (!product) {
    return (
      <main className="mx-auto max-w-4xl px-6 py-10">
        <Skeleton className="h-8 w-56" />
        <div className="mt-6 grid max-w-2xl grid-cols-1 gap-4 sm:grid-cols-2">
          <Skeleton className="h-10 w-full sm:col-span-2" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-4xl px-6 py-10">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">{t('editTitle')}</h1>
        <div className="flex gap-2">
          {can('inventory.adjust') && (
            <StockAdjustButton product={product} onAdjusted={setProduct} />
          )}
          {can('product.delete') && (
          <button
            type="button"
            onClick={handleDelete}
            disabled={deleting}
            className="rounded-md border border-red-300 px-3 py-1.5 text-sm text-red-700 hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-950/40 disabled:opacity-60"
          >
            {t('delete')}
          </button>
          )}
        </div>
      </div>
      {deleteError && <p className="mt-3 text-sm text-red-600">{deleteError}</p>}
      <div className="mt-6">
        <ProductForm
          submitLabel={tCommon('save')}
          onSubmit={handleSubmit}
          initial={{
            name: product.name,
            sku: product.sku ?? undefined,
            category: product.category ?? undefined,
            size: product.size ?? undefined,
            color: product.color ?? undefined,
            stock: product.stock,
            lowStockThreshold: product.lowStockThreshold,
            costPrice: Number(product.costPrice),
            salePrice: Number(product.salePrice),
            supplier: product.supplier ?? undefined,
            isActive: product.isActive,
          }}
        />
      </div>
    </main>
  );
}
