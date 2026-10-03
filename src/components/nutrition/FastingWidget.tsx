// ─────────────────────────────────────────────────────────────
// MyFitAI — Fasting Tracker Widget
// Intermittent fasting timer with evidence-based protocols (16:8, 14:10, OMAD)
// and psychologically healthy, non-punitive progress tracking.
// ─────────────────────────────────────────────────────────────

import { useState, useEffect } from 'react';
import type { FastingProtocol, FastingSession } from '../../types/nutrition';

interface FastingWidgetProps {
  activeFast: FastingSession | null;
  onStartFast: (protocol: FastingProtocol, hours: number) => Promise<any>;
  onFinishFast: () => Promise<any>;
  onCancelFast: () => Promise<any>;
}

const PROTOCOLS: Array<{ protocol: FastingProtocol; hours: number; label: string; desc: string }> = [
  { protocol: '16:8', hours: 16, label: '16:8 Leangains', desc: '16h fast, 8h eating window' },
  { protocol: '14:10', hours: 14, label: '14:10 Gentle', desc: '14h fast, 10h eating window' },
  { protocol: '12:12', hours: 12, label: '12:12 Circadian', desc: '12h fast, 12h eating window' },
  { protocol: '18:6', hours: 18, label: '18:6 Warrior', desc: '18h fast, 6h eating window' },
  { protocol: '20:4', hours: 20, label: '20:4 Deep Fast', desc: '20h fast, 4h eating window' },
  { protocol: 'OMAD', hours: 23, label: 'OMAD (23:1)', desc: 'One meal a day' },
];

export default function FastingWidget({
  activeFast,
  onStartFast,
  onFinishFast,
  onCancelFast,
}: FastingWidgetProps) {
  const [selectedProtocol, setSelectedProtocol] = useState<FastingProtocol>('16:8');
  const [elapsedMs, setElapsedMs] = useState<number>(0);
  const [showConfig, setShowConfig] = useState(false);

  // Live timer tick
  useEffect(() => {
    if (!activeFast) {
      setElapsedMs(0);
      return;
    }

    const start = new Date(activeFast.startTime).getTime();
    const update = () => {
      setElapsedMs(Math.max(0, Date.now() - start));
    };

    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [activeFast]);

  const targetHours = activeFast?.targetHours || 16;
  const targetMs = targetHours * 60 * 60 * 1000;
  const progressPercent = Math.min(100, (elapsedMs / targetMs) * 100);
  const remainingMs = Math.max(0, targetMs - elapsedMs);

  const formatHoursMinutes = (ms: number) => {
    const totalSecs = Math.floor(ms / 1000);
    const hrs = Math.floor(totalSecs / 3600);
    const mins = Math.floor((totalSecs % 3600) / 60);
    const secs = totalSecs % 60;
    return `${hrs}h ${mins}m ${secs}s`;
  };

  const currentProto = PROTOCOLS.find(p => p.protocol === selectedProtocol) || PROTOCOLS[0];

  return (
    <div className="bg-[var(--color-surface-container)] rounded-2xl p-5 border border-white/5 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-primary text-xl" style={{ fontVariationSettings: "'FILL' 1" }}>
            timer
          </span>
          <h3 className="font-headline font-bold text-base text-on-surface">Intermittent Fasting</h3>
        </div>

        {activeFast ? (
          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            Fasting Active
          </span>
        ) : (
          <button
            onClick={() => setShowConfig(!showConfig)}
            className="text-xs text-primary font-semibold hover:underline"
          >
            {showConfig ? 'Hide Settings' : 'Protocol Options'}
          </button>
        )}
      </div>

      {/* Active Fasting State */}
      {activeFast ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] uppercase font-bold text-on-surface-variant">Elapsed Fast Time</p>
              <p className="font-headline font-black text-2xl text-on-surface mt-0.5">
                {formatHoursMinutes(elapsedMs)}
              </p>
            </div>
            <div className="text-right">
              <p className="text-[10px] uppercase font-bold text-on-surface-variant">Target Window ({activeFast.protocol})</p>
              <p className="text-xs text-primary font-semibold mt-0.5">
                {remainingMs > 0 ? `${formatHoursMinutes(remainingMs)} remaining` : 'Target Completed! 🎉'}
              </p>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="w-full bg-white/[0.04] h-2.5 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                progressPercent >= 100 ? 'bg-emerald-400' : 'bg-primary'
              }`}
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          <div className="flex gap-2">
            <button
              onClick={onFinishFast}
              className="flex-1 py-2.5 px-3 bg-emerald-500 text-black font-bold text-xs uppercase tracking-wide rounded-xl shadow-md active:scale-95 transition-all"
            >
              End Fast & Eat
            </button>
            <button
              onClick={onCancelFast}
              className="py-2.5 px-4 bg-white/5 hover:bg-white/10 text-on-surface-variant text-xs font-bold rounded-xl active:scale-95 transition-all"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        /* Inactive Fasting State */
        <div className="space-y-3">
          <p className="text-xs text-on-surface-variant leading-relaxed">
            Fast during rest and eat during designated nourishment windows. Supports cellular repair and digestive rest.
          </p>

          {showConfig && (
            <div className="grid grid-cols-2 gap-2 pt-1 animate-fade-in">
              {PROTOCOLS.map(p => (
                <button
                  key={p.protocol}
                  onClick={() => setSelectedProtocol(p.protocol)}
                  className={`p-2.5 rounded-xl border text-left transition-all ${
                    selectedProtocol === p.protocol
                      ? 'bg-primary/10 border-primary text-on-surface'
                      : 'bg-white/[0.02] border-white/5 text-on-surface-variant hover:text-on-surface'
                  }`}
                >
                  <span className="font-bold text-xs block text-on-surface">{p.label}</span>
                  <span className="text-[10px] text-on-surface-variant block mt-0.5">{p.desc}</span>
                </button>
              ))}
            </div>
          )}

          <div className="flex items-center justify-between pt-1">
            <span className="text-xs font-semibold text-on-surface">
              Selected: <strong className="text-primary">{currentProto.label}</strong>
            </span>
            <button
              onClick={() => onStartFast(currentProto.protocol, currentProto.hours)}
              className="py-2 px-4 bg-primary text-black font-headline font-bold text-xs uppercase tracking-wider rounded-xl shadow-md shadow-primary/20 active:scale-95 transition-all"
            >
              Start Fast
            </button>
          </div>
        </div>
      )}

      {/* Safety notice */}
      <p className="text-[10px] text-on-surface-variant/70 italic text-center pt-1 border-t border-white/[0.03]">
        Safety note: Fasting is optional. Stay hydrated with water or electrolyte infusions. Stop if feeling unwell.
      </p>
    </div>
  );
}
