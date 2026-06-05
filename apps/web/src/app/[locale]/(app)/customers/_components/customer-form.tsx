'use client';

import { useTranslations } from 'next-intl';
import { FormEvent, useState } from 'react';
import { toast } from 'sonner';
import { ApiError } from '@/lib/api';
import type { CustomerInput } from '@/lib/customers';

interface Props {
  initial?: CustomerInput;
  submitLabel: string;
  onSubmit: (input: CustomerInput) => Promise<void>;
}

function tagsToString(tags?: string[]): string {
  return (tags ?? []).join(', ');
}

function stringToTags(value: string): string[] {
  return value
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

export function CustomerForm({ initial, submitLabel, onSubmit }: Props) {
  const tCommon = useTranslations('common');
  const tCustomers = useTranslations('customers');
  const tAuth = useTranslations('auth');

  const [name, setName] = useState(initial?.name ?? '');
  const [phone, setPhone] = useState(initial?.phone ?? '');
  const [telegram, setTelegram] = useState(initial?.telegram ?? '');
  const [notes, setNotes] = useState(initial?.notes ?? '');
  const [tagsInput, setTagsInput] = useState(tagsToString(initial?.tags));
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);
    try {
      await onSubmit({
        name: name.trim(),
        phone: phone.trim() || undefined,
        telegram: telegram.trim() || undefined,
        notes: notes.trim() || undefined,
        tags: stringToTags(tagsInput),
      });
      toast.success(initial ? tCommon('saved') : tCommon('created'));
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        setError(tCustomers('errorPhoneTaken'));
      } else {
        setError(tAuth('errorGeneric'));
      }
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex max-w-xl flex-col gap-4">
      <label className="flex flex-col gap-1 text-sm">
        {tCustomers('name')} *
        <input
          type="text"
          required
          minLength={1}
          maxLength={120}
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="rounded-md border border-slate-300 px-3 py-2 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        {tCustomers('phone')}
        <input
          type="tel"
          maxLength={40}
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          className="rounded-md border border-slate-300 px-3 py-2 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        {tCustomers('telegram')}
        <input
          type="text"
          maxLength={80}
          value={telegram}
          onChange={(e) => setTelegram(e.target.value)}
          placeholder="@username"
          className="rounded-md border border-slate-300 px-3 py-2 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        {tCustomers('tags')}
        <input
          type="text"
          value={tagsInput}
          onChange={(e) => setTagsInput(e.target.value)}
          placeholder={tCustomers('tagsHint')}
          className="rounded-md border border-slate-300 px-3 py-2 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        {tCustomers('notes')}
        <textarea
          rows={4}
          maxLength={2000}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="rounded-md border border-slate-300 px-3 py-2 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
        />
      </label>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div>
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white dark:bg-slate-200 dark:text-slate-900 disabled:opacity-60"
        >
          {pending ? tAuth('submitting') : submitLabel}
        </button>
      </div>
    </form>
  );
}
