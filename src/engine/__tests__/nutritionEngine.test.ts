// ─────────────────────────────────────────────────────────────
// MyFitAI — Nutrition Engine Comprehensive Unit Tests
// Tests for: Serving Conversions, Proportional Scaling,
// BMR (Mifflin-St Jeor & Katch-McArdle), TDEE, Target Calorie/Macro
// Distribution, Recipe Calculation, Data Validation, and IOM Standards.
// ─────────────────────────────────────────────────────────────

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_UNIT_GRAM_EQUIVALENTS,
  roundNutrient,
  getGramEquivalent,
  calculateNutrientsForGrams,
  calculateFoodNutrients,
  sumNutrients,
  calculateBMR,
  calculateTDEE,
  calculateNutritionTargets,
  calculateRecipeNutrients,
  validateFoodNutrition,
  IOM_MICRONUTRIENT_STANDARDS,
  ACTIVITY_MULTIPLIERS,
  formatMealEntriesToCSV,
  validateNutritionImportPayload as validateImportPayload,
} from '../nutritionCalculations';
import type { FoodItem, FoodNutrients } from '../../types/nutrition';

// Sample Mock Foods
const mockApple: FoodItem = {
  id: 'mock_apple',
  name: 'Apple',
  source: 'Local',
  nutrientsPer100g: {
    calories: 52,
    protein: 0.3,
    carbohydrates: 13.8,
    fat: 0.2,
    fiber: 2.4,
    sugar: 10.4,
    sodium: 1,
    vitaminC: 4.6,
  },
  defaultServing: {
    quantity: 1,
    unit: 'piece',
    gramEquivalent: 150,
  },
  availableServings: [
    { quantity: 1, unit: 'piece', gramEquivalent: 150 },
    { quantity: 1, unit: 'cup', gramEquivalent: 125 },
    { quantity: 1, unit: 'slice', gramEquivalent: 25 },
  ],
};

const mockChickenBreast: FoodItem = {
  id: 'mock_chicken',
  name: 'Cooked Chicken Breast',
  source: 'USDA',
  nutrientsPer100g: {
    calories: 165,
    protein: 31.0,
    carbohydrates: 0.0,
    fat: 3.6,
    sodium: 74,
    iron: 1.0,
    zinc: 1.0,
  },
  defaultServing: {
    quantity: 100,
    unit: 'g',
    gramEquivalent: 100,
  },
};

const mockRoti: FoodItem = {
  id: 'mock_roti',
  name: 'Whole Wheat Roti',
  source: 'Indian',
  nutrientsPer100g: {
    calories: 297,
    protein: 10.6,
    carbohydrates: 55.4,
    fat: 3.2,
    fiber: 10.7,
    sodium: 150,
  },
  defaultServing: {
    quantity: 1,
    unit: 'piece',
    gramEquivalent: 40,
  },
  availableServings: [
    { quantity: 1, unit: 'piece', gramEquivalent: 40 },
  ],
};

describe('Serving Units & Gram Equivalents', () => {
  test('correctly converts standard metric units directly', () => {
    assert.equal(getGramEquivalent(mockApple, 100, 'g'), 100);
    assert.equal(getGramEquivalent(mockApple, 250, 'ml'), 250);
    assert.equal(getGramEquivalent(mockApple, 1.5, 'kg'), 1500);
    assert.equal(getGramEquivalent(mockApple, 2, 'l'), 2000);
  });

  test('uses food-specific available servings when available', () => {
    // 1 piece of mock apple is 150g
    assert.equal(getGramEquivalent(mockApple, 1, 'piece'), 150);
    // 2 pieces of apple = 300g
    assert.equal(getGramEquivalent(mockApple, 2, 'piece'), 300);
    // 1 cup of apple = 125g
    assert.equal(getGramEquivalent(mockApple, 1, 'cup'), 125);
    // 4 slices = 100g
    assert.equal(getGramEquivalent(mockApple, 4, 'slice'), 100);
  });

  test('falls back to defaultServing if unit matches default', () => {
    // mockRoti piece is 40g
    assert.equal(getGramEquivalent(mockRoti, 3, 'piece'), 120);
  });

  test('falls back to generic DEFAULT_UNIT_GRAM_EQUIVALENTS for unknown specific unit', () => {
    // mockChickenBreast has no katori serving specified, generic katori is 150g
    const grams = getGramEquivalent(mockChickenBreast, 2, 'katori');
    assert.equal(grams, 2 * DEFAULT_UNIT_GRAM_EQUIVALENTS.katori);
    assert.equal(grams, 300);
  });

  test('returns 0 for negative or zero quantities', () => {
    assert.equal(getGramEquivalent(mockApple, 0, 'piece'), 0);
    assert.equal(getGramEquivalent(mockApple, -5, 'g'), 0);
  });
});

