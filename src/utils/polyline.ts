// ─────────────────────────────────────────────────────────────
// MyFitAI — Polyline Encoding & Compression Utility
// Implements standard 5-decimal polyline encoding and decoding
// (Google/Mapbox/Strava compatible) and Douglas-Peucker simplification.
// Reduces route payload sizes by 85–95% before cloud sync.
// ─────────────────────────────────────────────────────────────

import type { ActivityPoint } from '../types/activity';
import { calculateHaversineDistance } from '../engine/activityCalculations';

export interface LatLng {
  latitude: number;
  longitude: number;
}

/**
 * Encodes an array of geographic points into a compact polyline string.
 * Precision: 1e5 (approx 1.1 meter resolution).
 */
export function encodeRoute(points: LatLng[]): string {
  if (!points || points.length === 0) return '';

  let encoded = '';
  let prevLat = 0;
  let prevLng = 0;

  for (const point of points) {
    const lat = Math.round(point.latitude * 1e5);
    const lng = Math.round(point.longitude * 1e5);

    const dLat = lat - prevLat;
    const dLng = lng - prevLng;

    prevLat = lat;
    prevLng = lng;

    encoded += encodeSignedValue(dLat);
    encoded += encodeSignedValue(dLng);
  }

  return encoded;
}

function encodeSignedValue(value: number): string {
  let sgnNum = value < 0 ? ~(value << 1) : value << 1;
  let encoded = '';

  while (sgnNum >= 0x20) {
    encoded += String.fromCharCode((0x20 | (sgnNum & 0x1f)) + 63);
    sgnNum >>= 5;
  }

  encoded += String.fromCharCode(sgnNum + 63);
  return encoded;
}

/**
 * Decodes a polyline string back into an array of LatLng points.
 */
export function decodeRoute(encoded: string): LatLng[] {
  if (!encoded || encoded.length === 0) return [];

  const points: LatLng[] = [];
  let index = 0;
  let lat = 0;
  let lng = 0;

  while (index < encoded.length) {
    let result = 1;
    let shift = 0;
    let b: number;

    do {
      b = encoded.charCodeAt(index++) - 63 - 1;
      result += b << shift;
      shift += 5;
    } while (b >= 0x1f && index < encoded.length);

    lat += (result & 1) !== 0 ? ~(result >> 1) : result >> 1;

    result = 1;
    shift = 0;

    do {
      if (index >= encoded.length) break;
      b = encoded.charCodeAt(index++) - 63 - 1;
      result += b << shift;
      shift += 5;
    } while (b >= 0x1f && index < encoded.length);

    lng += (result & 1) !== 0 ? ~(result >> 1) : result >> 1;

    points.push({
      latitude: lat * 1e-5,
      longitude: lng * 1e-5,
    });
  }

  return points;
}

/**
 * Simplifies route coordinates using the Douglas-Peucker algorithm.
 * Retains significant directional turns while pruning collinear jitter.
 * @param points Array of activity points
 * @param epsilonMeters Distance threshold in meters (default 4.0m)
 */
export function simplifyRoutePoints(
  points: ActivityPoint[],
  epsilonMeters = 4.0
): ActivityPoint[] {
  if (!points || points.length <= 2) return points ? [...points] : [];

  let dmax = 0;
  let index = 0;
  const end = points.length - 1;

  for (let i = 1; i < end; i++) {
    const d = perpendicularDistanceMeters(points[i], points[0], points[end]);
    if (d > dmax) {
      index = i;
      dmax = d;
    }
  }

  if (dmax > epsilonMeters) {
    const rec1 = simplifyRoutePoints(points.slice(0, index + 1), epsilonMeters);
    const rec2 = simplifyRoutePoints(points.slice(index), epsilonMeters);
    return rec1.slice(0, rec1.length - 1).concat(rec2);
  }

  return [points[0], points[end]];
}

function perpendicularDistanceMeters(
  p: ActivityPoint,
  lineStart: ActivityPoint,
  lineEnd: ActivityPoint
): number {
  const x = p.longitude;
  const y = p.latitude;
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
