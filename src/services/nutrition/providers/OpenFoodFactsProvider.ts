// ─────────────────────────────────────────────────────────────
// MyFitAI — Open Food Facts Data Provider
// Production-grade integration with Open Food Facts API v2/v3
// Handles packaged foods, brand lookup, barcode scans, and Nutri-Score.
// License: Open Database License (ODbL) — proper attribution included.
// ─────────────────────────────────────────────────────────────

import type { FoodDataProvider, FoodSearchParams } from './types';
import type { FoodItem, ServingOption } from '../../../types/nutrition';
import { db } from '../../../utils/db';

const OFF_BASE_URL = 'https://world.openfoodfacts.org';

function parseNutriments(raw: any): FoodItem['nutrientsPer100g'] {
  const n = raw || {};
  let calories = Number(n['energy-kcal_100g'] ?? n['energy-kcal'] ?? 0);
  if (!calories && n['energy_100g']) {
    calories = Math.round(Number(n['energy_100g']) / 4.184); // kJ to kcal
  }

  const protein = Number(n['proteins_100g'] ?? n['proteins'] ?? 0);
  const carbs = Number(n['carbohydrates_100g'] ?? n['carbohydrates'] ?? 0);
  const fat = Number(n['fat_100g'] ?? n['fat'] ?? 0);
  const fiber = n['fiber_100g'] !== undefined ? Number(n['fiber_100g']) : undefined;
  const sugar = n['sugars_100g'] !== undefined ? Number(n['sugars_100g']) : undefined;
  const saturatedFat = n['saturated-fat_100g'] !== undefined ? Number(n['saturated-fat_100g']) : undefined;
  // Sodium in OFF is often reported in grams, convert to mg
  const rawSodiumG = Number(n['sodium_100g'] ?? (n['salt_100g'] ? Number(n['salt_100g']) / 2.5 : 0));
  const sodium = rawSodiumG > 0 ? Math.round(rawSodiumG * 1000) : undefined;
  const calcium = n['calcium_100g'] !== undefined ? Math.round(Number(n['calcium_100g']) * 1000) : undefined;
  const iron = n['iron_100g'] !== undefined ? Math.round(Number(n['iron_100g']) * 1000) : undefined;
  const potassium = n['potassium_100g'] !== undefined ? Math.round(Number(n['potassium_100g']) * 1000) : undefined;

  return {
    calories: Math.max(0, Math.round(calories)),
    protein: Math.max(0, Math.round(protein * 10) / 10),
    carbohydrates: Math.max(0, Math.round(carbs * 10) / 10),
    fat: Math.max(0, Math.round(fat * 10) / 10),
    fiber: fiber !== undefined ? Math.max(0, Math.round(fiber * 10) / 10) : undefined,
    sugar: sugar !== undefined ? Math.max(0, Math.round(sugar * 10) / 10) : undefined,
    saturatedFat: saturatedFat !== undefined ? Math.max(0, Math.round(saturatedFat * 10) / 10) : undefined,
    sodium: sodium !== undefined ? Math.max(0, sodium) : undefined,
    calcium,
    iron,
    potassium,
  };
}

function parseServingOptions(product: any): { defaultServing: FoodItem['defaultServing']; availableServings: ServingOption[] } {
  const servings: ServingOption[] = [
    { unit: 'g', gramEquivalent: 1, label: '1 gram' },
    { unit: 'serving', gramEquivalent: 100, label: 'Standard 100g' },
  ];

  let servingSizeGrams = 100;
  const rawServing = product.serving_size || '';

  // Extract numbers from strings like "30 g", "1 bar (45 g)", "240 ml"
  const match = rawServing.match(/(\d+(?:\.\d+)?)\s*(g|ml|oz)/i);
  if (match) {
    const val = parseFloat(match[1]);
    const unit = match[2].toLowerCase();
    if (unit === 'oz') {
      servingSizeGrams = Math.round(val * 28.35);
    } else {
      servingSizeGrams = Math.round(val);
    }

    servings.push({
      unit: rawServing.toLowerCase().includes('bar') || rawServing.toLowerCase().includes('bottle') ? 'piece' : 'serving',
      gramEquivalent: servingSizeGrams,
      label: rawServing,
    });
  }

  return {
    defaultServing: {
      quantity: 1,
      unit: servings[2] ? servings[2].unit : 'serving',
      gramEquivalent: servingSizeGrams,
    },
    availableServings: servings,
  };
}

