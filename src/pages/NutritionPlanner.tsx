// ─────────────────────────────────────────────────────────────
// MyFitAI — Complete Nutrition & Food Tracking Engine
// Cleanroom, production-grade implementation featuring:
// - Multi-provider food search & barcode scanning
// - Calorie, macro & micronutrient tracking (IOM DRI standards)
// - Workout-aware calorie expenditure adjustment
// - Fasting timer & protocols
// - Indian Food composition (ICMR-NIN IFCT 2017)
// - Recipes, Custom Foods, Meal Templates, Quick Add
// - AI Nutrition Coach & Meal Generation (Gemini)
// - Trends, Analytics, Streaks & Interactive Calendar
// - Offline-first IndexedDB storage & JSON/CSV import-export
// ─────────────────────────────────────────────────────────────

import { useState, useMemo } from 'react';
import { useNutrition } from '../context/NutritionContext';
import { useFitnessContext } from '../context/FitnessContext';
import { useToast } from '../context/ToastContext';
import type { FoodItem, MealType } from '../types/nutrition';
import { INDIAN_DISHES } from '../data/indianDishes';

// Modals
import FoodSearchModal from '../components/nutrition/FoodSearchModal';
import BarcodeScannerModal from '../components/nutrition/BarcodeScannerModal';
import FoodDetailModal from '../components/nutrition/FoodDetailModal';
import QuickAddModal from '../components/nutrition/QuickAddModal';
import CustomFoodModal from '../components/nutrition/CustomFoodModal';
import RecipeBuilderModal from '../components/nutrition/RecipeBuilderModal';
import AINutritionModal from '../components/nutrition/AINutritionModal';
import MicronutrientsModal from '../components/nutrition/MicronutrientsModal';
import FastingWidget from '../components/nutrition/FastingWidget';
import NutritionAnalyticsView from '../components/nutrition/NutritionAnalyticsView';
import NutritionAttributionModal from '../components/nutrition/NutritionAttributionModal';
import NutritionExportImportModal from '../components/nutrition/NutritionExportImportModal';

type MainTab = 'diary' | 'kitchen' | 'analytics' | 'supplements';

