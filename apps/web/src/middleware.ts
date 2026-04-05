import createMiddleware from 'next-intl/middleware';
import { locales, defaultLocale } from '@/lib/i18n/config';

export default createMiddleware({
  locales,
  defaultLocale,
  localePrefix: 'always',
});

export const config = {
  matcher: [
    // Enable locale routing for all paths except Next.js internals and static files
    '/((?!_next|_vercel|.*\\..*).*)',
  ],
};
