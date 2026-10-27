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
import {
  Utensils,
  Calendar,
  UtensilsCrossed,
  TrendingUp,
  Pill,
  Search,
  ScanBarcode,
  Zap,
  Sparkles,
  Flame,
  Plus,
  Trash2,
  Copy,
  BookmarkPlus,
  ChevronLeft,
  ChevronRight,
  Droplets,
  RotateCcw,
  Info,
  Download,
  ShoppingCart,
  CheckCircle2,
  Circle,
  CheckSquare,
  Square,
} from 'lucide-react';

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
    <main className="w-full max-w-2xl mx-auto px-3.5 sm:px-4 pt-3 sm:pt-4 pb-36 space-y-4 sm:space-y-5 min-h-screen min-w-0 box-border">
      {/* ── Top Bar & Status Header ── */}
      <section className="flex flex-wrap items-center justify-between gap-2.5 pt-1 w-full max-w-full">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-[#151517] border border-[#2A2A2D] flex items-center justify-center text-[#F5C542] shrink-0">
            <Utensils className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <h1 className="font-headline font-black text-lg sm:text-xl tracking-tight uppercase text-[#F5F5F5] truncate">Fuel & Nutrition</h1>
            <p className="text-[10px] font-mono text-[#A1A1A6] uppercase tracking-wider truncate">Metabolic & Dietary Engine</p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 ml-auto">
          {/* Offline/Online Badge */}
          <span
            className={`flex items-center gap-1.5 text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-1 rounded-lg border ${
              isOnline
                ? 'bg-[#30D158]/10 text-[#30D158] border-[#30D158]/20'
                : 'bg-[#FF8A00]/10 text-[#FF8A00] border-[#FF8A00]/20'
            }`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-[#30D158]' : 'bg-[#FF8A00]'}`} />
            <span className="hidden xs:inline">{isOnline ? 'Cloud' : 'Offline'}</span>
          </span>

          {/* Quick Actions Dropdown / Icon Buttons */}
          <button
            onClick={() => setIsAIOpen(true)}
            className="h-8 px-2.5 rounded-lg bg-[#A78BFA]/10 hover:bg-[#A78BFA]/20 border border-[#A78BFA]/30 text-[#A78BFA] flex items-center gap-1 font-mono font-bold text-xs active:scale-95 transition-all shrink-0"
            title="AI Nutrition Coach"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span className="text-[10px] uppercase">Coach</span>
          </button>
          <button
            onClick={() => setIsExportImportOpen(true)}
            className="w-8 h-8 rounded-lg bg-[#151517] hover:bg-[#1E1E20] border border-[#2A2A2D] flex items-center justify-center text-[#A1A1A6] hover:text-[#F5F5F5] transition-colors shrink-0"
            title="Import/Export Backup"
          >
            <Download className="w-4 h-4" />
          </button>
          <button
            onClick={() => setIsSourcesOpen(true)}
            className="w-8 h-8 rounded-lg bg-[#151517] hover:bg-[#1E1E20] border border-[#2A2A2D] flex items-center justify-center text-[#A1A1A6] hover:text-[#F5F5F5] transition-colors shrink-0"
            title="Data Sources & Attribution"
          >
            <Info className="w-4 h-4" />
          </button>
        </div>
      </section>

      {/* ── Main Tab Navigation Bar ── */}
      <section className="flex bg-[#151517] p-1 rounded-xl border border-[#2A2A2D] text-xs font-mono font-bold">
        <button
          onClick={() => setActiveTab('diary')}
          className={`flex-1 py-2 rounded-lg transition-all flex items-center justify-center gap-1.5 ${
            activeTab === 'diary'
              ? 'bg-[#30D158] text-black font-black'
              : 'text-[#A1A1A6] hover:text-[#F5F5F5]'
          }`}
        >
          <Calendar className="w-3.5 h-3.5" />
          <span>Diary</span>
        </button>
        <button
          onClick={() => setActiveTab('kitchen')}
          className={`flex-1 py-2 rounded-lg transition-all flex items-center justify-center gap-1.5 ${
            activeTab === 'kitchen'
              ? 'bg-[#30D158] text-black font-black'
              : 'text-[#A1A1A6] hover:text-[#F5F5F5]'
          }`}
        >
          <UtensilsCrossed className="w-3.5 h-3.5" />
          <span>Recipes</span>
        </button>
        <button
          onClick={() => setActiveTab('analytics')}
          className={`flex-1 py-2 rounded-lg transition-all flex items-center justify-center gap-1.5 ${
            activeTab === 'analytics'
              ? 'bg-[#30D158] text-black font-black'
              : 'text-[#A1A1A6] hover:text-[#F5F5F5]'
          }`}
        >
          <TrendingUp className="w-3.5 h-3.5" />
          <span>Trends</span>
        </button>
        <button
          onClick={() => setActiveTab('supplements')}
          className={`flex-1 py-2 rounded-lg transition-all flex items-center justify-center gap-1.5 ${
            activeTab === 'supplements'
              ? 'bg-[#30D158] text-black font-black'
              : 'text-[#A1A1A6] hover:text-[#F5F5F5]'
          }`}
        >
          <Pill className="w-3.5 h-3.5" />
          <span>Supps</span>
        </button>
      </section>

      {/* ═════════════════════════════════════════════════════════
          TAB 1: DIARY
         ═════════════════════════════════════════════════════════ */}
      {activeTab === 'diary' && (
        <div className="space-y-4">
          {/* Date Selector Banner */}
          <div className="bg-[#151517] rounded-xl p-2.5 px-4 flex items-center justify-between border border-[#2A2A2D]">
            <button
              onClick={goToPreviousDay}
              className="w-8 h-8 rounded-lg bg-[#1E1E20] hover:bg-[#2A2A2D] border border-[#2A2A2D] flex items-center justify-center text-[#A1A1A6] hover:text-[#F5F5F5] transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <button
              onClick={goToToday}
              className="text-center group"
            >
              <span className="font-headline font-black text-sm text-[#F5F5F5] uppercase tracking-tight block group-hover:text-[#30D158] transition-colors">
                {formattedDate}
              </span>
              <span className="text-[10px] font-mono text-[#A1A1A6]">{selectedDate}</span>
            </button>

            <button
              onClick={goToNextDay}
              className="w-8 h-8 rounded-lg bg-[#1E1E20] hover:bg-[#2A2A2D] border border-[#2A2A2D] flex items-center justify-center text-[#A1A1A6] hover:text-[#F5F5F5] transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Quick Logging Action Bar */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => openSearchForMeal('Lunch')}
              className="flex-1 h-11 px-3.5 rounded-xl bg-[#151517] hover:bg-[#1E1E20] border border-[#2A2A2D] text-left text-xs font-mono text-[#A1A1A6] flex items-center gap-2 transition-colors active:scale-[0.99]"
            >
              <Search className="w-4 h-4 text-[#A1A1A6]" />
              <span className="truncate">Search food, brand, or dish...</span>
            </button>
            <button
              onClick={() => setIsBarcodeOpen(true)}
              className="h-11 px-3.5 rounded-xl bg-[#151517] hover:bg-[#1E1E20] border border-[#2A2A2D] text-[#4F9CF9] text-xs font-mono font-bold flex items-center gap-1.5 transition-colors active:scale-95"
              title="Barcode Scanner"
            >
              <ScanBarcode className="w-4 h-4" />
              <span className="hidden sm:inline">Barcode</span>
            </button>
            <button
              onClick={() => setIsQuickAddOpen(true)}
              className="h-11 px-3.5 rounded-xl bg-[#151517] hover:bg-[#1E1E20] border border-[#2A2A2D] text-[#FF8A00] text-xs font-mono font-bold flex items-center gap-1.5 transition-colors active:scale-95"
              title="Quick Add"
            >
              <Zap className="w-4 h-4" />
              <span className="hidden sm:inline">Quick Add</span>
            </button>
          </div>

          {/* Calorie & Energy Hero Card */}
          <section className="bg-[#151517] rounded-2xl p-5 border border-[#2A2A2D] space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-[#A1A1A6] font-bold block mb-1">
                  TODAY'S ENERGY BALANCE
                </span>
                <div className="flex items-baseline gap-2">
                  <h2 className="font-headline font-black text-4xl sm:text-5xl text-[#F5F5F5] tracking-tight tabular-nums">
                    {dailySummary.caloriesRemaining}
                  </h2>
                  <span className="text-xs font-mono text-[#A1A1A6] uppercase">
                    / {dailySummary.calorieBudget} kcal remaining
                  </span>
                </div>
              </div>

              {/* Logging streak chip */}
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-[#1E1E20] border border-[#2A2A2D] text-xs font-mono font-bold text-[#F5C542]">
                <Flame className="w-3.5 h-3.5 text-[#FF8A00]" />
                <span>{loggingStreak}D STREAK</span>
              </div>
            </div>

            {/* Calorie progress bar */}
            <div className="w-full bg-[#1E1E20] h-2.5 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  dailySummary.caloriesConsumed > dailySummary.calorieBudget
                    ? 'bg-[#FF453A]'
                    : 'bg-[#F5C542]'
                }`}
                style={{
                  width: `${Math.min(100, (dailySummary.caloriesConsumed / (dailySummary.calorieBudget || 1)) * 100)}%`,
                }}
              />
            </div>

            {/* Calorie Breakdown Row */}
            <div className="flex flex-wrap items-center justify-between gap-1.5 text-xs font-mono text-[#A1A1A6] pt-0.5">
              <span>CONSUMED: <strong className="text-[#F5F5F5]">{dailySummary.caloriesConsumed} kcal</strong></span>
              <span>BUDGET: <strong className="text-[#F5F5F5]">{nutritionTarget.dailyCalories} kcal</strong></span>
              {dailyStats.calories > 0 && (
                <span className="text-[#30D158]">
                  +{dailyStats.calories} burned
                </span>
              )}
            </div>

            {/* Exercise calorie adjustment toggle */}
            {dailyStats.calories > 0 && (
              <div className="pt-3 border-t border-[#2A2A2D] flex flex-wrap items-center justify-between gap-2 text-xs font-mono">
                <span className="text-[#A1A1A6]">Adjust budget with exercise expenditure:</span>
                <button
                  onClick={toggleIncludeExerciseCalories}
                  className={`px-2.5 py-1 rounded-md font-bold text-[10px] uppercase transition-all ${
                    nutritionTarget.includeExerciseInBudget
                      ? 'bg-[#30D158]/15 text-[#30D158] border border-[#30D158]/30'
                      : 'bg-[#1E1E20] text-[#A1A1A6] border border-[#2A2A2D]'
                  }`}
                >
                  {nutritionTarget.includeExerciseInBudget ? 'Enabled' : 'Disabled'}
                </button>
              </div>
            )}
          </section>

          {/* Clean Horizontal Macro Progress Indicators */}
          <section className="bg-[#151517] rounded-2xl p-5 border border-[#2A2A2D] space-y-4">
            <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-[#A1A1A6] font-bold block">
              DAILY MACRONUTRIENT TARGETS
            </span>

            {/* Protein */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="font-bold text-[#F5F5F5] uppercase tracking-wider">PROTEIN</span>
                <span className="font-mono text-[#A1A1A6] tabular-nums">
                  <strong className="text-[#F5F5F5]">{dailySummary.proteinConsumed}</strong> / {nutritionTarget.proteinGrams}g
                </span>
              </div>
              <div className="w-full bg-[#1E1E20] h-2 rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#30D158] rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, (dailySummary.proteinConsumed / (nutritionTarget.proteinGrams || 1)) * 100)}%` }}
                />
              </div>
            </div>

            {/* Carbs */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="font-bold text-[#F5F5F5] uppercase tracking-wider">CARBOHYDRATES</span>
                <span className="font-mono text-[#A1A1A6] tabular-nums">
                  <strong className="text-[#F5F5F5]">{dailySummary.carbsConsumed}</strong> / {nutritionTarget.carbsGrams}g
                </span>
              </div>
              <div className="w-full bg-[#1E1E20] h-2 rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#4F9CF9] rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, (dailySummary.carbsConsumed / (nutritionTarget.carbsGrams || 1)) * 100)}%` }}
                />
              </div>
            </div>

            {/* Fat */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="font-bold text-[#F5F5F5] uppercase tracking-wider">FATS</span>
                <span className="font-mono text-[#A1A1A6] tabular-nums">
                  <strong className="text-[#F5F5F5]">{dailySummary.fatConsumed}</strong> / {nutritionTarget.fatGrams}g
                </span>
              </div>
              <div className="w-full bg-[#1E1E20] h-2 rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#F5C542] rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, (dailySummary.fatConsumed / (nutritionTarget.fatGrams || 1)) * 100)}%` }}
                />
              </div>
            </div>

            {/* Fiber */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="font-bold text-[#F5F5F5] uppercase tracking-wider">FIBER</span>
                <span className="font-mono text-[#A1A1A6] tabular-nums">
                  <strong className="text-[#F5F5F5]">{dailySummary.fiberConsumed}</strong> / {nutritionTarget.fiberGrams}g
                </span>
              </div>
              <div className="w-full bg-[#1E1E20] h-2 rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#A78BFA] rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, (dailySummary.fiberConsumed / (nutritionTarget.fiberGrams || 1)) * 100)}%` }}
                />
              </div>
            </div>
          </section>

          {/* Micronutrient Drawer Trigger */}
          <button
            onClick={() => setIsMicrosOpen(true)}
            className="w-full py-3 px-4 bg-[#151517] hover:bg-[#1E1E20] rounded-xl border border-[#2A2A2D] flex items-center justify-between text-xs font-mono font-semibold text-[#F5F5F5] transition-colors"
          >
            <span className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#30D158]" />
              <span>View Micronutrients (IOM Reference Comparison)</span>
            </span>
            <ChevronRight className="w-4 h-4 text-[#A1A1A6]" />
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
                  className="bg-[#151517] rounded-2xl p-4 border border-[#2A2A2D] space-y-3"
                >
                  {/* Meal Header */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <h3 className="font-headline font-black text-sm text-[#F5F5F5] uppercase tracking-tight flex items-baseline gap-1.5 flex-wrap">
                        <span>{meal}</span>
                        <span className="text-[11px] sm:text-xs font-mono font-normal text-[#A1A1A6]">
                          ({totalMealCals} / {mealTarget} kcal)
                        </span>
                      </h3>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {items.length > 0 && (
                        <button
                          onClick={() => setTemplatePromptMeal(meal)}
                          className="w-8 h-8 rounded-lg bg-[#1E1E20] hover:bg-[#2A2A2D] border border-[#2A2A2D] flex items-center justify-center text-[#A1A1A6] hover:text-[#F5F5F5] shrink-0"
                          title="Save as Meal Template"
                        >
                          <BookmarkPlus className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        onClick={() => openSearchForMeal(meal)}
                        className="h-8 px-2.5 sm:px-3 rounded-lg bg-[#FF8A00] hover:bg-[#FFA033] text-black font-mono font-black text-xs uppercase tracking-wider flex items-center gap-1 active:scale-95 transition-all shadow-sm shrink-0 whitespace-nowrap min-h-[32px]"
                      >
                        <Plus className="w-3.5 h-3.5 stroke-[3]" />
                        <span>Add Food</span>
                      </button>
                    </div>
                  </div>

                  {/* Food items inside meal */}
                  {items.length === 0 ? (
                    <div
                      onClick={() => openSearchForMeal(meal)}
                      className="py-3.5 px-4 rounded-xl border border-dashed border-[#2A2A2D] hover:border-[#FF8A00]/40 text-center cursor-pointer text-xs font-mono text-[#A1A1A6] hover:text-[#F5F5F5] flex items-center justify-center gap-2 transition-colors min-h-[44px]"
                    >
                      <Plus className="w-4 h-4 text-[#FF8A00]" />
                      <span>Log {meal.toLowerCase()} foods</span>
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      {items.map(entry => (
                        <div
                          key={entry.id}
                          className="bg-[#1E1E20] p-3 rounded-xl border border-[#2A2A2D] flex items-center justify-between gap-3 group"
                        >
                          <div className="flex-1 min-w-0">
                            <p className="font-bold text-xs text-[#F5F5F5] uppercase tracking-tight truncate">
                              {entry.foodName}
                            </p>
                            <p className="text-[10px] font-mono text-[#A1A1A6] mt-0.5 truncate">
                              {entry.quantity} {entry.servingUnit} ({entry.gramEquivalent}g) •{' '}
                              <span className="text-[#30D158]">{entry.nutrients.protein}g P</span> •{' '}
                              <span className="text-[#4F9CF9]">{entry.nutrients.carbohydrates}g C</span> •{' '}
                              <span className="text-[#F5C542]">{entry.nutrients.fat}g F</span>
                            </p>
                          </div>

                          <div className="text-right flex-shrink-0 flex items-center gap-1.5 sm:gap-2">
                            <span className="font-mono font-bold text-xs text-[#F5F5F5]">
                              {entry.nutrients.calories} kcal
                            </span>
                            <button
                              onClick={() => duplicateEntry(entry.id)}
                              className="w-7 h-7 rounded-lg bg-[#151517] hover:bg-[#2A2A2D] border border-[#2A2A2D] flex items-center justify-center text-[#A1A1A6] hover:text-[#F5F5F5] transition-colors"
                              title="Duplicate"
                            >
                              <Copy className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => deleteEntry(entry.id)}
                              className="w-7 h-7 rounded-lg bg-[#151517] hover:bg-[#FF453A]/20 border border-[#2A2A2D] flex items-center justify-center text-[#FF453A]/80 hover:text-[#FF453A] transition-colors"
                              title="Delete"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
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
          <section className="bg-[#151517] rounded-2xl p-4 sm:p-5 border border-[#2A2A2D] space-y-3 w-full max-w-full">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Droplets className="w-5 h-5 text-[#4F9CF9]" />
                <h3 className="font-headline font-black text-sm text-[#F5F5F5] uppercase tracking-tight">Hydration Tracker</h3>
              </div>
              <span className="font-mono font-black text-base text-[#F5F5F5]">
                {(waterConsumedMl / 1000).toFixed(2)} <span className="text-xs text-[#A1A1A6] font-normal">/ {nutritionTarget.waterLiters}L</span>
              </span>
            </div>

            {/* Water progress bar */}
            <div className="w-full bg-[#1E1E20] h-2.5 rounded-full overflow-hidden">
              <div
                className="bg-[#4F9CF9] h-full rounded-full transition-all duration-300"
                style={{ width: `${Math.min(100, (waterConsumedMl / (nutritionTarget.waterLiters * 1000)) * 100)}%` }}
              />
            </div>

            {/* Quick Add buttons — responsive 2x2 grid on mobile, 4 columns on sm+ screens */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 w-full">
              <button
                onClick={() => handleAddWater(250)}
                className="py-2.5 px-3 bg-[#1E1E20] hover:bg-[#2A2A2D] text-[#F5F5F5] font-mono font-bold text-xs rounded-xl border border-[#2A2A2D] active:scale-95 transition-all text-center min-h-[44px] flex items-center justify-center"
              >
                +250ml
              </button>
              <button
                onClick={() => handleAddWater(500)}
                className="py-2.5 px-3 bg-[#1E1E20] hover:bg-[#2A2A2D] text-[#F5F5F5] font-mono font-bold text-xs rounded-xl border border-[#2A2A2D] active:scale-95 transition-all text-center min-h-[44px] flex items-center justify-center"
              >
                +500ml
              </button>
              <button
                onClick={() => handleAddWater(750)}
                className="py-2.5 px-3 bg-[#1E1E20] hover:bg-[#2A2A2D] text-[#F5F5F5] font-mono font-bold text-xs rounded-xl border border-[#2A2A2D] active:scale-95 transition-all text-center min-h-[44px] flex items-center justify-center"
              >
                +750ml
              </button>
              <button
                onClick={() => handleAddWater(1000)}
                className="py-2.5 px-3 bg-[#1E1E20] hover:bg-[#2A2A2D] text-[#F5F5F5] font-mono font-bold text-xs rounded-xl border border-[#2A2A2D] active:scale-95 transition-all text-center min-h-[44px] flex items-center justify-center"
              >
                +1 Liter
              </button>
            </div>

            {waterLogsForDate.length > 0 && (
              <div className="flex justify-end pt-1">
                <button
                  onClick={() => undoWater(selectedDate)}
                  className="h-9 px-3 rounded-xl bg-[#1E1E20] hover:bg-[#2A2A2D] border border-[#2A2A2D] flex items-center gap-1.5 text-xs font-mono text-[#A1A1A6] hover:text-[#F5F5F5] transition-colors"
                  title="Undo Last Entry"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Undo Last Log</span>
                </button>
              </div>
            )}
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
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-headline font-black text-lg uppercase text-[#F5F5F5]">Recipes & Kitchen</h2>
              <p className="text-xs font-mono text-[#A1A1A6]">Custom recipes & ICMR-NIN verified database</p>
            </div>
            <button
              onClick={() => setIsRecipeBuilderOpen(true)}
              className="h-9 px-3.5 rounded-xl bg-[#30D158] hover:bg-[#5EEB78] text-black font-mono font-black text-xs uppercase tracking-wider flex items-center gap-1.5 shadow-sm active:scale-95 transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>New Recipe</span>
            </button>
          </div>

          {/* My Saved Recipes List */}
          {recipes.length > 0 && (
            <div className="space-y-2">
              <span className="text-[10px] font-mono uppercase font-bold tracking-wider text-[#30D158] block">
                SAVED RECIPES ({recipes.length})
              </span>
              <div className="grid grid-cols-1 gap-2">
                {recipes.map(recipe => (
                  <div
                    key={recipe.id}
                    className="bg-[#151517] p-4 rounded-xl border border-[#2A2A2D] flex items-center justify-between"
                  >
                    <div>
                      <h4 className="font-bold text-sm text-[#F5F5F5] uppercase tracking-tight">{recipe.name}</h4>
                      <p className="text-xs font-mono text-[#A1A1A6]">
                        {recipe.servings} servings • {recipe.perServingNutrients.calories} kcal/serv •{' '}
                        <span className="text-[#30D158]">{recipe.perServingNutrients.protein}g P</span>
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => logRecipeToMeal(recipe.id, 'Lunch', 1, selectedDate)}
                        className="h-8 px-3 bg-[#FF8A00] hover:bg-[#FFA033] text-black font-mono font-black text-xs uppercase tracking-wider rounded-lg active:scale-95 transition-all"
                      >
                        Log
                      </button>
                      <button
                        onClick={() => deleteRecipe(recipe.id)}
                        className="w-8 h-8 rounded-lg bg-[#1E1E20] hover:bg-[#FF453A]/20 border border-[#2A2A2D] flex items-center justify-center text-[#FF453A]/80 hover:text-[#FF453A] transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Indian Dish Reference Explorer */}
          <div className="space-y-3 pt-2">
            <span className="text-[10px] font-mono uppercase font-bold tracking-wider text-[#A1A1A6] block">
              AUTHENTIC INDIAN KITCHEN (IFCT 2017 STANDARDS)
            </span>

            {/* Search Bar for Indian dishes */}
            <div className="bg-[#151517] border border-[#2A2A2D] rounded-xl px-3.5 py-2.5 flex items-center gap-2.5">
              <Search className="w-4 h-4 text-[#A1A1A6]" />
              <input
                type="text"
                placeholder="Search Indian dishes (dal, biryani, paneer, dosa...)"
                value={kitchenSearch}
                onChange={e => setKitchenSearch(e.target.value)}
                className="w-full bg-transparent text-xs font-mono text-[#F5F5F5] outline-none"
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
                  className="bg-[#151517] p-3 rounded-xl border border-[#2A2A2D] flex items-center gap-3.5"
                >
                  <img src={dish.image} alt={dish.name} className="w-14 h-14 rounded-lg object-cover flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <span className="text-[9px] font-mono uppercase font-bold text-[#F5C542] block">{dish.category}</span>
                    <h4 className="font-headline font-bold text-sm text-[#F5F5F5] uppercase tracking-tight truncate">{dish.name}</h4>
                    <p className="text-[11px] font-mono text-[#A1A1A6]">
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
                    className="h-8 px-3 bg-[#FF8A00] hover:bg-[#FFA033] text-black font-mono font-black text-xs uppercase tracking-wider rounded-lg transition-colors flex-shrink-0"
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
        <div className="space-y-4">
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
        <div className="space-y-5">
          {/* Supplements Checklist */}
          <section className="bg-[#151517] rounded-2xl p-5 border border-[#2A2A2D] space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Pill className="w-5 h-5 text-[#30D158]" />
                <h3 className="font-headline font-black text-sm text-[#F5F5F5] uppercase tracking-tight">Daily Supplements</h3>
              </div>
              <button
                onClick={() => setShowAddSup(!showAddSup)}
                className="text-xs font-mono text-[#30D158] font-bold hover:underline"
              >
                {showAddSup ? 'Cancel' : '+ Add'}
              </button>
            </div>

            {showAddSup && (
              <div className="p-3 bg-[#1E1E20] rounded-xl border border-[#2A2A2D] space-y-2">
                <input
                  type="text"
                  placeholder="Supplement name (e.g. Creatine 5g)"
                  value={newSupName}
                  onChange={e => setNewSupName(e.target.value)}
                  className="w-full bg-[#151517] border border-[#2A2A2D] rounded-lg px-3 py-2 text-xs font-mono text-[#F5F5F5] outline-none focus:border-[#30D158]/50"
                />
                <div className="flex gap-2">
                  <select
                    value={newSupTime}
                    onChange={e => setNewSupTime(e.target.value)}
                    className="flex-1 bg-[#151517] border border-[#2A2A2D] rounded-lg px-2 py-1.5 text-xs font-mono text-[#F5F5F5] outline-none"
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
                    className="h-8 px-4 bg-[#30D158] hover:bg-[#5EEB78] text-black font-mono font-bold text-xs uppercase tracking-wider rounded-lg"
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
                  className="p-3 rounded-xl bg-[#1E1E20] border border-[#2A2A2D] flex items-center justify-between transition-all"
                >
                  <div
                    onClick={() => toggleSupplement(sup.id)}
                    className="flex items-center gap-3 cursor-pointer flex-1 min-w-0"
                  >
                    {sup.done ? (
                      <CheckCircle2 className="w-5 h-5 text-[#30D158]" />
                    ) : (
                      <Circle className="w-5 h-5 text-[#A1A1A6]" />
                    )}
                    <span className={`text-xs font-mono truncate ${sup.done ? 'line-through text-[#A1A1A6]' : 'text-[#F5F5F5] font-bold'}`}>
                      {sup.name}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="text-[10px] font-mono text-[#A1A1A6] uppercase">{sup.time}</span>
                    <button
                      onClick={() => removeSupplement(sup.id)}
                      className="w-7 h-7 rounded-lg bg-[#151517] hover:bg-[#FF453A]/20 border border-[#2A2A2D] flex items-center justify-center text-[#FF453A]/80 hover:text-[#FF453A] transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Smart Grocery Checklist */}
          <section className="bg-[#151517] rounded-2xl p-5 border border-[#2A2A2D] space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShoppingCart className="w-5 h-5 text-[#30D158]" />
                <h3 className="font-headline font-black text-sm text-[#F5F5F5] uppercase tracking-tight">Grocery List</h3>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={clearCheckedGroceries}
                  className="h-8 px-2.5 rounded-lg bg-[#1E1E20] hover:bg-[#2A2A2D] border border-[#2A2A2D] text-xs font-mono text-[#A1A1A6] hover:text-[#F5F5F5] flex items-center gap-1"
                  title="Clear checked items"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Clear</span>
                </button>
                <button
                  onClick={shareGroceryList}
                  className="h-8 px-2.5 rounded-lg bg-[#1E1E20] hover:bg-[#2A2A2D] border border-[#2A2A2D] text-xs font-mono text-[#A1A1A6] hover:text-[#F5F5F5] flex items-center gap-1"
                  title="Copy list"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Copy</span>
                </button>
                <button
                  onClick={() => setShowAddGrocery(!showAddGrocery)}
                  className="h-8 px-3 rounded-lg bg-[#30D158] hover:bg-[#5EEB78] text-black font-mono font-bold text-xs uppercase tracking-wider flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{showAddGrocery ? 'Cancel' : 'Add'}</span>
                </button>
              </div>
            </div>

            {showAddGrocery && (
              <div className="p-3 bg-[#1E1E20] rounded-xl border border-[#2A2A2D] space-y-2">
                <input
                  type="text"
                  placeholder="Item name (e.g. Greek Yogurt)"
                  value={newGroceryName}
                  onChange={e => setNewGroceryName(e.target.value)}
                  className="w-full bg-[#151517] border border-[#2A2A2D] rounded-lg px-3 py-2 text-xs font-mono text-[#F5F5F5] outline-none focus:border-[#30D158]/50"
                />
                <div className="flex gap-2">
                  <select
                    value={newGroceryCat}
                    onChange={e => setNewGroceryCat(e.target.value)}
                    className="flex-1 bg-[#151517] border border-[#2A2A2D] rounded-lg px-2 py-1.5 text-xs font-mono text-[#F5F5F5] outline-none"
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
                    className="h-8 px-4 bg-[#30D158] hover:bg-[#5EEB78] text-black font-mono font-bold text-xs uppercase tracking-wider rounded-lg"
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
                  className="p-2.5 px-3 rounded-xl bg-[#1E1E20] border border-[#2A2A2D] flex items-center justify-between transition-all"
                >
                  <div
                    onClick={() => toggleGroceryItem(item.id)}
                    className="flex items-center gap-2.5 cursor-pointer flex-1 min-w-0"
                  >
                    {item.checked ? (
                      <CheckSquare className="w-4 h-4 text-[#30D158]" />
                    ) : (
                      <Square className="w-4 h-4 text-[#A1A1A6]" />
                    )}
                    <span className={`text-xs font-mono truncate ${item.checked ? 'line-through text-[#A1A1A6]' : 'text-[#F5F5F5] font-medium'}`}>
                      {item.name}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="text-[9px] font-mono uppercase font-bold text-[#A1A1A6] px-1.5 py-0.5 rounded bg-[#151517] border border-[#2A2A2D]">
                      {item.category}
                    </span>
                    <button
                      onClick={() => removeGroceryItem(item.id)}
                      className="w-7 h-7 rounded-lg bg-[#151517] hover:bg-[#FF453A]/20 border border-[#2A2A2D] flex items-center justify-center text-[#FF453A]/80 hover:text-[#FF453A] transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
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
