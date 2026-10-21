'use client';

import { useState } from 'react';
import {
  CheckCircle2,
  Sparkles,
  Send,
  Lock,
  BadgeCheck,
  PencilLine,
  MessageSquareWarning,
  ChevronDown,
  Square,
  CheckSquare,
  Leaf,
} from 'lucide-react';
import { clsx } from 'clsx';
import { REQUIRED_INDICATORS } from '@/lib/scald-indicators';
import { SUBMITTER_DECLARATION_TEXT } from '../SubmissionCard';
import { useTimeline, PlayBar, Stage, Callout, InfoDialog, LearnMoreButton } from './primitives';

/* ─────────────────────────────── 11. Finish a category ───────────────── */

export function FinishScene() {
  const [playing, setPlaying] = useState(true);
  // 0: 2 left · 1: 1 left · 2: all done, button lit · 3: pressed · 4: celebration
  const { frame, restart, reduced } = useTimeline([1600, 1400, 1500, 600, 3200], { playing });
  const left = frame === 0 ? 2 : frame === 1 ? 1 : 0;
  const total = 6;
  const done = total - left;

  return (
    <div className="space-y-5">
      <Stage className="relative min-h-[220px]">
        <div aria-hidden>
          <div className="space-y-2">
            {Array.from({ length: total }).map((_, i) => {
              const filled = i < done;
              return (
                <div
                  key={i}
                  className={clsx(
                    'flex items-center gap-3 rounded-lg border bg-white px-3 py-2 transition-all duration-500',
                    filled ? 'border-emerald-200' : 'border-slate-200',
                  )}
                >
                  <span
                    className={clsx(
                      'flex h-6 w-6 items-center justify-center rounded-md text-[10px] font-bold transition',
                      filled ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-500',
                    )}
                  >
                    {filled ? <CheckCircle2 className="h-3.5 w-3.5" /> : i + 1}
                  </span>
                  <span className="h-2 flex-1 rounded bg-slate-100" />
                </div>
              );
            })}
          </div>
          <div className="mt-3 flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-3 shadow-lg">
            <span className="text-sm text-slate-600">
              {left > 0 ? (
                `${left} more required indicator(s) to score`
              ) : (
                <span className="flex items-center gap-1.5 font-medium text-slate-800">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" /> All {total} required indicators completed
                </span>
              )}
            </span>
            <span
              className={clsx(
                'inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-emerald-500 to-green-600 px-3 py-1.5 text-sm font-semibold text-white transition',
                left > 0 ? 'opacity-40' : 'opacity-100',
                frame === 3 && 'guide-press',
              )}
            >
              Finish category <Sparkles className="h-4 w-4" />
            </span>
          </div>
        </div>
        {frame === 4 && !reduced && (
          <div className="guide-pop absolute inset-0 flex items-center justify-center rounded-2xl bg-slate-900/50 p-4" aria-hidden>
            <div className="rounded-2xl bg-white p-6 text-center shadow-2xl">
              <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-green-600 text-white">
                <CheckCircle2 className="h-7 w-7" />
              </span>
              <p className="mt-3 text-lg font-bold text-slate-900">Category complete!</p>
              <p className="text-sm text-slate-500">Next up: the next category</p>
            </div>
          </div>
        )}
      </Stage>
      <PlayBar playing={playing} onToggle={() => setPlaying((p) => !p)} onRestart={restart} reduced={reduced} />

      <p className="text-[15px] leading-relaxed text-slate-700">
        The bar at the bottom of a category counts down the required indicators. When it reaches zero, the{' '}
        <strong>Finish category</strong> button lights up. Press it to put a tick on that category’s card, so
        you can see at a glance what is left.
      </p>
      <Callout kind="safe">
        <strong>Finishing doesn’t lock anything.</strong> You can still open the category and change values
        afterwards — right up until you submit.
      </Callout>
    </div>
  );
}

/* ─────────────────────────────── 12. Submit for review ───────────────── */

