import { useState, useEffect, useRef } from 'react';
import { useFitnessContext } from '../context/FitnessContext';
import { useNutrition } from '../context/NutritionContext';
import { useActivity } from '../context/ActivityContext';
import { sendToGemini, type GeminiMessage, type UserContext } from '../services/gemini';

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

const SUGGESTIONS = [
  "What should I eat today?",
  "Give me a quick workout",
  "How's my progress?",
  "Help me sleep better",
];

export default function CopilotChat({ isOpen, onClose }: CopilotChatProps) {
  const { profile, dailyStats } = useFitnessContext();
  const { dailySummary, nutritionTarget } = useNutrition();
  const { territoryStats } = useActivity();
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      sender: 'ai',
      text: `Hey ${profile.name}! 👋 I'm your AI assistant. Ask me anything about fitness, nutrition, or recovery.`,
      timestamp: new Date()
    }
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
    const nutritionSummary = dailySummary ? {
      caloriesConsumed: dailySummary.caloriesConsumed,
      calorieGoal: nutritionTarget?.dailyCalories || profile.dailyCalorieGoal || 2000,
      proteinGrams: dailySummary.proteinConsumed,
      proteinGoal: nutritionTarget?.proteinGrams || profile.dailyProteinGoal || 150,
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
      timestamp: new Date()
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

      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        sender: 'ai',
        text: response,
        timestamp: new Date()
      }]);
    } catch {
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        sender: 'ai',
        text: "Couldn't connect. Check your internet and try again.",
        timestamp: new Date(),
        isError: true,
      }]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex flex-col justify-end">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      ></div>

      {/* Main Drawer */}
      <div className="relative bg-[var(--color-surface)] w-full h-[85vh] max-w-md mx-auto rounded-t-[2.5rem] border-t border-primary/20 shadow-[0_-20px_60px_rgba(255,122,0,0.15)] flex flex-col animate-in slide-in-from-bottom-[100%] duration-300">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-white/5 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-primary/10 to-transparent pointer-events-none"></div>
          <div className="flex items-center gap-3 relative z-10">
            <div className="w-10 h-10 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center">
              <span className="material-symbols-outlined text-primary text-xl animate-pulse">auto_sparkle</span>
            </div>
            <div>
              <h2 className="font-headline font-black text-white text-lg leading-none tracking-tight">AI Assistant</h2>
              <p className="text-[10px] text-primary font-bold tracking-widest uppercase mt-0.5 flex items-center gap-1">
                 <span className="w-1.5 h-1.5 rounded-full bg-primary"></span>
                 Powered by Gemini
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-white/50 hover:text-white hover:bg-white/10 transition-colors relative z-10"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {/* Chat Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
          {messages.map((msg) => {
            const isAI = msg.sender === 'ai';
            return (
              <div key={msg.id} className={`flex ${isAI ? 'justify-start' : 'justify-end'} animate-in fade-in slide-in-from-bottom-2 duration-300`}>
                <div className={`max-w-[85%] rounded-[1.5rem] p-4 ${
                  isAI 
                    ? msg.isError
                      ? 'bg-[#FF4D4D]/10 border border-[#FF4D4D]/20 rounded-tl-sm'
                      : 'bg-[var(--color-surface-container)] border border-primary/20 text-white rounded-tl-sm'
                    : 'bg-primary text-black rounded-tr-sm shadow-[0_4px_20px_rgba(255,122,0,0.2)]'
                }`}>
                  <p className={`text-sm leading-relaxed whitespace-pre-wrap ${
                    isAI 
                      ? msg.isError ? 'text-[#FF4D4D]' : 'font-light' 
                      : 'font-medium'
                  }`}>{msg.text}</p>
                </div>
              </div>
            );
          })}
          
          {isTyping && (
             <div className="flex justify-start animate-in fade-in">
               <div className="bg-[var(--color-surface-container)] border border-white/5 rounded-[1.5rem] rounded-tl-sm px-5 py-4 flex items-center gap-2">
                 <div className="flex gap-1.5">
                   <div className="w-2 h-2 rounded-full bg-primary/60 animate-bounce" style={{ animationDelay: '0ms' }}></div>
                   <div className="w-2 h-2 rounded-full bg-primary/60 animate-bounce" style={{ animationDelay: '150ms' }}></div>
                   <div className="w-2 h-2 rounded-full bg-primary/60 animate-bounce" style={{ animationDelay: '300ms' }}></div>
                 </div>
                 <span className="text-[10px] text-on-surface-variant/50 ml-1">Thinking...</span>
               </div>
             </div>
          )}

          {/* Quick suggestions when chat is fresh */}
          {messages.length <= 1 && !isTyping && (
            <div className="flex flex-wrap gap-2 pt-2">
              {SUGGESTIONS.map((s, i) => (
                <button key={i} onClick={() => handleSend(s)}
                  className="px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-[11px] text-white/70 hover:text-white hover:border-primary/30 transition-all active:scale-95">
                  {s}
                </button>
              ))}
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="p-6 pt-4 border-t border-white/5 bg-[var(--color-surface)]">
           <form 
             onSubmit={(e) => { e.preventDefault(); handleSend(inputValue); }}
             className="relative flex items-center"
           >
             <input 
               type="text"
               value={inputValue}
               onChange={(e) => setInputValue(e.target.value)}
               placeholder="Ask anything..."
               disabled={isTyping}
               className="w-full bg-[var(--color-surface-container)] border border-white/10 rounded-full py-4 pl-6 pr-14 text-sm text-white placeholder:text-white/30 outline-none focus:border-primary/50 transition-colors shadow-inner disabled:opacity-50"
             />
             <button 
               type="submit"
               disabled={!inputValue.trim() || isTyping}
               className="absolute right-2 w-10 h-10 rounded-full bg-primary flex items-center justify-center text-black disabled:opacity-30 disabled:bg-white/10 disabled:text-white/30 transition-all hover:scale-105 active:scale-95"
             >
                <span className="material-symbols-outlined text-[18px]">send</span>
             </button>
           </form>
        </div>
      </div>
    </div>
  );
}
