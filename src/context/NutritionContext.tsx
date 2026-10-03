// ─────────────────────────────────────────────────────────────
// MyFitAI — NutritionContext & Provider
// Centralized state manager for food diary, custom foods, recipes,
// templates, water tracking, weight tracking, fasting, and Firestore sync.
// ─────────────────────────────────────────────────────────────

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import type {
  MealEntry,
  FoodItem,
  Recipe,
  MealTemplate,
  MealType,
  ServingUnit,
  WaterLogEntry,
  NutritionWeightEntry,
  FastingSession,
  FastingProtocol,
  NutritionTarget,
  DailyNutritionSummary,
  FoodNutrients,
} from '../types/nutrition';
import { db } from '../utils/db';
import { storage } from '../utils/storage';
import { useAuth } from './AuthContext';
import { useFitnessContext } from './FitnessContext';
import {
  calculateFoodNutrients,
  sumNutrients,
  calculateNutritionTargets,
} from '../engine/nutritionCalculations';
import { customFoodProvider } from '../services/nutrition/providers/CustomFoodProvider';

interface NutritionContextType {
  selectedDate: string; // YYYY-MM-DD
  setSelectedDate: (date: string) => void;
  goToPreviousDay: () => void;
  goToNextDay: () => void;
  goToToday: () => void;

  // Meal Entries
  entriesForDate: MealEntry[];
  entriesByMeal: Record<MealType, MealEntry[]>;
  dailySummary: DailyNutritionSummary;

  // Actions
  logFoodItem: (
    food: FoodItem,
    mealType: MealType,
    quantity: number,
    unit: ServingUnit,
    date?: string
  ) => Promise<MealEntry>;
  quickAdd: (
    name: string,
    calories: number,
    mealType: MealType,
    macros?: { protein?: number; carbs?: number; fat?: number; fiber?: number },
    date?: string
  ) => Promise<MealEntry>;
  deleteEntry: (entryId: string) => Promise<void>;
  updateEntryQuantity: (entryId: string, quantity: number, unit: ServingUnit) => Promise<void>;
  moveEntry: (entryId: string, targetMealType: MealType) => Promise<void>;
  duplicateEntry: (entryId: string, targetMealType?: MealType, targetDate?: string) => Promise<void>;

  // Meal Templates
  mealTemplates: MealTemplate[];
  saveMealAsTemplate: (name: string, mealType: MealType) => Promise<MealTemplate | null>;
  logMealTemplate: (templateId: string, mealType: MealType, date?: string) => Promise<void>;
  deleteMealTemplate: (templateId: string) => Promise<void>;

  // Recipes
  recipes: Recipe[];
  saveRecipe: (recipe: Omit<Recipe, 'id' | 'createdAt' | 'updatedAt'>) => Promise<Recipe>;
  deleteRecipe: (recipeId: string) => Promise<void>;
  logRecipeToMeal: (recipeId: string, mealType: MealType, servings: number, date?: string) => Promise<void>;

  // Custom Foods
  customFoods: FoodItem[];
  saveCustomFood: (food: FoodItem) => Promise<void>;
  deleteCustomFood: (foodId: string) => Promise<void>;

  // Water Tracking
  waterLogsForDate: WaterLogEntry[];
  waterConsumedMl: number;
  logWater: (amountMl: number, date?: string) => Promise<void>;
  undoWater: (date?: string) => Promise<void>;

  // Weight Tracking
  weightLogs: NutritionWeightEntry[];
  latestWeightEntry: NutritionWeightEntry | null;
  logWeight: (params: {
    weightKg: number;
    bodyFatPercent?: number;
    waistCm?: number;
    notes?: string;
    date?: string;
  }) => Promise<void>;

  // Fasting
  activeFast: FastingSession | null;
  startFast: (protocol: FastingProtocol, targetHours: number) => Promise<void>;
  finishFast: () => Promise<void>;
  cancelFast: () => Promise<void>;
  fastingHistory: FastingSession[];

  // Targets
  nutritionTarget: NutritionTarget;
  updateNutritionTarget: (updates: Partial<NutritionTarget>) => void;
  toggleIncludeExerciseCalories: () => void;

