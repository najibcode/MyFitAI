// ─────────────────────────────────────────────────────────────
// MyFitAI — Central Activity, GPS & Territory Calculation Engine
// Provides mathematically rigorous algorithms for:
// Haversine distance, speed, pace, elevation filtering, splits,
// Douglas-Peucker route simplification, MET calorie estimation,
// sliding-window PR detection, anti-cheat & anti-farming validation,
// geographic territory grid cells, overlap/defense calculation,
// XP & Level progression, achievements, privacy blurring, GPX/CSV.
// ─────────────────────────────────────────────────────────────

import type {
  ActivityPoint,
  ActivityRoute,
  ActivitySplit,
  ActivityPersonalRecord,
  ActivityAchievement,
  ActivityType,
  TerritoryCell,
  PRCategory,
} from '../types/activity';

const EARTH_RADIUS_METERS = 6371000;

// ── 1. Geodesic Distance (Haversine Formula) ─────────────────

/**
 * Calculates great-circle distance between two coordinates in meters.
 */
export function calculateHaversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  if (lat1 === lat2 && lon1 === lon2) return 0;

  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(EARTH_RADIUS_METERS * c * 10) / 10;
}

// ── 2. Route Processing, Distance & Elevation ─────────────────

/**
 * Computes filtered total distance and elevation gain/loss along a route.
 * Filters stationary GPS noise (< 1.5m jitter) and low-accuracy coordinates (> 35m).
 */
export function processRouteMetrics(points: ActivityPoint[]): {
  distanceMeters: number;
  elevationGainMeters: number;
  elevationLossMeters: number;
  validPoints: ActivityPoint[];
} {
  if (!points || points.length < 2) {
    return {
      distanceMeters: 0,
      elevationGainMeters: 0,
      elevationLossMeters: 0,
      validPoints: points ? [...points] : [],
    };
  }

  let totalDistance = 0;
  let elevationGain = 0;
  let elevationLoss = 0;
  const validPoints: ActivityPoint[] = [];

  // Filter low accuracy points
  const candidatePoints = points.filter(p => !p.accuracy || p.accuracy <= 35);
  if (candidatePoints.length === 0) {
    return { distanceMeters: 0, elevationGainMeters: 0, elevationLossMeters: 0, validPoints: [] };
  }

  validPoints.push(candidatePoints[0]);
  let lastEle = candidatePoints[0].altitude;

  for (let i = 1; i < candidatePoints.length; i++) {
    const prev = validPoints[validPoints.length - 1];
    const curr = candidatePoints[i];

    const dist = calculateHaversineDistance(prev.latitude, prev.longitude, curr.latitude, curr.longitude);
    const timeDiffSeconds = Math.max(0.1, (curr.timestamp - prev.timestamp) / 1000);
    const speed = dist / timeDiffSeconds;

    // Filter unrealistic jumps (e.g. speed > 45 m/s = 162 km/h for running/cycling or jitter < 1.2m)
    if (speed > 50) continue;
    if (dist < 1.2) continue;

    totalDistance += dist;
    validPoints.push(curr);

    // Elevation threshold filter (> 2.5m difference) to eliminate barometric/GPS drift noise
    if (curr.altitude !== undefined && lastEle !== undefined) {
      const eleDiff = curr.altitude - lastEle;
      if (Math.abs(eleDiff) >= 2.5) {
        if (eleDiff > 0) {
          elevationGain += eleDiff;
        } else {
          elevationLoss += Math.abs(eleDiff);
        }
        lastEle = curr.altitude;
      }
    } else if (curr.altitude !== undefined) {
      lastEle = curr.altitude;
    }
  }

  return {
    distanceMeters: Math.round(totalDistance),
    elevationGainMeters: Math.round(elevationGain),
    elevationLossMeters: Math.round(elevationLoss),
    validPoints,
  };
}

// ── 3. Speed, Pace & Formatting Utilities ─────────────────────

/**
 * Calculates pace in seconds per kilometer.
 */
export function calculatePaceSecondsPerKm(distanceMeters: number, durationSeconds: number): number {
  if (distanceMeters <= 0 || durationSeconds <= 0) return 0;
  const km = distanceMeters / 1000;
  return Math.round(durationSeconds / km);
}

/**
 * Formats pace into "M:SS /km" or "M:SS /mi".
 */
export function formatPace(
  secondsPerKm: number,
  unitSystem: 'metric' | 'imperial' = 'metric'
): string {
  if (!secondsPerKm || secondsPerKm <= 0 || !isFinite(secondsPerKm)) {
    return '--:--';
  }

  // Convert to /mi if imperial: 1 mile = 1.60934 km
  const targetSeconds = unitSystem === 'imperial' ? secondsPerKm * 1.60934 : secondsPerKm;

  // Cap absurd pace values for display
  if (targetSeconds > 3600) return '>59:59';

  const mins = Math.floor(targetSeconds / 60);
  const secs = Math.round(targetSeconds % 60);
  const unitLabel = unitSystem === 'imperial' ? '/mi' : '/km';

  return `${mins}:${secs < 10 ? '0' : ''}${secs} ${unitLabel}`;
}

