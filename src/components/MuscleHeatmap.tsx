// ─────────────────────────────────────────────────────────────
// MyFitAI — Advanced Anatomical Muscle Training Map
// Production-grade biomechanical muscle visualization system.
// Features:
// 1. Scalable vector anatomical models (Front & Posterior Back)
// 2. High-precision 30+ muscle granular taxonomy
// 3. Driven by real workout sessions or legacy props adapter
// 4. Three analytical modes: Target/Stimulus, Volume Landmarks, Recovery Decay
// 5. Deep inspection drawer with MEV/MAV/MRV benchmarks & exercise suggestions
// 6. Push/Pull, Anterior/Posterior Deltoid, and Quad/Hamstring symmetry analysis
// ─────────────────────────────────────────────────────────────

import { useState, useMemo, useEffect } from 'react';
import type { MuscleGroup } from '../types/exercise';
import type { WorkoutSession } from '../types/workout';
import { db } from '../utils/db';
import {
  ANATOMICAL_MUSCLES,
  type MuscleTrainingMetric,
  type MuscleBalanceSummary,
} from '../types/anatomicalMuscle';
import {
  computeMuscleTrainingMetrics,
  computeMetricsFromLegacyProps,
  analyzeMuscleBalance,
} from '../engine/muscleRecoveryEngine';
import AnatomicalFrontBody from './muscleMap/AnatomicalFrontBody';
import AnatomicalBackBody from './muscleMap/AnatomicalBackBody';
import MuscleInspectionDrawer from './muscleMap/MuscleInspectionDrawer';
import ShareableMuscleCardModal from './share/ShareableMuscleCardModal';
import { triggerHaptic } from '../utils/audioFeedback';

export type HeatmapMode = 'target' | 'volume' | 'fatigue';
export type HeatmapView = 'both' | 'front' | 'back';
export type HeatmapTimeframe = 'session' | '7d' | '30d' | 'all';

export interface MuscleHeatmapProps {
  muscles?: string[] | MuscleGroup[];
  secondaryMuscles?: string[] | MuscleGroup[];
  muscleVolumes?: Record<string, number>; // muscle -> total sets
  muscleFatigue?: Record<string, number>; // muscle -> fatigue level (0 = fresh, 100 = fatigued)
  sessions?: WorkoutSession[]; // Real completed sessions if provided directly
  mode?: HeatmapMode;
  initialView?: HeatmapView;
  size?: number;
  className?: string;
  showControls?: boolean;
  showLegend?: boolean;
  interactive?: boolean;
  timeframe?: HeatmapTimeframe;
  showTimeframeSelector?: boolean;
  showSymmetryCard?: boolean;
  showShareButton?: boolean;
  onSelectMuscle?: (muscle: string) => void;
}

