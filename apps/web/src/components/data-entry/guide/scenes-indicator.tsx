'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Eye, Hand, Calculator, ArrowDown, Equal } from 'lucide-react';
import { clsx } from 'clsx';
import type { Indicator } from '@/lib/scald-indicators';
import { autoScore, isNoData, NO_DATA_VALUE } from '@/lib/auto-score';
import { useProfile } from '@/hooks/useProfile';
import { IndicatorRow, SCORE_LABELS } from '../CategoryWizard';
import {
  useTimeline,
  useGuideFocus,
  PlayBar,
  Stage,
  Marker,
  Callout,
  InfoDialog,
  LearnMoreButton,
  pickIndicator,
  isNumeric,
  isInverse,
  isLevel,
  setOf,
} from './primitives';

/* Example indicators — real definitions, so the card matches the real screen. */
const PLAIN = pickIndicator('ES_GI1', (i) => isNumeric(i) && !isInverse(i) && !i.optional && i.unit === '%');
const PER_10K = pickIndicator('ES_IN1', (i) => isNumeric(i) && /10,000 people/.test(i.unit));
const LEVEL = pickIndicator('ES_EN6', (i) => isLevel(i) && !i.optional);
const INVERSE = pickIndicator('ES_WT3', (i) => isInverse(i) && !i.optional);
const OPTIONAL = pickIndicator('ES_LU3', (i) => isNumeric(i) && !!i.optional);

/** A raw value that falls in `score`'s band of this indicator. */
function sampleValue(ind: Indicator, score: number): string {
  const cell = ind.thresholds[score] ?? '';
  const nums = (cell.replace(/[≥≤]/g, '').match(/\d[\d,.]*/g) ?? [])
    .map((n) => Number(n.replace(/,/g, '')))
    .filter((n) => Number.isFinite(n));
  const candidates: number[] = [];
  if (nums.length >= 2) candidates.push((nums[0] + nums[1]) / 2);
  if (nums.length === 1) candidates.push(nums[0] * 1.25 + 1, nums[0] * 0.8, nums[0]);
  for (const c of [0.05, 0.2, 0.5, 1, 2, 5, 10, 25, 50, 100, 250, 1000, 5000]) candidates.push(c);
  for (const c of candidates) {
    const v = String(Math.round(c * 100) / 100);
    if (autoScore(v, ind.thresholds) === score) return v;
  }
  return String(nums[0] ?? 1);
}

type Mode = 'watch' | 'try';

/** Watch an animation / Try it yourself switch. */
function ModeSwitch({ mode, onChange }: { mode: Mode; onChange: (m: Mode) => void }) {
  return (
    <div className="inline-flex rounded-xl border border-slate-200 bg-white p-1 shadow-sm" role="tablist">
      {(
        [
          { id: 'watch', icon: Eye, label: 'Watch' },
          { id: 'try', icon: Hand, label: 'Try it yourself' },
        ] as const
      ).map((m) => (
        <button
          key={m.id}
          type="button"
          role="tab"
          aria-selected={mode === m.id}
          onClick={() => onChange(m.id)}
          className={clsx(
            'inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-sm font-semibold transition',
            mode === m.id ? 'bg-slate-900 text-white shadow' : 'text-slate-600 hover:bg-slate-50',
          )}
        >
          <m.icon className="h-4 w-4" />
          {m.label}
        </button>
      ))}
    </div>
  );
}

/**
 * The real indicator card, driven by the guide. In watch mode it is not
 * clickable (pointer-events off) so a click doesn't seem to do nothing; in try
 * mode the user types and the score is computed live. Nothing is saved.
 */
