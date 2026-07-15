'use client';

/**
 * System Map — an admin-only visual guide to how SCALD works.
 * Built for presenting / onboarding: the assessment dimensions, the scoring
 * model, the data→decision workflow, the roles, the modules and the stack.
 * All figures are derived from the live indicator dataset.
 */

import { Fragment, type ReactNode } from 'react';
import {
  Sprout,
  Layers,
  ClipboardList,
  Send,
  ShieldCheck,
  Calculator,
  FileBarChart2,
  ArrowDown,
  ChevronRight,
  LayoutDashboard,
  Leaf,
  BrainCircuit,
  Map as MapIcon,
  Download,
  MessageSquare,
  Network,
  Building2,
  Monitor,
  Database,
  Sparkles,
  Users,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { clsx } from 'clsx';
import {
  INDICATORS,
  TOTAL_INDICATORS,
  REQUIRED_INDICATORS,
  type SetCode,
} from '@/lib/scald-indicators';
import { SET_THEME } from '@/lib/scores';
import { PILOT_MUNICIPALITIES } from '@/lib/pilot-municipalities';
import { ROLE_LABELS, ROLE_BADGE_COLOR, type Role } from '@/lib/roles';

// ── Derived stats (computed once from the live dataset) ──────────────────────
const SET_ORDER: SetCode[] = ['ES', 'SS', 'MS', 'ECS'];
const CATEGORY_COUNT = INDICATORS.order.length;

const SET_STATS = SET_ORDER.map((code) => {
  let categories = 0;
  let indicators = 0;
  for (const catCode of INDICATORS.order) {
    const cat = INDICATORS.categories[catCode];
    if (cat.set === code) {
      categories += 1;
      indicators += cat.indicators.length;
    }
  }
  return { code, categories, indicators };
});

const SET_DESC: Record<SetCode, string> = {
  ES: 'Green infrastructure, energy, water, waste, air quality and climate resilience.',
  SS: 'Health, education, equity, participation and quality of urban life.',
  MS: 'Governance, planning, transparency and institutional capacity.',
  ECS: 'Local economy, resource efficiency and financial sustainability.',
};

// ── Static content ───────────────────────────────────────────────────────────
type Step = { icon: LucideIcon; title: string; actor: string; note: string };
const WORKFLOW: Step[] = [
  { icon: ClipboardList, title: 'Enter data', actor: 'Data Entry', note: 'Fill the 0–5 scored indicators for each category.' },
  { icon: Send, title: 'Submit', actor: 'Data Entry', note: 'Confirm accuracy and submit the year for review.' },
  { icon: ShieldCheck, title: 'Review & approve', actor: 'Decision Maker', note: 'Check the data and declaration, then approve.' },
  { icon: Calculator, title: 'Calculate', actor: 'System', note: 'Ecological footprint is computed — only when approved.' },
  { icon: FileBarChart2, title: 'Publish', actor: 'Decision Maker', note: 'Reports, exports and the map read from the results.' },
];

type Level = { level: string; title: string; formula: string };
const SCORING: Level[] = [
  { level: '1', title: 'Indicator score (0–5)', formula: 'Auto-scored from the raw value against the indicator thresholds.' },
  { level: '2', title: 'Category score', formula: 'Weighted average of the indicator scores in the category.' },
  { level: '3', title: 'Set score', formula: 'Weighted average of the category scores in the dimension.' },
  { level: '4', title: 'Overall footprint', formula: 'Weighted average of the four dimension scores.' },
];

type RoleInfo = { role: Role; blurb: string; screens: string };
const ROLES: RoleInfo[] = [
  { role: 'admin', blurb: 'Manages users, municipalities, indicators, weights and thresholds — system-wide oversight.', screens: 'Admin Panel · System Map · every module' },
  { role: 'data_entry', blurb: "Enters and submits the municipality's indicator data for the year.", screens: 'Data Entry · EFCT (read) · Map' },
  { role: 'decision_maker', blurb: 'Reviews and approves submissions, reads analytics, exports reports, answers feedback.', screens: 'Overview · EFCT · AI-DSS · AI-RT · Exports · Feedback' },
  { role: 'researcher', blurb: 'Read-only access to scores across all pilot cities for cross-city research.', screens: 'Overview · Map' },
];

type Module = { icon: LucideIcon; name: string; note: string };
const MODULES: Module[] = [
  { icon: LayoutDashboard, name: 'Overview', note: 'Municipality dashboard & scores' },
  { icon: ClipboardList, name: 'Data Entry', note: 'Indicator data collection' },
  { icon: Leaf, name: 'EFCT', note: 'Ecological footprint calculation' },
  { icon: BrainCircuit, name: 'AI-DSS', note: 'AI strategy recommendations' },
  { icon: FileBarChart2, name: 'AI-RT', note: 'AI-generated reports' },
  { icon: MapIcon, name: 'Map', note: 'Geographic visualisation' },
  { icon: Download, name: 'Exports', note: 'Official reports & Excel' },
  { icon: MessageSquare, name: 'Feedback', note: 'Municipal feedback inbox' },
  { icon: ShieldCheck, name: 'Admin Panel', note: 'Users, indicators, weights' },
];

type ArchLayer = { icon: LucideIcon; label: string; detail: string };
const ARCH: ArchLayer[] = [
  { icon: Monitor, label: 'Interface', detail: 'Next.js + React web application (English)' },
  { icon: Database, label: 'Platform', detail: 'Supabase — Auth + PostgreSQL (PostGIS · pgvector) · per-municipality Row-Level Security' },
  { icon: Sparkles, label: 'Intelligence', detail: 'AI for strategy recommendations and report generation' },
];

// ── Section shell ────────────────────────────────────────────────────────────
function Section({
  n,
  title,
  subtitle,
  icon: Icon,
  children,
}: {
  n: number;
  title: string;
  subtitle: string;
  icon: LucideIcon;
  children: ReactNode;
}) {
  return (
    <section className="space-y-4">
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 ring-1 ring-emerald-100">
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-[11px] font-bold text-emerald-600">{String(n).padStart(2, '0')}</span>
            <h2 className="text-base font-bold text-slate-900">{title}</h2>
          </div>
          <p className="text-xs text-slate-500">{subtitle}</p>
        </div>
      </div>
      {children}
    </section>
  );
}

export function SystemMap() {
  return (
    <div className="mx-auto max-w-6xl space-y-12 p-4 lg:p-8">
      {/* Intro */}
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-900 to-emerald-950 p-6 text-white lg:p-8">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-500/20">
            <Sprout className="h-6 w-6 text-emerald-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">SCALD</h1>
            <p className="text-xs text-emerald-200/80">Data-driven Decision Support Ecosystem for Local Governments</p>
          </div>
        </div>
        <p className="mt-4 max-w-2xl text-sm leading-relaxed text-slate-300">
          SCALD helps municipalities measure their ecological footprint from real indicator data,
          turn it into a 0–5 sustainability score, and act on it with AI-supported strategies and
          reports — across four sustainability dimensions.
        </p>

        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-5">
          {[
            { k: '4', v: 'Dimensions' },
            { k: String(CATEGORY_COUNT), v: 'Categories' },
            { k: String(TOTAL_INDICATORS), v: 'Indicators' },
            { k: String(PILOT_MUNICIPALITIES.length), v: 'Pilot cities' },
            { k: '4', v: 'User roles' },
          ].map((s) => (
            <div key={s.v} className="rounded-xl bg-white/5 px-3 py-2.5 ring-1 ring-white/10">
              <p className="text-xl font-bold tabular-nums">{s.k}</p>
              <p className="text-[11px] text-slate-400">{s.v}</p>
            </div>
          ))}
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-2">
          {PILOT_MUNICIPALITIES.map((m) => (
            <span key={m.id} className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-xs">
              <span className="text-base leading-none">{m.flag}</span>
              {m.name} <span className="text-slate-400">· {m.country}</span>
            </span>
          ))}
        </div>
      </section>

      {/* 1 — Dimensions */}
      <Section n={1} icon={Layers} title="What SCALD measures" subtitle="Four sustainability dimensions, broken into categories and indicators">
        <div className="grid gap-4 sm:grid-cols-2">
          {SET_STATS.map(({ code, categories, indicators }) => {
            const th = SET_THEME[code];
            const name = INDICATORS.sets[code]?.name ?? `${th.fullName} Sustainability`;
            return (
              <div key={code} className={clsx('rounded-2xl border bg-white p-5 shadow-sm', th.border)}>
                <div className="flex items-center gap-2">
                  <span className={clsx('rounded-lg px-2 py-1 text-xs font-bold', th.chip)}>{code}</span>
                  <h3 className={clsx('text-sm font-bold', th.color)}>{name}</h3>
                </div>
                <p className="mt-2 text-xs leading-relaxed text-slate-600">{SET_DESC[code]}</p>
                <div className="mt-3 flex gap-4 text-[11px] text-slate-500">
                  <span><b className="text-slate-800 tabular-nums">{categories}</b> categories</span>
                  <span><b className="text-slate-800 tabular-nums">{indicators}</b> indicators</span>
                </div>
              </div>
            );
          })}
        </div>
      </Section>

      {/* 2 — Scoring model */}
      <Section n={2} icon={Calculator} title="How the score is built" subtitle="Every raw value rolls up into one overall footprint through 3-level weighting">
        <div className="space-y-0">
          {SCORING.map((lvl, i) => (
            <Fragment key={lvl.level}>
              <div className="flex items-start gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-900 text-xs font-bold text-white">
                  {lvl.level}
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-slate-900">{lvl.title}</h3>
                  <p className="text-xs text-slate-500">{lvl.formula}</p>
                </div>
              </div>
              {i < SCORING.length - 1 && (
                <div className="flex justify-center py-1.5">
                  <ArrowDown className="h-4 w-4 text-slate-300" />
                </div>
              )}
            </Fragment>
          ))}
        </div>
        <p className="flex items-center gap-1.5 text-[11px] text-slate-500">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" />
          Weights at the indicator, category and set levels are admin-configurable (default: equal).
        </p>
      </Section>

      {/* 3 — Workflow */}
      <Section n={3} icon={Network} title="Data → decision workflow" subtitle="From data entry to an approved, published footprint">
        <div className="flex flex-col gap-2 md:flex-row md:items-stretch">
          {WORKFLOW.map((s, i) => (
            <Fragment key={s.title}>
              <div className="flex-1 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
                  <s.icon className="h-5 w-5" />
                </div>
                <p className="mt-2.5 text-sm font-semibold text-slate-900">{s.title}</p>
                <span className="mt-1 inline-block rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
                  {s.actor}
                </span>
                <p className="mt-2 text-[11px] leading-relaxed text-slate-500">{s.note}</p>
              </div>
              {i < WORKFLOW.length - 1 && (
                <div className="flex items-center justify-center text-slate-300">
                  <ChevronRight className="hidden h-5 w-5 md:block" />
                  <ArrowDown className="h-4 w-4 md:hidden" />
                </div>
              )}
            </Fragment>
          ))}
        </div>
      </Section>

      {/* 4 — Roles */}
      <Section n={4} icon={Users} title="Who does what" subtitle="Four roles, each with its own screens and permissions">
        <div className="grid gap-3 lg:grid-cols-2">
          {ROLES.map(({ role, blurb, screens }) => (
            <div key={role} className="flex gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <span
                className={clsx(
                  'h-fit shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ring-inset',
                  ROLE_BADGE_COLOR[role],
                )}
              >
                {ROLE_LABELS[role]}
              </span>
              <div className="min-w-0">
                <p className="text-xs leading-relaxed text-slate-700">{blurb}</p>
                <p className="mt-1.5 truncate text-[10px] text-slate-400">{screens}</p>
              </div>
            </div>
          ))}
        </div>
      </Section>

      {/* 5 — Modules */}
      <Section n={5} icon={LayoutDashboard} title="The modules" subtitle="The main screens that make up the platform">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {MODULES.map((m) => (
            <div key={m.name} className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-sm transition hover:border-emerald-200 hover:shadow">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-50 text-slate-600">
                <m.icon className="h-4 w-4" />
              </div>
              <p className="mt-2 text-sm font-semibold text-slate-900">{m.name}</p>
              <p className="text-[11px] text-slate-500">{m.note}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* 6 — Architecture */}
      <Section n={6} icon={Building2} title="How it's built" subtitle="A single web app on a self-hostable, open-source stack">
        <div className="space-y-2">
          {ARCH.map((a) => (
            <div key={a.label} className="flex items-center gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-900 text-white">
                <a.icon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-900">{a.label}</p>
                <p className="text-[11px] text-slate-500">{a.detail}</p>
              </div>
            </div>
          ))}
        </div>
        <p className="text-[11px] text-slate-400">
          {REQUIRED_INDICATORS} of {TOTAL_INDICATORS} indicators are required for a complete assessment; the rest are optional.
        </p>
      </Section>
    </div>
  );
}
