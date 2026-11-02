// ─────────────────────────────────────────────────────────────
// MyFitAI — Exercise Library Browser (Full Page)
// Searchable, filterable exercise database with dynamic filters,
// categorized sections, and inline exercise previews.
// Athletic Personal Operating System UI/UX
// ─────────────────────────────────────────────────────────────

import { useState, useMemo, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  EXERCISE_LIBRARY,
  searchExercises,
  getAvailableFilters,
  type ExerciseLibraryEntry,
} from '../data/exerciseLibrary';
import ExerciseMedia from '../components/media/ExerciseMedia';
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
import {
  ArrowLeft,
  X,
  Plus,
  Search,
  SlidersHorizontal,
  SearchX,
  ChevronRight,
  AlertTriangle,
  Dumbbell,
} from 'lucide-react';

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
    <main className={`max-w-xl mx-auto ${isPickerMode ? 'px-0 pt-0 pb-4' : 'px-4 sm:px-6 pt-6 pb-28'}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-5 border-b border-[#2A2A2D] pb-4">
        <div className="flex items-center gap-3">
          {!isPickerMode ? (
            <button
              onClick={() => navigate('/workout')}
              className="w-10 h-10 rounded-xl bg-[#151517] border border-[#2A2A2D] flex items-center justify-center text-[#A1A1A6] hover:text-[#F5F5F5] active:scale-95 transition-all"
              aria-label="Back to Workout"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          ) : (
            <button
              onClick={onClose}
              className="w-10 h-10 rounded-xl bg-[#151517] border border-[#2A2A2D] flex items-center justify-center text-[#A1A1A6] hover:text-[#F5F5F5] active:scale-95 transition-all"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          )}
          <div>
            <h1 className="font-headline font-black text-xl sm:text-2xl text-[#F5F5F5] uppercase tracking-tight">
              {isPickerMode ? 'Select Exercise' : 'Exercise Database'}
            </h1>
            <p className="text-[10px] font-mono text-[#A1A1A6] uppercase tracking-wider font-semibold">
              {EXERCISE_LIBRARY.length} anatomical movements
            </p>
          </div>
        </div>
        <button
          onClick={() => navigate('/workout/exercises/custom')}
          className="w-10 h-10 rounded-xl bg-[#30D158]/15 border border-[#30D158]/30 flex items-center justify-center text-[#30D158] hover:bg-[#30D158]/25 active:scale-95 transition-all"
          title="Create Custom Exercise"
        >
          <Plus className="w-5 h-5 stroke-[2.5]" />
        </button>
      </div>

      {/* Search + Filter Toggle */}
      <div className="flex gap-2.5 mb-4">
        <div className="flex-1 relative">
          <Search className="w-4 h-4 text-[#6B6B70] absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search exercise, muscle, or movement..."
            className="w-full bg-[#151517] border border-[#2A2A2D] rounded-xl pl-10 pr-10 py-3 text-xs sm:text-sm text-[#F5F5F5] placeholder:text-[#6B6B70] outline-none focus:border-[#30D158] transition-colors"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6B6B70] hover:text-[#F5F5F5] active:scale-90"
              aria-label="Clear Search"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`w-11 h-11 rounded-xl flex items-center justify-center transition-all active:scale-95 relative border ${
            hasActiveFilters
              ? 'bg-[#30D158] text-black border-[#30D158] shadow-sm'
              : 'bg-[#151517] text-[#A1A1A6] border-[#2A2A2D] hover:text-[#F5F5F5]'
          }`}
          aria-label="Filter Options"
        >
          <SlidersHorizontal className="w-4 h-4" />
          {activeFilterCount > 0 && (
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-[#FF8A00] text-black text-[9px] font-black rounded-full flex items-center justify-center">
              {activeFilterCount}
            </span>
          )}
        </button>
      </div>

      {/* Filter Chips */}
      {showFilters && (
        <div className="bg-[#151517] rounded-2xl p-4 mb-4 border border-[#2A2A2D] space-y-4 animate-in fade-in duration-200">
          {/* Body Part */}
          <div>
            <p className="text-[10px] font-mono uppercase tracking-wider font-bold text-[#A1A1A6] mb-2">
              Anatomical Region
            </p>
            <div className="flex flex-wrap gap-1.5">
              {ALL_BODY_PARTS.map(bp => (
                <button
                  key={bp}
                  onClick={() => setBodyPartFilter(bodyPartFilter === bp ? '' : bp)}
                  className={`px-3 py-1.5 rounded-lg text-[11px] font-mono font-semibold transition-all active:scale-95 border ${
                    bodyPartFilter === bp
                      ? 'bg-[#30D158] text-black border-[#30D158]'
                      : availableFilters.bodyParts.includes(bp)
                      ? 'bg-[#1E1E20] text-[#F5F5F5] border-[#2A2A2D] hover:border-[#3A3A3D]'
                      : 'bg-[#1E1E20]/40 text-[#6B6B70] border-[#2A2A2D] opacity-40'
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
            <p className="text-[10px] font-mono uppercase tracking-wider font-bold text-[#A1A1A6] mb-2">
              Equipment
            </p>
            <div className="flex flex-wrap gap-1.5">
              {ALL_EQUIPMENT.filter(
                eq => availableFilters.equipment.includes(eq) || equipmentFilter === eq
              ).map(eq => (
                <button
                  key={eq}
                  onClick={() => setEquipmentFilter(equipmentFilter === eq ? '' : eq)}
                  className={`px-3 py-1.5 rounded-lg text-[11px] font-mono font-semibold transition-all active:scale-95 border ${
                    equipmentFilter === eq
                      ? 'bg-[#30D158] text-black border-[#30D158]'
                      : 'bg-[#1E1E20] text-[#F5F5F5] border-[#2A2A2D] hover:border-[#3A3A3D]'
                  }`}
                >
                  {EQUIPMENT_LABELS[eq]}
                </button>
              ))}
            </div>
          </div>

          {/* Exercise Type */}
          <div>
            <p className="text-[10px] font-mono uppercase tracking-wider font-bold text-[#A1A1A6] mb-2">
              Type / Metric
            </p>
            <div className="flex flex-wrap gap-1.5">
              {availableFilters.exerciseTypes.map(t => (
                <button
                  key={t}
                  onClick={() => setExerciseTypeFilter(exerciseTypeFilter === t ? '' : t)}
                  className={`px-3 py-1.5 rounded-lg text-[11px] font-mono font-semibold transition-all active:scale-95 border ${
                    exerciseTypeFilter === t
                      ? 'bg-[#30D158] text-black border-[#30D158]'
                      : 'bg-[#1E1E20] text-[#F5F5F5] border-[#2A2A2D] hover:border-[#3A3A3D]'
                  }`}
                >
                  {EXERCISE_TYPE_LABELS[t]}
                </button>
              ))}
            </div>
          </div>

          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="text-[#FF453A] text-xs font-mono font-bold uppercase tracking-wider hover:underline pt-1 block"
            >
              Clear All Filters
            </button>
          )}
        </div>
      )}

      {/* Results Count */}
      {(query || hasActiveFilters) && (
        <p className="text-xs font-mono text-[#A1A1A6] mb-3">
          {results.length} exercise{results.length !== 1 ? 's' : ''} matched
        </p>
      )}

      {/* Grouped View (no search/filter) */}
      {grouped ? (
        <div className="space-y-6">
          {[...grouped.entries()].map(([bodyPart, exercises]) => (
            <div key={bodyPart} className="space-y-2.5">
              <h2 className="text-xs font-mono uppercase tracking-wider font-bold text-[#30D158] flex items-center gap-2">
                <span className="w-1 h-3.5 bg-[#30D158] rounded-full" />
                <span>{BODY_PART_LABELS[bodyPart]}</span>
                <span className="text-[#6B6B70] font-normal">({exercises.length})</span>
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
            <div className="text-center py-16 bg-[#151517] rounded-3xl border border-[#2A2A2D] p-6 space-y-2">
              <SearchX className="w-8 h-8 text-[#6B6B70] mx-auto" />
              <p className="font-headline font-bold text-base text-[#F5F5F5]">No exercises found</p>
              <p className="text-xs text-[#A1A1A6]">Try adjusting keywords or relaxing filters.</p>
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

function ExerciseRow({
  entry,
  onTap,
}: {
  entry: ExerciseLibraryEntry;
  onTap: (e: ExerciseLibraryEntry) => void;
}) {
  const thumb = entry.imageUrl || entry.gifUrl;
  return (
    <button
      onClick={() => onTap(entry)}
      className="w-full flex items-center gap-3 px-3.5 py-3 rounded-2xl bg-[#151517] border border-[#2A2A2D] hover:border-[#3A3A3D] transition-all active:scale-[0.99] text-left group"
    >
      <div className="w-12 h-12 rounded-xl bg-[#1E1E20] overflow-hidden flex-shrink-0 border border-[#2A2A2D] flex items-center justify-center relative shadow-sm">
        {thumb ? (
          <img
            src={thumb}
            alt={entry.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            loading="lazy"
          />
        ) : (
          <Dumbbell className="w-5 h-5 text-[#30D158]" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-headline font-bold text-sm text-[#F5F5F5] truncate group-hover:text-[#30D158] transition-colors">
          {entry.name}
        </p>
        <p className="text-[11px] font-mono text-[#A1A1A6] truncate mt-0.5">
          {entry.primaryMuscles.map(m => MUSCLE_GROUP_LABELS[m] || m).join(', ')} ·{' '}
          {EQUIPMENT_LABELS[entry.equipment] || entry.equipment}
        </p>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <span
          className={`px-2 py-0.5 rounded text-[9px] font-mono font-bold uppercase tracking-wider border ${
            entry.difficulty === 'beginner'
              ? 'bg-[#30D158]/10 text-[#30D158] border-[#30D158]/20'
              : entry.difficulty === 'intermediate'
              ? 'bg-[#F5C542]/10 text-[#F5C542] border-[#F5C542]/20'
              : 'bg-[#FF453A]/10 text-[#FF453A] border-[#FF453A]/20'
          }`}
        >
          {entry.difficulty}
        </span>
        <ChevronRight className="w-4 h-4 text-[#6B6B70] group-hover:text-[#F5F5F5] transition-colors" />
      </div>
    </button>
  );
}

// ─── Exercise Detail Modal ──────────────────────────────────

function ExerciseDetailModal({
  entry,
  onClose,
}: {
  entry: ExerciseLibraryEntry;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center">
      <div className="absolute inset-0 bg-black/75 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-[#151517] rounded-t-3xl w-full max-w-xl max-h-[85vh] overflow-y-auto border-t border-[#2A2A2D] shadow-2xl animate-slide-up [scrollbar-width:none]">
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-10 h-1 bg-[#2A2A2D] rounded-full" />
        </div>

        {/* Animated Demonstration */}
        {(entry.gifUrl || entry.imageUrl) && (
          <div className="mx-5 mb-4 rounded-2xl overflow-hidden border border-[#2A2A2D] shadow-xl">
            <ExerciseMedia
              gifUrl={entry.gifUrl}
              imageUrl={entry.imageUrl}
              exerciseName={entry.name}
              primaryMuscle={entry.primaryMuscles[0]}
              aspectRatio="wide"
            />
          </div>
        )}

        {/* Header */}
        <div className="px-5 mb-4">
          <div className="flex items-start justify-between gap-3 mb-2">
            <div>
              <h2 className="font-headline font-black text-xl text-[#F5F5F5] uppercase tracking-tight">
                {entry.name}
              </h2>
              {entry.aliases && entry.aliases.length > 0 && (
                <p className="text-[11px] font-mono text-[#A1A1A6] mt-0.5">
                  Aliases: {entry.aliases.join(', ')}
                </p>
              )}
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg bg-[#1E1E20] border border-[#2A2A2D] flex items-center justify-center text-[#A1A1A6] hover:text-[#F5F5F5]"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Tags */}
          <div className="flex flex-wrap gap-1.5 mt-3">
            <span className="px-2.5 py-1 rounded-lg bg-[#30D158]/10 text-[#30D158] border border-[#30D158]/20 text-[10px] font-mono font-bold uppercase tracking-wider">
              {BODY_PART_LABELS[entry.bodyPart]}
            </span>
            <span className="px-2.5 py-1 rounded-lg bg-[#1E1E20] text-[#A1A1A6] border border-[#2A2A2D] text-[10px] font-mono font-bold uppercase tracking-wider">
              {EQUIPMENT_LABELS[entry.equipment]}
            </span>
            <span className="px-2.5 py-1 rounded-lg bg-[#1E1E20] text-[#A1A1A6] border border-[#2A2A2D] text-[10px] font-mono font-bold uppercase tracking-wider">
              {EXERCISE_TYPE_LABELS[entry.exerciseType]}
            </span>
            <span
              className={`px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold uppercase tracking-wider border ${
                entry.difficulty === 'beginner'
                  ? 'bg-[#30D158]/10 text-[#30D158] border-[#30D158]/20'
                  : entry.difficulty === 'intermediate'
                  ? 'bg-[#F5C542]/10 text-[#F5C542] border-[#F5C542]/20'
                  : 'bg-[#FF453A]/10 text-[#FF453A] border-[#FF453A]/20'
              }`}
            >
              {entry.difficulty}
            </span>
          </div>
        </div>

        {/* Muscles */}
        <div className="px-5 mb-4 space-y-1.5">
          <h3 className="text-[10px] font-mono uppercase tracking-wider font-bold text-[#A1A1A6]">
            Targeted Musculature
          </h3>
          <div className="flex flex-wrap gap-1.5">
            {entry.primaryMuscles.map(m => (
              <span
                key={m}
                className="px-2.5 py-1 rounded-lg bg-[#30D158]/15 text-[#30D158] border border-[#30D158]/30 text-[10px] font-mono font-bold"
              >
                {MUSCLE_GROUP_LABELS[m]} (Primary)
              </span>
            ))}
            {entry.secondaryMuscles.map(m => (
              <span
                key={m}
                className="px-2.5 py-1 rounded-lg bg-[#1E1E20] text-[#A1A1A6] border border-[#2A2A2D] text-[10px] font-mono font-semibold"
              >
                {MUSCLE_GROUP_LABELS[m]} (Synergist)
              </span>
            ))}
          </div>
        </div>

        {/* Instructions */}
        <div className="px-5 mb-4 space-y-2">
          <h3 className="text-[10px] font-mono uppercase tracking-wider font-bold text-[#A1A1A6]">
            Biomechanical Execution Steps
          </h3>
          <ol className="space-y-2">
            {entry.instructions.map((step, i) => (
              <li key={i} className="flex gap-3 text-xs leading-relaxed text-[#F5F5F5]">
                <span className="flex-shrink-0 w-5 h-5 rounded-md bg-[#30D158]/15 text-[#30D158] text-[10px] font-mono font-bold flex items-center justify-center">
                  {i + 1}
                </span>
                <span className="pt-0.5">{step}</span>
              </li>
            ))}
          </ol>
        </div>

        {/* Tips */}
        {entry.tips && (
          <div className="px-5 mb-4 space-y-1.5">
            <h3 className="text-[10px] font-mono uppercase tracking-wider font-bold text-[#A1A1A6]">
              Coaching Cue
            </h3>
            <div className="bg-[#1E1E20] border border-[#2A2A2D] rounded-xl px-4 py-3">
              <p className="text-xs text-[#F5F5F5] leading-relaxed">{entry.tips}</p>
            </div>
          </div>
        )}

        {/* Safety Notes */}
        {entry.safetyNotes && entry.safetyNotes.length > 0 && (
          <div className="px-5 mb-4 space-y-1.5">
            <h3 className="text-[10px] font-mono uppercase tracking-wider font-bold text-[#FF453A]">
              Safety Warning
            </h3>
            <div className="bg-[#FF453A]/10 border border-[#FF453A]/20 rounded-xl px-4 py-3 space-y-1">
              {entry.safetyNotes.map((note, i) => (
                <div key={i} className="flex items-start gap-2 text-xs text-[#FF453A]">
                  <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                  <span>{note}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Close button */}
        <div className="p-5 pt-2 border-t border-[#2A2A2D]">
          <button
            onClick={onClose}
            className="w-full py-3.5 rounded-xl bg-[#1E1E20] hover:bg-[#2A2A2D] text-[#F5F5F5] font-headline font-bold text-xs uppercase tracking-wider active:scale-[0.98] transition-all"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
