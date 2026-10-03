// ─────────────────────────────────────────────────────────────
// MyFitAI — Real-Time GPS Tracking Service
// Manages device location tracking with adaptive battery-aware
// sampling, auto-pause detection, GPS quality classification,
// and background buffering to IndexedDB for crash resilience.
// ─────────────────────────────────────────────────────────────

import type { ActivityPoint, ActivityType, GPSQuality } from '../../types/activity';
import { calculateHaversineDistance } from '../../engine/activityCalculations';
import { db } from '../../utils/db';

export type TrackingState = 'IDLE' | 'TRACKING' | 'PAUSED' | 'AUTO_PAUSED';

export interface GPSTrackerOptions {
  activityId: string;
  activityType: ActivityType;
  autoPauseEnabled?: boolean;
  onPoint?: (point: ActivityPoint, totalPoints: number) => void;
  onStateChange?: (state: TrackingState) => void;
  onGPSQuality?: (quality: GPSQuality) => void;
  onError?: (error: string) => void;
}

export class GPSTracker {
  private watchId: number | null = null;
  private state: TrackingState = 'IDLE';
  private options: GPSTrackerOptions;
  private points: ActivityPoint[] = [];
  private lastRecordedPoint: ActivityPoint | null = null;
  private lastSampleTimestamp = 0;
  private autoPauseTimer: ReturnType<typeof setTimeout> | null = null;
  private bufferSaveTimer: ReturnType<typeof setInterval> | null = null;
  private isStationarySince = 0;

  constructor(options: GPSTrackerOptions) {
    this.options = {
      autoPauseEnabled: true,
      ...options,
    };
  }

  public getState(): TrackingState {
    return this.state;
  }

  public getPoints(): ActivityPoint[] {
    return [...this.points];
  }

  /**
   * Starts tracking GPS position.
   */
  public async start(): Promise<boolean> {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      this.options.onError?.('Geolocation is not supported on this device.');
      return false;
    }

    this.state = 'TRACKING';
    this.options.onStateChange?.(this.state);
    this.options.onGPSQuality?.('SEARCHING');

    // Periodic buffer save to IndexedDB every 15 seconds for crash protection
    this.bufferSaveTimer = setInterval(() => {
      this.saveBufferToIndexedDB();
    }, 15000);

    const geoOptions: PositionOptions = {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 2000,
    };

