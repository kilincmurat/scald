'use client';

import { useEffect, useMemo, useState } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { useProfile } from '@/hooks/useProfile';
import { canRespondFeedback } from '@/lib/roles';
import {
  MessageSquare,
  Send,
  Inbox,
  Loader2,
  CheckCircle2,
  Clock,
  ArchiveX,
  Eye,
} from 'lucide-react';
import { clsx } from 'clsx';

const CATEGORIES = [
  { id: 'environment', label: 'Environment' },
  { id: 'social', label: 'Social' },
  { id: 'transport', label: 'Transport' },
  { id: 'waste', label: 'Waste' },
  { id: 'general', label: 'General' },
];

type Status = 'new' | 'seen' | 'in_progress' | 'resolved' | 'dismissed';

const STATUS_META: Record<Status, { label: string; color: string }> = {
  new: { label: 'New', color: 'bg-blue-100 text-blue-700' },
  seen: { label: 'Seen', color: 'bg-slate-100 text-slate-600' },
  in_progress: { label: 'In progress', color: 'bg-amber-100 text-amber-700' },
  resolved: { label: 'Resolved', color: 'bg-emerald-100 text-emerald-700' },
  dismissed: { label: 'Dismissed', color: 'bg-slate-200 text-slate-500' },
};

function client() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}

export function FeedbackView() {
  const { profile } = useProfile();
  const isInbox = profile ? canRespondFeedback(profile.role) : false;

  return isInbox ? <FeedbackInbox /> : <FeedbackForm />;
}

