// ─────────────────────────────────────────────────────────────
// MyFitAI — Active Workout Page (/workout/active)
// Complete guided workout execution: dynamic exercise logging,
// progression cues, rest timer with audio/haptics, plate calculator,
// on-the-fly exercise additions, reordering, and finish flow.
// ─────────────────────────────────────────────────────────────

import { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useWorkoutBuilder } from '../context/WorkoutBuilderContext';
import { useFitnessContext } from '../context/FitnessContext';
import { usePreferences } from '../context/PreferencesContext';
import { db } from '../utils/db';
import SessionHeader from '../components/WorkoutSession/SessionHeader';
import ExerciseSetLogger from '../components/WorkoutSession/ExerciseSetLogger';
import RestTimer from '../components/WorkoutSession/RestTimer';
import PlateCalculator from '../components/WorkoutSession/PlateCalculator';
import SessionSummary from '../components/WorkoutSession/SessionSummary';
import { EXERCISE_LIBRARY } from '../data/exerciseLibrary';
import type { WorkoutSession, LoggedSet, SessionExercise } from '../types/workout';
import type { Exercise as DBExercise } from '../types/exercise';
import { createDefaultLoggedSet } from '../types/workout';
import { playRestChime, playCountdownTick, playSuccessChime } from '../utils/audioFeedback';
import { Dumbbell, Link2, ArrowUp, ArrowDown, Trash2, Plus, Search, X, Sparkles } from 'lucide-react';
import { QUICK_SPLIT_PRESETS, lookupExerciseMedia } from '../data/quickWorkoutSplits';
import OfflineStatusIndicator from '../components/OfflineStatusIndicator';

