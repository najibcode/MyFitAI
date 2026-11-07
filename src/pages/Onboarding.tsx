// ─────────────────────────────────────────────────────────────
// MyFitAI — Athlete Onboarding Experience
// Athletic Personal Operating System UI/UX
// ─────────────────────────────────────────────────────────────

import { useState, useEffect } from 'react';
import { useOnboarding } from '../context/OnboardingContext';
import { useFitnessContext } from '../context/FitnessContext';
import { usePreferences } from '../context/PreferencesContext';
import type { FitnessGoal } from '../context/FitnessContext';
import {
  Activity,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Dumbbell,
  Flame,
  Scale,
  RefreshCw,
  Sparkles,
  Zap,
  Calendar,
  TrendingUp,
  Target,
} from 'lucide-react';

const STEPS = ['welcome', 'basics', 'body', 'goals', 'lifestyle', 'generating', 'ready'] as const;
type Step = typeof STEPS[number];

export default function Onboarding() {
  const { completeOnboarding } = useOnboarding();
  const { updateProfile } = useFitnessContext();
  const [step, setStep] = useState<Step>('welcome');
  const [genProgress, setGenProgress] = useState(0);
  const { weightUnit, heightUnit, updatePreferences } = usePreferences();
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
    name: '',
    age: 25,
    gender: 'Male',
    height: heightUnit === 'cm' ? 178 : 70,
    weight: weightUnit === 'kg' ? 77 : 170,
    targetWeight: weightUnit === 'kg' ? 75 : 165,
    goal: 'Hypertrophy Phase',
    fitnessLevel: 'Intermediate',
    activityLevel: 'Moderate',
    workoutPreference: 'Gym',
    workoutDays: 5,
    dietPreference: 'Standard',
    sleepQuality: 'Good',
    injuries: 'None',
    motivationLevel: 'High',
  });

  const handleChange = (name: string, value: string | number) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const totalFormSteps = 4; // basics, body, goals, lifestyle

  useEffect(() => {
    if (step === 'generating') {
      const interval = setInterval(() => {
        setGenProgress(p => {
          if (p >= 100) {
            clearInterval(interval);
            setTimeout(() => setStep('ready'), 400);
            return 100;
          }
          return p + Math.random() * 8 + 2;
        });
      }, 120);
      return () => clearInterval(interval);
    }
  }, [step]);

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
      name: formData.name || 'Athlete',
      age: Number(formData.age) || 25,
      gender: formData.gender,
      height: finalHeight,
      weight: finalWeight,
      targetWeight: finalTargetWeight,
      goal: formData.goal as FitnessGoal,
    });
    setStep('generating');
  };

  const handleFinish = () => {
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

    completeOnboarding({
      ...formData,
      age: Number(formData.age) || 25,
      height: finalHeight || 70,
      weight: finalWeight || 170,
      targetWeight: finalTargetWeight || 165,
      workoutDays: formData.workoutDays || 5,
    });
  };

  const nextStep = () => {
    const stepOrder: Step[] = ['basics', 'body', 'goals', 'lifestyle'];
    const current = stepOrder.indexOf(step as any);
    if (current < stepOrder.length - 1) {
      setStep(stepOrder[current + 1]);
    } else {
      handleSubmit();
    }
  };

  const prevStep = () => {
    const stepOrder: Step[] = ['basics', 'body', 'goals', 'lifestyle'];
    const current = stepOrder.indexOf(step as any);
    if (current > 0) {
      setStep(stepOrder[current - 1]);
    } else {
      setStep('welcome');
    }
  };

  const chipClass = (selected: boolean) =>
    `px-3 py-2.5 rounded-xl text-xs font-mono font-bold uppercase tracking-wider transition-all cursor-pointer border active:scale-95 ${
      selected
        ? 'bg-[#30D158] text-black border-[#30D158] shadow-sm'
        : 'bg-[#1E1E20] text-[#A1A1A6] border-[#2A2A2D] hover:text-[#F5F5F5] hover:border-[#3A3A3D]'
    }`;

  const inputClass =
    'w-full bg-[#1E1E20] border border-[#2A2A2D] rounded-xl py-3 px-4 text-sm font-semibold text-[#F5F5F5] placeholder:text-[#6B6B70] outline-none focus:border-[#30D158] transition-colors';

  // 1. WELCOME SCREEN
  if (step === 'welcome') {
    return (
      <div className="fixed inset-0 z-[300] bg-[#080808] flex flex-col items-center justify-center px-6 overflow-y-auto py-8">
        <div className="relative z-10 text-center max-w-sm space-y-6">
          {/* Logo Emblem */}
          <div className="w-16 h-16 mx-auto bg-[#30D158] rounded-2xl flex items-center justify-center shadow-[0_4px_30px_rgba(48,209,88,0.3)]">
            <Activity className="w-9 h-9 text-black stroke-[2.5]" />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-center gap-2">
              <h1 className="font-headline font-black text-4xl text-[#F5F5F5] tracking-tight uppercase">
                MyFitAI
              </h1>
              <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-[#30D158] px-2 py-0.5 rounded bg-[#30D158]/10 border border-[#30D158]/20">
                OS
              </span>
            </div>
            <p className="text-xs text-[#A1A1A6] leading-relaxed">
              Personal Athletic Operating System
            </p>
            <p className="text-[11px] font-mono text-[#6B6B70] tracking-wide">
              Workouts · Progressive Overload · Nutrition · GPS Territory · Telemetry
            </p>
          </div>

          <div className="space-y-3 pt-4">
            <button
              onClick={() => setStep('basics')}
              className="w-full bg-[#FF8A00] hover:bg-[#FF8A00]/90 text-black font-headline font-black py-4 rounded-xl text-xs uppercase tracking-wider shadow-[0_4px_20px_rgba(255,138,0,0.25)] active:scale-[0.98] transition-all flex items-center justify-center gap-2"
            >
              <Zap className="w-4 h-4 fill-black" />
              <span>Initialize Operating System</span>
            </button>

            <button
              type="button"
              onClick={handleFinish}
              className="w-full py-2.5 text-[#A1A1A6] hover:text-[#F5F5F5] text-xs font-mono font-semibold transition-colors uppercase tracking-wider"
            >
              Skip setup & explore default baseline
            </button>
          </div>

          <p className="text-[#6B6B70] text-[10px] font-mono uppercase tracking-widest">
            Configuration takes ~60 seconds
          </p>
        </div>
      </div>
    );
  }

  // 2. GENERATING SCREEN
  if (step === 'generating') {
    const stages = [
      { label: 'Analyzing biometric parameters', done: genProgress > 20 },
      { label: 'Calibrating progressive overload engine', done: genProgress > 40 },
      { label: 'Formulating macronutrient pacing', done: genProgress > 60 },
      { label: 'Synthesizing MEV/MRV recovery landmarks', done: genProgress > 80 },
      { label: 'Finalizing algorithmic copilot', done: genProgress > 95 },
    ];

    return (
      <div className="fixed inset-0 z-[300] bg-[#080808] flex flex-col items-center justify-center px-6">
        <div className="relative z-10 w-full max-w-sm text-center space-y-6">
          <div className="w-20 h-20 mx-auto relative flex items-center justify-center">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 80 80">
              <circle
                cx="40"
                cy="40"
                r="36"
                fill="transparent"
                stroke="#1E1E20"
                strokeWidth="4"
              />
              <circle
                cx="40"
                cy="40"
                r="36"
                fill="transparent"
                stroke="#30D158"
                strokeWidth="4"
                strokeLinecap="round"
                strokeDasharray={`${Math.PI * 72}`}
                strokeDashoffset={`${Math.PI * 72 * (1 - Math.min(genProgress, 100) / 100)}`}
                className="transition-all duration-300"
              />
            </svg>
            <span className="absolute inset-0 flex items-center justify-center font-headline font-black text-xl text-[#30D158] font-mono tabular-nums">
              {Math.min(100, Math.round(genProgress))}%
            </span>
          </div>

          <div className="space-y-1">
            <h2 className="font-headline font-black text-2xl text-[#F5F5F5] uppercase tracking-tight">
              Synthesizing Plan
            </h2>
            <p className="text-xs text-[#A1A1A6]">
              Calibrating mesocycle for {formData.name || 'you'}...
            </p>
          </div>

          <div className="space-y-2 text-left pt-2">
            {stages.map((s, i) => (
              <div
                key={i}
                className={`flex items-center gap-3 py-2 px-3 rounded-xl border transition-all duration-300 ${
                  s.done
                    ? 'bg-[#151517] border-[#30D158]/30'
                    : 'bg-[#151517]/40 border-[#2A2A2D] opacity-40'
                }`}
              >
                <div
                  className={`w-6 h-6 rounded-md flex items-center justify-center ${
                    s.done ? 'bg-[#30D158]/20 text-[#30D158]' : 'bg-[#1E1E20] text-[#6B6B70]'
                  }`}
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                </div>
                <span
                  className={`text-xs font-mono font-medium ${
                    s.done ? 'text-[#F5F5F5]' : 'text-[#6B6B70]'
                  }`}
                >
                  {s.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // 3. READY SCREEN
  if (step === 'ready') {
    return (
      <div className="fixed inset-0 z-[300] bg-[#080808] flex flex-col items-center justify-center px-6">
        <div className="relative z-10 text-center max-w-sm space-y-6">
          <div className="w-20 h-20 mx-auto bg-[#30D158]/15 rounded-3xl flex items-center justify-center border border-[#30D158]/30 text-[#30D158] shadow-[0_4px_30px_rgba(48,209,88,0.25)]">
            <CheckCircle2 className="w-10 h-10 stroke-[2.5]" />
          </div>

          <div className="space-y-1">
            <h2 className="font-headline font-black text-3xl text-[#F5F5F5] uppercase tracking-tight">
              System Ready
            </h2>
            <p className="text-xs text-[#A1A1A6] leading-relaxed">
              Your customized athletic personal operating system has been initialized.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-2.5 pt-2">
            {[
              {
                label: 'Goal',
                value: formData.goal.split(' ')[0],
                icon: Target,
                color: '#FF8A00',
              },
              {
                label: 'Frequency',
                value: `${formData.workoutDays}d / wk`,
                icon: Calendar,
                color: '#30D158',
              },
              {
                label: 'Level',
                value: formData.fitnessLevel.slice(0, 5),
                icon: TrendingUp,
                color: '#4F9CF9',
              },
            ].map((s, i) => {
              const Icon = s.icon;
              return (
                <div
                  key={i}
                  className="bg-[#151517] rounded-2xl p-3.5 border border-[#2A2A2D] text-center space-y-1"
                >
                  <Icon className="w-4 h-4 mx-auto" style={{ color: s.color }} />
                  <p className="font-headline font-bold text-sm text-[#F5F5F5]">{s.value}</p>
                  <p className="text-[9px] font-mono uppercase tracking-wider text-[#A1A1A6]">
                    {s.label}
                  </p>
                </div>
              );
            })}
          </div>

          <button
            onClick={handleFinish}
            className="w-full bg-[#30D158] hover:bg-[#30D158]/90 text-black font-headline font-black py-4 rounded-xl text-xs uppercase tracking-wider shadow-[0_4px_20px_rgba(48,209,88,0.3)] active:scale-[0.98] transition-all flex items-center justify-center gap-2"
          >
            <Zap className="w-4 h-4 fill-black" />
            <span>Enter MyFitAI</span>
          </button>
        </div>
      </div>
    );
  }

  // 4. FORM STEPS
  const formStepIdx = ['basics', 'body', 'goals', 'lifestyle'].indexOf(step);
  const progressPct = ((formStepIdx + 1) / totalFormSteps) * 100;

  return (
    <div className="fixed inset-0 z-[300] bg-[#080808] flex flex-col overflow-hidden">
      {/* Progress bar */}
      <div className="h-1 bg-[#151517] w-full flex-shrink-0">
        <div
          className="h-full bg-[#30D158] transition-all duration-300"
          style={{ width: `${progressPct}%` }}
        />
      </div>

      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 flex-shrink-0 border-b border-[#2A2A2D]">
        <button
          onClick={formStepIdx > 0 ? prevStep : undefined}
          className={`w-9 h-9 rounded-xl bg-[#151517] border border-[#2A2A2D] flex items-center justify-center text-[#A1A1A6] transition-colors ${
            formStepIdx > 0 ? 'hover:text-[#F5F5F5]' : 'opacity-0 pointer-events-none'
          }`}
          aria-label="Back"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <p className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#30D158]">
          Phase {formStepIdx + 1} of {totalFormSteps}
        </p>
        <div className="w-9" />
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-6 pb-28 pt-4 [scrollbar-width:none]">
        <div className="max-w-md mx-auto space-y-6">
          {/* Step: Basics */}
          {step === 'basics' && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <div>
                <h2 className="font-headline font-black text-2xl text-[#F5F5F5] uppercase tracking-tight">
                  Athlete Identity
                </h2>
                <p className="text-xs text-[#A1A1A6]">Personal credentials and training baseline</p>
              </div>

              <div>
                <label className="block text-[10px] font-mono font-bold uppercase tracking-wider text-[#A1A1A6] mb-1.5">
                  Full Name
                </label>
                <input
                  value={formData.name}
                  onChange={e => handleChange('name', e.target.value)}
                  className={inputClass}
                  placeholder="e.g. Mohamed Najib"
                  autoFocus
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-mono font-bold uppercase tracking-wider text-[#A1A1A6] mb-1.5">
                    Age
                  </label>
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
                  <label className="block text-[10px] font-mono font-bold uppercase tracking-wider text-[#A1A1A6] mb-1.5">
                    Gender
                  </label>
                  <div className="flex gap-2">
                    {['Male', 'Female', 'Other'].map(g => (
                      <button
                        key={g}
                        type="button"
                        onClick={() => handleChange('gender', g)}
                        className={`flex-1 ${chipClass(formData.gender === g)}`}
                      >
                        {g}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-mono font-bold uppercase tracking-wider text-[#A1A1A6] mb-1.5">
                  Training Experience
                </label>
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

          {/* Step: Body */}
          {step === 'body' && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <div>
                <h2 className="font-headline font-black text-2xl text-[#F5F5F5] uppercase tracking-tight">
                  Biometrics
                </h2>
                <p className="text-xs text-[#A1A1A6]">Anthropometric measurements for caloric scaling</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#A1A1A6]">
                      Height
                    </label>
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
                    <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#A1A1A6]">
                      Weight
                    </label>
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
                <label className="block text-[10px] font-mono font-bold uppercase tracking-wider text-[#A1A1A6] mb-1.5">
                  Target Weight ({weightUnit})
                </label>
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

              <div className="p-4 bg-[#151517] border border-[#2A2A2D] rounded-2xl flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-mono font-bold text-[#A1A1A6] uppercase tracking-wider">
                    Computed BMI
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
                <label className="block text-[10px] font-mono font-bold uppercase tracking-wider text-[#A1A1A6] mb-1.5">
                  Any Structural Injuries?
                </label>
                <div className="flex flex-wrap gap-2">
                  {['None', 'Lower Back', 'Knee', 'Shoulder', 'Wrist', 'Neck'].map(inj => (
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

          {/* Step: Goals */}
          {step === 'goals' && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <div>
                <h2 className="font-headline font-black text-2xl text-[#F5F5F5] uppercase tracking-tight">
                  Training Focus
                </h2>
                <p className="text-xs text-[#A1A1A6]">Primary outcome for this mesocycle</p>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                {[
                  {
                    val: 'Fat Loss',
                    icon: Flame,
                    color: '#FF8A00',
                    desc: 'Caloric deficit and conditioning',
                  },
                  {
                    val: 'Hypertrophy Phase',
                    icon: Dumbbell,
                    color: '#30D158',
                    desc: 'Progressive overload for muscle',
                  },
                  {
                    val: 'Endurance',
                    icon: Activity,
                    color: '#4F9CF9',
                    desc: 'Aerobic threshold and stamina',
                  },
                  {
                    val: 'Maintenance',
                    icon: Scale,
                    color: '#A78BFA',
                    desc: 'Physiological balance',
                  },
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
                          ? 'bg-[#151517] border-[#30D158] shadow-[0_0_16px_rgba(48,209,88,0.15)]'
                          : 'bg-[#151517] border-[#2A2A2D] hover:border-[#3A3A3D]'
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
                      <p className="font-headline font-bold text-xs text-[#F5F5F5]">
                        {g.val === 'Hypertrophy Phase' ? 'Hypertrophy' : g.val}
                      </p>
                      <p className="text-[10px] text-[#A1A1A6] leading-snug">{g.desc}</p>
                    </button>
                  );
                })}
              </div>

              <div>
                <label className="block text-[10px] font-mono font-bold uppercase tracking-wider text-[#A1A1A6] mb-1.5">
                  Workout Days:{' '}
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
                  className="w-full accent-[#30D158] h-2 bg-[#151517] rounded-full appearance-none cursor-pointer border border-[#2A2A2D]"
                />
                <div className="flex justify-between text-[10px] font-mono text-[#6B6B70] font-bold mt-1">
                  <span>2 Days</span>
                  <span>7 Days</span>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-mono font-bold uppercase tracking-wider text-[#A1A1A6] mb-1.5">
                  Motivation Level
                </label>
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

          {/* Step: Lifestyle */}
          {step === 'lifestyle' && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <div>
                <h2 className="font-headline font-black text-2xl text-[#F5F5F5] uppercase tracking-tight">
                  Lifestyle Routine
                </h2>
                <p className="text-xs text-[#A1A1A6]">Environment and recovery habits</p>
              </div>

              <div>
                <label className="block text-[10px] font-mono font-bold uppercase tracking-wider text-[#A1A1A6] mb-1.5">
                  Activity Level
                </label>
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
                <label className="block text-[10px] font-mono font-bold uppercase tracking-wider text-[#A1A1A6] mb-1.5">
                  Workout Environment
                </label>
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
                <label className="block text-[10px] font-mono font-bold uppercase tracking-wider text-[#A1A1A6] mb-1.5">
                  Diet Preference
                </label>
                <div className="flex flex-wrap gap-2">
                  {['Standard', 'Vegetarian', 'Vegan', 'Keto', 'Indian', 'Mediterranean'].map(d => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => handleChange('dietPreference', d)}
                      className={chipClass(formData.dietPreference === d)}
                    >
                      {d}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-mono font-bold uppercase tracking-wider text-[#A1A1A6] mb-1.5">
                  Sleep Quality
                </label>
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
        </div>
      </div>

      {/* Bottom CTA */}
      {['basics', 'body', 'goals', 'lifestyle'].includes(step) && (
        <div className="fixed bottom-0 left-0 right-0 p-5 bg-[#080808]/95 backdrop-blur-md border-t border-[#2A2A2D]">
          <div className="max-w-md mx-auto">
            <button
              onClick={nextStep}
              className="w-full bg-[#FF8A00] hover:bg-[#FF8A00]/90 text-black font-headline font-black py-4 rounded-xl text-xs uppercase tracking-wider shadow-[0_4px_20px_rgba(255,138,0,0.25)] active:scale-[0.98] transition-all flex items-center justify-center gap-2"
            >
              {step === 'lifestyle' ? (
                <>
                  <Sparkles className="w-4 h-4 fill-black" />
                  <span>Generate Personalized Mesocycle</span>
                </>
              ) : (
                <>
                  <span>Continue</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
