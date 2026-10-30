// ─────────────────────────────────────────────────────────────
// MyFitAI — Rest Timer (Full-screen countdown overlay)
// ─────────────────────────────────────────────────────────────

import { triggerHaptic } from '../../utils/audioFeedback';
import { Plus, SkipForward } from 'lucide-react';

interface RestTimerProps {
  remaining: number;
  total: number;
  onSkip: () => void;
  onAddTime: (seconds: number) => void;
}

export default function RestTimer({ remaining, total, onSkip, onAddTime }: RestTimerProps) {
  const progress = total > 0 ? Math.min(1, Math.max(0, (total - remaining) / total)) : 0;
  const r = 110;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - progress);
  const mins = Math.floor(remaining / 60);
  const secs = remaining % 60;
  const isWarning = remaining <= 10 && remaining > 0;

  return (
    <div className="fixed inset-0 z-[200] bg-black/95 backdrop-blur-md flex flex-col items-center justify-center animate-in fade-in duration-300">
      <p className={`text-[11px] font-mono uppercase tracking-[0.25em] font-bold mb-8 transition-colors ${
        isWarning ? 'text-amber-400 animate-pulse' : 'text-[#A1A1A6]'
      }`}>
        {isWarning ? '⚡ PREPARE FOR NEXT SET' : 'REST PERIOD'}
      </p>
      <div className="relative w-64 h-64 mb-10">
        <svg className="w-full h-full transform -rotate-90" viewBox="0 0 256 256">
          <circle cx="128" cy="128" r={r} fill="transparent" stroke="#1E1E20" strokeWidth="6" />
          <circle
            cx="128"
            cy="128"
            r={r}
            fill="transparent"
            stroke={isWarning ? '#F59E0B' : '#30D158'}
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={circ}
            strokeDashoffset={offset}
            style={{ transition: 'stroke-dashoffset 1s linear, stroke 300ms ease' }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={`font-mono font-black text-6xl tabular-nums tracking-tight transition-colors ${
            isWarning ? 'text-amber-400 animate-pulse' : 'text-[#F5F5F5]'
          }`}>
            {String(mins).padStart(2, '0')}:{String(secs).padStart(2, '0')}
          </span>
          <span className="text-[10px] text-[#A1A1A6] font-mono uppercase tracking-widest mt-2">
            {isWarning ? 'READY' : 'REMAINING'}
          </span>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <button
          onClick={() => {
            triggerHaptic('light');
            onAddTime(-15);
          }}
          disabled={remaining <= 15}
          className="h-12 px-4 rounded-xl bg-[#151517] border border-[#2A2A2D] text-[#A1A1A6] hover:text-[#F5F5F5] disabled:opacity-40 text-xs font-mono font-bold uppercase tracking-wider flex items-center gap-1 active:scale-95 transition-transform"
        >
          <span>-15s</span>
        </button>
        <button
          onClick={() => {
            triggerHaptic('light');
            onAddTime(30);
          }}
          className="h-12 px-5 rounded-xl bg-[#151517] border border-[#2A2A2D] text-[#F5F5F5] text-xs font-mono font-bold uppercase tracking-wider flex items-center gap-1.5 active:scale-95 transition-transform"
        >
          <Plus className="w-4 h-4" />
          <span>+30s</span>
        </button>
        <button
          onClick={() => {
            triggerHaptic('medium');
            onSkip();
          }}
          className="h-12 px-7 rounded-xl bg-[#30D158] text-black text-xs font-mono font-black uppercase tracking-wider flex items-center gap-2 active:scale-95 transition-transform shadow-lg shadow-[#30D158]/20"
        >
          <SkipForward className="w-4 h-4" />
          <span>Skip</span>
        </button>
      </div>
    </div>
  );
}
