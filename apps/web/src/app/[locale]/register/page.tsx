'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { FormEvent, useState } from 'react';
import { ApiError } from '@/lib/api';
import { register } from '@/lib/auth';

export default function RegisterPage({ params: { locale } }: { params: { locale: string } }) {
  const tAuth = useTranslations('auth');
  const tCommon = useTranslations('common');
  const router = useRouter();

  const [storeName, setStoreName] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);
    try {
      await register({ storeName, name, email, password });
      router.push(`/${locale}/dashboard`);
      router.refresh();
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        setError(tAuth('errorEmailTaken'));
      } else {
        setError(tAuth('errorGeneric'));
      }
    } finally {
      setPending(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-6 px-6">
      <h1 className="text-2xl font-semibold">{tAuth('registerTitle')}</h1>
      <form className="flex flex-col gap-4" onSubmit={onSubmit}>
        <label className="flex flex-col gap-1 text-sm">
          {tAuth('storeName')}
          <input
            type="text"
            required
            minLength={2}
            maxLength={80}
            value={storeName}
            onChange={(e) => setStoreName(e.target.value)}
            className="rounded-md border border-slate-300 px-3 py-2 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          {tAuth('yourName')}
          <input
            type="text"
            required
            minLength={2}
            maxLength={80}
            autoComplete="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="rounded-md border border-slate-300 px-3 py-2 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          {tCommon('email')}
          <input
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="rounded-md border border-slate-300 px-3 py-2 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          {tCommon('password')}
          <input
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="rounded-md border border-slate-300 px-3 py-2 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500"
          />
        </label>
        {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white dark:bg-slate-200 dark:text-slate-900 disabled:opacity-60 dark:bg-slate-200 dark:text-slate-900"
        >
          {pending ? tAuth('submitting') : tCommon('signUp')}
        </button>
      </form>
      <p className="text-sm text-slate-600 dark:text-slate-400">
        {tAuth('haveAccount')}{' '}
        <Link href={`/${locale}/login`} className="font-medium text-slate-900 dark:text-slate-100 underline dark:text-slate-100">
          {tCommon('signIn')}
        </Link>
      </p>
    </main>
  );
}
