import { INDICATORS, TOTAL_INDICATORS, type SetCode, type Indicator } from './scald-indicators';
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
 * Weights applied to the 3-level score rollup. Missing entries default to 1
 * (equal weighting). Negative values are treated as 1.
 */
export type Weights = {
  setWeights?: Record<string, number>;
  categoryWeights?: Record<string, number>;
  indicatorWeights?: Record<string, number>;
};

const setCodes: SetCode[] = ['ES', 'SS', 'MS', 'ECS'];

function isEntryComplete(e: IndicatorEntry | undefined): e is IndicatorEntry {
  return !!(e && e.rawValue && e.rawValue.trim().length > 0);
}

function wOf(map: Record<string, number> | undefined, code: string): number {
  const v = map?.[code];
  return typeof v === 'number' && v >= 0 ? v : 1;
}

export function computeCategoryScores(
  entries: Record<string, IndicatorEntry>,
  weights: Weights = {},
): CategoryScore[] {
  return INDICATORS.order.map((code) => {
    const cat = INDICATORS.categories[code];
    let wsum = 0;
    let w = 0;
    let n = 0;
    for (const ind of cat.indicators) {
      const e = entries[ind.code];
      if (isEntryComplete(e)) {
        const iw = wOf(weights.indicatorWeights, ind.code);
        wsum += e.score * iw;
        w += iw;
        n++;
      }
    }
    // Weighted 0..5 average of entered indicators.
    const avg = w === 0 ? 0 : wsum / w;
    return {
      code,
      name: cat.name,
      setCode: cat.set,
      score: w === 0 ? 0 : Math.round((avg / 5) * 100),
      avgScore: +avg.toFixed(2),
      entered: n,
      total: cat.indicators.length,
      complete: n > 0 && n === cat.indicators.length,
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
      const cw = wOf(weights.categoryWeights, c.code);
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
  let wsum = 0;
  let w = 0;
  let entered = 0;
  for (const s of setCodes) {
    entered += setScores[s].entered;
    if (setScores[s].entered > 0) {
      const sw = wOf(weights.setWeights, s);
      wsum += setScores[s].score * sw;
      w += sw;
    }
  }
  const score = w === 0 ? 0 : Math.round(wsum / w);
  // Rough EF (gha/capita): 100 → 2.5, 0 → 8.0
  const ef = +(8.0 - (score / 100) * 5.5).toFixed(2);
  return { score, entered, total: TOTAL_INDICATORS, ef };
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
