'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { useDataEntry } from '@/stores/data-entry';
import {
  computeCategoryScores,
  computeSetScores,
  scoreBand,
  SET_THEME,
} from '@/lib/scores';
import { INDICATORS } from '@/lib/scald-indicators';
import {
  Leaf,
  Trees,
  ArrowRight,
  CheckCircle2,
  ClipboardList,
  Info,
  Filter,
} from 'lucide-react';
import { clsx } from 'clsx';

const EsRadar = dynamic(() => import('./EsRadar').then((m) => m.EsRadar), { ssr: false });
const EsBarChart = dynamic(() => import('./EsBarChart').then((m) => m.EsBarChart), { ssr: false });

export function EfctView() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const entries = useDataEntry((s) => s.entries);
  const catScores = useMemo(() => computeCategoryScores(entries), [entries]);
  const setScores = useMemo(() => computeSetScores(entries), [entries]);
  const esCats = useMemo(() => catScores.filter((c) => c.setCode === 'ES'), [catScores]);
  const esScore = setScores.ES;

  const totalIndicators = esCats.reduce((s, c) => s + c.total, 0);
  const enteredIndicators = esCats.reduce((s, c) => s + c.entered, 0);

  const [filter, setFilter] = useState<string>('all');
  const theme = SET_THEME.ES;

  if (!mounted) {
    return (
      <div className="p-4 lg:p-6">
        <div className="h-40 rounded-xl bg-slate-100 animate-pulse" />
      </div>
    );
  }

  if (enteredIndicators === 0) {
    return (
      <div className="p-6">
        <div className="mx-auto max-w-xl rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50 via-white to-teal-50 p-8 text-center shadow-sm">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-lg">
            <Leaf className="h-7 w-7" />
          </div>
          <h2 className="mt-5 text-xl font-bold text-slate-900">No environmental data yet</h2>
          <p className="mx-auto mt-2 max-w-sm text-sm text-slate-500">
            Enter data for the 10 Environmental Sustainability categories to see your ecological footprint breakdown.
          </p>
          <Link
            href="/data-entry"
            className="mt-5 inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700"
          >
            <ClipboardList className="h-4 w-4" /> Enter Data
          </Link>
        </div>
      </div>
    );
  }

  const efValue = +(8.0 - (esScore.score / 100) * 5.5).toFixed(2);
  const band = scoreBand(esScore.score);

  // Filter indicators
  const filteredCats =
    filter === 'all' ? esCats : esCats.filter((c) => c.code === filter);

  const allEsIndicators = filteredCats.flatMap((c) =>
    INDICATORS.categories[c.code].indicators.map((ind) => ({
      ind,
      catCode: c.code,
      catName: c.name,
      entry: entries[ind.code],
    })),
  );

  return (
    <div className="p-4 lg:p-6 space-y-5 lg:space-y-6">
      {/* Hero */}
      <section className="overflow-hidden rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50 via-white to-teal-50 shadow-sm">
        <div className="grid grid-cols-1 gap-4 p-5 lg:grid-cols-4 lg:gap-6 lg:p-6">
          <div className="lg:col-span-1">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
              <Leaf className="h-3.5 w-3.5 text-emerald-500" /> ES Score
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-5xl font-bold text-slate-900 lg:text-6xl">
                {esScore.score}
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
          </div>

          <div className="border-t border-slate-200/70 pt-4 lg:col-span-1 lg:border-t-0 lg:border-l lg:pl-6 lg:pt-0">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
              <Trees className="h-3.5 w-3.5 text-emerald-500" /> Ecological Footprint
            </div>
            <p className="mt-2 text-4xl font-bold text-slate-900 lg:text-5xl">
              {efValue}
              <span className="text-lg text-slate-400"> gHa</span>
            </p>
            <p className="mt-1 text-xs text-slate-500">Per capita · Target 2.5</p>
          </div>

          <div className="border-t border-slate-200/70 pt-4 lg:col-span-1 lg:border-t-0 lg:border-l lg:pl-6 lg:pt-0">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
              <ClipboardList className="h-3.5 w-3.5 text-emerald-500" /> Data Coverage
            </div>
            <p className="mt-2 text-4xl font-bold text-slate-900 lg:text-5xl">
              {Math.round((enteredIndicators / totalIndicators) * 100)}%
            </p>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-200">
              <div
                className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-emerald-600"
                style={{ width: `${(enteredIndicators / totalIndicators) * 100}%` }}
              />
            </div>
            <p className="mt-1.5 text-xs text-slate-500">
              {enteredIndicators} / {totalIndicators} indicators
            </p>
          </div>

          <div className="border-t border-slate-200/70 pt-4 lg:col-span-1 lg:border-t-0 lg:border-l lg:pl-6 lg:pt-0">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /> Completed
            </div>
            <p className="mt-2 text-4xl font-bold text-slate-900 lg:text-5xl">
              {esCats.filter((c) => c.complete).length}
              <span className="text-lg font-normal text-slate-400"> / 10</span>
            </p>
            <p className="mt-1 text-xs text-slate-500">Categories fully entered</p>
          </div>
        </div>
      </section>

      {/* Charts row */}
      <section className="grid grid-cols-1 gap-4 lg:grid-cols-5">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm lg:col-span-2">
          <div className="mb-2">
            <h2 className="text-sm font-semibold text-slate-900">Category Radar</h2>
            <p className="text-[11px] text-slate-500">10 ES categories · 0–100 scale</p>
          </div>
          <EsRadar cats={esCats} />
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm lg:col-span-3">
          <div className="mb-2">
            <h2 className="text-sm font-semibold text-slate-900">Category Performance</h2>
            <p className="text-[11px] text-slate-500">Score per category</p>
          </div>
          <EsBarChart cats={esCats} />
        </div>
      </section>

      {/* Category grid */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-900">Environmental Categories</h2>
          <span className="text-xs text-slate-500">{esCats.length} categories</span>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {esCats.map((cs) => {
            const b = scoreBand(cs.score);
            return (
              <Link
                key={cs.code}
                href={`/data-entry/${cs.code}`}
                className="group block rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
              >
                <div className="flex items-center justify-between">
                  <span className={clsx('rounded px-1.5 py-0.5 text-[10px] font-bold', theme.chip)}>
                    {cs.code}
                  </span>
                  {cs.complete && <CheckCircle2 className="h-4 w-4 text-emerald-500" />}
                </div>
                <h3 className="mt-2 text-sm font-semibold text-slate-900 leading-tight">
                  {cs.name}
                </h3>
                <div className="mt-3 flex items-baseline justify-between">
                  <span className="text-2xl font-bold text-slate-900">
                    {cs.entered > 0 ? cs.score : '—'}
                  </span>
                  <span className="text-[10px] text-slate-400">
                    {cs.entered}/{cs.total}
                  </span>
                </div>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className={clsx('h-full rounded-full', cs.entered > 0 ? b.chipColor : 'bg-slate-200')}
                    style={{ width: `${cs.score}%` }}
                  />
                </div>
                <p className="mt-2 text-[10px] font-medium" style={{ color: 'inherit' }}>
                  <span className={cs.entered > 0 ? b.color : 'text-slate-400'}>
                    {cs.entered > 0 ? b.label : 'No data yet'}
                  </span>
                </p>
              </Link>
            );
          })}
        </div>
      </section>

      {/* Indicator table */}
      <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3 lg:px-5">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">Indicator Details</h2>
            <p className="text-[11px] text-slate-500">
              {allEsIndicators.length} rows · sortable & filterable
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Filter className="hidden h-3.5 w-3.5 text-slate-400 sm:block" />
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs text-slate-700 outline-none focus:ring-2 focus:ring-emerald-500/20"
            >
              <option value="all">All categories</option>
              {esCats.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.code} — {c.name}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="text-slate-500">
              <tr className="border-b border-slate-100">
                <th className="px-4 py-2 text-left font-medium">Code</th>
                <th className="px-4 py-2 text-left font-medium">Indicator</th>
                <th className="hidden px-4 py-2 text-left font-medium sm:table-cell">Unit</th>
                <th className="hidden px-4 py-2 text-left font-medium lg:table-cell">Raw value</th>
                <th className="px-4 py-2 text-right font-medium">Score</th>
              </tr>
            </thead>
            <tbody>
              {allEsIndicators.map(({ ind, catCode, catName, entry }) => (
                <tr
                  key={ind.code}
                  className="border-b border-slate-50 last:border-b-0 hover:bg-slate-50"
                >
                  <td className="px-4 py-2.5">
                    <span className={clsx('rounded px-1.5 py-0.5 text-[10px] font-bold', theme.chip)}>
                      {ind.code}
                    </span>
                  </td>
                  <td className="px-4 py-2.5">
                    <p className="font-medium text-slate-800">{ind.name}</p>
                    <p className="text-[10px] text-slate-400">{catName}</p>
                  </td>
                  <td className="hidden px-4 py-2.5 text-slate-500 sm:table-cell">{ind.unit}</td>
                  <td className="hidden px-4 py-2.5 text-slate-600 lg:table-cell">
                    {entry?.rawValue || <span className="text-slate-300">—</span>}
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    {entry ? (
                      <span
                        className={clsx(
                          'inline-block rounded-lg px-2 py-0.5 text-xs font-bold text-white',
                          entry.score >= 4
                            ? 'bg-emerald-500'
                            : entry.score >= 2
                            ? 'bg-amber-500'
                            : 'bg-red-500',
                        )}
                      >
                        {entry.score}
                      </span>
                    ) : (
                      <Link
                        href={`/data-entry/${catCode}`}
                        className="text-[10px] font-medium text-blue-600 hover:text-blue-800"
                      >
                        Enter →
                      </Link>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Info card */}
      <div className="flex items-start gap-3 rounded-xl border border-slate-100 bg-slate-50 p-4">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
        <div className="text-xs text-slate-600 leading-relaxed">
          <p>
            The <strong>Ecological Footprint</strong> score is computed from your 10 Environmental
            Sustainability categories (Green Infrastructure, Energy, Climate, Land Use, Water,
            Waste, Disaster, Population, Smart Infrastructure and the EF category itself). Higher
            score = smaller footprint. Global target is 2.5 gHa per capita.
          </p>
          <Link
            href="/data-entry"
            className="mt-2 inline-flex items-center gap-1 font-semibold text-emerald-700 hover:text-emerald-800"
          >
            Improve your score in Data Entry <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      </div>
    </div>
  );
}
