'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { createBrowserClient } from '@supabase/ssr';
import { PILOT_MUNICIPALITIES, getPilotById } from '@/lib/pilot-municipalities';
import { ROLE_LABELS, ROLE_BADGE_COLOR, type Role } from '@/lib/roles';
import {
  ArrowLeft,
  Search,
  Loader2,
  X,
  Save,
  AlertCircle,
  UserCircle2,
  Power,
  Plus,
  Trash2,
  UserPlus,
} from 'lucide-react';
import { clsx } from 'clsx';

type ProfileRow = {
  id: string;
  email: string;
  full_name: string | null;
  role: Role;
  municipality_id: string | null;
  is_active: boolean;
  created_at: string;
};

function client() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}

export function UsersAdmin() {
  const [rows, setRows] = useState<ProfileRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | Role>('all');
  const [editing, setEditing] = useState<ProfileRow | null>(null);
  const [inviting, setInviting] = useState(false);
  const [deleting, setDeleting] = useState<ProfileRow | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const supabase = client();
      const { data } = await supabase
        .from('profiles')
        .select('id, email, full_name, role, municipality_id, is_active, created_at')
        .order('created_at', { ascending: false });
      setRows(((data as ProfileRow[] | null) ?? []).map((p) => ({
        ...p,
        role: (p.role as Role) ?? 'data_entry',
      })));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (roleFilter !== 'all' && r.role !== roleFilter) return false;
      if (q.trim() === '') return true;
      const s = q.trim().toLowerCase();
      return (
        r.email.toLowerCase().includes(s) ||
        (r.full_name ?? '').toLowerCase().includes(s)
      );
    });
  }, [rows, q, roleFilter]);

  const counts = useMemo(() => {
    const c: Record<Role, number> = { admin: 0, data_entry: 0, decision_maker: 0, citizen: 0, researcher: 0 };
    for (const r of rows) c[r.role] = (c[r.role] ?? 0) + 1;
    return c;
  }, [rows]);

  return (
    <div className="p-4 lg:p-6 space-y-5">
      <div className="flex items-center justify-between gap-3">
        <Link href="/admin" className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-700">
          <ArrowLeft className="h-4 w-4" /> Admin panel
        </Link>
        <button
          onClick={() => setInviting(true)}
          className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white transition hover:bg-slate-800"
        >
          <UserPlus className="h-3.5 w-3.5" />
          Invite user
        </button>
      </div>

      {/* Counts */}
      <section className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        {(['admin', 'decision_maker', 'data_entry', 'researcher', 'citizen'] as Role[]).map((r) => (
          <div key={r} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <span className={clsx('inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 ring-inset', ROLE_BADGE_COLOR[r])}>
              {ROLE_LABELS[r]}
            </span>
            <p className="mt-2 text-3xl font-bold text-slate-900">{counts[r]}</p>
            <p className="text-[10px] text-slate-400">total accounts</p>
          </div>
        ))}
      </section>

      {/* Filter */}
      <section className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm lg:flex-row lg:items-center lg:justify-between">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search email or name…"
            className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-sm text-slate-900 outline-none focus:border-slate-400 focus:bg-white focus:ring-2 focus:ring-slate-200"
          />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {(['all', 'admin', 'decision_maker', 'data_entry', 'researcher', 'citizen'] as const).map((r) => (
            <button
              key={r}
              onClick={() => setRoleFilter(r)}
              className={clsx(
                'rounded-full px-2.5 py-1 text-[11px] font-medium transition',
                roleFilter === r ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200',
              )}
            >
              {r === 'all' ? 'All roles' : ROLE_LABELS[r]}
            </button>
          ))}
        </div>
      </section>

      {/* Table */}
      <section className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16 text-sm text-slate-500">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Loading users…
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-slate-50 text-slate-500">
                <tr>
                  <th className="px-4 py-2 text-left font-medium">User</th>
                  <th className="hidden px-4 py-2 text-left font-medium sm:table-cell">Role</th>
                  <th className="hidden px-4 py-2 text-left font-medium lg:table-cell">Municipality</th>
                  <th className="px-4 py-2 text-right font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-slate-400">
                      No users match this filter.
                    </td>
                  </tr>
                ) : (
                  filtered.map((r) => {
                    const m = getPilotById(r.municipality_id);
                    return (
                      <tr
                        key={r.id}
                        onClick={() => setEditing(r)}
                        className="cursor-pointer border-b border-slate-50 last:border-b-0 transition hover:bg-slate-50"
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2.5">
                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100">
                              <UserCircle2 className="h-4 w-4 text-slate-500" />
                            </div>
                            <div className="min-w-0">
                              <p className="truncate text-xs font-medium text-slate-800">
                                {r.full_name || <span className="text-slate-400">Unnamed</span>}
                              </p>
                              <p className="truncate text-[10px] text-slate-500">{r.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="hidden px-4 py-3 sm:table-cell">
                          <span className={clsx('rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 ring-inset', ROLE_BADGE_COLOR[r.role])}>
                            {ROLE_LABELS[r.role]}
                          </span>
                        </td>
                        <td className="hidden px-4 py-3 lg:table-cell">
                          {m ? (
                            <span className="inline-flex items-center gap-1.5 text-slate-700">
                              <span>{m.flag}</span>
                              {m.name}
                            </span>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {r.is_active ? (
                              <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                                active
                              </span>
                            ) : (
                              <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
                                disabled
                              </span>
                            )}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setDeleting(r);
                              }}
                              className="rounded-lg p-1.5 text-slate-400 transition hover:bg-red-50 hover:text-red-600"
                              title="Delete user"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {editing && (
        <EditUserModal
          row={editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            void load();
          }}
        />
      )}

      {inviting && (
        <InviteUserModal
          onClose={() => setInviting(false)}
          onCreated={() => {
            setInviting(false);
            void load();
          }}
        />
      )}

      {deleting && (
        <DeleteUserModal
          row={deleting}
          onClose={() => setDeleting(null)}
          onDeleted={() => {
            setDeleting(null);
            void load();
          }}
        />
      )}
    </div>
  );
}

function InviteUserModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState<Role>('data_entry');
  const [municipalityId, setMunicipalityId] = useState<string>(PILOT_MUNICIPALITIES[0]?.id ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          email: email.trim(),
          password,
          full_name: fullName.trim(),
          role,
          municipality_id: role === 'admin' || role === 'researcher' ? null : municipalityId,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Failed');
      onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
      <div className="flex max-h-[92vh] w-full max-w-md flex-col rounded-2xl border border-slate-200 bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3">
          <h3 className="text-sm font-semibold text-slate-900">Invite user</h3>
          <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-5 space-y-3">
          <div>
            <label className="mb-1 block text-[11px] font-semibold text-slate-600">Email <span className="text-red-500">*</span></label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="user@example.com"
              className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-slate-400 focus:bg-white focus:ring-2 focus:ring-slate-200"
            />
          </div>
          <div>
            <label className="mb-1 block text-[11px] font-semibold text-slate-600">
              Initial password <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 8 characters"
              className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-slate-400 focus:bg-white focus:ring-2 focus:ring-slate-200"
            />
            <p className="mt-1 text-[10px] text-slate-400">
              Share this password with the user securely. They can change it after signing in.
            </p>
          </div>
          <div>
            <label className="mb-1 block text-[11px] font-semibold text-slate-600">Full name</label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-slate-400 focus:bg-white focus:ring-2 focus:ring-slate-200"
            />
          </div>
          <div>
            <label className="mb-1 block text-[11px] font-semibold text-slate-600">Role</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as Role)}
              className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-slate-400 focus:bg-white focus:ring-2 focus:ring-slate-200"
            >
              {(['admin', 'decision_maker', 'data_entry', 'researcher', 'citizen'] as Role[]).map((r) => (
                <option key={r} value={r}>
                  {ROLE_LABELS[r]}
                </option>
              ))}
            </select>
          </div>
          {role !== 'admin' && role !== 'researcher' && (
            <div>
              <label className="mb-1 block text-[11px] font-semibold text-slate-600">Municipality</label>
              <select
                value={municipalityId}
                onChange={(e) => setMunicipalityId(e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-slate-400 focus:bg-white focus:ring-2 focus:ring-slate-200"
              >
                {PILOT_MUNICIPALITIES.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.flag} {m.name} · {m.country}
                  </option>
                ))}
              </select>
            </div>
          )}

          {error && (
            <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
              <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
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
            onClick={submit}
            disabled={busy || !email.trim() || password.length < 8}
            className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white transition hover:bg-slate-800 disabled:opacity-50"
          >
            {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
            Create user
          </button>
        </div>
      </div>
    </div>
  );
}

function DeleteUserModal({
  row,
  onClose,
  onDeleted,
}: {
  row: ProfileRow;
  onClose: () => void;
  onDeleted: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmText, setConfirmText] = useState('');

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/users?id=${encodeURIComponent(row.id)}`, {
        method: 'DELETE',
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error ?? 'Delete failed');
      onDeleted();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-50 text-red-600">
            <Trash2 className="h-5 w-5" />
          </div>
          <h3 className="text-base font-bold text-slate-900">Delete user?</h3>
        </div>
        <p className="mt-3 text-sm text-slate-600">
          <span className="font-semibold">{row.email}</span> will be permanently removed
          from Supabase Auth. Any data-entry rows they created will remain (attributed to
          the municipality, entered_by → null).
        </p>
        <div className="mt-4">
          <label className="mb-1 block text-[11px] font-semibold text-slate-600">
            Type <code className="rounded bg-slate-100 px-1">delete</code> to confirm
          </label>
          <input
            type="text"
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-red-400 focus:bg-white focus:ring-2 focus:ring-red-500/20"
          />
        </div>
        {error && (
          <div className="mt-3 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
            <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            {error}
          </div>
        )}
        <div className="mt-5 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-slate-600 transition hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            onClick={submit}
            disabled={busy || confirmText !== 'delete'}
            className={clsx(
              'inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold text-white transition',
              confirmText === 'delete' && !busy
                ? 'bg-red-600 hover:bg-red-700'
                : 'cursor-not-allowed bg-slate-300',
            )}
          >
            {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
            Delete permanently
          </button>
        </div>
      </div>
    </div>
  );
}

function EditUserModal({
  row,
  onClose,
  onSaved,
}: {
  row: ProfileRow;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [role, setRole] = useState<Role>(row.role);
  const [municipalityId, setMunicipalityId] = useState<string>(row.municipality_id ?? '');
  const [fullName, setFullName] = useState(row.full_name ?? '');
  const [isActive, setIsActive] = useState(row.is_active);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = async () => {
    setBusy(true);
    setError(null);
    try {
      const supabase = client();
      const { error: err } = await supabase
        .from('profiles')
        .update({
          role,
          municipality_id: municipalityId || null,
          full_name: fullName.trim() || null,
          is_active: isActive,
        })
        .eq('id', row.id);
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
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3">
          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-slate-900">Edit user</h3>
            <p className="truncate text-[10px] text-slate-500">{row.email}</p>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-4 p-5">
          <div>
            <label className="mb-1 block text-[11px] font-semibold text-slate-600">Full name</label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-slate-400 focus:bg-white focus:ring-2 focus:ring-slate-200"
            />
          </div>

          <div>
            <label className="mb-1 block text-[11px] font-semibold text-slate-600">Role</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as Role)}
              className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-slate-400 focus:bg-white focus:ring-2 focus:ring-slate-200"
            >
              {(['admin', 'decision_maker', 'data_entry', 'researcher', 'citizen'] as Role[]).map((r) => (
                <option key={r} value={r}>
                  {ROLE_LABELS[r]}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-[11px] font-semibold text-slate-600">Municipality</label>
            <select
              value={municipalityId}
              onChange={(e) => setMunicipalityId(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-slate-400 focus:bg-white focus:ring-2 focus:ring-slate-200"
            >
              <option value="">— None (admin only) —</option>
              {PILOT_MUNICIPALITIES.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.flag} {m.name} · {m.country}
                </option>
              ))}
            </select>
            <p className="mt-1 text-[10px] text-slate-400">
              Data entry / decision maker / citizen roles require a municipality.
            </p>
          </div>

          <label className="flex cursor-pointer items-center justify-between rounded-lg border border-slate-200 px-3 py-2">
            <span className="inline-flex items-center gap-2 text-xs font-medium text-slate-700">
              <Power className="h-3.5 w-3.5 text-slate-400" />
              Account active
            </span>
            <input
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
            />
          </label>

          {error && (
            <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
              <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
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
            {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
