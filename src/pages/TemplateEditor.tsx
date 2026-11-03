// ─────────────────────────────────────────────────────────────
// MyFitAI — Workout Template Editor (Create / Edit)
// Professional workout programming system with exercises, sets,
// rest times, dropsets, superset groups, progression rules,
// warmups, cooldowns, and exercise duplication.
// ─────────────────────────────────────────────────────────────

import { useState, useMemo, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useWorkoutBuilder } from '../context/WorkoutBuilderContext';
import ExerciseLibrary from './ExerciseLibrary';
import type { WorkoutTemplate, WorkoutExercise, PlannedSet, WorkoutType, SetType } from '../types/workout';
import { DEFAULT_PROGRESSION } from '../types/workout';
import type { ExerciseLibraryEntry } from '../data/exerciseLibrary';
import type { MuscleGroup } from '../types/exercise';
import MuscleHeatmap from '../components/MuscleHeatmap';
import ConfirmModal from '../components/ConfirmModal';
import {
  ArrowLeft,
  Trash2,
  Plus,
  ChevronUp,
  ChevronDown,
  X,
  Copy,
  Dumbbell,
  Clock,
  Layers,
  Flame,
} from 'lucide-react';

const SET_TYPES_LIST: { id: SetType; label: string }[] = [
  { id: 'normal', label: 'Normal (Working)' },
  { id: 'warmup', label: 'Warm-up' },
  { id: 'drop', label: 'Dropset' },
  { id: 'amrap', label: 'AMRAP' },
  { id: 'failure', label: 'Failure' },
  { id: 'rest_pause', label: 'Rest-Pause' },
  { id: 'myo_reps', label: 'Myo-Reps' },
  { id: 'top_set', label: 'Top Set' },
  { id: 'back_off', label: 'Back-off' },
  { id: 'timed', label: 'Timed Hold' },
  { id: 'bodyweight', label: 'Bodyweight' },
  { id: 'cardio', label: 'Cardio' },
];

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
  const [warmupNotes, setWarmupNotes] = useState(existing?.warmupNotes || '');
  const [cooldownNotes, setCooldownNotes] = useState(existing?.cooldownNotes || '');
  const [showExercisePicker, setShowExercisePicker] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [saving, setSaving] = useState(false);

  const [prevId, setPrevId] = useState(existing?.id);
  if (existing && existing.id !== prevId) {
    setPrevId(existing.id);
    setName(existing.name);
    setDescription(existing.description);
    setType(existing.type);
    setExercises(existing.exercises);
    setWarmupNotes(existing.warmupNotes || '');
    setCooldownNotes(existing.cooldownNotes || '');
  }

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
      totalRest += ex.sets.length * (ex.restSeconds || 90);
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
        { targetReps: 10, targetWeight: 0, setType: 'normal' },
        { targetReps: 10, targetWeight: 0, setType: 'normal' },
        { targetReps: 10, targetWeight: 0, setType: 'normal' },
      ],
      restSeconds: 90,
      notes: '',
      progressionRule: DEFAULT_PROGRESSION,
      gifUrl: entry.gifUrl,
      imageUrl: entry.imageUrl,
    };
    setExercises(prev => [...prev, newExercise]);
    setShowExercisePicker(false);
  }, []);

  // ─── Exercise Manipulation ────────────────────────────────

  const removeExercise = useCallback((idx: number) => {
    setExercises(prev => prev.filter((_, i) => i !== idx));
  }, []);

  const duplicateExercise = useCallback((idx: number) => {
    setExercises(prev => {
      const copy = {
        ...prev[idx],
        exerciseId: crypto.randomUUID(),
        sets: prev[idx].sets.map(s => ({ ...s })),
      };
      const newArr = [...prev];
      newArr.splice(idx + 1, 0, copy);
      return newArr;
    });
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

  const updateExerciseNotes = useCallback((exIdx: number, notes: string) => {
    setExercises(prev => {
      const newArr = [...prev];
      newArr[exIdx] = { ...newArr[exIdx], notes };
      return newArr;
    });
  }, []);

  const addSet = useCallback((exIdx: number) => {
    setExercises(prev => {
      const newArr = [...prev];
      const ex = newArr[exIdx];
      const lastSet = ex.sets[ex.sets.length - 1] || { targetReps: 10, targetWeight: 0, setType: 'normal' as const };
      newArr[exIdx] = { ...ex, sets: [...ex.sets, { ...lastSet }] };
      return newArr;
    });
  }, []);

  const duplicateSet = useCallback((exIdx: number, setIdx: number) => {
    setExercises(prev => {
      const newArr = [...prev];
      const ex = newArr[exIdx];
      const setToCopy = ex.sets[setIdx] || { targetReps: 10, targetWeight: 0, setType: 'normal' as const };
      const newSets = [...ex.sets];
      newSets.splice(setIdx + 1, 0, { ...setToCopy });
      newArr[exIdx] = { ...ex, sets: newSets };
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
      warmupNotes: warmupNotes.trim() || undefined,
      cooldownNotes: cooldownNotes.trim() || undefined,
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
      <div className="fixed inset-0 z-[90] bg-[#080808] overflow-y-auto">
        <ExerciseLibrary
          isPickerMode
          onPick={handlePickExercise}
          onClose={() => setShowExercisePicker(false)}
        />
      </div>
    );
  }

  return (
    <main className="max-w-md mx-auto px-4 pt-4 pb-32 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="w-10 h-10 rounded-xl bg-[var(--color-surface-container)] border border-[var(--color-border)] flex items-center justify-center text-[var(--color-on-surface)] active:scale-90 transition-transform"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="font-headline font-black text-xl tracking-tight text-[var(--color-on-surface)]">
              {isEditing ? 'Edit Routine' : 'New Routine'}
            </h1>
            <p className="text-[10px] font-mono text-[var(--color-muted)] uppercase tracking-wider">
              Workout Programming Blueprint
            </p>
          </div>
        </div>
        {isEditing && (
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="w-10 h-10 rounded-xl bg-red-500/10 text-red-400 border border-red-500/20 flex items-center justify-center active:scale-90 transition-transform"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>

      <div className="space-y-4">
        {/* Name */}
        <div>
          <label className="text-[10px] uppercase tracking-[0.2em] font-bold text-[var(--color-muted)] block mb-1.5">
            Routine Name *
          </label>
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="e.g. Push Hypertrophy, Upper Body A"
            className="w-full bg-[var(--color-surface-container)] border border-[var(--color-border)] rounded-xl px-4 py-3 text-sm text-[var(--color-on-surface)] placeholder:text-[var(--color-muted)]/50 outline-none focus:border-[var(--color-primary)] transition-colors"
          />
        </div>

        {/* Description */}
        <div>
          <label className="text-[10px] uppercase tracking-[0.2em] font-bold text-[var(--color-muted)] block mb-1.5">
            Training Focus / Goal
          </label>
          <input
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="Focus on chest clavicular head and triceps overload..."
            className="w-full bg-[var(--color-surface-container)] border border-[var(--color-border)] rounded-xl px-4 py-3 text-sm text-[var(--color-on-surface)] placeholder:text-[var(--color-muted)]/50 outline-none focus:border-[var(--color-primary)] transition-colors"
          />
        </div>

        {/* Workout Type */}
        <div>
          <label className="text-[10px] uppercase tracking-[0.2em] font-bold text-[var(--color-muted)] block mb-1.5">
            Category
          </label>
          <div className="flex flex-wrap gap-2">
            {(['strength', 'cardio', 'hiit', 'mobility', 'custom'] as WorkoutType[]).map(t => (
              <button
                key={t}
                onClick={() => setType(t)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all active:scale-95 ${
                  type === t
                    ? 'bg-[var(--color-primary)] text-black shadow-md'
                    : 'bg-[var(--color-surface-container)] border border-[var(--color-border)] text-[var(--color-on-surface-variant)]'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        {/* Warmup & Cooldown Section */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="p-3 rounded-2xl bg-[var(--color-surface-container)] border border-[var(--color-border)]">
            <div className="flex items-center gap-1.5 text-xs font-bold text-amber-400 mb-1.5">
              <Flame className="w-3.5 h-3.5" />
              <span>Dedicated Warmup</span>
            </div>
            <textarea
              rows={2}
              value={warmupNotes}
              onChange={e => setWarmupNotes(e.target.value)}
              placeholder="e.g. 5 min treadmill, 2x15 band pull-aparts..."
              className="w-full bg-black/40 border border-white/5 rounded-lg p-2 text-xs text-white placeholder:text-white/30 outline-none focus:border-amber-400/50 resize-none"
            />
          </div>
          <div className="p-3 rounded-2xl bg-[var(--color-surface-container)] border border-[var(--color-border)]">
            <div className="flex items-center gap-1.5 text-xs font-bold text-cyan-400 mb-1.5">
              <Clock className="w-3.5 h-3.5" />
              <span>Cooldown & Mobility</span>
            </div>
            <textarea
              rows={2}
              value={cooldownNotes}
              onChange={e => setCooldownNotes(e.target.value)}
              placeholder="e.g. Hamstring static stretch, foam roll spine..."
              className="w-full bg-black/40 border border-white/5 rounded-lg p-2 text-xs text-white placeholder:text-white/30 outline-none focus:border-cyan-400/50 resize-none"
            />
          </div>
        </div>

        {/* Stats Summary Row */}
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-[var(--color-surface-container)] rounded-2xl p-3 border border-[var(--color-border)] text-center">
            <p className="font-headline font-black text-xl tabular-nums text-[var(--color-on-surface)]">{exercises.length}</p>
            <p className="text-[9px] text-[var(--color-muted)] uppercase tracking-wider font-mono font-bold">Movements</p>
          </div>
          <div className="bg-[var(--color-surface-container)] rounded-2xl p-3 border border-[var(--color-border)] text-center">
            <p className="font-headline font-black text-xl tabular-nums text-[var(--color-on-surface)]">
              {exercises.reduce((s, e) => s + e.sets.length, 0)}
            </p>
            <p className="text-[9px] text-[var(--color-muted)] uppercase tracking-wider font-mono font-bold">Total Sets</p>
          </div>
          <div className="bg-[var(--color-surface-container)] rounded-2xl p-3 border border-[var(--color-border)] text-center">
            <p className="font-headline font-black text-xl tabular-nums text-[var(--color-on-surface)]">~{estimatedDuration}</p>
            <p className="text-[9px] text-[var(--color-muted)] uppercase tracking-wider font-mono font-bold">Minutes</p>
          </div>
        </div>

        {/* Muscle Heatmap */}
        {targetMuscles.length > 0 && (
          <div className="bg-[var(--color-surface-container)] rounded-2xl p-4 border border-[var(--color-border)]">
            <p className="text-[10px] uppercase tracking-[0.2em] font-bold text-[var(--color-muted)] mb-3 text-center">
              Target Muscle Activation
            </p>
            <MuscleHeatmap muscles={targetMuscles} size={130} />
          </div>
        )}

        {/* Exercise List */}
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <p className="text-[10px] uppercase tracking-[0.2em] font-bold text-[var(--color-muted)]">
              Exercise Programming ({exercises.length})
            </p>
          </div>

          <div className="space-y-3">
            {exercises.map((ex, exIdx) => (
              <TemplateExerciseCard
                key={`${ex.exerciseId}-${exIdx}`}
                exercise={ex}
                index={exIdx}
                total={exercises.length}
                onMove={moveExercise}
                onDuplicate={duplicateExercise}
                onRemove={removeExercise}
                onAddSet={addSet}
                onDuplicateSet={duplicateSet}
                onRemoveSet={removeSet}
                onUpdateSet={updateSet}
                onUpdateRest={updateExerciseRest}
                onUpdateNotes={updateExerciseNotes}
                onUpdateSuperset={updateSupersetGroup}
              />
            ))}
          </div>

          {/* Add Exercise CTA */}
          <button
            onClick={() => setShowExercisePicker(true)}
            className="w-full py-4 rounded-2xl border-2 border-dashed border-[var(--color-border)] hover:border-[var(--color-primary)] text-[var(--color-on-surface-variant)] hover:text-white transition-all active:scale-[0.98] flex items-center justify-center gap-2 text-sm font-bold mt-2"
          >
            <Plus className="w-5 h-5 text-[var(--color-primary)]" />
            Add Exercise
          </button>
        </div>

        {/* Save Blueprint Button */}
        <button
          onClick={handleSave}
          disabled={!name.trim() || exercises.length === 0 || saving}
          className="w-full py-4 rounded-2xl bg-[var(--color-primary)] text-black font-extrabold text-sm uppercase tracking-wider active:scale-98 transition-all disabled:opacity-40 shadow-lg shadow-[var(--color-primary)]/20"
        >
          {saving ? 'Saving Program...' : isEditing ? 'Update Routine' : 'Save Routine'}
        </button>
      </div>

      <ConfirmModal
        isOpen={showDeleteConfirm}
        onConfirm={handleDelete}
        onCancel={() => setShowDeleteConfirm(false)}
        title="Delete Routine Blueprint?"
        message="This routine will be permanently removed. Past completed workout sessions will remain safe in your history."
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
  onDuplicate: (idx: number) => void;
  onRemove: (idx: number) => void;
  onAddSet: (idx: number) => void;
  onDuplicateSet: (exIdx: number, setIdx: number) => void;
  onRemoveSet: (exIdx: number, setIdx: number) => void;
  onUpdateSet: (exIdx: number, setIdx: number, updates: Partial<PlannedSet>) => void;
  onUpdateRest: (exIdx: number, rest: number) => void;
  onUpdateNotes: (exIdx: number, notes: string) => void;
  onUpdateSuperset: (exIdx: number, group: string) => void;
}

function TemplateExerciseCard({
  exercise,
  index,
  total,
  onMove,
  onDuplicate,
  onRemove,
  onAddSet,
  onDuplicateSet,
  onRemoveSet,
  onUpdateSet,
  onUpdateRest,
  onUpdateNotes,
  onUpdateSuperset,
}: TemplateExerciseCardProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className={`bg-[var(--color-surface-container)] rounded-2xl border ${exercise.supersetGroup ? 'border-purple-500/40' : 'border-[var(--color-border)]'} overflow-hidden transition-all`}>
      {/* Exercise Card Header */}
      <div
        className="px-4 py-3 flex items-center justify-between cursor-pointer active:bg-white/[0.02]"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-black/40 border border-white/5 flex items-center justify-center flex-shrink-0">
            <Dumbbell className="w-4 h-4 text-[var(--color-primary)]" />
          </div>
          <div className="min-w-0">
            <p className="font-headline font-bold text-sm text-[var(--color-on-surface)] truncate">
              {exercise.exerciseName}
            </p>
            <p className="text-[10px] font-mono text-[var(--color-muted)] truncate">
              {exercise.sets.length} sets · {exercise.restSeconds || 90}s rest
              {exercise.supersetGroup && ` · Superset ${exercise.supersetGroup}`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1 flex-shrink-0" onClick={e => e.stopPropagation()}>
          <button
            onClick={() => onMove(index, 'up')}
            disabled={index === 0}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-[var(--color-muted)] hover:text-white disabled:opacity-20 active:scale-90"
            title="Move Up"
          >
            <ChevronUp className="w-4 h-4" />
          </button>
          <button
            onClick={() => onMove(index, 'down')}
            disabled={index === total - 1}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-[var(--color-muted)] hover:text-white disabled:opacity-20 active:scale-90"
            title="Move Down"
          >
            <ChevronDown className="w-4 h-4" />
          </button>
          <button
            onClick={() => onDuplicate(index)}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-[var(--color-muted)] hover:text-[var(--color-primary)] active:scale-90"
            title="Duplicate Exercise"
          >
            <Copy className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => onRemove(index)}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-red-400/80 hover:text-red-400 active:scale-90"
            title="Remove Exercise"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Expanded Program Configuration */}
      {expanded && (
        <div className="px-4 pb-4 space-y-4 border-t border-[var(--color-border)] pt-3 animate-in fade-in duration-200">
          {/* Sets Configuration Grid */}
          <div>
            <div className="grid grid-cols-[30px_1fr_1fr_1fr_60px] gap-1.5 mb-2 text-center">
              <span className="text-[9px] font-mono text-[var(--color-muted)] uppercase tracking-wider font-bold">Set</span>
              <span className="text-[9px] font-mono text-[var(--color-muted)] uppercase tracking-wider font-bold">Reps</span>
              <span className="text-[9px] font-mono text-[var(--color-muted)] uppercase tracking-wider font-bold">Load</span>
              <span className="text-[9px] font-mono text-[var(--color-muted)] uppercase tracking-wider font-bold">Type</span>
              <span className="text-[9px] font-mono text-[var(--color-muted)] uppercase tracking-wider font-bold">Actions</span>
            </div>

            <div className="space-y-1.5">
              {exercise.sets.map((set, setIdx) => (
                <div key={setIdx} className={`grid grid-cols-[30px_1fr_1fr_1fr_60px] gap-1.5 items-center ${set.setType === 'drop' ? 'pl-2 border-l-2 border-amber-400' : ''}`}>
                  <span className="text-xs font-mono font-bold text-[var(--color-muted)] text-center">
                    {setIdx + 1}
                  </span>

                  {/* Target Reps / Target Duration */}
                  <input
                    type="number"
                    inputMode="numeric"
                    placeholder={set.setType === 'timed' ? 'sec' : 'reps'}
                    value={set.setType === 'timed' ? (set.targetDuration || '') : (set.targetReps || '')}
                    onChange={e => {
                      const val = parseInt(e.target.value) || 0;
                      if (set.setType === 'timed') {
                        onUpdateSet(index, setIdx, { targetDuration: val });
                      } else {
                        onUpdateSet(index, setIdx, { targetReps: val });
                      }
                    }}
                    className="bg-black/40 border border-white/5 rounded-lg px-2 py-2 text-xs font-mono font-bold text-center text-white outline-none focus:border-[var(--color-primary)]"
                  />

                  {/* Target Load */}
                  <input
                    type="number"
                    step="0.5"
                    inputMode="decimal"
                    placeholder="kg"
                    value={set.targetWeight || ''}
                    onChange={e => onUpdateSet(index, setIdx, { targetWeight: parseFloat(e.target.value) || 0 })}
                    className="bg-black/40 border border-white/5 rounded-lg px-2 py-2 text-xs font-mono font-bold text-center text-white outline-none focus:border-[var(--color-primary)]"
                  />

                  {/* Set Type Selector */}
                  <select
                    value={set.setType}
                    onChange={e => onUpdateSet(index, setIdx, { setType: e.target.value as SetType })}
                    className="bg-black/40 border border-white/5 rounded-lg px-1 py-2 text-[11px] font-mono font-bold text-center text-white outline-none focus:border-[var(--color-primary)] appearance-none"
                  >
                    {SET_TYPES_LIST.map(st => (
                      <option key={st.id} value={st.id} className="bg-[#151517] text-white">
                        {st.label}
                      </option>
                    ))}
                  </select>

                  {/* Set Actions (Duplicate / Delete) */}
                  <div className="flex items-center justify-center gap-1">
                    <button
                      onClick={() => onDuplicateSet(index, setIdx)}
                      className="w-7 h-7 rounded-lg flex items-center justify-center text-[var(--color-muted)] hover:text-white active:scale-90"
                      title="Duplicate Set"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => onRemoveSet(index, setIdx)}
                      disabled={exercise.sets.length <= 1}
                      className="w-7 h-7 rounded-lg flex items-center justify-center text-red-400/80 hover:text-red-400 disabled:opacity-20 active:scale-90"
                      title="Remove Set"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={() => onAddSet(index)}
              className="w-full py-2 rounded-xl border border-dashed border-[var(--color-border)] hover:border-[var(--color-primary)]/50 text-[10px] font-mono font-bold uppercase tracking-wider text-[var(--color-muted)] hover:text-white transition-all active:scale-98 mt-2 flex items-center justify-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5 text-[var(--color-primary)]" />
              Add Set
            </button>
          </div>

          {/* Exercise Execution Notes */}
          <div>
            <label className="text-[9px] font-mono uppercase tracking-wider font-bold text-[var(--color-muted)] block mb-1">
              Form Cue / Execution Note
            </label>
            <input
              value={exercise.notes || ''}
              onChange={e => onUpdateNotes(index, e.target.value)}
              placeholder="e.g. Retract scapula, 3-sec eccentric, 1 RIR..."
              className="w-full bg-black/40 border border-white/5 rounded-xl px-3 py-2 text-xs text-white placeholder:text-white/30 outline-none focus:border-[var(--color-primary)]"
            />
          </div>

          {/* Rest Period Configuration */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1 border-t border-white/5">
            <span className="text-[10px] font-mono uppercase tracking-wider font-bold text-[var(--color-muted)]">
              Rest Period
            </span>
            <div className="flex flex-wrap items-center gap-1.5">
              {[0, 30, 60, 90, 120, 180, 300].map(t => (
                <button
                  key={t}
                  onClick={() => onUpdateRest(index, t)}
                  className={`px-2 py-1 rounded-lg text-[10px] font-mono font-bold transition-all active:scale-95 ${
                    exercise.restSeconds === t
                      ? 'bg-[var(--color-primary)] text-black'
                      : 'bg-black/40 border border-white/5 text-[var(--color-muted)]'
                  }`}
                >
                  {t === 0 ? 'None' : `${t}s`}
                </button>
              ))}
            </div>
          </div>

          {/* Superset Grouping */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1 border-t border-white/5">
            <span className="text-[10px] font-mono uppercase tracking-wider font-bold text-purple-400 flex items-center gap-1">
              <Layers className="w-3.5 h-3.5" />
              Superset Group
            </span>
            <div className="flex items-center gap-1.5">
              {['', 'A', 'B', 'C', 'Circuit'].map(g => (
                <button
                  key={g}
                  onClick={() => onUpdateSuperset(index, g)}
                  className={`h-7 px-2.5 rounded-lg text-[10px] font-mono font-bold transition-all active:scale-95 ${
                    (exercise.supersetGroup || '') === g
                      ? 'bg-purple-500 text-white shadow-md'
                      : 'bg-black/40 border border-white/5 text-[var(--color-muted)]'
                  }`}
                >
                  {g || 'None'}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
