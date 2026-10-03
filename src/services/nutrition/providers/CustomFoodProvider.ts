// ─────────────────────────────────────────────────────────────
// MyFitAI — Custom Food Data Provider
// Manages user-created foods saved locally in IndexedDB
// Supports offline custom foods and custom barcode indexing.
// ─────────────────────────────────────────────────────────────

import type { FoodDataProvider, FoodSearchParams } from './types';
import type { FoodItem } from '../../../types/nutrition';
import { db } from '../../../utils/db';

export class CustomFoodProvider implements FoodDataProvider {
  readonly id = 'custom';
  readonly name = 'My Custom Foods';
  readonly attribution = 'User Created';

  async search(params: FoodSearchParams): Promise<FoodItem[]> {
    try {
      const all = await db.nutrition.customFoods.getAll();
      const q = params.query.trim().toLowerCase();
      if (!q) return all.slice(0, params.limit || 20);

      return all.filter(f =>
        f.name.toLowerCase().includes(q) ||
        f.brand?.toLowerCase().includes(q) ||
        f.barcode === q
      ).slice(0, params.limit || 20);
    } catch {
      return [];
    }
  }

  async getByBarcode(barcode: string): Promise<FoodItem | null> {
    try {
      const found = await db.nutrition.customFoods.getByBarcode(barcode.trim());
      return found || null;
    } catch {
      return null;
    }
  }

  async getById(id: string): Promise<FoodItem | null> {
    try {
      const found = await db.nutrition.customFoods.getById(id);
      return found || null;
    } catch {
      return null;
    }
  }

  async save(food: FoodItem): Promise<void> {
    await db.nutrition.customFoods.save({
      ...food,
      source: 'custom',
      isCustom: true,
      sourceAttribution: 'User Created',
    });
  }

  async delete(id: string): Promise<void> {
    await db.nutrition.customFoods.delete(id);
  }
}

export const customFoodProvider = new CustomFoodProvider();
