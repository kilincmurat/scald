'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { INDICATORS, type SetCode } from '@/lib/scald-indicators';
import { useDataEntry } from '@/stores/data-entry';
import { useProfile } from '@/hooks/useProfile';
import { useSubmission } from '@/hooks/useSubmission';
import { canRespondFeedback } from '@/lib/roles';
import { clsx } from 'clsx';
import {
  ArrowLeft,
  ArrowRight,
  Leaf,
  Loader2,
  Calculator,
  Lock,
  Trees,
  Sparkles,
  TrendingUp,
  Award,
  ShieldAlert,
  Clock,
  FileText,
} from 'lucide-react';

type Phase = 'idle' | 'calculating' | 'done';

const CALC_STEPS = [
  'Aggregating indicator scores…',
  'Normalising set weights…',
  'Computing sustainability profile…',
  'Estimating ecological footprint…',
  'Finalising report…',
];

const SET_GRADIENT: Record<SetCode, string> = {
  ES: 'from-emerald-500 to-green-600',
  SS: 'from-rose-500 to-pink-600',
  MS: 'from-blue-500 to-indigo-600',
  ECS: 'from-orange-500 to-amber-600',
};

const SET_ACCENT: Record<SetCode, { text: string; bg: string; ring: string }> = {
  ES: { text: 'text-emerald-700', bg: 'bg-emerald-50', ring: 'ring-emerald-200' },
  SS: { text: 'text-rose-700', bg: 'bg-rose-50', ring: 'ring-rose-200' },
  MS: { text: 'text-blue-700', bg: 'bg-blue-50', ring: 'ring-blue-200' },
  ECS: { text: 'text-orange-700', bg: 'bg-orange-50', ring: 'ring-orange-200' },
};

