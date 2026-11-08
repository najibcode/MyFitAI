// ─────────────────────────────────────────────────────────────
// MyFitAI — Advanced Muscle Recovery & Training Load Engine
// Biomechanical exercise mapping, volume landmark evaluation,
// recovery decay curves, and muscle balance analytics.
// ─────────────────────────────────────────────────────────────

import {
  ANATOMICAL_MUSCLES,
  GROUP_TO_ANATOMICAL_MAP,
  type MuscleRole,
  type RecoveryState,
  type MuscleTrainingMetric,
  type MuscleBalanceSummary,
} from '../types/anatomicalMuscle';
import type { MuscleGroup, MovementPattern } from '../types/exercise';
import type { WorkoutSession, LoggedSet } from '../types/workout';

// ── 1. Granular Biomechanical Exercise Mapping Rules ─────────

interface BiomechanicalRule {
  primary: string[];
  synergist: string[];
}

/**
 * High-accuracy biomechanical rule table for specific exercises.
 * Key is lowercased exercise name or keyword.
 */
const BIOMECHANICAL_EXERCISE_RULES: Record<string, BiomechanicalRule> = {
  // Incline press / Upper chest focus
  'incline bench press': { primary: ['chest_upper', 'delts_anterior'], synergist: ['triceps_lateral', 'chest_mid'] },
  'incline dumbbell press': { primary: ['chest_upper', 'delts_anterior'], synergist: ['triceps_lateral', 'chest_mid'] },
  'low to high cable fly': { primary: ['chest_upper'], synergist: ['delts_anterior'] },

  // Flat bench / Mid chest
  'bench press': { primary: ['chest_mid', 'delts_anterior'], synergist: ['triceps_lateral', 'chest_upper', 'forearms_flexors'] },
  'dumbbell bench press': { primary: ['chest_mid', 'delts_anterior'], synergist: ['triceps_lateral', 'chest_upper'] },
  'push-up': { primary: ['chest_mid', 'triceps_lateral'], synergist: ['delts_anterior', 'abs_upper'] },
  'chest fly': { primary: ['chest_mid'], synergist: ['delts_anterior', 'chest_upper'] },
  'cable crossover': { primary: ['chest_mid', 'chest_lower'], synergist: ['delts_anterior'] },

  // Dips / Lower chest
  'dip': { primary: ['chest_lower', 'triceps_lateral'], synergist: ['delts_anterior', 'chest_mid'] },
  'dips': { primary: ['chest_lower', 'triceps_lateral'], synergist: ['delts_anterior', 'chest_mid'] },
  'decline bench press': { primary: ['chest_lower', 'chest_mid'], synergist: ['triceps_lateral'] },

  // Overhead press / Delts
  'overhead press': { primary: ['delts_anterior', 'delts_lateral'], synergist: ['triceps_lateral', 'traps_upper', 'chest_upper'] },
  'military press': { primary: ['delts_anterior', 'delts_lateral'], synergist: ['triceps_lateral', 'traps_upper'] },
  'dumbbell shoulder press': { primary: ['delts_anterior', 'delts_lateral'], synergist: ['triceps_lateral', 'traps_upper'] },
  'lateral raise': { primary: ['delts_lateral'], synergist: ['traps_upper'] },
  'cable lateral raise': { primary: ['delts_lateral'], synergist: ['traps_upper'] },
  'face pull': { primary: ['delts_posterior', 'traps_lower', 'rhomboids'], synergist: ['delts_lateral'] },
  'reverse fly': { primary: ['delts_posterior', 'rhomboids'], synergist: ['traps_lower'] },
  'reverse pec deck': { primary: ['delts_posterior', 'rhomboids'], synergist: ['traps_lower'] },

  // Lats & Back
  'pull-up': { primary: ['lats', 'traps_lower'], synergist: ['biceps_long', 'biceps_short', 'rhomboids', 'forearms_flexors'] },
  'pull up': { primary: ['lats', 'traps_lower'], synergist: ['biceps_long', 'biceps_short', 'rhomboids', 'forearms_flexors'] },
  'chin-up': { primary: ['lats', 'biceps_short'], synergist: ['traps_lower', 'rhomboids', 'forearms_flexors'] },
  'lat pulldown': { primary: ['lats', 'traps_lower'], synergist: ['biceps_long', 'rhomboids', 'forearms_flexors'] },
  'barbell row': { primary: ['rhomboids', 'lats', 'traps_lower'], synergist: ['delts_posterior', 'biceps_long', 'erector_spinae', 'forearms_flexors'] },
  'bent over row': { primary: ['rhomboids', 'lats', 'traps_lower'], synergist: ['delts_posterior', 'biceps_long', 'erector_spinae', 'forearms_flexors'] },
  'dumbbell row': { primary: ['lats', 'rhomboids'], synergist: ['biceps_long', 'traps_lower', 'forearms_flexors'] },
  'cable row': { primary: ['rhomboids', 'traps_lower', 'lats'], synergist: ['biceps_long', 'delts_posterior', 'forearms_flexors'] },
  'shrug': { primary: ['traps_upper'], synergist: ['forearms_flexors'] },

  // Deadlift & Posterior Chain
  'deadlift': { primary: ['erector_spinae', 'glute_max', 'hamstrings_medial'], synergist: ['quads_vastus', 'traps_upper', 'lats', 'forearms_flexors'] },
  'romanian deadlift': { primary: ['hamstrings_medial', 'hamstrings_lateral', 'glute_max'], synergist: ['erector_spinae', 'traps_upper', 'forearms_flexors'] },
  'rdl': { primary: ['hamstrings_medial', 'hamstrings_lateral', 'glute_max'], synergist: ['erector_spinae', 'traps_upper', 'forearms_flexors'] },
  'back extension': { primary: ['erector_spinae', 'glute_max'], synergist: ['hamstrings_medial'] },

  // Squats & Quads
  'squat': { primary: ['quads_vastus', 'quads_rectus_femoris', 'glute_max'], synergist: ['adductors', 'erector_spinae', 'calves_soleus'] },
  'barbell squat': { primary: ['quads_vastus', 'quads_rectus_femoris', 'glute_max'], synergist: ['adductors', 'erector_spinae', 'calves_soleus'] },
  'front squat': { primary: ['quads_rectus_femoris', 'quads_vastus'], synergist: ['glute_max', 'abs_upper', 'erector_spinae'] },
  'leg press': { primary: ['quads_vastus', 'glute_max'], synergist: ['adductors', 'quads_rectus_femoris'] },
  'hack squat': { primary: ['quads_vastus', 'quads_rectus_femoris'], synergist: ['glute_max'] },
  'lunge': { primary: ['quads_vastus', 'glute_max'], synergist: ['glute_med', 'adductors', 'hamstrings_medial'] },
  'bulgarian split squat': { primary: ['quads_vastus', 'glute_max'], synergist: ['glute_med', 'adductors'] },
  'leg extension': { primary: ['quads_rectus_femoris', 'quads_vastus'], synergist: [] },

  // Hamstrings & Glutes
  'leg curl': { primary: ['hamstrings_lateral', 'hamstrings_medial'], synergist: ['calves_gastrocnemius'] },
  'lying leg curl': { primary: ['hamstrings_lateral', 'hamstrings_medial'], synergist: ['calves_gastrocnemius'] },
  'seated leg curl': { primary: ['hamstrings_medial', 'hamstrings_lateral'], synergist: [] },
  'hip thrust': { primary: ['glute_max'], synergist: ['hamstrings_medial', 'adductors', 'erector_spinae'] },
  'glute bridge': { primary: ['glute_max'], synergist: ['hamstrings_medial'] },

  // Calves
  'calf raise': { primary: ['calves_gastrocnemius'], synergist: ['calves_soleus'] },
  'standing calf raise': { primary: ['calves_gastrocnemius'], synergist: ['calves_soleus'] },
  'seated calf raise': { primary: ['calves_soleus'], synergist: ['calves_gastrocnemius'] },
  'tibialis raise': { primary: ['tibialis'], synergist: [] },

  // Arms
  'bicep curl': { primary: ['biceps_long', 'biceps_short'], synergist: ['brachialis', 'forearms_flexors'] },
  'barbell curl': { primary: ['biceps_long', 'biceps_short'], synergist: ['brachialis', 'forearms_flexors'] },
  'dumbbell curl': { primary: ['biceps_long', 'biceps_short'], synergist: ['brachialis', 'forearms_flexors'] },
  'preacher curl': { primary: ['biceps_short', 'brachialis'], synergist: ['biceps_long', 'forearms_flexors'] },
  'hammer curl': { primary: ['brachialis', 'biceps_long'], synergist: ['forearms_flexors'] },
  'tricep extension': { primary: ['triceps_long'], synergist: ['triceps_lateral'] },
  'skull crusher': { primary: ['triceps_long', 'triceps_lateral'], synergist: ['forearms_extensors'] },
  'tricep pushdown': { primary: ['triceps_lateral'], synergist: ['triceps_long'] },
  'rope pushdown': { primary: ['triceps_lateral'], synergist: ['triceps_long'] },
  'close grip bench press': { primary: ['triceps_lateral', 'chest_mid'], synergist: ['delts_anterior', 'triceps_long'] },

  // Core
  'crunch': { primary: ['abs_upper'], synergist: ['abs_lower'] },
  'cable crunch': { primary: ['abs_upper'], synergist: ['abs_lower', 'obliques'] },
  'leg raise': { primary: ['abs_lower'], synergist: ['abs_upper'] },
  'hanging leg raise': { primary: ['abs_lower'], synergist: ['abs_upper', 'forearms_flexors'] },
  'plank': { primary: ['abs_upper', 'abs_lower'], synergist: ['obliques', 'delts_anterior'] },
  'russian twist': { primary: ['obliques'], synergist: ['abs_lower'] },
  'side plank': { primary: ['obliques'], synergist: ['glute_med'] },
};

