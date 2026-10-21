'use client';

import { createBrowserClient } from '@supabase/ssr';
import { INDICATORS } from '@/lib/scald-indicators';

export type ServerEntry = {
  indicator_code: string;
  category_code: string;
  set_code: string;
  score: number;
  raw_value: string;
  year: number;
  updated_at: string;
};

export type ServerCompletion = {
  category_code: string;
  year: number;
  completed_at: string;
};

export type ServerBadge = {
  set_code: string;
  year: number;
  earned_at: string;
};

export type ServerSnapshot = {
  entries: ServerEntry[];
  completions: ServerCompletion[];
  badges: ServerBadge[];
};

/**
 * A write that did not reach the database. `transient` = worth retrying (no
 * connection, session briefly unavailable); otherwise the server refused it
 * (RLS on a locked year, a constraint) and retrying would fail the same way.
 *
 * supabase-js does NOT throw on a failed query — it resolves with `{ error }`.
 * Every write here used to ignore that, so a failed save looked identical to
 * a successful one and the "Offline" badge could never appear.
 */
export class SaveError extends Error {
  constructor(message: string, readonly transient: boolean) {
    super(message);
    this.name = 'SaveError';
  }
}

/** Throw for a supabase-js `{ error }`. Postgres/PostgREST errors carry a code;
 * a network failure comes back without one. */
function raise(error: { message: string; code?: string } | null): void {
  if (error) throw new SaveError(error.message, !error.code);
}

/** Run a query, turning both a thrown network error and a returned `{ error }`
 * into a SaveError. */
async function run<T extends { error: { message: string; code?: string } | null }>(
  query: PromiseLike<T>,
): Promise<T> {
  let res: T;
  try {
    res = await query;
  } catch (err) {
    throw new SaveError(err instanceof Error ? err.message : String(err), true);
  }
  raise(res.error);
  return res;
}

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
 * Fetch all data-entry state for a given municipality (all years).
 * Client groups by year in the store.
 */
export async function fetchServerSnapshot(municipalityId: string): Promise<ServerSnapshot | null> {
  if (!isConfigured() || !municipalityId) return null;

  const supabase = scaldClient();
  try {
    const [entriesRes, completionsRes, badgesRes] = await Promise.all([
      supabase
        .from('scald_indicator_entries')
        .select('indicator_code, category_code, set_code, score, raw_value, year, updated_at')
        .eq('municipality_id', municipalityId),
      supabase
        .from('scald_category_completions')
        .select('category_code, year, completed_at')
        .eq('municipality_id', municipalityId),
      supabase
        .from('scald_set_badges')
        .select('set_code, year, earned_at')
        .eq('municipality_id', municipalityId),
    ]);

    // A failed query resolves with data = null. Treating that as "no rows"
    // made a brief connection drop wipe every value from the screen — and from
    // the local cache, which the store then persisted. Fail instead, so the
    // caller keeps what it already has.
    const failed = entriesRes.error ?? completionsRes.error ?? badgesRes.error;
    if (failed) {
      console.warn('[SCALD] fetchServerSnapshot failed:', failed.message);
      return null;
    }
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

/** Per-municipality entry map for one year, shaped like the store's `entries`
 * so `computeSetScores` can consume it directly. Only municipalities whose year
 * is APPROVED are included — the map shows official scores only, matching the
 * approval gate on the other result screens. RLS still scopes what the caller
 * can read: researchers/admin see every municipality; a decision maker sees
 * only their own. */
export type MunicipalityEntries = Record<
  string,
  Record<string, { score: number; rawValue?: string; enteredAt: number }>
>;

export async function fetchApprovedMunicipalityScores(year: number): Promise<MunicipalityEntries> {
  if (!isConfigured()) return {};
  const supabase = scaldClient();
  try {
    const { data: subs } = await supabase
      .from('scald_data_submissions')
      .select('municipality_id')
      .eq('year', year)
      .eq('status', 'approved');
    const ids = Array.from(
      new Set(((subs ?? []) as Array<{ municipality_id: string }>).map((s) => s.municipality_id)),
    );
    if (ids.length === 0) return {};

    const { data: rows } = await supabase
      .from('scald_indicator_entries')
      .select('municipality_id, indicator_code, score, raw_value')
      .eq('year', year)
      .in('municipality_id', ids);

    const out: MunicipalityEntries = {};
    for (const r of (rows ?? []) as Array<{
      municipality_id: string;
      indicator_code: string;
      score: number;
      raw_value: string;
    }>) {
      (out[r.municipality_id] ??= {})[r.indicator_code] = {
        score: r.score,
        rawValue: r.raw_value,
        enteredAt: 0,
      };
    }
    return out;
  } catch (err) {
    console.warn('[SCALD] fetchApprovedMunicipalityScores failed:', err);
    return {};
  }
}

async function requireUser(): Promise<string> {
  const userId = await getUserId();
  // getUser() also returns null when the network is down, so this is retryable.
  if (!userId) throw new SaveError('Not signed in (or no connection)', true);
  return userId;
}

export async function upsertEntry(
  municipalityId: string,
  indicatorCode: string,
  score: number,
  rawValue: string,
  year: number,
): Promise<void> {
  if (!municipalityId) throw new SaveError('No municipality selected', false);
  const lookup = lookupIndicatorCategory(indicatorCode);
  if (!lookup) throw new SaveError(`Unknown indicator ${indicatorCode}`, false);
  const userId = await requireUser();
  await run(
    scaldClient()
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
          year,
        },
        { onConflict: 'municipality_id,indicator_code,year' },
      ),
  );
}

