'use client';

import { useEffect, useRef, useState } from 'react';
import {
  Accessibility,
  X,
  Type,
  Contrast,
  Sparkles,
  MousePointer2,
  Link2,
  Pause,
  RotateCcw,
} from 'lucide-react';
import { clsx } from 'clsx';

type FontStep = 0 | 1 | 2 | 3; // 100% / 115% / 130% / 150%

type A11yState = {
  fontStep: FontStep;
  highContrast: boolean;
  dyslexia: boolean;
  reduceMotion: boolean;
  underlineLinks: boolean;
  bigCursor: boolean;
};

const DEFAULT_STATE: A11yState = {
  fontStep: 0,
  highContrast: false,
  dyslexia: false,
  reduceMotion: false,
  underlineLinks: false,
  bigCursor: false,
};

const STORAGE_KEY = 'scald-a11y';

function applyToDocument(s: A11yState) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  root.dataset.a11yFont = String(s.fontStep);
  root.dataset.a11yContrast = s.highContrast ? 'high' : 'normal';
  root.dataset.a11yDyslexia = s.dyslexia ? 'on' : 'off';
  root.dataset.a11yMotion = s.reduceMotion ? 'reduce' : 'normal';
  root.dataset.a11yLinks = s.underlineLinks ? 'underline' : 'normal';
  root.dataset.a11yCursor = s.bigCursor ? 'big' : 'normal';
}

function load(): A11yState {
  if (typeof window === 'undefined') return DEFAULT_STATE;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_STATE;
    return { ...DEFAULT_STATE, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_STATE;
  }
}

function save(s: A11yState) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
  } catch {
    /* ignore */
  }
}

export function AccessibilityWidget() {
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const [state, setState] = useState<A11yState>(DEFAULT_STATE);
  const panelRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    setMounted(true);
    const initial = load();
    setState(initial);
    applyToDocument(initial);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    applyToDocument(state);
    save(state);
  }, [state, mounted]);

  // Close on Escape and click outside
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
        buttonRef.current?.focus();
      }
    };
    const onClick = (e: MouseEvent) => {
      if (
        panelRef.current &&
        !panelRef.current.contains(e.target as Node) &&
        !buttonRef.current?.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onClick);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('mousedown', onClick);
    };
  }, [open]);

  if (!mounted) return null;

  const update = <K extends keyof A11yState>(key: K, value: A11yState[K]) =>
    setState((s) => ({ ...s, [key]: value }));

  const reset = () => setState(DEFAULT_STATE);

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        aria-label="Accessibility options"
        aria-expanded={open}
        aria-controls="a11y-panel"
        onClick={() => setOpen((v) => !v)}
        className="fixed bottom-4 right-4 z-[60] flex h-12 w-12 items-center justify-center rounded-full bg-emerald-600 text-white shadow-lg outline-none ring-emerald-300 transition hover:bg-emerald-700 focus-visible:ring-4 print:hidden"
      >
        <Accessibility className="h-6 w-6" />
      </button>

      {open && (
        <div
          ref={panelRef}
          id="a11y-panel"
          role="dialog"
          aria-modal="false"
          aria-label="Accessibility options"
          className="fixed bottom-20 right-4 z-[60] w-[92vw] max-w-sm rounded-2xl border border-slate-200 bg-white p-4 shadow-2xl print:hidden"
        >
          <div className="mb-3 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Accessibility className="h-4 w-4 text-emerald-600" />
              <h2 className="text-sm font-bold text-slate-900">Accessibility</h2>
            </div>
            <button
              type="button"
              aria-label="Close accessibility panel"
              onClick={() => setOpen(false)}
              className="rounded-md p-1 text-slate-400 outline-none hover:bg-slate-100 hover:text-slate-700 focus-visible:ring-2 focus-visible:ring-emerald-300"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="space-y-2">
            <FontSizeRow value={state.fontStep} onChange={(v) => update('fontStep', v)} />
            <ToggleRow
              icon={<Contrast className="h-4 w-4" />}
              label="High contrast"
              hint="Darker text, stronger borders"
              checked={state.highContrast}
              onChange={(v) => update('highContrast', v)}
            />
            <ToggleRow
              icon={<Sparkles className="h-4 w-4" />}
              label="Dyslexia-friendly"
              hint="Wider spacing, easier font"
              checked={state.dyslexia}
              onChange={(v) => update('dyslexia', v)}
            />
            <ToggleRow
              icon={<Pause className="h-4 w-4" />}
              label="Reduce motion"
              hint="Stops animations and transitions"
              checked={state.reduceMotion}
              onChange={(v) => update('reduceMotion', v)}
            />
            <ToggleRow
              icon={<Link2 className="h-4 w-4" />}
              label="Underline links"
              hint="Makes links easier to spot"
              checked={state.underlineLinks}
              onChange={(v) => update('underlineLinks', v)}
            />
            <ToggleRow
              icon={<MousePointer2 className="h-4 w-4" />}
              label="Large cursor"
              hint="Bigger, easier-to-see cursor"
              checked={state.bigCursor}
              onChange={(v) => update('bigCursor', v)}
            />
          </div>

          <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3">
            <p className="text-[10px] text-slate-400">
              Settings saved on this device
            </p>
            <button
              type="button"
              onClick={reset}
              className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[11px] font-medium text-slate-500 outline-none hover:bg-slate-100 hover:text-slate-800 focus-visible:ring-2 focus-visible:ring-emerald-300"
            >
              <RotateCcw className="h-3 w-3" />
              Reset
            </button>
          </div>
        </div>
      )}
    </>
  );
}

