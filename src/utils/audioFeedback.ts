// ─────────────────────────────────────────────────────────────
// MyFitAI — Audio & Haptic Feedback Engine
// High-fidelity synthetic sound cues & native haptic vibrations.
// Works 100% offline without external audio assets or latency.
// ─────────────────────────────────────────────────────────────

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  try {
    if (!audioCtx || audioCtx.state === 'closed') {
      const AudioCtxClass =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtxClass) {
        audioCtx = new AudioCtxClass();
      }
    }
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume().catch(() => {});
    }
    return audioCtx;
  } catch {
    return null;
  }
}

export type HapticStyle = 'light' | 'medium' | 'heavy' | 'success' | 'timerDone';

/**
 * Triggers safe mobile haptic feedback via Navigator.vibrate.
 */
export function triggerHaptic(style: HapticStyle | number | number[] = 'medium'): void {
  if (typeof window === 'undefined' || !navigator.vibrate) return;

  try {
    if (typeof style === 'number' || Array.isArray(style)) {
      navigator.vibrate(style);
      return;
    }

    switch (style) {
      case 'light':
        navigator.vibrate(25);
        break;
      case 'medium':
        navigator.vibrate(60);
        break;
      case 'heavy':
        navigator.vibrate(120);
        break;
      case 'success':
        navigator.vibrate([40, 60, 80]);
        break;
      case 'timerDone':
        navigator.vibrate([150, 70, 150, 70, 220]);
        break;
    }
  } catch {
    // Ignore unsupported vibration errors
  }
}

/**
 * Plays a warm, subtle ticking click for 3, 2, 1 countdowns.
 */
export function playCountdownTick(): void {
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(660, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.05);

    gain.gain.setValueAtTime(0.08, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.05);
    triggerHaptic('light');
  } catch {
    // Audio policy blocked
  }
}

/**
 * Plays a dual-tone ascending harmonic gym bell chime when rest timer completes.
 */
export function playRestChime(): void {
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const now = ctx.currentTime;

    // First bell tone (880 Hz - A5)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(880, now);

    gain1.gain.setValueAtTime(0.18, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.35);

    // Second bell tone (1320 Hz - E6 chord harmonic, delayed by 120ms)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(1320, now + 0.12);

    gain2.gain.setValueAtTime(0.2, now + 0.12);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.65);

    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.12);
    osc2.stop(now + 0.65);

    triggerHaptic('timerDone');
  } catch {
    // Audio policy blocked
  }
}

/**
 * Plays an upbeat triumphant sound when hitting a PR or finishing workout.
 */
export function playSuccessChime(): void {
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const now = ctx.currentTime;
    const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6

    notes.forEach((freq, idx) => {
      const noteTime = now + idx * 0.09;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, noteTime);

      gain.gain.setValueAtTime(0.14, noteTime);
      gain.gain.exponentialRampToValueAtTime(0.001, noteTime + 0.28);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(noteTime);
      osc.stop(noteTime + 0.28);
    });

    triggerHaptic('success');
  } catch {
    // Audio policy blocked
  }
}
