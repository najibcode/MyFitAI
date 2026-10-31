// ─────────────────────────────────────────────────────────────
// MyFitAI — Session Header
// Sticky top bar during active workout: athletic typography, high-contrast monospace timer, Lucide actions
// ─────────────────────────────────────────────────────────────

import { useState } from 'react';
import { formatDuration } from '../../types/workout';
import { Calculator, X, Edit3, Check } from 'lucide-react';

interface SessionHeaderProps {
  workoutName: string;
  elapsed: number;
  currentExercise: number;
  totalExercises: number;
  onEnd: () => void;
  onOpenPlateCalc: () => void;
  onRename?: (name: string) => void;
}

export default function SessionHeader({
  workoutName,
  elapsed,
  currentExercise,
  totalExercises,
  onEnd,
  onOpenPlateCalc,
  onRename,
}: SessionHeaderProps) {
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [tempTitle, setTempTitle] = useState(workoutName);

  const handleSaveTitle = () => {
    if (tempTitle.trim() && onRename) {
      onRename(tempTitle.trim());
    }
    setIsEditingTitle(false);
  };

  return (
    <header className="sticky top-0 z-40 bg-[#080808]/90 backdrop-blur-md border-b border-[#2A2A2D]">
      <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
        {/* Left — Workout info */}
        <div className="flex-1 min-w-0 pr-2">
          {isEditingTitle ? (
            <div className="flex items-center gap-1.5">
              <input
                type="text"
                value={tempTitle}
                onChange={(e) => setTempTitle(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSaveTitle()}
                autoFocus
                className="bg-[#151517] border border-[#FF8A00] rounded-lg px-2 py-0.5 text-xs font-headline font-bold text-white uppercase outline-none w-full max-w-[180px]"
              />
              <button
                onClick={handleSaveTitle}
                className="w-6 h-6 rounded bg-[#FF8A00] text-black flex items-center justify-center shrink-0 active:scale-90"
              >
                <Check className="w-3.5 h-3.5 stroke-[3]" />
              </button>
              <button
                onClick={() => { setTempTitle(workoutName); setIsEditingTitle(false); }}
                className="w-6 h-6 rounded bg-[#2A2A2D] text-white flex items-center justify-center shrink-0 active:scale-90"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <div 
              onClick={() => { setTempTitle(workoutName); setIsEditingTitle(true); }}
              className="group cursor-pointer flex items-center gap-1.5"
              title="Click to rename workout"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-[#FF8A00] animate-pulse shrink-0" />
              <h2 className="font-headline font-black text-sm tracking-tight uppercase truncate text-[#F5F5F5] group-hover:text-[#FF8A00] transition-colors">
                {workoutName || 'Freestyle Workout'}
              </h2>
              <Edit3 className="w-3 h-3 text-[#A1A1A6] opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
            </div>
          )}
          <p className="text-[10px] text-[#A1A1A6] font-mono tracking-wider uppercase mt-0.5">
            EXERCISE {currentExercise} OF {totalExercises || 1}
          </p>
        </div>

        {/* Center — Stopwatch */}
        <div className="flex-shrink-0">
          <div className="bg-[#151517] border border-[#2A2A2D] rounded-lg px-3 py-1 text-center">
            <span className="font-mono font-black text-lg tracking-tight text-[#30D158] tabular-nums">
              {formatDuration(elapsed)}
            </span>
          </div>
        </div>

        {/* Right — Actions */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={onOpenPlateCalc}
            className="w-9 h-9 flex items-center justify-center rounded-lg bg-[#151517] text-[#A1A1A6] hover:text-[#F5F5F5] hover:bg-[#1E1E20] transition-colors border border-[#2A2A2D] active:scale-95"
            title="Plate Calculator"
            aria-label="Plate Calculator"
          >
            <Calculator className="w-4 h-4" />
          </button>
          <button
            onClick={onEnd}
            className="h-9 px-3 flex items-center justify-center gap-1.5 rounded-lg bg-[#FF453A]/10 text-[#FF453A] border border-[#FF453A]/30 text-xs font-bold uppercase tracking-wider hover:bg-[#FF453A]/20 transition-all active:scale-95"
          >
            <X className="w-3.5 h-3.5" />
            <span>Finish</span>
          </button>
        </div>
      </div>
    </header>
  );
}

