import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  QUICK_SPLIT_PRESETS,
  buildQuickTemplate,
  buildCustomMuscleTemplate,
  lookupExerciseMedia,
} from '../../data/quickWorkoutSplits';

describe('Quick Workout Splits & Spontaneous Training Engine', () => {
  it('contains verified muscle presets including legs, back & biceps, and chest & triceps', () => {
    assert.ok(QUICK_SPLIT_PRESETS.length >= 6);

    const legs = QUICK_SPLIT_PRESETS.find(p => p.id === 'legs');
    assert.ok(legs, 'Legs preset must exist');
    assert.ok(legs.targetMuscles.includes('quads'));
    assert.ok(legs.targetMuscles.includes('hamstrings'));
    assert.ok(legs.recommendedExercises.length >= 3);

    const backBiceps = QUICK_SPLIT_PRESETS.find(p => p.id === 'back_biceps');
    assert.ok(backBiceps, 'Back & Biceps preset must exist');
    assert.ok(backBiceps.targetMuscles.includes('back'));
    assert.ok(backBiceps.targetMuscles.includes('biceps'));
    assert.ok(backBiceps.recommendedExercises.length >= 4);

    const chestTriceps = QUICK_SPLIT_PRESETS.find(p => p.id === 'chest_triceps');
    assert.ok(chestTriceps, 'Chest & Triceps preset must exist');
    assert.ok(chestTriceps.targetMuscles.includes('chest'));
    assert.ok(chestTriceps.targetMuscles.includes('triceps'));
  });

  it('buildQuickTemplate builds populated template with valid working sets', () => {
    const legs = QUICK_SPLIT_PRESETS.find(p => p.id === 'legs')!;
    const template = buildQuickTemplate(legs);

    assert.equal(template.type, 'strength');
    assert.ok(template.targetMuscles.includes('quads'));
    assert.equal(template.exercises.length, legs.recommendedExercises.length);
    assert.ok(template.exercises[0].sets.length >= 3);
    assert.ok(template.exercises[0].sets[0].targetReps > 0);
  });

  it('buildQuickTemplate supports blank session mode for spontaneous logging', () => {
    const backBiceps = QUICK_SPLIT_PRESETS.find(p => p.id === 'back_biceps')!;
    const template = buildQuickTemplate(backBiceps, { blank: true, customName: 'Heavy Pull Day' });

    assert.equal(template.name, 'Heavy Pull Day');
    assert.equal(template.exercises.length, 0);
    assert.ok(template.targetMuscles.includes('back'));
    assert.ok(template.targetMuscles.includes('biceps'));
  });

  it('buildCustomMuscleTemplate handles arbitrary multi-muscle selections', () => {
    const template = buildCustomMuscleTemplate(['shoulders', 'core']);

    assert.ok(template.name.includes('Shoulders'));
    assert.ok(template.targetMuscles.includes('shoulders'));
    assert.ok(template.targetMuscles.includes('core'));
    assert.ok(template.exercises.length > 0);
  });

  it('lookupExerciseMedia gracefully handles known and unknown exercises', () => {
    const known = lookupExerciseMedia('Barbell Bench Press');
    assert.ok(typeof known === 'object');

    const unknown = lookupExerciseMedia('Nonexistent Fantasy Movement 9000');
    assert.deepEqual(unknown, {});
  });
});

