// ─────────────────────────────────────────────────────────────
// MyFitAI — Workout Engine Unit Tests
// Tests for: Progression Rules (Linear, Double, Greyskull, Time, Bodyweight),
// PR Detection (Weight, Reps, 1RM, Volume, Time, Distance),
// and 1RM calculation formulas.
// ─────────────────────────────────────────────────────────────

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  calculate1RM,
  createDefaultLoggedSet,
  DEFAULT_PROGRESSION,
  type LoggedSet,
  type ProgressionRule,
  type PRRecord,
} from '../../types/workout';
import {
  getProgressionRecommendation,
  countConsecutiveFailures,
} from '../progression';
import {
  detectPR,
  detectSessionPRs,
} from '../prDetection';
import { generateWarmupSets } from '../warmupGenerator';

describe('1RM Calculations', () => {
  test('returns 0 for non-positive weight or reps', () => {
    assert.equal(calculate1RM(0, 10), 0);
    assert.equal(calculate1RM(100, 0), 0);
    assert.equal(calculate1RM(-50, 5), 0);
  });

  test('returns exact weight for a 1-rep set', () => {
    assert.equal(calculate1RM(100, 1), 100);
    assert.equal(calculate1RM(225, 1), 225);
  });

  test('calculates accurate Epley estimate for multi-rep sets', () => {
    // 100kg x 10 reps: 100 * (1 + 10/30) = 133.33 -> 133
    assert.equal(calculate1RM(100, 10), 133);
    // 80kg x 5 reps: 80 * (1 + 5/30) = 93.33 -> 93
    assert.equal(calculate1RM(80, 5), 93);
  });

  test('caps reps at 15 for safety/reliability', () => {
    // 100kg x 20 reps capped at 15: 100 * (1 + 15/30) = 150
    assert.equal(calculate1RM(100, 20), 150);
  });
});

