// ─────────────────────────────────────────────────────────────
// MyFitAI — Session Summary (post-workout screen)
// ─────────────────────────────────────────────────────────────

import type { WorkoutSession } from '../../types/workout';
import { formatDuration, formatVolume } from '../../types/workout';
import { useState, useMemo } from 'react';
import type { CSSProperties } from 'react';
import MuscleHeatmap from '../MuscleHeatmap';
import ShareableMuscleCardModal from '../share/ShareableMuscleCardModal';
import { triggerHaptic } from '../../utils/audioFeedback';

interface SessionSummaryProps {
  session: WorkoutSession;
  onDone: () => void;
}

export default function SessionSummary({ session, onDone }: SessionSummaryProps) {
  const [showShareModal, setShowShareModal] = useState(false);
  const hasPRs = session.prsHit.length > 0;
  const confettiPieces = useMemo(
    () => Array.from({ length: 30 }, (_, i) => ({
      left: `${(i * 37) % 100}%`,
      duration: `${1.5 + ((i * 17) % 20) / 10}s`,
      delay: `${((i * 7) % 5) / 10}s`,
      color: ['#FF7A00', '#6FFB85', '#FAB0FF', '#FBBF24', '#60A5FA'][i % 5],
      rotation: `${360 + ((i * 29) % 360)}deg`,
    })),
    []
  );

  return (
    <div className="fixed inset-0 z-[100] bg-background flex flex-col animate-in fade-in duration-500">
      {/* Confetti overlay for PRs */}
      {hasPRs && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
          {confettiPieces.map((piece, i) => (
            <div
              key={i}
              className="absolute w-2 h-2 rounded-full"
              style={{
                left: piece.left,
                top: `-5%`,
                backgroundColor: piece.color,
                '--confetti-rotation': piece.rotation,
                animation: `confettiFall ${piece.duration} ease-in ${piece.delay} forwards`,
              } as CSSProperties & { '--confetti-rotation': string }}
            />
          ))}
          <style>{`
            @keyframes confettiFall {
              0% { transform: translateY(0) rotate(0deg); opacity: 1; }
              100% { transform: translateY(110vh) rotate(var(--confetti-rotation)); opacity: 0; }
            }
          `}</style>
        </div>
      )}

      <div className="flex-1 overflow-y-auto px-6 pt-16 pb-32 max-w-md mx-auto w-full relative z-10">
        {/* Top badge */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-primary/10 border-2 border-primary/30 mb-4 animate-scale-in">
            <span className="material-symbols-outlined text-primary text-4xl" style={{ fontVariationSettings: "'FILL' 1" }}>
              {hasPRs ? 'emoji_events' : 'check_circle'}
            </span>
          </div>
          <h1 className="font-headline font-black text-3xl tracking-tight mb-1">
            {hasPRs ? 'New Records!' : 'Workout Complete'}
          </h1>
          <p className="text-on-surface-variant text-sm">{session.templateName}</p>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          {[
            { label: 'Duration', value: formatDuration(session.duration), icon: 'timer' },
            { label: 'Volume', value: formatVolume(session.totalVolume), unit: 'lbs', icon: 'fitness_center' },
            { label: 'Sets', value: session.totalSets.toString(), icon: 'repeat' },
            { label: 'Exercises', value: session.exercises.length.toString(), icon: 'list' },
          ].map(stat => (
            <div key={stat.label} className="bg-[var(--color-surface-container)] rounded-2xl p-4 border border-white/[0.04]">
              <span className="material-symbols-outlined text-primary text-lg mb-2 block" style={{ fontVariationSettings: "'FILL' 1" }}>{stat.icon}</span>
              <p className="font-headline font-black text-2xl tabular-nums">{stat.value}
                {stat.unit && <span className="text-xs font-normal text-on-surface-variant ml-1">{stat.unit}</span>}
              </p>
              <p className="text-[10px] text-on-surface-variant uppercase tracking-widest font-semibold mt-0.5">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* PRs section */}
        {hasPRs && (
          <div className="mb-6">
            <h3 className="text-[11px] uppercase tracking-[0.2em] font-bold text-primary mb-3 flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[14px]">emoji_events</span>
              Personal Records ({session.prsHit.length})
            </h3>
            <div className="space-y-2">
              {session.prsHit.map((pr, i) => (
                <div key={i} className="bg-primary/5 border border-primary/15 rounded-xl px-4 py-3 flex items-center justify-between">
                  <div>
                    <p className="font-bold text-sm text-on-surface">{pr.exerciseName}</p>
                    <p className="text-[10px] text-on-surface-variant uppercase tracking-wider">
                      {pr.type === '1rm' ? 'Est. 1RM' : pr.type} PR
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-headline font-black text-lg text-primary tabular-nums">{pr.value}</p>
                    {pr.previousValue && (
                      <p className="text-[10px] text-on-surface-variant">was {pr.previousValue}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Exercise summary */}
        <div className="mb-6">
          <h3 className="text-[11px] uppercase tracking-[0.2em] font-bold text-on-surface-variant mb-3">Exercise Breakdown</h3>
          <div className="space-y-2">
            {session.exercises.map((ex, i) => {
              const completedSets = ex.sets.filter(s => s.completed && !s.skipped);
              const exVolume = completedSets.reduce((sum, s) => sum + s.weight * s.reps, 0);
              return (
                <div key={i} className="bg-[var(--color-surface-container)] rounded-xl px-4 py-3 flex items-center justify-between border border-white/[0.03]">
                  <div className="flex items-center gap-2">
                    <div className="w-1 h-6 bg-primary/40 rounded-full" />
                    <div>
                      <p className="font-bold text-sm text-on-surface">{ex.exerciseName}</p>
                      <p className="text-[10px] text-on-surface-variant">{completedSets.length} sets</p>
                    </div>
                  </div>
                  <span className="font-mono text-sm font-bold text-on-surface-variant tabular-nums">{formatVolume(exVolume)}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Muscle Training Map & Share Progress Card */}
        <div className="mb-6 p-4 rounded-2xl bg-[var(--color-surface-container)] border border-white/[0.04]">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-base">accessibility_new</span>
              <h3 className="text-[11px] uppercase tracking-[0.2em] font-bold text-on-surface">
                Muscles Stimulated
              </h3>
            </div>
            <button
              type="button"
              onClick={() => {
                triggerHaptic('light');
                setShowShareModal(true);
              }}
              className="px-2.5 py-1 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 active:scale-95 transition-all"
            >
              <span className="material-symbols-outlined text-xs">share</span>
              Share Card
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

          <button
            type="button"
            onClick={() => {
              triggerHaptic('medium');
              setShowShareModal(true);
            }}
            className="w-full mt-3 py-3 rounded-xl bg-gradient-to-r from-primary/20 via-primary/10 to-transparent hover:border-primary/40 border border-primary/30 text-primary font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 active:scale-95 transition-all shadow-sm"
          >
            <span className="material-symbols-outlined text-base">share</span>
            Share Workout & Muscle Map
          </button>
        </div>
      </div>

      {/* Bottom CTA */}
      <div className="fixed bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-background via-background to-transparent z-20">
        <button onClick={onDone}
          className="w-full max-w-md mx-auto block bg-primary text-on-primary py-4 rounded-2xl font-bold text-sm uppercase tracking-widest active:scale-95 transition-transform shadow-lg">
          Done
        </button>
      </div>

      {/* Share Card Modal */}
      <ShareableMuscleCardModal
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
        initialSession={session}
        initialPeriod="session"
      />
    </div>
  );
}
