// ─────────────────────────────────────────────────────────────
// MyFitAI — Food Search Modal
// Multi-provider search across Local, Indian DB, Open Food Facts,
// USDA, and Custom foods with debouncing, category pills, and favorites.
// ─────────────────────────────────────────────────────────────

import { useState, useEffect, useRef } from 'react';
import { Search, X, ScanBarcode, UtensilsCrossed, PlusCircle, Loader2 } from 'lucide-react';
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
      <div className="bg-[#151517] w-full max-w-lg rounded-2xl h-[88vh] max-h-[750px] flex flex-col overflow-hidden border border-[#2A2A2D] shadow-2xl">
        {/* Header */}
        <div className="p-4 border-b border-[#2A2A2D] space-y-3 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-base text-[#F5F5F5]">Add Food to {mealType}</h3>
              <p className="text-xs text-[#A1A1A6]">Search 10,000+ foods, Indian dishes & packaged products</p>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg bg-[#1E1E20] hover:bg-[#2A2A2D] border border-[#2A2A2D] flex items-center justify-center text-[#A1A1A6] hover:text-[#F5F5F5] transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Search Input Bar */}
          <div className="flex items-center gap-2">
            <div className="flex-1 bg-[#1E1E20] border border-[#2A2A2D] focus-within:border-[#30D158] rounded-xl px-3.5 py-2.5 flex items-center gap-2.5 transition-all">
              <Search className="w-4 h-4 text-[#A1A1A6] flex-shrink-0" />
              <input
                ref={inputRef}
                type="text"
                placeholder="Search food, brand, paneer, roti, oats..."
                value={query}
                onChange={e => setQuery(e.target.value)}
                className="w-full bg-transparent text-xs text-[#F5F5F5] outline-none placeholder-[#A1A1A6]/50"
              />
              {query && (
                <button onClick={() => setQuery('')} className="text-[#A1A1A6] hover:text-[#F5F5F5]">
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Barcode scanner button */}
            <button
              onClick={() => {
                onClose();
                onOpenBarcodeScanner();
              }}
              className="w-10 h-10 rounded-xl bg-[#1E1E20] hover:bg-[#2A2A2D] border border-[#2A2A2D] flex items-center justify-center text-[#A1A1A6] hover:text-[#FF8A00] transition-colors active:scale-95 flex-shrink-0 min-h-[44px]"
              title="Scan Barcode"
            >
              <ScanBarcode className="w-5 h-5" />
            </button>
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar text-xs">
            {tabs.map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap min-h-[36px] ${
                  activeTab === tab
                    ? 'bg-[#30D158] text-black font-bold shadow-sm'
                    : 'bg-[#1E1E20] text-[#A1A1A6] hover:text-[#F5F5F5] border border-[#2A2A2D]'
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
              <Loader2 className="w-6 h-6 text-[#30D158] animate-spin" />
              <p className="text-[11px] font-bold text-[#A1A1A6] uppercase tracking-wider">Searching databases...</p>
            </div>
          )}

          {!isLoading && searchResults.length === 0 && (
            <div className="py-12 px-6 text-center text-[#A1A1A6] flex flex-col items-center">
              <UtensilsCrossed className="w-10 h-10 mb-2 text-[#A1A1A6]/40" />
              <p className="font-bold text-sm text-[#F5F5F5] mb-1">No matching foods found</p>
              <p className="text-xs mb-4 max-w-xs">
                Couldn't find "{query}". You can create it as a custom food to log it now and recognize it later.
              </p>
              <button
                onClick={() => {
                  onClose();
                  onCreateCustomFood();
                }}
                className="px-5 py-2.5 bg-[#FF8A00] text-black font-bold text-xs uppercase tracking-wide rounded-xl shadow-sm active:scale-95 transition-all min-h-[44px]"
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
                  className="bg-[#1E1E20] hover:bg-[#2A2A2D] p-3.5 rounded-xl border border-[#2A2A2D] flex items-center gap-3.5 cursor-pointer active:scale-[0.99] transition-all group min-h-[56px]"
                >
                  <div className="w-10 h-10 rounded-lg bg-[#151517] border border-[#2A2A2D] flex items-center justify-center flex-shrink-0 overflow-hidden text-xl">
                    {food.image ? (
                      <img src={food.image} alt={food.name} className="w-full h-full object-cover" />
                    ) : (
                      <UtensilsCrossed className="w-4 h-4 text-[#A1A1A6]" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <h4 className="font-bold text-sm text-[#F5F5F5] truncate group-hover:text-[#30D158] transition-colors">
                        {food.name}
                      </h4>
                      {food.source === 'indian_db' && (
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-[#F5C542]/10 text-[#F5C542] border border-[#F5C542]/20 flex-shrink-0">
                          Indian
                        </span>
                      )}
                      {food.source === 'custom' && (
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-[#A78BFA]/10 text-[#A78BFA] border border-[#A78BFA]/20 flex-shrink-0">
                          Custom
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 text-[11px] text-[#A1A1A6] font-mono tabular-nums">
                      <span>{servingLabel}</span>
                      <span>•</span>
                      <span className="text-[#F5C542] font-semibold">{p}g P</span>
                      <span>•</span>
                      <span className="text-[#4F9CF9]">{c}g C</span>
                      <span>•</span>
                      <span className="text-[#FF453A]">{f}g F</span>
                    </div>
                  </div>

                  <div className="text-right flex-shrink-0">
                    <span className="font-mono tabular-nums font-black text-sm text-[#F5F5F5] block leading-tight">
                      {cal}
                    </span>
                    <span className="text-[10px] text-[#A1A1A6] font-medium">kcal/100g</span>
                  </div>
                </div>
              );
            })}
        </div>

        {/* Footer shortcuts */}
        <div className="p-3 bg-[#151517] border-t border-[#2A2A2D] flex items-center justify-between text-xs text-[#A1A1A6] px-4 min-h-[48px]">
          <button
            onClick={() => {
              onClose();
              onCreateCustomFood();
            }}
            className="flex items-center gap-1.5 text-[#30D158] hover:underline font-semibold"
          >
            <PlusCircle className="w-4 h-4" />
            New Custom Food
          </button>
          <span className="font-mono tabular-nums">{searchResults.length} results</span>
        </div>
      </div>
    </div>
  );
}
