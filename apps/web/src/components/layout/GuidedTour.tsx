'use client';

import { useEffect, useState } from 'react';
import type { LucideIcon } from 'lucide-react';
import {
  Sparkles,
  ClipboardList,
  Leaf,
  Map,
  Settings,
  LayoutDashboard,
  BrainCircuit,
  FileBarChart2,
  Download,
  MessageSquare,
  ShieldCheck,
  Loader2,
  X,
  ArrowLeft,
  ArrowRight,
} from 'lucide-react';
import { completeTour } from '@/lib/account-service';
import type { Role } from '@/lib/roles';
import { clsx } from 'clsx';

/** `target` is a sidebar item's data-tour key (its href). Omit for a centered
 * intro step. Each step highlights the real sidebar tab and points at it. */
type Step = { target?: string; icon: LucideIcon; tag: string; title: string; body: string };

const TOURS: Record<Exclude<Role, 'admin'>, Step[]> = {
  data_entry: [
    {
      icon: Sparkles,
      tag: 'Getting started',
      title: 'Welcome to SCALD',
      body: 'A quick tour of the sidebar. As a Data Entry user you record your municipality’s indicators and submit them for review. We’ll point to each section on the left.',
    },
    {
      target: '/data-entry',
      icon: ClipboardList,
      tag: 'Data Entry',
      title: 'Your workspace',
      body: 'Enter indicators here — grouped into 4 sets and 24 categories, per reporting year. Type a value and it is auto-scored 0–5. When all required indicators are filled, submit for review; once approved (or while under review) the data is locked.',
    },
    {
      target: '/efct',
      icon: Leaf,
      tag: 'Ecological Footprint',
      title: 'See the results',
      body: 'After approval, view the computed sustainability scores and estimated footprint. For your role this is read-only.',
    },
    {
      target: '/map',
      icon: Map,
      tag: 'Map',
      title: 'Compare on the map',
      body: 'An interactive map of your municipality and partner cities, coloured by their sustainability scores.',
    },
    {
      target: '/settings',
      icon: Settings,
      tag: 'Settings',
      title: 'Your account',
      body: 'Change your password and see your role and municipality here.',
    },
  ],
  decision_maker: [
    {
      icon: Sparkles,
      tag: 'Getting started',
      title: 'Welcome to SCALD',
      body: 'A quick tour of your tools. As a Decision Maker you review submitted data, approve it, and explore the analysis and reports. We’ll point to each section on the left.',
    },
    {
      target: '/',
      icon: LayoutDashboard,
      tag: 'Overview',
      title: 'Overview',
      body: 'Your home dashboard — the municipality’s sustainability profile and scores at a glance.',
    },
    {
      target: '/data-entry',
      icon: ClipboardList,
      tag: 'Data Review',
      title: 'Review & approve',
      body: 'See what your data-entry team submitted. Approve the year to unlock calculation, or use “Request changes” to send it back with a note. Approving locks the data.',
    },
    {
      target: '/efct',
      icon: Leaf,
      tag: 'Ecological Footprint',
      title: 'Ecological Footprint',
      body: 'The full breakdown — overall score, per-set and per-category results, and the estimated footprint.',
    },
    {
      target: '/ai-dss',
      icon: BrainCircuit,
      tag: 'AI DSS',
      title: 'AI Decision Support',
      body: 'AI-generated improvement strategies for your weakest areas, with impact and feasibility.',
    },
    {
      target: '/ai-rt',
      icon: FileBarChart2,
      tag: 'AI RT',
      title: 'AI Report Tool',
      body: 'Generate narrative reports from your data for council briefings and project reporting.',
    },
    {
      target: '/exports',
      icon: Download,
      tag: 'Data Exports',
      title: 'Exports & reports',
      body: 'Download your data and the formal, chart-rich official report.',
    },
    {
      target: '/feedback',
      icon: MessageSquare,
      tag: 'Feedback',
      title: 'Feedback',
      body: 'Read and respond to feedback related to your municipality.',
    },
    {
      target: '/map',
      icon: Map,
      tag: 'Map',
      title: 'Map',
      body: 'Compare municipalities on an interactive map, coloured by sustainability scores.',
    },
    {
      target: '/settings',
      icon: Settings,
      tag: 'Settings',
      title: 'Your account',
      body: 'Change your password and see your role and municipality here.',
    },
  ],
  researcher: [
    {
      icon: Sparkles,
      tag: 'Getting started',
      title: 'Welcome to SCALD',
      body: 'A quick tour. As a Researcher you have a read-only, cross-municipality view. We’ll point to each section on the left.',
    },
    {
      target: '/',
      icon: LayoutDashboard,
      tag: 'Overview',
      title: 'Aggregate overview',
      body: 'An aggregated sustainability overview across all participating municipalities.',
    },
    {
      target: '/map',
      icon: Map,
      tag: 'Map',
      title: 'Explore the map',
      body: 'An interactive map of all municipalities, coloured by their sustainability scores.',
    },
    {
      target: '/settings',
      icon: Settings,
      tag: 'Settings',
      title: 'Your account',
      body: 'Change your password and see your role and university here.',
    },
  ],
};

type Spot = { top: number; left: number; width: number; height: number };
type Tip = { top: number; left: number; side: 'right' | 'left' };

const PAD = 5;
const GAP = 14;
const TIP_W = 300;

