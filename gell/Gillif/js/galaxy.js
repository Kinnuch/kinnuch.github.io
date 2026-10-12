// 星系生成：同心环布点 → 按离中心由近到远逐星连航线 → 补连通 → 选母星。
// 只依赖种子，不碰 DOM；同一种子、同一类型永远生成同一张星图。

import { seedState, randRange, shuffle } from './rng.js';
import { ANOMALY_POOL } from './rules.js';

// 六种星系。inner / outer 是「最中心的星想要几条航线 → 最外圈的星想要几条」，
// curve 是从中心到外圈的过渡曲线（Hermite 关键帧：[t, 值, 入切线, 出切线]）。
// 曲线先升后平：大部分星都接近 outer；曲线先降：中心反而航线少（空心环）。
export const GALAXY_TYPES = {
  small: {
    name: '小型', desc: '15 颗星，最多 3 方', stars: 15, scale: 1.15, inner: 4, outer: 1, maxFactions: 3,
    curve: [[0, 0, 2.445, 2.445], [0.723, 0.504, 0.393, 0.393], [1, 0.803, 1.081, 1.081]],
  },
  medium: {
    name: '中型', desc: '23 颗星，最多 5 方', stars: 23, scale: 1, inner: 4, outer: 1, maxFactions: 5,
    curve: [[0, 0, 2.445, 2.445], [0.92, 0.849, 1.402, 1.402], [1, 1, 1.882, 1.882]],
  },
  large: {
    name: '大型', desc: '32 颗星，最多 6 方', stars: 32, scale: 1, inner: 4, outer: 1, maxFactions: 6,
    curve: [[0, 0, 2.445, 2.445], [0.953, 0.859, 1.959, 1.959], [1, 1, 3.016, 3.016]],
  },
  defensible: {
    name: '要塞', desc: '23 颗星，咽喉要道多', stars: 23, scale: 1, inner: 1, outer: 4, maxFactions: 5,
    curve: [[0, 0, 0, 0], [1, 1, 3.086, 3.086]],
  },
  desolate: {
    name: '荒疏', desc: '32 颗星，航线稀少', stars: 32, scale: 1, inner: 2, outer: 1, maxFactions: 6,
    curve: [[0, 1, 0.015, 0.015], [0.44, 0.51, -2.82, -2.82], [1, 0, -0.013, -0.013]],
  },
  imploded: {
    name: '空心环', desc: '32 颗星，中心空洞的环形星系', stars: 32, scale: 1, inner: 4, outer: 0, maxFactions: 6,
    curve: [[0, 1, 0.015, 0.015], [0.44, 0.51, -2.82, -2.82], [1, 0, -0.013, -0.013]],
  },
};

// 生成参数（世界单位；一颗星的视觉半径约 0.6）
export const GEN = {
  ringStep: 2,          // 同心环半径步长：1, 3, 5 …
  slotLen: 5,           // 环上每隔多长放一个位置
  angleJitter: 0.25,    // 角度抖动，占一个位置所对圆心角的比例
  radiusJitter: 1,      // 半径抖动 ±1
  band: 12,             // 星系纵向半宽（横向不限，所以是一条宽带）
  gapCore: 3,           // 最小星距：中心 3 → 半径 8 以外 4
  gapRim: 4,
  maxRoute: 10,         // 航线最长（乘星系缩放）
  minAngle: 25,         // 同一颗星上任意两条航线的最小夹角（度）
  towardCenter: 0.2,    // 挑邻居时参照点从本星往中心挪 20%：航线略偏向内侧
  homeSpacing: 5,       // 母星之间至少隔几跳，选不出就逐步放宽到 1
};

// ——— 几何小工具 ———

function evalCurve(keys, t) {
  if (t <= keys[0][0]) return keys[0][1];
  const last = keys[keys.length - 1];
  if (t >= last[0]) return last[1];
  for (let i = 0; i < keys.length - 1; i++) {
    const k0 = keys[i], k1 = keys[i + 1];
    if (t > k1[0]) continue;
    const dt = k1[0] - k0[0];
    const s = (t - k0[0]) / dt, s2 = s * s, s3 = s2 * s;
    return (2 * s3 - 3 * s2 + 1) * k0[1] + (s3 - 2 * s2 + s) * k0[3] * dt
      + (-2 * s3 + 3 * s2) * k1[1] + (s3 - s2) * k1[2] * dt;
  }
  return last[1];
}