/**
 * Formats speed in "km/h" or "mph".
 */
export function formatSpeed(
  speedKmh: number,
  unitSystem: 'metric' | 'imperial' = 'metric'
): string {
  if (!speedKmh || speedKmh <= 0) return '0.0';
  const val = unitSystem === 'imperial' ? speedKmh * 0.621371 : speedKmh;
  const unit = unitSystem === 'imperial' ? 'mph' : 'km/h';
  return `${val.toFixed(1)} ${unit}`;
}

/**
 * Formats duration seconds into HH:MM:SS or MM:SS.
 */
export function formatDuration(seconds: number): string {
  if (seconds <= 0 || isNaN(seconds)) return '00:00';
  const s = Math.round(seconds);
  const hrs = Math.floor(s / 3600);
  const mins = Math.floor((s % 3600) / 60);
  const secs = s % 60;

  if (hrs > 0) {
    return `${hrs < 10 ? '0' : ''}${hrs}:${mins < 10 ? '0' : ''}${mins}:${secs < 10 ? '0' : ''}${secs}`;
  }
  return `${mins < 10 ? '0' : ''}${mins}:${secs < 10 ? '0' : ''}${secs}`;
}

/**
 * Formats distance meters into "X.XX km" or "X.XX mi".
 */
export function formatDistance(
  meters: number,
  unitSystem: 'metric' | 'imperial' = 'metric'
): string {
  if (meters <= 0 || isNaN(meters)) return unitSystem === 'imperial' ? '0.00 mi' : '0.00 km';
  if (unitSystem === 'imperial') {
    const mi = (meters / 1000) * 0.621371;
    return `${mi.toFixed(2)} mi`;
  }
  const km = meters / 1000;
  return `${km.toFixed(2)} km`;
}

// ── 4. Douglas-Peucker Route Simplification ───────────────────

function perpendicularDistance(
  point: ActivityPoint,
  lineStart: ActivityPoint,
  lineEnd: ActivityPoint
): number {
  const x = point.longitude;
  const y = point.latitude;
  const x1 = lineStart.longitude;
  const y1 = lineStart.latitude;
  const x2 = lineEnd.longitude;
  const y2 = lineEnd.latitude;

  const dx = x2 - x1;
  const dy = y2 - y1;

  if (dx === 0 && dy === 0) {
    return calculateHaversineDistance(y, x, y1, x1);
  }

  const t = ((x - x1) * dx + (y - y1) * dy) / (dx * dx + dy * dy);
  const clampedT = Math.max(0, Math.min(1, t));

  const projX = x1 + clampedT * dx;
  const projY = y1 + clampedT * dy;

  return calculateHaversineDistance(y, x, projY, projX);
}

/**
 * Simplifies a GPS route using Douglas-Peucker algorithm.
 * Reduces storage and rendering overhead by 70-85% while preserving visual fidelity.
 * Epsilon in meters (default ~5m).
 */
export function simplifyRoute(points: ActivityPoint[], epsilonMeters = 5): ActivityPoint[] {
  if (!points || points.length <= 2) return points ? [...points] : [];

  let dmax = 0;
  let index = 0;
  const end = points.length - 1;

  for (let i = 1; i < end; i++) {
    const d = perpendicularDistance(points[i], points[0], points[end]);
    if (d > dmax) {
      index = i;
      dmax = d;
    }
  }

  if (dmax > epsilonMeters) {
    const recResults1 = simplifyRoute(points.slice(0, index + 1), epsilonMeters);
    const recResults2 = simplifyRoute(points.slice(index), epsilonMeters);

    return recResults1.slice(0, recResults1.length - 1).concat(recResults2);
  }

  return [points[0], points[end]];
}

// ── 5. Automatic Splits Generator ─────────────────────────────

/**
 * Calculates 1km (or 1mi) splits across a recorded activity route.
 */
