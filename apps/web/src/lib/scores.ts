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

const setCodes: SetCode[] = ['ES', 'SS', 'MS', 'ECS'];

function isEntryComplete(e: IndicatorEntry | undefined): e is IndicatorEntry {
  return !!(e && e.rawValue && e.rawValue.trim().length > 0);
}

export function computeCategoryScores(
  entries: Record<string, IndicatorEntry>,
): CategoryScore[] {
  return INDICATORS.order.map((code) => {
    const cat = INDICATORS.categories[code];
    let sum = 0;
    let n = 0;
    for (const ind of cat.indicators) {
      const e = entries[ind.code];
      if (isEntryComplete(e)) {
        sum += e.score;
        n++;
      }
    }
    const avg = n === 0 ? 0 : sum / n;
    return {
      code,
      name: cat.name,
      setCode: cat.set,
      score: n === 0 ? 0 : Math.round((sum / (n * 5)) * 100),
      avgScore: +avg.toFixed(2),
      entered: n,
      total: cat.indicators.length,
      complete: n > 0 && n === cat.indicators.length,
    };
  });
}

export function computeSetScores(
  entries: Record<string, IndicatorEntry>,
): Record<SetCode, SetScore> {
  const acc: Record<SetCode, { sum: number; n: number; total: number }> = {
    ES: { sum: 0, n: 0, total: 0 },
    SS: { sum: 0, n: 0, total: 0 },
    MS: { sum: 0, n: 0, total: 0 },
    ECS: { sum: 0, n: 0, total: 0 },
  };
  for (const code of INDICATORS.order) {
    const cat = INDICATORS.categories[code];
    acc[cat.set].total += cat.indicators.length;
    for (const ind of cat.indicators) {
      const e = entries[ind.code];
      if (isEntryComplete(e)) {
        acc[cat.set].sum += e.score;
        acc[cat.set].n += 1;
      }
    }
  }
  const out = {} as Record<SetCode, SetScore>;
  for (const s of setCodes) {
    const a = acc[s];
    out[s] = {
      setCode: s,
      score: a.n === 0 ? 0 : Math.round((a.sum / (a.n * 5)) * 100),
      entered: a.n,
      total: a.total,
      complete: a.n > 0 && a.n === a.total,
    };
  }
  return out;
}

export function computeOverallScore(
  entries: Record<string, IndicatorEntry>,
): { score: number; entered: number; total: number; ef: number } {
  let sum = 0;
  let n = 0;
  for (const code of Object.keys(entries)) {
    const e = entries[code];
    if (!isEntryComplete(e)) continue;
    sum += e.score;
    n++;
  }
  const score = n === 0 ? 0 : Math.round((sum / (n * 5)) * 100);
  // Rough EF (gha/capita): 100 → 2.5, 0 → 8.0
  const ef = +(8.0 - (score / 100) * 5.5).toFixed(2);
  return { score, entered: n, total: TOTAL_INDICATORS, ef };
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
