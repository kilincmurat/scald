'use client';

import { createBrowserClient } from '@supabase/ssr';

function client() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}

export type HealthSnapshot = {
  timestamp: string;
  db: {
    reachable: boolean;
    responseMs: number | null;
    error?: string;
  };
  auth: {
    authenticated: boolean;
    error?: string;
  };
  counts: {
    profiles: number | null;
    entries: number | null;
    submissions: number | null;
    feedback: number | null;
    municipalities: number | null;
    weights: number | null;
  };
  activity: {
    lastEntry: string | null;
    lastSubmission: string | null;
    lastFeedback: string | null;
  };
};

/** Run a live health probe. Every count is a HEAD request (no rows fetched). */
export async function fetchHealthSnapshot(): Promise<HealthSnapshot> {
  const supabase = client();
  const t0 = performance.now();
  let dbReachable = false;
  let dbError: string | undefined;

  try {
    // Cheap round-trip: HEAD-style count on a small table.
    const { error } = await supabase
      .from('municipalities')
      .select('id', { count: 'exact', head: true });
    if (error) throw error;
    dbReachable = true;
  } catch (err) {
    dbError = err instanceof Error ? err.message : 'unknown error';
  }
  const dbResponseMs = Math.round(performance.now() - t0);

  let authenticated = false;
  let authError: string | undefined;
  try {
    const { data, error } = await supabase.auth.getUser();
    if (error) throw error;
    authenticated = !!data.user;
  } catch (err) {
    authError = err instanceof Error ? err.message : 'unknown error';
  }

  // Parallel counts
  const countOf = async (table: string): Promise<number | null> => {
    try {
      const { count, error } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: true });
      if (error) return null;
      return count ?? 0;
    } catch {
      return null;
    }
  };

  const lastTs = async (table: string, column: string): Promise<string | null> => {
    try {
      const { data, error } = await supabase
        .from(table)
        .select(column)
        .order(column, { ascending: false })
        .limit(1);
      if (error || !data || data.length === 0) return null;
      return (data[0] as unknown as Record<string, string>)[column] ?? null;
    } catch {
      return null;
    }
  };

  const [
    profiles,
    entries,
    submissions,
    feedbackCount,
    municipalitiesCount,
    weights,
    lastEntry,
    lastSubmission,
    lastFeedback,
  ] = await Promise.all([
    countOf('profiles'),
    countOf('scald_indicator_entries'),
    countOf('scald_data_submissions'),
    countOf('feedback'),
    countOf('municipalities'),
    countOf('category_weight_overrides'),
    lastTs('scald_indicator_entries', 'updated_at'),
    lastTs('scald_data_submissions', 'updated_at'),
    lastTs('feedback', 'created_at'),
  ]);

  return {
    timestamp: new Date().toISOString(),
    db: { reachable: dbReachable, responseMs: dbResponseMs, error: dbError },
    auth: { authenticated, error: authError },
    counts: {
      profiles,
      entries,
      submissions,
      feedback: feedbackCount,
      municipalities: municipalitiesCount,
      weights,
    },
    activity: {
      lastEntry,
      lastSubmission,
      lastFeedback,
    },
  };
}

// ============================================================
// Activity log (aggregated from existing tables)
// ============================================================

export type LogEntryKind =
  | 'entry'
  | 'submission'
  | 'approval'
  | 'feedback_new'
  | 'feedback_response'
  | 'category_complete'
  | 'set_badge';

export type LogEntry = {
  id: string;
  kind: LogEntryKind;
  ts: string;
  actorId: string | null;
  actorEmail: string | null;
  actorName: string | null;
  actorRole: string | null;
  municipalityId: string | null;
  target: string; // human-readable target descriptor
  detail?: string;
};

export type LogFilters = {
  kinds?: LogEntryKind[];
  municipalityId?: string | null;
  limit?: number;
};

/**
 * Aggregates recent activity across submission, entry, feedback tables.
 * Uses one query per source then merges by timestamp.
 * RLS ensures admins can read across all municipalities.
 */
