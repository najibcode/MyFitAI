// ─────────────────────────────────────────────────────────────
// MyFitAI — Activity, GPS & Territory Engine Unit Tests
// Tests for: Haversine distance, speed, pace, route processing,
// Douglas-Peucker simplification, splits generation, MET calories,
// PR detection, anti-cheat validation, territory generation & defense,
// XP & leveling, achievements, route privacy, GPX/CSV serialization.
// ─────────────────────────────────────────────────────────────

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateHaversineDistance,
  formatPace,
  formatDuration,
  formatSpeed,
  formatDistance,
  processRouteMetrics,
  simplifyRoute,
  generateSplits,
  estimateActivityCalories,
  findFastestSegment,
  detectActivityPRs,
  validateActivityGPS,
  getGridCellKey,
  getGridCellGeometry,
  generateTerritoryCellsFromRoute,
  calculateTerritoryImpact,
  calculateActivityXP,
  calculateUserLevel,
  evaluateAchievements,
  applyPrivacyRadius,
  generateGPX,
  parseGPX,
  formatActivitiesToCSV,
} from '../activityCalculations';
import type { ActivityPoint, ActivityPersonalRecord, TerritoryCell } from '../../types/activity';

describe('1. Geographic & Metric Calculations', () => {
  test('Haversine distance calculates accurate distance between coordinates', () => {
    // Distance between London (51.5074, -0.1278) and Paris (48.8566, 2.3522) is ~343.5 km
    const dist = calculateHaversineDistance(51.5074, -0.1278, 48.8566, 2.3522);
    assert.ok(dist > 340000 && dist < 346000, `Expected ~343.5 km, got ${dist / 1000} km`);

    // Zero distance for identical points
    const zero = calculateHaversineDistance(37.7749, -122.4194, 37.7749, -122.4194);
    assert.equal(zero, 0);
  });

  test('Speed and distance formatting handles metric and imperial', () => {
    const metricSpeed = formatSpeed(10.0, 'metric'); // 10 km/h
    assert.equal(metricSpeed, '10.0 km/h');

    const imperialSpeed = formatSpeed(10.0, 'imperial'); // 10 km/h = 6.2 mph
    assert.equal(imperialSpeed, '6.2 mph');

    const distStr = formatDistance(5200, 'metric');
    assert.equal(distStr, '5.20 km');

    const distImperial = formatDistance(1609.34, 'imperial');
    assert.equal(distImperial, '1.00 mi');
  });

  test('Pace and duration formatting is human-readable', () => {
    // 300 seconds/km = 5:00 /km
    assert.equal(formatPace(300), '5:00 /km');
    // 332 seconds/km = 5:32 /km
    assert.equal(formatPace(332), '5:32 /km');
    // Zero or invalid pace
    assert.equal(formatPace(0), '--:--');

    // Duration formatting
    assert.equal(formatDuration(45), '00:45');
    assert.equal(formatDuration(320), '05:20');
    assert.equal(formatDuration(3665), '01:01:05');
  });
});

describe('2. Route Processing & Douglas-Peucker Simplification', () => {
  const baseTime = Date.now();
  const rawPoints: ActivityPoint[] = [
    { latitude: 37.7749, longitude: -122.4194, timestamp: baseTime, altitude: 10, accuracy: 5, speed: 2.5 },
    { latitude: 37.7758, longitude: -122.4194, timestamp: baseTime + 10000, altitude: 12, accuracy: 5, speed: 2.6 },
    { latitude: 37.7767, longitude: -122.4194, timestamp: baseTime + 20000, altitude: 16, accuracy: 5, speed: 2.5 },
    { latitude: 37.7776, longitude: -122.4194, timestamp: baseTime + 30000, altitude: 22, accuracy: 5, speed: 2.7 },
    { latitude: 37.7785, longitude: -122.4194, timestamp: baseTime + 40000, altitude: 25, accuracy: 5, speed: 2.5 },
  ];

  test('processRouteMetrics computes distance, elevation gain, and filtered points', () => {
    const result = processRouteMetrics(rawPoints);
    assert.ok(result.distanceMeters > 350, 'Distance should be ~400m');
    assert.ok(result.elevationGainMeters >= 12, 'Elevation gain should be tracked');
    assert.equal(result.validPoints.length, 5);
  });

  test('simplifyRoute simplifies collinear points while preserving endpoints', () => {
    const simplified = simplifyRoute(rawPoints, 20); // 20m tolerance along collinear street
    assert.ok(simplified.length < rawPoints.length, 'Simplified route should have fewer points');
    assert.equal(simplified[0].latitude, rawPoints[0].latitude);
    assert.equal(simplified[simplified.length - 1].latitude, rawPoints[rawPoints.length - 1].latitude);
  });
});

