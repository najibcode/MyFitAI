// ─────────────────────────────────────────────────────────────
// MyFitAI — Warmup Set Generator Engine
// Calculates progressive warmup ramp sets based on target working
// weight, bar weight, and rounding increments.
// ─────────────────────────────────────────────────────────────

import type { LoggedSet } from '../types/workout';
import { createDefaultLoggedSet } from '../types/workout';

export interface WarmupConfig {
  barWeight?: number;
  unit?: 'lbs' | 'kg';
  roundTo?: number;
}

/**
 * Calculates progressive ramp warm-up sets leading up to a target working weight.
 * Protocol:
 * 1. Empty Bar (45 lbs / 20 kg) × 10 reps
 * 2. ~50% of working weight × 5 reps
 * 3. ~70% of working weight × 3 reps
 * 4. ~85% of working weight × 1-2 reps (primer)
 */
export function generateWarmupSets(
  targetWeight: number,
  config: WarmupConfig = {}
): LoggedSet[] {
  const unit = config.unit || 'lbs';
  const barWeight = config.barWeight ?? (unit === 'kg' ? 20 : 45);
  const roundTo = config.roundTo ?? (unit === 'kg' ? 2.5 : 5);

  if (!targetWeight || targetWeight <= barWeight) {
    return [];
  }

  const roundWeight = (w: number) => {
    return Math.max(barWeight, Math.round(w / roundTo) * roundTo);
  };

  const sets: LoggedSet[] = [];

  // Set 1: Empty Bar × 10 reps
  const s1 = createDefaultLoggedSet('warmup');
  s1.weight = barWeight;
  s1.reps = 10;
  sets.push(s1);

  const diff = targetWeight - barWeight;

  // Set 2: ~50% of target
  if (diff >= (unit === 'kg' ? 15 : 35)) {
    const s2 = createDefaultLoggedSet('warmup');
    s2.weight = roundWeight(targetWeight * 0.5);
    s2.reps = 5;
    if (s2.weight > barWeight && s2.weight < targetWeight) {
      sets.push(s2);
    }
  }

  // Set 3: ~70% of target
  if (diff >= (unit === 'kg' ? 35 : 75)) {
    const s3 = createDefaultLoggedSet('warmup');
    s3.weight = roundWeight(targetWeight * 0.7);
    s3.reps = 3;
    const lastWeight = sets[sets.length - 1]?.weight || barWeight;
    if (s3.weight > lastWeight && s3.weight < targetWeight) {
      sets.push(s3);
    }
  }

  // Set 4: ~85% of target (primer)
  if (diff >= (unit === 'kg' ? 55 : 120)) {
    const s4 = createDefaultLoggedSet('warmup');
    s4.weight = roundWeight(targetWeight * 0.85);
    s4.reps = 1;
    const lastWeight = sets[sets.length - 1]?.weight || barWeight;
    if (s4.weight > lastWeight && s4.weight < targetWeight) {
      sets.push(s4);
    }
  }

  return sets;
}
