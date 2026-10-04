// ─────────────────────────────────────────────────────────────
// MyFitAI — Shareable Muscle Card Modal & Editor
// Complete social sharing experience for physique photos +
// anatomical muscle maps, high-res canvas exports, and Android share.
// ─────────────────────────────────────────────────────────────

import { useState, useEffect, useMemo, useCallback } from 'react';
import type { WorkoutSession } from '../../types/workout';
import { db } from '../../utils/db';
import type {
  ShareCardConfig,
  ShareCardTemplate,
  ShareCardFormat,
  ShareCardTheme,
  ShareCardPeriod,
} from '../../types/shareCard';
import type { HeatmapMode } from '../MuscleHeatmap';
import { aggregateShareableMuscleData } from '../../services/share/shareMuscleDataService';
import { renderShareCardToBlob } from '../../services/share/ShareCardRenderer';
import {
  shareImageFile,
  saveImageToDevice,
  generateSocialCaption,
} from '../../services/share/shareExportService';
import { generateAICaption } from '../../services/gemini';
import PhotoCropEditor from './PhotoCropEditor';
import ShareCardPreview from './ShareCardPreview';
import { triggerHaptic } from '../../utils/audioFeedback';

interface ShareableMuscleCardModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialSession?: WorkoutSession;
  initialPeriod?: ShareCardPeriod;
  initialPhotoUrl?: string | null;
}