export default function MuscleHeatmap({
  muscles = [],
  secondaryMuscles = [],
  muscleVolumes = {},
  muscleFatigue = {},
  sessions: propSessions,
  mode = 'target',
  initialView = 'both',
  className = '',
  showControls = true,
  showLegend = true,
  interactive = true,
  timeframe = '7d',
  showTimeframeSelector = false,
  showSymmetryCard = false,
  showShareButton = true,
  onSelectMuscle,
}: MuscleHeatmapProps) {
  const [currentMode, setCurrentMode] = useState<HeatmapMode>(mode);
  const [currentView, setCurrentView] = useState<HeatmapView>(initialView);
  const [currentTimeframe, setCurrentTimeframe] = useState<HeatmapTimeframe>(timeframe);
  const [selectedMuscleId, setSelectedMuscleId] = useState<string | null>(null);
  const [hoveredMuscleId, setHoveredMuscleId] = useState<string | null>(null);
  const [dbSessions, setDbSessions] = useState<WorkoutSession[]>([]);
  const [symmetryOpen, setSymmetryOpen] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);

  // If no muscles and no propSessions were passed, fetch completed sessions from IndexedDB
  const hasPropsData = (muscles && muscles.length > 0) || Object.keys(muscleVolumes).length > 0;
  const hasSessions = !!(propSessions && propSessions.length > 0);

  useEffect(() => {
    let isMounted = true;
    if (!hasPropsData && !hasSessions) {
      db.sessions
        .getAll()
        .then(allSessions => {
          if (!isMounted) return;
          const completed = allSessions.filter(
            s => s.endedAt || s.duration > 0 || (s.exercises && s.exercises.length > 0)
          );
          setDbSessions(completed);
        })
        .catch(() => {
          // Fallback silently if db empty or unavailable
        });
    }
    return () => {
      isMounted = false;
    };
  }, [hasPropsData, hasSessions]);

  // Compute metrics dictionary for all 30+ anatomical muscles
  const metrics = useMemo<Record<string, MuscleTrainingMetric>>(() => {
    // 1. If explicit workout sessions are available (props or IndexedDB), compute real metrics
    const activeSessions = propSessions || (dbSessions.length > 0 ? dbSessions : null);
    if (activeSessions && (!hasPropsData || showTimeframeSelector)) {
      return computeMuscleTrainingMetrics(activeSessions, { timeframe: currentTimeframe });
    }

    // 2. Otherwise adapt legacy props (e.g. from WorkoutPlanner, TemplateEditor, WeeklyPlanner)
    return computeMetricsFromLegacyProps(muscles, secondaryMuscles, muscleVolumes, muscleFatigue);
  }, [
    propSessions,
    dbSessions,
    hasPropsData,
    showTimeframeSelector,
    currentTimeframe,
    muscles,
    secondaryMuscles,
    muscleVolumes,
    muscleFatigue,
  ]);

  // Analyze muscle balance / symmetry
  const balanceSummary = useMemo<MuscleBalanceSummary>(() => {
    return analyzeMuscleBalance(metrics);
  }, [metrics]);

  // Summary counts
  const totalStimulatedMuscles = useMemo(() => {
    return Object.values(metrics).filter(m => m.effectiveSets > 0 || m.targetRole !== null).length;
  }, [metrics]);

  const totalEffectiveSets = useMemo(() => {
    return Math.round(Object.values(metrics).reduce((s, m) => s + m.effectiveSets, 0) * 10) / 10;
  }, [metrics]);

  // Handle muscle selection
  const handleSelectMuscle = (muscleId: string) => {
    if (!interactive) return;
    const next = selectedMuscleId === muscleId ? null : muscleId;
    setSelectedMuscleId(next);
    if (next && onSelectMuscle) {
      onSelectMuscle(next);
    }
  };

  const hoveredInfo = hoveredMuscleId ? ANATOMICAL_MUSCLES[hoveredMuscleId] : null;

  return (
    <div className={`flex flex-col items-center w-full ${className}`}>
      {/* ── Top Analytical Controls ── */}
      {showControls && (
        <div className="w-full flex flex-wrap items-center justify-between gap-2.5 mb-4 pb-3 border-b border-outline-variant/20">
          {/* View Toggles: Dual / Anterior / Posterior */}
          <div className="flex bg-surface-container p-0.5 rounded-xl border border-outline-variant/30">
            {(['both', 'front', 'back'] as HeatmapView[]).map(v => (
              <button
                key={v}
                onClick={() => setCurrentView(v)}
                className={`px-3 py-1 rounded-lg text-[10px] font-mono font-bold uppercase tracking-wider transition-all ${
                  currentView === v
                    ? 'bg-primary text-on-primary shadow-sm'
                    : 'text-on-surface-variant hover:text-on-surface'
                }`}
              >
                {v === 'both' ? 'Dual' : v === 'front' ? 'Front' : 'Back'}
              </button>
            ))}
          </div>

          {/* Timeframe Selector (Optional) */}
          {showTimeframeSelector && (
            <div className="flex bg-surface-container p-0.5 rounded-xl border border-outline-variant/30">
              {(
                [
                  { id: 'session', label: 'Session' },
                  { id: '7d', label: '7D' },
                  { id: '30d', label: '30D' },
                  { id: 'all', label: 'All' },
                ] as const
              ).map(t => (
                <button
                  key={t.id}
                  onClick={() => setCurrentTimeframe(t.id)}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold uppercase transition-all ${
                    currentTimeframe === t.id
                      ? 'bg-surface-container-highest text-primary font-bold'
                      : 'text-on-surface-variant hover:text-on-surface'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          )}

          {/* Analytical Mode Switcher */}
          <div className="flex bg-surface-container p-0.5 rounded-xl border border-outline-variant/30">
            {(
              [
                { id: 'target', label: 'Load', iconName: 'bolt' },
                { id: 'volume', label: 'Volume', iconName: 'layers' },
                { id: 'fatigue', label: 'Recovery', iconName: 'battery_charging_full' },
              ] as const
            ).map(m => (
              <button
                key={m.id}
                onClick={() => setCurrentMode(m.id)}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all ${
                  currentMode === m.id
                    ? 'bg-surface-container-highest text-primary border border-primary/30 shadow-sm'
                    : 'text-on-surface-variant hover:text-on-surface'
                }`}
              >
                <span className="material-symbols-outlined text-[13px]">{m.iconName}</span>
                <span>{m.label}</span>
              </button>
            ))}
          </div>

          {/* Share Muscle Progress Button */}
          {showShareButton && (
            <button
              type="button"
              onClick={() => {
                triggerHaptic('light');
                setShowShareModal(true);
              }}
              className="px-3 py-1 rounded-xl bg-primary/10 hover:bg-primary/20 text-primary border border-primary/30 text-[10px] font-mono font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all active:scale-95 shadow-sm ml-auto"
              title="Share Muscle Progress"
            >
              <span className="material-symbols-outlined text-[14px]">share</span>
              <span>Share Progress</span>
            </button>
          )}
        </div>
      )}

      {/* ── Active Hover / Target Pill ── */}
      <div className="h-6 flex items-center justify-center text-xs font-mono text-on-surface-variant mb-1">
        {hoveredInfo ? (
          <span className="px-2.5 py-0.5 rounded-full bg-surface-container border border-outline-variant/40 text-on-surface flex items-center gap-1.5 animate-in fade-in">
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            <span className="font-semibold text-primary">{hoveredInfo.commonName}</span>
            <span className="text-[10px] text-on-surface-variant/70 italic hidden sm:inline">
              ({hoveredInfo.anatomicalName})
            </span>
          </span>
        ) : (
          <span className="text-[11px] text-on-surface-variant/50">
            {interactive ? 'Tap any muscle to inspect recovery & landmarks' : ''}
          </span>
        )}
      </div>

      {/* ── Anatomical Vector Figures Container ── */}
      <div className="w-full flex items-center justify-center gap-6 sm:gap-12 relative py-2">
        {(currentView === 'both' || currentView === 'front') && (
          <div className="w-full max-w-[190px] sm:max-w-[220px]">
            <AnatomicalFrontBody
              metrics={metrics}
              selectedMuscleId={selectedMuscleId}
              onSelectMuscle={handleSelectMuscle}
              mode={currentMode}
              hoveredMuscleId={hoveredMuscleId}
              onHoverMuscle={setHoveredMuscleId}
            />
          </div>
        )}

        {(currentView === 'both' || currentView === 'back') && (
          <div className="w-full max-w-[190px] sm:max-w-[220px]">
            <AnatomicalBackBody
              metrics={metrics}
              selectedMuscleId={selectedMuscleId}
              onSelectMuscle={handleSelectMuscle}
              mode={currentMode}
              hoveredMuscleId={hoveredMuscleId}
              onHoverMuscle={setHoveredMuscleId}
            />
          </div>
        )}
      </div>

      {/* ── Legend & Summary Bar ── */}
      {showLegend && (
        <div className="w-full mt-4 pt-3 border-t border-outline-variant/20 flex flex-wrap items-center justify-between gap-3 text-xs">
          {/* Mode Legend */}
          {currentMode === 'target' && (
            <div className="flex items-center gap-3.5 mx-auto sm:mx-0">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#FF7A00] shadow-[0_0_8px_rgba(255,122,0,0.6)] animate-pulse" />
                <span className="text-[10px] font-mono uppercase font-bold text-on-surface-variant">
                  Primary Target
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#0284C7]" />
                <span className="text-[10px] font-mono uppercase font-bold text-on-surface-variant">
                  Synergist
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-white/10" />
                <span className="text-[10px] font-mono uppercase font-bold text-on-surface-variant/40">
                  Resting
                </span>
              </div>
            </div>
          )}

          {currentMode === 'volume' && (
            <div className="flex items-center gap-3 mx-auto sm:mx-0">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#38BDF8]" />
                <span className="text-[10px] text-on-surface-variant">&lt;6 MEV</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#10B981]" />
                <span className="text-[10px] text-on-surface-variant font-semibold">6-14 MAV</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#F59E0B]" />
                <span className="text-[10px] text-on-surface-variant">15-20 High</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#EF4444]" />
                <span className="text-[10px] text-on-surface-variant">&gt;20 MRV</span>
              </div>
            </div>
          )}

          {currentMode === 'fatigue' && (
            <div className="flex items-center gap-3.5 mx-auto sm:mx-0">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#10B981]" />
                <span className="text-[10px] font-bold text-on-surface-variant">Fresh (≥90%)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#F59E0B]" />
                <span className="text-[10px] font-bold text-on-surface-variant">Recovering</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#EF4444]" />
                <span className="text-[10px] font-bold text-on-surface-variant">Fatigued (&lt;55%)</span>
              </div>
            </div>
          )}

          {/* Quick Metrics Counter */}
          <div className="text-[11px] font-mono text-primary font-bold mx-auto sm:mx-0 flex items-center gap-2">
            <span>{totalStimulatedMuscles} Muscles Stimulated</span>
            <span className="text-on-surface-variant/40">·</span>
            <span>{totalEffectiveSets} Eff Sets</span>
          </div>
        </div>
      )}

      {/* ── Optional Muscle Balance & Symmetry Analysis Card ── */}
      {showSymmetryCard && (
        <div className="w-full mt-4 rounded-2xl bg-surface-container border border-outline-variant/30 overflow-hidden">
          <button
            onClick={() => setSymmetryOpen(!symmetryOpen)}
            className="w-full px-4 py-3 flex items-center justify-between text-xs font-semibold text-on-surface hover:bg-surface-container-high transition-colors"
          >
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-[18px]">balance</span>
              <span>Biomechanical Muscle Symmetry & Balance</span>
            </div>
            <span className="material-symbols-outlined text-[18px]">
              {symmetryOpen ? 'expand_less' : 'expand_more'}
            </span>
          </button>

          {symmetryOpen && (
            <div className="p-4 pt-1 space-y-3 border-t border-outline-variant/20 text-xs">
              <div className="grid grid-cols-3 gap-2 pt-2">
                {/* Push / Pull Ratio */}
                <div className="p-2.5 rounded-xl bg-surface-container-high border border-outline-variant/20">
                  <span className="text-[10px] text-on-surface-variant uppercase font-mono block">
                    Push / Pull
                  </span>
                  <span className="text-lg font-bold text-on-surface mt-0.5 block font-mono">
                    {balanceSummary.pushPullRatio}x
                  </span>
                  <span className="text-[10px] text-on-surface-variant/80">
                    {balanceSummary.pushSets} push vs {balanceSummary.pullSets} pull
                  </span>
                </div>

                {/* Quad / Hamstring Ratio */}
                <div className="p-2.5 rounded-xl bg-surface-container-high border border-outline-variant/20">
                  <span className="text-[10px] text-on-surface-variant uppercase font-mono block">
                    Quad / Hamstring
                  </span>
                  <span className="text-lg font-bold text-on-surface mt-0.5 block font-mono">
                    {balanceSummary.quadHamstringRatio}x
                  </span>
                  <span className="text-[10px] text-on-surface-variant/80">
                    {balanceSummary.quadSets} quads vs {balanceSummary.hamstringSets} hams
                  </span>
                </div>

                {/* Deltoid Ratio */}
                <div className="p-2.5 rounded-xl bg-surface-container-high border border-outline-variant/20">
                  <span className="text-[10px] text-on-surface-variant uppercase font-mono block">
                    Front / Rear Delts
                  </span>
                  <span className="text-lg font-bold text-on-surface mt-0.5 block font-mono">
                    {balanceSummary.deltBalanceRatio}x
                  </span>
                  <span className="text-[10px] text-on-surface-variant/80">
                    {balanceSummary.anteriorDeltSets} front vs {balanceSummary.posteriorDeltSets} rear
                  </span>
                </div>
              </div>

              {/* Training Focus Note */}
              <div className="p-2.5 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary text-[16px]">
                    auto_awesome
                  </span>
                  <span className="text-on-surface">
                    Most Stimulated:{' '}
                    <strong className="text-primary">{balanceSummary.mostTrainedRegion}</strong>
                  </span>
                </div>
                {balanceSummary.leastTrainedRegion !== 'None' && (
                  <span className="text-on-surface-variant text-[11px]">
                    Least Stimulated: {balanceSummary.leastTrainedRegion}
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Interactive Deep Inspection Modal / Drawer ── */}
      {interactive && selectedMuscleId && (
        <MuscleInspectionDrawer
          muscleId={selectedMuscleId}
          metric={metrics[selectedMuscleId]}
          onClose={() => setSelectedMuscleId(null)}
        />
      )}

      {/* ── Shareable Muscle Card Modal ── */}
      <ShareableMuscleCardModal
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
        initialSession={propSessions && propSessions.length > 0 ? propSessions[0] : undefined}
        initialPeriod={
          currentTimeframe === 'session'
            ? 'session'
            : currentTimeframe === '30d'
            ? '30d'
            : '7d'
        }
      />
    </div>
  );
}
