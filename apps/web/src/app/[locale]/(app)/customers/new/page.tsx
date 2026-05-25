'use client';

import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { createCustomer, type CustomerInput } from '@/lib/customers';
import { CustomerForm } from '../_components/customer-form';

export default function NewCustomerPage({ params: { locale } }: { params: { locale: string } }) {
  const t = useTranslations('customers');
  const tCommon = useTranslations('common');
  const router = useRouter();

  async function handleSubmit(input: CustomerInput) {
    const created = await createCustomer(input);
    router.push(`/${locale}/customers/${created.id}`);
    router.refresh();
  }

  return (
    <main className="mx-auto max-w-4xl px-6 py-10">
      <h1 className="text-2xl font-semibold">{t('newTitle')}</h1>
      <div className="mt-6">
        <CustomerForm submitLabel={tCommon('save')} onSubmit={handleSubmit} />
      </div>
    </main>
  );
}
