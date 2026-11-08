// ─────────────────────────────────────────────────────────────
// MyFitAI — Quick Workout Splits & Spontaneous Training Engine
// Allows athletes to immediately start workouts without a rigid
// weekly schedule (e.g. Legs today, Back & Biceps tomorrow).
// ─────────────────────────────────────────────────────────────

import type { MuscleGroup, ExerciseType } from '../types/exercise';
import type { WorkoutTemplate, WorkoutExercise } from '../types/workout';
import { EXERCISE_LIBRARY } from './exerciseLibrary';

export interface QuickExercisePreset {
  exerciseId: string;
  exerciseName: string;
  exerciseType: ExerciseType;
  primaryMuscles: MuscleGroup[];
  defaultSets: number;
  defaultReps: number;
  defaultWeightLbs: number;
  restSeconds: number;
}

export interface QuickSplitPreset {
  id: string;
  name: string;
  shortLabel: string;
  tagline: string;
  targetMuscles: MuscleGroup[];
  recommendedExercises: QuickExercisePreset[];
}

export const QUICK_SPLIT_PRESETS: QuickSplitPreset[] = [
  {
    id: 'legs',
    name: 'Legs & Lower Body',
    shortLabel: 'Legs',
    tagline: 'Quads, hamstrings, glutes & calf development',
    targetMuscles: ['quads', 'hamstrings', 'glutes', 'calves'],
    recommendedExercises: [
      {
        exerciseId: 'barbell_squat',
        exerciseName: 'Barbell Back Squat',
        exerciseType: 'weight_reps',
        primaryMuscles: ['quads', 'glutes'],
        defaultSets: 3,
        defaultReps: 8,
        defaultWeightLbs: 185,
        restSeconds: 120,
      },
      {
        exerciseId: 'romanian_deadlift',
        exerciseName: 'Romanian Deadlift (RDL)',
        exerciseType: 'weight_reps',
        primaryMuscles: ['hamstrings', 'glutes'],
        defaultSets: 3,
        defaultReps: 10,
        defaultWeightLbs: 145,
        restSeconds: 90,
      },
      {
        exerciseId: 'leg_press',
        exerciseName: 'Leg Press',
        exerciseType: 'weight_reps',
        primaryMuscles: ['quads'],
        defaultSets: 3,
        defaultReps: 12,
        defaultWeightLbs: 270,
        restSeconds: 90,
      },
      {
        exerciseId: 'standing_calf_raise',
        exerciseName: 'Standing Calf Raise',
        exerciseType: 'weight_reps',
        primaryMuscles: ['calves'],
        defaultSets: 3,
        defaultReps: 15,
        defaultWeightLbs: 100,
        restSeconds: 45,
      },
    ],
  },
  {
    id: 'back_biceps',
    name: 'Back & Biceps (Pull)',
    shortLabel: 'Back & Biceps',
    tagline: 'V-taper vertical pulling, back thickness & bicep peaks',
    targetMuscles: ['back', 'lats', 'biceps'],
    recommendedExercises: [
      {
        exerciseId: 'lat_pulldown',
        exerciseName: 'Lat Pulldown / Pull-Ups',
        exerciseType: 'weight_reps',
        primaryMuscles: ['back', 'lats', 'biceps'],
        defaultSets: 3,
        defaultReps: 10,
        defaultWeightLbs: 120,
        restSeconds: 90,
      },
      {
        exerciseId: 'barbell_row',
        exerciseName: 'Barbell Bent-Over Row',
        exerciseType: 'weight_reps',
        primaryMuscles: ['back', 'lats'],
        defaultSets: 3,
        defaultReps: 8,
        defaultWeightLbs: 135,
        restSeconds: 90,
      },
      {
        exerciseId: 'seated_cable_row',
        exerciseName: 'Seated Cable Row',
        exerciseType: 'weight_reps',
        primaryMuscles: ['back', 'traps'],
        defaultSets: 3,
        defaultReps: 10,
        defaultWeightLbs: 120,
        restSeconds: 60,
      },
      {
        exerciseId: 'incline_dumbbell_curl',
        exerciseName: 'Incline Dumbbell Bicep Curl',
        exerciseType: 'weight_reps',
        primaryMuscles: ['biceps'],
        defaultSets: 3,
        defaultReps: 12,
        defaultWeightLbs: 30,
        restSeconds: 60,
      },
      {
        exerciseId: 'hammer_curl',
        exerciseName: 'Dumbbell Hammer Curl',
        exerciseType: 'weight_reps',
        primaryMuscles: ['biceps', 'forearms'],
        defaultSets: 3,
        defaultReps: 12,
        defaultWeightLbs: 30,
        restSeconds: 60,
      },
    ],
  },
  {
    id: 'chest_triceps',
    name: 'Chest & Triceps (Push)',
    shortLabel: 'Chest & Triceps',
    tagline: 'Pectoral hypertrophy, deltoid press & triceps lockout',
    targetMuscles: ['chest', 'triceps', 'shoulders'],
    recommendedExercises: [
      {
        exerciseId: 'barbell_bench_press',
        exerciseName: 'Barbell Bench Press',
        exerciseType: 'weight_reps',
        primaryMuscles: ['chest', 'triceps', 'shoulders'],
        defaultSets: 3,
        defaultReps: 8,
        defaultWeightLbs: 135,
        restSeconds: 120,
      },
      {
        exerciseId: 'incline_dumbbell_press',
        exerciseName: 'Incline Dumbbell Press',
        exerciseType: 'weight_reps',
        primaryMuscles: ['chest', 'shoulders'],
        defaultSets: 3,
        defaultReps: 10,
        defaultWeightLbs: 50,
        restSeconds: 90,
      },
      {
        exerciseId: 'lateral_raise',
        exerciseName: 'Dumbbell Lateral Raise',
        exerciseType: 'weight_reps',
        primaryMuscles: ['shoulders'],
        defaultSets: 3,
        defaultReps: 15,
        defaultWeightLbs: 20,
        restSeconds: 60,
      },
      {
        exerciseId: 'tricep_rope_pushdown',
        exerciseName: 'Triceps Rope Pushdown',
        exerciseType: 'weight_reps',
        primaryMuscles: ['triceps'],
        defaultSets: 3,
        defaultReps: 12,
        defaultWeightLbs: 45,
        restSeconds: 60,
      },
    ],
  },
  {
    id: 'shoulders_arms',
    name: 'Shoulders & Arms',
    shortLabel: 'Shoulders & Arms',
    tagline: '3D deltoid caps, peak biceps & triceps volume',
    targetMuscles: ['shoulders', 'biceps', 'triceps', 'forearms'],
    recommendedExercises: [
      {
        exerciseId: 'overhead_press',
        exerciseName: 'Standing Overhead Press',
        exerciseType: 'weight_reps',
        primaryMuscles: ['shoulders', 'triceps'],
        defaultSets: 3,
        defaultReps: 8,
        defaultWeightLbs: 95,
        restSeconds: 90,
      },
      {
        exerciseId: 'lateral_raise',
        exerciseName: 'Dumbbell Lateral Raise',
        exerciseType: 'weight_reps',
        primaryMuscles: ['shoulders'],
        defaultSets: 3,
        defaultReps: 15,
        defaultWeightLbs: 20,
        restSeconds: 60,
      },
      {
        exerciseId: 'barbell_curl',
        exerciseName: 'Barbell Bicep Curl',
        exerciseType: 'weight_reps',
        primaryMuscles: ['biceps'],
        defaultSets: 3,
        defaultReps: 10,
        defaultWeightLbs: 65,
        restSeconds: 60,
      },
      {
        exerciseId: 'overhead_tricep_extension',
        exerciseName: 'Overhead Triceps Extension',
        exerciseType: 'weight_reps',
        primaryMuscles: ['triceps'],
        defaultSets: 3,
        defaultReps: 12,
        defaultWeightLbs: 45,
        restSeconds: 60,
      },
    ],
  },
  {
    id: 'chest_back',
    name: 'Chest & Back (Antagonist)',
    shortLabel: 'Chest & Back',
    tagline: 'Push-pull antagonist pairing for upper body density',
    targetMuscles: ['chest', 'back', 'lats'],
    recommendedExercises: [
      {
        exerciseId: 'barbell_bench_press',
        exerciseName: 'Barbell Bench Press',
        exerciseType: 'weight_reps',
        primaryMuscles: ['chest', 'triceps'],
        defaultSets: 3,
        defaultReps: 8,
        defaultWeightLbs: 135,
        restSeconds: 120,
      },
      {
        exerciseId: 'barbell_row',
        exerciseName: 'Barbell Bent-Over Row',
        exerciseType: 'weight_reps',
        primaryMuscles: ['back', 'lats'],
        defaultSets: 3,
        defaultReps: 8,
        defaultWeightLbs: 135,
        restSeconds: 90,
      },
      {
        exerciseId: 'incline_dumbbell_press',
        exerciseName: 'Incline Dumbbell Press',
        exerciseType: 'weight_reps',
        primaryMuscles: ['chest'],
        defaultSets: 3,
        defaultReps: 10,
        defaultWeightLbs: 50,
        restSeconds: 90,
      },
      {
        exerciseId: 'lat_pulldown',
        exerciseName: 'Lat Pulldown / Pull-Ups',
        exerciseType: 'weight_reps',
        primaryMuscles: ['back', 'lats'],
        defaultSets: 3,
        defaultReps: 10,
        defaultWeightLbs: 120,
        restSeconds: 90,
      },
    ],
  },
  {
    id: 'core_abs',
    name: 'Core & Midsection',
    shortLabel: 'Core & Abs',
    tagline: 'Abdominal flexion, anti-rotation & bracing stability',
    targetMuscles: ['core'],
    recommendedExercises: [
      {
        exerciseId: 'hanging_leg_raise',
        exerciseName: 'Hanging Leg Raise',
        exerciseType: 'weight_reps',
        primaryMuscles: ['core'],
        defaultSets: 3,
        defaultReps: 12,
        defaultWeightLbs: 0,
        restSeconds: 60,
      },
      {
        exerciseId: 'cable_woodchopper',
        exerciseName: 'Cable Woodchopper',
        exerciseType: 'weight_reps',
        primaryMuscles: ['core'],
        defaultSets: 3,
        defaultReps: 12,
        defaultWeightLbs: 35,
        restSeconds: 45,
      },
      {
        exerciseId: 'plank',
        exerciseName: 'Plank Hold',
        exerciseType: 'timed',
        primaryMuscles: ['core'],
        defaultSets: 3,
        defaultReps: 60,
        defaultWeightLbs: 0,
        restSeconds: 45,
      },
    ],
  },
  {
    id: 'full_body',
    name: 'Full Body Compound',
    shortLabel: 'Full Body',
    tagline: 'Squat, press & pull systemic hypertrophy stimulus',
    targetMuscles: ['quads', 'chest', 'back', 'hamstrings', 'shoulders'],
    recommendedExercises: [
      {
        exerciseId: 'barbell_squat',
        exerciseName: 'Barbell Back Squat',
        exerciseType: 'weight_reps',
        primaryMuscles: ['quads', 'glutes'],
        defaultSets: 3,
        defaultReps: 8,
        defaultWeightLbs: 185,
        restSeconds: 120,
      },
      {
        exerciseId: 'barbell_bench_press',
        exerciseName: 'Barbell Bench Press',
        exerciseType: 'weight_reps',
        primaryMuscles: ['chest', 'triceps'],
        defaultSets: 3,
        defaultReps: 8,
        defaultWeightLbs: 135,
        restSeconds: 90,
      },
      {
        exerciseId: 'barbell_row',
        exerciseName: 'Barbell Bent-Over Row',
        exerciseType: 'weight_reps',
        primaryMuscles: ['back', 'lats'],
        defaultSets: 3,
        defaultReps: 8,
        defaultWeightLbs: 135,
        restSeconds: 90,
      },
      {
        exerciseId: 'overhead_press',
        exerciseName: 'Standing Overhead Press',
        exerciseType: 'weight_reps',
        primaryMuscles: ['shoulders', 'triceps'],
        defaultSets: 2,
        defaultReps: 8,
        defaultWeightLbs: 95,
        restSeconds: 90,
      },
    ],
  },
  {
    id: 'freestyle',
    name: 'Freestyle Blank Slate',
    shortLabel: 'Freestyle',
    tagline: 'Zero pre-selected exercises · Add movements as you train',
    targetMuscles: [],
    recommendedExercises: [],
  },
];

