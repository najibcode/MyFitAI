import { useState, useEffect, useRef } from 'react';
import { useFitnessContext } from '../context/FitnessContext';
import { useActivity } from '../context/ActivityContext';
import { useNutrition } from '../context/NutritionContext';
import { sendToGemini, type GeminiMessage, type UserContext } from '../services/gemini';
import { db } from '../utils/db';
import { computeMuscleTrainingMetrics } from '../engine/muscleRecoveryEngine';
import type { WorkoutSession } from '../types/workout';

interface Message {
  id: string;
  sender: 'ai' | 'user';
  text: string;
  timestamp: Date;
  isError?: boolean;
}

const QUICK_ACTIONS = [
  { label: 'Check muscle recovery status', icon: 'vital_signs', color: '#6FFB85' },
  { label: 'Review today\'s nutrition & macros', icon: 'restaurant', color: '#38BDF8' },
  { label: 'Analyze my running & territory', icon: 'explore', color: '#10B981' },
  { label: 'Optimize my workout', icon: 'fitness_center', color: '#FF7A00' },
  { label: 'Recovery advice', icon: 'battery_charging_full', color: '#00b4d8' },
  { label: 'Motivate me', icon: 'psychology', color: '#FF4D4D' },
  { label: 'Form check tips', icon: 'sports_gymnastics', color: '#fab0ff' },
];

