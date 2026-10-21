'use client';

import { useState } from 'react';
import {
  PencilLine,
  Send,
  BadgeCheck,
  ChevronRight,
  ChevronDown,
  Lock,
  Cloud,
  FileDown,
  ClipboardList,
  CheckCircle2,
  RotateCcw,
} from 'lucide-react';
import { clsx } from 'clsx';
import { INDICATORS, REQUIRED_INDICATORS } from '@/lib/scald-indicators';
import { MIN_YEAR, maxEditableYear } from '@/stores/data-entry';
import { useTimeline, PlayBar, Stage, Marker, Callout, InfoDialog, LearnMoreButton } from './primitives';

/* ─────────────────────────────── 1. The whole job ─────────────────────── */

const JOURNEY = [
  { icon: PencilLine, title: 'Fill in', body: 'Type your municipality’s numbers into the indicator cards.', tone: 'emerald' },
  { icon: Send, title: 'Submit', body: 'When every required card is filled, send the year for review.', tone: 'sky' },
  { icon: BadgeCheck, title: 'Approved', body: 'Your decision maker checks it and approves — or asks for a change.', tone: 'violet' },
] as const;

const TONE = {
  emerald: 'bg-emerald-500 text-white ring-emerald-200',
  sky: 'bg-sky-500 text-white ring-sky-200',
  violet: 'bg-violet-500 text-white ring-violet-200',
} as const;

export function WelcomeScene() {
  const [playing, setPlaying] = useState(true);
  // 0: nothing lit · 1–3: each stage lights up in turn · 4: hold
  const { frame, restart, reduced } = useTimeline([700, 1300, 1300, 1300, 2600], { playing });

  return (
    <div className="space-y-5">
      <Stage>
        <ol className="grid gap-3 sm:grid-cols-3">
          {JOURNEY.map((s, i) => {
            const lit = frame >= i + 1;
            const Icon = s.icon;
            return (
              <li
                key={s.title}
                className={clsx(
                  'relative flex flex-col items-center rounded-2xl border bg-white p-5 text-center transition-all duration-500',
                  lit ? 'border-slate-200 shadow-md' : 'border-slate-100 opacity-40',
                )}
              >
                <span className="absolute left-3 top-3 text-xs font-bold text-slate-400">Step {i + 1}</span>
                <span
                  className={clsx(
                    'flex h-14 w-14 items-center justify-center rounded-2xl ring-4 transition-all duration-500',
                    lit ? TONE[s.tone] : 'bg-slate-100 text-slate-400 ring-transparent',
                    lit && frame === i + 1 && 'guide-press',
                  )}
                >
                  <Icon className="h-7 w-7" />
                </span>
                <p className="mt-3 text-lg font-bold text-slate-900">{s.title}</p>
                <p className="mt-1 text-sm leading-relaxed text-slate-600">{s.body}</p>
                {i < JOURNEY.length - 1 && (
                  <ChevronRight
                    className={clsx(
                      'absolute -right-4 top-1/2 z-10 hidden h-7 w-7 -translate-y-1/2 rounded-full bg-white p-1 shadow sm:block',
                      frame >= i + 2 ? 'text-slate-700' : 'text-slate-300',
                    )}
                  />
                )}
              </li>
            );
          })}
        </ol>
      </Stage>
      <PlayBar playing={playing} onToggle={() => setPlaying((p) => !p)} onRestart={restart} reduced={reduced} />

      <div className="grid gap-3 sm:grid-cols-2">
        <Callout kind="safe">
          <strong>Nothing is final until you submit.</strong> Every value is saved the moment you type it, and
          you can change it as often as you like before you press Submit.
        </Callout>
        <Callout kind="tip">
          <strong>No need to finish in one sitting.</strong> Close the page and come back tomorrow — your values
          will be waiting, as long as the badge at the top says <em>Synced with server</em> when you leave.
        </Callout>
      </div>

      <InfoDialog trigger={<LearnMoreButton>How much work is it?</LearnMoreButton>} title="How much work is it?">
        <p>
          There are <strong>{INDICATORS.order.length} categories</strong> such as Water, Energy or Waste. Each
          has a handful of indicators — one number or one choice per indicator.
        </p>
        <p>
          <strong>{REQUIRED_INDICATORS} indicators are required.</strong> A few more are optional (shown in
          purple) — you fill those only if they apply to your municipality.
        </p>
        <p>
          Most of the time goes into <em>finding</em> the numbers in your departments, not typing them. The{' '}
          <strong>Preparation sheet</strong> button on the data-entry page lists every indicator so you can
          collect the numbers first, on paper if you like.
        </p>
      </InfoDialog>
    </div>
  );
}