export function CalculateFootprint() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const entries = useDataEntry((s) => s.entries);
  const overall = useDataEntry((s) => s.overallProgress());
  const year = useDataEntry((s) => s.selectedYear);
  const { profile } = useProfile();
  const municipalityId = profile?.municipalityId ?? null;
  const { submission, loading: submissionLoading } = useSubmission(municipalityId, year);
  const role = profile?.role;
  const canApprove = role ? canRespondFeedback(role) : false;

  const [phase, setPhase] = useState<Phase>('idle');
  const [stepIdx, setStepIdx] = useState(0);
  const [animatedScore, setAnimatedScore] = useState(0);

  const allComplete = overall.total > 0 && overall.done === overall.total;
  const approved = submission?.status === 'approved';
  const awaitingReview = submission?.status === 'submitted';

  // Compute set/category averages and overall score (0..100)
  const result = useMemo(() => {
    const setSums: Record<string, { sum: number; n: number }> = {
      ES: { sum: 0, n: 0 },
      SS: { sum: 0, n: 0 },
      MS: { sum: 0, n: 0 },
      ECS: { sum: 0, n: 0 },
    };
    const catSums: Record<string, { sum: number; n: number; setCode: string; name: string }> = {};
    let overallSum = 0;
    let overallN = 0;

    for (const catCode of INDICATORS.order) {
      const cat = INDICATORS.categories[catCode];
      catSums[catCode] = { sum: 0, n: 0, setCode: cat.set, name: cat.name };
      for (const ind of cat.indicators) {
        const e = entries[ind.code];
        if (e) {
          const s = e.score;
          catSums[catCode].sum += s;
          catSums[catCode].n += 1;
          setSums[cat.set].sum += s;
          setSums[cat.set].n += 1;
          overallSum += s;
          overallN += 1;
        }
      }
    }

    const toPct = (sum: number, n: number) => (n === 0 ? 0 : Math.round((sum / (n * 5)) * 100));
    const setScores: Record<SetCode, number> = {
      ES: toPct(setSums.ES.sum, setSums.ES.n),
      SS: toPct(setSums.SS.sum, setSums.SS.n),
      MS: toPct(setSums.MS.sum, setSums.MS.n),
      ECS: toPct(setSums.ECS.sum, setSums.ECS.n),
    };
    const overallScore = toPct(overallSum, overallN);
    const catList = INDICATORS.order.map((code) => ({
      code,
      name: catSums[code].name,
      setCode: catSums[code].setCode as SetCode,
      pct: toPct(catSums[code].sum, catSums[code].n),
    }));

    // Rough EF (gha/capita) estimate — better score → smaller footprint
    // 100 → 2.5 gha (best), 0 → 8.0 gha (worst). Linear map.
    const ef = +(8.0 - (overallScore / 100) * 5.5).toFixed(2);

    // Rating band
    const band =
      overallScore >= 75
        ? { label: 'Highly Sustainable', color: 'text-emerald-700', bg: 'bg-emerald-50', ring: 'ring-emerald-200' }
        : overallScore >= 55
        ? { label: 'On Track', color: 'text-lime-700', bg: 'bg-lime-50', ring: 'ring-lime-200' }
        : overallScore >= 40
        ? { label: 'Needs Improvement', color: 'text-amber-700', bg: 'bg-amber-50', ring: 'ring-amber-200' }
        : { label: 'Critical', color: 'text-red-700', bg: 'bg-red-50', ring: 'ring-red-200' };

    return { overallScore, setScores, catList, ef, band };
  }, [entries]);

  // Run calculation animation
  const runCalculation = () => {
    setPhase('calculating');
    setStepIdx(0);
    const stepDelay = 600;
    CALC_STEPS.forEach((_, i) => {
      setTimeout(() => setStepIdx(i), i * stepDelay);
    });
    setTimeout(() => setPhase('done'), CALC_STEPS.length * stepDelay + 400);
  };

  // Animate score number when done
  useEffect(() => {
    if (phase !== 'done') return;
    const target = result.overallScore;
    const start = performance.now();
    const duration = 1200;
    let raf = 0;
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setAnimatedScore(Math.round(eased * target));
      if (t < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [phase, result.overallScore]);

  if (!mounted || submissionLoading) {
    return (
      <div className="p-6">
        <div className="h-64 rounded-xl bg-slate-100 animate-pulse" />
      </div>
    );
  }

  // Gate 1: approval required (admin bypasses only if all data present)
  if (!approved && role !== 'admin') {
    return (
      <div className="p-6">
        <div className="mx-auto max-w-md rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-amber-50">
            {awaitingReview ? (
              <Clock className="h-7 w-7 text-amber-500" />
            ) : (
              <ShieldAlert className="h-7 w-7 text-amber-500" />
            )}
          </div>
          <h2 className="mt-4 text-lg font-bold text-slate-900">
            {awaitingReview ? 'Awaiting approval' : 'Approval required'}
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            {awaitingReview
              ? canApprove
                ? 'The data for ' +
                  year +
                  ' has been submitted. Go to Data Entry to review the declarations and approve before calculating.'
                : 'The data for ' +
                  year +
                  ' has been submitted and is waiting for the decision maker to approve it.'
              : 'This year’s data has not yet been submitted and approved. Ecological footprint can only be calculated on approved data.'}
          </p>
          <Link
            href="/data-entry"
            className="mt-5 inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            <ArrowLeft className="h-4 w-4" /> Back to data entry
          </Link>
        </div>
      </div>
    );
  }

  // Gate 2: all indicators must be present (defensive)
  if (!allComplete) {
    return (
      <div className="p-6">
        <div className="mx-auto max-w-md rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-slate-100">
            <Lock className="h-7 w-7 text-slate-400" />
          </div>
          <h2 className="mt-4 text-lg font-bold text-slate-900">Calculation Locked</h2>
          <p className="mt-1 text-sm text-slate-500">
            Fill in all {overall.total} indicators to unlock the ecological footprint calculation.
          </p>
          <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-slate-400 transition-all"
              style={{ width: `${(overall.done / overall.total) * 100}%` }}
            />
          </div>
          <p className="mt-1.5 text-xs text-slate-500">
            {overall.done} / {overall.total} completed
          </p>
          <Link
            href="/data-entry"
            className="mt-5 inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            <ArrowLeft className="h-4 w-4" /> Back to data entry
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mx-auto max-w-4xl">
        <Link
          href="/data-entry"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-700"
        >
          <ArrowLeft className="h-4 w-4" /> Back to data entry
        </Link>

        {phase === 'idle' && (
          <div className="mt-5 overflow-hidden rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50 via-white to-teal-50 p-8 shadow-sm">
            <div className="flex flex-col items-center text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-500/30">
                <Calculator className="h-8 w-8" />
              </div>
              <h2 className="mt-4 text-2xl font-bold text-slate-900">Ready to calculate</h2>
              <p className="mt-2 max-w-md text-sm text-slate-600">
                All {overall.total} indicators across 24 categories are filled. Run the calculation
                to see your municipality’s sustainability score, per-set breakdown, and estimated
                ecological footprint.
              </p>
              <button
                onClick={runCalculation}
                className="mt-6 inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-emerald-500 to-teal-600 px-6 py-3 text-sm font-semibold text-white shadow-md transition hover:opacity-90 hover:shadow-lg"
              >
                Start calculation
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {phase === 'calculating' && (
          <div className="mt-5 overflow-hidden rounded-2xl border border-slate-200 bg-white p-10 shadow-sm">
            <div className="flex flex-col items-center text-center">
              {/* Spinner ring */}
              <div className="relative flex h-24 w-24 items-center justify-center">
                <div className="absolute inset-0 rounded-full border-4 border-slate-100" />
                <div className="absolute inset-0 rounded-full border-4 border-emerald-500 border-t-transparent animate-spin" />
                <Leaf className="h-9 w-9 text-emerald-600" />
              </div>

              <h2 className="mt-6 text-xl font-bold text-slate-900">Calculating…</h2>
              <p className="mt-1 text-sm text-slate-500">This will take a moment</p>

              {/* Step list */}
              <ul className="mt-6 w-full max-w-md space-y-2 text-left">
                {CALC_STEPS.map((label, i) => {
                  const state = i < stepIdx ? 'done' : i === stepIdx ? 'active' : 'pending';
                  return (
                    <li
                      key={label}
                      className={clsx(
                        'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition',
                        state === 'done' && 'bg-emerald-50 text-emerald-700',
                        state === 'active' && 'bg-slate-100 text-slate-800',
                        state === 'pending' && 'text-slate-400',
                      )}
                    >
                      {state === 'done' ? (
                        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500 text-white">
                          <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        </span>
                      ) : state === 'active' ? (
                        <Loader2 className="h-5 w-5 shrink-0 animate-spin text-slate-500" />
                      ) : (
                        <span className="h-5 w-5 shrink-0 rounded-full border-2 border-slate-200" />
                      )}
                      <span>{label}</span>
                    </li>
                  );
                })}
              </ul>

              {/* Bottom progress bar */}
              <div className="mt-6 w-full max-w-md">
                <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-teal-500 transition-all duration-500"
                    style={{ width: `${((stepIdx + 1) / CALC_STEPS.length) * 100}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {phase === 'done' && <Result animatedScore={animatedScore} result={result} year={year} />}
      </div>
    </div>
  );
}

function Result({
  animatedScore,
  result,
  year,
}: {
  animatedScore: number;
  result: {
    overallScore: number;
    setScores: Record<SetCode, number>;
    catList: { code: string; name: string; setCode: SetCode; pct: number }[];
    ef: number;
    band: { label: string; color: string; bg: string; ring: string };
  };
  year: number;
}) {
  return (
    <div className="mt-5 space-y-6">
      {/* Overall score */}
      <div className="overflow-hidden rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50 via-white to-teal-50 p-8 shadow-sm">
        <div className="flex flex-col items-center gap-6 lg:flex-row lg:items-center lg:justify-around">
          {/* Score */}
          <div className="text-center">
            <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-500/30">
              <Sparkles className="h-7 w-7" />
            </div>
            <p className="mt-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
              Overall Score
            </p>
            <p className="mt-1 text-6xl font-bold text-slate-900">
              {animatedScore}
              <span className="text-2xl text-slate-400">/100</span>
            </p>
            <span
              className={clsx(
                'mt-2 inline-block rounded-full px-3 py-1 text-xs font-semibold ring-1',
                result.band.color,
                result.band.bg,
                result.band.ring,
              )}
            >
              {result.band.label}
            </span>
          </div>

          {/* EF */}
          <div className="hidden h-24 w-px bg-slate-200 lg:block" />
          <div className="text-center">
            <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-emerald-600 shadow-sm ring-1 ring-emerald-200">
              <Trees className="h-7 w-7" />
            </div>
            <p className="mt-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
              Ecological Footprint
            </p>
            <p className="mt-1 text-6xl font-bold text-slate-900">
              {result.ef}
              <span className="text-2xl text-slate-400"> gHa/capita</span>
            </p>
            <p className="mt-2 text-xs text-slate-500">Global target · 2.5 gHa</p>
          </div>
        </div>

        <div className="mt-6 flex flex-col items-center gap-2 border-t border-emerald-100 pt-5 sm:flex-row sm:justify-between">
          <p className="text-xs text-slate-600">
            Formal report — includes charts, per-set and per-category tables. Suitable for
            council briefings and archival.
          </p>
          <a
            href={`/official-report?year=${year}`}
            target="_blank"
            rel="noopener"
            className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800"
          >
            <FileText className="h-4 w-4" />
            Download official report
            <ArrowRight className="h-4 w-4" />
          </a>
        </div>
      </div>

      {/* Set breakdown */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-slate-400" />
          <h3 className="text-sm font-semibold text-slate-900">Sustainability Set Breakdown</h3>
        </div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-4">
          {(['ES', 'SS', 'MS', 'ECS'] as SetCode[]).map((sc) => (
            <div key={sc} className="rounded-xl border border-slate-100 bg-slate-50 p-4">
              <div className="flex items-center justify-between">
                <span
                  className={clsx(
                    'rounded px-1.5 py-0.5 text-[10px] font-bold',
                    SET_ACCENT[sc].bg,
                    SET_ACCENT[sc].text,
                  )}
                >
                  {sc}
                </span>
                <span className="text-2xl font-bold text-slate-900">
                  {result.setScores[sc]}
                  <span className="text-sm text-slate-400">/100</span>
                </span>
              </div>
              <p className="mt-1 text-xs font-semibold text-slate-700">{INDICATORS.sets[sc].name}</p>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-200">
                <div
                  className={clsx('h-full rounded-full bg-gradient-to-r', SET_GRADIENT[sc])}
                  style={{ width: `${result.setScores[sc]}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Category breakdown */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center gap-2">
          <Award className="h-4 w-4 text-slate-400" />
          <h3 className="text-sm font-semibold text-slate-900">Category Breakdown</h3>
        </div>
        <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
          {result.catList.map((cat) => (
            <div key={cat.code} className="flex items-center gap-3 rounded-lg border border-slate-100 px-3 py-2">
              <span
                className={clsx(
                  'rounded px-1.5 py-0.5 text-[10px] font-bold',
                  SET_ACCENT[cat.setCode].bg,
                  SET_ACCENT[cat.setCode].text,
                )}
              >
                {cat.code}
              </span>
              <p className="flex-1 text-xs font-medium text-slate-800 truncate">{cat.name}</p>
              <div className="h-1.5 w-20 overflow-hidden rounded-full bg-slate-100">
                <div
                  className={clsx('h-full rounded-full bg-gradient-to-r', SET_GRADIENT[cat.setCode])}
                  style={{ width: `${cat.pct}%` }}
                />
              </div>
              <span className="w-10 text-right text-xs font-semibold text-slate-700">{cat.pct}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="flex justify-center">
        <Link
          href="/data-entry"
          className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
        >
          <ArrowLeft className="h-4 w-4" /> Back to data entry
        </Link>
      </div>
    </div>
  );
}
