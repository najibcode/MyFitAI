// ─────────────────────────────────────────────────────────────
// MyFitAI — Quick Add Modal
// Rapidly log meals by name and calorie count with optional macros
// ─────────────────────────────────────────────────────────────

import { useState } from 'react';
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
      <div className="bg-[var(--color-surface-container)] w-full max-w-md rounded-3xl overflow-hidden border border-white/10 shadow-2xl flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
              <span className="material-symbols-outlined text-[20px]">bolt</span>
            </div>
            <div>
              <h3 className="font-headline font-bold text-base text-on-surface">Quick Calorie Add</h3>
              <p className="text-[11px] text-on-surface-variant">Log calories & macros directly</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-on-surface-variant hover:text-on-surface"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="text-[10px] uppercase font-bold tracking-wider text-on-surface-variant block mb-1">
              Description / Food Name
            </label>
            <input
              type="text"
              placeholder="e.g. Campus Lunch, Protein Shake, Snack"
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full bg-[var(--color-surface-container-high)] border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-on-surface outline-none focus:border-primary"
            />
          </div>

          <div>
            <label className="text-[10px] uppercase font-bold tracking-wider text-primary block mb-1">
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
              className="w-full bg-[var(--color-surface-container-high)] border border-primary/30 rounded-xl px-3.5 py-2.5 font-headline font-bold text-lg text-on-surface outline-none focus:border-primary"
            />
          </div>

          <div>
            <label className="text-[10px] uppercase font-bold tracking-wider text-on-surface-variant block mb-1">
              Meal Slot
            </label>
            <div className="grid grid-cols-4 gap-2">
              {(['Breakfast', 'Lunch', 'Dinner', 'Snacks'] as MealType[]).map(m => (
                <button
                  type="button"
                  key={m}
                  onClick={() => setMealType(m)}
                  className={`py-2 px-2 rounded-xl text-xs font-bold transition-all ${
                    mealType === m
                      ? 'bg-primary text-black shadow-md shadow-primary/20 scale-[1.02]'
                      : 'bg-white/5 text-on-surface-variant hover:text-on-surface'
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-[10px] uppercase font-bold tracking-wider text-on-surface-variant block mb-1.5">
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
                  className="w-full bg-[var(--color-surface-container-high)] border border-white/10 rounded-xl px-2.5 py-2 text-center text-sm font-bold text-amber-400 outline-none focus:border-amber-400"
                />
                <span className="text-[9px] uppercase font-bold text-on-surface-variant block text-center mt-1">Protein</span>
              </div>
              <div>
                <input
                  type="number"
                  min="0"
                  step="0.5"
                  placeholder="0"
                  value={carbs}
                  onChange={e => setCarbs(e.target.value)}
                  className="w-full bg-[var(--color-surface-container-high)] border border-white/10 rounded-xl px-2.5 py-2 text-center text-sm font-bold text-sky-400 outline-none focus:border-sky-400"
                />
                <span className="text-[9px] uppercase font-bold text-on-surface-variant block text-center mt-1">Carbs</span>
              </div>
              <div>
                <input
                  type="number"
                  min="0"
                  step="0.5"
                  placeholder="0"
                  value={fat}
                  onChange={e => setFat(e.target.value)}
                  className="w-full bg-[var(--color-surface-container-high)] border border-white/10 rounded-xl px-2.5 py-2 text-center text-sm font-bold text-rose-400 outline-none focus:border-rose-400"
                />
                <span className="text-[9px] uppercase font-bold text-on-surface-variant block text-center mt-1">Fat</span>
              </div>
              <div>
                <input
                  type="number"
                  min="0"
                  step="0.5"
                  placeholder="0"
                  value={fiber}
                  onChange={e => setFiber(e.target.value)}
                  className="w-full bg-[var(--color-surface-container-high)] border border-white/10 rounded-xl px-2.5 py-2 text-center text-sm font-bold text-emerald-400 outline-none focus:border-emerald-400"
                />
                <span className="text-[9px] uppercase font-bold text-on-surface-variant block text-center mt-1">Fiber</span>
              </div>
            </div>
          </div>

          <div className="pt-2 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 px-4 rounded-2xl bg-white/5 hover:bg-white/10 text-on-surface font-headline font-bold text-xs uppercase tracking-wider"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !calories}
              className="flex-[2] py-3 px-4 rounded-2xl bg-primary hover:bg-primary/90 text-black font-headline font-bold text-xs uppercase tracking-wider shadow-lg shadow-primary/20 disabled:opacity-50"
            >
              Add to Diary
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
