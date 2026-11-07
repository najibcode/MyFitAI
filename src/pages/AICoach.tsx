import { useState, useEffect, useRef } from 'react';
import {
  Sparkles,
  RotateCcw,
  Send,
  Activity,
  Utensils,
  Compass,
  Dumbbell,
  BatteryCharging,
  Brain,
  Flame,
  type LucideIcon,
} from 'lucide-react';
import { useFitnessContext } from '../context/FitnessContext';
import { useActivity } from '../context/ActivityContext';
import { useNutrition } from '../context/NutritionContext';
import { useHealth } from '../context/HealthContext';
import { formatMinutesToHours, formatHealthSourceLabel } from '../engine/healthCalculations';
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

interface QuickAction {
  label: string;
  icon: LucideIcon;
  color: string;
}

const QUICK_ACTIONS: QuickAction[] = [
  { label: 'Check muscle recovery status', icon: Activity, color: '#30D158' },
  { label: 'Review today\'s nutrition & macros', icon: Utensils, color: '#F5C542' },
  { label: 'Analyze my running & territory', icon: Compass, color: '#4F9CF9' },
  { label: 'Optimize my workout', icon: Dumbbell, color: '#FF8A00' },
  { label: 'Recovery advice', icon: BatteryCharging, color: '#30D158' },
  { label: 'Motivate me', icon: Brain, color: '#A78BFA' },
  { label: 'Form check tips', icon: Flame, color: '#FF453A' },
];

