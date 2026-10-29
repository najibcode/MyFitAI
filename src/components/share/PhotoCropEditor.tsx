// ─────────────────────────────────────────────────────────────
// MyFitAI — Photo Crop & Transform Editor
// Simple, high-utility controls for user physique photo adjustment:
// zoom (1x-3x), pan offsets, rotation (0-270°), and fit modes.
// ─────────────────────────────────────────────────────────────

import { useRef } from 'react';
import type { PhotoTransform } from '../../types/shareCard';
import { fileToDataUrl } from '../../services/progressPhotoService';
import { Camera, Upload, Trash2, RotateCw, Maximize } from 'lucide-react';

interface PhotoCropEditorProps {
  photoUrl: string | null;
  transform: PhotoTransform;
  onChangePhoto: (url: string | null) => void;
  onChangeTransform: (transform: PhotoTransform) => void;
}

export default function PhotoCropEditor({
  photoUrl,
  transform,
  onChangePhoto,
  onChangeTransform,
}: PhotoCropEditorProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const dataUrl = await fileToDataUrl(file);
      onChangePhoto(dataUrl);
      // Reset transform on new photo
      onChangeTransform({
        zoom: 1.0,
        x: 0,
        y: 0,
        rotation: 0,
        fit: 'cover',
      });
    } catch {
      // Failed to load
    }
  };

  const handleRotate = () => {
    const nextRot = (transform.rotation + 90) % 360;
    onChangeTransform({ ...transform, rotation: nextRot });
  };

  const handleToggleFit = () => {
    const nextFit = transform.fit === 'cover' ? 'contain' : 'cover';
    onChangeTransform({ ...transform, fit: nextFit });
  };

  return (
    <div className="bg-[var(--color-surface-container)] rounded-2xl p-4 border border-white/[0.06] space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-on-surface flex items-center gap-1.5 uppercase tracking-wider">
          <Camera className="w-4 h-4 text-primary" />
          Physique Photo
        </span>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileSelected}
        />

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="px-3 py-1 rounded-xl bg-primary text-black text-xs font-bold flex items-center gap-1.5 active:scale-95 transition-all shadow-sm"
          >
            <Upload className="w-3.5 h-3.5" />
            {photoUrl ? 'Replace' : 'Upload'}
          </button>

          {photoUrl && (
            <button
              type="button"
              onClick={() => onChangePhoto(null)}
              className="p-1.5 rounded-xl bg-white/[0.06] text-rose-400 hover:bg-rose-500/10 active:scale-95 transition-all"
              title="Remove photo (Heatmap only)"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {photoUrl && (
        <div className="pt-2 border-t border-white/[0.04] space-y-3">
          {/* Zoom Slider */}
          <div>
            <div className="flex justify-between text-[11px] text-on-surface-variant font-mono mb-1">
              <span>Zoom</span>
              <span>{transform.zoom.toFixed(1)}x</span>
            </div>
            <input
              type="range"
              min="1"
              max="3"
              step="0.1"
              value={transform.zoom}
              onChange={e =>
                onChangeTransform({ ...transform, zoom: parseFloat(e.target.value) })
              }
              className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-primary"
            />
          </div>

          {/* Quick Transform Buttons */}
          <div className="flex items-center gap-2 pt-1">
            <button
              type="button"
              onClick={handleRotate}
              className="flex-1 py-1.5 px-2.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.08] text-xs font-semibold text-on-surface flex items-center justify-center gap-1.5 border border-white/[0.06] active:scale-95 transition-all"
            >
              <RotateCw className="w-3.5 h-3.5" />
              Rotate ({transform.rotation}°)
            </button>

            <button
              type="button"
              onClick={handleToggleFit}
              className="flex-1 py-1.5 px-2.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.08] text-xs font-semibold text-on-surface flex items-center justify-center gap-1.5 border border-white/[0.06] active:scale-95 transition-all capitalize"
            >
              <Maximize className="w-3.5 h-3.5" />
              Fit: {transform.fit}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
