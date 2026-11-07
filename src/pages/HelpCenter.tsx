import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { useToast } from '../context/ToastContext';
import {
  ArrowLeft,
  Search,
  Dumbbell,
  Utensils,
  TrendingUp,
  Settings,
  ChevronDown,
  SearchX,
  MessageSquare,
} from 'lucide-react';

const FAQ_DATA = [
  {
    q: 'How does the progressive overload engine calculate weight jumps?',
    a: 'MyFitAI monitors your logged working sets and rep performance across consecutive sessions. When you hit your target repetition ceiling across all working sets (e.g. 3 × 10), the system recommends an evidence-based micro-load increase (typically +2.5 kg for compound upper lifts, +5 kg for lower body).',
  },
  {
    q: 'Can I train without commercial gym equipment?',
    a: 'Yes. During onboarding or in Settings, select "Calisthenics / Bodyweight" or "Home Dumbbells". The workout generator will construct effective volume progressions using bodyweight leverage, tempo variations, and available loads.',
  },
  {
    q: 'How does the muscle training heatmap calculate fatigue?',
    a: 'Each completed set is mapped to primary and secondary anatomical muscle groups with scientifically calibrated volume weights (1.0 for primary agonist, 0.5 for synergist). Recovery is calculated from session completion time, volume landmarks (MEV, MAV, MRV), and reported sleep quality.',
  },
  {
    q: 'How does GPS territory capture work in Activity Hub?',
    a: 'When you record an outdoor run, walk, or cycling session, your GPS path is discretized into spatial grid tiles. Any tile traversed for the first time is captured for your territory. Running past previously captured tiles maintains their defense status and awards bonus XP.',
  },
  {
    q: 'Does MyFitAI connect to Health Connect and Apple Health?',
    a: 'Yes. In the Health Hub, tap "Connect Health Services" to grant read permissions for native pedometer steps, resting heart rate, active energy, and sleep duration.',
  },
  {
    q: 'How do streak multipliers and XP work?',
    a: 'Logging at least one verified athletic session, nutritional meal, or biometric check-in each day advances your consecutive streak. Streaks unlock higher athlete tier badges and contribute to territory defense efficiency.',
  },
  {
    q: 'How can I export my workout logs and GPX tracks?',
    a: 'Open the Activity Hub or Settings page and tap "Export Data". You can download standard RFC-compliant CSV summaries of all logged sets and standard GPX 1.1 tracks compatible with Strava and Garmin Connect.',
  },
];

