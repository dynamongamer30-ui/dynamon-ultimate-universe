/**
 * Unified premium feedback engine: Web Audio sound + haptic vibration.
 * Zero external assets. Every interaction gets a precise, layered response.
 */
let ctx: AudioContext | null = null;

function getCtx() {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    try {
      ctx = new (window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    } catch {
      return null;
    }
  }
  if (ctx.state === "suspended") ctx.resume().catch(() => {});
  return ctx;
}

/** Haptic pulse — silently no-ops on unsupported devices (desktop, iOS Safari). */
export function haptic(pattern: number | number[] = 8) {
  if (typeof navigator === "undefined" || !("vibrate" in navigator)) return;
  try {
    navigator.vibrate(pattern);
  } catch {
    /* ignore */
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

/** Legacy-compatible raw tap */
export function playTap(freq = 880, duration = 0.08, type: OscillatorType = "sine", gain = 0.05) {
  tone({ freq, duration, type, gain });
}

/* ── Semantic feedback vocabulary ─────────────────────────── */

/** Primary press: crisp mechanical tick + short haptic */
export const playClick = () => {
  tone({ freq: 1800, duration: 0.03, type: "square", gain: 0.012 });
  tone({ freq: 640, duration: 0.06, type: "triangle", gain: 0.04 });
  haptic(8);
};

/** Success: rising two-note chime + double haptic */
export const playSuccess = () => {
  tone({ freq: 660, duration: 0.09, gain: 0.05 });
  tone({ freq: 990, duration: 0.12, gain: 0.05, delay: 0.07 });
  tone({ freq: 1320, duration: 0.14, gain: 0.03, delay: 0.14 });
  haptic([10, 40, 14]);
};

/** Soft: gentle low blip for secondary actions (like, hover-confirm) */
export const playSoft = () => {
  tone({ freq: 520, duration: 0.05, gain: 0.025 });
  haptic(5);
};

/** Hover: near-subliminal high tick, no haptic (fires often) */
export const playHover = () => {
  tone({ freq: 2400, duration: 0.018, type: "sine", gain: 0.006 });
};

/** Toggle/switch: quick pitch glide up */
export const playToggle = (on = true) => {
  tone({ freq: on ? 500 : 800, glideTo: on ? 800 : 500, duration: 0.07, type: "triangle", gain: 0.035 });
  haptic(7);
};

/** Error: descending buzz + strong haptic */
export const playError = () => {
  tone({ freq: 300, glideTo: 180, duration: 0.16, type: "sawtooth", gain: 0.03 });
  haptic([24, 30, 24]);
};

/** Unlock/reward: sparkling ascending arpeggio */
export const playUnlock = () => {
  tone({ freq: 523, duration: 0.1, gain: 0.045 });
  tone({ freq: 659, duration: 0.1, gain: 0.045, delay: 0.08 });
  tone({ freq: 784, duration: 0.1, gain: 0.045, delay: 0.16 });
  tone({ freq: 1047, duration: 0.2, gain: 0.05, delay: 0.24 });
  haptic([12, 50, 12, 50, 20]);
};

/** Whoosh: filtered noise sweep for page/panel transitions */
export const playWhoosh = () => {
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
