// ─────────────────────────────────────────────────────────────
// MyFitAI — Native & Web Location Service (GPS Abstraction)
// Bridges Capacitor native Geolocation on Android/iOS with fallback
// to browser Geolocation API. Implements battery-efficient adaptive
// sampling, corner angle preservation, stationary auto-pause,
// and comprehensive error/permission state handling.
// ─────────────────────────────────────────────────────────────

import { Capacitor } from '@capacitor/core';
import { Geolocation, type CallbackID } from '@capacitor/geolocation';
import type { ActivityPoint, ActivityType, GPSQuality } from '../../types/activity';
import { calculateHaversineDistance } from '../../engine/activityCalculations';

export interface RawLocationCoords {
  latitude: number;
  longitude: number;
  altitude?: number | null;
  accuracy?: number;
  speed?: number | null;
  heading?: number | null;
}

export type GPSPermissionState = 'granted' | 'denied' | 'prompt' | 'unknown';

export interface LocationServiceOptions {
  activityType: ActivityType;
  autoPauseEnabled?: boolean;
  onPoint?: (point: ActivityPoint) => void;
  onGPSQuality?: (quality: GPSQuality) => void;
  onAutoPauseChange?: (isPaused: boolean) => void;
  onError?: (errorMessage: string) => void;
}

export class LocationService {
  private isTracking = false;
  private nativeWatchId: CallbackID | null = null;
  private webWatchId: number | null = null;
  private options: LocationServiceOptions;

  private lastRecordedPoint: ActivityPoint | null = null;
  private secondLastRecordedPoint: ActivityPoint | null = null;
  private lastSampleTimestamp = 0;
  private isStationarySince = 0;
  private isAutoPaused = false;

  constructor(options: LocationServiceOptions) {
    this.options = {
      autoPauseEnabled: true,
      ...options,
    };
  }

  /**
   * Checks current GPS location permission status.
   */
  public async checkPermissions(): Promise<GPSPermissionState> {
    try {
      if (Capacitor.isNativePlatform()) {
        const status = await Geolocation.checkPermissions();
        if (status.location === 'granted') return 'granted';
        if (status.location === 'denied') return 'denied';
        return 'prompt';
      }

      if (typeof navigator !== 'undefined' && navigator.permissions?.query) {
        const result = await navigator.permissions.query({ name: 'geolocation' as PermissionName });
        if (result.state === 'granted') return 'granted';
        if (result.state === 'denied') return 'denied';
        return 'prompt';
      }

      return 'unknown';
    } catch {
      return 'unknown';
    }
  }

  /**
   * Requests location permission from the operating system.
   */
  public async requestPermissions(): Promise<boolean> {
    try {
      if (Capacitor.isNativePlatform()) {
        const res = await Geolocation.requestPermissions({ permissions: ['location'] });
        return res.location === 'granted';
      }

      // Web trigger via one-shot getCurrentPosition
      return new Promise(resolve => {
        if (typeof navigator === 'undefined' || !navigator.geolocation) {
          resolve(false);
          return;
        }
        navigator.geolocation.getCurrentPosition(
          () => resolve(true),
          () => resolve(false),
          { timeout: 5000 }
        );
      });
    } catch {
      return false;
    }
  }

