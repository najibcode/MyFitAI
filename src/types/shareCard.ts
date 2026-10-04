// ─────────────────────────────────────────────────────────────
// MyFitAI — Shareable Muscle Card Domain Models & Types
// High-resolution social media sharing of user physique photos,
// anatomical muscle training heatmaps, recovery states, and PRs.
// ─────────────────────────────────────────────────────────────

import type { MuscleTrainingMetric } from './anatomicalMuscle';
import type { HeatmapMode } from '../components/MuscleHeatmap';

export type ShareCardTemplate =
  | 'hero_photo' // Template A: Large hero photo, glassmorphic anatomical map, stats badge
  | 'split' // Template B: 50/50 dual pane with photo + front & back anatomical heatmap
  | 'anatomical_focus' // Template C: Large central anatomical map, circular/pill photo inset, muscle stats
  | 'progress_compare' // Template D: Before & After comparison with muscle transformation map
  | 'minimal' // Template E: Large photo, compact corner heatmap overlay, bold branding
  | 'heatmap_only'; // Template F: Pure anatomical heatmap, no photo required, muscle rankings & stats

export type ShareCardFormat =
  | 'instagram_portrait' // 1080 × 1350 (4:5)
  | 'instagram_square' // 1080 × 1080 (1:1)
  | 'instagram_story' // 1080 × 1920 (9:16)
  | 'whatsapp'; // 1080 × 1350 (4:5)

export type ShareCardTheme = 'dark' | 'light' | 'cyber' | 'stealth';

export type ShareCardPeriod =
  | 'session'
  | '7d'
  | '14d'
  | '30d'
  | 'this_week'
  | 'this_month'
  | 'all';

export interface PhotoTransform {
  zoom: number; // 1.0 to 3.0
  x: number; // percentage offset (-50 to 50)
  y: number; // percentage offset (-50 to 50)
  rotation: number; // 0, 90, 180, 270
  fit: 'cover' | 'contain';
}

export interface ShareCardConfig {
  template: ShareCardTemplate;
  format: ShareCardFormat;
  theme: ShareCardTheme;
  period: ShareCardPeriod;
  mode: HeatmapMode;
  photoUrl: string | null;
  secondaryPhotoUrl?: string | null; // For before/after mode
  photoTransform: PhotoTransform;
  secondaryPhotoTransform?: PhotoTransform;
  showStats: boolean;
  showRecovery: boolean;
  showDate: boolean;
  showLogo: boolean;
  showWatermark: boolean;
  mapView: 'both' | 'front' | 'back';
  customTitle?: string;
}

export const FORMAT_DIMENSIONS: Record<ShareCardFormat, { width: number; height: number }> = {
  instagram_portrait: { width: 1080, height: 1350 },
  instagram_square: { width: 1080, height: 1080 },
  instagram_story: { width: 1080, height: 1920 },
  whatsapp: { width: 1080, height: 1350 },
};

export const DEFAULT_SHARE_CONFIG: ShareCardConfig = {
  template: 'split',
  format: 'instagram_portrait',
  theme: 'dark',
  period: '7d',
  mode: 'target',
  photoUrl: null,
  photoTransform: {
    zoom: 1.0,
    x: 0,
    y: 0,
    rotation: 0,
    fit: 'cover',
  },
  showStats: true,
  showRecovery: true,
  showDate: true,
  showLogo: true,
  showWatermark: true,
  mapView: 'both',
};

export interface ShareableMuscleLoadItem {
  id: string;
  name: string;
  region: string;
  loadTier: 'Maximum' | 'High' | 'Moderate' | 'Low';
  sets: number;
  volumeKg: number;
  recoveryPercentage: number;
  recoveryState: string;
  fillColor: string;
}

export interface ShareableMuscleData {
  periodLabel: string;
  dateRangeFormatted: string;
  totalWorkouts: number;
  totalSets: number;
  totalVolumeKg: number;
  totalDurationMinutes: number;
  prs: Array<{
    exerciseName: string;
    value: string;
    type: string;
  }>;
  topMuscles: ShareableMuscleLoadItem[];
  balance: {
    pushSets: number;
    pullSets: number;
    quadSets: number;
    hamstringSets: number;
  };
  metrics: Record<string, MuscleTrainingMetric>;
}

export interface ProgressPhotoEntry {
  id: string;
  dataUrl: string; // Base64 data URL
  date: string; // ISO date string
  weightKg?: number;
  tag?: 'front' | 'back' | 'side' | 'progress';
  notes?: string;
  createdAt: number;
}
