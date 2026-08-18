// 战争迷雾（设计文档 01 章第九节）
//
// 三档：
//   off     全知 —— 原作初代的默认
//   memory  记忆制 —— 走过的地形与城市归属永久保留，敌军单位仅在视野内可见（默认）
//   strict  严格迷雾 —— 未探索区域全黑；城市归属回到「最后一次看到的状态」
//
// 已探索区域按位打包（15400 格 = 1925 字节），存档里走 base64，
// 比存一个几万元素的数组小两个数量级。

import { key } from './map.js';

export const VISION_UNIT = 2;    // 军团视野半径
export const VISION_CITY = 3;    // 城市视野半径

export function makeSeen(w, h) {
  return new Uint8Array(Math.ceil((w * h) / 8));
}

export const seenIndex = (map, x, y) => y * map.w + x;

export function markSeen(seen, map, x, y) {
  const i = seenIndex(map, x, y);
  seen[i >> 3] |= 1 << (i & 7);
}

export function isSeen(seen, map, x, y) {
  const i = seenIndex(map, x, y);
  return (seen[i >> 3] & (1 << (i & 7))) !== 0;
}

/** 当前这一刻某方能直接看到的格子 */
export function computeVisible(G, p, visionBonus = 0) {
  const vis = new Set();
  const add = (cx, cy, r) => {
    for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
      const x = cx + dx, y = cy + dy;
      if (x < 0 || y < 0 || x >= G.map.w || y >= G.map.h) continue;
      vis.add(key(x, y));
    }
  };
  for (const a of G.armies) {
    if (a.owner !== p) continue;
    add(a.x, a.y, VISION_UNIT + visionBonus);
  }
  for (const c of G.cities) {
    if (c.owner !== p) continue;
    add(c.x, c.y, VISION_CITY);
    add(c.x + 1, c.y + 1, VISION_CITY);
  }
  return vis;
}

/** 刷新某方的视野与已探索记录，并记下当下看到的城市归属 */
export function refreshFog(G, p) {
  if (G.fogMode === 'off') return null;
  if (!G.seen[p]) return null;   // 中立方（owner 0）不参战，没有视野记录
  const bonus = visionBonusOf(G, p);
  const vis = computeVisible(G, p, bonus);
  const seen = G.seen[p];
  for (const k of vis) markSeen(seen, G.map, k % 4096, Math.floor(k / 4096));

  // 记住看到的城市归属（记忆制靠它显示「最后一次看到的状态」）
  const mem = G.cityMemory[p] || (G.cityMemory[p] = {});
  for (const c of G.cities) {
    if (vis.has(key(c.x, c.y)) || vis.has(key(c.x + 1, c.y + 1))) {
      mem[c.id] = { owner: c.owner, razed: c.razed, size: c.size };
    }
  }
  G.visible[p] = vis;
  return vis;
}

function visionBonusOf(G, p) {
  let n = 0;
  for (const h of Object.values(G.heroes)) {
    if (!h.alive || h.faction !== p) continue;
    for (const id of h.items || []) {
      if (id === 'star_gem') n = Math.max(n, 3);   // 诺多的星辉宝石
    }
  }
  return n;
}

/** 某方此刻是否看得见该格 */
export function canSee(G, p, x, y) {
  if (G.fogMode === 'off') return true;
  const vis = G.visible[p];
  return !!vis && vis.has(key(x, y));
}

/** 某方是否探索过该格 */
export function hasExplored(G, p, x, y) {
  if (G.fogMode === 'off') return true;
  const seen = G.seen[p];
  return !!seen && isSeen(seen, G.map, x, y);
}

/** 该方眼中这座城的归属（记忆制下可能是过时情报） */
export function rememberedCity(G, p, city) {
  if (G.fogMode === 'off' || canSee(G, p, city.x, city.y)) return city;
  const mem = G.cityMemory[p] && G.cityMemory[p][city.id];
  return mem ? { ...city, owner: mem.owner, razed: mem.razed, stale: true } : null;
}

// ── 存档编解码 ────────────────────────────────────────────

const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

export function encodeSeen(seen) {
  let out = '';
  for (let i = 0; i < seen.length; i += 3) {
    const a = seen[i], b = seen[i + 1] || 0, c = seen[i + 2] || 0;
    const n = (a << 16) | (b << 8) | c;
    out += B64[(n >> 18) & 63] + B64[(n >> 12) & 63] + B64[(n >> 6) & 63] + B64[n & 63];
  }
  return out;
}

export function decodeSeen(str, bytes) {
  const out = new Uint8Array(bytes);
  let j = 0;
  for (let i = 0; i < str.length; i += 4) {
    const n = (B64.indexOf(str[i]) << 18) | (B64.indexOf(str[i + 1]) << 12)
            | (B64.indexOf(str[i + 2]) << 6) | B64.indexOf(str[i + 3]);
    if (j < bytes) out[j++] = (n >> 16) & 255;
    if (j < bytes) out[j++] = (n >> 8) & 255;
    if (j < bytes) out[j++] = n & 255;
  }
  return out;
}
