'use client';

import { createBrowserClient } from '@supabase/ssr';

/**
 * Universities are the institutions that **researchers** belong to (as opposed
 * to municipalities, which data-entry / decision-maker roles belong to).
 * Admin-managed via Admin Panel → Universities, so — unlike municipalities —
 * this list is DB-driven rather than a static frontend constant.
 */
export type University = {
  id: string;
  name: string;
  name_en: string | null;
  country: string;
  city: string | null;
  website: string | null;
  is_active: boolean;
};

export type UniversityInput = {
  name: string;
  name_en: string | null;
  country: string;
  city: string | null;
  website: string | null;
  is_active: boolean;
};

// Untyped client for writes: the hand-maintained Database type resolves the
// generated Insert/Update types to `never`, so we mirror the pattern used by
// the other admin CRUD screens (e.g. MunicipalitiesAdmin) and stay untyped here.
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

export function universityFlag(country: string): string {
  return COUNTRY_FLAGS[country?.toUpperCase()] ?? '🎓';
}

/** List universities, ordered by name. Pass `{ activeOnly }` for assignment pickers. */
export async function fetchUniversities(opts?: { activeOnly?: boolean }): Promise<University[]> {
  const supabase = client();
  let query = supabase
    .from('universities')
    .select('id, name, name_en, country, city, website, is_active')
    .order('name', { ascending: true });
  if (opts?.activeOnly) query = query.eq('is_active', true);
  const { data, error } = await query;
  if (error) throw error;
  return (data as University[] | null) ?? [];
}

export async function createUniversity(input: UniversityInput): Promise<void> {
  const supabase = client();
  const { error } = await supabase.from('universities').insert(input);
  if (error) throw error;
}

export async function updateUniversity(id: string, input: UniversityInput): Promise<void> {
  const supabase = client();
  const { error } = await supabase.from('universities').update(input).eq('id', id);
  if (error) throw error;
}

export async function deleteUniversity(id: string): Promise<void> {
  const supabase = client();
  const { error } = await supabase.from('universities').delete().eq('id', id);
  if (error) throw error;
}
