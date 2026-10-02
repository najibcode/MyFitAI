// ─────────────────────────────────────────────────────────────
// MyFitAI — Workout Builder Component
// Create & edit workout templates. Slide-up exercise picker,
// drag-to-reorder, save as template, start workout CTA.
// ─────────────────────────────────────────────────────────────

import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWorkoutBuilder } from '../context/WorkoutBuilderContext';
import { usePreferences } from '../context/PreferencesContext';
import type { WorkoutTemplate, WorkoutExercise, WorkoutType } from '../types/workout';
import type { MuscleGroup, ExerciseType } from '../types/exercise';
import { MUSCLE_GROUP_LABELS } from '../types/exercise';
import { EXERCISE_LIBRARY } from '../data/exerciseLibrary';

interface WorkoutBuilderProps {
  existingTemplate?: WorkoutTemplate;
  onClose: () => void;
}

const WORKOUT_TYPES: { id: WorkoutType; label: string; icon: string }[] = [
  { id: 'strength', label: 'Strength', icon: 'fitness_center' },
  { id: 'cardio',   label: 'Cardio',   icon: 'directions_run' },
  { id: 'hiit',     label: 'HIIT',     icon: 'bolt' },
  { id: 'mobility', label: 'Mobility', icon: 'self_improvement' },
  { id: 'custom',   label: 'Custom',   icon: 'tune' },
];

const MUSCLE_CHIPS: MuscleGroup[] = ['chest', 'back', 'shoulders', 'biceps', 'triceps', 'core', 'quads', 'hamstrings', 'glutes', 'calves'];

