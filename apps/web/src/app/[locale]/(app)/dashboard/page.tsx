import { useTranslations } from 'next-intl';

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
      <div className="text-sm text-slate-500">{label}</div>
      <div className="mt-2 text-2xl font-semibold">{value}</div>
    </div>
  );
}

export default function DashboardPage() {
  const tDash = useTranslations('dashboard');

  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <h1 className="text-2xl font-semibold">{tDash('title')}</h1>
      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label={tDash('ordersToday')} value="—" />
        <StatCard label={tDash('revenueToday')} value="—" />
        <StatCard label={tDash('pendingOrders')} value="—" />
        <StatCard label={tDash('lowStock')} value="—" />
      </div>
    </main>
  );
}
