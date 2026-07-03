/**
 * Automatic 0–5 scoring based on the SCALD threshold cells in the xlsx.
 *
 * Threshold cell shapes handled:
 *   "None"                → non-numeric, treated as "no data"
 *   ">7000", "> 7000"     → strict greater than
 *   "<3000", "< 3000"     → strict less than
 *   "≥ 90", "≥90"         → greater or equal
 *   "≤ 20", "≤20"         → less or equal
 *   "15.1-30"             → inclusive range [15.1, 30]
 *   "15.1–30"             → same, en-dash
 *   "0.1–0.5"             → decimal range
 *   "1"                   → exact match
 *   "0.6–1"               → decimal range
 *   "3000-4999"           → range with comma-free integers
 *   Categorical labels (e.g. "Fully implemented", "Maturity level") → unparseable
 */

const NON_NUMERIC_KEYWORDS =
  /^(none|no\s|maturity|excellent|good|moderate|weak|critical|planned|partial|basic|regular|verified|full|fully|planning|pilot|approved|prepared|comprehensive|integrated|operational|inventory|standardi|preliminary|primary|secondary|tertiary|untreated)/i;

function normalizeNumber(s: string): number | null {
  const cleaned = s.replace(/,/g, '').replace(/\s/g, '');
  if (cleaned === '') return null;
  const n = parseFloat(cleaned);
  return Number.isFinite(n) ? n : null;
}

type Rule = { test: (v: number) => boolean };

function parseThreshold(raw: string): Rule | null {
  if (!raw) return null;
  const s = raw.trim().replace(/[≥]/g, '>=').replace(/[≤]/g, '<=');
  if (NON_NUMERIC_KEYWORDS.test(s)) return null;

  // Range: N-M with various dashes (hyphen, en-dash, em-dash)
  const rangeMatch = s.match(
    /^(-?\d[\d,\.]*)\s*[-–—]\s*(-?\d[\d,\.]*)$/,
  );
  if (rangeMatch) {
    const low = normalizeNumber(rangeMatch[1]);
    const high = normalizeNumber(rangeMatch[2]);
    if (low !== null && high !== null) {
      const lo = Math.min(low, high);
      const hi = Math.max(low, high);
      return { test: (v) => v >= lo && v <= hi };
    }
  }

  // Comparison operators: >, >=, <, <=
  const compMatch = s.match(/^([><]=?)\s*(-?\d[\d,\.]*)$/);
  if (compMatch) {
    const op = compMatch[1];
    const n = normalizeNumber(compMatch[2]);
    if (n !== null) {
      if (op === '>') return { test: (v) => v > n };
      if (op === '>=') return { test: (v) => v >= n };
      if (op === '<') return { test: (v) => v < n };
      if (op === '<=') return { test: (v) => v <= n };
    }
  }

  // Exact number
  const num = normalizeNumber(s);
  if (num !== null) {
    return { test: (v) => v === num };
  }

  return null;
}

/**
 * True if this indicator can be auto-scored (at least one of scores 1–5 is a
 * parseable numeric rule).
 */
export function isNumericIndicator(thresholds: string[]): boolean {
  for (let i = 1; i <= 5; i++) {
    if (parseThreshold(thresholds[i] ?? '')) return true;
  }
  return false;
}

/**
 * Given a raw string value and the 6 threshold strings, return the matching
 * 0–5 score, or null if no rule matches (or raw is non-numeric).
 * Iteration order: 5 → 1 → 0. First match wins.
 */
export function autoScore(rawValue: string, thresholds: string[]): number | null {
  const trimmed = rawValue.trim();
  if (trimmed === '') return null;
  const value = normalizeNumber(trimmed);
  if (value === null) return null;

  // Try scores 5 down to 1
  for (let s = 5; s >= 1; s--) {
    const rule = parseThreshold(thresholds[s] ?? '');
    if (rule && rule.test(value)) return s;
  }

  // Special: if value is 0 and no rule matched, treat as "None" (score 0)
  if (value === 0) return 0;

  return null;
}