export default function ActiveWorkout() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const templateId = searchParams.get('templateId');

  const {
    activeSession,
    isSessionActive,
    sessionElapsed,
    startSession,
    endSession,
    cancelSession,
    updateWorkoutName,
    logSet,
    addSetToExercise,
    removeSet,
    updateExerciseNotes,
    addExerciseToSession,
    addMultipleExercisesToSession,
    removeExerciseFromSession,
    reorderExercisesInSession,
    restTimer,
    startRestTimer,
    skipRest,
    addRestTime,
    prependWarmupSets,
    toggleExerciseSuperset,
    templates,
    getPreviousSessionData,
    getProgressionRec,
    effortMode,
  } = useWorkoutBuilder();

  const { logActivity, logStrength } = useFitnessContext();
  const { defaultRestTimer, autoStartRestTimer } = usePreferences();

  const [showPlateCalc, setShowPlateCalc] = useState(false);
  const [plateCalcWeight, setPlateCalcWeight] = useState<number | undefined>(undefined);
  const [showEndConfirm, setShowEndConfirm] = useState(false);
  const [showAddExerciseDrawer, setShowAddExerciseDrawer] = useState(false);
  const [exerciseSearchQuery, setExerciseSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [customExercises, setCustomExercises] = useState<DBExercise[]>([]);
  const [completedSession, setCompletedSession] = useState<WorkoutSession | null>(null);
  const [currentExIdx, setCurrentExIdx] = useState(0);

  // Load custom exercises from DB
  useEffect(() => {
    db.exercises.getAll().then(setCustomExercises).catch(() => {});
  }, []);

  // Monitor rest timer completion for harmonic chime and haptics
  const lastRemainingRef = useRef<number | null>(null);
  useEffect(() => {
    if (restTimer) {
      if (restTimer.remaining === 0 && lastRemainingRef.current !== 0) {
        playRestChime();
      } else if (restTimer.remaining <= 3 && restTimer.remaining > 0 && restTimer.remaining !== lastRemainingRef.current) {
        playCountdownTick();
      }
      lastRemainingRef.current = restTimer.remaining;
    }
  }, [restTimer]);

  // Start session on mount if not already active
  useEffect(() => {
    if (!isSessionActive && !completedSession) {
      const template = templateId ? templates.find(t => t.id === templateId) : undefined;
      startSession(template);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleEndWorkout = async () => {
    setShowEndConfirm(false);
    const session = await endSession();
    if (session) {
      playSuccessChime();
      // Sync activity to fitness context for dashboard and streak tracking
      logActivity({
        type: 'Workout',
        value: Math.max(1, Math.round(session.duration / 60)),
        caloriesBurned: Math.round((session.duration / 60) * 8.5),
      });
      // Sync completed sets to strengthHistory
      session.exercises.forEach(ex => {
        ex.sets.forEach(st => {
          if (st.completed && st.weight > 0 && st.reps > 0) {
            logStrength(ex.exerciseName, st.weight, st.reps, st.rpe ? String(st.rpe) : undefined, st.setType);
          }
        });
      });
      setCompletedSession(session);
    }
  };

  const handleCancel = () => {
    cancelSession();
    navigate('/workout');
  };

  const handleQuickLoadPreset = (presetId: string) => {
    const preset = QUICK_SPLIT_PRESETS.find(p => p.id === presetId);
    if (!preset) return;
    const newSessionExercises: SessionExercise[] = preset.recommendedExercises.map(rec => {
      const media = lookupExerciseMedia(rec.exerciseName);
      return {
        exerciseId: rec.exerciseId,
        exerciseName: rec.exerciseName,
        exerciseType: rec.exerciseType,
        primaryMuscles: rec.primaryMuscles,
        restSeconds: rec.restSeconds,
        gifUrl: media.gifUrl,
        imageUrl: media.imageUrl,
        notes: '',
        sets: Array.from({ length: rec.defaultSets }, () => ({
          ...createDefaultLoggedSet('normal'),
          reps: rec.defaultReps,
          weight: rec.defaultWeightLbs,
        })),
      };
    });
    addMultipleExercisesToSession(newSessionExercises);
    if (!activeSession?.templateName || activeSession.templateName === 'Freestyle Workout') {
      updateWorkoutName(preset.name);
    }
  };

  const handleSetComplete = (exerciseIdx: number) => {
    setCurrentExIdx(exerciseIdx);
    const exercise = activeSession?.exercises[exerciseIdx];
    if (!exercise) return;

    // Check if this exercise is part of a superset group
    if (exercise.supersetGroup && activeSession?.exercises) {
      const groupExercises = activeSession.exercises
        .map((e, idx) => ({ ...e, idx }))
        .filter(e => e.supersetGroup === exercise.supersetGroup);

      const currentPos = groupExercises.findIndex(e => e.idx === exerciseIdx);
      const isLastInGroup = currentPos === groupExercises.length - 1;

      if (!isLastInGroup && currentPos !== -1) {
        // Advance focus to next exercise in superset cycle without triggering full rest timer
        const nextPartner = groupExercises[currentPos + 1];
        setCurrentExIdx(nextPartner.idx);
        return;
      }
    }

    // Trigger full rest timer after standard exercise set or completed superset cycle
    const rest = exercise.restSeconds || defaultRestTimer;
    if (autoStartRestTimer && rest > 0) {
      startRestTimer(rest);
    }
  };

  // Add exercise directly to active session
  const handleAddExercise = (exerciseId: string, name: string, emoji: string) => {
    const libEntry = EXERCISE_LIBRARY.find(
      e => e.id === exerciseId || e.name.toLowerCase() === name.toLowerCase() || (e.aliases && e.aliases.some(a => a.toLowerCase() === name.toLowerCase()))
    ) || customExercises.find(c => c.id === exerciseId || c.name.toLowerCase() === name.toLowerCase());

    const newEx: SessionExercise = {
      exerciseId,
      exerciseName: name,
      thumbnailEmoji: emoji,
      primaryMuscles: (libEntry?.primaryMuscles as any) || ['full_body'],
      exerciseType: (libEntry as any)?.exerciseType || 'weight_reps',
      gifUrl: libEntry?.gifUrl,
      imageUrl: libEntry?.imageUrl,
      restSeconds: defaultRestTimer,
      sets: [
        createDefaultLoggedSet('normal'),
        createDefaultLoggedSet('normal'),
        createDefaultLoggedSet('normal'),
      ],
      notes: '',
    };

    addExerciseToSession(newEx);
    setShowAddExerciseDrawer(false);
    setExerciseSearchQuery('');
  };

  // Quick-create a custom exercise on the fly during freestyle
  const handleQuickCreateCustomExercise = async () => {
    if (!exerciseSearchQuery.trim()) return;
    const name = exerciseSearchQuery.trim();
    const id = `custom_${crypto.randomUUID()}`;
    const newCustomEx: DBExercise = {
      id,
      name,
      primaryMuscles: ['full_body'],
      secondaryMuscles: [],
      bodyPart: 'full_body',
      equipment: 'other',
      category: 'compound',
      exerciseType: 'weight_reps',
      movementPattern: 'isolation',
      difficulty: 'intermediate',
      instructions: ['Custom movement logged on freestyle.'],
      tips: ['Maintain controlled tempo and proper form.'],
      thumbnailEmoji: '🏋️',
      isUnilateral: false,
      isCustom: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    try {
      await db.exercises.save(newCustomEx);
      setCustomExercises(prev => [newCustomEx, ...prev]);
    } catch (e) {
      console.error('Failed to save custom exercise:', e);
    }

    handleAddExercise(id, name, '🏋️');
  };

  // Unified list of exercises (custom + global library)
  const combinedLibrary = useMemo(() => {
    return [
      ...customExercises.map(c => ({
        id: c.id,
        name: c.name,
        primaryMuscles: c.primaryMuscles as string[],
        emoji: c.thumbnailEmoji || '🏋️',
        imageUrl: c.imageUrl,
        gifUrl: c.gifUrl,
        isCustom: true,
      })),
      ...EXERCISE_LIBRARY.map(e => ({
        id: e.id,
        name: e.name,
        primaryMuscles: e.primaryMuscles as string[],
        emoji: e.emoji || '🏋️',
        imageUrl: e.imageUrl,
        gifUrl: e.gifUrl,
        isCustom: false,
      })),
    ];
  }, [customExercises]);

  // Filtered exercises for add drawer
  const filteredLibrary = useMemo(() => {
    const q = exerciseSearchQuery.toLowerCase().trim();
    return combinedLibrary.filter(e => {
      const matchesQuery = !q || e.name.toLowerCase().includes(q) || e.primaryMuscles.some(m => m.toLowerCase().includes(q));
      if (!matchesQuery) return false;
      if (selectedCategory === 'All') return true;
      const catLower = selectedCategory.toLowerCase();
      return e.primaryMuscles.some(m => m.toLowerCase().includes(catLower));
    });
  }, [combinedLibrary, exerciseSearchQuery, selectedCategory]);

  const hasExactMatch = useMemo(() => {
    const q = exerciseSearchQuery.toLowerCase().trim();
    return Boolean(q && combinedLibrary.some(e => e.name.toLowerCase() === q));
  }, [combinedLibrary, exerciseSearchQuery]);

  // Show summary screen on completion
  if (completedSession) {
    return (
      <SessionSummary
        session={completedSession}
        onDone={() => navigate('/workout')}
      />
    );
  }

  // Guard: No active session
  if (!activeSession) {
    return (
      <main className="max-w-md mx-auto px-6 pt-24 pb-32 text-center">
        <div className="w-16 h-16 rounded-2xl bg-[#151517] border border-[#2A2A2D] flex items-center justify-center mx-auto mb-4 text-[#A1A1A6]">
          <Dumbbell className="w-8 h-8 text-[#30D158]" />
        </div>
        <h2 className="font-headline font-black text-xl text-[#F5F5F5] uppercase tracking-tight mb-2">No Active Session</h2>
        <p className="text-[#A1A1A6] text-xs font-mono mb-6">Choose a workout from the training hub to begin tracking.</p>
        <button
          onClick={() => navigate('/workout')}
          className="bg-[#FF8A00] hover:bg-[#FFA033] text-black px-6 py-3.5 rounded-xl font-mono font-black uppercase tracking-wider text-xs active:scale-95 transition-all shadow-lg shadow-[#FF8A00]/20"
        >
          Go to Workouts
        </button>
      </main>
    );
  }

  return (
    <>
      <SessionHeader
        workoutName={activeSession.templateName}
        elapsed={sessionElapsed}
        currentExercise={currentExIdx + 1}
        totalExercises={activeSession.exercises.length}
        onEnd={() => setShowEndConfirm(true)}
        onOpenPlateCalc={() => setShowPlateCalc(true)}
        onRename={updateWorkoutName}
      />

      <OfflineStatusIndicator
        variant="banner"
        workoutMediaUrls={activeSession.exercises.flatMap(e => [e.gifUrl, e.imageUrl].filter(Boolean) as string[])}
      />

      <main className="w-full max-w-2xl mx-auto px-3.5 sm:px-4 pt-4 pb-44 space-y-4 min-w-0 box-border">
        {activeSession.exercises.map((exercise, exIdx) => {
          const ghostValues = getPreviousSessionData(exercise.exerciseId);
          const progressionRec = getProgressionRec(
            exercise.exerciseId,
            exercise.exerciseType || 'weight_reps',
            exercise.progressionRule
          );

          return (
            <div key={exercise.exerciseId + exIdx} className={`relative group ${exercise.supersetGroup ? 'border-l-2 border-[#A78BFA] pl-2 rounded-2xl' : ''}`}>
              {/* Superset Group Indicator */}
              {exercise.supersetGroup && (
                <div className="flex items-center justify-between px-3 py-1.5 mb-1.5 text-[10px] font-mono font-bold uppercase tracking-wider text-[#A78BFA] bg-[#A78BFA]/10 rounded-lg border border-[#A78BFA]/20">
                  <span className="flex items-center gap-1.5">
                    <Link2 className="w-3.5 h-3.5" />
                    Superset {exercise.supersetGroup}
                  </span>
                  <span className="text-[9px] text-[#A1A1A6] lowercase tracking-normal">
                    paired movements
                  </span>
                </div>
              )}

              <ExerciseSetLogger
                exerciseIdx={exIdx}
                exerciseName={exercise.exerciseName}
                thumbnailEmoji={exercise.thumbnailEmoji}
                gifUrl={exercise.gifUrl || EXERCISE_LIBRARY.find(e => e.name.toLowerCase() === exercise.exerciseName.toLowerCase() || (e.aliases && e.aliases.some(a => a.toLowerCase() === exercise.exerciseName.toLowerCase())))?.gifUrl}
                imageUrl={exercise.imageUrl || EXERCISE_LIBRARY.find(e => e.name.toLowerCase() === exercise.exerciseName.toLowerCase() || (e.aliases && e.aliases.some(a => a.toLowerCase() === exercise.exerciseName.toLowerCase())))?.imageUrl}
                exerciseType={exercise.exerciseType || 'weight_reps'}
                sets={exercise.sets as LoggedSet[]}
                ghostValues={ghostValues}
                restSeconds={exercise.restSeconds || defaultRestTimer}
                onLogSet={logSet}
                onAddSet={addSetToExercise}
                onRemoveSet={removeSet}
                onSetComplete={handleSetComplete}
                onStartRest={startRestTimer}
                exerciseId={exercise.exerciseId}
                sessionId={activeSession.id}
                effortMode={effortMode}
                progressionRec={progressionRec}
                exerciseNotes={exercise.notes}
                onUpdateExerciseNotes={(notes) => updateExerciseNotes(exIdx, notes)}
                onOpenPlateCalc={(weight?: number) => {
                  setPlateCalcWeight(weight);
                  setShowPlateCalc(true);
                }}
                onPrependWarmupSets={prependWarmupSets}
              />

              {/* Exercise Management Controls (Superset / Reorder / Remove) */}
              <div className="flex items-center justify-between gap-2 pt-1.5 px-1">
                {/* Superset Toggle */}
                {exIdx < activeSession.exercises.length - 1 || exercise.supersetGroup ? (
                  <button
                    onClick={() => toggleExerciseSuperset(exIdx)}
                    className={`h-8 px-3 rounded-lg text-xs font-mono font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all ${
                      exercise.supersetGroup
                        ? 'text-[#A78BFA] bg-[#A78BFA]/15 hover:bg-[#A78BFA]/25 border border-[#A78BFA]/30'
                        : 'text-[#A1A1A6] hover:text-[#F5F5F5] hover:bg-[#1E1E20] border border-[#2A2A2D]'
                    }`}
                    title={exercise.supersetGroup ? 'Unlink superset' : 'Link with next exercise as superset'}
                  >
                    <Link2 className="w-3.5 h-3.5" />
                    <span className="text-[10px]">{exercise.supersetGroup ? `Superset ${exercise.supersetGroup}` : 'Link Superset'}</span>
                  </button>
                ) : <div />}

                <div className="flex items-center gap-1.5">
                  {exIdx > 0 && (
                    <button
                      onClick={() => reorderExercisesInSession(exIdx, exIdx - 1)}
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-[#A1A1A6] hover:text-[#F5F5F5] hover:bg-[#1E1E20] border border-[#2A2A2D] transition-all active:scale-95"
                      title="Move Up"
                    >
                      <ArrowUp className="w-3.5 h-3.5" />
                    </button>
                  )}
                  {exIdx < activeSession.exercises.length - 1 && (
                    <button
                      onClick={() => reorderExercisesInSession(exIdx, exIdx + 1)}
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-[#A1A1A6] hover:text-[#F5F5F5] hover:bg-[#1E1E20] border border-[#2A2A2D] transition-all active:scale-95"
                      title="Move Down"
                    >
                      <ArrowDown className="w-3.5 h-3.5" />
                    </button>
                  )}
                  <button
                    onClick={() => removeExerciseFromSession(exIdx)}
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-[#FF453A]/70 hover:text-[#FF453A] hover:bg-[#FF453A]/10 border border-[#FF453A]/20 transition-all active:scale-95"
                    title="Remove Exercise"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}

        {activeSession.exercises.length === 0 && (
          <div className="p-6 sm:p-8 bg-[#151517] rounded-3xl border border-[#2A2A2D] text-center space-y-5">
            <div className="w-14 h-14 rounded-2xl bg-[#FF8A00]/15 border border-[#FF8A00]/30 flex items-center justify-center text-[#FF8A00] mx-auto">
              <Sparkles className="w-7 h-7" />
            </div>
            <div className="space-y-1">
              <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-[#FF8A00] block">
                SPONTANEOUS TRAINING
              </span>
              <h3 className="text-base sm:text-lg font-headline font-bold text-[#F5F5F5] uppercase tracking-tight">
                Quick Load Movements for Today
              </h3>
              <p className="text-xs text-[#A1A1A6] max-w-sm mx-auto">
                No strict plan needed. 1-tap load standard compound movements for today's workout:
              </p>
            </div>

            {/* Quick Load Buttons Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1 text-left">
              {QUICK_SPLIT_PRESETS.slice(0, 4).map((preset) => (
                <button
                  key={preset.id}
                  onClick={() => handleQuickLoadPreset(preset.id)}
                  className="p-3.5 rounded-2xl bg-[#1E1E20] hover:bg-[#1E1E20]/80 border border-[#2A2A2D] hover:border-[#FF8A00]/50 transition-all flex items-center justify-between group active:scale-[0.98]"
                >
                  <div className="min-w-0 pr-2">
                    <span className="font-headline font-bold text-xs text-[#F5F5F5] block group-hover:text-[#FF8A00] transition-colors truncate">
                      {preset.name}
                    </span>
                    <span className="text-[10px] text-[#A1A1A6] font-mono block">
                      {preset.recommendedExercises.length} movements · 3 sets each
                    </span>
                  </div>
                  <div className="w-7 h-7 rounded-xl bg-[#FF8A00]/15 text-[#FF8A00] flex items-center justify-center shrink-0">
                    <Plus className="w-4 h-4 stroke-[2.5]" />
                  </div>
                </button>
              ))}
            </div>

            <div className="pt-2 flex flex-wrap items-center justify-center gap-2">
              <button
                onClick={() => setShowAddExerciseDrawer(true)}
                className="py-2.5 px-4 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] border border-[#2A2A2D] text-[#F5F5F5] text-xs font-headline font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all active:scale-95"
              >
                <Search className="w-3.5 h-3.5" />
                <span>Search Full Exercise Library</span>
              </button>
            </div>
          </div>
        )}

        {/* Add Exercise Button */}
        <button
          onClick={() => setShowAddExerciseDrawer(true)}
          className="w-full py-4 rounded-xl border border-dashed border-[#2A2A2D] hover:border-[#30D158]/50 text-[#A1A1A6] hover:text-[#30D158] text-xs font-mono font-bold uppercase tracking-widest flex items-center justify-center gap-2 transition-all active:scale-[0.99] bg-[#151517]/40 hover:bg-[#151517]"
        >
          <Plus className="w-4 h-4" />
          <span>Add Exercise to Session</span>
        </button>
      </main>

      {/* Rest Timer Overlay */}
      {restTimer && (
        <RestTimer
          remaining={restTimer.remaining}
          total={restTimer.total}
          onSkip={skipRest}
          onAddTime={(seconds) => addRestTime(seconds)}
        />
      )}

      {/* Plate Calculator Modal */}
      <PlateCalculator
        isOpen={showPlateCalc}
        initialWeight={plateCalcWeight}
        onClose={() => {
          setShowPlateCalc(false);
          setPlateCalcWeight(undefined);
        }}
      />

      {/* End Workout Confirmation Modal */}
      {showEndConfirm && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/75 backdrop-blur-sm" onClick={() => setShowEndConfirm(false)} />
          <div className="relative bg-[#151517] rounded-2xl p-6 w-full max-w-sm border border-[#2A2A2D] shadow-2xl animate-in zoom-in-95 fade-in duration-200">
            <h3 className="font-headline font-black text-lg text-[#F5F5F5] uppercase tracking-tight mb-2">Conclude Workout?</h3>
            <p className="text-[#A1A1A6] text-xs font-mono leading-relaxed mb-6">
              All logged sets, volume metrics, and PRs will be saved to your local database and synced to the cloud.
            </p>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setShowEndConfirm(false)}
                className="py-3 rounded-xl bg-[#1E1E20] hover:bg-[#2A2A2D] border border-[#2A2A2D] text-[#F5F5F5] font-mono font-bold text-xs uppercase tracking-wider active:scale-95 transition-all"
              >
                Keep Going
              </button>
              <button
                onClick={handleEndWorkout}
                className="py-3 rounded-xl bg-[#FF8A00] hover:bg-[#FFA033] text-black font-mono font-black text-xs uppercase tracking-wider active:scale-95 transition-all shadow-lg shadow-[#FF8A00]/20"
              >
                End & Save
              </button>
            </div>
            <button
              onClick={handleCancel}
              className="w-full mt-4 py-2 text-[#FF453A] text-[10px] font-mono font-bold uppercase tracking-widest hover:underline active:scale-95"
            >
              Discard Session
            </button>
          </div>
        </div>
      )}

      {/* DRAWER: ADD EXERCISE ON-THE-FLY */}
      {showAddExerciseDrawer && (
        <div className="fixed inset-0 z-[130] flex items-end sm:items-center justify-center">
          <div
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            onClick={() => setShowAddExerciseDrawer(false)}
          />
          <div className="relative bg-[#151517] rounded-t-3xl sm:rounded-2xl p-5 w-full max-w-lg max-h-[85vh] flex flex-col border border-[#2A2A2D] shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-headline font-black text-base text-[#F5F5F5] uppercase tracking-tight">Add Exercise</h3>
                <p className="text-xs text-[#A1A1A6] font-mono">Select from verified exercise database</p>
              </div>
              <button
                onClick={() => setShowAddExerciseDrawer(false)}
                className="w-8 h-8 rounded-lg bg-[#1E1E20] hover:bg-[#2A2A2D] border border-[#2A2A2D] flex items-center justify-center text-[#A1A1A6] hover:text-[#F5F5F5]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Search Input */}
            <div className="relative mb-3">
              <Search className="w-4 h-4 text-[#A1A1A6] absolute left-3 top-3.5" />
              <input
                type="text"
                autoFocus
                value={exerciseSearchQuery}
                onChange={(e) => setExerciseSearchQuery(e.target.value)}
                placeholder="Search exercise by name or muscle..."
                className="w-full bg-[#080808] rounded-xl py-3 pl-10 pr-4 text-xs font-mono font-bold outline-none border border-[#2A2A2D] focus:border-[#30D158]/50 text-[#F5F5F5]"
              />
            </div>

            {/* Category Filter Chips */}
            <div className="flex gap-1.5 overflow-x-auto pb-2 mb-2 no-scrollbar">
              {['All', 'Chest', 'Back', 'Legs', 'Shoulders', 'Arms', 'Core'].map(cat => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1 rounded-lg text-[10px] font-mono font-bold uppercase tracking-wider shrink-0 transition-all ${
                    selectedCategory === cat
                      ? 'bg-[#FF8A00] text-black shadow-sm'
                      : 'bg-[#1E1E20] text-[#A1A1A6] hover:text-[#F5F5F5] border border-[#2A2A2D]'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Quick Add Custom Exercise Button */}
            {exerciseSearchQuery.trim().length > 1 && !hasExactMatch && (
              <button
                onClick={handleQuickCreateCustomExercise}
                className="w-full flex items-center justify-between px-3.5 py-2.5 mb-2.5 rounded-xl bg-[#FF8A00]/10 hover:bg-[#FF8A00]/20 border border-[#FF8A00]/30 text-left transition-all active:scale-[0.99] group shrink-0"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-7 h-7 rounded-lg bg-[#FF8A00]/20 flex items-center justify-center text-[#FF8A00] shrink-0">
                    <Sparkles className="w-3.5 h-3.5" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-headline font-bold text-xs text-[#F5F5F5] uppercase tracking-tight truncate">
                      Add &ldquo;{exerciseSearchQuery.trim()}&rdquo;
                    </p>
                    <p className="text-[10px] text-[#A1A1A6] font-mono">
                      Save as new custom exercise
                    </p>
                  </div>
                </div>
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#FF8A00] flex items-center gap-1 shrink-0 bg-[#FF8A00]/10 px-2 py-1 rounded-md">
                  <Plus className="w-3 h-3" /> Add
                </span>
              </button>
            )}

            {/* Exercise List */}
            <div className="flex-1 overflow-y-auto space-y-1.5 pr-1 max-h-[50vh]">
              {filteredLibrary.length === 0 ? (
                <div className="text-center py-10 px-4">
                  <Dumbbell className="w-8 h-8 text-[#A1A1A6]/40 mx-auto mb-2" />
                  <p className="text-xs text-[#A1A1A6] font-mono mb-3">No matching exercises found.</p>
                  {exerciseSearchQuery.trim() && (
                    <button
                      onClick={handleQuickCreateCustomExercise}
                      className="px-4 py-2 rounded-xl bg-[#FF8A00] text-black font-mono font-black text-xs uppercase tracking-wider active:scale-95 transition-all shadow-md"
                    >
                      Add &ldquo;{exerciseSearchQuery.trim()}&rdquo; to Workout
                    </button>
                  )}
                </div>
              ) : (
                filteredLibrary.map((ex, i) => (
                  <button
                    key={(ex.id || ex.name) + i}
                    onClick={() => handleAddExercise(ex.id || ex.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'), ex.name, ex.emoji)}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl bg-[#1E1E20]/60 hover:bg-[#1E1E20] border border-[#2A2A2D] text-left active:scale-[0.99] transition-all group"
                  >
                    <div className="w-10 h-10 rounded-lg bg-black/60 overflow-hidden flex-shrink-0 border border-[#2A2A2D] flex items-center justify-center">
                      {ex.imageUrl || ex.gifUrl ? (
                        <img src={ex.imageUrl || ex.gifUrl} alt={ex.name} className="w-full h-full object-cover" loading="lazy" />
                      ) : (
                        <Dumbbell className="w-5 h-5 text-[#30D158]" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="font-bold text-xs text-[#F5F5F5] uppercase tracking-tight truncate group-hover:text-[#30D158] transition-colors">{ex.name}</p>
                        {ex.isCustom && (
                          <span className="text-[8px] font-mono uppercase tracking-wider px-1 py-0.2 rounded bg-primary/20 text-primary border border-primary/30">Custom</span>
                        )}
                      </div>
                      <p className="text-[10px] text-[#A1A1A6] font-mono uppercase tracking-wider truncate">
                        {ex.primaryMuscles.join(' · ')}
                      </p>
                    </div>
                    <Plus className="w-4 h-4 text-[#A1A1A6] group-hover:text-[#30D158]" />
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
