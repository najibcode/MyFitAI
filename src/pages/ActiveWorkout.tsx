// ─────────────────────────────────────────────────────────────
// MyFitAI — Active Workout Page (/workout/active)
// Complete guided workout execution: dynamic exercise logging,
// progression cues, rest timer with audio/haptics, plate calculator,
// on-the-fly exercise additions, reordering, and finish flow.
// ─────────────────────────────────────────────────────────────

import { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useWorkoutBuilder } from '../context/WorkoutBuilderContext';
import { usePreferences } from '../context/PreferencesContext';
import SessionHeader from '../components/WorkoutSession/SessionHeader';
import ExerciseSetLogger from '../components/WorkoutSession/ExerciseSetLogger';
import RestTimer from '../components/WorkoutSession/RestTimer';
import PlateCalculator from '../components/WorkoutSession/PlateCalculator';
import SessionSummary from '../components/WorkoutSession/SessionSummary';
import { EXERCISE_LIBRARY } from '../data/exerciseLibrary';
import type { WorkoutSession, LoggedSet, SessionExercise } from '../types/workout';
import { createDefaultLoggedSet } from '../types/workout';
import { playRestChime, playCountdownTick, playSuccessChime } from '../utils/audioFeedback';

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
    logSet,
    addSetToExercise,
    removeSet,
    updateExerciseNotes,
    addExerciseToSession,
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

  const { defaultRestTimer, autoStartRestTimer } = usePreferences();

  const [showPlateCalc, setShowPlateCalc] = useState(false);
  const [plateCalcWeight, setPlateCalcWeight] = useState<number | undefined>(undefined);
  const [showEndConfirm, setShowEndConfirm] = useState(false);
  const [showAddExerciseDrawer, setShowAddExerciseDrawer] = useState(false);
  const [exerciseSearchQuery, setExerciseSearchQuery] = useState('');
  const [completedSession, setCompletedSession] = useState<WorkoutSession | null>(null);
  const [currentExIdx, setCurrentExIdx] = useState(0);

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
      setCompletedSession(session);
    }
  };

  const handleCancel = () => {
    cancelSession();
    navigate('/workout');
  };

  const handleSetComplete = (exerciseIdx: number) => {
    if (autoStartRestTimer && defaultRestTimer > 0) {
      startRestTimer(defaultRestTimer);
    }
    setCurrentExIdx(exerciseIdx);
  };

  // Add exercise directly to active session
  const handleAddExercise = (exerciseId: string, name: string, emoji: string) => {
    const libEntry = EXERCISE_LIBRARY.find(
      e => e.id === exerciseId || e.name.toLowerCase() === name.toLowerCase() || (e.aliases && e.aliases.some(a => a.toLowerCase() === name.toLowerCase()))
    );
    const newEx: SessionExercise = {
      exerciseId,
      exerciseName: name,
      thumbnailEmoji: emoji,
      primaryMuscles: libEntry?.primaryMuscles || ['full_body'],
      exerciseType: libEntry?.exerciseType || 'weight_reps',
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

  // Filtered exercises for add drawer
  const filteredLibrary = EXERCISE_LIBRARY.filter(e =>
    e.name.toLowerCase().includes(exerciseSearchQuery.toLowerCase()) ||
    e.primaryMuscles.some(m => m.includes(exerciseSearchQuery.toLowerCase()))
  );

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
      <main className="max-w-md mx-auto px-6 pt-20 pb-32 text-center">
        <span className="material-symbols-outlined text-6xl text-on-surface-variant mb-4 block">fitness_center</span>
        <h2 className="font-headline font-extrabold text-xl mb-2">No Active Session</h2>
        <p className="text-on-surface-variant text-sm mb-6">Start a workout from the Workout tab.</p>
        <button
          onClick={() => navigate('/workout')}
          className="bg-primary text-black px-6 py-3 rounded-2xl font-bold uppercase tracking-wider text-xs active:scale-95 transition-transform"
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
      />

      <main className="max-w-md mx-auto px-3 sm:px-4 pt-3 pb-44 space-y-4">
        {activeSession.exercises.map((exercise, exIdx) => {
          const ghostValues = getPreviousSessionData(exercise.exerciseId);
          const progressionRec = getProgressionRec(
            exercise.exerciseId,
            exercise.exerciseType || 'weight_reps',
            exercise.progressionRule
          );

          return (
            <div key={exercise.exerciseId + exIdx} className={`relative group ${exercise.supersetGroup ? 'border-l-2 border-[#fab0ff]/60 pl-2 rounded-3xl' : ''}`}>
              {/* Superset Group Indicator */}
              {exercise.supersetGroup && (
                <div className="flex items-center justify-between px-3 py-1 mb-1 text-[10px] font-black uppercase tracking-widest text-[#fab0ff] bg-[#fab0ff]/10 rounded-xl border border-[#fab0ff]/20">
                  <span className="flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[14px]">link</span>
                    Superset {exercise.supersetGroup}
                  </span>
                  <span className="text-[9px] text-white/50 lowercase tracking-normal">
                    paired exercises
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
              <div className="flex items-center justify-between gap-2 pt-1 px-1">
                {/* Superset Toggle */}
                {exIdx < activeSession.exercises.length - 1 || exercise.supersetGroup ? (
                  <button
                    onClick={() => toggleExerciseSuperset(exIdx)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all ${
                      exercise.supersetGroup
                        ? 'text-[#fab0ff] bg-[#fab0ff]/15 hover:bg-[#fab0ff]/25 border border-[#fab0ff]/30'
                        : 'text-on-surface-variant/60 hover:text-on-surface hover:bg-white/[0.06] border border-white/[0.06]'
                    }`}
                    title={exercise.supersetGroup ? 'Unlink superset' : 'Link with next exercise as superset'}
                  >
                    <span className="material-symbols-outlined text-[15px]">link</span>
                    <span className="text-[10px]">{exercise.supersetGroup ? `Superset ${exercise.supersetGroup}` : 'Link Superset'}</span>
                  </button>
                ) : <div />}

                <div className="flex items-center gap-1.5">
                  {exIdx > 0 && (
                    <button
                      onClick={() => reorderExercisesInSession(exIdx, exIdx - 1)}
                      className="w-8 h-8 rounded-xl flex items-center justify-center text-on-surface-variant/60 hover:text-on-surface hover:bg-white/[0.06] border border-white/[0.06] transition-all active:scale-95"
                      title="Move Up"
                    >
                      <span className="material-symbols-outlined text-[16px]">arrow_upward</span>
                    </button>
                  )}
                  {exIdx < activeSession.exercises.length - 1 && (
                    <button
                      onClick={() => reorderExercisesInSession(exIdx, exIdx + 1)}
                      className="w-8 h-8 rounded-xl flex items-center justify-center text-on-surface-variant/60 hover:text-on-surface hover:bg-white/[0.06] border border-white/[0.06] transition-all active:scale-95"
                      title="Move Down"
                    >
                      <span className="material-symbols-outlined text-[16px]">arrow_downward</span>
                    </button>
                  )}
                  <button
                    onClick={() => removeExerciseFromSession(exIdx)}
                    className="w-8 h-8 rounded-xl flex items-center justify-center text-error/60 hover:text-error hover:bg-error/15 border border-error/20 transition-all active:scale-95"
                    title="Remove Exercise"
                  >
                    <span className="material-symbols-outlined text-[16px]">delete</span>
                  </button>
                </div>
              </div>
            </div>
          );
        })}

        {activeSession.exercises.length === 0 && (
          <div className="text-center py-16">
            <span className="material-symbols-outlined text-5xl text-on-surface-variant/30 mb-3 block">add_circle</span>
            <p className="text-on-surface-variant text-sm">No exercises in this workout.</p>
            <p className="text-on-surface-variant/50 text-xs mt-1">Add exercises below to start tracking.</p>
          </div>
        )}

        {/* Add Exercise Button */}
        <button
          onClick={() => setShowAddExerciseDrawer(true)}
          className="w-full py-4 rounded-3xl border border-dashed border-white/[0.12] hover:border-primary/40 text-on-surface hover:text-primary text-xs font-headline font-bold uppercase tracking-widest flex items-center justify-center gap-2 transition-all active:scale-[0.98] bg-white/[0.02]"
        >
          <span className="material-symbols-outlined text-[18px]">add_circle</span>
          Add Exercise to Session
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
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setShowEndConfirm(false)} />
          <div className="relative bg-[var(--color-surface)] rounded-3xl p-6 w-full max-w-sm border border-white/[0.06] shadow-2xl animate-in zoom-in-95 fade-in duration-300">
            <h3 className="font-headline font-extrabold text-lg mb-2">End Workout?</h3>
            <p className="text-on-surface-variant text-sm mb-6">
              Your logged sets and progression stats will be saved to your history.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowEndConfirm(false)}
                className="flex-1 py-3 rounded-2xl bg-[var(--color-surface-container)] text-on-surface font-bold text-xs uppercase tracking-wider active:scale-95 transition-transform"
              >
                Keep Going
              </button>
              <button
                onClick={handleEndWorkout}
                className="flex-1 py-3 rounded-2xl bg-primary text-black font-bold text-xs uppercase tracking-wider active:scale-95 transition-transform shadow-[0_4px_16px_rgba(255,122,0,0.3)]"
              >
                End & Save
              </button>
            </div>
            <button
              onClick={handleCancel}
              className="w-full mt-4 py-2 text-error text-[11px] font-bold uppercase tracking-widest active:scale-95"
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
          <div className="relative bg-[var(--color-surface)] rounded-t-3xl sm:rounded-3xl p-5 w-full max-w-md max-h-[85vh] flex flex-col border border-white/[0.08] shadow-2xl animate-in slide-in-from-bottom duration-300">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-headline font-black text-lg text-on-surface">Add Exercise</h3>
                <p className="text-xs text-on-surface-variant">Search from library to add right now</p>
              </div>
              <button
                onClick={() => setShowAddExerciseDrawer(false)}
                className="w-8 h-8 rounded-full bg-white/[0.04] flex items-center justify-center text-on-surface"
              >
                <span className="material-symbols-outlined text-sm">close</span>
              </button>
            </div>

            {/* Search Input */}
            <div className="relative mb-3">
              <span className="material-symbols-outlined absolute left-3 top-3 text-on-surface-variant text-[18px]">
                search
              </span>
              <input
                type="text"
                autoFocus
                value={exerciseSearchQuery}
                onChange={(e) => setExerciseSearchQuery(e.target.value)}
                placeholder="Search exercises..."
                className="w-full bg-[var(--color-surface-container)] rounded-2xl py-3 pl-10 pr-4 text-xs font-bold outline-none border border-white/[0.04] focus:border-primary/40 text-on-surface"
              />
            </div>

            {/* Exercise List */}
            <div className="flex-1 overflow-y-auto space-y-1.5 pr-1">
              {filteredLibrary.map((ex, i) => (
                <button
                  key={ex.name + i}
                  onClick={() => handleAddExercise(ex.id || ex.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'), ex.name, ex.emoji)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-2xl bg-white/[0.02] hover:bg-white/[0.06] border border-white/[0.04] text-left active:scale-[0.98] transition-all"
                >
                  <div className="w-10 h-10 rounded-xl bg-black/40 overflow-hidden flex-shrink-0 border border-white/10 flex items-center justify-center">
                    {ex.imageUrl || ex.gifUrl ? (
                      <img src={ex.imageUrl || ex.gifUrl} alt={ex.name} className="w-full h-full object-cover" loading="lazy" />
                    ) : (
                      <span className="text-xl">{ex.emoji}</span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-xs text-on-surface truncate">{ex.name}</p>
                    <p className="text-[10px] text-on-surface-variant uppercase tracking-wider truncate">
                      {ex.primaryMuscles.join(' · ')}
                    </p>
                  </div>
                  <span className="material-symbols-outlined text-primary text-[18px]">add_circle</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
