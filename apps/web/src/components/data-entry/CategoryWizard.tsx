'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { INDICATORS, getNextCategoryCode, type Indicator, type SetCode } from '@/lib/scald-indicators';
import { useDataEntry } from '@/stores/data-entry';
import { clsx } from 'clsx';
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Lock,
  Sparkles,
  Trophy,
  Info,
  Zap,
} from 'lucide-react';

const SET_GRADIENT: Record<SetCode, string> = {
  ES: 'from-emerald-500 to-green-600',
  SS: 'from-rose-500 to-pink-600',
  MS: 'from-blue-500 to-indigo-600',
  ECS: 'from-orange-500 to-amber-600',
};

const SET_ACCENT: Record<SetCode, { text: string; bg: string; ring: string }> = {
  ES: { text: 'text-emerald-700', bg: 'bg-emerald-50', ring: 'ring-emerald-500/30' },
  SS: { text: 'text-rose-700', bg: 'bg-rose-50', ring: 'ring-rose-500/30' },
  MS: { text: 'text-blue-700', bg: 'bg-blue-50', ring: 'ring-blue-500/30' },
  ECS: { text: 'text-orange-700', bg: 'bg-orange-50', ring: 'ring-orange-500/30' },
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
  const saveEntry = useDataEntry((s) => s.saveEntry);
  const completeCategory = useDataEntry((s) => s.completeCategory);
  const isUnlocked = useDataEntry((s) => s.isCategoryUnlocked(categoryCode));
  const categoryProgress = useDataEntry((s) => s.categoryProgress(categoryCode));
  const isComplete = useDataEntry((s) => s.isCategoryComplete(categoryCode));

  // Wizard state
  const [step, setStep] = useState(0);
  const [rawValue, setRawValue] = useState('');
  const [showCelebration, setShowCelebration] = useState(false);

  const current = cat.indicators[step] as Indicator | undefined;

  // When step changes, prefill rawValue from existing entry
  useEffect(() => {
    if (current) {
      const e = entries[current.code];
      setRawValue(e?.rawValue ?? '');
    }
  }, [step, current, entries]);

  // Lock guard — if user tries to access locked category directly
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

  if (!current) {
    // No indicators in this category — auto-complete
    if (mounted && !isComplete) completeCategory(categoryCode);
    return null;
  }

  const currentEntry = entries[current.code];
  const currentScore = currentEntry?.score;

  const handleScore = (score: number) => {
    saveEntry(current.code, score, rawValue.trim() || undefined);
  };

  const handleNext = () => {
    if (currentScore === undefined) return;
    if (step < cat.indicators.length - 1) {
      setStep((s) => s + 1);
    } else {
      // Last indicator — finalize category
      completeCategory(categoryCode);
      setShowCelebration(true);
    }
  };

  const handlePrev = () => {
    if (step > 0) setStep((s) => s - 1);
  };

  const nextCatCode = getNextCategoryCode(categoryCode);

  return (
    <div className="p-6">
      <div className="mx-auto max-w-3xl">
        {/* Back link */}
        <Link
          href="/data-entry"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-700"
        >
          <ArrowLeft className="h-4 w-4" /> All categories
        </Link>

        {/* Progress bar */}
        <div className="mt-4">
          <div className="flex items-baseline justify-between text-xs">
            <span className="font-semibold text-slate-700">
              Indicator {step + 1} of {cat.indicators.length}
            </span>
            <span className="text-slate-500">{categoryProgress.pct}% complete</span>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
            <div
              className={clsx(
                'h-full rounded-full bg-gradient-to-r transition-all',
                SET_GRADIENT[setCode],
              )}
              style={{ width: `${((step + 1) / cat.indicators.length) * 100}%` }}
            />
          </div>
        </div>

        {/* Indicator card */}
        <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          {/* Code chip */}
          <div className="flex items-center gap-2">
            <span
              className={clsx(
                'rounded px-2 py-0.5 text-[11px] font-bold',
                accent.bg,
                accent.text,
              )}
            >
              {current.code}
            </span>
            <span className="text-xs text-slate-400">{cat.name}</span>
          </div>

          {/* Name */}
          <h2 className="mt-3 text-xl font-bold text-slate-900 leading-tight">
            {current.name}
          </h2>

          {/* Unit */}
          <p className="mt-1 text-sm text-slate-500">
            <span className="font-medium text-slate-700">Unit:</span> {current.unit}
            {current.normalisation && (
              <span className="ml-2 text-slate-400">· {current.normalisation}</span>
            )}
          </p>

          {/* Method */}
          {current.method && (
            <div className="mt-4 flex items-start gap-2 rounded-lg border border-slate-100 bg-slate-50 px-3.5 py-3">
              <Info className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
              <p className="text-xs leading-relaxed text-slate-600 whitespace-pre-line">
                {current.method}
              </p>
            </div>
          )}

          {/* Optional raw input */}
          <div className="mt-5">
            <label className="block text-xs font-semibold text-slate-600">
              Raw measurement value <span className="font-normal text-slate-400">(optional)</span>
            </label>
            <input
              type="text"
              value={rawValue}
              onChange={(e) => setRawValue(e.target.value)}
              placeholder={`e.g. ${current.thresholds[3] || '...'}`}
              className="mt-1.5 w-full rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 outline-none transition focus:border-slate-400 focus:bg-white focus:ring-2 focus:ring-slate-200"
            />
            <p className="mt-1.5 text-[11px] text-slate-400">
              Then assign a 0–5 score using the thresholds below.
            </p>
          </div>

          {/* Score buttons */}
          <div className="mt-5">
            <p className="text-xs font-semibold text-slate-600">
              Select score (0 = no data, 5 = best)
            </p>
            <div className="mt-2 grid grid-cols-6 gap-2">
              {current.thresholds.map((thr, score) => {
                const selected = currentScore === score;
                return (
                  <button
                    key={score}
                    onClick={() => handleScore(score)}
                    className={clsx(
                      'group flex flex-col items-stretch overflow-hidden rounded-lg border bg-white text-left transition',
                      selected
                        ? `border-transparent shadow-md ring-2 ${accent.ring}`
                        : 'border-slate-200 hover:border-slate-300 hover:shadow-sm',
                    )}
                  >
                    <div
                      className={clsx(
                        'flex items-center justify-between px-2.5 py-1.5 text-[11px] font-bold text-white',
                        SCORE_COLORS[score],
                      )}
                    >
                      <span>{score}</span>
                      {selected && <CheckCircle2 className="h-3.5 w-3.5" />}
                    </div>
                    <div className="px-2.5 py-2">
                      <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">
                        {SCORE_LABELS[score]}
                      </p>
                      <p className="mt-0.5 text-[11px] font-medium text-slate-800 break-words leading-tight min-h-[28px]">
                        {thr || '—'}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Footer nav */}
          <div className="mt-6 flex items-center justify-between border-t border-slate-100 pt-4">
            <button
              onClick={handlePrev}
              disabled={step === 0}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3.5 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ArrowLeft className="h-4 w-4" /> Previous
            </button>

            <div className="flex items-center gap-2 text-xs text-slate-500">
              {currentScore !== undefined ? (
                <>
                  <Zap className="h-3.5 w-3.5 text-amber-500" />
                  <span>+10 XP saved</span>
                </>
              ) : (
                <span>Pick a score to continue</span>
              )}
            </div>

            <button
              onClick={handleNext}
              disabled={currentScore === undefined}
              className={clsx(
                'inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-sm font-semibold text-white transition disabled:opacity-40 disabled:cursor-not-allowed',
                `bg-gradient-to-r ${SET_GRADIENT[setCode]} hover:opacity-90`,
              )}
            >
              {step < cat.indicators.length - 1 ? (
                <>
                  Next <ArrowRight className="h-4 w-4" />
                </>
              ) : (
                <>
                  Finish category <Sparkles className="h-4 w-4" />
                </>
              )}
            </button>
          </div>
        </div>

        {/* Indicator nav strip */}
        <div className="mt-4 flex flex-wrap gap-1">
          {cat.indicators.map((ind, i) => {
            const e = entries[ind.code];
            return (
              <button
                key={ind.code}
                onClick={() => setStep(i)}
                title={ind.name}
                className={clsx(
                  'h-2 flex-1 min-w-[8px] max-w-[40px] rounded-full transition',
                  i === step
                    ? `bg-gradient-to-r ${SET_GRADIENT[setCode]}`
                    : e
                    ? SCORE_COLORS[e.score]
                    : 'bg-slate-200 hover:bg-slate-300',
                )}
              />
            );
          })}
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
  const setBadgeEarned = badges.includes(setCode);
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
            <Trophy className="h-8 w-8" />
          </div>
        </div>
        <h2 className="mt-4 text-center text-xl font-bold text-slate-900">
          Category complete!
        </h2>
        <p className="mt-1 text-center text-sm text-slate-500">
          You finished <span className="font-semibold text-slate-700">{categoryName}</span>.
        </p>

        <div className="mt-5 rounded-lg border border-emerald-100 bg-emerald-50 p-4 text-center">
          <p className="text-xs font-semibold uppercase tracking-wider text-emerald-600">
            Rewards earned
          </p>
          <div className="mt-2 flex items-center justify-center gap-4">
            <div>
              <p className="text-xl font-bold text-emerald-700">+50</p>
              <p className="text-[10px] text-emerald-600">Category XP</p>
            </div>
            {setBadgeEarned && (
              <>
                <span className="text-emerald-300">·</span>
                <div>
                  <p className="text-xl font-bold text-emerald-700">+200</p>
                  <p className="text-[10px] text-emerald-600">Set Badge XP</p>
                </div>
              </>
            )}
          </div>
          {setBadgeEarned && (
            <p className="mt-2 text-xs text-emerald-700 font-semibold">
              🎉 {INDICATORS.sets[setCode].name} Sustainability badge earned!
            </p>
          )}
        </div>

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
              🏆 All 25 categories complete!
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
