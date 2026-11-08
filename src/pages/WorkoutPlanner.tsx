import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useFitnessContext } from '../context/FitnessContext';
import { useWorkoutBuilder } from '../context/WorkoutBuilderContext';
import type { WorkoutTemplate, WorkoutSession } from '../types/workout';
import { formatDuration, formatVolume } from '../types/workout';
import type { MuscleGroup } from '../types/exercise';
import { quickPrompt, type UserContext } from '../services/gemini';
import MuscleHeatmap from '../components/MuscleHeatmap';
import ExerciseMedia from '../components/media/ExerciseMedia';
import { storage } from '../utils/storage';
import ConfirmModal from '../components/ConfirmModal';
import { EXERCISE_LIBRARY as GLOBAL_EXERCISE_LIBRARY } from '../data/exerciseLibrary';
import HistoryCalendar from '../components/WorkoutHistory/HistoryCalendar';
import SessionDetail from '../components/WorkoutHistory/SessionDetail';
import LogPastWorkoutModal from '../components/WorkoutSession/LogPastWorkoutModal';
import QuickStartWorkoutModal from '../components/WorkoutSession/QuickStartWorkoutModal';
import { QUICK_SPLIT_PRESETS, buildQuickTemplate } from '../data/quickWorkoutSplits';
import { 
  Play, 
  Calendar, 
  PlusSquare, 
  History, 
  ChevronRight, 
  ChevronUp, 
  ChevronDown,
  RotateCcw, 
  RotateCw,
  CheckCircle2, 
  Check,
  Copy, 
  Trash2, 
  Edit3, 
  Lightbulb, 
  Plus,
  BedDouble,
  Info,
  Dumbbell,
  Sparkles,
  Search,
  Clock,
  Flame,
  Trophy,
  Repeat,
  Activity,
  X,
  ArrowLeft,
  Loader2,
  AlertTriangle,
  Image as ImageIcon
} from 'lucide-react';

interface Exercise {
  id: string;
  name: string;
  reps: string;
  tips: string;
  muscles: string[];
  description?: string;
  videoUrl?: string; // YouTube video ID (legacy)
  imageUrl?: string; // High-Res Thumbnail
  gifUrl?: string;   // Animated GIF
}

interface DailyWorkout {
  id?: string;
  dayStr: string;
  title: string;
  duration: number;
  kcal: number;
  exercises: Exercise[];
  tip?: string;
  isRest?: boolean;
  description?: string;
  targetMuscles?: string[];
  warmupInfo?: string;
}

interface AIPlanExercise {
  name?: string;
  reps?: string;
  muscles?: string[];
  tips?: string;
  description?: string;
}

interface AIPlanDay {
  dayStr?: string;
  title?: string;
  duration?: number;
  kcal?: number;
  isRest?: boolean;
  description?: string;
  targetMuscles?: string[];
  warmupInfo?: string;
  exercises?: AIPlanExercise[];
}

type SetType = 'N' | 'D' | 'F' | 'W';

interface LiveSet {
  reps: string;
  weight: string;
  completed: boolean;
  rpe: string;
  setType: SetType;
}

const createExercise = (
  name: string,
  reps: string,
  muscles: string[],
  tips: string,
  description: string = '',
  videoUrl: string = '',
  fallbackImageUrl: string = '/ai_gym_placeholder.png',
  gifUrl: string = ''
): Exercise => {
  const libEntry = GLOBAL_EXERCISE_LIBRARY.find(
    l => l.name.toLowerCase() === name.toLowerCase() ||
         (l.aliases && l.aliases.some(a => a.toLowerCase() === name.toLowerCase()))
  );
  const validUrl = resolveValidVideo(videoUrl || libEntry?.videoId);
  const resolvedGif = gifUrl || libEntry?.gifUrl || '';
  const resolvedImage = libEntry?.imageUrl || (validUrl ? `https://img.youtube.com/vi/${validUrl}/hqdefault.jpg` : fallbackImageUrl);
  return {
    id: crypto.randomUUID(),
    name,
    reps,
    muscles,
    tips: tips || libEntry?.tips || '',
    description,
    videoUrl: validUrl,
    imageUrl: resolvedImage,
    gifUrl: resolvedGif,
  };
};

const resolveValidVideo = (url?: string) => {
  if (!url) return '';
  // Extract YouTube ID if a full URL was passed, otherwise use as-is
  const idMatch = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=))?([\w-]{8,15})/);
  return idMatch ? idMatch[1] : url;
};

