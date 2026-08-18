// 地图：地形网格、地物、寻路与可达域

import { TERRAIN, CITY_SIZE } from '../data/terrain.js';
import { UNITS } from '../data/units.js';

export const MAX_STACK = 8;

export function buildMap(def) {
  if (def.rows.length !== def.h) throw new Error(`地图 ${def.id} 行数 ${def.rows.length} ≠ h ${def.h}`);
  def.rows.forEach((r, i) => {
    if (r.length !== def.w) throw new Error(`地图 ${def.id} 第 ${i} 行长度 ${r.length} ≠ w ${def.w}`);
  });

  const tiles = new Array(def.w * def.h);
  for (let y = 0; y < def.h; y++) {
    for (let x = 0; x < def.w; x++) {
      const ch = def.rows[y][x];
      if (!TERRAIN[ch]) throw new Error(`地图 ${def.id} (${x},${y}) 未知地形 '${ch}'`);
      tiles[y * def.w + x] = ch;
    }
  }

  // 城市把 2×2 范围压成 'C'
  const cityIndex = new Map();
  for (const c of def.cities) {
    for (let dy = 0; dy < 2; dy++) for (let dx = 0; dx < 2; dx++) {
      const x = c.x + dx, y = c.y + dy;
      tiles[y * def.w + x] = 'C';
      cityIndex.set(key(x, y), c.id);
    }
  }

  const featureIndex = new Map();
  for (const f of def.features) featureIndex.set(key(f.x, f.y), f);

  return { def, w: def.w, h: def.h, tiles, cityIndex, featureIndex };
}

export const key = (x, y) => y * 4096 + x;
export const unkey = (k) => ({ x: k % 4096, y: Math.floor(k / 4096) });

export function inBounds(map, x, y) { return x >= 0 && y >= 0 && x < map.w && y < map.h; }
export function terrainAt(map, x, y) { return TERRAIN[map.tiles[y * map.w + x]]; }
export function cityIdAt(map, x, y) { return map.cityIndex.get(key(x, y)) || null; }
export function featureAt(map, x, y) { return map.featureIndex.get(key(x, y)) || null; }

// 英雄不是兵种表里的条目，按标准陆行底盘处理：
// 不能飞、不能翻山、不能独自渡海，与普通步兵一致。
export const HERO_CHASSIS = 'edain_militia';

// 单个单位进入某格的移动消耗；Infinity 表示不可通行
export function moveCost(unitType, terr) {
  const u = UNITS[unitType] || UNITS[HERO_CHASSIS];
  const flags = u.flags || [];
  if (flags.includes('fly')) return 1;
  if (flags.includes('ship')) return terr.kind === 'water' || terr.kind === 'river' ? 1 : Infinity;
  if (terr.kind === 'water' || terr.kind === 'river') return Infinity;
  if (terr.kind === 'mountain') return flags.includes('mountaineer') ? 3 : Infinity;
  if (flags.includes('ignoreTerrain')) return 1;
  if (terr.id === 'T' && flags.includes('forestrider')) return 2;
  return terr.cost;
}

// 整支军团进入某格：取最贵者；任一单位不可通行则整体不可通行
export function stackCost(units, terr) {
  let max = 0;
  for (const u of units) {
    const c = moveCost(u.type, terr);
    if (c === Infinity) return Infinity;
    if (c > max) max = c;
  }
  return max;
}

const DIRS = [[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]];

export function neighbors(map, x, y) {
  const out = [];
  for (const [dx, dy] of DIRS) {
    const nx = x + dx, ny = y + dy;
    if (inBounds(map, nx, ny)) out.push([nx, ny]);
  }
  return out;
}

export function chebyshev(a, b) { return Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y)); }

/**
 * 军团的可达域。返回 Map: key → { spent, left, prev }
 * blockedBy(x,y) 由调用方给出（敌军团、满员己方格、敌城等），被挡的格子不进可达域。
 * 「保底一格」：只要还剩 > 0 移动点，就能再走一格，剩余归零（原作行为）。
 */
