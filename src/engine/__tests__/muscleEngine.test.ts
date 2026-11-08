// ─────────────────────────────────────────────────────────────
// MyFitAI — Anatomical Muscle & Recovery Engine Unit Tests
// Tests for: Biomechanical mapping, recovery decay curve,
// volume benchmarks, session aggregation, and symmetry ratios.
// ─────────────────────────────────────────────────────────────

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  resolveExerciseMuscles,
  calculateRecoveryPercentage,
  getRecoveryState,
  computeMuscleTrainingMetrics,
  analyzeMuscleBalance,
  evaluateVolumeBenchmark,
} from '../muscleRecoveryEngine';
import type { WorkoutSession } from '../../types/workout';

describe('1. Biomechanical Exercise Resolution', () => {
  test('resolves compound chest press to granular upper/mid pectorals and delts', () => {
    const incline = resolveExerciseMuscles({ name: 'Incline Bench Press' });
    assert.ok(incline.primary.includes('chest_upper'));
    assert.ok(incline.primary.includes('delts_anterior'));
    assert.ok(incline.synergists.includes('triceps_lateral'));

    const flat = resolveExerciseMuscles({ name: 'Barbell Bench Press' });
    assert.ok(flat.primary.includes('chest_mid'));
    assert.ok(flat.synergists.includes('triceps_lateral'));
  });

  test('resolves leg movements accurately to quads, glutes, hamstrings, and calves', () => {
    const squat = resolveExerciseMuscles({ name: 'Barbell Back Squat' });
    assert.ok(squat.primary.includes('quads_vastus'));
    assert.ok(squat.primary.includes('glute_max'));
    assert.ok(squat.synergists.includes('adductors'));

    const rdl = resolveExerciseMuscles({ name: 'Romanian Deadlift' });
    assert.ok(rdl.primary.includes('hamstrings_medial'));
    assert.ok(rdl.primary.includes('glute_max'));
    assert.ok(rdl.synergists.includes('erector_spinae'));

    const calfRaise = resolveExerciseMuscles({ name: 'Standing Calf Raise' });
    assert.ok(calfRaise.primary.includes('calves_gastrocnemius'));
    assert.ok(calfRaise.synergists.includes('calves_soleus'));
  });

  test('falls back gracefully to canonical primary and secondary muscle groups', () => {
    const customEx = resolveExerciseMuscles({
      name: 'Exotic Cable Movement',
      primaryMuscles: ['biceps'],
      secondaryMuscles: ['forearms'],
    });

    assert.ok(customEx.primary.includes('biceps_long'));
    assert.ok(customEx.primary.includes('biceps_short'));
    assert.ok(customEx.synergists.includes('forearms_flexors'));
  });
});

describe('2. Recovery Percentage & Curve Modeling', () => {
  test('calculates accurate physiological recovery percentages over elapsed time', () => {
    const rec48h = 48;

    // Immediately post-workout (0 hours): fatigued
    const t0 = calculateRecoveryPercentage(0, rec48h);
    assert.ok(t0 <= 15, `Expected <= 15% at t=0, got ${t0}%`);
    assert.equal(getRecoveryState(t0), 'overreached');

    // 12 hours: recovering
    const t12 = calculateRecoveryPercentage(12, rec48h);
    assert.ok(t12 >= 45 && t12 <= 60, `Expected ~52% at t=12h, got ${t12}%`);

    // 24 hours (half-life): ~75-80% recovering
    const t24 = calculateRecoveryPercentage(24, rec48h);
    assert.ok(t24 >= 70 && t24 <= 85, `Expected ~78% at t=24h, got ${t24}%`);
    assert.equal(getRecoveryState(t24), 'recovering');

    // 48 hours: >= 90% (Fresh)
    const t48 = calculateRecoveryPercentage(48, rec48h);
    assert.ok(t48 >= 90, `Expected >= 90% at t=48h, got ${t48}%`);
    assert.equal(getRecoveryState(t48), 'fresh');

    // 96 hours: fully restored 100%
    const t96 = calculateRecoveryPercentage(96, rec48h);
    assert.equal(t96, 100);
    assert.equal(getRecoveryState(t96), 'fresh');
  });
});

