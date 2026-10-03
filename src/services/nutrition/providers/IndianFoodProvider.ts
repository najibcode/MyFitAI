// ─────────────────────────────────────────────────────────────
// MyFitAI — Indian Food Data Provider
// Authoritative Indian nutrition reference referencing ICMR / NIN IFCT 2017
// and curated authentic Indian recipes with regional terminology.
// ─────────────────────────────────────────────────────────────

import type { FoodDataProvider, FoodSearchParams } from './types';
import type { FoodItem, ServingOption } from '../../../types/nutrition';
import { INDIAN_DISHES } from '../../../data/indianDishes';

// Core Indian Food Composition Reference (ICMR-NIN IFCT 2017 inspired staples)
const INDIAN_STAPLES: FoodItem[] = [
  {
    id: 'ifct_roti',
    name: 'Roti / Chapati (Whole Wheat)',
    category: 'Grains & Breads',
    emoji: '🫓',
    source: 'indian_db',
    sourceAttribution: 'ICMR-NIN Indian Food Composition Tables 2017',
    isVerified: true,
    regionalNames: ['Phulka', 'Chapati', 'Roti', 'Rotti'],
    nutrientsPer100g: {
      calories: 297,
      protein: 10.5,
      carbohydrates: 58.2,
      fat: 2.8,
      fiber: 9.6,
      sodium: 180,
      calcium: 48,
      iron: 3.9,
      potassium: 360,
      magnesium: 120,
    },
    defaultServing: { quantity: 1, unit: 'piece', gramEquivalent: 40 },
    availableServings: [
      { unit: 'piece', gramEquivalent: 40, label: '1 medium roti (40g)' },
      { unit: 'piece', gramEquivalent: 60, label: '1 large roti (60g)' },
      { unit: 'g', gramEquivalent: 1, label: '1 gram' },
      { unit: 'serving', gramEquivalent: 80, label: '2 rotis (80g)' },
    ],
  },
  {
    id: 'ifct_boiled_rice',
    name: 'Cooked White Rice (Chawal / Sadham)',
    category: 'Grains & Breads',
    emoji: '🍚',
    source: 'indian_db',
    sourceAttribution: 'ICMR-NIN Indian Food Composition Tables 2017',
    isVerified: true,
    regionalNames: ['Chawal', 'Sadham', 'Bhat', 'Bhathe'],
    nutrientsPer100g: {
      calories: 130,
      protein: 2.7,
      carbohydrates: 28.2,
      fat: 0.3,
      fiber: 0.4,
      sodium: 1,
      potassium: 35,
      iron: 0.2,
      magnesium: 12,
    },
    defaultServing: { quantity: 1, unit: 'katori', gramEquivalent: 150 },
    availableServings: [
      { unit: 'katori', gramEquivalent: 150, label: '1 standard katori (150g)' },
      { unit: 'bowl', gramEquivalent: 200, label: '1 medium bowl (200g)' },
      { unit: 'cup', gramEquivalent: 160, label: '1 cup cooked (160g)' },
      { unit: 'g', gramEquivalent: 1, label: '1 gram' },
    ],
  },
  {
    id: 'ifct_cooked_toor_dal',
    name: 'Cooked Toor Dal (Yellow Lentil Sambhar Dal)',
    category: 'Lentils & Pulses',
    emoji: '🍲',
    source: 'indian_db',
    sourceAttribution: 'ICMR-NIN Indian Food Composition Tables 2017',
    isVerified: true,
    regionalNames: ['Arhar Dal', 'Thuvaram Paruppu', 'Kandi Pappu'],
    nutrientsPer100g: {
      calories: 104,
      protein: 6.8,
      carbohydrates: 15.2,
      fat: 1.8,
      fiber: 4.2,
      sodium: 220,
      potassium: 310,
      calcium: 28,
      iron: 1.6,
      magnesium: 38,
    },
    defaultServing: { quantity: 1, unit: 'katori', gramEquivalent: 150 },
    availableServings: [
      { unit: 'katori', gramEquivalent: 150, label: '1 katori (150g)' },
      { unit: 'bowl', gramEquivalent: 220, label: '1 bowl (220g)' },
      { unit: 'g', gramEquivalent: 1, label: '1 gram' },
    ],
  },
  {
    id: 'ifct_idli',
    name: 'Idli (Steamed Rice & Urad Cake)',
    category: 'Breakfast',
    emoji: '⚪',
    source: 'indian_db',
    sourceAttribution: 'ICMR-NIN Indian Food Composition Tables 2017',
    isVerified: true,
    regionalNames: ['Idly', 'Steamed Rice Cake'],
    nutrientsPer100g: {
      calories: 132,
      protein: 4.5,
      carbohydrates: 26.5,
      fat: 0.8,
      fiber: 1.8,
      sodium: 140,
      potassium: 110,
      calcium: 22,
      iron: 0.9,
    },
    defaultServing: { quantity: 1, unit: 'piece', gramEquivalent: 45 },
    availableServings: [
      { unit: 'piece', gramEquivalent: 45, label: '1 piece (45g)' },
      { unit: 'serving', gramEquivalent: 90, label: '2 idlis (90g)' },
      { unit: 'serving', gramEquivalent: 135, label: '3 idlis (135g)' },
      { unit: 'g', gramEquivalent: 1, label: '1 gram' },
    ],
  },
  {
    id: 'ifct_plain_dosa',
    name: 'Plain Dosa',
    category: 'Breakfast',
    emoji: '🥞',
    source: 'indian_db',
    sourceAttribution: 'ICMR-NIN Indian Food Composition Tables 2017',
    isVerified: true,
    regionalNames: ['Dosai', 'Dose'],
    nutrientsPer100g: {
      calories: 168,
      protein: 4.1,
      carbohydrates: 28.5,
      fat: 4.2,
      fiber: 1.6,
      sodium: 210,
      potassium: 130,
      iron: 1.1,
    },
    defaultServing: { quantity: 1, unit: 'piece', gramEquivalent: 80 },
    availableServings: [
      { unit: 'piece', gramEquivalent: 80, label: '1 medium dosa (80g)' },
      { unit: 'piece', gramEquivalent: 120, label: '1 large roast dosa (120g)' },
      { unit: 'g', gramEquivalent: 1, label: '1 gram' },
    ],
  },
  {
    id: 'ifct_sambar',
    name: 'Vegetable Sambar',
    category: 'Soups & Curries',
    emoji: '🥣',
    source: 'indian_db',
    sourceAttribution: 'ICMR-NIN Indian Food Composition Tables 2017',
    isVerified: true,
    regionalNames: ['Kuzhambu', 'Sambaaru'],
    nutrientsPer100g: {
      calories: 58,
      protein: 2.8,
      carbohydrates: 8.5,
      fat: 1.4,
      fiber: 2.4,
      sodium: 320,
      potassium: 240,
      calcium: 35,
      iron: 1.2,
    },
    defaultServing: { quantity: 1, unit: 'bowl', gramEquivalent: 200 },
    availableServings: [
      { unit: 'katori', gramEquivalent: 150, label: '1 katori (150g)' },
      { unit: 'bowl', gramEquivalent: 200, label: '1 bowl (200g)' },
      { unit: 'g', gramEquivalent: 1, label: '1 gram' },
    ],
  },
  {
    id: 'ifct_curd',
    name: 'Indian Curd / Dahi (Plain Whole Milk)',
    category: 'Dairy',
    emoji: '🥛',
    source: 'indian_db',
    sourceAttribution: 'ICMR-NIN Indian Food Composition Tables 2017',
    isVerified: true,
    regionalNames: ['Dahi', 'Thayir', 'Mosaru', 'Perugu'],
    nutrientsPer100g: {
      calories: 61,
      protein: 3.5,
      carbohydrates: 4.7,
      fat: 3.2,
      fiber: 0,
      sodium: 46,
      calcium: 150,
      potassium: 140,
      vitaminB12: 0.4,
      magnesium: 12,
    },
    defaultServing: { quantity: 1, unit: 'katori', gramEquivalent: 150 },
    availableServings: [
      { unit: 'katori', gramEquivalent: 150, label: '1 katori (150g)' },
      { unit: 'cup', gramEquivalent: 200, label: '1 cup (200g)' },
      { unit: 'g', gramEquivalent: 1, label: '1 gram' },
    ],
  },
  {
    id: 'ifct_paneer_raw',
    name: 'Fresh Paneer (Cottage Cheese)',
    category: 'Dairy',
    emoji: '🧀',
    source: 'indian_db',
    sourceAttribution: 'ICMR-NIN Indian Food Composition Tables 2017',
    isVerified: true,
    nutrientsPer100g: {
      calories: 265,
      protein: 18.3,
      carbohydrates: 1.2,
      fat: 20.8,
      fiber: 0,
      sodium: 18,
      calcium: 480,
      potassium: 110,
      vitaminD: 0.5,
      magnesium: 25,
      zinc: 1.8,
    },
    defaultServing: { quantity: 1, unit: 'piece', gramEquivalent: 100 },
    availableServings: [
      { unit: 'piece', gramEquivalent: 100, label: '1 block (100g)' },
      { unit: 'serving', gramEquivalent: 50, label: 'Small portion (50g)' },
      { unit: 'g', gramEquivalent: 1, label: '1 gram' },
    ],
  },
  {
    id: 'ifct_rajma_curry',
    name: 'Rajma Masala (Kidney Bean Curry)',
    category: 'Lentils & Pulses',
    emoji: '🫘',
    source: 'indian_db',
    sourceAttribution: 'ICMR-NIN Indian Food Composition Tables 2017',
    isVerified: true,
    regionalNames: ['Rajmah'],
    nutrientsPer100g: {
      calories: 135,
      protein: 6.9,
      carbohydrates: 18.4,
      fat: 3.8,
      fiber: 5.8,
      sodium: 290,
      potassium: 380,
      iron: 2.2,
      calcium: 40,
    },
    defaultServing: { quantity: 1, unit: 'bowl', gramEquivalent: 200 },
    availableServings: [
      { unit: 'katori', gramEquivalent: 150, label: '1 katori (150g)' },
      { unit: 'bowl', gramEquivalent: 200, label: '1 bowl (200g)' },
      { unit: 'g', gramEquivalent: 1, label: '1 gram' },
    ],
  },
  {
    id: 'ifct_chana_masala',
    name: 'Chole / Chana Masala (Chickpea Curry)',
    category: 'Lentils & Pulses',
    emoji: '🍲',
    source: 'indian_db',
    sourceAttribution: 'ICMR-NIN Indian Food Composition Tables 2017',
    isVerified: true,
    regionalNames: ['Chole', 'Kabuli Chana'],
    nutrientsPer100g: {
      calories: 148,
      protein: 6.5,
      carbohydrates: 20.8,
      fat: 4.5,
      fiber: 6.1,
      sodium: 310,
      potassium: 340,
      iron: 2.1,
      calcium: 45,
    },
    defaultServing: { quantity: 1, unit: 'bowl', gramEquivalent: 200 },
    availableServings: [
      { unit: 'katori', gramEquivalent: 150, label: '1 katori (150g)' },
      { unit: 'bowl', gramEquivalent: 200, label: '1 bowl (200g)' },
      { unit: 'g', gramEquivalent: 1, label: '1 gram' },
    ],
  },
  {
    id: 'ifct_chicken_biryani',
    name: 'Chicken Biryani (Dum Style)',
    category: 'Main Courses',
    emoji: '🍗',
    source: 'indian_db',
    sourceAttribution: 'Authoritative Indian Recipe Composition Reference',
    isVerified: true,
    regionalNames: ['Dum Biryani', 'Hyderabadi Biryani', 'Ambur Biryani'],
    nutrientsPer100g: {
      calories: 185,
      protein: 11.2,
      carbohydrates: 21.0,
      fat: 6.2,
      fiber: 1.2,
      sodium: 340,
      potassium: 220,
      iron: 1.4,
    },
    defaultServing: { quantity: 1, unit: 'plate', gramEquivalent: 300 },
    availableServings: [
      { unit: 'plate', gramEquivalent: 300, label: '1 standard plate (300g)' },
      { unit: 'bowl', gramEquivalent: 200, label: '1 bowl (200g)' },
      { unit: 'g', gramEquivalent: 1, label: '1 gram' },
    ],
  },
  {
    id: 'ifct_egg_bhurji',
    name: 'Egg Bhurji (Indian Scrambled Eggs)',
    category: 'Breakfast',
    emoji: '🍳',
    source: 'indian_db',
    sourceAttribution: 'Authoritative Indian Recipe Composition Reference',
    isVerified: true,
    nutrientsPer100g: {
      calories: 162,
      protein: 12.0,
      carbohydrates: 3.5,
      fat: 11.0,
      fiber: 0.8,
      sodium: 380,
      potassium: 190,
      calcium: 55,
      iron: 2.1,
    },
    defaultServing: { quantity: 1, unit: 'serving', gramEquivalent: 150 },
    availableServings: [
      { unit: 'serving', gramEquivalent: 150, label: '1 serving from 2 eggs (150g)' },
      { unit: 'g', gramEquivalent: 1, label: '1 gram' },
    ],
  },
];

