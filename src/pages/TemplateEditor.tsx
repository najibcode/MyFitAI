// ─────────────────────────────────────────────────────────────
// MyFitAI — Workout Template Editor (Create / Edit)
// Build workout templates with exercises, sets, rest times,
// superset grouping, progression rules, and notes.
// ─────────────────────────────────────────────────────────────

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useWorkoutBuilder } from '../context/WorkoutBuilderContext';
import ExerciseLibrary from './ExerciseLibrary';
import type { WorkoutTemplate, WorkoutExercise, PlannedSet, WorkoutType } from '../types/workout';
import { DEFAULT_PROGRESSION } from '../types/workout';
import type { ExerciseLibraryEntry } from '../data/exerciseLibrary';
import type { MuscleGroup } from '../types/exercise';
import MuscleHeatmap from '../components/MuscleHeatmap';
import ConfirmModal from '../components/ConfirmModal';

export default function TemplateEditor() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { templates, saveTemplate, deleteTemplate } = useWorkoutBuilder();

  const isEditing = !!id;
  const existing = isEditing ? templates.find(t => t.id === id) : null;

  const [name, setName] = useState(existing?.name || '');
  const [description, setDescription] = useState(existing?.description || '');
  const [type, setType] = useState<WorkoutType>(existing?.type || 'strength');
  const [exercises, setExercises] = useState<WorkoutExercise[]>(existing?.exercises || []);
  const [showExercisePicker, setShowExercisePicker] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [saving, setSaving] = useState(false);

  // Refresh if the template changes externally
  useEffect(() => {
    if (existing) {
      setName(existing.name);
      setDescription(existing.description);
      setType(existing.type);
      setExercises(existing.exercises);
    }
  }, [existing]);

  // Compute target muscles from exercises
  const targetMuscles = useMemo<MuscleGroup[]>(() => {
    const muscles = new Set<MuscleGroup>();
    exercises.forEach(ex => {
      ex.primaryMuscles?.forEach(m => muscles.add(m));
    });
    return [...muscles];
  }, [exercises]);

  // Estimated duration
  const estimatedDuration = useMemo(() => {
    let totalSets = 0;
    let totalRest = 0;
    exercises.forEach(ex => {
      totalSets += ex.sets.length;
      totalRest += ex.sets.length * ex.restSeconds;
    });
    const setTime = totalSets * 45; // avg 45s per set
    return Math.round((setTime + totalRest) / 60);
  }, [exercises]);

  // ─── Exercise Picker Callback ─────────────────────────────

  const handlePickExercise = useCallback((entry: ExerciseLibraryEntry) => {
    const newExercise: WorkoutExercise = {
      exerciseId: `builtin_${entry.name.toLowerCase().replace(/\s+/g, '_')}`,
      exerciseName: entry.name,
      exerciseType: entry.exerciseType,
      thumbnailEmoji: entry.emoji,
      equipment: entry.equipment,
      primaryMuscles: entry.primaryMuscles,
      isUnilateral: entry.isUnilateral,
      sets: [
        { targetReps: 10, setType: 'normal' },
        { targetReps: 10, setType: 'normal' },
        { targetReps: 10, setType: 'normal' },
      ],
      restSeconds: 90,
      notes: '',
      progressionRule: DEFAULT_PROGRESSION,
    };
    setExercises(prev => [...prev, newExercise]);
    setShowExercisePicker(false);
  }, []);

  // ─── Exercise Manipulation ────────────────────────────────

  const removeExercise = useCallback((idx: number) => {
    setExercises(prev => prev.filter((_, i) => i !== idx));
  }, []);

  const moveExercise = useCallback((from: number, direction: 'up' | 'down') => {
    setExercises(prev => {
      const newArr = [...prev];
      const to = direction === 'up' ? from - 1 : from + 1;
      if (to < 0 || to >= newArr.length) return prev;
      [newArr[from], newArr[to]] = [newArr[to], newArr[from]];
      return newArr;
    });
  }, []);

  const updateExerciseRest = useCallback((exIdx: number, rest: number) => {
    setExercises(prev => {
      const newArr = [...prev];
      newArr[exIdx] = { ...newArr[exIdx], restSeconds: rest };
      return newArr;
    });
  }, []);

  const addSet = useCallback((exIdx: number) => {
    setExercises(prev => {
      const newArr = [...prev];
      const ex = newArr[exIdx];
      const lastSet = ex.sets[ex.sets.length - 1] || { targetReps: 10, setType: 'normal' as const };
      newArr[exIdx] = { ...ex, sets: [...ex.sets, { ...lastSet }] };
      return newArr;
    });
  }, []);

  const removeSet = useCallback((exIdx: number, setIdx: number) => {
    setExercises(prev => {
      const newArr = [...prev];
      newArr[exIdx] = { ...newArr[exIdx], sets: newArr[exIdx].sets.filter((_, i) => i !== setIdx) };
      return newArr;
    });
  }, []);

  const updateSet = useCallback((exIdx: number, setIdx: number, updates: Partial<PlannedSet>) => {
    setExercises(prev => {
      const newArr = [...prev];
      const sets = [...newArr[exIdx].sets];
      sets[setIdx] = { ...sets[setIdx], ...updates };
      newArr[exIdx] = { ...newArr[exIdx], sets };
      return newArr;
    });
  }, []);

  const updateSupersetGroup = useCallback((exIdx: number, group: string) => {
    setExercises(prev => {
      const newArr = [...prev];
      newArr[exIdx] = { ...newArr[exIdx], supersetGroup: group || undefined };
      return newArr;
    });
  }, []);

  // ─── Save ─────────────────────────────────────────────────

  const handleSave = async () => {
    if (!name.trim() || exercises.length === 0) return;
    setSaving(true);

    const template: WorkoutTemplate = {
      id: existing?.id || crypto.randomUUID(),
      name: name.trim(),
      description: description.trim(),
      type,
      targetMuscles,
      exercises,
      createdAt: existing?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      estimatedDuration,
    };

    await saveTemplate(template);
    setSaving(false);
    navigate('/workout');
  };

  const handleDelete = async () => {
    if (id) {
      await deleteTemplate(id);
      navigate('/workout');
    }
  };

  // ─── Exercise Picker Modal ────────────────────────────────

  if (showExercisePicker) {
    return (
      <div className="fixed inset-0 z-[90] bg-background overflow-y-auto">
        <ExerciseLibrary
          isPickerMode
          onPick={handlePickExercise}
          onClose={() => setShowExercisePicker(false)}
        />
      </div>
    );
  }

  return (
    <main className="max-w-md mx-auto px-5 pt-6 pb-32">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="w-9 h-9 rounded-xl bg-[var(--color-surface-container)] flex items-center justify-center text-on-surface active:scale-90 transition-transform">
            <span className="material-symbols-outlined text-[18px]">arrow_back</span>
          </button>
          <h1 className="font-headline font-extrabold text-xl tracking-tight">
            {isEditing ? 'Edit Template' : 'New Template'}
          </h1>
        </div>
        {isEditing && (
          <button onClick={() => setShowDeleteConfirm(true)} className="text-error active:scale-90 transition-transform">
            <span className="material-symbols-outlined text-[20px]">delete</span>
          </button>
        )}
      </div>

      <div className="space-y-5">
        {/* Name */}
        <div>
          <label className="text-[10px] uppercase tracking-[0.2em] font-bold text-on-surface-variant block mb-2">Workout Name *</label>
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="e.g. Push Day, Upper Body A"
            className="w-full bg-[var(--color-surface-container)] border border-white/[0.04] rounded-xl px-4 py-3 text-sm text-on-surface placeholder:text-on-surface-variant/40 outline-none focus:border-primary/40"
          />
        </div>

        {/* Description */}
        <div>
          <label className="text-[10px] uppercase tracking-[0.2em] font-bold text-on-surface-variant block mb-2">Description</label>
          <input
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="Focus on chest and triceps..."
            className="w-full bg-[var(--color-surface-container)] border border-white/[0.04] rounded-xl px-4 py-3 text-sm text-on-surface placeholder:text-on-surface-variant/40 outline-none focus:border-primary/40"
          />
        </div>

        {/* Workout Type */}
        <div>
          <label className="text-[10px] uppercase tracking-[0.2em] font-bold text-on-surface-variant block mb-2">Type</label>
          <div className="flex flex-wrap gap-1.5">
            {(['strength', 'cardio', 'hiit', 'mobility', 'custom'] as WorkoutType[]).map(t => (
              <button
                key={t}
                onClick={() => setType(t)}
                className={`px-3 py-1.5 rounded-lg text-[11px] font-bold uppercase tracking-wider transition-all active:scale-95 ${
                  type === t ? 'bg-primary text-on-primary' : 'bg-white/[0.04] text-on-surface'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        {/* Stats row */}
        <div className="flex gap-3">
          <div className="flex-1 bg-[var(--color-surface-container)] rounded-xl px-4 py-3 border border-white/[0.04] text-center">
            <p className="font-headline font-black text-xl tabular-nums">{exercises.length}</p>
            <p className="text-[9px] text-on-surface-variant uppercase tracking-widest">Exercises</p>
          </div>
          <div className="flex-1 bg-[var(--color-surface-container)] rounded-xl px-4 py-3 border border-white/[0.04] text-center">
            <p className="font-headline font-black text-xl tabular-nums">{exercises.reduce((s, e) => s + e.sets.length, 0)}</p>
            <p className="text-[9px] text-on-surface-variant uppercase tracking-widest">Total Sets</p>
          </div>
          <div className="flex-1 bg-[var(--color-surface-container)] rounded-xl px-4 py-3 border border-white/[0.04] text-center">
            <p className="font-headline font-black text-xl tabular-nums">~{estimatedDuration}</p>
            <p className="text-[9px] text-on-surface-variant uppercase tracking-widest">Min</p>
          </div>
        </div>

        {/* Muscle Heatmap */}
        {targetMuscles.length > 0 && (
          <div className="bg-[var(--color-surface-container)] rounded-2xl p-4 border border-white/[0.04]">
            <p className="text-[9px] uppercase tracking-[0.2em] font-bold text-on-surface-variant mb-3 text-center">Target Muscles</p>
            <MuscleHeatmap muscles={targetMuscles} size={120} />
          </div>
        )}

        {/* Exercise List */}
        <div>
          <p className="text-[10px] uppercase tracking-[0.2em] font-bold text-on-surface-variant mb-3">Exercises</p>
          <div className="space-y-3">
            {exercises.map((ex, exIdx) => (
              <TemplateExerciseCard
                key={`${ex.exerciseId}-${exIdx}`}
                exercise={ex}
                index={exIdx}
                total={exercises.length}
                onMove={moveExercise}
                onRemove={removeExercise}
                onAddSet={addSet}
                onRemoveSet={removeSet}
                onUpdateSet={updateSet}
                onUpdateRest={updateExerciseRest}
                onUpdateSuperset={updateSupersetGroup}
              />
            ))}
          </div>

          {/* Add Exercise Button */}
          <button
            onClick={() => setShowExercisePicker(true)}
            className="w-full mt-3 py-4 rounded-2xl border-2 border-dashed border-white/[0.08] text-on-surface-variant hover:text-primary hover:border-primary/30 transition-all active:scale-[0.98] flex items-center justify-center gap-2 text-sm font-bold"
          >
            <span className="material-symbols-outlined text-[20px]">add</span>
            Add Exercise
          </button>
        </div>

        {/* Save Button */}
        <button
          onClick={handleSave}
          disabled={!name.trim() || exercises.length === 0 || saving}
          className="w-full py-4 rounded-2xl bg-primary text-on-primary font-bold text-sm uppercase tracking-widest active:scale-95 transition-transform disabled:opacity-40 disabled:active:scale-100"
        >
          {saving ? 'Saving...' : isEditing ? 'Update Template' : 'Save Template'}
        </button>
      </div>

      <ConfirmModal
        isOpen={showDeleteConfirm}
        onConfirm={handleDelete}
        onCancel={() => setShowDeleteConfirm(false)}
        title="Delete Template?"
        message="This template will be permanently removed."
        confirmLabel="Delete"
        variant="danger"
      />
    </main>
  );
}

// ─── Template Exercise Card ────────────────────────────────

interface TemplateExerciseCardProps {
  exercise: WorkoutExercise;
  index: number;
  total: number;
  onMove: (idx: number, dir: 'up' | 'down') => void;
  onRemove: (idx: number) => void;
  onAddSet: (idx: number) => void;
  onRemoveSet: (exIdx: number, setIdx: number) => void;
  onUpdateSet: (exIdx: number, setIdx: number, updates: Partial<PlannedSet>) => void;
  onUpdateRest: (exIdx: number, rest: number) => void;
  onUpdateSuperset: (exIdx: number, group: string) => void;
}

function TemplateExerciseCard({
  exercise, index, total,
  onMove, onRemove, onAddSet, onRemoveSet, onUpdateSet, onUpdateRest, onUpdateSuperset,
}: TemplateExerciseCardProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="bg-[var(--color-surface-container)] rounded-2xl border border-white/[0.04] overflow-hidden">
      {/* Header */}
      <div
        className="px-4 py-3 flex items-center justify-between cursor-pointer active:bg-white/[0.02]"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-3 min-w-0">
          <span className="text-xl flex-shrink-0">{exercise.thumbnailEmoji || '🏋️'}</span>
          <div className="min-w-0">
            <p className="font-headline font-bold text-sm truncate">{exercise.exerciseName}</p>
            <p className="text-[10px] text-on-surface-variant">
              {exercise.sets.length} sets · {exercise.restSeconds}s rest
              {exercise.supersetGroup && ` · Superset ${exercise.supersetGroup}`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          <button onClick={(e) => { e.stopPropagation(); onMove(index, 'up'); }}
            disabled={index === 0}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-on-surface-variant disabled:opacity-20 active:scale-90">
            <span className="material-symbols-outlined text-[16px]">keyboard_arrow_up</span>
          </button>
          <button onClick={(e) => { e.stopPropagation(); onMove(index, 'down'); }}
            disabled={index === total - 1}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-on-surface-variant disabled:opacity-20 active:scale-90">
            <span className="material-symbols-outlined text-[16px]">keyboard_arrow_down</span>
          </button>
          <button onClick={(e) => { e.stopPropagation(); onRemove(index); }}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-error/60 active:scale-90">
            <span className="material-symbols-outlined text-[16px]">close</span>
          </button>
          <span className="material-symbols-outlined text-[16px] text-on-surface-variant/30">
            {expanded ? 'expand_less' : 'expand_more'}
          </span>
        </div>
      </div>

      {/* Expanded content */}
      {expanded && (
        <div className="px-4 pb-4 space-y-3 border-t border-white/[0.04] pt-3 animate-in fade-in duration-200">
          {/* Sets */}
          <div>
            <div className="grid grid-cols-[32px_1fr_1fr_40px] gap-2 mb-2">
              <span className="text-[9px] text-on-surface-variant uppercase tracking-widest font-bold">Set</span>
              <span className="text-[9px] text-on-surface-variant uppercase tracking-widest font-bold">Reps</span>
              <span className="text-[9px] text-on-surface-variant uppercase tracking-widest font-bold">Type</span>
              <span className="text-[9px] text-on-surface-variant uppercase tracking-widest font-bold text-center">✕</span>
            </div>
            {exercise.sets.map((set, setIdx) => (
              <div key={setIdx} className="grid grid-cols-[32px_1fr_1fr_40px] gap-2 items-center mb-1.5">
                <span className="text-xs font-bold text-on-surface-variant text-center">{setIdx + 1}</span>
                <input
                  type="number"
                  inputMode="numeric"
                  value={set.targetReps || ''}
                  onChange={e => onUpdateSet(index, setIdx, { targetReps: parseInt(e.target.value) || 0 })}
                  className="bg-white/[0.03] border border-white/[0.06] rounded-lg px-3 py-2 text-sm text-center font-bold text-on-surface outline-none focus:border-primary/40"
                />
                <select
                  value={set.setType}
                  onChange={e => onUpdateSet(index, setIdx, { setType: e.target.value as PlannedSet['setType'] })}
                  className="bg-white/[0.03] border border-white/[0.06] rounded-lg px-2 py-2 text-xs font-bold text-on-surface outline-none appearance-none text-center"
                >
                  <option value="normal">Normal</option>
                  <option value="warmup">Warm-up</option>
                  <option value="drop">Drop</option>
                  <option value="amrap">AMRAP</option>
                  <option value="failure">Failure</option>
                </select>
                <button
                  onClick={() => onRemoveSet(index, setIdx)}
                  disabled={exercise.sets.length <= 1}
                  className="w-8 h-8 flex items-center justify-center text-on-surface-variant/40 hover:text-error active:scale-90 disabled:opacity-20 mx-auto"
                >
                  <span className="material-symbols-outlined text-[14px]">remove</span>
                </button>
              </div>
            ))}
            <button
              onClick={() => onAddSet(index)}
              className="w-full py-1.5 rounded-lg border border-dashed border-white/[0.06] text-[10px] font-bold text-on-surface-variant hover:text-primary transition-all active:scale-95 mt-1"
            >
              + Add Set
            </button>
          </div>

          {/* Rest Time */}
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase tracking-widest font-bold text-on-surface-variant">Rest (seconds)</span>
            <div className="flex items-center gap-2">
              {[30, 60, 90, 120, 180].map(t => (
                <button
                  key={t}
                  onClick={() => onUpdateRest(index, t)}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all active:scale-95 ${
                    exercise.restSeconds === t ? 'bg-primary text-on-primary' : 'bg-white/[0.04] text-on-surface-variant'
                  }`}
                >
                  {t}s
                </button>
              ))}
            </div>
          </div>

          {/* Superset */}
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase tracking-widest font-bold text-on-surface-variant">Superset Group</span>
            <div className="flex items-center gap-1.5">
              {['', 'A', 'B', 'C'].map(g => (
                <button
                  key={g}
                  onClick={() => onUpdateSuperset(index, g)}
                  className={`w-8 h-8 rounded-lg text-[11px] font-bold transition-all active:scale-95 ${
                    (exercise.supersetGroup || '') === g ? 'bg-primary text-on-primary' : 'bg-white/[0.04] text-on-surface-variant'
                  }`}
                >
                  {g || '—'}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
