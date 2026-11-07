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
import {
  Mail,
  Lock,
  ArrowRight,
  AlertCircle,
  CheckCircle,
  User,
  Loader2,
  Activity,
} from 'lucide-react';

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
    <div className="min-h-screen bg-[#080808] flex flex-col justify-center px-4 sm:px-6 relative overflow-y-auto">
      <div className="max-w-md w-full mx-auto relative z-10 py-10">
        {/* Athletic Brand Wordmark & Emblem */}
        <div className="flex flex-col items-center mb-8 text-center">
          <div className="w-14 h-14 rounded-2xl bg-[#30D158] flex items-center justify-center mb-3 shadow-[0_4px_24px_rgba(48,209,88,0.25)]">
            <Activity className="w-8 h-8 text-black stroke-[2.5]" />
          </div>
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-black text-[#F5F5F5] font-headline tracking-tight uppercase">
              MyFitAI
            </h1>
            <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-[#30D158] px-2 py-0.5 rounded bg-[#30D158]/10 border border-[#30D158]/20">
              OS
            </span>
          </div>
          <p className="text-[#A1A1A6] text-xs mt-2 max-w-xs">
            {isLogin
              ? 'Personal athletic operating system. Sign in to sync your progressive overload logs.'
              : 'Join the athletic network. Track progressive overload, recovery, and nutrition.'}
          </p>
        </div>

        {/* Card */}
        <div className="bg-[#151517] rounded-3xl p-6 sm:p-7 shadow-2xl border border-[#2A2A2D] space-y-5">
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3.5 rounded-xl bg-[#FF453A]/10 border border-[#FF453A]/25 flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-[#FF453A] mt-0.5 shrink-0" />
                <p className="text-xs text-[#FF453A] font-medium leading-relaxed">{error}</p>
              </div>
            )}
            {resetSent && (
              <div className="p-3.5 rounded-xl bg-[#30D158]/10 border border-[#30D158]/25 flex items-start gap-2.5">
                <CheckCircle className="w-4 h-4 text-[#30D158] mt-0.5 shrink-0" />
                <p className="text-xs text-[#30D158] font-medium leading-relaxed">
                  Password reset email dispatched. Check your inbox.
                </p>
              </div>
            )}

            <div>
              <label className="block text-xs font-mono font-bold uppercase tracking-wider text-[#A1A1A6] mb-1.5 ml-1">
                Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#6B6B70]" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-[#1E1E20] border border-[#2A2A2D] rounded-xl py-3 pl-10 pr-4 text-sm text-[#F5F5F5] placeholder:text-[#6B6B70] focus:outline-none focus:border-[#30D158] transition-colors"
                  placeholder="athlete@domain.com"
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-1.5 px-1">
                <label className="block text-xs font-mono font-bold uppercase tracking-wider text-[#A1A1A6]">
                  Password
                </label>
                {isLogin && (
                  <button 
                    type="button" 
                    onClick={handlePasswordReset}
                    className="text-xs text-[#30D158] font-medium hover:underline focus:outline-none"
                  >
                    Forgot Password?
                  </button>
                )}
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#6B6B70]" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-[#1E1E20] border border-[#2A2A2D] rounded-xl py-3 pl-10 pr-4 text-sm text-[#F5F5F5] placeholder:text-[#6B6B70] focus:outline-none focus:border-[#30D158] transition-colors"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 bg-[#FF8A00] hover:bg-[#FF8A00]/90 text-black font-headline font-black uppercase tracking-wider py-3.5 rounded-xl flex items-center justify-center gap-2 active:scale-[0.98] transition-all disabled:opacity-60 disabled:active:scale-100 shadow-[0_4px_16px_rgba(255,138,0,0.25)]"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <span>{isLogin ? 'Sign In' : 'Create Athlete Account'}</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <div className="flex items-center justify-between gap-3 pt-2">
            <div className="h-px bg-[#2A2A2D] flex-1" />
            <span className="text-[10px] font-mono text-[#6B6B70] uppercase tracking-wider">
              Or continue with
            </span>
            <div className="h-px bg-[#2A2A2D] flex-1" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={loading}
              className="bg-[#1E1E20] hover:bg-[#2A2A2D] border border-[#2A2A2D] py-3 rounded-xl flex justify-center items-center gap-2.5 transition-all active:scale-[0.98] disabled:opacity-60"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              <span className="font-headline font-bold text-xs uppercase tracking-wider text-[#F5F5F5]">
                Google
              </span>
            </button>
            <button
              type="button"
              onClick={handleGuestSignIn}
              disabled={loading}
              className="bg-[#1E1E20] hover:bg-[#2A2A2D] border border-[#2A2A2D] py-3 rounded-xl flex justify-center items-center gap-2.5 transition-all active:scale-[0.98] disabled:opacity-60 text-[#F5F5F5]"
            >
              <User className="w-4 h-4 text-[#A1A1A6]" />
              <span className="font-headline font-bold text-xs uppercase tracking-wider">
                Guest
              </span>
            </button>
          </div>

          <div className="pt-2 flex items-center justify-center gap-2 text-xs">
            <span className="text-[#A1A1A6]">
              {isLogin ? "Don't have an athlete account?" : 'Already registered?'}
            </span>
            <button
              onClick={() => {
                setIsLogin(!isLogin);
                setError(null);
                setResetSent(false);
              }}
              className="text-[#30D158] font-bold hover:underline"
            >
              {isLogin ? 'Sign up' : 'Log in'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
