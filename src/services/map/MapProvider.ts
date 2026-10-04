// ─────────────────────────────────────────────────────────────
// MyFitAI — Map Provider Interface
// Defines the contract that every map tile provider must satisfy.
// Allows future swaps (e.g. self-hosted tiles, paid vendors)
// without rewriting map rendering or application components.
// ─────────────────────────────────────────────────────────────

import type { MapTheme } from './MapConfig';

export interface IMapProvider {
  /** Unique provider identifier */
  readonly id: string;

  /** Display name of the map provider */
  readonly name: string;

  /** Required copyright & attribution notice (must be visible on the map) */
  readonly attribution: string;

  /** Resolves the MapLibre-compatible style URL JSON for the given theme */
  getStyleUrl(theme: MapTheme): string;

  /** Maximum zoom level supported by the tile server */
  readonly maxZoom: number;

  /** Minimum zoom level supported by the tile server */
  readonly minZoom: number;
}
