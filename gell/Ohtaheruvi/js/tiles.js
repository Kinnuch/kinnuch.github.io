// 地形绘制：自动拼接（autotiling）+ 笔触装饰
//
// 关键思路：**不要把地形画成一格一格的方块**。
// 先在整片区域铺一层「地」（草原色），再把森林、山地、水面等按
// 8 邻位掩码画成**有机色块**：本格与哪些同类邻格相连，就往哪边延伸，
// 对角两侧都同类时把拐角补满。这就是 47-blob 的效果，
// 只是用路径实时算出来，不需要任何图集文件。
//
// 装饰（树、山峰、麦垄、波纹）画在色块之上，位置与大小由格子坐标
// 做确定性哈希决定 —— 同一张图每次画出来都一样，存档回放才对得上。

import { TERRAIN } from '../data/terrain.js';
import { hash2 } from './rng.js';

// 同一「地貌组」的格子会连成一片
const GROUP = {
  O: 'water', V: 'water', D: 'water',
  T: 'forest',
  M: 'mountain',
  H: 'hill',
  S: 'swamp',
  W: 'waste',
  F: 'farm',
  P: 'ground', R: 'ground', C: 'ground',
};

export const groupOf = (id) => GROUP[id] || 'ground';

// 底色：整张图先铺这一层，其余地貌都盖在它上面
export const GROUND = { light: '#8fa05c', dark: '#4e5a31' };

const PALETTE = {
  water:    { fill: '#3d6b80', edge: '#2a4d5e', accent: '#6fa3bb' },
  forest:   { fill: '#4c6b3c', edge: '#2b3f22', accent: '#6c8f52' },
  mountain: { fill: '#7d7266', edge: '#453e35', accent: '#a8a096' },
  hill:     { fill: '#9c8b5a', edge: '#5f5335', accent: '#b9a978' },
  swamp:    { fill: '#6b7a55', edge: '#3d4830', accent: '#87956d' },
  waste:    { fill: '#a08a63', edge: '#6b5940', accent: '#bda684' },
  farm:     { fill: '#a8a856', edge: '#6d6d33', accent: '#c2c274' },
  ground:   { fill: GROUND.light, edge: GROUND.dark, accent: '#a6b571' },
};

export const paletteOf = (group) => PALETTE[group] || PALETTE.ground;

/**
 * 8 邻位掩码：本格周围哪些格子和它同组。
 * 位序 N=1 E=2 S=4 W=8 NE=16 SE=32 SW=64 NW=128
 */
export function neighbourMask(map, x, y, group) {
  const same = (dx, dy) => {
    const nx = x + dx, ny = y + dy;
    if (nx < 0 || ny < 0 || nx >= map.w || ny >= map.h) return true;   // 图外当作同类，边缘才不会秃一圈
    return groupOf(map.tiles[ny * map.w + nx]) === group;
  };
  return (same(0, -1) ? 1 : 0) | (same(1, 0) ? 2 : 0) | (same(0, 1) ? 4 : 0) | (same(-1, 0) ? 8 : 0)
    | (same(1, -1) ? 16 : 0) | (same(1, 1) ? 32 : 0) | (same(-1, 1) ? 64 : 0) | (same(-1, -1) ? 128 : 0);
}

/**
 * 把一格画成「有机色块」：本体是个圆角方块，与同类邻格之间架桥，
 * 对角两侧都同类时补满拐角。相邻的同类格连起来就是一整片，看不出格线。
 */
/**
 * 色块的轮廓几何。四条边：与同类相连的一侧顶到格子边界，否则内缩；
 * 四个角：两侧都相连就是直角，否则倒圆角。
 * 相邻的同类格因此严丝合缝地连成一整片，看不出格线。
 */
function geom(rx, ry, t, mask) {
  const i = t * 0.07, r = t * 0.30;
  const N = !!(mask & 1), E = !!(mask & 2), S = !!(mask & 4), W = !!(mask & 8);
  return {
    N, E, S, W, r,
    L: W ? rx : rx + i,
    R: E ? rx + t : rx + t - i,
    T: N ? ry : ry + i,
    B: S ? ry + t : ry + t - i,
    // 两侧都连着就不倒角
    rNW: (N && W) ? 0 : r, rNE: (N && E) ? 0 : r,
    rSE: (S && E) ? 0 : r, rSW: (S && W) ? 0 : r,
  };
}

/** 填充路径：带四角独立半径的圆角矩形 */
export function blobPath(ctx, rx, ry, t, mask) {
  const g = geom(rx, ry, t, mask);
  ctx.beginPath();
  ctx.moveTo(g.L + g.rNW, g.T);
  ctx.lineTo(g.R - g.rNE, g.T);
  if (g.rNE) ctx.arcTo(g.R, g.T, g.R, g.T + g.rNE, g.rNE); else ctx.lineTo(g.R, g.T);
  ctx.lineTo(g.R, g.B - g.rSE);
  if (g.rSE) ctx.arcTo(g.R, g.B, g.R - g.rSE, g.B, g.rSE); else ctx.lineTo(g.R, g.B);
  ctx.lineTo(g.L + g.rSW, g.B);
  if (g.rSW) ctx.arcTo(g.L, g.B, g.L, g.B - g.rSW, g.rSW); else ctx.lineTo(g.L, g.B);
  ctx.lineTo(g.L, g.T + g.rNW);
  if (g.rNW) ctx.arcTo(g.L, g.T, g.L + g.rNW, g.T, g.rNW); else ctx.lineTo(g.L, g.T);
  ctx.closePath();
}

