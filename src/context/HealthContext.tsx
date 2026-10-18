// ─────────────────────────────────────────────────────────────
// MyFitAI — HealthContext & Provider
// Orchestrates native Health Connect / HealthKit data pipeline:
// - Automatic sync on app open & screen focus
// - Local offline caching with instant restoration
// - User-scoped Firebase cloud synchronization
// - Conflict resolution (imported health data prioritized over manual)
// - Permission lifecycle management (granted, denied, revoked)
// ─────────────────────────────────────────────────────────────

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import type {
  DailyHealthRecord,
  HealthSyncStatus,
  HealthPermissionState,
  HealthPlatform,
} from '../types/health';
import { healthService } from '../services/health/healthService';
import {
  formatLocalDayKey,
  calculateSleepScore,
  calculateDailyReadiness,
} from '../engine/healthCalculations';
import { useAuth } from './AuthContext';
import { useFitnessContext } from './FitnessContext';
import { db as firestoreDb } from '../services/firebase';
import { doc, setDoc } from 'firebase/firestore';
import { activityTrackingService } from '../services/activity/ActivityTrackingService';

export interface HealthContextType {
  status: HealthSyncStatus;
  isAvailable: boolean;
  isConnected: boolean;
  isSyncing: boolean;
  platform: 'android' | 'ios' | 'web';
  platformName: string;
  hasAnyPermission: boolean;
  permissions: HealthPermissionState;
  lastSyncedAt: string | null;
  todayHealth: DailyHealthRecord | null;
  weeklySteps: Array<{ date: string; steps: number; goal: number; source: HealthPlatform }>;
  weeklySleep: Array<{ date: string; durationMinutes: number; score?: number; source: HealthPlatform }>;
  syncNow: () => Promise<void>;
  syncHealth: () => Promise<void>;
  connectHealth: () => Promise<boolean>;
  disconnectHealth: () => Promise<void>;
  openPlatformSettings: () => Promise<void>;
  runDiagnostics: () => Promise<{
    available: boolean;
    reason?: string;
    permissions: { steps: boolean; sleep: boolean };
    todaySteps: number;
    todaySleepMinutes: number;
    sourceApps: string[];
    logs: string[];
  }>;
  logManualSteps: (steps: number) => Promise<void>;
  logManualSleep: (minutes: number) => Promise<void>;
}

const HealthContext = createContext<HealthContextType | undefined>(undefined);

const HEALTH_CONNECTED_KEY = 'myfitai_health_connected';
const HEALTH_CACHE_KEY_PREFIX = 'myfitai_health_cache_';

