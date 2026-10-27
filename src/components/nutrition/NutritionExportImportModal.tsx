// ─────────────────────────────────────────────────────────────
// MyFitAI — Nutrition Export & Import Modal
// Complete user data export (JSON & CSV) and safe schema-validated backup import.
// ─────────────────────────────────────────────────────────────

import { useState } from 'react';
import { ArrowUpDown, X, FileCode, FileSpreadsheet, Loader2 } from 'lucide-react';
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
      <div className="bg-[#151517] w-full max-w-lg rounded-2xl h-[85vh] max-h-[680px] flex flex-col overflow-hidden border border-[#2A2A2D] shadow-2xl">
        {/* Header */}
        <div className="p-4 border-b border-[#2A2A2D] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#30D158]/10 border border-[#30D158]/20 flex items-center justify-center text-[#30D158]">
              <ArrowUpDown className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-[#F5F5F5]">Data Import & Export</h3>
              <p className="text-[11px] text-[#A1A1A6]">Backup, transfer, or restore your nutrition diary</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-[#1E1E20] border border-[#2A2A2D] flex items-center justify-center text-[#A1A1A6] hover:text-[#F5F5F5] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {message && (
            <div
              className={`p-3 rounded-xl text-xs font-semibold ${
                message.type === 'success'
                  ? 'bg-[#30D158]/10 text-[#30D158] border border-[#30D158]/20'
                  : 'bg-[#FF453A]/10 text-[#FF453A] border border-[#FF453A]/20'
              }`}
            >
              {message.text}
            </div>
          )}

          {/* Export Section */}
          <div className="bg-[#1E1E20] p-4 rounded-xl border border-[#2A2A2D] space-y-3">
            <span className="text-[10px] uppercase font-bold tracking-wider text-[#30D158] block">Export Data</span>
            <p className="text-xs text-[#A1A1A6]">
              Download your full food diary, recipes, water history, and weight trends.
            </p>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={handleExportJSON}
                disabled={isProcessing}
                className="min-h-[44px] py-2.5 px-3 bg-[#151517] hover:bg-[#2A2A2D] text-[#F5F5F5] font-bold text-xs uppercase tracking-wide rounded-xl border border-[#2A2A2D] flex items-center justify-center gap-2 transition-all active:scale-95"
              >
                <FileCode className="w-4 h-4 text-[#4F9CF9]" />
                Full Backup (JSON)
              </button>
              <button
                onClick={handleExportCSV}
                disabled={isProcessing}
                className="min-h-[44px] py-2.5 px-3 bg-[#151517] hover:bg-[#2A2A2D] text-[#F5F5F5] font-bold text-xs uppercase tracking-wide rounded-xl border border-[#2A2A2D] flex items-center justify-center gap-2 transition-all active:scale-95"
              >
                <FileSpreadsheet className="w-4 h-4 text-[#30D158]" />
                Spreadsheet (CSV)
              </button>
            </div>
          </div>

          {/* Import Section */}
          <div className="bg-[#1E1E20] p-4 rounded-xl border border-[#2A2A2D] space-y-3">
            <span className="text-[10px] uppercase font-bold tracking-wider text-[#A1A1A6] block">
              Restore from Backup
            </span>
            <p className="text-xs text-[#A1A1A6]">
              Paste previously exported MyFitAI JSON backup data below to restore your records.
            </p>

            <textarea
              rows={4}
              placeholder="Paste JSON backup payload here..."
              value={importText}
              onChange={e => setImportText(e.target.value)}
              className="w-full bg-[#151517] border border-[#2A2A2D] rounded-xl p-3 text-xs text-[#F5F5F5] placeholder-[#A1A1A6]/40 outline-none font-mono tabular-nums focus:border-[#30D158]"
            />

            <div className="flex items-center gap-4 text-xs text-[#A1A1A6]">
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="radio"
                  name="importMode"
                  checked={importMode === 'merge'}
                  onChange={() => setImportMode('merge')}
                  className="accent-[#30D158]"
                />
                Merge (Keep Existing)
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="radio"
                  name="importMode"
                  checked={importMode === 'replace'}
                  onChange={() => setImportMode('replace')}
                  className="accent-[#30D158]"
                />
                Replace All Data
              </label>
            </div>

            <button
              onClick={handleImport}
              disabled={isProcessing || !importText.trim()}
              className="w-full min-h-[44px] py-2.5 px-4 bg-[#FF8A00] hover:bg-[#FF8A00]/90 text-black font-bold text-xs uppercase tracking-wide rounded-xl shadow-sm disabled:opacity-50 active:scale-95 transition-all flex items-center justify-center gap-1.5"
            >
              {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              Restore Nutrition Data
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 bg-[#151517] border-t border-[#2A2A2D] text-center">
          <button
            onClick={onClose}
            className="w-full min-h-[44px] py-2.5 px-4 bg-[#1E1E20] hover:bg-[#2A2A2D] text-[#F5F5F5] font-bold text-xs uppercase tracking-wide rounded-xl border border-[#2A2A2D] transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
