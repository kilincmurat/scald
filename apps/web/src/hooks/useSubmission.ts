'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  approveSubmission,
  requestRevision,
  fetchSubmission,
  submitData,
  isSubmissionLocked,
  type SubmissionRow,
} from '@/lib/data-submission-service';

/**
 * Loads the current (municipality, year) submission row and exposes
 * submit/approve mutations. Callers pass null municipalityId while profile
 * is loading — the hook idles until it's ready.
 */
export function useSubmission(municipalityId: string | null, year: number) {
  const [submission, setSubmission] = useState<SubmissionRow | null>(null);
  // Starts true: the hook always fetches on mount, so consumers that gate on the
  // approval status (e.g. Overview/EFCT) can show a skeleton until it's known
  // instead of briefly flashing a "not approved" state for approved data.
  const [loading, setLoading] = useState(true);
  const [mutating, setMutating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!municipalityId) {
      setSubmission(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const row = await fetchSubmission(municipalityId, year);
      setSubmission(row);
    } finally {
      setLoading(false);
    }
  }, [municipalityId, year]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const submit = useCallback(
    async (args: { submitterNote?: string; enteredCount: number; requiredCount: number }) => {
      if (!municipalityId) return { ok: false as const };
      setMutating(true);
      setError(null);
      try {
        const { error: err, row } = await submitData({
          municipalityId,
          year,
          ...args,
        });
        if (err) {
          setError(err);
          return { ok: false as const, error: err };
        }
        setSubmission(row);
        return { ok: true as const, row };
      } finally {
        setMutating(false);
      }
    },
    [municipalityId, year],
  );

  const approve = useCallback(
    async (args: { reviewerNote?: string }) => {
      if (!submission) return { ok: false as const };
      setMutating(true);
      setError(null);
      try {
        const { error: err, row } = await approveSubmission({
          submissionId: submission.id,
          reviewerNote: args.reviewerNote,
        });
        if (err) {
          setError(err);
          return { ok: false as const, error: err };
        }
        setSubmission(row);
        return { ok: true as const, row };
      } finally {
        setMutating(false);
      }
    },
    [submission],
  );

  const askRevision = useCallback(
    async (args: { reviewerNote: string }) => {
      if (!submission) return { ok: false as const };
      setMutating(true);
      setError(null);
      try {
        const { error: err, row } = await requestRevision({
          submissionId: submission.id,
          reviewerNote: args.reviewerNote,
        });
        if (err) {
          setError(err);
          return { ok: false as const, error: err };
        }
        setSubmission(row);
        return { ok: true as const, row };
      } finally {
        setMutating(false);
      }
    },
    [submission],
  );

  const locked = isSubmissionLocked(submission?.status);

  return { submission, loading, mutating, error, locked, refresh, submit, approve, askRevision };
}
