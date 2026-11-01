// ─────────────────────────────────────────────────────────────
// MyFitAI — Session Detail (drill-down modal)
// Athletic Personal Operating System UI/UX
// ─────────────────────────────────────────────────────────────

import { useState } from 'react';
import type { WorkoutSession } from '../../types/workout';
import { formatDuration, formatVolume } from '../../types/workout';
import MuscleHeatmap from '../MuscleHeatmap';
import ShareableMuscleCardModal from '../share/ShareableMuscleCardModal';
import { X, Trophy, Share2, Activity, Trash2 } from 'lucide-react';

interface SessionDetailProps {
  session: WorkoutSession;
  onClose: () => void;
  onDelete: (id: string) => void;
}

export default function SessionDetail({ session, onClose, onDelete }: SessionDetailProps) {
  const [showShareModal, setShowShareModal] = useState(false);
  const date = new Date(session.startedAt);
  const dateStr = date.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
  const timeStr = date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });

  return (
    <div className="fixed inset-0 z-[80] flex flex-col justify-end">
      <div className="absolute inset-0 bg-black/75 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-[#151517] w-full max-w-xl mx-auto h-[88vh] rounded-t-3xl border-t border-[#2A2A2D] flex flex-col animate-slide-up shadow-2xl">
        <div className="px-6 pt-4 pb-3 border-b border-[#2A2A2D] flex-shrink-0">
          <div className="w-12 h-1 bg-[#2A2A2D] rounded-full mx-auto mb-3" />
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-headline font-black text-lg text-[#F5F5F5] uppercase tracking-wide">
                {session.templateName}
              </h3>
              <p className="text-[10px] font-mono text-[#A1A1A6] uppercase tracking-wider font-semibold">
                {dateStr} · {timeStr}
              </p>
            </div>
            <button
              onClick={onClose}
              className="w-9 h-9 rounded-xl bg-[#1E1E20] border border-[#2A2A2D] flex items-center justify-center text-[#A1A1A6] hover:text-[#F5F5F5] active:scale-90 transition-transform"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-5">
          {/* Stats row */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Duration', value: formatDuration(session.duration) },
              { label: 'Volume', value: `${formatVolume(session.totalVolume)} kg` },
              { label: 'Sets', value: session.totalSets.toString() },
            ].map(s => (
              <div
                key={s.label}
                className="bg-[#1E1E20] rounded-2xl p-3.5 text-center border border-[#2A2A2D]"
              >
                <p className="font-headline font-black text-lg text-[#F5F5F5] tabular-nums font-mono">
                  {s.value}
                </p>
                <p className="text-[9px] font-mono text-[#A1A1A6] uppercase tracking-widest font-bold">
                  {s.label}
                </p>
              </div>
            ))}
          </div>

          {/* PRs */}
          {session.prsHit.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-[10px] font-mono uppercase tracking-widest font-bold text-[#30D158] flex items-center gap-1.5">
                <Trophy className="w-3.5 h-3.5" />
                <span>Personal Records Hit</span>
              </h4>
              <div className="space-y-1.5">
                {session.prsHit.map((pr, i) => (
                  <div
                    key={i}
                    className="bg-[#30D158]/10 border border-[#30D158]/20 rounded-xl px-3.5 py-2.5 flex justify-between items-center"
                  >
                    <span className="text-xs font-headline font-bold text-[#F5F5F5]">
                      {pr.exerciseName}
                    </span>
                    <span className="font-mono text-xs font-black text-[#30D158] tabular-nums">
                      {pr.value}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Muscle Training Map for this session */}
          <div className="bg-[#1E1E20] rounded-2xl p-4 border border-[#2A2A2D] space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-[#30D158]">
                <Activity className="w-4 h-4" />
                <span className="text-[10px] font-mono uppercase tracking-wider font-bold text-[#F5F5F5]">
                  Session Targeted Muscles
                </span>
              </div>
              <button
                type="button"
                onClick={() => setShowShareModal(true)}
                className="px-3 py-1 rounded-lg bg-[#30D158]/15 hover:bg-[#30D158]/25 text-[#30D158] border border-[#30D158]/30 text-[10px] font-mono font-bold uppercase tracking-wider flex items-center gap-1.5 active:scale-95 transition-all"
              >
                <Share2 className="w-3 h-3" />
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
          <div className="space-y-3">
            <h4 className="text-[10px] font-mono uppercase tracking-widest font-bold text-[#A1A1A6]">
              Logged Exercises
            </h4>
            <div className="space-y-3">
              {session.exercises.map((ex, i) => (
                <div
                  key={i}
                  className="bg-[#1E1E20] rounded-2xl border border-[#2A2A2D] p-4 space-y-2.5"
                >
                  <div className="flex items-center gap-2">
                    <div className="w-1 h-5 bg-[#30D158] rounded-full" />
                    <h5 className="font-headline font-bold text-sm text-[#F5F5F5]">
                      {ex.exerciseName}
                    </h5>
                  </div>
                  {/* Set table */}
                  <div className="space-y-1">
                    <div className="grid grid-cols-[24px_1fr_1fr_1fr] gap-2 text-[9px] font-mono uppercase tracking-wider text-[#6B6B70] font-bold px-1">
                      <span>#</span>
                      <span>Weight</span>
                      <span>Reps</span>
                      <span>RPE</span>
                    </div>
                    {ex.sets.map((set, si) => (
                      <div
                        key={si}
                        className={`grid grid-cols-[24px_1fr_1fr_1fr] gap-2 text-xs font-mono px-1 py-1 rounded ${
                          set.skipped ? 'opacity-30 line-through text-[#6B6B70]' : 'text-[#F5F5F5]'
                        }`}
                      >
                        <span className="text-[#A1A1A6] font-bold tabular-nums">
                          {si + 1}
                        </span>
                        <span className="font-bold tabular-nums">
                          {set.weight ? `${set.weight} kg` : '—'}
                        </span>
                        <span className="font-bold tabular-nums">
                          {set.reps || '—'}
                        </span>
                        <span className="text-[#A1A1A6] tabular-nums">
                          {set.rpe || '—'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom delete */}
        <div className="px-6 py-4 border-t border-[#2A2A2D] flex-shrink-0">
          <button
            onClick={() => {
              onDelete(session.id);
              onClose();
            }}
            className="w-full py-3 rounded-xl text-[#FF453A] font-headline font-bold text-xs uppercase tracking-wider bg-[#FF453A]/10 hover:bg-[#FF453A]/20 border border-[#FF453A]/20 active:scale-98 transition-all flex items-center justify-center gap-1.5"
          >
            <Trash2 className="w-4 h-4" />
            <span>Delete Session</span>
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
