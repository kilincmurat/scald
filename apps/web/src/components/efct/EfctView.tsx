'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { useDataEntry } from '@/stores/data-entry';
import { useEffectiveWeights } from '@/stores/weights';
import { YearPicker } from '@/components/data-entry/YearPicker';
import {
  computeCategoryScores,
  computeOverallScore,
  computeSetScores,
  scoreBand,
  SET_THEME,
} from '@/lib/scores';
import { INDICATORS, type SetCode } from '@/lib/scald-indicators';
import {
  Leaf,
  Trees,
  ArrowRight,
  CheckCircle2,
  ClipboardList,
  Info,
  Filter,
  FileDown,
} from 'lucide-react';
import { clsx } from 'clsx';

const ReactECharts = dynamic(() => import('echarts-for-react'), { ssr: false });

const SET_COLOR: Record<SetCode, string> = {
  ES: '#059669',
  SS: '#e11d48',
  MS: '#2563eb',
  ECS: '#ea580c',
};
const SET_ORDER: SetCode[] = ['ES', 'SS', 'MS', 'ECS'];

export function EfctView() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const entries = useDataEntry((s) => s.entries);
  const weights = useEffectiveWeights();
  const catScores = useMemo(() => computeCategoryScores(entries, weights), [entries, weights]);
  const setScores = useMemo(() => computeSetScores(entries, weights), [entries, weights]);
  const overall = useMemo(() => computeOverallScore(entries, weights), [entries, weights]);

  const totalIndicators = catScores.reduce((s, c) => s + c.total, 0);
  const enteredIndicators = catScores.reduce((s, c) => s + c.entered, 0);
  const completedCategories = catScores.filter((c) => c.complete).length;

  const [setFilter, setSetFilter] = useState<'all' | SetCode>('all');
  const [catFilter, setCatFilter] = useState<string>('all');

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
          <h2 className="mt-5 text-xl font-bold text-slate-900">No data yet</h2>
          <p className="mx-auto mt-2 max-w-sm text-sm text-slate-500">
            Once the data-entry team fills the 24 categories across all four sustainability sets,
            the ecological footprint breakdown will appear here.
          </p>
          <Link
            href="/data-entry"
            className="mt-5 inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700"
          >
            <ClipboardList className="h-4 w-4" /> Go to data entry
          </Link>
        </div>
      </div>
    );
  }

  const band = scoreBand(overall.score);

  const catsForBar = catScores
    .filter((c) => (setFilter === 'all' ? true : c.setCode === setFilter))
    .filter((c) => c.entered > 0)
    .sort((a, b) => a.score - b.score);

  const catsForList = catScores.filter((c) =>
    setFilter === 'all' ? true : c.setCode === setFilter,
  );

  const indicatorRows =
    (catFilter === 'all' ? catsForList : catsForList.filter((c) => c.code === catFilter)).flatMap(
      (c) =>
        INDICATORS.categories[c.code].indicators.map((ind) => ({
          ind,
          catCode: c.code,
          catName: c.name,
          setCode: c.setCode,
          entry: entries[ind.code],
        })),
    );

  return (
    <div className="p-4 lg:p-6 space-y-5 lg:space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <a
          href="/methodology"
          target="_blank"
          rel="noopener"
          className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
          title="How ecological footprint is calculated — downloadable reference"
        >
          <FileDown className="h-3.5 w-3.5 text-slate-500" />
          Methodology
        </a>
        <YearPicker size="sm" />
      </div>

      {/* Hero */}
      <section className="overflow-hidden rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50 via-white to-teal-50 shadow-sm">
        <div className="grid grid-cols-1 gap-4 p-5 lg:grid-cols-4 lg:gap-6 lg:p-6">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
              <Leaf className="h-3.5 w-3.5 text-emerald-500" /> Overall Score
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
          </div>

          <div className="border-t border-slate-200/70 pt-4 lg:border-t-0 lg:border-l lg:pl-6 lg:pt-0">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
              <Trees className="h-3.5 w-3.5 text-emerald-500" /> Ecological Footprint
            </div>
            <p className="mt-2 text-4xl font-bold text-slate-900 lg:text-5xl">
              {overall.ef}
              <span className="text-lg text-slate-400"> gHa</span>
            </p>
            <p className="mt-1 text-xs text-slate-500">Per capita · Target 2.5</p>
          </div>

          <div className="border-t border-slate-200/70 pt-4 lg:border-t-0 lg:border-l lg:pl-6 lg:pt-0">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
              <ClipboardList className="h-3.5 w-3.5 text-emerald-500" /> Data Coverage
            </div>
            <p className="mt-2 text-4xl font-bold text-slate-900 lg:text-5xl">
              {Math.round((enteredIndicators / Math.max(1, totalIndicators)) * 100)}%
            </p>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-200">
              <div
                className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-emerald-600"
                style={{
                  width: `${(enteredIndicators / Math.max(1, totalIndicators)) * 100}%`,
                }}
              />
            </div>
            <p className="mt-1.5 text-xs text-slate-500">
              {enteredIndicators} / {totalIndicators} indicators
            </p>
          </div>

          <div className="border-t border-slate-200/70 pt-4 lg:border-t-0 lg:border-l lg:pl-6 lg:pt-0">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /> Completed
            </div>
            <p className="mt-2 text-4xl font-bold text-slate-900 lg:text-5xl">
              {completedCategories}
              <span className="text-lg font-normal text-slate-400"> / 24</span>
            </p>
            <p className="mt-1 text-xs text-slate-500">Categories fully entered</p>
          </div>
        </div>
      </section>

      {/* 4 set breakdown */}
      <section>
        <h2 className="mb-3 text-sm font-semibold text-slate-900">Sustainability sets</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {SET_ORDER.map((sc) => {
            const s = setScores[sc];
            const theme = SET_THEME[sc];
            const b = scoreBand(s.score);
            return (
              <div key={sc} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className={clsx('rounded px-1.5 py-0.5 text-[10px] font-bold', theme.chip)}>
                    {sc}
                  </span>
                  <span className="text-[10px] text-slate-500">
                    {s.entered}/{s.total}
                  </span>
                </div>
                <p className="mt-2 text-xs font-medium text-slate-600">{theme.fullName}</p>
                <div className="mt-1 flex items-baseline gap-1">
                  <span className="text-3xl font-bold text-slate-900">
                    {s.entered > 0 ? s.score : '—'}
                  </span>
                  <span className="text-xs text-slate-400">/100</span>
                </div>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${s.score}%`,
                      background: SET_COLOR[sc],
                    }}
                  />
                </div>
                <p className={clsx('mt-2 text-[10px] font-medium', b.color)}>
                  {s.entered > 0 ? b.label : 'No data'}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Charts row */}
      <section className="grid grid-cols-1 gap-4 lg:grid-cols-5">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm lg:col-span-2">
          <div className="mb-2">
            <h2 className="text-sm font-semibold text-slate-900">Set Radar</h2>
            <p className="text-[11px] text-slate-500">4 sustainability sets · 0–100 scale</p>
          </div>
          <SetRadarChart scores={setScores} />
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm lg:col-span-3">
          <div className="mb-2 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold text-slate-900">Category performance</h2>
              <p className="text-[11px] text-slate-500">
                {catsForBar.length} categories · colored by set
              </p>
            </div>
            <select
              value={setFilter}
              onChange={(e) => setSetFilter(e.target.value as 'all' | SetCode)}
              className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs text-slate-700 outline-none focus:ring-2 focus:ring-emerald-500/20"
            >
              <option value="all">All sets</option>
              {SET_ORDER.map((sc) => (
                <option key={sc} value={sc}>
                  {sc} — {SET_THEME[sc].fullName}
                </option>
              ))}
            </select>
          </div>
          <CategoryBarChart categories={catsForBar} />
          <ChartLegend />
        </div>
      </section>

      {/* Category grid */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-900">All categories</h2>
          <span className="text-xs text-slate-500">{catScores.length} categories</span>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {catScores.map((cs) => {
            const b = scoreBand(cs.score);
            const theme = SET_THEME[cs.setCode];
            return (
              <div
                key={cs.code}
                className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
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
                    className="h-full rounded-full"
                    style={{
                      width: `${cs.score}%`,
                      background: SET_COLOR[cs.setCode],
                    }}
                  />
                </div>
                <p
                  className={clsx(
                    'mt-2 text-[10px] font-medium',
                    cs.entered > 0 ? b.color : 'text-slate-400',
                  )}
                >
                  {cs.entered > 0 ? b.label : 'No data yet'}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Indicator table */}
      <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-4 py-3 lg:px-5">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">Indicator details</h2>
            <p className="text-[11px] text-slate-500">
              {indicatorRows.length} rows · filter by set or category
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Filter className="hidden h-3.5 w-3.5 text-slate-400 sm:block" />
            <select
              value={catFilter}
              onChange={(e) => setCatFilter(e.target.value)}
              className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs text-slate-700 outline-none focus:ring-2 focus:ring-emerald-500/20"
            >
              <option value="all">All categories</option>
              {catsForList.map((c) => (
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
                <th className="hidden px-4 py-2 text-left font-medium sm:table-cell">Set</th>
                <th className="hidden px-4 py-2 text-left font-medium sm:table-cell">Unit</th>
                <th className="hidden px-4 py-2 text-left font-medium lg:table-cell">Raw value</th>
                <th className="px-4 py-2 text-right font-medium">Score</th>
              </tr>
            </thead>
            <tbody>
              {indicatorRows.map(({ ind, catName, setCode, entry }) => (
                <tr
                  key={ind.code}
                  className="border-b border-slate-50 last:border-b-0 hover:bg-slate-50"
                >
                  <td className="px-4 py-2.5">
                    <span
                      className={clsx(
                        'rounded px-1.5 py-0.5 text-[10px] font-bold',
                        SET_THEME[setCode].chip,
                      )}
                    >
                      {ind.code}
                    </span>
                  </td>
                  <td className="px-4 py-2.5">
                    <p className="font-medium text-slate-800">{ind.name}</p>
                    <p className="text-[10px] text-slate-400">{catName}</p>
                  </td>
                  <td className="hidden px-4 py-2.5 text-slate-600 sm:table-cell">
                    {setCode}
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
                      <span className="text-[10px] text-slate-300">—</span>
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
            The <strong>Ecological Footprint</strong> combines all four sustainability sets
            (Environmental, Social, Managerial, Economic) — 24 categories in total. A higher
            overall score maps to a smaller footprint. Global target is 2.5 gHa per capita.
          </p>
          <a
            href="/methodology"
            target="_blank"
            rel="noopener"
            className="mt-2 inline-flex items-center gap-1 font-semibold text-emerald-700 hover:text-emerald-800"
          >
            Read the calculation methodology <ArrowRight className="h-3 w-3" />
          </a>
        </div>
      </div>
    </div>
  );
}

function SetRadarChart({
  scores,
}: {
  scores: ReturnType<typeof computeSetScores>;
}) {
  const option = {
    tooltip: { trigger: 'item' },
    radar: {
      indicator: SET_ORDER.map((sc) => ({ name: SET_THEME[sc].fullName, max: 100 })),
      radius: '65%',
      splitNumber: 4,
      axisName: { color: '#334155', fontSize: 10, fontWeight: 600 },
      splitLine: { lineStyle: { color: ['#e2e8f0'] } },
      splitArea: { areaStyle: { color: ['#f8fafc', '#f1f5f9'] } },
      axisLine: { lineStyle: { color: '#cbd5e1' } },
    },
    series: [
      {
        type: 'radar',
        data: [
          {
            value: SET_ORDER.map((sc) => scores[sc].score),
            name: 'Set score',
            areaStyle: { color: 'rgba(16, 185, 129, 0.18)' },
            lineStyle: { color: '#059669', width: 2 },
            itemStyle: { color: '#059669' },
            symbolSize: 5,
          },
        ],
      },
    ],
  };
  return (
    <ReactECharts option={option} style={{ height: 300, width: '100%' }} opts={{ renderer: 'canvas' }} />
  );
}

function CategoryBarChart({
  categories,
}: {
  categories: { code: string; name: string; setCode: SetCode; score: number }[];
}) {
  const option = {
    tooltip: {
      trigger: 'axis',
      formatter: (params: { dataIndex: number }[]) => {
        const i = params[0].dataIndex;
        const c = categories[i];
        return `<b>${c.code} · ${c.name}</b><br/>${SET_THEME[c.setCode].fullName}<br/>Score: ${c.score}`;
      },
    },
    grid: { left: '3%', right: '6%', bottom: '3%', top: '4%', containLabel: true },
    xAxis: {
      type: 'value',
      max: 100,
      axisLabel: { color: '#64748b', fontSize: 10 },
      splitLine: { lineStyle: { color: '#f1f5f9' } },
    },
    yAxis: {
      type: 'category',
      data: categories.map((c) => `${c.code}`),
      axisLabel: { color: '#475569', fontSize: 10 },
      axisLine: { lineStyle: { color: '#e2e8f0' } },
    },
    series: [
      {
        type: 'bar',
        data: categories.map((c) => ({
          value: c.score,
          itemStyle: {
            color: SET_COLOR[c.setCode],
            borderRadius: [0, 4, 4, 0],
          },
        })),
        barMaxWidth: 14,
        label: {
          show: true,
          position: 'right',
          formatter: '{c}',
          fontSize: 9,
          color: '#64748b',
        },
      },
    ],
  };
  return (
    <ReactECharts
      option={option}
      style={{ height: Math.max(240, categories.length * 22), width: '100%' }}
      opts={{ renderer: 'canvas' }}
    />
  );
}

function ChartLegend() {
  return (
    <div className="mt-3 flex flex-wrap items-center gap-3 text-[10px] text-slate-600">
      {SET_ORDER.map((sc) => (
        <span key={sc} className="inline-flex items-center gap-1.5">
          <span
            className="inline-block h-2.5 w-2.5 rounded-sm"
            style={{ backgroundColor: SET_COLOR[sc] }}
          />
          <span className="font-semibold text-slate-800">{sc}</span>
          <span>{SET_THEME[sc].fullName}</span>
        </span>
      ))}
    </div>
  );
}