export function generateSplits(
  points: ActivityPoint[],
  unitSystem: 'metric' | 'imperial' = 'metric'
): ActivitySplit[] {
  if (!points || points.length < 2) return [];

  const splitDistanceTarget = unitSystem === 'imperial' ? 1609.34 : 1000;
  const splits: ActivitySplit[] = [];

  let currentSplitDist = 0;
  let currentSplitDuration = 0;
  let currentSplitEleGain = 0;
  let lastEle = points[0].altitude;
  let splitIndex = 1;

  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1];
    const curr = points[i];

    const d = calculateHaversineDistance(prev.latitude, prev.longitude, curr.latitude, curr.longitude);
    const dt = Math.max(0.1, (curr.timestamp - prev.timestamp) / 1000);

    currentSplitDist += d;
    currentSplitDuration += dt;

    if (curr.altitude !== undefined && lastEle !== undefined) {
      const eleDiff = curr.altitude - lastEle;
      if (eleDiff > 1.5) {
        currentSplitEleGain += eleDiff;
        lastEle = curr.altitude;
      } else if (eleDiff < -1.5) {
        lastEle = curr.altitude;
      }
    } else if (curr.altitude !== undefined) {
      lastEle = curr.altitude;
    }

    if (currentSplitDist >= splitDistanceTarget) {
      const pace = calculatePaceSecondsPerKm(currentSplitDist, currentSplitDuration);
      const speed = currentSplitDuration > 0 ? (currentSplitDist / 1000) / (currentSplitDuration / 3600) : 0;

      splits.push({
        splitIndex,
        distanceMeters: Math.round(currentSplitDist),
        durationSeconds: Math.round(currentSplitDuration),
        paceSecondsPerKm: pace,
        speedKmh: Math.round(speed * 10) / 10,
        elevationGainMeters: Math.round(currentSplitEleGain),
      });

      splitIndex++;
      currentSplitDist = 0;
      currentSplitDuration = 0;
      currentSplitEleGain = 0;
    }
  }

  // Final partial split if >= 100 meters
  if (currentSplitDist >= 100) {
    const pace = calculatePaceSecondsPerKm(currentSplitDist, currentSplitDuration);
    const speed = currentSplitDuration > 0 ? (currentSplitDist / 1000) / (currentSplitDuration / 3600) : 0;

    splits.push({
      splitIndex,
      distanceMeters: Math.round(currentSplitDist),
      durationSeconds: Math.round(currentSplitDuration),
      paceSecondsPerKm: pace,
      speedKmh: Math.round(speed * 10) / 10,
      elevationGainMeters: Math.round(currentSplitEleGain),
    });
  }

  return splits;
}

// ── 6. Calorie Estimation (MET-based) ─────────────────────────

export const ACTIVITY_MET_VALUES: Record<ActivityType, number> = {
  RUN: 9.8,
  WALK: 3.8,
  CYCLING: 7.5,
  HIKING: 6.0,
  SWIMMING: 7.0,
  TREADMILL: 8.5,
  INDOOR_CYCLING: 6.8,
  ELLIPTICAL: 5.0,
  ROWING: 7.0,
  OTHER: 5.0,
};

/**
 * Estimates energy expenditure (calories) using metabolic equivalent of task (MET).
 * Formula: Calories = MET * weightInKg * durationInHours.
 */
export function estimateActivityCalories(params: {
  type: ActivityType;
  durationSeconds: number;
  weightKg: number;
  distanceMeters?: number;
}): number {
  const { type, durationSeconds, weightKg, distanceMeters } = params;
  if (durationSeconds <= 0 || weightKg <= 0) return 0;

  const durationHours = durationSeconds / 3600;
  let met = ACTIVITY_MET_VALUES[type] || 6.0;

  // Dynamic MET scaling based on speed for running & cycling
  if (distanceMeters && distanceMeters > 0 && durationHours > 0) {
    const speedKmh = (distanceMeters / 1000) / durationHours;
    if (type === 'RUN') {
      if (speedKmh > 13) met = 12.8;
      else if (speedKmh > 11) met = 11.0;
      else if (speedKmh > 9) met = 9.8;
      else met = 8.0;
    } else if (type === 'CYCLING') {
      if (speedKmh > 25) met = 10.0;
      else if (speedKmh > 20) met = 8.0;
      else if (speedKmh > 15) met = 6.0;
      else met = 4.0;
    } else if (type === 'WALK') {
      if (speedKmh > 5.5) met = 4.5;
      else met = 3.5;
    }
  }

  return Math.round(met * weightKg * durationHours);
}

// ── 7. Personal Records (PR) Detection Engine ─────────────────

const STANDARD_DISTANCES = {
  'fastest_1k': 1000,
  'fastest_mile': 1609.34,
  'fastest_5k': 5000,
  'fastest_10k': 10000,
} as const;

/**
 * Scans a route with a sliding window to detect fastest standard distance intervals.
 */
