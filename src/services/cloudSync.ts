import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from './firebase';
import { auth } from './firebase';
import { storage } from '../utils/storage';

export interface CloudData {
  onboarding?: any;
  fitness?: any;
  gamification?: any;
  preferences?: any;
}

function withTimeout<T>(promise: Promise<T>, ms: number = 2500): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error(`Timeout of ${ms}ms exceeded`)), ms)),
  ]);
}

/**
 * Fetches the user's entire cloud profile.
 */
export async function getCloudProfile(): Promise<CloudData | null> {
  const user = auth.currentUser;
  if (!user) return null;

  try {
    const userDocRef = doc(db, 'users', user.uid);
    const snap = await withTimeout(getDoc(userDocRef), 2500);
    if (snap && snap.exists()) {
      return snap.data() as CloudData;
    }
  } catch (err) {
    console.warn('Cloud profile fetch skipped or timed out:', err);
  }
  return null;
}

/**
 * Syncs a specific section (e.g. 'onboarding', 'fitness') to the user's document.
 */
export async function syncToCloud(section: keyof CloudData, data: any) {
  const user = auth.currentUser;
  if (!user) return;

  try {
    const userDocRef = doc(db, 'users', user.uid);
    // Use setDoc with merge: true to avoid overwriting other sections
    await withTimeout(setDoc(userDocRef, { [section]: data }, { merge: true }), 2500);
  } catch (err) {
    console.warn(`Cloud sync for ${section} skipped or timed out:`, err);
  }
}

/**
 * Helper to clear local state completely on logout for the current user namespace.
 */
export function clearAllLocalState() {
  const keys = storage.keys();
  for (const key of keys) {
    storage.remove(key);
  }
}
