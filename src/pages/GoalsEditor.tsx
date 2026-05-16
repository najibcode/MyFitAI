import { useState } from 'react';
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

export default function GoalsEditor() {
  const { profile, updateProfile } = useFitnessContext();
  const { weightUnit } = usePreferences();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [goal, setGoal] = useState<FitnessGoal>(profile.goal);
  const [targetWeight, setTargetWeight] = useState(
    weightUnit === 'kg' ? (profile.targetWeight / 2.20462).toFixed(1) : profile.targetWeight.toString()
  );
  const [calorieGoal, setCalorieGoal] = useState(profile.dailyCalorieGoal.toString());
  const [waterGoal, setWaterGoal] = useState(profile.dailyWaterGoal.toString());
  const [stepGoal, setStepGoal] = useState(profile.dailyStepGoal.toString());

  const handleSave = () => {
    const tw = Number(targetWeight);
    const cal = Number(calorieGoal);
    const water = Number(waterGoal);
    const steps = Number(stepGoal);
    if (!tw || !cal || !water || !steps) return;

    updateProfile({
      goal,
      targetWeight: weightUnit === 'kg' ? Math.round(tw * 2.20462) : tw,
      dailyCalorieGoal: cal,
      dailyWaterGoal: water,
      dailyStepGoal: steps,
    });
    showToast('Goals updated!', 'success');
    navigate(-1);
  };

  return (
    <main className="max-w-lg mx-auto px-5 pt-6 pb-32 space-y-8">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="w-10 h-10 rounded-full bg-[var(--color-surface-container)] flex items-center justify-center text-on-surface-variant hover:text-white transition-colors">
          <span className="material-symbols-outlined">arrow_back</span>
        </button>
        <h1 className="font-headline text-2xl font-bold tracking-tight">My Goals</h1>
      </div>

      {/* Fitness Goal Selector */}
      <section>
        <h2 className="text-[10px] uppercase tracking-widest text-on-surface-variant font-bold mb-3">Training Goal</h2>
        <div className="grid grid-cols-2 gap-3">
          {GOALS.map(g => (
            <button
              key={g.value}
              onClick={() => setGoal(g.value)}
              className={`p-5 rounded-2xl border text-left transition-all ${
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

      {/* Target Weight */}
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
              className="flex-1 bg-transparent outline-none font-headline font-bold text-2xl text-white"
            />
            <span className="text-on-surface-variant font-bold text-sm uppercase">{weightUnit}</span>
          </div>
        </div>
      </section>

      {/* Daily Targets */}
      <section>
        <h2 className="text-[10px] uppercase tracking-widest text-on-surface-variant font-bold mb-3">Daily Targets</h2>
        <div className="space-y-3">
          {/* Calories */}
          <div className="bg-[var(--color-surface-container)] rounded-2xl p-5 border border-white/5 flex items-center gap-4">
            <span className="material-symbols-outlined text-[#FF4D4D] text-xl" style={{ fontVariationSettings: "'FILL' 1" }}>local_fire_department</span>
            <div className="flex-1">
              <p className="text-[10px] uppercase tracking-widest text-on-surface-variant font-bold mb-1">Calorie Goal</p>
              <input
                type="number"
                value={calorieGoal}
                onChange={e => setCalorieGoal(e.target.value)}
                className="w-full bg-transparent outline-none font-headline font-bold text-xl text-white"
              />
            </div>
            <span className="text-on-surface-variant font-bold text-xs">KCAL</span>
          </div>

          {/* Water */}
          <div className="bg-[var(--color-surface-container)] rounded-2xl p-5 border border-white/5 flex items-center gap-4">
            <span className="material-symbols-outlined text-[#60A5FA] text-xl" style={{ fontVariationSettings: "'FILL' 1" }}>water_drop</span>
            <div className="flex-1">
              <p className="text-[10px] uppercase tracking-widest text-on-surface-variant font-bold mb-1">Water Goal</p>
              <input
                type="number"
                step="0.1"
                value={waterGoal}
                onChange={e => setWaterGoal(e.target.value)}
                className="w-full bg-transparent outline-none font-headline font-bold text-xl text-white"
              />
            </div>
            <span className="text-on-surface-variant font-bold text-xs">LITERS</span>
          </div>

          {/* Steps */}
          <div className="bg-[var(--color-surface-container)] rounded-2xl p-5 border border-white/5 flex items-center gap-4">
            <span className="material-symbols-outlined text-[#6FFB85] text-xl" style={{ fontVariationSettings: "'FILL' 1" }}>steps</span>
            <div className="flex-1">
              <p className="text-[10px] uppercase tracking-widest text-on-surface-variant font-bold mb-1">Step Goal</p>
              <input
                type="number"
                step="500"
                value={stepGoal}
                onChange={e => setStepGoal(e.target.value)}
                className="w-full bg-transparent outline-none font-headline font-bold text-xl text-white"
              />
            </div>
            <span className="text-on-surface-variant font-bold text-xs">STEPS</span>
          </div>
        </div>
      </section>

      {/* Save Button */}
      <button onClick={handleSave} className="w-full bg-primary text-black py-4 rounded-2xl font-bold text-sm active:scale-95 transition-transform">
        Save Goals
      </button>
    </main>
  );
}
