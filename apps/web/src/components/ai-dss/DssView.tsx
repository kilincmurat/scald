'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useDataEntry } from '@/stores/data-entry';
import { useEffectiveWeights } from '@/stores/weights';
import {
  computeCategoryScores,
  computeSetScores,
  scoreBand,
  SET_THEME,
} from '@/lib/scores';
import { INDICATORS, type SetCode } from '@/lib/scald-indicators';
import {
  Brain,
  Zap,
  ArrowUpRight,
  AlertTriangle,
  Sparkles,
  Filter,
  ClipboardList,
  RefreshCw,
  Target,
  Clock,
  Wallet,
  BarChart3,
} from 'lucide-react';
import { clsx } from 'clsx';

type Strategy = {
  id: string;
  title: string;
  description: string;
  setCode: SetCode;
  categoryCode: string;
  categoryName: string;
  impact: number; // 0-100
  feasibility: number; // 0-100
  cost: 'Low' | 'Medium' | 'High' | 'Very High';
  timeframe: 'Short (1–2y)' | 'Medium (3–5y)' | 'Long (5y+)';
  priority: 'Critical' | 'High' | 'Medium' | 'Low';
  relatedIndicators: { code: string; name: string; score: number }[];
};

// Strategy templates keyed by category. When a category has weak indicators,
// we generate a strategy that references them.
const STRATEGY_TEMPLATES: Record<
  string,
  { title: string; description: string; cost: Strategy['cost']; timeframe: Strategy['timeframe'] }
