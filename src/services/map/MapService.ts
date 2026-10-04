// ─────────────────────────────────────────────────────────────
// MyFitAI — Production MapService (MapLibre GL Wrapper)
// Manages vector map lifecycle, efficient GeoJSON LineString route
// updates (setData), viewport-based territory polygon layers,
// athlete location markers with heading, and route fitting.
// ─────────────────────────────────────────────────────────────

import * as maplibregl from 'maplibre-gl';
import type { ActivityPoint, TerritoryCell } from '../../types/activity';
import type { IMapProvider } from './MapProvider';
import { defaultMapProvider } from './OpenFreeMapProvider';
import {
  type MapTheme,
  type ViewportBounds,
  type MapInitOptions,
  DEFAULT_MAP_CENTER,
  DEFAULT_MAP_ZOOM,
} from './MapConfig';
import {
  MAP_SOURCES,
  MAP_LAYERS,
  THEME_COLORS,
  createAthleteLocationMarker,
  createPinMarker,
  createReplayMarker,
} from './mapStyles';

export interface MapServiceEvents {
  onLoad?: () => void;
  onUserDrag?: () => void;
  onViewportChange?: (bounds: ViewportBounds) => void;
  onError?: (err: Error) => void;
}

export interface GeoJSONFeature<G = any, P = any> {
  type: 'Feature';
  geometry: G;
  properties: P;
}

export class MapService {
  private map: maplibregl.Map | null = null;
  private provider: IMapProvider;
  private currentTheme: MapTheme = 'dark';
  private isMapLoaded = false;
  private followUser = false;
  private events: MapServiceEvents = {};

  // Markers
  private userLocationMarker: maplibregl.Marker | null = null;
  private startPinMarker: maplibregl.Marker | null = null;
  private finishPinMarker: maplibregl.Marker | null = null;
  private replayMarker: maplibregl.Marker | null = null;

  // Cached state for deferred rendering if map style is loading
  private cachedRoutePoints: ActivityPoint[] = [];
  private cachedTerritoryCells: TerritoryCell[] = [];
  private cachedCurrentLocation: ActivityPoint | null = null;

  constructor(provider: IMapProvider = defaultMapProvider) {
    this.provider = provider;
  }

  /**
   * Initializes MapLibre instance attached to DOM container element.
   */
  public async initialize(
    container: HTMLElement,
    options: MapInitOptions = {},
    events: MapServiceEvents = {}
  ): Promise<void> {
    if (this.map) {
      this.destroy();
    }

    this.events = events;
    this.currentTheme = options.theme || 'dark';

    const center = options.center || DEFAULT_MAP_CENTER;
    const zoom = options.zoom !== undefined ? options.zoom : DEFAULT_MAP_ZOOM;
    const styleUrl = this.provider.getStyleUrl(this.currentTheme);

    return new Promise((resolve, reject) => {
      try {
        this.map = new maplibregl.Map({
          container,
          style: styleUrl,
          center: [center.lng, center.lat],
          zoom,
          interactive: options.interactive !== false,
          attributionControl: false, // We render clean, custom accessible attribution
        });

        // Add custom attribution control if requested or handled
        if (options.attributionControl) {
          this.map.addControl(
            new maplibregl.AttributionControl({
              compact: true,
              customAttribution: this.provider.attribution,
            }),
            'bottom-right'
          );
        }

        this.map.once('load', () => {
          this.isMapLoaded = true;
          this.setupSourcesAndLayers();
          this.flushCachedData();
          this.events.onLoad?.();
          resolve();
        });

        this.map.on('error', e => {
          const err = new Error(e.error?.message || 'MapLibre rendering error');
          this.events.onError?.(err);
        });

        // User drag cancels auto-follow camera
        this.map.on('dragstart', () => {
          if (this.followUser) {
            this.followUser = false;
            this.events.onUserDrag?.();
          }
        });

        this.map.on('moveend', () => {
          if (this.events.onViewportChange) {
            this.events.onViewportChange(this.getBounds());
          }
        });
      } catch (err: unknown) {
        const error = err instanceof Error ? err : new Error(String(err));
        this.events.onError?.(error);
        reject(error);
      }
    });
  }

