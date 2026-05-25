import { useTranslations } from 'next-intl';

export default function RegisterPage() {
  const tAuth = useTranslations('auth');
  const tCommon = useTranslations('common');

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-6 px-6">
      <h1 className="text-2xl font-semibold">{tAuth('registerTitle')}</h1>
      <form className="flex flex-col gap-4">
        <label className="flex flex-col gap-1 text-sm">
          {tCommon('email')}
          <input type="email" className="rounded-md border border-slate-300 px-3 py-2" disabled />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          {tCommon('password')}
          <input type="password" className="rounded-md border border-slate-300 px-3 py-2" disabled />
        </label>
        <button
          type="button"
          className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white opacity-60"
          disabled
        >
          {tCommon('signUp')}
        </button>
      </form>
    </main>
  );
}
