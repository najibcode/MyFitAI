// ─────────────────────────────────────────────────────────────
// MyFitAI — Food Data Provider Interface
// Pluggable architecture for food search, barcode, and nutrient lookup
// ─────────────────────────────────────────────────────────────

import type { FoodItem } from '../../../types/nutrition';

export interface FoodSearchParams {
  query: string;
  category?: string;
  brand?: string;
  limit?: number;
  offset?: number;
}

export interface FoodSearchResult {
  items: FoodItem[];
  totalResults: number;
  source: string;
}

export interface FoodDataProvider {
  readonly id: string;
  readonly name: string;
  readonly attribution: string;

  /** Search food items by query string */
  search(params: FoodSearchParams): Promise<FoodItem[]>;

  /** Lookup food item by barcode (e.g. UPC, EAN-13) */
  getByBarcode?(barcode: string): Promise<FoodItem | null>;

  /** Lookup single food item by provider ID */
  getById(id: string): Promise<FoodItem | null>;
}
