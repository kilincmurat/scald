import { NextResponse } from 'next/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { createClient as createServerClient } from '@/lib/supabase/server';

/**
 * Admin-only helper endpoints that use the service_role key to perform
 * auth.users mutations from the browser side.
 *
 * Required env var (server-side only):
 *   SUPABASE_SERVICE_ROLE_KEY=<service-role-key>
 *
 * Also needs the standard NEXT_PUBLIC_SUPABASE_URL.
 */

const VALID_ROLES = ['admin', 'data_entry', 'decision_maker', 'researcher'] as const;

// Belediyeye bağlı olmayan roller (kendi belediyesi yok — çok belediye / sistem).
const MUNICIPALITY_EXEMPT_ROLES: readonly Role[] = ['admin', 'researcher'];
type Role = (typeof VALID_ROLES)[number];

function service() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createSupabaseClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

async function requireAdmin() {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'Not signed in', status: 401 as const };
  const { data } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();
  const role = (data as { role?: string } | null)?.role;
  if (role !== 'admin') return { error: 'Admin only', status: 403 as const };
  return { ok: true as const };
}

/** POST — create a new user account with role + municipality. */
export async function POST(req: Request) {
  const auth = await requireAdmin();
  if (!('ok' in auth)) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const admin = service();
  if (!admin) {
    return NextResponse.json(
      {
        error:
          'Server not configured. Set SUPABASE_SERVICE_ROLE_KEY in .env.local (server-side only).',
      },
      { status: 500 },
    );
  }

  let body: {
    email?: string;
    password?: string;
    full_name?: string;
    role?: Role;
    municipality_id?: string | null;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const email = body.email?.trim();
  const password = body.password;
  const role = body.role;
  const fullName = body.full_name?.trim() ?? '';
  const municipalityId = body.municipality_id ?? null;

  if (!email) return NextResponse.json({ error: 'Email required' }, { status: 400 });
  if (!password || password.length < 8) {
    return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 });
  }
  if (!role || !VALID_ROLES.includes(role)) {
    return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
  }
  if (!MUNICIPALITY_EXEMPT_ROLES.includes(role) && !municipalityId) {
    return NextResponse.json(
      { error: 'This role requires a municipality' },
      { status: 400 },
    );
  }

  // Create auth user
  const { data: createRes, error: createErr } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      full_name: fullName,
      role,
      municipality_id: municipalityId,
    },
  });
  if (createErr || !createRes.user) {
    return NextResponse.json(
      { error: createErr?.message ?? 'Failed to create user' },
      { status: 400 },
    );
  }

  // The DB trigger should have created a profile row, but role/municipality
  // might not match (trigger reads user_metadata but user might have been
  // created before trigger update). Upsert to guarantee correctness.
  const userId = createRes.user.id;
  await admin
    .from('profiles')
    .upsert(
      {
        id: userId,
        email,
        full_name: fullName || null,
        role,
        municipality_id: municipalityId,
      },
      { onConflict: 'id' },
    );

  return NextResponse.json({ ok: true, id: userId });
}

/** DELETE — remove a user. Cascades through auth.users → profiles. */
export async function DELETE(req: Request) {
  const auth = await requireAdmin();
  if (!('ok' in auth)) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const admin = service();
  if (!admin) {
    return NextResponse.json(
      { error: 'Server not configured. Set SUPABASE_SERVICE_ROLE_KEY.' },
      { status: 500 },
    );
  }

  const url = new URL(req.url);
  const id = url.searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id parameter required' }, { status: 400 });

  const { error: delErr } = await admin.auth.admin.deleteUser(id);
  if (delErr) return NextResponse.json({ error: delErr.message }, { status: 400 });

  return NextResponse.json({ ok: true });
}
