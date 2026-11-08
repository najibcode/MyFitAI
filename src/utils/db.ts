// ─────────────────────────────────────────────────────────────
// MyFitAI — IndexedDB Wrapper (v4 — Workout + Nutrition + Activity/Territory Engine)
// Stores: workoutSessions, workoutTemplates, exercises,
// programs, routines, scheduleOverrides, personalRecords,
// nutritionMealEntries, nutritionCustomFoods, nutritionRecipes,
// nutritionMealTemplates, nutritionWaterLogs, nutritionWeightLogs,
// nutritionFastingSessions, nutritionFoodCache,
// activities, activityRawRoutes, activityGoals, activityPRs,
// territoryCells, territoryStats, activitySyncQueue
// ─────────────────────────────────────────────────────────────

import type { WorkoutSession, WorkoutTemplate, Routine, ScheduleOverride, PRRecord } from '../types/workout';
import type { Exercise } from '../types/exercise';
import type { Program } from '../types/program';
import type {
  MealEntry,
  FoodItem,
  Recipe,
  MealTemplate,
  WaterLogEntry,
  NutritionWeightEntry,
  FastingSession,
} from '../types/nutrition';
import type {
  Activity,
  ActivityPoint,
  ActivityGoal,
  ActivityPersonalRecord,
  TerritoryCell,
  TerritoryStats,
  ActivityType,
} from '../types/activity';
import { auth } from '../services/firebase';

const BASE_DB_NAME = 'myfitai_db';
const DB_VERSION = 4;

const STORES = {
  sessions: 'workoutSessions',
  templates: 'workoutTemplates',
  exercises: 'exercises',
  programs: 'programs',
  routines: 'routines',
  scheduleOverrides: 'scheduleOverrides',
  personalRecords: 'personalRecords',
  // Nutrition Stores (v3)
  mealEntries: 'nutritionMealEntries',
  customFoods: 'nutritionCustomFoods',
  recipes: 'nutritionRecipes',
  mealTemplates: 'nutritionMealTemplates',
  waterLogs: 'nutritionWaterLogs',
  weightLogs: 'nutritionWeightLogs',
  fastingSessions: 'nutritionFastingSessions',
  foodCache: 'nutritionFoodCache',
  // Activity & Territory Stores (v4)
  activities: 'activities',
  activityRawRoutes: 'activityRawRoutes',
  activityGoals: 'activityGoals',
  activityPRs: 'activityPRs',
  territoryCells: 'territoryCells',
  territoryStats: 'territoryStats',
  activitySyncQueue: 'activitySyncQueue',
} as const;

/** Cached database connection per user */
const dbCache = new Map<string, IDBDatabase>();

/**
 * Open (or create) the IndexedDB database.
 * Caches the connection for reuse. Database name is scoped by user UID.
 */
