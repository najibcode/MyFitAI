import { useState, useRef, useEffect } from 'react';
import { useFitnessContext } from '../context/FitnessContext';
import { usePreferences } from '../context/PreferencesContext';

export default function WeightCheckIn() {
  const { profile, logWeight, dismissWeightCheckIn, needsWeightCheckIn, weightHistory } = useFitnessContext();
  const { weightUnit } = usePreferences();
  const [isOpen, setIsOpen] = useState(true);
  const inputRef = useRef<HTMLInputElement>(null);

  const lastEntry = weightHistory.length > 0 ? weightHistory[weightHistory.length - 1] : null;
  const lastWeight = lastEntry ? lastEntry.weight : profile.weight;

  // Display weight in the user's preferred unit
  const toDisplay = (lbs: number) => weightUnit === 'kg' ? Math.round(lbs / 2.20462 * 10) / 10 : lbs;
  const fromDisplay = (val: number) => weightUnit === 'kg' ? Math.round(val * 2.20462 * 10) / 10 : val;

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
    <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/70 backdrop-blur-md p-4">
      <div 
        className="bg-[var(--color-surface-container)] w-full max-w-sm rounded-[2rem] p-8 shadow-2xl border border-white/10 animate-[slideUp_0.3s_ease-out]"
      >
        {/* Header */}
        <div className="text-center mb-6">
          <div className="w-14 h-14 rounded-2xl bg-primary/15 flex items-center justify-center mx-auto mb-3">
            <span className="material-symbols-outlined text-primary text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>
              monitor_weight
            </span>
          </div>
          <h2 className="font-headline font-bold text-xl tracking-tight">Morning Weigh-in</h2>
          <p className="text-on-surface-variant text-xs mt-1">How much do you weigh today?</p>
        </div>

        {/* Last Weight Reference */}
        {lastEntry && (
          <div className="bg-white/[0.03] rounded-xl px-4 py-2.5 mb-5 flex items-center justify-between">
            <span className="text-on-surface-variant text-xs font-medium">Last logged</span>
            <span className="font-headline font-bold text-sm">
              {toDisplay(lastEntry.weight)} {weightUnit}
              <span className="text-on-surface-variant font-normal ml-2 text-[10px]">
                {new Date(lastEntry.date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </span>
            </span>
          </div>
        )}

        {/* Weight Input — fully typeable */}
        <div className="flex items-center justify-center gap-3 mb-3">
          <button 
            onClick={() => adjust(-1)}
            className="w-11 h-11 rounded-full bg-[var(--color-surface-container-high)] flex items-center justify-center text-on-surface-variant hover:text-on-surface hover:bg-[var(--color-surface-container-highest)] transition-colors active:scale-90"
          >
            <span className="material-symbols-outlined text-lg">remove</span>
          </button>
          <div className="flex-1 text-center relative">
            <input
              ref={inputRef}
              type="text"
              inputMode="decimal"
              pattern="[0-9]*\.?[0-9]*"
              value={inputValue}
              onChange={e => {
                // Allow only valid decimal input
                const val = e.target.value;
                if (val === '' || /^\d*\.?\d*$/.test(val)) {
                  setInputValue(val);
                }
              }}
              onKeyDown={handleKeyDown}
              className="w-full bg-transparent text-center font-headline font-black text-5xl tracking-tighter outline-none caret-primary"
              placeholder="0.0"
            />
            <p className="text-on-surface-variant text-xs font-bold uppercase tracking-widest mt-1">{weightUnit}</p>
          </div>
          <button 
            onClick={() => adjust(1)}
            className="w-11 h-11 rounded-full bg-[var(--color-surface-container-high)] flex items-center justify-center text-on-surface-variant hover:text-on-surface hover:bg-[var(--color-surface-container-highest)] transition-colors active:scale-90"
          >
            <span className="material-symbols-outlined text-lg">add</span>
          </button>
        </div>

        {/* Change Indicator */}
        <div className="h-6 flex items-center justify-center mb-4">
          {diff !== null && (
            <span className={`text-sm font-semibold ${diff < 0 ? 'text-[#6FFB85]' : 'text-[#FF4D4D]'}`}>
              {diff > 0 ? '+' : ''}{diff.toFixed(1)} {weightUnit} from last
            </span>
          )}
        </div>

        {/* Actions */}
        <div className="space-y-2.5">
          <button 
            onClick={handleSave}
            disabled={!inputValue || parseFloat(inputValue) <= 0}
            className="w-full bg-primary text-black font-headline font-bold text-base py-3.5 rounded-2xl hover:opacity-90 active:scale-[0.98] transition-all shadow-[0_8px_30px_rgba(255,122,0,0.2)] disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Save Weight
          </button>
          <button 
            onClick={handleDismiss}
            className="w-full text-on-surface-variant font-medium text-sm py-2.5 rounded-2xl hover:text-on-surface hover:bg-white/[0.03] transition-colors"
          >
            Update Later
          </button>
        </div>
      </div>
    </div>
  );
}
