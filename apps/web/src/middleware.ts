import createIntlMiddleware from 'next-intl/middleware';
import { NextRequest, NextResponse } from 'next/server';
import { AUTH_COOKIE_NAME } from '@/lib/cookies';
import { defaultLocale, locales } from './i18n';

const intlMiddleware = createIntlMiddleware({
  locales,
  defaultLocale,
  localePrefix: 'always',
});

const PROTECTED_TOP_SEGMENTS = new Set([
  'dashboard',
  'customers',
  'orders',
  'products',
  'inventory',
  'reports',
  'team',
  'settings',
]);
const AUTH_PAGES = new Set(['login', 'register']);

function parseSegments(pathname: string): { locale: string; top: string | undefined } {
  const parts = pathname.split('/').filter(Boolean);
  const locale = locales.includes(parts[0] as (typeof locales)[number]) ? parts[0]! : defaultLocale;
  const top = locales.includes(parts[0] as (typeof locales)[number]) ? parts[1] : parts[0];
  return { locale, top };
}

export default function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const token = req.cookies.get(AUTH_COOKIE_NAME)?.value;
  const { locale, top } = parseSegments(pathname);

  if (top && PROTECTED_TOP_SEGMENTS.has(top) && !token) {
    const url = req.nextUrl.clone();
    url.pathname = `/${locale}/login`;
    return NextResponse.redirect(url);
  }

  if (top && AUTH_PAGES.has(top) && token) {
    const url = req.nextUrl.clone();
    url.pathname = `/${locale}/dashboard`;
    return NextResponse.redirect(url);
  }

  return intlMiddleware(req);
}

export const config = {
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)'],
};
