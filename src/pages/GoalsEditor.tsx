// ─────────────────────────────────────────────────────────────
// MyFitAI — Athlete Target & Nutrition Goals Editor
// Athletic Personal Operating System UI/UX
// ─────────────────────────────────────────────────────────────

import { useState, useMemo } from 'react';
import { useFitnessContext } from '../context/FitnessContext';
import type { FitnessGoal } from '../context/FitnessContext';
import { usePreferences } from '../context/PreferencesContext';
import { useToast } from '../context/ToastContext';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Dumbbell,
  Flame,
  Activity,
  Scale,
  Sparkles,
  RotateCcw,
  Info,
  Footprints,
  Clock,
  Moon,
  Droplets,
  Check,
} from 'lucide-react';

const GOALS: {
  value: FitnessGoal;
  label: string;
  icon: typeof Dumbbell;
  color: string;
  desc: string;
}[] = [
  {
    value: 'Hypertrophy Phase',
    label: 'Muscle Hypertrophy',
    icon: Dumbbell,
    color: '#30D158',
    desc: 'Progressive overload for lean muscular tissue accretion',
  },
  {
    value: 'Fat Loss',
    label: 'Fat Loss',
    icon: Flame,
    color: '#FF8A00',
    desc: 'Targeted caloric deficit maintaining lean muscle',
  },
  {
    value: 'Endurance',
    label: 'Cardiovascular Endurance',
    icon: Activity,
    color: '#4F9CF9',
    desc: 'VO2 max conditioning, pacing, and mitochondrial density',
  },
  {
    value: 'Maintenance',
    label: 'Maintenance',
    icon: Scale,
    color: '#A78BFA',
    desc: 'Physiological homeostasis and neurological adaptation',
  },
];

const MACRO_PRESETS: Record<
  FitnessGoal,
  { proteinPerLb: number; carbPct: number; fatPct: number }
> = {
  'Hypertrophy Phase': { proteinPerLb: 1.0, carbPct: 0.55, fatPct: 0.45 },
  'Fat Loss': { proteinPerLb: 1.2, carbPct: 0.45, fatPct: 0.55 },
  'Endurance': { proteinPerLb: 0.8, carbPct: 0.65, fatPct: 0.35 },
  'Maintenance': { proteinPerLb: 0.9, carbPct: 0.55, fatPct: 0.45 },
};

function getSuggestedMacros(goal: FitnessGoal, weightLbs: number, calories: number) {
  const preset = MACRO_PRESETS[goal];
  const protein = Math.round(weightLbs * preset.proteinPerLb);
  const proteinCals = protein * 4;
  const remainingCals = Math.max(0, calories - proteinCals);
  const carbs = Math.round((remainingCals * preset.carbPct) / 4);
  const fat = Math.round((remainingCals * preset.fatPct) / 9);
  return { protein, carbs, fat };
}