export default function HelpCenter() {
  const navigate = useNavigate();
  const [openIdx, setOpenIdx] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const { showToast } = useToast();

  const filtered = searchQuery
    ? FAQ_DATA.filter(
        f =>
          f.q.toLowerCase().includes(searchQuery.toLowerCase()) ||
          f.a.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : FAQ_DATA;

  const quickLinks = [
    { icon: Dumbbell, label: 'Workout Tracking', color: '#30D158' },
    { icon: Utensils, label: 'Macro Nutrition', color: '#F5C542' },
    { icon: TrendingUp, label: 'Progress & PRs', color: '#4F9CF9' },
    { icon: Settings, label: 'Sensor & Wearables', color: '#A78BFA' },
  ];

  return (
    <main className="max-w-xl mx-auto px-4 sm:px-6 pt-6 pb-28 space-y-6">
      {/* Back Button */}
      <button
        onClick={() => navigate(-1)}
        className="w-10 h-10 rounded-xl bg-[#151517] border border-[#2A2A2D] flex items-center justify-center text-[#A1A1A6] hover:text-[#F5F5F5] transition-colors"
        aria-label="Back"
      >
        <ArrowLeft className="w-5 h-5" />
      </button>

      {/* Header */}
      <header className="space-y-1">
        <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-[#30D158] block">
          DOCUMENTATION & ATHLETE SUPPORT
        </span>
        <h1 className="font-headline font-black text-3xl sm:text-4xl text-[#F5F5F5] tracking-tight uppercase">
          Help Center
        </h1>
        <p className="text-xs text-[#A1A1A6]">
          Search knowledge base articles, training methodology guides, and sensor setups.
        </p>
      </header>

      {/* Search Input */}
      <div className="relative">
        <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#6B6B70]" />
        <input
          type="text"
          placeholder="Search topics: overload, recovery, GPS, macros..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          className="w-full bg-[#151517] border border-[#2A2A2D] rounded-xl py-3 pl-10 pr-4 text-sm text-[#F5F5F5] placeholder:text-[#6B6B70] focus:outline-none focus:border-[#30D158] transition-colors"
        />
      </div>

      {/* Quick Category Links */}
      <div className="grid grid-cols-2 gap-3">
        {quickLinks.map((link, i) => {
          const Icon = link.icon;
          return (
            <button
              key={i}
              onClick={() => showToast(`Opening ${link.label} documentation...`, 'info')}
              className="flex items-center gap-3 p-3.5 rounded-2xl bg-[#151517] border border-[#2A2A2D] hover:border-[#3A3A3D] transition-all text-left active:scale-[0.98] group"
            >
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center border shrink-0"
                style={{
                  backgroundColor: `${link.color}15`,
                  borderColor: `${link.color}33`,
                  color: link.color,
                }}
              >
                <Icon className="w-4 h-4" />
              </div>
              <span className="font-headline font-bold text-xs text-[#F5F5F5] group-hover:text-[#30D158] transition-colors truncate">
                {link.label}
              </span>
            </button>
          );
        })}
      </div>

      {/* FAQ Accordion */}
      <div className="space-y-3 pt-2">
        <h3 className="font-headline font-bold text-xs uppercase tracking-wider text-[#A1A1A6] px-1">
          Frequently Answered Questions
        </h3>

        {filtered.map((faq, i) => {
          const isOpen = openIdx === i;
          return (
            <div
              key={i}
              className="bg-[#151517] rounded-2xl border border-[#2A2A2D] overflow-hidden transition-colors"
            >
              <button
                onClick={() => setOpenIdx(isOpen ? null : i)}
                className="w-full flex items-center justify-between p-4 text-left hover:bg-[#1E1E20] transition-colors gap-3"
              >
                <span className="font-headline font-bold text-xs sm:text-sm text-[#F5F5F5] leading-snug">
                  {faq.q}
                </span>
                <ChevronDown
                  className={`w-4 h-4 text-[#A1A1A6] shrink-0 transition-transform duration-200 ${
                    isOpen ? 'rotate-180 text-[#30D158]' : ''
                  }`}
                />
              </button>
              {isOpen && (
                <div className="px-4 pb-4 pt-1 border-t border-[#2A2A2D]">
                  <p className="text-xs text-[#A1A1A6] leading-relaxed">
                    {faq.a}
                  </p>
                </div>
              )}
            </div>
          );
        })}

        {filtered.length === 0 && (
          <div className="text-center py-12 bg-[#151517] rounded-2xl border border-[#2A2A2D] p-6 space-y-2">
            <SearchX className="w-8 h-8 text-[#6B6B70] mx-auto" />
            <p className="text-sm font-bold text-[#F5F5F5]">No matching articles</p>
            <p className="text-xs text-[#A1A1A6]">
              Try searching with broader terms or contact athlete support directly.
            </p>
          </div>
        )}
      </div>

      {/* Support Direct Contact Card */}
      <div className="bg-[#151517] rounded-2xl p-6 border border-[#2A2A2D] text-center space-y-3">
        <div className="w-11 h-11 rounded-xl bg-[#30D158]/10 border border-[#30D158]/25 flex items-center justify-center mx-auto text-[#30D158]">
          <MessageSquare className="w-5 h-5" />
        </div>
        <div>
          <h3 className="font-headline font-bold text-sm uppercase tracking-wide text-[#F5F5F5]">
            Direct Athlete Support
          </h3>
          <p className="text-xs text-[#A1A1A6] mt-1">
            Questions regarding biomechanics, progressive overload rules, or sensor calibration?
          </p>
        </div>
        <button
          onClick={() => navigate('/feedback')}
          className="px-5 py-2.5 rounded-xl bg-[#30D158] hover:bg-[#30D158]/90 text-black font-headline font-bold text-xs uppercase tracking-wider transition-transform active:scale-[0.98]"
        >
          Send Inquiry / Feedback
        </button>
      </div>
    </main>
  );
}