function getDB(): Promise<IDBDatabase> {
  const uid = auth.currentUser?.uid || 'guest';
  const dbName = `${BASE_DB_NAME}_${uid}`;

  if (dbCache.has(dbName)) {
    return Promise.resolve(dbCache.get(dbName)!);
  }

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(dbName, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const database = request.result;
      const oldVersion = event.oldVersion;

      // v1 stores
      if (oldVersion < 1) {
        if (!database.objectStoreNames.contains(STORES.sessions)) {
          const store = database.createObjectStore(STORES.sessions, { keyPath: 'id' });
          store.createIndex('startedAt', 'startedAt', { unique: false });
          store.createIndex('templateId', 'templateId', { unique: false });
        }
        if (!database.objectStoreNames.contains(STORES.templates)) {
          database.createObjectStore(STORES.templates, { keyPath: 'id' });
        }
        if (!database.objectStoreNames.contains(STORES.exercises)) {
          database.createObjectStore(STORES.exercises, { keyPath: 'id' });
        }
        if (!database.objectStoreNames.contains(STORES.programs)) {
          database.createObjectStore(STORES.programs, { keyPath: 'id' });
        }
      }

      // v2 stores — workout engine
      if (oldVersion < 2) {
        if (!database.objectStoreNames.contains(STORES.routines)) {
          database.createObjectStore(STORES.routines, { keyPath: 'id' });
        }
        if (!database.objectStoreNames.contains(STORES.scheduleOverrides)) {
          const store = database.createObjectStore(STORES.scheduleOverrides, { keyPath: 'id' });
          store.createIndex('date', 'date', { unique: false });
        }
        if (!database.objectStoreNames.contains(STORES.personalRecords)) {
          const store = database.createObjectStore(STORES.personalRecords, { keyPath: 'id' });
          store.createIndex('exerciseId', 'exerciseId', { unique: false });
        }

        // Add exerciseType index to sessions if upgrading
        if (database.objectStoreNames.contains(STORES.sessions)) {
          const tx = (event.target as IDBOpenDBRequest).transaction!;
          const sessionStore = tx.objectStore(STORES.sessions);
          if (!sessionStore.indexNames.contains('endedAt')) {
            sessionStore.createIndex('endedAt', 'endedAt', { unique: false });
          }
        }
      }

      // v3 stores — complete nutrition engine
      if (oldVersion < 3) {
        if (!database.objectStoreNames.contains(STORES.mealEntries)) {
          const store = database.createObjectStore(STORES.mealEntries, { keyPath: 'id' });
          store.createIndex('date', 'date', { unique: false });
          store.createIndex('mealType', 'mealType', { unique: false });
        }
        if (!database.objectStoreNames.contains(STORES.customFoods)) {
          const store = database.createObjectStore(STORES.customFoods, { keyPath: 'id' });
          store.createIndex('name', 'name', { unique: false });
          store.createIndex('barcode', 'barcode', { unique: false });
        }
        if (!database.objectStoreNames.contains(STORES.recipes)) {
          const store = database.createObjectStore(STORES.recipes, { keyPath: 'id' });
          store.createIndex('name', 'name', { unique: false });
        }
        if (!database.objectStoreNames.contains(STORES.mealTemplates)) {
          const store = database.createObjectStore(STORES.mealTemplates, { keyPath: 'id' });
          store.createIndex('mealType', 'mealType', { unique: false });
        }
        if (!database.objectStoreNames.contains(STORES.waterLogs)) {
          const store = database.createObjectStore(STORES.waterLogs, { keyPath: 'id' });
          store.createIndex('date', 'date', { unique: false });
        }
        if (!database.objectStoreNames.contains(STORES.weightLogs)) {
          const store = database.createObjectStore(STORES.weightLogs, { keyPath: 'id' });
          store.createIndex('date', 'date', { unique: false });
        }
        if (!database.objectStoreNames.contains(STORES.fastingSessions)) {
          const store = database.createObjectStore(STORES.fastingSessions, { keyPath: 'id' });
          store.createIndex('status', 'status', { unique: false });
        }
        if (!database.objectStoreNames.contains(STORES.foodCache)) {
          const store = database.createObjectStore(STORES.foodCache, { keyPath: 'id' });
          store.createIndex('barcode', 'barcode', { unique: false });
        }
      }

      // v4 stores — Activity, GPS & Territory Engine
      if (oldVersion < 4) {
        if (!database.objectStoreNames.contains(STORES.activities)) {
          const store = database.createObjectStore(STORES.activities, { keyPath: 'id' });
          store.createIndex('startTime', 'startTime', { unique: false });
          store.createIndex('type', 'type', { unique: false });
          store.createIndex('synced', 'synced', { unique: false });
        }
        if (!database.objectStoreNames.contains(STORES.activityRawRoutes)) {
          database.createObjectStore(STORES.activityRawRoutes, { keyPath: 'activityId' });
        }
        if (!database.objectStoreNames.contains(STORES.activityGoals)) {
          const store = database.createObjectStore(STORES.activityGoals, { keyPath: 'id' });
          store.createIndex('period', 'period', { unique: false });
          store.createIndex('completed', 'completed', { unique: false });
        }
        if (!database.objectStoreNames.contains(STORES.activityPRs)) {
          const store = database.createObjectStore(STORES.activityPRs, { keyPath: 'id' });
          store.createIndex('activityType', 'activityType', { unique: false });
          store.createIndex('category', 'category', { unique: false });
        }
        if (!database.objectStoreNames.contains(STORES.territoryCells)) {
          const store = database.createObjectStore(STORES.territoryCells, { keyPath: 'cellId' });
          store.createIndex('ownerId', 'ownerId', { unique: false });
          store.createIndex('gridKey', 'gridKey', { unique: false });
        }
        if (!database.objectStoreNames.contains(STORES.territoryStats)) {
          database.createObjectStore(STORES.territoryStats, { keyPath: 'id' });
        }
        if (!database.objectStoreNames.contains(STORES.activitySyncQueue)) {
          const store = database.createObjectStore(STORES.activitySyncQueue, { keyPath: 'id' });
          store.createIndex('createdAt', 'createdAt', { unique: false });
        }
      }
    };

    request.onsuccess = () => {
      const database = request.result;
      dbCache.set(dbName, database);

      database.onclose = () => {
        dbCache.delete(dbName);
      };

      resolve(database);
    };

    request.onerror = () => {
      console.error(`[db] Failed to open IndexedDB ${dbName}:`, request.error);
      reject(request.error);
    };
  });
}

