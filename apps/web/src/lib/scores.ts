import { INDICATORS, REQUIRED_INDICATORS, type SetCode, type Indicator } from './scald-indicators';
import type { IndicatorEntry } from '@/stores/data-entry';

export type ScoredEntry = {
  indicator: Indicator;
  categoryCode: string;
  categoryName: string;
  setCode: SetCode;
  score: number;
  rawValue?: string;
  enteredAt: number;
};

export type SetScore = {
  setCode: SetCode;
  score: number; // 0..100
  entered: number;
  total: number;
  complete: boolean;
};

export type CategoryScore = {
  code: string;
  name: string;
  setCode: SetCode;
  score: number; // 0..100 (or 0 if none scored)
  avgScore: number; // raw 0..5 average
  entered: number;
  total: number;
  complete: boolean;
};

/**
 * Only category-level weights are configurable. Sets are always weighted
 * equally (25% each), and indicators inside a category all count the same.
 * Missing category weights default to 1 → equal weighting.
 */
export type Weights = {
  categoryWeights?: Record<string, number>;
};

const setCodes: SetCode[] = ['ES', 'SS', 'MS', 'ECS'];

function isEntryComplete(e: IndicatorEntry | undefined): e is IndicatorEntry {
  return !!(e && e.rawValue && e.rawValue.trim().length > 0);
}

function catWeight(weights: Weights, code: string): number {
  const v = weights.categoryWeights?.[code];
  return typeof v === 'number' && v >= 0 ? v : 1;
}

export function computeCategoryScores(
  entries: Record<string, IndicatorEntry>,
  _weights: Weights = {},
): CategoryScore[] {
  return INDICATORS.order.map((code) => {
    const cat = INDICATORS.categories[code];
    let sum = 0;
    let n = 0;
    let requiredEntered = 0;
    let requiredTotal = 0;
    for (const ind of cat.indicators) {
      if (!ind.optional) requiredTotal++;
      const e = entries[ind.code];
      if (isEntryComplete(e)) {
        sum += e.score;
        n++;
        if (!ind.optional) requiredEntered++;
      }
    }
    const avg = n === 0 ? 0 : sum / n;
    // Progress reflects required indicators; optional ones score-in but never block.
    return {
      code,
      name: cat.name,
      setCode: cat.set,
      score: n === 0 ? 0 : Math.round((avg / 5) * 100),
      avgScore: +avg.toFixed(2),
      entered: requiredEntered,
      total: requiredTotal,
      complete: requiredTotal > 0 && requiredEntered === requiredTotal,
    };
  });
}

export function computeSetScores(
  entries: Record<string, IndicatorEntry>,
  weights: Weights = {},
): Record<SetCode, SetScore> {
  const cats = computeCategoryScores(entries, weights);
  const acc: Record<SetCode, { wsum: number; w: number; entered: number; total: number }> = {
    ES: { wsum: 0, w: 0, entered: 0, total: 0 },
    SS: { wsum: 0, w: 0, entered: 0, total: 0 },
    MS: { wsum: 0, w: 0, entered: 0, total: 0 },
    ECS: { wsum: 0, w: 0, entered: 0, total: 0 },
  };
  for (const c of cats) {
    const s = acc[c.setCode];
    s.entered += c.entered;
    s.total += c.total;
    if (c.entered > 0) {
      const cw = catWeight(weights, c.code);
      s.wsum += c.score * cw;
      s.w += cw;
    }
  }
  const out = {} as Record<SetCode, SetScore>;
  for (const s of setCodes) {
    const a = acc[s];
    out[s] = {
      setCode: s,
      score: a.w === 0 ? 0 : Math.round(a.wsum / a.w),
      entered: a.entered,
      total: a.total,
      complete: a.entered > 0 && a.entered === a.total,
    };
  }
  return out;
}

export function computeOverallScore(
  entries: Record<string, IndicatorEntry>,
  weights: Weights = {},
): { score: number; entered: number; total: number; ef: number } {
  const setScores = computeSetScores(entries, weights);
  // Every set contributes 25% — plain average of the sets that have data.
  let sum = 0;
  let contributing = 0;
  let entered = 0;
  for (const s of setCodes) {
    entered += setScores[s].entered;
    if (setScores[s].entered > 0) {
      sum += setScores[s].score;
      contributing++;
    }
  }
  const score = contributing === 0 ? 0 : Math.round(sum / contributing);
  // Rough EF (gha/capita): 100 → 2.5, 0 → 8.0
  const ef = +(8.0 - (score / 100) * 5.5).toFixed(2);
  return { score, entered, total: REQUIRED_INDICATORS, ef };
}

