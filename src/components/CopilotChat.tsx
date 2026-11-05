// ─────────────────────────────────────────────────────────────
// MyFitAI — AI Biomechanical Copilot Chat Drawer
// Athletic Personal Operating System UI/UX
// ─────────────────────────────────────────────────────────────

import { useState, useEffect, useRef } from 'react';
import { useFitnessContext } from '../context/FitnessContext';
import { useNutrition } from '../context/NutritionContext';
import { useActivity } from '../context/ActivityContext';
import { sendToGemini, type GeminiMessage, type UserContext } from '../services/gemini';
import { Sparkles, X, ArrowUp } from 'lucide-react';

interface CopilotChatProps {
  isOpen: boolean;
  onClose: () => void;
}

interface Message {
  id: string;
  sender: 'ai' | 'user';
  text: string;
  timestamp: Date;
  isError?: boolean;
}

const ATHLETIC_SUGGESTIONS = [
  "Adjust training volume for 6h sleep",
  "How to progressively overload bench press?",
  "Recommend high-protein recovery meal",
  "Explain my muscle fatigue landmarks",
];

export default function CopilotChat({ isOpen, onClose }: CopilotChatProps) {
  const { profile, dailyStats } = useFitnessContext();
  const { dailySummary, nutritionTarget } = useNutrition();
  const { territoryStats } = useActivity();
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      sender: 'ai',
      text: `Hello ${profile.name}. I am your AI biomechanical copilot. What training, nutritional pacing, or recovery variables would you like to review?`,
      timestamp: new Date(),
    },
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [conversationHistory, setConversationHistory] = useState<GeminiMessage[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  if (!isOpen) return null;

  const getUserContext = (): UserContext => {
    const nutritionSummary = dailySummary
      ? {
          caloriesConsumed: dailySummary.caloriesConsumed,
          calorieGoal: nutritionTarget?.dailyCalories || profile.dailyCalorieGoal || 2000,
          proteinGrams: dailySummary.proteinConsumed,
          proteinGoal: nutritionTarget?.proteinGrams || profile.dailyProteinGoal || 150,
        }
      : undefined;

    return {
      name: profile.name,
      age: profile.age,
      gender: profile.gender,
      weight: profile.weight,
      height: profile.height,
      goal: profile.goal,
      dailyCalorieGoal: profile.dailyCalorieGoal,
      dailyStats,
      nutritionSummary,
      activityStats: {
        territoryAreaKm2: territoryStats.totalAreaKm2,
        territoryLevel: territoryStats.level,
        territoryTitle: territoryStats.levelName,
      },
    };
  };

  const handleSend = async (text: string) => {
    if (!text.trim() || isTyping) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      sender: 'user',
      text,
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, userMsg]);
    setInputValue('');
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
          text: "Telemetry connection unavailable. Please check your network and retry.",
          timestamp: new Date(),
          isError: true,
        },
      ]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex flex-col justify-end">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/75 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Main Drawer */}
      <div className="relative bg-[#151517] w-full h-[85vh] max-w-xl mx-auto rounded-t-3xl border-t border-[#2A2A2D] shadow-2xl flex flex-col animate-slide-up">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#2A2A2D] relative">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#A78BFA]/15 border border-[#A78BFA]/30 flex items-center justify-center text-[#A78BFA]">
              <Sparkles className="w-5 h-5 stroke-[2]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-headline font-black text-[#F5F5F5] text-base uppercase tracking-tight">
                  AI Biomechanical Copilot
                </h2>
                <span className="text-[9px] font-mono font-bold uppercase tracking-wider text-[#A78BFA] px-1.5 py-0.5 rounded bg-[#A78BFA]/10 border border-[#A78BFA]/20">
                  GEMINI 3.8
                </span>
              </div>
              <p className="text-[10px] text-[#A1A1A6] font-mono mt-0.5 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#30D158] animate-pulse" />
                Live Context Ingestion Active
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-xl bg-[#1E1E20] border border-[#2A2A2D] flex items-center justify-center text-[#A1A1A6] hover:text-[#F5F5F5] transition-colors"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Chat Area */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4 [scrollbar-width:none]">
          {messages.map(msg => {
            const isAI = msg.sender === 'ai';
            return (
              <div
                key={msg.id}
                className={`flex ${isAI ? 'justify-start' : 'justify-end'} animate-in fade-in duration-200`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl p-4 text-xs leading-relaxed ${
                    isAI
                      ? msg.isError
                        ? 'bg-[#FF453A]/10 border border-[#FF453A]/25 text-[#FF453A] rounded-tl-sm'
                        : 'bg-[#1E1E20] border border-[#2A2A2D] text-[#F5F5F5] rounded-tl-sm'
                      : 'bg-[#FF8A00] text-black font-semibold rounded-tr-sm shadow-sm'
                  }`}
                >
                  <p className="whitespace-pre-wrap">{msg.text}</p>
                </div>
              </div>
            );
          })}

          {isTyping && (
            <div className="flex justify-start animate-in fade-in">
              <div className="bg-[#1E1E20] border border-[#2A2A2D] rounded-2xl rounded-tl-sm px-4 py-3 flex items-center gap-2">
                <div className="flex gap-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#A78BFA] animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-1.5 h-1.5 rounded-full bg-[#A78BFA] animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-1.5 h-1.5 rounded-full bg-[#A78BFA] animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
                <span className="text-[10px] font-mono text-[#A1A1A6]">
                  Analyzing biomechanics...
                </span>
              </div>
            </div>
          )}

          {/* Quick suggestions when chat is fresh */}
          {messages.length <= 1 && !isTyping && (
            <div className="flex flex-wrap gap-2 pt-2">
              {ATHLETIC_SUGGESTIONS.map((s, i) => (
                <button
                  key={i}
                  onClick={() => handleSend(s)}
                  className="px-3 py-2 rounded-xl bg-[#1E1E20] border border-[#2A2A2D] text-[11px] text-[#A1A1A6] hover:text-[#F5F5F5] hover:border-[#30D158]/40 transition-all active:scale-95 text-left"
                >
                  {s}
                </button>
              ))}
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="p-4 sm:p-5 border-t border-[#2A2A2D] bg-[#151517]">
          <form
            onSubmit={e => {
              e.preventDefault();
              handleSend(inputValue);
            }}
            className="relative flex items-center"
          >
            <input
              type="text"
              value={inputValue}
              onChange={e => setInputValue(e.target.value)}
              placeholder="Ask about volume landmarks, deloading, macros..."
              disabled={isTyping}
              className="w-full bg-[#1E1E20] border border-[#2A2A2D] rounded-xl py-3 pl-4 pr-12 text-xs sm:text-sm text-[#F5F5F5] placeholder:text-[#6B6B70] outline-none focus:border-[#A78BFA] transition-colors disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={!inputValue.trim() || isTyping}
              className="absolute right-1.5 w-8 h-8 rounded-lg bg-[#A78BFA] hover:bg-[#A78BFA]/90 flex items-center justify-center text-black disabled:opacity-30 disabled:bg-[#2A2A2D] disabled:text-[#6B6B70] transition-all active:scale-95"
              aria-label="Send Message"
            >
              <ArrowUp className="w-4 h-4 stroke-[2.5]" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
