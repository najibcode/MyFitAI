import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { syncToCloud } from '../services/cloudSync';
import { storage } from '../utils/storage';

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  unlocked: boolean;
  unlockedAt?: string;
  xpReward: number;
  category: 'workout' | 'nutrition' | 'consistency' | 'social' | 'milestone';
}

export interface Mission {
  id: string;
  title: string;
  description: string;
  icon: string;
  target: number;
  current: number;
  xpReward: number;
  expiresAt: string;
  completed: boolean;
}

interface GamificationState {
  xp: number;
  level: number;
  streak: number;
  longestStreak: number;
  achievements: Achievement[];
  weeklyMissions: Mission[];
  badges: string[];
}

interface GamificationContextType extends GamificationState {
  addXP: (amount: number) => void;
  unlockAchievement: (id: string) => void;
  updateMissionProgress: (id: string, amount: number) => void;
  levelTitle: string;
  xpForNextLevel: number;
  xpProgress: number;
}

const LEVEL_TITLES = [
  'Rookie', 'Beginner', 'Novice', 'Apprentice', 'Trainee',
  'Warrior', 'Fighter', 'Athlete', 'Champion', 'Beast',
  'Elite', 'Legend', 'Titan', 'Phenom', 'Immortal',
  'Mythic', 'Apex', 'Sovereign', 'Transcendent', 'Godlike'
];

const XP_PER_LEVEL = 500;

const DEFAULT_ACHIEVEMENTS: Achievement[] = [
  { id: 'first_workout', title: 'First Rep', description: 'Complete your first workout', icon: 'fitness_center', unlocked: false, xpReward: 100, category: 'workout' },
  { id: 'week_streak', title: 'Week Warrior', description: 'Maintain a 7-day streak', icon: 'local_fire_department', unlocked: false, xpReward: 250, category: 'consistency' },
  { id: 'month_streak', title: 'Iron Will', description: 'Maintain a 30-day streak', icon: 'military_tech', unlocked: false, xpReward: 1000, category: 'consistency' },
  { id: 'calorie_crusher', title: 'Calorie Crusher', description: 'Burn 5,000 total calories', icon: 'whatshot', unlocked: false, xpReward: 500, category: 'workout' },
  { id: 'hydration_hero', title: 'Hydration Hero', description: 'Hit water goal 7 days in a row', icon: 'water_drop', unlocked: false, xpReward: 200, category: 'nutrition' },
  { id: 'pr_breaker', title: 'PR Breaker', description: 'Set a new personal record', icon: 'emoji_events', unlocked: false, xpReward: 300, category: 'workout' },
  { id: 'early_bird', title: 'Early Bird', description: 'Complete a workout before 7 AM', icon: 'wb_sunny', unlocked: false, xpReward: 150, category: 'consistency' },
  { id: 'night_owl', title: 'Night Owl', description: 'Complete a workout after 9 PM', icon: 'dark_mode', unlocked: false, xpReward: 150, category: 'consistency' },
  { id: 'macro_master', title: 'Macro Master', description: 'Hit all macro targets in a day', icon: 'pie_chart', unlocked: false, xpReward: 200, category: 'nutrition' },
  { id: 'centurion', title: 'Centurion', description: 'Complete 100 total workouts', icon: 'stars', unlocked: false, xpReward: 2000, category: 'milestone' },
  { id: 'volume_king', title: 'Volume King', description: 'Log 10,000 lbs total volume', icon: 'trending_up', unlocked: false, xpReward: 500, category: 'workout' },
  { id: 'social_butterfly', title: 'Social Butterfly', description: 'Share your first workout', icon: 'share', unlocked: false, xpReward: 100, category: 'social' },
];

const DEFAULT_MISSIONS: Mission[] = [
  { id: 'm1', title: 'Workout 4 Times', description: 'Complete 4 workouts this week', icon: 'fitness_center', target: 4, current: 2, xpReward: 200, expiresAt: '', completed: false },
  { id: 'm2', title: 'Drink 3L Daily', description: 'Hit your water goal 5 days', icon: 'water_drop', target: 5, current: 3, xpReward: 150, expiresAt: '', completed: false },
  { id: 'm3', title: 'Log All Meals', description: 'Log meals for 3 consecutive days', icon: 'restaurant', target: 3, current: 1, xpReward: 100, expiresAt: '', completed: false },
  { id: 'm4', title: 'Step Master', description: 'Walk 50,000 steps this week', icon: 'steps', target: 50000, current: 32000, xpReward: 300, expiresAt: '', completed: false },
];

const GamificationContext = createContext<GamificationContextType | undefined>(undefined);

export function GamificationProvider({ children }: { children: React.ReactNode }) {
  const { cloudData } = useAuth();
  const [state, setState] = useState<GamificationState>(() => {
    const saved = storage.get<GamificationState>('kinetic_gamification');
    if (saved) return saved;
    return {
      xp: 0,
      level: 1,
      streak: 0,
      longestStreak: 0,
      achievements: DEFAULT_ACHIEVEMENTS.map(a => ({ ...a, unlocked: false })),
      weeklyMissions: DEFAULT_MISSIONS.map(m => ({ ...m, current: 0, completed: false })),
      badges: [],
    };
  });

  // Sync from cloud
  useEffect(() => {
    if (cloudData && cloudData.gamification) {
      setState(cloudData.gamification);
    }
  }, [cloudData]);

  useEffect(() => {
    storage.set('kinetic_gamification', state);
    syncToCloud('gamification', state);
  }, [state]);

  const addXP = (amount: number) => {
    setState(prev => {
      const newXP = prev.xp + amount;
      const newLevel = Math.floor(newXP / XP_PER_LEVEL) + 1;
      return { ...prev, xp: newXP, level: newLevel };
    });
  };

  const unlockAchievement = (id: string) => {
    setState(prev => ({
      ...prev,
      achievements: prev.achievements.map(a =>
        a.id === id && !a.unlocked
          ? { ...a, unlocked: true, unlockedAt: new Date().toISOString() }
          : a
      ),
      badges: prev.badges.includes(id) ? prev.badges : [...prev.badges, id],
    }));
  };

  const updateMissionProgress = (id: string, amount: number) => {
    setState(prev => ({
      ...prev,
      weeklyMissions: prev.weeklyMissions.map(m =>
        m.id === id
          ? { ...m, current: Math.min(m.target, m.current + amount), completed: m.current + amount >= m.target }
          : m
      ),
    }));
  };

  const levelTitle = LEVEL_TITLES[Math.min(state.level - 1, LEVEL_TITLES.length - 1)];
  const xpForNextLevel = state.level * XP_PER_LEVEL;
  const xpProgress = ((state.xp % XP_PER_LEVEL) / XP_PER_LEVEL) * 100;

  return (
    <GamificationContext.Provider value={{
      ...state,
      addXP,
      unlockAchievement,
      updateMissionProgress,
      levelTitle,
      xpForNextLevel,
      xpProgress,
    }}>
      {children}
    </GamificationContext.Provider>
  );
}

export function useGamification() {
  const context = useContext(GamificationContext);
  if (!context) throw new Error('useGamification must be used within GamificationProvider');
  return context;
}
