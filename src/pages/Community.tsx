import { useState, useCallback } from 'react';
import { useToast } from '../context/ToastContext';

const MOCK_POSTS = [
  { id: '1', user: 'Alex Rivera', initials: 'AR', gradient: 'from-[#FF7A00] to-[#FF4D4D]', time: '2h ago', text: 'Just crushed a new deadlift PR — 315 lbs! 🔥 The progressive overload program is working.', likes: 34, comments: 8, type: 'Workout PR' },
  { id: '2', user: 'Maya Chen', initials: 'MC', gradient: 'from-[#6FFB85] to-[#00b4d8]', time: '4h ago', text: 'Week 8 check-in: Down 12 lbs and feeling stronger than ever. Consistency over intensity, always.', likes: 89, comments: 24, type: 'Transformation' },
  { id: '3', user: 'Jordan Kim', initials: 'JK', gradient: 'from-[#fab0ff] to-[#FF4D4D]', time: '6h ago', text: 'Who wants to join a 30-day plank challenge? Starting Monday! 💪', likes: 56, comments: 19, type: 'Challenge' },
  { id: '4', user: 'Priya Sharma', initials: 'PS', gradient: 'from-[#60A5FA] to-[#6FFB85]', time: '1d ago', text: 'My high-protein Indian meal prep for the week: Paneer tikka, chicken keema, dal makhani, and roti. All under 2400 cal/day 🍛', likes: 112, comments: 31, type: 'Nutrition' },
];

const CHALLENGES = [
  { title: '30-Day Plank', participants: 234, icon: 'exercise', color: '#FF4D4D', daysLeft: 22 },
  { title: '100 Pushup Week', participants: 567, icon: 'fitness_center', color: '#FF7A00', daysLeft: 5 },
  { title: 'Hydration Hero', participants: 891, icon: 'water_drop', color: '#00b4d8', daysLeft: 14 },
];

