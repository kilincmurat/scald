import { NextResponse } from 'next/server';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { parseUserAgent } from '@/lib/user-agent';

/**
 * Records a LOGIN audit entry after a successful sign-in.
 *
 * Captures — from the request itself (trustworthy) — the client IP and the
 * User-Agent, plus a few client-provided context hints (timezone as a coarse
 * location, language). Written to public.audit_logs with the caller's own
 * user_id, which satisfies the RLS insert policy (user_id = auth.uid()).
 *
 * Fire-and-forget from the login page: any failure here must never affect the
 * user's ability to sign in, so callers ignore the response.
 */

function clientIp(req: Request): string | null {
  const fwd = req.headers.get('x-forwarded-for');
  if (fwd) {
    const first = fwd.split(',')[0]?.trim();
    if (first) return first;
  }
  return req.headers.get('x-real-ip') || null;
}

export async function POST(req: Request) {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // No session yet (cookie not propagated) — silently skip, never block login.
  if (!user) return NextResponse.json({ ok: false }, { status: 200 });

  let body: { timezone?: string; language?: string } = {};
  try {
    body = await req.json();
  } catch {
    /* body is optional */
  }

  const ua = req.headers.get('user-agent');
  const ip = clientIp(req);

  const auditRow = {
    user_id: user.id,
    action: 'LOGIN',
    table_name: null,
    record_id: null,
    old_values: null,
    ip_address: ip,
    user_agent: ua,
    new_values: {
      device: parseUserAgent(ua),
      timezone: body.timezone ?? null,
      language: body.language ?? null,
    },
  };

  // Cast: this hand-maintained Database type makes the audit_logs Insert
  // resolve to `never` under supabase-js v2 typings. The row shape is correct
  // at runtime; the admin mutation routes sidestep the same issue similarly.
  const { error } = await supabase.from('audit_logs').insert(auditRow as never);

  if (error) return NextResponse.json({ ok: false }, { status: 200 });
  return NextResponse.json({ ok: true });
}