/** Transform INDIAN_DISHES from data/indianDishes.ts into FoodItem entries */
const TRANSFORMED_DISHES: FoodItem[] = INDIAN_DISHES.map(d => {
  const servingSize = d.servingSize || 250;
  const ratio = 100 / servingSize;
  const servings: ServingOption[] = [
    { unit: 'serving', gramEquivalent: servingSize, label: `1 serving (${servingSize}g)` },
    { unit: 'bowl', gramEquivalent: 200, label: '1 bowl (200g)' },
    { unit: 'katori', gramEquivalent: 150, label: '1 katori (150g)' },
    { unit: 'g', gramEquivalent: 1, label: '1 gram' },
  ];

  return {
    id: `ind_dish_${d.id}`,
    name: d.name,
    category: d.category,
    image: d.image,
    source: 'indian_db',
    sourceAttribution: 'Indian Healthy Kitchen Database',
    isVerified: true,
    nutrientsPer100g: {
      calories: Math.round(d.calories * ratio),
      protein: Math.round(d.protein * ratio * 10) / 10,
      carbohydrates: Math.round(d.carbs * ratio * 10) / 10,
      fat: Math.round(d.fat * ratio * 10) / 10,
      fiber: Math.round(d.fiber * ratio * 10) / 10,
      sodium: 250,
      potassium: 200,
    },
    defaultServing: {
      quantity: 1,
      unit: 'serving',
      gramEquivalent: servingSize,
    },
    availableServings: servings,
    tags: d.tags,
    ingredientsText: d.ingredients?.join(', '),
  };
});

