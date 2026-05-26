'use client';

import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { FormEvent, useState } from 'react';
import { ApiError } from '@/lib/api';
import { type UserRole } from '@/lib/auth';
import { createMember } from '@/lib/team';

const ROLES: UserRole[] = ['MANAGER', 'CASHIER', 'WAREHOUSE', 'COURIER', 'OWNER'];

export default function NewMemberPage({ params: { locale } }: { params: { locale: string } }) {
  const t = useTranslations('team');
  const tRoles = useTranslations('team.roleValues');
  const tAuth = useTranslations('auth');
  const router = useRouter();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState<UserRole>('MANAGER');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);
    try {
      const created = await createMember({
        name: name.trim(),
        email: email.trim().toLowerCase(),
        password,
        phone: phone.trim() || undefined,
        role,
      });
      router.push(`/${locale}/team/${created.id}`);
      router.refresh();
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        setError(t('errorEmailTaken'));
      } else {
        setError(tAuth('errorGeneric'));
      }
    } finally {
      setPending(false);
    }
  }

  return (
    <main className="mx-auto max-w-xl px-6 py-10">
      <h1 className="text-2xl font-semibold">{t('newTitle')}</h1>
      <form onSubmit={onSubmit} className="mt-6 flex flex-col gap-4">
        <label className="flex flex-col gap-1 text-sm">
          {t('name')} *
          <input
            type="text"
            required
            minLength={2}
            maxLength={80}
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="rounded-md border border-slate-300 px-3 py-2 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          {t('email')} *
          <input
            type="email"
            required
            autoComplete="off"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="rounded-md border border-slate-300 px-3 py-2 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          {t('password')} *
          <input
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="rounded-md border border-slate-300 px-3 py-2 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          {t('phone')}
          <input
            type="tel"
            maxLength={40}
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="rounded-md border border-slate-300 px-3 py-2 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          {t('role')} *
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as UserRole)}
            className="rounded-md border border-slate-300 bg-white dark:border-slate-700 dark:bg-slate-900 px-3 py-2 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500"
          >
            {ROLES.map((r) => (
              <option key={r} value={r}>
                {tRoles(r)}
              </option>
            ))}
          </select>
        </label>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div>
          <button
            type="submit"
            disabled={pending}
            className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white dark:bg-slate-200 dark:text-slate-900 disabled:opacity-60"
          >
            {pending ? tAuth('submitting') : t('addNew')}
          </button>
        </div>
      </form>
    </main>
  );
}
