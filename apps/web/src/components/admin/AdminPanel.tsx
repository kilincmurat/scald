'use client';

import Link from 'next/link';
import { MUNICIPALITIES } from '@/lib/pilot-municipalities';
import { INDICATORS, TOTAL_INDICATORS } from '@/lib/scald-indicators';
import {
  Users2,
  Building2,
  Sliders,
  Database,
  Activity,
  Scale,
  ArrowRight,
  HeartPulse,
  ScrollText,
} from 'lucide-react';

export function AdminPanel() {
  const tools = [
    {
      href: '/admin/users',
      icon: Users2,
      title: 'Users',
      desc: 'Invite staff, assign roles, activate/deactivate accounts.',
      bg: 'from-blue-500 to-indigo-600',
    },
    {
      href: '/admin/municipalities',
      icon: Building2,
      title: 'Municipalities',
      desc: 'Manage municipalities, boundaries and population data.',
      bg: 'from-emerald-500 to-teal-600',
    },
    {
      href: '/admin/indicators',
      icon: Sliders,
      title: 'Indicators & Thresholds',
      desc: 'Edit 0–5 scoring thresholds for any of the 152 sub-indicators.',
      bg: 'from-purple-500 to-fuchsia-600',
    },
    {
      href: '/admin/weights',
      icon: Scale,
      title: 'Score Weights',
      desc: 'Tune the relative weight of each set, category and indicator in the final score.',
      bg: 'from-pink-500 to-rose-600',
    },
    {
      href: '/admin/health',
      icon: HeartPulse,
      title: 'System Health',
      desc: 'Live probes: database reachability, auth session, row counts, latest activity.',
      bg: 'from-teal-500 to-emerald-600',
    },
    {
      href: '/admin/logs',
      icon: ScrollText,
      title: 'Log Management',
      desc: 'Chronological trace of every entry, submission, approval and feedback across all municipalities.',
      bg: 'from-orange-500 to-amber-600',
    },
  ];

  return (
    <div className="p-4 lg:p-6 space-y-5 lg:space-y-6">
      {/* Health snapshot */}
      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
        <StatCard
          icon={<Building2 className="h-3.5 w-3.5 text-emerald-500" />}
          label="Municipalities"
          value={MUNICIPALITIES.length}
          sub="Turkey · Greece · Romania · N. Macedonia"
        />
        <StatCard
          icon={<Database className="h-3.5 w-3.5 text-blue-500" />}
          label="Categories"
          value={INDICATORS.order.length}
          sub="4 sustainability sets"
        />
        <StatCard
          icon={<Database className="h-3.5 w-3.5 text-purple-500" />}
          label="Indicators"
          value={TOTAL_INDICATORS}
          sub="Editable thresholds"
        />
        <StatCard
          icon={<Activity className="h-3.5 w-3.5 text-orange-500" />}
          label="System Status"
          value="OK"
          sub="All services healthy"
        />
      </section>

      {/* Tool tiles */}
      <section>
        <h2 className="mb-3 text-sm font-semibold text-slate-900">Management Tools</h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {tools.map((t) => {
            const Icon = t.icon;
            return (
              <Link
                key={t.href}
                href={t.href}
                className="group flex items-start gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
              >
                <div
                  className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${t.bg} text-white shadow-md`}
                >
                  <Icon className="h-6 w-6" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-base font-semibold text-slate-900">{t.title}</h3>
                  <p className="mt-1 text-xs text-slate-600 leading-relaxed">{t.desc}</p>
                </div>
                <ArrowRight className="h-5 w-5 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-slate-500" />
              </Link>
            );
          })}
        </div>
      </section>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  sub,
}: {
  icon: React.ReactNode;
  label: string;
  value: number | string;
  sub: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
        {icon} {label}
      </div>
      <p className="mt-2 text-3xl font-bold text-slate-900 lg:text-4xl">{value}</p>
      <p className="mt-1 text-[11px] text-slate-400">{sub}</p>
    </div>
  );
}