describe('Nutrient Scaling & Aggregation Engine', () => {
  test('returns all zero nutrients when grams is 0 or negative', () => {
    const res = calculateNutrientsForGrams(mockChickenBreast.nutrientsPer100g, 0);
    assert.equal(res.calories, 0);
    assert.equal(res.protein, 0);
    assert.equal(res.fat, 0);
  });

  test('accurately scales 100g nutrients to 200g (2x)', () => {
    const res = calculateNutrientsForGrams(mockChickenBreast.nutrientsPer100g, 200);
    assert.equal(res.calories, 330);
    assert.equal(res.protein, 62.0);
    assert.equal(res.carbohydrates, 0.0);
    assert.equal(res.fat, 7.2);
    assert.equal(res.sodium, 148);
  });

  test('accurately calculates nutrients for custom food serving', () => {
    // 1 apple piece = 150g (1.5x)
    const { nutrients, totalGrams } = calculateFoodNutrients(mockApple, 1, 'piece');
    assert.equal(totalGrams, 150);
    assert.equal(nutrients.calories, Math.round(52 * 1.5)); // 78
    assert.equal(nutrients.fiber, roundNutrient(2.4 * 1.5)); // 3.6
    assert.equal(nutrients.sugar, roundNutrient(10.4 * 1.5)); // 15.6
  });

  test('sumNutrients aggregates multiple nutrient profiles correctly', () => {
    const n1: FoodNutrients = { calories: 200, protein: 25, carbohydrates: 10, fat: 5, fiber: 2, sodium: 300 };
    const n2: FoodNutrients = { calories: 150, protein: 5, carbohydrates: 30, fat: 1, fiber: 4, sodium: 100 };
    const n3: FoodNutrients = { calories: 80, protein: 1, carbohydrates: 18, fat: 0, fiber: 1, sodium: 10 };

    const total = sumNutrients([n1, n2, n3]);
    assert.equal(total.calories, 430);
    assert.equal(total.protein, 31);
    assert.equal(total.carbohydrates, 58);
    assert.equal(total.fat, 6);
    assert.equal(total.fiber, 7);
    assert.equal(total.sodium, 410);
  });
});

describe('Basal Metabolic Rate (BMR) Engine', () => {
  test('calculates accurate Mifflin-St Jeor BMR for a male', () => {
    // Male, 80kg, 180cm, 30yo
    // Formula: 10 * 80 + 6.25 * 180 - 5 * 30 + 5
    // = 800 + 1125 - 150 + 5 = 1780
    const bmr = calculateBMR({
      weightKg: 80,
      heightCm: 180,
      age: 30,
      gender: 'male',
    });
    assert.equal(bmr, 1780);
  });

  test('calculates accurate Mifflin-St Jeor BMR for a female', () => {
    // Female, 60kg, 165cm, 28yo
    // Formula: 10 * 60 + 6.25 * 165 - 5 * 28 - 161
    // = 600 + 1031.25 - 140 - 161 = 1330.25 -> 1330
    const bmr = calculateBMR({
      weightKg: 60,
      heightCm: 165,
      age: 28,
      gender: 'female',
    });
    assert.equal(bmr, 1330);
  });

  test('calculates Katch-McArdle BMR when body fat % is provided', () => {
    // Weight: 80kg, Body Fat: 15%
    // LBM = 80 * (1 - 0.15) = 68 kg
    // Katch-McArdle = 370 + 21.6 * 68 = 370 + 1468.8 = 1838.8 -> 1839
    const bmr = calculateBMR({
      weightKg: 80,
      heightCm: 180,
      age: 30,
      gender: 'male',
      bodyFatPercent: 15,
    });
    assert.equal(bmr, 1839);
  });
});

