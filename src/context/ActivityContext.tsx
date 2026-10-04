// ─────────────────────────────────────────────────────────────
// MyFitAI — ActivityContext & Provider
// Centralized state manager for GPS tracking, activity history,
// personal records, goals, territory cells, XP, and sync queue.
// ─────────────────────────────────────────────────────────────

import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import type {
  Activity,
  ActivityType,
  ActivityPoint,
  ActivitySplit,
  ActivityLap,
  ActivityGoal,
  ActivityPersonalRecord,
  ActivityPreference,
  ActivityAchievement,
  TerritoryCell,
  TerritoryStats,
  GPSQuality,
} from '../types/activity';
import {
  processRouteMetrics,
  calculatePaceSecondsPerKm,
  formatDistance,
  simplifyRoute,
  generateSplits,
  estimateActivityCalories,
  detectActivityPRs,
  applyPrivacyRadius,
  CORE_ACHIEVEMENTS,
} from '../engine/activityCalculations';
import { GPSTracker, type TrackingState } from '../services/activity/gpsTracker';
import { territoryEngine, type TerritoryProcessingResult } from '../services/activity/territoryEngine';
import { activitySyncService } from '../services/activity/ActivitySyncService';
import { db } from '../utils/db';
import { storage } from '../utils/storage';
import { useAuth } from './AuthContext';
import { useFitnessContext } from './FitnessContext';

export interface ActiveSessionState {
  activityId: string;
  type: ActivityType;
  state: TrackingState;
  startTime: number;
  durationSeconds: number;
  movingDurationSeconds: number;
  distanceMeters: number;
  currentPaceSecondsPerKm: number;
  currentSpeedKmh: number;
  elevationGainMeters: number;
  elevationLossMeters: number;
  calories: number;
  points: ActivityPoint[];
  currentLocation: ActivityPoint | null;
  gpsQuality: GPSQuality;
  splits: ActivitySplit[];
  laps: ActivityLap[];
}

interface ActivityContextType {
  // Active Tracking Session
  activeSession: ActiveSessionState | null;
  startTracking: (type: ActivityType) => Promise<boolean>;
  pauseTracking: () => void;
  resumeTracking: () => void;
  stopAndSaveActivity: () => Promise<{ activity: Activity; territoryResult: TerritoryProcessingResult } | null>;
  cancelTracking: () => Promise<void>;
  markLap: () => void;

  // History & Manual Logging
  activities: Activity[];
  deleteActivity: (id: string) => Promise<void>;
  logManualActivity: (data: {
    type: ActivityType;
    title: string;
    distanceMeters: number;
    durationSeconds: number;
    calories?: number;
    elevationGainMeters?: number;
    date?: string;
  }) => Promise<Activity>;

  // Territory & Gamification
  territoryCells: TerritoryCell[];
  territoryStats: TerritoryStats;
  achievements: ActivityAchievement[];
  refreshTerritory: () => Promise<void>;

  // Goals & PRs
  goals: ActivityGoal[];
  createGoal: (params: Omit<ActivityGoal, 'id' | 'currentValue' | 'completed'>) => Promise<void>;
  deleteGoal: (id: string) => Promise<void>;
  personalRecords: ActivityPersonalRecord[];

  // Preferences & Status
  preferences: ActivityPreference;
  updatePreferences: (updates: Partial<ActivityPreference>) => void;
  isOnline: boolean;
  pendingSyncCount: number;
  syncPending: () => Promise<number>;
}

const ActivityContext = createContext<ActivityContextType | undefined>(undefined);

const PREFERENCES_STORAGE_KEY = 'myfitai_activity_preferences';

