// ─────────────────────────────────────────────────────────────
// MyFitAI — Exercise Detail Page (/exercises/:id)
// Comprehensive exercise overview: instructions, video demo,
// muscle activation, PR history, and historical progression.
// Athletic Personal Operating System UI/UX
// ─────────────────────────────────────────────────────────────

import { useState, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  EXERCISE_LIBRARY,
  getExerciseGif,
  getExerciseThumbnail,
} from '../data/exerciseLibrary';
import { useWorkoutBuilder } from '../context/WorkoutBuilderContext';
import ExerciseMedia from '../components/media/ExerciseMedia';
import {
  MUSCLE_GROUP_LABELS,
  EQUIPMENT_LABELS,
  EXERCISE_TYPE_LABELS,
  BODY_PART_LABELS,
  DIFFICULTY_LABELS,
} from '../types/exercise';
import type { WorkoutSession, WorkoutExercise } from '../types/workout';
import { calculate1RM } from '../types/workout';
import {
  ArrowLeft,
  Play,
  BookOpen,
  History,
  Trophy,
  Percent,
  ListOrdered,
  Lightbulb,
  AlertTriangle,
  X,
  Calendar,
  Star,
  SearchX,
} from 'lucide-react';

export default function ExerciseDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { sessions, personalRecords, startSession } = useWorkoutBuilder();

  const [activeTab, setActiveTab] = useState<'guide' | 'history' | 'prs' | 'percentages'>('guide');
  const [custom1RM, setCustom1RM] = useState<string>('');

  // Find exercise in built-in library or custom
  const exercise = useMemo(() => {
    return EXERCISE_LIBRARY.find(
      e =>
        e.id === id ||
        e.name.toLowerCase() === id?.toLowerCase() ||
        e.name.toLowerCase().replace(/[^a-z0-9]+/g, '-') === id?.toLowerCase() ||
        e.aliases?.some(
          a =>
            a.toLowerCase() === id?.toLowerCase() ||
            a.toLowerCase().replace(/[^a-z0-9]+/g, '-') === id?.toLowerCase()
        )
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
          const best1RM = Math.max(
            ...completedSets.map(s => calculate1RM(s.weight || 0, s.reps || 0))
          );
          const vol = completedSets.reduce((sum, s) => sum + (s.weight || 0) * (s.reps || 0), 0);

          list.push({
            session,
            date: new Date(session.startedAt || session.startTime || 0).toLocaleDateString(
              undefined,
              {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              }
            ),
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
      <main className="max-w-xl mx-auto px-6 pt-16 pb-32 text-center space-y-4">
        <div className="w-16 h-16 rounded-2xl bg-[#151517] border border-[#2A2A2D] flex items-center justify-center mx-auto text-[#6B6B70]">
          <SearchX className="w-8 h-8" />
        </div>
        <div className="space-y-1">
          <h2 className="font-headline font-black text-xl text-[#F5F5F5] uppercase">
            Exercise Not Found
          </h2>
          <p className="text-xs text-[#A1A1A6]">
            The requested exercise could not be located in the library.
          </p>
        </div>
        <Link
          to="/workout/exercises"
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#30D158] text-black rounded-xl font-headline font-bold uppercase tracking-wider text-xs active:scale-95"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Library</span>
        </Link>
      </main>
    );
  }

  const gifUrl = exercise ? getExerciseGif(exercise) : '';
  const thumbnailUrl = exercise ? getExerciseThumbnail(exercise) : '';

  return (
    <main className="max-w-xl mx-auto px-4 sm:px-6 pt-6 pb-28 space-y-5 animate-in fade-in duration-200">
      {/* Top Bar Navigation */}
      <div className="flex items-center justify-between border-b border-[#2A2A2D] pb-4">
        <button
          onClick={() => navigate(-1)}
          className="w-10 h-10 rounded-xl bg-[#151517] border border-[#2A2A2D] flex items-center justify-center text-[#A1A1A6] hover:text-[#F5F5F5] active:scale-95 transition-all"
          aria-label="Back"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-2">
          <span className="px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold uppercase tracking-wider bg-[#30D158]/10 text-[#30D158] border border-[#30D158]/20">
            {EXERCISE_TYPE_LABELS[exercise.exerciseType]}
          </span>
          <span className="px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold uppercase tracking-wider bg-[#1E1E20] text-[#A1A1A6] border border-[#2A2A2D]">
            {DIFFICULTY_LABELS[exercise.difficulty]}
          </span>
        </div>
      </div>

      {/* Hero Card */}
      <div className="bg-[#151517] rounded-3xl p-5 sm:p-6 border border-[#2A2A2D] space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-[#30D158] block mb-1">
              MOVEMENT PROTOCOL
            </span>
            <h1 className="font-headline font-black text-2xl sm:text-3xl text-[#F5F5F5] uppercase tracking-tight leading-tight">
              {exercise.name}
            </h1>
            <p className="text-xs font-mono text-[#A1A1A6] mt-1">
              {BODY_PART_LABELS[exercise.bodyPart]} · {EQUIPMENT_LABELS[exercise.equipment]}
            </p>
          </div>

          <button
            onClick={handleStartWorkout}
            className="flex-shrink-0 px-4 py-3 bg-[#FF8A00] hover:bg-[#FF8A00]/90 text-black rounded-xl font-headline font-black text-xs uppercase tracking-wider flex items-center gap-1.5 shadow-[0_4px_16px_rgba(255,138,0,0.25)] active:scale-95 transition-transform"
          >
            <Play className="w-4 h-4 fill-black" />
            <span>Start</span>
          </button>
        </div>

        {/* Muscle Tags */}
        <div className="pt-3 border-t border-[#2A2A2D] flex flex-wrap gap-1.5">
          {exercise.primaryMuscles.map(m => (
            <span
              key={m}
              className="px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold uppercase tracking-wider bg-[#30D158]/15 text-[#30D158] border border-[#30D158]/30"
            >
              {MUSCLE_GROUP_LABELS[m]} (Primary)
            </span>
          ))}
          {exercise.secondaryMuscles?.map(m => (
            <span
              key={m}
              className="px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold uppercase tracking-wider bg-[#1E1E20] text-[#A1A1A6] border border-[#2A2A2D]"
            >
              {MUSCLE_GROUP_LABELS[m]} (Secondary)
            </span>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex bg-[#151517] p-1.5 rounded-2xl border border-[#2A2A2D]">
        {[
          { id: 'guide', label: 'Guide', icon: BookOpen },
          { id: 'history', label: `History (${exerciseHistory.length})`, icon: History },
          { id: 'prs', label: `PRs (${exercisePRs.length})`, icon: Trophy },
          { id: 'percentages', label: '1RM %', icon: Percent },
        ].map(tab => {
          const Icon = tab.icon;
          const isSelected = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`flex-1 py-2.5 rounded-xl font-headline font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all ${
                isSelected
                  ? 'bg-[#30D158] text-black shadow-sm font-black'
                  : 'text-[#A1A1A6] hover:text-[#F5F5F5]'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB 1: GUIDE */}
      {activeTab === 'guide' && (
        <div className="space-y-4">
          {/* Animated Demonstration Player */}
          {(gifUrl || thumbnailUrl) && (
            <div className="rounded-3xl overflow-hidden border border-[#2A2A2D] shadow-xl">
              <ExerciseMedia
                gifUrl={gifUrl}
                imageUrl={thumbnailUrl}
                exerciseName={exercise.name}
                primaryMuscle={exercise.primaryMuscles[0]}
                aspectRatio="wide"
              />
            </div>
          )}

          {/* Step-by-Step Instructions */}
          {exercise.instructions && exercise.instructions.length > 0 && (
            <div className="bg-[#151517] rounded-3xl p-5 sm:p-6 border border-[#2A2A2D] space-y-3">
              <h3 className="font-headline font-bold text-sm uppercase tracking-wider text-[#F5F5F5] flex items-center gap-2">
                <ListOrdered className="w-4 h-4 text-[#30D158]" />
                <span>Execution Steps</span>
              </h3>
              <ol className="space-y-2.5">
                {exercise.instructions.map((step, idx) => (
                  <li key={idx} className="flex items-start gap-3 text-xs leading-relaxed text-[#F5F5F5]/90">
                    <span className="flex-shrink-0 w-5 h-5 rounded-md bg-[#30D158]/15 text-[#30D158] font-mono font-bold text-[10px] flex items-center justify-center mt-0.5">
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
            <div className="bg-[#151517] rounded-3xl p-5 sm:p-6 border border-[#2A2A2D] space-y-2">
              <h3 className="font-headline font-bold text-sm uppercase tracking-wider text-[#30D158] flex items-center gap-2">
                <Lightbulb className="w-4 h-4 text-[#30D158]" />
                <span>Coaching Cues & Biomechanics</span>
              </h3>
              <p className="text-xs leading-relaxed text-[#A1A1A6]">
                {exercise.tips}
              </p>
            </div>
          )}

          {/* Safety Notes */}
          {exercise.safetyNotes && exercise.safetyNotes.length > 0 && (
            <div className="bg-[#151517] rounded-3xl p-5 sm:p-6 border border-[#2A2A2D] space-y-3">
              <h3 className="font-headline font-bold text-sm uppercase tracking-wider text-[#FF453A] flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-[#FF453A]" />
                <span>Safety & Joint Stress Warnings</span>
              </h3>
              <ul className="space-y-2">
                {exercise.safetyNotes.map((note, idx) => (
                  <li key={idx} className="flex items-start gap-2.5 text-xs leading-relaxed text-[#A1A1A6]">
                    <X className="w-3.5 h-3.5 text-[#FF453A] mt-0.5 shrink-0" />
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
            <div className="bg-[#151517] rounded-3xl p-5 sm:p-6 border border-[#2A2A2D] space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-headline font-bold text-sm uppercase tracking-wider text-[#F5F5F5]">
                  Estimated 1RM Progression
                </h3>
                <span className="text-xs font-mono font-bold text-[#30D158]">
                  {progressionData[progressionData.length - 1].best1RM} kg peak
                </span>
              </div>

              {/* Responsive SVG Progression Chart */}
              <div className="h-32 w-full pt-2">
                <svg className="w-full h-full overflow-visible" viewBox="0 0 300 100" preserveAspectRatio="none">
                  <defs>
                    <linearGradient id="progGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#30D158" stopOpacity="0.3" />
                      <stop offset="100%" stopColor="#30D158" stopOpacity="0.0" />
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
                          stroke="#30D158"
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
                            className="fill-[#30D158] stroke-black stroke-2"
                          />
                        ))}
                      </>
                    );
                  })()}
                </svg>
              </div>

              <div className="flex justify-between text-[10px] font-mono text-[#6B6B70]">
                <span>{progressionData[0]?.date}</span>
                <span>{progressionData[progressionData.length - 1]?.date}</span>
              </div>
            </div>
          )}

          {exerciseHistory.length === 0 ? (
            <div className="bg-[#151517] rounded-3xl p-8 border border-[#2A2A2D] text-center space-y-2">
              <Calendar className="w-8 h-8 text-[#6B6B70] mx-auto" />
              <p className="text-sm font-bold text-[#F5F5F5]">No Workout History Yet</p>
              <p className="text-xs text-[#A1A1A6]">
                Log this movement in an active workout to trace load and 1RM progression.
              </p>
              <button
                onClick={handleStartWorkout}
                className="mt-3 px-5 py-2.5 bg-[#FF8A00] text-black rounded-xl text-xs font-headline font-bold uppercase tracking-wider active:scale-95 shadow-sm"
              >
                Log Now
              </button>
            </div>
          ) : (
            <div className="space-y-2.5">
              {exerciseHistory.map((item, idx) => (
                <div
                  key={idx}
                  className="bg-[#151517] rounded-2xl p-4 border border-[#2A2A2D] space-y-2.5"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-headline font-bold text-xs text-[#F5F5F5]">{item.date}</p>
                      <p className="text-[10px] font-mono text-[#A1A1A6] uppercase tracking-wider">
                        {item.session.templateName}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-mono font-black text-[#30D158]">
                        {item.best1RM} kg 1RM
                      </p>
                      <p className="text-[10px] font-mono text-[#A1A1A6]">Top: {item.maxWeight} kg</p>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-1.5 pt-2 border-t border-[#2A2A2D]">
                    {item.sets.map((s, sIdx) => (
                      <span
                        key={sIdx}
                        className="px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold bg-[#1E1E20] text-[#F5F5F5] border border-[#2A2A2D]"
                      >
                        {s.weight > 0 ? `${s.weight}kg × ` : ''}
                        {s.reps}
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
            <div className="bg-[#151517] rounded-3xl p-8 border border-[#2A2A2D] text-center space-y-2">
              <Trophy className="w-8 h-8 text-[#6B6B70] mx-auto" />
              <p className="text-sm font-bold text-[#F5F5F5]">No PRs Recorded Yet</p>
              <p className="text-xs text-[#A1A1A6]">
                Complete working sets during active workouts to trigger personal record detections!
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2.5">
              {exercisePRs.map((pr, idx) => (
                <div
                  key={idx}
                  className="bg-[#151517] rounded-2xl p-4 border border-[#2A2A2D] space-y-1 relative overflow-hidden"
                >
                  <div className="flex items-center gap-1.5 text-[#30D158] text-[10px] font-mono font-bold uppercase tracking-wider">
                    <Star className="w-3.5 h-3.5 fill-[#30D158]" />
                    {pr.type.replace('_', ' ')}
                  </div>
                  <p className="font-headline font-black text-xl text-[#F5F5F5] font-mono tracking-tight tabular-nums">
                    {pr.value} {pr.type === 'volume' ? 'kg' : pr.type === 'duration' ? 's' : 'kg'}
                  </p>
                  {pr.reps && (
                    <p className="text-[10px] font-mono text-[#A1A1A6]">
                      for {pr.reps} reps
                    </p>
                  )}
                  <p className="text-[9px] font-mono text-[#6B6B70] pt-1">
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
          <div className="bg-[#151517] rounded-2xl p-4 border border-[#2A2A2D] flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-[#F5F5F5]">Base 1RM Target</p>
              <p className="text-[10px] font-mono text-[#A1A1A6]">
                Adjust to recalculate percentage loading zones
              </p>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={custom1RM !== '' ? custom1RM : active1RMValue}
                onChange={e => setCustom1RM(e.target.value)}
                className="w-24 bg-[#1E1E20] border border-[#2A2A2D] rounded-xl px-3 py-1.5 text-sm font-mono font-bold text-[#30D158] text-right outline-none focus:border-[#30D158] tabular-nums"
              />
              <span className="text-xs font-mono font-bold text-[#A1A1A6]">kg</span>
            </div>
          </div>

          <div className="bg-[#151517] rounded-3xl overflow-hidden border border-[#2A2A2D] divide-y divide-[#2A2A2D]">
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
              { pct: 50, reps: 'Dynamic Warmup', desc: 'Movement Prep' },
            ].map(zone => {
              const weight = Math.round(((active1RMValue * zone.pct) / 100) * 2) / 2;
              return (
                <div
                  key={zone.pct}
                  className="px-4 py-3 flex items-center justify-between hover:bg-[#1E1E20] transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="w-12 text-xs font-black text-[#30D158] font-mono tabular-nums">
                      {zone.pct}%
                    </span>
                    <div>
                      <p className="text-xs font-bold text-[#F5F5F5]">{zone.reps}</p>
                      <p className="text-[10px] font-mono text-[#A1A1A6]">{zone.desc}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-headline font-black text-[#F5F5F5] font-mono tabular-nums">
                      {weight} <span className="text-[10px] font-normal text-[#A1A1A6]">kg</span>
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
