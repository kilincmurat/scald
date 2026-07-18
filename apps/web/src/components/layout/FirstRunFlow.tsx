'use client';

import { useState } from 'react';
import { useProfile } from '@/hooks/useProfile';
import { ConsentPrompt } from './ConsentPrompt';
import { GuidedTour } from './GuidedTour';
import { ChangePasswordPrompt } from './ChangePasswordPrompt';
import type { Role } from '@/lib/roles';

/**
 * Orchestrates the one-time first-login prompts using a SINGLE shared profile,
 * so accepting one step immediately reveals the next (no page reload needed).
 * Order:
 *   1. Terms of Use   — required, everyone (until terms_accepted_at set)
 *   2. Guided tour     — non-admin only (until tour_completed_at set)
 *   3. Password nudge  — if the admin-set temporary password is unchanged
 * Exactly one prompt is shown at a time — they never stack.
 */
export function FirstRunFlow() {
  const { profile, loading, refresh } = useProfile();
  const [pwDismissed, setPwDismissed] = useState(false);

  if (loading || !profile) return null;

  if (!profile.termsAcceptedAt) {
    return <ConsentPrompt onDone={refresh} />;
  }

  if (profile.role !== 'admin' && !profile.tourCompletedAt) {
    return <GuidedTour role={profile.role as Exclude<Role, 'admin'>} onDone={refresh} />;
  }

  if (profile.mustChangePassword && !pwDismissed) {
    return <ChangePasswordPrompt onDone={refresh} onDismiss={() => setPwDismissed(true)} />;
  }

  return null;
}
