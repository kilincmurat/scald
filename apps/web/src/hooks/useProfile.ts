'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { normaliseRole, type Role } from '@/lib/roles';
import { getPilotById, type PilotMunicipality } from '@/lib/pilot-municipalities';

export type Profile = {
  id: string;
  email: string;
  fullName: string | null;
  role: Role;
  municipalityId: string | null;
  municipality: PilotMunicipality | null;
};

export type ProfileState = {
  profile: Profile | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
};

/**
 * Fetch the current user's profile once on mount. If Supabase env vars are
 * missing or the user is anonymous, `profile` will be null. Consumers should
 * gate rendering on `loading === false`.
 */
export function useProfile(): ProfileState {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setProfile(null);
        return;
      }
      const { data, error: qerr } = await supabase
        .from('profiles')
        .select('id, email, full_name, role, municipality_id')
        .eq('id', user.id)
        .maybeSingle();
      if (qerr) {
        setError(qerr.message);
        setProfile(null);
        return;
      }
      if (!data) {
        setProfile(null);
        return;
      }
      const row = data as {
        id: string;
        email: string;
        full_name: string | null;
        role: string | null;
        municipality_id: string | null;
      };
      setProfile({
        id: row.id,
        email: row.email,
        fullName: row.full_name,
        role: normaliseRole(row.role),
        municipalityId: row.municipality_id,
        municipality: getPilotById(row.municipality_id),
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load profile');
      setProfile(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();

    // Re-load on auth changes so role/municipality stay in sync with the
    // session (e.g. after a fresh sign-in).
    try {
      const supabase = createClient();
      const { data } = supabase.auth.onAuthStateChange((event) => {
        if (event === 'SIGNED_IN' || event === 'SIGNED_OUT' || event === 'USER_UPDATED') {
          void load();
        }
      });
      return () => data.subscription.unsubscribe();
    } catch {
      return undefined;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { profile, loading, error, refresh: load };
}
