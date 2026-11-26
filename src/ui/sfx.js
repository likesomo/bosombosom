// Tiny WebAudio synth so the demo has punchy sounds without audio files.
import { state } from '../state/gameState.js';

let ctx = null;
let master = null;
let noiseBuffer = null;

export function initAudio() {
  try {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      ctx = new AC();
      master = ctx.createGain();
      master.connect(ctx.destination);
      noiseBuffer = ctx.createBuffer(1, ctx.sampleRate * 0.6, ctx.sampleRate);
      const d = noiseBuffer.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
    if (ctx.state === 'suspended') ctx.resume();
    setVolume(state.settings.volume);
  } catch (e) { console.warn('[sfx] audio unavailable', e); }
}

export function setVolume(v) {
  if (master) master.gain.value = Math.max(0, Math.min(1, v)) * 0.5;
}

function tone(type, f0, f1, dur, vol = 0.5, delay = 0) {
  const t = ctx.currentTime + delay;
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = type;
  o.frequency.setValueAtTime(f0, t);
  o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  o.connect(g).connect(master);
  o.start(t);
  o.stop(t + dur + 0.02);
}

function noise(dur, vol = 0.5, freq = 1200, delay = 0) {
  const t = ctx.currentTime + delay;
  const s = ctx.createBufferSource();
  s.buffer = noiseBuffer;
  const f = ctx.createBiquadFilter();
  f.type = 'lowpass';
  f.frequency.setValueAtTime(freq, t);
  const g = ctx.createGain();
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  s.connect(f).connect(g).connect(master);
  s.start(t);
  s.stop(t + dur + 0.02);
}

const PRESETS = {
  select: () => tone('square', 660, 990, 0.08, 0.25),
  hit: () => { noise(0.08, 0.5, 2400); tone('square', 320, 120, 0.08, 0.3); },
  heavy: () => { noise(0.2, 0.7, 900); tone('sawtooth', 180, 50, 0.25, 0.45); },
  guard: () => { tone('triangle', 1400, 900, 0.12, 0.4); tone('square', 2100, 1800, 0.06, 0.15); },
  counter: () => { tone('square', 900, 1800, 0.1, 0.35); noise(0.1, 0.4, 3500, 0.03); },
  jump: () => tone('square', 300, 700, 0.12, 0.2),
  whoosh: () => noise(0.18, 0.35, 1800),
  telegraph: () => { tone('square', 880, 880, 0.07, 0.25); tone('square', 880, 880, 0.07, 0.25, 0.12); },
  drop: () => { noise(0.35, 0.8, 500); tone('sine', 120, 40, 0.4, 0.6); },
  shout: () => { tone('sawtooth', 220, 330, 0.35, 0.35); noise(0.3, 0.35, 1500); },
  glitch: () => { for (let i = 0; i < 5; i++) tone('square', 200 + Math.random() * 1400, 100 + Math.random() * 900, 0.05, 0.2, i * 0.05); },
  ko: () => { noise(0.3, 0.8, 1200); tone('sawtooth', 200, 1600, 0.6, 0.4); tone('square', 1600, 2400, 0.5, 0.2, 0.25); },
  fanfare: () => [523, 659, 784, 1047].forEach((f, i) => tone('square', f, f, 0.16, 0.25, i * 0.12)),
  tick: () => tone('square', 520, 520, 0.06, 0.2),
  fight: () => { tone('square', 784, 784, 0.12, 0.3); tone('square', 1047, 1047, 0.25, 0.3, 0.12); },
  lose: () => [392, 330, 262].forEach((f, i) => tone('triangle', f, f * 0.98, 0.2, 0.3, i * 0.15)),
};

export function sfx(name) {
  if (!ctx || !master || ctx.state !== 'running') return;
  try { PRESETS[name]?.(); } catch (e) { /* never break gameplay for sound */ }
}
