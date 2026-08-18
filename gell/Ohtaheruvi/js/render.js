// Canvas 2D 渲染。M1 用程序化占位美术（纯几何笔触），
// M4 会替换为图集 + 47-blob 自动拼接；接口保持不变。

import { TERRAIN, CITY_SIZE } from '../data/terrain.js';
import { FACTIONS } from '../data/factions.js';
import { terrainAt, featureAt, cityIdAt, inBounds } from './map.js';
import { hash2 } from './rng.js';
import { isHero, heroOf, unitStr, unitSwatch, unitName } from './unit.js';
import { armyAt, cityAt, cityById, stackBudget } from './state.js';
import { canSee, hasExplored, rememberedCity } from './fog.js';
import { portrait } from './portraits.js';
import { groupOf, paletteOf, neighbourMask, blobPath, blobEdge, decorate, drawCoast, GROUND } from './tiles.js';

// 地形按 16×16 格分块烘到离屏画布上，只在缩放或地形变化时重画。
// 不做缓存的话，每帧要为几百格各算十几条路径，大图上会掉帧。
const CHUNK = 16;

export const ZOOMS = [24, 32, 48, 64, 96];

export function createView(canvas, G) {
  return {
    canvas, ctx: canvas.getContext('2d'), G,
    viewer: G.humans[0] ?? G.players[0],   // 以谁的视角看这张图
    tile: 48, cam: { x: 0, y: 0 },
    reach: null, selected: null, hover: null, attackTargets: null,
    dpr: Math.min(2, window.devicePixelRatio || 1),
  };
}

function chunkKey(cx, cy) { return cy * 1024 + cx; }

export function invalidateTerrain(view) {
  if (view.chunks) view.chunks.clear();
}

/** 取一块地形的离屏画布，没有就现烘一张 */
function getChunk(view, cx, cy) {
  if (!view.chunks) view.chunks = new Map();
  const k = chunkKey(cx, cy);
  const hit = view.chunks.get(k);
  if (hit && hit.tile === view.tile) return hit.canvas;

  const { G, tile } = view;
  const px = CHUNK * tile;
  const cv = document.createElement('canvas');
  cv.width = Math.round(px * view.dpr);
  cv.height = Math.round(px * view.dpr);
  const c = cv.getContext('2d');
  c.setTransform(view.dpr, 0, 0, view.dpr, 0, 0);

  const x0 = cx * CHUNK, y0 = cy * CHUNK;
  // 先铺一层「地」，其余地貌都盖在它上面 —— 这样地貌之间自然过渡
  c.fillStyle = GROUND.light;
  c.fillRect(0, 0, px, px);

  // 多画一圈边界外的格子，保证跨块的色块能接上
  for (let y = y0 - 1; y < y0 + CHUNK + 1; y++) {
    for (let x = x0 - 1; x < x0 + CHUNK + 1; x++) {
      if (x < 0 || y < 0 || x >= G.map.w || y >= G.map.h) continue;
      paintTile(view, c, x, y, (x - x0) * tile, (y - y0) * tile);
    }
  }
  // 块内的地物画在地貌之上
  for (let y = y0 - 1; y < y0 + CHUNK + 1; y++) {
    for (let x = x0 - 1; x < x0 + CHUNK + 1; x++) {
      if (x < 0 || y < 0 || x >= G.map.w || y >= G.map.h) continue;
      const f = featureAt(G.map, x, y);
      if (f) drawFeatureOn(view, c, f, (x - x0) * tile, (y - y0) * tile);
    }
  }

  view.chunks.set(k, { tile: view.tile, canvas: cv });
  if (view.chunks.size > 220) {          // 缓存上限，够覆盖屏幕好几屏
    const first = view.chunks.keys().next().value;
    view.chunks.delete(first);
  }
  return cv;
}