  /**
   * Sets up GeoJSON LineString route and Territory polygon sources and layers.
   */
  private setupSourcesAndLayers(): void {
    if (!this.map) return;

    // 1. Territory Polygons Source & Layer
    if (!this.map.getSource(MAP_SOURCES.territory)) {
      this.map.addSource(MAP_SOURCES.territory, {
        type: 'geojson',
        data: {
          type: 'FeatureCollection',
          features: [],
        },
      });

      this.map.addLayer({
        id: MAP_LAYERS.territoryFill,
        type: 'fill',
        source: MAP_SOURCES.territory,
        paint: {
          'fill-color': [
            'case',
            ['get', 'isDefended'],
            THEME_COLORS.defendedGold,
            THEME_COLORS.neonGreen,
          ],
          'fill-opacity': ['case', ['get', 'isDefended'], 0.25, 0.2],
        },
      });

      this.map.addLayer({
        id: MAP_LAYERS.territoryOutline,
        type: 'line',
        source: MAP_SOURCES.territory,
        paint: {
          'line-color': [
            'case',
            ['get', 'isDefended'],
            THEME_COLORS.defendedGold,
            THEME_COLORS.neonGreen,
          ],
          'line-width': 1.5,
          'line-opacity': 0.8,
        },
      });
    }

    // 2. Activity Route LineString Source & Layers
    if (!this.map.getSource(MAP_SOURCES.route)) {
      this.map.addSource(MAP_SOURCES.route, {
        type: 'geojson',
        data: {
          type: 'FeatureCollection',
          features: [],
        },
      });

      // Outer Casing / Glow
      this.map.addLayer({
        id: MAP_LAYERS.routeCasing,
        type: 'line',
        source: MAP_SOURCES.route,
        layout: {
          'line-cap': 'round',
          'line-join': 'round',
        },
        paint: {
          'line-color': this.currentTheme === 'dark' ? THEME_COLORS.casingDark : THEME_COLORS.casingLight,
          'line-width': 7,
          'line-opacity': 0.7,
        },
      });

      // Inner Neon Route Line
      this.map.addLayer({
        id: MAP_LAYERS.routeLine,
        type: 'line',
        source: MAP_SOURCES.route,
        layout: {
          'line-cap': 'round',
          'line-join': 'round',
        },
        paint: {
          'line-color': THEME_COLORS.neonGreen,
          'line-width': 4.5,
          'line-opacity': 1.0,
        },
      });
    }
  }

  /**
   * Applies any cached data that was queued before map finished initial load.
   */
  private flushCachedData(): void {
    if (this.cachedRoutePoints.length > 0) {
      this.drawRoute(this.cachedRoutePoints);
    }
    if (this.cachedTerritoryCells.length > 0) {
      this.showTerritoryPolygons(this.cachedTerritoryCells);
    }
    if (this.cachedCurrentLocation) {
      this.setUserLocation(this.cachedCurrentLocation, this.followUser);
    }
  }

  /**
   * Updates map theme (dark / light) using provider styles.
   */
  public setTheme(theme: MapTheme): void {
    if (this.currentTheme === theme) return;
    this.currentTheme = theme;
    if (!this.map) return;

    this.isMapLoaded = false;
    const styleUrl = this.provider.getStyleUrl(theme);
    this.map.setStyle(styleUrl);

    this.map.once('style.load', () => {
      this.isMapLoaded = true;
      this.setupSourcesAndLayers();
      this.flushCachedData();
    });
  }

