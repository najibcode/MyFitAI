// ─────────────────────────────────────────────────────────────
// MyFitAI — Native Real-Time Step Counter & Activity Tracking Engine
// Strava-inspired live activity tracking using native hardware pedometers
// (Sensor.TYPE_STEP_COUNTER / TYPE_STEP_DETECTOR on Android, CMPedometer on iOS).
//
// Critical Architectural Rules:
// 1. NEVER derives steps from GPS alone.
// 2. Hardware motion sensors are primary; Health Connect / HealthKit are reconciliation.
// 3. Local midnight calendar day boundary maintenance.
// 4. Handles device reboots & sensor counter resets without data loss.
// 5. 100% offline-first with persistent local baseline and Firestore sync.
// 6. Zero fake setInterval step generators.
// ─────────────────────────────────────────────────────────────

import { registerPlugin, Capacitor } from '@capacitor/core';
import { formatLocalDayKey } from '../../engine/healthCalculations';
import { db as firestoreDb } from '../firebase';
import { doc, setDoc } from 'firebase/firestore';

export interface PedometerPluginInterface {
  isAvailable(): Promise<{ available: boolean; hasStepCounter: boolean; hasStepDetector: boolean }>;
  checkPermission(): Promise<{ granted: boolean }>;
  requestPermission(): Promise<{ granted: boolean }>;
  startStepTracking(): Promise<{ tracking: boolean; lastRawSteps: number; baselineSteps: number; rebootOffset: number }>;
  stopStepTracking(): Promise<{ tracking: boolean }>;
  getSensorStatus(): Promise<{ isListening: boolean; available: boolean; lastRawSteps: number; baselineSteps: number; rebootOffset: number }>;
  setBaseline(options: { baseline: number; rebootOffset?: number }): Promise<{ success: boolean; baselineSteps: number; rebootOffset: number }>;
  addListener(
    eventName: 'stepEvent',
    listenerFunc: (data: {
      type: 'step_counter' | 'step_detector';
      rawSteps?: number;
      baselineSteps?: number;
      rebootOffset?: number;
      steps?: number;
      timestamp: number;
    }) => void
  ): Promise<{ remove: () => Promise<void> }>;
}

const Pedometer = registerPlugin<PedometerPluginInterface>('Pedometer');

export interface ActivityEngineState {
  isTracking: boolean;
  isAvailable: boolean;
  hasPermission: boolean;
  dateKey: string;
  dailySteps: number;
  deviceSteps: number;
  reconciledSteps: number;
  stepGoal: number;
  source: 'phone_sensor' | 'health_reconciled' | 'fallback';
  distanceMeters: number;
  isEstimatedDistance: boolean;
  activeMinutes: number;
  sessionSteps: number; // Steps accumulated during an ongoing walk/run session
  lastRawSensorSteps: number;
  sensorBaseline: number;
  rebootOffset: number;
  lastUpdated: number;
}

const STORAGE_KEY_STATE = 'myfitai_pedometer_engine_state_v1';
const STORAGE_KEY_HISTORY_PREFIX = 'myfitai_step_history_';

type StateListener = (state: ActivityEngineState) => void;

class ActivityTrackingServiceImpl {
  private state: ActivityEngineState;
  private listeners: Set<StateListener> = new Set();
  private isInitialized = false;
  private sessionBaselineSteps: number | null = null;
  private pluginListenerHandle: { remove: () => Promise<void> } | null = null;
  private userHeightCm = 175; // Default height for stride calculation
  private currentUserId: string | null = null;
  private dayCheckInterval: ReturnType<typeof setInterval> | null = null;

  constructor() {
    const today = formatLocalDayKey(new Date());
    this.state = {
      isTracking: false,
      isAvailable: false,
      hasPermission: false,
      dateKey: today,
      dailySteps: 0,
      deviceSteps: 0,
      reconciledSteps: 0,
      stepGoal: 10000,
      source: 'fallback',
      distanceMeters: 0,
      isEstimatedDistance: true,
      activeMinutes: 0,
      sessionSteps: 0,
      lastRawSensorSteps: -1,
      sensorBaseline: -1,
      rebootOffset: 0,
      lastUpdated: Date.now(),
    };

    this.restorePersistedState();
  }

