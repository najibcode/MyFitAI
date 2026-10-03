// ─────────────────────────────────────────────────────────────
// MyFitAI — Food Search Modal
// Multi-provider search across Local, Indian DB, Open Food Facts,
// USDA, and Custom foods with debouncing, category pills, and favorites.
// ─────────────────────────────────────────────────────────────

import { useState, useEffect, useRef } from 'react';
import type { FoodItem, MealType } from '../../types/nutrition';
import { foodRepository } from '../../services/nutrition/FoodRepository';

interface FoodSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectFood: (food: FoodItem) => void;
  onOpenBarcodeScanner: () => void;
  onCreateCustomFood: () => void;
  mealType: MealType;
}

type FilterTab = 'All' | 'Indian' | 'Whole Foods' | 'Packaged' | 'Favorites' | 'Recents' | 'Custom';

export default function FoodSearchModal({
  isOpen,
  onClose,
  onSelectFood,
  onOpenBarcodeScanner,
  onCreateCustomFood,
  mealType,
}: FoodSearchModalProps) {
  const [query, setQuery] = useState('');
  const [activeTab, setActiveTab] = useState<FilterTab>('All');
  const [searchResults, setSearchResults] = useState<FoodItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  // Focus search input on open
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  // Debounced multi-provider search
  useEffect(() => {
    if (!isOpen) return;

    if (activeTab === 'Favorites') {
      const favIds = foodRepository.getFavoriteFoodIds();
      Promise.all(favIds.map(id => foodRepository.getFoodById(id))).then(items => {
        setSearchResults(items.filter((i): i is FoodItem => !!i));
      });
      return;
    }

    if (activeTab === 'Recents') {
      const recents = foodRepository.getRecentFoods();
      setSearchResults(recents);
      return;
    }

    let isCurrent = true;
    setIsLoading(true);

    const timer = setTimeout(async () => {
      try {
        const { items } = await foodRepository.searchFoods(query, {
          category: activeTab === 'Whole Foods' ? undefined : undefined,
          limit: 30,
        });

        if (isCurrent) {
          let filtered = items;
          if (activeTab === 'Indian') {
            filtered = items.filter(i => i.source === 'indian_db');
          } else if (activeTab === 'Packaged') {
            filtered = items.filter(i => i.source === 'open_food_facts' || !!i.brand);
          } else if (activeTab === 'Custom') {
            filtered = items.filter(i => i.source === 'custom');
          }
          setSearchResults(filtered);
        }
      } catch (err) {
        console.warn('Food search failed:', err);
      } finally {
        if (isCurrent) setIsLoading(false);
      }
    }, 250);

    return () => {
      isCurrent = false;
      clearTimeout(timer);
    };
  }, [query, activeTab, isOpen]);

  const tabs: FilterTab[] = ['All', 'Indian', 'Whole Foods', 'Packaged', 'Favorites', 'Recents', 'Custom'];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-fade-in">
      <div className="bg-[var(--color-surface-container)] w-full max-w-lg rounded-3xl h-[88vh] max-h-[750px] flex flex-col overflow-hidden border border-white/10 shadow-2xl">
        {/* Header */}
        <div className="p-4 border-b border-white/5 space-y-3 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-headline font-bold text-lg text-on-surface">Add Food to {mealType}</h3>
              <p className="text-xs text-on-surface-variant">Search 10,000+ foods, Indian dishes & packaged products</p>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-on-surface-variant hover:text-on-surface transition-colors"
            >
              <span className="material-symbols-outlined text-[18px]">close</span>
            </button>
          </div>

          {/* Search Input Bar */}
          <div className="flex items-center gap-2">
            <div className="flex-1 bg-[var(--color-surface-container-high)] border border-white/10 focus-within:border-primary rounded-2xl px-3.5 py-2.5 flex items-center gap-2.5 transition-all">
              <span className="material-symbols-outlined text-on-surface-variant text-[20px]">search</span>
              <input
                ref={inputRef}
                type="text"
                placeholder="Search food, brand, paneer, roti, oats..."
                value={query}
                onChange={e => setQuery(e.target.value)}
                className="w-full bg-transparent text-sm text-on-surface outline-none placeholder:text-on-surface-variant/50"
              />
              {query && (
                <button onClick={() => setQuery('')} className="text-on-surface-variant hover:text-on-surface">
                  <span className="material-symbols-outlined text-[16px]">cancel</span>
                </button>
              )}
            </div>

            {/* Barcode scanner button */}
            <button
              onClick={() => {
                onClose();
                onOpenBarcodeScanner();
              }}
              className="w-11 h-11 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center text-on-surface hover:text-primary transition-colors active:scale-95 flex-shrink-0"
              title="Scan Barcode"
            >
              <span className="material-symbols-outlined text-[22px]">barcode_scanner</span>
            </button>
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar text-xs">
            {tabs.map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-3 py-1.5 rounded-full font-semibold transition-all whitespace-nowrap ${
                  activeTab === tab
                    ? 'bg-primary text-black font-bold shadow-md shadow-primary/20 scale-[1.02]'
                    : 'bg-white/5 text-on-surface-variant hover:text-on-surface hover:bg-white/10'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        {/* Results List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {isLoading && (
            <div className="py-8 flex flex-col items-center justify-center gap-2">
              <div className="w-7 h-7 rounded-full border-2 border-primary border-t-transparent animate-spin" />
              <p className="text-[11px] font-bold text-on-surface-variant uppercase tracking-wider">Searching databases...</p>
            </div>
          )}

          {!isLoading && searchResults.length === 0 && (
            <div className="py-12 px-6 text-center text-on-surface-variant">
              <span className="material-symbols-outlined text-4xl mb-2 opacity-40">dinner_dining</span>
              <p className="font-bold text-sm text-on-surface mb-1">No matching foods found</p>
              <p className="text-xs mb-4">
                Couldn't find "{query}". You can create it as a custom food to log it now and recognize it later.
              </p>
              <button
                onClick={() => {
                  onClose();
                  onCreateCustomFood();
                }}
                className="px-5 py-2.5 bg-primary text-black font-headline font-bold text-xs uppercase tracking-wide rounded-xl shadow-md active:scale-95 transition-all"
              >
                Create Custom Food
              </button>
            </div>
          )}

          {!isLoading &&
            searchResults.map(food => {
              const servingLabel = food.defaultServing
                ? `${food.defaultServing.quantity} ${food.defaultServing.unit}`
                : '100g';
              const p = food.nutrientsPer100g.protein;
              const c = food.nutrientsPer100g.carbohydrates;
              const f = food.nutrientsPer100g.fat;
              const cal = food.nutrientsPer100g.calories;

              return (
                <div
                  key={food.id}
                  onClick={() => onSelectFood(food)}
                  className="bg-[var(--color-surface-container-high)] hover:bg-[var(--color-surface-container-highest)] p-3.5 rounded-2xl border border-white/5 flex items-center gap-3.5 cursor-pointer active:scale-[0.99] transition-all group"
                >
                  <div className="w-12 h-12 rounded-xl bg-black/20 border border-white/5 flex items-center justify-center flex-shrink-0 overflow-hidden text-2xl">
                    {food.image ? (
                      <img src={food.image} alt={food.name} className="w-full h-full object-cover" />
                    ) : (
                      <span>{food.emoji || '🍽️'}</span>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <h4 className="font-headline font-bold text-sm text-on-surface truncate group-hover:text-primary transition-colors">
                        {food.name}
                      </h4>
                      {food.source === 'indian_db' && (
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 flex-shrink-0">
                          Indian
                        </span>
                      )}
                      {food.source === 'custom' && (
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-400 border border-purple-500/20 flex-shrink-0">
                          Custom
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 text-[11px] text-on-surface-variant">
                      <span>{servingLabel}</span>
                      <span>•</span>
                      <span className="text-amber-400 font-semibold">{p}g P</span>
                      <span>•</span>
                      <span className="text-sky-400">{c}g C</span>
                      <span>•</span>
                      <span className="text-rose-400">{f}g F</span>
                    </div>
                  </div>

                  <div className="text-right flex-shrink-0">
                    <span className="font-headline font-black text-base text-on-surface block leading-tight">
                      {cal}
                    </span>
                    <span className="text-[10px] text-on-surface-variant font-medium">kcal/100g</span>
                  </div>
                </div>
              );
            })}
        </div>

        {/* Footer shortcuts */}
        <div className="p-3 bg-[var(--color-surface-container)] border-t border-white/5 flex items-center justify-between text-xs text-on-surface-variant px-4">
          <button
            onClick={() => {
              onClose();
              onCreateCustomFood();
            }}
            className="flex items-center gap-1.5 text-primary hover:underline font-semibold"
          >
            <span className="material-symbols-outlined text-[16px]">add_circle</span>
            New Custom Food
          </button>
          <span>{searchResults.length} results</span>
        </div>
      </div>
    </div>
  );
}
