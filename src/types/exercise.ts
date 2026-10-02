// ─────────────────────────────────────────────────────────────
// MyFitAI — Exercise Type Definitions (Enhanced)
// Supports: weighted, bodyweight, timed, cardio, unilateral,
// weighted-bodyweight, and distance exercises.
// ─────────────────────────────────────────────────────────────

export type MuscleGroup =
  | 'chest'
  | 'back'
  | 'shoulders'
  | 'biceps'
  | 'triceps'
  | 'forearms'
  | 'core'
  | 'quads'
  | 'hamstrings'
  | 'glutes'
  | 'calves'
  | 'traps'
  | 'lats'
  | 'hip_flexors'
  | 'adductors'
  | 'abductors'
  | 'full_body';

export type BodyPart =
  | 'chest'
  | 'back'
  | 'shoulders'
  | 'arms'
  | 'legs'
  | 'core'
  | 'full_body'
  | 'cardio';

export type EquipmentType =
  | 'barbell'
  | 'dumbbell'
  | 'cable'
  | 'machine'
  | 'bodyweight'
  | 'kettlebell'
  | 'band'
  | 'smith_machine'
  | 'ez_bar'
  | 'trap_bar'
  | 'suspension'
  | 'medicine_ball'
  | 'cardio_machine'
  | 'other';

export type ExerciseCategory =
  | 'compound'
  | 'isolation'
  | 'cardio'
  | 'mobility'
  | 'plyometric';

export type ExerciseDifficulty = 'beginner' | 'intermediate' | 'advanced';

/** How each set is measured */
export type ExerciseType =
  | 'weight_reps'        // Barbell bench: weight × reps
  | 'bodyweight_reps'    // Push-ups: reps only
  | 'weighted_bodyweight'// Weighted pull-up: bodyweight + added load × reps
  | 'timed'              // Plank: duration (optionally weighted)
  | 'cardio'             // Running: duration/distance/pace
  | 'distance'           // Farmer carry: weight × distance
  | 'reps_per_side';     // Lunges: reps per side

export type MovementPattern =
  | 'push_horizontal'
  | 'push_vertical'
  | 'pull_horizontal'
  | 'pull_vertical'
  | 'squat'
  | 'hinge'
  | 'lunge'
  | 'carry'
  | 'rotation'
  | 'isolation'
  | 'cardio';

export interface Exercise {
  id: string;
  name: string;
  aliases?: string[];
  primaryMuscles: MuscleGroup[];
  secondaryMuscles: MuscleGroup[];
  bodyPart: BodyPart;
  equipment: EquipmentType;
  category: ExerciseCategory;
  exerciseType: ExerciseType;
  movementPattern: MovementPattern;
  difficulty: ExerciseDifficulty;
  instructions: string[];
  tips: string[];
  safetyNotes?: string[];
  thumbnailEmoji: string;
  isCustom: boolean;
  isUnilateral: boolean;
  gifUrl?: string;
  videoUrl?: string;
  imageUrl?: string;
  createdAt: string;
  updatedAt: string;
  userId?: string; // for custom exercises
}

/** Display labels for muscle groups */
export const MUSCLE_GROUP_LABELS: Record<MuscleGroup, string> = {
  chest: 'Chest',
  back: 'Back',
  shoulders: 'Shoulders',
  biceps: 'Biceps',
  triceps: 'Triceps',
  forearms: 'Forearms',
  core: 'Core',
  quads: 'Quads',
  hamstrings: 'Hamstrings',
  glutes: 'Glutes',
  calves: 'Calves',
  traps: 'Traps',
  lats: 'Lats',
  hip_flexors: 'Hip Flexors',
  adductors: 'Adductors',
  abductors: 'Abductors',
  full_body: 'Full Body',
};

export const BODY_PART_LABELS: Record<BodyPart, string> = {
  chest: 'Chest',
  back: 'Back',
  shoulders: 'Shoulders',
  arms: 'Arms',
  legs: 'Legs',
  core: 'Core',
  full_body: 'Full Body',
  cardio: 'Cardio',
};

export const EXERCISE_TYPE_LABELS: Record<ExerciseType, string> = {
  weight_reps: 'Weight & Reps',
  bodyweight_reps: 'Bodyweight',
  weighted_bodyweight: 'Weighted Bodyweight',
  timed: 'Timed',
  cardio: 'Cardio',
  distance: 'Distance',
  reps_per_side: 'Per Side',
};

export const DIFFICULTY_LABELS: Record<ExerciseDifficulty, string> = {
  beginner: 'Beginner',
  intermediate: 'Intermediate',
  advanced: 'Advanced',
};

/** Display labels for equipment */
export const EQUIPMENT_LABELS: Record<EquipmentType, string> = {
  barbell: 'Barbell',
  dumbbell: 'Dumbbell',
  cable: 'Cable',
  machine: 'Machine',
  bodyweight: 'Bodyweight',
  kettlebell: 'Kettlebell',
  band: 'Resistance Band',
  smith_machine: 'Smith Machine',
  ez_bar: 'EZ Bar',
  trap_bar: 'Trap Bar',
  suspension: 'Suspension',
  medicine_ball: 'Medicine Ball',
  cardio_machine: 'Cardio Machine',
  other: 'Other',
};

/** Material icon for each muscle group */
export const MUSCLE_GROUP_ICONS: Record<MuscleGroup, string> = {
  chest: '🫁',
  back: '🔙',
  shoulders: '💪',
  biceps: '💪',
  triceps: '💪',
  forearms: '🤜',
  core: '🎯',
  quads: '🦵',
  hamstrings: '🦵',
  glutes: '🍑',
  calves: '🦶',
  traps: '🔺',
  lats: '🦅',
  hip_flexors: '🦴',
  adductors: '🦵',
  abductors: '🦵',
  full_body: '🏋️',
};

export const ALL_MUSCLE_GROUPS: MuscleGroup[] = [
  'chest', 'back', 'shoulders', 'biceps', 'triceps', 'forearms',
  'core', 'quads', 'hamstrings', 'glutes', 'calves', 'traps',
  'lats', 'hip_flexors', 'adductors', 'abductors', 'full_body',
];

export const ALL_BODY_PARTS: BodyPart[] = [
  'chest', 'back', 'shoulders', 'arms', 'legs', 'core', 'full_body', 'cardio',
];

export const ALL_EQUIPMENT: EquipmentType[] = [
  'barbell', 'dumbbell', 'cable', 'machine', 'bodyweight', 'kettlebell',
  'band', 'smith_machine', 'ez_bar', 'trap_bar', 'suspension', 'medicine_ball',
  'cardio_machine', 'other',
];

export const ALL_EXERCISE_TYPES: ExerciseType[] = [
  'weight_reps', 'bodyweight_reps', 'weighted_bodyweight',
  'timed', 'cardio', 'distance', 'reps_per_side',
];

/** Check if an exercise type uses weight input */
export function exerciseUsesWeight(type: ExerciseType): boolean {
  return type === 'weight_reps' || type === 'weighted_bodyweight' || type === 'distance';
}

/** Check if an exercise type uses reps input */
export function exerciseUsesReps(type: ExerciseType): boolean {
  return type === 'weight_reps' || type === 'bodyweight_reps'
    || type === 'weighted_bodyweight' || type === 'reps_per_side';
}

/** Check if an exercise type uses duration input */
export function exerciseUsesDuration(type: ExerciseType): boolean {
  return type === 'timed' || type === 'cardio';
}

/** Check if an exercise type uses distance input */
export function exerciseUsesDistance(type: ExerciseType): boolean {
  return type === 'cardio' || type === 'distance';
}
