'use client';

import { useState } from 'react';
import type { LucideIcon } from 'lucide-react';
import {
  Sparkles,
  ClipboardList,
  Send,
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
import { useProfile } from '@/hooks/useProfile';
import { completeTour } from '@/lib/account-service';
import type { Role } from '@/lib/roles';
import { clsx } from 'clsx';

type Step = { icon: LucideIcon; tag: string; title: string; body: string };

/**
 * First-login guided tour: explains what each section does and where to do it.
 * Shown once per user for every role EXCEPT admin. Finishing or skipping stores
 * a timestamp so it never appears again.
 */
const TOURS: Record<Exclude<Role, 'admin'>, Step[]> = {
  data_entry: [
    {
      icon: Sparkles,
      tag: 'Getting started',
      title: 'Welcome to SCALD',
      body: 'A quick 30-second tour of where things are. As a Data Entry user you record your municipality’s sustainability indicators and submit them for review.',
    },
    {
      icon: ClipboardList,
      tag: 'Sidebar · Data Entry',
      title: 'Data Entry — your workspace',
      body: 'Indicators are grouped into 4 sustainability sets and 24 categories, for each reporting year. Type a raw value and the system auto-scores it 0–5. Tip: the “Preparation sheet” button gives you a printable list of everything to gather offline.',
    },
    {
      icon: Send,
      tag: 'Data Entry · Submission card',
      title: 'Submit for review',
      body: 'When all required indicators are filled, submit the year using the card at the top. The decision maker then approves it or requests changes. While it is under review — and once approved — your entries are locked (only an admin can change approved data).',
    },
    {
      icon: Leaf,
      tag: 'Sidebar · Ecological Footprint',
      title: 'See the results',
      body: 'After approval, this screen shows the computed sustainability scores and the estimated ecological footprint. For your role it is read-only.',
    },
    {
      icon: Map,
      tag: 'Sidebar · Map',
      title: 'Compare on the map',
      body: 'An interactive map of your municipality and the partner cities, coloured by their sustainability scores.',
    },
    {
      icon: Settings,
      tag: 'Sidebar · Settings',
      title: 'Your account',
      body: 'Open Settings (bottom of the sidebar) to change your password and see your role and municipality.',
    },
  ],
  decision_maker: [
    {
      icon: Sparkles,
      tag: 'Getting started',
      title: 'Welcome to SCALD',
      body: 'A quick tour of your tools. As a Decision Maker you review the data your team enters, approve it, and explore the analysis and reports.',
    },
    {
      icon: LayoutDashboard,
      tag: 'Sidebar · Overview',
      title: 'Overview',
      body: 'Your home dashboard — your municipality’s sustainability profile and scores at a glance.',
    },
    {
      icon: ClipboardList,
      tag: 'Sidebar · Data Review',
      title: 'Review & approve data',
      body: 'See the indicators submitted by your data-entry team. Approve the year to unlock calculation and reporting, or use “Request changes” to send it back with a note. Once you approve, the data is locked.',
    },
    {
      icon: Leaf,
      tag: 'Sidebar · Ecological Footprint',
      title: 'Ecological Footprint',
      body: 'The full sustainability breakdown — overall score, per-set and per-category results, and the estimated footprint.',
    },
    {
      icon: BrainCircuit,
      tag: 'Sidebar · AI DSS',
      title: 'AI Decision Support',
      body: 'AI-generated improvement strategies tailored to your municipality’s weakest areas, with impact and feasibility.',
    },
    {
      icon: FileBarChart2,
      tag: 'Sidebar · AI RT',
      title: 'AI Report Tool',
      body: 'Generate narrative reports from your data for council briefings and project reporting.',
    },
    {
      icon: Download,
      tag: 'Sidebar · Data Exports',
      title: 'Exports & official report',
      body: 'Download your data and the formal, chart-rich official report (also reachable from the calculation screen).',
    },
    {
      icon: MessageSquare,
      tag: 'Sidebar · Feedback',
      title: 'Feedback',
      body: 'Read and respond to feedback related to your municipality.',
    },
    {
      icon: Map,
      tag: 'Sidebar · Map',
      title: 'Map',
      body: 'Compare municipalities on an interactive map, coloured by sustainability scores.',
    },
    {
      icon: Settings,
      tag: 'Sidebar · Settings',
      title: 'Your account',
      body: 'Open Settings (bottom of the sidebar) to change your password and see your role and municipality.',
    },
  ],
  researcher: [
    {
      icon: Sparkles,
      tag: 'Getting started',
      title: 'Welcome to SCALD',
      body: 'A quick tour. As a Researcher you have a read-only, cross-municipality view of the sustainability data.',
    },
    {
      icon: LayoutDashboard,
      tag: 'Sidebar · Overview',
      title: 'Aggregate overview',
      body: 'An aggregated sustainability overview across all participating municipalities — scores, sets and categories.',
    },
    {
      icon: Map,
      tag: 'Sidebar · Map',
      title: 'Explore the map',
      body: 'An interactive map of all municipalities, coloured by their sustainability scores, to spot patterns.',
    },
    {
      icon: Settings,
      tag: 'Sidebar · Settings',
      title: 'Your account',
      body: 'Open Settings (bottom of the sidebar) to change your password and see your role and university.',
    },
  ],
};

export function GuidedTour() {
  const { profile, loading, refresh } = useProfile();
  const [step, setStep] = useState(0);
  const [finishing, setFinishing] = useState(false);
  const [closed, setClosed] = useState(false);

  const role = profile?.role;
  const isEligible =
    !!profile && role !== 'admin' && !!role && !profile.tourCompletedAt && !!profile.termsAcceptedAt;

  if (loading || !isEligible || closed) return null;

  const steps = TOURS[role as Exclude<Role, 'admin'>];
  if (!steps || steps.length === 0) return null;

  const current = steps[step];
  const Icon = current.icon;
  const isLast = step === steps.length - 1;

  const finish = async () => {
    setFinishing(true);
    try {
      await completeTour();
      await refresh();
    } finally {
      setFinishing(false);
      setClosed(true);
    }
  };

  return (
    <div className="fixed inset-0 z-[65] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="tour-title"
        className="w-full max-w-md overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl"
      >
        <div className="relative bg-gradient-to-br from-emerald-500 to-teal-600 px-6 pb-5 pt-6 text-white">
          <button
            type="button"
            aria-label="Skip tour"
            onClick={() => void finish()}
            className="absolute right-3 top-3 rounded-md p-1 text-white/80 transition hover:bg-white/15 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/15 ring-1 ring-white/25">
            <Icon className="h-6 w-6" />
          </div>
          <p className="mt-3 text-[10px] font-semibold uppercase tracking-[0.15em] text-white/80">
            {current.tag}
          </p>
          <h3 id="tour-title" className="mt-1 text-lg font-bold leading-tight">
            {current.title}
          </h3>
        </div>

        <div className="p-6">
          <p className="text-sm leading-relaxed text-slate-600">{current.body}</p>

          {/* Progress dots */}
          <div className="mt-5 flex items-center justify-center gap-1.5">
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

          <div className="mt-5 flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => void finish()}
              disabled={finishing}
              className="text-xs font-medium text-slate-400 transition hover:text-slate-600 disabled:opacity-60"
            >
              Skip tour
            </button>

            <div className="flex items-center gap-2">
              {step > 0 && (
                <button
                  type="button"
                  onClick={() => setStep((s) => Math.max(0, s - 1))}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
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
                  className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-emerald-500 to-teal-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:opacity-90 disabled:opacity-60"
                >
                  {finishing ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
                  Get started
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setStep((s) => Math.min(steps.length - 1, s + 1))}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-emerald-500 to-teal-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:opacity-90"
                >
                  Next
                  <ArrowRight className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