/* ─────────────────────────────── 2. Your screen ──────────────────────── */

const SCREEN_PARTS = [
  {
    id: 'year',
    title: 'Reporting year',
    body: 'Which year your numbers describe. Check it before you start.',
  },
  {
    id: 'saved',
    title: '“Synced with server”',
    // Accurate to the current behaviour: a failed save is NOT retried, and the
    // next page load replaces local values with the server's. So the safe
    // instruction is to re-type, not to wait.
    body: 'Green means your values are safely saved on the server. If it turns amber (“Offline”), your last change has NOT reached the server — do not close or refresh the page. Check your internet connection, then type that value again until the badge is green.',
  },
  {
    id: 'progress',
    title: 'Your progress',
    body: 'How many required indicators you have filled so far.',
  },
  {
    id: 'submit',
    title: 'Submission card',
    body: 'Tells you what happens next — and holds the “Submit for review” button once everything is filled.',
  },
  {
    id: 'categories',
    title: 'Category cards',
    body: 'Click one to open it and fill in its indicators.',
  },
] as const;

export function ScreenScene() {
  const [playing, setPlaying] = useState(true);
  const { frame, setFrame, restart, reduced } = useTimeline(
    SCREEN_PARTS.map(() => 2600),
    { playing },
  );
  // With reduced motion there is no tour — the list below is the guide.
  const active = reduced ? null : SCREEN_PARTS[frame].id;
  const ring = (id: string) =>
    active === id ? 'ring-4 ring-amber-400 ring-offset-2 transition-shadow' : 'transition-shadow';

  return (
    <div className="space-y-5">
      <Stage>
        <div aria-hidden className="space-y-3 text-[11px]">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className={clsx('flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5', ring('year'))}>
                <span className="font-medium text-slate-600">Reporting year:</span>
                <span className="font-semibold text-slate-900">{MIN_YEAR}</span>
                <ChevronDown className="h-3 w-3 text-slate-400" />
              </div>
              <span className={clsx('inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-1 font-medium text-emerald-700', ring('saved'))}>
                <Cloud className="h-3 w-3" /> Synced with server
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="inline-flex items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-2 py-1 font-medium text-emerald-700">
                <FileDown className="h-3 w-3" /> Preparation sheet
              </span>
              <span className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-1 font-medium text-slate-400">
                <RotateCcw className="h-3 w-3" /> Reset all
              </span>
            </div>
          </div>
          <div className={clsx('rounded-xl border border-slate-200 bg-white p-3', ring('progress'))}>
            <div className="flex items-center gap-1.5 font-semibold uppercase tracking-wider text-slate-500">
              <ClipboardList className="h-3 w-3 text-emerald-500" /> Overall progress
            </div>
            <p className="mt-1 text-2xl font-bold text-slate-900">38%</p>
            <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-100">
              <div className="h-full w-[38%] rounded-full bg-emerald-500" />
            </div>
          </div>
          <div className={clsx('rounded-xl border border-sky-200 bg-sky-50 p-3 text-sky-800', ring('submit'))}>
            <p className="font-semibold">Ready to submit?</p>
            <p className="mt-0.5 text-sky-700">Fill all {REQUIRED_INDICATORS} required indicators to unlock submission.</p>
          </div>
          <div className={clsx('grid grid-cols-3 gap-2 sm:grid-cols-5', ring('categories'))}>
            {INDICATORS.order.slice(0, 5).map((c, i) => (
              <div key={c} className="rounded-lg border border-slate-200 bg-white p-2">
                <p className="truncate font-semibold text-slate-800">{INDICATORS.categories[c].name}</p>
                <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-slate-100">
                  <div className="h-full rounded-full bg-emerald-500" style={{ width: `${[100, 60, 30, 0, 0][i]}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </Stage>
      <PlayBar playing={playing} onToggle={() => setPlaying((p) => !p)} onRestart={restart} reduced={reduced} />

      <ol className="space-y-2">
        {SCREEN_PARTS.map((p, i) => (
          <li key={p.id}>
            <button
              type="button"
              onClick={() => {
                setPlaying(false);
                setFrame(i);
              }}
              className={clsx(
                'flex w-full items-start gap-3 rounded-xl border px-4 py-3 text-left transition',
                active === p.id ? 'border-amber-300 bg-amber-50' : 'border-slate-200 bg-white hover:bg-slate-50',
              )}
            >
              <Marker n={i + 1} active={active === p.id} />
              <span>
                <span className="block text-[15px] font-semibold text-slate-900">{p.title}</span>
                <span className="block text-sm leading-relaxed text-slate-600">{p.body}</span>
              </span>
            </button>
          </li>
        ))}
      </ol>

      <Callout kind="warn">
        <strong>Don’t press “Reset all”.</strong> It permanently deletes every value you have entered — for
        every year that is not yet submitted, not only the year on screen. You never need it for normal work:
        to correct a value, just type over it.
      </Callout>
    </div>
  );
}

/* ─────────────────────────────── 3. Choose the year ──────────────────── */

export function YearScene() {
  const [playing, setPlaying] = useState(true);
  // 0: closed · 1: opens · 2: hover on first year · 3: chosen, closed
  const { frame, restart, reduced } = useTimeline([1200, 1100, 1100, 2800], { playing });
  // Without motion, keep the list open: the locked years and when they open
  // are the point of this step.
  const open = reduced || frame === 1 || frame === 2;
  const lastOpen = maxEditableYear();
  const years = [MIN_YEAR, MIN_YEAR + 1, MIN_YEAR + 2];

  return (
    <div className="space-y-5">
      <Stage>
        <div aria-hidden className="mx-auto max-w-xs">
          <div
            className={clsx(
              'flex items-center justify-between rounded-xl border-2 bg-white px-4 py-3 text-base transition',
              open ? 'border-emerald-400 shadow-lg' : 'border-slate-200',
            )}
          >
            <span className="font-medium text-slate-600">Reporting year:</span>
            <span className="flex items-center gap-1 font-bold text-slate-900">
              {years[0]} <ChevronDown className={clsx('h-4 w-4 transition', open && 'rotate-180')} />
            </span>
          </div>
          <div
            className={clsx(
              'mt-1 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg transition-all duration-300',
              open ? 'max-h-60 opacity-100' : 'max-h-0 opacity-0',
            )}
          >
            {years.map((y) => {
              const editable = y <= lastOpen;
              return (
                <div
                  key={y}
                  className={clsx(
                    'flex items-center justify-between px-4 py-2.5 text-base',
                    frame === 2 && y === years[0] && 'bg-emerald-50',
                    !editable && 'text-slate-400',
                  )}
                >
                  <span className="font-semibold">{y}</span>
                  {editable ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  ) : (
                    <span className="flex items-center gap-1 text-xs">
                      <Lock className="h-3.5 w-3.5" /> opens Jan {y + 1}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </Stage>
      <PlayBar playing={playing} onToggle={() => setPlaying((p) => !p)} onRestart={restart} reduced={reduced} />

      <p className="text-[15px] leading-relaxed text-slate-700">
        Open the <strong>Reporting year</strong> box at the top of the data-entry page and pick the year your
        numbers are for. Each year is stored separately — values you type for one year never overwrite another.
      </p>
      <Callout kind="tip">
        <strong>Only finished years can be filled in.</strong> A year opens on 1 January of the following year,
        when its numbers are final. That is why later years show a lock.
      </Callout>
    </div>
  );
}

/* ─────────────────────────────── 4. Open a category ──────────────────── */

export function CategoryScene() {
  const [playing, setPlaying] = useState(true);
  // 0: grid · 1: hover · 2: press · 3: opened
  const { frame, restart, reduced } = useTimeline([1300, 900, 600, 3000], { playing });
  const cats = INDICATORS.order.slice(0, 6);
  const target = cats[2];
  // Without motion, show both the grid and the opened category, one under
  // the other — the grid is what the user will actually click.
  const showGrid = reduced || frame !== 3;
  const opened = reduced || frame === 3;
  const targetCat = INDICATORS.categories[target];

  return (
    <div className="space-y-5">
      <Stage className="min-h-[240px]">
        <div aria-hidden className="space-y-4">
          {showGrid && (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {cats.map((c, i) => {
                const cat = INDICATORS.categories[c];
                const isTarget = c === target;
                return (
                  <div
                    key={c}
                    className={clsx(
                      'rounded-xl border bg-white p-3 transition-all duration-300',
                      isTarget && frame >= 1 ? 'border-emerald-400 shadow-lg' : 'border-slate-200',
                      isTarget && frame === 2 && 'guide-press',
                    )}
                  >
                    <span className="rounded bg-emerald-50 px-1.5 py-0.5 text-[10px] font-bold text-emerald-700">{c}</span>
                    <p className="mt-1.5 text-sm font-semibold text-slate-900">{cat.name}</p>
                    <p className="text-xs text-slate-500">{cat.indicators.length} indicators</p>
                    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100">
                      <div className="h-full rounded-full bg-emerald-500" style={{ width: `${[100, 100, 40, 0, 0, 0][i]}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          {opened && (
            <div className="guide-pop rounded-xl border border-slate-200 bg-white p-4">
              <p className="text-xs font-medium text-slate-500">← All categories</p>
              <div className="mt-2 flex items-center gap-2">
                <span className="rounded bg-emerald-50 px-1.5 py-0.5 text-[10px] font-bold text-emerald-700">{target}</span>
                <span className="text-xs text-slate-400">Environmental Sustainability</span>
              </div>
              <p className="mt-1 text-lg font-bold text-slate-900">{targetCat.name}</p>
              <p className="text-xs text-slate-500">Fill in each indicator below — any order.</p>
              <div className="mt-3 space-y-2">
                {targetCat.indicators.slice(0, 3).map((ind, i) => (
                  <div key={ind.code} className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2">
                    <span className="flex h-6 w-6 items-center justify-center rounded-md bg-emerald-50 text-[10px] font-bold text-emerald-700">
                      {i + 1}
                    </span>
                    <span className="truncate text-sm text-slate-800">{ind.name}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </Stage>
      <PlayBar playing={playing} onToggle={() => setPlaying((p) => !p)} onRestart={restart} reduced={reduced} />

      <p className="text-[15px] leading-relaxed text-slate-700">
        The categories are grouped into four themes: Environmental, Social, Managerial and Economic.{' '}
        <strong>Click any category card</strong> to open it. The green bar under each card shows how much of it
        you have filled.
      </p>
      <Callout kind="safe">
        <strong>Any order is fine.</strong> Start with the category you have numbers for. Every category is
        always open, and you can jump back and forth.
      </Callout>
    </div>
  );
}
