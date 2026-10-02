// ─────────────────────────────────────────────────────────────
// MyFitAI — Session Header
// Sticky top bar during active workout: name, stopwatch, controls
// ─────────────────────────────────────────────────────────────

import { formatDuration } from '../../types/workout';

interface SessionHeaderProps {
  workoutName: string;
  elapsed: number;
  currentExercise: number;
  totalExercises: number;
  onEnd: () => void;
  onOpenPlateCalc: () => void;
}

export default function SessionHeader({
  workoutName,
  elapsed,
  currentExercise,
  totalExercises,
  onEnd,
  onOpenPlateCalc,
}: SessionHeaderProps) {
  return (
    <div className="sticky top-[56px] z-30 bg-[var(--color-header-bg)]/95 backdrop-blur-xl border-b border-white/[0.06] shadow-sm">
      <div className="max-w-md mx-auto px-4 py-2.5 flex items-center justify-between gap-2">
        {/* Left — Workout info */}
        <div className="flex-1 min-w-0 pr-1">
          <h2 className="font-headline font-extrabold text-xs sm:text-sm tracking-wide uppercase truncate text-on-surface">
            {workoutName || 'Active Workout'}
          </h2>
          <p className="text-[10px] text-on-surface-variant tracking-wider uppercase font-semibold">
            Exercise {currentExercise} of {totalExercises}
          </p>
        </div>

        {/* Center — Stopwatch */}
        <div className="flex-shrink-0">
          <div className="bg-[var(--color-surface-container)] border border-white/[0.08] rounded-xl px-2.5 py-1 text-center shadow-inner">
            <span className="font-mono font-black text-base sm:text-lg tracking-tight text-primary tabular-nums">
              {formatDuration(elapsed)}
            </span>
          </div>
        </div>

        {/* Right — Actions */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <button
            onClick={onOpenPlateCalc}
            className="w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center rounded-xl bg-[var(--color-surface-container)] text-on-surface-variant hover:text-primary hover:bg-white/[0.06] transition-all active:scale-90 border border-white/[0.06]"
            title="Plate Calculator"
          >
            <span className="material-symbols-outlined text-[17px]">calculate</span>
          </button>
          <button
            onClick={onEnd}
            className="h-8 sm:h-9 px-3 flex items-center justify-center rounded-xl bg-error/15 text-error border border-error/30 text-[10px] sm:text-[11px] font-bold uppercase tracking-widest hover:bg-error/25 transition-all active:scale-95 shadow-sm"
          >
            End
          </button>
        </div>
      </div>
    </div>
  );
}
