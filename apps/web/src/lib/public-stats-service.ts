'use client';

/**
 * Anonymous (no-login) public statistics loader.
 *
 * Reads the pilot municipalities' indicator entries + category weights using
 * the Supabase anon role. Migration 014 adds `TO anon` RLS policies that expose
 * ONLY pilot municipalities' data — authenticated tenant isolation is unchanged.
 *
 * For each city we pick the most recent reporting year that has data and
 * compute the same overall / per-set / per-category scores the internal app
 * shows, so the public sees consistent figures.
 */

import { createBrowserClient } from '@supabase/ssr';
import type { IndicatorEntry } from '@/stores/data-entry';
import {
  computeOverallScore,
  computeSetScores,
  computeCategoryScores,
  type Weights,
  type SetScore,
  type CategoryScore,
} from '@/lib/scores';
import type { SetCode } from '@/lib/scald-indicators';

export type OverallScore = ReturnType<typeof computeOverallScore>;

export type PublicCityStats = {
  municipalityId: string;
  year: number | null;
  hasData: boolean;
  overall: OverallScore;
  setScores: Record<SetCode, SetScore>;
  categoryScores: CategoryScore[];
};

type EntryRow = {
  municipality_id: string;
  indicator_code: string;
  score: number;
  raw_value: string | null;
  year: number;
  updated_at: string;
};

function isConfigured(): boolean {
  return !!(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}

function client() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}

/**
 * Fetch computed public stats for the given pilot municipalities in one round
 * trip. Returns a map keyed by municipality id. Cities with no published data
 * still get an entry (hasData: false) so the UI can show an empty state.
 */
export async function fetchPublicStats(
  municipalityIds: string[],
): Promise<Record<string, PublicCityStats>> {
  const result: Record<string, PublicCityStats> = {};

  const emptyFor = (id: string): PublicCityStats => ({
    municipalityId: id,
    year: null,
    hasData: false,
    overall: computeOverallScore({}, {}),
    setScores: computeSetScores({}, {}),
    categoryScores: computeCategoryScores({}, {}),
  });

  if (!isConfigured() || municipalityIds.length === 0) {
    for (const id of municipalityIds) result[id] = emptyFor(id);
    return result;
  }

  const supabase = client();

  // Category weights (anon-readable global config).
  const weights: Weights = { categoryWeights: {} };
  try {
    const { data: w } = await supabase
      .from('category_weight_overrides')
      .select('category_code, weight');
    for (const row of (w ?? []) as Array<{ category_code: string; weight: number }>) {
      weights.categoryWeights![row.category_code] = Number(row.weight);
    }
  } catch {
    /* fall back to equal weights */
  }

  // Entries for all requested pilot cities in one query.
  let rows: EntryRow[] = [];
  try {
    const { data } = await supabase
      .from('scald_indicator_entries')
      .select('municipality_id, indicator_code, score, raw_value, year, updated_at')
      .in('municipality_id', municipalityIds);
    rows = (data ?? []) as EntryRow[];
  } catch {
    rows = [];
  }

  // Group rows by municipality.
  const byMuni = new Map<string, EntryRow[]>();
  for (const r of rows) {
    const list = byMuni.get(r.municipality_id) ?? [];
    list.push(r);
    byMuni.set(r.municipality_id, list);
  }

  for (const id of municipalityIds) {
    const list = byMuni.get(id);
    if (!list || list.length === 0) {
      result[id] = emptyFor(id);
      continue;
    }

    // Most recent year that actually has entries.
    const latestYear = Math.max(...list.map((r) => r.year));
    const entries: Record<string, IndicatorEntry> = {};
    for (const r of list) {
      if (r.year !== latestYear) continue;
      entries[r.indicator_code] = {
        score: r.score,
        rawValue: r.raw_value ?? undefined,
        enteredAt: new Date(r.updated_at).getTime(),
      };
    }

    result[id] = {
      municipalityId: id,
      year: latestYear,
      hasData: Object.keys(entries).length > 0,
      overall: computeOverallScore(entries, weights),
      setScores: computeSetScores(entries, weights),
      categoryScores: computeCategoryScores(entries, weights),
    };
  }

  return result;
}
