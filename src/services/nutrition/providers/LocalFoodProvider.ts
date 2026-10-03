// ─────────────────────────────────────────────────────────────
// MyFitAI — Local Food Provider
// High-speed, offline-ready curated whole foods database
// ─────────────────────────────────────────────────────────────

import type { FoodDataProvider, FoodSearchParams } from './types';
import type { FoodItem, ServingOption } from '../../../types/nutrition';
import { NUTRITION_FOODS } from '../../../data/nutritionFoods';

/** Transform the existing NUTRITION_FOODS into rich FoodItem entities */
function transformNutritionFood(f: (typeof NUTRITION_FOODS)[number]): FoodItem {
  const servings: ServingOption[] = [
    { unit: 'g', gramEquivalent: 1, label: '1 gram' },
    {
      unit: f.servingLabel.includes('egg') || f.servingLabel.includes('medium') || f.servingLabel.includes('fillet') || f.servingLabel.includes('block') || f.servingLabel.includes('breast') || f.servingLabel.includes('can')
        ? 'piece'
        : f.servingLabel.includes('cup')
        ? 'cup'
        : 'serving',
      gramEquivalent: f.servingSize,
      label: `${f.servingLabel} (${f.servingSize}g)`,
    },
  ];

  if (f.servingSize !== 100) {
    servings.push({ unit: 'serving', gramEquivalent: 100, label: 'Standard (100g)' });
  }

  // Common conversions
  if (['Rice', 'Oats', 'Lentils', 'Chickpeas', 'Greek Yogurt', 'Milk'].includes(f.name)) {
    servings.push({ unit: 'cup', gramEquivalent: 200, label: '1 cup (200g)' });
    servings.push({ unit: 'bowl', gramEquivalent: 250, label: '1 bowl (250g)' });
  }
  if (['Olive Oil', 'Peanut Butter', 'Honey', 'Chia Seeds'].includes(f.name)) {
    servings.push({ unit: 'tbsp', gramEquivalent: 15, label: '1 tbsp (15g)' });
    servings.push({ unit: 'tsp', gramEquivalent: 5, label: '1 tsp (5g)' });
  }

  return {
    id: `local_${f.id}`,
    name: f.name,
    category: f.category,
    emoji: f.emoji,
    source: 'local',
    sourceAttribution: 'MyFitAI Curated Whole Foods',
    isVerified: true,
    nutrientsPer100g: {
      calories: f.calories,
      protein: f.protein,
      carbohydrates: f.carbs,
      fat: f.fat,
      fiber: f.fiber,
      sodium: f.category === 'Vegetable' ? 30 : f.category === 'Fruit' ? 2 : 75,
      potassium: f.name === 'Banana' ? 358 : f.name === 'Spinach' ? 558 : f.name === 'Salmon' ? 363 : 200,
      calcium: f.name === 'Greek Yogurt' ? 110 : f.name === 'Paneer' ? 208 : f.name === 'Spinach' ? 99 : 25,
      iron: f.name === 'Spinach' ? 2.7 : f.name === 'Lean Beef' ? 2.6 : f.name === 'Lentils' ? 3.3 : 0.8,
      vitaminC: f.name === 'Orange' ? 53 : f.name === 'Bell Peppers' ? 127 : f.name === 'Strawberries' ? 59 : 2,
    },
    defaultServing: {
      quantity: 1,
      unit: servings[1]?.unit || 'g',
      gramEquivalent: f.servingSize,
    },
    availableServings: servings,
    tags: f.tags,
  };
}

const LOCAL_FOODS: FoodItem[] = NUTRITION_FOODS.map(transformNutritionFood);

export class LocalFoodProvider implements FoodDataProvider {
  readonly id = 'local';
  readonly name = 'MyFitAI Database';
  readonly attribution = 'Curated Reference Data';

  async search(params: FoodSearchParams): Promise<FoodItem[]> {
    const q = params.query.trim().toLowerCase();
    if (!q) {
      if (params.category && params.category !== 'All') {
        return LOCAL_FOODS.filter(f => f.category === params.category).slice(0, params.limit || 20);
      }
      return LOCAL_FOODS.slice(0, params.limit || 20);
    }

    const matches = LOCAL_FOODS.filter(food => {
      const matchName = food.name.toLowerCase().includes(q);
      const matchCat = food.category?.toLowerCase().includes(q);
      const matchTags = food.tags?.some(t => t.toLowerCase().includes(q));
      return matchName || matchCat || matchTags;
    });

    if (params.category && params.category !== 'All') {
      return matches.filter(f => f.category === params.category).slice(0, params.limit || 20);
    }

    return matches.slice(0, params.limit || 20);
  }

  async getById(id: string): Promise<FoodItem | null> {
    const found = LOCAL_FOODS.find(f => f.id === id);
    return found || null;
  }
}

export const localFoodProvider = new LocalFoodProvider();
