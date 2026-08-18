// 音效：全部用 WebAudio 现场合成，不加载任何音频文件。
//
// 这么做有三个理由：原版音乐不能用（版权红线）；素材总量要压在 6MB 内；
// 而回合制需要的本来也只是几声短促的反馈音，合成足够了。
// 浏览器要求先有用户手势才能出声，所以首次点击时才建 AudioContext。

let ctx = null;
let master = null;
let enabled = true;

export function initSound() {
  if (ctx) return ctx;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  ctx = new AC();
  master = ctx.createGain();
  master.gain.value = 0.22;          // 默认压得很低，不喧宾夺主
  master.connect(ctx.destination);
  return ctx;
}

export function setSoundEnabled(on) {
  enabled = on;
  if (master) master.gain.value = on ? 0.22 : 0;
}
export const soundEnabled = () => enabled;

function env(node, t0, attack, decay, peak = 1) {
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(peak, t0 + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + attack + decay);
  node.connect(g);
  g.connect(master);
  return g;
}

function tone(freq, t0, dur, type = 'sine', peak = 0.6) {
  const o = ctx.createOscillator();
  o.type = type;
  o.frequency.setValueAtTime(freq, t0);
  env(o, t0, 0.008, dur, peak);
  o.start(t0);
  o.stop(t0 + dur + 0.05);
  return o;
}

/** 一小段噪声，用来做金属交击与破城的「质感」 */
function noise(t0, dur, filterFreq, peak = 0.5) {
  const len = Math.max(1, Math.floor(ctx.sampleRate * dur));
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const src = ctx.createBufferSource();
  src.buffer = buf;
  const f = ctx.createBiquadFilter();
  f.type = 'bandpass';
  f.frequency.value = filterFreq;
  f.Q.value = 1.2;
  src.connect(f);
  env(f, t0, 0.004, dur, peak);
  src.start(t0);
  return src;
}

const guard = () => enabled && (ctx || initSound());

export function sfxMove() {
  if (!guard()) return;
  const t = ctx.currentTime;
  tone(180 + Math.random() * 30, t, 0.06, 'triangle', 0.25);
}

export function sfxClash() {
  if (!guard()) return;
  const t = ctx.currentTime;
  noise(t, 0.13, 2600, 0.45);
  tone(420 + Math.random() * 120, t, 0.09, 'square', 0.18);
}

export function sfxKill() {
  if (!guard()) return;
  const t = ctx.currentTime;
  noise(t, 0.22, 900, 0.4);
  tone(150, t + 0.02, 0.20, 'sawtooth', 0.22);
}

export function sfxCapture() {
  if (!guard()) return;
  const t = ctx.currentTime;
  [392, 523, 659].forEach((f, i) => tone(f, t + i * 0.09, 0.22, 'triangle', 0.30));
}

export function sfxTurn() {
  if (!guard()) return;
  const t = ctx.currentTime;
  tone(196, t, 0.5, 'sine', 0.28);
  tone(294, t + 0.05, 0.45, 'sine', 0.16);
}

export function sfxVictory() {
  if (!guard()) return;
  const t = ctx.currentTime;
  [392, 494, 587, 784].forEach((f, i) => tone(f, t + i * 0.13, 0.5, 'triangle', 0.32));
}

export function sfxDefeat() {
  if (!guard()) return;
  const t = ctx.currentTime;
  [330, 262, 208, 165].forEach((f, i) => tone(f, t + i * 0.15, 0.55, 'sawtooth', 0.24));
}

export function sfxTreasure() {
  if (!guard()) return;
  const t = ctx.currentTime;
  [880, 1175, 1568].forEach((f, i) => tone(f, t + i * 0.06, 0.18, 'sine', 0.22));
}
