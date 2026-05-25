import createIntlMiddleware from 'next-intl/middleware';
import { NextRequest, NextResponse } from 'next/server';
import { AUTH_COOKIE_NAME } from '@/lib/cookies';
import { defaultLocale, locales } from './i18n';

const intlMiddleware = createIntlMiddleware({
  locales,
  defaultLocale,
  localePrefix: 'always',
});

const PROTECTED_SEGMENTS = ['/dashboard'];
const AUTH_PAGES = ['/login', '/register'];

function isProtected(pathname: string): boolean {
  return PROTECTED_SEGMENTS.some((seg) => pathname.includes(seg));
}

function isAuthPage(pathname: string): boolean {
  return AUTH_PAGES.some((seg) => pathname.endsWith(seg));
}

function getLocaleFromPath(pathname: string): string {
  const seg = pathname.split('/')[1];
  return locales.includes(seg as (typeof locales)[number]) ? seg : defaultLocale;
}

export default function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const token = req.cookies.get(AUTH_COOKIE_NAME)?.value;
  const locale = getLocaleFromPath(pathname);

  if (isProtected(pathname) && !token) {
    const url = req.nextUrl.clone();
    url.pathname = `/${locale}/login`;
    return NextResponse.redirect(url);
  }

  if (isAuthPage(pathname) && token) {
    const url = req.nextUrl.clone();
    url.pathname = `/${locale}/dashboard`;
    return NextResponse.redirect(url);
  }

  return intlMiddleware(req);
}

export const config = {
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)'],
};