export function getScoredEntries(
  entries: Record<string, IndicatorEntry>,
): ScoredEntry[] {
  const out: ScoredEntry[] = [];
  for (const code of INDICATORS.order) {
    const cat = INDICATORS.categories[code];
    for (const ind of cat.indicators) {
      const e = entries[ind.code];
      if (isEntryComplete(e)) {
        out.push({
          indicator: ind,
          categoryCode: code,
          categoryName: cat.name,
          setCode: cat.set,
          score: e.score,
          rawValue: e.rawValue,
          enteredAt: e.enteredAt,
        });
      }
    }
  }
  return out;
}

export function getRecentEntries(
  entries: Record<string, IndicatorEntry>,
  limit = 5,
): ScoredEntry[] {
  return getScoredEntries(entries)
    .sort((a, b) => b.enteredAt - a.enteredAt)
    .slice(0, limit);
}

export function getWeakestIndicators(
  entries: Record<string, IndicatorEntry>,
  limit = 5,
): ScoredEntry[] {
  return getScoredEntries(entries)
    .filter((e) => e.score < 3)
    .sort((a, b) => a.score - b.score || a.indicator.code.localeCompare(b.indicator.code))
    .slice(0, limit);
}

export function getStrongestIndicators(
  entries: Record<string, IndicatorEntry>,
  limit = 5,
): ScoredEntry[] {
  return getScoredEntries(entries)
    .filter((e) => e.score >= 4)
    .sort((a, b) => b.score - a.score || a.indicator.code.localeCompare(b.indicator.code))
    .slice(0, limit);
}

export function scoreBand(score: number): {
  label: string;
  color: string;
  bg: string;
  ring: string;
  chipColor: string;
} {
  if (score >= 75)
    return {
      label: 'Highly Sustainable',
      color: 'text-emerald-700',
      bg: 'bg-emerald-50',
      ring: 'ring-emerald-200',
      chipColor: 'bg-emerald-500',
    };
  if (score >= 55)
    return {
      label: 'On Track',
      color: 'text-lime-700',
      bg: 'bg-lime-50',
      ring: 'ring-lime-200',
      chipColor: 'bg-lime-500',
    };
  if (score >= 40)
    return {
      label: 'Needs Improvement',
      color: 'text-amber-700',
      bg: 'bg-amber-50',
      ring: 'ring-amber-200',
      chipColor: 'bg-amber-500',
    };
  return {
    label: 'Critical',
    color: 'text-red-700',
    bg: 'bg-red-50',
    ring: 'ring-red-200',
    chipColor: 'bg-red-500',
  };
}

export const SET_THEME: Record<
  SetCode,
  {
    label: string;
    fullName: string;
    color: string;
    bg: string;
    border: string;
    chip: string;
    gradient: string;
    chartColor: string;
  }
> = {
  ES: {
    label: 'ES',
    fullName: 'Environmental',
    color: 'text-emerald-700',
    bg: 'bg-emerald-50',
    border: 'border-emerald-200',
    chip: 'bg-emerald-100 text-emerald-700',
    gradient: 'from-emerald-500 to-green-600',
    chartColor: '#10b981',
  },
  SS: {
    label: 'SS',
    fullName: 'Social',
    color: 'text-rose-700',
    bg: 'bg-rose-50',
    border: 'border-rose-200',
    chip: 'bg-rose-100 text-rose-700',
    gradient: 'from-rose-500 to-pink-600',
    chartColor: '#f43f5e',
  },
  MS: {
    label: 'MS',
    fullName: 'Managerial',
    color: 'text-blue-700',
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    chip: 'bg-blue-100 text-blue-700',
    gradient: 'from-blue-500 to-indigo-600',
    chartColor: '#3b82f6',
  },
  ECS: {
    label: 'ECS',
    fullName: 'Economic',
    color: 'text-orange-700',
    bg: 'bg-orange-50',
    border: 'border-orange-200',
    chip: 'bg-orange-100 text-orange-700',
    gradient: 'from-orange-500 to-amber-600',
    chartColor: '#f97316',
  },
};

export function timeAgo(ts: number): string {
  const diff = Math.floor((Date.now() - ts) / 1000);
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  const d = Math.floor(diff / 86400);
  return d === 1 ? 'yesterday' : `${d}d ago`;
}