const lerp = (a, b, t) => a + (b - a) * t;
const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

function orient(ax, ay, bx, by, cx, cy) { return (bx - ax) * (cy - ay) - (by - ay) * (cx - ax); }

/** 两条线段是否真正相交（端点相接、共线不算） */
export function segmentsCross(p1, p2, p3, p4) {
  const d1 = orient(p3.x, p3.y, p4.x, p4.y, p1.x, p1.y);
  const d2 = orient(p3.x, p3.y, p4.x, p4.y, p2.x, p2.y);
  const d3 = orient(p1.x, p1.y, p2.x, p2.y, p3.x, p3.y);
  const d4 = orient(p1.x, p1.y, p2.x, p2.y, p4.x, p4.y);
  if (d1 === 0 || d2 === 0 || d3 === 0 || d4 === 0) return false;
  return (d1 > 0) !== (d2 > 0) && (d3 > 0) !== (d4 > 0);
}

/** 从 o 看 p、q 两个方向的夹角（度） */
export function angleAt(o, p, q) {
  const ax = p.x - o.x, ay = p.y - o.y, bx = q.x - o.x, by = q.y - o.y;
  const la = Math.hypot(ax, ay), lb = Math.hypot(bx, by);
  if (la === 0 || lb === 0) return 0;
  const c = Math.max(-1, Math.min(1, (ax * bx + ay * by) / (la * lb)));
  return (Math.acos(c) * 180) / Math.PI;
}

// ——— 生成 ———

/**
 * @returns {{type, seed, scale, stars:{id,x,y,size,tint}[], routes:[number,number][],
 *            links:number[][], center:{x,y}, radius:number}}
 */
