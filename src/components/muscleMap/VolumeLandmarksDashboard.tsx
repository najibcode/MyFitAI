// ─────────────────────────────────────────────────────────────
// MyFitAI — Hypertrophy Volume Landmarks (MEV / MAV / MRV) Dashboard
// Scientific mesocycle volume management based on Dr. Mike Israetel hypertrophy standards.
// Evaluates direct and synergist weekly volume, identifies lagging muscle groups,
// prevents overreaching, and provides 1-tap quick training recommendations.
// ─────────────────────────────────────────────────────────────

import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../../utils/db';
import type { WorkoutSession } from '../../types/workout';
import {
  computeMuscleTrainingMetrics,
  evaluateVolumeBenchmark,
  type VolumeBenchmarkStatus,
} from '../../engine/muscleRecoveryEngine';
import type { MuscleTrainingMetric } from '../../types/anatomicalMuscle';
import {
  CheckCircle2,
  AlertTriangle,
  ArrowUpRight,
  TrendingUp,
  Sparkles,
  Info,
  ChevronRight,
} from 'lucide-react';
import { triggerHaptic } from '../../utils/audioFeedback';

interface VolumeLandmarksDashboardProps {
  sessions?: WorkoutSession[];
  className?: string;
}

export default function VolumeLandmarksDashboard({
  sessions: initialSessions,
  className = '',
}: VolumeLandmarksDashboardProps) {
  const navigate = useNavigate();
  const [sessions, setSessions] = useState<WorkoutSession[]>(initialSessions || []);
  const [timeframe, setTimeframe] = useState<'7d' | '14d' | '30d'>('7d');
  const [selectedTier, setSelectedTier] = useState<'all' | 'under' | 'optimal' | 'high' | 'overreached'>('all');
  const [selectedRegion, setSelectedRegion] = useState<string>('all');
  const [showInfoModal, setShowInfoModal] = useState(false);

  // Load real sessions from IndexedDB if not provided via props
  useEffect(() => {
    if (initialSessions && initialSessions.length > 0) {
      setSessions(initialSessions);
      return;
    }

    db.sessions.getAll().then((data) => {
      setSessions(data || []);
    }).catch(() => {});
  }, [initialSessions]);

  // Compute metrics across all anatomical muscles for the selected timeframe
  const metricsRecord = useMemo(() => {
    return computeMuscleTrainingMetrics(sessions, {
      timeframe: timeframe === '14d' ? '30d' : timeframe, // adapter mapping
    });
  }, [sessions, timeframe]);

  // Prepare list of muscle landmarks with evaluation
  const evaluatedMuscles = useMemo(() => {
    return Object.values(metricsRecord).map((m: MuscleTrainingMetric) => {
      const benchmark: VolumeBenchmarkStatus = evaluateVolumeBenchmark(
        m.effectiveSets,
        m.info.minEffectiveVolume,
        m.info.maxAdaptiveVolume,
        m.info.maxRecoverableVolume
      );
      return {
        metric: m,
        benchmark,
      };
    });
  }, [metricsRecord]);

  // Summary tallies
  const stats = useMemo(() => {
    let optimal = 0;
    let under = 0;
    let high = 0;
    let overreached = 0;

    evaluatedMuscles.forEach(({ benchmark }) => {
      if (benchmark.tier === 'optimal') optimal++;
      else if (benchmark.tier === 'under') under++;
      else if (benchmark.tier === 'high') high++;
      else if (benchmark.tier === 'overreached') overreached++;
    });

    const total = evaluatedMuscles.length;
    const hypertrophyScore = total > 0 ? Math.round(((optimal + high * 0.75) / total) * 100) : 0;

    return { optimal, under, high, overreached, total, hypertrophyScore };
  }, [evaluatedMuscles]);

  // Filtered list based on tier & region
  const filteredMuscles = useMemo(() => {
    return evaluatedMuscles.filter(({ metric, benchmark }) => {
      if (selectedTier !== 'all' && benchmark.tier !== selectedTier) {
        return false;
      }
      if (selectedRegion !== 'all' && metric.info.region !== selectedRegion) {
        return false;
      }
      return true;
    }).sort((a, b) => {
      // Sort priority: overreached first, then under (lagging), then high, then optimal
      const order = { overreached: 0, under: 1, high: 2, optimal: 3 };
      return order[a.benchmark.tier] - order[b.benchmark.tier] || b.metric.effectiveSets - a.metric.effectiveSets;
    });
  }, [evaluatedMuscles, selectedTier, selectedRegion]);

  // Quick navigation to start spontaneous workout targeting a muscle
  const handleStartWorkoutForMuscle = (canonicalGroup: string) => {
    triggerHaptic('medium');
    let focus = 'freestyle';
    if (canonicalGroup === 'chest' || canonicalGroup === 'triceps') focus = 'chest_triceps';
    else if (canonicalGroup === 'back' || canonicalGroup === 'lats' || canonicalGroup === 'biceps') focus = 'back_biceps';
    else if (canonicalGroup === 'quads' || canonicalGroup === 'hamstrings' || canonicalGroup === 'glutes' || canonicalGroup === 'calves') focus = 'legs';
    else if (canonicalGroup === 'shoulders') focus = 'shoulders_arms';
    else if (canonicalGroup === 'core') focus = 'core_abs';

    navigate(`/workout?quick=true&focus=${focus}`);
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* ── Header & Timeframe Bar ── */}
      <div className="bg-[#151517] rounded-3xl p-6 sm:p-7 border border-[#2A2A2D] space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#2A2A2D]">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono uppercase tracking-widest text-[var(--color-primary)] font-bold">
                EVIDENCE-BASED HYPERTROPHY
              </span>
              <button
                type="button"
                onClick={() => setShowInfoModal(true)}
                className="text-[#7A7A85] hover:text-white transition-colors"
                title="What are MEV, MAV, and MRV?"
              >
                <Info className="w-3.5 h-3.5" />
              </button>
            </div>
            <h3 className="font-headline font-black text-2xl text-white tracking-tight mt-0.5">
              Volume Landmarks & Periodization
            </h3>
            <p className="text-xs text-[#A0A0AB] mt-1 max-w-xl">
              Track working sets against your Minimum Effective Volume (MEV), Maximum Adaptive Volume (MAV), and Maximum Recoverable Volume (MRV).
            </p>
          </div>

          {/* Timeframe Chips */}
          <div className="flex items-center gap-1.5 bg-[#0D0D0E] p-1 rounded-2xl border border-[#2A2A2D] self-start sm:self-center shrink-0">
            {(['7d', '14d', '30d'] as const).map((t) => (
              <button
                key={t}
                onClick={() => {
                  triggerHaptic('light');
                  setTimeframe(t);
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold uppercase tracking-wider transition-all ${
                  timeframe === t
                    ? 'bg-[var(--color-primary)] text-white shadow-sm'
                    : 'text-[#8A8A93] hover:text-white'
                }`}
              >
                {t === '7d' ? '7 Days' : t === '14d' ? '14 Days' : '30 Days'}
              </button>
            ))}
          </div>
        </div>

        {/* ── Mesocycle Analytics Status Tiles ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-[#1C1C1F] rounded-2xl p-4 border border-emerald-500/25 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono uppercase tracking-wider text-emerald-400 font-bold">
                Optimal (MAV)
              </span>
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="mt-2 flex items-baseline gap-1.5">
              <span className="font-headline font-black text-2xl text-white">
                {stats.optimal}
              </span>
              <span className="text-[10px] font-mono text-[#7A7A85]">
                / {stats.total} muscles
              </span>
            </div>
            <span className="text-[10px] text-emerald-300/80 mt-1">Sweet spot stimulus</span>
          </div>

          <div className="bg-[#1C1C1F] rounded-2xl p-4 border border-sky-500/25 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono uppercase tracking-wider text-sky-400 font-bold">
                Under MEV
              </span>
              <ArrowUpRight className="w-4 h-4 text-sky-400" />
            </div>
            <div className="mt-2 flex items-baseline gap-1.5">
              <span className="font-headline font-black text-2xl text-white">
                {stats.under}
              </span>
              <span className="text-[10px] font-mono text-[#7A7A85]">
                lagging
              </span>
            </div>
            <span className="text-[10px] text-sky-300/80 mt-1">Below growth floor</span>
          </div>

          <div className="bg-[#1C1C1F] rounded-2xl p-4 border border-amber-500/25 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono uppercase tracking-wider text-amber-400 font-bold">
                High Overload
              </span>
              <TrendingUp className="w-4 h-4 text-amber-400" />
            </div>
            <div className="mt-2 flex items-baseline gap-1.5">
              <span className="font-headline font-black text-2xl text-white">
                {stats.high}
              </span>
              <span className="text-[10px] font-mono text-[#7A7A85]">
                approaching MRV
              </span>
            </div>
            <span className="text-[10px] text-amber-300/80 mt-1">High fatigue state</span>
          </div>

          <div className="bg-[#1C1C1F] rounded-2xl p-4 border border-rose-500/25 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono uppercase tracking-wider text-rose-400 font-bold">
                Overreached
              </span>
              <AlertTriangle className="w-4 h-4 text-rose-400" />
            </div>
            <div className="mt-2 flex items-baseline gap-1.5">
              <span className="font-headline font-black text-2xl text-white">
                {stats.overreached}
              </span>
              <span className="text-[10px] font-mono text-[#7A7A85]">
                deload needed
              </span>
            </div>
            <span className="text-[10px] text-rose-300/80 mt-1">Exceeds MRV capacity</span>
          </div>
        </div>

        {/* ── Filters: Tiers and Regions ── */}
        <div className="space-y-3 pt-2">
          {/* Tier Filters */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
            <span className="text-[10px] font-mono uppercase font-bold text-[#7A7A85] mr-1 shrink-0">
              Tier:
            </span>
            {[
              { id: 'all', label: `All (${stats.total})` },
              { id: 'under', label: `Under MEV (${stats.under})` },
              { id: 'optimal', label: `Optimal MAV (${stats.optimal})` },
              { id: 'high', label: `Overload (${stats.high})` },
              { id: 'overreached', label: `Overreached (${stats.overreached})` },
            ].map((tier) => (
              <button
                key={tier.id}
                onClick={() => setSelectedTier(tier.id as any)}
                className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold transition-all shrink-0 border ${
                  selectedTier === tier.id
                    ? 'bg-white text-black border-white'
                    : 'bg-[#1C1C1F] text-[#A0A0AB] hover:text-white border-[#2A2A2D]'
                }`}
              >
                {tier.label}
              </button>
            ))}
          </div>

          {/* Region Filters */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
            <span className="text-[10px] font-mono uppercase font-bold text-[#7A7A85] mr-1 shrink-0">
              Region:
            </span>
            {[
              { id: 'all', label: 'All Regions' },
              { id: 'chest', label: 'Chest' },
              { id: 'back', label: 'Back & Lats' },
              { id: 'shoulders', label: 'Shoulders' },
              { id: 'arms', label: 'Arms' },
              { id: 'quadriceps', label: 'Quads' },
              { id: 'hamstrings', label: 'Hamstrings' },
              { id: 'glutes', label: 'Glutes' },
              { id: 'calves', label: 'Calves' },
              { id: 'core', label: 'Core / Abs' },
            ].map((region) => (
              <button
                key={region.id}
                onClick={() => setSelectedRegion(region.id)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-sans font-semibold transition-all shrink-0 border ${
                  selectedRegion === region.id
                    ? 'bg-[var(--color-primary)]/20 text-[var(--color-primary)] border-[var(--color-primary)]/40'
                    : 'bg-[#151517] text-[#8A8A93] hover:text-white border-[#2A2A2D]'
                }`}
              >
                {region.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Granular Muscle Landmark Cards Grid ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredMuscles.map(({ metric, benchmark }) => {
          const mev = metric.info.minEffectiveVolume;
          const mav = metric.info.maxAdaptiveVolume;
          const mrv = metric.info.maxRecoverableVolume;
          const sets = metric.effectiveSets;

          // Benchmark percentage calculations for progress fill
          const mevPct = Math.round((mev / mrv) * 100);
          const mavPct = Math.round((mav / mrv) * 100);
          const currentSetsPct = Math.min(100, Math.round((sets / mrv) * 100));

          const isOver = sets >= mrv;
          const isOptimal = sets >= mev && sets <= mav;
          const isUnder = sets < mev;

          return (
            <div
              key={metric.muscleId}
              className="bg-[#151517] rounded-3xl p-5 border border-[#2A2A2D] hover:border-[#3E3E42] transition-all flex flex-col justify-between gap-4"
            >
              {/* Header */}
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="font-headline font-black text-base text-white tracking-tight">
                      {metric.info.commonName}
                    </h4>
                    <span className="text-[10px] font-mono text-[#7A7A85] uppercase">
                      {metric.info.region}
                    </span>
                  </div>
                  <p className="text-[11px] text-[#8E8E93] italic mt-0.5 line-clamp-1">
                    {metric.info.anatomicalName}
                  </p>
                </div>

                {/* Status Tier Badge */}
                <span
                  className="px-2.5 py-1 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider shrink-0 border"
                  style={{
                    backgroundColor: `${benchmark.color}15`,
                    color: benchmark.color,
                    borderColor: `${benchmark.color}35`,
                  }}
                >
                  {benchmark.label}
                </span>
              </div>

              {/* Volume Metrics & Visual Landmark Spectrum */}
              <div className="space-y-2">
                <div className="flex items-baseline justify-between">
                  <span className="text-xs font-mono font-bold text-white">
                    <span className="text-lg font-black">{sets}</span> sets
                    <span className="text-[10px] text-[#7A7A85] ml-1.5 font-normal">
                      ({metric.primarySets} direct + {metric.synergistSets * 0.5} synergist)
                    </span>
                  </span>
                  <span className="text-[10px] font-mono text-[#8A8A93]">
                    Target MAV: <strong className="text-white">{mav}</strong> sets
                  </span>
                </div>

                {/* Spectrum Progress Bar */}
                <div className="relative pt-2 pb-1">
                  <div className="h-3 w-full bg-[#0D0D0E] border border-[#2A2A2D] rounded-full overflow-hidden relative">
                    {/* MEV Zone Underlay */}
                    <div
                      className="absolute top-0 bottom-0 left-0 bg-sky-500/20"
                      style={{ width: `${mevPct}%` }}
                      title="Maintenance & MEV Zone"
                    />
                    {/* MAV Sweet Spot Underlay */}
                    <div
                      className="absolute top-0 bottom-0 bg-emerald-500/25"
                      style={{ left: `${mevPct}%`, width: `${mavPct - mevPct}%` }}
                      title="Optimal Hypertrophy (MAV)"
                    />
                    {/* High Overload Underlay */}
                    <div
                      className="absolute top-0 bottom-0 bg-amber-500/20"
                      style={{ left: `${mavPct}%`, width: `${100 - mavPct}%` }}
                      title="Overload Phase"
                    />

                    {/* Dynamic User Fill */}
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${currentSetsPct}%`,
                        backgroundColor: benchmark.color,
                      }}
                    />
                  </div>

                  {/* Tick Labels */}
                  <div className="flex justify-between text-[9px] font-mono text-[#7A7A85] mt-1.5 px-0.5">
                    <span>0</span>
                    <span className="text-sky-400">MEV: {mev}</span>
                    <span className="text-emerald-400 font-bold">MAV: {mav}</span>
                    <span className="text-rose-400">MRV: {mrv}+</span>
                  </div>
                </div>
              </div>

              {/* Actionable AI Prescription & Quick Jump */}
              <div className="pt-3 border-t border-[#2A2A2D]/70 flex items-center justify-between gap-3">
                <p className="text-[11px] text-[#A0A0AB] leading-relaxed line-clamp-2">
                  {isUnder
                    ? `Needs +${Math.max(1, mev - sets)} sets to hit minimum stimulus.`
                    : isOptimal
                    ? 'In the prime hypertrophy zone. Maintain progressive overload.'
                    : isOver
                    ? 'MRV exceeded. Deload or reduce direct sets to avoid systemic fatigue.'
                    : 'High volume overload phase. Approaching recovery ceiling.'}
                </p>

                <button
                  type="button"
                  onClick={() => handleStartWorkoutForMuscle(metric.info.canonicalGroup)}
                  className="px-3 py-1.5 rounded-xl bg-white/[0.06] hover:bg-[var(--color-primary)] text-white hover:text-black font-headline font-bold text-[10px] uppercase tracking-wider flex items-center gap-1 shrink-0 transition-all active:scale-95 border border-[#2A2A2D]"
                >
                  <span>Train</span>
                  <ChevronRight className="w-3 h-3" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Educational Explainer Modal (MEV / MAV / MRV) ── */}
      {showInfoModal && (
        <div className="fixed inset-0 z-[999] bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-lg bg-[#151517] border border-[#2A2A2D] rounded-3xl p-6 sm:p-7 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-[#2A2A2D] pb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-[var(--color-primary)]/15 border border-[var(--color-primary)]/30 flex items-center justify-center text-[var(--color-primary)]">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-headline font-black text-lg text-white">
                    Hypertrophy Volume Landmarks
                  </h3>
                  <span className="text-[10px] font-mono text-[#7A7A85] uppercase tracking-widest block">
                    Dr. Mike Israetel Hypertrophy Framework
                  </span>
                </div>
              </div>
              <button
                onClick={() => setShowInfoModal(false)}
                className="w-8 h-8 rounded-full bg-[#1E1E20] border border-[#2A2A2D] flex items-center justify-center text-white"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3.5 text-xs text-[#A0A0AB] leading-relaxed">
              <div className="p-3.5 rounded-2xl bg-[#1C1C1F] border border-sky-500/25">
                <span className="font-bold text-sky-400 block mb-1">
                  1. MEV (Minimum Effective Volume)
                </span>
                The lowest amount of direct and synergist volume that still stimulates measurable muscle growth. Below this dose, muscle is merely maintained.
              </div>

              <div className="p-3.5 rounded-2xl bg-[#1C1C1F] border border-emerald-500/25">
                <span className="font-bold text-emerald-400 block mb-1">
                  2. MAV (Maximum Adaptive Volume)
                </span>
                The sweet spot range where the highest rate of muscle protein synthesis occurs relative to recovery cost. Training here maximizes growth efficiency.
              </div>

              <div className="p-3.5 rounded-2xl bg-[#1C1C1F] border border-rose-500/25">
                <span className="font-bold text-rose-400 block mb-1">
                  3. MRV (Maximum Recoverable Volume)
                </span>
                The upper threshold of volume an athlete can adapt to. Exceeding MRV results in accumulated neuromuscular fatigue, elevated injury risk, and diminished progress.
              </div>
            </div>

            <button
              onClick={() => setShowInfoModal(false)}
              className="w-full py-3 rounded-2xl bg-[var(--color-primary)] text-black font-headline font-black text-xs uppercase tracking-wider"
            >
              Understood
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
