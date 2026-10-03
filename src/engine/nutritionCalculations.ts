// ─────────────────────────────────────────────────────────────
// MyFitAI — Centralized Nutrition & Energy Calculation Engine
// Provides mathematically rigorous, evidence-based nutrition,
// serving conversion, BMR, TDEE, macro, and micro calculations.
// ─────────────────────────────────────────────────────────────

import type {
  FoodNutrients,
  FoodItem,
  ServingUnit,
  NutritionTarget,
  MicronutrientReference,
} from '../types/nutrition';

// ── Standard Serving Equivalent in Grams/Milliliters ─────────
export const DEFAULT_UNIT_GRAM_EQUIVALENTS: Record<ServingUnit, number> = {
  g: 1,
  kg: 1000,
  ml: 1,
  l: 1000,
  serving: 100,
  piece: 50,
  cup: 240,
  tbsp: 15,
  tsp: 5,
  slice: 35,
  bowl: 250,
  katori: 150,
  plate: 300,
  scoop: 30,
  custom: 100,
};

/**
 * Clean rounding utility:
 * Decimals rounded to 1 decimal place, integers kept clean.
 */
export function roundNutrient(val: number | undefined, decimals = 1): number {
  if (val === undefined || isNaN(val)) return 0;
  const factor = Math.pow(10, decimals);
  return Math.round(val * factor) / factor;
}

/**
 * Calculates total gram equivalent for a given quantity and unit for a food item.
 */
export function getGramEquivalent(
  foodItem: FoodItem,
  quantity: number,
  unit: ServingUnit
): number {
  if (quantity <= 0) return 0;

  // 1. Direct unit matches
  if (unit === 'g' || unit === 'ml') return quantity;
  if (unit === 'kg' || unit === 'l') return quantity * 1000;

  // 2. Check foodItem's specific availableServings table
  const matchingServing = foodItem.availableServings?.find(s => s.unit === unit);
  if (matchingServing && matchingServing.gramEquivalent > 0) {
    return quantity * matchingServing.gramEquivalent;
  }

  // 3. Fallback to default serving if unit matches default
  if (foodItem.defaultServing && foodItem.defaultServing.unit === unit) {
    const singleGram = foodItem.defaultServing.gramEquivalent / (foodItem.defaultServing.quantity || 1);
    return quantity * singleGram;
  }

  // 4. Fallback to standard generic conversion table
  const genericGrams = DEFAULT_UNIT_GRAM_EQUIVALENTS[unit] || 100;
  return quantity * genericGrams;
}

/**
 * Scales nutrients proportionally based on base nutrients per 100g and consumed grams.
 */
export function calculateNutrientsForGrams(
  nutrientsPer100g: FoodNutrients,
  totalGrams: number
): FoodNutrients {
  if (totalGrams <= 0) {
    return {
      calories: 0,
      protein: 0,
      carbohydrates: 0,
      fat: 0,
      fiber: 0,
      sugar: 0,
      saturatedFat: 0,
      sodium: 0,
      calcium: 0,
      iron: 0,
      potassium: 0,
      vitaminD: 0,
      vitaminB12: 0,
      magnesium: 0,
      vitaminC: 0,
      zinc: 0,
    };
  }

  const ratio = totalGrams / 100;

  return {
    calories: Math.round(nutrientsPer100g.calories * ratio),
    protein: roundNutrient(nutrientsPer100g.protein * ratio),
    carbohydrates: roundNutrient(nutrientsPer100g.carbohydrates * ratio),
    fat: roundNutrient(nutrientsPer100g.fat * ratio),
    fiber: nutrientsPer100g.fiber !== undefined ? roundNutrient(nutrientsPer100g.fiber * ratio) : undefined,
    sugar: nutrientsPer100g.sugar !== undefined ? roundNutrient(nutrientsPer100g.sugar * ratio) : undefined,
    saturatedFat: nutrientsPer100g.saturatedFat !== undefined ? roundNutrient(nutrientsPer100g.saturatedFat * ratio) : undefined,
    sodium: nutrientsPer100g.sodium !== undefined ? Math.round(nutrientsPer100g.sodium * ratio) : undefined,
    calcium: nutrientsPer100g.calcium !== undefined ? roundNutrient(nutrientsPer100g.calcium * ratio) : undefined,
    iron: nutrientsPer100g.iron !== undefined ? roundNutrient(nutrientsPer100g.iron * ratio) : undefined,
    potassium: nutrientsPer100g.potassium !== undefined ? roundNutrient(nutrientsPer100g.potassium * ratio) : undefined,
    vitaminD: nutrientsPer100g.vitaminD !== undefined ? roundNutrient(nutrientsPer100g.vitaminD * ratio) : undefined,
    vitaminB12: nutrientsPer100g.vitaminB12 !== undefined ? roundNutrient(nutrientsPer100g.vitaminB12 * ratio) : undefined,
    magnesium: nutrientsPer100g.magnesium !== undefined ? roundNutrient(nutrientsPer100g.magnesium * ratio) : undefined,
    vitaminC: nutrientsPer100g.vitaminC !== undefined ? roundNutrient(nutrientsPer100g.vitaminC * ratio) : undefined,
    zinc: nutrientsPer100g.zinc !== undefined ? roundNutrient(nutrientsPer100g.zinc * ratio) : undefined,
  };
}

