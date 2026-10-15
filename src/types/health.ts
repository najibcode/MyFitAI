// ─────────────────────────────────────────────────────────────
// MyFitAI — Health Domain Model
// Defines types for native health integrations:
// Android Health Connect (READ_STEPS, READ_SLEEP),
// Apple HealthKit (StepCount, SleepAnalysis),
// sleep stages, sleep scores, daily readiness, and cloud sync.
// ─────────────────────────────────────────────────────────────

export type HealthPlatform = 'health_connect' | 'healthkit' | 'manual' | 'device' | 'unknown';

export interface SleepStageRecord {
  stage: 'deep' | 'light' | 'rem' | 'awake';
  durationMinutes: number;
  startDate?: string;
  endDate?: string;
}

export interface SleepStagesSummary {
  deep?: number; // duration in minutes
  light?: number; // duration in minutes (core / light)
  rem?: number; // duration in minutes
  awake?: number; // duration in minutes
}

export interface DailyHealthRecord {
  date: string; // Local timezone format YYYY-MM-DD
  steps: number;
  stepGoal: number;
  distanceKm?: number | null; // null if not provided by source (never fabricated)
  activeCalories?: number | null; // null if not provided by source (never fabricated)
  sleepDurationMinutes: number;
  sleepGoalMinutes: number;
  sleepStart?: string; // ISO string
  sleepEnd?: string; // ISO string
  sleepStages?: SleepStagesSummary;
  sleepScore?: number; // 0-100 Recovery sleep score
  readinessScore?: number; // 0-100 Daily readiness score
  source: HealthPlatform;
  device?: string;
  lastSyncedAt: string;
  manualOverride?: boolean;
}

export interface SleepScoreBreakdown {
  score: number; // 0-100
  rating: 'EXCELLENT' | 'GOOD' | 'FAIR' | 'LOW';
  durationFactor: number;
  targetRatio: number;
  stagesFactor?: number;
  consistencyNote: string;
}

export interface DailyReadinessResult {
  score: number; // 0-100
  rating: 'OPTIMAL' | 'READY' | 'MODERATE' | 'RECOVERY';
  headline: string;
  statement: string;
  trainingRecommendation: string;
}

export interface HealthPermissionState {
  steps: boolean;
  sleep: boolean;
  distance?: boolean;
  calories?: boolean;
}

export interface HealthSyncStatus {
  isAvailable: boolean;
  isConnected: boolean;
  isSyncing: boolean;
  platform: 'android' | 'ios' | 'web';
  platformName: string; // 'Android Health Connect' | 'Apple HealthKit' | 'Browser'
  error?: string | null;
  lastSyncedAt: string | null;
  permissions: HealthPermissionState;
}

export interface RawSleepSession {
  startDate: string;
  endDate: string;
  sleepState?: string;
  stages?: SleepStageRecord[];
  sourceName?: string;
  deviceType?: string;
}
