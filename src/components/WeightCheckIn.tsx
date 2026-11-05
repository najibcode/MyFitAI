// ─────────────────────────────────────────────────────────────
// MyFitAI — Athlete Weight Check-In Modal
// Athletic Personal Operating System UI/UX
// ─────────────────────────────────────────────────────────────

import { useState, useRef, useEffect } from 'react';
import { useFitnessContext } from '../context/FitnessContext';
import { usePreferences } from '../context/PreferencesContext';
import { Scale, Minus, Plus, Check } from 'lucide-react';

export default function WeightCheckIn() {
  const { profile, logWeight, dismissWeightCheckIn, needsWeightCheckIn, weightHistory } = useFitnessContext();
  const { weightUnit } = usePreferences();
  const [isOpen, setIsOpen] = useState(true);
  const inputRef = useRef<HTMLInputElement>(null);

  const lastEntry = weightHistory.length > 0 ? weightHistory[weightHistory.length - 1] : null;
  const lastWeight = lastEntry ? lastEntry.weight : profile.weight;

  // Display weight in user's preferred unit
  const toDisplay = (lbs: number) => (weightUnit === 'kg' ? Math.round((lbs / 2.20462) * 10) / 10 : lbs);
  const fromDisplay = (val: number) => (weightUnit === 'kg' ? Math.round(val * 2.20462 * 10) / 10 : val);

  const [inputValue, setInputValue] = useState(toDisplay(lastWeight).toString());

  // Auto-focus input on open
  useEffect(() => {
    if (needsWeightCheckIn && isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [needsWeightCheckIn, isOpen]);

  if (!needsWeightCheckIn || !isOpen) return null;

  const handleSave = () => {
    const numVal = parseFloat(inputValue);
    if (isNaN(numVal) || numVal <= 0) return;
    logWeight(fromDisplay(numVal));
    setIsOpen(false);
  };

  const handleDismiss = () => {
    dismissWeightCheckIn();
    setIsOpen(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSave();
    if (e.key === 'Escape') handleDismiss();
  };

  const adjust = (delta: number) => {
    const current = parseFloat(inputValue) || 0;
    const step = weightUnit === 'kg' ? 0.5 : 1;
    const newVal = Math.max(0, current + delta * step);
    setInputValue(newVal.toFixed(1));
  };

  const changeFromLast = () => {
    const current = parseFloat(inputValue) || 0;
    const last = toDisplay(lastWeight);
    const diff = current - last;
    if (Math.abs(diff) < 0.05) return null;
    return diff;
  };

  const diff = changeFromLast();

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/75 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="bg-[#151517] w-full max-w-sm rounded-3xl p-6 sm:p-7 shadow-2xl border border-[#2A2A2D] space-y-5 animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="text-center space-y-1">
          <div className="w-12 h-12 rounded-2xl bg-[#30D158]/15 border border-[#30D158]/30 flex items-center justify-center mx-auto mb-2 text-[#30D158]">
            <Scale className="w-6 h-6" />
          </div>
          <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-[#30D158] block">
            BIOMETRIC TRACKING
          </span>
          <h2 className="font-headline font-black text-xl text-[#F5F5F5] uppercase tracking-tight">
            Morning Weigh-In
          </h2>
          <p className="text-xs text-[#A1A1A6]">
            Log your fasted morning bodyweight for accurate caloric pacing.
          </p>
        </div>

        {/* Last Weight Reference */}
        {lastEntry && (
          <div className="bg-[#1E1E20] rounded-xl px-3.5 py-2 border border-[#2A2A2D] flex items-center justify-between text-xs font-mono">
            <span className="text-[#A1A1A6]">Last recorded</span>
            <span className="text-[#F5F5F5] font-bold">
              {toDisplay(lastEntry.weight)} {weightUnit}
              <span className="text-[#6B6B70] font-normal ml-2 text-[10px]">
                {new Date(lastEntry.date + 'T00:00:00').toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                })}
              </span>
            </span>
          </div>
        )}

        {/* Weight Input */}
        <div className="flex items-center justify-center gap-3 py-2">
          <button
            type="button"
            onClick={() => adjust(-1)}
            className="w-11 h-11 rounded-xl bg-[#1E1E20] border border-[#2A2A2D] flex items-center justify-center text-[#A1A1A6] hover:text-[#F5F5F5] hover:bg-[#2A2A2D] transition-all active:scale-90"
            aria-label="Decrease weight"
          >
            <Minus className="w-5 h-5" />
          </button>

          <div className="flex-1 text-center">
            <input
              ref={inputRef}
              type="text"
              inputMode="decimal"
              pattern="[0-9]*\.?[0-9]*"
              value={inputValue}
              onChange={e => {
                const val = e.target.value;
                if (val === '' || /^\d*\.?\d*$/.test(val)) {
                  setInputValue(val);
                }
              }}
              onKeyDown={handleKeyDown}
              className="w-full bg-transparent text-center font-headline font-black text-5xl text-[#F5F5F5] tracking-tight outline-none tabular-nums"
              placeholder="0.0"
            />
            <p className="text-[#30D158] font-mono text-xs font-bold uppercase tracking-widest mt-1">
              {weightUnit}
            </p>
          </div>

          <button
            type="button"
            onClick={() => adjust(1)}
            className="w-11 h-11 rounded-xl bg-[#1E1E20] border border-[#2A2A2D] flex items-center justify-center text-[#A1A1A6] hover:text-[#F5F5F5] hover:bg-[#2A2A2D] transition-all active:scale-90"
            aria-label="Increase weight"
          >
            <Plus className="w-5 h-5" />
          </button>
        </div>

        {/* Change Indicator */}
        <div className="h-5 flex items-center justify-center">
          {diff !== null && (
            <span
              className={`text-xs font-mono font-bold ${
                diff < 0 ? 'text-[#30D158]' : 'text-[#FF8A00]'
              }`}
            >
              {diff > 0 ? '+' : ''}
              {diff.toFixed(1)} {weightUnit} from last entry
            </span>
          )}
        </div>

        {/* Actions */}
        <div className="space-y-2 pt-1">
          <button
            onClick={handleSave}
            disabled={!inputValue || parseFloat(inputValue) <= 0}
            className="w-full bg-[#30D158] hover:bg-[#30D158]/90 text-black font-headline font-black text-xs uppercase tracking-wider py-3.5 rounded-xl transition-all shadow-[0_4px_16px_rgba(48,209,88,0.25)] active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
          >
            <Check className="w-4 h-4 stroke-[3]" />
            <span>Save Fasted Weight</span>
          </button>
          <button
            onClick={handleDismiss}
            className="w-full text-[#A1A1A6] hover:text-[#F5F5F5] font-headline font-bold text-xs uppercase tracking-wider py-2.5 rounded-xl hover:bg-[#1E1E20] transition-colors"
          >
            Log Later
          </button>
        </div>
      </div>
    </div>
  );
}
