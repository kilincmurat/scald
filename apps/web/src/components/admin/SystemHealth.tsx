'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { fetchHealthSnapshot, type HealthSnapshot } from '@/lib/admin-monitoring-service';
import {
  Activity,
  CheckCircle2,
  AlertTriangle,
  RefreshCcw,
  Database,
  ShieldCheck,
  Clock,
  Loader2,
  Users2,
  Building2,
  ClipboardList,
  Send,
  MessageSquare,
  Scale,
  ArrowLeft,
} from 'lucide-react';
import { clsx } from 'clsx';

const AUTO_REFRESH_MS = 30_000;

export function SystemHealth() {
  const [snapshot, setSnapshot] = useState<HealthSnapshot | null>(null);
  const [loading, setLoading] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const run = async () => {
    setLoading(true);
    setError(null);
    try {
      const s = await fetchHealthSnapshot();
      setSnapshot(s);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Health probe failed.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void run();
  }, []);

  useEffect(() => {
    if (!autoRefresh) return;
    const t = setInterval(() => {
      void run();
    }, AUTO_REFRESH_MS);
    return () => clearInterval(t);
  }, [autoRefresh]);

  const dbHealthy = snapshot?.db.reachable && (snapshot.db.responseMs ?? 9999) < 1500;
  const authHealthy = !!snapshot?.auth.authenticated;
  const overallHealthy = dbHealthy && authHealthy;

  return (
    <div className="p-4 lg:p-6 space-y-5">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href="/admin"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-700"
        >
          <ArrowLeft className="h-4 w-4" /> Admin panel
        </Link>
        <div className="flex items-center gap-2">
          {snapshot?.timestamp && (
            <span className="hidden text-[11px] text-slate-400 sm:inline">
              updated {new Date(snapshot.timestamp).toLocaleTimeString('en-GB')}
            </span>
          )}
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-700 shadow-sm">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="h-3.5 w-3.5"
            />
            Auto-refresh 30s
          </label>
          <button
            type="button"
            onClick={() => void run()}
            disabled={loading}
            className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-slate-800 disabled:opacity-60"
          >
            {loading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <RefreshCcw className="h-3.5 w-3.5" />
            )}
            Probe now
          </button>
        </div>
      </div>

      {/* Top status banner */}
      <section
        className={clsx(
          'rounded-2xl border p-5 shadow-sm',
          overallHealthy
            ? 'border-emerald-200 bg-gradient-to-br from-emerald-50 via-white to-teal-50'
            : 'border-amber-200 bg-amber-50/50',
        )}
      >
        <div className="flex items-start gap-3">
          <div
            className={clsx(
              'flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-white shadow-sm',
              overallHealthy ? 'bg-emerald-500' : 'bg-amber-500',
            )}
          >
            {overallHealthy ? (
              <CheckCircle2 className="h-6 w-6" />
            ) : (
              <AlertTriangle className="h-6 w-6" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-slate-900">
              {overallHealthy ? 'All systems operational' : 'Attention needed'}
            </p>
            <p className="mt-0.5 text-xs text-slate-600">
              {overallHealthy
                ? 'Database is reachable, auth is valid, and monitoring probes pass.'
                : 'One or more probes reported a problem — see below for details.'}
            </p>
            {error && (
              <p className="mt-2 rounded-lg border border-red-200 bg-red-50 px-2.5 py-1.5 text-[11px] text-red-700">
                {error}
              </p>
            )}
          </div>
        </div>
      </section>

      {/* Probes */}
      <section className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <ProbeCard
          icon={<Database className="h-4 w-4" />}
          title="Database"
          value={snapshot?.db.reachable ? 'Reachable' : loading ? 'Probing…' : 'Unreachable'}
          hint={
            snapshot?.db.responseMs !== null && snapshot?.db.responseMs !== undefined
              ? `Round-trip ${snapshot.db.responseMs} ms`
              : 'No response'
          }
          status={
            !snapshot
              ? 'idle'
              : snapshot.db.reachable
                ? (snapshot.db.responseMs ?? 9999) < 800
                  ? 'ok'
                  : 'warn'
                : 'bad'
          }
          detail={snapshot?.db.error}
        />
        <ProbeCard
          icon={<ShieldCheck className="h-4 w-4" />}
          title="Auth session"
          value={
            snapshot?.auth.authenticated ? 'Signed in' : loading ? 'Checking…' : 'Not signed in'
          }
          hint="Supabase auth.getUser() round-trip"
          status={!snapshot ? 'idle' : snapshot.auth.authenticated ? 'ok' : 'bad'}
          detail={snapshot?.auth.error}
        />
      </section>

      {/* Table counts */}
      <section>
        <h3 className="mb-3 text-sm font-semibold text-slate-900">Data volume</h3>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
          <CountCard
            icon={<Users2 className="h-3.5 w-3.5 text-blue-500" />}
            label="Users"
            value={snapshot?.counts.profiles}
          />
          <CountCard
            icon={<Building2 className="h-3.5 w-3.5 text-emerald-500" />}
            label="Municipalities"
            value={snapshot?.counts.municipalities}
          />
          <CountCard
            icon={<ClipboardList className="h-3.5 w-3.5 text-purple-500" />}
            label="Indicator rows"
            value={snapshot?.counts.entries}
          />
          <CountCard
            icon={<Send className="h-3.5 w-3.5 text-amber-500" />}
            label="Submissions"
            value={snapshot?.counts.submissions}
          />
          <CountCard
            icon={<MessageSquare className="h-3.5 w-3.5 text-rose-500" />}
            label="Feedback"
            value={snapshot?.counts.feedback}
          />
          <CountCard
            icon={<Scale className="h-3.5 w-3.5 text-slate-500" />}
            label="Weight overrides"
            value={snapshot?.counts.weights}
          />
        </div>
      </section>

      {/* Last activity */}
      <section>
        <h3 className="mb-3 text-sm font-semibold text-slate-900">Latest activity</h3>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <ActivityCell
            icon={<ClipboardList className="h-4 w-4 text-purple-500" />}
            label="Latest indicator entry"
            ts={snapshot?.activity.lastEntry}
          />
          <ActivityCell
            icon={<Send className="h-4 w-4 text-amber-500" />}
            label="Latest submission"
            ts={snapshot?.activity.lastSubmission}
          />
          <ActivityCell
            icon={<MessageSquare className="h-4 w-4 text-rose-500" />}
            label="Latest feedback"
            ts={snapshot?.activity.lastFeedback}
          />
        </div>
      </section>

      <p className="text-[10px] text-slate-400">
        <Activity className="mr-1 inline h-3 w-3" />
        Health probes run entirely in your browser against the same Supabase project this
        app uses. No external monitoring service is involved.
      </p>
    </div>
  );
}

function ProbeCard({
  icon,
  title,
  value,
  hint,
  status,
  detail,
}: {
  icon: React.ReactNode;
  title: string;
  value: string;
  hint: string;
  status: 'idle' | 'ok' | 'warn' | 'bad';
  detail?: string;
}) {
  const border = {
    idle: 'border-slate-200',
    ok: 'border-emerald-200 bg-emerald-50/40',
    warn: 'border-amber-200 bg-amber-50/40',
    bad: 'border-red-200 bg-red-50/40',
  }[status];
  const dot = {
    idle: 'bg-slate-300',
    ok: 'bg-emerald-500',
    warn: 'bg-amber-500',
    bad: 'bg-red-500',
  }[status];
  return (
    <div className={clsx('rounded-xl border p-4 shadow-sm', border)}>
      <div className="flex items-center gap-2 text-slate-500">
        {icon}
        <p className="text-xs font-semibold uppercase tracking-wider">{title}</p>
        <span className="ml-auto inline-flex items-center gap-1.5 text-[10px] font-medium text-slate-500">
          <span className={clsx('h-2 w-2 rounded-full', dot)} />
          {status}
        </span>
      </div>
      <p className="mt-2 text-lg font-bold text-slate-900">{value}</p>
      <p className="mt-0.5 text-xs text-slate-500">{hint}</p>
      {detail && (
        <p className="mt-2 rounded-md border border-red-200 bg-red-50 px-2 py-1 text-[10px] text-red-700">
          {detail}
        </p>
      )}
    </div>
  );
}

function CountCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: number | null | undefined;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
      <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
        {icon} {label}
      </div>
      <p className="mt-1 text-2xl font-bold text-slate-900">
        {value === null || value === undefined ? '—' : value.toLocaleString('en-GB')}
      </p>
    </div>
  );
}

function ActivityCell({
  icon,
  label,
  ts,
}: {
  icon: React.ReactNode;
  label: string;
  ts: string | null | undefined;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
      <div className="flex items-center gap-2">
        {icon}
        <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
          {label}
        </p>
      </div>
      <p className="mt-1 text-sm font-semibold text-slate-900">
        {ts ? new Date(ts).toLocaleString('en-GB') : '—'}
      </p>
      {ts && (
        <p className="mt-0.5 text-[10px] text-slate-500">
          <Clock className="mr-1 inline h-3 w-3" />
          {relativeAgo(ts)}
        </p>
      )}
    </div>
  );
}

function relativeAgo(iso: string): string {
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return `${Math.round(s)}s ago`;
  if (s < 3600) return `${Math.round(s / 60)}m ago`;
  if (s < 86400) return `${Math.round(s / 3600)}h ago`;
  return `${Math.round(s / 86400)}d ago`;
}
