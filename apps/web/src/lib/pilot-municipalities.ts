/**
 * The partner municipalities in the SCALD KA220-ADU project. UUIDs match the
 * municipalities table (migrations 013 / 015) so registration and admin flows
 * can reference them without a DB lookup.
 *
 * A country can hold several cities and a province several districts — each has
 * its own coordinates, so the map plots them separately. The synthetic "Demo
 * Municipality" (holder for example data) has `demo: true`; it is navigable in
 * selectors but excluded from the geographic map.
 */

export type Municipality = {
  id: string;
  name: string;
  country: string;
  countryCode: 'TR' | 'GR' | 'RO' | 'MK' | 'XX';
  flag: string;
  region: string;
  lat: number;
  lng: number;
  population: number;
  /** Synthetic example municipality — not a real place; kept off the map. */
  demo?: boolean;
};

export const MUNICIPALITIES: Municipality[] = [
  {
    id: 'a1a1a1a1-a1a1-a1a1-a1a1-a1a1a1a1a1a1',
    name: 'Trabzon Metropolitan Municipality',
    country: 'Türkiye',
    countryCode: 'TR',
    flag: '🇹🇷',
    region: 'Black Sea',
    lat: 41.0027,
    lng: 39.7168,
    population: 824352,
  },
  {
    id: 'b1b1b1b1-b1b1-b1b1-b1b1-b1b1b1b1b1b1',
    name: 'Ortahisar Municipality',
    country: 'Türkiye',
    countryCode: 'TR',
    flag: '🇹🇷',
    region: 'Black Sea',
    lat: 41.005,
    lng: 39.7226,
    population: 330836,
  },
  {
    id: 'b2b2b2b2-b2b2-b2b2-b2b2-b2b2b2b2b2b2',
    name: 'Yomra Municipality',
    country: 'Türkiye',
    countryCode: 'TR',
    flag: '🇹🇷',
    region: 'Black Sea',
    lat: 40.9539,
    lng: 39.86,
    population: 49721,
  },
  {
    id: 'b3b3b3b3-b3b3-b3b3-b3b3-b3b3b3b3b3b3',
    name: 'Novaci Municipality',
    country: 'North Macedonia',
    countryCode: 'MK',
    flag: '🇲🇰',
    region: 'Pelagonia',
    lat: 41.0428,
    lng: 21.4583,
    population: 2648,
  },
  {
    id: 'a2a2a2a2-a2a2-a2a2-a2a2-a2a2a2a2a2a2',
    name: 'Kavala Municipality',
    country: 'Greece',
    countryCode: 'GR',
    flag: '🇬🇷',
    region: 'East Macedonia and Thrace',
    lat: 41.0131,
    lng: 24.4046,
    population: 66376,
  },
  {
    id: 'a3a3a3a3-a3a3-a3a3-a3a3-a3a3a3a3a3a3',
    name: 'Tulcea Municipality',
    country: 'Romania',
    countryCode: 'RO',
    flag: '🇷🇴',
    region: 'Northern Dobruja',
    lat: 45.1667,
    lng: 28.8006,
    population: 65624,
  },
  {
    id: 'd0d0d0d0-d0d0-d0d0-d0d0-d0d0d0d0d0d0',
    name: 'Demo Municipality',
    country: 'Example',
    countryCode: 'XX',
    flag: '🧪',
    region: 'Example data',
    lat: 41.0027,
    lng: 39.7168,
    population: 0,
    demo: true,
  },
];

/** Municipalities that appear on the geographic map (real places only). */
export const MAPPABLE_MUNICIPALITIES = MUNICIPALITIES.filter((m) => !m.demo);

export function getMunicipalityById(id: string | null | undefined): Municipality | null {
  if (!id) return null;
  return MUNICIPALITIES.find((m) => m.id === id) ?? null;
}
