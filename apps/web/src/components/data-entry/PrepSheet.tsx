'use client';

import { INDICATORS, type SetCode } from '@/lib/scald-indicators';
import { Printer } from 'lucide-react';

const SET_ORDER: SetCode[] = ['ES', 'SS', 'MS', 'ECS'];
const SET_FULL: Record<SetCode, string> = {
  ES: 'Environmental Sustainability',
  SS: 'Social Sustainability',
  MS: 'Managerial Sustainability',
  ECS: 'Economic Sustainability',
};

export function PrepSheet() {
  const generatedAt = new Date().toLocaleDateString('en-GB');

  return (
    <div className="min-h-screen bg-white text-slate-900 print:bg-white">
      <style>{`
        @media print {
          .no-print { display: none !important; }
          @page { margin: 14mm; }
          body { background: #fff !important; }
          .prep-category { break-inside: avoid; page-break-inside: avoid; }
          .prep-set { break-before: page; page-break-before: page; }
          .prep-set:first-of-type { break-before: auto; page-break-before: auto; }
        }
      `}</style>

      <header className="no-print sticky top-0 z-10 border-b border-slate-200 bg-white/95 px-6 py-3 backdrop-blur">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-4">
          <div>
            <h1 className="text-sm font-semibold text-slate-900">SCALD Preparation Sheet</h1>
            <p className="text-xs text-slate-500">
              Review all indicators, methods, and value ranges before data entry.
            </p>
          </div>
          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-emerald-700"
          >
            <Printer className="h-4 w-4" />
            Print / Save as PDF
          </button>
        </div>
      </header>

      <main id="main-content" className="mx-auto max-w-4xl px-6 py-8 print:px-0 print:py-0">
        <div className="mb-6 border-b border-slate-200 pb-6">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-emerald-600">
            SCALD · KA220-ADU
          </p>
          <h1 className="mt-1 text-2xl font-bold text-slate-900">
            Municipality Preparation Sheet
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            This document lists every indicator SCALD asks for, grouped by set and category.
            Use it to gather figures internally before entering values in the platform.
          </p>
          <div className="mt-4 grid grid-cols-2 gap-4 text-xs text-slate-600 sm:grid-cols-4">
            <div>
              <p className="font-semibold text-slate-500">Sets</p>
              <p className="text-slate-900">{SET_ORDER.length}</p>
            </div>
            <div>
              <p className="font-semibold text-slate-500">Categories</p>
              <p className="text-slate-900">{INDICATORS.order.length}</p>
            </div>
            <div>
              <p className="font-semibold text-slate-500">Indicators</p>
              <p className="text-slate-900">
                {INDICATORS.order.reduce(
                  (n, c) => n + INDICATORS.categories[c].indicators.length,
                  0,
                )}
              </p>
            </div>
            <div>
              <p className="font-semibold text-slate-500">Generated</p>
              <p className="text-slate-900">{generatedAt}</p>
            </div>
          </div>
          <p className="mt-4 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-[11px] text-slate-600">
            <span className="font-semibold">Legend:</span> Indicators marked
            <span className="ml-1 mr-1 inline-block rounded bg-purple-100 px-1.5 py-0.5 text-[9px] font-bold text-purple-700">
              OPTIONAL
            </span>
            are not required for category completion. Threshold columns 0–5 map to the score
            assigned when the value falls within that range.
          </p>
        </div>

        {SET_ORDER.map((sc) => {
          const cats = INDICATORS.order.filter((c) => INDICATORS.categories[c].set === sc);
          return (
            <section key={sc} className="prep-set mb-10">
              <div className="mb-4 flex items-center gap-3 border-b-2 border-slate-800 pb-2">
                <span className="rounded bg-slate-900 px-2 py-1 text-[11px] font-bold text-white">
                  {sc}
                </span>
                <h2 className="text-lg font-bold text-slate-900">{SET_FULL[sc]}</h2>
                <span className="text-xs text-slate-500">
                  {cats.length} categories ·{' '}
                  {cats.reduce((n, c) => n + INDICATORS.categories[c].indicators.length, 0)}{' '}
                  indicators
                </span>
              </div>

              {cats.map((catCode) => {
                const cat = INDICATORS.categories[catCode];
                return (
                  <div key={catCode} className="prep-category mb-6">
                    <h3 className="mb-2 text-sm font-bold text-slate-900">
                      <span className="mr-2 rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold text-slate-700">
                        {catCode}
                      </span>
                      {cat.name}
                    </h3>
                    <div className="overflow-hidden rounded border border-slate-300">
                      <table className="w-full border-collapse text-[10px]">
                        <thead className="bg-slate-100 text-slate-700">
                          <tr>
                            <th className="border-b border-slate-300 px-2 py-1.5 text-left font-semibold">
                              Code
                            </th>
                            <th className="border-b border-slate-300 px-2 py-1.5 text-left font-semibold">
                              Indicator
                            </th>
                            <th className="border-b border-slate-300 px-2 py-1.5 text-left font-semibold">
                              Unit
                            </th>
                            <th className="border-b border-slate-300 px-2 py-1.5 text-left font-semibold">
                              Method
                            </th>
                            <th
                              className="border-b border-slate-300 px-2 py-1.5 text-center font-semibold"
                              colSpan={6}
                            >
                              Thresholds (score 0 → 5)
                            </th>
                            <th className="border-b border-slate-300 px-2 py-1.5 text-left font-semibold">
                              Your value
                            </th>
                          </tr>
                          <tr className="bg-slate-50 text-slate-500">
                            <th className="border-b border-slate-300 px-2 py-1 text-left" />
                            <th className="border-b border-slate-300 px-2 py-1 text-left" />
                            <th className="border-b border-slate-300 px-2 py-1 text-left" />
                            <th className="border-b border-slate-300 px-2 py-1 text-left" />
                            {[0, 1, 2, 3, 4, 5].map((s) => (
                              <th
                                key={s}
                                className="border-b border-slate-300 px-1 py-1 text-center text-[9px] font-semibold"
                              >
                                {s}
                              </th>
                            ))}
                            <th className="border-b border-slate-300 px-2 py-1 text-left" />
                          </tr>
                        </thead>
                        <tbody>
                          {cat.indicators.map((ind) => (
                            <tr key={ind.code} className="align-top">
                              <td className="border-b border-slate-200 px-2 py-1.5 font-mono font-semibold text-slate-700">
                                {ind.code}
                              </td>
                              <td className="border-b border-slate-200 px-2 py-1.5">
                                <div className="flex items-start gap-1.5">
                                  <span className="font-medium text-slate-900">{ind.name}</span>
                                  {ind.optional && (
                                    <span className="mt-0.5 shrink-0 rounded bg-purple-100 px-1 py-0.5 text-[8px] font-bold text-purple-700">
                                      OPT
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td className="border-b border-slate-200 px-2 py-1.5 text-slate-600">
                                {ind.unit}
                              </td>
                              <td className="border-b border-slate-200 px-2 py-1.5 text-slate-600">
                                {ind.method}
                              </td>
                              {ind.thresholds.map((t, i) => (
                                <td
                                  key={i}
                                  className="border-b border-l border-slate-200 px-1 py-1.5 text-center text-[9px] text-slate-700"
                                >
                                  {t}
                                </td>
                              ))}
                              <td className="border-b border-l border-slate-200 px-2 py-1.5">
                                <div className="h-4 min-w-[60px] border-b border-dotted border-slate-400" />
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              })}
            </section>
          );
        })}

        <footer className="mt-10 border-t border-slate-200 pt-4 text-[10px] text-slate-400">
          SCALD Preparation Sheet · Generated {generatedAt} · Fill in offline, then transfer
          values to the platform under Data Entry.
        </footer>
      </main>
    </div>
  );
}
