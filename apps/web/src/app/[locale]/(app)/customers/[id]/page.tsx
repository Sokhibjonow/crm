'use client';

import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import {
  type Customer,
  type CustomerInput,
  deleteCustomer,
  getCustomer,
  updateCustomer,
} from '@/lib/customers';
import { useCurrentUser } from '@/lib/current-user';
import { CustomerForm } from '../_components/customer-form';
import { TelegramSection } from './_components/telegram-section';

interface Props {
  params: { locale: string; id: string };
}

export default function EditCustomerPage({ params: { locale, id } }: Props) {
  const t = useTranslations('customers');
  const tCommon = useTranslations('common');
  const router = useRouter();
  const { can } = useCurrentUser();

  const [customer, setCustomer] = useState<Customer | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getCustomer(id)
      .then((c) => {
        if (!cancelled) setCustomer(c);
      })
      .catch(() => {
        if (!cancelled) setLoadError(true);
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  async function handleSubmit(input: CustomerInput) {
    const updated = await updateCustomer(id, input);
    setCustomer(updated);
  }

  async function handleDelete() {
    if (!confirm(t('deleteConfirm'))) return;
    setDeleting(true);
    try {
      await deleteCustomer(id);
      router.push(`/${locale}/customers`);
      router.refresh();
    } catch {
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

  if (!customer) {
    return (
      <main className="mx-auto max-w-4xl px-6 py-10">
        <p className="text-sm text-slate-500 dark:text-slate-400">…</p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-4xl px-6 py-10">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">{t('editTitle')}</h1>
        {can('customer.delete') && (
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
      <div className="mt-6">
        <CustomerForm
          submitLabel={tCommon('save')}
          onSubmit={handleSubmit}
          initial={{
            name: customer.name,
            phone: customer.phone ?? undefined,
            telegram: customer.telegram ?? undefined,
            notes: customer.notes ?? undefined,
            tags: customer.tags,
          }}
        />
      </div>
      <TelegramSection customerId={customer.id} />
    </main>
  );
}