  // Analytics & Streaks
  loggingStreak: number;
  goalAdherenceRate: number;
  isOnline: boolean;
  refreshData: () => Promise<void>;
}

const NutritionContext = createContext<NutritionContextType | undefined>(undefined);

function getTodayString(): string {
  return new Date().toISOString().split('T')[0];
}

const NUTRITION_TARGET_STORAGE_KEY = 'myfitai_nutrition_targets';

export function NutritionProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const { profile, dailyStats } = useFitnessContext();

  const [selectedDate, setSelectedDate] = useState<string>(getTodayString);
  const [mealEntries, setMealEntries] = useState<MealEntry[]>([]);
  const [mealTemplates, setMealTemplates] = useState<MealTemplate[]>([]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [customFoods, setCustomFoods] = useState<FoodItem[]>([]);
  const [waterLogs, setWaterLogs] = useState<WaterLogEntry[]>([]);
  const [weightLogs, setWeightLogs] = useState<NutritionWeightEntry[]>([]);
  const [fastingSessions, setFastingSessions] = useState<FastingSession[]>([]);
  const [isOnline, setIsOnline] = useState<boolean>(typeof navigator !== 'undefined' ? navigator.onLine : true);

  // Online / Offline listener
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Targets initialized from profile and calculation engine
  const [nutritionTarget, setNutritionTarget] = useState<NutritionTarget>(() => {
    const saved = storage.get<NutritionTarget>(NUTRITION_TARGET_STORAGE_KEY);
    if (saved) return saved;

    const weightKg = (profile.weight || 178) / 2.20462;
    const heightCm = (profile.height || 72) * 2.54;
    const { target } = calculateNutritionTargets({
      weightKg,
      heightCm,
      age: profile.age || 28,
      gender: profile.gender || 'male',
      activityLevel: 'moderate',
      goal: profile.goal || 'Hypertrophy Phase',
      customCalorieOverride: profile.dailyCalorieGoal,
    });
    return target;
  });

  // Load all initial data from IndexedDB
  const refreshData = useCallback(async () => {
    try {
      const [entries, temps, recs, customs, waters, weights, fasts] = await Promise.all([
        db.nutrition.mealEntries.getAll(),
        db.nutrition.mealTemplates.getAll(),
        db.nutrition.recipes.getAll(),
        db.nutrition.customFoods.getAll(),
        db.nutrition.waterLogs.getAll(),
        db.nutrition.weightLogs.getAll(),
        db.nutrition.fastingSessions.getAll(),
      ]);

      setMealEntries(entries || []);
      setMealTemplates(temps || []);
      setRecipes(recs || []);
      setCustomFoods(customs || []);
      setWaterLogs(waters || []);
      setWeightLogs(weights || []);
      setFastingSessions(fasts || []);
    } catch (err) {
      console.warn('[NutritionContext] Failed to load data from IndexedDB:', err);
    }
  }, []);

  useEffect(() => {
    refreshData();
  }, [refreshData, user?.uid]);

  // Date Navigation Helpers
  const goToPreviousDay = () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() - 1);
    setSelectedDate(d.toISOString().split('T')[0]);
  };

  const goToNextDay = () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + 1);
    setSelectedDate(d.toISOString().split('T')[0]);
  };

  const goToToday = () => {
    setSelectedDate(getTodayString());
  };

  // Filter entries for selected date
  const entriesForDate = useMemo(() => {
    return mealEntries.filter(e => e.date === selectedDate);
  }, [mealEntries, selectedDate]);

  const entriesByMeal = useMemo(() => {
    const groups: Record<MealType, MealEntry[]> = {
      Breakfast: [],
      Lunch: [],
      Dinner: [],
      Snacks: [],
    };
    for (const entry of entriesForDate) {
      if (!groups[entry.mealType]) {
        groups[entry.mealType] = [];
      }
      groups[entry.mealType].push(entry);
    }
    return groups;
  }, [entriesForDate]);

  // Water for selected date
  const waterLogsForDate = useMemo(() => {
    return waterLogs.filter(w => w.date === selectedDate);
  }, [waterLogs, selectedDate]);

  const waterConsumedMl = useMemo(() => {
    return waterLogsForDate.reduce((sum, w) => sum + w.amountMl, 0);
  }, [waterLogsForDate]);

  // Daily Summary computation
  const dailySummary = useMemo<DailyNutritionSummary>(() => {
    const totals = sumNutrients(entriesForDate.map(e => e.nutrients));
    const exerciseBurn = nutritionTarget.includeExerciseInBudget ? dailyStats.calories || 0 : 0;
    const calorieBudget = nutritionTarget.dailyCalories + exerciseBurn;
    const remaining = Math.max(0, calorieBudget - totals.calories);

    const totalMacroCals = totals.protein * 4 + totals.carbohydrates * 4 + totals.fat * 9;
    const proteinPercent = totalMacroCals > 0 ? Math.round(((totals.protein * 4) / totalMacroCals) * 100) : 0;
    const carbsPercent = totalMacroCals > 0 ? Math.round(((totals.carbohydrates * 4) / totalMacroCals) * 100) : 0;
    const fatPercent = totalMacroCals > 0 ? Math.round(((totals.fat * 9) / totalMacroCals) * 100) : 0;

    return {
      date: selectedDate,
      caloriesConsumed: totals.calories,
      proteinConsumed: totals.protein,
      carbsConsumed: totals.carbohydrates,
      fatConsumed: totals.fat,
      fiberConsumed: totals.fiber || 0,
      sodiumConsumed: totals.sodium || 0,
      waterConsumed: waterConsumedMl / 1000,
      exerciseCaloriesBurned: exerciseBurn,
      calorieBudget,
      caloriesRemaining: remaining,
      macros: {
        proteinPercent,
        carbsPercent,
        fatPercent,
      },
    };
  }, [entriesForDate, nutritionTarget, dailyStats.calories, selectedDate, waterConsumedMl]);

  // Log food item to meal
  const logFoodItem = async (
    food: FoodItem,
    mealType: MealType,
    quantity: number,
    unit: ServingUnit,
    date?: string
  ): Promise<MealEntry> => {
    const targetDate = date || selectedDate;
    const { nutrients, totalGrams } = calculateFoodNutrients(food, quantity, unit);

    const entry: MealEntry = {
      id: `entry_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      date: targetDate,
      mealType,
      foodId: food.id,
      foodName: food.name,
      brand: food.brand,
      emoji: food.emoji,
      image: food.image,
      source: food.source,
      quantity,
      servingUnit: unit,
      gramEquivalent: totalGrams,
      nutrients,
      timestamp: new Date().toISOString(),
      barcode: food.barcode,
    };

    await db.nutrition.mealEntries.save(entry);
    setMealEntries(prev => [...prev, entry]);
    return entry;
  };

  // Quick Add entry
  const quickAdd = async (
    name: string,
    calories: number,
    mealType: MealType,
    macros?: { protein?: number; carbs?: number; fat?: number; fiber?: number },
    date?: string
  ): Promise<MealEntry> => {
    const targetDate = date || selectedDate;
    const entry: MealEntry = {
      id: `quick_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      date: targetDate,
      mealType,
      foodId: 'quick_add',
      foodName: name.trim() || 'Quick Calorie Entry',
      source: 'custom',
      quantity: 1,
      servingUnit: 'serving',
      gramEquivalent: 100,
      nutrients: {
        calories: Math.max(0, Math.round(calories)),
        protein: Math.max(0, Math.round((macros?.protein || 0) * 10) / 10),
        carbohydrates: Math.max(0, Math.round((macros?.carbs || 0) * 10) / 10),
        fat: Math.max(0, Math.round((macros?.fat || 0) * 10) / 10),
        fiber: macros?.fiber !== undefined ? Math.max(0, Math.round(macros.fiber * 10) / 10) : undefined,
      },
      timestamp: new Date().toISOString(),
      isQuickAdd: true,
    };

    await db.nutrition.mealEntries.save(entry);
    setMealEntries(prev => [...prev, entry]);
    return entry;
  };

  const deleteEntry = async (entryId: string) => {
    await db.nutrition.mealEntries.delete(entryId);
    setMealEntries(prev => prev.filter(e => e.id !== entryId));
  };

  const updateEntryQuantity = async (entryId: string, quantity: number, unit: ServingUnit) => {
    const entry = mealEntries.find(e => e.id === entryId);
    if (!entry) return;

    const ratio = quantity / (entry.quantity || 1);
    const updatedNutrients: FoodNutrients = {
      calories: Math.round(entry.nutrients.calories * ratio),
      protein: Math.round(entry.nutrients.protein * ratio * 10) / 10,
      carbohydrates: Math.round(entry.nutrients.carbohydrates * ratio * 10) / 10,
      fat: Math.round(entry.nutrients.fat * ratio * 10) / 10,
      fiber: entry.nutrients.fiber !== undefined ? Math.round(entry.nutrients.fiber * ratio * 10) / 10 : undefined,
      sodium: entry.nutrients.sodium !== undefined ? Math.round(entry.nutrients.sodium * ratio) : undefined,
    };

    const updated: MealEntry = {
      ...entry,
      quantity,
      servingUnit: unit,
      gramEquivalent: Math.round(entry.gramEquivalent * ratio),
      nutrients: updatedNutrients,
    };

    await db.nutrition.mealEntries.save(updated);
    setMealEntries(prev => prev.map(e => (e.id === entryId ? updated : e)));
  };

  const moveEntry = async (entryId: string, targetMealType: MealType) => {
    const entry = mealEntries.find(e => e.id === entryId);
    if (!entry) return;
    const updated = { ...entry, mealType: targetMealType };
    await db.nutrition.mealEntries.save(updated);
    setMealEntries(prev => prev.map(e => (e.id === entryId ? updated : e)));
  };

  const duplicateEntry = async (entryId: string, targetMealType?: MealType, targetDate?: string) => {
    const entry = mealEntries.find(e => e.id === entryId);
    if (!entry) return;
    const duplicated: MealEntry = {
      ...entry,
      id: `entry_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      date: targetDate || selectedDate,
      mealType: targetMealType || entry.mealType,
      timestamp: new Date().toISOString(),
    };
    await db.nutrition.mealEntries.save(duplicated);
    setMealEntries(prev => [...prev, duplicated]);
  };

  // ── Meal Templates ──
  const saveMealAsTemplate = async (name: string, mealType: MealType): Promise<MealTemplate | null> => {
    const items = entriesByMeal[mealType];
    if (!items || items.length === 0) return null;

    const templateItems = items.map(entry => ({
      foodItem: {
        id: entry.foodId,
        name: entry.foodName,
        brand: entry.brand,
        emoji: entry.emoji,
        image: entry.image,
        source: entry.source,
        nutrientsPer100g: entry.nutrients,
        defaultServing: { quantity: entry.quantity, unit: entry.servingUnit, gramEquivalent: entry.gramEquivalent },
        availableServings: [{ unit: entry.servingUnit, gramEquivalent: entry.gramEquivalent, label: `${entry.quantity} ${entry.servingUnit}` }],
      },
      quantity: entry.quantity,
      unit: entry.servingUnit,
    }));

    const template: MealTemplate = {
      id: `tmpl_${Date.now()}`,
      name: name.trim() || `${mealType} Template`,
      mealType,
      items: templateItems,
      createdAt: new Date().toISOString(),
    };

    await db.nutrition.mealTemplates.save(template);
    setMealTemplates(prev => [...prev, template]);
    return template;
  };

  const logMealTemplate = async (templateId: string, mealType: MealType, date?: string) => {
    const template = mealTemplates.find(t => t.id === templateId);
    if (!template) return;

    for (const item of template.items) {
      await logFoodItem(item.foodItem, mealType, item.quantity, item.unit, date);
    }
  };

  const deleteMealTemplate = async (templateId: string) => {
    await db.nutrition.mealTemplates.delete(templateId);
    setMealTemplates(prev => prev.filter(t => t.id !== templateId));
  };

  // ── Recipes ──
  const saveRecipe = async (
    recipeData: Omit<Recipe, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<Recipe> => {
    const recipe: Recipe = {
      ...recipeData,
      id: `recipe_${Date.now()}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await db.nutrition.recipes.save(recipe);
    setRecipes(prev => [...prev, recipe]);
    return recipe;
  };

  const deleteRecipe = async (recipeId: string) => {
    await db.nutrition.recipes.delete(recipeId);
    setRecipes(prev => prev.filter(r => r.id !== recipeId));
  };

  const logRecipeToMeal = async (
    recipeId: string,
    mealType: MealType,
    servings: number,
    date?: string
  ) => {
    const recipe = recipes.find(r => r.id === recipeId);
    if (!recipe) return;

    const mult = servings;
    const entry: MealEntry = {
      id: `recipe_log_${Date.now()}`,
      date: date || selectedDate,
      mealType,
      foodId: recipe.id,
      foodName: `${recipe.name} (${servings} serving${servings > 1 ? 's' : ''})`,
      image: recipe.image,
      source: 'custom',
      quantity: servings,
      servingUnit: 'serving',
      gramEquivalent: 250 * servings,
      nutrients: {
        calories: Math.round(recipe.perServingNutrients.calories * mult),
        protein: Math.round(recipe.perServingNutrients.protein * mult * 10) / 10,
        carbohydrates: Math.round(recipe.perServingNutrients.carbohydrates * mult * 10) / 10,
        fat: Math.round(recipe.perServingNutrients.fat * mult * 10) / 10,
        fiber: recipe.perServingNutrients.fiber !== undefined ? Math.round(recipe.perServingNutrients.fiber * mult * 10) / 10 : undefined,
      },
      timestamp: new Date().toISOString(),
      isRecipe: true,
      recipeId: recipe.id,
    };

    await db.nutrition.mealEntries.save(entry);
    setMealEntries(prev => [...prev, entry]);
  };

  // ── Custom Foods ──
  const saveCustomFood = async (food: FoodItem) => {
    await customFoodProvider.save(food);
    setCustomFoods(prev => {
      const idx = prev.findIndex(f => f.id === food.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = food;
        return next;
      }
      return [food, ...prev];
    });
  };

  const deleteCustomFood = async (foodId: string) => {
    await customFoodProvider.delete(foodId);
    setCustomFoods(prev => prev.filter(f => f.id !== foodId));
  };

  // ── Water Tracking ──
  const logWater = async (amountMl: number, date?: string) => {
    const targetDate = date || selectedDate;
    const entry: WaterLogEntry = {
      id: `water_${Date.now()}`,
      date: targetDate,
      amountMl,
      timestamp: new Date().toISOString(),
    };
    await db.nutrition.waterLogs.save(entry);
    setWaterLogs(prev => [...prev, entry]);
  };

  const undoWater = async (date?: string) => {
    const targetDate = date || selectedDate;
    const entries = waterLogs.filter(w => w.date === targetDate);
    if (entries.length === 0) return;
    const last = entries[entries.length - 1];
    await db.nutrition.waterLogs.delete(last.id);
    setWaterLogs(prev => prev.filter(w => w.id !== last.id));
  };

  // ── Weight Tracking ──
  const latestWeightEntry = useMemo(() => {
    if (weightLogs.length === 0) return null;
    return [...weightLogs].sort((a, b) => b.date.localeCompare(a.date))[0];
  }, [weightLogs]);

  const logWeight = async (params: {
    weightKg: number;
    bodyFatPercent?: number;
    waistCm?: number;
    notes?: string;
    date?: string;
  }) => {
    const targetDate = params.date || selectedDate;
    const entry: NutritionWeightEntry = {
      id: `weight_${Date.now()}`,
      date: targetDate,
      weightKg: params.weightKg,
      weightLbs: Math.round(params.weightKg * 2.20462 * 10) / 10,
      bodyFatPercent: params.bodyFatPercent,
      waistCm: params.waistCm,
      waistInches: params.waistCm ? Math.round((params.waistCm / 2.54) * 10) / 10 : undefined,
      notes: params.notes,
      timestamp: new Date().toISOString(),
    };
    await db.nutrition.weightLogs.save(entry);
    setWeightLogs(prev => [...prev.filter(w => w.date !== targetDate), entry]);
  };

  // ── Fasting Tracking ──
  const activeFast = useMemo(() => {
    return fastingSessions.find(s => s.status === 'active') || null;
  }, [fastingSessions]);

  const startFast = async (protocol: FastingProtocol, targetHours: number) => {
    // Cancel any existing active fast
    if (activeFast) {
      await db.nutrition.fastingSessions.delete(activeFast.id);
    }
    const session: FastingSession = {
      id: `fast_${Date.now()}`,
      protocol,
      targetHours,
      startTime: new Date().toISOString(),
      status: 'active',
    };
    await db.nutrition.fastingSessions.save(session);
    setFastingSessions(prev => [session, ...prev.filter(s => s.status !== 'active')]);
  };

  const finishFast = async () => {
    if (!activeFast) return;
    const completed: FastingSession = {
      ...activeFast,
      status: 'completed',
      endTime: new Date().toISOString(),
    };
    await db.nutrition.fastingSessions.save(completed);
    setFastingSessions(prev => prev.map(s => (s.id === activeFast.id ? completed : s)));
  };

  const cancelFast = async () => {
    if (!activeFast) return;
    const cancelled: FastingSession = {
      ...activeFast,
      status: 'cancelled',
      endTime: new Date().toISOString(),
    };
    await db.nutrition.fastingSessions.save(cancelled);
    setFastingSessions(prev => prev.map(s => (s.id === activeFast.id ? cancelled : s)));
  };

  // ── Targets & Preferences ──
  const updateNutritionTarget = (updates: Partial<NutritionTarget>) => {
    setNutritionTarget(prev => {
      const next = { ...prev, ...updates };
      storage.set(NUTRITION_TARGET_STORAGE_KEY, next);
      return next;
    });
  };

  const toggleIncludeExerciseCalories = () => {
    updateNutritionTarget({
      includeExerciseInBudget: !nutritionTarget.includeExerciseInBudget,
    });
  };

  // ── Logging Streak & Adherence (healthy, non-guilt based) ──
  const loggingStreak = useMemo(() => {
    const datesWithLogs = new Set(mealEntries.map(e => e.date));
    let streak = 0;
    const today = new Date();

    for (let i = 0; i < 365; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const str = d.toISOString().split('T')[0];
      if (datesWithLogs.has(str)) {
        streak++;
      } else if (i === 0) {
        // Today hasn't been logged yet, check yesterday
        continue;
      } else {
        break;
      }
    }
    return streak;
  }, [mealEntries]);

  const goalAdherenceRate = useMemo(() => {
    if (mealEntries.length === 0) return 0;
    const dates = [...new Set(mealEntries.map(e => e.date))].slice(-14);
    let met = 0;
    for (const d of dates) {
      const entries = mealEntries.filter(e => e.date === d);
      const totalCals = entries.reduce((s, e) => s + e.nutrients.calories, 0);
      const target = nutritionTarget.dailyCalories;
      // Met if within 15% range
      if (Math.abs(totalCals - target) / target <= 0.15) {
        met++;
      }
    }
    return dates.length > 0 ? Math.round((met / dates.length) * 100) : 0;
  }, [mealEntries, nutritionTarget.dailyCalories]);

  return (
    <NutritionContext.Provider
      value={{
        selectedDate,
        setSelectedDate,
        goToPreviousDay,
        goToNextDay,
        goToToday,
        entriesForDate,
        entriesByMeal,
        dailySummary,
        logFoodItem,
        quickAdd,
        deleteEntry,
        updateEntryQuantity,
        moveEntry,
        duplicateEntry,
        mealTemplates,
        saveMealAsTemplate,
        logMealTemplate,
        deleteMealTemplate,
        recipes,
        saveRecipe,
        deleteRecipe,
        logRecipeToMeal,
        customFoods,
        saveCustomFood,
        deleteCustomFood,
        waterLogsForDate,
        waterConsumedMl,
        logWater,
        undoWater,
        weightLogs,
        latestWeightEntry,
        logWeight,
        activeFast,
        startFast,
        finishFast,
        cancelFast,
        fastingHistory: fastingSessions,
        nutritionTarget,
        updateNutritionTarget,
        toggleIncludeExerciseCalories,
        loggingStreak,
        goalAdherenceRate,
        isOnline,
        refreshData,
      }}
    >
      {children}
    </NutritionContext.Provider>
  );
}

export function useNutrition() {
  const context = useContext(NutritionContext);
  if (!context) {
    throw new Error('useNutrition must be used within a NutritionProvider');
  }
  return context;
}
