import { useState, useEffect, useMemo } from 'react';
import { useFitnessContext } from '../context/FitnessContext';
import { quickPrompt, type UserContext } from '../services/gemini';
import MuscleHeatmap from '../components/MuscleHeatmap';
import { storage } from '../utils/storage';

interface Exercise {
  id: string;
  name: string;
  reps: string;
  tips: string;
  muscles: string[];
  description?: string;
  videoUrl?: string; // YouTube video ID
  imageUrl?: string; // High-Res Thumbnail
}

interface DailyWorkout {
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

const createExercise = (name: string, reps: string, muscles: string[], tips: string, description: string = '', videoUrl: string = '', fallbackImageUrl: string = '/ai_gym_placeholder.png'): Exercise => {
  // DYNAMIC IMAGE RESOLUTION: If videoUrl exists, bind the image directly to the HD Youtube Thumbnail.
  const validUrl = resolveValidVideo(videoUrl);
  const imageUrl = validUrl ? `https://img.youtube.com/vi/${validUrl}/hqdefault.jpg` : fallbackImageUrl;
  return {
    id: crypto.randomUUID(), name, reps, muscles, tips, description, videoUrl: validUrl, imageUrl
  };
};

const resolveValidVideo = (url?: string) => {
  if (!url) return '';
  // Extract YouTube ID if a full URL was passed, otherwise use as-is
  const idMatch = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=))?([\w-]{8,15})/);
  return idMatch ? idMatch[1] : url;
};

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
  const { profile, logActivity } = useFitnessContext();
  
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
  
  const [mode, setMode] = useState<string>(workouts.length > 0 ? 'planner' : 'gateway');
  
  // Wizard State
  const [wizardStep, setWizardStep] = useState(1);
  const [tempWizard, setTempWizard] = useState({
    experience: 'Beginner',
    lifestyle: 'Active',
    gymAccess: 'Full Gym',
    frequency: 4,
    splitId: 'ppl'
  });

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
    if(confirm("Are you sure you want to delete this workout?")) {
      const next = workouts.filter((_, i) => i !== idx);
      setWorkouts(next);
      if (next.length === 0) setMode('gateway');
      if (activeDay >= next.length) setActiveDay(Math.max(0, next.length - 1));
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
    setMode('planner');
    setElapsed(0);
    setLiveSetsData({});
  };

  const startWorkoutSession = () => {
    const wk = workouts[activeDay];
    const initialSets: Record<number, LiveSet[]> = {};
    if (wk && !wk.isRest) {
      wk.exercises.forEach((ex, i) => {
        const match = ex.reps.match(/^(\d+)\s*?[xX]/);
        const numSets = match ? parseInt(match[1]) : 3;
        initialSets[i] = Array.from({length: numSets}).map(() => ({ reps: '', weight: '', completed: false, rpe: '', setType: 'N' }));
      });
    }
    setLiveSetsData(initialSets);
    setRestTimer(null);
    setMode('active');
    setElapsed(0);
  };

  // RENDER BLOCKS: Same structured logic
  // (Gateway -> Wizard -> Active -> Planner -> Edit -> Analyze)

  if (mode === 'gateway') {
    return (
      <main className="max-w-md mx-auto px-6 pt-12 pb-32 flex flex-col items-center justify-center min-h-[85vh]">
        <div className="relative mb-6">
           <div className="absolute inset-0 bg-primary opacity-20 blur-[40px] rounded-full"></div>
           <span className="material-symbols-outlined text-[80px] text-primary drop-shadow-[0_0_20px_rgba(255,122,0,0.3)] relative z-10">route</span>
        </div>
        <h1 className="font-headline text-4xl font-black mb-3 text-center tracking-tighter">Get Started</h1>
        <p className="text-on-surface-variant text-center text-sm mb-12 mx-4 leading-relaxed font-light">No workout plan yet. Let's build one that fits your goals!</p>

        <div className="space-y-4 w-full">
           <button onClick={() => setMode('wizard')} className="w-full relative overflow-hidden group bg-[var(--color-surface-container)] border border-primary/20 rounded-[2rem] p-6 text-left hover:border-primary/60 transition-all shadow-xl active:scale-95">
             <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-bl-[100px] blur-2xl group-hover:bg-primary/20 transition-all"></div>
             <span className="material-symbols-outlined text-primary text-3xl mb-3 block">psychology</span>
             <h3 className="font-headline font-black text-xl text-on-surface mb-1 uppercase tracking-wider group-hover:text-primary transition-colors">Smart Plan</h3>
             <p className="text-xs text-on-surface-variant leading-relaxed">Answer a few questions and get a personalized workout plan in seconds.</p>
           </button>
           <button onClick={startBlankCanvas} className="w-full relative overflow-hidden group bg-[var(--color-surface-container)] border border-[var(--color-outline)] rounded-[2rem] p-6 text-left hover:border-on-surface-variant transition-all shadow-xl active:scale-95">
             <span className="material-symbols-outlined text-on-surface-variant text-3xl mb-3 block">architecture</span>
             <h3 className="font-headline font-black text-xl text-on-surface mb-1 uppercase tracking-wider">Build My Own</h3>
             <p className="text-xs text-on-surface-variant leading-relaxed">Create your own workouts from scratch using our 75+ exercise library.</p>
           </button>
        </div>
      </main>
    );
  }

  if (mode === 'wizard') {
    return (
      <main className="max-w-md mx-auto px-6 mt-12 pb-32 flex flex-col min-h-[90vh]">
        <div className="mb-8">
           <button onClick={() => setMode('gateway')} className="w-10 h-10 rounded-full bg-[var(--color-surface-container)] flex items-center justify-center text-on-surface hover:bg-[var(--color-surface-container-high)] transition-colors mb-6"><span className="material-symbols-outlined">arrow_back</span></button>
           <h1 className="font-headline text-3xl font-black text-on-surface italic uppercase tracking-tighter">Plan Builder</h1>
           <p className="text-primary text-xs font-bold uppercase tracking-widest mt-1">Step {wizardStep} of 4</p>
           <div className="flex gap-2 mt-4">{[1,2,3,4].map(s => (<div key={s} className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${wizardStep >= s ? 'bg-primary shadow-[0_0_10px_rgba(255,122,0,0.4)]' : 'bg-white/10'}`}></div>))}</div>
        </div>

        {wizardStep === 1 && (
          <div className="space-y-6 flex-1 animate-in fade-in slide-in-from-right-4 duration-500">
            <h2 className="text-sm uppercase tracking-widest font-bold text-on-surface-variant">Your Profile</h2>
            <div className="bg-[var(--color-surface-container)] rounded-[1.5rem] p-5 border border-primary/20 relative overflow-hidden">
               <div className="absolute top-0 right-0 p-4 opacity-10"><span className="material-symbols-outlined text-6xl text-primary">sync</span></div>
               <p className="text-xs text-secondary font-bold uppercase tracking-widest mb-4">Your Details</p>
               <div className="grid grid-cols-2 gap-4">
                 <div><p className="text-[10px] text-on-surface-variant uppercase mb-1">Goal</p><p className="font-bold text-on-surface text-sm">{profile.goal}</p></div>
                 <div><p className="text-[10px] text-on-surface-variant uppercase mb-1">Weight</p><p className="font-bold text-on-surface text-sm">{profile.weight} lbs</p></div>
               </div>
            </div>
            <div className="space-y-3 pt-4">
              <label className="text-[10px] uppercase tracking-widest font-bold text-on-surface-variant">Training Experience</label>
              {['Beginner', 'Intermediate', 'Advanced'].map(exp => (
                <button key={exp} onClick={() => setTempWizard({...tempWizard, experience: exp})} className={`w-full p-4 rounded-[1.2rem] border text-left text-sm font-bold transition-all ${tempWizard.experience === exp ? 'bg-primary/10 border-primary text-primary' : 'bg-[var(--color-surface-container)] border-[var(--color-outline)] text-on-surface'}`}>{exp}</button>
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
                <button key={eq} onClick={() => setTempWizard({...tempWizard, gymAccess: eq})} className={`w-full p-4 rounded-[1.2rem] border text-left text-sm font-bold transition-all flex items-center justify-between ${tempWizard.gymAccess === eq ? 'bg-primary/10 border-primary text-primary' : 'bg-[var(--color-surface-container)] border-[var(--color-outline)] text-on-surface'}`}>{eq} <span className="material-symbols-outlined text-lg">{eq === 'Full Gym' ? 'fitness_center' : (eq === 'Bodyweight' ? 'sports_gymnastics' : 'barbell')}</span></button>
              ))}
            </div>
            <div className="space-y-3 pt-4">
              <label className="text-[10px] uppercase tracking-widest font-bold text-on-surface-variant">Current Lifestyle</label>
              <select value={tempWizard.lifestyle} onChange={(e) => setTempWizard({...tempWizard, lifestyle: e.target.value})} className="w-full bg-[var(--color-surface-container)] border border-[var(--color-outline)] p-4 rounded-[1.2rem] text-on-surface font-bold outline-none focus:border-primary">
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
                 <button key={days} onClick={() => setTempWizard({...tempWizard, frequency: days})} className={`w-full p-4 rounded-[1.2rem] border text-left text-sm font-bold transition-all flex items-center justify-between ${tempWizard.frequency === days ? 'bg-primary/10 border-primary text-primary' : 'bg-[var(--color-surface-container)] border-[var(--color-outline)] text-on-surface hover:border-on-surface-variant'}`}>
                   <span>{days} Days / Week</span><span className="material-symbols-outlined opacity-50">{days >= 5 ? 'local_fire_department' : 'timelapse'}</span>
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
                <button key={split.id} onClick={() => setTempWizard({...tempWizard, splitId: split.id})} className={`w-full p-4 rounded-[1.5rem] border text-left transition-all ${tempWizard.splitId === split.id ? 'bg-primary/10 border-primary shadow-[0_0_20px_rgba(255,122,0,0.1)] scale-[1.02]' : 'bg-[var(--color-surface-container)] border-white/5 opacity-80 hover:opacity-100'}`}>
                  <div className="flex justify-between items-end mb-1"><span className="font-headline text-lg font-black text-on-surface">{split.name}</span><span className="text-[10px] uppercase tracking-widest text-primary font-bold">{split.stars}</span></div>
                  <div className="flex gap-2 items-center mb-2"><span className="text-[8px] uppercase tracking-widest bg-[var(--color-surface-container-highest)] px-2 py-0.5 rounded text-on-surface-variant">{split.level}</span></div>
                  <p className="text-xs text-on-surface-variant leading-relaxed font-light">{split.desc}</p>
                </button>
              ))}
            </div>
            <button onClick={handleAIWizardComplete} disabled={isGenerating} className="w-full bg-gradient-to-r from-primary to-[#CC5F00] text-black py-5 rounded-[1.5rem] font-bold text-sm uppercase tracking-widest mt-6 flex items-center justify-center gap-2 drop-shadow-[0_10px_30px_rgba(255,122,0,0.3)] shadow-xl active:scale-95 transition-transform disabled:opacity-70 disabled:cursor-wait">{isGenerating ? <><span className="material-symbols-outlined animate-spin text-lg">progress_activity</span> Generating with AI...</> : <><span className="material-symbols-outlined animation-spin-slow">bolt</span> Create My Plan</>}</button>
          </div>
        )}
      </main>
    )
  }

  if (mode === 'analyze' && analyzingExercise) {
    return (
      <main className="max-w-md mx-auto px-6 mt-16 pb-32 flex flex-col min-h-[90vh]">
        <div className="flex justify-between items-center mb-6"><button onClick={() => setMode('planner')} className="w-12 h-12 rounded-full bg-[var(--color-surface-container)] flex items-center justify-center text-on-surface hover:bg-[var(--color-surface-container-high)] transition-colors shadow-lg"><span className="material-symbols-outlined">arrow_back</span></button><span className="text-primary font-bold tracking-widest uppercase text-xs px-3 py-1 bg-primary/10 rounded-full border border-primary/20">Exercise Info</span></div>
        <div className="text-center mb-6">
          <h2 className="font-headline text-3xl font-black text-on-surface">{analyzingExercise.name}</h2>
          <p className="text-on-surface-variant text-[10px] uppercase font-bold tracking-widest mt-1 mb-3">Exercise breakdown</p>
          <p className="text-on-surface-variant text-sm leading-relaxed px-4 italic">"{analyzingExercise.description || 'Professional grade exercise for maximal output.'}"</p>
        </div>
        
        {analyzingExercise.videoUrl ? (
          <div className="w-full aspect-video rounded-[1.5rem] overflow-hidden border border-primary/20 shadow-[0_0_30px_rgba(255,122,0,0.1)] relative my-6 bg-black z-10 group">
            <div className="absolute top-3 left-3 z-30 bg-black/60 backdrop-blur-md px-2 py-1 rounded-md border border-white/10 flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-[#FF0000] animate-pulse"></span><span className="text-[8px] font-bold uppercase tracking-widest text-white">Live Stream</span></div>
            <iframe className="w-full h-full absolute inset-0 z-20 scale-105 pointer-events-none group-active:pointer-events-auto" src={`https://www.youtube-nocookie.com/embed/${resolveValidVideo(analyzingExercise.videoUrl)}?autoplay=1&mute=1&playsinline=1&loop=1&playlist=${resolveValidVideo(analyzingExercise.videoUrl)}&rel=0&showinfo=0&modestbranding=1&controls=0`} title={analyzingExercise.name} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"></iframe>
          </div>
        ) : analyzingExercise.imageUrl ? (
          <div className="w-full aspect-video rounded-[1.5rem] overflow-hidden border border-primary/20 shadow-[0_0_30px_rgba(255,122,0,0.1)] relative my-6 bg-black">
              <img src={analyzingExercise.imageUrl} alt={analyzingExercise.name} className="w-full h-full object-cover opacity-80" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent flex items-end p-4"><span className="text-xs uppercase tracking-widest text-primary font-bold flex items-center gap-1"><span className="material-symbols-outlined text-[14px]">auto_awesome</span> Custom Library Item</span></div>
          </div>
        ) : null}

        <div className="space-y-4">
          <div className="bg-[var(--color-surface-container)] rounded-[1.5rem] p-6 border border-white/5">
            <h4 className="font-label text-[10px] text-on-surface-variant uppercase tracking-widest font-bold mb-3 flex items-center gap-1"><span className="material-symbols-outlined text-[14px]">psychology</span> Primary Movers</h4>
            <div className="flex flex-wrap gap-2">{analyzingExercise.muscles.map((m, i) => (<span key={i} className="px-3 py-1 bg-primary/10 border border-primary/20 text-primary text-xs font-bold rounded-full">{m}</span>))}</div>
          </div>
          <div className="bg-[var(--color-surface-container)] rounded-[1.5rem] p-6 border border-[#FFD700]/10 shadow-[0_4px_20px_rgba(255,215,0,0.02)]">
             <h4 className="font-label text-[10px] text-[#FFD700] uppercase tracking-widest font-bold mb-2 flex items-center gap-1"><span className="material-symbols-outlined text-[14px]">warning</span> Form Tips</h4>
             <p className="text-sm text-on-surface leading-relaxed indent-2 border-l-2 border-[#FFD700]/30 pl-3">{analyzingExercise.tips}</p>
          </div>
        </div>
      </main>
    );
  }

  if (mode === 'edit' && editingWorkout) {
    const filteredLibrary = fullLibrary.filter(ex => ex.name.toLowerCase().includes(searchQuery.toLowerCase()) || ex.muscles.some(m => m.toLowerCase().includes(searchQuery.toLowerCase())));
    return (
       <main className="max-w-md mx-auto px-6 mt-16 pb-32 flex flex-col min-h-[90vh] relative">
        <div className="flex justify-between items-center mb-8"><button onClick={() => setMode('planner')} className="w-12 h-12 rounded-full bg-[var(--color-surface-container)] flex items-center justify-center text-on-surface hover:bg-[var(--color-surface-container-high)] transition-colors shadow-lg"><span className="material-symbols-outlined">close</span></button><span className="font-headline font-bold text-lg tracking-tight text-on-surface uppercase italic">Edit Workout</span></div>
        <div className="bg-[var(--color-surface-container)] p-5 rounded-[2rem] border border-white/5 mb-6 shadow-xl space-y-4">
           <div><label className="text-[10px] uppercase tracking-widest font-bold text-on-surface-variant block mb-1">Day Label</label><input type="text" className="w-full bg-[var(--color-surface-container-high)] border border-[var(--color-outline)] p-3 rounded-xl text-on-surface font-bold font-headline text-sm outline-none focus:border-primary/50 transition-colors" value={editingWorkout.dayStr} onChange={(e) => setEditingWorkout({...editingWorkout, dayStr: e.target.value})} /></div>
           <div><label className="text-[10px] uppercase tracking-widest font-bold text-on-surface-variant block mb-1">Workout Name</label><input type="text" className="w-full bg-[var(--color-surface-container-high)] border border-[var(--color-outline)] p-3 rounded-xl text-primary font-bold font-headline text-lg outline-none focus:border-primary/50 transition-colors" value={editingWorkout.title} onChange={(e) => setEditingWorkout({...editingWorkout, title: e.target.value})} /></div>
           <div className="flex items-center justify-between pt-2"><label className="text-[10px] uppercase tracking-widest font-bold text-on-surface-variant flex items-center gap-1"><span className="material-symbols-outlined text-[14px]">hotel</span> Mark as Rest Day</label><input type="checkbox" checked={!!editingWorkout.isRest} onChange={(e) => setEditingWorkout({...editingWorkout, isRest: e.target.checked})} className="w-5 h-5 accent-primary" /></div>
        </div>
        <h3 className="font-headline text-lg font-black tracking-tight mb-4 flex items-center gap-2">EXERCISES <span className="text-xs font-normal text-on-surface-variant">({editingWorkout.exercises.length})</span></h3>
        <div className="space-y-4 flex-1">
           {editingWorkout.exercises.map((ex, i) => (
             <div key={i} className="bg-[var(--color-surface-container)] rounded-[1.5rem] p-5 border border-white/5 relative group shadow-sm hover:shadow-md transition-shadow">
               <div className="absolute top-4 right-4 flex flex-col gap-1 items-center bg-black/30 p-1.5 rounded-full border border-white/5">
                 <button onClick={() => moveExercise(i, 'up')} disabled={i === 0} className="w-7 h-7 rounded-full hover:bg-white/10 flex items-center justify-center disabled:opacity-30 disabled:hover:bg-transparent"><span className="material-symbols-outlined text-[16px]">expand_less</span></button>
                 <button onClick={() => moveExercise(i, 'down')} disabled={i === editingWorkout.exercises.length - 1} className="w-7 h-7 rounded-full hover:bg-white/10 flex items-center justify-center disabled:opacity-30 disabled:hover:bg-transparent"><span className="material-symbols-outlined text-[16px]">expand_more</span></button>
                 <div className="w-4 h-[1px] bg-white/10 my-1"></div>
                 <button onClick={() => removeExerciseFromEdit(i)} className="w-7 h-7 rounded-full hover:bg-[#FF4D4D]/20 text-[#FF4D4D] flex items-center justify-center transition-colors"><span className="material-symbols-outlined text-[14px]">delete</span></button>
               </div>
               <div className="space-y-3 pt-1 w-[80%]">
                 <div><label className="text-[9px] uppercase tracking-[0.2em] font-bold text-on-surface-variant block mb-1">Exercise Name</label><input type="text" className="w-full bg-[var(--color-surface-container-high)] border border-[var(--color-outline)] px-3 py-2 rounded-lg text-sm text-on-surface font-bold outline-none focus:border-primary/50" value={ex.name} onChange={(e) => handleEditExerciseChange(i, 'name', e.target.value)} /></div>
                 <div className="grid grid-cols-2 gap-3"><div><label className="text-[9px] uppercase tracking-[0.2em] font-bold text-on-surface-variant block mb-1">Sets x Reps</label><input type="text" className="w-full bg-[var(--color-surface-container-high)] border border-[var(--color-outline)] px-3 py-2 rounded-lg text-sm text-on-surface font-bold outline-none focus:border-primary/50" value={ex.reps} onChange={(e) => handleEditExerciseChange(i, 'reps', e.target.value)} /></div></div>
               </div>
             </div>
           ))}
           <button onClick={() => setIsSearchOpen(true)} className="w-full bg-[var(--color-surface-container)] border-2 border-[dashed] border-white/10 text-on-surface-variant p-4 rounded-[1.5rem] mt-2 font-bold text-sm uppercase tracking-widest hover:border-white/20 hover:text-white transition-colors flex items-center justify-center gap-2 mb-24"><span className="material-symbols-outlined text-primary">search</span> Add Exercise</button>
        </div>
        <button onClick={saveEditedWorkout} className="fixed bottom-[40px] left-6 right-6 max-w-md mx-auto w-[calc(100%-3rem)] bg-gradient-to-br from-primary to-[#CC5F00] py-5 rounded-[1.5rem] shadow-[0_12px_40px_rgba(255,122,0,0.3)] flex items-center justify-center gap-3 hover:opacity-90 active:scale-95 transition-all z-40"><span className="material-symbols-outlined text-black font-bold">save</span><span className="font-headline font-black uppercase tracking-widest text-black text-sm">Save Changes</span></button>

        {isSearchOpen && (
          <div className="fixed inset-0 z-50 flex flex-col justify-end">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsSearchOpen(false)}></div>
            <div className="relative bg-[var(--color-surface)] w-full h-[85vh] rounded-t-[2.5rem] max-w-md mx-auto border-t border-white/10 shadow-[0_-20px_50px_rgba(0,0,0,0.5)] flex flex-col p-6 animate-in slide-in-from-bottom-[100%] duration-300">
               <div className="w-12 h-1.5 bg-white/20 rounded-full mx-auto mb-6"></div><h3 className="font-headline text-2xl font-black mb-4 flex items-center gap-2"><span className="material-symbols-outlined text-primary">dynamic_feed</span> Database</h3>
               {!customFormState ? (
                 <>
                   <div className="relative mb-6 flex-shrink-0"><span className="material-symbols-outlined absolute left-4 top-3.5 text-on-surface-variant">search</span><input type="text" autoFocus placeholder="Search 75+ exercises..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full bg-[var(--color-surface-container)] rounded-2xl py-3 pl-12 pr-4 text-white outline-none focus:border-primary/50 border border-white/5" /></div>
                   <div className="flex-1 overflow-y-auto space-y-3 pb-8 custom-scrollbar pr-2">
                     {filteredLibrary.length === 0 ? (
                       <div className="text-center mt-10"><p className="text-on-surface-variant text-sm mb-4">No exercises found.</p></div>
                     ) : (
                       filteredLibrary.map((lib, i) => (
                         <div key={i} onClick={() => addExerciseFromLibrary(lib)} className="bg-[var(--color-surface-container-low)] border border-white/5 hover:border-primary/40 rounded-[1.5rem] p-4 flex justify-between items-center cursor-pointer group transition-all">
                           <div className="flex items-center gap-4">
                             {lib.imageUrl && (<div className="w-16 h-12 rounded-lg overflow-hidden flex-shrink-0 hidden md:block border border-white/10 opacity-70 group-hover:opacity-100 transition-opacity bg-black"><img src={lib.imageUrl} alt="" className="w-full h-full object-cover" /></div>)}
                             <div>
                               <p className="font-bold text-on-surface group-hover:text-primary transition-colors">{lib.name}</p>
                               <div className="flex gap-1 mt-1 text-[9px] uppercase tracking-widest text-on-surface-variant">
                                 {lib.videoUrl ? <span className="text-[#FF0000] bg-[#FF0000]/10 px-1.5 rounded flex items-center gap-1"><span className="material-symbols-outlined text-[10px]">play_circle</span>Video</span> : <span className="text-primary bg-primary/10 px-1.5 rounded flex items-center gap-1"><span className="material-symbols-outlined text-[10px]">image</span>HD Img</span>}
                                 {lib.muscles.slice(0,2).map(m => <span key={m} className="bg-white/5 px-2 py-0.5 rounded-full">{m}</span>)}
                               </div>
                             </div>
                           </div>
                         </div>
                       ))
                     )}
                     <button onClick={() => setCustomFormState(true)} className="w-full mt-4 bg-[var(--color-surface-container)] border border-[dashed] border-white/10 text-on-surface-variant py-4 rounded-[1.2rem] font-bold text-xs uppercase tracking-widest hover:text-white transition-colors">Create Custom Exercise</button>
                   </div>
                 </>
               ) : (
                 <div className="flex-1 overflow-y-auto space-y-4 animate-in fade-in slide-in-from-right-4 pt-2">
                   <button onClick={() => setCustomFormState(false)} className="text-primary text-[10px] font-bold uppercase tracking-widest flex items-center gap-1 mb-4 hover:underline"><span className="material-symbols-outlined text-[14px]">arrow_back</span> Back to Database</button>
                   <div><label className="text-[10px] uppercase tracking-[0.2em] font-bold text-on-surface-variant block mb-1">Exercise Name</label><input type="text" autoFocus className="w-full bg-[var(--color-surface-container)] border border-white/10 px-4 py-3 rounded-xl text-sm text-white font-bold outline-none focus:border-primary/50" value={customEx.name} onChange={(e) => setCustomEx({...customEx, name: e.target.value})} /></div>
                   <div className="grid grid-cols-2 gap-3"><div><label className="text-[10px] uppercase tracking-[0.2em] font-bold text-on-surface-variant block mb-1">Sets x Reps</label><input type="text" className="w-full bg-[var(--color-surface-container)] border border-white/10 px-4 py-3 rounded-xl text-sm text-white font-bold outline-none focus:border-primary/50" value={customEx.reps} onChange={(e) => setCustomEx({...customEx, reps: e.target.value})} /></div></div>
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
            <button onClick={() => setRestTimer(null)} className="absolute -top-3 -right-3 w-8 h-8 rounded-full bg-[#FF0000] text-black flex items-center justify-center font-bold shadow-lg hover:scale-110 transition-transform"><span className="material-symbols-outlined text-[16px]">close</span></button>
          </div>
        )}

        <div className="flex justify-between items-center mb-8"><button onClick={() => setMode('planner')} className="w-10 h-10 rounded-full bg-[var(--color-surface-container)] flex items-center justify-center text-on-surface hover:bg-[var(--color-surface-container-high)] transition-colors shadow-lg"><span className="material-symbols-outlined">close</span></button><span className="text-primary font-bold tracking-widest uppercase text-xs px-3 py-1 bg-primary/10 rounded-full animate-pulse flex items-center gap-2 border border-primary/20"><span className="w-2 h-2 rounded-full bg-primary flex-shrink-0 animate-ping"></span> Session Live</span></div>
        {activeWorkout.isRest ? (
            <div className="text-center flex-1 flex flex-col items-center justify-center"><span className="material-symbols-outlined text-[80px] text-primary/30 mb-6">self_improvement</span><h1 className="font-headline text-3xl font-black">{activeWorkout.title}</h1><p className="text-on-surface-variant mt-4 text-sm">{activeWorkout.tip || 'Take the day off.'}</p></div>
        ) : (
          <div className="mb-10 text-left relative z-10">
            <h1 className="font-headline text-4xl font-black text-on-surface mb-2">{activeWorkout.title}</h1>
            
            <div className="flex items-center gap-4 text-on-surface-variant font-label text-[10px] uppercase tracking-[0.2em] font-bold mb-4">
               <span className="flex items-center gap-1.5 text-white/50"><span className="material-symbols-outlined text-[14px] text-primary">schedule</span> {activeWorkout.duration} MIN</span>
               <span className="flex items-center gap-1.5 text-white/50"><span className="material-symbols-outlined text-[14px] text-[#6FFB85]">local_fire_department</span> {activeWorkout.kcal} KCAL</span>
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
              <span className="text-[10px] uppercase font-bold text-[#ff9800] tracking-widest flex items-center gap-1"><span className="material-symbols-outlined text-[14px]">local_fire_department</span> Warm-Up</span>
              <p className="text-on-surface-variant text-xs leading-relaxed">{activeWorkout.warmupInfo || '5 min cardiovascular warmup. Dynamic stretching. 1 light set per movement.'}</p>
            </div>

            <div className="bg-black/20 p-5 rounded-2xl border border-white/5 mb-6 text-center">
              <span className="text-[10px] uppercase tracking-widest text-on-surface-variant font-bold block mb-1">Session Clock</span>
              <h2 className="font-headline text-5xl font-black text-[#6FFB85] font-mono tracking-tighter">{mins.toString().padStart(2,'0')}:{secs.toString().padStart(2,'0')}</h2>
              <div className="w-full bg-[#252528] h-1.5 rounded-full mt-4 overflow-hidden"><div className="bg-primary h-full transition-all duration-300" style={{ width: `${progress}%` }}></div></div>
            </div>
            
          </div>
        )}
        {!activeWorkout.isRest && (
          <div className="space-y-4 flex-1">
            {activeWorkout.exercises.map((ex, i) => {
              const validLiveVid = resolveValidVideo(ex.videoUrl);
              const ytParams = `?autoplay=1&mute=1&playsinline=1&loop=1&playlist=${validLiveVid}&rel=0&showinfo=0&modestbranding=1&controls=0`;
              const currentExerciseSets = liveSetsData[i] || [];
              const isExerciseCompleted = currentExerciseSets.length > 0 && currentExerciseSets.every(s => s.completed);

              return (
              <div key={i} className={`p-5 rounded-[1.5rem] flex flex-col transition-all border shadow-md relative overflow-hidden ${isExerciseCompleted ? 'bg-primary/10 border-primary/30' : 'bg-[var(--color-surface-container)] border-white/5 hover:border-white/20'}`}>
                {isExerciseCompleted && <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-transparent pointer-events-none"></div>}
                <div className="flex justify-between items-center relative z-10 w-full mb-3">
                  <div>
                    <button onClick={() => { setAnalyzingExercise(ex); setMode('analyze'); }} className="text-left group text-on-surface">
                      <p className={`font-bold transition-colors group-hover:text-primary ${isExerciseCompleted ? 'text-primary/70 line-through' : 'text-on-surface'}`}>{ex.name}</p>
                      <p className="text-[10px] text-on-surface-variant font-label uppercase tracking-widest mt-1 flex items-center gap-1 mb-2">Sets: {ex.reps} <span className="material-symbols-outlined text-[10px] group-hover:text-primary">info</span></p>
                      <p className={`text-xs leading-relaxed transition-opacity ${isExerciseCompleted ? 'opacity-30' : 'text-white/80'}`}>{ex.description || 'Track your sets perfectly.'}</p>
                    </button>
                  </div>
                </div>
                {validLiveVid && !isExerciseCompleted && (
                  <div className="w-full aspect-video rounded-xl overflow-hidden mt-2 mb-4 relative border border-white/10 bg-black group z-10">
                     <iframe className="absolute inset-0 w-full h-full scale-105 pointer-events-none group-active:pointer-events-auto z-20" src={`https://www.youtube-nocookie.com/embed/${validLiveVid}${ytParams}`} title={ex.name}></iframe>
                  </div>
                )}
                {ex.imageUrl && !ex.videoUrl && !isExerciseCompleted && (
                   <div className="w-full aspect-video rounded-xl overflow-hidden mt-2 mb-4 relative border border-white/10 bg-black"><img src={ex.imageUrl} alt="" className="w-full h-full object-cover opacity-80" /></div>
                )}
                
                {/* AI Coaching Box */}
                {!isExerciseCompleted && (
                  <div className="mt-3 mb-4 bg-primary/5 border border-primary/20 rounded-xl p-3 flex gap-3 items-start relative z-10">
                    <span className="material-symbols-outlined text-primary text-[16px] mt-0.5 animate-pulse">smart_toy</span>
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

                  {currentExerciseSets.length > 0 && currentExerciseSets.map((set, setIdx) => (
                    <div key={setIdx} className={`flex items-center gap-2 p-2 rounded-xl transition-colors ${set.completed ? 'bg-primary/20 opacity-60' : 'bg-black/20'} group/set`}>
                       <button onClick={() => {
                           const types: SetType[] = ['N', 'D', 'F', 'W'];
                           const idx = types.indexOf(set.setType);
                           const newSets = [...liveSetsData[i]];
                           newSets[setIdx].setType = types[(idx + 1) % types.length];
                           setLiveSetsData({...liveSetsData, [i]: newSets});
                       }} className={`w-6 h-6 rounded flex items-center justify-center text-[10px] font-black transition-colors disabled:opacity-50 ${set.setType === 'N' ? 'bg-white/5 text-white/50' : set.setType === 'D' ? 'bg-[#ff9800]/20 text-[#ff9800]' : set.setType === 'F' ? 'bg-[#ff0000]/20 text-[#ff0000]' : 'bg-[#00bcd4]/20 text-[#00bcd4]'}`} disabled={set.completed}>
                         {set.setType}
                       </button>
                       <span className="text-[10px] uppercase font-bold text-on-surface-variant tracking-widest w-4 text-center">{setIdx + 1}</span>
                       <div className="flex-1 flex gap-2">
                         <div className="relative flex-1">
                           <input type="text" placeholder="-" disabled={set.completed} value={set.weight} onChange={(e) => {
                             const newSets = [...liveSetsData[i]];
                             newSets[setIdx].weight = e.target.value;
                             setLiveSetsData({...liveSetsData, [i]: newSets});
                           }} className={`w-full ${set.completed ? 'bg-transparent text-primary/70' : 'bg-[var(--color-surface)]'} border border-white/5 rounded-lg py-2.5 px-2 text-xs text-white outline-none focus:border-primary/50 text-center font-bold disabled:border-transparent placeholder:text-white/20`} />
                         </div>
                         <div className="relative flex-1">
                           <input type="text" placeholder="-" disabled={set.completed} value={set.reps} onChange={(e) => {
                             const newSets = [...liveSetsData[i]];
                             newSets[setIdx].reps = e.target.value;
                             setLiveSetsData({...liveSetsData, [i]: newSets});
                           }} className={`w-full ${set.completed ? 'bg-transparent text-primary/70' : 'bg-[var(--color-surface)]'} border border-white/5 rounded-lg py-2.5 px-2 text-xs text-white outline-none focus:border-primary/50 text-center font-bold disabled:border-transparent placeholder:text-white/20`} />
                         </div>
                         <div className="relative flex-1">
                           <input type="text" placeholder="RPE" disabled={set.completed} value={set.rpe} onChange={(e) => {
                             const newSets = [...liveSetsData[i]];
                             newSets[setIdx].rpe = e.target.value;
                             setLiveSetsData({...liveSetsData, [i]: newSets});
                           }} className={`w-full ${set.completed ? 'bg-transparent text-primary/70' : 'bg-[var(--color-surface)]'} border border-white/5 rounded-lg py-2.5 px-2 text-xs text-white outline-none focus:border-primary/50 text-center font-bold disabled:border-transparent placeholder:text-white/20`} />
                         </div>
                       </div>
                       <button onClick={() => {
                           const newSets = [...liveSetsData[i]];
                           const togglingOn = !newSets[setIdx].completed;
                           newSets[setIdx].completed = togglingOn;
                           setLiveSetsData({...liveSetsData, [i]: newSets});
                           if (togglingOn && !isExerciseCompleted) setRestTimer(90);
                       }} className={`w-10 h-10 flex-shrink-0 rounded-lg flex items-center justify-center transition-colors border ${set.completed ? 'bg-primary border-primary text-black shadow-[0_0_15px_rgba(255,122,0,0.4)]' : 'bg-white/5 border-white/10 hover:bg-white/10 text-transparent'}`}>
                         <span className="material-symbols-outlined text-sm font-bold">check</span>
                       </button>
                    </div>
                  ))}
                </div>
              </div>
            )})}
          </div>
        )}
        <button onClick={triggerSummary} className="mt-10 w-full bg-gradient-to-br from-[#6FFB85] to-[#4caf50] py-5 rounded-[1.5rem] shadow-[0_12px_40px_rgba(111,251,133,0.3)] flex items-center justify-center gap-3 active:scale-95 transition-all z-10"><span className="material-symbols-outlined text-black font-bold">task_alt</span><span className="font-headline font-black uppercase tracking-widest text-black text-sm">Finish Workout</span></button>
      </main>
    );
  }

  if (mode === 'summary') {
    let totalCompleted = 0;
    Object.values(liveSetsData).forEach(sets => totalCompleted += sets.filter(s => s.completed).length);

    return (
      <main className="max-w-md mx-auto px-6 pt-12 pb-32 flex flex-col items-center justify-center min-h-[90vh] relative z-10">
        <div className="absolute inset-0 bg-primary/5 blur-[100px] pointer-events-none"></div>
        <div className="relative mb-6">
           <span className="material-symbols-outlined text-[100px] text-primary drop-shadow-[0_0_30px_rgba(255,122,0,0.6)] animate-bounce">military_tech</span>
        </div>
        <h1 className="font-headline text-5xl font-black mb-1 text-center tracking-tighter text-on-surface uppercase italic">Workout <span className="text-primary">Complete!</span></h1>
        <p className="text-primary text-[10px] uppercase font-bold tracking-[0.2em] mb-10">Great job — session saved!</p>

        <div className="w-full bg-[#1A1A1C] border border-white/10 rounded-[2rem] p-6 shadow-2xl relative z-10 mb-8 space-y-6">
           <div className="grid grid-cols-2 gap-4">
             <div className="bg-black/40 rounded-xl p-4 flex flex-col items-center border border-white/5">
                <span className="material-symbols-outlined text-primary mb-1 text-3xl">timer</span>
                <span className="text-2xl font-black font-mono text-on-surface">{Math.max(1, Math.floor(elapsed/60))}m</span>
                <span className="text-[9px] uppercase tracking-widest text-on-surface-variant font-bold">Duration</span>
             </div>
             <div className="bg-black/40 rounded-xl p-4 flex flex-col items-center border border-white/5">
                <span className="material-symbols-outlined text-[#6FFB85] mb-1 text-3xl">local_fire_department</span>
                <span className="text-2xl font-black font-mono text-on-surface">{activeWorkout.kcal}</span>
                <span className="text-[9px] uppercase tracking-widest text-on-surface-variant font-bold">Kcal Burned</span>
             </div>
             <div className="bg-black/40 rounded-xl p-4 flex flex-col items-center border border-white/5 col-span-2">
                <span className="material-symbols-outlined text-[#ff9800] mb-1 text-3xl">barbell</span>
                <span className="text-2xl font-black font-mono text-white">{totalCompleted} Sets Hit</span>
                <span className="text-[9px] uppercase tracking-widest text-on-surface-variant font-bold">Total Volume</span>
             </div>
           </div>

           <div className="border-t border-white/10 pt-6">
             <div className="flex justify-between items-center mb-4 text-[#ff9800]">
               <span className="text-[10px] font-bold uppercase tracking-widest flex items-center gap-1"><span className="material-symbols-outlined text-[14px]">emoji_events</span> 3 Personal Records Crushed!</span>
               <span className="text-[10px] font-bold uppercase tracking-widest flex items-center gap-1"><span className="material-symbols-outlined text-[14px]">local_fire_department</span> High Calorie Burn</span>
             </div>
             <div className="flex justify-between items-center mb-2">
                <span className="text-xs uppercase font-bold text-white tracking-widest">Level 14 <span className="text-primary">Stryker</span></span>
                <span className="text-xs font-bold text-primary">+450 XP</span>
             </div>
             <div className="w-full h-3 bg-black rounded-full overflow-hidden border border-white/10"><div className="w-[85%] h-full bg-gradient-to-r from-primary to-[#CC5F00] rounded-full"></div></div>
           </div>
        </div>

        <button onClick={finishWorkout} className="w-full bg-white text-black py-5 rounded-[1.5rem] font-black uppercase tracking-widest text-sm active:scale-95 transition-all shadow-[0_0_40px_rgba(255,255,255,0.2)]">Done — Back to My Plan</button>
      </main>
    );
  }


  return (
    <main className="max-w-md mx-auto px-5 pt-6 pb-32">
      {/* Header */}
      <section className="mb-5">
        <div className="flex justify-between items-center">
          <div>
            <p className="text-primary text-[10px] font-bold uppercase tracking-[0.2em] mb-0.5">{DAY_LABELS_FULL[todayIdx]}</p>
            <h1 className="font-headline text-2xl font-extrabold tracking-tight text-on-surface">Today's Workout</h1>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => { setWorkouts([]); setMode('gateway'); }} className="w-9 h-9 rounded-full bg-[var(--color-surface-container)] flex items-center justify-center text-on-surface-variant hover:text-primary hover:bg-primary/10 transition-all" title="Regenerate plan">
              <span className="material-symbols-outlined text-[18px]">refresh</span>
            </button>
          </div>
        </div>
      </section>

      {/* ─── Horizontal Day Selector ─── */}
      <section className="mb-6">
        <div className="flex gap-1.5 overflow-x-auto pb-2 -mx-1 px-1 custom-scrollbar">
          {workouts.map((wk, idx) => {
            const isSelected = selectedDay === idx;
            const isToday = idx === Math.min(todayIdx, workouts.length - 1);
            const dayIsRest = wk.isRest;
            return (
              <button
                key={idx}
                onClick={() => { setActiveDay(idx); setExpandedExIdx(null); }}
                className={`flex flex-col items-center min-w-[52px] py-2.5 px-2 rounded-2xl transition-all duration-200 border flex-shrink-0 ${
                  isSelected
                    ? 'bg-primary text-black border-primary shadow-[0_4px_20px_rgba(255,122,0,0.3)] scale-105'
                    : isToday
                      ? 'bg-primary/10 text-primary border-primary/30'
                      : 'bg-[var(--color-surface-container)] text-on-surface-variant border-transparent hover:border-white/10'
                }`}
              >
                <span className={`text-[9px] font-bold uppercase tracking-wider ${isSelected ? 'text-black/60' : ''}`}>
                  {DAY_LABELS[idx] || `D${idx + 1}`}
                </span>
                <span className={`text-base font-black mt-0.5 ${isSelected ? 'text-black' : ''}`}>
                  {dayIsRest
                    ? <span className="material-symbols-outlined text-[16px]">hotel</span>
                    : String(idx + 1).padStart(2, '0')
                  }
                </span>
                {isToday && !isSelected && (
                  <div className="w-1 h-1 rounded-full bg-primary mt-1"></div>
                )}
              </button>
            );
          })}
        </div>
      </section>

      {/* ─── Today's Workout Hero Card ─── */}
      {todayWorkout && (
        <section className="mb-6" key={`hero-${selectedDay}`}>
          <div className={`animate-hero-card rounded-[1.8rem] overflow-hidden border transition-all duration-300 ${
            isRestDay
              ? 'bg-[var(--color-surface-container)] border-white/5'
              : 'bg-gradient-to-br from-[var(--color-surface-container)] to-[var(--color-surface-container-low)] border-primary/15 shadow-[0_8px_40px_rgba(0,0,0,0.2)]'
          }`}>
            {/* Hero header */}
            <div className="p-6 pb-4">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  {isRestDay ? (
                    <>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="material-symbols-outlined text-3xl text-on-surface-variant/40">self_improvement</span>
                      </div>
                      <h2 className="font-headline text-2xl font-black text-on-surface-variant">{todayWorkout.title}</h2>
                      <p className="text-on-surface-variant/60 text-sm mt-2 leading-relaxed">{todayWorkout.tip || 'Focus on sleep, nutrition, and deep tissue recovery today. Your muscles grow during rest — prioritize 7-9 hours of sleep, stay hydrated, and consider light stretching or foam rolling.'}</p>
                      <div className="mt-4 bg-[#64B5F6]/5 border border-[#64B5F6]/15 rounded-xl p-3 flex gap-3 items-start">
                        <span className="material-symbols-outlined text-[#64B5F6] text-[16px] mt-0.5">tips_and_updates</span>
                        <p className="text-[11px] text-on-surface-variant leading-relaxed">Active recovery helps more than complete rest. Consider a 20-min walk, light yoga, or foam rolling to boost blood flow and accelerate muscle repair.</p>
                      </div>
                    </>
                  ) : (
                    <>
                      <span className="text-[9px] uppercase font-bold tracking-[0.2em] text-primary/70 mb-1 block">
                        {DAY_LABELS_FULL[selectedDay] || `Day ${selectedDay + 1}`} — Workout
                      </span>
                      <h2 className="font-headline text-3xl font-black text-on-surface tracking-tight leading-none mb-3">{todayWorkout.title}</h2>

                      {/* Stats row */}
                      <div className="flex items-center gap-2 flex-wrap mb-4">
                        <span className="flex items-center gap-1 text-[11px] text-on-surface-variant font-semibold bg-white/5 px-3 py-1.5 rounded-full">
                          <span className="material-symbols-outlined text-[13px] text-primary">schedule</span> {todayWorkout.duration} min
                        </span>
                        <span className="flex items-center gap-1 text-[11px] text-on-surface-variant font-semibold bg-white/5 px-3 py-1.5 rounded-full">
                          <span className="material-symbols-outlined text-[13px] text-[#6FFB85]">local_fire_department</span> {todayWorkout.kcal} kcal
                        </span>
                        <span className="flex items-center gap-1 text-[11px] text-on-surface-variant font-semibold bg-white/5 px-3 py-1.5 rounded-full">
                          <span className="material-symbols-outlined text-[13px] text-[#64B5F6]">fitness_center</span> {exerciseCount} moves
                        </span>
                      </div>

                      {/* Rich description */}
                      {todayWorkout.description && (
                        <p className="text-on-surface-variant text-[12.5px] leading-relaxed mb-4 border-l-2 border-primary/30 pl-3 italic">
                          {todayWorkout.description}
                        </p>
                      )}

                      {/* Warmup info */}
                      {todayWorkout.warmupInfo && (
                        <div className="bg-[#ff9800]/5 border border-[#ff9800]/15 rounded-xl p-3 flex gap-3 items-start mb-4">
                          <span className="material-symbols-outlined text-[#ff9800] text-[16px] mt-0.5 animate-pulse">whatshot</span>
                          <div>
                            <span className="text-[9px] uppercase font-bold tracking-[0.15em] text-[#ff9800] block mb-0.5">Warm-Up Required</span>
                            <p className="text-[11px] text-on-surface-variant leading-relaxed">{todayWorkout.warmupInfo}</p>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>

              {/* Target muscles */}
              {!isRestDay && todayWorkout.targetMuscles && todayWorkout.targetMuscles.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {todayWorkout.targetMuscles.map((m: string, i: number) => (
                    <span key={i} className="px-2.5 py-1 bg-primary/8 border border-primary/15 rounded-full text-[9px] text-primary font-bold uppercase tracking-wider">
                      {m}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* ─── Muscle Heatmap ─── */}
            {!isRestDay && allWorkoutMuscles.length > 0 && (
              <>
                <div className="mx-6 h-px bg-white/5"></div>
                <div className="px-6 py-5">
                  <div className="flex items-center gap-1.5 mb-4">
                    <span className="material-symbols-outlined text-[14px] text-primary">accessibility_new</span>
                    <span className="text-[9px] uppercase font-bold tracking-[0.2em] text-on-surface-variant">Muscle Activation Map</span>
                  </div>
                  <div className="bg-black/20 rounded-2xl border border-white/[0.04] p-4 flex items-center justify-center">
                    <MuscleHeatmap muscles={allWorkoutMuscles} size={130} />
                  </div>
                  {/* Legend */}
                  <div className="flex items-center justify-center gap-4 mt-3">
                    <div className="flex items-center gap-1.5">
                      <div className="w-2.5 h-2.5 rounded-full bg-gradient-to-r from-[#FF7A00] to-[#FF4500] shadow-[0_0_6px_rgba(255,122,0,0.5)]"></div>
                      <span className="text-[9px] text-on-surface-variant/60 font-medium">Active</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="w-2.5 h-2.5 rounded-full bg-white/5 border border-white/10"></div>
                      <span className="text-[9px] text-on-surface-variant/60 font-medium">Inactive</span>
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* Divider */}
            <div className="mx-6 h-px bg-white/5"></div>

            {/* ─── Exercise List ─── */}
            {!isRestDay && exerciseCount > 0 && (
              <div className="p-4 space-y-2">
                <span className="text-[9px] uppercase font-bold tracking-[0.2em] text-on-surface-variant px-2 mb-1 block">{exerciseCount} Exercises</span>
                {todayWorkout.exercises.map((ex, i) => {
                  const isExpanded = expandedExIdx === i;
                  const validVid = ex.videoUrl ? resolveValidVideo(ex.videoUrl) : '';
                  return (
                  <div
                    key={`${selectedDay}-${i}`}
                    className={`animate-exercise-enter rounded-xl border transition-all duration-300 overflow-hidden ${
                      isExpanded
                        ? 'bg-[var(--color-surface-container)] border-primary/20 shadow-lg'
                        : 'bg-[var(--color-surface-container-low)] border-white/[0.03] hover:border-white/10 hover:shadow-md'
                    }`}
                    style={{ animationDelay: `${i * 60}ms` }}
                  >
                    {/* ── Collapsed Row (always visible) ── */}
                    <div
                      className="flex items-center gap-3 py-2.5 px-3 cursor-pointer group"
                      onClick={() => setExpandedExIdx(isExpanded ? null : i)}
                    >
                      {/* Number badge */}
                      <div className={`w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors ${
                        isExpanded ? 'bg-primary text-black' : 'bg-primary/8 text-primary'
                      }`}>
                        <span className="text-[10px] font-black">{i + 1}</span>
                      </div>
                      {/* Thumbnail */}
                      <div className="w-11 h-11 rounded-xl bg-black/40 overflow-hidden flex-shrink-0 border border-white/5 group-hover:border-primary/20 transition-colors">
                        {ex.imageUrl ? (
                          <img src={ex.imageUrl} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300" alt={ex.name} />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <span className="material-symbols-outlined text-white/20 text-sm">fitness_center</span>
                          </div>
                        )}
                      </div>
                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <p className={`font-semibold text-[13px] truncate transition-colors ${isExpanded ? 'text-primary' : 'text-on-surface group-hover:text-primary'}`}>{ex.name}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <p className="text-[10px] text-primary/80 font-bold">{ex.reps}</p>
                          {ex.muscles.length > 0 && (
                            <>
                              <span className="text-white/10">·</span>
                              <p className="text-[10px] text-on-surface-variant/60 truncate">{ex.muscles.slice(0, 2).join(', ')}</p>
                            </>
                          )}
                        </div>
                      </div>
                      {/* Expand chevron */}
                      <span className={`material-symbols-outlined text-on-surface-variant/40 text-[18px] transition-transform duration-300 flex-shrink-0 ${isExpanded ? 'rotate-180 text-primary' : ''}`}>
                        expand_more
                      </span>
                    </div>

                    {/* ── Expanded Content ── */}
                    {isExpanded && (
                      <div className="px-4 pb-4 pt-1 space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
                        {/* Divider */}
                        <div className="h-px bg-white/5 -mx-1"></div>

                        {/* Description */}
                        {ex.description && (
                          <p className="text-on-surface-variant text-[12px] leading-relaxed">
                            {ex.description}
                          </p>
                        )}

                        {/* Video thumbnail */}
                        {validVid && (
                          <div className="w-full aspect-video rounded-xl overflow-hidden border border-white/10 bg-black relative group/vid">
                            <img
                              src={`https://img.youtube.com/vi/${validVid}/hqdefault.jpg`}
                              alt={ex.name}
                              className="w-full h-full object-cover opacity-80 group-hover/vid:opacity-100 transition-opacity"
                            />
                            <div className="absolute inset-0 flex items-center justify-center">
                              <div className="w-12 h-12 rounded-full bg-black/60 backdrop-blur-sm flex items-center justify-center border border-white/20 group-hover/vid:scale-110 transition-transform">
                                <span className="material-symbols-outlined text-white text-xl ml-0.5">play_arrow</span>
                              </div>
                            </div>
                            <div className="absolute bottom-2 left-2 bg-black/70 backdrop-blur-sm px-2 py-0.5 rounded text-[8px] font-bold text-white/80 uppercase tracking-wider flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-[#FF0000]"></span> Form Guide
                            </div>
                          </div>
                        )}

                        {/* Tips */}
                        {ex.tips && (
                          <div className="bg-[#FFD700]/5 border border-[#FFD700]/15 rounded-lg p-3 flex gap-2.5 items-start">
                            <span className="material-symbols-outlined text-[#FFD700] text-[14px] mt-0.5">tips_and_updates</span>
                            <div>
                              <span className="text-[8px] uppercase font-bold tracking-[0.15em] text-[#FFD700] block mb-0.5">Form Tip</span>
                              <p className="text-[11px] text-on-surface-variant leading-relaxed">{ex.tips}</p>
                            </div>
                          </div>
                        )}

                        {/* Muscles */}
                        {ex.muscles.length > 0 && (
                          <div>
                            <span className="text-[8px] uppercase font-bold tracking-[0.15em] text-on-surface-variant/50 block mb-1.5">Target Muscles</span>
                            <div className="flex flex-wrap gap-1.5">
                              {ex.muscles.map((m, mi) => (
                                <span key={mi} className="px-2 py-0.5 bg-primary/8 border border-primary/15 rounded-full text-[9px] text-primary font-semibold">
                                  {m}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Detailed view button */}
                        <button
                          onClick={(e) => { e.stopPropagation(); setAnalyzingExercise(ex); setMode('analyze'); }}
                          className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-lg bg-primary/8 text-primary hover:bg-primary/15 transition-colors text-[11px] font-semibold"
                        >
                          <span className="material-symbols-outlined text-[14px]">info</span> View Full Breakdown
                        </button>
                      </div>
                    )}
                  </div>
                  );
                })}

                {/* Pro tip */}
                {todayWorkout.tip && (
                  <div className="mt-3 bg-secondary/5 border border-secondary/15 rounded-xl p-3 flex gap-3 items-start animate-exercise-enter" style={{ animationDelay: `${exerciseCount * 60 + 100}ms` }}>
                    <span className="material-symbols-outlined text-secondary text-[16px] mt-0.5">lightbulb</span>
                    <div>
                      <span className="text-[9px] uppercase font-bold tracking-[0.15em] text-secondary block mb-0.5">Pro Tip</span>
                      <p className="text-[11px] text-on-surface-variant leading-relaxed">{todayWorkout.tip}</p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Action buttons */}
            <div className="px-4 pb-4 pt-2 space-y-3">
              {/* Start / Mark Done CTA */}
              <button onClick={startWorkoutSession} className={`w-full py-4 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 active:scale-[0.98] transition-all ${
                isRestDay
                  ? 'bg-white/5 text-on-surface-variant border border-white/5 hover:bg-white/10'
                  : 'bg-primary text-black shadow-[0_4px_20px_rgba(255,122,0,0.25)] hover:shadow-[0_8px_30px_rgba(255,122,0,0.35)]'
              }`}>
                <span className="material-symbols-outlined text-lg">{isRestDay ? 'check_circle' : 'play_arrow'}</span>
                {isRestDay ? 'Mark as Done' : 'Start Workout'}
              </button>

              {/* Secondary actions row */}
              <div className="flex gap-2">
                <button onClick={() => { setEditingWorkout(todayWorkout); setEditingWorkoutIdx(selectedDay); setMode('edit'); }} className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 transition-colors text-[11px] font-semibold text-on-surface-variant">
                  <span className="material-symbols-outlined text-[14px]">edit</span> Edit
                </button>
                <button onClick={(e) => duplicateWorkout(e, selectedDay)} className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 transition-colors text-[11px] font-semibold text-on-surface-variant">
                  <span className="material-symbols-outlined text-[14px]">content_copy</span> Copy
                </button>
                <button onClick={(e) => deleteWorkout(e, selectedDay)} className="w-10 flex items-center justify-center py-2.5 rounded-xl bg-[#FF4D4D]/8 text-[#FF4D4D] hover:bg-[#FF4D4D]/15 transition-colors">
                  <span className="material-symbols-outlined text-[16px]">delete</span>
                </button>
              </div>
            </div>
          </div>
        </section>
      )}



      <button onClick={addNewDay} className="w-full py-4 rounded-2xl border-2 border-dashed border-[var(--color-outline)] text-on-surface-variant hover:border-primary/40 hover:text-primary transition-colors flex items-center justify-center gap-2 text-sm font-semibold mt-2 mb-6">
        <span className="material-symbols-outlined text-lg">add</span> Add Day
      </button>
    </main>
  );
}
