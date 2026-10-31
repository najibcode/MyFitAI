// ─────────────────────────────────────────────────────────────
// MyFitAI — Session Summary (post-workout screen)
// Editorial athletic completion moment: key metrics, muscle training summary, share modal
// ─────────────────────────────────────────────────────────────

import type { WorkoutSession } from '../../types/workout';
import { formatDuration, formatVolume } from '../../types/workout';
import { useState } from 'react';
import MuscleHeatmap from '../MuscleHeatmap';
import ShareableMuscleCardModal from '../share/ShareableMuscleCardModal';
import { triggerHaptic } from '../../utils/audioFeedback';
import { CheckCircle2, Trophy, Share2, ArrowRight } from 'lucide-react';

interface SessionSummaryProps {
  session: WorkoutSession;
  onDone: () => void;
}

export default function SessionSummary({ session, onDone }: SessionSummaryProps) {
  const [showShareModal, setShowShareModal] = useState(false);
  const hasPRs = session.prsHit.length > 0;

  // Compute top stimulated muscle groups from session
  const muscleVolumeMap: Record<string, number> = {};
  session.exercises.forEach(ex => {
    const completedSets = ex.sets.filter(s => s.completed && !s.skipped);
    const volume = completedSets.reduce((sum, s) => sum + s.weight * s.reps, 0);
    (ex.primaryMuscles || ['chest']).forEach(m => {
      muscleVolumeMap[m] = (muscleVolumeMap[m] || 0) + volume;
    });
  });

  const muscleRankings = Object.entries(muscleVolumeMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4);
  const maxMuscleVol = Math.max(...Object.values(muscleVolumeMap), 1);

  return (
    <div className="fixed inset-0 z-[100] bg-[#080808] flex flex-col overflow-y-auto">
      <div className="flex-1 px-4 sm:px-6 pt-12 pb-32 max-w-xl mx-auto w-full">
        {/* Editorial Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-[#30D158]/10 border border-[#30D158]/30 mb-4 text-[#30D158]">
            <CheckCircle2 className="w-7 h-7" />
          </div>
          <span className="text-[11px] font-mono uppercase tracking-[0.25em] text-[#30D158] font-bold block mb-1">
            SESSION CONCLUDED
          </span>
          <h1 className="font-headline font-black text-3xl sm:text-4xl text-[#F5F5F5] uppercase tracking-tight">
            WORKOUT COMPLETE
          </h1>
          <p className="text-[#A1A1A6] text-xs font-mono uppercase tracking-wider mt-1">
            {session.templateName || 'Training Session'}
          </p>
        </div>

        {/* 4-Stat Typographic Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-8">
          <div className="bg-[#151517] border border-[#2A2A2D] rounded-xl p-3 text-center">
            <span className="text-[9px] font-mono uppercase tracking-wider text-[#A1A1A6] block mb-1">DURATION</span>
            <span className="font-mono font-black text-xl text-[#F5F5F5] tabular-nums">
              {formatDuration(session.duration)}
            </span>
          </div>

          <div className="bg-[#151517] border border-[#2A2A2D] rounded-xl p-3 text-center">
            <span className="text-[9px] font-mono uppercase tracking-wider text-[#A1A1A6] block mb-1">SETS COMPLETED</span>
            <span className="font-mono font-black text-xl text-[#F5F5F5] tabular-nums">
              {session.totalSets}
            </span>
          </div>

          <div className="bg-[#151517] border border-[#2A2A2D] rounded-xl p-3 text-center">
            <span className="text-[9px] font-mono uppercase tracking-wider text-[#A1A1A6] block mb-1">VOLUME</span>
            <span className="font-mono font-black text-xl text-[#30D158] tabular-nums">
              {formatVolume(session.totalVolume)}
            </span>
          </div>

          <div className="bg-[#151517] border border-[#2A2A2D] rounded-xl p-3 text-center">
            <span className="text-[9px] font-mono uppercase tracking-wider text-[#A1A1A6] block mb-1">RECORDS</span>
            <span className={`font-mono font-black text-xl tabular-nums ${hasPRs ? 'text-[#FF8A00]' : 'text-[#A1A1A6]'}`}>
              {session.prsHit.length} PRs
            </span>
          </div>
        </div>

        {/* Personal Records Banner (if any) */}
        {hasPRs && (
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-3">
              <Trophy className="w-4 h-4 text-[#FF8A00]" />
              <h3 className="text-xs font-mono uppercase tracking-wider text-[#FF8A00] font-bold">
                PERSONAL RECORDS ACHIEVED ({session.prsHit.length})
              </h3>
            </div>
            <div className="space-y-2">
              {session.prsHit.map((pr, i) => (
                <div key={i} className="bg-[#151517] border border-[#FF8A00]/30 rounded-xl px-4 py-3 flex items-center justify-between">
                  <div>
                    <p className="font-bold text-sm text-[#F5F5F5]">{pr.exerciseName}</p>
                    <p className="text-[10px] text-[#A1A1A6] font-mono uppercase tracking-wider">
                      {pr.type === '1rm' ? 'ESTIMATED 1RM' : pr.type} RECORD
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-mono font-black text-lg text-[#FF8A00] tabular-nums">{pr.value}</p>
                    {pr.previousValue && (
                      <p className="text-[10px] text-[#A1A1A6] font-mono">prev {pr.previousValue}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Muscle Stimulus Progress Bars */}
        {muscleRankings.length > 0 && (
          <div className="mb-8">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-mono uppercase tracking-wider text-[#A1A1A6] font-bold">
                MUSCLE TRAINING STIMULUS
              </span>
              <span className="text-[10px] font-mono text-[#30D158] uppercase">Relative Load</span>
            </div>

            <div className="space-y-2.5 bg-[#151517] border border-[#2A2A2D] rounded-xl p-4">
              {muscleRankings.map(([muscle, vol]) => {
                const pct = Math.min(100, Math.round((vol / maxMuscleVol) * 100));
                return (
                  <div key={muscle} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold uppercase tracking-wider text-[#F5F5F5]">
                        {muscle.replace('_', ' ')}
                      </span>
                      <span className="font-mono text-[#A1A1A6] tabular-nums">{formatVolume(vol)}</span>
                    </div>
                    <div className="w-full h-2 bg-[#1E1E20] rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[#30D158] rounded-full transition-all duration-500"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Exercise Performance Breakdown */}
        <div className="mb-8">
          <h3 className="text-xs font-mono uppercase tracking-wider text-[#A1A1A6] font-bold mb-3">
            EXERCISE BREAKDOWN
          </h3>
          <div className="space-y-2">
            {session.exercises.map((ex, i) => {
              const completedSets = ex.sets.filter(s => s.completed && !s.skipped);
              const exVolume = completedSets.reduce((sum, s) => sum + s.weight * s.reps, 0);
              return (
                <div key={i} className="bg-[#151517] border border-[#2A2A2D] rounded-xl px-4 py-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-xs text-[#A1A1A6] font-bold">
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    <div>
                      <p className="font-bold text-sm text-[#F5F5F5] uppercase tracking-tight">{ex.exerciseName}</p>
                      <p className="text-[10px] text-[#A1A1A6] font-mono">{completedSets.length} sets completed</p>
                    </div>
                  </div>
                  <span className="font-mono text-xs font-bold text-[#F5F5F5] tabular-nums">{formatVolume(exVolume)}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Muscle Training Map & Share */}
        <div className="mb-8 p-4 rounded-xl bg-[#151517] border border-[#2A2A2D]">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-mono uppercase tracking-wider text-[#F5F5F5] font-bold">
              ANATOMICAL HEATMAP
            </h3>
            <button
              type="button"
              onClick={() => {
                triggerHaptic('light');
                setShowShareModal(true);
              }}
              className="px-3 py-1.5 rounded-lg bg-[#30D158]/10 hover:bg-[#30D158]/20 text-[#30D158] border border-[#30D158]/30 text-[10px] font-mono font-bold uppercase tracking-wider flex items-center gap-1.5 active:scale-95 transition-all"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>Share Card</span>
            </button>
          </div>

          <MuscleHeatmap
            sessions={[session]}
            mode="target"
            initialView="both"
            showControls={false}
            showLegend={false}
            showShareButton={false}
            interactive={false}
            className="scale-95 origin-top"
          />
        </div>

        {/* Dual Actions: [ VIEW ANALYSIS ] & [ SHARE PROGRESS ] */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
          <button
            type="button"
            onClick={() => {
              triggerHaptic('medium');
              setShowShareModal(true);
            }}
            className="h-12 rounded-xl bg-[#151517] border border-[#2A2A2D] text-[#F5F5F5] hover:bg-[#1E1E20] font-mono font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 active:scale-95 transition-all"
          >
            <Share2 className="w-4 h-4 text-[#30D158]" />
            <span>Share Progress</span>
          </button>

          <button
            onClick={onDone}
            className="h-12 rounded-xl bg-[#30D158] hover:bg-[#5EEB78] text-black font-mono font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 active:scale-95 transition-transform shadow-lg shadow-[#30D158]/10"
          >
            <span>Finish & Save</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Share Progress Card Modal */}
      <ShareableMuscleCardModal
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
        initialSession={session}
        initialPeriod="session"
      />
    </div>
  );
}

