// ─────────────────────────────────────────────────────────────
// MyFitAI — Activity Detail Modal
// Deep inspection of a completed activity with interactive route map,
// metrics, splits, laps, PR badges, territory gains, and GPX/CSV export.
// ─────────────────────────────────────────────────────────────

import { useState } from 'react';
import type { Activity } from '../../types/activity';
import {
  formatDuration,
  formatDistance,
  formatPace,
  formatSpeed,
  generateGPX,
  formatActivitiesToCSV,
} from '../../engine/activityCalculations';
import MapView from './MapView';
import ElevationProfile from './ElevationProfile';
import { useActivity } from '../../context/ActivityContext';
import {
  X,
  MapPinOff,
  Trophy,
  Shield,
  Zap,
  Download,
  FileSpreadsheet,
  Trash2,
  AlertTriangle,
} from 'lucide-react';

interface ActivityDetailModalProps {
  activity: Activity | null;
  isOpen: boolean;
  onClose: () => void;
  onDelete?: (id: string) => void;
}

export default function ActivityDetailModal({
  activity,
  isOpen,
  onClose,
  onDelete,
}: ActivityDetailModalProps) {
  const { preferences, territoryCells } = useActivity();
  const [activeTab, setActiveTab] = useState<'overview' | 'splits' | 'laps'>('overview');
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);

  if (!isOpen || !activity) return null;

  const formattedDist = formatDistance(activity.distanceMeters, preferences.unitSystem);
  const formattedDur = formatDuration(activity.durationSeconds);
  const formattedPace = formatPace(activity.averagePaceSecondsPerKm, preferences.unitSystem);
  const formattedSpeed = formatSpeed(activity.averageSpeedKmh, preferences.unitSystem);

  const dateObj = new Date(activity.startTime);
  const dateFormatted = dateObj.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
  const timeFormatted = dateObj.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  });

  const handleDownloadGPX = () => {
    const xml = generateGPX({
      title: activity.title,
      type: activity.type,
      startTime: activity.startTime,
      route: activity.route,
    });
    const blob = new Blob([xml], { type: 'application/gpx+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${activity.title.replace(/[^a-z0-9]/gi, '_')}.gpx`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadCSV = () => {
    const csv = formatActivitiesToCSV([activity]);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${activity.title.replace(/[^a-z0-9]/gi, '_')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-[110] bg-black/80 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-[var(--color-surface-container-lowest)] rounded-t-3xl sm:rounded-3xl w-full max-w-lg max-h-[92vh] flex flex-col border border-white/[0.08] shadow-2xl overflow-hidden animate-slide-up">
        {/* Modal Header */}
        <div className="p-4 sm:p-5 bg-[var(--color-surface-container)] border-b border-white/[0.04] flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="bg-primary/10 text-primary text-[10px] font-bold px-2 py-0.5 rounded-full border border-primary/20 uppercase tracking-wide">
                {activity.type}
              </span>
              <span className="text-on-surface-variant text-xs">
                {dateFormatted} at {timeFormatted}
              </span>
            </div>
            <h2 className="font-headline font-bold text-xl text-on-surface mt-1">
              {activity.title}
            </h2>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/[0.06] text-on-surface-variant hover:text-on-surface flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          {/* Interactive Route Map or Indoor Fallback */}
          {activity.route && activity.route.points && activity.route.points.length > 0 ? (
            <>
              <div className="rounded-2xl overflow-hidden border border-white/[0.06] shadow-lg">
                <MapView
                  mode="details"
                  routePoints={activity.route.simplifiedPoints || activity.route.points}
                  territoryCells={territoryCells}
                  height={240}
                  interactive={true}
                  followUser={false}
                  showTerritory={true}
                  replayEnabled={true}
                />
              </div>
              <ElevationProfile
                points={activity.route.simplifiedPoints || activity.route.points}
                unitSystem={preferences.unitSystem}
              />
            </>
          ) : (
            <div className="p-5 rounded-2xl bg-[var(--color-surface-container)] border border-white/[0.06] text-center text-xs text-white/50 flex flex-col items-center justify-center gap-1.5 py-6">
              <MapPinOff className="w-6 h-6 text-white/30" />
              <span>No GPS route for this activity</span>
            </div>
          )}

          {/* Personal Records Banner if unlocked */}
          {activity.personalRecords && activity.personalRecords.length > 0 && (
            <div className="bg-gradient-to-r from-amber-500/20 via-primary/10 to-transparent p-3 rounded-2xl border border-amber-500/30 flex items-center gap-3">
              <Trophy className="w-6 h-6 text-amber-400 shrink-0" />
              <div>
                <span className="font-headline font-bold text-xs text-amber-300 block">
                  New Personal Record!
                </span>
                <span className="text-[11px] text-on-surface-variant">
                  {activity.personalRecords.map(pr => `${pr.category.replace(/_/g, ' ')}: ${pr.formattedValue}`).join(' • ')}
                </span>
              </div>
            </div>
          )}

          {/* Primary Metrics Grid */}
          <div className="grid grid-cols-3 gap-2.5">
            <div className="bg-[var(--color-surface-container)] rounded-2xl p-3.5 text-center border border-white/[0.04]">
              <span className="text-[10px] text-on-surface-variant font-medium block">Distance</span>
              <span className="font-headline font-black text-xl text-on-surface">
                {formattedDist}
              </span>
            </div>
            <div className="bg-[var(--color-surface-container)] rounded-2xl p-3.5 text-center border border-white/[0.04]">
              <span className="text-[10px] text-on-surface-variant font-medium block">Duration</span>
              <span className="font-headline font-black text-xl text-on-surface font-mono">
                {formattedDur}
              </span>
            </div>
            <div className="bg-[var(--color-surface-container)] rounded-2xl p-3.5 text-center border border-white/[0.04]">
              <span className="text-[10px] text-on-surface-variant font-medium block">Avg Pace</span>
              <span className="font-headline font-black text-xl text-primary">
                {formattedPace}
              </span>
            </div>

            <div className="bg-[var(--color-surface-container)] rounded-2xl p-3.5 text-center border border-white/[0.04]">
              <span className="text-[10px] text-on-surface-variant font-medium block">Avg Speed</span>
              <span className="font-headline font-bold text-base text-on-surface">
                {formattedSpeed}
              </span>
            </div>
            <div className="bg-[var(--color-surface-container)] rounded-2xl p-3.5 text-center border border-white/[0.04]">
              <span className="text-[10px] text-on-surface-variant font-medium block">Elevation</span>
              <span className="font-headline font-bold text-base text-[#6FFB85]">
                +{activity.elevationGainMeters} m
              </span>
            </div>
            <div className="bg-[var(--color-surface-container)] rounded-2xl p-3.5 text-center border border-white/[0.04]">
              <span className="text-[10px] text-on-surface-variant font-medium block">Calories</span>
              <span className="font-headline font-bold text-base text-[#FF7A00]">
                {activity.calories} kcal
              </span>
            </div>
          </div>

          {/* Territory & Gamification Impact Row */}
          {(activity.territoryCapturedKm2 || activity.xpEarned) && (
            <div className="grid grid-cols-2 gap-2.5">
              <div className="bg-primary/10 rounded-2xl p-3 border border-primary/20 flex items-center gap-3">
                <Shield className="w-6 h-6 text-primary shrink-0" />
                <div>
                  <span className="text-[10px] text-primary/80 font-bold uppercase block">
                    Territory Captured
                  </span>
                  <span className="font-headline font-black text-lg text-on-surface">
                    +{activity.territoryCapturedKm2 || 0} km²
                  </span>
                </div>
              </div>
              <div className="bg-[#A78BFA]/10 rounded-2xl p-3 border border-[#A78BFA]/20 flex items-center gap-3">
                <Zap className="w-6 h-6 text-[#A78BFA] shrink-0" />
                <div>
                  <span className="text-[10px] text-[#A78BFA]/80 font-bold uppercase block">
                    XP Earned
                  </span>
                  <span className="font-headline font-black text-lg text-on-surface">
                    +{activity.xpEarned || 0} XP
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Tab Selection: Overview / Splits / Laps */}
          <div className="flex border-b border-white/[0.06] pt-1">
            <button
              onClick={() => setActiveTab('overview')}
              className={`flex-1 py-2 text-xs font-bold transition-all border-b-2 ${
                activeTab === 'overview'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-on-surface-variant hover:text-on-surface'
              }`}
            >
              Overview
            </button>
            <button
              onClick={() => setActiveTab('splits')}
              className={`flex-1 py-2 text-xs font-bold transition-all border-b-2 ${
                activeTab === 'splits'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-on-surface-variant hover:text-on-surface'
              }`}
            >
              Splits ({activity.splits?.length || 0})
            </button>
            {activity.laps && activity.laps.length > 0 && (
              <button
                onClick={() => setActiveTab('laps')}
                className={`flex-1 py-2 text-xs font-bold transition-all border-b-2 ${
                  activeTab === 'laps'
                    ? 'border-primary text-primary'
                    : 'border-transparent text-on-surface-variant hover:text-on-surface'
                }`}
              >
                Laps ({activity.laps.length})
              </button>
            )}
          </div>

          {/* Tab Content */}
          {activeTab === 'splits' && (
            <div className="space-y-1.5">
              {activity.splits && activity.splits.length > 0 ? (
                activity.splits.map(split => (
                  <div
                    key={split.splitIndex}
                    className="flex items-center justify-between p-2.5 rounded-xl bg-[var(--color-surface-container)] text-xs border border-white/[0.04]"
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-headline font-bold text-on-surface w-6">
                        {split.splitIndex}
                      </span>
                      <span className="text-on-surface-variant">
                        {formatDistance(split.distanceMeters, preferences.unitSystem)}
                      </span>
                    </div>
                    <span className="text-primary font-semibold font-mono">
                      {formatPace(split.paceSecondsPerKm, preferences.unitSystem)}
                    </span>
                    <span className="text-[#6FFB85] text-[11px]">
                      +{split.elevationGainMeters} m
                    </span>
                    <span className="text-on-surface-variant font-mono">
                      {formatDuration(split.durationSeconds)}
                    </span>
                  </div>
                ))
              ) : (
                <p className="text-center text-xs text-on-surface-variant py-4">No split intervals recorded.</p>
              )}
            </div>
          )}

          {activeTab === 'laps' && (
            <div className="space-y-1.5">
              {activity.laps?.map(lap => (
                <div
                  key={lap.lapIndex}
                  className="flex items-center justify-between p-2.5 rounded-xl bg-[var(--color-surface-container)] text-xs border border-white/[0.04]"
                >
                  <span className="font-headline font-bold text-on-surface">Lap {lap.lapIndex}</span>
                  <span className="text-on-surface-variant">
                    {formatDistance(lap.distanceMeters, preferences.unitSystem)}
                  </span>
                  <span className="text-primary font-semibold font-mono">
                    {formatPace(lap.paceSecondsPerKm, preferences.unitSystem)}
                  </span>
                  <span className="text-on-surface-variant font-mono">
                    {formatDuration(lap.durationSeconds)}
                  </span>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'overview' && (
            <div className="space-y-3">
              <div className="bg-[var(--color-surface-container)] rounded-2xl p-4 border border-white/[0.04] text-xs space-y-2">
                <div className="flex justify-between py-1 border-b border-white/[0.04]">
                  <span className="text-on-surface-variant">Moving Time</span>
                  <span className="text-on-surface font-semibold font-mono">
                    {formatDuration(activity.movingDurationSeconds)}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-white/[0.04]">
                  <span className="text-on-surface-variant">Max Speed</span>
                  <span className="text-on-surface font-semibold">
                    {formatSpeed(activity.maxSpeedKmh, preferences.unitSystem)}
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-white/[0.04]">
                  <span className="text-on-surface-variant">Elevation Loss</span>
                  <span className="text-on-surface font-semibold">
                    -{activity.elevationLossMeters} m
                  </span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-on-surface-variant">Tracking Source</span>
                  <span className="text-on-surface font-semibold uppercase">{activity.source}</span>
                </div>
              </div>

              {/* Export Buttons */}
              <div className="flex gap-2">
                <button
                  onClick={handleDownloadGPX}
                  className="flex-1 py-2.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.08] text-on-surface font-semibold text-xs flex items-center justify-center gap-1.5 border border-white/[0.06] transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  Export GPX
                </button>
                <button
                  onClick={handleDownloadCSV}
                  className="flex-1 py-2.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.08] text-on-surface font-semibold text-xs flex items-center justify-center gap-1.5 border border-white/[0.06] transition-colors"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  Export CSV
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Modal Bottom Actions */}
        <div className="p-4 bg-[var(--color-surface-container)] border-t border-white/[0.04] flex items-center justify-between">
          <button
            onClick={() => setShowConfirmDelete(true)}
            className="text-red-400 hover:text-red-300 text-xs font-semibold flex items-center gap-1.5 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Delete Activity
          </button>

          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-primary text-black font-headline font-bold text-xs active:scale-95 transition-all shadow-md shadow-primary/20"
          >
            Done
          </button>
        </div>

        {/* Delete Confirmation Dialog */}
        {showConfirmDelete && (
          <div className="fixed inset-0 z-[120] bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
            <div className="bg-[var(--color-surface-container)] rounded-2xl max-w-xs w-full p-5 border border-white/[0.08] text-center space-y-3">
              <AlertTriangle className="w-8 h-8 text-[#FF453A] mx-auto" />
              <h3 className="font-headline font-bold text-lg text-on-surface">Delete Activity?</h3>
              <p className="text-on-surface-variant text-xs">
                This will permanently delete this activity and its route from your history.
              </p>
              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => setShowConfirmDelete(false)}
                  className="flex-1 py-2.5 rounded-xl bg-white/[0.06] text-on-surface font-semibold text-xs hover:bg-white/[0.1]"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    setShowConfirmDelete(false);
                    onDelete?.(activity.id);
                    onClose();
                  }}
                  className="flex-1 py-2.5 rounded-xl bg-red-500/20 text-red-400 border border-red-500/30 font-semibold text-xs hover:bg-red-500/30"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
