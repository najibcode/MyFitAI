// ─────────────────────────────────────────────────────────────
// MyFitAI — Workout Builder & Active Session Context (Enhanced)
// Manages template creation, routines, scheduling, active session
// tracking, PR detection, crash recovery, and Wake Lock API.
// ─────────────────────────────────────────────────────────────

import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { db } from '../utils/db';
import { storage } from '../utils/storage';
import type {
  WorkoutTemplate,
  WorkoutSession,
  SessionExercise,
  LoggedSet,
  PRRecord,
  WorkoutType,
  Routine,
  ScheduleOverride,
  EffortMode,
  ProgressionRule,
} from '../types/workout';
import { calculateSessionVolume, createDefaultLoggedSet, DEFAULT_PROGRESSION } from '../types/workout';
import type { MuscleGroup, ExerciseType } from '../types/exercise';
import { detectPR, detectSessionPRs } from '../engine/prDetection';
import { getProgressionRecommendation, countConsecutiveFailures, type ProgressionRecommendation } from '../engine/progression';
import { audioFeedback } from '../utils/audioTones';
import { QUICK_SPLIT_PRESETS, buildQuickTemplate } from '../data/quickWorkoutSplits';

// ─── Types ─────────────────────────────────────────────────

interface RestTimerState {
  remaining: number;
  total: number;
  paused: boolean;
}

interface WorkoutBuilderContextType {
  // Templates
  templates: WorkoutTemplate[];
  loadTemplates: () => Promise<void>;
  saveTemplate: (template: WorkoutTemplate) => Promise<void>;
  deleteTemplate: (id: string) => Promise<void>;
  duplicateTemplate: (id: string) => Promise<WorkoutTemplate | null>;

  // Routines
  routines: Routine[];
  activeRoutine: Routine | null;
  loadRoutines: () => Promise<void>;
  saveRoutine: (routine: Routine) => Promise<void>;
  deleteRoutine: (id: string) => Promise<void>;
  setActiveRoutine: (id: string | null) => Promise<void>;

  // Schedule Overrides
  scheduleOverrides: ScheduleOverride[];
  loadScheduleOverrides: () => Promise<void>;
  addScheduleOverride: (override: ScheduleOverride) => Promise<void>;
  removeScheduleOverride: (id: string) => Promise<void>;
  getTodaysWorkout: () => { templateId?: string; label: string; isRest: boolean } | null;

  // Active Session
  activeSession: WorkoutSession | null;
  isSessionActive: boolean;
  sessionElapsed: number;
  startSession: (template?: WorkoutTemplate, customName?: string) => void;
  endSession: () => Promise<WorkoutSession | null>;
  cancelSession: () => void;
  updateSessionNotes: (notes: string) => void;
  updateWorkoutName: (name: string) => void;
  saveCompletedSession: (session: WorkoutSession) => Promise<WorkoutSession>;

  // Set Logging
  logSet: (exerciseIdx: number, setIdx: number, set: LoggedSet) => void;
  addSetToExercise: (exerciseIdx: number) => void;
  removeSet: (exerciseIdx: number, setIdx: number) => void;
  prependWarmupSets: (exerciseIdx: number, warmupSets: LoggedSet[]) => void;
  updateExerciseNotes: (exerciseIdx: number, notes: string) => void;
  addExerciseToSession: (exercise: SessionExercise) => void;
  addMultipleExercisesToSession: (exercises: SessionExercise[]) => void;
  removeExerciseFromSession: (exerciseIdx: number) => void;
  reorderExercisesInSession: (from: number, to: number) => void;
  toggleExerciseSuperset: (exIdx: number) => void;

  // Rest Timer
  restTimer: RestTimerState | null;
  startRestTimer: (seconds: number) => void;
  pauseRestTimer: () => void;
  resumeRestTimer: () => void;
  skipRest: () => void;
  addRestTime: (seconds: number) => void;

  // PR Detection
  personalRecords: Map<string, PRRecord[]>;
  loadPRs: () => Promise<void>;
  checkForPR: (exerciseId: string, exerciseName: string, weight: number, reps: number, sessionId: string) => PRRecord | null;

  // Progression
  getProgressionRec: (exerciseId: string, exerciseType: ExerciseType, rule?: ProgressionRule) => ProgressionRecommendation;

  // History
  sessions: WorkoutSession[];
  loadSessions: () => Promise<void>;
  deleteSession: (id: string) => Promise<void>;
  updateSession: (session: WorkoutSession) => Promise<void>;

