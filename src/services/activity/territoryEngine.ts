// ─────────────────────────────────────────────────────────────
// MyFitAI — Territory Game Engine Service
// Processes completed routes into territory cells, enforces
// anti-farming and anti-cheat constraints, awards XP & levels,
// tracks personal territory stats, and coordinates cloud sync.
// ─────────────────────────────────────────────────────────────

import type {
  Activity,
  TerritoryCell,
  TerritoryStats,
  ActivityAchievement,
} from '../../types/activity';
import {
  generateTerritoryCellsFromRoute,
  calculateTerritoryImpact,
  calculateActivityXP,
  calculateUserLevel,
  evaluateAchievements,
} from '../../engine/activityCalculations';
import { db } from '../../utils/db';
import { db as firestoreDb } from '../firebase';
import { doc, setDoc } from 'firebase/firestore';

export interface TerritoryProcessingResult {
  newlyCapturedCount: number;
  defendedCount: number;
  newAreaKm2: number;
  totalAreaKm2: number;
  xpEarned: number;
  totalXP: number;
  level: number;
  levelName: string;
  isNewLevel: boolean;
  newAchievements: ActivityAchievement[];
}

export class TerritoryEngine {
  /**
   * Loads current territory statistics for the active user, initializing defaults if needed.
   */
  public async getTerritoryStats(): Promise<TerritoryStats> {
    try {
      const saved = await db.activity.territoryStats.get();
      if (saved) {
        return {
          totalAreaKm2: saved.totalAreaKm2 || 0,
          totalCapturedCount: saved.totalCapturedCount || 0,
          totalDefendedCount: saved.totalDefendedCount || 0,
          xp: saved.xp || 0,
          level: saved.level || 1,
          levelName: saved.levelName || 'Explorer',
          achievements: Array.isArray(saved.achievements) ? saved.achievements : [],
          weeklyAreaKm2: saved.weeklyAreaKm2 || 0,
          monthlyAreaKm2: saved.monthlyAreaKm2 || 0,
        };
      }
    } catch {
      // Non-fatal fallback
    }

    return {
      totalAreaKm2: 0,
      totalCapturedCount: 0,
      totalDefendedCount: 0,
      xp: 0,
      level: 1,
      levelName: 'Explorer',
      achievements: [],
      weeklyAreaKm2: 0,
      monthlyAreaKm2: 0,
    };
  }

