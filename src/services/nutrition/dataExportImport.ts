// ─────────────────────────────────────────────────────────────
// MyFitAI — Nutrition Data Export & Import Service
// Provides JSON and CSV export for user data ownership,
// along with schema-validated merge/replace import safeguards.
// ─────────────────────────────────────────────────────────────

import { db } from '../../utils/db';
import type {
  MealEntry,
  FoodItem,
  Recipe,
  MealTemplate,
  WaterLogEntry,
  NutritionWeightEntry,
  FastingSession,
} from '../../types/nutrition';

export interface NutritionExportPayload {
  version: number;
  exportedAt: string;
  source: 'MyFitAI';
  data: {
    mealEntries: MealEntry[];
    customFoods: FoodItem[];
    recipes: Recipe[];
    mealTemplates: MealTemplate[];
    waterLogs: WaterLogEntry[];
    weightLogs: NutritionWeightEntry[];
    fastingSessions: FastingSession[];
  };
}

/**
 * Exports complete nutrition data as structured JSON.
 */
export async function exportNutritionDataJSON(): Promise<string> {
  const [mealEntries, customFoods, recipes, mealTemplates, waterLogs, weightLogs, fastingSessions] =
    await Promise.all([
      db.nutrition.mealEntries.getAll(),
      db.nutrition.customFoods.getAll(),
      db.nutrition.recipes.getAll(),
      db.nutrition.mealTemplates.getAll(),
      db.nutrition.waterLogs.getAll(),
      db.nutrition.weightLogs.getAll(),
      db.nutrition.fastingSessions.getAll(),
    ]);

  const payload: NutritionExportPayload = {
    version: 3,
    exportedAt: new Date().toISOString(),
    source: 'MyFitAI',
    data: {
      mealEntries,
      customFoods,
      recipes,
      mealTemplates,
      waterLogs,
      weightLogs,
      fastingSessions,
    },
  };

  return JSON.stringify(payload, null, 2);
}

import {
  formatMealEntriesToCSV,
  validateNutritionImportPayload as validateImportPayload,
} from '../../engine/nutritionCalculations';

export { formatMealEntriesToCSV, validateImportPayload };

/**
 * Exports meal logs as a standard CSV format (compatible with Excel/Sheets).
 */
export async function exportNutritionLogsCSV(): Promise<string> {
  const entries = await db.nutrition.mealEntries.getAll();
  return formatMealEntriesToCSV(entries);
}

/**
 * Validates and imports nutrition data.
 */
export async function importNutritionData(
  jsonString: string,
  mode: 'merge' | 'replace' = 'merge'
): Promise<{ success: boolean; importedCount: number; errors: string[] }> {
  let payload: any;

  try {
    payload = JSON.parse(jsonString);
  } catch {
    return { success: false, importedCount: 0, errors: ['Invalid JSON format.'] };
  }

  const validation = validateImportPayload(payload);
  if (!validation.isValid) {
    return { success: false, importedCount: 0, errors: validation.errors };
  }

  const d = payload.data || payload;

  let count = 0;

  try {
    if (mode === 'replace') {
      await Promise.all([
        db.nutrition.mealEntries.clear(),
        db.nutrition.customFoods.clear(),
        db.nutrition.recipes.clear(),
        db.nutrition.mealTemplates.clear(),
        db.nutrition.waterLogs.clear(),
        db.nutrition.weightLogs.clear(),
        db.nutrition.fastingSessions.clear(),
      ]);
    }

    if (Array.isArray(d.mealEntries) && d.mealEntries.length > 0) {
      await db.nutrition.mealEntries.saveMany(d.mealEntries);
      count += d.mealEntries.length;
    }

    if (Array.isArray(d.customFoods) && d.customFoods.length > 0) {
      await db.nutrition.customFoods.saveMany(d.customFoods);
      count += d.customFoods.length;
    }

    if (Array.isArray(d.recipes) && d.recipes.length > 0) {
      await db.nutrition.recipes.saveMany(d.recipes);
      count += d.recipes.length;
    }

    if (Array.isArray(d.mealTemplates) && d.mealTemplates.length > 0) {
      await db.nutrition.mealTemplates.saveMany(d.mealTemplates);
      count += d.mealTemplates.length;
    }

    if (Array.isArray(d.waterLogs) && d.waterLogs.length > 0) {
      await db.nutrition.waterLogs.saveMany(d.waterLogs);
      count += d.waterLogs.length;
    }

    if (Array.isArray(d.weightLogs) && d.weightLogs.length > 0) {
      await db.nutrition.weightLogs.saveMany(d.weightLogs);
      count += d.weightLogs.length;
    }

    if (Array.isArray(d.fastingSessions) && d.fastingSessions.length > 0) {
      for (const s of d.fastingSessions) {
        await db.nutrition.fastingSessions.save(s);
      }
      count += d.fastingSessions.length;
    }

    return { success: true, importedCount: count, errors: [] };
  } catch (err: any) {
    return { success: false, importedCount: count, errors: [err.message || 'Import failed.'] };
  }
}