export function generateIntelligentActivityTitle(
  type: ActivityType,
  distanceMeters: number,
  startTime: Date | number | string,
  unitSystem: 'metric' | 'imperial'
): string {
  const date = new Date(startTime);
  const hours = date.getHours();
  let timeOfDay = 'Morning';

  if (hours >= 4 && hours < 9) timeOfDay = 'Morning';
  else if (hours >= 9 && hours < 12) timeOfDay = 'Midday';
  else if (hours >= 12 && hours < 14) timeOfDay = 'Lunch';
  else if (hours >= 14 && hours < 17) timeOfDay = 'Afternoon';
  else if (hours >= 17 && hours < 20) timeOfDay = 'Sunset';
  else if (hours >= 20 && hours < 23) timeOfDay = 'Evening';
  else timeOfDay = 'Night';

  let sportName = type.charAt(0) + type.slice(1).toLowerCase();
  if (type === 'CYCLING') sportName = 'Ride';
  else if (type === 'RUN') sportName = 'Run';
  else if (type === 'WALK') sportName = 'Walk';
  else if (type === 'HIKING') sportName = 'Hike';
  else if (type === 'SWIMMING') sportName = 'Swim';
  else if (type === 'INDOOR_CYCLING') sportName = 'Spin';
  else if (type === 'TREADMILL') sportName = 'Treadmill';
  else if (type === 'ROWING') sportName = 'Row';

  if (distanceMeters > 50) {
    const formattedDist = formatDistance(distanceMeters, unitSystem);
    return `${timeOfDay} ${sportName} • ${formattedDist}`;
  }
  return `${timeOfDay} ${sportName}`;
}

