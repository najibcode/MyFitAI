// ─────────────────────────────────────────────────────────────
// MyFitAI — Health & Sleep Analytics Engine
// Pure calculations for local-timezone day boundaries,
// sleep-night attribution (crossing midnight), duration tallying,
// sleep stages extraction, transparent recovery sleep scoring,
// and deterministic daily training readiness.
// ─────────────────────────────────────────────────────────────

import type {
  SleepStagesSummary,
  SleepScoreBreakdown,
  DailyReadinessResult,
  RawSleepSession,
  HealthPlatform,
} from '../types/health';

/**
 * Returns a local-timezone YYYY-MM-DD string for a given Date.
 * Never uses UTC to avoid timezone shift errors.
 */
export function formatLocalDayKey(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Returns local day start (00:00:00.000) and end (23:59:59.999) Date objects.
 */
export function getLocalDayBounds(dateString: string): { start: Date; end: Date } {
  const [year, month, day] = dateString.split('-').map(Number);
  const start = new Date(year, month - 1, day, 0, 0, 0, 0);
  const end = new Date(year, month - 1, day, 23, 59, 59, 999);
  return { start, end };
}

/**
 * Assigns a sleep session to its appropriate "sleep night" (Requirement 27 & 28).
 * Example:
 * - Sleep from 11:30 PM Oct 6 to 7:15 AM Oct 7 -> belongs to "Oct 6" sleep night.
 * - Sleep from 01:15 AM Oct 7 to 8:30 AM Oct 7 -> belongs to "Oct 6" sleep night (went to bed late).
 * - Daytime nap at 2:00 PM Oct 7 -> belongs to "Oct 7".
 */
export function getSleepNightKey(startDateInput: Date | string): string {
  const start = new Date(startDateInput);
  const hour = start.getHours();

  // If sleep begins between midnight and 6:00 AM, it is part of the previous evening's sleep night
  if (hour < 6) {
    const prevDay = new Date(start);
    prevDay.setDate(prevDay.getDate() - 1);
    return formatLocalDayKey(prevDay);
  }

  // Otherwise, if it starts after 6:00 AM (evening or daytime nap), attribute to that local day
  return formatLocalDayKey(start);
}

/**
 * Processes raw sleep sessions into a consolidated sleep night summary.
 * Correctly accounts for sleep crossing midnight and aggregates granular stages if provided.
 */
export function processSleepSessions(
  sessions: RawSleepSession[],
  targetNightKey: string
): {
  durationMinutes: number;
  sleepStart?: string;
  sleepEnd?: string;
  stages?: SleepStagesSummary;
  hasStages: boolean;
} {
  // Filter sessions that belong to the target sleep night, or fall back to all sessions in query window
  let nightSessions = sessions.filter(s => getSleepNightKey(s.startDate) === targetNightKey);
  if (nightSessions.length === 0 && sessions.length > 0) {
    nightSessions = sessions;
  }

  if (nightSessions.length === 0) {
    return { durationMinutes: 0, hasStages: false };
  }

  // Sort chronologically by start date
  nightSessions.sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());

  let totalSleepMinutes = 0;
  let earliestStart: string | undefined;
  let latestEnd: string | undefined;

  let deepMinutes = 0;
  let lightMinutes = 0;
  let remMinutes = 0;
  let awakeMinutes = 0;
  let hasStageData = false;

  nightSessions.forEach(session => {
    const sStart = new Date(session.startDate).getTime();
    const sEnd = new Date(session.endDate).getTime();
    const sessionDurationMin = Math.max(0, Math.round((sEnd - sStart) / 60000));

    if (!earliestStart || sStart < new Date(earliestStart).getTime()) {
      earliestStart = session.startDate;
    }
    if (!latestEnd || sEnd > new Date(latestEnd).getTime()) {
      latestEnd = session.endDate;
    }

    // If granular stage segments exist
    if (session.stages && session.stages.length > 0) {
      hasStageData = true;
      session.stages.forEach(st => {
        const stageDur = Math.max(0, Math.round(st.durationMinutes || 0));
        if (st.stage === 'deep') deepMinutes += stageDur;
        else if (st.stage === 'light') lightMinutes += stageDur;
        else if (st.stage === 'rem') remMinutes += stageDur;
        else if (st.stage === 'awake') awakeMinutes += stageDur;
      });
    } else {
      // If sample indicates state
      if (session.sleepState === 'awake') {
        awakeMinutes += sessionDurationMin;
      } else {
        totalSleepMinutes += sessionDurationMin;
      }
    }
  });

  // If stage segments were present, sleep duration is deep + light + rem
  if (hasStageData) {
    totalSleepMinutes = deepMinutes + lightMinutes + remMinutes;
  }

  // If stage segments were present, build stage summary
  let stagesSummary: SleepStagesSummary | undefined;
  if (hasStageData) {
    stagesSummary = {
      deep: deepMinutes,
      light: lightMinutes,
      rem: remMinutes,
      awake: awakeMinutes,
    };
  }

  return {
    durationMinutes: totalSleepMinutes,
    sleepStart: earliestStart,
    sleepEnd: latestEnd,
    stages: stagesSummary,
    hasStages: hasStageData,
  };
}

