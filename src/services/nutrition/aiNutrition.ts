// ─────────────────────────────────────────────────────────────
// MyFitAI — AI Nutrition Coach & Meal Generation Service
// Integrates Google Gemini with live user nutrition context,
// Indian food intelligence, and workout-aware coaching.
// ─────────────────────────────────────────────────────────────

import { GoogleGenerativeAI } from '@google/generative-ai';
import type { FoodNutrients, MealType } from '../../types/nutrition';

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY as string;
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY || '');

export interface AINutritionContext {
  userName: string;
  goal: string;
  dailyCalorieTarget: number;
  dailyProteinTarget: number;
  caloriesConsumed: number;
  proteinConsumed: number;
  carbsConsumed: number;
  fatConsumed: number;
  waterConsumedLiters: number;
  weightKg: number;
  completedWorkoutToday?: {
    title: string;
    durationMinutes: number;
    caloriesBurned?: number;
  };
}

export interface GeneratedMealPlan {
  mealName: string;
  cuisine: string;
  mealType: MealType;
  description: string;
  ingredients: Array<{
    name: string;
    quantity: number;
    unit: string;
    grams: number;
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  }>;
  totalNutrients: FoodNutrients;
  prepTimeMinutes: number;
  instructions: string[];
  isAIEstimate: true;
}

/**
 * Ask AI Nutrition Coach an actionable question using live user context.
 */
export async function askNutritionCoach(
  question: string,
  context: AINutritionContext
): Promise<string> {
  const caloriesLeft = Math.max(0, context.dailyCalorieTarget - context.caloriesConsumed);
  const proteinLeft = Math.max(0, context.dailyProteinTarget - context.proteinConsumed);

  let systemPrompt = `You are MyFitAI's Nutrition & Sports Dietitian Coach.
USER PROFILE & CURRENT NUTRITION TODAY:
- User: ${context.userName} (Goal: ${context.goal}, Weight: ${context.weightKg}kg)
- Daily Targets: ${context.dailyCalorieTarget} kcal | ${context.dailyProteinTarget}g Protein
- Today's Intake So Far: ${context.caloriesConsumed} kcal | ${context.proteinConsumed}g Protein | ${context.carbsConsumed}g Carbs | ${context.fatConsumed}g Fat
- Remaining Today: ${caloriesLeft} kcal | ${proteinLeft}g Protein
- Water Drank: ${context.waterConsumedLiters.toFixed(1)}L`;

  if (context.completedWorkoutToday) {
    systemPrompt += `\n- WORKOUT COMPLETED TODAY: "${context.completedWorkoutToday.title}" (${context.completedWorkoutToday.durationMinutes} mins${
      context.completedWorkoutToday.caloriesBurned ? `, ~${context.completedWorkoutToday.caloriesBurned} kcal burned` : ''
    }). Workout recovery nutrition applies.`;
  }

  systemPrompt += `\n\nGUIDELINES:
- Provide direct, concise, science-backed guidance (max 180 words).
- Deeply understand both Western and Indian diets (South Indian staples like Idli, Dosa, Sambar, Roti, Paneer, Dal, Chole, Poha, etc.).
- Never invent unrealistic numbers. State when values are estimates.
- If asked what to eat, offer practical suggestions fitting their remaining ${caloriesLeft} kcal and ${proteinLeft}g protein.
- Be encouraging, practical, and helpful.`;

  try {
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.0-flash',
      systemInstruction: systemPrompt,
      generationConfig: {
        temperature: 0.6,
        maxOutputTokens: 512,
      },
    });

    const timeoutMs = 12000;
    const res = await Promise.race([
      model.generateContent(question),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('AI response timed out')), timeoutMs)
      ),
    ]);

    return res.response.text();
  } catch (err: any) {
    console.warn('AI Coach fallback:', err);
    return `Based on your goal of ${context.goal}, you have ${caloriesLeft} kcal and ${proteinLeft}g of protein remaining today. Focus on high-protein sources like Greek yogurt, eggs, paneer, tofu, or lean chicken breast alongside nutrient-dense greens.`;
  }
}

/**
 * Generate a complete, structured meal fitting target calories and dietary constraints.
 */