/**
 * Maps movement patterns to fallback granular muscles if name doesn't match
 */
const PATTERN_FALLBACK_MAP: Partial<Record<MovementPattern, BiomechanicalRule>> = {
  push_horizontal: { primary: ['chest_mid', 'delts_anterior'], synergist: ['triceps_lateral'] },
  push_vertical: { primary: ['delts_anterior', 'delts_lateral'], synergist: ['triceps_lateral', 'traps_upper'] },
  pull_horizontal: { primary: ['rhomboids', 'traps_lower', 'lats'], synergist: ['biceps_long', 'forearms_flexors'] },
  pull_vertical: { primary: ['lats'], synergist: ['biceps_short', 'traps_lower', 'forearms_flexors'] },
  squat: { primary: ['quads_vastus', 'glute_max'], synergist: ['adductors', 'erector_spinae'] },
  hinge: { primary: ['hamstrings_medial', 'glute_max', 'erector_spinae'], synergist: ['traps_upper', 'forearms_flexors'] },
  lunge: { primary: ['quads_vastus', 'glute_max'], synergist: ['glute_med', 'adductors'] },
  carry: { primary: ['traps_upper', 'forearms_flexors'], synergist: ['obliques', 'erector_spinae'] },
  rotation: { primary: ['obliques'], synergist: ['abs_lower'] },
  isolation: { primary: [], synergist: [] },
};

