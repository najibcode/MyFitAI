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
import {
  Dumbbell,
  CheckCircle2,
  Circle,
  Flame,
  Calculator,
  TrendingUp,
  Play,
  Pause,
  Plus,
  FileText,
  Trash2,
  SkipForward,
} from 'lucide-react';

import ExerciseMedia from '../media/ExerciseMedia';

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
  normal:      { label: 'Normal',      short: 'N',  color: 'text-[#F5F5F5]' },
  warmup:      { label: 'Warm-up',     short: 'W',  color: 'text-[#4F9CF9]' },
  drop:        { label: 'Dropset',     short: 'D',  color: 'text-[#F5C542]' },
  amrap:       { label: 'AMRAP',       short: 'A',  color: 'text-[#30D158]' },
  failure:     { label: 'Failure',     short: 'F',  color: 'text-[#FF453A]' },
  rest_pause:  { label: 'Rest-Pause',  short: 'RP', color: 'text-[#BF5AF2]' },
  myo_reps:    { label: 'Myo-Reps',    short: 'M',  color: 'text-[#FF9F0A]' },
  top_set:     { label: 'Top Set',     short: 'T',  color: 'text-[#FF375F]' },
  back_off:    { label: 'Back-off',    short: 'B',  color: 'text-[#64D2FF]' },
  timed:       { label: 'Timed Hold',  short: 'TM', color: 'text-[#FFD60A]' },
  bodyweight:  { label: 'Bodyweight',  short: 'BW', color: 'text-[#32D74B]' },
  cardio:      { label: 'Cardio',      short: 'C',  color: 'text-[#30B0C7]' },
};

