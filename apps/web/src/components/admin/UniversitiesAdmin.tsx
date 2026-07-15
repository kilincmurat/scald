'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import {
  fetchUniversities,
  createUniversity,
  updateUniversity,
  deleteUniversity,
  universityFlag,
  type University,
} from '@/lib/universities-service';
import {
  ArrowLeft,
  Loader2,
  GraduationCap,
  Users2,
  Globe,
  Plus,
  Pencil,
  Trash2,
  X,
  Save,
  AlertCircle,
} from 'lucide-react';
import { clsx } from 'clsx';

export function UniversitiesAdmin() {
  const [rows, setRows] = useState<University[]>([]);
  const [researcherCounts, setResearcherCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<University | 'new' | null>(null);
  const [deleting, setDeleting] = useState<University | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const list = await fetchUniversities();
      setRows(list);

      const supabase = createClient();
      const results = await Promise.all(
        list.map(async (u) => {
          const { count } = await supabase
            .from('profiles')
            .select('id', { count: 'exact', head: true })
            .eq('university_id', u.id)
            .eq('role', 'researcher');
          return [u.id, count ?? 0] as const;
        }),
      );
      setResearcherCounts(Object.fromEntries(results));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load universities.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  return (
    <div className="p-4 lg:p-6 space-y-5">
      <div className="flex items-center justify-between gap-3">
        <Link href="/admin" className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-700">
          <ArrowLeft className="h-4 w-4" /> Admin panel
        </Link>
        <button
          onClick={() => setEditing('new')}
          className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white transition hover:bg-slate-800"
        >
          <Plus className="h-3.5 w-3.5" />
          Add university
        </button>
      </div>

      <p className="text-xs text-slate-500">
        Universities are the institutions that <span className="font-semibold text-slate-700">researchers</span> are
        affiliated with. Assign a researcher to a university from Admin Panel → Users.
      </p>

      {error && (
        <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
          <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center rounded-xl border border-slate-200 bg-white py-16 text-sm text-slate-500 shadow-sm">
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Loading universities…
        </div>
      ) : rows.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white py-16 text-center text-sm text-slate-500 shadow-sm">
          No universities yet. Click "Add university" to create the first one.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {rows.map((u) => (
            <div key={u.id} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-md">
                  <GraduationCap className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="truncate text-base font-bold text-slate-900">
                    {u.name_en || u.name}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {universityFlag(u.country)} {u.country}
                    {u.city ? ` · ${u.city}` : ''}
                  </p>
                </div>
                {!u.is_active && (
                  <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-semibold text-slate-500">
                    inactive
                  </span>
                )}
              </div>

              <dl className="mt-4 grid grid-cols-2 gap-3 text-xs">
                <div className="rounded-lg bg-slate-50 px-2.5 py-2">
                  <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                    <Users2 className="h-3 w-3 text-indigo-500" /> Researchers
                  </div>
                  <p className="mt-1 text-lg font-bold text-slate-900">{researcherCounts[u.id] ?? 0}</p>
                </div>
                <div className="rounded-lg bg-slate-50 px-2.5 py-2">
                  <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                    <Globe className="h-3 w-3 text-slate-500" /> Website
                  </div>
                  {u.website ? (
                    <a
                      href={u.website}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-1 block truncate text-xs font-medium text-indigo-600 hover:underline"
                    >
                      {u.website.replace(/^https?:\/\//, '')}
                    </a>
                  ) : (
                    <p className="mt-1 text-xs text-slate-400">—</p>
                  )}
                </div>
              </dl>

              <div className="mt-4 flex items-center gap-2 border-t border-slate-100 pt-3">
                <button
                  onClick={() => setEditing(u)}
                  className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-[11px] font-medium text-slate-600 transition hover:bg-slate-50"
                >
                  <Pencil className="h-3 w-3" />
                  Edit
                </button>
                <button
                  onClick={() => setDeleting(u)}
                  className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-[11px] font-medium text-slate-500 transition hover:border-red-200 hover:text-red-600"
                >
                  <Trash2 className="h-3 w-3" />
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {editing !== null && (
        <EditModal
          row={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            void load();
          }}
        />
      )}

      {deleting !== null && (
        <DeleteModal
          row={deleting}
          researcherCount={researcherCounts[deleting.id] ?? 0}
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

function EditModal({
  row,
  onClose,
  onSaved,
}: {
  row: University | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const isNew = row === null;
  const [name, setName] = useState(row?.name ?? '');
  const [nameEn, setNameEn] = useState(row?.name_en ?? '');
  const [country, setCountry] = useState(row?.country ?? 'TR');
  const [city, setCity] = useState(row?.city ?? '');
  const [website, setWebsite] = useState(row?.website ?? '');
  const [isActive, setIsActive] = useState(row?.is_active ?? true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = async () => {
    if (!name.trim()) {
      setError('Name is required.');
      return;
    }
    if (!country.trim()) {
      setError('Country code is required (e.g. TR, GR).');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const input = {
        name: name.trim(),
        name_en: nameEn.trim() || null,
        country: country.trim().toUpperCase(),
        city: city.trim() || null,
        website: website.trim() || null,
        is_active: isActive,
      };
      if (isNew) await createUniversity(input);
      else await updateUniversity(row!.id, input);
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
      <div className="flex max-h-[92vh] w-full max-w-lg flex-col rounded-2xl border border-slate-200 bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3">
          <h3 className="text-sm font-semibold text-slate-900">
            {isNew ? 'Add university' : `Edit ${row?.name}`}
          </h3>
          <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-3">
          <Field label="Name" required value={name} onChange={setName} placeholder="Karadeniz Technical University" />
          <Field label="Name (English)" value={nameEn} onChange={setNameEn} placeholder="Karadeniz Technical University" />
          <div className="grid grid-cols-2 gap-3">
            <Field label="Country code" required value={country} onChange={setCountry} placeholder="TR" />
            <Field label="City" value={city} onChange={setCity} placeholder="Trabzon" />
          </div>
          <Field label="Website" value={website} onChange={setWebsite} placeholder="https://www.ktu.edu.tr" />

          <label className="flex cursor-pointer items-center justify-between rounded-lg border border-slate-200 px-3 py-2">
            <span className="text-xs font-medium text-slate-700">Active</span>
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
            {isNew ? 'Create' : 'Save changes'}
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  required,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <div>
      <label className="mb-1 block text-[11px] font-semibold text-slate-600">
        {label}
        {required && <span className="text-red-500"> *</span>}
      </label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-slate-400 focus:bg-white focus:ring-2 focus:ring-slate-200"
      />
    </div>
  );
}

function DeleteModal({
  row,
  researcherCount,
  onClose,
  onDeleted,
}: {
  row: University;
  researcherCount: number;
  onClose: () => void;
  onDeleted: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmText, setConfirmText] = useState('');

  const doDelete = async () => {
    setBusy(true);
    setError(null);
    try {
      await deleteUniversity(row.id);
      onDeleted();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white shadow-2xl">
        <div className="p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-50 text-red-600">
              <Trash2 className="h-5 w-5" />
            </div>
            <h3 className="text-base font-bold text-slate-900">Delete {row.name}?</h3>
          </div>
          <p className="mt-3 text-sm text-slate-600">
            {researcherCount > 0 ? (
              <>
                <span className="font-semibold">{researcherCount}</span> researcher
                {researcherCount === 1 ? '' : 's'} affiliated with this university will keep their
                accounts, but their institution will be cleared (set to none). This cannot be undone.
              </>
            ) : (
              <>This university will be permanently removed. This action cannot be undone.</>
            )}
          </p>
          <div className="mt-4">
            <label className="mb-1 block text-[11px] font-semibold text-slate-600">
              Type the university name to confirm
            </label>
            <input
              type="text"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder={row.name}
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
              onClick={doDelete}
              disabled={busy || confirmText !== row.name}
              className={clsx(
                'inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold text-white transition',
                confirmText === row.name && !busy
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
    </div>
  );
}
