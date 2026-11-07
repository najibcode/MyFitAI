// ─────────────────────────────────────────────────────────────
// MyFitAI — Athlete Community & Social Hub
// Athletic Personal Operating System UI/UX
// ─────────────────────────────────────────────────────────────

import { useState, useCallback } from 'react';
import { useToast } from '../context/ToastContext';
import {
  Trophy,
  Heart,
  MessageSquare,
  Share2,
  UserPlus,
  Search,
  Flame,
  Award,
  Shield,
  Activity,
  Plus,
} from 'lucide-react';

interface MockPost {
  id: string;
  user: string;
  initials: string;
  avatarBg: string;
  time: string;
  text: string;
  likes: number;
  comments: number;
  type: 'Workout PR' | 'Transformation' | 'Challenge' | 'Nutrition';
  metric?: string;
}

const MOCK_POSTS: MockPost[] = [
  {
    id: '1',
    user: 'Alex Rivera',
    initials: 'AR',
    avatarBg: 'bg-[#FF8A00]/20 text-[#FF8A00] border-[#FF8A00]/40',
    time: '2h ago',
    text: 'Crushed a new deadlift benchmark — 315 lbs for 5 reps. The progressive overload cycle is yielding clean compound gains.',
    likes: 34,
    comments: 8,
    type: 'Workout PR',
    metric: '315 LBS × 5 REPS',
  },
  {
    id: '2',
    user: 'Maya Chen',
    initials: 'MC',
    avatarBg: 'bg-[#30D158]/20 text-[#30D158] border-[#30D158]/40',
    time: '4h ago',
    text: 'Week 8 check-in: Down 5.4 kg while maintaining squat velocity. Consistency over intensity, every single morning.',
    likes: 89,
    comments: 24,
    type: 'Transformation',
    metric: '-5.4 KG · 8 WEEKS',
  },
  {
    id: '3',
    user: 'Jordan Kim',
    initials: 'JK',
    avatarBg: 'bg-[#4F9CF9]/20 text-[#4F9CF9] border-[#4F9CF9]/40',
    time: '6h ago',
    text: 'Starting a 30-day isometric core stability challenge this Monday. Targeting 3 minutes total accumulated plank daily.',
    likes: 56,
    comments: 19,
    type: 'Challenge',
    metric: '30-DAY CHALLENGE',
  },
  {
    id: '4',
    user: 'Priya Sharma',
    initials: 'PS',
    avatarBg: 'bg-[#F5C542]/20 text-[#F5C542] border-[#F5C542]/40',
    time: '1d ago',
    text: 'High-protein recovery meal prep for the week: grilled chicken breast, lentils, quinoa, and roasted asparagus. 2,400 kcal with 185g protein.',
    likes: 112,
    comments: 31,
    type: 'Nutrition',
    metric: '185G PROTEIN · 2,400 KCAL',
  },
];

const CHALLENGES = [
  {
    id: 'c1',
    title: '30-Day Core Endurance',
    participants: 234,
    daysLeft: 22,
    category: 'STRENGTH',
    accent: '#30D158',
    reward: '+500 XP',
  },
  {
    id: 'c2',
    title: '100 Push-Up Benchmark Week',
    participants: 567,
    daysLeft: 5,
    category: 'HYPERTROPHY',
    accent: '#FF8A00',
    reward: '+750 XP',
  },
  {
    id: 'c3',
    title: 'Hydration & Daily Steps Streak',
    participants: 891,
    daysLeft: 14,
    category: 'RECOVERY',
    accent: '#4F9CF9',
    reward: '+400 XP',
  },
];

