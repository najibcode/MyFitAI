// ─────────────────────────────────────────────────────────────
// MyFitAI — Offline Status & Gym Media Preload Component
// Provides real-time connectivity feedback, storage quota metrics,
// and 1-tap preloading of exercise demonstrations for gym basements.
// ─────────────────────────────────────────────────────────────

import { useState, useEffect } from 'react';
import { Wifi, WifiOff, HardDrive, CheckCircle2, Loader2, Dumbbell, X, Sparkles } from 'lucide-react';
import { offlineSyncService, type StorageEstimateResult, type PreloadProgress } from '../services/offlineSyncService';

interface OfflineStatusIndicatorProps {
  /** Optional specific exercise media URLs (e.g., from currently loaded workout) */
  workoutMediaUrls?: string[];
  className?: string;
  variant?: 'pill' | 'banner' | 'compact';
}

export default function OfflineStatusIndicator({
  workoutMediaUrls,
  className = '',
  variant = 'pill',
}: OfflineStatusIndicatorProps) {
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [showDrawer, setShowDrawer] = useState<boolean>(false);
  const [storageInfo, setStorageInfo] = useState<StorageEstimateResult | null>(null);
  const [isPreloading, setIsPreloading] = useState<boolean>(false);
  const [preloadProgress, setPreloadProgress] = useState<PreloadProgress | null>(null);
  const [cachedSuccess, setCachedSuccess] = useState<boolean>(false);

  useEffect(() => {
    const unsubscribe = offlineSyncService.subscribe((online) => {
      setIsOnline(online);
    });

    offlineSyncService.getStorageEstimate().then(setStorageInfo);

    return () => unsubscribe();
  }, []);

  const handleStartPreload = async () => {
    setIsPreloading(true);
    setCachedSuccess(false);

    // Combine workout-specific media with common gym split demonstration URLs
    const targets = new Set<string>();
    if (workoutMediaUrls) {
      workoutMediaUrls.forEach((u) => u && targets.add(u));
    }
    offlineSyncService.getCommonGymMediaUrls().forEach((u) => targets.add(u));

    const urlList = Array.from(targets);
    setPreloadProgress({ loaded: 0, total: urlList.length, isComplete: false });

    await offlineSyncService.preloadGymMediaPack(urlList, (prog) => {
      setPreloadProgress(prog);
      if (prog.isComplete) {
        setIsPreloading(false);
        setCachedSuccess(true);
        offlineSyncService.getStorageEstimate().then(setStorageInfo);
        setTimeout(() => setCachedSuccess(false), 4000);
      }
    });
  };

  // ─── Compact Variant (For headers/navbars) ───────────────────
  if (variant === 'compact') {
    return (
      <button
        onClick={() => setShowDrawer(true)}
        className={`flex items-center gap-1.5 px-2 py-1 rounded-full text-[10px] font-mono font-bold tracking-wider transition-all select-none ${
          !isOnline
            ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30 animate-pulse'
            : 'bg-[#151517] text-[#9A9AA6] hover:text-white border border-[#2A2A2D]'
        } ${className}`}
        title={!isOnline ? 'Offline Gym Mode Active' : 'Gym Offline Cache Manager'}
      >
        {!isOnline ? (
          <>
            <WifiOff className="w-3 h-3 text-amber-400" />
            <span>OFFLINE</span>
          </>
        ) : (
          <>
            <Wifi className="w-3 h-3 text-[var(--color-primary)]" />
            <span>OFFLINE READY</span>
          </>
        )}
      </button>
    );
  }

  // ─── Banner Variant (For Active Workout HUD) ─────────────────
  if (variant === 'banner' && !isOnline) {
    return (
      <div className={`w-full bg-gradient-to-r from-amber-950/40 via-amber-900/30 to-amber-950/40 border-y border-amber-500/30 px-3 py-1.5 flex items-center justify-between text-xs text-amber-300 font-sans backdrop-blur-md ${className}`}>
        <div className="flex items-center gap-2">
          <WifiOff className="w-3.5 h-3.5 text-amber-400 shrink-0 animate-pulse" />
          <span className="font-semibold tracking-tight">
            Basement / Offline Gym Mode
          </span>
          <span className="text-[10px] font-mono opacity-80 hidden sm:inline">
            • 100% of sets and workouts save directly to device storage
          </span>
        </div>
        <button
          onClick={() => setShowDrawer(true)}
          className="text-[10px] font-mono uppercase font-bold text-amber-200 underline hover:text-white shrink-0 ml-2"
        >
          Details
        </button>
      </div>
    );
  }

  // ─── Pill Variant (Default) ──────────────────────────────────
  return (
    <>
      <div className={`inline-flex items-center ${className}`}>
        <button
          onClick={() => setShowDrawer(true)}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-mono font-bold transition-all select-none border shadow-xs ${
            !isOnline
              ? 'bg-amber-500/15 text-amber-400 border-amber-500/30 hover:bg-amber-500/25'
              : 'bg-[#151517] text-[#A0A0AB] hover:text-white border-[#2A2A2D] hover:border-[#3E3E42]'
          }`}
        >
          {!isOnline ? (
            <>
              <WifiOff className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
              <span>Offline Gym Mode Active</span>
            </>
          ) : (
            <>
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[11px] uppercase tracking-wider text-[var(--color-on-surface)]">
                Offline Pack Ready
              </span>
            </>
          )}
        </button>
      </div>

      {/* ── Offline Gym Pack Preload Modal ── */}
      {showDrawer && (
        <div className="fixed inset-0 z-[999] bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-md bg-[#121214] border border-[#2A2A2D] rounded-3xl p-6 shadow-2xl flex flex-col gap-5">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-[#2A2A2D] pb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-[var(--color-primary)]/15 border border-[var(--color-primary)]/30 flex items-center justify-center text-[var(--color-primary)]">
                  <HardDrive className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-headline font-black text-lg text-white tracking-tight">
                    Offline Gym Resilience
                  </h3>
                  <span className="text-[10px] font-mono uppercase tracking-widest text-[#7A7A85] block">
                    Zero-Connectivity Cache Architecture
                  </span>
                </div>
              </div>
              <button
                onClick={() => setShowDrawer(false)}
                className="w-8 h-8 rounded-full bg-[#1E1E20] border border-[#2A2A2D] flex items-center justify-center text-neutral-400 hover:text-white transition-colors"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Status Breakdown */}
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3.5 rounded-2xl bg-[#18181B] border border-[#2A2A2D]">
                <div className="flex items-center gap-2.5">
                  {!isOnline ? (
                    <WifiOff className="w-4 h-4 text-amber-400" />
                  ) : (
                    <Wifi className="w-4 h-4 text-emerald-400" />
                  )}
                  <span className="text-xs font-semibold text-white">Network Connection</span>
                </div>
                <span
                  className={`text-[10px] font-mono uppercase font-bold px-2 py-0.5 rounded-md ${
                    !isOnline
                      ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                      : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  }`}
                >
                  {!isOnline ? 'Offline (Basement)' : 'Online (Wi-Fi / Cell)'}
                </span>
              </div>

              <div className="flex items-center justify-between p-3.5 rounded-2xl bg-[#18181B] border border-[#2A2A2D]">
                <div className="flex items-center gap-2.5">
                  <HardDrive className="w-4 h-4 text-[var(--color-primary)]" />
                  <span className="text-xs font-semibold text-white">Local Storage Quota</span>
                </div>
                <span className="text-xs font-mono font-bold text-white">
                  {storageInfo?.formatted || 'Calculating...'}
                </span>
              </div>

              <div className="flex items-center justify-between p-3.5 rounded-2xl bg-[#18181B] border border-[#2A2A2D]">
                <div className="flex items-center gap-2.5">
                  <Dumbbell className="w-4 h-4 text-sky-400" />
                  <span className="text-xs font-semibold text-white">Session & Log Storage</span>
                </div>
                <span className="text-[10px] font-mono uppercase font-bold text-sky-400 bg-sky-500/10 px-2 py-0.5 rounded-md border border-sky-500/20">
                  IndexedDB 100% Local
                </span>
              </div>
            </div>

            {/* Preload Progress Indicator */}
            {isPreloading && preloadProgress && (
              <div className="space-y-2 p-3.5 rounded-2xl bg-[#18181B] border border-[var(--color-primary)]/30">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-[var(--color-primary)] font-bold flex items-center gap-2">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Caching Exercise Demonstrations...
                  </span>
                  <span className="text-white font-bold">
                    {preloadProgress.loaded} / {preloadProgress.total}
                  </span>
                </div>
                <div className="w-full h-2 rounded-full bg-[#2A2A2D] overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-[var(--color-primary)] to-amber-500 transition-all duration-200"
                    style={{
                      width: `${preloadProgress.total > 0 ? (preloadProgress.loaded / preloadProgress.total) * 100 : 0}%`,
                    }}
                  />
                </div>
              </div>
            )}

            {cachedSuccess && (
              <div className="p-3 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center gap-2 text-xs font-mono text-emerald-300">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                <span>All gym demonstration assets cached! 100% offline ready.</span>
              </div>
            )}

            {/* Action Preload Button */}
            <div className="pt-2">
              <button
                onClick={handleStartPreload}
                disabled={isPreloading}
                className="w-full py-3.5 rounded-2xl bg-[var(--color-primary)] hover:brightness-110 active:scale-[0.98] disabled:opacity-50 text-white font-headline font-black uppercase tracking-wider text-sm flex items-center justify-center gap-2 shadow-lg shadow-[var(--color-primary)]/20 transition-all"
              >
                {isPreloading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Downloading Demonstration Media...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Preload Gym Media Pack</span>
                  </>
                )}
              </button>
              <p className="text-[11px] text-center text-[#7A7A85] mt-2 font-sans">
                Downloads exercise GIFs and images to device cache for zero-latency playback in basements.
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