    try {
      this.watchId = navigator.geolocation.watchPosition(
        position => this.handlePositionUpdate(position),
        error => this.handlePositionError(error),
        geoOptions
      );
      return true;
    } catch (err: unknown) {
      this.options.onError?.(err instanceof Error ? err.message : 'Failed to start GPS tracking.');
      return false;
    }
  }

  /**
   * Pauses active tracking session manually.
   */
  public pause(): void {
    if (this.state === 'TRACKING' || this.state === 'AUTO_PAUSED') {
      this.state = 'PAUSED';
      this.options.onStateChange?.(this.state);
      this.saveBufferToIndexedDB();
    }
  }

  /**
   * Resumes active tracking session.
   */
  public resume(): void {
    if (this.state === 'PAUSED' || this.state === 'AUTO_PAUSED') {
      this.state = 'TRACKING';
      this.isStationarySince = 0;
      this.options.onStateChange?.(this.state);
    }
  }

  /**
   * Stops tracking and cleans up listeners and timers.
   */
  public stop(): ActivityPoint[] {
    if (this.watchId !== null && typeof navigator !== 'undefined') {
      navigator.geolocation.clearWatch(this.watchId);
      this.watchId = null;
    }

    if (this.autoPauseTimer) {
      clearInterval(this.autoPauseTimer);
      this.autoPauseTimer = null;
    }

    if (this.bufferSaveTimer) {
      clearInterval(this.bufferSaveTimer);
      this.bufferSaveTimer = null;
    }

    this.state = 'IDLE';
    this.options.onStateChange?.(this.state);
    this.saveBufferToIndexedDB();

    return [...this.points];
  }

  /**
   * Ingests a new GPS position and decides whether to sample based on movement & battery limits.
   */
  private handlePositionUpdate(pos: GeolocationPosition): void {
    if (this.state === 'PAUSED') return;

    const { latitude, longitude, altitude, accuracy, speed, heading } = pos.coords;
    const timestamp = pos.timestamp || Date.now();

    // 1. Evaluate GPS Quality
    let quality: GPSQuality = 'EXCELLENT';
    if (!accuracy || accuracy > 30) quality = 'WEAK';
    else if (accuracy > 15) quality = 'GOOD';
    this.options.onGPSQuality?.(quality);

    // Skip points with unusable accuracy (> 35m)
    if (accuracy && accuracy > 35) return;

    const currentSpeedMs = speed !== null && speed !== undefined && speed >= 0 ? speed : 0;

    // 2. Auto-Pause Detection
    if (this.options.autoPauseEnabled) {
      if (currentSpeedMs < 0.4) {
        if (!this.isStationarySince) {
          this.isStationarySince = timestamp;
        } else if (timestamp - this.isStationarySince > 10000 && this.state === 'TRACKING') {
          // Stationary for > 10 seconds -> trigger auto-pause
          this.state = 'AUTO_PAUSED';
          this.options.onStateChange?.(this.state);
        }
      } else {
        // User has resumed moving
        this.isStationarySince = 0;
        if (this.state === 'AUTO_PAUSED') {
          this.state = 'TRACKING';
          this.options.onStateChange?.(this.state);
        }
      }
    }

    if (this.state === 'AUTO_PAUSED') return;

    // 3. Adaptive Sampling
    const shouldSample = this.shouldSamplePoint(latitude, longitude, timestamp);
    if (!shouldSample) return;

    const point: ActivityPoint = {
      latitude,
      longitude,
      timestamp,
      altitude: altitude !== null ? Math.round(altitude * 10) / 10 : undefined,
      accuracy: accuracy !== null ? Math.round(accuracy) : undefined,
      speed: currentSpeedMs,
      heading: heading !== null && heading !== undefined ? Math.round(heading) : undefined,
    };

    this.points.push(point);
    this.lastRecordedPoint = point;
    this.lastSampleTimestamp = timestamp;

    this.options.onPoint?.(point, this.points.length);
  }

  /**
   * Decides whether to record the current coordinate based on activity type, distance and interval.
   */
  private shouldSamplePoint(lat: number, lon: number, timestamp: number): boolean {
    if (!this.lastRecordedPoint) return true;

    const elapsedMs = timestamp - this.lastSampleTimestamp;
    const dist = calculateHaversineDistance(
      this.lastRecordedPoint.latitude,
      this.lastRecordedPoint.longitude,
      lat,
      lon
    );

    // Adaptive constraints based on activity type
    switch (this.options.activityType) {
      case 'CYCLING':
        // 3s interval or 12m moved
        return elapsedMs >= 3000 || dist >= 12;
      case 'RUN':
        // 5s interval or 8m moved
        return elapsedMs >= 5000 || dist >= 8;
      case 'WALK':
      case 'HIKING':
        // 6s interval or 6m moved
        return elapsedMs >= 6000 || dist >= 6;
      default:
        return elapsedMs >= 5000 || dist >= 8;
    }
  }

  private handlePositionError(error: GeolocationPositionError): void {
    let msg = 'GPS signal lost.';
    switch (error.code) {
      case error.PERMISSION_DENIED:
        msg = 'Location permission was denied. Please allow location access to record GPS routes.';
        break;
      case error.POSITION_UNAVAILABLE:
        msg = 'GPS signal currently unavailable. Searching for satellite fix...';
        this.options.onGPSQuality?.('SEARCHING');
        break;
      case error.TIMEOUT:
        msg = 'GPS fix timed out. Ensure location services are enabled.';
        this.options.onGPSQuality?.('WEAK');
        break;
    }
    this.options.onError?.(msg);
  }

  /**
   * Saves active route coordinates buffer to IndexedDB for crash resilience.
   */
  private async saveBufferToIndexedDB(): Promise<void> {
    if (this.points.length === 0 || !this.options.activityId) return;

    try {
      await db.activity.rawRoutes.save({
        activityId: this.options.activityId,
        points: this.points,
        updatedAt: new Date().toISOString(),
      });
    } catch {
      // Non-fatal background storage error
    }
  }

  /**
   * Clears saved buffer after successful completion or discard.
   */
  public async clearSavedBuffer(): Promise<void> {
    if (!this.options.activityId) return;
    try {
      await db.activity.rawRoutes.delete(this.options.activityId);
    } catch {
      // Non-fatal
    }
  }

  /**
   * Restores points from saved buffer if recovering from an interruption.
   */
  public async restoreFromBuffer(): Promise<number> {
    if (!this.options.activityId) return 0;
    try {
      const saved = await db.activity.rawRoutes.get(this.options.activityId);
      if (saved && Array.isArray(saved.points) && saved.points.length > 0) {
        this.points = [...saved.points];
        this.lastRecordedPoint = this.points[this.points.length - 1];
        this.lastSampleTimestamp = this.lastRecordedPoint.timestamp;
        return this.points.length;
      }
    } catch {
      // Non-fatal
    }
    return 0;
  }
}
