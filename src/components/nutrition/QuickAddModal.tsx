// ─────────────────────────────────────────────────────────────
// MyFitAI — Quick Add Modal
// Rapidly log meals by name and calorie count with optional macros
// ─────────────────────────────────────────────────────────────

import { useState } from 'react';
import { Zap, X, Loader2 } from 'lucide-react';
import type { MealType } from '../../types/nutrition';

interface QuickAddModalProps {
  isOpen: boolean;
  onClose: () => void;
  onQuickAdd: (
    name: string,
    calories: number,
    mealType: MealType,
    macros?: { protein?: number; carbs?: number; fat?: number; fiber?: number }
  ) => Promise<any>;
  initialMealType?: MealType;
}

export default function QuickAddModal({
  isOpen,
  onClose,
  onQuickAdd,
  initialMealType = 'Lunch',
}: QuickAddModalProps) {
  const [name, setName] = useState('');
  const [calories, setCalories] = useState('');
  const [protein, setProtein] = useState('');
  const [carbs, setCarbs] = useState('');
  const [fat, setFat] = useState('');
  const [fiber, setFiber] = useState('');
  const [mealType, setMealType] = useState<MealType>(initialMealType);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cals = parseInt(calories);
    if (!cals || cals <= 0) return;

    setIsSubmitting(true);
    try {
      await onQuickAdd(
        name.trim() || 'Quick Calorie Entry',
        cals,
        mealType,
        {
          protein: parseFloat(protein) || 0,
          carbs: parseFloat(carbs) || 0,
          fat: parseFloat(fat) || 0,
          fiber: parseFloat(fiber) || undefined,
        }
      );
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in">
      <div className="bg-[#151517] w-full max-w-md rounded-2xl overflow-hidden border border-[#2A2A2D] shadow-2xl flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-[#2A2A2D] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#FF8A00]/10 border border-[#FF8A00]/20 flex items-center justify-center text-[#FF8A00]">
              <Zap className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-[#F5F5F5]">Quick Calorie Add</h3>
              <p className="text-[11px] text-[#A1A1A6]">Log calories & macros directly</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-[#1E1E20] border border-[#2A2A2D] flex items-center justify-center text-[#A1A1A6] hover:text-[#F5F5F5] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="text-[10px] uppercase font-bold tracking-wider text-[#A1A1A6] block mb-1">
              Description / Food Name
            </label>
            <input
              type="text"
              placeholder="e.g. Campus Lunch, Protein Shake, Snack"
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full bg-[#1E1E20] border border-[#2A2A2D] rounded-xl px-3.5 py-2.5 text-xs text-[#F5F5F5] placeholder-[#A1A1A6]/40 outline-none focus:border-[#30D158]"
            />
          </div>

          <div>
            <label className="text-[10px] uppercase font-bold tracking-wider text-[#30D158] block mb-1">
              Calories (kcal) *
            </label>
            <input
              type="number"
              required
              min="1"
              max="10000"
              placeholder="e.g. 650"
              value={calories}
              onChange={e => setCalories(e.target.value)}
              className="w-full bg-[#1E1E20] border border-[#2A2A2D] rounded-xl px-3.5 py-2.5 font-mono tabular-nums font-bold text-lg text-[#F5F5F5] outline-none focus:border-[#30D158]"
            />
          </div>

          <div>
            <label className="text-[10px] uppercase font-bold tracking-wider text-[#A1A1A6] block mb-1">
              Meal Slot
            </label>
            <div className="grid grid-cols-4 gap-2">
              {(['Breakfast', 'Lunch', 'Dinner', 'Snacks'] as MealType[]).map(m => (
                <button
                  type="button"
                  key={m}
                  onClick={() => setMealType(m)}
                  className={`py-2 px-2 rounded-lg text-xs font-semibold transition-all min-h-[40px] ${
                    mealType === m
                      ? 'bg-[#30D158] text-black font-bold shadow-sm'
                      : 'bg-[#1E1E20] text-[#A1A1A6] hover:text-[#F5F5F5] border border-[#2A2A2D]'
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-[10px] uppercase font-bold tracking-wider text-[#A1A1A6] block mb-1.5">
              Optional Macros (grams)
            </label>
            <div className="grid grid-cols-4 gap-2">
              <div>
                <input
                  type="number"
                  min="0"
                  step="0.5"
                  placeholder="0"
                  value={protein}
                  onChange={e => setProtein(e.target.value)}
                  className="w-full bg-[#1E1E20] border border-[#2A2A2D] rounded-xl px-2.5 py-2 text-center text-xs font-mono tabular-nums font-bold text-[#F5C542] outline-none focus:border-[#F5C542]"
                />
                <span className="text-[9px] uppercase font-bold text-[#A1A1A6] block text-center mt-1">Protein</span>
              </div>
              <div>
                <input
                  type="number"
                  min="0"
                  step="0.5"
                  placeholder="0"
                  value={carbs}
                  onChange={e => setCarbs(e.target.value)}
                  className="w-full bg-[#1E1E20] border border-[#2A2A2D] rounded-xl px-2.5 py-2 text-center text-xs font-mono tabular-nums font-bold text-[#4F9CF9] outline-none focus:border-[#4F9CF9]"
                />
                <span className="text-[9px] uppercase font-bold text-[#A1A1A6] block text-center mt-1">Carbs</span>
              </div>
              <div>
                <input
                  type="number"
                  min="0"
                  step="0.5"
                  placeholder="0"
                  value={fat}
                  onChange={e => setFat(e.target.value)}
                  className="w-full bg-[#1E1E20] border border-[#2A2A2D] rounded-xl px-2.5 py-2 text-center text-xs font-mono tabular-nums font-bold text-[#FF453A] outline-none focus:border-[#FF453A]"
                />
                <span className="text-[9px] uppercase font-bold text-[#A1A1A6] block text-center mt-1">Fat</span>
              </div>
              <div>
                <input
                  type="number"
                  min="0"
                  step="0.5"
                  placeholder="0"
                  value={fiber}
                  onChange={e => setFiber(e.target.value)}
                  className="w-full bg-[#1E1E20] border border-[#2A2A2D] rounded-xl px-2.5 py-2 text-center text-xs font-mono tabular-nums font-bold text-[#30D158] outline-none focus:border-[#30D158]"
                />
                <span className="text-[9px] uppercase font-bold text-[#A1A1A6] block text-center mt-1">Fiber</span>
              </div>
            </div>
          </div>

          <div className="pt-2 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 min-h-[44px] py-3 px-4 rounded-xl bg-[#1E1E20] hover:bg-[#2A2A2D] text-[#A1A1A6] hover:text-[#F5F5F5] font-bold text-xs uppercase tracking-wider border border-[#2A2A2D] transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !calories}
              className="flex-[2] min-h-[44px] py-3 px-4 rounded-xl bg-[#FF8A00] hover:bg-[#FF8A00]/90 text-black font-bold text-xs uppercase tracking-wider shadow-sm flex items-center justify-center gap-1.5 disabled:opacity-50 transition-all"
            >
              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              Add to Diary
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