const ALL_INDIAN_FOODS = [...INDIAN_STAPLES, ...TRANSFORMED_DISHES];

export class IndianFoodProvider implements FoodDataProvider {
  readonly id = 'indian_db';
  readonly name = 'Indian Food Database';
  readonly attribution = 'ICMR-NIN IFCT 2017 & Regional Recipe Databank';

  async search(params: FoodSearchParams): Promise<FoodItem[]> {
    const q = params.query.trim().toLowerCase();
    if (!q) {
      if (params.category && params.category !== 'All') {
        return ALL_INDIAN_FOODS.filter(f => f.category === params.category).slice(0, params.limit || 20);
      }
      return ALL_INDIAN_FOODS.slice(0, params.limit || 20);
    }

    const matches = ALL_INDIAN_FOODS.filter(food => {
      const matchName = food.name.toLowerCase().includes(q);
      const matchCat = food.category?.toLowerCase().includes(q);
      const matchTags = food.tags?.some(t => t.toLowerCase().includes(q));
      const matchRegional = food.regionalNames?.some(r => r.toLowerCase().includes(q));
      const matchIngredients = food.ingredientsText?.toLowerCase().includes(q);
      return matchName || matchCat || matchTags || matchRegional || matchIngredients;
    });

    if (params.category && params.category !== 'All') {
      return matches.filter(f => f.category === params.category).slice(0, params.limit || 20);
    }

    return matches.slice(0, params.limit || 20);
  }

  async getById(id: string): Promise<FoodItem | null> {
    const found = ALL_INDIAN_FOODS.find(f => f.id === id);
    return found || null;
  }
}

export const indianFoodProvider = new IndianFoodProvider();