export function findFastestSegment(points: ActivityPoint[], targetDistanceMeters: number): number | null {
  if (!points || points.length < 2) return null;

  let left = 0;
  let currentDist = 0;
  let minDuration: number | null = null;

  for (let right = 1; right < points.length; right++) {
    const d = calculateHaversineDistance(
      points[right - 1].latitude,
      points[right - 1].longitude,
      points[right].latitude,
      points[right].longitude
    );
    currentDist += d;

    // Shrink window from left while maintaining target distance
    while (currentDist >= targetDistanceMeters && left < right) {
      const duration = (points[right].timestamp - points[left].timestamp) / 1000;
      if (duration > 0 && (minDuration === null || duration < minDuration)) {
        minDuration = duration;
      }

      const shrinkD = calculateHaversineDistance(
        points[left].latitude,
        points[left].longitude,
        points[left + 1].latitude,
        points[left + 1].longitude
      );
      currentDist -= shrinkD;
      left++;
    }
  }

  return minDuration ? Math.round(minDuration) : null;
}

/**
 * Checks completed activity against user's existing PR records and returns new records.
 */
export function detectActivityPRs(params: {
  activityId: string;
  activityType: ActivityType;
  distanceMeters: number;
  durationSeconds: number;
  elevationGainMeters: number;
  points?: ActivityPoint[];
  date: string;
  existingPRs: ActivityPersonalRecord[];
}): ActivityPersonalRecord[] {
  const {
    activityId,
    activityType,
    distanceMeters,
    durationSeconds,
    elevationGainMeters,
    points,
    date,
    existingPRs,
  } = params;

  const newPRs: ActivityPersonalRecord[] = [];
  const typePRs = existingPRs.filter(p => p.activityType === activityType);

  const getRecord = (cat: PRCategory) => typePRs.find(p => p.category === cat);

  // 1. Longest Distance
  const longestDistPR = getRecord('longest_distance');
  if (!longestDistPR || distanceMeters > longestDistPR.value) {
    if (distanceMeters >= 500) {
      newPRs.push({
        id: `pr_${activityType}_longest_distance_${Date.now()}`,
        activityType,
        category: 'longest_distance',
        value: distanceMeters,
        formattedValue: formatDistance(distanceMeters),
        activityId,
        date,
      });
    }
  }

  // 2. Longest Duration
  const longestDurationPR = getRecord('longest_duration');
  if (!longestDurationPR || durationSeconds > longestDurationPR.value) {
    if (durationSeconds >= 600) {
      newPRs.push({
        id: `pr_${activityType}_longest_duration_${Date.now()}`,
        activityType,
        category: 'longest_duration',
        value: durationSeconds,
        formattedValue: formatDuration(durationSeconds),
        activityId,
        date,
      });
    }
  }

  // 3. Highest Elevation
  const highestElePR = getRecord('highest_elevation');
  if (!highestElePR || elevationGainMeters > highestElePR.value) {
    if (elevationGainMeters >= 50) {
      newPRs.push({
        id: `pr_${activityType}_highest_elevation_${Date.now()}`,
        activityType,
        category: 'highest_elevation',
        value: elevationGainMeters,
        formattedValue: `+${elevationGainMeters} m`,
        activityId,
        date,
      });
    }
  }

  // 4. Standard Distance Intervals (Fastest 1k, Mile, 5k, 10k)
  if (points && points.length > 5) {
    for (const [cat, targetDist] of Object.entries(STANDARD_DISTANCES)) {
      if (distanceMeters >= targetDist) {
        const segDuration = findFastestSegment(points, targetDist);
        if (segDuration !== null) {
          const currPR = getRecord(cat as PRCategory);
          if (!currPR || segDuration < currPR.value) {
            newPRs.push({
              id: `pr_${activityType}_${cat}_${Date.now()}`,
              activityType,
              category: cat as PRCategory,
              value: segDuration,
              formattedValue: formatDuration(segDuration),
              activityId,
              date,
            });
          }
        }
      }
    }
  }

  return newPRs;
}

// ── 8. Anti-Cheat & GPS Validation Engine ──────────────────────

export interface AntiCheatResult {
  isValid: boolean;
  warnings: string[];
  flags: string[];
}

/**
 * Validates GPS activity points against suspicious or impossible behavior:
 * - Unrealistic peak speed
 * - Teleportation jumps
 * - Inverted timestamps
 */
export function validateActivityGPS(
  type: ActivityType,
  points: ActivityPoint[]
): AntiCheatResult {
  const warnings: string[] = [];
  const flags: string[] = [];

  if (!points || points.length < 2) {
    return { isValid: true, warnings: [], flags: [] };
  }

  const speedLimits: Record<ActivityType, number> = {
    RUN: 12.5, // ~45 km/h (Usain Bolt sprint peak)
    WALK: 4.5, // ~16 km/h
    CYCLING: 28.0, // ~100 km/h (steep downhill cycling)
    HIKING: 5.0,
    SWIMMING: 3.0,
    TREADMILL: 10.0,
    INDOOR_CYCLING: 25.0,
    ELLIPTICAL: 8.0,
    ROWING: 8.0,
    OTHER: 25.0,
  };

  const maxAllowedSpeed = speedLimits[type] || 25.0;

  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1];
    const curr = points[i];

    if (curr.timestamp <= prev.timestamp) {
      warnings.push(`Non-monotonic timestamp detected between points ${i - 1} and ${i}.`);
    }

    const dist = calculateHaversineDistance(prev.latitude, prev.longitude, curr.latitude, curr.longitude);
    const dt = Math.max(0.1, (curr.timestamp - prev.timestamp) / 1000);
    const speed = dist / dt;

    if (speed > maxAllowedSpeed * 1.5) {
      flags.push(`Impossible instantaneous speed of ${Math.round(speed * 3.6)} km/h detected.`);
      break;
    }
  }

  return {
    isValid: flags.length === 0,
    warnings,
    flags,
  };
}

