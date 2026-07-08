'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useProfile } from '@/hooks/useProfile';
import { useDataEntry, DEFAULT_YEAR, MIN_YEAR, MAX_YEAR } from '@/stores/data-entry';
import { useEffectiveWeights } from '@/stores/weights';
import {
  computeCategoryScores,
  computeOverallScore,
  computeSetScores,
} from '@/lib/scores';
import { Printer, ArrowLeft } from 'lucide-react';
import {
  ReportCover,
  ExecutiveSummary,
  SetTable,
  GaugeAndRadar,
  CategoryBarSection,
  TopAndWeakCategories,
  DataQualitySection,
  PerSetDeepDive,
  TargetVsCurrent,
  RoadmapSection,
  FootprintMethodologyNote,
} from './report-sections';

export type ReportTemplateId =
  | 'quarterly'
  | 'annual'
  | 'strategic'
  | 'footprint';

const TITLES: Record<ReportTemplateId, { title: string; subtitle: string }> = {
  quarterly: {
    title: 'Quarterly Progress Report',
    subtitle:
      'Snapshot of the current sustainability posture — set scores, top/weak categories and coverage quality.',
  },
  annual: {
    title: 'Annual Ecological Performance Report',
    subtitle:
      'Comprehensive annual review across all 24 categories with visual charts and full indicator breakdown.',
  },
  strategic: {
    title: 'Strategic Climate Adaptation Plan',
    subtitle:
      'Long-form strategic document covering full assessment, 2025–2030 roadmap and target-vs-current analysis.',
  },
  footprint: {
    title: 'Ecological Footprint Summary',
    subtitle:
      'Focused report explaining how the ecological footprint value is derived from all four sustainability sets.',
  },
};

function clampYear(n: number): number {
  if (!Number.isFinite(n)) return DEFAULT_YEAR;
  if (n < MIN_YEAR) return MIN_YEAR;
  if (n > MAX_YEAR) return MAX_YEAR;
  return Math.trunc(n);
}

export function ReportPage({ template }: { template: ReportTemplateId }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const params = useSearchParams();
  const yearParam = clampYear(Number(params.get('year') ?? DEFAULT_YEAR));

  const { profile } = useProfile();
  const loadMunicipality = useDataEntry((s) => s.loadMunicipality);
  const currentMunicipalityId = useDataEntry((s) => s.municipalityId);
  const entriesByYear = useDataEntry((s) => s.entriesByYear);

  useEffect(() => {
    if (!mounted) return;
    if (profile?.municipalityId && profile.municipalityId !== currentMunicipalityId) {
      void loadMunicipality(profile.municipalityId);
    }
  }, [mounted, profile?.municipalityId, currentMunicipalityId, loadMunicipality]);

  const entries = useMemo(() => entriesByYear[yearParam] ?? {}, [entriesByYear, yearParam]);
  const weights = useEffectiveWeights();
  const overall = useMemo(() => computeOverallScore(entries, weights), [entries, weights]);
  const setScores = useMemo(() => computeSetScores(entries, weights), [entries, weights]);
  const catScores = useMemo(() => computeCategoryScores(entries, weights), [entries, weights]);

  const municipality = profile?.municipality;
  const meta = TITLES[template];
  const preparedBy = profile?.fullName || profile?.email || undefined;

  if (!mounted) return null;

  return (
    <div className="min-h-screen bg-white text-slate-900 print:bg-white">
      <style>{`
        @media print {
          .no-print { display: none !important; }
          @page { margin: 16mm 14mm; }
          body { background: #fff !important; }
          .avoid-break { break-inside: avoid; page-break-inside: avoid; }
          .page-break { break-before: page; page-break-before: page; }
        }
      `}</style>

      <header className="no-print sticky top-0 z-10 border-b border-slate-200 bg-white/95 px-6 py-3 backdrop-blur">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-4">
          <button
            type="button"
            onClick={() => window.close()}
            className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium text-slate-500 hover:bg-slate-100 hover:text-slate-800"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Close
          </button>
          <div className="text-center">
            <h1 className="text-sm font-semibold text-slate-900">{meta.title}</h1>
            <p className="text-[10px] text-slate-500">
              {municipality?.name ?? '—'} · {yearParam}
            </p>
          </div>
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-slate-800"
          >
            <Printer className="h-4 w-4" />
            Print / Save as PDF
          </button>
        </div>
      </header>

      <main id="main-content" className="mx-auto max-w-4xl px-6 py-8 print:px-0 print:py-0">
        <ReportCover
          title={meta.title}
          subtitle={meta.subtitle}
          municipalityName={municipality?.name ?? '—'}
          municipalityCountry={municipality?.country}
          year={yearParam}
          preparedBy={preparedBy}
        />

        {template === 'quarterly' && (
          <QuarterlyBody
            overall={overall}
            setScores={setScores}
            catScores={catScores}
          />
        )}
        {template === 'annual' && (
          <AnnualBody
            overall={overall}
            setScores={setScores}
            catScores={catScores}
            entries={entries}
          />
        )}
        {template === 'strategic' && (
          <StrategicBody
            overall={overall}
            setScores={setScores}
            catScores={catScores}
            entries={entries}
          />
        )}
        {template === 'footprint' && (
          <FootprintBody
            overall={overall}
            setScores={setScores}
            catScores={catScores}
          />
        )}

        <footer className="mt-10 border-t border-slate-200 pt-4 text-[10px] text-slate-400">
          SCALD · {meta.title} · {municipality?.name ?? '—'} · Reporting year {yearParam}
        </footer>
      </main>
    </div>
  );
}

