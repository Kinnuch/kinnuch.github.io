// 战役缩略图：把一张地图定义画成小图，并标出各方都城。
//
// 用在战役选择界面 —— 光看文字说明选战役太抽象，
// 一眼看见「这仗打在哪、谁在哪个角落」才好挑。
// 不需要建立对局，直接吃地图定义，所以大厅里就能画。

import { TERRAIN } from '../data/terrain.js';
import { FACTIONS } from '../data/factions.js';
import { groupOf, paletteOf } from './tiles.js';

/**
 * 画出缩略图。底图（地形 + 封锁区 + 普通城市）按战役缓存成离屏画布，
 * 动画帧只需重贴底图再画几个都城点 —— 每帧成本从 1.5 万个 fillRect
 * 降到十几次绘制，脉冲动画才跑得动。
 *
 * opts.highlight：被选中的势力，其都城做呼吸脉冲（pulse 0~1 为相位）。
 */
const bakeCache = new Map();

export function drawThumb(canvas, mapDef, opts = {}) {
  const { owners = {}, players = mapDef.players || [], highlight = null, pulse = 0 } = opts;
  const ctx = canvas.getContext('2d');
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const cssW = canvas.clientWidth || 320;
  const cssH = Math.round(cssW * (mapDef.h / mapDef.w));
  canvas.width = Math.round(cssW * dpr);
  canvas.height = Math.round(cssH * dpr);
  canvas.style.height = cssH + 'px';
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  const px = cssW / mapDef.w;
  const py = cssH / mapDef.h;

  // ── 底图（带缓存）──
  const key = `${opts.cacheKey || mapDef.id}|${cssW}`;
  let bake = bakeCache.get(key);
  if (!bake) {
    bake = document.createElement('canvas');
    bake.width = Math.round(cssW * dpr);
    bake.height = Math.round(cssH * dpr);
    const b = bake.getContext('2d');
    b.setTransform(dpr, 0, 0, dpr, 0, 0);

    for (let y = 0; y < mapDef.h; y++) {
      const row = mapDef.rows[y];
      for (let x = 0; x < mapDef.w; x++) {
        b.fillStyle = paletteOf(groupOf(row[x])).fill;
        b.fillRect(x * px, y * py, px + 0.6, py + 0.6);
      }
    }
    if (opts.locked && opts.locked.rect) {
      const [lx0, ly0, lx1, ly1] = opts.locked.rect;
      b.fillStyle = 'rgba(16,12,8,.62)';
      b.fillRect(0, 0, cssW, ly0 * py);
      b.fillRect(0, (ly1 + 1) * py, cssW, cssH - (ly1 + 1) * py);
      b.fillRect(0, ly0 * py, lx0 * px, (ly1 - ly0 + 1) * py);
      b.fillRect((lx1 + 1) * px, ly0 * py, cssW - (lx1 + 1) * px, (ly1 - ly0 + 1) * py);
    }
    // 普通城市：小方点
    for (const c of mapDef.cities) {
      const owner = owners[c.id] != null ? owners[c.id] : c.owner;
      const shown = players.includes(owner) ? owner : 0;
      if (c.size === 'capital' && shown !== 0) continue;   // 都城留给动画层
      const f = FACTIONS[shown] || FACTIONS[0];
      b.fillStyle = shown === 0 ? 'rgba(60,48,32,.55)' : f.color;
      const r = Math.max(1.2, px * 1.0);
      b.fillRect((c.x + 1) * px - r, (c.y + 1) * py - r, r * 2, r * 2);
    }
    b.strokeStyle = 'rgba(74,58,36,.55)';
    b.lineWidth = 1;
    b.strokeRect(0.5, 0.5, cssW - 1, cssH - 1);

    bakeCache.set(key, bake);
    if (bakeCache.size > 16) bakeCache.delete(bakeCache.keys().next().value);
  }
  ctx.drawImage(bake, 0, 0, cssW, cssH);

  // ── 动画层：都城点 ──
  const marks = [];
  for (const c of mapDef.cities) {
    if (c.size !== 'capital') continue;
    const owner = owners[c.id] != null ? owners[c.id] : c.owner;
    const shown = players.includes(owner) ? owner : 0;
    if (shown === 0) continue;
    const cx = (c.x + 1) * px, cy = (c.y + 1) * py;
    const f = FACTIONS[shown] || FACTIONS[0];
    const base = Math.max(2.6, px * 1.5);
    // 被选中势力的都城：呼吸脉冲（半径与光晕随相位起伏）
    const mine = shown === highlight;
    const wave = mine ? (Math.sin(pulse * Math.PI * 2) + 1) / 2 : 0;
    const r = base + (mine ? base * 0.55 * wave : 0);

    if (mine) {
      ctx.beginPath();
      ctx.arc(cx, cy, r + 2.5 + wave * 2, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255,235,170,' + (0.22 + wave * 0.22).toFixed(2) + ')';
      ctx.fill();
    }
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fillStyle = f.color;
    ctx.fill();
    ctx.lineWidth = mine ? 1.8 : 1.2;
    ctx.strokeStyle = '#241d14';
    ctx.stroke();
    marks.push({ x: cx, y: cy, city: c, faction: shown });
  }
  return marks;
}

export { TERRAIN };
