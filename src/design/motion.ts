// ─────────────────────────────────────────────────────────────
// MyFitAI — Motion Design & Athletic Animation System
// Strava-inspired high-performance motion tokens, spring easing curves,
// accessible reduced-motion support, and non-intrusive tactile haptics.
// ─────────────────────────────────────────────────────────────

import { useState, useEffect } from 'react';

/**
 * Reusable motion timing tokens (milliseconds)
 */
export const MotionDurations = {
  micro: 140,       // Taps, icon toggles, tactile state changes
  small: 200,       // Button state transitions, badge pops, tooltips
  standard: 260,    // Card expansions, tab indicator glides, modals
  large: 340,       // Page transitions, countdown transitions, drawer slides
  celebration: 700, // Goal reached, PR unlocked, trophy reveals
} as const;

/**
 * Easing curves tuned for an athletic, responsive feel
 */
export const MotionEasings = {
  athletic: 'cubic-bezier(0.16, 1, 0.3, 1)',  // Snappy spring-like deceleration
  standard: 'cubic-bezier(0.2, 0, 0, 1)',      // Fluid interface transition
  smooth: 'cubic-bezier(0.4, 0, 0.2, 1)',      // Standard material smooth
  calm: 'cubic-bezier(0.25, 1, 0.5, 1)',       // Slow relaxation (sleep / recovery)
} as const;

export const Motion = {
  durations: MotionDurations,
  easings: MotionEasings,
};

/**
 * React hook to respect OS reduced-motion accessibility settings
 */
export function useReducedMotion(): boolean {
  const [prefersReduced, setPrefersReduced] = useState<boolean>(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return false;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  });

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const handler = (event: MediaQueryListEvent) => setPrefersReduced(event.matches);
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  return prefersReduced;
}

export type HapticType = 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error';

/**
 * Non-intrusive tactile haptic feedback.
 * Used exclusively for key moments:
 * - Activity countdown (3-2-1-GO)
 * - Set completed
 * - PR / Goal reached
 * - Rest timer 00:00
 * Never triggered for high-frequency step events to conserve battery.
 */
export function triggerHaptic(type: HapticType = 'light'): void {
  if (typeof window === 'undefined' || !window.navigator?.vibrate) return;

  try {
    switch (type) {
      case 'light':
        navigator.vibrate(12);
        break;
      case 'medium':
        navigator.vibrate(24);
        break;
      case 'heavy':
        navigator.vibrate(40);
        break;
      case 'success':
        navigator.vibrate([20, 40, 30]);
        break;
      case 'warning':
        navigator.vibrate([30, 50, 30]);
        break;
      case 'error':
        navigator.vibrate([50, 40, 50]);
        break;
    }
  } catch {
    // Vibration ignored if device doesn't support or permission blocked
  }
}