export default function ShareableMuscleCardModal({
  isOpen,
  onClose,
  initialSession,
  initialPeriod = '7d',
  initialPhotoUrl = null,
}: ShareableMuscleCardModalProps) {
  const [sessions, setSessions] = useState<WorkoutSession[]>([]);
  const [isExporting, setIsExporting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [copiedCaption, setCopiedCaption] = useState(false);
  const [isGeneratingAICaption, setIsGeneratingAICaption] = useState(false);
  const [customAICaption, setCustomAICaption] = useState<string | null>(null);

  // Card Configuration State
  const [config, setConfig] = useState<ShareCardConfig>({
    template: 'split',
    format: 'instagram_portrait',
    theme: 'dark',
    period: initialSession ? 'session' : initialPeriod,
    mode: 'target',
    photoUrl: initialPhotoUrl,
    photoTransform: {
      zoom: 1.0,
      x: 0,
      y: 0,
      rotation: 0,
      fit: 'cover',
    },
    showStats: true,
    showRecovery: true,
    showDate: true,
    showLogo: true,
    showWatermark: true,
    mapView: 'both',
  });

  // Load completed workout sessions from IndexedDB
  useEffect(() => {
    if (!isOpen) return;

    db.sessions
      .getAll()
      .then(all => {
        const completed = all.filter(
          s => s.endedAt || s.duration > 0 || (s.exercises && s.exercises.length > 0)
        );
        setSessions(completed);
      })
      .catch(() => {});
  }, [isOpen]);

  // If initialSession changes, update config period
  useEffect(() => {
    if (initialSession) {
      setConfig(prev => ({ ...prev, period: 'session' }));
    }
  }, [initialSession]);

  // Aggregate training metrics
  const shareData = useMemo(() => {
    return aggregateShareableMuscleData(sessions, config.period, initialSession);
  }, [sessions, config.period, initialSession]);

  // Generated social caption
  const socialCaption = useMemo(() => {
    return generateSocialCaption(shareData);
  }, [shareData]);

  const activeCaption = customAICaption || socialCaption;

  const handleCopyCaption = useCallback(() => {
    navigator.clipboard?.writeText(activeCaption);
    triggerHaptic('light');
    setCopiedCaption(true);
    setTimeout(() => setCopiedCaption(false), 2000);
  }, [activeCaption]);

  const handleGenerateAICaption = async () => {
    setIsGeneratingAICaption(true);
    triggerHaptic('medium');
    try {
      const caption = await generateAICaption({
        periodLabel: shareData.periodLabel,
        totalWorkouts: shareData.totalWorkouts,
        totalSets: shareData.totalSets,
        totalVolumeKg: shareData.totalVolumeKg,
        prsCount: shareData.prs.length,
        topMuscles: shareData.topMuscles.slice(0, 3).map(m => m.name),
        prNames: shareData.prs.map(p => p.exerciseName),
      });
      setCustomAICaption(caption);
      setStatusMessage('✨ AI Caption generated!');
      setTimeout(() => setStatusMessage(null), 3000);
    } catch {
      setStatusMessage('AI caption unavailable. Using standard caption.');
      setTimeout(() => setStatusMessage(null), 3000);
    } finally {
      setIsGeneratingAICaption(false);
    }
  };

  // Handle Save Image to device
  const handleSave = async () => {
    try {
      setIsExporting(true);
      triggerHaptic('medium');
      setStatusMessage('Generating high-resolution card…');

      const blob = await renderShareCardToBlob(config, shareData, 'image/png', 0.95);
      const filename = `MyFitAI_${config.period}_${Date.now()}.png`;

      saveImageToDevice(blob, filename);
      triggerHaptic('success');
      setStatusMessage('Saved to Photos / Downloads!');
      setTimeout(() => setStatusMessage(null), 3500);
    } catch (err) {
      setStatusMessage('Failed to generate image. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  // Handle Android Share Sheet
  const handleShare = async () => {
    try {
      setIsExporting(true);
      triggerHaptic('medium');
      setStatusMessage('Preparing image for sharing…');

      const blob = await renderShareCardToBlob(config, shareData, 'image/png', 0.95);
      const filename = `MyFitAI_Progress_${Date.now()}.png`;

      const result = await shareImageFile(
        blob,
        filename,
        `MyFitAI — ${shareData.periodLabel}`,
        activeCaption
      );

      if (result.success) {
        triggerHaptic('success');
        if (result.fallbackTriggered) {
          setStatusMessage('Downloaded to device (Share sheet unavailable)');
        } else {
          setStatusMessage('Shared successfully!');
        }
      } else if (result.error && result.error !== 'Share dismissed') {
        setStatusMessage(result.error);
      }
      setTimeout(() => setStatusMessage(null), 3500);
    } catch (err) {
      setStatusMessage('Failed to share card');
    } finally {
      setIsExporting(false);
    }
  };

  if (!isOpen) return null;

  const TEMPLATES: Array<{ id: ShareCardTemplate; label: string; icon: string }> = [
    { id: 'split', label: 'Split Dual', icon: 'view_column' },
    { id: 'hero_photo', label: 'Hero Photo', icon: 'photo_size_select_actual' },
    { id: 'anatomical_focus', label: 'Anatomy Focus', icon: 'accessibility_new' },
    { id: 'progress_compare', label: 'Compare (B/A)', icon: 'compare' },
    { id: 'minimal', label: 'Minimal', icon: 'crop_square' },
    { id: 'heatmap_only', label: 'Heatmap Only', icon: 'local_fire_department' },
  ];

  const PERIODS: Array<{ id: ShareCardPeriod; label: string }> = [
    ...(initialSession ? [{ id: 'session' as ShareCardPeriod, label: 'Session' }] : []),
    { id: '7d', label: '7 Days' },
    { id: '14d', label: '14 Days' },
    { id: '30d', label: '30 Days' },
    { id: 'this_month', label: 'This Month' },
    { id: 'all', label: 'All-Time' },
  ];

  const MODES: Array<{ id: HeatmapMode; label: string }> = [
    { id: 'target', label: 'Training Load' },
    { id: 'fatigue', label: 'Recovery %' },
    { id: 'volume', label: 'Volume Sets' },
  ];

  const FORMATS: Array<{ id: ShareCardFormat; label: string; ratio: string }> = [
    { id: 'instagram_portrait', label: 'Portrait', ratio: '4:5' },
    { id: 'instagram_square', label: 'Square', ratio: '1:1' },
    { id: 'instagram_story', label: 'Story', ratio: '9:16' },
  ];

  const THEMES: Array<{ id: ShareCardTheme; label: string; dotColor: string }> = [
    { id: 'dark', label: 'Onyx', dotColor: 'bg-zinc-800' },
    { id: 'light', label: 'Studio', dotColor: 'bg-zinc-200' },
    { id: 'cyber', label: 'Cyber', dotColor: 'bg-emerald-500' },
    { id: 'stealth', label: 'Stealth', dotColor: 'bg-orange-500' },
  ];

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[120] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
      onClick={e => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-[var(--color-surface-container-lowest)] rounded-t-3xl sm:rounded-3xl w-full max-w-xl max-h-[92vh] flex flex-col border border-white/[0.08] shadow-2xl overflow-hidden animate-slide-up">
        {/* ── Modal Header ── */}
        <div className="p-4 sm:p-5 bg-[var(--color-surface-container)] border-b border-white/[0.04] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
              <span className="material-symbols-outlined text-[18px]">share</span>
            </div>
            <div>
              <h2 className="font-headline font-bold text-base text-on-surface">
                Share Muscle Progress
              </h2>
              <p className="text-[11px] text-on-surface-variant font-medium">
                High-Resolution Social Card · {shareData.periodLabel}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/[0.06] text-on-surface-variant hover:text-on-surface flex items-center justify-center transition-colors"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {/* ── Modal Scrollable Body ── */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-5">
          {/* Live Card Preview Box */}
          <div className="bg-black/40 rounded-3xl p-4 border border-white/[0.04] flex items-center justify-center">
            <ShareCardPreview config={config} data={shareData} />
          </div>

          {/* Status / Feedback message */}
          {statusMessage && (
            <div className="p-3 rounded-2xl bg-primary/10 border border-primary/30 text-xs font-semibold text-primary flex items-center justify-between animate-in fade-in">
              <span className="flex items-center gap-2">
                <span className="material-symbols-outlined text-sm">info</span>
                {statusMessage}
              </span>
            </div>
          )}

          {/* Template Selector */}
          <div>
            <span className="text-[11px] font-bold text-on-surface-variant uppercase tracking-wider block mb-2">
              Card Template
            </span>
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5">
              {TEMPLATES.map(t => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => {
                    triggerHaptic('light');
                    setConfig(prev => ({ ...prev, template: t.id }));
                  }}
                  className={`p-2 rounded-xl border text-center flex flex-col items-center gap-1 transition-all ${
                    config.template === t.id
                      ? 'bg-primary/10 border-primary text-primary font-bold'
                      : 'bg-[var(--color-surface-container)] border-white/[0.04] text-on-surface-variant hover:text-on-surface'
                  }`}
                >
                  <span className="material-symbols-outlined text-lg">{t.icon}</span>
                  <span className="text-[10px] truncate w-full">{t.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Photo Crop / Transform Editor */}
          {config.template !== 'heatmap_only' && (
            <div className="space-y-3">
              {config.template === 'progress_compare' ? (
                <div className="space-y-3">
                  <div className="p-3 rounded-2xl bg-[var(--color-surface-container)] border border-white/[0.04]">
                    <span className="text-[11px] font-bold text-on-surface uppercase tracking-wider block mb-2 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-white/60" />
                      1. Before Photo (Baseline)
                    </span>
                    <PhotoCropEditor
                      photoUrl={config.secondaryPhotoUrl || null}
                      transform={config.secondaryPhotoTransform || config.photoTransform}
                      onChangePhoto={url => setConfig(prev => ({ ...prev, secondaryPhotoUrl: url }))}
                      onChangeTransform={transform =>
                        setConfig(prev => ({ ...prev, secondaryPhotoTransform: transform }))
                      }
                    />
                  </div>

                  <div className="p-3 rounded-2xl bg-[var(--color-surface-container)] border border-primary/20">
                    <span className="text-[11px] font-bold text-primary uppercase tracking-wider block mb-2 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-primary" />
                      2. After Photo (Current)
                    </span>
                    <PhotoCropEditor
                      photoUrl={config.photoUrl}
                      transform={config.photoTransform}
                      onChangePhoto={url => setConfig(prev => ({ ...prev, photoUrl: url }))}
                      onChangeTransform={transform =>
                        setConfig(prev => ({ ...prev, photoTransform: transform }))
                      }
                    />
                  </div>
                </div>
              ) : (
                <PhotoCropEditor
                  photoUrl={config.photoUrl}
                  transform={config.photoTransform}
                  onChangePhoto={url => setConfig(prev => ({ ...prev, photoUrl: url }))}
                  onChangeTransform={transform =>
                    setConfig(prev => ({ ...prev, photoTransform: transform }))
                  }
                />
              )}
            </div>
          )}

          {/* Timeframe & Mode Controls */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Period */}
            <div>
              <span className="text-[11px] font-bold text-on-surface-variant uppercase tracking-wider block mb-1.5">
                Training Period
              </span>
              <div className="flex bg-[var(--color-surface-container)] p-1 rounded-xl border border-white/[0.04] flex-wrap gap-1">
                {PERIODS.map(p => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => {
                      triggerHaptic('light');
                      setConfig(prev => ({ ...prev, period: p.id }));
                    }}
                    className={`flex-1 py-1 px-2 rounded-lg text-[10px] font-mono font-bold transition-all ${
                      config.period === p.id
                        ? 'bg-primary text-black font-bold shadow-sm'
                        : 'text-on-surface-variant hover:text-on-surface'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Heatmap Mode */}
            <div>
              <span className="text-[11px] font-bold text-on-surface-variant uppercase tracking-wider block mb-1.5">
                Heatmap Metric
              </span>
              <div className="flex bg-[var(--color-surface-container)] p-1 rounded-xl border border-white/[0.04] gap-1">
                {MODES.map(m => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => {
                      triggerHaptic('light');
                      setConfig(prev => ({ ...prev, mode: m.id }));
                    }}
                    className={`flex-1 py-1 px-2 rounded-lg text-[10px] font-bold transition-all truncate ${
                      config.mode === m.id
                        ? 'bg-surface-container-highest text-primary font-bold shadow-sm'
                        : 'text-on-surface-variant hover:text-on-surface'
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Format & Theme Controls */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Format Ratio */}
            <div>
              <span className="text-[11px] font-bold text-on-surface-variant uppercase tracking-wider block mb-1.5">
                Export Format
              </span>
              <div className="flex bg-[var(--color-surface-container)] p-1 rounded-xl border border-white/[0.04] gap-1">
                {FORMATS.map(f => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => {
                      triggerHaptic('light');
                      setConfig(prev => ({ ...prev, format: f.id }));
                    }}
                    className={`flex-1 py-1 px-1.5 rounded-lg text-[10px] font-bold transition-all ${
                      config.format === f.id
                        ? 'bg-surface-container-highest text-primary font-bold shadow-sm'
                        : 'text-on-surface-variant hover:text-on-surface'
                    }`}
                  >
                    {f.label} ({f.ratio})
                  </button>
                ))}
              </div>
            </div>

            {/* Theme */}
            <div>
              <span className="text-[11px] font-bold text-on-surface-variant uppercase tracking-wider block mb-1.5">
                Visual Theme
              </span>
              <div className="flex bg-[var(--color-surface-container)] p-1 rounded-xl border border-white/[0.04] gap-1">
                {THEMES.map(th => (
                  <button
                    key={th.id}
                    type="button"
                    onClick={() => {
                      triggerHaptic('light');
                      setConfig(prev => ({ ...prev, theme: th.id }));
                    }}
                    className={`flex-1 py-1 px-1 rounded-lg text-[10px] font-bold flex items-center justify-center gap-1 transition-all ${
                      config.theme === th.id
                        ? 'bg-surface-container-highest text-primary font-bold shadow-sm'
                        : 'text-on-surface-variant hover:text-on-surface'
                    }`}
                  >
                    <span className={`w-2 h-2 rounded-full ${th.dotColor}`} />
                    {th.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Visibility Toggles */}
          <div className="flex flex-wrap gap-2 pt-1">
            <button
              type="button"
              onClick={() => setConfig(prev => ({ ...prev, showStats: !prev.showStats }))}
              className={`px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-all ${
                config.showStats
                  ? 'bg-primary/10 border-primary/40 text-primary'
                  : 'bg-white/[0.04] border-white/[0.06] text-on-surface-variant'
              }`}
            >
              <span className="material-symbols-outlined text-[14px]">
                {config.showStats ? 'check_box' : 'check_box_outline_blank'}
              </span>
              Statistics Grid
            </button>

            <button
              type="button"
              onClick={() => setConfig(prev => ({ ...prev, showDate: !prev.showDate }))}
              className={`px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-all ${
                config.showDate
                  ? 'bg-primary/10 border-primary/40 text-primary'
                  : 'bg-white/[0.04] border-white/[0.06] text-on-surface-variant'
              }`}
            >
              <span className="material-symbols-outlined text-[14px]">
                {config.showDate ? 'check_box' : 'check_box_outline_blank'}
              </span>
              Date Range
            </button>

            <button
              type="button"
              onClick={() => setConfig(prev => ({ ...prev, showWatermark: !prev.showWatermark }))}
              className={`px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-all ${
                config.showWatermark
                  ? 'bg-primary/10 border-primary/40 text-primary'
                  : 'bg-white/[0.04] border-white/[0.06] text-on-surface-variant'
              }`}
            >
              <span className="material-symbols-outlined text-[14px]">
                {config.showWatermark ? 'check_box' : 'check_box_outline_blank'}
              </span>
              Watermark
            </button>
          </div>

          {/* Social Media Caption Generator */}
          <div className="p-3.5 rounded-2xl bg-[var(--color-surface-container)] border border-white/[0.06] space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-on-surface-variant flex items-center gap-1.5 uppercase tracking-wider">
                <span className="material-symbols-outlined text-primary text-sm">chat</span>
                Social Caption
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  disabled={isGeneratingAICaption}
                  onClick={handleGenerateAICaption}
                  className="px-2.5 py-1 rounded-lg bg-primary/10 hover:bg-primary/20 text-xs font-semibold text-primary border border-primary/20 flex items-center gap-1 active:scale-95 transition-all disabled:opacity-50"
                >
                  <span className="material-symbols-outlined text-sm">
                    {isGeneratingAICaption ? 'sync' : 'auto_awesome'}
                  </span>
                  {isGeneratingAICaption ? 'Generating…' : 'AI Caption'}
                </button>
                <button
                  type="button"
                  onClick={handleCopyCaption}
                  className="px-2.5 py-1 rounded-lg bg-white/[0.06] hover:bg-white/[0.1] text-xs font-semibold text-on-surface flex items-center gap-1 active:scale-95 transition-all"
                >
                  <span className="material-symbols-outlined text-sm">
                    {copiedCaption ? 'check' : 'content_copy'}
                  </span>
                  {copiedCaption ? 'Copied!' : 'Copy'}
                </button>
              </div>
            </div>
            <p className="text-xs text-on-surface font-mono whitespace-pre-line leading-relaxed bg-black/30 p-2.5 rounded-xl border border-white/[0.04]">
              {activeCaption}
            </p>
          </div>
        </div>

        {/* ── Modal Sticky Footer Actions ── */}
        <div className="p-4 sm:p-5 bg-[var(--color-surface-container)] border-t border-white/[0.04] flex items-center gap-3">
          <button
            type="button"
            disabled={isExporting}
            onClick={handleSave}
            className="flex-1 py-3 px-4 rounded-2xl bg-white/[0.08] hover:bg-white/[0.12] text-on-surface font-bold text-sm uppercase tracking-wider flex items-center justify-center gap-2 active:scale-95 transition-all border border-white/[0.08] disabled:opacity-50"
          >
            <span className="material-symbols-outlined text-lg">download</span>
            {isExporting ? 'Generating…' : 'Save Image'}
          </button>

          <button
            type="button"
            disabled={isExporting}
            onClick={handleShare}
            className="flex-1 py-3 px-4 rounded-2xl bg-primary text-on-primary font-bold text-sm uppercase tracking-wider flex items-center justify-center gap-2 active:scale-95 transition-all shadow-lg disabled:opacity-50"
          >
            <span className="material-symbols-outlined text-lg">share</span>
            {isExporting ? 'Preparing…' : 'Share Progress'}
          </button>
        </div>
      </div>
    </div>
  );
}
