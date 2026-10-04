// ─────────────────────────────────────────────────────────────
// MyFitAI — Session Detail (drill-down modal)
// ─────────────────────────────────────────────────────────────

import { useState } from 'react';
import type { WorkoutSession } from '../../types/workout';
import { formatDuration, formatVolume } from '../../types/workout';
import MuscleHeatmap from '../MuscleHeatmap';
import ShareableMuscleCardModal from '../share/ShareableMuscleCardModal';

interface SessionDetailProps {
  session: WorkoutSession;
  onClose: () => void;
  onDelete: (id: string) => void;
}

export default function SessionDetail({ session, onClose, onDelete }: SessionDetailProps) {
  const [showShareModal, setShowShareModal] = useState(false);
  const date = new Date(session.startedAt);
  const dateStr = date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
  const timeStr = date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });

  return (
    <div className="fixed inset-0 z-[80] flex flex-col justify-end">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-[var(--color-surface)] w-full max-w-md mx-auto h-[85vh] rounded-t-[2rem] border-t border-white/[0.06] flex flex-col animate-slide-up">
        <div className="px-6 pt-4 pb-3 border-b border-white/[0.04] flex-shrink-0">
          <div className="w-12 h-1.5 bg-white/20 rounded-full mx-auto mb-4" />
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-headline font-extrabold text-lg">{session.templateName}</h3>
              <p className="text-[10px] text-on-surface-variant uppercase tracking-wider font-semibold">{dateStr} · {timeStr}</p>
            </div>
            <button onClick={onClose} className="w-9 h-9 rounded-full bg-[var(--color-surface-container)] flex items-center justify-center active:scale-90 transition-transform">
              <span className="material-symbols-outlined text-[18px]">close</span>
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-5">
          {/* Stats row */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Duration', value: formatDuration(session.duration) },
              { label: 'Volume', value: formatVolume(session.totalVolume) },
              { label: 'Sets', value: session.totalSets.toString() },
            ].map(s => (
              <div key={s.label} className="bg-[var(--color-surface-container)] rounded-xl p-3 text-center border border-white/[0.03]">
                <p className="font-headline font-bold text-lg tabular-nums">{s.value}</p>
                <p className="text-[9px] text-on-surface-variant uppercase tracking-widest font-semibold">{s.label}</p>
              </div>
            ))}
          </div>

          {/* PRs */}
          {session.prsHit.length > 0 && (
            <div>
              <h4 className="text-[10px] uppercase tracking-[0.2em] font-bold text-primary mb-2 flex items-center gap-1">
                <span className="material-symbols-outlined text-[12px]">emoji_events</span>PRs Hit
              </h4>
              {session.prsHit.map((pr, i) => (
                <div key={i} className="bg-primary/5 border border-primary/15 rounded-xl px-3 py-2 mb-1.5 flex justify-between items-center">
                  <span className="text-sm font-bold">{pr.exerciseName}</span>
                  <span className="font-mono text-sm font-bold text-primary tabular-nums">{pr.value}</span>
                </div>
              ))}
            </div>
          )}

          {/* Muscle Training Map for this session */}
          <div className="bg-[var(--color-surface-container)] rounded-2xl p-4 border border-white/[0.04]">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5">
                <span className="material-symbols-outlined text-primary text-base">accessibility_new</span>
                <span className="text-[10px] uppercase tracking-wider font-bold text-on-surface">Targeted Muscles</span>
              </div>
              <button
                type="button"
                onClick={() => setShowShareModal(true)}
                className="px-2.5 py-1 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary border border-primary/25 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 active:scale-95 transition-all"
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
              interactive={true}
              className="scale-95 origin-top"
            />
          </div>

          {/* Exercise breakdown */}
          <div>
            <h4 className="text-[10px] uppercase tracking-[0.2em] font-bold text-on-surface-variant mb-3">Exercises</h4>
            <div className="space-y-3">
              {session.exercises.map((ex, i) => (
                <div key={i} className="bg-[var(--color-surface-container)] rounded-xl border border-white/[0.03] p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-1 h-6 bg-primary rounded-full" />
                    <h5 className="font-bold text-sm">{ex.exerciseName}</h5>
                  </div>
                  {/* Set table */}
                  <div className="space-y-1">
                    <div className="grid grid-cols-[24px_1fr_1fr_1fr] gap-2 text-[9px] uppercase tracking-widest text-on-surface-variant/50 font-bold px-1">
                      <span>#</span><span>Weight</span><span>Reps</span><span>RPE</span>
                    </div>
                    {ex.sets.map((set, si) => (
                      <div key={si} className={`grid grid-cols-[24px_1fr_1fr_1fr] gap-2 text-xs px-1 py-1 rounded ${set.skipped ? 'opacity-30 line-through' : ''}`}>
                        <span className="text-on-surface-variant font-bold tabular-nums">{si + 1}</span>
                        <span className="font-bold tabular-nums">{set.weight || '—'}</span>
                        <span className="font-bold tabular-nums">{set.reps || '—'}</span>
                        <span className="text-on-surface-variant tabular-nums">{set.rpe || '—'}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom delete */}
        <div className="px-6 py-4 border-t border-white/[0.04] flex-shrink-0">
          <button onClick={() => { onDelete(session.id); onClose(); }}
            className="w-full py-3 rounded-xl text-error text-[11px] font-bold uppercase tracking-widest bg-error/5 hover:bg-error/10 active:scale-95 transition-all">
            Delete Session
          </button>
        </div>
      </div>

      {/* Shareable Muscle Card Modal */}
      <ShareableMuscleCardModal
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
        initialSession={session}
        initialPeriod="session"
      />
    </div>
  );
}
