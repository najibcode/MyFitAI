// ─────────────────────────────────────────────────────────────
// MyFitAI — Quick Start Workout Tool (/workout/quick-start)
// Allows athletes to immediately train without any fixed plan
// (e.g. Legs today, Back & Biceps tomorrow) in 1 single tap.
// Athletic Personal Operating System UI/UX
// ─────────────────────────────────────────────────────────────

import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWorkoutBuilder } from '../../context/WorkoutBuilderContext';
import {
  QUICK_SPLIT_PRESETS,
  AVAILABLE_MUSCLE_CHIPS,
  buildQuickTemplate,
  buildCustomMuscleTemplate,
} from '../../data/quickWorkoutSplits';
import type { MuscleGroup } from '../../types/exercise';
import type { WorkoutExercise } from '../../types/workout';
import {
  Play,
  X,
  Dumbbell,
  Check,
  Trash2,
  Sparkles,
  Flame,
  Layers,
  ChevronRight,
  Info,
} from 'lucide-react';

interface QuickStartWorkoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultFocusId?: string;
}

export default function QuickStartWorkoutModal({
  isOpen,
  onClose,
  defaultFocusId = 'legs',
}: QuickStartWorkoutModalProps) {
  const navigate = useNavigate();
  const { startSession } = useWorkoutBuilder();

  // Mode: 'preset' | 'custom'
  const [mode, setMode] = useState<'preset' | 'custom'>('preset');

  // Selected Preset
  const [selectedPresetId, setSelectedPresetId] = useState<string>(defaultFocusId);

  // Custom Selected Muscles
  const [customMuscles, setCustomMuscles] = useState<MuscleGroup[]>(['back', 'biceps']);

  // Launch blank or with exercises
  const [isStartBlank, setIsStartBlank] = useState(false);

  // Custom editable title
  const [customTitle, setCustomTitle] = useState('');

  // Active exercises list (allows athlete to remove an exercise before starting)
  const currentPreset = useMemo(() => {
    return QUICK_SPLIT_PRESETS.find(p => p.id === selectedPresetId) || QUICK_SPLIT_PRESETS[0];
  }, [selectedPresetId]);

  // Build the proposed template
  const activeTemplate = useMemo(() => {
    if (mode === 'preset') {
      return buildQuickTemplate(currentPreset, {
        blank: isStartBlank,
        customName: customTitle.trim() || undefined,
      });
    } else {
      return buildCustomMuscleTemplate(customMuscles, customTitle.trim() || undefined, {
        blank: isStartBlank,
      });
    }
  }, [mode, currentPreset, customMuscles, isStartBlank, customTitle]);

  // Editable exercises state for fine-tuning
  const [stagedExercises, setStagedExercises] = useState<WorkoutExercise[]>([]);

  // Sync staged exercises when template changes
  useMemo(() => {
    setStagedExercises(activeTemplate.exercises);
  }, [activeTemplate]);

  if (!isOpen) return null;

  const handleToggleMuscle = (m: MuscleGroup) => {
    setCustomMuscles(prev => {
      if (prev.includes(m)) {
        const next = prev.filter(item => item !== m);
        return next.length > 0 ? next : [m];
      } else {
        return [...prev, m];
      }
    });
  };

  const handleRemoveExercise = (idx: number) => {
    setStagedExercises(prev => prev.filter((_, i) => i !== idx));
  };

  const handleStartWorkout = () => {
    const finalTemplate = {
      ...activeTemplate,
      exercises: isStartBlank ? [] : stagedExercises,
      name: customTitle.trim() || activeTemplate.name,
    };

    startSession(finalTemplate, finalTemplate.name);
    onClose();
    navigate('/workout/active');
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center bg-black/85 backdrop-blur-md p-0 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-[#151517] w-full max-w-2xl max-h-[92vh] sm:max-h-[88vh] rounded-t-3xl sm:rounded-3xl border border-[#2A2A2D] shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-8 sm:slide-in-from-bottom-0 duration-200">
        
        {/* Header Bar */}
        <div className="px-5 py-4 border-b border-[#2A2A2D] flex items-center justify-between shrink-0 bg-[#080808]/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#FF8A00]/15 border border-[#FF8A00]/30 flex items-center justify-center text-[#FF8A00]">
              <Play className="w-5 h-5 fill-[#FF8A00] stroke-none ml-0.5" />
            </div>
            <div>
              <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-[#FF8A00] block">
                SPONTANEOUS TRAINING
              </span>
              <h2 className="font-headline font-black text-lg sm:text-xl text-[#F5F5F5] uppercase tracking-tight">
                Quick Start Workout
              </h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-xl bg-[#1E1E20] border border-[#2A2A2D] text-[#A1A1A6] hover:text-[#F5F5F5] flex items-center justify-center transition-colors active:scale-95"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Content Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 custom-scrollbar">
          
          {/* Subheader info cue */}
          <div className="p-3.5 rounded-2xl bg-[#1E1E20]/70 border border-[#2A2A2D] flex items-center gap-3 text-xs text-[#A1A1A6]">
            <Info className="w-4 h-4 text-[#4F9CF9] shrink-0" />
            <p className="leading-relaxed">
              No weekly plan required. Train <span className="text-[#F5F5F5] font-semibold">Legs today, Back & Biceps tomorrow</span>, or build a custom muscle focus on the fly.
            </p>
          </div>

          {/* Mode Selector (Presets vs Custom Muscle Split) */}
          <div className="flex items-center gap-2 p-1 bg-[#1E1E20] rounded-2xl border border-[#2A2A2D]">
            <button
              onClick={() => {
                setMode('preset');
                setCustomTitle('');
              }}
              className={`flex-1 py-2 px-3 rounded-xl text-xs font-headline font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${
                mode === 'preset'
                  ? 'bg-[#FF8A00] text-black shadow-md shadow-[#FF8A00]/20'
                  : 'text-[#A1A1A6] hover:text-[#F5F5F5]'
              }`}
            >
              <Flame className="w-3.5 h-3.5" />
              <span>Muscle Splits</span>
            </button>
            <button
              onClick={() => {
                setMode('custom');
                setCustomTitle('');
              }}
              className={`flex-1 py-2 px-3 rounded-xl text-xs font-headline font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${
                mode === 'custom'
                  ? 'bg-[#FF8A00] text-black shadow-md shadow-[#FF8A00]/20'
                  : 'text-[#A1A1A6] hover:text-[#F5F5F5]'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Custom Focus</span>
            </button>
          </div>

          {/* Preset Splits Grid */}
          {mode === 'preset' && (
            <div className="space-y-3">
              <label className="text-xs font-headline font-bold uppercase tracking-wider text-[#A1A1A6] block">
                Choose Today's Target
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {QUICK_SPLIT_PRESETS.map((preset) => {
                  const isSelected = selectedPresetId === preset.id;
                  return (
                    <button
                      key={preset.id}
                      onClick={() => {
                        setSelectedPresetId(preset.id);
                        setCustomTitle('');
                      }}
                      className={`p-3 rounded-2xl border text-left transition-all active:scale-[0.98] flex flex-col justify-between h-24 ${
                        isSelected
                          ? 'bg-[#FF8A00]/15 border-[#FF8A00] text-[#F5F5F5] shadow-sm'
                          : 'bg-[#1E1E20] border-[#2A2A2D] text-[#A1A1A6] hover:border-[#A1A1A6]/40 hover:text-[#F5F5F5]'
                      }`}
                    >
                      <div className="flex items-center justify-between w-full">
                        <Dumbbell className={`w-4 h-4 ${isSelected ? 'text-[#FF8A00]' : 'text-[#A1A1A6]'}`} />
                        {isSelected && (
                          <span className="w-2 h-2 rounded-full bg-[#FF8A00] animate-pulse" />
                        )}
                      </div>
                      <div>
                        <span className="font-headline font-bold text-xs uppercase tracking-tight block text-[#F5F5F5] truncate">
                          {preset.shortLabel}
                        </span>
                        <span className="text-[10px] text-[#A1A1A6] font-mono block truncate">
                          {preset.recommendedExercises.length} movements
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Custom Muscle Chips Selector */}
          {mode === 'custom' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-headline font-bold uppercase tracking-wider text-[#A1A1A6]">
                  Select Target Muscles
                </label>
                <span className="text-[10px] text-[#30D158] font-mono">
                  {customMuscles.length} selected
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {AVAILABLE_MUSCLE_CHIPS.map((chip) => {
                  const isSelected = customMuscles.includes(chip.id);
                  return (
                    <button
                      key={chip.id}
                      onClick={() => handleToggleMuscle(chip.id)}
                      className={`py-2 px-3.5 rounded-xl text-xs font-semibold uppercase tracking-wider transition-all flex items-center gap-1.5 active:scale-95 border ${
                        isSelected
                          ? 'bg-[#30D158] text-black border-[#30D158] font-bold shadow-md shadow-[#30D158]/20'
                          : 'bg-[#1E1E20] text-[#A1A1A6] border-[#2A2A2D] hover:text-[#F5F5F5] hover:border-[#A1A1A6]/30'
                      }`}
                    >
                      {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                      <span>{chip.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Workout Custom Name & Options */}
          <div className="space-y-3 pt-2 border-t border-[#2A2A2D]">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <label className="text-xs font-headline font-bold uppercase tracking-wider text-[#A1A1A6]">
                Workout Name
              </label>
              <div className="flex items-center gap-2">
                <label className="text-xs text-[#A1A1A6] cursor-pointer flex items-center gap-1.5 select-none">
                  <input
                    type="checkbox"
                    checked={isStartBlank}
                    onChange={(e) => setIsStartBlank(e.target.checked)}
                    className="w-4 h-4 rounded border-[#2A2A2D] bg-[#1E1E20] text-[#FF8A00] focus:ring-0 focus:ring-offset-0"
                  />
                  <span>Start as Blank Slate</span>
                </label>
              </div>
            </div>
            <input
              type="text"
              value={customTitle}
              placeholder={activeTemplate.name}
              onChange={(e) => setCustomTitle(e.target.value)}
              className="w-full bg-[#1E1E20] border border-[#2A2A2D] rounded-xl px-3.5 py-2.5 text-xs font-headline font-bold uppercase text-[#F5F5F5] focus:border-[#FF8A00] outline-none"
            />
          </div>

          {/* Exercises Preview */}
          {!isStartBlank && (
            <div className="space-y-2.5 pt-1">
              <div className="flex items-center justify-between">
                <label className="text-xs font-headline font-bold uppercase tracking-wider text-[#A1A1A6] flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-[#FF8A00]" />
                  <span>Loaded Movements ({stagedExercises.length})</span>
                </label>
                <span className="text-[10px] text-[#A1A1A6] font-mono">
                  3 working sets each
                </span>
              </div>

              {stagedExercises.length === 0 ? (
                <div className="p-4 rounded-xl bg-[#1E1E20]/50 border border-[#2A2A2D] text-center text-xs text-[#A1A1A6]">
                  No movements loaded. You can add movements live during workout tracking.
                </div>
              ) : (
                <div className="space-y-2">
                  {stagedExercises.map((ex, idx) => (
                    <div
                      key={ex.exerciseId + idx}
                      className="p-3 rounded-2xl bg-[#1E1E20] border border-[#2A2A2D] flex items-center justify-between gap-3 group"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="w-6 h-6 rounded-lg bg-black/40 text-[#FF8A00] text-[10px] font-mono font-bold flex items-center justify-center shrink-0">
                          {idx + 1}
                        </span>
                        <div className="min-w-0">
                          <h4 className="font-headline font-bold text-xs text-[#F5F5F5] truncate">
                            {ex.exerciseName}
                          </h4>
                          <span className="text-[10px] text-[#A1A1A6] font-mono block">
                            {ex.sets.length} sets · {ex.sets[0]?.targetReps || 10} reps @ {ex.sets[0]?.targetWeight || 0} lbs
                          </span>
                        </div>
                      </div>
                      <button
                        onClick={() => handleRemoveExercise(idx)}
                        className="p-1.5 rounded-lg text-[#A1A1A6] hover:text-[#FF453A] hover:bg-[#FF453A]/10 transition-colors"
                        title="Remove movement"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

        </div>

        {/* Footer Action Button */}
        <div className="p-4 sm:p-5 border-t border-[#2A2A2D] bg-[#080808]/90 shrink-0">
          <button
            onClick={handleStartWorkout}
            className="w-full min-h-[50px] py-3.5 px-6 rounded-2xl bg-[#FF8A00] hover:brightness-110 active:scale-[0.98] transition-all text-black font-headline font-black text-xs sm:text-sm uppercase tracking-widest flex items-center justify-center gap-2.5 shadow-lg shadow-[#FF8A00]/25"
          >
            <Play className="w-4 h-4 fill-black stroke-none" />
            <span>
              Start {customTitle.trim() || activeTemplate.name} {isStartBlank ? '(Blank)' : `(${stagedExercises.length} Ex)`}
            </span>
            <ChevronRight className="w-4 h-4 ml-1 stroke-[3]" />
          </button>
        </div>

      </div>
    </div>
  );
}