  // Previous session data for ghost values
  getPreviousSessionData: (exerciseId: string) => { reps: number; weight: number; rpe: number; duration?: number; distance?: number }[];

  // Effort mode
  effortMode: EffortMode;
  setEffortMode: (mode: EffortMode) => void;

  // Data Export / Import
  exportAllData: () => Promise<string>;
  importData: (jsonStr: string) => Promise<{ success: boolean; error?: string }>;
}

const WorkoutBuilderContext = createContext<WorkoutBuilderContextType | undefined>(undefined);

const CRASH_RECOVERY_KEY = 'active_session_backup';
const PR_STORAGE_KEY = 'personal_records';
const EFFORT_MODE_KEY = 'effort_mode';

export function WorkoutBuilderProvider({ children }: { children: React.ReactNode }) {
  // ─── State ────────────────────────────────────────────────
  const [templates, setTemplates] = useState<WorkoutTemplate[]>([]);
  const [sessions, setSessions] = useState<WorkoutSession[]>([]);
  const [routines, setRoutines] = useState<Routine[]>([]);
  const [activeRoutine, setActiveRoutineState] = useState<Routine | null>(null);
  const [scheduleOverrides, setScheduleOverrides] = useState<ScheduleOverride[]>([]);
  const [activeSession, setActiveSession] = useState<WorkoutSession | null>(null);
  const [sessionElapsed, setSessionElapsed] = useState(0);
  const [restTimer, setRestTimer] = useState<RestTimerState | null>(null);
  const [personalRecords, setPersonalRecords] = useState<Map<string, PRRecord[]>>(new Map());
  const [effortMode, setEffortModeState] = useState<EffortMode>(() => {
    return storage.get<EffortMode>(EFFORT_MODE_KEY) || 'off';
  });

  const wakeLockRef = useRef<WakeLockSentinel | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const restTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const isSessionActive = activeSession !== null;

  // ─── Load Data on Mount ───────────────────────────────────

  useEffect(() => {
    loadTemplates();
    loadSessions();
    loadPRs();
    loadRoutines();
    loadScheduleOverrides();

    // Check for crash recovery
    const backup = storage.get<WorkoutSession>(CRASH_RECOVERY_KEY);
    if (backup && !activeSession) {
      setActiveSession(backup);
      const elapsed = Math.floor((Date.now() - new Date(backup.startedAt).getTime()) / 1000);
      setSessionElapsed(elapsed);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ─── Session Timer ────────────────────────────────────────

  useEffect(() => {
    if (isSessionActive) {
      timerRef.current = setInterval(() => {
        setSessionElapsed(prev => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isSessionActive]);

  // ─── Rest Timer ───────────────────────────────────────────

  useEffect(() => {
    const isRunning = restTimer && restTimer.remaining > 0 && !restTimer.paused;
    if (isRunning) {
      restTimerRef.current = setInterval(() => {
        setRestTimer(prev => {
          if (!prev || prev.remaining <= 1) {
            audioFeedback.playTimerComplete();
            if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
            return null;
          }
          if (prev.remaining <= 4) {
            audioFeedback.playCountdownTick();
          }
          return { ...prev, remaining: prev.remaining - 1 };
        });
      }, 1000);
    } else {
      if (restTimerRef.current) {
        clearInterval(restTimerRef.current);
        restTimerRef.current = null;
      }
    }
    return () => {
      if (restTimerRef.current) clearInterval(restTimerRef.current);
    };
  }, [restTimer?.remaining, restTimer?.paused]);

  // ─── Crash Recovery — save active session every 10s ───────

  useEffect(() => {
    if (!activeSession) {
      storage.remove(CRASH_RECOVERY_KEY);
      return;
    }
    // Save immediately and then every 10 seconds
    storage.set(CRASH_RECOVERY_KEY, activeSession);
    const interval = setInterval(() => {
      storage.set(CRASH_RECOVERY_KEY, activeSession);
    }, 10000);
    return () => clearInterval(interval);
  }, [activeSession]);

  // ─── Wake Lock ────────────────────────────────────────────

  const acquireWakeLock = async () => {
    try {
      if ('wakeLock' in navigator) {
        wakeLockRef.current = await navigator.wakeLock.request('screen');
      }
    } catch { /* Wake Lock not supported or denied — not critical */ }
  };

  const releaseWakeLock = () => {
    if (wakeLockRef.current) {
      wakeLockRef.current.release();
      wakeLockRef.current = null;
    }
  };

  // ─── Effort Mode ──────────────────────────────────────────

  const setEffortMode = useCallback((mode: EffortMode) => {
    setEffortModeState(mode);
    storage.set(EFFORT_MODE_KEY, mode);
  }, []);

  // ─── Template Operations ──────────────────────────────────

  const loadTemplates = useCallback(async () => {
    try {
      let all = await db.templates.getAll();
      if (all.length === 0) {
        const defaultTemplates = QUICK_SPLIT_PRESETS
          .filter(p => p.recommendedExercises.length > 0)
          .map(p => buildQuickTemplate(p));
        await db.templates.saveMany(defaultTemplates);
        all = await db.templates.getAll();
      }
      setTemplates(all.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()));
    } catch (e) {
      console.error('[WorkoutBuilder] Failed to load templates:', e);
    }
  }, []);

  const saveTemplate = useCallback(async (template: WorkoutTemplate) => {
    await db.templates.save(template);
    await loadTemplates();
  }, [loadTemplates]);

  const deleteTemplate = useCallback(async (id: string) => {
    await db.templates.delete(id);
    await loadTemplates();
  }, [loadTemplates]);

  const duplicateTemplate = useCallback(async (id: string): Promise<WorkoutTemplate | null> => {
    const original = await db.templates.getById(id);
    if (!original) return null;
    const duplicate: WorkoutTemplate = {
      ...original,
      id: crypto.randomUUID(),
      name: `${original.name} (Copy)`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await db.templates.save(duplicate);
    await loadTemplates();
    return duplicate;
  }, [loadTemplates]);

  // ─── Routine Operations ───────────────────────────────────

  const loadRoutines = useCallback(async () => {
    try {
      const all = await db.routines.getAll();
      setRoutines(all.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()));
      const active = all.find(r => r.isActive);
      setActiveRoutineState(active || null);
    } catch (e) {
      console.error('[WorkoutBuilder] Failed to load routines:', e);
    }
  }, []);

  const saveRoutine = useCallback(async (routine: Routine) => {
    await db.routines.save(routine);
    await loadRoutines();
  }, [loadRoutines]);

  const deleteRoutine = useCallback(async (id: string) => {
    await db.routines.delete(id);
    await loadRoutines();
  }, [loadRoutines]);

  const setActiveRoutine = useCallback(async (id: string | null) => {
    // Deactivate all
    for (const r of routines) {
      if (r.isActive) {
        await db.routines.save({ ...r, isActive: false, updatedAt: new Date().toISOString() });
      }
    }
    // Activate selected
    if (id) {
      const routine = routines.find(r => r.id === id);
      if (routine) {
        await db.routines.save({ ...routine, isActive: true, updatedAt: new Date().toISOString() });
      }
    }
    await loadRoutines();
  }, [routines, loadRoutines]);

  // ─── Schedule Overrides ───────────────────────────────────

  const loadScheduleOverrides = useCallback(async () => {
    try {
      const all = await db.scheduleOverrides.getAll();
      setScheduleOverrides(all);
    } catch (e) {
      console.error('[WorkoutBuilder] Failed to load schedule overrides:', e);
    }
  }, []);

  const addScheduleOverride = useCallback(async (override: ScheduleOverride) => {
    await db.scheduleOverrides.save(override);
    await loadScheduleOverrides();
  }, [loadScheduleOverrides]);

  const removeScheduleOverride = useCallback(async (id: string) => {
    await db.scheduleOverrides.delete(id);
    await loadScheduleOverrides();
  }, [loadScheduleOverrides]);

  const getTodaysWorkout = useCallback(() => {
    if (!activeRoutine) return null;
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    const dayOfWeek = today.getDay();

    // Check for override first
    const override = scheduleOverrides.find(o => o.date === todayStr);
    if (override) {
      if (override.isSkipped) return { label: 'Rest (rescheduled)', isRest: true };
      return {
        templateId: override.newTemplateId,
        label: override.newTemplateLabel || 'Rescheduled',
        isRest: false,
      };
    }

    // Fall back to routine schedule
    const daySlot = activeRoutine.days.find(d => d.dayOfWeek === dayOfWeek);
    if (!daySlot) return { label: 'Rest', isRest: true };
    return {
      templateId: daySlot.templateId,
      label: daySlot.label,
      isRest: daySlot.isRest,
    };
  }, [activeRoutine, scheduleOverrides]);

  // ─── Session Operations ───────────────────────────────────

  const startSession = useCallback((template?: WorkoutTemplate, customName?: string) => {
    const exercises: SessionExercise[] = template
      ? template.exercises.map(ex => ({
          exerciseId: ex.exerciseId,
          exerciseName: ex.exerciseName,
          exerciseType: ex.exerciseType || 'weight_reps',
          thumbnailEmoji: ex.thumbnailEmoji,
          primaryMuscles: ex.primaryMuscles,
          isUnilateral: ex.isUnilateral,
          isBodyweight: ex.isBodyweight,
          supersetGroup: ex.supersetGroup,
          restSeconds: ex.restSeconds,
          notes: ex.notes,
          warmupNotes: ex.warmupNotes,
          gifUrl: ex.gifUrl,
          imageUrl: ex.imageUrl,
          progressionRule: ex.progressionRule,
          sets: ex.sets.map(s => {
            const def = createDefaultLoggedSet(s.setType);
            return {
              ...def,
              reps: s.targetReps || 0,
              weight: s.targetWeight || 0,
              duration: s.targetDuration,
              distance: s.targetDistance,
              rpe: s.rpe || 0,
              rir: s.rir,
              isDrop: s.isDrop || s.setType === 'drop',
              dropLevel: s.dropLevel,
              isBodyweight: s.isBodyweight,
              addedWeight: s.addedWeight,
              repsPerSide: s.repsPerSide,
            };
          }),
        }))
      : [];

    const session: WorkoutSession = {
      id: crypto.randomUUID(),
      templateId: template?.id,
      templateName: customName || template?.name || 'Freestyle Workout',
      type: (template?.type || 'strength') as WorkoutType,
      startedAt: new Date().toISOString(),
      duration: 0,
      exercises,
      setGroups: template?.setGroups,
      warmupNotes: template?.warmupNotes,
      cooldownNotes: template?.cooldownNotes,
      totalVolume: 0,
      totalSets: 0,
      totalReps: 0,
      prsHit: [],
      notes: '',
      musclesWorked: template?.targetMuscles || [],
      effortMode,
    };

    setActiveSession(session);
    setSessionElapsed(0);
    setRestTimer(null);
    acquireWakeLock();
  }, [effortMode]);

  const logSet = useCallback((exerciseIdx: number, setIdx: number, set: LoggedSet) => {
    setActiveSession(prev => {
      if (!prev) return prev;
      const exercises = [...prev.exercises];
      const exercise = { ...exercises[exerciseIdx] };
      const sets = [...exercise.sets];
      sets[setIdx] = set;
      exercise.sets = sets;
      exercises[exerciseIdx] = exercise;
      return { ...prev, exercises };
    });
  }, []);

  const addSetToExercise = useCallback((exerciseIdx: number) => {
    setActiveSession(prev => {
      if (!prev) return prev;
      const exercises = [...prev.exercises];
      const exercise = { ...exercises[exerciseIdx] };
      exercise.sets = [...exercise.sets, createDefaultLoggedSet()];
      exercises[exerciseIdx] = exercise;
      return { ...prev, exercises };
    });
  }, []);

  const removeSet = useCallback((exerciseIdx: number, setIdx: number) => {
    setActiveSession(prev => {
      if (!prev) return prev;
      const exercises = [...prev.exercises];
      const exercise = { ...exercises[exerciseIdx] };
      exercise.sets = exercise.sets.filter((_, i) => i !== setIdx);
      exercises[exerciseIdx] = exercise;
      return { ...prev, exercises };
    });
  }, []);

  const prependWarmupSets = useCallback((exerciseIdx: number, warmupSets: LoggedSet[]) => {
    setActiveSession(prev => {
      if (!prev || warmupSets.length === 0) return prev;
      const exercises = [...prev.exercises];
      const exercise = { ...exercises[exerciseIdx] };
      exercise.sets = [...warmupSets, ...exercise.sets];
      exercises[exerciseIdx] = exercise;
      return { ...prev, exercises };
    });
  }, []);

  const updateExerciseNotes = useCallback((exerciseIdx: number, notes: string) => {
    setActiveSession(prev => {
      if (!prev) return prev;
      const exercises = [...prev.exercises];
      exercises[exerciseIdx] = { ...exercises[exerciseIdx], notes };
      return { ...prev, exercises };
    });
  }, []);

  const addExerciseToSession = useCallback((exercise: SessionExercise) => {
    setActiveSession(prev => {
      if (!prev) return prev;
      return { ...prev, exercises: [...prev.exercises, exercise] };
    });
  }, []);

  const addMultipleExercisesToSession = useCallback((newExercises: SessionExercise[]) => {
    setActiveSession(prev => {
      if (!prev) return prev;
      return { ...prev, exercises: [...prev.exercises, ...newExercises] };
    });
  }, []);

  const removeExerciseFromSession = useCallback((exerciseIdx: number) => {
    setActiveSession(prev => {
      if (!prev) return prev;
      const exercises = prev.exercises.filter((_, i) => i !== exerciseIdx);
      return { ...prev, exercises };
    });
  }, []);

  const reorderExercisesInSession = useCallback((from: number, to: number) => {
    setActiveSession(prev => {
      if (!prev) return prev;
      const exercises = [...prev.exercises];
      const [moved] = exercises.splice(from, 1);
      exercises.splice(to, 0, moved);
      return { ...prev, exercises };
    });
  }, []);

  const toggleExerciseSuperset = useCallback((exIdx: number) => {
    setActiveSession(prev => {
      if (!prev) return prev;
      const exercises = [...prev.exercises];
      const current = exercises[exIdx];
      const next = exercises[exIdx + 1];
      if (!current) return prev;

      if (current.supersetGroup) {
        const group = current.supersetGroup;
        return {
          ...prev,
          exercises: exercises.map(ex =>
            ex.supersetGroup === group ? { ...ex, supersetGroup: undefined } : ex
          ),
        };
      } else if (next) {
        const existingGroups = new Set(exercises.map(e => e.supersetGroup).filter(Boolean));
        const letters = ['A', 'B', 'C', 'D', 'E'];
        const nextLetter = letters.find(l => !existingGroups.has(l)) || 'A';
        exercises[exIdx] = { ...current, supersetGroup: nextLetter };
        exercises[exIdx + 1] = { ...next, supersetGroup: nextLetter };
        return { ...prev, exercises };
      }
      return prev;
    });
  }, []);

  const updateSessionNotes = useCallback((notes: string) => {
    setActiveSession(prev => prev ? { ...prev, notes } : prev);
  }, []);

  const updateWorkoutName = useCallback((name: string) => {
    setActiveSession(prev => prev ? { ...prev, templateName: name } : prev);
  }, []);

  const loadSessions = useCallback(async () => {
    try {
      const all = await db.sessions.getAll();
      setSessions(all.sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime()));
    } catch (e) {
      console.error('[WorkoutBuilder] Failed to load sessions:', e);
    }
  }, []);

  const saveCompletedSession = useCallback(async (session: WorkoutSession): Promise<WorkoutSession> => {
    const totalVolume = calculateSessionVolume(session.exercises);
    const totalSets = session.exercises.reduce((sum, ex) =>
      sum + ex.sets.filter(s => s.completed).length, 0
    );
    const totalReps = session.exercises.reduce((sum, ex) =>
      sum + ex.sets.filter(s => s.completed).reduce((r, s) => r + s.reps, 0), 0
    );
    const musclesWorked = session.musclesWorked && session.musclesWorked.length > 0
      ? session.musclesWorked
      : ([...new Set(session.exercises.flatMap(ex => ex.primaryMuscles || []))] as MuscleGroup[]);

    const finalizedSession: WorkoutSession = {
      ...session,
      totalVolume: session.totalVolume || totalVolume,
      totalSets: session.totalSets || totalSets,
      totalReps: session.totalReps || totalReps,
      musclesWorked,
    };

    // Detect PRs
    const { prs, updatedPRMap } = detectSessionPRs(finalizedSession, personalRecords);
    finalizedSession.prsHit = prs;

    // Update PRs in state and storage
    setPersonalRecords(updatedPRMap);
    const prObj: Record<string, PRRecord[]> = {};
    updatedPRMap.forEach((value, key) => { prObj[key] = value; });
    storage.set(PR_STORAGE_KEY, prObj);

    // Save to IndexedDB
    await db.sessions.save(finalizedSession);
    await loadSessions();

    return finalizedSession;
  }, [personalRecords, loadSessions]);

  const endSession = useCallback(async (): Promise<WorkoutSession | null> => {
    if (!activeSession) return null;

    const completedSession: WorkoutSession = {
      ...activeSession,
      endedAt: new Date().toISOString(),
      duration: sessionElapsed,
      totalVolume: calculateSessionVolume(activeSession.exercises),
      totalSets: activeSession.exercises.reduce((sum, ex) =>
        sum + ex.sets.filter(s => s.completed).length, 0
      ),
      totalReps: activeSession.exercises.reduce((sum, ex) =>
        sum + ex.sets.filter(s => s.completed).reduce((r, s) => r + s.reps, 0), 0
      ),
      musclesWorked: [...new Set(
        activeSession.exercises.flatMap(ex => ex.primaryMuscles || [])
      )] as MuscleGroup[],
    };

    // Detect PRs across session
    const { prs, updatedPRMap } = detectSessionPRs(completedSession, personalRecords);
    completedSession.prsHit = prs;

    // Update PRs in state and storage
    setPersonalRecords(updatedPRMap);
    const prObj: Record<string, PRRecord[]> = {};
    updatedPRMap.forEach((value, key) => { prObj[key] = value; });
    storage.set(PR_STORAGE_KEY, prObj);

    // Save
    await db.sessions.save(completedSession);
    storage.remove(CRASH_RECOVERY_KEY);
    releaseWakeLock();

    setActiveSession(null);
    setSessionElapsed(0);
    setRestTimer(null);

    await loadSessions();

    return completedSession;
  }, [activeSession, sessionElapsed, personalRecords]);

  const cancelSession = useCallback(() => {
    setActiveSession(null);
    setSessionElapsed(0);
    setRestTimer(null);
    storage.remove(CRASH_RECOVERY_KEY);
    releaseWakeLock();
  }, []);

  // ─── Rest Timer ───────────────────────────────────────────

  const startRestTimer = useCallback((seconds: number) => {
    setRestTimer({ remaining: seconds, total: seconds, paused: false });
  }, []);

  const pauseRestTimer = useCallback(() => {
    setRestTimer(prev => prev ? { ...prev, paused: true } : prev);
  }, []);

  const resumeRestTimer = useCallback(() => {
    setRestTimer(prev => prev ? { ...prev, paused: false } : prev);
  }, []);

  const skipRest = useCallback(() => {
    setRestTimer(null);
  }, []);

  const addRestTime = useCallback((seconds: number) => {
    setRestTimer(prev => prev ? { ...prev, remaining: prev.remaining + seconds, total: prev.total + seconds } : prev);
  }, []);

  // ─── PR Detection ────────────────────────────────────────

  const loadPRs = useCallback(async () => {
    const saved = storage.get<Record<string, PRRecord[]>>(PR_STORAGE_KEY);
    if (saved) {
      setPersonalRecords(new Map(Object.entries(saved)));
    }
  }, []);

  const checkForPR = useCallback((
    exerciseId: string,
    exerciseName: string,
    weight: number,
    reps: number,
    sessionId: string
  ): PRRecord | null => {
    if (weight <= 0 || reps <= 0) return null;

    const existing = personalRecords.get(exerciseId) || [];
    const mockSet: LoggedSet = {
      reps, weight, rpe: 0, effortMode: 'off', setType: 'normal',
      status: 'completed', completed: true, skipped: false, timestamp: new Date().toISOString(),
    };

    const result = detectPR(exerciseId, exerciseName, 'weight_reps', mockSet, sessionId, existing);

    if (result.pr) {
      const updated = new Map(personalRecords);
      updated.set(exerciseId, result.allPRs);
      setPersonalRecords(updated);

      const prObj: Record<string, PRRecord[]> = {};
      updated.forEach((value, key) => { prObj[key] = value; });
      storage.set(PR_STORAGE_KEY, prObj);

      audioFeedback.playPRCelebration();
      if (navigator.vibrate) navigator.vibrate([100, 50, 100]);
    }

    return result.pr;
  }, [personalRecords]);

  // ─── Progression ──────────────────────────────────────────

  const getProgressionRec = useCallback((
    exerciseId: string,
    exerciseType: ExerciseType,
    rule?: ProgressionRule,
  ): ProgressionRecommendation => {
    const effectiveRule = rule || DEFAULT_PROGRESSION;

    // Find previous session data
    const prevSets: LoggedSet[] = [];
    for (const session of sessions) {
      const ex = session.exercises.find(e => e.exerciseId === exerciseId);
      if (ex) {
        prevSets.push(...ex.sets.filter(s => s.completed && !s.skipped));
        break;
      }
    }

    const failures = countConsecutiveFailures(
      exerciseId,
      sessions,
      effectiveRule.minReps,
    );

    return getProgressionRecommendation(effectiveRule, exerciseType, prevSets, failures);
  }, [sessions]);

  // ─── History ──────────────────────────────────────────────

  const deleteSession = useCallback(async (id: string) => {
    await db.sessions.delete(id);
    await loadSessions();
  }, [loadSessions]);

  const updateSession = useCallback(async (session: WorkoutSession) => {
    await db.sessions.save(session);
    await loadSessions();
  }, [loadSessions]);

  // ─── Ghost Values ────────────────────────────────────────

  const getPreviousSessionData = useCallback((exerciseId: string) => {
    for (const session of sessions) {
      const ex = session.exercises.find(e => e.exerciseId === exerciseId);
      if (ex) {
        return ex.sets
          .filter(s => s.completed)
          .map(s => ({
            reps: s.reps,
            weight: s.weight,
            rpe: s.rpe,
            duration: s.duration,
            distance: s.distance,
          }));
      }
    }
    return [];
  }, [sessions]);

  // ─── Data Export / Import ─────────────────────────────────

  const exportAllData = useCallback(async (): Promise<string> => {
    const data = await db.exportAll();
    // Add preferences and PRs
    const prObj: Record<string, PRRecord[]> = {};
    personalRecords.forEach((value, key) => { prObj[key] = value; });
    return JSON.stringify({
      ...data,
      personalRecordsMap: prObj,
      effortMode,
    }, null, 2);
  }, [personalRecords, effortMode]);

  const importData = useCallback(async (jsonStr: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const data = JSON.parse(jsonStr);
      await db.importAll(data);

      // Import PRs if present
      if (data.personalRecordsMap) {
        const newPRs = new Map(Object.entries(data.personalRecordsMap) as [string, PRRecord[]][]);
        setPersonalRecords(prev => {
          const merged = new Map(prev);
          newPRs.forEach((value, key) => {
            const existing = merged.get(key) || [];
            // Merge, keeping the best values
            for (const pr of value) {
              const existingIdx = existing.findIndex(e => e.type === pr.type);
              if (existingIdx >= 0) {
                if (pr.value > existing[existingIdx].value) {
                  existing[existingIdx] = pr;
                }
              } else {
                existing.push(pr);
              }
            }
            merged.set(key, existing);
          });
          return merged;
        });
      }

      // Reload all data
      await Promise.all([loadTemplates(), loadSessions(), loadRoutines(), loadScheduleOverrides()]);
      return { success: true };
    } catch (e) {
      console.error('[WorkoutBuilder] Import failed:', e);
      return { success: false, error: e instanceof Error ? e.message : 'Import failed' };
    }
  }, [loadTemplates, loadSessions, loadRoutines, loadScheduleOverrides]);

  // ─── Provider ─────────────────────────────────────────────

  return (
    <WorkoutBuilderContext.Provider
      value={{
        templates, loadTemplates, saveTemplate, deleteTemplate, duplicateTemplate,
        routines, activeRoutine, loadRoutines, saveRoutine, deleteRoutine, setActiveRoutine,
        scheduleOverrides, loadScheduleOverrides, addScheduleOverride, removeScheduleOverride, getTodaysWorkout,
        activeSession, isSessionActive, sessionElapsed,
        startSession, endSession, cancelSession, updateSessionNotes, updateWorkoutName, saveCompletedSession,
        logSet, addSetToExercise, removeSet, prependWarmupSets, updateExerciseNotes,
        addExerciseToSession, addMultipleExercisesToSession, removeExerciseFromSession, reorderExercisesInSession, toggleExerciseSuperset,
        restTimer, startRestTimer, pauseRestTimer, resumeRestTimer, skipRest, addRestTime,
        personalRecords, loadPRs, checkForPR,
        getProgressionRec,
        sessions, loadSessions, deleteSession, updateSession,
        getPreviousSessionData,
        effortMode, setEffortMode,
        exportAllData, importData,
      }}
    >
      {children}
    </WorkoutBuilderContext.Provider>
  );
}

export function useWorkoutBuilder() {
  const context = useContext(WorkoutBuilderContext);
  if (!context) throw new Error('useWorkoutBuilder must be used within WorkoutBuilderProvider');
  return context;
}
