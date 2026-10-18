import React, { useState } from 'react';
import { Moon, Sparkles } from 'lucide-react';
import { formatMinutesToHours } from '../../engine/healthCalculations';
import type { HealthPlatform } from '../../types/health';

interface SleepHistoryItem {
  date: string;
  durationMinutes: number;
  score?: number;
  source: HealthPlatform;
}

interface SleepHistoryChartProps {
  history: SleepHistoryItem[];
  userGoalHours: number;
}

export default function SleepHistoryChart({ history, userGoalHours }: SleepHistoryChartProps) {
  const [selectedDayIndex, setSelectedDayIndex] = useState<number | null>(null);

  const goalMinutes = Math.round(userGoalHours * 60);

  const safeHistory = React.useMemo(() => {
    if (history.length > 0) return history;
    const today = new Date();
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(today);
      d.setDate(today.getDate() - (6 - i));
      return {
        date: d.toISOString().split('T')[0],
        durationMinutes: 0,
        score: undefined,
        source: 'manual' as HealthPlatform,
      };
    });
  }, [history]);

  const maxMinutes = Math.max(
    goalMinutes * 1.25,
    ...safeHistory.map(h => h.durationMinutes),
    540 // 9 hours
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
          <div className="w-8 h-8 rounded-xl bg-indigo-500/10 flex items-center justify-center">
            <Moon className="w-4 h-4 text-indigo-400" />
          </div>
          <div>
            <h3 className="font-headline font-bold text-sm text-[var(--color-on-surface)]">
              Sleep Analysis
            </h3>
            <p className="text-[11px] text-[var(--color-on-surface-variant)]">
              Sleep night duration & recovery score
            </p>
          </div>
        </div>

        {selectedItem && (
          <div className="text-right">
            <span className="font-headline font-black text-base text-[var(--color-on-surface)] tabular-nums block">
              {selectedItem.durationMinutes > 0 ? formatMinutesToHours(selectedItem.durationMinutes) : 'No data'}
            </span>
            <div className="flex items-center justify-end gap-1.5 text-[10px] text-[var(--color-muted)] font-mono">
              <span>{getDayLabel(selectedItem.date)}</span>
              {selectedItem.score !== undefined && (
                <span className="inline-flex items-center gap-0.5 text-indigo-300 font-bold bg-indigo-500/20 px-1.5 py-0.2 rounded-md">
                  <Sparkles className="w-2.5 h-2.5" />
                  Score {selectedItem.score}
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Bar Chart */}
      <div className="relative pt-6 pb-2">
        {/* Goal line */}
        <div
          className="absolute left-0 right-0 border-b border-dashed border-indigo-400/30 z-0 flex items-center justify-end pointer-events-none"
          style={{ bottom: `${Math.min(95, Math.max(10, (goalMinutes / maxMinutes) * 100))}%` }}
        >
          <span className="text-[9px] font-mono text-indigo-300/60 bg-[var(--color-surface)] px-1 -translate-y-2">
            Target {userGoalHours}h
          </span>
        </div>

        <div className="grid grid-cols-7 gap-2 sm:gap-3 h-36 items-end relative z-10">
          {safeHistory.map((item, idx) => {
            const isSelected = selectedDayIndex === idx || (selectedDayIndex === null && idx === safeHistory.length - 1);
            const heightPercent = item.durationMinutes > 0
              ? Math.min(100, Math.max(12, (item.durationMinutes / maxMinutes) * 100))
              : 8;
            const metGoal = item.durationMinutes >= goalMinutes * 0.95;

            return (
              <button
                key={item.date}
                type="button"
                onClick={() => setSelectedDayIndex(idx)}
                className="group flex flex-col items-center h-full justify-end focus:outline-none"
              >
                <div className="w-full max-w-[28px] h-full flex items-end">
                  <div
                    className={`w-full rounded-t-xl transition-all duration-300 relative ${
                      item.durationMinutes === 0
                        ? 'bg-white/[0.04]'
                        : metGoal
                          ? isSelected
                            ? 'bg-indigo-400 shadow-lg shadow-indigo-500/30'
                            : 'bg-indigo-500/80 hover:bg-indigo-400'
                          : isSelected
                            ? 'bg-indigo-300/80'
                            : 'bg-indigo-600/50 hover:bg-indigo-500/70'
                    }`}
                    style={{ height: `${heightPercent}%` }}
                  />
                </div>

                <span
                  className={`text-[10px] font-mono font-bold mt-2 transition-colors ${
                    isSelected ? 'text-indigo-400' : 'text-[var(--color-muted)]'
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
