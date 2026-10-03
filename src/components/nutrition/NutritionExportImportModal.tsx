// ─────────────────────────────────────────────────────────────
// MyFitAI — Nutrition Export & Import Modal
// Complete user data export (JSON & CSV) and safe schema-validated backup import.
// ─────────────────────────────────────────────────────────────

import { useState } from 'react';
import { exportNutritionDataJSON, exportNutritionLogsCSV, importNutritionData } from '../../services/nutrition/dataExportImport';

interface NutritionExportImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDataImported: () => void;
}

export default function NutritionExportImportModal({
  isOpen,
  onClose,
  onDataImported,
}: NutritionExportImportModalProps) {
  const [importText, setImportText] = useState('');
  const [importMode, setImportMode] = useState<'merge' | 'replace'>('merge');
  const [isProcessing, setIsProcessing] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  if (!isOpen) return null;

  const downloadFile = (content: string, filename: string, type: string) => {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleExportJSON = async () => {
    setIsProcessing(true);
    try {
      const json = await exportNutritionDataJSON();
      downloadFile(json, `myfitai_nutrition_backup_${new Date().toISOString().split('T')[0]}.json`, 'application/json');
      setMessage({ text: 'JSON backup downloaded successfully!', type: 'success' });
    } catch {
      setMessage({ text: 'Failed to generate JSON export.', type: 'error' });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleExportCSV = async () => {
    setIsProcessing(true);
    try {
      const csv = await exportNutritionLogsCSV();
      downloadFile(csv, `myfitai_food_logs_${new Date().toISOString().split('T')[0]}.csv`, 'text/csv');
      setMessage({ text: 'CSV spreadsheet downloaded successfully!', type: 'success' });
    } catch {
      setMessage({ text: 'Failed to generate CSV export.', type: 'error' });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleImport = async () => {
    if (!importText.trim()) return;
    setIsProcessing(true);
    setMessage(null);

    try {
      const result = await importNutritionData(importText, importMode);
      if (result.success) {
        setMessage({ text: `Successfully restored ${result.importedCount} nutrition records!`, type: 'success' });
        setImportText('');
        onDataImported();
      } else {
        setMessage({ text: result.errors[0] || 'Import failed. Check file format.', type: 'error' });
      }
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-fade-in">
      <div className="bg-[var(--color-surface-container)] w-full max-w-lg rounded-3xl h-[85vh] max-h-[680px] flex flex-col overflow-hidden border border-white/10 shadow-2xl">
        {/* Header */}
        <div className="p-4 border-b border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
              <span className="material-symbols-outlined text-[20px]">import_export</span>
            </div>
            <div>
              <h3 className="font-headline font-bold text-base text-on-surface">Data Import & Export</h3>
              <p className="text-[11px] text-on-surface-variant">Backup, transfer, or restore your nutrition diary</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-on-surface-variant hover:text-on-surface"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {message && (
            <div
              className={`p-3 rounded-2xl text-xs font-semibold ${
                message.type === 'success'
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                  : 'bg-red-500/10 text-red-400 border border-red-500/20'
              }`}
            >
              {message.text}
            </div>
          )}

          {/* Export Section */}
          <div className="bg-[var(--color-surface-container-high)] p-4 rounded-2xl border border-white/5 space-y-3">
            <span className="text-[10px] uppercase font-bold tracking-wider text-primary block">Export Data</span>
            <p className="text-xs text-on-surface-variant">
              Download your full food diary, recipes, water history, and weight trends.
            </p>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={handleExportJSON}
                disabled={isProcessing}
                className="py-2.5 px-3 bg-white/5 hover:bg-white/10 text-on-surface font-bold text-xs uppercase tracking-wide rounded-xl border border-white/10 flex items-center justify-center gap-2 transition-all active:scale-95"
              >
                <span className="material-symbols-outlined text-[18px]">data_object</span>
                Full Backup (JSON)
              </button>
              <button
                onClick={handleExportCSV}
                disabled={isProcessing}
                className="py-2.5 px-3 bg-white/5 hover:bg-white/10 text-on-surface font-bold text-xs uppercase tracking-wide rounded-xl border border-white/10 flex items-center justify-center gap-2 transition-all active:scale-95"
              >
                <span className="material-symbols-outlined text-[18px]">table_view</span>
                Spreadsheet (CSV)
              </button>
            </div>
          </div>

          {/* Import Section */}
          <div className="bg-[var(--color-surface-container-high)] p-4 rounded-2xl border border-white/5 space-y-3">
            <span className="text-[10px] uppercase font-bold tracking-wider text-on-surface-variant block">
              Restore from Backup
            </span>
            <p className="text-xs text-on-surface-variant">
              Paste previously exported MyFitAI JSON backup data below to restore your records.
            </p>

            <textarea
              rows={4}
              placeholder="Paste JSON backup payload here..."
              value={importText}
              onChange={e => setImportText(e.target.value)}
              className="w-full bg-[var(--color-surface-container)] border border-white/10 rounded-xl p-3 text-xs text-on-surface outline-none font-mono focus:border-primary"
            />

            <div className="flex items-center gap-4 text-xs text-on-surface-variant">
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="radio"
                  name="importMode"
                  checked={importMode === 'merge'}
                  onChange={() => setImportMode('merge')}
                  className="accent-primary"
                />
                Merge (Keep Existing)
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="radio"
                  name="importMode"
                  checked={importMode === 'replace'}
                  onChange={() => setImportMode('replace')}
                  className="accent-primary"
                />
                Replace All Data
              </label>
            </div>

            <button
              onClick={handleImport}
              disabled={isProcessing || !importText.trim()}
              className="w-full py-2.5 px-4 bg-primary text-black font-bold text-xs uppercase tracking-wide rounded-xl shadow-md disabled:opacity-50 active:scale-95 transition-all"
            >
              Restore Nutrition Data
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 bg-[var(--color-surface-container)] border-t border-white/5 text-center">
          <button
            onClick={onClose}
            className="w-full py-2.5 px-4 bg-white/5 hover:bg-white/10 text-on-surface font-headline font-bold text-xs uppercase tracking-wide rounded-xl"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