/**
 * Resolves an exercise into granular anatomical target muscles (primary and synergists).
 */
export function resolveExerciseMuscles(exercise: {
  name?: string;
  exerciseName?: string;
  primaryMuscles?: MuscleGroup[];
  secondaryMuscles?: MuscleGroup[];
  movementPattern?: MovementPattern;
}): { primary: string[]; synergists: string[] } {
  const normName = (exercise.name || exercise.exerciseName || '').toLowerCase().trim();

  // 1. Exact match first
  if (BIOMECHANICAL_EXERCISE_RULES[normName]) {
    const rule = BIOMECHANICAL_EXERCISE_RULES[normName];
    return {
      primary: [...rule.primary],
      synergists: [...rule.synergist],
    };
  }

  // 2. Substring match from longest keyword to shortest
  // Prevents 'deadlift' from prematurely matching 'romanian deadlift', etc.
  const sortedKeys = Object.keys(BIOMECHANICAL_EXERCISE_RULES).sort((a, b) => b.length - a.length);
  for (const key of sortedKeys) {
    if (normName.includes(key)) {
      const rule = BIOMECHANICAL_EXERCISE_RULES[key];
      return {
        primary: [...rule.primary],
        synergists: [...rule.synergist],
      };
    }
  }

  // 2. Fallback based on movement pattern
  if (exercise.movementPattern && PATTERN_FALLBACK_MAP[exercise.movementPattern]) {
    const patternRule = PATTERN_FALLBACK_MAP[exercise.movementPattern]!;
    if (patternRule.primary.length > 0) {
      return {
        primary: [...patternRule.primary],
        synergists: [...patternRule.synergist],
      };
    }
  }

  // 3. Fallback based on primaryMuscles and secondaryMuscles
  const primarySet = new Set<string>();
  const synergistSet = new Set<string>();

  if (exercise.primaryMuscles && exercise.primaryMuscles.length > 0) {
    for (const group of exercise.primaryMuscles) {
      const mapped = GROUP_TO_ANATOMICAL_MAP[group] || [];
      mapped.forEach(m => primarySet.add(m));
    }
  }

  if (exercise.secondaryMuscles && exercise.secondaryMuscles.length > 0) {
    for (const group of exercise.secondaryMuscles) {
      const mapped = GROUP_TO_ANATOMICAL_MAP[group] || [];
      mapped.forEach(m => {
        if (!primarySet.has(m)) {
          synergistSet.add(m);
        }
      });
    }
  }

  return {
    primary: Array.from(primarySet),
    synergists: Array.from(synergistSet),
  };
}

