// ─────────────────────────────────────────────────────────────
// MyFitAI — Progressive Overload Engine
// Supports: linear, double, greyskull LP, time, bodyweight
// progression. Each rule is configurable per-exercise.
// ─────────────────────────────────────────────────────────────

import type { ProgressionRule, LoggedSet, SessionExercise } from '../types/workout';
import type { ExerciseType } from '../types/exercise';

export interface ProgressionRecommendation {
  targetWeight: number;
  targetReps: number;
  targetDuration?: number;
  reason: string;
  shouldDeload: boolean;
  deloadReason?: string;
}

/**
 * Analyze previous session data and produce a recommendation for the next workout.
 */
export function getProgressionRecommendation(
  rule: ProgressionRule,
  _exerciseType: ExerciseType,
  previousSets: LoggedSet[],
  consecutiveFailures: number = 0,
): ProgressionRecommendation {
  const completedSets = previousSets.filter(
    s => s.completed && !s.skipped && s.status !== 'skipped'
  );

  if (completedSets.length === 0) {
    return {
      targetWeight: 0,
      targetReps: rule.minReps || 8,
      reason: 'No previous data. Start with a comfortable weight.',
      shouldDeload: false,
    };
  }

  // Check for deload first
  if (consecutiveFailures >= rule.failuresToDeload && rule.failuresToDeload > 0) {
    const avgWeight = completedSets.reduce((s, set) => s + set.weight, 0) / completedSets.length;
    const deloadWeight = roundToNearest(avgWeight * (1 - rule.deloadPercent), 2.5);
    return {
      targetWeight: deloadWeight,
      targetReps: rule.minReps,
      reason: `Deload recommended: ${consecutiveFailures} consecutive sessions below target. Reducing weight by ${Math.round(rule.deloadPercent * 100)}%.`,
      shouldDeload: true,
      deloadReason: `${consecutiveFailures} sessions without meeting target reps.`,
    };
  }

  switch (rule.type) {
    case 'linear':
      return linearProgression(rule, completedSets);
    case 'double':
      return doubleProgression(rule, completedSets);
    case 'greyskull':
      return greysSkullProgression(rule, completedSets);
    case 'time':
      return timeProgression(rule, completedSets);
    case 'bodyweight':
      return bodyweightProgression(rule, completedSets);
    default:
      return doubleProgression(rule, completedSets);
  }
}

// ─── Linear Progression ─────────────────────────────────────

function linearProgression(
  rule: ProgressionRule,
  prevSets: LoggedSet[],
): ProgressionRecommendation {
  const lastWeight = prevSets[prevSets.length - 1]?.weight || 0;
  const allHitTarget = prevSets.every(s => s.reps >= (rule.minReps || 5));

  if (allHitTarget && lastWeight > 0) {
    const newWeight = roundToNearest(lastWeight + rule.weightIncrement, 2.5);
    return {
      targetWeight: newWeight,
      targetReps: rule.minReps || 5,
      reason: `Last session: ${lastWeight}kg × ${prevSets.map(s => s.reps).join(', ')}. All sets hit target. Adding ${rule.weightIncrement}kg.`,
      shouldDeload: false,
    };
  }

  return {
    targetWeight: lastWeight,
    targetReps: rule.minReps || 5,
    reason: `Last session: ${lastWeight}kg × ${prevSets.map(s => s.reps).join(', ')}. Repeat weight until all sets hit ${rule.minReps} reps.`,
    shouldDeload: false,
  };
}

// ─── Double Progression ─────────────────────────────────────

function doubleProgression(
  rule: ProgressionRule,
  prevSets: LoggedSet[],
): ProgressionRecommendation {
  const lastWeight = prevSets[0]?.weight || 0;
  const allAtMax = prevSets.every(s => s.reps >= rule.maxReps);
  const setsAtMax = prevSets.filter(s => s.reps >= rule.maxReps).length;

  if (allAtMax || setsAtMax >= rule.setsToProgress) {
    const newWeight = roundToNearest(lastWeight + rule.weightIncrement, 2.5);
    return {
      targetWeight: newWeight,
      targetReps: rule.minReps,
      reason: `Last session: ${lastWeight}kg × ${prevSets.map(s => s.reps).join(', ')}. Hit top of ${rule.minReps}–${rule.maxReps} range. Increasing to ${newWeight}kg.`,
      shouldDeload: false,
    };
  }

  // Continue at same weight, aim higher reps
  const avgReps = Math.round(prevSets.reduce((s, set) => s + set.reps, 0) / prevSets.length);
  const targetReps = Math.min(avgReps + 1, rule.maxReps);

  return {
    targetWeight: lastWeight,
    targetReps,
    reason: `Last session: ${lastWeight}kg × ${prevSets.map(s => s.reps).join(', ')}. Continue building reps toward ${rule.maxReps} before increasing weight.`,
    shouldDeload: false,
  };
}

// ─── Greyskull LP ───────────────────────────────────────────

