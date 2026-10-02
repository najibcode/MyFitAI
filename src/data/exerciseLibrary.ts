// ─────────────────────────────────────────────────────────────
// MyFitAI — Comprehensive Exercise Library (1,320+ exercises)
// Complete dataset with authentic animated GIF demonstrations,
// high-speed Cloudflare CDN delivery, robust offline fallbacks,
// and rich muscle group & biomechanical movement pattern metadata.
// ─────────────────────────────────────────────────────────────

import type {
  Exercise,
  MuscleGroup,
  EquipmentType,
  ExerciseCategory,
  ExerciseDifficulty,
  ExerciseType,
  MovementPattern,
  BodyPart,
} from '../types/exercise';
import { EXERCISES_DATA } from './exercisesData';

export interface ExerciseLibraryEntry {
  id?: string;
  name: string;
  aliases?: string[];
  emoji: string;
  primaryMuscles: MuscleGroup[];
  secondaryMuscles: MuscleGroup[];
  bodyPart: BodyPart;
  equipment: EquipmentType;
  category: ExerciseCategory;
  exerciseType: ExerciseType;
  movementPattern: MovementPattern;
  difficulty: ExerciseDifficulty;
  isUnilateral: boolean;
  instructions: string[];
  tips: string;
  safetyNotes?: string[];
  gifUrl: string;
  imageUrl?: string;
  videoId?: string;
}

/** Animated GIF URL resolver with CDN fallback */
export function getExerciseGif(entry?: { gifUrl?: string; id?: string } | null): string {
  if (!entry) return '';
  if (entry.gifUrl) return entry.gifUrl;
  if (entry.id) {
    return `https://cdn.jsdelivr.net/gh/omercotkd/exercises-gifs@main/assets/${entry.id}.gif`;
  }
  return '';
}

/** Exercise thumbnail URL resolver (static image or animated GIF) */
export function getExerciseThumbnail(entry?: { imageUrl?: string; gifUrl?: string; videoId?: string; id?: string } | null): string {
  if (!entry) return '';
  if (entry.imageUrl) return entry.imageUrl;
  if (entry.gifUrl) return entry.gifUrl;
  if (entry.id) {
    return `https://cdn.jsdelivr.net/gh/omercotkd/exercises-gifs@main/assets/${entry.id}.gif`;
  }
  if (entry.videoId) {
    return `https://img.youtube.com/vi/${entry.videoId}/hqdefault.jpg`;
  }
  return '';
}

/** Legacy YouTube URL helper (retained for backward compatibility) */
export function getYouTubeUrl(videoId?: string): string {
  if (!videoId) return '';
  return `https://www.youtube.com/watch?v=${videoId}`;
}

/** Legacy YouTube thumbnail helper */
export function getYouTubeThumbnail(videoId?: string): string {
  if (!videoId) return '';
  return `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
}

/** Legacy YouTube embed helper */
export function getYouTubeEmbed(videoId?: string): string {
  if (!videoId) return '';
  return `https://www.youtube.com/embed/${videoId}`;
}

/**
 * Convert a library entry to a full typed Exercise object.
 */
export function libraryEntryToExercise(entry: ExerciseLibraryEntry, index: number): Exercise {
  return {
    id: entry.id || `builtin_${index}`,
    name: entry.name,
    aliases: entry.aliases,
    primaryMuscles: entry.primaryMuscles,
    secondaryMuscles: entry.secondaryMuscles,
    bodyPart: entry.bodyPart,
    equipment: entry.equipment,
    category: entry.category,
    exerciseType: entry.exerciseType,
    movementPattern: entry.movementPattern,
    difficulty: entry.difficulty,
    instructions: entry.instructions,
    tips: entry.tips ? [entry.tips] : [],
    safetyNotes: entry.safetyNotes,
    thumbnailEmoji: entry.emoji || '🏋️',
    isCustom: false,
    isUnilateral: entry.isUnilateral,
    gifUrl: entry.gifUrl,
    imageUrl: entry.imageUrl || entry.gifUrl,
    videoUrl: entry.videoId,
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
  };
}

// ─── EXERCISE LIBRARY (1,324 EXERCISES) ─────────────────────

