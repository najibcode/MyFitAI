// ─────────────────────────────────────────────────────────────
// MyFitAI — USDA FoodData Central Data Provider
// Official reference data for generic and standardized raw ingredients
// Supports optional VITE_USDA_API_KEY with built-in Foundation fallback
// ─────────────────────────────────────────────────────────────

import type { FoodDataProvider, FoodSearchParams } from './types';
import type { FoodItem, ServingOption } from '../../../types/nutrition';
import { db } from '../../../utils/db';

const USDA_API_KEY = import.meta.env.VITE_USDA_API_KEY || 'DEMO_KEY';
const FDC_BASE_URL = 'https://api.nal.usda.gov/fdc/v1';

// Foundation Reference Data (USDA Standard Reference)
const USDA_FOUNDATION_FOODS: FoodItem[] = [
  {
    id: 'usda_11090',
    name: 'Broccoli, raw',
    category: 'Vegetables',
    emoji: '🥦',
    source: 'usda',
    sourceAttribution: 'USDA FoodData Central (FDC ID: 11090)',
    isVerified: true,
    nutrientsPer100g: {
      calories: 34,
      protein: 2.82,
      carbohydrates: 6.64,
      fat: 0.37,
      fiber: 2.6,
      sugar: 1.7,
      sodium: 33,
      potassium: 316,
      calcium: 47,
      iron: 0.73,
      vitaminC: 89.2,
      magnesium: 21,
    },
    defaultServing: { quantity: 1, unit: 'cup', gramEquivalent: 91 },
    availableServings: [
      { unit: 'cup', gramEquivalent: 91, label: '1 cup chopped (91g)' },
      { unit: 'piece', gramEquivalent: 148, label: '1 stalk (148g)' },
      { unit: 'g', gramEquivalent: 1, label: '1 gram' },
    ],
  },
  {
    id: 'usda_09003',
    name: 'Apples, raw, with skin',
    category: 'Fruits',
    emoji: '🍎',
    source: 'usda',
    sourceAttribution: 'USDA FoodData Central (FDC ID: 09003)',
    isVerified: true,
    nutrientsPer100g: {
      calories: 52,
      protein: 0.26,
      carbohydrates: 13.81,
      fat: 0.17,
      fiber: 2.4,
      sugar: 10.39,
      potassium: 107,
      calcium: 6,
      iron: 0.12,
      vitaminC: 4.6,
    },
    defaultServing: { quantity: 1, unit: 'piece', gramEquivalent: 182 },
    availableServings: [
      { unit: 'piece', gramEquivalent: 182, label: '1 medium apple (182g)' },
      { unit: 'piece', gramEquivalent: 242, label: '1 large apple (242g)' },
      { unit: 'g', gramEquivalent: 1, label: '1 gram' },
    ],
  },
  {
    id: 'usda_05062',
    name: 'Chicken breast, meat only, cooked, roasted',
    category: 'Poultry',
    emoji: '🍗',
    source: 'usda',
    sourceAttribution: 'USDA FoodData Central (FDC ID: 05062)',
    isVerified: true,
    nutrientsPer100g: {
      calories: 165,
      protein: 31.02,
      carbohydrates: 0,
      fat: 3.57,
      sodium: 74,
      potassium: 256,
      calcium: 15,
      iron: 1.04,
      magnesium: 29,
      zinc: 1.0,
    },
    defaultServing: { quantity: 1, unit: 'piece', gramEquivalent: 150 },
    availableServings: [
      { unit: 'piece', gramEquivalent: 150, label: '1 breast half (150g)' },
      { unit: 'serving', gramEquivalent: 100, label: '100g cooked' },
      { unit: 'g', gramEquivalent: 1, label: '1 gram' },
    ],
  },
  {
    id: 'usda_01123',
    name: 'Egg, whole, raw, fresh',
    category: 'Dairy and Egg Products',
    emoji: '🥚',
    source: 'usda',
    sourceAttribution: 'USDA FoodData Central (FDC ID: 01123)',
    isVerified: true,
    nutrientsPer100g: {
      calories: 143,
      protein: 12.56,
      carbohydrates: 0.72,
      fat: 9.51,
      saturatedFat: 3.1,
      sodium: 142,
      potassium: 138,
      calcium: 56,
      iron: 1.75,
      vitaminD: 2.0,
      vitaminB12: 0.89,
    },
    defaultServing: { quantity: 1, unit: 'piece', gramEquivalent: 50 },
    availableServings: [
      { unit: 'piece', gramEquivalent: 50, label: '1 large egg (50g)' },
      { unit: 'serving', gramEquivalent: 100, label: '2 large eggs (100g)' },
      { unit: 'g', gramEquivalent: 1, label: '1 gram' },
    ],
  },
  {
    id: 'usda_12061',
    name: 'Almonds, whole, raw',
    category: 'Nut and Seed Products',
    emoji: '🥜',
    source: 'usda',
    sourceAttribution: 'USDA FoodData Central (FDC ID: 12061)',
    isVerified: true,
    nutrientsPer100g: {
      calories: 579,
      protein: 21.15,
      carbohydrates: 21.55,
      fat: 49.93,
      fiber: 12.5,
      calcium: 269,
      iron: 3.71,
      magnesium: 270,
      potassium: 733,
      zinc: 3.12,
    },
    defaultServing: { quantity: 1, unit: 'serving', gramEquivalent: 28 },
    availableServings: [
      { unit: 'serving', gramEquivalent: 28, label: '1 handful / 23 almonds (28g)' },
      { unit: 'cup', gramEquivalent: 143, label: '1 cup whole (143g)' },
      { unit: 'g', gramEquivalent: 1, label: '1 gram' },
    ],
  },
];