> = {
  ES_GI: {
    title: 'Urban Green Infrastructure Program',
    description:
      'Deploy rainwater-permeable surfaces, green roofs, rain gardens and blue-green stormwater systems. Expand ecological restoration areas and household rainwater harvesting.',
    cost: 'Medium',
    timeframe: 'Medium (3–5y)',
  },
  ES_EN: {
    title: 'Clean Energy Transition Plan',
    description:
      'Increase share of renewables, boost energy storage capacity, retrofit municipal buildings for energy efficiency and finalize SECAP implementation.',
    cost: 'High',
    timeframe: 'Long (5y+)',
  },
  ES_CL: {
    title: 'Climate Risk Reduction Package',
    description:
      'Deploy heatwave early-warning, run climate adaptation scenario analyses, expand air quality monitoring and improve drought resilience.',
    cost: 'Medium',
    timeframe: 'Medium (3–5y)',
  },
  ES_EF: {
    title: 'Footprint Reduction Initiative',
    description:
      'Establish carbon-neutral neighborhoods, expand carbon sink areas, cut per capita water footprint through smart metering and efficiency programs.',
    cost: 'High',
    timeframe: 'Long (5y+)',
  },
  ES_LU: {
    title: 'Sustainable Land Use Master Plan',
    description:
      'Rebalance built-up vs. natural area ratios, protect wetlands and coastal zones, expand protected areas and remediate brownfields.',
    cost: 'Medium',
    timeframe: 'Long (5y+)',
  },
  ES_WT: {
    title: 'Smart Water Management System',
    description:
      'Reduce water losses via IoT metering, expand treated wastewater share, improve groundwater governance and modernize agricultural irrigation.',
    cost: 'Medium',
    timeframe: 'Medium (3–5y)',
  },
  ES_WA: {
    title: 'Circular Waste Program',
    description:
      'Boost recycling and composting rates, expand hazardous e-waste collection, promote zero-waste certified institutions and industrial recycling.',
    cost: 'Low',
    timeframe: 'Short (1–2y)',
  },
  ES_DS: {
    title: 'Disaster Preparedness Overhaul',
    description:
      'Expand assembly area capacity, cut crisis information dissemination time, reduce built-up area in flood/landslide zones and prepare for coastal risks.',
    cost: 'High',
    timeframe: 'Medium (3–5y)',
  },
  ES_PO: {
    title: 'Vulnerable Population Protection',
    description:
      'Reduce exposure of vulnerable groups to poor air quality, disaster risk and heatwaves through targeted urban interventions.',
    cost: 'Medium',
    timeframe: 'Medium (3–5y)',
  },
  ES_IN: {
    title: 'Smart Infrastructure Rollout',
    description:
      'Install air-quality and climate monitoring sensors, smart water meters, and a real-time carbon monitoring dashboard.',
    cost: 'High',
    timeframe: 'Medium (3–5y)',
  },
  SS_CA: {
    title: 'Climate Awareness & Capacity Building',
    description:
      'Run climate & environmental awareness campaigns, train municipal staff on climate adaptation, and expand circular-economy education programmes.',
    cost: 'Low',
    timeframe: 'Short (1–2y)',
  },
  SS_VE: {
    title: 'Vulnerable Group Engagement & Inclusion',
    description:
      'Raise citizen participation in climate action, register more disaster volunteers, and communicate climate risk info in multiple languages to refugees, migrants and vulnerable districts.',
    cost: 'Low',
    timeframe: 'Short (1–2y)',
  },
  SS_GL: {
    title: 'Green Livelihoods & Social Resilience',
    description:
      'Launch municipal support programmes for climate-affected small businesses, distribute adaptation micro-grants and run green job training.',
    cost: 'Medium',
    timeframe: 'Medium (3–5y)',
  },
  SS_SRM: {
    title: 'Security & Risk Management Upgrade',
    description:
      'Expand social support coverage in crises, increase drill frequency, grow post-crisis psychosocial support capacity and formalize partnerships.',
    cost: 'Medium',
    timeframe: 'Medium (3–5y)',
  },
  MS_INC: {
    title: 'Institutional Capacity Building',
    description:
      'Grow technical/expert staff share, staff critical units (climate/disaster/planning) and align strategic objectives with SDGs.',
    cost: 'Medium',
    timeframe: 'Long (5y+)',
  },
  MS_DM: {
    title: 'Digital Municipality Transformation',
    description:
      'Deliver services online, publish open data, monitor critical infrastructure and climate data in real time, use data-driven decision systems.',
    cost: 'High',
    timeframe: 'Medium (3–5y)',
  },
  MS_PM: {
    title: 'Participation & Transparency Boost',
    description:
      'Raise citizen participation rate, response rate to citizen requests, policy integration of participatory inputs and public data availability.',
    cost: 'Low',
    timeframe: 'Short (1–2y)',
  },
  MS_CG: {
    title: 'Climate Governance Framework',
    description:
      'Raise climate action implementation rate, join more governance networks, formalize carbon inventory and set net-zero targets.',
    cost: 'Medium',
    timeframe: 'Medium (3–5y)',
  },
  MS_URB: {
    title: 'Urban Resilience & Risk Program',
    description:
      'Grow disaster/crisis staff, cut emergency response time, expand risk-based planning, digital emergency management and climate risk mapping.',
    cost: 'High',
    timeframe: 'Long (5y+)',
  },
  ECS_CAP: {
    title: 'Green Finance Strategy',
    description:
      'Issue green bonds, allocate own revenues to adaptation, secure external EU financing and establish a disaster financing fund.',
    cost: 'Medium',
    timeframe: 'Medium (3–5y)',
  },
  ECS_WAC: {
    title: 'Circular Economy Investment',
    description:
      'Fund waste reduction, launch circular economy projects, invest in repair/upcycling and industrial symbiosis initiatives.',
    cost: 'Medium',
    timeframe: 'Medium (3–5y)',
  },
  ECS_CRI: {
    title: 'Resilient Infrastructure Spending',
    description:
      'Prioritize expenditures on climate-resilient infrastructure — energy, water, transport, buildings and digital systems.',
    cost: 'Very High',
    timeframe: 'Long (5y+)',
  },
  ECS_REE: {
    title: 'Resource Efficiency Programme',
    description:
      'Reduce municipal energy/water intensity, expand renewable share in consumption and modernize procurement toward efficiency.',
    cost: 'Medium',
    timeframe: 'Medium (3–5y)',
  },
  ECS_GB: {
    title: 'Green Budgeting Implementation',
    description:
      'Tag climate-relevant expenditures, disclose green vs. brown spending and align budget with climate objectives.',
    cost: 'Low',
    timeframe: 'Short (1–2y)',
  },
};

const COST_COLORS: Record<Strategy['cost'], string> = {
  Low: 'text-emerald-700 bg-emerald-50',
  Medium: 'text-amber-700 bg-amber-50',
  High: 'text-orange-700 bg-orange-50',
  'Very High': 'text-red-700 bg-red-50',
};

