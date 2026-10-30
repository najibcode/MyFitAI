// ─────────────────────────────────────────────────────────────
// MyFitAI — Workout Type Definitions (Enhanced)
// Complete workout domain: sessions, sets, PRs, progression,
// effort tracking, cardio, timed, supersets.
// ─────────────────────────────────────────────────────────────

import type { MuscleGroup, EquipmentType, ExerciseType } from './exercise';

/** The type of an individual set */
export type SetType =
  | 'normal'
  | 'warmup'
  | 'drop'
  | 'failure'
  | 'amrap'
  | 'rest_pause'
  | 'myo_reps'
  | 'back_off'
  | 'top_set'
  | 'timed'
  | 'bodyweight'
  | 'cardio';

/** Grouping type for supersets, giant sets, circuits, and dropsets */
export type SetGroupType = 'superset' | 'giant_set' | 'circuit' | 'dropset';

/** A structured group of exercises (e.g. Superset A1-A2, Circuit 1-4) */
export interface SetGroup {
  id: string;
  name?: string; // e.g. "Superset A", "Giant Set 1"
  type: SetGroupType;
  exerciseIds: string[]; // references exerciseId or indices in the workout
  restAfterGroupSeconds: number; // rest timer triggered after full cycle
  rounds?: number;
}

/** Set completion state */
export type SetStatus = 'pending' | 'completed' | 'failed' | 'skipped';

/** Overall workout category */
export type WorkoutType = 'strength' | 'cardio' | 'hiit' | 'mobility' | 'flexibility' | 'custom';

/** Effort tracking mode */
export type EffortMode = 'off' | 'rpe' | 'rir';

// ─── Progression ────────────────────────────────────────────

export type ProgressionType =
  | 'linear'           // Add weight each session
  | 'double'           // Increase reps within range, then weight
  | 'greyskull'        // AMRAP last set, fail → deload
  | 'time'             // Increase duration
  | 'bodyweight';      // Increase reps/sets before adding load

export interface ProgressionRule {
  type: ProgressionType;
  /** Weight increment in user's unit (kg/lbs) */
  weightIncrement: number;
  /** Rep range for double progression */
  minReps: number;
  maxReps: number;
  /** How many sets must hit maxReps to increase weight */
  setsToProgress: number;
  /** How many consecutive failures to trigger deload */
  failuresToDeload: number;
  /** Deload percentage (e.g. 0.1 = 10%) */
  deloadPercent: number;
  /** Time increment in seconds for timed progression */
  timeIncrement: number;
  /** For bodyweight: max reps before adding a set */
  maxRepsBeforeAddSet: number;
  /** For bodyweight: max sets before adding weight */
  maxSetsBeforeWeight: number;
}

export const DEFAULT_PROGRESSION: ProgressionRule = {
  type: 'double',
  weightIncrement: 2.5,
  minReps: 8,
  maxReps: 12,
  setsToProgress: 3,
  failuresToDeload: 3,
  deloadPercent: 0.1,
  timeIncrement: 5,
  maxRepsBeforeAddSet: 15,
  maxSetsBeforeWeight: 5,
};

// ─── Templates & Planned Sets ───────────────────────────────

/** A planned set within a workout template */
export interface PlannedSet {
  targetReps?: number;
  targetWeight?: number;
  targetDuration?: number; // seconds
  targetDistance?: number; // meters
  rpe?: number;
  rir?: number;
  setType: SetType;
  isDrop?: boolean;
  dropLevel?: number;
  isBodyweight?: boolean;
  addedWeight?: number;
  repsPerSide?: { left: number; right: number };
}

/** An exercise slot within a workout template */
export interface WorkoutExercise {
  exerciseId: string;
  exerciseName: string;
  exerciseType: ExerciseType;
  thumbnailEmoji?: string;
  equipment?: EquipmentType;
  primaryMuscles?: MuscleGroup[];
  isUnilateral?: boolean;
  isBodyweight?: boolean;
  sets: PlannedSet[];
  restSeconds: number;
  notes: string;
  warmupNotes?: string;
  supersetGroup?: string; // e.g. 'A', 'B', 'C' — exercises with same group are a superset
  progressionRule?: ProgressionRule;
  gifUrl?: string;
  imageUrl?: string;
}

/** A saved workout template (blueprint, not a completed session) */
export interface WorkoutTemplate {
  id: string;
  name: string;
  description: string;
  type: WorkoutType;
  targetMuscles: MuscleGroup[];
  exercises: WorkoutExercise[];
  setGroups?: SetGroup[];
  warmupNotes?: string;
  cooldownNotes?: string;
  defaultRestSeconds?: number;
  createdAt: string;
  updatedAt: string;
  estimatedDuration?: number; // minutes
  estimatedCalories?: number;
  userId?: string;
}

// ─── Routines & Weekly Schedule ─────────────────────────────

export interface RoutineDay {
  dayOfWeek: number; // 0=Sun ... 6=Sat
  templateId?: string;
  templateName?: string;
  isRest: boolean;
  label: string; // e.g. "Push", "Pull", "Rest"
}