export default function AICoach() {
  const { profile, dailyStats } = useFitnessContext();
  const { activities, territoryStats } = useActivity();
  const { dailySummary, nutritionTarget } = useNutrition();
  const { todayHealth } = useHealth();
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
      text: `Hey ${profile.name}! I'm your AI fitness coach powered by Gemini 3.8. I monitor your workouts, 30+ anatomical muscle recovery states, daily macros, and GPS territory activities. Ask me anything!`,
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
    const muscleMetricsArr = Object.values(muscleMetrics);
    const avgMuscleRecovery = muscleMetricsArr.length > 0
      ? Math.round(muscleMetricsArr.reduce((s, m) => s + m.recoveryPercentage, 0) / muscleMetricsArr.length)
      : 85;

    const muscleRecoveryStats = muscleMetricsArr
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

    const healthSummary = todayHealth ? {
      steps: todayHealth.steps,
      stepGoal: todayHealth.stepGoal,
      sleepFormatted: formatMinutesToHours(todayHealth.sleepDurationMinutes),
      sleepGoalHours: profile.dailySleepGoal || 8,
      sleepScore: todayHealth.sleepScore,
      readinessScore: todayHealth.readinessScore,
      sourceLabel: formatHealthSourceLabel(todayHealth.source),
      yesterdayWorkout: sessions[0]?.templateName || undefined,
      muscleRecovery: avgMuscleRecovery,
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
      healthSummary,
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
          elevationGainM: a.elevationGainMeters,
        })),
      },
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
        text: `Fresh session started. How can I help you today, ${profile.name}?`,
        timestamp: new Date(),
      },
    ]);
    setConversationHistory([]);
  };

  return (
    <main className="flex flex-col h-[calc(100dvh-140px)] max-w-2xl mx-auto bg-[#080808]">
      {/* Header */}
      <div className="px-4 sm:px-6 pt-4 pb-3 flex-shrink-0 border-b border-[#2A2A2D]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-10 h-10 rounded-xl bg-[#A78BFA]/10 border border-[#A78BFA]/20 flex items-center justify-center text-[#A78BFA]">
                <Sparkles className="w-5 h-5" />
              </div>
              <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-[#30D158] rounded-full border-2 border-[#080808]" />
            </div>
            <div>
              <h1 className="font-bold text-base text-[#F5F5F5] tracking-tight">AI Athletic Coach</h1>
              <p className="text-[10px] text-[#30D158] font-bold uppercase tracking-wider flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#30D158] animate-pulse" />
                Gemini 3.8 Telemetry Engine
              </p>
            </div>
          </div>
          <button
            onClick={clearChat}
            className="w-9 h-9 rounded-xl bg-[#151517] border border-[#2A2A2D] flex items-center justify-center text-[#A1A1A6] hover:text-[#F5F5F5] hover:border-[#30D158]/40 transition-all active:scale-95"
            title="New conversation"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 sm:px-6 space-y-4 py-4 [scrollbar-width:none]">
        {messages.map(msg => {
          const isAI = msg.sender === 'ai';
          return (
            <div key={msg.id} className={`flex ${isAI ? 'justify-start' : 'justify-end'} animate-in fade-in duration-200`}>
              <div className="max-w-[88%]">
                <div
                  className={`rounded-2xl p-4 text-xs leading-relaxed ${
                    isAI
                      ? msg.isError
                        ? 'bg-[#FF453A]/10 border border-[#FF453A]/20 text-[#FF453A] rounded-tl-sm'
                        : 'bg-[#151517] border border-[#2A2A2D] text-[#F5F5F5] rounded-tl-sm'
                      : 'bg-[#30D158] text-black font-semibold rounded-tr-sm shadow-sm'
                  }`}
                >
                  <p className="whitespace-pre-wrap">{msg.text}</p>
                </div>
                <p className={`text-[10px] text-[#A1A1A6]/50 mt-1.5 font-mono tabular-nums ${isAI ? '' : 'text-right'}`}>
                  {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>
          );
        })}

        {isTyping && (
          <div className="flex justify-start animate-in fade-in duration-200">
            <div className="bg-[#151517] border border-[#2A2A2D] rounded-2xl rounded-tl-sm px-4 py-3 flex items-center gap-2">
              <div className="flex gap-1.5">
                <div className="w-2 h-2 rounded-full bg-[#30D158] animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-2 h-2 rounded-full bg-[#30D158] animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-2 h-2 rounded-full bg-[#30D158] animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
              <span className="text-[10px] text-[#A1A1A6] font-medium ml-1">Analyzing Biomechanics...</span>
            </div>
          </div>
        )}

        {/* Quick actions shown when few messages */}
        {messages.length <= 2 && !isTyping && (
          <div className="pt-2">
            <p className="text-[10px] text-[#A1A1A6] font-bold uppercase tracking-wider mb-2.5">Suggested Prompts</p>
            <div className="grid grid-cols-2 gap-2">
              {QUICK_ACTIONS.map((a, i) => {
                const IconComponent = a.icon;
                return (
                  <button
                    key={i}
                    onClick={() => sendMessage(a.label)}
                    className="flex items-center gap-2.5 p-3 rounded-xl bg-[#151517] border border-[#2A2A2D] hover:border-[#30D158]/40 hover:bg-[#1E1E20] transition-all active:scale-[0.98] text-left group"
                  >
                    <div
                      className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: `${a.color}15`, color: a.color }}
                    >
                      <IconComponent className="w-4 h-4" />
                    </div>
                    <span className="text-xs font-medium text-[#A1A1A6] group-hover:text-[#F5F5F5] transition-colors leading-tight">
                      {a.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <div ref={endRef} />
      </div>

      {/* Input */}
      <div className="px-3 sm:px-6 py-3 flex-shrink-0 border-t border-[#2A2A2D] bg-[#151517]">
        <form onSubmit={e => { e.preventDefault(); sendMessage(input); }} className="relative flex items-center gap-2">
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="Ask your coach anything..."
            disabled={isTyping}
            className="flex-1 bg-[#1E1E20] border border-[#2A2A2D] rounded-xl py-3 px-4 text-xs text-[#F5F5F5] placeholder-[#A1A1A6]/50 outline-none focus:border-[#30D158] transition-colors disabled:opacity-50 min-h-[44px]"
          />
          <button
            type="submit"
            disabled={!input.trim() || isTyping}
            className="w-11 h-11 rounded-xl bg-[#FF8A00] hover:bg-[#FF8A00]/90 flex items-center justify-center text-black disabled:opacity-40 transition-all active:scale-95 flex-shrink-0 shadow-sm"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </main>
  );
}