export default function Community() {
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<'feed' | 'challenges' | 'friends'>('feed');

  // Local state for interactive like/comment counts
  const [likedPosts, setLikedPosts] = useState<Set<string>>(new Set());
  const [likeCounts, setLikeCounts] = useState<Record<string, number>>(
    () => Object.fromEntries(MOCK_POSTS.map(p => [p.id, p.likes]))
  );
  const [commentCounts] = useState<Record<string, number>>(
    () => Object.fromEntries(MOCK_POSTS.map(p => [p.id, p.comments]))
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
    showToast('Comments opening soon!', 'info');
    void postId; // acknowledge use
  }, [showToast]);

  const handleShare = useCallback(() => {
    if (navigator.share) {
      navigator.share({ title: 'MyFitAI', text: 'Check out this post on MyFitAI!' }).catch(() => {});
    } else {
      showToast('Link copied to clipboard!', 'success');
    }
  }, [showToast]);

  return (
    <main className="max-w-2xl mx-auto px-6 pt-8 pb-32 space-y-8">
      <header>
        <p className="text-secondary font-label font-bold tracking-widest uppercase text-[10px] mb-2">Connect & Compete</p>
        <h1 className="font-headline font-extrabold text-4xl tracking-tighter">COMMUNITY</h1>
      </header>

      <div className="flex gap-2 overflow-x-auto [scrollbar-width:none]">
        {(['feed', 'challenges', 'friends'] as const).map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)} className={`px-5 py-2.5 rounded-xl font-headline font-bold text-xs uppercase tracking-widest transition-all whitespace-nowrap ${activeTab === tab ? 'bg-primary text-black' : 'bg-[var(--color-surface-container)] text-on-surface-variant border border-white/5'}`}>{tab}</button>
        ))}
      </div>

      {activeTab === 'feed' && (
        <div className="space-y-6">
          {/* Create Post */}
          <div className="bg-[var(--color-surface-container)] rounded-2xl p-5 border border-white/5 flex items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary"><span className="material-symbols-outlined text-lg">edit</span></div>
            <p className="text-on-surface-variant text-sm flex-1">Share your progress...</p>
            <button onClick={() => showToast('Post creation coming in Pro!', 'info')} className="px-4 py-2 bg-primary/10 text-primary rounded-lg text-xs font-bold uppercase tracking-widest border border-primary/20">Post</button>
          </div>

          {/* Feed */}
          {MOCK_POSTS.map(post => (
            <div key={post.id} className="bg-[var(--color-surface-container)] rounded-[2rem] overflow-hidden border border-white/5">
              <div className="p-5">
                <div className="flex items-center gap-3 mb-3">
                  {/* Local gradient avatar instead of external Unsplash URL */}
                  <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${post.gradient} flex items-center justify-center text-white text-xs font-bold ring-2 ring-white/10`}>
                    {post.initials}
                  </div>
                  <div className="flex-1">
                    <p className="font-headline font-bold text-sm">{post.user}</p>
                    <p className="text-[10px] text-on-surface-variant">{post.time}</p>
                  </div>
                  <span className="text-[9px] px-2 py-1 rounded-full bg-primary/10 text-primary font-bold uppercase tracking-widest border border-primary/20">{post.type}</span>
                </div>
                <p className="text-sm leading-relaxed text-white/90">{post.text}</p>
              </div>
              <div className="px-5 py-3 flex items-center gap-6 border-t border-white/5">
                <button
                  onClick={() => handleLike(post.id)}
                  className={`flex items-center gap-1.5 transition-colors text-xs font-bold ${
                    likedPosts.has(post.id) ? 'text-[#FF4D4D]' : 'text-on-surface-variant hover:text-[#FF4D4D]'
                  }`}
                >
                  <span className="material-symbols-outlined text-base" style={likedPosts.has(post.id) ? { fontVariationSettings: "'FILL' 1" } : {}}>favorite</span> {likeCounts[post.id] || 0}
                </button>
                <button
                  onClick={() => handleComment(post.id)}
                  className="flex items-center gap-1.5 text-on-surface-variant hover:text-primary transition-colors text-xs font-bold"
                >
                  <span className="material-symbols-outlined text-base">chat_bubble</span> {commentCounts[post.id] || 0}
                </button>
                <button onClick={handleShare} className="flex items-center gap-1.5 text-on-surface-variant hover:text-secondary transition-colors text-xs font-bold ml-auto">
                  <span className="material-symbols-outlined text-base">share</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'challenges' && (
        <div className="space-y-4">
          {CHALLENGES.map((ch, i) => (
            <div key={i} className="bg-[var(--color-surface-container)] rounded-2xl p-6 border border-white/5 flex items-center gap-4 group hover:border-primary/30 transition-colors cursor-pointer" onClick={() => showToast(`Successfully joined the ${ch.title} challenge!`, 'success')}>
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ backgroundColor: `${ch.color}20`, color: ch.color }}>
                <span className="material-symbols-outlined text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>{ch.icon}</span>
              </div>
              <div className="flex-1">
                <p className="font-headline font-bold">{ch.title}</p>
                <p className="text-[10px] text-on-surface-variant mt-0.5">{ch.participants} participants • {ch.daysLeft} days left</p>
              </div>
              <button className="px-4 py-2 bg-primary text-black rounded-lg text-xs font-bold uppercase tracking-widest">Join</button>
            </div>
          ))}
          {/* Leaderboard Placeholder */}
          <div className="bg-gradient-to-br from-[#FFD700]/10 to-transparent rounded-[2rem] p-8 border border-[#FFD700]/20 text-center">
            <span className="material-symbols-outlined text-[#FFD700] text-5xl mb-4 block" style={{ fontVariationSettings: "'FILL' 1" }}>leaderboard</span>
            <h3 className="font-headline font-bold text-xl mb-2">Global Leaderboard</h3>
            <p className="text-on-surface-variant text-sm mb-4">Compete with athletes worldwide</p>
            <p className="text-[#FFD700] text-[10px] font-bold uppercase tracking-widest">Coming in Pro</p>
          </div>
        </div>
      )}

      {activeTab === 'friends' && (
        <div className="space-y-4">
          <div className="flex items-center gap-3 bg-[var(--color-surface-container)] rounded-xl px-4 py-3 border border-white/5">
            <span className="material-symbols-outlined text-on-surface-variant">search</span>
            <input className="bg-transparent outline-none text-sm text-white placeholder:text-white/30 flex-1" placeholder="Search friends..." />
          </div>
          {MOCK_POSTS.map((post, i) => (
            <div key={i} className="bg-[var(--color-surface-container)] rounded-2xl p-5 border border-white/5 flex items-center gap-4">
              <div className={`w-12 h-12 rounded-full bg-gradient-to-br ${post.gradient} flex items-center justify-center text-white text-sm font-bold ring-2 ring-white/10`}>
                {post.initials}
              </div>
              <div className="flex-1">
                <p className="font-headline font-bold text-sm">{post.user}</p>
                <p className="text-[10px] text-on-surface-variant">14 day streak • Level 8</p>
              </div>
              <button className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center border border-primary/20">
                <span className="material-symbols-outlined text-base">person_add</span>
              </button>
            </div>
          ))}
          {/* Accountability Partners */}
          <div className="bg-gradient-to-br from-secondary/10 to-transparent rounded-[2rem] p-6 border border-secondary/20">
            <h3 className="font-headline font-bold text-lg mb-2 flex items-center gap-2"><span className="material-symbols-outlined text-secondary">handshake</span> Accountability Partners</h3>
            <p className="text-on-surface-variant text-sm">Pair up with a partner to keep each other motivated and consistent.</p>
            <button onClick={() => showToast('Finding partners feature coming soon!', 'info')} className="mt-4 w-full py-3 bg-secondary/10 border border-secondary/30 text-secondary rounded-xl font-bold text-xs uppercase tracking-widest">Find a Partner</button>
          </div>
        </div>
      )}
    </main>
  );
}