// ── 2. Recovery Decay Curve ───────────────────────────────────

/**
 * Calculates recovery percentage (0 to 100) based on hours elapsed
 * and muscle-specific recovery time.
 * Uses physiological asymptotic exponential curve:
 * R(t) = min(100, round(100 * (1 - e^(-3 * t / t_rec))))
 */
export function calculateRecoveryPercentage(hoursElapsed: number, typicalRecoveryHours: number): number {
  if (hoursElapsed < 0 || isNaN(hoursElapsed)) return 100;
  if (hoursElapsed === 0) return 10; // Immediately post-workout: heavily fatigued
  const recTime = Math.max(12, typicalRecoveryHours);
  // At t = recTime, 1 - e^-3.0 = 1 - 0.0498 = ~95%
  const recoveryFraction = 1 - Math.exp((-3.0 * hoursElapsed) / recTime);
  return Math.min(100, Math.max(10, Math.round(recoveryFraction * 100)));
}

/**
 * Categorizes recovery percentage into discrete state
 */
export function getRecoveryState(percentage: number): RecoveryState {
  if (percentage >= 90) return 'fresh';
  if (percentage >= 55) return 'recovering';
  if (percentage >= 25) return 'fatigued';
  return 'overreached';
}

// ── 3. Session Aggregator & Training Load ──────────────────────

export interface MuscleProcessingOptions {
  timeframe?: 'session' | '7d' | '30d' | 'all';
  referenceDate?: Date; // Defaults to now
}

/**
 * Computes granular training metrics for all anatomical muscles
 * from completed workout sessions.
 */
