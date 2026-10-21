'use client';

import { forwardRef, useEffect, useState, type ButtonHTMLAttributes, type ReactNode, type RefObject } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { Pause, Play, RotateCcw, X, Info, Lightbulb, ShieldCheck, AlertTriangle } from 'lucide-react';
import { clsx } from 'clsx';
import { INDICATORS, type Indicator } from '@/lib/scald-indicators';
import { isNumericIndicator, scoringDirection } from '@/lib/auto-score';

/**
 * True when the user asked for less motion — through the OS setting or the
 * app's own accessibility widget (html[data-a11y-motion]). The CSS in
 * globals.css already stills CSS animation for both; this is for the guide's
 * JS-timed scenes (typing, auto-advancing highlights), which CSS can't stop.
 */
export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const html = document.documentElement;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    // The widget writes data-a11y-motion="reduce" only when the user turns it
    // on, so either signal means "reduce".
    const read = () => setReduced(html.getAttribute('data-a11y-motion') === 'reduce' || mq.matches);
    read();
    mq.addEventListener('change', read);
    const obs = new MutationObserver(read);
    obs.observe(html, { attributes: true, attributeFilter: ['data-a11y-motion'] });
    return () => {
      mq.removeEventListener('change', read);
      obs.disconnect();
    };
  }, []);
  return reduced;
}

/**
 * Steps through `durations` (ms per frame) and returns the current frame.
 * With reduced motion it jumps straight to the last frame and stays there,
 * so every scene still shows its finished state — nothing is hidden behind
 * an animation.
 */
export function useTimeline(
  durations: number[],
  { playing, loop = true }: { playing: boolean; loop?: boolean },
) {
  const reduced = useReducedMotion();
  const [frame, setFrame] = useState(0);
  const last = durations.length - 1;

  useEffect(() => {
    if (reduced) {
      setFrame(last);
      return;
    }
    if (!playing) return;
    const ms = durations[frame] ?? 1000;
    const t = setTimeout(() => {
      setFrame((f) => (f < last ? f + 1 : loop ? 0 : f));
    }, ms);
    return () => clearTimeout(t);
  }, [frame, playing, reduced, loop, last, durations]);

  return { frame, setFrame, reduced, restart: () => setFrame(0) };
}

/** Text revealed one character per frame, for a "someone is typing" scene. */
export function typed(text: string, frame: number, startFrame: number): string {
  return text.slice(0, Math.max(0, frame - startFrame));
}

/**
 * Highlight one part of the real indicator card by its data-guide attribute.
 * Pure class toggling — no measuring — so it survives resizes and reflows.
 */
export function useGuideFocus(container: RefObject<HTMLElement | null>, part: string | null) {
  useEffect(() => {
    if (!part || !container.current) return;
    const el = container.current.querySelector<HTMLElement>(`[data-guide="${part}"]`);
    if (!el) return;
    el.classList.add('guide-focus');
    return () => el.classList.remove('guide-focus');
  }, [container, part]);
}

