import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { useToast } from '../context/ToastContext';
import {
  ArrowLeft,
  Zap,
  Sparkles,
  LineChart,
  Watch,
  FileText,
  Headphones,
  Dumbbell,
  Utensils,
  TrendingUp,
  Check,
  Crown,
} from 'lucide-react';

export default function Subscription() {
  const navigate = useNavigate();
  const [selectedPlan, setSelectedPlan] = useState<'monthly' | 'yearly'>('yearly');
  const { showToast } = useToast();

  const plans = {
    monthly: { price: '$14.99', period: '/month', save: '' },
    yearly: { price: '$7.99', period: '/month', save: 'Save 47%' },
  };

  const features = [
    {
      icon: Sparkles,
      title: 'AI Biomechanical Coaching',
      desc: 'Real-time progressive overload adaptations & personalized recommendations',
      free: false,
      pro: true,
    },
    {
      icon: LineChart,
      title: 'Volume & MEV/MRV Analytics',
      desc: 'Muscle group fatigue landmarks, balance ratios, and estimated 1RM projections',
      free: false,
      pro: true,
    },
    {
      icon: Watch,
      title: 'Wearable Sync & Recovery',
      desc: 'Health Connect & HealthKit continuous step, sleep stage, and HRV sync',
      free: false,
      pro: true,
    },
    {
      icon: Dumbbell,
      title: 'Custom Program Engineering',
      desc: 'Unlimited mesocycles, RPE progression rules, and superset architectures',
      free: false,
      pro: true,
    },
    {
      icon: FileText,
      title: 'Data Export & GPX Backup',
      desc: 'Full CSV training exports, Strava-compatible GPX routes, and PDF cards',
      free: false,
      pro: true,
    },
    {
      icon: Headphones,
      title: 'Priority Coaching Access',
      desc: 'Direct algorithmic review and fast-track feature access',
      free: false,
      pro: true,
    },
    {
      icon: Dumbbell,
      title: 'Standard Workout Tracking',
      desc: 'Set, rep, and weight logging with rest timer',
      free: true,
      pro: true,
    },
    {
      icon: Utensils,
      title: 'Basic Macro Pacing',
      desc: 'Daily calorie, protein, and water tracking',
      free: true,
      pro: true,
    },
    {
      icon: TrendingUp,
      title: 'Bodyweight Trend Curves',
      desc: 'Weight tracking and Big 3 strength records',
      free: true,
      pro: true,
    },
  ];

  return (
    <main className="max-w-lg mx-auto px-4 sm:px-6 pt-6 pb-28 space-y-6">
      {/* Back Button */}
      <button
        onClick={() => navigate(-1)}
        className="w-10 h-10 rounded-xl bg-[#151517] border border-[#2A2A2D] flex items-center justify-center text-[#A1A1A6] hover:text-[#F5F5F5] transition-colors"
        aria-label="Back"
      >
        <ArrowLeft className="w-5 h-5" />
      </button>

      {/* Hero */}
      <div className="text-center space-y-3">
        <div className="w-16 h-16 mx-auto bg-[#30D158]/15 border border-[#30D158]/30 rounded-2xl flex items-center justify-center text-[#30D158] shadow-[0_4px_24px_rgba(48,209,88,0.2)]">
          <Crown className="w-8 h-8" />
        </div>
        <div>
          <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-[#30D158] block mb-1">
            ATHLETIC PRO MEMBERSHIP
          </span>
          <h1 className="font-headline font-black text-3xl sm:text-4xl text-[#F5F5F5] tracking-tight uppercase">
            Upgrade to Pro
          </h1>
          <p className="text-xs text-[#A1A1A6] max-w-xs mx-auto mt-1 leading-relaxed">
            Unlock AI biomechanical coaching, unlimited custom programs, and advanced recovery telemetry.
          </p>
        </div>
      </div>

      {/* Plan Switcher */}
      <div className="flex bg-[#151517] p-1.5 rounded-2xl border border-[#2A2A2D]">
        {(['monthly', 'yearly'] as const).map(plan => (
          <button
            key={plan}
            onClick={() => setSelectedPlan(plan)}
            className={`flex-1 py-3 rounded-xl font-headline font-bold text-xs uppercase tracking-wider transition-all relative ${
              selectedPlan === plan
                ? 'bg-[#30D158] text-black shadow-md'
                : 'text-[#A1A1A6] hover:text-[#F5F5F5]'
            }`}
          >
            {plan}
            {plan === 'yearly' && selectedPlan !== 'yearly' && (
              <span className="absolute -top-2 right-3 text-[8px] bg-[#FF8A00] text-black px-2 py-0.5 rounded-full font-black uppercase tracking-wider">
                SAVE 47%
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Price Display */}
      <div className="text-center py-2 space-y-1">
        <div className="flex items-baseline justify-center gap-1.5">
          <span className="font-headline font-black text-5xl text-[#F5F5F5] tracking-tight tabular-nums">
            {plans[selectedPlan].price}
          </span>
          <span className="text-sm font-mono text-[#A1A1A6] font-semibold">
            {plans[selectedPlan].period}
          </span>
        </div>
        {plans[selectedPlan].save && (
          <span className="inline-block text-[10px] font-mono font-bold text-[#30D158] bg-[#30D158]/10 px-3 py-1 rounded-full border border-[#30D158]/20 uppercase tracking-wider">
            {plans[selectedPlan].save}
          </span>
        )}
        {selectedPlan === 'yearly' && (
          <p className="text-[11px] font-mono text-[#6B6B70] mt-1">
            Billed annually at $95.88
          </p>
        )}
      </div>

      {/* CTA Button */}
      <div className="space-y-2">
        <button
          onClick={() => showToast('Redirecting to secure athlete checkout...', 'success')}
          className="w-full bg-[#FF8A00] hover:bg-[#FF8A00]/90 text-black font-headline font-black py-4 rounded-xl text-xs uppercase tracking-wider shadow-[0_4px_20px_rgba(255,138,0,0.3)] active:scale-[0.98] transition-all flex items-center justify-center gap-2"
        >
          <Zap className="w-4 h-4 fill-black" />
          <span>Start 7-Day Free Trial</span>
        </button>
        <p className="text-center text-[10px] font-mono text-[#6B6B70]">
          7-day zero-risk trial · Cancel anytime with 1 tap
        </p>
      </div>

      {/* Features Comparison */}
      <div className="space-y-3 pt-2">
        <h3 className="font-headline font-bold text-xs uppercase tracking-wider text-[#A1A1A6] px-1">
          Feature Breakdown
        </h3>
        {features.map((f, i) => {
          const Icon = f.icon;
          return (
            <div
              key={i}
              className={`flex items-center gap-3.5 p-3.5 rounded-2xl border transition-all ${
                !f.free
                  ? 'bg-[#151517] border-[#2A2A2D]'
                  : 'bg-[#151517]/60 border-[#2A2A2D]/60'
              }`}
            >
              <div
                className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border ${
                  !f.free
                    ? 'bg-[#30D158]/10 text-[#30D158] border-[#30D158]/20'
                    : 'bg-[#1E1E20] text-[#A1A1A6] border-[#2A2A2D]'
                }`}
              >
                <Icon className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-headline font-bold text-xs text-[#F5F5F5] truncate">
                  {f.title}
                </p>
                <p className="text-[10px] text-[#A1A1A6] mt-0.5 leading-snug">
                  {f.desc}
                </p>
              </div>
              {!f.free ? (
                <span className="text-[9px] font-mono font-bold bg-[#30D158]/15 text-[#30D158] px-2 py-0.5 rounded uppercase tracking-wider border border-[#30D158]/30 shrink-0">
                  PRO
                </span>
              ) : (
                <Check className="w-4 h-4 text-[#6B6B70] shrink-0" />
              )}
            </div>
          );
        })}
      </div>
    </main>
  );
}
