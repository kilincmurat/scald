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
  scoreBand,
} from '@/lib/scores';
import { INDICATORS, type SetCode } from '@/lib/scald-indicators';
import { Printer, ArrowLeft } from 'lucide-react';

const SET_FULL: Record<SetCode, string> = {
  ES: 'Environmental Sustainability',
  SS: 'Social Sustainability',
  MS: 'Managerial Sustainability',
  ECS: 'Economic Sustainability',
};

function clampYear(n: number): number {
  if (!Number.isFinite(n)) return DEFAULT_YEAR;
  if (n < MIN_YEAR) return MIN_YEAR;
  if (n > MAX_YEAR) return MAX_YEAR;
  return Math.trunc(n);
}

export function OfficialReport() {
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
  const band = scoreBand(overall.score);

  const municipality = profile?.municipality;
  const generatedAt = new Date().toLocaleDateString('en-GB');

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
            <h1 className="text-sm font-semibold text-slate-900">SCALD Official Report</h1>
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
        {/* Cover */}
        <section className="avoid-break border-b-2 border-slate-900 pb-6">
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-emerald-700">
            SCALD · KA220-ADU · Sustainability Assessment
          </p>
          <h1 className="mt-3 text-3xl font-bold leading-tight text-slate-900">
            Sustainability Report — {yearParam}
          </h1>
          <p className="mt-1 text-lg text-slate-700">
            {municipality?.name ?? '—'}
            {municipality?.country ? `, ${municipality.country}` : ''}
          </p>

          <div className="mt-6 grid grid-cols-2 gap-4 border-t border-slate-200 pt-4 text-xs sm:grid-cols-4">
            <ReportField label="Municipality" value={municipality?.name ?? '—'} />
            <ReportField label="Reporting year" value={String(yearParam)} />
            <ReportField label="Generated on" value={generatedAt} />
            <ReportField
              label="Prepared by"
              value={profile?.fullName || profile?.email || '—'}
            />
          </div>
        </section>

        {/* Executive summary */}
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
                {Math.round(
                  overall.total === 0 ? 0 : (overall.entered / overall.total) * 100,
                )}
                % completed
              </p>
            </div>
          </div>

          <table className="mt-4 w-full border-collapse text-xs">
            <thead>
              <tr className="border-y border-slate-300 bg-slate-50 text-slate-700">
                <th className="px-3 py-2 text-left font-semibold">Sustainability set</th>
                <th className="px-3 py-2 text-right font-semibold">Score</th>
                <th className="px-3 py-2 text-right font-semibold">Band</th>
                <th className="px-3 py-2 text-right font-semibold">Indicators</th>
              </tr>
            </thead>
            <tbody>
              {(['ES', 'SS', 'MS', 'ECS'] as SetCode[]).map((sc) => {
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

        {/* Category tables per set */}
        {(['ES', 'SS', 'MS', 'ECS'] as SetCode[]).map((sc, i) => {
          const cats = catScores.filter((c) => c.setCode === sc);
          return (
            <section
              key={sc}
              className={i === 0 ? 'mt-8' : 'page-break mt-8'}
            >
              <div className="mb-3 flex items-baseline gap-2 border-b border-slate-300 pb-2">
                <span className="rounded bg-slate-900 px-2 py-1 text-[10px] font-bold text-white">
                  {sc}
                </span>
                <h2 className="text-lg font-bold text-slate-900">{SET_FULL[sc]}</h2>
                <span className="ml-auto text-xs text-slate-500">
                  Score {setScores[sc].entered > 0 ? setScores[sc].score : '—'} / 100
                </span>
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
                                {e?.rawValue || (
                                  <span className="text-slate-300">—</span>
                                )}
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

        {/* Signature area */}
        <section className="avoid-break mt-12 border-t border-slate-300 pt-8">
          <div className="grid grid-cols-2 gap-8">
            <SignatureBlock label="Prepared by" who={profile?.fullName || profile?.email} />
            <SignatureBlock label="Approved by" who="" />
          </div>
        </section>

        <footer className="mt-8 border-t border-slate-200 pt-4 text-[10px] text-slate-400">
          SCALD Sustainability Report · {municipality?.name ?? '—'} · Reporting year {yearParam} ·
          Generated {generatedAt}
        </footer>
      </main>
    </div>
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

function SignatureBlock({ label, who }: { label: string; who?: string }) {
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">{label}</p>
      <div className="mt-8 border-b border-slate-400" />
      <p className="mt-1 text-xs text-slate-700">{who || 'Name / Title'}</p>
      <p className="text-[10px] text-slate-400">Signature · Date</p>
    </div>
  );
}
