// ─────────────────────────────────────────────────────────────
// MyFitAI — Log Past / Freestyle Workout Modal
// Allows users to retroactively log a workout session (sets, reps,
// weight, duration, date/time) directly into workout history and stats.
// ─────────────────────────────────────────────────────────────

import { useState, useMemo } from 'react';
import { useWorkoutBuilder } from '../../context/WorkoutBuilderContext';
import { useFitnessContext } from '../../context/FitnessContext';
import { EXERCISE_LIBRARY } from '../../data/exerciseLibrary';
import { db } from '../../utils/db';
import type { SessionExercise, LoggedSet, WorkoutSession, SetType } from '../../types/workout';
import { createDefaultLoggedSet } from '../../types/workout';
import type { Exercise as DBExercise, MuscleGroup } from '../../types/exercise';
import { 
  X, 
  Plus, 
  Trash2, 
  Dumbbell, 
  Calendar, 
  Clock, 
  Flame, 
  Search, 
  Check, 
  Sparkles 
} from 'lucide-react';

interface LogPastWorkoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

const PRESET_NAMES = ['Freestyle Workout', 'Push Day', 'Pull Day', 'Leg Day', 'Full Body', 'Arms & Core'];

export default function LogPastWorkoutModal({ isOpen, onClose, onSuccess }: LogPastWorkoutModalProps) {
  const { saveCompletedSession } = useWorkoutBuilder();
  const { logActivity, logStrength } = useFitnessContext();

  // Form states
  const [workoutName, setWorkoutName] = useState('Freestyle Workout');
  const [dateTime, setDateTime] = useState(() => {
    const now = new Date();
    // format as YYYY-MM-DDTHH:mm for datetime-local input
    const offset = now.getTimezoneOffset() * 60000;
    return new Date(now.getTime() - offset).toISOString().slice(0, 16);
  });
  const [duration, setDuration] = useState(45);
  const [calories, setCalories] = useState(380);
  const [notes, setNotes] = useState('');

  // Exercises in the workout
  const [exercises, setExercises] = useState<SessionExercise[]>([]);

  // Add Exercise Drawer
  const [showAddDrawer, setShowAddDrawer] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [customExercises, setCustomExercises] = useState<DBExercise[]>([]);

  // Load custom exercises on open
  const openAddDrawer = async () => {
    try {
      const allCustom = await db.exercises.getAll();
      setCustomExercises(allCustom);
    } catch {
      // Ignored
    }
    setShowAddDrawer(true);
  };

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

  const filteredLibrary = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return combinedLibrary.filter(e => {
      const matchesQuery = !q || e.name.toLowerCase().includes(q) || e.primaryMuscles.some(m => m.toLowerCase().includes(q));
      if (!matchesQuery) return false;
      if (selectedCategory === 'All') return true;
      const catLower = selectedCategory.toLowerCase();
      return e.primaryMuscles.some(m => m.toLowerCase().includes(catLower));
    });
  }, [combinedLibrary, searchQuery, selectedCategory]);

  const hasExactMatch = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return Boolean(q && combinedLibrary.some(e => e.name.toLowerCase() === q));
  }, [combinedLibrary, searchQuery]);

  const handleSelectExercise = (exerciseId: string, name: string, emoji: string) => {
    const libEntry = EXERCISE_LIBRARY.find(
      e => e.id === exerciseId || e.name.toLowerCase() === name.toLowerCase()
    ) || customExercises.find(c => c.id === exerciseId || c.name.toLowerCase() === name.toLowerCase());

    const newEx: SessionExercise = {
      exerciseId,
      exerciseName: name,
      thumbnailEmoji: emoji,
      primaryMuscles: (libEntry?.primaryMuscles as any) || ['full_body'],
      exerciseType: (libEntry as any)?.exerciseType || 'weight_reps',
      gifUrl: libEntry?.gifUrl,
      imageUrl: libEntry?.imageUrl,
      restSeconds: 90,
      sets: [
        { ...createDefaultLoggedSet('normal'), weight: 50, reps: 10, completed: true },
        { ...createDefaultLoggedSet('normal'), weight: 50, reps: 10, completed: true },
        { ...createDefaultLoggedSet('normal'), weight: 50, reps: 10, completed: true },
      ],
      notes: '',
    };

    setExercises(prev => [...prev, newEx]);
    setShowAddDrawer(false);
    setSearchQuery('');
  };

  const handleCreateCustomExercise = async () => {
    if (!searchQuery.trim()) return;
    const name = searchQuery.trim();
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
      instructions: ['Custom movement logged on past workout.'],
      tips: ['Proper form.'],
      thumbnailEmoji: '🏋️',
      isUnilateral: false,
      isCustom: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    try {
      await db.exercises.save(newCustomEx);
      setCustomExercises(prev => [newCustomEx, ...prev]);
    } catch {
      // Ignored
    }

    handleSelectExercise(id, name, '🏋️');
  };

  const handleAddSet = (exIdx: number) => {
    setExercises(prev => {
      const copy = [...prev];
      const ex = { ...copy[exIdx] };
      const lastSet = ex.sets[ex.sets.length - 1];
      const newSet: LoggedSet = {
        ...createDefaultLoggedSet('normal'),
        weight: lastSet ? lastSet.weight : 50,
        reps: lastSet ? lastSet.reps : 10,
        completed: true,
      };
      ex.sets = [...ex.sets, newSet];
      copy[exIdx] = ex;
      return copy;
    });
  };

  const handleRemoveSet = (exIdx: number, setIdx: number) => {
    setExercises(prev => {
      const copy = [...prev];
      const ex = { ...copy[exIdx] };
      if (ex.sets.length <= 1) return copy;
      ex.sets = ex.sets.filter((_, i) => i !== setIdx);
      copy[exIdx] = ex;
      return copy;
    });
  };

  const handleUpdateSet = (exIdx: number, setIdx: number, field: keyof LoggedSet, value: any) => {
    setExercises(prev => {
      const copy = [...prev];
      const ex = { ...copy[exIdx] };
      const sets = [...ex.sets];
      sets[setIdx] = { ...sets[setIdx], [field]: value };
      ex.sets = sets;
      copy[exIdx] = ex;
      return copy;
    });
  };

  const handleRemoveExercise = (exIdx: number) => {
    setExercises(prev => prev.filter((_, i) => i !== exIdx));
  };

  const handleDurationChange = (mins: number) => {
    setDuration(mins);
    setCalories(Math.round(mins * 8.5));
  };

  const handleSave = async () => {
    if (exercises.length === 0) {
      alert('Please add at least one exercise to your workout.');
      return;
    }

    const start = new Date(dateTime);
    const end = new Date(start.getTime() + duration * 60000);

    const completedSession: WorkoutSession = {
      id: crypto.randomUUID(),
      templateName: workoutName.trim() || 'Freestyle Workout',
      type: 'strength',
      startedAt: start.toISOString(),
      endedAt: end.toISOString(),
      duration: duration * 60,
      exercises,
      totalVolume: exercises.reduce((sum, ex) =>
        sum + ex.sets.filter(s => s.completed).reduce((v, s) => v + s.weight * s.reps, 0), 0
      ),
      totalSets: exercises.reduce((sum, ex) => sum + ex.sets.filter(s => s.completed).length, 0),
      totalReps: exercises.reduce((sum, ex) =>
        sum + ex.sets.filter(s => s.completed).reduce((r, s) => r + s.reps, 0), 0
      ),
      musclesWorked: [...new Set(exercises.flatMap(ex => ex.primaryMuscles || []))] as MuscleGroup[],
      prsHit: [],
      notes: notes.trim(),
    };

    try {
      await saveCompletedSession(completedSession);

      // Sync activity to fitness context
      logActivity({
        type: 'Workout',
        value: duration,
        caloriesBurned: calories,
      });

      // Sync sets to strength history
      exercises.forEach(ex => {
        ex.sets.forEach(st => {
          if (st.completed && st.weight > 0 && st.reps > 0) {
            logStrength(ex.exerciseName, st.weight, st.reps, st.rpe ? String(st.rpe) : undefined, st.setType);
          }
        });
      });

      onSuccess?.();
      onClose();
    } catch (e) {
      console.error('Failed to log past workout:', e);
      alert('Could not save workout. Please try again.');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />

      {/* Modal Dialog */}
      <div className="relative bg-[#121214] border border-[#2A2A2D] rounded-3xl w-full max-w-xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden z-10 animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-5 py-4 border-b border-[#2A2A2D] flex items-center justify-between bg-[#151517]">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[var(--color-primary)]/10 text-[var(--color-primary)] flex items-center justify-center">
              <Dumbbell className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-headline font-black text-base text-[#F5F5F5] uppercase tracking-tight">
                Log Past Workout
              </h2>
              <p className="text-[11px] text-[#A1A1A6] font-mono">
                Record completed freestyle session
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-[#1E1E20] hover:bg-[#2A2A2D] border border-[#2A2A2D] flex items-center justify-center text-[#A1A1A6] hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5 custom-scrollbar">
          {/* Workout Name */}
          <div>
            <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#A1A1A6] block mb-1.5">
              Workout Title
            </label>
            <input
              type="text"
              value={workoutName}
              onChange={(e) => setWorkoutName(e.target.value)}
              placeholder="e.g. Freestyle Leg Day"
              className="w-full bg-[#080808] border border-[#2A2A2D] focus:border-[var(--color-primary)] rounded-xl px-3.5 py-2.5 text-sm font-headline font-bold text-white outline-none"
            />
            {/* Quick preset chips */}
            <div className="flex gap-1.5 overflow-x-auto mt-2 pb-1 no-scrollbar">
              {PRESET_NAMES.map(name => (
                <button
                  key={name}
                  type="button"
                  onClick={() => setWorkoutName(name)}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-mono uppercase tracking-wider shrink-0 transition-colors ${
                    workoutName === name
                      ? 'bg-[var(--color-primary)] text-black font-bold'
                      : 'bg-[#1E1E20] text-[#A1A1A6] hover:text-white border border-[#2A2A2D]'
                  }`}
                >
                  {name}
                </button>
              ))}
            </div>
          </div>

          {/* Date, Time, Duration & Calories */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#A1A1A6] flex items-center gap-1 mb-1.5">
                <Calendar className="w-3 h-3 text-[var(--color-primary)]" />
                Date & Time
              </label>
              <input
                type="datetime-local"
                value={dateTime}
                onChange={(e) => setDateTime(e.target.value)}
                className="w-full bg-[#080808] border border-[#2A2A2D] focus:border-[var(--color-primary)] rounded-xl px-2.5 py-2 text-xs font-mono text-white outline-none"
              />
            </div>
            <div>
              <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#A1A1A6] flex items-center gap-1 mb-1.5">
                <Clock className="w-3 h-3 text-sky-400" />
                Duration (min)
              </label>
              <input
                type="number"
                min="5"
                max="300"
                value={duration}
                onChange={(e) => handleDurationChange(parseInt(e.target.value) || 30)}
                className="w-full bg-[#080808] border border-[#2A2A2D] focus:border-[var(--color-primary)] rounded-xl px-3 py-2 text-xs font-mono font-bold text-white outline-none"
              />
            </div>
            <div>
              <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#A1A1A6] flex items-center gap-1 mb-1.5">
                <Flame className="w-3 h-3 text-orange-400" />
                Calories (kcal)
              </label>
              <input
                type="number"
                min="0"
                max="3000"
                value={calories}
                onChange={(e) => setCalories(parseInt(e.target.value) || 0)}
                className="w-full bg-[#080808] border border-[#2A2A2D] focus:border-[var(--color-primary)] rounded-xl px-3 py-2 text-xs font-mono font-bold text-white outline-none"
              />
            </div>
          </div>

          {/* Exercises Section */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-[#A1A1A6] flex items-center gap-1.5">
                <Dumbbell className="w-3.5 h-3.5 text-[var(--color-primary)]" />
                Exercises ({exercises.length})
              </span>
              <button
                type="button"
                onClick={openAddDrawer}
                className="px-3 py-1.5 rounded-xl bg-[var(--color-primary)] text-black font-mono font-bold text-xs uppercase tracking-wider flex items-center gap-1 active:scale-95 transition-all shadow-sm"
              >
                <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>Add Exercise</span>
              </button>
            </div>

            {exercises.length === 0 ? (
              <div
                onClick={openAddDrawer}
                className="p-6 rounded-2xl border-2 border-dashed border-[#2A2A2D] hover:border-[var(--color-primary)]/50 text-center cursor-pointer transition-colors bg-[#151517]/40"
              >
                <Dumbbell className="w-8 h-8 text-[#A1A1A6]/40 mx-auto mb-2" />
                <p className="text-xs font-bold text-[#F5F5F5] uppercase tracking-wider">
                  No movements added yet
                </p>
                <p className="text-[10px] text-[#A1A1A6] font-mono mt-0.5">
                  Click here or &ldquo;Add Exercise&rdquo; above to log your movements and sets.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {exercises.map((ex, exIdx) => (
                  <div
                    key={ex.exerciseId + exIdx}
                    className="p-3.5 rounded-2xl bg-[#151517] border border-[#2A2A2D] space-y-2.5"
                  >
                    {/* Exercise title & remove */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-xs font-mono font-bold text-[var(--color-primary)]">
                          #{exIdx + 1}
                        </span>
                        <h4 className="font-headline font-bold text-sm text-white truncate">
                          {ex.exerciseName}
                        </h4>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveExercise(exIdx)}
                        className="w-7 h-7 rounded-lg text-rose-400 hover:bg-rose-500/10 flex items-center justify-center"
                        title="Remove exercise"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Sets table */}
                    <div className="space-y-1.5">
                      <div className="grid grid-cols-12 gap-2 text-[9px] font-mono uppercase tracking-wider text-[#A1A1A6] px-1">
                        <span className="col-span-2">SET</span>
                        <span className="col-span-3">TYPE</span>
                        <span className="col-span-3">WEIGHT (LBS)</span>
                        <span className="col-span-3">REPS</span>
                        <span className="col-span-1"></span>
                      </div>

                      {ex.sets.map((set, setIdx) => (
                        <div
                          key={setIdx}
                          className="grid grid-cols-12 gap-2 items-center bg-[#080808] p-1.5 rounded-xl border border-[#2A2A2D]"
                        >
                          <span className="col-span-2 text-xs font-mono font-bold text-center text-[#A1A1A6]">
                            {setIdx + 1}
                          </span>
                          <select
                            value={set.setType}
                            onChange={(e) => handleUpdateSet(exIdx, setIdx, 'setType', e.target.value as SetType)}
                            className="col-span-3 bg-[#151517] text-white text-[11px] font-mono rounded-lg p-1 outline-none border border-[#2A2A2D]"
                          >
                            <option value="normal">Normal</option>
                            <option value="warmup">Warm-up</option>
                            <option value="drop">Drop</option>
                            <option value="failure">Failure</option>
                          </select>
                          <input
                            type="number"
                            min="0"
                            step="2.5"
                            value={set.weight}
                            onChange={(e) => handleUpdateSet(exIdx, setIdx, 'weight', parseFloat(e.target.value) || 0)}
                            className="col-span-3 bg-[#151517] text-white text-xs font-mono font-bold rounded-lg p-1 text-center outline-none border border-[#2A2A2D]"
                          />
                          <input
                            type="number"
                            min="1"
                            value={set.reps}
                            onChange={(e) => handleUpdateSet(exIdx, setIdx, 'reps', parseInt(e.target.value) || 0)}
                            className="col-span-3 bg-[#151517] text-white text-xs font-mono font-bold rounded-lg p-1 text-center outline-none border border-[#2A2A2D]"
                          />
                          <button
                            type="button"
                            onClick={() => handleRemoveSet(exIdx, setIdx)}
                            disabled={ex.sets.length <= 1}
                            className="col-span-1 text-[#A1A1A6] hover:text-rose-400 disabled:opacity-20 flex justify-center"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>

                    {/* Add set button */}
                    <button
                      type="button"
                      onClick={() => handleAddSet(exIdx)}
                      className="w-full py-1.5 rounded-lg border border-dashed border-[#2A2A2D] hover:border-[var(--color-primary)]/40 text-[10px] font-mono uppercase tracking-wider text-[#A1A1A6] hover:text-white flex items-center justify-center gap-1 transition-colors"
                    >
                      <Plus className="w-3 h-3" /> Add Set
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Notes */}
          <div>
            <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#A1A1A6] block mb-1.5">
              Workout Notes (Optional)
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Felt great, pushed hard on final sets..."
              className="w-full bg-[#080808] border border-[#2A2A2D] focus:border-[var(--color-primary)] rounded-xl p-3 text-xs font-mono text-white outline-none resize-none"
            />
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-[#2A2A2D] bg-[#151517] flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl border border-[#2A2A2D] text-[#A1A1A6] hover:text-white font-mono font-bold text-xs uppercase tracking-wider active:scale-95 transition-all"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={exercises.length === 0}
            className="px-5 py-2.5 rounded-xl bg-[var(--color-primary)] hover:brightness-110 disabled:opacity-50 text-black font-mono font-black text-xs uppercase tracking-wider flex items-center gap-1.5 shadow-lg shadow-[var(--color-primary)]/20 active:scale-95 transition-all"
          >
            <Check className="w-4 h-4 stroke-[3]" />
            <span>Save Workout</span>
          </button>
        </div>
      </div>

      {/* Nested Add Exercise Drawer */}
      {showAddDrawer && (
        <div className="fixed inset-0 z-[130] flex items-end sm:items-center justify-center">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setShowAddDrawer(false)} />
          <div className="relative bg-[#151517] rounded-t-3xl sm:rounded-2xl p-5 w-full max-w-lg max-h-[85vh] flex flex-col border border-[#2A2A2D] shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-headline font-black text-base text-[#F5F5F5] uppercase tracking-tight">Select Movement</h3>
                <p className="text-xs text-[#A1A1A6] font-mono">Choose from library or add custom</p>
              </div>
              <button
                type="button"
                onClick={() => setShowAddDrawer(false)}
                className="w-8 h-8 rounded-lg bg-[#1E1E20] hover:bg-[#2A2A2D] border border-[#2A2A2D] flex items-center justify-center text-[#A1A1A6]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Search */}
            <div className="relative mb-3">
              <Search className="w-4 h-4 text-[#A1A1A6] absolute left-3 top-3.5" />
              <input
                type="text"
                autoFocus
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search exercise..."
                className="w-full bg-[#080808] rounded-xl py-3 pl-10 pr-4 text-xs font-mono font-bold outline-none border border-[#2A2A2D] focus:border-[var(--color-primary)] text-white"
              />
            </div>

            {/* Category Filter Chips */}
            <div className="flex gap-1.5 overflow-x-auto pb-2 mb-2 no-scrollbar">
              {['All', 'Chest', 'Back', 'Legs', 'Shoulders', 'Arms', 'Core'].map(cat => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1 rounded-lg text-[10px] font-mono font-bold uppercase tracking-wider shrink-0 transition-all ${
                    selectedCategory === cat
                      ? 'bg-[var(--color-primary)] text-black shadow-sm'
                      : 'bg-[#1E1E20] text-[#A1A1A6] hover:text-[#F5F5F5] border border-[#2A2A2D]'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Quick Add Custom Button */}
            {searchQuery.trim().length > 1 && !hasExactMatch && (
              <button
                type="button"
                onClick={handleCreateCustomExercise}
                className="w-full flex items-center justify-between px-3.5 py-2.5 mb-2.5 rounded-xl bg-[var(--color-primary)]/10 hover:bg-[var(--color-primary)]/20 border border-[var(--color-primary)]/30 text-left transition-all active:scale-[0.99] group shrink-0"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-7 h-7 rounded-lg bg-[var(--color-primary)]/20 flex items-center justify-center text-[var(--color-primary)] shrink-0">
                    <Sparkles className="w-3.5 h-3.5" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-headline font-bold text-xs text-[#F5F5F5] uppercase tracking-tight truncate">
                      Add &ldquo;{searchQuery.trim()}&rdquo;
                    </p>
                    <p className="text-[10px] text-[#A1A1A6] font-mono">
                      Save as new custom exercise
                    </p>
                  </div>
                </div>
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[var(--color-primary)] flex items-center gap-1 shrink-0 bg-[var(--color-primary)]/10 px-2 py-1 rounded-md">
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
                  {searchQuery.trim() && (
                    <button
                      type="button"
                      onClick={handleCreateCustomExercise}
                      className="px-4 py-2 rounded-xl bg-[var(--color-primary)] text-black font-mono font-black text-xs uppercase tracking-wider active:scale-95 transition-all shadow-md"
                    >
                      Add &ldquo;{searchQuery.trim()}&rdquo; to Workout
                    </button>
                  )}
                </div>
              ) : (
                filteredLibrary.map((ex, i) => (
                  <button
                    key={(ex.id || ex.name) + i}
                    type="button"
                    onClick={() => handleSelectExercise(ex.id || ex.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'), ex.name, ex.emoji)}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl bg-[#1E1E20]/60 hover:bg-[#1E1E20] border border-[#2A2A2D] text-left active:scale-[0.99] transition-all group"
                  >
                    <div className="w-10 h-10 rounded-lg bg-black/60 overflow-hidden flex-shrink-0 border border-[#2A2A2D] flex items-center justify-center">
                      {ex.imageUrl || ex.gifUrl ? (
                        <img src={ex.imageUrl || ex.gifUrl} alt={ex.name} className="w-full h-full object-cover" loading="lazy" />
                      ) : (
                        <Dumbbell className="w-5 h-5 text-[var(--color-primary)]" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="font-bold text-xs text-[#F5F5F5] uppercase tracking-tight truncate group-hover:text-[var(--color-primary)] transition-colors">{ex.name}</p>
                        {ex.isCustom && (
                          <span className="text-[8px] font-mono uppercase tracking-wider px-1 py-0.2 rounded bg-primary/20 text-primary border border-primary/30">Custom</span>
                        )}
                      </div>
                      <p className="text-[10px] text-[#A1A1A6] font-mono uppercase tracking-wider truncate">
                        {ex.primaryMuscles.join(' · ')}
                      </p>
                    </div>
                    <Plus className="w-4 h-4 text-[#A1A1A6] group-hover:text-[var(--color-primary)]" />
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