/** Play / pause / replay for an animated scene. */
export function PlayBar({
  playing,
  onToggle,
  onRestart,
  reduced,
  label = 'Animation',
}: {
  playing: boolean;
  onToggle: () => void;
  onRestart: () => void;
  reduced: boolean;
  label?: string;
}) {
  if (reduced) {
    return (
      <p className="text-xs text-slate-500">
        Animations are off (reduced motion) — the finished example is shown.
      </p>
    );
  }
  return (
    <div className="flex items-center gap-2" role="group" aria-label={`${label} controls`}>
      <button
        type="button"
        onClick={onToggle}
        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
      >
        {playing ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
        {playing ? 'Pause' : 'Play'}
      </button>
      <button
        type="button"
        onClick={onRestart}
        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
      >
        <RotateCcw className="h-3.5 w-3.5" />
        Watch again
      </button>
    </div>
  );
}

/** A "Learn more" pop-up. Radix handles focus trapping, Esc and aria. */
export function InfoDialog({
  trigger,
  title,
  children,
}: {
  trigger: ReactNode;
  title: string;
  children: ReactNode;
}) {
  return (
    <Dialog.Root>
      <Dialog.Trigger asChild>{trigger}</Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[60] bg-slate-900/50 backdrop-blur-sm" />
        <Dialog.Content className="guide-pop fixed left-1/2 top-1/2 z-[61] max-h-[85vh] w-[calc(100vw-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl focus:outline-none">
          <div className="flex items-start justify-between gap-4">
            <Dialog.Title className="text-lg font-bold text-slate-900">{title}</Dialog.Title>
            <Dialog.Close
              className="rounded-lg p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </Dialog.Close>
          </div>
          <div className="mt-3 space-y-3 text-[15px] leading-relaxed text-slate-700">{children}</div>
          <Dialog.Close className="mt-5 w-full rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800">
            Got it
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

/**
 * Trigger for InfoDialog. It must forward its ref and props: Radix's
 * `asChild` passes onClick, aria-* and data-state down to it — a button that
 * swallowed them would look clickable and never open the dialog.
 */
export const LearnMoreButton = forwardRef<HTMLButtonElement, ButtonHTMLAttributes<HTMLButtonElement>>(
  function LearnMoreButton({ children = 'Learn more', className, ...props }, ref) {
    return (
      <button
        ref={ref}
        type="button"
        {...props}
        className={clsx(
          'inline-flex items-center gap-1.5 rounded-lg bg-sky-50 px-3 py-1.5 text-sm font-semibold text-sky-700 ring-1 ring-sky-200 transition hover:bg-sky-100',
          className,
        )}
      >
        <Info className="h-4 w-4" />
        {children}
      </button>
    );
  },
);

const CALLOUT = {
  tip: { icon: Lightbulb, cls: 'border-amber-200 bg-amber-50 text-amber-900', iconCls: 'text-amber-500' },
  safe: { icon: ShieldCheck, cls: 'border-emerald-200 bg-emerald-50 text-emerald-900', iconCls: 'text-emerald-500' },
  warn: { icon: AlertTriangle, cls: 'border-rose-200 bg-rose-50 text-rose-900', iconCls: 'text-rose-500' },
} as const;

/** A highlighted note: a tip, a reassurance, or a warning. */
export function Callout({ kind, children }: { kind: keyof typeof CALLOUT; children: ReactNode }) {
  const c = CALLOUT[kind];
  const Icon = c.icon;
  return (
    <div className={clsx('flex items-start gap-3 rounded-xl border px-4 py-3 text-[15px] leading-relaxed', c.cls)}>
      <Icon className={clsx('mt-0.5 h-5 w-5 shrink-0', c.iconCls)} />
      <div>{children}</div>
    </div>
  );
}

/** Numbered marker that pairs a list item with a part of the card. */
export function Marker({ n, active }: { n: number; active?: boolean }) {
  return (
    <span
      className={clsx(
        'inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sm font-bold transition',
        active ? 'bg-amber-500 text-white shadow-md' : 'bg-slate-200 text-slate-700',
      )}
    >
      {n}
    </span>
  );
}

const ALL_INDICATORS: Indicator[] = INDICATORS.order.flatMap((c) => INDICATORS.categories[c].indicators);

/**
 * The guide's examples are real indicators from the current definitions, so
 * the cards match what users will see. Take the preferred code when it exists
 * and still has the expected shape; otherwise fall back to the first indicator
 * that does — a future indicator set never breaks the guide.
 */
export function pickIndicator(prefer: string, fits: (i: Indicator) => boolean): Indicator {
  const preferred = ALL_INDICATORS.find((i) => i.code === prefer);
  if (preferred && fits(preferred)) return preferred;
  return ALL_INDICATORS.find(fits) ?? ALL_INDICATORS[0];
}

export const isNumeric = (i: Indicator) => isNumericIndicator(i.thresholds);
export const isInverse = (i: Indicator) => isNumeric(i) && scoringDirection(i.thresholds) === 'lower';
export const isLevel = (i: Indicator) => !isNumeric(i);

/** The set code (ES/SS/MS/ECS) an indicator belongs to. */
export function setOf(i: Indicator) {
  for (const c of INDICATORS.order) {
    if (INDICATORS.categories[c].indicators.some((x) => x.code === i.code)) return INDICATORS.categories[c].set;
  }
  return 'ES' as const;
}

/** Card frame for a scene. */
export function Stage({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={clsx('rounded-2xl border border-slate-200 bg-slate-50/70 p-4 sm:p-5', className)}>
      {children}
    </div>
  );
}
