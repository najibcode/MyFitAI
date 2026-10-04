import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../services/firebase';

export default function Feedback() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { showToast } = useToast();
  const [rating, setRating] = useState(0);
  const [category, setCategory] = useState('');
  const [message, setMessage] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Write feedback to Firestore instead of silently discarding it
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
      showToast('Failed to submit feedback. Please try again.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <main className="max-w-lg mx-auto px-6 pt-8 pb-32 flex flex-col items-center justify-center min-h-[70vh]">
        <div className="text-center animate-in fade-in zoom-in-95 duration-500">
          <div className="w-24 h-24 mx-auto mb-6 bg-secondary/20 rounded-full flex items-center justify-center border-2 border-secondary/40 shadow-[0_0_50px_rgba(111,251,133,0.3)]">
            <span className="material-symbols-outlined text-secondary text-5xl" style={{ fontVariationSettings: "'FILL' 1" }}>favorite</span>
          </div>
          <h2 className="font-headline font-black text-3xl tracking-tighter mb-3">Thank You!</h2>
          <p className="text-on-surface-variant text-sm leading-relaxed mb-8 max-w-xs">
            Your feedback helps us build the best fitness app in the world. We review every single response.
          </p>
          <button onClick={() => navigate(-1)} className="px-8 py-4 bg-primary text-black rounded-2xl font-headline font-bold text-sm uppercase tracking-widest active:scale-95 transition-all">
            Back to App
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="max-w-lg mx-auto px-6 pt-8 pb-32 space-y-8">
      <button onClick={() => navigate(-1)} className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-white hover:bg-white/10 transition-colors">
        <span className="material-symbols-outlined">arrow_back</span>
      </button>

      <header>
        <p className="text-secondary font-label font-bold tracking-widest uppercase text-[10px] mb-2">We're Listening</p>
        <h1 className="font-headline font-extrabold text-4xl tracking-tighter">Send Feedback</h1>
      </header>

      {/* Rating */}
      <div className="bg-[var(--color-surface-container)] rounded-[2rem] p-8 border border-white/5 text-center">
        <h3 className="font-headline font-bold text-lg mb-4">How's your experience?</h3>
        <div className="flex justify-center gap-3 mb-4">
          {[1, 2, 3, 4, 5].map(star => (
            <button
              key={star}
              onClick={() => setRating(star)}
              className={`w-12 h-12 rounded-xl transition-all active:scale-90 ${
                star <= rating
                  ? 'bg-[#FFD700]/20 text-[#FFD700] border border-[#FFD700]/30 shadow-[0_0_15px_rgba(255,215,0,0.2)]'
                  : 'bg-white/5 text-white/20 border border-white/5 hover:text-white/40'
              }`}
            >
              <span className="material-symbols-outlined text-2xl" style={star <= rating ? { fontVariationSettings: "'FILL' 1" } : {}}>star</span>
            </button>
          ))}
        </div>
        <p className="text-on-surface-variant text-xs">
          {rating === 0 && 'Tap to rate'}
          {rating === 1 && 'We\'ll do better 😔'}
          {rating === 2 && 'Room for improvement'}
          {rating === 3 && 'It\'s okay 👍'}
          {rating === 4 && 'Really enjoying it! 🎉'}
          {rating === 5 && 'Absolutely love it! 🔥'}
        </p>
      </div>

      {/* Category */}
      <div>
        <label className="block text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-3">What's this about?</label>
        <div className="flex flex-wrap gap-2">
          {['Bug Report', 'Feature Request', 'UI/UX Feedback', 'Performance', 'Workout Content', 'Nutrition', 'Other'].map(cat => (
            <button
              key={cat}
              onClick={() => setCategory(cat)}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-widest border transition-all active:scale-95 ${
                category === cat
                  ? 'bg-primary text-black border-primary'
                  : 'bg-white/5 text-on-surface-variant border-white/10 hover:border-white/30'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Message */}
      <div>
        <label className="block text-[10px] font-bold uppercase tracking-widest text-on-surface-variant mb-2">Your Message</label>
        <textarea
          value={message}
          onChange={e => setMessage(e.target.value)}
          placeholder="Tell us what you think, what you'd change, or what you love..."
          rows={5}
          className="w-full bg-white/5 outline-none rounded-2xl px-5 py-4 border border-white/10 focus:border-primary/60 transition-all text-sm text-white placeholder:text-white/20 resize-none"
        />
      </div>

      {/* Submit */}
      <button
        onClick={handleSubmit}
        disabled={!rating || !message.trim() || submitting}
        className="w-full bg-gradient-to-r from-primary to-[#CC5F00] text-black font-headline font-black py-5 rounded-2xl text-sm uppercase tracking-widest shadow-[0_12px_40px_rgba(255,122,0,0.3)] active:scale-[0.97] transition-all disabled:opacity-30 disabled:shadow-none flex items-center justify-center gap-2"
      >
        {submitting ? (
          <>
            <span className="material-symbols-outlined text-lg animate-spin">progress_activity</span>
            Submitting...
          </>
        ) : (
          <>
            <span className="material-symbols-outlined text-lg">send</span>
            Submit Feedback
          </>
        )}
      </button>
    </main>
  );
}
