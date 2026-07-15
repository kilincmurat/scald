'use client';

import { useEffect, useRef, useState } from 'react';
import { useDataEntry } from '@/stores/data-entry';
import { MUNICIPALITIES, getMunicipalityById } from '@/lib/pilot-municipalities';
import { ChevronDown, Building2, Check } from 'lucide-react';
import { clsx } from 'clsx';

/**
 * Compact municipality picker shown in the sidebar for admins only.
 * Persists the selection in the data-entry store so every user screen
 * (data entry, EF, exports, DSS, reporting) reflects the picked muni.
 */
export function AdminMunicipalityPicker({ collapsed }: { collapsed: boolean }) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const adminMuniId = useDataEntry((s) => s.adminMunicipalityId);
  const setAdmin = useDataEntry((s) => s.setAdminMunicipality);
  const boxRef = useRef<HTMLDivElement>(null);

  const activeId = adminMuniId ?? MUNICIPALITIES[0]?.id ?? '';
  const active = getMunicipalityById(activeId);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  if (!mounted || !active) return null;

  return (
    <div ref={boxRef} className="relative">
      <button
        type="button"
        aria-label={`Viewing ${active.name}`}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        title={collapsed ? `Viewing: ${active.name}` : undefined}
        className={clsx(
          'group flex w-full items-center gap-2 rounded-lg border border-slate-700/60 bg-slate-800/70 text-left text-xs text-slate-200 transition hover:bg-slate-800',
          collapsed ? 'justify-center px-1.5 py-2' : 'px-2.5 py-2',
        )}
      >
        <span className="text-base leading-none">{active.flag}</span>
        {!collapsed && (
          <>
            <span className="min-w-0 flex-1">
              <span className="block text-[9px] font-semibold uppercase tracking-wider text-slate-500">
                Viewing
              </span>
              <span className="block truncate font-semibold text-white">{active.name}</span>
            </span>
            <ChevronDown
              className={clsx(
                'h-3.5 w-3.5 shrink-0 text-slate-400 transition',
                open && 'rotate-180',
              )}
            />
          </>
        )}
      </button>

      {open && (
        <div
          role="menu"
          className={clsx(
            'absolute z-40 mt-2 w-56 rounded-xl border border-slate-200 bg-white p-1 shadow-2xl',
            collapsed ? 'left-full top-0 ml-2' : 'left-0 right-0',
          )}
        >
          <div className="px-2 pb-1 pt-2">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
              Switch municipality
            </p>
            <p className="text-[10px] text-slate-500">
              Admin — view any municipality's data.
            </p>
          </div>
          <div className="my-1 h-px bg-slate-100" />
          {MUNICIPALITIES.map((m) => {
            const selected = m.id === activeId;
            return (
              <button
                key={m.id}
                type="button"
                role="menuitem"
                onClick={() => {
                  setAdmin(m.id);
                  setOpen(false);
                }}
                className={clsx(
                  'flex w-full items-center gap-2 rounded-lg px-2 py-2 text-xs transition',
                  selected
                    ? 'bg-emerald-50 text-emerald-800'
                    : 'text-slate-700 hover:bg-slate-50',
                )}
              >
                <span className="text-lg leading-none">{m.flag}</span>
                <span className="min-w-0 flex-1 text-left">
                  <span className="block truncate font-semibold">{m.name}</span>
                  <span className="block text-[10px] text-slate-500">{m.country}</span>
                </span>
                {selected && <Check className="h-3.5 w-3.5 shrink-0 text-emerald-600" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
