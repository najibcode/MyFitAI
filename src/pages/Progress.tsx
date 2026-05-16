import { useFitnessContext } from '../context/FitnessContext';
import { useGamification } from '../context/GamificationContext';
import { usePreferences } from '../context/PreferencesContext';
import { useState, useMemo } from 'react';

const EXERCISES = ['Bench Press','Squat','Deadlift','OHP','Barbell Row','Lat Pulldown','Leg Press','Dumbbell Curl'];
const BODY_LABELS = [
  { label:'Chest', unit:'in' },{ label:'Waist', unit:'in' },{ label:'Arms', unit:'in' },
  { label:'Thighs', unit:'in' },{ label:'Body Fat', unit:'%' },{ label:'Shoulders', unit:'in' },
];

export default function Progress() {
  const { profile, activities, heatmapData, weightHistory, mealLogs, strengthHistory, logStrength, bodyMeasurementHistory, logBodyMeasurement } = useFitnessContext();
  const { xp, level, levelTitle, xpProgress, achievements, weeklyMissions, streak, longestStreak } = useGamification();
  const { weightUnit } = usePreferences();
  const [activeTab, setActiveTab] = useState<'overview' | 'strength' | 'body' | 'achievements'>('overview');

  // Modals
  const [showStrengthModal, setShowStrengthModal] = useState(false);
  const [sExercise, setSExercise] = useState(EXERCISES[0]);
  const [sWeight, setSWeight] = useState('');
  const [sReps, setSReps] = useState('');
  const [showBodyModal, setShowBodyModal] = useState(false);
  const [bLabel, setBLabel] = useState(BODY_LABELS[0].label);
  const [bValue, setBValue] = useState('');
  // 1RM Calculator
  const [calcWeight, setCalcWeight] = useState('');
  const [calcReps, setCalcReps] = useState('');

  const toDisplay = (lbs: number) => weightUnit === 'kg' ? Math.round(lbs / 2.20462 * 10) / 10 : lbs;
  const displayWeight = toDisplay(profile.weight);

  const weightChartData = useMemo(() => {
    if (weightHistory.length < 2) return null;
    const recent = weightHistory.slice(-12);
    const weights = recent.map(e => e.weight);
    const minW = Math.min(...weights) - 2;
    const maxW = Math.max(...weights) + 2;
    const range = maxW - minW || 1;
    const points = weights.map((w, i) => ({
      x: (i / (weights.length - 1)) * 800,
      y: 200 - ((w - minW) / range) * 180,
    }));
    let path = `M${points[0].x},${points[0].y}`;
    for (let i = 1; i < points.length; i++) {
      const p = points[i - 1], c = points[i];
      path += ` C${p.x + (c.x - p.x) * 0.4},${p.y} ${p.x + (c.x - p.x) * 0.6},${c.y} ${c.x},${c.y}`;
    }
    const last = points[points.length - 1];
    const first = weightHistory[0].weight;
    const lastW = weightHistory[weightHistory.length - 1].weight;
    const diff = lastW - first;
    const weeks = Math.max(1, Math.round((Date.parse(weightHistory[weightHistory.length - 1].date) - Date.parse(weightHistory[0].date)) / (7 * 86400000)));
    return {
      linePath: path, fillPath: path + ` V200 H0 Z`, lastPoint: last,
      labels: recent.map(e => new Date(e.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }).replace(' ', '\n')),
      trendText: `${diff > 0 ? '+' : ''}${toDisplay(diff).toFixed(1)} ${weightUnit} in ${weeks} weeks`,
      isDown: diff < 0,
    };
  }, [weightHistory, weightUnit]);

  // Derive strength lifts from real data
  const strengthLifts = useMemo(() => {
    const exerciseMap = new Map<string, { current: number; previous: number; reps: number }>();
    const sorted = [...strengthHistory].sort((a, b) => b.date.localeCompare(a.date));
    sorted.forEach(e => {
      if (!exerciseMap.has(e.exercise)) {
        exerciseMap.set(e.exercise, { current: e.weight, previous: e.weight, reps: e.reps });
      } else {
        const existing = exerciseMap.get(e.exercise)!;
        existing.previous = e.weight; // older entry becomes previous
      }
    });
    return Array.from(exerciseMap.entries()).map(([name, data]) => {
      const change = data.previous > 0 ? ((data.current - data.previous) / data.previous * 100).toFixed(1) : '0';
      return { name, current: data.current, previous: data.previous, reps: data.reps, change: Number(change) >= 0 ? `+${change}%` : `${change}%` };
    });
  }, [strengthHistory]);

  // Derive body measurements from real data
  const bodyMeasurements = useMemo(() => {
    return BODY_LABELS.map(({ label, unit }) => {
      const entries = bodyMeasurementHistory
        .filter(e => e.label === label)
        .sort((a, b) => b.date.localeCompare(a.date));
      if (entries.length === 0) return { label, value: '--', unit, trend: 'neutral' as const };
      const latest = entries[0];
      const prev = entries.length > 1 ? entries[1] : null;
      const trend = prev ? (latest.value > prev.value ? 'up' : latest.value < prev.value ? 'down' : 'neutral') : 'neutral';
      return { label, value: `${latest.value}${unit === '%' ? '%' : '"'}`, unit, trend };
    });
  }, [bodyMeasurementHistory]);

  // Calorie balance for last 7 days
  const calorieBalance = useMemo(() => {
    const days: { label: string; burned: number; consumed: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i);
      const ds = d.toDateString();
      const burned = activities.filter(a => a.type === 'Workout' && new Date(a.timestamp).toDateString() === ds).reduce((s, a) => s + (a.caloriesBurned || 0), 0);
      const consumed = mealLogs.filter(m => new Date(m.timestamp).toDateString() === ds).reduce((s, m) => s + m.calories, 0);
      days.push({ label: d.toLocaleDateString('en-US', { weekday: 'short' }), burned, consumed });
    }
    return days;
  }, [activities, mealLogs]);

  // Auto-generated timeline from real data
  const timelineEvents = useMemo(() => {
    const events: { date: string; note: string; color: string }[] = [];
    // First workout
    const workouts = activities.filter(a => a.type === 'Workout').sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    if (workouts.length > 0) events.push({ date: new Date(workouts[0].timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), note: 'First workout logged!', color: '#fab0ff' });
    if (workouts.length >= 10) events.push({ date: new Date(workouts[9].timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), note: '10th workout completed', color: '#ff9800' });
    // Weight milestones
    if (weightHistory.length >= 2) {
      const firstW = weightHistory[0]; const lastW = weightHistory[weightHistory.length - 1];
      const diff = lastW.weight - firstW.weight;
      if (Math.abs(diff) >= 1) events.push({ date: new Date(lastW.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), note: `Weight ${diff < 0 ? 'down' : 'up'} ${Math.abs(toDisplay(diff)).toFixed(1)} ${weightUnit}`, color: diff < 0 ? '#6FFB85' : '#FF4D4D' });
    }
    // Strength PRs
    if (strengthHistory.length > 0) {
      const best = strengthHistory.reduce((a, b) => a.weight > b.weight ? a : b);
      events.push({ date: new Date(best.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), note: `PR: ${best.exercise} — ${best.weight} lbs × ${best.reps}`, color: '#FF7A00' });
    }
    return events.reverse();
  }, [activities, weightHistory, strengthHistory, weightUnit]);

  // 1RM Epley formula
  const calc1RM = (w: number, r: number) => r === 1 ? w : Math.round(w * (1 + r / 30));
  const estimated1RM = calcWeight && calcReps ? calc1RM(Number(calcWeight), Number(calcReps)) : 0;

  const unlockedCount = achievements.filter(a => a.unlocked).length;
  const completedMissions = weeklyMissions.filter(m => m.completed).length;

  const handleLogStrength = () => {
    if (!sWeight || !sReps) return;
    logStrength(sExercise, Number(sWeight), Number(sReps));
    setSWeight(''); setSReps(''); setShowStrengthModal(false);
  };
  const handleLogBody = () => {
    if (!bValue) return;
    const unit = BODY_LABELS.find(b => b.label === bLabel)?.unit || 'in';
    logBodyMeasurement(bLabel, Number(bValue), unit);
    setBValue(''); setShowBodyModal(false);
  };

  return (
    <main className="max-w-lg mx-auto px-5 pt-6 pb-32 space-y-6">
      {/* Header */}
      <header className="flex items-end justify-between gap-4">
        <div>
          <h1 className="font-headline font-bold text-[28px] tracking-tight">Progress</h1>
        </div>
        {/* XP Bar */}
        <div className="flex items-center gap-3 bg-[var(--color-surface-container)] rounded-xl px-4 py-2.5">
          <div className="w-9 h-9 rounded-full bg-primary/15 flex items-center justify-center">
            <span className="font-headline font-bold text-primary text-sm">{level}</span>
          </div>
          <div className="min-w-[80px]">
            <div className="flex justify-between text-[10px] font-medium mb-1">
              <span className="text-primary">{levelTitle}</span>
              <span className="text-on-surface-variant">{xp} XP</span>
            </div>
            <div className="w-full h-1.5 bg-white/[0.04] rounded-full overflow-hidden">
              <div className="h-full bg-primary rounded-full transition-all duration-700" style={{ width: `${xpProgress}%` }}></div>
            </div>
          </div>
        </div>
      </header>

      {/* Tab Switcher */}
      <div className="flex gap-2 overflow-x-auto [scrollbar-width:none] pb-1">
        {(['overview', 'strength', 'body', 'achievements'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-xl font-semibold text-xs capitalize transition-colors whitespace-nowrap ${
              activeTab === tab
                ? 'bg-primary text-black'
                : 'bg-[var(--color-surface-container)] text-on-surface-variant hover:text-white'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {activeTab === 'overview' && (
        <div className="space-y-8">
          {/* Stats Row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-[var(--color-surface-container)] rounded-2xl p-4 border border-white/5 group hover:border-primary/30 transition-colors flex flex-col justify-center">
              <span className="material-symbols-outlined text-[#FF4D4D] text-2xl mb-1 block" style={{ fontVariationSettings: "'FILL' 1" }}>local_fire_department</span>
              <p className="font-headline font-black text-3xl tracking-tighter">{streak}</p>
              <p className="text-[9px] uppercase tracking-wider text-on-surface-variant font-bold mt-0.5 line-clamp-1">Day Streak</p>
            </div>
            <div className="bg-[var(--color-surface-container)] rounded-2xl p-4 border border-white/5 flex flex-col justify-center">
              <span className="material-symbols-outlined text-primary text-2xl mb-1 block" style={{ fontVariationSettings: "'FILL' 1" }}>fitness_center</span>
              <p className="font-headline font-black text-3xl tracking-tighter">{activities.filter(a => a.type === 'Workout').length}</p>
              <p className="text-[9px] uppercase tracking-wider text-on-surface-variant font-bold mt-0.5 line-clamp-1">Total Workouts</p>
            </div>
            <div className="bg-[var(--color-surface-container)] rounded-2xl p-4 border border-white/5 flex flex-col justify-center">
              <span className="material-symbols-outlined text-secondary text-2xl mb-1 block" style={{ fontVariationSettings: "'FILL' 1" }}>trophy</span>
              <p className="font-headline font-black text-3xl tracking-tighter">{unlockedCount}</p>
              <p className="text-[9px] uppercase tracking-wider text-on-surface-variant font-bold mt-0.5 line-clamp-1">Achievements</p>
            </div>
            <div className="bg-[var(--color-surface-container)] rounded-2xl p-4 border border-white/5 flex flex-col justify-center">
              <span className="material-symbols-outlined text-[#fab0ff] text-2xl mb-1 block" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
              <p className="font-headline font-black text-3xl tracking-tighter">{longestStreak}</p>
              <p className="text-[9px] uppercase tracking-wider text-on-surface-variant font-bold mt-0.5 line-clamp-1">Best Streak</p>
            </div>
          </div>

          {/* Weight Trend Chart */}
          <div className="bg-[var(--color-surface-container)] rounded-[2rem] p-8 border border-white/5 relative overflow-hidden">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h3 className="font-headline font-bold text-xl">Weight Trend</h3>
                {weightChartData && (
                  <p className={`text-[10px] ${weightChartData.isDown ? 'text-secondary' : 'text-[#FF4D4D]'} font-bold uppercase tracking-widest mt-1 flex items-center gap-1`}>
                    <span className="material-symbols-outlined text-[12px]">{weightChartData.isDown ? 'trending_down' : 'trending_up'}</span> {weightChartData.trendText}
                  </p>
                )}
              </div>
              <div className="text-right">
                <span className="font-headline font-black text-3xl tracking-tighter">{displayWeight}</span>
                <span className="text-[10px] text-on-surface-variant font-bold ml-1">{weightUnit.toUpperCase()}</span>
              </div>
            </div>
            {weightChartData ? (
              <>
                <div className="h-40 relative">
                  <svg className="w-full h-full" viewBox="0 0 800 200" preserveAspectRatio="none">
                    <defs>
                      <linearGradient id="wtGrad" x1="0%" x2="0%" y1="0%" y2="100%">
                        <stop offset="0%" stopColor={weightChartData.isDown ? '#6FFB85' : '#FF4D4D'} stopOpacity="0.3" />
                        <stop offset="100%" stopColor={weightChartData.isDown ? '#6FFB85' : '#FF4D4D'} stopOpacity="0" />
                      </linearGradient>
                    </defs>
                    <line stroke="#ffffff" strokeOpacity="0.03" x1="0" x2="800" y1="50" y2="50" />
                    <line stroke="#ffffff" strokeOpacity="0.03" x1="0" x2="800" y1="100" y2="100" />
                    <line stroke="#ffffff" strokeOpacity="0.03" x1="0" x2="800" y1="150" y2="150" />
                    <path d={weightChartData.linePath} fill="transparent" stroke={weightChartData.isDown ? '#6FFB85' : '#FF4D4D'} strokeWidth="3" strokeLinecap="round" />
                    <path d={weightChartData.fillPath} fill="url(#wtGrad)" />
                    <circle cx={weightChartData.lastPoint.x} cy={weightChartData.lastPoint.y} r="6" fill={weightChartData.isDown ? '#6FFB85' : '#FF4D4D'} />
                    <circle cx={weightChartData.lastPoint.x} cy={weightChartData.lastPoint.y} r="12" fill="transparent" stroke={weightChartData.isDown ? '#6FFB85' : '#FF4D4D'} strokeWidth="2" opacity="0.4" />
                  </svg>
                </div>
                <div className="flex justify-between mt-3 text-[9px] font-label font-bold text-white/30 uppercase tracking-[0.2em] px-2">
                  {weightChartData.labels.map((l, i) => <span key={i}>{l}</span>)}
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center py-10 text-on-surface-variant">
                <span className="material-symbols-outlined text-4xl opacity-30 mb-3">monitor_weight</span>
                <p className="text-sm font-medium">Log your weight daily to see trends here</p>
              </div>
            )}
          </div>

          {/* Consistency Heatmap */}
          <div className="bg-[var(--color-surface-container)] rounded-[2rem] p-8 border border-white/5">
            <h3 className="font-headline font-bold text-xl mb-6">Consistency Heatmap</h3>
            <div className="flex gap-1">
              {heatmapData.map((week, wi) => (
                <div key={wi} className="flex-1 flex flex-col gap-1">
                  {week.map((day, di) => (
                    <div
                      key={di}
                      className={`aspect-square rounded-[3px] transition-colors ${
                        day === 0 ? 'bg-white/5' :
                        day === 1 ? 'bg-secondary/30' :
                        day === 2 ? 'bg-secondary/60' : 'bg-secondary shadow-[0_0_6px_rgba(111,251,133,0.3)]'
                      }`}
                    ></div>
                  ))}
                </div>
              ))}
            </div>
            <div className="flex items-center justify-end gap-2 mt-4"><span className="text-[9px] text-on-surface-variant font-bold uppercase">Less</span>{[5, 30, 60, 100].map(o => <div key={o} className="w-3 h-3 rounded-sm" style={{ backgroundColor: `rgba(111,251,133,${o/100})` }}></div>)}<span className="text-[9px] text-on-surface-variant font-bold uppercase">More</span></div>
          </div>

          {/* Weekly Missions */}
          <div className="bg-[var(--color-surface-container)] rounded-[2rem] p-8 border border-white/5">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-headline font-bold text-xl">Weekly Missions</h3>
              <span className="text-[10px] font-bold text-primary uppercase tracking-widest">{completedMissions}/{weeklyMissions.length} Done</span>
            </div>
            <div className="space-y-4">
              {weeklyMissions.map(m => (
                <div key={m.id} className={`flex items-center gap-4 p-4 rounded-2xl border transition-all ${m.completed ? 'bg-secondary/10 border-secondary/30' : 'bg-white/5 border-white/5'}`}>
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${m.completed ? 'bg-secondary/20 text-secondary' : 'bg-primary/10 text-primary'}`}>
                    <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>{m.icon}</span>
                  </div>
                  <div className="flex-1">
                    <p className={`font-headline font-bold text-sm ${m.completed ? 'line-through text-white/50' : ''}`}>{m.title}</p>
                    <p className="text-[10px] text-on-surface-variant mt-0.5">{m.description}</p>
                    <div className="w-full h-1.5 bg-[#252528] rounded-full mt-2 overflow-hidden">
                      <div className={`h-full rounded-full transition-all duration-700 ${m.completed ? 'bg-secondary' : 'bg-primary'}`} style={{ width: `${(m.current / m.target) * 100}%` }}></div>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-bold text-primary">+{m.xpReward} XP</p>
                    <p className="text-[10px] text-on-surface-variant font-bold mt-1">{m.current}/{m.target}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'strength' && (
        <div className="space-y-8">
          {/* Add Strength Entry */}
          <button onClick={() => setShowStrengthModal(true)} className="w-full bg-primary text-black py-4 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 active:scale-95 transition-transform">
            <span className="material-symbols-outlined text-xl">add</span> Log Strength Entry
          </button>

          {/* Strength Lifts from real data */}
          <div className="bg-[var(--color-surface-container)] rounded-[2rem] p-8 border border-white/5">
            <h3 className="font-headline font-bold text-xl mb-6">Strength Progress</h3>
            {strengthLifts.length === 0 ? (
              <div className="flex flex-col items-center py-10 text-on-surface-variant">
                <span className="material-symbols-outlined text-4xl opacity-30 mb-3">fitness_center</span>
                <p className="text-sm font-medium">Log your first lift to track progress</p>
              </div>
            ) : (
              <div className="space-y-4">
                {strengthLifts.map((lift, i) => (
                  <div key={i} className="flex items-center gap-4 p-4 bg-white/5 rounded-2xl group hover:bg-white/10 transition-colors">
                    <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
                      <span className="material-symbols-outlined text-xl">fitness_center</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-headline font-bold truncate">{lift.name}</p>
                      <div className="w-full h-1.5 bg-[#252528] rounded-full overflow-hidden mt-2">
                        <div className="h-full bg-gradient-to-r from-primary to-[#00c6ff] rounded-full" style={{ width: `${Math.min(100, (lift.current / 400) * 100)}%` }}></div>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-headline font-black text-xl">{lift.current}<span className="text-xs text-on-surface-variant ml-1">lbs</span></p>
                      <p className="text-secondary text-[10px] font-bold">{lift.change}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Interactive 1RM Calculator */}
          <div className="bg-gradient-to-br from-primary/10 to-transparent rounded-[2rem] p-8 border border-primary/20">
            <div className="flex items-center gap-3 mb-4">
              <span className="material-symbols-outlined text-primary text-3xl">calculate</span>
              <h3 className="font-headline font-bold text-xl">1RM Calculator</h3>
            </div>
            <p className="text-on-surface-variant text-sm mb-4">Enter your working weight and reps to estimate your one-rep max (Epley formula).</p>
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div>
                <label className="text-[10px] uppercase tracking-widest text-on-surface-variant font-bold block mb-1">Weight (lbs)</label>
                <input type="number" value={calcWeight} onChange={e => setCalcWeight(e.target.value)} placeholder="185" className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-white font-bold text-lg text-center focus:border-primary outline-none" />
              </div>
              <div>
                <label className="text-[10px] uppercase tracking-widest text-on-surface-variant font-bold block mb-1">Reps</label>
                <input type="number" value={calcReps} onChange={e => setCalcReps(e.target.value)} placeholder="5" className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-white font-bold text-lg text-center focus:border-primary outline-none" />
              </div>
            </div>
            {estimated1RM > 0 && (
              <div className="bg-black/30 rounded-xl p-6 text-center border border-primary/30">
                <p className="text-[10px] uppercase tracking-widest text-on-surface-variant font-bold">Estimated 1RM</p>
                <p className="font-headline font-black text-5xl text-primary mt-1">{estimated1RM}</p>
                <p className="text-[10px] text-on-surface-variant font-bold mt-1">LBS</p>
              </div>
            )}
          </div>

          {/* Calorie Balance — last 7 days */}
          <div className="bg-[var(--color-surface-container)] rounded-[2rem] p-8 border border-white/5">
            <h3 className="font-headline font-bold text-xl mb-6">7-Day Calorie Balance</h3>
            <div className="flex items-end gap-2 h-40">
              {calorieBalance.map((d, i) => {
                const maxVal = Math.max(...calorieBalance.map(x => Math.max(x.burned, x.consumed)), 1);
                return (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1">
                    <div className="w-full flex gap-0.5 items-end" style={{ height: '120px' }}>
                      <div className="flex-1 bg-[#FF4D4D]/60 rounded-t-sm transition-all" style={{ height: `${(d.burned / maxVal) * 100}%`, minHeight: d.burned > 0 ? '4px' : '0' }}></div>
                      <div className="flex-1 bg-primary/60 rounded-t-sm transition-all" style={{ height: `${(d.consumed / maxVal) * 100}%`, minHeight: d.consumed > 0 ? '4px' : '0' }}></div>
                    </div>
                    <span className="text-[9px] text-on-surface-variant font-bold uppercase">{d.label}</span>
                  </div>
                );
              })}
            </div>
            <div className="flex justify-center gap-6 mt-4">
              <span className="flex items-center gap-1.5 text-[10px] font-bold text-on-surface-variant"><span className="w-2.5 h-2.5 rounded-sm bg-[#FF4D4D]/60"></span>Burned</span>
              <span className="flex items-center gap-1.5 text-[10px] font-bold text-on-surface-variant"><span className="w-2.5 h-2.5 rounded-sm bg-primary/60"></span>Consumed</span>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'body' && (
        <div className="space-y-8">
          {/* Add Body Measurement */}
          <button onClick={() => setShowBodyModal(true)} className="w-full bg-secondary text-black py-4 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 active:scale-95 transition-transform">
            <span className="material-symbols-outlined text-xl">straighten</span> Log Body Measurement
          </button>

          {/* Body Measurements from real data */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {bodyMeasurements.map((m, i) => (
              <div key={i} className="bg-[var(--color-surface-container)] rounded-2xl p-5 border border-white/5 group hover:border-primary/30 transition-colors">
                <p className="text-[10px] uppercase tracking-widest text-on-surface-variant font-bold mb-2">{m.label}</p>
                <div className="flex items-end justify-between">
                  <p className="font-headline font-black text-2xl tracking-tighter">{m.value}</p>
                  {m.trend !== 'neutral' && (
                    <span className={`material-symbols-outlined text-sm ${m.trend === 'up' ? 'text-secondary' : 'text-[#FF4D4D]'}`}>
                      {m.trend === 'up' ? 'trending_up' : 'trending_down'}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Body Recomposition Predictor */}
          <div className="bg-gradient-to-br from-secondary/10 to-transparent rounded-[2rem] p-8 border border-secondary/20">
            <div className="flex items-center gap-3 mb-4">
              <span className="material-symbols-outlined text-secondary text-3xl" style={{ fontVariationSettings: "'FILL' 1" }}>query_stats</span>
              <h3 className="font-headline font-bold text-xl">Body Recomposition Predictor</h3>
            </div>
            <p className="text-on-surface-variant text-sm mb-6">Based on your current weight trajectory and consistency.</p>
            <div className="grid grid-cols-2 gap-6">
              <div className="bg-black/30 rounded-xl p-6 border border-white/5 text-center">
                <p className="text-[10px] uppercase tracking-widest text-on-surface-variant font-bold mb-2">Projected Weight (4 wk)</p>
                <p className="font-headline font-black text-4xl text-secondary tracking-tighter">
                  {weightHistory.length >= 2
                    ? (() => {
                        const first = weightHistory[0].weight;
                        const last = weightHistory[weightHistory.length - 1].weight;
                        const days = Math.max(1, (Date.parse(weightHistory[weightHistory.length - 1].date) - Date.parse(weightHistory[0].date)) / 86400000);
                        return toDisplay(last + ((last - first) / days) * 28).toFixed(1);
                      })()
                    : toDisplay(profile.weight).toFixed(1)
                  }
                </p>
                <p className="text-[9px] text-on-surface-variant font-bold mt-1">{weightUnit.toUpperCase()}</p>
              </div>
              <div className="bg-black/30 rounded-xl p-6 border border-white/5 text-center">
                <p className="text-[10px] uppercase tracking-widest text-on-surface-variant font-bold mb-2">Current Streak</p>
                <p className="font-headline font-black text-4xl text-secondary tracking-tighter">{streak}</p>
                <p className="text-[9px] text-on-surface-variant font-bold mt-1">DAYS</p>
              </div>
            </div>
          </div>

          {/* Transformation Timeline */}
          <div className="bg-[var(--color-surface-container)] rounded-[2rem] p-8 border border-white/5">
            <h3 className="font-headline font-bold text-xl mb-6">Transformation Timeline</h3>
            {timelineEvents.length === 0 ? (
              <div className="flex flex-col items-center py-10 text-on-surface-variant">
                <span className="material-symbols-outlined text-4xl opacity-30 mb-3">timeline</span>
                <p className="text-sm font-medium">Milestones will appear as you train</p>
              </div>
            ) : (
              <div className="space-y-6 relative">
                <div className="absolute left-6 top-0 bottom-0 w-[2px] bg-white/10"></div>
                {timelineEvents.map((event, i) => (
                  <div key={i} className="flex gap-4 items-start relative pl-12">
                    <div className="absolute left-4 w-4 h-4 rounded-full border-2" style={{ borderColor: event.color, backgroundColor: `${event.color}33` }}></div>
                    <div>
                      <p className="text-[10px] uppercase tracking-widest font-bold" style={{ color: event.color }}>{event.date}</p>
                      <p className="text-white text-sm font-medium mt-1">{event.note}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'achievements' && (
        <div className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {achievements.map(a => (
              <div key={a.id} className={`flex items-center gap-4 p-5 rounded-2xl border transition-all ${
                a.unlocked
                  ? 'bg-[var(--color-surface-container)] border-primary/30 shadow-[0_0_20px_rgba(255,122,0,0.1)]'
                  : 'bg-black/20 border-white/5 opacity-50 grayscale'
              }`}>
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${
                  a.unlocked ? 'bg-primary/20 text-primary' : 'bg-white/5 text-on-surface-variant'
                }`}>
                  <span className="material-symbols-outlined text-2xl" style={a.unlocked ? { fontVariationSettings: "'FILL' 1" } : {}}>{a.icon}</span>
                </div>
                <div className="flex-1">
                  <p className="font-headline font-bold text-sm">{a.title}</p>
                  <p className="text-[10px] text-on-surface-variant mt-0.5">{a.description}</p>
                  {a.unlocked && <p className="text-[9px] text-primary font-bold mt-1">+{a.xpReward} XP Earned</p>}
                </div>
                {a.unlocked && <span className="material-symbols-outlined text-secondary text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ═══ Strength Modal ═══ */}
      {showStrengthModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-end justify-center" onClick={() => setShowStrengthModal(false)}>
          <div className="bg-[var(--color-surface-container)] w-full max-w-lg rounded-t-[2rem] p-8 space-y-5 animate-[slideUp_0.3s_ease-out]" onClick={e => e.stopPropagation()}>
            <h3 className="font-headline font-bold text-xl text-center">Log Strength Entry</h3>
            <div>
              <label className="text-[10px] uppercase tracking-widest text-on-surface-variant font-bold block mb-1">Exercise</label>
              <select value={sExercise} onChange={e => setSExercise(e.target.value)} className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-white font-bold outline-none focus:border-primary">
                {EXERCISES.map(ex => <option key={ex} value={ex}>{ex}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] uppercase tracking-widest text-on-surface-variant font-bold block mb-1">Weight (lbs)</label>
                <input type="number" value={sWeight} onChange={e => setSWeight(e.target.value)} placeholder="135" className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-white font-bold text-center outline-none focus:border-primary" />
              </div>
              <div>
                <label className="text-[10px] uppercase tracking-widest text-on-surface-variant font-bold block mb-1">Reps</label>
                <input type="number" value={sReps} onChange={e => setSReps(e.target.value)} placeholder="8" className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-white font-bold text-center outline-none focus:border-primary" />
              </div>
            </div>
            <button onClick={handleLogStrength} className="w-full bg-primary text-black py-4 rounded-2xl font-bold text-sm active:scale-95 transition-transform">Save Entry</button>
          </div>
        </div>
      )}

      {/* ═══ Body Measurement Modal ═══ */}
      {showBodyModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-end justify-center" onClick={() => setShowBodyModal(false)}>
          <div className="bg-[var(--color-surface-container)] w-full max-w-lg rounded-t-[2rem] p-8 space-y-5 animate-[slideUp_0.3s_ease-out]" onClick={e => e.stopPropagation()}>
            <h3 className="font-headline font-bold text-xl text-center">Log Body Measurement</h3>
            <div>
              <label className="text-[10px] uppercase tracking-widest text-on-surface-variant font-bold block mb-1">Measurement</label>
              <select value={bLabel} onChange={e => setBLabel(e.target.value)} className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-white font-bold outline-none focus:border-primary">
                {BODY_LABELS.map(b => <option key={b.label} value={b.label}>{b.label} ({b.unit === '%' ? '%' : 'inches'})</option>)}
              </select>
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-widest text-on-surface-variant font-bold block mb-1">Value</label>
              <input type="number" step="0.1" value={bValue} onChange={e => setBValue(e.target.value)} placeholder="42" className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-white font-bold text-center outline-none focus:border-primary" />
            </div>
            <button onClick={handleLogBody} className="w-full bg-secondary text-black py-4 rounded-2xl font-bold text-sm active:scale-95 transition-transform">Save Measurement</button>
          </div>
        </div>
      )}
    </main>
  );
}