export function computeMuscleTrainingMetrics(
  sessions: WorkoutSession[],
  options: MuscleProcessingOptions = {}
): Record<string, MuscleTrainingMetric> {
  const now = options.referenceDate ? options.referenceDate.getTime() : Date.now();
  const timeframe = options.timeframe || '7d';

  let minTimestamp = 0;
  if (timeframe === '7d') minTimestamp = now - 7 * 86400000;
  else if (timeframe === '30d') minTimestamp = now - 30 * 86400000;
  else if (timeframe === 'session') minTimestamp = now - 24 * 3600000;

  // Filter sessions within window
  const relevantSessions = sessions.filter(s => {
    const sTime = s.endedAt ? new Date(s.endedAt).getTime() : new Date(s.startedAt).getTime();
    return sTime >= minTimestamp;
  });

  // Initialize metric map for all muscles
  const metrics: Record<string, MuscleTrainingMetric> = {};

  for (const [id, info] of Object.entries(ANATOMICAL_MUSCLES)) {
    metrics[id] = {
      muscleId: id,
      info,
      primarySets: 0,
      synergistSets: 0,
      effectiveSets: 0,
      volumeLoadKg: 0,
      lastTrainedDate: null,
      hoursSinceLastTrained: null,
      recoveryPercentage: 100,
      recoveryState: 'fresh',
      targetRole: null,
      contributingExercises: [],
    };
  }

  // Find overall latest trained date per muscle across all history for recovery estimation
  const latestTrainedMap = new Map<string, number>();
  for (const s of sessions) {
    const sDate = s.endedAt || s.startedAt;
    const sTime = new Date(sDate).getTime();

    for (const ex of s.exercises) {
      const hasCompletedSet = ex.sets.some(isSetCompleted);
      if (!hasCompletedSet) continue;

      const { primary, synergists } = resolveExerciseMuscles(ex);
      for (const m of primary) {
        const prev = latestTrainedMap.get(m) || 0;
        if (sTime > prev) latestTrainedMap.set(m, sTime);
      }
      for (const m of synergists) {
        const prev = latestTrainedMap.get(m) || 0;
        if (sTime > prev) latestTrainedMap.set(m, sTime);
      }
    }
  }

  // Aggregate metrics over the relevant timeframe
  for (const s of relevantSessions) {
    const sDate = s.endedAt || s.startedAt;

    for (const ex of s.exercises) {
      const completedSets = ex.sets.filter(isSetCompleted);
      if (completedSets.length === 0) continue;

      const { primary, synergists } = resolveExerciseMuscles(ex);
      const exerciseVolume = completedSets.reduce((sum, set) => {
        const wt = set.weight || 0;
        const reps = set.reps || 0;
        return sum + wt * reps;
      }, 0);

      // Primary targets
      for (const m of primary) {
        if (!metrics[m]) continue;
        metrics[m].primarySets += completedSets.length;
        metrics[m].volumeLoadKg += exerciseVolume;
        metrics[m].targetRole = 'primary';

        addOrUpdateContributingExercise(metrics[m], {
          exerciseId: ex.exerciseId,
          exerciseName: ex.exerciseName,
          role: 'primary',
          sets: completedSets.length,
          volumeLoadKg: exerciseVolume,
          lastTrainedDate: sDate,
        });
      }

      // Synergists
      for (const m of synergists) {
        if (!metrics[m]) continue;
        metrics[m].synergistSets += completedSets.length;
        // Half volume load attributed to synergists
        metrics[m].volumeLoadKg += Math.round(exerciseVolume * 0.5);
        if (!metrics[m].targetRole) {
          metrics[m].targetRole = 'synergist';
        }

        addOrUpdateContributingExercise(metrics[m], {
          exerciseId: ex.exerciseId,
          exerciseName: ex.exerciseName,
          role: 'synergist',
          sets: completedSets.length,
          volumeLoadKg: Math.round(exerciseVolume * 0.5),
          lastTrainedDate: sDate,
        });
      }
    }
  }

  // Calculate final effective sets, recovery % and state
  for (const m of Object.keys(metrics)) {
    const item = metrics[m];
    item.effectiveSets = Math.round((item.primarySets + item.synergistSets * 0.5) * 10) / 10;

    // Sort contributing exercises: primary first, then highest sets
    item.contributingExercises.sort((a, b) => {
      if (a.role === 'primary' && b.role !== 'primary') return -1;
      if (b.role === 'primary' && a.role !== 'primary') return 1;
      return b.sets - a.sets;
    });

    const lastTime = latestTrainedMap.get(m);
    if (lastTime) {
      item.lastTrainedDate = new Date(lastTime).toISOString();
      const hours = Math.max(0, (now - lastTime) / (1000 * 3600));
      item.hoursSinceLastTrained = Math.round(hours * 10) / 10;
      item.recoveryPercentage = calculateRecoveryPercentage(hours, item.info.typicalRecoveryHours);
      item.recoveryState = getRecoveryState(item.recoveryPercentage);
    } else {
      item.hoursSinceLastTrained = null;
      item.recoveryPercentage = 100;
      item.recoveryState = 'fresh';
    }
  }

  return metrics;
}

function isSetCompleted(set: LoggedSet): boolean {
  return set.status === 'completed' || set.completed === true;
}

