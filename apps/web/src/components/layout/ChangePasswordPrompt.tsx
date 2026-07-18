'use client';

import { useState } from 'react';
import { changePassword } from '@/lib/account-service';
import { KeyRound, Eye, EyeOff, Loader2, Check, AlertCircle, ShieldCheck, X } from 'lucide-react';
import { clsx } from 'clsx';

/**
 * First-login nudge: when an admin created the account with a temporary
 * password (`must_change_password = true`), suggest the user set their own.
 * It is a *suggestion* — dismissible ("Remind me later", `onDismiss`) — but
 * reappears on the next sign-in until the password is actually changed. On
 * success `onDone` refreshes the shared profile so the flag clears. Rendered by
 * FirstRunFlow (after Terms + tour) so the prompts never stack.
 */
export function ChangePasswordPrompt({
  onDone,
  onDismiss,
}: {
  onDone: () => Promise<void> | void;
  onDismiss: () => void;
}) {
  const [pw, setPw] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (pw.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (pw !== confirm) {
      setError('Passwords do not match.');
      return;
    }
    setSaving(true);
    try {
      const { error: err } = await changePassword(pw);
      if (err) {
        setError(err);
        return;
      }
      setDone(true);
      // Show the success state briefly, then refresh the shared profile
      // (must_change_password is now false → FirstRunFlow unmounts this).
      setTimeout(() => void onDone(), 1200);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not change password.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="cpw-title"
        className="w-full max-w-md rounded-2xl border border-slate-200 bg-white shadow-2xl"
      >
        <div className="flex items-start gap-3 border-b border-slate-100 p-5">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-md">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 id="cpw-title" className="text-base font-bold text-slate-900">
              Set your own password
            </h3>
            <p className="mt-0.5 text-xs text-slate-500">
              Your account was created with a temporary password set by an administrator. For your
              security, please choose a new password only you know.
            </p>
          </div>
          <button
            type="button"
            aria-label="Remind me later"
            onClick={onDismiss}
            className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {done ? (
          <div className="flex flex-col items-center gap-2 p-6 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
              <Check className="h-6 w-6" />
            </div>
            <p className="text-sm font-semibold text-slate-900">Password updated</p>
            <p className="text-xs text-slate-500">You’re all set — you stay signed in.</p>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-3 p-5">
            <div>
              <label htmlFor="cpw-new" className="block text-xs font-medium text-slate-700">
                New password
              </label>
              <div className="mt-1 flex items-stretch overflow-hidden rounded-lg border border-slate-200 focus-within:border-emerald-400 focus-within:ring-2 focus-within:ring-emerald-100">
                <input
                  id="cpw-new"
                  type={showPw ? 'text' : 'password'}
                  autoComplete="new-password"
                  value={pw}
                  onChange={(e) => {
                    setPw(e.target.value);
                    setError(null);
                  }}
                  className="flex-1 border-none bg-white px-3 py-2 text-sm text-slate-900 outline-none placeholder:text-slate-400"
                  placeholder="At least 8 characters"
                  minLength={8}
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => setShowPw((v) => !v)}
                  aria-label={showPw ? 'Hide password' : 'Show password'}
                  className="border-l border-slate-200 bg-slate-50 px-3 text-slate-500 hover:bg-slate-100"
                >
                  {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div>
              <label htmlFor="cpw-confirm" className="block text-xs font-medium text-slate-700">
                Confirm password
              </label>
              <input
                id="cpw-confirm"
                type={showPw ? 'text' : 'password'}
                autoComplete="new-password"
                value={confirm}
                onChange={(e) => {
                  setConfirm(e.target.value);
                  setError(null);
                }}
                className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
                placeholder="Type it again"
                minLength={8}
              />
            </div>

            {error && (
              <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={onDismiss}
                className="rounded-lg border border-slate-200 px-3.5 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
              >
                Remind me later
              </button>
              <button
                type="submit"
                disabled={saving || !pw || !confirm}
                className={clsx(
                  'inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold shadow-sm transition',
                  saving || !pw || !confirm
                    ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                    : 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white hover:opacity-90',
                )}
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
                {saving ? 'Updating…' : 'Change password'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