function SandboxCard({
  indicator,
  raw,
  score,
  interactive,
  onRaw,
  onLevel,
  onClear,
  onNoData,
  focus,
}: {
  indicator: Indicator;
  raw: string;
  score: number | undefined;
  interactive: boolean;
  onRaw?: (v: string) => void;
  onLevel?: (s: number) => void;
  onClear?: () => void;
  onNoData?: () => void;
  focus?: string | null;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useGuideFocus(ref, focus ?? null);
  return (
    <div ref={ref} className={clsx(!interactive && 'pointer-events-none select-none')}>
      <IndicatorRow
        indicator={indicator}
        index={0}
        setCode={setOf(indicator)}
        rawValue={raw}
        currentScore={score}
        onRawChange={onRaw ?? (() => {})}
        onManualScore={onLevel ?? (() => {})}
        onClear={interactive ? onClear : undefined}
        onNoData={interactive ? onNoData : undefined}
      />
    </div>
  );
}

function scoreOf(ind: Indicator, raw: string): number | undefined {
  if (!raw.trim()) return undefined;
  if (isNoData(raw)) return 0; // matches the real form: "No data" is stored with score 0
  return autoScore(raw, ind.thresholds) ?? undefined;
}

/** Tell the user, in words, what the card just did with their number. */
function ScoreReadout({ raw, score, unit }: { raw: string; score: number | undefined; unit: string }) {
  if (!raw.trim()) return null;
  if (isNoData(raw)) {
    return (
      <p className="guide-pop text-[15px] text-slate-700">
        Recorded as <strong>No data</strong> — it scores 0, and the category can still be finished. Press{' '}
        <em>Enter a value instead</em> if you find the number later.
      </p>
    );
  }
  if (score === undefined) {
    return (
      <p className="guide-pop text-[15px] text-amber-800">
        “{raw}” doesn’t fit any band. Check that you typed a plain number in <strong>{unit}</strong>.
      </p>
    );
  }
  return (
    <p className="guide-pop text-[15px] text-slate-700">
      <strong>{raw}</strong> {unit} → score <strong className="text-emerald-700">{score}</strong> (
      {SCORE_LABELS[score]}). The system picked the band for you.
    </p>
  );
}

/* ─────────────────────────────── 5. Read the card ────────────────────── */

const PARTS = [
  { id: 'code', title: 'Code', body: 'A short ID such as ' + PLAIN.code + '. Use it when you ask a colleague about an indicator.' },
  { id: 'name', title: 'Name', body: 'What is being measured.' },
  { id: 'unit', title: 'Unit — the most important line', body: 'The number you type must be in exactly this unit. If it says %, type a percentage; if it says “per 10,000 people”, convert first — the “Convert to the right unit” step shows how.' },
  { id: 'method', title: 'How to calculate it', body: 'The exact recipe for the number, including what to divide by. Read it before you type.' },
  { id: 'value', title: 'Your number goes here', body: 'Type only the number — no units, no spaces.' },
  { id: 'scores', title: 'Score bands (0–5)', body: 'You never pick these yourself for number indicators. When you type a value, the matching band lights up automatically.' },
] as const;

export function AnatomyScene() {
  const [playing, setPlaying] = useState(true);
  const { frame, setFrame, restart, reduced } = useTimeline(PARTS.map(() => 2800), { playing });
  const active = reduced ? null : PARTS[frame].id;

  return (
    <div className="space-y-5">
      <Stage>
        <SandboxCard indicator={PLAIN} raw="" score={undefined} interactive={false} focus={active} />
      </Stage>
      <PlayBar playing={playing} onToggle={() => setPlaying((p) => !p)} onRestart={restart} reduced={reduced} />
      <ol className="grid gap-2 sm:grid-cols-2">
        {PARTS.map((p, i) => (
          <li key={p.id}>
            <button
              type="button"
              onClick={() => {
                setPlaying(false);
                setFrame(i);
              }}
              className={clsx(
                'flex h-full w-full items-start gap-3 rounded-xl border px-4 py-3 text-left transition',
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
      <InfoDialog trigger={<LearnMoreButton>What do the score bands mean?</LearnMoreButton>} title="The six score bands">
        <p>Every indicator is turned into a score from 0 to 5, so very different things can be compared.</p>
        <ul className="space-y-1.5">
          {SCORE_LABELS.map((l, i) => (
            <li key={l} className="flex items-center gap-2">
              <span className="w-6 text-center font-bold">{i}</span>
              <span>{l}</span>
            </li>
          ))}
        </ul>
        <p>
          Each band shows the range of values that earns it. <code className="rounded bg-slate-100 px-1">&gt;15–≤30</code>{' '}
          means “more than 15, up to and including 30”.
        </p>
      </InfoDialog>
    </div>
  );
}

/* ─────────────────────────────── 6. Type a number ────────────────────── */

export function TypeNumberScene() {
  const [mode, setMode] = useState<Mode>('watch');
  const [playing, setPlaying] = useState(true);
  const sample = useMemo(() => sampleValue(PLAIN, 3), []);
  // 0: empty · 1..n: one more character typed · n+1: hold on the result
  const frames = useMemo(() => [1200, ...sample.split('').map(() => 380), 3200], [sample]);
  const { frame, restart, reduced } = useTimeline(frames, { playing: playing && mode === 'watch' });
  const watchRaw = sample.slice(0, Math.min(frame, sample.length));
  const [tryRaw, setTryRaw] = useState('');

  const raw = mode === 'watch' ? watchRaw : tryRaw;
  const score = scoreOf(PLAIN, raw);
  const typing = mode === 'watch' && frame > 0 && frame <= sample.length && !reduced;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <ModeSwitch mode={mode} onChange={setMode} />
        {mode === 'watch' && (
          <PlayBar playing={playing} onToggle={() => setPlaying((p) => !p)} onRestart={restart} reduced={reduced} />
        )}
      </div>
      <Stage>
        {mode === 'watch' && typing && (
          <p className="mb-2 text-sm font-medium text-slate-500">
            Typing: <span className="guide-caret font-mono text-slate-900">{watchRaw}</span>
          </p>
        )}
        <SandboxCard
          indicator={PLAIN}
          raw={raw}
          score={score}
          interactive={mode === 'try'}
          onRaw={setTryRaw}
          onClear={() => setTryRaw('')}
          onNoData={() => setTryRaw(NO_DATA_VALUE)}
          focus={mode === 'watch' ? (frame > sample.length || reduced ? 'scores' : 'value') : null}
        />
        <div className="mt-3 min-h-[1.5rem]">
          {mode === 'watch' ? (
            (frame > sample.length || reduced) && <ScoreReadout raw={sample} score={scoreOf(PLAIN, sample)} unit={PLAIN.unit} />
          ) : tryRaw ? (
            <ScoreReadout raw={tryRaw} score={score} unit={PLAIN.unit} />
          ) : (
            <p className="text-[15px] text-slate-600">
              Click the <strong>Raw value</strong> box and type a number — try{' '}
              {[1, 3, 5].map((s, i) => (
                <span key={s}>
                  {i > 0 && (i === 2 ? ' and ' : ', ')}
                  <strong>{sampleValue(PLAIN, s)}</strong>
                </span>
              ))}
              . Nothing here is saved.
            </p>
          )}
        </div>
      </Stage>
      <Callout kind="safe">
        <strong>Saved as you type.</strong> On the real page there is no Save button — each value is stored
        the moment you type it. To change it, type over it; to remove it, empty the box or press the ×.
      </Callout>
      <Callout kind="tip">
        <strong>No number for a required indicator?</strong> Press <em>I don’t have this number</em> under the
        box (try it above). It records “No data”, which scores 0 — honest, and it still lets you submit.{' '}
        <strong>Don’t type 0 instead:</strong> for indicators where lower is better, 0 is the best score.
      </Callout>
      {/* Matches auto-score.ts: in a raw value a dot is always a decimal point,
          while a comma followed by exactly three digits is read as thousands
          (1,234 → 1234). "Dot for decimals, nothing for thousands" is the one
          rule that is never misread. */}
      <Callout kind="warn">
        <strong>Numbers: a dot for decimals, nothing between thousands.</strong> Type <strong>49721</strong>,
        not <strong>49.721</strong> — the system would read that as 49.7. If you slip, the card usually spots it
        and offers a one-click fix. Write decimals with a dot: <strong>0.6</strong>, <strong>12.5</strong>.
      </Callout>
    </div>
  );
}

/* ─────────────────────────────── 7. Convert to the right unit ────────── */

type Kind = 'per10k' | 'per100km2' | 'percent' | 'perPerson';

const KINDS: Record<Kind, { tab: string; whenUnit: string; aLabel: string; bLabel: string; bHint: string; formula: string; apply: (a: number, b: number) => number }> = {
  per10k: {
    tab: 'per 10,000 people',
    whenUnit: '“…/10,000 people”',
    aLabel: 'How many you have (e.g. stations)',
    bLabel: 'Population of your municipality',
    bHint: 'people',
    formula: '(number ÷ population) × 10,000',
    apply: (a, b) => (a / b) * 10000,
  },
  per100km2: {
    tab: 'per 100 km²',
    whenUnit: '“…/100 km²”',
    aLabel: 'How many you have',
    bLabel: 'Area in km² (the area the card names)',
    bHint: 'km²',
    formula: '(number ÷ area in km²) × 100',
    apply: (a, b) => (a / b) * 100,
  },
  percent: {
    tab: 'percent (%)',
    whenUnit: '“%”',
    aLabel: 'The part (e.g. trained staff)',
    bLabel: 'The total (e.g. all staff)',
    bHint: 'total',
    formula: '(part ÷ total) × 100',
    apply: (a, b) => (a / b) * 100,
  },
  perPerson: {
    tab: 'per person',
    whenUnit: '“…/person”',
    aLabel: 'The yearly total (e.g. kWh)',
    bLabel: 'Population of your municipality',
    bHint: 'people',
    formula: 'total ÷ population',
    apply: (a, b) => a / b,
  },
};

/**
 * Lenient number read for the calculator — it helps rather than polices, so it
 * accepts the separators people actually type:
 *   "1.250.000" / "1,250,000"  → 1250000   (repeated separator = thousands)
 *   "1.250,5"   / "1,250.5"    → 1250.5    (the last separator is the decimal)
 *   "0,6"       / "0.6"        → 0.6
 * A population is a whole number, so a lone separator in it can only be
 * thousands: "49.721" → 49721 — the very habit that makes the real form
 * misread it.
 */
function readNumber(s: string, whole: boolean): number | null {
  let t = s.trim().replace(/\s/g, '');
  if (!t) return null;
  const dots = (t.match(/\./g) ?? []).length;
  const commas = (t.match(/,/g) ?? []).length;
  if (dots && commas) {
    const decimal = t.lastIndexOf('.') > t.lastIndexOf(',') ? '.' : ',';
    const thousands = decimal === '.' ? ',' : '.';
    t = t.split(thousands).join('').replace(decimal, '.');
  } else if (dots > 1 || commas > 1 || whole) {
    t = t.replace(/[.,]/g, '');
  } else {
    t = t.replace(',', '.');
  }
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

/**
 * Round finer than any threshold step (the finest band edge is 0.05), so the
 * rounded number the user types lands in the same band as the exact one —
 * 1.204 shown as "1.2" would drop from ">1.2" into "≤1.2".
 */
function fmt(n: number): string {
  if (n === 0) return '0';
  const abs = Math.abs(n);
  const digits = abs >= 100 ? 1 : abs >= 1 ? 3 : 4;
  return String(Math.round(n * 10 ** digits) / 10 ** digits);
}

export function UnitScene() {
  const { profile } = useProfile();
  const muni = profile?.municipality;
  const myPopulation = muni && muni.population > 0 ? muni.population : null;

  const [kind, setKind] = useState<Kind>('per10k');
  const [a, setA] = useState('');
  const [b, setB] = useState('');
  const k = KINDS[kind];

  // Pre-fill the population with the user's own municipality.
  useEffect(() => {
    if ((kind === 'per10k' || kind === 'perPerson') && myPopulation && !b) setB(String(myPopulation));
  }, [kind, myPopulation, b]);

  const an = readNumber(a, false);
  const bn = readNumber(b, k.bHint === 'people');
  const result = an !== null && bn ? k.apply(an, bn) : null;

  // Worked example on the real per-10,000 indicator.
  const [playing, setPlaying] = useState(true);
  const { frame, restart, reduced } = useTimeline([1400, 1600, 1600, 1600, 3600], { playing });
  const exPop = myPopulation ?? 49721;
  const exCount = 3;
  const exValue = fmt((exCount / exPop) * 10000);
  const exScore = scoreOf(PER_10K, exValue);

  return (
    <div className="space-y-5">
      <p className="text-[15px] leading-relaxed text-slate-700">
        Many indicators don’t want a plain count. To compare a city of 800,000 with a town of 3,000 fairly,
        they ask for a value <strong>per 10,000 people</strong>, <strong>per 100 km²</strong> or as a{' '}
        <strong>percentage</strong>. The card’s <strong>Unit</strong> line tells you which.
      </p>

      <Stage>
        <p className="text-sm font-semibold text-slate-500">Worked example — {PER_10K.name}</p>
        <div className="mt-3 grid items-center gap-3 text-center sm:grid-cols-[1fr_auto_1fr_auto_1fr]">
          <div className={clsx('rounded-xl border bg-white p-3 transition', frame >= 0 ? 'border-slate-200' : 'opacity-30')}>
            <p className="text-2xl font-bold text-slate-900">{exCount}</p>
            <p className="text-xs text-slate-500">stations in your municipality</p>
          </div>
          <span className={clsx('text-xl font-bold text-slate-400 transition', frame >= 1 ? 'opacity-100' : 'opacity-0')}>÷</span>
          <div className={clsx('rounded-xl border border-slate-200 bg-white p-3 transition', frame >= 1 ? 'opacity-100' : 'opacity-0')}>
            <p className="text-2xl font-bold text-slate-900">{exPop.toLocaleString('en-US')}</p>
            <p className="text-xs text-slate-500">{myPopulation ? `people in ${muni?.name}` : 'people'}</p>
          </div>
          <span className={clsx('text-xl font-bold text-slate-400 transition', frame >= 2 ? 'opacity-100' : 'opacity-0')}>× 10,000</span>
          <div
            className={clsx(
              'rounded-xl border-2 p-3 transition',
              frame >= 3 ? 'border-emerald-400 bg-emerald-50 opacity-100' : 'border-transparent opacity-0',
              frame === 3 && 'guide-press',
            )}
          >
            <p className="text-2xl font-bold text-emerald-700">{exValue}</p>
            <p className="text-xs text-emerald-700">type this</p>
          </div>
        </div>
        <div className={clsx('mt-4 transition', frame >= 4 ? 'opacity-100' : 'opacity-0')}>
          <div className="mb-2 flex items-center justify-center text-slate-400">
            <ArrowDown className="h-5 w-5" />
          </div>
          <SandboxCard
            indicator={PER_10K}
            raw={frame >= 4 ? exValue : ''}
            score={frame >= 4 ? exScore : undefined}
            interactive={false}
            focus={frame >= 4 ? 'unit' : null}
          />
        </div>
      </Stage>
      <PlayBar playing={playing} onToggle={() => setPlaying((p) => !p)} onRestart={restart} reduced={reduced} />

      <div className="rounded-2xl border-2 border-sky-200 bg-white p-4 sm:p-5">
        <div className="flex items-center gap-2">
          <Calculator className="h-5 w-5 text-sky-600" />
          <h3 className="text-base font-bold text-slate-900">Calculator</h3>
          <span className="text-sm text-slate-500">— use it for real; nothing is saved</span>
        </div>
        <div className="mt-3 flex flex-wrap gap-1.5" role="tablist" aria-label="Unit type">
          {(Object.keys(KINDS) as Kind[]).map((id) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={kind === id}
              onClick={() => {
                setKind(id);
                setA('');
                setB('');
              }}
              className={clsx(
                'rounded-lg px-3 py-1.5 text-sm font-semibold transition',
                kind === id ? 'bg-sky-600 text-white' : 'bg-sky-50 text-sky-800 hover:bg-sky-100',
              )}
            >
              {KINDS[id].tab}
            </button>
          ))}
        </div>
        <p className="mt-2 text-sm text-slate-600">
          Use this when the card’s unit ends in {k.whenUnit}. Formula: <strong>{k.formula}</strong>
        </p>
        <div className="mt-3 grid items-end gap-3 sm:grid-cols-[1fr_auto_1fr_auto_1fr]">
          <label className="block">
            <span className="text-sm font-medium text-slate-700">{k.aLabel}</span>
            <input
              inputMode="decimal"
              value={a}
              onChange={(e) => setA(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-lg outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20"
            />
          </label>
          <span className="pb-3 text-center text-xl font-bold text-slate-400">÷</span>
          <label className="block">
            <span className="text-sm font-medium text-slate-700">{k.bLabel}</span>
            <input
              inputMode="decimal"
              value={b}
              onChange={(e) => setB(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-lg outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/20"
            />
          </label>
          <Equal className="mx-auto mb-3 h-5 w-5 text-slate-400" />
          <div className="rounded-lg border-2 border-emerald-300 bg-emerald-50 px-3 py-2 text-center">
            <p className="text-xs font-medium text-emerald-700">Type this into the card</p>
            <p className="text-2xl font-bold text-emerald-800" aria-live="polite">
              {result !== null ? fmt(result) : '—'}
            </p>
          </div>
        </div>
        {(kind === 'per10k' || kind === 'perPerson') && myPopulation && (
          <p className="mt-2 text-xs text-slate-500">
            Population pre-filled for {muni?.name}. Change it if the card asks for a different year’s figure.
          </p>
        )}
      </div>

      <Callout kind="tip">
        <strong>Always read the card’s method line.</strong> Some indicators divide by something other than the
        whole population — for example “socially vulnerable residents” or “urban area”, not the whole
        municipality. The method line names exactly what to divide by.
      </Callout>
    </div>
  );
}

/* ─────────────────────────────── 8. Pick a level ─────────────────────── */

export function LevelScene() {
  const [mode, setMode] = useState<Mode>('watch');
  const [playing, setPlaying] = useState(true);
  // walks the highlight up the levels, stopping on level 3
  const { frame, restart, reduced } = useTimeline([1300, 700, 700, 700, 3400], { playing: playing && mode === 'watch' });
  const watchScore = frame === 0 ? undefined : Math.min(frame, 3);
  const [tryScore, setTryScore] = useState<number | undefined>(undefined);
  const score = mode === 'watch' ? (reduced ? 3 : watchScore) : tryScore;

  return (
    <div className="space-y-5">
      <p className="text-[15px] leading-relaxed text-slate-700">
        Some indicators aren’t a number but a <strong>stage</strong> — for example, how far your climate plan
        has got. Instead of a box to type in, they show a list. <strong>Pick the sentence that best describes
        your municipality today.</strong>
      </p>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <ModeSwitch mode={mode} onChange={setMode} />
        {mode === 'watch' && (
          <PlayBar playing={playing} onToggle={() => setPlaying((p) => !p)} onRestart={restart} reduced={reduced} />
        )}
      </div>
      <Stage>
        <SandboxCard
          indicator={LEVEL}
          raw={score !== undefined ? String(score) : ''}
          score={score}
          interactive={mode === 'try'}
          onLevel={setTryScore}
          onClear={() => setTryScore(undefined)}
          focus={mode === 'watch' ? 'scores' : null}
        />
        {score !== undefined && (
          <p className="guide-pop mt-3 text-[15px] text-slate-700">
            Level <strong>{score}</strong> chosen: “{LEVEL.thresholds[score]}”.
          </p>
        )}
      </Stage>
      <Callout kind="tip">
        <strong>Two ways to choose:</strong> open the <em>Level</em> list, or click one of the coloured
        cards. Both do the same thing.
      </Callout>
      <Callout kind="safe">
        <strong>Be honest, not hopeful.</strong> Pick what is true now, not what is planned. If a plan is
        approved but not yet being carried out, choose the level that says exactly that.
      </Callout>
    </div>
  );
}

/* ─────────────────────────────── 9. Lower is better ──────────────────── */

export function InverseScene() {
  const [mode, setMode] = useState<Mode>('watch');
  const [playing, setPlaying] = useState(true);
  const high = useMemo(() => sampleValue(INVERSE, 1), []);
  const low = useMemo(() => sampleValue(INVERSE, 5), []);
  // 0: empty · 1: high value (bad) · 2: low value (good)
  const { frame, restart, reduced } = useTimeline([1200, 3000, 3600], { playing: playing && mode === 'watch' });
  const watchRaw = frame === 1 ? high : frame === 2 || reduced ? low : '';
  const [tryRaw, setTryRaw] = useState('');
  const raw = mode === 'watch' ? watchRaw : tryRaw;
  const score = scoreOf(INVERSE, raw);

  return (
    <div className="space-y-5">
      <p className="text-[15px] leading-relaxed text-slate-700">
        For most indicators, a bigger number is better. But for things we want <strong>less</strong> of —
        water use, waste, pollution, response times — a <strong>smaller number scores higher</strong>. These
        cards show an amber note saying so.
      </p>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <ModeSwitch mode={mode} onChange={setMode} />
        {mode === 'watch' && (
          <PlayBar playing={playing} onToggle={() => setPlaying((p) => !p)} onRestart={restart} reduced={reduced} />
        )}
      </div>
      <Stage>
        <SandboxCard
          indicator={INVERSE}
          raw={raw}
          score={score}
          interactive={mode === 'try'}
          onRaw={setTryRaw}
          onClear={() => setTryRaw('')}
          onNoData={() => setTryRaw(NO_DATA_VALUE)}
          focus={mode === 'watch' ? 'direction' : null}
        />
        <div className="mt-3 min-h-[1.5rem]">
          <ScoreReadout raw={raw} score={score} unit={INVERSE.unit} />
        </div>
      </Stage>
      <Callout kind="safe">
        <strong>You don’t have to do anything special.</strong> Type the real value — the system knows the
        direction and scores it correctly. The note is only there so a low score doesn’t surprise you.
      </Callout>
    </div>
  );
}

/* ─────────────────────────────── 10. Optional (purple) ───────────────── */

export function OptionalScene() {
  const [raw, setRaw] = useState('');
  const score = scoreOf(OPTIONAL, raw);

  return (
    <div className="space-y-5">
      <p className="text-[15px] leading-relaxed text-slate-700">
        Some cards are <strong className="text-purple-700">purple</strong> and marked{' '}
        <strong className="text-purple-700">Optional</strong>. They cover things not every municipality
        has — a coastline, forests, farmland, heavy industry.
      </p>
      <Stage>
        <SandboxCard
          indicator={OPTIONAL}
          raw={raw}
          score={score}
          interactive
          onRaw={setRaw}
          onClear={() => setRaw('')}
          focus="optional"
        />
      </Stage>
      <div className="grid gap-3 sm:grid-cols-2">
        <Callout kind="safe">
          <strong>Doesn’t apply, or no data?</strong> Leave it empty. It never stops you from finishing a
          category or submitting.
        </Callout>
        <Callout kind="tip">
          <strong>Have the number?</strong> Fill it in — it counts towards your score just like any other
          indicator.
        </Callout>
      </div>
    </div>
  );
}
