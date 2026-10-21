/**
 * The data-entry store's save queue. Every case here is a way a value could be
 * silently lost — which is exactly what happened before the queue existed: the
 * service swallowed errors, so a failed save looked like a successful one.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Real SaveError (the store checks `instanceof`), mocked network calls.
vi.mock('@/lib/data-entry-service', async (importOriginal) => {
  const real = await importOriginal<typeof import('@/lib/data-entry-service')>();
  return {
    ...real,
    fetchServerSnapshot: vi.fn(),
    upsertEntry: vi.fn(),
    deleteEntry: vi.fn(),
    upsertCategoryCompletion: vi.fn(() => Promise.resolve()),
    deleteCategoryCompletion: vi.fn(() => Promise.resolve()),
    upsertBadge: vi.fn(() => Promise.resolve()),
    deleteBadge: vi.fn(() => Promise.resolve()),
    deleteYearData: vi.fn(() => Promise.resolve()),
  };
});

import * as svc from '@/lib/data-entry-service';
import { SaveError } from '@/lib/data-entry-service';
import { useDataEntry } from '@/stores/data-entry';
import { INDICATORS } from '@/lib/scald-indicators';

const MUNI = 'm-1';
const YEAR = 2025;
const offline = () => new SaveError('Failed to fetch', true);
const refused = () => new SaveError('new row violates row-level security policy', false);
const tick = () => new Promise((r) => setTimeout(r, 0));

/** A promise the test resolves/rejects by hand, to catch a write mid-flight. */
function deferred() {
  let resolve!: () => void;
  let reject!: (e: unknown) => void;
  const promise = new Promise<void>((res, rej) => ((resolve = res), (reject = rej)));
  return { promise, resolve, reject };
}

// A required and an optional indicator of the same category, from the real set.
const cat = INDICATORS.order.map((c) => INDICATORS.categories[c]).find(
  (c) => c.indicators.some((i) => i.optional) && c.indicators.some((i) => !i.optional),
)!;
const REQUIRED = cat.indicators.find((i) => !i.optional)!.code;
const OPTIONAL = cat.indicators.find((i) => i.optional)!.code;

beforeEach(() => {
  vi.mocked(svc.upsertEntry).mockReset().mockResolvedValue(undefined);
  vi.mocked(svc.deleteEntry).mockReset().mockResolvedValue(undefined);
  vi.mocked(svc.fetchServerSnapshot).mockReset();
  vi.mocked(svc.deleteCategoryCompletion).mockClear();
  vi.mocked(svc.deleteYearData).mockClear();
  useDataEntry.setState({
    municipalityId: MUNI,
    selectedYear: YEAR,
    entriesByYear: {},
    completedByYear: {},
    badgesByYear: {},
    entries: {},
    completed: {},
    badges: [],
    pending: {},
    lastError: null,
    syncStatus: 'idle',
  });
});

describe('saving a value', () => {
  it('a successful save leaves nothing queued', async () => {
    useDataEntry.getState().saveEntry(REQUIRED, 3, '40');
    await tick();
    const s = useDataEntry.getState();
    expect(s.pending).toEqual({});
    expect(s.syncStatus).toBe('idle');
  });

  it('a save that fails for lack of connection stays queued and is shown as not saved', async () => {
    vi.mocked(svc.upsertEntry).mockRejectedValue(offline());
    useDataEntry.getState().saveEntry(REQUIRED, 3, '40');
    await tick();
    const s = useDataEntry.getState();
    expect(Object.keys(s.pending)).toHaveLength(1);
    expect(s.syncStatus).toBe('error');
    expect(s.entries[REQUIRED].rawValue).toBe('40'); // still on screen
  });

  it('the queued value is sent when the connection returns', async () => {
    vi.mocked(svc.upsertEntry).mockRejectedValueOnce(offline());
    useDataEntry.getState().saveEntry(REQUIRED, 3, '40');
    await tick();
    await useDataEntry.getState().flushPending();
    expect(svc.upsertEntry).toHaveBeenLastCalledWith(MUNI, REQUIRED, 3, '40', YEAR);
    expect(useDataEntry.getState().pending).toEqual({});
    expect(useDataEntry.getState().syncStatus).toBe('idle');
  });

  it('a save the server refuses is not retried forever, and says why', async () => {
    vi.mocked(svc.upsertEntry).mockRejectedValue(refused());
    useDataEntry.getState().saveEntry(REQUIRED, 3, '40');
    await tick();
    const s = useDataEntry.getState();
    expect(s.pending).toEqual({});
    expect(s.lastError).toMatch(/locked/);
  });

  it('a newer value typed while the older one is being sent is not dropped', async () => {
    const first = deferred();
    vi.mocked(svc.upsertEntry).mockReturnValueOnce(first.promise).mockRejectedValueOnce(offline());
    useDataEntry.getState().saveEntry(REQUIRED, 3, '40'); // in flight
    useDataEntry.getState().saveEntry(REQUIRED, 4, '50'); // newer — fails offline
    await tick();
    first.resolve(); // the OLD write lands afterwards
    await tick();
    const queued = Object.values(useDataEntry.getState().pending);
    expect(queued).toHaveLength(1);
    expect(queued[0]).toMatchObject({ op: 'upsert', raw: '50' });
  });
});

