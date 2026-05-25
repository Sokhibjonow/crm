'use client';

import { useTranslations } from 'next-intl';
import { useEffect, useState } from 'react';
import {
  type CustomerTelegramLink,
  disconnectCustomerTelegram,
  getCustomerTelegramLink,
  regenerateCustomerTelegramLink,
} from '@/lib/telegram';

export function TelegramSection({ customerId }: { customerId: string }) {
  const t = useTranslations('customers');
  const [link, setLink] = useState<CustomerTelegramLink | null>(null);
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getCustomerTelegramLink(customerId)
      .then((res) => {
        if (!cancelled) setLink(res);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [customerId]);

  async function regenerate() {
    setPending(true);
    try {
      const res = await regenerateCustomerTelegramLink(customerId);
      setLink(res);
      setCopied(false);
    } finally {
      setPending(false);
    }
  }

  async function disconnect() {
    setPending(true);
    try {
      await disconnectCustomerTelegram(customerId);
      setLink({
        connected: false,
        code: null,
        url: null,
        botUsername: link?.botUsername ?? null,
      });
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
      <section className="mt-10 rounded-lg border border-slate-200 bg-white p-4">
        <h2 className="text-sm font-semibold">{t('telegramTitle')}</h2>
        <p className="mt-2 text-sm text-slate-500">…</p>
      </section>
    );
  }
  if (!link) return null;

  return (
    <section className="mt-10 rounded-lg border border-slate-200 bg-white p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold">{t('telegramTitle')}</h2>
        {link.connected && (
          <span className="rounded bg-green-100 px-2 py-0.5 text-xs text-green-700">
            {t('telegramConnected')}
          </span>
        )}
      </div>

      {!link.botUsername && (
        <p className="mt-2 text-sm text-amber-700">{t('telegramNotConfigured')}</p>
      )}

      {link.url && (
        <div className="mt-3">
          <p className="text-xs text-slate-500">{t('telegramLinkHint')}</p>
          <div className="mt-2 flex items-center gap-2">
            <input
              readOnly
              value={link.url}
              className="flex-1 rounded-md border border-slate-300 bg-slate-50 px-3 py-2 text-sm"
            />
            <button
              type="button"
              onClick={copy}
              className="rounded-md border border-slate-300 px-3 py-2 text-sm hover:bg-slate-50"
            >
              {copied ? t('telegramCopied') : t('telegramCopy')}
            </button>
          </div>
        </div>
      )}

      <div className="mt-3 flex gap-2">
        {link.botUsername && (
          <button
            type="button"
            onClick={regenerate}
            disabled={pending}
            className="rounded-md border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-50 disabled:opacity-60"
          >
            {link.url ? t('telegramRegenerateLink') : t('telegramGenerateLink')}
          </button>
        )}
        {link.connected && (
          <button
            type="button"
            onClick={disconnect}
            disabled={pending}
            className="rounded-md border border-red-300 px-3 py-1.5 text-sm text-red-700 hover:bg-red-50 disabled:opacity-60"
          >
            {t('telegramDisconnect')}
          </button>
        )}
      </div>
    </section>
  );
}
