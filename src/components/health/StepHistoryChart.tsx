import React, { useState } from 'react';
import { Footprints, CheckCircle2 } from 'lucide-react';
import type { HealthPlatform } from '../../types/health';

interface StepHistoryItem {
  date: string;
  steps: number;
  goal: number;
  source: HealthPlatform;
}

interface StepHistoryChartProps {
  history: StepHistoryItem[];
  userGoal: number;
}

export default function StepHistoryChart({ history, userGoal }: StepHistoryChartProps) {
  const [selectedDayIndex, setSelectedDayIndex] = useState<number | null>(null);

  // Default to 7 days if empty
  const safeHistory = React.useMemo(() => {
    if (history.length > 0) return history;
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const today = new Date();
    return days.map((_, i) => {
      const d = new Date(today);
      d.setDate(today.getDate() - (6 - i));
      const dateStr = d.toISOString().split('T')[0];
      return {
        date: dateStr,
        steps: 0,
        goal: userGoal,
        source: 'manual' as HealthPlatform,
      };
    });
  }, [history, userGoal]);

  const maxSteps = Math.max(
    userGoal * 1.15,
    ...safeHistory.map(h => h.steps),
    8000
  );

  const getDayLabel = (dateStr: string) => {
    try {
      const [y, m, d] = dateStr.split('-').map(Number);
      const date = new Date(y, m - 1, d);
      return date.toLocaleDateString(undefined, { weekday: 'short' });
    } catch {
      return dateStr.slice(-2);
    }
  };

  const selectedItem = selectedDayIndex !== null ? safeHistory[selectedDayIndex] : safeHistory[safeHistory.length - 1];

  return (
    <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-3xl p-5 sm:p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-emerald-500/10 flex items-center justify-center">
            <Footprints className="w-4 h-4 text-emerald-400" />
          </div>
          <div>
            <h3 className="font-headline font-bold text-sm text-[var(--color-on-surface)]">
              Step History
            </h3>
            <p className="text-[11px] text-[var(--color-on-surface-variant)]">
              Daily aggregated totals
            </p>
          </div>
        </div>

        {selectedItem && (
          <div className="text-right">
            <span className="font-headline font-black text-base text-[var(--color-on-surface)] tabular-nums block">
              {selectedItem.steps > 0 ? selectedItem.steps.toLocaleString() : 'No data'}
            </span>
            <span className="text-[10px] text-[var(--color-muted)] font-mono block">
              {getDayLabel(selectedItem.date)} · Goal: {selectedItem.goal.toLocaleString()}
            </span>
          </div>
        )}
      </div>

      {/* Bar Chart Container */}
      <div className="relative pt-6 pb-2">
        {/* Goal Baseline */}
        <div
          className="absolute left-0 right-0 border-b border-dashed border-white/20 z-0 flex items-center justify-end pointer-events-none"
          style={{ bottom: `${Math.min(95, Math.max(10, (userGoal / maxSteps) * 100))}%` }}
        >
          <span className="text-[9px] font-mono text-white/40 bg-[var(--color-surface)] px-1 -translate-y-2">
            Goal {userGoal >= 1000 ? `${(userGoal / 1000).toFixed(0)}k` : userGoal}
          </span>
        </div>

        {/* 7 Columns */}
        <div className="grid grid-cols-7 gap-2 sm:gap-3 h-36 items-end relative z-10">
          {safeHistory.map((item, idx) => {
            const isSelected = selectedDayIndex === idx || (selectedDayIndex === null && idx === safeHistory.length - 1);
            const heightPercent = item.steps > 0
              ? Math.min(100, Math.max(12, (item.steps / maxSteps) * 100))
              : 8;
            const metGoal = item.steps >= item.goal;

            return (
              <button
                key={item.date}
                type="button"
                onClick={() => setSelectedDayIndex(idx)}
                className="group flex flex-col items-center h-full justify-end focus:outline-none"
              >
                {/* Bar */}
                <div className="w-full max-w-[28px] h-full flex items-end">
                  <div
                    className={`w-full rounded-t-xl transition-all duration-300 relative ${
                      item.steps === 0
                        ? 'bg-white/[0.04]'
                        : metGoal
                          ? isSelected
                            ? 'bg-emerald-400 shadow-lg shadow-emerald-500/30'
                            : 'bg-emerald-500/80 hover:bg-emerald-400'
                          : isSelected
                            ? 'bg-emerald-300/90'
                            : 'bg-emerald-600/50 hover:bg-emerald-500/70'
                    }`}
                    style={{ height: `${heightPercent}%` }}
                  >
                    {metGoal && (
                      <CheckCircle2 className="w-2.5 h-2.5 text-black absolute top-1 left-1/2 -translate-x-1/2 opacity-75 hidden sm:block" />
                    )}
                  </div>
                </div>

                {/* Day label */}
                <span
                  className={`text-[10px] font-mono font-bold mt-2 transition-colors ${
                    isSelected ? 'text-[var(--color-primary)]' : 'text-[var(--color-muted)]'
                  }`}
                >
                  {getDayLabel(item.date).charAt(0)}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
