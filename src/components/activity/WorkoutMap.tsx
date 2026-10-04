// ─────────────────────────────────────────────────────────────
// MyFitAI — Production WorkoutMap Component
// Built on MapLibre GL JS and OpenFreeMap (Zero API Key required).
// Supports Live Tracking, Activity Details, Territory Polygons,
// Route Replay animation, Dark/Light athletic themes,
// and accessible OpenStreetMap attribution.
// ─────────────────────────────────────────────────────────────

import { useState, useEffect, useRef } from 'react';
import type { ActivityPoint, TerritoryCell, GPSQuality } from '../../types/activity';
import { MapService } from '../../services/map/MapService';
import type { MapTheme, ViewportBounds } from '../../services/map/MapConfig';
import { defaultMapProvider } from '../../services/map/OpenFreeMapProvider';
import { formatDuration, formatDistance, formatPace } from '../../engine/activityCalculations';

export type MapMode =
  | 'live'
  | 'details'
  | 'territory'
  | 'preview'
  | 'history'
  | 'fullscreen';

export interface WorkoutMapProps {
  mode?: MapMode;
  currentLocation?: ActivityPoint | null;
  routePoints?: ActivityPoint[];
  territoryCells?: TerritoryCell[];
  interactive?: boolean;
  followUser?: boolean;
  height?: string | number;
  className?: string;
  theme?: MapTheme;
  gpsQuality?: GPSQuality;
  showControls?: boolean;
  showMetricsOverlay?: boolean;
  metrics?: {
    distanceMeters?: number;
    durationSeconds?: number;
    paceSecondsPerKm?: number;
    elevationGainMeters?: number;
  };
  showAttribution?: boolean;
  showTerritory?: boolean;
  replayEnabled?: boolean;
  onViewportChange?: (bounds: ViewportBounds) => void;
  onMapReady?: (mapService: MapService) => void;
}

