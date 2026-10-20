// ─────────────────────────────────────────────────────────────
// MyFitAI — Activity, GPS & Territory Engine Domain Model
// Defines types for personal activity tracking (running, cycling, walking, etc.),
// GPS coordinates, routes, splits, laps, PRs, territory grid cells,
// XP, levels, and achievements.
// ─────────────────────────────────────────────────────────────

export type ActivityType =
  | 'RUN'
  | 'WALK'
  | 'CYCLING'
  | 'HIKING'
  | 'SWIMMING'
  | 'TREADMILL'
  | 'INDOOR_CYCLING'
  | 'ELLIPTICAL'
  | 'ROWING'
  | 'OTHER';

export type ActivitySource = 'GPS' | 'MANUAL' | 'IMPORTED_GPX' | 'HEALTH_CONNECT';

export interface ActivityPoint {
  latitude: number;
  longitude: number;
  timestamp: number; // Unix timestamp in ms
  altitude?: number; // Elevation in meters
  accuracy?: number; // GPS accuracy radius in meters
  speed?: number; // Speed in m/s
  heading?: number; // Compass heading in degrees
}

export interface ActivityRoute {
  points: ActivityPoint[];
  distanceMeters: number;
  elevationGainMeters: number;
  elevationLossMeters: number;
  encodedPolyline?: string;
  simplifiedPoints?: ActivityPoint[];
}

export interface ActivitySplit {
  splitIndex: number; // 1-based (e.g. km 1, km 2 or mi 1, mi 2)
  distanceMeters: number;
  durationSeconds: number;
  paceSecondsPerKm: number;
  speedKmh: number;
  elevationGainMeters: number;
}

export interface ActivityLap {
  lapIndex: number;
  durationSeconds: number;
  distanceMeters: number;
  paceSecondsPerKm: number;
  speedKmh: number;
}

export type PRCategory =
  | 'fastest_1k'
  | 'fastest_5k'
  | 'fastest_10k'
  | 'fastest_mile'
  | 'longest_distance'
  | 'longest_duration'
  | 'fastest_avg_pace'
  | 'highest_elevation';

export interface ActivityPersonalRecord {
  id: string;
  activityType: ActivityType;
  category: PRCategory;
  value: number; // Raw numeric value (seconds, meters, etc.)
  formattedValue: string; // e.g. "21:45" or "15.4 km"
  activityId: string;
  date: string; // YYYY-MM-DD
}

export type GoalMetric = 'distance' | 'duration' | 'activities' | 'elevation' | 'territory';
export type GoalPeriod = 'weekly' | 'monthly';

export interface ActivityGoal {
  id: string;
  title: string;
  metric: GoalMetric;
  targetValue: number; // meters, seconds, count, etc.
  currentValue: number;
  period: GoalPeriod;
  activityType?: ActivityType;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  completed: boolean;
}

export interface ActivityPreference {
  unitSystem: 'metric' | 'imperial';
  autoPause: boolean;
  privacyRadiusMeters: number; // 0, 100, 250, 500
  voiceFeedback: boolean;
  countExerciseInNutrition: boolean;
}

export interface Activity {
  id: string;
  userId: string;
  type: ActivityType;
  title: string;
  startTime: string; // ISO string
  endTime: string; // ISO string
  durationSeconds: number;
  movingDurationSeconds: number;
  distanceMeters: number;
  averagePaceSecondsPerKm: number;
  averageSpeedKmh: number;
  maxSpeedKmh: number;
  elevationGainMeters: number;
  elevationLossMeters: number;
  calories: number;
  steps?: number;
  route?: ActivityRoute;
  splits?: ActivitySplit[];
  laps?: ActivityLap[];
  personalRecords?: ActivityPersonalRecord[];
  source: ActivitySource;
  device?: string;
  notes?: string;
  heartRate?: {
    average?: number;
    max?: number;
  };
  territoryCapturedKm2?: number;
  territoryDefendedCount?: number;
  xpEarned?: number;
  isAutoPaused?: boolean;
  synced?: boolean;
  createdAt: string;
  updatedAt: string;
}

// ── Territory Engine Types ───────────────────────────────────

export interface TerritoryCell {
  cellId: string; // Unique spatial grid ID, e.g. "cell_28.613_77.209"
  gridKey: string;
  center: { lat: number; lng: number };
  bounds: {
    north: number;
    south: number;
    east: number;
    west: number;
  };
  areaKm2: number;
  ownerId: string;
  firstCapturedAt: string;
  lastCapturedAt: string;
  captureCount: number;
  defendedCount: number;
  lastDefendedAt?: string;
}

export interface TerritoryStats {
  totalAreaKm2: number;
  totalCapturedCount: number;
  totalDefendedCount: number;
  xp: number;
  level: number;
  levelName: string;
  achievements: string[];
  weeklyAreaKm2: number;
  monthlyAreaKm2: number;
}

export interface ActivityAchievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  category: 'activity' | 'distance' | 'territory' | 'pr';
  unlockedAt?: string;
  progress: number;
  maxProgress: number;
}

export interface ActivitySummary {
  totalActivities: number;
  totalDistanceMeters: number;
  totalDurationSeconds: number;
  totalCalories: number;
  totalElevationGain: number;
  byType: Partial<Record<ActivityType, { count: number; distanceMeters: number; durationSeconds: number }>>;
}

export type GPSQuality = 'EXCELLENT' | 'GOOD' | 'WEAK' | 'SEARCHING';
