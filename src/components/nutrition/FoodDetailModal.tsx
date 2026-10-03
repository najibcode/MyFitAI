// ─────────────────────────────────────────────────────────────
// MyFitAI — Food Detail Modal
// Detailed inspection of any food item with interactive serving size
// selector, unit conversions, live macro & micro scaling, and meal logging.
// ─────────────────────────────────────────────────────────────

import { useState, useMemo } from 'react';
import type { FoodItem, MealType, ServingUnit } from '../../types/nutrition';
import { calculateFoodNutrients, IOM_MICRONUTRIENT_STANDARDS } from '../../engine/nutritionCalculations';
import { foodRepository } from '../../services/nutrition/FoodRepository';

interface FoodDetailModalProps {
  food: FoodItem;
  isOpen: boolean;
  onClose: () => void;
  onLogFood: (food: FoodItem, mealType: MealType, quantity: number, unit: ServingUnit) => Promise<any>;
  initialMealType?: MealType;
}

export default function FoodDetailModal({
  food,
  isOpen,
  onClose,
  onLogFood,
  initialMealType = 'Lunch',
}: FoodDetailModalProps) {
  const [selectedMealType, setSelectedMealType] = useState<MealType>(initialMealType);
  const [quantity, setQuantity] = useState<number>(food.defaultServing?.quantity || 1);
  const [selectedUnit, setSelectedUnit] = useState<ServingUnit>(food.defaultServing?.unit || 'g');
  const [isFavorite, setIsFavorite] = useState<boolean>(() => foodRepository.isFavorite(food.id));
  const [showMicros, setShowMicros] = useState<boolean>(false);
  const [isLogging, setIsLogging] = useState<boolean>(false);

  const { nutrients, totalGrams } = useMemo(() => {
    return calculateFoodNutrients(food, Math.max(0.1, quantity || 1), selectedUnit);
  }, [food, quantity, selectedUnit]);

  if (!isOpen) return null;

  const toggleFavorite = () => {
    const next = foodRepository.toggleFavorite(food.id);
    setIsFavorite(next);
  };

  const handleLog = async () => {
    if (quantity <= 0) return;
    setIsLogging(true);
    try {
      await onLogFood(food, selectedMealType, quantity, selectedUnit);
      foodRepository.recordRecentFood(food);
      onClose();
    } finally {
      setIsLogging(false);
    }
  };

  const getSourceBadgeColor = () => {
    switch (food.source) {
      case 'indian_db':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/30';
      case 'open_food_facts':
        return 'bg-blue-500/10 text-blue-400 border-blue-500/30';
      case 'usda':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
      case 'custom':
        return 'bg-purple-500/10 text-purple-400 border-purple-500/30';
      default:
        return 'bg-primary/10 text-primary border-primary/30';
    }
  };

  const getSourceLabel = () => {
    switch (food.source) {
      case 'indian_db':
        return 'Indian Food Database';
      case 'open_food_facts':
        return 'Open Food Facts';
      case 'usda':
        return 'USDA FoodData Central';
      case 'custom':
        return 'Custom Food';
      default:
        return 'MyFitAI Database';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-[var(--color-surface-container)] w-full max-w-lg rounded-3xl max-h-[92vh] flex flex-col overflow-hidden border border-white/10 shadow-2xl">
        {/* Header */}
        <div className="relative p-5 pb-4 border-b border-white/5 flex items-start gap-4">
          <div className="w-16 h-16 rounded-2xl bg-white/[0.04] border border-white/5 flex items-center justify-center flex-shrink-0 overflow-hidden text-3xl">
            {food.image ? (
              <img src={food.image} alt={food.name} className="w-full h-full object-cover" />
            ) : (
              <span>{food.emoji || '🍽️'}</span>
            )}
          </div>

          <div className="flex-1 min-w-0 pr-8">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full border ${getSourceBadgeColor()}`}>
                {getSourceLabel()}
              </span>
              {food.nutriscore && (
                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-500 text-black">
                  Nutri-Score {food.nutriscore.toUpperCase()}
                </span>
              )}
            </div>
            <h2 className="font-headline font-black text-xl text-on-surface leading-tight truncate">
              {food.name}
            </h2>
            {food.brand && <p className="text-xs text-on-surface-variant">{food.brand}</p>}
          </div>

          <div className="absolute top-4 right-4 flex items-center gap-1">
            <button
              onClick={toggleFavorite}
              className={`w-9 h-9 rounded-full flex items-center justify-center transition-all ${
                isFavorite ? 'text-amber-400 bg-amber-400/10' : 'text-on-surface-variant hover:text-on-surface bg-white/5'
              }`}
              title={isFavorite ? 'Remove Favorite' : 'Save as Favorite'}
            >
              <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: isFavorite ? "'FILL' 1" : "'FILL' 0" }}>
                star
              </span>
            </button>
            <button
              onClick={onClose}
              className="w-9 h-9 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-on-surface-variant hover:text-on-surface"
            >
              <span className="material-symbols-outlined text-[20px]">close</span>
            </button>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Serving Size Selector */}
          <div className="bg-[var(--color-surface-container-high)] p-4 rounded-2xl border border-white/5">
            <label className="text-[11px] uppercase font-bold tracking-wider text-on-surface-variant block mb-2">
              Serving Size & Quantity
            </label>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <input
                  type="number"
                  min="0.1"
                  step="0.5"
                  value={quantity}
                  onChange={e => setQuantity(parseFloat(e.target.value) || 0)}
                  className="w-full bg-[var(--color-surface-container)] border border-white/10 rounded-xl px-3.5 py-2.5 font-headline font-bold text-lg text-on-surface outline-none focus:border-primary"
                />
                <span className="text-[10px] text-on-surface-variant font-medium mt-1 block">
                  Amount (~{totalGrams}g)
                </span>
              </div>

              <div>
                <select
                  value={selectedUnit}
                  onChange={e => setSelectedUnit(e.target.value as ServingUnit)}
                  className="w-full bg-[var(--color-surface-container)] border border-white/10 rounded-xl px-3.5 py-3 font-semibold text-sm text-on-surface outline-none focus:border-primary"
                >
                  {food.availableServings.map((s, idx) => (
                    <option key={idx} value={s.unit}>
                      {s.label}
                    </option>
                  ))}
                  {/* Fallback standard options if not already present */}
                  <option value="g">grams (g)</option>
                  <option value="cup">cup (240g)</option>
                  <option value="bowl">bowl (250g)</option>
                  <option value="piece">piece (50g)</option>
                  <option value="tbsp">tablespoon (15g)</option>
                  <option value="tsp">teaspoon (5g)</option>
                </select>
                <span className="text-[10px] text-on-surface-variant font-medium mt-1 block">Unit</span>
              </div>
            </div>
          </div>

          {/* Energy & Macros Display */}
          <div className="bg-gradient-to-br from-primary/10 via-[var(--color-surface-container-high)] to-transparent p-5 rounded-2xl border border-primary/20">
            <div className="flex items-baseline justify-between mb-4">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-primary">Calculated Energy</p>
                <p className="font-headline font-black text-4xl text-on-surface tracking-tight mt-0.5">
                  {nutrients.calories} <span className="text-base font-semibold text-on-surface-variant">kcal</span>
                </p>
              </div>
              <span className="text-xs text-on-surface-variant">
                for {quantity} {selectedUnit} ({totalGrams}g)
              </span>
            </div>

            {/* Macro grid */}
            <div className="grid grid-cols-4 gap-2">
              <div className="bg-black/20 p-2.5 rounded-xl text-center border border-white/5">
                <span className="text-[10px] uppercase font-bold text-amber-400 block mb-0.5">Protein</span>
                <span className="font-headline font-black text-lg text-on-surface">{nutrients.protein}g</span>
              </div>
              <div className="bg-black/20 p-2.5 rounded-xl text-center border border-white/5">
                <span className="text-[10px] uppercase font-bold text-sky-400 block mb-0.5">Carbs</span>
                <span className="font-headline font-black text-lg text-on-surface">{nutrients.carbohydrates}g</span>
              </div>
              <div className="bg-black/20 p-2.5 rounded-xl text-center border border-white/5">
                <span className="text-[10px] uppercase font-bold text-rose-400 block mb-0.5">Fat</span>
                <span className="font-headline font-black text-lg text-on-surface">{nutrients.fat}g</span>
              </div>
              <div className="bg-black/20 p-2.5 rounded-xl text-center border border-white/5">
                <span className="text-[10px] uppercase font-bold text-emerald-400 block mb-0.5">Fiber</span>
                <span className="font-headline font-black text-lg text-on-surface">{nutrients.fiber ?? '—'}g</span>
              </div>
            </div>
          </div>

          {/* Meal Target Selector */}
          <div>
            <label className="text-[11px] uppercase font-bold tracking-wider text-on-surface-variant block mb-2">
              Add To Meal
            </label>
            <div className="grid grid-cols-4 gap-2">
              {(['Breakfast', 'Lunch', 'Dinner', 'Snacks'] as MealType[]).map(meal => (
                <button
                  key={meal}
                  onClick={() => setSelectedMealType(meal)}
                  className={`py-2 px-3 rounded-xl text-xs font-bold transition-all ${
                    selectedMealType === meal
                      ? 'bg-primary text-black shadow-lg shadow-primary/20 scale-[1.02]'
                      : 'bg-white/5 text-on-surface-variant hover:text-on-surface hover:bg-white/10'
                  }`}
                >
                  {meal}
                </button>
              ))}
            </div>
          </div>

          {/* Toggle Micronutrients */}
          <div>
            <button
              onClick={() => setShowMicros(!showMicros)}
              className="w-full py-2 px-4 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/5 flex items-center justify-between text-xs font-semibold text-on-surface-variant hover:text-on-surface transition-colors"
            >
              <span className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px]">biotech</span>
                Detailed Micronutrients & Minerals
              </span>
              <span className="material-symbols-outlined text-[18px]">
                {showMicros ? 'expand_less' : 'expand_more'}
              </span>
            </button>

            {showMicros && (
              <div className="mt-3 p-4 bg-[var(--color-surface-container-high)] rounded-2xl border border-white/5 space-y-2.5 animate-fade-in text-xs">
                {IOM_MICRONUTRIENT_STANDARDS.map(standard => {
                  const val = nutrients[standard.key];
                  return (
                    <div key={standard.key} className="flex justify-between items-center py-1 border-b border-white/[0.03]">
                      <span className="text-on-surface-variant">{standard.name}</span>
                      <span className="font-semibold text-on-surface">
                        {val !== undefined ? `${val} ${standard.unit}` : '—'}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Source Attribution footer */}
          {food.sourceAttribution && (
            <p className="text-[11px] text-on-surface-variant/70 italic text-center">
              Source: {food.sourceAttribution}
            </p>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-white/5 bg-[var(--color-surface-container)] flex items-center gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-3 px-4 rounded-2xl bg-white/5 hover:bg-white/10 text-on-surface font-headline font-bold text-sm uppercase tracking-wide transition-all"
          >
            Cancel
          </button>
          <button
            onClick={handleLog}
            disabled={isLogging || quantity <= 0}
            className="flex-[2] py-3 px-4 rounded-2xl bg-primary hover:bg-primary/90 text-black font-headline font-bold text-sm uppercase tracking-wide shadow-lg shadow-primary/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <span className="material-symbols-outlined text-[18px]">add</span>
            Log to {selectedMealType}
          </button>
        </div>
      </div>
    </div>
  );
}