/** 画一格地形：有机色块 + 笔触装饰 */
function paintTile(view, c, x, y, rx, ry) {
  const { G, tile } = view;
  const id = G.map.tiles[y * G.map.w + x];
  const group = groupOf(id);
  const pal = paletteOf(group);

  if (group !== 'ground') {
    const mask = neighbourMask(G.map, x, y, group);
    c.save();
    blobPath(c, rx, ry, tile, mask);
    c.fillStyle = pal.fill;
    c.fill();
    c.strokeStyle = pal.edge;
    c.lineWidth = Math.max(1, tile * 0.045);
    c.lineJoin = 'round';
    blobEdge(c, rx, ry, tile, mask);      // 只描外沿，不然色块内部全是接缝
    c.restore();
    if (group === 'water') drawCoast(c, rx, ry, tile, mask);
  }
  decorate(c, group, rx, ry, tile, x, y, pal);

  // 道路与桥画在最上层，且按邻接方向连线
  if (id === 'R') drawRoadOn(view, c, x, y, rx, ry);
  if (id === 'D') drawBridgeOn(view, c, x, y, rx, ry);
  if (id === 'C') drawCityGroundOn(c, rx, ry, tile);
}

function drawCityGroundOn(c, rx, ry, t) {
  c.fillStyle = '#c8b48a';
  c.fillRect(rx, ry, t, t);
  c.strokeStyle = 'rgba(74,58,36,.35)';
  c.lineWidth = 1;
  c.strokeRect(rx + .5, ry + .5, t - 1, t - 1);
}

export function resize(view) {
  const { canvas } = view;
  const rect = canvas.getBoundingClientRect();
  canvas.width = Math.round(rect.width * view.dpr);
  canvas.height = Math.round(rect.height * view.dpr);
  view.ctx.setTransform(view.dpr, 0, 0, view.dpr, 0, 0);
  view.vw = rect.width; view.vh = rect.height;
  clampCam(view);
}

export function clampCam(view) {
  const { G, tile } = view;
  const maxX = Math.max(0, G.map.w * tile - view.vw);
  const maxY = Math.max(0, G.map.h * tile - view.vh);
  view.cam.x = Math.min(maxX, Math.max(0, view.cam.x));
  view.cam.y = Math.min(maxY, Math.max(0, view.cam.y));
}

export function centerOn(view, x, y) {
  view.cam.x = x * view.tile - view.vw / 2;
  view.cam.y = y * view.tile - view.vh / 2;
  clampCam(view);
}

export function screenToTile(view, sx, sy) {
  return {
    x: Math.floor((sx + view.cam.x) / view.tile),
    y: Math.floor((sy + view.cam.y) / view.tile),
  };
}

export function setZoom(view, tile, anchor) {
  if (view.tile !== tile) invalidateTerrain(view);   // 换了格子尺寸，烘好的块作废
  const a = anchor || { x: view.vw / 2, y: view.vh / 2 };
  const wx = (view.cam.x + a.x) / view.tile;
  const wy = (view.cam.y + a.y) / view.tile;
  view.tile = tile;
  view.cam.x = wx * tile - a.x;
  view.cam.y = wy * tile - a.y;
  clampCam(view);
}

// ── 绘制 ──────────────────────────────────────────────────

