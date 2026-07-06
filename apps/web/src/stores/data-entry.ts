'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { INDICATORS, REQUIRED_INDICATORS } from '@/lib/scald-indicators';
import {
  fetchServerSnapshot,
  upsertEntry,
  upsertCategoryCompletion,
  upsertBadge,
  deleteAllMunicipalityData,
} from '@/lib/data-entry-service';

export type IndicatorEntry = {
  score: number; // 0..5
  rawValue?: string;
  enteredAt: number;
};

type SyncStatus = 'idle' | 'loading' | 'syncing' | 'error';

export type DataEntryState = {
  // Which municipality's data is loaded. Null = anonymous / not initialised.
  municipalityId: string | null;

  entries: Record<string, IndicatorEntry>;
  completed: Record<string, boolean>;
  badges: string[];
  xp: number;
  hydrated: boolean;

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
  loadMunicipality: (municipalityId: string) => Promise<void>;
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

const emptyState = {
  entries: {} as Record<string, IndicatorEntry>,
  completed: {} as Record<string, boolean>,
  badges: [] as string[],
  xp: 0,
};

export const useDataEntry = create<DataEntryState>()(
  persist(
    (set, get) => ({
      ...emptyState,
      municipalityId: null,
      hydrated: false,
      syncStatus: 'idle',
      lastSyncedAt: null,

      saveEntry: (indicatorCode, score, rawValue) => {
        const municipalityId = get().municipalityId;
        const prev = get().entries[indicatorCode];
        const trimmed = rawValue?.trim() || undefined;
        set((s) => ({
          entries: {
            ...s.entries,
            [indicatorCode]: { score, rawValue: trimmed, enteredAt: Date.now() },
          },
          xp: prev ? s.xp : s.xp + XP_PER_INDICATOR,
        }));

        if (trimmed && municipalityId) {
          set({ syncStatus: 'syncing' });
          upsertEntry(municipalityId, indicatorCode, score, trimmed)
            .then(() => set({ syncStatus: 'idle', lastSyncedAt: Date.now() }))
            .catch(() => set({ syncStatus: 'error' }));
        }
      },

      completeCategory: (categoryCode) => {
        const municipalityId = get().municipalityId;
        const wasCompleted = get().completed[categoryCode];
        if (wasCompleted) return;

        set((s) => ({
          completed: { ...s.completed, [categoryCode]: true },
          xp: s.xp + XP_PER_CATEGORY_BONUS,
        }));

        if (municipalityId) {
          upsertCategoryCompletion(municipalityId, categoryCode).catch(() => {});
        }

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
          if (municipalityId) upsertBadge(municipalityId, setCode).catch(() => {});
        }
      },

      isCategoryComplete: (categoryCode) => !!get().completed[categoryCode],

      isCategoryUnlocked: (_categoryCode) => true,

      categoryProgress: (categoryCode) => {
        const cat = INDICATORS.categories[categoryCode];
        if (!cat) return { done: 0, total: 0, pct: 0 };
        // Progress tracks required indicators only — optionals are bonus.
        const required = cat.indicators.filter((i) => !i.optional);
        const total = required.length;
        const entries = get().entries;
        const done = required.filter((i) => {
          const e = entries[i.code];
          return !!(e && e.rawValue && e.rawValue.trim().length > 0);
        }).length;
        return { done, total, pct: total === 0 ? 0 : Math.round((done / total) * 100) };
      },

      overallProgress: () => {
        const entries = get().entries;
        // Only required indicators count toward the overall progress bar.
        let done = 0;
        for (const code of INDICATORS.order) {
          for (const ind of INDICATORS.categories[code].indicators) {
            if (ind.optional) continue;
            const e = entries[ind.code];
            if (e && e.rawValue && e.rawValue.trim().length > 0) done++;
          }
        }
        return {
          done,
          total: REQUIRED_INDICATORS,
          pct: REQUIRED_INDICATORS === 0 ? 0 : Math.round((done / REQUIRED_INDICATORS) * 100),
        };
      },

      level: () => xpToLevel(get().xp),

      reset: () => {
        const municipalityId = get().municipalityId;
        set({ ...emptyState });
        if (municipalityId) deleteAllMunicipalityData(municipalityId).catch(() => {});
      },

      /**
       * Load state for the given municipality. Overwrites local cache with
       * server truth. Also flips the store's municipality context so
       * subsequent saves target the same municipality.
       */
      loadMunicipality: async (municipalityId) => {
        if (!municipalityId) return;
        set({ municipalityId, syncStatus: 'loading' });
        const snapshot = await fetchServerSnapshot(municipalityId);
        if (!snapshot) {
          set({ syncStatus: 'idle' });
          return;
        }

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
          syncStatus: 'idle',
          lastSyncedAt: Date.now(),
        });
      },

      clearLocal: () => {
        set({
          ...emptyState,
          municipalityId: null,
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
        municipalityId: state.municipalityId,
        entries: state.entries,
        completed: state.completed,
        badges: state.badges,
        xp: state.xp,
      }),
    },
  ),
);
