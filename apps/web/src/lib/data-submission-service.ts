'use client';

import { createBrowserClient } from '@supabase/ssr';

export type SubmissionStatus = 'submitted' | 'approved';

export type SubmissionRow = {
  id: string;
  municipality_id: string;
  year: number;
  status: SubmissionStatus;

  submitted_by: string | null;
  submitted_at: string;
  submitter_declaration: boolean;
  submitter_note: string | null;
  entered_count: number | null;
  required_count: number | null;

  reviewed_by: string | null;
  reviewed_at: string | null;
  approval_declaration: boolean;
  reviewer_note: string | null;

  created_at: string;
  updated_at: string;
};

function client() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}

export async function fetchSubmission(
  municipalityId: string,
  year: number,
): Promise<SubmissionRow | null> {
  if (!municipalityId) return null;
  try {
    const supabase = client();
    const { data } = await supabase
      .from('scald_data_submissions')
      .select('*')
      .eq('municipality_id', municipalityId)
      .eq('year', year)
      .maybeSingle();
    return (data as SubmissionRow | null) ?? null;
  } catch {
    return null;
  }
}

/**
 * Data entry personnel submits the year's data.
 * Upserts a row with status='submitted' and submitter_declaration=true.
 * If a previous submission exists (already approved), this will fail via RLS
 * intentionally — approved data can only be reset by admin.
 */
export async function submitData(params: {
  municipalityId: string;
  year: number;
  submitterNote?: string;
  enteredCount: number;
  requiredCount: number;
}): Promise<{ error: string | null; row: SubmissionRow | null }> {
  try {
    const supabase = client();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: 'Not signed in.', row: null };

    const payload = {
      municipality_id: params.municipalityId,
      year: params.year,
      status: 'submitted' as SubmissionStatus,
      submitted_by: user.id,
      submitted_at: new Date().toISOString(),
      submitter_declaration: true,
      submitter_note: params.submitterNote?.trim() || null,
      entered_count: params.enteredCount,
      required_count: params.requiredCount,
      // Clear any previous review fields on resubmission
      reviewed_by: null,
      reviewed_at: null,
      approval_declaration: false,
      reviewer_note: null,
    };

    const { data, error } = await supabase
      .from('scald_data_submissions')
      .upsert(payload, { onConflict: 'municipality_id,year' })
      .select('*')
      .maybeSingle();

    if (error) return { error: error.message, row: null };
    return { error: null, row: (data as SubmissionRow | null) ?? null };
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : 'Submission failed.',
      row: null,
    };
  }
}

/**
 * Decision maker approves the submission for a given year.
 * Requires an existing row with status='submitted'.
 */
export async function approveSubmission(params: {
  submissionId: string;
  reviewerNote?: string;
}): Promise<{ error: string | null; row: SubmissionRow | null }> {
  try {
    const supabase = client();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: 'Not signed in.', row: null };

    const { data, error } = await supabase
      .from('scald_data_submissions')
      .update({
        status: 'approved' as SubmissionStatus,
        reviewed_by: user.id,
        reviewed_at: new Date().toISOString(),
        approval_declaration: true,
        reviewer_note: params.reviewerNote?.trim() || null,
      })
      .eq('id', params.submissionId)
      .select('*')
      .maybeSingle();

    if (error) return { error: error.message, row: null };
    return { error: null, row: (data as SubmissionRow | null) ?? null };
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : 'Approval failed.',
      row: null,
    };
  }
}