export function draw(view) {
  const { ctx, G, tile } = view;
  ctx.clearRect(0, 0, view.vw, view.vh);

  const x0 = Math.max(0, Math.floor(view.cam.x / tile));
  const y0 = Math.max(0, Math.floor(view.cam.y / tile));
  const x1 = Math.min(G.map.w - 1, Math.ceil((view.cam.x + view.vw) / tile));
  const y1 = Math.min(G.map.h - 1, Math.ceil((view.cam.y + view.vh) / tile));

  // 地形：贴已烘好的块（块内已含地貌、道路、桥、地物），再逐格叠迷雾。
  // 相机取整 + 相邻块重叠不到一个像素 —— 否则拖动到小数位置时，
  // 块与块的交界会在非整数 devicePixelRatio 下插值出一条黑缝。
  const camX = Math.round(view.cam.x), camY = Math.round(view.cam.y);
  const cx0 = Math.floor(x0 / CHUNK), cx1 = Math.floor(x1 / CHUNK);
  const cy0 = Math.floor(y0 / CHUNK), cy1 = Math.floor(y1 / CHUNK);
  const span = CHUNK * tile;
  for (let cy = cy0; cy <= cy1; cy++) {
    for (let cx = cx0; cx <= cx1; cx++) {
      const cv = getChunk(view, cx, cy);
      ctx.drawImage(cv, cx * span - camX, cy * span - camY, span + 0.75, span + 0.75);
    }
  }

  const fog = G.fogMode !== 'off';
  if (fog) {
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      if (!hasExplored(G, view.viewer, x, y)) drawUnexplored(view, x, y);
      else if (!canSee(G, view.viewer, x, y)) drawDim(view, x, y);
    }
  }

  // 可达域：填充 + 外轮廓线（只靠填色在农地上几乎看不出来）
  if (view.reach) {
    ctx.save();
    const inReach = (x, y) => view.reach.has(y * 4096 + x);
    for (const k of view.reach.keys()) {
      const x = k % 4096, y = Math.floor(k / 4096);
      if (x < x0 - 1 || x > x1 + 1 || y < y0 - 1 || y > y1 + 1) continue;
      const node = view.reach.get(k);
      const [rx, ry, w, h] = rectOf(view, x, y);
      ctx.fillStyle = node.left > 0 ? 'rgba(226,188,96,0.34)' : 'rgba(226,188,96,0.17)';
      ctx.fillRect(rx, ry, w, h);
    }
    // 边界描线
    ctx.strokeStyle = '#e8c165';
    ctx.lineWidth = Math.max(2, view.tile / 20);
    ctx.lineCap = 'square';
    ctx.beginPath();
    for (const k of view.reach.keys()) {
      const x = k % 4096, y = Math.floor(k / 4096);
      if (x < x0 - 1 || x > x1 + 1 || y < y0 - 1 || y > y1 + 1) continue;
      const [rx, ry, w, h] = rectOf(view, x, y);
      if (!inReach(x, y - 1)) { ctx.moveTo(rx, ry); ctx.lineTo(rx + w, ry); }
      if (!inReach(x, y + 1)) { ctx.moveTo(rx, ry + h); ctx.lineTo(rx + w, ry + h); }
      if (!inReach(x - 1, y)) { ctx.moveTo(rx, ry); ctx.lineTo(rx, ry + h); }
      if (!inReach(x + 1, y)) { ctx.moveTo(rx + w, ry); ctx.lineTo(rx + w, ry + h); }
    }
    ctx.stroke();
    ctx.restore();
  }
  if (view.attackTargets) {
    ctx.save();
    ctx.strokeStyle = '#c0392b'; ctx.lineWidth = 3;
    for (const t of view.attackTargets) {
      const [rx, ry, w, h] = rectOf(view, t.x, t.y);
      ctx.strokeRect(rx + 2, ry + 2, w - 4, h - 4);
    }
    ctx.restore();
  }

  for (const c of G.cities) {
    if (!fog) { drawCity(view, c, x0, y0, x1, y1); continue; }
    if (!hasExplored(G, view.viewer, c.x, c.y)) continue;
    const shown = rememberedCity(G, view.viewer, c);
    if (shown) drawCity(view, shown, x0, y0, x1, y1);
  }
  // 敌军只在视野内可见；己方永远可见
  for (const a of G.armies) {
    if (a.x < x0 - 1 || a.x > x1 + 1 || a.y < y0 - 1 || a.y > y1 + 1) continue;
    if (fog && a.owner !== view.viewer && !canSee(G, view.viewer, a.x, a.y)) continue;
    drawArmy(view, a);
  }
  for (const d of G.dropped || []) drawDrop(view, d);

  if (view.selected) {
    const [rx, ry, w, h] = rectOf(view, view.selected.x, view.selected.y);
    ctx.save();
    ctx.strokeStyle = '#d4af5a'; ctx.lineWidth = 3;
    ctx.strokeRect(rx + 1.5, ry + 1.5, w - 3, h - 3);
    ctx.restore();
  }
  if (view.battleFx) drawBattleFx(view);

  if (view.hover && inBounds(G.map, view.hover.x, view.hover.y)) {
    const [rx, ry, w, h] = rectOf(view, view.hover.x, view.hover.y);
    ctx.save();
    ctx.strokeStyle = 'rgba(255,255,255,.5)'; ctx.lineWidth = 1.5;
    ctx.strokeRect(rx + 0.75, ry + 0.75, w - 1.5, h - 1.5);
    ctx.restore();
  }
}

