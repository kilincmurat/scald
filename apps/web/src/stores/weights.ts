'use client';

import { create } from 'zustand';
import { createBrowserClient } from '@supabase/ssr';

type WeightsState = {
  categoryWeights: Record<string, number>;
  loaded: boolean;
  loading: boolean;

  loadOverrides: () => Promise<void>;
  saveCategoryWeight: (categoryCode: string, weight: number) => Promise<{ ok: boolean; error?: string }>;
  resetCategoryWeight: (categoryCode: string) => Promise<{ ok: boolean; error?: string }>;
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
  categoryWeights: {},
  loaded: false,
  loading: false,

  loadOverrides: async () => {
    if (get().loaded || !isConfigured()) return;
    set({ loading: true });
    try {
      const supabase = client();
      const { data } = await supabase
        .from('category_weight_overrides')
        .select('category_code, weight');
      const map: Record<string, number> = {};
      for (const r of (data as Array<{ category_code: string; weight: number }> | null) ?? []) {
        map[r.category_code] = Number(r.weight);
      }
      set({ categoryWeights: map, loaded: true });
    } catch {
      set({ loaded: true });
    } finally {
      set({ loading: false });
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

  resetAll: async () => {
    if (!isConfigured()) return { ok: false, error: 'Supabase not configured' };
    try {
      const supabase = client();
      const { error } = await supabase
        .from('category_weight_overrides')
        .delete()
        .neq('category_code', '');
      if (error) return { ok: false, error: error.message };
      set({ categoryWeights: {} });
      return { ok: true };
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : 'unknown' };
    }
  },
}));

/** Convenience hook: returns the Weights bag ready to pass to scores.ts. */
export function useEffectiveWeights() {
  const categoryWeights = useWeights((s) => s.categoryWeights);
  return { categoryWeights };
}
