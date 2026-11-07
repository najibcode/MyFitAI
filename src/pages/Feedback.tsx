// ─────────────────────────────────────────────────────────────
// MyFitAI — Athlete Feedback & Issue Submission
// Athletic Personal Operating System UI/UX
// ─────────────────────────────────────────────────────────────

import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../services/firebase';
import {
  ArrowLeft,
  Star,
  Send,
  Loader2,
  CheckCircle2,
} from 'lucide-react';

export default function Feedback() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { showToast } = useToast();
  const [rating, setRating] = useState(0);
  const [category, setCategory] = useState('General');
  const [message, setMessage] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!rating || !message.trim() || submitting) return;
    setSubmitting(true);
    try {
      await addDoc(collection(db, 'feedback'), {
        uid: user?.uid || 'anonymous',
        rating,
        category: category || 'General',
        message: message.trim(),
        createdAt: serverTimestamp(),
        userAgent: navigator.userAgent,
      });
      setSubmitted(true);
    } catch {
      showToast('Failed to submit feedback. Please check network connection.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const categories = [
    'General',
    'Bug Report',
    'Biomechanical Overload',
    'GPS & Territory Tracking',
    'Nutrition Database',
    'Wearables Sync',
    'Feature Request',
  ];

  const getRatingLabel = () => {
    switch (rating) {
      case 1:
        return 'Critical issues encountered';
      case 2:
        return 'Needs performance improvements';
      case 3:
        return 'Adequate baseline experience';
      case 4:
        return 'Strong athletic performance';
      case 5:
        return 'Exceptional personal operating system';
      default:
        return 'Tap a star rating above';
    }
  };

  if (submitted) {
    return (
      <main className="max-w-lg mx-auto px-4 sm:px-6 pt-12 pb-28 flex flex-col items-center justify-center min-h-[65vh]">
        <div className="text-center space-y-4 max-w-sm">
          <div className="w-16 h-16 mx-auto bg-[#30D158]/15 rounded-2xl flex items-center justify-center border border-[#30D158]/30 text-[#30D158] shadow-[0_4px_24px_rgba(48,209,88,0.25)]">
            <CheckCircle2 className="w-8 h-8 stroke-[2.5]" />
          </div>
          <div className="space-y-1">
            <h2 className="font-headline font-black text-2xl sm:text-3xl text-[#F5F5F5] uppercase tracking-tight">
              Feedback Received
            </h2>
            <p className="text-[#A1A1A6] text-xs leading-relaxed">
              Your telemetry and observations have been logged. Every report directly informs our algorithm and interface updates.
            </p>
          </div>
          <button
            onClick={() => navigate(-1)}
            className="w-full py-3.5 bg-[#151517] hover:bg-[#1E1E20] text-[#F5F5F5] border border-[#2A2A2D] rounded-xl font-headline font-bold text-xs uppercase tracking-wider transition-colors active:scale-[0.98]"
          >
            Return to App
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="max-w-lg mx-auto px-4 sm:px-6 pt-6 pb-28 space-y-6">
      {/* Back Button */}
      <button
        onClick={() => navigate(-1)}
        className="w-10 h-10 rounded-xl bg-[#151517] border border-[#2A2A2D] flex items-center justify-center text-[#A1A1A6] hover:text-[#F5F5F5] transition-colors"
        aria-label="Back"
      >
        <ArrowLeft className="w-5 h-5" />
      </button>

      {/* Header */}
      <header className="space-y-1">
        <span className="text-[10px] font-mono font-bold tracking-widest uppercase text-[#30D158] block">
          COMMUNICATION & TELEMETRY
        </span>
        <h1 className="font-headline font-black text-3xl sm:text-4xl text-[#F5F5F5] tracking-tight uppercase">
          Send Feedback
        </h1>
        <p className="text-xs text-[#A1A1A6]">
          Report technical anomalies, suggest feature improvements, or review app ergonomics.
        </p>
      </header>

      {/* Rating Module */}
      <div className="bg-[#151517] rounded-3xl p-6 border border-[#2A2A2D] text-center space-y-3">
        <h3 className="font-headline font-bold text-sm text-[#F5F5F5] uppercase tracking-wide">
          Overall System Rating
        </h3>

        <div className="flex justify-center gap-2 pt-1">
          {[1, 2, 3, 4, 5].map(star => (
            <button
              key={star}
              type="button"
              onClick={() => setRating(star)}
              className={`w-11 h-11 rounded-xl transition-all flex items-center justify-center border active:scale-95 ${
                star <= rating
                  ? 'bg-[#30D158]/15 text-[#30D158] border-[#30D158]/40 shadow-[0_2px_12px_rgba(48,209,88,0.2)]'
                  : 'bg-[#1E1E20] text-[#6B6B70] border-[#2A2A2D] hover:text-[#A1A1A6]'
              }`}
              aria-label={`Rate ${star} stars`}
            >
              <Star
                className={`w-5 h-5 ${star <= rating ? 'fill-[#30D158]' : ''}`}
              />
            </button>
          ))}
        </div>

        <p className="text-xs font-mono font-medium text-[#A1A1A6]">
          {getRatingLabel()}
        </p>
      </div>

      {/* Category Pills */}
      <div className="space-y-2">
        <label className="block text-xs font-mono font-bold uppercase tracking-wider text-[#A1A1A6] px-1">
          Topic Category
        </label>
        <div className="flex flex-wrap gap-2">
          {categories.map(cat => (
            <button
              key={cat}
              type="button"
              onClick={() => setCategory(cat)}
              className={`px-3.5 py-2 rounded-xl text-xs font-headline font-bold uppercase tracking-wider border transition-all active:scale-95 ${
                category === cat
                  ? 'bg-[#30D158] text-black border-[#30D158] shadow-sm'
                  : 'bg-[#151517] text-[#A1A1A6] border-[#2A2A2D] hover:text-[#F5F5F5] hover:border-[#3A3A3D]'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Message Textarea */}
      <div className="space-y-2">
        <label className="block text-xs font-mono font-bold uppercase tracking-wider text-[#A1A1A6] px-1">
          Detailed Report
        </label>
        <textarea
          value={message}
          onChange={e => setMessage(e.target.value)}
          placeholder="Describe your observation, reproduction steps for bugs, or workflow suggestion..."
          rows={5}
          className="w-full bg-[#151517] border border-[#2A2A2D] rounded-2xl p-4 text-sm text-[#F5F5F5] placeholder:text-[#6B6B70] outline-none focus:border-[#30D158] transition-colors resize-none leading-relaxed"
        />
      </div>

      {/* Submit Action */}
      <button
        onClick={handleSubmit}
        disabled={!rating || !message.trim() || submitting}
        className="w-full bg-[#FF8A00] hover:bg-[#FF8A00]/90 text-black font-headline font-black py-4 rounded-xl text-xs uppercase tracking-wider shadow-[0_4px_20px_rgba(255,138,0,0.25)] active:scale-[0.98] transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        {submitting ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Dispatched...</span>
          </>
        ) : (
          <>
            <Send className="w-4 h-4" />
            <span>Submit Feedback</span>
          </>
        )}
      </button>
    </main>
  );
}
