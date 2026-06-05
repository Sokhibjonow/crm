'use client';

import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useState } from 'react';
import {
  type ActivityEntityType,
  type ActivityList,
  listActivity,
} from '@/lib/activity';
import { listTeam, type TeamMember } from '@/lib/team';
import { ActivityRow } from './_components/activity-row';

const PAGE_SIZE = 50;

const ENTITY_OPTIONS: ActivityEntityType[] = ['order', 'product', 'customer'];

const ACTION_OPTIONS = [
  'created',
  'updated',
  'status_changed',
  'payment_added',
  'stock_adjusted',
  'deleted',
] as const;

interface Props {
  params: { locale: string };
}

export default function ActivityPage({ params: { locale } }: Props) {
  const t = useTranslations('activity');
  const tCommon = useTranslations('common');

  const [data, setData] = useState<ActivityList | null>(null);
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [entityType, setEntityType] = useState<ActivityEntityType | ''>('');
  const [action, setAction] = useState<string>('');
  const [userId, setUserId] = useState<string>('');
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');
  const [offset, setOffset] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await listActivity({
        limit: PAGE_SIZE,
        offset,
        entityType: entityType || undefined,
        action: action || undefined,
        userId: userId || undefined,
        dateFrom: dateFrom ? new Date(dateFrom).toISOString() : undefined,
        // Snap dateTo to end-of-day in the local zone before serialising.
        dateTo: dateTo
          ? new Date(`${dateTo}T23:59:59.999`).toISOString()
          : undefined,
      });
      setData(res);
    } finally {
      setLoading(false);
    }
  }, [offset, entityType, action, userId, dateFrom, dateTo]);

  useEffect(() => {
    let cancelled = false;
    listTeam()
      .then((res) => {
        if (!cancelled) setTeam(res);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function resetFilters() {
    setEntityType('');
    setAction('');
    setUserId('');
    setDateFrom('');
    setDateTo('');
    setOffset(0);
  }

  // Reset offset whenever any filter changes.
  useEffect(() => {
    setOffset(0);
  }, [entityType, action, userId, dateFrom, dateTo]);

  const total = data?.total ?? 0;
  const from = data && data.items.length > 0 ? data.offset + 1 : 0;
  const to = data ? data.offset + data.items.length : 0;
  const hasPrev = offset > 0;
  const hasNext = data ? offset + data.items.length < data.total : false;

  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <h1 className="text-2xl font-semibold">{t('title')}</h1>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{t('subtitle')}</p>

      <section className="mt-6 rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 p-4">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          <label className="flex flex-col gap-1 text-xs">
            {t('filterEntity')}
            <select
              value={entityType}
              onChange={(e) => setEntityType(e.target.value as ActivityEntityType | '')}
              className="rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
            >
              <option value="">{t('all')}</option>
              {ENTITY_OPTIONS.map((e) => (
                <option key={e} value={e}>
                  {e === 'order'
                    ? t('entityOrder')
                    : e === 'product'
                      ? t('entityProduct')
                      : t('entityCustomer')}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1 text-xs">
            {t('filterAction')}
            <select
              value={action}
              onChange={(e) => setAction(e.target.value)}
              className="rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
            >
              <option value="">{t('all')}</option>
              {ACTION_OPTIONS.map((a) => (
                <option key={a} value={a}>
                  {a === 'created'
                    ? t('actionCreated')
                    : a === 'updated'
                      ? t('actionUpdated')
                      : a === 'status_changed'
                        ? t('actionStatusChanged')
                        : a === 'payment_added'
                          ? t('actionPaymentAdded')
                          : a === 'stock_adjusted'
                            ? t('actionStockAdjusted')
                            : t('actionDeleted')}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1 text-xs">
            {t('filterUser')}
            <select
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              className="rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
            >
              <option value="">{t('anyone')}</option>
              {team.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1 text-xs">
            {t('filterDateFrom')}
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
            />
          </label>

          <label className="flex flex-col gap-1 text-xs">
            {t('filterDateTo')}
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
            />
          </label>
        </div>
        <div className="mt-3 flex justify-end">
          <button
            type="button"
            onClick={resetFilters}
            className="rounded-md border border-slate-300 px-3 py-1.5 text-xs hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            {t('reset')}
          </button>
        </div>
      </section>

      <section className="mt-6 overflow-x-auto rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500 dark:bg-slate-800/50 dark:text-slate-400">
            <tr>
              <th className="px-4 py-2 font-medium">{t('when')}</th>
              <th className="px-4 py-2 font-medium">{t('who')}</th>
              <th className="px-4 py-2 font-medium">{t('what')}</th>
              <th className="px-4 py-2 font-medium">{t('details')}</th>
              <th className="px-4 py-2 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {loading && !data && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-slate-500">
                  {tCommon('loading')}
                </td>
              </tr>
            )}
            {!loading && data && data.items.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-slate-500">
                  {t('empty')}
                </td>
              </tr>
            )}
            {data?.items.map((entry) => (
              <ActivityRow key={entry.id} entry={entry} locale={locale} />
            ))}
          </tbody>
        </table>
      </section>

      {data && total > 0 && (
        <div className="mt-4 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
          <div>
            {t('showing', { from, to, total })}
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={!hasPrev || loading}
              onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}
              className="rounded-md border border-slate-300 px-3 py-1.5 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              ← {tCommon('prev')}
            </button>
            <button
              type="button"
              disabled={!hasNext || loading}
              onClick={() => setOffset(offset + PAGE_SIZE)}
              className="rounded-md border border-slate-300 px-3 py-1.5 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              {tCommon('next')} →
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
