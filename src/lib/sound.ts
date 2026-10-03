/**
 * Unified optional feedback engine: Web Audio sound + haptic vibration.
 *
 * The engine is enhancement-only: every important state still has visible UI
 * feedback, audio is never initialized on page mount, and unsupported APIs
 * silently no-op.
 */
export type FeedbackPreference = "full" | "reduced" | "off";

export const FEEDBACK_PREFERENCE_KEY = "dynamon-feedback-preference";
const FEEDBACK_EVENT = "dynamon-feedback-preference-change";

let ctx: AudioContext | null = null;
let lastHoverAt = 0;

function readPreference(): FeedbackPreference {
  if (typeof window === "undefined") return "full";
  const value = window.localStorage.getItem(FEEDBACK_PREFERENCE_KEY);
  return value === "reduced" || value === "off" ? value : "full";
}

export function getFeedbackPreference(): FeedbackPreference {
  return readPreference();
}

function prefersReducedMotion() {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function canPlaySound() {
  return readPreference() === "full";
}

function canUseHaptics(importance: "standard" | "essential" = "standard") {
  const preference = readPreference();
  return preference === "full" || (preference === "reduced" && importance === "essential");
}

function getCtx() {
  if (!canPlaySound() || typeof window === "undefined") return null;
  if (!ctx) {
    try {
      const AudioContextCtor = window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioContextCtor) return null;
      ctx = new AudioContextCtor();
    } catch {
      return null;
    }
  }
  if (ctx.state === "suspended") ctx.resume().catch(() => {});
  return ctx;
}

/** Haptic pulse — silently no-ops on unsupported devices and preference Off. */
export function haptic(pattern: number | number[] = 8, importance: "standard" | "essential" = "standard") {
  if (!canUseHaptics(importance) || typeof navigator === "undefined" || !("vibrate" in navigator)) return;
  try {
    navigator.vibrate(pattern);
  } catch {
    /* unsupported or blocked */
  }
}

type ToneOpts = {
  freq: number;
  duration?: number;
  type?: OscillatorType;
  gain?: number;
  /** glide the pitch to this frequency over the duration */
  glideTo?: number;
  delay?: number;
};

function tone({ freq, duration = 0.08, type = "sine", gain = 0.05, glideTo, delay = 0 }: ToneOpts) {
  const c = getCtx();
  if (!c) return;
  try {
    const t0 = c.currentTime + delay;
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t0);
    if (glideTo) o.frequency.exponentialRampToValueAtTime(glideTo, t0 + duration);
    g.gain.setValueAtTime(gain, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
    o.connect(g).connect(c.destination);
    o.start(t0);
    o.stop(t0 + duration + 0.02);
  } catch {
    /* ignore */
  }
}

/** Legacy-compatible raw tap. */
export function playTap(freq = 880, duration = 0.08, type: OscillatorType = "sine", gain = 0.05) {
  tone({ freq, duration, type, gain });
}

/** Primary press: crisp mechanical tick + standard haptic. */
export const playClick = () => {
  tone({ freq: 1800, duration: 0.03, type: "square", gain: 0.012 });
  tone({ freq: 640, duration: 0.06, type: "triangle", gain: 0.04 });
  haptic(8);
};

/** Success: rising chime + essential haptic in Reduced mode. */
export const playSuccess = () => {
  tone({ freq: 660, duration: 0.09, gain: 0.05 });
  tone({ freq: 990, duration: 0.12, gain: 0.05, delay: 0.07 });
  tone({ freq: 1320, duration: 0.14, gain: 0.03, delay: 0.14 });
  haptic([10, 40, 14], "essential");
};

/** Soft blip for secondary actions. */
export const playSoft = () => {
  tone({ freq: 520, duration: 0.05, gain: 0.025 });
  haptic(5);
};

/** Hover feedback is disabled for reduced motion and coarse-pointer devices. */
export const playHover = () => {
  if (prefersReducedMotion() || typeof window === "undefined" || window.matchMedia("(pointer: coarse)").matches) return;
  const now = typeof performance === "undefined" ? Date.now() : performance.now();
  if (now - lastHoverAt < 110) return;
  lastHoverAt = now;
  tone({ freq: 2400, duration: 0.018, type: "sine", gain: 0.006 });
};

/** Toggle/switch: quick pitch glide up. */
export const playToggle = (on = true) => {
  tone({ freq: on ? 500 : 800, glideTo: on ? 800 : 500, duration: 0.07, type: "triangle", gain: 0.035 });
  haptic(7);
};

/** Error: descending buzz + essential haptic in Reduced mode. */
export const playError = () => {
  tone({ freq: 300, glideTo: 180, duration: 0.16, type: "sawtooth", gain: 0.03 });
  haptic([24, 30, 24], "essential");
};

/** Unlock/reward: ascending arpeggio + essential haptic in Reduced mode. */
export const playUnlock = () => {
  tone({ freq: 523, duration: 0.1, gain: 0.045 });
  tone({ freq: 659, duration: 0.1, gain: 0.045, delay: 0.08 });
  tone({ freq: 784, duration: 0.1, gain: 0.045, delay: 0.16 });
  tone({ freq: 1047, duration: 0.2, gain: 0.05, delay: 0.24 });
  haptic([12, 50, 12, 50, 20], "essential");
};

/** Whoosh is decorative and therefore follows Full + reduced-motion rules. */
export const playWhoosh = () => {
  if (prefersReducedMotion()) return;
  const c = getCtx();
  if (!c) return;
  try {
    const dur = 0.22;
    const buf = c.createBuffer(1, c.sampleRate * dur, c.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
    const src = c.createBufferSource();
    src.buffer = buf;
    const filter = c.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.setValueAtTime(400, c.currentTime);
    filter.frequency.exponentialRampToValueAtTime(2400, c.currentTime + dur);
    filter.Q.value = 1.2;
    const g = c.createGain();
    g.gain.setValueAtTime(0.05, c.currentTime);
    g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + dur);
    src.connect(filter).connect(g).connect(c.destination);
    src.start();
  } catch {
    /* ignore */
  }
};

export function subscribeToFeedbackPreference(listener: (preference: FeedbackPreference) => void) {
  if (typeof window === "undefined") return () => {};
  const onChange = (event: Event) => {
    const preference = (event as CustomEvent<FeedbackPreference>).detail;
    if (preference === "full" || preference === "reduced" || preference === "off") listener(preference);
  };
  window.addEventListener(FEEDBACK_EVENT, onChange);
  return () => window.removeEventListener(FEEDBACK_EVENT, onChange);
}

export function setFeedbackPreference(preference: FeedbackPreference) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(FEEDBACK_PREFERENCE_KEY, preference);
  window.dispatchEvent(new CustomEvent(FEEDBACK_EVENT, { detail: preference }));
}
