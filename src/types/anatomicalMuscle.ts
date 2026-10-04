// ─────────────────────────────────────────────────────────────
// MyFitAI — Granular Anatomical Muscle Taxonomy & Types
// High-resolution muscle mapping covering 30+ distinct anatomical regions
// with biomechanical roles, hypertrophy volume landmarks, and recovery rates.
// ─────────────────────────────────────────────────────────────

import type { MuscleGroup } from './exercise';

export type AnatomicalRegion =
  | 'chest'
  | 'shoulders'
  | 'back'
  | 'arms'
  | 'forearms'
  | 'core'
  | 'glutes'
  | 'quadriceps'
  | 'hamstrings'
  | 'calves'
  | 'adductors';

export type MuscleRole = 'primary' | 'synergist' | 'stabilizer';

export type RecoveryState = 'fresh' | 'recovering' | 'fatigued' | 'overreached';

export interface AnatomicalMuscleInfo {
  id: string; // e.g., 'chest_upper'
  commonName: string; // 'Upper Chest'
  anatomicalName: string; // 'Clavicular Pectoralis Major'
  region: AnatomicalRegion;
  canonicalGroup: MuscleGroup;
  view: 'front' | 'back' | 'both';
  typicalRecoveryHours: number; // e.g. 48h
  // Hypertrophy volume benchmarks (weekly direct/indirect sets)
  minEffectiveVolume: number; // MEV (e.g. 6-8 sets)
  maxAdaptiveVolume: number; // MAV (e.g. 12-18 sets)
  maxRecoverableVolume: number; // MRV (e.g. 22 sets)
  functionDescription: string;
}