describe('Total Daily Energy Expenditure (TDEE) & Goal Targets', () => {
  test('calculates TDEE using correct activity multipliers', () => {
    const bmr = 1800;
    assert.equal(calculateTDEE(bmr, 'sedentary'), Math.round(1800 * ACTIVITY_MULTIPLIERS.sedentary)); // 2160
    assert.equal(calculateTDEE(bmr, 'moderate'), Math.round(1800 * ACTIVITY_MULTIPLIERS.moderate)); // 2790
    assert.equal(calculateTDEE(bmr, 'very_active'), Math.round(1800 * ACTIVITY_MULTIPLIERS.very_active)); // 3105
  });

  test('Fat Loss goal creates ~500 kcal deficit with safe floor of 1200 kcal', () => {
    const res = calculateNutritionTargets({
      weightKg: 75,
      heightCm: 175,
      age: 25,
      gender: 'male',
      activityLevel: 'moderate',
      goal: 'Fat Loss',
    });

    const expectedTDEE = res.tdee;
    assert.equal(res.target.dailyCalories, expectedTDEE - 500);
    assert.ok(res.target.dailyCalories >= 1200);
    assert.ok(res.reasoning.includes('Target deficit of ~500 kcal'));
  });

  test('Muscle Gain goal creates lean +250 kcal surplus', () => {
    const res = calculateNutritionTargets({
      weightKg: 70,
      heightCm: 175,
      age: 24,
      gender: 'male',
      activityLevel: 'moderate',
      goal: 'Muscle Gain',
    });

    assert.equal(res.target.dailyCalories, res.tdee + 250);
    assert.ok(res.reasoning.includes('Lean surplus of +250 kcal'));
  });

  test('Maintenance goal preserves TDEE exactly', () => {
    const res = calculateNutritionTargets({
      weightKg: 70,
      heightCm: 175,
      age: 24,
      gender: 'male',
      activityLevel: 'light',
      goal: 'Maintenance',
    });

    assert.equal(res.target.dailyCalories, res.tdee);
    assert.ok(res.reasoning.includes('physique maintenance'));
  });

  test('Custom calorie override takes precedence over formula', () => {
    const res = calculateNutritionTargets({
      weightKg: 70,
      heightCm: 175,
      age: 24,
      gender: 'male',
      activityLevel: 'moderate',
      goal: 'Fat Loss',
      customCalorieOverride: 2150,
    });

    assert.equal(res.target.dailyCalories, 2150);
    assert.ok(res.reasoning.includes('Custom user calorie target override'));
  });

  test('calculates evidence-based macro distribution', () => {
    const weightKg = 80;
    const res = calculateNutritionTargets({
      weightKg,
      heightCm: 180,
      age: 30,
      gender: 'male',
      activityLevel: 'moderate',
      goal: 'Fat Loss',
    });

    // Fat Loss protein: 2.2g per kg
    assert.equal(res.target.proteinGrams, Math.round(weightKg * 2.2));
    // Fat: 25% of total calories (dailyCalories * 0.25 / 9)
    const expectedFatGrams = Math.round((res.target.dailyCalories * 0.25) / 9);
    assert.equal(res.target.fatGrams, expectedFatGrams);

    // Remaining calories allocated to carbs
    const proteinCals = res.target.proteinGrams * 4;
    const fatCals = res.target.fatGrams * 9;
    const expectedCarbs = Math.round((res.target.dailyCalories - (proteinCals + fatCals)) / 4);
    assert.equal(res.target.carbsGrams, expectedCarbs);

    // Recommended water is at least 2.5L and ~35ml/kg
    assert.ok(res.target.waterLiters >= 2.5);
    // Recommended fiber is at least 25g
    assert.ok(res.target.fiberGrams >= 25);
  });
});

describe('Recipe Nutrition Engine', () => {
  test('sums recipe ingredients and correctly computes per-serving nutrition', () => {
    const ing1 = {
      calculatedNutrients: { calories: 300, protein: 30, carbohydrates: 10, fat: 5, fiber: 2, sodium: 200 },
    };
    const ing2 = {
      calculatedNutrients: { calories: 500, protein: 10, carbohydrates: 80, fat: 15, fiber: 6, sodium: 400 },
    };

    const { totalNutrients, perServingNutrients } = calculateRecipeNutrients([ing1, ing2], 2);

    // Totals
    assert.equal(totalNutrients.calories, 800);
    assert.equal(totalNutrients.protein, 40);
    assert.equal(totalNutrients.carbohydrates, 90);
    assert.equal(totalNutrients.fat, 20);
    assert.equal(totalNutrients.fiber, 8);
    assert.equal(totalNutrients.sodium, 600);

    // Per serving (divided by 2)
    assert.equal(perServingNutrients.calories, 400);
    assert.equal(perServingNutrients.protein, 20);
    assert.equal(perServingNutrients.carbohydrates, 45);
    assert.equal(perServingNutrients.fat, 10);
    assert.equal(perServingNutrients.fiber, 4);
    assert.equal(perServingNutrients.sodium, 300);
  });

  test('safely handles 1 serving or zero servings safely', () => {
    const ing = {
      calculatedNutrients: { calories: 250, protein: 20, carbohydrates: 15, fat: 5 },
    };
    const res = calculateRecipeNutrients([ing], 0);
    assert.equal(res.perServingNutrients.calories, 250);
    assert.equal(res.perServingNutrients.protein, 20);
  });
});

