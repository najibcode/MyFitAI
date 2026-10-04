import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { aggregateShareableMuscleData } from '../../services/share/shareMuscleDataService';
import { generateSocialCaption } from '../../services/share/shareExportService';
import { DEFAULT_SHARE_CONFIG, FORMAT_DIMENSIONS } from '../../types/shareCard';
import { WorkoutSession } from '../../types/workout';

describe('Shareable Muscle Card Engine', () => {
  const now = new Date();
  const mockSessions: WorkoutSession[] = [
    {
      id: 'session-1',
      templateName: 'Chest & Arms Hypertrophy',
      type: 'strength',
      startedAt: new Date(now.getTime() - 2 * 86400000).toISOString(),
      endedAt: new Date(now.getTime() - 2 * 86400000 + 3600000).toISOString(),
      duration: 3600,
      totalVolume: 3560,
      totalSets: 5,
      totalReps: 50,
      notes: '',
      musclesWorked: ['Chest', 'Shoulders', 'Triceps'],
      prsHit: [
        {
          exerciseId: 'ex-1',
          exerciseName: 'Barbell Bench Press',
          type: 'weight',
          value: 105,
          date: new Date(now.getTime() - 2 * 86400000).toISOString(),
          sessionId: 'session-1',
        },
      ],
      exercises: [
        {
          exerciseId: 'bench-press',
          exerciseName: 'Barbell Bench Press',
          exerciseType: 'strength',
          primaryMuscles: ['Chest'],
          sets: [
            { reps: 10, weight: 100, rpe: 8, effortMode: 'rpe', setType: 'normal', status: 'completed', completed: true, skipped: false, timestamp: new Date().toISOString() },
            { reps: 10, weight: 100, rpe: 8.5, effortMode: 'rpe', setType: 'normal', status: 'completed', completed: true, skipped: false, timestamp: new Date().toISOString() },
            { reps: 8, weight: 105, rpe: 9, effortMode: 'rpe', setType: 'normal', status: 'completed', completed: true, skipped: false, timestamp: new Date().toISOString(), isPR: true },
          ],
        },
        {
          exerciseId: 'incline-db-press',
          exerciseName: 'Incline Dumbbell Press',
          exerciseType: 'strength',
          primaryMuscles: ['Chest'],
          sets: [
            { reps: 12, weight: 30, rpe: 8, effortMode: 'rpe', setType: 'normal', status: 'completed', completed: true, skipped: false, timestamp: new Date().toISOString() },
            { reps: 12, weight: 30, rpe: 8.5, effortMode: 'rpe', setType: 'normal', status: 'completed', completed: true, skipped: false, timestamp: new Date().toISOString() },
          ],
        },
      ],
    },
    {
      id: 'session-2',
      templateName: 'Back & Deadlift Day',
      type: 'strength',
      startedAt: new Date(now.getTime() - 4 * 86400000).toISOString(),
      endedAt: new Date(now.getTime() - 4 * 86400000 + 4000000).toISOString(),
      duration: 4000,
      totalVolume: 2125,
      totalSets: 3,
      totalReps: 15,
      notes: '',
      musclesWorked: ['Back', 'Hamstrings', 'Glutes'],
      prsHit: [
        {
          exerciseId: 'ex-3',
          exerciseName: 'Barbell Deadlift',
          type: 'weight',
          value: 145,
          date: new Date(now.getTime() - 4 * 86400000).toISOString(),
          sessionId: 'session-2',
        },
      ],
      exercises: [
        {
          exerciseId: 'deadlift',
          exerciseName: 'Barbell Deadlift',
          exerciseType: 'strength',
          primaryMuscles: ['Back'],
          sets: [
            { reps: 5, weight: 140, rpe: 8, effortMode: 'rpe', setType: 'normal', status: 'completed', completed: true, skipped: false, timestamp: new Date().toISOString() },
            { reps: 5, weight: 140, rpe: 8.5, effortMode: 'rpe', setType: 'normal', status: 'completed', completed: true, skipped: false, timestamp: new Date().toISOString() },
            { reps: 5, weight: 145, rpe: 9, effortMode: 'rpe', setType: 'normal', status: 'completed', completed: true, skipped: false, timestamp: new Date().toISOString(), isPR: true },
          ],
        },
      ],
    },
  ];

  it('aggregates real workouts into ShareableMuscleData accurately for 7 days', () => {
    const data = aggregateShareableMuscleData(mockSessions, '7d');

    assert.equal(data.totalWorkouts, 2);
    assert.equal(data.totalSets, 8);
    assert.equal(data.totalVolumeKg, 5685);
    assert.ok(data.topMuscles.length > 0);
    assert.ok(data.prs.length >= 2, 'Should aggregate PR sets from session data');
  });

  it('calculates balance sets properly', () => {
    const data = aggregateShareableMuscleData(mockSessions, '7d');

    assert.ok(typeof data.balance.pushSets === 'number');
    assert.ok(typeof data.balance.pullSets === 'number');
    assert.ok(data.balance.pushSets > 0 || data.balance.pullSets > 0);
  });

  it('handles empty session history gracefully without throwing', () => {
    const data = aggregateShareableMuscleData([], '7d');

    assert.equal(data.totalWorkouts, 0);
    assert.equal(data.totalSets, 0);
    assert.equal(data.totalVolumeKg, 0);
    assert.equal(data.topMuscles.length, 0);
    assert.equal(data.prs.length, 0);
  });

  it('formats social share captions accurately and concisely', () => {
    const data = aggregateShareableMuscleData(mockSessions, '7d');
    const caption = generateSocialCaption(data);

    assert.ok(caption.includes('MyFitAI'));
    assert.ok(caption.includes('2 workouts'));
    assert.ok(caption.includes('8 sets'));
    assert.ok(caption.includes('5,685 kg'));
  });

  it('maintains verified format dimensions', () => {
    assert.deepEqual(FORMAT_DIMENSIONS['instagram_portrait'], { width: 1080, height: 1350 });
    assert.deepEqual(FORMAT_DIMENSIONS['instagram_square'], { width: 1080, height: 1080 });
    assert.deepEqual(FORMAT_DIMENSIONS['instagram_story'], { width: 1080, height: 1920 });
    assert.deepEqual(FORMAT_DIMENSIONS['whatsapp'], { width: 1080, height: 1350 });
  });

  it('ensures default share configuration complies with privacy and branding specs', () => {
    assert.equal(DEFAULT_SHARE_CONFIG.showLogo, true);
    assert.equal(DEFAULT_SHARE_CONFIG.showWatermark, true);
    assert.equal(DEFAULT_SHARE_CONFIG.theme, 'dark');
    assert.equal(DEFAULT_SHARE_CONFIG.format, 'instagram_portrait');
  });
});