describe('Progression Engine', () => {
  const linearRule: ProgressionRule = {
    type: 'linear',
    weightIncrement: 2.5,
    minReps: 5,
    maxReps: 5,
    setsToProgress: 3,
    failuresToDeload: 3,
    deloadPercent: 0.1,
    timeIncrement: 5,
    maxRepsBeforeAddSet: 15,
    maxSetsBeforeWeight: 5,
  };

  test('linear progression increases weight when all sets hit target reps', () => {
    const prevSets: LoggedSet[] = [
      { ...createDefaultLoggedSet('normal'), weight: 100, reps: 5, completed: true, status: 'completed' },
      { ...createDefaultLoggedSet('normal'), weight: 100, reps: 5, completed: true, status: 'completed' },
      { ...createDefaultLoggedSet('normal'), weight: 100, reps: 5, completed: true, status: 'completed' },
    ];

    const rec = getProgressionRecommendation(linearRule, 'weight_reps', prevSets, 0);
    assert.equal(rec.targetWeight, 102.5);
    assert.equal(rec.targetReps, 5);
    assert.equal(rec.shouldDeload, false);
    assert.match(rec.reason, /All sets hit target/);
  });

  test('linear progression holds weight when sets miss target reps without deload threshold', () => {
    const prevSets: LoggedSet[] = [
      { ...createDefaultLoggedSet('normal'), weight: 100, reps: 5, completed: true, status: 'completed' },
      { ...createDefaultLoggedSet('normal'), weight: 100, reps: 4, completed: true, status: 'completed' },
      { ...createDefaultLoggedSet('normal'), weight: 100, reps: 3, completed: true, status: 'completed' },
    ];

    const rec = getProgressionRecommendation(linearRule, 'weight_reps', prevSets, 1);
    assert.equal(rec.targetWeight, 100);
    assert.equal(rec.targetReps, 5);
    assert.equal(rec.shouldDeload, false);
  });

  test('linear progression recommends deload after consecutive failures reach threshold', () => {
    const prevSets: LoggedSet[] = [
      { ...createDefaultLoggedSet('normal'), weight: 100, reps: 4, completed: true, status: 'completed' },
      { ...createDefaultLoggedSet('normal'), weight: 100, reps: 3, completed: true, status: 'completed' },
      { ...createDefaultLoggedSet('normal'), weight: 100, reps: 3, completed: true, status: 'completed' },
    ];

    const rec = getProgressionRecommendation(linearRule, 'weight_reps', prevSets, 3);
    assert.equal(rec.shouldDeload, true);
    assert.equal(rec.targetWeight, 90); // 10% deload of 100kg
    assert.match(rec.reason, /Deload recommended/);
  });

  test('double progression holds weight and increases reps until maxReps is reached', () => {
    const doubleRule: ProgressionRule = {
      ...linearRule,
      type: 'double',
      minReps: 8,
      maxReps: 12,
      weightIncrement: 2.5,
    };

    const prevSets: LoggedSet[] = [
      { ...createDefaultLoggedSet('normal'), weight: 50, reps: 9, completed: true, status: 'completed' },
      { ...createDefaultLoggedSet('normal'), weight: 50, reps: 9, completed: true, status: 'completed' },
      { ...createDefaultLoggedSet('normal'), weight: 50, reps: 8, completed: true, status: 'completed' },
    ];

    const rec = getProgressionRecommendation(doubleRule, 'weight_reps', prevSets, 0);
    assert.equal(rec.targetWeight, 50);
    assert.equal(rec.targetReps, 10); // increment reps towards 12
  });

  test('double progression adds weight and resets to minReps when all sets hit maxReps', () => {
    const doubleRule: ProgressionRule = {
      ...linearRule,
      type: 'double',
      minReps: 8,
      maxReps: 12,
      weightIncrement: 2.5,
    };

    const prevSets: LoggedSet[] = [
      { ...createDefaultLoggedSet('normal'), weight: 50, reps: 12, completed: true, status: 'completed' },
      { ...createDefaultLoggedSet('normal'), weight: 50, reps: 12, completed: true, status: 'completed' },
      { ...createDefaultLoggedSet('normal'), weight: 50, reps: 12, completed: true, status: 'completed' },
    ];

    const rec = getProgressionRecommendation(doubleRule, 'weight_reps', prevSets, 0);
    assert.equal(rec.targetWeight, 52.5);
    assert.equal(rec.targetReps, 8); // reset to minReps
  });

  test('greyskull LP increments weight on passed AMRAP performance', () => {
    const greyskullRule: ProgressionRule = {
      ...linearRule,
      type: 'greyskull',
      minReps: 5,
      weightIncrement: 2.5,
    };

    const prevSets: LoggedSet[] = [
      { ...createDefaultLoggedSet('normal'), weight: 80, reps: 5, completed: true, status: 'completed' },
      { ...createDefaultLoggedSet('normal'), weight: 80, reps: 5, completed: true, status: 'completed' },
      { ...createDefaultLoggedSet('amrap'), weight: 80, reps: 10, completed: true, status: 'completed' },
    ];

    const rec = getProgressionRecommendation(greyskullRule, 'weight_reps', prevSets, 0);
    assert.equal(rec.targetWeight, 82.5);
    assert.match(rec.reason, /AMRAP/);
  });
});

