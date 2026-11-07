/** Tiny synthesized UI sounds. No audio assets, no network. */

type Tone = 'open' | 'close' | 'click' | 'toggle' | 'error' | 'success';

let ctx: AudioContext | null = null;

function getContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const Ctor =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  try {
    ctx ??= new Ctor();
    if (ctx.state === 'suspended') void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

const PATTERNS: Record<Tone, Array<{ f: number; d: number; t: number; gain: number }>> = {
  open: [
    { f: 520, d: 0.09, t: 0, gain: 0.05 },
    { f: 780, d: 0.1, t: 0.06, gain: 0.04 },
  ],
  close: [
    { f: 440, d: 0.08, t: 0, gain: 0.04 },
    { f: 300, d: 0.1, t: 0.05, gain: 0.034 },
  ],
  click: [{ f: 880, d: 0.035, t: 0, gain: 0.026 }],
  toggle: [{ f: 660, d: 0.06, t: 0, gain: 0.03 }],
  success: [
    { f: 660, d: 0.09, t: 0, gain: 0.04 },
    { f: 880, d: 0.12, t: 0.08, gain: 0.035 },
  ],
  error: [
    { f: 240, d: 0.12, t: 0, gain: 0.04 },
    { f: 180, d: 0.16, t: 0.09, gain: 0.035 },
  ],
};

export function playTone(tone: Tone, enabled: boolean): void {
  if (!enabled) return;
  const audio = getContext();
  if (!audio) return;
  try {
    const now = audio.currentTime;
    for (const note of PATTERNS[tone]) {
      const osc = audio.createOscillator();
      const gain = audio.createGain();
      osc.type = tone === 'error' ? 'triangle' : 'sine';
      osc.frequency.setValueAtTime(note.f, now + note.t);
      osc.frequency.exponentialRampToValueAtTime(Math.max(60, note.f * 0.92), now + note.t + note.d);
      gain.gain.setValueAtTime(0.0001, now + note.t);
      gain.gain.exponentialRampToValueAtTime(note.gain, now + note.t + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + note.t + note.d);
      osc.connect(gain).connect(audio.destination);
      osc.start(now + note.t);
      osc.stop(now + note.t + note.d + 0.02);
    }
  } catch {
    /* Audio is a nice-to-have; never break the UI over it. */
  }
}
