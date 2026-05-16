import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { useAuth } from './AuthContext';
import { syncToCloud } from '../services/cloudSync';
import { storage } from '../utils/storage';

// Define types
export type FitnessGoal = 'Hypertrophy Phase' | 'Fat Loss' | 'Endurance' | 'Maintenance';

export interface WeightEntry {
  date: string; // ISO date string (YYYY-MM-DD)
  weight: number; // in lbs (always stored in lbs, converted for display)
}

export interface UserProfile {
  name: string;
  age: number;
  gender: string;
  height: number; // in inches
  weight: number; // in lbs
  bmi: number;
  goal: FitnessGoal;
  targetWeight: number;
  dailyStepGoal: number;
  dailyCalorieGoal: number;
  dailyWaterGoal: number; // in Liters
}

export interface Activity {
  id: string;
  type: string; // 'Workout', 'Steps', 'Water', 'Sleep'
  value: number; // Duration in mins, step count, liters, hours
  caloriesBurned?: number;
  timestamp: string;
}

// ── Meal Logging ──
export type MealType = 'Breakfast' | 'Lunch' | 'Dinner' | 'Snack';

export interface MealLog {
  id: string;
  name: string;
  mealType: MealType;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  timestamp: string;
}

// ── Supplements ──
export interface Supplement {
  id: string;
  name: string;
  time: string;
  done: boolean;
}

// ── Grocery ──
export interface GroceryItem {
  id: string;
  name: string;
  category: string;
  checked: boolean;
}

// ── Strength Tracking ──
export interface StrengthEntry {
  id: string;
  exercise: string;
  weight: number; // in lbs
  reps: number;
  date: string; // ISO date YYYY-MM-DD
}

// ── Body Measurements ──
export interface BodyMeasurementEntry {
  id: string;
  label: string; // e.g. 'Chest', 'Waist', 'Arms'
  value: number;
  unit: string; // 'in' or '%'
  date: string; // ISO date YYYY-MM-DD
}

interface FitnessContextType {
  profile: UserProfile;
  updateProfile: (updates: Partial<UserProfile>) => void;
  activities: Activity[];
  logActivity: (activity: Omit<Activity, 'id' | 'timestamp'>) => void;
  dailyStats: {
    calories: number; // calories burned from exercise
    caloriesConsumed: number; // calories from meals
    steps: number;
    water: number;
    sleep: number;
    duration: number;
    protein: number;
    carbs: number;
    fat: number;
  };
  // Weight history
  weightHistory: WeightEntry[];
  logWeight: (weight: number) => void;
  needsWeightCheckIn: boolean;
  dismissWeightCheckIn: () => void;
  // Computed data for charts
  heatmapData: number[][]; // 12 weeks × 7 days, based on real activities
  // Meal logging
  mealLogs: MealLog[];
  todaysMeals: MealLog[];
  logMeal: (meal: Omit<MealLog, 'id' | 'timestamp'>) => void;
  deleteMeal: (id: string) => void;
  // Supplements
  supplements: Supplement[];
  toggleSupplement: (id: string) => void;
  addSupplement: (name: string, time: string) => void;
  removeSupplement: (id: string) => void;
  // Grocery
  groceryItems: GroceryItem[];
  addGroceryItem: (name: string, category: string) => void;
  removeGroceryItem: (id: string) => void;
  toggleGroceryItem: (id: string) => void;
  clearCheckedGroceries: () => void;
  // Strength tracking
  strengthHistory: StrengthEntry[];
  logStrength: (exercise: string, weight: number, reps: number) => void;
  deleteStrength: (id: string) => void;
  // Body measurements
  bodyMeasurementHistory: BodyMeasurementEntry[];
  logBodyMeasurement: (label: string, value: number, unit: string) => void;
  deleteBodyMeasurement: (id: string) => void;
}

// Default initial state
const defaultProfile: UserProfile = {
  name: 'Athlete',
  age: 28,
  gender: 'Male',
  height: 72, 
  weight: 178.5,
  bmi: 24.2,
  goal: 'Hypertrophy Phase',
  targetWeight: 185,
  dailyStepGoal: 10000,
  dailyCalorieGoal: 2800,
  dailyWaterGoal: 3.0,
};

const DEFAULT_SUPPLEMENTS: Supplement[] = [
  { id: 's1', name: 'Whey Protein', time: 'Post-Workout', done: false },
  { id: 's2', name: 'Creatine 5g', time: 'Morning', done: false },
  { id: 's3', name: 'Fish Oil', time: 'With Lunch', done: false },
  { id: 's4', name: 'Vitamin D3', time: 'Morning', done: false },
];

