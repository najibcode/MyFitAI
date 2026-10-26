// ─────────────────────────────────────────────────────────────
// MyFitAI — Food Detail Modal
// Detailed inspection of any food item with interactive serving size
// selector, unit conversions, live macro & micro scaling, and meal logging.
// ─────────────────────────────────────────────────────────────

import { useState, useMemo } from 'react';
import { Star, X, Activity, ChevronUp, ChevronDown, Plus, Loader2 } from 'lucide-react';
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
        return 'bg-[#F5C542]/10 text-[#F5C542] border-[#F5C542]/30';
      case 'open_food_facts':
        return 'bg-[#4F9CF9]/10 text-[#4F9CF9] border-[#4F9CF9]/30';
      case 'usda':
        return 'bg-[#30D158]/10 text-[#30D158] border-[#30D158]/30';
      case 'custom':
        return 'bg-[#A78BFA]/10 text-[#A78BFA] border-[#A78BFA]/30';
      default:
        return 'bg-[#30D158]/10 text-[#30D158] border-[#30D158]/30';
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in">
      <div className="bg-[#151517] w-full max-w-lg rounded-2xl max-h-[92vh] flex flex-col overflow-hidden border border-[#2A2A2D] shadow-2xl">
        {/* Header */}
        <div className="relative p-5 pb-4 border-b border-[#2A2A2D] flex items-start gap-4">
          <div className="w-14 h-14 rounded-xl bg-[#1E1E20] border border-[#2A2A2D] flex items-center justify-center flex-shrink-0 overflow-hidden text-2xl">
            {food.image ? (
              <img src={food.image} alt={food.name} className="w-full h-full object-cover" />
            ) : (
              <Activity className="w-6 h-6 text-[#30D158]" />
            )}
          </div>

          <div className="flex-1 min-w-0 pr-16">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full border ${getSourceBadgeColor()}`}>
                {getSourceLabel()}
              </span>
              {food.nutriscore && (
                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-[#30D158] text-black">
                  Nutri-Score {food.nutriscore.toUpperCase()}
                </span>
              )}
            </div>
            <h2 className="font-bold text-lg text-[#F5F5F5] leading-tight truncate">
              {food.name}
            </h2>
            {food.brand && <p className="text-xs text-[#A1A1A6]">{food.brand}</p>}
          </div>

          <div className="absolute top-4 right-4 flex items-center gap-1.5">
            <button
              onClick={toggleFavorite}
              className={`w-9 h-9 rounded-lg border flex items-center justify-center transition-all ${
                isFavorite
                  ? 'text-[#F5C542] bg-[#F5C542]/10 border-[#F5C542]/30'
                  : 'text-[#A1A1A6] hover:text-[#F5F5F5] bg-[#1E1E20] border-[#2A2A2D]'
              }`}
              title={isFavorite ? 'Remove Favorite' : 'Save as Favorite'}
            >
              <Star className={`w-4 h-4 ${isFavorite ? 'fill-[#F5C542]' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="w-9 h-9 rounded-lg bg-[#1E1E20] hover:bg-[#2A2A2D] border border-[#2A2A2D] flex items-center justify-center text-[#A1A1A6] hover:text-[#F5F5F5] transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Serving Size Selector */}
          <div className="bg-[#1E1E20] p-4 rounded-xl border border-[#2A2A2D]">
            <label className="text-[10px] uppercase font-bold tracking-wider text-[#A1A1A6] block mb-2">
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
                  className="w-full bg-[#151517] border border-[#2A2A2D] rounded-xl px-3.5 py-2 font-mono tabular-nums font-bold text-base text-[#F5F5F5] outline-none focus:border-[#30D158]"
                />
                <span className="text-[10px] text-[#A1A1A6] font-mono tabular-nums mt-1 block">
                  Amount (~{totalGrams}g)
                </span>
              </div>

              <div>
                <select
                  value={selectedUnit}
                  onChange={e => setSelectedUnit(e.target.value as ServingUnit)}
                  className="w-full bg-[#151517] border border-[#2A2A2D] rounded-xl px-3.5 py-2.5 font-semibold text-xs text-[#F5F5F5] outline-none focus:border-[#30D158]"
                >
                  {food.availableServings.map((s, idx) => (
                    <option key={idx} value={s.unit}>
                      {s.label}
                    </option>
                  ))}
                  <option value="g">grams (g)</option>
                  <option value="cup">cup (240g)</option>
                  <option value="bowl">bowl (250g)</option>
                  <option value="piece">piece (50g)</option>
                  <option value="tbsp">tablespoon (15g)</option>
                  <option value="tsp">teaspoon (5g)</option>
                </select>
                <span className="text-[10px] text-[#A1A1A6] font-medium mt-1 block">Unit</span>
              </div>
            </div>
          </div>

          {/* Energy & Macros Display */}
          <div className="bg-[#1E1E20] p-4 rounded-xl border border-[#2A2A2D]">
            <div className="flex items-baseline justify-between mb-3">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-[#30D158]">Calculated Energy</p>
                <p className="font-mono tabular-nums font-black text-3xl text-[#F5F5F5] tracking-tight mt-0.5">
                  {nutrients.calories} <span className="text-sm font-normal text-[#A1A1A6]">kcal</span>
                </p>
              </div>
              <span className="text-xs text-[#A1A1A6] font-mono tabular-nums">
                for {quantity} {selectedUnit} ({totalGrams}g)
              </span>
            </div>

            {/* Macro grid */}
            <div className="grid grid-cols-4 gap-2">
              <div className="bg-[#151517] p-2.5 rounded-lg text-center border border-[#2A2A2D]">
                <span className="text-[9px] uppercase font-bold text-[#F5C542] block mb-0.5">Protein</span>
                <span className="font-mono tabular-nums font-bold text-base text-[#F5F5F5]">{nutrients.protein}g</span>
              </div>
              <div className="bg-[#151517] p-2.5 rounded-lg text-center border border-[#2A2A2D]">
                <span className="text-[9px] uppercase font-bold text-[#4F9CF9] block mb-0.5">Carbs</span>
                <span className="font-mono tabular-nums font-bold text-base text-[#F5F5F5]">{nutrients.carbohydrates}g</span>
              </div>
              <div className="bg-[#151517] p-2.5 rounded-lg text-center border border-[#2A2A2D]">
                <span className="text-[9px] uppercase font-bold text-[#FF453A] block mb-0.5">Fat</span>
                <span className="font-mono tabular-nums font-bold text-base text-[#F5F5F5]">{nutrients.fat}g</span>
              </div>
              <div className="bg-[#151517] p-2.5 rounded-lg text-center border border-[#2A2A2D]">
                <span className="text-[9px] uppercase font-bold text-[#30D158] block mb-0.5">Fiber</span>
                <span className="font-mono tabular-nums font-bold text-base text-[#F5F5F5]">{nutrients.fiber ?? '—'}g</span>
              </div>
            </div>
          </div>

          {/* Meal Target Selector */}
          <div>
            <label className="text-[10px] uppercase font-bold tracking-wider text-[#A1A1A6] block mb-2">
              Add To Meal
            </label>
            <div className="grid grid-cols-4 gap-2">
              {(['Breakfast', 'Lunch', 'Dinner', 'Snacks'] as MealType[]).map(meal => (
                <button
                  key={meal}
                  onClick={() => setSelectedMealType(meal)}
                  className={`py-2 px-3 rounded-lg text-xs font-semibold transition-all min-h-[44px] ${
                    selectedMealType === meal
                      ? 'bg-[#30D158] text-black font-bold shadow-sm'
                      : 'bg-[#1E1E20] text-[#A1A1A6] hover:text-[#F5F5F5] border border-[#2A2A2D]'
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
              className="w-full py-2.5 px-4 rounded-xl bg-[#1E1E20] hover:bg-[#2A2A2D] border border-[#2A2A2D] flex items-center justify-between text-xs font-semibold text-[#A1A1A6] hover:text-[#F5F5F5] transition-colors min-h-[44px]"
            >
              <span className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-[#30D158]" />
                Detailed Micronutrients & Minerals
              </span>
              {showMicros ? (
                <ChevronUp className="w-4 h-4 text-[#A1A1A6]" />
              ) : (
                <ChevronDown className="w-4 h-4 text-[#A1A1A6]" />
              )}
            </button>

            {showMicros && (
              <div className="mt-2 p-3 bg-[#1E1E20] rounded-xl border border-[#2A2A2D] space-y-2 animate-fade-in text-xs">
                {IOM_MICRONUTRIENT_STANDARDS.map(standard => {
                  const val = nutrients[standard.key];
                  return (
                    <div key={standard.key} className="flex justify-between items-center py-1 border-b border-[#2A2A2D] last:border-none">
                      <span className="text-[#A1A1A6]">{standard.name}</span>
                      <span className="font-mono tabular-nums font-semibold text-[#F5F5F5]">
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
            <p className="text-[11px] text-[#A1A1A6]/70 italic text-center">
              Source: {food.sourceAttribution}
            </p>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-[#2A2A2D] bg-[#151517] flex items-center gap-3">
          <button
            onClick={onClose}
            className="flex-1 min-h-[44px] py-2.5 px-4 rounded-xl bg-[#1E1E20] hover:bg-[#2A2A2D] border border-[#2A2A2D] text-[#A1A1A6] hover:text-[#F5F5F5] font-bold text-xs uppercase tracking-wide transition-all"
          >
            Cancel
          </button>
          <button
            onClick={handleLog}
            disabled={isLogging || quantity <= 0}
            className="flex-[2] min-h-[44px] py-2.5 px-4 rounded-xl bg-[#FF8A00] hover:bg-[#FF8A00]/90 text-black font-bold text-xs uppercase tracking-wide shadow-sm transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {isLogging ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Plus className="w-4 h-4" />
            )}
            Log to {selectedMealType}
          </button>
        </div>
      </div>
    </div>
  );
}
