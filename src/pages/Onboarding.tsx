import { useState, useEffect } from 'react';
import { useOnboarding } from '../context/OnboardingContext';
import { useFitnessContext } from '../context/FitnessContext';
import { usePreferences } from '../context/PreferencesContext';
import type { FitnessGoal } from '../context/FitnessContext';

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
    // Convert back to lbs/inches for internal storage if user selected metric
    const finalWeight = weightUnit === 'kg' && typeof formData.weight === 'number' ? formData.weight * 2.20462 : Number(formData.weight);
    const finalTargetWeight = weightUnit === 'kg' && typeof formData.targetWeight === 'number' ? formData.targetWeight * 2.20462 : Number(formData.targetWeight);
    const finalHeight = heightUnit === 'cm' && typeof formData.height === 'number' ? formData.height / 2.54 : Number(formData.height);

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
    const finalWeight = weightUnit === 'kg' && typeof formData.weight === 'number' ? formData.weight * 2.20462 : Number(formData.weight);
    const finalTargetWeight = weightUnit === 'kg' && typeof formData.targetWeight === 'number' ? formData.targetWeight * 2.20462 : Number(formData.targetWeight);
    const finalHeight = heightUnit === 'cm' && typeof formData.height === 'number' ? formData.height / 2.54 : Number(formData.height);

    completeOnboarding({
      ...formData,
      age: Number(formData.age) || 25,
      height: finalHeight || 70,
      weight: finalWeight || 170,
      targetWeight: finalTargetWeight || 165,
    });
  };

  const nextStep = () => {
    const idx = STEPS.indexOf(step);
    if (step === 'lifestyle') handleSubmit();
    else if (idx < STEPS.length - 1) setStep(STEPS[idx + 1]);
  };

  const prevStep = () => {
    const idx = STEPS.indexOf(step);
    if (idx > 1) setStep(STEPS[idx - 1]);
  };

  const chipClass = (selected: boolean) =>
    `px-4 py-3 rounded-2xl text-xs font-bold uppercase tracking-widest transition-all cursor-pointer border active:scale-95 ${
      selected
        ? 'bg-primary text-black border-primary shadow-[0_0_20px_rgba(255,122,0,0.3)]'
        : 'bg-white/5 text-on-surface-variant border-white/10 hover:border-white/30 hover:bg-white/10'
    }`;

  const inputClass =
    'w-full bg-white/5 outline-none rounded-2xl px-5 py-4 border border-white/10 focus:border-primary/60 transition-all text-sm font-medium placeholder:text-white/20';

  // WELCOME SCREEN
  if (step === 'welcome') {
    return (
      <div className="fixed inset-0 z-[300] bg-background flex flex-col items-center justify-center px-8 overflow-hidden">
        {/* Animated background */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-primary/10 rounded-full blur-[120px] animate-pulse" />
          <div className="absolute bottom-1/4 left-1/3 w-[300px] h-[300px] bg-secondary/10 rounded-full blur-[100px] animate-pulse" style={{ animationDelay: '1s' }} />
          <div className="absolute top-1/3 right-1/4 w-[200px] h-[200px] bg-[#fab0ff]/10 rounded-full blur-[80px] animate-pulse" style={{ animationDelay: '2s' }} />
        </div>

        <div className="relative z-10 text-center max-w-sm animate-in fade-in slide-in-from-bottom-8 duration-700">
          {/* Logo */}
          <div className="relative mx-auto mb-8 w-24 h-24">
            <div className="absolute inset-0 bg-primary/20 rounded-3xl blur-xl animate-pulse" />
            <div className="relative w-full h-full bg-gradient-to-br from-primary to-[#CC5F00] rounded-3xl flex items-center justify-center shadow-[0_16px_64px_rgba(255,122,0,0.4)]">
              <span className="material-symbols-outlined text-black text-4xl" style={{ fontVariationSettings: "'FILL' 1" }}>exercise</span>
            </div>
          </div>

          <h1 className="font-headline font-black text-5xl tracking-tighter mb-3 bg-gradient-to-r from-white via-white to-white/60 bg-clip-text text-transparent">
            MyFitAI
          </h1>
          <p className="text-on-surface-variant text-sm leading-relaxed mb-2">
            Your AI-powered fitness ecosystem
          </p>
          <p className="text-white/30 text-xs mb-12 max-w-xs mx-auto leading-relaxed">
            Workouts • Nutrition • Recovery • Progress • AI Coaching
          </p>

          <button
            onClick={() => setStep('basics')}
            className="w-full bg-gradient-to-r from-primary to-[#CC5F00] text-black font-headline font-black py-5 rounded-2xl text-sm uppercase tracking-widest shadow-[0_12px_40px_rgba(255,122,0,0.35)] hover:shadow-[0_16px_60px_rgba(255,122,0,0.5)] active:scale-[0.97] transition-all flex items-center justify-center gap-3"
          >
            <span className="material-symbols-outlined text-lg">rocket_launch</span>
            Get Started
          </button>

          <p className="text-white/20 text-[10px] mt-6 uppercase tracking-widest">Takes 60 seconds</p>
        </div>
      </div>
    );
  }

  // GENERATING SCREEN
  if (step === 'generating') {
    const stages = [
      { label: 'Analyzing biometrics', icon: 'biotech', done: genProgress > 20 },
      { label: 'Calibrating workout engine', icon: 'fitness_center', done: genProgress > 40 },
      { label: 'Building nutrition plan', icon: 'restaurant', done: genProgress > 60 },
      { label: 'Optimizing recovery model', icon: 'battery_charging_full', done: genProgress > 80 },
      { label: 'Finalizing AI coach', icon: 'psychology', done: genProgress > 95 },
    ];

    return (
      <div className="fixed inset-0 z-[300] bg-background flex flex-col items-center justify-center px-8">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/5 rounded-full blur-[150px] animate-pulse" />
        </div>
        <div className="relative z-10 w-full max-w-sm text-center">
          <div className="w-20 h-20 mx-auto mb-8 relative">
            <div className="absolute inset-0 border-4 border-white/5 rounded-full" />
            <svg className="w-full h-full -rotate-90" viewBox="0 0 80 80">
              <circle cx="40" cy="40" r="36" fill="transparent" stroke="rgba(255,122,0,0.15)" strokeWidth="4" />
              <circle cx="40" cy="40" r="36" fill="transparent" stroke="#FF7A00" strokeWidth="4" strokeLinecap="round"
                strokeDasharray={`${Math.PI * 72}`}
                strokeDashoffset={`${Math.PI * 72 * (1 - Math.min(genProgress, 100) / 100)}`}
                className="transition-all duration-300 drop-shadow-[0_0_10px_rgba(255,122,0,0.5)]"
              />
            </svg>
            <span className="absolute inset-0 flex items-center justify-center font-headline font-black text-xl text-primary">{Math.min(100, Math.round(genProgress))}%</span>
          </div>

          <h2 className="font-headline font-black text-2xl tracking-tight mb-2">Building Your Plan</h2>
          <p className="text-on-surface-variant text-xs mb-10">Personalizing every detail for {formData.name || 'you'}...</p>

          <div className="space-y-3 text-left">
            {stages.map((s, i) => (
              <div key={i} className={`flex items-center gap-3 py-2 px-4 rounded-xl transition-all duration-500 ${s.done ? 'bg-primary/5 border border-primary/20' : 'opacity-40'}`}>
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${s.done ? 'bg-primary/20 text-primary' : 'bg-white/5 text-white/30'}`}>
                  {s.done ? (
                    <span className="material-symbols-outlined text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                  ) : (
                    <span className="material-symbols-outlined text-sm">{s.icon}</span>
                  )}
                </div>
                <span className={`text-xs font-bold uppercase tracking-widest transition-colors ${s.done ? 'text-white' : 'text-white/30'}`}>{s.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // READY SCREEN
  if (step === 'ready') {
    return (
      <div className="fixed inset-0 z-[300] bg-background flex flex-col items-center justify-center px-8">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-secondary/10 rounded-full blur-[120px]" />
        </div>
        <div className="relative z-10 text-center max-w-sm animate-in fade-in zoom-in-95 duration-500">
          <div className="w-24 h-24 mx-auto mb-8 bg-secondary/20 rounded-full flex items-center justify-center border-2 border-secondary/40 shadow-[0_0_60px_rgba(111,251,133,0.3)]">
            <span className="material-symbols-outlined text-secondary text-5xl" style={{ fontVariationSettings: "'FILL' 1" }}>verified</span>
          </div>
          <h2 className="font-headline font-black text-4xl tracking-tighter mb-3">You're Ready!</h2>
          <p className="text-on-surface-variant text-sm leading-relaxed mb-4">
            Your personalized fitness ecosystem has been generated. Let's crush it, {formData.name || 'Athlete'}! 💪
          </p>

          <div className="grid grid-cols-3 gap-3 mb-10">
            {[
              { label: 'Goal', value: formData.goal.split(' ')[0], icon: 'target', color: '#FF7A00' },
              { label: 'Days', value: `${formData.workoutDays}/wk`, icon: 'calendar_month', color: '#6FFB85' },
              { label: 'Level', value: formData.fitnessLevel.slice(0, 5), icon: 'trending_up', color: '#fab0ff' },
            ].map((s, i) => (
              <div key={i} className="bg-white/5 rounded-2xl p-4 border border-white/5 text-center">
                <span className="material-symbols-outlined text-lg mb-1 block" style={{ color: s.color }}>{s.icon}</span>
                <p className="font-headline font-bold text-sm">{s.value}</p>
                <p className="text-[9px] text-on-surface-variant uppercase tracking-widest mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>

          <button
            onClick={handleFinish}
            className="w-full bg-gradient-to-r from-secondary to-[#00c853] text-[#004818] font-headline font-black py-5 rounded-2xl text-sm uppercase tracking-widest shadow-[0_12px_40px_rgba(111,251,133,0.35)] active:scale-[0.97] transition-all flex items-center justify-center gap-3"
          >
            <span className="material-symbols-outlined text-lg">bolt</span>
            Enter MyFitAI
          </button>
        </div>
      </div>
    );
  }

  // FORM STEPS
  const formStepIdx = ['basics', 'body', 'goals', 'lifestyle'].indexOf(step);
  const progressPct = ((formStepIdx + 1) / totalFormSteps) * 100;

  return (
    <div className="fixed inset-0 z-[300] bg-background flex flex-col overflow-hidden">
      {/* Progress bar */}
      <div className="h-1 bg-white/5 w-full flex-shrink-0">
        <div className="h-full bg-gradient-to-r from-primary to-secondary rounded-full transition-all duration-500" style={{ width: `${progressPct}%` }} />
      </div>

      {/* Header */}
      <div className="flex items-center justify-between px-6 py-5 flex-shrink-0">
        <button onClick={formStepIdx > 0 ? prevStep : undefined} className={`w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-white transition-colors ${formStepIdx > 0 ? 'hover:bg-white/10' : 'opacity-0 pointer-events-none'}`}>
          <span className="material-symbols-outlined text-lg">arrow_back</span>
        </button>
        <p className="text-[10px] font-bold uppercase tracking-widest text-primary">Step {formStepIdx + 1} of {totalFormSteps}</p>
        <div className="w-10" />
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-6 pb-32">
        <div className="max-w-sm mx-auto">
          {/* Step: Basics */}
          {step === 'basics' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
              <div>
                <h2 className="font-headline text-3xl font-black tracking-tight mb-1">Who Are You?</h2>
                <p className="text-on-surface-variant text-sm">Let's start with the basics</p>
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-2">Full Name</label>
                <input value={formData.name} onChange={e => handleChange('name', e.target.value)} className={inputClass} placeholder="What should we call you?" autoFocus />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-2">Age</label>
                  <input type="number" value={formData.age} onChange={e => handleChange('age', e.target.value === '' ? '' : Number(e.target.value))} className={inputClass} />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-2">Gender</label>
                  <div className="flex gap-2">
                    {['Male', 'Female', 'Other'].map(g => (
                      <button key={g} onClick={() => handleChange('gender', g)} className={`flex-1 ${chipClass(formData.gender === g)}`} style={{ padding: '10px 8px', fontSize: '10px' }}>{g}</button>
                    ))}
                  </div>
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-2">Fitness Level</label>
                <div className="grid grid-cols-3 gap-2">
                  {['Beginner', 'Intermediate', 'Advanced'].map(l => (
                    <button key={l} onClick={() => handleChange('fitnessLevel', l)} className={chipClass(formData.fitnessLevel === l)}>{l}</button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Step: Body */}
          {step === 'body' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
              <div>
                <h2 className="font-headline text-3xl font-black tracking-tight mb-1">Body Metrics</h2>
                <p className="text-on-surface-variant text-sm">Help us understand your physique</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Height</label>
                    <button onClick={() => updatePreferences({ heightUnit: heightUnit === 'in' ? 'cm' : 'in' })} className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-primary bg-primary/10 px-2 py-0.5 rounded-md hover:bg-primary/20 transition-colors">
                      <span className="material-symbols-outlined text-[12px]">sync_alt</span> {heightUnit}
                    </button>
                  </div>
                  <input type="number" value={formData.height} onChange={e => handleChange('height', e.target.value === '' ? '' : Number(e.target.value))} className={inputClass} />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Current Weight</label>
                    <button onClick={() => updatePreferences({ weightUnit: weightUnit === 'lbs' ? 'kg' : 'lbs' })} className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-primary bg-primary/10 px-2 py-0.5 rounded-md hover:bg-primary/20 transition-colors">
                      <span className="material-symbols-outlined text-[12px]">sync_alt</span> {weightUnit}
                    </button>
                  </div>
                  <input type="number" step="0.1" value={formData.weight} onChange={e => handleChange('weight', e.target.value === '' ? '' : Number(e.target.value))} className={inputClass} />
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-2">Target Weight ({weightUnit})</label>
                <input type="number" step="0.1" value={formData.targetWeight} onChange={e => handleChange('targetWeight', e.target.value === '' ? '' : Number(e.target.value))} className={inputClass} />
              </div>
              {/* Live BMI */}
              <div className="p-5 bg-primary/5 border border-primary/20 rounded-2xl flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Current BMI</span>
                  <p className="text-[10px] text-on-surface-variant mt-0.5">{formData.weight > formData.targetWeight ? 'Fat loss phase' : 'Lean bulk phase'}</p>
                </div>
                <span className="font-headline font-black text-3xl text-primary">
                  {typeof formData.height === 'number' && typeof formData.weight === 'number' && formData.height > 0 
                    ? ((703 * (weightUnit === 'kg' ? formData.weight * 2.20462 : formData.weight)) / Math.pow((heightUnit === 'cm' ? formData.height / 2.54 : formData.height), 2)).toFixed(1) 
                    : '—'}
                </span>
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-2">Any Injuries?</label>
                <div className="flex flex-wrap gap-2">
                  {['None', 'Lower Back', 'Knee', 'Shoulder', 'Wrist', 'Neck'].map(inj => (
                    <button key={inj} onClick={() => handleChange('injuries', inj)} className={chipClass(formData.injuries === inj)}>{inj}</button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Step: Goals */}
          {step === 'goals' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
              <div>
                <h2 className="font-headline text-3xl font-black tracking-tight mb-1">Your Goals</h2>
                <p className="text-on-surface-variant text-sm">What are you training for?</p>
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-3">Primary Goal</label>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { val: 'Fat Loss', icon: 'local_fire_department', color: '#FF4D4D', desc: 'Shed body fat' },
                    { val: 'Hypertrophy Phase', icon: 'fitness_center', color: '#FF7A00', desc: 'Build muscle' },
                    { val: 'Endurance', icon: 'directions_run', color: '#6FFB85', desc: 'Go longer' },
                    { val: 'Maintenance', icon: 'balance', color: '#fab0ff', desc: 'Stay consistent' },
                  ].map(g => (
                    <button
                      key={g.val}
                      onClick={() => handleChange('goal', g.val)}
                      className={`p-5 rounded-2xl border transition-all text-left active:scale-95 ${
                        formData.goal === g.val
                          ? 'bg-primary/10 border-primary/50 shadow-[0_0_25px_rgba(255,122,0,0.15)]'
                          : 'bg-white/5 border-white/10 hover:border-white/30'
                      }`}
                    >
                      <span className="material-symbols-outlined text-2xl mb-2 block" style={{ color: g.color, fontVariationSettings: "'FILL' 1" }}>{g.icon}</span>
                      <p className="font-headline font-bold text-sm">{g.val === 'Hypertrophy Phase' ? 'Muscle Gain' : g.val}</p>
                      <p className="text-[10px] text-on-surface-variant mt-0.5">{g.desc}</p>
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-2">
                  Workout Days: <span className="text-primary">{formData.workoutDays}</span>
                </label>
                <input type="range" min="2" max="7" value={formData.workoutDays} onChange={e => handleChange('workoutDays', Number(e.target.value))} className="w-full accent-primary h-2 bg-white/10 rounded-full appearance-none cursor-pointer" />
                <div className="flex justify-between text-[9px] text-on-surface-variant font-bold mt-1"><span>2 days</span><span>7 days</span></div>
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-2">Motivation Level</label>
                <div className="flex gap-2">
                  {['Low', 'Medium', 'High', 'Beast Mode'].map(m => (
                    <button key={m} onClick={() => handleChange('motivationLevel', m)} className={`flex-1 ${chipClass(formData.motivationLevel === m)}`}>{m}</button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Step: Lifestyle */}
          {step === 'lifestyle' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
              <div>
                <h2 className="font-headline text-3xl font-black tracking-tight mb-1">Lifestyle</h2>
                <p className="text-on-surface-variant text-sm">Final details to personalize everything</p>
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-2">Activity Level</label>
                <div className="grid grid-cols-2 gap-2">
                  {['Sedentary', 'Light', 'Moderate', 'Very Active'].map(a => (
                    <button key={a} onClick={() => handleChange('activityLevel', a)} className={chipClass(formData.activityLevel === a)}>{a}</button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-2">Workout Environment</label>
                <div className="flex gap-2">
                  {['Gym', 'Home', 'Both', 'Outdoor'].map(w => (
                    <button key={w} onClick={() => handleChange('workoutPreference', w)} className={`flex-1 ${chipClass(formData.workoutPreference === w)}`}>{w}</button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-2">Diet Preference</label>
                <div className="flex flex-wrap gap-2">
                  {['Standard', 'Vegetarian', 'Vegan', 'Keto', 'Indian', 'Mediterranean'].map(d => (
                    <button key={d} onClick={() => handleChange('dietPreference', d)} className={chipClass(formData.dietPreference === d)}>{d}</button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-2">Sleep Quality</label>
                <div className="flex gap-2">
                  {['Poor', 'Fair', 'Good', 'Excellent'].map(s => (
                    <button key={s} onClick={() => handleChange('sleepQuality', s)} className={`flex-1 ${chipClass(formData.sleepQuality === s)}`}>{s}</button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Bottom CTA */}
      {['basics', 'body', 'goals', 'lifestyle'].includes(step) && (
        <div className="fixed bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-background via-background to-transparent">
          <div className="max-w-sm mx-auto">
            <button
              onClick={nextStep}
              className="w-full bg-gradient-to-r from-primary to-[#CC5F00] text-black font-headline font-black py-5 rounded-2xl text-sm uppercase tracking-widest shadow-[0_12px_40px_rgba(255,122,0,0.3)] active:scale-[0.97] transition-all flex items-center justify-center gap-2"
            >
              {step === 'lifestyle' ? (
                <><span className="material-symbols-outlined text-lg">auto_awesome</span> Generate My Plan</>
              ) : (
                <><span>Continue</span><span className="material-symbols-outlined text-sm">arrow_forward</span></>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