  /**
   * Initializes the activity tracking engine.
   * Checks hardware sensors, verifies local day boundary, and restores saved state.
   */
  public async initialize(userId?: string | null, userGoal = 10000, heightCm = 175): Promise<ActivityEngineState> {
    if (userId) this.currentUserId = userId;
    this.userHeightCm = heightCm;
    this.state.stepGoal = userGoal;

    if (this.isInitialized) {
      this.checkDayBoundary();
      return this.getState();
    }

    this.isInitialized = true;
    this.checkDayBoundary();

    // Check platform & hardware capabilities
    if (Capacitor.isNativePlatform()) {
      try {
        const avail = await Pedometer.isAvailable();
        this.state.isAvailable = avail.available;

        const perm = await Pedometer.checkPermission();
        this.state.hasPermission = perm.granted;

        if (this.state.isAvailable && !this.state.hasPermission) {
          const req = await this.requestPermission();
          this.state.hasPermission = req;
        }

        if (this.state.isAvailable && this.state.hasPermission) {
          await this.startTracking();
        }
      } catch (err) {
        console.warn('[ActivityTrackingService] Pedometer plugin unavailable or error:', err);
        this.state.isAvailable = false;
      }
    } else {
      // Graceful Web/Desktop fallback — no fake sensors, honest status
      this.state.isAvailable = false;
      this.state.hasPermission = false;
    }

    // Start periodic check for midnight local date change (every 60s)
    if (!this.dayCheckInterval && typeof window !== 'undefined') {
      this.dayCheckInterval = setInterval(() => this.checkDayBoundary(), 60000);
    }

    this.notifyListeners();
    return this.getState();
  }

  public getState(): ActivityEngineState {
    return { ...this.state };
  }

