import { useState, useEffect, lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, useLocation, useNavigate, Link } from 'react-router-dom';
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
import DesktopSidebar from './components/DesktopSidebar';
import MyFitAILogo from './components/brand/MyFitAILogo';
import { Sun, Moon, Bell, Plus, Compass } from 'lucide-react';

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
import { HealthProvider } from './context/HealthContext';

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
    <main className="flex flex-col items-center justify-center min-h-[70vh] px-6 text-center space-y-4">
      <div className="w-20 h-20 rounded-3xl bg-[#151517] border border-[#2A2A2D] flex items-center justify-center text-[#30D158] shadow-[0_4px_24px_rgba(48,209,88,0.15)]">
        <Compass className="w-10 h-10 stroke-[1.75]" />
      </div>
      <div className="space-y-1">
        <h1 className="font-headline font-black text-5xl text-[#F5F5F5] tracking-tight">404</h1>
        <p className="text-[#A1A1A6] text-xs leading-relaxed max-w-xs mx-auto">
          The requested route was not found in the personal athletic operating system.
        </p>
      </div>
      <Link
        to="/"
        className="px-6 py-3 bg-[#FF8A00] hover:bg-[#FF8A00]/90 text-black rounded-xl font-headline font-bold text-xs uppercase tracking-wider active:scale-[0.98] transition-all shadow-[0_4px_16px_rgba(255,138,0,0.25)]"
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

function MainAppShell() {
  const [showNotifications, setShowNotifications] = useState(false);
  const [showLogger, setShowLogger] = useState(false);
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();

  // Unread notification count
  const unreadCount = 0;

  // Native Android hardware/gesture Back Button handling via Capacitor
  useEffect(() => {
    let removeListener: (() => void) | undefined;
    const setupBackButton = async () => {
      try {
        const { App: CapApp } = await import('@capacitor/app');
        const listener = await CapApp.addListener('backButton', () => {
          // Priority 1: Dismiss notifications panel if active
          if (showNotifications) {
            setShowNotifications(false);
            return;
          }
          // Priority 2: Dismiss activity logger modal if active
          if (showLogger) {
            setShowLogger(false);
            return;
          }
          // Priority 3: Navigate back in React Router history if on sub-route
          if (location.pathname !== '/') {
            navigate(-1);
            return;
          }
          // Priority 4: At root view, minimize/exit application
          CapApp.exitApp();
        });

        removeListener = () => {
          listener.remove();
        };
      } catch {
        // Ignored in non-Capacitor web environments
      }
    };

    setupBackButton();
    return () => {
      removeListener?.();
    };
  }, [showNotifications, showLogger, location.pathname, navigate]);

  // Native Android Status Bar configuration via Capacitor
  useEffect(() => {
    const initStatusBar = async () => {
      try {
        const { StatusBar, Style } = await import('@capacitor/status-bar');
        await StatusBar.setOverlaysWebView({ overlay: false });
        await StatusBar.setBackgroundColor({ color: '#080808' });
        await StatusBar.setStyle({ style: Style.Dark });
      } catch {
        // Ignored in non-Capacitor web environments
      }
    };
    initStatusBar();
  }, []);

  return (
    <div className="min-h-screen bg-[var(--color-background)] text-[var(--color-on-surface)] flex flex-col lg:flex-row w-full max-w-full overflow-x-clip">
      {/* Desktop Sidebar (hidden on mobile) */}
      <DesktopSidebar />

      <div className="flex-1 flex flex-col min-w-0 w-full max-w-full pb-20 lg:pb-8 relative overflow-x-clip">
        {/* Header — mobile safe area aware, athletic branding, opaque to prevent bleed */}
        <header className="bg-[#080808] w-full top-0 sticky z-[100] flex justify-between items-center px-4 sm:px-6 py-2.5 sm:py-3 pt-[max(env(safe-area-inset-top),0.75rem)] border-b border-[var(--color-border)] select-none shadow-md">
          <div className="flex items-center gap-3">
            <Link to="/" className="lg:hidden flex items-center gap-2 group">
              <MyFitAILogo size={28} variant="mark" className="transition-transform group-hover:scale-105" />
              <span className="text-base font-black tracking-tight font-headline text-[var(--color-on-surface)]">
                MyFit<span className="text-[var(--color-primary)]">AI</span>
              </span>
            </Link>
            <div className="hidden lg:flex items-center gap-2 text-xs font-semibold text-[var(--color-on-surface-variant)]">
              <span className="inline-block w-2 h-2 rounded-full bg-[var(--color-primary)] animate-pulse" />
              <span>Athletic Performance OS</span>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={toggleTheme}
              className="w-10 h-10 flex items-center justify-center rounded-xl text-[var(--color-on-surface-variant)] hover:text-[var(--color-on-surface)] hover:bg-white/[0.04] transition-colors active:scale-95"
              title={theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
              aria-label="Toggle theme"
            >
              {theme === 'dark' ? (
                <Sun className="w-[18px] h-[18px] stroke-[2]" />
              ) : (
                <Moon className="w-[18px] h-[18px] stroke-[2]" />
              )}
            </button>

            <button 
              onClick={() => setShowNotifications(true)}
              className="w-10 h-10 flex items-center justify-center rounded-xl text-[var(--color-on-surface-variant)] hover:text-[var(--color-on-surface)] hover:bg-white/[0.04] transition-colors active:scale-95 relative"
              title="Notifications"
              aria-label="Notifications"
            >
              <Bell className="w-[18px] h-[18px] stroke-[2]" />
              {unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 min-w-[16px] h-4 bg-[var(--color-primary)] rounded-full text-[9px] font-bold text-black flex items-center justify-center px-1">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>

            <button 
              onClick={() => setShowLogger(true)}
              className="h-10 px-3.5 flex items-center gap-1.5 rounded-xl bg-[var(--color-action)] text-white hover:brightness-110 transition-all active:scale-95 text-xs font-headline font-bold uppercase tracking-wider shadow-sm"
              title="Log Activity"
              aria-label="Quick Log"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span className="hidden sm:inline">Log</span>
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
    </div>
  );
}

function AppContent() {
  const [isLoading, setIsLoading] = useState(true);
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
      <PageTitleUpdater />
      <MainAppShell />
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
          <HealthProvider>
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
          </HealthProvider>
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
