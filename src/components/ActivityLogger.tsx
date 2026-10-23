// ─────────────────────────────────────────────────────────────
// MyFitAI — Quick Activity Telemetry Logger
// Athletic Personal Operating System UI/UX
// ─────────────────────────────────────────────────────────────

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useFitnessContext } from '../context/FitnessContext';
import { X, Dumbbell, Footprints, Droplets, Moon, Check, Play } from 'lucide-react';

interface ActivityLoggerProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ActivityLogger({ isOpen, onClose }: ActivityLoggerProps) {
  const navigate = useNavigate();
  const { logActivity } = useFitnessContext();
  const [type, setType] = useState('Workout');
  const [value, setValue] = useState('');
  const [calories, setCalories] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!value) return;

    logActivity({
      type,
      value: Number(value),
      caloriesBurned: type === 'Workout' || type === 'Steps' ? Number(calories) : undefined,
    });

    setValue('');
    setCalories('');
    onClose();
  };

  const types = [
    { id: 'Workout', label: 'Workout', icon: Dumbbell, color: '#30D158' },
    { id: 'Steps', label: 'Steps', icon: Footprints, color: '#4F9CF9' },
    { id: 'Water', label: 'Water', icon: Droplets, color: '#4F9CF9' },
    { id: 'Sleep', label: 'Sleep', icon: Moon, color: '#A78BFA' },
  ];

  return (
    <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-[#151517] w-full max-w-md rounded-3xl p-6 shadow-2xl relative border border-[#2A2A2D] animate-in slide-in-from-bottom-6 sm:slide-in-from-bottom-0 duration-200 space-y-5">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-9 h-9 flex items-center justify-center rounded-xl bg-[#1E1E20] border border-[#2A2A2D] text-[#A1A1A6] hover:text-[#F5F5F5] transition-colors"
          aria-label="Close"
        >
          <X className="w-4 h-4" />
        </button>

        <div>
          <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-[#30D158] block mb-1">
            RAPID LOG
          </span>
          <h2 className="font-headline font-black text-2xl text-[#F5F5F5] uppercase tracking-tight">
            Log Activity
          </h2>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Type Selector */}
          <div className="grid grid-cols-4 gap-2">
            {types.map(t => {
              const Icon = t.icon;
              const isSelected = type === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setType(t.id)}
                  className={`py-3 px-2 rounded-xl flex flex-col items-center justify-center gap-1.5 transition-all border active:scale-95 ${
                    isSelected
                      ? 'bg-[#30D158] text-black border-[#30D158] shadow-sm'
                      : 'bg-[#1E1E20] text-[#A1A1A6] border-[#2A2A2D] hover:text-[#F5F5F5]'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span className="font-headline font-bold text-[10px] uppercase tracking-wider">
                    {t.label}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Quick Start Live Session Callout */}
          {type === 'Workout' && (
            <div className="p-3.5 rounded-2xl bg-[#FF8A00]/10 border border-[#FF8A00]/30 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#FF8A00] block">
                  TRAIN LIVE NOW?
                </span>
                <span className="text-xs text-[#F5F5F5] font-semibold block truncate">
                  Start with sets & rest timer tracking
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  navigate('/workout?quick=true');
                }}
                className="py-2 px-3 rounded-xl bg-[#FF8A00] hover:brightness-110 active:scale-95 text-black font-headline font-bold text-xs uppercase tracking-wider flex items-center gap-1.5 shrink-0 transition-all shadow-sm shadow-[#FF8A00]/25"
              >
                <Play className="w-3.5 h-3.5 fill-black stroke-none" />
                <span>Quick Start</span>
              </button>
            </div>
          )}

          {/* Value Input */}
          <div>
            <label className="block text-xs font-mono font-bold uppercase tracking-wider text-[#A1A1A6] mb-1.5 px-1">
              {type === 'Workout' && 'Duration (Minutes)'}
              {type === 'Steps' && 'Total Steps'}
              {type === 'Water' && 'Hydration Volume (Liters)'}
              {type === 'Sleep' && 'Sleep Duration (Hours)'}
            </label>
            <input
              type="number"
              step="any"
              autoFocus
              className="w-full bg-[#1E1E20] outline-none rounded-xl px-4 py-3 font-mono text-lg font-bold text-[#F5F5F5] border border-[#2A2A2D] focus:border-[#30D158] transition-colors tabular-nums"
              placeholder="0"
              value={value}
              onChange={e => setValue(e.target.value)}
              required
            />
          </div>

          {/* Optional Calories Input */}
          {(type === 'Workout' || type === 'Steps') && (
            <div>
              <label className="block text-xs font-mono font-bold uppercase tracking-wider text-[#A1A1A6] mb-1.5 px-1">
                Active Energy Burned (Optional kcal)
              </label>
              <input
                type="number"
                className="w-full bg-[#1E1E20] outline-none rounded-xl px-4 py-3 font-mono text-lg font-bold text-[#F5F5F5] border border-[#2A2A2D] focus:border-[#FF8A00] transition-colors tabular-nums"
                placeholder="e.g. 350"
                value={calories}
                onChange={e => setCalories(e.target.value)}
              />
            </div>
          )}

          <button
            type="submit"
            className="w-full bg-[#FF8A00] hover:bg-[#FF8A00]/90 text-black font-headline font-black text-xs uppercase tracking-wider py-4 rounded-xl active:scale-[0.98] transition-all flex items-center justify-center gap-1.5 shadow-[0_4px_16px_rgba(255,138,0,0.25)]"
          >
            <Check className="w-4 h-4 stroke-[3]" />
            <span>Save Entry</span>
          </button>
        </form>
      </div>
    </div>
  );
}