/** Remove one indicator value (the user emptied its box). */
export async function deleteEntry(municipalityId: string, indicatorCode: string, year: number): Promise<void> {
  if (!municipalityId) throw new SaveError('No municipality selected', false);
  await requireUser();
  await run(
    scaldClient()
      .from('scald_indicator_entries')
      .delete()
      .eq('municipality_id', municipalityId)
      .eq('indicator_code', indicatorCode)
      .eq('year', year),
  );
}

export async function upsertCategoryCompletion(
  municipalityId: string,
  categoryCode: string,
  year: number,
): Promise<void> {
  if (!municipalityId) return;
  const userId = await requireUser();
  await run(
    scaldClient()
      .from('scald_category_completions')
      .upsert(
        { municipality_id: municipalityId, completed_by: userId, category_code: categoryCode, year },
        { onConflict: 'municipality_id,category_code,year' },
      ),
  );
}

/** A required value was removed, so the category is no longer complete. */
export async function deleteCategoryCompletion(
  municipalityId: string,
  categoryCode: string,
  year: number,
): Promise<void> {
  if (!municipalityId) return;
  await run(
    scaldClient()
      .from('scald_category_completions')
      .delete()
      .eq('municipality_id', municipalityId)
      .eq('category_code', categoryCode)
      .eq('year', year),
  );
}

export async function upsertBadge(municipalityId: string, setCode: string, year: number): Promise<void> {
  if (!municipalityId) return;
  await run(
    scaldClient()
      .from('scald_set_badges')
      .upsert({ municipality_id: municipalityId, set_code: setCode, year }, { onConflict: 'municipality_id,set_code,year' }),
  );
}

export async function deleteBadge(municipalityId: string, setCode: string, year: number): Promise<void> {
  if (!municipalityId) return;
  await run(
    scaldClient()
      .from('scald_set_badges')
      .delete()
      .eq('municipality_id', municipalityId)
      .eq('set_code', setCode)
      .eq('year', year),
  );
}

/**
 * Wipe ONE reporting year's data-entry state. This used to delete every year
 * of the municipality (no year filter) behind a button the UI presented as
 * clearing the current screen. Locked years are protected by RLS regardless.
 */
export async function deleteYearData(municipalityId: string, year: number): Promise<void> {
  if (!municipalityId) return;
  await requireUser();
  const supabase = scaldClient();
  await Promise.all([
    run(supabase.from('scald_indicator_entries').delete().eq('municipality_id', municipalityId).eq('year', year)),
    run(supabase.from('scald_category_completions').delete().eq('municipality_id', municipalityId).eq('year', year)),
    run(supabase.from('scald_set_badges').delete().eq('municipality_id', municipalityId).eq('year', year)),
  ]);
}
