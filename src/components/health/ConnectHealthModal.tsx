import React from 'react';
import { useHealth } from '../../context/HealthContext';
import { ShieldCheck, Heart, Footprints, Moon, X, AlertCircle, Lock } from 'lucide-react';

interface ConnectHealthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ConnectHealthModal({ isOpen, onClose }: ConnectHealthModalProps) {
  const { status, connectHealth, openPlatformSettings } = useHealth();
  const [loading, setLoading] = React.useState(false);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);

  if (!isOpen) return null;

  const handleConnect = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const success = await connectHealth();
      if (success) {
        onClose();
      } else {
        setErrorMsg(status.error || 'Permission was not granted.');
      }
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Connection failed.');
    } finally {
      setLoading(false);
    }
  };

  const isWeb = status.platform === 'web';

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-md bg-[var(--color-surface)] border border-[var(--color-border)] rounded-3xl p-6 sm:p-7 shadow-2xl overflow-hidden space-y-6">
        {/* Glow accent */}
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-[var(--color-primary)]/10 rounded-full blur-3xl pointer-events-none" />

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 w-8 h-8 rounded-full bg-white/[0.06] hover:bg-white/[0.12] flex items-center justify-center text-white/70 hover:text-white transition-colors"
          aria-label="Close"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header */}
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[var(--color-primary)]/10 border border-[var(--color-primary)]/20 text-[var(--color-primary)] text-xs font-headline font-bold uppercase tracking-wider">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>{status.platformName} Integration</span>
          </div>
          <h2 className="font-headline font-black text-2xl tracking-tight text-[var(--color-on-surface)] leading-snug">
            Connect Your Health Data
          </h2>
          <p className="text-xs sm:text-sm text-[var(--color-on-surface-variant)] leading-relaxed">
            Eliminate manual tracking. MyFitAI automatically reads your daily movement and recovery from your phone or smartwatch.
          </p>
        </div>

        {/* Permissions list */}
        <div className="bg-[var(--color-surface-container)] rounded-2xl p-4 border border-white/[0.04] space-y-3.5">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 flex items-center justify-center shrink-0 mt-0.5">
              <Footprints className="w-4 h-4 text-emerald-400" />
            </div>
            <div>
              <p className="text-xs font-headline font-bold text-[var(--color-on-surface)]">Daily Steps & Activity</p>
              <p className="text-[11px] text-[var(--color-on-surface-variant)]">Aggregated from phone and watch without double-counting.</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-xl bg-indigo-500/10 flex items-center justify-center shrink-0 mt-0.5">
              <Moon className="w-4 h-4 text-indigo-400" />
            </div>
            <div>
              <p className="text-xs font-headline font-bold text-[var(--color-on-surface)]">Sleep Duration & Stages</p>
              <p className="text-[11px] text-[var(--color-on-surface-variant)]">Deep, Light, and REM sessions accurately linked to each sleep night.</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-xl bg-[var(--color-primary)]/10 flex items-center justify-center shrink-0 mt-0.5">
              <Heart className="w-4 h-4 text-[var(--color-primary)]" />
            </div>
            <div>
              <p className="text-xs font-headline font-bold text-[var(--color-on-surface)]">AI Coach Recovery Context</p>
              <p className="text-[11px] text-[var(--color-on-surface-variant)]">Feeds transparent readiness scores into your workout recommendations.</p>
            </div>
          </div>
        </div>

        {/* Privacy Note */}
        <p className="text-[10px] text-[#A1A1A6] leading-relaxed flex items-center gap-1">
          <Lock className="w-3 h-3 text-[#30D158] shrink-0" />
          <span><strong className="text-[#F5F5F5]">Minimal & Read-Only:</strong> We only request read access. Your data stays private to your account and is never used for advertising.</span>
        </p>

        {/* Error / Web notification */}
        {(errorMsg || isWeb) && (
          <div className="flex items-start gap-2.5 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">{isWeb ? 'Mobile Health Platform Required' : 'Connection Alert'}</p>
              <p className="text-[11px] text-amber-200/80 mt-0.5">
                {isWeb
                  ? 'Automatic Health Connect & HealthKit integration is active on Android and iOS mobile builds. On the web, you can enter steps and sleep manually.'
                  : errorMsg}
              </p>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-col gap-2.5 pt-1">
          {!isWeb ? (
            <button
              onClick={handleConnect}
              disabled={loading}
              className="w-full py-3.5 px-5 rounded-2xl bg-[var(--color-primary)] hover:brightness-110 active:scale-[0.98] transition-all text-black font-headline font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg shadow-[var(--color-primary)]/20 disabled:opacity-50"
            >
              {loading ? (
                <div className="w-4 h-4 rounded-full border-2 border-black border-t-transparent animate-spin" />
              ) : (
                <span>Connect Health Data</span>
              )}
            </button>
          ) : (
            <button
              onClick={onClose}
              className="w-full py-3.5 px-5 rounded-2xl bg-white/[0.08] hover:bg-white/[0.12] active:scale-[0.98] transition-all text-white font-headline font-bold text-xs uppercase tracking-wider text-center"
            >
              Close
            </button>
          )}

          {status.platform === 'android' && (
            <button
              onClick={openPlatformSettings}
              className="text-[11px] text-[var(--color-on-surface-variant)] hover:text-white font-semibold text-center transition-colors py-1"
            >
              Manage Health Connect App Settings
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