export async function generateAIMeal(params: {
  targetCalories: number;
  mealType: MealType;
  cuisine: string;
  dietPreference: 'Vegetarian' | 'Non-Vegetarian' | 'Vegan' | 'Eggetarian' | 'High-Protein' | 'Low-Carb' | string;
  availableIngredients?: string;
}): Promise<GeneratedMealPlan> {
  const prompt = `Generate a realistic, delicious meal matching:
- Meal Type: ${params.mealType}
- Target Calories: ~${params.targetCalories} kcal
- Cuisine: ${params.cuisine}
- Dietary Preference: ${params.dietPreference}
${params.availableIngredients ? `- User's Available Ingredients: ${params.availableIngredients}` : ''}

You MUST return STRICT JSON adhering to this schema:
{
  "mealName": "Name of dish",
  "cuisine": "${params.cuisine}",
  "mealType": "${params.mealType}",
  "description": "Short appetizing description",
  "prepTimeMinutes": 15,
  "ingredients": [
    {
      "name": "Ingredient name",
      "quantity": 100,
      "unit": "g",
      "grams": 100,
      "calories": 165,
      "protein": 31,
      "carbs": 0,
      "fat": 3.6
    }
  ],
  "totalNutrients": {
    "calories": 520,
    "protein": 42,
    "carbohydrates": 54,
    "fat": 14,
    "fiber": 8
  },
  "instructions": [
    "Step 1...",
    "Step 2..."
  ]
}

DO NOT wrap in markdown backticks other than valid json. Return pure JSON only.`;

  try {
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.0-flash',
      generationConfig: {
        responseMimeType: 'application/json',
        temperature: 0.5,
        maxOutputTokens: 1024,
      },
    });

    const timeoutMs = 15000;
    const res = await Promise.race([
      model.generateContent(prompt),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Meal generation timed out')), timeoutMs)
      ),
    ]);

    const parsed = JSON.parse(res.response.text());
    return {
      ...parsed,
      isAIEstimate: true,
    };
  } catch (err) {
    console.error('AI Meal generation failed:', err);
    // Deterministic fallback matching Indian or Western preference
    const isIndian = params.cuisine.toLowerCase().includes('india');
    if (isIndian) {
      return {
        mealName: 'Paneer & Spiced Vegetable Sauté with Whole Wheat Phulkas',
        cuisine: 'Indian',
        mealType: params.mealType,
        description: 'Tender paneer cubes sautéed with bell peppers, onions, and cumin served with soft warm rotis.',
        prepTimeMinutes: 20,
        ingredients: [
          { name: 'Fresh Paneer', quantity: 120, unit: 'g', grams: 120, calories: 318, protein: 22, carbs: 1.4, fat: 25 },
          { name: 'Whole Wheat Roti', quantity: 2, unit: 'piece', grams: 80, calories: 238, protein: 8.4, carbs: 46.5, fat: 2.2 },
          { name: 'Bell Pepper & Onion', quantity: 150, unit: 'g', grams: 150, calories: 45, protein: 1.5, carbs: 9, fat: 0.3 },
          { name: 'Olive Oil / Ghee', quantity: 5, unit: 'g', grams: 5, calories: 45, protein: 0, carbs: 0, fat: 5 },
        ],
        totalNutrients: {
          calories: 646,
          protein: 31.9,
          carbohydrates: 56.9,
          fat: 32.5,
          fiber: 8.2,
        },
        instructions: [
          'Dice paneer, bell pepper, and onions into bite-sized pieces.',
          'Heat oil in a pan, add cumin seeds until aromatic.',
          'Add vegetables and sauté on high heat for 3 minutes.',
          'Add paneer, pinch of turmeric, garam masala, and salt. Toss for 2 minutes.',
          'Serve hot alongside warm whole wheat rotis.',
        ],
        isAIEstimate: true,
      };
    }

    return {
      mealName: 'Grilled Chicken Breast & Herb Quinoa Bowl',
      cuisine: 'Western',
      mealType: params.mealType,
      description: 'Lean marinated chicken breast over fluffy quinoa and steamed broccoli.',
      prepTimeMinutes: 20,
      ingredients: [
        { name: 'Chicken Breast', quantity: 180, unit: 'g', grams: 180, calories: 297, protein: 55.8, carbs: 0, fat: 6.4 },
        { name: 'Quinoa (Cooked)', quantity: 150, unit: 'g', grams: 150, calories: 180, protein: 6.6, carbs: 32, fat: 2.9 },
        { name: 'Steamed Broccoli', quantity: 150, unit: 'g', grams: 150, calories: 51, protein: 4.2, carbs: 10, fat: 0.6 },
        { name: 'Olive Oil', quantity: 5, unit: 'g', grams: 5, calories: 45, protein: 0, carbs: 0, fat: 5 },
      ],
      totalNutrients: {
        calories: 573,
        protein: 66.6,
        carbohydrates: 42,
        fat: 14.9,
        fiber: 6.8,
      },
      instructions: [
        'Season chicken breast with salt, black pepper, and herbs.',
        'Grill for 6-7 minutes per side until internal temperature reaches 165°F (74°C).',
        'Steam broccoli florets until crisp-tender (about 4 minutes).',
        'Assemble cooked quinoa in a bowl, top with sliced chicken breast and broccoli.',
      ],
      isAIEstimate: true,
    };
  }
}
