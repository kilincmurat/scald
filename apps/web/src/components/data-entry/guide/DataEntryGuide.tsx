'use client';

import { useCallback, useEffect, useRef, useState, type ComponentType } from 'react';
import Link from 'next/link';
import { ArrowLeft, ArrowRight, CheckCircle2, ClipboardList, List, X, GraduationCap } from 'lucide-react';
import { clsx } from 'clsx';
import { WelcomeScene, ScreenScene, YearScene, CategoryScene } from './scenes-start';
import { AnatomyScene, TypeNumberScene, UnitScene, LevelScene, InverseScene, OptionalScene } from './scenes-indicator';
import { FinishScene, SubmitScene, ReviewScene, HelpScene } from './scenes-finish';

type Step = { id: string; part: string; title: string; lead: string; Scene: ComponentType };

const STEPS: Step[] = [
  { id: 'welcome', part: 'Getting started', title: 'What you will do', lead: 'Three steps: fill in your numbers, submit them, and they get approved.', Scene: WelcomeScene },
  { id: 'screen', part: 'Getting started', title: 'Your data-entry screen', lead: 'What each part of the page is for.', Scene: ScreenScene },
  { id: 'year', part: 'Getting started', title: 'Choose the year', lead: 'Pick the year your numbers describe.', Scene: YearScene },
  { id: 'category', part: 'Getting started', title: 'Open a category', lead: 'Click a category card to see its indicators.', Scene: CategoryScene },
  { id: 'card', part: 'Entering values', title: 'Read the indicator card', lead: 'Each card tells you what to measure and in which unit.', Scene: AnatomyScene },
  { id: 'number', part: 'Entering values', title: 'Type a number', lead: 'Type the value — the score is worked out for you.', Scene: TypeNumberScene },
  { id: 'unit', part: 'Entering values', title: 'Convert to the right unit', lead: 'Turn a count into “per 10,000 people”, “per 100 km²” or a percentage.', Scene: UnitScene },
  { id: 'level', part: 'Entering values', title: 'Pick a level', lead: 'Some indicators ask you to choose a stage instead of a number.', Scene: LevelScene },
  { id: 'inverse', part: 'Entering values', title: 'When lower is better', lead: 'For some indicators a smaller number scores higher.', Scene: InverseScene },
  { id: 'optional', part: 'Entering values', title: 'Purple cards are optional', lead: 'Skip them if they don’t apply to your municipality.', Scene: OptionalScene },
  { id: 'finish', part: 'Finishing up', title: 'Finish a category', lead: 'Tick off a category when all its required indicators are filled.', Scene: FinishScene },
  { id: 'submit', part: 'Finishing up', title: 'Submit for review', lead: 'Send the year to your decision maker.', Scene: SubmitScene },
  { id: 'review', part: 'Finishing up', title: 'Review and approval', lead: 'What happens after you submit.', Scene: ReviewScene },
  { id: 'help', part: 'Help', title: 'Common mistakes & questions', lead: 'The mistakes people make most often — and how to avoid them.', Scene: HelpScene },
];

const PARTS = Array.from(new Set(STEPS.map((s) => s.part)));

/* Where the user left off — a per-browser convenience, so localStorage. Every
   access is guarded: storage can be unavailable (private mode, blocked). */
const STORE_KEY = 'scald-guide-progress';
type Saved = { step: number; seen: string[] };
function load(): Saved {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (raw) {
      const v = JSON.parse(raw) as Saved;
      if (typeof v.step === 'number' && Array.isArray(v.seen)) return v;
    }
  } catch {
    /* unavailable — start fresh */
  }
  return { step: 0, seen: [] };
}
function save(v: Saved) {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(v));
  } catch {
    /* unavailable — the guide still works, it just won't remember */
  }
}

/** Has this browser opened the guide before? Used to suggest it to newcomers. */
export function hasSeenGuide(): boolean {
  try {
    return localStorage.getItem(STORE_KEY) !== null;
  } catch {
    return false;
  }
}

function stepFromHash(): number | null {
  if (typeof window === 'undefined') return null;
  const id = window.location.hash.replace('#', '');
  const i = STEPS.findIndex((s) => s.id === id);
  return i >= 0 ? i : null;
}