describe('3. Splits Calculation & MET Calories', () => {
  test('generateSplits automatically creates 1km segments', () => {
    // Generate a 2.5 km route
    const startTime = Date.now();
    const points: ActivityPoint[] = [];
    const stepDeg = 0.001; // ~111 meters per step
    for (let i = 0; i <= 25; i++) {
      points.push({
        latitude: 37.7749 + i * stepDeg,
        longitude: -122.4194,
        timestamp: startTime + i * 20000, // 20s per ~111m = ~5:30/km
        altitude: 10 + i * 2,
        accuracy: 4,
        speed: 3.0,
      });
    }

    const splitsKm = generateSplits(points, 'metric');
    assert.ok(splitsKm.length >= 2, `Expected at least 2 km splits, got ${splitsKm.length}`);
    assert.equal(splitsKm[0].splitIndex, 1);
    assert.ok(splitsKm[0].distanceMeters >= 1000);
    assert.ok(splitsKm[0].paceSecondsPerKm > 0);
  });

  test('estimateActivityCalories accounts for activity type, weight, and duration', () => {
    // Running 70kg person for 30 minutes at 10km/h (5000m)
    const runCals = estimateActivityCalories({
      type: 'RUN',
      durationSeconds: 1800,
      weightKg: 70,
      distanceMeters: 5000,
    });
    assert.ok(runCals >= 300 && runCals <= 450, `Expected ~350 kcal, got ${runCals}`);

    // Walking 70kg person for 30 minutes (2000m)
    const walkCals = estimateActivityCalories({
      type: 'WALK',
      durationSeconds: 1800,
      weightKg: 70,
      distanceMeters: 2000,
    });
    assert.ok(walkCals < runCals, 'Walking should burn fewer calories than running');
    assert.ok(walkCals >= 100 && walkCals <= 200, `Expected ~130 kcal, got ${walkCals}`);
  });
});

describe('4. Personal Records (PR) Detection & Anti-Cheat', () => {
  test('findFastestSegment detects fastest sliding window time', () => {
    const startTime = Date.now();
    const points: ActivityPoint[] = [];
    for (let i = 0; i <= 15; i++) {
      points.push({
        latitude: 37.7000 + i * 0.001, // ~111m per step
        longitude: -122.4000,
        timestamp: startTime + i * 30000, // 30s per step
        accuracy: 4,
      });
    }
    const fastest1k = findFastestSegment(points, 1000);
    assert.ok(fastest1k !== null && fastest1k > 0, 'Should find fastest 1k duration');
  });

  test('detectActivityPRs detects new PR and beats previous record', () => {
    const startTime = Date.now();
    const points: ActivityPoint[] = [];
    // 5.5 km run in 25 minutes (300 sec/km)
    for (let i = 0; i <= 55; i++) {
      points.push({
        latitude: 37.7000 + i * 0.0009,
        longitude: -122.4000,
        timestamp: startTime + i * 27000,
        altitude: 20,
        accuracy: 5,
        speed: 3.7,
      });
    }

    const existingPRs: ActivityPersonalRecord[] = [
      {
        id: 'old-pr-1',
        category: 'fastest_5k',
        activityType: 'RUN',
        value: 1800, // previous best was 30 mins
        formattedValue: '30:00',
        activityId: 'old-act',
        date: new Date(Date.now() - 86400000).toISOString(),
      },
    ];

    const detected = detectActivityPRs({
      activityId: 'new-act-1',
      activityType: 'RUN',
      points,
      distanceMeters: 5500,
      durationSeconds: 55 * 27,
      elevationGainMeters: 20,
      date: new Date().toISOString(),
      existingPRs,
    });

    assert.ok(detected.length > 0, 'Should detect new PRs');
    const new5k = detected.find(p => p.category === 'fastest_5k');
    assert.ok(new5k, 'Should beat previous 5K record');
    assert.ok(new5k.value < 1800, 'New 5K time should be faster than 1800s');
  });

  test('validateActivityGPS detects speed hacks and teleportation', () => {
    const normalPoints: ActivityPoint[] = [
      { latitude: 37.7, longitude: -122.4, timestamp: 1000, accuracy: 5 },
      { latitude: 37.7001, longitude: -122.4, timestamp: 4000, accuracy: 5 },
    ];
    assert.equal(validateActivityGPS('RUN', normalPoints).isValid, true);

    // Teleportation: ~11 km in 2 seconds
    const cheatPoints: ActivityPoint[] = [
      { latitude: 37.7, longitude: -122.4, timestamp: 1000, accuracy: 5 },
      { latitude: 37.8, longitude: -122.4, timestamp: 3000, accuracy: 5 },
    ];
    const check = validateActivityGPS('RUN', cheatPoints);
    assert.equal(check.isValid, false);
    assert.ok(check.flags.length > 0);
    assert.ok(check.flags[0].includes('Impossible instantaneous speed'));
  });
});