export function SubmitScene() {
  const [playing, setPlaying] = useState(true);
  // 0: card · 1: button pressed · 2: dialog · 3: box ticked · 4: sent · 5: submitted (hold)
  const { frame, restart, reduced } = useTimeline([1600, 600, 1500, 1300, 700, 3400], { playing });
  const dialog = frame === 2 || frame === 3 || frame === 4;
  const ticked = frame >= 3;
  const submitted = frame === 5;

  const readyCard = (
    <div className="rounded-xl border border-sky-200 bg-sky-50 p-4">
      <p className="text-base font-semibold text-sky-900">Ready to submit?</p>
      <p className="mt-1 text-sm text-sky-800">
        All required indicators are filled. Submit the data with your accuracy declaration so the decision
        maker can review it.
      </p>
      <span
        className={clsx(
          'mt-3 inline-flex items-center gap-1.5 rounded-lg bg-sky-600 px-3.5 py-2 text-sm font-semibold text-white',
          frame === 1 && 'guide-press',
        )}
      >
        <Send className="h-4 w-4" /> Submit for review
      </span>
    </div>
  );
  const declaration = (isTicked: boolean) => (
    <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl">
      <p className="text-base font-bold text-slate-900">Submit data for review</p>
      <div
        className={clsx(
          'mt-3 flex items-start gap-2 rounded-lg border p-3 text-sm transition',
          isTicked ? 'border-emerald-300 bg-emerald-50' : 'border-slate-200',
        )}
      >
        {isTicked ? (
          <CheckSquare className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
        ) : (
          <Square className="mt-0.5 h-5 w-5 shrink-0 text-slate-400" />
        )}
        <span className="text-slate-700">{SUBMITTER_DECLARATION_TEXT}</span>
      </div>
      <span
        className={clsx(
          'mt-3 inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-sky-600 px-3 py-2 text-sm font-semibold text-white transition',
          isTicked ? 'opacity-100' : 'opacity-40',
          frame === 4 && 'guide-press',
        )}
      >
        <Send className="h-4 w-4" /> Submit
      </span>
    </div>
  );
  const submittedCard = (
    <div className="guide-pop rounded-xl border border-amber-200 bg-amber-50 p-4">
      <p className="flex items-center gap-2 text-base font-semibold text-amber-900">
        <Lock className="h-4 w-4" /> Submitted — awaiting decision maker
      </p>
      <p className="mt-1 text-sm text-amber-800">
        The decision maker will read the declaration and either approve the data or ask for changes.
      </p>
    </div>
  );

  return (
    <div className="space-y-5">
      {reduced ? (
        // No animation: show all three moments at once, so the declaration
        // text — the part that matters — is not lost with the motion.
        <Stage>
          <div aria-hidden className="space-y-3">
            {readyCard}
            <div className="flex justify-center">{declaration(true)}</div>
            {submittedCard}
          </div>
        </Stage>
      ) : (
        <Stage className="relative min-h-[260px]">
          <div aria-hidden>{submitted ? submittedCard : readyCard}</div>
          {dialog && (
            <div className="guide-pop absolute inset-0 flex items-center justify-center rounded-2xl bg-slate-900/50 p-3" aria-hidden>
              {declaration(ticked)}
            </div>
          )}
        </Stage>
      )}
      <PlayBar playing={playing} onToggle={() => setPlaying((p) => !p)} onRestart={restart} reduced={reduced} />

      <ol className="space-y-2 text-[15px] leading-relaxed text-slate-700">
        <li>
          <strong>1.</strong> When all <strong>{REQUIRED_INDICATORS} required indicators</strong> are filled, the
          card at the top of the data-entry page says <em>Ready to submit?</em>
        </li>
        <li>
          <strong>2.</strong> Press <strong>Submit for review</strong>.
        </li>
        <li>
          <strong>3.</strong> Read the declaration and tick the box — you are confirming the values are correct
          as far as you know. You can add a short note for the decision maker.
        </li>
        <li>
          <strong>4.</strong> Press <strong>Submit</strong>.
        </li>
      </ol>
      <Callout kind="warn">
        <strong>After submitting, the year is locked.</strong> You can no longer change values while the
        decision maker reviews them. Check your numbers before you press Submit.
      </Callout>
      <InfoDialog trigger={<LearnMoreButton>Do I have to press “Finish category” first?</LearnMoreButton>} title="Do I have to finish every category first?">
        <p>
          No. Submitting only needs every <strong>required</strong> indicator to have a value. The{' '}
          <em>Finish category</em> ticks are there to help you keep track — they are not a condition for
          submitting.
        </p>
        <p>Optional (purple) indicators never block submission, filled or not.</p>
      </InfoDialog>
    </div>
  );
}

