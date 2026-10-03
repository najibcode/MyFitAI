// ─────────────────────────────────────────────────────────────
// MyFitAI — Nutrition Analytics & Calendar View
// Multi-timeframe trend analysis (7d, 30d, 90d), goal adherence,
// macro ratios, and interactive date-picker calendar.
// ─────────────────────────────────────────────────────────────

import { useState, useMemo } from 'react';
import type { MealEntry, NutritionWeightEntry } from '../../types/nutrition';

interface NutritionAnalyticsViewProps {
  entries: MealEntry[];
  weightLogs: NutritionWeightEntry[];
  targetCalories: number;
  targetProtein: number;
  onSelectDate: (date: string) => void;
  selectedDate: string;
}

export default function NutritionAnalyticsView({
  entries,
  weightLogs,
  targetCalories,
  targetProtein,
  onSelectDate,
  selectedDate,
}: NutritionAnalyticsViewProps) {
  const [timeframe, setTimeframe] = useState<'7d' | '30d' | '90d'>('7d');

  // Compute daily totals map
  const dailyDataMap = useMemo(() => {
    const map = new Map<string, { calories: number; protein: number; carbs: number; fat: number }>();
    for (const e of entries) {
      const cur = map.get(e.date) || { calories: 0, protein: 0, carbs: 0, fat: 0 };
      map.set(e.date, {
        calories: cur.calories + e.nutrients.calories,
        protein: cur.protein + e.nutrients.protein,
        carbs: cur.carbs + e.nutrients.carbohydrates,
        fat: cur.fat + e.nutrients.fat,
      });
    }
    return map;
  }, [entries]);

  // Days in timeframe
  const daysInTimeframe = timeframe === '7d' ? 7 : timeframe === '30d' ? 30 : 90;

  const trendDays = useMemo(() => {
    const today = new Date();
    const days: Array<{ date: string; label: string; calories: number; protein: number; carbs: number; fat: number }> = [];

    for (let i = daysInTimeframe - 1; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const str = d.toISOString().split('T')[0];
      const stats = dailyDataMap.get(str) || { calories: 0, protein: 0, carbs: 0, fat: 0 };
      const weekday = d.toLocaleDateString('en-US', { weekday: 'narrow' });
      days.push({
        date: str,
        label: timeframe === '7d' ? weekday : `${d.getDate()}`,
        ...stats,
      });
    }
    return days;
  }, [daysInTimeframe, dailyDataMap, timeframe]);

  // Statistics
  const daysWithLogs = trendDays.filter(d => d.calories > 0);
  const avgCalories = daysWithLogs.length > 0
    ? Math.round(daysWithLogs.reduce((s, d) => s + d.calories, 0) / daysWithLogs.length)
    : 0;
  const avgProtein = daysWithLogs.length > 0
    ? Math.round(daysWithLogs.reduce((s, d) => s + d.protein, 0) / daysWithLogs.length)
    : 0;

  const maxCal = Math.max(...trendDays.map(d => d.calories), targetCalories, 1);

  // Goal adherence
  const daysMet = daysWithLogs.filter(d => Math.abs(d.calories - targetCalories) / targetCalories <= 0.15).length;
  const adherenceRate = daysWithLogs.length > 0 ? Math.round((daysMet / daysWithLogs.length) * 100) : 0;

  return (
    <div className="space-y-4">
      {/* Timeframe selector */}
      <div className="flex items-center justify-between">
        <h3 className="font-headline font-bold text-base text-on-surface">Nutrition Analytics</h3>
        <div className="flex bg-white/5 p-1 rounded-xl gap-1 text-xs">
          {(['7d', '30d', '90d'] as const).map(t => (
            <button
              key={t}
              onClick={() => setTimeframe(t)}
              className={`px-3 py-1 rounded-lg font-bold transition-all ${
                timeframe === t
                  ? 'bg-primary text-black shadow-sm'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              {t.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Summary KPI row */}
      <div className="grid grid-cols-3 gap-2.5">
        <div className="bg-[var(--color-surface-container)] p-3.5 rounded-2xl border border-white/5 text-center">
          <span className="text-[10px] uppercase font-bold text-on-surface-variant block mb-1">Avg Energy</span>
          <span className="font-headline font-black text-xl text-on-surface leading-none block">
            {avgCalories}
          </span>
          <span className="text-[10px] text-on-surface-variant font-normal">kcal/day</span>
        </div>

        <div className="bg-[var(--color-surface-container)] p-3.5 rounded-2xl border border-white/5 text-center">
          <span className="text-[10px] uppercase font-bold text-amber-400 block mb-1">Avg Protein</span>
          <span className="font-headline font-black text-xl text-on-surface leading-none block">
            {avgProtein}
          </span>
          <span className="text-[10px] text-on-surface-variant font-normal">/ {targetProtein}g target</span>
        </div>

        <div className="bg-[var(--color-surface-container)] p-3.5 rounded-2xl border border-white/5 text-center">
          <span className="text-[10px] uppercase font-bold text-emerald-400 block mb-1">Adherence</span>
          <span className="font-headline font-black text-xl text-on-surface leading-none block">
            {adherenceRate}%
          </span>
          <span className="text-[10px] text-on-surface-variant font-normal">{weightLogs.length} weight entries</span>
        </div>
      </div>

      {/* Calorie Trend Bar Chart */}
      <div className="bg-[var(--color-surface-container)] p-5 rounded-2xl border border-white/5 space-y-3">
        <div className="flex justify-between items-baseline">
          <span className="text-xs font-bold text-on-surface uppercase tracking-wide">Daily Calorie Intake</span>
          <span className="text-[11px] text-on-surface-variant">Target: {targetCalories} kcal</span>
        </div>

        {/* Visual Bars */}
        <div className="h-36 flex items-end gap-1.5 pt-4 pb-1">
          {trendDays.map((d, idx) => {
            const hPct = Math.min(100, Math.round((d.calories / maxCal) * 100));
            const isSelected = d.date === selectedDate;
            const isMet = d.calories > 0 && Math.abs(d.calories - targetCalories) / targetCalories <= 0.15;

            return (
              <div
                key={idx}
                onClick={() => onSelectDate(d.date)}
                className="flex-1 flex flex-col items-center h-full justify-end cursor-pointer group"
                title={`${d.date}: ${d.calories} kcal`}
              >
                <div
                  className={`w-full rounded-t-md transition-all duration-300 ${
                    isSelected
                      ? 'bg-primary shadow-[0_0_12px_rgba(255,122,0,0.5)]'
                      : isMet
                      ? 'bg-emerald-400/80 group-hover:bg-emerald-400'
                      : d.calories > 0
                      ? 'bg-white/20 group-hover:bg-white/40'
                      : 'bg-white/[0.04]'
                  }`}
                  style={{ height: `${Math.max(4, hPct)}%` }}
                />
                <span
                  className={`text-[9px] mt-1.5 transition-colors ${
                    isSelected ? 'text-primary font-bold' : 'text-on-surface-variant/60 group-hover:text-on-surface'
                  }`}
                >
                  {d.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
