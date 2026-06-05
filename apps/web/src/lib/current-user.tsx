'use client';

import { useParams, useRouter } from 'next/navigation';
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { ApiError } from './api';
import { type AuthUser, getCurrentUser, logout } from './auth';
import { type Action, can as canCheck } from './permissions';

interface CurrentUserContextValue {
  user: AuthUser | null;
  loading: boolean;
  can: (action: Action) => boolean;
  refresh: () => Promise<void>;
}

const CurrentUserContext = createContext<CurrentUserContextValue | null>(null);

export function CurrentUserProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const params = useParams<{ locale?: string }>();

  async function fetchMe(initial = false) {
    try {
      const me = await getCurrentUser();
      setUser(me);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401 && initial) {
        // Token expired/invalid — redirect to login.
        logout();
        router.replace(`/${params.locale ?? 'uz'}/login`);
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const me = await getCurrentUser();
        if (!cancelled) setUser(me);
      } catch (err) {
        if (cancelled) return;
        if (err instanceof ApiError && err.status === 401) {
          logout();
          router.replace(`/${params.locale ?? 'uz'}/login`);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [params.locale, router]);

  const value = useMemo<CurrentUserContextValue>(
    () => ({
      user,
      loading,
      can: (action) => canCheck(user?.role, action),
      refresh: () => fetchMe(false),
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [user, loading],
  );

  return (
    <CurrentUserContext.Provider value={value}>{children}</CurrentUserContext.Provider>
  );
}

export function useCurrentUser(): CurrentUserContextValue {
  const ctx = useContext(CurrentUserContext);
  if (!ctx) {
    throw new Error('useCurrentUser must be used inside CurrentUserProvider');
  }
  return ctx;
}
