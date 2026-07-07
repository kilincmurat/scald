'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/layout/Header';
import { useProfile } from '@/hooks/useProfile';
import { createClient } from '@/lib/supabase/client';
import { ROLE_BADGE_COLOR, ROLE_LABELS } from '@/lib/roles';
import {
  User,
  Mail,
  Shield,
  Building2,
  LogOut,
  Loader2,
  KeyRound,
  Eye,
  EyeOff,
  Check,
  AlertCircle,
} from 'lucide-react';
import { clsx } from 'clsx';

export default function SettingsPage() {
  const router = useRouter();
  const { profile, loading } = useProfile();
  const [signingOut, setSigningOut] = useState(false);

  const handleSignOut = async () => {
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
    <main id="main-content" className="flex-1">
      <Header title="Settings" subtitle="Account, profile, and security" />
      <div className="p-4 lg:p-6">
        <div className="mx-auto max-w-2xl space-y-4">
          <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="text-sm font-semibold text-slate-900">Profile</h3>
            <p className="mt-1 text-xs text-slate-500">
              These fields are managed by SCALD administrators. Contact your admin to change them.
            </p>
            {loading ? (
              <div className="mt-4 h-20 rounded-lg bg-slate-100 animate-pulse" />
            ) : !profile ? (
              <p className="mt-3 text-sm text-slate-500">Not signed in.</p>
            ) : (
              <dl className="mt-4 space-y-3 text-sm">
                <Row icon={<User className="h-4 w-4 text-slate-400" />} label="Name">
                  {profile.fullName || <span className="text-slate-400">—</span>}
                </Row>
                <Row icon={<Mail className="h-4 w-4 text-slate-400" />} label="Email">
                  {profile.email}
                </Row>
                <Row icon={<Shield className="h-4 w-4 text-slate-400" />} label="Role">
                  <span
                    className={clsx(
                      'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset',
                      ROLE_BADGE_COLOR[profile.role],
                    )}
                  >
                    {ROLE_LABELS[profile.role]}
                  </span>
                </Row>
                <Row icon={<Building2 className="h-4 w-4 text-slate-400" />} label="Municipality">
                  {profile.municipality ? (
                    <span className="inline-flex items-center gap-1.5">
                      <span className="text-base leading-none">{profile.municipality.flag}</span>
                      {profile.municipality.name}, {profile.municipality.country}
                    </span>
                  ) : (
                    <span className="text-slate-400">Not assigned</span>
                  )}
                </Row>
              </dl>
            )}
          </section>

          <PasswordSection />

          <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="text-sm font-semibold text-slate-900">Session</h3>
            <p className="mt-1 text-xs text-slate-500">Sign out of the current device.</p>
            <button
              onClick={handleSignOut}
              disabled={signingOut}
              className="mt-4 inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-red-200 hover:bg-red-50 hover:text-red-600"
            >
              {signingOut ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogOut className="h-4 w-4" />}
              {signingOut ? 'Signing out…' : 'Sign out'}
            </button>
          </section>
        </div>
      </div>
    </main>
  );
}

function PasswordSection() {
  const [pw, setPw] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);
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
      const supabase = createClient();
      const { error: err } = await supabase.auth.updateUser({ password: pw });
      if (err) throw err;
      setSuccess(true);
      setPw('');
      setConfirm('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update password.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start gap-2">
        <KeyRound className="mt-0.5 h-4 w-4 text-slate-400" />
        <div>
          <h3 className="text-sm font-semibold text-slate-900">Change password</h3>
          <p className="mt-0.5 text-xs text-slate-500">
            Minimum 8 characters. You stay signed in after changing.
          </p>
        </div>
      </div>

      <form onSubmit={submit} className="mt-4 space-y-3">
        <div>
          <label htmlFor="new-password" className="block text-xs font-medium text-slate-700">
            New password
          </label>
          <div className="mt-1 flex items-stretch overflow-hidden rounded-lg border border-slate-200 focus-within:border-emerald-400 focus-within:ring-2 focus-within:ring-emerald-100">
            <input
              id="new-password"
              type={showPw ? 'text' : 'password'}
              autoComplete="new-password"
              value={pw}
              onChange={(e) => {
                setPw(e.target.value);
                setError(null);
                setSuccess(false);
              }}
              className="flex-1 border-none bg-white px-3 py-2 text-sm text-slate-900 outline-none placeholder:text-slate-400"
              placeholder="At least 8 characters"
              minLength={8}
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
          <label htmlFor="confirm-password" className="block text-xs font-medium text-slate-700">
            Confirm password
          </label>
          <input
            id="confirm-password"
            type={showPw ? 'text' : 'password'}
            autoComplete="new-password"
            value={confirm}
            onChange={(e) => {
              setConfirm(e.target.value);
              setError(null);
              setSuccess(false);
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
        {success && (
          <div className="flex items-start gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
            <Check className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span>Password updated.</span>
          </div>
        )}

        <button
          type="submit"
          disabled={saving || !pw || !confirm}
          className={clsx(
            'inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold shadow-sm transition',
            saving || !pw || !confirm
              ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
              : 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white hover:opacity-90 hover:shadow-md',
          )}
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
          {saving ? 'Updating…' : 'Update password'}
        </button>
      </form>
    </section>
  );
}

function Row({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid grid-cols-[130px_1fr] gap-3">
      <dt className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
        {icon} {label}
      </dt>
      <dd className="text-sm text-slate-800">{children}</dd>
    </div>
  );
}
