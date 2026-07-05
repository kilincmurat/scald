'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { INDICATORS, TOTAL_INDICATORS } from '@/lib/scald-indicators';
import {
  fetchServerSnapshot,
  upsertEntry,
  upsertCategoryCompletion,
  upsertBadge,
  deleteAllUserData,
} from '@/lib/data-entry-service';

export type IndicatorEntry = {
  score: number; // 0..5
  rawValue?: string; // user's raw input
  enteredAt: number;
};

type SyncStatus = 'idle' | 'loading' | 'syncing' | 'error';

export type DataEntryState = {
  entries: Record<string, IndicatorEntry>;
  completed: Record<string, boolean>;
  badges: string[];
  xp: number;
  hydrated: boolean;

  // Server sync
  serverInitialized: boolean;
  syncStatus: SyncStatus;
  lastSyncedAt: number | null;

  // actions
  saveEntry: (indicatorCode: string, score: number, rawValue?: string) => void;
  completeCategory: (categoryCode: string) => void;
  isCategoryComplete: (categoryCode: string) => boolean;
  isCategoryUnlocked: (categoryCode: string) => boolean;
  categoryProgress: (categoryCode: string) => { done: number; total: number; pct: number };
  overallProgress: () => { done: number; total: number; pct: number };
  level: () => { level: number; xpInLevel: number; xpForNext: number };
  reset: () => void;

  // Server integration
  initFromServer: () => Promise<void>;
  clearLocal: () => void;
};

const XP_PER_INDICATOR = 10;
const XP_PER_CATEGORY_BONUS = 50;
const XP_PER_SET_BONUS = 200;

function xpToLevel(xp: number) {
  let level = 1;
  let acc = 0;
  while (acc + 100 * level <= xp) {
    acc += 100 * level;
    level++;
  }
  return { level, xpInLevel: xp - acc, xpForNext: 100 * level };
}

const initialState = {
  entries: {} as Record<string, IndicatorEntry>,
  completed: {} as Record<string, boolean>,
  badges: [] as string[],
  xp: 0,
};

export const useDataEntry = create<DataEntryState>()(
  persist(
    (set, get) => ({
      ...initialState,
      hydrated: false,
      serverInitialized: false,
      syncStatus: 'idle',
      lastSyncedAt: null,

      saveEntry: (indicatorCode, score, rawValue) => {
        const prev = get().entries[indicatorCode];
        const trimmed = rawValue?.trim() || undefined;
        set((s) => ({
          entries: {
            ...s.entries,
            [indicatorCode]: { score, rawValue: trimmed, enteredAt: Date.now() },
          },
          xp: prev ? s.xp : s.xp + XP_PER_INDICATOR,
        }));

        // Server sync (fire and forget) — only save entries with a raw value
        if (trimmed) {
          set({ syncStatus: 'syncing' });
          upsertEntry(indicatorCode, score, trimmed)
            .then(() => set({ syncStatus: 'idle', lastSyncedAt: Date.now() }))
            .catch(() => set({ syncStatus: 'error' }));
        }
      },

      completeCategory: (categoryCode) => {
        const wasCompleted = get().completed[categoryCode];
        if (wasCompleted) return;

        set((s) => ({
          completed: { ...s.completed, [categoryCode]: true },
          xp: s.xp + XP_PER_CATEGORY_BONUS,
        }));

        // Server sync
        upsertCategoryCompletion(categoryCode).catch(() => {});

        // Check if all categories of this set are done → award set badge
        const setCode = INDICATORS.categories[categoryCode]?.set;
        if (!setCode) return;
        const setCats = INDICATORS.order.filter(
          (c) => INDICATORS.categories[c].set === setCode,
        );
        const allDone = setCats.every((c) => get().completed[c]);
        if (allDone && !get().badges.includes(setCode)) {
          set((s) => ({
            badges: [...s.badges, setCode],
            xp: s.xp + XP_PER_SET_BONUS,
          }));
          upsertBadge(setCode).catch(() => {});
        }
      },

      isCategoryComplete: (categoryCode) => !!get().completed[categoryCode],

      isCategoryUnlocked: (categoryCode) => {
        const order = INDICATORS.order;
        const idx = order.indexOf(categoryCode);
        if (idx <= 0) return true;
        for (let i = 0; i < idx; i++) {
          if (!get().completed[order[i]]) return false;
        }
        return true;
      },

      categoryProgress: (categoryCode) => {
        const cat = INDICATORS.categories[categoryCode];
        if (!cat) return { done: 0, total: 0, pct: 0 };
        const total = cat.indicators.length;
        const entries = get().entries;
        const done = cat.indicators.filter((i) => {
          const e = entries[i.code];
          return !!(e && e.rawValue && e.rawValue.trim().length > 0);
        }).length;
        return { done, total, pct: total === 0 ? 0 : Math.round((done / total) * 100) };
      },

      overallProgress: () => {
        const entries = get().entries;
        const done = Object.values(entries).filter(
          (e) => !!(e.rawValue && e.rawValue.trim().length > 0),
        ).length;
        return {
          done,
          total: TOTAL_INDICATORS,
          pct: TOTAL_INDICATORS === 0 ? 0 : Math.round((done / TOTAL_INDICATORS) * 100),
        };
      },

      level: () => xpToLevel(get().xp),

      reset: () => {
        set({ ...initialState, serverInitialized: get().serverInitialized });
        deleteAllUserData().catch(() => {});
      },

      /**
       * Load state from the server on mount. Server data wins over local cache.
       * Falls back to local cache if the server is unreachable or the user is
       * anonymous / Supabase env vars are missing.
       */
      initFromServer: async () => {
        if (get().serverInitialized) return;
        set({ syncStatus: 'loading' });

        const snapshot = await fetchServerSnapshot();
        if (!snapshot) {
          // No server available — remain on local-only mode.
          set({ serverInitialized: true, syncStatus: 'idle' });
          return;
        }

        // Convert server rows into local shape.
        const entries: Record<string, IndicatorEntry> = {};
        for (const row of snapshot.entries) {
          entries[row.indicator_code] = {
            score: row.score,
            rawValue: row.raw_value,
            enteredAt: new Date(row.updated_at).getTime(),
          };
        }
        const completed: Record<string, boolean> = {};
        for (const row of snapshot.completions) {
          completed[row.category_code] = true;
        }
        const badges = snapshot.badges.map((b) => b.set_code);

        // Recompute XP from server-truth so it stays consistent across devices.
        const entryCount = Object.keys(entries).length;
        const catCount = Object.keys(completed).length;
        const badgeCount = badges.length;
        const xp =
          entryCount * XP_PER_INDICATOR +
          catCount * XP_PER_CATEGORY_BONUS +
          badgeCount * XP_PER_SET_BONUS;

        set({
          entries,
          completed,
          badges,
          xp,
          serverInitialized: true,
          syncStatus: 'idle',
          lastSyncedAt: Date.now(),
        });
      },

      /**
       * Wipe local cache without touching the server. Used on sign-out so a
       * different user's data isn't accidentally shown from localStorage.
       */
      clearLocal: () => {
        set({
          ...initialState,
          serverInitialized: false,
          syncStatus: 'idle',
          lastSyncedAt: null,
        });
      },
    }),
    {
      name: 'scald-data-entry',
      onRehydrateStorage: () => (state) => {
        if (state) state.hydrated = true;
      },
      partialize: (state) => ({
        entries: state.entries,
        completed: state.completed,
        badges: state.badges,
        xp: state.xp,
      }),
    },
  ),
);