/**
 * 战斗特效：两侧肖像在目标格上方对冲，命中时抖动并熄灭一颗耐久点。
 * 只是画面表现 —— 胜负早在 combat.js 里算完了，这里不影响任何结果。
 */
function drawBattleFx(view) {
  const { ctx, tile } = view;
  const fx = view.battleFx;
  const [rx, ry] = rectOf(view, fx.x, fx.y);
  const cx = rx + tile / 2, cy = ry + tile / 2;
  const size = Math.max(34, tile * 0.9);
  const gap = size * 0.62;
  const shake = fx.shake ? (Math.random() - 0.5) * size * 0.16 : 0;

  ctx.save();
  // 底衬：让对冲的两枚肖像从地形里跳出来
  ctx.fillStyle = 'rgba(20,16,10,.55)';
  ctx.beginPath();
  ctx.ellipse(cx, cy, size * 1.5, size * 0.95, 0, 0, Math.PI * 2);
  ctx.fill();

  const side = (info, dx, flip) => {
    if (!info) return;
    const px = cx + dx + (flip ? -shake : shake);
    const pic = portrait(info.hero ? 'hero' : info.type, Math.round(size), info.hero);
    ctx.drawImage(pic, px - size / 2, cy - size / 2 - size * 0.12, size, size);
    // 耐久点
    const pips = info.maxHp || 2;
    const w = size * 0.16, h = size * 0.10, gapx = size * 0.05;
    const total = pips * w + (pips - 1) * gapx;
    for (let i = 0; i < pips; i++) {
      ctx.fillStyle = i < info.hp ? '#6fbf4a' : 'rgba(0,0,0,.5)';
      ctx.fillRect(px - total / 2 + i * (w + gapx), cy + size * 0.46, w, h);
      ctx.strokeStyle = 'rgba(20,16,10,.8)';
      ctx.lineWidth = 1;
      ctx.strokeRect(px - total / 2 + i * (w + gapx), cy + size * 0.46, w, h);
    }
  };
  side(fx.att, -gap, false);
  side(fx.def, gap, true);

  // 交击的火花
  if (fx.shake) {
    ctx.strokeStyle = '#ffd98a';
    ctx.lineWidth = Math.max(2, size * 0.06);
    ctx.beginPath();
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2 + fx.step;
      ctx.moveTo(cx + Math.cos(a) * size * 0.18, cy + Math.sin(a) * size * 0.18);
      ctx.lineTo(cx + Math.cos(a) * size * 0.40, cy + Math.sin(a) * size * 0.40);
    }
    ctx.stroke();
  }
  ctx.restore();
}

// 未探索：整片羊皮纸下的暗影
function drawUnexplored(view, x, y) {
  const { ctx, tile } = view;
  const [rx, ry] = rectOf(view, x, y);
  ctx.fillStyle = '#181410';
  ctx.fillRect(rx, ry, tile, tile);
  ctx.globalAlpha = 0.05 + hash2(x, y) * 0.05;
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(rx, ry, tile, tile);
  ctx.globalAlpha = 1;
}

// 已探索但此刻看不见：地形照画，压一层暗色表示「这是旧情报」
function drawDim(view, x, y) {
  const { ctx, tile } = view;
  const [rx, ry] = rectOf(view, x, y);
  ctx.fillStyle = 'rgba(20,16,10,0.42)';
  ctx.fillRect(rx, ry, tile, tile);
}

function rectOf(view, x, y) {
  return [x * view.tile - view.cam.x, y * view.tile - view.cam.y, view.tile, view.tile];
}

// 道路是否延伸到该格：路、浅滩（桥）与城门都算
function isRoadish(map, x, y) {
  if (!inBounds(map, x, y)) return false;
  const id = map.tiles[y * map.w + x];
  return id === 'R' || id === 'D' || id === 'C';
}

