import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  formatLocalDayKey,
  getLocalDayBounds,
  getSleepNightKey,
  processSleepSessions,
  calculateSleepScore,
  calculateDailyReadiness,
  formatMinutesToHours,
  formatHealthSourceLabel,
} from '../healthCalculations';

describe('Health & Sleep Calculations Engine', () => {
  it('correctly formats local day key without UTC bias', () => {
    const d = new Date(2026, 9, 7, 23, 45, 0); // Oct 7, 2026 23:45 local
    const key = formatLocalDayKey(d);
    assert.strictEqual(key, '2026-10-07');
  });

  it('correctly computes local day bounds from 00:00:00 to 23:59:59', () => {
    const { start, end } = getLocalDayBounds('2026-10-07');
    assert.strictEqual(start.getFullYear(), 2026);
    assert.strictEqual(start.getMonth(), 9);
    assert.strictEqual(start.getDate(), 7);
    assert.strictEqual(start.getHours(), 0);
    assert.strictEqual(start.getMinutes(), 0);

    assert.strictEqual(end.getFullYear(), 2026);
    assert.strictEqual(end.getDate(), 7);
    assert.strictEqual(end.getHours(), 23);
    assert.strictEqual(end.getMinutes(), 59);
  });

  it('assigns sleep crossing midnight to the preceding evening sleep night', () => {
    // Scenario: Sleep starts at 11:30 PM on Oct 6 and ends at 7:15 AM on Oct 7
    const nightStart = new Date(2026, 9, 6, 23, 30, 0);
    const nightKey = getSleepNightKey(nightStart);
    assert.strictEqual(nightKey, '2026-10-06');

    // Scenario: Sleep starts late at 1:15 AM on Oct 7 and ends at 8:30 AM on Oct 7
    const lateStart = new Date(2026, 9, 7, 1, 15, 0);
    const lateNightKey = getSleepNightKey(lateStart);
    assert.strictEqual(lateNightKey, '2026-10-06', 'Sleep at 1:15 AM belongs to Oct 6 night');
  });

  it('assigns afternoon nap to current calendar day', () => {
    const napStart = new Date(2026, 9, 7, 14, 0, 0); // 2:00 PM Oct 7
    const napKey = getSleepNightKey(napStart);
    assert.strictEqual(napKey, '2026-10-07');
  });

  it('processes sleep sessions with stages accurately without fabricating data', () => {
    const sessions = [
      {
        startDate: new Date(2026, 9, 6, 23, 42, 0).toISOString(),
        endDate: new Date(2026, 9, 7, 7, 18, 0).toISOString(),
        stages: [
          { stage: 'deep' as const, durationMinutes: 84 },
          { stage: 'light' as const, durationMinutes: 292 },
          { stage: 'rem' as const, durationMinutes: 80 },
          { stage: 'awake' as const, durationMinutes: 18 },
        ],
      },
    ];

    const result = processSleepSessions(sessions, '2026-10-06');
    assert.strictEqual(result.durationMinutes, 456); // 84 + 292 + 80 = 456 mins = 7h 36m
    assert.strictEqual(result.hasStages, true);
    assert.deepStrictEqual(result.stages, {
      deep: 84,
      light: 292,
      rem: 80,
      awake: 18,
    });
  });

  it('omits sleep stages when source does not provide stage data', () => {
    const sessions = [
      {
        startDate: new Date(2026, 9, 6, 23, 0, 0).toISOString(),
        endDate: new Date(2026, 9, 7, 7, 0, 0).toISOString(),
      },
    ];

    const result = processSleepSessions(sessions, '2026-10-06');
    assert.strictEqual(result.durationMinutes, 480); // 8 hours
    assert.strictEqual(result.hasStages, false);
    assert.strictEqual(result.stages, undefined);
  });

  it('calculates transparent recovery sleep score', () => {
    // 7h 36m (456 min) vs 8h goal (480 min) with healthy stages
    const score = calculateSleepScore(456, 480, {
      deep: 84, // 18.4%
      light: 292,
      rem: 80, // 17.5%
      awake: 18,
    });

    assert.ok(score.score >= 80 && score.score <= 100);
    assert.ok(score.rating === 'GOOD' || score.rating === 'EXCELLENT');
    assert.ok(score.consistencyNote.includes('Deep: 18%'));
  });

  it('calculates daily readiness and adapts training recommendation', () => {
    // Good sleep and high recovery
    const readyResult = calculateDailyReadiness({
      sleepDurationMinutes: 492, // 8h 12m
      sleepGoalMinutes: 480,
      muscleRecoveryPercentage: 91,
      steps: 8426,
      stepGoal: 10000,
    });

    assert.ok(readyResult.score >= 80);
    assert.strictEqual(readyResult.rating, 'OPTIMAL');
    assert.ok(readyResult.trainingRecommendation.includes('Proceed'));

    // Low sleep and poor recovery
    const lowResult = calculateDailyReadiness({
      sleepDurationMinutes: 342, // 5h 42m
      sleepGoalMinutes: 480,
      muscleRecoveryPercentage: 45,
      steps: 3000,
      stepGoal: 10000,
    });

    assert.ok(lowResult.score < 65);
    assert.ok(lowResult.trainingRecommendation.includes('reducing') || lowResult.trainingRecommendation.includes('recovery'));
  });

  it('formats minutes to human readable string', () => {
    assert.strictEqual(formatMinutesToHours(456), '7h 36m');
    assert.strictEqual(formatMinutesToHours(480), '8h');
    assert.strictEqual(formatMinutesToHours(45), '45m');
  });

  it('formats health source label cleanly', () => {
    assert.strictEqual(formatHealthSourceLabel('health_connect'), 'Health Connect');
    assert.strictEqual(formatHealthSourceLabel('healthkit'), 'Apple Health');
    assert.strictEqual(formatHealthSourceLabel('manual'), 'Manual Entry');
  });
});