export function HealthProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const { profile } = useFitnessContext();

  const platform = healthService.getPlatform();
  const platformName = healthService.getPlatformDisplayName();

  const [status, setStatus] = useState<HealthSyncStatus>({
    isAvailable: false,
    isConnected: false,
    isSyncing: false,
    platform,
    platformName,
    error: null,
    lastSyncedAt: null,
    permissions: { steps: false, sleep: false },
  });

  const [todayHealth, setTodayHealth] = useState<DailyHealthRecord | null>(null);
  const [weeklySteps, setWeeklySteps] = useState<Array<{ date: string; steps: number; goal: number; source: HealthPlatform }>>([]);
  const [weeklySleep, setWeeklySleep] = useState<Array<{ date: string; durationMinutes: number; score?: number; source: HealthPlatform }>>([]);

  const isSyncingRef = useRef(false);

  const getStorageKey = useCallback(() => {
    const uid = user?.uid || 'guest';
    return `${HEALTH_CACHE_KEY_PREFIX}${uid}`;
  }, [user?.uid]);

  // Load local cache immediately on startup (Offline Support - Requirement 32)
  useEffect(() => {
    try {
      const savedConnected = localStorage.getItem(HEALTH_CONNECTED_KEY) === 'true';
      const cachedDataRaw = localStorage.getItem(getStorageKey());
      if (cachedDataRaw) {
        const cached = JSON.parse(cachedDataRaw);
        if (cached.todayRecord) setTodayHealth(cached.todayRecord);
        if (cached.weeklySteps) setWeeklySteps(cached.weeklySteps);
        if (cached.weeklySleep) setWeeklySleep(cached.weeklySleep);
      }
      setStatus(prev => ({
        ...prev,
        isConnected: savedConnected,
      }));
    } catch (e) {
      console.warn('[HealthContext] Error reading local health cache:', e);
    }
  }, [getStorageKey]);

  // Save to local cache
  const persistLocalCache = useCallback((record: DailyHealthRecord, wSteps: typeof weeklySteps, wSleep: typeof weeklySleep) => {
    try {
      localStorage.setItem(
        getStorageKey(),
        JSON.stringify({
          todayRecord: record,
          weeklySteps: wSteps,
          weeklySleep: wSleep,
          savedAt: new Date().toISOString(),
        })
      );
    } catch (e) {
      console.warn('[HealthContext] Error saving local health cache:', e);
    }
  }, [getStorageKey]);

  // Sync to Firebase Firestore (users/{userId}/health/{date})
  const syncToFirestore = useCallback(async (record: DailyHealthRecord) => {
    if (!user || user.uid === 'guest') return;

    try {
      const healthDocRef = doc(firestoreDb, `users/${user.uid}/health/${record.date}`);
      // Strip undefined fields to comply with Firestore document restrictions
      const sanitizedRecord = JSON.parse(JSON.stringify(record));
      await setDoc(healthDocRef, {
        ...sanitizedRecord,
        userId: user.uid,
        updatedAt: new Date().toISOString(),
      }, { merge: true });
    } catch (err) {
      console.warn('[HealthContext] Firestore sync deferred (network offline or permission check):', err);
    }
  }, [user]);

  /**
   * Main synchronization execution:
   * 1. Check availability & permissions
   * 2. Query aggregated steps & sleep sessions
   * 3. Compute readiness & sleep scores
   * 4. Update local state, cache, and cloud
   */
  const syncNow = useCallback(async () => {
    if (isSyncingRef.current) return;
    isSyncingRef.current = true;

    setStatus(prev => ({ ...prev, isSyncing: true, error: null }));

    try {
      const todayKey = formatLocalDayKey(new Date());
      const avail = await healthService.checkAvailability();

      if (!avail.available) {
        setStatus(prev => ({
          ...prev,
          isAvailable: false,
          isSyncing: false,
          error: avail.reason || null,
        }));
        return;
      }

      const perms = await healthService.checkPermissions();
      const hasAnyPerm = perms.steps || perms.sleep;

      // Handle revoked permissions (Requirement 19 & 31)
      if (!hasAnyPerm && status.isConnected) {
        setStatus(prev => ({
          ...prev,
          isAvailable: true,
          isConnected: false,
          isSyncing: false,
          permissions: perms,
          error: 'Health data access was disconnected. Reconnect to automatically update steps and sleep.',
        }));
        localStorage.setItem(HEALTH_CONNECTED_KEY, 'false');
        return;
      }

      setStatus(prev => ({
        ...prev,
        isAvailable: true,
        isConnected: hasAnyPerm,
        permissions: perms,
      }));

      if (hasAnyPerm) {
        localStorage.setItem(HEALTH_CONNECTED_KEY, 'true');
      }

      if (!hasAnyPerm) {
        setStatus(prev => ({ ...prev, isSyncing: false }));
        return;
      }

      // Fetch native health record
      const stepGoal = profile.dailyStepGoal || 10000;
      const sleepGoalHours = profile.dailySleepGoal || 8;

      const record = await healthService.fetchDailyHealthRecord(
        todayKey,
        stepGoal,
        sleepGoalHours
      );

      if (record) {
        // Reconcile with native ActivityTrackingService without double counting
        activityTrackingService.reconcileWithHealthProvider(record.steps, record.source);

        // Conflict resolution: If today's existing record is a manual override and has higher steps, keep manual note
        setTodayHealth(prev => {
          if (prev?.manualOverride && prev.steps > record.steps) {
            return {
              ...record,
              steps: prev.steps,
              source: 'manual',
              manualOverride: true,
            };
          }
          return record;
        });

        // Fetch 7-day step history
        const historicalSteps = await healthService.fetchHistoricalSteps(7, stepGoal);
        setWeeklySteps(historicalSteps);

        // Build 7-day sleep history
        const weekSleepArr: Array<{ date: string; durationMinutes: number; score?: number; source: HealthPlatform }> = [];
        const todayDate = new Date();
        for (let i = 6; i >= 0; i--) {
          const d = new Date(todayDate);
          d.setDate(todayDate.getDate() - i);
          const dKey = formatLocalDayKey(d);

          if (dKey === todayKey) {
            weekSleepArr.push({
              date: dKey,
              durationMinutes: record.sleepDurationMinutes,
              score: record.sleepScore,
              source: record.source,
            });
          } else {
            const [y, m, dayNum] = dKey.split('-').map(Number);
            const nightBefore = new Date(y, m - 1, dayNum - 1);
            const nightBeforeKey = formatLocalDayKey(nightBefore);
            let nightSleep = await healthService.fetchNightSleep(nightBeforeKey);
            if (nightSleep.durationMinutes === 0) {
              nightSleep = await healthService.fetchNightSleep(dKey);
            }
            const nightScore = nightSleep.durationMinutes > 0
              ? calculateSleepScore(nightSleep.durationMinutes, Math.round(sleepGoalHours * 60), nightSleep.stages).score
              : undefined;
            weekSleepArr.push({
              date: dKey,
              durationMinutes: nightSleep.durationMinutes,
              score: nightScore,
              source: record.source,
            });
          }
        }
        setWeeklySleep(weekSleepArr);

        // Persist locally & to cloud
        persistLocalCache(record, historicalSteps, weekSleepArr);
        await syncToFirestore(record);
      }

      setStatus(prev => ({
        ...prev,
        isSyncing: false,
        lastSyncedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        error: null,
      }));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.warn('[HealthContext] Health sync failed:', msg);
      setStatus(prev => ({
        ...prev,
        isSyncing: false,
        error: 'Could not access device health data. Your cached MyFitAI data is safe.',
      }));
    } finally {
      isSyncingRef.current = false;
    }
  }, [profile.dailyStepGoal, profile.dailySleepGoal, status.isConnected, persistLocalCache, syncToFirestore]);

  // Connect health flow
  const connectHealth = useCallback(async (): Promise<boolean> => {
    setStatus(prev => ({ ...prev, isSyncing: true, error: null }));
    try {
      const res = await healthService.requestPermissions();
      if (res.granted) {
        localStorage.setItem(HEALTH_CONNECTED_KEY, 'true');
        setStatus(prev => ({
          ...prev,
          isConnected: true,
          permissions: { steps: res.steps, sleep: res.sleep },
        }));
        await syncNow();
        return true;
      } else {
        setStatus(prev => ({
          ...prev,
          isConnected: false,
          error: res.error || 'Health permissions were not granted.',
        }));
        return false;
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setStatus(prev => ({
        ...prev,
        isConnected: false,
        error: msg,
      }));
      return false;
    } finally {
      setStatus(prev => ({ ...prev, isSyncing: false }));
    }
  }, [syncNow]);

  // Disconnect health flow
  const disconnectHealth = useCallback(async () => {
    localStorage.setItem(HEALTH_CONNECTED_KEY, 'false');
    setStatus(prev => ({
      ...prev,
      isConnected: false,
      permissions: { steps: false, sleep: false },
    }));
  }, []);

  const openPlatformSettings = useCallback(async () => {
    await healthService.openHealthSettings();
  }, []);

  // Manual fallback for steps
  const logManualSteps = useCallback(async (steps: number) => {
    const todayKey = formatLocalDayKey(new Date());
    const stepGoal = profile.dailyStepGoal || 10000;
    const sleepGoalMinutes = Math.round((profile.dailySleepGoal || 8) * 60);

    setTodayHealth(prev => {
      const base = prev || {
        date: todayKey,
        steps: 0,
        stepGoal,
        sleepDurationMinutes: 0,
        sleepGoalMinutes,
        source: 'manual' as HealthPlatform,
        lastSyncedAt: new Date().toISOString(),
      };

      const updated: DailyHealthRecord = {
        ...base,
        steps,
        source: 'manual',
        manualOverride: true,
        lastSyncedAt: new Date().toISOString(),
      };

      activityTrackingService.reconcileWithHealthProvider(steps, 'manual');

      persistLocalCache(updated, weeklySteps, weeklySleep);
      syncToFirestore(updated).catch(() => {});
      return updated;
    });
  }, [profile.dailyStepGoal, profile.dailySleepGoal, persistLocalCache, syncToFirestore, weeklySteps, weeklySleep]);

  // Manual fallback for sleep
  const logManualSleep = useCallback(async (minutes: number) => {
    const todayKey = formatLocalDayKey(new Date());
    const stepGoal = profile.dailyStepGoal || 10000;
    const sleepGoalMinutes = Math.round((profile.dailySleepGoal || 8) * 60);
    const score = calculateSleepScore(minutes, sleepGoalMinutes).score;

    setTodayHealth(prev => {
      const base = prev || {
        date: todayKey,
        steps: 0,
        stepGoal,
        sleepDurationMinutes: 0,
        sleepGoalMinutes,
        source: 'manual' as HealthPlatform,
        lastSyncedAt: new Date().toISOString(),
      };

      const readiness = calculateDailyReadiness({
        sleepDurationMinutes: minutes,
        sleepGoalMinutes,
        sleepScore: score,
        muscleRecoveryPercentage: 85,
        steps: base.steps,
        stepGoal,
      });

      const updated: DailyHealthRecord = {
        ...base,
        sleepDurationMinutes: minutes,
        sleepScore: score,
        readinessScore: readiness.score,
        source: 'manual',
        manualOverride: true,
        lastSyncedAt: new Date().toISOString(),
      };

      persistLocalCache(updated, weeklySteps, weeklySleep);
      syncToFirestore(updated).catch(() => {});
      return updated;
    });
  }, [profile.dailyStepGoal, profile.dailySleepGoal, persistLocalCache, syncToFirestore, weeklySteps, weeklySleep]);

  // Initial Auto-Sync (Requirement 15: App Opens -> Check -> Fetch -> Update)
  useEffect(() => {
    syncNow();
  }, [syncNow]);

  // Screen Focus / Visibility Auto-Sync (Requirement 15)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        syncNow();
      }
    };

    window.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', syncNow);
    return () => {
      window.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', syncNow);
    };
  }, [syncNow]);

  return (
    <HealthContext.Provider
      value={{
        status,
        isAvailable: status.isAvailable,
        isConnected: status.isConnected,
        isSyncing: status.isSyncing,
        platform: status.platform,
        platformName: status.platformName,
        hasAnyPermission: status.isConnected || status.permissions.steps || status.permissions.sleep,
        permissions: status.permissions,
        lastSyncedAt: status.lastSyncedAt,
        todayHealth,
        weeklySteps,
        weeklySleep,
        syncNow,
        syncHealth: syncNow,
        connectHealth,
        disconnectHealth,
        openPlatformSettings,
        runDiagnostics: () => healthService.runDiagnostics(),
        logManualSteps,
        logManualSleep,
      }}
    >
      {children}
    </HealthContext.Provider>
  );
}

export function useHealth() {
  const context = useContext(HealthContext);
  if (!context) {
    throw new Error('useHealth must be used within a HealthProvider');
  }
  return context;
}
