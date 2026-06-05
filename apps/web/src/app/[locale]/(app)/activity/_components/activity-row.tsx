'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import type { ActivityEntry } from '@/lib/activity';

interface Props {
  entry: ActivityEntry;
  locale: string;
}

function fmtDate(iso: string, locale: string): string {
  try {
    return new Date(iso).toLocaleString(locale === 'uz' ? 'uz-Latn-UZ' : 'ru-RU', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

function entityHref(entry: ActivityEntry, locale: string): string | null {
  if (!entry.entityId) return null;
  switch (entry.entityType) {
    case 'order':
      return `/${locale}/orders/${entry.entityId}`;
    case 'customer':
      return `/${locale}/customers/${entry.entityId}`;
    case 'product':
      return `/${locale}/products/${entry.entityId}`;
    default:
      return null;
  }
}

export function ActivityRow({ entry, locale }: Props) {
  const t = useTranslations('activity');

  const entityLabel = (() => {
    switch (entry.entityType) {
      case 'order':
        return t('entityOrder');
      case 'product':
        return t('entityProduct');
      case 'customer':
        return t('entityCustomer');
      default:
        return entry.entityType;
    }
  })();

  const actionLabel = (() => {
    switch (entry.action) {
      case 'created':
        return t('actionCreated');
      case 'updated':
        return t('actionUpdated');
      case 'status_changed':
        return t('actionStatusChanged');
      case 'payment_added':
        return t('actionPaymentAdded');
      case 'stock_adjusted':
        return t('actionStockAdjusted');
      case 'deleted':
        return t('actionDeleted');
      default:
        return entry.action;
    }
  })();

  const href = entityHref(entry, locale);

  // Metadata may be any JSON. Render scalar key/value pairs compactly.
  const metaPairs: [string, string][] = [];
  if (entry.metadata && typeof entry.metadata === 'object') {
    for (const [k, v] of Object.entries(entry.metadata as Record<string, unknown>)) {
      if (v === null || v === undefined) continue;
      const s = typeof v === 'object' ? JSON.stringify(v) : String(v);
      metaPairs.push([k, s]);
    }
  }

  return (
    <tr className="border-t border-slate-100 dark:border-slate-800">
      <td className="whitespace-nowrap px-4 py-2 text-xs text-slate-500 dark:text-slate-400">
        {fmtDate(entry.createdAt, locale)}
      </td>
      <td className="px-4 py-2">
        {entry.user ? (
          <div className="text-sm">
            <div className="font-medium text-slate-900 dark:text-slate-100">{entry.user.name}</div>
            <div className="text-xs text-slate-500 dark:text-slate-400">{entry.user.email}</div>
          </div>
        ) : (
          <span className="text-xs text-slate-400">—</span>
        )}
      </td>
      <td className="px-4 py-2 text-sm">
        <span className="text-slate-600 dark:text-slate-300">{entityLabel}</span>{' '}
        <span className="text-slate-900 dark:text-slate-100">{actionLabel}</span>
      </td>
      <td className="px-4 py-2 text-xs text-slate-600 dark:text-slate-400">
        {metaPairs.length > 0 ? (
          <div className="flex flex-wrap gap-x-3 gap-y-0.5">
            {metaPairs.map(([k, v]) => (
              <span key={k}>
                <span className="text-slate-500">{k}:</span> {v}
              </span>
            ))}
          </div>
        ) : (
          '—'
        )}
      </td>
      <td className="px-4 py-2 text-right">
        {href && (
          <Link
            href={href}
            className="text-xs text-slate-700 hover:underline dark:text-slate-200"
          >
            {t('open')} →
          </Link>
        )}
      </td>
    </tr>
  );
}
