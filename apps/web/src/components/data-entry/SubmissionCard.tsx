'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useProfile } from '@/hooks/useProfile';
import { useDataEntry, isYearEditable } from '@/stores/data-entry';
import { useSubmission } from '@/hooks/useSubmission';
import type { SubmissionStatus } from '@/lib/data-submission-service';
import { useEffectiveMunicipality } from '@/hooks/useEffectiveMunicipality';
import { canWriteDataEntry, canRespondFeedback } from '@/lib/roles';
import {
  Send,
  CheckCircle2,
  Clock,
  Lock,
  ShieldCheck,
  AlertCircle,
  Loader2,
  X,
  Calculator,
  ArrowRight,
  Undo2,
  PencilLine,
} from 'lucide-react';
import { clsx } from 'clsx';

export const SUBMITTER_DECLARATION_TEXT =
  'I confirm that the indicator values I entered for this reporting year are accurate to the best of my knowledge, and that I am authorised by my municipality to submit them for review.';

export const APPROVER_DECLARATION_TEXT =
  'I have reviewed the submitted indicator values and the submitter’s declaration. I approve this data for calculation and confirm the results may be used in official SCALD reporting.';

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function SubmissionCard() {
  const { profile } = useProfile();
  const { municipalityId } = useEffectiveMunicipality();
  const year = useDataEntry((s) => s.selectedYear);
  const overall = useDataEntry((s) => s.overallProgress());
  const { submission, loading, mutating, error, submit, approve, askRevision } = useSubmission(
    municipalityId,
    year,
  );

  const [showSubmit, setShowSubmit] = useState(false);
  const [showApprove, setShowApprove] = useState(false);
  const [showRevision, setShowRevision] = useState(false);

  const role = profile?.role;
  const isDataEntry = role ? canWriteDataEntry(role) && role !== 'admin' : false;
  const isDecisionMaker = role ? canRespondFeedback(role) && role !== 'admin' : false;
  const isAdmin = role === 'admin';
  const yearEditable = isYearEditable(year);
  const allComplete = overall.total > 0 && overall.done === overall.total;

  if (loading && !submission) {
    return <div className="h-32 rounded-2xl bg-slate-100 animate-pulse" />;
  }

  const status = submission?.status ?? null;

  return (
    <>
      <section
        className={clsx(
          'overflow-hidden rounded-2xl border shadow-sm',
          status === 'approved'
            ? 'border-emerald-200 bg-gradient-to-br from-emerald-50 via-white to-teal-50'
            : status === 'submitted'
              ? 'border-amber-200 bg-amber-50/40'
              : status === 'revision_requested'
                ? 'border-orange-200 bg-orange-50/40'
                : 'border-slate-200 bg-white',
        )}
      >
        <div className="flex items-center gap-2 border-b border-slate-100 bg-white/60 px-5 py-3">
          <StatusPill status={status} />
          <p className="text-xs text-slate-500">
            Reporting year <span className="font-semibold text-slate-700">{year}</span>
          </p>
          {submission?.submitted_at && (
            <p className="ml-auto text-[10px] text-slate-400">
              Submitted {formatDate(submission.submitted_at)}
            </p>
          )}
        </div>

        <div className="p-5">
          {/* No submission yet */}
          {!submission && (
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-start gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-500">
                  <Send className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    {isDataEntry ? 'Ready to submit?' : 'Awaiting submission'}
                  </h3>
                  <p className="mt-0.5 text-xs text-slate-600">
                    {isDataEntry
                      ? allComplete
                        ? 'All required indicators are filled. Submit the data with your accuracy declaration so the decision maker can review it.'
                        : `Fill all ${overall.total} required indicators to unlock submission. (${overall.done} of ${overall.total} entered)`
                      : 'The data entry team has not yet submitted this reporting year for review.'}
                  </p>
                </div>
              </div>
              {isDataEntry && (
                <button
                  type="button"
                  onClick={() => setShowSubmit(true)}
                  disabled={!allComplete || !yearEditable || mutating}
                  className={clsx(
                    'inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold shadow-sm transition',
                    !allComplete || !yearEditable || mutating
                      ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                      : 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white hover:opacity-90',
                  )}
                >
                  <Send className="h-4 w-4" />
                  Submit for review
                </button>
              )}
            </div>
          )}

          {/* Submitted, awaiting review */}
          {submission && status === 'submitted' && (
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-600">
                  <Clock className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <h3 className="text-sm font-bold text-slate-900">
                    {isDecisionMaker || isAdmin
                      ? 'Ready for your review'
                      : 'Submitted — awaiting decision maker'}
                  </h3>
                  <p className="mt-0.5 text-xs text-slate-600">
                    {isDecisionMaker || isAdmin
                      ? 'Review the submitter’s declaration and the entered data, then approve to unlock calculation.'
                      : 'The decision maker will read the declaration and either approve the data or ask for changes.'}
                  </p>
                </div>
              </div>

              <DeclarationBox
                title="Submitter’s declaration"
                who={
                  submission.submitter_note
                    ? `${submission.submitter_note}`
                    : undefined
                }
                text={SUBMITTER_DECLARATION_TEXT}
                accepted={submission.submitter_declaration}
                meta={`${submission.entered_count ?? '—'} / ${submission.required_count ?? '—'} indicators`}
              />

              {(isDecisionMaker || isAdmin) && (
                <div className="flex flex-col gap-2 border-t border-amber-200/60 pt-3 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-xs text-slate-600">
                    Approve to unlock calculation, or send it back to the data-entry team for
                    changes.
                  </p>
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setShowRevision(true)}
                      disabled={mutating}
                      className="inline-flex items-center justify-center gap-2 rounded-lg border border-orange-300 bg-white px-3.5 py-2 text-sm font-semibold text-orange-700 shadow-sm transition hover:bg-orange-50 disabled:opacity-60"
                    >
                      <Undo2 className="h-4 w-4" />
                      Request changes
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowApprove(true)}
                      disabled={mutating}
                      className="inline-flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-emerald-500 to-teal-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:opacity-90 disabled:opacity-60"
                    >
                      <ShieldCheck className="h-4 w-4" />
                      Review &amp; approve
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Changes requested — back with the data-entry team */}
          {submission && status === 'revision_requested' && (
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-orange-100 text-orange-600">
                  <PencilLine className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <h3 className="text-sm font-bold text-slate-900">
                    {isDataEntry || isAdmin
                      ? 'Changes requested — please revise'
                      : 'Sent back to the data-entry team'}
                  </h3>
                  <p className="mt-0.5 text-xs text-slate-600">
                    {isDataEntry || isAdmin
                      ? 'The decision maker asked for changes. Update the indicators below, then resubmit for review.'
                      : 'The data-entry team has been asked to revise this year. You’ll be able to review again once they resubmit.'}
                  </p>
                  {submission.reviewed_at && (
                    <p className="mt-1 text-[10px] text-slate-500">
                      Returned on {formatDate(submission.reviewed_at)}
                    </p>
                  )}
                </div>
              </div>

              <div className="rounded-lg border border-orange-200 bg-white p-3 text-xs">
                <p className="text-[11px] font-bold uppercase tracking-wider text-orange-700">
                  Requested changes
                </p>
                <p className="mt-1.5 leading-relaxed text-slate-700">
                  {submission.reviewer_note?.trim()
                    ? submission.reviewer_note
                    : 'No specific note was left — please review the entered values for accuracy.'}
                </p>
              </div>

              {(isDataEntry || isAdmin) && (
                <div className="flex flex-col gap-2 border-t border-orange-200/60 pt-3 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-xs text-slate-600">
                    {allComplete
                      ? 'When you’re done, resubmit the data for review.'
                      : `Fill all ${overall.total} required indicators to resubmit. (${overall.done} of ${overall.total} entered)`}
                  </p>
                  <button
                    type="button"
                    onClick={() => setShowSubmit(true)}
                    disabled={!allComplete || !yearEditable || mutating}
                    className={clsx(
                      'inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold shadow-sm transition',
                      !allComplete || !yearEditable || mutating
                        ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                        : 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white hover:opacity-90',
                    )}
                  >
                    <Send className="h-4 w-4" />
                    Resubmit for review
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Approved */}
          {submission && status === 'approved' && (
            <div className="space-y-4">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex items-start gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-500 text-white shadow-md">
                    <CheckCircle2 className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">
                      Approved — ready to calculate
                    </h3>
                    <p className="mt-0.5 text-xs text-slate-600">
                      {isDecisionMaker || isAdmin
                        ? 'You have approved this year’s data. You can now run the ecological footprint calculation.'
                        : 'The decision maker has approved this year’s data. Calculation is now unlocked.'}
                    </p>
                    {submission.reviewed_at && (
                      <p className="mt-1 text-[10px] text-slate-500">
                        Approved on {formatDate(submission.reviewed_at)}
                      </p>
                    )}
                  </div>
                </div>
                {(isDecisionMaker || isAdmin) && (
                  <Link
                    href="/data-entry/calculate"
                    className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-emerald-500 to-teal-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:opacity-90 hover:shadow-md"
                  >
                    <Calculator className="h-4 w-4" />
                    Calculate now
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                )}
              </div>

              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <DeclarationBox
                  title="Submitter’s declaration"
                  who={submission.submitter_note ?? undefined}
                  text={SUBMITTER_DECLARATION_TEXT}
                  accepted={submission.submitter_declaration}
                  meta={
                    submission.submitted_at
                      ? formatDate(submission.submitted_at)
                      : undefined
                  }
                />
                <DeclarationBox
                  title="Approver’s declaration"
                  who={submission.reviewer_note ?? undefined}
                  text={APPROVER_DECLARATION_TEXT}
                  accepted={submission.approval_declaration}
                  meta={
                    submission.reviewed_at
                      ? formatDate(submission.reviewed_at)
                      : undefined
                  }
                />
              </div>

              <div className="flex items-start gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs">
                <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-500" />
                <p className="text-slate-600">
                  {isAdmin
                    ? 'This year is approved and locked for the municipality. As an administrator you can still amend the entered values if a correction is required.'
                    : 'This year is approved and locked. The entered values can no longer be changed by the data-entry team or decision maker — contact an administrator if a correction is needed.'}
                </p>
              </div>
            </div>
          )}

          {error && (
            <div className="mt-4 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
              <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </div>
      </section>

      {showSubmit && (
        <SubmitDialog
          enteredCount={overall.done}
          requiredCount={overall.total}
          submitting={mutating}
          onClose={() => setShowSubmit(false)}
          onSubmit={async (note) => {
            const res = await submit({
              submitterNote: note,
              enteredCount: overall.done,
              requiredCount: overall.total,
            });
            if (res.ok) setShowSubmit(false);
          }}
        />
      )}

      {showApprove && submission && (
        <ApproveDialog
          submission={submission}
          approving={mutating}
          onClose={() => setShowApprove(false)}
          onApprove={async (note) => {
            const res = await approve({ reviewerNote: note });
            if (res.ok) setShowApprove(false);
          }}
        />
      )}

      {showRevision && submission && (
        <RequestRevisionDialog
          submitting={mutating}
          onClose={() => setShowRevision(false)}
          onSubmit={async (note) => {
            const res = await askRevision({ reviewerNote: note });
            if (res.ok) setShowRevision(false);
          }}
        />
      )}
    </>
  );
}

function RequestRevisionDialog({
  submitting,
  onClose,
  onSubmit,
}: {
  submitting: boolean;
  onClose: () => void;
  onSubmit: (note: string) => void;
}) {
  const [note, setNote] = useState('');
  const canSend = note.trim().length > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="revision-title"
        className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl"
      >
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-500 text-white shadow-md">
              <Undo2 className="h-5 w-5" />
            </div>
            <div>
              <h3 id="revision-title" className="text-lg font-bold text-slate-900">
                Request changes
              </h3>
              <p className="text-xs text-slate-500">
                Send the data back to the data-entry team for revision.
              </p>
            </div>
          </div>
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <label className="mt-5 block">
          <span className="text-xs font-medium text-slate-700">
            What needs to change? <span className="text-red-500">*</span>
          </span>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={4}
            maxLength={500}
            placeholder="e.g., ES_GI3 looks off — please re-check the 2025 value and its unit."
            className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
          />
          <span className="mt-1 block text-[10px] text-slate-400">
            The data-entry team will see this note and be able to edit and resubmit.
          </span>
        </label>

        <div className="mt-5 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => onSubmit(note)}
            disabled={!canSend || submitting}
            className={clsx(
              'inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold shadow-sm transition',
              !canSend || submitting
                ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                : 'bg-orange-600 text-white hover:bg-orange-700',
            )}
          >
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Undo2 className="h-4 w-4" />}
            {submitting ? 'Sending…' : 'Send back for changes'}
          </button>
        </div>
      </div>
    </div>
  );
}

function StatusPill({ status }: { status: SubmissionStatus | null }) {
  if (status === 'approved') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-700 ring-1 ring-emerald-200">
        <CheckCircle2 className="h-3 w-3" /> Approved
      </span>
    );
  }
  if (status === 'submitted') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-700 ring-1 ring-amber-200">
        <Clock className="h-3 w-3" /> Awaiting review
      </span>
    );
  }
  if (status === 'revision_requested') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-orange-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-orange-700 ring-1 ring-orange-200">
        <Undo2 className="h-3 w-3" /> Changes requested
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-500 ring-1 ring-slate-200">
      <Lock className="h-3 w-3" /> Not submitted
    </span>
  );
}