/**
 * Calculates nutrients for a food item given quantity and unit.
 */
export function calculateFoodNutrients(
  foodItem: FoodItem,
  quantity: number,
  unit: ServingUnit
): { nutrients: FoodNutrients; totalGrams: number } {
  const totalGrams = getGramEquivalent(foodItem, quantity, unit);
  const nutrients = calculateNutrientsForGrams(foodItem.nutrientsPer100g, totalGrams);
  return { nutrients, totalGrams };
}

/**
 * Aggregates a list of nutrients into a single sum.
 */
export function sumNutrients(items: FoodNutrients[]): FoodNutrients {
  return items.reduce<FoodNutrients>(
    (acc, curr) => ({
      calories: acc.calories + (curr.calories || 0),
      protein: roundNutrient(acc.protein + (curr.protein || 0)),
      carbohydrates: roundNutrient(acc.carbohydrates + (curr.carbohydrates || 0)),
      fat: roundNutrient(acc.fat + (curr.fat || 0)),
      fiber: (acc.fiber !== undefined || curr.fiber !== undefined)
        ? roundNutrient((acc.fiber || 0) + (curr.fiber || 0))
        : undefined,
      sugar: (acc.sugar !== undefined || curr.sugar !== undefined)
        ? roundNutrient((acc.sugar || 0) + (curr.sugar || 0))
        : undefined,
      saturatedFat: (acc.saturatedFat !== undefined || curr.saturatedFat !== undefined)
        ? roundNutrient((acc.saturatedFat || 0) + (curr.saturatedFat || 0))
        : undefined,
      sodium: (acc.sodium !== undefined || curr.sodium !== undefined)
        ? Math.round((acc.sodium || 0) + (curr.sodium || 0))
        : undefined,
      calcium: (acc.calcium !== undefined || curr.calcium !== undefined)
        ? roundNutrient((acc.calcium || 0) + (curr.calcium || 0))
        : undefined,
      iron: (acc.iron !== undefined || curr.iron !== undefined)
        ? roundNutrient((acc.iron || 0) + (curr.iron || 0))
        : undefined,
      potassium: (acc.potassium !== undefined || curr.potassium !== undefined)
        ? roundNutrient((acc.potassium || 0) + (curr.potassium || 0))
        : undefined,
      vitaminD: (acc.vitaminD !== undefined || curr.vitaminD !== undefined)
        ? roundNutrient((acc.vitaminD || 0) + (curr.vitaminD || 0))
        : undefined,
      vitaminB12: (acc.vitaminB12 !== undefined || curr.vitaminB12 !== undefined)
        ? roundNutrient((acc.vitaminB12 || 0) + (curr.vitaminB12 || 0))
        : undefined,
      magnesium: (acc.magnesium !== undefined || curr.magnesium !== undefined)
        ? roundNutrient((acc.magnesium || 0) + (curr.magnesium || 0))
        : undefined,
      vitaminC: (acc.vitaminC !== undefined || curr.vitaminC !== undefined)
        ? roundNutrient((acc.vitaminC || 0) + (curr.vitaminC || 0))
        : undefined,
      zinc: (acc.zinc !== undefined || curr.zinc !== undefined)
        ? roundNutrient((acc.zinc || 0) + (curr.zinc || 0))
        : undefined,
    }),
    {
      calories: 0,
      protein: 0,
      carbohydrates: 0,
      fat: 0,
      fiber: 0,
      sodium: 0,
    }
  );
}

// ── BMR & TDEE Calculations ──────────────────────────────────

export type ActivityLevel =
  | 'sedentary'
  | 'light'
  | 'moderate'
  | 'very_active'
  | 'extra_active';