describe('3. Workout Session Aggregator & Training Metrics', () => {
  const baseTime = Date.now();

  const mockSession: WorkoutSession = {
    id: 'test_session_1',
    templateName: 'Push Hypertrophy',
    type: 'strength',
    startedAt: new Date(baseTime - 3600000).toISOString(),
    endedAt: new Date(baseTime).toISOString(),
    duration: 3600,
    totalVolume: 5000,
    totalSets: 6,
    totalReps: 60,
    prsHit: [],
    notes: 'Solid chest and shoulders pump',
    musclesWorked: ['chest', 'shoulders', 'triceps'],
    exercises: [
      {
        exerciseId: 'ex_bench',
        exerciseName: 'Bench Press',
        exerciseType: 'weight_reps',
        sets: [
          { reps: 10, weight: 100, rpe: 8, effortMode: 'rpe', setType: 'normal', status: 'completed', completed: true, skipped: false, timestamp: new Date(baseTime).toISOString() },
          { reps: 10, weight: 100, rpe: 8, effortMode: 'rpe', setType: 'normal', status: 'completed', completed: true, skipped: false, timestamp: new Date(baseTime).toISOString() },
          { reps: 10, weight: 100, rpe: 9, effortMode: 'rpe', setType: 'normal', status: 'completed', completed: true, skipped: false, timestamp: new Date(baseTime).toISOString() },
        ],
      },
      {
        exerciseId: 'ex_incline',
        exerciseName: 'Incline Dumbbell Press',
        exerciseType: 'weight_reps',
        sets: [
          { reps: 10, weight: 30, rpe: 8, effortMode: 'rpe', setType: 'normal', status: 'completed', completed: true, skipped: false, timestamp: new Date(baseTime).toISOString() },
          { reps: 10, weight: 30, rpe: 8, effortMode: 'rpe', setType: 'normal', status: 'completed', completed: true, skipped: false, timestamp: new Date(baseTime).toISOString() },
          { reps: 10, weight: 30, rpe: 9, effortMode: 'rpe', setType: 'normal', status: 'completed', completed: true, skipped: false, timestamp: new Date(baseTime).toISOString() },
        ],
      },
    ],
  };

  test('computes primary, synergist sets and volume load per muscle', () => {
    const metrics = computeMuscleTrainingMetrics([mockSession], { timeframe: '7d' });

    // Mid chest should have 3 primary sets from Bench Press
    const midChest = metrics['chest_mid'];
    assert.ok(midChest);
    assert.ok(midChest.primarySets >= 3, `Expected at least 3 primary sets, got ${midChest.primarySets}`);
    assert.equal(midChest.targetRole, 'primary');
    assert.ok(midChest.volumeLoadKg >= 3000);

    // Upper chest should have 3 primary sets from Incline DB Press
    const upperChest = metrics['chest_upper'];
    assert.ok(upperChest);
    assert.equal(upperChest.primarySets, 3);
    assert.equal(upperChest.targetRole, 'primary');

    // Triceps lateral head should be synergist for both movements
    const triceps = metrics['triceps_lateral'];
    assert.ok(triceps);
    assert.ok(triceps.synergistSets >= 6, `Expected 6 synergist sets, got ${triceps.synergistSets}`);
    assert.equal(triceps.effectiveSets, 3.0); // 6 * 0.5 = 3.0 effective sets
  });

  test('tracks contributing exercises and links to muscle', () => {
    const metrics = computeMuscleTrainingMetrics([mockSession], { timeframe: '7d' });
    const upperChest = metrics['chest_upper'];
    assert.ok(upperChest.contributingExercises.length > 0);
    assert.equal(upperChest.contributingExercises[0].exerciseName, 'Incline Dumbbell Press');
    assert.equal(upperChest.contributingExercises[0].sets, 3);
  });
});

