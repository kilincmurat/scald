'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { INDICATORS, getNextCategoryCode, type Indicator, type SetCode } from '@/lib/scald-indicators';
import { autoScore, isNumericIndicator, checkOutlier } from '@/lib/auto-score';
import { useDataEntry } from '@/stores/data-entry';
import { useThresholds, getEffectiveThresholds } from '@/stores/thresholds';
import { useProfile } from '@/hooks/useProfile';
import { useSubmission } from '@/hooks/useSubmission';
import { useEffectiveMunicipality } from '@/hooks/useEffectiveMunicipality';
import { canWriteDataEntry } from '@/lib/roles';
import { YearPicker } from './YearPicker';
import { clsx } from 'clsx';
import {
  ArrowLeft,
  CheckCircle2,
  Lock,
  Sparkles,
  Info,
  Zap,
  AlertCircle,
  Eye,
} from 'lucide-react';

const SET_GRADIENT: Record<SetCode, string> = {
  ES: 'from-emerald-500 to-green-600',
  SS: 'from-rose-500 to-pink-600',
  MS: 'from-blue-500 to-indigo-600',
  ECS: 'from-orange-500 to-amber-600',
};

const SET_ACCENT: Record<SetCode, { text: string; bg: string; border: string }> = {
  ES: { text: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-200' },
  SS: { text: 'text-rose-700', bg: 'bg-rose-50', border: 'border-rose-200' },
  MS: { text: 'text-blue-700', bg: 'bg-blue-50', border: 'border-blue-200' },
  ECS: { text: 'text-orange-700', bg: 'bg-orange-50', border: 'border-orange-200' },
};

const SCORE_COLORS = [
  'bg-slate-300',
  'bg-red-400',
  'bg-orange-400',
  'bg-amber-400',
  'bg-lime-400',
  'bg-emerald-500',
];
const SCORE_LABELS = ['No data', 'Very Weak', 'Weak', 'Moderate', 'Good', 'Excellent'];

export function CategoryWizard({ categoryCode }: { categoryCode: string }) {
  const router = useRouter();
  const cat = INDICATORS.categories[categoryCode];
  const setCode = cat.set as SetCode;
  const accent = SET_ACCENT[setCode];

  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const entries = useDataEntry((s) => s.entries);
  const selectedYear = useDataEntry((s) => s.selectedYear);
  const saveEntry = useDataEntry((s) => s.saveEntry);
  const completeCategory = useDataEntry((s) => s.completeCategory);
  const isUnlocked = useDataEntry((s) => s.isCategoryUnlocked(categoryCode));
  const categoryProgress = useDataEntry((s) => s.categoryProgress(categoryCode));
  const isComplete = useDataEntry((s) => s.isCategoryComplete(categoryCode));

  const { profile } = useProfile();
  const { municipalityId } = useEffectiveMunicipality();
  const { locked, submission } = useSubmission(municipalityId, selectedYear);
  const role = profile?.role;
  const isAdmin = role === 'admin';
  // Admin can always edit. data_entry can edit only while the year is unlocked
  // (not submitted/approved). Others (decision_maker, researcher) are read-only.
  const canWrite = isAdmin || (role === 'data_entry' && !locked);
  const lockedForDataEntry = role === 'data_entry' && locked;
  const approvedLock = submission?.status === 'approved';
  const thresholdOverrides = useThresholds((s) => s.overrides);
  const effectiveThresholdsFor = (indicatorCode: string) =>
    getEffectiveThresholds(indicatorCode, thresholdOverrides);

  const [showCelebration, setShowCelebration] = useState(false);

  // Local raw-value state per indicator code (independent of persisted store)
  const [rawValues, setRawValues] = useState<Record<string, string>>({});

  // Hydrate raw values from persisted entries on mount, on category change,
  // and whenever the reporting year switches (each year has its own entries).
  useEffect(() => {
    if (mounted) {
      const initial: Record<string, string> = {};
      for (const ind of cat.indicators) {
        const e = entries[ind.code];
        if (e?.rawValue) initial[ind.code] = e.rawValue;
      }
      setRawValues(initial);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted, categoryCode, selectedYear]);

  // Lock guard
  if (mounted && !isUnlocked && !isComplete) {
    return (
      <div className="p-6">
        <div className="mx-auto max-w-md rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-slate-100">
            <Lock className="h-7 w-7 text-slate-400" />
          </div>
          <h2 className="mt-4 text-lg font-bold text-slate-900">Category Locked</h2>
          <p className="mt-1 text-sm text-slate-500">
            Complete the previous category to unlock <span className="font-semibold">{cat.name}</span>.
          </p>
          <Link
            href="/data-entry"
            className="mt-5 inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            <ArrowLeft className="h-4 w-4" /> Back to data entry
          </Link>
        </div>
      </div>
    );
  }

  const isIndicatorComplete = (code: string) => {
    const e = entries[code];
    if (!e) return false;
    return !!(e.rawValue && e.rawValue.trim().length > 0);
  };

  // Category can be finished when every REQUIRED indicator is filled;
  // optional (purple) ones are bonus and never block completion.
  const requiredInds = cat.indicators.filter((i) => !i.optional);
  const optionalCount = cat.indicators.length - requiredInds.length;
  const optionalFilled = cat.indicators.filter((i) => i.optional && isIndicatorComplete(i.code)).length;
  const allRequiredScored = requiredInds.every((ind) => isIndicatorComplete(ind.code));
  const allScored = allRequiredScored;
  const nextCatCode = getNextCategoryCode(categoryCode);

  // Manual score selection is only used for non-numeric (categorical) indicators
  const handleManualScore = (indicatorCode: string, score: number) => {
    if (!canWrite) return;
    const raw = rawValues[indicatorCode]?.trim();
    if (!raw) return;
    saveEntry(indicatorCode, score, raw);
  };

  const handleRawChange = (indicatorCode: string, value: string) => {
    if (!canWrite) return;
    setRawValues((prev) => ({ ...prev, [indicatorCode]: value }));
    const trimmed = value.trim();
    const indicator = cat.indicators.find((i) => i.code === indicatorCode);
    if (!indicator) return;
    if (!trimmed) return;
    // Auto-scoring: system picks the matching threshold (with admin overrides)
    const thresholds = effectiveThresholdsFor(indicatorCode);
    const score = autoScore(trimmed, thresholds);
    if (score !== null) {
      saveEntry(indicatorCode, score, trimmed);
    } else if (entries[indicatorCode] !== undefined) {
      // Keep existing score, just update raw value
      saveEntry(indicatorCode, entries[indicatorCode].score, trimmed);
    }
  };

  const handleFinish = () => {
    if (!allScored) return;
    completeCategory(categoryCode);
    setShowCelebration(true);
  };

  return (
    <div className="p-6">
      <div className="mx-auto max-w-5xl">
        {/* Back link */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link
            href="/data-entry"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-700"
          >
            <ArrowLeft className="h-4 w-4" /> All categories
          </Link>
          <YearPicker size="sm" label="Reporting year" />
        </div>

        {/* Progress header */}
        <div className="mt-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span
                  className={clsx(
                    'rounded px-2 py-0.5 text-[11px] font-bold',
                    accent.bg,
                    accent.text,
                  )}
                >
                  {cat.code}
                </span>
                <span className="text-xs text-slate-400">
                  {INDICATORS.sets[setCode].name} Sustainability
                </span>
              </div>
              <h2 className="mt-1 text-lg font-bold text-slate-900">{cat.name}</h2>
              <p className="text-xs text-slate-500">
                {optionalCount > 0 ? (
                  <>
                    Fill in {requiredInds.length} required indicators
                    {' · '}
                    <span className="font-medium text-purple-600">
                      {optionalCount} optional (purple) can be skipped
                    </span>
                  </>
                ) : (
                  <>Fill in all {cat.indicators.length} indicators — any order.</>
                )}
              </p>
            </div>
            <div className="text-right">
              <p className="text-3xl font-bold text-slate-900">
                {categoryProgress.done}
                <span className="text-lg font-normal text-slate-400"> / {categoryProgress.total}</span>
              </p>
              <p className="text-xs text-slate-500">indicators scored</p>
            </div>
          </div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
            <div
              className={clsx('h-full rounded-full bg-gradient-to-r transition-all', SET_GRADIENT[setCode])}
              style={{ width: `${categoryProgress.pct}%` }}
            />
          </div>
        </div>

        {lockedForDataEntry ? (
          <div
            className={clsx(
              'mt-4 flex items-start gap-2.5 rounded-lg border px-3.5 py-3 text-xs',
              approvedLock
                ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                : 'border-amber-200 bg-amber-50 text-amber-800',
            )}
          >
            <Lock className={clsx('mt-0.5 h-4 w-4 shrink-0', approvedLock ? 'text-emerald-500' : 'text-amber-500')} />
            <div>
              <p className="font-semibold">
                {approvedLock ? 'Approved & locked' : 'Submitted — locked for review'}
              </p>
              <p className="mt-0.5">
                {approvedLock
                  ? 'This year’s data is approved and final. The values can no longer be edited — contact an administrator if a correction is needed.'
                  : 'This year is submitted and waiting for the decision maker. Editing is locked until they approve or request changes.'}
              </p>
            </div>
          </div>
        ) : !canWrite ? (
          <div className="mt-4 flex items-start gap-2.5 rounded-lg border border-blue-100 bg-blue-50 px-3.5 py-3 text-xs text-blue-800">
            <Eye className="mt-0.5 h-4 w-4 shrink-0 text-blue-500" />
            <div>
              <p className="font-semibold">Read-only view</p>
              <p className="mt-0.5 text-blue-700">
                Data entry personnel of this municipality own the values; you can see progress
                and scores but not change them.
              </p>
            </div>
          </div>
        ) : null}

        {/* Indicator list — all visible on one screen */}
        <div className="mt-5 space-y-4">
          {cat.indicators.map((ind, idx) => (
            <IndicatorRow
              key={ind.code}
              indicator={{ ...ind, thresholds: effectiveThresholdsFor(ind.code) as Indicator['thresholds'] }}
              index={idx}
              setCode={setCode}
              rawValue={rawValues[ind.code] ?? ''}
              currentScore={entries[ind.code]?.score}
              readOnly={!canWrite}
              onRawChange={(v) => handleRawChange(ind.code, v)}
              onManualScore={(s) => handleManualScore(ind.code, s)}
            />
          ))}
        </div>

        {/* Finish bar */}
        <div className="sticky bottom-4 mt-6 flex items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-lg">
          <div className="flex items-center gap-3 text-sm">
            {allScored ? (
              <>
                <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                <span className="font-medium text-slate-700">
                  All {requiredInds.length} required indicators completed
                  {optionalCount > 0 && (
                    <span className="ml-2 text-xs text-purple-600">
                      · {optionalFilled}/{optionalCount} optional filled
                    </span>
                  )}
                </span>
              </>
            ) : (
              <span className="text-slate-500">
                {categoryProgress.total - categoryProgress.done} more required indicator(s) to score
                {optionalCount > 0 && (
                  <span className="ml-2 text-xs text-purple-600">
                    · {optionalCount} optional can be skipped
                  </span>
                )}
              </span>
            )}
          </div>
          {canWrite && (
            <button
              onClick={handleFinish}
              disabled={!allScored}
              className={clsx(
                'inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-semibold text-white transition disabled:opacity-40 disabled:cursor-not-allowed',
                `bg-gradient-to-r ${SET_GRADIENT[setCode]} hover:opacity-90`,
              )}
            >
              Finish category <Sparkles className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* Celebration overlay */}
      {showCelebration && (
        <CelebrationOverlay
          categoryName={cat.name}
          nextCatCode={nextCatCode}
          setCode={setCode}
          onClose={() => {
            setShowCelebration(false);
            router.push('/data-entry');
          }}
          onNext={() => {
            if (nextCatCode) {
              setShowCelebration(false);
              router.push(`/data-entry/${nextCatCode}`);
            } else {
              setShowCelebration(false);
              router.push('/data-entry');
            }
          }}
        />
      )}
    </div>
  );
}

function IndicatorRow({
  indicator,
  index,
  setCode,
  rawValue,
  currentScore,
  readOnly = false,
  onRawChange,
  onManualScore,
}: {
  indicator: Indicator;
  index: number;
  setCode: SetCode;
  rawValue: string;
  currentScore?: number;
  readOnly?: boolean;
  onRawChange: (v: string) => void;
  onManualScore: (score: number) => void;
}) {
  const setAccent = SET_ACCENT[setCode];
  const isOptional = !!indicator.optional;
  const accent = isOptional
    ? { text: 'text-purple-700', bg: 'bg-purple-50', border: 'border-purple-300' }
    : setAccent;
  const [expanded, setExpanded] = useState(true);
  const hasRaw = rawValue.trim().length > 0;
  const isComplete = currentScore !== undefined && hasRaw;
  const isNumeric = isNumericIndicator(indicator.thresholds);
  const autoUnresolved =
    isNumeric && hasRaw && currentScore === undefined;
  // Advisory only — does not block saving.
  const outlier = hasRaw && isNumeric ? checkOutlier(rawValue, indicator.thresholds) : null;

  return (
    <div
      className={clsx(
        'rounded-xl border bg-white shadow-sm transition',
        isComplete ? 'border-emerald-200' : isOptional ? 'border-purple-200' : 'border-slate-200',
      )}
    >
      <div className={clsx(
        'flex items-start gap-3 border-b p-4',
        isOptional ? 'border-purple-100 bg-purple-50/40' : 'border-slate-100',
      )}>
        {/* Index badge */}
        <div
          className={clsx(
            'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-bold',
            isComplete
              ? 'bg-emerald-500 text-white'
              : isOptional
                ? 'bg-purple-100 text-purple-700'
                : `${setAccent.bg} ${setAccent.text}`,
          )}
        >
          {isComplete ? <CheckCircle2 className="h-4 w-4" /> : index + 1}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className={clsx('rounded px-1.5 py-0.5 text-[10px] font-bold', accent.bg, accent.text)}>
              {indicator.code}
            </span>
            {isOptional && (
              <span className="rounded-full bg-purple-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-purple-700 ring-1 ring-purple-200">
                Optional
              </span>
            )}
            <h3 className="text-sm font-semibold text-slate-900">{indicator.name}</h3>
          </div>
          <p className="mt-1 text-xs text-slate-500">
            <span className="font-medium text-slate-700">Unit:</span> {indicator.unit}
            {indicator.normalisation && (
              <span className="ml-2 text-slate-400">· {indicator.normalisation}</span>
            )}
          </p>
        </div>

        <button
          onClick={() => setExpanded((e) => !e)}
          className="rounded-lg border border-slate-200 px-2 py-1 text-[11px] font-medium text-slate-500 transition hover:bg-slate-50"
        >
          {expanded ? 'Collapse' : 'Expand'}
        </button>
      </div>

      {expanded && (
        <div className="p-4 pt-3 space-y-3">
          {indicator.method && (
            <div className="flex items-start gap-2 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2">
              <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" />
              <p className="text-[11px] leading-relaxed text-slate-600 whitespace-pre-line">
                {indicator.method}
              </p>
            </div>
          )}

          {/* Raw + Scores in a flex row */}
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-12">
            <div className="lg:col-span-3">
              <label className="block text-[11px] font-semibold text-slate-600">
                Raw value {isOptional ? (
                  <span className="text-purple-600">(optional)</span>
                ) : (
                  <span className="text-red-500">*</span>
                )}
              </label>
              <input
                type="text"
                value={rawValue}
                onChange={(e) => onRawChange(e.target.value)}
                placeholder={indicator.unit}
                required={!isOptional}
                disabled={readOnly}
                className={clsx(
                  'mt-1 w-full rounded-lg border bg-slate-50 px-3 py-2 text-sm text-slate-900 placeholder-slate-400 outline-none transition focus:bg-white focus:ring-2',
                  readOnly && 'cursor-not-allowed opacity-60',
                  hasRaw
                    ? isOptional
                      ? 'border-purple-200 focus:border-purple-400 focus:ring-purple-200'
                      : 'border-slate-200 focus:border-slate-400 focus:ring-slate-200'
                    : isOptional
                      ? 'border-purple-200 focus:border-purple-500 focus:ring-purple-500/20'
                      : 'border-slate-200 focus:border-emerald-500 focus:ring-emerald-500/20',
                )}
              />
              {!hasRaw && (
                <p className={clsx(
                  'mt-1 text-[10px]',
                  isOptional ? 'text-purple-500' : 'text-slate-400',
                )}>
                  {isOptional ? 'Skip if unavailable' : 'Required'} · in{' '}
                  <span className="font-medium">{indicator.unit}</span>
                </p>
              )}
              {hasRaw && isComplete && isNumeric && (
                <p className="mt-1 flex items-center gap-1 text-[10px] text-emerald-600">
                  <Zap className="h-3 w-3" />
                  Auto-scored: <span className="font-semibold">{currentScore}</span>
                </p>
              )}
              {autoUnresolved && (
                <p className="mt-1 flex items-start gap-1 text-[10px] text-amber-600">
                  <AlertCircle className="mt-0.5 h-3 w-3 shrink-0" />
                  Value doesn't match any threshold. Check the number.
                </p>
              )}
              {outlier && (
                <p className="mt-1 flex items-start gap-1 text-[10px] text-amber-600">
                  <AlertCircle className="mt-0.5 h-3 w-3 shrink-0" />
                  {outlier.severity === 'high'
                    ? `Unusually high — well above the top band (>${outlier.hi}). You can still save, but please double-check the value and unit.`
                    : `Unusually low — well below the expected range. You can still save, but please double-check the value and unit.`}
                </p>
              )}
              {hasRaw && !isNumeric && (
                <p className="mt-1 flex items-start gap-1 text-[10px] text-slate-500">
                  <Info className="mt-0.5 h-3 w-3 shrink-0" />
                  Descriptive indicator — click the matching level on the right.
                </p>
              )}
            </div>

            <div className="lg:col-span-9">
              <label className="block text-[11px] font-semibold text-slate-600">
                {isNumeric ? '0–5 score' : 'Select level (0 = none, 5 = best)'}
                {!hasRaw && (
                  <span className="ml-2 text-[10px] font-normal text-slate-400">
                    — enter raw value first
                  </span>
                )}
                {hasRaw && isNumeric && (
                  <span className="ml-2 inline-flex items-center gap-1 text-[10px] font-normal text-emerald-600">
                    <Zap className="h-3 w-3" /> auto-calculated
                  </span>
                )}
              </label>
              <div className="mt-1 grid grid-cols-6 gap-1.5">
                {indicator.thresholds.map((thr, score) => {
                  const selected = currentScore === score;
                  // Clickable only for categorical indicators, when we can write, and after raw is entered.
                  const clickable = hasRaw && !isNumeric && !readOnly;
                  const dimmed = !hasRaw || (isNumeric && !selected && currentScore !== undefined);

                  const inner = (
                    <>
                      <div
                        className={clsx(
                          'flex items-center justify-between px-2 py-1 text-[10px] font-bold text-white',
                          SCORE_COLORS[score],
                        )}
                      >
                        <span>{score}</span>
                        {selected && <CheckCircle2 className="h-3 w-3" />}
                      </div>
                      <div className="px-2 py-1.5">
                        <p className="text-[9px] font-semibold text-slate-500 uppercase tracking-wide">
                          {SCORE_LABELS[score]}
                        </p>
                        <p className="mt-0.5 text-[10px] font-medium text-slate-800 break-words leading-tight min-h-[20px]">
                          {thr || '—'}
                        </p>
                      </div>
                    </>
                  );

                  const cls = clsx(
                    'flex flex-col items-stretch overflow-hidden rounded-lg border bg-white text-left transition',
                    selected
                      ? 'border-transparent shadow-md ring-2 ring-emerald-500/40'
                      : 'border-slate-200',
                    !clickable && !selected && dimmed && 'opacity-40',
                    clickable && 'hover:border-slate-300 hover:shadow-sm cursor-pointer',
                    !clickable && !selected && 'cursor-default',
                  );

                  if (clickable) {
                    return (
                      <button key={score} type="button" onClick={() => onManualScore(score)} className={cls}>
                        {inner}
                      </button>
                    );
                  }
                  return (
                    <div key={score} className={cls} aria-live="polite">
                      {inner}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function CelebrationOverlay({
  categoryName,
  nextCatCode,
  setCode,
  onClose,
  onNext,
}: {
  categoryName: string;
  nextCatCode: string | null;
  setCode: SetCode;
  onClose: () => void;
  onNext: () => void;
}) {
  const badges = useDataEntry((s) => s.badges);
  const setComplete = badges.includes(setCode);
  const nextCat = nextCatCode ? INDICATORS.categories[nextCatCode] : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-6">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-7 shadow-2xl">
        <div className="flex justify-center">
          <div
            className={clsx(
              'flex h-16 w-16 items-center justify-center rounded-full text-white shadow-lg',
              `bg-gradient-to-br ${SET_GRADIENT[setCode]}`,
            )}
          >
            <CheckCircle2 className="h-8 w-8" />
          </div>
        </div>
        <h2 className="mt-4 text-center text-xl font-bold text-slate-900">Category complete!</h2>
        <p className="mt-1 text-center text-sm text-slate-500">
          You finished <span className="font-semibold text-slate-700">{categoryName}</span>.
        </p>

        {setComplete && (
          <div className="mt-4 rounded-lg border border-emerald-100 bg-emerald-50 p-3 text-center">
            <p className="text-xs font-semibold text-emerald-700">
              All {INDICATORS.sets[setCode].name} Sustainability categories completed.
            </p>
          </div>
        )}

        {nextCat && (
          <p className="mt-5 text-center text-sm text-slate-600">
            Next up: <span className="font-semibold">{nextCat.name}</span>
          </p>
        )}

        <div className="mt-6 flex flex-col gap-2">
          {nextCat ? (
            <button
              onClick={onNext}
              className={clsx(
                'w-full rounded-lg px-4 py-2.5 text-sm font-semibold text-white transition',
                `bg-gradient-to-r ${SET_GRADIENT[setCode]} hover:opacity-90`,
              )}
            >
              Continue to {nextCat.name}
            </button>
          ) : (
            <button
              onClick={onClose}
              className="w-full rounded-lg bg-gradient-to-r from-emerald-500 to-green-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:opacity-90"
            >
              All 24 categories complete
            </button>
          )}
          <button
            onClick={onClose}
            className="w-full rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
          >
            Back to dashboard
          </button>
        </div>
      </div>
    </div>
  );
}
