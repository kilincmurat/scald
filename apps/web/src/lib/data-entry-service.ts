'use client';

import { createBrowserClient } from '@supabase/ssr';
import { INDICATORS } from '@/lib/scald-indicators';

export type ServerEntry = {
  indicator_code: string;
  category_code: string;
  set_code: string;
  score: number;
  raw_value: string;
  updated_at: string;
};

export type ServerCompletion = {
  category_code: string;
  completed_at: string;
};

export type ServerBadge = {
  set_code: string;
  earned_at: string;
};

export type ServerSnapshot = {
  entries: ServerEntry[];
  completions: ServerCompletion[];
  badges: ServerBadge[];
};

// Untyped client for the SCALD data-entry tables. RLS enforces access.
function scaldClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}

function isConfigured(): boolean {
  return (
    typeof process.env.NEXT_PUBLIC_SUPABASE_URL === 'string' &&
    process.env.NEXT_PUBLIC_SUPABASE_URL.length > 0 &&
    typeof process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY === 'string' &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY.length > 0
  );
}

async function getUserId(): Promise<string | null> {
  if (!isConfigured()) return null;
  try {
    const supabase = scaldClient();
    const { data: { user } } = await supabase.auth.getUser();
    return user?.id ?? null;
  } catch {
    return null;
  }
}

export function isServerConfigured(): boolean {
  return isConfigured();
}

export function lookupIndicatorCategory(
  indicatorCode: string,
): { category: string; set: string } | null {
  for (const catCode of INDICATORS.order) {
    const cat = INDICATORS.categories[catCode];
    if (cat.indicators.some((i) => i.code === indicatorCode)) {
      return { category: catCode, set: cat.set };
    }
  }
  return null;
}

/**
 * Fetch all data-entry state for a given municipality. Returns null when
 * Supabase is not configured or the caller has no municipality.
 */
export async function fetchServerSnapshot(municipalityId: string): Promise<ServerSnapshot | null> {
  if (!isConfigured() || !municipalityId) return null;

  const supabase = scaldClient();
  try {
    const [entriesRes, completionsRes, badgesRes] = await Promise.all([
      supabase
        .from('scald_indicator_entries')
        .select('indicator_code, category_code, set_code, score, raw_value, updated_at')
        .eq('municipality_id', municipalityId),
      supabase
        .from('scald_category_completions')
        .select('category_code, completed_at')
        .eq('municipality_id', municipalityId),
      supabase
        .from('scald_set_badges')
        .select('set_code, earned_at')
        .eq('municipality_id', municipalityId),
    ]);

    return {
      entries: (entriesRes.data ?? []) as ServerEntry[],
      completions: (completionsRes.data ?? []) as ServerCompletion[],
      badges: (badgesRes.data ?? []) as ServerBadge[],
    };
  } catch (err) {
    console.warn('[SCALD] fetchServerSnapshot failed:', err);
    return null;
  }
}

export async function upsertEntry(
  municipalityId: string,
  indicatorCode: string,
  score: number,
  rawValue: string,
): Promise<void> {
  const userId = await getUserId();
  if (!userId || !municipalityId) return;
  const lookup = lookupIndicatorCategory(indicatorCode);
  if (!lookup) return;
  try {
    const supabase = scaldClient();
    await supabase
      .from('scald_indicator_entries')
      .upsert(
        {
          municipality_id: municipalityId,
          entered_by: userId,
          indicator_code: indicatorCode,
          category_code: lookup.category,
          set_code: lookup.set,
          score,
          raw_value: rawValue,
        },
        { onConflict: 'municipality_id,indicator_code' },
      );
  } catch (err) {
    console.warn('[SCALD] upsertEntry failed:', err);
  }
}

export async function upsertCategoryCompletion(
  municipalityId: string,
  categoryCode: string,
): Promise<void> {
  const userId = await getUserId();
  if (!userId || !municipalityId) return;
  try {
    const supabase = scaldClient();
    await supabase
      .from('scald_category_completions')
      .upsert(
        {
          municipality_id: municipalityId,
          completed_by: userId,
          category_code: categoryCode,
        },
        { onConflict: 'municipality_id,category_code' },
      );
  } catch (err) {
    console.warn('[SCALD] upsertCategoryCompletion failed:', err);
  }
}

export async function upsertBadge(
  municipalityId: string,
  setCode: string,
): Promise<void> {
  if (!municipalityId) return;
  try {
    const supabase = scaldClient();
    await supabase
      .from('scald_set_badges')
      .upsert(
        { municipality_id: municipalityId, set_code: setCode },
        { onConflict: 'municipality_id,set_code' },
      );
  } catch (err) {
    console.warn('[SCALD] upsertBadge failed:', err);
  }
}

/** Admin-only wipe of a municipality's data-entry state. */
export async function deleteAllMunicipalityData(municipalityId: string): Promise<void> {
  if (!municipalityId) return;
  try {
    const supabase = scaldClient();
    await Promise.all([
      supabase.from('scald_indicator_entries').delete().eq('municipality_id', municipalityId),
      supabase.from('scald_category_completions').delete().eq('municipality_id', municipalityId),
      supabase.from('scald_set_badges').delete().eq('municipality_id', municipalityId),
    ]);
  } catch (err) {
    console.warn('[SCALD] deleteAllMunicipalityData failed:', err);
  }
}
