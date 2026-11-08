// ─────────────────────────────────────────────────────────────
// MyFitAI — Muscle Inspection Drawer / Modal
// Displays granular anatomical analysis, recovery status, hypertrophy
// volume landmarks (MEV/MAV/MRV), contributing logged exercises,
// and exercise recommendations for the selected muscle.
// Athletic Personal Operating System UI/UX
// ─────────────────────────────────────────────────────────────

import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ANATOMICAL_MUSCLES,
  type MuscleTrainingMetric,
} from '../../types/anatomicalMuscle';
import { EXERCISES_DATA } from '../../data/exercisesData';
import {
  X,
  Zap,
  CheckCircle,
  AlertTriangle,
  BatteryCharging,
  Clock,
  TrendingUp,
  Activity,
  Dumbbell,
  Sparkles,
  ChevronRight,
  Search,
} from 'lucide-react';

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
    color: 'text-[#30D158] bg-[#30D158]/10 border-[#30D158]/30',
    icon: CheckCircle,
  };
  if (isTrained && recoveryPct < 55) {
    recoveryBadge = {
      label: 'Fatigued — Recovery Ongoing',
      color: 'text-[#FF453A] bg-[#FF453A]/10 border-[#FF453A]/30',
      icon: AlertTriangle,
    };
  } else if (isTrained && recoveryPct < 90) {
    recoveryBadge = {
      label: 'Recovering Adaptively',
      color: 'text-[#F5C542] bg-[#F5C542]/10 border-[#F5C542]/30',
      icon: BatteryCharging,
    };
  }

  const RecoveryIcon = recoveryBadge.icon;

  // Volume Landmark Calculations
  const sets = metric?.effectiveSets ?? 0;
  const mev = info.minEffectiveVolume;
  const mav = info.maxAdaptiveVolume;
  const mrv = info.maxRecoverableVolume;

  let volumeStatusText = 'Under MEV — Maintenance level stimulus';
  let volumeColor = 'text-[#4F9CF9]';
  if (sets >= mrv) {
    volumeStatusText = 'MRV Exceeded — Fatigue accumulation high; deload recommended';
    volumeColor = 'text-[#FF453A] font-semibold';
  } else if (sets >= mav) {
    volumeStatusText = 'High Adaptive Stimulus — Near upper threshold';
    volumeColor = 'text-[#F5C542] font-semibold';
  } else if (sets >= mev) {
    volumeStatusText = 'Optimal MAV — Maximum hypertrophy sweet spot';
    volumeColor = 'text-[#30D158] font-semibold';
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
      <div className="bg-[#151517] border border-[#2A2A2D] rounded-t-3xl sm:rounded-3xl w-full max-w-xl max-h-[88vh] overflow-y-auto shadow-2xl flex flex-col">
        {/* Sticky Header */}
        <div className="sticky top-0 bg-[#151517]/95 backdrop-blur-md px-6 py-4 border-b border-[#2A2A2D] flex items-center justify-between z-10">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] uppercase font-mono tracking-widest text-[#30D158] font-bold px-2 py-0.5 rounded-md bg-[#30D158]/10 border border-[#30D158]/20">
                {info.region}
              </span>
              <span className="text-xs font-mono text-[#A1A1A6] capitalize">
                {info.view} aspect
              </span>
            </div>
            <h3 className="text-xl font-headline font-black text-[#F5F5F5] tracking-tight mt-1 uppercase">
              {info.commonName}
            </h3>
            <p className="text-xs text-[#6B6B70] italic">
              {info.anatomicalName}
            </p>
          </div>

          <button
            onClick={onClose}
            className="w-9 h-9 rounded-xl bg-[#1E1E20] border border-[#2A2A2D] flex items-center justify-center text-[#A1A1A6] hover:text-[#F5F5F5] transition-colors"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-5">
          {/* Recovery & Load Summary Cards */}
          <div className="grid grid-cols-2 gap-3">
            {/* Stimulus / Role Card */}
            <div className="p-4 rounded-2xl bg-[#1E1E20] border border-[#2A2A2D] flex flex-col justify-between">
              <div className="flex items-center justify-between text-xs text-[#A1A1A6] font-mono">
                <span>Stimulus Volume</span>
                <Zap className="w-4 h-4 text-[#FF8A00]" />
              </div>
              <div className="mt-2">
                <span className="text-3xl font-headline font-black text-[#F5F5F5] tabular-nums">
                  {metric?.effectiveSets.toFixed(1) ?? '0.0'}
                </span>
                <span className="text-xs text-[#A1A1A6] ml-1 font-mono">
                  eff sets
                </span>
              </div>
              <div className="mt-2 text-xs">
                {metric?.targetRole === 'primary' ? (
                  <span className="text-[#30D158] font-mono font-bold flex items-center gap-1">
                    ● Primary Target
                  </span>
                ) : metric?.targetRole === 'synergist' ? (
                  <span className="text-[#4F9CF9] font-mono font-bold flex items-center gap-1">
                    ● Synergist Assist
                  </span>
                ) : (
                  <span className="text-[#6B6B70] font-mono">Untrained This Week</span>
                )}
                {metric && metric.volumeLoadKg > 0 && (
                  <span className="text-[11px] text-[#A1A1A6] block mt-0.5 font-mono">
                    {metric.volumeLoadKg.toLocaleString()} kg load
                  </span>
                )}
              </div>
            </div>

            {/* Recovery Status Card */}
            <div className="p-4 rounded-2xl bg-[#1E1E20] border border-[#2A2A2D] flex flex-col justify-between">
              <div className="flex items-center justify-between text-xs text-[#A1A1A6] font-mono">
                <span>Recovery Status</span>
                <RecoveryIcon className="w-4 h-4 text-[#30D158]" />
              </div>
              <div className="mt-2 flex items-baseline gap-1">
                <span className="text-3xl font-headline font-black text-[#F5F5F5] tabular-nums">
                  {recoveryPct}%
                </span>
                <span className="text-[10px] text-[#30D158] uppercase font-mono font-bold">
                  ready
                </span>
              </div>
              <div className="mt-2">
                <span
                  className={`text-[10px] font-mono font-semibold px-2 py-0.5 rounded border inline-block ${recoveryBadge.color}`}
                >
                  {recoveryBadge.label}
                </span>
                {hoursToFull > 0 && (
                  <span className="text-[10px] font-mono text-[#A1A1A6] block mt-1 flex items-center gap-1">
                    <Clock className="w-3 h-3 inline text-[#6B6B70]" />
                    ~{hoursToFull}h to full recovery
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Hypertrophy Volume Landmarks (MEV / MAV / MRV) */}
          <div className="p-4 rounded-2xl bg-[#1E1E20] border border-[#2A2A2D] space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <TrendingUp className="w-4 h-4 text-[#30D158]" />
                <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-[#F5F5F5]">
                  Hypertrophy Volume Landmarks
                </h4>
              </div>
              <span className={`text-xs font-mono ${volumeColor}`}>
                {sets} / {mav} sets
              </span>
            </div>

            {/* Landmark Graphic Bar */}
            <div className="relative pt-3 pb-1">
              <div className="h-2.5 w-full bg-[#151517] border border-[#2A2A2D] rounded-full overflow-hidden relative">
                {/* MEV Zone */}
                <div
                  className="absolute top-0 bottom-0 left-0 bg-[#4F9CF9]/20"
                  style={{ width: `${mevPct}%` }}
                  title="Maintenance & MEV"
                />
                {/* MAV Sweet Spot */}
                <div
                  className="absolute top-0 bottom-0 bg-[#30D158]/25"
                  style={{ left: `${mevPct}%`, width: `${mavPct - mevPct}%` }}
                  title="Optimal MAV range"
                />
                {/* Progress bar */}
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    sets >= mrv
                      ? 'bg-[#FF453A]'
                      : sets >= mav
                      ? 'bg-[#F5C542]'
                      : sets >= mev
                      ? 'bg-[#30D158]'
                      : 'bg-[#4F9CF9]'
                  }`}
                  style={{ width: `${currentSetsPct}%` }}
                />
              </div>

              {/* Landmark Tick Labels */}
              <div className="flex justify-between text-[10px] font-mono text-[#6B6B70] mt-2">
                <span>0 sets</span>
                <span>MEV: {mev}</span>
                <span>MAV: {mav}</span>
                <span>MRV: {mrv}+</span>
              </div>
            </div>

            <p className="text-xs text-[#A1A1A6] leading-relaxed">
              {volumeStatusText}
            </p>
          </div>

          {/* Biomechanical Function Description */}
          <div className="p-4 rounded-2xl bg-[#1E1E20] border border-[#2A2A2D] space-y-1.5">
            <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-[#30D158] flex items-center gap-1.5">
              <Activity className="w-4 h-4" />
              Anatomical Function & Biomechanics
            </h4>
            <p className="text-xs text-[#F5F5F5]/90 leading-relaxed">
              {info.functionDescription}
            </p>
          </div>

          {/* Contributing Logged Exercises */}
          <div className="space-y-2.5">
            <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-[#A1A1A6] flex items-center gap-1.5">
              <Dumbbell className="w-4 h-4 text-[#FF8A00]" />
              Contributing Logged Exercises
            </h4>
            {metric && metric.contributingExercises && metric.contributingExercises.length > 0 ? (
              <div className="space-y-2">
                {metric.contributingExercises.map((ex, idx) => (
                  <div
                    key={`${ex.exerciseName}-${idx}`}
                    className="p-3 rounded-xl bg-[#1E1E20] border border-[#2A2A2D] flex items-center justify-between text-xs"
                  >
                    <div>
                      <span className="font-headline font-bold text-[#F5F5F5] block">
                        {ex.exerciseName}
                      </span>
                      <span className="text-[11px] text-[#A1A1A6] font-mono">
                        {ex.role === 'primary' ? (
                          <span className="text-[#30D158] font-semibold">Primary Target</span>
                        ) : (
                          <span className="text-[#4F9CF9] font-semibold">Synergist Assist</span>
                        )}
                        {ex.volumeLoadKg > 0 && ` · ${ex.volumeLoadKg.toLocaleString()} kg load`}
                      </span>
                    </div>
                    <span className="font-mono text-xs px-2.5 py-1 rounded-lg bg-[#151517] border border-[#2A2A2D] text-[#F5F5F5] font-bold">
                      {ex.sets} {ex.sets === 1 ? 'set' : 'sets'}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-[#1E1E20]/60 border border-dashed border-[#2A2A2D] text-center">
                <p className="text-xs text-[#6B6B70]">
                  No recorded workouts stimulated this muscle in the selected timeframe.
                </p>
              </div>
            )}
          </div>

          {/* Recommended Exercises to Target */}
          <div className="space-y-2.5">
            {/* 1-Tap Quick Start Workout Split */}
            <button
              type="button"
              onClick={() => {
                onClose();
                let focus = 'freestyle';
                const grp = info.canonicalGroup;
                if (grp === 'chest' || grp === 'triceps') focus = 'chest_triceps';
                else if (grp === 'back' || grp === 'lats' || grp === 'biceps') focus = 'back_biceps';
                else if (grp === 'quads' || grp === 'hamstrings' || grp === 'glutes' || grp === 'calves') focus = 'legs';
                else if (grp === 'shoulders') focus = 'shoulders_arms';
                else if (grp === 'core') focus = 'core_abs';
                navigate(`/workout?quick=true&focus=${focus}`);
              }}
              className="w-full py-3.5 px-4 rounded-2xl bg-[#FF8A00] hover:brightness-110 text-black font-headline font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-[#FF8A00]/20 active:scale-[0.98] transition-all"
            >
              <Zap className="w-4 h-4 fill-black stroke-none" />
              <span>Target {info.commonName} In Quick Workout</span>
            </button>

            <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-[#A1A1A6] flex items-center gap-1.5 pt-2">
              <Sparkles className="w-4 h-4 text-[#F5C542]" />
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
                  className="p-3 rounded-xl bg-[#1E1E20] border border-[#2A2A2D] flex items-center justify-between text-xs hover:border-[#30D158]/40 text-left transition-colors active:scale-98 group"
                >
                  <div className="min-w-0 flex-1">
                    <span className="font-headline font-bold text-[#F5F5F5] block truncate group-hover:text-[#30D158] transition-colors">
                      {ex.name}
                    </span>
                    <span className="text-[10px] font-mono text-[#6B6B70] capitalize">
                      {ex.equipment}
                    </span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-[#6B6B70] group-hover:text-[#30D158] transition-colors" />
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => {
                onClose();
                navigate(`/exercise-library?search=${encodeURIComponent(info.commonName)}`);
              }}
              className="w-full mt-2 py-3 px-4 rounded-xl bg-[#30D158]/10 hover:bg-[#30D158]/20 text-[#30D158] border border-[#30D158]/30 flex items-center justify-center gap-2 text-xs font-headline font-bold uppercase tracking-wider active:scale-[0.98] transition-all"
            >
              <Search className="w-3.5 h-3.5" />
              Browse All {info.commonName} Exercises
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
