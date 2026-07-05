'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { INDICATORS, TOTAL_INDICATORS, type SetCode } from '@/lib/scald-indicators';
import { useDataEntry } from '@/stores/data-entry';
import { useProfile } from '@/hooks/useProfile';
import { canWriteDataEntry } from '@/lib/roles';
import {
  Lock,
  CheckCircle2,
  ChevronRight,
  Trophy,
  Award,
  Calculator,
  ArrowRight,
  Loader2,
  Cloud,
  CloudOff,
  RotateCcw,
  Eye,
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

export function DataEntryDashboard() {
  const [mounted, setMounted] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  useEffect(() => setMounted(true), []);

  const overall = useDataEntry((s) => s.overallProgress());
  const badges = useDataEntry((s) => s.badges);
  const completed = useDataEntry((s) => s.completed);
  const categoryProgress = useDataEntry((s) => s.categoryProgress);
  const isUnlocked = useDataEntry((s) => s.isCategoryUnlocked);
  const loadMunicipality = useDataEntry((s) => s.loadMunicipality);
  const currentMunicipalityId = useDataEntry((s) => s.municipalityId);
  const syncStatus = useDataEntry((s) => s.syncStatus);
  const resetAll = useDataEntry((s) => s.reset);

  const { profile, loading: profileLoading } = useProfile();
  const canWrite = profile ? canWriteDataEntry(profile.role) : false;
  const isReadOnly = !canWrite;

  // Sync store to profile's municipality on mount / profile change
  useEffect(() => {
    if (!mounted || profileLoading) return;
    const target = profile?.municipalityId;
    if (target && target !== currentMunicipalityId) {
      void loadMunicipality(target);
    }
  }, [mounted, profileLoading, profile?.municipalityId, currentMunicipalityId, loadMunicipality]);

  const setCodes: SetCode[] = ['ES', 'SS', 'MS', 'ECS'];

  const grouped = setCodes.map((sc) => ({
    set: sc,
    meta: INDICATORS.sets[sc],
    categories: INDICATORS.order.filter((c) => INDICATORS.categories[c].set === sc),
  }));

  const allComplete = overall.total > 0 && overall.done === overall.total;

  if (!mounted) {
    return (
      <div className="p-6">
        <div className="h-32 rounded-xl bg-slate-100 animate-pulse" />
      </div>
    );
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

      {/* Sync status + Reset */}
      <div className="flex items-center justify-between gap-3">
        <SyncStatusPill status={syncStatus} initialized={!!currentMunicipalityId} />
        {canWrite && (overall.done > 0 || Object.keys(completed).length > 0) && (
          <button
            onClick={() => setShowResetConfirm(true)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] font-medium text-slate-500 shadow-sm transition hover:border-red-200 hover:text-red-600"
          >
            <RotateCcw className="h-3 w-3" />
            <span className="hidden sm:inline">Reset all</span>
          </button>
        )}
      </div>

      {/* HUD: Overall Progress · Badges */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
            <Trophy className="h-3.5 w-3.5 text-emerald-500" /> Overall Progress
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
            <Award className="h-3.5 w-3.5 text-amber-500" /> Set Badges
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
                  title={earned ? `${INDICATORS.sets[sc].name} — complete` : `${INDICATORS.sets[sc].name} — locked`}
                >
                  {sc.slice(0, 2)}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Ecological Footprint calculator — locked until all indicators entered */}
      <EcologicalFootprintCard
        allComplete={allComplete}
        done={overall.done}
        total={overall.total}
      />

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
                    {setDone && ' · ✓ Badge earned'}
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
                    count={cat.indicators.length}
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

      {/* Reset confirm modal */}
      {showResetConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-50 text-red-600">
                <RotateCcw className="h-5 w-5" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">Reset all data?</h3>
            </div>
            <p className="mt-3 text-sm text-slate-600">
              This will permanently delete all your indicator entries, category
              completions and badges — both locally and on the server. This
              action cannot be undone.
            </p>
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
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700"
              >
                Yes, delete everything
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SyncStatusPill({
  status,
  initialized,
}: {
  status: 'idle' | 'loading' | 'syncing' | 'error';
  initialized: boolean;
}) {
  if (status === 'loading' || !initialized) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[10px] font-medium text-slate-500">
        <Loader2 className="h-3 w-3 animate-spin" />
        Loading from server…
      </span>
    );
  }
  if (status === 'syncing') {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 text-[10px] font-medium text-blue-700">
        <Loader2 className="h-3 w-3 animate-spin" />
        Syncing…
      </span>
    );
  }
  if (status === 'error') {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[10px] font-medium text-amber-700">
        <CloudOff className="h-3 w-3" />
        Offline — changes saved locally
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[10px] font-medium text-emerald-700">
      <Cloud className="h-3 w-3" />
      Synced with server
    </span>
  );
}

function EcologicalFootprintCard({
  allComplete,
  done,
  total,
}: {
  allComplete: boolean;
  done: number;
  total: number;
}) {
  return (
    <div
      className={clsx(
        'relative overflow-hidden rounded-2xl border p-6 shadow-sm transition',
        allComplete
          ? 'border-emerald-200 bg-gradient-to-br from-emerald-50 via-white to-teal-50'
          : 'border-slate-200 bg-slate-50/50',
      )}
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-start gap-4">
          <div
            className={clsx(
              'flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl transition',
              allComplete
                ? 'bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-500/30'
                : 'bg-slate-200 text-slate-400',
            )}
          >
            {allComplete ? <Calculator className="h-7 w-7" /> : <Lock className="h-6 w-6" />}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-bold text-slate-900">Calculate Ecological Footprint</h3>
              {allComplete && (
                <span className="rounded-full bg-emerald-500 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">
                  Ready
                </span>
              )}
            </div>
            <p className="mt-1 text-sm text-slate-600">
              {allComplete
                ? 'All indicators are filled. Run the calculation to see your municipality’s overall score, set breakdown, and 2030 projection.'
                : 'Complete all indicators across every category to unlock the calculation.'}
            </p>
            <div className="mt-3 flex items-center gap-3">
              <div className="h-1.5 w-40 overflow-hidden rounded-full bg-slate-200">
                <div
                  className={clsx(
                    'h-full rounded-full transition-all',
                    allComplete
                      ? 'bg-gradient-to-r from-emerald-400 to-emerald-600'
                      : 'bg-slate-400',
                  )}
                  style={{ width: `${total > 0 ? (done / total) * 100 : 0}%` }}
                />
              </div>
              <span className="text-xs font-medium text-slate-500">
                {done} / {total} indicators
              </span>
            </div>
          </div>
        </div>

        {allComplete ? (
          <Link
            href="/data-entry/calculate"
            className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-emerald-500 to-teal-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md transition hover:opacity-90 hover:shadow-lg"
          >
            Calculate now
            <ArrowRight className="h-4 w-4" />
          </Link>
        ) : (
          <button
            disabled
            className="inline-flex items-center gap-2 rounded-lg bg-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-400 cursor-not-allowed"
          >
            <Lock className="h-4 w-4" />
            Locked
          </button>
        )}
      </div>
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
