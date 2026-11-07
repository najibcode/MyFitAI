// ─────────────────────────────────────────────────────────────
// MyFitAI — Athlete Onboarding & Profile Configuration Modal
// Athletic Personal Operating System UI/UX
// ─────────────────────────────────────────────────────────────

import { useState } from 'react';
import { useFitnessContext } from '../context/FitnessContext';
import { usePreferences } from '../context/PreferencesContext';
import type { FitnessGoal } from '../context/FitnessContext';
import {
  X,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Dumbbell,
  Flame,
  Activity,
  Scale,
  RefreshCw,
} from 'lucide-react';

const STEPS = ['basics', 'body', 'goals', 'lifestyle', 'complete'] as const;
type Step = typeof STEPS[number];

export default function OnboardingForm({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { profile, updateProfile } = useFitnessContext();
  const { weightUnit, heightUnit, updatePreferences } = usePreferences();
  const [step, setStep] = useState<Step>('basics');

  const initialWeight =
    weightUnit === 'kg' ? Math.round((profile.weight / 2.20462) * 10) / 10 : profile.weight;
  const initialTargetWeight =
    weightUnit === 'kg'
      ? Math.round((profile.targetWeight / 2.20462) * 10) / 10
      : profile.targetWeight;
  const initialHeight =
    heightUnit === 'cm' ? Math.round(profile.height * 2.54) : profile.height;

  const [formData, setFormData] = useState<{
    name: string;
    age: number | '';
    gender: string;
    height: number | '';
    weight: number | '';
    targetWeight: number | '';
    goal: string;
    fitnessLevel: string;
    activityLevel: string;
    workoutPreference: string;
    workoutDays: number;
    dietPreference: string;
    sleepQuality: string;
    injuries: string;
    motivationLevel: string;
  }>({
    name: profile.name,
    age: profile.age,
    gender: profile.gender || 'Male',
    height: initialHeight,
    weight: initialWeight,
    targetWeight: initialTargetWeight,
    goal: profile.goal,
    fitnessLevel: 'Intermediate',
    activityLevel: 'Moderate',
    workoutPreference: 'Gym',
    workoutDays: 5,
    dietPreference: 'Standard',
    sleepQuality: 'Good',
    injuries: 'None',
    motivationLevel: 'High',
  });

  if (!isOpen) return null;

  const handleChange = (name: string, value: string | number) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = () => {
    const finalWeight =
      weightUnit === 'kg' && typeof formData.weight === 'number'
        ? formData.weight * 2.20462
        : Number(formData.weight);
    const finalTargetWeight =
      weightUnit === 'kg' && typeof formData.targetWeight === 'number'
        ? formData.targetWeight * 2.20462
        : Number(formData.targetWeight);
    const finalHeight =
      heightUnit === 'cm' && typeof formData.height === 'number'
        ? formData.height / 2.54
        : Number(formData.height);

    updateProfile({
      name: formData.name,
      age: Number(formData.age) || profile.age,
      gender: formData.gender,
      height: finalHeight,
      weight: finalWeight,
      targetWeight: finalTargetWeight,
      goal: formData.goal as FitnessGoal,
    });
    setStep('complete');
    setTimeout(() => {
      onClose();
      setStep('basics');
    }, 2000);
  };

  const currentIdx = STEPS.indexOf(step);
  const progressPct = step === 'complete' ? 100 : (currentIdx / (STEPS.length - 1)) * 100;

  const inputClass =
    'w-full bg-[#1E1E20] outline-none rounded-xl px-4 py-3 border border-[#2A2A2D] focus:border-[#30D158] transition-colors text-sm font-semibold text-[#F5F5F5] placeholder:text-[#6B6B70]';
  const labelClass =
    'block text-[10px] font-mono font-bold uppercase tracking-wider text-[#A1A1A6] mb-1.5';
  const chipClass = (selected: boolean) =>
    `px-3.5 py-2.5 rounded-xl text-xs font-mono font-bold uppercase tracking-wider transition-all cursor-pointer border active:scale-95 ${
      selected
        ? 'bg-[#30D158] text-black border-[#30D158] shadow-sm'
        : 'bg-[#1E1E20] text-[#A1A1A6] border-[#2A2A2D] hover:text-[#F5F5F5] hover:border-[#3A3A3D]'
    }`;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/75 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="bg-[#151517] w-full max-w-lg rounded-3xl shadow-2xl relative border border-[#2A2A2D] overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Progress Bar */}
        <div className="h-1 bg-[#1E1E20] w-full">
          <div
            className="h-full bg-[#30D158] transition-all duration-300"
            style={{ width: `${progressPct}%` }}
          />
        </div>

        <div className="p-6 sm:p-7">
          {/* Header */}
          <div className="flex items-center justify-between mb-5">
            <div>
              {step !== 'complete' && (
                <p className="text-[10px] font-mono font-bold uppercase tracking-widest text-[#30D158] mb-0.5">
                  Phase {currentIdx + 1} of {STEPS.length - 1}
                </p>
              )}
              <h2 className="font-headline font-black text-2xl text-[#F5F5F5] uppercase tracking-tight">
                {step === 'basics' && 'Athlete Identity'}
                {step === 'body' && 'Biometric Measures'}
                {step === 'goals' && 'Training Targets'}
                {step === 'lifestyle' && 'Lifestyle & Routine'}
                {step === 'complete' && 'Configuration Initialized'}
              </h2>
            </div>
            <button
              onClick={() => {
                onClose();
                setStep('basics');
              }}
              className="w-9 h-9 rounded-xl bg-[#1E1E20] border border-[#2A2A2D] flex items-center justify-center text-[#A1A1A6] hover:text-[#F5F5F5] transition-colors"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Step 1: Basics */}
          {step === 'basics' && (
            <div className="space-y-4">
              <div>
                <label className={labelClass}>Athlete Full Name</label>
                <input
                  value={formData.name}
                  onChange={e => handleChange('name', e.target.value)}
                  className={inputClass}
                  placeholder="e.g. Mohamed Najib"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>Chronological Age</label>
                  <input
                    type="number"
                    value={formData.age}
                    onChange={e =>
                      handleChange('age', e.target.value === '' ? '' : Number(e.target.value))
                    }
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>Biological Sex</label>
                  <div className="flex gap-2">
                    {['Male', 'Female', 'Other'].map(g => (
                      <button
                        key={g}
                        type="button"
                        onClick={() => handleChange('gender', g)}
                        className={chipClass(formData.gender === g)}
                      >
                        {g}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <div>
                <label className={labelClass}>Experience Level</label>
                <div className="grid grid-cols-3 gap-2">
                  {['Beginner', 'Intermediate', 'Advanced'].map(l => (
                    <button
                      key={l}
                      type="button"
                      onClick={() => handleChange('fitnessLevel', l)}
                      className={chipClass(formData.fitnessLevel === l)}
                    >
                      {l}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Body */}
          {step === 'body' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className={labelClass}>Height</label>
                    <button
                      type="button"
                      onClick={() =>
                        updatePreferences({ heightUnit: heightUnit === 'in' ? 'cm' : 'in' })
                      }
                      className="flex items-center gap-1 text-[10px] font-mono font-bold text-[#30D158] hover:underline"
                    >
                      <RefreshCw className="w-2.5 h-2.5" />
                      {heightUnit}
                    </button>
                  </div>
                  <input
                    type="number"
                    value={formData.height}
                    onChange={e =>
                      handleChange('height', e.target.value === '' ? '' : Number(e.target.value))
                    }
                    className={inputClass}
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className={labelClass}>Current Weight</label>
                    <button
                      type="button"
                      onClick={() =>
                        updatePreferences({ weightUnit: weightUnit === 'lbs' ? 'kg' : 'lbs' })
                      }
                      className="flex items-center gap-1 text-[10px] font-mono font-bold text-[#30D158] hover:underline"
                    >
                      <RefreshCw className="w-2.5 h-2.5" />
                      {weightUnit}
                    </button>
                  </div>
                  <input
                    type="number"
                    step="0.1"
                    value={formData.weight}
                    onChange={e =>
                      handleChange('weight', e.target.value === '' ? '' : Number(e.target.value))
                    }
                    className={inputClass}
                  />
                </div>
              </div>

              <div>
                <label className={labelClass}>Target Weight ({weightUnit})</label>
                <input
                  type="number"
                  step="0.1"
                  value={formData.targetWeight}
                  onChange={e =>
                    handleChange('targetWeight', e.target.value === '' ? '' : Number(e.target.value))
                  }
                  className={inputClass}
                />
              </div>

              <div className="p-4 bg-[#1E1E20] border border-[#2A2A2D] rounded-2xl flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-mono font-bold text-[#A1A1A6] uppercase tracking-wider">
                    Calculated BMI
                  </span>
                  <p className="text-[11px] text-[#30D158] font-mono mt-0.5 font-semibold">
                    {Number(formData.weight) > Number(formData.targetWeight)
                      ? 'Caloric deficit protocol'
                      : 'Hypertrophy surplus protocol'}
                  </p>
                </div>
                <span className="font-headline font-black text-3xl text-[#F5F5F5] font-mono tabular-nums">
                  {typeof formData.height === 'number' &&
                  typeof formData.weight === 'number' &&
                  formData.height > 0
                    ? (
                        (703 *
                          (weightUnit === 'kg' ? formData.weight * 2.20462 : formData.weight)) /
                        Math.pow(
                          heightUnit === 'cm' ? formData.height / 2.54 : formData.height,
                          2
                        )
                      ).toFixed(1)
                    : '—'}
                </span>
              </div>

              <div>
                <label className={labelClass}>Known Structural Injuries</label>
                <div className="flex flex-wrap gap-2">
                  {['None', 'Lower Back', 'Knee', 'Shoulder', 'Wrist', 'Neck', 'Ankle'].map(inj => (
                    <button
                      key={inj}
                      type="button"
                      onClick={() => handleChange('injuries', inj)}
                      className={chipClass(formData.injuries === inj)}
                    >
                      {inj}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Goals */}
          {step === 'goals' && (
            <div className="space-y-4">
              <div>
                <label className={labelClass}>Primary Focus</label>
                <div className="grid grid-cols-2 gap-2.5">
                  {[
                    { val: 'Hypertrophy Phase', icon: Dumbbell, color: '#30D158' },
                    { val: 'Fat Loss', icon: Flame, color: '#FF8A00' },
                    { val: 'Endurance', icon: Activity, color: '#4F9CF9' },
                    { val: 'Maintenance', icon: Scale, color: '#A78BFA' },
                  ].map(g => {
                    const Icon = g.icon;
                    const isSelected = formData.goal === g.val;
                    return (
                      <button
                        key={g.val}
                        type="button"
                        onClick={() => handleChange('goal', g.val)}
                        className={`p-3.5 rounded-2xl border transition-all text-left active:scale-95 space-y-1.5 ${
                          isSelected
                            ? 'bg-[#30D158]/10 border-[#30D158] shadow-[0_0_16px_rgba(48,209,88,0.15)]'
                            : 'bg-[#1E1E20] border-[#2A2A2D] hover:border-[#3A3A3D]'
                        }`}
                      >
                        <div
                          className="w-8 h-8 rounded-lg flex items-center justify-center border"
                          style={{
                            backgroundColor: `${g.color}15`,
                            borderColor: `${g.color}30`,
                            color: g.color,
                          }}
                        >
                          <Icon className="w-4 h-4" />
                        </div>
                        <p className="font-headline font-bold text-xs text-[#F5F5F5]">{g.val}</p>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className={labelClass}>
                  Weekly Training Frequency:{' '}
                  <span className="text-[#30D158] font-bold font-mono">
                    {formData.workoutDays} Days / Week
                  </span>
                </label>
                <input
                  type="range"
                  min="2"
                  max="7"
                  value={formData.workoutDays}
                  onChange={e => handleChange('workoutDays', Number(e.target.value))}
                  className="w-full accent-[#30D158] h-2 bg-[#1E1E20] rounded-full appearance-none cursor-pointer border border-[#2A2A2D]"
                />
                <div className="flex justify-between text-[10px] font-mono text-[#6B6B70] font-bold mt-1">
                  <span>2 Days</span>
                  <span>7 Days</span>
                </div>
              </div>

              <div>
                <label className={labelClass}>Motivation & Drive</label>
                <div className="flex gap-2">
                  {['Low', 'Medium', 'High', 'Maximum'].map(m => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => handleChange('motivationLevel', m)}
                      className={`flex-1 ${chipClass(formData.motivationLevel === m)}`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Step 4: Lifestyle */}
          {step === 'lifestyle' && (
            <div className="space-y-4">
              <div>
                <label className={labelClass}>Activity Baseline</label>
                <div className="grid grid-cols-2 gap-2">
                  {['Sedentary', 'Light', 'Moderate', 'Very Active'].map(a => (
                    <button
                      key={a}
                      type="button"
                      onClick={() => handleChange('activityLevel', a)}
                      className={chipClass(formData.activityLevel === a)}
                    >
                      {a}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className={labelClass}>Training Environment</label>
                <div className="flex gap-2">
                  {['Gym', 'Home', 'Both', 'Outdoor'].map(w => (
                    <button
                      key={w}
                      type="button"
                      onClick={() => handleChange('workoutPreference', w)}
                      className={`flex-1 ${chipClass(formData.workoutPreference === w)}`}
                    >
                      {w}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className={labelClass}>Dietary Preference</label>
                <div className="flex flex-wrap gap-2">
                  {['Standard', 'Vegetarian', 'Vegan', 'Keto', 'Paleo', 'Indian', 'Mediterranean'].map(
                    d => (
                      <button
                        key={d}
                        type="button"
                        onClick={() => handleChange('dietPreference', d)}
                        className={chipClass(formData.dietPreference === d)}
                      >
                        {d}
                      </button>
                    )
                  )}
                </div>
              </div>

              <div>
                <label className={labelClass}>Sleep Quality Assessment</label>
                <div className="flex gap-2">
                  {['Poor', 'Fair', 'Good', 'Restorative'].map(s => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => handleChange('sleepQuality', s)}
                      className={`flex-1 ${chipClass(formData.sleepQuality === s)}`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Step: Complete */}
          {step === 'complete' && (
            <div className="text-center py-8 space-y-4">
              <div className="w-16 h-16 bg-[#30D158]/15 rounded-2xl flex items-center justify-center mx-auto border border-[#30D158]/30 text-[#30D158] shadow-[0_4px_24px_rgba(48,209,88,0.25)]">
                <CheckCircle2 className="w-8 h-8 stroke-[2.5]" />
              </div>
              <div className="space-y-1">
                <h3 className="font-headline font-black text-xl text-[#F5F5F5] uppercase">
                  Profile Calibrated
                </h3>
                <p className="text-[#A1A1A6] text-xs">
                  Your personalized biomechanical parameters have been synthesized.
                </p>
              </div>
            </div>
          )}

          {/* Navigation */}
          {step !== 'complete' && (
            <div className="flex gap-3 mt-6 pt-4 border-t border-[#2A2A2D]">
              {currentIdx > 0 && (
                <button
                  type="button"
                  onClick={() => setStep(STEPS[currentIdx - 1])}
                  className="px-5 py-3 rounded-xl border border-[#2A2A2D] bg-[#1E1E20] text-[#A1A1A6] hover:text-[#F5F5F5] font-headline font-bold text-xs uppercase tracking-wider transition-colors flex items-center gap-1.5"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Back</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  if (currentIdx < STEPS.length - 2) setStep(STEPS[currentIdx + 1]);
                  else handleSubmit();
                }}
                className="flex-1 bg-[#FF8A00] hover:bg-[#FF8A00]/90 text-black font-headline font-black text-xs uppercase tracking-wider py-3.5 rounded-xl active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-[0_4px_16px_rgba(255,138,0,0.25)]"
              >
                <span>{currentIdx < STEPS.length - 2 ? 'Continue' : 'Initialize Plan'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
