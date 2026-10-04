import { useState, useEffect, lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, useLocation, Link } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import ProfileSettings from './pages/ProfileSettings';
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
import { NutritionProvider } from './context/NutritionContext';
import { ActivityProvider } from './context/ActivityContext';

// ── Lazy-loaded heavy modules (code-split for faster initial load) ──
// These pages import large data bundles (indianDishes: 81KB, nutritionFoods: 15KB,
// exerciseLibrary: 15KB). Lazy loading prevents them from blocking initial paint.
const WorkoutPlanner = lazy(() => import('./pages/WorkoutPlanner'));
const NutritionPlanner = lazy(() => import('./pages/NutritionPlanner'));
const ActivityHub = lazy(() => import('./pages/ActivityHub'));
const Reports = lazy(() => import('./pages/Reports'));
const Progress = lazy(() => import('./pages/Progress'));
const HealthHub = lazy(() => import('./pages/HealthHub'));
const ExerciseLibrary = lazy(() => import('./pages/ExerciseLibrary'));
const CustomExerciseCreator = lazy(() => import('./pages/CustomExerciseCreator'));
const ExerciseDetail = lazy(() => import('./pages/ExerciseDetail'));
const TemplateEditor = lazy(() => import('./pages/TemplateEditor'));
const WeeklyPlanner = lazy(() => import('./pages/WeeklyPlanner'));

// ── Route-level loading fallback ──
function RouteFallback() {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="flex flex-col items-center gap-4">
        <div className="w-10 h-10 rounded-full border-2 border-primary border-t-transparent animate-spin" />
        <p className="text-on-surface-variant text-xs font-bold uppercase tracking-widest">Loading…</p>
      </div>
    </div>
  );
}

// ── 404 Not Found page ──
function NotFoundPage() {
  return (
    <main className="flex flex-col items-center justify-center min-h-[70vh] px-6 text-center">
      <div className="w-24 h-24 rounded-[2rem] bg-primary/10 flex items-center justify-center mb-6">
        <span className="material-symbols-outlined text-primary text-5xl" style={{ fontVariationSettings: "'FILL' 1" }}>explore_off</span>
      </div>
      <h1 className="font-headline font-black text-5xl tracking-tighter mb-2">404</h1>
      <p className="text-on-surface-variant text-sm leading-relaxed max-w-xs mb-8">
        The page you're looking for doesn't exist or has been moved.
      </p>
      <Link
        to="/"
        className="px-8 py-4 bg-primary text-black rounded-2xl font-headline font-bold text-sm uppercase tracking-widest active:scale-95 transition-all shadow-[0_8px_24px_rgba(255,122,0,0.3)]"
      >
        Back to Dashboard
      </Link>
    </main>
  );
}

// ── Dynamic page title updater ──
const PAGE_TITLES: Record<string, string> = {
  '/': 'Dashboard',
  '/workout': 'Workout Planner',
  '/activity': 'Activity & Territory',
  '/nutrition': 'Nutrition',
  '/health': 'Health Hub',
  '/profile': 'Profile',
  '/reports': 'Reports & Analytics',
  '/progress': 'Progress',
  '/settings': 'Settings',
  '/community': 'Community',
  '/subscription': 'Pro Upgrade',
  '/help': 'Help Center',
  '/privacy': 'Privacy & Security',
  '/feedback': 'Feedback',
  '/ai-coach': 'AI Coach',
  '/goals': 'Goals Editor',
  '/workout/active': 'Active Workout',
  '/workout/history': 'Workout History',
  '/workout/weekly-planner': 'Weekly Planner',
  '/workout/templates/new': 'New Template',
  '/exercises': 'Exercise Library',
  '/exercises/new': 'Create Exercise',
};

function PageTitleUpdater() {
  const location = useLocation();
  useEffect(() => {
    const title = PAGE_TITLES[location.pathname] || 'MyFitAI';
    document.title = `${title} | MyFitAI`;
  }, [location.pathname]);
  return null;
}

function AppContent() {
  const [showNotifications, setShowNotifications] = useState(false);
  const [showLogger, setShowLogger] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const { theme, toggleTheme } = useTheme();
  const { isOnboarded } = useOnboarding();
  const { user } = useAuth();

  // Unread notification count — conditionally render badge
  // In production this would come from a notifications context/Firestore listener.
  const unreadCount = 0;

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
      <PageTitleUpdater />
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
              {/* Conditionally render badge only when unread > 0 */}
              {unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 min-w-[16px] h-4 bg-primary rounded-full text-[9px] font-bold text-black flex items-center justify-center px-1">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
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

        <Suspense fallback={<RouteFallback />}>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/workout" element={<WorkoutPlanner />} />
            <Route path="/activity" element={<ActivityHub />} />
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
            <Route path="/workout/weekly-planner" element={<WeeklyPlanner />} />
            <Route path="/workout/templates/new" element={<TemplateEditor />} />
            <Route path="/workout/templates/edit/:id" element={<TemplateEditor />} />
            <Route path="/exercises" element={<ExerciseLibrary />} />
            <Route path="/exercises/new" element={<CustomExerciseCreator />} />
            <Route path="/exercises/:id" element={<ExerciseDetail />} />
            {/* ── Catch-all 404 ── */}
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </Suspense>

        <BottomNavBar />
      </div>
    </BrowserRouter>
  );
}

function UserSpecificProviders({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-10 h-10 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div key={user?.uid || 'guest'} className="contents">
      <ToastProvider>
        <FitnessProvider>
          <GamificationProvider>
            <PreferencesProvider>
              <WorkoutBuilderProvider>
                <NutritionProvider>
                  <ActivityProvider>
                    <OnboardingProvider>
                      {children}
                    </OnboardingProvider>
                  </ActivityProvider>
                </NutritionProvider>
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