export function generateGalaxy(typeKey, seed) {
  const T = GALAXY_TYPES[typeKey];
  if (!T) throw new Error('未知星系类型：' + typeKey);
  const st = seedState((seed ^ 0x6a09e667) >>> 0);
  const scale = T.scale;

  // 1. 同心环布点
  const pts = [];
  const tooClose = (p) => {
    let t = clamp01(Math.hypot(p.x, p.y) / scale / 8);
    t = lerp(t, t * t, 0.5);
    const gap = lerp(GEN.gapCore, GEN.gapRim, t) * scale;
    return pts.some((q) => dist(p, q) < gap);
  };
  for (let r = 1; pts.length < T.stars && r < 200; r += GEN.ringStep) {
    const slots = Math.max(1, Math.round((2 * Math.PI * r) / GEN.slotLen));
    const step = 360 / slots;
    let ang = randRange(st, 0, 360);
    let fails = 0;
    for (let i = 0; i < slots && pts.length < T.stars; i++) {
      const rr = r + randRange(st, -GEN.radiusJitter, GEN.radiusJitter);
      const jit = step * GEN.angleJitter;
      const a = (randRange(st, ang - jit, ang + jit) * Math.PI) / 180;
      ang += step;
      const ux = Math.sin(a) * rr, uy = Math.cos(a) * rr;
      const p = { x: ux * scale, y: uy * scale };
      if (Math.abs(uy) < GEN.band && !tooClose(p)) { pts.push(p); continue; }
      ang += step * GEN.angleJitter;
      if (++fails > 20) break;
    }
  }

  // 视觉属性：大小 0.8–1.2，中立时的底色（亮度归一）
  const stars = pts.map((p, i) => {
    const size = randRange(st, 0.8, 1.2);
    const c = [randRange(st, 0.3, 1), randRange(st, 0.3, 1), randRange(st, 0.3, 1)];
    const m = Math.max(...c);
    return { id: i, x: p.x, y: p.y, size, tint: c.map((v) => v / m) };
  });

  // 2. 航线
  const routes = [];
  const links = stars.map(() => []);
  const has = (a, b) => links[a].includes(b);
  const canLink = (a, b) => {
    if (a === b || has(a, b)) return false;
    const A = stars[a], B = stars[b];
    if (dist(A, B) > GEN.maxRoute * scale) return false;
    // 两端各缩 1%，与已有航线不得交叉
    const p1 = { x: lerp(A.x, B.x, 0.01), y: lerp(A.y, B.y, 0.01) };
    const p2 = { x: lerp(A.x, B.x, 0.99), y: lerp(A.y, B.y, 0.99) };
    for (const [u, v] of routes) if (segmentsCross(p1, p2, stars[u], stars[v])) return false;
    // 两端与各自已有航线的夹角不得小于 minAngle
    for (const n of links[a]) if (angleAt(A, B, stars[n]) < GEN.minAngle) return false;
    for (const n of links[b]) if (angleAt(B, A, stars[n]) < GEN.minAngle) return false;
    return true;
  };
  const addRoute = (a, b) => { routes.push([a, b]); links[a].push(b); links[b].push(a); };

  const box = bounds(stars);
  const center = { x: (box.x0 + box.x1) / 2, y: (box.y0 + box.y1) / 2 };
  const reach = Math.max(box.x1 - box.x0, box.y1 - box.y0) / 2 * 1.2 || 1;
  const order = stars.slice().sort((p, q) => Math.hypot(p.x, p.y) - Math.hypot(q.x, q.y) || p.id - q.id);
  for (const s of order) {
    const t = evalCurve(T.curve, clamp01(dist(s, center) / reach));
    const want = Math.round(lerp(T.inner, T.outer, t));
    if (links[s.id].length >= want) continue;
    const ref = { x: lerp(s.x, center.x, GEN.towardCenter), y: lerp(s.y, center.y, GEN.towardCenter) };
    let cand = stars.filter((o) => canLink(s.id, o.id)).sort((p, q) => dist(p, ref) - dist(q, ref) || p.id - q.id);
    while (links[s.id].length < want && cand.length) {
      addRoute(s.id, cand.shift().id);
      if (links[s.id].length < want) cand = cand.filter((o) => canLink(s.id, o.id));
    }
  }

  // 3. 补连通：把每个孤立的子图用最短、不交叉的航线接到主图上；实在接不上的星直接去掉
  const dropped = connectComponents(stars, routes, links, canLinkLoose(stars, routes, links));
  const kept = stars.filter((s) => !dropped.has(s.id));
  const remap = new Map(kept.map((s, i) => [s.id, i]));
  const finalStars = kept.map((s, i) => ({ ...s, id: i }));
  const finalRoutes = routes.filter(([a, b]) => remap.has(a) && remap.has(b)).map(([a, b]) => [remap.get(a), remap.get(b)]);
  const finalLinks = finalStars.map(() => []);
  for (const [a, b] of finalRoutes) { finalLinks[a].push(b); finalLinks[b].push(a); }

  // 4. 异常天体：按每 32 颗星的配额洗牌后取前 N 个（小星系的异常相应更少）。
  //    用独立的随机流，不影响上面的布点与连线。
  const ast = seedState((seed ^ 0x1f83d9ab) >>> 0);
  const pool = [];
  for (const [k, n] of Object.entries(ANOMALY_POOL)) for (let i = 0; i < n; i++) pool.push(k);
  while (pool.length < 32) pool.push(null);
  shuffle(ast, pool);
  finalStars.forEach((s, i) => { s.anomaly = pool[i] ?? null; });

  const fb = bounds(finalStars);
  return {
    type: typeKey, seed, scale,
    stars: finalStars, routes: finalRoutes, links: finalLinks,
    center: { x: (fb.x0 + fb.x1) / 2, y: (fb.y0 + fb.y1) / 2 },
    bounds: fb,
  };
}

function bounds(stars) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const s of stars) { x0 = Math.min(x0, s.x); x1 = Math.max(x1, s.x); y0 = Math.min(y0, s.y); y1 = Math.max(y1, s.y); }
  return { x0, y0, x1, y1 };
}