  /**
   * Starts GPS tracking. Uses Capacitor native on mobile or browser watchPosition on web.
   */
  public async startTracking(): Promise<boolean> {
    if (this.isTracking) return true;

    this.options.onGPSQuality?.('SEARCHING');

    const hasPermission = await this.requestPermissions();
    if (!hasPermission) {
      this.options.onError?.(
        'Location permission is required to track your route. Please enable location access in settings.'
      );
      return false;
    }

    this.isTracking = true;
    this.isAutoPaused = false;
    this.isStationarySince = 0;

    if (Capacitor.isNativePlatform()) {
      try {
        this.nativeWatchId = await Geolocation.watchPosition(
          {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 1500,
          },
          (position, err) => {
            if (err) {
              this.handleError(err.message || 'GPS tracking error');
              return;
            }
            if (position) {
              this.handleRawPosition(position.coords, position.timestamp);
            }
          }
        );
        return true;
      } catch (err: unknown) {
        this.handleError(err instanceof Error ? err.message : 'Failed to start native GPS tracking.');
        this.isTracking = false;
        return false;
      }
    } else {
      // Browser fallback
      if (typeof navigator === 'undefined' || !navigator.geolocation) {
        this.handleError('Geolocation is not supported in this browser.');
        this.isTracking = false;
        return false;
      }

      this.webWatchId = navigator.geolocation.watchPosition(
        pos => this.handleRawPosition(pos.coords, pos.timestamp),
        err => this.handleWebError(err),
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 2000,
        }
      );
      return true;
    }
  }

  /**
   * Stops active GPS tracking and cleans up listeners.
   */
  public stopTracking(): void {
    this.isTracking = false;

    if (this.nativeWatchId !== null) {
      Geolocation.clearWatch({ id: this.nativeWatchId }).catch(() => {});
      this.nativeWatchId = null;
    }

    if (this.webWatchId !== null && typeof navigator !== 'undefined') {
      navigator.geolocation.clearWatch(this.webWatchId);
      this.webWatchId = null;
    }
  }

  /**
   * Fetches single current location fix.
   */
  public async getCurrentPosition(): Promise<ActivityPoint | null> {
    try {
      if (Capacitor.isNativePlatform()) {
        const pos = await Geolocation.getCurrentPosition({ enableHighAccuracy: true, timeout: 8000 });
        return {
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          timestamp: pos.timestamp || Date.now(),
          altitude: pos.coords.altitude || undefined,
          accuracy: pos.coords.accuracy || undefined,
          speed: pos.coords.speed || undefined,
          heading: pos.coords.heading || undefined,
        };
      }

      return new Promise(resolve => {
        if (typeof navigator === 'undefined' || !navigator.geolocation) {
          resolve(null);
          return;
        }
        navigator.geolocation.getCurrentPosition(
          pos => {
            resolve({
              latitude: pos.coords.latitude,
              longitude: pos.coords.longitude,
              timestamp: pos.timestamp || Date.now(),
              altitude: pos.coords.altitude || undefined,
              accuracy: pos.coords.accuracy || undefined,
              speed: pos.coords.speed || undefined,
              heading: pos.coords.heading || undefined,
            });
          },
          () => resolve(null),
          { enableHighAccuracy: true, timeout: 8000 }
        );
      });
    } catch {
      return null;
    }
  }

  /**
   * Processes raw coordinates from native or web provider with adaptive filtering.
   */
  private handleRawPosition(
    coords: RawLocationCoords,
    rawTimestamp: number
  ): void {
    if (!this.isTracking) return;

    const { latitude, longitude, altitude, accuracy, speed, heading } = coords;
    const timestamp = rawTimestamp || Date.now();

    // 1. Evaluate GPS Quality
    let quality: GPSQuality = 'EXCELLENT';
    if (!accuracy || accuracy > 30) quality = 'WEAK';
    else if (accuracy > 15) quality = 'GOOD';
    this.options.onGPSQuality?.(quality);

    // Skip points with unusable accuracy (> 35m) to prevent wild spikes
    if (accuracy && accuracy > 35) return;

    const currentSpeed = speed !== null && speed !== undefined && speed >= 0 ? speed : 0;

    // 2. Auto-Pause Detection
    if (this.options.autoPauseEnabled) {
      if (currentSpeed < 0.4) {
        if (!this.isStationarySince) {
          this.isStationarySince = timestamp;
        } else if (timestamp - this.isStationarySince > 10000 && !this.isAutoPaused) {
          this.isAutoPaused = true;
          this.options.onAutoPauseChange?.(true);
        }
      } else {
        this.isStationarySince = 0;
        if (this.isAutoPaused) {
          this.isAutoPaused = false;
          this.options.onAutoPauseChange?.(false);
        }
      }
    }

    if (this.isAutoPaused) return;

    // 3. Adaptive Sampling & Corner Angle Preservation
    const shouldSample = this.shouldSample(latitude, longitude, timestamp);
    if (!shouldSample) return;

    const point: ActivityPoint = {
      latitude,
      longitude,
      timestamp,
      altitude: altitude !== null && altitude !== undefined ? Math.round(altitude * 10) / 10 : undefined,
      accuracy: accuracy !== null && accuracy !== undefined ? Math.round(accuracy) : undefined,
      speed: currentSpeed,
      heading: heading !== null && heading !== undefined ? Math.round(heading) : undefined,
    };

    this.secondLastRecordedPoint = this.lastRecordedPoint;
    this.lastRecordedPoint = point;
    this.lastSampleTimestamp = timestamp;

    this.options.onPoint?.(point);
  }

  /**
   * Intelligently samples points balancing battery vs route accuracy:
   * - Checks distance threshold based on activity type
   * - Checks time interval (5–10s)
   * - Detects sharp turns (> 25° heading deviation) to preserve corner vertices!
   */
  private shouldSample(lat: number, lon: number, timestamp: number): boolean {
    if (!this.lastRecordedPoint) return true;

    const elapsedMs = timestamp - this.lastSampleTimestamp;
    const distMeters = calculateHaversineDistance(
      this.lastRecordedPoint.latitude,
      this.lastRecordedPoint.longitude,
      lat,
      lon
    );

    // Don't record micro-jitter (< 1.5m)
    if (distMeters < 1.5) return false;

    // Corner angle preservation: If direction changed significantly, keep vertex!
    if (this.secondLastRecordedPoint && distMeters >= 4) {
      const heading1 = calculateBearing(
        this.secondLastRecordedPoint.latitude,
        this.secondLastRecordedPoint.longitude,
        this.lastRecordedPoint.latitude,
        this.lastRecordedPoint.longitude
      );
      const heading2 = calculateBearing(
        this.lastRecordedPoint.latitude,
        this.lastRecordedPoint.longitude,
        lat,
        lon
      );
      const angleDiff = Math.abs(heading1 - heading2);
      const normalizedAngle = angleDiff > 180 ? 360 - angleDiff : angleDiff;

      // Sharp turn (> 25 degrees) -> record immediately to preserve path shape
      if (normalizedAngle > 25) {
        return true;
      }
    }

    // Adaptive constraints by sport
    switch (this.options.activityType) {
      case 'CYCLING':
        // 3s interval or 12m moved
        return elapsedMs >= 3000 || distMeters >= 12;
      case 'RUN':
        // 5s interval or 8m moved
        return elapsedMs >= 5000 || distMeters >= 8;
      case 'WALK':
      case 'HIKING':
        // 6s interval or 6m moved
        return elapsedMs >= 6000 || distMeters >= 6;
      default:
        return elapsedMs >= 5000 || distMeters >= 8;
    }
  }

  private handleError(message: string): void {
    this.options.onError?.(message);
  }

  private handleWebError(error: GeolocationPositionError): void {
    let msg = 'GPS signal lost.';
    switch (error.code) {
      case error.PERMISSION_DENIED:
        msg = 'Location permission was denied. Please allow location access.';
        break;
      case error.POSITION_UNAVAILABLE:
        msg = 'GPS satellite fix unavailable. Searching for signal...';
        this.options.onGPSQuality?.('SEARCHING');
        break;
      case error.TIMEOUT:
        msg = 'GPS fix timed out.';
        this.options.onGPSQuality?.('WEAK');
        break;
    }
    this.options.onError?.(msg);
  }
}

/**
 * Calculates initial bearing between two geographic points in degrees.
 */
function calculateBearing(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const toDeg = (rad: number) => (rad * 180) / Math.PI;

  const φ1 = toRad(lat1);
  const φ2 = toRad(lat2);
  const Δλ = toRad(lon2 - lon1);

  const y = Math.sin(Δλ) * Math.cos(φ2);
  const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
  const θ = Math.atan2(y, x);

  return (toDeg(θ) + 360) % 360;
}
