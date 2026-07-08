'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { INDICATORS, type SetCode } from '@/lib/scald-indicators';
import { useDataEntry } from '@/stores/data-entry';
import { useEffectiveMunicipality } from '@/hooks/useEffectiveMunicipality';
import { useEffectiveWeights } from '@/stores/weights';
import { computeCategoryScores, computeOverallScore, computeSetScores, SET_THEME } from '@/lib/scores';
import { YearPicker } from './YearPicker';
import { SubmissionCard } from './SubmissionCard';
import { CheckCircle2, ClipboardList, Trees, Leaf } from 'lucide-react';
import { clsx } from 'clsx';

/**
 * Decision-maker's view of /data-entry — no editing UI, no submit button.
 * They see the submission status (SubmissionCard exposes approve UI for them),
 * a compact read-only preview of the submitted data, and a link to the full
 * ecological footprint page once approved.
 */
export function DecisionMakerReview() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const entries = useDataEntry((s) => s.entries);
  useEffectiveMunicipality();

  const weights = useEffectiveWeights();
  const overall = useMemo(() => computeOverallScore(entries, weights), [entries, weights]);
  const setScores = useMemo(() => computeSetScores(entries, weights), [entries, weights]);
  const catScores = useMemo(() => computeCategoryScores(entries, weights), [entries, weights]);

  if (!mounted) {
    return (
      <div className="p-4 lg:p-6">
        <div className="h-32 rounded-xl bg-slate-100 animate-pulse" />
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-6 space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Data review</h2>
          <p className="text-xs text-slate-500">
            Review the data submitted by the data-entry team for this reporting year.
          </p>
        </div>
        <YearPicker size="sm" />
      </div>

      <SubmissionCard />

      {/* Snapshot preview — read-only */}
      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="text-sm font-semibold text-slate-900">Submitted data — snapshot</h3>
        <p className="mt-0.5 text-xs text-slate-500">
          A read-only overview of what the data-entry team has entered for this year.
        </p>

        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCell
            icon={<Leaf className="h-3.5 w-3.5 text-emerald-500" />}
            label="Overall score"
            value={overall.entered > 0 ? `${overall.score}` : '—'}
            hint={overall.entered > 0 ? '/ 100' : ''}
          />
          <StatCell
            icon={<Trees className="h-3.5 w-3.5 text-emerald-500" />}
            label="Ecological footprint"
            value={overall.entered > 0 ? `${overall.ef}` : '—'}
            hint="gHa"
          />
          <StatCell
            icon={<ClipboardList className="h-3.5 w-3.5 text-emerald-500" />}
            label="Indicators"
            value={`${overall.entered} / ${overall.total}`}
          />
          <StatCell
            icon={<CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />}
            label="Categories"
            value={`${catScores.filter((c) => c.entered > 0).length} / ${INDICATORS.order.length}`}
          />
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {(['ES', 'SS', 'MS', 'ECS'] as SetCode[]).map((sc) => {
            const theme = SET_THEME[sc];
            const s = setScores[sc];
            return (
              <div key={sc} className="rounded-lg border border-slate-100 bg-slate-50 p-3">
                <div className="flex items-center justify-between">
                  <span className={clsx('rounded px-1.5 py-0.5 text-[10px] font-bold', theme.chip)}>
                    {sc}
                  </span>
                  <span className="text-[10px] text-slate-500">
                    {s.entered}/{s.total}
                  </span>
                </div>
                <p className="mt-2 text-sm font-medium text-slate-600">{theme.fullName}</p>
                <p className="mt-1 text-2xl font-bold text-slate-900">
                  {s.entered > 0 ? s.score : '—'}
                  <span className="ml-0.5 text-xs font-normal text-slate-400">/100</span>
                </p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Category grid — read-only, no links to edit */}
      <section>
        <h3 className="mb-3 text-sm font-semibold text-slate-900">Category scores</h3>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {catScores.map((cs) => {
            const theme = SET_THEME[cs.setCode];
            return (
              <div
                key={cs.code}
                className="flex items-center gap-3 rounded-lg border border-slate-100 bg-white px-3 py-2 shadow-sm"
              >
                <span className={clsx('rounded px-1.5 py-0.5 text-[10px] font-bold', theme.chip)}>
                  {cs.code}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-medium text-slate-800">{cs.name}</p>
                  <p className="text-[10px] text-slate-400">
                    {cs.entered}/{cs.total} indicators
                  </p>
                </div>
                <span className="w-6 text-right text-xs font-semibold text-slate-700">
                  {cs.entered > 0 ? cs.score : '—'}
                </span>
              </div>
            );
          })}
        </div>
      </section>

      <div className="rounded-lg border border-blue-100 bg-blue-50 p-3 text-xs text-blue-900">
        Once the data is approved, you can view the full ecological footprint breakdown on{' '}
        <Link href="/efct" className="font-semibold underline hover:text-blue-700">
          the Ecological Footprint page
        </Link>{' '}
        or run the calculation from the submission card above.
      </div>
    </div>
  );
}

function StatCell({
  icon,
  label,
  value,
  hint,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2">
      <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
        {icon} {label}
      </div>
      <p className="mt-0.5 text-sm font-bold text-slate-900">
        {value}
        {hint && <span className="ml-0.5 text-[10px] font-normal text-slate-400">{hint}</span>}
      </p>
    </div>
  );
}
