'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/layout/Header';
import { useProfile } from '@/hooks/useProfile';
import { createClient } from '@/lib/supabase/client';
import { ROLE_BADGE_COLOR, ROLE_LABELS } from '@/lib/roles';
import { User, Mail, Shield, Building2, LogOut, Loader2 } from 'lucide-react';
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
      <Header title="Settings" subtitle="Account and profile" />
      <div className="p-4 lg:p-6">
        <div className="mx-auto max-w-2xl space-y-4">
          <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="text-sm font-semibold text-slate-900">Profile</h3>
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