function FeedbackForm() {
  const { profile } = useProfile();
  const [subject, setSubject] = useState('');
  const [category, setCategory] = useState('general');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile?.municipalityId) {
      setError('No municipality on your profile — please contact the SCALD team.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const supabase = client();
      const { error: insErr } = await supabase.from('feedback').insert({
        user_id: profile.id,
        municipality_id: profile.municipalityId,
        subject: subject.trim() || null,
        category,
        message: message.trim(),
      });
      if (insErr) throw insErr;
      setSent(true);
      setSubject('');
      setMessage('');
      setCategory('general');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send feedback.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-4 lg:p-6">
      <div className="mx-auto max-w-2xl">
        <div className="mb-4 flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white">
            <MessageSquare className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-slate-900">
              Share feedback with {profile?.municipality?.name ?? 'your municipality'}
            </h2>
            <p className="text-xs text-slate-500">
              Your message goes to the municipality's decision makers.
            </p>
          </div>
        </div>

        {sent && (
          <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
            ✅ Thanks — your feedback was sent. You can send more messages any time.
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-slate-600">Category</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/15"
            >
              {CATEGORIES.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold text-slate-600">
              Subject <span className="font-normal text-slate-400">(optional)</span>
            </label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              maxLength={140}
              className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/15"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold text-slate-600">
              Your message <span className="text-red-500">*</span>
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              required
              minLength={5}
              maxLength={5000}
              rows={6}
              className="w-full resize-y rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/15"
            />
            <p className="mt-1 text-[10px] text-slate-400">{message.length} / 5000 characters</p>
          </div>

          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting || message.trim().length < 5}
            className={clsx(
              'inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold text-white transition',
              submitting || message.trim().length < 5
                ? 'cursor-not-allowed bg-slate-300'
                : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:opacity-90',
            )}
          >
            <Send className="h-4 w-4" />
            {submitting ? 'Sending…' : 'Send feedback'}
          </button>
        </form>
      </div>
    </div>
  );
}

type Row = {
  id: string;
  user_id: string | null;
  municipality_id: string;
  subject: string | null;
  message: string;
  category: string | null;
  status: Status;
  response: string | null;
  responded_at: string | null;
  created_at: string;
};

function FeedbackInbox() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<'all' | Status>('all');
  const [selected, setSelected] = useState<Row | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const supabase = client();
      const { data } = await supabase
        .from('feedback')
        .select('id, user_id, municipality_id, subject, message, category, status, response, responded_at, created_at')
        .order('created_at', { ascending: false });
      setRows((data as Row[] | null) ?? []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const filtered = useMemo(
    () => (statusFilter === 'all' ? rows : rows.filter((r) => r.status === statusFilter)),
    [rows, statusFilter],
  );

  const counts = useMemo(() => {
    const c: Record<Status, number> = { new: 0, seen: 0, in_progress: 0, resolved: 0, dismissed: 0 };
    for (const r of rows) c[r.status]++;
    return c;
  }, [rows]);

  return (
    <div className="p-4 lg:p-6 space-y-5">
      <section className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <FilterCard
          active={statusFilter === 'all'}
          onClick={() => setStatusFilter('all')}
          label="All"
          value={rows.length}
          icon={<Inbox className="h-3.5 w-3.5 text-slate-500" />}
        />
        {(['new', 'in_progress', 'resolved', 'dismissed'] as Status[]).map((s) => (
          <FilterCard
            key={s}
            active={statusFilter === s}
            onClick={() => setStatusFilter(s)}
            label={STATUS_META[s].label}
            value={counts[s]}
            icon={
              s === 'new' ? (
                <Eye className="h-3.5 w-3.5 text-blue-500" />
              ) : s === 'in_progress' ? (
                <Clock className="h-3.5 w-3.5 text-amber-500" />
              ) : s === 'resolved' ? (
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
              ) : (
                <ArchiveX className="h-3.5 w-3.5 text-slate-400" />
              )
            }
          />
        ))}
      </section>

      <section className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16 text-sm text-slate-500">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Loading feedback…
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center text-sm text-slate-500">No feedback matches this filter.</div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {filtered.map((r) => (
              <li
                key={r.id}
                onClick={() => setSelected(r)}
                className="cursor-pointer px-4 py-3 transition hover:bg-slate-50"
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="truncate text-sm font-semibold text-slate-900">
                    {r.subject || 'No subject'}
                  </p>
                  <span
                    className={clsx(
                      'shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold',
                      STATUS_META[r.status].color,
                    )}
                  >
                    {STATUS_META[r.status].label}
                  </span>
                </div>
                <p className="mt-1 line-clamp-2 text-xs text-slate-600">{r.message}</p>
                <p className="mt-1.5 text-[10px] text-slate-400">
                  {r.category ?? 'general'} · {new Date(r.created_at).toLocaleString('en-GB')}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>

      {selected && (
        <ItemModal
          row={selected}
          onClose={() => setSelected(null)}
          onSaved={() => {
            setSelected(null);
            void load();
          }}
        />
      )}
    </div>
  );
}

function FilterCard({
  active,
  onClick,
  label,
  value,
  icon,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  value: number;
  icon: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={clsx(
        'rounded-xl border p-3 text-left transition',
        active ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-200 bg-white text-slate-800 hover:shadow-sm',
      )}
    >
      <div className={clsx('flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider', active ? 'text-slate-300' : 'text-slate-500')}>
        {icon}
        {label}
      </div>
      <p className="mt-2 text-2xl font-bold">{value}</p>
    </button>
  );
}

function ItemModal({
  row,
  onClose,
  onSaved,
}: {
  row: Row;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [status, setStatus] = useState<Status>(row.status);
  const [response, setResponse] = useState(row.response ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = async () => {
    setBusy(true);
    setError(null);
    try {
      const supabase = client();
      const payload: {
        status: Status;
        response: string | null;
        responded_at: string | null;
      } = {
        status,
        response: response.trim() || null,
        responded_at: response.trim() ? new Date().toISOString() : row.responded_at,
      };
      const { error: err } = await supabase.from('feedback').update(payload).eq('id', row.id);
      if (err) throw err;
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
      <div className="flex max-h-[92vh] w-full max-w-2xl flex-col rounded-2xl border border-slate-200 bg-white shadow-2xl">
        <div className="flex items-start justify-between border-b border-slate-200 px-5 py-3">
          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-slate-900">{row.subject || 'Feedback'}</h3>
            <p className="mt-0.5 text-[10px] text-slate-500">
              {row.category ?? 'general'} · {new Date(row.created_at).toLocaleString('en-GB')}
            </p>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100">
            ×
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          <div className="rounded-lg border border-slate-100 bg-slate-50 p-3 text-sm text-slate-800 whitespace-pre-wrap">
            {row.message}
          </div>

          <div>
            <label className="mb-1 block text-[11px] font-semibold text-slate-600">Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as Status)}
              className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-slate-400 focus:bg-white focus:ring-2 focus:ring-slate-200"
            >
              {(['new', 'seen', 'in_progress', 'resolved', 'dismissed'] as Status[]).map((s) => (
                <option key={s} value={s}>
                  {STATUS_META[s].label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-[11px] font-semibold text-slate-600">
              Internal response <span className="font-normal text-slate-400">(optional)</span>
            </label>
            <textarea
              value={response}
              onChange={(e) => setResponse(e.target.value)}
              rows={4}
              placeholder="Notes / action taken. Only staff can see this."
              className="w-full resize-y rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-slate-400 focus:bg-white focus:ring-2 focus:ring-slate-200"
            />
          </div>

          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
              {error}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 border-t border-slate-200 px-5 py-3">
          <button
            onClick={onClose}
            className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-slate-600 transition hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            onClick={save}
            disabled={busy}
            className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white transition hover:bg-slate-800 disabled:opacity-50"
          >
            {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}