/** 道路：从格心向每个有路的正交邻格连一段，孤立时画个小路口 */
function drawRoadOn(view, ctx, x, y, rx, ry) {
  const { G, tile } = view;
  const cx = rx + tile / 2, cy = ry + tile / 2;
  const dirs = [[0, -1, cx, ry], [0, 1, cx, ry + tile], [-1, 0, rx, cy], [1, 0, rx + tile, cy]];
  ctx.save();
  ctx.globalAlpha = 0.62;
  ctx.strokeStyle = '#8a7550';
  ctx.lineWidth = tile * 0.26;
  ctx.lineCap = 'round';
  let drew = false;
  ctx.beginPath();
  for (const [dx, dy, ex, ey] of dirs) {
    if (!isRoadish(G.map, x + dx, y + dy)) continue;
    ctx.moveTo(cx, cy); ctx.lineTo(ex, ey);
    drew = true;
  }
  if (!drew) { ctx.moveTo(cx - tile * 0.2, cy); ctx.lineTo(cx + tile * 0.2, cy); }
  ctx.stroke();
  ctx.restore();
}

/** 桥：跨在浅滩上的木质桥面，横竖方向由相邻的路决定 */
function drawBridgeOn(view, ctx, x, y, rx, ry) {
  const { G, tile } = view;
  const s = tile / 48;
  const vertical = isRoadish(G.map, x, y - 1) || isRoadish(G.map, x, y + 1);
  const w = tile * 0.5;

  ctx.save();
  ctx.translate(rx + tile / 2, ry + tile / 2);
  if (!vertical) ctx.rotate(Math.PI / 2);

  ctx.fillStyle = '#8a6a42';
  ctx.fillRect(-w / 2, -tile / 2, w, tile);
  ctx.strokeStyle = '#4a3524';
  ctx.lineWidth = Math.max(1, 1.6 * s);
  ctx.strokeRect(-w / 2, -tile / 2, w, tile);
  // 桥板
  ctx.globalAlpha = 0.55;
  ctx.beginPath();
  for (let i = 1; i < 5; i++) {
    const py = -tile / 2 + (tile / 5) * i;
    ctx.moveTo(-w / 2 + 1.5 * s, py); ctx.lineTo(w / 2 - 1.5 * s, py);
  }
  ctx.stroke();
  ctx.restore();
}

