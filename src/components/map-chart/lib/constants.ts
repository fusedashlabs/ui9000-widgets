export type MapVisualisation = 'choropleth' | 'bubbles' | 'spike' | 'markers';

export type MapAdminType = 'city' | 'county' | 'state' | 'country' | 'province' | 'region';

export interface RegionKeys {
  name: string;
  id: string;
  code: string;
  county: string;
  state: string;
  country: string;
}

export const MAP_ADMIN_TYPES: MapAdminType[] = [
  'city',
  'county',
  'state',
  'province',
  'region',
  'country',
];

export const SANITIZE_KEY_PATTERN = /[^a-zA-Z0-9]/g;
export const SANITIZE_ID_PATTERN = /[^a-zA-Z0-9_-]/g;

export const sanitizeKey = (key: string): string => key.replace(SANITIZE_KEY_PATTERN, '_');

export const sanitizeId = (id: string): string => id.replace(SANITIZE_ID_PATTERN, '_');

/** Vendored from client MapBox/constants.ts — keep in lockstep with mcp-ui geojsonKeys. */
export const GEOJSON_KEYS: Record<MapAdminType, RegionKeys> = {
  city: {
    name: 'NAME_2',
    code: 'GID_0',
    id: 'GID_2',
    county: 'NAME_2',
    state: 'NAME_1',
    country: 'COUNTRY',
  },
  region: {
    name: 'name',
    code: 'iso_3166_2',
    id: 'iso_3166_2',
    county: 'name',
    state: 'name',
    country: 'admin',
  },
  county: {
    name: 'NAME_2',
    code: 'GID_0',
    id: 'GID_2',
    county: 'NAME_2',
    state: 'NAME_1',
    country: 'COUNTRY',
  },
  state: {
    name: 'NAME_1',
    code: 'GID_0',
    id: 'GID_1',
    county: 'NAME_2',
    state: 'NAME_1',
    country: 'COUNTRY',
  },
  country: {
    name: 'name',
    code: 'name',
    id: 'iso_a3',
    county: 'NAME_2',
    state: 'NAME_1',
    country: 'COUNTRY',
  },
  province: {
    name: 'name',
    code: 'iso_3166_2',
    id: 'iso_3166_2',
    county: 'name',
    state: 'name',
    country: 'admin',
  },
};

export const MAX_COLOR_RANGE = 7;
export const DEFAULT_SPIKE_SIZES = [8, 12, 16, 22, 28, 34, 42, 54];
export const DEFAULT_BUBBLES_RADIUS = [10, 15, 20, 25, 30, 35, 40, 45];
export const SPIKE_HEIGHTS = [15, 25, 35, 40, 55, 70, 85, 100];
export const BUBBLE_RADIUS_STEPS = [10, 15, 20, 25, 30, 35, 40];
export const FALLBACK_FILL = '#DADAE1';
export const UNMATCHED_FILL = 'rgba(72, 70, 91, 0.15)';
export const MAX_SPIKES = 200;

export const LAYER_ORDER: Record<MapVisualisation, number> = {
  choropleth: 0,
  bubbles: 1,
  spike: 2,
  markers: 3,
};

export const MAP_STYLES = {
  light: 'mapbox://styles/andyk1987/cm1kvt8ib00ie01pi1lty0ey4',
  dark: 'mapbox://styles/flc-designers/cm7j7z28n00ov01ryahkd2jqj',
  terrain: 'mapbox://styles/andyk1987/clnefgdzy01ze01qne2766ihi',
} as const;

export const MAPBOX_CSS_HREF = 'https://api.mapbox.com/mapbox-gl-js/v3.29.0/mapbox-gl.css';

export const COUNTRY_SYNONYMS: Record<string, string[]> = {
  'United States of America': ['United States', 'USA', 'US'],
  'United Republic of Tanzania': ['Tanzania'],
  'Hong Kong S.A.R.': ['Hong Kong'],
  'Ivory Coast': ["Côte d'Ivoire", "Cote d'Ivoire"],
  'Cape Verde': ['Cabo Verde'],
  'Republic of the Congo': ['Congo', 'Congo-Brazzaville'],
  'Democratic Republic of the Congo': ['DR Congo', 'DRC', 'Congo (Kinshasa)'],
  'West Bank': ['Palestine', 'State of Palestine'],
  'Caribbean Netherlands': ['Netherlands'],
  'The Bahamas': ['Bahamas'],
  'Republic of Serbia': ['Serbia'],
  Macedonia: ['North Macedonia'],
  'East Timor': ['Timor-Leste', 'Timor Leste'],
  'Federated States of Micronesia': ['Micronesia'],
  'Guinea Bissau': ['Guinea-Bissau'],
  Swaziland: ['Eswatini'],
  'Czech Republic': ['Czechia'],
  'South Korea': ['Korea, Rep.', 'Republic of Korea'],
  'North Korea': ['Korea, North', 'DPRK'],
  Burma: ['Myanmar'],
  'United Kingdom': ['UK', 'Great Britain'],
};

/** Country-level labels only — do not reuse COUNTRY_SYNONYMS (admin-1 composites). */
export const COUNTRY_LABEL_ALIASES: Record<string, string[]> = {
  'Czech Rep.': ['Czechia', 'Czech Republic'],
  'Czech Republic': ['Czechia', 'Czech Rep.'],
  Czechia: ['Czech Republic', 'Czech Rep.'],
};
