'use client';

import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { createProduct, type ProductInput } from '@/lib/products';
import { ProductForm } from '../_components/product-form';

export default function NewProductPage({ params: { locale } }: { params: { locale: string } }) {
  const t = useTranslations('products');
  const tCommon = useTranslations('common');
  const router = useRouter();

  async function handleSubmit(input: ProductInput) {
    const created = await createProduct(input);
    router.push(`/${locale}/products/${created.id}`);
    router.refresh();
  }

  return (
    <main className="mx-auto max-w-4xl px-6 py-10">
      <h1 className="text-2xl font-semibold">{t('newTitle')}</h1>
      <div className="mt-6">
        <ProductForm submitLabel={tCommon('save')} onSubmit={handleSubmit} />
      </div>
    </main>
  );
}