/* ─────────────────────────────── 13. Review and approval ─────────────── */

const FLOW = [
  { id: 'edit', icon: PencilLine, title: 'You are filling in', body: 'You can change anything.', tone: 'border-slate-200 bg-white text-slate-700' },
  { id: 'sub', icon: Lock, title: 'Submitted', body: 'Locked while the decision maker reviews.', tone: 'border-amber-200 bg-amber-50 text-amber-900' },
  { id: 'ok', icon: BadgeCheck, title: 'Approved', body: 'Final. The results are calculated.', tone: 'border-emerald-200 bg-emerald-50 text-emerald-900' },
  { id: 'rev', icon: MessageSquareWarning, title: 'Changes requested', body: 'Unlocked again, with a note on what to fix.', tone: 'border-rose-200 bg-rose-50 text-rose-900' },
] as const;

export function ReviewScene() {
  const [playing, setPlaying] = useState(true);
  // approval path: edit → sub → ok ; then revision path: edit → sub → rev → edit
  const PATH = ['edit', 'sub', 'ok', 'edit', 'sub', 'rev', 'edit'] as const;
  const { frame, restart, reduced } = useTimeline([1500, 1800, 2600, 1300, 1800, 2600, 1800], { playing });
  const at = reduced ? null : PATH[frame];
  const revisionRun = frame >= 3;

  return (
    <div className="space-y-5">
      <Stage>
        <div aria-hidden>
          <p className="mb-3 text-center text-sm font-semibold text-slate-500">
            {reduced ? 'The four states of a reporting year' : revisionRun ? 'When something needs fixing' : 'When everything is fine'}
          </p>
          <div className="grid gap-3 sm:grid-cols-4">
            {FLOW.map((s) => {
              const Icon = s.icon;
              const here = at === s.id;
              return (
                <div
                  key={s.id}
                  className={clsx(
                    'rounded-xl border p-3 text-center transition-all duration-500',
                    s.tone,
                    reduced || here ? 'opacity-100' : 'opacity-35',
                    here && 'scale-105 shadow-lg ring-4 ring-amber-300',
                  )}
                >
                  <Icon className="mx-auto h-6 w-6" />
                  <p className="mt-1.5 text-sm font-bold">{s.title}</p>
                  <p className="text-xs leading-snug opacity-80">{s.body}</p>
                </div>
              );
            })}
          </div>
        </div>
      </Stage>
      <PlayBar playing={playing} onToggle={() => setPlaying((p) => !p)} onRestart={restart} reduced={reduced} />

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-emerald-200 bg-white p-4">
          <p className="flex items-center gap-2 text-[15px] font-bold text-emerald-800">
            <BadgeCheck className="h-5 w-5" /> If it is approved
          </p>
          <p className="mt-1 text-sm leading-relaxed text-slate-700">
            The card turns green: <em>Approved — ready to calculate</em>. The results appear on the{' '}
            <Leaf className="inline h-3.5 w-3.5 text-emerald-600" /> <strong>Ecological Footprint</strong> page.
            The year is now final.
          </p>
        </div>
        <div className="rounded-xl border border-rose-200 bg-white p-4">
          <p className="flex items-center gap-2 text-[15px] font-bold text-rose-800">
            <MessageSquareWarning className="h-5 w-5" /> If changes are requested
          </p>
          <p className="mt-1 text-sm leading-relaxed text-slate-700">
            The card says <em>Changes requested — please revise</em> and shows the decision maker’s note. Fix
            what it asks for, then press <strong>Submit for review</strong> again.
          </p>
        </div>
      </div>
      <Callout kind="tip">
        <strong>Found a mistake after approval?</strong> Approved data can only be corrected by an
        administrator. Tell your decision maker or the SCALD coordinator.
      </Callout>
    </div>
  );
}

/* ─────────────────────────────── 14. Help ─────────────────────────────── */

