'use client';

import { useCurrentUser } from '@/lib/current-user';

export function UserBadge() {
  const { user } = useCurrentUser();
  if (!user) return <span className="text-sm text-slate-400 dark:text-slate-500">…</span>;
  return (
    <span className="text-sm">
      <span className="font-medium text-slate-900 dark:text-slate-100">{user.name}</span>
      <span className="text-slate-500 dark:text-slate-400"> · {user.storeName}</span>
    </span>
  );
}