const PRIORITY_COLORS: Record<Strategy['priority'], string> = {
  Critical: 'bg-red-100 text-red-700 ring-red-200',
  High: 'bg-orange-100 text-orange-700 ring-orange-200',
  Medium: 'bg-amber-100 text-amber-700 ring-amber-200',
  Low: 'bg-slate-100 text-slate-600 ring-slate-200',
};

export function DssView() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const entries = useDataEntry((s) => s.entries);
  const weights = useEffectiveWeights();
  const catScores = useMemo(() => computeCategoryScores(entries, weights), [entries, weights]);
  const setScores = useMemo(() => computeSetScores(entries, weights), [entries, weights]);

  const strategies = useMemo(() => generateStrategies(entries, catScores), [entries, catScores]);

  const [setFilter, setSetFilter] = useState<'all' | SetCode>('all');
  const [priorityFilter, setPriorityFilter] = useState<'all' | Strategy['priority']>('all');
  const [regenerating, setRegenerating] = useState(false);

  const filtered = strategies.filter(
    (s) =>
      (setFilter === 'all' || s.setCode === setFilter) &&
      (priorityFilter === 'all' || s.priority === priorityFilter),
  );

  const overallEntered = Object.keys(entries).length;

  const handleRegenerate = () => {
    setRegenerating(true);
    setTimeout(() => setRegenerating(false), 1200);
  };

  if (!mounted) {
    return (
      <div className="p-4 lg:p-6">
        <div className="h-40 rounded-xl bg-slate-100 animate-pulse" />
      </div>
    );
  }

  if (overallEntered === 0) {
    return (
      <div className="p-6">
        <div className="mx-auto max-w-xl rounded-2xl border border-blue-200 bg-gradient-to-br from-blue-50 via-white to-indigo-50 p-8 text-center shadow-sm">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-lg">
            <Brain className="h-7 w-7" />
          </div>
          <h2 className="mt-5 text-xl font-bold text-slate-900">No strategies yet</h2>
          <p className="mx-auto mt-2 max-w-sm text-sm text-slate-500">
            The Decision Support System generates strategies from your weakest indicators. Enter
            data to unlock personalised recommendations.
          </p>
          <Link
            href="/data-entry"
            className="mt-5 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"
          >
            <ClipboardList className="h-4 w-4" /> Enter Data
          </Link>
        </div>
      </div>
    );
  }

  const setCodes: SetCode[] = ['ES', 'SS', 'MS', 'ECS'];
  const criticalCount = strategies.filter((s) => s.priority === 'Critical').length;
  const highCount = strategies.filter((s) => s.priority === 'High').length;

  return (
    <div className="p-4 lg:p-6 space-y-5 lg:space-y-6">
      {/* Header cards */}
      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
        <StatCard
          icon={<Sparkles className="h-3.5 w-3.5 text-blue-500" />}
          label="Strategies"
          value={strategies.length}
          sub="Generated from your data"
        />
        <StatCard
          icon={<AlertTriangle className="h-3.5 w-3.5 text-red-500" />}
          label="Critical Priority"
          value={criticalCount}
          sub="Address immediately"
          valueColor="text-red-600"
        />
        <StatCard
          icon={<Target className="h-3.5 w-3.5 text-orange-500" />}
          label="High Priority"
          value={highCount}
          sub="Plan for short term"
          valueColor="text-orange-600"
        />
        <StatCard
          icon={<Zap className="h-3.5 w-3.5 text-emerald-500" />}
          label="Avg. Impact"
          value={
            strategies.length
              ? Math.round(strategies.reduce((s, x) => s + x.impact, 0) / strategies.length)
              : 0
          }
          sub="Estimated 0–100"
        />
      </section>

      {/* Filter bar */}
      <section className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold text-slate-500">
            <Filter className="mr-1 inline h-3 w-3" /> Filter:
          </span>
          <div className="flex flex-wrap gap-1">
            <FilterChip
              active={setFilter === 'all'}
              onClick={() => setSetFilter('all')}
              label="All sets"
            />
            {setCodes.map((sc) => (
              <FilterChip
                key={sc}
                active={setFilter === sc}
                onClick={() => setSetFilter(sc)}
                label={SET_THEME[sc].fullName}
                icon={<span className={clsx('h-2 w-2 rounded-full', `bg-gradient-to-br ${SET_THEME[sc].gradient}`)} />}
              />
            ))}
          </div>
          <span className="ml-2 hidden text-slate-300 lg:inline">·</span>
          <div className="flex flex-wrap gap-1">
            {(['all', 'Critical', 'High', 'Medium', 'Low'] as const).map((p) => (
              <FilterChip
                key={p}
                active={priorityFilter === p}
                onClick={() => setPriorityFilter(p)}
                label={p === 'all' ? 'Any priority' : p}
              />
            ))}
          </div>
        </div>
        <button
          onClick={handleRegenerate}
          disabled={regenerating}
          className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 px-3 py-2 text-xs font-semibold text-white shadow-sm transition hover:opacity-90 disabled:opacity-60"
        >
          <RefreshCw className={clsx('h-3.5 w-3.5', regenerating && 'animate-spin')} />
          {regenerating ? 'Analysing…' : 'Regenerate'}
        </button>
      </section>

      {/* Strategy list */}
      {filtered.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <p className="text-sm text-slate-500">
            No strategies match the current filter.
          </p>
        </div>
      ) : (
        <section className="space-y-3">
          {filtered.map((s) => (
            <StrategyCard key={s.id} strategy={s} />
          ))}
        </section>
      )}
    </div>
  );
}

