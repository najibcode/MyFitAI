// ─────────────────────────────────────────────────────────────
// MyFitAI — Enhanced Exercise Set Logger
// Supports: Weight×Reps, Bodyweight, Timed, Cardio, Reps-per-side,
// ghost values, RPE/RIR effort modes, progression recommendations,
// set notes, PR indicators, and swipe-to-skip.
// ─────────────────────────────────────────────────────────────

import { useState, useRef, useEffect } from 'react';
import type { LoggedSet, SetType, EffortMode } from '../../types/workout';
import { createDefaultLoggedSet } from '../../types/workout';
import type { ExerciseType } from '../../types/exercise';
import type { ProgressionRecommendation } from '../../engine/progression';
import { generateWarmupSets } from '../../engine/warmupGenerator';
import { triggerHaptic } from '../../utils/audioFeedback';

interface GhostValue {
  reps: number;
  weight: number;
  rpe: number;
  duration?: number;
  distance?: number;
}

interface ExerciseSetLoggerProps {
  exerciseIdx: number;
  exerciseName: string;
  thumbnailEmoji?: string;
  gifUrl?: string;
  imageUrl?: string;
  exerciseType?: ExerciseType;
  sets: LoggedSet[];
  ghostValues: GhostValue[];
  restSeconds: number;
  onLogSet: (exerciseIdx: number, setIdx: number, set: LoggedSet) => void;
  onAddSet: (exerciseIdx: number) => void;
  onRemoveSet: (exerciseIdx: number, setIdx: number) => void;
  onSetComplete: (exerciseIdx: number, setIdx: number) => void;
  onStartRest: (seconds: number) => void;
  exerciseId: string;
  sessionId?: string;
  effortMode?: EffortMode;
  progressionRec?: ProgressionRecommendation;
  exerciseNotes?: string;
  onUpdateExerciseNotes?: (notes: string) => void;
  onOpenPlateCalc?: (weight?: number) => void;
  onPrependWarmupSets?: (exerciseIdx: number, warmupSets: LoggedSet[]) => void;
}

const SET_TYPE_LABELS: Record<SetType, { label: string; short: string; color: string }> = {
  normal:  { label: 'Normal',  short: 'N', color: 'text-on-surface' },
  warmup:  { label: 'Warm-up', short: 'W', color: 'text-[#60A5FA]' },
  drop:    { label: 'Drop',    short: 'D', color: 'text-[#FBBF24]' },
  amrap:   { label: 'AMRAP',   short: 'A', color: 'text-[#6FFB85]' },
  failure: { label: 'Failure', short: 'F', color: 'text-error' },
};