  /**
   * Processes a completed activity:
   * Generates cells, checks overlap, updates ownership & defense, calculates XP & level.
   */
  public async processActivity(
    activity: Activity,
    existingCells: TerritoryCell[]
  ): Promise<TerritoryProcessingResult> {
    const rawPoints = activity.route?.points || [];
    const distanceMeters = activity.distanceMeters || 0;
    const prCount = activity.personalRecords ? activity.personalRecords.length : 0;

    // 1. Generate territory cells from route polyline
    const touchedCells = generateTerritoryCellsFromRoute(rawPoints, activity.userId);

    // 2. Calculate newly captured vs defended cells
    const impact = calculateTerritoryImpact({
      touchedCells,
      existingCells,
      minActivityDistanceMeters: distanceMeters,
    });

    // 3. Calculate XP breakdown
    const xpBreakdown = calculateActivityXP({
      distanceMeters,
      newTerritoryCellsCount: impact.newlyCapturedCells.length,
      defendedCellsCount: impact.defendedCount,
      prCount,
    });

    // 4. Update stats & levels
    const currentStats = await this.getTerritoryStats();
    const newTotalXP = currentStats.xp + xpBreakdown.totalXP;
    const levelInfo = calculateUserLevel(newTotalXP);
    const isNewLevel = levelInfo.level > currentStats.level;

    const newTotalArea = Math.round((currentStats.totalAreaKm2 + impact.newAreaKm2) * 1000) / 1000;
    const newCapturedCount = currentStats.totalCapturedCount + impact.newlyCapturedCells.length;
    const newDefendedCount = currentStats.totalDefendedCount + impact.defendedCount;

    // 5. Evaluate Achievements
    const allActivities = await db.activity.activities.getAll();
    const totalActivities = allActivities.length + 1;
    const totalDistanceKm =
      (allActivities.reduce((acc, a) => acc + (a.distanceMeters || 0), 0) + distanceMeters) / 1000;
    const maxSingleDistKm = Math.max(
      ...allActivities.map(a => (a.distanceMeters || 0) / 1000),
      distanceMeters / 1000
    );

    const { newlyUnlocked } = evaluateAchievements({
      totalActivities,
      totalDistanceKm,
      maxSingleDistanceKm: maxSingleDistKm,
      totalTerritoryKm2: newTotalArea,
      totalDefenses: newDefendedCount,
      prCount,
      unlockedAchievementIds: currentStats.achievements,
    });

    const updatedAchievementIds = [
      ...currentStats.achievements,
      ...newlyUnlocked.map(a => a.id),
    ];

    const updatedStats: TerritoryStats = {
      totalAreaKm2: newTotalArea,
      totalCapturedCount: newCapturedCount,
      totalDefendedCount: newDefendedCount,
      xp: newTotalXP,
      level: levelInfo.level,
      levelName: levelInfo.levelName,
      achievements: updatedAchievementIds,
      weeklyAreaKm2: currentStats.weeklyAreaKm2 + impact.newAreaKm2,
      monthlyAreaKm2: currentStats.monthlyAreaKm2 + impact.newAreaKm2,
    };

    // 6. Persist changes to local IndexedDB
    try {
      if (impact.newlyCapturedCells.length > 0) {
        await db.activity.territoryCells.saveMany(impact.newlyCapturedCells);
      }
      if (impact.defendedCells.length > 0) {
        await db.activity.territoryCells.saveMany(impact.defendedCells);
      }
      await db.activity.territoryStats.save(updatedStats);
    } catch (err) {
      console.warn('[TerritoryEngine] Local persistence warning:', err);
    }

    return {
      newlyCapturedCount: impact.newlyCapturedCells.length,
      defendedCount: impact.defendedCount,
      newAreaKm2: impact.newAreaKm2,
      totalAreaKm2: newTotalArea,
      xpEarned: xpBreakdown.totalXP,
      totalXP: newTotalXP,
      level: levelInfo.level,
      levelName: levelInfo.levelName,
      isNewLevel,
      newAchievements: newlyUnlocked,
    };
  }

  /**
   * Syncs a single activity to Firestore (single doc write per activity) without individual GPS points.
   */
  public async syncActivityToFirestore(activity: Activity, stats: TerritoryStats): Promise<boolean> {
    if (!activity.userId || activity.userId === 'guest') return false;

    try {
      // 1. Write activity document (summary + compressed/simplified route only)
      const activityRef = doc(firestoreDb, `users/${activity.userId}/activities/${activity.id}`);
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
          routeSummary: activity.route
            ? {
                simplifiedPoints: activity.route.simplifiedPoints || [],
                distanceMeters: activity.route.distanceMeters,
                elevationGainMeters: activity.route.elevationGainMeters,
              }
            : null,
          createdAt: activity.createdAt,
          updatedAt: activity.updatedAt,
        },
        { merge: true }
      );

      // 2. Update user territory stats document (single write)
      const statsRef = doc(firestoreDb, `users/${activity.userId}/territoryStats/user_territory_stats`);
      await setDoc(statsRef, stats, { merge: true });

      return true;
    } catch (err) {
      console.warn('[TerritoryEngine] Cloud sync queued for later:', err);
      // Enqueue for offline sync
      await db.activity.syncQueue.enqueue({
        id: `sync_${activity.id}_${Date.now()}`,
        action: 'UPLOAD_ACTIVITY',
        payload: { activity, stats },
        createdAt: new Date().toISOString(),
      });
      return false;
    }
  }

  /**
   * Flushes pending offline activities queue when connectivity resumes.
   */
  public async flushSyncQueue(): Promise<number> {
    try {
      const queue = await db.activity.syncQueue.getAll();
      if (!queue || queue.length === 0) return 0;

      let syncedCount = 0;
      for (const item of queue) {
        const payload = item.payload as any;
        if (item.action === 'UPLOAD_ACTIVITY' && payload?.activity) {
          const ok = await this.syncActivityToFirestore(
            payload.activity,
            payload.stats
          );
          if (ok) {
            await db.activity.syncQueue.dequeue(item.id);
            syncedCount++;
          }
        }
      }
      return syncedCount;
    } catch {
      return 0;
    }
  }
}

export const territoryEngine = new TerritoryEngine();
