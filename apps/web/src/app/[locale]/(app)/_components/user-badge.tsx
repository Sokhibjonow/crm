'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { ApiError } from '@/lib/api';
import { type AuthUser, getCurrentUser, logout } from '@/lib/auth';

export function UserBadge() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const router = useRouter();
  const params = useParams<{ locale: string }>();

  useEffect(() => {
    let cancelled = false;
    getCurrentUser()
      .then((u) => {
        if (!cancelled) setUser(u);
      })
      .catch((err: unknown) => {
        if (err instanceof ApiError && err.status === 401) {
          logout();
          router.replace(`/${params.locale}/login`);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [params.locale, router]);

  if (!user) return <span className="text-sm text-slate-400 dark:text-slate-500">…</span>;
  return (
    <span className="text-sm">
      <span className="font-medium text-slate-900 dark:text-slate-100">{user.name}</span>
      <span className="text-slate-500 dark:text-slate-400"> · {user.storeName}</span>
    </span>
  );
}