export async function fetchActivityLog(filters: LogFilters = {}): Promise<LogEntry[]> {
  const supabase = client();
  const limit = filters.limit ?? 100;

  const wantsKind = (k: LogEntryKind) =>
    !filters.kinds || filters.kinds.length === 0 || filters.kinds.includes(k);
  const muniFilter = filters.municipalityId ?? null;

  const results: LogEntry[] = [];
  const actorIds = new Set<string>();

  // Entries
  if (wantsKind('entry')) {
    let q = supabase
      .from('scald_indicator_entries')
      .select('indicator_code, raw_value, score, year, updated_at, entered_by, municipality_id')
      .order('updated_at', { ascending: false })
      .limit(limit);
    if (muniFilter) q = q.eq('municipality_id', muniFilter);
    const { data } = await q;
    for (const r of (data ?? []) as Array<Record<string, unknown>>) {
      if (r.entered_by) actorIds.add(String(r.entered_by));
      results.push({
        id: `entry-${r.indicator_code}-${r.municipality_id}-${r.year}-${r.updated_at}`,
        kind: 'entry',
        ts: String(r.updated_at),
        actorId: r.entered_by ? String(r.entered_by) : null,
        actorEmail: null,
        actorName: null,
        actorRole: null,
        municipalityId: r.municipality_id ? String(r.municipality_id) : null,
        target: `${r.indicator_code} = ${r.raw_value ?? '—'} (score ${r.score})`,
        detail: `Year ${r.year}`,
      });
    }
  }

  // Submissions + approvals (single table, two kinds of rows)
  if (wantsKind('submission') || wantsKind('approval')) {
    let q = supabase
      .from('scald_data_submissions')
      .select(
        'id, status, year, submitted_by, submitted_at, reviewed_by, reviewed_at, entered_count, required_count, municipality_id',
      )
      .order('updated_at', { ascending: false })
      .limit(limit);
    if (muniFilter) q = q.eq('municipality_id', muniFilter);
    const { data } = await q;
    for (const r of (data ?? []) as Array<Record<string, unknown>>) {
      if (r.submitted_by && wantsKind('submission')) {
        actorIds.add(String(r.submitted_by));
        results.push({
          id: `submitted-${r.id}`,
          kind: 'submission',
          ts: String(r.submitted_at),
          actorId: String(r.submitted_by),
          actorEmail: null,
          actorName: null,
          actorRole: null,
          municipalityId: r.municipality_id ? String(r.municipality_id) : null,
          target: `Data submitted for review — year ${r.year}`,
          detail: `${r.entered_count ?? '—'} / ${r.required_count ?? '—'} indicators`,
        });
      }
      if (r.reviewed_by && r.reviewed_at && wantsKind('approval')) {
        actorIds.add(String(r.reviewed_by));
        results.push({
          id: `approved-${r.id}`,
          kind: 'approval',
          ts: String(r.reviewed_at),
          actorId: String(r.reviewed_by),
          actorEmail: null,
          actorName: null,
          actorRole: null,
          municipalityId: r.municipality_id ? String(r.municipality_id) : null,
          target: `${r.status === 'approved' ? 'Approved' : 'Reviewed'} year ${r.year}`,
        });
      }
    }
  }

  // Feedback (new + responses)
  if (wantsKind('feedback_new') || wantsKind('feedback_response')) {
    let q = supabase
      .from('feedback')
      .select(
        'id, user_id, subject, message, status, response, responded_at, responded_by, created_at, municipality_id',
      )
      .order('created_at', { ascending: false })
      .limit(limit);
    if (muniFilter) q = q.eq('municipality_id', muniFilter);
    const { data } = await q;
    for (const r of (data ?? []) as Array<Record<string, unknown>>) {
      if (wantsKind('feedback_new')) {
        if (r.user_id) actorIds.add(String(r.user_id));
        results.push({
          id: `fb-new-${r.id}`,
          kind: 'feedback_new',
          ts: String(r.created_at),
          actorId: r.user_id ? String(r.user_id) : null,
          actorEmail: null,
          actorName: null,
          actorRole: null,
          municipalityId: r.municipality_id ? String(r.municipality_id) : null,
          target: `New feedback: ${String(r.subject ?? '(no subject)').slice(0, 60)}`,
        });
      }
      if (r.response && r.responded_at && wantsKind('feedback_response')) {
        if (r.responded_by) actorIds.add(String(r.responded_by));
        results.push({
          id: `fb-resp-${r.id}`,
          kind: 'feedback_response',
          ts: String(r.responded_at),
          actorId: r.responded_by ? String(r.responded_by) : null,
          actorEmail: null,
          actorName: null,
          actorRole: null,
          municipalityId: r.municipality_id ? String(r.municipality_id) : null,
          target: `Responded: ${String(r.subject ?? '').slice(0, 40)}`,
          detail: r.status ? `Status: ${r.status}` : undefined,
        });
      }
    }
  }

  // Enrich with actor profile info
  if (actorIds.size > 0) {
    const { data: profs } = await supabase
      .from('profiles')
      .select('id, email, full_name, role')
      .in('id', Array.from(actorIds));
    const byId = new Map<string, { email: string; full_name: string | null; role: string }>();
    for (const p of (profs ?? []) as Array<Record<string, unknown>>) {
      byId.set(String(p.id), {
        email: String(p.email ?? ''),
        full_name: p.full_name ? String(p.full_name) : null,
        role: String(p.role ?? ''),
      });
    }
    for (const row of results) {
      if (!row.actorId) continue;
      const p = byId.get(row.actorId);
      if (p) {
        row.actorEmail = p.email;
        row.actorName = p.full_name;
        row.actorRole = p.role;
      }
    }
  }

  results.sort((a, b) => (a.ts < b.ts ? 1 : -1));
  return results.slice(0, limit);
}