export const EXERCISE_LIBRARY: ExerciseLibraryEntry[] = EXERCISES_DATA;

/**
 * Get all exercises as full Exercise objects.
 */
export function getAllExercises(): Exercise[] {
  return EXERCISE_LIBRARY.map((entry, i) => libraryEntryToExercise(entry, i));
}

/**
 * Search/filter the exercise library with combined filters.
 */
export function searchExercises(
  query: string,
  filters?: {
    muscle?: MuscleGroup;
    equipment?: EquipmentType;
    bodyPart?: BodyPart;
    exerciseType?: ExerciseType;
    difficulty?: ExerciseDifficulty;
    category?: ExerciseCategory;
  }
): ExerciseLibraryEntry[] {
  const q = query.toLowerCase().trim();
  return EXERCISE_LIBRARY.filter(ex => {
    // Text search
    if (q) {
      const matchesName = ex.name.toLowerCase().includes(q);
      const matchesAlias = ex.aliases?.some(a => a.toLowerCase().includes(q));
      const matchesMuscle = ex.primaryMuscles.some(m => m.toLowerCase().includes(q)) ||
        ex.secondaryMuscles.some(m => m.toLowerCase().includes(q));
      const matchesEquipment = ex.equipment.toLowerCase().includes(q);
      const matchesBodyPart = ex.bodyPart.toLowerCase().includes(q);
      if (!matchesName && !matchesAlias && !matchesMuscle && !matchesEquipment && !matchesBodyPart) {
        return false;
      }
    }

    // Filters
    if (filters?.muscle && !ex.primaryMuscles.includes(filters.muscle) && !ex.secondaryMuscles.includes(filters.muscle)) {
      return false;
    }
    if (filters?.equipment && ex.equipment !== filters.equipment) {
      return false;
    }
    if (filters?.bodyPart && ex.bodyPart !== filters.bodyPart) {
      return false;
    }
    if (filters?.exerciseType && ex.exerciseType !== filters.exerciseType) {
      return false;
    }
    if (filters?.difficulty && ex.difficulty !== filters.difficulty) {
      return false;
    }
    if (filters?.category && ex.category !== filters.category) {
      return false;
    }

    return true;
  });
}

/**
 * Group exercises by primary muscle group.
 */
export function groupByMuscle(): Map<MuscleGroup, ExerciseLibraryEntry[]> {
  const groups = new Map<MuscleGroup, ExerciseLibraryEntry[]>();
  for (const ex of EXERCISE_LIBRARY) {
    const primary = ex.primaryMuscles[0] || 'full_body';
    if (!groups.has(primary)) groups.set(primary, []);
    groups.get(primary)!.push(ex);
  }
  return groups;
}

/**
 * Group exercises by body part.
 */
export function groupByBodyPart(): Map<BodyPart, ExerciseLibraryEntry[]> {
  const groups = new Map<BodyPart, ExerciseLibraryEntry[]>();
  for (const ex of EXERCISE_LIBRARY) {
    if (!groups.has(ex.bodyPart)) groups.set(ex.bodyPart, []);
    groups.get(ex.bodyPart)!.push(ex);
  }
  return groups;
}

/**
 * Get available filter options based on current results
 * (prevents impossible filter combinations)
 */
export function getAvailableFilters(exercises: ExerciseLibraryEntry[]) {
  const muscles = new Set<MuscleGroup>();
  const equipment = new Set<EquipmentType>();
  const bodyParts = new Set<BodyPart>();
  const types = new Set<ExerciseType>();
  const difficulties = new Set<ExerciseDifficulty>();

  for (const ex of exercises) {
    ex.primaryMuscles.forEach(m => muscles.add(m));
    ex.secondaryMuscles.forEach(m => muscles.add(m));
    equipment.add(ex.equipment);
    bodyParts.add(ex.bodyPart);
    types.add(ex.exerciseType);
    difficulties.add(ex.difficulty);
  }

  return {
    muscles: [...muscles].sort(),
    equipment: [...equipment].sort(),
    bodyParts: [...bodyParts].sort(),
    exerciseTypes: [...types].sort(),
    difficulties: [...difficulties],
  };
}