function drawFeatureOn(view, ctx, f, rx, ry) {
  const { tile } = view;
  const s = tile / 48;
  ctx.save();
  ctx.translate(rx + tile / 2, ry + tile / 2);
  if (f.type === 'ruin') {
    ctx.fillStyle = f.explored ? '#6b6155' : '#3f3a32';
    ctx.fillRect(-11 * s, -2 * s, 6 * s, 12 * s);
    ctx.fillRect(-2 * s, -8 * s, 6 * s, 18 * s);
    ctx.fillRect(7 * s, -4 * s, 5 * s, 14 * s);
  } else if (f.type === 'temple') {
    ctx.fillStyle = '#e8e0c8';
    ctx.beginPath();
    ctx.moveTo(-12 * s, 8 * s); ctx.lineTo(0, -10 * s); ctx.lineTo(12 * s, 8 * s);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#a8842c';
    ctx.fillRect(-10 * s, 8 * s, 20 * s, 3 * s);
  } else if (f.type === 'sage') {
    ctx.fillStyle = '#5c7fa8';
    ctx.beginPath(); ctx.arc(0, 0, 9 * s, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#e8e0c8';
    ctx.beginPath(); ctx.arc(0, 0, 4 * s, 0, Math.PI * 2); ctx.fill();
  } else if (f.type === 'orodruin') {
    // 末日火山：山体 + 火口 + 一缕烟
    ctx.fillStyle = '#3a302a';
    ctx.beginPath();
    ctx.moveTo(-15 * s, 12 * s); ctx.lineTo(0, -12 * s); ctx.lineTo(15 * s, 12 * s);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#c9451f';
    ctx.beginPath();
    ctx.moveTo(-5 * s, -8 * s); ctx.lineTo(0, -13 * s); ctx.lineTo(5 * s, -8 * s);
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(120,110,100,.8)';
    ctx.lineWidth = 2 * s;
    ctx.beginPath();
    ctx.moveTo(0, -13 * s);
    ctx.quadraticCurveTo(6 * s, -19 * s, 2 * s, -24 * s);
    ctx.stroke();
  }
  ctx.restore();
}

// 四级城市各有各的形制：村镇是没有围墙的一撮屋舍，城有墙与一座角楼，
// 大城四角带楼，都城再加一座主堡与更高的旗杆。
const CITY_TIER = {
  village: { wall: false, towers: 0, keep: false, merlons: 0 },
  town:    { wall: true,  towers: 1, keep: false, merlons: 4 },
  city:    { wall: true,  towers: 2, keep: false, merlons: 5 },
  capital: { wall: true,  towers: 4, keep: true,  merlons: 6 },
};

function drawCity(view, c, x0, y0, x1, y1) {
  if (c.x + 1 < x0 || c.x > x1 || c.y + 1 < y0 || c.y > y1) return;
  const { ctx, tile } = view;
  const [rx, ry] = rectOf(view, c.x, c.y);
  const w = tile * 2, s = tile / 48;
  const f = FACTIONS[c.owner];
  const tier = CITY_TIER[c.size] || CITY_TIER.town;

  const stone = c.razed ? '#7a6c58' : '#c8b48a';
  const stoneDark = c.razed ? '#5f5548' : '#a8926a';
  ctx.strokeStyle = '#4a3a24';
  ctx.lineWidth = 2 * s;

  if (tier.wall) {
    ctx.fillStyle = stone;
    ctx.fillRect(rx + 3 * s, ry + 3 * s, w - 6 * s, w - 6 * s);
    ctx.strokeRect(rx + 3 * s, ry + 3 * s, w - 6 * s, w - 6 * s);

    // 城垛
    ctx.fillStyle = '#4a3a24';
    for (let i = 0; i < tier.merlons; i++) {
      const bx = rx + 6 * s + i * ((w - 12 * s) / tier.merlons);
      ctx.fillRect(bx, ry + 3 * s, (w - 12 * s) / tier.merlons * 0.55, 5 * s);
    }

    // 角楼：1 座居中偏左，2 座分列两侧，4 座压四角
    const tw = w * 0.22, th = w * 0.4;
    const spots = tier.towers === 1
      ? [[rx + w * 0.5 - tw / 2, ry + w * 0.44]]
      : tier.towers === 2
        ? [[rx + 8 * s, ry + w * 0.42], [rx + w - 8 * s - tw, ry + w * 0.42]]
        : [[rx + 6 * s, ry + w * 0.14], [rx + w - 6 * s - tw, ry + w * 0.14],
           [rx + 6 * s, ry + w * 0.52], [rx + w - 6 * s - tw, ry + w * 0.52]];
    ctx.fillStyle = stoneDark;
    for (const [bx, by] of spots) {
      ctx.fillRect(bx, by, tw, tier.towers === 4 ? th * 0.8 : th);
      ctx.strokeRect(bx, by, tw, tier.towers === 4 ? th * 0.8 : th);
    }
    if (tier.keep) {   // 都城的主堡
      ctx.fillStyle = stone;
      ctx.fillRect(rx + w * 0.36, ry + w * 0.34, w * 0.28, w * 0.42);
      ctx.strokeRect(rx + w * 0.36, ry + w * 0.34, w * 0.28, w * 0.42);
    }
  } else {
    // 村镇：三间没有围墙的屋舍
    const huts = [[0.16, 0.42, 0.3, 0.3], [0.5, 0.3, 0.34, 0.36], [0.28, 0.66, 0.28, 0.26]];
    for (const [hx, hy, hw, hh] of huts) {
      ctx.fillStyle = stoneDark;
      ctx.fillRect(rx + w * hx, ry + w * hy, w * hw, w * hh);
      ctx.strokeRect(rx + w * hx, ry + w * hy, w * hw, w * hh);
      ctx.fillStyle = '#6b4f34';   // 屋顶
      ctx.beginPath();
      ctx.moveTo(rx + w * hx - 2 * s, ry + w * hy);
      ctx.lineTo(rx + w * (hx + hw / 2), ry + w * hy - 7 * s);
      ctx.lineTo(rx + w * (hx + hw) + 2 * s, ry + w * hy);
      ctx.closePath(); ctx.fill();
    }
  }

  // 旗帜（势力色 + 纹章，双编码）；等级越高旗越高
  const flagY = tier.keep ? ry + w * 0.12 : tier.wall ? ry + w * 0.24 : ry + w * 0.08;
  const fw = w * 0.24, fh = w * 0.2;
  ctx.fillStyle = f.color;
  ctx.fillRect(rx + w * 0.38, flagY, fw, fh);
  ctx.strokeStyle = '#2a2118'; ctx.lineWidth = 1.5 * s;
  ctx.strokeRect(rx + w * 0.38, flagY, fw, fh);
  ctx.fillStyle = f.side === 'light' && c.owner !== 4 ? '#1a1610' : '#f2e8d2';
  ctx.font = `${Math.round(tile * 0.32)}px serif`;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(f.emblem, rx + w * 0.5, flagY + fh * 0.55);

  if (tile >= 32) {
    ctx.font = `${Math.round(tile * 0.26)}px "Segoe UI", sans-serif`;
    ctx.textBaseline = 'top';
    ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(20,16,10,.85)';
    const label = `${c.name}·${CITY_SIZE[c.size].name}`;
    ctx.strokeText(label, rx + w / 2, ry + w + 2);
    ctx.fillStyle = '#f2e8d2';
    ctx.fillText(label, rx + w / 2, ry + w + 2);
  }
  if (c.razed) {
    ctx.strokeStyle = '#7a2018'; ctx.lineWidth = 3 * s;
    ctx.beginPath();
    ctx.moveTo(rx + 8 * s, ry + 8 * s); ctx.lineTo(rx + w - 8 * s, ry + w - 8 * s);
    ctx.stroke();
  }
}

function drawArmy(view, a) {
  const { ctx, G, tile } = view;
  const [rx, ry] = rectOf(view, a.x, a.y);
  const s = tile / 48;
  const f = FACTIONS[a.owner];

  // 堆叠内最强单位决定徽章
  let best = a.units[0];
  for (const u of a.units) if (unitStr(G, u) > unitStr(G, best)) best = u;
  const cx = rx + tile / 2, cy = ry + tile / 2;
  const r = tile * 0.32;

  ctx.save();
  ctx.beginPath(); ctx.arc(cx, cy + 2 * s, r, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.fill();

  // 肖像（程序化绘制并缓存，尺寸取整避免每帧重画）
  const psize = Math.max(16, Math.round(r * 2));
  const pic = portrait(isHero(best) ? 'hero' : best.type, psize, isHero(best));
  ctx.drawImage(pic, cx - psize / 2, cy - psize / 2, psize, psize);

  // 势力色圆环
  ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.lineWidth = Math.max(2, 3 * s); ctx.strokeStyle = f.color; ctx.stroke();
  ctx.lineWidth = 1; ctx.strokeStyle = '#2a2118'; ctx.stroke();

  // 强度：压在肖像右下，带描边保证在任何底色上都读得出来
  if (tile >= 28) {
    const sx = cx - r * 0.72, sy = cy + r * 0.66;
    ctx.font = `bold ${Math.round(tile * 0.26)}px "Segoe UI", sans-serif`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.lineWidth = Math.max(2, tile * 0.06);
    ctx.strokeStyle = 'rgba(20,16,10,.9)';
    ctx.strokeText(String(unitStr(G, best)), sx, sy);
    ctx.fillStyle = '#f5e9c8';
    ctx.fillText(String(unitStr(G, best)), sx, sy);
  }

  // 数量角标
  if (a.units.length > 1 && tile >= 32) {
    const bx = cx + r * 0.85, by = cy - r * 0.85;
    ctx.beginPath(); ctx.arc(bx, by, tile * 0.15, 0, Math.PI * 2);
    ctx.fillStyle = '#2a2118'; ctx.fill();
    ctx.strokeStyle = f.color; ctx.lineWidth = 1.5 * s; ctx.stroke();
    ctx.fillStyle = '#f2e8d2';
    ctx.font = `bold ${Math.round(tile * 0.21)}px "Segoe UI", sans-serif`;
    ctx.fillText(String(a.units.length), bx, by + 0.5);
  }

  // 英雄金冠
  if (a.units.some(isHero) && tile >= 24) {
    ctx.fillStyle = '#d4af5a';
    const hy = cy - r - 4 * s;
    ctx.beginPath();
    ctx.moveTo(cx - 7 * s, hy); ctx.lineTo(cx - 7 * s, hy - 5 * s);
    ctx.lineTo(cx - 3.5 * s, hy - 2 * s); ctx.lineTo(cx, hy - 6 * s);
    ctx.lineTo(cx + 3.5 * s, hy - 2 * s); ctx.lineTo(cx + 7 * s, hy - 5 * s);
    ctx.lineTo(cx + 7 * s, hy);
    ctx.closePath(); ctx.fill();
  }

  // 行动条（移动点）：金色。绿色会被误读成血量，耐久才用绿。
  if (tile >= 32) {
    const budget = stackBudget(G, a);
    const bw = tile * 0.6;
    ctx.fillStyle = 'rgba(0,0,0,.45)';
    ctx.fillRect(cx - bw / 2, ry + tile - 6 * s, bw, 3.5 * s);
    ctx.fillStyle = budget > 0 ? '#e8c165' : '#6b5a3a';
    ctx.fillRect(cx - bw / 2, ry + tile - 6 * s, bw * Math.min(1, budget / 16), 3.5 * s);
  }
  ctx.restore();
}

function drawDrop(view, d) {
  const { ctx, tile } = view;
  const [rx, ry] = rectOf(view, d.x, d.y);
  ctx.save();
  ctx.fillStyle = '#d4af5a';
  ctx.beginPath();
  ctx.arc(rx + tile * 0.78, ry + tile * 0.78, tile * 0.11, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#2a2118'; ctx.lineWidth = 1.5; ctx.stroke();
  ctx.restore();
}

// ── 小地图 ────────────────────────────────────────────────

export function drawMinimap(canvas, view) {
  const G = view.G;
  const ctx = canvas.getContext('2d');
  const px = Math.max(1, Math.floor(Math.min(canvas.width / G.map.w, canvas.height / G.map.h)));
  const ox = Math.floor((canvas.width - px * G.map.w) / 2);
  const oy = Math.floor((canvas.height - px * G.map.h) / 2);
  ctx.fillStyle = '#241d14';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  const fog = G.fogMode !== 'off';
  for (let y = 0; y < G.map.h; y++) for (let x = 0; x < G.map.w; x++) {
    if (fog && !hasExplored(G, view.viewer, x, y)) continue;
    ctx.fillStyle = terrainAt(G.map, x, y).color;
    ctx.fillRect(ox + x * px, oy + y * px, px, px);
    if (fog && !canSee(G, view.viewer, x, y)) {
      ctx.fillStyle = 'rgba(20,16,10,0.42)';
      ctx.fillRect(ox + x * px, oy + y * px, px, px);
    }
  }
  for (const c of G.cities) {
    if (fog && !hasExplored(G, view.viewer, c.x, c.y)) continue;
    const shown = fog ? rememberedCity(G, view.viewer, c) : c;
    if (!shown) continue;
    ctx.fillStyle = FACTIONS[shown.owner].color;
    ctx.fillRect(ox + c.x * px, oy + c.y * px, px * 2, px * 2);
  }
  for (const a of G.armies) {
    if (fog && a.owner !== view.viewer && !canSee(G, view.viewer, a.x, a.y)) continue;
    ctx.fillStyle = FACTIONS[a.owner].color;
    ctx.fillRect(ox + a.x * px, oy + a.y * px, px, px);
  }
  ctx.strokeStyle = '#f2e8d2';
  ctx.lineWidth = 1;
  ctx.strokeRect(
    ox + (view.cam.x / view.tile) * px, oy + (view.cam.y / view.tile) * px,
    (view.vw / view.tile) * px, (view.vh / view.tile) * px,
  );
  return { px, ox, oy };
}
