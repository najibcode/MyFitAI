// ─────────────────────────────────────────────────────────────
// MyFitAI — Micronutrients & Electrolytes Modal
// Compares daily consumed vitamins and minerals against Institute of
// Medicine (IOM) Dietary Reference Intakes (DRI) standards.
// ─────────────────────────────────────────────────────────────

import { Activity, X } from 'lucide-react';
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
      <div className="bg-[#151517] w-full max-w-lg rounded-2xl h-[85vh] max-h-[720px] flex flex-col overflow-hidden border border-[#2A2A2D] shadow-2xl">
        {/* Header */}
        <div className="p-4 border-b border-[#2A2A2D] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#30D158]/10 border border-[#30D158]/20 flex items-center justify-center text-[#30D158]">
              <Activity className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-[#F5F5F5]">Micronutrients & Minerals</h3>
              <p className="text-[11px] text-[#A1A1A6]">Referenced to Institute of Medicine (IOM) DRI</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-[#1E1E20] border border-[#2A2A2D] flex items-center justify-center text-[#A1A1A6] hover:text-[#F5F5F5] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable list */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          <div className="p-3 bg-[#1E1E20] rounded-xl border border-[#2A2A2D] text-xs text-[#A1A1A6]">
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
                className="bg-[#1E1E20] p-4 rounded-xl border border-[#2A2A2D] space-y-2"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <span className="font-bold text-sm text-[#F5F5F5] block">{m.name}</span>
                    <span className="text-[11px] text-[#A1A1A6]">{m.description}</span>
                  </div>
                  <div className="text-right flex-shrink-0 ml-2">
                    <span className="font-mono tabular-nums font-bold text-sm text-[#F5F5F5]">
                      {consumed} <span className="text-xs text-[#A1A1A6] font-normal">{m.unit}</span>
                    </span>
                    <span className="text-[10px] text-[#A1A1A6] block font-mono tabular-nums">
                      Target: {m.dailyValueLabel}
                    </span>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="w-full bg-[#151517] h-2 rounded-full overflow-hidden border border-[#2A2A2D]">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${
                      isExceeded
                        ? 'bg-[#FF453A]'
                        : isLimit
                        ? 'bg-[#F5C542]'
                        : pct >= 100
                        ? 'bg-[#30D158]'
                        : 'bg-[#FF8A00]'
                    }`}
                    style={{ width: `${Math.min(100, pct)}%` }}
                  />
                </div>

                <div className="flex justify-between text-[10px] text-[#A1A1A6] font-mono tabular-nums">
                  <span>{pct}% of daily reference</span>
                  <span className={isExceeded ? 'text-[#FF453A] font-bold' : pct >= 100 ? 'text-[#30D158] font-bold' : ''}>
                    {isLimit
                      ? isExceeded
                        ? 'Over limit'
                        : 'Within limit'
                      : pct >= 100
                      ? 'Target met'
                      : `${Math.max(0, target - consumed)} ${m.unit} remaining`}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="p-3 bg-[#151517] border-t border-[#2A2A2D] text-center">
          <button
            onClick={onClose}
            className="w-full min-h-[44px] py-2.5 px-4 bg-[#1E1E20] hover:bg-[#2A2A2D] text-[#F5F5F5] font-bold text-xs uppercase tracking-wide rounded-xl border border-[#2A2A2D] transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
