import { useFitnessContext } from '../context/FitnessContext';
import { useGamification } from '../context/GamificationContext';
import { usePreferences } from '../context/PreferencesContext';
import { Link, useNavigate } from 'react-router-dom';
import { useMemo } from 'react';

export default function Dashboard() {
  const { profile, dailyStats, weightHistory } = useFitnessContext();
  const { streak } = useGamification();
  const { weightUnit } = usePreferences();
  const navigate = useNavigate();
  
  const movePrc = Math.min(100, Math.round((dailyStats.calories / profile.dailyCalorieGoal) * 100)) || 0;
  const exercisePrc = Math.min(100, Math.round((dailyStats.duration / 60) * 100)) || 0;
  const waterPrc = Math.min(100, Math.round((dailyStats.water / profile.dailyWaterGoal) * 100)) || 0;
  const overallPrc = Math.round((movePrc + exercisePrc + waterPrc) / 3);
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';

  // Recovery score based on sleep (out of 8h target) 
  const recoveryScore = dailyStats.sleep > 0 
    ? Math.min(100, Math.round((dailyStats.sleep / 8) * 100)) 
    : 0;

  // Weight display
  const displayWeight = weightUnit === 'kg' ? Math.round(profile.weight / 2.20462 * 10) / 10 : profile.weight;

  // Generate weight chart SVG from real data
  const weightChartPath = useMemo(() => {
    if (weightHistory.length < 2) return null;
    const recent = weightHistory.slice(-7); // Last 7 entries
    if (recent.length < 2) return null;
    
    const weights = recent.map(e => e.weight);
    const minW = Math.min(...weights) - 2;
    const maxW = Math.max(...weights) + 2;
    const range = maxW - minW || 1;
    
    const points = weights.map((w, i) => {
      const x = (i / (weights.length - 1)) * 800;
      const y = 200 - ((w - minW) / range) * 180; // 10px padding top/bottom
      return { x, y };
    });
    
    // Build smooth curve
    let path = `M${points[0].x},${points[0].y}`;
    for (let i = 1; i < points.length; i++) {
      const prev = points[i - 1];
      const curr = points[i];
      const cpx1 = prev.x + (curr.x - prev.x) * 0.4;
      const cpx2 = prev.x + (curr.x - prev.x) * 0.6;
      path += ` C${cpx1},${prev.y} ${cpx2},${curr.y} ${curr.x},${curr.y}`;
    }
    
    const lastPoint = points[points.length - 1];
    const fillPath = path + ` V200 H0 Z`;
    
    return { linePath: path, fillPath, lastPoint, labels: recent.map(e => {
      const d = new Date(e.date);
      return d.toLocaleDateString('en-US', { weekday: 'short' }).slice(0, 3);
    })};
  }, [weightHistory]);

  // Weight trend text
  const weightTrendText = useMemo(() => {
    if (weightHistory.length < 2) return 'Start logging to see trends';
    const first = weightHistory[0].weight;
    const last = weightHistory[weightHistory.length - 1].weight;
    const diff = last - first;
    const weeks = Math.max(1, Math.round((Date.parse(weightHistory[weightHistory.length - 1].date) - Date.parse(weightHistory[0].date)) / (7 * 24 * 60 * 60 * 1000)));
    if (Math.abs(diff) < 0.1) return 'Weight stable';
    return `${diff > 0 ? '+' : ''}${(weightUnit === 'kg' ? diff / 2.20462 : diff).toFixed(1)} ${weightUnit} over ${weeks}w`;
  }, [weightHistory, weightUnit]);

  const isTrendingDown = weightHistory.length >= 2 && weightHistory[weightHistory.length - 1].weight < weightHistory[0].weight;

  return (
    <>
      <main className="max-w-lg mx-auto px-5 pt-6 space-y-6 pb-4">
        
        {/* Greeting — simple, human, confident */}
        <section>
          <p className="text-on-surface-variant text-sm font-medium">{greeting},</p>
          <h1 className="font-headline font-extrabold text-[28px] tracking-tight mt-0.5">{profile.name}</h1>
        </section>

        {/* Activity Rings — hero card, single focus */}
        <section 
          onClick={() => navigate('/reports')} 
          className="bg-[var(--color-surface-container)] rounded-2xl p-6 cursor-pointer hover:bg-[var(--color-surface-container-high)] transition-colors"
        >
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-headline font-bold text-base">Activity</h2>
            <span className="text-on-surface-variant text-xs font-medium">Today</span>
          </div>
          
          <div className="flex items-center gap-6">
            {/* Rings */}
            <div className="relative w-32 h-32 flex-shrink-0">
              <svg className="w-full h-full transform -rotate-90">
                {/* Water Ring (outer) */}
                <circle cx="64" cy="64" fill="transparent" r="56" stroke="var(--color-surface-container-highest)" strokeWidth="8" />
                <circle cx="64" cy="64" fill="transparent" r="56" stroke="#60A5FA" strokeDasharray="352" strokeDashoffset={`${Math.max(0, 352 - (352 * waterPrc) / 100)}`} strokeLinecap="round" strokeWidth="8" opacity="0.8" />
                {/* Exercise Ring (middle) */}
                <circle cx="64" cy="64" fill="transparent" r="44" stroke="var(--color-surface-container-highest)" strokeWidth="8" />
                <circle cx="64" cy="64" fill="transparent" r="44" stroke="#6FFB85" strokeDasharray="276" strokeDashoffset={`${Math.max(0, 276 - (276 * exercisePrc) / 100)}`} strokeLinecap="round" strokeWidth="8" />
                {/* Move Ring (inner) */}
                <circle cx="64" cy="64" fill="transparent" r="32" stroke="var(--color-surface-container-highest)" strokeWidth="8" />
                <circle cx="64" cy="64" fill="transparent" r="32" stroke="var(--color-primary)" strokeDasharray="201" strokeDashoffset={`${Math.max(0, 201 - (201 * movePrc) / 100)}`} strokeLinecap="round" strokeWidth="8" />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="font-headline font-black text-2xl leading-none">{overallPrc}<span className="text-sm font-semibold text-on-surface-variant">%</span></span>
              </div>
            </div>
            
            {/* Ring Labels */}
            <div className="flex-1 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-primary" />
                  <span className="text-xs font-medium text-on-surface-variant">Move</span>
                </div>
                <span className="text-sm font-bold">{dailyStats.calories} <span className="text-on-surface-variant font-normal text-xs">kcal</span></span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-[#6FFB85]" />
                  <span className="text-xs font-medium text-on-surface-variant">Exercise</span>
                </div>
                <span className="text-sm font-bold">{dailyStats.duration} <span className="text-on-surface-variant font-normal text-xs">min</span></span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-[#60A5FA]" />
                  <span className="text-xs font-medium text-on-surface-variant">Water</span>
                </div>
                <span className="text-sm font-bold">{dailyStats.water.toFixed(1)} <span className="text-on-surface-variant font-normal text-xs">L</span></span>
              </div>
            </div>
          </div>
        </section>

        {/* Quick Stats — clean row */}
        <section className="grid grid-cols-3 gap-3">
          <Link to="/nutrition" className="bg-[var(--color-surface-container)] rounded-2xl p-4 hover:bg-[var(--color-surface-container-high)] transition-colors text-center">
            <span className="material-symbols-outlined text-primary text-xl mb-1 block" style={{ fontVariationSettings: "'FILL' 1" }}>local_fire_department</span>
            <p className="font-headline font-bold text-lg leading-none">{dailyStats.calories}</p>
            <p className="text-[10px] text-on-surface-variant font-medium mt-1">Calories</p>
          </Link>
          <Link to="/health" className="bg-[var(--color-surface-container)] rounded-2xl p-4 hover:bg-[var(--color-surface-container-high)] transition-colors text-center">
            <span className="material-symbols-outlined text-[#6FFB85] text-xl mb-1 block" style={{ fontVariationSettings: "'FILL' 1" }}>steps</span>
            <p className="font-headline font-bold text-lg leading-none">{dailyStats.steps}</p>
            <p className="text-[10px] text-on-surface-variant font-medium mt-1">Steps</p>
          </Link>
          <Link to="/health" className="bg-[var(--color-surface-container)] rounded-2xl p-4 hover:bg-[var(--color-surface-container-high)] transition-colors text-center">
            <span className="material-symbols-outlined text-[#60A5FA] text-xl mb-1 block" style={{ fontVariationSettings: "'FILL' 1" }}>water_drop</span>
            <p className="font-headline font-bold text-lg leading-none">{dailyStats.water.toFixed(1)}<span className="text-xs font-normal text-on-surface-variant ml-0.5">L</span></p>
            <p className="text-[10px] text-on-surface-variant font-medium mt-1">Water</p>
          </Link>
        </section>

        {/* Next Workout Card — with photo */}
        <Link to="/workout" className="block bg-[var(--color-surface-container)] rounded-2xl overflow-hidden group hover:bg-[var(--color-surface-container-high)] transition-colors">
          <div className="h-36 bg-[url('https://images.unsplash.com/photo-1534438327276-14e5300c3a48?q=80&w=640&auto=format&fit=crop')] bg-cover bg-center relative">
            <div className="absolute inset-0 bg-gradient-to-t from-[var(--color-surface-container)] via-transparent to-transparent" />
            <div className="absolute top-3 left-3">
              <span className="bg-primary text-black text-[10px] font-bold px-2.5 py-1 rounded-lg uppercase tracking-wide">Up Next</span>
            </div>
          </div>
          <div className="px-5 pb-5 -mt-4 relative z-10">
            <h3 className="font-headline font-bold text-lg">{profile.goal === 'Fat Loss' ? 'HIIT Burn Cycle' : 'Upper Body — Push'}</h3>
            <div className="flex items-center gap-3 mt-1.5">
              <span className="text-on-surface-variant text-xs flex items-center gap-1">
                <span className="material-symbols-outlined text-xs">timer</span> 45 min
              </span>
              <span className="text-on-surface-variant text-xs flex items-center gap-1">
                <span className="material-symbols-outlined text-xs">fitness_center</span> 6 exercises
              </span>
              <span className="text-primary text-xs font-semibold ml-auto group-hover:underline">Start →</span>
            </div>
          </div>
        </Link>

        {/* Macros — real data or empty state */}
        <Link to="/nutrition" className="block bg-[var(--color-surface-container)] rounded-2xl p-5 hover:bg-[var(--color-surface-container-high)] transition-colors">
          <div className="flex justify-between items-center mb-4">
            <h2 className="font-headline font-bold text-base">Nutrition</h2>
            <span className="text-on-surface-variant text-xs font-medium">See all →</span>
          </div>
          {dailyStats.calories > 0 ? (
            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="text-on-surface-variant font-medium">Calories</span>
                  <span className="font-semibold">{dailyStats.calories} <span className="text-on-surface-variant font-normal">/ {profile.dailyCalorieGoal} kcal</span></span>
                </div>
                <div className="w-full bg-white/[0.04] h-2 rounded-full overflow-hidden">
                  <div className="bg-primary h-full rounded-full transition-all" style={{ width: `${Math.min(100, (dailyStats.calories / profile.dailyCalorieGoal) * 100)}%` }} />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="text-on-surface-variant font-medium">Water</span>
                  <span className="font-semibold">{dailyStats.water.toFixed(1)} <span className="text-on-surface-variant font-normal">/ {profile.dailyWaterGoal}L</span></span>
                </div>
                <div className="w-full bg-white/[0.04] h-2 rounded-full overflow-hidden">
                  <div className="bg-[#60A5FA] h-full rounded-full transition-all" style={{ width: `${Math.min(100, (dailyStats.water / profile.dailyWaterGoal) * 100)}%` }} />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="text-on-surface-variant font-medium">Exercise</span>
                  <span className="font-semibold">{dailyStats.duration} <span className="text-on-surface-variant font-normal">/ 60 min</span></span>
                </div>
                <div className="w-full bg-white/[0.04] h-2 rounded-full overflow-hidden">
                  <div className="bg-[#6FFB85] h-full rounded-full transition-all" style={{ width: `${Math.min(100, (dailyStats.duration / 60) * 100)}%` }} />
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3 py-4 text-on-surface-variant">
              <span className="material-symbols-outlined text-2xl opacity-40">restaurant</span>
              <p className="text-sm">Log activities to track your daily nutrition →</p>
            </div>
          )}
        </Link>

        {/* Streak & Recovery — real data */}
        <section className="grid grid-cols-2 gap-3">
          <div onClick={() => navigate('/progress')} className="bg-[var(--color-surface-container)] rounded-2xl p-5 cursor-pointer hover:bg-[var(--color-surface-container-high)] transition-colors">
            <span className="material-symbols-outlined text-[#FF4D4D] text-xl mb-2 block" style={{ fontVariationSettings: "'FILL' 1" }}>local_fire_department</span>
            <p className="font-headline font-black text-3xl tracking-tight">{streak}</p>
            <p className="text-on-surface-variant text-[11px] font-medium mt-0.5">Day streak</p>
          </div>
          <div onClick={() => navigate('/health')} className="bg-[var(--color-surface-container)] rounded-2xl p-5 cursor-pointer hover:bg-[var(--color-surface-container-high)] transition-colors">
            <span className="material-symbols-outlined text-[#6FFB85] text-xl mb-2 block" style={{ fontVariationSettings: "'FILL' 1" }}>battery_charging_full</span>
            <p className="font-headline font-black text-3xl tracking-tight">{recoveryScore || '—'}</p>
            <p className="text-on-surface-variant text-[11px] font-medium mt-0.5">{recoveryScore > 0 ? 'Recovery score' : 'Log sleep to see'}</p>
          </div>
        </section>

        {/* Weight Trend — real chart */}
        <Link to="/profile" className="block bg-[var(--color-surface-container)] rounded-2xl p-5 hover:bg-[var(--color-surface-container-high)] transition-colors">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h2 className="font-headline font-bold text-base">Weight</h2>
              <p className={`${isTrendingDown ? 'text-[#6FFB85]' : weightHistory.length >= 2 ? 'text-[#FF4D4D]' : 'text-on-surface-variant'} text-xs font-medium mt-0.5`}>
                {isTrendingDown ? '↓' : weightHistory.length >= 2 ? '↑' : ''} {weightTrendText}
              </p>
            </div>
            <div className="text-right">
              <span className="font-headline font-bold text-2xl">{displayWeight}</span>
              <span className="text-on-surface-variant text-xs ml-1">{weightUnit}</span>
            </div>
          </div>
          {weightChartPath ? (
            <>
              <div className="h-24 w-full">
                <svg className="w-full h-full" viewBox="0 0 800 200" preserveAspectRatio="none">
                  <defs>
                    <linearGradient id="graphGradient" x1="0%" x2="0%" y1="0%" y2="100%">
                      <stop offset="0%" stopColor={isTrendingDown ? '#6FFB85' : '#FF4D4D'} stopOpacity="0.15" />
                      <stop offset="100%" stopColor={isTrendingDown ? '#6FFB85' : '#FF4D4D'} stopOpacity="0" />
                    </linearGradient>
                  </defs>
                  <path d={weightChartPath.fillPath} fill="url(#graphGradient)" />
                  <path d={weightChartPath.linePath} fill="transparent" stroke={isTrendingDown ? '#6FFB85' : '#FF4D4D'} strokeLinecap="round" strokeWidth="2.5" />
                  <circle cx={weightChartPath.lastPoint.x} cy={weightChartPath.lastPoint.y} fill={isTrendingDown ? '#6FFB85' : '#FF4D4D'} r="4" />
                </svg>
              </div>
              <div className="flex justify-between mt-2 text-[10px] text-on-surface-variant font-medium px-1">
                {weightChartPath.labels.map((l, i) => <span key={i}>{l}</span>)}
              </div>
            </>
          ) : (
            <div className="flex items-center gap-3 py-6 text-on-surface-variant justify-center">
              <span className="material-symbols-outlined text-2xl opacity-40">monitor_weight</span>
              <p className="text-sm">Log weight daily to see your trend chart</p>
            </div>
          )}
        </Link>

        {/* Quick Links — simplified 2x2 grid */}
        <section className="grid grid-cols-2 gap-3">
          {[
            { to: '/health', icon: 'monitor_heart', label: 'Health', color: '#FF4D4D' },
            { to: '/community', icon: 'groups', label: 'Community', color: '#fab0ff' },
            { to: '/progress', icon: 'query_stats', label: 'Reports', color: '#6FFB85' },
            { to: '/settings', icon: 'settings', label: 'Settings', color: 'var(--color-on-surface-variant)' },
          ].map(item => (
            <Link key={item.to} to={item.to} className="bg-[var(--color-surface-container)] rounded-2xl p-4 flex items-center gap-3 hover:bg-[var(--color-surface-container-high)] transition-colors">
              <span className="material-symbols-outlined text-xl" style={{ color: item.color, fontVariationSettings: "'FILL' 1" }}>{item.icon}</span>
              <span className="font-headline font-semibold text-sm">{item.label}</span>
            </Link>
          ))}
        </section>

      </main>
    </>
  );
}
