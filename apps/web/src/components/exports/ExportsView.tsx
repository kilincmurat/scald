'use client';

import { useEffect, useMemo, useState } from 'react';
import { useProfile } from '@/hooks/useProfile';
import { useDataEntry } from '@/stores/data-entry';
import { useEffectiveWeights } from '@/stores/weights';
import { YearPicker } from '@/components/data-entry/YearPicker';
import { downloadExcelReport } from '@/lib/exports';
import { computeOverallScore, computeSetScores } from '@/lib/scores';
import { INDICATORS, type SetCode } from '@/lib/scald-indicators';
import { FileSpreadsheet, FileText, Lock, ExternalLink, ShieldAlert } from 'lucide-react';
import { clsx } from 'clsx';

export function ExportsView() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const { profile } = useProfile();
  const loadMunicipality = useDataEntry((s) => s.loadMunicipality);
  const currentMunicipalityId = useDataEntry((s) => s.municipalityId);
  const entries = useDataEntry((s) => s.entries);
  const year = useDataEntry((s) => s.selectedYear);
  const municipality = profile?.municipality;

  useEffect(() => {
    if (!mounted) return;
    if (profile?.municipalityId && profile.municipalityId !== currentMunicipalityId) {
      void loadMunicipality(profile.municipalityId);
    }
  }, [mounted, profile?.municipalityId, currentMunicipalityId, loadMunicipality]);

  const weights = useEffectiveWeights();
  const overall = useMemo(() => computeOverallScore(entries, weights), [entries, weights]);
  const setScores = useMemo(() => computeSetScores(entries, weights), [entries, weights]);
  const hasAnyData = overall.entered > 0;

  const onDownloadExcel = () => {
    if (!municipality) return;
    downloadExcelReport({
      municipalityName: municipality.name,
      municipalityCountry: municipality.country,
      year,
      entries,
      weights,
    });
  };

  const openOfficialReport = () => {
    const url = `/official-report?year=${year}`;
    window.open(url, '_blank', 'noopener');
  };

  if (!mounted) {
    return (
      <div className="p-6">
        <div className="h-40 rounded-xl bg-slate-100 animate-pulse" />
      </div>
    );
  }

  if (!municipality) {
    return (
      <div className="p-6">
        <div className="mx-auto max-w-md rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <ShieldAlert className="mx-auto h-8 w-8 text-slate-400" />
          <h2 className="mt-4 text-lg font-bold text-slate-900">No municipality on your profile</h2>
          <p className="mt-1 text-sm text-slate-500">
            Please contact the SCALD team to be linked to a pilot municipality.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-6 space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Data exports</h2>
          <p className="mt-0.5 text-xs text-slate-500">
            Download entered indicator data for the selected reporting year.
          </p>
        </div>
        <YearPicker size="sm" />
      </div>

      {/* Snapshot summary */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center gap-3">
          <span className="text-2xl leading-none">{municipality.flag}</span>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
              Municipality
            </p>
            <p className="text-sm font-bold text-slate-900">
              {municipality.name}, {municipality.country}
            </p>
          </div>
          <div className="ml-auto text-right">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
              Reporting year
            </p>
            <p className="text-sm font-bold text-slate-900">{year}</p>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCell label="Overall score" value={overall.entered > 0 ? `${overall.score}` : '—'} />
          <StatCell
            label="Ecological footprint"
            value={overall.entered > 0 ? `${overall.ef} gHa` : '—'}
          />
          <StatCell label="Indicators entered" value={`${overall.entered} / ${overall.total}`} />
          <StatCell label="Categories" value={`${INDICATORS.order.length}`} />
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {(['ES', 'SS', 'MS', 'ECS'] as SetCode[]).map((sc) => {
            const s = setScores[sc];
            return (
              <div key={sc} className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                  {sc}
                </p>
                <p className="mt-0.5 text-sm font-bold text-slate-900">
                  {s.entered > 0 ? s.score : '—'}
                  <span className="ml-1 text-[10px] font-normal text-slate-400">
                    · {s.entered}/{s.total}
                  </span>
                </p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Download cards */}
      <section className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <DownloadCard
          icon={<FileSpreadsheet className="h-6 w-6" />}
          gradient="from-emerald-500 to-teal-600"
          title="Excel workbook"
          format=".xlsx"
          description="Full data workbook with four sheets: summary, sets, categories, and every indicator with its raw value and score. Suitable for internal analysis, filtering, and further processing."
          bullets={[
            'Summary sheet — municipality, year, overall & set scores',
            'Categories sheet — 24 categories with weights',
            `Indicators sheet — all ${INDICATORS.order.reduce(
              (n, c) => n + INDICATORS.categories[c].indicators.length,
              0,
            )} indicators, raw values, scores`,
          ]}
          buttonLabel="Download Excel"
          buttonIcon={<FileSpreadsheet className="h-4 w-4" />}
          onClick={onDownloadExcel}
          disabled={!hasAnyData}
          disabledHint="No indicator data entered for this year yet."
        />
        <DownloadCard
          icon={<FileText className="h-6 w-6" />}
          gradient="from-slate-700 to-slate-900"
          title="Official report"
          format="PDF (print)"
          description="Formal, print-ready report suitable for filing with regulators, sharing with the council, or archiving. Opens in a new tab — use the print button to save as PDF."
          bullets={[
            'Cover with municipality, reporting year, generated date',
            'Executive summary with overall & set scores',
            'Per-category breakdown with all indicator values',
          ]}
          buttonLabel="Open official report"
          buttonIcon={<ExternalLink className="h-4 w-4" />}
          onClick={openOfficialReport}
          disabled={!hasAnyData}
          disabledHint="No indicator data entered for this year yet."
        />
      </section>
    </div>
  );
}

function StatCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">{label}</p>
      <p className="mt-0.5 text-sm font-bold text-slate-900">{value}</p>
    </div>
  );
}

function DownloadCard({
  icon,
  gradient,
  title,
  format,
  description,
  bullets,
  buttonLabel,
  buttonIcon,
  onClick,
  disabled,
  disabledHint,
}: {
  icon: React.ReactNode;
  gradient: string;
  title: string;
  format: string;
  description: string;
  bullets: string[];
  buttonLabel: string;
  buttonIcon: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  disabledHint?: string;
}) {
  return (
    <div className="flex flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start gap-3">
        <div
          className={clsx(
            'flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br text-white shadow-md',
            gradient,
          )}
        >
          {icon}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-slate-900">{title}</h3>
            <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[9px] font-bold uppercase text-slate-500">
              {format}
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-600">{description}</p>
        </div>
      </div>

      <ul className="mt-4 space-y-1.5 text-xs text-slate-600">
        {bullets.map((b) => (
          <li key={b} className="flex gap-2">
            <span className="mt-1 h-1 w-1 shrink-0 rounded-full bg-slate-400" />
            <span>{b}</span>
          </li>
        ))}
      </ul>

      <div className="mt-5 pt-4 border-t border-slate-100">
        <button
          type="button"
          onClick={onClick}
          disabled={disabled}
          className={clsx(
            'inline-flex w-full items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold shadow-sm transition',
            disabled
              ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
              : 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white hover:opacity-90 hover:shadow-md',
          )}
        >
          {disabled ? <Lock className="h-4 w-4" /> : buttonIcon}
          {disabled ? 'No data yet' : buttonLabel}
        </button>
        {disabled && disabledHint && (
          <p className="mt-2 text-center text-[11px] text-slate-500">{disabledHint}</p>
        )}
      </div>
    </div>
  );
}
