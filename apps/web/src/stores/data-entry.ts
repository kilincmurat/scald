'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { INDICATORS, TOTAL_INDICATORS } from '@/lib/scald-indicators';

export type IndicatorEntry = {
  score: number; // 0..5
  rawValue?: string; // user's raw input (optional, for record)
  enteredAt: number;
};

export type DataEntryState = {
  // indicatorCode -> entry
  entries: Record<string, IndicatorEntry>;
  // categoryCode -> isCompleted
  completed: Record<string, boolean>;
  // earned badges (set codes when all categories of a set are done)
  badges: string[];
  xp: number;
  hydrated: boolean;

  // actions
  saveEntry: (indicatorCode: string, score: number, rawValue?: string) => void;
  completeCategory: (categoryCode: string) => void;
  isCategoryComplete: (categoryCode: string) => boolean;
  isCategoryUnlocked: (categoryCode: string) => boolean;
  categoryProgress: (categoryCode: string) => { done: number; total: number; pct: number };
  overallProgress: () => { done: number; total: number; pct: number };
  level: () => { level: number; xpInLevel: number; xpForNext: number };
  reset: () => void;
};

const XP_PER_INDICATOR = 10;
const XP_PER_CATEGORY_BONUS = 50;
const XP_PER_SET_BONUS = 200;

function xpToLevel(xp: number) {
  // Level n requires sum(100*i) XP = 100 * n(n+1)/2. We invert.
  let level = 1;
  let acc = 0;
  while (acc + 100 * level <= xp) {
    acc += 100 * level;
    level++;
  }
  return { level, xpInLevel: xp - acc, xpForNext: 100 * level };
}

export const useDataEntry = create<DataEntryState>()(
  persist(
    (set, get) => ({
      entries: {},
      completed: {},
      badges: [],
      xp: 0,
      hydrated: false,

      saveEntry: (indicatorCode, score, rawValue) => {
        const prev = get().entries[indicatorCode];
        set((s) => ({
          entries: {
            ...s.entries,
            [indicatorCode]: { score, rawValue, enteredAt: Date.now() },
          },
          xp: prev ? s.xp : s.xp + XP_PER_INDICATOR,
        }));
      },

      completeCategory: (categoryCode) => {
        const wasCompleted = get().completed[categoryCode];
        if (wasCompleted) return;

        set((s) => ({
          completed: { ...s.completed, [categoryCode]: true },
          xp: s.xp + XP_PER_CATEGORY_BONUS,
        }));

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
        }
      },

      isCategoryComplete: (categoryCode) => !!get().completed[categoryCode],

      isCategoryUnlocked: (categoryCode) => {
        const order = INDICATORS.order;
        const idx = order.indexOf(categoryCode);
        if (idx <= 0) return true;
        // Unlocked if all previous categories are complete
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
        const done = cat.indicators.filter((i) => entries[i.code] !== undefined).length;
        return { done, total, pct: total === 0 ? 0 : Math.round((done / total) * 100) };
      },

      overallProgress: () => {
        const done = Object.keys(get().entries).length;
        return {
          done,
          total: TOTAL_INDICATORS,
          pct: TOTAL_INDICATORS === 0 ? 0 : Math.round((done / TOTAL_INDICATORS) * 100),
        };
      },

      level: () => xpToLevel(get().xp),

      reset: () => set({ entries: {}, completed: {}, badges: [], xp: 0 }),
    }),
    {
      name: 'scald-data-entry',
      onRehydrateStorage: () => (state) => {
        if (state) state.hydrated = true;
      },
    },
  ),
);