/**
 * Calculates a transparent, non-medical "Recovery sleep score" (0-100).
 * Based on:
 * 1. Sleep duration vs user configured goal (70% weight)
 * 2. Stage architecture (deep & REM) or healthy duration adherence (30% weight)
 */
export function calculateSleepScore(
  durationMinutes: number,
  goalMinutes: number,
  stages?: SleepStagesSummary
): SleepScoreBreakdown {
  if (durationMinutes <= 0) {
    return {
      score: 0,
      rating: 'LOW',
      durationFactor: 0,
      targetRatio: 0,
      consistencyNote: 'No sleep recorded',
    };
  }

  const effectiveGoal = Math.max(240, goalMinutes || 480); // minimum safe reference floor 4h, default 8h
  const targetRatio = Math.min(1.2, durationMinutes / effectiveGoal);

  // 1. Duration factor (up to 70 points)
  let durationFactor = 0;
  if (targetRatio >= 0.95 && targetRatio <= 1.1) {
    durationFactor = 70; // Met target
  } else if (targetRatio < 0.95) {
    durationFactor = Math.round(70 * (targetRatio / 0.95));
  } else {
    // Excessive oversleep (> 110%) slightly lowers recovery efficiency score
    const oversleepPenalty = (targetRatio - 1.1) * 30;
    durationFactor = Math.max(50, Math.round(70 - oversleepPenalty));
  }

  // 2. Stage or quality factor (up to 30 points)
  let stagesFactor = 0;
  let consistencyNote = '';

  if (stages && (stages.deep !== undefined || stages.rem !== undefined)) {
    const deep = stages.deep || 0;
    const rem = stages.rem || 0;
    const deepRatio = deep / durationMinutes;
    const remRatio = rem / durationMinutes;

    // Healthy deep sleep is ~15-25%
    let deepPoints = 0;
    if (deepRatio >= 0.15) deepPoints = 15;
    else deepPoints = Math.round(15 * (deepRatio / 0.15));

    // Healthy REM sleep is ~20-25%
    let remPoints = 0;
    if (remRatio >= 0.20) remPoints = 15;
    else remPoints = Math.round(15 * (remRatio / 0.20));

    stagesFactor = deepPoints + remPoints;
    consistencyNote = `Deep: ${Math.round(deepRatio * 100)}%, REM: ${Math.round(remRatio * 100)}%`;
  } else {
    // Stage data not available: assess based on physiological optimal sleep band (7h - 9h)
    if (durationMinutes >= 420 && durationMinutes <= 540) {
      stagesFactor = 28;
      consistencyNote = 'Optimal 7-9h duration window';
    } else if (durationMinutes >= 360) {
      stagesFactor = 22;
      consistencyNote = 'Moderate duration';
    } else {
      stagesFactor = 12;
      consistencyNote = 'Short sleep duration';
    }
  }

  const rawScore = Math.min(100, Math.max(10, durationFactor + stagesFactor));
  let rating: 'EXCELLENT' | 'GOOD' | 'FAIR' | 'LOW' = 'FAIR';
  if (rawScore >= 85) rating = 'EXCELLENT';
  else if (rawScore >= 75) rating = 'GOOD';
  else if (rawScore >= 60) rating = 'FAIR';
  else rating = 'LOW';

  return {
    score: rawScore,
    rating,
    durationFactor,
    targetRatio: Math.round(targetRatio * 100),
    stagesFactor,
    consistencyNote,
  };
}

