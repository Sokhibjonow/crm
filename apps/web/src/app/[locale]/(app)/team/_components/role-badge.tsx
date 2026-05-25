'use client';

import { useTranslations } from 'next-intl';
import type { UserRole } from '@/lib/auth';

const COLORS: Record<UserRole, string> = {
  OWNER: 'bg-purple-100 text-purple-700',
  MANAGER: 'bg-blue-100 text-blue-700',
  CASHIER: 'bg-emerald-100 text-emerald-700',
  WAREHOUSE: 'bg-amber-100 text-amber-700',
  COURIER: 'bg-sky-100 text-sky-700',
};

export function RoleBadge({ role }: { role: UserRole }) {
  const t = useTranslations('team.roleValues');
  return (
    <span className={`rounded px-2 py-0.5 text-xs font-medium ${COLORS[role]}`}>
      {t(role)}
    </span>
  );
}
