import { useState, useEffect } from 'react';
import { useHealth } from '../../context/HealthContext';
import { useActivity } from '../../context/ActivityContext';
import {
  Activity,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  RefreshCw,
  ExternalLink,
  ShieldCheck,
  Footprints,
  Moon,
  Smartphone,
  X,
  Info,
} from 'lucide-react';

interface HealthDiagnosticModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function HealthDiagnosticModal({ isOpen, onClose }: HealthDiagnosticModalProps) {
  const { status, runDiagnostics, openPlatformSettings, syncNow } = useHealth();
  const { dailyActivityState, requestStepPermission } = useActivity();

  const [loading, setLoading] = useState(false);
  const [diagData, setDiagData] = useState<{
    available: boolean;
    reason?: string;
    permissions: { steps: boolean; sleep: boolean };
    todaySteps: number;
    todaySleepMinutes: number;
    sourceApps: string[];
    logs: string[];
  } | null>(null);

  const fetchDiagnostics = async () => {
    setLoading(true);
    try {
      const res = await runDiagnostics();
      setDiagData(res);
    } catch (e) {
      console.warn('Diagnostics failed:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchDiagnostics();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const isAndroid = status.platform === 'android';
  const hasZeroData = diagData && diagData.todaySteps === 0 && diagData.todaySleepMinutes === 0;
  const permissionsGranted = diagData && (diagData.permissions.steps || diagData.permissions.sleep);

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-lg bg-[#151517] border border-[#2A2A2D] rounded-3xl p-6 sm:p-7 shadow-2xl overflow-y-auto max-h-[90vh] space-y-6">
        {/* Glow accent */}
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 w-8 h-8 rounded-full bg-white/[0.06] hover:bg-white/[0.12] flex items-center justify-center text-white/70 hover:text-white transition-colors"
          aria-label="Close"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header */}
        <div className="space-y-1.5">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-headline font-bold uppercase tracking-wider">
            <Activity className="w-3.5 h-3.5" />
            <span>Health Sync Inspector</span>
          </div>
          <h2 className="font-headline font-black text-2xl tracking-tight text-[#F5F5F5]">
            Connection Diagnostics
          </h2>
          <p className="text-xs text-[#A1A1A6] leading-relaxed">
            Inspect real-time health data flow between your device, Health Connect, and MyFitAI.
          </p>
        </div>

        {/* Diagnostic Items */}
        <div className="space-y-3">
          {/* 1. Health Subsystem Availability */}
          <div className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/[0.05] flex items-center justify-between">
            <div className="flex items-center gap-3">
              <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0" />
              <div>
                <span className="text-xs font-bold text-[#F5F5F5] block">
                  {status.platformName} Subsystem
                </span>
                <span className="text-[11px] text-[#A1A1A6]">
                  {diagData?.available ? 'Available and active' : diagData?.reason || 'Checking...'}
                </span>
              </div>
            </div>
            {diagData?.available ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            ) : (
              <XCircle className="w-5 h-5 text-rose-400 shrink-0" />
            )}
          </div>

          {/* 2. Health Connect Permissions */}
          <div className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/[0.05] space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#F5F5F5]">
                Health Connect Authorization
              </span>
              {permissionsGranted ? (
                <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                  Granted
                </span>
              ) : (
                <span className="text-[10px] font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
                  Not Granted
                </span>
              )}
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="flex items-center gap-2 p-2 rounded-xl bg-white/[0.02]">
                <Footprints className="w-4 h-4 text-emerald-400" />
                <span className="text-[#A1A1A6]">Steps:</span>
                <span className={`font-bold ml-auto ${diagData?.permissions.steps ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {diagData?.permissions.steps ? 'ALLOWED' : 'DENIED'}
                </span>
              </div>
              <div className="flex items-center gap-2 p-2 rounded-xl bg-white/[0.02]">
                <Moon className="w-4 h-4 text-indigo-400" />
                <span className="text-[#A1A1A6]">Sleep:</span>
                <span className={`font-bold ml-auto ${diagData?.permissions.sleep ? 'text-indigo-400' : 'text-rose-400'}`}>
                  {diagData?.permissions.sleep ? 'ALLOWED' : 'DENIED'}
                </span>
              </div>
            </div>
          </div>

          {/* 3. Data Query Results from Health Connect */}
          <div className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/[0.05] space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#F5F5F5]">
                Records in Health Connect Today
              </span>
              <span className="text-[10px] text-[#A1A1A6]">Query Result</span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                <span className="text-[10px] uppercase font-bold text-[#6B6B70] block">Steps in Health Connect</span>
                <span className="font-headline font-black text-lg text-[#F5F5F5] tabular-nums">
                  {diagData ? diagData.todaySteps.toLocaleString() : '...'}
                </span>
              </div>
              <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                <span className="text-[10px] uppercase font-bold text-[#6B6B70] block">Sleep in Health Connect</span>
                <span className="font-headline font-black text-lg text-indigo-400 tabular-nums">
                  {diagData ? `${Math.round(diagData.todaySleepMinutes / 60)}h ${diagData.todaySleepMinutes % 60}m` : '...'}
                </span>
              </div>
            </div>
          </div>

          {/* 4. Hardware Motion Sensor (Physical Phone Sensor) */}
          <div className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/[0.05] flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Smartphone className="w-5 h-5 text-emerald-400 shrink-0" />
              <div>
                <span className="text-xs font-bold text-[#F5F5F5] block">
                  Hardware Motion Sensor (Pedometer)
                </span>
                <span className="text-[11px] text-[#A1A1A6]">
                  {dailyActivityState.hasPermission
                    ? `Active (${dailyActivityState.dailySteps} live steps recorded)`
                    : 'Physical Activity permission needed'}
                </span>
              </div>
            </div>
            {!dailyActivityState.hasPermission && (
              <button
                onClick={() => requestStepPermission()}
                className="px-3 py-1 bg-emerald-500 text-black text-xs font-bold rounded-lg shrink-0"
              >
                Enable
              </button>
            )}
          </div>
        </div>

        {/* ── SAMSUNG HEALTH SPECIAL GUIDANCE ── */}
        {isAndroid && permissionsGranted && hasZeroData && (
          <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 space-y-3">
            <div className="flex items-center gap-2 text-amber-300 font-bold text-xs uppercase tracking-wide">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>Samsung Galaxy Setup Required</span>
            </div>
            <p className="text-xs text-amber-100/90 leading-relaxed">
              You granted permissions to MyFitAI, but <strong>Samsung Health has not exported your steps or sleep into Health Connect yet</strong>.
            </p>
            <div className="p-3 rounded-xl bg-black/40 border border-amber-500/20 text-xs space-y-2 text-[#E5E5E5]">
              <p className="font-bold text-white flex items-center gap-1.5">
                <Info className="w-3.5 h-3.5 text-amber-400" />
                How to link Samsung Health to Health Connect:
              </p>
              <ol className="list-decimal list-inside space-y-1 text-[11px] text-gray-300">
                <li>Open the <strong>Samsung Health</strong> app</li>
                <li>Tap <strong>Settings (⚙️ or ⋮)</strong> at top right</li>
                <li>Tap <strong>Health Connect</strong> (under Connected services)</li>
                <li>Tap <strong>App permissions → Samsung Health</strong></li>
                <li>Turn ON <strong>Allow all</strong> (or toggle Steps & Sleep)</li>
              </ol>
            </div>
            <div className="flex flex-wrap gap-2 pt-1">
              <button
                onClick={() => openPlatformSettings()}
                className="flex-1 py-2 px-3 rounded-xl bg-amber-500 text-black font-headline font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 active:scale-95 transition-transform"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                Open Health Connect Settings
              </button>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2.5 pt-2">
          <button
            onClick={async () => {
              await fetchDiagnostics();
              await syncNow();
            }}
            disabled={loading}
            className="flex-1 py-3 px-4 rounded-xl bg-white/[0.08] hover:bg-white/[0.12] text-white font-headline font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 active:scale-95 transition-all disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            {loading ? 'Testing...' : 'Refresh & Re-test'}
          </button>
          <button
            onClick={onClose}
            className="py-3 px-5 rounded-xl bg-emerald-500 text-black font-headline font-bold text-xs uppercase tracking-wider active:scale-95 transition-all"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
