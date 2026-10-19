import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  RotateCw,
  Activity,
  Link,
  Edit2,
  ShieldCheck,
  Footprints,
  Moon,
  Droplets,
  Flame,
  Dumbbell,
} from 'lucide-react';
import { useFitnessContext } from '../context/FitnessContext';
import { useToast } from '../context/ToastContext';
import { useHealth } from '../context/HealthContext';
import {
  formatMinutesToHours,
  formatHealthSourceLabel,
  calculateDailyReadiness,
} from '../engine/healthCalculations';
import ConnectHealthModal from '../components/health/ConnectHealthModal';
import ManualHealthEntryModal from '../components/health/ManualHealthEntryModal';
import HealthDiagnosticModal from '../components/health/HealthDiagnosticModal';
import StepHistoryChart from '../components/health/StepHistoryChart';
import SleepHistoryChart from '../components/health/SleepHistoryChart';

export default function HealthHub() {
  const { dailyStats, profile } = useFitnessContext();
  const navigate = useNavigate();
  const { showToast } = useToast();

  const {
    todayHealth,
    hasAnyPermission,
    isSyncing,
    syncHealth,
    logManualSteps,
    weeklySteps,
    weeklySleep,
  } = useHealth();

  const [showConnectModal, setShowConnectModal] = useState(false);
  const [showManualModal, setShowManualModal] = useState(false);
  const [showDiagnosticModal, setShowDiagnosticModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'trends'>('overview');

  // Step calculations
  const effectiveSteps = todayHealth?.steps ?? (dailyStats.steps > 0 ? dailyStats.steps : 0);
  const hasStepData = todayHealth?.steps !== undefined || dailyStats.steps > 0;
  const stepGoal = todayHealth?.stepGoal ?? profile.dailyStepGoal ?? 10000;
  const stepPrc = stepGoal > 0 ? Math.min(100, Math.round((effectiveSteps / stepGoal) * 100)) : 0;
  const stepStrokeDash = (stepPrc / 100) * 251.2;

  // Sleep calculations
  const hasSleepData = todayHealth?.sleepDurationMinutes !== undefined && todayHealth.sleepDurationMinutes > 0;
  const sleepMinutes = todayHealth?.sleepDurationMinutes ?? (dailyStats.sleep ? Math.round(dailyStats.sleep * 60) : 0);
  const sleepGoalMinutes = todayHealth?.sleepGoalMinutes ?? (profile.dailySleepGoal ? profile.dailySleepGoal * 60 : 480);
  const sleepPrc = sleepGoalMinutes > 0 ? Math.min(100, Math.round((sleepMinutes / sleepGoalMinutes) * 100)) : 0;

  // Readiness (deterministic, based on sleep, recovery, steps)
  const readiness = calculateDailyReadiness({
    sleepDurationMinutes: sleepMinutes,
    sleepGoalMinutes,
    sleepScore: todayHealth?.sleepScore,
    muscleRecoveryPercentage: 85,
    steps: effectiveSteps,
    stepGoal,
  });

  const handleQuickAddSteps = async (count: number) => {
    await logManualSteps(effectiveSteps + count);
    showToast(`+${count.toLocaleString()} steps logged!`, 'success');
  };

  return (
    <main className="max-w-lg mx-auto px-4 sm:px-5 py-6 pb-32 space-y-5 bg-[#080808]">
      {/* Header */}
      <header className="flex items-center justify-between">
        <div>
          <p className="text-[#30D158] font-bold tracking-wider uppercase text-[10px] mb-1">
            Biometric Telemetry
          </p>
          <h1 className="font-bold text-2xl tracking-tight text-[#F5F5F5]">
            Health Hub
          </h1>
        </div>

        <div className="flex items-center gap-2">
          {hasAnyPermission ? (
            <>
              <button
                onClick={() => syncHealth()}
                disabled={isSyncing}
                className="w-10 h-10 rounded-xl bg-[#151517] hover:bg-[#1E1E20] border border-[#2A2A2D] text-[#A1A1A6] hover:text-[#F5F5F5] flex items-center justify-center transition-all active:scale-95 disabled:opacity-50 min-h-[44px]"
                title="Sync health data"
              >
                <RotateCw className={`w-4 h-4 ${isSyncing ? 'animate-spin text-[#30D158]' : ''}`} />
              </button>
              <button
                onClick={() => setShowDiagnosticModal(true)}
                className="w-10 h-10 rounded-xl bg-[#151517] hover:bg-[#1E1E20] border border-[#2A2A2D] text-[#30D158] flex items-center justify-center transition-all active:scale-95 min-h-[44px]"
                title="Health Sync Diagnostics"
              >
                <Activity className="w-4 h-4" />
              </button>
            </>
          ) : (
            <button
              onClick={() => setShowConnectModal(true)}
              className="px-3.5 py-2 bg-[#151517] border border-[#30D158]/30 text-[#30D158] rounded-xl font-bold text-xs uppercase tracking-wider flex items-center gap-1.5 active:scale-95 transition-all min-h-[44px]"
            >
              <Link className="w-3.5 h-3.5" />
              Connect
            </button>
          )}

          <button
            onClick={() => setShowManualModal(true)}
            className="w-10 h-10 rounded-xl bg-[#151517] hover:bg-[#1E1E20] border border-[#2A2A2D] text-[#A1A1A6] hover:text-[#F5F5F5] flex items-center justify-center transition-all active:scale-95 min-h-[44px]"
            title="Manual entry"
          >
            <Edit2 className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Tabs */}
      <div className="flex bg-[#151517] p-1 rounded-xl border border-[#2A2A2D]">
        <button
          onClick={() => setActiveTab('overview')}
          className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all min-h-[40px] ${
            activeTab === 'overview'
              ? 'bg-[#30D158] text-black shadow-sm'
              : 'text-[#A1A1A6] hover:text-[#F5F5F5]'
          }`}
        >
          Today's Biometrics
        </button>
        <button
          onClick={() => setActiveTab('trends')}
          className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all min-h-[40px] ${
            activeTab === 'trends'
              ? 'bg-[#30D158] text-black shadow-sm'
              : 'text-[#A1A1A6] hover:text-[#F5F5F5]'
          }`}
        >
          7-Day Trends
        </button>
      </div>

      {activeTab === 'trends' ? (
        <div className="space-y-5">
          <StepHistoryChart history={weeklySteps} userGoal={stepGoal} />
          <SleepHistoryChart history={weeklySleep} userGoalHours={profile.dailySleepGoal || 8} />
        </div>
      ) : (
        <>
          {/* Step Tracker Card */}
          <section className="bg-[#151517] rounded-2xl p-5 border border-[#2A2A2D] relative overflow-hidden">
            {/* Source label */}
            <div className="flex items-center justify-between text-[10px] text-[#A1A1A6] mb-4">
              <span className="font-bold uppercase tracking-wider">Daily Steps</span>
              <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#1E1E20] border border-[#2A2A2D]">
                <ShieldCheck className="w-3 h-3 text-[#30D158]" />
                Source: {formatHealthSourceLabel(todayHealth?.source || 'unknown')}
              </span>
            </div>

            <div className="flex items-center gap-5">
              <div className="relative w-24 h-24 flex-shrink-0">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    fill="transparent"
                    stroke="#1E1E20"
                    strokeWidth="8"
                  />
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    fill="transparent"
                    stroke="#30D158"
                    strokeWidth="8"
                    strokeLinecap="round"
                    strokeDasharray={`${stepStrokeDash} 251.2`}
                    className="transition-all duration-700"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <Footprints className="w-4 h-4 text-[#30D158]" />
                  <span className="font-mono tabular-nums font-bold text-sm text-[#F5F5F5] leading-none mt-1">
                    {stepPrc}%
                  </span>
                </div>
              </div>

              <div className="flex-1 min-w-0">
                {hasStepData ? (
                  <>
                    <p className="font-mono tabular-nums font-black text-2xl text-[#F5F5F5] tracking-tight truncate">
                      {effectiveSteps.toLocaleString()}
                    </p>
                    <p className="text-[#A1A1A6] text-xs font-medium mt-0.5 font-mono tabular-nums">
                      of {stepGoal.toLocaleString()} target
                    </p>
                  </>
                ) : (
                  <>
                    <p className="font-bold text-lg text-[#A1A1A6]">
                      Not available
                    </p>
                    <p className="text-[#A1A1A6] text-xs mt-0.5">
                      Connect Health Connect or Apple Health
                    </p>
                  </>
                )}

                <div className="flex items-center gap-3 text-[#A1A1A6] text-[11px] mt-2 pt-2 border-t border-[#2A2A2D] font-mono tabular-nums">
                  <span>
                    Distance:{' '}
                    <strong className="text-[#F5F5F5]">
                      {todayHealth?.distanceKm !== undefined && todayHealth?.distanceKm !== null
                        ? `${todayHealth.distanceKm.toFixed(1)} km`
                        : '—'}
                    </strong>
                  </span>
                  <span>•</span>
                  <span>
                    Active:{' '}
                    <strong className="text-[#F5F5F5]">
                      {todayHealth?.activeCalories !== undefined && todayHealth?.activeCalories !== null
                        ? `${todayHealth.activeCalories} kcal`
                        : '—'}
                    </strong>
                  </span>
                </div>
              </div>
            </div>

            {/* Quick adjust or manual entry */}
            <div className="flex gap-2 mt-4">
              {[1000, 2500, 5000].map(count => (
                <button
                  key={count}
                  onClick={() => handleQuickAddSteps(count)}
                  className="flex-1 min-h-[40px] bg-[#1E1E20] hover:bg-[#2A2A2D] text-[#F5F5F5] border border-[#2A2A2D] font-bold text-xs py-2 rounded-xl transition-colors active:scale-95 font-mono tabular-nums"
                >
                  +{(count / 1000).toFixed(count < 1000 ? 0 : 1)}k
                </button>
              ))}
              <button
                onClick={() => setShowManualModal(true)}
                className="w-11 min-h-[40px] bg-[#1E1E20] hover:bg-[#2A2A2D] border border-[#2A2A2D] text-[#30D158] rounded-xl flex items-center justify-center transition-colors active:scale-95"
                title="Edit Steps"
              >
                <Edit2 className="w-4 h-4" />
              </button>
            </div>
          </section>

          {/* Sleep Recovery Card */}
          <section className="bg-[#151517] rounded-2xl p-5 border border-[#2A2A2D] relative overflow-hidden">
            <div className="flex items-center justify-between text-[10px] text-[#A1A1A6] mb-4">
              <span className="font-bold uppercase tracking-wider">Sleep & Recovery</span>
              <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#1E1E20] border border-[#2A2A2D]">
                <Moon className="w-3 h-3 text-[#4F9CF9]" />
                Source: {formatHealthSourceLabel(todayHealth?.source || 'unknown')}
              </span>
            </div>

            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs text-[#A1A1A6] font-medium">Total Sleep</p>
                {hasSleepData ? (
                  <p className="font-mono tabular-nums font-black text-2xl text-[#4F9CF9] mt-0.5">
                    {formatMinutesToHours(sleepMinutes)}
                    <span className="text-xs font-normal text-[#A1A1A6] ml-2 font-mono tabular-nums">
                      / {formatMinutesToHours(sleepGoalMinutes)} ({sleepPrc}%)
                    </span>
                  </p>
                ) : (
                  <p className="font-bold text-base text-[#A1A1A6] mt-0.5">
                    No sleep recorded
                  </p>
                )}

                {todayHealth?.sleepStart && todayHealth?.sleepEnd && (
                  <p className="text-[11px] text-[#A1A1A6] mt-1 font-mono tabular-nums">
                    {new Date(todayHealth.sleepStart).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} →{' '}
                    {new Date(todayHealth.sleepEnd).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                )}
              </div>

              {todayHealth?.sleepScore !== undefined && (
                <div className="bg-[#1E1E20] border border-[#2A2A2D] rounded-xl p-2.5 text-center min-w-[64px]">
                  <p className="text-[9px] uppercase font-bold text-[#4F9CF9] tracking-wider">Score</p>
                  <p className="font-mono tabular-nums font-black text-xl text-[#F5F5F5] mt-0.5">{todayHealth.sleepScore}</p>
                </div>
              )}
            </div>

            {/* Sleep Stages (only if available) */}
            {todayHealth?.sleepStages && (
              <div className="mt-4 pt-3 border-t border-[#2A2A2D]">
                <p className="text-[10px] font-bold uppercase tracking-wider text-[#A1A1A6] mb-2">
                  Sleep Stages
                </p>
                <div className="grid grid-cols-4 gap-2 text-center font-mono tabular-nums">
                  <div className="bg-[#1E1E20] rounded-lg p-2 border border-[#2A2A2D]">
                    <p className="text-[9px] font-bold text-[#A78BFA] uppercase">Deep</p>
                    <p className="text-xs font-bold text-[#F5F5F5] mt-0.5">
                      {formatMinutesToHours(todayHealth.sleepStages.deep || 0)}
                    </p>
                  </div>
                  <div className="bg-[#1E1E20] rounded-lg p-2 border border-[#2A2A2D]">
                    <p className="text-[9px] font-bold text-[#4F9CF9] uppercase">Light</p>
                    <p className="text-xs font-bold text-[#F5F5F5] mt-0.5">
                      {formatMinutesToHours(todayHealth.sleepStages.light || 0)}
                    </p>
                  </div>
                  <div className="bg-[#1E1E20] rounded-lg p-2 border border-[#2A2A2D]">
                    <p className="text-[9px] font-bold text-[#30D158] uppercase">REM</p>
                    <p className="text-xs font-bold text-[#F5F5F5] mt-0.5">
                      {formatMinutesToHours(todayHealth.sleepStages.rem || 0)}
                    </p>
                  </div>
                  <div className="bg-[#1E1E20] rounded-lg p-2 border border-[#2A2A2D]">
                    <p className="text-[9px] font-bold text-[#A1A1A6] uppercase">Awake</p>
                    <p className="text-xs font-bold text-[#F5F5F5] mt-0.5">
                      {formatMinutesToHours(todayHealth.sleepStages.awake || 0)}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </section>

          {/* Biometrics Grid (Hydration, Calories, Exercise) */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-[#151517] rounded-xl p-3.5 border border-[#2A2A2D] flex flex-col gap-1.5">
              <Droplets className="w-4 h-4 text-[#4F9CF9]" />
              <div>
                <p className="font-mono tabular-nums font-bold text-lg text-[#F5F5F5]">
                  {dailyStats.water.toFixed(1)}
                  <span className="text-[10px] font-normal text-[#A1A1A6] ml-0.5">L</span>
                </p>
                <p className="text-[#A1A1A6] text-[9px] font-bold uppercase tracking-wider">Hydration</p>
              </div>
            </div>

            <div className="bg-[#151517] rounded-xl p-3.5 border border-[#2A2A2D] flex flex-col gap-1.5">
              <Flame className="w-4 h-4 text-[#FF453A]" />
              <div>
                <p className="font-mono tabular-nums font-bold text-lg text-[#F5F5F5]">
                  {todayHealth?.activeCalories ?? dailyStats.calories}
                  <span className="text-[10px] font-normal text-[#A1A1A6] ml-0.5">kcal</span>
                </p>
                <p className="text-[#A1A1A6] text-[9px] font-bold uppercase tracking-wider">Active Burn</p>
              </div>
            </div>

            <div className="bg-[#151517] rounded-xl p-3.5 border border-[#2A2A2D] flex flex-col gap-1.5">
              <Dumbbell className="w-4 h-4 text-[#FF8A00]" />
              <div>
                <p className="font-mono tabular-nums font-bold text-lg text-[#F5F5F5]">
                  {dailyStats.duration}
                  <span className="text-[10px] font-normal text-[#A1A1A6] ml-0.5">min</span>
                </p>
                <p className="text-[#A1A1A6] text-[9px] font-bold uppercase tracking-wider">Workout</p>
              </div>
            </div>
          </div>

          {/* Daily Readiness & Training Recommendation (Deterministic) */}
          <section className="bg-[#151517] p-5 rounded-2xl border border-[#2A2A2D]">
            <div className="flex items-center justify-between mb-3">
              <div>
                <span className="text-[9px] uppercase font-bold tracking-wider text-[#30D158] bg-[#30D158]/10 px-2 py-0.5 rounded-full border border-[#30D158]/20">
                  {readiness.rating}
                </span>
                <h3 className="font-bold text-base text-[#F5F5F5] tracking-tight mt-1">
                  Daily Readiness Score
                </h3>
              </div>
              <div className="w-12 h-12 relative flex-shrink-0">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                  <path
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    fill="none"
                    stroke="#1E1E20"
                    strokeWidth="3.5"
                  />
                  <path
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    fill="none"
                    stroke="#30D158"
                    strokeDasharray={`${readiness.score}, 100`}
                    strokeWidth="3.5"
                    strokeLinecap="round"
                  />
                </svg>
                <span className="absolute inset-0 flex items-center justify-center font-mono tabular-nums font-bold text-xs text-[#F5F5F5]">
                  {readiness.score}
                </span>
              </div>
            </div>

            <p className="text-[#A1A1A6] text-xs leading-relaxed mb-3">
              {readiness.statement}
            </p>

            <div className="p-3 bg-[#1E1E20] rounded-xl border border-[#2A2A2D] mb-4">
              <p className="text-[10px] font-bold uppercase tracking-wider text-[#30D158]">Training Recommendation</p>
              <p className="text-xs text-[#F5F5F5] font-medium mt-0.5">{readiness.trainingRecommendation}</p>
            </div>

            <button
              onClick={() => navigate('/workout')}
              className="w-full min-h-[44px] bg-[#30D158] hover:bg-[#30D158]/90 text-black font-bold py-3 rounded-xl uppercase tracking-wider text-xs transition-all active:scale-95 shadow-sm"
            >
              Start Today's Session
            </button>
          </section>
        </>
      )}

      {/* Modals */}
      <ConnectHealthModal
        isOpen={showConnectModal}
        onClose={() => setShowConnectModal(false)}
      />
      <ManualHealthEntryModal
        isOpen={showManualModal}
        onClose={() => setShowManualModal(false)}
      />
      <HealthDiagnosticModal
        isOpen={showDiagnosticModal}
        onClose={() => setShowDiagnosticModal(false)}
      />
    </main>
  );
}
