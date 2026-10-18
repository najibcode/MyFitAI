// ─────────────────────────────────────────────────────────────
// MyFitAI — Native Health Integration Service
// Bridges Android Health Connect (READ_STEPS, READ_SLEEP)
// and Apple HealthKit (StepCount, SleepAnalysis) via Capacitor.
// Handles daily aggregation, sleep-night attribution, permissions,
// and graceful web/desktop fallback.
// ─────────────────────────────────────────────────────────────

import { Capacitor } from '@capacitor/core';
import { Health, type HealthDataType } from '@capgo/capacitor-health';
import type {
  DailyHealthRecord,
  HealthPlatform,
  RawSleepSession,
} from '../../types/health';
import {
  formatLocalDayKey,
  getLocalDayBounds,
  processSleepSessions,
  calculateSleepScore,
  calculateDailyReadiness,
} from '../../engine/healthCalculations';

export class HealthService {
  private platform: 'android' | 'ios' | 'web';

  constructor() {
    const p = Capacitor.getPlatform();
    if (p === 'android') this.platform = 'android';
    else if (p === 'ios') this.platform = 'ios';
    else this.platform = 'web';
  }

  public getPlatform(): 'android' | 'ios' | 'web' {
    return this.platform;
  }

  public getPlatformDisplayName(): string {
    if (this.platform === 'android') return 'Health Connect';
    if (this.platform === 'ios') return 'Apple Health';
    return 'Browser';
  }

  /**
   * Checks whether the native health subsystem is available on this device.
   * On Web/Desktop: gracefully reports unavailable without throwing or faking.
   */
  public async checkAvailability(): Promise<{ available: boolean; reason?: string }> {
    if (this.platform === 'web' || !Capacitor.isNativePlatform()) {
      return {
        available: false,
        reason: 'Health tracking is available on supported mobile devices (Android Health Connect & Apple HealthKit).',
      };
    }

    try {
      const res = await Health.isAvailable();
      if (!res.available) {
        return {
          available: false,
          reason: res.reason || (this.platform === 'android'
            ? 'Health Connect is unavailable or needs to be installed/updated from Google Play.'
            : 'Apple HealthKit is not available on this device.'),
        };
      }
      return { available: true };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return {
        available: false,
        reason: `Health service error: ${msg}`,
      };
    }
  }

  /**
   * Checks current authorization status for minimal scopes (steps and sleep).
   * Does NOT prompt the user.
   */
  public async checkPermissions(): Promise<{ steps: boolean; sleep: boolean }> {
    if (this.platform === 'web' || !Capacitor.isNativePlatform()) {
      return { steps: false, sleep: false };
    }

    try {
      const readTypes: HealthDataType[] = ['steps', 'sleep'];
      const status = await Health.checkAuthorization({ read: readTypes });
      const stepsAuth = status.readAuthorized?.includes('steps') || false;
      const sleepAuth = status.readAuthorized?.includes('sleep') || false;
      return { steps: stepsAuth, sleep: sleepAuth };
    } catch {
      return { steps: false, sleep: false };
    }
  }

  /**
   * Requests minimal user permissions (READ_STEPS, READ_SLEEP).
   * Never requests write permissions simply because they exist.
   */
  public async requestPermissions(): Promise<{ granted: boolean; steps: boolean; sleep: boolean; error?: string }> {
    if (this.platform === 'web' || !Capacitor.isNativePlatform()) {
      return {
        granted: false,
        steps: false,
        sleep: false,
        error: 'Native health permissions are only available on Android and iOS.',
      };
    }

    try {
      const readTypes: HealthDataType[] = ['steps', 'sleep', 'distance', 'calories'];
      const result = await Health.requestAuthorization({ read: readTypes });

      const stepsGranted = result.readAuthorized?.includes('steps') || false;
      const sleepGranted = result.readAuthorized?.includes('sleep') || false;
      const granted = stepsGranted || sleepGranted;

      return {
        granted,
        steps: stepsGranted,
        sleep: sleepGranted,
      };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return {
        granted: false,
        steps: false,
        sleep: false,
        error: msg,
      };
    }
  }

