'use client';

import { useDataEntry, YEAR_OPTIONS } from '@/stores/data-entry';
import { Calendar } from 'lucide-react';
import { clsx } from 'clsx';

type YearPickerProps = {
  /** Optional label to the left of the dropdown. Defaults to "Reporting year". */
  label?: string;
  /** Visual size — 'sm' fits inline in a header, 'md' is more prominent. */
  size?: 'sm' | 'md';
  /** Called after setYear runs. Useful when the caller wants to trigger a refetch. */
  onChange?: (year: number) => void;
  className?: string;
};

export function YearPicker({
  label = 'Reporting year',
  size = 'md',
  onChange,
  className,
}: YearPickerProps) {
  const year = useDataEntry((s) => s.selectedYear);
  const setYear = useDataEntry((s) => s.setYear);

  const handle = (v: number) => {
    setYear(v);
    onChange?.(v);
  };

  const small = size === 'sm';

  return (
    <label
      className={clsx(
        'inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white shadow-sm',
        small ? 'px-2.5 py-1.5 text-xs' : 'px-3 py-2 text-sm',
        className,
      )}
    >
      <Calendar className={clsx('shrink-0 text-slate-400', small ? 'h-3.5 w-3.5' : 'h-4 w-4')} />
      <span className="font-medium text-slate-600">{label}:</span>
      <select
        value={year}
        onChange={(e) => handle(Number(e.target.value))}
        className={clsx(
          'appearance-none border-none bg-transparent font-semibold text-slate-900 outline-none',
          small ? 'pr-1 text-xs' : 'pr-2 text-sm',
        )}
      >
        {YEAR_OPTIONS.map((y) => (
          <option key={y} value={y}>
            {y}
          </option>
        ))}
      </select>
    </label>
  );
}
