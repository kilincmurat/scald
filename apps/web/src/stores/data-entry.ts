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

/** UI-supported reporting year range. Migration 009 uses 2020..2040 at the DB level. */
export const MIN_YEAR = 2025;
export const MAX_YEAR = 2030;
export const YEAR_OPTIONS = Array.from(
  { length: MAX_YEAR - MIN_YEAR + 1 },
  (_, i) => MIN_YEAR + i,
);
export const DEFAULT_YEAR = MIN_YEAR;

type SyncStatus = 'idle' | 'loading' | 'syncing' | 'error';

/** Per-year entry map — the primary storage. `entries` at the top level
 * mirrors the currently-selected year so existing UI code keeps working. */
type YearScoped<T> = Record<number, T>;

export type DataEntryState = {
  municipalityId: string | null;
  selectedYear: number;

  entriesByYear: YearScoped<Record<string, IndicatorEntry>>;
  completedByYear: YearScoped<Record<string, boolean>>;
  badgesByYear: YearScoped<string[]>;

  /** Current-year views — derived from *ByYear + selectedYear on setYear/save. */
  entries: Record<string, IndicatorEntry>;
  completed: Record<string, boolean>;
  badges: string[];
  xp: number;
  hydrated: boolean;

  syncStatus: SyncStatus;
  lastSyncedAt: number | null;

  // actions
  setYear: (year: number) => void;
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

function clampYear(y: number): number {
  if (!Number.isFinite(y)) return DEFAULT_YEAR;
  if (y < MIN_YEAR) return MIN_YEAR;
  if (y > MAX_YEAR) return MAX_YEAR;
  return Math.trunc(y);
}

function xpFromYearScoped(
  entriesByYear: YearScoped<Record<string, IndicatorEntry>>,
  completedByYear: YearScoped<Record<string, boolean>>,
  badgesByYear: YearScoped<string[]>,
): number {
  let entryCount = 0;
  for (const y of Object.keys(entriesByYear)) entryCount += Object.keys(entriesByYear[+y]).length;
  let catCount = 0;
  for (const y of Object.keys(completedByYear)) catCount += Object.keys(completedByYear[+y]).length;
  let badgeCount = 0;
  for (const y of Object.keys(badgesByYear)) badgeCount += badgesByYear[+y].length;
  return entryCount * XP_PER_INDICATOR + catCount * XP_PER_CATEGORY_BONUS + badgeCount * XP_PER_SET_BONUS;
}

const emptyState = {
  entriesByYear: {} as YearScoped<Record<string, IndicatorEntry>>,
  completedByYear: {} as YearScoped<Record<string, boolean>>,
  badgesByYear: {} as YearScoped<string[]>,
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
      selectedYear: DEFAULT_YEAR,
      hydrated: false,
      syncStatus: 'idle',
      lastSyncedAt: null,

      setYear: (year) => {
        const y = clampYear(year);
        set((s) => ({
          selectedYear: y,
          entries: s.entriesByYear[y] ?? {},
          completed: s.completedByYear[y] ?? {},
          badges: s.badgesByYear[y] ?? [],
        }));
      },

      saveEntry: (indicatorCode, score, rawValue) => {
        const s = get();
        const year = s.selectedYear;
        const municipalityId = s.municipalityId;
        const yearEntries = s.entriesByYear[year] ?? {};
        const prev = yearEntries[indicatorCode];
        const trimmed = rawValue?.trim() || undefined;
        const nextEntry: IndicatorEntry = { score, rawValue: trimmed, enteredAt: Date.now() };
        const nextYearEntries = { ...yearEntries, [indicatorCode]: nextEntry };
        const nextEntriesByYear = { ...s.entriesByYear, [year]: nextYearEntries };

        set({
          entries: nextYearEntries,
          entriesByYear: nextEntriesByYear,
          xp: prev ? s.xp : s.xp + XP_PER_INDICATOR,
        });

        if (trimmed && municipalityId) {
          set({ syncStatus: 'syncing' });
          upsertEntry(municipalityId, indicatorCode, score, trimmed, year)
            .then(() => set({ syncStatus: 'idle', lastSyncedAt: Date.now() }))
            .catch(() => set({ syncStatus: 'error' }));
        }
      },

      completeCategory: (categoryCode) => {
        const s = get();
        const year = s.selectedYear;
        const municipalityId = s.municipalityId;
        const yearCompleted = s.completedByYear[year] ?? {};
        if (yearCompleted[categoryCode]) return;

        const nextYearCompleted = { ...yearCompleted, [categoryCode]: true };
        const nextCompletedByYear = { ...s.completedByYear, [year]: nextYearCompleted };

        set({
          completed: nextYearCompleted,
          completedByYear: nextCompletedByYear,
          xp: s.xp + XP_PER_CATEGORY_BONUS,
        });

        if (municipalityId) {
          upsertCategoryCompletion(municipalityId, categoryCode, year).catch(() => {});
        }

        const setCode = INDICATORS.categories[categoryCode]?.set;
        if (!setCode) return;
        const setCats = INDICATORS.order.filter((c) => INDICATORS.categories[c].set === setCode);
        const allDone = setCats.every((c) => nextYearCompleted[c]);
        const yearBadges = get().badgesByYear[year] ?? [];
        if (allDone && !yearBadges.includes(setCode)) {
          const nextYearBadges = [...yearBadges, setCode];
          const nextBadgesByYear = { ...get().badgesByYear, [year]: nextYearBadges };
          set((s2) => ({
            badges: nextYearBadges,
            badgesByYear: nextBadgesByYear,
            xp: s2.xp + XP_PER_SET_BONUS,
          }));
          if (municipalityId) upsertBadge(municipalityId, setCode, year).catch(() => {});
        }
      },

      isCategoryComplete: (categoryCode) => !!get().completed[categoryCode],

      isCategoryUnlocked: (_categoryCode) => true,

      categoryProgress: (categoryCode) => {
        const cat = INDICATORS.categories[categoryCode];
        if (!cat) return { done: 0, total: 0, pct: 0 };
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

      loadMunicipality: async (municipalityId) => {
        if (!municipalityId) return;
        set({ municipalityId, syncStatus: 'loading' });
        const snapshot = await fetchServerSnapshot(municipalityId);
        if (!snapshot) {
          set({ syncStatus: 'idle' });
          return;
        }

        const entriesByYear: YearScoped<Record<string, IndicatorEntry>> = {};
        for (const row of snapshot.entries) {
          const y = row.year ?? DEFAULT_YEAR;
          if (!entriesByYear[y]) entriesByYear[y] = {};
          entriesByYear[y][row.indicator_code] = {
            score: row.score,
            rawValue: row.raw_value,
            enteredAt: new Date(row.updated_at).getTime(),
          };
        }
        const completedByYear: YearScoped<Record<string, boolean>> = {};
        for (const row of snapshot.completions) {
          const y = row.year ?? DEFAULT_YEAR;
          if (!completedByYear[y]) completedByYear[y] = {};
          completedByYear[y][row.category_code] = true;
        }
        const badgesByYear: YearScoped<string[]> = {};
        for (const row of snapshot.badges) {
          const y = row.year ?? DEFAULT_YEAR;
          if (!badgesByYear[y]) badgesByYear[y] = [];
          badgesByYear[y].push(row.set_code);
        }

        const currentYear = get().selectedYear;
        set({
          entriesByYear,
          completedByYear,
          badgesByYear,
          entries: entriesByYear[currentYear] ?? {},
          completed: completedByYear[currentYear] ?? {},
          badges: badgesByYear[currentYear] ?? [],
          xp: xpFromYearScoped(entriesByYear, completedByYear, badgesByYear),
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
      version: 2,
      onRehydrateStorage: () => (state) => {
        if (state) state.hydrated = true;
      },
      partialize: (state) => ({
        municipalityId: state.municipalityId,
        selectedYear: state.selectedYear,
        entriesByYear: state.entriesByYear,
        completedByYear: state.completedByYear,
        badgesByYear: state.badgesByYear,
        entries: state.entries,
        completed: state.completed,
        badges: state.badges,
        xp: state.xp,
      }),
    },
  ),
);
