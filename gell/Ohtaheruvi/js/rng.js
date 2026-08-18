// 种子化随机数：xorshift32。
// 全局对局的一切随机都必须走这里，绝不使用 Math.random()，
// 这样同一存档能重放出同一结果，bug 可复现、战报可回看。

export function makeRng(seed) {
  let s = (seed | 0) || 0x9e3779b9;
  const next = () => {
    s ^= s << 13; s |= 0;
    s ^= s >>> 17;
    s ^= s << 5;  s |= 0;
    return (s >>> 0) / 4294967296;
  };
  return {
    get seed() { return s; },
    set seed(v) { s = (v | 0) || 0x9e3779b9; },
    float: next,
    // 1..n
    die: (n) => 1 + Math.floor(next() * n),
    int: (n) => Math.floor(next() * n),
    pick: (arr) => arr[Math.floor(next() * arr.length)],
    chance: (p) => next() < p,
    // 按权重表抽取：[[值, 权重], ...]
    weighted(table) {
      const total = table.reduce((a, [, w]) => a + w, 0);
      let r = next() * total;
      for (const [v, w] of table) { r -= w; if (r < 0) return v; }
      return table[table.length - 1][0];
    },
  };
}

// 一次性用的独立发生器（战前胜率预估等），不污染对局种子
export function scratchRng(seed) { return makeRng(seed); }

export function hash2(x, y) {
  let h = (x * 374761393 + y * 668265263) | 0;
  h = (h ^ (h >>> 13)) * 1274126177 | 0;
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