  /**
   * Updates the live route LineString via efficient GeoJSON source.setData().
   * NEVER recreates the entire map instance.
   */
  public drawRoute(points: ActivityPoint[]): void {
    this.cachedRoutePoints = [...points];
    if (!this.map || !this.isMapLoaded) return;

    const source = this.map.getSource(MAP_SOURCES.route) as maplibregl.GeoJSONSource | undefined;
    if (!source) return;

    if (!points || points.length < 2) {
      source.setData({
        type: 'FeatureCollection',
        features: [],
      });
      this.removePinMarkers();
      return;
    }

    const coordinates = points.map(p => [p.longitude, p.latitude]);

    const feature: GeoJSONFeature<{ type: 'LineString'; coordinates: number[][] }> = {
      type: 'Feature',
      geometry: {
        type: 'LineString',
        coordinates,
      },
      properties: {},
    };

    source.setData({
      type: 'FeatureCollection',
      features: [feature],
    });

    // Update Start Marker
    const startPt = points[0];
    if (!this.startPinMarker) {
      const el = createPinMarker('start');
      this.startPinMarker = new maplibregl.Marker({ element: el })
        .setLngLat([startPt.longitude, startPt.latitude])
        .addTo(this.map);
    } else {
      this.startPinMarker.setLngLat([startPt.longitude, startPt.latitude]);
    }
  }

  /**
   * Appends single point to the active route and updates the map.
   */
  public updateRoute(point: ActivityPoint): void {
    this.cachedRoutePoints.push(point);
    this.drawRoute(this.cachedRoutePoints);
  }

  /**
   * Clears the current route and pin markers.
   */
  public clearRoute(): void {
    this.cachedRoutePoints = [];
    if (this.map && this.isMapLoaded) {
      const source = this.map.getSource(MAP_SOURCES.route) as maplibregl.GeoJSONSource | undefined;
      if (source) {
        source.setData({ type: 'FeatureCollection', features: [] });
      }
    }
    this.removePinMarkers();
  }

  /**
   * Renders territory cells as GeoJSON polygon features.
   */
  public showTerritoryPolygons(cells: TerritoryCell[]): void {
    this.cachedTerritoryCells = [...cells];
    if (!this.map || !this.isMapLoaded) return;

    const source = this.map.getSource(MAP_SOURCES.territory) as maplibregl.GeoJSONSource | undefined;
    if (!source) return;

    const features: GeoJSONFeature<{ type: 'Polygon'; coordinates: number[][][] }>[] = cells.map(cell => {
      const { north, south, east, west } = cell.bounds;
      // Closed 5-coordinate polygon ring [lng, lat]
      const coordinates = [
        [
          [west, north],
          [east, north],
          [east, south],
          [west, south],
          [west, north],
        ],
      ];

      return {
        type: 'Feature',
        geometry: {
          type: 'Polygon',
          coordinates,
        },
        properties: {
          cellId: cell.cellId,
          isDefended: (cell.defendedCount || 0) > 0,
          areaKm2: cell.areaKm2,
        },
      };
    });

    source.setData({
      type: 'FeatureCollection',
      features,
    });
  }

  public hideTerritoryPolygons(): void {
    this.showTerritoryPolygons([]);
  }

  /**
   * Sets athlete's live location with pulse indicator & heading cone.
   */
  public setUserLocation(point: ActivityPoint | null, follow = false): void {
    this.cachedCurrentLocation = point;
    this.followUser = follow;

    if (!this.map) return;

    if (!point) {
      if (this.userLocationMarker) {
        this.userLocationMarker.remove();
        this.userLocationMarker = null;
      }
      return;
    }

    const lngLat: [number, number] = [point.longitude, point.latitude];

    if (!this.userLocationMarker) {
      const el = createAthleteLocationMarker(point.heading);
      this.userLocationMarker = new maplibregl.Marker({ element: el })
        .setLngLat(lngLat)
        .addTo(this.map);
    } else {
      this.userLocationMarker.setLngLat(lngLat);
    }

    if (this.followUser) {
      this.map.easeTo({
        center: lngLat,
        duration: 800,
      });
    }
  }

  /**
   * Shows finish pin marker at the final point of an activity.
   */
  public showFinishMarker(point: ActivityPoint): void {
    if (!this.map) return;
    if (!this.finishPinMarker) {
      const el = createPinMarker('finish');
      this.finishPinMarker = new maplibregl.Marker({ element: el })
        .setLngLat([point.longitude, point.latitude])
        .addTo(this.map);
    } else {
      this.finishPinMarker.setLngLat([point.longitude, point.latitude]);
    }
  }

  private removePinMarkers(): void {
    if (this.startPinMarker) {
      this.startPinMarker.remove();
      this.startPinMarker = null;
    }
    if (this.finishPinMarker) {
      this.finishPinMarker.remove();
      this.finishPinMarker = null;
    }
  }