function greysSkullProgression(
  rule: ProgressionRule,
  prevSets: LoggedSet[],
): ProgressionRecommendation {
  const lastWeight = prevSets[0]?.weight || 0;
  const lastSet = prevSets[prevSets.length - 1]; // AMRAP set
  const workingSets = prevSets.slice(0, -1);

  const workingSetsHit = workingSets.every(s => s.reps >= rule.minReps);
  const amrapReps = lastSet?.reps || 0;

  if (workingSetsHit && amrapReps >= rule.minReps) {
    const newWeight = roundToNearest(lastWeight + rule.weightIncrement, 2.5);
    return {
      targetWeight: newWeight,
      targetReps: rule.minReps,
      reason: `Last session: ${lastWeight}kg × ${prevSets.map(s => s.reps).join(', ')} (AMRAP: ${amrapReps}). All sets passed. Adding ${rule.weightIncrement}kg.`,
      shouldDeload: false,
    };
  }

  // Failed — reset to 90%
  const resetWeight = roundToNearest(lastWeight * (1 - rule.deloadPercent), 2.5);
  return {
    targetWeight: resetWeight,
    targetReps: rule.minReps,
    reason: `Last session: ${lastWeight}kg × ${prevSets.map(s => s.reps).join(', ')}. Missed reps on working sets. Resetting to ${resetWeight}kg.`,
    shouldDeload: true,
    deloadReason: 'Greyskull LP reset after missed reps.',
  };
}

// ─── Time Progression ───────────────────────────────────────

function timeProgression(
  rule: ProgressionRule,
  prevSets: LoggedSet[],
): ProgressionRecommendation {
  const lastDuration = prevSets[0]?.duration || 0;
  const lastWeight = prevSets[0]?.weight || 0;
  const allHitTarget = prevSets.every(s => (s.duration || 0) >= lastDuration);

  if (allHitTarget && lastDuration > 0) {
    const newDuration = lastDuration + rule.timeIncrement;
    return {
      targetWeight: lastWeight,
      targetReps: 0,
      targetDuration: newDuration,
      reason: `Last session: ${lastDuration}s hold. All sets completed. Adding ${rule.timeIncrement}s.`,
      shouldDeload: false,
    };
  }

  return {
    targetWeight: lastWeight,
    targetReps: 0,
    targetDuration: lastDuration,
    reason: `Last session: ${prevSets.map(s => `${s.duration || 0}s`).join(', ')}. Repeat until all sets hit target.`,
    shouldDeload: false,
  };
}

// ─── Bodyweight Progression ─────────────────────────────────

function bodyweightProgression(
  rule: ProgressionRule,
  prevSets: LoggedSet[],
): ProgressionRecommendation {
  const lastWeight = prevSets[0]?.weight || 0; // added weight
  const numSets = prevSets.length;
  const allAtMax = prevSets.every(s => s.reps >= rule.maxRepsBeforeAddSet);

  // Phase 1: Increase reps
  if (!allAtMax) {
    const avgReps = Math.round(prevSets.reduce((s, set) => s + set.reps, 0) / prevSets.length);
    return {
      targetWeight: lastWeight,
      targetReps: Math.min(avgReps + 1, rule.maxRepsBeforeAddSet),
      reason: `Last session: ${prevSets.map(s => s.reps).join(', ')} reps. Build toward ${rule.maxRepsBeforeAddSet} reps per set.`,
      shouldDeload: false,
    };
  }

  // Phase 2: All at max reps — add a set if below max sets
  if (numSets < rule.maxSetsBeforeWeight) {
    return {
      targetWeight: lastWeight,
      targetReps: rule.maxRepsBeforeAddSet,
      reason: `All sets at ${rule.maxRepsBeforeAddSet} reps. Add another set (${numSets} → ${numSets + 1}).`,
      shouldDeload: false,
    };
  }

  // Phase 3: Max sets reached — add weight, reset reps
  const newWeight = roundToNearest(lastWeight + rule.weightIncrement, 2.5);
  return {
    targetWeight: newWeight,
    targetReps: rule.minReps,
    reason: `${numSets} × ${rule.maxRepsBeforeAddSet} achieved. Adding ${rule.weightIncrement}kg external load, resetting to ${rule.minReps} reps.`,
    shouldDeload: false,
  };
}

// ─── Utility ────────────────────────────────────────────────

function roundToNearest(value: number, step: number): number {
  return Math.round(value / step) * step;
}

/**
 * Count consecutive failures for a given exercise across sessions.
 * A "failure" = any set where reps < targetReps.
 */
export function countConsecutiveFailures(
  exerciseId: string,
  sessions: { exercises: SessionExercise[] }[],
  targetReps: number,
): number {
  let count = 0;
  for (const session of sessions) {
    const ex = session.exercises.find(e => e.exerciseId === exerciseId);
    if (!ex) continue;
    const completedSets = ex.sets.filter(s => s.completed && !s.skipped);
    if (completedSets.length === 0) continue;
    const anyFailed = completedSets.some(s => s.reps < targetReps);
    if (anyFailed) {
      count++;
    } else {
      break; // streak broken
    }
  }
  return count;
}

/**
 * Get a human-readable label for a progression type
 */
export function getProgressionLabel(type: ProgressionRule['type']): string {
  switch (type) {
    case 'linear': return 'Linear Progression';
    case 'double': return 'Double Progression';
    case 'greyskull': return 'Greyskull LP';
    case 'time': return 'Time Progression';
    case 'bodyweight': return 'Bodyweight Progression';
    default: return 'Custom';
  }
}

/**
 * Get a short description for a progression type
 */
export function getProgressionDescription(type: ProgressionRule['type']): string {
  switch (type) {
    case 'linear':
      return 'Add weight each session when target reps are met.';
    case 'double':
      return 'Build reps within a range, then increase weight.';
    case 'greyskull':
      return 'AMRAP last set. Reset on failure.';
    case 'time':
      return 'Increase hold duration each session.';
    case 'bodyweight':
      return 'Increase reps → sets → external load.';
    default:
      return '';
  }
}
