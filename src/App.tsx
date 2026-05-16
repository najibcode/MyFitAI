import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import ProfileSettings from './pages/ProfileSettings';
import WorkoutPlanner from './pages/WorkoutPlanner';
import HealthHub from './pages/HealthHub';
import NutritionPlanner from './pages/NutritionPlanner';
import Reports from './pages/Reports';
import Progress from './pages/Progress';
import Settings from './pages/Settings';
import Community from './pages/Community';
import Onboarding from './pages/Onboarding';
import Subscription from './pages/Subscription';
import HelpCenter from './pages/HelpCenter';
import Privacy from './pages/Privacy';
import Feedback from './pages/Feedback';
import AICoach from './pages/AICoach';
import GoalsEditor from './pages/GoalsEditor';
import BottomNavBar from './components/BottomNavBar';
import { FitnessProvider } from './context/FitnessContext';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import { GamificationProvider } from './context/GamificationContext';
import { OnboardingProvider, useOnboarding } from './context/OnboardingContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import AuthPage from './pages/AuthPage';
import ActivityLogger from './components/ActivityLogger';
import NotificationsPanel from './components/NotificationsPanel';
import { SkeletonDashboard } from './components/SkeletonLoaders';
// ── Category 1: Workout Builder & Logging ──
import ActiveWorkout from './pages/ActiveWorkout';
import WorkoutHistory from './pages/WorkoutHistory';
import { WorkoutBuilderProvider } from './context/WorkoutBuilderContext';
import { PreferencesProvider } from './context/PreferencesContext';
import WeightCheckIn from './components/WeightCheckIn';
import { ToastProvider } from './context/ToastContext';

function AppContent() {
  const [showNotifications, setShowNotifications] = useState(false);
  const [showLogger, setShowLogger] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const { theme, toggleTheme } = useTheme();
  const { isOnboarded } = useOnboarding();
  const { user } = useAuth();

  // Simulate initial load for premium feel
  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 800);
    return () => clearTimeout(timer);
  }, []);

  // Show authentication page if not logged in
  if (!user) {
    return <AuthPage />;
  }

  // Show onboarding if not completed
  if (!isOnboarded) {
    return <Onboarding />;
  }

  // Show skeleton during initial load
  if (isLoading) {
    return (
      <div className="min-h-screen">
        <header className="bg-[var(--color-header-bg)] w-full top-0 sticky z-[100] flex justify-between items-center px-6 py-4 backdrop-blur-xl border-b border-white/[0.04]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[var(--color-surface-container-highest)] animate-pulse" />
            <div className="w-20 h-5 bg-[var(--color-surface-container-highest)] rounded-lg animate-pulse" />
          </div>
          <div className="flex items-center gap-2">
            {[1, 2, 3].map(i => (
              <div key={i} className="w-9 h-9 rounded-full bg-white/[0.03] animate-pulse" />
            ))}
          </div>
        </header>
        <SkeletonDashboard />
      </div>
    );
  }

  return (
    <BrowserRouter>
      <div className="min-h-screen pb-28 relative">
        {/* Header — clean, minimal, no gradient logo */}
        <header className="bg-[var(--color-header-bg)] w-full top-0 sticky z-[100] flex justify-between items-center px-6 py-3.5 backdrop-blur-xl border-b border-white/[0.04]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center">
              <span className="material-symbols-outlined text-black text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>exercise</span>
            </div>
            <span className="text-lg font-black tracking-tight font-headline text-on-surface">MyFitAI</span>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={toggleTheme}
              className="w-9 h-9 flex items-center justify-center rounded-full text-on-surface-variant hover:text-on-surface hover:bg-on-surface/[0.04] transition-colors active:scale-95"
              title={theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
            >
              <span className="material-symbols-outlined text-[20px]">{theme === 'dark' ? 'light_mode' : 'dark_mode'}</span>
            </button>
            <button 
              onClick={() => setShowNotifications(true)}
              className="w-9 h-9 flex items-center justify-center rounded-full text-on-surface-variant hover:text-on-surface hover:bg-on-surface/[0.04] transition-colors active:scale-95 relative"
            >
              <span className="material-symbols-outlined text-[20px]">notifications</span>
              <span className="absolute top-2 right-2 w-1.5 h-1.5 bg-primary rounded-full" />
            </button>
            <button 
              onClick={() => setShowLogger(true)}
              className="w-9 h-9 flex items-center justify-center rounded-full text-on-surface-variant hover:text-on-surface hover:bg-on-surface/[0.04] transition-colors active:scale-95"
              title="Log Activity"
            >
              <span className="material-symbols-outlined text-[20px]">add_circle</span>
            </button>
          </div>
        </header>

        <NotificationsPanel isOpen={showNotifications} onClose={() => setShowNotifications(false)} />
        <ActivityLogger isOpen={showLogger} onClose={() => setShowLogger(false)} />
        <WeightCheckIn />


        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/workout" element={<WorkoutPlanner />} />
          <Route path="/nutrition" element={<NutritionPlanner />} />
          <Route path="/health" element={<HealthHub />} />
          <Route path="/profile" element={<ProfileSettings />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/progress" element={<Progress />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/community" element={<Community />} />
          <Route path="/subscription" element={<Subscription />} />
          <Route path="/help" element={<HelpCenter />} />
          <Route path="/privacy" element={<Privacy />} />
          <Route path="/feedback" element={<Feedback />} />
          <Route path="/ai-coach" element={<AICoach />} />
          <Route path="/goals" element={<GoalsEditor />} />
          {/* ── Category 1: Workout Builder & Logging ── */}
          <Route path="/workout/active" element={<ActiveWorkout />} />
          <Route path="/workout/history" element={<WorkoutHistory />} />
        </Routes>



        <BottomNavBar />
      </div>
    </BrowserRouter>
  );
}

function UserSpecificProviders({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  
  if (loading) return null;

  return (
    <div key={user?.uid || 'guest'} className="contents">
      <ToastProvider>
        <FitnessProvider>
          <GamificationProvider>
            <PreferencesProvider>
              <WorkoutBuilderProvider>
                <OnboardingProvider>
                  {children}
                </OnboardingProvider>
              </WorkoutBuilderProvider>
            </PreferencesProvider>
          </GamificationProvider>
        </FitnessProvider>
      </ToastProvider>
    </div>
  );
}

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <UserSpecificProviders>
          <AppContent />
        </UserSpecificProviders>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