// ── 9. Territory Grid & Geometry Engine ────────────────────────

// Grid resolution: ~0.001 degrees latitude is ~111m, longitude is ~100m.
// 1 cell is approximately 0.01 km2 (1 hectare).
export const GRID_SIZE_DEG = 0.001;

/**
 * Returns a canonical string key for a geographic coordinate's grid cell.
 */
export function getGridCellKey(lat: number, lng: number): string {
  const latIndex = Math.floor(lat / GRID_SIZE_DEG);
  const lngIndex = Math.floor(lng / GRID_SIZE_DEG);
  return `cell_${latIndex}_${lngIndex}`;
}

/**
 * Calculates bounding box and center for a grid cell key.
 */
export function getGridCellGeometry(gridKey: string): {
  center: { lat: number; lng: number };
  bounds: { north: number; south: number; east: number; west: number };
  areaKm2: number;
} {
  const parts = gridKey.replace('cell_', '').split('_');
  const latIndex = parseInt(parts[0], 10);
  const lngIndex = parseInt(parts[1], 10);

  const south = latIndex * GRID_SIZE_DEG;
  const north = south + GRID_SIZE_DEG;
  const west = lngIndex * GRID_SIZE_DEG;
  const east = west + GRID_SIZE_DEG;

  const center = {
    lat: (south + north) / 2,
    lng: (west + east) / 2,
  };

  // Approximate area of standard cell in km²
  const heightKm = 0.111;
  const widthKm = 0.111 * Math.cos((center.lat * Math.PI) / 180);
  const areaKm2 = Math.round(heightKm * widthKm * 1000) / 1000;

  return {
    center,
    bounds: { north, south, east, west },
    areaKm2: Math.max(0.008, areaKm2),
  };
}

/**
 * Converts a route polyline into continuous touched territory grid cells.
 * Interpolates between points so fast movement does not leave gaps.
 */
export function generateTerritoryCellsFromRoute(
  points: ActivityPoint[],
  ownerId: string
): TerritoryCell[] {
  if (!points || points.length < 2) return [];

  const touchedKeys = new Set<string>();

  for (let i = 1; i < points.length; i++) {
    const p1 = points[i - 1];
    const p2 = points[i];

    const dist = calculateHaversineDistance(p1.latitude, p1.longitude, p2.latitude, p2.longitude);
    // Step size ~50m for interpolation
    const steps = Math.max(1, Math.ceil(dist / 50));

    for (let s = 0; s <= steps; s++) {
      const t = s / steps;
      const lat = p1.latitude + t * (p2.latitude - p1.latitude);
      const lng = p1.longitude + t * (p2.longitude - p1.longitude);
      touchedKeys.add(getGridCellKey(lat, lng));
    }
  }

  const now = new Date().toISOString();
  const cells: TerritoryCell[] = [];

  for (const key of touchedKeys) {
    const geo = getGridCellGeometry(key);
    cells.push({
      cellId: key,
      gridKey: key,
      center: geo.center,
      bounds: geo.bounds,
      areaKm2: geo.areaKm2,
      ownerId,
      firstCapturedAt: now,
      lastCapturedAt: now,
      captureCount: 1,
      defendedCount: 0,
    });
  }

  return cells;
}

/**
 * Calculates territory capture & defense changes:
 * - Newly captured cells (not previously owned)
 * - Defended cells (already owned, with anti-farming cooldown check)
 */
