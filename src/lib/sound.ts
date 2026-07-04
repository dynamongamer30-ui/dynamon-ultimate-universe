// Tiny Web Audio click for tactile feedback. No external assets.
let ctx: AudioContext | null = null;

function getCtx() {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    try {
      ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    } catch {
      return null;
    }
  }
  return ctx;
}

export function playTap(freq = 880, duration = 0.08, type: OscillatorType = "sine", gain = 0.05) {
  const c = getCtx();
  if (!c) return;
  try {
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = type;
    o.frequency.value = freq;
    g.gain.value = gain;
    o.connect(g).connect(c.destination);
    o.start();
    g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + duration);
    o.stop(c.currentTime + duration);
  } catch {
    /* ignore */
  }
}

export const playClick = () => playTap(720, 0.06, "triangle", 0.04);
export const playSuccess = () => {
  playTap(660, 0.08, "sine", 0.05);
  setTimeout(() => playTap(990, 0.1, "sine", 0.05), 70);
};
export const playSoft = () => playTap(540, 0.05, "sine", 0.025);
