// ─────────────────────────────────────────────────────────────
// MyFitAI — Elevation Profile Component
// Renders an interactive SVG area chart displaying altitude vs distance
// along a GPS activity route, with touch scrub cursor & min/max stats.
// ─────────────────────────────────────────────────────────────

import { useState, useMemo, useRef, useCallback } from 'react';
import type { ActivityPoint } from '../../types/activity';
import { calculateHaversineDistance } from '../../engine/activityCalculations';
import { Mountain } from 'lucide-react';

interface ElevationProfileProps {
  points: ActivityPoint[];
  unitSystem?: 'metric' | 'imperial' | 'METRIC' | 'IMPERIAL';
  className?: string;
  onHoverPoint?: (point: ActivityPoint | null) => void;
}

interface ElevationDataPoint {
  distanceMeters: number;
  altitudeMeters: number;
  rawPoint: ActivityPoint;
}

export default function ElevationProfile({
  points,
  unitSystem = 'METRIC',
  className = '',
  onHoverPoint,
}: ElevationProfileProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  const profileData = useMemo(() => {
    if (!points || points.length < 2) return null;

    // Check if points contain meaningful altitude information
    const validPoints = points.filter(
      p => typeof p.altitude === 'number' && !isNaN(p.altitude)
    );

    if (validPoints.length < 2) return null;

    let cumulativeDistance = 0;
    const data: ElevationDataPoint[] = [];

    for (let i = 0; i < validPoints.length; i++) {
      if (i > 0) {
        const prev = validPoints[i - 1];
        const curr = validPoints[i];
        const d = calculateHaversineDistance(
          prev.latitude,
          prev.longitude,
          curr.latitude,
          curr.longitude
        );
        cumulativeDistance += d;
      }

      data.push({
        distanceMeters: cumulativeDistance,
        altitudeMeters: validPoints[i].altitude!,
        rawPoint: validPoints[i],
      });
    }

    if (data.length < 2) return null;

    // Apply light 3-point moving average smoothing to eliminate GPS jitter
    const smoothed: ElevationDataPoint[] = data.map((pt, i, arr) => {
      const prev = arr[Math.max(0, i - 1)].altitudeMeters;
      const curr = pt.altitudeMeters;
      const next = arr[Math.min(arr.length - 1, i + 1)].altitudeMeters;
      return {
        ...pt,
        altitudeMeters: (prev + curr * 2 + next) / 4,
      };
    });

    const altitudes = smoothed.map(d => d.altitudeMeters);
    const minAlt = Math.min(...altitudes);
    const maxAlt = Math.max(...altitudes);
    const totalDist = smoothed[smoothed.length - 1].distanceMeters;

    // If total elevation change is negligible (< 1.5m), don't show an artificial cliff
    const altRange = Math.max(8, maxAlt - minAlt);

    return {
      points: smoothed,
      minAlt,
      maxAlt,
      altRange,
      totalDist,
    };
  }, [points]);

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!profileData || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const clientX = e.clientX;
      const relX = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
      const targetDist = relX * profileData.totalDist;

      // Find closest point by binary search or find
      let closestIdx = 0;
      let minDiff = Infinity;
      for (let i = 0; i < profileData.points.length; i++) {
        const diff = Math.abs(profileData.points[i].distanceMeters - targetDist);
        if (diff < minDiff) {
          minDiff = diff;
          closestIdx = i;
        }
      }

      setHoverIndex(closestIdx);
      if (onHoverPoint) {
        onHoverPoint(profileData.points[closestIdx].rawPoint);
      }
    },
    [profileData, onHoverPoint]
  );

  const handlePointerLeave = useCallback(() => {
    setHoverIndex(null);
    if (onHoverPoint) onHoverPoint(null);
  }, [onHoverPoint]);

  if (!profileData || profileData.points.length < 2) {
    return null;
  }

  const { points: dataPoints, minAlt, maxAlt, altRange, totalDist } = profileData;
  const isImperial = unitSystem?.toLowerCase() === 'imperial';

  // Format values according to unit system
  const toElevUnit = (meters: number) => {
    return isImperial ? `${Math.round(meters * 3.28084)} ft` : `${Math.round(meters)} m`;
  };

  const toDistUnit = (meters: number) => {
    if (isImperial) {
      const miles = meters / 1609.344;
      return `${miles.toFixed(2)} mi`;
    }
    const km = meters / 1000;
    return `${km.toFixed(2)} km`;
  };

  const svgWidth = 500;
  const svgHeight = 120;
  const paddingBottom = 16;
  const paddingTop = 12;
  const usableHeight = svgHeight - paddingTop - paddingBottom;

  // Build SVG polygon points
  const coords = dataPoints.map(pt => {
    const x = totalDist > 0 ? (pt.distanceMeters / totalDist) * svgWidth : 0;
    const y =
      svgHeight -
      paddingBottom -
      ((pt.altitudeMeters - minAlt) / altRange) * usableHeight;
    return { x, y, pt };
  });

  const pathD = coords.reduce((acc, curr, idx) => {
    return `${acc} ${idx === 0 ? 'M' : 'L'} ${curr.x.toFixed(1)},${curr.y.toFixed(1)}`;
  }, '');

  const areaD = `${pathD} L ${svgWidth},${svgHeight - paddingBottom} L 0,${svgHeight - paddingBottom} Z`;

  const activePoint = hoverIndex !== null ? coords[hoverIndex] : null;

  return (
    <div
      ref={containerRef}
      className={`relative rounded-2xl bg-[var(--color-surface-container)] border border-white/[0.06] p-4 select-none touch-none ${className}`}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-on-surface">
          <Mountain className="w-4 h-4 text-[#30D158]" />
          <span>Elevation Profile</span>
        </div>
        <div className="flex items-center gap-3 text-[11px] font-mono text-on-surface-variant">
          <span>Min: <strong className="text-on-surface">{toElevUnit(minAlt)}</strong></span>
          <span>Max: <strong className="text-on-surface">{toElevUnit(maxAlt)}</strong></span>
        </div>
      </div>

      <div className="relative w-full h-[120px] overflow-hidden">
        <svg
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          preserveAspectRatio="none"
          className="w-full h-full"
        >
          <defs>
            <linearGradient id="elevGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#6FFB85" stopOpacity="0.35" />
              <stop offset="80%" stopColor="#00E5FF" stopOpacity="0.08" />
              <stop offset="100%" stopColor="#00E5FF" stopOpacity="0" />
            </linearGradient>
            <linearGradient id="strokeGradient" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#6FFB85" />
              <stop offset="100%" stopColor="#00E5FF" />
            </linearGradient>
          </defs>

          {/* Shaded Area */}
          <path d={areaD} fill="url(#elevGradient)" />

          {/* Elevation Stroke Line */}
          <path
            d={pathD}
            fill="none"
            stroke="url(#strokeGradient)"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Baseline horizontal line */}
          <line
            x1="0"
            y1={svgHeight - paddingBottom}
            x2={svgWidth}
            y2={svgHeight - paddingBottom}
            stroke="rgba(255,255,255,0.08)"
            strokeWidth="1"
          />

          {/* Hover Crosshair & Dot */}
          {activePoint && (
            <g>
              <line
                x1={activePoint.x}
                y1={0}
                x2={activePoint.x}
                y2={svgHeight - paddingBottom}
                stroke="#6FFB85"
                strokeWidth="1.5"
                strokeDasharray="3 3"
              />
              <circle
                cx={activePoint.x}
                cy={activePoint.y}
                r="4.5"
                fill="#6FFB85"
                stroke="#000"
                strokeWidth="2"
              />
            </g>
          )}
        </svg>

        {/* Interactive Scrubbing Tooltip */}
        {activePoint && (
          <div
            className="absolute top-1 pointer-events-none transform -translate-x-1/2 px-2 py-1 rounded-lg bg-black/90 border border-white/20 text-[10px] text-white font-mono shadow-xl backdrop-blur-md flex items-center gap-2 z-10"
            style={{
              left: `${(activePoint.x / svgWidth) * 100}%`,
            }}
          >
            <span>{toDistUnit(activePoint.pt.distanceMeters)}</span>
            <span className="text-[#6FFB85] font-bold">
              {toElevUnit(activePoint.pt.altitudeMeters)}
            </span>
          </div>
        )}
      </div>

      {/* Axis Distance Labels */}
      <div className="flex justify-between text-[10px] font-mono text-on-surface-variant mt-1">
        <span>0 {isImperial ? 'mi' : 'km'}</span>
        <span>{toDistUnit(totalDist)}</span>
      </div>
    </div>
  );
}