function transformOFFProduct(p: any): FoodItem {
  const { defaultServing, availableServings } = parseServingOptions(p);
  const grade = p.nutriscore_grade?.toLowerCase();
  const validNutriScore = ['a', 'b', 'c', 'd', 'e'].includes(grade) ? (grade as any) : undefined;

  return {
    id: `off_${p.code || p.id || Math.random().toString(36).slice(2)}`,
    name: p.product_name || p.product_name_en || 'Packaged Product',
    brand: p.brands || undefined,
    category: p.categories_tags?.[0]?.replace(/^en:/, '').replace(/-/g, ' ') || 'Packaged Food',
    image: p.image_front_small_url || p.image_front_url || p.image_small_url || undefined,
    barcode: p.code || undefined,
    source: 'open_food_facts',
    sourceAttribution: 'Open Food Facts (ODbL License)',
    nutrientsPer100g: parseNutriments(p.nutriments),
    defaultServing,
    availableServings,
    nutriscore: validNutriScore,
    ingredientsText: p.ingredients_text || undefined,
    allergens: p.allergens_tags?.map((a: string) => a.replace(/^en:/, '')) || [],
  };
}

export class OpenFoodFactsProvider implements FoodDataProvider {
  readonly id = 'open_food_facts';
  readonly name = 'Open Food Facts';
  readonly attribution = 'Open Food Facts (ODbL)';

  async search(params: FoodSearchParams): Promise<FoodItem[]> {
    const q = params.query.trim();
    if (!q) return [];

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);

      const url = `${OFF_BASE_URL}/cgi/search.pl?search_terms=${encodeURIComponent(
        q
      )}&search_simple=1&action=process&json=1&page_size=${params.limit || 15}`;

      const res = await fetch(url, { signal: controller.signal });
      clearTimeout(timeoutId);

      if (!res.ok) return [];

      const data = await res.json();
      if (!data.products || !Array.isArray(data.products)) return [];

      const items: FoodItem[] = [];
      for (const p of data.products) {
        if (p.product_name && p.nutriments) {
          const item = transformOFFProduct(p);
          items.push(item);
          // Save to local cache in background for offline use
          db.nutrition.foodCache.save(item).catch(() => {});
        }
      }

      return items;
    } catch {
      // Offline or network error - fail gracefully
      return [];
    }
  }

  async getByBarcode(barcode: string): Promise<FoodItem | null> {
    const code = barcode.trim();
    if (!code) return null;

    // Check local cache first
    try {
      const cached = await db.nutrition.foodCache.getByBarcode(code);
      if (cached) return cached;
    } catch {}

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);

      const url = `${OFF_BASE_URL}/api/v2/product/${encodeURIComponent(code)}.json`;
      const res = await fetch(url, { signal: controller.signal });
      clearTimeout(timeoutId);

      if (!res.ok) return null;

      const data = await res.json();
      if (data.status === 1 && data.product) {
        const item = transformOFFProduct(data.product);
        // Cache locally
        db.nutrition.foodCache.save(item).catch(() => {});
        return item;
      }
    } catch {
      // Offline fallback
    }

    return null;
  }

  async getById(id: string): Promise<FoodItem | null> {
    try {
      const cached = await db.nutrition.foodCache.get(id);
      if (cached) return cached;
    } catch {}
    return null;
  }
}

export const openFoodFactsProvider = new OpenFoodFactsProvider();
