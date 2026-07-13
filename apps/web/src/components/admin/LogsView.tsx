'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  fetchActivityLog,
  type LogEntry,
  type LogEntryKind,
} from '@/lib/admin-monitoring-service';
import { PILOT_MUNICIPALITIES, getPilotById } from '@/lib/pilot-municipalities';
import { ROLE_BADGE_COLOR, ROLE_LABELS, type Role } from '@/lib/roles';
import {
  Loader2,
  RefreshCcw,
  ClipboardList,
  Send,
  ShieldCheck,
  MessageSquare,
  Reply,
  Filter,
  User,
  LogIn,
  Monitor,
  Globe,
  MapPin,
} from 'lucide-react';
import { clsx } from 'clsx';

const KIND_META: Record<
  LogEntryKind,
  { label: string; icon: typeof ClipboardList; color: string }
> = {
  auth: { label: 'Login', icon: LogIn, color: 'text-indigo-700 bg-indigo-100' },
  entry: { label: 'Entry', icon: ClipboardList, color: 'text-purple-700 bg-purple-100' },
  submission: { label: 'Submitted', icon: Send, color: 'text-amber-700 bg-amber-100' },
  approval: { label: 'Approved', icon: ShieldCheck, color: 'text-emerald-700 bg-emerald-100' },
  feedback_new: {
    label: 'New feedback',
    icon: MessageSquare,
    color: 'text-rose-700 bg-rose-100',
  },
  feedback_response: {
    label: 'Response',
    icon: Reply,
    color: 'text-blue-700 bg-blue-100',
  },
  category_complete: {
    label: 'Category done',
    icon: ClipboardList,
    color: 'text-teal-700 bg-teal-100',
  },
  set_badge: {
    label: 'Set badge',
    icon: ShieldCheck,
    color: 'text-emerald-700 bg-emerald-100',
  },
};

const ALL_KINDS: LogEntryKind[] = [
  'auth',
  'entry',
  'submission',
  'approval',
  'feedback_new',
  'feedback_response',
];

const LIMIT_OPTIONS = [50, 100, 200, 500];