// 补连通时放宽：不限长度、不看夹角，只要求不交叉
function canLinkLoose(stars, routes, links) {
  return (a, b) => {
    if (a === b || links[a].includes(b)) return false;
    const A = stars[a], B = stars[b];
    const p1 = { x: lerp(A.x, B.x, 0.01), y: lerp(A.y, B.y, 0.01) };
    const p2 = { x: lerp(A.x, B.x, 0.99), y: lerp(A.y, B.y, 0.99) };
    for (const [u, v] of routes) if (segmentsCross(p1, p2, stars[u], stars[v])) return false;
    // 也不能从别的星身上穿过去
    for (const o of stars) {
      if (o.id === a || o.id === b) continue;
      if (pointSegDist(o, A, B) < 0.9) return false;
    }
    return true;
  };
}

function pointSegDist(p, a, b) {
  const vx = b.x - a.x, vy = b.y - a.y;
  const L = vx * vx + vy * vy || 1;
  const t = clamp01(((p.x - a.x) * vx + (p.y - a.y) * vy) / L);
  return Math.hypot(a.x + vx * t - p.x, a.y + vy * t - p.y);
}

function components(n, links, skip) {
  const comp = new Array(n).fill(-1);
  const list = [];
  for (let i = 0; i < n; i++) {
    if (comp[i] >= 0 || skip.has(i)) continue;
    const id = list.length, members = [];
    const stack = [i];
    comp[i] = id;
    while (stack.length) {
      const u = stack.pop();
      members.push(u);
      for (const v of links[u]) if (comp[v] < 0 && !skip.has(v)) { comp[v] = id; stack.push(v); }
    }
    list.push(members);
  }
  return list;
}

function connectComponents(stars, routes, links, canLink) {
  const dropped = new Set();
  for (let guard = 0; guard < 64; guard++) {
    const comps = components(stars.length, links, dropped);
    if (comps.length <= 1) break;
    comps.sort((p, q) => q.length - p.length || p[0] - q[0]);
    const main = comps[0];
    let best = null;
    for (const c of comps.slice(1)) {
      for (const a of c) for (const b of main) {
        if (!canLink(a, b)) continue;
        const d = dist(stars[a], stars[b]);
        if (!best || d < best.d) best = { a, b, d };
      }
    }
    if (best) {
      routes.push([best.a, best.b]); links[best.a].push(best.b); links[best.b].push(best.a);
    } else {
      // 哪个都接不上：去掉最小的那块
      const smallest = comps[comps.length - 1];
      for (const s of smallest) dropped.add(s);
    }
  }
  return dropped;
}

/** 全图跳数（BFS），hops[a][b] */
export function hopTable(links) {
  const n = links.length;
  return links.map((_, src) => {
    const d = new Array(n).fill(Infinity);
    d[src] = 0;
    const q = [src];
    for (let h = 0; h < q.length; h++) {
      const u = q[h];
      for (const v of links[u]) if (d[v] === Infinity) { d[v] = d[u] + 1; q.push(v); }
    }
    return d;
  });
}

/**
 * 选母星：从最外圈往里挑，跳过星云和只有一条航线的星，并与已选母星至少隔 spacing 跳；
 * 选不齐就把 spacing 逐步放宽到 1。返回的数组按势力顺序随机排过（玩家不总在最外面）。
 */
export function chooseHomes(gal, count, seed) {
  const st = seedState((seed ^ 0x3c6ef372) >>> 0);
  const hops = hopTable(gal.links);
  const order = gal.stars.slice().sort((p, q) => dist(q, gal.center) - dist(p, gal.center) || p.id - q.id);
  for (let spacing = GEN.homeSpacing; spacing >= 1; spacing--) {
    const homes = [];
    for (let f = 0; f < count; f++) {
      const pick = order.find((s) => gal.links[s.id].length > 1 && s.anomaly !== 'nebula' && !homes.includes(s.id)
        && homes.every((h) => hops[h][s.id] > spacing));
      if (!pick) break;
      homes.push(pick.id);
    }
    if (homes.length === count) return shuffle(st, homes);
  }
  // 兜底（极小星系）：随便挑互不相同的有航线的星
  const any = order.filter((s) => gal.links[s.id].length > 0 && s.anomaly !== 'nebula').map((s) => s.id).slice(0, count);
  return shuffle(st, any);
}