function GoalInput({
  icon: Icon,
  iconColor,
  label,
  value,
  onChange,
  unit,
  step,
  min,
  max,
  suggested,
}: {
  icon: typeof Dumbbell;
  iconColor: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  unit: string;
  step?: string;
  min?: number;
  max?: number;
  suggested?: number;
}) {
  const numVal = Number(value);
  const isInvalid =
    value !== '' &&
    (isNaN(numVal) || (min !== undefined && numVal < min) || (max !== undefined && numVal > max));

  return (
    <div
      className={`bg-[#151517] rounded-2xl p-4 border transition-all ${
        isInvalid ? 'border-[#FF453A]/50' : 'border-[#2A2A2D]'
      }`}
    >
      <div className="flex items-center gap-3">
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border"
          style={{
            backgroundColor: `${iconColor}15`,
            borderColor: `${iconColor}33`,
            color: iconColor,
          }}
        >
          <Icon className="w-4 h-4" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[10px] uppercase font-mono tracking-wider text-[#A1A1A6] font-bold mb-0.5">
            {label}
          </p>
          <div className="flex items-center gap-2">
            <input
              type="number"
              step={step || '1'}
              min={min}
              max={max}
              value={value}
              onChange={e => onChange(e.target.value)}
              className="w-full bg-transparent outline-none font-headline font-black text-xl text-[#F5F5F5] font-mono tabular-nums [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            />
          </div>
        </div>
        <span className="text-[#6B6B70] font-mono font-bold text-xs uppercase shrink-0">
          {unit}
        </span>
      </div>

      {suggested !== undefined && (
        <button
          type="button"
          onClick={() => onChange(suggested.toString())}
          className="mt-2 ml-12 text-[10px] font-mono text-[#30D158] hover:underline transition-colors flex items-center gap-1"
        >
          <Sparkles className="w-3 h-3" />
          Suggested: {suggested} {unit.toLowerCase()}
        </button>
      )}

      {isInvalid && (
        <p className="mt-1.5 ml-12 text-[10px] font-mono text-[#FF453A]">
          {min !== undefined && numVal < min
            ? `Minimum: ${min}`
            : max !== undefined && numVal > max
            ? `Maximum: ${max}`
            : 'Enter a valid number'}
        </p>
      )}
    </div>
  );
}

export default function GoalsEditor() {
  const { profile, updateProfile } = useFitnessContext();
  const { weightUnit } = usePreferences();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [goal, setGoal] = useState<FitnessGoal>(profile.goal);
  const [targetWeight, setTargetWeight] = useState(
    weightUnit === 'kg'
      ? (profile.targetWeight / 2.20462).toFixed(1)
      : profile.targetWeight.toString()
  );
  const [calorieGoal, setCalorieGoal] = useState(profile.dailyCalorieGoal.toString());
  const [proteinGoal, setProteinGoal] = useState(profile.dailyProteinGoal.toString());
  const [carbsGoal, setCarbsGoal] = useState(profile.dailyCarbsGoal.toString());
  const [fatGoal, setFatGoal] = useState(profile.dailyFatGoal.toString());
  const [waterGoal, setWaterGoal] = useState(profile.dailyWaterGoal.toString());
  const [stepGoal, setStepGoal] = useState(profile.dailyStepGoal.toString());
  const [sleepGoal, setSleepGoal] = useState(profile.dailySleepGoal.toString());
  const [workoutDurationGoal, setWorkoutDurationGoal] = useState(
    profile.dailyWorkoutDurationGoal.toString()
  );

  const suggested = useMemo(() => {
    const wLbs =
      weightUnit === 'kg'
        ? Number(targetWeight) * 2.20462
        : Number(targetWeight) || profile.weight;
    const cals = Number(calorieGoal) || profile.dailyCalorieGoal;
    return getSuggestedMacros(goal, wLbs || profile.weight, cals);
  }, [goal, targetWeight, calorieGoal, weightUnit, profile.weight, profile.dailyCalorieGoal]);

  const macroBreakdown = useMemo(() => {
    const p = Number(proteinGoal) || 0;
    const c = Number(carbsGoal) || 0;
    const f = Number(fatGoal) || 0;
    const pCals = p * 4;
    const cCals = c * 4;
    const fCals = f * 9;
    const total = pCals + cCals + fCals;
    if (total === 0) return { pPct: 33, cPct: 34, fPct: 33, total: 0 };
    return {
      pPct: Math.round((pCals / total) * 100),
      cPct: Math.round((cCals / total) * 100),
      fPct: Math.round((fCals / total) * 100),
      total,
    };
  }, [proteinGoal, carbsGoal, fatGoal]);

  const handleResetMacros = () => {
    setProteinGoal(suggested.protein.toString());
    setCarbsGoal(suggested.carbs.toString());
    setFatGoal(suggested.fat.toString());
  };

  const isValid = useMemo(() => {
    const vals = [
      { v: Number(targetWeight), min: 30, max: 500 },
      { v: Number(calorieGoal), min: 800, max: 10000 },
      { v: Number(proteinGoal), min: 20, max: 500 },
      { v: Number(carbsGoal), min: 0, max: 1000 },
      { v: Number(fatGoal), min: 10, max: 400 },
      { v: Number(waterGoal), min: 0.5, max: 10 },
      { v: Number(stepGoal), min: 1000, max: 100000 },
      { v: Number(sleepGoal), min: 3, max: 12 },
      { v: Number(workoutDurationGoal), min: 10, max: 300 },
    ];
    return vals.every(({ v, min, max }) => !isNaN(v) && v >= min && v <= max);
  }, [
    targetWeight,
    calorieGoal,
    proteinGoal,
    carbsGoal,
    fatGoal,
    waterGoal,
    stepGoal,
    sleepGoal,
    workoutDurationGoal,
  ]);

  const handleSave = () => {
    if (!isValid) return;

    const tw = Number(targetWeight);
    updateProfile({
      goal,
      targetWeight: weightUnit === 'kg' ? Math.round(tw * 2.20462) : tw,
      dailyCalorieGoal: Number(calorieGoal),
      dailyProteinGoal: Number(proteinGoal),
      dailyCarbsGoal: Number(carbsGoal),
      dailyFatGoal: Number(fatGoal),
      dailyWaterGoal: Number(waterGoal),
      dailyStepGoal: Number(stepGoal),
      dailySleepGoal: Number(sleepGoal),
      dailyWorkoutDurationGoal: Number(workoutDurationGoal),
    });
    showToast('Athletic goals synchronized', 'success');
    navigate(-1);
  };

  return (
    <main className="max-w-xl mx-auto px-4 sm:px-6 pt-6 pb-28 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-[#2A2A2D] pb-5">
        <button
          onClick={() => navigate(-1)}
          className="w-10 h-10 rounded-xl bg-[#151517] border border-[#2A2A2D] flex items-center justify-center text-[#A1A1A6] hover:text-[#F5F5F5] transition-colors active:scale-95"
          aria-label="Back"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-[#30D158] block">
            BIOMETRICS & TARGETS
          </span>
          <h1 className="font-headline font-black text-2xl sm:text-3xl text-[#F5F5F5] uppercase tracking-tight">
            Athlete Goals
          </h1>
          <p className="text-xs text-[#A1A1A6]">
            Configure mesocycle phase, caloric pacing, and hydration targets.
          </p>
        </div>
      </div>

      {/* ═══ Section 1: Training Goal ═══ */}
      <section className="space-y-3">
        <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-[#A1A1A6]">
          Current Training Phase
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {GOALS.map(g => {
            const Icon = g.icon;
            const isSelected = goal === g.value;
            return (
              <button
                key={g.value}
                type="button"
                onClick={() => setGoal(g.value)}
                className={`p-4 rounded-2xl border text-left transition-all active:scale-[0.98] space-y-2 ${
                  isSelected
                    ? 'bg-[#151517] border-[#30D158] shadow-[0_0_20px_rgba(48,209,88,0.12)]'
                    : 'bg-[#151517] border-[#2A2A2D] hover:border-[#3A3A3D]'
                }`}
              >
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center border"
                  style={{
                    backgroundColor: `${g.color}15`,
                    borderColor: `${g.color}30`,
                    color: g.color,
                  }}
                >
                  <Icon className="w-4 h-4" />
                </div>
                <div>
                  <p className="font-headline font-bold text-sm text-[#F5F5F5]">{g.label}</p>
                  <p className="text-[11px] text-[#A1A1A6] mt-0.5 leading-snug">{g.desc}</p>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* ═══ Section 2: Target Weight ═══ */}
      <section className="space-y-3">
        <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-[#A1A1A6]">
          Target Athlete Weight
        </h2>
        <div className="bg-[#151517] rounded-2xl p-5 border border-[#2A2A2D] space-y-2">
          <div className="flex items-center gap-3">
            <Scale className="w-5 h-5 text-[#30D158]" />
            <input
              type="number"
              step="0.1"
              value={targetWeight}
              onChange={e => setTargetWeight(e.target.value)}
              className="flex-1 bg-transparent outline-none font-headline font-black text-3xl text-[#F5F5F5] font-mono tabular-nums [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            />
            <span className="text-[#30D158] font-mono font-bold text-sm uppercase">
              {weightUnit}
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-xs font-mono text-[#6B6B70] pt-1 border-t border-[#2A2A2D]">
            <Info className="w-3.5 h-3.5" />
            <span>
              Current baseline: {weightUnit === 'kg' ? (profile.weight / 2.20462).toFixed(1) : profile.weight}{' '}
              {weightUnit}
            </span>
          </div>
        </div>
      </section>

      {/* ═══ Section 3: Daily Nutrition Goals ═══ */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-[#A1A1A6]">
            Daily Nutritional Targets
          </h2>
          <button
            type="button"
            onClick={handleResetMacros}
            className="text-xs font-mono font-bold text-[#30D158] flex items-center gap-1 hover:underline"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Recalculate Macros
          </button>
        </div>

        <div className="space-y-3">
          <GoalInput
            icon={Flame}
            iconColor="#FF8A00"
            label="Total Daily Calories"
            value={calorieGoal}
            onChange={setCalorieGoal}
            unit="KCAL"
            step="50"
            min={800}
            max={10000}
          />
          <GoalInput
            icon={Dumbbell}
            iconColor="#30D158"
            label="Target Protein"
            value={proteinGoal}
            onChange={setProteinGoal}
            unit="G"
            min={20}
            max={500}
            suggested={suggested.protein}
          />
          <GoalInput
            icon={Activity}
            iconColor="#F5C542"
            label="Target Carbohydrates"
            value={carbsGoal}
            onChange={setCarbsGoal}
            unit="G"
            min={0}
            max={1000}
            suggested={suggested.carbs}
          />
          <GoalInput
            icon={Scale}
            iconColor="#A78BFA"
            label="Target Dietary Fat"
            value={fatGoal}
            onChange={setFatGoal}
            unit="G"
            min={10}
            max={400}
            suggested={suggested.fat}
          />

          {/* Macro Breakdown Bar */}
          <div className="bg-[#151517] rounded-2xl p-4 border border-[#2A2A2D] space-y-2">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-[#A1A1A6] font-bold uppercase">Macro Distribution</span>
              <span className="text-[#F5F5F5]">{macroBreakdown.total} kcal total</span>
            </div>
            <div className="flex h-2.5 rounded-full overflow-hidden gap-0.5 bg-[#1E1E20]">
              <div
                className="transition-all duration-300"
                style={{ width: `${macroBreakdown.pPct}%`, backgroundColor: '#30D158' }}
              />
              <div
                className="transition-all duration-300"
                style={{ width: `${macroBreakdown.cPct}%`, backgroundColor: '#F5C542' }}
              />
              <div
                className="transition-all duration-300"
                style={{ width: `${macroBreakdown.fPct}%`, backgroundColor: '#A78BFA' }}
              />
            </div>
            <div className="flex justify-between text-[11px] font-mono font-bold pt-1">
              <span className="text-[#30D158]">Protein {macroBreakdown.pPct}%</span>
              <span className="text-[#F5C542]">Carbs {macroBreakdown.cPct}%</span>
              <span className="text-[#A78BFA]">Fat {macroBreakdown.fPct}%</span>
            </div>
          </div>

          <GoalInput
            icon={Droplets}
            iconColor="#4F9CF9"
            label="Daily Hydration Target"
            value={waterGoal}
            onChange={setWaterGoal}
            unit="LITERS"
            step="0.1"
            min={0.5}
            max={10}
          />
        </div>
      </section>

      {/* ═══ Section 4: Activity Goals ═══ */}
      <section className="space-y-3">
        <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-[#A1A1A6]">
          Daily Movement & Recovery
        </h2>
        <div className="space-y-3">
          <GoalInput
            icon={Footprints}
            iconColor="#4F9CF9"
            label="Step Goal"
            value={stepGoal}
            onChange={setStepGoal}
            unit="STEPS"
            step="500"
            min={1000}
            max={100000}
          />
          <GoalInput
            icon={Clock}
            iconColor="#FF8A00"
            label="Daily Workout Duration"
            value={workoutDurationGoal}
            onChange={setWorkoutDurationGoal}
            unit="MIN"
            step="5"
            min={10}
            max={300}
          />
          <GoalInput
            icon={Moon}
            iconColor="#A78BFA"
            label="Sleep Recovery Target"
            value={sleepGoal}
            onChange={setSleepGoal}
            unit="HOURS"
            step="0.5"
            min={3}
            max={12}
          />
        </div>
      </section>

      {/* Save Button */}
      <button
        onClick={handleSave}
        disabled={!isValid}
        className={`w-full py-4 rounded-xl font-headline font-black text-xs uppercase tracking-wider active:scale-[0.98] transition-all flex items-center justify-center gap-2 ${
          isValid
            ? 'bg-[#30D158] hover:bg-[#30D158]/90 text-black shadow-[0_4px_16px_rgba(48,209,88,0.25)]'
            : 'bg-[#1E1E20] text-[#6B6B70] border border-[#2A2A2D] cursor-not-allowed'
        }`}
      >
        <Check className="w-4 h-4 stroke-[3]" />
        <span>{isValid ? 'Save Athlete Targets' : 'Resolve input errors to save'}</span>
      </button>
    </main>
  );
}