export function calculateTerritoryImpact(params: {
  touchedCells: TerritoryCell[];
  existingCells: TerritoryCell[];
  minActivityDistanceMeters: number;
}): {
  newlyCapturedCells: TerritoryCell[];
  defendedCells: TerritoryCell[];
  newAreaKm2: number;
  defendedCount: number;
} {
  const { touchedCells, existingCells, minActivityDistanceMeters } = params;

  // Anti-farming check: Minimum 500m required for territory rewards
  if (minActivityDistanceMeters < 500) {
    return {
      newlyCapturedCells: [],
      defendedCells: [],
      newAreaKm2: 0,
      defendedCount: 0,
    };
  }

  const existingMap = new Map<string, TerritoryCell>();
  for (const c of existingCells) {
    existingMap.set(c.gridKey, c);
  }

  const newlyCapturedCells: TerritoryCell[] = [];
  const defendedCells: TerritoryCell[] = [];
  let newAreaKm2 = 0;

  const now = new Date();
  const nowISO = now.toISOString();

  for (const cell of touchedCells) {
    const existing = existingMap.get(cell.gridKey);

    if (!existing) {
      newlyCapturedCells.push(cell);
      newAreaKm2 += cell.areaKm2;
    } else {
      // Check 20-hour defense cooldown to prevent continuous repetitive farming
      const lastActionTime = existing.lastDefendedAt || existing.lastCapturedAt || existing.firstCapturedAt;
      const lastTimestamp = lastActionTime ? new Date(lastActionTime).getTime() : now.getTime();
      const hoursSinceDefense = (now.getTime() - lastTimestamp) / (1000 * 3600);

      if (hoursSinceDefense >= 20) {
        defendedCells.push({
          ...existing,
          defendedCount: existing.defendedCount + 1,
          lastDefendedAt: nowISO,
        });
      }
    }
  }

  return {
    newlyCapturedCells,
    defendedCells,
    newAreaKm2: Math.round(newAreaKm2 * 1000) / 1000,
    defendedCount: defendedCells.length,
  };
}

// ── 10. XP, Level & Gamification Economy ──────────────────────

export interface XPBreakdown {
  baseXP: number;
  distanceXP: number;
  territoryXP: number;
  defenseXP: number;
  prXP: number;
  totalXP: number;
}

export interface LevelDefinition {
  level: number;
  name: string;
  minXP: number;
}

export const LEVEL_DEFINITIONS: LevelDefinition[] = [
  { level: 1, name: 'Explorer', minXP: 0 },
  { level: 2, name: 'Pathfinder', minXP: 250 },
  { level: 3, name: 'Scout', minXP: 600 },
  { level: 4, name: 'Trailblazer', minXP: 1200 },
  { level: 5, name: 'Runner', minXP: 2000 },
  { level: 6, name: 'Strider', minXP: 3200 },
  { level: 7, name: 'Pacesetter', minXP: 4800 },
  { level: 8, name: 'Voyager', minXP: 6800 },
  { level: 9, name: 'Conqueror', minXP: 9200 },
  { level: 10, name: 'Territory Master', minXP: 12500 },
];

/**
 * Calculates XP earned for an activity.
 */
export function calculateActivityXP(params: {
  distanceMeters: number;
  newTerritoryCellsCount: number;
  defendedCellsCount: number;
  prCount: number;
}): XPBreakdown {
  const { distanceMeters, newTerritoryCellsCount, defendedCellsCount, prCount } = params;

  const baseXP = 50;
  const km = distanceMeters / 1000;
  const distanceXP = Math.round(km * 15);
  const territoryXP = newTerritoryCellsCount * 50;
  const defenseXP = defendedCellsCount * 25;
  const prXP = prCount * 50;

  const totalXP = baseXP + distanceXP + territoryXP + defenseXP + prXP;

  return {
    baseXP,
    distanceXP,
    territoryXP,
    defenseXP,
    prXP,
    totalXP,
  };
}

/**
 * Returns user's level and progress toward the next level based on total XP.
 */
export function calculateUserLevel(totalXP: number): {
  level: number;
  levelName: string;
  currentLevelXP: number;
  nextLevelXP: number;
  progressPercent: number;
} {
  let currentLevel = LEVEL_DEFINITIONS[0];
  let nextLevel = LEVEL_DEFINITIONS[1];

  for (let i = LEVEL_DEFINITIONS.length - 1; i >= 0; i--) {
    if (totalXP >= LEVEL_DEFINITIONS[i].minXP) {
      currentLevel = LEVEL_DEFINITIONS[i];
      nextLevel = LEVEL_DEFINITIONS[i + 1] || currentLevel;
      break;
    }
  }

  const xpIntoLevel = Math.max(0, totalXP - currentLevel.minXP);
  const xpNeeded = Math.max(1, nextLevel.minXP - currentLevel.minXP);
  const progressPercent =
    currentLevel.level === 10 ? 100 : Math.min(100, Math.round((xpIntoLevel / xpNeeded) * 100));

  return {
    level: currentLevel.level,
    levelName: currentLevel.name,
    currentLevelXP: currentLevel.minXP,
    nextLevelXP: nextLevel.minXP,
    progressPercent,
  };
}

// ── 11. Achievements Evaluation Engine ────────────────────────

