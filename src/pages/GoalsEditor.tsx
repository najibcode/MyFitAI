import { useState, useMemo } from 'react';
import { useFitnessContext } from '../context/FitnessContext';
import type { FitnessGoal } from '../context/FitnessContext';
import { usePreferences } from '../context/PreferencesContext';
import { useToast } from '../context/ToastContext';
import { useNavigate } from 'react-router-dom';

const GOALS: { value: FitnessGoal; label: string; icon: string; color: string; desc: string }[] = [
  { value: 'Hypertrophy Phase', label: 'Muscle Gain', icon: 'fitness_center', color: '#FF7A00', desc: 'Build lean muscle mass' },
  { value: 'Fat Loss', label: 'Fat Loss', icon: 'local_fire_department', color: '#FF4D4D', desc: 'Burn fat & cut weight' },
  { value: 'Endurance', label: 'Endurance', icon: 'directions_run', color: '#6FFB85', desc: 'Boost stamina & cardio' },
  { value: 'Maintenance', label: 'Maintenance', icon: 'balance', color: '#60A5FA', desc: 'Maintain current physique' },
];

// Macro split presets: { proteinPerLb, carbPct, fatPct }
// proteinPerLb = grams of protein per lb of bodyweight
// carbPct / fatPct = percentage of remaining calories after protein
const MACRO_PRESETS: Record<FitnessGoal, { proteinPerLb: number; carbPct: number; fatPct: number }> = {
  'Hypertrophy Phase': { proteinPerLb: 1.0, carbPct: 0.55, fatPct: 0.45 },
  'Fat Loss':          { proteinPerLb: 1.2, carbPct: 0.45, fatPct: 0.55 },
  'Endurance':         { proteinPerLb: 0.8, carbPct: 0.65, fatPct: 0.35 },
  'Maintenance':       { proteinPerLb: 0.9, carbPct: 0.55, fatPct: 0.45 },
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

// Input row component for consistent styling
function GoalInput({ 
  icon, iconColor, label, value, onChange, unit, step, min, max, suggested 
}: { 
  icon: string; iconColor: string; label: string; value: string; 
  onChange: (v: string) => void; unit: string; step?: string; min?: number; max?: number;
  suggested?: number;
}) {
  const numVal = Number(value);
  const isInvalid = value !== '' && (isNaN(numVal) || (min !== undefined && numVal < min) || (max !== undefined && numVal > max));

  return (
    <div className={`bg-[var(--color-surface-container)] rounded-2xl p-4 border transition-all ${
      isInvalid ? 'border-[#FF4D4D]/50 shadow-[0_0_12px_rgba(255,77,77,0.08)]' : 'border-white/5'
    }`}>
      <div className="flex items-center gap-3">
        <span 
          className="material-symbols-outlined text-xl flex-shrink-0" 
          style={{ color: iconColor, fontVariationSettings: "'FILL' 1" }}
        >{icon}</span>
        <div className="flex-1 min-w-0">
          <p className="text-[10px] uppercase tracking-widest text-on-surface-variant font-bold mb-1">{label}</p>
          <div className="flex items-center gap-2">
            <input
              type="number"
              step={step || '1'}
              min={min}
              max={max}
              value={value}
              onChange={e => onChange(e.target.value)}
              className="w-full bg-transparent outline-none font-headline font-bold text-lg text-on-surface [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            />
          </div>
        </div>
        <span className="text-on-surface-variant font-bold text-[11px] uppercase flex-shrink-0">{unit}</span>
      </div>
      {suggested !== undefined && (
        <button 
          onClick={() => onChange(suggested.toString())}
          className="mt-2 ml-9 text-[10px] text-primary/70 hover:text-primary transition-colors flex items-center gap-1"
        >
          <span className="material-symbols-outlined text-[12px]">auto_fix_high</span>
          Suggested: {suggested} {unit.toLowerCase()}
        </button>
      )}
      {isInvalid && (
        <p className="mt-1.5 ml-9 text-[10px] text-[#FF4D4D] font-medium">
          {min !== undefined && numVal < min ? `Minimum: ${min}` : max !== undefined && numVal > max ? `Maximum: ${max}` : 'Enter a valid number'}
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

  // ── Local form state ──
  const [goal, setGoal] = useState<FitnessGoal>(profile.goal);
  const [targetWeight, setTargetWeight] = useState(
    weightUnit === 'kg' ? (profile.targetWeight / 2.20462).toFixed(1) : profile.targetWeight.toString()
  );
  const [calorieGoal, setCalorieGoal] = useState(profile.dailyCalorieGoal.toString());
  const [proteinGoal, setProteinGoal] = useState(profile.dailyProteinGoal.toString());
  const [carbsGoal, setCarbsGoal] = useState(profile.dailyCarbsGoal.toString());
  const [fatGoal, setFatGoal] = useState(profile.dailyFatGoal.toString());
  const [waterGoal, setWaterGoal] = useState(profile.dailyWaterGoal.toString());
  const [stepGoal, setStepGoal] = useState(profile.dailyStepGoal.toString());
  const [sleepGoal, setSleepGoal] = useState(profile.dailySleepGoal.toString());
  const [workoutDurationGoal, setWorkoutDurationGoal] = useState(profile.dailyWorkoutDurationGoal.toString());

  // ── Suggested macros based on current goal + weight ──
  const suggested = useMemo(() => {
    const wLbs = weightUnit === 'kg' ? Number(targetWeight) * 2.20462 : Number(targetWeight) || profile.weight;
    const cals = Number(calorieGoal) || profile.dailyCalorieGoal;
    return getSuggestedMacros(goal, wLbs || profile.weight, cals);
  }, [goal, targetWeight, calorieGoal, weightUnit, profile.weight, profile.dailyCalorieGoal]);

  // ── Macro breakdown bar ──
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

  // ── Reset to recommended ──
  const handleResetMacros = () => {
    setProteinGoal(suggested.protein.toString());
    setCarbsGoal(suggested.carbs.toString());
    setFatGoal(suggested.fat.toString());
  };

  // ── Validation ──
  const isValid = useMemo(() => {
    const vals = [
      { v: Number(targetWeight), min: 50, max: 500 },
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
  }, [targetWeight, calorieGoal, proteinGoal, carbsGoal, fatGoal, waterGoal, stepGoal, sleepGoal, workoutDurationGoal]);

  // ── Save ──
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
    showToast('Goals updated!', 'success');
    navigate(-1);
  };

  return (
    <main className="max-w-lg mx-auto px-5 pt-6 pb-32 space-y-8">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="w-10 h-10 rounded-full bg-[var(--color-surface-container)] flex items-center justify-center text-on-surface-variant hover:text-on-surface transition-colors active:scale-95">
          <span className="material-symbols-outlined">arrow_back</span>
        </button>
        <div className="flex-1">
          <h1 className="font-headline text-2xl font-bold tracking-tight">My Goals</h1>
          <p className="text-on-surface-variant text-xs mt-0.5">Customize every target for your journey</p>
        </div>
      </div>

      {/* ═══ Section 1: Training Goal ═══ */}
      <section>
        <h2 className="text-[10px] uppercase tracking-widest text-on-surface-variant font-bold mb-3">Training Goal</h2>
        <div className="grid grid-cols-2 gap-3">
          {GOALS.map(g => (
            <button
              key={g.value}
              onClick={() => setGoal(g.value)}
              className={`p-5 rounded-2xl border text-left transition-all active:scale-[0.97] ${
                goal === g.value
                  ? 'bg-white/5 border-primary shadow-[0_0_20px_rgba(255,122,0,0.1)]'
                  : 'bg-[var(--color-surface-container)] border-white/5 hover:border-white/10'
              }`}
            >
              <span className="material-symbols-outlined text-2xl mb-2 block" style={{ color: g.color, fontVariationSettings: "'FILL' 1" }}>{g.icon}</span>
              <p className="font-headline font-bold text-sm">{g.label}</p>
              <p className="text-[10px] text-on-surface-variant mt-0.5">{g.desc}</p>
            </button>
          ))}
        </div>
      </section>

      {/* ═══ Section 2: Target Weight ═══ */}
      <section>
        <h2 className="text-[10px] uppercase tracking-widest text-on-surface-variant font-bold mb-3">Target Weight</h2>
        <div className="bg-[var(--color-surface-container)] rounded-2xl p-5 border border-white/5">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-secondary text-xl">monitor_weight</span>
            <input
              type="number"
              step="0.1"
              value={targetWeight}
              onChange={e => setTargetWeight(e.target.value)}
              className="flex-1 bg-transparent outline-none font-headline font-bold text-2xl text-on-surface [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            />
            <span className="text-on-surface-variant font-bold text-sm uppercase">{weightUnit}</span>
          </div>
          <div className="mt-2 ml-9 flex items-center gap-2 text-[10px] text-on-surface-variant">
            <span className="material-symbols-outlined text-[12px]">info</span>
            Current: {weightUnit === 'kg' ? (profile.weight / 2.20462).toFixed(1) : profile.weight} {weightUnit}
          </div>
        </div>
      </section>

      {/* ═══ Section 3: Daily Nutrition Goals ═══ */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-[10px] uppercase tracking-widest text-on-surface-variant font-bold">Daily Nutrition</h2>
          <button 
            onClick={handleResetMacros} 
            className="text-[10px] text-primary font-semibold flex items-center gap-1 hover:opacity-80 transition-opacity active:scale-95"
          >
            <span className="material-symbols-outlined text-[14px]">restart_alt</span>
            Reset to Recommended
          </button>
        </div>

        <div className="space-y-3">
          <GoalInput
            icon="local_fire_department" iconColor="#FF4D4D"
            label="Calorie Goal" value={calorieGoal} onChange={setCalorieGoal}
            unit="KCAL" step="50" min={800} max={10000}
          />
          <GoalInput
            icon="egg_alt" iconColor="#FF7A00"
            label="Protein Goal" value={proteinGoal} onChange={setProteinGoal}
            unit="G" min={20} max={500}
            suggested={suggested.protein}
          />
          <GoalInput
            icon="grain" iconColor="#FBBF24"
            label="Carbs Goal" value={carbsGoal} onChange={setCarbsGoal}
            unit="G" min={0} max={1000}
            suggested={suggested.carbs}
          />
          <GoalInput
            icon="water_drop" iconColor="#A78BFA"
            label="Fat Goal" value={fatGoal} onChange={setFatGoal}
            unit="G" min={10} max={400}
            suggested={suggested.fat}
          />

          {/* Macro Breakdown Bar */}
          <div className="bg-[var(--color-surface-container)] rounded-2xl p-4 border border-white/5">
            <div className="flex items-center justify-between mb-2.5">
              <p className="text-[10px] uppercase tracking-widest text-on-surface-variant font-bold">Macro Split</p>
              <p className="text-[10px] text-on-surface-variant font-medium">
                {macroBreakdown.total} kcal from macros
              </p>
            </div>
            <div className="flex h-3 rounded-full overflow-hidden gap-0.5">
              <div 
                className="rounded-l-full transition-all duration-500 ease-out" 
                style={{ width: `${macroBreakdown.pPct}%`, backgroundColor: '#FF7A00' }} 
              />
              <div 
                className="transition-all duration-500 ease-out" 
                style={{ width: `${macroBreakdown.cPct}%`, backgroundColor: '#FBBF24' }} 
              />
              <div 
                className="rounded-r-full transition-all duration-500 ease-out" 
                style={{ width: `${macroBreakdown.fPct}%`, backgroundColor: '#A78BFA' }} 
              />
            </div>
            <div className="flex justify-between mt-2.5 text-[10px] font-semibold">
              <span style={{ color: '#FF7A00' }}>Protein {macroBreakdown.pPct}%</span>
              <span style={{ color: '#FBBF24' }}>Carbs {macroBreakdown.cPct}%</span>
              <span style={{ color: '#A78BFA' }}>Fat {macroBreakdown.fPct}%</span>
            </div>
          </div>

          <GoalInput
            icon="water_drop" iconColor="#60A5FA"
            label="Water Goal" value={waterGoal} onChange={setWaterGoal}
            unit="LITERS" step="0.1" min={0.5} max={10}
          />
        </div>
      </section>

      {/* ═══ Section 4: Activity Goals ═══ */}
      <section>
        <h2 className="text-[10px] uppercase tracking-widest text-on-surface-variant font-bold mb-3">Activity & Recovery</h2>
        <div className="space-y-3">
          <GoalInput
            icon="steps" iconColor="#6FFB85"
            label="Step Goal" value={stepGoal} onChange={setStepGoal}
            unit="STEPS" step="500" min={1000} max={100000}
          />
          <GoalInput
            icon="timer" iconColor="#FF7A00"
            label="Workout Duration" value={workoutDurationGoal} onChange={setWorkoutDurationGoal}
            unit="MIN" step="5" min={10} max={300}
          />
          <GoalInput
            icon="bedtime" iconColor="#C084FC"
            label="Sleep Goal" value={sleepGoal} onChange={setSleepGoal}
            unit="HOURS" step="0.5" min={3} max={12}
          />
        </div>
      </section>

      {/* Save Button */}
      <button 
        onClick={handleSave} 
        disabled={!isValid}
        className={`w-full py-4 rounded-2xl font-bold text-sm active:scale-[0.97] transition-all ${
          isValid 
            ? 'bg-primary text-black shadow-[0_4px_20px_rgba(255,122,0,0.2)]' 
            : 'bg-white/5 text-on-surface-variant cursor-not-allowed'
        }`}
      >
        {isValid ? 'Save Goals' : 'Fix errors above to save'}
      </button>
    </main>
  );
}
