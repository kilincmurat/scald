'use client';

import { createBrowserClient } from '@supabase/ssr';

// Untyped client for the profiles write (hand-maintained Database type resolves
// the generated Update type to `never`); mirrors the other admin CRUD services.
function client() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}

/**
 * Change the signed-in user's password and clear the `must_change_password`
 * flag so the first-login prompt no longer appears. Used by both the Settings
 * page and the first-login change-password prompt.
 */
export async function changePassword(
  newPassword: string,
): Promise<{ error: string | null }> {
  const supabase = client();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) return { error: error.message };

  if (user) {
    // Best-effort — the password already changed; don't fail the flow if this
    // flag update is rejected for any reason.
    await supabase.from('profiles').update({ must_change_password: false }).eq('id', user.id);
  }
  return { error: null };
}

/**
 * Record the signed-in user's one-time acceptance of the platform Terms of Use.
 * Stores the acceptance timestamp so the consent prompt no longer appears.
 */
export async function acceptTerms(): Promise<{ error: string | null }> {
  const supabase = client();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'Not signed in.' };

  const { error } = await supabase
    .from('profiles')
    .update({ terms_accepted_at: new Date().toISOString() })
    .eq('id', user.id);
  if (error) return { error: error.message };
  return { error: null };
}

/**
 * Mark the first-login guided tour as completed (finished or skipped) so it
 * does not appear again for this user.
 */
export async function completeTour(): Promise<{ error: string | null }> {
  const supabase = client();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'Not signed in.' };

  const { error } = await supabase
    .from('profiles')
    .update({ tour_completed_at: new Date().toISOString() })
    .eq('id', user.id);
  if (error) return { error: error.message };
  return { error: null };
}