function DeclarationBox({
  title,
  text,
  who,
  accepted,
  meta,
}: {
  title: string;
  text: string;
  who?: string;
  accepted: boolean;
  meta?: string;
}) {
  return (
    <div
      className={clsx(
        'rounded-lg border p-3 text-xs',
        accepted ? 'border-emerald-200 bg-white' : 'border-slate-200 bg-slate-50',
      )}
    >
      <div className="flex items-center gap-1.5">
        <ShieldCheck
          className={clsx('h-3.5 w-3.5', accepted ? 'text-emerald-500' : 'text-slate-400')}
        />
        <p className="text-[11px] font-bold uppercase tracking-wider text-slate-700">{title}</p>
        {meta && <span className="ml-auto text-[9px] text-slate-400">{meta}</span>}
      </div>
      <p className="mt-1.5 leading-relaxed text-slate-700">{text}</p>
      {who && (
        <p className="mt-2 rounded bg-slate-50 px-2 py-1 text-[11px] italic text-slate-600">
          “{who}”
        </p>
      )}
    </div>
  );
}

function SubmitDialog({
  enteredCount,
  requiredCount,
  submitting,
  onClose,
  onSubmit,
}: {
  enteredCount: number;
  requiredCount: number;
  submitting: boolean;
  onClose: () => void;
  onSubmit: (note: string) => void;
}) {
  const [declared, setDeclared] = useState(false);
  const [note, setNote] = useState('');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="submit-title"
        className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl"
      >
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500 text-white shadow-md">
              <Send className="h-5 w-5" />
            </div>
            <div>
              <h3 id="submit-title" className="text-lg font-bold text-slate-900">
                Submit data for review
              </h3>
              <p className="text-xs text-slate-500">
                {enteredCount} / {requiredCount} required indicators
              </p>
            </div>
          </div>
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <label className="mt-5 flex items-start gap-3 rounded-lg border border-emerald-200 bg-emerald-50/50 p-3 text-xs">
          <input
            type="checkbox"
            checked={declared}
            onChange={(e) => setDeclared(e.target.checked)}
            className="mt-0.5 h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
          />
          <span className="text-slate-700">{SUBMITTER_DECLARATION_TEXT}</span>
        </label>

        <label className="mt-4 block">
          <span className="text-xs font-medium text-slate-700">
            Note for the decision maker (optional)
          </span>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={3}
            maxLength={500}
            placeholder="e.g., some indicators used 2024 baseline where 2025 data was not yet available"
            className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
          />
        </label>

        <div className="mt-5 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => onSubmit(note)}
            disabled={!declared || submitting}
            className={clsx(
              'inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold shadow-sm transition',
              !declared || submitting
                ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                : 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white hover:opacity-90',
            )}
          >
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            {submitting ? 'Submitting…' : 'Confirm & submit'}
          </button>
        </div>
      </div>
    </div>
  );
}