export const CORE_ACHIEVEMENTS: ActivityAchievement[] = [
  { id: 'first_activity', title: 'First Steps', description: 'Log your first GPS activity.', icon: 'directions_run', category: 'activity', progress: 0, maxProgress: 1 },
  { id: 'first_5k', title: '5K Club', description: 'Complete a single 5 km activity.', icon: 'military_tech', category: 'distance', progress: 0, maxProgress: 1 },
  { id: 'first_10k', title: '10K Crusher', description: 'Complete a single 10 km activity.', icon: 'stars', category: 'distance', progress: 0, maxProgress: 1 },
  { id: 'half_marathon', title: 'Half Marathon', description: 'Complete 21.1 km in one activity.', icon: 'workspace_premium', category: 'distance', progress: 0, maxProgress: 1 },
  { id: 'first_territory', title: 'Claim Your Turf', description: 'Capture your first territory cell.', icon: 'flag', category: 'territory', progress: 0, maxProgress: 1 },
  { id: 'territory_1km2', title: 'Land Baron', description: 'Control over 0.5 km² of territory.', icon: 'domain', category: 'territory', progress: 0, maxProgress: 1 },
  { id: 'total_100k', title: 'Century Club', description: 'Reach 100 km of total lifetime distance.', icon: 'emoji_events', category: 'distance', progress: 0, maxProgress: 100 },
  { id: 'defend_5', title: 'Guardian', description: 'Defend territory 5 times.', icon: 'shield', category: 'territory', progress: 0, maxProgress: 5 },
  { id: 'first_pr', title: 'Record Breaker', description: 'Set your first Personal Record.', icon: 'speed', category: 'pr', progress: 0, maxProgress: 1 },
];

/**
 * Checks and updates achievements based on updated user metrics.
 */
export function evaluateAchievements(params: {
  totalActivities: number;
  totalDistanceKm: number;
  maxSingleDistanceKm: number;
  totalTerritoryKm2: number;
  totalDefenses: number;
  prCount: number;
  unlockedAchievementIds: string[];
}): { updatedAchievements: ActivityAchievement[]; newlyUnlocked: ActivityAchievement[] } {
  const {
    totalActivities,
    totalDistanceKm,
    maxSingleDistanceKm,
    totalTerritoryKm2,
    totalDefenses,
    prCount,
    unlockedAchievementIds,
  } = params;

  const newlyUnlocked: ActivityAchievement[] = [];
  const now = new Date().toISOString();

  const updatedAchievements = CORE_ACHIEVEMENTS.map(ach => {
    const isAlreadyUnlocked = unlockedAchievementIds.includes(ach.id);
    let currentProgress = 0;
    let unlocked = isAlreadyUnlocked;

    switch (ach.id) {
      case 'first_activity':
        currentProgress = Math.min(1, totalActivities);
        unlocked = totalActivities >= 1;
        break;
      case 'first_5k':
        currentProgress = maxSingleDistanceKm >= 5 ? 1 : 0;
        unlocked = maxSingleDistanceKm >= 5;
        break;
      case 'first_10k':
        currentProgress = maxSingleDistanceKm >= 10 ? 1 : 0;
        unlocked = maxSingleDistanceKm >= 10;
        break;
      case 'half_marathon':
        currentProgress = maxSingleDistanceKm >= 21.1 ? 1 : 0;
        unlocked = maxSingleDistanceKm >= 21.1;
        break;
      case 'first_territory':
        currentProgress = totalTerritoryKm2 > 0 ? 1 : 0;
        unlocked = totalTerritoryKm2 > 0;
        break;
      case 'territory_1km2':
        currentProgress = totalTerritoryKm2 >= 0.5 ? 1 : 0;
        unlocked = totalTerritoryKm2 >= 0.5;
        break;
      case 'total_100k':
        currentProgress = Math.min(100, Math.round(totalDistanceKm));
        unlocked = totalDistanceKm >= 100;
        break;
      case 'defend_5':
        currentProgress = Math.min(5, totalDefenses);
        unlocked = totalDefenses >= 5;
        break;
      case 'first_pr':
        currentProgress = prCount >= 1 ? 1 : 0;
        unlocked = prCount >= 1;
        break;
    }

    if (unlocked && !isAlreadyUnlocked) {
      newlyUnlocked.push({
        ...ach,
        progress: ach.maxProgress,
        unlockedAt: now,
      });
      return {
        ...ach,
        progress: ach.maxProgress,
        unlockedAt: now,
      };
    }

    return {
      ...ach,
      progress: currentProgress,
      unlockedAt: isAlreadyUnlocked ? ach.unlockedAt || now : undefined,
    };
  });

  return { updatedAchievements, newlyUnlocked };
}

// ── 12. Privacy Radius Protection ─────────────────────────────

/**
 * Clips or removes GPS route points that fall within `radiusMeters` of start or end point.
 * Ensures user home / office locations are never exposed in public routes.
 */