describe('5. Territory Grid, Overlap, Defense & XP', () => {
  test('getGridCellKey produces deterministic discrete spatial tile keys', () => {
    const key1 = getGridCellKey(37.77492, -122.41941);
    const key2 = getGridCellKey(37.77498, -122.41943);
    assert.equal(key1, key2, 'Nearby points within 0.001 deg should share cell key');

    const farKey = getGridCellKey(37.8500, -122.4194);
    assert.notEqual(key1, farKey, 'Distant points should yield different cell keys');

    const geom = getGridCellGeometry(key1);
    assert.ok(geom.bounds.north > geom.bounds.south, 'North bound should exceed south bound');
    assert.ok(geom.areaKm2 > 0, 'Cell area should be positive');
  });

  test('generateTerritoryCellsFromRoute constructs valid boundary cells', () => {
    const points: ActivityPoint[] = [
      { latitude: 37.7740, longitude: -122.4190, timestamp: 1000, accuracy: 5 },
      { latitude: 37.7755, longitude: -122.4190, timestamp: 5000, accuracy: 5 },
      { latitude: 37.7770, longitude: -122.4190, timestamp: 9000, accuracy: 5 },
    ];
    const cells = generateTerritoryCellsFromRoute(points, 'user_123');
    assert.ok(cells.length >= 2, 'Route should generate at least 2 territory cells');
    assert.equal(cells[0].ownerId, 'user_123');
  });

  test('calculateTerritoryImpact distinguishes new capture from defense with anti-farming', () => {
    const now = Date.now();
    const cell1Key = 'cell_37774_-122419';
    const cell2Key = 'cell_37775_-122419';

    // User already owns cell 1 (defended 25 hours ago, so cooldown expired)
    const existingCells: TerritoryCell[] = [
      {
        id: cell1Key,
        gridKey: cell1Key,
        ownerId: 'user_123',
        areaKm2: 0.012,
        polygon: [],
        firstCapturedAt: new Date(now - 100000000).toISOString(),
        lastCapturedAt: new Date(now - 100000000).toISOString(),
        lastDefendedAt: new Date(now - 25 * 3600 * 1000).toISOString(),
        captureCount: 1,
        defendedCount: 0,
        activityId: 'old-act',
      },
    ];

    const touchedCells: TerritoryCell[] = [
      {
        id: cell1Key,
        gridKey: cell1Key,
        ownerId: 'user_123',
        areaKm2: 0.012,
        polygon: [],
        firstCapturedAt: new Date().toISOString(),
        lastCapturedAt: new Date().toISOString(),
        captureCount: 1,
        defendedCount: 0,
        activityId: 'curr-act',
      },
      {
        id: cell2Key,
        gridKey: cell2Key,
        ownerId: 'user_123',
        areaKm2: 0.012,
        polygon: [],
        firstCapturedAt: new Date().toISOString(),
        lastCapturedAt: new Date().toISOString(),
        captureCount: 1,
        defendedCount: 0,
        activityId: 'curr-act',
      },
    ];

    const impact = calculateTerritoryImpact({
      touchedCells,
      existingCells,
      minActivityDistanceMeters: 1200,
    });

    assert.equal(impact.newlyCapturedCells.length, 1, 'Cell 2 should be newly captured');
    assert.equal(impact.defendedCells.length, 1, 'Cell 1 should be counted as defended');
    assert.equal(impact.newlyCapturedCells[0].gridKey, cell2Key);
  });

  test('calculateActivityXP computes correct reward breakdown', () => {
    const xpBreakdown = calculateActivityXP({
      distanceMeters: 5200,
      newTerritoryCellsCount: 2,
      defendedCellsCount: 1,
      prCount: 1,
    });

    assert.ok(xpBreakdown.totalXP > 0);
    assert.ok(xpBreakdown.distanceXP >= 50); // 5.2 km * 15 = ~78 XP
    assert.equal(xpBreakdown.territoryXP, 100); // 2 * 50 = 100 XP
    assert.equal(xpBreakdown.defenseXP, 25); // 1 * 25 = 25 XP
    assert.equal(xpBreakdown.prXP, 50); // 1 * 50 = 50 XP
  });

  test('calculateUserLevel maps total XP to ranks correctly', () => {
    const lvl1 = calculateUserLevel(50);
    assert.equal(lvl1.level, 1);
    assert.equal(lvl1.levelName, 'Explorer');

    const lvl5 = calculateUserLevel(2800);
    assert.equal(lvl5.level, 5);
    assert.equal(lvl5.levelName, 'Runner');

    const lvl10 = calculateUserLevel(15000);
    assert.equal(lvl10.level, 10);
    assert.equal(lvl10.levelName, 'Territory Master');
  });

  test('evaluateAchievements unlocks milestones', () => {
    const evalResult = evaluateAchievements({
      totalActivities: 1,
      totalDistanceKm: 6.2,
      maxSingleDistanceKm: 6.2,
      totalTerritoryKm2: 0.25,
      totalDefenses: 0,
      prCount: 1,
      unlockedAchievementIds: [],
    });

    const ids = evalResult.newlyUnlocked.map(a => a.id);
    assert.ok(ids.includes('first_activity'), 'Should unlock first_activity');
    assert.ok(ids.includes('first_5k'), 'Should unlock first_5k');
    assert.ok(ids.includes('first_territory'), 'Should unlock first_territory');
  });
});

