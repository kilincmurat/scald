'use client';

import { createBrowserClient } from '@supabase/ssr';
import { getMunicipalityById } from '@/lib/pilot-municipalities';
import { ROLE_LABELS, type Role } from '@/lib/roles';

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
// Activity log
//
// Data changes come from the database audit trail (migration 026): every
// value entered, changed or removed, every submission, approval and change
// request, and administrator changes — with who did them and when.
// History from before the trail was switched on is reconstructed from the
// tables' current rows, so values overwritten back then cannot be shown.
// ============================================================

export type LogEntryKind =
  | 'auth'
  | 'entry'
  | 'submission'
  | 'approval'
  | 'revision'
  | 'admin'
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
  // Origin metadata — populated for 'auth' (login) entries.
  ip?: string | null;
  device?: string | null;
  location?: string | null;
};

export type LogFilters = {
  kinds?: LogEntryKind[];
  municipalityId?: string | null;
  limit?: number;
};

const ENTRIES = 'scald_indicator_entries';
const SUBMISSIONS = 'scald_data_submissions';
const ADMIN_TABLES = [
  'profiles',
  'indicator_threshold_overrides',
  'category_weight_overrides',
  'municipalities',
  'universities',
];

type Values = Record<string, unknown> | null;

type AuditRow = {
  id: string;
  user_id: string | null;
  action: string;
  table_name: string;
  old_values: Values;
  new_values: Values;
  created_at: string;
};

type Described = Pick<LogEntry, 'kind' | 'target' | 'detail' | 'municipalityId'>;

const show = (v: unknown) => (v === null || v === undefined || v === '' ? '—' : String(v));

const verb = (action: string, inserted: string, updated: string, deleted: string) =>
  action === 'INSERT' ? inserted : action === 'DELETE' ? deleted : updated;

function changedKeys(o: Values, n: Values, ignore: string[] = []): string[] {
  if (!o || !n) return [];
  return Object.keys(n).filter(
    (k) => !ignore.includes(k) && JSON.stringify(o[k]) !== JSON.stringify(n[k]),
  );
}

const roleName = (v: unknown) => ROLE_LABELS[v as Role] ?? show(v);
const municipalityName = (v: unknown) =>
  v ? (getMunicipalityById(String(v))?.name ?? 'another municipality') : 'none';

/** Turns one audit_logs row into a log line. */
function describeAudit(r: AuditRow): Described {
  const o = r.old_values;
  const n = r.new_values;
  const v = n ?? o ?? {};
  const municipalityId = v.municipality_id ? String(v.municipality_id) : null;

  switch (r.table_name) {
    case ENTRIES: {
      const code = show(v.indicator_code);
      const year = `Year ${show(v.year)}`;
      if (r.action === 'INSERT') {
        return {
          kind: 'entry',
          municipalityId,
          target: `${code} = ${show(n?.raw_value)} (score ${show(n?.score)})`,
          detail: year,
        };
      }
      if (r.action === 'DELETE') {
        return {
          kind: 'entry',
          municipalityId,
          target: `${code} removed (was ${show(o?.raw_value)})`,
          detail: year,
        };
      }
      const value =
        o?.raw_value === n?.raw_value
          ? ` = ${show(n?.raw_value)}`
          : `: ${show(o?.raw_value)} → ${show(n?.raw_value)}`;
      const score =
        o?.score === n?.score ? show(n?.score) : `${show(o?.score)} → ${show(n?.score)}`;
      const other = changedKeys(o, n, ['raw_value', 'score', 'entered_by', 'indicator_code']);
      return {
        kind: 'entry',
        municipalityId,
        target: `${code}${value} (score ${score})`,
        detail: [
          year,
          o?.indicator_code !== n?.indicator_code ? `renamed from ${show(o?.indicator_code)}` : null,
          other.length ? `also changed: ${other.join(', ')}` : null,
        ]
          .filter(Boolean)
          .join(' · '),
      };
    }

    case SUBMISSIONS: {
      const year = show(v.year);
      const from = o?.status;
      const to = n?.status;
      if (r.action !== 'DELETE' && from !== to) {
        if (to === 'submitted') {
          return {
            kind: 'submission',
            municipalityId,
            target:
              from === 'revision_requested'
                ? `Resubmitted after changes — year ${year}`
                : `Data submitted for review — year ${year}`,
            detail: `${show(n?.entered_count)} / ${show(n?.required_count)} indicators`,
          };
        }
        if (to === 'approved') {
          return { kind: 'approval', municipalityId, target: `Approved year ${year}` };
        }
        if (to === 'revision_requested') {
          return {
            kind: 'revision',
            municipalityId,
            target: `Changes requested — year ${year}`,
            detail: n?.reviewer_note ? String(n.reviewer_note) : undefined,
          };
        }
      }
      return {
        kind: 'admin',
        municipalityId,
        target: `Submission record ${verb(r.action, 'created', 'edited', 'deleted')} — year ${year}`,
        detail:
          r.action === 'UPDATE'
            ? `Changed: ${changedKeys(o, n).join(', ')}`
            : `Status: ${show(v.status)}`,
      };
    }

    case 'profiles': {
      const who = show(v.email);
      if (r.action !== 'UPDATE') {
        return {
          kind: 'admin',
          municipalityId,
          target: `Account ${verb(r.action, 'created', 'changed', 'deleted')}: ${who}`,
          detail: `Role: ${roleName(v.role)}`,
        };
      }
      const changes = [
        o?.is_active !== n?.is_active ? (n?.is_active ? 'reactivated' : 'deactivated') : null,
        o?.role !== n?.role ? `role ${roleName(o?.role)} → ${roleName(n?.role)}` : null,
        o?.municipality_id !== n?.municipality_id
          ? `municipality ${municipalityName(o?.municipality_id)} → ${municipalityName(n?.municipality_id)}`
          : null,
        o?.university_id !== n?.university_id ? 'university changed' : null,
      ].filter(Boolean);
      return {
        kind: 'admin',
        municipalityId,
        target: `Account changed: ${who}`,
        detail: changes.join(' · ') || undefined,
      };
    }

    case 'indicator_threshold_overrides': {
      const levels = changedKeys(o, n)
        .filter((k) => k.startsWith('threshold_'))
        .map((k) => `${k.replace('threshold_', 'score ')}: ${show(o?.[k])} → ${show(n?.[k])}`);
      return {
        kind: 'admin',
        municipalityId: null,
        target: `Thresholds ${verb(r.action, 'customised', 'changed', 'reset to default')} — ${show(v.indicator_code)}`,
        detail: levels.length ? levels.join(' · ') : undefined,
      };
    }

    case 'category_weight_overrides':
      return {
        kind: 'admin',
        municipalityId: null,
        target: `Category weight ${verb(r.action, 'set', 'changed', 'reset to default')} — ${show(v.category_code)}`,
        detail:
          r.action === 'UPDATE' ? `${show(o?.weight)} → ${show(n?.weight)}` : `Weight: ${show(v.weight)}`,
      };

    case 'municipalities':
    case 'universities':
      return {
        kind: 'admin',
        municipalityId: r.table_name === 'municipalities' && v.id ? String(v.id) : null,
        target: `${r.table_name === 'municipalities' ? 'Municipality' : 'University'} ${verb(r.action, 'added', 'edited', 'removed')}: ${show(v.name_en ?? v.name)}`,
        detail: r.action === 'UPDATE' ? `Changed: ${changedKeys(o, n).join(', ')}` : undefined,
      };

    default:
      return {
        kind: 'admin',
        municipalityId,
        target: `${r.table_name}: ${r.action.toLowerCase()}`,
      };
  }
}

