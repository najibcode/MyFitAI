import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  User,
  ChevronRight,
  ShieldCheck,
  Check,
  RotateCw,
  Footprints,
  Moon,
  Clock,
  Download,
  Upload,
  RotateCcw,
  LogOut,
  Target,
  Bell,
  Palette,
  Scale,
  Activity,
  Users,
  BarChart3,
  Watch,
  Cloud,
  HelpCircle,
  MessageSquare,
  Shield,
  FileText,
  Sparkles,
  type LucideIcon,
} from 'lucide-react';
import { useFitnessContext } from '../context/FitnessContext';
import { useTheme } from '../context/ThemeContext';
import { useOnboarding } from '../context/OnboardingContext';
import { useGamification } from '../context/GamificationContext';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import { useWorkoutBuilder } from '../context/WorkoutBuilderContext';
import { usePreferences } from '../context/PreferencesContext';
import type { EffortMode } from '../types/workout';
import ConfirmModal from '../components/ConfirmModal';
import { useHealth } from '../context/HealthContext';
import ConnectHealthModal from '../components/health/ConnectHealthModal';

function formatTimeAgo(isoString: string | null): string {
  if (!isoString) return 'Never';
  const diff = Math.max(0, Date.now() - new Date(isoString).getTime());
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins === 1) return '1 minute ago';
  if (mins < 60) return `${mins} minutes ago`;
  const hours = Math.floor(mins / 60);
  if (hours === 1) return '1 hour ago';
  if (hours < 24) return `${hours} hours ago`;
  return new Date(isoString).toLocaleDateString();
}

interface SettingsItem {
  icon: LucideIcon;
  label: string;
  desc: string;
  route: string;
  color: string;
  toggle?: boolean;
  premium?: boolean;
}

interface SettingsGroup {
  title: string;
  items: SettingsItem[];
}