export default function ExerciseSetLogger({
  exerciseIdx,
  exerciseName,
  thumbnailEmoji,
  gifUrl,
  imageUrl,
  exerciseType = 'weight_reps',
  sets,
  ghostValues,
  restSeconds,
  onLogSet,
  onAddSet,
  onRemoveSet,
  onSetComplete,
  onStartRest,
  effortMode = 'rpe',
  progressionRec,
  exerciseNotes,
  onUpdateExerciseNotes,
  onOpenPlateCalc,
  onPrependWarmupSets,
}: ExerciseSetLoggerProps) {
  const [expandedSetType, setExpandedSetType] = useState<number | null>(null);
  const [activeSetNoteIdx, setActiveSetNoteIdx] = useState<number | null>(null);
  const [showNotesEditor, setShowNotesEditor] = useState(false);
  const swipeRef = useRef<{ startX: number; idx: number } | null>(null);
  const [swipedIdx, setSwipedIdx] = useState<number | null>(null);

  const handleGenerateWarmup = () => {
    if (!onPrependWarmupSets) return;
    const firstWorkingSet = sets.find(s => s.weight > 0 && s.setType !== 'warmup') || sets[0];
    const workingWeight = firstWorkingSet?.weight || ghostValues[0]?.weight || 0;
    if (workingWeight <= 45) {
      const barSet = createDefaultLoggedSet('warmup');
      barSet.weight = 45;
      barSet.reps = 10;
      onPrependWarmupSets(exerciseIdx, [barSet]);
      return;
    }
    const warmupSets = generateWarmupSets(workingWeight, { unit: 'lbs' });
    if (warmupSets.length > 0) {
      onPrependWarmupSets(exerciseIdx, warmupSets);
    }
  };

  // Active timer for timed exercises
  const [activeTimerSetIdx, setActiveTimerSetIdx] = useState<number | null>(null);
  const [timerSeconds, setTimerSeconds] = useState(0);
  const timerIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, []);

  const handleStartSetTimer = (setIdx: number) => {
    if (activeTimerSetIdx === setIdx) {
      // Stop timer and assign
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      const current = sets[setIdx];
      onLogSet(exerciseIdx, setIdx, { ...current, duration: timerSeconds });
      setActiveTimerSetIdx(null);
    } else {
      // Start stopwatch
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      setActiveTimerSetIdx(setIdx);
      setTimerSeconds(sets[setIdx].duration || 0);
      timerIntervalRef.current = setInterval(() => {
        setTimerSeconds(prev => prev + 1);
      }, 1000);
    }
  };

  const handleInputChange = (
    setIdx: number,
    field: keyof LoggedSet,
    value: string | number
  ) => {
    const current = sets[setIdx];
    const numVal = typeof value === 'string' ? (parseFloat(value) || 0) : value;
    onLogSet(exerciseIdx, setIdx, { ...current, [field]: numVal });
  };

  const handleSideRepsChange = (setIdx: number, side: 'left' | 'right', val: string) => {
    const current = sets[setIdx];
    const numVal = parseInt(val) || 0;
    const currentSides = current.repsPerSide || { left: current.reps || 0, right: current.reps || 0 };
    const updatedSides = { ...currentSides, [side]: numVal };
    onLogSet(exerciseIdx, setIdx, {
      ...current,
      repsPerSide: updatedSides,
      reps: Math.min(updatedSides.left, updatedSides.right),
    });
  };

  const handleSetTypeChange = (setIdx: number, type: SetType) => {
    const current = sets[setIdx];
    onLogSet(exerciseIdx, setIdx, { ...current, setType: type });
    setExpandedSetType(null);
  };

  const handleComplete = (setIdx: number) => {
    const current = sets[setIdx];
    if (current.completed) return;

    const ghost = ghostValues[setIdx];
    const finalSet: LoggedSet = {
      ...current,
      reps: current.reps || ghost?.reps || 0,
      weight: current.weight || ghost?.weight || 0,
      rpe: current.rpe || ghost?.rpe || 0,
      duration: current.duration || ghost?.duration || (activeTimerSetIdx === setIdx ? timerSeconds : undefined),
      completed: true,
      timestamp: new Date().toISOString(),
    };

    if (activeTimerSetIdx === setIdx) {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      setActiveTimerSetIdx(null);
    }

    onLogSet(exerciseIdx, setIdx, finalSet);
    onSetComplete(exerciseIdx, setIdx);

    // Auto-start rest timer
    if (restSeconds > 0) {
      onStartRest(restSeconds);
    }

    // Haptic feedback
    triggerHaptic('success');
  };

  const handleSkip = (setIdx: number) => {
    triggerHaptic('light');
    const current = sets[setIdx];
    onLogSet(exerciseIdx, setIdx, { ...current, skipped: true, completed: true, timestamp: new Date().toISOString() });
    setSwipedIdx(null);
  };

  // Touch swipe handlers
  const handleTouchStart = (idx: number, e: React.TouchEvent) => {
    swipeRef.current = { startX: e.touches[0].clientX, idx };
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!swipeRef.current) return;
    const deltaX = e.changedTouches[0].clientX - swipeRef.current.startX;
    if (deltaX < -60) {
      setSwipedIdx(swipeRef.current.idx);
    } else {
      setSwipedIdx(null);
    }
    swipeRef.current = null;
  };

  const completedCount = sets.filter(s => s.completed && !s.skipped).length;
  const totalSets = sets.length;

  return (
    <div className="bg-[var(--color-surface-container)] rounded-3xl border border-white/[0.04] overflow-hidden animate-card-enter space-y-2">
      {/* Exercise Header */}
      <div className="px-4 sm:px-5 pt-4 pb-2 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="flex-shrink-0 w-1.5 h-10 bg-primary rounded-full" />
          {imageUrl || gifUrl ? (
            <div className="w-10 h-10 rounded-xl overflow-hidden bg-black/40 border border-white/10 flex-shrink-0 flex items-center justify-center">
              <img src={imageUrl || gifUrl} alt="" className="w-full h-full object-cover" />
            </div>
          ) : (
            <span className="text-2xl flex-shrink-0">{thumbnailEmoji || '🏋️'}</span>
          )}
          <div className="flex-1 min-w-0">
            <h3 className="font-headline font-extrabold text-sm sm:text-base text-on-surface leading-snug tracking-tight break-words">
              {exerciseName}
            </h3>
            <p className="text-[10px] text-on-surface-variant uppercase tracking-[0.15em] font-semibold mt-0.5">
              {completedCount}/{totalSets} Sets · {restSeconds}s Rest
            </p>
          </div>
        </div>

        {/* Header Right Action - Notes */}
        <button
          onClick={() => setShowNotesEditor(!showNotesEditor)}
          className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all flex-shrink-0 border ${
            exerciseNotes || showNotesEditor
              ? 'text-primary bg-primary/10 border-primary/30'
              : 'text-on-surface-variant/60 hover:text-on-surface hover:bg-white/[0.06] border-white/[0.06]'
          }`}
          title="Exercise Notes"
        >
          <span className="material-symbols-outlined text-[18px]">sticky_note_2</span>
        </button>
      </div>

      {/* Animated Workout Demonstration - Always Visible */}
      {(gifUrl || imageUrl) && (
        <div className="px-3 sm:px-4 py-1.5">
          <div className="w-full h-48 sm:h-56 rounded-2xl overflow-hidden bg-black relative border border-white/10 flex items-center justify-center shadow-lg group">
            {gifUrl ? (
              <img
                src={gifUrl}
                alt={exerciseName}
                className="w-full h-full object-contain p-1"
                loading="lazy"
              />
            ) : (
              <img
                src={imageUrl}
                alt={exerciseName}
                className="w-full h-full object-cover opacity-85"
                loading="lazy"
              />
            )}
            <div className="absolute top-2.5 left-2.5 px-2.5 py-0.5 rounded-full bg-black/75 backdrop-blur-sm text-[9px] font-bold text-white uppercase tracking-wider flex items-center gap-1.5 z-10 border border-white/10 pointer-events-none">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Animated Form Guide
            </div>
          </div>
        </div>
      )}

      {/* Quick Utility Tools: Warmup & Plates */}
      {(onPrependWarmupSets || onOpenPlateCalc) && (exerciseType === 'weight_reps' || exerciseType === 'reps_per_side') && (
        <div className="px-3 sm:px-4 py-1 flex items-center gap-2 flex-wrap">
          {onPrependWarmupSets && (
            <button
              onClick={handleGenerateWarmup}
              className="px-3 py-1.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-[10px] font-bold uppercase tracking-wider text-on-surface-variant hover:text-primary transition-all flex items-center gap-1.5 border border-white/[0.06] active:scale-95"
              title="Auto-calculate warm-up ramp sets"
            >
              <span className="material-symbols-outlined text-[14px] text-[#60A5FA]">whatshot</span>
              Warmup Ramp
            </button>
          )}

          {onOpenPlateCalc && (
            <button
              onClick={() => {
                const targetWeight = sets.find(s => s.weight > 0)?.weight || ghostValues[0]?.weight || 0;
                onOpenPlateCalc(targetWeight);
              }}
              className="px-3 py-1.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-[10px] font-bold uppercase tracking-wider text-on-surface-variant hover:text-primary transition-all flex items-center gap-1.5 border border-white/[0.06] active:scale-95"
              title="Barbell Plate Calculator"
            >
              <span className="material-symbols-outlined text-[14px] text-primary">calculate</span>
              Plate Calc
            </button>
          )}
        </div>
      )}

      {/* Progression Recommendation Banner */}
      {progressionRec && progressionRec.reason && (
        <div className="mx-4 px-3.5 py-2 rounded-xl bg-primary/10 border border-primary/20 flex items-center gap-2">
          <span className="material-symbols-outlined text-primary text-[16px] flex-shrink-0">
            trending_up
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-bold text-primary truncate">
              Target: {progressionRec.targetWeight > 0 ? `${progressionRec.targetWeight}kg × ` : ''}{progressionRec.targetReps} reps
            </p>
            <p className="text-[10px] text-on-surface-variant truncate">
              {progressionRec.reason}
            </p>
          </div>
        </div>
      )}

      {/* Exercise Notes Box */}
      {showNotesEditor && (
        <div className="mx-4 pb-2">
          <input
            type="text"
            value={exerciseNotes || ''}
            onChange={(e) => onUpdateExerciseNotes?.(e.target.value)}
            placeholder="Notes for this exercise (e.g. 2 notches higher on pin)..."
            className="w-full bg-white/[0.03] border border-white/[0.06] rounded-xl px-3 py-2 text-xs text-on-surface outline-none focus:border-primary/40"
          />
        </div>
      )}

      {/* Set Rows */}
      <div className="px-3 pb-3 space-y-1.5">
        {/* Dynamic Column Headers based on Exercise Type */}
        <div className="grid grid-cols-[36px_1fr_1fr_48px_40px] gap-2 px-2 pb-1">
          <span className="text-[9px] text-on-surface-variant uppercase tracking-[0.2em] font-bold">Set</span>
          
          {exerciseType === 'timed' ? (
            <>
              <span className="text-[9px] text-on-surface-variant uppercase tracking-[0.2em] font-bold">Duration</span>
              <span className="text-[9px] text-on-surface-variant uppercase tracking-[0.2em] font-bold">Timer</span>
            </>
          ) : exerciseType === 'cardio' ? (
            <>
              <span className="text-[9px] text-on-surface-variant uppercase tracking-[0.2em] font-bold">Dist (km)</span>
              <span className="text-[9px] text-on-surface-variant uppercase tracking-[0.2em] font-bold">Time (m)</span>
            </>
          ) : exerciseType === 'reps_per_side' ? (
            <>
              <span className="text-[9px] text-on-surface-variant uppercase tracking-[0.2em] font-bold">L Reps</span>
              <span className="text-[9px] text-on-surface-variant uppercase tracking-[0.2em] font-bold">R Reps</span>
            </>
          ) : exerciseType === 'bodyweight_reps' ? (
            <>
              <span className="text-[9px] text-on-surface-variant uppercase tracking-[0.2em] font-bold">+Weight</span>
              <span className="text-[9px] text-on-surface-variant uppercase tracking-[0.2em] font-bold">Reps</span>
            </>
          ) : (
            <>
              <span className="text-[9px] text-on-surface-variant uppercase tracking-[0.2em] font-bold">Weight</span>
              <span className="text-[9px] text-on-surface-variant uppercase tracking-[0.2em] font-bold">Reps</span>
            </>
          )}

          <span className="text-[9px] text-on-surface-variant uppercase tracking-[0.2em] font-bold text-center">
            {effortMode === 'rir' ? 'RIR' : effortMode === 'off' ? 'Note' : 'RPE'}
          </span>
          <span className="text-[9px] text-on-surface-variant uppercase tracking-[0.2em] font-bold text-center">✓</span>
        </div>

        {sets.map((set, setIdx) => {
          const ghost = ghostValues[setIdx];
          const isCompleted = set.completed;
          const isSkipped = set.skipped;
          const isSwiped = swipedIdx === setIdx;
          const typeInfo = SET_TYPE_LABELS[set.setType];
          const isPR = !!set.isPR;

          return (
            <div
              key={setIdx}
              className="relative overflow-hidden rounded-2xl"
              onTouchStart={(e) => handleTouchStart(setIdx, e)}
              onTouchEnd={handleTouchEnd}
            >
              {/* Swipe action */}
              {isSwiped && !isCompleted && (
                <div className="absolute inset-0 flex items-center justify-end pr-3 bg-error/10 z-10">
                  <button
                    onClick={() => handleSkip(setIdx)}
                    className="px-3 py-1.5 bg-error text-white text-[10px] font-bold uppercase tracking-widest rounded-lg active:scale-95"
                  >
                    Skip
                  </button>
                  <button
                    onClick={() => onRemoveSet(exerciseIdx, setIdx)}
                    className="px-3 py-1.5 bg-[var(--color-surface-container-highest)] text-on-surface-variant text-[10px] font-bold uppercase tracking-widest rounded-lg ml-2 active:scale-95"
                  >
                    Delete
                  </button>
                </div>
              )}

              <div
                className={`grid grid-cols-[36px_1fr_1fr_48px_40px] gap-2 items-center px-2 py-2 rounded-2xl transition-all ${
                  isSkipped
                    ? 'bg-error/5 opacity-40'
                    : isCompleted
                    ? isPR
                      ? 'bg-primary/10 border border-primary/30'
                      : 'bg-[var(--color-surface-container-high)] opacity-80'
                    : 'bg-[var(--color-surface-container-low)] hover:bg-[var(--color-surface-container-high)]'
                } ${isSwiped ? 'translate-x-[-120px]' : 'translate-x-0'}`}
              >
                {/* Set number + type indicator button */}
                <button
                  onClick={() => setExpandedSetType(expandedSetType === setIdx ? null : setIdx)}
                  className={`text-center text-xs font-black ${typeInfo.color} w-9 h-9 flex items-center justify-center rounded-xl bg-white/[0.03] active:scale-90 transition-transform relative`}
                  disabled={isCompleted}
                >
                  {isSkipped ? '—' : typeInfo.short}
                  {isPR && (
                    <span className="absolute -top-1 -right-1 w-3 h-3 bg-primary rounded-full flex items-center justify-center text-[7px] text-black font-black">
                      ★
                    </span>
                  )}
                </button>

                {/* COL 1 Input */}
                {exerciseType === 'timed' ? (
                  <input
                    type="number"
                    inputMode="numeric"
                    value={activeTimerSetIdx === setIdx ? timerSeconds : (set.duration || '')}
                    placeholder={ghost?.duration?.toString() || '30'}
                    onChange={(e) => handleInputChange(setIdx, 'duration', e.target.value)}
                    disabled={isCompleted || activeTimerSetIdx === setIdx}
                    className="w-full bg-white/[0.03] border border-white/[0.06] rounded-xl px-2 py-2 text-sm font-bold text-on-surface text-center outline-none focus:border-primary/50 tabular-nums"
                  />
                ) : exerciseType === 'cardio' ? (
                  <input
                    type="number"
                    step="0.1"
                    inputMode="decimal"
                    value={set.distance || ''}
                    placeholder="km"
                    onChange={(e) => handleInputChange(setIdx, 'distance', e.target.value)}
                    disabled={isCompleted}
                    className="w-full bg-white/[0.03] border border-white/[0.06] rounded-xl px-2 py-2 text-sm font-bold text-on-surface text-center outline-none focus:border-primary/50 tabular-nums"
                  />
                ) : exerciseType === 'reps_per_side' ? (
                  <input
                    type="number"
                    inputMode="numeric"
                    value={set.repsPerSide?.left || ''}
                    placeholder="L"
                    onChange={(e) => handleSideRepsChange(setIdx, 'left', e.target.value)}
                    disabled={isCompleted}
                    className="w-full bg-white/[0.03] border border-white/[0.06] rounded-xl px-2 py-2 text-sm font-bold text-on-surface text-center outline-none focus:border-primary/50 tabular-nums"
                  />
                ) : (
                  <input
                    type="number"
                    step="0.5"
                    inputMode="decimal"
                    value={set.weight || ''}
                    placeholder={ghost?.weight?.toString() || (exerciseType === 'bodyweight_reps' ? 'BW' : '0')}
                    onChange={(e) => handleInputChange(setIdx, 'weight', e.target.value)}
                    disabled={isCompleted}
                    className="w-full bg-white/[0.03] border border-white/[0.06] rounded-xl px-2 py-2 text-sm font-bold text-on-surface text-center outline-none focus:border-primary/50 tabular-nums"
                  />
                )}

                {/* COL 2 Input */}
                {exerciseType === 'timed' ? (
                  <button
                    onClick={() => handleStartSetTimer(setIdx)}
                    disabled={isCompleted}
                    className={`w-full py-2 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1 active:scale-95 transition-all ${
                      activeTimerSetIdx === setIdx
                        ? 'bg-primary text-black animate-pulse'
                        : 'bg-white/[0.04] text-on-surface hover:bg-white/[0.08]'
                    }`}
                  >
                    <span className="material-symbols-outlined text-sm">
                      {activeTimerSetIdx === setIdx ? 'pause' : 'timer'}
                    </span>
                    {activeTimerSetIdx === setIdx ? `${timerSeconds}s` : 'Start'}
                  </button>
                ) : exerciseType === 'cardio' ? (
                  <input
                    type="number"
                    inputMode="numeric"
                    value={set.duration ? Math.round(set.duration / 60) : ''}
                    placeholder="min"
                    onChange={(e) => handleInputChange(setIdx, 'duration', (parseFloat(e.target.value) || 0) * 60)}
                    disabled={isCompleted}
                    className="w-full bg-white/[0.03] border border-white/[0.06] rounded-xl px-2 py-2 text-sm font-bold text-on-surface text-center outline-none focus:border-primary/50 tabular-nums"
                  />
                ) : exerciseType === 'reps_per_side' ? (
                  <input
                    type="number"
                    inputMode="numeric"
                    value={set.repsPerSide?.right || ''}
                    placeholder="R"
                    onChange={(e) => handleSideRepsChange(setIdx, 'right', e.target.value)}
                    disabled={isCompleted}
                    className="w-full bg-white/[0.03] border border-white/[0.06] rounded-xl px-2 py-2 text-sm font-bold text-on-surface text-center outline-none focus:border-primary/50 tabular-nums"
                  />
                ) : (
                  <input
                    type="number"
                    inputMode="numeric"
                    value={set.reps || ''}
                    placeholder={ghost?.reps?.toString() || '0'}
                    onChange={(e) => handleInputChange(setIdx, 'reps', e.target.value)}
                    disabled={isCompleted}
                    className="w-full bg-white/[0.03] border border-white/[0.06] rounded-xl px-2 py-2 text-sm font-bold text-on-surface text-center outline-none focus:border-primary/50 tabular-nums"
                  />
                )}

                {/* COL 3: RPE / RIR / Note Toggle */}
                {effortMode === 'rir' ? (
                  <select
                    value={set.rpe ? 10 - set.rpe : ''}
                    onChange={(e) => {
                      const rir = parseFloat(e.target.value);
                      handleInputChange(setIdx, 'rpe', isNaN(rir) ? 0 : 10 - rir);
                    }}
                    disabled={isCompleted}
                    className="bg-white/[0.05] border border-white/[0.08] focus:border-primary/50 rounded-xl px-1 py-2 text-xs font-bold text-on-surface text-center outline-none disabled:opacity-50 appearance-none transition-colors"
                  >
                    <option value="" className="bg-[#1c1c1c] text-white">—</option>
                    {[0, 1, 2, 3, 4].map(v => (
                      <option key={v} value={v} className="bg-[#1c1c1c] text-white">{v}</option>
                    ))}
                  </select>
                ) : effortMode === 'off' ? (
                  <button
                    onClick={() => setActiveSetNoteIdx(activeSetNoteIdx === setIdx ? null : setIdx)}
                    className={`w-9 h-9 flex items-center justify-center rounded-xl mx-auto ${
                      set.notes ? 'text-primary bg-primary/10' : 'text-on-surface-variant/40'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[16px]">notes</span>
                  </button>
                ) : (
                  <select
                    value={set.rpe || ''}
                    onChange={(e) => handleInputChange(setIdx, 'rpe', e.target.value)}
                    disabled={isCompleted}
                    className="bg-white/[0.05] border border-white/[0.08] focus:border-primary/50 rounded-xl px-1 py-2 text-xs font-bold text-on-surface text-center outline-none disabled:opacity-50 appearance-none transition-colors"
                  >
                    <option value="" className="bg-[#1c1c1c] text-white">—</option>
                    {[6, 6.5, 7, 7.5, 8, 8.5, 9, 9.5, 10].map(v => (
                      <option key={v} value={v} className="bg-[#1c1c1c] text-white">{v}</option>
                    ))}
                  </select>
                )}

                {/* Complete button */}
                <button
                  onClick={() => handleComplete(setIdx)}
                  disabled={isCompleted}
                  className={`w-9 h-9 flex items-center justify-center rounded-xl transition-all active:scale-90 mx-auto ${
                    isCompleted
                      ? 'bg-[#6FFB85]/20 text-[#6FFB85]'
                      : 'bg-white/[0.03] text-on-surface-variant hover:bg-primary/10 hover:text-primary'
                  }`}
                >
                  <span className="material-symbols-outlined text-[18px]" style={isCompleted ? { fontVariationSettings: "'FILL' 1" } : {}}>
                    {isCompleted ? 'check_circle' : 'radio_button_unchecked'}
                  </span>
                </button>
              </div>

              {/* Individual Set Note Input */}
              {activeSetNoteIdx === setIdx && (
                <div className="px-2 py-1.5 bg-white/[0.02]">
                  <input
                    type="text"
                    value={set.notes || ''}
                    onChange={(e) => handleInputChange(setIdx, 'notes', e.target.value)}
                    placeholder="Set note (e.g. form felt smooth)..."
                    className="w-full bg-white/[0.03] border border-white/[0.06] rounded-lg px-2.5 py-1 text-[11px] text-on-surface outline-none"
                  />
                </div>
              )}

              {/* Set type picker dropdown */}
              {expandedSetType === setIdx && !isCompleted && (
                <div className="flex gap-1.5 px-2 py-2 bg-[var(--color-surface-container-high)] rounded-b-2xl animate-in fade-in duration-200">
                  {(Object.entries(SET_TYPE_LABELS) as [SetType, typeof SET_TYPE_LABELS[SetType]][]).map(([type, info]) => (
                    <button
                      key={type}
                      onClick={() => handleSetTypeChange(setIdx, type)}
                      className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all active:scale-95 ${
                        set.setType === type
                          ? 'bg-primary/15 text-primary border border-primary/30'
                          : 'bg-white/[0.03] text-on-surface-variant hover:bg-white/[0.06]'
                      }`}
                    >
                      {info.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}

        {/* Add Set */}
        <button
          onClick={() => onAddSet(exerciseIdx)}
          className="w-full py-2.5 rounded-2xl border border-dashed border-white/[0.08] text-[11px] font-bold uppercase tracking-widest text-on-surface-variant hover:text-primary hover:border-primary/30 transition-all active:scale-[0.98] flex items-center justify-center gap-1.5"
        >
          <span className="material-symbols-outlined text-[14px]">add</span>
          Add Set
        </button>
      </div>
    </div>
  );
}
