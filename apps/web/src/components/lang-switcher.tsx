'use client';

import { usePathname, useRouter } from 'next/navigation';
import { locales, type Locale } from '@/i18n';

export function LangSwitcher() {
  const router = useRouter();
  const pathname = usePathname();

  const segments = pathname.split('/');
  const current = (locales.includes(segments[1] as Locale) ? segments[1] : 'uz') as Locale;

  function switchTo(next: Locale) {
    if (next === current) return;
    if (locales.includes(segments[1] as Locale)) {
      segments[1] = next;
    } else {
      segments.splice(1, 0, next);
    }
    router.push(segments.join('/') || `/${next}`);
    router.refresh();
  }

  return (
    <div
      role="group"
      aria-label="Language"
      className="inline-flex overflow-hidden rounded-md border border-slate-300 text-xs dark:border-slate-700"
    >
      {locales.map((loc) => (
        <button
          key={loc}
          type="button"
          onClick={() => switchTo(loc)}
          className={
            loc === current
              ? 'bg-slate-900 px-2 py-1.5 font-medium text-white dark:bg-slate-200 dark:text-slate-900'
              : 'bg-white px-2 py-1.5 text-slate-600 hover:bg-slate-50 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
          }
        >
          {loc.toUpperCase()}
        </button>
      ))}
    </div>
  );
}
