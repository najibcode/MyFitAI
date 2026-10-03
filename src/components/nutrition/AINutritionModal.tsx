// ─────────────────────────────────────────────────────────────
// MyFitAI — AI Nutrition Coach & Meal Generator Modal
// Powered by Google Gemini with live user context, workout integration,
// Indian food intelligence, and one-tap diary logging.
// ─────────────────────────────────────────────────────────────

import { useState } from 'react';
import type { AINutritionContext, GeneratedMealPlan } from '../../services/nutrition/aiNutrition';
import { askNutritionCoach, generateAIMeal } from '../../services/nutrition/aiNutrition';
import type { MealType } from '../../types/nutrition';

interface AINutritionModalProps {
  isOpen: boolean;
  onClose: () => void;
  context: AINutritionContext;
  onLogGeneratedMeal: (meal: GeneratedMealPlan) => Promise<any>;
}

export default function AINutritionModal({
  isOpen,
  onClose,
  context,
  onLogGeneratedMeal,
}: AINutritionModalProps) {
  const [activeTab, setActiveTab] = useState<'coach' | 'generator'>('coach');

  // Coach state
  const [question, setQuestion] = useState('');
  const [chatMessages, setChatMessages] = useState<Array<{ sender: 'user' | 'ai'; text: string }>>([]);
  const [isAsking, setIsAsking] = useState(false);

  // Generator state
  const [genCalories, setGenCalories] = useState<number>(Math.max(400, context.dailyCalorieTarget - context.caloriesConsumed));
  const [genMealType, setGenMealType] = useState<MealType>('Dinner');
  const [genCuisine, setGenCuisine] = useState<string>('South Indian');
  const [genDiet, setGenDiet] = useState<string>('Vegetarian');
  const [genIngredients, setGenIngredients] = useState<string>('Paneer, Rice, Vegetables');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedMeal, setGeneratedMeal] = useState<GeneratedMealPlan | null>(null);
  const [isLoggingMeal, setIsLoggingMeal] = useState(false);

  if (!isOpen) return null;

  const quickChips = [
    'What should I eat for dinner?',
    'How much protein do I have left?',
    'Give me a 500 kcal vegetarian meal',
    'Suggest a South Indian high-protein breakfast',
    'Replace chicken with a vegetarian option',
  ];

  const handleAsk = async (textToAsk?: string) => {
    const q = textToAsk || question;
    if (!q.trim()) return;

    const userMsg = q.trim();
    setQuestion('');
    setChatMessages(prev => [...prev, { sender: 'user', text: userMsg }]);
    setIsAsking(true);

    try {
      const answer = await askNutritionCoach(userMsg, context);
      setChatMessages(prev => [...prev, { sender: 'ai', text: answer }]);
    } catch {
      setChatMessages(prev => [
        ...prev,
        { sender: 'ai', text: 'Sorry, I had trouble analyzing your nutrition data. Please check your connection and try again.' },
      ]);
    } finally {
      setIsAsking(false);
    }
  };

  const handleGenerate = async () => {
    setIsGenerating(true);
    setGeneratedMeal(null);
    try {
      const meal = await generateAIMeal({
        targetCalories: genCalories || 500,
        mealType: genMealType,
        cuisine: genCuisine,
        dietPreference: genDiet,
        availableIngredients: genIngredients.trim() || undefined,
      });
      setGeneratedMeal(meal);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleLogMeal = async () => {
    if (!generatedMeal) return;
    setIsLoggingMeal(true);
    try {
      await onLogGeneratedMeal(generatedMeal);
      onClose();
    } finally {
      setIsLoggingMeal(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-fade-in">
      <div className="bg-[var(--color-surface-container)] w-full max-w-lg rounded-3xl h-[88vh] max-h-[750px] flex flex-col overflow-hidden border border-white/10 shadow-2xl">
        {/* Header */}
        <div className="p-4 border-b border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-primary to-amber-500 flex items-center justify-center text-black font-black text-sm">
              AI
            </div>
            <div>
              <h3 className="font-headline font-bold text-base text-on-surface">Gemini Nutrition Intelligence</h3>
              <p className="text-[11px] text-on-surface-variant">Live coach & automated meal generation</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-on-surface-variant hover:text-on-surface"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="grid grid-cols-2 p-2 bg-[var(--color-surface-container-high)] border-b border-white/5 gap-1.5 text-xs font-bold">
          <button
            onClick={() => setActiveTab('coach')}
            className={`py-2 rounded-xl transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'coach'
                ? 'bg-primary text-black shadow-md'
                : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            <span className="material-symbols-outlined text-[18px]">support_agent</span>
            Nutrition Coach
          </button>
          <button
            onClick={() => setActiveTab('generator')}
            className={`py-2 rounded-xl transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'generator'
                ? 'bg-primary text-black shadow-md'
                : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            <span className="material-symbols-outlined text-[18px]">auto_awesome</span>
            Meal Generator
          </button>
        </div>

        {/* Tab 1: Coach */}
        {activeTab === 'coach' && (
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Context chip summary */}
            <div className="p-3 bg-white/[0.02] border-b border-white/5 flex items-center justify-between text-[11px] text-on-surface-variant overflow-x-auto no-scrollbar whitespace-nowrap">
              <span>Remaining Today: <strong className="text-on-surface">{Math.max(0, context.dailyCalorieTarget - context.caloriesConsumed)} kcal</strong></span>
              <span>•</span>
              <span>Protein Left: <strong className="text-amber-400">{Math.max(0, context.dailyProteinTarget - context.proteinConsumed)}g</strong></span>
              {context.completedWorkoutToday && (
                <>
                  <span>•</span>
                  <span className="text-emerald-400 flex items-center gap-1">
                    <span className="material-symbols-outlined text-[14px]">check_circle</span>
                    {context.completedWorkoutToday.title}
                  </span>
                </>
              )}
            </div>

            {/* Chat Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {chatMessages.length === 0 && (
                <div className="text-center py-8 text-on-surface-variant">
                  <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto mb-3">
                    <span className="material-symbols-outlined text-2xl">nutrition</span>
                  </div>
                  <h4 className="font-bold text-sm text-on-surface mb-1">How can I help your diet today?</h4>
                  <p className="text-xs max-w-xs mx-auto mb-4">
                    I know what you've eaten today and your workout progress. Tap a question or type below.
                  </p>

                  <div className="flex flex-wrap gap-1.5 justify-center">
                    {quickChips.map((chip, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleAsk(chip)}
                        className="px-3 py-1.5 bg-white/5 hover:bg-white/10 rounded-full text-xs text-on-surface-variant hover:text-on-surface border border-white/5 transition-colors"
                      >
                        {chip}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {chatMessages.map((msg, idx) => (
                <div
                  key={idx}
                  className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl p-3 text-xs leading-relaxed ${
                      msg.sender === 'user'
                        ? 'bg-primary text-black font-medium'
                        : 'bg-[var(--color-surface-container-high)] text-on-surface border border-white/5'
                    }`}
                  >
                    {msg.sender === 'ai' && (
                      <span className="text-[10px] uppercase font-bold text-primary block mb-1">
                        Coach Advice (Estimate)
                      </span>
                    )}
                    {msg.text}
                  </div>
                </div>
              ))}

              {isAsking && (
                <div className="flex justify-start">
                  <div className="bg-[var(--color-surface-container-high)] rounded-2xl p-3 text-xs text-on-surface-variant flex items-center gap-2 border border-white/5">
                    <div className="w-4 h-4 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                    <span>Analyzing your nutrition data...</span>
                  </div>
                </div>
              )}
            </div>

            {/* Input Bar */}
            <div className="p-3 bg-[var(--color-surface-container)] border-t border-white/5 flex gap-2">
              <input
                type="text"
                placeholder="Ask about meals, remaining macros, recipes..."
                value={question}
                onChange={e => setQuestion(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAsk()}
                className="flex-1 bg-[var(--color-surface-container-high)] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-on-surface outline-none focus:border-primary"
              />
              <button
                onClick={() => handleAsk()}
                disabled={!question.trim() || isAsking}
                className="w-10 h-10 rounded-xl bg-primary text-black flex items-center justify-center disabled:opacity-50 transition-all flex-shrink-0"
              >
                <span className="material-symbols-outlined text-[18px]">send</span>
              </button>
            </div>
          </div>
        )}

        {/* Tab 2: Meal Generator */}
        {activeTab === 'generator' && (
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] uppercase font-bold tracking-wider text-on-surface-variant block mb-1">
                  Target Calories
                </label>
                <input
                  type="number"
                  min="200"
                  max="2000"
                  step="50"
                  value={genCalories}
                  onChange={e => setGenCalories(parseInt(e.target.value) || 500)}
                  className="w-full bg-[var(--color-surface-container-high)] border border-white/10 rounded-xl px-3 py-2 text-xs font-bold text-on-surface outline-none"
                />
              </div>

              <div>
                <label className="text-[10px] uppercase font-bold tracking-wider text-on-surface-variant block mb-1">
                  Meal Slot
                </label>
                <select
                  value={genMealType}
                  onChange={e => setGenMealType(e.target.value as MealType)}
                  className="w-full bg-[var(--color-surface-container-high)] border border-white/10 rounded-xl px-3 py-2 text-xs text-on-surface outline-none"
                >
                  <option value="Breakfast">Breakfast</option>
                  <option value="Lunch">Lunch</option>
                  <option value="Dinner">Dinner</option>
                  <option value="Snacks">Snacks</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] uppercase font-bold tracking-wider text-on-surface-variant block mb-1">
                  Cuisine
                </label>
                <select
                  value={genCuisine}
                  onChange={e => setGenCuisine(e.target.value)}
                  className="w-full bg-[var(--color-surface-container-high)] border border-white/10 rounded-xl px-3 py-2 text-xs text-on-surface outline-none"
                >
                  <option value="South Indian">South Indian</option>
                  <option value="North Indian">North Indian</option>
                  <option value="Mediterranean">Mediterranean</option>
                  <option value="Western">Western / High Protein</option>
                  <option value="Asian">Asian Stir-Fry</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] uppercase font-bold tracking-wider text-on-surface-variant block mb-1">
                  Diet Preference
                </label>
                <select
                  value={genDiet}
                  onChange={e => setGenDiet(e.target.value)}
                  className="w-full bg-[var(--color-surface-container-high)] border border-white/10 rounded-xl px-3 py-2 text-xs text-on-surface outline-none"
                >
                  <option value="Vegetarian">Vegetarian</option>
                  <option value="Non-Vegetarian">Non-Vegetarian</option>
                  <option value="Eggetarian">Eggetarian</option>
                  <option value="Vegan">Vegan</option>
                  <option value="High-Protein">High-Protein</option>
                  <option value="Low-Carb">Low-Carb</option>
                </select>
              </div>

              <div className="col-span-2">
                <label className="text-[10px] uppercase font-bold tracking-wider text-on-surface-variant block mb-1">
                  Available Ingredients in Kitchen (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Paneer, Eggs, Oats, Rice, Curd, Spinach"
                  value={genIngredients}
                  onChange={e => setGenIngredients(e.target.value)}
                  className="w-full bg-[var(--color-surface-container-high)] border border-white/10 rounded-xl px-3 py-2 text-xs text-on-surface outline-none"
                />
              </div>
            </div>

            <button
              onClick={handleGenerate}
              disabled={isGenerating}
              className="w-full py-3 px-4 rounded-2xl bg-primary hover:bg-primary/90 text-black font-headline font-bold text-xs uppercase tracking-wider shadow-lg shadow-primary/20 flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <span className="material-symbols-outlined text-[18px]">auto_awesome</span>
              {isGenerating ? 'Generating Structured Meal...' : 'Generate Meal Plan'}
            </button>

            {/* Generated Meal Result */}
            {generatedMeal && (
              <div className="bg-[var(--color-surface-container-high)] p-4 rounded-2xl border border-primary/20 space-y-3 animate-fade-in">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-primary">AI Generated Meal</span>
                    <h4 className="font-headline font-bold text-base text-on-surface mt-0.5">
                      {generatedMeal.mealName}
                    </h4>
                    <p className="text-xs text-on-surface-variant mt-1">{generatedMeal.description}</p>
                  </div>
                  <span className="font-headline font-black text-lg text-on-surface flex-shrink-0">
                    {generatedMeal.totalNutrients.calories} <span className="text-xs text-on-surface-variant font-normal">kcal</span>
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 text-center text-xs">
                  <div className="bg-black/20 p-1.5 rounded-lg">
                    <span className="text-[9px] text-amber-400 font-bold block">Protein</span>
                    <span className="font-bold text-on-surface">{generatedMeal.totalNutrients.protein}g</span>
                  </div>
                  <div className="bg-black/20 p-1.5 rounded-lg">
                    <span className="text-[9px] text-sky-400 font-bold block">Carbs</span>
                    <span className="font-bold text-on-surface">{generatedMeal.totalNutrients.carbohydrates}g</span>
                  </div>
                  <div className="bg-black/20 p-1.5 rounded-lg">
                    <span className="text-[9px] text-rose-400 font-bold block">Fat</span>
                    <span className="font-bold text-on-surface">{generatedMeal.totalNutrients.fat}g</span>
                  </div>
                </div>

                {/* Ingredients preview */}
                <div className="space-y-1">
                  <p className="text-[10px] uppercase font-bold text-on-surface-variant">Ingredients:</p>
                  {generatedMeal.ingredients.map((ing, i) => (
                    <div key={i} className="flex justify-between text-xs py-0.5 border-b border-white/[0.03]">
                      <span className="text-on-surface">{ing.name} ({ing.quantity}{ing.unit})</span>
                      <span className="text-on-surface-variant">{ing.calories} kcal ({ing.protein}g P)</span>
                    </div>
                  ))}
                </div>

                {/* Instructions */}
                <div className="space-y-1">
                  <p className="text-[10px] uppercase font-bold text-on-surface-variant">Instructions:</p>
                  <ol className="list-decimal list-inside text-xs text-on-surface-variant space-y-1">
                    {generatedMeal.instructions.map((step, i) => (
                      <li key={i}>{step}</li>
                    ))}
                  </ol>
                </div>

                <button
                  onClick={handleLogMeal}
                  disabled={isLoggingMeal}
                  className="w-full py-2.5 px-4 rounded-xl bg-primary text-black font-bold text-xs uppercase tracking-wide shadow-md flex items-center justify-center gap-1.5"
                >
                  <span className="material-symbols-outlined text-[16px]">add_circle</span>
                  Log this Meal to {generatedMeal.mealType}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
