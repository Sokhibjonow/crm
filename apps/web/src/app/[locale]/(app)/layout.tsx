import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { LogoutButton } from './_components/logout-button';
import { UserBadge } from './_components/user-badge';

export default function AppLayout({
  children,
  params: { locale },
}: {
  children: React.ReactNode;
  params: { locale: string };
}) {
  return (
    <div className="flex min-h-screen flex-col">
      <Header locale={locale} />
      <div className="flex flex-1">
        <Sidebar locale={locale} />
        <div className="flex-1">{children}</div>
      </div>
    </div>
  );
}

function Header({ locale }: { locale: string }) {
  const tCommon = useTranslations('common');
  return (
    <header className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-3">
      <Link href={`/${locale}/dashboard`} className="text-lg font-semibold">
        {tCommon('appName')}
      </Link>
      <div className="flex items-center gap-4">
        <UserBadge />
        <LogoutButton />
      </div>
    </header>
  );
}

function Sidebar({ locale }: { locale: string }) {
  const tNav = useTranslations('nav');
  const items: Array<{ href: string; label: string }> = [
    { href: `/${locale}/dashboard`, label: tNav('dashboard') },
    { href: `/${locale}/customers`, label: tNav('customers') },
    { href: `/${locale}/orders`, label: tNav('orders') },
    { href: `/${locale}/products`, label: tNav('products') },
    { href: `/${locale}/inventory`, label: tNav('inventory') },
    { href: `/${locale}/reports`, label: tNav('reports') },
    { href: `/${locale}/team`, label: tNav('team') },
    { href: `/${locale}/settings`, label: tNav('settings') },
  ];
  return (
    <aside className="w-56 shrink-0 border-r border-slate-200 bg-white p-3">
      <nav className="flex flex-col gap-1 text-sm">
        {items.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="rounded-md px-3 py-2 text-slate-700 hover:bg-slate-100"
          >
            {item.label}
          </Link>
        ))}
      </nav>
    </aside>
  );
}
