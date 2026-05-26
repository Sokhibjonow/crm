'use client';

import { useRouter, useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { logout } from '@/lib/auth';

export function LogoutButton() {
  const t = useTranslations('common');
  const router = useRouter();
  const params = useParams<{ locale: string }>();

  function onClick() {
    logout();
    router.push(`/${params.locale}/login`);
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-900 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
    >
      {t('signOut')}
    </button>
  );
}
