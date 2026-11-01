// ─────────────────────────────────────────────────────────────
// MyFitAI — History Calendar (month grid with workout dots)
// Athletic Personal Operating System UI/UX
// ─────────────────────────────────────────────────────────────

import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { WorkoutSession } from '../../types/workout';

interface HistoryCalendarProps {
  sessions: WorkoutSession[];
  currentMonth: Date;
  onPrevMonth: () => void;
  onNextMonth: () => void;
  selectedDate: string | null;
  onSelectDate: (date: string) => void;
}

export default function HistoryCalendar({
  sessions,
  currentMonth,
  onPrevMonth,
  onNextMonth,
  selectedDate,
  onSelectDate,
}: HistoryCalendarProps) {
  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = new Date().toISOString().split('T')[0];
  const monthLabel = currentMonth.toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });

  // Build workout-date map
  const workoutDates = new Map<string, number>();
  sessions.forEach(s => {
    const d = s.startedAt.split('T')[0];
    workoutDates.set(d, (workoutDates.get(d) || 0) + 1);
  });

  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  return (
    <div className="bg-[#151517] rounded-3xl border border-[#2A2A2D] p-5 mb-5 shadow-sm">
      {/* Month nav */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={onPrevMonth}
          className="w-8 h-8 rounded-lg bg-[#1E1E20] border border-[#2A2A2D] flex items-center justify-center text-[#A1A1A6] hover:text-[#F5F5F5] active:scale-95 transition-all"
          aria-label="Previous Month"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <h3 className="font-headline font-bold text-sm uppercase tracking-wide text-[#F5F5F5]">
          {monthLabel}
        </h3>
        <button
          onClick={onNextMonth}
          className="w-8 h-8 rounded-lg bg-[#1E1E20] border border-[#2A2A2D] flex items-center justify-center text-[#A1A1A6] hover:text-[#F5F5F5] active:scale-95 transition-all"
          aria-label="Next Month"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Day labels */}
      <div className="grid grid-cols-7 gap-1 mb-1">
        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
          <div
            key={i}
            className="text-center text-[10px] uppercase font-mono font-bold tracking-wider text-[#6B6B70] py-1"
          >
            {d}
          </div>
        ))}
      </div>

      {/* Date cells */}
      <div className="grid grid-cols-7 gap-1.5">
        {cells.map((day, i) => {
          if (day === null) return <div key={i} className="aspect-square" />;
          const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
          const count = workoutDates.get(dateStr) || 0;
          const isToday = dateStr === today;
          const isSelected = dateStr === selectedDate;

          return (
            <button
              key={i}
              onClick={() => onSelectDate(dateStr)}
              className={`relative aspect-square rounded-xl flex flex-col items-center justify-center text-xs font-mono font-semibold transition-all active:scale-95 ${
                isSelected
                  ? 'bg-[#30D158] text-black shadow-sm font-black'
                  : isToday
                  ? 'bg-[#30D158]/15 text-[#30D158] border border-[#30D158]/30 font-bold'
                  : 'text-[#F5F5F5] hover:bg-[#1E1E20]'
              }`}
            >
              <span>{day}</span>
              {count > 0 && !isSelected && (
                <div
                  className={`absolute bottom-1 w-1.5 h-1.5 rounded-full ${
                    isToday ? 'bg-[#30D158]' : 'bg-[#30D158]/80'
                  }`}
                />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
