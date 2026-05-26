'use client';

import { formatMoney } from '@/lib/format';
import type { DailyRevenuePoint } from '@/lib/reports';

interface Props {
  data: DailyRevenuePoint[];
  locale: string;
}

export function DailyRevenueBars({ data, locale }: Props) {
  const max = Math.max(1, ...data.map((d) => Number(d.revenue)));

  return (
    <div className="rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 p-4 dark:border-slate-800 dark:bg-slate-900">
      <div className="flex h-44 items-end gap-1">
        {data.map((d) => {
          const value = Number(d.revenue);
          const heightPct = (value / max) * 100;
          return (
            <div
              key={d.date}
              className="group relative flex flex-1 flex-col justify-end"
              title={`${d.date}: ${formatMoney(d.revenue, locale)}`}
            >
              <div
                className="rounded-t bg-slate-900 transition-opacity group-hover:bg-slate-700"
                style={{ height: `${Math.max(2, heightPct)}%` }}
              />
            </div>
          );
        })}
      </div>
      <div className="mt-2 flex justify-between text-xs text-slate-500 dark:text-slate-400">
        <span>{data[0]?.date ?? ''}</span>
        <span>{data[data.length - 1]?.date ?? ''}</span>
      </div>
    </div>
  );
}
