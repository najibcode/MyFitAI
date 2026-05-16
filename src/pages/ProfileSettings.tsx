import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useFitnessContext } from '../context/FitnessContext';
import OnboardingForm from '../components/OnboardingForm';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import { usePreferences } from '../context/PreferencesContext';
import { useGamification } from '../context/GamificationContext';

export default function ProfileSettings() {
  const { profile, dailyStats, activities } = useFitnessContext();
  const { weightUnit, heightUnit } = usePreferences();
  const { streak, longestStreak } = useGamification();
  const [showOnboarding, setShowOnboarding] = useState(false);
  const { showToast } = useToast();
  const { logout } = useAuth();
  const navigate = useNavigate();

  const totalWorkouts = activities.filter(a => a.type === 'Workout').length;

  const displayWeight = weightUnit === 'kg' ? Math.round(profile.weight / 2.20462 * 10) / 10 : profile.weight;
  const displayTargetWeight = weightUnit === 'kg' ? Math.round(profile.targetWeight / 2.20462 * 10) / 10 : profile.targetWeight;
  const displayHeight = heightUnit === 'cm' ? Math.round(profile.height * 2.54) : profile.height;

  return (
    <main className="max-w-lg mx-auto px-5 pt-6 pb-32">
      {/* Profile Header */}
      <section className="flex flex-col items-center text-center gap-4 mb-10">
        <div className="relative">
          <div className="w-24 h-24 rounded-full bg-[var(--color-surface-container)] overflow-hidden ring-2 ring-white/[0.06]">
            <img alt="Profile" className="w-full h-full object-cover" src="https://lh3.googleusercontent.com/aida-public/AB6AXuAxJE5KF2fqN7gb85FTht8B-fqltWz2KqH8IAg3Q52cdKy-9oEBq1JqZtputtX2b0LKFr0ERhhobHyYtMyw36FdrPA26RnaGz24q6s9m7tUAYI34zXso5cd3YPiUPcACBaFgQagLrYrI2_ORPWsBCumqsVJdYOg2-ExWuv5_cUr__PBcWdwR2gaGrjx_v1vsex37A5vUxRVisCVjVshT2G5D6Op5FO0buveRPzMrEN8U8QeiPhaTtBmMq4kD-9Dq-y4R7MR_-3YzuPj"/>
          </div>
          <div className="absolute -bottom-0.5 -right-0.5 w-7 h-7 bg-[#6FFB85] rounded-full flex items-center justify-center border-[3px] border-[var(--color-background)]">
            <span className="material-symbols-outlined text-black text-xs" style={{fontVariationSettings: "'FILL' 1"}}>check</span>
          </div>
        </div>
        <div>
          <h1 className="font-headline text-2xl font-bold tracking-tight">{profile.name}</h1>
          <p className="text-on-surface-variant text-sm mt-1">{profile.goal} · {displayWeight} {weightUnit} · BMI {profile.bmi}</p>
        </div>
      </section>

      {/* Stats Grid */}
      <section className="grid grid-cols-2 gap-3 mb-8">
        <div className="bg-[var(--color-surface-container)] rounded-2xl p-4">
          <p className="text-on-surface-variant text-xs font-medium mb-1">Current Goal</p>
          <p className="font-headline font-bold text-base">{profile.goal}</p>
        </div>
        <div className="bg-[var(--color-surface-container)] rounded-2xl p-4">
          <p className="text-on-surface-variant text-xs font-medium mb-1">Target Weight</p>
          <p className="font-headline font-bold text-base">{displayTargetWeight} {weightUnit}</p>
        </div>
      </section>

      {/* My Goals — prominent link */}
      <section className="mb-8">
        <div onClick={() => navigate('/goals')} className="bg-gradient-to-r from-primary/10 to-transparent rounded-2xl p-5 border border-primary/20 flex items-center gap-4 cursor-pointer hover:border-primary/40 active:scale-[0.98] transition-all">
          <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center">
            <span className="material-symbols-outlined text-primary text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>flag</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-headline font-bold text-sm">My Goals</p>
            <p className="text-on-surface-variant text-xs mt-0.5 truncate">{profile.goal} · {profile.dailyCalorieGoal} kcal · P {profile.dailyProteinGoal}g · C {profile.dailyCarbsGoal}g · F {profile.dailyFatGoal}g</p>
            <p className="text-on-surface-variant text-[10px] mt-0.5">{profile.dailyWaterGoal}L water · {profile.dailyStepGoal} steps · {profile.dailySleepGoal}h sleep · {profile.dailyWorkoutDurationGoal} min workout</p>
          </div>
          <span className="material-symbols-outlined text-primary text-base flex-shrink-0">chevron_right</span>
        </div>
      </section>

      {/* Personal Records */}
      <section className="mb-8">
        <h2 className="font-headline font-bold text-lg mb-4">Personal Records</h2>
        <div className="space-y-3">
          {/* Streak */}
          <div className="bg-[var(--color-surface-container)] rounded-2xl p-5 flex items-center gap-4">
            <span className="material-symbols-outlined text-[#FF4D4D] text-2xl" style={{fontVariationSettings: "'FILL' 1"}}>local_fire_department</span>
            <div className="flex-1">
              <p className="font-headline font-bold text-sm">Active Streak</p>
              <p className="text-on-surface-variant text-xs mt-0.5">{streak} consecutive days</p>
            </div>
            <span className="font-headline font-black text-2xl">{streak}</span>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-[var(--color-surface-container)] rounded-2xl p-4">
              <p className="text-on-surface-variant text-xs font-medium mb-1">Total Workouts</p>
              <p className="font-headline font-bold text-xl">{totalWorkouts}</p>
            </div>
            <div className="bg-[var(--color-surface-container)] rounded-2xl p-4">
              <p className="text-on-surface-variant text-xs font-medium mb-1">Best Streak</p>
              <p className="font-headline font-bold text-xl">{longestStreak} <span className="text-xs text-on-surface-variant font-normal">days</span></p>
            </div>
          </div>

          {/* Sleep Score */}
          <div className="bg-[var(--color-surface-container)] rounded-2xl p-5 flex items-center justify-between">
            <div>
              <p className="text-on-surface-variant text-xs font-medium mb-1">Today's Sleep</p>
              <p className="font-headline font-bold text-xl">{dailyStats.sleep > 0 ? `${dailyStats.sleep}h` : '—'}<span className="text-sm text-on-surface-variant font-normal ml-1">{dailyStats.sleep > 0 ? `${Math.min(100, Math.round((dailyStats.sleep / 8) * 100))}% recovery` : 'Not logged'}</span></p>
            </div>
            <div className="h-8 flex items-end gap-1">
              {dailyStats.sleep > 0 ? (
                <div className="w-3 bg-primary rounded-sm" style={{ height: `${Math.min(100, (dailyStats.sleep / 8) * 100)}%` }} />
              ) : (
                <span className="text-on-surface-variant text-xs">—</span>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Settings */}
      <section>
        <h2 className="font-headline font-bold text-lg mb-4">Settings</h2>
        <div className="space-y-2">
          <div onClick={() => setShowOnboarding(true)} className="bg-[var(--color-surface-container)] hover:bg-[var(--color-surface-container-high)] rounded-2xl px-5 py-4 flex items-center justify-between cursor-pointer transition-colors">
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-on-surface-variant text-xl">person_edit</span>
              <div>
                <p className="font-semibold text-sm">Edit Profile</p>
                <p className="text-on-surface-variant text-xs mt-0.5">Height: {displayHeight}{heightUnit} · Target: {displayTargetWeight}{weightUnit}</p>
              </div>
            </div>
            <span className="material-symbols-outlined text-on-surface-variant text-base">chevron_right</span>
          </div>

          <div className="bg-[var(--color-surface-container)] hover:bg-[var(--color-surface-container-high)] rounded-2xl px-5 py-4 flex items-center justify-between cursor-pointer transition-colors">
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-on-surface-variant text-xl">shield_person</span>
              <div>
                <p className="font-semibold text-sm">Privacy</p>
                <p className="text-on-surface-variant text-xs mt-0.5">Visibility and data settings</p>
              </div>
            </div>
            <span className="material-symbols-outlined text-on-surface-variant text-base">chevron_right</span>
          </div>
        </div>
        
        <div className="mt-10 text-center space-y-4">
          <button 
            onClick={async () => { 
              await logout();
              showToast('Signed out successfully!', 'success');
            }} 
            className="text-[#FF4D4D] text-sm font-semibold hover:opacity-70 transition-opacity"
          >
            Sign Out
          </button>
          <p className="text-on-surface-variant/40 text-[10px]">MyFitAI v2.1.0</p>
        </div>
      </section>

      <OnboardingForm isOpen={showOnboarding} onClose={() => setShowOnboarding(false)} />
    </main>
  );
}
