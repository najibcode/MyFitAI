// ─────────────────────────────────────────────────────────────
// MyFitAI — Rest Timer Widget
// Circular SVG progress ring with athletic countdown easing,
// 10s amber pulse warning, and subtle completion haptics.
// ─────────────────────────────────────────────────────────────

import React, { useEffect, useState } from 'react';
import { triggerHaptic, useReducedMotion } from '../../design/motion';
import { Timer, Check, Plus, Minus } from 'lucide-react';

interface RestTimerWidgetProps {
  initialSeconds: number;
  onComplete?: () => void;
  onCancel?: () => void;
  className?: string;
}

export const RestTimerWidget: React.FC<RestTimerWidgetProps> = ({
  initialSeconds,
  onComplete,
  onCancel,
  className = '',
}) => {
  const reducedMotion = useReducedMotion();
  const [totalSeconds, setTotalSeconds] = useState(initialSeconds);
  const [remainingSeconds, setRemainingSeconds] = useState(initialSeconds);
  const [isCompleted, setIsCompleted] = useState(false);

  useEffect(() => {
    setTotalSeconds(initialSeconds);
    setRemainingSeconds(initialSeconds);
    setIsCompleted(false);
  }, [initialSeconds]);

  useEffect(() => {
    if (remainingSeconds <= 0) {
      if (!isCompleted) {
        setIsCompleted(true);
        triggerHaptic('success');
        onComplete?.();
      }
      return;
    }

    const timer = setInterval(() => {
      setRemainingSeconds(prev => {
        const next = prev - 1;
        if (next === 10) {
          triggerHaptic('warning');
        } else if (next === 3 || next === 2 || next === 1) {
          triggerHaptic('light');
        }
        return next;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [remainingSeconds, isCompleted, onComplete]);

  const addTime = (secs: number) => {
    setRemainingSeconds(prev => prev + secs);
    setTotalSeconds(prev => prev + secs);
    setIsCompleted(false);
    triggerHaptic('light');
  };

  const minutes = Math.floor(remainingSeconds / 60);
  const seconds = remainingSeconds % 60;
  const timeFormatted = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  const progress = totalSeconds > 0 ? Math.max(0, remainingSeconds / totalSeconds) : 0;
  const strokeDashoffset = 283 - 283 * progress; // radius 45 -> circumference ~283

  const isWarning = remainingSeconds <= 10 && remainingSeconds > 0;

  return (
    <div className={`flex flex-col items-center p-4 bg-slate-900/90 border border-slate-800 rounded-2xl shadow-xl backdrop-blur-md ${className}`}>
      <div className="flex items-center justify-between w-full mb-3 text-xs font-semibold text-slate-400">
        <span className="flex items-center gap-1.5 uppercase tracking-wider">
          <Timer className="w-3.5 h-3.5 text-primary" /> Rest Interval
        </span>
        {onCancel && (
          <button
            onClick={onCancel}
            className="text-slate-500 hover:text-slate-300 transition-colors"
          >
            Skip
          </button>
        )}
      </div>

      {/* SVG Circular Ring */}
      <div className="relative w-36 h-36 flex items-center justify-center">
        <svg className="w-full h-full -rotate-90 transform" viewBox="0 0 100 100">
          {/* Background Track */}
          <circle
            cx="50"
            cy="50"
            r="45"
            fill="transparent"
            stroke="currentColor"
            strokeWidth="6"
            className="text-slate-800"
          />
          {/* Active Ring */}
          <circle
            cx="50"
            cy="50"
            r="45"
            fill="transparent"
            stroke="currentColor"
            strokeWidth="6"
            strokeDasharray="283"
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            className={
              isCompleted
                ? 'text-emerald-500 transition-all duration-300'
                : isWarning
                ? 'text-amber-500 transition-all duration-1000'
                : 'text-primary transition-all duration-1000'
            }
            style={{
              transition: reducedMotion ? 'none' : `stroke-dashoffset 1000ms linear`,
            }}
          />
        </svg>

        {/* Center Text */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          {isCompleted ? (
            <div className="flex flex-col items-center text-emerald-400 animate-zoom-in">
              <Check className="w-8 h-8 stroke-[3]" />
              <span className="text-[11px] font-bold tracking-wider uppercase mt-1">REST DONE</span>
            </div>
          ) : (
            <>
              <span
                className={`font-mono text-3xl font-black tracking-tight ${
                  isWarning ? 'text-amber-400 animate-pulse' : 'text-white'
                }`}
              >
                {timeFormatted}
              </span>
              <span className="text-[10px] uppercase tracking-wider text-slate-400 mt-0.5">
                {isWarning ? 'Get Ready' : 'Remaining'}
              </span>
            </>
          )}
        </div>
      </div>

      {/* Quick Add / Subtract Controls */}
      <div className="flex items-center gap-2 mt-3">
        <button
          onClick={() => addTime(-15)}
          disabled={remainingSeconds <= 15}
          className="px-2.5 py-1 text-xs rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 disabled:opacity-40 transition-colors flex items-center gap-1"
        >
          <Minus className="w-3 h-3" /> 15s
        </button>
        <button
          onClick={() => addTime(30)}
          className="px-2.5 py-1 text-xs rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 transition-colors flex items-center gap-1"
        >
          <Plus className="w-3 h-3" /> 30s
        </button>
      </div>
    </div>
  );
};
