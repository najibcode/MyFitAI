// ─────────────────────────────────────────────────────────────
// MyFitAI — Web Audio Haptic & Chime Feedback
// Synthesizes lightweight offline tones for rest timers, countdowns,
// and set completions without external media asset dependencies.
// ─────────────────────────────────────────────────────────────

class AudioFeedback {
  private ctx: AudioContext | null = null;

  private getContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return null;
    if (!this.ctx) {
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  /**
   * Short crisp beep for countdown warning (3, 2, 1)
   */
  playCountdownTick() {
    try {
      const ctx = this.getContext();
      if (!ctx) return;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(520, ctx.currentTime);
      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.08);
    } catch {
      // Audio autoplay policy or device muted
    }
  }

  /**
   * Harmonious chime when rest timer completes
   */
  playTimerComplete() {
    try {
      const ctx = this.getContext();
      if (!ctx) return;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(1046.5, ctx.currentTime + 0.15); // A5 -> C6
      gain.gain.setValueAtTime(0.22, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.35);
    } catch {
      // Audio autoplay policy or device muted
    }
  }

  /**
   * Upbeat chime when a Personal Record (PR) is detected
   */
  playPRCelebration() {
    try {
      const ctx = this.getContext();
      if (!ctx) return;
      const now = ctx.currentTime;
      [
        { f: 523.25, t: 0.0 },  // C5
        { f: 659.25, t: 0.1 },  // E5
        { f: 783.99, t: 0.2 },  // G5
        { f: 1046.5, t: 0.3 },  // C6
      ].forEach(({ f, t }) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(f, now + t);
        gain.gain.setValueAtTime(0.15, now + t);
        gain.gain.exponentialRampToValueAtTime(0.001, now + t + 0.18);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + t);
        osc.stop(now + t + 0.18);
      });
    } catch {
      // Audio autoplay policy or device muted
    }
  }
}

export const audioFeedback = new AudioFeedback();
