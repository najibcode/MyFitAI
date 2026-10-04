// ─────────────────────────────────────────────────────────────
// MyFitAI — Activity Sync & Offline Resilience Service
// Enforces local-first GPS architecture, crash recovery buffers in
// IndexedDB, Douglas-Peucker simplification, polyline compression,
// and exponential backoff sync queue to Firestore (1 doc per activity).
// ─────────────────────────────────────────────────────────────

import { db } from '../../utils/db';
import { db as firestoreDb } from '../firebase';
import { doc, setDoc } from 'firebase/firestore';
import type { Activity, TerritoryStats } from '../../types/activity';
import { encodeRoute, simplifyRoutePoints } from '../../utils/polyline';

export interface SyncQueueItem {
  id: string;
  type: 'UPLOAD_ACTIVITY' | 'UPDATE_TERRITORY_STATS';
  entityId: string;
  operation: 'UPSERT' | 'DELETE';
  payload: any;
  createdAt: string;
  retryCount: number;
  status: 'pending' | 'syncing' | 'failed' | 'success';
  lastAttemptAt?: string;
  error?: string;
}

export class ActivitySyncService {
  private isSyncing = false;

  /**
   * Finalizes an activity:
   * 1. Simplifies raw GPS points (reducing payload ~80-90%).
   * 2. Encodes simplified route into compact 5-decimal polyline string.
   * 3. Stores complete activity in IndexedDB.
   * 4. Queues single-document upload to Firestore with exponential backoff.
   */
  public async finalizeAndQueueActivity(
    activity: Activity,
    stats: TerritoryStats
  ): Promise<Activity> {
    const rawPoints = activity.route?.points || [];

    // 1. Simplify route coordinates
    const simplified = simplifyRoutePoints(rawPoints, 4.0);

    // 2. Encode to polyline
    const encodedPolyline = encodeRoute(
      simplified.map(p => ({ latitude: p.latitude, longitude: p.longitude }))
    );

    const finalizedActivity: Activity = {
      ...activity,
      route: {
        points: rawPoints, // Full raw points retained in local IndexedDB
        distanceMeters: activity.distanceMeters,
        elevationGainMeters: activity.elevationGainMeters,
        elevationLossMeters: activity.elevationLossMeters,
        simplifiedPoints: simplified,
        encodedPolyline,
      },
      synced: false,
      updatedAt: new Date().toISOString(),
    };

    // 3. Persist to local IndexedDB
    await db.activity.activities.save(finalizedActivity);

    // 4. Enqueue for background cloud sync
    const syncItem: SyncQueueItem = {
      id: `sync_act_${finalizedActivity.id}`,
      type: 'UPLOAD_ACTIVITY',
      entityId: finalizedActivity.id,
      operation: 'UPSERT',
      payload: {
        activity: {
          ...finalizedActivity,
          // Omit raw 10,000 points from Firestore payload — store simplified + encoded
          route: {
            distanceMeters: finalizedActivity.route?.distanceMeters || 0,
            elevationGainMeters: finalizedActivity.route?.elevationGainMeters || 0,
            elevationLossMeters: finalizedActivity.route?.elevationLossMeters || 0,
            encodedPolyline,
            simplifiedPoints: simplified,
          },
        },
        stats,
      },
      createdAt: new Date().toISOString(),
      retryCount: 0,
      status: 'pending',
    };

    await db.activity.syncQueue.enqueue(syncItem as any);

    // Attempt immediate sync if online
    if (typeof navigator !== 'undefined' && navigator.onLine) {
      this.processQueue().catch(() => {});
    }

    return finalizedActivity;
  }

  /**
   * Processes pending sync queue items with exponential backoff and idempotency.
   */
  public async processQueue(): Promise<number> {
    if (this.isSyncing) return 0;
    if (typeof navigator !== 'undefined' && !navigator.onLine) return 0;

    this.isSyncing = true;
    let successfulCount = 0;

    try {
      const rawQueue = await db.activity.syncQueue.getAll();
      if (!rawQueue || rawQueue.length === 0) return 0;

      const items = rawQueue as unknown as SyncQueueItem[];

      for (const item of items) {
        // Skip items that recently failed and are in backoff
        if (item.status === 'failed' && item.lastAttemptAt) {
          const backoffSeconds = Math.min(300, Math.pow(2, item.retryCount || 1) * 5);
          const elapsedSeconds = (Date.now() - new Date(item.lastAttemptAt).getTime()) / 1000;
          if (elapsedSeconds < backoffSeconds) {
            continue;
          }
        }

        try {
          if (item.type === 'UPLOAD_ACTIVITY') {
            const { activity, stats } = item.payload;
            if (!activity.userId || activity.userId === 'guest') {
              // Guest mode or unauthenticated: clean from cloud queue
              await db.activity.syncQueue.dequeue(item.id);
              continue;
            }

            // Write 1 aggregated activity doc to Firestore
            const activityRef = doc(
              firestoreDb,
              `users/${activity.userId}/activities/${activity.id}`
            );

            await setDoc(
              activityRef,
              {
                id: activity.id,
                userId: activity.userId,
                type: activity.type,
                title: activity.title,
                startTime: activity.startTime,
                endTime: activity.endTime,
                durationSeconds: activity.durationSeconds,
                movingDurationSeconds: activity.movingDurationSeconds,
                distanceMeters: activity.distanceMeters,
                averagePaceSecondsPerKm: activity.averagePaceSecondsPerKm,
                averageSpeedKmh: activity.averageSpeedKmh,
                elevationGainMeters: activity.elevationGainMeters,
                elevationLossMeters: activity.elevationLossMeters,
                calories: activity.calories,
                source: activity.source,
                splits: activity.splits || [],
                laps: activity.laps || [],
                territoryCapturedKm2: activity.territoryCapturedKm2 || 0,
                xpEarned: activity.xpEarned || 0,
                routeSummary: {
                  encodedPolyline: activity.route?.encodedPolyline || '',
                  simplifiedPoints: activity.route?.simplifiedPoints || [],
                  distanceMeters: activity.distanceMeters,
                  elevationGainMeters: activity.elevationGainMeters,
                },
                createdAt: activity.createdAt,
                updatedAt: new Date().toISOString(),
              },
              { merge: true }
            );

            // Write single territory stats document
            if (stats) {
              const statsRef = doc(
                firestoreDb,
                `users/${activity.userId}/territoryStats/user_territory_stats`
              );
              await setDoc(statsRef, stats, { merge: true });
            }

            // Mark local activity as synced
            const localAct = await db.activity.activities.getById(activity.id);
            if (localAct) {
              await db.activity.activities.save({ ...localAct, synced: true });
            }

            // Dequeue item
            await db.activity.syncQueue.dequeue(item.id);
            successfulCount++;
          }
        } catch (err: unknown) {
          const errMsg = err instanceof Error ? err.message : String(err);
          const updatedItem: SyncQueueItem = {
            ...item,
            status: 'failed',
            retryCount: (item.retryCount || 0) + 1,
            lastAttemptAt: new Date().toISOString(),
            error: errMsg,
          };
          await db.activity.syncQueue.enqueue(updatedItem as any);
        }
      }
    } finally {
      this.isSyncing = false;
    }

    return successfulCount;
  }
}

export const activitySyncService = new ActivitySyncService();
