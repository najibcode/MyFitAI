// ─────────────────────────────────────────────────────────────
// MyFitAI — Share Card Live Responsive Preview
// Renders live high-fidelity SVG anatomical models, user photo,
// training metrics, and MyFitAI branding matching the Canvas output.
// ─────────────────────────────────────────────────────────────

import { useMemo } from 'react';
import type { ShareCardConfig, ShareableMuscleData } from '../../types/shareCard';
import { FRONT_MUSCLE_PATHS } from '../muscleMap/AnatomicalFrontBody';
import { BACK_MUSCLE_PATHS } from '../muscleMap/AnatomicalBackBody';

interface ShareCardPreviewProps {
  config: ShareCardConfig;
  data: ShareableMuscleData;
  className?: string;
}

export default function ShareCardPreview({
  config,
  data,
  className = '',
}: ShareCardPreviewProps) {
  const isDark = config.theme !== 'light';

  // Aspect ratio class based on format
  const aspectClass = useMemo(() => {
    switch (config.format) {
      case 'instagram_square':
        return 'aspect-square';
      case 'instagram_story':
        return 'aspect-[9/16]';
      case 'instagram_portrait':
      case 'whatsapp':
      default:
        return 'aspect-[4/5]';
    }
  }, [config.format]);

  // Color theme classes
  const themeBg = useMemo(() => {
    if (config.theme === 'light') return 'bg-slate-50 text-slate-900 border-slate-200';
    if (config.theme === 'cyber') return 'bg-[#030712] text-white border-emerald-500/20';
    if (config.theme === 'stealth') return 'bg-[#121214] text-white border-zinc-700/30';
    return 'bg-[#09090B] text-white border-white/[0.08]'; // dark
  }, [config.theme]);

  // Helper for muscle fill color
  const getFill = (muscleId: string) => {
    const metric = data.metrics[muscleId];
    if (config.mode === 'fatigue') {
      if (!metric || (metric.recoveryPercentage === 100 && metric.hoursSinceLastTrained === null)) {
        return isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)';
      }
      const rec = metric.recoveryPercentage;
      if (rec >= 90) return '#10B981';
      if (rec >= 55) return '#F59E0B';
      return '#EF4444';
    }

    if (config.mode === 'volume') {
      const sets = metric?.effectiveSets || 0;
      if (sets === 0) return isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)';
      if (sets < 6) return '#38BDF8';
      if (sets <= 14) return '#10B981';
      if (sets <= 20) return '#F59E0B';
      return '#EF4444';
    }

    // Target load
    if (!metric || (!metric.targetRole && metric.effectiveSets === 0)) {
      return isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.06)';
    }
    if (metric.targetRole === 'primary' || metric.effectiveSets >= 8) {
      return '#FF7A00';
    }
    return '#0284C7';
  };

  return (
    <div
      className={`relative w-full max-w-sm mx-auto rounded-3xl overflow-hidden shadow-2xl border flex flex-col justify-between p-5 select-none transition-all ${aspectClass} ${themeBg} ${className}`}
    >
      {/* ── Top Header ── */}
      <div className="flex items-center justify-between z-10">
        {config.showLogo && (
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-primary flex items-center justify-center shadow-sm">
              <span className="material-symbols-outlined text-black text-[16px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                fitness_center
              </span>
            </div>
            <div>
              <span className="font-headline font-black text-sm tracking-tight block leading-none">
                MyFitAI
              </span>
              <span className="text-[8px] font-mono tracking-widest text-on-surface-variant font-bold uppercase">
                {data.periodLabel}
              </span>
            </div>
          </div>
        )}

        {config.showDate && (
          <span className="text-[9px] font-mono font-bold text-on-surface-variant/80">
            {data.dateRangeFormatted}
          </span>
        )}
      </div>

      {/* ── Main Content Body ── */}
      <div className="flex-1 flex flex-col justify-center my-3 relative overflow-hidden">
        {/* TEMPLATE B: SPLIT 50/50 */}
        {config.template === 'split' && (
          <div className="grid grid-cols-2 gap-3 h-full items-center">
            {/* Left: Photo */}
            <div className="h-full rounded-2xl overflow-hidden bg-white/[0.04] border border-white/[0.08] relative flex items-center justify-center">
              {config.photoUrl ? (
                <img
                  src={config.photoUrl}
                  alt="Physique Progress"
                  className={`w-full h-full ${
                    config.photoTransform.fit === 'contain' ? 'object-contain' : 'object-cover'
                  }`}
                  style={{
                    transform: `scale(${config.photoTransform.zoom}) translate(${config.photoTransform.x}%, ${config.photoTransform.y}%) rotate(${config.photoTransform.rotation}deg)`,
                  }}
                />
              ) : (
                <div className="text-center p-3 text-on-surface-variant/60">
                  <span className="material-symbols-outlined text-3xl mb-1 block">accessibility_new</span>
                  <span className="text-[10px] uppercase font-bold tracking-wider">Physique Photo</span>
                </div>
              )}
            </div>

            {/* Right: Dual Anatomical Maps + Muscle Load Bars */}
            <div className="flex flex-col justify-between h-full py-1">
              <div className="grid grid-cols-2 gap-1 h-[60%]">
                <svg viewBox="0 0 200 360" className="w-full h-full drop-shadow-sm">
                  {FRONT_MUSCLE_PATHS.map((p, idx) => (
                    <path
                      key={`f-${idx}`}
                      d={p.d}
                      fill={getFill(p.id)}
                      stroke={isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}
                      strokeWidth="0.8"
                    />
                  ))}
                </svg>
                <svg viewBox="0 0 200 360" className="w-full h-full drop-shadow-sm">
                  {BACK_MUSCLE_PATHS.map((p, idx) => (
                    <path
                      key={`b-${idx}`}
                      d={p.d}
                      fill={getFill(p.id)}
                      stroke={isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}
                      strokeWidth="0.8"
                    />
                  ))}
                </svg>
              </div>

              {/* Muscle Bars */}
              <div className="space-y-1 mt-2">
                {data.topMuscles.slice(0, 3).map(m => (
                  <div key={m.id} className="text-[9px]">
                    <div className="flex justify-between font-bold mb-0.5">
                      <span className="truncate">{m.name}</span>
                      <span style={{ color: m.fillColor }}>{m.sets}s</span>
                    </div>
                    <div className="h-1 bg-white/[0.08] rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{
                          backgroundColor: m.fillColor,
                          width: `${Math.min(100, (m.sets / 16) * 100)}%`,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TEMPLATE A: HERO PHOTO + INSET */}
        {config.template === 'hero_photo' && (
          <div className="flex flex-col h-full gap-2.5">
            <div className="h-[55%] rounded-2xl overflow-hidden bg-white/[0.04] border border-white/[0.08] relative">
              {config.photoUrl ? (
                <img
                  src={config.photoUrl}
                  alt="Physique Progress"
                  className={`w-full h-full ${
                    config.photoTransform.fit === 'contain' ? 'object-contain' : 'object-cover'
                  }`}
                  style={{
                    transform: `scale(${config.photoTransform.zoom}) translate(${config.photoTransform.x}%, ${config.photoTransform.y}%) rotate(${config.photoTransform.rotation}deg)`,
                  }}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-on-surface-variant/50 text-xs font-bold uppercase tracking-wider">
                  Progress Photo
                </div>
              )}
            </div>

            <div className="flex-1 grid grid-cols-2 gap-2 items-center">
              <div className="flex items-center justify-center gap-1 h-full">
                <svg viewBox="0 0 200 360" className="h-28 w-auto">
                  {FRONT_MUSCLE_PATHS.map((p, idx) => (
                    <path key={`hf-${idx}`} d={p.d} fill={getFill(p.id)} strokeWidth="0.8" stroke="rgba(255,255,255,0.1)" />
                  ))}
                </svg>
                <svg viewBox="0 0 200 360" className="h-28 w-auto">
                  {BACK_MUSCLE_PATHS.map((p, idx) => (
                    <path key={`hb-${idx}`} d={p.d} fill={getFill(p.id)} strokeWidth="0.8" stroke="rgba(255,255,255,0.1)" />
                  ))}
                </svg>
              </div>

              <div className="space-y-1.5">
                {data.topMuscles.slice(0, 3).map(m => (
                  <div key={m.id} className="text-[9px]">
                    <div className="flex justify-between font-bold mb-0.5">
                      <span className="truncate">{m.name}</span>
                      <span style={{ color: m.fillColor }}>{m.sets}s</span>
                    </div>
                    <div className="h-1 bg-white/[0.08] rounded-full overflow-hidden">
                      <div className="h-full rounded-full" style={{ backgroundColor: m.fillColor, width: `${Math.min(100, (m.sets / 16) * 100)}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TEMPLATE C: ANATOMICAL FOCUS */}
        {config.template === 'anatomical_focus' && (
          <div className="flex flex-col h-full justify-between items-center relative">
            <div className="flex items-center justify-center gap-3 w-full h-[62%] relative">
              <svg viewBox="0 0 200 360" className="h-full w-auto">
                {FRONT_MUSCLE_PATHS.map((p, idx) => (
                  <path key={`af-${idx}`} d={p.d} fill={getFill(p.id)} strokeWidth="0.8" stroke="rgba(255,255,255,0.1)" />
                ))}
              </svg>
              <svg viewBox="0 0 200 360" className="h-full w-auto">
                {BACK_MUSCLE_PATHS.map((p, idx) => (
                  <path key={`ab-${idx}`} d={p.d} fill={getFill(p.id)} strokeWidth="0.8" stroke="rgba(255,255,255,0.1)" />
                ))}
              </svg>

              {config.photoUrl && (
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 rounded-full overflow-hidden border-2 border-primary shadow-xl">
                  <img src={config.photoUrl} alt="User" className="w-full h-full object-cover" />
                </div>
              )}
            </div>

            <div className="w-full grid grid-cols-2 gap-2 mt-2">
              {data.topMuscles.slice(0, 4).map(m => (
                <div key={m.id} className="text-[9px] bg-white/[0.04] p-1.5 rounded-lg border border-white/[0.04]">
                  <div className="flex justify-between font-bold">
                    <span className="truncate">{m.name}</span>
                    <span style={{ color: m.fillColor }}>{m.sets} sets</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TEMPLATE D: PROGRESS COMPARE (BEFORE & AFTER) */}
        {config.template === 'progress_compare' && (
          <div className="flex flex-col h-full justify-between">
            {/* Top row: Before & After photos */}
            <div className="grid grid-cols-2 gap-2 h-[48%]">
              {/* Before Photo */}
              <div className="relative rounded-xl overflow-hidden bg-white/[0.04] border border-white/[0.08] flex items-center justify-center">
                {config.secondaryPhotoUrl ? (
                  <img
                    src={config.secondaryPhotoUrl}
                    alt="Before"
                    className="w-full h-full object-cover"
                    style={{
                      transform: `scale(${config.secondaryPhotoTransform?.zoom || 1}) translate(${config.secondaryPhotoTransform?.x || 0}%, ${config.secondaryPhotoTransform?.y || 0}%) rotate(${config.secondaryPhotoTransform?.rotation || 0}deg)`,
                    }}
                  />
                ) : (
                  <div className="text-[10px] text-on-surface-variant font-bold uppercase tracking-wider text-center p-2">
                    Before Photo
                  </div>
                )}
                <div className="absolute top-1.5 left-1.5 px-2 py-0.5 rounded bg-black/80 text-[8px] font-black text-white uppercase tracking-wider">
                  Before
                </div>
              </div>

              {/* After Photo */}
              <div className="relative rounded-xl overflow-hidden bg-white/[0.04] border border-primary/30 flex items-center justify-center">
                {config.photoUrl ? (
                  <img
                    src={config.photoUrl}
                    alt="After"
                    className="w-full h-full object-cover"
                    style={{
                      transform: `scale(${config.photoTransform.zoom}) translate(${config.photoTransform.x}%, ${config.photoTransform.y}%) rotate(${config.photoTransform.rotation}deg)`,
                    }}
                  />
                ) : (
                  <div className="text-[10px] text-on-surface-variant font-bold uppercase tracking-wider text-center p-2">
                    After Photo
                  </div>
                )}
                <div className="absolute top-1.5 left-1.5 px-2 py-0.5 rounded bg-primary text-[8px] font-black text-black uppercase tracking-wider">
                  After
                </div>
              </div>
            </div>

            {/* Bottom row: Anatomical Maps + Muscle bars */}
            <div className="flex-1 grid grid-cols-2 gap-2 items-center mt-2">
              <div className="flex items-center justify-center gap-1 h-full">
                <svg viewBox="0 0 200 360" className="h-24 w-auto">
                  {FRONT_MUSCLE_PATHS.map((p, idx) => (
                    <path key={`pcf-${idx}`} d={p.d} fill={getFill(p.id)} strokeWidth="0.8" stroke="rgba(255,255,255,0.1)" />
                  ))}
                </svg>
                <svg viewBox="0 0 200 360" className="h-24 w-auto">
                  {BACK_MUSCLE_PATHS.map((p, idx) => (
                    <path key={`pcb-${idx}`} d={p.d} fill={getFill(p.id)} strokeWidth="0.8" stroke="rgba(255,255,255,0.1)" />
                  ))}
                </svg>
              </div>

              <div className="space-y-1">
                {data.topMuscles.slice(0, 3).map(m => (
                  <div key={m.id} className="text-[8px]">
                    <div className="flex justify-between font-bold mb-0.5">
                      <span className="truncate">{m.name}</span>
                      <span style={{ color: m.fillColor }}>{m.sets}s</span>
                    </div>
                    <div className="h-1 bg-white/[0.08] rounded-full overflow-hidden">
                      <div className="h-full rounded-full" style={{ backgroundColor: m.fillColor, width: `${Math.min(100, (m.sets / 16) * 100)}%` }} />
                    </div>
                  </div>
                ))}

                {/* Training balance indicator */}
                <div className="pt-1">
                  <div className="flex justify-between text-[7px] font-bold text-on-surface-variant mb-0.5">
                    <span className="text-[#FF7A00]">Push</span>
                    <span className="text-[#0284C7]">Pull</span>
                    <span className="text-[#10B981]">Legs</span>
                  </div>
                  <div className="h-1 bg-white/[0.08] rounded-full flex overflow-hidden">
                    <div style={{ width: `${data.balance.pushSets ? 40 : 33}%` }} className="bg-[#FF7A00] h-full" />
                    <div style={{ width: `${data.balance.pullSets ? 35 : 33}%` }} className="bg-[#0284C7] h-full" />
                    <div style={{ width: `${data.balance.quadSets ? 25 : 34}%` }} className="bg-[#10B981] h-full" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TEMPLATE E: MINIMAL */}
        {config.template === 'minimal' && (
          <div className="relative h-full w-full rounded-2xl overflow-hidden border border-white/[0.08]">
            {config.photoUrl ? (
              <img
                src={config.photoUrl}
                alt="Physique"
                className="w-full h-full object-cover"
                style={{
                  transform: `scale(${config.photoTransform.zoom}) translate(${config.photoTransform.x}%, ${config.photoTransform.y}%)`,
                }}
              />
            ) : (
              <div className="w-full h-full bg-zinc-900 flex items-center justify-center text-zinc-600 font-bold uppercase text-xs">
                Physique Photo
              </div>
            )}

            {/* Corner Glassmorphic Map Inset */}
            <div className="absolute bottom-2 right-2 w-28 h-32 rounded-xl bg-black/80 backdrop-blur-md p-1.5 border border-white/20 flex items-center justify-center gap-0.5">
              <svg viewBox="0 0 200 360" className="h-full w-auto">
                {FRONT_MUSCLE_PATHS.map((p, idx) => (
                  <path key={`mf-${idx}`} d={p.d} fill={getFill(p.id)} strokeWidth="0.8" stroke="rgba(255,255,255,0.1)" />
                ))}
              </svg>
              <svg viewBox="0 0 200 360" className="h-full w-auto">
                {BACK_MUSCLE_PATHS.map((p, idx) => (
                  <path key={`mb-${idx}`} d={p.d} fill={getFill(p.id)} strokeWidth="0.8" stroke="rgba(255,255,255,0.1)" />
                ))}
              </svg>
            </div>
          </div>
        )}

        {/* TEMPLATE F: HEATMAP ONLY */}
        {config.template === 'heatmap_only' && (
          <div className="flex flex-col h-full justify-between items-center">
            <div className="flex items-center justify-center gap-4 w-full h-[66%]">
              <svg viewBox="0 0 200 360" className="h-full w-auto">
                {FRONT_MUSCLE_PATHS.map((p, idx) => (
                  <path key={`hof-${idx}`} d={p.d} fill={getFill(p.id)} strokeWidth="0.8" stroke="rgba(255,255,255,0.1)" />
                ))}
              </svg>
              <svg viewBox="0 0 200 360" className="h-full w-auto">
                {BACK_MUSCLE_PATHS.map((p, idx) => (
                  <path key={`hob-${idx}`} d={p.d} fill={getFill(p.id)} strokeWidth="0.8" stroke="rgba(255,255,255,0.1)" />
                ))}
              </svg>
            </div>

            <div className="w-full grid grid-cols-2 gap-2 mt-2">
              {data.topMuscles.slice(0, 4).map(m => (
                <div key={m.id} className="text-[9px] bg-white/[0.04] p-1.5 rounded-lg border border-white/[0.04]">
                  <div className="flex justify-between font-bold">
                    <span className="truncate">{m.name}</span>
                    <span style={{ color: m.fillColor }}>{m.sets} sets</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── Bottom Statistics Grid ── */}
      {config.showStats && (
        <div className="grid grid-cols-4 gap-1.5 p-2 rounded-xl bg-white/[0.04] border border-white/[0.06] text-center z-10">
          <div>
            <span className="text-[12px] font-black font-headline block leading-tight">
              {data.totalWorkouts}
            </span>
            <span className="text-[7px] text-on-surface-variant font-mono uppercase font-semibold">
              Workouts
            </span>
          </div>
          <div>
            <span className="text-[12px] font-black font-headline block leading-tight">
              {data.totalSets}
            </span>
            <span className="text-[7px] text-on-surface-variant font-mono uppercase font-semibold">
              Sets
            </span>
          </div>
          <div>
            <span className="text-[12px] font-black font-headline block leading-tight truncate">
              {data.totalVolumeKg.toLocaleString()}
            </span>
            <span className="text-[7px] text-on-surface-variant font-mono uppercase font-semibold">
              Kg Load
            </span>
          </div>
          <div>
            <span className="text-[12px] font-black font-headline block leading-tight text-primary">
              {data.prs.length > 0 ? `+${data.prs.length}` : `${data.topMuscles.length}`}
            </span>
            <span className="text-[7px] text-on-surface-variant font-mono uppercase font-semibold">
              {data.prs.length > 0 ? 'New PRs' : 'Muscles'}
            </span>
          </div>
        </div>
      )}

      {/* Watermark */}
      {config.showWatermark && (
        <div className="text-center text-[7px] font-mono tracking-widest text-on-surface-variant/40 uppercase mt-1">
          MYFITAI · TRAIN SMARTER
        </div>
      )}
    </div>
  );
}