export default function NutritionPlanner() {
  const {
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
    duplicateEntry,
    saveMealAsTemplate,
    recipes,
    saveRecipe,
    deleteRecipe,
    logRecipeToMeal,
    saveCustomFood,
    waterLogsForDate,
    waterConsumedMl,
    logWater,
    undoWater,
    weightLogs,
    activeFast,
    startFast,
    finishFast,
    cancelFast,
    nutritionTarget,
    toggleIncludeExerciseCalories,
    loggingStreak,
    isOnline,
    refreshData,
  } = useNutrition();

  const {
    profile,
    dailyStats,
    supplements,
    toggleSupplement,
    addSupplement,
    removeSupplement,
    groceryItems,
    addGroceryItem,
    removeGroceryItem,
    toggleGroceryItem,
    clearCheckedGroceries,
  } = useFitnessContext();

  const { showToast } = useToast();

  // Active top tab
  const [activeTab, setActiveTab] = useState<MainTab>('diary');

  // Modals state
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchMealType, setSearchMealType] = useState<MealType>('Lunch');
  const [isBarcodeOpen, setIsBarcodeOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [selectedFoodForDetail, setSelectedFoodForDetail] = useState<FoodItem | null>(null);
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);
  const [isCustomFoodOpen, setIsCustomFoodOpen] = useState(false);
  const [initialBarcodeForCustom, setInitialBarcodeForCustom] = useState('');
  const [isRecipeBuilderOpen, setIsRecipeBuilderOpen] = useState(false);
  const [isAIOpen, setIsAIOpen] = useState(false);
  const [isMicrosOpen, setIsMicrosOpen] = useState(false);
  const [isSourcesOpen, setIsSourcesOpen] = useState(false);
  const [isExportImportOpen, setIsExportImportOpen] = useState(false);

  // Template prompt state
  const [templatePromptMeal, setTemplatePromptMeal] = useState<MealType | null>(null);
  const [templateName, setTemplateName] = useState('');

  // Kitchen explorer state
  const [kitchenSearch, setKitchenSearch] = useState('');

  // Supplements form state
  const [newSupName, setNewSupName] = useState('');
  const [newSupTime, setNewSupTime] = useState('Morning');
  const [showAddSup, setShowAddSup] = useState(false);

  // Grocery form state
  const [newGroceryName, setNewGroceryName] = useState('');
  const [newGroceryCat, setNewGroceryCat] = useState('Proteins');
  const [showAddGrocery, setShowAddGrocery] = useState(false);

  // Date formatting
  const formattedDate = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    if (selectedDate === today) return 'Today';
    const d = new Date(selectedDate);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', weekday: 'short' });
  }, [selectedDate]);

  // Open food search for a specific meal
  const openSearchForMeal = (meal: MealType) => {
    setSearchMealType(meal);
    setIsSearchOpen(true);
  };

  const handleSelectFoodFromSearch = (food: FoodItem) => {
    setIsSearchOpen(false);
    setSelectedFoodForDetail(food);
    setIsDetailOpen(true);
  };

  const handleFoodFoundFromBarcode = (food: FoodItem) => {
    setIsBarcodeOpen(false);
    setSelectedFoodForDetail(food);
    setIsDetailOpen(true);
  };

  const handleCreateCustomWithBarcode = (barcode: string) => {
    setInitialBarcodeForCustom(barcode);
    setIsCustomFoodOpen(true);
  };

  const handleSaveMealTemplate = async () => {
    if (!templatePromptMeal) return;
    const name = templateName.trim() || `${templatePromptMeal} Favorite`;
    const res = await saveMealAsTemplate(name, templatePromptMeal);
    if (res) {
      showToast(`Saved template "${res.name}"!`, 'success');
    }
    setTemplatePromptMeal(null);
    setTemplateName('');
  };

  // Water quick adds
  const handleAddWater = (ml: number) => {
    logWater(ml, selectedDate);
    showToast(`+${ml >= 1000 ? `${ml / 1000}L` : `${ml}ml`} water logged!`, 'success');
  };

  // Copy grocery list
  const shareGroceryList = () => {
    const cats = [...new Set(groceryItems.map(g => g.category))];
    const list = cats
      .map(c => `${c}: ${groceryItems.filter(g => g.category === c && !g.checked).map(g => g.name).join(', ')}`)
      .filter(l => l.split(': ')[1])
      .join('\n');
    navigator.clipboard.writeText(list || 'No items');
    showToast('Grocery list copied!', 'success');
  };

  return (
    <main className="pt-4 pb-36 px-4 max-w-lg mx-auto space-y-5 min-h-screen">
      {/* ── Top Bar & Status Header ── */}
      <section className="flex items-center justify-between pt-1">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-primary text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>
            restaurant
          </span>
          <h1 className="font-headline font-black text-2xl tracking-tight text-on-surface">Nutrition Engine</h1>
        </div>

        <div className="flex items-center gap-1.5">
          {/* Offline/Online Badge */}
          <span
            className={`flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
              isOnline
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
            }`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-emerald-400' : 'bg-amber-400'}`} />
            {isOnline ? 'Cloud' : 'Offline'}
          </span>

          {/* Quick Actions Dropdown / Icon Buttons */}
          <button
            onClick={() => setIsAIOpen(true)}
            className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-amber-500 text-black flex items-center justify-center font-bold text-xs shadow-md active:scale-95 transition-all"
            title="AI Nutrition Coach"
          >
            AI
          </button>
          <button
            onClick={() => setIsExportImportOpen(true)}
            className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-on-surface-variant hover:text-on-surface"
            title="Import/Export Backup"
          >
            <span className="material-symbols-outlined text-[18px]">import_export</span>
          </button>
          <button
            onClick={() => setIsSourcesOpen(true)}
            className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-on-surface-variant hover:text-on-surface"
            title="Data Sources & Attribution"
          >
            <span className="material-symbols-outlined text-[18px]">info</span>
          </button>
        </div>
      </section>

      {/* ── Main Tab Navigation Bar ── */}
      <section className="flex bg-[var(--color-surface-container)] p-1 rounded-2xl border border-white/5 text-xs font-bold">
        <button
          onClick={() => setActiveTab('diary')}
          className={`flex-1 py-2 rounded-xl transition-all flex items-center justify-center gap-1.5 ${
            activeTab === 'diary'
              ? 'bg-primary text-black shadow-md shadow-primary/20'
              : 'text-on-surface-variant hover:text-on-surface'
          }`}
        >
          <span className="material-symbols-outlined text-[18px]">edit_calendar</span>
          Diary
        </button>
        <button
          onClick={() => setActiveTab('kitchen')}
          className={`flex-1 py-2 rounded-xl transition-all flex items-center justify-center gap-1.5 ${
            activeTab === 'kitchen'
              ? 'bg-primary text-black shadow-md shadow-primary/20'
              : 'text-on-surface-variant hover:text-on-surface'
          }`}
        >
          <span className="material-symbols-outlined text-[18px]">skillet</span>
          Recipes
        </button>
        <button
          onClick={() => setActiveTab('analytics')}
          className={`flex-1 py-2 rounded-xl transition-all flex items-center justify-center gap-1.5 ${
            activeTab === 'analytics'
              ? 'bg-primary text-black shadow-md shadow-primary/20'
              : 'text-on-surface-variant hover:text-on-surface'
          }`}
        >
          <span className="material-symbols-outlined text-[18px]">analytics</span>
          Trends
        </button>
        <button
          onClick={() => setActiveTab('supplements')}
          className={`flex-1 py-2 rounded-xl transition-all flex items-center justify-center gap-1.5 ${
            activeTab === 'supplements'
              ? 'bg-primary text-black shadow-md shadow-primary/20'
              : 'text-on-surface-variant hover:text-on-surface'
          }`}
        >
          <span className="material-symbols-outlined text-[18px]">medication</span>
          Supps
        </button>
      </section>

      {/* ═════════════════════════════════════════════════════════
          TAB 1: DIARY
         ═════════════════════════════════════════════════════════ */}
      {activeTab === 'diary' && (
        <div className="space-y-5 animate-fade-in">
          {/* Date Selector Banner */}
          <div className="bg-[var(--color-surface-container)] rounded-2xl p-2.5 px-4 flex items-center justify-between border border-white/5">
            <button
              onClick={goToPreviousDay}
              className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-on-surface-variant hover:text-on-surface"
            >
              <span className="material-symbols-outlined text-[18px]">chevron_left</span>
            </button>

            <button
              onClick={goToToday}
              className="text-center group"
            >
              <span className="font-headline font-black text-sm text-on-surface block group-hover:text-primary transition-colors">
                {formattedDate}
              </span>
              <span className="text-[10px] text-on-surface-variant">{selectedDate}</span>
            </button>

            <button
              onClick={goToNextDay}
              className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-on-surface-variant hover:text-on-surface"
            >
              <span className="material-symbols-outlined text-[18px]">chevron_right</span>
            </button>
          </div>

          {/* Quick Logging Action Bar */}
          <div className="grid grid-cols-4 gap-2">
            <button
              onClick={() => openSearchForMeal('Lunch')}
              className="p-3 bg-[var(--color-surface-container)] hover:bg-[var(--color-surface-container-high)] rounded-2xl border border-white/5 text-center flex flex-col items-center gap-1 active:scale-95 transition-all"
            >
              <span className="material-symbols-outlined text-primary text-xl">search</span>
              <span className="text-[10px] font-bold text-on-surface">Search</span>
            </button>
            <button
              onClick={() => setIsBarcodeOpen(true)}
              className="p-3 bg-[var(--color-surface-container)] hover:bg-[var(--color-surface-container-high)] rounded-2xl border border-white/5 text-center flex flex-col items-center gap-1 active:scale-95 transition-all"
            >
              <span className="material-symbols-outlined text-sky-400 text-xl">barcode_scanner</span>
              <span className="text-[10px] font-bold text-on-surface">Barcode</span>
            </button>
            <button
              onClick={() => setIsQuickAddOpen(true)}
              className="p-3 bg-[var(--color-surface-container)] hover:bg-[var(--color-surface-container-high)] rounded-2xl border border-white/5 text-center flex flex-col items-center gap-1 active:scale-95 transition-all"
            >
              <span className="material-symbols-outlined text-amber-400 text-xl">bolt</span>
              <span className="text-[10px] font-bold text-on-surface">Quick Add</span>
            </button>
            <button
              onClick={() => setIsAIOpen(true)}
              className="p-3 bg-[var(--color-surface-container)] hover:bg-[var(--color-surface-container-high)] rounded-2xl border border-white/5 text-center flex flex-col items-center gap-1 active:scale-95 transition-all"
            >
              <span className="material-symbols-outlined text-emerald-400 text-xl">auto_awesome</span>
              <span className="text-[10px] font-bold text-on-surface">AI Coach</span>
            </button>
          </div>

          {/* Calorie & Energy Hero Card */}
          <section className="bg-[var(--color-surface-container)] rounded-3xl p-6 relative overflow-hidden border border-white/5 shadow-xl">
            <div className="absolute -top-24 -right-24 w-60 h-60 bg-primary/10 rounded-full blur-[80px] pointer-events-none" />

            <div className="flex items-start justify-between relative z-10 mb-4">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-widest text-on-surface-variant">
                  Calories Remaining
                </p>
                <div className="flex items-baseline gap-2 mt-1">
                  <h2 className="font-headline font-black text-5xl text-primary tracking-tight">
                    {dailySummary.caloriesRemaining}
                  </h2>
                  <span className="text-xs font-semibold text-on-surface-variant">
                    / {dailySummary.calorieBudget} kcal
                  </span>
                </div>
              </div>

              {/* Logging streak chip */}
              <div className="text-right">
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 text-xs font-bold">
                  <span className="material-symbols-outlined text-[16px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                    local_fire_department
                  </span>
                  {loggingStreak} Day Streak
                </span>
              </div>
            </div>

            {/* Calorie progress bar */}
            <div className="w-full bg-black/20 h-3 rounded-full overflow-hidden mb-3 relative z-10">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  dailySummary.caloriesConsumed > dailySummary.calorieBudget
                    ? 'bg-rose-400'
                    : 'bg-primary'
                }`}
                style={{
                  width: `${Math.min(100, (dailySummary.caloriesConsumed / (dailySummary.calorieBudget || 1)) * 100)}%`,
                }}
              />
            </div>

            {/* Calorie Breakdown Row */}
            <div className="flex items-center justify-between text-xs text-on-surface-variant relative z-10 pt-1">
              <span>Consumed: <strong className="text-on-surface">{dailySummary.caloriesConsumed} kcal</strong></span>
              <span>Target: <strong className="text-on-surface">{nutritionTarget.dailyCalories} kcal</strong></span>
              {dailyStats.calories > 0 && (
                <span className="text-emerald-400">
                  +{dailyStats.calories} burned
                </span>
              )}
            </div>

            {/* Exercise calorie adjustment toggle */}
            {dailyStats.calories > 0 && (
              <div className="mt-3 pt-3 border-t border-white/[0.04] flex items-center justify-between text-xs relative z-10">
                <span className="text-on-surface-variant">Include exercise burn in budget:</span>
                <button
                  onClick={toggleIncludeExerciseCalories}
                  className={`px-2.5 py-0.5 rounded-full font-bold text-[10px] uppercase transition-all ${
                    nutritionTarget.includeExerciseInBudget
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                      : 'bg-white/5 text-on-surface-variant'
                  }`}
                >
                  {nutritionTarget.includeExerciseInBudget ? 'Enabled' : 'Disabled'}
                </button>
              </div>
            )}
          </section>

          {/* Macro Progress Cards */}
          <section className="grid grid-cols-4 gap-2">
            {/* Protein */}
            <div className="bg-[var(--color-surface-container)] p-3 rounded-2xl border border-white/5 text-center">
              <span className="text-[10px] uppercase font-bold text-amber-400 block mb-1">Protein</span>
              <span className="font-headline font-black text-lg text-on-surface block leading-none">
                {dailySummary.proteinConsumed}g
              </span>
              <span className="text-[10px] text-on-surface-variant block mt-1">/ {nutritionTarget.proteinGrams}g</span>
              <div className="w-full bg-black/20 h-1.5 rounded-full overflow-hidden mt-2">
                <div
                  className="bg-amber-400 h-full rounded-full transition-all"
                  style={{ width: `${Math.min(100, (dailySummary.proteinConsumed / nutritionTarget.proteinGrams) * 100)}%` }}
                />
              </div>
            </div>

            {/* Carbs */}
            <div className="bg-[var(--color-surface-container)] p-3 rounded-2xl border border-white/5 text-center">
              <span className="text-[10px] uppercase font-bold text-sky-400 block mb-1">Carbs</span>
              <span className="font-headline font-black text-lg text-on-surface block leading-none">
                {dailySummary.carbsConsumed}g
              </span>
              <span className="text-[10px] text-on-surface-variant block mt-1">/ {nutritionTarget.carbsGrams}g</span>
              <div className="w-full bg-black/20 h-1.5 rounded-full overflow-hidden mt-2">
                <div
                  className="bg-sky-400 h-full rounded-full transition-all"
                  style={{ width: `${Math.min(100, (dailySummary.carbsConsumed / nutritionTarget.carbsGrams) * 100)}%` }}
                />
              </div>
            </div>

            {/* Fat */}
            <div className="bg-[var(--color-surface-container)] p-3 rounded-2xl border border-white/5 text-center">
              <span className="text-[10px] uppercase font-bold text-rose-400 block mb-1">Fat</span>
              <span className="font-headline font-black text-lg text-on-surface block leading-none">
                {dailySummary.fatConsumed}g
              </span>
              <span className="text-[10px] text-on-surface-variant block mt-1">/ {nutritionTarget.fatGrams}g</span>
              <div className="w-full bg-black/20 h-1.5 rounded-full overflow-hidden mt-2">
                <div
                  className="bg-rose-400 h-full rounded-full transition-all"
                  style={{ width: `${Math.min(100, (dailySummary.fatConsumed / nutritionTarget.fatGrams) * 100)}%` }}
                />
              </div>
            </div>

            {/* Fiber */}
            <div className="bg-[var(--color-surface-container)] p-3 rounded-2xl border border-white/5 text-center">
              <span className="text-[10px] uppercase font-bold text-emerald-400 block mb-1">Fiber</span>
              <span className="font-headline font-black text-lg text-on-surface block leading-none">
                {dailySummary.fiberConsumed}g
              </span>
              <span className="text-[10px] text-on-surface-variant block mt-1">/ {nutritionTarget.fiberGrams}g</span>
              <div className="w-full bg-black/20 h-1.5 rounded-full overflow-hidden mt-2">
                <div
                  className="bg-emerald-400 h-full rounded-full transition-all"
                  style={{ width: `${Math.min(100, (dailySummary.fiberConsumed / nutritionTarget.fiberGrams) * 100)}%` }}
                />
              </div>
            </div>
          </section>

          {/* Micronutrient Drawer Trigger */}
          <button
            onClick={() => setIsMicrosOpen(true)}
            className="w-full py-2.5 px-4 bg-[var(--color-surface-container)] hover:bg-[var(--color-surface-container-high)] rounded-2xl border border-white/5 flex items-center justify-between text-xs font-semibold text-on-surface transition-colors"
          >
            <span className="flex items-center gap-2">
              <span className="material-symbols-outlined text-emerald-400 text-[18px]">biotech</span>
              View Micronutrients (IOM Reference Comparison)
            </span>
            <span className="material-symbols-outlined text-[18px] text-on-surface-variant">chevron_right</span>
          </button>

          {/* ── Meal Diary Sections ── */}
          <section className="space-y-4">
            {(['Breakfast', 'Lunch', 'Dinner', 'Snacks'] as MealType[]).map(meal => {
              const items = entriesByMeal[meal] || [];
              const totalMealCals = items.reduce((s, e) => s + e.nutrients.calories, 0);
              const mealTarget = nutritionTarget.mealTargets[meal] || 500;

              return (
                <div
                  key={meal}
                  className="bg-[var(--color-surface-container)] rounded-2xl p-4 border border-white/5 space-y-3"
                >
                  {/* Meal Header */}
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-headline font-bold text-base text-on-surface flex items-center gap-2">
                        {meal}
                        <span className="text-xs font-normal text-on-surface-variant">
                          ({totalMealCals} / {mealTarget} kcal)
                        </span>
                      </h3>
                    </div>

                    <div className="flex items-center gap-1">
                      {items.length > 0 && (
                        <button
                          onClick={() => setTemplatePromptMeal(meal)}
                          className="w-7 h-7 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-on-surface-variant hover:text-on-surface"
                          title="Save as Meal Template"
                        >
                          <span className="material-symbols-outlined text-[16px]">bookmark_add</span>
                        </button>
                      )}
                      <button
                        onClick={() => openSearchForMeal(meal)}
                        className="px-2.5 py-1 rounded-xl bg-primary text-black font-bold text-xs uppercase tracking-wide flex items-center gap-1 active:scale-95 transition-all"
                      >
                        <span className="material-symbols-outlined text-[14px]">add</span>
                        Add
                      </button>
                    </div>
                  </div>

                  {/* Food items inside meal */}
                  {items.length === 0 ? (
                    <div
                      onClick={() => openSearchForMeal(meal)}
                      className="py-3 px-4 rounded-xl border border-dashed border-white/10 text-center cursor-pointer hover:bg-white/[0.02] text-xs text-on-surface-variant flex items-center justify-center gap-2"
                    >
                      <span className="material-symbols-outlined text-[16px] opacity-40">add_circle</span>
                      Tap to log {meal.toLowerCase()} foods
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      {items.map(entry => (
                        <div
                          key={entry.id}
                          className="bg-[var(--color-surface-container-high)] p-2.5 px-3 rounded-xl border border-white/5 flex items-center justify-between gap-3 group"
                        >
                          <div className="flex-1 min-w-0">
                            <p className="font-bold text-xs text-on-surface truncate">
                              {entry.foodName}
                            </p>
                            <p className="text-[10px] text-on-surface-variant">
                              {entry.quantity} {entry.servingUnit} ({entry.gramEquivalent}g) •{' '}
                              <span className="text-amber-400">{entry.nutrients.protein}g P</span> •{' '}
                              <span className="text-sky-400">{entry.nutrients.carbohydrates}g C</span> •{' '}
                              <span className="text-rose-400">{entry.nutrients.fat}g F</span>
                            </p>
                          </div>

                          <div className="text-right flex-shrink-0 flex items-center gap-2">
                            <span className="font-headline font-bold text-xs text-on-surface">
                              {entry.nutrients.calories} kcal
                            </span>
                            <button
                              onClick={() => duplicateEntry(entry.id)}
                              className="text-on-surface-variant/60 hover:text-on-surface"
                              title="Duplicate"
                            >
                              <span className="material-symbols-outlined text-[15px]">content_copy</span>
                            </button>
                            <button
                              onClick={() => deleteEntry(entry.id)}
                              className="text-rose-400/80 hover:text-rose-400"
                              title="Delete"
                            >
                              <span className="material-symbols-outlined text-[15px]">delete</span>
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </section>

          {/* Hydration / Water Tracker */}
          <section className="bg-[var(--color-surface-container)] rounded-2xl p-5 border border-white/5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-sky-400 text-xl" style={{ fontVariationSettings: "'FILL' 1" }}>
                  water_drop
                </span>
                <h3 className="font-headline font-bold text-base text-on-surface">Hydration Tracker</h3>
              </div>
              <span className="font-headline font-black text-lg text-on-surface">
                {(waterConsumedMl / 1000).toFixed(2)} <span className="text-xs text-on-surface-variant font-normal">/ {nutritionTarget.waterLiters}L</span>
              </span>
            </div>

            {/* Water progress bar */}
            <div className="w-full bg-black/20 h-2.5 rounded-full overflow-hidden">
              <div
                className="bg-sky-400 h-full rounded-full transition-all duration-300"
                style={{ width: `${Math.min(100, (waterConsumedMl / (nutritionTarget.waterLiters * 1000)) * 100)}%` }}
              />
            </div>

            {/* Quick Add buttons */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleAddWater(250)}
                className="flex-1 py-2 px-2 bg-white/5 hover:bg-white/10 text-on-surface font-bold text-xs rounded-xl border border-white/5 active:scale-95 transition-all"
              >
                +250ml
              </button>
              <button
                onClick={() => handleAddWater(500)}
                className="flex-1 py-2 px-2 bg-white/5 hover:bg-white/10 text-on-surface font-bold text-xs rounded-xl border border-white/5 active:scale-95 transition-all"
              >
                +500ml
              </button>
              <button
                onClick={() => handleAddWater(750)}
                className="flex-1 py-2 px-2 bg-white/5 hover:bg-white/10 text-on-surface font-bold text-xs rounded-xl border border-white/5 active:scale-95 transition-all"
              >
                +750ml
              </button>
              <button
                onClick={() => handleAddWater(1000)}
                className="flex-1 py-2 px-2 bg-white/5 hover:bg-white/10 text-on-surface font-bold text-xs rounded-xl border border-white/5 active:scale-95 transition-all"
              >
                +1 Liter
              </button>
              {waterLogsForDate.length > 0 && (
                <button
                  onClick={() => undoWater(selectedDate)}
                  className="w-9 h-9 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center text-on-surface-variant hover:text-on-surface"
                  title="Undo Last Entry"
                >
                  <span className="material-symbols-outlined text-[16px]">undo</span>
                </button>
              )}
            </div>
          </section>

          {/* Intermittent Fasting Widget */}
          <FastingWidget
            activeFast={activeFast}
            onStartFast={startFast}
            onFinishFast={finishFast}
            onCancelFast={cancelFast}
          />
        </div>
      )}

      {/* ═════════════════════════════════════════════════════════
          TAB 2: RECIPES & INDIAN KITCHEN
         ═════════════════════════════════════════════════════════ */}
      {activeTab === 'kitchen' && (
        <div className="space-y-4 animate-fade-in">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-headline font-bold text-lg text-on-surface">Recipes & Indian Kitchen</h2>
              <p className="text-xs text-on-surface-variant">Custom recipes & ICMR-NIN verified dishes</p>
            </div>
            <button
              onClick={() => setIsRecipeBuilderOpen(true)}
              className="py-2 px-3 rounded-xl bg-primary text-black font-bold text-xs uppercase tracking-wide flex items-center gap-1 shadow-md active:scale-95 transition-all"
            >
              <span className="material-symbols-outlined text-[16px]">add</span>
              New Recipe
            </button>
          </div>

          {/* My Saved Recipes List */}
          {recipes.length > 0 && (
            <div className="space-y-2">
              <span className="text-[10px] uppercase font-bold tracking-wider text-primary block">
                My Custom Recipes ({recipes.length})
              </span>
              <div className="grid grid-cols-1 gap-2">
                {recipes.map(recipe => (
                  <div
                    key={recipe.id}
                    className="bg-[var(--color-surface-container)] p-4 rounded-2xl border border-white/5 flex items-center justify-between"
                  >
                    <div>
                      <h4 className="font-bold text-sm text-on-surface">{recipe.name}</h4>
                      <p className="text-xs text-on-surface-variant">
                        {recipe.servings} servings • {recipe.perServingNutrients.calories} kcal/serving •{' '}
                        <span className="text-amber-400">{recipe.perServingNutrients.protein}g P</span>
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => logRecipeToMeal(recipe.id, 'Lunch', 1, selectedDate)}
                        className="py-1.5 px-3 bg-primary text-black text-xs font-bold rounded-xl active:scale-95 transition-all"
                      >
                        Log 1 Serving
                      </button>
                      <button
                        onClick={() => deleteRecipe(recipe.id)}
                        className="text-rose-400 hover:bg-rose-500/10 p-1.5 rounded-lg"
                      >
                        <span className="material-symbols-outlined text-[16px]">delete</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Indian Dish Reference Explorer */}
          <div className="space-y-3 pt-2">
            <span className="text-[10px] uppercase font-bold tracking-wider text-on-surface-variant block">
              Authentic Indian Kitchen (IFCT Referenced)
            </span>

            {/* Search Bar for Indian dishes */}
            <div className="bg-[var(--color-surface-container)] border border-white/10 rounded-2xl px-3.5 py-2 flex items-center gap-2">
              <span className="material-symbols-outlined text-on-surface-variant text-[18px]">search</span>
              <input
                type="text"
                placeholder="Search Indian dishes (dal, biryani, paneer, dosa...)"
                value={kitchenSearch}
                onChange={e => setKitchenSearch(e.target.value)}
                className="w-full bg-transparent text-xs text-on-surface outline-none"
              />
            </div>

            {/* List */}
            <div className="grid grid-cols-1 gap-2.5">
              {INDIAN_DISHES.filter(d =>
                d.name.toLowerCase().includes(kitchenSearch.toLowerCase()) ||
                d.category.toLowerCase().includes(kitchenSearch.toLowerCase())
              ).map(dish => (
                <div
                  key={dish.id}
                  className="bg-[var(--color-surface-container)] p-3.5 rounded-2xl border border-white/5 flex items-center gap-3.5"
                >
                  <img src={dish.image} alt={dish.name} className="w-14 h-14 rounded-xl object-cover flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <span className="text-[9px] uppercase font-bold text-amber-400 block">{dish.category}</span>
                    <h4 className="font-headline font-bold text-sm text-on-surface truncate">{dish.name}</h4>
                    <p className="text-[11px] text-on-surface-variant">
                      {dish.calories} kcal • {dish.protein}g P • {dish.carbs}g C • {dish.fat}g F
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      logFoodItem(
                        {
                          id: `ind_dish_${dish.id}`,
                          name: dish.name,
                          category: dish.category,
                          image: dish.image,
                          source: 'indian_db',
                          nutrientsPer100g: {
                            calories: Math.round((dish.calories / (dish.servingSize || 250)) * 100),
                            protein: Math.round(((dish.protein / (dish.servingSize || 250)) * 100) * 10) / 10,
                            carbohydrates: Math.round(((dish.carbs / (dish.servingSize || 250)) * 100) * 10) / 10,
                            fat: Math.round(((dish.fat / (dish.servingSize || 250)) * 100) * 10) / 10,
                          },
                          defaultServing: { quantity: 1, unit: 'serving', gramEquivalent: dish.servingSize || 250 },
                          availableServings: [{ unit: 'serving', gramEquivalent: dish.servingSize || 250, label: `1 serving (${dish.servingSize || 250}g)` }],
                        },
                        'Lunch',
                        1,
                        'serving',
                        selectedDate
                      );
                      showToast(`${dish.name} logged!`, 'success');
                    }}
                    className="px-3 py-1.5 bg-white/5 hover:bg-primary hover:text-black font-bold text-xs rounded-xl border border-white/10 transition-colors flex-shrink-0"
                  >
                    Log
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ═════════════════════════════════════════════════════════
          TAB 3: ANALYTICS & TRENDS
         ═════════════════════════════════════════════════════════ */}
      {activeTab === 'analytics' && (
        <div className="space-y-4 animate-fade-in">
          <NutritionAnalyticsView
            entries={entriesForDate}
            weightLogs={weightLogs}
            targetCalories={nutritionTarget.dailyCalories}
            targetProtein={nutritionTarget.proteinGrams}
            onSelectDate={d => {
              setSelectedDate(d);
              setActiveTab('diary');
            }}
            selectedDate={selectedDate}
          />
        </div>
      )}

      {/* ═════════════════════════════════════════════════════════
          TAB 4: SUPPLEMENTS & GROCERY
         ═════════════════════════════════════════════════════════ */}
      {activeTab === 'supplements' && (
        <div className="space-y-5 animate-fade-in">
          {/* Supplements Checklist */}
          <section className="bg-[var(--color-surface-container)] rounded-2xl p-5 border border-white/5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-xl">pill</span>
                <h3 className="font-headline font-bold text-base text-on-surface">Daily Supplements</h3>
              </div>
              <button
                onClick={() => setShowAddSup(!showAddSup)}
                className="text-xs text-primary font-bold hover:underline"
              >
                {showAddSup ? 'Cancel' : '+ Add'}
              </button>
            </div>

            {showAddSup && (
              <div className="p-3 bg-[var(--color-surface-container-high)] rounded-xl border border-white/10 space-y-2">
                <input
                  type="text"
                  placeholder="Supplement name (e.g. Creatine 5g)"
                  value={newSupName}
                  onChange={e => setNewSupName(e.target.value)}
                  className="w-full bg-transparent text-xs text-on-surface outline-none"
                />
                <div className="flex gap-2">
                  <select
                    value={newSupTime}
                    onChange={e => setNewSupTime(e.target.value)}
                    className="flex-1 bg-[var(--color-surface-container)] border border-white/10 rounded-lg px-2 py-1 text-xs text-on-surface outline-none"
                  >
                    <option value="Morning">Morning</option>
                    <option value="Post-Workout">Post-Workout</option>
                    <option value="With Lunch">With Lunch</option>
                    <option value="With Dinner">With Dinner</option>
                    <option value="Before Bed">Before Bed</option>
                    <option value="Anytime">Anytime</option>
                  </select>
                  <button
                    onClick={() => {
                      if (newSupName.trim()) {
                        addSupplement(newSupName.trim(), newSupTime || 'Morning');
                        setNewSupName('');
                        setShowAddSup(false);
                        showToast('Supplement added!', 'success');
                      }
                    }}
                    className="px-3 py-1 bg-primary text-black font-bold text-xs rounded-lg"
                  >
                    Save
                  </button>
                </div>
              </div>
            )}

            <div className="space-y-2">
              {supplements.map(sup => (
                <div
                  key={sup.id}
                  className="p-3 rounded-xl bg-[var(--color-surface-container-high)] border border-white/5 flex items-center justify-between transition-all"
                >
                  <div
                    onClick={() => toggleSupplement(sup.id)}
                    className="flex items-center gap-3 cursor-pointer flex-1 min-w-0"
                  >
                    <span
                      className={`material-symbols-outlined text-[20px] ${
                        sup.done ? 'text-emerald-400' : 'text-on-surface-variant'
                      }`}
                      style={{ fontVariationSettings: sup.done ? "'FILL' 1" : "'FILL' 0" }}
                    >
                      {sup.done ? 'check_circle' : 'radio_button_unchecked'}
                    </span>
                    <span className={`text-xs font-semibold truncate ${sup.done ? 'line-through text-on-surface-variant' : 'text-on-surface'}`}>
                      {sup.name}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="text-[10px] text-on-surface-variant">{sup.time}</span>
                    <button
                      onClick={() => removeSupplement(sup.id)}
                      className="text-on-surface-variant/40 hover:text-rose-400 p-1"
                    >
                      <span className="material-symbols-outlined text-[15px]">delete</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Smart Grocery Checklist */}
          <section className="bg-[var(--color-surface-container)] rounded-2xl p-5 border border-white/5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-emerald-400 text-xl">shopping_cart</span>
                <h3 className="font-headline font-bold text-base text-on-surface">Grocery List</h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={clearCheckedGroceries}
                  className="text-xs text-on-surface-variant hover:text-on-surface"
                  title="Clear checked items"
                >
                  <span className="material-symbols-outlined text-[16px]">playlist_remove</span>
                </button>
                <button
                  onClick={shareGroceryList}
                  className="text-xs text-on-surface-variant hover:text-on-surface"
                  title="Copy list"
                >
                  <span className="material-symbols-outlined text-[16px]">content_copy</span>
                </button>
                <button
                  onClick={() => setShowAddGrocery(!showAddGrocery)}
                  className="text-xs text-primary font-bold hover:underline"
                >
                  {showAddGrocery ? 'Cancel' : '+ Add'}
                </button>
              </div>
            </div>

            {showAddGrocery && (
              <div className="p-3 bg-[var(--color-surface-container-high)] rounded-xl border border-white/10 space-y-2">
                <input
                  type="text"
                  placeholder="Item name (e.g. Greek Yogurt)"
                  value={newGroceryName}
                  onChange={e => setNewGroceryName(e.target.value)}
                  className="w-full bg-transparent text-xs text-on-surface outline-none"
                />
                <div className="flex gap-2">
                  <select
                    value={newGroceryCat}
                    onChange={e => setNewGroceryCat(e.target.value)}
                    className="flex-1 bg-[var(--color-surface-container)] border border-white/10 rounded-lg px-2 py-1 text-xs text-on-surface outline-none"
                  >
                    <option value="Proteins">Proteins</option>
                    <option value="Carbs">Carbs</option>
                    <option value="Veggies">Veggies</option>
                    <option value="Healthy Fats">Healthy Fats</option>
                    <option value="Snacks">Snacks</option>
                  </select>
                  <button
                    onClick={() => {
                      if (newGroceryName.trim()) {
                        addGroceryItem(newGroceryName.trim(), newGroceryCat);
                        setNewGroceryName('');
                        setShowAddGrocery(false);
                        showToast('Item added!', 'success');
                      }
                    }}
                    className="px-3 py-1 bg-primary text-black font-bold text-xs rounded-lg"
                  >
                    Save
                  </button>
                </div>
              </div>
            )}

            <div className="space-y-1.5 max-h-80 overflow-y-auto">
              {groceryItems.map(item => (
                <div
                  key={item.id}
                  className="p-2.5 px-3 rounded-xl bg-[var(--color-surface-container-high)] border border-white/5 flex items-center justify-between transition-all"
                >
                  <div
                    onClick={() => toggleGroceryItem(item.id)}
                    className="flex items-center gap-2.5 cursor-pointer flex-1 min-w-0"
                  >
                    <span
                      className={`material-symbols-outlined text-[18px] ${
                        item.checked ? 'text-emerald-400' : 'text-on-surface-variant'
                      }`}
                      style={{ fontVariationSettings: item.checked ? "'FILL' 1" : "'FILL' 0" }}
                    >
                      {item.checked ? 'check_box' : 'check_box_outline_blank'}
                    </span>
                    <span className={`text-xs truncate ${item.checked ? 'line-through text-on-surface-variant' : 'text-on-surface font-medium'}`}>
                      {item.name}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="text-[9px] uppercase font-bold text-on-surface-variant/70 px-1.5 py-0.5 rounded bg-white/[0.02]">
                      {item.category}
                    </span>
                    <button
                      onClick={() => removeGroceryItem(item.id)}
                      className="text-on-surface-variant/40 hover:text-rose-400 p-1"
                    >
                      <span className="material-symbols-outlined text-[15px]">delete</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      )}

      {/* ── Template Prompt Modal ── */}
      {templatePromptMeal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-[var(--color-surface-container)] w-full max-w-sm rounded-3xl p-5 border border-white/10 shadow-2xl space-y-4">
            <h4 className="font-headline font-bold text-base text-on-surface">Save as Meal Template</h4>
            <p className="text-xs text-on-surface-variant">
              Save all items currently in {templatePromptMeal} as a reusable template to log again in one tap.
            </p>
            <input
              type="text"
              placeholder="Template name (e.g. My Usual Breakfast)"
              value={templateName}
              onChange={e => setTemplateName(e.target.value)}
              className="w-full bg-[var(--color-surface-container-high)] border border-white/10 rounded-xl px-3 py-2 text-sm text-on-surface outline-none focus:border-primary"
            />
            <div className="flex gap-2">
              <button
                onClick={() => setTemplatePromptMeal(null)}
                className="flex-1 py-2 rounded-xl bg-white/5 text-xs font-bold text-on-surface"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveMealTemplate}
                className="flex-1 py-2 rounded-xl bg-primary text-black text-xs font-bold"
              >
                Save Template
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modals Mounted ── */}
      <FoodSearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        onSelectFood={handleSelectFoodFromSearch}
        onOpenBarcodeScanner={() => setIsBarcodeOpen(true)}
        onCreateCustomFood={() => setIsCustomFoodOpen(true)}
        mealType={searchMealType}
      />

      <BarcodeScannerModal
        isOpen={isBarcodeOpen}
        onClose={() => setIsBarcodeOpen(false)}
        onFoodFound={handleFoodFoundFromBarcode}
        onCreateCustomWithBarcode={handleCreateCustomWithBarcode}
      />

      {selectedFoodForDetail && (
        <FoodDetailModal
          food={selectedFoodForDetail}
          isOpen={isDetailOpen}
          onClose={() => {
            setIsDetailOpen(false);
            setSelectedFoodForDetail(null);
          }}
          onLogFood={logFoodItem}
          initialMealType={searchMealType}
        />
      )}

      <QuickAddModal
        isOpen={isQuickAddOpen}
        onClose={() => setIsQuickAddOpen(false)}
        onQuickAdd={quickAdd}
        initialMealType={searchMealType}
      />

      <CustomFoodModal
        isOpen={isCustomFoodOpen}
        onClose={() => setIsCustomFoodOpen(false)}
        onSaveFood={saveCustomFood}
        initialBarcode={initialBarcodeForCustom}
      />

      <RecipeBuilderModal
        isOpen={isRecipeBuilderOpen}
        onClose={() => setIsRecipeBuilderOpen(false)}
        onSaveRecipe={saveRecipe}
      />

      <AINutritionModal
        isOpen={isAIOpen}
        onClose={() => setIsAIOpen(false)}
        context={{
          userName: profile.name || 'Athlete',
          goal: profile.goal || 'Hypertrophy Phase',
          dailyCalorieTarget: nutritionTarget.dailyCalories,
          dailyProteinTarget: nutritionTarget.proteinGrams,
          caloriesConsumed: dailySummary.caloriesConsumed,
          proteinConsumed: dailySummary.proteinConsumed,
          carbsConsumed: dailySummary.carbsConsumed,
          fatConsumed: dailySummary.fatConsumed,
          waterConsumedLiters: dailySummary.waterConsumed,
          weightKg: (profile.weight || 178) / 2.20462,
          completedWorkoutToday: dailyStats.duration > 0 ? {
            title: 'Completed Workout',
            durationMinutes: dailyStats.duration,
            caloriesBurned: dailyStats.calories,
          } : undefined,
        }}
        onLogGeneratedMeal={async meal => {
          for (const ing of meal.ingredients) {
            await quickAdd(
              ing.name,
              ing.calories,
              meal.mealType,
              { protein: ing.protein, carbs: ing.carbs, fat: ing.fat },
              selectedDate
            );
          }
          showToast(`Logged "${meal.mealName}" to ${meal.mealType}!`, 'success');
        }}
      />

      <MicronutrientsModal
        isOpen={isMicrosOpen}
        onClose={() => setIsMicrosOpen(false)}
        totals={dailySummary.macros ? {
          calories: dailySummary.caloriesConsumed,
          protein: dailySummary.proteinConsumed,
          carbohydrates: dailySummary.carbsConsumed,
          fat: dailySummary.fatConsumed,
          fiber: dailySummary.fiberConsumed,
          sodium: dailySummary.sodiumConsumed,
        } : { calories: 0, protein: 0, carbohydrates: 0, fat: 0 }}
      />

      <NutritionAttributionModal
        isOpen={isSourcesOpen}
        onClose={() => setIsSourcesOpen(false)}
      />

      <NutritionExportImportModal
        isOpen={isExportImportOpen}
        onClose={() => setIsExportImportOpen(false)}
        onDataImported={refreshData}
      />
    </main>
  );
}