function FontSizeRow({
  value,
  onChange,
}: {
  value: FontStep;
  onChange: (v: FontStep) => void;
}) {
  const labels = ['A', 'A', 'A', 'A'];
  const sizes = ['text-[11px]', 'text-sm', 'text-base', 'text-lg'];
  return (
    <div className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50 px-3 py-2">
      <div className="flex items-center gap-2">
        <Type className="h-4 w-4 text-slate-500" />
        <div>
          <p className="text-xs font-semibold text-slate-800">Text size</p>
          <p className="text-[10px] text-slate-500">
            {value === 0 ? 'Default' : value === 1 ? '+15%' : value === 2 ? '+30%' : '+50%'}
          </p>
        </div>
      </div>
      <div
        role="group"
        aria-label="Text size"
        className="inline-flex overflow-hidden rounded-md border border-slate-200 bg-white"
      >
        {([0, 1, 2, 3] as FontStep[]).map((step) => (
          <button
            key={step}
            type="button"
            aria-label={`Text size step ${step + 1}`}
            aria-pressed={value === step}
            onClick={() => onChange(step)}
            className={clsx(
              'flex h-7 w-7 items-center justify-center font-bold outline-none transition focus-visible:ring-2 focus-visible:ring-emerald-300',
              sizes[step],
              value === step
                ? 'bg-emerald-600 text-white'
                : 'text-slate-500 hover:bg-slate-100',
            )}
          >
            {labels[step]}
          </button>
        ))}
      </div>
    </div>
  );
}

function ToggleRow({
  icon,
  label,
  hint,
  checked,
  onChange,
}: {
  icon: React.ReactNode;
  label: string;
  hint: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-center justify-between rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 hover:bg-slate-100">
      <span className="flex items-center gap-2">
        <span className="text-slate-500">{icon}</span>
        <span>
          <span className="block text-xs font-semibold text-slate-800">{label}</span>
          <span className="block text-[10px] text-slate-500">{hint}</span>
        </span>
      </span>
      <span className="relative inline-flex">
        <input
          type="checkbox"
          className="peer sr-only"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
        />
        <span className="h-5 w-9 rounded-full bg-slate-300 transition peer-checked:bg-emerald-600 peer-focus-visible:ring-2 peer-focus-visible:ring-emerald-300" />
        <span className="absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white shadow transition peer-checked:translate-x-4" />
      </span>
    </label>
  );
}
