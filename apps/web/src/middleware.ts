import { type NextRequest, NextResponse } from 'next/server';
import createIntlMiddleware from 'next-intl/middleware';
import { createServerClient } from '@supabase/ssr';
import { locales, defaultLocale } from '@/lib/i18n/config';

const intlMiddleware = createIntlMiddleware({
  locales,
  defaultLocale,
  localePrefix: 'always',
});

// Login ve public sayfalar — auth gerekmez
const PUBLIC_PATHS = ['/login'];

function isPublicPath(pathname: string): boolean {
  return locales.some((locale) =>
    PUBLIC_PATHS.some((p) => pathname === `/${locale}${p}` || pathname.startsWith(`/${locale}${p}/`))
  );
}

export async function middleware(request: NextRequest) {
  // Supabase env varları yoksa (build aşaması), sadece intl middleware çalışsın
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return intlMiddleware(request);
  }

  // Önce intl middleware ile locale routing'i çözümle
  const intlResponse = intlMiddleware(request);
  const { pathname } = request.nextUrl;

  // Public path ise auth kontrolü yapma
  if (isPublicPath(pathname)) {
    return intlResponse;
  }

  // Supabase session kontrolü
  let response = intlResponse ?? NextResponse.next({ request });

  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
        cookiesToSet.forEach(({ name, value, options }) => {
          request.cookies.set(name, value);
          response.cookies.set(name, value, options);
        });
      },
    },
  });

  const { data: { user } } = await supabase.auth.getUser();

  // Giriş yapılmamışsa login'e yönlendir
  if (!user) {
    // Zaten locale'li pathname'den locale'i çıkar
    const localeMatch = locales.find((l) => pathname.startsWith(`/${l}`));
    const locale = localeMatch ?? defaultLocale;
    const loginUrl = new URL(`/${locale}/login`, request.url);
    return NextResponse.redirect(loginUrl);
  }

  return response;
}

export const config = {
  matcher: [
    '/((?!_next|_vercel|favicon.ico|.*\\..*).*)',
  ],
};
