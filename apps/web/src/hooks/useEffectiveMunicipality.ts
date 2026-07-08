'use client';

import { useEffect } from 'react';
import { useProfile } from '@/hooks/useProfile';
import { useDataEntry } from '@/stores/data-entry';
import { PILOT_MUNICIPALITIES, getPilotById } from '@/lib/pilot-municipalities';

/**
 * Resolves the municipality whose data the current user should be viewing.
 *
 *  - Admins can jump between all pilot municipalities via `setAdminMunicipality`
 *    (persisted in the store). If they haven't picked one yet, we default to the
 *    first pilot.
 *  - Everyone else views their own profile municipality.
 *
 * Also syncs `useDataEntry.loadMunicipality` so all downstream selectors
 * (entriesByYear, submission state, scores) reflect the picked muni.
 *
 * Call this at the top of every "user screen" (data entry, EF, exports,
 * DSS, reporting, my municipality). Non-admin users experience no change.
 */
export function useEffectiveMunicipality() {
  const { profile } = useProfile();
  const adminMuniId = useDataEntry((s) => s.adminMunicipalityId);
  const currentMuniId = useDataEntry((s) => s.municipalityId);
  const loadMunicipality = useDataEntry((s) => s.loadMunicipality);

  const isAdmin = profile?.role === 'admin';
  const resolvedId = isAdmin
    ? adminMuniId ?? PILOT_MUNICIPALITIES[0]?.id ?? null
    : profile?.municipalityId ?? null;

  const municipality = isAdmin
    ? getPilotById(resolvedId) ?? null
    : profile?.municipality ?? null;

  useEffect(() => {
    if (!resolvedId) return;
    if (resolvedId !== currentMuniId) {
      void loadMunicipality(resolvedId);
    }
  }, [resolvedId, currentMuniId, loadMunicipality]);

  return {
    municipalityId: resolvedId,
    municipality,
    isAdmin,
  };
}