function ApproveDialog({
  submission,
  approving,
  onClose,
  onApprove,
}: {
  submission: {
    submitter_note: string | null;
    submitted_at: string;
    entered_count: number | null;
    required_count: number | null;
  };
  approving: boolean;
  onClose: () => void;
  onApprove: (note: string) => void;
}) {
  const [reviewed, setReviewed] = useState(false);
  const [note, setNote] = useState('');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="approve-title"
        className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl"
      >
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-md">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <h3 id="approve-title" className="text-lg font-bold text-slate-900">
                Approve for calculation
              </h3>
              <p className="text-xs text-slate-500">
                {submission.entered_count ?? '—'} / {submission.required_count ?? '—'} indicators ·
                submitted {formatDate(submission.submitted_at)}
              </p>
            </div>
          </div>
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-5 rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
            Submitter’s declaration
          </p>
          <p className="mt-1 leading-relaxed text-slate-700">{SUBMITTER_DECLARATION_TEXT}</p>
          {submission.submitter_note && (
            <p className="mt-2 rounded bg-white px-2 py-1 text-[11px] italic text-slate-600">
              “{submission.submitter_note}”
            </p>
          )}
        </div>

        <label className="mt-4 flex items-start gap-3 rounded-lg border border-emerald-200 bg-emerald-50/50 p-3 text-xs">
          <input
            type="checkbox"
            checked={reviewed}
            onChange={(e) => setReviewed(e.target.checked)}
            className="mt-0.5 h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
          />
          <span className="text-slate-700">{APPROVER_DECLARATION_TEXT}</span>
        </label>

        <label className="mt-4 block">
          <span className="text-xs font-medium text-slate-700">
            Note (optional, visible on the report)
          </span>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={3}
            maxLength={500}
            placeholder="e.g., approved after clarification on ES_GI3 methodology"
            className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
          />
        </label>

        <div className="mt-5 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => onApprove(note)}
            disabled={!reviewed || approving}
            className={clsx(
              'inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold shadow-sm transition',
              !reviewed || approving
                ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                : 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white hover:opacity-90',
            )}
          >
            {approving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <ShieldCheck className="h-4 w-4" />
            )}
            {approving ? 'Approving…' : 'Approve for calculation'}
          </button>
        </div>
      </div>
    </div>
  );
}
