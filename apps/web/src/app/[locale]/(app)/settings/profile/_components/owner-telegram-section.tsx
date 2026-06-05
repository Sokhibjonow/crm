'use client';

import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import {
  disconnectMyTelegram,
  getMyTelegramLink,
  type MyTelegramLink,
  regenerateMyTelegramLink,
} from '@/lib/auth';

export function OwnerTelegramSection() {
  const t = useTranslations('settings');
  const [link, setLink] = useState<MyTelegramLink | null>(null);
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getMyTelegramLink()
      .then((res) => {
        if (!cancelled) setLink(res);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function regenerate() {
    setPending(true);
    try {
      const res = await regenerateMyTelegramLink();
      setLink(res);
      setCopied(false);
    } catch {
      toast.error(t('telegramTitle'));
    } finally {
      setPending(false);
    }
  }

  async function disconnect() {
    setPending(true);
    try {
      await disconnectMyTelegram();
      setLink((prev) =>
        prev ? { ...prev, connected: false, code: null, url: null } : prev,
      );
      toast.success(t('telegramDisconnect'));
    } finally {
      setPending(false);
    }
  }

  async function copy() {
    if (!link?.url) return;
    try {
      await navigator.clipboard.writeText(link.url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  }

  if (loading) {
    return (
      <section className="mt-10 rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 p-4">
        <h2 className="text-sm font-semibold">{t('telegramTitle')}</h2>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">…</p>
      </section>
    );
  }
  if (!link) return null;

  return (
    <section className="mt-10 rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold">{t('telegramTitle')}</h2>
        {link.connected && (
          <span className="rounded bg-green-100 px-2 py-0.5 text-xs text-green-700 dark:bg-green-900/40 dark:text-green-300">
            {t('telegramConnected')}
          </span>
        )}
      </div>

      <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
        {t('telegramDesc')}
      </p>

      {!link.botUsername && (
        <p className="mt-2 text-sm text-amber-700">{t('telegramNotConfigured')}</p>
      )}

      {link.url && (
        <div className="mt-3">
          <p className="text-xs text-slate-500 dark:text-slate-400">{t('telegramLinkHint')}</p>
          <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center">
            <input
              readOnly
              value={link.url}
              className="flex-1 rounded-md border border-slate-300 bg-slate-50 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={copy}
                className="rounded-md border border-slate-300 px-3 py-2 text-sm hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
              >
                {copied ? t('telegramCopied') : t('telegramCopy')}
              </button>
              <a
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800 dark:bg-slate-200 dark:text-slate-900 dark:hover:bg-slate-300"
              >
                {t('telegramOpen')}
              </a>
            </div>
          </div>
        </div>
      )}

      <div className="mt-3 flex gap-2">
        {link.botUsername && (
          <button
            type="button"
            onClick={regenerate}
            disabled={pending}
            className="rounded-md border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-50 disabled:opacity-60 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            {link.url ? t('telegramRegenerateLink') : t('telegramGenerateLink')}
          </button>
        )}
        {link.connected && (
          <button
            type="button"
            onClick={disconnect}
            disabled={pending}
            className="rounded-md border border-red-300 px-3 py-1.5 text-sm text-red-700 hover:bg-red-50 disabled:opacity-60 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-950/40"
          >
            {t('telegramDisconnect')}
          </button>
        )}
      </div>
    </section>
  );
}
