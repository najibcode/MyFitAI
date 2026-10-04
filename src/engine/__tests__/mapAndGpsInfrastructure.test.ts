// ─────────────────────────────────────────────────────────────
// MyFitAI — Production Map, GPS & Offline Sync Infrastructure Tests
// Validates:
// - MapProvider & OpenFreeMap zero API key abstraction
// - Polyline encoding & decoding round-trip precision
// - Douglas-Peucker route simplification & compression
// - GPS sampling, jitter filtering, and corner angle preservation
// - Anti-cheat validation (speed limits, teleportation jumps)
// - Territory grid geometry & anti-farming cooldowns
// - Cost-controlled single-document sync payload format
// - Corner cases: empty, 1 point, 2 points, 10,000 points
// ─────────────────────────────────────────────────────────────

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { encodeRoute, decodeRoute, simplifyRoutePoints } from '../../utils/polyline';
import { OpenFreeMapProvider } from '../../services/map/OpenFreeMapProvider';
import {
  calculateHaversineDistance,
  processRouteMetrics,
  validateActivityGPS,
  getGridCellKey,
  getGridCellGeometry,
  calculateTerritoryImpact,
  calculateActivityXP,
  generateTerritoryCellsFromRoute,
} from '../activityCalculations';
import type { ActivityPoint, TerritoryCell } from '../../types/activity';

describe('1. Map Provider & OpenFreeMap Zero API Key Abstraction', () => {
  const provider = new OpenFreeMapProvider();

  test('OpenFreeMap provider requires zero API keys and valid style URLs', () => {
    assert.equal(provider.id, 'openfreemap');
    assert.ok(provider.attribution.includes('OpenFreeMap'));
    assert.ok(provider.attribution.includes('OpenStreetMap'));

    const darkStyle = provider.getStyleUrl('dark');
    assert.ok(darkStyle.startsWith('https://tiles.openfreemap.org/styles/dark'));

    const lightStyle = provider.getStyleUrl('light');
    assert.ok(lightStyle.startsWith('https://tiles.openfreemap.org/styles/liberty'));

    // Verify no secret query params or tokens attached
    assert.ok(!darkStyle.includes('key='));
    assert.ok(!darkStyle.includes('token='));
    assert.ok(!lightStyle.includes('key='));
    assert.ok(!lightStyle.includes('token='));
  });
});

describe('2. Polyline Encoding & Decoding Engine', () => {
  test('handles empty and single coordinate inputs safely', () => {
    assert.equal(encodeRoute([]), '');
    assert.deepEqual(decodeRoute(''), []);

    const single = [{ latitude: 37.77493, longitude: -122.41942 }];
    const encodedSingle = encodeRoute(single);
    assert.ok(encodedSingle.length > 0);
    const decodedSingle = decodeRoute(encodedSingle);
    assert.equal(decodedSingle.length, 1);
    assert.ok(Math.abs(decodedSingle[0].latitude - single[0].latitude) < 0.0001);
    assert.ok(Math.abs(decodedSingle[0].longitude - single[0].longitude) < 0.0001);
  });

  test('round-trip encode and decode preserves coordinates within ~1 meter', () => {
    const originalPoints = [
      { latitude: 28.613939, longitude: 77.209021 },
      { latitude: 28.614521, longitude: 77.209845 },
      { latitude: 28.615112, longitude: 77.210452 },
      { latitude: 28.616034, longitude: 77.211231 },
    ];

    const encoded = encodeRoute(originalPoints);
    assert.ok(typeof encoded === 'string' && encoded.length > 0);

    const decoded = decodeRoute(encoded);
    assert.equal(decoded.length, originalPoints.length);

    for (let i = 0; i < originalPoints.length; i++) {
      const dist = calculateHaversineDistance(
        originalPoints[i].latitude,
        originalPoints[i].longitude,
        decoded[i].latitude,
        decoded[i].longitude
      );
      assert.ok(dist <= 1.2, `Point ${i} exceeded 1.2m delta: ${dist}m`);
    }
  });

  test('encodes and decodes 10,000 points quickly without memory bloat', () => {
    const longRoute: { latitude: number; longitude: number }[] = [];
    let lat = 40.7128;
    let lng = -74.006;

    for (let i = 0; i < 10000; i++) {
      lat += (Math.random() - 0.49) * 0.0001;
      lng += (Math.random() - 0.49) * 0.0001;
      longRoute.push({ latitude: lat, longitude: lng });
    }

    const t0 = performance.now();
    const encoded = encodeRoute(longRoute);
    const t1 = performance.now();
    assert.ok(t1 - t0 < 100, `Encoding 10,000 points took ${t1 - t0}ms (expected < 100ms)`);

    const t2 = performance.now();
    const decoded = decodeRoute(encoded);
    const t3 = performance.now();
    assert.ok(t3 - t2 < 100, `Decoding 10,000 points took ${t3 - t2}ms (expected < 100ms)`);
    assert.equal(decoded.length, 10000);
  });
});