const FitnessContext = createContext<FitnessContextType | undefined>(undefined);

function getTodayDateString(): string {
  return new Date().toISOString().split('T')[0];
}

export function FitnessProvider({ children }: { children: React.ReactNode }) {
  const { cloudData } = useAuth();

  // Try to load from storage
  const loadInitialProfile = () => {
    const saved = storage.get<UserProfile>('kinetic_profile');
    return saved || defaultProfile;
  };

  const loadInitialActivities = () => {
    const saved = storage.get<Activity[]>('kinetic_activities');
    return saved || [];
  };

  const loadWeightHistory = () => {
    const saved = storage.get<WeightEntry[]>('kinetic_weight_history');
    return saved || [];
  };

  const loadMealLogs = () => {
    const saved = storage.get<MealLog[]>('kinetic_meal_logs');
    return saved || [];
  };

  const loadSupplements = () => {
    const saved = storage.get<Supplement[]>('kinetic_supplements');
    return saved || DEFAULT_SUPPLEMENTS;
  };

  const loadGroceryItems = () => {
    const saved = storage.get<GroceryItem[]>('kinetic_grocery_items');
    return saved || [
      { id: 'g1', name: 'Chicken Breast (2 lbs)', category: 'Proteins', checked: false },
      { id: 'g2', name: 'Salmon Fillet (1 lb)', category: 'Proteins', checked: false },
      { id: 'g3', name: 'Eggs (12 ct)', category: 'Proteins', checked: false },
      { id: 'g4', name: 'Greek Yogurt (32 oz)', category: 'Proteins', checked: false },
      { id: 'g5', name: 'Brown Rice (2 lbs)', category: 'Carbs', checked: false },
      { id: 'g6', name: 'Sweet Potatoes (4)', category: 'Carbs', checked: false },
      { id: 'g7', name: 'Oats (32 oz)', category: 'Carbs', checked: false },
      { id: 'g8', name: 'Broccoli (2 heads)', category: 'Veggies', checked: false },
      { id: 'g9', name: 'Spinach (1 bag)', category: 'Veggies', checked: false },
      { id: 'g10', name: 'Avocados (4)', category: 'Veggies', checked: false },
    ];
  };

  const loadStrengthHistory = () => {
    const saved = storage.get<StrengthEntry[]>('kinetic_strength_history');
    return saved || [];
  };

  const loadBodyMeasurements = () => {
    const saved = storage.get<BodyMeasurementEntry[]>('kinetic_body_measurements');
    return saved || [];
  };

  const [profile, setProfile] = useState<UserProfile>(loadInitialProfile);
  const [activities, setActivities] = useState<Activity[]>(loadInitialActivities);
  const [weightHistory, setWeightHistory] = useState<WeightEntry[]>(loadWeightHistory);
  const [mealLogs, setMealLogs] = useState<MealLog[]>(loadMealLogs);
  const [supplements, setSupplements] = useState<Supplement[]>(loadSupplements);
  const [groceryItems, setGroceryItems] = useState<GroceryItem[]>(loadGroceryItems);
  const [strengthHistory, setStrengthHistory] = useState<StrengthEntry[]>(loadStrengthHistory);
  const [bodyMeasurementHistory, setBodyMeasurementHistory] = useState<BodyMeasurementEntry[]>(loadBodyMeasurements);
  const [checkInDismissedDate, setCheckInDismissedDate] = useState<string | null>(() => {
    return storage.get<string>('kinetic_checkin_dismissed');
  });

  // Sync from cloud on load
  useEffect(() => {
    if (cloudData && cloudData.fitness) {
      if (cloudData.fitness.profile) setProfile(cloudData.fitness.profile);
      if (cloudData.fitness.activities) setActivities(cloudData.fitness.activities);
      if (cloudData.fitness.weightHistory) setWeightHistory(cloudData.fitness.weightHistory);
      if (cloudData.fitness.mealLogs) setMealLogs(cloudData.fitness.mealLogs);
      if (cloudData.fitness.supplements) setSupplements(cloudData.fitness.supplements);
      if (cloudData.fitness.groceryItems) setGroceryItems(cloudData.fitness.groceryItems);
      if (cloudData.fitness.strengthHistory) setStrengthHistory(cloudData.fitness.strengthHistory);
      if (cloudData.fitness.bodyMeasurementHistory) setBodyMeasurementHistory(cloudData.fitness.bodyMeasurementHistory);
    }
  }, [cloudData]);

  // Helper to sync everything to cloud
  const syncAll = () => {
    syncToCloud('fitness', { profile, activities, weightHistory, mealLogs, supplements, groceryItems, strengthHistory, bodyMeasurementHistory });
  };

  // Sync with storage and cloud
  useEffect(() => {
    storage.set('kinetic_profile', profile);
    syncAll();
  }, [profile]);

  useEffect(() => {
    storage.set('kinetic_activities', activities);
    syncAll();
  }, [activities]);

  useEffect(() => {
    storage.set('kinetic_weight_history', weightHistory);
    syncAll();
  }, [weightHistory]);

  useEffect(() => {
    storage.set('kinetic_meal_logs', mealLogs);
    syncAll();
  }, [mealLogs]);

  useEffect(() => {
    storage.set('kinetic_supplements', supplements);
    syncAll();
  }, [supplements]);

  useEffect(() => {
    storage.set('kinetic_grocery_items', groceryItems);
    syncAll();
  }, [groceryItems]);

  useEffect(() => {
    storage.set('kinetic_strength_history', strengthHistory);
    syncAll();
  }, [strengthHistory]);

  useEffect(() => {
    storage.set('kinetic_body_measurements', bodyMeasurementHistory);
    syncAll();
  }, [bodyMeasurementHistory]);

  // Calculate daily stats based on today's activities + meals
  const getTodayStats = () => {
    const today = new Date().toDateString();
    let calories = 0, steps = 0, water = 0, sleep = 0, duration = 0;

    activities.forEach(act => {
      const actDate = new Date(act.timestamp).toDateString();
      if (actDate === today) {
        if (act.type === 'Workout') {
          calories += act.caloriesBurned || 0;
          duration += act.value; // duration in mins
        }
        if (act.type === 'Steps') steps += act.value;
        if (act.type === 'Water') water += act.value;
        if (act.type === 'Sleep') sleep += act.value;
      }
    });

    // Calculate consumed macros from today's meals
    let caloriesConsumed = 0, protein = 0, carbs = 0, fat = 0;
    mealLogs.forEach(meal => {
      if (new Date(meal.timestamp).toDateString() === today) {
        caloriesConsumed += meal.calories;
        protein += meal.protein;
        carbs += meal.carbs;
        fat += meal.fat;
      }
    });

    return { calories, caloriesConsumed, steps, water, sleep, duration, protein, carbs, fat };
  };

  const calculateBMI = (weightLbs: number, heightInches: number) => {
    // Formula: (703 x weight in lbs) / (height in inches)^2
    if (!heightInches || !weightLbs) return 0;
    return Number(((703 * weightLbs) / (heightInches * heightInches)).toFixed(1));
  };

  const updateProfile = (updates: Partial<UserProfile>) => {
    setProfile(prev => {
      const next = { ...prev, ...updates };
      // Recalculate BMI if changing weight or height
      if (updates.weight || updates.height) {
        next.bmi = calculateBMI(next.weight, next.height);
      }
      return next;
    });
  };

  const logActivity = (activity: Omit<Activity, 'id' | 'timestamp'>) => {
    const newActivity: Activity = {
      ...activity,
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
    };
    setActivities(prev => [newActivity, ...prev]);
  };

  // ── Weight History ──

  const logWeight = (weight: number) => {
    const today = getTodayDateString();
    setWeightHistory(prev => {
      // Replace today's entry if exists, otherwise add new
      const filtered = prev.filter(e => e.date !== today);
      return [...filtered, { date: today, weight }].sort((a, b) => a.date.localeCompare(b.date));
    });
    // Also update profile weight
    updateProfile({ weight });
    // Clear dismissed state since they just logged
    setCheckInDismissedDate(today);
    storage.set('kinetic_checkin_dismissed', today);
  };

  const needsWeightCheckIn = useMemo(() => {
    const today = getTodayDateString();
    // Check if already logged today
    const loggedToday = weightHistory.some(e => e.date === today);
    if (loggedToday) return false;
    // Check if dismissed today
    if (checkInDismissedDate === today) return false;
    return true;
  }, [weightHistory, checkInDismissedDate]);

  const dismissWeightCheckIn = () => {
    const today = getTodayDateString();
    setCheckInDismissedDate(today);
    storage.set('kinetic_checkin_dismissed', today);
  };

  // ── Meal Logging ──

  const logMeal = (meal: Omit<MealLog, 'id' | 'timestamp'>) => {
    const newMeal: MealLog = {
      ...meal,
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
    };
    setMealLogs(prev => [newMeal, ...prev]);
  };

  const deleteMeal = (id: string) => {
    setMealLogs(prev => prev.filter(m => m.id !== id));
  };

  const todaysMeals = useMemo(() => {
    const today = new Date().toDateString();
    return mealLogs
      .filter(m => new Date(m.timestamp).toDateString() === today)
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  }, [mealLogs]);

  // ── Supplements ──

  const toggleSupplement = (id: string) => {
    setSupplements(prev => prev.map(s => s.id === id ? { ...s, done: !s.done } : s));
  };

  const addSupplement = (name: string, time: string) => {
    setSupplements(prev => [...prev, { id: crypto.randomUUID(), name, time, done: false }]);
  };

  const removeSupplement = (id: string) => {
    setSupplements(prev => prev.filter(s => s.id !== id));
  };

  // ── Grocery ──

  const addGroceryItem = (name: string, category: string) => {
    setGroceryItems(prev => [...prev, { id: crypto.randomUUID(), name, category, checked: false }]);
  };

  const removeGroceryItem = (id: string) => {
    setGroceryItems(prev => prev.filter(g => g.id !== id));
  };

  const toggleGroceryItem = (id: string) => {
    setGroceryItems(prev => prev.map(g => g.id === id ? { ...g, checked: !g.checked } : g));
  };

  const clearCheckedGroceries = () => {
    setGroceryItems(prev => prev.filter(g => !g.checked));
  };

  // ── Strength Tracking ──

  const logStrength = (exercise: string, weight: number, reps: number) => {
    const entry: StrengthEntry = {
      id: crypto.randomUUID(),
      exercise,
      weight,
      reps,
      date: getTodayDateString(),
    };
    setStrengthHistory(prev => [entry, ...prev]);
  };

  const deleteStrength = (id: string) => {
    setStrengthHistory(prev => prev.filter(s => s.id !== id));
  };

  // ── Body Measurements ──

  const logBodyMeasurement = (label: string, value: number, unit: string) => {
    const entry: BodyMeasurementEntry = {
      id: crypto.randomUUID(),
      label,
      value,
      unit,
      date: getTodayDateString(),
    };
    setBodyMeasurementHistory(prev => [entry, ...prev]);
  };

  const deleteBodyMeasurement = (id: string) => {
    setBodyMeasurementHistory(prev => prev.filter(b => b.id !== id));
  };

  // ── Heatmap: real activity data for last 12 weeks ──

  const heatmapData = useMemo(() => {
    const weeks: number[][] = [];
    const now = new Date();
    // Start from 11 weeks ago (Monday), ending at this week
    // Find this week's Monday
    const todayDay = now.getDay(); // 0=Sun, 1=Mon...
    const mondayOffset = todayDay === 0 ? 6 : todayDay - 1;
    const thisMonday = new Date(now);
    thisMonday.setDate(now.getDate() - mondayOffset);
    thisMonday.setHours(0, 0, 0, 0);

    for (let w = 11; w >= 0; w--) {
      const week: number[] = [];
      for (let d = 0; d < 7; d++) {
        const day = new Date(thisMonday);
        day.setDate(thisMonday.getDate() - (w * 7) + d);
        const dayStr = day.toDateString();

        // Don't count future days
        if (day > now) {
          week.push(0);
          continue;
        }

        // Count workouts on this day
        const count = activities.filter(a => {
          return a.type === 'Workout' && new Date(a.timestamp).toDateString() === dayStr;
        }).length;

        week.push(Math.min(count, 3)); // Cap at 3 for visual intensity
      }
      weeks.push(week);
    }
    return weeks;
  }, [activities]);

  return (
    <FitnessContext.Provider value={{
      profile,
      updateProfile,
      activities,
      logActivity,
      dailyStats: getTodayStats(),
      weightHistory,
      logWeight,
      needsWeightCheckIn,
      dismissWeightCheckIn,
      heatmapData,
      mealLogs,
      todaysMeals,
      logMeal,
      deleteMeal,
      supplements,
      toggleSupplement,
      addSupplement,
      removeSupplement,
      groceryItems,
      addGroceryItem,
      removeGroceryItem,
      toggleGroceryItem,
      clearCheckedGroceries,
      strengthHistory,
      logStrength,
      deleteStrength,
      bodyMeasurementHistory,
      logBodyMeasurement,
      deleteBodyMeasurement,
    }}>
      {children}
    </FitnessContext.Provider>
  );
}

export function useFitnessContext() {
  const context = useContext(FitnessContext);
  if (!context) {
    throw new Error('useFitnessContext must be used within a FitnessProvider');
  }
  return context;
}
