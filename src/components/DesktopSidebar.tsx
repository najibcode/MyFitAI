import { NavLink, Link } from 'react-router-dom';
import { 
  LayoutGrid, 
  Dumbbell, 
  Footprints, 
  Utensils, 
  TrendingUp, 
  User, 
  BrainCircuit,
  Flame,
  ChevronRight,
  Play,
} from 'lucide-react';
import { useFitnessContext } from '../context/FitnessContext';
import { useGamification } from '../context/GamificationContext';
import MyFitAILogo from './brand/MyFitAILogo';

export default function DesktopSidebar() {
  const { profile } = useFitnessContext();
  const { streak } = useGamification();

  const navItems = [
    { to: '/', icon: LayoutGrid, label: 'Home' },
    { to: '/workout', icon: Dumbbell, label: 'Workout' },
    { to: '/activity', icon: Footprints, label: 'Activity' },
    { to: '/nutrition', icon: Utensils, label: 'Nutrition' },
    { to: '/progress', icon: TrendingUp, label: 'Progress' },
    { to: '/ai-coach', icon: BrainCircuit, label: 'AI Coach' },
    { to: '/profile', icon: User, label: 'Profile' },
  ];

  return (
    <aside className="hidden lg:flex flex-col w-64 h-screen sticky top-0 bg-[var(--color-surface)] border-r border-[var(--color-border)] select-none z-40">
      {/* Brand Header */}
      <div className="px-6 py-6 border-b border-[var(--color-border)]">
        <Link to="/" className="flex items-center gap-3 group">
          <MyFitAILogo size={36} variant="mark" className="transition-transform group-hover:scale-105" />
          <div>
            <span className="font-headline font-black text-xl tracking-tight text-[var(--color-on-surface)] block leading-none">
              MyFit<span className="text-[var(--color-primary)]">AI</span>
            </span>
            <span className="text-[10px] tracking-widest uppercase font-semibold text-[var(--color-primary)] block mt-0.5">
              Athlete OS
            </span>
          </div>
        </Link>
      </div>

      {/* Nav Items */}
      <nav className="flex-1 px-3 py-6 space-y-1.5 overflow-y-auto custom-scrollbar">
        <p className="px-3 text-[10px] font-bold uppercase tracking-widest text-[var(--color-muted)] mb-2">
          Navigation
        </p>
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all group ${
                  isActive
                    ? 'bg-[var(--color-surface-elevated)] text-[var(--color-primary)] shadow-sm'
                    : 'text-[var(--color-on-surface-variant)] hover:text-[var(--color-on-surface)] hover:bg-white/[0.03]'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <Icon
                    className={`w-[18px] h-[18px] transition-colors ${
                      isActive
                        ? 'text-[var(--color-primary)] stroke-[2.5]'
                        : 'text-[var(--color-muted)] group-hover:text-[var(--color-on-surface)] stroke-[2]'
                    }`}
                  />
                  <span className="flex-1 tracking-tight">{item.label}</span>
                  {isActive && (
                    <div className="w-1.5 h-1.5 rounded-full bg-[var(--color-primary)]" />
                  )}
                </>
              )}
            </NavLink>
          );
        })}

        {/* Spontaneous Training Quick Start Button */}
        <div className="pt-4 px-1">
          <Link
            to="/workout?quick=true"
            className="w-full py-3 px-3.5 rounded-xl bg-[#FF8A00] hover:brightness-110 active:scale-[0.98] transition-all text-black font-headline font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-md shadow-[#FF8A00]/20"
          >
            <Play className="w-3.5 h-3.5 fill-black stroke-none" />
            <span>Quick Start</span>
          </Link>
        </div>
      </nav>

      {/* Bottom Athlete Status Bar */}
      <div className="p-4 border-t border-[var(--color-border)]">
        <Link
          to="/profile"
          className="flex items-center gap-3 p-2.5 rounded-xl bg-[var(--color-surface-elevated)]/60 hover:bg-[var(--color-surface-elevated)] border border-[var(--color-border)] transition-all group"
        >
          <div className="w-9 h-9 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)] flex items-center justify-center font-bold text-xs text-[var(--color-on-surface)]">
            {profile.name?.slice(0, 2).toUpperCase() || 'AT'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-headline font-bold text-xs text-[var(--color-on-surface)] truncate">
              {profile.name || 'Athlete'}
            </p>
            <div className="flex items-center gap-1.5 text-[10px] text-[var(--color-on-surface-variant)]">
              <span className="inline-flex items-center gap-0.5 text-amber-400 font-semibold">
                <Flame className="w-3 h-3 stroke-[2.5]" /> {streak}d streak
              </span>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-[var(--color-muted)] group-hover:text-[var(--color-on-surface)] transition-colors" />
        </Link>
      </div>
    </aside>
  );
}