export function applyPrivacyRadius(points: ActivityPoint[], radiusMeters: number): ActivityPoint[] {
  if (!points || points.length <= 4 || radiusMeters <= 0) {
    return points ? [...points] : [];
  }

  const startPoint = points[0];
  const endPoint = points[points.length - 1];

  return points.filter(p => {
    const distFromStart = calculateHaversineDistance(
      startPoint.latitude,
      startPoint.longitude,
      p.latitude,
      p.longitude
    );
    const distFromEnd = calculateHaversineDistance(
      endPoint.latitude,
      endPoint.longitude,
      p.latitude,
      p.longitude
    );

    return distFromStart > radiusMeters && distFromEnd > radiusMeters;
  });
}

// ── 13. GPX & CSV Export / Import ─────────────────────────────

/**
 * Generates standard GPX 1.1 XML string from an Activity.
 */
export function generateGPX(activity: {
  title: string;
  type: string;
  startTime: string;
  route?: ActivityRoute;
}): string {
  const points = activity.route?.points || [];
  let gpx = `<?xml version="1.0" encoding="UTF-8"?>\n`;
  gpx += `<gpx version="1.1" creator="MyFitAI" xmlns="http://www.topografix.com/GPX/1/1">\n`;
  gpx += `  <metadata>\n`;
  gpx += `    <name>${escapeXml(activity.title)}</name>\n`;
  gpx += `    <time>${activity.startTime}</time>\n`;
  gpx += `  </metadata>\n`;
  gpx += `  <trk>\n`;
  gpx += `    <name>${escapeXml(activity.title)}</name>\n`;
  gpx += `    <type>${escapeXml(activity.type)}</type>\n`;
  gpx += `    <trkseg>\n`;

  for (const pt of points) {
    const timeIso = new Date(pt.timestamp).toISOString();
    gpx += `      <trkpt lat="${pt.latitude.toFixed(6)}" lon="${pt.longitude.toFixed(6)}">`;
    if (pt.altitude !== undefined) {
      gpx += `<ele>${pt.altitude.toFixed(1)}</ele>`;
    }
    gpx += `<time>${timeIso}</time></trkpt>\n`;
  }

  gpx += `    </trkseg>\n`;
  gpx += `  </trk>\n`;
  gpx += `</gpx>`;

  return gpx;
}

function escapeXml(unsafe: string): string {
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Parses a standard GPX XML string into an array of ActivityPoint.
 */
export function parseGPX(gpxXml: string): { points: ActivityPoint[]; title?: string } {
  const points: ActivityPoint[] = [];
  let title = 'Imported Activity';

  const titleMatch = gpxXml.match(/<name>(.*?)<\/name>/i);
  if (titleMatch && titleMatch[1]) {
    title = titleMatch[1].trim();
  }

  // Regex parser for trkpt coordinates
  const trkptRegex = /<trkpt\s+lat="([^"]+)"\s+lon="([^"]+)"[^>]*>([\s\S]*?)<\/trkpt>/gi;
  let match: RegExpExecArray | null;

  while ((match = trkptRegex.exec(gpxXml)) !== null) {
    const lat = parseFloat(match[1]);
    const lon = parseFloat(match[2]);
    const body = match[3];

    let altitude: number | undefined;
    const eleMatch = body.match(/<ele>([^<]+)<\/ele>/i);
    if (eleMatch) {
      altitude = parseFloat(eleMatch[1]);
    }

    let timestamp = Date.now();
    const timeMatch = body.match(/<time>([^<]+)<\/time>/i);
    if (timeMatch) {
      const parsed = Date.parse(timeMatch[1]);
      if (!isNaN(parsed)) timestamp = parsed;
    }

    if (!isNaN(lat) && !isNaN(lon)) {
      points.push({
        latitude: lat,
        longitude: lon,
        timestamp,
        altitude,
      });
    }
  }

  return { points, title };
}

/**
 * Formats activities into standard RFC 4180 CSV rows.
 */
export function formatActivitiesToCSV(activities: any[]): string {
  const headers = [
    'ID',
    'Date',
    'Type',
    'Title',
    'Distance (m)',
    'Distance (km)',
    'Duration (s)',
    'Pace (s/km)',
    'Speed (km/h)',
    'Elevation Gain (m)',
    'Calories (kcal)',
    'Territory (km2)',
    'XP',
  ];

  const rows = activities.map(a => [
    `"${a.id}"`,
    `"${a.startTime}"`,
    `"${a.type}"`,
    `"${(a.title || '').replace(/"/g, '""')}"`,
    a.distanceMeters || 0,
    ((a.distanceMeters || 0) / 1000).toFixed(2),
    a.durationSeconds || 0,
    a.averagePaceSecondsPerKm || 0,
    a.averageSpeedKmh || 0,
    a.elevationGainMeters || 0,
    a.calories || 0,
    a.territoryCapturedKm2 || 0,
    a.xpEarned || 0,
  ]);

  return [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
}