function generateStrategies(
  entries: Record<string, { score: number }>,
  catScores: ReturnType<typeof computeCategoryScores>,
): Strategy[] {
  const strategies: Strategy[] = [];

  for (const cs of catScores) {
    if (cs.entered === 0) continue; // Skip categories with no data
    const tpl = STRATEGY_TEMPLATES[cs.code];
    if (!tpl) continue;

    // Only include category if score < 75 (there's room for improvement)
    if (cs.score >= 75) continue;

    // Find weak indicators in this category
    const cat = INDICATORS.categories[cs.code];
    const related = cat.indicators
      .map((ind) => {
        const e = entries[ind.code];
        if (!e) return null;
        return { code: ind.code, name: ind.name, score: e.score };
      })
      .filter((x): x is { code: string; name: string; score: number } => x !== null && x.score < 4)
      .sort((a, b) => a.score - b.score)
      .slice(0, 4);

    // impact: lower current score → higher potential impact (0-100)
    const impact = Math.min(100, 100 - cs.score + 15);
    // feasibility: higher when set/category coverage is high
    const feasibility = Math.min(100, 40 + Math.round((cs.entered / cs.total) * 60));

    // Priority based on score
    const priority: Strategy['priority'] =
      cs.score < 30 ? 'Critical' : cs.score < 50 ? 'High' : cs.score < 65 ? 'Medium' : 'Low';

    strategies.push({
      id: cs.code,
      title: tpl.title,
      description: tpl.description,
      setCode: cs.setCode,
      categoryCode: cs.code,
      categoryName: cs.name,
      impact,
      feasibility,
      cost: tpl.cost,
      timeframe: tpl.timeframe,
      priority,
      relatedIndicators: related,
    });
  }

  // Sort: Critical → High → Medium → Low, then by impact desc
  const pRank: Record<Strategy['priority'], number> = {
    Critical: 0,
    High: 1,
    Medium: 2,
    Low: 3,
  };
  strategies.sort((a, b) => pRank[a.priority] - pRank[b.priority] || b.impact - a.impact);
  return strategies;
}

function StatCard({
  icon,
  label,
  value,
  sub,
  valueColor,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  sub: string;
  valueColor?: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
        {icon} {label}
      </div>
      <p className={clsx('mt-2 text-3xl font-bold text-slate-900 lg:text-4xl', valueColor)}>{value}</p>
      <p className="mt-1 text-[11px] text-slate-400">{sub}</p>
    </div>
  );
}

function FilterChip({
  active,
  onClick,
  label,
  icon,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  icon?: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={clsx(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium transition',
        active
          ? 'bg-slate-900 text-white'
          : 'bg-slate-100 text-slate-600 hover:bg-slate-200',
      )}
    >
      {icon}
      {label}
    </button>
  );
}

