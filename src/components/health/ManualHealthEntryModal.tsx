import React, { useState } from 'react';
import { useHealth } from '../../context/HealthContext';
import { X, Footprints, Moon, Check } from 'lucide-react';

interface ManualHealthEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: 'steps' | 'sleep';
}

export default function ManualHealthEntryModal({
  isOpen,
  onClose,
  initialTab = 'steps',
}: ManualHealthEntryModalProps) {
  const { logManualSteps, logManualSleep } = useHealth();
  const [tab, setTab] = useState<'steps' | 'sleep'>(initialTab);
  const [stepInput, setStepInput] = useState('8000');
  const [sleepHours, setSleepHours] = useState('7');
  const [sleepMins, setSleepMins] = useState('30');
  const [saving, setSaving] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (tab === 'steps') {
        const num = parseInt(stepInput, 10);
        if (!isNaN(num) && num > 0) {
          await logManualSteps(num);
        }
      } else {
        const h = parseInt(sleepHours, 10) || 0;
        const m = parseInt(sleepMins, 10) || 0;
        const totalMinutes = h * 60 + m;
        if (totalMinutes > 0) {
          await logManualSleep(totalMinutes);
        }
      }
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-sm bg-[var(--color-surface)] border border-[var(--color-border)] rounded-3xl p-6 shadow-2xl space-y-5">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 w-8 h-8 rounded-full bg-white/[0.06] hover:bg-white/[0.12] flex items-center justify-center text-white/70 hover:text-white transition-colors"
          aria-label="Close"
        >
          <X className="w-4 h-4" />
        </button>

        <div>
          <h2 className="font-headline font-black text-xl text-[var(--color-on-surface)]">
            Manual Health Entry
          </h2>
          <p className="text-xs text-[var(--color-on-surface-variant)] mt-1">
            Log steps or sleep when device integration is unavailable.
          </p>
        </div>

        {/* Tab switch */}
        <div className="flex bg-[var(--color-surface-container)] p-1 rounded-2xl border border-white/[0.04]">
          <button
            type="button"
            onClick={() => setTab('steps')}
            className={`flex-1 py-2.5 rounded-xl text-xs font-headline font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-all ${
              tab === 'steps'
                ? 'bg-emerald-500 text-black shadow-md'
                : 'text-[var(--color-on-surface-variant)] hover:text-white'
            }`}
          >
            <Footprints className="w-3.5 h-3.5" />
            Steps
          </button>
          <button
            type="button"
            onClick={() => setTab('sleep')}
            className={`flex-1 py-2.5 rounded-xl text-xs font-headline font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-all ${
              tab === 'sleep'
                ? 'bg-indigo-500 text-white shadow-md'
                : 'text-[var(--color-on-surface-variant)] hover:text-white'
            }`}
          >
            <Moon className="w-3.5 h-3.5" />
            Sleep
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {tab === 'steps' ? (
            <div className="space-y-2">
              <label className="text-xs font-bold text-[var(--color-on-surface)] block">
                Total Steps Today
              </label>
              <input
                type="number"
                inputMode="numeric"
                min="0"
                max="100000"
                value={stepInput}
                onChange={e => setStepInput(e.target.value)}
                className="w-full bg-[var(--color-surface-container-high)] border border-white/10 rounded-2xl px-4 py-3.5 text-xl font-headline font-bold text-[var(--color-on-surface)] focus:border-emerald-400 outline-none tabular-nums"
                placeholder="e.g. 8426"
                required
              />
            </div>
          ) : (
            <div className="space-y-2">
              <label className="text-xs font-bold text-[var(--color-on-surface)] block">
                Total Sleep Duration
              </label>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="relative">
                    <input
                      type="number"
                      min="0"
                      max="24"
                      value={sleepHours}
                      onChange={e => setSleepHours(e.target.value)}
                      className="w-full bg-[var(--color-surface-container-high)] border border-white/10 rounded-2xl px-4 py-3.5 text-lg font-headline font-bold text-[var(--color-on-surface)] focus:border-indigo-400 outline-none tabular-nums pr-10"
                      required
                    />
                    <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-[var(--color-muted)]">
                      hrs
                    </span>
                  </div>
                </div>
                <div>
                  <div className="relative">
                    <input
                      type="number"
                      min="0"
                      max="59"
                      value={sleepMins}
                      onChange={e => setSleepMins(e.target.value)}
                      className="w-full bg-[var(--color-surface-container-high)] border border-white/10 rounded-2xl px-4 py-3.5 text-lg font-headline font-bold text-[var(--color-on-surface)] focus:border-indigo-400 outline-none tabular-nums pr-10"
                      required
                    />
                    <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-[var(--color-muted)]">
                      mins
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={saving}
            className="w-full py-3.5 rounded-2xl bg-[var(--color-action)] text-white hover:brightness-110 active:scale-[0.98] transition-all font-headline font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-[var(--color-action)]/20 disabled:opacity-50"
          >
            <Check className="w-4 h-4 stroke-[3]" />
            <span>Save Entry</span>
          </button>
        </form>
      </div>
    </div>
  );
}
