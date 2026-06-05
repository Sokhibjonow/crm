import { CurrentUserProvider } from '@/lib/current-user';
import { AppShell } from './_components/app-shell';

export default function AppLayout({
  children,
  params: { locale },
}: {
  children: React.ReactNode;
  params: { locale: string };
}) {
  return (
    <CurrentUserProvider>
      <AppShell locale={locale}>{children}</AppShell>
    </CurrentUserProvider>
  );
}