function StrategyCard({ strategy }: { strategy: Strategy }) {
  const theme = SET_THEME[strategy.setCode];

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:shadow-md lg:p-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:gap-4">
        {/* Icon */}
        <div className="flex items-start justify-between lg:block">
          <div
            className={clsx(
              'flex h-11 w-11 items-center justify-center rounded-xl text-white shadow-md',
              `bg-gradient-to-br ${theme.gradient}`,
            )}
          >
            <Brain className="h-5 w-5" />
          </div>
          <span
            className={clsx(
              'inline-block rounded-full px-2 py-0.5 text-[10px] font-bold ring-1 lg:hidden',
              PRIORITY_COLORS[strategy.priority],
            )}
          >
            {strategy.priority}
          </span>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className={clsx('rounded px-1.5 py-0.5 text-[10px] font-bold', theme.chip)}>
              {strategy.categoryCode}
            </span>
            <span
              className={clsx(
                'hidden rounded-full px-2 py-0.5 text-[10px] font-bold ring-1 lg:inline-block',
                PRIORITY_COLORS[strategy.priority],
              )}
            >
              {strategy.priority} priority
            </span>
            <span className="text-[10px] text-slate-400">
              {theme.fullName} · {strategy.categoryName}
            </span>
          </div>
          <h3 className="mt-1.5 text-sm font-semibold text-slate-900 lg:text-base">{strategy.title}</h3>
          <p className="mt-1 text-xs leading-relaxed text-slate-600 lg:text-[13px]">
            {strategy.description}
          </p>

          {/* Metrics */}
          <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Metric icon={<Zap className="h-3 w-3 text-emerald-500" />} label="Impact" value={strategy.impact} pct />
            <Metric
              icon={<BarChart3 className="h-3 w-3 text-blue-500" />}
              label="Feasibility"
              value={strategy.feasibility}
              pct
            />
            <div className="flex flex-col gap-1">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 inline-flex items-center gap-1">
                <Wallet className="h-3 w-3 text-orange-500" /> Cost
              </span>
              <span
                className={clsx(
                  'inline-block w-fit rounded px-1.5 py-0.5 text-[11px] font-semibold',
                  COST_COLORS[strategy.cost],
                )}
              >
                {strategy.cost}
              </span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 inline-flex items-center gap-1">
                <Clock className="h-3 w-3 text-indigo-500" /> Timeframe
              </span>
              <span className="text-[11px] font-semibold text-slate-700">{strategy.timeframe}</span>
            </div>
          </div>

          {/* Related indicators */}
          {strategy.relatedIndicators.length > 0 && (
            <div className="mt-3 border-t border-slate-100 pt-3">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                Driving indicators (weak)
              </p>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {strategy.relatedIndicators.map((r) => (
                  <span
                    key={r.code}
                    className="inline-flex items-center gap-1 rounded-lg border border-red-100 bg-red-50 px-2 py-0.5 text-[10px] font-medium text-red-700"
                    title={`${r.code} · Score ${r.score}`}
                  >
                    <span className="font-bold">{r.code}</span>
                    <span className="text-red-500">·</span>
                    <span className="font-bold">{r.score}</span>
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Action */}
        <div className="flex lg:flex-col lg:items-end lg:justify-between lg:gap-2">
          <Link
            href={`/data-entry/${strategy.categoryCode}`}
            className={clsx(
              'inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold text-white shadow-sm transition hover:opacity-90',
              `bg-gradient-to-r ${theme.gradient}`,
            )}
          >
            Improve category
            <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>
    </div>
  );
}

function Metric({
  icon,
  label,
  value,
  pct,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  pct?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 inline-flex items-center gap-1">
        {icon} {label}
      </span>
      <div className="flex items-center gap-1.5">
        <div className="h-1.5 w-16 overflow-hidden rounded-full bg-slate-100">
          <div
            className="h-full rounded-full bg-gradient-to-r from-blue-400 to-indigo-500"
            style={{ width: `${value}%` }}
          />
        </div>
        <span className="text-[11px] font-semibold text-slate-700">
          {value}
          {pct ? '%' : ''}
        </span>
      </div>
    </div>
  );
}