/**
 * Muscle group chips for custom multi-select
 */
export const AVAILABLE_MUSCLE_CHIPS: { id: MuscleGroup; label: string }[] = [
  { id: 'quads', label: 'Quads' },
  { id: 'hamstrings', label: 'Hamstrings' },
  { id: 'glutes', label: 'Glutes' },
  { id: 'calves', label: 'Calves' },
  { id: 'back', label: 'Back' },
  { id: 'lats', label: 'Lats' },
  { id: 'biceps', label: 'Biceps' },
  { id: 'chest', label: 'Chest' },
  { id: 'triceps', label: 'Triceps' },
  { id: 'shoulders', label: 'Shoulders' },
  { id: 'core', label: 'Core / Abs' },
  { id: 'forearms', label: 'Forearms' },
  { id: 'traps', label: 'Traps' },
];

/**
 * Find media & details for a given exercise name in EXERCISE_LIBRARY
 */
export function lookupExerciseMedia(name: string): { gifUrl?: string; imageUrl?: string } {
  const lower = name.toLowerCase().trim();
  const match = EXERCISE_LIBRARY.find(
    e => e.name.toLowerCase() === lower || (e.aliases && e.aliases.some(a => a.toLowerCase() === lower))
  );
  if (match) {
    return {
      gifUrl: match.gifUrl,
      imageUrl: match.imageUrl,
    };
  }
  return {};
}