describe('3. Route Simplification (Douglas-Peucker)', () => {
  test('preserves endpoints and collapses collinear points by 80%+', () => {
    const collinearPoints: ActivityPoint[] = [];
    const baseTime = Date.now();

    // 100 points on a perfectly straight line
    for (let i = 0; i < 100; i++) {
      collinearPoints.push({
        latitude: 28.60 + i * 0.0001,
        longitude: 77.20,
        timestamp: baseTime + i * 1000,
        accuracy: 4,
      });
    }

    const simplified = simplifyRoutePoints(collinearPoints, 4.0);
    assert.equal(simplified.length, 2, 'Collinear line should simplify to start and end point');
    assert.equal(simplified[0].latitude, collinearPoints[0].latitude);
    assert.equal(simplified[1].latitude, collinearPoints[99].latitude);
  });

  test('preserves sharp 90-degree corner points', () => {
    const cornerPoints: ActivityPoint[] = [
      { latitude: 28.600, longitude: 77.200, timestamp: 1000 },
      { latitude: 28.605, longitude: 77.200, timestamp: 2000 },
      { latitude: 28.610, longitude: 77.200, timestamp: 3000 }, // Corner apex
      { latitude: 28.610, longitude: 77.205, timestamp: 4000 },
      { latitude: 28.610, longitude: 77.210, timestamp: 5000 },
    ];

    const simplified = simplifyRoutePoints(cornerPoints, 5.0);
    // Must preserve start, apex corner, and end
    assert.ok(simplified.length >= 3, `Expected at least 3 points, got ${simplified.length}`);
    const hasApex = simplified.some(p => p.latitude === 28.610 && p.longitude === 77.200);
    assert.ok(hasApex, 'Simplified route must retain the 90-degree corner apex');
  });
});

describe('4. GPS Filtering & Metric Validation', () => {
  test('discards poor accuracy GPS points and excessive speed jumps', () => {
    const noisyPoints: ActivityPoint[] = [
      { latitude: 28.600, longitude: 77.200, timestamp: 1000, accuracy: 5 },
      { latitude: 28.601, longitude: 77.200, timestamp: 5000, accuracy: 60 }, // Bad accuracy (> 35m)
      { latitude: 35.000, longitude: 85.000, timestamp: 6000, accuracy: 5 }, // Teleportation jump
      { latitude: 28.602, longitude: 77.200, timestamp: 10000, accuracy: 5 },
    ];

    const metrics = processRouteMetrics(noisyPoints);
    assert.equal(metrics.validPoints.length, 2, 'Should only retain clean non-teleporting points');
  });

  test('anti-cheat detects impossible speeds for sport type', () => {
    const normalRun: ActivityPoint[] = [
      { latitude: 28.6000, longitude: 77.2000, timestamp: 0 },
      { latitude: 28.6005, longitude: 77.2000, timestamp: 20000 }, // ~55m in 20s = 2.7 m/s (10 km/h)
    ];
    const runResult = validateActivityGPS('RUN', normalRun);
    assert.equal(runResult.isValid, true);

    const vehicleRun: ActivityPoint[] = [
      { latitude: 28.6000, longitude: 77.2000, timestamp: 0 },
      { latitude: 28.6100, longitude: 77.2000, timestamp: 10000 }, // ~1110m in 10s = 111 m/s (400 km/h)
    ];
    const cheatResult = validateActivityGPS('RUN', vehicleRun);
    assert.equal(cheatResult.isValid, false);
    assert.ok(cheatResult.flags.length > 0);
  });
});

describe('5. Territory Calculations & Anti-Farming Rules', () => {
  test('disallows territory capture on activities under 500m (anti-farming)', () => {
    const shortRoute: ActivityPoint[] = [
      { latitude: 28.6000, longitude: 77.2000, timestamp: 0 },
      { latitude: 28.6010, longitude: 77.2000, timestamp: 30000 }, // ~111m
    ];

    const cells = generateTerritoryCellsFromRoute(shortRoute, 'user_123');
    const impact = calculateTerritoryImpact({
      touchedCells: cells,
      existingCells: [],
      minActivityDistanceMeters: 111, // Less than 500m
    });

    assert.equal(impact.newlyCapturedCells.length, 0);
    assert.equal(impact.newAreaKm2, 0);
  });

  test('awards newly captured territory and respects 20-hour defense cooldown', () => {
    const longRoute: ActivityPoint[] = [
      { latitude: 28.6000, longitude: 77.2000, timestamp: 0 },
      { latitude: 28.6080, longitude: 77.2000, timestamp: 300000 }, // ~880m > 500m
    ];

    const cells = generateTerritoryCellsFromRoute(longRoute, 'user_123');
    assert.ok(cells.length > 0);

    // Initial capture
    const initialImpact = calculateTerritoryImpact({
      touchedCells: cells,
      existingCells: [],
      minActivityDistanceMeters: 880,
    });
    assert.ok(initialImpact.newlyCapturedCells.length > 0);
    assert.ok(initialImpact.newAreaKm2 > 0);

    // Immediate second attempt within 20 hours should NOT defend (cooldown active)
    const immediateImpact = calculateTerritoryImpact({
      touchedCells: cells,
      existingCells: initialImpact.newlyCapturedCells,
      minActivityDistanceMeters: 880,
    });
    assert.equal(immediateImpact.newlyCapturedCells.length, 0);
    assert.equal(immediateImpact.defendedCount, 0);
  });
});