export function DataEntryGuide() {
  const [index, setIndex] = useState(0);
  const [seen, setSeen] = useState<string[]>([]);
  const [ready, setReady] = useState(false);
  const [listOpen, setListOpen] = useState(false);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const topRef = useRef<HTMLDivElement>(null);
  const firstRender = useRef(true);

  // Start where the link points (#unit), otherwise where the user left off.
  useEffect(() => {
    const saved = load();
    setIndex(stepFromHash() ?? Math.min(saved.step, STEPS.length - 1));
    setSeen(saved.seen);
    setReady(true);
  }, []);

  const step = STEPS[index];

  // Remember progress, keep the URL in step (so the browser's back button
  // and bookmarks work), and move focus to the new heading for screen readers.
  useEffect(() => {
    if (!ready) return;
    const nextSeen = seen.includes(step.id) ? seen : [...seen, step.id];
    if (nextSeen !== seen) setSeen(nextSeen);
    save({ step: index, seen: nextSeen });
    if (window.location.hash !== `#${step.id}`) history.replaceState(null, '', `#${step.id}`);
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    topRef.current?.scrollIntoView({ block: 'start' });
    headingRef.current?.focus({ preventScroll: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, ready]);

  useEffect(() => {
    const onHash = () => {
      const i = stepFromHash();
      if (i !== null) setIndex(i);
    };
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  const go = useCallback((i: number) => {
    setIndex(Math.max(0, Math.min(STEPS.length - 1, i)));
    setListOpen(false);
  }, []);

  // ← / → move between steps — but never while the user is typing.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(t.tagName))) return;
      if (e.altKey || e.ctrlKey || e.metaKey) return;
      if (e.key === 'ArrowRight') go(index + 1);
      if (e.key === 'ArrowLeft') go(index - 1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [index, go]);

  const isLast = index === STEPS.length - 1;
  const pct = Math.round(((index + 1) / STEPS.length) * 100);
  const Scene = step.Scene;

  const stepList = (
    <nav aria-label="Guide steps">
      {PARTS.map((part) => (
        <div key={part} className="mb-4 last:mb-0">
          <p className="mb-1.5 px-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">{part}</p>
          <ol className="space-y-0.5">
            {STEPS.map((s, i) =>
              s.part !== part ? null : (
                <li key={s.id}>
                  <button
                    type="button"
                    onClick={() => go(i)}
                    aria-current={i === index ? 'step' : undefined}
                    className={clsx(
                      'flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-left text-sm transition',
                      i === index ? 'bg-emerald-50 font-semibold text-emerald-800' : 'text-slate-600 hover:bg-slate-100',
                    )}
                  >
                    <span
                      className={clsx(
                        'flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold',
                        i === index
                          ? 'bg-emerald-600 text-white'
                          : seen.includes(s.id)
                            ? 'bg-emerald-100 text-emerald-700'
                            : 'bg-slate-100 text-slate-500',
                      )}
                    >
                      {seen.includes(s.id) && i !== index ? <CheckCircle2 className="h-3.5 w-3.5" /> : i + 1}
                    </span>
                    <span>{s.title}</span>
                  </button>
                </li>
              ),
            )}
          </ol>
        </div>
      ))}
    </nav>
  );

  if (!ready) {
    return (
      <div className="p-6">
        <div className="mx-auto h-64 max-w-5xl animate-pulse rounded-2xl bg-slate-100" />
      </div>
    );
  }

  return (
    // scroll-mt clears the sticky page header (h-16) when a step change
    // scrolls back to the top — otherwise the progress bar hides under it.
    <div className="scroll-mt-20 p-4 lg:p-6" ref={topRef}>
      <div className="mx-auto max-w-6xl">
        {/* Progress */}
        <div className="mb-5 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                <GraduationCap className="h-5 w-5" />
              </span>
              <div>
                <p className="text-sm font-semibold text-slate-900" aria-live="polite">
                  Step {index + 1} of {STEPS.length}
                </p>
                <p className="text-xs text-slate-500">{step.part}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setListOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 lg:hidden"
              >
                <List className="h-4 w-4" /> All steps
              </button>
              <Link
                href="/data-entry"
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
              >
                <ClipboardList className="h-4 w-4" /> Go to data entry
              </Link>
            </div>
          </div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100" aria-hidden>
            <div className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-emerald-600 transition-all duration-500" style={{ width: `${pct}%` }} />
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[230px_1fr]">
          <aside className="hidden lg:block">
            <div className="sticky top-4 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">{stepList}</div>
          </aside>

          <div className="min-w-0">
            <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
              <h2
                ref={headingRef}
                tabIndex={-1}
                className="text-2xl font-bold tracking-tight text-slate-900 outline-none sm:text-3xl"
              >
                {step.title}
              </h2>
              <p className="mt-2 text-lg leading-relaxed text-slate-600">{step.lead}</p>
              <div className="mt-6">
                {/* keyed so each scene's animation starts from the beginning */}
                <Scene key={step.id} />
              </div>
            </article>

            {/* Previous / next — large targets */}
            <div className="mt-5 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => go(index - 1)}
                disabled={index === 0}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-3 text-base font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ArrowLeft className="h-5 w-5" /> Previous
              </button>
              {isLast ? (
                <Link
                  href="/data-entry"
                  className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-green-600 px-6 py-3 text-base font-semibold text-white shadow-md transition hover:opacity-90"
                >
                  Start entering data <ArrowRight className="h-5 w-5" />
                </Link>
              ) : (
                <button
                  type="button"
                  onClick={() => go(index + 1)}
                  className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-6 py-3 text-base font-semibold text-white shadow-md transition hover:bg-slate-800"
                >
                  Next: {STEPS[index + 1].title} <ArrowRight className="h-5 w-5" />
                </button>
              )}
            </div>
            <p className="mt-3 text-center text-xs text-slate-400">Tip: the ← and → keys also move between steps.</p>
          </div>
        </div>
      </div>

      {/* Step list on small screens */}
      {listOpen && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="All steps">
          <button type="button" className="absolute inset-0 bg-slate-900/50" aria-label="Close" onClick={() => setListOpen(false)} />
          <div className="guide-pop absolute inset-x-3 top-3 max-h-[85vh] overflow-y-auto rounded-2xl bg-white p-4 shadow-2xl">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-base font-bold text-slate-900">All steps</p>
              <button type="button" onClick={() => setListOpen(false)} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100" aria-label="Close">
                <X className="h-5 w-5" />
              </button>
            </div>
            {stepList}
          </div>
        </div>
      )}
    </div>
  );
}
