import raw from './scald-indicators.json';

export type SetCode = 'ES' | 'SS' | 'MS' | 'ECS';

export interface Indicator {
  code: string;
  name: string;
  unit: string;
  method: string;
  thresholds: [string, string, string, string, string, string]; // 0..5
  normalisation: string;
  source: 'v5' | 'v4' | 'v2';
  /** Optional indicators (purple in source workbook) don't block category completion. */
  optional?: boolean;
}

export interface Category {
  code: string;
  set: SetCode;
  name: string;
  indicators: Indicator[];
}

export interface SetMeta {
  name: string;
  color: 'emerald' | 'rose' | 'blue' | 'orange';
}

export interface IndicatorData {
  sets: Record<SetCode, SetMeta>;
  order: string[];
  categories: Record<string, Category>;
}

export const INDICATORS = raw as unknown as IndicatorData;

export const TOTAL_INDICATORS = INDICATORS.order.reduce(
  (sum, code) => sum + INDICATORS.categories[code].indicators.length,
  0,
);

/** Count of indicators required for completion (excludes optional). */
export const REQUIRED_INDICATORS = INDICATORS.order.reduce(
  (sum, code) => sum + INDICATORS.categories[code].indicators.filter((i) => !i.optional).length,
  0,
);

export function requiredCountFor(categoryCode: string): number {
  const cat = INDICATORS.categories[categoryCode];
  if (!cat) return 0;
  return cat.indicators.filter((i) => !i.optional).length;
}

export function getCategory(code: string): Category | undefined {
  return INDICATORS.categories[code];
}

export function getNextCategoryCode(code: string): string | null {
  const idx = INDICATORS.order.indexOf(code);
  if (idx === -1 || idx === INDICATORS.order.length - 1) return null;
  return INDICATORS.order[idx + 1];
}

export function getPrevCategoryCode(code: string): string | null {
  const idx = INDICATORS.order.indexOf(code);
  if (idx <= 0) return null;
  return INDICATORS.order[idx - 1];
}
