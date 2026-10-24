// ─────────────────────────────────────────────────────────────
// MyFitAI — AI Nutrition Coach & Meal Generator Modal
// Powered by Google Gemini with live user context, workout integration,
// Indian food intelligence, and one-tap diary logging.
// ─────────────────────────────────────────────────────────────

import { useState } from 'react';
import {
  Bot,
  Sparkles,
  CheckCircle2,
  Apple,
  Send,
  PlusCircle,
  X,
  Loader2,
} from 'lucide-react';
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
      <div className="bg-[#151517] w-full max-w-lg rounded-2xl h-[88vh] max-h-[750px] flex flex-col overflow-hidden border border-[#2A2A2D] shadow-2xl">
        {/* Header */}
        <div className="p-4 border-b border-[#2A2A2D] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#A78BFA]/10 border border-[#A78BFA]/20 flex items-center justify-center text-[#A78BFA]">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-[#F5F5F5]">Gemini Nutrition Intelligence</h3>
              <p className="text-[11px] text-[#A1A1A6]">Live coach & automated meal generation</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-[#1E1E20] border border-[#2A2A2D] flex items-center justify-center text-[#A1A1A6] hover:text-[#F5F5F5] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="grid grid-cols-2 p-2 bg-[#1E1E20] border-b border-[#2A2A2D] gap-1.5 text-xs font-semibold">
          <button
            onClick={() => setActiveTab('coach')}
            className={`py-2 rounded-lg transition-all flex items-center justify-center gap-1.5 min-h-[44px] ${
              activeTab === 'coach'
                ? 'bg-[#30D158] text-black font-bold shadow-sm'
                : 'text-[#A1A1A6] hover:text-[#F5F5F5] hover:bg-[#151517]/50'
            }`}
          >
            <Bot className="w-4 h-4" />
            Nutrition Coach
          </button>
          <button
            onClick={() => setActiveTab('generator')}
            className={`py-2 rounded-lg transition-all flex items-center justify-center gap-1.5 min-h-[44px] ${
              activeTab === 'generator'
                ? 'bg-[#30D158] text-black font-bold shadow-sm'
                : 'text-[#A1A1A6] hover:text-[#F5F5F5] hover:bg-[#151517]/50'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            Meal Generator
          </button>
        </div>

        {/* Tab 1: Coach */}
        {activeTab === 'coach' && (
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Context chip summary */}
            <div className="p-3 bg-[#1E1E20]/50 border-b border-[#2A2A2D] flex items-center justify-between text-[11px] text-[#A1A1A6] overflow-x-auto no-scrollbar whitespace-nowrap">
              <span>Remaining Today: <strong className="text-[#F5F5F5] font-mono tabular-nums">{Math.max(0, context.dailyCalorieTarget - context.caloriesConsumed)} kcal</strong></span>
              <span>•</span>
              <span>Protein Left: <strong className="text-[#F5C542] font-mono tabular-nums">{Math.max(0, context.dailyProteinTarget - context.proteinConsumed)}g</strong></span>
              {context.completedWorkoutToday && (
                <>
                  <span>•</span>
                  <span className="text-[#30D158] flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    {context.completedWorkoutToday.title}
                  </span>
                </>
              )}
            </div>

            {/* Chat Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {chatMessages.length === 0 && (
                <div className="text-center py-8 text-[#A1A1A6]">
                  <div className="w-12 h-12 rounded-xl bg-[#30D158]/10 text-[#30D158] border border-[#30D158]/20 flex items-center justify-center mx-auto mb-3">
                    <Apple className="w-6 h-6" />
                  </div>
                  <h4 className="font-bold text-sm text-[#F5F5F5] mb-1">How can I help your diet today?</h4>
                  <p className="text-xs max-w-xs mx-auto mb-4 text-[#A1A1A6]">
                    I know what you've eaten today and your workout progress. Tap a question or type below.
                  </p>

                  <div className="flex flex-wrap gap-1.5 justify-center">
                    {quickChips.map((chip, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleAsk(chip)}
                        className="px-3 py-1.5 bg-[#1E1E20] hover:bg-[#2A2A2D] rounded-lg text-xs text-[#A1A1A6] hover:text-[#F5F5F5] border border-[#2A2A2D] transition-colors"
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
                    className={`max-w-[85%] rounded-xl p-3 text-xs leading-relaxed ${
                      msg.sender === 'user'
                        ? 'bg-[#30D158] text-black font-semibold'
                        : 'bg-[#1E1E20] text-[#F5F5F5] border border-[#2A2A2D]'
                    }`}
                  >
                    {msg.sender === 'ai' && (
                      <span className="text-[10px] uppercase font-bold text-[#A78BFA] block mb-1">
                        Coach Advice (Estimate)
                      </span>
                    )}
                    {msg.text}
                  </div>
                </div>
              ))}

              {isAsking && (
                <div className="flex justify-start">
                  <div className="bg-[#1E1E20] rounded-xl p-3 text-xs text-[#A1A1A6] flex items-center gap-2 border border-[#2A2A2D]">
                    <Loader2 className="w-4 h-4 text-[#30D158] animate-spin" />
                    <span>Analyzing your nutrition data...</span>
                  </div>
                </div>
              )}
            </div>

            {/* Input Bar */}
            <div className="p-3 bg-[#151517] border-t border-[#2A2A2D] flex gap-2">
              <input
                type="text"
                placeholder="Ask about meals, remaining macros, recipes..."
                value={question}
                onChange={e => setQuestion(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAsk()}
                className="flex-1 bg-[#1E1E20] border border-[#2A2A2D] rounded-xl px-3.5 py-2.5 text-xs text-[#F5F5F5] placeholder-[#A1A1A6]/50 outline-none focus:border-[#30D158]"
              />
              <button
                onClick={() => handleAsk()}
                disabled={!question.trim() || isAsking}
                className="w-10 h-10 rounded-xl bg-[#FF8A00] text-black font-bold flex items-center justify-center disabled:opacity-40 transition-all flex-shrink-0"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Tab 2: Meal Generator */}
        {activeTab === 'generator' && (
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] uppercase font-bold tracking-wider text-[#A1A1A6] block mb-1">
                  Target Calories
                </label>
                <input
                  type="number"
                  min="200"
                  max="2000"
                  step="50"
                  value={genCalories}
                  onChange={e => setGenCalories(parseInt(e.target.value) || 500)}
                  className="w-full bg-[#1E1E20] border border-[#2A2A2D] rounded-xl px-3 py-2 text-xs font-mono font-bold text-[#F5F5F5] outline-none focus:border-[#30D158]"
                />
              </div>

              <div>
                <label className="text-[10px] uppercase font-bold tracking-wider text-[#A1A1A6] block mb-1">
                  Meal Slot
                </label>
                <select
                  value={genMealType}
                  onChange={e => setGenMealType(e.target.value as MealType)}
                  className="w-full bg-[#1E1E20] border border-[#2A2A2D] rounded-xl px-3 py-2 text-xs text-[#F5F5F5] outline-none focus:border-[#30D158]"
                >
                  <option value="Breakfast">Breakfast</option>
                  <option value="Lunch">Lunch</option>
                  <option value="Dinner">Dinner</option>
                  <option value="Snacks">Snacks</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] uppercase font-bold tracking-wider text-[#A1A1A6] block mb-1">
                  Cuisine
                </label>
                <select
                  value={genCuisine}
                  onChange={e => setGenCuisine(e.target.value)}
                  className="w-full bg-[#1E1E20] border border-[#2A2A2D] rounded-xl px-3 py-2 text-xs text-[#F5F5F5] outline-none focus:border-[#30D158]"
                >
                  <option value="South Indian">South Indian</option>
                  <option value="North Indian">North Indian</option>
                  <option value="Mediterranean">Mediterranean</option>
                  <option value="Western">Western / High Protein</option>
                  <option value="Asian">Asian Stir-Fry</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] uppercase font-bold tracking-wider text-[#A1A1A6] block mb-1">
                  Diet Preference
                </label>
                <select
                  value={genDiet}
                  onChange={e => setGenDiet(e.target.value)}
                  className="w-full bg-[#1E1E20] border border-[#2A2A2D] rounded-xl px-3 py-2 text-xs text-[#F5F5F5] outline-none focus:border-[#30D158]"
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
                <label className="text-[10px] uppercase font-bold tracking-wider text-[#A1A1A6] block mb-1">
                  Available Ingredients in Kitchen (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Paneer, Eggs, Oats, Rice, Curd, Spinach"
                  value={genIngredients}
                  onChange={e => setGenIngredients(e.target.value)}
                  className="w-full bg-[#1E1E20] border border-[#2A2A2D] rounded-xl px-3 py-2 text-xs text-[#F5F5F5] placeholder-[#A1A1A6]/50 outline-none focus:border-[#30D158]"
                />
              </div>
            </div>

            <button
              onClick={handleGenerate}
              disabled={isGenerating}
              className="w-full min-h-[44px] py-3 px-4 rounded-xl bg-[#FF8A00] hover:bg-[#FF8A00]/90 text-black font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 disabled:opacity-50 transition-all shadow-sm"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Generating Structured Meal...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  Generate Meal Plan
                </>
              )}
            </button>

            {/* Generated Meal Result */}
            {generatedMeal && (
              <div className="bg-[#1E1E20] p-4 rounded-xl border border-[#2A2A2D] space-y-3 animate-fade-in">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-[#A78BFA] tracking-wider">AI Generated Meal</span>
                    <h4 className="font-bold text-base text-[#F5F5F5] mt-0.5">
                      {generatedMeal.mealName}
                    </h4>
                    <p className="text-xs text-[#A1A1A6] mt-1">{generatedMeal.description}</p>
                  </div>
                  <span className="font-mono font-black text-lg text-[#F5F5F5] flex-shrink-0 tabular-nums">
                    {generatedMeal.totalNutrients.calories} <span className="text-xs text-[#A1A1A6] font-normal">kcal</span>
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 text-center text-xs">
                  <div className="bg-[#151517] p-2 rounded-lg border border-[#2A2A2D]">
                    <span className="text-[9px] text-[#F5C542] font-bold block uppercase">Protein</span>
                    <span className="font-mono font-bold text-[#F5F5F5] tabular-nums">{generatedMeal.totalNutrients.protein}g</span>
                  </div>
                  <div className="bg-[#151517] p-2 rounded-lg border border-[#2A2A2D]">
                    <span className="text-[9px] text-[#4F9CF9] font-bold block uppercase">Carbs</span>
                    <span className="font-mono font-bold text-[#F5F5F5] tabular-nums">{generatedMeal.totalNutrients.carbohydrates}g</span>
                  </div>
                  <div className="bg-[#151517] p-2 rounded-lg border border-[#2A2A2D]">
                    <span className="text-[9px] text-[#FF453A] font-bold block uppercase">Fat</span>
                    <span className="font-mono font-bold text-[#F5F5F5] tabular-nums">{generatedMeal.totalNutrients.fat}g</span>
                  </div>
                </div>

                {/* Ingredients preview */}
                <div className="space-y-1">
                  <p className="text-[10px] uppercase font-bold text-[#A1A1A6]">Ingredients:</p>
                  {generatedMeal.ingredients.map((ing, i) => (
                    <div key={i} className="flex justify-between text-xs py-1 border-b border-[#2A2A2D]">
                      <span className="text-[#F5F5F5]">{ing.name} ({ing.quantity}{ing.unit})</span>
                      <span className="text-[#A1A1A6] font-mono tabular-nums">{ing.calories} kcal ({ing.protein}g P)</span>
                    </div>
                  ))}
                </div>

                {/* Instructions */}
                <div className="space-y-1">
                  <p className="text-[10px] uppercase font-bold text-[#A1A1A6]">Instructions:</p>
                  <ol className="list-decimal list-inside text-xs text-[#A1A1A6] space-y-1">
                    {generatedMeal.instructions.map((step, i) => (
                      <li key={i}>{step}</li>
                    ))}
                  </ol>
                </div>

                <button
                  onClick={handleLogMeal}
                  disabled={isLoggingMeal}
                  className="w-full min-h-[44px] py-2.5 px-4 rounded-xl bg-[#30D158] text-black font-bold text-xs uppercase tracking-wide flex items-center justify-center gap-1.5 transition-all active:scale-[0.99] disabled:opacity-50"
                >
                  {isLoggingMeal ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <PlusCircle className="w-4 h-4" />
                  )}
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
