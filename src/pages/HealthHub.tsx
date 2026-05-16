import { useFitnessContext } from '../context/FitnessContext';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../context/ToastContext';
import { useState } from 'react';

export default function HealthHub() {
  const { dailyStats, profile, logActivity } = useFitnessContext();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [customSteps, setCustomSteps] = useState('');
  const [showStepInput, setShowStepInput] = useState(false);
  
  const stepPrc = Math.min(100, Math.round((dailyStats.steps / profile.dailyStepGoal) * 100));
  const stepStrokeDash = (stepPrc / 100) * 251.2;

  const addSteps = (count: number) => {
    logActivity({ type: 'Steps', value: count, caloriesBurned: Math.round(count * 0.04) });
    showToast(`+${count.toLocaleString()} steps logged!`, 'success');
  };

  const handleCustomSteps = () => {
    const num = parseInt(customSteps);
    if (!num || num <= 0) return;
    addSteps(num);
    setCustomSteps('');
    setShowStepInput(false);
  };
  
  return (
    <main className="max-w-lg mx-auto px-5 py-6 pb-32 space-y-6">
      <header>
        <p className="text-secondary font-label font-bold tracking-widest uppercase text-[10px] mb-1">Health & Activity</p>
        <h1 className="font-headline font-extrabold text-[28px] tracking-tight">Health Hub</h1>
      </header>

      {/* Step Tracker */}
      <section className="bg-[var(--color-surface-container)] rounded-[2rem] p-6 border border-white/5 relative overflow-hidden">
        <div className="absolute -top-20 -right-20 w-40 h-40 bg-[#6FFB85]/5 rounded-full blur-3xl" />
        <div className="flex items-center gap-6 relative z-10">
          <div className="relative w-28 h-28 flex-shrink-0">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="40" fill="transparent" stroke="var(--color-surface-container-highest)" strokeWidth="8" />
              <circle cx="50" cy="50" r="40" fill="transparent" stroke="#6FFB85" strokeWidth="8" strokeLinecap="round" strokeDasharray={`${stepStrokeDash} 251.2`} className="transition-all duration-700" />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="material-symbols-outlined text-[#6FFB85] text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>steps</span>
              <span className="font-headline font-black text-lg leading-none mt-0.5">{stepPrc}%</span>
            </div>
          </div>
          <div className="flex-1">
            <p className="font-headline font-black text-3xl tracking-tighter">{dailyStats.steps.toLocaleString()}</p>
            <p className="text-on-surface-variant text-xs font-medium mt-0.5">of {profile.dailyStepGoal.toLocaleString()} step goal</p>
            <p className="text-on-surface-variant text-[10px] mt-2">≈ {(dailyStats.steps * 0.000762).toFixed(1)} km • {Math.round(dailyStats.steps * 0.04)} kcal</p>
          </div>
        </div>
        <div className="flex gap-2 mt-5 relative z-10">
          {[1000, 2500, 5000].map(count => (
            <button key={count} onClick={() => addSteps(count)} className="flex-1 bg-[var(--color-surface-container-high)] hover:bg-[var(--color-surface-container-highest)] text-on-surface font-headline font-bold text-xs py-3 rounded-xl transition-colors active:scale-95">
              +{(count/1000).toFixed(count < 1000 ? 0 : 1)}k
            </button>
          ))}
          <button onClick={() => setShowStepInput(!showStepInput)} className="w-12 bg-primary/10 hover:bg-primary/20 text-primary rounded-xl flex items-center justify-center transition-colors active:scale-95">
            <span className="material-symbols-outlined text-lg">edit</span>
          </button>
        </div>
        {showStepInput && (
          <div className="flex gap-2 mt-3 relative z-10">
            <input type="text" inputMode="numeric" pattern="[0-9]*" value={customSteps} onChange={e => { if (/^\d*$/.test(e.target.value)) setCustomSteps(e.target.value); }} onKeyDown={e => e.key === 'Enter' && handleCustomSteps()} placeholder="Enter steps..." autoFocus className="flex-1 bg-[var(--color-surface)] outline-none rounded-xl px-4 py-3 font-headline text-base font-bold border border-white/10 focus:border-primary transition-colors" />
            <button onClick={handleCustomSteps} disabled={!customSteps || parseInt(customSteps) <= 0} className="px-5 bg-primary text-black font-bold rounded-xl text-sm active:scale-95 disabled:opacity-40">Add</button>
          </div>
        )}
      </section>

      {/* Health Metrics Grid */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-[var(--color-surface-container)] rounded-2xl p-5 flex flex-col gap-3">
          <span className="material-symbols-outlined text-primary text-xl" style={{ fontVariationSettings: "'FILL' 1" }}>bedtime</span>
          <div>
            <p className="font-headline font-black text-2xl tracking-tighter">{dailyStats.sleep || '—'}<span className="text-xs font-normal text-on-surface-variant ml-1">hrs</span></p>
            <p className="text-on-surface-variant text-[10px] font-bold uppercase tracking-wider mt-0.5">Sleep</p>
          </div>
          <div className="w-full bg-white/[0.04] h-1.5 rounded-full overflow-hidden">
            <div className="bg-primary h-full rounded-full transition-all" style={{ width: `${Math.min(100, (dailyStats.sleep / 8) * 100)}%` }} />
          </div>
        </div>
        <div className="bg-[var(--color-surface-container)] rounded-2xl p-5 flex flex-col gap-3">
          <span className="material-symbols-outlined text-[#60A5FA] text-xl" style={{ fontVariationSettings: "'FILL' 1" }}>water_drop</span>
          <div>
            <p className="font-headline font-black text-2xl tracking-tighter">{dailyStats.water.toFixed(1)}<span className="text-xs font-normal text-on-surface-variant ml-1">L</span></p>
            <p className="text-on-surface-variant text-[10px] font-bold uppercase tracking-wider mt-0.5">Hydration</p>
          </div>
          <div className="w-full bg-white/[0.04] h-1.5 rounded-full overflow-hidden">
            <div className="bg-[#60A5FA] h-full rounded-full transition-all" style={{ width: `${Math.min(100, (dailyStats.water / profile.dailyWaterGoal) * 100)}%` }} />
          </div>
        </div>
        <div className="bg-[var(--color-surface-container)] rounded-2xl p-5 flex flex-col gap-3">
          <span className="material-symbols-outlined text-[#FF4D4D] text-xl" style={{ fontVariationSettings: "'FILL' 1" }}>local_fire_department</span>
          <div>
            <p className="font-headline font-black text-2xl tracking-tighter">{dailyStats.calories}<span className="text-xs font-normal text-on-surface-variant ml-1">kcal</span></p>
            <p className="text-on-surface-variant text-[10px] font-bold uppercase tracking-wider mt-0.5">Burned</p>
          </div>
          <div className="w-full bg-white/[0.04] h-1.5 rounded-full overflow-hidden">
            <div className="bg-[#FF4D4D] h-full rounded-full transition-all" style={{ width: `${Math.min(100, (dailyStats.calories / profile.dailyCalorieGoal) * 100)}%` }} />
          </div>
        </div>
        <div className="bg-[var(--color-surface-container)] rounded-2xl p-5 flex flex-col gap-3">
          <span className="material-symbols-outlined text-[#fab0ff] text-xl" style={{ fontVariationSettings: "'FILL' 1" }}>fitness_center</span>
          <div>
            <p className="font-headline font-black text-2xl tracking-tighter">{dailyStats.duration}<span className="text-xs font-normal text-on-surface-variant ml-1">min</span></p>
            <p className="text-on-surface-variant text-[10px] font-bold uppercase tracking-wider mt-0.5">Exercise</p>
          </div>
          <div className="w-full bg-white/[0.04] h-1.5 rounded-full overflow-hidden">
            <div className="bg-[#fab0ff] h-full rounded-full transition-all" style={{ width: `${Math.min(100, (dailyStats.duration / 60) * 100)}%` }} />
          </div>
        </div>
      </div>

      {/* Recovery Score */}
      <section className="bg-gradient-to-br from-secondary/10 to-transparent p-6 rounded-[2rem] border border-secondary/10">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-headline font-bold text-lg tracking-tight">Daily Readiness</h3>
          <div className="w-14 h-14 relative">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
              <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="var(--color-surface-container-highest)" strokeWidth="3" />
              <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#6FFB85" strokeDasharray={`${Math.min(100, Math.round((dailyStats.sleep / 8) * 100))}, 100`} strokeWidth="3" />
            </svg>
            <span className="absolute inset-0 flex items-center justify-center font-headline font-black text-xs">
              {dailyStats.sleep > 0 ? Math.min(100, Math.round((dailyStats.sleep / 8) * 100)) : '—'}
            </span>
          </div>
        </div>
        <p className="text-on-surface-variant text-sm leading-relaxed mb-4">
          {dailyStats.sleep >= 7 ? 'Great recovery! Your body is ready for high intensity training.' :
           dailyStats.sleep > 0 ? 'Recovery could be better. Consider a lighter workout today.' :
           'Log your sleep to get a personalized readiness score.'}
        </p>
        <button onClick={() => navigate('/workout')} className="w-full bg-secondary text-[#004818] font-headline font-extrabold py-3.5 rounded-2xl uppercase tracking-wider text-sm transition-all hover:brightness-110 active:scale-95 shadow-[0_8px_32px_rgba(111,251,133,0.2)]">
          {dailyStats.sleep >= 7 ? 'Start Intense Workout' : 'Generate Recovery Routine'}
        </button>
      </section>
    </main>
  );
}