describe('Food Data Validation Engine', () => {
  test('passes validation for valid food nutrition', () => {
    const val = validateFoodNutrition({
      calories: 250,
      protein: 20,
      carbs: 25,
      fat: 8,
      quantity: 1,
    });
    assert.equal(val.isValid, true);
    assert.equal(val.issues.length, 0);
  });

  test('fails validation when quantity is zero or negative', () => {
    const val = validateFoodNutrition({
      calories: 100,
      protein: 10,
      carbs: 10,
      fat: 2,
      quantity: -1,
    });
    assert.equal(val.isValid, false);
    assert.ok(val.issues.some(i => i.field === 'quantity'));
  });

  test('fails validation when any nutrient is negative', () => {
    const val = validateFoodNutrition({
      calories: 100,
      protein: -5,
      carbs: 10,
      fat: 2,
    });
    assert.equal(val.isValid, false);
    assert.ok(val.issues.some(i => i.field === 'nutrients'));
  });

  test('flags warning when reported calories deviate heavily from 4P + 4C + 9F', () => {
    // 100g reported calories, but macros are 50g protein + 50g carbs = 400 kcal (300 kcal diff)
    const val = validateFoodNutrition({
      calories: 100,
      protein: 50,
      carbs: 50,
      fat: 0,
    });
    assert.equal(val.isValid, true); // It's a warning, not fatal error
    assert.ok(val.issues.some(i => i.field === 'calories' && i.severity === 'warning'));
  });
});

describe('Micronutrient Reference Standards (IOM DRI)', () => {
  test('contains all 12 core micronutrients with non-zero targets', () => {
    assert.equal(IOM_MICRONUTRIENT_STANDARDS.length, 12);
    for (const micro of IOM_MICRONUTRIENT_STANDARDS) {
      assert.ok(micro.name.length > 0);
      assert.ok(micro.target > 0);
      assert.ok(micro.unit.length > 0);
      assert.ok(micro.dailyValueLabel.length > 0);
      assert.ok(micro.description.length > 0);
    }
  });

  test('verifies standard adult daily reference targets', () => {
    const fiber = IOM_MICRONUTRIENT_STANDARDS.find(m => m.key === 'fiber');
    const sodium = IOM_MICRONUTRIENT_STANDARDS.find(m => m.key === 'sodium');
    const calcium = IOM_MICRONUTRIENT_STANDARDS.find(m => m.key === 'calcium');
    const iron = IOM_MICRONUTRIENT_STANDARDS.find(m => m.key === 'iron');

    assert.equal(fiber?.target, 30);
    assert.equal(sodium?.target, 2300);
    assert.equal(calcium?.target, 1000);
    assert.equal(iron?.target, 14);
  });
});

describe('Data Export & Import Validation Engine', () => {
  test('formats meal entries to standard RFC-compliant CSV with quotes and escapes', () => {
    const entries: any[] = [
      {
        id: 'entry_1',
        date: '2026-10-04',
        mealType: 'Breakfast',
        foodName: 'Greek "Organic" Yogurt',
        brand: 'Chobani',
        quantity: 1,
        servingUnit: 'cup',
        gramEquivalent: 240,
        nutrients: {
          calories: 140,
          protein: 16.0,
          carbohydrates: 6.0,
          fat: 4.0,
          fiber: 0,
          sodium: 65,
        },
        source: 'USDA',
      },
    ];

    const csv = formatMealEntriesToCSV(entries);
    const lines = csv.split('\n');
    assert.equal(lines.length, 2);
    assert.ok(lines[0].includes('Calories (kcal)'));
    assert.ok(lines[1].includes('2026-10-04'));
    assert.ok(lines[1].includes('"Greek ""Organic"" Yogurt"'));
    assert.ok(lines[1].includes('"Chobani"'));
    assert.ok(lines[1].includes('"USDA"'));
  });

  test('validates valid import backup payload format', () => {
    const validPayload = {
      version: 3,
      source: 'MyFitAI',
      exportedAt: '2026-10-04T12:00:00.000Z',
      data: {
        mealEntries: [],
        customFoods: [],
        recipes: [],
      },
    };

    const res = validateImportPayload(validPayload);
    assert.equal(res.isValid, true);
    assert.equal(res.errors.length, 0);
  });

  test('rejects corrupt, empty, or invalid import payloads', () => {
    assert.equal(validateImportPayload(null).isValid, false);
    assert.equal(validateImportPayload('string').isValid, false);
    assert.equal(validateImportPayload({ randomField: true }).isValid, false);
  });
});