export const ANATOMICAL_MUSCLES: Record<string, AnatomicalMuscleInfo> = {
  // ── CHEST ──
  chest_upper: {
    id: 'chest_upper',
    commonName: 'Upper Chest',
    anatomicalName: 'Clavicular Pectoralis Major',
    region: 'chest',
    canonicalGroup: 'chest',
    view: 'front',
    typicalRecoveryHours: 48,
    minEffectiveVolume: 6,
    maxAdaptiveVolume: 14,
    maxRecoverableVolume: 20,
    functionDescription: 'Shoulder flexion & horizontal adduction (incline pressing, low-to-high cable flys).',
  },
  chest_mid: {
    id: 'chest_mid',
    commonName: 'Mid Chest',
    anatomicalName: 'Sternal Pectoralis Major',
    region: 'chest',
    canonicalGroup: 'chest',
    view: 'front',
    typicalRecoveryHours: 48,
    minEffectiveVolume: 8,
    maxAdaptiveVolume: 16,
    maxRecoverableVolume: 22,
    functionDescription: 'Horizontal adduction across the torso (flat bench press, dumbbell press, push-ups).',
  },
  chest_lower: {
    id: 'chest_lower',
    commonName: 'Lower Chest',
    anatomicalName: 'Costal Pectoralis Major',
    region: 'chest',
    canonicalGroup: 'chest',
    view: 'front',
    typicalRecoveryHours: 48,
    minEffectiveVolume: 4,
    maxAdaptiveVolume: 12,
    maxRecoverableVolume: 18,
    functionDescription: 'Humeral depression & adduction (dips, decline press, high-to-low cable crossovers).',
  },

  // ── SHOULDERS ──
  delts_anterior: {
    id: 'delts_anterior',
    commonName: 'Front Deltoid',
    anatomicalName: 'Anterior Deltoid',
    region: 'shoulders',
    canonicalGroup: 'shoulders',
    view: 'front',
    typicalRecoveryHours: 48,
    minEffectiveVolume: 6,
    maxAdaptiveVolume: 12,
    maxRecoverableVolume: 18,
    functionDescription: 'Arm flexion and internal rotation (overhead press, incline press, front raises).',
  },
  delts_lateral: {
    id: 'delts_lateral',
    commonName: 'Lateral Deltoid',
    anatomicalName: 'Lateral / Medial Deltoid',
    region: 'shoulders',
    canonicalGroup: 'shoulders',
    view: 'both',
    typicalRecoveryHours: 36,
    minEffectiveVolume: 8,
    maxAdaptiveVolume: 18,
    maxRecoverableVolume: 26,
    functionDescription: 'Shoulder abduction between 15° and 90° (lateral raises, upright rows, face pulls).',
  },
  delts_posterior: {
    id: 'delts_posterior',
    commonName: 'Rear Deltoid',
    anatomicalName: 'Posterior Deltoid',
    region: 'shoulders',
    canonicalGroup: 'shoulders',
    view: 'back',
    typicalRecoveryHours: 36,
    minEffectiveVolume: 8,
    maxAdaptiveVolume: 16,
    maxRecoverableVolume: 22,
    functionDescription: 'Horizontal abduction & external rotation (face pulls, reverse pec deck, bent-over flys).',
  },

  // ── BACK ──
  traps_upper: {
    id: 'traps_upper',
    commonName: 'Upper Traps',
    anatomicalName: 'Descending Trapezius',
    region: 'back',
    canonicalGroup: 'traps',
    view: 'both',
    typicalRecoveryHours: 36,
    minEffectiveVolume: 6,
    maxAdaptiveVolume: 14,
    maxRecoverableVolume: 20,
    functionDescription: 'Scapular elevation and upward rotation (shrugs, deadlifts, farmers walks).',
  },
  traps_lower: {
    id: 'traps_lower',
    commonName: 'Mid & Lower Traps',
    anatomicalName: 'Transverse & Ascending Trapezius',
    region: 'back',
    canonicalGroup: 'traps',
    view: 'back',
    typicalRecoveryHours: 48,
    minEffectiveVolume: 6,
    maxAdaptiveVolume: 14,
    maxRecoverableVolume: 20,
    functionDescription: 'Scapular retraction and depression (Y-raises, chest-supported rows, prone trap raises).',
  },
  lats: {
    id: 'lats',
    commonName: 'Latissimus Dorsi',
    anatomicalName: 'Latissimus Dorsi',
    region: 'back',
    canonicalGroup: 'lats',
    view: 'back',
    typicalRecoveryHours: 48,
    minEffectiveVolume: 8,
    maxAdaptiveVolume: 16,
    maxRecoverableVolume: 22,
    functionDescription: 'Shoulder extension, adduction, and internal rotation (pull-ups, lat pulldowns, single-arm rows).',
  },
  rhomboids: {
    id: 'rhomboids',
    commonName: 'Rhomboids',
    anatomicalName: 'Rhomboid Major & Minor',
    region: 'back',
    canonicalGroup: 'back',
    view: 'back',
    typicalRecoveryHours: 48,
    minEffectiveVolume: 6,
    maxAdaptiveVolume: 14,
    maxRecoverableVolume: 20,
    functionDescription: 'Scapular retraction, elevation, and downward rotation (barbell rows, cable seated rows).',
  },
  erector_spinae: {
    id: 'erector_spinae',
    commonName: 'Spinal Erectors',
    anatomicalName: 'Erector Spinae',
    region: 'back',
    canonicalGroup: 'back',
    view: 'back',
    typicalRecoveryHours: 72,
    minEffectiveVolume: 6,
    maxAdaptiveVolume: 12,
    maxRecoverableVolume: 16,
    functionDescription: 'Spinal extension and anti-flexion stabilization (deadlifts, back extensions, good mornings).',
  },

  // ── ARMS ──
  biceps_long: {
    id: 'biceps_long',
    commonName: 'Outer Bicep',
    anatomicalName: 'Biceps Brachii (Long Head)',
    region: 'arms',
    canonicalGroup: 'biceps',
    view: 'front',
    typicalRecoveryHours: 36,
    minEffectiveVolume: 8,
    maxAdaptiveVolume: 16,
    maxRecoverableVolume: 22,
    functionDescription: 'Elbow flexion & supination with emphasis on bicep peak (incline dumbbell curls, drag curls).',
  },
  biceps_short: {
    id: 'biceps_short',
    commonName: 'Inner Bicep',
    anatomicalName: 'Biceps Brachii (Short Head)',
    region: 'arms',
    canonicalGroup: 'biceps',
    view: 'front',
    typicalRecoveryHours: 36,
    minEffectiveVolume: 8,
    maxAdaptiveVolume: 16,
    maxRecoverableVolume: 22,
    functionDescription: 'Elbow flexion with emphasis on arm thickness (preacher curls, spider curls).',
  },
  brachialis: {
    id: 'brachialis',
    commonName: 'Brachialis',
    anatomicalName: 'Musculus Brachialis',
    region: 'arms',
    canonicalGroup: 'biceps',
    view: 'front',
    typicalRecoveryHours: 36,
    minEffectiveVolume: 6,
    maxAdaptiveVolume: 14,
    maxRecoverableVolume: 20,
    functionDescription: 'Pure elbow flexion regardless of forearm rotation (hammer curls, reverse curls).',
  },
  triceps_long: {
    id: 'triceps_long',
    commonName: 'Triceps Long Head',
    anatomicalName: 'Triceps Brachii (Long Head)',
    region: 'arms',
    canonicalGroup: 'triceps',
    view: 'back',
    typicalRecoveryHours: 48,
    minEffectiveVolume: 6,
    maxAdaptiveVolume: 14,
    maxRecoverableVolume: 20,
    functionDescription: 'Elbow extension and shoulder extension (overhead tricep extensions, skull crushers).',
  },
  triceps_lateral: {
    id: 'triceps_lateral',
    commonName: 'Triceps Lateral & Medial Head',
    anatomicalName: 'Triceps Brachii (Lateral & Medial Head)',
    region: 'arms',
    canonicalGroup: 'triceps',
    view: 'both',
    typicalRecoveryHours: 36,
    minEffectiveVolume: 6,
    maxAdaptiveVolume: 14,
    maxRecoverableVolume: 20,
    functionDescription: 'Elbow extension lockout (tricep rope pushdowns, close-grip bench press, dips).',
  },
  forearms_flexors: {
    id: 'forearms_flexors',
    commonName: 'Forearm Flexors & Grip',
    anatomicalName: 'Anterior Compartment of Forearm',
    region: 'forearms',
    canonicalGroup: 'forearms',
    view: 'front',
    typicalRecoveryHours: 24,
    minEffectiveVolume: 6,
    maxAdaptiveVolume: 16,
    maxRecoverableVolume: 24,
    functionDescription: 'Wrist flexion and finger grip power (dead hangs, wrist curls, heavy carries).',
  },
  forearms_extensors: {
    id: 'forearms_extensors',
    commonName: 'Forearm Extensors',
    anatomicalName: 'Posterior Compartment of Forearm',
    region: 'forearms',
    canonicalGroup: 'forearms',
    view: 'back',
    typicalRecoveryHours: 24,
    minEffectiveVolume: 4,
    maxAdaptiveVolume: 12,
    maxRecoverableVolume: 18,
    functionDescription: 'Wrist extension and radial deviation (reverse curls, wrist extensions).',
  },

  // ── CORE ──
  abs_upper: {
    id: 'abs_upper',
    commonName: 'Upper Abs',
    anatomicalName: 'Upper Rectus Abdominis',
    region: 'core',
    canonicalGroup: 'core',
    view: 'front',
    typicalRecoveryHours: 36,
    minEffectiveVolume: 6,
    maxAdaptiveVolume: 14,
    maxRecoverableVolume: 20,
    functionDescription: 'Spinal flexion from the ribcage downward (crunches, cable kneeling crunches).',
  },
  abs_lower: {
    id: 'abs_lower',
    commonName: 'Lower Abs',
    anatomicalName: 'Lower Rectus Abdominis',
    region: 'core',
    canonicalGroup: 'core',
    view: 'front',
    typicalRecoveryHours: 36,
    minEffectiveVolume: 6,
    maxAdaptiveVolume: 14,
    maxRecoverableVolume: 20,
    functionDescription: 'Posterior pelvic tilt and hip flexion support (hanging leg raises, reverse crunches).',
  },
  obliques: {
    id: 'obliques',
    commonName: 'Obliques',
    anatomicalName: 'External & Internal Obliques',
    region: 'core',
    canonicalGroup: 'core',
    view: 'both',
    typicalRecoveryHours: 36,
    minEffectiveVolume: 6,
    maxAdaptiveVolume: 14,
    maxRecoverableVolume: 20,
    functionDescription: 'Lateral flexion and torso rotation (Russian twists, side planks, woodchoppers).',
  },

  // ── GLUTES ──
  glute_max: {
    id: 'glute_max',
    commonName: 'Gluteus Maximus',
    anatomicalName: 'Gluteus Maximus',
    region: 'glutes',
    canonicalGroup: 'glutes',
    view: 'back',
    typicalRecoveryHours: 48,
    minEffectiveVolume: 6,
    maxAdaptiveVolume: 16,
    maxRecoverableVolume: 22,
    functionDescription: 'Hip extension and external rotation (hip thrusts, squats, Romanian deadlifts).',
  },
  glute_med: {
    id: 'glute_med',
    commonName: 'Gluteus Medius',
    anatomicalName: 'Gluteus Medius & Minimus',
    region: 'glutes',
    canonicalGroup: 'glutes',
    view: 'both',
    typicalRecoveryHours: 36,
    minEffectiveVolume: 6,
    maxAdaptiveVolume: 14,
    maxRecoverableVolume: 20,
    functionDescription: 'Hip abduction and pelvic stabilization during unilateral stance (abductor machine, lateral lunges).',
  },

  // ── QUADRICEPS ──
  quads_rectus_femoris: {
    id: 'quads_rectus_femoris',
    commonName: 'Mid Quad',
    anatomicalName: 'Rectus Femoris',
    region: 'quadriceps',
    canonicalGroup: 'quads',
    view: 'front',
    typicalRecoveryHours: 48,
    minEffectiveVolume: 8,
    maxAdaptiveVolume: 16,
    maxRecoverableVolume: 22,
    functionDescription: 'Dual-joint knee extension and hip flexion (leg extensions, sissy squats).',
  },
  quads_vastus: {
    id: 'quads_vastus',
    commonName: 'Outer & Inner Quad',
    anatomicalName: 'Vastus Lateralis & Vastus Medialis',
    region: 'quadriceps',
    canonicalGroup: 'quads',
    view: 'front',
    typicalRecoveryHours: 48,
    minEffectiveVolume: 8,
    maxAdaptiveVolume: 18,
    maxRecoverableVolume: 24,
    functionDescription: 'Knee extension sweep and teardrop stabilization (barbell squats, leg press, hack squats).',
  },
  adductors: {
    id: 'adductors',
    commonName: 'Inner Thigh / Adductors',
    anatomicalName: 'Adductor Longus, Brevis & Magnus',
    region: 'adductors',
    canonicalGroup: 'adductors',
    view: 'front',
    typicalRecoveryHours: 48,
    minEffectiveVolume: 4,
    maxAdaptiveVolume: 12,
    maxRecoverableVolume: 18,
    functionDescription: 'Hip adduction and stabilization during deep flexion (sumo squats, adductor machine, copenhagen planks).',
  },

  // ── HAMSTRINGS ──
  hamstrings_lateral: {
    id: 'hamstrings_lateral',
    commonName: 'Outer Hamstring',
    anatomicalName: 'Biceps Femoris',
    region: 'hamstrings',
    canonicalGroup: 'hamstrings',
    view: 'back',
    typicalRecoveryHours: 48,
    minEffectiveVolume: 6,
    maxAdaptiveVolume: 14,
    maxRecoverableVolume: 20,
    functionDescription: 'Knee flexion and external rotation (seated & lying leg curls).',
  },
  hamstrings_medial: {
    id: 'hamstrings_medial',
    commonName: 'Inner Hamstring',
    anatomicalName: 'Semitendinosus & Semimembranosus',
    region: 'hamstrings',
    canonicalGroup: 'hamstrings',
    view: 'back',
    typicalRecoveryHours: 48,
    minEffectiveVolume: 6,
    maxAdaptiveVolume: 14,
    maxRecoverableVolume: 20,
    functionDescription: 'Hip extension and knee flexion (Romanian deadlifts, good mornings, glute-ham raises).',
  },

  // ── CALVES ──
  calves_gastrocnemius: {
    id: 'calves_gastrocnemius',
    commonName: 'Upper Calf (Gastrocnemius)',
    anatomicalName: 'Gastrocnemius (Medial & Lateral)',
    region: 'calves',
    canonicalGroup: 'calves',
    view: 'both',
    typicalRecoveryHours: 36,
    minEffectiveVolume: 8,
    maxAdaptiveVolume: 16,
    maxRecoverableVolume: 22,
    functionDescription: 'Ankle plantarflexion with straight knee (standing calf raises, donkey calf raises).',
  },
  calves_soleus: {
    id: 'calves_soleus',
    commonName: 'Lower Calf & Soleus',
    anatomicalName: 'Soleus & Achilles Tendon',
    region: 'calves',
    canonicalGroup: 'calves',
    view: 'back',
    typicalRecoveryHours: 24,
    minEffectiveVolume: 6,
    maxAdaptiveVolume: 14,
    maxRecoverableVolume: 20,
    functionDescription: 'Ankle plantarflexion with bent knee (seated calf raises).',
  },
  tibialis: {
    id: 'tibialis',
    commonName: 'Shin (Tibialis Anterior)',
    anatomicalName: 'Tibialis Anterior',
    region: 'calves',
    canonicalGroup: 'calves',
    view: 'front',
    typicalRecoveryHours: 24,
    minEffectiveVolume: 4,
    maxAdaptiveVolume: 10,
    maxRecoverableVolume: 16,
    functionDescription: 'Ankle dorsiflexion and foot inversion (tibialis raises, heel walking).',
  },
};