const STARTER_BLUEPRINTS: WorkoutTemplate[] = [
  {
    id: 'starter_push',
    name: 'Push Power (Chest, Shoulders, Triceps)',
    description: 'Hypertrophy-focused pressing protocol for upper body pushing development.',
    type: 'strength',
    targetMuscles: ['chest', 'shoulders', 'triceps'],
    exercises: [
      {
        exerciseId: 'barbell_bench_press',
        exerciseName: 'Barbell Bench Press',
        exerciseType: 'weight_reps',
        primaryMuscles: ['chest', 'triceps', 'shoulders'],
        sets: [
          { targetReps: 8, targetWeight: 135, setType: 'normal' },
          { targetReps: 8, targetWeight: 135, setType: 'normal' },
          { targetReps: 8, targetWeight: 135, setType: 'normal' },
        ],
        restSeconds: 120,
        notes: '',
      },
      {
        exerciseId: 'incline_dumbbell_press',
        exerciseName: 'Incline Dumbbell Press',
        exerciseType: 'weight_reps',
        primaryMuscles: ['chest', 'shoulders'],
        sets: [
          { targetReps: 10, targetWeight: 50, setType: 'normal' },
          { targetReps: 10, targetWeight: 50, setType: 'normal' },
          { targetReps: 10, targetWeight: 50, setType: 'normal' },
        ],
        restSeconds: 90,
        notes: '',
      },
      {
        exerciseId: 'overhead_press',
        exerciseName: 'Standing Overhead Press',
        exerciseType: 'weight_reps',
        primaryMuscles: ['shoulders', 'triceps'],
        sets: [
          { targetReps: 8, targetWeight: 95, setType: 'normal' },
          { targetReps: 8, targetWeight: 95, setType: 'normal' },
        ],
        restSeconds: 90,
        notes: '',
      },
      {
        exerciseId: 'lateral_raise',
        exerciseName: 'Dumbbell Lateral Raise',
        exerciseType: 'weight_reps',
        primaryMuscles: ['shoulders'],
        sets: [
          { targetReps: 15, targetWeight: 20, setType: 'normal' },
          { targetReps: 15, targetWeight: 20, setType: 'normal' },
          { targetReps: 15, targetWeight: 20, setType: 'normal' },
        ],
        restSeconds: 60,
        notes: '',
      },
      {
        exerciseId: 'tricep_rope_pushdown',
        exerciseName: 'Triceps Rope Pushdown',
        exerciseType: 'weight_reps',
        primaryMuscles: ['triceps'],
        sets: [
          { targetReps: 12, targetWeight: 45, setType: 'normal' },
          { targetReps: 12, targetWeight: 45, setType: 'normal' },
        ],
        restSeconds: 60,
        notes: '',
      },
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'starter_pull',
    name: 'Pull & Width (Back & Biceps)',
    description: 'V-taper vertical & horizontal pulling protocol for back density and arm strength.',
    type: 'strength',
    targetMuscles: ['back', 'lats', 'biceps'],
    exercises: [
      {
        exerciseId: 'lat_pulldown',
        exerciseName: 'Lat Pulldown / Pull-Ups',
        exerciseType: 'weight_reps',
        primaryMuscles: ['back', 'lats', 'biceps'],
        sets: [
          { targetReps: 10, targetWeight: 120, setType: 'normal' },
          { targetReps: 10, targetWeight: 120, setType: 'normal' },
          { targetReps: 10, targetWeight: 120, setType: 'normal' },
        ],
        restSeconds: 90,
        notes: '',
      },
      {
        exerciseId: 'barbell_row',
        exerciseName: 'Barbell Bent-Over Row',
        exerciseType: 'weight_reps',
        primaryMuscles: ['back', 'lats'],
        sets: [
          { targetReps: 8, targetWeight: 135, setType: 'normal' },
          { targetReps: 8, targetWeight: 135, setType: 'normal' },
          { targetReps: 8, targetWeight: 135, setType: 'normal' },
        ],
        restSeconds: 90,
        notes: '',
      },
      {
        exerciseId: 'dumbbell_curl',
        exerciseName: 'Incline Dumbbell Bicep Curl',
        exerciseType: 'weight_reps',
        primaryMuscles: ['biceps'],
        sets: [
          { targetReps: 12, targetWeight: 30, setType: 'normal' },
          { targetReps: 12, targetWeight: 30, setType: 'normal' },
          { targetReps: 12, targetWeight: 30, setType: 'normal' },
        ],
        restSeconds: 60,
        notes: '',
      },
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'starter_legs',
    name: 'Leg Hypertrophy & Posterior Chain',
    description: 'Complete lower body development balancing quad loading, hamstrings, and calves.',
    type: 'strength',
    targetMuscles: ['quads', 'hamstrings', 'glutes', 'calves'],
    exercises: [
      {
        exerciseId: 'barbell_squat',
        exerciseName: 'Barbell Back Squat',
        exerciseType: 'weight_reps',
        primaryMuscles: ['quads', 'glutes'],
        sets: [
          { targetReps: 6, targetWeight: 185, setType: 'normal' },
          { targetReps: 6, targetWeight: 185, setType: 'normal' },
          { targetReps: 6, targetWeight: 185, setType: 'normal' },
        ],
        restSeconds: 120,
        notes: '',
      },
      {
        exerciseId: 'romanian_deadlift',
        exerciseName: 'Romanian Deadlift (RDL)',
        exerciseType: 'weight_reps',
        primaryMuscles: ['hamstrings', 'glutes'],
        sets: [
          { targetReps: 10, targetWeight: 145, setType: 'normal' },
          { targetReps: 10, targetWeight: 145, setType: 'normal' },
          { targetReps: 10, targetWeight: 145, setType: 'normal' },
        ],
        restSeconds: 90,
        notes: '',
      },
      {
        exerciseId: 'leg_press',
        exerciseName: 'Leg Press',
        exerciseType: 'weight_reps',
        primaryMuscles: ['quads'],
        sets: [
          { targetReps: 12, targetWeight: 270, setType: 'normal' },
          { targetReps: 12, targetWeight: 270, setType: 'normal' },
        ],
        restSeconds: 90,
        notes: '',
      },
      {
        exerciseId: 'standing_calf_raise',
        exerciseName: 'Standing Calf Raise',
        exerciseType: 'weight_reps',
        primaryMuscles: ['calves'],
        sets: [
          { targetReps: 15, targetWeight: 100, setType: 'normal' },
          { targetReps: 15, targetWeight: 100, setType: 'normal' },
          { targetReps: 15, targetWeight: 100, setType: 'normal' },
        ],
        restSeconds: 45,
        notes: '',
      },
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'starter_upper_power',
    name: 'Upper Body Power & Hypertrophy',
    description: 'High-yield compound movements combining chest, back, and arm stimulus in one session.',
    type: 'strength',
    targetMuscles: ['chest', 'back', 'shoulders', 'biceps', 'triceps'],
    exercises: [
      {
        exerciseId: 'barbell_bench_press',
        exerciseName: 'Barbell Bench Press',
        exerciseType: 'weight_reps',
        primaryMuscles: ['chest', 'triceps'],
        sets: [
          { targetReps: 6, targetWeight: 155, setType: 'normal' },
          { targetReps: 6, targetWeight: 155, setType: 'normal' },
          { targetReps: 6, targetWeight: 155, setType: 'normal' },
        ],
        restSeconds: 120,
        notes: '',
      },
      {
        exerciseId: 'barbell_row',
        exerciseName: 'Barbell Bent-Over Row',
        exerciseType: 'weight_reps',
        primaryMuscles: ['back'],
        sets: [
          { targetReps: 8, targetWeight: 145, setType: 'normal' },
          { targetReps: 8, targetWeight: 145, setType: 'normal' },
          { targetReps: 8, targetWeight: 145, setType: 'normal' },
        ],
        restSeconds: 90,
        notes: '',
      },
      {
        exerciseId: 'overhead_press',
        exerciseName: 'Overhead Barbell Press',
        exerciseType: 'weight_reps',
        primaryMuscles: ['shoulders'],
        sets: [
          { targetReps: 8, targetWeight: 95, setType: 'normal' },
          { targetReps: 8, targetWeight: 95, setType: 'normal' },
        ],
        restSeconds: 90,
        notes: '',
      },
      {
        exerciseId: 'hammer_curl',
        exerciseName: 'Dumbbell Hammer Curl',
        exerciseType: 'weight_reps',
        primaryMuscles: ['biceps', 'forearms'],
        sets: [
          { targetReps: 12, targetWeight: 30, setType: 'normal' },
          { targetReps: 12, targetWeight: 30, setType: 'normal' },
        ],
        restSeconds: 60,
        notes: '',
      },
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

/* 
 * 75+ PROFESSIONAL EXERCISE LIBRARY 
 * We rotate 30 verified YouTube IDs across similar biomechanical movements 
 * to guarantee that every single exercise resolves an authentic HD Youtube Thumbnail!
 */
export const EXERCISE_LIBRARY: Omit<Exercise, 'id' | 'reps'>[] = [
  // CHEST 
  { name: 'Barbell Bench Press', muscles: ['Pectorals', 'Triceps'], tips: 'Retract scapula, touch lower chest.', description: 'The fundamental pushing movement.', videoUrl: 'hWbUlkb5Ms4' },
  { name: 'Incline Dumbbell Press', muscles: ['Upper Pectorals', 'Front Delts'], tips: 'Bench at 30 degrees. Tuck elbows.', description: 'Builds upper chest mass.', videoUrl: '8fXfwG4ftaQ' },
  { name: 'Decline Bench Press', muscles: ['Lower Pectorals', 'Triceps'], tips: 'Control the descent slowly.', description: 'Isolates the lower chest.', videoUrl: 'a-UFQE4oxWY' },
  { name: 'Cable Crossovers', muscles: ['Pectorals'], tips: 'Squeeze deep at the center.', description: 'Constant tension isolation.', videoUrl: 'tGXIQR89-JE' },
  { name: 'Dumbbell Flys', muscles: ['Pectorals'], tips: 'Keep a slight bend in the elbows.', description: 'Excellent chest stretching movement.', videoUrl: 'atcyT99YDeI' },
  { name: 'Pec Deck Machine', muscles: ['Pectorals'], tips: 'Keep elbows high, squeeze chest.', description: 'Machine isolation for massive pumps.', videoUrl: 'a9vQ_hwIksU' },
  { name: 'Push-ups', muscles: ['Pectorals', 'Triceps', 'Core'], tips: 'Elbows at 45 degrees, core tight.', description: 'Classic bodyweight builder.', videoUrl: 'pKZ-lkKKMws' },
  { name: 'Weighted Dips', muscles: ['Lower Pectorals', 'Triceps'], tips: 'Lean forward to hit chest.', description: 'Heavy compound pushing power.', videoUrl: '4ua3MzaU0QU' },
  { name: 'Guillotine Press', muscles: ['Upper Pectorals'], tips: 'Bar to neck, wide grip.', description: 'Advanced upper chest targeted lift.', videoUrl: 'LVFfcIP9kf4' },
  { name: 'Svend Press', muscles: ['Inner Pectorals'], tips: 'Squeeze plates together hard.', description: 'Activates the center chest.', videoUrl: 'OZ1thS_rrpg' },
  { name: 'Floor Press', muscles: ['Triceps', 'Pectorals'], tips: 'Pause when triceps hit floor.', description: 'Improves lockout power.', videoUrl: 'TvPviMnKg6s' },
  { name: 'Dumbbell Pullover', muscles: ['Pectorals', 'Lats'], tips: 'Keep hips low, stretch deep.', description: 'Expands the ribcage.', videoUrl: 'Datv2L6t3-4' },
  { name: 'Landmine Chest Press', muscles: ['Upper Pectorals', 'Front Delts'], tips: 'Squeeze hands together at the top.', description: 'Standing upper chest builder.', videoUrl: 'Kk_PaZZ6ARs' },
  { name: 'Hex Press', muscles: ['Inner Pectorals', 'Triceps'], tips: 'Crush dumbbells together throughout.', description: 'Forces massive chest contraction.', videoUrl: 'nyaEB9GAdqE' },
  { name: 'Spoto Press', muscles: ['Pectorals'], tips: 'Pause two inches above chest.', description: 'Builds sticking point strength.', videoUrl: 'yi6gu8NYDcs' },
  { name: 'Suspension Push-ups', muscles: ['Pectorals', 'Core'], tips: 'Keep core perfectly rigid.', description: 'Adds brutal instability to the pushup.', videoUrl: 'pKZ-lkKKMws' },
  { name: 'Band Resisted Push-ups', muscles: ['Pectorals', 'Triceps'], tips: 'Explode up against the band.', description: 'Develops raw pressing power.', videoUrl: 'r6wW6B7l7xw' },
  { name: 'Around The Worlds', muscles: ['Pectorals'], tips: 'Light weight, focus on stretch.', description: 'Full rotational chest mobility.', videoUrl: 'HiCEQXn7mSM' },
  { name: 'Low Cable Crossovers', muscles: ['Upper Pectorals'], tips: 'Pull upwards from the floor.', description: 'Targets the clavicular head.', videoUrl: 'CYviQI1Mnwg' },
  { name: 'Machine Chest Press', muscles: ['Pectorals'], tips: 'Drive through your palms.', description: 'Safe mechanical overload.', videoUrl: 'Qu7-ceCvq7w' },

  // BACK 
  { name: 'Barbell Deadlift', muscles: ['Lower Back', 'Hamstrings', 'Glutes'], tips: 'Keep bar touching shins.', description: 'Ultimate posterior chain strength.', videoUrl: 'ZaTM37cfiDs' },
  { name: 'Pull-up', muscles: ['Latissimus Dorsi', 'Biceps'], tips: 'Chest to bar. Full stretch.', description: 'Builds massive back width.', videoUrl: 'ym1V5H35IpA' },
  { name: 'Barbell Row', muscles: ['Rhomboids', 'Lats'], tips: 'Torso parallel, pull to waist.', description: 'Thickens the entire mid-back.', videoUrl: 'phVtqawIgbk' },
  { name: 'Lat Pulldown', muscles: ['Latissimus Dorsi'], tips: 'Arch back, pull to upper chest.', description: 'Machine pull-up alternative.', videoUrl: 'bNmvKpJSWKM' },
  { name: 'Seated Cable Row', muscles: ['Rhomboids', 'Middle Back'], tips: 'Squeeze shoulder blades.', description: 'Great for posture.', videoUrl: 'qD1WZ5pSuvk' },
  { name: 'T-Bar Row', muscles: ['Middle Back', 'Lats'], tips: 'Keep lower back completely flat.', description: 'Heavy back isolation.', videoUrl: 'MIulz5576AY' },
  { name: 'Meadows Row', muscles: ['Lats'], tips: 'Stagger stance, pull high.', description: 'Unilateral lat development.', videoUrl: 'uuJdSYXy7g0' },
  { name: 'Rack Pulls', muscles: ['Lower Back', 'Traps'], tips: 'Pull from the knee up.', description: 'Overloads the top of the deadlift.', videoUrl: 'ZhHw9HZGezY' },
  { name: 'Dumbbell Row', muscles: ['Lats'], tips: 'Pull dumbbell to the hip.', description: 'Isolates each lat individually.', videoUrl: 'vu_YDt9nGv4' },
  { name: 'Straight Arm Pulldown', muscles: ['Lats'], tips: 'Keep arms slightly bent.', description: 'Isolates lats without bicep use.', videoUrl: 'hAMcfubonDc' },
  { name: 'Chin-ups', muscles: ['Lats', 'Biceps'], tips: 'Underhand grip, chin over bar.', description: 'More bicep dominant back pull.', videoUrl: 'Oi3bW9nQmGI' },
  { name: 'Good Mornings', muscles: ['Lower Back', 'Hamstrings'], tips: 'Hinge at hips, keep back flat.', description: 'Strengthens the spinal erectors.', videoUrl: 'tX_RHDCE4kY' },
  { name: 'Renegade Row', muscles: ['Lats', 'Core'], tips: 'Keep hips from swaying.', description: 'Core and back combination.', videoUrl: '_-wTwFQiWL4' },
  { name: 'Inverted Row', muscles: ['Mid Back'], tips: 'Body straight, pull to sternum.', description: 'Bodyweight horizontal pull.', videoUrl: 'EfE7JeD8o6Y' },
  { name: 'Pendlay Row', muscles: ['Rhomboids', 'Lats'], tips: 'Reset the bar on the floor every rep.', description: 'Explosive back builder from dead stop.', videoUrl: 'tYxEGi7ir4I' },
  { name: 'Yates Row', muscles: ['Lats', 'Traps'], tips: 'Underhand grip, torso at 45 degrees.', description: 'Dorian Yates signature back move.', videoUrl: 'sNidAp7RWU4' },
  { name: 'Kroc Row', muscles: ['Lats', 'Grip'], tips: 'Heavy weight, high reps.', description: 'Brutal unilateral dumbbell row.', videoUrl: 'bX-LZ5nBLBk' },
  { name: 'Seal Row', muscles: ['Mid Back'], tips: 'Lie face down on a tall bench.', description: 'Completely eliminates momentum.', videoUrl: '1PxAsqr1WUI' },
  { name: 'V-Bar Pulldown', muscles: ['Lats (Lower)'], tips: 'Pull to the lowest point of your chest.', description: 'Forces extreme lower lat stretching.', videoUrl: 'KDK9MSAIfW8' },
  { name: 'Wide Grip Pull-up', muscles: ['Latissimus Dorsi (Outer)'], tips: 'Hands far past shoulders.', description: 'Maximal back widening focus.', videoUrl: 'NwrJk3AWX50' },
  { name: 'Neutral Grip Pull-up', muscles: ['Lats', 'Brachialis'], tips: 'Palms facing each other.', description: 'Safest pulling angle for joints.', videoUrl: 'Ai4S1uzMP7A' },
  { name: 'Superman Extensions', muscles: ['Lower Back'], tips: 'Hold contraction at the top.', description: 'Bodyweight spinal extension.', videoUrl: 'jTNpZIl1qU0' },

  // SHOULDERS & TRAPS
  { name: 'Standing Overhead Press', muscles: ['Deltoids', 'Triceps'], tips: 'Squeeze glutes, press straight up.', description: 'Primary shoulder mass builder.', videoUrl: '-oxCbw3INdg' },
  { name: 'Seated Dumbbell Press', muscles: ['Front Delts'], tips: 'Bench at 90 degrees.', description: 'Takes momentum out of the press.', videoUrl: 'BGlB8hN-4CI' },
  { name: 'Dumbbell Lateral Raises', muscles: ['Lateral Delts'], tips: 'Pour the water at the top.', description: 'Builds wide capping shoulders.', videoUrl: 'Kl3LEzQ5Zqs' },
  { name: 'Cable Lateral Raises', muscles: ['Lateral Delts'], tips: 'Pull from behind the back.', description: 'Constant tension on the side delt.', videoUrl: 'lMJUXEvcMkQ' },
  { name: 'Face Pulls', muscles: ['Rear Delts', 'Rotator Cuffs'], tips: 'Pull to forehead level.', description: 'Crucial for shoulder health.', videoUrl: 'IeOqdw9WI90' },
  { name: 'Reverse Pec Deck', muscles: ['Rear Delts'], tips: 'Lead with the pinkies.', description: 'Isolates the posterior deltoid.', videoUrl: '-TKqxK7-ehc' },
  { name: 'Front Raises', muscles: ['Front Delts'], tips: 'Raise to eye level only.', description: 'Isolates the anterior deltoid.', videoUrl: 'yHx8wPv4RPo' },
  { name: 'Barbell Shrugs', muscles: ['Trapezius'], tips: 'Elevate straight up, pause 1s.', description: 'Thickens the upper back/neck.', videoUrl: 'MlqHEfydPpE' },
  { name: 'Dumbbell Shrugs', muscles: ['Trapezius'], tips: 'Keep arms straight, squeeze traps.', description: 'Avoid rolling the shoulders.', videoUrl: 'rFsSeClGnNA' },
  { name: 'Upright Row', muscles: ['Lateral Delts', 'Traps'], tips: 'Pull elbows higher than wrists.', description: 'Compound movement for shoulder width.', videoUrl: 'D_U89CXmTPA' },
  { name: 'Lu Raises', muscles: ['Full Deltoid'], tips: 'Full range of motion overhead.', description: 'Olympic lifter variation of raises.', videoUrl: 'tlJhw6OFOao' },
  { name: 'Arnold Press', muscles: ['Front Delts', 'Lateral Delts'], tips: 'Rotate palms on the way up.', description: 'Hits all heads of the deltoid.', videoUrl: '6K_N9AGhItQ' },
  { name: 'Z Press', muscles: ['Deltoids', 'Core'], tips: 'Sit perfectly upright on floor.', description: 'Brutal no-momentum shoulder press.', videoUrl: 'FUJPvAD9jOo' },
  { name: 'Bradford Press', muscles: ['Deltoids'], tips: 'Press front to back over head.', description: 'Constant tension shoulder builder.', videoUrl: 'KCw9amy9vxA' },
  { name: 'Landmine Shoulder Press', muscles: ['Front Delts'], tips: 'Lean into the press.', description: 'Great for shoulder joint health.', videoUrl: 'wMSpAICXUb4' },
  { name: 'Upright Cable Row', muscles: ['Lateral Delts'], tips: 'Use a wide grip on the bar.', description: 'Smoother resistance than barbells.', videoUrl: 'D_U89CXmTPA' },
  { name: 'Front Cable Raise', muscles: ['Front Delts'], tips: 'Face away from the machine.', description: 'Deep stretch on the front delt.', videoUrl: 'NdQE5Fhfqn4' },
  { name: 'Band Pull-Aparts', muscles: ['Rear Delts', 'Traps'], tips: 'Keep arms perfectly straight.', description: 'High volume postural correction.', videoUrl: 'SLFDrgKarUs' },
  { name: 'Y-Raises', muscles: ['Lower Traps'], tips: 'Thumbs up, form a Y.', description: 'Targets the lower traps and stabilizers.', videoUrl: 'rPRkzLXsoKI' },
  { name: 'Machine Shoulder Press', muscles: ['Deltoids'], tips: 'Keep back flat against the pad.', description: 'Isolated heavy pressing.', videoUrl: '6v4nrRVySj0' },

  // ARMS 
  { name: 'Barbell Bicep Curls', muscles: ['Biceps Brachii'], tips: 'Keep elbows pinned to sides.', description: 'Heavy mass builder for biceps.', videoUrl: '54x2WF1_Suc' },
  { name: 'Hammer Curls', muscles: ['Brachialis', 'Forearms'], tips: 'Neutral grip throughout.', description: 'Thickens the side of the arm.', videoUrl: '8H5oWMNWWeQ' },
  { name: 'Preacher Curls', muscles: ['Biceps Brachii'], tips: 'Full extension at the bottom.', description: 'Isolates the bicep peak.', videoUrl: 'Htw-s61mOw0' },
  { name: 'Concentration Curls', muscles: ['Bicep Peak'], tips: 'Rest elbow on inner thigh.', description: 'Strict bicep isolation.', videoUrl: 'EjUnEEfTSEY' },
  { name: 'Spider Curls', muscles: ['Bicep Short Head'], tips: 'Lean over incline bench.', description: 'Prevents any momentum usage.', videoUrl: 'ivS3G35bapw' },
  { name: 'Tricep Pushdowns', muscles: ['Triceps'], tips: 'Lock elbows at your side.', description: 'Builds tricep sweep.', videoUrl: 'Rc7-euA8FDI' },
  { name: 'Overhead Tricep Extension', muscles: ['Triceps (Long Head)'], tips: 'Keep elbows pointing up.', description: 'Stretches the long head of triceps.', videoUrl: 'AYqg9S5FrUU' },
  { name: 'Skull Crushers', muscles: ['Triceps'], tips: 'Lower to forehead slowly.', description: 'Massive heavy tricep builder.', videoUrl: 'EXUdJH-lhKc' },
  { name: 'Close-Grip Bench Press', muscles: ['Triceps', 'Pectorals'], tips: 'Hands shoulder-width apart.', description: 'Compound pressing for tricep thickness.', videoUrl: '4yKLxOsrGfg' },
  { name: 'JM Press', muscles: ['Triceps'], tips: 'Bar path straight to chin.', description: 'Powerlifting variation of skull crushers.', videoUrl: 'T6hKsaGd0bU' },
  { name: 'Wrist Curls', muscles: ['Forearms'], tips: 'Rest arms on bench, curl wrists.', description: 'Isolates flexors.', videoUrl: 'sKXqNO2KQp8' },
  { name: 'Reverse Curls', muscles: ['Brachioradialis'], tips: 'Pronated overhand grip.', description: 'Develops thick upper forearms.', videoUrl: 'ZG2n5IcYIcY' },
  { name: 'Incline Dumbbell Curls', muscles: ['Biceps (Long Head)'], tips: 'Let arms hang straight down behind body.', description: 'Maximal stretch on the biceps.', videoUrl: 'XhIsIcjIbCw' },
  { name: 'Zottman Curls', muscles: ['Biceps', 'Forearms'], tips: 'Curl supinated, lower pronated.', description: 'Complete arm development.', videoUrl: '5Go_uOTnFl0' },
  { name: 'Waiter Curls', muscles: ['Bicep Peak'], tips: 'Hold top of one dumbbell with both hands.', description: 'Intense short head contraction.', videoUrl: 's2nkByScgi4' },
  { name: 'Cable Rope Curls', muscles: ['Brachialis'], tips: 'Pull rope apart at the top.', description: 'Constant tension hammer variant.', videoUrl: 'na-mQVvtWpU' },
  { name: 'Drag Curls', muscles: ['Biceps'], tips: 'Drag bar straight up torso.', description: 'Eliminates front delt involvement.', videoUrl: '6yMZ3O5Yf_I' },
  { name: 'Bicep 21s', muscles: ['Biceps'], tips: '7 bottom, 7 top, 7 full reps.', description: 'Extreme time-under-tension pump.', videoUrl: 'jgmESOA4J5E' },
  { name: 'Tate Press', muscles: ['Triceps'], tips: 'Dumbbells pointing at chest.', description: 'Hits the triceps right above the elbow.', videoUrl: 'rELnGugnNSk' },
  { name: 'Tricep Kickbacks', muscles: ['Triceps'], tips: 'Extend fully and pause 1s.', description: 'Total isolation at the peak.', videoUrl: 'GZ3NzlJs_yg' },
  { name: 'French Press', muscles: ['Triceps (Long Head)'], tips: 'Bar behind head while seated.', description: 'A seated skull crusher variation.', videoUrl: '95rudq8ZeAc' },
  { name: 'Rolling Tricep Extensions', muscles: ['Triceps'], tips: 'Roll elbows back to stretch lats.', description: 'Powerful compound tricep lift.', videoUrl: 'Rc7-euA8FDI' },
  { name: 'Diamond Push-ups', muscles: ['Triceps', 'Inner Chest'], tips: 'Hands form a diamond.', description: 'Incredible bodyweight tricep pump.', videoUrl: 'PPTj-MW2tcs' },
  { name: 'Bench Dips', muscles: ['Triceps'], tips: 'Keep back close to the bench.', description: 'Bodyweight tricep burnout.', videoUrl: '4ua3MzaU0QU' },

  // LEGS 
  { name: 'Barbell Back Squat', muscles: ['Quads', 'Glutes', 'Core'], tips: 'Break at hips/knees together.', description: 'King of all leg exercises.', videoUrl: 'dW3zj79xfrc' },
  { name: 'Front Squat', muscles: ['Quads', 'Core'], tips: 'Keep elbows incredibly high.', description: 'Forces vertical torso and hits quads hard.', videoUrl: '_qv0m3tPd3s' },
  { name: 'Hack Squat', muscles: ['Quads'], tips: 'Place feet low for quad sweep.', description: 'Machine isolation for deep quads.', videoUrl: 'g9i05umL5vc' },
  { name: 'Bulgarian Split Squat', muscles: ['Quads', 'Glutes'], tips: 'Back foot on bench, front does work.', description: 'The ultimate unilateral leg movement.', videoUrl: 'Q20qIs79tJc' },
  { name: 'Leg Press', muscles: ['Quads', 'Hamstrings'], tips: 'Do not lock out knees hard.', description: 'Heavy overload without spinal compression.', videoUrl: 'EotSw18oR9w' },
  { name: 'Sissy Squat', muscles: ['Quads'], tips: 'Lean back, knees forward.', description: 'Intense quad stretch and activation.', videoUrl: 'AYN-U5nZieY' },
  { name: 'Leg Extension', muscles: ['Quads'], tips: 'Squeeze at peak contraction.', description: 'Deep structural cuts in front leg.', videoUrl: 'w72YiHz15CA' },
  { name: 'Romanian Deadlift (RDL)', muscles: ['Hamstrings', 'Glutes'], tips: 'Push hips back until stretch.', description: 'Ultimate hamstring mass builder.', videoUrl: 'JCXUYuzwNrM' },
  { name: 'Stiff-Leg Deadlift', muscles: ['Hamstrings'], tips: 'Legs entirely straight.', description: 'Focuses entirely on hamstring stretch.', videoUrl: '4ZEZd1zVJzE' },
  { name: 'Hip Thrust', muscles: ['Glutes'], tips: 'Drive through heels, squeeze loud.', description: 'Isolates glutes with maximum tension.', videoUrl: '_i6qpcI1Nw4' },
  { name: 'Glute Kickbacks', muscles: ['Glutes'], tips: 'Kick straight back, no spine bend.', description: 'Cable isolation for upper glutes.', videoUrl: 'SqO-VUEak2M' },
  { name: 'Hamstring Curl (Seated)', muscles: ['Hamstrings'], tips: 'Pad firmly on thighs.', description: 'Prevents cheating on string curls.', videoUrl: 'F488kNIv3_Q' },
  { name: 'Hamstring Curl (Lying)', muscles: ['Hamstrings'], tips: 'Hips pinned to pad.', description: 'Isolates back of knee mechanism.', videoUrl: 'F488kNIv3_Q' },
  { name: 'Walking Lunges', muscles: ['Quads', 'Glutes'], tips: 'Long strides for glutes, short for quads.', description: 'Dynamic leg mass.', videoUrl: 'BYe4uyGF-h4' },
  { name: 'Calf Raises (Standing)', muscles: ['Gastrocnemius'], tips: 'Deep stretch at bottom.', description: 'Heavy calf overload.', videoUrl: 'gwLzBJYoWlI' },
  { name: 'Calf Raises (Seated)', muscles: ['Soleus'], tips: 'Pause 2 seconds at the top.', description: 'Hits the underlying calf structure.', videoUrl: 'gwLzBJYoWlI' },
  { name: 'Adductor Machine', muscles: ['Inner Thighs'], tips: 'Controlled squeeze inward.', description: 'Leg stability.', videoUrl: 'fwpMYCWdUNY' },
  { name: 'Abductor Machine', muscles: ['Outer Thighs', 'Glutes'], tips: 'Drive knees outwards.', description: 'Outer hip development.', videoUrl: 'uFWuVSxsT0Y' },
  { name: 'Goblet Squat', muscles: ['Quads', 'Core'], tips: 'Hold dumbbell vertically at chest.', description: 'Great for squat depth and form.', videoUrl: '7-80HiXX1K8' },
  { name: 'Zercher Squat', muscles: ['Quads', 'Core'], tips: 'Hold bar in the crook of elbows.', description: 'Brutal combination of leg and core work.', videoUrl: 'xtMpMCCzPrU' },
  { name: 'Jefferson Squat', muscles: ['Quads', 'Glutes'], tips: 'Straddle the barbell.', description: 'Old school asymmetrical strength.', videoUrl: 'JhZxwafQX68' },
  { name: 'Dumbbell Step-Ups', muscles: ['Quads', 'Glutes'], tips: 'Drive off the elevated foot.', description: 'Unilateral quad overload.', videoUrl: '8q9LVgN2RD4' },
  { name: 'Split Squat Jumps', muscles: ['Quads', 'Cardio'], tips: 'Explode and switch legs in air.', description: 'Plyometric leg power.', videoUrl: 'EY3bzgv2SYo' },
  { name: 'Pistol Squats', muscles: ['Quads', 'Balance'], tips: 'Extend one leg straight out.', description: 'Elite bodyweight leg strength.', videoUrl: 'bH3mRwnAN88' },
  { name: 'Nordic Hamstring Curls', muscles: ['Hamstrings'], tips: 'Control descent as much as possible.', description: 'Incredible eccentric hamstring strength.', videoUrl: 'GzxNzNRy9T0' },
  { name: 'Glute Ham Raise', muscles: ['Hamstrings', 'Glutes'], tips: 'Squeeze glutes to pull body up.', description: 'Posterior chain mastery.', videoUrl: 'gK5MIYPDfoQ' },
  { name: 'Reverse Lunges', muscles: ['Quads', 'Glutes'], tips: 'Step back, keep front shin vertical.', description: 'Safer on the knees than forward lunges.', videoUrl: '38xlLGfguz4' },
  { name: 'Curtsy Lunges', muscles: ['Gluteus Medius'], tips: 'Step diagonally behind.', description: 'Targets the outer glute specifically.', videoUrl: 'WAW-2ehQ1GM' },
  { name: 'Donkey Calf Raises', muscles: ['Gastrocnemius'], tips: 'Hinge over, raise heels.', description: 'Hits the calves from a stretched ham position.', videoUrl: '8ddEGLIhcPQ' },
  { name: 'Single Leg Calf Raises', muscles: ['Calves'], tips: 'Hold onto a wall for balance.', description: 'Fixes unilateral calf imbalances.', videoUrl: 'E1mG5L9rpFc' },
  { name: 'Seated Tibialis Raises', muscles: ['Tibialis Anterior'], tips: 'Pull toes straight up to ceiling.', description: 'Develops the front of the shin.', videoUrl: '-rP_9ZVBf9M' },
  { name: 'Jump Rope', muscles: ['Calves', 'Cardio'], tips: 'Stay light on the balls of your feet.', description: 'Spring-loaded calf conditioning.', videoUrl: 'Gt9hlRMXDXc' },

  // CORE, CONDITIONING, & MOBILITY 
  { name: 'Plank', muscles: ['Core', 'Transverse Abdominis'], tips: 'Hollow body, straight line.', description: 'Static deep core strength.', videoUrl: 'v25dawSzRTM' },
  { name: 'Russian Twists', muscles: ['Obliques'], tips: 'Rotate your chest, not just arms.', description: 'Rotational core power.', videoUrl: 'C3RauLi8FNw' },
  { name: 'Mountain Climbers', muscles: ['Core', 'Cardio'], tips: 'Keep hips low.', description: 'High intensity conditioning.', videoUrl: 'hZb6jTbCLeE' },
  { name: 'Hanging Leg Raises', muscles: ['Lower Abs'], tips: 'No swinging, strict pull.', description: 'Ultimate lower ab development.', videoUrl: '2n4UqRIJyk4' },
  { name: 'Dragon Flags', muscles: ['Core'], tips: 'Only shoulders touch bench.', description: 'Bruce Lee’s extreme core move.', videoUrl: 'yFiNw9EsJfI' },
  { name: 'Ab Wheel Rollout', muscles: ['Core'], tips: 'Do not arch lower back.', description: 'Incredible anti-extension core drill.', videoUrl: 'MinlHnG7j4k' },
  { name: 'V-Ups', muscles: ['Abs'], tips: 'Touch toes at the apex.', description: 'Explosive core flexion.', videoUrl: 'BNIPC_HaXWQ' },
  { name: 'Bicycle Crunches', muscles: ['Obliques', 'Abs'], tips: 'Elbow to opposite knee rapidly.', description: 'Dynamic full ab targeting.', videoUrl: 'NWzlS1Lp1e8' },
  { name: 'Kettlebell Swings', muscles: ['Glutes', 'Core', 'Cardio'], tips: 'Pop the hips, don’t raise arms.', description: 'Explosive HIIT standard.', videoUrl: 'n1df4ASFeZU' },
  { name: 'Burpees', muscles: ['Full Body', 'Cardio'], tips: 'Chest to floor.', description: 'Maximum effort conditioning.', videoUrl: 'zYBkodZ1SRU' },
  { name: 'L-Sit', muscles: ['Core', 'Hip Flexors'], tips: 'Keep legs locked straight out.', description: 'Gymnastic static strength.', videoUrl: 'XN7qnqooLC8' },
  { name: 'Hollow Body Hold', muscles: ['Core'], tips: 'Press low back entirely into floor.', description: 'Essential core bracing movement.', videoUrl: 'Xk-JcNj6lfY' },
  { name: 'Suitcase Carries', muscles: ['Obliques', 'Grip'], tips: 'Hold one heavy dumbbell, walk straight.', description: 'Dynamic anti-lateral flexion.', videoUrl: 'v8O0kNuvp_k' },
  { name: 'Farmers Walk', muscles: ['Grip', 'Traps', 'Core'], tips: 'Shoulders back, chest up.', description: 'Raw whole-body work capacity.', videoUrl: '1uOs1hP3u4A' },
  { name: 'Pallof Press', muscles: ['Obliques'], tips: 'Press cable straight out from chest.', description: 'Anti-rotation core stability.', videoUrl: '5aZ0IhJS8O8' },
  { name: 'Cable Woodchoppers', muscles: ['Obliques'], tips: 'Rotate through the hips.', description: 'Explosive rotational power.', videoUrl: 'YIU0U_B57rU' },
  { name: 'Dead Bug', muscles: ['Core'], tips: 'Opposite arm and leg extend slowly.', description: 'Perfect core coordination.', videoUrl: '-8xqJ2xXs2A' },
  { name: 'Bird Dog', muscles: ['Spinal Erectors'], tips: 'Maintain a perfectly flat back.', description: 'Essential spine stabilization.', videoUrl: '_1j_HWknGLg' },
  { name: 'Side Plank', muscles: ['Obliques'], tips: 'Do not let hips sag.', description: 'Lateral core endurance.', videoUrl: 'sKMD_pbNm7w' },
  { name: 'Reverse Crunches', muscles: ['Lower Abs'], tips: 'Roll pelvis off the floor.', description: 'Targets the difficult lower abs.', videoUrl: '8E4nGnNKLgI' },
  { name: 'Flutter Kicks', muscles: ['Lower Abs', 'Hip Flexors'], tips: 'Keep legs hovering just over floor.', description: 'Continuous tension on lower core.', videoUrl: 'tPmybsDX8ZY' },
  { name: 'Cat Cow', muscles: ['Spine Mobility'], tips: 'Breathe smoothly with the arch.', description: 'Great warm-up for deadlifts.', videoUrl: 'FyCuSE3mDcc' },
  { name: 'Thread the Needle', muscles: ['Thoracic Spine'], tips: 'Reach as far through as possible.', description: 'Increases thoracic rotation.', videoUrl: 'gyew25Vaqj8' },
  { name: '90/90 Stretch', muscles: ['Hip Mobility'], tips: 'Keep chest tall, fold over front leg.', description: 'Crucial for squat depth mechanics.', videoUrl: 'FM7-7-a0FLg' },
  { name: 'Couch Stretch', muscles: ['Quads', 'Hip Flexors'], tips: 'Squeeze glute of the knee on floor.', description: 'Reverses the effects of sitting.', videoUrl: 'TIJu5aWPke0' },
  { name: 'Worlds Greatest Stretch', muscles: ['Full Body Mobility'], tips: 'Open chest to the ceiling.', description: 'Hits hips, t-spine, and ankles.', videoUrl: '7XheaZERvBQ' },
  { name: 'Jumping Jacks', muscles: ['Cardio'], tips: 'Keep a fast rhythm.', description: 'Classic total body warm up.', videoUrl: '7Pxr4xOrhNk' },
  { name: 'Jump Squats', muscles: ['Quads', 'Plyos'], tips: 'Absorb the landing softly.', description: 'Lower body explosive power.', videoUrl: 'eFEVKmp3M4g' }
];

const getLibExercise = (name: string, defaultReps: string): Exercise => {
  const lib = EXERCISE_LIBRARY.find(e => e.name === name) || EXERCISE_LIBRARY[0];
  return createExercise(lib.name, defaultReps, lib.muscles, lib.tips, lib.description, lib.videoUrl, lib.imageUrl);
}

// Split Data
export const SPLIT_OPTIONS = [
  { id: 'full-body', name: 'Full Body', stars: '⭐⭐⭐⭐', level: 'Beginners', desc: 'Focuses on working the entire body in single sessions, great for maximizing frequency.' },
  { id: 'ppl', name: 'PPL', stars: '⭐⭐⭐⭐⭐', level: 'All levels', desc: 'Highly effective 3-6 day split categorizing muscles by their pushing or pulling function.' },
  { id: 'upper-lower', name: 'Upper/Lower', stars: '⭐⭐⭐⭐', level: 'Intermediate', desc: 'Divides training days into upper body and lower body focused sessions.' },
  { id: 'bro-split', name: 'Bro Split', stars: '⭐⭐', level: 'Advanced only', desc: 'Isolates one major muscle group per day. High volume, lower frequency.' },
  { id: 'arnold', name: 'Arnold Split', stars: '⭐⭐⭐', level: 'Advanced', desc: 'Chest/Back, Shoulders/Arms, Legs. High intensity and frequency.' },
  { id: 'phul', name: 'PHUL', stars: '⭐⭐⭐⭐', level: 'Strength + size', desc: 'Power Hypertrophy Upper Lower. Blends powerlifting and bodybuilding.' },
  { id: 'phat', name: 'PHAT', stars: '⭐⭐⭐⭐⭐', level: 'Advanced', desc: 'Power Hypertrophy Adaptive Training. Extremely intense 5-day routine.' },
  { id: 'push-pull', name: 'Push/Pull', stars: '⭐⭐⭐⭐', level: 'Intermediate', desc: 'Alternates between pushing and pulling workouts to maximize active recovery.' },
];

const generateSplitRoutine = (splitId: string, frequency: number): DailyWorkout[] => {
  const restAbsolute = { title: 'Absolute Rest', duration: 0, kcal: 0, isRest: true, exercises: [], tip: 'Focus on sleep, nutrition, and deep tissue recovery today. Drink 3L of water.' };
  const restActive = { title: 'Active Recovery', duration: 30, kcal: 180, isRest: true, exercises: [createExercise('Light Jog', '15 mins', ['Cardiovascular'], 'Maintain conversational pace.')], tip: 'Keep heart rate in Zone 1/2.' };

  const pushEx = [getLibExercise('Barbell Bench Press', '4x8'), getLibExercise('Standing Overhead Press', '3x10'), getLibExercise('Weighted Dips', '3x12'), getLibExercise('Dumbbell Lateral Raises', '4x15'), getLibExercise('Tricep Pushdowns', '3x12')];
  const pullEx = [getLibExercise('Barbell Deadlift', '3x5'), getLibExercise('Barbell Row', '4x8'), getLibExercise('Pull-up', '3x10'), getLibExercise('Face Pulls', '3x15'), getLibExercise('Barbell Bicep Curls', '4x12')];
  const legsEx = [getLibExercise('Barbell Back Squat', '4x6'), getLibExercise('Romanian Deadlift (RDL)', '3x10'), getLibExercise('Leg Press', '3x12'), getLibExercise('Calf Raises (Standing)', '4x15'), getLibExercise('Hamstring Curl (Seated)', '3x15')];
  
  const upperEx = [getLibExercise('Barbell Bench Press', '4x8'), getLibExercise('Barbell Row', '4x8'), getLibExercise('Standing Overhead Press', '3x10'), getLibExercise('Lat Pulldown', '3x10'), getLibExercise('Skull Crushers', '3x12')];
  const lowerEx = [...legsEx.slice(0,4), getLibExercise('Hip Thrust', '3x10')];

  let rawDays: Omit<DailyWorkout, 'dayStr'>[] = [];

  switch(splitId) {
    case 'ppl':
      rawDays = [
        { title: 'Push Hypertrophy', duration: 60, kcal: 500, exercises: pushEx },
        { title: 'Pull Hypertrophy', duration: 60, kcal: 500, exercises: pullEx },
        { title: 'Legs & Core', duration: 70, kcal: 600, exercises: legsEx },
        { title: 'Push Power', duration: 65, kcal: 550, exercises: [getLibExercise('Barbell Bench Press', '5x5'), getLibExercise('Standing Overhead Press', '5x5'), getLibExercise('Incline Dumbbell Press', '3x8')] },
        { title: 'Pull Power', duration: 60, kcal: 520, exercises: [getLibExercise('Barbell Row', '5x5'), getLibExercise('Pull-up', '3x8'), getLibExercise('T-Bar Row', '3x8')] },
        { title: 'Legs Power', duration: 70, kcal: 600, exercises: [getLibExercise('Barbell Back Squat', '5x5'), getLibExercise('Romanian Deadlift (RDL)', '3x8')] }
      ];
      break;
    case 'upper-lower':
    case 'phul':
    case 'push-pull':
      rawDays = [
        { title: 'Upper Body Power', duration: 70, kcal: 550, exercises: upperEx },
        { title: 'Lower Body Power', duration: 70, kcal: 600, exercises: lowerEx },
        { title: 'Upper Body Hypertrophy', duration: 70, kcal: 550, exercises: upperEx },
        { title: 'Lower Body Hypertrophy', duration: 70, kcal: 600, exercises: lowerEx }
      ];
      break;
    case 'arnold':
      rawDays = [
        { title: 'Chest & Back', duration: 75, kcal: 600, exercises: [getLibExercise('Barbell Bench Press', '4x8'), getLibExercise('Barbell Row', '4x8'), getLibExercise('Incline Dumbbell Press', '3x10'), getLibExercise('Lat Pulldown', '3x10')] },
        { title: 'Shoulders & Arms', duration: 60, kcal: 450, exercises: [getLibExercise('Standing Overhead Press', '4x8'), getLibExercise('Dumbbell Lateral Raises', '4x15'), getLibExercise('Barbell Bicep Curls', '4x12'), getLibExercise('Tricep Pushdowns', '4x12')] },
        { title: 'Legs & Lower Back', duration: 70, kcal: 600, exercises: legsEx },
        { title: 'Chest & Back Pump', duration: 70, kcal: 550, exercises: [getLibExercise('Incline Dumbbell Press', '4x8'), getLibExercise('Lat Pulldown', '4x10'), getLibExercise('Cable Crossovers', '3x15')] },
        { title: 'Shoulders & Arms Pump', duration: 60, kcal: 450, exercises: [getLibExercise('Dumbbell Lateral Raises', '4x15'), getLibExercise('Hammer Curls', '3x12'), getLibExercise('Skull Crushers', '3x12')] },
        { title: 'Legs Pump', duration: 60, kcal: 500, exercises: lowerEx }
      ];
      break;
    case 'bro-split':
      rawDays = [
        { title: 'Chest Day', duration: 60, kcal: 450, exercises: [getLibExercise('Barbell Bench Press', '4x8'), getLibExercise('Incline Dumbbell Press', '4x10'), getLibExercise('Cable Crossovers', '4x12'), getLibExercise('Weighted Dips', '3x12')] },
        { title: 'Back Day', duration: 60, kcal: 480, exercises: [getLibExercise('Barbell Deadlift', '3x5'), getLibExercise('Barbell Row', '4x8'), getLibExercise('Lat Pulldown', '4x10'), getLibExercise('Seated Cable Row', '3x12')] },
        { title: 'Leg Day', duration: 70, kcal: 600, exercises: legsEx },
        { title: 'Shoulder Day', duration: 55, kcal: 400, exercises: [getLibExercise('Standing Overhead Press', '4x8'), getLibExercise('Dumbbell Lateral Raises', '4x15'), getLibExercise('Face Pulls', '4x15'), getLibExercise('Dumbbell Shrugs', '3x15')] },
        { title: 'Arm Day', duration: 50, kcal: 350, exercises: [getLibExercise('Barbell Bicep Curls', '4x10'), getLibExercise('Tricep Pushdowns', '4x10'), getLibExercise('Hammer Curls', '3x12'), getLibExercise('Skull Crushers', '3x12')] }
      ];
      break;
    case 'full-body':
    default: {
      const fullEx = [getLibExercise('Barbell Back Squat', '3x8'), getLibExercise('Barbell Bench Press', '3x8'), getLibExercise('Barbell Row', '3x8'), getLibExercise('Standing Overhead Press', '3x10')];
      rawDays = [
        { title: 'Full Body A', duration: 60, kcal: 500, exercises: fullEx },
        { title: 'Full Body B', duration: 60, kcal: 500, exercises: fullEx },
        { title: 'Full Body C', duration: 60, kcal: 500, exercises: fullEx },
        { title: 'Full Body D', duration: 60, kcal: 500, exercises: fullEx },
        { title: 'Full Body E', duration: 60, kcal: 500, exercises: fullEx }
      ];
      break;
    }
  }

  // Expand with Detailed Descriptions dynamically
  const enrichWorkout = (wk: Omit<DailyWorkout, 'dayStr'>) => {
    let target = ['Full Body'];
    let desc = 'Complete holistic training combining movements for maximum output.';
    let warm = 'REQUIRED WARMUP: 5 min jump rope, broad dynamic stretching.';
    const t = wk.title.toLowerCase();
    
    if (t.includes('push')) { target = ['Pectorals', 'Deltoids', 'Triceps']; desc = 'Focus on pressing mechanics and anterior chain hypertrophy. Maintain form over load.'; warm = 'REQUIRED WARMUP: 5 mins light cardio. 2x20 arm circles. 1x15 empty bar bench press.'; }
    else if (t.includes('pull') || t.includes('back')) { target = ['Lats', 'Rhomboids', 'Biceps']; desc = 'Vertical and horizontal pulls to thicken the posterior chain. Squeeze the scapula.'; warm = 'REQUIRED WARMUP: 5 mins rowing. Deadhangs for 30s. 2x15 band pull-aparts.'; }
    else if (t.includes('leg') || t.includes('lower')) { target = ['Quadriceps', 'Hamstrings', 'Glutes']; desc = 'Heavy lower body foundational movements for power and sheer size.'; warm = 'REQUIRED WARMUP: 5 mins stationary bike. Couch stretch 60s/leg. 2x15 bodyweight squats.'; }
    else if (t.includes('upper') || t.includes('chest') || t.includes('shoulder')) { target = ['Upper Body Compound']; desc = 'Intensive upper body recruitment prioritizing pressing and pulling compounds.'; warm = 'REQUIRED WARMUP: 5 mins light row. Rotator cuff external rotations 2x15.'; }
    
    return { ...wk, description: desc, targetMuscles: target, warmupInfo: warm };
  };
  const enrichedDays = rawDays.map(enrichWorkout);

  // Compile final array based on frequency limit
  const finalWeek: DailyWorkout[] = [];
  let dayCount = 1;
  const activeSet = Math.min(frequency, enrichedDays.length);

  for (let i = 0; i < 7; i++) {
    if (i < activeSet) {
      finalWeek.push({ dayStr: `Day 0${dayCount}`, ...enrichedDays[i] });
    } else {
      finalWeek.push({ dayStr: `Day 0${dayCount}`, ...(i % 2 === 0 ? restAbsolute : restActive) });
    }
    dayCount++;
  }

  if (frequency === 3 && finalWeek.length === 7) {
     [finalWeek[1], finalWeek[3]] = [finalWeek[3], finalWeek[1]];
  } else if (frequency === 4 && finalWeek.length === 7) {
     [finalWeek[2], finalWeek[4]] = [finalWeek[4], finalWeek[2]]; 
  }

  return finalWeek.map((wk, idx) => ({ ...wk, dayStr: `Day 0${idx + 1}` }));
};


export default function WorkoutPlanner() {
  const { profile, logActivity, strengthHistory, logStrength } = useFitnessContext();

  // Helper to get last session's sets for an exercise (excluding today's date)
  const getLastSessionSets = (exerciseName: string) => {
    const todayStr = new Date().toISOString().split('T')[0];
    const exerciseHistory = strengthHistory.filter(
      s => s.exercise.toLowerCase() === exerciseName.toLowerCase() && s.date !== todayStr
    );
    if (exerciseHistory.length === 0) return [];
    
    // Find the most recent date in the history (which is sorted latest first)
    const lastDate = exerciseHistory[0].date;
    return [...exerciseHistory]
      .filter(s => s.date === lastDate)
      .reverse(); // reverse to maintain original chronological set order
  };

  const formatLastSession = (exName: string) => {
    const lastSets = getLastSessionSets(exName);
    if (lastSets.length === 0) return null;
    
    const setsStr = lastSets.map(s => `${s.weight} lbs x ${s.reps}${s.rpe ? ` @RPE${s.rpe}` : ''}`).join(', ');
    return `Last: ${setsStr}`;
  };
  
  const [customLib, setCustomLib] = useState<Omit<Exercise, 'id' | 'reps'>[]>(() => {
    const saved = storage.get<Omit<Exercise, 'id' | 'reps'>[]>('kinetic_custom_library');
    return saved || [];
  });

  // Map database elements to ensure imageUrl resolution runs on startup
  const fullLibrary = [...EXERCISE_LIBRARY, ...customLib].map(ex => {
    const validVid = resolveValidVideo(ex.videoUrl);
    return {
      ...ex,
      videoUrl: validVid,
      imageUrl: ex.imageUrl || (validVid ? `https://img.youtube.com/vi/${validVid}/hqdefault.jpg` : '/ai_gym_placeholder.png')
    }
  });

  const [workouts, setWorkouts] = useState<DailyWorkout[]>(() => {
    const saved = storage.get<DailyWorkout[]>('kinetic_custom_workouts');
    return saved && saved.length > 0 ? saved : [];
  });
  
  const [mode, setMode] = useState<string>('planner');
  
  // Wizard State
  const [wizardStep, setWizardStep] = useState(1);
  const [tempWizard, setTempWizard] = useState({
    experience: 'Beginner',
    lifestyle: 'Active',
    gymAccess: 'Full Gym',
    frequency: 4,
    splitId: 'ppl'
  });

  const { startSession, sessions, deleteSession, templates, duplicateTemplate, deleteTemplate } = useWorkoutBuilder();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // Tab State: 'plan' | 'history' | 'templates'
  const [workoutTab, setWorkoutTab] = useState<'plan' | 'history' | 'templates'>(() => {
    const t = searchParams.get('tab');
    if (t === 'history' || t === 'past') return 'history';
    if (t === 'templates') return 'templates';
    return 'plan';
  });

  const handleTabChange = (tab: 'plan' | 'history' | 'templates') => {
    setWorkoutTab(tab);
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      if (tab === 'plan') {
        next.delete('tab');
      } else {
        next.set('tab', tab);
      }
      return next;
    });
  };

  // History State
  const [historyCurrentMonth, setHistoryCurrentMonth] = useState(new Date());
  const [historySelectedDate, setHistorySelectedDate] = useState<string | null>(null);
  const [historyDetailId, setHistoryDetailId] = useState<string | null>(null);
  const [historyDeleteTarget, setHistoryDeleteTarget] = useState<string | null>(null);
  const [templateDeleteTarget, setTemplateDeleteTarget] = useState<string | null>(null);
  const [historySearchQuery, setHistorySearchQuery] = useState('');
  const [showLogPastModal, setShowLogPastModal] = useState(false);
  const [quickStartModalOpen, setQuickStartModalOpen] = useState(() => {
    return searchParams.get('quick') === 'true' || searchParams.get('tab') === 'quick';
  });
  const [quickStartDefaultFocus, setQuickStartDefaultFocus] = useState<string>(() => {
    return searchParams.get('focus') || 'legs';
  });

  useEffect(() => {
    if (searchParams.get('quick') === 'true' || searchParams.get('tab') === 'quick') {
      const focus = searchParams.get('focus');
      if (focus) setQuickStartDefaultFocus(focus);
      setQuickStartModalOpen(true);
    }
  }, [searchParams]);

  // Filtered History
  const filteredHistorySessions = useMemo(() => {
    return sessions.filter(s => {
      if (historySelectedDate && !s.startedAt.startsWith(historySelectedDate)) return false;
      if (historySearchQuery.trim()) {
        const q = historySearchQuery.toLowerCase().trim();
        const nameMatch = s.templateName.toLowerCase().includes(q);
        const exMatch = s.exercises.some(e => e.exerciseName.toLowerCase().includes(q));
        if (!nameMatch && !exMatch) return false;
      }
      return true;
    });
  }, [sessions, historySelectedDate, historySearchQuery]);

  const historyStats = useMemo(() => {
    const totalVol = sessions.reduce((acc, s) => acc + s.totalVolume, 0);
    const totalSecs = sessions.reduce((acc, s) => acc + s.duration, 0);
    const totalPRs = sessions.reduce((acc, s) => acc + s.prsHit.length, 0);
    return {
      totalSessions: sessions.length,
      totalVolume: totalVol,
      totalHours: (totalSecs / 3600).toFixed(1),
      totalPRs,
    };
  }, [sessions]);

  const historyDetailSession = useMemo(() => {
    return historyDetailId ? sessions.find(s => s.id === historyDetailId) || null : null;
  }, [sessions, historyDetailId]);

  const handleStartFreestyle = (customName?: string) => {
    startSession(undefined, customName || 'Freestyle Workout');
    navigate('/workout/active');
  };

  const handleOpenQuickStart = (focusId?: string) => {
    if (focusId) setQuickStartDefaultFocus(focusId);
    setQuickStartModalOpen(true);
  };

  const handleInstantStartSplit = (presetId: string) => {
    const preset = QUICK_SPLIT_PRESETS.find(p => p.id === presetId);
    if (preset) {
      const template = buildQuickTemplate(preset);
      startSession(template, template.name);
      navigate('/workout/active');
    } else {
      handleStartFreestyle();
    }
  };

  const handleRepeatSession = (session: WorkoutSession) => {
    const template: WorkoutTemplate = {
      id: crypto.randomUUID(),
      name: session.templateName,
      description: `Repeat of session from ${new Date(session.startedAt).toLocaleDateString()}`,
      type: session.type,
      targetMuscles: session.musclesWorked,
      exercises: session.exercises.map(ex => ({
        exerciseId: ex.exerciseId,
        exerciseName: ex.exerciseName,
        exerciseType: ex.exerciseType || 'weight_reps',
        thumbnailEmoji: ex.thumbnailEmoji,
        primaryMuscles: ex.primaryMuscles,
        sets: ex.sets.map(s => ({
          targetReps: s.reps || 10,
          targetWeight: s.weight || 0,
          setType: s.setType || 'normal',
        })),
        restSeconds: ex.restSeconds || 90,
        notes: ex.notes || '',
        gifUrl: ex.gifUrl,
        imageUrl: ex.imageUrl,
      })),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    startSession(template);
    navigate('/workout/active');
  };

  const handleConfirmDeleteHistory = async () => {
    if (historyDeleteTarget) {
      await deleteSession(historyDeleteTarget);
      if (historyDetailId === historyDeleteTarget) setHistoryDetailId(null);
      setHistoryDeleteTarget(null);
    }
  };

  // Flow State
  const [activeDay, setActiveDay] = useState(() => {
    const jsDay = new Date().getDay(); // 0=Sun ... 6=Sat
    return jsDay === 0 ? 6 : jsDay - 1; // Convert to Mon=0 ... Sun=6
  });
  const [elapsed, setElapsed] = useState(0);
  const [liveSetsData, setLiveSetsData] = useState<Record<number, LiveSet[]>>({});
  const [restTimer, setRestTimer] = useState<number | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  // Auto-decrement rest timer
  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | undefined;
    if (restTimer !== null && restTimer > 0) {
      interval = setInterval(() => setRestTimer(prev => (prev !== null ? prev - 1 : null)), 1000);
    } else if (restTimer === 0) {
      setRestTimer(null);
    }
    return () => clearInterval(interval);
  }, [restTimer]);

  // Targets
  const [analyzingExercise, setAnalyzingExercise] = useState<Exercise | null>(null);
  const [editingWorkout, setEditingWorkout] = useState<DailyWorkout | null>(null);
  const [editingWorkoutIdx, setEditingWorkoutIdx] = useState<number>(0);
  
  // Search
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [customFormState, setCustomFormState] = useState(false);
  const [customEx, setCustomEx] = useState({ name: '', reps: '3x10', muscles: 'Full Body' });
  const [workoutDeleteTarget, setWorkoutDeleteTarget] = useState<number | null>(null);

  const activeWorkout = workouts[activeDay] || workouts[0];

  // --- Day-of-week mapping for "Today's Workout" ---
  const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const DAY_LABELS_FULL = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const todayJsDay = new Date().getDay(); // 0=Sun ... 6=Sat
  const todayIdx = todayJsDay === 0 ? 6 : todayJsDay - 1; // Convert to Mon=0 ... Sun=6

  const selectedDay = activeDay >= 0 && activeDay < workouts.length ? activeDay : Math.min(todayIdx, workouts.length - 1);
  const todayWorkout = workouts[selectedDay];
  const isRestDay = todayWorkout?.isRest;
  const exerciseCount = todayWorkout?.exercises?.length || 0;

  // Collect ALL muscles from all exercises for the heatmap
  const allWorkoutMuscles = useMemo(() => {
    if (!todayWorkout || todayWorkout.isRest) return [];
    const muscleSet = new Set<string>();
    todayWorkout.exercises.forEach(ex => {
      ex.muscles.forEach(m => muscleSet.add(m));
    });
    (todayWorkout.targetMuscles || []).forEach(m => muscleSet.add(m));
    return Array.from(muscleSet);
  }, [todayWorkout]);

  // Track which exercise is expanded in the list
  const [expandedExIdx, setExpandedExIdx] = useState<number | null>(null);

  useEffect(() => {
    storage.set('kinetic_custom_workouts', workouts);
  }, [workouts]);

  useEffect(() => {
    storage.set('kinetic_custom_library', customLib);
  }, [customLib]);

  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | undefined;
    if (mode === 'active') {
      timer = setInterval(() => setElapsed(e => e + 1), 1000);
    }
    return () => clearInterval(timer);
  }, [mode]);

  // --- ACTIONS ---

  const handleAIWizardComplete = async () => {
    setIsGenerating(true);
    try {
      const userCtx: UserContext = {
        name: profile.name,
        age: profile.age || 28,
        gender: profile.gender || 'Male',
        weight: profile.weight,
        height: profile.height || 72,
        goal: profile.goal,
        dailyCalorieGoal: profile.dailyCalorieGoal,
      };

      const splitName = SPLIT_OPTIONS.find(s => s.id === tempWizard.splitId)?.name || tempWizard.splitId;
      const prompt = `Create a ${tempWizard.frequency}-day per week workout plan using a ${splitName} split.
User profile: ${tempWizard.experience} level, ${tempWizard.lifestyle} lifestyle, has ${tempWizard.gymAccess}.
Goal: ${profile.goal}.

Return ONLY a valid JSON array (no markdown, no code fences) with this exact structure:
[
  {
    "dayStr": "Day 01",
    "title": "Push Hypertrophy",
    "duration": 60,
    "kcal": 500,
    "isRest": false,
    "description": "Focus on chest, shoulders, and triceps.",
    "targetMuscles": ["Chest", "Shoulders", "Triceps"],
    "warmupInfo": "5 min cardio, arm circles, empty bar press.",
    "exercises": [
      { "name": "Barbell Bench Press", "reps": "4x8", "muscles": ["Chest"], "tips": "Retract scapula.", "description": "Primary chest compound." }
    ]
  }
]

Rules:
- Include exactly 7 days (fill remaining days with rest days where isRest=true and exercises=[]).
- Each workout day should have 4-6 exercises.
- Each exercise needs: name, reps (like "4x8"), muscles array, tips string, description string.
- Use common exercise names.
- Make rest days have title "Rest Day" or "Active Recovery".
- Only return raw JSON, nothing else.`;

      const response = await quickPrompt(prompt, userCtx);
      
      // Parse the JSON response
      let cleanJson = response.trim();
      // Remove markdown code fences if present
      if (cleanJson.startsWith('```')) {
        cleanJson = cleanJson.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
      }
      
      const aiPlan = JSON.parse(cleanJson) as AIPlanDay[];
      
      // Convert to our DailyWorkout format
      const converted: DailyWorkout[] = aiPlan.map((day, index) => ({
        dayStr: day.dayStr || `Day 0${index + 1}`,
        title: day.title || 'Workout',
        duration: day.duration || 60,
        kcal: day.kcal || 400,
        isRest: day.isRest || false,
        description: day.description || '',
        targetMuscles: day.targetMuscles || ['Full Body'],
        warmupInfo: day.warmupInfo || '5 min light cardio, dynamic stretching.',
        exercises: (day.exercises || []).map((ex) => createExercise(
          ex.name || 'Exercise',
          ex.reps || '3x10',
          ex.muscles || ['Full Body'],
          ex.tips || '',
          ex.description || '',
          // Try to find video from our library
          EXERCISE_LIBRARY.find(l => l.name.toLowerCase() === (ex.name || '').toLowerCase())?.videoUrl || ''
        )),
      }));
      
      setWorkouts(converted);
    } catch (error) {
      console.error('AI plan generation failed, using local fallback:', error);
      // Fallback to local generation
      setWorkouts(generateSplitRoutine(tempWizard.splitId, tempWizard.frequency));
    } finally {
      setIsGenerating(false);
      setMode('planner');
      setWizardStep(1);
    }
  };

  const startBlankCanvas = () => {
    setWorkouts([]); 
    setMode('planner'); 
  };

  const addNewDay = () => {
    const newDay: DailyWorkout = {
      dayStr: `Day 0${workouts.length + 1} • Custom`,
      title: 'New Workout',
      duration: 45,
      kcal: 300,
      exercises: [],
      isRest: false
    };
    const next = [...workouts, newDay];
    setWorkouts(next);
    setEditingWorkout(newDay);
    setEditingWorkoutIdx(next.length - 1);
    setIsSearchOpen(true);
    setMode('edit');
  };

  const deleteWorkout = (e: React.MouseEvent, idx: number) => {
    e.stopPropagation();
    setWorkoutDeleteTarget(idx);
  };

  const confirmDeleteWorkout = () => {
    if (workoutDeleteTarget !== null) {
      const next = workouts.filter((_, i) => i !== workoutDeleteTarget);
      setWorkouts(next);
      if (next.length === 0) setMode('gateway');
      if (activeDay >= next.length) setActiveDay(Math.max(0, next.length - 1));
      setWorkoutDeleteTarget(null);
    }
  };

  const duplicateWorkout = (e: React.MouseEvent, idx: number) => {
    e.stopPropagation();
    const target = workouts[idx];
    const clone: DailyWorkout = { ...target, dayStr: `Copy of ${target.dayStr}`, exercises: target.exercises.map(ex => ({ ...ex, id: crypto.randomUUID() })) };
    const next = [...workouts];
    next.splice(idx + 1, 0, clone);
    setWorkouts(next);
    setActiveDay(idx + 1);
  };

  const saveEditedWorkout = () => {
    if (!editingWorkout) return;
    const newArr = [...workouts];
    newArr[editingWorkoutIdx] = editingWorkout;
    setWorkouts(newArr);
    setMode('planner');
    setEditingWorkout(null);
  };

  const moveExercise = (idx: number, direction: 'up' | 'down') => {
    if (!editingWorkout) return;
    const exs = [...editingWorkout.exercises];
    if (direction === 'up' && idx > 0) {
      [exs[idx - 1], exs[idx]] = [exs[idx], exs[idx - 1]];
    } else if (direction === 'down' && idx < exs.length - 1) {
      [exs[idx + 1], exs[idx]] = [exs[idx], exs[idx + 1]];
    }
    setEditingWorkout({ ...editingWorkout, exercises: exs });
  };

  const removeExerciseFromEdit = (idx: number) => {
    if (!editingWorkout) return;
    const updatedExs = editingWorkout.exercises.filter((_, i) => i !== idx);
    setEditingWorkout({ ...editingWorkout, exercises: updatedExs });
  };

  const handleEditExerciseChange = (idx: number, field: keyof Exercise, value: string) => {
    if (!editingWorkout) return;
    const updatedExs = [...editingWorkout.exercises];
    updatedExs[idx] = { ...updatedExs[idx], [field]: value };
    setEditingWorkout({ ...editingWorkout, exercises: updatedExs });
  };

  const addExerciseFromLibrary = (libEx: Omit<Exercise, 'id' | 'reps'>) => {
    if (!editingWorkout) return;
    const newEx = createExercise(libEx.name, '3x10', libEx.muscles, libEx.tips, libEx.description, libEx.videoUrl, libEx.imageUrl);
    setEditingWorkout({ ...editingWorkout, exercises: [...editingWorkout.exercises, newEx] });
    setIsSearchOpen(false);
    setSearchQuery('');
  };

  const createAndAddCustomExercise = () => {
    if (!editingWorkout || !customEx.name) return;
    const newLibEntry = {
       name: customEx.name,
       muscles: customEx.muscles.split(',').map(m => m.trim()),
       tips: 'Custom exercise logic.',
       description: 'User created movement.',
       imageUrl: '/ai_gym_placeholder.png'
    };
    
    setCustomLib(prev => [...prev, newLibEntry]);
    const newEx = createExercise(newLibEntry.name, customEx.reps, newLibEntry.muscles, newLibEntry.tips, newLibEntry.description, '', newLibEntry.imageUrl);
    setEditingWorkout({ ...editingWorkout, exercises: [...editingWorkout.exercises, newEx] });
    setCustomFormState(false);
    setCustomEx({ name: '', reps: '3x10', muscles: 'Full Body' });
    setIsSearchOpen(false);
  };

  const triggerSummary = () => {
    setMode('summary');
  };

  const finishWorkout = () => {
    logActivity({ type: 'Workout', value: Math.max(1, Math.round(elapsed / 60)), caloriesBurned: activeWorkout.kcal });
    
    // Log individual completed strength sets to strengthHistory
    if (activeWorkout && !activeWorkout.isRest) {
      activeWorkout.exercises.forEach((ex, i) => {
        const sets = liveSetsData[i] || [];
        sets.forEach(set => {
          if (set.completed && set.weight && set.reps) {
            logStrength(
              ex.name,
              parseFloat(set.weight) || 0,
              parseInt(set.reps) || 0,
              set.rpe || undefined,
              set.setType || undefined
            );
          }
        });
      });
    }

    setMode('planner');
    setElapsed(0);
    setLiveSetsData({});
  };

  const startWorkoutSession = () => {
    const wk = workouts[selectedDay] || workouts[activeDay];
    if (!wk || wk.isRest) return;

    const template: WorkoutTemplate = {
      id: wk.id || crypto.randomUUID(),
      name: wk.title,
      description: wk.description || '',
      type: 'strength',
      targetMuscles: (wk.targetMuscles || []) as MuscleGroup[],
      exercises: wk.exercises.map((ex, i) => {
        const match = ex.reps.match(/^(\d+)\s*?[xX]\s*?(\d+)?/);
        const numSets = match ? parseInt(match[1]) : 3;
        const targetReps = match && match[2] ? parseInt(match[2]) : 10;
        return {
          exerciseId: `ex_${i}_${ex.name.toLowerCase().replace(/\s+/g, '_')}`,
          exerciseName: ex.name,
          exerciseType: 'weight_reps',
          primaryMuscles: (ex.muscles || wk.targetMuscles || []) as MuscleGroup[],
          sets: Array.from({ length: numSets }).map(() => ({
            targetReps,
            setType: 'normal' as const,
          })),
          restSeconds: 90,
          notes: ex.tips || '',
          gifUrl: ex.gifUrl,
          imageUrl: ex.imageUrl,
        };
      }),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    startSession(template);
    navigate('/workout/active');
  };

  // RENDER BLOCKS: Same structured logic
  // (Wizard -> Edit -> Analyze -> Main Hub)

  if (mode === 'wizard') {
    return (
      <main className="max-w-md mx-auto px-6 mt-12 pb-32 flex flex-col min-h-[90vh]">
        <div className="mb-8">
           <button onClick={() => setMode('planner')} className="w-10 h-10 rounded-full bg-[#151517] border border-[#2A2A2D] flex items-center justify-center text-[#F5F5F5] hover:bg-[#1E1E20] transition-colors mb-6 min-h-[44px]"><ArrowLeft className="w-4 h-4" /></button>
           <h1 className="font-headline text-3xl font-black text-on-surface italic uppercase tracking-tighter">Plan Builder</h1>
           <p className="text-primary text-xs font-bold uppercase tracking-widest mt-1">Step {wizardStep} of 4</p>
           <div className="flex gap-2 mt-4">{[1,2,3,4].map(s => (<div key={s} className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${wizardStep >= s ? 'bg-primary shadow-[0_0_10px_rgba(255,122,0,0.4)]' : 'bg-white/10'}`}></div>))}</div>
        </div>

        {wizardStep === 1 && (
          <div className="space-y-6 flex-1 animate-in fade-in slide-in-from-right-4 duration-500">
            <h2 className="text-sm uppercase tracking-widest font-bold text-on-surface-variant">Your Profile</h2>
            <div className="bg-[#151517] rounded-[1.5rem] p-5 border border-[#2A2A2D] relative overflow-hidden">
               <div className="absolute top-0 right-0 p-4 opacity-10"><RotateCw className="w-16 h-16 text-primary" /></div>
               <p className="text-xs text-secondary font-bold uppercase tracking-widest mb-4">Your Details</p>
               <div className="grid grid-cols-2 gap-4">
                 <div><p className="text-[10px] text-on-surface-variant uppercase mb-1">Goal</p><p className="font-bold text-on-surface text-sm">{profile.goal}</p></div>
                 <div><p className="text-[10px] text-on-surface-variant uppercase mb-1">Weight</p><p className="font-bold text-on-surface text-sm">{profile.weight} lbs</p></div>
               </div>
            </div>
            <div className="space-y-3 pt-4">
              <label className="text-[10px] uppercase tracking-widest font-bold text-on-surface-variant">Training Experience</label>
              {['Beginner', 'Intermediate', 'Advanced'].map(exp => (
                <button key={exp} onClick={() => setTempWizard({...tempWizard, experience: exp})} className={`w-full p-4 rounded-[1.2rem] border text-left text-sm font-bold transition-all ${tempWizard.experience === exp ? 'bg-primary/10 border-primary text-primary' : 'bg-[#151517] border-[#2A2A2D] text-on-surface'}`}>{exp}</button>
              ))}
            </div>
            <button onClick={() => setWizardStep(2)} className="w-full bg-white text-black py-4 rounded-xl font-bold uppercase tracking-widest text-sm mt-8">Proceed</button>
          </div>
        )}

        {wizardStep === 2 && (
          <div className="space-y-6 flex-1 animate-in fade-in slide-in-from-right-4 duration-500">
            <div className="space-y-3">
              <label className="text-[10px] uppercase tracking-widest font-bold text-on-surface-variant">Equipment & Access</label>
              {['Full Gym', 'Dumbbells Only', 'Bodyweight'].map(eq => (
                <button key={eq} onClick={() => setTempWizard({...tempWizard, gymAccess: eq})} className={`w-full p-4 rounded-[1.2rem] border text-left text-sm font-bold transition-all flex items-center justify-between ${tempWizard.gymAccess === eq ? 'bg-primary/10 border-primary text-primary' : 'bg-[#151517] border-[#2A2A2D] text-on-surface'}`}>{eq} <span className="text-primary">{eq === 'Full Gym' ? <Dumbbell className="w-5 h-5" /> : (eq === 'Bodyweight' ? <Activity className="w-5 h-5" /> : <Dumbbell className="w-5 h-5" />)}</span></button>
              ))}
            </div>
            <div className="space-y-3 pt-4">
              <label className="text-[10px] uppercase tracking-widest font-bold text-on-surface-variant">Current Lifestyle</label>
              <select value={tempWizard.lifestyle} onChange={(e) => setTempWizard({...tempWizard, lifestyle: e.target.value})} className="w-full bg-[#151517] border border-[#2A2A2D] p-4 rounded-[1.2rem] text-on-surface font-bold outline-none focus:border-primary">
                <option>Highly Active (Physical Job)</option><option>Active (10k+ steps daily)</option><option>Sedentary (Desk Job)</option>
              </select>
            </div>
            <button onClick={() => setWizardStep(3)} className="w-full bg-white text-black py-4 rounded-xl font-bold uppercase tracking-widest text-sm mt-8">Next Step</button>
          </div>
        )}

        {wizardStep === 3 && (
          <div className="space-y-6 flex-1 animate-in fade-in slide-in-from-right-4 duration-500">
             <div className="space-y-3">
               <label className="text-[10px] uppercase tracking-widest font-bold text-on-surface-variant">Training Frequency</label>
               <p className="text-xs text-on-surface-variant mb-4 font-light">How many days per week are you realistically going to dedicate to training?</p>
               {[3, 4, 5, 6].map(days => (
                 <button key={days} onClick={() => setTempWizard({...tempWizard, frequency: days})} className={`w-full p-4 rounded-[1.2rem] border text-left text-sm font-bold transition-all flex items-center justify-between ${tempWizard.frequency === days ? 'bg-primary/10 border-primary text-primary' : 'bg-[#151517] border-[#2A2A2D] text-on-surface hover:border-on-surface-variant'}`}>
                   <span>{days} Days / Week</span><span className="opacity-50">{days >= 5 ? <Flame className="w-4 h-4 text-[#FF8A00]" /> : <Clock className="w-4 h-4" />}</span>
                 </button>
               ))}
             </div>
             <button onClick={() => setWizardStep(4)} className="w-full bg-white text-black py-4 rounded-xl font-bold uppercase tracking-widest text-sm mt-8">Choose Final Split</button>
          </div>
        )}

        {wizardStep === 4 && (
          <div className="flex-1 animate-in fade-in slide-in-from-right-4 duration-500 flex flex-col">
            <h2 className="text-sm uppercase tracking-widest font-bold text-on-surface-variant mb-4">Select Target Strategy</h2>
            <div className="space-y-3 overflow-y-auto flex-1 custom-scrollbar pr-2 h-[400px]">
              {SPLIT_OPTIONS.map(split => (
                <button key={split.id} onClick={() => setTempWizard({...tempWizard, splitId: split.id})} className={`w-full p-4 rounded-[1.5rem] border text-left transition-all ${tempWizard.splitId === split.id ? 'bg-primary/10 border-primary shadow-[0_0_20px_rgba(255,122,0,0.1)] scale-[1.02]' : 'bg-[#151517] border-white/5 opacity-80 hover:opacity-100'}`}>
                  <div className="flex justify-between items-end mb-1"><span className="font-headline text-lg font-black text-on-surface">{split.name}</span><span className="text-[10px] uppercase tracking-widest text-primary font-bold">{split.stars}</span></div>
                  <div className="flex gap-2 items-center mb-2"><span className="text-[8px] uppercase tracking-widest bg-[var(--color-surface-container-highest)] px-2 py-0.5 rounded text-on-surface-variant">{split.level}</span></div>
                  <p className="text-xs text-on-surface-variant leading-relaxed font-light">{split.desc}</p>
                </button>
              ))}
            </div>
            <button onClick={handleAIWizardComplete} disabled={isGenerating} className="w-full bg-[#FF8A00] hover:bg-[#FF8A00]/90 text-black py-5 rounded-[1.5rem] font-bold text-sm uppercase tracking-widest mt-6 flex items-center justify-center gap-2 shadow-sm active:scale-95 transition-transform disabled:opacity-70 disabled:cursor-wait min-h-[44px]">{isGenerating ? <><Loader2 className="w-4 h-4 animate-spin" /> Generating with AI...</> : <><Sparkles className="w-4 h-4" /> Create My Plan</>}</button>
          </div>
        )}
      </main>
    )
  }

  if (mode === 'analyze' && analyzingExercise) {
    return (
      <main className="max-w-md mx-auto px-6 mt-16 pb-32 flex flex-col min-h-[90vh]">
        <div className="flex justify-between items-center mb-6"><button onClick={() => setMode('planner')} className="w-12 h-12 rounded-full bg-[#151517] border border-[#2A2A2D] flex items-center justify-center text-[#F5F5F5] hover:bg-[#1E1E20] transition-colors shadow-lg"><ArrowLeft className="w-5 h-5" /></button><span className="text-primary font-bold tracking-widest uppercase text-xs px-3 py-1 bg-primary/10 rounded-full border border-primary/20">Exercise Info</span></div>
        <div className="text-center mb-6">
          <h2 className="font-headline text-3xl font-black text-on-surface">{analyzingExercise.name}</h2>
          <p className="text-on-surface-variant text-[10px] uppercase font-bold tracking-widest mt-1 mb-3">Exercise breakdown</p>
          <p className="text-on-surface-variant text-sm leading-relaxed px-4 italic">"{analyzingExercise.description || 'Professional grade exercise for maximal output.'}"</p>
        </div>
        
        {(() => {
          const analyzingGif = analyzingExercise.gifUrl || GLOBAL_EXERCISE_LIBRARY.find(
            l => l.name.toLowerCase() === analyzingExercise.name.toLowerCase() ||
                 (l.aliases && l.aliases.some(a => a.toLowerCase() === analyzingExercise.name.toLowerCase()))
          )?.gifUrl;
          const analyzingImg = analyzingExercise.imageUrl || GLOBAL_EXERCISE_LIBRARY.find(
            l => l.name.toLowerCase() === analyzingExercise.name.toLowerCase() ||
                 (l.aliases && l.aliases.some(a => a.toLowerCase() === analyzingExercise.name.toLowerCase()))
          )?.imageUrl;

          if (analyzingGif || analyzingImg) {
            return (
              <div className="my-6">
                <ExerciseMedia
                  gifUrl={analyzingGif}
                  imageUrl={analyzingImg}
                  exerciseName={analyzingExercise.name}
                  primaryMuscle={analyzingExercise.muscles[0]}
                  aspectRatio="wide"
                />
              </div>
            );
          }
          return null;
        })()}

        <div className="space-y-4">
          <div className="bg-[#151517] rounded-[1.5rem] p-6 border border-[#2A2A2D]">
            <h4 className="font-label text-[10px] text-on-surface-variant uppercase tracking-widest font-bold mb-3 flex items-center gap-1.5"><Activity className="w-3.5 h-3.5 text-primary" /> Primary Movers</h4>
            <div className="flex flex-wrap gap-2">{analyzingExercise.muscles.map((m, i) => (<span key={i} className="px-3 py-1 bg-primary/10 border border-primary/20 text-primary text-xs font-bold rounded-full">{m}</span>))}</div>
          </div>
          <div className="bg-[#151517] rounded-[1.5rem] p-6 border border-[#F5C542]/20">
             <h4 className="font-label text-[10px] text-[#F5C542] uppercase tracking-widest font-bold mb-2 flex items-center gap-1.5"><AlertTriangle className="w-3.5 h-3.5 text-[#F5C542]" /> Form Tips</h4>
             <p className="text-sm text-on-surface leading-relaxed indent-2 border-l-2 border-[#F5C542]/30 pl-3">{analyzingExercise.tips}</p>
          </div>
        </div>
      </main>
    );
  }

  if (mode === 'edit' && editingWorkout) {
    const filteredLibrary = fullLibrary.filter(ex => ex.name.toLowerCase().includes(searchQuery.toLowerCase()) || ex.muscles.some(m => m.toLowerCase().includes(searchQuery.toLowerCase())));
    return (
       <main className="max-w-md mx-auto px-6 mt-16 pb-32 flex flex-col min-h-[90vh] relative">
        <div className="flex justify-between items-center mb-8"><button onClick={() => setMode('planner')} className="w-12 h-12 rounded-full bg-[#151517] border border-[#2A2A2D] flex items-center justify-center text-on-surface hover:bg-[#1E1E20] transition-colors shadow-lg"><X className="w-5 h-5" /></button><span className="font-headline font-bold text-lg tracking-tight text-on-surface uppercase italic">Edit Workout</span></div>
        <div className="bg-[#151517] p-5 rounded-[2rem] border border-[#2A2A2D] mb-6 shadow-xl space-y-4">
           <div><label className="text-[10px] uppercase tracking-widest font-bold text-on-surface-variant block mb-1">Day Label</label><input type="text" className="w-full bg-[#1E1E20] border border-[#2A2A2D] p-3 rounded-xl text-on-surface font-bold font-headline text-sm outline-none focus:border-primary/50 transition-colors" value={editingWorkout.dayStr} onChange={(e) => setEditingWorkout({...editingWorkout, dayStr: e.target.value})} /></div>
           <div><label className="text-[10px] uppercase tracking-widest font-bold text-on-surface-variant block mb-1">Workout Name</label><input type="text" className="w-full bg-[#1E1E20] border border-[#2A2A2D] p-3 rounded-xl text-primary font-bold font-headline text-lg outline-none focus:border-primary/50 transition-colors" value={editingWorkout.title} onChange={(e) => setEditingWorkout({...editingWorkout, title: e.target.value})} /></div>
           <div className="flex items-center justify-between pt-2"><label className="text-[10px] uppercase tracking-widest font-bold text-on-surface-variant flex items-center gap-1.5"><BedDouble className="w-4 h-4 text-primary" /> Mark as Rest Day</label><input type="checkbox" checked={!!editingWorkout.isRest} onChange={(e) => setEditingWorkout({...editingWorkout, isRest: e.target.checked})} className="w-5 h-5 accent-primary" /></div>
        </div>
        <h3 className="font-headline text-lg font-black tracking-tight mb-4 flex items-center gap-2">EXERCISES <span className="text-xs font-normal text-on-surface-variant font-mono tabular-nums">({editingWorkout.exercises.length})</span></h3>
        <div className="space-y-4 flex-1">
           {editingWorkout.exercises.map((ex, i) => (
             <div key={i} className="bg-[#151517] rounded-[1.5rem] p-5 border border-[#2A2A2D] relative group shadow-sm hover:shadow-md transition-shadow">
               <div className="absolute top-4 right-4 flex flex-col gap-1 items-center bg-black/40 p-1.5 rounded-full border border-[#2A2A2D]">
                 <button onClick={() => moveExercise(i, 'up')} disabled={i === 0} className="w-7 h-7 rounded-full hover:bg-white/10 flex items-center justify-center disabled:opacity-30 disabled:hover:bg-transparent"><ChevronUp className="w-4 h-4" /></button>
                 <button onClick={() => moveExercise(i, 'down')} disabled={i === editingWorkout.exercises.length - 1} className="w-7 h-7 rounded-full hover:bg-white/10 flex items-center justify-center disabled:opacity-30 disabled:hover:bg-transparent"><ChevronDown className="w-4 h-4" /></button>
                 <div className="w-4 h-[1px] bg-white/10 my-1"></div>
                 <button onClick={() => removeExerciseFromEdit(i)} className="w-7 h-7 rounded-full hover:bg-[#FF453A]/20 text-[#FF453A] flex items-center justify-center transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
               </div>
               <div className="space-y-3 pt-1 w-[80%]">
                 <div><label className="text-[9px] uppercase tracking-[0.2em] font-bold text-on-surface-variant block mb-1">Exercise Name</label><input type="text" className="w-full bg-[#1E1E20] border border-[#2A2A2D] px-3 py-2 rounded-lg text-sm text-on-surface font-bold outline-none focus:border-primary/50" value={ex.name} onChange={(e) => handleEditExerciseChange(i, 'name', e.target.value)} /></div>
                 <div className="grid grid-cols-2 gap-3"><div><label className="text-[9px] uppercase tracking-[0.2em] font-bold text-on-surface-variant block mb-1">Sets x Reps</label><input type="text" className="w-full bg-[#1E1E20] border border-[#2A2A2D] px-3 py-2 rounded-lg text-sm text-on-surface font-bold outline-none focus:border-primary/50" value={ex.reps} onChange={(e) => handleEditExerciseChange(i, 'reps', e.target.value)} /></div></div>
               </div>
             </div>
           ))}
           <button onClick={() => setIsSearchOpen(true)} className="w-full bg-[#151517] border-2 border-dashed border-[#2A2A2D] text-on-surface-variant p-4 rounded-[1.5rem] mt-2 font-bold text-sm uppercase tracking-widest hover:border-white/20 hover:text-white transition-colors flex items-center justify-center gap-2 mb-24"><Search className="w-4 h-4 text-primary" /> Add Exercise</button>
        </div>
        <button onClick={saveEditedWorkout} className="fixed bottom-[40px] left-6 right-6 max-w-md mx-auto w-[calc(100%-3rem)] bg-[#FF8A00] hover:bg-[#FF8A00]/90 py-5 rounded-[1.5rem] shadow-sm flex items-center justify-center gap-3 active:scale-95 transition-all z-40"><Check className="w-5 h-5 text-black font-bold" /><span className="font-headline font-black uppercase tracking-widest text-black text-sm">Save Changes</span></button>

        {isSearchOpen && (
          <div className="fixed inset-0 z-50 flex flex-col justify-end">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsSearchOpen(false)}></div>
            <div className="relative bg-[#151517] w-full h-[85vh] rounded-t-[2.5rem] max-w-md mx-auto border-t border-[#2A2A2D] shadow-[0_-20px_50px_rgba(0,0,0,0.5)] flex flex-col p-6 animate-in slide-in-from-bottom-[100%] duration-300">
               <div className="w-12 h-1.5 bg-white/20 rounded-full mx-auto mb-6"></div><h3 className="font-headline text-2xl font-black mb-4 flex items-center gap-2"><Dumbbell className="w-6 h-6 text-primary" /> Database</h3>
               {!customFormState ? (
                 <>
                   <div className="relative mb-6 flex-shrink-0"><Search className="w-4 h-4 absolute left-4 top-4 text-[#A1A1A6]" /><input type="text" autoFocus placeholder="Search 75+ exercises..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full bg-[#1E1E20] rounded-2xl py-3 pl-12 pr-4 text-white outline-none focus:border-primary/50 border border-[#2A2A2D]" /></div>
                   <div className="flex-1 overflow-y-auto space-y-3 pb-8 custom-scrollbar pr-2">
                     {filteredLibrary.length === 0 ? (
                       <div className="text-center mt-10"><p className="text-on-surface-variant text-sm mb-4">No exercises found.</p></div>
                     ) : (
                       filteredLibrary.map((lib, i) => (
                         <div key={i} onClick={() => addExerciseFromLibrary(lib)} className="bg-[#1E1E20] border border-[#2A2A2D] hover:border-primary/40 rounded-[1.5rem] p-4 flex justify-between items-center cursor-pointer group transition-all">
                           <div className="flex items-center gap-4">
                             {lib.imageUrl && (<div className="w-16 h-12 rounded-lg overflow-hidden flex-shrink-0 hidden md:block border border-[#2A2A2D] opacity-70 group-hover:opacity-100 transition-opacity bg-black"><img src={lib.imageUrl} alt="" className="w-full h-full object-cover" /></div>)}
                             <div>
                               <p className="font-bold text-on-surface group-hover:text-primary transition-colors">{lib.name}</p>
                               <div className="flex gap-1 mt-1 text-[9px] uppercase tracking-widest text-on-surface-variant">
                                 {lib.videoUrl ? <span className="text-[#FF453A] bg-[#FF453A]/10 px-1.5 rounded flex items-center gap-1"><Play className="w-3 h-3" />Video</span> : <span className="text-primary bg-primary/10 px-1.5 rounded flex items-center gap-1"><ImageIcon className="w-3 h-3" />HD Img</span>}
                                 {lib.muscles.slice(0,2).map(m => <span key={m} className="bg-white/5 px-2 py-0.5 rounded-full">{m}</span>)}
                               </div>
                             </div>
                           </div>
                         </div>
                       ))
                     )}
                     <button onClick={() => setCustomFormState(true)} className="w-full mt-4 bg-[#1E1E20] border border-dashed border-[#2A2A2D] text-on-surface-variant py-4 rounded-[1.2rem] font-bold text-xs uppercase tracking-widest hover:text-white transition-colors">Create Custom Exercise</button>
                   </div>
                 </>
               ) : (
                 <div className="flex-1 overflow-y-auto space-y-4 animate-in fade-in slide-in-from-right-4 pt-2">
                   <button onClick={() => setCustomFormState(false)} className="text-primary text-[10px] font-bold uppercase tracking-widest flex items-center gap-1 mb-4 hover:underline"><ArrowLeft className="w-3.5 h-3.5" /> Back to Database</button>
                   <div><label className="text-[10px] uppercase tracking-[0.2em] font-bold text-on-surface-variant block mb-1">Exercise Name</label><input type="text" autoFocus className="w-full bg-[#1E1E20] border border-[#2A2A2D] px-4 py-3 rounded-xl text-sm text-white font-bold outline-none focus:border-primary/50" value={customEx.name} onChange={(e) => setCustomEx({...customEx, name: e.target.value})} /></div>
                   <div className="grid grid-cols-2 gap-3"><div><label className="text-[10px] uppercase tracking-[0.2em] font-bold text-on-surface-variant block mb-1">Sets x Reps</label><input type="text" className="w-full bg-[#1E1E20] border border-[#2A2A2D] px-4 py-3 rounded-xl text-sm text-white font-bold outline-none focus:border-primary/50" value={customEx.reps} onChange={(e) => setCustomEx({...customEx, reps: e.target.value})} /></div></div>
                   <button onClick={createAndAddCustomExercise} disabled={!customEx.name} className="w-full bg-white text-black py-4 rounded-xl font-bold uppercase tracking-widest text-sm mt-6 disabled:opacity-30 transition-all">Add Exercise</button>
                 </div>
               )}
            </div>
          </div>
        )}
       </main>
    )
  }

  if (mode === 'active') {
    const mins = Math.floor(elapsed / 60);
    const secs = elapsed % 60;
    
    // Progress Calculation
    let totalSetsCount = 1;
    let completedSetsCount = 0;
    if (!activeWorkout.isRest) {
       totalSetsCount = Object.values(liveSetsData).reduce((sum, sets) => sum + sets.length, 0) || 1;
       completedSetsCount = Object.values(liveSetsData).reduce((sum, sets) => sum + sets.filter(s => s.completed).length, 0);
    }
    const progress = Math.min(100, Math.round((completedSetsCount / totalSetsCount) * 100));

    return (
      <main className="max-w-md mx-auto px-6 pt-12 pb-32 flex flex-col min-h-[90vh]">
        
        {/* Rest Timer Overlay */}
        {restTimer !== null && (
          <div className="fixed top-24 left-1/2 -translate-x-1/2 z-50 bg-[#1A1A1C] border border-primary/30 shadow-[0_0_40px_rgba(255,122,0,0.3)] rounded-[2rem] px-10 py-5 flex flex-col items-center animate-in fade-in zoom-in duration-300">
            <span className="text-[10px] uppercase tracking-widest font-bold text-primary mb-1 animate-pulse">Rest Timer Active</span>
            <span className="font-mono text-5xl font-black text-white">{Math.floor(restTimer/60)}:{(restTimer%60).toString().padStart(2,'0')}</span>
            <button onClick={() => setRestTimer(null)} className="absolute -top-3 -right-3 w-8 h-8 rounded-full bg-[#FF453A] text-black flex items-center justify-center font-bold shadow-lg hover:scale-110 transition-transform"><X className="w-4 h-4" /></button>
          </div>
        )}

        <div className="flex justify-between items-center mb-8"><button onClick={() => setMode('planner')} className="w-10 h-10 rounded-full bg-[#151517] border border-[#2A2A2D] flex items-center justify-center text-on-surface hover:bg-[#1E1E20] transition-colors shadow-lg"><X className="w-5 h-5" /></button><span className="text-primary font-bold tracking-widest uppercase text-xs px-3 py-1 bg-primary/10 rounded-full animate-pulse flex items-center gap-2 border border-primary/20"><span className="w-2 h-2 rounded-full bg-primary flex-shrink-0 animate-ping"></span> Session Live</span></div>
        {activeWorkout.isRest ? (
            <div className="text-center flex-1 flex flex-col items-center justify-center"><BedDouble className="w-16 h-16 text-primary/30 mb-6" /><h1 className="font-headline text-3xl font-black">{activeWorkout.title}</h1><p className="text-on-surface-variant mt-4 text-sm">{activeWorkout.tip || 'Take the day off.'}</p></div>
        ) : (
          <div className="mb-10 text-left relative z-10">
            <h1 className="font-headline text-4xl font-black text-on-surface mb-2">{activeWorkout.title}</h1>
            
            <div className="flex items-center gap-4 text-on-surface-variant font-label text-[10px] uppercase tracking-[0.2em] font-bold mb-4 font-mono tabular-nums">
               <span className="flex items-center gap-1.5 text-white/50"><Clock className="w-3.5 h-3.5 text-primary" /> {activeWorkout.duration} MIN</span>
               <span className="flex items-center gap-1.5 text-white/50"><Flame className="w-3.5 h-3.5 text-[#30D158]" /> {activeWorkout.kcal} KCAL</span>
            </div>

            <p className="text-on-surface-variant text-sm leading-relaxed mb-5 border-l-2 border-primary/50 pl-3">
               {activeWorkout.description || 'Train with maximum intensity and strict form.'}
            </p>

            <div className="space-y-2 mb-6">
              <span className="text-[10px] uppercase font-bold text-on-surface-variant tracking-widest block">Muscles Worked</span>
              <div className="flex flex-wrap gap-2">
                 {(activeWorkout.targetMuscles || ['Full Body']).map((m: string, idx: number) => (
                    <span key={idx} className="px-3 py-1.5 bg-primary/10 border border-primary/20 rounded-full text-[10px] text-primary font-bold uppercase tracking-wider">{m}</span>
                 ))}
              </div>
            </div>

            <div className="bg-[#1A1A1C] p-4 rounded-xl border border-white/5 space-y-2 mb-8 shadow-inner">
              <span className="text-[10px] uppercase font-bold text-[#FF8A00] tracking-widest flex items-center gap-1"><Flame className="w-3.5 h-3.5" /> Warm-Up</span>
              <p className="text-on-surface-variant text-xs leading-relaxed">{activeWorkout.warmupInfo || '5 min cardiovascular warmup. Dynamic stretching. 1 light set per movement.'}</p>
            </div>

            <div className="bg-black/20 p-5 rounded-2xl border border-white/5 mb-6 text-center">
              <span className="text-[10px] uppercase tracking-widest text-on-surface-variant font-bold block mb-1">Session Clock</span>
              <h2 className="font-headline text-5xl font-black text-[#30D158] font-mono tracking-tighter">{mins.toString().padStart(2,'0')}:{secs.toString().padStart(2,'0')}</h2>
              <div className="w-full bg-[#252528] h-1.5 rounded-full mt-4 overflow-hidden"><div className="bg-primary h-full transition-all duration-300" style={{ width: `${progress}%` }}></div></div>
            </div>
            
          </div>
        )}
        {!activeWorkout.isRest && (
          <div className="space-y-4 flex-1">
            {activeWorkout.exercises.map((ex, i) => {
              const currentExerciseSets = liveSetsData[i] || [];
              const isExerciseCompleted = currentExerciseSets.length > 0 && currentExerciseSets.every(s => s.completed);

              return (
              <div key={i} className={`p-5 rounded-[1.5rem] flex flex-col transition-all border shadow-md relative overflow-hidden ${isExerciseCompleted ? 'bg-primary/10 border-primary/30' : 'bg-[#151517] border-[#2A2A2D] hover:border-white/20'}`}>
                {isExerciseCompleted && <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-transparent pointer-events-none"></div>}
                <div className="flex justify-between items-center relative z-10 w-full mb-3">
                  <div>
                    <button onClick={() => { setAnalyzingExercise(ex); setMode('analyze'); }} className="text-left group text-on-surface">
                      <p className={`font-bold transition-colors group-hover:text-primary ${isExerciseCompleted ? 'text-primary/70 line-through' : 'text-on-surface'}`}>{ex.name}</p>
                      <p className="text-[10px] text-on-surface-variant font-label uppercase tracking-widest mt-1 flex items-center gap-1 mb-2">Sets: {ex.reps} <Info className="w-3 h-3 group-hover:text-primary" /></p>
                      <p className={`text-xs leading-relaxed transition-opacity ${isExerciseCompleted ? 'opacity-30' : 'text-white/80'}`}>{ex.description || 'Track your sets perfectly.'}</p>
                      {formatLastSession(ex.name) && !isExerciseCompleted && (
                        <p className="text-[11px] text-[#30D158] font-semibold mt-2 flex items-center gap-1">
                          <History className="w-3.5 h-3.5" />
                          {formatLastSession(ex.name)}
                        </p>
                      )}
                    </button>
                  </div>
                </div>
                {/* Animated GIF demonstration */}
                {(() => {
                  const effectiveGif = ex.gifUrl || GLOBAL_EXERCISE_LIBRARY.find(
                    l => l.name.toLowerCase() === ex.name.toLowerCase() ||
                         (l.aliases && l.aliases.some(a => a.toLowerCase() === ex.name.toLowerCase()))
                  )?.gifUrl;
                  const effectiveImg = ex.imageUrl || GLOBAL_EXERCISE_LIBRARY.find(
                    l => l.name.toLowerCase() === ex.name.toLowerCase() ||
                         (l.aliases && l.aliases.some(a => a.toLowerCase() === ex.name.toLowerCase()))
                  )?.imageUrl;

                  if (!isExerciseCompleted && (effectiveGif || effectiveImg)) {
                    return (
                      <div className="mt-2 mb-4">
                        <ExerciseMedia
                          gifUrl={effectiveGif}
                          imageUrl={effectiveImg}
                          exerciseName={ex.name}
                          primaryMuscle={ex.muscles?.[0]}
                          aspectRatio="wide"
                        />
                      </div>
                    );
                  }
                  return null;
                })()}
                
                {/* AI Coaching Box */}
                {!isExerciseCompleted && (
                  <div className="mt-3 mb-4 bg-primary/5 border border-primary/20 rounded-xl p-3 flex gap-3 items-start relative z-10">
                    <Sparkles className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                    <p className="text-[11px] text-on-surface-variant leading-relaxed italic">"Trainer Note: Auto-rest set to 90s. Maintain 1-2 RIR for optimal hypertrophy. Control the eccentric phase."</p>
                  </div>
                )}
                
                {/* Dynamically Generate Live Sets */}
                <div className="space-y-2 mt-2 relative z-10 w-full overflow-hidden">
                  {/* Sets Header */}
                  <div className="flex items-center gap-2 px-2 pb-1 bg-transparent">
                      <span className="w-12"></span> {/* Spacer for SetType badge and idx */}
                      <div className="flex-1 flex gap-2">
                         <span className="flex-1 text-center text-[9px] uppercase tracking-widest text-on-surface-variant font-bold">Weight</span>
                         <span className="flex-1 text-center text-[9px] uppercase tracking-widest text-on-surface-variant font-bold">Reps</span>
                         <span className="flex-1 text-center text-[9px] uppercase tracking-widest text-on-surface-variant font-bold">RPE</span>
                      </div>
                      <span className="w-10"></span> {/* Spacer for checkmark */}
                  </div>

                  {currentExerciseSets.length > 0 && currentExerciseSets.map((set, setIdx) => {
                    const lastSets = getLastSessionSets(ex.name);
                    const lastSetForIdx = lastSets.length > 0 ? (lastSets[setIdx] || lastSets[lastSets.length - 1]) : null;
                    return (
                      <div key={setIdx} className="flex flex-col gap-1 w-full">
                        <div className={`flex items-center gap-2 p-2 rounded-xl transition-colors ${set.completed ? 'bg-primary/20 opacity-60' : 'bg-black/20'} group/set`}>
                           <button onClick={() => {
                               const types: SetType[] = ['N', 'D', 'F', 'W'];
                               const idx = types.indexOf(set.setType);
                               const newSets = [...liveSetsData[i]];
                               newSets[setIdx].setType = types[(idx + 1) % types.length];
                               setLiveSetsData({...liveSetsData, [i]: newSets});
                           }} className={`w-6 h-6 rounded flex items-center justify-center text-[10px] font-black transition-colors disabled:opacity-50 ${set.setType === 'N' ? 'bg-white/5 text-white/50' : set.setType === 'D' ? 'bg-[#ff9800]/20 text-[#ff9800]' : set.setType === 'F' ? 'bg-[#ff0000]/20 text-[#ff0000]' : 'bg-[#00bcd4]/20 text-[#00bcd4]'}`} disabled={set.completed}>
                             {set.setType}
                           </button>
                           <span className="text-[10px] uppercase font-bold text-on-surface-variant tracking-widest w-4 text-center font-mono tabular-nums">{setIdx + 1}</span>
                           <div className="flex-1 flex gap-2">
                             <div className="relative flex-1">
                               <input type="text" placeholder="-" disabled={set.completed} value={set.weight} onChange={(e) => {
                                 const newSets = [...liveSetsData[i]];
                                 newSets[setIdx].weight = e.target.value;
                                 setLiveSetsData({...liveSetsData, [i]: newSets});
                               }} className={`w-full ${set.completed ? 'bg-transparent text-primary/70' : 'bg-[#151517]'} border border-[#2A2A2D] rounded-lg py-2.5 px-2 text-xs text-white outline-none focus:border-primary/50 text-center font-bold font-mono tabular-nums disabled:border-transparent placeholder:text-white/20`} />
                             </div>
                             <div className="relative flex-1">
                               <input type="text" placeholder="-" disabled={set.completed} value={set.reps} onChange={(e) => {
                                 const newSets = [...liveSetsData[i]];
                                 newSets[setIdx].reps = e.target.value;
                                 setLiveSetsData({...liveSetsData, [i]: newSets});
                               }} className={`w-full ${set.completed ? 'bg-transparent text-primary/70' : 'bg-[#151517]'} border border-[#2A2A2D] rounded-lg py-2.5 px-2 text-xs text-white outline-none focus:border-primary/50 text-center font-bold font-mono tabular-nums disabled:border-transparent placeholder:text-white/20`} />
                             </div>
                             <div className="relative flex-1">
                               <input type="text" placeholder="RPE" disabled={set.completed} value={set.rpe} onChange={(e) => {
                                 const newSets = [...liveSetsData[i]];
                                 newSets[setIdx].rpe = e.target.value;
                                 setLiveSetsData({...liveSetsData, [i]: newSets});
                               }} className={`w-full ${set.completed ? 'bg-transparent text-primary/70' : 'bg-[#151517]'} border border-[#2A2A2D] rounded-lg py-2.5 px-2 text-xs text-white outline-none focus:border-primary/50 text-center font-bold font-mono tabular-nums disabled:border-transparent placeholder:text-white/20`} />
                             </div>
                           </div>
                           <button onClick={() => {
                               const newSets = [...liveSetsData[i]];
                               const togglingOn = !newSets[setIdx].completed;
                               newSets[setIdx].completed = togglingOn;
                               setLiveSetsData({...liveSetsData, [i]: newSets});
                               if (togglingOn && !isExerciseCompleted) setRestTimer(90);
                           }} className={`w-10 h-10 flex-shrink-0 rounded-lg flex items-center justify-center transition-colors border ${set.completed ? 'bg-primary border-primary text-black shadow-[0_0_15px_rgba(255,122,0,0.4)]' : 'bg-white/5 border-white/10 hover:bg-white/10 text-transparent'}`}>
                             <Check className="w-4 h-4 text-black font-bold" />
                           </button>
                        </div>
                        {lastSetForIdx && !set.completed && (
                          <button
                            type="button"
                            onClick={() => {
                              const newSets = [...liveSetsData[i]];
                              newSets[setIdx].weight = String(lastSetForIdx.weight);
                              newSets[setIdx].reps = String(lastSetForIdx.reps);
                              if (lastSetForIdx.rpe) newSets[setIdx].rpe = String(lastSetForIdx.rpe);
                              if (lastSetForIdx.setType) newSets[setIdx].setType = lastSetForIdx.setType as SetType;
                              setLiveSetsData({...liveSetsData, [i]: newSets});
                            }}
                            className="flex items-center gap-1 px-10 text-[10px] text-primary/75 hover:text-primary transition-colors text-left self-start py-0.5 cursor-pointer font-mono tabular-nums"
                          >
                            <History className="w-3 h-3" />
                            <span>Last Set {setIdx + 1}: {lastSetForIdx.weight} lbs x {lastSetForIdx.reps} {lastSetForIdx.rpe ? `@RPE${lastSetForIdx.rpe}` : ''} {lastSetForIdx.setType && lastSetForIdx.setType !== 'N' ? `[${lastSetForIdx.setType}]` : ''} <span className="text-white/30 text-[9px]">(click to fill)</span></span>
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )})}
          </div>
        )}
        <button onClick={triggerSummary} className="mt-10 w-full bg-[#30D158] hover:bg-[#30D158]/90 py-5 rounded-[1.5rem] shadow-sm flex items-center justify-center gap-3 active:scale-95 transition-all z-10"><CheckCircle2 className="w-5 h-5 text-black font-bold" /><span className="font-headline font-black uppercase tracking-widest text-black text-sm">Finish Workout</span></button>
      </main>
    );
  }

  if (mode === 'summary') {
    let totalCompleted = 0;
    Object.values(liveSetsData).forEach(sets => totalCompleted += sets.filter(s => s.completed).length);

    return (
      <main className="max-w-md mx-auto px-6 pt-12 pb-32 flex flex-col items-center justify-center min-h-[90vh] relative z-10">
        <div className="relative mb-6">
           <Trophy className="w-24 h-24 text-primary animate-bounce" />
        </div>
        <h1 className="font-headline text-5xl font-black mb-1 text-center tracking-tighter text-on-surface uppercase italic">Workout <span className="text-primary">Complete!</span></h1>
        <p className="text-primary text-[10px] uppercase font-bold tracking-[0.2em] mb-10">Great job — session saved!</p>

        <div className="w-full bg-[#151517] border border-[#2A2A2D] rounded-[2rem] p-6 shadow-2xl relative z-10 mb-8 space-y-6">
           <div className="grid grid-cols-2 gap-4">
             <div className="bg-[#1E1E20] rounded-xl p-4 flex flex-col items-center border border-[#2A2A2D]">
                <Clock className="w-6 h-6 text-primary mb-1" />
                <span className="text-2xl font-black font-mono tabular-nums text-on-surface">{Math.max(1, Math.floor(elapsed/60))}m</span>
                <span className="text-[9px] uppercase tracking-widest text-on-surface-variant font-bold">Duration</span>
             </div>
             <div className="bg-[#1E1E20] rounded-xl p-4 flex flex-col items-center border border-[#2A2A2D]">
                <Flame className="w-6 h-6 text-[#30D158] mb-1" />
                <span className="text-2xl font-black font-mono tabular-nums text-on-surface">{activeWorkout.kcal}</span>
                <span className="text-[9px] uppercase tracking-widest text-on-surface-variant font-bold">Kcal Burned</span>
             </div>
             <div className="bg-[#1E1E20] rounded-xl p-4 flex flex-col items-center border border-[#2A2A2D] col-span-2">
                <Dumbbell className="w-6 h-6 text-[#FF8A00] mb-1" />
                <span className="text-2xl font-black font-mono tabular-nums text-white">{totalCompleted} Sets Hit</span>
                <span className="text-[9px] uppercase tracking-widest text-on-surface-variant font-bold">Total Volume</span>
             </div>
           </div>

           <div className="border-t border-[#2A2A2D] pt-6">
             <div className="flex justify-between items-center mb-4 text-[#FF8A00]">
               <span className="text-[10px] font-bold uppercase tracking-widest flex items-center gap-1.5"><Trophy className="w-3.5 h-3.5" /> 3 Personal Records Crushed!</span>
               <span className="text-[10px] font-bold uppercase tracking-widest flex items-center gap-1.5"><Flame className="w-3.5 h-3.5" /> High Calorie Burn</span>
             </div>
             <div className="flex justify-between items-center mb-2">
                <span className="text-xs uppercase font-bold text-white tracking-widest">Level 14 <span className="text-primary">Stryker</span></span>
                <span className="text-xs font-bold text-primary font-mono tabular-nums">+450 XP</span>
             </div>
             <div className="w-full h-3 bg-black rounded-full overflow-hidden border border-[#2A2A2D]"><div className="w-[85%] h-full bg-[#FF8A00] rounded-full"></div></div>
           </div>
        </div>

        <button onClick={finishWorkout} className="w-full bg-white text-black py-5 rounded-[1.5rem] font-black uppercase tracking-widest text-sm active:scale-95 transition-all shadow-sm">Done — Back to My Plan</button>
      </main>
    );
  }


  return (
    <main className="w-full max-w-6xl mx-auto px-3.5 sm:px-6 pt-4 sm:pt-6 pb-32 min-w-0 box-border">
      {/* ─── Header & Top Actions ─── */}
      <section className="mb-4 sm:mb-6">
        <div className="flex flex-wrap justify-between items-center gap-3">
          <div className="min-w-0">
            <span className="text-[10px] font-headline font-bold uppercase tracking-[0.2em] text-[var(--color-primary)] block mb-0.5">
              Performance Training OS
            </span>
            <h1 className="font-headline text-2xl sm:text-3xl font-black tracking-tight text-[var(--color-on-surface)] truncate">
              Workout Hub
            </h1>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setShowLogPastModal(true)}
              className="h-9 px-3.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-[var(--color-border)] flex items-center gap-1.5 text-xs font-headline font-bold uppercase tracking-wider text-[var(--color-on-surface)] transition-all active:scale-95"
            >
              <Calendar className="w-3.5 h-3.5 text-amber-400" />
              <span>Log Past Workout</span>
            </button>
            {workouts.length > 0 && workoutTab === 'plan' && (
              <button
                onClick={() => { setWorkouts([]); }}
                className="h-9 px-3 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-[var(--color-border)] flex items-center gap-1.5 text-xs font-semibold text-[var(--color-on-surface-variant)] hover:text-white transition-all active:scale-95"
                title="Reset Split"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Reset Split</span>
              </button>
            )}
          </div>
        </div>
      </section>

      {/* ─── High-Impact Quick Training / Spontaneous Training Hero ─── */}
      <section className="mb-6 p-4 sm:p-5 rounded-3xl bg-gradient-to-br from-[var(--color-surface)] to-[var(--color-surface-elevated)] border border-[var(--color-border)] relative overflow-hidden shadow-lg space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="w-12 h-12 rounded-2xl bg-[var(--color-action)]/15 border border-[var(--color-action)]/30 flex items-center justify-center text-[var(--color-action)] shrink-0">
              <Play className="w-6 h-6 fill-[var(--color-action)] stroke-none ml-0.5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="font-headline font-black text-base sm:text-lg text-[var(--color-on-surface)] uppercase tracking-tight">
                  Quick Start Training
                </h3>
                <span className="w-2 h-2 rounded-full bg-[var(--color-action)] animate-pulse" />
              </div>
              <p className="text-xs text-[var(--color-on-surface-variant)] mt-0.5">
                Train on your schedule without a fixed plan · Legs today, Back & Biceps tomorrow
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 sm:shrink-0 w-full sm:w-auto">
            <button
              onClick={() => handleOpenQuickStart()}
              className="flex-1 sm:flex-initial h-11 px-5 rounded-2xl bg-[var(--color-action)] hover:brightness-110 text-white font-headline font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg shadow-[var(--color-action)]/20 active:scale-95 transition-all"
            >
              <Sparkles className="w-4 h-4 shrink-0" />
              <span>Quick Start Tool</span>
            </button>
            <button
              onClick={() => handleStartFreestyle()}
              className="h-11 px-4 rounded-2xl bg-white/[0.05] hover:bg-white/[0.09] border border-[var(--color-border)] text-xs font-headline font-bold uppercase tracking-wider text-[var(--color-on-surface)] flex items-center justify-center gap-1.5 active:scale-95 transition-all shrink-0"
              title="Start Blank Session"
            >
              <Dumbbell className="w-4 h-4 text-[var(--color-primary)]" />
              <span className="hidden sm:inline">Blank Slate</span>
            </button>
            <button
              onClick={() => setShowLogPastModal(true)}
              className="h-11 px-4 rounded-2xl bg-white/[0.05] hover:bg-white/[0.09] border border-[var(--color-border)] text-xs font-headline font-bold uppercase tracking-wider text-[var(--color-on-surface)] flex items-center justify-center gap-1.5 active:scale-95 transition-all shrink-0"
              title="Log completed workout"
            >
              <Plus className="w-4 h-4 text-amber-400" />
              <span className="hidden sm:inline">Log Past</span>
            </button>
          </div>
        </div>

        {/* 1-Tap Quick Split Focus Chips */}
        <div className="pt-2 border-t border-[var(--color-border)]/60 flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
          <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[var(--color-muted)] shrink-0 pr-1">
            1-Tap Focus:
          </span>
          {QUICK_SPLIT_PRESETS.slice(0, 6).map((preset) => (
            <button
              key={preset.id}
              onClick={() => handleOpenQuickStart(preset.id)}
              className="py-1.5 px-3 rounded-xl bg-white/[0.04] hover:bg-[#FF8A00]/20 hover:text-[#FF8A00] border border-[var(--color-border)] hover:border-[#FF8A00]/40 text-xs font-semibold text-[var(--color-on-surface)] transition-all flex items-center gap-1.5 shrink-0 active:scale-95"
            >
              <Play className="w-2.5 h-2.5 fill-current opacity-70" />
              <span>{preset.shortLabel}</span>
            </button>
          ))}
        </div>
      </section>

      {/* ─── In-Page Tab Navigation (Plan / Past Workouts / Templates) ─── */}
      <div className="flex items-center gap-2 border-b border-[var(--color-border)] mb-6 overflow-x-auto no-scrollbar">
        <button
          onClick={() => handleTabChange('plan')}
          className={`pb-3 px-3.5 sm:px-5 font-headline text-xs sm:text-sm font-bold uppercase tracking-wider transition-all relative shrink-0 flex items-center gap-2 ${
            workoutTab === 'plan'
              ? 'text-[var(--color-primary)]'
              : 'text-[var(--color-muted)] hover:text-[var(--color-on-surface)]'
          }`}
        >
          <Calendar className="w-4 h-4 stroke-[2]" />
          <span>Training Plan</span>
          {workoutTab === 'plan' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[var(--color-primary)] rounded-full shadow-[0_0_8px_var(--color-primary)]" />
          )}
        </button>

        <button
          onClick={() => handleTabChange('history')}
          className={`pb-3 px-3.5 sm:px-5 font-headline text-xs sm:text-sm font-bold uppercase tracking-wider transition-all relative shrink-0 flex items-center gap-2 ${
            workoutTab === 'history'
              ? 'text-[var(--color-primary)]'
              : 'text-[var(--color-muted)] hover:text-[var(--color-on-surface)]'
          }`}
        >
          <History className="w-4 h-4 stroke-[2]" />
          <span>Past Workouts</span>
          <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full ${
            workoutTab === 'history' ? 'bg-[var(--color-primary)]/20 text-[var(--color-primary)]' : 'bg-white/[0.06] text-[var(--color-muted)]'
          }`}>
            {sessions.length}
          </span>
          {workoutTab === 'history' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[var(--color-primary)] rounded-full shadow-[0_0_8px_var(--color-primary)]" />
          )}
        </button>

        <button
          onClick={() => handleTabChange('templates')}
          className={`pb-3 px-3.5 sm:px-5 font-headline text-xs sm:text-sm font-bold uppercase tracking-wider transition-all relative shrink-0 flex items-center gap-2 ${
            workoutTab === 'templates'
              ? 'text-[var(--color-primary)]'
              : 'text-[var(--color-muted)] hover:text-[var(--color-on-surface)]'
          }`}
        >
          <PlusSquare className="w-4 h-4 stroke-[2]" />
          <span>Templates</span>
          <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full ${
            workoutTab === 'templates' ? 'bg-[var(--color-primary)]/20 text-[var(--color-primary)]' : 'bg-white/[0.06] text-[var(--color-muted)]'
          }`}>
            {templates.length}
          </span>
          {workoutTab === 'templates' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[var(--color-primary)] rounded-full shadow-[0_0_8px_var(--color-primary)]" />
          )}
        </button>
      </div>

      {/* ─── TAB 1: TRAINING PLAN ─── */}
      {workoutTab === 'plan' && (
        <div className="space-y-6 sm:space-y-8">
          {workouts.length === 0 ? (
            <div className="p-6 sm:p-10 rounded-3xl bg-[var(--color-surface)] border border-[var(--color-border)] max-w-2xl mx-auto space-y-6">
              <div className="text-center space-y-2">
                <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-[#FF8A00] block">
                  SPONTANEOUS ATHLETIC SYSTEM
                </span>
                <h3 className="font-headline font-black text-xl sm:text-2xl text-[var(--color-on-surface)] uppercase tracking-tight">
                  Train Today · No Fixed Plan Needed
                </h3>
                <p className="text-xs sm:text-sm text-[var(--color-muted)] max-w-lg mx-auto">
                  Workout on your own terms. Train <span className="text-[#F5F5F5] font-semibold">Legs today, Back & Biceps tomorrow</span>, or start a freestyle session with 1 tap.
                </p>
              </div>

              {/* 1-Tap Quick Split Starters */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                {QUICK_SPLIT_PRESETS.slice(0, 4).map((preset) => (
                  <div
                    key={preset.id}
                    className="p-4 rounded-2xl bg-[var(--color-surface-elevated)] border border-[var(--color-border)] hover:border-[#FF8A00]/50 transition-all flex flex-col justify-between space-y-3"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <h4 className="font-headline font-bold text-sm text-[var(--color-on-surface)]">
                          {preset.name}
                        </h4>
                        <span className="text-[10px] font-mono text-[#FF8A00] font-bold">
                          {preset.recommendedExercises.length} Ex
                        </span>
                      </div>
                      <p className="text-[11px] text-[var(--color-muted)] line-clamp-1">
                        {preset.tagline}
                      </p>
                    </div>

                    <button
                      onClick={() => handleInstantStartSplit(preset.id)}
                      className="w-full py-2.5 px-3 rounded-xl bg-[#FF8A00] hover:brightness-110 active:scale-[0.98] text-black font-headline font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all shadow-md shadow-[#FF8A00]/20"
                    >
                      <Play className="w-3.5 h-3.5 fill-black stroke-none" />
                      <span>Start {preset.shortLabel}</span>
                    </button>
                  </div>
                ))}
              </div>

              {/* Secondary actions: Custom tool or structured splits */}
              <div className="pt-4 border-t border-[var(--color-border)] flex flex-wrap items-center justify-center gap-2.5">
                <button
                  onClick={() => handleOpenQuickStart()}
                  className="py-2.5 px-4 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] border border-[var(--color-border)] text-[var(--color-on-surface)] font-headline font-bold text-xs uppercase tracking-wider flex items-center gap-1.5 active:scale-95 transition-all"
                >
                  <Sparkles className="w-3.5 h-3.5 text-[#FF8A00]" />
                  <span>Custom Muscle Focus</span>
                </button>
                <button
                  onClick={() => setMode('ai-wizard')}
                  className="py-2.5 px-4 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] border border-[var(--color-border)] text-[var(--color-on-surface)] font-headline font-bold text-xs uppercase tracking-wider flex items-center gap-1.5 active:scale-95 transition-all"
                >
                  <Sparkles className="w-3.5 h-3.5 text-[var(--color-primary)]" />
                  <span>AI Split Wizard</span>
                </button>
                <button
                  onClick={() => handleTabChange('templates')}
                  className="py-2.5 px-4 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] border border-[var(--color-border)] text-[var(--color-on-surface)] font-headline font-bold text-xs uppercase tracking-wider flex items-center gap-1.5 active:scale-95 transition-all"
                >
                  <PlusSquare className="w-3.5 h-3.5" />
                  <span>Browse Templates</span>
                </button>
                <button
                  onClick={startBlankCanvas}
                  className="py-2.5 px-4 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] border border-[var(--color-border)] text-[var(--color-on-surface)] font-headline font-bold text-xs uppercase tracking-wider flex items-center gap-1.5 active:scale-95 transition-all"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Custom Split</span>
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* ─── Compact Weekly Timeline (Avoid Huge Pill Buttons) ─── */}
              <section className="mb-6 sm:mb-8 w-full max-w-full overflow-hidden">
        <div className="flex gap-1.5 sm:gap-2 overflow-x-auto pb-1.5 w-full max-w-full custom-scrollbar no-scrollbar [scrollbar-width:none] [&::-webkit-scrollbar]:hidden -mx-3.5 px-3.5 sm:mx-0 sm:px-0">
          {workouts.map((wk, idx) => {
            const isSelected = selectedDay === idx;
            const isToday = idx === Math.min(todayIdx, workouts.length - 1);
            const dayIsRest = wk.isRest;
            return (
              <button
                key={idx}
                onClick={() => { setActiveDay(idx); setExpandedExIdx(null); }}
                className={`min-w-[48px] sm:min-w-[56px] min-h-[48px] py-2 px-1 sm:px-2 rounded-xl text-center transition-all border flex-shrink-0 sm:flex-1 ${
                  isSelected
                    ? 'bg-[var(--color-surface-elevated)] text-[var(--color-primary)] border-[var(--color-primary)] shadow-sm'
                    : isToday
                      ? 'bg-[var(--color-surface)] text-[var(--color-on-surface)] border-[var(--color-border)]'
                      : 'bg-[var(--color-surface)] text-[var(--color-muted)] border-transparent hover:border-[var(--color-border)]'
                }`}
              >
                <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider block">
                  {DAY_LABELS[idx] || `D${idx + 1}`}
                </span>
                <span className="text-xs sm:text-sm font-black mt-0.5 block tabular-nums">
                  {dayIsRest ? (
                    <BedDouble className="w-3.5 h-3.5 sm:w-4 sm:h-4 mx-auto opacity-70" />
                  ) : (
                    String(idx + 1).padStart(2, '0')
                  )}
                </span>
                {isToday && !isSelected && (
                  <div className="w-1.5 h-1.5 rounded-full bg-[var(--color-primary)] mx-auto mt-1" />
                )}
              </button>
            );
          })}
        </div>
      </section>

      {/* ─── Responsive Content Grid ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8 w-full max-w-full">
        {/* ── LEFT COLUMN (Session Hero & Editorial Exercise Log) ── */}
        <div className="lg:col-span-7 space-y-5 sm:space-y-6 min-w-0 w-full max-w-full">
          {/* Today's Workout Hero */}
          {todayWorkout && (
            <section className="p-4 sm:p-7 rounded-3xl bg-[var(--color-surface)] border border-[var(--color-border)] shadow-xl relative overflow-hidden w-full max-w-full">
              <div className="flex items-start justify-between mb-4">
                <div className="min-w-0">
                  <span className="text-[10px] uppercase font-bold tracking-[0.2em] text-[var(--color-action)] block mb-1">
                    {DAY_LABELS_FULL[selectedDay] || `Day ${selectedDay + 1}`} · {isRestDay ? 'Recovery Day' : 'Training Day'}
                  </span>
                  <h2 className="font-headline text-xl sm:text-3xl font-black text-[var(--color-on-surface)] tracking-tight leading-tight truncate">
                    {todayWorkout.title}
                  </h2>
                  <p className="text-xs sm:text-sm text-[var(--color-on-surface-variant)] mt-1 font-medium truncate">
                    {todayWorkout.targetMuscles?.join(' · ') || (isRestDay ? 'Tissue Regeneration' : 'Full Body')}
                  </p>
                </div>
              </div>

              {!isRestDay && (
                <>
                  {/* Workout Stats Strip - Responsive 3-Column Grid */}
                  <div className="grid grid-cols-3 divide-x divide-[var(--color-border)] py-3 border-y border-[var(--color-border)] my-4 text-xs text-[var(--color-on-surface-variant)] w-full">
                    <div className="pr-1.5 sm:pr-2 min-w-0">
                      <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-[var(--color-muted)] block truncate">Duration</span>
                      <span className="font-bold text-[var(--color-on-surface)] tabular-nums truncate block text-xs sm:text-sm">{todayWorkout.duration} min</span>
                    </div>
                    <div className="px-1.5 sm:px-2 min-w-0 text-center">
                      <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-[var(--color-muted)] block truncate">Volume</span>
                      <span className="font-bold text-[var(--color-on-surface)] tabular-nums truncate block text-xs sm:text-sm">{exerciseCount} exercises</span>
                    </div>
                    <div className="pl-1.5 sm:pl-2 min-w-0 text-right">
                      <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-[var(--color-muted)] block truncate">Est. Load</span>
                      <span className="font-bold text-[var(--color-on-surface)] tabular-nums truncate block text-xs sm:text-sm">{todayWorkout.kcal} kcal</span>
                    </div>
                  </div>

                  {/* DOMINANT ACTION CTA IN ACTION ORANGE */}
                  <div className="space-y-3 w-full">
                    <button
                      onClick={startWorkoutSession}
                      className="w-full min-h-[48px] sm:min-h-[50px] py-3.5 sm:py-4 px-4 sm:px-6 rounded-2xl bg-[var(--color-action)] hover:brightness-110 active:scale-[0.98] transition-all text-white font-headline font-black text-xs sm:text-sm uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg shadow-[var(--color-action)]/25"
                    >
                      <Play className="w-4 h-4 fill-white stroke-none shrink-0" />
                      <span>Start Workout</span>
                    </button>

                    <div className="flex gap-2 w-full">
                      <button
                        onClick={() => { setEditingWorkout(todayWorkout); setEditingWorkoutIdx(selectedDay); setMode('edit'); }}
                        className="flex-1 py-2.5 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] border border-[var(--color-border)] text-xs font-semibold text-[var(--color-on-surface-variant)] flex items-center justify-center gap-1.5 transition-colors min-h-[44px]"
                      >
                        <Edit3 className="w-3.5 h-3.5 shrink-0" /> <span>Edit</span>
                      </button>
                      <button
                        onClick={(e) => duplicateWorkout(e, selectedDay)}
                        className="flex-1 py-2.5 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] border border-[var(--color-border)] text-xs font-semibold text-[var(--color-on-surface-variant)] flex items-center justify-center gap-1.5 transition-colors min-h-[44px]"
                      >
                        <Copy className="w-3.5 h-3.5 shrink-0" /> <span>Duplicate</span>
                      </button>
                      <button
                        onClick={(e) => deleteWorkout(e, selectedDay)}
                        className="w-11 min-h-[44px] flex items-center justify-center rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 transition-colors shrink-0"
                        title="Delete Day"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </>
              )}

              {isRestDay && (
                <div className="py-4 space-y-3">
                  <p className="text-sm text-[var(--color-on-surface-variant)] leading-relaxed">
                    {todayWorkout.tip || 'Focus on active recovery, hydration, and deep sleep. Muscular protein synthesis and connective tissue repair occur during periods of scheduled rest.'}
                  </p>
                  <button
                    onClick={startWorkoutSession}
                    className="w-full py-3.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.08] text-xs font-bold uppercase tracking-wider text-[var(--color-on-surface)] transition-all flex items-center justify-center gap-2"
                  >
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    Mark Recovery Complete
                  </button>
                </div>
              )}
            </section>
          )}

          {/* ─── EDITORIAL EXERCISE LOG (NO BOX CARDS) ─── */}
          {!isRestDay && exerciseCount > 0 && (
            <section className="space-y-2">
              <div className="flex justify-between items-center px-1 mb-2">
                <span className="text-[10px] font-headline font-bold uppercase tracking-[0.2em] text-[var(--color-muted)]">
                  Exercise Order & Target Load
                </span>
                <span className="text-xs font-mono font-medium text-[var(--color-muted)]">
                  {exerciseCount} Movements
                </span>
              </div>

              <div className="space-y-1.5">
                {todayWorkout.exercises.map((ex, i) => {
                  const isExpanded = expandedExIdx === i;
                  const validVid = ex.videoUrl ? resolveValidVideo(ex.videoUrl) : '';
                  const lastSets = getLastSessionSets(ex.name);

                  return (
                    <div
                      key={`${selectedDay}-${i}`}
                      className={`rounded-2xl border transition-all duration-200 overflow-hidden ${
                        isExpanded
                          ? 'bg-[var(--color-surface)] border-[var(--color-primary)]/40 shadow-md'
                          : 'bg-[var(--color-surface)]/70 hover:bg-[var(--color-surface)] border-[var(--color-border)]'
                      }`}
                    >
                      {/* Editorial Row */}
                      <div
                        className="flex items-center gap-3.5 p-3.5 cursor-pointer group select-none"
                        onClick={() => setExpandedExIdx(isExpanded ? null : i)}
                      >
                        {/* 01, 02 Number */}
                        <span className="font-mono text-xs font-bold text-[var(--color-muted)] group-hover:text-[var(--color-primary)] w-5 text-center">
                          {String(i + 1).padStart(2, '0')}
                        </span>

                        {/* Exercise Name & Muscles */}
                        <div className="flex-1 min-w-0">
                          <h4 className="font-headline font-bold text-sm text-[var(--color-on-surface)] group-hover:text-[var(--color-primary)] truncate transition-colors">
                            {ex.name}
                          </h4>
                          <p className="text-[11px] text-[var(--color-on-surface-variant)] truncate mt-0.5">
                            {ex.muscles.slice(0, 2).join(' · ')}
                          </p>
                        </div>

                        {/* Target Reps / Load */}
                        <div className="text-right flex-shrink-0">
                          <span className="text-xs font-mono font-bold text-[var(--color-primary)] block tabular-nums">
                            {ex.reps}
                          </span>
                          {lastSets.length > 0 ? (
                            <span className="text-[10px] text-[var(--color-muted)] font-mono block">
                              Last: {lastSets[0].weight}×{lastSets[0].reps}
                            </span>
                          ) : (
                            <span className="text-[10px] text-[var(--color-muted)] font-mono block">
                              Target
                            </span>
                          )}
                        </div>

                        {/* Chevron */}
                        <div className="text-[var(--color-muted)] group-hover:text-[var(--color-on-surface)] transition-transform duration-200">
                          {isExpanded ? (
                            <ChevronUp className="w-4 h-4 text-[var(--color-primary)]" />
                          ) : (
                            <ChevronRight className="w-4 h-4" />
                          )}
                        </div>
                      </div>

                      {/* Expanded Details */}
                      {isExpanded && (
                        <div className="px-5 pb-5 pt-2 space-y-4 border-t border-[var(--color-border)]">
                          {/* Animated Form Guide */}
                          {(ex.gifUrl || ex.imageUrl || validVid) && (
                            <div className="w-full">
                              <ExerciseMedia
                                gifUrl={ex.gifUrl}
                                imageUrl={ex.imageUrl}
                                videoId={validVid}
                                exerciseName={ex.name}
                                primaryMuscle={ex.muscles?.[0]}
                                aspectRatio="wide"
                              />
                            </div>
                          )}

                          {/* Form Tip */}
                          {ex.tips && (
                            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 flex gap-2.5 items-start text-xs">
                              <Lightbulb className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                              <div>
                                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400 block mb-0.5">Execution Cue</span>
                                <p className="text-[var(--color-on-surface)]/90 leading-relaxed">{ex.tips}</p>
                              </div>
                            </div>
                          )}

                          {/* Historical Performance */}
                          {lastSets.length > 0 && (
                            <div className="p-3 rounded-xl bg-[var(--color-surface-elevated)] border border-[var(--color-border)] text-xs">
                              <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-muted)] block mb-1.5">
                                Previous Session Performance
                              </span>
                              <div className="space-y-1">
                                {lastSets.map((s, si) => (
                                  <div key={si} className="flex justify-between font-mono text-[11px] text-[var(--color-on-surface-variant)]">
                                    <span>Set {si + 1}</span>
                                    <span className="text-[var(--color-on-surface)] font-bold">{s.weight} lbs × {s.reps} reps</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Full Breakdown Button */}
                          <button
                            onClick={(e) => { e.stopPropagation(); setAnalyzingExercise(ex); setMode('analyze'); }}
                            className="w-full py-2.5 rounded-xl bg-[var(--color-surface-elevated)] hover:bg-white/[0.06] text-xs font-semibold text-[var(--color-primary)] transition-colors flex items-center justify-center gap-1.5"
                          >
                            <Info className="w-3.5 h-3.5" />
                            <span>Biomechanical Breakdown</span>
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Add New Day Button */}
              <button
                onClick={addNewDay}
                className="w-full py-3.5 rounded-2xl border border-dashed border-[var(--color-border)] hover:border-[var(--color-primary)]/40 text-[var(--color-on-surface-variant)] hover:text-white transition-colors flex items-center justify-center gap-2 text-xs font-semibold mt-4"
              >
                <Plus className="w-4 h-4" /> Add Training Day
              </button>
            </section>
          )}
        </div>

        {/* ── RIGHT COLUMN (Large Anatomical Muscle Training Map) ── */}
        <div className="lg:col-span-5 space-y-6">
          {!isRestDay && (
            <section className="p-6 rounded-3xl bg-[var(--color-surface)] border border-[var(--color-border)] space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-headline font-bold text-sm uppercase tracking-wider text-[var(--color-on-surface)]">
                    Target Muscle Anatomy
                  </h3>
                  <p className="text-xs text-[var(--color-muted)] mt-0.5">
                    Stimulus & recovery distribution
                  </p>
                </div>
              </div>

              <div className="py-2">
                <MuscleHeatmap
                  muscles={allWorkoutMuscles}
                  size={200}
                  showControls={true}
                  showLegend={true}
                  showSymmetryCard={true}
                />
              </div>
            </section>
          )}
        </div>
      </div>

              {/* Recent Activity Strip preview in Plan */}
              {sessions.length > 0 && (
                <section className="pt-6 border-t border-[var(--color-border)]/60">
                  <div className="flex items-center justify-between mb-3.5">
                    <div className="flex items-center gap-2">
                      <History className="w-4 h-4 text-[var(--color-primary)]" />
                      <h3 className="font-headline font-bold text-xs sm:text-sm uppercase tracking-wider text-[var(--color-on-surface)]">
                        Recent Logged Workouts
                      </h3>
                    </div>
                    <button
                      onClick={() => handleTabChange('history')}
                      className="text-xs font-semibold text-[var(--color-primary)] hover:underline flex items-center gap-1"
                    >
                      View All Past Workouts ({sessions.length}) <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {sessions.slice(0, 3).map(session => (
                      <div
                        key={session.id}
                        onClick={() => setHistoryDetailId(session.id)}
                        className="p-3.5 rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)] hover:border-[var(--color-primary)]/40 cursor-pointer transition-all hover:bg-[var(--color-surface-elevated)] group flex flex-col justify-between"
                      >
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <h4 className="font-headline font-bold text-xs sm:text-sm text-[var(--color-on-surface)] truncate group-hover:text-[var(--color-primary)] transition-colors">
                            {session.templateName}
                          </h4>
                          <span className="text-[10px] text-[var(--color-muted)] font-medium shrink-0">
                            {new Date(session.startedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 text-[11px] text-[var(--color-muted)]">
                          <span className="flex items-center gap-1 font-mono">
                            <Clock className="w-3 h-3 text-[var(--color-primary)]" />
                            {formatDuration(session.duration)}
                          </span>
                          <span className="flex items-center gap-1 font-mono">
                            <Dumbbell className="w-3 h-3 text-[var(--color-action)]" />
                            {formatVolume(session.totalVolume)} lbs
                          </span>
                          {session.prsHit.length > 0 && (
                            <span className="text-[10px] font-bold text-[var(--color-primary)] flex items-center gap-0.5">
                              <Trophy className="w-3 h-3" /> {session.prsHit.length} PR{session.prsHit.length > 1 ? 's' : ''}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              )}
            </>
          )}
        </div>
      )}

      {/* ─── TAB 2: PAST WORKOUTS HISTORY ─── */}
      {workoutTab === 'history' && (
        <div className="space-y-6">
          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <div className="p-4 rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)] flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-[var(--color-primary)]/10 text-[var(--color-primary)] flex items-center justify-center shrink-0">
                <Dumbbell className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <span className="text-[10px] uppercase font-bold tracking-wider text-[var(--color-muted)] block">Total Workouts</span>
                <span className="font-headline font-black text-lg sm:text-2xl text-[var(--color-on-surface)] tabular-nums block">
                  {historyStats.totalSessions}
                </span>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)] flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-[var(--color-action)]/10 text-[var(--color-action)] flex items-center justify-center shrink-0">
                <Flame className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <span className="text-[10px] uppercase font-bold tracking-wider text-[var(--color-muted)] block">Volume Moved</span>
                <span className="font-headline font-black text-lg sm:text-2xl text-[var(--color-on-surface)] tabular-nums truncate block">
                  {formatVolume(historyStats.totalVolume)} <span className="text-xs font-normal text-[var(--color-muted)]">lbs</span>
                </span>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)] flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center shrink-0">
                <Clock className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <span className="text-[10px] uppercase font-bold tracking-wider text-[var(--color-muted)] block">Time Trained</span>
                <span className="font-headline font-black text-lg sm:text-2xl text-[var(--color-on-surface)] tabular-nums block">
                  {historyStats.totalHours} <span className="text-xs font-normal text-[var(--color-muted)]">hrs</span>
                </span>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)] flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center shrink-0">
                <Trophy className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <span className="text-[10px] uppercase font-bold tracking-wider text-[var(--color-muted)] block">PRs Crushed</span>
                <span className="font-headline font-black text-lg sm:text-2xl text-[var(--color-on-surface)] tabular-nums block">
                  {historyStats.totalPRs}
                </span>
              </div>
            </div>
          </div>

          {/* Search, Filter & Calendar Controls */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left 5 Cols: Month Calendar */}
            <div className="lg:col-span-5 space-y-3">
              <HistoryCalendar
                sessions={sessions}
                currentMonth={historyCurrentMonth}
                onPrevMonth={() => setHistoryCurrentMonth(new Date(historyCurrentMonth.getFullYear(), historyCurrentMonth.getMonth() - 1, 1))}
                onNextMonth={() => setHistoryCurrentMonth(new Date(historyCurrentMonth.getFullYear(), historyCurrentMonth.getMonth() + 1, 1))}
                selectedDate={historySelectedDate}
                onSelectDate={(d) => setHistorySelectedDate(historySelectedDate === d ? null : d)}
              />

              {historySelectedDate && (
                <div className="p-3 rounded-xl bg-[var(--color-surface-elevated)] border border-[var(--color-border)] flex items-center justify-between text-xs">
                  <span className="text-[var(--color-muted)] font-medium">
                    Filtering: <strong className="text-[var(--color-primary)]">{historySelectedDate}</strong>
                  </span>
                  <button
                    onClick={() => setHistorySelectedDate(null)}
                    className="text-[var(--color-primary)] hover:underline font-bold text-[11px] flex items-center gap-1"
                  >
                    <X className="w-3.5 h-3.5" /> Clear Date Filter
                  </button>
                </div>
              )}
            </div>

            {/* Right 7 Cols: Search & Session Cards */}
            <div className="lg:col-span-7 space-y-4">
              <div className="flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center justify-between">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-[var(--color-muted)] absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={historySearchQuery}
                    onChange={(e) => setHistorySearchQuery(e.target.value)}
                    placeholder="Search workouts or exercises..."
                    className="w-full pl-9 pr-8 py-2.5 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] text-xs text-[var(--color-on-surface)] placeholder:text-[var(--color-muted)] focus:border-[var(--color-primary)] focus:outline-none transition-all"
                  />
                  {historySearchQuery && (
                    <button
                      onClick={() => setHistorySearchQuery('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--color-muted)] hover:text-white"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <button
                  onClick={() => setShowLogPastModal(true)}
                  className="py-2.5 px-4 rounded-xl bg-[var(--color-primary)] text-black font-headline font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 hover:brightness-110 active:scale-95 transition-all shadow-md shadow-[var(--color-primary)]/20 shrink-0"
                >
                  <Plus className="w-3.5 h-3.5 stroke-[2.5]" /> Log Workout
                </button>
              </div>

              {filteredHistorySessions.length === 0 ? (
                <div className="p-8 sm:p-12 rounded-3xl bg-[var(--color-surface)] border border-[var(--color-border)] text-center space-y-4">
                  <div className="w-14 h-14 rounded-2xl bg-white/[0.04] text-[var(--color-muted)] flex items-center justify-center mx-auto">
                    <History className="w-7 h-7" />
                  </div>
                  <div className="space-y-1">
                    <h4 className="font-headline font-bold text-base text-[var(--color-on-surface)]">
                      {sessions.length === 0 ? 'No Workouts Logged Yet' : 'No Matching Workouts'}
                    </h4>
                    <p className="text-xs text-[var(--color-muted)] max-w-sm mx-auto">
                      {sessions.length === 0
                        ? 'Track your freestyle workouts live or log past sessions to see your full history and PR trajectory here.'
                        : 'Try clearing your date or search filters to see all completed workouts.'}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center justify-center gap-2.5 pt-2">
                    <button
                      onClick={() => setShowLogPastModal(true)}
                      className="py-2.5 px-4 rounded-xl bg-[var(--color-primary)] text-black font-headline font-bold text-xs uppercase tracking-wider flex items-center gap-1.5 hover:brightness-110 active:scale-95 transition-all shadow-md shadow-[var(--color-primary)]/20"
                    >
                      <Plus className="w-3.5 h-3.5" /> Log Past Session
                    </button>
                    <button
                      onClick={() => handleStartFreestyle()}
                      className="py-2.5 px-4 rounded-xl bg-[var(--color-surface-elevated)] text-[var(--color-on-surface)] border border-[var(--color-border)] font-headline font-bold text-xs uppercase tracking-wider flex items-center gap-1.5 hover:bg-white/[0.06] active:scale-95 transition-all"
                    >
                      <Play className="w-3.5 h-3.5 fill-current" /> Start Freestyle
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredHistorySessions.map((session) => (
                    <div
                      key={session.id}
                      className="relative group bg-[var(--color-surface)] hover:bg-[var(--color-surface-elevated)] border border-[var(--color-border)] hover:border-[var(--color-primary)]/40 rounded-2xl p-4 transition-all cursor-pointer"
                      onClick={() => setHistoryDetailId(session.id)}
                    >
                      <div className="flex items-start justify-between gap-3 mb-2.5">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <h4 className="font-headline font-black text-sm sm:text-base text-[var(--color-on-surface)] group-hover:text-[var(--color-primary)] transition-colors truncate">
                              {session.templateName}
                            </h4>
                            {session.prsHit.length > 0 && (
                              <span className="bg-amber-500/15 text-amber-400 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full flex items-center gap-1 shrink-0">
                                <Trophy className="w-3 h-3" />
                                {session.prsHit.length} PR{session.prsHit.length > 1 ? 's' : ''}
                              </span>
                            )}
                          </div>
                          <p className="text-[10px] text-[var(--color-muted)] font-medium uppercase tracking-wider">
                            {new Date(session.startedAt).toLocaleDateString('en-US', {
                              weekday: 'short',
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                            })} · {new Date(session.startedAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                          </p>
                        </div>

                        {/* Top-right quick actions */}
                        <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => handleRepeatSession(session)}
                            title="Repeat Workout"
                            className="p-1.5 sm:px-2.5 sm:py-1 rounded-lg bg-[var(--color-surface-container)] hover:bg-[var(--color-primary)]/20 hover:text-[var(--color-primary)] text-[var(--color-muted)] text-[10px] font-bold uppercase tracking-wider transition-all flex items-center gap-1 active:scale-95"
                          >
                            <Repeat className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">Repeat</span>
                          </button>
                          <button
                            onClick={() => setHistoryDeleteTarget(session.id)}
                            title="Delete Session"
                            className="p-1.5 rounded-lg text-[var(--color-muted)] hover:text-red-400 hover:bg-red-500/10 transition-all active:scale-90"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Session exercise summary badges */}
                      <div className="flex flex-wrap gap-1.5 mb-3">
                        {session.exercises.slice(0, 4).map((ex, i) => (
                          <span
                            key={i}
                            className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-white/[0.04] text-[var(--color-on-surface-variant)]"
                          >
                            {ex.exerciseName} ({ex.sets.length} sets)
                          </span>
                        ))}
                        {session.exercises.length > 4 && (
                          <span className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-white/[0.04] text-[var(--color-muted)]">
                            +{session.exercises.length - 4} more
                          </span>
                        )}
                      </div>

                      {/* Footer Stats Strip */}
                      <div className="flex items-center gap-4 text-xs font-mono text-[var(--color-muted)] pt-2.5 border-t border-[var(--color-border)]/50">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-[var(--color-primary)]" />
                          {formatDuration(session.duration)}
                        </span>
                        <span className="flex items-center gap-1">
                          <Dumbbell className="w-3.5 h-3.5 text-[var(--color-action)]" />
                          {formatVolume(session.totalVolume)} lbs
                        </span>
                        <span className="flex items-center gap-1">
                          <Activity className="w-3.5 h-3.5 text-blue-400" />
                          {session.totalSets} total sets
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ─── TAB 3: WORKOUT TEMPLATES & STARTER BLUEPRINTS ─── */}
      {workoutTab === 'templates' && (
        <div className="space-y-8">
          {/* Header */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h3 className="font-headline font-black text-lg sm:text-xl text-[var(--color-on-surface)]">
                Workout Routines & Blueprints
              </h3>
              <p className="text-xs sm:text-sm text-[var(--color-muted)] mt-0.5">
                Start structured workouts in 1 tap, customize exercises, or build your own personal workout templates.
              </p>
            </div>
            <button
              onClick={() => handleStartFreestyle('Custom Routine Template')}
              className="py-2.5 px-4 rounded-xl bg-[var(--color-primary)] text-black font-headline font-bold text-xs uppercase tracking-wider flex items-center gap-1.5 hover:brightness-110 active:scale-95 transition-all shadow-md shadow-[var(--color-primary)]/20 shrink-0"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" /> Create Routine
            </button>
          </div>

          {/* User's Custom Templates */}
          <div className="space-y-3">
            <h4 className="font-headline font-bold text-xs uppercase tracking-wider text-[var(--color-muted)]">
              My Saved Templates ({templates.length})
            </h4>

            {templates.length === 0 ? (
              <div className="p-6 rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)] text-center space-y-2">
                <p className="text-xs text-[var(--color-muted)]">
                  You haven't saved any custom templates yet. Save any completed workout as a template, or start from one of the athletic blueprints below.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {templates.map((tpl) => (
                  <div
                    key={tpl.id}
                    className="p-5 rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)] hover:border-[var(--color-primary)]/50 transition-all flex flex-col justify-between space-y-4"
                  >
                    <div className="space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <h5 className="font-headline font-black text-sm sm:text-base text-[var(--color-on-surface)]">
                          {tpl.name}
                        </h5>
                        <span className="text-[10px] font-bold font-mono px-2 py-0.5 rounded-full bg-[var(--color-primary)]/10 text-[var(--color-primary)] shrink-0">
                          {tpl.exercises.length} Ex
                        </span>
                      </div>
                      {tpl.description && (
                        <p className="text-xs text-[var(--color-muted)] line-clamp-2">
                          {tpl.description}
                        </p>
                      )}
                      <div className="flex flex-wrap gap-1 pt-1">
                        {tpl.targetMuscles.map((m, i) => (
                          <span
                            key={i}
                            className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-white/[0.04] text-[var(--color-on-surface-variant)]"
                          >
                            {m}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 pt-2 border-t border-[var(--color-border)]">
                      <button
                        onClick={() => {
                          startSession(tpl);
                          navigate('/workout/active');
                        }}
                        className="flex-1 py-2.5 px-3 rounded-xl bg-[var(--color-action)] text-white font-headline font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 hover:brightness-110 active:scale-95 transition-all shadow-md shadow-[var(--color-action)]/20"
                      >
                        <Play className="w-3.5 h-3.5 fill-current" /> Start
                      </button>
                      <button
                        onClick={() => duplicateTemplate(tpl.id)}
                        title="Duplicate"
                        className="p-2.5 rounded-xl bg-[var(--color-surface-elevated)] border border-[var(--color-border)] text-[var(--color-muted)] hover:text-white transition-all active:scale-90"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setTemplateDeleteTarget(tpl.id)}
                        title="Delete"
                        className="p-2.5 rounded-xl bg-[var(--color-surface-elevated)] border border-[var(--color-border)] text-[var(--color-muted)] hover:text-red-400 transition-all active:scale-90"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Starter Athletic Blueprints */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <h4 className="font-headline font-bold text-xs uppercase tracking-wider text-[var(--color-muted)] flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-[var(--color-primary)]" />
                Athletic Starter Blueprints
              </h4>
              <span className="text-[10px] text-[var(--color-muted)]">Verified hypertrophy routines</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {STARTER_BLUEPRINTS.map((bp) => (
                <div
                  key={bp.id}
                  className="p-5 rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)] hover:border-[var(--color-primary)]/40 transition-all flex flex-col justify-between space-y-4"
                >
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h5 className="font-headline font-black text-sm sm:text-base text-[var(--color-on-surface)]">
                          {bp.name}
                        </h5>
                        <p className="text-xs text-[var(--color-muted)] mt-0.5">
                          {bp.description}
                        </p>
                      </div>
                      <span className="text-[10px] font-bold font-mono px-2 py-0.5 rounded-full bg-[var(--color-primary)]/10 text-[var(--color-primary)] shrink-0">
                        {bp.exercises.length} Exercises
                      </span>
                    </div>

                    {/* Exercise preview pills */}
                    <div className="space-y-1.5 pt-2">
                      {bp.exercises.map((ex, i) => (
                        <div key={i} className="flex items-center justify-between text-xs py-1 px-2.5 rounded-lg bg-white/[0.03]">
                          <span className="font-medium text-[var(--color-on-surface-variant)]">{ex.exerciseName}</span>
                          <span className="font-mono text-[10px] text-[var(--color-muted)]">{ex.sets.length} sets</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="pt-2 border-t border-[var(--color-border)]">
                    <button
                      onClick={() => {
                        startSession(bp);
                        navigate('/workout/active');
                      }}
                      className="w-full py-2.5 px-4 rounded-xl bg-[var(--color-primary)] text-black font-headline font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 hover:brightness-110 active:scale-95 transition-all shadow-md shadow-[var(--color-primary)]/20"
                    >
                      <Play className="w-3.5 h-3.5 fill-current" /> Start Routine
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Delete Workout Day Modal */}
      <ConfirmModal
        isOpen={workoutDeleteTarget !== null}
        onConfirm={confirmDeleteWorkout}
        onCancel={() => setWorkoutDeleteTarget(null)}
        title="Delete Workout Day?"
        message="Are you sure you want to delete this workout day? This action cannot be undone."
        confirmLabel="Delete"
        variant="danger"
      />

      {/* Delete History Session Modal */}
      <ConfirmModal
        isOpen={historyDeleteTarget !== null}
        onConfirm={handleConfirmDeleteHistory}
        onCancel={() => setHistoryDeleteTarget(null)}
        title="Delete Workout History?"
        message="Are you sure you want to delete this recorded session? This will remove its volume and PR records."
        confirmLabel="Delete"
        variant="danger"
      />

      {/* Delete Custom Template Modal */}
      <ConfirmModal
        isOpen={templateDeleteTarget !== null}
        onConfirm={async () => {
          if (templateDeleteTarget) {
            await deleteTemplate(templateDeleteTarget);
            setTemplateDeleteTarget(null);
          }
        }}
        onCancel={() => setTemplateDeleteTarget(null)}
        title="Delete Template?"
        message="Are you sure you want to remove this saved workout template?"
        confirmLabel="Delete"
        variant="danger"
      />

      {/* Session Detail Drill-down Modal */}
      {historyDetailSession && (
        <SessionDetail
          session={historyDetailSession}
          onClose={() => setHistoryDetailId(null)}
          onDelete={(id) => {
            setHistoryDeleteTarget(id);
          }}
        />
      )}

      {/* Log Past Workout Modal */}
      {showLogPastModal && (
        <LogPastWorkoutModal
          isOpen={showLogPastModal}
          onClose={() => setShowLogPastModal(false)}
        />
      )}

      {/* Spontaneous Training Quick Start Modal */}
      <QuickStartWorkoutModal
        isOpen={quickStartModalOpen}
        onClose={() => setQuickStartModalOpen(false)}
        defaultFocusId={quickStartDefaultFocus}
      />

    </main>
  );
}