export function LogsView() {
  const [rows, setRows] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [selectedKinds, setSelectedKinds] = useState<Set<LogEntryKind>>(new Set(ALL_KINDS));
  const [municipalityId, setMunicipalityId] = useState<string>('all');
  const [limit, setLimit] = useState<number>(100);
  const [query, setQuery] = useState('');

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchActivityLog({
        kinds: Array.from(selectedKinds),
        municipalityId: municipalityId === 'all' ? null : municipalityId,
        limit,
      });
      setRows(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load logs.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedKinds, municipalityId, limit]);

  const filtered = useMemo(() => {
    if (!query.trim()) return rows;
    const q = query.trim().toLowerCase();
    return rows.filter(
      (r) =>
        r.target.toLowerCase().includes(q) ||
        (r.actorEmail ?? '').toLowerCase().includes(q) ||
        (r.actorName ?? '').toLowerCase().includes(q),
    );
  }, [rows, query]);

  const toggleKind = (k: LogEntryKind) => {
    setSelectedKinds((prev) => {
      const next = new Set(prev);
      if (next.has(k)) next.delete(k);
      else next.add(k);
      return next;
    });
  };

  const counts = useMemo(() => {
    const c: Record<LogEntryKind, number> = {
      auth: 0,
      entry: 0,
      submission: 0,
      approval: 0,
      feedback_new: 0,
      feedback_response: 0,
      category_complete: 0,
      set_badge: 0,
    };
    for (const r of rows) c[r.kind]++;
    return c;
  }, [rows]);

  return (
    <div className="p-4 lg:p-6 space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Log management</h2>
          <p className="text-xs text-slate-500">
            Chronological trace of who did what across the SCALD platform. Filter by type,
            municipality, or search actor/target.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          disabled={loading}
          className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-slate-800 disabled:opacity-60"
        >
          {loading ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <RefreshCcw className="h-3.5 w-3.5" />
          )}
          Refresh
        </button>
      </div>

      {/* Filters */}
      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center gap-2">
          <Filter className="h-3.5 w-3.5 text-slate-400" />
          <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
            Type
          </span>
          {ALL_KINDS.map((k) => {
            const active = selectedKinds.has(k);
            const meta = KIND_META[k];
            return (
              <button
                key={k}
                type="button"
                onClick={() => toggleKind(k)}
                className={clsx(
                  'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 ring-inset transition',
                  active
                    ? `${meta.color} ring-transparent`
                    : 'bg-slate-50 text-slate-500 ring-slate-200 hover:bg-slate-100',
                )}
              >
                {meta.label}
                <span className="opacity-70">· {counts[k]}</span>
              </button>
            );
          })}
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <label className="inline-flex items-center gap-2 text-xs text-slate-600">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
              Municipality
            </span>
            <select
              value={municipalityId}
              onChange={(e) => setMunicipalityId(e.target.value)}
              className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs text-slate-700 outline-none focus:ring-2 focus:ring-emerald-500/20"
            >
              <option value="all">All municipalities</option>
              {PILOT_MUNICIPALITIES.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.flag} {m.name}
                </option>
              ))}
            </select>
          </label>

          <label className="inline-flex items-center gap-2 text-xs text-slate-600">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
              Rows
            </span>
            <select
              value={limit}
              onChange={(e) => setLimit(Number(e.target.value))}
              className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs text-slate-700 outline-none focus:ring-2 focus:ring-emerald-500/20"
            >
              {LIMIT_OPTIONS.map((n) => (
                <option key={n} value={n}>
                  Last {n}
                </option>
              ))}
            </select>
          </label>

          <input
            type="search"
            placeholder="Search actor or target…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="ml-auto min-w-[220px] flex-1 rounded-lg border border-slate-200 bg-white px-3 py-1 text-xs text-slate-800 outline-none placeholder:text-slate-400 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 sm:flex-none"
          />
        </div>
      </section>

      {/* Results */}
      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        {loading && rows.length === 0 ? (
          <div className="flex items-center justify-center py-12 text-sm text-slate-500">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Loading activity…
          </div>
        ) : error ? (
          <div className="px-4 py-6 text-sm text-red-700">{error}</div>
        ) : filtered.length === 0 ? (
          <div className="py-12 text-center text-sm text-slate-500">
            No log entries match these filters.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="border-b border-slate-200 bg-slate-50 text-slate-600">
                <tr>
                  <th className="px-3 py-2 text-left font-semibold">When</th>
                  <th className="px-3 py-2 text-left font-semibold">Type</th>
                  <th className="px-3 py-2 text-left font-semibold">Actor</th>
                  <th className="px-3 py-2 text-left font-semibold">Municipality</th>
                  <th className="px-3 py-2 text-left font-semibold">Detail</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((row) => {
                  const meta = KIND_META[row.kind];
                  const Icon = meta.icon;
                  const muni = row.municipalityId ? getPilotById(row.municipalityId) : null;
                  const roleKey = row.actorRole as Role | undefined;
                  return (
                    <tr key={row.id} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="whitespace-nowrap px-3 py-2 text-slate-500">
                        <div className="font-mono text-[10px]">
                          {new Date(row.ts).toLocaleString('en-GB', {
                            day: '2-digit',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </div>
                        <div className="text-[9px] text-slate-400">
                          {new Date(row.ts).toLocaleDateString('en-GB', { year: 'numeric' })}
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-3 py-2">
                        <span
                          className={clsx(
                            'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold',
                            meta.color,
                          )}
                        >
                          <Icon className="h-3 w-3" />
                          {meta.label}
                        </span>
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-2">
                          <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-100">
                            <User className="h-3 w-3 text-slate-400" />
                          </div>
                          <div className="min-w-0">
                            <p className="truncate font-medium text-slate-800">
                              {row.actorName || row.actorEmail || '—'}
                            </p>
                            {roleKey && ROLE_LABELS[roleKey] && (
                              <p
                                className={clsx(
                                  'mt-0.5 inline-flex rounded-full px-1.5 py-0 text-[9px] font-semibold ring-1 ring-inset',
                                  ROLE_BADGE_COLOR[roleKey],
                                )}
                              >
                                {ROLE_LABELS[roleKey]}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-3 py-2 text-slate-700">
                        {muni ? (
                          <span className="inline-flex items-center gap-1.5">
                            <span className="text-sm leading-none">{muni.flag}</span>
                            <span>{muni.name}</span>
                          </span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-slate-700">
                        <div className="max-w-[420px] truncate" title={row.target}>
                          {row.target}
                        </div>
                        {row.detail && (
                          <div className="text-[10px] text-slate-500">{row.detail}</div>
                        )}
                        {(row.device || row.ip || row.location) && (
                          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[10px] text-slate-500">
                            {row.device && (
                              <span className="inline-flex items-center gap-1" title="Device">
                                <Monitor className="h-3 w-3 text-slate-400" />
                                {row.device}
                              </span>
                            )}
                            {row.ip && (
                              <span className="inline-flex items-center gap-1" title="IP address">
                                <Globe className="h-3 w-3 text-slate-400" />
                                <span className="font-mono">{row.ip}</span>
                              </span>
                            )}
                            {row.location && (
                              <span className="inline-flex items-center gap-1" title="Location (timezone)">
                                <MapPin className="h-3 w-3 text-slate-400" />
                                {row.location}
                              </span>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <p className="text-[10px] text-slate-400">
        Activity is derived from live table rows (entries, submissions, feedback). Login events
        are recorded in the audit log with the sign-in IP, device and timezone. Location is
        inferred from the browser timezone (no external geo-IP lookup, for portability).
      </p>
    </div>
  );
}
