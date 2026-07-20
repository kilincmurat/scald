'use client';

import { createBrowserClient } from '@supabase/ssr';

/**
 * Municipalities as stored in the DB (admin-managed via Admin Panel →
 * Municipalities). This is the authoritative, complete list — unlike the static
 * `MUNICIPALITIES` constant in `pilot-municipalities.ts`, which only holds the
 * original pilot cities. Assignment pickers (e.g. creating a user) must use this
 * so admin-added municipalities are selectable too.
 */
export type DbMunicipality = {
  id: string;
  name: string;
  name_en: string | null;
  country: string; // ISO-ish code, e.g. 'TR'
  region: string | null;
  is_active: boolean;
  is_pilot: boolean;
};

function client() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}

const COUNTRY_FLAGS: Record<string, string> = {
  TR: '🇹🇷',
  GR: '🇬🇷',
  RO: '🇷🇴',
  MK: '🇲🇰',
  BG: '🇧🇬',
  RS: '🇷🇸',
  AL: '🇦🇱',
};

export function municipalityFlag(country: string): string {
  return COUNTRY_FLAGS[country?.toUpperCase()] ?? '🏛️';
}

/** All municipalities from the DB, ordered by name. Pass `{ activeOnly }` for
 * assignment pickers so inactive municipalities are hidden. */
export async function fetchMunicipalities(opts?: { activeOnly?: boolean }): Promise<DbMunicipality[]> {
  const supabase = client();
  let query = supabase
    .from('municipalities')
    .select('id, name, name_en, country, region, is_active, is_pilot')
    .order('name', { ascending: true });
  if (opts?.activeOnly) query = query.eq('is_active', true);
  const { data, error } = await query;
  if (error) throw error;
  return (data as DbMunicipality[] | null) ?? [];
}
