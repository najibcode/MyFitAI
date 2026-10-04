// ─────────────────────────────────────────────────────────────
// MyFitAI — Activity, GPS & Territory Engine Master Hub
// Combines personal Strava-style activity tracking with INTVL-inspired
// territory capture & defense, XP leveling, and personal analytics.
// ─────────────────────────────────────────────────────────────

import { useState, useMemo } from 'react';
import { useActivity } from '../context/ActivityContext';
import {
  formatDuration,
  formatDistance,
  formatPace,
} from '../engine/activityCalculations';
import type { Activity, ActivityType } from '../types/activity';
import MapView from '../components/activity/MapView';
import LiveActivityTracker from '../components/activity/LiveActivityTracker';
import ActivityDetailModal from '../components/activity/ActivityDetailModal';
import ActivityExportImportModal from '../components/activity/ActivityExportImportModal';

export default function ActivityHub() {
  const {
    activities,
    activeSession,
    startTracking,
    territoryCells,
    territoryStats,
    achievements,
    goals,
    createGoal,
    personalRecords,
    preferences,
    deleteActivity,
    logManualActivity,
  } = useActivity();

  const [activeTab, setActiveTab] = useState<'track' | 'map' | 'history' | 'analytics' | 'goals'>('track');
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showManualModal, setShowManualModal] = useState(false);
  const [showCreateGoalModal, setShowCreateGoalModal] = useState(false);

  // Manual Log Form State
  const [manualType, setManualType] = useState<ActivityType>('RUN');
  const [manualTitle, setManualTitle] = useState('');
  const [manualDistanceKm, setManualDistanceKm] = useState('5.0');
  const [manualDurationMins, setManualDurationMins] = useState('30');
  const [manualElevation, setManualElevation] = useState('25');

  // Goal Form State
  const [goalTitle, setGoalTitle] = useState('Run 20 km this week');
  const [goalMetric, setGoalMetric] = useState<'distance' | 'activities'>('distance');
  const [goalTarget, setGoalTarget] = useState('20');
  const [goalPeriod, setGoalPeriod] = useState<'weekly' | 'monthly'>('weekly');

  // Filter history state
  const [historyFilter, setHistoryFilter] = useState<string>('ALL');

  // Analytics Period
  const [analyticsPeriod, setAnalyticsPeriod] = useState<'7d' | '30d' | '90d' | 'all'>('30d');

  // 1. Weekly Volume Summary
  const weeklySummary = useMemo(() => {
    const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const recent = activities.filter(a => new Date(a.startTime).getTime() >= oneWeekAgo);

    const distanceMeters = recent.reduce((acc, a) => acc + (a.distanceMeters || 0), 0);
    const durationSeconds = recent.reduce((acc, a) => acc + (a.durationSeconds || 0), 0);
    const elevationGainMeters = recent.reduce((acc, a) => acc + (a.elevationGainMeters || 0), 0);
    const calories = recent.reduce((acc, a) => acc + (a.calories || 0), 0);

    return {
      count: recent.length,
      distanceMeters,
      durationSeconds,
      elevationGainMeters,
      calories,
    };
  }, [activities]);

  // 2. Filtered Activities for History tab
  const filteredActivities = useMemo(() => {
    if (historyFilter === 'ALL') return activities;
    return activities.filter(a => a.type === historyFilter);
  }, [activities, historyFilter]);

  // 3. Analytics Computations
  const analyticsData = useMemo(() => {
    const now = Date.now();
    let cutoff = 0;
    if (analyticsPeriod === '7d') cutoff = now - 7 * 24 * 60 * 60 * 1000;
    else if (analyticsPeriod === '30d') cutoff = now - 30 * 24 * 60 * 60 * 1000;
    else if (analyticsPeriod === '90d') cutoff = now - 90 * 24 * 60 * 60 * 1000;

    const periodActs = activities.filter(a => new Date(a.startTime).getTime() >= cutoff);
    const totalDistKm = periodActs.reduce((acc, a) => acc + (a.distanceMeters || 0), 0) / 1000;
    const totalDurSec = periodActs.reduce((acc, a) => acc + (a.durationSeconds || 0), 0);
    const totalEleM = periodActs.reduce((acc, a) => acc + (a.elevationGainMeters || 0), 0);
    const totalCals = periodActs.reduce((acc, a) => acc + (a.calories || 0), 0);

    // Group by activity type
    const byType: Record<string, number> = {};
    periodActs.forEach(a => {
      byType[a.type] = (byType[a.type] || 0) + (a.distanceMeters || 0) / 1000;
    });

    return {
      count: periodActs.length,
      totalDistKm,
      totalDurSec,
      totalEleM,
      totalCals,
      byType,
    };
  }, [activities, analyticsPeriod]);

  // Quick Start Handler
  const handleQuickStart = async (type: ActivityType) => {
    await startTracking(type);
  };

  // Submit Manual Activity
  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const distKm = parseFloat(manualDistanceKm) || 0;
    const durMins = parseFloat(manualDurationMins) || 0;
    if (distKm <= 0 || durMins <= 0) return;

    await logManualActivity({
      type: manualType,
      title: manualTitle.trim() || `${manualType} (Manual)`,
      distanceMeters: Math.round(distKm * 1000),
      durationSeconds: Math.round(durMins * 60),
      elevationGainMeters: parseInt(manualElevation, 10) || 0,
    });

    setShowManualModal(false);
    setManualTitle('');
  };

  // Submit New Goal
  const handleGoalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetVal = parseFloat(goalTarget) || 0;
    if (targetVal <= 0) return;

    const now = new Date();
    const nowISO = now.toISOString().split('T')[0];
    const targetValue = goalMetric === 'distance' ? targetVal * 1000 : targetVal;

    await createGoal({
      title: goalTitle.trim() || `Target ${targetVal}`,
      metric: goalMetric,
      targetValue,
      period: goalPeriod,
      startDate: nowISO,
      endDate: new Date(now.getTime() + (goalPeriod === 'weekly' ? 7 : 30) * 24 * 60 * 60 * 1000)
        .toISOString()
        .split('T')[0],
    });

    setShowCreateGoalModal(false);
  };

  return (
    <div className="max-w-lg mx-auto px-4 pt-4 pb-24 space-y-5 animate-fade-in">
      {/* ── Active GPS Overlay if running ── */}
      {activeSession && <LiveActivityTracker />}

      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-primary">
            GPS • Activity • Territory
          </span>
          <h1 className="font-headline font-black text-2xl text-on-surface">Activity Hub</h1>
        </div>

        <div className="flex items-center gap-2">
          {/* Territory Level Badge */}
          <div className="px-2.5 py-1 rounded-xl bg-primary/10 border border-primary/20 flex items-center gap-1.5">
            <span className="material-symbols-outlined text-primary text-[15px]">flag</span>
            <span className="font-headline font-bold text-xs text-primary">
              Lvl {territoryStats.level}
            </span>
          </div>

          <button
            onClick={() => setShowExportModal(true)}
            className="w-9 h-9 rounded-xl bg-[var(--color-surface-container)] border border-white/[0.06] text-on-surface-variant hover:text-on-surface flex items-center justify-center transition-colors active:scale-95"
            title="Data & Cloud Sync"
          >
            <span className="material-symbols-outlined text-[19px]">cloud_sync</span>
          </button>
        </div>
      </div>

      {/* ── Primary Navigation Tabs ── */}
      <div className="flex p-1 bg-[var(--color-surface-container)] rounded-2xl border border-white/[0.04]">
        {[
          { id: 'track', label: 'Track', icon: 'play_arrow' },
          { id: 'map', label: 'Territory', icon: 'map' },
          { id: 'history', label: 'History', icon: 'history' },
          { id: 'analytics', label: 'Trends', icon: 'analytics' },
          { id: 'goals', label: 'Badges', icon: 'military_tech' },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex-1 py-2 rounded-xl text-xs font-headline font-bold transition-all flex flex-col sm:flex-row items-center justify-center gap-1 ${
              activeTab === tab.id
                ? 'bg-primary text-black shadow-md shadow-primary/20'
                : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            <span className="material-symbols-outlined text-[17px]">{tab.icon}</span>
            <span className="text-[10px] sm:text-xs">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* ═══════════════════════════════════════════════════════
          TAB 1: TRACK (Home Dashboard & 1-Tap Quick Start)
      ═══════════════════════════════════════════════════════ */}
      {activeTab === 'track' && (
        <div className="space-y-4">
          {/* Quick Start Buttons Grid */}
          <div>
            <h2 className="text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-2.5">
              Start New Activity
            </h2>
            <div className="grid grid-cols-4 gap-2.5">
              {[
                { type: 'RUN', icon: 'directions_run', label: 'Run', color: '#6FFB85' },
                { type: 'WALK', icon: 'directions_walk', label: 'Walk', color: '#60A5FA' },
                { type: 'CYCLING', icon: 'directions_bike', label: 'Cycle', color: '#FF7A00' },
                { type: 'HIKING', icon: 'hiking', label: 'Hike', color: '#A78BFA' },
              ].map(item => (
                <button
                  key={item.type}
                  onClick={() => handleQuickStart(item.type as ActivityType)}
                  className="bg-[var(--color-surface-container)] hover:bg-[var(--color-surface-container-high)] p-3.5 rounded-2xl border border-white/[0.04] flex flex-col items-center justify-center gap-1.5 transition-all active:scale-95 group shadow-sm"
                >
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center transition-transform group-hover:scale-110"
                    style={{ backgroundColor: `${item.color}15`, color: item.color }}
                  >
                    <span className="material-symbols-outlined text-[22px]">{item.icon}</span>
                  </div>
                  <span className="font-headline font-bold text-xs text-on-surface">
                    {item.label}
                  </span>
                  <span className="text-[9px] font-semibold text-primary">Start →</span>
                </button>
              ))}
            </div>
          </div>

          {/* This Week Hero Summary Card */}
          <div className="bg-[var(--color-surface-container)] rounded-3xl p-5 border border-white/[0.04] space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold uppercase tracking-wider text-on-surface-variant">
                This Week's Activity
              </span>
              <span className="text-xs font-semibold text-primary">
                {weeklySummary.count} activities
              </span>
            </div>

            <div className="flex items-baseline gap-2">
              <span className="font-headline font-black text-4xl text-on-surface">
                {formatDistance(weeklySummary.distanceMeters, preferences.unitSystem)}
              </span>
              <span className="text-on-surface-variant text-sm font-semibold font-mono">
                / {formatDuration(weeklySummary.durationSeconds)}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2 pt-1 border-t border-white/[0.04]">
              <div>
                <span className="text-[10px] text-on-surface-variant font-medium block">Elevation</span>
                <span className="font-headline font-bold text-sm text-[#6FFB85]">
                  +{weeklySummary.elevationGainMeters} m
                </span>
              </div>
              <div>
                <span className="text-[10px] text-on-surface-variant font-medium block">Calories</span>
                <span className="font-headline font-bold text-sm text-[#FF7A00]">
                  {weeklySummary.calories} kcal
                </span>
              </div>
              <div>
                <span className="text-[10px] text-on-surface-variant font-medium block">Territory</span>
                <span className="font-headline font-bold text-sm text-primary">
                  {territoryStats.totalAreaKm2} km²
                </span>
              </div>
            </div>
          </div>

          {/* Territory Snapshot Widget */}
          <div className="bg-gradient-to-br from-primary/10 via-[var(--color-surface-container)] to-[var(--color-surface-container)] rounded-3xl p-5 border border-primary/20 space-y-3">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-xl">domain</span>
                <h3 className="font-headline font-bold text-sm text-on-surface">
                  Territory & Level Progress
                </h3>
              </div>
              <span className="text-xs font-black text-primary font-headline">
                {territoryStats.levelName}
              </span>
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-medium">
                <span className="text-on-surface-variant">XP Progress</span>
                <span className="text-on-surface font-semibold font-mono">
                  {territoryStats.xp} XP
                </span>
              </div>
              <div className="w-full bg-white/[0.06] h-2 rounded-full overflow-hidden">
                <div
                  className="bg-primary h-full rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, (territoryStats.xp % 1000) / 10)}%` }}
                />
              </div>
            </div>

            <div className="flex justify-between text-xs pt-1 text-on-surface-variant">
              <span>{territoryStats.totalCapturedCount} cells captured</span>
              <span>{territoryStats.totalDefendedCount} defenses</span>
              <button
                onClick={() => setActiveTab('map')}
                className="text-primary font-bold hover:underline"
              >
                View Map →
              </button>
            </div>
          </div>

          {/* Recent Activities List (Quick Feed) */}
          <div className="space-y-2.5">
            <div className="flex justify-between items-center">
              <h3 className="text-xs font-bold uppercase tracking-wider text-on-surface-variant">
                Recent Sessions
              </h3>
              <button
                onClick={() => setActiveTab('history')}
                className="text-primary text-xs font-bold hover:underline"
              >
                See all ({activities.length}) →
              </button>
            </div>

            {activities.slice(0, 4).map(act => (
              <div
                key={act.id}
                onClick={() => setSelectedActivity(act)}
                className="bg-[var(--color-surface-container)] hover:bg-[var(--color-surface-container-high)] p-3.5 rounded-2xl border border-white/[0.04] flex items-center justify-between cursor-pointer transition-all active:scale-98 shadow-sm"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-white/[0.04] flex items-center justify-center text-primary">
                    <span className="material-symbols-outlined text-[20px]">
                      {act.type === 'RUN'
                        ? 'directions_run'
                        : act.type === 'CYCLING'
                        ? 'directions_bike'
                        : 'directions_walk'}
                    </span>
                  </div>
                  <div>
                    <h4 className="font-headline font-bold text-sm text-on-surface">{act.title}</h4>
                    <span className="text-[11px] text-on-surface-variant">
                      {new Date(act.startTime).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                      })}{' '}
                      • {formatDuration(act.durationSeconds)}
                    </span>
                  </div>
                </div>

                <div className="text-right">
                  <span className="font-headline font-bold text-sm text-on-surface block">
                    {formatDistance(act.distanceMeters, preferences.unitSystem)}
                  </span>
                  <span className="text-[11px] text-primary font-medium">
                    {formatPace(act.averagePaceSecondsPerKm, preferences.unitSystem)}
                  </span>
                </div>
              </div>
            ))}

            {activities.length === 0 && (
              <div className="bg-[var(--color-surface-container)] rounded-2xl p-6 text-center text-on-surface-variant space-y-2 border border-white/[0.04]">
                <span className="material-symbols-outlined text-3xl opacity-40">map</span>
                <p className="text-xs">No GPS activities logged yet. Tap Run or Walk above to start your first session!</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════
          TAB 2: TERRITORY MAP (Interactive Geospatial View)
      ═══════════════════════════════════════════════════════ */}
      {activeTab === 'map' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="font-headline font-bold text-lg text-on-surface">Your Territory</h2>
              <p className="text-xs text-on-surface-variant">
                Every completed route captures grid cells. Re-run your routes to defend them!
              </p>
            </div>
            <div className="text-right">
              <span className="font-headline font-black text-xl text-primary block">
                {territoryStats.totalAreaKm2} km²
              </span>
              <span className="text-[10px] text-on-surface-variant">Area Controlled</span>
            </div>
          </div>

          {/* Full Interactive MapView */}
          <div className="rounded-3xl overflow-hidden border border-white/[0.08] shadow-2xl">
            <MapView
              mode="territory"
              territoryCells={territoryCells}
              height={380}
              interactive={true}
              followUser={false}
              showTerritory={true}
              zoomLevel={14}
            />
          </div>

          {/* Territory Rules & Anti-Farming Legend */}
          <div className="bg-[var(--color-surface-container)] rounded-2xl p-4 border border-white/[0.04] space-y-3">
            <h3 className="font-headline font-bold text-xs uppercase tracking-wider text-on-surface-variant">
              Territory Mechanics
            </h3>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="flex items-center gap-2">
                <span className="w-3.5 h-3.5 rounded bg-[#6FFB85]/30 border border-[#6FFB85]" />
                <span className="text-on-surface">Captured (Green)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3.5 h-3.5 rounded bg-[#FBBF24]/30 border border-[#FBBF24]" />
                <span className="text-on-surface">Defended (Gold)</span>
              </div>
            </div>
            <p className="text-[11px] text-on-surface-variant leading-relaxed">
              Territory is captured in standard 1-hectare (~0.01 km²) grid cells. Activities must exceed 500m to qualify. A 20-hour cooldown prevents repetitive farming on identical routes.
            </p>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════
          TAB 3: HISTORY (Filterable Activity Feed)
      ═══════════════════════════════════════════════════════ */}
      {activeTab === 'history' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-headline font-bold text-lg text-on-surface">Activity Log</h2>
            <button
              onClick={() => setShowManualModal(true)}
              className="px-3 py-1.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] text-xs font-bold text-primary flex items-center gap-1 transition-colors"
            >
              <span className="material-symbols-outlined text-[16px]">add</span>
              Manual Entry
            </button>
          </div>

          {/* Activity Type Filters */}
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
            {['ALL', 'RUN', 'WALK', 'CYCLING', 'HIKING'].map(filter => (
              <button
                key={filter}
                onClick={() => setHistoryFilter(filter)}
                className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all ${
                  historyFilter === filter
                    ? 'bg-primary text-black'
                    : 'bg-[var(--color-surface-container)] text-on-surface-variant hover:text-on-surface'
                }`}
              >
                {filter}
              </button>
            ))}
          </div>

          {/* Filtered Activities List */}
          <div className="space-y-2.5">
            {filteredActivities.map(act => (
              <div
                key={act.id}
                onClick={() => setSelectedActivity(act)}
                className="bg-[var(--color-surface-container)] hover:bg-[var(--color-surface-container-high)] p-4 rounded-2xl border border-white/[0.04] cursor-pointer transition-all active:scale-98 space-y-2"
              >
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-2.5">
                    <span className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                      <span className="material-symbols-outlined text-[18px]">
                        {act.type === 'RUN' ? 'directions_run' : act.type === 'CYCLING' ? 'directions_bike' : 'directions_walk'}
                      </span>
                    </span>
                    <div>
                      <h4 className="font-headline font-bold text-sm text-on-surface">{act.title}</h4>
                      <span className="text-[11px] text-on-surface-variant">
                        {new Date(act.startTime).toLocaleDateString('en-US', {
                          weekday: 'short',
                          month: 'short',
                          day: 'numeric',
                        })}
                      </span>
                    </div>
                  </div>
                  <span className="font-headline font-black text-base text-on-surface">
                    {formatDistance(act.distanceMeters, preferences.unitSystem)}
                  </span>
                </div>

                <div className="grid grid-cols-4 gap-2 pt-2 border-t border-white/[0.04] text-xs">
                  <div>
                    <span className="text-[10px] text-on-surface-variant block">Duration</span>
                    <span className="font-mono text-on-surface font-semibold">{formatDuration(act.durationSeconds)}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-on-surface-variant block">Pace</span>
                    <span className="text-primary font-semibold">{formatPace(act.averagePaceSecondsPerKm, preferences.unitSystem)}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-on-surface-variant block">Elevation</span>
                    <span className="text-[#6FFB85] font-semibold">+{act.elevationGainMeters} m</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-on-surface-variant block">Territory</span>
                    <span className="text-on-surface font-semibold">+{act.territoryCapturedKm2 || 0} km²</span>
                  </div>
                </div>
              </div>
            ))}

            {filteredActivities.length === 0 && (
              <p className="text-center text-xs text-on-surface-variant py-8">
                No activities found matching this filter.
              </p>
            )}
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════
          TAB 4: ANALYTICS & TRENDS
      ═══════════════════════════════════════════════════════ */}
      {activeTab === 'analytics' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="font-headline font-bold text-lg text-on-surface">Performance Trends</h2>
            {/* Period Selector */}
            <div className="flex p-1 bg-[var(--color-surface-container)] rounded-xl border border-white/[0.04] text-[11px] font-bold">
              {(['7d', '30d', '90d', 'all'] as const).map(p => (
                <button
                  key={p}
                  onClick={() => setAnalyticsPeriod(p)}
                  className={`px-2.5 py-1 rounded-lg transition-all uppercase ${
                    analyticsPeriod === p
                      ? 'bg-primary text-black'
                      : 'text-on-surface-variant hover:text-on-surface'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          {/* Metric Cards Grid */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-[var(--color-surface-container)] rounded-2xl p-4 border border-white/[0.04]">
              <span className="text-[10px] text-on-surface-variant font-medium block">Total Distance</span>
              <span className="font-headline font-black text-2xl text-on-surface">
                {analyticsData.totalDistKm.toFixed(1)} km
              </span>
              <span className="text-[10px] text-on-surface-variant block mt-1">Across {analyticsData.count} sessions</span>
            </div>
            <div className="bg-[var(--color-surface-container)] rounded-2xl p-4 border border-white/[0.04]">
              <span className="text-[10px] text-on-surface-variant font-medium block">Total Time</span>
              <span className="font-headline font-black text-2xl text-on-surface font-mono">
                {formatDuration(analyticsData.totalDurSec)}
              </span>
              <span className="text-[10px] text-on-surface-variant block mt-1">Active moving time</span>
            </div>
            <div className="bg-[var(--color-surface-container)] rounded-2xl p-4 border border-white/[0.04]">
              <span className="text-[10px] text-on-surface-variant font-medium block">Elevation Climbed</span>
              <span className="font-headline font-black text-2xl text-[#6FFB85]">
                +{analyticsData.totalEleM} m
              </span>
              <span className="text-[10px] text-on-surface-variant block mt-1">Vertical gain</span>
            </div>
            <div className="bg-[var(--color-surface-container)] rounded-2xl p-4 border border-white/[0.04]">
              <span className="text-[10px] text-on-surface-variant font-medium block">Calories Burned</span>
              <span className="font-headline font-black text-2xl text-[#FF7A00]">
                {analyticsData.totalCals}
              </span>
              <span className="text-[10px] text-on-surface-variant block mt-1">Estimated energy</span>
            </div>
          </div>

          {/* Personal Records Showcase */}
          <div className="bg-[var(--color-surface-container)] rounded-3xl p-5 border border-white/[0.04] space-y-3">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-amber-400 text-xl" style={{ fontVariationSettings: "'FILL' 1" }}>military_tech</span>
              <h3 className="font-headline font-bold text-sm text-on-surface">Personal Records (PRs)</h3>
            </div>

            {personalRecords.length > 0 ? (
              <div className="grid grid-cols-2 gap-2">
                {personalRecords.map(pr => (
                  <div key={pr.id} className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.04]">
                    <span className="text-[10px] text-on-surface-variant uppercase font-bold block">
                      {pr.category.replace(/_/g, ' ')}
                    </span>
                    <span className="font-headline font-black text-base text-amber-300">
                      {pr.formattedValue}
                    </span>
                    <span className="text-[9px] text-on-surface-variant block mt-0.5">{pr.date}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-xs text-on-surface-variant py-3">
                No PRs recorded yet. Complete runs to set your 1k, 5k, 10k, and distance records!
              </p>
            )}
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════
          TAB 5: GOALS & BADGES
      ═══════════════════════════════════════════════════════ */}
      {activeTab === 'goals' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="font-headline font-bold text-lg text-on-surface">Goals & Achievements</h2>
            <button
              onClick={() => setShowCreateGoalModal(true)}
              className="px-3 py-1.5 rounded-xl bg-primary text-black text-xs font-bold flex items-center gap-1 active:scale-95 shadow-md shadow-primary/20"
            >
              <span className="material-symbols-outlined text-[16px]">add</span>
              New Goal
            </button>
          </div>

          {/* Active Goals Section */}
          <div className="space-y-2.5">
            {goals.map(g => {
              const currentVal = g.metric === 'distance' ? (g.currentValue / 1000).toFixed(1) : g.currentValue;
              const targetVal = g.metric === 'distance' ? (g.targetValue / 1000).toFixed(1) : g.targetValue;
              const unit = g.metric === 'distance' ? 'km' : 'acts';
              const progressPct = Math.min(100, Math.round((g.currentValue / (g.targetValue || 1)) * 100));

              return (
                <div key={g.id} className="bg-[var(--color-surface-container)] rounded-2xl p-4 border border-white/[0.04] space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="font-headline font-bold text-sm text-on-surface">{g.title}</span>
                    <span className="text-xs font-bold text-primary font-mono">{currentVal} / {targetVal} {unit}</span>
                  </div>
                  <div className="w-full bg-white/[0.06] h-2 rounded-full overflow-hidden">
                    <div className="bg-primary h-full rounded-full transition-all" style={{ width: `${progressPct}%` }} />
                  </div>
                  <div className="flex justify-between text-[10px] text-on-surface-variant">
                    <span className="capitalize">{g.period} goal</span>
                    <span>Ends: {g.endDate}</span>
                  </div>
                </div>
              );
            })}

            {goals.length === 0 && (
              <div className="bg-[var(--color-surface-container)] rounded-2xl p-5 text-center text-on-surface-variant text-xs space-y-1">
                <span className="material-symbols-outlined text-2xl opacity-40">flag</span>
                <p>No active goals. Set a weekly mileage or activity target to keep momentum!</p>
              </div>
            )}
          </div>

          {/* Achievements Grid */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-2.5">
              Badges & Milestones ({achievements.filter(a => a.progress >= a.maxProgress).length} / {achievements.length})
            </h3>
            <div className="grid grid-cols-2 gap-2.5">
              {achievements.map(ach => {
                const isUnlocked = ach.progress >= ach.maxProgress;
                return (
                  <div
                    key={ach.id}
                    className={`p-3.5 rounded-2xl border transition-all ${
                      isUnlocked
                        ? 'bg-primary/10 border-primary/30'
                        : 'bg-[var(--color-surface-container)] border-white/[0.04] opacity-50'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className={`material-symbols-outlined text-xl ${isUnlocked ? 'text-primary' : 'text-on-surface-variant'}`}>
                        {ach.icon}
                      </span>
                      <h4 className="font-headline font-bold text-xs text-on-surface">{ach.title}</h4>
                    </div>
                    <p className="text-[10px] text-on-surface-variant leading-snug">{ach.description}</p>
                    {isUnlocked && (
                      <span className="inline-block mt-2 text-[9px] font-bold text-primary bg-primary/20 px-2 py-0.5 rounded-full">
                        UNLOCKED
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ── Modals ── */}
      <ActivityDetailModal
        activity={selectedActivity}
        isOpen={selectedActivity !== null}
        onClose={() => setSelectedActivity(null)}
        onDelete={id => deleteActivity(id)}
      />

      <ActivityExportImportModal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
      />

      {/* Manual Activity Log Dialog */}
      {showManualModal && (
        <div className="fixed inset-0 z-[120] bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <form
            onSubmit={handleManualSubmit}
            className="bg-[var(--color-surface-container)] rounded-3xl max-w-sm w-full p-5 border border-white/[0.08] space-y-4"
          >
            <div className="flex justify-between items-center">
              <h3 className="font-headline font-bold text-lg text-on-surface">Log Past Activity</h3>
              <button
                type="button"
                onClick={() => setShowManualModal(false)}
                className="w-8 h-8 rounded-full bg-white/[0.06] text-on-surface-variant flex items-center justify-center"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-on-surface-variant block mb-1 font-semibold">Activity Type</label>
                <select
                  value={manualType}
                  onChange={e => setManualType(e.target.value as ActivityType)}
                  className="w-full p-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-on-surface font-semibold"
                >
                  <option value="RUN">Running</option>
                  <option value="WALK">Walking</option>
                  <option value="CYCLING">Cycling</option>
                  <option value="HIKING">Hiking</option>
                  <option value="TREADMILL">Treadmill</option>
                  <option value="INDOOR_CYCLING">Indoor Cycling</option>
                </select>
              </div>

              <div>
                <label className="text-on-surface-variant block mb-1 font-semibold">Title (Optional)</label>
                <input
                  type="text"
                  placeholder="Morning Run"
                  value={manualTitle}
                  onChange={e => setManualTitle(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-on-surface"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-on-surface-variant block mb-1 font-semibold">Distance (km)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={manualDistanceKm}
                    onChange={e => setManualDistanceKm(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-on-surface"
                    required
                  />
                </div>
                <div>
                  <label className="text-on-surface-variant block mb-1 font-semibold">Duration (mins)</label>
                  <input
                    type="number"
                    value={manualDurationMins}
                    onChange={e => setManualDurationMins(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-on-surface"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="text-on-surface-variant block mb-1 font-semibold">Elevation Gain (m)</label>
                <input
                  type="number"
                  value={manualElevation}
                  onChange={e => setManualElevation(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-on-surface"
                />
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowManualModal(false)}
                className="flex-1 py-2.5 rounded-xl bg-white/[0.06] text-on-surface font-semibold text-xs"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 py-2.5 rounded-xl bg-primary text-black font-headline font-bold text-xs shadow-md shadow-primary/20"
              >
                Save Log
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Create Goal Dialog */}
      {showCreateGoalModal && (
        <div className="fixed inset-0 z-[120] bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <form
            onSubmit={handleGoalSubmit}
            className="bg-[var(--color-surface-container)] rounded-3xl max-w-sm w-full p-5 border border-white/[0.08] space-y-4"
          >
            <div className="flex justify-between items-center">
              <h3 className="font-headline font-bold text-lg text-on-surface">New Activity Goal</h3>
              <button
                type="button"
                onClick={() => setShowCreateGoalModal(false)}
                className="w-8 h-8 rounded-full bg-white/[0.06] text-on-surface-variant flex items-center justify-center"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-on-surface-variant block mb-1 font-semibold">Goal Name</label>
                <input
                  type="text"
                  value={goalTitle}
                  onChange={e => setGoalTitle(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-on-surface"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-on-surface-variant block mb-1 font-semibold">Metric</label>
                  <select
                    value={goalMetric}
                    onChange={e => setGoalMetric(e.target.value as any)}
                    className="w-full p-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-on-surface font-semibold"
                  >
                    <option value="distance">Distance (km)</option>
                    <option value="activities">Activity Count</option>
                  </select>
                </div>

                <div>
                  <label className="text-on-surface-variant block mb-1 font-semibold">Target Value</label>
                  <input
                    type="number"
                    value={goalTarget}
                    onChange={e => setGoalTarget(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-on-surface"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="text-on-surface-variant block mb-1 font-semibold">Period</label>
                <select
                  value={goalPeriod}
                  onChange={e => setGoalPeriod(e.target.value as any)}
                  className="w-full p-2.5 rounded-xl bg-white/[0.04] border border-white/[0.08] text-on-surface font-semibold"
                >
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                </select>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowCreateGoalModal(false)}
                className="flex-1 py-2.5 rounded-xl bg-white/[0.06] text-on-surface font-semibold text-xs"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 py-2.5 rounded-xl bg-primary text-black font-headline font-bold text-xs shadow-md shadow-primary/20"
              >
                Create Goal
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
