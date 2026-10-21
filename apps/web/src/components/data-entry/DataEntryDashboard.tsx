'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { INDICATORS, type SetCode } from '@/lib/scald-indicators';
import { useDataEntry, isYearEditable } from '@/stores/data-entry';
import { useThresholds, getEffectiveThresholds } from '@/stores/thresholds';
import { useProfile } from '@/hooks/useProfile';
import { canWriteDataEntry } from '@/lib/roles';
import { YearPicker } from './YearPicker';
import { SubmissionCard } from './SubmissionCard';
import { DecisionMakerReview } from './DecisionMakerReview';
import { useEffectiveMunicipality } from '@/hooks/useEffectiveMunicipality';
import { useSubmission } from '@/hooks/useSubmission';
import { hasSeenGuide } from './guide/DataEntryGuide';
import { SyncStatusPill, SyncBanner } from './SyncStatus';
import {
  Lock,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  RotateCcw,
  Eye,
  FileDown,
  GraduationCap,
  X,
} from 'lucide-react';
import { clsx } from 'clsx';

const SET_THEME: Record<
  SetCode,
  { border: string; chip: string; ring: string; iconBg: string; iconText: string; gradient: string }
> = {
  ES: {
    border: 'border-emerald-200',
    chip: 'bg-emerald-100 text-emerald-700',
    ring: 'ring-emerald-200',
    iconBg: 'bg-emerald-500',
    iconText: 'text-emerald-600',
    gradient: 'from-emerald-500 to-green-600',
  },
  SS: {
    border: 'border-rose-200',
    chip: 'bg-rose-100 text-rose-700',
    ring: 'ring-rose-200',
    iconBg: 'bg-rose-500',
    iconText: 'text-rose-600',
    gradient: 'from-rose-500 to-pink-600',
  },
  MS: {
    border: 'border-blue-200',
    chip: 'bg-blue-100 text-blue-700',
    ring: 'ring-blue-200',
    iconBg: 'bg-blue-500',
    iconText: 'text-blue-600',
    gradient: 'from-blue-500 to-indigo-600',
  },
  ECS: {
    border: 'border-orange-200',
    chip: 'bg-orange-100 text-orange-700',
    ring: 'ring-orange-200',
    iconBg: 'bg-orange-500',
    iconText: 'text-orange-600',
    gradient: 'from-orange-500 to-amber-600',
  },
};

const GUIDE_HINT_DISMISSED = 'scald-guide-hint-dismissed';

