'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { INDICATORS, REQUIRED_INDICATORS } from '@/lib/scald-indicators';
import { autoScore, isNumericIndicator } from '@/lib/auto-score';
import {
  fetchServerSnapshot,
  upsertEntry,
  deleteEntry,
  upsertCategoryCompletion,
  deleteCategoryCompletion,
  upsertBadge,
  deleteBadge,
  deleteYearData,
  lookupIndicatorCategory,
  SaveError,
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

/** Last calendar year that has fully ended — only completed years can receive data. */
export function maxEditableYear(): number {
  return new Date().getFullYear() - 1;
}
export function isYearEditable(year: number): boolean {
  return year >= MIN_YEAR && year <= Math.min(MAX_YEAR, maxEditableYear());
}

type SyncStatus = 'idle' | 'loading' | 'syncing' | 'error';

/** Per-year entry map — the primary storage. `entries` at the top level
 * mirrors the currently-selected year so existing UI code keeps working. */
type YearScoped<T> = Record<number, T>;

export type DataEntryState = {
  municipalityId: string | null;
  /**
   * Admin-only override — when an admin picks a municipality to inspect from the
   * sidebar, we keep the id here (persisted). Non-admin users ignore this field.
   */
  adminMunicipalityId: string | null;
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
  /**
   * Indicator writes that have not reached the server yet, keyed
   * municipality:year:code so the latest write to an indicator wins.
   * Persisted: a value typed while offline survives a reload and is sent when
   * the connection returns instead of being overwritten by the server copy.
   */
  pending: Record<string, PendingWrite>;
  /** Why the last write was refused by the server, for the status badge. */
  lastError: string | null;

  // actions
  setAdminMunicipality: (municipalityId: string | null) => void;
  setYear: (year: number) => void;
  saveEntry: (indicatorCode: string, score: number, rawValue?: string) => void;
  /** Remove an indicator's value (the user emptied the box). */
  clearEntry: (indicatorCode: string) => void;
  /** Retry every pending write; called on reconnect and on a timer. */
  flushPending: () => Promise<void>;
  /**
   * Re-derive stored scores of numeric indicators in the selected year from
   * their raw values and the current thresholds; returns the codes it fixed.
   * Callers must only invoke this when the year is writable.
   */
  resyncScores: (thresholdsFor: (indicatorCode: string) => string[]) => string[];
  completeCategory: (categoryCode: string) => void;
  isCategoryComplete: (categoryCode: string) => boolean;
  isCategoryUnlocked: (categoryCode: string) => boolean;
  categoryProgress: (categoryCode: string) => { done: number; total: number; pct: number };
  overallProgress: () => { done: number; total: number; pct: number };
  level: () => { level: number; xpInLevel: number; xpForNext: number };
  /** Delete every value of the SELECTED year (not other years). */
  reset: () => void;

  // Server integration
  loadMunicipality: (municipalityId: string) => Promise<void>;
  clearLocal: () => void;
};

export type PendingWrite =
  | { op: 'upsert'; municipalityId: string; year: number; code: string; score: number; raw: string }
  | { op: 'delete'; municipalityId: string; year: number; code: string };

const pendingKey = (w: { municipalityId: string; year: number; code: string }) =>
  `${w.municipalityId}:${w.year}:${w.code}`;

function sendWrite(w: PendingWrite): Promise<void> {
  return w.op === 'upsert'
    ? upsertEntry(w.municipalityId, w.code, w.score, w.raw, w.year)
    : deleteEntry(w.municipalityId, w.code, w.year);
}

/** Human message for a write the server refused (not a connection problem). */
function refusalMessage(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err);
  return /row-level security|permission/i.test(msg)
    ? 'The server refused a change — this year may be locked. Reload the page.'
    : `A change could not be saved: ${msg}`;
}

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
    (set, get) => {
      // Writes currently in flight (not persisted — a reload has none).
      let inflight = 0;
      let flushing = false;

      const statusAfter = (pending: Record<string, PendingWrite>, lastError: string | null): SyncStatus =>
        inflight > 0 ? 'syncing' : Object.keys(pending).length > 0 || lastError ? 'error' : 'idle';

      /** Record the outcome of one write. A write is dropped from the queue
       * only if it is still the queued one — a newer value typed meanwhile
       * stays queued — and only when it succeeded or was refused for good. */
      const settle = (w: PendingWrite, err: unknown) => {
        inflight = Math.max(0, inflight - 1);
        const transient = err instanceof SaveError && err.transient;
        set((st) => {
          const pending = { ...st.pending };
          const key = pendingKey(w);
          if (pending[key] === w && !transient) delete pending[key];
          const lastError = !err ? null : transient ? st.lastError : refusalMessage(err);
          return {
            pending,
            lastError,
            syncStatus: statusAfter(pending, lastError),
            lastSyncedAt: err ? st.lastSyncedAt : Date.now(),
          };
        });
      };

      /** Queue a write, then try to send it right away. */
      const submit = (w: PendingWrite) => {
        inflight++;
        set((st) => ({ pending: { ...st.pending, [pendingKey(w)]: w }, syncStatus: 'syncing' }));
        sendWrite(w).then(
          () => settle(w, null),
          (err) => settle(w, err),
        );
      };

      /** Completion/badge writes are derived state — not queued, but a refusal
       * is still surfaced instead of vanishing. */
      const noteFailure = (err: unknown) => {
        if (err instanceof SaveError && err.transient) return;
        set((st) => {
          const lastError = refusalMessage(err);
          return { lastError, syncStatus: statusAfter(st.pending, lastError) };
        });
      };

      return {
      ...emptyState,
      municipalityId: null,
      adminMunicipalityId: null,
      selectedYear: DEFAULT_YEAR,
      hydrated: false,
      syncStatus: 'idle',
      lastSyncedAt: null,
      pending: {},
      lastError: null,

      setAdminMunicipality: (id) => {
        set({ adminMunicipalityId: id });
      },

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
          submit({ op: 'upsert', municipalityId, year, code: indicatorCode, score, raw: trimmed });
        }
      },

      clearEntry: (indicatorCode) => {
        const s = get();
        const year = s.selectedYear;
        const municipalityId = s.municipalityId;
        const yearEntries = s.entriesByYear[year] ?? {};
        if (!yearEntries[indicatorCode]) return;

        const nextYearEntries = { ...yearEntries };
        delete nextYearEntries[indicatorCode];
        const entriesByYear = { ...s.entriesByYear, [year]: nextYearEntries };

        // Emptying a REQUIRED indicator means its category is no longer
        // complete — and neither is the set's badge. Optional ones never
        // counted towards completion, so they change nothing here.
        let completedByYear = s.completedByYear;
        let badgesByYear = s.badgesByYear;
        const lookup = lookupIndicatorCategory(indicatorCode);
        const indicator = lookup
          ? INDICATORS.categories[lookup.category].indicators.find((i) => i.code === indicatorCode)
          : undefined;
        const yearCompleted = s.completedByYear[year] ?? {};
        const uncomplete = !!(lookup && indicator && !indicator.optional && yearCompleted[lookup.category]);
        const yearBadges = s.badgesByYear[year] ?? [];
        const dropBadge = uncomplete && !!lookup && yearBadges.includes(lookup.set);
        if (uncomplete && lookup) {
          const c = { ...yearCompleted };
          delete c[lookup.category];
          completedByYear = { ...completedByYear, [year]: c };
          if (dropBadge) badgesByYear = { ...badgesByYear, [year]: yearBadges.filter((b) => b !== lookup.set) };
        }

        set({
          entriesByYear,
          completedByYear,
          badgesByYear,
          entries: nextYearEntries,
          completed: completedByYear[year] ?? {},
          badges: badgesByYear[year] ?? [],
          xp: xpFromYearScoped(entriesByYear, completedByYear, badgesByYear),
        });

        if (municipalityId) {
          submit({ op: 'delete', municipalityId, year, code: indicatorCode });
          if (uncomplete && lookup) {
            deleteCategoryCompletion(municipalityId, lookup.category, year).catch(noteFailure);
            if (dropBadge) deleteBadge(municipalityId, lookup.set, year).catch(noteFailure);
          }
        }
      },

      flushPending: async () => {
        if (flushing) return;
        const queued = Object.values(get().pending);
        if (queued.length === 0) return;
        flushing = true;
        try {
          for (const w of queued) {
            // Superseded by a newer value while we were sending others.
            if (get().pending[pendingKey(w)] !== w) continue;
            inflight++;
            set({ syncStatus: 'syncing' });
            try {
              await sendWrite(w);
              settle(w, null);
            } catch (err) {
              settle(w, err);
              // Still offline: the rest would fail the same way. Next trigger retries.
              if (err instanceof SaveError && err.transient) break;
            }
          }
        } finally {
          flushing = false;
        }
      },

      // A score is stored at save time, so it goes stale when thresholds change
      // — the V6 switch moved boundary values into the upper band (">3000–≤4500"
      // now contains 4500), and an admin override does the same. The raw value
      // is the real data; this brings the derived score back in line with it.
      // Maturity indicators are skipped: there the picked level IS the score.
      resyncScores: (thresholdsFor) => {
        const fixed: string[] = [];
        const entries = get().entries;
        for (const [code, entry] of Object.entries(entries)) {
          const raw = entry.rawValue?.trim();
          if (!raw) continue;
          const thresholds = thresholdsFor(code);
          if (!isNumericIndicator(thresholds)) continue;
          const score = autoScore(raw, thresholds);
          if (score !== null && score !== entry.score) {
            get().saveEntry(code, score, raw);
            fixed.push(code);
          }
        }
        return fixed;
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
          upsertCategoryCompletion(municipalityId, categoryCode, year).catch(noteFailure);
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
          if (municipalityId) upsertBadge(municipalityId, setCode, year).catch(noteFailure);
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
        const s = get();
        const year = s.selectedYear;
        const municipalityId = s.municipalityId;
        const entriesByYear = { ...s.entriesByYear };
        const completedByYear = { ...s.completedByYear };
        const badgesByYear = { ...s.badgesByYear };
        delete entriesByYear[year];
        delete completedByYear[year];
        delete badgesByYear[year];
        // Queued writes for this year would re-create what was just deleted.
        const pending = Object.fromEntries(
          Object.entries(s.pending).filter(([, w]) => !(w.municipalityId === municipalityId && w.year === year)),
        );
        set({
          entriesByYear,
          completedByYear,
          badgesByYear,
          entries: {},
          completed: {},
          badges: [],
          pending,
          xp: xpFromYearScoped(entriesByYear, completedByYear, badgesByYear),
        });
        if (municipalityId) {
          deleteYearData(municipalityId, year).catch((err) => {
            // A failed delete leaves the values on the server: say so, or the
            // user believes they are gone until the next reload brings them back.
            set((st) => {
              const lastError =
                err instanceof SaveError && err.transient
                  ? 'Could not reach the server — the year was NOT cleared. Try again when online.'
                  : refusalMessage(err);
              return { lastError, syncStatus: statusAfter(st.pending, lastError) };
            });
          });
        }
      },

      loadMunicipality: async (municipalityId) => {
        if (!municipalityId) return;
        set({ municipalityId, syncStatus: 'loading' });
        const snapshot = await fetchServerSnapshot(municipalityId);
        if (!snapshot) {
          // Keep what is on screen and say we couldn't reach the server.
          set({ syncStatus: 'error' });
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

        // Writes that never reached the server are newer than its copy: lay
        // them on top instead of letting the snapshot erase them.
        for (const w of Object.values(get().pending)) {
          if (w.municipalityId !== municipalityId) continue;
          const yearEntries = (entriesByYear[w.year] ??= {});
          if (w.op === 'upsert') yearEntries[w.code] = { score: w.score, rawValue: w.raw, enteredAt: Date.now() };
          else delete yearEntries[w.code];
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
          syncStatus: statusAfter(get().pending, get().lastError),
          lastSyncedAt: Date.now(),
        });
        void get().flushPending();
      },

      clearLocal: () => {
        set({
          ...emptyState,
          municipalityId: null,
          syncStatus: 'idle',
          lastSyncedAt: null,
          // Signed out: queued writes must not be sent under the next user.
          pending: {},
          lastError: null,
        });
      },
      };
    },
    {
      name: 'scald-data-entry',
      version: 3,
      // v3 = indicator set V6. Caches from before it hold ES_SI* codes and the
      // old values of indicators V6 redefined. The server snapshot replaces all
      // of it on load anyway; dropping the cached data up front keeps it from
      // flashing on screen until then. Municipality and year choice are kept.
      migrate: (persisted, version) => {
        const state = persisted as Partial<DataEntryState>;
        if (version < 3) {
          return {
            ...state,
            entriesByYear: {},
            completedByYear: {},
            badgesByYear: {},
            entries: {},
            completed: {},
            badges: [],
            xp: 0,
          } as DataEntryState;
        }
        return state as DataEntryState;
      },
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.hydrated = true;
          const cap = Math.min(MAX_YEAR, maxEditableYear());
          if (state.selectedYear > cap) {
            const y = Math.max(MIN_YEAR, cap);
            state.selectedYear = y;
            state.entries = state.entriesByYear?.[y] ?? {};
            state.completed = state.completedByYear?.[y] ?? {};
            state.badges = state.badgesByYear?.[y] ?? [];
          }
        }
      },
      partialize: (state) => ({
        municipalityId: state.municipalityId,
        adminMunicipalityId: state.adminMunicipalityId,
        selectedYear: state.selectedYear,
        entriesByYear: state.entriesByYear,
        completedByYear: state.completedByYear,
        badgesByYear: state.badgesByYear,
        entries: state.entries,
        completed: state.completed,
        badges: state.badges,
        xp: state.xp,
        pending: state.pending,
      }),
    },
  ),
);

// Retry queued writes when the connection returns, and periodically while
// any are waiting (the 'online' event alone misses captive portals and
// server-side outages).
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => void useDataEntry.getState().flushPending());
  setInterval(() => {
    if (Object.keys(useDataEntry.getState().pending).length > 0) void useDataEntry.getState().flushPending();
  }, 20_000);
}
