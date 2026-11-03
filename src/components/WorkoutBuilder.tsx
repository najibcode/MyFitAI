// ─────────────────────────────────────────────────────────────
// MyFitAI — Workout Builder Component (Slide-up drawer)
// Create & edit workout templates with touch-friendly controls,
// drag-to-reorder, exercise library picker, and direct start CTA.
// ─────────────────────────────────────────────────────────────

import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWorkoutBuilder } from '../context/WorkoutBuilderContext';
import { usePreferences } from '../context/PreferencesContext';
import type { WorkoutTemplate, WorkoutExercise, WorkoutType } from '../types/workout';
import type { MuscleGroup, ExerciseType } from '../types/exercise';
import { MUSCLE_GROUP_LABELS } from '../types/exercise';
import { EXERCISE_LIBRARY } from '../data/exerciseLibrary';
import {
  X,
  Dumbbell,
  Flame,
  Activity,
  Sparkles,
  Plus,
  Play,
  GripVertical,
  Minus,
  Search,
  PlusCircle,
  Layers,
} from 'lucide-react';

interface WorkoutBuilderProps {
  existingTemplate?: WorkoutTemplate;
  onClose: () => void;
}

const WORKOUT_TYPES: { id: WorkoutType; label: string; icon: React.ReactNode }[] = [
  { id: 'strength', label: 'Strength', icon: <Dumbbell className="w-3.5 h-3.5" /> },
  { id: 'cardio',   label: 'Cardio',   icon: <Activity className="w-3.5 h-3.5" /> },
  { id: 'hiit',     label: 'HIIT',     icon: <Flame className="w-3.5 h-3.5" /> },
  { id: 'mobility', label: 'Mobility', icon: <Sparkles className="w-3.5 h-3.5" /> },
  { id: 'custom',   label: 'Custom',   icon: <Layers className="w-3.5 h-3.5" /> },
];

const MUSCLE_CHIPS: MuscleGroup[] = [
  'chest', 'back', 'shoulders', 'biceps', 'triceps', 'core', 'quads', 'hamstrings', 'glutes', 'calves'
];