const MISTAKES = [
  {
    title: 'Typing 0 when you don’t know',
    body: '0 is a real value, not “no data”. For indicators where lower is better — consumption, pollution, losses — 0 is the BEST possible score. If you don’t have the number, press “I don’t have this number” under the box instead: it records “No data”, which scores 0.',
  },
  {
    title: 'A total where the card asks “per 10,000 people”',
    body: 'If the unit line mentions per 10,000 people, per 100 km² or %, convert first. The calculator in “Convert to the right unit” does it for you.',
  },
  {
    title: 'A dot between thousands',
    body: 'Type 49721, not 49.721 — the dot is read as a decimal point. If you slip, the card usually notices and offers a one-click fix. Use a dot only for decimals: 0.6.',
  },
  {
    title: 'The wrong reporting year',
    body: 'Check the year box at the top before you start. If you typed values under the wrong year, remove them there (empty the box, or press the × in it) and type them again under the right year.',
  },
  {
    title: 'Clearing a whole year by accident',
    body: 'The “Clear” button next to the Preparation sheet deletes every value of the year on screen. It asks you to type the year first — do so only if you really mean to start that year again.',
  },
] as const;

const FAQ = [
  {
    q: 'The card says the value “doesn’t match any threshold”.',
    a: 'The number is outside every band — usually a typo, a unit mix-up (a total instead of a rate), or a percentage above 100. Check the unit line and the method line.',
  },
  {
    q: 'I see “Unusually high” under my value.',
    a: 'Your value is far above the highest band. You can still save it, but double-check: the most common cause is a total typed where a rate per 10,000 people was asked for.',
  },
  {
    q: 'Where do I find the numbers?',
    a: 'From your municipality’s departments — water, energy, planning, finance and so on. The Preparation sheet (button at the top of the data-entry page) lists every indicator with its method, so you can send it to colleagues and collect the numbers first.',
  },
  {
    q: 'Can two of us enter data at the same time?',
    a: 'No — each municipality has one data-entry user, who enters and submits all its values. If two people type into the same indicator, the last value typed silently replaces the other. Colleagues can still help by collecting the numbers: send them the Preparation sheet.',
  },
  {
    q: 'An amber message says changes are “not saved to the server yet”.',
    a: 'The connection dropped. Your changes are kept on this computer and sent automatically when it comes back — or press “Try again now”. Keep the page open until the message disappears.',
  },
  {
    q: 'How do I remove a value I typed by mistake?',
    a: 'Empty the box (or press the small × inside it) and click somewhere else. For a level, press “Clear” next to the selected level. This works until you submit.',
  },
  {
    q: 'I can’t find the number for a required indicator.',
    a: 'First ask the department that would hold it. If it really doesn’t exist, press “I don’t have this number” under the box. That records “No data” (it scores 0) and lets you submit. Never type 0 instead.',
  },
  {
    q: 'I submitted, then noticed a mistake.',
    a: 'Ask your decision maker to press “Request changes”. The year unlocks, you fix the value and submit again.',
  },
] as const;

function Faq({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-xl border border-slate-200 bg-white">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left text-[15px] font-semibold text-slate-900"
      >
        {q}
        <ChevronDown className={clsx('h-5 w-5 shrink-0 text-slate-400 transition', open && 'rotate-180')} />
      </button>
      {open && <p className="guide-pop px-4 pb-4 text-[15px] leading-relaxed text-slate-700">{a}</p>}
    </div>
  );
}

export function HelpScene() {
  return (
    <div className="space-y-6">
      <section>
        <h3 className="text-base font-bold text-slate-900">The five most common mistakes</h3>
        <ol className="mt-3 space-y-2">
          {MISTAKES.map((m, i) => (
            <li key={m.title} className="flex gap-3 rounded-xl border border-rose-100 bg-rose-50/50 px-4 py-3">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-rose-100 text-sm font-bold text-rose-700">
                {i + 1}
              </span>
              <span>
                <span className="block text-[15px] font-semibold text-slate-900">{m.title}</span>
                <span className="block text-sm leading-relaxed text-slate-700">{m.body}</span>
              </span>
            </li>
          ))}
        </ol>
      </section>
      <section>
        <h3 className="text-base font-bold text-slate-900">Questions</h3>
        <div className="mt-3 space-y-2">
          {FAQ.map((f) => (
            <Faq key={f.q} q={f.q} a={f.a} />
          ))}
        </div>
      </section>
      <Callout kind="safe">
        <strong>Still stuck?</strong> Ask your municipality’s SCALD coordinator, or the decision maker who
        reviews your data. You can reopen this guide at any time from the sidebar.
      </Callout>
    </div>
  );
}
