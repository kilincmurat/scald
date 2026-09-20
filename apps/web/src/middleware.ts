import { type NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { canAccess, HOME_PATH, normaliseRole, type Role } from '@/lib/roles';

const PUBLIC_PATHS = ['/login', '/explore', '/prep-sheet', '/methodology'];

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

export async function middleware(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const { pathname } = request.nextUrl;

  // API routes are never page-navigation and enforce their own auth
  // (e.g. /api/admin/users → requireAdmin). The page-access matrix does not
  // whitelist /api/*, so letting the middleware run here would redirect API
  // calls to a page and break them (empty 405 → "Unexpected end of JSON input").
  if (pathname.startsWith('/api')) {
    return NextResponse.next();
  }

  // Public pages render without a session; /explore degrades to an empty
  // state on its own when Supabase is unreachable.
  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  // Fail CLOSED on missing configuration. Letting requests through here would
  // serve every protected page to an anonymous visitor — and a missing/typo'd
  // env var is exactly the failure mode of a fresh deployment. 503 also names
  // the cause, instead of the app looking half-broken.
  if (!supabaseUrl || !supabaseKey) {
    return new NextResponse(
      'SCALD is not configured: NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY are missing. ' +
        'These are baked in at build time — rebuild the image with them set.',
      { status: 503, headers: { 'content-type': 'text/plain; charset=utf-8' } },
    );
  }

  const response = NextResponse.next({ request });

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

  if (!user) {
    const loginUrl = new URL('/login', request.url);
    return NextResponse.redirect(loginUrl);
  }

  // Fetch role from profiles for role-based gating.
  let role: Role = 'data_entry';
  try {
    const { data } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle();
    role = normaliseRole((data as { role?: string } | null)?.role ?? null);
  } catch {
    // Fall back to default role; the RoleGate client wrapper will re-check.
  }

  if (!canAccess(role, pathname)) {
    const home = new URL(HOME_PATH[role], request.url);
    return NextResponse.redirect(home);
  }

  return response;
}

export const config = {
  matcher: [
    '/((?!api|_next|_vercel|favicon.ico|.*\\..*).*)',
  ],
};
