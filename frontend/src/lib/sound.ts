/**
 * Emergency Alert Sound Dispatcher for Critical Alerts & Emergency Notifications.
 * Plays the official Sime Darby operations Alarm Sound Effect (MP3) on loop
 * until the critical incident is acknowledged by the operator.
 */

const STORAGE_KEY = "globaleye_alert_sound_enabled";

let sharedAudioCtx: AudioContext | null = null;
let gestureListenerRegistered = false;
let alarmAudio: HTMLAudioElement | null = null;
let isAlarmPlaying = false;

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

function getOrCreateAlarmAudio(): HTMLAudioElement | null {
  if (typeof window === "undefined") return null;
  if (!alarmAudio) {
    alarmAudio = new Audio("/samples/alarm.mp3");
    alarmAudio.preload = "auto";
  }
  return alarmAudio;
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
    const audio = getOrCreateAlarmAudio();
    if (audio) {
      audio.load();
    }
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
  if (!enabled) {
    stopCriticalAlertSound();
  }
}

/**
 * Play the critical incident MP3 alarm.
 * Repeats continuously (loop) until acknowledged.
 */
export async function playCriticalAlertSound(loop = true): Promise<void> {
  if (!isSoundEnabled() || typeof window === "undefined") return;

  try {
    const audio = getOrCreateAlarmAudio();
    if (!audio) return;

    audio.loop = loop;
    isAlarmPlaying = true;

    if (audio.paused) {
      const playPromise = audio.play();
      if (playPromise !== undefined) {
        await playPromise.catch((err) => {
          console.warn("Alarm MP3 playback failed or waiting for user gesture:", err);
          playFallbackSynth(loop);
        });
      }
    }
  } catch (err) {
    console.warn("Unable to play alarm MP3, using WebAudio fallback:", err);
    playFallbackSynth(loop);
  }
}

/**
 * Stop the critical alert sound immediately after user acknowledges it.
 */
export function stopCriticalAlertSound(): void {
  isAlarmPlaying = false;
  if (alarmAudio) {
    try {
      alarmAudio.pause();
      alarmAudio.currentTime = 0;
      alarmAudio.loop = false;
    } catch {}
  }
  stopFallbackSynth();
}

let synthInterval: NodeJS.Timeout | null = null;

function playFallbackSynth(loop: boolean): void {
  stopFallbackSynth();
  playSynthBeep();
  if (loop) {
    synthInterval = setInterval(() => {
      if (!isAlarmPlaying) {
        stopFallbackSynth();
        return;
      }
      playSynthBeep();
    }, 4500);
  }
}

function stopFallbackSynth(): void {
  if (synthInterval) {
    clearInterval(synthInterval);
    synthInterval = null;
  }
}

function playSynthBeep(): void {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    if (ctx.state === "suspended") {
      ctx.resume().catch(() => {});
    }

    const tones = [
      { freq: 960, start: 0, dur: 0.25 },
      { freq: 720, start: 0.3, dur: 0.25 },
      { freq: 960, start: 0.6, dur: 0.3 },
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
  } catch {}
}
