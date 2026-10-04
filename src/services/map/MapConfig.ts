// ─────────────────────────────────────────────────────────────
// MyFitAI — Map Configuration & Provider Abstraction
// Centralizes map tile providers, style URLs, themes, and
// attribution requirements without hardcoded vendor locks.
// ─────────────────────────────────────────────────────────────

export type MapTheme = 'dark' | 'light';

export interface ViewportBounds {
  north: number;
  south: number;
  east: number;
  west: number;
}

export interface MapInitOptions {
  center?: { lat: number; lng: number };
  zoom?: number;
  theme?: MapTheme;
  interactive?: boolean;
  attributionControl?: boolean;
}

/**
 * OpenFreeMap Production Styles (Zero API Key Required)
 * Hosted by OpenFreeMap, powered by OpenMapTiles and OpenStreetMap data.
 */
export const OPENFREEMAP_STYLES = {
  liberty: 'https://tiles.openfreemap.org/styles/liberty',
  dark: 'https://tiles.openfreemap.org/styles/dark',
  positron: 'https://tiles.openfreemap.org/styles/positron',
  bright: 'https://tiles.openfreemap.org/styles/bright',
} as const;

export const DEFAULT_MAP_ATTRIBUTION =
  'OpenFreeMap © OpenMapTiles | Data from OpenStreetMap';

export const DEFAULT_MAP_CENTER = {
  lat: 28.6139,
  lng: 77.2090,
};

export const DEFAULT_MAP_ZOOM = 15;
export const MIN_MAP_ZOOM = 3;
export const MAX_MAP_ZOOM = 19;
