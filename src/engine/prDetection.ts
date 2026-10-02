// ─────────────────────────────────────────────────────────────
// MyFitAI — Personal Record Detection Engine
// Detects: weight, reps, volume, 1RM, duration, distance PRs
// ─────────────────────────────────────────────────────────────

import type { PRRecord, LoggedSet, WorkoutSession } from '../types/workout';
import type { ExerciseType } from '../types/exercise';
import { calculate1RM } from '../types/workout';

export interface PRCheckResult {
  pr: PRRecord | null;
  allPRs: PRRecord[];
}

/**
 * Check a single completed set against all stored PRs for that exercise.
 * Returns the most notable PR if found.
 */
export function detectPR(
  exerciseId: string,
  exerciseName: string,
  exerciseType: ExerciseType,
  set: LoggedSet,
  sessionId: string,
  existingPRs: PRRecord[],
): PRCheckResult {
  if (!set.completed || set.skipped || set.status === 'skipped') {
    return { pr: null, allPRs: existingPRs };
  }

  const newPRs: PRRecord[] = [];
  const updatedPRs = [...existingPRs];
  const now = new Date().toISOString();

  // Weight PR (for weight-based exercises)
  if (set.weight > 0 && (exerciseType === 'weight_reps' || exerciseType === 'weighted_bodyweight')) {
    const bestWeight = existingPRs.find(p => p.type === 'weight');
    if (!bestWeight || set.weight > bestWeight.value) {
      const pr: PRRecord = {
        exerciseId, exerciseName,
        type: 'weight',
        value: set.weight,
        previousValue: bestWeight?.value,
        date: now,
        sessionId,
      };
      newPRs.push(pr);
      upsertPR(updatedPRs, pr);
    }
  }

  // Reps PR (best reps at a given weight)
  if (set.reps > 0 && set.weight > 0) {
    const bestReps = existingPRs.find(p => p.type === 'reps');
    if (!bestReps || set.reps > bestReps.value) {
      const pr: PRRecord = {
        exerciseId, exerciseName,
        type: 'reps',
        value: set.reps,
        previousValue: bestReps?.value,
        date: now,
        sessionId,
      };
      newPRs.push(pr);
      upsertPR(updatedPRs, pr);
    }
  }

  // 1RM PR (only for strength exercises, capped at 15 reps for reliability)
  if (set.weight > 0 && set.reps > 0 && set.reps <= 15) {
    const estimated = calculate1RM(set.weight, set.reps);
    const best1RM = existingPRs.find(p => p.type === '1rm');
    if (!best1RM || estimated > best1RM.value) {
      const pr: PRRecord = {
        exerciseId, exerciseName,
        type: '1rm',
        value: estimated,
        previousValue: best1RM?.value,
        date: now,
        sessionId,
      };
      newPRs.push(pr);
      upsertPR(updatedPRs, pr);
    }
  }

  // Volume PR (weight × reps for a single set)
  if (set.weight > 0 && set.reps > 0) {
    const volume = set.weight * set.reps;
    const bestVolume = existingPRs.find(p => p.type === 'volume');
    if (!bestVolume || volume > bestVolume.value) {
      const pr: PRRecord = {
        exerciseId, exerciseName,
        type: 'volume',
        value: volume,
        previousValue: bestVolume?.value,
        date: now,
        sessionId,
      };
      newPRs.push(pr);
      upsertPR(updatedPRs, pr);
    }
  }

  // Duration PR (for timed exercises)
  if ((set.duration || 0) > 0 && (exerciseType === 'timed' || exerciseType === 'cardio')) {
    const bestDuration = existingPRs.find(p => p.type === 'duration');
    if (!bestDuration || (set.duration || 0) > bestDuration.value) {
      const pr: PRRecord = {
        exerciseId, exerciseName,
        type: 'duration',
        value: set.duration!,
        previousValue: bestDuration?.value,
        date: now,
        sessionId,
      };
      newPRs.push(pr);
      upsertPR(updatedPRs, pr);
    }
  }

  // Distance PR (for cardio/distance exercises)
  if ((set.distance || 0) > 0 && (exerciseType === 'cardio' || exerciseType === 'distance')) {
    const bestDistance = existingPRs.find(p => p.type === 'distance');
    if (!bestDistance || (set.distance || 0) > bestDistance.value) {
      const pr: PRRecord = {
        exerciseId, exerciseName,
        type: 'distance',
        value: set.distance!,
        previousValue: bestDistance?.value,
        date: now,
        sessionId,
      };
      newPRs.push(pr);
      upsertPR(updatedPRs, pr);
    }
  }

  // Return the first (most notable) PR, or null
  return {
    pr: newPRs.length > 0 ? newPRs[0] : null,
    allPRs: updatedPRs,
  };
}

/**
 * Detect all PRs across a completed workout session.
 */
export function detectSessionPRs(
  session: WorkoutSession,
  allExercisePRs: Map<string, PRRecord[]>,
): { prs: PRRecord[]; updatedPRMap: Map<string, PRRecord[]> } {
  const detectedPRs: PRRecord[] = [];
  const updatedMap = new Map(allExercisePRs);

  for (const ex of session.exercises) {
    for (const set of ex.sets) {
      const existingPRs = updatedMap.get(ex.exerciseId) || [];
      const result = detectPR(
        ex.exerciseId,
        ex.exerciseName,
        ex.exerciseType || 'weight_reps',
        set,
        session.id,
        existingPRs,
      );
      if (result.pr) {
        detectedPRs.push(result.pr);
        set.isPR = true;
      }
      updatedMap.set(ex.exerciseId, result.allPRs);
    }
  }

  return { prs: detectedPRs, updatedPRMap: updatedMap };
}

// ─── Helper ─────────────────────────────────────────────────

function upsertPR(prs: PRRecord[], newPR: PRRecord): void {
  const idx = prs.findIndex(p => p.type === newPR.type);
  if (idx >= 0) {
    prs[idx] = newPR;
  } else {
    prs.push(newPR);
  }
}
