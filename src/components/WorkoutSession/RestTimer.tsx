// ─────────────────────────────────────────────────────────────
// MyFitAI — Rest Timer (Full-screen countdown overlay)
// ─────────────────────────────────────────────────────────────

import { triggerHaptic } from '../../utils/audioFeedback';

interface RestTimerProps {
  remaining: number;
  total: number;
  onSkip: () => void;
  onAddTime: (seconds: number) => void;
}

export default function RestTimer({ remaining, total, onSkip, onAddTime }: RestTimerProps) {

  const progress = total > 0 ? (total - remaining) / total : 0;
  const r = 110;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - progress);
  const mins = Math.floor(remaining / 60);
  const secs = remaining % 60;

  return (
    <div className="fixed inset-0 z-[200] bg-black/90 backdrop-blur-2xl flex flex-col items-center justify-center animate-in fade-in duration-300">
      <p className="text-[11px] uppercase tracking-[0.3em] font-bold text-on-surface-variant mb-8">Rest Period</p>
      <div className="relative w-64 h-64 mb-10">
        <svg className="w-full h-full transform -rotate-90" viewBox="0 0 256 256">
          <circle cx="128" cy="128" r={r} fill="transparent" stroke="var(--color-surface-container-highest)" strokeWidth="6" />
          <circle cx="128" cy="128" r={r} fill="transparent" stroke="var(--color-primary)" strokeWidth="6" strokeLinecap="round"
            strokeDasharray={circ} strokeDashoffset={offset} style={{ transition: 'stroke-dashoffset 1s linear' }} />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-mono font-black text-6xl text-on-surface tabular-nums tracking-tight">
            {String(mins).padStart(2, '0')}:{String(secs).padStart(2, '0')}
          </span>
          <span className="text-[10px] text-on-surface-variant uppercase tracking-widest font-semibold mt-2">Remaining</span>
        </div>
      </div>
      <div className="flex items-center gap-4">
        <button
          onClick={() => {
            triggerHaptic('light');
            onAddTime(30);
          }}
          className="h-12 px-6 rounded-2xl bg-[var(--color-surface-container)] border border-white/[0.06] text-on-surface text-sm font-bold uppercase tracking-wider flex items-center gap-2 active:scale-95 transition-transform"
        >
          <span className="material-symbols-outlined text-[18px]">add</span>+30s
        </button>
        <button
          onClick={() => {
            triggerHaptic('medium');
            onSkip();
          }}
          className="h-12 px-8 rounded-2xl bg-primary text-on-primary text-sm font-bold uppercase tracking-wider flex items-center gap-2 active:scale-95 transition-transform shadow-lg"
        >
          <span className="material-symbols-outlined text-[18px]">skip_next</span>Skip
        </button>
      </div>
    </div>
  );
}