describe('4. Muscle Balance & Symmetry Analysis', () => {
  test('calculates push/pull and deltoid ratios', () => {
    const metrics = computeMuscleTrainingMetrics([]);
    // Artificially populate push and pull sets
    metrics['chest_mid'].effectiveSets = 12;
    metrics['delts_anterior'].effectiveSets = 8;
    metrics['lats'].effectiveSets = 10;
    metrics['rhomboids'].effectiveSets = 10;
    metrics['quads_vastus'].effectiveSets = 14;
    metrics['hamstrings_medial'].effectiveSets = 12;

    const balance = analyzeMuscleBalance(metrics);
    assert.ok(balance.pushSets >= 20);
    assert.ok(balance.pullSets >= 20);
    assert.ok(balance.pushPullRatio >= 0.8 && balance.pushPullRatio <= 1.2, `Expected balanced ratio ~1.0, got ${balance.pushPullRatio}`);
    assert.ok(balance.quadHamstringRatio >= 1.0 && balance.quadHamstringRatio <= 1.3);
  });
});

describe('5. Volume Landmark Evaluation', () => {
  test('correctly maps sets to hypertrophy volume tiers (MEV, MAV, MRV)', () => {
    const mev = 6, mav = 14, mrv = 20;

    const zero = evaluateVolumeBenchmark(0, mev, mav, mrv);
    assert.equal(zero.tier, 'under');

    const maintenance = evaluateVolumeBenchmark(4, mev, mav, mrv);
    assert.equal(maintenance.tier, 'under');
    assert.equal(maintenance.label, 'Maintenance Dose');

    const optimal = evaluateVolumeBenchmark(12, mev, mav, mrv);
    assert.equal(optimal.tier, 'optimal');
    assert.ok(optimal.label.includes('Optimal'));

    const high = evaluateVolumeBenchmark(18, mev, mav, mrv);
    assert.equal(high.tier, 'high');

    const overreach = evaluateVolumeBenchmark(24, mev, mav, mrv);
    assert.equal(overreach.tier, 'overreached');
  });
});