// ─── Generic CRUD Helpers ──────────────────────────────────

async function getAll<T>(storeName: string): Promise<T[]> {
  const database = await getDB();
  return new Promise((resolve, reject) => {
    const tx = database.transaction(storeName, 'readonly');
    const store = tx.objectStore(storeName);
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result as T[]);
    request.onerror = () => reject(request.error);
  });
}

async function getById<T>(storeName: string, id: string): Promise<T | undefined> {
  const database = await getDB();
  return new Promise((resolve, reject) => {
    const tx = database.transaction(storeName, 'readonly');
    const store = tx.objectStore(storeName);
    const request = store.get(id);
    request.onsuccess = () => resolve(request.result as T | undefined);
    request.onerror = () => reject(request.error);
  });
}

async function save<T>(storeName: string, item: T): Promise<void> {
  const database = await getDB();
  return new Promise((resolve, reject) => {
    const tx = database.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    const request = store.put(item);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

async function saveMany<T>(storeName: string, items: T[]): Promise<void> {
  const database = await getDB();
  return new Promise((resolve, reject) => {
    const tx = database.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    for (const item of items) {
      store.put(item);
    }
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function deleteById(storeName: string, id: string): Promise<void> {
  const database = await getDB();
  return new Promise((resolve, reject) => {
    const tx = database.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    const request = store.delete(id);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

async function getByIndex<T>(
  storeName: string,
  indexName: string,
  range: IDBKeyRange
): Promise<T[]> {
  const database = await getDB();
  return new Promise((resolve, reject) => {
    const tx = database.transaction(storeName, 'readonly');
    const store = tx.objectStore(storeName);
    const index = store.index(indexName);
    const request = index.getAll(range);
    request.onsuccess = () => resolve(request.result as T[]);
    request.onerror = () => reject(request.error);
  });
}

async function clearStore(storeName: string): Promise<void> {
  const database = await getDB();
  return new Promise((resolve, reject) => {
    const tx = database.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    const request = store.clear();
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

async function count(storeName: string): Promise<number> {
  const database = await getDB();
  return new Promise((resolve, reject) => {
    const tx = database.transaction(storeName, 'readonly');
    const store = tx.objectStore(storeName);
    const request = store.count();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// ─── Public API ────────────────────────────────────────────

export const db = {
  sessions: {
    getAll: () => getAll<WorkoutSession>(STORES.sessions),
    getById: (id: string) => getById<WorkoutSession>(STORES.sessions, id),
    save: (session: WorkoutSession) => save(STORES.sessions, session),
    saveMany: (sessions: WorkoutSession[]) => saveMany(STORES.sessions, sessions),
    delete: (id: string) => deleteById(STORES.sessions, id),
    clear: () => clearStore(STORES.sessions),
    count: () => count(STORES.sessions),

    /** Get sessions within a date range (inclusive) */
    getByDateRange: (start: Date, end: Date) =>
      getByIndex<WorkoutSession>(
        STORES.sessions,
        'startedAt',
        IDBKeyRange.bound(start.toISOString(), end.toISOString())
      ),

    /** Get sessions for a specific template */
    getByTemplate: (templateId: string) =>
      getByIndex<WorkoutSession>(
        STORES.sessions,
        'templateId',
        IDBKeyRange.only(templateId)
      ),
  },

  templates: {
    getAll: () => getAll<WorkoutTemplate>(STORES.templates),
    getById: (id: string) => getById<WorkoutTemplate>(STORES.templates, id),
    save: (template: WorkoutTemplate) => save(STORES.templates, template),
    saveMany: (templates: WorkoutTemplate[]) => saveMany(STORES.templates, templates),
    delete: (id: string) => deleteById(STORES.templates, id),
    clear: () => clearStore(STORES.templates),
  },

  exercises: {
    getAll: () => getAll<Exercise>(STORES.exercises),
    getById: (id: string) => getById<Exercise>(STORES.exercises, id),
    save: (exercise: Exercise) => save(STORES.exercises, exercise),
    saveMany: (exercises: Exercise[]) => saveMany(STORES.exercises, exercises),
    delete: (id: string) => deleteById(STORES.exercises, id),
    clear: () => clearStore(STORES.exercises),
  },

  programs: {
    getAll: () => getAll<Program>(STORES.programs),
    getById: (id: string) => getById<Program>(STORES.programs, id),
    save: (program: Program) => save(STORES.programs, program),
    delete: (id: string) => deleteById(STORES.programs, id),
    clear: () => clearStore(STORES.programs),
  },

  routines: {
    getAll: () => getAll<Routine>(STORES.routines),
    getById: (id: string) => getById<Routine>(STORES.routines, id),
    save: (routine: Routine) => save(STORES.routines, routine),
    delete: (id: string) => deleteById(STORES.routines, id),
    clear: () => clearStore(STORES.routines),
  },

  scheduleOverrides: {
    getAll: () => getAll<ScheduleOverride>(STORES.scheduleOverrides),
    getByDate: (date: string) =>
      getByIndex<ScheduleOverride>(
        STORES.scheduleOverrides,
        'date',
        IDBKeyRange.only(date)
      ),
    save: (override: ScheduleOverride) => save(STORES.scheduleOverrides, override),
    delete: (id: string) => deleteById(STORES.scheduleOverrides, id),
    clear: () => clearStore(STORES.scheduleOverrides),
  },

  personalRecords: {
    getAll: () => getAll<PRRecord & { id: string }>(STORES.personalRecords),
    getByExercise: (exerciseId: string) =>
      getByIndex<PRRecord & { id: string }>(
        STORES.personalRecords,
        'exerciseId',
        IDBKeyRange.only(exerciseId)
      ),
    save: (pr: PRRecord & { id: string }) => save(STORES.personalRecords, pr),
    saveMany: (prs: (PRRecord & { id: string })[]) => saveMany(STORES.personalRecords, prs),
    delete: (id: string) => deleteById(STORES.personalRecords, id),
    clear: () => clearStore(STORES.personalRecords),
  },

  // ─── Nutrition API (v3) ──────────────────────────────────
  nutrition: {
    mealEntries: {
      getAll: () => getAll<MealEntry>(STORES.mealEntries),
      getById: (id: string) => getById<MealEntry>(STORES.mealEntries, id),
      getByDate: (date: string) =>
        getByIndex<MealEntry>(STORES.mealEntries, 'date', IDBKeyRange.only(date)),
      save: (entry: MealEntry) => save(STORES.mealEntries, entry),
      saveMany: (entries: MealEntry[]) => saveMany(STORES.mealEntries, entries),
      delete: (id: string) => deleteById(STORES.mealEntries, id),
      clear: () => clearStore(STORES.mealEntries),
    },

    customFoods: {
      getAll: () => getAll<FoodItem>(STORES.customFoods),
      getById: (id: string) => getById<FoodItem>(STORES.customFoods, id),
      getByBarcode: async (barcode: string) => {
        const items = await getByIndex<FoodItem>(
          STORES.customFoods,
          'barcode',
          IDBKeyRange.only(barcode)
        );
        return items[0] || null;
      },
      save: (food: FoodItem) => save(STORES.customFoods, food),
      saveMany: (foods: FoodItem[]) => saveMany(STORES.customFoods, foods),
      delete: (id: string) => deleteById(STORES.customFoods, id),
      clear: () => clearStore(STORES.customFoods),
    },

    recipes: {
      getAll: () => getAll<Recipe>(STORES.recipes),
      getById: (id: string) => getById<Recipe>(STORES.recipes, id),
      save: (recipe: Recipe) => save(STORES.recipes, recipe),
      saveMany: (recipes: Recipe[]) => saveMany(STORES.recipes, recipes),
      delete: (id: string) => deleteById(STORES.recipes, id),
      clear: () => clearStore(STORES.recipes),
    },

    mealTemplates: {
      getAll: () => getAll<MealTemplate>(STORES.mealTemplates),
      getById: (id: string) => getById<MealTemplate>(STORES.mealTemplates, id),
      save: (template: MealTemplate) => save(STORES.mealTemplates, template),
      saveMany: (templates: MealTemplate[]) => saveMany(STORES.mealTemplates, templates),
      delete: (id: string) => deleteById(STORES.mealTemplates, id),
      clear: () => clearStore(STORES.mealTemplates),
    },

    waterLogs: {
      getAll: () => getAll<WaterLogEntry>(STORES.waterLogs),
      getByDate: (date: string) =>
        getByIndex<WaterLogEntry>(STORES.waterLogs, 'date', IDBKeyRange.only(date)),
      save: (entry: WaterLogEntry) => save(STORES.waterLogs, entry),
      saveMany: (entries: WaterLogEntry[]) => saveMany(STORES.waterLogs, entries),
      delete: (id: string) => deleteById(STORES.waterLogs, id),
      clear: () => clearStore(STORES.waterLogs),
    },

    weightLogs: {
      getAll: () => getAll<NutritionWeightEntry>(STORES.weightLogs),
      getByDate: (date: string) =>
        getByIndex<NutritionWeightEntry>(STORES.weightLogs, 'date', IDBKeyRange.only(date)),
      save: (entry: NutritionWeightEntry) => save(STORES.weightLogs, entry),
      saveMany: (entries: NutritionWeightEntry[]) => saveMany(STORES.weightLogs, entries),
      delete: (id: string) => deleteById(STORES.weightLogs, id),
      clear: () => clearStore(STORES.weightLogs),
    },

    fastingSessions: {
      getAll: () => getAll<FastingSession>(STORES.fastingSessions),
      getActive: async () => {
        const sessions = await getByIndex<FastingSession>(
          STORES.fastingSessions,
          'status',
          IDBKeyRange.only('active')
        );
        return sessions[0] || null;
      },
      save: (session: FastingSession) => save(STORES.fastingSessions, session),
      delete: (id: string) => deleteById(STORES.fastingSessions, id),
      clear: () => clearStore(STORES.fastingSessions),
    },

    foodCache: {
      get: (id: string) => getById<FoodItem>(STORES.foodCache, id),
      getByBarcode: async (barcode: string) => {
        const items = await getByIndex<FoodItem>(
          STORES.foodCache,
          'barcode',
          IDBKeyRange.only(barcode)
        );
        return items[0] || null;
      },
      save: (food: FoodItem) => save(STORES.foodCache, food),
      saveMany: (foods: FoodItem[]) => saveMany(STORES.foodCache, foods),
    },
  },

  // ─── Activity & Territory Engine Methods (v4) ────────────
  activity: {
    activities: {
      getAll: () => getAll<Activity>(STORES.activities),
      getById: (id: string) => getById<Activity>(STORES.activities, id),
      save: (activity: Activity) => save<Activity>(STORES.activities, activity),
      saveMany: (activities: Activity[]) => saveMany<Activity>(STORES.activities, activities),
      delete: (id: string) => deleteById(STORES.activities, id),
      getByType: (type: ActivityType) =>
        getByIndex<Activity>(STORES.activities, 'type', IDBKeyRange.only(type)),
      clear: () => clearStore(STORES.activities),
    },

    rawRoutes: {
      get: (activityId: string) =>
        getById<{ activityId: string; points: ActivityPoint[]; updatedAt: string }>(
          STORES.activityRawRoutes,
          activityId
        ),
      save: (data: { activityId: string; points: ActivityPoint[]; updatedAt: string }) =>
        save(STORES.activityRawRoutes, data),
      delete: (activityId: string) => deleteById(STORES.activityRawRoutes, activityId),
      clear: () => clearStore(STORES.activityRawRoutes),
    },

    goals: {
      getAll: () => getAll<ActivityGoal>(STORES.activityGoals),
      save: (goal: ActivityGoal) => save<ActivityGoal>(STORES.activityGoals, goal),
      saveMany: (goals: ActivityGoal[]) => saveMany<ActivityGoal>(STORES.activityGoals, goals),
      delete: (id: string) => deleteById(STORES.activityGoals, id),
      clear: () => clearStore(STORES.activityGoals),
    },

    prs: {
      getAll: () => getAll<ActivityPersonalRecord>(STORES.activityPRs),
      saveMany: (prs: ActivityPersonalRecord[]) =>
        saveMany<ActivityPersonalRecord>(STORES.activityPRs, prs),
      delete: (id: string) => deleteById(STORES.activityPRs, id),
      clear: () => clearStore(STORES.activityPRs),
    },

    territoryCells: {
      getAll: () => getAll<TerritoryCell>(STORES.territoryCells),
      saveMany: (cells: TerritoryCell[]) => saveMany<TerritoryCell>(STORES.territoryCells, cells),
      clear: () => clearStore(STORES.territoryCells),
    },

    territoryStats: {
      get: () =>
        getById<TerritoryStats & { id: string }>(STORES.territoryStats, 'user_territory_stats'),
      save: (stats: TerritoryStats) =>
        save(STORES.territoryStats, { ...stats, id: 'user_territory_stats' }),
      clear: () => clearStore(STORES.territoryStats),
    },

    syncQueue: {
      getAll: () =>
        getAll<{ id: string; action: string; payload: unknown; createdAt: string }>(
          STORES.activitySyncQueue
        ),
      enqueue: (item: { id: string; action: string; payload: unknown; createdAt: string }) =>
        save(STORES.activitySyncQueue, item),
      dequeue: (id: string) => deleteById(STORES.activitySyncQueue, id),
      clear: () => clearStore(STORES.activitySyncQueue),
    },
  },

  syncQueue: {
    getAll: () =>
      getAll<{ id: string; action: string; payload: unknown; createdAt: string }>(
        STORES.activitySyncQueue
      ),
    enqueue: (item: { id: string; action: string; payload: unknown; createdAt: string }) =>
      save(STORES.activitySyncQueue, item),
    dequeue: (id: string) => deleteById(STORES.activitySyncQueue, id),
    clear: () => clearStore(STORES.activitySyncQueue),
  },

  /** Export all data (workout + nutrition + activity) for backup */
  exportAll: async () => {
    const [
      sessions, templates, exercises, programs, routines, overrides, prs,
      mealEntries, customFoods, recipes, mealTemplates, waterLogs, weightLogs, fastingSessions,
      activities, activityGoals, activityPRs, territoryCells, territoryStats
    ] = await Promise.all([
      getAll<WorkoutSession>(STORES.sessions),
      getAll<WorkoutTemplate>(STORES.templates),
      getAll<Exercise>(STORES.exercises),
      getAll<Program>(STORES.programs),
      getAll<Routine>(STORES.routines),
      getAll<ScheduleOverride>(STORES.scheduleOverrides),
      getAll<PRRecord & { id: string }>(STORES.personalRecords),
      // Nutrition stores
      getAll<MealEntry>(STORES.mealEntries),
      getAll<FoodItem>(STORES.customFoods),
      getAll<Recipe>(STORES.recipes),
      getAll<MealTemplate>(STORES.mealTemplates),
      getAll<WaterLogEntry>(STORES.waterLogs),
      getAll<NutritionWeightEntry>(STORES.weightLogs),
      getAll<FastingSession>(STORES.fastingSessions),
      // Activity stores
      getAll<Activity>(STORES.activities),
      getAll<ActivityGoal>(STORES.activityGoals),
      getAll<ActivityPersonalRecord>(STORES.activityPRs),
      getAll<TerritoryCell>(STORES.territoryCells),
      getById<TerritoryStats & { id: string }>(STORES.territoryStats, 'user_territory_stats'),
    ]);

    return {
      version: DB_VERSION,
      exportedAt: new Date().toISOString(),
      workout: {
        sessions, templates, exercises, programs, routines,
        scheduleOverrides: overrides, personalRecords: prs,
      },
      nutrition: {
        mealEntries, customFoods, recipes, mealTemplates,
        waterLogs, weightLogs, fastingSessions,
      },
      activity: {
        activities, activityGoals, activityPRs, territoryCells, territoryStats,
      },
    };
  },

  /** Import data from backup (merge, never overwrite existing without validation) */
  importAll: async (data: {
    sessions?: WorkoutSession[];
    templates?: WorkoutTemplate[];
    exercises?: Exercise[];
    programs?: Program[];
    routines?: Routine[];
    scheduleOverrides?: ScheduleOverride[];
    personalRecords?: (PRRecord & { id: string })[];
    nutrition?: {
      mealEntries?: MealEntry[];
      customFoods?: FoodItem[];
      recipes?: Recipe[];
      mealTemplates?: MealTemplate[];
      waterLogs?: WaterLogEntry[];
      weightLogs?: NutritionWeightEntry[];
      fastingSessions?: FastingSession[];
    };
    activity?: {
      activities?: Activity[];
      activityGoals?: ActivityGoal[];
      activityPRs?: ActivityPersonalRecord[];
      territoryCells?: TerritoryCell[];
      territoryStats?: TerritoryStats;
    };
  }) => {
    if (data.sessions) await saveMany(STORES.sessions, data.sessions);
    if (data.templates) await saveMany(STORES.templates, data.templates);
    if (data.exercises) await saveMany(STORES.exercises, data.exercises);
    if (data.programs) await saveMany(STORES.programs, data.programs);
    if (data.routines) await saveMany(STORES.routines, data.routines);
    if (data.scheduleOverrides) await saveMany(STORES.scheduleOverrides, data.scheduleOverrides);
    if (data.personalRecords) await saveMany(STORES.personalRecords, data.personalRecords);

    if (data.nutrition) {
      const n = data.nutrition;
      if (n.mealEntries) await saveMany(STORES.mealEntries, n.mealEntries);
      if (n.customFoods) await saveMany(STORES.customFoods, n.customFoods);
      if (n.recipes) await saveMany(STORES.recipes, n.recipes);
      if (n.mealTemplates) await saveMany(STORES.mealTemplates, n.mealTemplates);
      if (n.waterLogs) await saveMany(STORES.waterLogs, n.waterLogs);
      if (n.weightLogs) await saveMany(STORES.weightLogs, n.weightLogs);
      if (n.fastingSessions) await saveMany(STORES.fastingSessions, n.fastingSessions);
    }

    if (data.activity) {
      const a = data.activity;
      if (a.activities) await saveMany(STORES.activities, a.activities);
      if (a.activityGoals) await saveMany(STORES.activityGoals, a.activityGoals);
      if (a.activityPRs) await saveMany(STORES.activityPRs, a.activityPRs);
      if (a.territoryCells) await saveMany(STORES.territoryCells, a.territoryCells);
      if (a.territoryStats) await save(STORES.territoryStats, { ...a.territoryStats, id: 'user_territory_stats' });
    }
  },
};
