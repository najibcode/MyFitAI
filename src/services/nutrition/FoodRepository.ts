// ─────────────────────────────────────────────────────────────
// MyFitAI — Food Repository & Provider Router
// Centralized routing layer orchestrating multi-provider food queries,
// barcode scanning, local caching, favorites, and recents.
// ─────────────────────────────────────────────────────────────

import type { FoodItem } from '../../types/nutrition';
import { localFoodProvider } from './providers/LocalFoodProvider';
import { indianFoodProvider } from './providers/IndianFoodProvider';
import { openFoodFactsProvider } from './providers/OpenFoodFactsProvider';
import { usdaProvider } from './providers/USDAProvider';
import { customFoodProvider } from './providers/CustomFoodProvider';
import { storage } from '../../utils/storage';

export interface UnifiedSearchResult {
  items: FoodItem[];
  providersQueried: string[];
}

const FAVORITES_STORAGE_KEY = 'nutrition_favorite_food_ids';
const RECENTS_STORAGE_KEY = 'nutrition_recent_foods';

export class FoodRepository {
  /**
   * Search across all providers in priority order:
   * 1. Custom & Local foods
   * 2. Indian Food Database
   * 3. Open Food Facts
   * 4. USDA FoodData Central
   */
  async searchFoods(query: string, options?: { category?: string; limit?: number }): Promise<UnifiedSearchResult> {
    const q = query.trim();
    const limit = options?.limit || 25;
    const providersQueried: string[] = [];

    // Parallel dispatch with priority merging
    const [customMatches, localMatches, indianMatches, offMatches, usdaMatches] = await Promise.all([
      customFoodProvider.search({ query: q, limit: 10 }).catch(() => []),
      localFoodProvider.search({ query: q, category: options?.category, limit: 15 }).catch(() => []),
      indianFoodProvider.search({ query: q, category: options?.category, limit: 15 }).catch(() => []),
      q.length >= 2 ? openFoodFactsProvider.search({ query: q, limit: 10 }).catch(() => []) : Promise.resolve([]),
      q.length >= 2 ? usdaProvider.search({ query: q, limit: 10 }).catch(() => []) : Promise.resolve([]),
    ]);

    providersQueried.push('local', 'indian_db', 'custom');
    if (q.length >= 2) providersQueried.push('open_food_facts', 'usda');

    // Combine in priority order and deduplicate by normalized name + brand
    const seen = new Set<string>();
    const combined: FoodItem[] = [];

    const addUnique = (items: FoodItem[]) => {
      for (const item of items) {
        const key = `${(item.name || '').toLowerCase()}|${(item.brand || '').toLowerCase()}`;
        if (!seen.has(key)) {
          seen.add(key);
          combined.push(item);
        }
      }
    };

    addUnique(customMatches);
    addUnique(indianMatches);
    addUnique(localMatches);
    addUnique(offMatches);
    addUnique(usdaMatches);

    return {
      items: combined.slice(0, limit),
      providersQueried,
    };
  }

  /**
   * Barcode Lookup:
   * 1. Check user custom foods
   * 2. Check Open Food Facts
   */
  async lookupBarcode(barcode: string): Promise<FoodItem | null> {
    const code = barcode.trim();
    if (!code) return null;

    // 1. User custom food with this barcode
    const custom = await customFoodProvider.getByBarcode(code);
    if (custom) return custom;

    // 2. Open Food Facts
    const offProduct = await openFoodFactsProvider.getByBarcode(code);
    if (offProduct) return offProduct;

    return null;
  }

  /**
   * Lookup food by id across providers
   */
  async getFoodById(id: string): Promise<FoodItem | null> {
    if (id.startsWith('custom_')) return customFoodProvider.getById(id);
    if (id.startsWith('ind_') || id.startsWith('ifct_')) return indianFoodProvider.getById(id);
    if (id.startsWith('local_')) return localFoodProvider.getById(id);
    if (id.startsWith('off_')) return openFoodFactsProvider.getById(id);
    if (id.startsWith('usda_')) return usdaProvider.getById(id);

    // Fallback checks
    const found =
      (await customFoodProvider.getById(id)) ||
      (await indianFoodProvider.getById(id)) ||
      (await localFoodProvider.getById(id));
    return found;
  }

  // ── Favorites Management ──────────────────────────────────
  getFavoriteFoodIds(): string[] {
    return storage.get<string[]>(FAVORITES_STORAGE_KEY) || [];
  }

  isFavorite(foodId: string): boolean {
    const favs = this.getFavoriteFoodIds();
    return favs.includes(foodId);
  }

  toggleFavorite(foodId: string): boolean {
    const favs = this.getFavoriteFoodIds();
    const idx = favs.indexOf(foodId);
    let next: string[];
    let added: boolean;
    if (idx >= 0) {
      next = favs.filter(id => id !== foodId);
      added = false;
    } else {
      next = [foodId, ...favs];
      added = true;
    }
    storage.set(FAVORITES_STORAGE_KEY, next);
    return added;
  }

  // ── Recent Foods Management ──────────────────────────────
  getRecentFoods(): FoodItem[] {
    return storage.get<FoodItem[]>(RECENTS_STORAGE_KEY) || [];
  }

  recordRecentFood(food: FoodItem): void {
    const recents = this.getRecentFoods().filter(f => f.id !== food.id);
    const updated = [food, ...recents].slice(0, 15);
    storage.set(RECENTS_STORAGE_KEY, updated);
  }
}

export const foodRepository = new FoodRepository();
