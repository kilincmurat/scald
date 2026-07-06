'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useDataEntry } from '@/stores/data-entry';
import { useEffectiveWeights } from '@/stores/weights';
import {
  computeCategoryScores,
  computeSetScores,
  computeOverallScore,
  SET_THEME,
} from '@/lib/scores';
import { INDICATORS, TOTAL_INDICATORS, type SetCode } from '@/lib/scald-indicators';
import {
  FileText,
  Download,
  Eye,
  Sparkles,
  Lock,
  ClipboardList,
  X,
  ArrowRight,
  CheckCircle2,
  Loader2,
  FileBarChart2,
  FileSearch,
  CalendarDays,
  Leaf,
} from 'lucide-react';
import { clsx } from 'clsx';

type Template = {
  id: string;
  title: string;
  description: string;
  minCoveragePct: number;
  pages: string;
  format: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  includes: string[]; // human labels
};

const TEMPLATES: Template[] = [
  {
    id: 'quarterly',
    title: 'Quarterly Progress Report',
    description:
      'Quick snapshot of current sustainability posture — set-level scores, top weak categories and 90-day recommendations.',
    minCoveragePct: 25,
    pages: '10–14',
    format: 'PDF',
    icon: CalendarDays,
    color: 'text-blue-600 bg-blue-50',
    includes: ['Set scores', 'Top 5 categories', 'Data quality assessment'],
  },
  {
    id: 'annual',
    title: 'Annual Ecological Performance Report',
    description:
      'Comprehensive annual review across all 24 categories, radar charts, target vs. current analysis and trend narrative.',
    minCoveragePct: 60,
    pages: '24–32',
    format: 'PDF / DOCX',
    icon: FileBarChart2,
    color: 'text-emerald-600 bg-emerald-50',
    includes: ['All 24 categories', 'Ecological footprint (gHa)', 'Weak/strong analysis'],
  },
  {
    id: 'strategic',
    title: 'Strategic Climate Adaptation Plan',
    description:
      'Long-form strategic plan document with prioritised strategies, cost/timeframe analysis and 2030 targets.',
    minCoveragePct: 90,
    pages: '48–60',
    format: 'PDF / DOCX / PPTX',
    icon: FileSearch,
    color: 'text-purple-600 bg-purple-50',
    includes: ['Full strategy list', 'Set breakdowns', 'Roadmap 2025–2030'],
  },
  {
    id: 'climate',
    title: 'Ecological Footprint Summary',
    description:
      'Focused report on Environmental Sustainability with 74 ES indicators, footprint estimate and improvement pathways.',
    minCoveragePct: 40,
    pages: '16–22',
    format: 'PDF',
    icon: Leaf,
    color: 'text-teal-600 bg-teal-50',
    includes: ['10 ES categories', 'gHa/capita', 'Category radar'],
  },
];

type ReportItem = {
  id: string;
  templateId: string;
  title: string;
  date: string;
  size: string;
  format: string;
  status: 'ready' | 'draft';
};