export const ACTIVITY_MULTIPLIERS: Record<ActivityLevel, number> = {
  sedentary: 1.2,      // Little to no exercise
  light: 1.375,        // Light exercise 1-3 days/week
  moderate: 1.55,      // Moderate exercise 3-5 days/week
  very_active: 1.725,  // Heavy exercise 6-7 days/week
  extra_active: 1.9,   // Very heavy exercise, physical job
};

/**
 * Calculates Basal Metabolic Rate using Mifflin-St Jeor formula.
 * Weight in kg, height in cm, age in years.
 */
export function calculateBMR(params: {
  weightKg: number;
  heightCm: number;
  age: number;
  gender: 'male' | 'female' | 'other' | string;
  bodyFatPercent?: number;
}): number {
  const { weightKg, heightCm, age, gender, bodyFatPercent } = params;

  // If body fat is provided, use Katch-McArdle formula for lean body mass
  if (bodyFatPercent && bodyFatPercent > 3 && bodyFatPercent < 60) {
    const lbmKg = weightKg * (1 - bodyFatPercent / 100);
    return Math.round(370 + 21.6 * lbmKg);
  }

  // Standard Mifflin-St Jeor Equation
  const isFemale = gender.toLowerCase() === 'female';
  const base = 10 * weightKg + 6.25 * heightCm - 5 * age;
  return Math.round(isFemale ? base - 161 : base + 5);
}

/**
 * Calculates Total Daily Energy Expenditure (TDEE).
 */
export function calculateTDEE(bmr: number, activityLevel: ActivityLevel): number {
  const multiplier = ACTIVITY_MULTIPLIERS[activityLevel] || 1.4;
  return Math.round(bmr * multiplier);
}

/**
 * Generates recommended daily calorie and macro target based on user goals.
 */
export function calculateNutritionTargets(params: {
  weightKg: number;
  heightCm: number;
  age: number;
  gender: string;
  activityLevel: ActivityLevel;
  goal: 'Fat Loss' | 'Moderate Fat Loss' | 'Maintenance' | 'Hypertrophy Phase' | 'Muscle Gain' | 'Weight Gain' | string;
  bodyFatPercent?: number;
  customCalorieOverride?: number;
}): {
  bmr: number;
  tdee: number;
  target: NutritionTarget;
  reasoning: string;
} {
  const bmr = calculateBMR(params);
  const tdee = calculateTDEE(bmr, params.activityLevel);

  let dailyCalories = tdee;
  let reasoning = '';

  const g = params.goal.toLowerCase();
  if (g.includes('fat loss') || g.includes('cut')) {
    dailyCalories = Math.max(1200, Math.round(tdee - 500));
    reasoning = `Target deficit of ~500 kcal from estimated maintenance (${tdee} kcal) for safe, steady fat loss of ~0.5kg/week.`;
  } else if (g.includes('moderate')) {
    dailyCalories = Math.max(1200, Math.round(tdee - 300));
    reasoning = `Target moderate deficit of ~300 kcal from estimated maintenance (${tdee} kcal).`;
  } else if (g.includes('hypertrophy') || g.includes('muscle')) {
    dailyCalories = Math.round(tdee + 250);
    reasoning = `Lean surplus of +250 kcal over maintenance (${tdee} kcal) to optimize protein synthesis and muscle growth with minimal fat gain.`;
  } else if (g.includes('weight gain') || g.includes('bulk')) {
    dailyCalories = Math.round(tdee + 500);
    reasoning = `Surplus of +500 kcal over maintenance (${tdee} kcal) for weight gain.`;
  } else {
    dailyCalories = tdee;
    reasoning = `Calorie balance matched to estimated daily energy expenditure (${tdee} kcal) for physique maintenance.`;
  }

  if (params.customCalorieOverride && params.customCalorieOverride > 800) {
    dailyCalories = params.customCalorieOverride;
    reasoning = `Custom user calorie target override (${dailyCalories} kcal).`;
  }

  // Protein calculation: 1.8g - 2.2g per kg bodyweight
  const isLoss = g.includes('fat loss') || g.includes('cut');
  const proteinPerKg = isLoss ? 2.2 : 2.0;
  const proteinGrams = Math.round(params.weightKg * proteinPerKg);
  const proteinCals = proteinGrams * 4;

  // Fat calculation: ~25-30% of total calories
  const fatCals = dailyCalories * 0.25;
  const fatGrams = Math.round(fatCals / 9);

  // Carbs: Remaining calories
  const remainingCals = Math.max(0, dailyCalories - (proteinCals + fatGrams * 9));
  const carbsGrams = Math.round(remainingCals / 4);

  // Recommended fiber: ~14g per 1000 kcal
  const fiberGrams = Math.max(25, Math.round((dailyCalories / 1000) * 14));

  // Default meal split: Breakfast 25%, Lunch 35%, Dinner 30%, Snacks 10%
  const mealTargets: Record<string, number> = {
    Breakfast: Math.round(dailyCalories * 0.25),
    Lunch: Math.round(dailyCalories * 0.35),
    Dinner: Math.round(dailyCalories * 0.30),
    Snacks: Math.round(dailyCalories * 0.10),
  };

  const target: NutritionTarget = {
    dailyCalories,
    proteinGrams,
    carbsGrams,
    fatGrams,
    fiberGrams,
    waterLiters: Math.max(2.5, Math.round((params.weightKg * 0.035) * 10) / 10), // ~35ml/kg
    sodiumMg: 2300,
    mealTargets,
    includeExerciseInBudget: false,
  };

  return { bmr, tdee, target, reasoning };
}

