// ─────────────────────────────────────────────────────────────
// MyFitAI — Live Activity Tracker Screen / Overlay
// Displays real-time GPS stats (duration, distance, pace, speed,
// elevation, calories), live map, lap markers, auto-pause banner,
// and finish/pause/resume controls.
// ─────────────────────────────────────────────────────────────

import { useState } from 'react';
import { useActivity } from '../../context/ActivityContext';
import {
  formatDuration,
  formatDistance,
  formatPace,
  formatSpeed,
} from '../../engine/activityCalculations';
import MapView from './MapView';
import type { TerritoryProcessingResult } from '../../services/activity/territoryEngine';
import type { Activity } from '../../types/activity';

interface LiveActivityTrackerProps {
  onFinishComplete?: (result: { activity: Activity; territoryResult: TerritoryProcessingResult }) => void;
}

export default function LiveActivityTracker({ onFinishComplete }: LiveActivityTrackerProps) {
  const {
    activeSession,
    pauseTracking,
    resumeTracking,
    stopAndSaveActivity,
    cancelTracking,
    markLap,
    preferences,
    territoryCells,
  } = useActivity();

  const [showConfirmCancel, setShowConfirmCancel] = useState(false);
  const [isFinishing, setIsFinishing] = useState(false);

  if (!activeSession) return null;

  const isPaused = activeSession.state === 'PAUSED';
  const isAutoPaused = activeSession.state === 'AUTO_PAUSED';

  const handleFinish = async () => {
    setIsFinishing(true);
    try {
      const res = await stopAndSaveActivity();
      if (res && onFinishComplete) {
        onFinishComplete(res);
      }
    } finally {
      setIsFinishing(false);
    }
  };

  const formattedDist = formatDistance(activeSession.distanceMeters, preferences.unitSystem);
  const formattedDur = formatDuration(activeSession.durationSeconds);
  const formattedPace = formatPace(activeSession.currentPaceSecondsPerKm, preferences.unitSystem);
  const formattedSpeed = formatSpeed(activeSession.currentSpeedKmh, preferences.unitSystem);

  const getSignalBadgeColor = () => {
    switch (activeSession.gpsQuality) {
      case 'EXCELLENT':
        return 'text-[#6FFB85] bg-[#6FFB85]/10 border-[#6FFB85]/20';
      case 'GOOD':
        return 'text-primary bg-primary/10 border-primary/20';
      case 'WEAK':
        return 'text-[#FBBF24] bg-[#FBBF24]/10 border-[#FBBF24]/20';
      default:
        return 'text-on-surface-variant bg-white/[0.04] border-white/[0.08]';
    }
  };

  return (
    <div className="fixed inset-0 z-[120] bg-background flex flex-col justify-between overflow-y-auto">
      {/* Top Header */}
      <div className="p-4 bg-[var(--color-header-bg)]/90 backdrop-blur-xl border-b border-white/[0.04] flex items-center justify-between z-10 sticky top-0">
        <div className="flex items-center gap-2.5">
          <span className="w-2.5 h-2.5 rounded-full bg-primary animate-ping" />
          <span className="font-headline font-black text-sm uppercase tracking-wider text-on-surface">
            {activeSession.type}
          </span>
          <span
            className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${getSignalBadgeColor()}`}
          >
            GPS {activeSession.gpsQuality}
          </span>
        </div>

        <button
          onClick={() => setShowConfirmCancel(true)}
          className="text-on-surface-variant hover:text-red-400 text-xs font-semibold px-2 py-1 rounded transition-colors"
        >
          Discard
        </button>
      </div>

      {/* Auto-Pause Warning Banner */}
      {isAutoPaused && (
        <div className="bg-[#FBBF24]/15 border-b border-[#FBBF24]/30 px-4 py-2 text-center text-[#FBBF24] text-xs font-bold flex items-center justify-center gap-2">
          <span className="material-symbols-outlined text-[16px]">pause_circle</span>
          AUTO PAUSED — Movement stopped
        </div>
      )}

      {/* Primary Metrics Centerpiece */}
      <div className="flex-1 flex flex-col px-5 py-4 space-y-4">
        {/* Main Distance & Duration Grid */}
        <div className="text-center py-2">
          <span className="text-on-surface-variant text-xs font-bold uppercase tracking-widest block mb-1">
            Distance
          </span>
          <h1 className="font-headline font-black text-5xl tracking-tight text-on-surface leading-none">
            {formattedDist}
          </h1>
          <p className="font-headline font-bold text-2xl text-on-surface-variant mt-2 font-mono">
            {formattedDur}
          </p>
        </div>

        {/* Live Metrics Row */}
        <div className="grid grid-cols-4 gap-2">
          <div className="bg-[var(--color-surface-container)] rounded-xl p-3 text-center border border-white/[0.04]">
            <span className="text-[10px] text-on-surface-variant font-medium block">Pace</span>
            <span className="font-headline font-bold text-sm text-on-surface">
              {formattedPace}
            </span>
          </div>
          <div className="bg-[var(--color-surface-container)] rounded-xl p-3 text-center border border-white/[0.04]">
            <span className="text-[10px] text-on-surface-variant font-medium block">Speed</span>
            <span className="font-headline font-bold text-sm text-on-surface">
              {formattedSpeed}
            </span>
          </div>
          <div className="bg-[var(--color-surface-container)] rounded-xl p-3 text-center border border-white/[0.04]">
            <span className="text-[10px] text-on-surface-variant font-medium block">Elevation</span>
            <span className="font-headline font-bold text-sm text-[#6FFB85]">
              +{activeSession.elevationGainMeters} m
            </span>
          </div>
          <div className="bg-[var(--color-surface-container)] rounded-xl p-3 text-center border border-white/[0.04]">
            <span className="text-[10px] text-on-surface-variant font-medium block">Est. Cal</span>
            <span className="font-headline font-bold text-sm text-[#FF7A00]">
              {activeSession.calories}
            </span>
          </div>
        </div>

        {/* Live Interactive Map with Territory */}
        <div className="rounded-2xl overflow-hidden border border-white/[0.06] shadow-xl">
          <MapView
            currentLocation={activeSession.currentLocation}
            routePoints={activeSession.points}
            territoryCells={territoryCells}
            height={260}
            interactive={true}
            followUser={true}
            showTerritory={true}
          />
        </div>

        {/* Laps List Preview if user marked laps */}
        {activeSession.laps.length > 0 && (
          <div className="bg-[var(--color-surface-container)] rounded-xl p-3 border border-white/[0.04] max-h-28 overflow-y-auto">
            <span className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant block mb-1.5">
              Laps Recorded ({activeSession.laps.length})
            </span>
            <div className="space-y-1">
              {activeSession.laps.map(lap => (
                <div key={lap.lapIndex} className="flex justify-between text-xs py-0.5">
                  <span className="text-on-surface font-semibold">Lap {lap.lapIndex}</span>
                  <span className="text-on-surface-variant">{formatDistance(lap.distanceMeters, preferences.unitSystem)}</span>
                  <span className="text-on-surface-variant font-mono">{formatDuration(lap.durationSeconds)}</span>
                  <span className="text-primary font-medium">{formatPace(lap.paceSecondsPerKm, preferences.unitSystem)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Bottom Sticky Action Controls */}
      <div className="p-5 bg-[var(--color-surface-container-lowest)]/95 backdrop-blur-xl border-t border-white/[0.04] z-10 sticky bottom-0">
        <div className="flex items-center justify-center gap-4 max-w-sm mx-auto">
          {/* Lap Marker Button */}
          <button
            onClick={markLap}
            disabled={isPaused}
            className="w-14 h-14 rounded-full bg-[var(--color-surface-container-high)] border border-white/[0.08] text-on-surface flex flex-col items-center justify-center active:scale-95 transition-all disabled:opacity-30 shadow-md"
            title="Mark Lap"
          >
            <span className="material-symbols-outlined text-[18px]">flag</span>
            <span className="text-[8px] font-bold uppercase">Lap</span>
          </button>

          {/* Pause / Resume Main Toggle */}
          {isPaused || isAutoPaused ? (
            <button
              onClick={resumeTracking}
              className="flex-1 h-14 rounded-2xl bg-primary text-black font-headline font-black text-base flex items-center justify-center gap-2 active:scale-95 transition-all shadow-lg shadow-primary/20"
            >
              <span className="material-symbols-outlined text-[22px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                play_arrow
              </span>
              RESUME
            </button>
          ) : (
            <button
              onClick={pauseTracking}
              className="flex-1 h-14 rounded-2xl bg-[#FBBF24] text-black font-headline font-black text-base flex items-center justify-center gap-2 active:scale-95 transition-all shadow-lg shadow-[#FBBF24]/20"
            >
              <span className="material-symbols-outlined text-[22px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                pause
              </span>
              PAUSE
            </button>
          )}

          {/* Finish & Save Button */}
          <button
            onClick={handleFinish}
            disabled={isFinishing || activeSession.points.length === 0}
            className="w-14 h-14 rounded-full bg-[#FF4D4D] text-white flex flex-col items-center justify-center active:scale-95 transition-all disabled:opacity-30 shadow-md shadow-red-500/20"
            title="Finish Activity"
          >
            <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>
              stop
            </span>
            <span className="text-[8px] font-bold uppercase">Finish</span>
          </button>
        </div>
      </div>

      {/* Discard Confirmation Modal */}
      {showConfirmCancel && (
        <div className="fixed inset-0 z-[130] bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[var(--color-surface-container)] rounded-2xl max-w-xs w-full p-5 border border-white/[0.08] text-center space-y-3">
            <span className="material-symbols-outlined text-red-400 text-3xl">warning</span>
            <h3 className="font-headline font-bold text-lg text-on-surface">Discard Activity?</h3>
            <p className="text-on-surface-variant text-xs">
              Are you sure you want to discard this active session? Recorded GPS points will be deleted.
            </p>
            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setShowConfirmCancel(false)}
                className="flex-1 py-2.5 rounded-xl bg-white/[0.06] text-on-surface font-semibold text-xs hover:bg-white/[0.1]"
              >
                Keep Going
              </button>
              <button
                onClick={() => {
                  setShowConfirmCancel(false);
                  cancelTracking();
                }}
                className="flex-1 py-2.5 rounded-xl bg-red-500/20 text-red-400 border border-red-500/30 font-semibold text-xs hover:bg-red-500/30"
              >
                Discard
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
