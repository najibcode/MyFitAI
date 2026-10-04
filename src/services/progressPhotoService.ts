// ─────────────────────────────────────────────────────────────
// MyFitAI — Progress Photo Service
// Manages user progress & physique photos locally on the device.
// 100% offline, privacy-first: photos are never uploaded to the cloud
// without explicit user consent.
// ─────────────────────────────────────────────────────────────

import type { ProgressPhotoEntry } from '../types/shareCard';

const PHOTO_STORAGE_KEY = 'myfitai_local_progress_photos';
const MAX_LOCAL_PHOTOS = 30;

/**
 * Loads all saved progress photos from local storage
 */
export async function getProgressPhotos(): Promise<ProgressPhotoEntry[]> {
  try {
    const raw = localStorage.getItem(PHOTO_STORAGE_KEY);
    if (!raw) return [];
    const list: ProgressPhotoEntry[] = JSON.parse(raw);
    return list.sort((a, b) => b.createdAt - a.createdAt);
  } catch {
    return [];
  }
}

/**
 * Saves a new progress photo locally
 */
export async function saveProgressPhoto(
  dataUrl: string,
  metadata?: {
    weightKg?: number;
    tag?: 'front' | 'back' | 'side' | 'progress';
    notes?: string;
    date?: string;
  }
): Promise<ProgressPhotoEntry> {
  const existing = await getProgressPhotos();

  const newEntry: ProgressPhotoEntry = {
    id: `photo_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
    dataUrl,
    date: metadata?.date || new Date().toISOString(),
    weightKg: metadata?.weightKg,
    tag: metadata?.tag || 'progress',
    notes: metadata?.notes,
    createdAt: Date.now(),
  };

  const updated = [newEntry, ...existing].slice(0, MAX_LOCAL_PHOTOS);

  try {
    localStorage.setItem(PHOTO_STORAGE_KEY, JSON.stringify(updated));
  } catch (err) {
    // If quota exceeded, purge oldest items and retry
    if (updated.length > 5) {
      const reduced = updated.slice(0, Math.floor(updated.length / 2));
      try {
        localStorage.setItem(PHOTO_STORAGE_KEY, JSON.stringify(reduced));
      } catch {
        // Quota still full
      }
    }
  }

  return newEntry;
}

/**
 * Deletes a progress photo by ID
 */
export async function deleteProgressPhoto(id: string): Promise<void> {
  const existing = await getProgressPhotos();
  const filtered = existing.filter(p => p.id !== id);
  try {
    localStorage.setItem(PHOTO_STORAGE_KEY, JSON.stringify(filtered));
  } catch {
    // Silent fallback
  }
}

/**
 * Helper to convert an image File or Blob to a compressed base64 data URL
 */
export function fileToDataUrl(file: File | Blob, maxWidth = 1600): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Failed to read photo file'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Failed to load image element'));
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(reader.result as string);
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.88));
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}
