// ─────────────────────────────────────────────────────────────
// MyFitAI — Recipe Builder Modal
// Construct recipes with multi-ingredient lookup, automatic
// per-serving nutrient scaling, and instant diary logging.
// ─────────────────────────────────────────────────────────────

import { useState, useMemo } from 'react';
import { BookOpen, X, PlusCircle, Trash2, UtensilsCrossed, Loader2 } from 'lucide-react';
import type { FoodItem, Recipe, RecipeIngredient, ServingUnit } from '../../types/nutrition';
import { calculateFoodNutrients, calculateRecipeNutrients } from '../../engine/nutritionCalculations';
import { foodRepository } from '../../services/nutrition/FoodRepository';

interface RecipeBuilderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveRecipe: (recipe: Omit<Recipe, 'id' | 'createdAt' | 'updatedAt'>) => Promise<any>;
}

export default function RecipeBuilderModal({
  isOpen,
  onClose,
  onSaveRecipe,
}: RecipeBuilderModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [servings, setServings] = useState<number>(2);
  const [prepTimeMinutes, setPrepTimeMinutes] = useState<string>('20');
  const [ingredients, setIngredients] = useState<RecipeIngredient[]>([]);

  // Search ingredient state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<FoodItem[]>([]);
  const [showSearch, setShowSearch] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Search ingredients
  const handleSearch = async (q: string) => {
    setSearchQuery(q);
    if (q.trim().length >= 2) {
      const res = await foodRepository.searchFoods(q.trim(), { limit: 10 });
      setSearchResults(res.items);
    } else {
      setSearchResults([]);
    }
  };

  const addIngredient = (food: FoodItem) => {
    const defaultQty = food.defaultServing?.quantity || 1;
    const defaultUnit = food.defaultServing?.unit || 'g';
    const { nutrients } = calculateFoodNutrients(food, defaultQty, defaultUnit);

    setIngredients(prev => [
      ...prev,
      {
        foodItem: food,
        quantity: defaultQty,
        unit: defaultUnit,
        calculatedNutrients: nutrients,
      },
    ]);
    setShowSearch(false);
    setSearchQuery('');
    setSearchResults([]);
  };

  const updateIngredientQuantity = (index: number, qty: number, unit: ServingUnit) => {
    setIngredients(prev => {
      const next = [...prev];
      const item = next[index];
      const { nutrients } = calculateFoodNutrients(item.foodItem, qty, unit);
      next[index] = {
        ...item,
        quantity: qty,
        unit,
        calculatedNutrients: nutrients,
      };
      return next;
    });
  };

  const removeIngredient = (index: number) => {
    setIngredients(prev => prev.filter((_, i) => i !== index));
  };

  // Recipe Total and Per-Serving Calculations
  const { totalNutrients, perServingNutrients } = useMemo(() => {
    return calculateRecipeNutrients(ingredients, servings);
  }, [ingredients, servings]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || ingredients.length === 0) return;

    setIsSaving(true);
    try {
      await onSaveRecipe({
        name: name.trim(),
        description: description.trim() || undefined,
        servings: Math.max(1, servings),
        prepTimeMinutes: parseInt(prepTimeMinutes) || 15,
        ingredients,
        totalNutrients,
        perServingNutrients,
      });
      onClose();
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-fade-in">
      <div className="bg-[#151517] w-full max-w-lg rounded-2xl h-[88vh] max-h-[750px] flex flex-col overflow-hidden border border-[#2A2A2D] shadow-2xl">
        {/* Header */}
        <div className="p-4 border-b border-[#2A2A2D] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#30D158]/10 border border-[#30D158]/20 flex items-center justify-center text-[#30D158]">
              <BookOpen className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-[#F5F5F5]">Recipe Builder</h3>
              <p className="text-[11px] text-[#A1A1A6]">Combine ingredients into balanced recipes</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-[#1E1E20] border border-[#2A2A2D] flex items-center justify-center text-[#A1A1A6] hover:text-[#F5F5F5] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 space-y-4">
          <div className="space-y-3">
            <div>
              <label className="text-[10px] uppercase font-bold tracking-wider text-[#A1A1A6] block mb-1">
                Recipe Title *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. High Protein Chicken Bowl, Oats Shake"
                value={name}
                onChange={e => setName(e.target.value)}
                className="w-full bg-[#1E1E20] border border-[#2A2A2D] rounded-xl px-3.5 py-2.5 text-sm text-[#F5F5F5] placeholder-[#A1A1A6]/40 outline-none focus:border-[#30D158] font-bold"
              />
            </div>

            <div>
              <label className="text-[10px] uppercase font-bold tracking-wider text-[#A1A1A6] block mb-1">
                Description (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. Healthy lunch meal prep for work"
                value={description}
                onChange={e => setDescription(e.target.value)}
                className="w-full bg-[#1E1E20] border border-[#2A2A2D] rounded-xl px-3.5 py-2 text-xs text-[#F5F5F5] placeholder-[#A1A1A6]/40 outline-none focus:border-[#30D158]"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] uppercase font-bold tracking-wider text-[#A1A1A6] block mb-1">
                  Servings
                </label>
                <input
                  type="number"
                  min="1"
                  max="50"
                  value={servings}
                  onChange={e => setServings(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-full bg-[#1E1E20] border border-[#2A2A2D] rounded-xl px-3 py-2 text-sm text-[#F5F5F5] outline-none focus:border-[#30D158] font-mono tabular-nums font-bold text-center"
                />
              </div>
              <div>
                <label className="text-[10px] uppercase font-bold tracking-wider text-[#A1A1A6] block mb-1">
                  Prep Time (Mins)
                </label>
                <input
                  type="number"
                  min="1"
                  value={prepTimeMinutes}
                  onChange={e => setPrepTimeMinutes(e.target.value)}
                  className="w-full bg-[#1E1E20] border border-[#2A2A2D] rounded-xl px-3 py-2 text-sm text-[#F5F5F5] outline-none focus:border-[#30D158] font-mono tabular-nums font-bold text-center"
                />
              </div>
            </div>
          </div>

          {/* Per-Serving Macro Preview Bar */}
          <div className="bg-[#1E1E20] p-4 rounded-xl border border-[#2A2A2D]">
            <div className="flex justify-between items-baseline mb-2">
              <span className="text-[10px] uppercase font-bold text-[#30D158]">Per Serving (1 of {servings})</span>
              <span className="font-mono tabular-nums font-black text-xl text-[#F5F5F5]">
                {perServingNutrients.calories} <span className="text-xs text-[#A1A1A6] font-normal">kcal</span>
              </span>
            </div>
            <div className="grid grid-cols-4 gap-2 text-center text-xs">
              <div className="bg-[#151517] p-2 rounded-lg border border-[#2A2A2D]">
                <span className="text-[9px] text-[#F5C542] font-bold block uppercase">Protein</span>
                <span className="font-mono tabular-nums font-bold text-[#F5F5F5]">{perServingNutrients.protein}g</span>
              </div>
              <div className="bg-[#151517] p-2 rounded-lg border border-[#2A2A2D]">
                <span className="text-[9px] text-[#4F9CF9] font-bold block uppercase">Carbs</span>
                <span className="font-mono tabular-nums font-bold text-[#F5F5F5]">{perServingNutrients.carbohydrates}g</span>
              </div>
              <div className="bg-[#151517] p-2 rounded-lg border border-[#2A2A2D]">
                <span className="text-[9px] text-[#FF453A] font-bold block uppercase">Fat</span>
                <span className="font-mono tabular-nums font-bold text-[#F5F5F5]">{perServingNutrients.fat}g</span>
              </div>
              <div className="bg-[#151517] p-2 rounded-lg border border-[#2A2A2D]">
                <span className="text-[9px] text-[#30D158] font-bold block uppercase">Fiber</span>
                <span className="font-mono tabular-nums font-bold text-[#F5F5F5]">{perServingNutrients.fiber ?? 0}g</span>
              </div>
            </div>
          </div>

          {/* Ingredients Section */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-[10px] uppercase font-bold tracking-wider text-[#A1A1A6]">
                Ingredients ({ingredients.length})
              </label>
              <button
                type="button"
                onClick={() => setShowSearch(true)}
                className="text-[#30D158] text-xs font-bold flex items-center gap-1 hover:underline"
              >
                <PlusCircle className="w-4 h-4" />
                Add Ingredient
              </button>
            </div>

            {/* In-modal Ingredient Search */}
            {showSearch && (
              <div className="p-3 bg-[#1E1E20] rounded-xl border border-[#30D158]/40 space-y-2 animate-fade-in">
                <div className="flex gap-2">
                  <input
                    type="text"
                    autoFocus
                    placeholder="Search ingredient (chicken, rice, paneer...)"
                    value={searchQuery}
                    onChange={e => handleSearch(e.target.value)}
                    className="flex-1 bg-[#151517] border border-[#2A2A2D] rounded-xl px-3 py-2 text-xs text-[#F5F5F5] outline-none focus:border-[#30D158]"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setShowSearch(false);
                      setSearchQuery('');
                      setSearchResults([]);
                    }}
                    className="text-xs text-[#A1A1A6] hover:text-[#F5F5F5] px-2"
                  >
                    Cancel
                  </button>
                </div>

                {searchResults.length > 0 && (
                  <div className="max-h-44 overflow-y-auto space-y-1">
                    {searchResults.map(f => (
                      <div
                        key={f.id}
                        onClick={() => addIngredient(f)}
                        className="p-2.5 rounded-lg bg-[#151517] hover:bg-[#2A2A2D] border border-[#2A2A2D] cursor-pointer flex items-center justify-between text-xs transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          <UtensilsCrossed className="w-3.5 h-3.5 text-[#30D158]" />
                          <span className="font-bold text-[#F5F5F5]">{f.name}</span>
                        </div>
                        <span className="text-[11px] text-[#A1A1A6] font-mono tabular-nums">{f.nutrientsPer100g.calories} kcal/100g</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* List of Added Ingredients */}
            {ingredients.length === 0 && !showSearch && (
              <div className="py-6 text-center text-[#A1A1A6] bg-[#1E1E20] rounded-xl border border-dashed border-[#2A2A2D] flex flex-col items-center">
                <UtensilsCrossed className="w-8 h-8 opacity-40 mb-1" />
                <p className="text-xs">No ingredients added yet.</p>
                <button
                  type="button"
                  onClick={() => setShowSearch(true)}
                  className="mt-2 text-xs font-bold text-[#30D158] hover:underline"
                >
                  Click here to search foods
                </button>
              </div>
            )}

            {ingredients.map((ing, idx) => (
              <div
                key={idx}
                className="bg-[#1E1E20] p-3 rounded-xl border border-[#2A2A2D] flex items-center gap-3"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="font-bold text-xs text-[#F5F5F5] truncate">{ing.foodItem.name}</span>
                  </div>
                  <div className="flex items-center gap-2 text-[10px] text-[#A1A1A6] font-mono tabular-nums">
                    <span>{ing.calculatedNutrients.calories} kcal</span>
                    <span>•</span>
                    <span className="text-[#F5C542]">{ing.calculatedNutrients.protein}g P</span>
                    <span>•</span>
                    <span className="text-[#4F9CF9]">{ing.calculatedNutrients.carbohydrates}g C</span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <input
                    type="number"
                    min="0.1"
                    step="0.5"
                    value={ing.quantity}
                    onChange={e => updateIngredientQuantity(idx, parseFloat(e.target.value) || 0, ing.unit)}
                    className="w-14 bg-[#151517] border border-[#2A2A2D] rounded-lg px-1.5 py-1 text-xs text-center font-mono tabular-nums font-bold text-[#F5F5F5] outline-none"
                  />
                  <select
                    value={ing.unit}
                    onChange={e => updateIngredientQuantity(idx, ing.quantity, e.target.value as ServingUnit)}
                    className="bg-[#151517] border border-[#2A2A2D] rounded-lg px-2 py-1 text-xs text-[#F5F5F5] outline-none"
                  >
                    <option value="g">g</option>
                    <option value="cup">cup</option>
                    <option value="bowl">bowl</option>
                    <option value="piece">pc</option>
                    <option value="tbsp">tbsp</option>
                    <option value="serving">serving</option>
                  </select>

                  <button
                    type="button"
                    onClick={() => removeIngredient(idx)}
                    className="w-8 h-8 rounded-lg text-[#FF453A] hover:bg-[#FF453A]/10 flex items-center justify-center ml-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="pt-2 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 min-h-[44px] py-3 px-4 rounded-xl bg-[#1E1E20] hover:bg-[#2A2A2D] border border-[#2A2A2D] text-[#A1A1A6] hover:text-[#F5F5F5] font-bold text-xs uppercase tracking-wider transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving || !name.trim() || ingredients.length === 0}
              className="flex-[2] min-h-[44px] py-3 px-4 rounded-xl bg-[#FF8A00] hover:bg-[#FF8A00]/90 text-black font-bold text-xs uppercase tracking-wider shadow-sm flex items-center justify-center gap-1.5 disabled:opacity-50 transition-all"
            >
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              Save Recipe
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
