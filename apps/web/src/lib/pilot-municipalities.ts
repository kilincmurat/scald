/**
 * The 4 pilot partner municipalities in the SCALD KA220-ADU project.
 * These UUIDs match the seed rows in migration 003_roles_and_scoping.sql,
 * so registration and admin flows can reference them without a DB lookup.
 */

export type PilotMunicipality = {
  id: string;
  name: string;
  country: string;
  countryCode: 'TR' | 'GR' | 'RO' | 'MK';
  flag: string;
  region: string;
};

export const PILOT_MUNICIPALITIES: PilotMunicipality[] = [
  {
    id: 'a1a1a1a1-a1a1-a1a1-a1a1-a1a1a1a1a1a1',
    name: 'Trabzon',
    country: 'Turkey',
    countryCode: 'TR',
    flag: '🇹🇷',
    region: 'Karadeniz',
  },
  {
    id: 'a2a2a2a2-a2a2-a2a2-a2a2-a2a2a2a2a2a2',
    name: 'Kavala',
    country: 'Greece',
    countryCode: 'GR',
    flag: '🇬🇷',
    region: 'East Macedonia',
  },
  {
    id: 'a3a3a3a3-a3a3-a3a3-a3a3-a3a3a3a3a3a3',
    name: 'Tulcea',
    country: 'Romania',
    countryCode: 'RO',
    flag: '🇷🇴',
    region: 'Dobrogea',
  },
  {
    id: 'a4a4a4a4-a4a4-a4a4-a4a4-a4a4a4a4a4a4',
    name: 'Bitola',
    country: 'North Macedonia',
    countryCode: 'MK',
    flag: '🇲🇰',
    region: 'Pelagonia',
  },
];

export function getPilotById(id: string | null | undefined): PilotMunicipality | null {
  if (!id) return null;
  return PILOT_MUNICIPALITIES.find((m) => m.id === id) ?? null;
}
