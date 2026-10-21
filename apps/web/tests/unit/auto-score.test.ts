/**
 * Scoring of typed values against the V6 bands, and the thousands-slip hint.
 * Both work on the real indicator set, so a change to the workbook data that
 * breaks either shows up here.
 */
import { describe, it, expect } from 'vitest';
import { autoScore, ambiguousNumber, isNoData, NO_DATA_VALUE } from '@/lib/auto-score';
import { INDICATORS, type Indicator } from '@/lib/scald-indicators';

const ALL: Indicator[] = INDICATORS.order.flatMap((c) => INDICATORS.categories[c].indicators);
const byCode = (code: string) => ALL.find((i) => i.code === code)!.thresholds;

describe('V6 bands', () => {
  it('">A–≤B" bands include the upper edge only (higher is better)', () => {
    const t = byCode('ES_GI1'); // 0 · >0–≤15 · >15–≤30 · >30–≤45 · >45–≤60 · >60
    expect(autoScore('0', t)).toBe(0);
    expect(autoScore('15', t)).toBe(1);
    expect(autoScore('15.01', t)).toBe(2);
    expect(autoScore('60', t)).toBe(4);
    expect(autoScore('61', t)).toBe(5);
  });

  it('lower is better: "≥0–≤130" is the top band, "None" is no data', () => {
    const t = byCode('ES_WT3'); // None · >250 · >220–≤250 · >190–≤220 · >130–≤190 · ≥0–≤130
    expect(autoScore('0', t)).toBe(5);
    expect(autoScore('130', t)).toBe(5);
    expect(autoScore('130.5', t)).toBe(4);
    expect(autoScore('250', t)).toBe(2);
    expect(autoScore('251', t)).toBe(1);
  });

  it('"No data" is recognised as such, and nothing else is', () => {
    expect(isNoData(NO_DATA_VALUE)).toBe(true);
    expect(isNoData(` ${NO_DATA_VALUE} `)).toBe(true);
    expect(isNoData('0')).toBe(false);
    expect(isNoData('')).toBe(false);
  });
});

describe('thousands-slip hint', () => {
  it('offers the thousands reading when the decimal one is far off the bands', () => {
    expect(ambiguousNumber('4.500', byCode('ES_EN2'))).toEqual({ readAs: 4.5, suggestion: '4500' });
    expect(ambiguousNumber('7.500', byCode('ES_GI3'))).toEqual({ readAs: 7.5, suggestion: '7500' });
  });

  it('offers the decimal reading of "1,500" when that one fits the bands', () => {
    expect(ambiguousNumber('1,500', byCode('ES_IN1'))).toEqual({ readAs: 1500, suggestion: '1.5' });
  });

  it('stays quiet when the value as read is already plausible', () => {
    expect(ambiguousNumber('1.204', byCode('ES_IN1'))).toBeNull();
    expect(ambiguousNumber('37.500', byCode('ES_GI1'))).toBeNull();
    expect(ambiguousNumber('40', byCode('ES_GI1'))).toBeNull();
  });

  it('never flags a three-decimal value that lies inside an indicator’s own bands', () => {
    const falseAlarms: string[] = [];
    for (const ind of ALL) {
      const edges = ind.thresholds
        .slice(1)
        .flatMap((t) => t.match(/\d+(?:\.\d+)?/g) ?? [])
        .map(Number)
        .filter((n) => n > 0);
      for (const edge of edges) {
        const value = (edge * 0.999).toFixed(3); // just inside the band edge
        if (!/^[1-9]\d{0,2}\.\d{3}$/.test(value)) continue;
        if (ambiguousNumber(value, ind.thresholds)) falseAlarms.push(`${ind.code} ${value}`);
      }
    }
    expect(falseAlarms).toEqual([]);
  });
});