  /**
   * Replay marker for animated route playback.
   */
  public showReplayMarker(point: ActivityPoint): void {
    if (!this.map) return;
    if (!this.replayMarker) {
      const el = createReplayMarker();
      this.replayMarker = new maplibregl.Marker({ element: el })
        .setLngLat([point.longitude, point.latitude])
        .addTo(this.map);
    } else {
      this.replayMarker.setLngLat([point.longitude, point.latitude]);
    }
  }

  public hideReplayMarker(): void {
    if (this.replayMarker) {
      this.replayMarker.remove();
      this.replayMarker = null;
    }
  }

  /**
   * Enables or disables auto-following athlete location.
   */
  public setFollowUser(follow: boolean): void {
    this.followUser = follow;
    if (follow && this.cachedCurrentLocation && this.map) {
      this.map.easeTo({
        center: [this.cachedCurrentLocation.longitude, this.cachedCurrentLocation.latitude],
        zoom: Math.max(15, this.map.getZoom()),
        duration: 600,
      });
    }
  }

  public recenter(): void {
    this.setFollowUser(true);
  }

  public setCenter(lat: number, lng: number, zoom?: number, options?: { animate?: boolean }): void {
    if (!this.map) return;
    if (options?.animate) {
      this.map.easeTo({
        center: [lng, lat],
        zoom: zoom !== undefined ? zoom : this.map.getZoom(),
        duration: 600,
      });
    } else {
      this.map.setCenter([lng, lat]);
      if (zoom !== undefined) this.map.setZoom(zoom);
    }
  }

  public setZoom(zoom: number): void {
    if (!this.map) return;
    this.map.zoomTo(zoom, { duration: 300 });
  }

  public zoomIn(): void {
    if (!this.map) return;
    this.map.zoomIn({ duration: 300 });
  }

  public zoomOut(): void {
    if (!this.map) return;
    this.map.zoomOut({ duration: 300 });
  }

  /**
   * Fits camera to route bounds with comfortable padding.
   */
  public fitRoute(points: ActivityPoint[], padding = 40): void {
    if (!this.map || !points || points.length === 0) return;

    if (points.length === 1) {
      this.setCenter(points[0].latitude, points[0].longitude, 16, { animate: true });
      return;
    }

    const bounds = new maplibregl.LngLatBounds();
    for (const p of points) {
      bounds.extend([p.longitude, p.latitude]);
    }

    this.map.fitBounds(bounds, {
      padding,
      maxZoom: 17,
      duration: 800,
    });
  }

  /**
   * Fits camera to territory bounds.
   */
  public fitTerritory(cells: TerritoryCell[], padding = 40): void {
    if (!this.map || !cells || cells.length === 0) return;

    const bounds = new maplibregl.LngLatBounds();
    for (const cell of cells) {
      bounds.extend([cell.bounds.west, cell.bounds.south]);
      bounds.extend([cell.bounds.east, cell.bounds.north]);
    }

    this.map.fitBounds(bounds, {
      padding,
      maxZoom: 16,
      duration: 800,
    });
  }

  /**
   * Retrieves current map viewport bounding box.
   */
  public getBounds(): ViewportBounds {
    if (!this.map) {
      return { north: 90, south: -90, east: 180, west: -180 };
    }
    const bounds = this.map.getBounds();
    return {
      north: bounds.getNorth(),
      south: bounds.getSouth(),
      east: bounds.getEast(),
      west: bounds.getWest(),
    };
  }

  /**
   * Resizes map canvas to match container element.
   */
  public resize(): void {
    if (this.map) {
      this.map.resize();
    }
  }

  /**
   * Destroys MapLibre instance and cleans up event listeners and markers.
   */
  public destroy(): void {
    this.removePinMarkers();
    this.hideReplayMarker();
    if (this.userLocationMarker) {
      this.userLocationMarker.remove();
      this.userLocationMarker = null;
    }
    if (this.map) {
      this.map.remove();
      this.map = null;
    }
    this.isMapLoaded = false;
    this.events = {};
  }
}