function QuarterlyBody({
  overall,
  setScores,
  catScores,
}: {
  overall: ReturnType<typeof computeOverallScore>;
  setScores: ReturnType<typeof computeSetScores>;
  catScores: ReturnType<typeof computeCategoryScores>;
}) {
  return (
    <>
      <ExecutiveSummary overall={overall} />
      <SetTable setScores={setScores} />
      <GaugeAndRadar overall={overall} setScores={setScores} />
      <TopAndWeakCategories catScores={catScores} n={5} />
      <DataQualitySection setScores={setScores} />
    </>
  );
}

function AnnualBody({
  overall,
  setScores,
  catScores,
  entries,
}: {
  overall: ReturnType<typeof computeOverallScore>;
  setScores: ReturnType<typeof computeSetScores>;
  catScores: ReturnType<typeof computeCategoryScores>;
  entries: Record<string, import('@/stores/data-entry').IndicatorEntry>;
}) {
  return (
    <>
      <ExecutiveSummary overall={overall} />
      <SetTable setScores={setScores} />
      <GaugeAndRadar overall={overall} setScores={setScores} />
      <CategoryBarSection catScores={catScores} />
      <TopAndWeakCategories catScores={catScores} n={5} />
      <TargetVsCurrent setScores={setScores} />
      <DataQualitySection setScores={setScores} />
      <section className="page-break mt-8">
        <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500">
          Full Indicator Detail
        </h2>
        <p className="mt-2 text-xs text-slate-600">
          Every category's indicator raw values and 0–5 scores, grouped by sustainability set.
        </p>
      </section>
      <PerSetDeepDive catScores={catScores} entries={entries} />
    </>
  );
}

function StrategicBody({
  overall,
  setScores,
  catScores,
  entries,
}: {
  overall: ReturnType<typeof computeOverallScore>;
  setScores: ReturnType<typeof computeSetScores>;
  catScores: ReturnType<typeof computeCategoryScores>;
  entries: Record<string, import('@/stores/data-entry').IndicatorEntry>;
}) {
  return (
    <>
      <ExecutiveSummary overall={overall} />
      <SetTable setScores={setScores} />
      <GaugeAndRadar overall={overall} setScores={setScores} />
      <CategoryBarSection catScores={catScores} />
      <TopAndWeakCategories catScores={catScores} n={8} />
      <TargetVsCurrent setScores={setScores} />
      <RoadmapSection setScores={setScores} />
      <DataQualitySection setScores={setScores} />
      <section className="page-break mt-8">
        <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500">
          Full Sustainability Assessment
        </h2>
        <p className="mt-2 text-xs text-slate-600">
          Line-by-line record of every entered indicator, its raw value, and its resulting
          0–5 score across the 24 categories.
        </p>
      </section>
      <PerSetDeepDive catScores={catScores} entries={entries} />
    </>
  );
}

function FootprintBody({
  overall,
  setScores,
  catScores,
}: {
  overall: ReturnType<typeof computeOverallScore>;
  setScores: ReturnType<typeof computeSetScores>;
  catScores: ReturnType<typeof computeCategoryScores>;
}) {
  return (
    <>
      <ExecutiveSummary overall={overall} />
      <FootprintMethodologyNote />
      <GaugeAndRadar overall={overall} setScores={setScores} />
      <SetTable setScores={setScores} />
      <CategoryBarSection catScores={catScores} title="Category contribution to overall score" />
      <TopAndWeakCategories catScores={catScores} n={5} />
      <TargetVsCurrent setScores={setScores} />
    </>
  );
}