export default function Settings() {
  const { profile } = useFitnessContext();
  const { theme, toggleTheme } = useTheme();
  const { resetOnboarding } = useOnboarding();
  const { level, levelTitle, xp } = useGamification();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { logout } = useAuth();
  const { effortMode, setEffortMode, exportAllData, importData } = useWorkoutBuilder();
  const { defaultRestTimer, autoStartRestTimer, updatePreferences } = usePreferences();
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [showConnectModal, setShowConnectModal] = useState(false);

  const {
    isAvailable,
    platform,
    permissions,
    hasAnyPermission,
    isSyncing,
    lastSyncedAt,
    syncHealth,
    disconnectHealth,
    openPlatformSettings,
  } = useHealth();

  const handleExportBackup = async () => {
    try {
      const json = await exportAllData();
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `myfitai-backup-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
      showToast('Workout data exported successfully!', 'success');
    } catch {
      showToast('Export failed. Try again.', 'error');
    }
  };

  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const text = event.target?.result as string;
        const result = await importData(text);
        if (result.success) {
          showToast('Data restored successfully!', 'success');
        } else {
          showToast(`Import error: ${result.error || 'Invalid file format'}`, 'error');
        }
      } catch {
        showToast('Failed to read backup file.', 'error');
      }
    };
    reader.readAsText(file);
  };

  const settingsGroups: SettingsGroup[] = [
    {
      title: 'Account',
      items: [
        { icon: User, label: 'Identity Metrics', desc: `${profile.name} • ${profile.weight} lbs`, route: '/profile', color: '#FF8A00' },
        { icon: Target, label: 'Goals & Targets', desc: profile.goal, route: '/profile', color: '#30D158' },
        { icon: Bell, label: 'Notification Preferences', desc: 'Workout, water, meals', route: '', color: '#A78BFA' },
      ],
    },
    {
      title: 'App',
      items: [
        { icon: Palette, label: 'Appearance', desc: theme === 'dark' ? 'Dark Mode' : 'Light Mode', route: '', color: '#F5C542', toggle: true },
        { icon: Scale, label: 'Units', desc: 'Imperial (lbs, in)', route: '', color: '#4F9CF9' },
        { icon: Download, label: 'Data Export', desc: 'Export as CSV or PDF', route: '', color: '#FF8A00' },
      ],
    },
    {
      title: 'Explore',
      items: [
        { icon: Activity, label: 'Health Hub', desc: 'Recovery, sleep, vitals', route: '/health', color: '#FF453A' },
        { icon: Users, label: 'Community', desc: 'Feed, challenges, friends', route: '/community', color: '#A78BFA' },
        { icon: BarChart3, label: 'Reports & Analytics', desc: 'Detailed performance data', route: '/reports', color: '#30D158' },
      ],
    },
    {
      title: 'Integrations',
      items: [
        { icon: Watch, label: 'Wearable Devices', desc: 'Apple Watch, WHOOP, Garmin', route: '', color: '#FF453A' },
        { icon: ShieldCheck, label: 'Apple Health / Health Connect', desc: 'Sync steps, heart rate', route: '', color: '#30D158' },
        { icon: Cloud, label: 'Cloud Backup', desc: 'Auto-backup to cloud', route: '', color: '#FF8A00' },
      ],
    },
    {
      title: 'Support',
      items: [
        { icon: HelpCircle, label: 'Help Center', desc: 'FAQs and guides', route: '/help', color: '#A78BFA' },
        { icon: MessageSquare, label: 'Send Feedback', desc: 'Help us improve', route: '/feedback', color: '#4F9CF9' },
        { icon: Shield, label: 'Privacy & Security', desc: 'Data protection settings', route: '/privacy', color: '#FF453A' },
        { icon: FileText, label: 'Terms of Service', desc: 'Legal information', route: '', color: '#F5C542' },
      ],
    },
    {
      title: 'Membership',
      items: [
        { icon: Sparkles, label: 'Pro Athlete Tier', desc: 'AI biomechanics, analytics, exports', route: '/subscription', color: '#30D158', premium: true },
      ],
    },
  ];

  return (
    <main className="max-w-2xl mx-auto px-4 sm:px-6 pt-6 pb-32 space-y-6 bg-[#080808]">
      <header>
        <p className="text-[#30D158] font-bold tracking-wider uppercase text-[10px] mb-1">Configuration</p>
        <h1 className="font-bold text-3xl tracking-tight text-[#F5F5F5]">Settings</h1>
      </header>

      {/* Profile Card */}
      <div
        onClick={() => navigate('/profile')}
        className="bg-[#151517] rounded-2xl p-5 border border-[#2A2A2D] flex items-center gap-4 cursor-pointer hover:border-[#30D158]/40 transition-colors group active:scale-[0.99]"
      >
        <div className="w-14 h-14 rounded-xl bg-[#30D158]/10 border border-[#30D158]/20 flex items-center justify-center text-[#30D158] group-hover:scale-105 transition-transform">
          <User className="w-6 h-6" />
        </div>
        <div className="flex-1">
          <h3 className="font-bold text-base text-[#F5F5F5]">{profile.name}</h3>
          <p className="text-[10px] text-[#30D158] font-bold uppercase tracking-wider mt-0.5 font-mono tabular-nums">
            Level {level} • {levelTitle} • {xp} XP
          </p>
        </div>
        <ChevronRight className="w-5 h-5 text-[#A1A1A6] group-hover:text-[#F5F5F5] transition-colors" />
      </div>

      {/* Health Data Integration */}
      <section className="space-y-2.5">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-[#A1A1A6] text-[10px] font-bold uppercase tracking-wider">
            Health Data
          </h2>
          {isAvailable && (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#151517] border border-[#2A2A2D] text-[#A1A1A6]">
              {platform === 'android' ? 'Android Health Connect' : platform === 'ios' ? 'Apple HealthKit' : 'Mobile Only'}
            </span>
          )}
        </div>

        <div className="bg-[#151517] rounded-2xl p-5 border border-[#2A2A2D] space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                hasAnyPermission
                  ? 'bg-[#30D158]/15 text-[#30D158] border border-[#30D158]/30'
                  : 'bg-[#1E1E20] text-[#A1A1A6] border border-[#2A2A2D]'
              }`}>
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-bold text-sm text-[#F5F5F5] truncate">
                    Health Data Integration
                  </h3>
                  {hasAnyPermission ? (
                    <span className="text-[10px] font-bold text-[#30D158] bg-[#30D158]/10 px-2 py-0.5 rounded-full border border-[#30D158]/20 flex items-center gap-1">
                      <Check className="w-3 h-3" /> Connected
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold text-[#A1A1A6] bg-[#1E1E20] border border-[#2A2A2D] px-2 py-0.5 rounded-full">
                      Not Connected
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-[#A1A1A6] mt-0.5 truncate">
                  {hasAnyPermission 
                    ? `Auto-sync via ${platform === 'android' ? 'Health Connect' : 'Apple Health'}`
                    : 'Auto-import your steps & sleep sessions'}
                </p>
              </div>
            </div>

            {!hasAnyPermission ? (
              <button
                onClick={() => setShowConnectModal(true)}
                className="px-3.5 py-2 bg-[#FF8A00] text-black rounded-xl font-bold text-xs uppercase tracking-wider active:scale-95 transition-all shadow-sm flex-shrink-0 min-h-[44px]"
              >
                Connect
              </button>
            ) : (
              <button
                onClick={() => syncHealth()}
                disabled={isSyncing}
                className="w-10 h-10 rounded-xl bg-[#1E1E20] hover:bg-[#2A2A2D] border border-[#2A2A2D] text-[#F5F5F5] flex items-center justify-center transition-all active:scale-95 disabled:opacity-50 flex-shrink-0 min-h-[44px]"
                title="Sync Now"
              >
                <RotateCw className={`w-4 h-4 ${isSyncing ? 'animate-spin text-[#30D158]' : ''}`} />
              </button>
            )}
          </div>

          {/* Sub-permissions breakdown */}
          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[#2A2A2D]">
            <div className="bg-[#1E1E20] rounded-xl p-3 border border-[#2A2A2D] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Footprints className="w-4 h-4 text-[#30D158]" />
                <span className="text-xs font-bold text-[#F5F5F5]">Steps</span>
              </div>
              <span className={`text-[11px] font-semibold flex items-center gap-1 ${
                permissions.steps ? 'text-[#30D158]' : 'text-[#A1A1A6]'
              }`}>
                {permissions.steps ? (
                  <>
                    <Check className="w-3 h-3" />
                    Connected
                  </>
                ) : 'Disconnected'}
              </span>
            </div>

            <div className="bg-[#1E1E20] rounded-xl p-3 border border-[#2A2A2D] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Moon className="w-4 h-4 text-[#4F9CF9]" />
                <span className="text-xs font-bold text-[#F5F5F5]">Sleep</span>
              </div>
              <span className={`text-[11px] font-semibold flex items-center gap-1 ${
                permissions.sleep ? 'text-[#30D158]' : 'text-[#A1A1A6]'
              }`}>
                {permissions.sleep ? (
                  <>
                    <Check className="w-3 h-3" />
                    Connected
                  </>
                ) : 'Disconnected'}
              </span>
            </div>
          </div>

          {/* Footer actions & sync time */}
          <div className="flex items-center justify-between pt-2 border-t border-[#2A2A2D] text-[11px] text-[#A1A1A6]">
            <span className="flex items-center gap-1.5 font-mono tabular-nums">
              <Clock className="w-3.5 h-3.5" />
              Last Synced: <strong className="text-[#F5F5F5] font-semibold">{formatTimeAgo(lastSyncedAt)}</strong>
            </span>

            <div className="flex items-center gap-2">
              {hasAnyPermission ? (
                <>
                  <button
                    onClick={openPlatformSettings}
                    className="text-xs text-[#30D158] font-bold hover:underline"
                  >
                    Manage
                  </button>
                  <span className="text-[#A1A1A6]/40">•</span>
                  <button
                    onClick={disconnectHealth}
                    className="text-xs text-[#FF453A] font-bold hover:underline"
                  >
                    Disconnect
                  </button>
                </>
              ) : (
                <button
                  onClick={() => setShowConnectModal(true)}
                  className="text-xs text-[#30D158] font-bold hover:underline"
                >
                  Configure
                </button>
              )}
            </div>
          </div>
        </div>
      </section>

      {settingsGroups.map((group, gi) => (
        <section key={gi}>
          <h2 className="text-[#A1A1A6] text-[10px] font-bold uppercase tracking-wider mb-2.5 px-1">{group.title}</h2>
          <div className="bg-[#151517] rounded-2xl overflow-hidden border border-[#2A2A2D] divide-y divide-[#2A2A2D]">
            {group.items.map((item, ii) => {
              const ItemIcon = item.icon;
              return (
                <div
                  key={ii}
                  onClick={() => {
                    if (item.toggle) { toggleTheme(); return; }
                    if (item.route) navigate(item.route);
                    else showToast(`${item.label} feature coming soon!`, 'info');
                  }}
                  className="px-5 py-4 flex items-center justify-between cursor-pointer group hover:bg-[#1E1E20] transition-colors active:bg-[#1E1E20]/80 min-h-[56px]"
                >
                  <div className="flex items-center gap-3.5">
                    <div
                      className="w-9 h-9 rounded-xl flex items-center justify-center border border-[#2A2A2D] group-hover:scale-105 transition-transform"
                      style={{ backgroundColor: `${item.color}15`, color: item.color }}
                    >
                      <ItemIcon className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className={`font-bold text-sm ${item.premium ? 'text-[#30D158]' : 'text-[#F5F5F5]'}`}>{item.label}</h4>
                      <p className="text-[11px] text-[#A1A1A6] mt-0.5">{item.desc}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {item.premium && (
                      <span className="text-[9px] bg-[#30D158]/10 text-[#30D158] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider border border-[#30D158]/20">PRO</span>
                    )}
                    {item.toggle ? (
                      <div className={`w-11 h-6 rounded-full flex items-center p-0.5 transition-colors ${theme === 'dark' ? 'bg-[#30D158]' : 'bg-[#2A2A2D]'}`}>
                        <div className={`w-5 h-5 rounded-full bg-black shadow-md transition-transform ${theme === 'dark' ? 'translate-x-5' : 'translate-x-0'}`}></div>
                      </div>
                    ) : (
                      <ChevronRight className="w-4 h-4 text-[#A1A1A6] group-hover:text-[#F5F5F5] transition-colors" />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      ))}

      {/* Workout Engine Settings */}
      <section className="space-y-2.5">
        <h3 className="font-bold text-xs uppercase tracking-wider text-[#A1A1A6] px-1">
          Workout Engine
        </h3>
        <div className="bg-[#151517] rounded-2xl p-5 border border-[#2A2A2D] space-y-4">
          {/* Effort Mode */}
          <div className="flex items-center justify-between">
            <div>
              <p className="font-bold text-sm text-[#F5F5F5]">Effort Tracking Mode</p>
              <p className="text-[11px] text-[#A1A1A6]">Measure intensity via RPE, RIR, or off</p>
            </div>
            <div className="flex bg-[#1E1E20] p-1 rounded-xl border border-[#2A2A2D]">
              {(['rpe', 'rir', 'off'] as EffortMode[]).map(mode => (
                <button
                  key={mode}
                  onClick={() => setEffortMode(mode)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all min-h-[36px] ${
                    effortMode === mode
                      ? 'bg-[#30D158] text-black shadow-sm'
                      : 'text-[#A1A1A6] hover:text-[#F5F5F5]'
                  }`}
                >
                  {mode.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          {/* Default Rest Timer */}
          <div className="flex items-center justify-between pt-3 border-t border-[#2A2A2D]">
            <div>
              <p className="font-bold text-sm text-[#F5F5F5]">Default Rest Timer</p>
              <p className="text-[11px] text-[#A1A1A6]">Interval between completed sets</p>
            </div>
            <select
              value={defaultRestTimer}
              onChange={(e) => updatePreferences({ defaultRestTimer: parseInt(e.target.value) })}
              className="bg-[#1E1E20] border border-[#2A2A2D] rounded-xl px-3 py-1.5 text-xs font-mono tabular-nums font-bold text-[#F5F5F5] outline-none min-h-[40px]"
            >
              {[30, 45, 60, 90, 120, 180, 240].map(sec => (
                <option key={sec} value={sec}>{sec}s ({Math.floor(sec / 60)}m {sec % 60 ? `${sec % 60}s` : ''})</option>
              ))}
            </select>
          </div>

          {/* Auto Start Timer */}
          <div className="flex items-center justify-between pt-3 border-t border-[#2A2A2D]">
            <div>
              <p className="font-bold text-sm text-[#F5F5F5]">Auto-start Rest Timer</p>
              <p className="text-[11px] text-[#A1A1A6]">Trigger timer upon completing each set</p>
            </div>
            <button
              onClick={() => updatePreferences({ autoStartRestTimer: !autoStartRestTimer })}
              className={`w-11 h-6 rounded-full flex items-center p-0.5 transition-colors ${
                autoStartRestTimer ? 'bg-[#30D158]' : 'bg-[#2A2A2D]'
              }`}
            >
              <div
                className={`w-5 h-5 rounded-full bg-black shadow-md transition-transform ${
                  autoStartRestTimer ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </div>
      </section>

      {/* Workout Data Backup & Restore */}
      <section className="space-y-2.5">
        <h3 className="font-bold text-xs uppercase tracking-wider text-[#A1A1A6] px-1">
          Data Management & Backup
        </h3>
        <div className="bg-[#151517] rounded-2xl p-5 border border-[#2A2A2D] space-y-3">
          <p className="text-xs text-[#A1A1A6] leading-relaxed">
            Backup all your routines, templates, sessions, personal records, and custom exercises to a JSON file.
          </p>
          <div className="flex gap-2 pt-1">
            <button
              onClick={handleExportBackup}
              className="flex-1 min-h-[44px] py-2.5 px-3 rounded-xl bg-[#1E1E20] hover:bg-[#2A2A2D] border border-[#2A2A2D] text-[#F5F5F5] font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 active:scale-95 transition-all"
            >
              <Download className="w-4 h-4 text-[#FF8A00]" />
              Export Backup
            </button>
            <label className="flex-1 min-h-[44px] py-2.5 px-3 rounded-xl bg-[#1E1E20] hover:bg-[#2A2A2D] border border-[#2A2A2D] text-[#F5F5F5] font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 active:scale-95 transition-all cursor-pointer">
              <Upload className="w-4 h-4 text-[#30D158]" />
              Restore Backup
              <input
                type="file"
                accept=".json"
                onChange={handleImportBackup}
                className="hidden"
              />
            </label>
          </div>
        </div>
      </section>

      <ConfirmModal
        isOpen={showResetConfirm}
        onConfirm={() => { setShowResetConfirm(false); resetOnboarding(); }}
        onCancel={() => setShowResetConfirm(false)}
        title="Reset Onboarding?"
        message="You will re-do the setup flow. Your fitness data will be preserved."
        confirmLabel="Reset"
        variant="warning"
      />

      <ConnectHealthModal
        isOpen={showConnectModal}
        onClose={() => setShowConnectModal(false)}
      />

      <div className="text-center space-y-3 pt-3">
        <button
          onClick={() => setShowResetConfirm(true)}
          className="text-[#A1A1A6] font-bold uppercase tracking-wider text-[10px] hover:text-[#F5F5F5] transition-colors flex items-center justify-center gap-2 mx-auto bg-[#151517] py-2.5 px-5 rounded-full border border-[#2A2A2D] hover:border-[#30D158]/40"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          Redo Onboarding
        </button>
        <button 
          onClick={async () => {
            await logout();
            showToast('Signed out successfully!', 'success');
          }} 
          className="text-[#FF453A] font-bold uppercase tracking-wider text-[10px] hover:opacity-80 transition-opacity flex items-center justify-center gap-2 mx-auto bg-[#FF453A]/10 py-2.5 px-5 rounded-full border border-[#FF453A]/20"
        >
          <LogOut className="w-3.5 h-3.5" />
          Sign Out
        </button>
        <p className="text-[10px] text-[#A1A1A6]/40 font-mono font-bold tracking-wider uppercase">MyFitAI v2.1.0 • Obsidian Engine</p>
      </div>
    </main>
  );
}