describe('6. Legacy Adapter & Path Integrity', () => {
  test('normalizeMuscleKey maps various input strings accurately', async () => {
    const { normalizeMuscleKey } = await import('../muscleRecoveryEngine');
    assert.equal(normalizeMuscleKey('Chest'), 'chest');
    assert.equal(normalizeMuscleKey('pectoralis'), 'chest');
    assert.equal(normalizeMuscleKey('Front Deltoid'), 'shoulders');
    assert.equal(normalizeMuscleKey('Biceps'), 'biceps');
    assert.equal(normalizeMuscleKey('Triceps'), 'triceps');
    assert.equal(normalizeMuscleKey('Quadriceps'), 'quads');
    assert.equal(normalizeMuscleKey('Hamstrings'), 'hamstrings');
    assert.equal(normalizeMuscleKey('Glutes'), 'glutes');
    assert.equal(normalizeMuscleKey('Calves'), 'calves');
    assert.equal(normalizeMuscleKey('Latissimus'), 'lats');
    assert.equal(normalizeMuscleKey('Trapezius'), 'traps');
    assert.equal(normalizeMuscleKey('Abs & Core'), 'core');
  });

  test('computeMetricsFromLegacyProps correctly expands canonical groups into granular muscles', async () => {
    const { computeMetricsFromLegacyProps } = await import('../muscleRecoveryEngine');
    const legacyMetrics = computeMetricsFromLegacyProps(
      ['chest', 'quads'],
      ['triceps'],
      { chest: 12, quads: 16, triceps: 6 },
      { chest: 20 }
    );

    // Primary granular chest muscles should be populated
    assert.equal(legacyMetrics['chest_upper'].primarySets, 12);
    assert.equal(legacyMetrics['chest_mid'].primarySets, 12);
    assert.equal(legacyMetrics['chest_lower'].primarySets, 12);
    assert.equal(legacyMetrics['chest_upper'].targetRole, 'primary');
    assert.equal(legacyMetrics['chest_upper'].recoveryPercentage, 80); // 100 - 20

    // Primary quads
    assert.equal(legacyMetrics['quads_rectus_femoris'].primarySets, 16);
    assert.equal(legacyMetrics['quads_vastus'].primarySets, 16);

    // Secondary synergist triceps
    assert.equal(legacyMetrics['triceps_long'].targetRole, 'synergist');
    assert.equal(legacyMetrics['triceps_lateral'].targetRole, 'synergist');
    assert.equal(legacyMetrics['triceps_long'].effectiveSets, 3.0); // 6 * 0.5
  });

  test('all SVG path IDs exist in the ANATOMICAL_MUSCLES registry', async () => {
    const { ANATOMICAL_MUSCLES } = await import('../../types/anatomicalMuscle');
    const { FRONT_MUSCLE_PATHS } = await import('../../components/muscleMap/AnatomicalFrontBody');
    const { BACK_MUSCLE_PATHS } = await import('../../components/muscleMap/AnatomicalBackBody');

    for (const path of FRONT_MUSCLE_PATHS) {
      assert.ok(
        ANATOMICAL_MUSCLES[path.id],
        `Front path ID '${path.id}' (${path.name}) must exist in ANATOMICAL_MUSCLES registry`
      );
    }

    for (const path of BACK_MUSCLE_PATHS) {
      assert.ok(
        ANATOMICAL_MUSCLES[path.id],
        `Back path ID '${path.id}' (${path.name}) must exist in ANATOMICAL_MUSCLES registry`
      );
    }

    // Bidirectional check: every anatomical muscle has at least one front or back SVG representation
    const allSvgIds = new Set([
      ...FRONT_MUSCLE_PATHS.map(p => p.id),
      ...BACK_MUSCLE_PATHS.map(p => p.id),
    ]);
    for (const id of Object.keys(ANATOMICAL_MUSCLES)) {
      assert.ok(
        allSvgIds.has(id),
        `Anatomical muscle '${id}' (${ANATOMICAL_MUSCLES[id].commonName}) must have an SVG representation`
      );
    }
  });
});

describe('7. Recency & Frequency Benchmark Evaluation', () => {
  test('evaluates trained today / within 24h as peak synthesis tier', async () => {
    const { evaluateRecencyBenchmark } = await import('../muscleRecoveryEngine');
    const t0 = evaluateRecencyBenchmark(0);
    assert.equal(t0.tier, 'today');
    assert.equal(t0.color, '#FF8A00');

    const t18 = evaluateRecencyBenchmark(18);
    assert.equal(t18.tier, 'today');
  });

  test('evaluates 2-3 days ago as active recovery tier', async () => {
    const { evaluateRecencyBenchmark } = await import('../muscleRecoveryEngine');
    const t48 = evaluateRecencyBenchmark(48);
    assert.equal(t48.tier, 'recent');
    assert.equal(t48.color, '#10B981');
  });

  test('evaluates 4-5 days ago as optimal retraining window', async () => {
    const { evaluateRecencyBenchmark } = await import('../muscleRecoveryEngine');
    const t96 = evaluateRecencyBenchmark(96);
    assert.equal(t96.tier, 'optimal');
    assert.equal(t96.color, '#38BDF8');
  });

  test('evaluates 6+ days ago as decaying / overdue stimulus', async () => {
    const { evaluateRecencyBenchmark } = await import('../muscleRecoveryEngine');
    const t168 = evaluateRecencyBenchmark(168); // 7 days
    assert.equal(t168.tier, 'decaying');
    assert.equal(t168.color, '#94A3B8');
  });

  test('handles null as untrained and stimulus-ready', async () => {
    const { evaluateRecencyBenchmark } = await import('../muscleRecoveryEngine');
    const untrained = evaluateRecencyBenchmark(null);
    assert.equal(untrained.tier, 'untrained');
    assert.ok(untrained.description.includes('Ready for training'));
  });
});
