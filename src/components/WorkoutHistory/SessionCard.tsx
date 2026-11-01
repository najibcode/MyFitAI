// ─────────────────────────────────────────────────────────────
// MyFitAI — Session Card (compact history card)
// Athletic Personal Operating System UI/UX
// ─────────────────────────────────────────────────────────────

import type { WorkoutSession } from '../../types/workout';
import { formatDuration, formatVolume } from '../../types/workout';
import { Trophy, Trash2, Clock, Dumbbell, Repeat } from 'lucide-react';

interface SessionCardProps {
  session: WorkoutSession;
  onTap: (id: string) => void;
  onDelete: (id: string) => void;
}

function relativeDate(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diff = Math.floor((now.getTime() - d.getTime()) / 86400000);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Yesterday';
  if (diff < 7) return d.toLocaleDateString('en-US', { weekday: 'long' });
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

export default function SessionCard({ session, onTap, onDelete }: SessionCardProps) {
  const hasPRs = session.prsHit.length > 0;

  return (
    <div
      onClick={() => onTap(session.id)}
      className="bg-[#151517] rounded-2xl border border-[#2A2A2D] p-4 cursor-pointer hover:border-[#3A3A3D] transition-all active:scale-[0.99] group relative space-y-3"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h4 className="font-headline font-bold text-sm text-[#F5F5F5] truncate">
              {session.templateName}
            </h4>
            {hasPRs && (
              <span className="bg-[#30D158]/15 text-[#30D158] border border-[#30D158]/30 text-[9px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded-md flex-shrink-0 flex items-center gap-1">
                <Trophy className="w-3 h-3" />
                {session.prsHit.length} PR{session.prsHit.length > 1 ? 's' : ''}
              </span>
            )}
          </div>
          <p className="text-[10px] font-mono font-semibold text-[#A1A1A6] uppercase tracking-wider">
            {relativeDate(session.startedAt)}
          </p>
        </div>

        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete(session.id);
          }}
          className="w-7 h-7 rounded-lg flex items-center justify-center text-[#6B6B70] hover:text-[#FF453A] hover:bg-[#FF453A]/10 transition-all active:scale-90"
          aria-label="Delete Session"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      <div className="flex items-center gap-4 text-xs font-mono text-[#A1A1A6]">
        <span className="flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5 text-[#30D158]" />
          <span className="tabular-nums">{formatDuration(session.duration)}</span>
        </span>
        <span className="flex items-center gap-1.5">
          <Dumbbell className="w-3.5 h-3.5 text-[#FF8A00]" />
          <span className="tabular-nums">{formatVolume(session.totalVolume)} kg</span>
        </span>
        <span className="flex items-center gap-1.5">
          <Repeat className="w-3.5 h-3.5 text-[#4F9CF9]" />
          <span className="tabular-nums">{session.totalSets} sets</span>
        </span>
      </div>

      {/* Muscle badges */}
      {session.musclesWorked.length > 0 && (
        <div className="flex gap-1.5 pt-1 flex-wrap">
          {session.musclesWorked.slice(0, 4).map(m => (
            <span
              key={m}
              className="text-[9px] font-mono uppercase tracking-wider bg-[#1E1E20] border border-[#2A2A2D] text-[#A1A1A6] px-2 py-0.5 rounded font-medium"
            >
              {m}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
