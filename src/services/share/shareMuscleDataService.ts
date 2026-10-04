// ─────────────────────────────────────────────────────────────
// MyFitAI — Shareable Muscle Data Aggregator
// Extracts and synthesizes real training data, volume landmarks,
// recovery state, and personal records for share card generation.
// ─────────────────────────────────────────────────────────────

import type { WorkoutSession } from '../../types/workout';
import type {
  ShareCardPeriod,
  ShareableMuscleData,
  ShareableMuscleLoadItem,
} from '../../types/shareCard';
import {
  computeMuscleTrainingMetrics,
  analyzeMuscleBalance,
} from '../../engine/muscleRecoveryEngine';

/**
 * Filter sessions by the selected timeframe
 */
export function filterSessionsByPeriod(
  sessions: WorkoutSession[],
  period: ShareCardPeriod,
  targetSession?: WorkoutSession
): WorkoutSession[] {
  if (period === 'session') {
    if (targetSession) return [targetSession];
    return sessions.length > 0 ? [sessions[0]] : [];
  }

  const now = Date.now();

  return sessions.filter(s => {
    const sDate = s.endedAt ? new Date(s.endedAt).getTime() : s.startedAt ? new Date(s.startedAt).getTime() : 0;
    if (sDate === 0) return false;

    switch (period) {
      case '7d':
        return now - sDate <= 7 * 86400000;
      case '14d':
        return now - sDate <= 14 * 86400000;
      case '30d':
        return now - sDate <= 30 * 86400000;
      case 'this_week': {
        const d = new Date();
        const day = d.getDay();
        const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Monday start
        const monday = new Date(d.setDate(diff));
        monday.setHours(0, 0, 0, 0);
        return sDate >= monday.getTime();
      }
      case 'this_month': {
        const d = new Date();
        const firstDay = new Date(d.getFullYear(), d.getMonth(), 1).getTime();
        return sDate >= firstDay;
      }
      case 'all':
      default:
        return true;
    }
  });
}

/**
 * Formats calendar date range string for share card display
 */
export function formatDateRange(sessions: WorkoutSession[], period: ShareCardPeriod): string {
  if (period === 'session' && sessions.length > 0) {
    const d = new Date(sessions[0].endedAt || sessions[0].startedAt || Date.now());
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  const now = new Date();
  let start = new Date();

  switch (period) {
    case '7d':
      start = new Date(now.getTime() - 7 * 86400000);
      break;
    case '14d':
      start = new Date(now.getTime() - 14 * 86400000);
      break;
    case '30d':
      start = new Date(now.getTime() - 30 * 86400000);
      break;
    case 'this_week': {
      const day = now.getDay();
      const diff = now.getDate() - day + (day === 0 ? -6 : 1);
      start = new Date(now.setDate(diff));
      break;
    }
    case 'this_month':
      start = new Date(now.getFullYear(), now.getMonth(), 1);
      break;
    case 'all':
      if (sessions.length > 0) {
        const earliest = Math.min(
          ...sessions.map(s => new Date(s.endedAt || s.startedAt || Date.now()).getTime())
        );
        start = new Date(earliest);
      }
      break;
  }

  const startStr = start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const endStr = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  return `${startStr} — ${endStr}`;
}

/**
 * Aggregates complete ShareableMuscleData from real workout sessions
 */
export function aggregateShareableMuscleData(
  allSessions: WorkoutSession[],
  period: ShareCardPeriod = '7d',
  targetSession?: WorkoutSession
): ShareableMuscleData {
  const filteredSessions = filterSessionsByPeriod(allSessions, period, targetSession);

  // Map timeframe to muscleRecoveryEngine timeframe parameter
  const engineTimeframe =
    period === 'session'
      ? 'session'
      : period === '30d' || period === 'this_month'
      ? '30d'
      : period === 'all'
      ? 'all'
      : '7d';

  const metrics = computeMuscleTrainingMetrics(filteredSessions, { timeframe: engineTimeframe });
  const balanceSummary = analyzeMuscleBalance(metrics);

  // Compute total volume, sets, duration
  let totalVolumeKg = 0;
  let totalSets = 0;
  let totalDurationSec = 0;
  const prs: Array<{ exerciseName: string; value: string; type: string }> = [];

  for (const s of filteredSessions) {
    totalVolumeKg += s.totalVolume || 0;
    totalSets += s.totalSets || 0;
    totalDurationSec += s.duration || 0;

    if (s.prsHit && s.prsHit.length > 0) {
      for (const pr of s.prsHit) {
        prs.push({
          exerciseName: pr.exerciseName,
          value: pr.type === 'reps' ? `${pr.value} reps` : `${pr.value} kg`,
          type: pr.type === '1rm' ? 'Est. 1RM' : pr.type,
        });
      }
    }
  }

  // Extract top trained muscles
  const metricsList = Object.values(metrics).filter(
    m => m.effectiveSets > 0 || m.primarySets > 0 || m.synergistSets > 0
  );

  metricsList.sort((a, b) => b.effectiveSets - a.effectiveSets);

  const maxSets = metricsList.length > 0 ? metricsList[0].effectiveSets : 1;

  const topMuscles: ShareableMuscleLoadItem[] = metricsList.slice(0, 7).map(m => {
    const ratio = m.effectiveSets / maxSets;
    let loadTier: 'Maximum' | 'High' | 'Moderate' | 'Low' = 'Low';
    let fillColor = '#38BDF8'; // Cyan default

    if (ratio >= 0.85) {
      loadTier = 'Maximum';
      fillColor = '#FF7A00'; // Neon flame orange
    } else if (ratio >= 0.6) {
      loadTier = 'High';
      fillColor = '#F97316';
    } else if (ratio >= 0.35) {
      loadTier = 'Moderate';
      fillColor = '#10B981'; // Emerald
    }

    return {
      id: m.muscleId,
      name: m.info.commonName,
      region: m.info.region,
      loadTier,
      sets: Math.round(m.effectiveSets * 10) / 10,
      volumeKg: Math.round(m.volumeLoadKg),
      recoveryPercentage: Math.round(m.recoveryPercentage),
      recoveryState: m.recoveryState,
      fillColor,
    };
  });

  const periodLabels: Record<ShareCardPeriod, string> = {
    session: 'Workout Session',
    '7d': '7-Day Training Map',
    '14d': '14-Day Progress',
    '30d': '30-Day Training Block',
    this_week: 'This Week',
    this_month: 'This Month',
    all: 'All-Time Training',
  };

  return {
    periodLabel: periodLabels[period],
    dateRangeFormatted: formatDateRange(filteredSessions, period),
    totalWorkouts: filteredSessions.length,
    totalSets,
    totalVolumeKg: Math.round(totalVolumeKg),
    totalDurationMinutes: Math.round(totalDurationSec / 60),
    prs,
    topMuscles,
    balance: {
      pushSets: balanceSummary.pushSets,
      pullSets: balanceSummary.pullSets,
      quadSets: balanceSummary.quadSets,
      hamstringSets: balanceSummary.hamstringSets,
    },
    metrics,
  };
}
