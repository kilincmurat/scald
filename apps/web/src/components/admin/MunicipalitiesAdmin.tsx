'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { createBrowserClient } from '@supabase/ssr';
import {
  ArrowLeft,
  Loader2,
  MapPin,
  Users2,
  ClipboardList,
  Plus,
  Pencil,
  Trash2,
  X,
  Save,
  AlertCircle,
} from 'lucide-react';
import { clsx } from 'clsx';

type Row = {
  id: string;
  name: string;
  name_en: string | null;
  country: string;
  region: string | null;
  population: number | null;
  area_km2: number | null;
  latitude: number | null;
  longitude: number | null;
  is_active: boolean;
  is_pilot: boolean;
};

type Stats = { users: number; entries: number };

function client() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}

const FLAGS: Record<string, string> = {
  TR: '🇹🇷',
  GR: '🇬🇷',
  RO: '🇷🇴',
  MK: '🇲🇰',
  BG: '🇧🇬',
  RS: '🇷🇸',
  AL: '🇦🇱',
};

export function MunicipalitiesAdmin() {
  const [rows, setRows] = useState<Row[]>([]);
  const [stats, setStats] = useState<Record<string, Stats>>({});
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Row | 'new' | null>(null);
  const [deleting, setDeleting] = useState<Row | null>(null);

  const load = async () => {
    setLoading(true);
    const supabase = client();
    const { data: muns } = await supabase
      .from('municipalities')
      .select('id, name, name_en, country, region, population, area_km2, latitude, longitude, is_active, is_pilot')
      .order('country', { ascending: true });
    const list = (muns as Row[] | null) ?? [];
    setRows(list);

    const results = await Promise.all(
      list.map(async (m) => {
        const [{ count: usersCount }, { count: entriesCount }] = await Promise.all([
          supabase
            .from('profiles')
            .select('id', { count: 'exact', head: true })
            .eq('municipality_id', m.id),
          supabase
            .from('scald_indicator_entries')
            .select('id', { count: 'exact', head: true })
            .eq('municipality_id', m.id),
        ]);
        return [m.id, { users: usersCount ?? 0, entries: entriesCount ?? 0 }] as const;
      }),
    );
    setStats(Object.fromEntries(results));
    setLoading(false);
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
          Add municipality
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center rounded-xl border border-slate-200 bg-white py-16 text-sm text-slate-500 shadow-sm">
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Loading municipalities…
        </div>
      ) : rows.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white py-16 text-center text-sm text-slate-500 shadow-sm">
          No municipalities yet. Click "Add municipality" to create the first one.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {rows.map((m) => {
            const flag = FLAGS[m.country] ?? '🏙️';
            const s = stats[m.id];
            return (
              <div key={m.id} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-center gap-3">
                  <span className="text-3xl leading-none">{flag}</span>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-base font-bold text-slate-900">
                      {m.name_en || m.name}
                    </h3>
                    <p className="text-xs text-slate-500">
                      {m.country} · {m.region ?? '—'}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    {m.is_pilot && (
                      <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                        pilot
                      </span>
                    )}
                    {!m.is_active && (
                      <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-semibold text-slate-500">
                        inactive
                      </span>
                    )}
                  </div>
                </div>

                <dl className="mt-4 grid grid-cols-3 gap-3 text-xs">
                  <Stat icon={<Users2 className="h-3 w-3 text-blue-500" />} label="Users" value={s?.users ?? '—'} />
                  <Stat icon={<ClipboardList className="h-3 w-3 text-emerald-500" />} label="Entries" value={s?.entries ?? '—'} />
                  <Stat
                    icon={<MapPin className="h-3 w-3 text-slate-500" />}
                    label="Population"
                    value={m.population?.toLocaleString() ?? '—'}
                  />
                </dl>

                <p className="mt-3 text-[10px] text-slate-400">
                  Lat {m.latitude?.toFixed(3) ?? '—'} · Lon {m.longitude?.toFixed(3) ?? '—'}
                  {m.area_km2 ? ` · ${m.area_km2} km²` : ''}
                </p>

                <div className="mt-4 flex items-center gap-2 border-t border-slate-100 pt-3">
                  <button
                    onClick={() => setEditing(m)}
                    className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-[11px] font-medium text-slate-600 transition hover:bg-slate-50"
                  >
                    <Pencil className="h-3 w-3" />
                    Edit
                  </button>
                  <button
                    onClick={() => setDeleting(m)}
                    className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-[11px] font-medium text-slate-500 transition hover:border-red-200 hover:text-red-600"
                  >
                    <Trash2 className="h-3 w-3" />
                    Delete
                  </button>
                </div>
              </div>
            );
          })}
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

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string | number }) {
  return (
    <div className="rounded-lg bg-slate-50 px-2.5 py-2">
      <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
        {icon} {label}
      </div>
      <p className="mt-1 text-lg font-bold text-slate-900">{value}</p>
    </div>
  );
}