export default function WorkoutMap({
  mode = 'live',
  currentLocation = null,
  routePoints = [],
  territoryCells = [],
  interactive = true,
  followUser = true,
  height = 360,
  className = '',
  theme = 'dark',
  gpsQuality,
  showControls = true,
  showMetricsOverlay = false,
  metrics,
  showAttribution = true,
  showTerritory = true,
  replayEnabled = false,
  onViewportChange,
  onMapReady,
}: WorkoutMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapServiceRef = useRef<MapService | null>(null);

  const [mapLoaded, setMapLoaded] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);
  const [isFollowing, setIsFollowing] = useState(followUser);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [currentTheme, setCurrentTheme] = useState<MapTheme>(theme);
  const [showTerritoryLayers, setShowTerritoryLayers] = useState(showTerritory);

  // Route Replay State
  const [isReplaying, setIsReplaying] = useState(false);
  const [replayIndex, setReplayIndex] = useState(0);
  const [replaySpeed, setReplaySpeed] = useState<1 | 2 | 5>(1);
  const replayTimerRef = useRef<any>(null);

  // Initialize MapService on mount
  useEffect(() => {
    if (!containerRef.current) return;

    const mapService = new MapService(defaultMapProvider);
    mapServiceRef.current = mapService;

    const initialCenter = currentLocation
      ? { lat: currentLocation.latitude, lng: currentLocation.longitude }
      : routePoints.length > 0
      ? { lat: routePoints[0].latitude, lng: routePoints[0].longitude }
      : territoryCells.length > 0
      ? { lat: territoryCells[0].center.lat, lng: territoryCells[0].center.lng }
      : undefined;

    mapService
      .initialize(
        containerRef.current,
        {
          center: initialCenter,
          theme: currentTheme,
          interactive,
        },
        {
          onLoad: () => {
            setMapLoaded(true);
            setMapError(null);
            onMapReady?.(mapService);
          },
          onUserDrag: () => {
            setIsFollowing(false);
          },
          onViewportChange: bounds => {
            onViewportChange?.(bounds);
          },
          onError: err => {
            console.warn('[WorkoutMap] MapLibre event notice:', err.message);
          },
        }
      )
      .catch(err => {
        setMapError(err.message || 'Unable to initialize map.');
      });

    return () => {
      if (replayTimerRef.current) clearInterval(replayTimerRef.current);
      mapService.destroy();
      mapServiceRef.current = null;
    };
  }, []); // Mount only once

  // Synchronize Theme Changes
  useEffect(() => {
    if (mapServiceRef.current && mapLoaded) {
      mapServiceRef.current.setTheme(currentTheme);
    }
  }, [currentTheme, mapLoaded]);

  // Synchronize Live Location
  useEffect(() => {
    if (!mapServiceRef.current) return;
    mapServiceRef.current.setUserLocation(currentLocation, isFollowing);
  }, [currentLocation, isFollowing]);

  // Synchronize Route Points
  useEffect(() => {
    if (!mapServiceRef.current) return;
    mapServiceRef.current.drawRoute(routePoints);

    // In details mode, fit complete route
    if (mode === 'details' && routePoints.length >= 2) {
      mapServiceRef.current.fitRoute(routePoints, 40);
      const lastPt = routePoints[routePoints.length - 1];
      mapServiceRef.current.showFinishMarker(lastPt);
    }
  }, [routePoints, mode]);

  // Synchronize Territory Polygons
  useEffect(() => {
    if (!mapServiceRef.current) return;
    if (showTerritoryLayers && territoryCells.length > 0) {
      mapServiceRef.current.showTerritoryPolygons(territoryCells);
      if (mode === 'territory' && routePoints.length === 0) {
        mapServiceRef.current.fitTerritory(territoryCells, 40);
      }
    } else {
      mapServiceRef.current.hideTerritoryPolygons();
    }
  }, [territoryCells, showTerritoryLayers, mode, routePoints.length]);

  // Controls Handlers
  const handleZoomIn = () => mapServiceRef.current?.zoomIn();
  const handleZoomOut = () => mapServiceRef.current?.zoomOut();
  const handleRecenter = () => {
    if (currentLocation) {
      mapServiceRef.current?.setCenter(currentLocation.latitude, currentLocation.longitude, 16, { animate: true });
      mapServiceRef.current?.setFollowUser(true);
      setIsFollowing(true);
    } else if (routePoints.length > 0) {
      mapServiceRef.current?.fitRoute(routePoints, 40);
    }
  };

  const handleToggleTheme = () => {
    setCurrentTheme(t => (t === 'dark' ? 'light' : 'dark'));
  };

  const handleToggleFullscreen = () => {
    setIsFullscreen(f => !f);
    setTimeout(() => {
      mapServiceRef.current?.resize();
    }, 150);
  };

  // ── Route Replay Engine ──────────────────────────────────────
  const startReplay = () => {
    if (routePoints.length < 2) return;
    setIsReplaying(true);
    setIsFollowing(false);
  };

  const pauseReplay = () => {
    setIsReplaying(false);
    if (replayTimerRef.current) clearInterval(replayTimerRef.current);
  };

  const restartReplay = () => {
    setReplayIndex(0);
    setIsReplaying(true);
  };

  useEffect(() => {
    if (!isReplaying || routePoints.length < 2) return;

    const intervalMs = Math.max(50, 400 / replaySpeed);
    replayTimerRef.current = setInterval(() => {
      setReplayIndex(curr => {
        if (curr >= routePoints.length - 1) {
          setIsReplaying(false);
          mapServiceRef.current?.hideReplayMarker();
          return curr;
        }
        const next = curr + 1;
        const pt = routePoints[next];
        mapServiceRef.current?.showReplayMarker(pt);
        return next;
      });
    }, intervalMs);

    return () => {
      if (replayTimerRef.current) clearInterval(replayTimerRef.current);
    };
  }, [isReplaying, routePoints, replaySpeed]);


  return (
    <div
      className={`relative w-full overflow-hidden transition-all duration-300 ${
        isFullscreen
          ? 'fixed inset-0 z-50 rounded-0 bg-black h-screen w-screen'
          : `rounded-2xl border border-white/[0.08] bg-[#0E0F12] ${className}`
      }`}
      style={{ height: isFullscreen ? '100vh' : height }}
    >
      {/* 1. MapLibre GL Canvas Container */}
      <div ref={containerRef} className="w-full h-full" />

      {/* 2. Loading & Error Overlays */}
      {!mapLoaded && !mapError && (
        <div className="absolute inset-0 bg-[#0E0F12]/80 backdrop-blur-sm flex flex-col items-center justify-center gap-2.5 z-20 pointer-events-none">
          <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          <span className="text-xs font-semibold tracking-wide text-white/70">
            Loading Map...
          </span>
        </div>
      )}

      {mapError && (
        <div className="absolute inset-0 bg-[#0E0F12]/90 backdrop-blur-md flex flex-col items-center justify-center gap-2 p-4 text-center z-20">
          <span className="material-symbols-outlined text-amber-400 text-3xl">map_error</span>
          <span className="text-xs text-white/80">{mapError}</span>
          <span className="text-[11px] text-white/40">Tracking continues uninterrupted via GPS.</span>
        </div>
      )}

      {/* 3. Top Floating GPS Signal & Layer Badges */}
      <div className="absolute top-3 left-3 flex items-center gap-2 z-10 pointer-events-none">
        {gpsQuality && (
          <div className="px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-md border border-white/10 flex items-center gap-1.5 shadow-lg">
            <span
              className={`w-2 h-2 rounded-full ${
                gpsQuality === 'EXCELLENT'
                  ? 'bg-emerald-400 shadow-[0_0_8px_#34d399]'
                  : gpsQuality === 'GOOD'
                  ? 'bg-lime-400'
                  : gpsQuality === 'WEAK'
                  ? 'bg-amber-400 animate-pulse'
                  : 'bg-red-400 animate-ping'
              }`}
            />
            <span className="text-[10px] font-bold tracking-wider text-white/90">
              GPS {gpsQuality}
            </span>
          </div>
        )}

        {territoryCells.length > 0 && showTerritoryLayers && (
          <div className="px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-md border border-white/10 flex items-center gap-1.5 shadow-lg">
            <span className="material-symbols-outlined text-[12px] text-secondary">flag</span>
            <span className="text-[10px] font-bold text-white/90">
              {territoryCells.length} Territories
            </span>
          </div>
        )}
      </div>

      {/* 4. Map Action Buttons (Thumb-friendly floating stack) */}
      {showControls && (
        <div className="absolute top-3 right-3 flex flex-col gap-2 z-10">
          <button
            type="button"
            onClick={handleZoomIn}
            className="w-9 h-9 rounded-xl bg-black/70 backdrop-blur-md text-white border border-white/15 flex items-center justify-center hover:bg-white/10 active:scale-95 transition-all shadow-lg text-base font-bold"
            title="Zoom In"
            aria-label="Zoom in on map"
          >
            +
          </button>
          <button
            type="button"
            onClick={handleZoomOut}
            className="w-9 h-9 rounded-xl bg-black/70 backdrop-blur-md text-white border border-white/15 flex items-center justify-center hover:bg-white/10 active:scale-95 transition-all shadow-lg text-base font-bold"
            title="Zoom Out"
            aria-label="Zoom out on map"
          >
            −
          </button>
          <button
            type="button"
            onClick={handleRecenter}
            className={`w-9 h-9 rounded-xl backdrop-blur-md flex items-center justify-center border transition-all active:scale-95 shadow-lg ${
              isFollowing
                ? 'bg-primary text-black border-primary font-bold shadow-[0_0_12px_rgba(255,122,0,0.5)]'
                : 'bg-black/70 text-white border-white/15 hover:bg-white/10'
            }`}
            title="Recenter Camera"
            aria-label="Recenter map on current location"
          >
            <span className="material-symbols-outlined text-[18px]">my_location</span>
          </button>
          <button
            type="button"
            onClick={handleToggleTheme}
            className="w-9 h-9 rounded-xl bg-black/70 backdrop-blur-md text-white border border-white/15 flex items-center justify-center hover:bg-white/10 active:scale-95 transition-all shadow-lg"
            title={`Switch to ${currentTheme === 'dark' ? 'Light' : 'Dark'} map`}
            aria-label="Toggle map theme"
          >
            <span className="material-symbols-outlined text-[17px]">
              {currentTheme === 'dark' ? 'light_mode' : 'dark_mode'}
            </span>
          </button>
          {territoryCells.length > 0 && (
            <button
              type="button"
              onClick={() => setShowTerritoryLayers(s => !s)}
              className={`w-9 h-9 rounded-xl backdrop-blur-md flex items-center justify-center border transition-all active:scale-95 shadow-lg ${
                showTerritoryLayers
                  ? 'bg-secondary/20 text-secondary border-secondary/40'
                  : 'bg-black/70 text-white/50 border-white/15'
              }`}
              title="Toggle Territory Layer"
              aria-label="Toggle territory layer"
            >
              <span className="material-symbols-outlined text-[17px]">layers</span>
            </button>
          )}
          <button
            type="button"
            onClick={handleToggleFullscreen}
            className="w-9 h-9 rounded-xl bg-black/70 backdrop-blur-md text-white border border-white/15 flex items-center justify-center hover:bg-white/10 active:scale-95 transition-all shadow-lg"
            title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
            aria-label="Toggle fullscreen map"
          >
            <span className="material-symbols-outlined text-[17px]">
              {isFullscreen ? 'fullscreen_exit' : 'fullscreen'}
            </span>
          </button>
        </div>
      )}

      {/* 5. Live Metrics Overlay (Floating Bottom Card) */}
      {showMetricsOverlay && metrics && (
        <div className="absolute bottom-6 left-3 right-3 z-10 pointer-events-none">
          <div className="mx-auto max-w-sm p-3 rounded-2xl bg-black/80 backdrop-blur-xl border border-white/10 shadow-2xl flex items-center justify-around pointer-events-auto">
            <div className="text-center">
              <span className="text-[10px] uppercase font-bold tracking-wider text-white/50">Distance</span>
              <p className="text-lg font-black text-white leading-tight">
                {formatDistance(metrics.distanceMeters || 0)}
              </p>
            </div>
            <div className="w-[1px] h-8 bg-white/10" />
            <div className="text-center">
              <span className="text-[10px] uppercase font-bold tracking-wider text-white/50">Time</span>
              <p className="text-lg font-black text-white leading-tight">
                {formatDuration(metrics.durationSeconds || 0)}
              </p>
            </div>
            <div className="w-[1px] h-8 bg-white/10" />
            <div className="text-center">
              <span className="text-[10px] uppercase font-bold tracking-wider text-white/50">Pace</span>
              <p className="text-lg font-black text-primary leading-tight">
                {formatPace(metrics.paceSecondsPerKm || 0)}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 6. Route Replay Controls */}
      {replayEnabled && routePoints.length >= 2 && (
        <div className="absolute bottom-6 left-3 right-3 z-10">
          <div className="mx-auto max-w-md p-3.5 rounded-2xl bg-black/85 backdrop-blur-xl border border-white/10 shadow-2xl flex flex-col gap-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={isReplaying ? pauseReplay : startReplay}
                  className="w-9 h-9 rounded-xl bg-primary text-black font-bold flex items-center justify-center active:scale-95 shadow-lg"
                  aria-label={isReplaying ? 'Pause route replay' : 'Play route replay'}
                >
                  <span className="material-symbols-outlined text-[20px]">
                    {isReplaying ? 'pause' : 'play_arrow'}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={restartReplay}
                  className="w-8 h-8 rounded-lg bg-white/10 text-white flex items-center justify-center hover:bg-white/20 active:scale-95"
                  title="Restart Replay"
                  aria-label="Restart route replay"
                >
                  <span className="material-symbols-outlined text-[16px]">replay</span>
                </button>
                <span className="text-xs font-bold text-white/90">Route Replay</span>
              </div>

              {/* Speed Toggles */}
              <div className="flex items-center gap-1 bg-white/10 p-0.5 rounded-lg text-[11px] font-bold">
                {([1, 2, 5] as const).map(speed => (
                  <button
                    key={speed}
                    type="button"
                    onClick={() => setReplaySpeed(speed)}
                    className={`px-2 py-0.5 rounded ${
                      replaySpeed === speed ? 'bg-primary text-black' : 'text-white/60 hover:text-white'
                    }`}
                  >
                    {speed}x
                  </button>
                ))}
              </div>
            </div>

            {/* Timeline Progress Bar */}
            <div className="flex items-center gap-2">
              <input
                type="range"
                min="0"
                max={Math.max(0, routePoints.length - 1)}
                value={replayIndex}
                onChange={e => {
                  const idx = parseInt(e.target.value, 10);
                  setReplayIndex(idx);
                  if (routePoints[idx]) {
                    mapServiceRef.current?.showReplayMarker(routePoints[idx]);
                  }
                }}
                className="w-full accent-primary h-1.5 bg-white/20 rounded-lg cursor-pointer"
              />
              <span className="text-[11px] font-mono text-white/60 min-w-[36px] text-right">
                {Math.round(((replayIndex + 1) / routePoints.length) * 100)}%
              </span>
            </div>
          </div>
        </div>
      )}

      {/* 7. Legal OpenFreeMap & OpenStreetMap Attribution */}
      {showAttribution && (
        <div className="absolute bottom-1 right-2 px-2 py-0.5 rounded bg-black/70 backdrop-blur-sm text-[9px] text-white/50 z-10 pointer-events-none select-none border border-white/5">
          OpenFreeMap © OpenMapTiles | Data from OpenStreetMap
        </div>
      )}
    </div>
  );
}
