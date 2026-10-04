// ─────────────────────────────────────────────────────────────
// MyFitAI — Muscle Inspection Drawer / Modal
// Displays granular anatomical analysis, recovery status, hypertrophy
// volume landmarks (MEV/MAV/MRV), contributing logged exercises,
// and exercise recommendations for the selected muscle.
// ─────────────────────────────────────────────────────────────

import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ANATOMICAL_MUSCLES,
  type MuscleTrainingMetric,
} from '../../types/anatomicalMuscle';
import { EXERCISES_DATA } from '../../data/exercisesData';

export interface MuscleInspectionDrawerProps {
  muscleId: string | null;
  metric?: MuscleTrainingMetric;
  onClose: () => void;
}

export default function MuscleInspectionDrawer({
  muscleId,
  metric,
  onClose,
}: MuscleInspectionDrawerProps) {
  const navigate = useNavigate();
  if (!muscleId) return null;

  const info = ANATOMICAL_MUSCLES[muscleId];
  if (!info) return null;

  // Curate recommended exercises targeting this muscle group
  const recommendedExercises = useMemo(() => {
    const list = EXERCISES_DATA.filter(
      ex =>
        ex.primaryMuscles.includes(info.canonicalGroup) ||
        (info.canonicalGroup === 'traps' && ex.primaryMuscles.includes('shoulders'))
    );
    return list.slice(0, 4);
  }, [info.canonicalGroup]);

  // Recovery status formatting
  const recoveryPct = metric?.recoveryPercentage ?? 100;
  const isTrained = metric && (metric.primarySets > 0 || metric.synergistSets > 0);
  const hoursAgo = metric?.hoursSinceLastTrained;
  const hoursToFull =
    isTrained && recoveryPct < 100 && hoursAgo !== null && hoursAgo !== undefined
      ? Math.max(0, Math.round(info.typicalRecoveryHours - hoursAgo))
      : 0;

  let recoveryBadge = {
    label: 'Fresh & Primed',
    color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
    iconName: 'check_circle',
  };
  if (isTrained && recoveryPct < 55) {
    recoveryBadge = {
      label: 'Fatigued — Recovery Ongoing',
      color: 'text-rose-400 bg-rose-500/10 border-rose-500/30',
      iconName: 'warning',
    };
  } else if (isTrained && recoveryPct < 90) {
    recoveryBadge = {
      label: 'Recovering Adaptively',
      color: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
      iconName: 'battery_charging_full',
    };
  }

  // Volume Landmark Calculations
  const sets = metric?.effectiveSets ?? 0;
  const mev = info.minEffectiveVolume;
  const mav = info.maxAdaptiveVolume;
  const mrv = info.maxRecoverableVolume;

  let volumeStatusText = 'Under MEV — Maintenance level stimulus';
  let volumeColor = 'text-sky-400';
  if (sets >= mrv) {
    volumeStatusText = 'MRV Exceeded — Fatigue accumulation high; deload recommended';
    volumeColor = 'text-rose-400 font-semibold';
  } else if (sets >= mav) {
    volumeStatusText = 'High Adaptive Stimulus — Near upper threshold';
    volumeColor = 'text-amber-400 font-semibold';
  } else if (sets >= mev) {
    volumeStatusText = 'Optimal MAV — Maximum hypertrophy sweet spot';
    volumeColor = 'text-emerald-400 font-semibold';
  }

  const mevPct = Math.min(100, Math.round((mev / mrv) * 100));
  const mavPct = Math.min(100, Math.round((mav / mrv) * 100));
  const currentSetsPct = Math.min(100, Math.round((sets / (mrv * 1.15)) * 100));

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[120] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200"
      onClick={e => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-surface-container-high border border-outline-variant/30 rounded-t-3xl sm:rounded-2xl w-full max-w-xl max-h-[88vh] overflow-y-auto shadow-2xl flex flex-col">
        {/* Sticky Header */}
        <div className="sticky top-0 bg-surface-container-high/95 backdrop-blur-md px-6 py-4 border-b border-outline-variant/20 flex items-center justify-between z-10">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs uppercase font-mono tracking-widest text-primary font-semibold px-2 py-0.5 rounded-full bg-primary/10 border border-primary/20">
                {info.region}
              </span>
              <span className="text-xs font-mono text-on-surface-variant capitalize">
                {info.view} aspect
              </span>
            </div>
            <h3 className="text-xl font-bold text-on-surface tracking-tight mt-1">
              {info.commonName}
            </h3>
            <p className="text-xs text-on-surface-variant italic">
              {info.anatomicalName}
            </p>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-surface-container-highest text-on-surface-variant hover:text-on-surface transition-colors"
            title="Close"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-6">
          {/* Recovery & Load Summary Cards */}
          <div className="grid grid-cols-2 gap-3">
            {/* Stimulus / Role Card */}
            <div className="p-3.5 rounded-xl bg-surface-container border border-outline-variant/30 flex flex-col justify-between">
              <div className="flex items-center justify-between text-xs text-on-surface-variant">
                <span>Training Stimulus</span>
                <span className="material-symbols-outlined text-primary text-[18px]">bolt</span>
              </div>
              <div className="mt-2">
                <span className="text-2xl font-bold text-on-surface">
                  {metric?.effectiveSets.toFixed(1) ?? '0.0'}
                </span>
                <span className="text-xs text-on-surface-variant ml-1 font-mono">
                  eff sets
                </span>
              </div>
              <div className="mt-2 text-xs">
                {metric?.targetRole === 'primary' ? (
                  <span className="text-primary font-semibold flex items-center gap-1">
                    ● Primary Target
                  </span>
                ) : metric?.targetRole === 'synergist' ? (
                  <span className="text-sky-400 font-semibold flex items-center gap-1">
                    ● Synergist Stimulus
                  </span>
                ) : (
                  <span className="text-on-surface-variant">Untrained</span>
                )}
                {metric && metric.volumeLoadKg > 0 && (
                  <span className="text-[11px] text-on-surface-variant block mt-0.5 font-mono">
                    {metric.volumeLoadKg.toLocaleString()} kg total load
                  </span>
                )}
              </div>
            </div>

            {/* Recovery Status Card */}
            <div className="p-3.5 rounded-xl bg-surface-container border border-outline-variant/30 flex flex-col justify-between">
              <div className="flex items-center justify-between text-xs text-on-surface-variant">
                <span>Recovery Estimate</span>
                <span className="material-symbols-outlined text-emerald-400 text-[18px]">
                  {recoveryBadge.iconName}
                </span>
              </div>
              <div className="mt-2 flex items-baseline gap-1">
                <span className="text-2xl font-bold text-on-surface">
                  {recoveryPct}%
                </span>
                <span className="text-[10px] text-on-surface-variant uppercase font-mono">
                  ready
                </span>
              </div>
              <div className="mt-2">
                <span
                  className={`text-[11px] px-2 py-0.5 rounded-full border inline-block ${recoveryBadge.color}`}
                >
                  {recoveryBadge.label}
                </span>
                {hoursToFull > 0 && (
                  <span className="text-[10px] text-on-surface-variant block mt-1 flex items-center gap-1">
                    <span className="material-symbols-outlined text-[12px] inline">schedule</span>
                    ~{hoursToFull}h to full recovery
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Hypertrophy Volume Landmarks (MEV / MAV / MRV) */}
          <div className="p-4 rounded-xl bg-surface-container border border-outline-variant/30 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span className="material-symbols-outlined text-primary text-[18px]">
                  trending_up
                </span>
                <h4 className="text-xs font-semibold uppercase tracking-wider text-on-surface">
                  Hypertrophy Volume Landmarks
                </h4>
              </div>
              <span className={`text-xs ${volumeColor}`}>
                {sets} / {mav} sets
              </span>
            </div>

            {/* Landmark Graphic Bar */}
            <div className="relative pt-4 pb-2">
              <div className="h-2.5 w-full bg-surface-container-highest rounded-full overflow-hidden relative">
                {/* MEV Marker zone */}
                <div
                  className="absolute top-0 bottom-0 left-0 bg-sky-500/20"
                  style={{ width: `${mevPct}%` }}
                  title="Maintenance & MEV"
                />
                {/* MAV Sweet spot */}
                <div
                  className="absolute top-0 bottom-0 bg-emerald-500/25"
                  style={{ left: `${mevPct}%`, width: `${mavPct - mevPct}%` }}
                  title="Optimal MAV range"
                />
                {/* Progress bar */}
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    sets >= mrv
                      ? 'bg-rose-500'
                      : sets >= mav
                      ? 'bg-amber-500'
                      : sets >= mev
                      ? 'bg-emerald-500'
                      : 'bg-sky-400'
                  }`}
                  style={{ width: `${currentSetsPct}%` }}
                />
              </div>

              {/* Landmark Tick Labels */}
              <div className="flex justify-between text-[10px] font-mono text-on-surface-variant mt-2">
                <span>0 sets</span>
                <span style={{ left: `${mevPct}%` }}>MEV: {mev}</span>
                <span style={{ left: `${mavPct}%` }}>MAV: {mav}</span>
                <span>MRV: {mrv}+</span>
              </div>
            </div>

            <p className="text-xs text-on-surface-variant leading-relaxed">
              {volumeStatusText}
            </p>
          </div>

          {/* Biomechanical Function Description */}
          <div className="p-4 rounded-xl bg-surface-container/60 border border-outline-variant/20">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant flex items-center gap-1.5">
              <span className="material-symbols-outlined text-primary text-[16px]">
                accessibility_new
              </span>
              Anatomical Function & Biomechanics
            </h4>
            <p className="text-xs text-on-surface mt-1.5 leading-relaxed">
              {info.functionDescription}
            </p>
          </div>

          {/* Contributing Logged Exercises */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant mb-2.5 flex items-center gap-1.5">
              <span className="material-symbols-outlined text-primary text-[16px]">
                fitness_center
              </span>
              Contributing Logged Exercises
            </h4>
            {metric && metric.contributingExercises && metric.contributingExercises.length > 0 ? (
              <div className="space-y-2">
                {metric.contributingExercises.map((ex, idx) => (
                  <div
                    key={`${ex.exerciseName}-${idx}`}
                    className="p-3 rounded-xl bg-surface-container border border-outline-variant/30 flex items-center justify-between text-xs"
                  >
                    <div>
                      <span className="font-medium text-on-surface block">
                        {ex.exerciseName}
                      </span>
                      <span className="text-[11px] text-on-surface-variant">
                        {ex.role === 'primary' ? (
                          <span className="text-primary font-semibold">Primary Target</span>
                        ) : (
                          <span className="text-sky-400 font-semibold">Synergist Assist</span>
                        )}
                        {ex.volumeLoadKg > 0 && ` · ${ex.volumeLoadKg.toLocaleString()} kg load`}
                      </span>
                    </div>
                    <span className="font-mono text-xs px-2.5 py-1 rounded-lg bg-surface-container-highest text-on-surface font-semibold">
                      {ex.sets} {ex.sets === 1 ? 'set' : 'sets'}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-surface-container/40 border border-dashed border-outline-variant/30 text-center">
                <p className="text-xs text-on-surface-variant">
                  No recorded workouts stimulated this muscle in the selected timeframe.
                </p>
              </div>
            )}
          </div>

          {/* Recommended Exercises to Target */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant mb-2.5 flex items-center gap-1.5">
              <span className="material-symbols-outlined text-amber-400 text-[16px]">
                auto_awesome
              </span>
              Recommended Exercises to Stimulate
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {recommendedExercises.map(ex => (
                <button
                  key={ex.name}
                  type="button"
                  onClick={() => {
                    onClose();
                    navigate(`/exercise-library?search=${encodeURIComponent(ex.name)}`);
                  }}
                  className="p-2.5 rounded-xl bg-surface-container border border-outline-variant/30 flex items-center gap-2.5 text-xs hover:border-primary/40 text-left transition-colors active:scale-95 group"
                >
                  <span className="text-lg">{ex.emoji}</span>
                  <div className="min-w-0 flex-1">
                    <span className="font-medium text-on-surface block truncate group-hover:text-primary transition-colors">
                      {ex.name}
                    </span>
                    <span className="text-[10px] text-on-surface-variant capitalize">
                      {ex.equipment}
                    </span>
                  </div>
                  <span className="material-symbols-outlined text-[16px] text-on-surface-variant group-hover:text-primary transition-colors">
                    chevron_right
                  </span>
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => {
                onClose();
                navigate(`/exercise-library?search=${encodeURIComponent(info.commonName)}`);
              }}
              className="w-full mt-3 py-2.5 px-4 rounded-xl bg-primary/10 hover:bg-primary/20 text-primary border border-primary/30 flex items-center justify-center gap-2 text-xs font-semibold active:scale-[0.98] transition-all"
            >
              <span className="material-symbols-outlined text-sm">search</span>
              Browse All {info.commonName} Exercises in Library
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
