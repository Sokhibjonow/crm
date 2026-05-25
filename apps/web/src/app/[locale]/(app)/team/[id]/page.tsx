'use client';

import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { FormEvent, useEffect, useState } from 'react';
import { ApiError } from '@/lib/api';
import { type AuthUser, type UserRole, getCurrentUser } from '@/lib/auth';
import {
  deactivateMember,
  getMember,
  resetMemberPassword,
  type TeamMember,
  updateMember,
} from '@/lib/team';

const ROLES: UserRole[] = ['OWNER', 'MANAGER', 'CASHIER', 'WAREHOUSE', 'COURIER'];

interface Props {
  params: { locale: string; id: string };
}

export default function EditMemberPage({ params: { locale, id } }: Props) {
  const t = useTranslations('team');
  const tRoles = useTranslations('team.roleValues');
  const tAuth = useTranslations('auth');
  const tCommon = useTranslations('common');
  const router = useRouter();

  const [me, setMe] = useState<AuthUser | null>(null);
  const [member, setMember] = useState<TeamMember | null>(null);
  const [loadError, setLoadError] = useState(false);

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState<UserRole>('MANAGER');
  const [isActive, setIsActive] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const [newPassword, setNewPassword] = useState('');
  const [pwSaving, setPwSaving] = useState(false);
  const [pwError, setPwError] = useState<string | null>(null);
  const [pwSuccess, setPwSuccess] = useState(false);

  useEffect(() => {
    let cancelled = false;
    Promise.all([getCurrentUser(), getMember(id)])
      .then(([u, m]) => {
        if (cancelled) return;
        setMe(u);
        setMember(m);
        setName(m.name);
        setPhone(m.phone ?? '');
        setRole(m.role);
        setIsActive(m.isActive);
      })
      .catch(() => {
        if (!cancelled) setLoadError(true);
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  function mapSaveError(err: unknown): string {
    if (err instanceof ApiError) {
      if (err.status === 400) return t('errorLastOwner');
      if (err.status === 403) {
        if (err.message.toLowerCase().includes('role')) return t('errorSelfRole');
        return t('errorSelfDeactivate');
      }
      if (err.status === 409) return t('errorEmailTaken');
    }
    return tAuth('errorGeneric');
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!member) return;
    setSaveError(null);
    setSaving(true);
    try {
      const updated = await updateMember(id, {
        name: name.trim(),
        phone: phone.trim() || undefined,
        role,
        isActive,
      });
      setMember(updated);
    } catch (err) {
      setSaveError(mapSaveError(err));
    } finally {
      setSaving(false);
    }
  }

  async function onResetPassword(e: FormEvent) {
    e.preventDefault();
    setPwError(null);
    setPwSuccess(false);
    setPwSaving(true);
    try {
      await resetMemberPassword(id, newPassword);
      setPwSuccess(true);
      setNewPassword('');
    } catch {
      setPwError(tAuth('errorGeneric'));
    } finally {
      setPwSaving(false);
    }
  }

  async function onDeactivate() {
    if (!confirm(t('deactivateConfirm'))) return;
    setSaveError(null);
    try {
      const updated = await deactivateMember(id);
      setMember(updated);
      setIsActive(false);
      router.refresh();
    } catch (err) {
      setSaveError(mapSaveError(err));
    }
  }

  if (loadError) {
    return (
      <main className="mx-auto max-w-xl px-6 py-10">
        <p className="text-sm text-red-600">{t('noResults')}</p>
      </main>
    );
  }

  if (!member || !me) {
    return (
      <main className="mx-auto max-w-xl px-6 py-10">
        <p className="text-sm text-slate-500">…</p>
      </main>
    );
  }

  if (me.role !== 'OWNER') {
    return (
      <main className="mx-auto max-w-xl px-6 py-10">
        <p className="text-sm text-slate-500">{t('ownerOnly')}</p>
      </main>
    );
  }

  const isSelf = me.id === member.id;

  return (
    <main className="mx-auto max-w-xl px-6 py-10">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">{t('editTitle')}</h1>
        {!isSelf && member.isActive && (
          <button
            type="button"
            onClick={onDeactivate}
            className="rounded-md border border-red-300 px-3 py-1.5 text-sm text-red-700 hover:bg-red-50"
          >
            {t('deactivate')}
          </button>
        )}
      </div>

      <p className="mt-2 text-sm text-slate-500">{member.email}</p>

      <form onSubmit={onSubmit} className="mt-6 flex flex-col gap-4">
        <label className="flex flex-col gap-1 text-sm">
          {t('name')}
          <input
            type="text"
            required
            minLength={2}
            maxLength={80}
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="rounded-md border border-slate-300 px-3 py-2"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          {t('phone')}
          <input
            type="tel"
            maxLength={40}
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="rounded-md border border-slate-300 px-3 py-2"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          {t('role')}
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as UserRole)}
            disabled={isSelf}
            className="rounded-md border border-slate-300 bg-white px-3 py-2 disabled:bg-slate-50"
          >
            {ROLES.map((r) => (
              <option key={r} value={r}>
                {tRoles(r)}
              </option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={isActive}
            disabled={isSelf}
            onChange={(e) => setIsActive(e.target.checked)}
          />
          {t('active')}
        </label>
        {saveError && <p className="text-sm text-red-600">{saveError}</p>}
        <div>
          <button
            type="submit"
            disabled={saving}
            className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
          >
            {saving ? tAuth('submitting') : tCommon('save')}
          </button>
        </div>
      </form>

      <section className="mt-10 rounded-lg border border-slate-200 bg-white p-4">
        <h2 className="text-sm font-semibold">{t('resetPasswordTitle')}</h2>
        <form onSubmit={onResetPassword} className="mt-3 flex items-end gap-3">
          <label className="flex flex-1 flex-col gap-1 text-xs">
            {t('newPassword')}
            <input
              type="password"
              required
              minLength={8}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
          </label>
          <button
            type="submit"
            disabled={pwSaving}
            className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
          >
            {pwSaving ? tAuth('submitting') : t('resetPassword')}
          </button>
        </form>
        {pwError && <p className="mt-2 text-sm text-red-600">{pwError}</p>}
        {pwSuccess && <p className="mt-2 text-sm text-green-700">✓</p>}
      </section>
    </main>
  );
}