function addOrUpdateContributingExercise(
  metric: MuscleTrainingMetric,
  entry: {
    exerciseId: string;
    exerciseName: string;
    role: MuscleRole;
    sets: number;
    volumeLoadKg: number;
    lastTrainedDate: string;
  }
) {
  const existing = metric.contributingExercises.find(e => e.exerciseId === entry.exerciseId);
  if (existing) {
    existing.sets += entry.sets;
    existing.volumeLoadKg += entry.volumeLoadKg;
    if (entry.lastTrainedDate > existing.lastTrainedDate) {
      existing.lastTrainedDate = entry.lastTrainedDate;
    }
  } else {
    metric.contributingExercises.push({ ...entry });
  }
}

// ── 4. Muscle Balance & Symmetry Analysis ─────────────────────

/**
 * Calculates push/pull, anterior/posterior deltoid, and quad/hamstring ratios.
 */
export function analyzeMuscleBalance(metrics: Record<string, MuscleTrainingMetric>): MuscleBalanceSummary {
  // Push sets: Chest, Front Delts, Lateral Delts, Triceps
  const pushSets =
    (metrics['chest_upper']?.effectiveSets || 0) +
    (metrics['chest_mid']?.effectiveSets || 0) +
    (metrics['chest_lower']?.effectiveSets || 0) +
    (metrics['delts_anterior']?.effectiveSets || 0) +
    (metrics['delts_lateral']?.effectiveSets || 0) +
    (metrics['triceps_lateral']?.effectiveSets || 0) +
    (metrics['triceps_long']?.effectiveSets || 0);

  // Pull sets: Lats, Rhomboids, Traps, Rear Delts, Biceps
  const pullSets =
    (metrics['lats']?.effectiveSets || 0) +
    (metrics['rhomboids']?.effectiveSets || 0) +
    (metrics['traps_upper']?.effectiveSets || 0) +
    (metrics['traps_lower']?.effectiveSets || 0) +
    (metrics['delts_posterior']?.effectiveSets || 0) +
    (metrics['biceps_long']?.effectiveSets || 0) +
    (metrics['biceps_short']?.effectiveSets || 0) +
    (metrics['brachialis']?.effectiveSets || 0);

  // Quad sets
  const quadSets =
    (metrics['quads_rectus_femoris']?.effectiveSets || 0) +
    (metrics['quads_vastus']?.effectiveSets || 0);

  // Hamstring sets
  const hamstringSets =
    (metrics['hamstrings_lateral']?.effectiveSets || 0) +
    (metrics['hamstrings_medial']?.effectiveSets || 0);

  // Deltoid balance
  const anteriorDeltSets = metrics['delts_anterior']?.effectiveSets || 0;
  const posteriorDeltSets = metrics['delts_posterior']?.effectiveSets || 0;

  const pushPullRatio = pullSets > 0 ? Math.round((pushSets / pullSets) * 100) / 100 : pushSets > 0 ? 2.0 : 1.0;
  const quadHamstringRatio = hamstringSets > 0 ? Math.round((quadSets / hamstringSets) * 100) / 100 : quadSets > 0 ? 2.0 : 1.0;
  const deltBalanceRatio = posteriorDeltSets > 0 ? Math.round((anteriorDeltSets / posteriorDeltSets) * 100) / 100 : anteriorDeltSets > 0 ? 2.0 : 1.0;

  // Region aggregation
  const regionTotals: Record<string, number> = {};
  for (const m of Object.values(metrics)) {
    regionTotals[m.info.region] = (regionTotals[m.info.region] || 0) + m.effectiveSets;
  }

  let mostTrained = 'None';
  let maxSets = 0;
  let leastTrained = 'None';
  let minSets = Infinity;

  for (const [reg, sets] of Object.entries(regionTotals)) {
    if (sets > maxSets) {
      maxSets = sets;
      mostTrained = reg;
    }
    if (sets < minSets && sets > 0) {
      minSets = sets;
      leastTrained = reg;
    }
  }

  const totalWeeklySets = Object.values(metrics).reduce((s, m) => s + m.primarySets, 0);

  return {
    pushSets: Math.round(pushSets),
    pullSets: Math.round(pullSets),
    pushPullRatio,
    quadSets: Math.round(quadSets),
    hamstringSets: Math.round(hamstringSets),
    quadHamstringRatio,
    anteriorDeltSets: Math.round(anteriorDeltSets),
    posteriorDeltSets: Math.round(posteriorDeltSets),
    deltBalanceRatio,
    totalWeeklySets,
    mostTrainedRegion: mostTrained.charAt(0).toUpperCase() + mostTrained.slice(1),
    leastTrainedRegion: leastTrained === 'None' ? 'None' : leastTrained.charAt(0).toUpperCase() + leastTrained.slice(1),
  };
}

