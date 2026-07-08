'use client';

import { INDICATORS, type SetCode } from '@/lib/scald-indicators';
import type {
  computeCategoryScores,
  computeOverallScore,
  computeSetScores,
} from '@/lib/scores';
import { scoreBand } from '@/lib/scores';
import type { IndicatorEntry } from '@/stores/data-entry';
import {
  ScoreGauge,
  SetRadar,
  CategoryBars,
  ChartLegend,
} from '@/components/exports/report-charts';

export const SET_FULL: Record<SetCode, string> = {
  ES: 'Environmental Sustainability',
  SS: 'Social Sustainability',
  MS: 'Managerial Sustainability',
  ECS: 'Economic Sustainability',
};
export const SET_ORDER: SetCode[] = ['ES', 'SS', 'MS', 'ECS'];
export const SET_COLOR: Record<SetCode, string> = {
  ES: '#059669',
  SS: '#e11d48',
  MS: '#2563eb',
  ECS: '#ea580c',
};

type Overall = ReturnType<typeof computeOverallScore>;
type SetScores = ReturnType<typeof computeSetScores>;
type CategoryScoreList = ReturnType<typeof computeCategoryScores>;

/** Cover page with municipality, year, generated date, prepared by. */
export function ReportCover({
  title,
  subtitle,
  municipalityName,
  municipalityCountry,
  year,
  preparedBy,
}: {
  title: string;
  subtitle: string;
  municipalityName: string;
  municipalityCountry?: string;
  year: number;
  preparedBy?: string;
}) {
  const generatedAt = new Date().toLocaleDateString('en-GB');
  return (
    <section className="avoid-break border-b-2 border-slate-900 pb-6">
      <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-emerald-700">
        SCALD · KA220-ADU · Sustainability Report
      </p>
      <h1 className="mt-3 text-3xl font-bold leading-tight text-slate-900">{title}</h1>
      <p className="mt-1 text-sm text-slate-700">{subtitle}</p>

      <div className="mt-6 grid grid-cols-2 gap-4 border-t border-slate-200 pt-4 text-xs sm:grid-cols-4">
        <ReportField label="Municipality" value={municipalityName} />
        <ReportField
          label="Country"
          value={municipalityCountry ?? '—'}
        />
        <ReportField label="Reporting year" value={String(year)} />
        <ReportField label="Generated on" value={generatedAt} />
      </div>
      {preparedBy && (
        <p className="mt-3 text-[11px] text-slate-500">
          Prepared by <strong>{preparedBy}</strong>
        </p>
      )}
    </section>
  );
}

function ReportField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase text-slate-500">{label}</p>
      <p className="mt-0.5 font-medium text-slate-900">{value}</p>
    </div>
  );
}

/** Executive summary: overall gauge, EF, data coverage. */
export function ExecutiveSummary({ overall }: { overall: Overall }) {
  const band = scoreBand(overall.score);
  return (
    <section className="avoid-break mt-8">
      <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500">
        Executive Summary
      </h2>
      <div className="mt-3 grid grid-cols-1 gap-4 rounded-xl border border-slate-300 p-5 sm:grid-cols-3">
        <div>
          <p className="text-[10px] font-semibold uppercase text-slate-500">Overall score</p>
          <p className="mt-1 text-4xl font-bold text-slate-900">
            {overall.entered > 0 ? overall.score : '—'}
            <span className="ml-1 text-sm font-normal text-slate-400">/ 100</span>
          </p>
          <p className="mt-1 text-xs font-semibold text-slate-700">
            {overall.entered > 0 ? band.label : 'No data'}
          </p>
        </div>
        <div>
          <p className="text-[10px] font-semibold uppercase text-slate-500">
            Ecological footprint
          </p>
          <p className="mt-1 text-4xl font-bold text-slate-900">
            {overall.entered > 0 ? overall.ef : '—'}
            <span className="ml-1 text-sm font-normal text-slate-400">gHa/capita</span>
          </p>
          <p className="mt-1 text-xs text-slate-600">Global target: 2.5 gHa/capita</p>
        </div>
        <div>
          <p className="text-[10px] font-semibold uppercase text-slate-500">Indicators</p>
          <p className="mt-1 text-4xl font-bold text-slate-900">
            {overall.entered}
            <span className="ml-1 text-sm font-normal text-slate-400">/ {overall.total}</span>
          </p>
          <p className="mt-1 text-xs text-slate-600">
            {Math.round(overall.total === 0 ? 0 : (overall.entered / overall.total) * 100)}%
            data coverage
          </p>
        </div>
      </div>
    </section>
  );
}

