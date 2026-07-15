/**
 * The pilot partner municipalities in the SCALD KA220-ADU project.
 * These UUIDs match the seed rows in the municipalities table (migration
 * 013_municipalities_restructure.sql), so registration and admin flows can
 * reference them without a DB lookup.
 *
 * Note: the "Demo Municipality" (holder for the moved demo data) is is_pilot
 * = false in the DB and intentionally NOT listed here — it is not a pilot city.
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
    name: 'Trabzon Büyükşehir Belediyesi',
    country: 'Turkey',
    countryCode: 'TR',
    flag: '🇹🇷',
    region: 'Black Sea',
  },
  {
    id: 'b1b1b1b1-b1b1-b1b1-b1b1-b1b1b1b1b1b1',
    name: 'Ortahisar Belediyesi',
    country: 'Turkey',
    countryCode: 'TR',
    flag: '🇹🇷',
    region: 'Black Sea',
  },
  {
    id: 'b2b2b2b2-b2b2-b2b2-b2b2-b2b2b2b2b2b2',
    name: 'Yomra Belediyesi',
    country: 'Turkey',
    countryCode: 'TR',
    flag: '🇹🇷',
    region: 'Black Sea',
  },
  {
    id: 'b3b3b3b3-b3b3-b3b3-b3b3-b3b3b3b3b3b3',
    name: 'Novaci',
    country: 'North Macedonia',
    countryCode: 'MK',
    flag: '🇲🇰',
    region: 'Pelagonia',
  },
  {
    id: 'a2a2a2a2-a2a2-a2a2-a2a2-a2a2a2a2a2a2',
    name: 'Kavala',
    country: 'Greece',
    countryCode: 'GR',
    flag: '🇬🇷',
    region: 'East Macedonia and Thrace',
  },
  {
    id: 'a3a3a3a3-a3a3-a3a3-a3a3-a3a3a3a3a3a3',
    name: 'Tulcea',
    country: 'Romania',
    countryCode: 'RO',
    flag: '🇷🇴',
    region: 'Northern Dobruja',
  },
];

export function getPilotById(id: string | null | undefined): PilotMunicipality | null {
  if (!id) return null;
  return PILOT_MUNICIPALITIES.find((m) => m.id === id) ?? null;
}
