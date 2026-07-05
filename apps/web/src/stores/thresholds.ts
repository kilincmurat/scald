'use client';

import { create } from 'zustand';
import { createBrowserClient } from '@supabase/ssr';
import { INDICATORS } from '@/lib/scald-indicators';

type ThresholdTuple = [string, string, string, string, string, string];

type ThresholdsState = {
  overrides: Record<string, ThresholdTuple>;
  loaded: boolean;
  loading: boolean;

  loadOverrides: () => Promise<void>;
  saveOverride: (indicatorCode: string, thresholds: ThresholdTuple) => Promise<{ ok: boolean; error?: string }>;
  deleteOverride: (indicatorCode: string) => Promise<{ ok: boolean; error?: string }>;
};

function isConfigured() {
  return !!(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}

function client() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}

export const useThresholds = create<ThresholdsState>()((set, get) => ({
  overrides: {},
  loaded: false,
  loading: false,

  loadOverrides: async () => {
    if (get().loaded || !isConfigured()) return;
    set({ loading: true });
    try {
      const supabase = client();
      const { data } = await supabase
        .from('indicator_threshold_overrides')
        .select('indicator_code, threshold_0, threshold_1, threshold_2, threshold_3, threshold_4, threshold_5');
      const map: Record<string, ThresholdTuple> = {};
      for (const row of (data as Array<{
        indicator_code: string;
        threshold_0: string;
        threshold_1: string;
        threshold_2: string;
        threshold_3: string;
        threshold_4: string;
        threshold_5: string;
      }> | null) ?? []) {
        map[row.indicator_code] = [
          row.threshold_0,
          row.threshold_1,
          row.threshold_2,
          row.threshold_3,
          row.threshold_4,
          row.threshold_5,
        ];
      }
      set({ overrides: map, loaded: true });
    } catch {
      set({ loaded: true });
    } finally {
      set({ loading: false });
    }
  },

  saveOverride: async (indicatorCode, thresholds) => {
    if (!isConfigured()) return { ok: false, error: 'Supabase not configured' };
    try {
      const supabase = client();
      const { error } = await supabase
        .from('indicator_threshold_overrides')
        .upsert(
          {
            indicator_code: indicatorCode,
            threshold_0: thresholds[0],
            threshold_1: thresholds[1],
            threshold_2: thresholds[2],
            threshold_3: thresholds[3],
            threshold_4: thresholds[4],
            threshold_5: thresholds[5],
          },
          { onConflict: 'indicator_code' },
        );
      if (error) return { ok: false, error: error.message };
      set((s) => ({ overrides: { ...s.overrides, [indicatorCode]: thresholds } }));
      return { ok: true };
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : 'unknown' };
    }
  },

  deleteOverride: async (indicatorCode) => {
    if (!isConfigured()) return { ok: false, error: 'Supabase not configured' };
    try {
      const supabase = client();
      const { error } = await supabase
        .from('indicator_threshold_overrides')
        .delete()
        .eq('indicator_code', indicatorCode);
      if (error) return { ok: false, error: error.message };
      set((s) => {
        const next = { ...s.overrides };
        delete next[indicatorCode];
        return { overrides: next };
      });
      return { ok: true };
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : 'unknown' };
    }
  },
}));

/**
 * Get the effective 6-slot thresholds for an indicator: override if present,
 * otherwise default from the JSON.
 */
export function getEffectiveThresholds(indicatorCode: string, overrides: Record<string, ThresholdTuple>): string[] {
  const ov = overrides[indicatorCode];
  if (ov) return ov;
  for (const catCode of INDICATORS.order) {
    const cat = INDICATORS.categories[catCode];
    const ind = cat.indicators.find((i) => i.code === indicatorCode);
    if (ind) return ind.thresholds;
  }
  return ['', '', '', '', '', ''];
}
