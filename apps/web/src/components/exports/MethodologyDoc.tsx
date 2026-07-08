'use client';

import { Printer } from 'lucide-react';

export function MethodologyDoc() {
  const generatedAt = new Date().toLocaleDateString('en-GB');

  return (
    <div className="min-h-screen bg-white text-slate-900 print:bg-white">
      <style>{`
        @media print {
          .no-print { display: none !important; }
          @page { margin: 16mm 14mm; }
          body { background: #fff !important; }
          .avoid-break { break-inside: avoid; page-break-inside: avoid; }
        }
      `}</style>

      <header className="no-print sticky top-0 z-10 border-b border-slate-200 bg-white/95 px-6 py-3 backdrop-blur">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-4">
          <div>
            <h1 className="text-sm font-semibold text-slate-900">Methodology</h1>
            <p className="text-[10px] text-slate-500">
              How the SCALD ecological footprint score is calculated
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

      <main id="main-content" className="mx-auto max-w-4xl px-6 py-10 print:px-0 print:py-0">
        <section className="border-b-2 border-slate-900 pb-6">
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-emerald-700">
            SCALD · KA220-ADU · Methodology
          </p>
          <h1 className="mt-3 text-3xl font-bold leading-tight text-slate-900">
            How the Ecological Footprint score is calculated
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            This document explains every step of the SCALD scoring pipeline — from a single
            indicator entry all the way to the overall municipal score and the ecological
            footprint value in gHa per capita.
          </p>
          <p className="mt-4 text-[10px] text-slate-400">Generated on {generatedAt}</p>
        </section>

        {/* Overview */}
        <Section title="1. Overview">
          <p>
            The SCALD framework tracks <strong>152 indicators</strong> grouped into{' '}
            <strong>24 categories</strong>, which are further grouped into{' '}
            <strong>4 sustainability sets</strong>: Environmental (ES), Social (SS),
            Managerial (MS) and Economic (ECS). The final output is:
          </p>
          <ul>
            <li>
              <strong>Overall score (0–100)</strong> — a single number describing the
              municipality’s sustainability posture.
            </li>
            <li>
              <strong>Ecological footprint (gHa per capita)</strong> — a physical land-use
              proxy derived from the overall score. Lower is better; the global sustainability
              target is 2.5 gHa/capita.
            </li>
          </ul>
        </Section>

        {/* Step 1 */}
        <Section title="2. Step 1 — Scoring a single indicator (0–5)">
          <p>
            Each indicator has six threshold ranges. When the data-entry team enters a value,
            the platform maps it to a score from <strong>0</strong> (worst) to{' '}
            <strong>5</strong> (best) using the indicator’s threshold table.
          </p>
          <table className="my-3 w-full border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 text-left">
                <th className="border border-slate-300 px-2 py-1">Score</th>
                <th className="border border-slate-300 px-2 py-1">Interpretation</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="border border-slate-200 px-2 py-1 font-bold">0</td>
                <td className="border border-slate-200 px-2 py-1">
                  None / not implemented / lowest performance band
                </td>
              </tr>
              <tr>
                <td className="border border-slate-200 px-2 py-1 font-bold">1</td>
                <td className="border border-slate-200 px-2 py-1">Poor</td>
              </tr>
              <tr>
                <td className="border border-slate-200 px-2 py-1 font-bold">2</td>
                <td className="border border-slate-200 px-2 py-1">Basic</td>
              </tr>
              <tr>
                <td className="border border-slate-200 px-2 py-1 font-bold">3</td>
                <td className="border border-slate-200 px-2 py-1">Moderate</td>
              </tr>
              <tr>
                <td className="border border-slate-200 px-2 py-1 font-bold">4</td>
                <td className="border border-slate-200 px-2 py-1">Good</td>
              </tr>
              <tr>
                <td className="border border-slate-200 px-2 py-1 font-bold">5</td>
                <td className="border border-slate-200 px-2 py-1">
                  Excellent — best-practice performance
                </td>
              </tr>
            </tbody>
          </table>
          <p className="text-[11px] italic text-slate-500">
            Threshold ranges differ per indicator. See the preparation sheet (available on the
            data-entry page) for the full range table.
          </p>
        </Section>

        {/* Step 2 */}
        <Section title="3. Step 2 — Category score (0–100)">
          <p>
            For each of the 24 categories the platform takes the <strong>plain mean</strong>{' '}
            of the scored indicators (only indicators with a raw value are counted; unfilled
            optional indicators are ignored). The 0–5 mean is then scaled to 0–100:
          </p>
          <Formula>
            category_score = (mean(indicator_scores) / 5) × 100
          </Formula>
          <p>
            Categories where no indicator has been entered stay uncomputed and show as “—”.
          </p>
        </Section>

        {/* Step 3 */}
        <Section title="4. Step 3 — Set score (0–100)">
          <p>
            Each of the 4 sets aggregates its categories with a{' '}
            <strong>weighted mean</strong>. By default all categories weigh equally; SCALD
            admins can override individual category weights on the Weights page (only category
            weights are configurable — sets are always weighted equally).
          </p>
          <Formula>
            set_score = Σ (category_score × category_weight) / Σ (category_weight)
          </Formula>
        </Section>

        {/* Step 4 */}
        <Section title="5. Step 4 — Overall score (0–100)">
          <p>
            Sets are combined with an <strong>equal weighted mean</strong> — the four sets
            each contribute 25% to the overall score.
          </p>
          <Formula>overall_score = (ES + SS + MS + ECS) / 4</Formula>
          <p>
            This deliberately keeps the environmental, social, managerial and economic
            dimensions on equal footing so a municipality cannot compensate a weak set with a
            very strong one.
          </p>
        </Section>

        {/* EF formula */}
        <Section title="6. Step 5 — Ecological footprint (gHa/capita)">
          <p>
            The ecological footprint is derived from the overall score using a linear mapping.
            The best possible score (100/100) maps to the global sustainability target
            (2.5 gHa/capita); the worst (0/100) maps to a stressed-city baseline
            (8.0 gHa/capita):
          </p>
          <Formula>EF = 8.0 − (overall_score / 100) × 5.5</Formula>
          <p className="text-[11px] italic text-slate-500">
            Note: this is a proxy for communication purposes, not a full Global Footprint
            Network calculation. It moves in the correct direction with all 152 SCALD
            indicators and lets citizens see a familiar physical unit.
          </p>
        </Section>

        {/* Bands */}
        <Section title="7. Rating bands">
          <p>The overall score is presented alongside a qualitative band:</p>
          <table className="my-3 w-full border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 text-left">
                <th className="border border-slate-300 px-2 py-1">Score range</th>
                <th className="border border-slate-300 px-2 py-1">Band</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="border border-slate-200 px-2 py-1">75 – 100</td>
                <td className="border border-slate-200 px-2 py-1 font-semibold text-emerald-700">
                  Highly Sustainable
                </td>
              </tr>
              <tr>
                <td className="border border-slate-200 px-2 py-1">55 – 74</td>
                <td className="border border-slate-200 px-2 py-1 font-semibold text-lime-700">
                  On Track
                </td>
              </tr>
              <tr>
                <td className="border border-slate-200 px-2 py-1">40 – 54</td>
                <td className="border border-slate-200 px-2 py-1 font-semibold text-amber-700">
                  Needs Improvement
                </td>
              </tr>
              <tr>
                <td className="border border-slate-200 px-2 py-1">0 – 39</td>
                <td className="border border-slate-200 px-2 py-1 font-semibold text-red-700">
                  Critical
                </td>
              </tr>
            </tbody>
          </table>
        </Section>

        {/* Data quality */}
        <Section title="8. Data quality & governance">
          <p>
            A year’s data can only be used for calculation once both roles confirm it:
          </p>
          <ol>
            <li>
              <strong>Data-entry personnel</strong> fill in the indicator values and submit
              the year for review with a written accuracy declaration.
            </li>
            <li>
              <strong>Decision maker</strong> reviews the submitted values and the
              submitter’s declaration, then approves for calculation with their own written
              declaration.
            </li>
            <li>
              Only after approval does the ecological footprint calculation become available.
              Both declarations are attached to the official report as an audit trail.
            </li>
          </ol>
        </Section>

        {/* Reporting year */}
        <Section title="9. Reporting years">
          <p>
            SCALD tracks reporting years <strong>2025 → 2030</strong>. Only completed calendar
            years can receive data (e.g., 2026 becomes available for data entry in January
            2027), which prevents partial-year values distorting the score.
          </p>
        </Section>

        <footer className="mt-10 border-t border-slate-200 pt-4 text-[10px] text-slate-400">
          SCALD Methodology · Generated {generatedAt} · Part of the KA220-ADU project
        </footer>
      </main>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="avoid-break mt-8">
      <h2 className="text-lg font-bold text-slate-900">{title}</h2>
      <div className="prose prose-sm mt-2 max-w-none text-sm leading-relaxed text-slate-700 [&_li]:my-1 [&_ol]:list-decimal [&_ol]:pl-5 [&_p]:my-2 [&_ul]:list-disc [&_ul]:pl-5">
        {children}
      </div>
    </section>
  );
}

function Formula({ children }: { children: React.ReactNode }) {
  return (
    <div className="my-3 rounded-lg border border-slate-300 bg-slate-50 px-4 py-3 font-mono text-xs text-slate-800">
      {children}
    </div>
  );
}
