import Link from 'next/link';
import { useTranslations } from 'next-intl';

export default function HomePage({ params: { locale } }: { params: { locale: string } }) {
  const t = useTranslations('common');
  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col items-center justify-center gap-6 px-6 text-center">
      <h1 className="text-4xl font-semibold tracking-tight">{t('appName')}</h1>
      <p className="text-lg text-slate-600">{t('tagline')}</p>
      <div className="flex gap-3">
        <Link
          href={`/${locale}/login`}
          className="rounded-md bg-slate-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-slate-800"
        >
          {t('signIn')}
        </Link>
        <Link
          href={`/${locale}/register`}
          className="rounded-md border border-slate-300 px-5 py-2.5 text-sm font-medium text-slate-900 hover:bg-slate-100"
        >
          {t('signUp')}
        </Link>
      </div>
    </main>
  );
}
