/**
 * Web Audio API Sound Dispatcher for Critical Alerts & Emergency Notifications.
 * Handles browser autoplay policies, AudioContext resumption, and two-tone emergency sirens.
 */

const STORAGE_KEY = "globaleye_alert_sound_enabled";

let sharedAudioCtx: AudioContext | null = null;
let gestureListenerRegistered = false;

function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!sharedAudioCtx) {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (AudioCtx) {
      sharedAudioCtx = new AudioCtx();
    }
  }
  return sharedAudioCtx;
}

/**
 * Register user gesture listener to automatically unlock audio on modern browsers
 * without requiring the user to explicitly click a sound toggle first.
 */
export function registerAudioUnlockListener(): void {
  if (typeof window === "undefined" || gestureListenerRegistered) return;
  gestureListenerRegistered = true;

  const unlock = async () => {
    const ctx = getAudioContext();
    if (ctx && ctx.state === "suspended") {
      try {
        await ctx.resume();
      } catch {
        // ignore resume error
      }
    }
    // Remove listeners once audio context is running
    if (ctx && ctx.state === "running") {
      window.removeEventListener("click", unlock);
      window.removeEventListener("keydown", unlock);
      window.removeEventListener("touchstart", unlock);
    }
  };

  window.addEventListener("click", unlock, { passive: true });
  window.addEventListener("keydown", unlock, { passive: true });
  window.addEventListener("touchstart", unlock, { passive: true });
}

export function isSoundEnabled(): boolean {
  if (typeof window === "undefined") return true;
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === null) return true; // Default to ON for security operations
  return stored === "true";
}

export function setSoundEnabled(enabled: boolean): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, enabled ? "true" : "false");
}

/**
 * Play a two-tone critical incident dispatch alert.
 * @param escalated If true, plays a higher-urgency tone (1100Hz / 880Hz).
 */
export async function playCriticalAlertSound(escalated = false): Promise<void> {
  if (!isSoundEnabled() || typeof window === "undefined") return;

  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    if (ctx.state === "suspended") {
      await ctx.resume();
    }

    const tones = escalated
      ? [
          { freq: 1100, start: 0, dur: 0.18 },
          { freq: 880, start: 0.22, dur: 0.18 },
          { freq: 1100, start: 0.44, dur: 0.22 },
        ]
      : [
          { freq: 880, start: 0, dur: 0.18 },
          { freq: 660, start: 0.22, dur: 0.18 },
          { freq: 880, start: 0.44, dur: 0.22 },
        ];

    tones.forEach(({ freq, start, dur }) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, ctx.currentTime + start);

      gain.gain.setValueAtTime(0.0001, ctx.currentTime + start);
      gain.gain.exponentialRampToValueAtTime(0.28, ctx.currentTime + start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + start + dur);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(ctx.currentTime + start);
      osc.stop(ctx.currentTime + start + dur + 0.02);
    });
  } catch (err) {
    console.warn("Unable to play alert sound:", err);
  }
}