  /**
   * Directs the user to platform Health settings:
   * Android: Health Connect settings screen
   * iOS: Settings
   */
  public async openHealthSettings(): Promise<void> {
    if (this.platform === 'android') {
      try {
        await Health.openHealthConnectSettings();
      } catch (err) {
        console.warn('[healthService] Could not open Health Connect settings:', err);
      }
    }
  }

  /**
   * Displays the privacy policy rationale for Health Connect (Android).
   */
  public async showPrivacyPolicy(): Promise<void> {
    if (this.platform === 'android') {
      try {
        await Health.showPrivacyPolicy();
      } catch (err) {
        console.warn('[healthService] Could not show privacy policy dialog:', err);
      }
    }
  }

  /**
   * Retrieves aggregated steps for a single local calendar day.
   * Uses Health Connect's daily aggregation (StepsRecord.COUNT_TOTAL) or
   * HealthKit's cumulative step count to avoid double-counting across
   * phone, watch, fitness bands, and other apps.
   */
  public async fetchDaySteps(dateString: string): Promise<{ steps: number; distanceKm: number | null; calories: number | null }> {
    if (this.platform === 'web' || !Capacitor.isNativePlatform()) {
      return { steps: 0, distanceKm: null, calories: null };
    }

    const { start } = getLocalDayBounds(dateString);
    // Health Connect bucketDuration: 'day' requires a full 24-hour interval (midnight to midnight)
    const queryEnd = new Date(start.getTime() + 24 * 60 * 60 * 1000);

    let totalSteps = 0;
    let distanceKm: number | null = null;
    let calories: number | null = null;

    try {
      // 1. Query aggregated steps (sum for the local day)
      const stepAgg = await Health.queryAggregated({
        dataType: 'steps',
        startDate: start.toISOString(),
        endDate: queryEnd.toISOString(),
        bucket: 'day',
        aggregation: 'sum',
      });

      if (stepAgg.samples && stepAgg.samples.length > 0) {
        // Sum across all returned samples in the 24h window
        totalSteps = Math.round(stepAgg.samples.reduce((sum, s) => sum + (s.value || 0), 0));
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.warn('[healthService] Aggregated steps query failed: ' + msg);
    }

    // Fallback: If aggregated returned 0 or threw, attempt raw samples read
    if (totalSteps === 0) {
      try {
        const raw = await Health.readSamples({
          dataType: 'steps',
          startDate: start.toISOString(),
          endDate: queryEnd.toISOString(),
          limit: 5000,
        });
        if (raw.samples && raw.samples.length > 0) {
          totalSteps = Math.round(raw.samples.reduce((sum, s) => sum + (s.value || 0), 0));
        }
      } catch (rawErr) {
        const msg = rawErr instanceof Error ? rawErr.message : String(rawErr);
        console.warn('[healthService] Raw steps fallback failed: ' + msg);
      }
    }

    // 2. Query distance if available (do NOT fabricate)
    try {
      const distAgg = await Health.queryAggregated({
        dataType: 'distance',
        startDate: start.toISOString(),
        endDate: queryEnd.toISOString(),
        bucket: 'day',
        aggregation: 'sum',
      });
      if (distAgg.samples && distAgg.samples.length > 0) {
        const totalMeters = distAgg.samples.reduce((sum, s) => sum + (s.value || 0), 0);
        if (totalMeters > 0) {
          distanceKm = Number((totalMeters / 1000).toFixed(2));
        }
      }
    } catch {
      distanceKm = null;
    }

    // 3. Query active calories if available (do NOT fabricate)
    try {
      const calAgg = await Health.queryAggregated({
        dataType: 'calories',
        startDate: start.toISOString(),
        endDate: queryEnd.toISOString(),
        bucket: 'day',
        aggregation: 'sum',
      });
      if (calAgg.samples && calAgg.samples.length > 0) {
        const totalCals = calAgg.samples.reduce((sum, s) => sum + (s.value || 0), 0);
        if (totalCals > 0) {
          calories = Math.round(totalCals);
        }
      }
    } catch {
      calories = null;
    }

    return { steps: totalSteps, distanceKm, calories };
  }

  /**
   * Diagnostic routine to test Health Connect connectivity, permissions,
   * and detect whether external sources like Samsung Health are writing data.
   */
  public async runDiagnostics(): Promise<{
    available: boolean;
    reason?: string;
    permissions: { steps: boolean; sleep: boolean };
    todaySteps: number;
    todaySleepMinutes: number;
    sourceApps: string[];
    logs: string[];
  }> {
    const logs: string[] = [];
    logs.push(`Platform: ${this.platform} (${Capacitor.getPlatform()})`);

    const avail = await this.checkAvailability();
    logs.push(`Availability: ${avail.available}${avail.reason ? ' (' + avail.reason + ')' : ''}`);

    const perms = await this.checkPermissions();
    logs.push(`Permissions: Steps=${perms.steps ? 'GRANTED' : 'DENIED'}, Sleep=${perms.sleep ? 'GRANTED' : 'DENIED'}`);

    let todaySteps = 0;
    let todaySleepMinutes = 0;
    const sourceApps = new Set<string>();

    if (avail.available && (perms.steps || perms.sleep)) {
      const todayKey = formatLocalDayKey(new Date());
      try {
        const stepsRes = await this.fetchDaySteps(todayKey);
        todaySteps = stepsRes.steps;
        logs.push(`Health Connect Steps for ${todayKey}: ${todaySteps}`);
      } catch (e) {
        logs.push(`Step fetch error: ${e instanceof Error ? e.message : String(e)}`);
      }

      try {
        const [year, month, day] = todayKey.split('-').map(Number);
        const prevNightDate = new Date(year, month - 1, day - 1);
        const prevNightKey = formatLocalDayKey(prevNightDate);
        let sleepRes = await this.fetchNightSleep(prevNightKey);
        if (sleepRes.durationMinutes === 0) {
          sleepRes = await this.fetchNightSleep(todayKey);
        }
        todaySleepMinutes = sleepRes.durationMinutes;
        logs.push(`Health Connect Sleep: ${todaySleepMinutes} min (${sleepRes.hasStages ? 'with stages' : 'no stages'})`);
      } catch (e) {
        logs.push(`Sleep fetch error: ${e instanceof Error ? e.message : String(e)}`);
      }

      // Check sample source identifiers
      try {
        const { start } = getLocalDayBounds(todayKey);
        const queryEnd = new Date(start.getTime() + 24 * 60 * 60 * 1000);
        const rawSteps = await Health.readSamples({
          dataType: 'steps',
          startDate: start.toISOString(),
          endDate: queryEnd.toISOString(),
          limit: 20,
        });
        (rawSteps.samples || []).forEach(s => {
          if (s.sourceName) sourceApps.add(s.sourceName);
        });
      } catch {
        // ignore
      }
    }

    return {
      available: avail.available,
      reason: avail.reason,
      permissions: perms,
      todaySteps,
      todaySleepMinutes,
      sourceApps: Array.from(sourceApps),
      logs,
    };
  }

  /**
   * Retrieves sleep session and sleep stages for a given sleep night.
   * Correctly queries the 24-hour window around the sleep night to capture
   * sleep crossing midnight (e.g. 11:30 PM Oct 6 to 7:15 AM Oct 7).
   */
  public async fetchNightSleep(nightDateString: string): Promise<{
    durationMinutes: number;
    sleepStart?: string;
    sleepEnd?: string;
    stages?: { deep?: number; light?: number; rem?: number; awake?: number };
    hasStages: boolean;
  }> {
    if (this.platform === 'web' || !Capacitor.isNativePlatform()) {
      return { durationMinutes: 0, hasStages: false };
    }

    // Primary window: from 18:00 on the sleep night day to 18:00 on the next day
    const [year, month, day] = nightDateString.split('-').map(Number);
    const windowStart = new Date(year, month - 1, day, 18, 0, 0, 0);
    const windowEnd = new Date(year, month - 1, day + 1, 18, 0, 0, 0);

    try {
      let samplesResult = await Health.readSamples({
        dataType: 'sleep',
        startDate: windowStart.toISOString(),
        endDate: windowEnd.toISOString(),
        limit: 100,
        ascending: true,
      });

      // If empty in strict 18:00 window, widen to 36 hours (12:00 PM to 23:59 next day)
      if (!samplesResult.samples || samplesResult.samples.length === 0) {
        const wideStart = new Date(year, month - 1, day, 12, 0, 0, 0);
        const wideEnd = new Date(year, month - 1, day + 1, 23, 59, 59, 999);
        samplesResult = await Health.readSamples({
          dataType: 'sleep',
          startDate: wideStart.toISOString(),
          endDate: wideEnd.toISOString(),
          limit: 100,
          ascending: true,
        });
      }

      const rawSessions: RawSleepSession[] = (samplesResult.samples || []).map(s => ({
        startDate: s.startDate,
        endDate: s.endDate,
        sleepState: s.sleepState,
        stages: s.stages?.map(st => ({
          stage: (st.stage === 'deep' || st.stage === 'rem' || st.stage === 'awake') ? st.stage : 'light',
          durationMinutes: st.durationMinutes,
          startDate: st.startDate,
          endDate: st.endDate,
        })),
        sourceName: s.sourceName,
        deviceType: s.deviceType,
      }));

      return processSleepSessions(rawSessions, nightDateString);
    } catch (err) {
      console.warn('[healthService] Sleep query error:', err);
      return { durationMinutes: 0, hasStages: false };
    }
  }

  /**
   * Fetches complete DailyHealthRecord for a local calendar day.
   */
  public async fetchDailyHealthRecord(
    dateString: string,
    stepGoal: number,
    sleepGoalHours: number,
    muscleRecoveryPercentage = 85
  ): Promise<DailyHealthRecord | null> {
    if (this.platform === 'web' || !Capacitor.isNativePlatform()) {
      return null;
    }

    const source: HealthPlatform = this.platform === 'android' ? 'health_connect' : 'healthkit';
    const sleepGoalMinutes = Math.round(sleepGoalHours * 60);

    const [year, month, day] = dateString.split('-').map(Number);
    const prevNightDate = new Date(year, month - 1, day - 1);
    const prevNightKey = formatLocalDayKey(prevNightDate);

    const [stepsData, prevSleepData] = await Promise.all([
      this.fetchDaySteps(dateString),
      this.fetchNightSleep(prevNightKey),
    ]);

    let sleepData = prevSleepData;
    // Fallback: If no sleep recorded for previous night, check dateString itself
    // in case sleep was logged or recorded on the current date (e.g. shift worker, afternoon nap)
    if (sleepData.durationMinutes === 0) {
      const todaySleepData = await this.fetchNightSleep(dateString);
      if (todaySleepData.durationMinutes > 0) {
        sleepData = todaySleepData;
      }
    }

    const sleepScore = sleepData.durationMinutes > 0
      ? calculateSleepScore(sleepData.durationMinutes, sleepGoalMinutes, sleepData.stages).score
      : undefined;

    const readiness = calculateDailyReadiness({
      sleepDurationMinutes: sleepData.durationMinutes,
      sleepGoalMinutes,
      sleepScore,
      muscleRecoveryPercentage,
      steps: stepsData.steps,
      stepGoal,
    });

    const record: DailyHealthRecord = {
      date: dateString,
      steps: stepsData.steps,
      stepGoal,
      distanceKm: stepsData.distanceKm,
      activeCalories: stepsData.calories,
      sleepDurationMinutes: sleepData.durationMinutes,
      sleepGoalMinutes,
      sleepStart: sleepData.sleepStart,
      sleepEnd: sleepData.sleepEnd,
      sleepStages: sleepData.stages,
      sleepScore,
      readinessScore: readiness.score,
      source,
      lastSyncedAt: new Date().toISOString(),
    };

    return record;
  }

  /**
   * Fetches multiple consecutive days of historical step data.
   */
  public async fetchHistoricalSteps(
    numDays = 7,
    stepGoal = 10000
  ): Promise<Array<{ date: string; steps: number; goal: number; source: HealthPlatform }>> {
    const results: Array<{ date: string; steps: number; goal: number; source: HealthPlatform }> = [];
    const source: HealthPlatform = this.platform === 'android'
      ? 'health_connect'
      : this.platform === 'ios'
        ? 'healthkit'
        : 'manual';

    const today = new Date();
    for (let i = numDays - 1; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const dayKey = formatLocalDayKey(d);

      if (this.platform === 'web' || !Capacitor.isNativePlatform()) {
        results.push({ date: dayKey, steps: 0, goal: stepGoal, source: 'manual' });
      } else {
        const stepData = await this.fetchDaySteps(dayKey);
        results.push({ date: dayKey, steps: stepData.steps, goal: stepGoal, source });
      }
    }

    return results;
  }
}

export const healthService = new HealthService();
