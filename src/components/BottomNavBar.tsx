import { NavLink } from 'react-router-dom';

export default function BottomNavBar() {
  const navItems = [
    { to: '/', icon: 'grid_view', label: 'Home' },
    { to: '/workout', icon: 'fitness_center', label: 'Workout' },
    { to: '/nutrition', icon: 'restaurant', label: 'Nutrition' },
    { to: '/progress', icon: 'analytics', label: 'Progress' },
    { to: '/profile', icon: 'person', label: 'Profile' },
  ];

  return (
    <nav className="fixed z-50 flex justify-around items-center px-1 py-2 mx-auto max-w-md bg-[var(--color-nav-bg)] backdrop-blur-xl bottom-5 left-1/2 -translate-x-1/2 w-[92%] rounded-2xl shadow-lg border border-white/[0.04]">
      {navItems.map(item => (
        <NavLink 
          key={item.to}
          to={item.to} 
          end={item.to === '/'}
          className={({ isActive }) => 
            `flex flex-1 flex-col items-center justify-center transition-colors duration-200 py-1 ${
              isActive 
                ? "text-primary" 
                : "text-on-surface-variant/60 hover:text-on-surface active:scale-95"
            }`
          }
        >
          {({ isActive }) => (
            <>
              <div className={`px-4 py-1 rounded-full mb-1 transition-all duration-300 ${isActive ? 'bg-primary/[0.12] scale-110' : ''}`}>
                <span 
                  className="material-symbols-outlined text-[22px]" 
                  style={isActive ? { fontVariationSettings: "'FILL' 1" } : {}}
                >
                  {item.icon}
                </span>
              </div>
              <span className={`text-[9px] tracking-tight font-headline transition-all ${isActive ? 'font-bold' : 'font-medium'}`}>
                {item.label}
              </span>
            </>
          )}
        </NavLink>
      ))}
    </nav>
  );
}
