// ─────────────────────────────────────────────────────────────
// MyFitAI — Native Save & Android Share Service
// Invokes native Android Share Sheet (WhatsApp, Instagram, Telegram)
// or saves high-resolution image directly to local gallery/downloads.
// ─────────────────────────────────────────────────────────────

import type { ShareableMuscleData } from '../../types/shareCard';

/**
 * Generates an inspiring, data-driven social media caption
 */
export function generateSocialCaption(data: ShareableMuscleData): string {
  const parts: string[] = [];

  parts.push(`My training progress (${data.periodLabel.toLowerCase()}) 💪`);
  parts.push('');

  const statsLine = [
    data.totalWorkouts > 0 ? `${data.totalWorkouts} workouts` : '',
    data.totalSets > 0 ? `${data.totalSets} sets` : '',
    data.totalVolumeKg > 0 ? `${data.totalVolumeKg.toLocaleString()} kg volume` : '',
  ]
    .filter(Boolean)
    .join(' · ');

  if (statsLine) parts.push(statsLine);

  if (data.prs.length > 0) {
    parts.push(`🏆 ${data.prs.length} new PR${data.prs.length > 1 ? 's' : ''}! (${data.prs.slice(0, 2).map(p => p.exerciseName).join(', ')})`);
  }

  if (data.topMuscles.length > 0) {
    const focusMuscles = data.topMuscles.slice(0, 3).map(m => m.name).join(', ');
    parts.push(`Primary focus: ${focusMuscles}`);
  }

  parts.push('');
  parts.push('Tracked with #MyFitAI');

  return parts.join('\n');
}

/**
 * Saves a Blob directly to the device downloads / gallery
 */
export function saveImageToDevice(blob: Blob, filename = 'MyFitAI_Muscle_Progress.png'): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

/**
 * Triggers the native Android / OS share sheet via Web Share API
 */
export async function shareImageFile(
  blob: Blob,
  filename = 'MyFitAI_Muscle_Progress.png',
  title = 'My Muscle Training Progress',
  text?: string
): Promise<{ success: boolean; fallbackTriggered?: boolean; error?: string }> {
  try {
    const file = new File([blob], filename, { type: blob.type || 'image/png' });

    // Check if navigator.share and file sharing are supported
    if (
      typeof navigator !== 'undefined' &&
      navigator.share &&
      navigator.canShare &&
      navigator.canShare({ files: [file] })
    ) {
      await navigator.share({
        title,
        text: text || 'Tracked with MyFitAI',
        files: [file],
      });
      return { success: true };
    }

    // Fallback: save to device
    saveImageToDevice(blob, filename);
    return { success: true, fallbackTriggered: true };
  } catch (err) {
    const errorMsg = (err as Error)?.message || 'Share cancelled or unsupported';
    if ((err as Error)?.name === 'AbortError') {
      return { success: false, error: 'Share dismissed' };
    }

    // Try save to device on error
    try {
      saveImageToDevice(blob, filename);
      return { success: true, fallbackTriggered: true };
    } catch {
      return { success: false, error: errorMsg };
    }
  }
}

/**
 * Copies the image directly to the system clipboard
 */
export async function copyImageToClipboard(blob: Blob): Promise<boolean> {
  try {
    if (typeof navigator !== 'undefined' && navigator.clipboard && typeof ClipboardItem !== 'undefined') {
      const item = new ClipboardItem({ [blob.type || 'image/png']: blob });
      await navigator.clipboard.write([item]);
      return true;
    }
    return false;
  } catch {
    return false;
  }
}
