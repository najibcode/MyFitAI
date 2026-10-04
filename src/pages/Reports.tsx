
import { useFitnessContext } from '../context/FitnessContext';
import { useToast } from '../context/ToastContext';
import { useMemo } from 'react';

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

  const maxVal = Math.max(...weeklyData.map(d => d.value), 1); // min 1 to avoid division by 0
  const weeklyAvg = Math.round(weeklyData.reduce((s, d) => s + d.value, 0) / 7);

  // Helper to get display unit per activity type
  const getActivityUnit = (type: string) => {
    switch (type) {
      case 'Workout': return 'min';
      case 'Steps': return 'steps';
      case 'Water': return 'L';
      case 'Sleep': return 'hrs';
      default: return 'units';
    }
  };

  return (
    <main className="max-w-7xl mx-auto px-6 pt-8 pb-32 space-y-10">
      <header className="mb-12">
        <p className="text-secondary font-label font-bold tracking-widest uppercase text-[10px] mb-2">Performance Analytics</p>
        <h1 className="font-headline font-extrabold text-4xl md:text-5xl tracking-tighter leading-none">SYSTEM REPORTS</h1>
      </header>

      <section className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="bg-[var(--color-surface-container)] rounded-[2rem] p-8 space-y-6">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-primary text-3xl">query_stats</span>
            <h2 className="font-headline text-2xl font-bold">Weekly Overview</h2>
          </div>
          <p className="text-on-surface-variant text-sm border-l-2 border-primary pl-4">
            {weeklyAvg > 0
              ? `You burned an average of ${weeklyAvg} kcal/day this week. Your compliance to the ${profile.goal} protocol is tracking.`
              : `No activity logged this week. Start a workout to see your stats here.`}
          </p>
          
          <div className="h-48 flex items-end justify-between gap-2 pt-8">
            {weeklyData.map((d, i) => (
              <div key={i} className={`flex-1 rounded-t-lg relative group transition-colors ${d.value > 0 ? 'bg-primary/20 hover:bg-primary/40' : 'bg-white/[0.04]'}`} style={{ height: `${Math.max(4, (d.value / maxVal) * 100)}%` }}>
                <span className="absolute -top-6 left-1/2 -translate-x-1/2 text-[10px] font-bold opacity-0 group-hover:opacity-100 transition-opacity">{d.value || '—'}</span>
              </div>
            ))}
          </div>
          <div className="flex justify-between mt-2 text-[10px] font-bold text-on-surface-variant uppercase tracking-widest px-1">
            {weeklyData.map((d, i) => <span key={i}>{d.day}</span>)}
          </div>
        </div>

        <div className="bg-[var(--color-surface-container)] rounded-[2rem] p-8 space-y-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-3 mb-6">
              <span className="material-symbols-outlined text-secondary text-3xl">psychology</span>
              <h2 className="font-headline text-2xl font-bold">AI Insights</h2>
            </div>
            <ul className="space-y-4">
              {(() => {
                const insights: { icon: string; color: string; title: string; text: string }[] = [];
                // Dynamic sleep insight
                const avgSleep = dailyStats.sleep;
                if (avgSleep > 0 && avgSleep < 7) {
                  insights.push({ icon: 'warning', color: '#FF716C', title: 'Sleep Debt Detected', text: `Your sleep is at ${avgSleep}h today. Sub-optimal for recovery — aim for 7-9 hours.` });
                } else if (avgSleep >= 7) {
                  insights.push({ icon: 'check_circle', color: '#6FFB85', title: 'Sleep On Track', text: `${avgSleep}h logged today. Great recovery window for muscle repair.` });
                }
                // Dynamic calorie insight
                const calPct = Math.round((dailyStats.calories / profile.dailyCalorieGoal) * 100);
                if (calPct > 0) {
                  insights.push({ icon: calPct >= 80 ? 'trending_up' : 'info', color: calPct >= 80 ? '#6FFB85' : '#FF7A00', title: 'Calorie Compliance', text: `You've burned ${calPct}% of your daily calorie goal (${dailyStats.calories} / ${profile.dailyCalorieGoal} kcal).` });
                }
                // Activity volume
                if (activities.length > 0) {
                  const workouts = activities.filter(a => a.type === 'Workout').length;
                  insights.push({ icon: 'fitness_center', color: '#fab0ff', title: 'Activity Volume', text: `${workouts} workout${workouts !== 1 ? 's' : ''} logged across ${activities.length} total activities.` });
                }
                if (insights.length === 0) {
                  insights.push({ icon: 'lightbulb', color: '#FF7A00', title: 'No Data Yet', text: 'Start logging workouts, meals, and sleep to unlock AI-powered insights.' });
                }
                return insights.map((ins, idx) => (
                  <li key={idx} className="flex items-start gap-4 p-4 bg-white/5 rounded-xl border border-white/5">
                    <span className="material-symbols-outlined mt-0.5" style={{ color: ins.color }}>{ins.icon}</span>
                    <div>
                      <p className="font-headline font-bold text-sm">{ins.title}</p>
                      <p className="text-xs text-on-surface-variant mt-1">{ins.text}</p>
                    </div>
                  </li>
                ));
              })()}
            </ul>
          </div>
          
          <button onClick={() => showToast('PDF Report Exported to Downloads', 'success')} className="w-full mt-4 py-4 rounded-xl border border-primary/30 text-primary font-headline font-bold uppercase tracking-widest text-sm hover:bg-primary/10 transition-colors">
            Export Full PDF Report
          </button>
        </div>
      </section>
      
      {/* Activity Log History Viewer */}
      <section className="bg-[var(--color-surface-container)] rounded-[2rem] p-8">
        <h2 className="font-headline text-xl font-bold mb-6">Recent Activity Log</h2>
        {activities.length === 0 ? (
          <p className="text-on-surface-variant text-sm py-4">No activities logged yet.</p>
        ) : (
          <div className="space-y-3">
            {activities.slice(0, 5).map(act => (
              <div key={act.id} className="flex justify-between items-center bg-white/5 p-4 rounded-xl">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-[var(--color-surface)] flex items-center justify-center text-primary">
                    <span className="material-symbols-outlined text-sm">
                      {act.type === 'Workout' ? 'fitness_center' : act.type === 'Steps' ? 'steps' : act.type === 'Water' ? 'water_drop' : 'bedtime'}
                    </span>
                  </div>
                  <div>
                    <p className="font-headline font-bold">{act.type}</p>
                    <p className="text-[10px] text-on-surface-variant uppercase tracking-widest">{new Date(act.timestamp).toLocaleString()}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-headline font-bold text-lg">{act.value} <span className="text-xs text-on-surface-variant">{getActivityUnit(act.type)}</span></p>
                  {act.caloriesBurned && <p className="text-[10px] text-primary font-bold">{act.caloriesBurned} KCAL</p>}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
