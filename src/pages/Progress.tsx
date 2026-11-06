// ─────────────────────────────────────────────────────────────
// MyFitAI — Performance Progress & Body Composition Master
// Athletic Personal Operating System UI/UX
// ─────────────────────────────────────────────────────────────

import { useFitnessContext } from '../context/FitnessContext';
import { useGamification } from '../context/GamificationContext';
import { usePreferences } from '../context/PreferencesContext';
import { useState, useMemo, useCallback } from 'react';
import MuscleHeatmap from '../components/MuscleHeatmap';
import ShareableMuscleCardModal from '../components/share/ShareableMuscleCardModal';
import { triggerHaptic } from '../utils/audioFeedback';
import {
  Flame,
  Dumbbell,
  Trophy,
  Zap,
  TrendingDown,
  TrendingUp,
  Scale,
  Share2,
  Plus,
  Calculator,
  Ruler,
  Activity,
  CheckCircle2,
  ArrowRight,
  X,
  Award,
  Calendar,
} from 'lucide-react';

const EXERCISES = ['Bench Press', 'Squat', 'Deadlift', 'OHP', 'Barbell Row', 'Lat Pulldown', 'Leg Press', 'Dumbbell Curl'];
const BODY_LABELS = [
  { label: 'Chest', unit: 'in' },
  { label: 'Waist', unit: 'in' },
  { label: 'Arms', unit: 'in' },
  { label: 'Thighs', unit: 'in' },
  { label: 'Body Fat', unit: '%' },
  { label: 'Shoulders', unit: 'in' },
];

