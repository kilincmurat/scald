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
type Role = (typeof VALID_ROLES)[number];

function service() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createSupabaseClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

type AdminCheck = { ok: true; userId: string } | { ok: false; error: string; status: 401 | 403 };

async function requireAdmin(): Promise<AdminCheck> {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: 'Not signed in', status: 401 };
  const { data } = await supabase
    .from('profiles')
    .select('role, is_active')
    .eq('id', user.id)
    .maybeSingle();
  const profile = data as { role?: string; is_active?: boolean } | null;
  if (profile?.role !== 'admin' || profile.is_active === false) {
    return { ok: false, error: 'Admin only', status: 403 };
  }
  return { ok: true, userId: user.id };
}

/**
 * Account creation and deletion run with the service role, so the database
 * audit trigger cannot see who did them — record the administrator here.
 */
async function audit(
  admin: NonNullable<ReturnType<typeof service>>,
  actorId: string,
  action: 'INSERT' | 'DELETE',
  recordId: string,
  values: Record<string, unknown>,
) {
  await admin.from('audit_logs').insert({
    user_id: actorId,
    action,
    table_name: 'profiles',
    record_id: recordId,
    old_values: action === 'DELETE' ? values : null,
    new_values: action === 'INSERT' ? values : null,
  });
}

/** POST — create a new user account with role + municipality. */
export async function POST(req: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

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
    university_id?: string | null;
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

  if (!email) return NextResponse.json({ error: 'Email required' }, { status: 400 });
  if (!password || password.length < 8) {
    return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 });
  }
  if (!role || !VALID_ROLES.includes(role)) {
    return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
  }

  // Affiliation is optional and independent of role — a user may belong to a
  // municipality, a university, both, or neither. Admins are always system-wide.
  const municipalityId = role === 'admin' ? null : body.municipality_id ?? null;
  const universityId = role === 'admin' ? null : body.university_id ?? null;

  // Create auth user
  const { data: createRes, error: createErr } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      full_name: fullName,
      role,
      municipality_id: municipalityId,
      university_id: universityId,
    },
  });
  if (createErr || !createRes.user) {
    return NextResponse.json(
      { error: createErr?.message ?? 'Failed to create user' },
      { status: 400 },
    );
  }

  // The DB trigger should have created a profile row, but role/institution
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
        university_id: universityId,
        // Admin set a temporary password → prompt the user to change it on first sign-in.
        must_change_password: true,
      },
      { onConflict: 'id' },
    );
  await audit(admin, auth.userId, 'INSERT', userId, {
    email,
    role,
    municipality_id: municipalityId,
    university_id: universityId,
  });

  return NextResponse.json({ ok: true, id: userId });
}

/**
 * PATCH — change a user's name, role, affiliation or account status.
 * The profile is updated with the administrator's own session (so the audit
 * trail records who did it); deactivation is mirrored in the auth server as a
 * ban, so the account can neither sign in nor refresh an open session.
 */
export async function PATCH(req: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const admin = service();
  if (!admin) {
    return NextResponse.json({ error: 'Server not configured. Set SUPABASE_SERVICE_ROLE_KEY.' }, { status: 500 });
  }

  let body: {
    id?: string;
    full_name?: string | null;
    role?: Role;
    municipality_id?: string | null;
    university_id?: string | null;
    is_active?: boolean;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  if (!body.id) return NextResponse.json({ error: 'id required' }, { status: 400 });
  if (body.role !== undefined && !VALID_ROLES.includes(body.role)) {
    return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
  }
  if (body.id === auth.userId && (body.is_active === false || (body.role !== undefined && body.role !== 'admin'))) {
    return NextResponse.json(
      { error: 'You cannot deactivate your own account or remove your own administrator role.' },
      { status: 400 },
    );
  }

  const update: Record<string, unknown> = {};
  if (body.full_name !== undefined) update.full_name = body.full_name?.trim() || null;
  if (body.role !== undefined) update.role = body.role;
  if (body.municipality_id !== undefined) update.municipality_id = body.municipality_id || null;
  if (body.university_id !== undefined) update.university_id = body.university_id || null;
  if (body.is_active !== undefined) update.is_active = body.is_active;
  if (body.role === 'admin') {
    update.municipality_id = null;
    update.university_id = null;
  }

  const supabase = await createServerClient();
  // The generated table types don't cover profiles; the shape is validated above.
  const { error: updErr } = await supabase.from('profiles').update(update as never).eq('id', body.id);
  if (updErr) return NextResponse.json({ error: updErr.message }, { status: 400 });

  if (body.is_active !== undefined) {
    const { error: banErr } = await admin.auth.admin.updateUserById(body.id, {
      ban_duration: body.is_active ? 'none' : '876000h',
    });
    if (banErr) {
      return NextResponse.json(
        { error: `Profile saved, but the sign-in block could not be updated: ${banErr.message}` },
        { status: 500 },
      );
    }
  }

  return NextResponse.json({ ok: true });
}

/** DELETE — remove a user. Cascades through auth.users → profiles. */
export async function DELETE(req: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

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
  if (id === auth.userId) {
    return NextResponse.json({ error: 'You cannot delete your own account.' }, { status: 400 });
  }

  const { data: victim } = await admin
    .from('profiles')
    .select('email, role, municipality_id, university_id')
    .eq('id', id)
    .maybeSingle();
  const { error: delErr } = await admin.auth.admin.deleteUser(id);
  if (delErr) return NextResponse.json({ error: delErr.message }, { status: 400 });
  await audit(admin, auth.userId, 'DELETE', id, (victim as Record<string, unknown> | null) ?? {});

  return NextResponse.json({ ok: true });
}