export interface Routine {
  id: string;
  name: string;
  description: string;
  days: RoutineDay[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  userId?: string;
}

/** An override for a specific date (rescheduling) */
export interface ScheduleOverride {
  id: string;
  date: string; // ISO date YYYY-MM-DD
  originalDayOfWeek: number;
  newTemplateId?: string;
  newTemplateLabel?: string;
  isSkipped: boolean;
  createdAt: string;
  userId?: string;
}

// ─── Active Session & Logged Sets ───────────────────────────

/** A single logged set during an active session */
export interface LoggedSet {
  reps: number;
  weight: number;
  rpe: number;
  rir?: number;
  effortMode: EffortMode;
  setType: SetType;
  status: SetStatus;
  completed: boolean; // legacy compat
  skipped: boolean;   // legacy compat
  duration?: number;  // seconds
  distance?: number;  // meters
  speed?: number;     // km/h or mph
  pace?: number;      // min/km
  incline?: number;   // %
  calories?: number;
  repsPerSide?: { left: number; right: number };
  dropLevel?: number;
  isDrop?: boolean;
  isBodyweight?: boolean;
  addedWeight?: number;
  timestamp: string;
  notes?: string;
  isPR?: boolean;
}

/** An exercise as logged during a session */
export interface SessionExercise {
  exerciseId: string;
  exerciseName: string;
  exerciseType: ExerciseType;
  thumbnailEmoji?: string;
  primaryMuscles?: MuscleGroup[];
  isUnilateral?: boolean;
  isBodyweight?: boolean;
  supersetGroup?: string;
  restSeconds?: number;
  progressionRule?: ProgressionRule;
  sets: LoggedSet[];
  notes?: string;
  warmupNotes?: string;
  gifUrl?: string;
  imageUrl?: string;
}

/** A personal record */
export interface PRRecord {
  exerciseId: string;
  exerciseName: string;
  type: 'weight' | 'reps' | 'volume' | '1rm' | 'duration' | 'distance';
  value: number;
  reps?: number;
  previousValue?: number;
  date: string;
  sessionId: string;
}

/** A completed workout session */
export interface WorkoutSession {
  id: string;
  templateId?: string;
  templateName: string;
  type: WorkoutType;
  startedAt: string;
  startTime?: string; // alias for compatibility
  endedAt?: string;
  duration: number; // seconds
  exercises: SessionExercise[];
  setGroups?: SetGroup[];
  warmupNotes?: string;
  cooldownNotes?: string;
  totalVolume: number;
  totalSets: number;
  totalReps: number;
  prsHit: PRRecord[];
  notes: string;
  rating?: number; // 1-5
  musclesWorked: MuscleGroup[];
  effortMode?: EffortMode;
}

/** Previous session data for ghost values */
export interface PreviousSetData {
  exerciseId: string;
  sets: Array<{
    reps: number;
    weight: number;
    rpe: number;
    duration?: number;
    distance?: number;
  }>;
}

// ─── Body Weight Tracking ───────────────────────────────────

export interface BodyWeightEntry {
  date: string; // YYYY-MM-DD
  weight: number;
  unit: 'kg' | 'lbs';
}

// ─── Exercise Progress / History ────────────────────────────

export interface ExerciseProgressEntry {
  date: string;
  sessionId: string;
  bestWeight: number;
  bestReps: number;
  totalVolume: number;
  estimated1RM: number;
  bestDuration?: number;
  bestDistance?: number;
  sets: number;
}

// ─── Utility Functions ──────────────────────────────────────

/** Calculate estimated 1RM using Epley formula */
export function calculate1RM(weight: number, reps: number): number {
  if (reps <= 0 || weight <= 0) return 0;
  if (reps === 1) return weight;
  // Cap at 15 reps for reliability
  const effectiveReps = Math.min(reps, 15);
  return Math.round(weight * (1 + effectiveReps / 30));
}

/** Calculate total volume for a set */
export function calculateSetVolume(weight: number, reps: number): number {
  return weight * reps;
}

/** Calculate total session volume */
export function calculateSessionVolume(exercises: SessionExercise[]): number {
  return exercises.reduce((total, ex) => {
    return total + ex.sets
      .filter(s => s.completed && !s.skipped)
      .reduce((exTotal, set) => exTotal + (set.weight * set.reps), 0);
  }, 0);
}

/** Format duration in seconds to mm:ss or h:mm:ss */
export function formatDuration(seconds: number): string {
  if (seconds < 0) seconds = 0;
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) {
    return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

/** Format a weight value with unit */
export function formatWeight(value: number, unit: 'kg' | 'lbs'): string {
  return `${value}${unit === 'kg' ? 'kg' : 'lbs'}`;
}

/** Convert between kg and lbs */
export function convertWeight(value: number, from: 'kg' | 'lbs', to: 'kg' | 'lbs'): number {
  if (from === to) return value;
  if (from === 'kg') return Math.round(value * 2.20462 * 10) / 10;
  return Math.round(value / 2.20462 * 10) / 10;
}

/** Format large numbers with commas */
export function formatVolume(volume: number): string {
  return volume.toLocaleString('en-US', { maximumFractionDigits: 0 });
}

/** Format distance in meters to human readable */
export function formatDistance(meters: number): string {
  if (meters >= 1000) {
    return `${(meters / 1000).toFixed(2)} km`;
  }
  return `${Math.round(meters)} m`;
}

/** Format pace (min/km) to mm:ss */
export function formatPace(minPerKm: number): string {
  const mins = Math.floor(minPerKm);
  const secs = Math.round((minPerKm - mins) * 60);
  return `${mins}:${String(secs).padStart(2, '0')} /km`;
}

/** Create a default LoggedSet */
export function createDefaultLoggedSet(type?: SetType): LoggedSet {
  return {
    reps: 0,
    weight: 0,
    rpe: 0,
    effortMode: 'off',
    setType: type || 'normal',
    status: 'pending',
    completed: false,
    skipped: false,
    timestamp: '',
  };
}
