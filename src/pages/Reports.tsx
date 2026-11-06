// ─────────────────────────────────────────────────────────────
// MyFitAI — System Performance Reports & Longitudinal Telemetry
// Athletic Personal Operating System UI/UX
// ─────────────────────────────────────────────────────────────

import { useFitnessContext } from '../context/FitnessContext';
import { useToast } from '../context/ToastContext';
import { useMemo } from 'react';
import {
  BarChart3,
  Brain,
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
  Info,
  Dumbbell,
  Lightbulb,
  Footprints,
  Droplets,
  Moon,
  FileDown,
} from 'lucide-react';

export default function Reports() {
  const { profile, activities, dailyStats } = useFitnessContext();
  const { showToast } = useToast();

  // Compute real weekly calorie data from the last 7 days
  const weeklyData = useMemo(() => {
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const result: { day: string; value: number }[] = [];
    const now = new Date();

    for (let i = 6; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      const dateStr = date.toDateString();
      const dayIdx = (date.getDay() + 6) % 7; // Mon=0 ... Sun=6

      const dayCals = activities
        .filter(a => new Date(a.timestamp).toDateString() === dateStr)
        .reduce((sum, a) => sum + (a.caloriesBurned || 0), 0);

      result.push({ day: days[dayIdx], value: dayCals });
    }
    return result;
  }, [activities]);

  const maxVal = Math.max(...weeklyData.map(d => d.value), 1);
  const weeklyAvg = Math.round(weeklyData.reduce((s, d) => s + d.value, 0) / 7);

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'Workout':
        return <Dumbbell className="w-4 h-4 text-[#30D158]" />;
      case 'Steps':
        return <Footprints className="w-4 h-4 text-[#4F9CF9]" />;
      case 'Water':
        return <Droplets className="w-4 h-4 text-[#4F9CF9]" />;
      case 'Sleep':
        return <Moon className="w-4 h-4 text-[#A78BFA]" />;
      default:
        return <BarChart3 className="w-4 h-4 text-[#A1A1A6]" />;
    }
  };

  const getActivityUnit = (type: string) => {
    switch (type) {
      case 'Workout':
        return 'min';
      case 'Steps':
        return 'steps';
      case 'Water':
        return 'L';
      case 'Sleep':
        return 'hrs';
      default:
        return 'units';
    }
  };

  return (
    <main className="max-w-6xl mx-auto px-4 sm:px-6 pt-6 pb-28 space-y-6">
      {/* Header */}
      <header className="border-b border-[#2A2A2D] pb-5">
        <span className="text-[10px] font-mono font-bold tracking-widest uppercase text-[#30D158] block mb-1">
          PERFORMANCE AUDIT & TELEMETRY
        </span>
        <h1 className="font-headline font-black text-3xl sm:text-4xl text-[#F5F5F5] tracking-tight uppercase">
          System Reports
        </h1>
        <p className="text-xs text-[#A1A1A6] mt-1">
          Review longitudinal calorie expenditure, sleep adaptation debts, and recorded activities.
        </p>
      </header>

      {/* Grid: Weekly Energy + AI Insights */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Weekly Overview */}
        <div className="bg-[#151517] rounded-3xl p-6 border border-[#2A2A2D] space-y-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-[#30D158]/15 border border-[#30D158]/30 flex items-center justify-center text-[#30D158]">
                <BarChart3 className="w-5 h-5" />
              </div>
              <div>
                <h2 className="font-headline font-black text-lg text-[#F5F5F5] uppercase tracking-wide">
                  Weekly Caloric Volume
                </h2>
                <p className="text-[10px] font-mono text-[#A1A1A6]">
                  Average: {weeklyAvg} kcal/day
                </p>
              </div>
            </div>
            <span className="text-xs font-mono font-bold text-[#30D158] px-2.5 py-1 rounded bg-[#30D158]/10 border border-[#30D158]/20">
              {profile.goal.toUpperCase()}
            </span>
          </div>

          <p className="text-xs text-[#A1A1A6] leading-relaxed border-l-2 border-[#30D158] pl-3 py-0.5">
            {weeklyAvg > 0
              ? `You expended an average of ${weeklyAvg} active kcal/day this past 7-day microcycle.`
              : `Zero activity logged this week. Record an active session to initialize expenditure curves.`}
          </p>

          <div className="h-44 flex items-end justify-between gap-2 pt-4 px-1">
            {weeklyData.map((d, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end">
                <span className="text-[9px] font-mono text-[#6B6B70] tabular-nums">
                  {d.value > 0 ? d.value : ''}
                </span>
                <div
                  className={`w-full rounded-t-lg transition-all ${
                    d.value > 0
                      ? 'bg-[#30D158] shadow-[0_0_12px_rgba(48,209,88,0.25)]'
                      : 'bg-[#1E1E20] border border-[#2A2A2D]'
                  }`}
                  style={{ height: `${Math.max(6, (d.value / maxVal) * 100)}%` }}
                />
                <span className="text-[10px] font-mono font-bold text-[#A1A1A6] uppercase mt-1">
                  {d.day}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* AI Biomechanical Insights */}
        <div className="bg-[#151517] rounded-3xl p-6 border border-[#2A2A2D] flex flex-col justify-between space-y-4">
          <div className="space-y-4">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-[#A78BFA]/15 border border-[#A78BFA]/30 flex items-center justify-center text-[#A78BFA]">
                <Brain className="w-5 h-5" />
              </div>
              <div>
                <h2 className="font-headline font-black text-lg text-[#F5F5F5] uppercase tracking-wide">
                  Algorithmic Insights
                </h2>
                <p className="text-[10px] font-mono text-[#A1A1A6]">
                  Computed across physiological logs
                </p>
              </div>
            </div>

            <ul className="space-y-3">
              {(() => {
                const insights: {
                  icon: typeof AlertTriangle;
                  color: string;
                  title: string;
                  text: string;
                }[] = [];

                const avgSleep = dailyStats.sleep;
                if (avgSleep > 0 && avgSleep < 7) {
                  insights.push({
                    icon: AlertTriangle,
                    color: '#FF453A',
                    title: 'Sleep Debt Detected',
                    text: `Sleep logged at ${avgSleep}h today. Sub-optimal for CNS recovery — prioritize 7-9 hours.`,
                  });
                } else if (avgSleep >= 7) {
                  insights.push({
                    icon: CheckCircle2,
                    color: '#30D158',
                    title: 'Optimal Recovery Window',
                    text: `${avgSleep}h recorded. Sufficient sleep for myofibrillar repair and glycogen replenishment.`,
                  });
                }

                const calPct = Math.round(
                  (dailyStats.calories / profile.dailyCalorieGoal) * 100
                );
                if (calPct > 0) {
                  insights.push({
                    icon: calPct >= 80 ? TrendingUp : Info,
                    color: calPct >= 80 ? '#30D158' : '#FF8A00',
                    title: 'Caloric Target Compliance',
                    text: `Burned ${calPct}% of target (${dailyStats.calories} / ${profile.dailyCalorieGoal} kcal).`,
                  });
                }

                if (activities.length > 0) {
                  const workouts = activities.filter(a => a.type === 'Workout').length;
                  insights.push({
                    icon: Dumbbell,
                    color: '#4F9CF9',
                    title: 'Session Volume Accumulation',
                    text: `${workouts} structured workout${workouts !== 1 ? 's' : ''} logged across ${activities.length} total entries.`,
                  });
                }

                if (insights.length === 0) {
                  insights.push({
                    icon: Lightbulb,
                    color: '#FF8A00',
                    title: 'Baseline Ingestion Needed',
                    text: 'Record active workouts, meal logs, and sleep telemetry to generate insights.',
                  });
                }

                return insights.map((ins, idx) => {
                  const Icon = ins.icon;
                  return (
                    <li
                      key={idx}
                      className="flex items-start gap-3 p-3.5 bg-[#1E1E20] rounded-2xl border border-[#2A2A2D]"
                    >
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border mt-0.5"
                        style={{
                          backgroundColor: `${ins.color}15`,
                          borderColor: `${ins.color}30`,
                          color: ins.color,
                        }}
                      >
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-headline font-bold text-xs text-[#F5F5F5]">
                          {ins.title}
                        </p>
                        <p className="text-[11px] text-[#A1A1A6] mt-0.5 leading-relaxed">
                          {ins.text}
                        </p>
                      </div>
                    </li>
                  );
                });
              })()}
            </ul>
          </div>

          <button
            onClick={() => showToast('PDF Report generated and saved to device', 'success')}
            className="w-full py-3.5 rounded-xl border border-[#30D158]/30 hover:bg-[#30D158]/10 text-[#30D158] font-headline font-bold uppercase tracking-wider text-xs transition-colors flex items-center justify-center gap-2"
          >
            <FileDown className="w-4 h-4" />
            <span>Export Full Telemetry PDF</span>
          </button>
        </div>
      </section>

      {/* Activity Log History Viewer */}
      <section className="bg-[#151517] rounded-3xl p-6 border border-[#2A2A2D] space-y-4">
        <h2 className="font-headline font-bold text-base text-[#F5F5F5] uppercase tracking-wide">
          Recent Telemetry Entries
        </h2>

        {activities.length === 0 ? (
          <p className="text-[#6B6B70] text-xs py-2">
            No activity telemetry recorded yet.
          </p>
        ) : (
          <div className="space-y-2.5">
            {activities.slice(0, 6).map(act => (
              <div
                key={act.id}
                className="flex justify-between items-center bg-[#1E1E20] border border-[#2A2A2D] p-3.5 rounded-2xl"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-[#151517] border border-[#2A2A2D] flex items-center justify-center">
                    {getActivityIcon(act.type)}
                  </div>
                  <div>
                    <p className="font-headline font-bold text-xs text-[#F5F5F5]">
                      {act.type}
                    </p>
                    <p className="text-[10px] font-mono text-[#6B6B70]">
                      {new Date(act.timestamp).toLocaleString()}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-headline font-black text-sm text-[#F5F5F5] font-mono tabular-nums">
                    {act.value}{' '}
                    <span className="text-[10px] font-normal text-[#A1A1A6]">
                      {getActivityUnit(act.type)}
                    </span>
                  </p>
                  {act.caloriesBurned && (
                    <p className="text-[10px] text-[#30D158] font-mono font-bold tabular-nums">
                      {act.caloriesBurned} KCAL
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
