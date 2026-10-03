// ─────────────────────────────────────────────────────────────
// MyFitAI — Custom Food Creator Modal
// Allows users to create custom foods with macros, micros & barcode
// ─────────────────────────────────────────────────────────────

import { useState } from 'react';
import type { FoodItem, ServingUnit } from '../../types/nutrition';

interface CustomFoodModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveFood: (food: FoodItem) => Promise<any>;
  initialBarcode?: string;
}

export default function CustomFoodModal({
  isOpen,
  onClose,
  onSaveFood,
  initialBarcode = '',
}: CustomFoodModalProps) {
  const [name, setName] = useState('');
  const [brand, setBrand] = useState('');
  const [category, setCategory] = useState('Custom Food');
  const [barcode, setBarcode] = useState(initialBarcode);
  const [servingSize, setServingSize] = useState('100');
  const [servingUnit, setServingUnit] = useState<ServingUnit>('g');
  const [calories, setCalories] = useState('');
  const [protein, setProtein] = useState('');
  const [carbs, setCarbs] = useState('');
  const [fat, setFat] = useState('');
  const [fiber, setFiber] = useState('');
  const [sodium, setSodium] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !calories) return;

    setIsSaving(true);
    try {
      const cal = parseFloat(calories) || 0;
      const p = parseFloat(protein) || 0;
      const c = parseFloat(carbs) || 0;
      const f = parseFloat(fat) || 0;
      const fib = parseFloat(fiber) || undefined;
      const sod = parseFloat(sodium) || undefined;
      const sSize = parseFloat(servingSize) || 100;

      // Normalize per 100g
      const multiplier = sSize > 0 ? 100 / sSize : 1;

      const customFood: FoodItem = {
        id: `custom_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        name: name.trim(),
        brand: brand.trim() || undefined,
        category: category.trim() || 'Custom',
        emoji: '🍴',
        barcode: barcode.trim() || undefined,
        source: 'custom',
        sourceAttribution: 'User Created',
        isCustom: true,
        isVerified: true,
        nutrientsPer100g: {
          calories: Math.round(cal * multiplier),
          protein: Math.round(p * multiplier * 10) / 10,
          carbohydrates: Math.round(c * multiplier * 10) / 10,
          fat: Math.round(f * multiplier * 10) / 10,
          fiber: fib !== undefined ? Math.round(fib * multiplier * 10) / 10 : undefined,
          sodium: sod !== undefined ? Math.round(sod * multiplier) : undefined,
        },
        defaultServing: {
          quantity: 1,
          unit: servingUnit,
          gramEquivalent: sSize,
        },
        availableServings: [
          { unit: servingUnit, gramEquivalent: sSize, label: `1 serving (${sSize}${servingUnit})` },
          { unit: 'g', gramEquivalent: 1, label: '1 gram' },
        ],
      };

      await onSaveFood(customFood);
      onClose();
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in">
      <div className="bg-[var(--color-surface-container)] w-full max-w-lg rounded-3xl overflow-hidden border border-white/10 shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 border-b border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-400">
              <span className="material-symbols-outlined text-[20px]">add_task</span>
            </div>
            <div>
              <h3 className="font-headline font-bold text-base text-on-surface">Create Custom Food</h3>
              <p className="text-[11px] text-on-surface-variant">Add a food with your custom nutrition label</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-on-surface-variant hover:text-on-surface"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 overflow-y-auto space-y-4 flex-1">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="text-[10px] uppercase font-bold tracking-wider text-on-surface-variant block mb-1">
                Food Name *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Grandma's Roti, Whey Shake"
                value={name}
                onChange={e => setName(e.target.value)}
                className="w-full bg-[var(--color-surface-container-high)] border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-on-surface outline-none focus:border-primary"
              />
            </div>

            <div>
              <label className="text-[10px] uppercase font-bold tracking-wider text-on-surface-variant block mb-1">
                Brand (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. Amul, Optimum Nutrition"
                value={brand}
                onChange={e => setBrand(e.target.value)}
                className="w-full bg-[var(--color-surface-container-high)] border border-white/10 rounded-xl px-3 py-2 text-sm text-on-surface outline-none focus:border-primary"
              />
            </div>

            <div>
              <label className="text-[10px] uppercase font-bold tracking-wider text-on-surface-variant block mb-1">
                Barcode (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. 890123456789"
                value={barcode}
                onChange={e => setBarcode(e.target.value)}
                className="w-full bg-[var(--color-surface-container-high)] border border-white/10 rounded-xl px-3 py-2 text-sm text-on-surface outline-none focus:border-primary font-mono"
              />
            </div>

            <div className="col-span-2">
              <label className="text-[10px] uppercase font-bold tracking-wider text-on-surface-variant block mb-1">
                Category
              </label>
              <input
                type="text"
                placeholder="e.g. Protein, Dairy, Grains, Snacks"
                value={category}
                onChange={e => setCategory(e.target.value)}
                className="w-full bg-[var(--color-surface-container-high)] border border-white/10 rounded-xl px-3 py-2 text-sm text-on-surface outline-none focus:border-primary"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] uppercase font-bold tracking-wider text-on-surface-variant block mb-1">
                Serving Size Amount
              </label>
              <input
                type="number"
                min="1"
                placeholder="100"
                value={servingSize}
                onChange={e => setServingSize(e.target.value)}
                className="w-full bg-[var(--color-surface-container-high)] border border-white/10 rounded-xl px-3 py-2 text-sm text-on-surface outline-none focus:border-primary"
              />
            </div>

            <div>
              <label className="text-[10px] uppercase font-bold tracking-wider text-on-surface-variant block mb-1">
                Unit
              </label>
              <select
                value={servingUnit}
                onChange={e => setServingUnit(e.target.value as ServingUnit)}
                className="w-full bg-[var(--color-surface-container-high)] border border-white/10 rounded-xl px-3 py-2.5 text-sm text-on-surface outline-none focus:border-primary"
              >
                <option value="g">grams (g)</option>
                <option value="ml">milliliters (ml)</option>
                <option value="piece">piece</option>
                <option value="cup">cup</option>
                <option value="bowl">bowl</option>
                <option value="katori">katori</option>
                <option value="scoop">scoop</option>
                <option value="serving">serving</option>
              </select>
            </div>
          </div>

          {/* Macros per serving */}
          <div className="bg-[var(--color-surface-container-high)] p-4 rounded-2xl border border-white/5 space-y-3">
            <span className="text-[10px] uppercase font-bold tracking-wider text-primary block">
              Nutrition Facts (For {servingSize || '100'}{servingUnit})
            </span>

            <div>
              <label className="text-[10px] uppercase font-bold text-on-surface-variant block mb-1">Calories (kcal) *</label>
              <input
                type="number"
                required
                min="0"
                placeholder="0"
                value={calories}
                onChange={e => setCalories(e.target.value)}
                className="w-full bg-[var(--color-surface-container)] border border-primary/30 rounded-xl px-3 py-2 font-bold text-lg text-on-surface outline-none focus:border-primary"
              />
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="text-[9px] uppercase font-bold text-amber-400 block mb-1">Protein (g)</label>
                <input
                  type="number"
                  min="0"
                  step="0.1"
                  placeholder="0"
                  value={protein}
                  onChange={e => setProtein(e.target.value)}
                  className="w-full bg-[var(--color-surface-container)] border border-white/10 rounded-xl px-2 py-1.5 text-center text-sm font-bold text-on-surface outline-none"
                />
              </div>
              <div>
                <label className="text-[9px] uppercase font-bold text-sky-400 block mb-1">Carbs (g)</label>
                <input
                  type="number"
                  min="0"
                  step="0.1"
                  placeholder="0"
                  value={carbs}
                  onChange={e => setCarbs(e.target.value)}
                  className="w-full bg-[var(--color-surface-container)] border border-white/10 rounded-xl px-2 py-1.5 text-center text-sm font-bold text-on-surface outline-none"
                />
              </div>
              <div>
                <label className="text-[9px] uppercase font-bold text-rose-400 block mb-1">Fat (g)</label>
                <input
                  type="number"
                  min="0"
                  step="0.1"
                  placeholder="0"
                  value={fat}
                  onChange={e => setFat(e.target.value)}
                  className="w-full bg-[var(--color-surface-container)] border border-white/10 rounded-xl px-2 py-1.5 text-center text-sm font-bold text-on-surface outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1">
              <div>
                <label className="text-[9px] uppercase font-bold text-emerald-400 block mb-1">Fiber (g)</label>
                <input
                  type="number"
                  min="0"
                  step="0.1"
                  placeholder="0"
                  value={fiber}
                  onChange={e => setFiber(e.target.value)}
                  className="w-full bg-[var(--color-surface-container)] border border-white/10 rounded-xl px-2 py-1.5 text-center text-sm text-on-surface outline-none"
                />
              </div>
              <div>
                <label className="text-[9px] uppercase font-bold text-on-surface-variant block mb-1">Sodium (mg)</label>
                <input
                  type="number"
                  min="0"
                  placeholder="0"
                  value={sodium}
                  onChange={e => setSodium(e.target.value)}
                  className="w-full bg-[var(--color-surface-container)] border border-white/10 rounded-xl px-2 py-1.5 text-center text-sm text-on-surface outline-none"
                />
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
              disabled={isSaving || !name.trim() || !calories}
              className="flex-[2] py-3 px-4 rounded-2xl bg-primary hover:bg-primary/90 text-black font-headline font-bold text-xs uppercase tracking-wider shadow-lg shadow-primary/20 disabled:opacity-50"
            >
              Save Custom Food
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
