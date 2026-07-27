// 确定性随机数（mulberry32）——联机同步的基石，引擎内禁止使用 Math.random
export function makeRng(seed) {
  let a = seed >>> 0;
  const rng = {
    next() {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    },
    int(n) { return Math.floor(rng.next() * n); },
    pick(arr) { return arr[rng.int(arr.length)]; },
    shuffle(arr) {
      const a2 = arr.slice();
      for (let i = a2.length - 1; i > 0; i--) {
        const j = rng.int(i + 1);
        [a2[i], a2[j]] = [a2[j], a2[i]];
      }
      return a2;
    },
    fork() { return makeRng(Math.floor(rng.next() * 0xFFFFFFFF)); },
  };
  return rng;
}
