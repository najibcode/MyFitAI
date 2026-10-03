// ─────────────────────────────────────────────────────────────
// MyFitAI — Recipe Builder Modal
// Construct recipes with multi-ingredient lookup, automatic
// per-serving nutrient scaling, and instant diary logging.
// ─────────────────────────────────────────────────────────────

import { useState, useMemo } from 'react';
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
      <div className="bg-[var(--color-surface-container)] w-full max-w-lg rounded-3xl h-[88vh] max-h-[750px] flex flex-col overflow-hidden border border-white/10 shadow-2xl">
        {/* Header */}
        <div className="p-4 border-b border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
              <span className="material-symbols-outlined text-[20px]">menu_book</span>
            </div>
            <div>
              <h3 className="font-headline font-bold text-base text-on-surface">Recipe Builder</h3>
              <p className="text-[11px] text-on-surface-variant">Combine ingredients into balanced recipes</p>
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
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 space-y-4">
          <div className="space-y-3">
            <div>
              <label className="text-[10px] uppercase font-bold tracking-wider text-on-surface-variant block mb-1">
                Recipe Title *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. High Protein Chicken Bowl, Oats Shake"
                value={name}
                onChange={e => setName(e.target.value)}
                className="w-full bg-[var(--color-surface-container-high)] border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-on-surface outline-none focus:border-primary font-bold"
              />
            </div>

            <div>
              <label className="text-[10px] uppercase font-bold tracking-wider text-on-surface-variant block mb-1">
                Description (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. Healthy lunch meal prep for work"
                value={description}
                onChange={e => setDescription(e.target.value)}
                className="w-full bg-[var(--color-surface-container-high)] border border-white/10 rounded-xl px-3.5 py-2 text-xs text-on-surface outline-none focus:border-primary"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] uppercase font-bold tracking-wider text-on-surface-variant block mb-1">
                  Servings
                </label>
                <input
                  type="number"
                  min="1"
                  max="50"
                  value={servings}
                  onChange={e => setServings(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-full bg-[var(--color-surface-container-high)] border border-white/10 rounded-xl px-3 py-2 text-sm text-on-surface outline-none focus:border-primary font-bold text-center"
                />
              </div>
              <div>
                <label className="text-[10px] uppercase font-bold tracking-wider text-on-surface-variant block mb-1">
                  Prep Time (Mins)
                </label>
                <input
                  type="number"
                  min="1"
                  value={prepTimeMinutes}
                  onChange={e => setPrepTimeMinutes(e.target.value)}
                  className="w-full bg-[var(--color-surface-container-high)] border border-white/10 rounded-xl px-3 py-2 text-sm text-on-surface outline-none focus:border-primary font-bold text-center"
                />
              </div>
            </div>
          </div>

          {/* Per-Serving Macro Preview Bar */}
          <div className="bg-gradient-to-r from-primary/10 via-[var(--color-surface-container-high)] to-transparent p-3.5 rounded-2xl border border-primary/20">
            <div className="flex justify-between items-baseline mb-2">
              <span className="text-[10px] uppercase font-bold text-primary">Per Serving (1 of {servings})</span>
              <span className="font-headline font-black text-xl text-on-surface">
                {perServingNutrients.calories} <span className="text-xs text-on-surface-variant font-normal">kcal</span>
              </span>
            </div>
            <div className="grid grid-cols-4 gap-2 text-center text-xs">
              <div className="bg-black/20 p-1.5 rounded-lg">
                <span className="text-[9px] text-amber-400 font-bold block">Protein</span>
                <span className="font-bold text-on-surface">{perServingNutrients.protein}g</span>
              </div>
              <div className="bg-black/20 p-1.5 rounded-lg">
                <span className="text-[9px] text-sky-400 font-bold block">Carbs</span>
                <span className="font-bold text-on-surface">{perServingNutrients.carbohydrates}g</span>
              </div>
              <div className="bg-black/20 p-1.5 rounded-lg">
                <span className="text-[9px] text-rose-400 font-bold block">Fat</span>
                <span className="font-bold text-on-surface">{perServingNutrients.fat}g</span>
              </div>
              <div className="bg-black/20 p-1.5 rounded-lg">
                <span className="text-[9px] text-emerald-400 font-bold block">Fiber</span>
                <span className="font-bold text-on-surface">{perServingNutrients.fiber ?? 0}g</span>
              </div>
            </div>
          </div>

          {/* Ingredients Section */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-[10px] uppercase font-bold tracking-wider text-on-surface-variant">
                Ingredients ({ingredients.length})
              </label>
              <button
                type="button"
                onClick={() => setShowSearch(true)}
                className="text-primary text-xs font-bold flex items-center gap-1 hover:underline"
              >
                <span className="material-symbols-outlined text-[16px]">add_circle</span>
                Add Ingredient
              </button>
            </div>

            {/* In-modal Ingredient Search */}
            {showSearch && (
              <div className="p-3 bg-[var(--color-surface-container-high)] rounded-2xl border border-primary/30 space-y-2 animate-fade-in">
                <div className="flex gap-2">
                  <input
                    type="text"
                    autoFocus
                    placeholder="Search ingredient (chicken, rice, paneer...)"
                    value={searchQuery}
                    onChange={e => handleSearch(e.target.value)}
                    className="flex-1 bg-[var(--color-surface-container)] border border-white/10 rounded-xl px-3 py-1.5 text-xs text-on-surface outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setShowSearch(false);
                      setSearchQuery('');
                      setSearchResults([]);
                    }}
                    className="text-xs text-on-surface-variant hover:text-on-surface px-2"
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
                        className="p-2 rounded-xl bg-white/[0.03] hover:bg-white/[0.08] cursor-pointer flex items-center justify-between text-xs transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          <span>{f.emoji || '🍽️'}</span>
                          <span className="font-bold text-on-surface">{f.name}</span>
                        </div>
                        <span className="text-[11px] text-on-surface-variant">{f.nutrientsPer100g.calories} kcal/100g</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* List of Added Ingredients */}
            {ingredients.length === 0 && !showSearch && (
              <div className="py-6 text-center text-on-surface-variant bg-[var(--color-surface-container-high)] rounded-2xl border border-dashed border-white/10">
                <span className="material-symbols-outlined text-3xl opacity-30 mb-1">grocery</span>
                <p className="text-xs">No ingredients added yet.</p>
                <button
                  type="button"
                  onClick={() => setShowSearch(true)}
                  className="mt-2 text-xs font-bold text-primary underline"
                >
                  Click here to search foods
                </button>
              </div>
            )}

            {ingredients.map((ing, idx) => (
              <div
                key={idx}
                className="bg-[var(--color-surface-container-high)] p-3 rounded-2xl border border-white/5 flex items-center gap-3"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mb-1">
                    <span>{ing.foodItem.emoji || '🍽️'}</span>
                    <span className="font-bold text-xs text-on-surface truncate">{ing.foodItem.name}</span>
                  </div>
                  <div className="flex items-center gap-2 text-[10px] text-on-surface-variant">
                    <span>{ing.calculatedNutrients.calories} kcal</span>
                    <span>•</span>
                    <span className="text-amber-400">{ing.calculatedNutrients.protein}g P</span>
                    <span>•</span>
                    <span className="text-sky-400">{ing.calculatedNutrients.carbohydrates}g C</span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <input
                    type="number"
                    min="0.1"
                    step="0.5"
                    value={ing.quantity}
                    onChange={e => updateIngredientQuantity(idx, parseFloat(e.target.value) || 0, ing.unit)}
                    className="w-14 bg-[var(--color-surface-container)] border border-white/10 rounded-lg px-1.5 py-1 text-xs text-center font-bold text-on-surface outline-none"
                  />
                  <select
                    value={ing.unit}
                    onChange={e => updateIngredientQuantity(idx, ing.quantity, e.target.value as ServingUnit)}
                    className="bg-[var(--color-surface-container)] border border-white/10 rounded-lg px-2 py-1 text-xs text-on-surface outline-none"
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
                    className="w-7 h-7 rounded-lg text-rose-400 hover:bg-rose-500/10 flex items-center justify-center ml-1"
                  >
                    <span className="material-symbols-outlined text-[16px]">delete</span>
                  </button>
                </div>
              </div>
            ))}
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
              disabled={isSaving || !name.trim() || ingredients.length === 0}
              className="flex-[2] py-3 px-4 rounded-2xl bg-primary hover:bg-primary/90 text-black font-headline font-bold text-xs uppercase tracking-wider shadow-lg shadow-primary/20 disabled:opacity-50"
            >
              Save Recipe
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
