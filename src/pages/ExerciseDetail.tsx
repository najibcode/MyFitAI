// ─────────────────────────────────────────────────────────────
// MyFitAI — Exercise Detail Page (/exercises/:id)
// Comprehensive exercise overview: instructions, video demo,
// muscle activation, PR history, and historical progression.
// ─────────────────────────────────────────────────────────────

import { useState, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  EXERCISE_LIBRARY,
  getExerciseGif,
  getExerciseThumbnail,
} from '../data/exerciseLibrary';
import { useWorkoutBuilder } from '../context/WorkoutBuilderContext';
import {
  MUSCLE_GROUP_LABELS,
  EQUIPMENT_LABELS,
  EXERCISE_TYPE_LABELS,
  BODY_PART_LABELS,
  DIFFICULTY_LABELS,
} from '../types/exercise';
import type { WorkoutSession, WorkoutExercise } from '../types/workout';
import { calculate1RM } from '../types/workout';

export default function ExerciseDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { sessions, personalRecords, startSession } = useWorkoutBuilder();

  const [activeTab, setActiveTab] = useState<'guide' | 'history' | 'prs' | 'percentages'>('guide');
  const [custom1RM, setCustom1RM] = useState<string>('');
  const [isPaused, setIsPaused] = useState(false);

  // Find exercise in built-in library or custom
  const exercise = useMemo(() => {
    return EXERCISE_LIBRARY.find(
      e => e.id === id ||
           e.name.toLowerCase() === id?.toLowerCase() ||
           e.name.toLowerCase().replace(/[^a-z0-9]+/g, '-') === id?.toLowerCase() ||
           e.aliases?.some(a => a.toLowerCase() === id?.toLowerCase() || a.toLowerCase().replace(/[^a-z0-9]+/g, '-') === id?.toLowerCase())
    );
  }, [id]);

  const exerciseId = useMemo(() => {
    return exercise ? exercise.name.toLowerCase().replace(/[^a-z0-9]+/g, '-') : '';
  }, [exercise]);

  // Exercise PRs
  const exercisePRs = useMemo(() => {
    if (!exercise) return [];
    return personalRecords.get(exerciseId) || personalRecords.get(exercise.name.toLowerCase()) || [];
  }, [exercise, exerciseId, personalRecords]);

  // History of sessions where this exercise was performed
  const exerciseHistory = useMemo(() => {
    if (!exercise) return [];
    const list: {
      session: WorkoutSession;
      date: string;
      sets: { weight: number; reps: number; completed: boolean; rpe?: number }[];
      maxWeight: number;
      best1RM: number;
      totalVolume: number;
    }[] = [];

    sessions.forEach(session => {
      const found = session.exercises.find(
        e => e.exerciseId === exerciseId || e.exerciseName.toLowerCase() === exercise.name.toLowerCase()
      );
      if (found && found.sets.length > 0) {
        const completedSets = found.sets.filter(s => s.completed && !s.skipped);
        if (completedSets.length > 0) {
          const maxW = Math.max(...completedSets.map(s => s.weight || 0));
          const best1RM = Math.max(...completedSets.map(s => calculate1RM(s.weight || 0, s.reps || 0)));
          const vol = completedSets.reduce((sum, s) => sum + (s.weight || 0) * (s.reps || 0), 0);

          list.push({
            session,
            date: new Date(session.startedAt || session.startTime || Date.now()).toLocaleDateString(undefined, {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            }),
            sets: completedSets,
            maxWeight: maxW,
            best1RM: Math.round(best1RM * 10) / 10,
            totalVolume: Math.round(vol),
          });
        }
      }
    });

    return list.reverse(); // Most recent first
  }, [exercise, exerciseId, sessions]);

  // Progression data for chart (chronological order)
  const progressionData = useMemo(() => {
    return [...exerciseHistory].reverse().map(h => ({
      date: h.date,
      best1RM: h.best1RM,
      maxWeight: h.maxWeight,
      volume: h.totalVolume,
    }));
  }, [exerciseHistory]);

  const currentBest1RM = useMemo(() => {
    const pr1RM = exercisePRs.find(p => p.type === '1rm')?.value;
    if (pr1RM) return pr1RM;
    if (exerciseHistory.length > 0) {
      return Math.max(...exerciseHistory.map(h => h.best1RM));
    }
    return 100;
  }, [exercisePRs, exerciseHistory]);

  const active1RMValue = parseFloat(custom1RM) || currentBest1RM || 100;

  const handleStartWorkout = () => {
    if (!exercise) return;
    const initialExercise: WorkoutExercise = {
      exerciseId,
      exerciseName: exercise.name,
      thumbnailEmoji: exercise.emoji,
      primaryMuscles: exercise.primaryMuscles,
      exerciseType: exercise.exerciseType,
      restSeconds: 90,
      sets: [
        { targetReps: 10, targetWeight: 0, setType: 'normal' },
        { targetReps: 10, targetWeight: 0, setType: 'normal' },
        { targetReps: 10, targetWeight: 0, setType: 'normal' },
      ],
      notes: '',
    };

    startSession({
      id: crypto.randomUUID(),
      name: `${exercise.name} Focus`,
      description: `Targeted session for ${exercise.name}`,
      type: 'strength',
      targetMuscles: exercise.primaryMuscles,
      exercises: [initialExercise],
      estimatedDuration: 30,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    navigate('/workout/active');
  };

  if (!exercise) {
    return (
      <main className="max-w-md mx-auto px-6 pt-16 pb-32 text-center">
        <div className="w-16 h-16 rounded-2xl bg-white/[0.04] flex items-center justify-center mx-auto mb-4">
          <span className="material-symbols-outlined text-3xl text-on-surface-variant">search_off</span>
        </div>
        <h2 className="font-headline font-black text-xl mb-2">Exercise Not Found</h2>
        <p className="text-on-surface-variant text-sm mb-6">
          The requested exercise could not be located in the library.
        </p>
        <Link
          to="/exercises"
          className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-black rounded-xl font-bold uppercase tracking-wider text-xs active:scale-95"
        >
          <span className="material-symbols-outlined text-sm">arrow_back</span>
          Back to Library
        </Link>
      </main>
    );
  }

  const gifUrl = exercise ? getExerciseGif(exercise) : '';
  const thumbnailUrl = exercise ? getExerciseThumbnail(exercise) : '';

  return (
    <main className="max-w-md mx-auto px-4 pt-4 pb-32 space-y-5 animate-card-enter">
      {/* Top Bar Navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate(-1)}
          className="w-10 h-10 rounded-full bg-[var(--color-surface-container)] flex items-center justify-center text-on-surface hover:bg-white/[0.08] active:scale-90 transition-transform"
        >
          <span className="material-symbols-outlined text-[20px]">arrow_back</span>
        </button>
        <div className="flex items-center gap-2">
          <span className="px-3 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-primary/10 text-primary border border-primary/20">
            {EXERCISE_TYPE_LABELS[exercise.exerciseType]}
          </span>
          <span className="px-3 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-white/[0.04] text-on-surface-variant">
            {DIFFICULTY_LABELS[exercise.difficulty]}
          </span>
        </div>
      </div>

      {/* Hero Card */}
      <div className="bg-[var(--color-surface-container)] rounded-3xl p-5 border border-white/[0.04] relative overflow-hidden">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <span className="text-3xl mb-2 block">{exercise.emoji}</span>
            <h1 className="font-headline font-black text-2xl text-on-surface tracking-tight leading-snug">
              {exercise.name}
            </h1>
            <p className="text-xs text-on-surface-variant font-medium mt-1">
              {BODY_PART_LABELS[exercise.bodyPart]} · {EQUIPMENT_LABELS[exercise.equipment]}
            </p>
          </div>

          <button
            onClick={handleStartWorkout}
            className="flex-shrink-0 px-4 py-3 bg-primary text-black rounded-2xl font-headline font-extrabold text-xs uppercase tracking-wider flex items-center gap-1.5 shadow-[0_4px_16px_rgba(255,122,0,0.3)] active:scale-95 transition-transform"
          >
            <span className="material-symbols-outlined text-[16px]">play_arrow</span>
            Start
          </button>
        </div>

        {/* Muscle Tags */}
        <div className="mt-4 pt-4 border-t border-white/[0.04] flex flex-wrap gap-1.5">
          {exercise.primaryMuscles.map(m => (
            <span
              key={m}
              className="px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider bg-primary/15 text-primary"
            >
              {MUSCLE_GROUP_LABELS[m]}
            </span>
          ))}
          {exercise.secondaryMuscles?.map(m => (
            <span
              key={m}
              className="px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider bg-white/[0.04] text-on-surface-variant"
            >
              {MUSCLE_GROUP_LABELS[m]} (Secondary)
            </span>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex bg-[var(--color-surface-container-low)] p-1 rounded-2xl border border-white/[0.04]">
        {[
          { id: 'guide', label: 'Guide', icon: 'menu_book' },
          { id: 'history', label: `History (${exerciseHistory.length})`, icon: 'history' },
          { id: 'prs', label: `PRs (${exercisePRs.length})`, icon: 'trophy' },
          { id: 'percentages', label: '1RM %', icon: 'percent' },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as typeof activeTab)}
            className={`flex-1 py-2.5 rounded-xl font-headline font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all active:scale-95 ${
              activeTab === tab.id
                ? 'bg-primary text-black shadow-md'
                : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {/* TAB 1: GUIDE */}
      {activeTab === 'guide' && (
        <div className="space-y-4">
          {/* Animated GIF Demonstration Player */}
          {(gifUrl || thumbnailUrl) && (
            <div className="bg-[var(--color-surface-container)] rounded-3xl border border-white/[0.08] overflow-hidden shadow-2xl relative">
              {/* Frame Header */}
              <div className="flex items-center justify-between px-4 py-2.5 bg-black/40 border-b border-white/[0.06]">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-[10px] font-bold uppercase tracking-widest text-on-surface">
                    Animated Form Guide
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="px-2 py-0.5 rounded-full bg-primary/15 text-primary text-[9px] font-bold uppercase tracking-wider">
                    HD Form Loop
                  </span>
                </div>
              </div>

              {/* GIF Viewport */}
              <div className="relative aspect-video bg-gradient-to-b from-black/80 to-black flex items-center justify-center overflow-hidden">
                {gifUrl ? (
                  <img
                    src={isPaused && thumbnailUrl ? thumbnailUrl : gifUrl}
                    alt={`${exercise.name} animated form demonstration`}
                    className="w-full h-full object-contain p-2 transition-all duration-300"
                    loading="eager"
                  />
                ) : thumbnailUrl ? (
                  <img
                    src={thumbnailUrl}
                    alt={exercise.name}
                    className="w-full h-full object-contain p-2"
                  />
                ) : null}

                {/* Floating control button */}
                <div className="absolute bottom-3 right-3 flex items-center gap-2">
                  <button
                    onClick={() => setIsPaused(p => !p)}
                    className="px-3 py-1.5 rounded-xl bg-black/70 backdrop-blur-md border border-white/15 text-white text-xs font-bold flex items-center gap-1.5 shadow-lg active:scale-95 transition-transform"
                    title={isPaused ? 'Resume animation' : 'Pause animation'}
                  >
                    <span className="material-symbols-outlined text-[16px]">
                      {isPaused ? 'play_arrow' : 'pause'}
                    </span>
                    {isPaused ? 'Play' : 'Pause'}
                  </button>
                </div>
              </div>

              {/* Player Footer */}
              <div className="p-3.5 bg-white/[0.02] border-t border-white/[0.04] flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 text-on-surface-variant text-[11px]">
                  <span className="material-symbols-outlined text-[15px] text-primary">fitness_center</span>
                  <span>Primary: <strong className="text-on-surface">{exercise.primaryMuscles.map(m => MUSCLE_GROUP_LABELS[m] || m).join(', ')}</strong></span>
                </div>
                <div className="flex items-center gap-1.5 text-[11px] text-emerald-400 font-semibold bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span>Interactive GIF</span>
                </div>
              </div>
            </div>
          )}

          {/* Step-by-Step Instructions */}
          {exercise.instructions && exercise.instructions.length > 0 && (
            <div className="bg-[var(--color-surface-container)] rounded-2xl p-5 border border-white/[0.04] space-y-3">
              <h3 className="font-headline font-extrabold text-sm uppercase tracking-wider text-on-surface flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-[18px]">format_list_numbered</span>
                Execution Steps
              </h3>
              <ol className="space-y-2.5">
                {exercise.instructions.map((step, idx) => (
                  <li key={idx} className="flex items-start gap-3 text-xs leading-relaxed text-on-surface/90">
                    <span className="flex-shrink-0 w-5 h-5 rounded-full bg-primary/10 text-primary font-bold text-[10px] flex items-center justify-center mt-0.5">
                      {idx + 1}
                    </span>
                    <span>{step}</span>
                  </li>
                ))}
              </ol>
            </div>
          )}

          {/* Coaching Tip */}
          {exercise.tips && (
            <div className="bg-[var(--color-surface-container)] rounded-2xl p-5 border border-white/[0.04] space-y-3">
              <h3 className="font-headline font-extrabold text-sm uppercase tracking-wider text-[#6FFB85] flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px]">lightbulb</span>
                Coaching Cues & Tips
              </h3>
              <p className="text-xs leading-relaxed text-on-surface/90 flex items-start gap-2.5">
                <span className="material-symbols-outlined text-[#6FFB85] text-sm mt-0.5 flex-shrink-0">
                  check_circle
                </span>
                <span>{exercise.tips}</span>
              </p>
            </div>
          )}

          {/* Safety Notes */}
          {exercise.safetyNotes && exercise.safetyNotes.length > 0 && (
            <div className="bg-[var(--color-surface-container)] rounded-2xl p-5 border border-white/[0.04] space-y-3">
              <h3 className="font-headline font-extrabold text-sm uppercase tracking-wider text-error flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px]">warning</span>
                Safety & Form Notes
              </h3>
              <ul className="space-y-2">
                {exercise.safetyNotes.map((note, idx) => (
                  <li key={idx} className="flex items-start gap-2.5 text-xs leading-relaxed text-on-surface/90">
                    <span className="material-symbols-outlined text-error text-sm mt-0.5 flex-shrink-0">
                      close
                    </span>
                    <span>{note}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: HISTORY */}
      {activeTab === 'history' && (
        <div className="space-y-4">
          {progressionData.length > 1 && (
            <div className="bg-[var(--color-surface-container)] rounded-2xl p-5 border border-white/[0.04] space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-headline font-extrabold text-sm uppercase tracking-wider text-on-surface">
                  Estimated 1RM Progression
                </h3>
                <span className="text-[11px] font-bold text-primary">
                  {progressionData[progressionData.length - 1].best1RM} kg peak
                </span>
              </div>

              {/* Simple Clean Responsive SVG Progression Chart */}
              <div className="h-32 w-full pt-2">
                <svg className="w-full h-full overflow-visible" viewBox="0 0 300 100" preserveAspectRatio="none">
                  <defs>
                    <linearGradient id="progGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--color-primary, #FF7A00)" stopOpacity="0.4" />
                      <stop offset="100%" stopColor="var(--color-primary, #FF7A00)" stopOpacity="0.0" />
                    </linearGradient>
                  </defs>

                  {(() => {
                    const values = progressionData.map(p => p.best1RM);
                    const min = Math.min(...values) * 0.9;
                    const max = Math.max(...values) * 1.1 || 1;
                    const range = max - min || 1;

                    const points = values.map((val, idx) => {
                      const x = (idx / (values.length - 1)) * 300;
                      const y = 90 - ((val - min) / range) * 80;
                      return { x, y, val };
                    });

                    const polylinePoints = points.map(p => `${p.x},${p.y}`).join(' ');
                    const areaPoints = `0,100 ${polylinePoints} 300,100`;

                    return (
                      <>
                        <polygon points={areaPoints} fill="url(#progGrad)" />
                        <polyline
                          points={polylinePoints}
                          fill="none"
                          stroke="var(--color-primary, #FF7A00)"
                          strokeWidth="2.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                        {points.map((p, idx) => (
                          <circle
                            key={idx}
                            cx={p.x}
                            cy={p.y}
                            r="3.5"
                            className="fill-primary stroke-black stroke-2"
                          />
                        ))}
                      </>
                    );
                  })()}
                </svg>
              </div>

              <div className="flex justify-between text-[10px] text-on-surface-variant font-medium">
                <span>{progressionData[0]?.date}</span>
                <span>{progressionData[progressionData.length - 1]?.date}</span>
              </div>
            </div>
          )}

          {exerciseHistory.length === 0 ? (
            <div className="bg-[var(--color-surface-container)] rounded-2xl p-8 border border-white/[0.04] text-center">
              <span className="material-symbols-outlined text-4xl text-on-surface-variant/40 mb-2 block">
                calendar_today
              </span>
              <p className="text-sm font-bold text-on-surface">No Workout History Yet</p>
              <p className="text-xs text-on-surface-variant mt-1">
                Log this exercise in a session to see your progress here.
              </p>
              <button
                onClick={handleStartWorkout}
                className="mt-4 px-5 py-2.5 bg-primary text-black rounded-xl text-xs font-bold uppercase tracking-wider active:scale-95"
              >
                Log Now
              </button>
            </div>
          ) : (
            <div className="space-y-2.5">
              {exerciseHistory.map((item, idx) => (
                <div
                  key={idx}
                  className="bg-[var(--color-surface-container)] rounded-2xl p-4 border border-white/[0.04] space-y-2.5"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-headline font-bold text-xs text-on-surface">{item.date}</p>
                      <p className="text-[10px] text-on-surface-variant uppercase tracking-wider">
                        {item.session.templateName}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-black text-primary">{item.best1RM} kg 1RM</p>
                      <p className="text-[10px] text-on-surface-variant">Top: {item.maxWeight} kg</p>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-1.5 pt-1 border-t border-white/[0.04]">
                    {item.sets.map((s, sIdx) => (
                      <span
                        key={sIdx}
                        className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-white/[0.03] text-on-surface border border-white/[0.04]"
                      >
                        {s.weight > 0 ? `${s.weight}kg × ` : ''}{s.reps}
                        {s.rpe ? ` @RPE${s.rpe}` : ''}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: PERSONAL RECORDS */}
      {activeTab === 'prs' && (
        <div className="space-y-3">
          {exercisePRs.length === 0 ? (
            <div className="bg-[var(--color-surface-container)] rounded-2xl p-8 border border-white/[0.04] text-center">
              <span className="material-symbols-outlined text-4xl text-on-surface-variant/40 mb-2 block">
                emoji_events
              </span>
              <p className="text-sm font-bold text-on-surface">No PRs Recorded Yet</p>
              <p className="text-xs text-on-surface-variant mt-1">
                Complete sets during active workouts to unlock personal records!
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2.5">
              {exercisePRs.map((pr, idx) => (
                <div
                  key={idx}
                  className="bg-[var(--color-surface-container)] rounded-2xl p-4 border border-white/[0.04] space-y-1 relative overflow-hidden"
                >
                  <div className="flex items-center gap-1.5 text-primary text-[10px] font-extrabold uppercase tracking-wider">
                    <span className="material-symbols-outlined text-[14px]">star</span>
                    {pr.type.replace('_', ' ')}
                  </div>
                  <p className="font-headline font-black text-xl text-on-surface tracking-tight">
                    {pr.value} {pr.type === 'volume' ? 'kg' : pr.type === 'duration' ? 's' : 'kg'}
                  </p>
                  {pr.reps && (
                    <p className="text-[10px] text-on-surface-variant">
                      for {pr.reps} reps
                    </p>
                  )}
                  <p className="text-[9px] text-on-surface-variant/60 pt-1">
                    {new Date(pr.date).toLocaleDateString()}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 4: 1RM PERCENTAGES */}
      {activeTab === 'percentages' && (
        <div className="space-y-4">
          <div className="bg-[var(--color-surface-container)] rounded-2xl p-4 border border-white/[0.04] flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-on-surface">Base 1RM Target</p>
              <p className="text-[10px] text-on-surface-variant">Adjust to recalculate all training zones</p>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={custom1RM !== '' ? custom1RM : active1RMValue}
                onChange={(e) => setCustom1RM(e.target.value)}
                className="w-24 bg-[var(--color-surface-container-high)] border border-white/[0.06] rounded-xl px-3 py-1.5 text-sm font-bold text-primary text-right outline-none focus:border-primary/50 tabular-nums"
              />
              <span className="text-xs font-bold text-on-surface-variant">kg</span>
            </div>
          </div>

          <div className="bg-[var(--color-surface-container)] rounded-2xl overflow-hidden border border-white/[0.04] divide-y divide-white/[0.04]">
            {[
              { pct: 100, reps: '1 rep', desc: 'True Max' },
              { pct: 95, reps: '~2 reps', desc: 'Heavy Double' },
              { pct: 90, reps: '~3-4 reps', desc: 'Strength Peak' },
              { pct: 85, reps: '~5-6 reps', desc: 'Power / Strength' },
              { pct: 80, reps: '~7-8 reps', desc: 'Hypertrophy Core' },
              { pct: 75, reps: '~9-10 reps', desc: 'Volume Work' },
              { pct: 70, reps: '~11-12 reps', desc: 'Hypertrophy / Pump' },
              { pct: 65, reps: '~15 reps', desc: 'Endurance Threshold' },
              { pct: 60, reps: '~18-20 reps', desc: 'Metabolic Stress' },
              { pct: 50, reps: 'Speed / Warmup', desc: 'Dynamic Warmup' },
            ].map((zone) => {
              const weight = Math.round((active1RMValue * zone.pct / 100) * 2) / 2;
              return (
                <div key={zone.pct} className="px-4 py-3 flex items-center justify-between hover:bg-white/[0.02] transition-colors">
                  <div className="flex items-center gap-3">
                    <span className="w-12 text-xs font-black text-primary font-headline">
                      {zone.pct}%
                    </span>
                    <div>
                      <p className="text-xs font-bold text-on-surface">{zone.reps}</p>
                      <p className="text-[10px] text-on-surface-variant">{zone.desc}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-extrabold text-on-surface font-headline tabular-nums">
                      {weight} <span className="text-[10px] font-normal text-on-surface-variant">kg</span>
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </main>
  );
}