// ── 5. Volume Status & Benchmark Helper ───────────────────────

export interface VolumeBenchmarkStatus {
  tier: 'under' | 'optimal' | 'high' | 'overreached';
  label: string;
  description: string;
  color: string;
  progressPercent: number; // 0 to 100 relative to MRV
}

export interface RecencyBenchmarkStatus {
  tier: 'today' | 'recent' | 'optimal' | 'decaying' | 'untrained';
  label: string;
  description: string;
  color: string;
  fillOpacity: number;
}

export function evaluateRecencyBenchmark(hoursSinceLastTrained: number | null): RecencyBenchmarkStatus {
  if (hoursSinceLastTrained === null) {
    return {
      tier: 'untrained',
      label: 'Not Trained',
      description: 'No recorded session in tracking window. Ready for training stimulus.',
      color: 'rgba(255, 255, 255, 0.05)',
      fillOpacity: 0.15,
    };
  }

  const days = hoursSinceLastTrained / 24;

  if (days <= 1) {
    return {
      tier: 'today',
      label: 'Trained Today / Yesterday',
      description: `Trained ${Math.round(hoursSinceLastTrained)}h ago. Peak protein synthesis active.`,
      color: '#FF8A00', // vibrant action orange
      fillOpacity: 0.95,
    };
  }

  if (days <= 3) {
    return {
      tier: 'recent',
      label: 'Trained 2–3 Days Ago',
      description: `Trained ${Math.round(days)} days ago. Entering recovery window.`,
      color: '#10B981', // emerald
      fillOpacity: 0.88,
    };
  }

  if (days <= 5) {
    return {
      tier: 'optimal',
      label: 'Optimal Retraining Window',
      description: `Trained ${Math.round(days)} days ago. Prime window to stimulate again.`,
      color: '#38BDF8', // sky blue
      fillOpacity: 0.82,
    };
  }

  return {
    tier: 'decaying',
    label: 'Overdue / 6+ Days Ago',
    description: `Trained ${Math.round(days)} days ago. Adaptation decaying; priority to target soon.`,
    color: '#94A3B8', // slate
    fillOpacity: 0.5,
  };
}

export function evaluateVolumeBenchmark(sets: number, mev: number, mav: number, mrv: number): VolumeBenchmarkStatus {
  if (sets === 0) {
    return {
      tier: 'under',
      label: 'Untrained / Neglected',
      description: '0 sets this period. Minimum 6 sets/week needed for growth stimulus.',
      color: '#64748B', // slate
      progressPercent: 0,
    };
  }

  if (sets < mev) {
    return {
      tier: 'under',
      label: 'Maintenance Dose',
      description: `${sets} sets. Below Minimum Effective Volume (${mev} sets). Maintains existing muscle.`,
      color: '#38BDF8', // sky blue
      progressPercent: Math.round((sets / mrv) * 100),
    };
  }

  if (sets <= mav) {
    return {
      tier: 'optimal',
      label: 'Optimal Hypertrophy (MAV)',
      description: `${sets} sets. In sweet spot for maximum muscle protein synthesis (${mev}–${mav} sets).`,
      color: '#10B981', // emerald
      progressPercent: Math.round((sets / mrv) * 100),
    };
  }

  if (sets <= mrv) {
    return {
      tier: 'high',
      label: 'High Volume Overload',
      description: `${sets} sets. Progressive overload phase approaching maximum recoverable volume.`,
      color: '#F59E0B', // amber
      progressPercent: Math.round((sets / mrv) * 100),
    };
  }

  return {
    tier: 'overreached',
    label: 'Overreaching / Excess Fatigue',
    description: `${sets} sets exceeds MRV (${mrv} sets). Diminishing returns; deload advised.`,
    color: '#EF4444', // red
    progressPercent: 100,
  };
}

