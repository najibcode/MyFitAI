// ─────────────────────────────────────────────────────────────
// MyFitAI — Animated Progress Bar
// Strava-inspired fluid progress indicator with athletic easing,
// 100% goal completion glow, subtle confetti, and reduced-motion support.
// ─────────────────────────────────────────────────────────────

import React, { useEffect, useState, useRef } from 'react';
import { MotionDurations, MotionEasings, useReducedMotion, triggerHaptic } from '../../design/motion';
import { Check, Sparkles } from 'lucide-react';

interface AnimatedProgressBarProps {
  current: number;
  target: number;
  className?: string;
  barColor?: string;
  glowOnComplete?: boolean;
  showCompletionBadge?: boolean;
  height?: number; // pixels, default 10
}

export const AnimatedProgressBar: React.FC<AnimatedProgressBarProps> = ({
  current,
  target,
  className = '',
  barColor = 'from-primary to-orange-500',
  glowOnComplete = true,
  showCompletionBadge = true,
  height = 10,
}) => {
  const reducedMotion = useReducedMotion();
  const percentage = target > 0 ? Math.min(100, Math.max(0, (current / target) * 100)) : 0;
  const isCompleted = current >= target && target > 0;

  const [hasCelebrated, setHasCelebrated] = useState(false);
  const [showCelebrationParticle, setShowCelebrationParticle] = useState(false);
  const prevCompletedRef = useRef(false);

  useEffect(() => {
    // Only celebrate on the transition to completion
    if (isCompleted && !prevCompletedRef.current && !hasCelebrated) {
      setHasCelebrated(true);
      setShowCelebrationParticle(true);
      triggerHaptic('success');

      const timer = setTimeout(() => {
        setShowCelebrationParticle(false);
      }, MotionDurations.celebration);
      return () => clearTimeout(timer);
    }
    prevCompletedRef.current = isCompleted;
  }, [isCompleted, hasCelebrated]);

  return (
    <div className={`relative w-full ${className}`}>
      {/* Background track */}
      <div
        className="w-full bg-slate-800/80 rounded-full overflow-hidden relative shadow-inner"
        style={{ height: `${height}px` }}
      >
        {/* Animated fill bar */}
        <div
          className={`h-full rounded-full bg-gradient-to-r ${barColor} relative ${
            isCompleted && glowOnComplete ? 'shadow-[0_0_12px_rgba(249,115,22,0.6)]' : ''
          }`}
          style={{
            width: `${percentage}%`,
            transition: reducedMotion
              ? 'none'
              : `width ${MotionDurations.large}ms ${MotionEasings.athletic}`,
          }}
        >
          {/* Subtle light shimmer along progress edge */}
          <div className="absolute right-0 top-0 bottom-0 w-2 bg-white/30 rounded-full blur-[1px]" />
        </div>
      </div>

      {/* Goal Reached Milestone Badge / Glow */}
      {isCompleted && showCompletionBadge && (
        <div
          className={`mt-2 flex items-center justify-between text-xs font-semibold ${
            reducedMotion ? 'opacity-100' : 'animate-fade-in'
          }`}
          style={{
            transition: `opacity ${MotionDurations.standard}ms ease-out`,
          }}
        >
          <div className="flex items-center gap-1.5 text-emerald-400">
            <div className="w-4 h-4 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center">
              <Check className="w-2.5 h-2.5 text-emerald-400" />
            </div>
            <span>GOAL COMPLETED</span>
          </div>
          <span className="text-slate-400 font-mono text-[11px]">
            {Math.round((current / target) * 100)}%
          </span>
        </div>
      )}

      {/* Subtle Restrained Particle Celebration on 100% trigger */}
      {showCelebrationParticle && !reducedMotion && (
        <div className="absolute -top-3 right-0 pointer-events-none flex items-center gap-1">
          <Sparkles className="w-4 h-4 text-amber-400 animate-ping opacity-75" />
          <span className="text-[10px] font-bold text-amber-300 tracking-wider uppercase animate-pulse">
            +PR
          </span>
        </div>
      )}
    </div>
  );
};
