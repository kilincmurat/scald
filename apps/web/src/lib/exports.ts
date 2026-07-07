'use client';

import * as XLSX from 'xlsx';
import { INDICATORS, type SetCode } from '@/lib/scald-indicators';
import {
  computeCategoryScores,
  computeOverallScore,
  computeSetScores,
  scoreBand,
} from '@/lib/scores';
import type { IndicatorEntry } from '@/stores/data-entry';
import type { Weights } from '@/lib/scores';

const SET_FULL: Record<SetCode, string> = {
  ES: 'Environmental Sustainability',
  SS: 'Social Sustainability',
  MS: 'Managerial Sustainability',
  ECS: 'Economic Sustainability',
};

export type ExportContext = {
  municipalityName: string;
  municipalityCountry?: string;
  year: number;
  entries: Record<string, IndicatorEntry>;
  weights: Weights;
};

function fmtDate(d: Date): string {
  return d.toLocaleDateString('en-GB');
}

/**
 * Builds a multi-sheet .xlsx workbook and triggers a download.
 * Sheets: Summary · Sets · Categories · Indicators.
 */
export function downloadExcelReport(ctx: ExportContext): void {
  const wb = XLSX.utils.book_new();
  const overall = computeOverallScore(ctx.entries, ctx.weights);
  const setScores = computeSetScores(ctx.entries, ctx.weights);
  const catScores = computeCategoryScores(ctx.entries, ctx.weights);
  const band = scoreBand(overall.score);

  // --- Summary sheet ---
  const summary = XLSX.utils.aoa_to_sheet([
    ['SCALD Sustainability Report'],
    [],
    ['Municipality', ctx.municipalityName],
    ['Country', ctx.municipalityCountry ?? ''],
    ['Reporting year', ctx.year],
    ['Generated', fmtDate(new Date())],
    [],
    ['Overall score (0-100)', overall.score],
    ['Band', band.label],
    ['Ecological footprint (gHa/capita)', overall.ef],
    ['Indicators entered', overall.entered],
    ['Indicators required', overall.total],
    [],
    ['Set', 'Score', 'Entered', 'Required'],
    ...(['ES', 'SS', 'MS', 'ECS'] as SetCode[]).map((sc) => [
      SET_FULL[sc],
      setScores[sc].score,
      setScores[sc].entered,
      setScores[sc].total,
    ]),
  ]);
  summary['!cols'] = [{ wch: 34 }, { wch: 22 }, { wch: 12 }, { wch: 12 }];
  XLSX.utils.book_append_sheet(wb, summary, 'Summary');

  // --- Categories sheet ---
  const catRows = [
    ['Set', 'Category code', 'Category name', 'Score', 'Entered', 'Required', 'Weight'],
    ...catScores.map((c) => [
      SET_FULL[c.setCode],
      c.code,
      c.name,
      c.entered > 0 ? c.score : '',
      c.entered,
      c.total,
      ctx.weights.categoryWeights?.[c.code] ?? '',
    ]),
  ];
  const catSheet = XLSX.utils.aoa_to_sheet(catRows);
  catSheet['!cols'] = [
    { wch: 32 },
    { wch: 12 },
    { wch: 40 },
    { wch: 10 },
    { wch: 10 },
    { wch: 10 },
    { wch: 10 },
  ];
  XLSX.utils.book_append_sheet(wb, catSheet, 'Categories');

  // --- Indicators sheet (the main data payload) ---
  const indRows: (string | number)[][] = [
    [
      'Set',
      'Category code',
      'Indicator code',
      'Indicator name',
      'Unit',
      'Method',
      'Raw value',
      'Score (0-5)',
      'Optional',
    ],
  ];
  for (const catCode of INDICATORS.order) {
    const cat = INDICATORS.categories[catCode];
    for (const ind of cat.indicators) {
      const e = ctx.entries[ind.code];
      indRows.push([
        SET_FULL[cat.set],
        catCode,
        ind.code,
        ind.name,
        ind.unit,
        ind.method,
        e?.rawValue ?? '',
        e?.rawValue ? e.score : '',
        ind.optional ? 'Yes' : 'No',
      ]);
    }
  }
  const indSheet = XLSX.utils.aoa_to_sheet(indRows);
  indSheet['!cols'] = [
    { wch: 32 },
    { wch: 12 },
    { wch: 12 },
    { wch: 40 },
    { wch: 16 },
    { wch: 40 },
    { wch: 16 },
    { wch: 12 },
    { wch: 10 },
  ];
  XLSX.utils.book_append_sheet(wb, indSheet, 'Indicators');

  const safeName = ctx.municipalityName.replace(/[^A-Za-z0-9-_]+/g, '-');
  const fname = `SCALD-${safeName}-${ctx.year}.xlsx`;
  XLSX.writeFile(wb, fname);
}
