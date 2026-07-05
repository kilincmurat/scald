'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { INDICATORS, type SetCode } from '@/lib/scald-indicators';
import { useThresholds } from '@/stores/thresholds';
import { SET_THEME } from '@/lib/scores';
import { Search, Sliders, ArrowLeft, X, Loader2, RotateCcw, Save, AlertCircle } from 'lucide-react';
import { clsx } from 'clsx';

const SCORE_COLORS = ['bg-slate-300', 'bg-red-400', 'bg-orange-400', 'bg-amber-400', 'bg-lime-400', 'bg-emerald-500'];

export function IndicatorAdmin() {
  const overrides = useThresholds((s) => s.overrides);
  const loaded = useThresholds((s) => s.loaded);
  const loadOverrides = useThresholds((s) => s.loadOverrides);

  const [q, setQ] = useState('');
  const [setFilter, setSetFilter] = useState<'all' | SetCode>('all');
  const [editing, setEditing] = useState<string | null>(null);

  useEffect(() => {
    if (!loaded) void loadOverrides();
  }, [loaded, loadOverrides]);

  const rows = useMemo(() => {
    const list: Array<{
      code: string;
      name: string;
      unit: string;
      categoryCode: string;
      categoryName: string;
      setCode: SetCode;
      hasOverride: boolean;
    }> = [];
    for (const catCode of INDICATORS.order) {
      const cat = INDICATORS.categories[catCode];
      for (const ind of cat.indicators) {
        list.push({
          code: ind.code,
          name: ind.name,
          unit: ind.unit,
          categoryCode: catCode,
          categoryName: cat.name,
          setCode: cat.set,
          hasOverride: !!overrides[ind.code],
        });
      }
    }
    return list;
  }, [overrides]);

  const filtered = rows.filter((r) => {
    if (setFilter !== 'all' && r.setCode !== setFilter) return false;
    if (q.trim() === '') return true;
    const s = q.trim().toLowerCase();
    return (
      r.code.toLowerCase().includes(s) ||
      r.name.toLowerCase().includes(s) ||
      r.categoryName.toLowerCase().includes(s)
    );
  });

  return (
    <div className="p-4 lg:p-6 space-y-5">
      <Link
        href="/admin"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-700"
      >
        <ArrowLeft className="h-4 w-4" /> Admin panel
      </Link>

      {/* Filters */}
      <section className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm lg:flex-row lg:items-center lg:justify-between">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search by code, name or category…"
            className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-sm text-slate-900 outline-none focus:border-slate-400 focus:bg-white focus:ring-2 focus:ring-slate-200"
          />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {(['all', 'ES', 'SS', 'MS', 'ECS'] as const).map((s) => (
            <button
              key={s}
              onClick={() => setSetFilter(s)}
              className={clsx(
                'rounded-full px-2.5 py-1 text-[11px] font-medium transition',
                setFilter === s ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200',
              )}
            >
              {s === 'all' ? 'All sets' : s}
            </button>
          ))}
        </div>
      </section>

      {/* Table */}
      <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
          <p className="text-xs font-semibold text-slate-500">
            {filtered.length} indicators · {Object.keys(overrides).length} overrides active
          </p>
          <p className="text-[10px] text-slate-400">Click a row to edit its thresholds</p>
        </div>
        <div className="max-h-[70vh] overflow-y-auto">
          <table className="w-full text-xs">
            <thead className="sticky top-0 bg-white text-slate-500">
              <tr className="border-b border-slate-100">
                <th className="px-4 py-2 text-left font-medium">Code</th>
                <th className="px-4 py-2 text-left font-medium">Indicator</th>
                <th className="hidden px-4 py-2 text-left font-medium sm:table-cell">Unit</th>
                <th className="px-4 py-2 text-right font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => {
                const theme = SET_THEME[r.setCode];
                return (
                  <tr
                    key={r.code}
                    onClick={() => setEditing(r.code)}
                    className="cursor-pointer border-b border-slate-50 last:border-b-0 transition hover:bg-slate-50"
                  >
                    <td className="px-4 py-2.5">
                      <span className={clsx('rounded px-1.5 py-0.5 text-[10px] font-bold', theme.chip)}>
                        {r.code}
                      </span>
                    </td>
                    <td className="px-4 py-2.5">
                      <p className="font-medium text-slate-800">{r.name}</p>
                      <p className="text-[10px] text-slate-400">{r.categoryName}</p>
                    </td>
                    <td className="hidden px-4 py-2.5 text-slate-600 sm:table-cell">{r.unit}</td>
                    <td className="px-4 py-2.5 text-right">
                      {r.hasOverride ? (
                        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
                          overridden
                        </span>
                      ) : (
                        <span className="text-[10px] text-slate-400">default</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {editing && <EditModal indicatorCode={editing} onClose={() => setEditing(null)} />}
    </div>
  );
}

function findIndicator(code: string) {
  for (const catCode of INDICATORS.order) {
    const cat = INDICATORS.categories[catCode];
    const ind = cat.indicators.find((i) => i.code === code);
    if (ind) return { indicator: ind, categoryCode: catCode, category: cat };
  }
  return null;
}

function EditModal({ indicatorCode, onClose }: { indicatorCode: string; onClose: () => void }) {
  const found = findIndicator(indicatorCode);
  const overrides = useThresholds((s) => s.overrides);
  const saveOverride = useThresholds((s) => s.saveOverride);
  const deleteOverride = useThresholds((s) => s.deleteOverride);

  const initial = overrides[indicatorCode] ?? (found?.indicator.thresholds as unknown as string[]);
  const [values, setValues] = useState<string[]>(initial ? [...initial] : ['', '', '', '', '', '']);
  const [busy, setBusy] = useState<'save' | 'delete' | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!found) return null;
  const { indicator, category } = found;
  const theme = SET_THEME[category.set];

  const isOverridden = !!overrides[indicatorCode];

  const handleSave = async () => {
    if (values.some((v) => !v.trim())) {
      setError('All 6 thresholds must be filled.');
      return;
    }
    setBusy('save');
    setError(null);
    const res = await saveOverride(indicatorCode, values as [string, string, string, string, string, string]);
    setBusy(null);
    if (res.ok) onClose();
    else setError(res.error ?? 'Save failed');
  };

  const handleDelete = async () => {
    setBusy('delete');
    setError(null);
    const res = await deleteOverride(indicatorCode);
    setBusy(null);
    if (res.ok) onClose();
    else setError(res.error ?? 'Delete failed');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 lg:p-6">
      <div className="flex h-[92vh] w-full max-w-3xl flex-col rounded-2xl border border-slate-200 bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3">
          <div className="flex items-center gap-2">
            <span className={clsx('rounded px-1.5 py-0.5 text-[11px] font-bold', theme.chip)}>
              {indicator.code}
            </span>
            <div>
              <h3 className="text-sm font-semibold text-slate-900">{indicator.name}</h3>
              <p className="text-[10px] text-slate-500">
                {category.name} · {indicator.unit}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 lg:p-6">
          <p className="text-xs text-slate-500">
            Edit the 6 threshold cells below. Score 0 = No data, 5 = Best. Numeric formats:
            <code className="mx-1 rounded bg-slate-100 px-1">&gt;100</code>,
            <code className="mx-1 rounded bg-slate-100 px-1">3000-4999</code>,
            <code className="mx-1 rounded bg-slate-100 px-1">15.000</code> (European thousands),
            <code className="mx-1 rounded bg-slate-100 px-1">0,5</code> (European decimal).
          </p>

          {indicator.method && (
            <div className="mt-3 rounded-lg border border-slate-100 bg-slate-50 p-3 text-[11px] leading-relaxed text-slate-600 whitespace-pre-line">
              <span className="font-semibold text-slate-700">Method: </span>
              {indicator.method}
            </div>
          )}

          <div className="mt-4 space-y-2">
            {values.map((v, i) => (
              <div key={i} className="flex items-center gap-2">
                <div
                  className={clsx(
                    'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-xs font-bold text-white',
                    SCORE_COLORS[i],
                  )}
                >
                  {i}
                </div>
                <input
                  type="text"
                  value={v}
                  onChange={(e) => {
                    const next = [...values];
                    next[i] = e.target.value;
                    setValues(next);
                  }}
                  placeholder={i === 0 ? 'None' : `Threshold for score ${i}`}
                  className="flex-1 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-400 focus:bg-white focus:ring-2 focus:ring-slate-200"
                />
              </div>
            ))}
          </div>

          {error && (
            <div className="mt-3 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
              <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              {error}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between gap-2 border-t border-slate-200 px-5 py-3">
          {isOverridden ? (
            <button
              onClick={handleDelete}
              disabled={busy !== null}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-slate-600 transition hover:border-red-200 hover:text-red-600 disabled:opacity-50"
            >
              {busy === 'delete' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RotateCcw className="h-3.5 w-3.5" />}
              Reset to default
            </button>
          ) : (
            <span className="text-[10px] text-slate-400">
              <Sliders className="mr-1 inline h-3 w-3" />
              Currently using JSON defaults
            </span>
          )}
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-slate-600 transition hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={busy !== null}
              className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white transition hover:bg-slate-800 disabled:opacity-50"
            >
              {busy === 'save' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
              Save override
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
