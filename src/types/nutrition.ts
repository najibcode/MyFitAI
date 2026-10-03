// ─────────────────────────────────────────────────────────────
// MyFitAI — Nutrition & Food Tracking Domain Model
// Cleanroom, production-grade types for nutrition platform
// ─────────────────────────────────────────────────────────────

export type ServingUnit =
  | 'g'
  | 'kg'
  | 'ml'
  | 'l'
  | 'serving'
  | 'piece'
  | 'cup'
  | 'tbsp'
  | 'tsp'
  | 'slice'
  | 'bowl'
  | 'katori'
  | 'plate'
  | 'scoop'
  | 'custom';

export type FoodSource =
  | 'local'
  | 'indian_db'
  | 'open_food_facts'
  | 'usda'
  | 'custom'
  | 'ai_estimated';

export type MealType =
  | 'Breakfast'
  | 'Lunch'
  | 'Dinner'
  | 'Snacks'
  | string;

export interface FoodNutrients {
  calories: number;        // kcal
  protein: number;         // grams
  carbohydrates: number;   // grams
  fat: number;             // grams
  fiber?: number;          // grams
  sugar?: number;          // grams
  saturatedFat?: number;   // grams
  sodium?: number;         // mg
  calcium?: number;        // mg
  iron?: number;           // mg
  potassium?: number;      // mg
  vitaminD?: number;       // mcg
  vitaminB12?: number;     // mcg
  magnesium?: number;      // mg
  vitaminC?: number;       // mg
  zinc?: number;           // mg
}

export interface ServingOption {
  unit: ServingUnit;
  gramEquivalent: number;  // How many grams/ml this serving unit equals
  label: string;           // e.g. "1 medium (182g)", "1 cup (240ml)", "1 bowl (150g)"
}

export interface FoodItem {
  id: string;
  name: string;
  brand?: string;
  category?: string;
  emoji?: string;
  image?: string;
  barcode?: string;
  source: FoodSource;
  sourceAttribution?: string; // e.g. "Open Food Facts (ODbL)", "ICMR-NIN IFCT 2017", "USDA FoodData Central"
  nutrientsPer100g: FoodNutrients;
  defaultServing: {
    quantity: number;
    unit: ServingUnit;
    gramEquivalent: number;
  };
  availableServings: ServingOption[];
  tags?: string[];
  allergens?: string[];
  ingredientsText?: string;
  nutriscore?: 'a' | 'b' | 'c' | 'd' | 'e';
  regionalNames?: string[]; // e.g. ["Chawal", "Arisi", "Bhat"]
  isVerified?: boolean;
  isCustom?: boolean;
}

export interface MealEntry {
  id: string;
  date: string;            // ISO YYYY-MM-DD
  mealType: MealType;
  foodId: string;
  foodName: string;
  brand?: string;
  emoji?: string;
  image?: string;
  source: FoodSource;
  quantity: number;
  servingUnit: ServingUnit;
  gramEquivalent: number;  // total grams/ml for this entry
  nutrients: FoodNutrients;
  timestamp: string;       // ISO timestamp
  isQuickAdd?: boolean;
  isRecipe?: boolean;
  recipeId?: string;
  barcode?: string;
  notes?: string;
}

export interface RecipeIngredient {
  foodItem: FoodItem;
  quantity: number;
  unit: ServingUnit;
  calculatedNutrients: FoodNutrients;
}

export interface Recipe {
  id: string;
  name: string;
  description?: string;
  category?: string;
  servings: number;
  prepTimeMinutes?: number;
  cookTimeMinutes?: number;
  instructions?: string[];
  image?: string;
  ingredients: RecipeIngredient[];
  totalNutrients: FoodNutrients;
  perServingNutrients: FoodNutrients;
  tags?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface MealTemplateItem {
  foodItem: FoodItem;
  quantity: number;
  unit: ServingUnit;
}

export interface MealTemplate {
  id: string;
  name: string;
  mealType: MealType;
  items: MealTemplateItem[];
  createdAt: string;
}

export interface QuickAddEntry {
  id: string;
  name: string;
  mealType: MealType;
  calories: number;
  protein?: number;
  carbs?: number;
  fat?: number;
  fiber?: number;
  date: string;
  timestamp: string;
}

export interface NutritionTarget {
  dailyCalories: number;
  proteinGrams: number;
  carbsGrams: number;
  fatGrams: number;
  fiberGrams: number;
  waterLiters: number;
  sodiumMg: number;
  mealTargets: Record<string, number>; // calories per meal type
  includeExerciseInBudget: boolean;
}

export interface DailyNutritionSummary {
  date: string;
  caloriesConsumed: number;
  proteinConsumed: number;
  carbsConsumed: number;
  fatConsumed: number;
  fiberConsumed: number;
  sodiumConsumed: number;
  waterConsumed: number; // in Liters
  exerciseCaloriesBurned: number;
  calorieBudget: number;
  caloriesRemaining: number;
  macros: {
    proteinPercent: number;
    carbsPercent: number;
    fatPercent: number;
  };
}

export interface WaterLogEntry {
  id: string;
  date: string;     // YYYY-MM-DD
  amountMl: number; // in ml
  timestamp: string;
}

export interface NutritionWeightEntry {
  id: string;
  date: string;          // YYYY-MM-DD
  weightKg: number;      // Canonical unit in kg
  weightLbs: number;     // Display unit helper
  bodyFatPercent?: number;
  waistCm?: number;
  waistInches?: number;
  notes?: string;
  timestamp: string;
}

export type FastingProtocol =
  | '12:12'
  | '14:10'
  | '16:8'
  | '18:6'
  | '20:4'
  | 'OMAD'
  | 'custom';

export interface FastingSession {
  id: string;
  protocol: FastingProtocol;
  targetHours: number;
  startTime: string;     // ISO timestamp
  endTime?: string;       // ISO timestamp when finished
  pausedAt?: string;
  totalPausedMs?: number;
  status: 'active' | 'completed' | 'cancelled';
  notes?: string;
}

export interface MicronutrientReference {
  name: string;
  key: keyof FoodNutrients;
  target: number;
  unit: string;
  dailyValueLabel: string;
  description: string;
}