  public subscribe(listener: StateListener): () => void {
    this.listeners.add(listener);
    listener(this.getState());
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Request physical activity permission from the user.
   */
  public async requestPermission(): Promise<boolean> {
    if (!Capacitor.isNativePlatform()) {
      return false;
    }

    try {
      const res = await Pedometer.requestPermission();
      this.state.hasPermission = res.granted;
      if (res.granted) {
        await this.startTracking();
      }
      this.notifyListeners();
      return res.granted;
    } catch (err) {
      console.error('[ActivityTrackingService] Permission request failed:', err);
      return false;
    }
  }

  /**
   * Starts native hardware step tracking.
   */
  public async startTracking(): Promise<boolean> {
    if (!Capacitor.isNativePlatform()) {
      return false;
    }

    try {
      const res = await Pedometer.startStepTracking();
      this.state.isTracking = res.tracking;

      if (!this.pluginListenerHandle) {
        this.pluginListenerHandle = await Pedometer.addListener('stepEvent', (event) => {
          this.handleStepEvent(event);
        });
      }

      this.notifyListeners();
      this.persistState();
      return true;
    } catch (err) {
      console.error('[ActivityTrackingService] Failed to start step tracking:', err);
      this.state.isTracking = false;
      this.notifyListeners();
      return false;
    }
  }

  /**
   * Stops native hardware step tracking.
   */
  public async stopTracking(): Promise<boolean> {
    if (!Capacitor.isNativePlatform()) {
      return true;
    }

    try {
      await Pedometer.stopStepTracking();
      this.state.isTracking = false;
      this.notifyListeners();
      this.persistState();
      return true;
    } catch (err) {
      console.error('[ActivityTrackingService] Failed to stop step tracking:', err);
      return false;
    }
  }

  /**
   * Handles incoming native hardware step events.
   */
  private handleStepEvent(event: {
    type: 'step_counter' | 'step_detector';
    rawSteps?: number;
    baselineSteps?: number;
    rebootOffset?: number;
    steps?: number;
    timestamp: number;
  }): void {
    this.checkDayBoundary();

    if (event.type === 'step_counter' && typeof event.rawSteps === 'number') {
      const currentRaw = event.rawSteps;
      const baseline = typeof event.baselineSteps === 'number' ? event.baselineSteps : currentRaw;

      // Use native plugin rebootOffset if state offset is not yet set
      if (this.state.rebootOffset === 0 && typeof event.rebootOffset === 'number') {
        this.state.rebootOffset = event.rebootOffset;
      }

      // Handle baseline assignment if not yet set
      if (this.state.sensorBaseline < 0) {
        this.state.sensorBaseline = baseline;
      }

      // Check device reboot counter discontinuity
      if (this.state.lastRawSensorSteps > 0 && currentRaw < this.state.lastRawSensorSteps) {
        const deltaBeforeReboot = Math.max(0, this.state.lastRawSensorSteps - this.state.sensorBaseline);
        this.state.rebootOffset += deltaBeforeReboot;
        this.state.sensorBaseline = currentRaw;
      }

      this.state.lastRawSensorSteps = currentRaw;
      const calculatedDeviceSteps = Math.max(0, (currentRaw - this.state.sensorBaseline) + this.state.rebootOffset);

      this.state.deviceSteps = calculatedDeviceSteps;
    } else if (event.type === 'step_detector') {
      // Event-based step increment (for devices supporting TYPE_STEP_DETECTOR)
      const inc = event.steps || 1;
      this.state.deviceSteps += inc;
    }

    // Reconcile with health data if health provider had higher steps (e.g. smartwatch)
    if (this.state.reconciledSteps > this.state.deviceSteps) {
      this.state.dailySteps = this.state.reconciledSteps;
      this.state.source = 'health_reconciled';
    } else {
      this.state.dailySteps = this.state.deviceSteps;
      this.state.source = 'phone_sensor';
    }

    // Calculate session steps if a workout/activity is active
    if (this.sessionBaselineSteps !== null) {
      this.state.sessionSteps = Math.max(0, this.state.dailySteps - this.sessionBaselineSteps);
    }

    this.updateDerivedMetrics();
    this.state.lastUpdated = Date.now();
    this.persistState();
    this.notifyListeners();
  }

  /**
   * Reconciles step count with external health provider (Health Connect / Apple Health).
   * Hierarchy:
   * 1. If Health Connect has more steps (e.g. user walked with smartwatch), adopt Health Connect steps.
   * 2. If phone sensor has more steps, keep phone sensor steps.
   * NEVER blindly sums them together (avoids double counting!).
   */
  public reconcileWithHealthProvider(healthSteps: number, sourceName = 'health_connect'): void {
    if (healthSteps <= 0) return;
    this.checkDayBoundary();

    if (healthSteps > this.state.deviceSteps) {
      this.state.reconciledSteps = healthSteps;
      this.state.dailySteps = healthSteps;
      this.state.source = 'health_reconciled';
    } else {
      this.state.reconciledSteps = healthSteps;
      this.state.dailySteps = this.state.deviceSteps;
      this.state.source = 'phone_sensor';
    }

    if (sourceName) {
      // Retain tracking metadata
    }

    this.updateDerivedMetrics();
    this.persistState();
    this.notifyListeners();
  }

  /**
   * Begins tracking steps for an active workout session (walking/running).
   */
  public startSessionStepTracking(): void {
    this.sessionBaselineSteps = this.state.dailySteps;
    this.state.sessionSteps = 0;
    this.notifyListeners();
  }

  /**
   * Stops tracking steps for the active workout session and returns session steps.
   */
  public stopSessionStepTracking(): number {
    const finalSteps = this.state.sessionSteps;
    this.sessionBaselineSteps = null;
    this.state.sessionSteps = 0;
    this.notifyListeners();
    return finalSteps;
  }

  public setStepGoal(goal: number): void {
    if (goal > 0) {
      this.state.stepGoal = goal;
      this.persistState();
      this.notifyListeners();
    }
  }

  /**
   * Checks if local calendar date has crossed midnight.
   * If today is a new day, archives previous day and resets today's daily total.
   */
  public checkDayBoundary(): void {
    const today = formatLocalDayKey(new Date());
    if (this.state.dateKey === today) {
      return;
    }

    console.info(`[ActivityTrackingService] Day boundary transition: ${this.state.dateKey} -> ${today}`);

    // 1. Archive yesterday's completed record
    try {
      const yesterdayRecord = {
        date: this.state.dateKey,
        steps: this.state.dailySteps,
        stepGoal: this.state.stepGoal,
        distanceMeters: this.state.distanceMeters,
        activeMinutes: this.state.activeMinutes,
        source: this.state.source,
      };
      localStorage.setItem(`${STORAGE_KEY_HISTORY_PREFIX}${this.state.dateKey}`, JSON.stringify(yesterdayRecord));
      this.syncDailyRecordToFirestore(yesterdayRecord);
    } catch (e) {
      console.warn('[ActivityTrackingService] Failed to archive yesterday record:', e);
    }

    // 2. Reset daily totals for the new day
    this.state.dateKey = today;
    this.state.dailySteps = 0;
    this.state.deviceSteps = 0;
    this.state.reconciledSteps = 0;
    this.state.distanceMeters = 0;
    this.state.activeMinutes = 0;
    this.state.sessionSteps = 0;
    this.sessionBaselineSteps = null;

    // 3. Update sensor baseline to current raw sensor value if available
    if (this.state.lastRawSensorSteps > 0 && Capacitor.isNativePlatform()) {
      this.state.sensorBaseline = this.state.lastRawSensorSteps;
      this.state.rebootOffset = 0;
      Pedometer.setBaseline({
        baseline: this.state.sensorBaseline,
        rebootOffset: 0,
      }).catch(err => console.warn('[ActivityTrackingService] Failed to reset baseline:', err));
    }

    this.persistState();
    this.notifyListeners();
  }

  /**
   * Calculates derived metrics: stride-estimated distance and active minutes.
   */
  private updateDerivedMetrics(): void {
    // Stride estimation: height * 0.415 / 100 meters
    const strideLengthMeters = (this.userHeightCm * 0.415) / 100;
    this.state.distanceMeters = Math.round(this.state.dailySteps * strideLengthMeters);
    this.state.isEstimatedDistance = true;

    // Active minutes estimation: ~100 steps per minute of moderate walking
    this.state.activeMinutes = Math.floor(this.state.dailySteps / 100);
  }

  private persistState(): void {
    if (typeof localStorage === 'undefined') return;
    try {
      localStorage.setItem(STORAGE_KEY_STATE, JSON.stringify(this.state));
    } catch {
      // Storage quota or private mode fallback
    }
  }

  private restorePersistedState(): void {
    if (typeof localStorage === 'undefined') return;
    try {
      const saved = localStorage.getItem(STORAGE_KEY_STATE);
      if (saved) {
        const parsed = JSON.parse(saved);
        const today = formatLocalDayKey(new Date());

        if (parsed.dateKey === today) {
          // Restore today's progress
          this.state = {
            ...this.state,
            ...parsed,
            dateKey: today,
            isTracking: false, // Will re-verify on initialize
          };
        } else {
          // Stored data belongs to an older day; carry forward hardware baselines but start day at 0
          this.state.dateKey = today;
          this.state.dailySteps = 0;
          this.state.deviceSteps = 0;
          this.state.reconciledSteps = 0;
          this.state.distanceMeters = 0;
          this.state.activeMinutes = 0;
          this.state.stepGoal = parsed.stepGoal || 10000;
          this.state.sensorBaseline = parsed.lastRawSensorSteps || -1;
          this.state.rebootOffset = 0;
        }
      }
    } catch (e) {
      console.warn('[ActivityTrackingService] Could not restore state from storage:', e);
    }
  }

  /**
   * Synchronizes daily activity totals to Firestore (offline-first).
   */
  public async syncDailyRecordToFirestore(record: {
    date: string;
    steps: number;
    stepGoal: number;
    distanceMeters: number;
    activeMinutes: number;
    source: string;
  }): Promise<void> {
    if (!this.currentUserId) return;

    try {
      const dailyRef = doc(firestoreDb, `users/${this.currentUserId}/activity/daily/${record.date}`);
      await setDoc(
        dailyRef,
        {
          ...record,
          lastUpdatedAt: new Date().toISOString(),
        },
        { merge: true }
      );
    } catch (e) {
      // Offline-first: Firestore handles local caching and retries when reconnected
    }
  }

  private notifyListeners(): void {
    const currentState = this.getState();
    this.listeners.forEach(cb => {
      try {
        cb(currentState);
      } catch (e) {
        console.error('[ActivityTrackingService] Listener error:', e);
      }
    });
  }
}

export const activityTrackingService = new ActivityTrackingServiceImpl();