// ── 6. Legacy Props Adapter ───────────────────────────────────

export function normalizeMuscleKey(raw: string): MuscleGroup | null {
  const s = raw.toLowerCase().trim();
  if (s.includes('chest') || s.includes('pectoral')) return 'chest';
  if (s.includes('delt') || s.includes('shoulder') || s.includes('rotator')) return 'shoulders';
  if (s.includes('bicep') || s.includes('brachialis')) return 'biceps';
  if (s.includes('tricep')) return 'triceps';
  if (s.includes('forearm') || s.includes('wrist') || s.includes('grip')) return 'forearms';
  if (s.includes('abs') || s.includes('core') || s.includes('oblique') || s.includes('abdominal')) return 'core';
  if (s.includes('quad') || s.includes('thigh') || s.includes('adductor')) return 'quads';
  if (s.includes('hamstring') || s.includes('biceps femoris')) return 'hamstrings';
  if (s.includes('glute')) return 'glutes';
  if (s.includes('calf') || s.includes('calves') || s.includes('soleus') || s.includes('gastrocnemius') || s.includes('shin')) return 'calves';
  if (s.includes('lat')) return 'lats';
  if (s.includes('trap')) return 'traps';
  if (s.includes('back') || s.includes('erector') || s.includes('spine') || s.includes('rhomboid')) return 'back';
  if (s.includes('hip flexor')) return 'hip_flexors';
  return null;
}

export function computeMetricsFromLegacyProps(
  muscles: string[] | MuscleGroup[] = [],
  secondaryMuscles: string[] | MuscleGroup[] = [],
  muscleVolumes: Record<string, number> = {},
  muscleFatigue: Record<string, number> = {}
): Record<string, MuscleTrainingMetric> {
  const metrics: Record<string, MuscleTrainingMetric> = {};

  for (const [id, info] of Object.entries(ANATOMICAL_MUSCLES)) {
    metrics[id] = {
      muscleId: id,
      info,
      primarySets: 0,
      synergistSets: 0,
      effectiveSets: 0,
      volumeLoadKg: 0,
      lastTrainedDate: null,
      hoursSinceLastTrained: null,
      recoveryPercentage: 100,
      recoveryState: 'fresh',
      targetRole: null,
      contributingExercises: [],
    };
  }

  // Populate primary muscles
  for (const m of muscles) {
    const norm = normalizeMuscleKey(m);
    if (!norm) continue;
    const granularIds = GROUP_TO_ANATOMICAL_MAP[norm] || [];
    const sets = muscleVolumes[m] ?? muscleVolumes[norm] ?? 10;
    const fatigue = muscleFatigue[m] ?? muscleFatigue[norm];

    for (const gid of granularIds) {
      if (!metrics[gid]) continue;
      metrics[gid].primarySets = Math.max(metrics[gid].primarySets, sets);
      metrics[gid].effectiveSets = metrics[gid].primarySets;
      metrics[gid].targetRole = 'primary';
      if (fatigue !== undefined) {
        metrics[gid].recoveryPercentage = Math.max(0, 100 - fatigue);
        metrics[gid].recoveryState = getRecoveryState(metrics[gid].recoveryPercentage);
      }
    }
  }

  // Populate secondary muscles
  for (const m of secondaryMuscles) {
    const norm = normalizeMuscleKey(m);
    if (!norm) continue;
    const granularIds = GROUP_TO_ANATOMICAL_MAP[norm] || [];
    const sets = muscleVolumes[m] ?? muscleVolumes[norm] ?? 5;

    for (const gid of granularIds) {
      if (!metrics[gid]) continue;
      if (metrics[gid].targetRole !== 'primary') {
        metrics[gid].synergistSets = Math.max(metrics[gid].synergistSets, sets);
        metrics[gid].effectiveSets = Math.round(metrics[gid].synergistSets * 0.5 * 10) / 10;
        metrics[gid].targetRole = 'synergist';
      }
    }
  }

  return metrics;
}