/**
 * Constructs a full WorkoutTemplate from a QuickSplitPreset
 */
export function buildQuickTemplate(
  preset: QuickSplitPreset,
  options?: {
    blank?: boolean;
    customName?: string;
  }
): WorkoutTemplate {
  const isBlank = options?.blank === true || preset.recommendedExercises.length === 0;

  const exercises: WorkoutExercise[] = isBlank
    ? []
    : preset.recommendedExercises.map(rec => {
        const media = lookupExerciseMedia(rec.exerciseName);
        return {
          exerciseId: rec.exerciseId,
          exerciseName: rec.exerciseName,
          exerciseType: rec.exerciseType,
          primaryMuscles: rec.primaryMuscles,
          sets: Array.from({ length: rec.defaultSets }, () => ({
            targetReps: rec.defaultReps,
            targetWeight: rec.defaultWeightLbs,
            setType: 'normal',
          })),
          restSeconds: rec.restSeconds,
          notes: '',
          gifUrl: media.gifUrl,
          imageUrl: media.imageUrl,
        };
      });

  return {
    id: `quick_${preset.id}_${Date.now()}`,
    name: options?.customName || preset.name,
    description: preset.tagline,
    type: 'strength',
    targetMuscles: preset.targetMuscles,
    exercises,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Dynamically builds a WorkoutTemplate from arbitrary selected muscles
 */
export function buildCustomMuscleTemplate(
  muscles: MuscleGroup[],
  customName?: string,
  options?: { blank?: boolean }
): WorkoutTemplate {
  // Determine title from selected muscles
  let title = customName;
  if (!title) {
    if (muscles.length === 0) {
      title = 'Freestyle Workout';
    } else {
      const muscleLabels = muscles.map(m => {
        const chip = AVAILABLE_MUSCLE_CHIPS.find(c => c.id === m);
        return chip ? chip.label : m;
      });
      title = `${muscleLabels.slice(0, 2).join(' & ')}${muscleLabels.length > 2 ? ' +' : ''} Workout`;
    }
  }

  // Check if it matches an existing preset exactly
  const matchedPreset = QUICK_SPLIT_PRESETS.find(p => {
    if (p.targetMuscles.length !== muscles.length) return false;
    return p.targetMuscles.every(m => muscles.includes(m));
  });

  if (matchedPreset) {
    return buildQuickTemplate(matchedPreset, { blank: options?.blank, customName: title });
  }

  // Otherwise pick top exercises from EXERCISE_LIBRARY matching selected muscles
  const candidateExercises: WorkoutExercise[] = [];
  if (!options?.blank && muscles.length > 0) {
    muscles.forEach(m => {
      const matches = EXERCISE_LIBRARY.filter(
        e => e.primaryMuscles.includes(m) && (e.equipment === 'barbell' || e.equipment === 'dumbbell' || e.equipment === 'cable' || e.equipment === 'machine')
      );
      if (matches.length > 0) {
        // Pick the top 2
        matches.slice(0, 2).forEach(ex => {
          if (!candidateExercises.some(c => c.exerciseName === ex.name)) {
            candidateExercises.push({
              exerciseId: ex.id || `custom_${ex.name.toLowerCase().replace(/\s+/g, '_')}`,
              exerciseName: ex.name,
              exerciseType: ex.exerciseType || 'weight_reps',
              primaryMuscles: ex.primaryMuscles,
              sets: [
                { targetReps: 10, targetWeight: 100, setType: 'normal' },
                { targetReps: 10, targetWeight: 100, setType: 'normal' },
                { targetReps: 10, targetWeight: 100, setType: 'normal' },
              ],
              restSeconds: 90,
              notes: '',
              gifUrl: ex.gifUrl,
              imageUrl: ex.imageUrl,
            });
          }
        });
      }
    });
  }

  return {
    id: `custom_split_${Date.now()}`,
    name: title,
    description: `Targeted session focusing on ${muscles.join(', ')}`,
    type: 'strength',
    targetMuscles: muscles,
    exercises: candidateExercises.slice(0, 6),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

