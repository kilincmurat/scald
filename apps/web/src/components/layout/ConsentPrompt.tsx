'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useProfile } from '@/hooks/useProfile';
import { acceptTerms } from '@/lib/account-service';
import { createClient } from '@/lib/supabase/client';
import { ScrollText, Loader2, AlertCircle, LogOut } from 'lucide-react';
import { clsx } from 'clsx';

/**
 * One-time, required acknowledgement of the platform Terms of Use. Shown on
 * first sign-in (when `terms_accepted_at` is null) before the user can work.
 * Unlike the password prompt it cannot be dismissed — the user must accept, or
 * sign out. Once accepted (timestamp stored) it never appears again.
 */
export function ConsentPrompt() {
  const router = useRouter();
  const { profile, loading, refresh } = useProfile();
  const [agreed, setAgreed] = useState(false);
  const [saving, setSaving] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (loading || !profile || profile.termsAcceptedAt) return null;

  const accept = async () => {
    if (!agreed) return;
    setSaving(true);
    setError(null);
    try {
      const { error: err } = await acceptTerms();
      if (err) {
        setError(err);
        return;
      }
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save your acceptance.');
    } finally {
      setSaving(false);
    }
  };

  const signOut = async () => {
    setSigningOut(true);
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
      router.push('/login');
      router.refresh();
    } finally {
      setSigningOut(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/70 backdrop-blur-sm p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="consent-title"
        className="flex max-h-[92vh] w-full max-w-2xl flex-col rounded-2xl border border-slate-200 bg-white shadow-2xl"
      >
        <div className="flex items-start gap-3 border-b border-slate-100 p-5">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-slate-700 to-slate-900 text-white shadow-md">
            <ScrollText className="h-6 w-6" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 id="consent-title" className="text-base font-bold text-slate-900">
              Terms of Use &amp; Acceptable Use
            </h3>
            <p className="mt-0.5 text-xs text-slate-500">
              Please read and accept the following before using the SCALD platform. This is a
              one-time acknowledgement.
            </p>
          </div>
        </div>

        {/* Scrollable terms */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs leading-relaxed text-slate-700">
            <p>
              Welcome to <span className="font-semibold text-slate-900">SCALD</span> — the
              Data-driven Decision Support Ecosystem for Local Governments, developed under an
              Erasmus+ (KA220-ADU) project. By using this platform you acknowledge and agree that:
            </p>
            <ol className="list-decimal space-y-2 pl-4">
              <li>
                <span className="font-semibold text-slate-900">Authorised use.</span> Your account
                was provisioned by an administrator for official work on behalf of your
                organisation. You will use the platform only for its intended purpose and within
                the scope of your assigned role.
              </li>
              <li>
                <span className="font-semibold text-slate-900">Account security.</span> You are
                responsible for all activity under your account. Keep your password confidential
                and do not share your login credentials with anyone.
              </li>
              <li>
                <span className="font-semibold text-slate-900">Data accuracy.</span> You will enter
                indicator and municipal data accurately and to the best of your knowledge.
                Submitted data may be used for scoring, reporting and official SCALD project
                outputs.
              </li>
              <li>
                <span className="font-semibold text-slate-900">Confidentiality &amp; data
                protection.</span> You will treat information accessible through the platform as
                confidential and process any personal data in accordance with applicable data
                protection law (including the GDPR). You will not disclose or export data outside
                the authorised scope.
              </li>
              <li>
                <span className="font-semibold text-slate-900">Accountability.</span> Actions such
                as data entry, submission and approval are recorded in an audit log and attributed
                to your account.
              </li>
            </ol>
            <p className="text-slate-500">
              If you do not agree, please sign out and contact your administrator, who can
              deactivate your account.
            </p>
          </div>

          <label className="mt-4 flex cursor-pointer items-start gap-3 rounded-lg border border-slate-200 p-3 text-xs">
            <input
              type="checkbox"
              checked={agreed}
              onChange={(e) => {
                setAgreed(e.target.checked);
                setError(null);
              }}
              className="mt-0.5 h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
            />
            <span className="text-slate-700">
              I have read and agree to the Terms of Use and Acceptable Use of the SCALD platform.
            </span>
          </label>

          {error && (
            <div className="mt-3 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
              <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between gap-2 border-t border-slate-100 p-5">
          <button
            type="button"
            onClick={signOut}
            disabled={signingOut || saving}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3.5 py-2 text-sm font-medium text-slate-600 transition hover:border-red-200 hover:bg-red-50 hover:text-red-600 disabled:opacity-60"
          >
            {signingOut ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogOut className="h-4 w-4" />}
            Sign out
          </button>
          <button
            type="button"
            onClick={accept}
            disabled={!agreed || saving}
            className={clsx(
              'inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold shadow-sm transition',
              !agreed || saving
                ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                : 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white hover:opacity-90',
            )}
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {saving ? 'Saving…' : 'Accept & continue'}
          </button>
        </div>
      </div>
    </div>
  );
}