/**
 * Maps standard MuscleGroup key to an array of granular anatomical muscle IDs.
 */
export const GROUP_TO_ANATOMICAL_MAP: Record<MuscleGroup, string[]> = {
  chest: ['chest_upper', 'chest_mid', 'chest_lower'],
  shoulders: ['delts_anterior', 'delts_lateral', 'delts_posterior'],
  biceps: ['biceps_long', 'biceps_short', 'brachialis'],
  triceps: ['triceps_long', 'triceps_lateral'],
  forearms: ['forearms_flexors', 'forearms_extensors'],
  core: ['abs_upper', 'abs_lower', 'obliques'],
  quads: ['quads_rectus_femoris', 'quads_vastus'],
  hamstrings: ['hamstrings_lateral', 'hamstrings_medial'],
  glutes: ['glute_max', 'glute_med'],
  calves: ['calves_gastrocnemius', 'calves_soleus', 'tibialis'],
  traps: ['traps_upper', 'traps_lower'],
  lats: ['lats'],
  back: ['rhomboids', 'erector_spinae'],
  hip_flexors: ['quads_rectus_femoris', 'abs_lower'],
  adductors: ['adductors'],
  abductors: ['glute_med'],
  full_body: [
    'chest_mid',
    'delts_anterior',
    'delts_lateral',
    'lats',
    'biceps_long',
    'triceps_lateral',
    'abs_upper',
    'quads_vastus',
    'hamstrings_medial',
    'glute_max',
    'calves_gastrocnemius',
  ],
};