export default function Progress() {
  const {
    profile,
    activities,
    heatmapData,
    weightHistory,
    mealLogs,
    strengthHistory,
    logStrength,
    bodyMeasurementHistory,
    logBodyMeasurement,
  } = useFitnessContext();
  const { xp, level, levelTitle, xpProgress, achievements, weeklyMissions, streak, longestStreak } = useGamification();
  const { weightUnit } = usePreferences();
  const [activeTab, setActiveTab] = useState<'overview' | 'muscles' | 'strength' | 'body' | 'achievements'>('overview');

  // Modals
  const [showStrengthModal, setShowStrengthModal] = useState(false);
  const [sExercise, setSExercise] = useState(EXERCISES[0]);
  const [sWeight, setSWeight] = useState('');
  const [sReps, setSReps] = useState('');
  const [showBodyModal, setShowBodyModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [bLabel, setBLabel] = useState(BODY_LABELS[0].label);
  const [bValue, setBValue] = useState('');

  // 1RM Calculator
  const [calcWeight, setCalcWeight] = useState('');
  const [calcReps, setCalcReps] = useState('');

  const toDisplay = useCallback((lbs: number) => (weightUnit === 'kg' ? Math.round((lbs / 2.20462) * 10) / 10 : lbs), [weightUnit]);
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
      const p = points[i - 1];
      const c = points[i];
      path += ` C${p.x + (c.x - p.x) * 0.4},${p.y} ${p.x + (c.x - p.x) * 0.6},${c.y} ${c.x},${c.y}`;
    }
    const last = points[points.length - 1];
    const first = weightHistory[0].weight;
    const lastW = weightHistory[weightHistory.length - 1].weight;
    const diff = lastW - first;
    const weeks = Math.max(
      1,
      Math.round((Date.parse(weightHistory[weightHistory.length - 1].date) - Date.parse(weightHistory[0].date)) / (7 * 86400000))
    );
    return {
      linePath: path,
      fillPath: path + ' V200 H0 Z',
      lastPoint: last,
      labels: recent.map(e => new Date(e.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })),
      trendText: `${diff > 0 ? '+' : ''}${toDisplay(diff).toFixed(1)} ${weightUnit} in ${weeks} weeks`,
      isDown: diff < 0,
    };
  }, [weightHistory, weightUnit, toDisplay]);

  // Derive strength lifts from real data
  const strengthLifts = useMemo(() => {
    const exerciseMap = new Map<string, { current: number; previous: number; reps: number }>();
    const sorted = [...strengthHistory].sort((a, b) => b.date.localeCompare(a.date));
    sorted.forEach(e => {
      if (!exerciseMap.has(e.exercise)) {
        exerciseMap.set(e.exercise, { current: e.weight, previous: e.weight, reps: e.reps });
      } else {
        const existing = exerciseMap.get(e.exercise)!;
        existing.previous = e.weight;
      }
    });
    return Array.from(exerciseMap.entries()).map(([name, data]) => {
      const change = data.previous > 0 ? (((data.current - data.previous) / data.previous) * 100).toFixed(1) : '0';
      return {
        name,
        current: data.current,
        previous: data.previous,
        reps: data.reps,
        change: Number(change) >= 0 ? `+${change}%` : `${change}%`,
      };
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
      const d = new Date();
      d.setDate(d.getDate() - i);
      const ds = d.toDateString();
      const burned = activities
        .filter(a => a.type === 'Workout' && new Date(a.timestamp).toDateString() === ds)
        .reduce((s, a) => s + (a.caloriesBurned || 0), 0);
      const consumed = mealLogs
        .filter(m => new Date(m.timestamp).toDateString() === ds)
        .reduce((s, m) => s + m.calories, 0);
      days.push({ label: d.toLocaleDateString('en-US', { weekday: 'short' }), burned, consumed });
    }
    return days;
  }, [activities, mealLogs]);

  // Auto-generated timeline from real data
  const timelineEvents = useMemo(() => {
    const events: { date: string; note: string; color: string }[] = [];
    const workouts = activities
      .filter(a => a.type === 'Workout')
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    if (workouts.length > 0)
      events.push({
        date: new Date(workouts[0].timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        note: 'First workout logged in MyFitAI',
        color: '#30D158',
      });
    if (workouts.length >= 10)
      events.push({
        date: new Date(workouts[9].timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        note: '10th workout milestone reached',
        color: '#FF8A00',
      });
    if (weightHistory.length >= 2) {
      const firstW = weightHistory[0];
      const lastW = weightHistory[weightHistory.length - 1];
      const diff = lastW.weight - firstW.weight;
      if (Math.abs(diff) >= 1)
        events.push({
          date: new Date(lastW.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          note: `Weight ${diff < 0 ? 'down' : 'up'} ${Math.abs(toDisplay(diff)).toFixed(1)} ${weightUnit}`,
          color: diff < 0 ? '#30D158' : '#FF453A',
        });
    }
    if (strengthHistory.length > 0) {
      const best = strengthHistory.reduce((a, b) => (a.weight > b.weight ? a : b));
      events.push({
        date: new Date(best.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        note: `PR: ${best.exercise} — ${best.weight} lbs × ${best.reps}`,
        color: '#4F9CF9',
      });
    }
    return events.reverse();
  }, [activities, weightHistory, strengthHistory, weightUnit, toDisplay]);

  // 1RM Epley formula
  const calc1RM = (w: number, r: number) => (r === 1 ? w : Math.round(w * (1 + r / 30)));
  const estimated1RM = calcWeight && calcReps ? calc1RM(Number(calcWeight), Number(calcReps)) : 0;

  const unlockedCount = achievements.filter(a => a.unlocked).length;
  const completedMissions = weeklyMissions.filter(m => m.completed).length;

  const handleLogStrength = () => {
    if (!sWeight || !sReps) return;
    logStrength(sExercise, Number(sWeight), Number(sReps));
    setSWeight('');
    setSReps('');
    setShowStrengthModal(false);
  };

  const handleLogBody = () => {
    if (!bValue) return;
    const unit = BODY_LABELS.find(b => b.label === bLabel)?.unit || 'in';
    logBodyMeasurement(bLabel, Number(bValue), unit);
    setBValue('');
    setShowBodyModal(false);
  };

  const renderGamificationIcon = (icon: string, className = 'w-5 h-5') => {
    switch (icon) {
      case 'fitness_center':
        return <Dumbbell className={className} />;
      case 'local_fire_department':
        return <Flame className={className} />;
      case 'military_tech':
      case 'trophy':
        return <Trophy className={className} />;
      case 'star':
        return <Zap className={className} />;
      default:
        return <Award className={className} />;
    }
  };

  return (
    <main className="w-full max-w-4xl mx-auto px-3.5 sm:px-4 pt-4 pb-28 space-y-5 sm:space-y-6 animate-fade-in min-w-0 box-border">
      {/* ── Header ── */}
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#A1A1A6] block">
            PERFORMANCE METRICS & BODY COMPOSITION
          </span>
          <h1 className="font-headline font-black text-2xl sm:text-3xl text-[#F5F5F5] tracking-tight">
            Your Progress
          </h1>
          <p className="text-xs text-[#A1A1A6] mt-0.5 font-mono">
            {activities.filter(a => a.type === 'Workout').length} WORKOUTS COMPLETED · {streak} DAY STREAK
          </p>
        </div>

        {/* Level & XP Progress Card */}
        <div className="flex items-center gap-3 bg-[#151517] rounded-2xl px-4 py-3 border border-[#2A2A2D] shadow-sm">
          <div className="w-10 h-10 rounded-xl bg-[#1E1E20] border border-[#2A2A2D] flex items-center justify-center text-[#30D158]">
            <Trophy className="w-5 h-5" />
          </div>
          <div className="min-w-[100px]">
            <div className="flex justify-between text-xs font-bold mb-1">
              <span className="text-[#F5F5F5]">Lvl {level} · {levelTitle}</span>
              <span className="text-[#30D158] font-mono">{xp} XP</span>
            </div>
            <div className="w-full h-1.5 bg-[#1E1E20] rounded-full overflow-hidden border border-[#2A2A2D]">
              <div
                className="h-full bg-[#30D158] rounded-full transition-all duration-700"
                style={{ width: `${xpProgress}%` }}
              />
            </div>
          </div>
        </div>
      </header>

      {/* ── Tab Switcher ── */}
      <div className="flex gap-1 p-1 bg-[#151517] rounded-xl border border-[#2A2A2D] overflow-x-auto max-w-full custom-scrollbar [scrollbar-width:none]">
        {(
          [
            { id: 'overview', label: 'Overview', icon: Activity },
            { id: 'muscles', label: 'Muscle Map', icon: Dumbbell },
            { id: 'strength', label: 'Strength', icon: TrendingUp },
            { id: 'body', label: 'Body Metrics', icon: Ruler },
            { id: 'achievements', label: 'Badges', icon: Award },
          ] as const
        ).map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`shrink-0 sm:flex-1 py-2 px-3 rounded-lg text-xs font-headline font-bold transition-all whitespace-nowrap flex items-center justify-center gap-1.5 ${
                isActive
                  ? 'bg-[#1E1E20] text-[#30D158] border border-[#30D158]/30 shadow-sm'
                  : 'text-[#A1A1A6] hover:text-[#F5F5F5]'
              }`}
            >
              <Icon className="w-3.5 h-3.5 shrink-0" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* ═══════════════════════════════════════════════════════
          TAB 1: OVERVIEW
      ═══════════════════════════════════════════════════════ */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Stats Row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-[#151517] rounded-2xl p-4 border border-[#2A2A2D] flex flex-col justify-between h-24">
              <div className="flex items-center justify-between text-[#FF8A00]">
                <Flame className="w-5 h-5" />
                <span className="text-[10px] uppercase tracking-wider text-[#A1A1A6] font-bold">Streak</span>
              </div>
              <div>
                <p className="font-headline font-black text-2xl text-[#F5F5F5] font-mono">{streak}</p>
                <p className="text-[10px] text-[#A1A1A6] font-medium">Days active</p>
              </div>
            </div>

            <div className="bg-[#151517] rounded-2xl p-4 border border-[#2A2A2D] flex flex-col justify-between h-24">
              <div className="flex items-center justify-between text-[#30D158]">
                <Dumbbell className="w-5 h-5" />
                <span className="text-[10px] uppercase tracking-wider text-[#A1A1A6] font-bold">Sessions</span>
              </div>
              <div>
                <p className="font-headline font-black text-2xl text-[#F5F5F5] font-mono">
                  {activities.filter(a => a.type === 'Workout').length}
                </p>
                <p className="text-[10px] text-[#A1A1A6] font-medium">Workouts logged</p>
              </div>
            </div>

            <div className="bg-[#151517] rounded-2xl p-4 border border-[#2A2A2D] flex flex-col justify-between h-24">
              <div className="flex items-center justify-between text-[#F5C542]">
                <Trophy className="w-5 h-5" />
                <span className="text-[10px] uppercase tracking-wider text-[#A1A1A6] font-bold">Badges</span>
              </div>
              <div>
                <p className="font-headline font-black text-2xl text-[#F5F5F5] font-mono">{unlockedCount}</p>
                <p className="text-[10px] text-[#A1A1A6] font-medium">Achievements</p>
              </div>
            </div>

            <div className="bg-[#151517] rounded-2xl p-4 border border-[#2A2A2D] flex flex-col justify-between h-24">
              <div className="flex items-center justify-between text-[#4F9CF9]">
                <Zap className="w-5 h-5" />
                <span className="text-[10px] uppercase tracking-wider text-[#A1A1A6] font-bold">Record</span>
              </div>
              <div>
                <p className="font-headline font-black text-2xl text-[#F5F5F5] font-mono">{longestStreak}</p>
                <p className="text-[10px] text-[#A1A1A6] font-medium">Best streak days</p>
              </div>
            </div>
          </div>

          {/* Weight Trend Chart */}
          <div className="bg-[#151517] rounded-3xl p-6 sm:p-7 border border-[#2A2A2D] space-y-4">
            <div className="flex justify-between items-start">
              <div>
                <span className="text-[10px] uppercase tracking-wider text-[#A1A1A6] font-bold block mb-1">
                  BODY WEIGHT TRAJECTORY
                </span>
                <h3 className="font-headline font-bold text-xl text-[#F5F5F5]">Weight Trend</h3>
                {weightChartData && (
                  <p
                    className={`text-xs ${
                      weightChartData.isDown ? 'text-[#30D158]' : 'text-[#FF453A]'
                    } font-bold mt-1 flex items-center gap-1 font-mono`}
                  >
                    {weightChartData.isDown ? (
                      <TrendingDown className="w-4 h-4" />
                    ) : (
                      <TrendingUp className="w-4 h-4" />
                    )}
                    {weightChartData.trendText}
                  </p>
                )}
              </div>
              <div className="text-right">
                <span className="font-headline font-black text-3xl sm:text-4xl text-[#F5F5F5] font-mono tabular-nums">
                  {displayWeight}
                </span>
                <span className="text-xs text-[#A1A1A6] font-bold ml-1 uppercase">{weightUnit}</span>
              </div>
            </div>

            {weightChartData ? (
              <>
                <div className="h-44 relative pt-2">
                  <svg className="w-full h-full" viewBox="0 0 800 200" preserveAspectRatio="none">
                    <defs>
                      <linearGradient id="wtGrad" x1="0%" x2="0%" y1="0%" y2="100%">
                        <stop
                          offset="0%"
                          stopColor={weightChartData.isDown ? '#30D158' : '#FF453A'}
                          stopOpacity="0.25"
                        />
                        <stop
                          offset="100%"
                          stopColor={weightChartData.isDown ? '#30D158' : '#FF453A'}
                          stopOpacity="0"
                        />
                      </linearGradient>
                    </defs>
                    <line stroke="#ffffff" strokeOpacity="0.05" x1="0" x2="800" y1="50" y2="50" />
                    <line stroke="#ffffff" strokeOpacity="0.05" x1="0" x2="800" y1="100" y2="100" />
                    <line stroke="#ffffff" strokeOpacity="0.05" x1="0" x2="800" y1="150" y2="150" />
                    <path
                      d={weightChartData.linePath}
                      fill="transparent"
                      stroke={weightChartData.isDown ? '#30D158' : '#FF453A'}
                      strokeWidth="3"
                      strokeLinecap="round"
                    />
                    <path d={weightChartData.fillPath} fill="url(#wtGrad)" />
                    <circle
                      cx={weightChartData.lastPoint.x}
                      cy={weightChartData.lastPoint.y}
                      r="5"
                      fill={weightChartData.isDown ? '#30D158' : '#FF453A'}
                    />
                    <circle
                      cx={weightChartData.lastPoint.x}
                      cy={weightChartData.lastPoint.y}
                      r="10"
                      fill="transparent"
                      stroke={weightChartData.isDown ? '#30D158' : '#FF453A'}
                      strokeWidth="2"
                      opacity="0.4"
                    />
                  </svg>
                </div>
                <div className="flex justify-between mt-2 text-[9px] font-mono text-[#6B6B70] uppercase px-1">
                  {weightChartData.labels.map((l, i) => (
                    <span key={i}>{l}</span>
                  ))}
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-[#A1A1A6] space-y-2">
                <Scale className="w-8 h-8 text-[#6B6B70]" />
                <p className="text-sm font-semibold text-[#F5F5F5]">Log daily weight to visualize trend</p>
                <p className="text-xs text-[#A1A1A6]">Record 2 or more weigh-ins to generate your trajectory chart.</p>
              </div>
            )}
          </div>

          {/* Consistency Heatmap */}
          <div className="bg-[#151517] rounded-3xl p-6 sm:p-7 border border-[#2A2A2D] space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <span className="text-[10px] uppercase tracking-wider text-[#A1A1A6] font-bold block mb-0.5">
                  TRAINING ADHERENCE
                </span>
                <h3 className="font-headline font-bold text-xl text-[#F5F5F5]">Consistency Heatmap</h3>
              </div>
              <div className="flex items-center gap-1.5 text-[10px] text-[#A1A1A6] font-mono">
                <span>Less</span>
                <div className="w-2.5 h-2.5 rounded-sm bg-[#1E1E20] border border-[#2A2A2D]" />
                <div className="w-2.5 h-2.5 rounded-sm bg-[#30D158]/30" />
                <div className="w-2.5 h-2.5 rounded-sm bg-[#30D158]/60" />
                <div className="w-2.5 h-2.5 rounded-sm bg-[#30D158]" />
                <span>More</span>
              </div>
            </div>

            <div className="flex gap-1.5 overflow-x-auto pb-1">
              {heatmapData.map((week, wi) => (
                <div key={wi} className="flex-1 flex flex-col gap-1.5 min-w-[12px]">
                  {week.map((day, di) => (
                    <div
                      key={di}
                      className={`aspect-square rounded-[3px] transition-colors ${
                        day === 0
                          ? 'bg-[#1E1E20] border border-[#2A2A2D]'
                          : day === 1
                          ? 'bg-[#30D158]/30'
                          : day === 2
                          ? 'bg-[#30D158]/60'
                          : 'bg-[#30D158] shadow-[0_0_8px_rgba(48,209,88,0.4)]'
                      }`}
                    />
                  ))}
                </div>
              ))}
            </div>
          </div>

          {/* Anatomical Muscle Training Map Overview Card */}
          <div className="bg-[#151517] rounded-3xl p-6 sm:p-7 border border-[#2A2A2D] space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#2A2A2D]">
              <div>
                <span className="text-[10px] uppercase tracking-wider text-[#30D158] font-bold block mb-0.5">
                  ANATOMICAL STIMULUS
                </span>
                <h3 className="font-headline font-bold text-xl text-[#F5F5F5]">
                  Muscle Training Map
                </h3>
                <p className="text-xs text-[#A1A1A6] mt-0.5">
                  Biomechanical volume, recovery status & landmark analysis across 30+ muscles.
                </p>
              </div>
              <button
                onClick={() => setActiveTab('muscles')}
                className="text-xs text-[#30D158] font-headline font-bold hover:underline flex items-center gap-1 self-start sm:self-auto cursor-pointer"
              >
                Deep Analysis <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <MuscleHeatmap
              interactive={true}
              showControls={true}
              showLegend={true}
              showTimeframeSelector={true}
              showSymmetryCard={false}
            />
          </div>

          {/* Weekly Missions */}
          <div className="bg-[#151517] rounded-3xl p-6 sm:p-7 border border-[#2A2A2D] space-y-4">
            <div className="flex justify-between items-center pb-2 border-b border-[#2A2A2D]">
              <div>
                <span className="text-[10px] uppercase tracking-wider text-[#A1A1A6] font-bold block mb-0.5">
                  WEEKLY TARGETS
                </span>
                <h3 className="font-headline font-bold text-xl text-[#F5F5F5]">Active Missions</h3>
              </div>
              <span className="text-xs font-bold text-[#30D158] font-mono">
                {completedMissions}/{weeklyMissions.length} COMPLETED
              </span>
            </div>

            <div className="space-y-3">
              {weeklyMissions.map(m => (
                <div
                  key={m.id}
                  className={`flex items-center gap-4 p-4 rounded-2xl border transition-all ${
                    m.completed
                      ? 'bg-[#1E1E20]/60 border-[#30D158]/30'
                      : 'bg-[#1E1E20] border-[#2A2A2D]'
                  }`}
                >
                  <div
                    className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${
                      m.completed ? 'bg-[#30D158]/20 text-[#30D158]' : 'bg-[#151517] text-[#A1A1A6]'
                    }`}
                  >
                    {renderGamificationIcon(m.icon, 'w-5 h-5')}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`font-headline font-bold text-sm ${m.completed ? 'line-through text-[#6B6B70]' : 'text-[#F5F5F5]'}`}>
                      {m.title}
                    </p>
                    <p className="text-[11px] text-[#A1A1A6] mt-0.5">{m.description}</p>
                    <div className="w-full h-1.5 bg-[#151517] rounded-full mt-2 overflow-hidden border border-[#2A2A2D]">
                      <div
                        className={`h-full rounded-full transition-all duration-700 ${
                          m.completed ? 'bg-[#30D158]' : 'bg-[#FF8A00]'
                        }`}
                        style={{ width: `${Math.min(100, (m.current / m.target) * 100)}%` }}
                      />
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs font-bold text-[#30D158] font-mono">+{m.xpReward} XP</p>
                    <p className="text-[11px] text-[#A1A1A6] font-mono mt-0.5">
                      {m.current}/{m.target}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════
          TAB 2: MUSCLE TRAINING MAP (Deep Anatomical View)
      ═══════════════════════════════════════════════════════ */}
      {activeTab === 'muscles' && (
        <div className="space-y-6">
          <div className="bg-[#151517] rounded-3xl p-6 sm:p-8 border border-[#2A2A2D] space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#2A2A2D]">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-widest text-[#30D158] font-bold block mb-1">
                  30+ ANATOMICAL REGIONS · EVIDENCE-BASED
                </span>
                <h2 className="font-headline font-black text-2xl text-[#F5F5F5]">
                  Advanced Muscle Training Map
                </h2>
                <p className="text-xs text-[#A1A1A6] mt-1 leading-relaxed max-w-2xl">
                  Interactive biomechanical mapping of primary movers, synergists, hypertrophy volume landmarks (MEV/MAV/MRV), and physiological recovery decay curves.
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  triggerHaptic('medium');
                  setShowShareModal(true);
                }}
                className="self-start sm:self-center px-4 py-2.5 rounded-xl bg-[#30D158] text-black font-headline font-bold text-xs uppercase tracking-wider flex items-center gap-2 active:scale-95 transition-all shadow-md cursor-pointer"
              >
                <Share2 className="w-4 h-4" />
                Share Progress Card
              </button>
            </div>

            <MuscleHeatmap
              interactive={true}
              showControls={true}
              showLegend={true}
              showTimeframeSelector={true}
              showSymmetryCard={true}
            />
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════
          TAB 3: STRENGTH LIFTS & 1RM CALCULATOR
      ═══════════════════════════════════════════════════════ */}
      {activeTab === 'strength' && (
        <div className="space-y-6">
          {/* Add Strength Entry CTA */}
          <button
            onClick={() => setShowStrengthModal(true)}
            className="w-full bg-[#FF8A00] text-black py-4 rounded-2xl font-headline font-black text-sm flex items-center justify-center gap-2 active:scale-98 transition-transform shadow-md"
          >
            <Plus className="w-4 h-4" /> Log Strength Entry
          </button>

          {/* Strength Lifts from real data */}
          <div className="bg-[#151517] rounded-3xl p-6 sm:p-7 border border-[#2A2A2D] space-y-4">
            <h3 className="font-headline font-bold text-xl text-[#F5F5F5]">Strength Progress</h3>
            {strengthLifts.length === 0 ? (
              <div className="flex flex-col items-center py-12 text-[#A1A1A6] space-y-2">
                <Dumbbell className="w-8 h-8 text-[#6B6B70]" />
                <p className="text-sm font-semibold text-[#F5F5F5]">No strength records logged yet</p>
                <p className="text-xs text-[#A1A1A6]">Tap the button above to log your current working weights.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {strengthLifts.map((lift, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-4 p-4 bg-[#1E1E20] rounded-2xl border border-[#2A2A2D] transition-colors"
                  >
                    <div className="w-11 h-11 rounded-xl bg-[#151517] border border-[#2A2A2D] flex items-center justify-center text-[#FF8A00] shrink-0">
                      <Dumbbell className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-headline font-bold text-sm text-[#F5F5F5] truncate">{lift.name}</p>
                      <div className="w-full h-1.5 bg-[#151517] rounded-full overflow-hidden mt-2 border border-[#2A2A2D]">
                        <div
                          className="h-full bg-[#FF8A00] rounded-full"
                          style={{ width: `${Math.min(100, (lift.current / 400) * 100)}%` }}
                        />
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-headline font-black text-xl text-[#F5F5F5] font-mono">
                        {lift.current} <span className="text-xs text-[#A1A1A6]">lbs</span>
                      </p>
                      <p className="text-[#30D158] text-[10px] font-bold font-mono">{lift.change}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Interactive 1RM Calculator */}
          <div className="bg-[#151517] rounded-3xl p-6 sm:p-7 border border-[#2A2A2D] space-y-4">
            <div className="flex items-center gap-3">
              <Calculator className="w-6 h-6 text-[#FF8A00]" />
              <h3 className="font-headline font-bold text-xl text-[#F5F5F5]">1RM Calculator (Epley)</h3>
            </div>
            <p className="text-[#A1A1A6] text-xs">
              Enter working set weight and performed reps to estimate maximal one-rep strength.
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] uppercase tracking-wider text-[#A1A1A6] font-bold block mb-1">
                  Weight (lbs)
                </label>
                <input
                  type="number"
                  value={calcWeight}
                  onChange={e => setCalcWeight(e.target.value)}
                  placeholder="185"
                  className="w-full bg-[#1E1E20] border border-[#2A2A2D] rounded-xl px-4 py-3 text-[#F5F5F5] font-bold text-lg text-center focus:border-[#FF8A00] outline-none font-mono"
                />
              </div>
              <div>
                <label className="text-[10px] uppercase tracking-wider text-[#A1A1A6] font-bold block mb-1">
                  Reps Performed
                </label>
                <input
                  type="number"
                  value={calcReps}
                  onChange={e => setCalcReps(e.target.value)}
                  placeholder="5"
                  className="w-full bg-[#1E1E20] border border-[#2A2A2D] rounded-xl px-4 py-3 text-[#F5F5F5] font-bold text-lg text-center focus:border-[#FF8A00] outline-none font-mono"
                />
              </div>
            </div>
            {estimated1RM > 0 && (
              <div className="bg-[#1E1E20] rounded-2xl p-5 text-center border border-[#FF8A00]/30 space-y-1">
                <p className="text-[10px] uppercase tracking-widest text-[#A1A1A6] font-bold">
                  Calculated Estimated 1RM
                </p>
                <p className="font-headline font-black text-4xl sm:text-5xl text-[#FF8A00] font-mono tabular-nums">
                  {estimated1RM} <span className="text-base text-[#A1A1A6]">LBS</span>
                </p>
              </div>
            )}
          </div>

          {/* Calorie Balance — last 7 days */}
          <div className="bg-[#151517] rounded-3xl p-6 sm:p-7 border border-[#2A2A2D] space-y-4">
            <h3 className="font-headline font-bold text-xl text-[#F5F5F5]">7-Day Calorie Balance</h3>
            <div className="flex items-end gap-2 h-40 pt-4">
              {calorieBalance.map((d, i) => {
                const maxVal = Math.max(...calorieBalance.map(x => Math.max(x.burned, x.consumed)), 1);
                return (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1">
                    <div className="w-full flex gap-1 items-end justify-center" style={{ height: '120px' }}>
                      <div
                        className="w-1/2 bg-[#FF453A]/70 rounded-t-sm transition-all"
                        style={{
                          height: `${(d.burned / maxVal) * 100}%`,
                          minHeight: d.burned > 0 ? '4px' : '0',
                        }}
                        title={`Burned: ${d.burned} kcal`}
                      />
                      <div
                        className="w-1/2 bg-[#30D158]/70 rounded-t-sm transition-all"
                        style={{
                          height: `${(d.consumed / maxVal) * 100}%`,
                          minHeight: d.consumed > 0 ? '4px' : '0',
                        }}
                        title={`Consumed: ${d.consumed} kcal`}
                      />
                    </div>
                    <span className="text-[9px] text-[#A1A1A6] font-bold uppercase">{d.label}</span>
                  </div>
                );
              })}
            </div>
            <div className="flex justify-center gap-6 pt-2 border-t border-[#2A2A2D]">
              <span className="flex items-center gap-1.5 text-[11px] font-bold text-[#A1A1A6]">
                <span className="w-2.5 h-2.5 rounded-sm bg-[#FF453A]/70" />
                Burned
              </span>
              <span className="flex items-center gap-1.5 text-[11px] font-bold text-[#A1A1A6]">
                <span className="w-2.5 h-2.5 rounded-sm bg-[#30D158]/70" />
                Consumed
              </span>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════
          TAB 4: BODY METRICS & COMPOSITION
      ═══════════════════════════════════════════════════════ */}
      {activeTab === 'body' && (
        <div className="space-y-6">
          {/* Add Body Measurement CTA */}
          <button
            onClick={() => setShowBodyModal(true)}
            className="w-full bg-[#30D158] text-black py-4 rounded-2xl font-headline font-black text-sm flex items-center justify-center gap-2 active:scale-98 transition-transform shadow-md"
          >
            <Ruler className="w-4 h-4" /> Log Body Measurement
          </button>

          {/* Body Measurements from real data */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {bodyMeasurements.map((m, i) => (
              <div key={i} className="bg-[#151517] rounded-2xl p-4 border border-[#2A2A2D] space-y-1">
                <p className="text-[10px] uppercase tracking-wider text-[#A1A1A6] font-bold">{m.label}</p>
                <div className="flex items-end justify-between">
                  <p className="font-headline font-black text-2xl text-[#F5F5F5] font-mono">{m.value}</p>
                  {m.trend !== 'neutral' && (
                    <span className={m.trend === 'up' ? 'text-[#30D158]' : 'text-[#FF453A]'}>
                      {m.trend === 'up' ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Body Recomposition Predictor */}
          <div className="bg-[#151517] rounded-3xl p-6 sm:p-7 border border-[#2A2A2D] space-y-4">
            <div>
              <span className="text-[10px] uppercase tracking-wider text-[#30D158] font-bold block mb-0.5">
                ALGORITHMIC PROJECTION
              </span>
              <h3 className="font-headline font-bold text-xl text-[#F5F5F5]">
                Body Recomposition Predictor
              </h3>
              <p className="text-[#A1A1A6] text-xs mt-0.5">
                Calculated based on current caloric deficit/surplus, training cadence, and consistency.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-[#1E1E20] rounded-2xl p-5 border border-[#2A2A2D] text-center space-y-1">
                <p className="text-[10px] uppercase tracking-wider text-[#A1A1A6] font-bold">
                  Projected Weight (4 Wk)
                </p>
                <p className="font-headline font-black text-3xl sm:text-4xl text-[#30D158] font-mono tabular-nums">
                  {weightHistory.length >= 2
                    ? (() => {
                        const first = weightHistory[0].weight;
                        const last = weightHistory[weightHistory.length - 1].weight;
                        const days = Math.max(
                          1,
                          (Date.parse(weightHistory[weightHistory.length - 1].date) - Date.parse(weightHistory[0].date)) / 86400000
                        );
                        return toDisplay(last + ((last - first) / days) * 28).toFixed(1);
                      })()
                    : toDisplay(profile.weight).toFixed(1)}
                </p>
                <p className="text-[10px] text-[#A1A1A6] font-bold uppercase">{weightUnit}</p>
              </div>

              <div className="bg-[#1E1E20] rounded-2xl p-5 border border-[#2A2A2D] text-center space-y-1">
                <p className="text-[10px] uppercase tracking-wider text-[#A1A1A6] font-bold">
                  Current Streak
                </p>
                <p className="font-headline font-black text-3xl sm:text-4xl text-[#30D158] font-mono tabular-nums">
                  {streak}
                </p>
                <p className="text-[10px] text-[#A1A1A6] font-bold uppercase">Days Consistent</p>
              </div>
            </div>
          </div>

          {/* Transformation Timeline */}
          <div className="bg-[#151517] rounded-3xl p-6 sm:p-7 border border-[#2A2A2D] space-y-4">
            <h3 className="font-headline font-bold text-xl text-[#F5F5F5]">Transformation Timeline</h3>
            {timelineEvents.length === 0 ? (
              <div className="flex flex-col items-center py-10 text-[#A1A1A6] space-y-2">
                <Calendar className="w-8 h-8 text-[#6B6B70]" />
                <p className="text-sm font-semibold text-[#F5F5F5]">Milestones will appear as you train</p>
              </div>
            ) : (
              <div className="space-y-4 relative pl-6 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-[1px] before:bg-[#2A2A2D]">
                {timelineEvents.map((event, i) => (
                  <div key={i} className="relative pl-4 space-y-0.5">
                    <div
                      className="absolute -left-[19px] top-1.5 w-3 h-3 rounded-full border-2 border-[#151517]"
                      style={{ backgroundColor: event.color }}
                    />
                    <p className="text-[10px] uppercase font-bold font-mono" style={{ color: event.color }}>
                      {event.date}
                    </p>
                    <p className="text-[#F5F5F5] text-xs font-medium">{event.note}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════
          TAB 5: ACHIEVEMENTS & BADGES
      ═══════════════════════════════════════════════════════ */}
      {activeTab === 'achievements' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {achievements.map(a => (
              <div
                key={a.id}
                className={`flex items-center gap-4 p-5 rounded-2xl border transition-all ${
                  a.unlocked
                    ? 'bg-[#151517] border-[#30D158]/30 shadow-sm'
                    : 'bg-[#151517]/40 border-[#2A2A2D] opacity-40'
                }`}
              >
                <div
                  className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
                    a.unlocked ? 'bg-[#30D158]/15 text-[#30D158]' : 'bg-[#1E1E20] text-[#6B6B70]'
                  }`}
                >
                  {renderGamificationIcon(a.icon, 'w-6 h-6')}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-headline font-bold text-sm text-[#F5F5F5]">{a.title}</p>
                  <p className="text-[11px] text-[#A1A1A6] mt-0.5 leading-snug">{a.description}</p>
                  {a.unlocked && (
                    <p className="text-[10px] text-[#30D158] font-mono font-bold mt-1">
                      +{a.xpReward} XP UNLOCKED
                    </p>
                  )}
                </div>
                {a.unlocked && <CheckCircle2 className="w-5 h-5 text-[#30D158] shrink-0" />}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ═══ Strength Modal ═══ */}
      {showStrengthModal && (
        <div
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setShowStrengthModal(false)}
        >
          <div
            className="bg-[#151517] w-full max-w-sm rounded-3xl p-6 space-y-4 border border-[#2A2A2D]"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex justify-between items-center">
              <h3 className="font-headline font-bold text-lg text-[#F5F5F5]">Log Strength Lift</h3>
              <button
                type="button"
                onClick={() => setShowStrengthModal(false)}
                className="w-8 h-8 rounded-full bg-[#1E1E20] text-[#A1A1A6] hover:text-[#F5F5F5] flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-[10px] uppercase tracking-wider text-[#A1A1A6] font-bold block mb-1">
                  Exercise
                </label>
                <select
                  value={sExercise}
                  onChange={e => setSExercise(e.target.value)}
                  className="w-full bg-[#1E1E20] border border-[#2A2A2D] rounded-xl px-3 py-2.5 text-[#F5F5F5] font-semibold outline-none"
                >
                  {EXERCISES.map(ex => (
                    <option key={ex} value={ex}>
                      {ex}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] uppercase tracking-wider text-[#A1A1A6] font-bold block mb-1">
                    Weight (lbs)
                  </label>
                  <input
                    type="number"
                    value={sWeight}
                    onChange={e => setSWeight(e.target.value)}
                    placeholder="135"
                    className="w-full bg-[#1E1E20] border border-[#2A2A2D] rounded-xl px-3 py-2.5 text-[#F5F5F5] font-bold text-center outline-none font-mono"
                  />
                </div>
                <div>
                  <label className="text-[10px] uppercase tracking-wider text-[#A1A1A6] font-bold block mb-1">
                    Reps
                  </label>
                  <input
                    type="number"
                    value={sReps}
                    onChange={e => setSReps(e.target.value)}
                    placeholder="8"
                    className="w-full bg-[#1E1E20] border border-[#2A2A2D] rounded-xl px-3 py-2.5 text-[#F5F5F5] font-bold text-center outline-none font-mono"
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowStrengthModal(false)}
                className="flex-1 py-2.5 rounded-xl bg-[#1E1E20] text-[#F5F5F5] font-semibold text-xs border border-[#2A2A2D]"
              >
                Cancel
              </button>
              <button
                onClick={handleLogStrength}
                className="flex-1 py-2.5 rounded-xl bg-[#FF8A00] text-black font-headline font-bold text-xs shadow-md"
              >
                Save Entry
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ Body Measurement Modal ═══ */}
      {showBodyModal && (
        <div
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setShowBodyModal(false)}
        >
          <div
            className="bg-[#151517] w-full max-w-sm rounded-3xl p-6 space-y-4 border border-[#2A2A2D]"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex justify-between items-center">
              <h3 className="font-headline font-bold text-lg text-[#F5F5F5]">Log Body Metric</h3>
              <button
                type="button"
                onClick={() => setShowBodyModal(false)}
                className="w-8 h-8 rounded-full bg-[#1E1E20] text-[#A1A1A6] hover:text-[#F5F5F5] flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-[10px] uppercase tracking-wider text-[#A1A1A6] font-bold block mb-1">
                  Measurement Site
                </label>
                <select
                  value={bLabel}
                  onChange={e => setBLabel(e.target.value)}
                  className="w-full bg-[#1E1E20] border border-[#2A2A2D] rounded-xl px-3 py-2.5 text-[#F5F5F5] font-semibold outline-none"
                >
                  {BODY_LABELS.map(b => (
                    <option key={b.label} value={b.label}>
                      {b.label} ({b.unit === '%' ? '%' : 'inches'})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-[10px] uppercase tracking-wider text-[#A1A1A6] font-bold block mb-1">
                  Value
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={bValue}
                  onChange={e => setBValue(e.target.value)}
                  placeholder="34.5"
                  className="w-full bg-[#1E1E20] border border-[#2A2A2D] rounded-xl px-3 py-2.5 text-[#F5F5F5] font-bold text-center outline-none font-mono"
                />
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowBodyModal(false)}
                className="flex-1 py-2.5 rounded-xl bg-[#1E1E20] text-[#F5F5F5] font-semibold text-xs border border-[#2A2A2D]"
              >
                Cancel
              </button>
              <button
                onClick={handleLogBody}
                className="flex-1 py-2.5 rounded-xl bg-[#30D158] text-black font-headline font-bold text-xs shadow-md"
              >
                Save Metric
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Shareable Muscle Card Modal ── */}
      <ShareableMuscleCardModal
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
      />
    </main>
  );
}
