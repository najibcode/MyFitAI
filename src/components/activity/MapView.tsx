// ─────────────────────────────────────────────────────────────
// MyFitAI — Interactive Map & Territory Renderer
// High-performance Canvas/SVG map with Web Mercator tile projection,
// viewport-based territory cell polygons, neon route polyline,
// live location dot with pulse animation, and touch pan/zoom.
// ─────────────────────────────────────────────────────────────

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import type { ActivityPoint, TerritoryCell } from '../../types/activity';
import {
  MAP_PROVIDERS,
  latLngToPixel,
  pixelToLatLng,
  calculateRouteBoundingBox,
  filterTerritoryByViewport,
  type ViewportBounds,
} from '../../services/activity/MapService';

interface MapViewProps {
  currentLocation?: ActivityPoint | null;
  routePoints?: ActivityPoint[];
  territoryCells?: TerritoryCell[];
  interactive?: boolean;
  followUser?: boolean;
  height?: string | number;
  className?: string;
  providerId?: 'cartoDark' | 'osmStandard';
  showTerritory?: boolean;
  zoomLevel?: number;
}

export default function MapView({
  currentLocation,
  routePoints = [],
  territoryCells = [],
  interactive = true,
  followUser = true,
  height = 340,
  className = '',
  providerId = 'cartoDark',
  showTerritory = true,
  zoomLevel: initialZoom = 15,
}: MapViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 400, height: 340 });

  // Map state (center lat/lng and zoom)
  const [center, setCenter] = useState<{ lat: number; lng: number }>(() => {
    if (currentLocation) return { lat: currentLocation.latitude, lng: currentLocation.longitude };
    if (routePoints.length > 0) return { lat: routePoints[0].latitude, lng: routePoints[0].longitude };
    return { lat: 28.6139, lng: 77.209 }; // Default coordinates
  });

  const [zoom, setZoom] = useState<number>(initialZoom);
  const [isFollowing, setIsFollowing] = useState<boolean>(followUser);

  // Drag interaction state
  const isDraggingRef = useRef(false);
  const dragStartRef = useRef({ x: 0, y: 0, centerLat: center.lat, centerLng: center.lng });

  // Update container dimensions on mount / resize
  useEffect(() => {
    if (!containerRef.current) return;
    const updateSize = () => {
      if (containerRef.current) {
        const { clientWidth, clientHeight } = containerRef.current;
        setDimensions({
          width: clientWidth || 400,
          height: clientHeight || (typeof height === 'number' ? height : 340),
        });
      }
    };
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, [height]);

  // Center on user location if following is enabled
  useEffect(() => {
    if (isFollowing && currentLocation) {
      setCenter({ lat: currentLocation.latitude, lng: currentLocation.longitude });
    }
  }, [currentLocation, isFollowing]);

  // Auto-fit to route if no current location and points exist
  useEffect(() => {
    if (!currentLocation && routePoints.length >= 2) {
      const bbox = calculateRouteBoundingBox(routePoints, 0.2);
      setCenter({
        lat: (bbox.north + bbox.south) / 2,
        lng: (bbox.east + bbox.west) / 2,
      });
    }
  }, [routePoints, currentLocation]);

  const provider = MAP_PROVIDERS[providerId] || MAP_PROVIDERS.cartoDark;

  // Compute active viewport bounds
  const currentViewport: ViewportBounds = useMemo(() => {
    const centerPx = latLngToPixel(center.lat, center.lng, zoom);
    const halfW = dimensions.width / 2;
    const halfH = dimensions.height / 2;

    const nw = pixelToLatLng(centerPx.x - halfW, centerPx.y - halfH, zoom);
    const se = pixelToLatLng(centerPx.x + halfW, centerPx.y + halfH, zoom);

    return {
      north: nw.lat,
      south: se.lat,
      west: nw.lng,
      east: se.lng,
    };
  }, [center, zoom, dimensions]);

  // Filter visible territory cells
  const visibleTerritory = useMemo(() => {
    if (!showTerritory || territoryCells.length === 0) return [];
    return filterTerritoryByViewport(territoryCells, currentViewport);
  }, [territoryCells, currentViewport, showTerritory]);

  // Compute map tiles for viewport
  const tiles = useMemo(() => {
    const tileSize = 256;
    const centerPx = latLngToPixel(center.lat, center.lng, zoom, tileSize);

    const minX = Math.floor((centerPx.x - dimensions.width / 2) / tileSize);
    const maxX = Math.floor((centerPx.x + dimensions.width / 2) / tileSize);
    const minY = Math.floor((centerPx.y - dimensions.height / 2) / tileSize);
    const maxY = Math.floor((centerPx.y + dimensions.height / 2) / tileSize);

    const tileList: { key: string; url: string; x: number; y: number }[] = [];
    const maxTile = Math.pow(2, zoom) - 1;

    for (let tx = minX; tx <= maxX; tx++) {
      for (let ty = minY; ty <= maxY; ty++) {
        if (ty < 0 || ty > maxTile) continue;
        const normX = ((tx % (maxTile + 1)) + (maxTile + 1)) % (maxTile + 1);

        const screenX = tx * tileSize - (centerPx.x - dimensions.width / 2);
        const screenY = ty * tileSize - (centerPx.y - dimensions.height / 2);

        tileList.push({
          key: `${zoom}_${normX}_${ty}`,
          url: provider.getTileUrl(normX, ty, zoom),
          x: Math.round(screenX),
          y: Math.round(screenY),
        });
      }
    }

    return tileList;
  }, [center, zoom, dimensions, provider]);

  // Convert lat/lng to container pixel coordinates
  const projectToScreen = useCallback(
    (lat: number, lng: number): { x: number; y: number } => {
      const centerPx = latLngToPixel(center.lat, center.lng, zoom);
      const targetPx = latLngToPixel(lat, lng, zoom);

      return {
        x: dimensions.width / 2 + (targetPx.x - centerPx.x),
        y: dimensions.height / 2 + (targetPx.y - centerPx.y),
      };
    },
    [center, zoom, dimensions]
  );

  // SVG route path
  const routeSvgPath = useMemo(() => {
    if (!routePoints || routePoints.length < 2) return '';
    const screenPts = routePoints.map(p => projectToScreen(p.latitude, p.longitude));
    let path = `M ${screenPts[0].x.toFixed(1)} ${screenPts[0].y.toFixed(1)}`;
    for (let i = 1; i < screenPts.length; i++) {
      path += ` L ${screenPts[i].x.toFixed(1)} ${screenPts[i].y.toFixed(1)}`;
    }
    return path;
  }, [routePoints, projectToScreen]);

  // Handle Drag / Pan Events
  const handlePointerDown = (e: React.PointerEvent) => {
    if (!interactive) return;
    isDraggingRef.current = true;
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      centerLat: center.lat,
      centerLng: center.lng,
    };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!interactive || !isDraggingRef.current) return;
    const dx = e.clientX - dragStartRef.current.x;
    const dy = e.clientY - dragStartRef.current.y;

    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
      setIsFollowing(false);
      const startPx = latLngToPixel(dragStartRef.current.centerLat, dragStartRef.current.centerLng, zoom);
      const newCenter = pixelToLatLng(startPx.x - dx, startPx.y - dy, zoom);
      setCenter(newCenter);
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!interactive) return;
    isDraggingRef.current = false;
    try {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      // Non-fatal
    }
  };

  const handleZoomIn = () => setZoom(z => Math.min(18, z + 1));
  const handleZoomOut = () => setZoom(z => Math.max(11, z - 1));
  const handleRecenter = () => {
    if (currentLocation) {
      setCenter({ lat: currentLocation.latitude, lng: currentLocation.longitude });
      setIsFollowing(true);
    } else if (routePoints.length > 0) {
      const bbox = calculateRouteBoundingBox(routePoints, 0.2);
      setCenter({
        lat: (bbox.north + bbox.south) / 2,
        lng: (bbox.east + bbox.west) / 2,
      });
      setIsFollowing(true);
    }
  };

  return (
    <div
      ref={containerRef}
      style={{ height }}
      className={`relative w-full rounded-2xl overflow-hidden bg-[#121418] select-none touch-none border border-white/[0.06] ${className}`}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
    >
      {/* 1. Base Map Tile Layer */}
      <div className="absolute inset-0 pointer-events-none">
        {tiles.map(tile => (
          <img
            key={tile.key}
            src={tile.url}
            alt=""
            loading="lazy"
            className="absolute w-[256px] h-[256px] opacity-80 transition-opacity duration-300"
            style={{
              transform: `translate(${tile.x}px, ${tile.y}px)`,
            }}
          />
        ))}
      </div>

      {/* 2. SVG Vector Layer (Territory Cells + Route Polylines + Markers) */}
      <svg
        className="absolute inset-0 w-full h-full pointer-events-none"
        width={dimensions.width}
        height={dimensions.height}
      >
        <defs>
          <filter id="neon-glow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="0" stdDeviation="3" floodColor="#6FFB85" floodOpacity="0.8" />
          </filter>
        </defs>

        {/* Territory Cell Polygons */}
        {visibleTerritory.map(cell => {
          const nw = projectToScreen(cell.bounds.north, cell.bounds.west);
          const ne = projectToScreen(cell.bounds.north, cell.bounds.east);
          const se = projectToScreen(cell.bounds.south, cell.bounds.east);
          const sw = projectToScreen(cell.bounds.south, cell.bounds.west);

          const polyPath = `M ${nw.x.toFixed(1)} ${nw.y.toFixed(1)} L ${ne.x.toFixed(1)} ${ne.y.toFixed(1)} L ${se.x.toFixed(1)} ${se.y.toFixed(1)} L ${sw.x.toFixed(1)} ${sw.y.toFixed(1)} Z`;
          const isDefended = cell.defendedCount > 0;

          return (
            <path
              key={cell.cellId}
              d={polyPath}
              fill={isDefended ? '#FBBF24' : '#6FFB85'}
              fillOpacity={0.22}
              stroke={isDefended ? '#FBBF24' : '#6FFB85'}
              strokeWidth={1.5}
              strokeOpacity={0.65}
            />
          );
        })}

        {/* Route Polyline */}
        {routeSvgPath && (
          <>
            <path
              d={routeSvgPath}
              fill="none"
              stroke="#6FFB85"
              strokeWidth="5"
              strokeLinecap="round"
              strokeLinejoin="round"
              filter="url(#neon-glow)"
            />
            <path
              d={routeSvgPath}
              fill="none"
              stroke="#ffffff"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </>
        )}

        {/* Start Point Marker */}
        {routePoints.length > 0 && (
          <g transform={`translate(${projectToScreen(routePoints[0].latitude, routePoints[0].longitude).x}, ${projectToScreen(routePoints[0].latitude, routePoints[0].longitude).y})`}>
            <circle r="7" fill="#6FFB85" stroke="#121418" strokeWidth="2" />
            <circle r="3" fill="#121418" />
          </g>
        )}

        {/* Current Location Marker with Pulse Effect */}
        {currentLocation && (
          <g transform={`translate(${projectToScreen(currentLocation.latitude, currentLocation.longitude).x}, ${projectToScreen(currentLocation.latitude, currentLocation.longitude).y})`}>
            {/* Accuracy ring */}
            {currentLocation.accuracy && currentLocation.accuracy <= 25 && (
              <circle
                r={Math.min(40, Math.max(12, currentLocation.accuracy * 1.2))}
                fill="#60A5FA"
                fillOpacity="0.15"
                stroke="#60A5FA"
                strokeOpacity="0.4"
                strokeWidth="1"
              />
            )}
            <circle r="12" fill="#6FFB85" fillOpacity="0.3" className="animate-ping" />
            <circle r="7" fill="#6FFB85" stroke="#ffffff" strokeWidth="2.5" />
          </g>
        )}
      </svg>

      {/* 3. Map Controls Overlay */}
      {interactive && (
        <div className="absolute top-3 right-3 flex flex-col gap-2 z-20">
          <button
            type="button"
            onClick={handleZoomIn}
            className="w-8 h-8 rounded-xl bg-[var(--color-surface-container)]/90 backdrop-blur-md text-on-surface flex items-center justify-center border border-white/[0.08] hover:bg-white/[0.1] active:scale-95 transition-all text-sm font-bold shadow-lg"
            title="Zoom In"
          >
            +
          </button>
          <button
            type="button"
            onClick={handleZoomOut}
            className="w-8 h-8 rounded-xl bg-[var(--color-surface-container)]/90 backdrop-blur-md text-on-surface flex items-center justify-center border border-white/[0.08] hover:bg-white/[0.1] active:scale-95 transition-all text-sm font-bold shadow-lg"
            title="Zoom Out"
          >
            −
          </button>
          <button
            type="button"
            onClick={handleRecenter}
            className={`w-8 h-8 rounded-xl backdrop-blur-md flex items-center justify-center border transition-all active:scale-95 shadow-lg ${
              isFollowing
                ? 'bg-primary text-black border-primary'
                : 'bg-[var(--color-surface-container)]/90 text-on-surface border-white/[0.08] hover:bg-white/[0.1]'
            }`}
            title="Recenter"
          >
            <span className="material-symbols-outlined text-[17px]">my_location</span>
          </button>
        </div>
      )}

      {/* 4. Map Attribution Badge */}
      <div className="absolute bottom-1 right-2 px-1.5 py-0.5 rounded bg-black/60 text-[8px] text-white/40 pointer-events-none z-10">
        {provider.attribution}
      </div>
    </div>
  );
}
