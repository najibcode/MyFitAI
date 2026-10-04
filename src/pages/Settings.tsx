import { useState } from 'react';
import { useFitnessContext } from '../context/FitnessContext';
import { useTheme } from '../context/ThemeContext';
import { useOnboarding } from '../context/OnboardingContext';
import { useGamification } from '../context/GamificationContext';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import { useWorkoutBuilder } from '../context/WorkoutBuilderContext';
import { usePreferences } from '../context/PreferencesContext';
import type { EffortMode } from '../types/workout';
import ConfirmModal from '../components/ConfirmModal';

interface SettingsItem {
  icon: string;
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
        { icon: 'person', label: 'Identity Metrics', desc: `${profile.name} • ${profile.weight} lbs`, route: '/profile', color: '#FF7A00' },
        { icon: 'target', label: 'Goals & Targets', desc: profile.goal, route: '/profile', color: '#6FFB85' },
        { icon: 'notifications_active', label: 'Notification Preferences', desc: 'Workout, water, meals', route: '', color: '#fab0ff' },
      ]
    },
    {
      title: 'App',
      items: [
        { icon: 'palette', label: 'Appearance', desc: theme === 'dark' ? 'Dark Mode' : 'Light Mode', route: '', color: '#ff9800', toggle: true },
        { icon: 'language', label: 'Units', desc: 'Imperial (lbs, in)', route: '', color: '#00b4d8' },
        { icon: 'download', label: 'Data Export', desc: 'Export as CSV or PDF', route: '', color: '#FF7A00' },
      ]
    },
    {
      title: 'Explore',
      items: [
        { icon: 'monitor_heart', label: 'Health Hub', desc: 'Recovery, sleep, vitals', route: '/health', color: '#FF4D4D' },
        { icon: 'groups', label: 'Community', desc: 'Feed, challenges, friends', route: '/community', color: '#fab0ff' },
        { icon: 'query_stats', label: 'Reports & Analytics', desc: 'Detailed performance data', route: '/reports', color: '#6FFB85' },
      ]
    },
    {
      title: 'Integrations',
      items: [
        { icon: 'watch', label: 'Wearable Devices', desc: 'Apple Watch, WHOOP, Fitbit', route: '', color: '#FF4D4D' },
        { icon: 'health_and_safety', label: 'Apple Health', desc: 'Sync steps, heart rate', route: '', color: '#6FFB85' },
        { icon: 'cloud_sync', label: 'Cloud Backup', desc: 'Auto-backup to cloud', route: '', color: '#FF7A00' },
      ]
    },
    {
      title: 'Support',
      items: [
        { icon: 'help', label: 'Help Center', desc: 'FAQs and guides', route: '/help', color: '#fab0ff' },
        { icon: 'feedback', label: 'Send Feedback', desc: 'Help us improve', route: '/feedback', color: '#00b4d8' },
        { icon: 'shield', label: 'Privacy & Security', desc: 'Data protection settings', route: '/privacy', color: '#FF4D4D' },
        { icon: 'description', label: 'Terms of Service', desc: 'Legal information', route: '', color: '#ff9800' },
      ]
    },
    {
      title: 'Premium',
      items: [
        { icon: 'diamond', label: 'Upgrade to Pro', desc: 'AI coaching, analytics, exports', route: '/subscription', color: '#FFD700', premium: true },
      ]
    },
  ];

  return (
    <main className="max-w-2xl mx-auto px-6 pt-8 pb-32 space-y-6">
      <header>
        <p className="text-secondary font-label font-bold tracking-widest uppercase text-[10px] mb-2">Configuration</p>
        <h1 className="font-headline font-extrabold text-4xl tracking-tighter">SETTINGS</h1>
      </header>

      {/* Profile Card */}
      <div onClick={() => navigate('/profile')} className="bg-gradient-to-r from-primary/10 to-transparent rounded-[2rem] p-6 border border-primary/20 flex items-center gap-5 cursor-pointer hover:border-primary/40 transition-colors group active:scale-[0.98]">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-[#CC5F00] flex items-center justify-center shadow-[0_8px_25px_rgba(255,122,0,0.3)] group-hover:scale-105 transition-transform">
          <span className="material-symbols-outlined text-black text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>person</span>
        </div>
        <div className="flex-1">
          <h3 className="font-headline font-bold text-lg">{profile.name}</h3>
          <p className="text-[10px] text-primary font-bold uppercase tracking-widest mt-0.5">Level {level} • {levelTitle} • {xp} XP</p>
        </div>
        <span className="material-symbols-outlined text-white/30 group-hover:text-primary transition-colors">chevron_right</span>
      </div>

      {settingsGroups.map((group, gi) => (
        <section key={gi}>
          <h2 className="text-on-surface-variant text-[10px] font-bold uppercase tracking-widest mb-3 px-2">{group.title}</h2>
          <div className="bg-[var(--color-surface-container)] rounded-[2rem] overflow-hidden border border-white/5 divide-y divide-white/5">
            {group.items.map((item, ii) => (
              <div
                key={ii}
                onClick={() => {
                  if (item.toggle) { toggleTheme(); return; }
                  if (item.route) navigate(item.route);
                  else showToast(`${item.label} feature coming soon!`, 'info');
                }}
                className="px-6 py-5 flex items-center justify-between cursor-pointer group hover:bg-white/5 transition-colors active:bg-white/10"
              >
                <div className="flex items-center gap-4">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center border border-white/10 group-hover:scale-105 transition-transform"
                    style={{ backgroundColor: `${item.color}15`, color: item.color }}
                  >
                    <span className="material-symbols-outlined text-lg" style={{ fontVariationSettings: item.premium ? "'FILL' 1" : undefined }}>{item.icon}</span>
                  </div>
                  <div>
                    <h4 className={`font-headline font-bold text-sm ${item.premium ? 'text-[#FFD700]' : ''}`}>{item.label}</h4>
                    <p className="text-[11px] text-on-surface-variant mt-0.5">{item.desc}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {item.premium && (
                    <span className="text-[8px] bg-[#FFD700]/10 text-[#FFD700] px-2 py-0.5 rounded-full font-black uppercase tracking-widest border border-[#FFD700]/20">PRO</span>
                  )}
                  {item.toggle ? (
                    <div className={`w-12 h-7 rounded-full flex items-center p-1 transition-colors ${theme === 'dark' ? 'bg-primary' : 'bg-white/20'}`}>
                      <div className={`w-5 h-5 rounded-full bg-white shadow-md transition-transform ${theme === 'dark' ? 'translate-x-5' : 'translate-x-0'}`}></div>
                    </div>
                  ) : (
                    <span className="material-symbols-outlined text-on-surface-variant text-sm group-hover:text-primary transition-colors">chevron_right</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      ))}

      {/* ─── Workout Engine Settings ─── */}
      <section className="space-y-3">
        <h3 className="font-headline font-bold text-xs uppercase tracking-widest text-on-surface-variant px-1">
          Workout Engine
        </h3>
        <div className="bg-[var(--color-surface-container)] rounded-3xl p-5 border border-white/[0.04] space-y-4">
          {/* Effort Mode */}
          <div className="flex items-center justify-between">
            <div>
              <p className="font-bold text-sm text-on-surface">Effort Tracking Mode</p>
              <p className="text-[11px] text-on-surface-variant">Measure intensity via RPE, RIR, or off</p>
            </div>
            <div className="flex bg-[var(--color-surface-container-high)] p-1 rounded-xl">
              {(['rpe', 'rir', 'off'] as EffortMode[]).map(mode => (
                <button
                  key={mode}
                  onClick={() => setEffortMode(mode)}
                  className={`px-3 py-1 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${
                    effortMode === mode
                      ? 'bg-primary text-black'
                      : 'text-on-surface-variant hover:text-on-surface'
                  }`}
                >
                  {mode.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          {/* Default Rest Timer */}
          <div className="flex items-center justify-between pt-2 border-t border-white/[0.04]">
            <div>
              <p className="font-bold text-sm text-on-surface">Default Rest Timer</p>
              <p className="text-[11px] text-on-surface-variant">Interval between completed sets</p>
            </div>
            <select
              value={defaultRestTimer}
              onChange={(e) => updatePreferences({ defaultRestTimer: parseInt(e.target.value) })}
              className="bg-[var(--color-surface-container-high)] border border-white/[0.06] rounded-xl px-3 py-1.5 text-xs font-bold text-on-surface outline-none"
            >
              {[30, 45, 60, 90, 120, 180, 240].map(sec => (
                <option key={sec} value={sec}>{sec}s ({Math.floor(sec / 60)}m {sec % 60 ? `${sec % 60}s` : ''})</option>
              ))}
            </select>
          </div>

          {/* Auto Start Timer */}
          <div className="flex items-center justify-between pt-2 border-t border-white/[0.04]">
            <div>
              <p className="font-bold text-sm text-on-surface">Auto-start Rest Timer</p>
              <p className="text-[11px] text-on-surface-variant">Trigger timer upon completing each set</p>
            </div>
            <button
              onClick={() => updatePreferences({ autoStartRestTimer: !autoStartRestTimer })}
              className={`w-12 h-7 rounded-full flex items-center p-1 transition-colors ${
                autoStartRestTimer ? 'bg-primary' : 'bg-white/20'
              }`}
            >
              <div
                className={`w-5 h-5 rounded-full bg-white shadow-md transition-transform ${
                  autoStartRestTimer ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </div>
      </section>

      {/* ─── Workout Data Backup & Restore ─── */}
      <section className="space-y-3">
        <h3 className="font-headline font-bold text-xs uppercase tracking-widest text-on-surface-variant px-1">
          Data Management & Backup
        </h3>
        <div className="bg-[var(--color-surface-container)] rounded-3xl p-5 border border-white/[0.04] space-y-3">
          <p className="text-xs text-on-surface-variant leading-relaxed">
            Backup all your routines, templates, sessions, personal records, and custom exercises to a JSON file.
          </p>
          <div className="flex gap-2 pt-1">
            <button
              onClick={handleExportBackup}
              className="flex-1 py-3 rounded-2xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.06] text-on-surface font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 active:scale-95 transition-all"
            >
              <span className="material-symbols-outlined text-[16px] text-primary">download</span>
              Export Backup
            </button>
            <label className="flex-1 py-3 rounded-2xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.06] text-on-surface font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 active:scale-95 transition-all cursor-pointer">
              <span className="material-symbols-outlined text-[16px] text-[#6FFB85]">upload</span>
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
      <div className="text-center space-y-4 pt-4">
        <button onClick={() => setShowResetConfirm(true)} className="text-on-surface-variant font-label font-bold uppercase tracking-[0.2em] text-[10px] hover:text-white transition-colors flex items-center justify-center gap-2 mx-auto bg-white/5 py-3 px-6 rounded-full border border-white/5 hover:border-white/20">
          <span className="material-symbols-outlined text-sm">restart_alt</span>
          Redo Onboarding
        </button>
        <button 
          onClick={async () => {
            await logout();
            showToast('Signed out successfully!', 'success');
          }} 
          className="text-[#FF4D4D] font-label font-bold uppercase tracking-[0.2em] text-[10px] hover:opacity-70 transition-opacity flex items-center justify-center gap-2 mx-auto bg-[#FF4D4D]/10 py-3 px-6 rounded-full border border-[#FF4D4D]/20"
        >
          <span className="material-symbols-outlined text-sm">logout</span>
          Sign Out
        </button>
        <p className="text-[9px] text-white/15 font-bold tracking-widest uppercase">MyFitAI v2.1.0 • Build 2026.04</p>
      </div>
    </main>
  );
}
