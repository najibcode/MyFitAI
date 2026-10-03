// ─────────────────────────────────────────────────────────────
// MyFitAI — Activity Export & Import Modal
// Provides full user data sovereignty: JSON backup, CSV spreadsheet
// export, GPX import from wearable files, and cloud sync control.
// ─────────────────────────────────────────────────────────────

import { useState, useRef } from 'react';
import { useActivity } from '../../context/ActivityContext';
import {
  formatActivitiesToCSV,
  parseGPX,
  processRouteMetrics,
  calculatePaceSecondsPerKm,
} from '../../engine/activityCalculations';
import { db } from '../../utils/db';

interface ActivityExportImportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ActivityExportImportModal({
  isOpen,
  onClose,
}: ActivityExportImportModalProps) {
  const { activities, pendingSyncCount, syncPending, isOnline } = useActivity();
  const [isImporting, setIsImporting] = useState(false);
  const [importStatus, setImportStatus] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleExportJSON = async () => {
    const backup = await db.exportAll();
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `myfitai_backup_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportCSV = () => {
    const csv = formatActivitiesToCSV(activities);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `myfitai_activities_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleGPXFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    setImportStatus('Reading GPX file...');

    try {
      const text = await file.text();
      const parsed = parseGPX(text);

      if (!parsed.points || parsed.points.length < 2) {
        setImportStatus('Invalid or empty GPX route.');
        return;
      }

      const metrics = processRouteMetrics(parsed.points);
      const startTime = new Date(parsed.points[0].timestamp).toISOString();
      const endTime = new Date(parsed.points[parsed.points.length - 1].timestamp).toISOString();
      const durationSeconds = Math.max(
        1,
        Math.round((parsed.points[parsed.points.length - 1].timestamp - parsed.points[0].timestamp) / 1000)
      );
      const pace = calculatePaceSecondsPerKm(metrics.distanceMeters, durationSeconds);
      const speed =
        durationSeconds > 0
          ? Math.round(((metrics.distanceMeters / 1000) / (durationSeconds / 3600)) * 10) / 10
          : 0;

      const newActivity = {
        id: `act_gpx_${Date.now()}`,
        userId: 'guest',
        type: 'RUN' as const,
        title: parsed.title || file.name.replace(/\.gpx$/i, ''),
        startTime,
        endTime,
        durationSeconds,
        movingDurationSeconds: durationSeconds,
        distanceMeters: metrics.distanceMeters,
        averagePaceSecondsPerKm: pace,
        averageSpeedKmh: speed,
        maxSpeedKmh: speed,
        elevationGainMeters: metrics.elevationGainMeters,
        elevationLossMeters: metrics.elevationLossMeters,
        calories: Math.round(durationSeconds * 0.15),
        route: {
          points: parsed.points,
          distanceMeters: metrics.distanceMeters,
          elevationGainMeters: metrics.elevationGainMeters,
          elevationLossMeters: metrics.elevationLossMeters,
        },
        source: 'IMPORTED_GPX' as const,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await db.activity.activities.save(newActivity);
      setImportStatus(`Successfully imported: ${newActivity.title} (${(metrics.distanceMeters / 1000).toFixed(2)} km)`);
      setTimeout(() => window.location.reload(), 1200);
    } catch (err: any) {
      setImportStatus(`Import failed: ${err.message || 'Corrupt GPX'}`);
    } finally {
      setIsImporting(false);
    }
  };

  const handleManualSync = async () => {
    setIsSyncing(true);
    try {
      const count = await syncPending();
      setImportStatus(`Synced ${count} pending activities to cloud.`);
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[120] bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-[var(--color-surface-container)] rounded-3xl max-w-sm w-full p-5 border border-white/[0.08] shadow-2xl space-y-4">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-xl">folder_zip</span>
            <h3 className="font-headline font-bold text-lg text-on-surface">Data Sovereignty</h3>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/[0.06] text-on-surface-variant hover:text-on-surface flex items-center justify-center"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>

        <p className="text-on-surface-variant text-xs leading-relaxed">
          Export your complete fitness activity and territory data at any time, or import GPX route files from Garmin, Apple Watch, or Strava.
        </p>

        {/* Sync Status Banner */}
        <div className="bg-[var(--color-surface-container-high)] rounded-2xl p-3 border border-white/[0.04] flex items-center justify-between text-xs">
          <div>
            <div className="flex items-center gap-1.5 font-semibold text-on-surface">
              <span
                className={`w-2 h-2 rounded-full ${
                  isOnline ? 'bg-[#6FFB85]' : 'bg-[#FBBF24]'
                }`}
              />
              {isOnline ? 'Online' : 'Offline'}
            </div>
            <span className="text-[11px] text-on-surface-variant">
              {pendingSyncCount > 0 ? `${pendingSyncCount} pending upload` : 'All activities synced'}
            </span>
          </div>
          {pendingSyncCount > 0 && (
            <button
              onClick={handleManualSync}
              disabled={isSyncing || !isOnline}
              className="px-3 py-1.5 rounded-xl bg-primary text-black font-headline font-bold text-[11px] active:scale-95 disabled:opacity-40"
            >
              {isSyncing ? 'Syncing...' : 'Sync Now'}
            </button>
          )}
        </div>

        {/* Export Actions */}
        <div className="space-y-2">
          <button
            onClick={handleExportJSON}
            className="w-full py-3 px-4 rounded-2xl bg-white/[0.04] hover:bg-white/[0.07] border border-white/[0.06] text-left flex items-center justify-between text-xs font-semibold text-on-surface transition-colors"
          >
            <div className="flex items-center gap-2.5">
              <span className="material-symbols-outlined text-primary text-lg">backup</span>
              <div>
                <span>Complete JSON Backup</span>
                <span className="text-[10px] text-on-surface-variant block font-normal">
                  Full database export (Workouts + Nutrition + Activities)
                </span>
              </div>
            </div>
            <span className="material-symbols-outlined text-[16px] text-on-surface-variant">download</span>
          </button>

          <button
            onClick={handleExportCSV}
            className="w-full py-3 px-4 rounded-2xl bg-white/[0.04] hover:bg-white/[0.07] border border-white/[0.06] text-left flex items-center justify-between text-xs font-semibold text-on-surface transition-colors"
          >
            <div className="flex items-center gap-2.5">
              <span className="material-symbols-outlined text-[#6FFB85] text-lg">table_chart</span>
              <div>
                <span>Activities CSV Spreadsheet</span>
                <span className="text-[10px] text-on-surface-variant block font-normal">
                  Compatible with Microsoft Excel and Google Sheets
                </span>
              </div>
            </div>
            <span className="material-symbols-outlined text-[16px] text-on-surface-variant">download</span>
          </button>
        </div>

        {/* GPX Import Action */}
        <div className="pt-2 border-t border-white/[0.06]">
          <input
            type="file"
            ref={fileInputRef}
            accept=".gpx"
            onChange={handleGPXFileSelect}
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isImporting}
            className="w-full py-3 px-4 rounded-2xl bg-white/[0.04] hover:bg-white/[0.07] border border-dashed border-white/[0.12] text-center flex flex-col items-center justify-center text-xs font-semibold text-on-surface transition-colors"
          >
            <span className="material-symbols-outlined text-primary text-2xl mb-1">upload_file</span>
            <span>{isImporting ? 'Importing GPX...' : 'Import GPX Route File'}</span>
            <span className="text-[10px] text-on-surface-variant font-normal mt-0.5">
              Select a .gpx file from your device
            </span>
          </button>
        </div>

        {importStatus && (
          <p className="text-center text-xs text-primary font-medium bg-primary/10 p-2.5 rounded-xl border border-primary/20">
            {importStatus}
          </p>
        )}
      </div>
    </div>
  );
}
