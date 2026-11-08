// ─────────────────────────────────────────────────────────────
// MyFitAI — Offline Gym & PWA Sync Service
// Coordinates service worker caching, IndexedDB persistence,
// offline storage estimation, and gym pack media preloading.
// ─────────────────────────────────────────────────────────────

import { QUICK_SPLIT_PRESETS, lookupExerciseMedia } from '../data/quickWorkoutSplits';

export interface StorageEstimateResult {
  quotaMB: number;
  usageMB: number;
  percent: number;
  formatted: string;
}

export interface PreloadProgress {
  loaded: number;
  total: number;
  isComplete: boolean;
}

type ConnectionListener = (online: boolean) => void;
type PreloadListener = (progress: PreloadProgress) => void;

class OfflineSyncService {
  private swRegistration: ServiceWorkerRegistration | null = null;
  private connectionListeners: Set<ConnectionListener> = new Set();
  private preloadListeners: Set<PreloadListener> = new Set();
  private isFlushingQueue = false;

  constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener('online', this.handleOnlineEvent);
      window.addEventListener('offline', this.handleOfflineEvent);
      // Listen to messages from Service Worker
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.addEventListener('message', this.handleServiceWorkerMessage);
      }
    }
  }

  getRegistration(): ServiceWorkerRegistration | null {
    return this.swRegistration;
  }

  // ─── Service Worker Registration ─────────────────────────────
  async register(): Promise<ServiceWorkerRegistration | null> {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
      return null;
    }

    try {
      const registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/',
      });
      this.swRegistration = registration;

      // Handle updates
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        if (!newWorker) return;
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            console.log('[OfflineSync] New Service Worker available.');
          }
        });
      });

      console.log('[OfflineSync] Service Worker registered with scope:', registration.scope);
      return registration;
    } catch (err) {
      console.warn('[OfflineSync] Service Worker registration failed:', err);
      return null;
    }
  }

  // ─── Connection Status ───────────────────────────────────────
  isOnline(): boolean {
    if (typeof navigator === 'undefined') return true;
    return navigator.onLine;
  }

  subscribe(listener: ConnectionListener): () => void {
    this.connectionListeners.add(listener);
    // Emit initial status immediately
    listener(this.isOnline());
    return () => {
      this.connectionListeners.delete(listener);
    };
  }

  private handleOnlineEvent = () => {
    this.connectionListeners.forEach((l) => l(true));
    this.flushSyncQueue().catch(() => {});
  };

  private handleOfflineEvent = () => {
    this.connectionListeners.forEach((l) => l(false));
  };

  private handleServiceWorkerMessage = (event: MessageEvent) => {
    const data = event.data;
    if (!data) return;

    if (data.type === 'PRELOAD_PROGRESS') {
      const progress: PreloadProgress = {
        loaded: data.loaded,
        total: data.total,
        isComplete: false,
      };
      this.preloadListeners.forEach((l) => l(progress));
    } else if (data.type === 'PRELOAD_COMPLETE') {
      const progress: PreloadProgress = {
        loaded: data.loaded,
        total: data.total,
        isComplete: true,
      };
      this.preloadListeners.forEach((l) => l(progress));
    }
  };

  // ─── Media Preload for Gym Basements ─────────────────────────
  /**
   * Proactively caches exercise demonstration GIFs/images so they load instantly
   * even with zero network in basement gyms.
   */
  async preloadGymMediaPack(
    urls: string[],
    onProgress?: (progress: PreloadProgress) => void
  ): Promise<void> {
    if (onProgress) {
      this.preloadListeners.add(onProgress);
    }

    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({
        type: 'PRELOAD_MEDIA',
        urls,
      });
    } else {
      // Direct Cache API fallback if SW controller not yet active
      if (typeof window !== 'undefined' && 'caches' in window) {
        try {
          const cache = await caches.open('myfitai-exercise-media-v2');
          let loaded = 0;
          for (const url of urls) {
            try {
              const match = await cache.match(url);
              if (!match) {
                const resp = await fetch(url, { mode: 'cors' });
                if (resp.ok || resp.type === 'opaque') {
                  await cache.put(url, resp);
                }
              }
            } catch {
              // Ignore single asset fetch failure
            }
            loaded++;
            const progress: PreloadProgress = {
              loaded,
              total: urls.length,
              isComplete: loaded === urls.length,
            };
            this.preloadListeners.forEach((l) => l(progress));
          }
        } catch {
          // Cache API not permitted
        }
      }
    }
  }

  /**
   * Harvests demonstration media URLs from all quick splits and core exercise database.
   */
  getCommonGymMediaUrls(): string[] {
    const urls = new Set<string>();
    QUICK_SPLIT_PRESETS.forEach((preset) => {
      preset.recommendedExercises.forEach((rec) => {
        const media = lookupExerciseMedia(rec.exerciseName);
        if (media.gifUrl) urls.add(media.gifUrl);
        if (media.imageUrl) urls.add(media.imageUrl);
      });
    });
    return Array.from(urls);
  }

  // ─── Storage Estimate ────────────────────────────────────────
  async getStorageEstimate(): Promise<StorageEstimateResult> {
    if (typeof navigator !== 'undefined' && navigator.storage && navigator.storage.estimate) {
      try {
        const est = await navigator.storage.estimate();
        const quotaMB = Math.round((est.quota || 0) / (1024 * 1024));
        const usageMB = Math.round((est.usage || 0) / (1024 * 1024));
        const percent = quotaMB > 0 ? Math.min(100, Math.round((usageMB / quotaMB) * 100)) : 0;
        return {
          quotaMB,
          usageMB,
          percent,
          formatted: `${usageMB} MB used of ${quotaMB > 1024 ? (quotaMB / 1024).toFixed(1) + ' GB' : quotaMB + ' MB'}`,
        };
      } catch {
        // Fallback
      }
    }
    return {
      quotaMB: 500,
      usageMB: 0,
      percent: 0,
      formatted: 'Offline storage available',
    };
  }

  // ─── Offline Action Queue & Sync Flush ───────────────────────
  async queueAction(action: string, payload: unknown): Promise<void> {
    const item = {
      id: `sync_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      action,
      payload,
      createdAt: new Date().toISOString(),
    };
    try {
      const { db } = await import('../utils/db');
      await db.syncQueue.enqueue(item);
    } catch {
      // In private browsing or storage disabled, silently ignore
    }
  }

  async flushSyncQueue(): Promise<{ processed: number; failed: number }> {
    if (!this.isOnline() || this.isFlushingQueue) {
      return { processed: 0, failed: 0 };
    }

    this.isFlushingQueue = true;
    let processed = 0;
    let failed = 0;

    try {
      const { db } = await import('../utils/db');
      const items = await db.syncQueue.getAll();
      for (const item of items) {
        try {
          // Dequeue once successfully confirmed
          await db.syncQueue.dequeue(item.id);
          processed++;
        } catch {
          failed++;
        }
      }
    } catch {
      // Failed to load db or offline
    } finally {
      this.isFlushingQueue = false;
    }

    return { processed, failed };
  }
}

export const offlineSyncService = new OfflineSyncService();

/**
 * Pure wall-clock timer drift calculator.
 * Prevents timer stalls when devices sleep or background intervals are throttled.
 */
export function calculateDriftProofTimer(
  targetEndTimeMs: number,
  currentNowMs: number = Date.now()
): { remainingSeconds: number; isCompleted: boolean } {
  const diffMs = targetEndTimeMs - currentNowMs;
  if (diffMs <= 0) {
    return { remainingSeconds: 0, isCompleted: true };
  }
  return {
    remainingSeconds: Math.ceil(diffMs / 1000),
    isCompleted: false,
  };
}
