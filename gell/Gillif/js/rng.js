// 种子化随机数：sfc32，状态是 4 个 uint32，直接存进对局（G.rng），可序列化。
// 规则内核里的一切随机都必须走这里，绝不用 Math.random()——
// 同一个种子加同一串指令必须推演出同一个局面：测试靠它复现，日后联机也靠它。
// （画面特效的随机与局面无关，可以用 Math.random。）

// 把任意整数种子摊成 4 个状态字（splitmix32）
export function seedState(seed) {
  let s = seed >>> 0;
  const mix = () => {
    s = (s + 0x9e3779b9) >>> 0;
    let z = s;
    z = Math.imul(z ^ (z >>> 16), 0x85ebca6b) >>> 0;
    z = Math.imul(z ^ (z >>> 13), 0xc2b2ae35) >>> 0;
    return (z ^ (z >>> 16)) >>> 0;
  };
  const st = [mix(), mix(), mix(), mix()];
  for (let i = 0; i < 12; i++) nextU32(st); // 预热，打散相近种子
  return st;
}

export function nextU32(st) {
  let a = st[0] | 0, b = st[1] | 0, c = st[2] | 0, d = st[3] | 0;
  const t = (((a + b) | 0) + d) | 0;
  d = (d + 1) | 0;
  a = b ^ (b >>> 9);
  b = (c + (c << 3)) | 0;
  c = (c << 21) | (c >>> 11);
  c = (c + t) | 0;
  st[0] = a >>> 0; st[1] = b >>> 0; st[2] = c >>> 0; st[3] = d >>> 0;
  return t >>> 0;
}

/** [0, 1) */
export function rand(st) { return nextU32(st) / 4294967296; }

/** [lo, hi) 浮点 */
export function randRange(st, lo, hi) { return lo + (hi - lo) * rand(st); }

/** [lo, hi) 整数（不含 hi） */
export function randInt(st, lo, hi) { return lo + Math.floor(rand(st) * (hi - lo)); }

/** 原地洗牌 */
export function shuffle(st, arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = randInt(st, 0, i + 1);
    const t = arr[i]; arr[i] = arr[j]; arr[j] = t;
  }
  return arr;
}

/** 新对局的随机种子（只在建局时用一次，此后全部走种子） */
export function freshSeed() { return (Date.now() % 1000000) + 1; }