function transformFDCFood(food: any): FoodItem {
  const nutrients: any = {};
  for (const n of food.foodNutrients || []) {
    const name = (n.nutrientName || '').toLowerCase();
    const val = Number(n.value || 0);

    if (name.includes('energy') && (n.unitName === 'KCAL' || !nutrients.calories)) {
      nutrients.calories = Math.round(val);
    } else if (name.includes('protein')) {
      nutrients.protein = Math.round(val * 10) / 10;
    } else if (name.includes('carbohydrate')) {
      nutrients.carbohydrates = Math.round(val * 10) / 10;
    } else if (name.includes('total lipid') || name === 'fat') {
      nutrients.fat = Math.round(val * 10) / 10;
    } else if (name.includes('fiber')) {
      nutrients.fiber = Math.round(val * 10) / 10;
    } else if (name.includes('sugars, total')) {
      nutrients.sugar = Math.round(val * 10) / 10;
    } else if (name.includes('fatty acids, total saturated')) {
      nutrients.saturatedFat = Math.round(val * 10) / 10;
    } else if (name.includes('sodium')) {
      nutrients.sodium = Math.round(val);
    } else if (name.includes('potassium')) {
      nutrients.potassium = Math.round(val);
    } else if (name.includes('calcium')) {
      nutrients.calcium = Math.round(val);
    } else if (name.includes('iron')) {
      nutrients.iron = Math.round(val * 10) / 10;
    }
  }

  const servings: ServingOption[] = [
    { unit: 'g', gramEquivalent: 1, label: '1 gram' },
    { unit: 'serving', gramEquivalent: 100, label: '100 grams' },
  ];

  if (food.servingSize) {
    servings.push({
      unit: 'serving',
      gramEquivalent: Math.round(food.servingSize),
      label: `${food.servingSize} ${food.servingSizeUnit || 'g'}`,
    });
  }

  return {
    id: `usda_${food.fdcId}`,
    name: food.description,
    brand: food.brandOwner || undefined,
    category: food.foodCategory || 'Standard Food',
    source: 'usda',
    sourceAttribution: `USDA FoodData Central (FDC ID: ${food.fdcId})`,
    nutrientsPer100g: {
      calories: nutrients.calories || 0,
      protein: nutrients.protein || 0,
      carbohydrates: nutrients.carbohydrates || 0,
      fat: nutrients.fat || 0,
      fiber: nutrients.fiber,
      sugar: nutrients.sugar,
      saturatedFat: nutrients.saturatedFat,
      sodium: nutrients.sodium,
      potassium: nutrients.potassium,
      calcium: nutrients.calcium,
      iron: nutrients.iron,
    },
    defaultServing: {
      quantity: 1,
      unit: servings[2] ? 'serving' : 'g',
      gramEquivalent: food.servingSize ? Math.round(food.servingSize) : 100,
    },
    availableServings: servings,
    isVerified: true,
  };
}

export class USDAProvider implements FoodDataProvider {
  readonly id = 'usda';
  readonly name = 'USDA FoodData Central';
  readonly attribution = 'U.S. Department of Agriculture, Agricultural Research Service';

  async search(params: FoodSearchParams): Promise<FoodItem[]> {
    const q = params.query.trim().toLowerCase();
    if (!q) return [];

    // Check built-in foundation foods first
    const localMatches = USDA_FOUNDATION_FOODS.filter(f =>
      f.name.toLowerCase().includes(q) || f.category?.toLowerCase().includes(q)
    );

    // If online and API key or DEMO key available, try live search
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3500);

      const url = `${FDC_BASE_URL}/foods/search?api_key=${encodeURIComponent(
        USDA_API_KEY
      )}&query=${encodeURIComponent(q)}&pageSize=${params.limit || 10}&dataType=Foundation,SR%20Legacy`;

      const res = await fetch(url, { signal: controller.signal });
      clearTimeout(timeoutId);

      if (res.ok) {
        const data = await res.json();
        if (data.foods && Array.isArray(data.foods)) {
          const remoteItems = data.foods.map(transformFDCFood);
          // Cache in local db
          for (const item of remoteItems) {
            db.nutrition.foodCache.save(item).catch(() => {});
          }
          return [...localMatches, ...remoteItems];
        }
      }
    } catch {
      // Offline fallback
    }

    return localMatches;
  }

  async getById(id: string): Promise<FoodItem | null> {
    const local = USDA_FOUNDATION_FOODS.find(f => f.id === id);
    if (local) return local;

    try {
      const cached = await db.nutrition.foodCache.get(id);
      if (cached) return cached;
    } catch {}

    return null;
  }
}

export const usdaProvider = new USDAProvider();