export default function WorkoutBuilder({ existingTemplate, onClose }: WorkoutBuilderProps) {
  const navigate = useNavigate();
  const { saveTemplate, startSession } = useWorkoutBuilder();
  const { defaultRestTimer } = usePreferences();

  const [name, setName] = useState(existingTemplate?.name || '');
  const [description, setDescription] = useState(existingTemplate?.description || '');
  const [type, setType] = useState<WorkoutType>(existingTemplate?.type || 'strength');
  const [targetMuscles, setTargetMuscles] = useState<MuscleGroup[]>(existingTemplate?.targetMuscles || []);
  const [exercises, setExercises] = useState<WorkoutExercise[]>(existingTemplate?.exercises || []);
  const [showPicker, setShowPicker] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const dragRef = useRef<{ idx: number } | null>(null);

  const toggleMuscle = (m: MuscleGroup) => {
    setTargetMuscles(prev => prev.includes(m) ? prev.filter(x => x !== m) : [...prev, m]);
  };

  const addExercise = (
    name: string,
    emoji: string,
    muscles: MuscleGroup[],
    gifUrl?: string,
    imageUrl?: string,
    exerciseType: ExerciseType = 'weight_reps'
  ) => {
    const ex: WorkoutExercise = {
      exerciseId: crypto.randomUUID(),
      exerciseName: name,
      thumbnailEmoji: emoji,
      primaryMuscles: muscles,
      exerciseType,
      gifUrl,
      imageUrl,
      sets: [
        { targetReps: 10, targetWeight: 0, setType: 'normal' },
        { targetReps: 10, targetWeight: 0, setType: 'normal' },
        { targetReps: 10, targetWeight: 0, setType: 'normal' },
      ],
      restSeconds: defaultRestTimer,
      notes: '',
    };
    setExercises(prev => [...prev, ex]);
    setShowPicker(false);
    setSearchQuery('');
  };

  const removeExercise = (idx: number) => {
    setExercises(prev => prev.filter((_, i) => i !== idx));
  };

  const updateSets = (idx: number, count: number) => {
    setExercises(prev => {
      const next = [...prev];
      const ex = { ...next[idx] };
      if (count > ex.sets.length) {
        ex.sets = [...ex.sets, ...Array.from({ length: count - ex.sets.length }, () => ({ targetReps: 10, targetWeight: 0, setType: 'normal' as const }))];
      } else {
        ex.sets = ex.sets.slice(0, count);
      }
      next[idx] = ex;
      return next;
    });
  };

  const updateRest = (idx: number, seconds: number) => {
    setExercises(prev => {
      const next = [...prev];
      next[idx] = { ...next[idx], restSeconds: seconds };
      return next;
    });
  };

  // Drag & drop
  const handleDragStart = (idx: number) => { dragRef.current = { idx }; };
  const handleDragOver = (e: React.DragEvent, idx: number) => {
    e.preventDefault();
    if (!dragRef.current || dragRef.current.idx === idx) return;
    const next = [...exercises];
    const [item] = next.splice(dragRef.current.idx, 1);
    next.splice(idx, 0, item);
    setExercises(next);
    dragRef.current.idx = idx;
  };
  const handleDragEnd = () => { dragRef.current = null; };

  const handleSave = async () => {
    const now = new Date().toISOString();
    const template: WorkoutTemplate = {
      id: existingTemplate?.id || crypto.randomUUID(),
      name: name || 'Untitled Workout',
      description,
      type,
      targetMuscles,
      exercises,
      createdAt: existingTemplate?.createdAt || now,
      updatedAt: now,
      estimatedDuration: exercises.length * 8,
      estimatedCalories: exercises.length * 60,
    };
    await saveTemplate(template);
    onClose();
  };

  const handleStartWorkout = async () => {
    const now = new Date().toISOString();
    const template: WorkoutTemplate = {
      id: existingTemplate?.id || crypto.randomUUID(),
      name: name || 'Quick Workout',
      description,
      type,
      targetMuscles,
      exercises,
      createdAt: existingTemplate?.createdAt || now,
      updatedAt: now,
    };
    await saveTemplate(template);
    startSession(template);
    navigate('/workout/active');
  };

  const filteredExercises = EXERCISE_LIBRARY.filter(ex =>
    ex.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    ex.primaryMuscles.some(m => m.includes(searchQuery.toLowerCase())) ||
    ex.equipment.includes(searchQuery.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-[60] bg-[#080808] overflow-y-auto">
      <div className="max-w-md mx-auto px-4 pt-4 pb-32">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-xl bg-[var(--color-surface-container)] border border-[var(--color-border)] flex items-center justify-center text-[var(--color-on-surface)] active:scale-90 transition-transform"
          >
            <X className="w-5 h-5" />
          </button>
          <h2 className="font-headline font-black text-sm uppercase tracking-wider text-[var(--color-on-surface)]">
            {existingTemplate ? 'Edit Workout' : 'New Workout'}
          </h2>
          <button
            onClick={handleSave}
            className="text-[var(--color-primary)] text-xs font-bold uppercase tracking-wider active:scale-95 px-3 py-1.5 rounded-lg bg-[var(--color-primary)]/10 border border-[var(--color-primary)]/20"
          >
            Save
          </button>
        </div>

        {/* Name input */}
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Workout Name"
          className="w-full bg-transparent text-2xl font-headline font-black text-[var(--color-on-surface)] placeholder:text-[var(--color-muted)]/40 outline-none mb-1 tracking-tight"
        />
        <input
          type="text"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Add a description or training notes..."
          className="w-full bg-transparent text-xs text-[var(--color-muted)] placeholder:text-[var(--color-muted)]/40 outline-none mb-4"
        />

        {/* Type chips */}
        <div className="mb-4">
          <p className="text-[10px] uppercase tracking-[0.2em] font-bold text-[var(--color-muted)] mb-2">Category</p>
          <div className="flex gap-2 flex-wrap">
            {WORKOUT_TYPES.map(t => (
              <button
                key={t.id}
                onClick={() => setType(t.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all active:scale-95 ${
                  type === t.id
                    ? 'bg-[var(--color-primary)] text-black shadow-md'
                    : 'bg-[var(--color-surface-container)] text-[var(--color-on-surface-variant)] border border-[var(--color-border)]'
                }`}
              >
                {t.icon}
                <span>{t.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Muscle group chips */}
        <div className="mb-6">
          <p className="text-[10px] uppercase tracking-[0.2em] font-bold text-[var(--color-muted)] mb-2">Target Muscles</p>
          <div className="flex gap-1.5 flex-wrap">
            {MUSCLE_CHIPS.map(m => (
              <button
                key={m}
                onClick={() => toggleMuscle(m)}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all active:scale-95 ${
                  targetMuscles.includes(m)
                    ? 'bg-[var(--color-primary)]/15 text-[var(--color-primary)] border border-[var(--color-primary)]/30'
                    : 'bg-[var(--color-surface-container)] text-[var(--color-muted)] border border-[var(--color-border)]'
                }`}
              >
                {MUSCLE_GROUP_LABELS[m]}
              </button>
            ))}
          </div>
        </div>

        {/* Exercise List */}
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-[10px] uppercase tracking-[0.2em] font-bold text-[var(--color-muted)]">
            Exercises ({exercises.length})
          </h3>
        </div>

        <div className="space-y-2.5 mb-4">
          {exercises.map((ex, idx) => (
            <div
              key={ex.exerciseId}
              draggable
              onDragStart={() => handleDragStart(idx)}
              onDragOver={(e) => handleDragOver(e, idx)}
              onDragEnd={handleDragEnd}
              className="bg-[var(--color-surface-container)] rounded-2xl border border-[var(--color-border)] p-3.5 cursor-grab active:cursor-grabbing group hover:border-white/10 transition-all"
            >
              <div className="flex items-center gap-2.5 mb-2.5">
                <GripVertical className="w-4 h-4 text-[var(--color-muted)] flex-shrink-0 cursor-grab" />
                <div className="w-1 h-7 bg-[var(--color-primary)] rounded-full flex-shrink-0" />
                <div className="w-8 h-8 rounded-lg bg-black/40 border border-white/5 flex items-center justify-center flex-shrink-0">
                  <Dumbbell className="w-4 h-4 text-[var(--color-primary)]" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-sm text-[var(--color-on-surface)] truncate">{ex.exerciseName}</p>
                  <p className="text-[10px] font-mono text-[var(--color-muted)] uppercase tracking-wider">
                    {ex.sets.length} sets · {ex.restSeconds}s rest
                  </p>
                </div>
                <button
                  onClick={() => removeExercise(idx)}
                  className="w-7 h-7 rounded-lg flex items-center justify-center text-red-400 hover:bg-red-500/10 transition-all active:scale-90"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="flex gap-3 pl-8">
                <div>
                  <label className="text-[9px] uppercase tracking-widest text-[var(--color-muted)] font-semibold block mb-1">
                    Sets
                  </label>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => updateSets(idx, Math.max(1, ex.sets.length - 1))}
                      className="w-7 h-7 rounded-lg bg-black/40 border border-white/5 flex items-center justify-center text-white active:scale-90"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <span className="w-8 text-center font-mono font-bold text-xs tabular-nums text-white">
                      {ex.sets.length}
                    </span>
                    <button
                      onClick={() => updateSets(idx, ex.sets.length + 1)}
                      className="w-7 h-7 rounded-lg bg-black/40 border border-white/5 flex items-center justify-center text-white active:scale-90"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div>
                  <label className="text-[9px] uppercase tracking-widest text-[var(--color-muted)] font-semibold block mb-1">
                    Rest
                  </label>
                  <select
                    value={ex.restSeconds}
                    onChange={(e) => updateRest(idx, parseInt(e.target.value))}
                    className="bg-black/40 border border-white/5 rounded-lg px-2 py-1.5 text-xs font-mono font-bold text-white outline-none"
                  >
                    {[0, 30, 45, 60, 90, 120, 180, 240, 300].map(v => (
                      <option key={v} value={v} className="bg-[#151517] text-white">
                        {v === 0 ? 'None' : `${v}s`}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Add exercise button */}
        <button
          onClick={() => setShowPicker(true)}
          className="w-full py-3.5 rounded-2xl border-2 border-dashed border-[var(--color-border)] hover:border-[var(--color-primary)] text-[var(--color-muted)] hover:text-white text-xs font-bold uppercase tracking-wider transition-all active:scale-[0.98] flex items-center justify-center gap-2 mb-6"
        >
          <Plus className="w-4 h-4 text-[var(--color-primary)]" />
          Add Exercise
        </button>

        {/* Start Workout CTA */}
        {exercises.length > 0 && (
          <button
            onClick={handleStartWorkout}
            className="w-full bg-[var(--color-primary)] text-black py-4 rounded-2xl font-extrabold text-sm uppercase tracking-wider active:scale-98 transition-all shadow-lg shadow-[var(--color-primary)]/20 flex items-center justify-center gap-2"
          >
            <Play className="w-4 h-4 fill-black" />
            Start Workout
          </button>
        )}
      </div>

      {/* Exercise Picker Bottom Sheet */}
      {showPicker && (
        <div className="fixed inset-0 z-[70] flex flex-col justify-end">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setShowPicker(false)} />
          <div className="relative bg-[var(--color-surface)] w-full max-w-md mx-auto h-[80vh] rounded-t-3xl border-t border-white/10 flex flex-col p-4 animate-in slide-in-from-bottom duration-300">
            <div className="w-10 h-1 bg-white/20 rounded-full mx-auto mb-3" />
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-headline font-black text-base text-[var(--color-on-surface)]">
                Select Exercise
              </h3>
              <button onClick={() => setShowPicker(false)} className="text-[var(--color-muted)] hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="relative mb-3">
              <Search className="absolute left-3 top-3 text-[var(--color-muted)] w-4 h-4" />
              <input
                type="text"
                autoFocus
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by movement, muscle, equipment..."
                className="w-full bg-[var(--color-surface-container)] rounded-xl py-2.5 pl-9 pr-4 text-xs text-white placeholder:text-[var(--color-muted)] outline-none border border-[var(--color-border)] focus:border-[var(--color-primary)]"
              />
            </div>
            <div className="flex-1 overflow-y-auto space-y-1.5 pr-1">
              {filteredExercises.map((ex, i) => (
                <div
                  key={i}
                  className="flex items-center gap-2 p-2 rounded-xl hover:bg-[var(--color-surface-container)] border border-transparent hover:border-white/5 transition-all"
                >
                  <button
                    onClick={() => addExercise(ex.name, ex.emoji, ex.primaryMuscles, ex.gifUrl, ex.imageUrl, ex.exerciseType)}
                    className="flex-1 flex items-center gap-3 text-left active:scale-[0.98]"
                  >
                    <div className="w-9 h-9 rounded-lg bg-black/40 overflow-hidden flex-shrink-0 border border-white/5 flex items-center justify-center">
                      <Dumbbell className="w-4 h-4 text-[var(--color-primary)]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-xs text-[var(--color-on-surface)] truncate">{ex.name}</p>
                      <p className="text-[10px] text-[var(--color-muted)] uppercase tracking-wider truncate">
                        {ex.primaryMuscles.map(m => MUSCLE_GROUP_LABELS[m] || m).join(' · ')} · {ex.equipment}
                      </p>
                    </div>
                    <PlusCircle className="w-5 h-5 text-[var(--color-primary)] flex-shrink-0" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
