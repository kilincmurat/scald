'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useWeights } from '@/stores/weights';
import { INDICATORS, type SetCode } from '@/lib/scald-indicators';
import { SET_THEME } from '@/lib/scores';
import {
  ArrowLeft,
  Loader2,
  RotateCcw,
  Save,
  AlertCircle,
  Info,
} from 'lucide-react';
import { clsx } from 'clsx';

const SETS: SetCode[] = ['ES', 'SS', 'MS', 'ECS'];

export function WeightsAdmin() {
  const loaded = useWeights((s) => s.loaded);
  const loadOverrides = useWeights((s) => s.loadOverrides);
  const resetAll = useWeights((s) => s.resetAll);
  const map = useWeights((s) => s.categoryWeights);
  const saveCategoryWeight = useWeights((s) => s.saveCategoryWeight);
  const resetCategoryWeight = useWeights((s) => s.resetCategoryWeight);

  const [setFilter, setSetFilter] = useState<'all' | SetCode>('all');
  const [resetting, setResetting] = useState(false);
  const [resetErr, setResetErr] = useState<string | null>(null);

  useEffect(() => {
    void loadOverrides();
  }, [loadOverrides]);

  const cats = useMemo(() => {
    const all = INDICATORS.order.map((code) => INDICATORS.categories[code]);
    return setFilter === 'all' ? all : all.filter((c) => c.set === setFilter);
  }, [setFilter]);

  const doResetAll = async () => {
    if (!confirm('Reset every category weight to 1 (equal)? This cannot be undone.')) return;
    setResetting(true);
    setResetErr(null);
    const res = await resetAll();
    setResetting(false);
    if (!res.ok) setResetErr(res.error ?? 'Reset failed');
  };

  return (
    <div className="p-4 lg:p-6 space-y-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <Link
          href="/admin"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-700"
        >
          <ArrowLeft className="h-4 w-4" /> Admin panel
        </Link>
        <button
          onClick={doResetAll}
          disabled={resetting || !loaded}
          className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700 transition hover:bg-red-100 disabled:opacity-50"
        >
          {resetting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RotateCcw className="h-3.5 w-3.5" />}
          Reset all to equal
        </button>
      </div>

      <div className="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" />
        <div className="text-xs text-slate-600 leading-relaxed">
          Only <b>category</b> weights are tunable. Each of the 4 sets always
          contributes 25% to the overall score, and all indicators inside a
          category count the same. Weight <b>1</b> = equal; higher values push
          that category&apos;s score with more influence on its set. Zero means
          the category is ignored.
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {(['all', ...SETS] as const).map((s) => (
          <button
            key={s}
            onClick={() => setSetFilter(s)}
            className={clsx(
              'rounded-full px-2.5 py-1 text-[11px] font-medium transition',
              setFilter === s ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200',
            )}
          >
            {s === 'all' ? 'All sets' : SET_THEME[s].fullName}
          </button>
        ))}
      </div>

      {!loaded ? (
        <div className="flex items-center justify-center rounded-xl border border-slate-200 bg-white py-16 text-sm text-slate-500 shadow-sm">
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Loading weights…
        </div>
      ) : resetErr ? (
        <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
          <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          {resetErr}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {cats.map((cat) => {
            const theme = SET_THEME[cat.set];
            return (
              <WeightRow
                key={cat.code}
                title={cat.name}
                code={cat.code}
                indicatorCount={cat.indicators.length}
                chipClass={theme.chip}
                currentValue={map[cat.code]}
                onSave={(w) => saveCategoryWeight(cat.code, w)}
                onReset={() => resetCategoryWeight(cat.code)}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

function WeightRow({
  title,
  code,
  indicatorCount,
  chipClass,
  currentValue,
  onSave,
  onReset,
}: {
  title: string;
  code: string;
  indicatorCount: number;
  chipClass: string;
  currentValue: number | undefined;
  onSave: (weight: number) => Promise<{ ok: boolean; error?: string }>;
  onReset: () => Promise<{ ok: boolean; error?: string }>;
}) {
  const defaultValue = 1;
  const initial = currentValue ?? defaultValue;
  const [value, setValue] = useState<string>(String(initial));
  const [busy, setBusy] = useState<'save' | 'reset' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [flash, setFlash] = useState(false);

  useEffect(() => {
    setValue(String(currentValue ?? defaultValue));
  }, [currentValue]);

  const isOverride = typeof currentValue === 'number';
  const parsed = Number(value.replace(',', '.'));
  const valid = Number.isFinite(parsed) && parsed >= 0;
  const changed = valid && parsed !== (currentValue ?? defaultValue);

  const doSave = async () => {
    if (!valid) return;
    setBusy('save');
    setError(null);
    const res = await onSave(parsed);
    setBusy(null);
    if (!res.ok) setError(res.error ?? 'Save failed');
    else {
      setFlash(true);
      setTimeout(() => setFlash(false), 1200);
    }
  };

  const doReset = async () => {
    setBusy('reset');
    setError(null);
    const res = await onReset();
    setBusy(null);
    if (!res.ok) setError(res.error ?? 'Reset failed');
    else setValue(String(defaultValue));
  };

  return (
    <div
      className={clsx(
        'flex flex-wrap items-center gap-3 rounded-xl border bg-white p-3 shadow-sm transition',
        flash ? 'border-emerald-300 ring-2 ring-emerald-200' : 'border-slate-200',
      )}
    >
      <span className={clsx('inline-block rounded px-1.5 py-0.5 text-[10px] font-bold', chipClass)}>
        {code}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-slate-800 truncate">{title}</p>
        <p className="truncate text-[10px] text-slate-400">
          {indicatorCount} indicators · {isOverride ? 'custom weight' : 'default (1)'}
        </p>
      </div>
      <input
        type="text"
        inputMode="decimal"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className={clsx(
          'w-20 rounded-lg border px-2 py-1.5 text-right text-sm font-semibold outline-none focus:ring-2 focus:ring-slate-200',
          valid ? 'border-slate-200 bg-slate-50 focus:bg-white focus:border-slate-400' : 'border-red-300 bg-red-50 text-red-700',
        )}
      />
      <button
        onClick={doSave}
        disabled={busy !== null || !valid || !changed}
        className="inline-flex items-center gap-1 rounded-lg bg-slate-900 px-2.5 py-1.5 text-[11px] font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
      >
        {busy === 'save' ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
        Save
      </button>
      <button
        onClick={doReset}
        disabled={busy !== null || !isOverride}
        className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-[11px] font-medium text-slate-500 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
      >
        {busy === 'reset' ? <Loader2 className="h-3 w-3 animate-spin" /> : <RotateCcw className="h-3 w-3" />}
        Reset
      </button>
      {error && (
        <div className="w-full text-[11px] text-red-600">
          <AlertCircle className="mr-1 inline h-3 w-3" />
          {error}
        </div>
      )}
    </div>
  );
}
