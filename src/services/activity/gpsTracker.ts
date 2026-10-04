// ─────────────────────────────────────────────────────────────
// MyFitAI — Real-Time GPS Tracking Service
// Manages device location tracking using LocationService (Capacitor
// native GPS on Android with browser fallback), auto-pause detection,
// corner angle preservation, and IndexedDB crash recovery buffering.
// ─────────────────────────────────────────────────────────────

import type { ActivityPoint, ActivityType, GPSQuality } from '../../types/activity';
import { LocationService } from '../location/LocationService';
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
  private locationService: LocationService | null = null;
  private state: TrackingState = 'IDLE';
  private options: GPSTrackerOptions;
  private points: ActivityPoint[] = [];
  private bufferSaveTimer: ReturnType<typeof setInterval> | null = null;

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
   * Starts tracking GPS position via native Capacitor or web LocationService.
   */
  public async start(): Promise<boolean> {
    this.state = 'TRACKING';
    this.options.onStateChange?.(this.state);
    this.options.onGPSQuality?.('SEARCHING');

    // Periodic buffer save to IndexedDB every 15 seconds for crash protection
    this.bufferSaveTimer = setInterval(() => {
      this.saveBufferToIndexedDB();
    }, 15000);

    this.locationService = new LocationService({
      activityType: this.options.activityType,
      autoPauseEnabled: this.options.autoPauseEnabled,
      onPoint: pt => {
        if (this.state === 'PAUSED') return;
        this.points.push(pt);
        this.options.onPoint?.(pt, this.points.length);
      },
      onGPSQuality: q => {
        this.options.onGPSQuality?.(q);
      },
      onAutoPauseChange: isPaused => {
        if (this.state === 'PAUSED') return;
        this.state = isPaused ? 'AUTO_PAUSED' : 'TRACKING';
        this.options.onStateChange?.(this.state);
      },
      onError: err => {
        this.options.onError?.(err);
      },
    });

    const success = await this.locationService.startTracking();
    if (!success) {
      this.state = 'IDLE';
      this.options.onStateChange?.(this.state);
      if (this.bufferSaveTimer) {
        clearInterval(this.bufferSaveTimer);
        this.bufferSaveTimer = null;
      }
      return false;
    }

    return true;
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
      this.options.onStateChange?.(this.state);
    }
  }

  /**
   * Stops tracking and cleans up listeners and timers.
   */
  public stop(): ActivityPoint[] {
    if (this.locationService) {
      this.locationService.stopTracking();
      this.locationService = null;
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
        return this.points.length;
      }
    } catch {
      // Non-fatal
    }
    return 0;
  }
}
