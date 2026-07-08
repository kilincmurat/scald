'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { useDataEntry } from '@/stores/data-entry';
import { useEffectiveWeights } from '@/stores/weights';
import { useProfile } from '@/hooks/useProfile';
import { useEffectiveMunicipality } from '@/hooks/useEffectiveMunicipality';
import { PILOT_MUNICIPALITIES } from '@/lib/pilot-municipalities';
import { YearPicker } from '@/components/data-entry/YearPicker';
import {
  computeCategoryScores,
  computeSetScores,
  computeOverallScore,
  getRecentEntries,
  getWeakestIndicators,
  getStrongestIndicators,
  scoreBand,
  SET_THEME,
  timeAgo,
} from '@/lib/scores';
import { INDICATORS, type SetCode } from '@/lib/scald-indicators';
import {
  ArrowRight,
  ClipboardList,
  Calculator,
  Sparkles,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle2,
  Trees,
  Clock,
  Building2,
} from 'lucide-react';
import { clsx } from 'clsx';

const SetRadar = dynamic(() => import('./SetRadar').then((m) => m.SetRadar), { ssr: false });

export function OverviewDashboard() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const { profile } = useProfile();
  const entries = useDataEntry((s) => s.entries);
  const completed = useDataEntry((s) => s.completed);
  const badges = useDataEntry((s) => s.badges);

  const { isAdmin, municipality: viewingMunicipality } = useEffectiveMunicipality();
  const adminMuniId = useDataEntry((s) => s.adminMunicipalityId);
  const setAdminMuni = useDataEntry((s) => s.setAdminMunicipality);

  const weights = useEffectiveWeights();
  const setScores = useMemo(() => computeSetScores(entries, weights), [entries, weights]);
  const catScores = useMemo(() => computeCategoryScores(entries, weights), [entries, weights]);
  const overall = useMemo(() => computeOverallScore(entries, weights), [entries, weights]);
  const recent = useMemo(() => getRecentEntries(entries, 5), [entries]);
  const weakest = useMemo(() => getWeakestIndicators(entries, 4), [entries]);
  const strongest = useMemo(() => getStrongestIndicators(entries, 4), [entries]);

  const setCodes: SetCode[] = ['ES', 'SS', 'MS', 'ECS'];
  const allComplete = overall.entered === overall.total && overall.total > 0;
  const isEmpty = overall.entered === 0;

  if (!mounted) {
    return (
      <div className="p-4 lg:p-6">
        <div className="h-40 rounded-xl bg-slate-100 animate-pulse" />
      </div>
    );
  }

  if (isEmpty) {
    return <EmptyState />;
  }

  const band = scoreBand(overall.score);
  const completedCats = INDICATORS.order.filter((c) => completed[c]).length;

  return (
    <div className="p-4 lg:p-6 space-y-5 lg:space-y-6">
      {/* Municipality context + admin selector */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs shadow-sm">
          <Building2 className="h-3.5 w-3.5 text-slate-400" />
          <span className="text-slate-500">Viewing:</span>
          {viewingMunicipality ? (
            <span className="font-semibold text-slate-800">
              {viewingMunicipality.flag} {viewingMunicipality.name}
            </span>
          ) : (
            <span className="text-slate-400">No municipality</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <YearPicker size="sm" />
          {isAdmin && (
            <select
              value={adminMuniId ?? PILOT_MUNICIPALITIES[0]?.id ?? ''}
              onChange={(e) => setAdminMuni(e.target.value)}
              className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
            >
              {PILOT_MUNICIPALITIES.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.flag} {m.name} · {m.country}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* Overall Score Hero */}
      <section
        className={clsx(
          'relative overflow-hidden rounded-2xl border shadow-sm',
          band.ring,
          allComplete ? 'bg-gradient-to-br from-emerald-50 via-white to-teal-50' : 'bg-white',
        )}
      >
        <div className="grid grid-cols-1 gap-4 p-5 lg:grid-cols-3 lg:gap-6 lg:p-6">
          {/* Score */}
          <div className="lg:col-span-1">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
              <Sparkles className="h-3.5 w-3.5 text-emerald-500" /> Overall Score
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-5xl font-bold text-slate-900 lg:text-6xl">
                {overall.score}
              </span>
              <span className="text-lg text-slate-400">/100</span>
            </div>
            <span
              className={clsx(
                'mt-2 inline-block rounded-full px-3 py-1 text-xs font-semibold ring-1',
                band.color,
                band.bg,
                band.ring,
              )}
            >
              {band.label}
            </span>
            <p className="mt-3 text-xs text-slate-500">
              Based on {overall.entered} of {overall.total} indicators scored
              <span className="ml-1">({Math.round((overall.entered / overall.total) * 100)}%)</span>
            </p>
          </div>

          {/* Ecological Footprint */}
          <div className="border-t border-slate-200/70 pt-4 lg:col-span-1 lg:border-t-0 lg:border-l lg:pl-6 lg:pt-0">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
              <Trees className="h-3.5 w-3.5 text-emerald-500" /> Ecological Footprint
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-4xl font-bold text-slate-900 lg:text-5xl">{overall.ef}</span>
              <span className="text-sm text-slate-400">gHa/capita</span>
            </div>
            <p className="mt-2 text-xs text-slate-500">Global target · 2.5 gHa</p>
            <div className="mt-3">
              <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-emerald-600"
                  style={{
                    width: `${Math.min(100, Math.max(0, ((8 - overall.ef) / 5.5) * 100))}%`,
                  }}
                />
              </div>
            </div>
          </div>

          {/* Progress */}
          <div className="border-t border-slate-200/70 pt-4 lg:col-span-1 lg:border-t-0 lg:border-l lg:pl-6 lg:pt-0">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
              <ClipboardList className="h-3.5 w-3.5 text-blue-500" /> Progress
            </div>
            <div className="mt-2 flex items-center gap-3">
              <div>
                <p className="text-2xl font-bold text-slate-900">
                  {completedCats}
                  <span className="text-sm font-normal text-slate-400"> / 24</span>
                </p>
                <p className="text-[10px] uppercase tracking-wider text-slate-400">Categories</p>
              </div>
              <div className="h-8 w-px bg-slate-200" />
              <div>
                <p className="text-2xl font-bold text-slate-900">
                  {badges.length}
                  <span className="text-sm font-normal text-slate-400"> / 4</span>
                </p>
                <p className="text-[10px] uppercase tracking-wider text-slate-400">Sets Done</p>
              </div>
            </div>
            <div className="mt-3 flex flex-col gap-2 sm:flex-row">
              <Link
                href="/data-entry"
                className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white transition hover:bg-slate-800"
              >
                <ClipboardList className="h-3.5 w-3.5" /> Continue Data Entry
              </Link>
              {allComplete && (
                <Link
                  href="/data-entry/calculate"
                  className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-gradient-to-r from-emerald-500 to-teal-600 px-3 py-2 text-xs font-semibold text-white transition hover:opacity-90"
                >
                  <Calculator className="h-3.5 w-3.5" /> Recalculate
                </Link>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Set Scores + Radar */}
      <section className="grid grid-cols-1 gap-4 lg:grid-cols-5">
        {/* Set score cards */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:col-span-3 lg:grid-cols-2">
          {setCodes.map((sc) => {
            const s = setScores[sc];
            const theme = SET_THEME[sc];
            const b = scoreBand(s.score);
            return (
              <div
                key={sc}
                className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:shadow-md"
              >
                <div className="flex items-center justify-between">
                  <span className={clsx('rounded px-1.5 py-0.5 text-[10px] font-bold', theme.chip)}>
                    {sc}
                  </span>
                  {s.complete && <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />}
                </div>
                <p className="mt-2 text-xs font-medium text-slate-600">{theme.fullName}</p>
                <div className="mt-1 flex items-baseline gap-1">
                  <span className="text-3xl font-bold text-slate-900">{s.score}</span>
                  <span className="text-xs text-slate-400">/100</span>
                </div>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className={clsx('h-full rounded-full bg-gradient-to-r', theme.gradient)}
                    style={{ width: `${s.score}%` }}
                  />
                </div>
                <p className="mt-2 text-[10px] text-slate-400">
                  {s.entered} / {s.total} indicators · {b.label}
                </p>
              </div>
            );
          })}
        </div>

        {/* Radar chart */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm lg:col-span-2">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-900">Sustainability Profile</h2>
            <span className="text-[10px] text-slate-400">4 sets · 0–100</span>
          </div>
          <SetRadar setScores={setScores} />
        </div>
      </section>

      {/* Weakest & Strongest */}
      <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <IndicatorHighlights
          title="Needs attention"
          icon={<AlertTriangle className="h-4 w-4 text-red-500" />}
          items={weakest}
          emptyLabel="No weak indicators yet — keep going!"
          direction="weak"
        />
        <IndicatorHighlights
          title="Top performers"
          icon={<TrendingUp className="h-4 w-4 text-emerald-500" />}
          items={strongest}
          emptyLabel="No high-scoring indicators yet"
          direction="strong"
        />
      </section>

      {/* Categories at a glance */}
      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm lg:p-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-900">All 24 Categories</h2>
          <Link
            href="/data-entry"
            className="text-xs font-medium text-slate-500 hover:text-slate-700"
          >
            Manage →
          </Link>
        </div>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {catScores.map((cs) => {
            const theme = SET_THEME[cs.setCode];
            const b = scoreBand(cs.score);
            return (
              <Link
                key={cs.code}
                href={`/data-entry/${cs.code}`}
                className="group flex items-center gap-2.5 rounded-lg border border-slate-100 bg-white px-3 py-2 transition hover:border-slate-300 hover:shadow-sm"
              >
                <span className={clsx('rounded px-1.5 py-0.5 text-[10px] font-bold', theme.chip)}>
                  {cs.code}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium text-slate-800 truncate">{cs.name}</p>
                  <p className="text-[10px] text-slate-400">
                    {cs.entered}/{cs.total}
                  </p>
                </div>
                <div className="flex items-center gap-1.5">
                  <div
                    className={clsx('h-2 w-2 rounded-full', cs.entered > 0 ? b.chipColor : 'bg-slate-200')}
                  />
                  <span className="w-6 text-right text-xs font-semibold text-slate-700">
                    {cs.entered > 0 ? cs.score : '—'}
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* Recent activity */}
      {recent.length > 0 && (
        <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm lg:p-5">
          <div className="mb-3 flex items-center gap-2">
            <Clock className="h-4 w-4 text-slate-400" />
            <h2 className="text-sm font-semibold text-slate-900">Recent Activity</h2>
          </div>
          <ul className="space-y-2">
            {recent.map((r) => (
              <li
                key={r.indicator.code}
                className="flex items-center gap-3 rounded-lg border border-slate-100 px-3 py-2"
              >
                <div
                  className={clsx(
                    'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-bold text-white',
                    r.score >= 4
                      ? 'bg-emerald-500'
                      : r.score >= 2
                      ? 'bg-amber-500'
                      : 'bg-red-500',
                  )}
                >
                  {r.score}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-medium text-slate-800">
                    {r.indicator.name}
                  </p>
                  <p className="text-[10px] text-slate-400">
                    {r.categoryName} · {r.indicator.unit}
                  </p>
                </div>
                <span className="text-[10px] text-slate-400">{timeAgo(r.enteredAt)}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function IndicatorHighlights({
  title,
  icon,
  items,
  emptyLabel,
  direction,
}: {
  title: string;
  icon: React.ReactNode;
  items: ReturnType<typeof getWeakestIndicators>;
  emptyLabel: string;
  direction: 'weak' | 'strong';
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm lg:p-5">
      <div className="mb-3 flex items-center gap-2">
        {icon}
        <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
      </div>
      {items.length === 0 ? (
        <p className="text-xs text-slate-500 py-6 text-center">{emptyLabel}</p>
      ) : (
        <ul className="space-y-2">
          {items.map((item) => {
            const theme = SET_THEME[item.setCode];
            return (
              <li
                key={item.indicator.code}
                className="flex items-center gap-3 rounded-lg border border-slate-100 px-3 py-2"
              >
                <div
                  className={clsx(
                    'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-bold text-white',
                    direction === 'weak' ? 'bg-red-500' : 'bg-emerald-500',
                  )}
                >
                  {item.score}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-medium text-slate-800">
                    {item.indicator.name}
                  </p>
                  <div className="flex items-center gap-1.5">
                    <span className={clsx('rounded px-1 py-0.5 text-[9px] font-bold', theme.chip)}>
                      {item.setCode}
                    </span>
                    <span className="truncate text-[10px] text-slate-400">
                      {item.categoryName}
                    </span>
                  </div>
                </div>
                {direction === 'weak' ? (
                  <TrendingDown className="h-3.5 w-3.5 shrink-0 text-red-400" />
                ) : (
                  <TrendingUp className="h-3.5 w-3.5 shrink-0 text-emerald-500" />
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="p-6">
      <div className="mx-auto max-w-2xl rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm lg:p-12">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-lg">
          <ClipboardList className="h-8 w-8" />
        </div>
        <h2 className="mt-5 text-xl font-bold text-slate-900 lg:text-2xl">
          Welcome to SCALD
        </h2>
        <p className="mx-auto mt-2 max-w-md text-sm text-slate-500">
          Start by entering data for your municipality. Fill in 152 indicators across 24 categories
          — the overview, ecological footprint, and reports will all update automatically.
        </p>
        <Link
          href="/data-entry"
          className="mt-6 inline-flex items-center gap-2 rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
        >
          Start Data Entry <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
}
