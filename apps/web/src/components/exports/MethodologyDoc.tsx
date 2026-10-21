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
            Managerial (MS) and Economic (ECS). Indicator definitions follow the{' '}
            <strong>SCALD Indicators V6 (Final Version)</strong>. The final output is:
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

        {/* Comparability */}
        <Section title="2. Comparability and normalisation">
          <p>
            The strength of the index is that the 0–5 scoring system follows one consistent
            methodology across all indicators. Because municipalities of very different sizes
            across Europe and Türkiye are compared, <strong>percentage-based (%)</strong> and{' '}
            <strong>per capita</strong> values are used wherever possible. Where needed,
            indicators are normalised <strong>per 10,000 inhabitants</strong> or{' '}
            <strong>per 100 km²</strong> so that a large metropolitan municipality and a small
            district municipality can be compared fairly.
          </p>
          <p>
            Each indicator therefore states its <strong>unit</strong> and its{' '}
            <strong>normalisation basis</strong>. The value entered must already be in that
            unit — for example, a count of monitoring stations is entered as stations per
            10,000 inhabitants, not as the raw total:
          </p>
          <Formula>
            value = (number of stations / total municipal population) × 10,000
          </Formula>
          <p>
            Scoring thresholds were established from internationally recognised indicator
            frameworks (ISO 37120, ISO 37122, ISO 37123, the SDGs, EEA and OECD indicators),
            relevant scientific literature, European Union environmental and climate policies,
            and the observed distribution of performance among European and Turkish
            municipalities. They were further refined to keep municipalities of different sizes
            comparable and to maximise the index’s ability to discriminate between them. The
            full list of reference frameworks is given in section 11.
          </p>
        </Section>

        {/* Step 1 */}
        <Section title="3. Step 1 — Scoring a single indicator (0–5)">
          <p>
            Each indicator has six threshold ranges. When the data-entry team enters a value,
            the platform maps it to a score from <strong>0</strong> (worst) to{' '}
            <strong>5</strong> (best) using the indicator’s threshold table.
          </p>
          <p>
            Every band is written as an explicit interval, so adjacent bands meet exactly and
            no value falls between them:
          </p>
          <table className="my-3 w-full border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 text-left">
                <th className="border border-slate-300 px-2 py-1">Written as</th>
                <th className="border border-slate-300 px-2 py-1">Means</th>
                <th className="border border-slate-300 px-2 py-1">Example</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="border border-slate-200 px-2 py-1 font-mono">&gt;15–≤30</td>
                <td className="border border-slate-200 px-2 py-1">
                  more than 15, up to and including 30
                </td>
                <td className="border border-slate-200 px-2 py-1">
                  15 is <em>not</em> in this band; 30 is
                </td>
              </tr>
              <tr>
                <td className="border border-slate-200 px-2 py-1 font-mono">≥0–≤10</td>
                <td className="border border-slate-200 px-2 py-1">from 0 up to and including 10</td>
                <td className="border border-slate-200 px-2 py-1">both 0 and 10 are in</td>
              </tr>
              <tr>
                <td className="border border-slate-200 px-2 py-1 font-mono">&gt;60</td>
                <td className="border border-slate-200 px-2 py-1">more than 60</td>
                <td className="border border-slate-200 px-2 py-1">top band, open-ended</td>
              </tr>
              <tr>
                <td className="border border-slate-200 px-2 py-1 font-mono">0</td>
                <td className="border border-slate-200 px-2 py-1">exactly zero</td>
                <td className="border border-slate-200 px-2 py-1">the activity does not exist</td>
              </tr>
              <tr>
                <td className="border border-slate-200 px-2 py-1 font-mono">None / No data</td>
                <td className="border border-slate-200 px-2 py-1">no data available</td>
                <td className="border border-slate-200 px-2 py-1">scores 0</td>
              </tr>
            </tbody>
          </table>
          <p>
            For most indicators a higher value is better. For <strong>31 inverse
            indicators</strong> — consumption, losses, exposure, response times — a{' '}
            <strong>lower</strong> value scores higher; the data-entry form flags these. A
            further 11 indicators are <strong>maturity levels</strong> (e.g. “No plan” →
            “Advanced implementation and regularly monitored”): the user picks the level that
            describes the municipality instead of entering a number.
          </p>
          <p>
            <strong>Optional indicators</strong> (shown in purple) cover topics that do not
            apply to every municipality — coastal, landslide, agricultural or industrial
            indicators, for example. They can be left empty without blocking completion of a category; when
            filled, they count towards the score like any other indicator.
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
        <Section title="4. Step 2 — Category score (0–100)">
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
        <Section title="5. Step 3 — Set score (0–100)">
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
        <Section title="6. Step 4 — Overall score (0–100)">
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
        <Section title="7. Step 5 — Ecological footprint (gHa/capita)">
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
        <Section title="8. Rating bands">
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
        <Section title="9. Data quality & governance">
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
        <Section title="10. Reporting years">
          <p>
            SCALD tracks reporting years <strong>2025 → 2030</strong>. Only completed calendar
            years can receive data (e.g., 2026 becomes available for data entry in January
            2027), which prevents partial-year values distorting the score.
          </p>
        </Section>

        {/* Sources */}
        <Section title="11. Reference frameworks">
          <p>
            Indicator definitions and thresholds draw on the following frameworks, as listed in
            the SCALD Indicators V6 workbook.
          </p>
          {REFERENCE_FRAMEWORKS.map((group) => (
            <div key={group.title} className="avoid-break">
              <h3 className="mt-4 text-sm font-semibold text-slate-800">{group.title}</h3>
              <ul>
                {group.items.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          ))}
        </Section>

        <footer className="mt-10 border-t border-slate-200 pt-4 text-[10px] text-slate-400">
          SCALD Methodology · Indicators V6 (Final) · Generated {generatedAt} · Part of the KA220-ADU project
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

/**
 * Reference frameworks from the right-hand panel of the SCALD Indicators V6
 * workbook. Environmental sources are grouped as in the workbook; for the other
 * three sets the workbook lists a source per indicator, deduplicated here.
 */
const REFERENCE_FRAMEWORKS: { title: string; items: string[] }[] = [
  {
    title: 'Environmental — international standards and indicators',
    items: [
      'ISO 37120 – Sustainable Cities and Communities: Indicators for City Services and Quality of Life',
      'ISO 37122 – Indicators for Smart Cities',
      'ISO 37123 – Indicators for Resilient Cities',
      'UN Sustainable Development Goals (SDG Indicators)',
      'UN-Habitat City Prosperity Initiative (CPI)',
    ],
  },
  {
    title: 'Environmental — EU environment and climate policies',
    items: [
      'EU Nature Restoration Law',
      'European Climate Adaptation Strategy',
      'Covenant of Mayors (SECAP Framework)',
    ],
  },
  {
    title: 'Environmental — European Environment Agency datasets',
    items: [
      'EEA Urban Sustainability Indicators',
      'EEA Green Infrastructure Framework',
      'EEA Urban Adaptation Indicators',
    ],
  },
  {
    title: 'Environmental — Copernicus and land use',
    items: ['Copernicus Land Monitoring Service', 'CORINE Land Cover', 'Imperviousness Layer', 'Urban Atlas'],
  },
  {
    title: 'Environmental — climate and disaster',
    items: [
      'IPCC AR6 Reports',
      'World Meteorological Organization (WMO)',
      'UNDRR Sendai Framework',
      'Climate-ADAPT Platform',
      'FEMA Community Resilience Indicators',
    ],
  },
  {
    title: 'Environmental — water management',
    items: ['UN-Water', 'European Water Framework Directive', 'FAO AQUASTAT'],
  },
  {
    title: 'Environmental — waste and the circular economy',
    items: [
      'EU Circular Economy Action Plan',
      'Eurostat Waste Statistics',
      'OECD Circular Economy Indicators',
      'UNEP Global Waste Management Outlook',
      'Türkiye Sıfır Atık Sistemi (Zero Waste System)',
    ],
  },
  {
    title: 'Environmental — ecological footprint and carbon',
    items: [
      'Global Footprint Network',
      'IPCC Carbon Accounting Guidelines',
      'GHG Protocol',
      'Science Based Targets Initiative (SBTi)',
      'UNFCCC Net-Zero Framework',
    ],
  },
  {
    title: 'Environmental — health and vulnerability',
    items: [
      'WHO Air Quality Guidelines (2021)',
      'WHO Urban Green Space and Health Guidelines',
      'EEA Environmental Health Indicators',
      'IPCC Vulnerability Framework',
    ],
  },
  {
    title: 'Environmental — smart cities and digitalisation',
    items: [
      'OECD Digital Government Indicators',
      'European Digital Decade Programme',
      'INSPIRE Directive',
      'Open Government Data Framework',
      'ICLEI Smart Cities Framework',
    ],
  },
  {
    title: 'Social and managerial sustainability',
    items: [
      'ISO 37123:2019 – Indicators for Resilient Cities',
      'ISO 37120 – Indicators for City Services and Quality of Life',
      'ISO 22398:2021 – Security and Resilience — Guidelines for Exercises',
      'ISO 59020 – Circular Economy Performance Measurement',
      'UNDRR Words into Action Guidelines',
      'UNDRR Making Cities Resilient 2030 (MCR2030)',
      'UNDRR Disaster Preparedness Guidance',
      'UN Sustainable Development Goal 13.3 Indicators',
      'SDG Indicator 1.5.1 Metadata',
      'UN-Habitat City Resilience Profiling Tool (CRPT)',
      'UNFCCC Adaptation Knowledge Portal',
      'Sendai Framework Monitor – Targets B and G',
      'Early Warnings for All Initiative (UNDRR–WMO)',
      'WMO Multi-Hazard Early Warning Systems Guidance',
      'OECD Building Resilient Cities',
      'OECD Circular Economy Indicators',
      'NFPA Emergency Response Standards',
      'WHO Climate Change and Health Programme',
      'WHO Health Emergency and Disaster Risk Management (Health EDRM) Framework',
      'IFRC Guidelines for Psychosocial Support',
      'IPCC Sixth Assessment Report (AR6), Working Group II',
      'Aarhus Convention on Access to Information, Public Participation in Decision-making and Access to Justice in Environmental Matters',
    ],
  },
  {
    title: 'Economic sustainability',
    items: [
      'Regulation on European Green Bonds (2023/2631/EU)',
      'OECD Multi-level Governance Studies (2022)',
      'European Commission Green Budgeting Reference Framework (2022)',
      'Financing Urban Adaptation to Climate Change (EEA, 2017)',
      'EU Civil Protection Mechanism (UCPM)',
      'EU Waste Framework Directive',
      'EU Circular Economy Action Plan; Circular Cities and Regions Initiative (CCRI)',
      'Eurostat Circular Economy Monitoring Framework',
      'EU Green Infrastructure Strategy; EU Biodiversity Strategy for 2030',
      'ISO 37122 Sustainable cities and communities',
      'EU Sustainable and Smart Mobility Strategy',
      'Government Budget Allocations for R&D (GBARD)',
      'European Climate Risk Assessment 2024',
      'EU Energy Efficiency Directive (EU) 2023/1791',
      'EU Water Reuse Regulation (EU) 2020/741; European Water Resilience Strategy',
      'EU Renewable Energy Directive',
      'EU Taxonomy Regulation (2020/852/EU)',
    ],
  },
];
