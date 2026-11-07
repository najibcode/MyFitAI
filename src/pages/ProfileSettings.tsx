// ─────────────────────────────────────────────────────────────
// MyFitAI — Athlete Profile & System Settings
// Athletic Personal Operating System UI/UX
// ─────────────────────────────────────────────────────────────

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useFitnessContext } from '../context/FitnessContext';
import OnboardingForm from '../components/OnboardingForm';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import { usePreferences } from '../context/PreferencesContext';
import { useGamification } from '../context/GamificationContext';
import ShareableMuscleCardModal from '../components/share/ShareableMuscleCardModal';
import {
  Target,
  ChevronRight,
  Share2,
  Flame,
  Dumbbell,
  Zap,
  Moon,
  UserCheck,
  Shield,
  LogOut,
  Sparkles,
  Settings as SettingsIcon,
} from 'lucide-react';
import { useHealth } from '../context/HealthContext';

import AthleteAvatar from '../components/brand/AthleteAvatar';

export default function ProfileSettings() {
  const { profile, dailyStats, activities } = useFitnessContext();
  const { weightUnit, heightUnit } = usePreferences();
  const { streak, longestStreak, level, levelTitle } = useGamification();
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const { showToast } = useToast();
  const { user, logout } = useAuth();
  const { todayHealth } = useHealth();
  const navigate = useNavigate();

  const effectiveSleepMinutes = todayHealth?.sleepDurationMinutes ?? (dailyStats.sleep ? Math.round(dailyStats.sleep * 60) : 0);

  const totalWorkouts = activities.filter(a => a.type === 'Workout').length;

  const displayWeight = weightUnit === 'kg' ? Math.round((profile.weight / 2.20462) * 10) / 10 : profile.weight;
  const displayTargetWeight =
    weightUnit === 'kg' ? Math.round((profile.targetWeight / 2.20462) * 10) / 10 : profile.targetWeight;
  const displayHeight = heightUnit === 'cm' ? Math.round(profile.height * 2.54) : profile.height;

  return (
    <main className="w-full max-w-4xl mx-auto px-3.5 sm:px-4 pt-4 pb-28 space-y-5 sm:space-y-6 animate-fade-in min-w-0 box-border">
      {/* ── Athlete Profile Hero ── */}
      <section className="bg-[#151517] rounded-3xl p-4 sm:p-8 border border-[#2A2A2D] flex flex-col sm:flex-row items-center sm:items-start gap-4 sm:gap-6 text-center sm:text-left w-full max-w-full overflow-hidden">
        <div className="relative shrink-0">
          <AthleteAvatar
            photoURL={(user as any)?.photoURL || (profile as any)?.photoURL}
            name={profile.name || (user as any)?.displayName || 'Athlete'}
            size={96}
            verified={true}
            className="border-2 border-[#2A2A2D] shadow-lg"
          />
        </div>

        <div className="flex-1 space-y-2 min-w-0 w-full">
          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
            <h1 className="font-headline text-xl sm:text-3xl font-black text-[#F5F5F5] tracking-tight truncate">
              {profile.name}
            </h1>
            <span className="px-2.5 py-0.5 rounded-full bg-[#30D158]/10 border border-[#30D158]/30 text-[10px] font-bold text-[#30D158] uppercase font-mono shrink-0">
              Lvl {level} · {levelTitle}
            </span>
          </div>

          <p className="text-xs text-[#A1A1A6] font-medium truncate">
            {profile.goal} · {displayWeight} {weightUnit} · BMI {profile.bmi}
          </p>

          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 sm:gap-4 pt-2 text-xs font-mono text-[#F5F5F5]">
            <span className="flex items-center gap-1.5 text-[#30D158] whitespace-nowrap">
              <Flame className="w-3.5 h-3.5 shrink-0" />
              <strong>{streak}</strong> DAY STREAK
            </span>
            <span className="text-[#6B6B70] hidden xs:inline">·</span>
            <span className="flex items-center gap-1.5 text-[#FF8A00] whitespace-nowrap">
              <Dumbbell className="w-3.5 h-3.5 shrink-0" />
              <strong>{totalWorkouts}</strong> WORKOUTS
            </span>
            <span className="text-[#6B6B70] hidden xs:inline">·</span>
            <span className="flex items-center gap-1.5 text-[#4F9CF9] whitespace-nowrap">
              <Sparkles className="w-3.5 h-3.5 shrink-0" />
              TARGET <strong>{displayTargetWeight} {weightUnit}</strong>
            </span>
          </div>
        </div>
      </section>

      {/* ── Key Metrics Cards ── */}
      <section className="grid grid-cols-2 gap-2.5 sm:gap-3 w-full max-w-full">
        <div className="bg-[#151517] rounded-2xl p-3.5 sm:p-5 border border-[#2A2A2D] space-y-1 min-w-0">
          <span className="text-[10px] uppercase tracking-wider text-[#A1A1A6] font-bold block truncate">
            Current Target Goal
          </span>
          <p className="font-headline font-bold text-base sm:text-lg text-[#F5F5F5] truncate">{profile.goal}</p>
        </div>
        <div className="bg-[#151517] rounded-2xl p-3.5 sm:p-5 border border-[#2A2A2D] space-y-1 min-w-0">
          <span className="text-[10px] uppercase tracking-wider text-[#A1A1A6] font-bold block truncate">
            Target Body Weight
          </span>
          <p className="font-headline font-bold text-base sm:text-lg text-[#30D158] font-mono truncate">
            {displayTargetWeight} <span className="text-xs text-[#A1A1A6] uppercase">{weightUnit}</span>
          </p>
        </div>
      </section>

      {/* ── My Goals Prominent Link ── */}
      <section>
        <div
          onClick={() => navigate('/goals')}
          className="bg-gradient-to-r from-[#1E1E20] to-[#151517] rounded-2xl p-5 border border-[#2A2A2D] hover:border-[#30D158]/40 flex items-center gap-4 cursor-pointer active:scale-[0.99] transition-all shadow-sm"
        >
          <div className="w-11 h-11 rounded-xl bg-[#30D158]/10 border border-[#30D158]/20 flex items-center justify-center text-[#30D158] shrink-0">
            <Target className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-headline font-bold text-sm text-[#F5F5F5]">My Training & Nutrition Goals</p>
            <p className="text-[#A1A1A6] text-xs mt-0.5 truncate">
              {profile.goal} · {profile.dailyCalorieGoal} kcal · P {profile.dailyProteinGoal}g · C {profile.dailyCarbsGoal}g · F {profile.dailyFatGoal}g
            </p>
            <p className="text-[#6B6B70] text-[10px] mt-0.5 font-mono">
              {profile.dailyWaterGoal}L water · {profile.dailyStepGoal} steps · {profile.dailySleepGoal}h sleep
            </p>
          </div>
          <ChevronRight className="w-4 h-4 text-[#A1A1A6] shrink-0" />
        </div>
      </section>

      {/* ── Share Muscle Progress Banner ── */}
      <section>
        <div
          onClick={() => setShowShareModal(true)}
          className="bg-gradient-to-r from-[#1E1E20] to-[#151517] rounded-2xl p-5 border border-[#2A2A2D] hover:border-[#FF8A00]/40 flex items-center gap-4 cursor-pointer active:scale-[0.99] transition-all shadow-sm"
        >
          <div className="w-11 h-11 rounded-xl bg-[#FF8A00]/10 border border-[#FF8A00]/20 flex items-center justify-center text-[#FF8A00] shrink-0">
            <Share2 className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="font-headline font-bold text-sm text-[#F5F5F5]">Share Muscle Progress</p>
              <span className="text-[9px] px-2 py-0.5 rounded-full bg-[#FF8A00]/10 border border-[#FF8A00]/20 text-[#FF8A00] font-bold uppercase font-mono">
                EDITORIAL
              </span>
            </div>
            <p className="text-[#A1A1A6] text-xs mt-0.5 truncate">
              Generate an athletic share card with anatomical heatmap and weekly PR volume.
            </p>
          </div>
          <ChevronRight className="w-4 h-4 text-[#A1A1A6] shrink-0" />
        </div>
      </section>

      {/* ── Personal Records & Training Cadence ── */}
      <section className="space-y-4">
        <h2 className="font-headline font-bold text-lg text-[#F5F5F5]">Athletic Milestones</h2>
        <div className="space-y-3">
          {/* Active Streak */}
          <div className="bg-[#151517] rounded-2xl p-5 border border-[#2A2A2D] flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#FF8A00]/10 border border-[#FF8A00]/20 flex items-center justify-center text-[#FF8A00]">
                <Flame className="w-5 h-5" />
              </div>
              <div>
                <p className="font-headline font-bold text-sm text-[#F5F5F5]">Active Training Streak</p>
                <p className="text-[#A1A1A6] text-xs mt-0.5">{streak} consecutive days logged</p>
              </div>
            </div>
            <span className="font-headline font-black text-2xl text-[#F5F5F5] font-mono">{streak}</span>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-[#151517] rounded-2xl p-4 border border-[#2A2A2D]">
              <div className="flex items-center gap-2 text-[#30D158] mb-1">
                <Dumbbell className="w-4 h-4" />
                <span className="text-[10px] text-[#A1A1A6] uppercase tracking-wider font-bold">Total Workouts</span>
              </div>
              <p className="font-headline font-black text-2xl text-[#F5F5F5] font-mono">{totalWorkouts}</p>
            </div>
            <div className="bg-[#151517] rounded-2xl p-4 border border-[#2A2A2D]">
              <div className="flex items-center gap-2 text-[#4F9CF9] mb-1">
                <Zap className="w-4 h-4" />
                <span className="text-[10px] text-[#A1A1A6] uppercase tracking-wider font-bold">Best Streak</span>
              </div>
              <p className="font-headline font-black text-2xl text-[#F5F5F5] font-mono">
                {longestStreak} <span className="text-xs text-[#A1A1A6] font-normal">days</span>
              </p>
            </div>
          </div>

          {/* Sleep & Recovery */}
          <div className="bg-[#151517] rounded-2xl p-5 border border-[#2A2A2D] flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#A78BFA]/10 border border-[#A78BFA]/20 flex items-center justify-center text-[#A78BFA]">
                <Moon className="w-5 h-5" />
              </div>
              <div>
                <p className="font-headline font-bold text-sm text-[#F5F5F5]">Today's Sleep Recovery</p>
                <p className="text-[#A1A1A6] text-xs mt-0.5 font-mono">
                  {effectiveSleepMinutes > 0
                    ? `${(effectiveSleepMinutes / 60).toFixed(1)}h recorded · ${todayHealth?.sleepScore ?? Math.min(100, Math.round((effectiveSleepMinutes / 480) * 100))}% recovery score`
                    : 'Sleep not logged today'}
                </p>
              </div>
            </div>
            <div className="h-8 flex items-end gap-1">
              {effectiveSleepMinutes > 0 ? (
                <div
                  className="w-3 bg-[#30D158] rounded-sm"
                  style={{ height: `${Math.min(100, (effectiveSleepMinutes / 480) * 100)}%` }}
                />
              ) : (
                <span className="text-[#6B6B70] text-xs font-mono">—</span>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ── System Preferences & Account ── */}
      <section className="space-y-3">
        <h2 className="font-headline font-bold text-lg text-[#F5F5F5]">Preferences & System</h2>
        <div className="space-y-2">
          <div
            onClick={() => navigate('/settings')}
            className="bg-[#151517] hover:bg-[#1E1E20] rounded-2xl px-5 py-4 border border-[#2A2A2D] flex items-center justify-between cursor-pointer transition-colors"
          >
            <div className="flex items-center gap-3">
              <SettingsIcon className="w-5 h-5 text-[#30D158]" />
              <div>
                <p className="font-semibold text-sm text-[#F5F5F5]">Health Integration & System Settings</p>
                <p className="text-[#A1A1A6] text-xs mt-0.5">Health Connect, HealthKit, backup & workout engine</p>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-[#6B6B70]" />
          </div>

          <div
            onClick={() => setShowOnboarding(true)}
            className="bg-[#151517] hover:bg-[#1E1E20] rounded-2xl px-5 py-4 border border-[#2A2A2D] flex items-center justify-between cursor-pointer transition-colors"
          >
            <div className="flex items-center gap-3">
              <UserCheck className="w-5 h-5 text-[#A1A1A6]" />
              <div>
                <p className="font-semibold text-sm text-[#F5F5F5]">Edit Athlete Profile</p>
                <p className="text-[#A1A1A6] text-xs mt-0.5">
                  Height: {displayHeight}{heightUnit} · Target: {displayTargetWeight}{weightUnit}
                </p>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-[#6B6B70]" />
          </div>

          <div
            onClick={() => navigate('/privacy')}
            className="bg-[#151517] hover:bg-[#1E1E20] rounded-2xl px-5 py-4 border border-[#2A2A2D] flex items-center justify-between cursor-pointer transition-colors"
          >
            <div className="flex items-center gap-3">
              <Shield className="w-5 h-5 text-[#A1A1A6]" />
              <div>
                <p className="font-semibold text-sm text-[#F5F5F5]">Privacy & Data Governance</p>
                <p className="text-[#A1A1A6] text-xs mt-0.5">Visibility, cloud sync, and data sovereignty</p>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-[#6B6B70]" />
          </div>
        </div>

        <div className="pt-6 text-center space-y-3">
          <button
            onClick={async () => {
              await logout();
              showToast('Signed out successfully!', 'success');
            }}
            className="inline-flex items-center gap-2 text-[#FF453A] text-sm font-headline font-bold hover:opacity-80 transition-opacity"
          >
            <LogOut className="w-4 h-4" />
            Sign Out of MyFitAI
          </button>
          <p className="text-[#6B6B70] text-[10px] font-mono">MyFitAI v2.2.0 · Athlete Operating System</p>
        </div>
      </section>

      <OnboardingForm isOpen={showOnboarding} onClose={() => setShowOnboarding(false)} />

      {/* ── Shareable Muscle Card Modal ── */}
      <ShareableMuscleCardModal
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
      />
    </main>
  );
}
