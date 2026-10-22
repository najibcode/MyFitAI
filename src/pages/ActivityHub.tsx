// ─────────────────────────────────────────────────────────────
// MyFitAI — Activity, GPS & Territory Engine Master Hub
// Athletic Personal Operating System UI/UX
// ─────────────────────────────────────────────────────────────

import { useState, useMemo } from 'react';
import { useActivity } from '../context/ActivityContext';
import { useHealth } from '../context/HealthContext';
import { useFitnessContext } from '../context/FitnessContext';
import ConnectHealthModal from '../components/health/ConnectHealthModal';
import ManualHealthEntryModal from '../components/health/ManualHealthEntryModal';
import HealthDiagnosticModal from '../components/health/HealthDiagnosticModal';
import StepHistoryChart from '../components/health/StepHistoryChart';
import SleepHistoryChart from '../components/health/SleepHistoryChart';
import { formatMinutesToHours, formatHealthSourceLabel } from '../engine/healthCalculations';
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
import { RollingCounter } from '../components/motion/RollingCounter';
import { AnimatedProgressBar } from '../components/motion/AnimatedProgressBar';
import { ActivityCountdownModal } from '../components/motion/ActivityCountdownModal';
import {
  Activity as ActivityIcon,
  MapPin,
  History,
  TrendingUp,
  Trophy,
  Footprints,
  Bike,
  Mountain,
  Shield,
  Cloud,
  Plus,
  X,
  ChevronRight,
  Award,
  Moon,
  RefreshCw,
} from 'lucide-react';

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
    dailyActivityState,
    requestStepPermission,
  } = useActivity();

  const { status: healthStatus, todayHealth, weeklySteps, weeklySleep, syncNow } = useHealth();
  const { profile } = useFitnessContext();

  const [activeTab, setActiveTab] = useState<'today' | 'track' | 'map' | 'history' | 'analytics' | 'goals'>('today');
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showManualModal, setShowManualModal] = useState(false);
  const [showCreateGoalModal, setShowCreateGoalModal] = useState(false);
  const [showConnectHealthModal, setShowConnectHealthModal] = useState(false);
  const [showManualHealthModal, setShowManualHealthModal] = useState(false);
  const [showDiagnosticModal, setShowDiagnosticModal] = useState(false);
  const [manualHealthTab, setManualHealthTab] = useState<'steps' | 'sleep'>('steps');

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

  // Quick Start Handler with Athletic 3-2-1-GO Countdown
  const [countdownState, setCountdownState] = useState<{ isOpen: boolean; type: ActivityType | null }>({
    isOpen: false,
    type: null,
  });

  const handleQuickStart = (type: ActivityType) => {
    setCountdownState({ isOpen: true, type });
  };

  const handleCountdownComplete = async () => {
    if (countdownState.type) {
      await startTracking(countdownState.type);
    }
    setCountdownState({ isOpen: false, type: null });
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

  // Activity type icon resolver
  const renderActivityIcon = (type: ActivityType | string, className = 'w-5 h-5') => {
    switch (type) {
      case 'RUN':
        return <ActivityIcon className={className} />;
      case 'WALK':
        return <Footprints className={className} />;
      case 'CYCLING':
        return <Bike className={className} />;
      case 'HIKING':
        return <Mountain className={className} />;
      default:
        return <ActivityIcon className={className} />;
    }
  };

  // Achievement badge icon resolver
  const renderAchievementIcon = (_iconStr: string, isUnlocked: boolean) => {
    const iconClass = `w-5 h-5 ${isUnlocked ? 'text-[#30D158]' : 'text-[#6B6B70]'}`;
    return <Award className={iconClass} />;
  };

  return (
    <div className="w-full max-w-4xl mx-auto px-3.5 sm:px-4 pt-4 pb-28 space-y-5 sm:space-y-6 animate-fade-in min-w-0 box-border">
      {/* ── Active GPS Overlay if running ── */}
      {activeSession && <LiveActivityTracker />}

      {/* ── Header ── */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-[#A1A1A6] block">
            GPS · ACTIVITY · TERRITORY ENGINE
          </span>
          <h1 className="font-headline font-black text-2xl sm:text-3xl text-[#F5F5F5] tracking-tight truncate">
            Activity Hub
          </h1>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {/* Territory Level Badge */}
          <div className="px-3 py-1.5 rounded-xl bg-[#151517] border border-[#2A2A2D] flex items-center gap-1.5 shadow-sm">
            <Shield className="w-3.5 h-3.5 text-[#30D158]" />
            <span className="font-headline font-bold text-xs text-[#F5F5F5] uppercase tracking-wide">
              Lvl {territoryStats.level} · {territoryStats.levelName}
            </span>
          </div>

          <button
            onClick={() => setShowExportModal(true)}
            className="w-10 h-10 rounded-xl bg-[#151517] border border-[#2A2A2D] text-[#A1A1A6] hover:text-[#F5F5F5] flex items-center justify-center transition-colors active:scale-95 shadow-sm"
            title="Data & Cloud Sync"
          >
            <Cloud className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ── Primary Navigation Tabs ── */}
      <div className="flex p-1 bg-[#151517] rounded-xl border border-[#2A2A2D]">
        {[
          { id: 'today', label: 'Today', icon: Footprints },
          { id: 'track', label: 'Track', icon: ActivityIcon },
          { id: 'map', label: 'Territory', icon: MapPin },
          { id: 'history', label: 'History', icon: History },
          { id: 'analytics', label: 'Trends', icon: TrendingUp },
          { id: 'goals', label: 'Badges', icon: Trophy },
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex-1 py-2.5 rounded-lg text-xs font-headline font-bold transition-all flex items-center justify-center gap-1.5 ${
                isActive
                  ? 'bg-[#1E1E20] text-[#30D158] border border-[#30D158]/30 shadow-sm'
                  : 'text-[#A1A1A6] hover:text-[#F5F5F5]'
              }`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* ═══════════════════════════════════════════════════════
          TAB 0: TODAY (Health Connect / HealthKit Real-Time Sync)
      ═══════════════════════════════════════════════════════ */}
      {activeTab === 'today' && (
        <div className="space-y-6">
          {/* Health Integration Status & Quick Sync Bar */}
          <section className="bg-[#151517] border border-[#2A2A2D] rounded-3xl p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-md">
            <div className="flex items-center gap-3">
              <div
                className={`w-3 h-3 rounded-full shrink-0 ${
                  healthStatus.isConnected
                    ? 'bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.6)] animate-pulse'
                    : 'bg-amber-400'
                }`}
              />
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-headline font-bold text-[#F5F5F5]">
                    {healthStatus.isConnected
                      ? `${healthStatus.platformName} Integration`
                      : 'Health Data Disconnected'}
                  </span>
                  <span className="text-[10px] font-mono font-medium text-[#A1A1A6]">
                    {healthStatus.isConnected
                      ? healthStatus.lastSyncedAt
                        ? `Synced ${healthStatus.lastSyncedAt}`
                        : 'Connected'
                      : 'Not connected'}
                  </span>
                </div>
                <p className="text-[11px] text-[#A1A1A6]">
                  {healthStatus.isConnected
                    ? 'Automatically importing steps, sleep, and recovery data.'
                    : 'Connect Health Connect or Apple Health to import your daily metrics.'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 self-stretch sm:self-auto justify-end">
              {healthStatus.isConnected ? (
                <>
                  <button
                    onClick={() => syncNow()}
                    disabled={healthStatus.isSyncing}
                    className="p-2.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-[#F5F5F5] transition-colors active:scale-95 disabled:opacity-50"
                    title="Refresh Health Data"
                    aria-label="Refresh"
                  >
                    <RefreshCw className={`w-4 h-4 ${healthStatus.isSyncing ? 'animate-spin text-[#30D158]' : ''}`} />
                  </button>
                  <button
                    onClick={() => setShowConnectHealthModal(true)}
                    className="px-3.5 py-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-[#F5F5F5] text-xs font-headline font-bold transition-colors"
                  >
                    Manage
                  </button>
                </>
              ) : (
                <button
                  onClick={() => setShowConnectHealthModal(true)}
                  className="px-4 py-2 rounded-xl bg-[#30D158] hover:bg-[#30D158]/90 text-black text-xs font-headline font-black uppercase tracking-wider transition-all shadow-md shadow-[#30D158]/20"
                >
                  Connect Health
                </button>
              )}

              <button
                onClick={() => {
                  setManualHealthTab('steps');
                  setShowManualHealthModal(true);
                }}
                className="px-3 py-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-[#A1A1A6] hover:text-[#F5F5F5] text-xs font-headline font-bold transition-colors"
              >
                Manual
              </button>
            </div>
          </section>

          {/* Error Message if synchronization issue occurs */}
          {healthStatus.error && !healthStatus.isConnected && (
            <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-200 text-xs flex items-center justify-between gap-3">
              <span>{healthStatus.error}</span>
              <button
                onClick={() => setShowConnectHealthModal(true)}
                className="px-3 py-1 rounded-lg bg-amber-400 text-black font-bold uppercase tracking-wider text-[10px] shrink-0"
              >
                Reconnect
              </button>
            </div>
          )}

          {/* ─────────────────────────────────────────────────────────────
              TODAY'S ACTIVITY (STEP & SLEEP CARDS)
             ───────────────────────────────────────────────────────────── */}
          <div>
            <h2 className="text-xs font-headline font-black uppercase tracking-[0.2em] text-[#A1A1A6] mb-3">
              Today's Activity
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* ── CARD 1: STEPS ── */}
              <div className="bg-[#151517] border border-[#2A2A2D] rounded-3xl p-5 sm:p-6 space-y-5 relative overflow-hidden shadow-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                      <Footprints className="w-5 h-5 text-emerald-400" />
                    </div>
                    <div>
                      <span className="text-[10px] font-headline font-black uppercase tracking-wider text-[#A1A1A6] block">
                        Daily Activity
                      </span>
                      <h3 className="font-headline font-black text-lg text-[#F5F5F5]">
                        Steps
                      </h3>
                    </div>
                  </div>

                  <span className="px-2.5 py-1 rounded-full bg-white/[0.04] border border-white/[0.06] text-[10px] font-mono text-[#A1A1A6] flex items-center gap-1.5">
                    {dailyActivityState.source === 'phone_sensor' && dailyActivityState.isTracking ? (
                      <>
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                        <span className="text-emerald-400 font-semibold">Motion Sensor • Live</span>
                      </>
                    ) : dailyActivityState.source === 'health_reconciled' ? (
                      <>
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                        <span className="text-blue-400 font-semibold">Health Connect • Synced</span>
                      </>
                    ) : todayHealth?.source ? (
                      formatHealthSourceLabel(todayHealth.source)
                    ) : (
                      'Pedometer Engine'
                    )}
                  </span>
                </div>

                {/* Hardware Motion Sensor Permission Prompt */}
                {dailyActivityState.isAvailable && !dailyActivityState.hasPermission && (
                  <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <Footprints className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span className="text-xs text-[#F5F5F5] font-medium">Enable real-time phone step sensor</span>
                    </div>
                    <button
                      onClick={() => requestStepPermission()}
                      className="px-3 py-1.5 rounded-xl bg-emerald-500 text-black text-xs font-headline font-bold uppercase tracking-wider shrink-0 active:scale-95 transition-transform"
                    >
                      Enable
                    </button>
                  </div>
                )}

                {((dailyActivityState.dailySteps > 0 ? dailyActivityState.dailySteps : (todayHealth?.steps || 0)) > 0) ? (
                  <>
                    {/* Big Numbers with RollingCounter */}
                    <div className="flex items-baseline justify-between">
                      <div>
                        <span className="font-headline font-black text-3xl sm:text-4xl text-[#F5F5F5] tabular-nums">
                          <RollingCounter
                            value={dailyActivityState.dailySteps > 0 ? dailyActivityState.dailySteps : (todayHealth?.steps || 0)}
                          />
                        </span>
                        <span className="text-xs text-[#A1A1A6] ml-2">
                          / {(dailyActivityState.stepGoal || todayHealth?.stepGoal || profile.dailyStepGoal || 10000).toLocaleString()}
                        </span>
                      </div>
                      <span className="font-headline font-black text-lg text-[#30D158] tabular-nums">
                        {Math.min(
                          100,
                          Math.round(
                            ((dailyActivityState.dailySteps > 0 ? dailyActivityState.dailySteps : (todayHealth?.steps || 0)) /
                              (dailyActivityState.stepGoal || todayHealth?.stepGoal || profile.dailyStepGoal || 10000)) *
                              100
                          )
                        )}%
                      </span>
                    </div>

                    {/* Strava-Inspired Animated Progress Bar */}
                    <AnimatedProgressBar
                      current={dailyActivityState.dailySteps > 0 ? dailyActivityState.dailySteps : (todayHealth?.steps || 0)}
                      target={dailyActivityState.stepGoal || todayHealth?.stepGoal || profile.dailyStepGoal || 10000}
                      barColor="from-emerald-500 to-[#30D158]"
                      height={10}
                    />

                    {/* Sub-metrics: Distance, Active Calories, Goal */}
                    <div className="grid grid-cols-3 gap-2 pt-3 border-t border-[#2A2A2D] text-xs">
                      <div>
                        <span className="text-[10px] uppercase font-bold text-[#6B6B70] block">Distance</span>
                        <span className="font-headline font-bold text-[#F5F5F5] tabular-nums">
                          {dailyActivityState.distanceMeters > 0
                            ? `${(dailyActivityState.distanceMeters / 1000).toFixed(2)} km`
                            : todayHealth?.distanceKm !== null && todayHealth?.distanceKm !== undefined
                            ? `${todayHealth.distanceKm} km`
                            : 'Not available'}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] uppercase font-bold text-[#6B6B70] block">Active Calories</span>
                        <span className="font-headline font-bold text-[#F5F5F5] tabular-nums">
                          {dailyActivityState.activeMinutes > 0
                            ? `${dailyActivityState.activeMinutes * 4} kcal`
                            : todayHealth?.activeCalories !== null && todayHealth?.activeCalories !== undefined
                            ? `${todayHealth.activeCalories} kcal`
                            : 'Not available'}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] uppercase font-bold text-[#6B6B70] block">Target Goal</span>
                        <span className="font-headline font-bold text-[#30D158] tabular-nums">
                          {(dailyActivityState.stepGoal || todayHealth?.stepGoal || profile.dailyStepGoal || 10000).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="py-6 text-center space-y-3">
                    <p className="text-xs text-[#A1A1A6] max-w-xs mx-auto">
                      {dailyActivityState.isTracking
                        ? 'Motion sensor active. Start walking to see your live step count update in real time.'
                        : healthStatus.isConnected
                        ? `No step records found yet today from ${healthStatus.platformName}. Take a walk or refresh sync.`
                        : 'Step tracking ready. Enable device motion sensor or connect health source to track steps.'}
                    </p>
                    <div className="flex justify-center gap-2">
                      {dailyActivityState.isAvailable && !dailyActivityState.hasPermission ? (
                        <button
                          onClick={() => requestStepPermission()}
                          className="px-4 py-2 rounded-xl bg-emerald-500 text-black font-headline font-bold text-xs uppercase tracking-wider"
                        >
                          Enable Sensor
                        </button>
                      ) : healthStatus.isConnected ? (
                        <>
                          <button
                            onClick={() => syncNow()}
                            disabled={healthStatus.isSyncing}
                            className="px-4 py-2 rounded-xl bg-[#30D158] text-black font-headline font-bold text-xs uppercase tracking-wider active:scale-95 transition-transform"
                          >
                            Sync Now
                          </button>
                          <button
                            onClick={() => setShowDiagnosticModal(true)}
                            className="px-3 py-2 rounded-xl bg-white/[0.08] hover:bg-white/[0.12] text-[#F5F5F5] font-headline font-bold text-xs"
                            title="Inspect Health Connect sync status"
                          >
                            Diagnose
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={() => setShowConnectHealthModal(true)}
                          className="px-4 py-2 rounded-xl bg-[#30D158] text-black font-headline font-bold text-xs uppercase tracking-wider"
                        >
                          Connect Data
                        </button>
                      )}
                      <button
                        onClick={() => {
                          setManualHealthTab('steps');
                          setShowManualHealthModal(true);
                        }}
                        className="px-4 py-2 rounded-xl bg-white/[0.04] text-[#F5F5F5] font-headline font-bold text-xs"
                      >
                        Enter Manually
                      </button>
                    </div>

                    {healthStatus.isConnected && healthStatus.platform === 'android' && (
                      <div className="mt-3 p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-200 flex items-center justify-between gap-2 text-left">
                        <span>Using Samsung Galaxy? Samsung Health needs export permission.</span>
                        <button
                          onClick={() => setShowDiagnosticModal(true)}
                          className="text-amber-400 font-bold underline shrink-0 hover:text-amber-300"
                        >
                          Fix Sync
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* ── CARD 2: SLEEP ── */}
              <div className="bg-[#151517] border border-[#2A2A2D] rounded-3xl p-5 sm:p-6 space-y-5 relative overflow-hidden shadow-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-indigo-500/10 flex items-center justify-center">
                      <Moon className="w-5 h-5 text-indigo-400" />
                    </div>
                    <div>
                      <span className="text-[10px] font-headline font-black uppercase tracking-wider text-[#A1A1A6] block">
                        Rest & Recovery
                      </span>
                      <h3 className="font-headline font-black text-lg text-[#F5F5F5]">
                        Sleep Night
                      </h3>
                    </div>
                  </div>

                  {todayHealth?.sleepScore !== undefined && (
                    <span className="px-2.5 py-1 rounded-full bg-indigo-500/20 border border-indigo-500/30 text-[10px] font-headline font-black text-indigo-300">
                      Score {todayHealth.sleepScore}
                    </span>
                  )}
                </div>

                {todayHealth && todayHealth.sleepDurationMinutes > 0 ? (
                  <>
                    {/* Big Numbers */}
                    <div className="flex items-baseline justify-between">
                      <div>
                        <span className="font-headline font-black text-3xl sm:text-4xl text-[#F5F5F5] tabular-nums">
                          {formatMinutesToHours(todayHealth.sleepDurationMinutes)}
                        </span>
                        <span className="text-xs text-[#A1A1A6] ml-2">
                          / {profile.dailySleepGoal || 8}h goal
                        </span>
                      </div>
                      <span className="font-headline font-black text-lg text-indigo-400 tabular-nums">
                        {Math.min(100, Math.round((todayHealth.sleepDurationMinutes / ((profile.dailySleepGoal || 8) * 60)) * 100))}%
                      </span>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full bg-white/[0.04] h-2.5 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all duration-700"
                        style={{
                          width: `${Math.min(100, (todayHealth.sleepDurationMinutes / ((profile.dailySleepGoal || 8) * 60)) * 100)}%`,
                        }}
                      />
                    </div>

                    {/* Sleep Stages Breakdown (Only display when provided by source - Requirement 10) */}
                    <div className="pt-3 border-t border-[#2A2A2D] space-y-1.5 text-xs">
                      <div className="flex justify-between items-center text-[10px] uppercase font-bold text-[#6B6B70]">
                        <span>Sleep Stages</span>
                        {todayHealth.source && (
                          <span className="font-mono text-[#A1A1A6]">
                            {formatHealthSourceLabel(todayHealth.source)}
                          </span>
                        )}
                      </div>

                      {todayHealth.sleepStages ? (
                        <div className="grid grid-cols-4 gap-1.5 pt-1">
                          <div className="p-2 rounded-xl bg-white/[0.02] border border-white/[0.04] text-center">
                            <span className="text-[9px] uppercase text-[#6B6B70] block">Deep</span>
                            <span className="font-bold text-[#F5F5F5] tabular-nums text-[11px]">
                              {formatMinutesToHours(todayHealth.sleepStages.deep || 0)}
                            </span>
                          </div>
                          <div className="p-2 rounded-xl bg-white/[0.02] border border-white/[0.04] text-center">
                            <span className="text-[9px] uppercase text-[#6B6B70] block">Light</span>
                            <span className="font-bold text-[#F5F5F5] tabular-nums text-[11px]">
                              {formatMinutesToHours(todayHealth.sleepStages.light || 0)}
                            </span>
                          </div>
                          <div className="p-2 rounded-xl bg-white/[0.02] border border-white/[0.04] text-center">
                            <span className="text-[9px] uppercase text-[#6B6B70] block">REM</span>
                            <span className="font-bold text-[#F5F5F5] tabular-nums text-[11px]">
                              {formatMinutesToHours(todayHealth.sleepStages.rem || 0)}
                            </span>
                          </div>
                          <div className="p-2 rounded-xl bg-white/[0.02] border border-white/[0.04] text-center">
                            <span className="text-[9px] uppercase text-[#6B6B70] block">Awake</span>
                            <span className="font-bold text-[#A1A1A6] tabular-nums text-[11px]">
                              {formatMinutesToHours(todayHealth.sleepStages.awake || 0)}
                            </span>
                          </div>
                        </div>
                      ) : (
                        <p className="text-[11px] text-[#6B6B70] italic">
                          Granular stages not reported by source device. Total duration recorded.
                        </p>
                      )}
                    </div>
                  </>
                ) : (
                  <div className="py-6 text-center space-y-3">
                    <p className="text-xs text-[#A1A1A6] max-w-xs mx-auto">
                      {healthStatus.isConnected
                        ? `No sleep records found yet today from ${healthStatus.platformName}.`
                        : 'No sleep data available. Connect Apple Health or Health Connect to automatically import sleep.'}
                    </p>
                    <div className="flex justify-center gap-2">
                      {healthStatus.isConnected ? (
                        <>
                          <button
                            onClick={() => syncNow()}
                            disabled={healthStatus.isSyncing}
                            className="px-4 py-2 rounded-xl bg-indigo-500 text-white font-headline font-bold text-xs uppercase tracking-wider active:scale-95 transition-transform"
                          >
                            Sync Now
                          </button>
                          <button
                            onClick={() => setShowDiagnosticModal(true)}
                            className="px-3 py-2 rounded-xl bg-white/[0.08] hover:bg-white/[0.12] text-[#F5F5F5] font-headline font-bold text-xs"
                            title="Inspect Health Connect sync status"
                          >
                            Diagnose
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={() => setShowConnectHealthModal(true)}
                          className="px-4 py-2 rounded-xl bg-indigo-500 text-white font-headline font-bold text-xs uppercase tracking-wider"
                        >
                          Connect Data
                        </button>
                      )}
                      <button
                        onClick={() => {
                          setManualHealthTab('sleep');
                          setShowManualHealthModal(true);
                        }}
                        className="px-4 py-2 rounded-xl bg-white/[0.04] text-[#F5F5F5] font-headline font-bold text-xs"
                      >
                        Enter Manually
                      </button>
                    </div>

                    {healthStatus.isConnected && healthStatus.platform === 'android' && (
                      <div className="mt-3 p-2.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-[11px] text-indigo-200 flex items-center justify-between gap-2 text-left">
                        <span>Using Galaxy Watch / Samsung Health? Link to Health Connect to see sleep.</span>
                        <button
                          onClick={() => setShowDiagnosticModal(true)}
                          className="text-indigo-400 font-bold underline shrink-0 hover:text-indigo-300"
                        >
                          Fix Sync
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ─────────────────────────────────────────────────────────────
              WEEKLY ACTIVITY (HISTORICAL CHARTS)
             ───────────────────────────────────────────────────────────── */}
          <div className="space-y-4">
            <h2 className="text-xs font-headline font-black uppercase tracking-[0.2em] text-[#A1A1A6]">
              Weekly Activity
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <StepHistoryChart
                history={weeklySteps}
                userGoal={profile.dailyStepGoal || 10000}
              />
              <SleepHistoryChart
                history={weeklySleep}
                userGoalHours={profile.dailySleepGoal || 8}
              />
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════
          TAB 1: TRACK (Home Dashboard & 1-Tap Quick Start)
      ═══════════════════════════════════════════════════════ */}
      {activeTab === 'track' && (
        <div className="space-y-6">
          {/* Quick Start Buttons Grid */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-[#A1A1A6]">
                Launch Quick Session
              </span>
              <button
                onClick={() => setShowManualModal(true)}
                className="text-xs font-bold text-[#FF8A00] hover:underline flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                Manual Log
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { type: 'RUN', icon: ActivityIcon, label: 'Outdoor Run', color: '#FF8A00', isPrimary: true },
                { type: 'WALK', icon: Footprints, label: 'Walking', color: '#4F9CF9', isPrimary: false },
                { type: 'CYCLING', icon: Bike, label: 'Cycling', color: '#30D158', isPrimary: false },
                { type: 'HIKING', icon: Mountain, label: 'Hiking', color: '#A78BFA', isPrimary: false },
              ].map(item => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.type}
                    onClick={() => handleQuickStart(item.type as ActivityType)}
                    className={`p-4 rounded-2xl border text-left transition-all active:scale-95 group shadow-sm flex flex-col justify-between h-28 ${
                      item.isPrimary
                        ? 'bg-gradient-to-br from-[#1E1E20] to-[#151517] border-[#FF8A00]/40 hover:border-[#FF8A00]'
                        : 'bg-[#151517] border-[#2A2A2D] hover:border-[#3E3E42]'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center transition-transform group-hover:scale-105"
                        style={{ backgroundColor: `${item.color}15`, color: item.color }}
                      >
                        <Icon className="w-5 h-5" />
                      </div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[#6B6B70] group-hover:text-[#F5F5F5] transition-colors">
                        START →
                      </span>
                    </div>
                    <div>
                      <span className="font-headline font-black text-sm text-[#F5F5F5] block">
                        {item.label}
                      </span>
                      <span className="text-[10px] text-[#A1A1A6]">Tap to record GPS</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* This Week Sports Metrics Hero */}
          <div className="bg-[#151517] rounded-3xl p-6 border border-[#2A2A2D] space-y-5">
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold uppercase tracking-wider text-[#A1A1A6]">
                This Week's Training Volume
              </span>
              <span className="text-xs font-bold text-[#30D158] font-mono">
                {weeklySummary.count} activities logged
              </span>
            </div>

            <div className="flex items-baseline gap-3">
              <span className="font-headline font-black text-4xl sm:text-5xl text-[#F5F5F5] tracking-tight tabular-nums">
                {formatDistance(weeklySummary.distanceMeters, preferences.unitSystem)}
              </span>
              <span className="text-[#A1A1A6] text-xl font-bold font-mono">
                / {formatDuration(weeklySummary.durationSeconds)}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-3 pt-4 border-t border-[#2A2A2D]">
              <div>
                <span className="text-[10px] text-[#A1A1A6] font-medium uppercase tracking-wider block">Elevation</span>
                <span className="font-headline font-black text-base text-[#30D158] font-mono">
                  +{weeklySummary.elevationGainMeters} m
                </span>
              </div>
              <div>
                <span className="text-[10px] text-[#A1A1A6] font-medium uppercase tracking-wider block">Calories</span>
                <span className="font-headline font-black text-base text-[#F5C542] font-mono">
                  {weeklySummary.calories} kcal
                </span>
              </div>
              <div>
                <span className="text-[10px] text-[#A1A1A6] font-medium uppercase tracking-wider block">Territory</span>
                <span className="font-headline font-black text-base text-[#4F9CF9] font-mono">
                  {territoryStats.totalAreaKm2} km²
                </span>
              </div>
            </div>
          </div>

          {/* Territory Snapshot Widget */}
          <div className="bg-[#151517] rounded-3xl p-6 border border-[#2A2A2D] space-y-4">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2.5">
                <Shield className="w-5 h-5 text-[#30D158]" />
                <h3 className="font-headline font-bold text-sm text-[#F5F5F5] uppercase tracking-wide">
                  Territory & Level Progress
                </h3>
              </div>
              <span className="text-xs font-black text-[#30D158] font-headline uppercase tracking-wider">
                {territoryStats.levelName}
              </span>
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="text-[#A1A1A6]">XP Progress</span>
                <span className="text-[#F5F5F5] font-bold font-mono">
                  {territoryStats.xp} XP
                </span>
              </div>
              <div className="w-full bg-[#1E1E20] h-2 rounded-full overflow-hidden border border-[#2A2A2D]">
                <div
                  className="bg-[#30D158] h-full rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, (territoryStats.xp % 1000) / 10)}%` }}
                />
              </div>
            </div>

            <div className="flex flex-wrap justify-between items-center gap-2 text-xs pt-2 text-[#A1A1A6] border-t border-[#2A2A2D]">
              <span>{territoryStats.totalCapturedCount} cells captured</span>
              <span>{territoryStats.totalDefendedCount} defenses</span>
              <button
                onClick={() => setActiveTab('map')}
                className="text-[#30D158] font-bold hover:underline ml-auto"
              >
                View Territory Map →
              </button>
            </div>
          </div>

          {/* Recent Activities List (Quick Feed) */}
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#A1A1A6]">
                Recent Sessions
              </h3>
              <button
                onClick={() => setActiveTab('history')}
                className="text-[#30D158] text-xs font-bold hover:underline"
              >
                See all ({activities.length}) →
              </button>
            </div>

            {activities.slice(0, 5).map(act => (
              <div
                key={act.id}
                onClick={() => setSelectedActivity(act)}
                className="bg-[#151517] hover:bg-[#1E1E20] p-4 rounded-2xl border border-[#2A2A2D] flex items-center justify-between cursor-pointer transition-all active:scale-[0.99] shadow-sm"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#1E1E20] border border-[#2A2A2D] flex items-center justify-center text-[#30D158]">
                    {renderActivityIcon(act.type)}
                  </div>
                  <div>
                    <h4 className="font-headline font-bold text-sm text-[#F5F5F5]">{act.title}</h4>
                    <span className="text-[11px] text-[#A1A1A6]">
                      {new Date(act.startTime).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                      })}{' '}
                      · {formatDuration(act.durationSeconds)}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <span className="font-headline font-black text-sm text-[#F5F5F5] block font-mono">
                      {formatDistance(act.distanceMeters, preferences.unitSystem)}
                    </span>
                    <span className="text-[11px] text-[#30D158] font-medium font-mono">
                      {formatPace(act.averagePaceSecondsPerKm, preferences.unitSystem)}
                    </span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-[#6B6B70]" />
                </div>
              </div>
            ))}

            {activities.length === 0 && (
              <div className="bg-[#151517] rounded-2xl p-8 text-center text-[#A1A1A6] space-y-2 border border-[#2A2A2D]">
                <ActivityIcon className="w-8 h-8 text-[#6B6B70] mx-auto" />
                <p className="text-sm font-semibold text-[#F5F5F5]">No GPS activities logged yet</p>
                <p className="text-xs text-[#A1A1A6]">Tap Outdoor Run or Walking above to start your first tracked session!</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════
          TAB 2: TERRITORY MAP (Interactive Geospatial View)
      ═══════════════════════════════════════════════════════ */}
      {activeTab === 'map' && (
        <div className="space-y-5">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="font-headline font-bold text-xl text-[#F5F5F5]">Your Territory</h2>
              <p className="text-xs text-[#A1A1A6]">
                Every completed route captures grid cells. Re-run your routes to defend them!
              </p>
            </div>
            <div className="text-right">
              <span className="font-headline font-black text-2xl text-[#30D158] block font-mono">
                {territoryStats.totalAreaKm2} km²
              </span>
              <span className="text-[10px] text-[#A1A1A6] uppercase tracking-wider">Area Controlled</span>
            </div>
          </div>

          {/* Full Interactive MapView */}
          <div className="rounded-3xl overflow-hidden border border-[#2A2A2D] shadow-2xl">
            <MapView
              mode="territory"
              territoryCells={territoryCells}
              height={420}
              interactive={true}
              followUser={false}
              showTerritory={true}
              zoomLevel={14}
            />
          </div>

          {/* Territory Rules & Anti-Farming Legend */}
          <div className="bg-[#151517] rounded-2xl p-5 border border-[#2A2A2D] space-y-3">
            <h3 className="font-headline font-bold text-xs uppercase tracking-wider text-[#A1A1A6]">
              Territory Mechanics
            </h3>
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div className="flex items-center gap-2.5">
                <span className="w-3.5 h-3.5 rounded bg-[#30D158]/30 border border-[#30D158]" />
                <span className="text-[#F5F5F5] font-semibold">Captured Territory (Green)</span>
              </div>
              <div className="flex items-center gap-2.5">
                <span className="w-3.5 h-3.5 rounded bg-[#F5C542]/30 border border-[#F5C542]" />
                <span className="text-[#F5F5F5] font-semibold">Defended Territory (Gold)</span>
              </div>
            </div>
            <p className="text-[11px] text-[#A1A1A6] leading-relaxed pt-1 border-t border-[#2A2A2D]">
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
            <h2 className="font-headline font-bold text-xl text-[#F5F5F5]">Activity Log</h2>
            <button
              onClick={() => setShowManualModal(true)}
              className="px-3.5 py-1.5 rounded-xl bg-[#FF8A00] text-black text-xs font-headline font-bold flex items-center gap-1.5 transition-colors shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              Manual Log
            </button>
          </div>

          {/* Activity Type Filters */}
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
            {['ALL', 'RUN', 'WALK', 'CYCLING', 'HIKING'].map(filter => (
              <button
                key={filter}
                onClick={() => setHistoryFilter(filter)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                  historyFilter === filter
                    ? 'bg-[#30D158] text-black shadow-sm font-headline'
                    : 'bg-[#151517] text-[#A1A1A6] border border-[#2A2A2D] hover:text-[#F5F5F5]'
                }`}
              >
                {filter}
              </button>
            ))}
          </div>

          {/* Filtered Activities List */}
          <div className="space-y-3">
            {filteredActivities.map(act => (
              <div
                key={act.id}
                onClick={() => setSelectedActivity(act)}
                className="bg-[#151517] hover:bg-[#1E1E20] p-4 rounded-2xl border border-[#2A2A2D] cursor-pointer transition-all active:scale-[0.99] space-y-3"
              >
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-3">
                    <span className="w-9 h-9 rounded-xl bg-[#1E1E20] border border-[#2A2A2D] text-[#30D158] flex items-center justify-center">
                      {renderActivityIcon(act.type)}
                    </span>
                    <div>
                      <h4 className="font-headline font-bold text-sm text-[#F5F5F5]">{act.title}</h4>
                      <span className="text-[11px] text-[#A1A1A6]">
                        {new Date(act.startTime).toLocaleDateString('en-US', {
                          weekday: 'short',
                          month: 'short',
                          day: 'numeric',
                        })}
                      </span>
                    </div>
                  </div>
                  <span className="font-headline font-black text-base text-[#F5F5F5] font-mono">
                    {formatDistance(act.distanceMeters, preferences.unitSystem)}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-[#2A2A2D] text-xs">
                  <div>
                    <span className="text-[10px] text-[#A1A1A6] block uppercase tracking-wider">Duration</span>
                    <span className="font-mono text-[#F5F5F5] font-semibold">{formatDuration(act.durationSeconds)}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-[#A1A1A6] block uppercase tracking-wider">Pace</span>
                    <span className="text-[#30D158] font-mono font-semibold">{formatPace(act.averagePaceSecondsPerKm, preferences.unitSystem)}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-[#A1A1A6] block uppercase tracking-wider">Elevation</span>
                    <span className="text-[#30D158] font-mono font-semibold">+{act.elevationGainMeters} m</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-[#A1A1A6] block uppercase tracking-wider">Territory</span>
                    <span className="text-[#F5F5F5] font-mono font-semibold">+{act.territoryCapturedKm2 || 0} km²</span>
                  </div>
                </div>
              </div>
            ))}

            {filteredActivities.length === 0 && (
              <p className="text-center text-xs text-[#A1A1A6] py-10">
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
        <div className="space-y-5">
          <div className="flex justify-between items-center">
            <h2 className="font-headline font-bold text-xl text-[#F5F5F5]">Performance Trends</h2>
            {/* Period Selector */}
            <div className="flex p-1 bg-[#151517] rounded-xl border border-[#2A2A2D] text-[11px] font-bold">
              {(['7d', '30d', '90d', 'all'] as const).map(p => (
                <button
                  key={p}
                  onClick={() => setAnalyticsPeriod(p)}
                  className={`px-3 py-1 rounded-lg transition-all uppercase ${
                    analyticsPeriod === p
                      ? 'bg-[#1E1E20] text-[#30D158] font-headline border border-[#30D158]/30'
                      : 'text-[#A1A1A6] hover:text-[#F5F5F5]'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          {/* Metric Cards Grid */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-[#151517] rounded-2xl p-4 border border-[#2A2A2D]">
              <span className="text-[10px] text-[#A1A1A6] font-medium uppercase tracking-wider block">Total Distance</span>
              <span className="font-headline font-black text-2xl text-[#F5F5F5] font-mono">
                {analyticsData.totalDistKm.toFixed(1)} km
              </span>
              <span className="text-[10px] text-[#A1A1A6] block mt-1">Across {analyticsData.count} sessions</span>
            </div>
            <div className="bg-[#151517] rounded-2xl p-4 border border-[#2A2A2D]">
              <span className="text-[10px] text-[#A1A1A6] font-medium uppercase tracking-wider block">Total Time</span>
              <span className="font-headline font-black text-2xl text-[#F5F5F5] font-mono">
                {formatDuration(analyticsData.totalDurSec)}
              </span>
              <span className="text-[10px] text-[#A1A1A6] block mt-1">Active moving time</span>
            </div>
            <div className="bg-[#151517] rounded-2xl p-4 border border-[#2A2A2D]">
              <span className="text-[10px] text-[#A1A1A6] font-medium uppercase tracking-wider block">Elevation Climbed</span>
              <span className="font-headline font-black text-2xl text-[#30D158] font-mono">
                +{analyticsData.totalEleM} m
              </span>
              <span className="text-[10px] text-[#A1A1A6] block mt-1">Vertical gain</span>
            </div>
            <div className="bg-[#151517] rounded-2xl p-4 border border-[#2A2A2D]">
              <span className="text-[10px] text-[#A1A1A6] font-medium uppercase tracking-wider block">Calories Burned</span>
              <span className="font-headline font-black text-2xl text-[#FF8A00] font-mono">
                {analyticsData.totalCals}
              </span>
              <span className="text-[10px] text-[#A1A1A6] block mt-1">Estimated energy</span>
            </div>
          </div>

          {/* Personal Records Showcase */}
          <div className="bg-[#151517] rounded-3xl p-6 border border-[#2A2A2D] space-y-4">
            <div className="flex items-center gap-2">
              <Trophy className="w-5 h-5 text-amber-400" />
              <h3 className="font-headline font-bold text-sm text-[#F5F5F5] uppercase tracking-wide">
                Personal Records (PRs)
              </h3>
            </div>

            {personalRecords.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {personalRecords.map(pr => (
                  <div key={pr.id} className="p-3.5 rounded-xl bg-[#1E1E20] border border-[#2A2A2D]">
                    <span className="text-[10px] text-[#A1A1A6] uppercase font-bold tracking-wider block">
                      {pr.category.replace(/_/g, ' ')}
                    </span>
                    <span className="font-headline font-black text-lg text-amber-300 font-mono mt-0.5 block">
                      {pr.formattedValue}
                    </span>
                    <span className="text-[9px] text-[#6B6B70] block mt-0.5">{pr.date}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-xs text-[#A1A1A6] py-4">
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
        <div className="space-y-5">
          <div className="flex justify-between items-center">
            <h2 className="font-headline font-bold text-xl text-[#F5F5F5]">Goals & Achievements</h2>
            <button
              onClick={() => setShowCreateGoalModal(true)}
              className="px-3.5 py-1.5 rounded-xl bg-[#30D158] text-black text-xs font-headline font-bold flex items-center gap-1.5 active:scale-95 shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              New Goal
            </button>
          </div>

          {/* Active Goals Section */}
          <div className="space-y-3">
            {goals.map(g => {
              const currentVal = g.metric === 'distance' ? (g.currentValue / 1000).toFixed(1) : g.currentValue;
              const targetVal = g.metric === 'distance' ? (g.targetValue / 1000).toFixed(1) : g.targetValue;
              const unit = g.metric === 'distance' ? 'km' : 'acts';
              const progressPct = Math.min(100, Math.round((g.currentValue / (g.targetValue || 1)) * 100));

              return (
                <div key={g.id} className="bg-[#151517] rounded-2xl p-4 border border-[#2A2A2D] space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="font-headline font-bold text-sm text-[#F5F5F5]">{g.title}</span>
                    <span className="text-xs font-bold text-[#30D158] font-mono">{currentVal} / {targetVal} {unit}</span>
                  </div>
                  <div className="w-full bg-[#1E1E20] h-2 rounded-full overflow-hidden border border-[#2A2A2D]">
                    <div className="bg-[#30D158] h-full rounded-full transition-all" style={{ width: `${progressPct}%` }} />
                  </div>
                  <div className="flex justify-between text-[10px] text-[#A1A1A6]">
                    <span className="capitalize">{g.period} goal</span>
                    <span>Ends: {g.endDate}</span>
                  </div>
                </div>
              );
            })}

            {goals.length === 0 && (
              <div className="bg-[#151517] rounded-2xl p-6 text-center text-[#A1A1A6] text-xs space-y-1 border border-[#2A2A2D]">
                <p className="font-semibold text-[#F5F5F5]">No active goals set</p>
                <p>Set a weekly mileage or activity target to keep momentum!</p>
              </div>
            )}
          </div>

          {/* Achievements Grid */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#A1A1A6] mb-3">
              Badges & Milestones ({achievements.filter(a => a.progress >= a.maxProgress).length} / {achievements.length})
            </h3>
            <div className="grid grid-cols-2 gap-3">
              {achievements.map(ach => {
                const isUnlocked = ach.progress >= ach.maxProgress;
                return (
                  <div
                    key={ach.id}
                    className={`p-4 rounded-2xl border transition-all ${
                      isUnlocked
                        ? 'bg-[#151517] border-[#30D158]/40'
                        : 'bg-[#151517]/50 border-[#2A2A2D] opacity-40'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 mb-1.5">
                      {renderAchievementIcon(ach.icon, isUnlocked)}
                      <h4 className="font-headline font-bold text-xs text-[#F5F5F5]">{ach.title}</h4>
                    </div>
                    <p className="text-[10px] text-[#A1A1A6] leading-relaxed">{ach.description}</p>
                    {isUnlocked && (
                      <span className="inline-block mt-2.5 text-[9px] font-bold text-[#30D158] bg-[#30D158]/10 border border-[#30D158]/20 px-2 py-0.5 rounded-full">
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
            className="bg-[#151517] rounded-3xl max-w-sm w-full p-6 border border-[#2A2A2D] space-y-4"
          >
            <div className="flex justify-between items-center">
              <h3 className="font-headline font-bold text-lg text-[#F5F5F5]">Log Past Activity</h3>
              <button
                type="button"
                onClick={() => setShowManualModal(false)}
                className="w-8 h-8 rounded-full bg-[#1E1E20] text-[#A1A1A6] hover:text-[#F5F5F5] flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-[#A1A1A6] block mb-1 font-semibold">Activity Type</label>
                <select
                  value={manualType}
                  onChange={e => setManualType(e.target.value as ActivityType)}
                  className="w-full p-2.5 rounded-xl bg-[#1E1E20] border border-[#2A2A2D] text-[#F5F5F5] font-semibold"
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
                <label className="text-[#A1A1A6] block mb-1 font-semibold">Title (Optional)</label>
                <input
                  type="text"
                  placeholder="Morning Run"
                  value={manualTitle}
                  onChange={e => setManualTitle(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-[#1E1E20] border border-[#2A2A2D] text-[#F5F5F5]"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[#A1A1A6] block mb-1 font-semibold">Distance (km)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={manualDistanceKm}
                    onChange={e => setManualDistanceKm(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-[#1E1E20] border border-[#2A2A2D] text-[#F5F5F5] font-mono"
                    required
                  />
                </div>
                <div>
                  <label className="text-[#A1A1A6] block mb-1 font-semibold">Duration (mins)</label>
                  <input
                    type="number"
                    value={manualDurationMins}
                    onChange={e => setManualDurationMins(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-[#1E1E20] border border-[#2A2A2D] text-[#F5F5F5] font-mono"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="text-[#A1A1A6] block mb-1 font-semibold">Elevation Gain (m)</label>
                <input
                  type="number"
                  value={manualElevation}
                  onChange={e => setManualElevation(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-[#1E1E20] border border-[#2A2A2D] text-[#F5F5F5] font-mono"
                />
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowManualModal(false)}
                className="flex-1 py-2.5 rounded-xl bg-[#1E1E20] text-[#F5F5F5] font-semibold text-xs border border-[#2A2A2D]"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 py-2.5 rounded-xl bg-[#FF8A00] text-black font-headline font-bold text-xs shadow-md"
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
            className="bg-[#151517] rounded-3xl max-w-sm w-full p-6 border border-[#2A2A2D] space-y-4"
          >
            <div className="flex justify-between items-center">
              <h3 className="font-headline font-bold text-lg text-[#F5F5F5]">New Activity Goal</h3>
              <button
                type="button"
                onClick={() => setShowCreateGoalModal(false)}
                className="w-8 h-8 rounded-full bg-[#1E1E20] text-[#A1A1A6] hover:text-[#F5F5F5] flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-[#A1A1A6] block mb-1 font-semibold">Goal Name</label>
                <input
                  type="text"
                  value={goalTitle}
                  onChange={e => setGoalTitle(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-[#1E1E20] border border-[#2A2A2D] text-[#F5F5F5]"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[#A1A1A6] block mb-1 font-semibold">Metric</label>
                  <select
                    value={goalMetric}
                    onChange={e => setGoalMetric(e.target.value as any)}
                    className="w-full p-2.5 rounded-xl bg-[#1E1E20] border border-[#2A2A2D] text-[#F5F5F5] font-semibold"
                  >
                    <option value="distance">Distance (km)</option>
                    <option value="activities">Activity Count</option>
                  </select>
                </div>

                <div>
                  <label className="text-[#A1A1A6] block mb-1 font-semibold">Target Value</label>
                  <input
                    type="number"
                    value={goalTarget}
                    onChange={e => setGoalTarget(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-[#1E1E20] border border-[#2A2A2D] text-[#F5F5F5] font-mono"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="text-[#A1A1A6] block mb-1 font-semibold">Period</label>
                <select
                  value={goalPeriod}
                  onChange={e => setGoalPeriod(e.target.value as any)}
                  className="w-full p-2.5 rounded-xl bg-[#1E1E20] border border-[#2A2A2D] text-[#F5F5F5] font-semibold"
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
                className="flex-1 py-2.5 rounded-xl bg-[#1E1E20] text-[#F5F5F5] font-semibold text-xs border border-[#2A2A2D]"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 py-2.5 rounded-xl bg-[#30D158] text-black font-headline font-bold text-xs shadow-md"
              >
                Create Goal
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ── Native Health Connect & HealthKit Modals ── */}
      <ConnectHealthModal
        isOpen={showConnectHealthModal}
        onClose={() => setShowConnectHealthModal(false)}
      />

      <ManualHealthEntryModal
        isOpen={showManualHealthModal}
        onClose={() => setShowManualHealthModal(false)}
        initialTab={manualHealthTab}
      />

      <HealthDiagnosticModal
        isOpen={showDiagnosticModal}
        onClose={() => setShowDiagnosticModal(false)}
      />

      {/* ── Strava-Inspired 3-2-1-GO Athletic Activity Countdown ── */}
      <ActivityCountdownModal
        isOpen={countdownState.isOpen}
        activityTitle={
          countdownState.type
            ? countdownState.type === 'RUN'
              ? 'OUTDOOR RUN'
              : countdownState.type === 'WALK'
              ? 'WALKING'
              : countdownState.type === 'CYCLING'
              ? 'CYCLING'
              : countdownState.type
            : ''
        }
        onComplete={handleCountdownComplete}
        onCancel={() => setCountdownState({ isOpen: false, type: null })}
      />
    </div>
  );
}