/**
 * 只描**外沿**。若直接 stroke 整条填充路径，两个相邻同类格的交界处
 * 会各画一条线，色块中间就横七竖八全是接缝。
 */
export function blobEdge(ctx, rx, ry, t, mask) {
  const g = geom(rx, ry, t, mask);
  ctx.beginPath();
  if (!g.N) { ctx.moveTo(g.L + g.rNW, g.T); ctx.lineTo(g.R - g.rNE, g.T); }
  if (!g.S) { ctx.moveTo(g.L + g.rSW, g.B); ctx.lineTo(g.R - g.rSE, g.B); }
  if (!g.W) { ctx.moveTo(g.L, g.T + g.rNW); ctx.lineTo(g.L, g.B - g.rSW); }
  if (!g.E) { ctx.moveTo(g.R, g.T + g.rNE); ctx.lineTo(g.R, g.B - g.rSE); }
  // 四个外凸的圆角
  if (g.rNW) { ctx.moveTo(g.L, g.T + g.rNW); ctx.arcTo(g.L, g.T, g.L + g.rNW, g.T, g.rNW); }
  if (g.rNE) { ctx.moveTo(g.R - g.rNE, g.T); ctx.arcTo(g.R, g.T, g.R, g.T + g.rNE, g.rNE); }
  if (g.rSE) { ctx.moveTo(g.R, g.B - g.rSE); ctx.arcTo(g.R, g.B, g.R - g.rSE, g.B, g.rSE); }
  if (g.rSW) { ctx.moveTo(g.L + g.rSW, g.B); ctx.arcTo(g.L, g.B, g.L, g.B - g.rSW, g.rSW); }
  ctx.stroke();
}