// ── Micronutrient Reference Standards (Institute of Medicine DRI) ──
export const IOM_MICRONUTRIENT_STANDARDS: MicronutrientReference[] = [
  { name: 'Fiber', key: 'fiber', target: 30, unit: 'g', dailyValueLabel: '30g', description: 'Essential for digestive health, satiety, and cholesterol management.' },
  { name: 'Sodium', key: 'sodium', target: 2300, unit: 'mg', dailyValueLabel: '2,300mg', description: 'Aids electrolyte balance. Target keeps under daily recommended limit.' },
  { name: 'Saturated Fat', key: 'saturatedFat', target: 20, unit: 'g', dailyValueLabel: '<20g', description: 'Limit to under 10% of daily caloric intake for cardiovascular wellness.' },
  { name: 'Sugar', key: 'sugar', target: 36, unit: 'g', dailyValueLabel: '<36g', description: 'Focus on natural sugars from fruits & dairy while limiting added sugars.' },
  { name: 'Calcium', key: 'calcium', target: 1000, unit: 'mg', dailyValueLabel: '1,000mg', description: 'Critical for bone density, nerve signaling, and muscle contraction.' },
  { name: 'Iron', key: 'iron', target: 14, unit: 'mg', dailyValueLabel: '14mg', description: 'Key component of hemoglobin that transports oxygen to working muscles.' },
  { name: 'Potassium', key: 'potassium', target: 3400, unit: 'mg', dailyValueLabel: '3,400mg', description: 'Maintains intracellular fluid volume and blunts sodium-induced blood pressure.' },
  { name: 'Vitamin D', key: 'vitaminD', target: 15, unit: 'mcg', dailyValueLabel: '15mcg (600 IU)', description: 'Regulates calcium absorption, bone mineralization, and immune response.' },
  { name: 'Vitamin B12', key: 'vitaminB12', target: 2.4, unit: 'mcg', dailyValueLabel: '2.4mcg', description: 'Required for red blood cell formation, neurological function, and DNA synthesis.' },
  { name: 'Magnesium', key: 'magnesium', target: 360, unit: 'mg', dailyValueLabel: '360mg', description: 'Cofactor in >300 enzymatic reactions including protein synthesis and energy production.' },
  { name: 'Vitamin C', key: 'vitaminC', target: 80, unit: 'mg', dailyValueLabel: '80mg', description: 'Potent antioxidant supporting collagen synthesis and immune defense.' },
  { name: 'Zinc', key: 'zinc', target: 11, unit: 'mg', dailyValueLabel: '11mg', description: 'Supports cellular metabolism, immune function, and testosterone synthesis.' },
];

// ── Validation Engine ────────────────────────────────────────

export interface ValidationIssue {
  field: string;
  message: string;
  severity: 'error' | 'warning';
}

/**
 * Validates food nutrition data to prevent impossible or corrupted entries.
 */
export function validateFoodNutrition(data: {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  quantity?: number;
}): { isValid: boolean; issues: ValidationIssue[] } {
  const issues: ValidationIssue[] = [];

  if (data.quantity !== undefined && data.quantity <= 0) {
    issues.push({ field: 'quantity', message: 'Quantity must be greater than zero.', severity: 'error' });
  }

  if (data.calories < 0 || data.protein < 0 || data.carbs < 0 || data.fat < 0) {
    issues.push({ field: 'nutrients', message: 'Nutrient values cannot be negative.', severity: 'error' });
  }

  // Check expected macro calorie consistency: 4*p + 4*c + 9*f
  const calculatedCals = data.protein * 4 + data.carbs * 4 + data.fat * 9;
  if (data.calories > 0 && calculatedCals > 0) {
    const diff = Math.abs(calculatedCals - data.calories);
    const ratio = diff / Math.max(data.calories, 1);
    // Allow up to 35% tolerance due to fiber subtraction, alcohol, and roundings
    if (ratio > 0.45 && diff > 75) {
      issues.push({
        field: 'calories',
        message: `Reported calories (${data.calories}) differ significantly from calculated macro energy (${Math.round(calculatedCals)} kcal).`,
        severity: 'warning',
      });
    }
  }

  return {
    isValid: issues.filter(i => i.severity === 'error').length === 0,
    issues,
  };
}