export function ActivityProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const { profile, logActivity: logFitnessActivity } = useFitnessContext();

  const [activities, setActivities] = useState<Activity[]>([]);
  const [activeSession, setActiveSession] = useState<ActiveSessionState | null>(null);
  const [territoryCells, setTerritoryCells] = useState<TerritoryCell[]>([]);
  const [territoryStats, setTerritoryStats] = useState<TerritoryStats>({
    totalAreaKm2: 0,
    totalCapturedCount: 0,
    totalDefendedCount: 0,
    xp: 0,
    level: 1,
    levelName: 'Explorer',
    achievements: [],
    weeklyAreaKm2: 0,
    monthlyAreaKm2: 0,
  });
  const [achievements, setAchievements] = useState<ActivityAchievement[]>(CORE_ACHIEVEMENTS);
  const [goals, setGoals] = useState<ActivityGoal[]>([]);
  const [personalRecords, setPersonalRecords] = useState<ActivityPersonalRecord[]>([]);
  const [pendingSyncCount, setPendingSyncCount] = useState<number>(0);
  const [isOnline, setIsOnline] = useState<boolean>(typeof navigator !== 'undefined' ? navigator.onLine : true);

  const [preferences, setPreferences] = useState<ActivityPreference>(() => {
    const saved = storage.get(PREFERENCES_STORAGE_KEY);
    if (!saved) {
      return {
        unitSystem: 'metric',
        autoPause: true,
        privacyRadiusMeters: 0,
        voiceFeedback: false,
        countExerciseInNutrition: true,
      };
    }
    return typeof saved === 'string' ? JSON.parse(saved) : (saved as ActivityPreference);
  });

  const gpsTrackerRef = useRef<GPSTracker | null>(null);
  const tickerTimerRef = useRef<any>(null);

  // Monitor Online/Offline status
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      activitySyncService.processQueue().catch(() => {});
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Load user data on startup or user change
  const loadUserData = useCallback(async () => {
    try {
      const [allActs, allGoals, allPRs, cells, stats, syncQueue] = await Promise.all([
        db.activity.activities.getAll(),
        db.activity.goals.getAll(),
        db.activity.prs.getAll(),
        db.activity.territoryCells.getAll(),
        territoryEngine.getTerritoryStats(),
        db.activity.syncQueue.getAll(),
      ]);

      allActs.sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());
      setActivities(allActs);
      setGoals(allGoals);
      setPersonalRecords(allPRs);
      setTerritoryCells(cells);
      setTerritoryStats(stats);
      setPendingSyncCount(syncQueue.length);

      // Map unlocked achievements
      const mappedAch = CORE_ACHIEVEMENTS.map(ach => ({
        ...ach,
        progress: stats.achievements.includes(ach.id) ? ach.maxProgress : 0,
        unlockedAt: stats.achievements.includes(ach.id) ? new Date().toISOString() : undefined,
      }));
      setAchievements(mappedAch);
    } catch (err) {
      console.warn('[ActivityContext] Failed loading activity data:', err);
    }
  }, []);

  useEffect(() => {
    loadUserData();
  }, [loadUserData, user]);

  const updatePreferences = (updates: Partial<ActivityPreference>) => {
    setPreferences(prev => {
      const next = { ...prev, ...updates };
      storage.set(PREFERENCES_STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  };

  // ── Tracking Controls ───────────────────────────────────────

  const startTracking = async (type: ActivityType): Promise<boolean> => {
    const activityId = `act_${Date.now()}`;
    const startTime = Date.now();

    const tracker = new GPSTracker({
      activityId,
      activityType: type,
      autoPauseEnabled: preferences.autoPause,
      onPoint: point => {
        setActiveSession(prev => {
          if (!prev) return null;
          const nextPoints = [...prev.points, point];
          const metrics = processRouteMetrics(nextPoints);
          const weightKg = profile.weight ? profile.weight * 0.453592 : 70;
          const calories = estimateActivityCalories({
            type,
            durationSeconds: prev.durationSeconds,
            weightKg,
            distanceMeters: metrics.distanceMeters,
          });

          const currentPace = calculatePaceSecondsPerKm(
            metrics.distanceMeters,
            prev.durationSeconds
          );
          const speedKmh =
            point.speed !== undefined && point.speed >= 0
              ? Math.round(point.speed * 3.6 * 10) / 10
              : 0;

          return {
            ...prev,
            points: nextPoints,
            currentLocation: point,
            distanceMeters: metrics.distanceMeters,
            elevationGainMeters: metrics.elevationGainMeters,
            elevationLossMeters: metrics.elevationLossMeters,
            calories,
            currentPaceSecondsPerKm: currentPace,
            currentSpeedKmh: speedKmh,
          };
        });
      },
      onStateChange: state => {
        setActiveSession(prev => (prev ? { ...prev, state } : null));
      },
      onGPSQuality: gpsQuality => {
        setActiveSession(prev => (prev ? { ...prev, gpsQuality } : null));
      },
    });

    const ok = await tracker.start();
    if (!ok) return false;

    gpsTrackerRef.current = tracker;

    setActiveSession({
      activityId,
      type,
      state: 'TRACKING',
      startTime,
      durationSeconds: 0,
      movingDurationSeconds: 0,
      distanceMeters: 0,
      currentPaceSecondsPerKm: 0,
      currentSpeedKmh: 0,
      elevationGainMeters: 0,
      elevationLossMeters: 0,
      calories: 0,
      points: [],
      currentLocation: null,
      gpsQuality: 'SEARCHING',
      splits: [],
      laps: [],
    });

    // Start 1-second UI duration ticker
    if (tickerTimerRef.current) clearInterval(tickerTimerRef.current);
    tickerTimerRef.current = setInterval(() => {
      setActiveSession(prev => {
        if (!prev) return null;
        if (prev.state === 'TRACKING') {
          return {
            ...prev,
            durationSeconds: prev.durationSeconds + 1,
            movingDurationSeconds: prev.movingDurationSeconds + 1,
          };
        } else if (prev.state === 'AUTO_PAUSED' || prev.state === 'PAUSED') {
          return {
            ...prev,
            durationSeconds: prev.durationSeconds + 1,
          };
        }
        return prev;
      });
    }, 1000);

    return true;
  };

  const pauseTracking = () => {
    gpsTrackerRef.current?.pause();
  };

  const resumeTracking = () => {
    gpsTrackerRef.current?.resume();
  };

  const markLap = () => {
    setActiveSession(prev => {
      if (!prev) return null;
      const lapIndex = prev.laps.length + 1;
      const totalLapDist = prev.laps.reduce((acc, l) => acc + l.distanceMeters, 0);
      const totalLapTime = prev.laps.reduce((acc, l) => acc + l.durationSeconds, 0);

      const lapDistance = Math.max(0, prev.distanceMeters - totalLapDist);
      const lapDuration = Math.max(1, prev.durationSeconds - totalLapTime);
      const pace = calculatePaceSecondsPerKm(lapDistance, lapDuration);
      const speed = lapDuration > 0 ? (lapDistance / 1000) / (lapDuration / 3600) : 0;

      const newLap: ActivityLap = {
        lapIndex,
        distanceMeters: Math.round(lapDistance),
        durationSeconds: Math.round(lapDuration),
        paceSecondsPerKm: pace,
        speedKmh: Math.round(speed * 10) / 10,
      };

      return {
        ...prev,
        laps: [...prev.laps, newLap],
      };
    });
  };

  const stopAndSaveActivity = async () => {
    if (!activeSession) return null;

    if (tickerTimerRef.current) {
      clearInterval(tickerTimerRef.current);
      tickerTimerRef.current = null;
    }

    const rawPoints = gpsTrackerRef.current?.stop() || activeSession.points;
    await gpsTrackerRef.current?.clearSavedBuffer();
    gpsTrackerRef.current = null;

    // Apply route privacy if enabled
    const processedPoints =
      preferences.privacyRadiusMeters > 0
        ? applyPrivacyRadius(rawPoints, preferences.privacyRadiusMeters)
        : rawPoints;

    const metrics = processRouteMetrics(processedPoints);
    const simplifiedPoints = simplifyRoute(processedPoints, 6);
    const splits = generateSplits(processedPoints, preferences.unitSystem);

    const now = new Date();
    const nowISO = now.toISOString();
    const dateStr = nowISO.split('T')[0];
    const weightKg = profile.weight ? profile.weight * 0.453592 : 70;
    const finalCalories =
      activeSession.calories ||
      estimateActivityCalories({
        type: activeSession.type,
        durationSeconds: activeSession.durationSeconds,
        weightKg,
        distanceMeters: metrics.distanceMeters,
      });

    // Detect PRs
    const detectedPRs = detectActivityPRs({
      activityId: activeSession.activityId,
      activityType: activeSession.type,
      distanceMeters: metrics.distanceMeters,
      durationSeconds: activeSession.durationSeconds,
      elevationGainMeters: metrics.elevationGainMeters,
      points: processedPoints,
      date: dateStr,
      existingPRs: personalRecords,
    });

    const averagePace = calculatePaceSecondsPerKm(
      metrics.distanceMeters,
      activeSession.durationSeconds
    );
    const averageSpeedKmh =
      activeSession.durationSeconds > 0
        ? Math.round(((metrics.distanceMeters / 1000) / (activeSession.durationSeconds / 3600)) * 10) / 10
        : 0;

    const title = generateIntelligentActivityTitle(
      activeSession.type,
      metrics.distanceMeters,
      activeSession.startTime,
      preferences.unitSystem
    );

    const newActivity: Activity = {
      id: activeSession.activityId,
      userId: user?.uid || 'guest',
      type: activeSession.type,
      title,
      startTime: new Date(activeSession.startTime).toISOString(),
      endTime: nowISO,
      durationSeconds: activeSession.durationSeconds,
      movingDurationSeconds: activeSession.movingDurationSeconds || activeSession.durationSeconds,
      distanceMeters: metrics.distanceMeters,
      averagePaceSecondsPerKm: averagePace,
      averageSpeedKmh: averageSpeedKmh,
      maxSpeedKmh: activeSession.currentSpeedKmh || averageSpeedKmh,
      elevationGainMeters: metrics.elevationGainMeters,
      elevationLossMeters: metrics.elevationLossMeters,
      calories: finalCalories,
      route: {
        points: processedPoints,
        distanceMeters: metrics.distanceMeters,
        elevationGainMeters: metrics.elevationGainMeters,
        elevationLossMeters: metrics.elevationLossMeters,
        simplifiedPoints,
      },
      splits,
      laps: activeSession.laps,
      personalRecords: detectedPRs,
      source: 'GPS',
      createdAt: nowISO,
      updatedAt: nowISO,
    };

    // 1. Process Territory, XP, and Achievements
    const territoryResult = await territoryEngine.processActivity(newActivity, territoryCells);

    newActivity.territoryCapturedKm2 = territoryResult.newAreaKm2;
    newActivity.territoryDefendedCount = territoryResult.defendedCount;
    newActivity.xpEarned = territoryResult.xpEarned;

    // 2. Persist Activity & PRs to IndexedDB
    await db.activity.activities.save(newActivity);
    if (detectedPRs.length > 0) {
      await db.activity.prs.saveMany(detectedPRs);
      setPersonalRecords(prev => [...detectedPRs, ...prev]);
    }

    // 3. Connect to FitnessContext timeline & daily calorie burn
    try {
      logFitnessActivity({
        type: newActivity.type === 'RUN' ? 'Running' : newActivity.type === 'CYCLING' ? 'Cycling' : 'Walking',
        value: Math.max(1, Math.round(newActivity.durationSeconds / 60)),
        caloriesBurned: newActivity.calories,
      });
    } catch {
      // Non-fatal
    }

    // 4. Local-first storage + queue single cost-efficient cloud sync with polyline compression
    await activitySyncService.finalizeAndQueueActivity(newActivity, {
      ...territoryStats,
      totalAreaKm2: territoryResult.totalAreaKm2,
      xp: territoryResult.totalXP,
      level: territoryResult.level,
      levelName: territoryResult.levelName,
    });

    setActiveSession(null);
    await loadUserData();

    return { activity: newActivity, territoryResult };
  };

  const cancelTracking = async () => {
    if (tickerTimerRef.current) {
      clearInterval(tickerTimerRef.current);
      tickerTimerRef.current = null;
    }
    await gpsTrackerRef.current?.clearSavedBuffer();
    gpsTrackerRef.current?.stop();
    gpsTrackerRef.current = null;
    setActiveSession(null);
  };

  const deleteActivity = async (id: string) => {
    await db.activity.activities.delete(id);
    setActivities(prev => prev.filter(a => a.id !== id));
  };

  const logManualActivity = async (data: {
    type: ActivityType;
    title: string;
    distanceMeters: number;
    durationSeconds: number;
    calories?: number;
    elevationGainMeters?: number;
    date?: string;
  }): Promise<Activity> => {
    const now = new Date();
    const nowISO = now.toISOString();
    const dateStr = data.date || nowISO.split('T')[0];

    const weightKg = profile.weight ? profile.weight * 0.453592 : 70;
    const cals =
      data.calories ||
      estimateActivityCalories({
        type: data.type,
        durationSeconds: data.durationSeconds,
        weightKg,
        distanceMeters: data.distanceMeters,
      });

    const pace = calculatePaceSecondsPerKm(data.distanceMeters, data.durationSeconds);
    const speed =
      data.durationSeconds > 0
        ? Math.round(((data.distanceMeters / 1000) / (data.durationSeconds / 3600)) * 10) / 10
        : 0;

    const activity: Activity = {
      id: `act_manual_${Date.now()}`,
      userId: user?.uid || 'guest',
      type: data.type,
      title:
        data.title ||
        generateIntelligentActivityTitle(
          data.type,
          data.distanceMeters,
          now,
          preferences.unitSystem
        ),
      startTime: `${dateStr}T10:00:00.000Z`,
      endTime: `${dateStr}T10:30:00.000Z`,
      durationSeconds: data.durationSeconds,
      movingDurationSeconds: data.durationSeconds,
      distanceMeters: data.distanceMeters,
      averagePaceSecondsPerKm: pace,
      averageSpeedKmh: speed,
      maxSpeedKmh: speed,
      elevationGainMeters: data.elevationGainMeters || 0,
      elevationLossMeters: 0,
      calories: cals,
      source: 'MANUAL',
      createdAt: nowISO,
      updatedAt: nowISO,
    };

    await db.activity.activities.save(activity);
    try {
      logFitnessActivity({
        type: activity.type === 'RUN' ? 'Running' : 'Activity',
        value: Math.max(1, Math.round(activity.durationSeconds / 60)),
        caloriesBurned: activity.calories,
      });
    } catch {
      // Non-fatal
    }

    setActivities(prev => [activity, ...prev]);
    return activity;
  };

  const createGoal = async (params: Omit<ActivityGoal, 'id' | 'currentValue' | 'completed'>) => {
    const goal: ActivityGoal = {
      ...params,
      id: `goal_${Date.now()}`,
      currentValue: 0,
      completed: false,
    };
    await db.activity.goals.save(goal);
    setGoals(prev => [goal, ...prev]);
  };

  const deleteGoal = async (id: string) => {
    await db.activity.goals.delete(id);
    setGoals(prev => prev.filter(g => g.id !== id));
  };

  const syncPending = async (): Promise<number> => {
    const count = await activitySyncService.processQueue();
    const queue = await db.activity.syncQueue.getAll();
    setPendingSyncCount(queue.length);
    return count;
  };

  return (
    <ActivityContext.Provider
      value={{
        activeSession,
        startTracking,
        pauseTracking,
        resumeTracking,
        stopAndSaveActivity,
        cancelTracking,
        markLap,
        activities,
        deleteActivity,
        logManualActivity,
        territoryCells,
        territoryStats,
        achievements,
        refreshTerritory: loadUserData,
        goals,
        createGoal,
        deleteGoal,
        personalRecords,
        preferences,
        updatePreferences,
        isOnline,
        pendingSyncCount,
        syncPending,
      }}
    >
      {children}
    </ActivityContext.Provider>
  );
}

export function useActivity(): ActivityContextType {
  const context = useContext(ActivityContext);
  if (!context) {
    throw new Error('useActivity must be used within an ActivityProvider');
  }
  return context;
}