/** Sustainability set table (4 sets). */
export function SetTable({
  setScores,
}: {
  setScores: SetScores;
}) {
  return (
    <section className="avoid-break mt-6">
      <table className="w-full border-collapse text-xs">
        <thead>
          <tr className="border-y border-slate-300 bg-slate-50 text-slate-700">
            <th className="px-3 py-2 text-left font-semibold">Sustainability set</th>
            <th className="px-3 py-2 text-right font-semibold">Score</th>
            <th className="px-3 py-2 text-right font-semibold">Band</th>
            <th className="px-3 py-2 text-right font-semibold">Indicators</th>
          </tr>
        </thead>
        <tbody>
          {SET_ORDER.map((sc) => {
            const s = setScores[sc];
            const b = scoreBand(s.score);
            return (
              <tr key={sc} className="border-b border-slate-200">
                <td className="px-3 py-2 font-medium">
                  <span className="mr-2 rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold text-slate-700">
                    {sc}
                  </span>
                  {SET_FULL[sc]}
                </td>
                <td className="px-3 py-2 text-right font-semibold">
                  {s.entered > 0 ? s.score : '—'}
                </td>
                <td className="px-3 py-2 text-right text-slate-700">
                  {s.entered > 0 ? b.label : '—'}
                </td>
                <td className="px-3 py-2 text-right text-slate-500">
                  {s.entered} / {s.total}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </section>
  );
}

/** Two-card charts row: gauge + radar. */
export function GaugeAndRadar({
  overall,
  setScores,
}: {
  overall: Overall;
  setScores: SetScores;
}) {
  const band = scoreBand(overall.score);
  return (
    <section className="page-break mt-8">
      <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500">
        Visual Overview
      </h2>
      <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="avoid-break rounded-xl border border-slate-300 p-4">
          <h3 className="text-xs font-bold text-slate-800">Overall score</h3>
          <p className="mt-0.5 text-[10px] text-slate-500">
            Aggregate of the four sustainability sets.
          </p>
          <div className="mt-3 flex justify-center">
            <ScoreGauge score={overall.score} label={band.label} size={220} />
          </div>
        </div>
        <div className="avoid-break rounded-xl border border-slate-300 p-4">
          <h3 className="text-xs font-bold text-slate-800">Sustainability sets</h3>
          <p className="mt-0.5 text-[10px] text-slate-500">
            The four sets on a 0–100 comparative scale.
          </p>
          <div className="mt-3 flex justify-center">
            <SetRadar
              scores={{
                ES: setScores.ES.score,
                SS: setScores.SS.score,
                MS: setScores.MS.score,
                ECS: setScores.ECS.score,
              }}
              size={280}
            />
          </div>
        </div>
      </div>
    </section>
  );
}

/** Bar chart of every category with legend. */
export function CategoryBarSection({
  catScores,
  title = 'All categories — score breakdown',
}: {
  catScores: CategoryScoreList;
  title?: string;
}) {
  return (
    <section className="page-break mt-8">
      <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500">{title}</h2>
      <div className="mt-3 rounded-xl border border-slate-300 p-4">
        <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
          <p className="text-[11px] text-slate-600">
            Horizontal bars show the 0–100 score for each of the 24 categories, colored by
            their set.
          </p>
          <ChartLegend />
        </div>
        <CategoryBars
          categories={catScores.map((c) => ({
            code: c.code,
            name: c.name,
            setCode: c.setCode,
            score: c.entered > 0 ? c.score : 0,
          }))}
        />
      </div>
    </section>
  );
}

/** Top N + Weakest N categories (side by side). */
export function TopAndWeakCategories({
  catScores,
  n = 5,
}: {
  catScores: CategoryScoreList;
  n?: number;
}) {
  const scored = catScores.filter((c) => c.entered > 0);
  const top = [...scored].sort((a, b) => b.score - a.score).slice(0, n);
  const weak = [...scored].sort((a, b) => a.score - b.score).slice(0, n);
  return (
    <section className="avoid-break mt-8">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <RankList
          title={`Top ${n} categories`}
          items={top}
          highlight="emerald"
        />
        <RankList
          title={`Weakest ${n} categories`}
          items={weak}
          highlight="red"
        />
      </div>
    </section>
  );
}

function RankList({
  title,
  items,
  highlight,
}: {
  title: string;
  items: { code: string; name: string; setCode: SetCode; score: number }[];
  highlight: 'emerald' | 'red';
}) {
  const color = highlight === 'emerald' ? '#059669' : '#dc2626';
  return (
    <div className="avoid-break rounded-xl border border-slate-300 p-4">
      <h3 className="text-xs font-bold text-slate-800">{title}</h3>
      <ul className="mt-3 space-y-1.5">
        {items.map((c, i) => (
          <li
            key={c.code}
            className="flex items-center gap-2 rounded-lg border border-slate-100 px-2 py-1.5 text-[11px]"
          >
            <span className="text-[9px] font-bold text-slate-400 w-4">{i + 1}</span>
            <span
              className="rounded px-1 py-0.5 text-[9px] font-bold text-white"
              style={{ backgroundColor: SET_COLOR[c.setCode] }}
            >
              {c.code}
            </span>
            <span className="flex-1 truncate text-slate-800">{c.name}</span>
            <span className="font-bold" style={{ color }}>
              {c.score}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Per-set data quality (coverage) assessment. */
export function DataQualitySection({ setScores }: { setScores: SetScores }) {
  return (
    <section className="avoid-break mt-8">
      <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500">
        Data Quality Assessment
      </h2>
      <p className="mt-2 text-xs text-slate-600">
        Coverage per set — the fraction of required indicators that have been entered.
      </p>
      <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
        {SET_ORDER.map((sc) => {
          const s = setScores[sc];
          const pct = s.total === 0 ? 0 : Math.round((s.entered / s.total) * 100);
          return (
            <div key={sc} className="rounded-lg border border-slate-300 p-3">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-700">
                  {sc} · {SET_FULL[sc]}
                </span>
                <span className="font-bold text-slate-900">{pct}%</span>
              </div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full"
                  style={{ width: `${pct}%`, background: SET_COLOR[sc] }}
                />
              </div>
              <p className="mt-1 text-[10px] text-slate-500">
                {s.entered} of {s.total} required indicators entered
              </p>
            </div>
          );
        })}
      </div>
    </section>
  );
}

/** Full per-set deep dive: category tables with all indicator values. */
export function PerSetDeepDive({
  catScores,
  entries,
}: {
  catScores: CategoryScoreList;
  entries: Record<string, IndicatorEntry>;
}) {
  return (
    <>
      {SET_ORDER.map((sc, i) => {
        const cats = catScores.filter((c) => c.setCode === sc);
        return (
          <section key={sc} className={i === 0 ? 'mt-8' : 'page-break mt-8'}>
            <div className="mb-3 flex items-baseline gap-2 border-b border-slate-300 pb-2">
              <span className="rounded bg-slate-900 px-2 py-1 text-[10px] font-bold text-white">
                {sc}
              </span>
              <h2 className="text-lg font-bold text-slate-900">{SET_FULL[sc]}</h2>
            </div>
            {cats.map((cat) => {
              const category = INDICATORS.categories[cat.code];
              return (
                <div key={cat.code} className="avoid-break mb-5">
                  <h3 className="mb-1.5 text-sm font-bold text-slate-900">
                    <span className="mr-2 rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold text-slate-700">
                      {cat.code}
                    </span>
                    {cat.name}
                    <span className="ml-2 text-xs font-normal text-slate-500">
                      · Score {cat.entered > 0 ? cat.score : '—'} · {cat.entered}/{cat.total}{' '}
                      entered
                    </span>
                  </h3>
                  <table className="w-full border-collapse text-[10px]">
                    <thead>
                      <tr className="bg-slate-50 text-slate-700">
                        <th className="border border-slate-300 px-2 py-1 text-left font-semibold">
                          Code
                        </th>
                        <th className="border border-slate-300 px-2 py-1 text-left font-semibold">
                          Indicator
                        </th>
                        <th className="border border-slate-300 px-2 py-1 text-left font-semibold">
                          Unit
                        </th>
                        <th className="border border-slate-300 px-2 py-1 text-left font-semibold">
                          Raw value
                        </th>
                        <th className="border border-slate-300 px-2 py-1 text-right font-semibold">
                          Score
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {category.indicators.map((ind) => {
                        const e = entries[ind.code];
                        return (
                          <tr key={ind.code}>
                            <td className="border border-slate-200 px-2 py-1 font-mono font-semibold text-slate-700">
                              {ind.code}
                              {ind.optional && (
                                <span className="ml-1 rounded bg-purple-100 px-1 text-[8px] font-bold text-purple-700">
                                  OPT
                                </span>
                              )}
                            </td>
                            <td className="border border-slate-200 px-2 py-1">{ind.name}</td>
                            <td className="border border-slate-200 px-2 py-1 text-slate-600">
                              {ind.unit}
                            </td>
                            <td className="border border-slate-200 px-2 py-1">
                              {e?.rawValue || <span className="text-slate-300">—</span>}
                            </td>
                            <td className="border border-slate-200 px-2 py-1 text-right font-semibold">
                              {e?.rawValue ? e.score : '—'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              );
            })}
          </section>
        );
      })}
    </>
  );
}

/** Target vs current — 2 bars per set (current vs 100 target). */
export function TargetVsCurrent({
  setScores,
}: {
  setScores: SetScores;
}) {
  return (
    <section className="avoid-break mt-8">
      <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500">
        Target vs Current — 2030 Aspiration
      </h2>
      <p className="mt-2 text-xs text-slate-600">
        The dashed marker indicates the 100/100 target for each set. Distance to target = 100
        − current score.
      </p>
      <div className="mt-3 space-y-3">
        {SET_ORDER.map((sc) => {
          const s = setScores[sc];
          const gap = 100 - s.score;
          return (
            <div key={sc} className="rounded-lg border border-slate-300 p-3">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-800">
                  {sc} · {SET_FULL[sc]}
                </span>
                <span className="text-[10px] text-slate-500">
                  Gap to target: <span className="font-bold text-slate-800">{gap}</span>
                </span>
              </div>
              <div className="relative mt-2 h-4 rounded bg-slate-100">
                <div
                  className="absolute inset-y-0 left-0 rounded"
                  style={{ width: `${s.score}%`, background: SET_COLOR[sc] }}
                />
                <div
                  className="absolute inset-y-0 border-r-2 border-dashed border-slate-500"
                  style={{ left: '100%' }}
                />
                <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-slate-900 mix-blend-difference">
                  {s.score} / 100
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

/** Roadmap 2025-2030 timeline placeholder — one row per set showing target milestones. */
export function RoadmapSection({ setScores }: { setScores: SetScores }) {
  const years = [2025, 2026, 2027, 2028, 2029, 2030];
  return (
    <section className="page-break mt-8">
      <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500">
        2025–2030 Roadmap
      </h2>
      <p className="mt-2 text-xs text-slate-600">
        Trajectory from the current score to the 100/100 target across the six-year reporting
        window. Values are interpolated linearly as an ambition guide — the actual pace is set
        by year-on-year data submissions.
      </p>
      <div className="mt-3 overflow-hidden rounded-xl border border-slate-300">
        <table className="w-full border-collapse text-[11px]">
          <thead>
            <tr className="bg-slate-50 text-slate-700">
              <th className="border-b border-slate-300 px-3 py-2 text-left font-semibold">
                Set
              </th>
              {years.map((y) => (
                <th
                  key={y}
                  className="border-b border-slate-300 px-2 py-2 text-center font-semibold"
                >
                  {y}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {SET_ORDER.map((sc) => {
              const start = setScores[sc].score;
              const step = (100 - start) / (years.length - 1);
              return (
                <tr key={sc} className="border-b border-slate-100">
                  <td className="border-r border-slate-100 px-3 py-2 font-semibold text-slate-800">
                    <span className="mr-1 rounded bg-slate-100 px-1 py-0.5 text-[9px] font-bold text-slate-700">
                      {sc}
                    </span>
                    {SET_FULL[sc]}
                  </td>
                  {years.map((_, i) => {
                    const v = Math.round(start + step * i);
                    return (
                      <td
                        key={i}
                        className="border-r border-slate-100 px-2 py-2 text-center"
                      >
                        <span
                          className="inline-flex h-6 w-10 items-center justify-center rounded text-[10px] font-bold text-white"
                          style={{ background: SET_COLOR[sc], opacity: 0.4 + (i / 5) * 0.6 }}
                        >
                          {v}
                        </span>
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

/** Small formula/methodology footer for footprint report. */
export function FootprintMethodologyNote() {
  return (
    <section className="avoid-break mt-8 rounded-xl border border-slate-300 bg-slate-50 p-4">
      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
        How the ecological footprint is derived
      </h3>
      <p className="mt-2 text-[11px] leading-relaxed text-slate-700">
        The ecological footprint is computed from the overall SCALD score using a linear
        mapping. A perfect 100/100 maps to the global sustainability target of 2.5 gHa per
        capita; a 0/100 maps to a stressed-city baseline of 8.0 gHa. The overall score is the
        equal-weighted mean of the four sustainability sets, so the ecological footprint
        reflects all 152 SCALD indicators, not only the environmental ones.
      </p>
      <p className="mt-2 rounded bg-white px-3 py-2 font-mono text-[11px] text-slate-800">
        EF = 8.0 − (overall_score / 100) × 5.5
      </p>
    </section>
  );
}
