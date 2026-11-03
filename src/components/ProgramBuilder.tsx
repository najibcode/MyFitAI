// ─────────────────────────────────────────────────────────────
// MyFitAI — Program Builder
// Weekly schedule grid: assign templates to days of the week
// Athletic Personal Operating System UI/UX
// ─────────────────────────────────────────────────────────────

import { useState, useEffect } from 'react';
import { useWorkoutBuilder } from '../context/WorkoutBuilderContext';
import { db } from '../utils/db';
import type { Program, DaySlot, WeekSchedule } from '../types/program';
import { DAY_LABELS_FULL } from '../types/program';
import { ChevronRight, Bed, X, Check } from 'lucide-react';

interface ProgramBuilderProps {
  isOpen: boolean;
  onClose: () => void;
}

const EMPTY_WEEK: DaySlot[] = Array.from({ length: 7 }, (_, i) => ({
  dayOfWeek: i,
  isRest: true,
  label: i === 0 || i === 6 ? 'Rest' : 'Rest',
}));

export default function ProgramBuilder({ isOpen, onClose }: ProgramBuilderProps) {
  const { templates } = useWorkoutBuilder();
  const [programs, setPrograms] = useState<Program[]>([]);
  const [name, setName] = useState('');
  const [weeks, setWeeks] = useState(4);
  const [schedule, setSchedule] = useState<DaySlot[]>([...EMPTY_WEEK]);
  const [selectingDay, setSelectingDay] = useState<number | null>(null);

  useEffect(() => {
    if (isOpen) {
      db.programs.getAll().then(setPrograms).catch(console.error);
    }
  }, [isOpen]);

  const assignTemplate = (dayIdx: number, templateId: string) => {
    const template = templates.find(t => t.id === templateId);
    if (!template) return;
    const next = [...schedule];
    next[dayIdx] = {
      ...next[dayIdx],
      templateId,
      templateName: template.name,
      isRest: false,
      label: template.name,
    };
    setSchedule(next);
    setSelectingDay(null);
  };

  const markRest = (dayIdx: number) => {
    const next = [...schedule];
    next[dayIdx] = {
      ...next[dayIdx],
      templateId: undefined,
      templateName: undefined,
      isRest: true,
      label: 'Rest',
    };
    setSchedule(next);
    setSelectingDay(null);
  };

  const handleSave = async () => {
    const weekSchedule: WeekSchedule[] = Array.from({ length: weeks }, (_, i) => ({
      weekNumber: i + 1,
      days: schedule,
    }));
    const program: Program = {
      id: crypto.randomUUID(),
      name: name || 'My Training Program',
      description: '',
      goal: 'general_fitness',
      durationWeeks: weeks,
      daysPerWeek: schedule.filter(d => !d.isRest).length,
      difficulty: 'all_levels',
      schedule: weekSchedule,
      isActive: true,
      currentWeek: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    // Deactivate other programs
    for (const p of programs) {
      if (p.isActive) await db.programs.save({ ...p, isActive: false });
    }
    await db.programs.save(program);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[80] flex flex-col justify-end">
      <div className="absolute inset-0 bg-black/75 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-[#151517] w-full max-w-xl mx-auto h-[82vh] rounded-t-3xl border-t border-[#2A2A2D] flex flex-col p-5 sm:p-6 animate-slide-up shadow-2xl">
        <div className="w-12 h-1 bg-[#2A2A2D] rounded-full mx-auto mb-4" />

        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-headline font-black text-xl text-[#F5F5F5] uppercase tracking-wide">
              Create Mesocycle Program
            </h3>
            <p className="text-[10px] font-mono text-[#A1A1A6] uppercase tracking-wider font-semibold">
              Weekly Microcycle Schedule
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-xl bg-[#1E1E20] border border-[#2A2A2D] flex items-center justify-center text-[#A1A1A6] hover:text-[#F5F5F5] transition-colors"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <input
          type="text"
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="e.g. 8-Week Hypertrophy Overload..."
          className="w-full bg-[#1E1E20] border border-[#2A2A2D] rounded-xl px-4 py-3 text-sm font-semibold text-[#F5F5F5] placeholder:text-[#6B6B70] outline-none focus:border-[#30D158] mb-4 transition-colors"
        />

        {/* Duration selector */}
        <div className="flex items-center gap-3 mb-5">
          <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#A1A1A6]">
            Duration
          </span>
          <div className="flex gap-1.5">
            {[4, 6, 8, 12].map(w => (
              <button
                key={w}
                type="button"
                onClick={() => setWeeks(w)}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all active:scale-95 border ${
                  weeks === w
                    ? 'bg-[#30D158] text-black border-[#30D158] shadow-sm'
                    : 'bg-[#1E1E20] text-[#A1A1A6] border-[#2A2A2D] hover:text-[#F5F5F5]'
                }`}
              >
                {w} Weeks
              </button>
            ))}
          </div>
        </div>

        {/* Weekly grid */}
        <div className="flex-1 overflow-y-auto space-y-2 pr-1 [scrollbar-width:none]">
          {schedule.map((day, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => setSelectingDay(idx)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl border transition-all active:scale-[0.99] text-left ${
                day.isRest
                  ? 'bg-[#1E1E20]/50 border-[#2A2A2D] text-[#6B6B70]'
                  : 'bg-[#1E1E20] border-[#2A2A2D] hover:border-[#30D158]/40'
              }`}
            >
              <span className="text-[11px] font-mono font-bold uppercase tracking-wider w-10 text-[#A1A1A6]">
                {DAY_LABELS_FULL[idx].slice(0, 3)}
              </span>
              <div className="flex-1">
                <p
                  className={`text-sm font-headline font-bold ${
                    day.isRest ? 'text-[#6B6B70]' : 'text-[#F5F5F5]'
                  }`}
                >
                  {day.isRest ? 'Rest & Physiological Recovery' : day.label}
                </p>
              </div>
              {!day.isRest && (
                <div className="w-2 h-2 rounded-full bg-[#30D158] shadow-[0_0_8px_rgba(48,209,88,0.5)]" />
              )}
              <ChevronRight className="w-4 h-4 text-[#6B6B70]" />
            </button>
          ))}
        </div>

        {/* Save button */}
        <button
          onClick={handleSave}
          className="w-full bg-[#30D158] hover:bg-[#30D158]/90 text-black py-4 rounded-xl font-headline font-black text-xs uppercase tracking-wider active:scale-[0.98] transition-all mt-4 flex items-center justify-center gap-2 shadow-[0_4px_16px_rgba(48,209,88,0.25)]"
        >
          <Check className="w-4 h-4 stroke-[3]" />
          <span>Save Mesocycle Program</span>
        </button>

        {/* Template picker sub-sheet */}
        {selectingDay !== null && (
          <div className="absolute inset-x-0 bottom-0 bg-[#151517] rounded-t-3xl border-t border-[#2A2A2D] p-5 max-h-[60vh] flex flex-col animate-slide-up shadow-2xl z-20">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-headline font-bold text-sm text-[#F5F5F5] uppercase tracking-wide">
                Assign to {DAY_LABELS_FULL[selectingDay]}
              </h4>
              <button
                onClick={() => setSelectingDay(null)}
                className="text-xs font-mono text-[#A1A1A6] hover:text-[#F5F5F5]"
              >
                Cancel
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 [scrollbar-width:none]">
              <button
                type="button"
                onClick={() => markRest(selectingDay)}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-[#1E1E20] border border-[#2A2A2D] text-[#A1A1A6] hover:text-[#F5F5F5] active:scale-[0.98] text-left"
              >
                <Bed className="w-4 h-4 text-[#4F9CF9]" />
                <span className="text-xs font-headline font-bold">
                  Rest & Deload Day
                </span>
              </button>

              {templates.map(t => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => assignTemplate(selectingDay, t.id)}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-[#1E1E20] border border-[#2A2A2D] hover:border-[#30D158]/40 active:scale-[0.98] transition-all text-left"
                >
                  <div className="w-1 h-6 bg-[#30D158] rounded-full" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-headline font-bold text-[#F5F5F5] truncate">
                      {t.name}
                    </p>
                    <p className="text-[10px] font-mono text-[#A1A1A6]">
                      {t.exercises.length} Exercises
                    </p>
                  </div>
                </button>
              ))}

              {templates.length === 0 && (
                <div className="text-center py-6 text-xs text-[#A1A1A6]">
                  No workout templates found. Create a template in Workout Planner first.
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
