'use client';

import Link from 'next/link';
import { Clock, ShieldAlert, Undo2, ArrowRight } from 'lucide-react';
import type { SubmissionStatus } from '@/lib/data-submission-service';

/**
 * Shown on result screens (Overview, Ecological Footprint) when the selected
 * year's data has NOT yet been approved/calculated. The sustainability score is
 * only official once the decision maker approves it — until then no scores are
 * shown, so a decision maker never sees a computed profile "appear" the moment
 * data entry submits. Admins bypass this gate (they can inspect live data).
 */
export function CalculationPending({
  status,
  canApprove,
  year,
}: {
  status: SubmissionStatus | null | undefined;
  canApprove: boolean;
  year: number;
}) {
  const view =
    status === 'submitted'
      ? {
          Icon: Clock,
          title: 'Awaiting approval & calculation',
          body: canApprove
            ? `The ${year} data has been submitted for review. Review the declarations and approve it to calculate the official sustainability score and ecological footprint.`
            : `The ${year} data has been submitted and is waiting for the decision maker to approve and calculate it.`,
          cta: canApprove ? { href: '/data-entry', label: 'Review & approve' } : null,
        }
      : status === 'revision_requested'
        ? {
            Icon: Undo2,
            title: 'Changes requested',
            body: `This year was sent back for revision. The score becomes available once the data is corrected, resubmitted and approved.`,
            cta: { href: '/data-entry', label: 'Go to data entry' },
          }
        : {
            Icon: ShieldAlert,
            title: 'Not yet calculated',
            body: `The ${year} data has not been submitted and approved yet. The sustainability score and ecological footprint appear here once the decision maker approves and calculates them.`,
            cta: { href: '/data-entry', label: 'Go to data entry' },
          };

  const { Icon } = view;

  return (
    <div className="mx-auto max-w-xl rounded-2xl border border-amber-200 bg-amber-50/60 p-8 text-center shadow-sm">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-100 text-amber-600">
        <Icon className="h-7 w-7" />
      </div>
      <h2 className="mt-4 text-lg font-bold text-slate-900">{view.title}</h2>
      <p className="mx-auto mt-2 max-w-md text-sm text-slate-600">{view.body}</p>
      {view.cta && (
        <Link
          href={view.cta.href}
          className="mt-5 inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
        >
          {view.cta.label} <ArrowRight className="h-4 w-4" />
        </Link>
      )}
    </div>
  );
}