function EditModal({
  row,
  onClose,
  onSaved,
}: {
  row: Row | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const isNew = row === null;
  const [name, setName] = useState(row?.name ?? '');
  const [nameEn, setNameEn] = useState(row?.name_en ?? '');
  const [country, setCountry] = useState(row?.country ?? 'TR');
  const [region, setRegion] = useState(row?.region ?? '');
  const [population, setPopulation] = useState<string>(row?.population?.toString() ?? '');
  const [areaKm2, setAreaKm2] = useState<string>(row?.area_km2?.toString() ?? '');
  const [latitude, setLatitude] = useState<string>(row?.latitude?.toString() ?? '');
  const [longitude, setLongitude] = useState<string>(row?.longitude?.toString() ?? '');
  const [isActive, setIsActive] = useState(row?.is_active ?? true);
  const [isPilot, setIsPilot] = useState(row?.is_pilot ?? false);
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
      const supabase = client();
      const payload = {
        name: name.trim(),
        name_en: nameEn.trim() || null,
        country: country.trim().toUpperCase(),
        region: region.trim() || null,
        population: population.trim() === '' ? null : Number(population),
        area_km2: areaKm2.trim() === '' ? null : Number(areaKm2),
        latitude: latitude.trim() === '' ? null : Number(latitude),
        longitude: longitude.trim() === '' ? null : Number(longitude),
        is_active: isActive,
        is_pilot: isPilot,
      };
      const { error: err } = isNew
        ? await supabase.from('municipalities').insert(payload)
        : await supabase.from('municipalities').update(payload).eq('id', row!.id);
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
      <div className="flex max-h-[92vh] w-full max-w-lg flex-col rounded-2xl border border-slate-200 bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3">
          <h3 className="text-sm font-semibold text-slate-900">
            {isNew ? 'Add municipality' : `Edit ${row?.name}`}
          </h3>
          <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Name" required value={name} onChange={setName} placeholder="Trabzon" />
            <Field label="Name (English)" value={nameEn} onChange={setNameEn} placeholder="Trabzon" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Country code" required value={country} onChange={setCountry} placeholder="TR" />
            <Field label="Region" value={region} onChange={setRegion} placeholder="Karadeniz" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Population" value={population} onChange={setPopulation} type="number" placeholder="807906" />
            <Field label="Area km²" value={areaKm2} onChange={setAreaKm2} type="number" placeholder="4685" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Latitude" value={latitude} onChange={setLatitude} type="number" placeholder="41.0027" />
            <Field label="Longitude" value={longitude} onChange={setLongitude} type="number" placeholder="39.7168" />
          </div>

          <label className="flex cursor-pointer items-center justify-between rounded-lg border border-slate-200 px-3 py-2">
            <span className="text-xs font-medium text-slate-700">Public</span>
            <input
              type="checkbox"
              checked={isPilot}
              onChange={(e) => setIsPilot(e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
            />
          </label>

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
  type,
  required,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  required?: boolean;
}) {
  return (
    <div>
      <label className="mb-1 block text-[11px] font-semibold text-slate-600">
        {label}
        {required && <span className="text-red-500"> *</span>}
      </label>
      <input
        type={type ?? 'text'}
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
  onClose,
  onDeleted,
}: {
  row: Row;
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
      const supabase = client();
      const { error: err } = await supabase.from('municipalities').delete().eq('id', row.id);
      if (err) throw err;
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
            This will also delete all indicator entries, category completions,
            profiles bound to this municipality, and any feedback submitted to it. This
            action cannot be undone.
          </p>
          <div className="mt-4">
            <label className="mb-1 block text-[11px] font-semibold text-slate-600">
              Type the municipality name to confirm
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
