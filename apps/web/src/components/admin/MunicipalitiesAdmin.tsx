'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { createBrowserClient } from '@supabase/ssr';
import { ArrowLeft, Loader2, MapPin, Users2, ClipboardList } from 'lucide-react';

type Row = {
  id: string;
  name: string;
  name_en: string | null;
  country: string;
  region: string | null;
  population: number | null;
  latitude: number | null;
  longitude: number | null;
  is_active: boolean;
  is_pilot: boolean;
};

type Stats = {
  users: number;
  entries: number;
};

function client() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}

const FLAGS: Record<string, string> = { TR: '🇹🇷', GR: '🇬🇷', RO: '🇷🇴', MK: '🇲🇰' };

export function MunicipalitiesAdmin() {
  const [rows, setRows] = useState<Row[]>([]);
  const [stats, setStats] = useState<Record<string, Stats>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      const supabase = client();
      const { data: muns } = await supabase
        .from('municipalities')
        .select('id, name, name_en, country, region, population, latitude, longitude, is_active, is_pilot')
        .order('country', { ascending: true });
      const list = ((muns as Row[] | null) ?? []).filter((m) => m.is_pilot !== false);
      setRows(list);

      // Per-municipality counts (best-effort; RLS lets admin see all rows)
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
    })();
  }, []);

  return (
    <div className="p-4 lg:p-6 space-y-5">
      <Link href="/admin" className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-700">
        <ArrowLeft className="h-4 w-4" /> Admin panel
      </Link>

      {loading ? (
        <div className="flex items-center justify-center rounded-xl border border-slate-200 bg-white py-16 text-sm text-slate-500 shadow-sm">
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Loading municipalities…
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
                  <div className="min-w-0">
                    <h3 className="text-base font-bold text-slate-900">
                      {m.name_en || m.name}
                    </h3>
                    <p className="text-xs text-slate-500">
                      {m.country} · {m.region ?? 'Region'}
                    </p>
                  </div>
                  {m.is_pilot && (
                    <span className="ml-auto rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                      pilot
                    </span>
                  )}
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
                </p>
              </div>
            );
          })}
        </div>
      )}

      <div className="rounded-xl border border-slate-100 bg-slate-50 p-4 text-xs text-slate-600">
        <p className="font-semibold text-slate-800">🚧 v1 skeleton</p>
        <p className="mt-1">
          Add / edit municipalities directly in the Supabase Dashboard for now. This page
          is view-only until the invite flow is built.
        </p>
      </div>
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