// Exercise library is now imported from src/data/exerciseLibrary.ts
// Each exercise has a verified YouTube video ID for tutorials.

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
      description, type, targetMuscles, exercises,
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
    <div className="fixed inset-0 z-[60] bg-background overflow-y-auto">
      <div className="max-w-md mx-auto px-5 pt-6 pb-32">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <button onClick={onClose} className="w-10 h-10 rounded-full bg-[var(--color-surface-container)] flex items-center justify-center text-on-surface active:scale-90 transition-transform">
            <span className="material-symbols-outlined">close</span>
          </button>
          <h2 className="font-headline font-extrabold text-base uppercase tracking-wider">
            {existingTemplate ? 'Edit Workout' : 'New Workout'}
          </h2>
          <button onClick={handleSave} className="text-primary text-sm font-bold uppercase tracking-wider active:scale-95">Save</button>
        </div>

        {/* Name input */}
        <input
          type="text" value={name} onChange={(e) => setName(e.target.value)}
          placeholder="Workout Name"
          className="w-full bg-transparent text-2xl font-headline font-black text-on-surface placeholder:text-on-surface-variant/30 outline-none mb-2 tracking-tight"
        />
        <input
          type="text" value={description} onChange={(e) => setDescription(e.target.value)}
          placeholder="Add a description..."
          className="w-full bg-transparent text-sm text-on-surface-variant placeholder:text-on-surface-variant/30 outline-none mb-6"
        />

        {/* Type chips */}
        <div className="mb-4">
          <p className="text-[10px] uppercase tracking-[0.2em] font-bold text-on-surface-variant mb-2">Type</p>
          <div className="flex gap-2 flex-wrap">
            {WORKOUT_TYPES.map(t => (
              <button key={t.id} onClick={() => setType(t.id)}
                className={`px-3 py-1.5 rounded-xl text-[11px] font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all active:scale-95 ${
                  type === t.id ? 'bg-primary/15 text-primary border border-primary/30' : 'bg-[var(--color-surface-container)] text-on-surface-variant border border-white/[0.04]'
                }`}>
                <span className="material-symbols-outlined text-[14px]">{t.icon}</span>{t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Muscle group chips */}
        <div className="mb-6">
          <p className="text-[10px] uppercase tracking-[0.2em] font-bold text-on-surface-variant mb-2">Target Muscles</p>
          <div className="flex gap-1.5 flex-wrap">
            {MUSCLE_CHIPS.map(m => (
              <button key={m} onClick={() => toggleMuscle(m)}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all active:scale-95 ${
                  targetMuscles.includes(m) ? 'bg-primary/15 text-primary border border-primary/30' : 'bg-white/[0.03] text-on-surface-variant border border-white/[0.04]'
                }`}>
                {MUSCLE_GROUP_LABELS[m]}
              </button>
            ))}
          </div>
        </div>

        {/* Exercise List */}
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-[11px] uppercase tracking-[0.2em] font-bold text-on-surface-variant">
            Exercises ({exercises.length})
          </h3>
        </div>

        <div className="space-y-3 mb-4">
          {exercises.map((ex, idx) => (
            <div key={ex.exerciseId} draggable onDragStart={() => handleDragStart(idx)}
              onDragOver={(e) => handleDragOver(e, idx)} onDragEnd={handleDragEnd}
              className="bg-[var(--color-surface-container)] rounded-2xl border border-white/[0.04] p-4 cursor-grab active:cursor-grabbing group hover:border-white/[0.08] transition-all">
              <div className="flex items-center gap-3 mb-3">
                <span className="material-symbols-outlined text-on-surface-variant/30 text-[16px] cursor-grab">drag_indicator</span>
                <div className="w-1 h-8 bg-primary rounded-full flex-shrink-0" />
                {ex.imageUrl || ex.gifUrl ? (
                  <div className="w-9 h-9 rounded-lg overflow-hidden bg-black/40 border border-white/10 flex-shrink-0 flex items-center justify-center">
                    <img src={ex.imageUrl || ex.gifUrl} alt="" className="w-full h-full object-cover" />
                  </div>
                ) : (
                  <span className="text-xl">{ex.thumbnailEmoji}</span>
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-sm text-on-surface truncate">{ex.exerciseName}</p>
                  <p className="text-[10px] text-on-surface-variant uppercase tracking-wider">
                    {ex.sets.length} sets · {ex.restSeconds}s rest
                  </p>
                </div>
                <button onClick={() => removeExercise(idx)} className="w-8 h-8 rounded-full flex items-center justify-center text-error/60 hover:text-error hover:bg-error/10 transition-all active:scale-90">
                  <span className="material-symbols-outlined text-[16px]">close</span>
                </button>
              </div>
              <div className="flex gap-3 pl-10">
                <div>
                  <label className="text-[9px] uppercase tracking-widest text-on-surface-variant font-semibold block mb-1">Sets</label>
                  <div className="flex items-center gap-1">
                    <button onClick={() => updateSets(idx, Math.max(1, ex.sets.length - 1))}
                      className="w-7 h-7 rounded-lg bg-white/[0.03] flex items-center justify-center text-on-surface-variant active:scale-90">
                      <span className="material-symbols-outlined text-[14px]">remove</span>
                    </button>
                    <span className="w-8 text-center font-bold text-sm tabular-nums">{ex.sets.length}</span>
                    <button onClick={() => updateSets(idx, ex.sets.length + 1)}
                      className="w-7 h-7 rounded-lg bg-white/[0.03] flex items-center justify-center text-on-surface-variant active:scale-90">
                      <span className="material-symbols-outlined text-[14px]">add</span>
                    </button>
                  </div>
                </div>
                <div>
                  <label className="text-[9px] uppercase tracking-widest text-on-surface-variant font-semibold block mb-1">Rest (s)</label>
                  <select value={ex.restSeconds} onChange={(e) => updateRest(idx, parseInt(e.target.value))}
                    className="bg-white/[0.03] border border-white/[0.06] rounded-lg px-2 py-1.5 text-xs font-bold text-on-surface outline-none">
                    {[30, 45, 60, 90, 120, 180, 240, 300].map(v => (<option key={v} value={v}>{v}s</option>))}
                  </select>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Add exercise button */}
        <button onClick={() => setShowPicker(true)}
          className="w-full py-4 rounded-2xl border-2 border-dashed border-white/[0.08] text-on-surface-variant text-[11px] font-bold uppercase tracking-widest hover:border-primary/30 hover:text-primary transition-all active:scale-[0.98] flex items-center justify-center gap-2 mb-8">
          <span className="material-symbols-outlined text-[18px]">add</span>Add Exercise
        </button>

        {/* Start Workout CTA */}
        {exercises.length > 0 && (
          <button onClick={handleStartWorkout}
            className="w-full bg-primary text-on-primary py-4 rounded-2xl font-bold text-sm uppercase tracking-widest active:scale-95 transition-transform shadow-lg flex items-center justify-center gap-2">
            <span className="material-symbols-outlined text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>play_arrow</span>
            Start Workout
          </button>
        )}
      </div>

      {/* Exercise Picker Bottom Sheet */}
      {showPicker && (
        <div className="fixed inset-0 z-[70] flex flex-col justify-end">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowPicker(false)} />
          <div className="relative bg-[var(--color-surface)] w-full max-w-md mx-auto h-[75vh] rounded-t-[2rem] border-t border-white/[0.06] flex flex-col p-5 animate-slide-up">
            <div className="w-12 h-1.5 bg-white/20 rounded-full mx-auto mb-4" />
            <h3 className="font-headline font-extrabold text-lg mb-3">Add Exercise</h3>
            <div className="relative mb-4">
              <span className="material-symbols-outlined absolute left-3 top-3 text-on-surface-variant text-[18px]">search</span>
              <input type="text" autoFocus value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search exercises..."
                className="w-full bg-[var(--color-surface-container)] rounded-xl py-3 pl-10 pr-4 text-sm outline-none border border-white/[0.04] focus:border-primary/30" />
            </div>
            <div className="flex-1 overflow-y-auto space-y-1.5 pr-1">
              {filteredExercises.map((ex, i) => (
                <div key={i} className="flex items-center gap-2 p-1.5 rounded-xl hover:bg-[var(--color-surface-container)] transition-colors">
                  <button
                    onClick={() => addExercise(ex.name, ex.emoji, ex.primaryMuscles, ex.gifUrl, ex.imageUrl, ex.exerciseType)}
                    className="flex-1 flex items-center gap-3 text-left active:scale-[0.98]"
                  >
                    <div className="w-10 h-10 rounded-lg bg-black/40 overflow-hidden flex-shrink-0 border border-white/10 flex items-center justify-center">
                      {ex.imageUrl || ex.gifUrl ? (
                        <img src={ex.imageUrl || ex.gifUrl} alt={ex.name} className="w-full h-full object-cover" loading="lazy" />
                      ) : (
                        <span className="text-xl">{ex.emoji}</span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-sm text-on-surface truncate">{ex.name}</p>
                      <p className="text-[10px] text-on-surface-variant uppercase tracking-wider truncate">
                        {ex.primaryMuscles.map(m => MUSCLE_GROUP_LABELS[m] || m).join(' · ')}
                      </p>
                    </div>
                    <span className="material-symbols-outlined text-primary text-[20px]">add_circle</span>
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