export function DataEntryDashboard() {
  const [mounted, setMounted] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [resetConfirmText, setResetConfirmText] = useState('');
  // Suggest the guide to someone who has never opened it. Read after mount —
  // localStorage doesn't exist during server rendering.
  const [showGuideHint, setShowGuideHint] = useState(false);
  useEffect(() => {
    setMounted(true);
    let dismissed = false;
    try {
      dismissed = localStorage.getItem(GUIDE_HINT_DISMISSED) === '1';
    } catch {
      /* storage unavailable — show the hint */
    }
    setShowGuideHint(!dismissed && !hasSeenGuide());
  }, []);
  const dismissGuideHint = () => {
    setShowGuideHint(false);
    try {
      localStorage.setItem(GUIDE_HINT_DISMISSED, '1');
    } catch {
      /* storage unavailable — it just reappears next visit */
    }
  };

  const overall = useDataEntry((s) => s.overallProgress());
  const badges = useDataEntry((s) => s.badges);
  const completed = useDataEntry((s) => s.completed);
  const categoryProgress = useDataEntry((s) => s.categoryProgress);
  const isUnlocked = useDataEntry((s) => s.isCategoryUnlocked);
  const syncStatus = useDataEntry((s) => s.syncStatus);
  const resetAll = useDataEntry((s) => s.reset);
  const selectedYear = useDataEntry((s) => s.selectedYear);

  const { profile } = useProfile();
  const canWrite = profile ? canWriteDataEntry(profile.role) : false;
  const isReadOnly = !canWrite;
  const isDecisionMaker = profile?.role === 'decision_maker';
  const isAdmin = profile?.role === 'admin';

  // Sync store to the effective municipality (admin picker aware).
  const { municipalityId: currentMunicipalityId } = useEffectiveMunicipality();

  // Once a year is submitted/approved it is locked for the data-entry team;
  // hide destructive actions (only an admin can override).
  const { locked, loading: submissionLoading } = useSubmission(currentMunicipalityId, selectedYear);
  const lockedForDataEntry = !isAdmin && locked;

  // Bring stale stored scores in line with the current thresholds (V6 moved
  // boundary values between bands). Runs once per municipality/year, only
  // after the server snapshot is in, and NEVER on a submitted/approved year —
  // not even for an admin: RLS lets an admin write there, and what a decision
  // maker approved must not change silently.
  const storeMunicipalityId = useDataEntry((s) => s.municipalityId);
  const lastSyncedAt = useDataEntry((s) => s.lastSyncedAt);
  const resyncScores = useDataEntry((s) => s.resyncScores);
  const thresholdOverrides = useThresholds((s) => s.overrides);
  const overridesLoaded = useThresholds((s) => s.loaded);
  const resyncedFor = useRef<string | null>(null);
  useEffect(() => {
    if (!canWrite || submissionLoading || locked) return;
    if (!isYearEditable(selectedYear) || !overridesLoaded) return;
    // The store briefly holds the previous municipality while an admin
    // switches; resyncing then would write its scores under the new one.
    if (!currentMunicipalityId || storeMunicipalityId !== currentMunicipalityId) return;
    if (syncStatus !== 'idle' || lastSyncedAt === null) return;
    const key = `${currentMunicipalityId}:${selectedYear}`;
    if (resyncedFor.current === key) return;
    resyncedFor.current = key;
    resyncScores((code) => getEffectiveThresholds(code, thresholdOverrides));
  }, [
    canWrite,
    submissionLoading,
    locked,
    selectedYear,
    overridesLoaded,
    currentMunicipalityId,
    storeMunicipalityId,
    syncStatus,
    lastSyncedAt,
    resyncScores,
    thresholdOverrides,
  ]);

  const setCodes: SetCode[] = ['ES', 'SS', 'MS', 'ECS'];

  const grouped = setCodes.map((sc) => ({
    set: sc,
    meta: INDICATORS.sets[sc],
    categories: INDICATORS.order.filter((c) => INDICATORS.categories[c].set === sc),
  }));


  if (!mounted) {
    return (
      <div className="p-6">
        <div className="h-32 rounded-xl bg-slate-100 animate-pulse" />
      </div>
    );
  }

  // Decision makers get a review-focused view (no submit UI, no reset, no category grid).
  if (isDecisionMaker) {
    return <DecisionMakerReview />;
  }

  return (
    <div className="p-4 lg:p-6 space-y-5 lg:space-y-6">
      {isReadOnly && (
        <div className="flex items-start gap-2.5 rounded-lg border border-blue-100 bg-blue-50 px-3.5 py-3 text-xs text-blue-800">
          <Eye className="mt-0.5 h-4 w-4 shrink-0 text-blue-500" />
          <div>
            <p className="font-semibold">Read-only view</p>
            <p className="mt-0.5 text-blue-700">
              You can see progress but not enter or edit values. Data entry is
              performed by the municipality's data entry team.
            </p>
          </div>
        </div>
      )}

      {/* Year selector + Sync status + Prep sheet + Reset */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <YearPicker size="sm" />
          <SyncStatusPill initialized={!!currentMunicipalityId} />
        </div>
        <div className="flex items-center gap-2">
          {canWrite && (
            <Link
              href="/data-entry/guide"
              className="inline-flex items-center gap-1.5 rounded-lg border border-sky-200 bg-sky-50 px-2.5 py-1.5 text-[11px] font-medium text-sky-700 shadow-sm transition hover:bg-sky-100"
            >
              <GraduationCap className="h-3.5 w-3.5" />
              <span>How to enter data</span>
            </Link>
          )}
          <Link
            href="/prep-sheet"
            target="_blank"
            rel="noopener"
            title="Downloadable list of all indicators, methods, and value ranges — useful for offline preparation."
            className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 text-[11px] font-medium text-emerald-700 shadow-sm transition hover:bg-emerald-100"
          >
            <FileDown className="h-3.5 w-3.5" />
            <span>Preparation sheet</span>
          </Link>
          {canWrite && !lockedForDataEntry && (overall.done > 0 || Object.keys(completed).length > 0) && (
            <button
              onClick={() => {
                setResetConfirmText('');
                setShowResetConfirm(true);
              }}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] font-medium text-slate-500 shadow-sm transition hover:border-red-200 hover:text-red-600"
            >
              <RotateCcw className="h-3 w-3" />
              <span className="hidden sm:inline">Clear {selectedYear}</span>
            </button>
          )}
        </div>
      </div>

      <SyncBanner />

      {canWrite && showGuideHint && (
        <div className="relative flex flex-col gap-4 rounded-2xl border-2 border-sky-200 bg-gradient-to-r from-sky-50 to-white p-5 sm:flex-row sm:items-center">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-sky-500 text-white shadow">
            <GraduationCap className="h-6 w-6" />
          </span>
          <div className="flex-1 pr-6">
            <p className="text-base font-bold text-slate-900">New to data entry? Take the guided tour first.</p>
            <p className="mt-0.5 text-sm text-slate-600">
              About 10 minutes, with short animations — how to read a card, type a value, convert it to the right
              unit, and submit. You can try every step without saving anything.
            </p>
          </div>
          <Link
            href="/data-entry/guide"
            className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-xl bg-sky-600 px-5 py-2.5 text-sm font-semibold text-white shadow transition hover:bg-sky-700"
          >
            Open the guide <ChevronRight className="h-4 w-4" />
          </Link>
          <button
            type="button"
            onClick={dismissGuideHint}
            aria-label="Hide this suggestion"
            className="absolute right-3 top-3 rounded-lg p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* HUD: Overall Progress · Sets Completed */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
            <ClipboardList className="h-3.5 w-3.5 text-emerald-500" /> Overall Progress
          </div>
          <p className="mt-2 text-4xl font-bold text-slate-900">{overall.pct}%</p>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-emerald-600 transition-all"
              style={{ width: `${overall.pct}%` }}
            />
          </div>
          <p className="mt-1.5 text-xs text-slate-400">
            {overall.done} / {overall.total} indicators completed
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /> Sets Completed
          </div>
          <p className="mt-2 text-4xl font-bold text-slate-900">
            {badges.length}
            <span className="text-base font-normal text-slate-400"> / 4</span>
          </p>
          <div className="mt-3 flex gap-2">
            {setCodes.map((sc) => {
              const earned = badges.includes(sc);
              return (
                <div
                  key={sc}
                  className={clsx(
                    'flex h-7 w-7 items-center justify-center rounded-lg text-[10px] font-bold transition',
                    earned
                      ? `text-white bg-gradient-to-br ${SET_THEME[sc].gradient} shadow`
                      : 'bg-slate-100 text-slate-300',
                  )}
                  title={earned ? `${INDICATORS.sets[sc].name} — complete` : `${INDICATORS.sets[sc].name} — incomplete`}
                >
                  {sc.slice(0, 2)}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Submission workflow — submit (data entry) → approve (decision maker) → calculate */}
      <SubmissionCard />

      {/* Sets and categories */}
      {grouped.map((group) => {
        const theme = SET_THEME[group.set];
        const setDone = group.categories.every((c) => completed[c]);
        const setProgress = group.categories.reduce(
          (acc, c) => {
            const p = categoryProgress(c);
            return { done: acc.done + p.done, total: acc.total + p.total };
          },
          { done: 0, total: 0 },
        );
        const setPct = setProgress.total ? Math.round((setProgress.done / setProgress.total) * 100) : 0;

        return (
          <section key={group.set} className="space-y-3">
            <div className="flex items-end justify-between">
              <div className="flex items-center gap-3">
                <div
                  className={clsx(
                    'flex h-9 items-center justify-center rounded-lg px-2.5 text-xs font-bold text-white',
                    `bg-gradient-to-br ${theme.gradient}`,
                  )}
                >
                  {group.set}
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-900">{group.meta.name} Sustainability</h2>
                  <p className="text-xs text-slate-500">
                    {group.categories.length} categories · {setProgress.total} indicators · {setPct}% complete
                    {setDone && ' · ✓ Complete'}
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
              {group.categories.map((catCode) => {
                const cat = INDICATORS.categories[catCode];
                const prog = categoryProgress(catCode);
                const isDone = !!completed[catCode];
                const unlocked = isUnlocked(catCode);

                return (
                  <CategoryCard
                    key={catCode}
                    code={catCode}
                    name={cat.name}
                    count={prog.total}
                    done={prog.done}
                    pct={prog.pct}
                    completed={isDone}
                    unlocked={unlocked}
                    theme={theme}
                  />
                );
              })}
            </div>
          </section>
        );
      })}

      {/* Clear-year confirm. It used to say "Reset all data?" and delete every
          year of the municipality; it now deletes the selected year only, and
          asks for the year to be typed so it can't be confirmed by reflex. */}
      {showResetConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="clear-year-title"
        >
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-50 text-red-600">
                <RotateCcw className="h-5 w-5" />
              </div>
              <h3 id="clear-year-title" className="text-lg font-bold text-slate-900">
                Delete all values for {selectedYear}?
              </h3>
            </div>
            <p className="mt-3 text-sm text-slate-600">
              Every indicator value, category tick and badge for <strong>{selectedYear}</strong> will be
              permanently deleted — on this computer and on the server. Other years are not affected. This cannot
              be undone.
            </p>
            <p className="mt-2 text-sm text-slate-600">
              To change a single value you don’t need this — just type over it, or clear that one box.
            </p>
            <label className="mt-4 block text-sm font-medium text-slate-700">
              Type <strong>{selectedYear}</strong> to confirm
              <input
                value={resetConfirmText}
                onChange={(e) => setResetConfirmText(e.target.value)}
                inputMode="numeric"
                autoFocus
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-base outline-none focus:border-red-400 focus:ring-2 focus:ring-red-200"
              />
            </label>
            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={() => setShowResetConfirm(false)}
                className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  resetAll();
                  setShowResetConfirm(false);
                }}
                disabled={resetConfirmText.trim() !== String(selectedYear)}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Delete {selectedYear}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

interface CardProps {
  code: string;
  name: string;
  count: number;
  done: number;
  pct: number;
  completed: boolean;
  unlocked: boolean;
  theme: (typeof SET_THEME)[SetCode];
}

function CategoryCard({ code, name, count, done, pct, completed, unlocked, theme }: CardProps) {
  const body = (
    <div
      className={clsx(
        'group relative h-full rounded-xl border bg-white p-4 shadow-sm transition',
        completed && `${theme.border} ring-1 ${theme.ring}`,
        !completed && 'border-slate-200',
        unlocked && 'hover:-translate-y-0.5 hover:shadow-md cursor-pointer',
        !unlocked && 'opacity-60 cursor-not-allowed',
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <span className={clsx('inline-block rounded px-1.5 py-0.5 text-[10px] font-bold', theme.chip)}>
            {code}
          </span>
          <h3 className="mt-2 text-sm font-semibold text-slate-900 leading-tight line-clamp-2">{name}</h3>
        </div>
        {completed ? (
          <CheckCircle2 className={clsx('h-5 w-5 shrink-0', theme.iconText)} />
        ) : !unlocked ? (
          <Lock className="h-5 w-5 shrink-0 text-slate-300" />
        ) : (
          <ChevronRight className="h-5 w-5 shrink-0 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-slate-500" />
        )}
      </div>

      <div className="mt-3">
        <div className="flex items-baseline justify-between text-xs">
          <span className="font-medium text-slate-700">
            {done} / {count}
          </span>
          <span className="text-slate-400">{pct}%</span>
        </div>
        <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-100">
          <div
            className={clsx(
              'h-full rounded-full transition-all',
              completed ? `bg-gradient-to-r ${theme.gradient}` : 'bg-slate-300',
            )}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      <p className="mt-3 text-[10px] text-slate-400">{count} indicators</p>
    </div>
  );

  if (!unlocked) return body;
  return (
    <Link href={`/data-entry/${code}`} className="block">
      {body}
    </Link>
  );
}