describe('6. Privacy, GPX and CSV Serializers', () => {
  test('applyPrivacyRadius masks start and end points within radius', () => {
    const points: ActivityPoint[] = [
      { latitude: 37.7740, longitude: -122.4190, timestamp: 1000, accuracy: 5 },
      { latitude: 37.7745, longitude: -122.4190, timestamp: 2000, accuracy: 5 }, // ~55m away
      { latitude: 37.7760, longitude: -122.4190, timestamp: 5000, accuracy: 5 }, // ~220m away
      { latitude: 37.7780, longitude: -122.4190, timestamp: 8000, accuracy: 5 }, // ~440m away
      { latitude: 37.7800, longitude: -122.4190, timestamp: 11000, accuracy: 5 },
      { latitude: 37.7815, longitude: -122.4190, timestamp: 14000, accuracy: 5 },
    ];

    const blurred = applyPrivacyRadius(points, 100);
    assert.ok(blurred.length < points.length, 'Points inside 100m privacy radius should be trimmed');
  });

  test('generateGPX produces valid GPX 1.1 XML and parseGPX reconstructs it', () => {
    const points: ActivityPoint[] = [
      { latitude: 37.7749, longitude: -122.4194, timestamp: 1700000000000, altitude: 15 },
      { latitude: 37.7759, longitude: -122.4194, timestamp: 1700000020000, altitude: 18 },
    ];
    const gpxXml = generateGPX({
      title: 'Morning Run',
      type: 'RUN',
      startTime: new Date(1700000000000).toISOString(),
      route: {
        points,
        bounds: { minLat: 37.7749, maxLat: 37.7759, minLng: -122.4194, maxLng: -122.4194 },
      },
    });
    assert.ok(gpxXml.includes('<?xml version="1.0" encoding="UTF-8"?>'));
    assert.ok(gpxXml.includes('lat="37.774900" lon="-122.419400"'));

    const parsed = parseGPX(gpxXml);
    assert.equal(parsed.title, 'Morning Run');
    assert.equal(parsed.points.length, 2);
    assert.ok(Math.abs(parsed.points[0].latitude - 37.7749) < 0.0001);
  });

  test('formatActivitiesToCSV formats RFC-compliant tabular data', () => {
    const csv = formatActivitiesToCSV([
      {
        id: 'act-1',
        userId: 'u1',
        type: 'RUN',
        startTime: '2026-10-04T07:00:00Z',
        endTime: '2026-10-04T07:35:00Z',
        durationSeconds: 2100,
        distanceMeters: 5200,
        averagePaceSecondsPerKm: 403,
        averageSpeedKmh: 8.9,
        elevationGainMeters: 45,
        calories: 380,
      },
    ]);

    assert.ok(csv.startsWith('ID,Date,Type,Title,Distance (m)'));
    assert.ok(csv.includes('"act-1"'));
    assert.ok(csv.includes('5200'));
  });
});
