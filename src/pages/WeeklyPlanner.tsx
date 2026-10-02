// ─────────────────────────────────────────────────────────────
// MyFitAI — Weekly Workout Planner & Routine Manager
// Schedule workout templates across Mon-Sun, manage routines,
// view weekly muscle frequency, and handle schedule overrides.
// ─────────────────────────────────────────────────────────────

import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useWorkoutBuilder } from '../context/WorkoutBuilderContext';
import type { Routine, RoutineDay } from '../types/workout';
import { MUSCLE_GROUP_LABELS } from '../types/exercise';
import type { MuscleGroup } from '../types/exercise';
import MuscleHeatmap from '../components/MuscleHeatmap';

const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'] as const;
const DAY_SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const;

export default function WeeklyPlanner() {
  const {
    routines,
    activeRoutine,
    templates,
    saveRoutine,
    setActiveRoutine,
    addScheduleOverride,
  } = useWorkoutBuilder();

  const [selectedDayIdx, setSelectedDayIdx] = useState<number>(() => {
    // 0 = Mon, 6 = Sun
    const day = new Date().getDay();
    return day === 0 ? 6 : day - 1;
  });

  const [showRoutineModal, setShowRoutineModal] = useState(false);
  const [assignDayPicker, setAssignDayPicker] = useState<number | null>(null);

  // Today's index
  const todayIdx = useMemo(() => {
    const day = new Date().getDay();
    return day === 0 ? 6 : day - 1;
  }, []);

  // Today's date ISO (YYYY-MM-DD)
  const todayDateStr = useMemo(() => new Date().toISOString().split('T')[0], []);

  // Calculate weekly muscle volume and coverage
  const weeklyMuscleCoverage = useMemo(() => {
    if (!activeRoutine) return { targetMuscles: [] as MuscleGroup[], setCounts: {} as Record<string, number> };

    const musclesSet = new Set<MuscleGroup>();
    const setCounts: Record<string, number> = {};

    activeRoutine.days.forEach(day => {
      if (day.isRest || !day.templateId) return;
      const t = templates.find(template => template.id === day.templateId);
      if (!t) return;

      t.exercises.forEach(ex => {
        (ex.primaryMuscles || []).forEach(m => {
          musclesSet.add(m);
          setCounts[m] = (setCounts[m] || 0) + ex.sets.length;
        });
      });
    });

    return {
      targetMuscles: Array.from(musclesSet),
      setCounts,
    };
  }, [activeRoutine, templates]);

  // Handle assigning a template to a specific routine day
  const handleAssignTemplate = async (dayIdx: number, templateId: string | null, isRest = false) => {
    if (!activeRoutine) return;
    const updatedDays: RoutineDay[] = activeRoutine.days.map(d => {
      if (d.dayOfWeek === dayIdx) {
        const foundT = templateId ? templates.find(t => t.id === templateId) : undefined;
        return {
          ...d,
          isRest,
          templateId: isRest ? undefined : (templateId || undefined),
          templateName: isRest ? undefined : foundT?.name,
          label: isRest ? 'Rest Day' : foundT?.name || 'Custom',
        };
      }
      return d;
    });

    const updated: Routine = {
      ...activeRoutine,
      days: updatedDays,
      updatedAt: new Date().toISOString(),
    };

    await saveRoutine(updated);
    setAssignDayPicker(null);
  };

  // Quick action: reschedule today's workout
  const handleRescheduleToday = async (action: 'rest' | 'swap_tomorrow') => {
    if (action === 'rest') {
      await addScheduleOverride({
        id: crypto.randomUUID(),
        date: todayDateStr,
        originalDayOfWeek: todayIdx,
        isSkipped: true,
        createdAt: new Date().toISOString(),
      });
    } else if (action === 'swap_tomorrow') {
      // Find today's template and move to tomorrow
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowStr = tomorrow.toISOString().split('T')[0];

      const todayPlanned = activeRoutine?.days.find(d => d.dayOfWeek === todayIdx);
      if (todayPlanned && todayPlanned.templateId) {
        await addScheduleOverride({
          id: crypto.randomUUID(),
          date: todayDateStr,
          originalDayOfWeek: todayIdx,
          isSkipped: true,
          createdAt: new Date().toISOString(),
        });
        await addScheduleOverride({
          id: crypto.randomUUID(),
          date: tomorrowStr,
          originalDayOfWeek: (todayIdx + 1) % 7,
          newTemplateId: todayPlanned.templateId,
          newTemplateLabel: todayPlanned.templateName || todayPlanned.label,
          isSkipped: false,
          createdAt: new Date().toISOString(),
        });
      }
    }
  };

  // Create standard routine preset
  const handleCreatePreset = async (presetType: 'ppl' | 'upper_lower' | 'full_body') => {
    let newRoutine: Routine;
    const now = new Date().toISOString();

    if (presetType === 'ppl') {
      newRoutine = {
        id: crypto.randomUUID(),
        name: 'Push Pull Legs (6-Day)',
        description: 'Classic high frequency hypertrophy split: Push, Pull, Legs, Push, Pull, Legs, Rest',
        days: [
          { dayOfWeek: 0, label: 'Push (Chest & Triceps)', isRest: false },
          { dayOfWeek: 1, label: 'Pull (Back & Biceps)', isRest: false },
          { dayOfWeek: 2, label: 'Legs & Core', isRest: false },
          { dayOfWeek: 3, label: 'Push (Hypertrophy)', isRest: false },
          { dayOfWeek: 4, label: 'Pull (Hypertrophy)', isRest: false },
          { dayOfWeek: 5, label: 'Legs & Shoulders', isRest: false },
          { dayOfWeek: 6, label: 'Rest & Recovery', isRest: true },
        ],
        isActive: true,
        createdAt: now,
        updatedAt: now,
      };
    } else if (presetType === 'upper_lower') {
      newRoutine = {
        id: crypto.randomUUID(),
        name: 'Upper / Lower (4-Day)',
        description: 'Balanced strength and muscle split with dedicated recovery days',
        days: [
          { dayOfWeek: 0, label: 'Upper Body A', isRest: false },
          { dayOfWeek: 1, label: 'Lower Body A', isRest: false },
          { dayOfWeek: 2, label: 'Rest & Mobility', isRest: true },
          { dayOfWeek: 3, label: 'Upper Body B', isRest: false },
          { dayOfWeek: 4, label: 'Lower Body B', isRest: false },
          { dayOfWeek: 5, label: 'Active Recovery', isRest: true },
          { dayOfWeek: 6, label: 'Full Rest', isRest: true },
        ],
        isActive: true,
        createdAt: now,
        updatedAt: now,
      };
    } else {
      newRoutine = {
        id: crypto.randomUUID(),
        name: 'Full Body (3-Day)',
        description: 'Complete full body sessions alternating with rest days',
        days: [
          { dayOfWeek: 0, label: 'Full Body A', isRest: false },
          { dayOfWeek: 1, label: 'Rest', isRest: true },
          { dayOfWeek: 2, label: 'Full Body B', isRest: false },
          { dayOfWeek: 3, label: 'Rest', isRest: true },
          { dayOfWeek: 4, label: 'Full Body C', isRest: false },
          { dayOfWeek: 5, label: 'Active Recovery', isRest: true },
          { dayOfWeek: 6, label: 'Full Rest', isRest: true },
        ],
        isActive: true,
        createdAt: now,
        updatedAt: now,
      };
    }

    await saveRoutine(newRoutine);
    await setActiveRoutine(newRoutine.id);
    setShowRoutineModal(false);
  };

  const selectedDayPlan = activeRoutine?.days.find(d => d.dayOfWeek === selectedDayIdx);
  const selectedTemplate = selectedDayPlan?.templateId
    ? templates.find(t => t.id === selectedDayPlan.templateId)
    : null;

  return (
    <main className="max-w-md mx-auto px-4 pt-4 pb-32 space-y-5 animate-card-enter">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-headline font-black text-2xl text-on-surface tracking-tight">
            Weekly Planner
          </h1>
          <p className="text-xs text-on-surface-variant font-medium">
            Program your schedule & muscle distribution
          </p>
        </div>
        <button
          onClick={() => setShowRoutineModal(true)}
          className="px-3.5 py-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-on-surface text-xs font-bold flex items-center gap-1.5 active:scale-95 transition-all border border-white/[0.06]"
        >
          <span className="material-symbols-outlined text-[16px]">tune</span>
          Routines ({routines.length})
        </button>
      </div>

      {/* Active Routine Info Card */}
      <div className="bg-[var(--color-surface-container)] rounded-3xl p-5 border border-white/[0.04] space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <span className="material-symbols-outlined text-[18px]">calendar_month</span>
            </div>
            <div>
              <p className="text-[10px] text-on-surface-variant uppercase font-bold tracking-widest">
                Active Routine
              </p>
              <h2 className="font-headline font-extrabold text-base text-on-surface">
                {activeRoutine?.name || 'No Routine Selected'}
              </h2>
            </div>
          </div>

          <button
            onClick={() => setShowRoutineModal(true)}
            className="text-xs font-bold text-primary hover:underline"
          >
            Change
          </button>
        </div>

        {/* 7-Day Week Scroller */}
        <div className="grid grid-cols-7 gap-1.5 pt-2">
          {DAY_SHORT.map((short, idx) => {
            const isToday = idx === todayIdx;
            const isSelected = idx === selectedDayIdx;
            const dayPlan = activeRoutine?.days.find(d => d.dayOfWeek === idx);
            const isRest = dayPlan?.isRest ?? true;
            const hasTemplate = !!dayPlan?.templateId;

            return (
              <button
                key={short}
                onClick={() => setSelectedDayIdx(idx)}
                className={`py-3 px-1 rounded-2xl flex flex-col items-center gap-1.5 transition-all active:scale-95 ${
                  isSelected
                    ? 'bg-primary text-black font-black shadow-lg shadow-primary/20 ring-2 ring-primary/40'
                    : isToday
                    ? 'bg-primary/10 text-primary border border-primary/30'
                    : 'bg-white/[0.02] text-on-surface hover:bg-white/[0.06]'
                }`}
              >
                <span className={`text-[10px] uppercase font-extrabold tracking-wider ${isSelected ? 'text-black/80' : 'text-on-surface-variant'}`}>
                  {short}
                </span>
                <span className="text-sm font-black">
                  {idx + 1}
                </span>
                <div
                  className={`w-2 h-2 rounded-full ${
                    isRest
                      ? isSelected ? 'bg-black/30' : 'bg-white/10'
                      : isSelected ? 'bg-black' : hasTemplate ? 'bg-primary' : 'bg-primary/50'
                  }`}
                />
              </button>
            );
          })}
        </div>
      </div>

      {/* Selected Day Overview */}
      <div className="bg-[var(--color-surface-container)] rounded-3xl p-5 border border-white/[0.04] space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-headline font-black text-lg text-on-surface">
                {DAY_NAMES[selectedDayIdx]}
              </h3>
              {selectedDayIdx === todayIdx && (
                <span className="px-2 py-0.5 rounded-full bg-primary text-black font-extrabold text-[9px] uppercase tracking-wider">
                  Today
                </span>
              )}
            </div>
            <p className="text-xs text-on-surface-variant mt-0.5">
              {selectedDayPlan?.isRest ? 'Scheduled Rest Day' : selectedDayPlan?.label || 'Workout Day'}
            </p>
          </div>

          <button
            onClick={() => setAssignDayPicker(selectedDayIdx)}
            className="px-3 py-1.5 rounded-xl bg-white/[0.04] text-on-surface text-xs font-bold hover:bg-white/[0.08] active:scale-95 border border-white/[0.06]"
          >
            Edit Day
          </button>
        </div>

        {/* Workout or Rest Card */}
        {selectedDayPlan?.isRest ? (
          <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/[0.04] text-center space-y-2">
            <span className="material-symbols-outlined text-3xl text-on-surface-variant/40">self_improvement</span>
            <p className="font-headline font-bold text-sm text-on-surface">Rest & Recovery</p>
            <p className="text-xs text-on-surface-variant max-w-xs mx-auto">
              Your muscles repair and grow stronger during rest. Stay hydrated and prioritize sleep.
            </p>
          </div>
        ) : selectedTemplate ? (
          <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/[0.06] space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-headline font-bold text-base text-on-surface">
                  {selectedTemplate.name}
                </p>
                <p className="text-xs text-on-surface-variant">
                  {selectedTemplate.exercises.length} exercises · ~{selectedTemplate.estimatedDuration || 45} mins
                </p>
              </div>

              <Link
                to={`/workout/active?templateId=${selectedTemplate.id}`}
                className="px-4 py-2 bg-primary text-black rounded-xl font-headline font-bold text-xs uppercase tracking-wider active:scale-95 transition-transform"
              >
                Start
              </Link>
            </div>

            {/* Exercise preview pills */}
            <div className="space-y-1.5 pt-2 border-t border-white/[0.04]">
              {selectedTemplate.exercises.slice(0, 4).map((ex, i) => (
                <div key={i} className="flex items-center justify-between text-xs py-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm">{ex.thumbnailEmoji || '🏋️'}</span>
                    <span className="font-semibold text-on-surface truncate max-w-[200px]">{ex.exerciseName}</span>
                  </div>
                  <span className="text-on-surface-variant font-mono text-[11px]">{ex.sets.length} sets</span>
                </div>
              ))}
              {selectedTemplate.exercises.length > 4 && (
                <p className="text-[10px] text-on-surface-variant pt-1 text-center">
                  +{selectedTemplate.exercises.length - 4} more exercises
                </p>
              )}
            </div>
          </div>
        ) : (
          <div className="p-6 rounded-2xl bg-white/[0.02] border border-dashed border-white/[0.08] text-center space-y-2">
            <span className="material-symbols-outlined text-3xl text-on-surface-variant/40">fitness_center</span>
            <p className="font-headline font-bold text-sm text-on-surface">No Template Assigned</p>
            <p className="text-xs text-on-surface-variant">
              Choose a workout template to attach to this day.
            </p>
            <button
              onClick={() => setAssignDayPicker(selectedDayIdx)}
              className="mt-2 px-4 py-2 bg-primary/10 text-primary border border-primary/20 rounded-xl text-xs font-bold uppercase tracking-wider active:scale-95"
            >
              Assign Template
            </button>
          </div>
        )}

        {/* Today's Reschedule Controls */}
        {selectedDayIdx === todayIdx && (
          <div className="pt-3 border-t border-white/[0.04] flex gap-2">
            <button
              onClick={() => handleRescheduleToday('rest')}
              className="flex-1 py-2.5 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] text-on-surface-variant hover:text-on-surface text-xs font-bold border border-white/[0.04] active:scale-95"
            >
              Take Rest Today
            </button>
            <button
              onClick={() => handleRescheduleToday('swap_tomorrow')}
              className="flex-1 py-2.5 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] text-on-surface-variant hover:text-on-surface text-xs font-bold border border-white/[0.04] active:scale-95"
            >
              Move to Tomorrow
            </button>
          </div>
        )}
      </div>

      {/* Weekly Muscle Coverage Heatmap */}
      <div className="bg-[var(--color-surface-container)] rounded-3xl p-5 border border-white/[0.04] space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-headline font-extrabold text-sm uppercase tracking-wider text-on-surface">
              Weekly Muscle Coverage
            </h3>
            <p className="text-xs text-on-surface-variant">
              Total volume across all scheduled workouts
            </p>
          </div>
          <span className="text-xs font-mono font-bold text-primary">
            {weeklyMuscleCoverage.targetMuscles.length} Muscle Groups
          </span>
        </div>

        {/* Heatmap visualization */}
        <div className="py-2 flex justify-center">
          <MuscleHeatmap
            muscles={weeklyMuscleCoverage.targetMuscles}
            muscleVolumes={weeklyMuscleCoverage.setCounts}
            mode="volume"
            size={130}
            showControls={true}
          />
        </div>

        {/* Set breakdown table with volume tier indicators */}
        <div className="space-y-2 pt-2 border-t border-white/[0.04]">
          <div className="grid grid-cols-2 gap-2">
            {weeklyMuscleCoverage.targetMuscles.map(m => {
              const sets = weeklyMuscleCoverage.setCounts[m] || 0;
              const isOptimal = sets >= 10 && sets <= 20;
              const isHigh = sets > 20;
              const statusLabel = isHigh ? 'High Vol' : isOptimal ? 'Optimal' : 'Low / Maint';
              const badgeClass = isHigh
                ? 'text-[#FBBF24] bg-[#FBBF24]/10 border-[#FBBF24]/20'
                : isOptimal
                ? 'text-[#6FFB85] bg-[#6FFB85]/10 border-[#6FFB85]/20'
                : 'text-on-surface-variant bg-white/[0.04] border-white/[0.06]';

              const progressPct = Math.min(100, Math.round((sets / 20) * 100));

              return (
                <div key={m} className="p-3 rounded-2xl bg-white/[0.02] border border-white/[0.04] space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-on-surface truncate">{MUSCLE_GROUP_LABELS[m]}</span>
                    <span className={`text-[8px] font-extrabold uppercase px-1.5 py-0.5 rounded-full border ${badgeClass} flex-shrink-0 ml-1`}>
                      {statusLabel}
                    </span>
                  </div>
                  <div className="flex items-baseline justify-between">
                    <span className="text-xs font-mono font-black text-primary">
                      {sets} sets
                    </span>
                    <span className="text-[9px] text-on-surface-variant">10-20 target</span>
                  </div>
                  {/* Visual volume progress bar */}
                  <div className="w-full h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        isHigh ? 'bg-[#FBBF24]' : isOptimal ? 'bg-[#6FFB85]' : 'bg-primary'
                      }`}
                      style={{ width: `${progressPct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* MODAL: ASSIGN TEMPLATE TO DAY */}
      {assignDayPicker !== null && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setAssignDayPicker(null)} />
          <div className="relative bg-[var(--color-surface)] rounded-3xl p-6 w-full max-w-sm border border-white/[0.08] shadow-2xl space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-headline font-black text-lg text-on-surface">
                  Program {DAY_NAMES[assignDayPicker]}
                </h3>
                <p className="text-xs text-on-surface-variant">Select a workout template or set as rest day</p>
              </div>
              <button
                onClick={() => setAssignDayPicker(null)}
                className="w-8 h-8 rounded-full bg-white/[0.04] flex items-center justify-center text-on-surface"
              >
                <span className="material-symbols-outlined text-sm">close</span>
              </button>
            </div>

            {/* Rest Day Button */}
            <button
              onClick={() => handleAssignTemplate(assignDayPicker, null, true)}
              className="w-full py-3.5 px-4 rounded-2xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.06] text-left flex items-center justify-between active:scale-95 transition-all"
            >
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-primary">bed</span>
                <div>
                  <p className="font-bold text-sm text-on-surface">Rest Day</p>
                  <p className="text-[10px] text-on-surface-variant">Recovery & restoration</p>
                </div>
              </div>
              <span className="material-symbols-outlined text-on-surface-variant text-sm">chevron_right</span>
            </button>

            {/* Template options */}
            <div className="space-y-2 pt-2">
              <p className="text-[10px] font-extrabold uppercase tracking-widest text-on-surface-variant">
                Your Templates
              </p>
              {templates.length === 0 ? (
                <p className="text-xs text-on-surface-variant py-4 text-center">
                  No templates created yet. Create one in the Template Editor.
                </p>
              ) : (
                templates.map(t => (
                  <button
                    key={t.id}
                    onClick={() => handleAssignTemplate(assignDayPicker, t.id, false)}
                    className="w-full py-3 px-4 rounded-2xl bg-white/[0.02] hover:bg-white/[0.06] border border-white/[0.04] text-left flex items-center justify-between active:scale-95 transition-all"
                  >
                    <div>
                      <p className="font-bold text-sm text-on-surface">{t.name}</p>
                      <p className="text-[10px] text-on-surface-variant">
                        {t.exercises.length} exercises · ~{t.estimatedDuration || 45}m
                      </p>
                    </div>
                    <span className="material-symbols-outlined text-on-surface-variant text-sm">add</span>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL: ROUTINES MANAGER */}
      {showRoutineModal && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setShowRoutineModal(false)} />
          <div className="relative bg-[var(--color-surface)] rounded-3xl p-6 w-full max-w-sm border border-white/[0.08] shadow-2xl space-y-5 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-headline font-black text-lg text-on-surface">Manage Routines</h3>
                <p className="text-xs text-on-surface-variant">Select or create weekly splits</p>
              </div>
              <button
                onClick={() => setShowRoutineModal(false)}
                className="w-8 h-8 rounded-full bg-white/[0.04] flex items-center justify-center text-on-surface"
              >
                <span className="material-symbols-outlined text-sm">close</span>
              </button>
            </div>

            {/* List of current routines */}
            <div className="space-y-2">
              {routines.map(r => (
                <div
                  key={r.id}
                  className={`p-4 rounded-2xl border transition-all ${
                    activeRoutine?.id === r.id
                      ? 'bg-primary/10 border-primary/40'
                      : 'bg-white/[0.02] border-white/[0.04]'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-headline font-extrabold text-sm text-on-surface">{r.name}</p>
                        {activeRoutine?.id === r.id && (
                          <span className="px-2 py-0.5 rounded-full bg-primary text-black text-[9px] font-black uppercase">
                            Active
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-on-surface-variant mt-0.5">{r.description}</p>
                    </div>

                    {activeRoutine?.id !== r.id && (
                      <button
                        onClick={async () => {
                          await setActiveRoutine(r.id);
                          setShowRoutineModal(false);
                        }}
                        className="px-3 py-1.5 rounded-xl bg-primary text-black font-bold text-xs uppercase tracking-wider active:scale-95"
                      >
                        Activate
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Standard Presets Section */}
            <div className="pt-2 border-t border-white/[0.04] space-y-2">
              <p className="text-[10px] font-extrabold uppercase tracking-widest text-on-surface-variant">
                Quick Start Presets
              </p>
              <div className="grid grid-cols-1 gap-2">
                <button
                  onClick={() => handleCreatePreset('ppl')}
                  className="p-3 rounded-2xl bg-white/[0.02] hover:bg-white/[0.05] border border-white/[0.04] text-left active:scale-95"
                >
                  <p className="font-bold text-xs text-on-surface">Push / Pull / Legs (6-Day Split)</p>
                  <p className="text-[10px] text-on-surface-variant">High frequency hypertrophy program</p>
                </button>
                <button
                  onClick={() => handleCreatePreset('upper_lower')}
                  className="p-3 rounded-2xl bg-white/[0.02] hover:bg-white/[0.05] border border-white/[0.04] text-left active:scale-95"
                >
                  <p className="font-bold text-xs text-on-surface">Upper / Lower (4-Day Split)</p>
                  <p className="text-[10px] text-on-surface-variant">Optimal strength & recovery balance</p>
                </button>
                <button
                  onClick={() => handleCreatePreset('full_body')}
                  className="p-3 rounded-2xl bg-white/[0.02] hover:bg-white/[0.05] border border-white/[0.04] text-left active:scale-95"
                >
                  <p className="font-bold text-xs text-on-surface">Full Body (3-Day Split)</p>
                  <p className="text-[10px] text-on-surface-variant">Maximum efficiency for busy schedules</p>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