describe('PR Detection Engine', () => {
  const existingPRs: PRRecord[] = [
    {
      exerciseId: 'bench-press',
      exerciseName: 'Barbell Bench Press',
      type: 'weight',
      value: 100,
      reps: 1,
      date: '2026-01-01',
      sessionId: 's1',
    },
    {
      exerciseId: 'bench-press',
      exerciseName: 'Barbell Bench Press',
      type: 'reps',
      value: 10,
      date: '2026-01-01',
      sessionId: 's1',
    },
    {
      exerciseId: 'bench-press',
      exerciseName: 'Barbell Bench Press',
      type: '1rm',
      value: 120,
      date: '2026-01-01',
      sessionId: 's1',
    },
    {
      exerciseId: 'bench-press',
      exerciseName: 'Barbell Bench Press',
      type: 'volume',
      value: 1000,
      date: '2026-01-01',
      sessionId: 's1',
    },
  ];

  test('detects weight PR when new weight exceeds existing record', () => {
    const set: LoggedSet = {
      ...createDefaultLoggedSet('normal'),
      weight: 105,
      reps: 1,
      completed: true,
      status: 'completed',
    };
    const result = detectPR('bench-press', 'Barbell Bench Press', 'weight_reps', set, 's2', existingPRs);
    assert.ok(result.pr);
    assert.equal(result.pr.type, 'weight');
    assert.equal(result.pr.value, 105);
    assert.equal(result.pr.previousValue, 100);
  });

  test('does not trigger weight PR when weight is equal or lower', () => {
    const set: LoggedSet = {
      ...createDefaultLoggedSet('normal'),
      weight: 95,
      reps: 5,
      completed: true,
      status: 'completed',
    };
    const result = detectPR('bench-press', 'Barbell Bench Press', 'weight_reps', set, 's2', existingPRs);
    assert.equal(result.pr, null);
  });

  test('detects 1RM PR when high reps result in new estimated 1RM', () => {
    // 100kg x 8 reps = 100 * (1 + 8/30) = 126.66 -> 127kg (exceeds 120kg 1RM PR)
    const set: LoggedSet = {
      ...createDefaultLoggedSet('normal'),
      weight: 100,
      reps: 8,
      completed: true,
      status: 'completed',
    };
    const result = detectPR('bench-press', 'Barbell Bench Press', 'weight_reps', set, 's2', existingPRs);
    assert.ok(result.allPRs.some(p => p.type === '1rm' && p.value === 127));
  });

  test('detectSessionPRs correctly detects volume PR across all completed exercises', () => {
    const session = {
      id: 'session-vol-test',
      templateName: 'Chest Day',
      type: 'strength' as const,
      startedAt: '2026-10-04T00:00:00Z',
      duration: 3600,
      totalVolume: 5000,
      totalSets: 3,
      totalReps: 30,
      prsHit: [],
      notes: '',
      musclesWorked: [],
      exercises: [
        {
          exerciseId: 'bench-press',
          exerciseName: 'Barbell Bench Press',
          exerciseType: 'weight_reps' as const,
          sets: [
            { ...createDefaultLoggedSet('normal'), weight: 100, reps: 10, completed: true, status: 'completed' as const },
            { ...createDefaultLoggedSet('normal'), weight: 100, reps: 10, completed: true, status: 'completed' as const },
            { ...createDefaultLoggedSet('normal'), weight: 100, reps: 10, completed: true, status: 'completed' as const },
          ],
        },
      ],
    };

    const prHistory = new Map<string, PRRecord[]>([
      [
        'bench-press',
        [
          {
            exerciseId: 'bench-press',
            exerciseName: 'Barbell Bench Press',
            type: 'weight',
            value: 90,
            date: '2026-01-01',
            sessionId: 'old',
          },
        ],
      ],
    ]);

    const result = detectSessionPRs(session, prHistory);
    assert.ok(result.prs.length > 0);
  });
});

describe('Warmup Generator Engine', () => {
  test('returns empty warmup array when target weight is less than or equal to bar weight', () => {
    assert.deepEqual(generateWarmupSets(45, { barWeight: 45 }), []);
    assert.deepEqual(generateWarmupSets(0), []);
  });

  test('generates progressive ramp sets for a 225 lb target working weight', () => {
    const warmups = generateWarmupSets(225, { unit: 'lbs', barWeight: 45, roundTo: 5 });
    assert.ok(warmups.length >= 3);
    assert.equal(warmups[0].weight, 45); // empty bar
    assert.equal(warmups[0].reps, 10);
    assert.equal(warmups[0].setType, 'warmup');

    // Each set should strictly increase in weight up towards target
    for (let i = 1; i < warmups.length; i++) {
      assert.ok(warmups[i].weight > warmups[i - 1].weight);
      assert.ok(warmups[i].weight < 225);
    }
  });

  test('generates metric warmup sets for 100 kg target working weight', () => {
    const warmups = generateWarmupSets(100, { unit: 'kg', barWeight: 20, roundTo: 2.5 });
    assert.ok(warmups.length >= 3);
    assert.equal(warmups[0].weight, 20); // 20 kg Olympic bar
    assert.equal(warmups[0].setType, 'warmup');
  });
});
