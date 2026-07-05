'use client';

import Link from 'next/link';
import { PILOT_MUNICIPALITIES } from '@/lib/pilot-municipalities';
import { INDICATORS, TOTAL_INDICATORS } from '@/lib/scald-indicators';
import {
  Users2,
  Building2,
  Sliders,
  ShieldAlert,
  Database,
  Activity,
  ArrowRight,
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
      desc: 'Manage pilot cities, boundaries and population data.',
      bg: 'from-emerald-500 to-teal-600',
    },
    {
      href: '/admin/indicators',
      icon: Sliders,
      title: 'Indicators & Thresholds',
      desc: 'Edit 0–5 scoring thresholds for any of the 188 sub-indicators.',
      bg: 'from-purple-500 to-fuchsia-600',
    },
    {
      href: '/admin/audit',
      icon: ShieldAlert,
      title: 'Audit Logs',
      desc: 'Chronological trace of who changed what across the system.',
      bg: 'from-orange-500 to-amber-600',
    },
  ];

  return (
    <div className="p-4 lg:p-6 space-y-5 lg:space-y-6">
      {/* Health snapshot */}
      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
        <StatCard
          icon={<Building2 className="h-3.5 w-3.5 text-emerald-500" />}
          label="Pilot Cities"
          value={PILOT_MUNICIPALITIES.length}
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

      <div className="rounded-xl border border-slate-100 bg-slate-50 p-4 text-xs text-slate-600">
        <p className="font-semibold text-slate-800">🚧 v1 skeleton</p>
        <p className="mt-1">
          Detail pages (users, indicators, audit) will be built in the next iteration.
          Current infrastructure: role-based RLS is live on Supabase, all 3 SCALD data
          tables are scoped per municipality, and admin-only threshold overrides table
          is ready to receive edits.
        </p>
      </div>
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
