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

/**
 * Parse a number string.
 *
 * Comma handling (applies always — ambiguity is resolvable via digit count):
 *   - "1,000"     → 1000     English thousands separator (exactly 3 digits after)
 *   - "1,234,567" → 1234567  Multi-group English thousands
 *   - "0,5"       → 0.5      European decimal separator
 *   - "10,01"     → 10.01    European decimal
 *
 * Period handling: standard by default (e.g. "1.245" → 1.245). Only when
 * parsing THRESHOLD strings from the xlsx do we apply the additional heuristic
 * that "N.NNN" (non-zero leading digit + exactly 3 digits after) is a European
 * thousands separator — so "15.000" → 15000 and "2.501" → 2501 in threshold
 * context, but "1.245" typed by the user stays 1.245.
 */
function normalizeNumber(s: string, opts: { threshold?: boolean } = {}): number | null {
  let cleaned = s.trim().replace(/\s/g, '');
  if (cleaned === '') return null;
  const negative = cleaned.startsWith('-');
  if (negative) cleaned = cleaned.slice(1);

  // Comma pass: repeatedly strip English thousands groups. Everything else
  // is treated as European decimal comma.
  while (cleaned.includes(',')) {
    const engMatch = cleaned.match(/^(\d+),(\d{3})(?!\d)(.*)$/);
    if (engMatch) {
      cleaned = engMatch[1] + engMatch[2] + engMatch[3];
    } else {
      cleaned = cleaned.replace(',', '.');
    }
  }

  if (opts.threshold) {
    const euroPeriod = cleaned.match(/^([1-9]\d*)\.(\d{3})$/);
    if (euroPeriod) cleaned = euroPeriod[1] + euroPeriod[2];
  }

  const n = parseFloat(cleaned);
  if (!Number.isFinite(n)) return null;
  return negative ? -n : n;
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
    const low = normalizeNumber(rangeMatch[1], { threshold: true });
    const high = normalizeNumber(rangeMatch[2], { threshold: true });
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
    const n = normalizeNumber(compMatch[2], { threshold: true });
    if (n !== null) {
      if (op === '>') return { test: (v) => v > n };
      if (op === '>=') return { test: (v) => v >= n };
      if (op === '<') return { test: (v) => v < n };
      if (op === '<=') return { test: (v) => v <= n };
    }
  }

  // Exact number
  const num = normalizeNumber(s, { threshold: true });
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