export function ReportingView() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const entries = useDataEntry((s) => s.entries);
  const weights = useEffectiveWeights();
  const overall = useMemo(() => computeOverallScore(entries, weights), [entries, weights]);
  const catScores = useMemo(() => computeCategoryScores(entries, weights), [entries, weights]);
  const setScores = useMemo(() => computeSetScores(entries, weights), [entries, weights]);

  const coveragePct = overall.total > 0 ? Math.round((overall.entered / overall.total) * 100) : 0;

  const [preview, setPreview] = useState<Template | null>(null);
  const [generating, setGenerating] = useState<string | null>(null);
  const [generated, setGenerated] = useState<ReportItem[]>([]);

  const handleGenerate = (tpl: Template) => {
    setGenerating(tpl.id);
    setTimeout(() => {
      const now = new Date();
      const dd = now.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
      setGenerated((prev) => [
        {
          id: `${tpl.id}-${now.getTime()}`,
          templateId: tpl.id,
          title: `${tpl.title} — ${now.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })}`,
          date: dd,
          size: `${(1.2 + Math.random() * 6).toFixed(1)} MB`,
          format: tpl.format.split(' / ')[0],
          status: 'ready',
        },
        ...prev,
      ]);
      setGenerating(null);
    }, 2200);
  };

  if (!mounted) {
    return (
      <div className="p-4 lg:p-6">
        <div className="h-40 rounded-xl bg-slate-100 animate-pulse" />
      </div>
    );
  }

  if (overall.entered === 0) {
    return (
      <div className="p-6">
        <div className="mx-auto max-w-xl rounded-2xl border border-purple-200 bg-gradient-to-br from-purple-50 via-white to-fuchsia-50 p-8 text-center shadow-sm">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-500 to-fuchsia-600 text-white shadow-lg">
            <FileText className="h-7 w-7" />
          </div>
          <h2 className="mt-5 text-xl font-bold text-slate-900">No reports available yet</h2>
          <p className="mx-auto mt-2 max-w-sm text-sm text-slate-500">
            Reports are generated from your indicator scores. Enter data to unlock report templates.
          </p>
          <Link
            href="/data-entry"
            className="mt-5 inline-flex items-center gap-2 rounded-lg bg-purple-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-purple-700"
          >
            <ClipboardList className="h-4 w-4" /> Enter Data
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-6 space-y-5 lg:space-y-6">
      {/* Coverage stat */}
      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
        <StatCard
          icon={<ClipboardList className="h-3.5 w-3.5 text-blue-500" />}
          label="Data Coverage"
          value={`${coveragePct}%`}
          sub={`${overall.entered} / ${overall.total} indicators`}
        />
        <StatCard
          icon={<Sparkles className="h-3.5 w-3.5 text-emerald-500" />}
          label="Overall Score"
          value={overall.score}
          sub="0–100 scale"
        />
        <StatCard
          icon={<Leaf className="h-3.5 w-3.5 text-emerald-600" />}
          label="Ecological Footprint"
          value={`${overall.ef}`}
          sub="gHa/capita"
        />
        <StatCard
          icon={<FileText className="h-3.5 w-3.5 text-purple-500" />}
          label="Reports Generated"
          value={generated.length}
          sub="This session"
        />
      </section>

      {/* Templates */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-900">Report Templates</h2>
          <span className="text-xs text-slate-500">
            {TEMPLATES.filter((t) => coveragePct >= t.minCoveragePct).length} / {TEMPLATES.length} unlocked
          </span>
        </div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {TEMPLATES.map((tpl) => (
            <TemplateCard
              key={tpl.id}
              tpl={tpl}
              coveragePct={coveragePct}
              onPreview={() => setPreview(tpl)}
              onGenerate={() => handleGenerate(tpl)}
              isGenerating={generating === tpl.id}
              disabledByOther={generating !== null && generating !== tpl.id}
            />
          ))}
        </div>
      </section>

      {/* Generated reports */}
      {generated.length > 0 && (
        <section>
          <h2 className="mb-3 text-sm font-semibold text-slate-900">Recently Generated</h2>
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <ul className="divide-y divide-slate-100">
              {generated.map((r) => (
                <li
                  key={r.id}
                  className="flex items-center gap-3 px-4 py-3 transition hover:bg-slate-50"
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100">
                    <FileText className="h-4 w-4 text-slate-500" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-medium text-slate-800">{r.title}</p>
                    <p className="mt-0.5 text-[10px] text-slate-400">
                      {r.date} · {r.size} · {r.format}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="hidden rounded-full bg-emerald-100 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700 sm:inline">
                      Ready
                    </span>
                    <button
                      className="rounded p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                      title="Download"
                    >
                      <Download className="h-4 w-4" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      {/* Preview modal */}
      {preview && (
        <PreviewModal
          tpl={preview}
          onClose={() => setPreview(null)}
          setScores={setScores}
          catScores={catScores}
          overall={overall}
        />
      )}
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  sub,
}: {
  icon: React.ReactNode;
  label: string;
  value: number | string;
  sub: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
        {icon} {label}
      </div>
      <p className="mt-2 text-3xl font-bold text-slate-900 lg:text-4xl">{value}</p>
      <p className="mt-1 text-[11px] text-slate-400">{sub}</p>
    </div>
  );
}

function TemplateCard({
  tpl,
  coveragePct,
  onPreview,
  onGenerate,
  isGenerating,
  disabledByOther,
}: {
  tpl: Template;
  coveragePct: number;
  onPreview: () => void;
  onGenerate: () => void;
  isGenerating: boolean;
  disabledByOther: boolean;
}) {
  const unlocked = coveragePct >= tpl.minCoveragePct;
  const Icon = tpl.icon;

  return (
    <div
      className={clsx(
        'rounded-xl border bg-white p-4 shadow-sm transition lg:p-5',
        unlocked ? 'border-slate-200 hover:shadow-md' : 'border-slate-200 opacity-80',
      )}
    >
      <div className="flex items-start gap-3">
        <div className={clsx('flex h-11 w-11 shrink-0 items-center justify-center rounded-xl', tpl.color)}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-slate-900 lg:text-base">{tpl.title}</h3>
            {!unlocked && <Lock className="h-3.5 w-3.5 shrink-0 text-slate-400" />}
          </div>
          <p className="mt-1 text-xs text-slate-600 leading-relaxed lg:text-[13px]">
            {tpl.description}
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-[10px] text-slate-400">
            <span>{tpl.pages} pages</span>
            <span>·</span>
            <span>{tpl.format}</span>
            <span>·</span>
            <span
              className={clsx(
                'inline-flex items-center gap-1',
                unlocked ? 'text-emerald-600' : 'text-red-600',
              )}
            >
              {unlocked ? (
                <CheckCircle2 className="h-3 w-3" />
              ) : (
                <Lock className="h-3 w-3" />
              )}
              {tpl.minCoveragePct}% coverage required
            </span>
          </div>

          {!unlocked && (
            <div className="mt-3">
              <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-slate-400"
                  style={{ width: `${(coveragePct / tpl.minCoveragePct) * 100}%` }}
                />
              </div>
              <p className="mt-1 text-[10px] text-slate-400">
                {coveragePct}% / {tpl.minCoveragePct}% — {tpl.minCoveragePct - coveragePct}% more to unlock
              </p>
            </div>
          )}

          {/* Includes */}
          <div className="mt-3 flex flex-wrap gap-1">
            {tpl.includes.map((inc) => (
              <span
                key={inc}
                className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] text-slate-600"
              >
                {inc}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-4 flex items-center gap-2 border-t border-slate-100 pt-3">
        <button
          onClick={onGenerate}
          disabled={!unlocked || isGenerating || disabledByOther}
          className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white transition hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {isGenerating ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Generating…
            </>
          ) : (
            <>
              <Sparkles className="h-3.5 w-3.5" />
              Generate
            </>
          )}
        </button>
        <button
          onClick={onPreview}
          disabled={!unlocked}
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-slate-600 transition hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Eye className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Preview</span>
        </button>
      </div>
    </div>
  );
}

function PreviewModal({
  tpl,
  onClose,
  setScores,
  catScores,
  overall,
}: {
  tpl: Template;
  onClose: () => void;
  setScores: Record<SetCode, { score: number; entered: number; total: number }>;
  catScores: ReturnType<typeof computeCategoryScores>;
  overall: ReturnType<typeof computeOverallScore>;
}) {
  const setCodes: SetCode[] = ['ES', 'SS', 'MS', 'ECS'];
  const topCats = [...catScores]
    .filter((c) => c.entered > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);
  const weakCats = [...catScores]
    .filter((c) => c.entered > 0)
    .sort((a, b) => a.score - b.score)
    .slice(0, 5);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 lg:p-6">
      <div className="flex h-[90vh] w-full max-w-3xl flex-col rounded-2xl border border-slate-200 bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-slate-500" />
            <h3 className="text-sm font-semibold text-slate-900">{tpl.title} · Preview</h3>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 lg:p-6">
          {/* Mock report content */}
          <div className="mx-auto max-w-2xl space-y-6">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                SCALD Sustainability Report
              </p>
              <h1 className="mt-1 text-2xl font-bold text-slate-900">{tpl.title}</h1>
              <p className="mt-1 text-xs text-slate-500">
                Generated {new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })}
              </p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                Executive Summary
              </p>
              <p className="mt-2 text-2xl font-bold text-slate-900">
                {overall.score}<span className="text-base text-slate-400">/100</span>
              </p>
              <p className="mt-1 text-xs text-slate-600">
                Ecological footprint: <strong>{overall.ef} gHa/capita</strong> · Data coverage:{' '}
                <strong>{Math.round((overall.entered / overall.total) * 100)}%</strong>
              </p>
            </div>

            <div>
              <h2 className="text-sm font-semibold text-slate-900">1. Sustainability Sets</h2>
              <div className="mt-2 grid grid-cols-2 gap-2">
                {setCodes.map((sc) => (
                  <div key={sc} className="rounded-lg border border-slate-100 p-3">
                    <span
                      className={clsx(
                        'rounded px-1.5 py-0.5 text-[10px] font-bold',
                        SET_THEME[sc].chip,
                      )}
                    >
                      {sc}
                    </span>
                    <p className="mt-2 text-xs font-medium text-slate-700">
                      {SET_THEME[sc].fullName}
                    </p>
                    <p className="text-xl font-bold text-slate-900">{setScores[sc].score}</p>
                  </div>
                ))}
              </div>
            </div>

            {tpl.id !== 'quarterly' && (
              <div>
                <h2 className="text-sm font-semibold text-slate-900">2. Top Performers</h2>
                <ul className="mt-2 space-y-1">
                  {topCats.map((c) => (
                    <li
                      key={c.code}
                      className="flex items-center gap-2 rounded-lg border border-slate-100 px-3 py-1.5 text-xs"
                    >
                      <span className={clsx('rounded px-1 py-0.5 text-[9px] font-bold', SET_THEME[c.setCode].chip)}>
                        {c.code}
                      </span>
                      <span className="flex-1 text-slate-800">{c.name}</span>
                      <span className="font-semibold text-emerald-600">{c.score}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div>
              <h2 className="text-sm font-semibold text-slate-900">
                {tpl.id === 'quarterly' ? '2.' : '3.'} Priority Improvement Areas
              </h2>
              <ul className="mt-2 space-y-1">
                {weakCats.map((c) => (
                  <li
                    key={c.code}
                    className="flex items-center gap-2 rounded-lg border border-red-100 bg-red-50 px-3 py-1.5 text-xs"
                  >
                    <span className={clsx('rounded px-1 py-0.5 text-[9px] font-bold', SET_THEME[c.setCode].chip)}>
                      {c.code}
                    </span>
                    <span className="flex-1 text-slate-800">{c.name}</span>
                    <span className="font-semibold text-red-600">{c.score}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-4">
              <div className="flex items-start gap-2">
                <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                <p className="text-xs leading-relaxed text-emerald-800">
                  This preview shows a subset of the report. The full document includes detailed
                  indicator tables, methodology, benchmarking against EU and national averages, and
                  a 2025–2030 roadmap.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between border-t border-slate-200 px-5 py-3">
          <p className="text-[10px] text-slate-400">Preview only · not the full report</p>
          <button
            onClick={onClose}
            className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-slate-800"
          >
            Close <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
