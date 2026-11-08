// ─────────────────────────────────────────────────────────────
// MyFitAI — Activity Countdown Modal (3-2-1-GO)
// Athletic, punchy countdown transition for starting runs/walks/workouts.
// Synchronized with subtle haptic taps and fluid spring scaling.
// ─────────────────────────────────────────────────────────────

import React, { useState, useEffect } from 'react';
import { MotionDurations, MotionEasings, triggerHaptic, useReducedMotion } from '../../design/motion';
import { Flame, X } from 'lucide-react';

interface ActivityCountdownModalProps {
  activityTitle: string;
  isOpen: boolean;
  onComplete: () => void;
  onCancel: () => void;
}

export const ActivityCountdownModal: React.FC<ActivityCountdownModalProps> = ({
  activityTitle,
  isOpen,
  onComplete,
  onCancel,
}) => {
  const reducedMotion = useReducedMotion();
  const [step, setStep] = useState<'READY' | 3 | 2 | 1 | 'GO'>('READY');

  useEffect(() => {
    if (!isOpen) {
      setStep('READY');
      return;
    }

    if (reducedMotion) {
      // If user enabled reduced motion, skip the intense visual pulse
      triggerHaptic('success');
      onComplete();
      return;
    }

    // Athletic 3-2-1-GO pacing
    triggerHaptic('light');
    const timerReady = setTimeout(() => {
      setStep(3);
      triggerHaptic('light');
    }, 450);

    const timer3 = setTimeout(() => {
      setStep(2);
      triggerHaptic('light');
    }, 1050);

    const timer2 = setTimeout(() => {
      setStep(1);
      triggerHaptic('medium');
    }, 1650);

    const timer1 = setTimeout(() => {
      setStep('GO');
      triggerHaptic('success');
    }, 2250);

    const timerGo = setTimeout(() => {
      onComplete();
    }, 2850);

    return () => {
      clearTimeout(timerReady);
      clearTimeout(timer3);
      clearTimeout(timer2);
      clearTimeout(timer1);
      clearTimeout(timerGo);
    };
  }, [isOpen, reducedMotion, onComplete]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md px-6">
      <button
        onClick={onCancel}
        className="absolute top-6 right-6 p-2 rounded-full bg-slate-800/80 text-slate-400 hover:text-white transition-colors"
        aria-label="Cancel activity start"
      >
        <X className="w-6 h-6" />
      </button>

      <div className="flex flex-col items-center justify-center text-center">
        {/* Activity Category Pill */}
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-500/10 border border-orange-500/20 text-orange-400 text-xs font-semibold tracking-wider uppercase mb-8">
          <Flame className="w-3.5 h-3.5" />
          <span>{activityTitle}</span>
        </div>

        {/* Central Animated Countdown Display */}
        <div className="h-44 flex items-center justify-center">
          {step === 'READY' && (
            <div
              key="ready"
              className="text-4xl md:text-5xl font-black tracking-tight text-white animate-fade-in"
              style={{
                animationDuration: `${MotionDurations.large}ms`,
                animationTimingFunction: MotionEasings.athletic,
              }}
            >
              READY
            </div>
          )}

          {(step === 3 || step === 2 || step === 1) && (
            <div
              key={step}
              className="text-8xl md:text-9xl font-black text-transparent bg-clip-text bg-gradient-to-b from-white via-orange-300 to-orange-500 transform scale-100 animate-zoom-in"
              style={{
                animationDuration: '500ms',
                animationTimingFunction: MotionEasings.athletic,
              }}
            >
              {step}
            </div>
          )}

          {step === 'GO' && (
            <div
              key="go"
              className="text-8xl md:text-9xl font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-green-300 to-teal-400 transform animate-pulse"
              style={{
                animationDuration: `${MotionDurations.standard}ms`,
                animationTimingFunction: MotionEasings.athletic,
              }}
            >
              GO!
            </div>
          )}
        </div>

        <p className="mt-6 text-sm text-slate-400 font-medium tracking-wide">
          GPS & Motion Sensors Engaged
        </p>
      </div>
    </div>
  );
};