/**
 * Calculates transparent, deterministic Daily Training Readiness (0-100).
 * Connects sleep, previous workouts, muscle recovery, and steps.
 * Explicitly framed as an athletic training recommendation, not medical advice.
 */
export function calculateDailyReadiness(params: {
  sleepDurationMinutes: number;
  sleepGoalMinutes: number;
  sleepScore?: number;
  muscleRecoveryPercentage: number; // 0 - 100 from muscle recovery engine
  steps: number;
  stepGoal: number;
}): DailyReadinessResult {
  const {
    sleepDurationMinutes,
    sleepGoalMinutes,
    sleepScore: providedSleepScore,
    muscleRecoveryPercentage,
    steps,
    stepGoal,
  } = params;

  // Resolve sleep score
  const sleepScore = providedSleepScore !== undefined
    ? providedSleepScore
    : calculateSleepScore(sleepDurationMinutes, sleepGoalMinutes).score;

  // Step adherence factor (up to 10 points)
  const stepRatio = stepGoal > 0 ? Math.min(1, steps / stepGoal) : 0.8;
  const stepContribution = Math.round(stepRatio * 10);

  // Core formula: 50% sleep recovery + 40% musculoskeletal recovery + 10% activity baseline
  let readinessScore = Math.round((0.50 * sleepScore) + (0.40 * muscleRecoveryPercentage) + stepContribution);
  readinessScore = Math.min(100, Math.max(15, readinessScore));

  if (readinessScore >= 85) {
    return {
      score: readinessScore,
      rating: 'OPTIMAL',
      headline: 'PRIMED FOR LOAD',
      statement: 'Recovery adaptations are complete. High capacity for strength & hypertrophy output.',
      trainingRecommendation: 'Proceed with planned high-intensity workout. Good window for progressive overload.',
    };
  }

  if (readinessScore >= 70) {
    return {
      score: readinessScore,
      rating: 'READY',
      headline: 'READY TO TRAIN',
      statement: 'Good overall physiological state. Ready for scheduled training volume.',
      trainingRecommendation: 'Proceed with planned workout. Maintain target working weights and reps.',
    };
  }

  if (readinessScore >= 55) {
    return {
      score: readinessScore,
      rating: 'MODERATE',
      headline: 'MODERATE VOLUME',
      statement: 'Moderate systemic fatigue detected from sleep or prior training load.',
      trainingRecommendation: 'Consider reducing overall set volume by 15-20% and avoiding training to absolute failure.',
    };
  }

  return {
    score: readinessScore,
    rating: 'RECOVERY',
    headline: 'RECOVERY FOCUS',
    statement: 'Systemic recovery is lagging. Central nervous system and muscles need recuperation.',
    trainingRecommendation: 'Prioritize restorative sleep and light active recovery (e.g. 20-30 min walk) instead of heavy resistance training.',
  };
}

/**
 * Format minutes into "7h 36m" or "45m" string.
 */
export function formatMinutesToHours(minutes: number): string {
  if (!minutes || minutes <= 0) return '0m';
  const hours = Math.floor(minutes / 60);
  const remaining = Math.round(minutes % 60);
  if (hours === 0) return `${remaining}m`;
  if (remaining === 0) return `${hours}h`;
  return `${hours}h ${remaining}m`;
}

/**
 * Format source key to a clean, user-friendly label (Requirement 18).
 */
export function formatHealthSourceLabel(source: HealthPlatform): string {
  switch (source) {
    case 'health_connect':
      return 'Health Connect';
    case 'healthkit':
      return 'Apple Health';
    case 'manual':
      return 'Manual Entry';
    case 'device':
      return 'Connected Device';
    default:
      return 'Device Sensor';
  }
}