export function computeReach(map, army, budget, blockedBy) {
  const start = key(army.x, army.y);
  const best = new Map([[start, { spent: 0, left: budget, prev: null }]]);
  const queue = new MinHeap();
  queue.push(0, army.x, army.y);

  while (queue.size) {
    const [spent, x, y] = queue.pop();
    const cur = best.get(key(x, y));
    if (!cur || spent > cur.spent) continue;
    if (cur.left <= 0) continue;

    for (const [nx, ny] of neighbors(map, x, y)) {
      if (blockedBy && blockedBy(nx, ny)) continue;
      const step = stackCost(army.units, terrainAt(map, nx, ny));
      if (step === Infinity) continue;
      const nSpent = spent + step;
      const nLeft = Math.max(0, budget - nSpent);
      const k = key(nx, ny);
      const old = best.get(k);
      if (!old || nSpent < old.spent) {
        best.set(k, { spent: nSpent, left: nLeft, prev: key(x, y) });
        queue.push(nSpent, nx, ny);
      }
    }
  }
  best.delete(start);
  return best;
}

/**
 * 跨回合的完整路线：不受本回合移动点限制，按地形消耗跑全图 Dijkstra。
 * AI 用它来绕过河流与山脉 —— 只看直线距离的贪心会顶在河岸上走不动，
 * 因为没有任何相邻格能拉近距离。
 */
export function routePath(map, army, tx, ty, blockedBy) {
  const start = key(army.x, army.y), goal = key(tx, ty);
  const best = new Map([[start, { spent: 0, prev: null }]]);
  const queue = new MinHeap();
  queue.push(0, army.x, army.y);

  while (queue.size) {
    const [spent, x, y] = queue.pop();
    const k = key(x, y);
    if (k === goal) break;
    const cur = best.get(k);
    if (!cur || spent > cur.spent) continue;

    for (const [nx, ny] of neighbors(map, x, y)) {
      const nk = key(nx, ny);
      // 终点允许是被「阻挡」的格（敌城/敌军就是我们要打的目标）
      if (nk !== goal && blockedBy && blockedBy(nx, ny)) continue;
      const step = stackCost(army.units, terrainAt(map, nx, ny));
      if (step === Infinity) continue;
      const nSpent = spent + step;
      const old = best.get(nk);
      if (!old || nSpent < old.spent) {
        best.set(nk, { spent: nSpent, prev: k });
        queue.push(nSpent, nx, ny);
      }
    }
  }
  if (!best.has(goal)) return null;

  const path = [];
  let k = goal;
  while (k !== start) {
    path.unshift(unkey(k));
    k = best.get(k).prev;
    if (k == null) return null;
  }
  return path;
}

/** 二叉小顶堆：地图变大后，原来每次 sort 的队列会成为瓶颈 */
class MinHeap {
  constructor() { this.a = []; }
  get size() { return this.a.length; }
  push(cost, x, y) {
    const a = this.a;
    a.push([cost, x, y]);
    let i = a.length - 1;
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (a[p][0] <= a[i][0]) break;
      [a[p], a[i]] = [a[i], a[p]];
      i = p;
    }
  }
  pop() {
    const a = this.a;
    const top = a[0];
    const last = a.pop();
    if (a.length) {
      a[0] = last;
      let i = 0;
      for (;;) {
        const l = i * 2 + 1, r = l + 1;
        let m = i;
        if (l < a.length && a[l][0] < a[m][0]) m = l;
        if (r < a.length && a[r][0] < a[m][0]) m = r;
        if (m === i) break;
        [a[m], a[i]] = [a[i], a[m]];
        i = m;
      }
    }
    return top;
  }
}

export function pathTo(reach, army, tx, ty) {
  const path = [];
  let k = key(tx, ty);
  while (k != null && k !== key(army.x, army.y)) {
    path.unshift(unkey(k));
    const node = reach.get(k);
    if (!node) return null;
    k = node.prev;
  }
  return path;
}

export function citySizeInfo(size) { return CITY_SIZE[size]; }
