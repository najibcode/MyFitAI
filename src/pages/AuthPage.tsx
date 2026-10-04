import React, { useState } from 'react';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  sendPasswordResetEmail,
  signInAnonymously,
  type AuthError
} from 'firebase/auth';
import { auth } from '../services/firebase';
import { useAuth } from '../context/AuthContext';
import { storage } from '../utils/storage';

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        await createUserWithEmailAndPassword(auth, email, password);
      }
    } catch (err) {
      const firebaseError = err as AuthError;
      handleFirebaseError(firebaseError);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError(null);
    setLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (err) {
      const firebaseError = err as AuthError;
      if (firebaseError.code !== 'auth/popup-closed-by-user') {
        handleFirebaseError(firebaseError);
      }
    } finally {
      setLoading(false);
    }
  };

  const { loginAsGuest } = useAuth();

  const handleGuestSignIn = async () => {
    setError(null);
    setLoading(true);
    storage.set('myfitai_onboarded', true);
    try {
      await signInAnonymously(auth);
    } catch {
      // If Firebase anonymous authentication is disabled on backend, fall back seamlessly to local guest mode
      loginAsGuest();
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordReset = async () => {
    if (!email) {
      setError('Please enter your email address first.');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      await sendPasswordResetEmail(auth, email);
      setResetSent(true);
      setError(null);
    } catch (err) {
      const firebaseError = err as AuthError;
      handleFirebaseError(firebaseError);
    } finally {
      setLoading(false);
    }
  };

  const handleFirebaseError = (error: AuthError) => {
    switch (error.code) {
      case 'auth/invalid-email':
        setError('Invalid email address.');
        break;
      case 'auth/user-not-found':
      case 'auth/wrong-password':
      case 'auth/invalid-credential':
        setError('Invalid email or password.');
        break;
      case 'auth/email-already-in-use':
        setError('An account with this email already exists.');
        break;
      case 'auth/weak-password':
        setError('Password should be at least 6 characters.');
        break;
      default:
        setError('An unexpected error occurred. Please try again.');
        break;
    }
  };

  return (
    <div className="min-h-screen bg-[var(--color-bg)] flex flex-col justify-center px-6 relative overflow-hidden">
      {/* Dynamic Background Elements */}
      <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] bg-primary/[0.05] blur-[100px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[400px] h-[400px] bg-secondary/[0.05] blur-[80px] rounded-full pointer-events-none" />

      <div className="max-w-md w-full mx-auto relative z-10 py-10">
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-primary flex items-center justify-center mb-4 shadow-[0_0_40px_rgba(var(--color-primary-rgb),0.3)]">
            <span className="material-symbols-outlined text-black text-[32px]" style={{ fontVariationSettings: "'FILL' 1" }}>
              exercise
            </span>
          </div>
          <h1 className="text-3xl font-black text-on-surface font-headline tracking-tight">
            MyFitAI
          </h1>
          <p className="text-on-surface-variant mt-2 text-center">
            {isLogin ? 'Welcome back, let\'s crush those goals.' : 'Join the elite fitness community.'}
          </p>
        </div>

        <div className="bg-[var(--color-surface-container)] rounded-3xl p-6 shadow-xl border border-white/[0.02]">
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-4 rounded-2xl bg-error/10 border border-error/20 flex items-start gap-3">
                <span className="material-symbols-outlined text-error text-[20px] mt-0.5">error</span>
                <p className="text-sm text-error font-medium">{error}</p>
              </div>
            )}
            {resetSent && (
              <div className="p-4 rounded-2xl bg-primary/10 border border-primary/20 flex items-start gap-3">
                <span className="material-symbols-outlined text-primary text-[20px] mt-0.5">check_circle</span>
                <p className="text-sm text-primary font-medium">Password reset email sent! Check your inbox.</p>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-on-surface mb-1.5 ml-1">Email</label>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant text-[20px]">
                  mail
                </span>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-[var(--color-surface-container-highest)] border border-white/[0.05] rounded-2xl py-3.5 pl-12 pr-4 text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:border-primary/50 focus:bg-[var(--color-surface)] transition-all"
                  placeholder="you@example.com"
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-1.5 px-1">
                <label className="block text-sm font-medium text-on-surface">Password</label>
                {isLogin && (
                  <button 
                    type="button" 
                    onClick={handlePasswordReset}
                    className="text-xs text-primary font-medium hover:underline focus:outline-none"
                  >
                    Forgot Password?
                  </button>
                )}
              </div>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant text-[20px]">
                  lock
                </span>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-[var(--color-surface-container-highest)] border border-white/[0.05] rounded-2xl py-3.5 pl-12 pr-4 text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:border-primary/50 focus:bg-[var(--color-surface)] transition-all"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 bg-primary text-black font-bold py-4 rounded-2xl flex items-center justify-center gap-2 hover:bg-primary/90 active:scale-[0.98] transition-all disabled:opacity-70 disabled:active:scale-100"
            >
              {loading ? (
                <span className="material-symbols-outlined animate-spin text-[20px]">progress_activity</span>
              ) : (
                <>
                  <span>{isLogin ? 'Sign In' : 'Create Account'}</span>
                  <span className="material-symbols-outlined text-[20px]">arrow_forward</span>
                </>
              )}
            </button>
          </form>

          <div className="mt-6 flex items-center justify-between">
            <div className="h-px bg-white/10 flex-1"></div>
            <span className="px-4 text-xs text-on-surface-variant font-medium uppercase tracking-wider">Or continue with</span>
            <div className="h-px bg-white/10 flex-1"></div>
          </div>

          <div className="mt-6 flex gap-3">
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={loading}
              className="flex-1 bg-[var(--color-surface-container-highest)] border border-white/[0.05] py-3.5 rounded-2xl flex justify-center items-center gap-2 hover:bg-white/[0.08] transition-all active:scale-[0.98] disabled:opacity-70"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
              <span className="font-semibold text-sm">Google</span>
            </button>
            <button
              type="button"
              onClick={handleGuestSignIn}
              disabled={loading}
              className="flex-1 bg-[var(--color-surface-container-highest)] border border-white/[0.05] py-3.5 rounded-2xl flex justify-center items-center gap-2 hover:bg-white/[0.08] transition-all active:scale-[0.98] disabled:opacity-70"
            >
              <span className="material-symbols-outlined text-[20px]">person_outline</span>
              <span className="font-semibold text-sm">Guest</span>
            </button>
          </div>

          <div className="mt-8 flex items-center justify-center gap-2">
            <span className="text-on-surface-variant text-sm">
              {isLogin ? "Don't have an account?" : "Already have an account?"}
            </span>
            <button
              onClick={() => {
                setIsLogin(!isLogin);
                setError(null);
                setResetSent(false);
              }}
              className="text-primary font-bold text-sm hover:underline"
            >
              {isLogin ? 'Sign up' : 'Log in'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