export default function AICoach() {
  const { profile, dailyStats } = useFitnessContext();
  const { activities, territoryStats } = useActivity();
  const { dailySummary, nutritionTarget } = useNutrition();
  const [sessions, setSessions] = useState<WorkoutSession[]>([]);

  useEffect(() => {
    db.sessions.getAll().then(all => {
      setSessions(all);
    }).catch(() => {});
  }, []);

  const [messages, setMessages] = useState<Message[]>([
    {
      id: '0',
      sender: 'ai',
      text: `Hey ${profile.name}! 👋 I'm your AI fitness coach powered by Gemini. I monitor your workouts, 30+ anatomical muscle recovery states, daily macros, and GPS territory activities. Ask me anything!`,
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [conversationHistory, setConversationHistory] = useState<GeminiMessage[]>([]);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const getUserContext = (): UserContext => {
    const oneWeekAgo = Date.now() - 7 * 86400000;
    const recentWeekly = activities.filter(a => new Date(a.startTime).getTime() >= oneWeekAgo);
    const weeklyDistanceKm = recentWeekly.reduce((sum, a) => sum + (a.distanceMeters || 0), 0) / 1000;

    const muscleMetrics = computeMuscleTrainingMetrics(sessions);
    const muscleRecoveryStats = Object.values(muscleMetrics)
      .sort((a, b) => a.recoveryPercentage - b.recoveryPercentage)
      .slice(0, 8)
      .map(m => ({
        muscleName: m.info?.commonName || m.muscleId,
        recoveryPercentage: m.recoveryPercentage,
        status: (m.recoveryState === 'fresh'
          ? 'recovered'
          : m.recoveryState === 'overreached'
          ? 'fatigued'
          : m.recoveryState) as 'recovered' | 'recovering' | 'fatigued',
        weeklySets: m.effectiveSets,
      }));

    const nutritionSummary = dailySummary ? {
      caloriesConsumed: dailySummary.caloriesConsumed,
      calorieGoal: nutritionTarget?.dailyCalories || profile.dailyCalorieGoal || 2000,
      proteinGrams: dailySummary.proteinConsumed,
      proteinGoal: nutritionTarget?.proteinGrams || profile.dailyProteinGoal || 150,
      carbsGrams: dailySummary.carbsConsumed,
      carbsGoal: nutritionTarget?.carbsGrams || 200,
      fatGrams: dailySummary.fatConsumed,
      fatGoal: nutritionTarget?.fatGrams || 65,
    } : undefined;

    return {
      name: profile.name,
      age: profile.age,
      gender: profile.gender,
      weight: profile.weight,
      height: profile.height,
      goal: profile.goal,
      dailyCalorieGoal: profile.dailyCalorieGoal,
      dailyStats,
      muscleRecoveryStats,
      nutritionSummary,
      activityStats: {
        weeklyDistanceKm,
        weeklyActivityCount: recentWeekly.length,
        territoryAreaKm2: territoryStats.totalAreaKm2,
        territoryLevel: territoryStats.level,
        territoryTitle: territoryStats.levelName,
        recentActivities: activities.slice(0, 5).map(a => ({
          type: a.type,
          distanceKm: (a.distanceMeters || 0) / 1000,
          durationMin: Math.round((a.durationSeconds || 0) / 60),
          pace: a.averagePaceSecondsPerKm ? `${Math.floor(a.averagePaceSecondsPerKm / 60)}:${(Math.round(a.averagePaceSecondsPerKm % 60)).toString().padStart(2, '0')}` : '0:00',
          date: new Date(a.startTime).toLocaleDateString(),
          elevationGainM: a.elevationGainMeters
        }))
      }
    };
  };

  const sendMessage = async (text: string) => {
    if (!text.trim() || isTyping) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      sender: 'user',
      text,
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsTyping(true);

    try {
      const response = await sendToGemini(text, conversationHistory, getUserContext());

      // Update conversation history for context
      setConversationHistory(prev => [
        ...prev,
        { role: 'user', parts: [{ text }] },
        { role: 'model', parts: [{ text: response }] },
      ]);

      setMessages(prev => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          sender: 'ai',
          text: response,
          timestamp: new Date(),
        },
      ]);
    } catch {
      setMessages(prev => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          sender: 'ai',
          text: "Sorry, I couldn't connect right now. Please check your internet connection and try again.",
          timestamp: new Date(),
          isError: true,
        },
      ]);
    } finally {
      setIsTyping(false);
    }
  };

  const clearChat = () => {
    setMessages([
      {
        id: Date.now().toString(),
        sender: 'ai',
        text: `Fresh start! 🔥 How can I help you, ${profile.name}?`,
        timestamp: new Date(),
      },
    ]);
    setConversationHistory([]);
  };

  return (
    <main className="flex flex-col h-[calc(100dvh-140px)] max-w-2xl mx-auto">
      {/* Header */}
      <div className="px-6 pt-6 pb-4 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary to-[#CC5F00] flex items-center justify-center shadow-[0_8px_30px_rgba(255,122,0,0.3)]">
                <span className="material-symbols-outlined text-black text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>auto_awesome</span>
              </div>
              <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-secondary rounded-full border-2 border-background" />
            </div>
            <div>
              <h1 className="font-headline font-black text-2xl tracking-tight">AI Coach</h1>
              <p className="text-[10px] text-secondary font-bold uppercase tracking-widest flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-secondary animate-pulse" />
                Powered by Gemini
              </p>
            </div>
          </div>
          <button
            onClick={clearChat}
            className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-on-surface-variant hover:text-primary hover:border-primary/30 transition-all active:scale-90"
            title="New conversation"
          >
            <span className="material-symbols-outlined text-lg">refresh</span>
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 space-y-4 pb-4 [scrollbar-width:none]">
        {messages.map(msg => {
          const isAI = msg.sender === 'ai';
          return (
            <div key={msg.id} className={`flex ${isAI ? 'justify-start' : 'justify-end'} animate-in fade-in slide-in-from-bottom-2 duration-300`}>
              <div className="max-w-[88%]">
                <div className={`rounded-[1.5rem] p-4 ${
                  isAI
                    ? msg.isError
                      ? 'bg-[#FF4D4D]/10 border border-[#FF4D4D]/20 rounded-tl-lg'
                      : 'bg-[var(--color-surface-container)] border border-white/5 rounded-tl-lg'
                    : 'bg-gradient-to-r from-primary to-[#CC5F00] text-black rounded-tr-lg shadow-[0_4px_20px_rgba(255,122,0,0.2)]'
                }`}>
                  <p className={`text-[13px] leading-relaxed whitespace-pre-wrap ${
                    isAI
                      ? msg.isError ? 'text-[#FF4D4D]' : 'text-white/90'
                      : 'font-medium'
                  }`}>{msg.text}</p>
                </div>
                <p className={`text-[9px] text-white/20 mt-1.5 ${isAI ? '' : 'text-right'}`}>
                  {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>
          );
        })}

        {isTyping && (
          <div className="flex justify-start animate-in fade-in duration-200">
            <div className="bg-[var(--color-surface-container)] border border-white/5 rounded-[1.5rem] rounded-tl-lg px-5 py-4 flex items-center gap-2">
              <div className="flex gap-1.5">
                <div className="w-2 h-2 rounded-full bg-primary/60 animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-2 h-2 rounded-full bg-primary/60 animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-2 h-2 rounded-full bg-primary/60 animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
              <span className="text-[10px] text-on-surface-variant/50 ml-1">Thinking...</span>
            </div>
          </div>
        )}

        {/* Quick actions shown when few messages */}
        {messages.length <= 2 && !isTyping && (
          <div className="pt-2">
            <p className="text-[10px] text-on-surface-variant font-bold uppercase tracking-widest mb-3">Quick actions</p>
            <div className="grid grid-cols-2 gap-2">
              {QUICK_ACTIONS.map((a, i) => (
                <button
                  key={i}
                  onClick={() => sendMessage(a.label)}
                  className="flex items-center gap-3 p-3.5 rounded-2xl bg-white/5 border border-white/5 hover:border-white/20 hover:bg-white/10 transition-all active:scale-95 text-left group"
                >
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 transition-transform group-hover:scale-110" style={{ backgroundColor: `${a.color}15`, color: a.color }}>
                    <span className="material-symbols-outlined text-base" style={{ fontVariationSettings: "'FILL' 1" }}>{a.icon}</span>
                  </div>
                  <span className="text-[11px] font-bold text-white/80 group-hover:text-white transition-colors leading-tight">{a.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        <div ref={endRef} />
      </div>

      {/* Input */}
      <div className="px-6 py-4 flex-shrink-0 border-t border-white/5 bg-[var(--color-surface-container-low)]">
        <form onSubmit={e => { e.preventDefault(); sendMessage(input); }} className="relative flex items-center gap-3">
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="Ask your AI coach anything..."
            disabled={isTyping}
            className="flex-1 bg-white/5 border border-white/10 rounded-2xl py-4 pl-5 pr-4 text-sm text-white placeholder:text-white/25 outline-none focus:border-primary/50 transition-colors disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={!input.trim() || isTyping}
            className="w-12 h-12 rounded-2xl bg-gradient-to-r from-primary to-[#CC5F00] flex items-center justify-center text-black disabled:opacity-30 disabled:bg-white/10 disabled:bg-none disabled:text-white/30 transition-all hover:scale-105 active:scale-95 shadow-[0_4px_20px_rgba(255,122,0,0.3)] disabled:shadow-none flex-shrink-0"
          >
            <span className="material-symbols-outlined text-lg">send</span>
          </button>
        </form>
      </div>
    </main>
  );
}