export default function ExerciseSetLogger({
  exerciseIdx,
  exerciseName,
  thumbnailEmoji: _thumbnailEmoji,
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
    if (onSetComplete) {
      onSetComplete(exerciseIdx, setIdx);
    } else if (restSeconds > 0) {
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
    <div className="bg-[#151517] rounded-2xl border border-[#2A2A2D] overflow-hidden space-y-2">
      {/* Exercise Header */}
      <div className="px-4 pt-4 pb-2 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="flex-shrink-0 w-1.5 h-9 bg-[#30D158] rounded-full" />
          {imageUrl || gifUrl ? (
            <div className="w-10 h-10 rounded-lg overflow-hidden bg-black/40 border border-[#2A2A2D] flex-shrink-0 flex items-center justify-center">
              <img src={imageUrl || gifUrl} alt="" className="w-full h-full object-cover" />
            </div>
          ) : (
            <div className="w-10 h-10 rounded-lg bg-[#1E1E20] border border-[#2A2A2D] flex-shrink-0 flex items-center justify-center text-[#A1A1A6]">
              <Dumbbell className="w-5 h-5 text-[#30D158]" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <h3 className="font-headline font-black text-sm text-[#F5F5F5] uppercase tracking-tight break-words">
              {exerciseName}
            </h3>
            <p className="text-[10px] text-[#A1A1A6] font-mono uppercase tracking-wider mt-0.5">
              {completedCount}/{totalSets} SETS · {restSeconds}S REST
            </p>
          </div>
        </div>

        {/* Header Right Action - Notes */}
        <button
          onClick={() => setShowNotesEditor(!showNotesEditor)}
          className={`w-9 h-9 rounded-lg flex items-center justify-center transition-all flex-shrink-0 border ${
            exerciseNotes || showNotesEditor
              ? 'text-[#30D158] bg-[#30D158]/10 border-[#30D158]/30'
              : 'text-[#A1A1A6] hover:text-[#F5F5F5] hover:bg-[#1E1E20] border-[#2A2A2D]'
          }`}
          title="Exercise Notes"
        >
          <FileText className="w-4 h-4" />
        </button>
      </div>

      {/* Animated Biomechanical Form Guide — Integrated Media Engine */}
      {(gifUrl || imageUrl) && (
        <div className="px-3 sm:px-4 py-1">
          <ExerciseMedia
            gifUrl={gifUrl}
            imageUrl={imageUrl}
            exerciseName={exerciseName}
            aspectRatio="wide"
            priority={exerciseIdx === 0}
          />
        </div>
      )}

      {/* Quick Utility Tools: Warmup & Plates */}
      {(onPrependWarmupSets || onOpenPlateCalc) && (exerciseType === 'weight_reps' || exerciseType === 'reps_per_side') && (
        <div className="px-3 sm:px-4 py-1 flex items-center gap-2 flex-wrap">
          {onPrependWarmupSets && (
            <button
              onClick={handleGenerateWarmup}
              className="px-3 py-1.5 rounded-lg bg-[#1E1E20] hover:bg-[#2A2A2D] text-[10px] font-mono font-bold uppercase tracking-wider text-[#A1A1A6] hover:text-[#4F9CF9] transition-all flex items-center gap-1.5 border border-[#2A2A2D] active:scale-95"
              title="Auto-calculate warm-up ramp sets"
            >
              <Flame className="w-3.5 h-3.5 text-[#4F9CF9]" />
              WARMUP RAMP
            </button>
          )}

          {onOpenPlateCalc && (
            <button
              onClick={() => {
                const targetWeight = sets.find(s => s.weight > 0)?.weight || ghostValues[0]?.weight || 0;
                onOpenPlateCalc(targetWeight);
              }}
              className="px-3 py-1.5 rounded-lg bg-[#1E1E20] hover:bg-[#2A2A2D] text-[10px] font-mono font-bold uppercase tracking-wider text-[#A1A1A6] hover:text-[#30D158] transition-all flex items-center gap-1.5 border border-[#2A2A2D] active:scale-95"
              title="Barbell Plate Calculator"
            >
              <Calculator className="w-3.5 h-3.5 text-[#30D158]" />
              PLATE CALC
            </button>
          )}
        </div>
      )}

      {/* Progression Recommendation Banner */}
      {progressionRec && progressionRec.reason && (
        <div className="mx-4 px-3.5 py-2 rounded-xl bg-[#30D158]/5 border border-[#30D158]/20 flex items-center gap-2.5">
          <TrendingUp className="w-4 h-4 text-[#30D158] flex-shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-bold text-[#30D158] truncate">
              TARGET: {progressionRec.targetWeight > 0 ? `${progressionRec.targetWeight}kg × ` : ''}{progressionRec.targetReps} reps
            </p>
            <p className="text-[10px] text-[#A1A1A6] truncate">
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
            className="w-full bg-[#1E1E20] border border-[#2A2A2D] rounded-xl px-3 py-2 text-xs text-[#F5F5F5] outline-none focus:border-[#30D158]/50"
          />
        </div>
      )}

      {/* Set Rows */}
      <div className="px-3 pb-3 space-y-2">
        {/* Dynamic Column Headers based on Exercise Type */}
        <div className="grid grid-cols-[34px_1fr_1fr_46px_40px] sm:grid-cols-[40px_1fr_1fr_52px_44px] gap-1.5 sm:gap-2 px-1 sm:px-2 pb-1 items-center">
          <span className="text-[10px] text-[#A1A1A6] font-mono uppercase tracking-wider font-bold text-center">Set</span>
          
          {exerciseType === 'timed' ? (
            <>
              <span className="text-[10px] text-[#A1A1A6] font-mono uppercase tracking-wider font-bold text-center">Duration</span>
              <span className="text-[10px] text-[#A1A1A6] font-mono uppercase tracking-wider font-bold text-center">Timer</span>
            </>
          ) : exerciseType === 'cardio' ? (
            <>
              <span className="text-[10px] text-[#A1A1A6] font-mono uppercase tracking-wider font-bold text-center">Dist (km)</span>
              <span className="text-[10px] text-[#A1A1A6] font-mono uppercase tracking-wider font-bold text-center">Time (m)</span>
            </>
          ) : exerciseType === 'reps_per_side' ? (
            <>
              <span className="text-[10px] text-[#A1A1A6] font-mono uppercase tracking-wider font-bold text-center">L Reps</span>
              <span className="text-[10px] text-[#A1A1A6] font-mono uppercase tracking-wider font-bold text-center">R Reps</span>
            </>
          ) : exerciseType === 'bodyweight_reps' ? (
            <>
              <span className="text-[10px] text-[#A1A1A6] font-mono uppercase tracking-wider font-bold text-center">+Kg</span>
              <span className="text-[10px] text-[#A1A1A6] font-mono uppercase tracking-wider font-bold text-center">Reps</span>
            </>
          ) : (
            <>
              <span className="text-[10px] text-[#A1A1A6] font-mono uppercase tracking-wider font-bold text-center">Kg</span>
              <span className="text-[10px] text-[#A1A1A6] font-mono uppercase tracking-wider font-bold text-center">Reps</span>
            </>
          )}

          <span className="text-[10px] text-[#A1A1A6] font-mono uppercase tracking-wider font-bold text-center">
            {effortMode === 'rir' ? 'RIR' : effortMode === 'off' ? 'Note' : 'RPE'}
          </span>
          <span className="text-[10px] text-[#A1A1A6] font-mono uppercase tracking-wider font-bold text-center">Done</span>
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
              className="relative overflow-hidden rounded-xl"
              onTouchStart={(e) => handleTouchStart(setIdx, e)}
              onTouchEnd={handleTouchEnd}
            >
              {/* Swipe action */}
              {isSwiped && !isCompleted && (
                <div className="absolute inset-0 flex items-center justify-end pr-3 bg-[#FF453A]/10 z-10">
                  <button
                    onClick={() => handleSkip(setIdx)}
                    className="h-10 px-3 bg-[#FF453A] text-white text-[10px] font-bold uppercase tracking-wider rounded-lg active:scale-95 flex items-center gap-1"
                  >
                    <SkipForward className="w-3.5 h-3.5" />
                    Skip
                  </button>
                  <button
                    onClick={() => onRemoveSet(exerciseIdx, setIdx)}
                    className="h-10 px-3 bg-[#2A2A2D] text-[#F5F5F5] text-[10px] font-bold uppercase tracking-wider rounded-lg ml-2 active:scale-95 flex items-center gap-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Del
                  </button>
                </div>
              )}

              <div
                className={`grid grid-cols-[34px_1fr_1fr_46px_40px] sm:grid-cols-[40px_1fr_1fr_52px_44px] gap-1.5 sm:gap-2 items-center px-1.5 sm:px-2 py-2 rounded-xl transition-all ${
                  set.setType === 'drop' ? 'ml-2.5 sm:ml-4 border-l-2 border-l-[#F5C542] shadow-[-4px_0_12px_rgba(245,197,66,0.1)]' : ''
                } ${
                  isSkipped
                    ? 'bg-[#FF453A]/5 opacity-40'
                    : isCompleted
                    ? isPR
                      ? 'bg-[#30D158]/10 border border-[#30D158]/30'
                      : 'bg-[#1E1E20]/90 border border-[#30D158]/20'
                    : 'bg-[#1E1E20] border border-[#2A2A2D] hover:border-[#3A3A3D]'
                } ${isSwiped ? 'translate-x-[-120px]' : 'translate-x-0'}`}
              >
                {/* Set number + type indicator button (min 44px height) */}
                <button
                  onClick={() => setExpandedSetType(expandedSetType === setIdx ? null : setIdx)}
                  className={`text-center font-mono font-black text-xs ${typeInfo.color} h-11 w-8 sm:w-10 flex items-center justify-center rounded-lg bg-[#080808]/60 border border-[#2A2A2D] active:scale-90 transition-transform relative`}
                  disabled={isCompleted}
                  title={`Set ${setIdx + 1} (${typeInfo.label})`}
                >
                  {isSkipped ? '—' : typeInfo.short}
                  {isPR && (
                    <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-[#FF8A00] rounded-full flex items-center justify-center text-[8px] text-black font-black">
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
                    className="w-full h-11 bg-[#080808]/60 border border-[#2A2A2D] rounded-lg px-2 text-sm font-mono font-bold text-[#F5F5F5] text-center outline-none focus:border-[#30D158]/50 tabular-nums"
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
                    className="w-full h-11 bg-[#080808]/60 border border-[#2A2A2D] rounded-lg px-2 text-sm font-mono font-bold text-[#F5F5F5] text-center outline-none focus:border-[#30D158]/50 tabular-nums"
                  />
                ) : exerciseType === 'reps_per_side' ? (
                  <input
                    type="number"
                    inputMode="numeric"
                    value={set.repsPerSide?.left || ''}
                    placeholder="L"
                    onChange={(e) => handleSideRepsChange(setIdx, 'left', e.target.value)}
                    disabled={isCompleted}
                    className="w-full h-11 bg-[#080808]/60 border border-[#2A2A2D] rounded-lg px-2 text-sm font-mono font-bold text-[#F5F5F5] text-center outline-none focus:border-[#30D158]/50 tabular-nums"
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
                    className="w-full h-11 bg-[#080808]/60 border border-[#2A2A2D] rounded-lg px-2 text-sm font-mono font-bold text-[#F5F5F5] text-center outline-none focus:border-[#30D158]/50 tabular-nums"
                  />
                )}

                {/* COL 2 Input */}
                {exerciseType === 'timed' ? (
                  <button
                    onClick={() => handleStartSetTimer(setIdx)}
                    disabled={isCompleted}
                    className={`w-full h-11 rounded-lg text-xs font-mono font-bold uppercase tracking-wider flex items-center justify-center gap-1 active:scale-95 transition-all ${
                      activeTimerSetIdx === setIdx
                        ? 'bg-[#FF8A00] text-black font-black animate-pulse'
                        : 'bg-[#080808]/60 text-[#F5F5F5] border border-[#2A2A2D] hover:bg-[#1E1E20]'
                    }`}
                  >
                    {activeTimerSetIdx === setIdx ? (
                      <>
                        <Pause className="w-3.5 h-3.5" />
                        <span>{timerSeconds}s</span>
                      </>
                    ) : (
                      <>
                        <Play className="w-3.5 h-3.5 text-[#30D158]" />
                        <span>Start</span>
                      </>
                    )}
                  </button>
                ) : exerciseType === 'cardio' ? (
                  <input
                    type="number"
                    inputMode="numeric"
                    value={set.duration ? Math.round(set.duration / 60) : ''}
                    placeholder="min"
                    onChange={(e) => handleInputChange(setIdx, 'duration', (parseFloat(e.target.value) || 0) * 60)}
                    disabled={isCompleted}
                    className="w-full h-11 bg-[#080808]/60 border border-[#2A2A2D] rounded-lg px-2 text-sm font-mono font-bold text-[#F5F5F5] text-center outline-none focus:border-[#30D158]/50 tabular-nums"
                  />
                ) : exerciseType === 'reps_per_side' ? (
                  <input
                    type="number"
                    inputMode="numeric"
                    value={set.repsPerSide?.right || ''}
                    placeholder="R"
                    onChange={(e) => handleSideRepsChange(setIdx, 'right', e.target.value)}
                    disabled={isCompleted}
                    className="w-full h-11 bg-[#080808]/60 border border-[#2A2A2D] rounded-lg px-2 text-sm font-mono font-bold text-[#F5F5F5] text-center outline-none focus:border-[#30D158]/50 tabular-nums"
                  />
                ) : (
                  <input
                    type="number"
                    inputMode="numeric"
                    value={set.reps || ''}
                    placeholder={ghost?.reps?.toString() || '0'}
                    onChange={(e) => handleInputChange(setIdx, 'reps', e.target.value)}
                    disabled={isCompleted}
                    className="w-full h-11 bg-[#080808]/60 border border-[#2A2A2D] rounded-lg px-2 text-sm font-mono font-bold text-[#F5F5F5] text-center outline-none focus:border-[#30D158]/50 tabular-nums"
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
                    className="w-full h-11 bg-[#080808]/60 border border-[#2A2A2D] focus:border-[#30D158]/50 rounded-lg px-1 text-xs font-mono font-bold text-[#F5F5F5] text-center outline-none disabled:opacity-50 appearance-none transition-colors"
                  >
                    <option value="" className="bg-[#151517] text-white">—</option>
                    {[0, 1, 2, 3, 4].map(v => (
                      <option key={v} value={v} className="bg-[#151517] text-white">{v}</option>
                    ))}
                  </select>
                ) : effortMode === 'off' ? (
                  <button
                    onClick={() => setActiveSetNoteIdx(activeSetNoteIdx === setIdx ? null : setIdx)}
                    className={`h-11 w-full flex items-center justify-center rounded-lg border border-[#2A2A2D] ${
                      set.notes ? 'text-[#30D158] bg-[#30D158]/10' : 'text-[#6B6B70] bg-[#080808]/60'
                    }`}
                  >
                    <FileText className="w-4 h-4" />
                  </button>
                ) : (
                  <select
                    value={set.rpe || ''}
                    onChange={(e) => handleInputChange(setIdx, 'rpe', e.target.value)}
                    disabled={isCompleted}
                    className="w-full h-11 bg-[#080808]/60 border border-[#2A2A2D] focus:border-[#30D158]/50 rounded-lg px-1 text-xs font-mono font-bold text-[#F5F5F5] text-center outline-none disabled:opacity-50 appearance-none transition-colors"
                  >
                    <option value="" className="bg-[#151517] text-white">—</option>
                    {[6, 6.5, 7, 7.5, 8, 8.5, 9, 9.5, 10].map(v => (
                      <option key={v} value={v} className="bg-[#151517] text-white">{v}</option>
                    ))}
                  </select>
                )}

                {/* Complete button (44px touch target) */}
                <button
                  onClick={() => handleComplete(setIdx)}
                  disabled={isCompleted}
                  aria-label={isCompleted ? `Set ${setIdx + 1} completed` : `Complete set ${setIdx + 1}`}
                  className={`w-11 h-11 flex items-center justify-center rounded-lg transition-all active:scale-90 mx-auto ${
                    isCompleted
                      ? 'bg-[#30D158]/20 text-[#30D158] border border-[#30D158]/40'
                      : 'bg-[#080808]/60 border border-[#2A2A2D] text-[#A1A1A6] hover:border-[#30D158]/50 hover:text-[#30D158]'
                  }`}
                >
                  {isCompleted ? (
                    <CheckCircle2 className="w-5 h-5 text-[#30D158]" />
                  ) : (
                    <Circle className="w-5 h-5" />
                  )}
                </button>
              </div>

              {/* Individual Set Note Input */}
              {activeSetNoteIdx === setIdx && (
                <div className="px-2 py-1.5 bg-[#080808]/40 border-x border-b border-[#2A2A2D] rounded-b-xl">
                  <input
                    type="text"
                    value={set.notes || ''}
                    onChange={(e) => handleInputChange(setIdx, 'notes', e.target.value)}
                    placeholder="Set note (e.g. form felt smooth)..."
                    className="w-full bg-[#151517] border border-[#2A2A2D] rounded-lg px-2.5 py-1 text-[11px] text-[#F5F5F5] outline-none focus:border-[#30D158]/40"
                  />
                </div>
              )}

              {/* Set type picker dropdown */}
              {expandedSetType === setIdx && !isCompleted && (
                <div className="flex gap-1.5 p-2 bg-[#1E1E20] border-t border-[#2A2A2D] rounded-b-xl">
                  {(Object.entries(SET_TYPE_LABELS) as [SetType, typeof SET_TYPE_LABELS[SetType]][]).map(([type, info]) => (
                    <button
                      key={type}
                      onClick={() => handleSetTypeChange(setIdx, type)}
                      className={`flex-1 py-1.5 rounded-md text-[10px] font-mono font-bold uppercase tracking-wider transition-all active:scale-95 ${
                        set.setType === type
                          ? 'bg-[#30D158]/15 text-[#30D158] border border-[#30D158]/30'
                          : 'bg-[#151517] text-[#A1A1A6] border border-[#2A2A2D] hover:text-[#F5F5F5]'
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

        {/* Add Set Button */}
        <button
          onClick={() => onAddSet(exerciseIdx)}
          className="w-full h-11 rounded-xl border border-dashed border-[#2A2A2D] hover:border-[#30D158]/40 text-xs font-mono font-bold uppercase tracking-wider text-[#A1A1A6] hover:text-[#30D158] bg-[#151517]/50 hover:bg-[#1E1E20] transition-all active:scale-[0.99] flex items-center justify-center gap-2"
        >
          <Plus className="w-4 h-4" />
          <span>Add Set</span>
        </button>
      </div>
    </div>
  );
}
