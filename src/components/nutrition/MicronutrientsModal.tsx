// ─────────────────────────────────────────────────────────────
// MyFitAI — Micronutrients & Electrolytes Modal
// Compares daily consumed vitamins and minerals against Institute of
// Medicine (IOM) Dietary Reference Intakes (DRI) standards.
// ─────────────────────────────────────────────────────────────

import type { FoodNutrients } from '../../types/nutrition';
import { IOM_MICRONUTRIENT_STANDARDS } from '../../engine/nutritionCalculations';

interface MicronutrientsModalProps {
  isOpen: boolean;
  onClose: () => void;
  totals: FoodNutrients;
}

export default function MicronutrientsModal({
  isOpen,
  onClose,
  totals,
}: MicronutrientsModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-fade-in">
      <div className="bg-[var(--color-surface-container)] w-full max-w-lg rounded-3xl h-[85vh] max-h-[720px] flex flex-col overflow-hidden border border-white/10 shadow-2xl">
        {/* Header */}
        <div className="p-4 border-b border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-400">
              <span className="material-symbols-outlined text-[20px]">biotech</span>
            </div>
            <div>
              <h3 className="font-headline font-bold text-base text-on-surface">Micronutrients & Minerals</h3>
              <p className="text-[11px] text-on-surface-variant">Referenced to Institute of Medicine (IOM) DRI</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-on-surface-variant hover:text-on-surface"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>

        {/* Scrollable list */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          <div className="p-3 bg-white/[0.02] rounded-2xl border border-white/5 text-xs text-on-surface-variant">
            <p>
              Daily values reflect general adult population reference intakes. Saturated fat, sodium, and sugar show upper recommended limits.
            </p>
          </div>

          {IOM_MICRONUTRIENT_STANDARDS.map(m => {
            const consumed = (totals as any)[m.key] || 0;
            const target = m.target;
            const pct = Math.min(150, Math.round((consumed / target) * 100));

            // Is this a limit (like sodium or sat fat) or a goal (like fiber or vitamin D)?
            const isLimit = ['sodium', 'saturatedFat', 'sugar'].includes(m.key);
            const isExceeded = isLimit ? consumed > target : false;

            return (
              <div
                key={m.key}
                className="bg-[var(--color-surface-container-high)] p-4 rounded-2xl border border-white/5 space-y-2"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <span className="font-headline font-bold text-sm text-on-surface block">{m.name}</span>
                    <span className="text-[11px] text-on-surface-variant">{m.description}</span>
                  </div>
                  <div className="text-right flex-shrink-0 ml-2">
                    <span className="font-headline font-black text-base text-on-surface">
                      {consumed} <span className="text-xs text-on-surface-variant font-normal">{m.unit}</span>
                    </span>
                    <span className="text-[10px] text-on-surface-variant block">
                      Target: {m.dailyValueLabel}
                    </span>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="w-full bg-black/20 h-2 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${
                      isExceeded
                        ? 'bg-rose-400'
                        : isLimit
                        ? 'bg-amber-400'
                        : pct >= 100
                        ? 'bg-emerald-400'
                        : 'bg-primary'
                    }`}
                    style={{ width: `${Math.min(100, pct)}%` }}
                  />
                </div>

                <div className="flex justify-between text-[10px] text-on-surface-variant font-medium">
                  <span>{pct}% of daily reference</span>
                  <span className={isExceeded ? 'text-rose-400 font-bold' : pct >= 100 ? 'text-emerald-400 font-bold' : ''}>
                    {isLimit
                      ? isExceeded
                        ? 'Over limit'
                        : 'Within limit'
                      : pct >= 100
                      ? 'Target met ✓'
                      : `${Math.max(0, target - consumed)} ${m.unit} remaining`}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="p-3 bg-[var(--color-surface-container)] border-t border-white/5 text-center">
          <button
            onClick={onClose}
            className="w-full py-2.5 px-4 bg-white/5 hover:bg-white/10 text-on-surface font-headline font-bold text-xs uppercase tracking-wide rounded-xl"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