describe('closing the page', () => {
  it('unsaved changes survive a reload and are sent afterwards', async () => {
    vi.mocked(svc.upsertEntry).mockRejectedValue(offline());
    useDataEntry.getState().saveEntry(REQUIRED, 3, '40');
    await tick();
    const stored = localStorage.getItem('scald-data-entry')!;

    // A fresh tab: nothing in memory, storage as the closed tab left it.
    useDataEntry.setState({ pending: {}, entries: {}, entriesByYear: {} });
    localStorage.setItem('scald-data-entry', stored);
    await useDataEntry.persist.rehydrate();
    expect(Object.keys(useDataEntry.getState().pending)).toEqual([`${MUNI}:${YEAR}:${REQUIRED}`]);

    vi.mocked(svc.upsertEntry).mockResolvedValue(undefined);
    await useDataEntry.getState().flushPending();
    expect(svc.upsertEntry).toHaveBeenLastCalledWith(MUNI, REQUIRED, 3, '40', YEAR);
    expect(useDataEntry.getState().pending).toEqual({});
  });
});

describe('removing a value', () => {
  it('emptying a required value un-completes its category', async () => {
    useDataEntry.setState({
      entriesByYear: { [YEAR]: { [REQUIRED]: { score: 3, rawValue: '40', enteredAt: 1 } } },
      entries: { [REQUIRED]: { score: 3, rawValue: '40', enteredAt: 1 } },
      completedByYear: { [YEAR]: { [cat.code]: true } },
      completed: { [cat.code]: true },
    });
    useDataEntry.getState().clearEntry(REQUIRED);
    await tick();
    const s = useDataEntry.getState();
    expect(s.entries[REQUIRED]).toBeUndefined();
    expect(s.completed[cat.code]).toBeUndefined();
    expect(svc.deleteEntry).toHaveBeenCalledWith(MUNI, REQUIRED, YEAR);
    expect(svc.deleteCategoryCompletion).toHaveBeenCalledWith(MUNI, cat.code, YEAR);
  });

  it('emptying an optional value leaves the category complete', async () => {
    useDataEntry.setState({
      entriesByYear: { [YEAR]: { [OPTIONAL]: { score: 2, rawValue: '5', enteredAt: 1 } } },
      entries: { [OPTIONAL]: { score: 2, rawValue: '5', enteredAt: 1 } },
      completedByYear: { [YEAR]: { [cat.code]: true } },
      completed: { [cat.code]: true },
    });
    useDataEntry.getState().clearEntry(OPTIONAL);
    await tick();
    expect(useDataEntry.getState().completed[cat.code]).toBe(true);
    expect(svc.deleteCategoryCompletion).not.toHaveBeenCalled();
  });
});

describe('clearing a year', () => {
  it('deletes only the selected year, and drops that year’s queued writes', async () => {
    useDataEntry.setState({
      entriesByYear: {
        2025: { [REQUIRED]: { score: 3, rawValue: '40', enteredAt: 1 } },
        2026: { [REQUIRED]: { score: 1, rawValue: '5', enteredAt: 1 } },
      },
      pending: {
        [`${MUNI}:2025:${REQUIRED}`]: { op: 'upsert', municipalityId: MUNI, year: 2025, code: REQUIRED, score: 3, raw: '40' },
        [`${MUNI}:2026:${REQUIRED}`]: { op: 'upsert', municipalityId: MUNI, year: 2026, code: REQUIRED, score: 1, raw: '5' },
      },
    });
    useDataEntry.getState().reset();
    await tick();
    const s = useDataEntry.getState();
    expect(s.entriesByYear[2025]).toBeUndefined();
    expect(s.entriesByYear[2026][REQUIRED].rawValue).toBe('5');
    expect(Object.keys(s.pending)).toEqual([`${MUNI}:2026:${REQUIRED}`]);
    expect(svc.deleteYearData).toHaveBeenCalledWith(MUNI, 2025);
  });
});

describe('loading from the server', () => {
  it('keeps unsaved local values on top of the server copy', async () => {
    useDataEntry.setState({
      pending: {
        [`${MUNI}:${YEAR}:${REQUIRED}`]: { op: 'upsert', municipalityId: MUNI, year: YEAR, code: REQUIRED, score: 4, raw: '50' },
      },
    });
    vi.mocked(svc.upsertEntry).mockRejectedValue(offline()); // still offline after load
    vi.mocked(svc.fetchServerSnapshot).mockResolvedValue({
      entries: [{ indicator_code: REQUIRED, category_code: cat.code, set_code: cat.set, score: 3, raw_value: '40', year: YEAR, updated_at: '2026-01-01' }],
      completions: [],
      badges: [],
    });
    await useDataEntry.getState().loadMunicipality(MUNI);
    await tick();
    expect(useDataEntry.getState().entries[REQUIRED].rawValue).toBe('50');
  });

  it('a failed load keeps what is on screen instead of wiping it', async () => {
    useDataEntry.setState({
      entriesByYear: { [YEAR]: { [REQUIRED]: { score: 3, rawValue: '40', enteredAt: 1 } } },
      entries: { [REQUIRED]: { score: 3, rawValue: '40', enteredAt: 1 } },
    });
    vi.mocked(svc.fetchServerSnapshot).mockResolvedValue(null);
    await useDataEntry.getState().loadMunicipality(MUNI);
    const s = useDataEntry.getState();
    expect(s.entries[REQUIRED].rawValue).toBe('40');
    expect(s.syncStatus).toBe('error');
  });
});