/**
 * Aggregated training metrics for a specific anatomical muscle
 */
export interface MuscleTrainingMetric {
  muscleId: string;
  info: AnatomicalMuscleInfo;
  primarySets: number;
  synergistSets: number;
  effectiveSets: number; // primary + 0.5 * synergist
  volumeLoadKg: number;
  lastTrainedDate: string | null;
  hoursSinceLastTrained: number | null;
  recoveryPercentage: number; // 0 to 100
  recoveryState: RecoveryState;
  targetRole: MuscleRole | null;
  contributingExercises: Array<{
    exerciseId: string;
    exerciseName: string;
    role: MuscleRole;
    sets: number;
    volumeLoadKg: number;
    lastTrainedDate: string;
  }>;
}

/**
 * Muscle balance metrics
 */
export interface MuscleBalanceSummary {
  pushSets: number;
  pullSets: number;
  pushPullRatio: number; // optimal ~1.0
  quadSets: number;
  hamstringSets: number;
  quadHamstringRatio: number; // optimal ~1.0 to 1.3
  anteriorDeltSets: number;
  posteriorDeltSets: number;
  deltBalanceRatio: number; // optimal ~1.0
  totalWeeklySets: number;
  mostTrainedRegion: string;
  leastTrainedRegion: string;
}
