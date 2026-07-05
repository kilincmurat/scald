'use client';

import { createBrowserClient } from '@supabase/ssr';
import { INDICATORS } from '@/lib/scald-indicators';

// Untyped client for the SCALD data-entry tables. The runtime shape is
// enforced by the SQL migration + RLS policies; TypeScript types would just
// duplicate that with worse ergonomics for upsert calls.
function scaldClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}

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

/**
 * Look up which category a given indicator code belongs to.
 * Returns { category, set } or null if unknown.
 */
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
 * Fetch all server-side state for the current user.
 * Returns null if Supabase is not configured or the user is not signed in.
 */
export async function fetchServerSnapshot(): Promise<ServerSnapshot | null> {
  const userId = await getUserId();
  if (!userId) return null;

  const supabase = scaldClient();
  try {
    const [entriesRes, completionsRes, badgesRes] = await Promise.all([
      supabase
        .from('scald_indicator_entries')
        .select('indicator_code, category_code, set_code, score, raw_value, updated_at')
        .eq('user_id', userId),
      supabase
        .from('scald_category_completions')
        .select('category_code, completed_at')
        .eq('user_id', userId),
      supabase
        .from('scald_set_badges')
        .select('set_code, earned_at')
        .eq('user_id', userId),
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
  indicatorCode: string,
  score: number,
  rawValue: string,
): Promise<void> {
  const userId = await getUserId();
  if (!userId) return;
  const lookup = lookupIndicatorCategory(indicatorCode);
  if (!lookup) return;
  try {
    const supabase = scaldClient();
    await supabase
      .from('scald_indicator_entries')
      .upsert(
        {
          user_id: userId,
          indicator_code: indicatorCode,
          category_code: lookup.category,
          set_code: lookup.set,
          score,
          raw_value: rawValue,
        },
        { onConflict: 'user_id,indicator_code' },
      );
  } catch (err) {
    console.warn('[SCALD] upsertEntry failed:', err);
  }
}

export async function upsertCategoryCompletion(categoryCode: string): Promise<void> {
  const userId = await getUserId();
  if (!userId) return;
  try {
    const supabase = scaldClient();
    await supabase
      .from('scald_category_completions')
      .upsert(
        { user_id: userId, category_code: categoryCode },
        { onConflict: 'user_id,category_code' },
      );
  } catch (err) {
    console.warn('[SCALD] upsertCategoryCompletion failed:', err);
  }
}

export async function upsertBadge(setCode: string): Promise<void> {
  const userId = await getUserId();
  if (!userId) return;
  try {
    const supabase = scaldClient();
    await supabase
      .from('scald_set_badges')
      .upsert(
        { user_id: userId, set_code: setCode },
        { onConflict: 'user_id,set_code' },
      );
  } catch (err) {
    console.warn('[SCALD] upsertBadge failed:', err);
  }
}

export async function deleteAllUserData(): Promise<void> {
  const userId = await getUserId();
  if (!userId) return;
  try {
    const supabase = scaldClient();
    await Promise.all([
      supabase.from('scald_indicator_entries').delete().eq('user_id', userId),
      supabase.from('scald_category_completions').delete().eq('user_id', userId),
      supabase.from('scald_set_badges').delete().eq('user_id', userId),
    ]);
  } catch (err) {
    console.warn('[SCALD] deleteAllUserData failed:', err);
  }
}
