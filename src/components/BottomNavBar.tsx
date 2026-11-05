import { NavLink } from 'react-router-dom';
import { LayoutGrid, Dumbbell, Footprints, Utensils, User } from 'lucide-react';
import { triggerHaptic, MotionEasings, MotionDurations } from '../design/motion';

export default function BottomNavBar() {
  const navItems = [
    { to: '/', icon: LayoutGrid, label: 'Home' },
    { to: '/workout', icon: Dumbbell, label: 'Workout' },
    { to: '/activity', icon: Footprints, label: 'Activity' },
    { to: '/nutrition', icon: Utensils, label: 'Nutrition' },
    { to: '/profile', icon: User, label: 'Profile' },
  ];

  return (
    <nav 
      aria-label="Mobile Navigation"
      className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-[var(--color-surface)]/95 backdrop-blur-xl border-t border-[var(--color-border)] select-none pb-[max(env(safe-area-inset-bottom),0.5rem)]"
    >
      <div className="max-w-md mx-auto flex items-center justify-around px-2 pt-1.5 relative">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              onClick={() => triggerHaptic('light')}
              className={({ isActive }) =>
                `flex flex-1 flex-col items-center justify-center py-1 min-h-[48px] rounded-xl transition-all active:scale-95 relative ${
                  isActive
                    ? 'text-[var(--color-primary)]'
                    : 'text-[var(--color-muted)] hover:text-[var(--color-on-surface)]'
                }`
              }
              style={{
                transitionDuration: `${MotionDurations.micro}ms`,
                transitionTimingFunction: MotionEasings.athletic,
              }}
            >
              {({ isActive }) => (
                <>
                  <Icon 
                    className={`w-[20px] h-[20px] transition-all ${
                      isActive ? 'stroke-[2.5] scale-110 -translate-y-0.5' : 'stroke-[1.8]'
                    }`}
                    style={{
                      transitionDuration: `${MotionDurations.small}ms`,
                      transitionTimingFunction: MotionEasings.athletic,
                    }}
                  />
                  <span className={`text-[10px] tracking-tight mt-1 transition-all ${
                    isActive ? 'font-bold text-[var(--color-primary)]' : 'font-medium'
                  }`}>
                    {item.label}
                  </span>
                  {isActive && (
                    <span
                      className="w-1 h-1 rounded-full bg-[var(--color-primary)] mt-0.5 animate-fade-in shadow-[0_0_6px_var(--color-primary)]"
                    />
                  )}
                </>
              )}
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}
