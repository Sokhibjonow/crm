'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useCurrentUser } from '@/lib/current-user';

interface Props {
  params: { locale: string };
}

export default function SettingsIndexPage({ params: { locale } }: Props) {
  const t = useTranslations('settings');
  const { can } = useCurrentUser();
  const items = [
    can('settings.store')
      ? { href: `/${locale}/settings/store`, title: t('store'), desc: t('storeDesc') }
      : null,
    can('settings.profile')
      ? { href: `/${locale}/settings/profile`, title: t('profile'), desc: t('profileDesc') }
      : null,
  ].filter(Boolean) as Array<{ href: string; title: string; desc: string }>;
  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <h1 className="text-2xl font-semibold">{t('title')}</h1>
      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        {items.map((it) => (
          <Link
            key={it.href}
            href={it.href}
            className="block rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 p-5 hover:border-slate-300 hover:shadow-sm dark:border-slate-700"
          >
            <div className="font-medium">{it.title}</div>
            <div className="mt-1 text-sm text-slate-500 dark:text-slate-400">{it.desc}</div>
          </Link>
        ))}
      </div>
    </main>
  );
}
