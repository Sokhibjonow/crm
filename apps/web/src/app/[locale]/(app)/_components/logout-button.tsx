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
      className="rounded-md border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-50"
    >
      {t('signOut')}
    </button>
  );
}
