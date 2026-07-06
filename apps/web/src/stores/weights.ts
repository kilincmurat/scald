'use client';

import { create } from 'zustand';
import { createBrowserClient } from '@supabase/ssr';
import type { SetCode } from '@/lib/scald-indicators';

type WeightsState = {
  setWeights: Record<string, number>;
  categoryWeights: Record<string, number>;
  indicatorWeights: Record<string, number>;
  loaded: boolean;
  loading: boolean;

  loadOverrides: () => Promise<void>;
  saveSetWeight: (setCode: SetCode, weight: number) => Promise<{ ok: boolean; error?: string }>;
  saveCategoryWeight: (categoryCode: string, weight: number) => Promise<{ ok: boolean; error?: string }>;
  saveIndicatorWeight: (indicatorCode: string, weight: number) => Promise<{ ok: boolean; error?: string }>;
  resetSetWeight: (setCode: SetCode) => Promise<{ ok: boolean; error?: string }>;
  resetCategoryWeight: (categoryCode: string) => Promise<{ ok: boolean; error?: string }>;
  resetIndicatorWeight: (indicatorCode: string) => Promise<{ ok: boolean; error?: string }>;
  resetAll: () => Promise<{ ok: boolean; error?: string }>;
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

export const useWeights = create<WeightsState>()((set, get) => ({
  setWeights: {},
  categoryWeights: {},
  indicatorWeights: {},
  loaded: false,
  loading: false,

  loadOverrides: async () => {
    if (get().loaded || !isConfigured()) return;
    set({ loading: true });
    try {
      const supabase = client();
      const [setRes, catRes, indRes] = await Promise.all([
        supabase.from('set_weight_overrides').select('set_code, weight'),
        supabase.from('category_weight_overrides').select('category_code, weight'),
        supabase.from('indicator_weight_overrides').select('indicator_code, weight'),
      ]);
      const setW: Record<string, number> = {};
      for (const r of (setRes.data as Array<{ set_code: string; weight: number }> | null) ?? []) {
        setW[r.set_code] = Number(r.weight);
      }
      const catW: Record<string, number> = {};
      for (const r of (catRes.data as Array<{ category_code: string; weight: number }> | null) ?? []) {
        catW[r.category_code] = Number(r.weight);
      }
      const indW: Record<string, number> = {};
      for (const r of (indRes.data as Array<{ indicator_code: string; weight: number }> | null) ?? []) {
        indW[r.indicator_code] = Number(r.weight);
      }
      set({ setWeights: setW, categoryWeights: catW, indicatorWeights: indW, loaded: true });
    } catch {
      set({ loaded: true });
    } finally {
      set({ loading: false });
    }
  },

  saveSetWeight: async (setCode, weight) => {
    if (!isConfigured()) return { ok: false, error: 'Supabase not configured' };
    try {
      const supabase = client();
      const { error } = await supabase
        .from('set_weight_overrides')
        .upsert({ set_code: setCode, weight }, { onConflict: 'set_code' });
      if (error) return { ok: false, error: error.message };
      set((s) => ({ setWeights: { ...s.setWeights, [setCode]: weight } }));
      return { ok: true };
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : 'unknown' };
    }
  },

  saveCategoryWeight: async (categoryCode, weight) => {
    if (!isConfigured()) return { ok: false, error: 'Supabase not configured' };
    try {
      const supabase = client();
      const { error } = await supabase
        .from('category_weight_overrides')
        .upsert({ category_code: categoryCode, weight }, { onConflict: 'category_code' });
      if (error) return { ok: false, error: error.message };
      set((s) => ({ categoryWeights: { ...s.categoryWeights, [categoryCode]: weight } }));
      return { ok: true };
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : 'unknown' };
    }
  },

  saveIndicatorWeight: async (indicatorCode, weight) => {
    if (!isConfigured()) return { ok: false, error: 'Supabase not configured' };
    try {
      const supabase = client();
      const { error } = await supabase
        .from('indicator_weight_overrides')
        .upsert({ indicator_code: indicatorCode, weight }, { onConflict: 'indicator_code' });
      if (error) return { ok: false, error: error.message };
      set((s) => ({ indicatorWeights: { ...s.indicatorWeights, [indicatorCode]: weight } }));
      return { ok: true };
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : 'unknown' };
    }
  },

  resetSetWeight: async (setCode) => {
    if (!isConfigured()) return { ok: false, error: 'Supabase not configured' };
    try {
      const supabase = client();
      const { error } = await supabase.from('set_weight_overrides').delete().eq('set_code', setCode);
      if (error) return { ok: false, error: error.message };
      set((s) => {
        const next = { ...s.setWeights };
        delete next[setCode];
        return { setWeights: next };
      });
      return { ok: true };
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : 'unknown' };
    }
  },

  resetCategoryWeight: async (categoryCode) => {
    if (!isConfigured()) return { ok: false, error: 'Supabase not configured' };
    try {
      const supabase = client();
      const { error } = await supabase
        .from('category_weight_overrides')
        .delete()
        .eq('category_code', categoryCode);
      if (error) return { ok: false, error: error.message };
      set((s) => {
        const next = { ...s.categoryWeights };
        delete next[categoryCode];
        return { categoryWeights: next };
      });
      return { ok: true };
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : 'unknown' };
    }
  },

  resetIndicatorWeight: async (indicatorCode) => {
    if (!isConfigured()) return { ok: false, error: 'Supabase not configured' };
    try {
      const supabase = client();
      const { error } = await supabase
        .from('indicator_weight_overrides')
        .delete()
        .eq('indicator_code', indicatorCode);
      if (error) return { ok: false, error: error.message };
      set((s) => {
        const next = { ...s.indicatorWeights };
        delete next[indicatorCode];
        return { indicatorWeights: next };
      });
      return { ok: true };
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : 'unknown' };
    }
  },

  resetAll: async () => {
    if (!isConfigured()) return { ok: false, error: 'Supabase not configured' };
    try {
      const supabase = client();
      const [e1, e2, e3] = await Promise.all([
        supabase.from('set_weight_overrides').delete().neq('set_code', ''),
        supabase.from('category_weight_overrides').delete().neq('category_code', ''),
        supabase.from('indicator_weight_overrides').delete().neq('indicator_code', ''),
      ]);
      const err = e1.error ?? e2.error ?? e3.error;
      if (err) return { ok: false, error: err.message };
      set({ setWeights: {}, categoryWeights: {}, indicatorWeights: {} });
      return { ok: true };
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : 'unknown' };
    }
  },
}));

/** Effective weight for a code: override if present, otherwise default 1. */
export function effectiveWeight(map: Record<string, number>, code: string): number {
  const v = map[code];
  return typeof v === 'number' && v >= 0 ? v : 1;
}

/** Convenience hook: returns the Weights bag ready to pass to scores.ts. */
export function useEffectiveWeights() {
  const setWeights = useWeights((s) => s.setWeights);
  const categoryWeights = useWeights((s) => s.categoryWeights);
  const indicatorWeights = useWeights((s) => s.indicatorWeights);
  return { setWeights, categoryWeights, indicatorWeights };
}
