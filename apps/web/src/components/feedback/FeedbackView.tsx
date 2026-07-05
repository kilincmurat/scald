'use client';

import { useState } from 'react';
import { useProfile } from '@/hooks/useProfile';
import { canRespondFeedback } from '@/lib/roles';
import { MessageSquare, Send, Inbox } from 'lucide-react';
import { clsx } from 'clsx';

const CATEGORIES = [
  { id: 'environment', label: 'Environment' },
  { id: 'social', label: 'Social' },
  { id: 'transport', label: 'Transport' },
  { id: 'waste', label: 'Waste' },
  { id: 'general', label: 'General' },
];

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
      // Direct Supabase insert; RLS enforces per-user.
      const { createBrowserClient } = await import('@supabase/ssr');
      const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      );
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
            <label className="mb-1.5 block text-xs font-semibold text-slate-600">
              Category
            </label>
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
            <p className="mt-1 text-[10px] text-slate-400">
              {message.length} / 5000 characters
            </p>
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

function FeedbackInbox() {
  return (
    <div className="p-4 lg:p-6">
      <div className="mx-auto max-w-2xl rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <Inbox className="mx-auto h-10 w-10 text-slate-400" />
        <h2 className="mt-4 text-lg font-bold text-slate-900">Feedback Inbox</h2>
        <p className="mt-2 text-sm text-slate-500">
          Citizen submissions and status management UI will be built in the next iteration.
          Backend and RLS are already live — the <code className="text-xs">feedback</code> table
          collects rows in real time.
        </p>
      </div>
    </div>
  );
}