/**
 * Merges the audit trail, the reconstructed history from before it, feedback
 * and sign-ins into one list, newest first. RLS lets only admins read
 * across municipalities, and only admins can read audit_logs at all.
 */
export async function fetchActivityLog(filters: LogFilters = {}): Promise<LogEntry[]> {
  const supabase = client();
  const limit = filters.limit ?? 100;

  const wantsKind = (k: LogEntryKind) =>
    !filters.kinds || filters.kinds.length === 0 || filters.kinds.includes(k);
  const muniFilter = filters.municipalityId ?? null;

  const results: LogEntry[] = [];
  const actorIds = new Set<string>();

  const push = (row: Omit<LogEntry, 'actorEmail' | 'actorName' | 'actorRole'>) => {
    if (row.actorId) actorIds.add(row.actorId);
    results.push({ ...row, actorEmail: null, actorName: null, actorRole: null });
  };

  // When the audit trail starts for a table; the reconstruction only covers
  // what came before, so nothing is listed twice.
  const trailStart = async (table: string): Promise<string | null> => {
    const { data } = await supabase
      .from('audit_logs')
      .select('created_at')
      .eq('table_name', table)
      .order('created_at', { ascending: true })
      .limit(1);
    const first = (data ?? [])[0] as { created_at?: string } | undefined;
    return first?.created_at ?? null;
  };
  const before = (ts: unknown, start: string | null) =>
    !!ts && (!start || Date.parse(String(ts)) < Date.parse(start));

  const wantsSubmissions = (['submission', 'approval', 'revision'] as const).some(wantsKind);
  const auditTables = [
    ...(wantsKind('entry') ? [ENTRIES] : []),
    ...(wantsSubmissions || wantsKind('admin') ? [SUBMISSIONS] : []),
    ...(wantsKind('admin') ? ADMIN_TABLES : []),
  ];

  const [entriesStart, submissionsStart] = await Promise.all([
    trailStart(ENTRIES),
    trailStart(SUBMISSIONS),
  ]);

  // Audit trail
  if (auditTables.length > 0) {
    let q = supabase
      .from('audit_logs')
      .select('id, user_id, action, table_name, old_values, new_values, created_at')
      .in('table_name', auditTables)
      .order('created_at', { ascending: false })
      .limit(limit);
    if (muniFilter) {
      q = q.or(
        `new_values->>municipality_id.eq.${muniFilter},old_values->>municipality_id.eq.${muniFilter},record_id.eq.${muniFilter}`,
      );
    }
    const { data } = await q;
    for (const r of (data ?? []) as AuditRow[]) {
      const d = describeAudit(r);
      if (!wantsKind(d.kind)) continue;
      push({ id: `audit-${r.id}`, ts: r.created_at, actorId: r.user_id, ...d });
    }
  }

  // Entries from before the audit trail (latest value per indicator only)
  if (wantsKind('entry')) {
    let q = supabase
      .from(ENTRIES)
      .select('indicator_code, raw_value, score, year, updated_at, entered_by, municipality_id')
      .order('updated_at', { ascending: false })
      .limit(limit);
    if (muniFilter) q = q.eq('municipality_id', muniFilter);
    if (entriesStart) q = q.lt('updated_at', entriesStart);
    const { data } = await q;
    for (const r of (data ?? []) as Array<Record<string, unknown>>) {
      push({
        id: `entry-${r.indicator_code}-${r.municipality_id}-${r.year}-${r.updated_at}`,
        kind: 'entry',
        ts: String(r.updated_at),
        actorId: r.entered_by ? String(r.entered_by) : null,
        municipalityId: r.municipality_id ? String(r.municipality_id) : null,
        target: `${r.indicator_code} = ${r.raw_value ?? '—'} (score ${r.score})`,
        detail: `Year ${r.year}`,
      });
    }
  }

  // Submissions and reviews from before the audit trail (latest round only)
  if (wantsSubmissions) {
    let q = supabase
      .from(SUBMISSIONS)
      .select(
        'id, status, year, submitted_by, submitted_at, reviewed_by, reviewed_at, reviewer_note, entered_count, required_count, municipality_id',
      )
      .order('updated_at', { ascending: false })
      .limit(limit);
    if (muniFilter) q = q.eq('municipality_id', muniFilter);
    const { data } = await q;
    for (const r of (data ?? []) as Array<Record<string, unknown>>) {
      const municipalityId = r.municipality_id ? String(r.municipality_id) : null;
      if (r.submitted_by && wantsKind('submission') && before(r.submitted_at, submissionsStart)) {
        push({
          id: `submitted-${r.id}`,
          kind: 'submission',
          ts: String(r.submitted_at),
          actorId: String(r.submitted_by),
          municipalityId,
          target: `Data submitted for review — year ${r.year}`,
          detail: `${r.entered_count ?? '—'} / ${r.required_count ?? '—'} indicators`,
        });
      }
      // A review that did not end in approval was a request for changes.
      const kind = r.status === 'approved' ? 'approval' : 'revision';
      if (r.reviewed_by && wantsKind(kind) && before(r.reviewed_at, submissionsStart)) {
        push({
          id: `reviewed-${r.id}`,
          kind,
          ts: String(r.reviewed_at),
          actorId: String(r.reviewed_by),
          municipalityId,
          target:
            kind === 'approval' ? `Approved year ${r.year}` : `Changes requested — year ${r.year}`,
          detail: kind === 'revision' && r.reviewer_note ? String(r.reviewer_note) : undefined,
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
      const municipalityId = r.municipality_id ? String(r.municipality_id) : null;
      if (wantsKind('feedback_new')) {
        push({
          id: `fb-new-${r.id}`,
          kind: 'feedback_new',
          ts: String(r.created_at),
          actorId: r.user_id ? String(r.user_id) : null,
          municipalityId,
          target: `New feedback: ${String(r.subject ?? '(no subject)').slice(0, 60)}`,
        });
      }
      if (r.response && r.responded_at && wantsKind('feedback_response')) {
        push({
          id: `fb-resp-${r.id}`,
          kind: 'feedback_response',
          ts: String(r.responded_at),
          actorId: r.responded_by ? String(r.responded_by) : null,
          municipalityId,
          target: `Responded: ${String(r.subject ?? '').slice(0, 40)}`,
          detail: r.status ? `Status: ${r.status}` : undefined,
        });
      }
    }
  }

  // Auth / login events (real audit_logs rows with IP + device + timezone).
  // audit_logs has no municipality column, so only surface these in the
  // "all municipalities" view.
  if (wantsKind('auth') && !muniFilter) {
    const { data } = await supabase
      .from('audit_logs')
      .select('id, user_id, action, ip_address, user_agent, new_values, created_at')
      .eq('action', 'LOGIN')
      .order('created_at', { ascending: false })
      .limit(limit);
    for (const r of (data ?? []) as Array<Record<string, unknown>>) {
      const nv = (r.new_values ?? {}) as Record<string, unknown>;
      push({
        id: `auth-${r.id}`,
        kind: 'auth',
        ts: String(r.created_at),
        actorId: r.user_id ? String(r.user_id) : null,
        municipalityId: null,
        target: 'Signed in',
        ip: r.ip_address ? String(r.ip_address) : null,
        device: nv.device ? String(nv.device) : null,
        location: nv.timezone ? String(nv.timezone) : null,
      });
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

  results.sort((a, b) => Date.parse(b.ts) - Date.parse(a.ts));
  return results.slice(0, limit);
}