export default function Community() {
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<'feed' | 'challenges' | 'friends'>('feed');

  // Local state for interactive like/comment counts
  const [likedPosts, setLikedPosts] = useState<Set<string>>(new Set());
  const [likeCounts, setLikeCounts] = useState<Record<string, number>>(() =>
    Object.fromEntries(MOCK_POSTS.map(p => [p.id, p.likes]))
  );
  const [commentCounts] = useState<Record<string, number>>(() =>
    Object.fromEntries(MOCK_POSTS.map(p => [p.id, p.comments]))
  );

  const handleLike = useCallback((postId: string) => {
    setLikedPosts(prev => {
      const next = new Set(prev);
      if (next.has(postId)) {
        next.delete(postId);
        setLikeCounts(c => ({ ...c, [postId]: (c[postId] || 1) - 1 }));
      } else {
        next.add(postId);
        setLikeCounts(c => ({ ...c, [postId]: (c[postId] || 0) + 1 }));
      }
      return next;
    });
  }, []);

  const handleComment = useCallback((postId: string) => {
    showToast('Discussion thread opening soon!', 'info');
    void postId;
  }, [showToast]);

  const handleShare = useCallback(() => {
    if (navigator.share) {
      navigator.share({ title: 'MyFitAI Athletes', text: 'Check out this athlete achievement on MyFitAI!' }).catch(() => {});
    } else {
      showToast('Post link copied to clipboard!', 'success');
    }
  }, [showToast]);

  return (
    <main className="max-w-3xl mx-auto px-4 sm:px-6 pt-6 pb-28 space-y-6">
      {/* Header */}
      <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-[#2A2A2D] pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="w-2 h-2 rounded-full bg-[#30D158] animate-pulse" />
            <p className="text-[#30D158] font-mono font-bold tracking-widest uppercase text-[10px]">
              ATHLETE NETWORK & SQUAD
            </p>
          </div>
          <h1 className="font-headline font-black text-3xl sm:text-4xl text-[#F5F5F5] tracking-tight">
            COMMUNITY
          </h1>
          <p className="text-[#A1A1A6] text-xs mt-1">
            Connect with dedicated athletes, benchmark strength, and join team challenges.
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex bg-[#151517] p-1 rounded-xl border border-[#2A2A2D] self-start sm:self-auto">
          {(['feed', 'challenges', 'friends'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-lg font-headline font-bold text-xs uppercase tracking-wider transition-all ${
                activeTab === tab
                  ? 'bg-[#30D158] text-black shadow-sm'
                  : 'text-[#A1A1A6] hover:text-[#F5F5F5]'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </header>

      {/* ═══════════════════════════════════════════════════════
          TAB 1: ATHLETE FEED
      ═══════════════════════════════════════════════════════ */}
      {activeTab === 'feed' && (
        <div className="space-y-4">
          {/* Create Post Prompt */}
          <div className="bg-[#151517] rounded-2xl p-4 border border-[#2A2A2D] flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#1E1E20] border border-[#2A2A2D] flex items-center justify-center text-[#30D158]">
              <Plus className="w-5 h-5" />
            </div>
            <input
              type="text"
              readOnly
              onClick={() => showToast('Athlete posting enabled in Pro tier!', 'info')}
              placeholder="Share workout PR, nutrition meal, or weekly win..."
              className="bg-transparent text-sm text-[#F5F5F5] placeholder:text-[#6B6B70] flex-1 cursor-pointer outline-none"
            />
            <button
              onClick={() => showToast('Athlete posting enabled in Pro tier!', 'info')}
              className="px-4 py-2 bg-[#FF8A00] hover:bg-[#FF8A00]/90 text-black rounded-xl text-xs font-headline font-bold uppercase tracking-wider transition-transform active:scale-[0.98]"
            >
              Post
            </button>
          </div>

          {/* Posts List */}
          {MOCK_POSTS.map(post => (
            <article
              key={post.id}
              className="bg-[#151517] rounded-2xl p-5 border border-[#2A2A2D] space-y-4 hover:border-[#3A3A3D] transition-colors"
            >
              {/* Post Header */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-11 h-11 rounded-xl flex items-center justify-center font-headline font-bold text-sm border ${post.avatarBg}`}
                  >
                    {post.initials}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-headline font-bold text-sm text-[#F5F5F5]">
                        {post.user}
                      </span>
                      <span className="text-[10px] text-[#30D158] font-mono font-semibold px-1.5 py-0.5 rounded bg-[#30D158]/10 border border-[#30D158]/20">
                        VERIFIED
                      </span>
                    </div>
                    <span className="text-[11px] text-[#6B6B70] font-mono">
                      {post.time}
                    </span>
                  </div>
                </div>

                <span className="text-[10px] px-2.5 py-1 rounded-lg bg-[#1E1E20] text-[#A1A1A6] font-mono font-bold uppercase tracking-wider border border-[#2A2A2D]">
                  {post.type}
                </span>
              </div>

              {/* Metric Badge if present */}
              {post.metric && (
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#1E1E20] border border-[#2A2A2D]">
                  <Activity className="w-3.5 h-3.5 text-[#30D158]" />
                  <span className="font-mono font-black text-xs text-[#F5F5F5] tracking-wide">
                    {post.metric}
                  </span>
                </div>
              )}

              {/* Text */}
              <p className="text-sm text-[#F5F5F5]/90 leading-relaxed">
                {post.text}
              </p>

              {/* Action Bar */}
              <div className="pt-3 border-t border-[#2A2A2D] flex items-center justify-between text-xs text-[#A1A1A6]">
                <div className="flex items-center gap-5">
                  <button
                    onClick={() => handleLike(post.id)}
                    className={`flex items-center gap-1.5 transition-colors font-mono font-bold ${
                      likedPosts.has(post.id)
                        ? 'text-[#FF453A]'
                        : 'hover:text-[#FF453A]'
                    }`}
                  >
                    <Heart
                      className={`w-4 h-4 ${
                        likedPosts.has(post.id) ? 'fill-[#FF453A]' : ''
                      }`}
                    />
                    <span className="tabular-nums">{likeCounts[post.id] || 0}</span>
                  </button>

                  <button
                    onClick={() => handleComment(post.id)}
                    className="flex items-center gap-1.5 hover:text-[#F5F5F5] transition-colors font-mono font-bold"
                  >
                    <MessageSquare className="w-4 h-4" />
                    <span className="tabular-nums">{commentCounts[post.id] || 0}</span>
                  </button>
                </div>

                <button
                  onClick={handleShare}
                  className="flex items-center gap-1.5 hover:text-[#30D158] transition-colors font-mono"
                  aria-label="Share post"
                >
                  <Share2 className="w-4 h-4" />
                </button>
              </div>
            </article>
          ))}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════
          TAB 2: CHALLENGES & LEADERBOARDS
      ═══════════════════════════════════════════════════════ */}
      {activeTab === 'challenges' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-3">
            {CHALLENGES.map(ch => (
              <div
                key={ch.id}
                onClick={() => showToast(`Joined the ${ch.title} challenge!`, 'success')}
                className="bg-[#151517] rounded-2xl p-5 border border-[#2A2A2D] hover:border-[#3A3A3D] transition-all cursor-pointer space-y-4 group"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-12 h-12 rounded-xl flex items-center justify-center border"
                      style={{
                        backgroundColor: `${ch.accent}15`,
                        borderColor: `${ch.accent}33`,
                        color: ch.accent,
                      }}
                    >
                      <Trophy className="w-6 h-6" />
                    </div>
                    <div>
                      <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#A1A1A6] block">
                        {ch.category}
                      </span>
                      <h3 className="font-headline font-bold text-base text-[#F5F5F5] group-hover:text-[#30D158] transition-colors">
                        {ch.title}
                      </h3>
                    </div>
                  </div>

                  <span className="text-xs font-mono font-black text-[#F5C542] px-2.5 py-1 rounded bg-[#F5C542]/10 border border-[#F5C542]/20">
                    {ch.reward}
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs text-[#A1A1A6] pt-2 border-t border-[#2A2A2D]">
                  <span className="font-mono">{ch.participants} enrolled athletes</span>
                  <span className="font-mono text-[#30D158]">{ch.daysLeft} days remaining</span>
                  <button className="px-3 py-1.5 rounded-lg bg-[#30D158] text-black font-headline font-bold text-xs uppercase tracking-wider">
                    Join
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Global Leaderboard Callout */}
          <div className="bg-[#151517] rounded-2xl p-6 border border-[#2A2A2D] text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-[#FF8A00]/10 border border-[#FF8A00]/20 flex items-center justify-center mx-auto text-[#FF8A00]">
              <Award className="w-6 h-6" />
            </div>
            <h3 className="font-headline font-black text-lg text-[#F5F5F5] uppercase tracking-wide">
              Global Athlete Leaderboard
            </h3>
            <p className="text-xs text-[#A1A1A6] max-w-sm mx-auto">
              Compete against global athletes ranked by verified progressive overload volume, GPS territory, and streak consistency.
            </p>
            <div className="pt-2">
              <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-[#FF8A00] px-3 py-1 rounded-full bg-[#FF8A00]/10 border border-[#FF8A00]/20">
                Weekly Reset Every Sunday
              </span>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════
          TAB 3: ATHLETES & FRIENDS
      ═══════════════════════════════════════════════════════ */}
      {activeTab === 'friends' && (
        <div className="space-y-4">
          {/* Search Bar */}
          <div className="flex items-center gap-3 bg-[#151517] rounded-xl px-4 py-3 border border-[#2A2A2D]">
            <Search className="w-4 h-4 text-[#6B6B70]" />
            <input
              type="text"
              placeholder="Search athletes by handle, name, or gym..."
              className="bg-transparent outline-none text-sm text-[#F5F5F5] placeholder:text-[#6B6B70] flex-1"
            />
          </div>

          {/* Athletes List */}
          {MOCK_POSTS.map(post => (
            <div
              key={post.id}
              className="bg-[#151517] rounded-2xl p-4 border border-[#2A2A2D] flex items-center justify-between gap-3"
            >
              <div className="flex items-center gap-3">
                <div
                  className={`w-11 h-11 rounded-xl flex items-center justify-center font-headline font-bold text-sm border ${post.avatarBg}`}
                >
                  {post.initials}
                </div>
                <div>
                  <h4 className="font-headline font-bold text-sm text-[#F5F5F5]">
                    {post.user}
                  </h4>
                  <div className="flex items-center gap-2 text-[11px] text-[#A1A1A6] font-mono mt-0.5">
                    <span className="flex items-center gap-1 text-[#30D158]">
                      <Flame className="w-3 h-3" /> 14 Day Streak
                    </span>
                    <span>·</span>
                    <span>Level 8 Athlete</span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => showToast(`Follow request sent to ${post.user}`, 'success')}
                className="w-10 h-10 rounded-xl bg-[#1E1E20] hover:bg-[#30D158] hover:text-black text-[#F5F5F5] border border-[#2A2A2D] flex items-center justify-center transition-all active:scale-[0.96]"
                aria-label={`Follow ${post.user}`}
              >
                <UserPlus className="w-4 h-4" />
              </button>
            </div>
          ))}

          {/* Accountability Partners Module */}
          <div className="bg-[#151517] rounded-2xl p-6 border border-[#2A2A2D] space-y-3">
            <div className="flex items-center gap-2 text-[#30D158]">
              <Shield className="w-5 h-5" />
              <h3 className="font-headline font-bold text-sm uppercase tracking-wider text-[#F5F5F5]">
                Accountability Squad
              </h3>
            </div>
            <p className="text-xs text-[#A1A1A6] leading-relaxed">
              Athletes who pair with an accountability partner show a 78% higher adherence rate to 8-week progressive overload cycles.
            </p>
            <button
              onClick={() => showToast('Pairing algorithm matching you with compatible athletes...', 'info')}
              className="w-full py-3 rounded-xl bg-[#1E1E20] hover:bg-[#2A2A2D] text-[#30D158] font-headline font-bold text-xs uppercase tracking-wider border border-[#30D158]/30 transition-colors"
            >
              Find Training Partner
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
