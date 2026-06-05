'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { LangSwitcher } from '@/components/lang-switcher';
import { ThemeSwitcher } from '@/components/theme-switcher';
import { useCurrentUser } from '@/lib/current-user';
import { navItemsFor } from '@/lib/permissions';
import { LogoutButton } from './logout-button';
import { UserBadge } from './user-badge';

interface NavItem {
  href: string;
  label: string;
}

interface Props {
  locale: string;
  children: React.ReactNode;
}

export function AppShell({ locale, children }: Props) {
  const tCommon = useTranslations('common');
  const tNav = useTranslations('nav');
  const pathname = usePathname();
  const { user } = useCurrentUser();
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Close the drawer on route change.
  useEffect(() => {
    setDrawerOpen(false);
  }, [pathname]);

  // Lock body scroll while drawer is open on mobile.
  useEffect(() => {
    if (drawerOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [drawerOpen]);

  const allowed = navItemsFor(user?.role);
  const allItems: Record<(typeof allowed)[number], NavItem> = {
    dashboard: { href: `/${locale}/dashboard`, label: tNav('dashboard') },
    customers: { href: `/${locale}/customers`, label: tNav('customers') },
    orders: { href: `/${locale}/orders`, label: tNav('orders') },
    products: { href: `/${locale}/products`, label: tNav('products') },
    inventory: { href: `/${locale}/inventory`, label: tNav('inventory') },
    reports: { href: `/${locale}/reports`, label: tNav('reports') },
    team: { href: `/${locale}/team`, label: tNav('team') },
    settings: { href: `/${locale}/settings`, label: tNav('settings') },
  };
  const items: NavItem[] = allowed.map((k) => allItems[k]);

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 dark:bg-slate-950">
      {/* Header */}
      <header className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-900 sm:px-6">
        <div className="flex items-center gap-3">
          <button
            type="button"
            aria-label="Toggle navigation"
            onClick={() => setDrawerOpen((v) => !v)}
            className="rounded-md border border-slate-300 p-1.5 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800 md:hidden"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-5 w-5"
              aria-hidden
            >
              {drawerOpen ? (
                <>
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </>
              ) : (
                <>
                  <line x1="3" y1="6" x2="21" y2="6" />
                  <line x1="3" y1="12" x2="21" y2="12" />
                  <line x1="3" y1="18" x2="21" y2="18" />
                </>
              )}
            </svg>
          </button>
          <Link
            href={`/${locale}/dashboard`}
            className="text-base font-semibold text-slate-900 dark:text-slate-100 sm:text-lg"
          >
            {tCommon('appName')}
          </Link>
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          <LangSwitcher />
          <ThemeSwitcher />
          <div className="hidden sm:block">
            <UserBadge />
          </div>
          <LogoutButton />
        </div>
      </header>

      <div className="flex flex-1">
        {/* Desktop sidebar */}
        <aside className="hidden w-56 shrink-0 border-r border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 md:block">
          <Sidebar items={items} pathname={pathname} />
        </aside>

        {/* Mobile drawer + backdrop */}
        {drawerOpen && (
          <div
            className="fixed inset-0 z-40 bg-slate-900/60 md:hidden"
            onClick={() => setDrawerOpen(false)}
            aria-hidden
          />
        )}
        <aside
          className={`fixed inset-y-0 left-0 z-50 w-64 transform border-r border-slate-200 bg-white transition-transform duration-200 dark:border-slate-800 dark:bg-slate-900 md:hidden ${
            drawerOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 dark:border-slate-800">
            <span className="text-sm font-medium">{tCommon('appName')}</span>
            <button
              type="button"
              onClick={() => setDrawerOpen(false)}
              aria-label="Close navigation"
              className="rounded-md p-1 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-5 w-5"
                aria-hidden
              >
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
          <div className="px-2 pb-4 pt-2">
            <UserBadge />
          </div>
          <Sidebar items={items} pathname={pathname} />
        </aside>

        {/* Main content */}
        <div className="flex-1 min-w-0">{children}</div>
      </div>
    </div>
  );
}

function Sidebar({ items, pathname }: { items: NavItem[]; pathname: string }) {
  return (
    <nav className="flex flex-col gap-1 p-3 text-sm">
      {items.map((item) => {
        const active = pathname === item.href || pathname.startsWith(item.href + '/');
        return (
          <Link
            key={item.href}
            href={item.href}
            className={
              active
                ? 'rounded-md bg-slate-900 px-3 py-2 font-medium text-white dark:bg-slate-200 dark:text-slate-900'
                : 'rounded-md px-3 py-2 text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
            }
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