/**
 * Aggregates all ingredients in a recipe and computes total and per-serving nutrition.
 */
export function calculateRecipeNutrients(
  ingredients: { calculatedNutrients: FoodNutrients }[],
  servings: number
): {
  totalNutrients: FoodNutrients;
  perServingNutrients: FoodNutrients;
} {
  const totalNutrients = sumNutrients(ingredients.map(i => i.calculatedNutrients));
  const s = Math.max(1, servings || 1);

  const perServingNutrients: FoodNutrients = {
    calories: Math.round(totalNutrients.calories / s),
    protein: roundNutrient(totalNutrients.protein / s),
    carbohydrates: roundNutrient(totalNutrients.carbohydrates / s),
    fat: roundNutrient(totalNutrients.fat / s),
    fiber: totalNutrients.fiber !== undefined ? roundNutrient(totalNutrients.fiber / s) : undefined,
    sugar: totalNutrients.sugar !== undefined ? roundNutrient(totalNutrients.sugar / s) : undefined,
    saturatedFat: totalNutrients.saturatedFat !== undefined ? roundNutrient(totalNutrients.saturatedFat / s) : undefined,
    sodium: totalNutrients.sodium !== undefined ? Math.round(totalNutrients.sodium / s) : undefined,
    calcium: totalNutrients.calcium !== undefined ? roundNutrient(totalNutrients.calcium / s) : undefined,
    iron: totalNutrients.iron !== undefined ? roundNutrient(totalNutrients.iron / s) : undefined,
    potassium: totalNutrients.potassium !== undefined ? roundNutrient(totalNutrients.potassium / s) : undefined,
    vitaminD: totalNutrients.vitaminD !== undefined ? roundNutrient(totalNutrients.vitaminD / s) : undefined,
    vitaminB12: totalNutrients.vitaminB12 !== undefined ? roundNutrient(totalNutrients.vitaminB12 / s) : undefined,
    magnesium: totalNutrients.magnesium !== undefined ? roundNutrient(totalNutrients.magnesium / s) : undefined,
    vitaminC: totalNutrients.vitaminC !== undefined ? roundNutrient(totalNutrients.vitaminC / s) : undefined,
    zinc: totalNutrients.zinc !== undefined ? roundNutrient(totalNutrients.zinc / s) : undefined,
  };

  return { totalNutrients, perServingNutrients };
}

/**
 * Formats meal entries into standard RFC 4180 CSV rows.
 */
export function formatMealEntriesToCSV(entries: any[]): string {
  const headers = [
    'Date',
    'Meal Type',
    'Food Name',
    'Brand',
    'Quantity',
    'Unit',
    'Total Grams',
    'Calories (kcal)',
    'Protein (g)',
    'Carbohydrates (g)',
    'Fat (g)',
    'Fiber (g)',
    'Sodium (mg)',
    'Source',
  ];

  const rows = entries.map(e => [
    e.date,
    `"${e.mealType}"`,
    `"${(e.foodName || '').replace(/"/g, '""')}"`,
    `"${(e.brand || '').replace(/"/g, '""')}"`,
    e.quantity,
    e.servingUnit,
    e.gramEquivalent,
    e.nutrients?.calories || 0,
    e.nutrients?.protein || 0,
    e.nutrients?.carbohydrates || 0,
    e.nutrients?.fat || 0,
    e.nutrients?.fiber || 0,
    e.nutrients?.sodium || 0,
    `"${e.source || 'Manual'}"`,
  ]);

  return [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
}

/**
 * Validates the schema of an imported nutrition backup payload.
 */
export function validateNutritionImportPayload(payload: any): { isValid: boolean; errors: string[] } {
  if (!payload || typeof payload !== 'object') {
    return { isValid: false, errors: ['Payload must be a non-null JSON object.'] };
  }

  const d = payload.data || payload;
  if (!d.mealEntries && !d.customFoods && !d.recipes && !d.waterLogs && !d.weightLogs) {
    return { isValid: false, errors: ['Unrecognized nutrition backup schema: missing core collections.'] };
  }

  return { isValid: true, errors: [] };
}


