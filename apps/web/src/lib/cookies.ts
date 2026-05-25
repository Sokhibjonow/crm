// Tiny cookie helpers usable from client components.
// Server-side reads should use cookies() from next/headers.

const AUTH_COOKIE = 'savdo_auth';
const MAX_AGE_DAYS = 7;

export function setAuthCookie(token: string) {
  if (typeof document === 'undefined') return;
  const maxAge = MAX_AGE_DAYS * 24 * 60 * 60;
  const secure = location.protocol === 'https:' ? '; Secure' : '';
  document.cookie = `${AUTH_COOKIE}=${encodeURIComponent(token)}; Path=/; Max-Age=${maxAge}; SameSite=Lax${secure}`;
}

export function getAuthCookie(): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie
    .split('; ')
    .find((row) => row.startsWith(`${AUTH_COOKIE}=`));
  if (!match) return null;
  return decodeURIComponent(match.slice(AUTH_COOKIE.length + 1));
}

export function clearAuthCookie() {
  if (typeof document === 'undefined') return;
  document.cookie = `${AUTH_COOKIE}=; Path=/; Max-Age=0; SameSite=Lax`;
}

export const AUTH_COOKIE_NAME = AUTH_COOKIE;