/** 地貌装饰：树、山峰、麦垄……位置由坐标哈希决定，每次都一样 */
export function decorate(ctx, group, rx, ry, t, x, y, pal) {
  const s = t / 48;
  const n = hash2(x, y);
  ctx.save();

  switch (group) {
    case 'forest': {
      // 三棵略带正面视角的针叶树：有受光面、有影
      const count = 2 + Math.floor(n * 2);
      for (let k = 0; k < count; k++) {
        const h2 = hash2(x * 3 + k, y * 5 + k);
        const px = rx + t * (0.22 + 0.26 * k + (h2 - 0.5) * 0.1);
        const py = ry + t * (0.74 - (k % 2) * 0.14);
        const hgt = t * (0.30 + h2 * 0.10);
        const wid = hgt * 0.52;
        ctx.fillStyle = 'rgba(0,0,0,.22)';
        ctx.beginPath();
        ctx.ellipse(px, py + 1.5 * s, wid * 0.6, wid * 0.24, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = pal.edge;
        ctx.beginPath();
        ctx.moveTo(px - wid / 2, py); ctx.lineTo(px, py - hgt); ctx.lineTo(px + wid / 2, py);
        ctx.closePath(); ctx.fill();
        ctx.fillStyle = pal.accent;      // 受光的那半边
        ctx.beginPath();
        ctx.moveTo(px - wid / 2, py); ctx.lineTo(px, py - hgt); ctx.lineTo(px, py);
        ctx.closePath(); ctx.fill();
      }
      break;
    }
    case 'mountain': {
      // 正面视角的山峰：阴面、阳面、雪顶
      const hgt = t * (0.58 + n * 0.16);
      const base = ry + t * 0.9;
      const cx = rx + t * (0.42 + n * 0.16);
      const half = t * 0.42;
      ctx.fillStyle = 'rgba(0,0,0,.25)';
      ctx.beginPath();
      ctx.ellipse(cx, base, half * 0.9, t * 0.07, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = pal.edge;
      ctx.beginPath();
      ctx.moveTo(cx - half, base); ctx.lineTo(cx, base - hgt); ctx.lineTo(cx + half, base);
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = pal.accent;
      ctx.beginPath();
      ctx.moveTo(cx - half, base); ctx.lineTo(cx, base - hgt); ctx.lineTo(cx - half * 0.05, base);
      ctx.closePath(); ctx.fill();
      if (hgt > t * 0.62) {              // 够高才有雪
        ctx.fillStyle = '#e6e3dc';
        ctx.beginPath();
        ctx.moveTo(cx, base - hgt);
        ctx.lineTo(cx - half * 0.30, base - hgt * 0.68);
        ctx.lineTo(cx - half * 0.10, base - hgt * 0.74);
        ctx.lineTo(cx + half * 0.12, base - hgt * 0.64);
        ctx.lineTo(cx + half * 0.30, base - hgt * 0.70);
        ctx.closePath(); ctx.fill();
      }
      break;
    }
    case 'hill': {
      ctx.fillStyle = pal.accent;
      ctx.beginPath();
      ctx.arc(rx + t * (0.32 + n * 0.08), ry + t * 0.66, t * 0.21, Math.PI, 0);
      ctx.fill();
      ctx.fillStyle = pal.edge;
      ctx.beginPath();
      ctx.arc(rx + t * 0.68, ry + t * 0.74, t * 0.16, Math.PI, 0);
      ctx.fill();
      break;
    }
    case 'water': {
      ctx.strokeStyle = pal.accent;
      ctx.lineWidth = Math.max(1, 1.4 * s);
      ctx.globalAlpha = 0.55;
      for (let k = 0; k < 2; k++) {
        const py = ry + t * (0.34 + 0.3 * k + (n - 0.5) * 0.06);
        ctx.beginPath();
        ctx.moveTo(rx + t * 0.1, py);
        ctx.quadraticCurveTo(rx + t * 0.32, py - t * 0.08, rx + t * 0.54, py);
        ctx.quadraticCurveTo(rx + t * 0.76, py + t * 0.08, rx + t * 0.92, py);
        ctx.stroke();
      }
      break;
    }
    case 'swamp': {
      ctx.strokeStyle = pal.edge;
      ctx.lineWidth = Math.max(1, 1.3 * s);
      ctx.globalAlpha = 0.75;
      for (let k = 0; k < 4; k++) {
        const h2 = hash2(x + k * 7, y - k * 3);
        const px = rx + t * (0.16 + 0.22 * k);
        const py = ry + t * (0.52 + h2 * 0.3);
        ctx.beginPath();
        ctx.moveTo(px, py);
        ctx.quadraticCurveTo(px + t * 0.03, py - t * 0.1, px + t * 0.07, py - t * 0.18);
        ctx.stroke();
      }
      break;
    }
    case 'farm': {
      ctx.strokeStyle = pal.edge;
      ctx.globalAlpha = 0.30;
      ctx.lineWidth = Math.max(1, 1.2 * s);
      const diag = n > 0.5;
      for (let k = 1; k < 5; k++) {
        ctx.beginPath();
        if (diag) {
          ctx.moveTo(rx + t * 0.08, ry + t * k / 5);
          ctx.lineTo(rx + t * 0.92, ry + t * k / 5);
        } else {
          ctx.moveTo(rx + t * k / 5, ry + t * 0.08);
          ctx.lineTo(rx + t * k / 5, ry + t * 0.92);
        }
        ctx.stroke();
      }
      break;
    }
    case 'waste': {
      ctx.fillStyle = pal.edge;
      ctx.globalAlpha = 0.5;
      for (let k = 0; k < 3; k++) {
        const h2 = hash2(x - k * 11, y + k * 13);
        ctx.beginPath();
        ctx.ellipse(rx + t * (0.2 + 0.3 * k), ry + t * (0.28 + h2 * 0.44),
          t * 0.045, t * 0.03, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    }
    default: {   // 草原：几丛草点，避免大片死平
      ctx.strokeStyle = pal.edge;
      ctx.globalAlpha = 0.22;
      ctx.lineWidth = Math.max(1, 1.1 * s);
      for (let k = 0; k < 2; k++) {
        const h2 = hash2(x + k * 17, y + k * 19);
        if (h2 < 0.45) continue;
        const px = rx + t * (0.25 + h2 * 0.5), py = ry + t * (0.4 + h2 * 0.35);
        ctx.beginPath();
        ctx.moveTo(px, py); ctx.lineTo(px + t * 0.04, py - t * 0.09);
        ctx.moveTo(px + t * 0.05, py); ctx.lineTo(px + t * 0.06, py - t * 0.07);
        ctx.stroke();
      }
    }
  }
  ctx.restore();
}

/** 海岸线：水面色块外沿描一圈浅滩色，让海陆交界不那么生硬 */
export function drawCoast(ctx, rx, ry, t, mask) {
  const N = mask & 1, E = mask & 2, S = mask & 4, W = mask & 8;
  if (N && E && S && W) return;
  ctx.save();
  ctx.strokeStyle = 'rgba(214,198,150,.55)';
  ctx.lineWidth = Math.max(1.5, t * 0.07);
  ctx.beginPath();
  if (!N) { ctx.moveTo(rx, ry + t * 0.06); ctx.lineTo(rx + t, ry + t * 0.06); }
  if (!S) { ctx.moveTo(rx, ry + t * 0.94); ctx.lineTo(rx + t, ry + t * 0.94); }
  if (!W) { ctx.moveTo(rx + t * 0.06, ry); ctx.lineTo(rx + t * 0.06, ry + t); }
  if (!E) { ctx.moveTo(rx + t * 0.94, ry); ctx.lineTo(rx + t * 0.94, ry + t); }
  ctx.stroke();
  ctx.restore();
}

export const terrainInfo = (id) => TERRAIN[id];
