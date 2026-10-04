// ─────────────────────────────────────────────────────────────
// MyFitAI — Exercise Library Browser (Full Page)
// Searchable, filterable exercise database with dynamic filters,
// categorized sections, and inline exercise previews.
// ─────────────────────────────────────────────────────────────

import { useState, useMemo, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  EXERCISE_LIBRARY,
  searchExercises,
  getAvailableFilters,
  type ExerciseLibraryEntry,
} from '../data/exerciseLibrary';
import {
  ALL_BODY_PARTS,
  ALL_EQUIPMENT,
  BODY_PART_LABELS,
  EQUIPMENT_LABELS,
  EXERCISE_TYPE_LABELS,
  MUSCLE_GROUP_LABELS,
  type BodyPart,
  type EquipmentType,
  type MuscleGroup,
  type ExerciseType,
} from '../types/exercise';

interface ExerciseLibraryProps {
  /** If in picker mode, called when user selects an exercise */
  onPick?: (entry: ExerciseLibraryEntry) => void;
  /** If picker mode, hides nav */
  isPickerMode?: boolean;
  /** Close picker */
  onClose?: () => void;
}

export default function ExerciseLibrary({ onPick, isPickerMode, onClose }: ExerciseLibraryProps) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const initialQuery = searchParams.get('search') || searchParams.get('q') || '';
  const initialMuscle = (searchParams.get('muscle') as MuscleGroup) || '';

  const [query, setQuery] = useState(initialQuery);
  const [bodyPartFilter, setBodyPartFilter] = useState<BodyPart | ''>('');
  const [equipmentFilter, setEquipmentFilter] = useState<EquipmentType | ''>('');
  const [muscleFilter, setMuscleFilter] = useState<MuscleGroup | ''>(initialMuscle);
  const [exerciseTypeFilter, setExerciseTypeFilter] = useState<ExerciseType | ''>('');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<ExerciseLibraryEntry | null>(null);

  const filters = useMemo(() => {
    const f: Parameters<typeof searchExercises>[1] = {};
    if (bodyPartFilter) f.bodyPart = bodyPartFilter;
    if (equipmentFilter) f.equipment = equipmentFilter;
    if (muscleFilter) f.muscle = muscleFilter;
    if (exerciseTypeFilter) f.exerciseType = exerciseTypeFilter;
    return f;
  }, [bodyPartFilter, equipmentFilter, muscleFilter, exerciseTypeFilter]);

  const results = useMemo(() => searchExercises(query, filters), [query, filters]);
  const availableFilters = useMemo(() => getAvailableFilters(results), [results]);

  const hasActiveFilters = bodyPartFilter || equipmentFilter || muscleFilter || exerciseTypeFilter;
  const activeFilterCount = [bodyPartFilter, equipmentFilter, muscleFilter, exerciseTypeFilter].filter(Boolean).length;

  const clearFilters = useCallback(() => {
    setBodyPartFilter('');
    setEquipmentFilter('');
    setMuscleFilter('');
    setExerciseTypeFilter('');
  }, []);

  // Group results by body part for browsing
  const grouped = useMemo(() => {
    if (query || hasActiveFilters) return null;
    const groups = new Map<BodyPart, ExerciseLibraryEntry[]>();
    for (const ex of EXERCISE_LIBRARY) {
      if (!groups.has(ex.bodyPart)) groups.set(ex.bodyPart, []);
      groups.get(ex.bodyPart)!.push(ex);
    }
    return groups;
  }, [query, hasActiveFilters]);

  const handleExerciseTap = (entry: ExerciseLibraryEntry) => {
    if (onPick) {
      onPick(entry);
    } else {
      setSelectedEntry(entry);
    }
  };

  return (
    <main className={`max-w-md mx-auto ${isPickerMode ? 'px-0 pt-0 pb-4' : 'px-5 pt-6 pb-32'}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          {!isPickerMode ? (
            <button onClick={() => navigate('/workout')} className="w-9 h-9 rounded-xl bg-[var(--color-surface-container)] flex items-center justify-center text-on-surface active:scale-90 transition-transform">
              <span className="material-symbols-outlined text-[18px]">arrow_back</span>
            </button>
          ) : (
            <button onClick={onClose} className="w-9 h-9 rounded-xl bg-[var(--color-surface-container)] flex items-center justify-center text-on-surface active:scale-90 transition-transform">
              <span className="material-symbols-outlined text-[18px]">close</span>
            </button>
          )}
          <div>
            <h1 className="font-headline font-extrabold text-xl tracking-tight">
              {isPickerMode ? 'Add Exercise' : 'Exercise Library'}
            </h1>
            <p className="text-[10px] text-on-surface-variant uppercase tracking-widest font-semibold">
              {EXERCISE_LIBRARY.length} exercises
            </p>
          </div>
        </div>
        <button
          onClick={() => navigate('/workout/exercises/custom')}
          className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center text-primary active:scale-90 transition-transform"
        >
          <span className="material-symbols-outlined text-[18px]">add</span>
        </button>
      </div>

      {/* Search + Filter Toggle */}
      <div className="flex gap-2 mb-4">
        <div className="flex-1 relative">
          <span className="material-symbols-outlined text-on-surface-variant absolute left-3 top-1/2 -translate-y-1/2 text-[18px]">search</span>
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search exercises..."
            className="w-full bg-[var(--color-surface-container)] border border-white/[0.04] rounded-xl pl-10 pr-4 py-3 text-sm text-on-surface placeholder:text-on-surface-variant/40 outline-none focus:border-primary/40 transition-colors"
          />
          {query && (
            <button onClick={() => setQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant active:scale-90">
              <span className="material-symbols-outlined text-[16px]">close</span>
            </button>
          )}
        </div>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all active:scale-90 relative ${
            hasActiveFilters ? 'bg-primary text-on-primary' : 'bg-[var(--color-surface-container)] text-on-surface-variant'
          }`}
        >
          <span className="material-symbols-outlined text-[20px]">tune</span>
          {activeFilterCount > 0 && (
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-error text-white text-[9px] font-bold rounded-full flex items-center justify-center">
              {activeFilterCount}
            </span>
          )}
        </button>
      </div>

      {/* Filter Chips */}
      {showFilters && (
        <div className="bg-[var(--color-surface-container)] rounded-2xl p-4 mb-4 border border-white/[0.04] space-y-4 animate-in slide-in-from-top duration-200">
          {/* Body Part */}
          <div>
            <p className="text-[9px] uppercase tracking-[0.2em] font-bold text-on-surface-variant mb-2">Body Part</p>
            <div className="flex flex-wrap gap-1.5">
              {ALL_BODY_PARTS.map(bp => (
                <button
                  key={bp}
                  onClick={() => setBodyPartFilter(bodyPartFilter === bp ? '' : bp)}
                  className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all active:scale-95 ${
                    bodyPartFilter === bp
                      ? 'bg-primary text-on-primary'
                      : availableFilters.bodyParts.includes(bp)
                      ? 'bg-white/[0.04] text-on-surface hover:bg-white/[0.08]'
                      : 'bg-white/[0.02] text-on-surface-variant/30'
                  }`}
                  disabled={!availableFilters.bodyParts.includes(bp) && bodyPartFilter !== bp}
                >
                  {BODY_PART_LABELS[bp]}
                </button>
              ))}
            </div>
          </div>

          {/* Equipment */}
          <div>
            <p className="text-[9px] uppercase tracking-[0.2em] font-bold text-on-surface-variant mb-2">Equipment</p>
            <div className="flex flex-wrap gap-1.5">
              {ALL_EQUIPMENT.filter(eq => availableFilters.equipment.includes(eq) || equipmentFilter === eq).map(eq => (
                <button
                  key={eq}
                  onClick={() => setEquipmentFilter(equipmentFilter === eq ? '' : eq)}
                  className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all active:scale-95 ${
                    equipmentFilter === eq
                      ? 'bg-primary text-on-primary'
                      : 'bg-white/[0.04] text-on-surface hover:bg-white/[0.08]'
                  }`}
                >
                  {EQUIPMENT_LABELS[eq]}
                </button>
              ))}
            </div>
          </div>

          {/* Exercise Type */}
          <div>
            <p className="text-[9px] uppercase tracking-[0.2em] font-bold text-on-surface-variant mb-2">Type</p>
            <div className="flex flex-wrap gap-1.5">
              {availableFilters.exerciseTypes.map(t => (
                <button
                  key={t}
                  onClick={() => setExerciseTypeFilter(exerciseTypeFilter === t ? '' : t)}
                  className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all active:scale-95 ${
                    exerciseTypeFilter === t
                      ? 'bg-primary text-on-primary'
                      : 'bg-white/[0.04] text-on-surface hover:bg-white/[0.08]'
                  }`}
                >
                  {EXERCISE_TYPE_LABELS[t]}
                </button>
              ))}
            </div>
          </div>

          {hasActiveFilters && (
            <button onClick={clearFilters} className="text-error text-[11px] font-bold uppercase tracking-wider active:scale-95">
              Clear All Filters
            </button>
          )}
        </div>
      )}

      {/* Results Count */}
      {(query || hasActiveFilters) && (
        <p className="text-[11px] text-on-surface-variant mb-3 font-semibold">
          {results.length} exercise{results.length !== 1 ? 's' : ''} found
        </p>
      )}

      {/* Grouped View (no search/filter) */}
      {grouped ? (
        <div className="space-y-6">
          {[...grouped.entries()].map(([bodyPart, exercises]) => (
            <div key={bodyPart}>
              <h2 className="text-[11px] uppercase tracking-[0.2em] font-bold text-primary mb-3 flex items-center gap-2">
                <span className="w-1 h-4 bg-primary rounded-full" />
                {BODY_PART_LABELS[bodyPart]} · {exercises.length}
              </h2>
              <div className="space-y-1.5">
                {exercises.map((ex, i) => (
                  <ExerciseRow key={`${bodyPart}-${i}`} entry={ex} onTap={handleExerciseTap} />
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* Flat list when searching/filtering */
        <div className="space-y-1.5">
          {results.map((ex, i) => (
            <ExerciseRow key={i} entry={ex} onTap={handleExerciseTap} />
          ))}
          {results.length === 0 && (
            <div className="text-center py-16">
              <span className="material-symbols-outlined text-5xl text-on-surface-variant/20 mb-3 block">search_off</span>
              <p className="font-headline font-bold text-lg text-on-surface-variant/50 mb-1">No exercises found</p>
              <p className="text-on-surface-variant/30 text-sm">Try adjusting your search or filters.</p>
            </div>
          )}
        </div>
      )}

      {/* Exercise Detail Modal */}
      {selectedEntry && (
        <ExerciseDetailModal entry={selectedEntry} onClose={() => setSelectedEntry(null)} />
      )}
    </main>
  );
}

// ─── Exercise Row ───────────────────────────────────────────

function ExerciseRow({ entry, onTap }: { entry: ExerciseLibraryEntry; onTap: (e: ExerciseLibraryEntry) => void }) {
  const thumb = entry.imageUrl || entry.gifUrl;
  return (
    <button
      onClick={() => onTap(entry)}
      className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-2xl bg-[var(--color-surface-container)] border border-white/[0.04] hover:bg-[var(--color-surface-container-high)] hover:border-white/10 transition-all active:scale-[0.98] text-left group"
    >
      <div className="w-12 h-12 rounded-xl bg-black/40 overflow-hidden flex-shrink-0 border border-white/10 flex items-center justify-center relative shadow-sm">
        {thumb ? (
          <img
            src={thumb}
            alt={entry.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            loading="lazy"
          />
        ) : (
          <span className="text-2xl">{entry.emoji}</span>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-headline font-bold text-sm text-on-surface truncate group-hover:text-primary transition-colors">{entry.name}</p>
        <p className="text-[10px] text-on-surface-variant truncate">
          {entry.primaryMuscles.map(m => MUSCLE_GROUP_LABELS[m] || m).join(', ')} · {EQUIPMENT_LABELS[entry.equipment] || entry.equipment}
        </p>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <span className={`px-2 py-0.5 rounded-md text-[8px] font-bold uppercase tracking-wider ${
          entry.difficulty === 'beginner' ? 'bg-[#6FFB85]/10 text-[#6FFB85]' :
          entry.difficulty === 'intermediate' ? 'bg-[#FBBF24]/10 text-[#FBBF24]' :
          'bg-error/10 text-error'
        }`}>
          {entry.difficulty}
        </span>
        <span className="material-symbols-outlined text-[16px] text-on-surface-variant/30 group-hover:text-primary transition-colors">chevron_right</span>
      </div>
    </button>
  );
}

// ─── Exercise Detail Modal ──────────────────────────────────

function ExerciseDetailModal({ entry, onClose }: { entry: ExerciseLibraryEntry; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-[var(--color-surface)] rounded-t-3xl w-full max-w-md max-h-[85vh] overflow-y-auto border-t border-white/[0.06] shadow-2xl animate-in slide-in-from-bottom duration-300">
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-10 h-1 bg-white/10 rounded-full" />
        </div>

        {/* Animated GIF demonstration */}
        {(entry.gifUrl || entry.imageUrl) && (
          <div className="relative mx-4 rounded-2xl overflow-hidden mb-4 aspect-video bg-black flex items-center justify-center border border-white/10 shadow-xl">
            <img
              src={entry.gifUrl || entry.imageUrl}
              alt={entry.name}
              className="w-full h-full object-contain p-1"
              loading="eager"
            />
            <div className="absolute top-2.5 left-2.5 px-2.5 py-0.5 rounded-full bg-black/70 backdrop-blur-md border border-white/10 text-[9px] font-bold uppercase tracking-wider text-white flex items-center gap-1.5 shadow-md">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Animated Form Guide
            </div>
          </div>
        )}

        {/* Header */}
        <div className="px-5 mb-4">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-3xl">{entry.emoji}</span>
            <div>
              <h2 className="font-headline font-extrabold text-xl tracking-tight">{entry.name}</h2>
              {entry.aliases && entry.aliases.length > 0 && (
                <p className="text-[10px] text-on-surface-variant">
                  Also: {entry.aliases.join(', ')}
                </p>
              )}
            </div>
          </div>

          {/* Tags */}
          <div className="flex flex-wrap gap-1.5 mt-3">
            <span className="px-2.5 py-1 rounded-lg bg-primary/10 text-primary text-[10px] font-bold uppercase tracking-wider">
              {BODY_PART_LABELS[entry.bodyPart]}
            </span>
            <span className="px-2.5 py-1 rounded-lg bg-white/[0.06] text-on-surface-variant text-[10px] font-bold uppercase tracking-wider">
              {EQUIPMENT_LABELS[entry.equipment]}
            </span>
            <span className="px-2.5 py-1 rounded-lg bg-white/[0.06] text-on-surface-variant text-[10px] font-bold uppercase tracking-wider">
              {EXERCISE_TYPE_LABELS[entry.exerciseType]}
            </span>
            <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider ${
              entry.difficulty === 'beginner' ? 'bg-[#6FFB85]/10 text-[#6FFB85]' :
              entry.difficulty === 'intermediate' ? 'bg-[#FBBF24]/10 text-[#FBBF24]' :
              'bg-error/10 text-error'
            }`}>
              {entry.difficulty}
            </span>
          </div>
        </div>

        {/* Muscles */}
        <div className="px-5 mb-4">
          <h3 className="text-[10px] uppercase tracking-[0.2em] font-bold text-on-surface-variant mb-2">Target Muscles</h3>
          <div className="flex flex-wrap gap-1.5">
            {entry.primaryMuscles.map(m => (
              <span key={m} className="px-2.5 py-1 rounded-lg bg-primary/10 text-primary text-[10px] font-bold">
                {MUSCLE_GROUP_LABELS[m]}
              </span>
            ))}
            {entry.secondaryMuscles.map(m => (
              <span key={m} className="px-2.5 py-1 rounded-lg bg-white/[0.04] text-on-surface-variant text-[10px] font-bold">
                {MUSCLE_GROUP_LABELS[m]}
              </span>
            ))}
          </div>
        </div>

        {/* Instructions */}
        <div className="px-5 mb-4">
          <h3 className="text-[10px] uppercase tracking-[0.2em] font-bold text-on-surface-variant mb-2">Instructions</h3>
          <ol className="space-y-2">
            {entry.instructions.map((step, i) => (
              <li key={i} className="flex gap-3 text-sm text-on-surface">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary text-[11px] font-bold flex items-center justify-center">
                  {i + 1}
                </span>
                <span className="pt-0.5">{step}</span>
              </li>
            ))}
          </ol>
        </div>

        {/* Tips */}
        <div className="px-5 mb-4">
          <h3 className="text-[10px] uppercase tracking-[0.2em] font-bold text-on-surface-variant mb-2">Pro Tips</h3>
          <div className="bg-primary/5 border border-primary/10 rounded-xl px-4 py-3">
            <p className="text-sm text-on-surface">{entry.tips}</p>
          </div>
        </div>

        {/* Safety Notes */}
        {entry.safetyNotes && entry.safetyNotes.length > 0 && (
          <div className="px-5 mb-4">
            <h3 className="text-[10px] uppercase tracking-[0.2em] font-bold text-error mb-2">Safety</h3>
            <div className="bg-error/5 border border-error/10 rounded-xl px-4 py-3 space-y-1">
              {entry.safetyNotes.map((note, i) => (
                <p key={i} className="text-sm text-on-surface flex gap-2">
                  <span className="text-error">⚠️</span> {note}
                </p>
              ))}
            </div>
          </div>
        )}

        {/* Close button */}
        <div className="p-5 pt-2">
          <button onClick={onClose} className="w-full py-3 rounded-xl bg-[var(--color-surface-container)] text-on-surface font-bold text-sm uppercase tracking-wider active:scale-95 transition-transform">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
