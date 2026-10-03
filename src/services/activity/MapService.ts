// ─────────────────────────────────────────────────────────────
// MyFitAI — MapService & Geographic Projection Engine
// Provides modular map tile URL providers, Web Mercator projection,
// viewport bounding box calculations, and efficient spatial queries
// without external proprietary SDKs or runtime routing charges.
// ─────────────────────────────────────────────────────────────

import type { ActivityPoint, TerritoryCell } from '../../types/activity';

export interface ViewportBounds {
  north: number;
  south: number;
  east: number;
  west: number;
}

export interface MapTileProvider {
  id: string;
  name: string;
  attribution: string;
  getTileUrl: (x: number, y: number, z: number) => string;
  maxZoom: number;
}

export const MAP_PROVIDERS: Record<string, MapTileProvider> = {
  cartoDark: {
    id: 'cartoDark',
    name: 'CartoDB Dark Matter',
    attribution: '© OpenStreetMap contributors, © CARTO',
    getTileUrl: (x, y, z) =>
      `https://basemaps.cartocdn.com/rastertiles/dark_all/${z}/${x}/${y}.png`,
    maxZoom: 19,
  },
  osmStandard: {
    id: 'osmStandard',
    name: 'OpenStreetMap Standard',
    attribution: '© OpenStreetMap contributors',
    getTileUrl: (x, y, z) =>
      `https://tile.openstreetmap.org/${z}/${x}/${y}.png`,
    maxZoom: 19,
  },
};

/**
 * Projects latitude/longitude to Web Mercator pixel coordinates at a given zoom level.
 */
export function latLngToPixel(
  lat: number,
  lng: number,
  zoom: number,
  tileSize = 256
): { x: number; y: number } {
  const sinY = Math.sin((lat * Math.PI) / 180);
  // Truncate to avoid infinity near poles
  const clampedSinY = Math.min(Math.max(sinY, -0.9999), 0.9999);

  const x = tileSize * (0.5 + lng / 360) * Math.pow(2, zoom);
  const y =
    tileSize *
    (0.5 - Math.log((1 + clampedSinY) / (1 - clampedSinY)) / (4 * Math.PI)) *
    Math.pow(2, zoom);

  return { x, y };
}

/**
 * Inverts pixel coordinates back to latitude/longitude.
 */
export function pixelToLatLng(
  x: number,
  y: number,
  zoom: number,
  tileSize = 256
): { lat: number; lng: number } {
  const scale = tileSize * Math.pow(2, zoom);
  const lng = ((x / scale) - 0.5) * 360;

  const yNorm = 0.5 - y / scale;
  const lat = 90 - (360 * Math.atan(Math.exp(-yNorm * 2 * Math.PI))) / Math.PI;

  return { lat, lng };
}

/**
 * Calculates bounding box covering an array of GPS coordinates with optional margin.
 */
export function calculateRouteBoundingBox(
  points: ActivityPoint[],
  paddingRatio = 0.15
): ViewportBounds {
  if (!points || points.length === 0) {
    return {
      north: 28.62,
      south: 28.60,
      east: 77.22,
      west: 77.20,
    };
  }

  let minLat = points[0].latitude;
  let maxLat = points[0].latitude;
  let minLng = points[0].longitude;
  let maxLng = points[0].longitude;

  for (const p of points) {
    if (p.latitude < minLat) minLat = p.latitude;
    if (p.latitude > maxLat) maxLat = p.latitude;
    if (p.longitude < minLng) minLng = p.longitude;
    if (p.longitude > maxLng) maxLng = p.longitude;
  }

  const dLat = Math.max(0.002, maxLat - minLat);
  const dLng = Math.max(0.002, maxLng - minLng);

  return {
    north: maxLat + dLat * paddingRatio,
    south: minLat - dLat * paddingRatio,
    east: maxLng + dLng * paddingRatio,
    west: minLng - dLng * paddingRatio,
  };
}

/**
 * Spatial Viewport Filter:
 * Only returns territory cells that overlap the active viewport bounds.
 * Prevents downloading or rendering non-visible worldwide territories.
 */
export function filterTerritoryByViewport(
  cells: TerritoryCell[],
  viewport: ViewportBounds
): TerritoryCell[] {
  return cells.filter(cell => {
    return (
      cell.bounds.south <= viewport.north &&
      cell.bounds.north >= viewport.south &&
      cell.bounds.west <= viewport.east &&
      cell.bounds.east >= viewport.west
    );
  });
}
