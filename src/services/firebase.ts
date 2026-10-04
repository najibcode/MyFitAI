import { initializeApp } from 'firebase/app';
import { getAnalytics } from 'firebase/analytics';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { getStorage } from 'firebase/storage';

// ── Build-time env validation ──────────────────────────────────────
// Firebase API keys are public by design (security is enforced by
// Firestore rules + App Check), but missing keys cause cryptic
// runtime crashes — especially on Android Capacitor webviews where
// the error is swallowed silently. Fail fast with a clear message.
const REQUIRED_ENV_KEYS = [
  'VITE_FIREBASE_API_KEY',
  'VITE_FIREBASE_AUTH_DOMAIN',
  'VITE_FIREBASE_PROJECT_ID',
  'VITE_FIREBASE_APP_ID',
] as const;

const missing = REQUIRED_ENV_KEYS.filter(k => !import.meta.env[k]);
if (missing.length > 0) {
  throw new Error(
    `[firebase] Missing required environment variable(s): ${missing.join(', ')}. ` +
    `Copy .env.example to .env and fill in your Firebase project values.`
  );
}

// Firebase config loaded from environment variables — never hardcode in source.
// These are public API keys (safe for client bundles), but kept in .env
// for environment separation (dev / staging / prod).
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY as string,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN as string,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID as string,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET as string,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID as string,
  appId: import.meta.env.VITE_FIREBASE_APP_ID as string,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID as string,
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const analytics = typeof window !== 'undefined' ? getAnalytics(app) : null;
export const db = getFirestore(app);
export const auth = getAuth(app);
export const storage = getStorage(app);

export default app;