export function GuidedTour({
  role,
  onDone,
}: {
  role: Exclude<Role, 'admin'>;
  onDone: () => Promise<void> | void;
}) {
  const [step, setStep] = useState(0);
  const [finishing, setFinishing] = useState(false);
  const [spot, setSpot] = useState<Spot | null>(null);
  const [tip, setTip] = useState<Tip | null>(null);

  const steps = TOURS[role];
  const current = steps?.[step];

  // Measure the highlighted sidebar item for the current step.
  useEffect(() => {
    if (!current?.target) {
      setSpot(null);
      setTip(null);
      return;
    }
    const sel = `[data-tour="${current.target}"]`;

    const measure = () => {
      const el = document.querySelector(sel);
      if (!el) {
        setSpot(null);
        setTip(null);
        return;
      }
      const r = el.getBoundingClientRect();
      const offscreen =
        r.width === 0 || r.right <= 0 || r.left >= window.innerWidth || r.bottom <= 0;
      if (offscreen) {
        // e.g. mobile drawer closed — fall back to a centered card
        setSpot(null);
        setTip(null);
        return;
      }
      setSpot({ top: r.top - PAD, left: r.left - PAD, width: r.width + PAD * 2, height: r.height + PAD * 2 });

      let side: Tip['side'] = 'right';
      let left = r.right + GAP;
      if (left + TIP_W > window.innerWidth - 12) {
        side = 'left';
        left = Math.max(12, r.left - GAP - TIP_W);
      }
      const top = Math.min(Math.max(r.top - 12, 12), Math.max(12, window.innerHeight - 300));
      setTip({ top, left, side });
    };

    document.querySelector(sel)?.scrollIntoView({ block: 'nearest' });
    const raf = requestAnimationFrame(measure);
    window.addEventListener('resize', measure);
    window.addEventListener('scroll', measure, true);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', measure);
      window.removeEventListener('scroll', measure, true);
    };
  }, [step, current?.target]);

  if (!steps || steps.length === 0 || !current) return null;

  const Icon = current.icon;
  const isLast = step === steps.length - 1;
  const anchored = !!(current.target && spot && tip);

  const finish = async () => {
    setFinishing(true);
    try {
      await completeTour();
      await onDone();
    } finally {
      setFinishing(false);
    }
  };

  const card = (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="tour-title"
      className={clsx(
        'relative overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl',
        anchored ? 'w-full' : 'w-full max-w-md',
      )}
      style={anchored ? { width: TIP_W } : undefined}
    >
      <div className="relative bg-gradient-to-br from-emerald-500 to-teal-600 px-5 pb-4 pt-5 text-white">
        <button
          type="button"
          aria-label="Skip tour"
          onClick={() => void finish()}
          className="absolute right-2.5 top-2.5 rounded-md p-1 text-white/80 transition hover:bg-white/15 hover:text-white"
        >
          <X className="h-4 w-4" />
        </button>
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/15 ring-1 ring-white/25">
          <Icon className="h-5 w-5" />
        </div>
        <p className="mt-2.5 text-[10px] font-semibold uppercase tracking-[0.15em] text-white/80">
          {current.tag}
        </p>
        <h3 id="tour-title" className="mt-0.5 text-base font-bold leading-tight">
          {current.title}
        </h3>
      </div>

      <div className="p-5">
        <p className="text-[13px] leading-relaxed text-slate-600">{current.body}</p>

        <div className="mt-4 flex items-center justify-center gap-1.5">
          {steps.map((_, i) => (
            <span
              key={i}
              className={clsx(
                'h-1.5 rounded-full transition-all',
                i === step ? 'w-5 bg-emerald-500' : 'w-1.5 bg-slate-200',
              )}
            />
          ))}
        </div>

        <div className="mt-4 flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => void finish()}
            disabled={finishing}
            className="text-xs font-medium text-slate-400 transition hover:text-slate-600 disabled:opacity-60"
          >
            Skip
          </button>
          <div className="flex items-center gap-2">
            {step > 0 && (
              <button
                type="button"
                onClick={() => setStep((s) => Math.max(0, s - 1))}
                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </button>
            )}
            {isLast ? (
              <button
                type="button"
                onClick={() => void finish()}
                disabled={finishing}
                className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-emerald-500 to-teal-600 px-3.5 py-1.5 text-sm font-semibold text-white shadow-sm transition hover:opacity-90 disabled:opacity-60"
              >
                {finishing ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
                Get started
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setStep((s) => Math.min(steps.length - 1, s + 1))}
                className="inline-flex items-center gap-1 rounded-lg bg-gradient-to-r from-emerald-500 to-teal-600 px-3.5 py-1.5 text-sm font-semibold text-white shadow-sm transition hover:opacity-90"
              >
                Next
                <ArrowRight className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  // Anchored (spotlight) mode — highlight the real sidebar tab.
  if (anchored && spot && tip) {
    return (
      <>
        {/* click blocker (transparent) — the dim itself comes from the hole's shadow */}
        <div className="fixed inset-0 z-[59]" aria-hidden />
        {/* spotlight hole: transparent centre + emerald ring + dim everywhere else */}
        <div
          aria-hidden
          className="pointer-events-none fixed z-[60] rounded-xl"
          style={{
            top: spot.top,
            left: spot.left,
            width: spot.width,
            height: spot.height,
            boxShadow: '0 0 0 3px rgba(16,185,129,0.95), 0 0 0 9999px rgba(2,6,23,0.62)',
          }}
        />
        {/* tooltip anchored next to the tab */}
        <div className="fixed z-[61]" style={{ top: tip.top, left: tip.left }}>
          <div className="relative">
            <span
              aria-hidden
              className={clsx(
                'absolute top-6 h-3 w-3 rotate-45 border-slate-200 bg-emerald-500',
                tip.side === 'right'
                  ? '-left-1.5 border-b border-l'
                  : '-right-1.5 border-r border-t',
              )}
            />
            {card}
          </div>
        </div>
      </>
    );
  }

  // Fallback — centered card (e.g. the intro step, or when a tab isn't on-screen).
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
      {card}
    </div>
  );
}
