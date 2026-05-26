'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { type AuthUser, getCurrentUser } from '@/lib/auth';
import { listTeam, type TeamMember } from '@/lib/team';
import { RoleBadge } from './_components/role-badge';

interface Props {
  params: { locale: string };
}

export default function TeamPage({ params: { locale } }: Props) {
  const t = useTranslations('team');

  const [me, setMe] = useState<AuthUser | null>(null);
  const [members, setMembers] = useState<TeamMember[] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    Promise.all([getCurrentUser(), listTeam()])
      .then(([u, list]) => {
        if (cancelled) return;
        setMe(u);
        setMembers(list);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const isOwner = me?.role === 'OWNER';

  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">{t('title')}</h1>
        {isOwner && (
          <Link
            href={`/${locale}/team/new`}
            className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white dark:bg-slate-200 dark:text-slate-900 hover:bg-slate-800"
          >
            + {t('addNew')}
          </Link>
        )}
      </div>

      {!isOwner && me && (
        <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">{t('ownerOnly')}</p>
      )}

      <div className="mt-6 overflow-x-auto rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500 dark:bg-slate-800/50 dark:text-slate-400">
            <tr>
              <th className="px-4 py-2 font-medium">{t('name')}</th>
              <th className="px-4 py-2 font-medium">{t('email')}</th>
              <th className="px-4 py-2 font-medium">{t('role')}</th>
              <th className="px-4 py-2 font-medium">{t('status')}</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-slate-500">
                  …
                </td>
              </tr>
            )}
            {!loading && members && members.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-slate-500">
                  {t('noResults')}
                </td>
              </tr>
            )}
            {!loading &&
              members?.map((m) => (
                <tr key={m.id} className="border-t border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/50">
                  <td className="px-4 py-2">
                    {isOwner ? (
                      <Link
                        href={`/${locale}/team/${m.id}`}
                        className="font-medium text-slate-900 dark:text-slate-100 hover:underline"
                      >
                        {m.name}
                      </Link>
                    ) : (
                      <span className="font-medium">{m.name}</span>
                    )}
                    {m.phone && (
                      <div className="text-xs text-slate-500 dark:text-slate-400">{m.phone}</div>
                    )}
                  </td>
                  <td className="px-4 py-2 text-slate-700">{m.email}</td>
                  <td className="px-4 py-2">
                    <RoleBadge role={m.role} />
                  </td>
                  <td className="px-4 py-2">
                    {m.isActive ? (
                      <span className="rounded bg-green-100 px-2 py-0.5 text-xs text-green-700 dark:bg-green-900/40 dark:text-green-300">
                        {t('active')}
                      </span>
                    ) : (
                      <span className="rounded bg-slate-200 px-2 py-0.5 text-xs text-slate-600 dark:bg-slate-700 dark:text-slate-300">
                        {t('inactive')}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
