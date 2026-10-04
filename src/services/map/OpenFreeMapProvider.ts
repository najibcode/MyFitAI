// ─────────────────────────────────────────────────────────────
// MyFitAI — OpenFreeMap Tile Provider Implementation
// Powered by OpenMapTiles vector data from OpenStreetMap.
// Requires NO API KEY, no telemetry tokens, and zero usage fees.
// ─────────────────────────────────────────────────────────────

import type { IMapProvider } from './MapProvider';
import {
  OPENFREEMAP_STYLES,
  DEFAULT_MAP_ATTRIBUTION,
  MIN_MAP_ZOOM,
  MAX_MAP_ZOOM,
  type MapTheme,
} from './MapConfig';

export class OpenFreeMapProvider implements IMapProvider {
  public readonly id = 'openfreemap';
  public readonly name = 'OpenFreeMap';
  public readonly attribution = DEFAULT_MAP_ATTRIBUTION;
  public readonly minZoom = MIN_MAP_ZOOM;
  public readonly maxZoom = MAX_MAP_ZOOM;

  /**
   * Returns OpenFreeMap style URL for requested theme.
   * Dark mode uses liberty/dark, light mode uses liberty.
   */
  public getStyleUrl(theme: MapTheme): string {
    if (theme === 'dark') {
      // OpenFreeMap dark style (or liberty with dark configuration)
      return OPENFREEMAP_STYLES.dark;
    }
    return OPENFREEMAP_STYLES.liberty;
  }
}

export const defaultMapProvider = new OpenFreeMapProvider();
