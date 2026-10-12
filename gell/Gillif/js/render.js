// Canvas 绘制。只读对局状态 G，不改它；画面特效的随机用 Math.random（与局面无关）。
// 坐标：世界单位（星系约 ±20 × ±12）→ 屏幕 CSS 像素。
//
// 战争迷雾（只在画面上）：
//   已知 = 到过的星及其邻星，只画这些；
//   到过（explored）= 显示异常天体，航线常亮；
//   在场（seen）= 你拥有、或你的船在场（离开后再看清 1 秒，随后约 2 秒淡出）：这时才看得见别人的兵力。
//   观战、结局、自己出局或关掉迷雾时全图揭开。镜头跟随已知区域平滑拉远。
//   暗幕：开着它的势力的星连同舰船从别人眼前消失（哪怕你的船在场）；间谍网：看清被盯上那一方的全部领土。

import { seedState, rand } from './rng.js';
import { RULES, ABILITIES } from './rules.js';
import { stealthed, spiedBy } from './effects.js';
import { validFirst, validSecond } from './abilities.js';

const STAR_R = 0.62;          // 星的世界半径（再乘 size 0.8–1.2）
const MARGIN = 2.6;           // 取景时四周留白（世界单位）
const MIN_HALF_W = 9;         // 迷雾里镜头至少框住 18 × 12 世界单位，免得开局放得太大
const MIN_HALF_H = 6;

const hexRgb = (hex) => [parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16)];
const rgba = (c, a) => `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`;
const mix = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const WHITE = [255, 255, 255];
const hash = (i, k) => { const v = Math.sin(i * 12.9898 + k * 78.233) * 43758.5453; return v - Math.floor(v); };

const TEAL = [90, 220, 200], EMBER = [255, 120, 50], DWARF = [255, 70, 40];
const ROCK = [190, 170, 145], ICE = [185, 228, 255], VIOLET = [150, 110, 255];

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');
  let W = 0, H = 0, dpr = 1;
  let G = null;
  let cam = { s: 20, ox: 0, oy: 0 };   // 当前镜头（平滑趋向 camT）
  let camT = cam;
  let rot = false;                      // 竖屏：整张图顺时针转 90°
  let bg = null;
  let facRgb = [];
  let vis = [];                         // 每颗星当前显示色（易主时渐变）
  let seenA = [], knownA = [];          // 迷雾：在场程度、已知程度（0–1，平滑过渡）
  let facA = [];                        // 各势力的舰船对我可见的程度（暗幕时淡出）
  let stealthSet = new Set(), spiedSet = new Set(), meStealth = false;
  let me = -1, reveal = true;
  let lastNow = 0;
  const fx = [];
  const insets = { top: 58, right: 14, bottom: 14, left: 14 };

  // ——— 迷雾判定 ———

  const explored = (s) => reveal || (me >= 0 && s.visited[me]);
  const known = (s) => explored(s) || (me >= 0 && s.links.some((n) => G.stars[n].visited[me]));
  const seenTarget = (s) => {
    if (reveal || s.owner === me) return 1;
    if (s.owner >= 0 && stealthSet.has(s.owner)) return 0;     // 暗幕：哪怕你的船在场也看不清
    if (s.owner >= 0 && spiedSet.has(s.owner)) return 1;       // 你的间谍网盯着这一方
    return me >= 0 && G.time - s.presence[me] <= RULES.lingerSec ? 1 : 0;
  };
  /** 这颗星上的兵力、控制度等信息的可见程度 */
  const infoA = (s) => (reveal || s.owner === me ? 1 : seenA[s.id]);

  function updateReveal(viewer) {
    me = viewer;
    reveal = !G.fog || me < 0 || G.over || !G.factions[me].alive;
    stealthSet = new Set(); spiedSet = new Set();
    meStealth = me >= 0 && stealthed(G, me);
    if (reveal) return;
    for (const f of G.factions) {
      if (f.id === me) continue;
      if (stealthed(G, f.id)) stealthSet.add(f.id);
      if (spiedBy(G, f.id).includes(me)) spiedSet.add(f.id);
    }
  }

  function setGame(g, viewer) {
    G = g;
    facRgb = G.factions.map((f) => hexRgb(f.color));
    vis = G.stars.map((s) => starTarget(s));
    fx.length = 0;
    updateReveal(viewer);
    facA = G.factions.map(() => 1);
    seenA = G.stars.map((s) => seenTarget(s));
    knownA = G.stars.map((s) => (known(s) ? 1 : 0));
    resize();
  }

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    const r = canvas.getBoundingClientRect();
    W = Math.max(1, r.width); H = Math.max(1, r.height);
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    if (G) {
      // 是否转 90° 按整张星图的长宽比定，玩到一半不会翻
      const b = G.bounds;
      const aw = W - insets.left - insets.right, ah = H - insets.top - insets.bottom;
      rot = ah > aw && (b.x1 - b.x0) > (b.y1 - b.y0);
      camT = fitCamera();
      cam = { ...camT };
    }
    bg = null;
  }

  function fitCamera() {
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const s of G.stars) {
      if (!reveal && !known(s)) continue;
      x0 = Math.min(x0, s.x); x1 = Math.max(x1, s.x); y0 = Math.min(y0, s.y); y1 = Math.max(y1, s.y);
    }
    if (x0 === Infinity) { const b = G.bounds; x0 = b.x0; x1 = b.x1; y0 = b.y0; y1 = b.y1; }
    let cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
    let hw = (x1 - x0) / 2, hh = (y1 - y0) / 2;
    if (!reveal) { hw = Math.max(hw, MIN_HALF_W); hh = Math.max(hh, MIN_HALF_H); }
    hw += MARGIN; hh += MARGIN;
    const aw = W - insets.left - insets.right, ah = H - insets.top - insets.bottom;
    const s = Math.max(4, Math.min(aw / (2 * (rot ? hh : hw)), ah / (2 * (rot ? hw : hh))));
    const mx = insets.left + aw / 2, my = insets.top + ah / 2;
    return { s, ox: mx - (rot ? -cy : cx) * s, oy: my - (rot ? cx : cy) * s };
  }

  // 世界 → 屏幕（CSS 像素）。转 90° 时 (x, y) → (-y, x)
  const sx = (x, y) => cam.ox + (rot ? -y : x) * cam.s;
  const sy = (x, y) => cam.oy + (rot ? x : y) * cam.s;
  const toWorld = (px, py) => {
    const u = (px - cam.ox) / cam.s, v = (py - cam.oy) / cam.s;
    return rot ? { x: v, y: -u } : { x: u, y: v };
  };
  const starR = (s) => STAR_R * s.size * cam.s;

  /** 屏幕坐标处的星（含一圈宽松的触控范围，只认已知的星）；没有则 -1 */
  function pickStar(px, py) {
    if (!G) return -1;
    let best = -1, bd = Infinity;
    for (const s of G.stars) {
      if (knownA[s.id] < 0.5) continue;
      const d = Math.hypot(sx(s.x, s.y) - px, sy(s.x, s.y) - py);
      const reach = Math.max(26, starR(s) * 2);
      if (d < reach && d < bd) { bd = d; best = s.id; }
    }
    return best;
  }

  function starTarget(s) {
    if (s.owner >= 0) return facRgb[s.owner];
    // 中立星：近白的淡色，不和任何势力色混淆
    return mix(s.tint.map((v) => v * 255), [215, 222, 240], 0.78);
  }

  /** 界面查询：这颗星在迷雾里的状态 */
  function starView(id) {
    const s = G.stars[id];
    return { known: knownA[id] > 0.5, explored: explored(s), seen: infoA(s) > 0.5 };
  }

  // ——— 背景 ———

  function buildBackground() {
    const c = document.createElement('canvas');
    c.width = canvas.width; c.height = canvas.height;
    const g = c.getContext('2d');
    g.scale(dpr, dpr);
    const st = seedState((G ? G.seed : 1) ^ 0x5bd1e995);
    const grad = g.createRadialGradient(W * 0.5, H * 0.45, 0, W * 0.5, H * 0.5, Math.max(W, H) * 0.75);
    grad.addColorStop(0, '#0d1428');
    grad.addColorStop(1, '#03050b');
    g.fillStyle = grad;
    g.fillRect(0, 0, W, H);
    // 星云：几团低透明度的彩色雾
    const hues = [[70, 60, 170], [30, 120, 160], [150, 50, 140], [40, 70, 150], [120, 40, 90]];
    g.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 6; i++) {
      const x = rand(st) * W, y = rand(st) * H, r = (0.25 + rand(st) * 0.45) * Math.max(W, H);
      const col = hues[Math.floor(rand(st) * hues.length)];
      const ng = g.createRadialGradient(x, y, 0, x, y, r);
      ng.addColorStop(0, rgba(col, 0.09 + rand(st) * 0.06));
      ng.addColorStop(1, rgba(col, 0));
      g.fillStyle = ng;
      g.fillRect(0, 0, W, H);
    }
    // 远景星点
    const n = Math.round((W * H) / 1500);
    for (let i = 0; i < n; i++) {
      const x = rand(st) * W, y = rand(st) * H;
      const r = 0.3 + rand(st) * rand(st) * 1.3;
      const a = 0.15 + rand(st) * 0.7;
      const tint = rand(st);
      const col = tint < 0.08 ? [170, 200, 255] : tint < 0.13 ? [255, 210, 170] : WHITE;
      g.fillStyle = rgba(col, a);
      g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill();
    }
    g.globalCompositeOperation = 'source-over';
    return c;
  }

  // ——— 事件 → 特效 ———

  function onEvent(e, now) {
    if (!G) return;
    const s = e.star >= 0 ? G.stars[e.star] : null;
    // 看不见的地方发生的事不放特效
    if (s && e.t !== 'ping' && !reveal && infoA(s) < 0.15) return;
    if (e.t === 'capture' || e.t === 'neutral') {
      const col = e.f >= 0 ? facRgb[e.f] : [200, 200, 210];
      fx.push({ k: 'ring', x: s.x, y: s.y, col, t0: now, dur: 1.0, r0: 1, r1: 4.2, w: 3 });
      for (let i = 0; i < 14; i++) spark(s, col, now, 1.6, 90);
    } else if (e.t === 'fight') {
      e.losses.forEach((n, f) => { for (let i = 0; i < Math.min(n, 5); i++) spark(s, facRgb[f], now, 1.1, 50); });
    } else if (e.t === 'burn') {
      e.losses.forEach((n) => { for (let i = 0; i < Math.min(n, 8); i++) spark(s, EMBER, now, 1.5, 70); });
    } else if (e.t === 'ping') {
      const col = e.f >= 0 ? facRgb[e.f] : WHITE;
      fx.push({ k: 'ring', x: s.x, y: s.y, col, t0: now, dur: 1.2, r0: 1, r1: 5, w: 2 });
      fx.push({ k: 'ring', x: s.x, y: s.y, col, t0: now + 0.25, dur: 1.2, r0: 1, r1: 5, w: 2 });
    } else if (e.t === 'ability') {
      abilityFx(e, now);
    }
    if (fx.length > 900) fx.splice(0, fx.length - 900);
  }

  function abilityFx(e, now) {
    const S = G.stars[e.src], T = G.stars[e.dst];
    if (!reveal && e.f !== me && infoA(T) < 0.15 && infoA(S) < 0.15) return;   // 看不见的地方放的不显示
    const col = facRgb[e.f];
    const ring = (st, c, t0, dur, r0, r1, w) => fx.push({ k: 'ring', x: st.x, y: st.y, col: c, t0, dur, r0, r1, w });
    switch (e.card) {
      case 'explosion':
        ring(T, EMBER, now, 0.7, 0.5, 5, 6);
        ring(T, WHITE, now, 0.35, 0.3, 2.5, 3);
        for (let i = 0; i < 36; i++) spark(T, i % 3 ? EMBER : WHITE, now, 2, 160);
        break;
      case 'recruits':
        for (let k = 0; k < 3; k++) ring(T, col, now + k * 0.18, 0.9, 3.5, 1, 2.5);   // 由外向内收拢
        break;
      case 'purge':
        for (const st of G.stars) if (st.owner === e.f && (reveal || e.f === me || infoA(st) > 0.15)) {
          ring(st, [255, 90, 70], now, 0.8, 1, 3.6, 3);
          for (let i = 0; i < 8; i++) spark(st, [255, 160, 120], now, 1.6, 90);
        }
        break;
      case 'teleport':
        ring(S, mix(col, WHITE, 0.5), now, 0.6, 2.5, 0.6, 3);
        break;
      case 'add': case 'remove':
        fx.push({ k: 'line', a: S, b: T, col: e.card === 'add' ? mix(col, WHITE, 0.5) : [255, 110, 90], t0: now, dur: 1.1 });
        break;
      case 'fleet':
        ring(T, col, now, 1.0, 1, 4, 3);
        for (let i = 0; i < 20; i++) spark(T, col, now, 1.4, 70);
        break;
      default:
        ring(T, col, now, 1.0, 1, 3.8, 3);
    }
  }

  /** 点了不能用的目标：红圈闪一下 */
  function flashDeny(id, now) {
    const st = G && G.stars[id];
    if (st) fx.push({ k: 'ring', x: st.x, y: st.y, col: [255, 70, 70], t0: now, dur: 0.45, r0: 2.6, r1: 1.6, w: 3 });
  }

  function spark(s, col, now, spread, speed) {
    const a = Math.random() * Math.PI * 2, d = Math.random() * STAR_R * s.size * spread;
    const v = (0.3 + Math.random()) * speed;
    fx.push({
      k: 'spark', col, t0: now, dur: 0.3 + Math.random() * 0.35,
      x: s.x + Math.cos(a) * d, y: s.y + Math.sin(a) * d,
      vx: Math.cos(a) * v, vy: Math.sin(a) * v,
    });
  }

  // ——— 主绘制 ———

  /**
   * @param {number} rt   渲染时刻（对局秒，含步间插值）
   * @param {number} now  墙钟秒（动画用，暂停时也走）
   * @param {object} ui   { me, drags, guide, armed, ... }（见 input.js）
   */
  function draw(rt, now, ui) {
    if (!G) return;
    const dt = Math.min(0.25, Math.max(0, now - lastNow));
    lastNow = now;
    const wasReveal = reveal;
    updateReveal(ui ? ui.me : -1);

    // 迷雾的淡入淡出：进入视野快（4/秒），离开慢（0.5/秒）；新知道的星 0.7 秒浮现
    for (const s of G.stars) {
      const t = seenTarget(s), a = seenA[s.id];
      seenA[s.id] = t > a ? Math.min(t, a + dt * 4) : Math.max(t, a - dt * 0.5);
      const k = known(s) ? 1 : 0, b = knownA[s.id];
      knownA[s.id] = k > b ? Math.min(1, b + dt * 1.5) : Math.max(0, b - dt * 3);
      vis[s.id] = mix(vis[s.id], starTarget(s), 0.12);
    }
    for (let f = 0; f < facA.length; f++) {
      const t = stealthSet.has(f) ? 0 : 1;
      facA[f] = t > facA[f] ? Math.min(1, facA[f] + dt * 2) : Math.max(0, facA[f] - dt * 2);
    }

    // 镜头平滑跟随已知区域；拖拽中不动，免得目标在手指下面跑掉
    camT = fitCamera();
    const dragging = !!ui && (ui.drags ? ui.drags.size > 0 : ui.press >= 0);
    if (!dragging) {
      const k = wasReveal !== reveal ? 0.05 : 1 - Math.exp(-dt * 2.2);
      cam = { s: cam.s + (camT.s - cam.s) * k, ox: cam.ox + (camT.ox - cam.ox) * k, oy: cam.oy + (camT.oy - cam.oy) * k };
    }

    if (!bg) bg = buildBackground();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.drawImage(bg, 0, 0);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    drawRoutes();
    drawTransit(rt);
    drawOrders(now);
    for (const s of G.stars) drawStar(s, now);
    drawEffects(now);
    drawFx(now);
    drawPreview(ui, now);
    drawGuide(ui, now);
    drawTargeting(ui, now);
    drawLabels();
  }

  function routeAlpha(s) {
    if (reveal) return 1;
    const a = seenA[s.id];
    return (explored(s) ? 0.45 + 0.55 * a : 0.15 + 0.85 * a) * knownA[s.id];
  }

  function drawRoutes() {
    ctx.lineCap = 'round';
    const lw = Math.max(1.2, cam.s * 0.07);
    for (const r of G.routes) {
      const A = G.stars[r.a], B = G.stars[r.b];
      if (knownA[r.a] < 0.01 || knownA[r.b] < 0.01) continue;
      const same = A.owner >= 0 && A.owner === B.owner;
      const col = same ? facRgb[A.owner] : [140, 165, 225];
      let base = same ? 0.3 : 0.26;
      // 拓宽：线宽 ×2 且更亮；干扰：线宽减半、断断续续
      ctx.lineWidth = r.w > 0 ? lw * 2.2 : r.w < 0 ? lw * 0.6 : lw;
      if (r.w > 0) base = Math.min(0.75, base * 2.2);
      ctx.setLineDash(r.w < 0 ? [cam.s * 0.14, cam.s * 0.16] : []);
      const ax = sx(A.x, A.y), ay = sy(A.x, A.y), bx = sx(B.x, B.y), by = sy(B.x, B.y);
      const pa = routeAlpha(A), pb = routeAlpha(B);
      if (Math.abs(pa - pb) < 0.02) {
        ctx.strokeStyle = rgba(col, base * pa);
      } else {
        const g = ctx.createLinearGradient(ax, ay, bx, by);
        g.addColorStop(0, rgba(col, base * pa));
        g.addColorStop(1, rgba(col, base * pb));
        ctx.strokeStyle = g;
      }
      ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.stroke();
    }
    ctx.setLineDash([]);
  }

  function drawOrders(now) {
    // 有外发的星：沿航线流动的虚线 + 星旁的箭头（别人的只在看得见时画）
    for (const s of G.stars) {
      if (s.owner < 0 || s.order < 0) continue;
      const alpha = Math.min(infoA(s), knownA[s.id]);
      if (alpha < 0.02) continue;
      const T = G.stars[s.order];
      const col = facRgb[s.owner];
      const ax = sx(s.x, s.y), ay = sy(s.x, s.y), bx = sx(T.x, T.y), by = sy(T.x, T.y);
      const len = Math.hypot(bx - ax, by - ay) || 1;
      const ux = (bx - ax) / len, uy = (by - ay) / len;
      const r0 = starR(s) * 1.9, r1 = starR(T) * 1.9;
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.strokeStyle = rgba(col, 0.55);
      ctx.lineWidth = Math.max(1.5, cam.s * 0.08);
      ctx.setLineDash([cam.s * 0.35, cam.s * 0.45]);
      ctx.lineDashOffset = -now * cam.s * 1.6;
      ctx.beginPath(); ctx.moveTo(ax + ux * r0, ay + uy * r0); ctx.lineTo(bx - ux * r1, by - uy * r1); ctx.stroke();
      ctx.setLineDash([]);
      // 箭头
      const d = starR(s) * 2.45 + Math.sin(now * 5) * 1.5;
      const hx = ax + ux * d, hy = ay + uy * d;
      const w = Math.max(5, cam.s * 0.32), h = Math.max(6, cam.s * 0.42);
      ctx.fillStyle = rgba(col, 0.95);
      ctx.beginPath();
      ctx.moveTo(hx + ux * h * 0.6, hy + uy * h * 0.6);
      ctx.lineTo(hx - ux * h * 0.4 - uy * w * 0.6, hy - uy * h * 0.4 + ux * w * 0.6);
      ctx.lineTo(hx - ux * h * 0.15, hy - uy * h * 0.15);
      ctx.lineTo(hx - ux * h * 0.4 + uy * w * 0.6, hy - uy * h * 0.4 - ux * w * 0.6);
      ctx.closePath(); ctx.fill();
      ctx.restore();
    }
  }

  function drawTransit(rt) {
    const size = Math.max(2.2, cam.s * 0.12);
    // 按「势力 × 透明度档位（10 档）」分桶，每桶一次 stroke + 一次 fill，几百艘船也只有几十次绘制调用
    const F = G.factions.length;
    const buckets = new Map();
    for (const tr of G.transit) {
      let p = (rt - tr.t0) / (tr.t1 - tr.t0);
      if (p < 0) p = 0; else if (p > 1) p = 1;
      // 别人的船：按两端的在场程度插值（走出视野就淡掉），开着暗幕的整方淡出
      const a = reveal || tr.f === me ? 1 : (seenA[tr.from] + (seenA[tr.to] - seenA[tr.from]) * p) * facA[tr.f];
      const q = Math.round(a * 10);
      if (q <= 0) continue;
      const key = (tr.f * 11 + q) * 2 + (tr.tp ? 1 : 0);
      let b = buckets.get(key);
      if (!b) buckets.set(key, (b = []));
      const A = G.stars[tr.from], B = G.stars[tr.to];
      const ax = sx(A.x, A.y), ay = sy(A.x, A.y), bx = sx(B.x, B.y), by = sy(B.x, B.y);
      b.push(ax, ay, bx, by, p, tr.n);
    }
    ctx.lineCap = 'round';
    ctx.lineWidth = Math.max(1, size * 0.45);
    for (const [key2, b] of buckets) {
      const tp = key2 % 2 === 1, key = key2 >> 1;
      const f = Math.floor(key / 11), a = (key % 11) / 10;
      if (f >= F) continue;
      const col = facRgb[f];
      ctx.lineWidth = Math.max(1, size * (tp ? 0.9 : 0.45));
      ctx.strokeStyle = tp ? rgba(mix(col, WHITE, 0.5), 0.75 * a) : rgba(col, 0.35 * a);
      ctx.beginPath();
      for (let i = 0; i < b.length; i += 6) {
        const ax = b[i], ay = b[i + 1], bx = b[i + 2], by = b[i + 3], p = b[i + 4];
        const x = ax + (bx - ax) * p, y = ay + (by - ay) * p;
        const len = Math.hypot(bx - ax, by - ay) || 1;
        const tl = Math.min(p * len, (tp ? 2.4 : 0.45) * cam.s);
        ctx.moveTo(x - ((bx - ax) / len) * tl, y - ((by - ay) / len) * tl);
        ctx.lineTo(x, y);
      }
      ctx.stroke();
      ctx.fillStyle = rgba(mix(col, WHITE, tp ? 0.6 : 0.35), a);
      ctx.beginPath();
      for (let i = 0; i < b.length; i += 6) {
        const ax = b[i], ay = b[i + 1], bx = b[i + 2], by = b[i + 3], p = b[i + 4];
        const z = size * (tp ? 1.9 : 1 + Math.min(b[i + 5] - 1, 3) * 0.25);
        ctx.rect(ax + (bx - ax) * p - z / 2, ay + (by - ay) * p - z / 2, z, z);
      }
      ctx.fill();
    }
  }

  function drawStar(s, now) {
    const kA = knownA[s.id];
    if (kA < 0.01) return;
    const x = sx(s.x, s.y), y = sy(s.x, s.y), r = starR(s);
    const col = vis[s.id];
    const owned = s.owner >= 0;
    const F = s.ships.length;
    const iA = infoA(s) * kA;
    const nebula = s.anomaly === 'nebula';

    ctx.save();
    // 只知道、还没到过的边缘星画暗一些，迷雾的边界一眼可见
    ctx.globalAlpha = kA * (explored(s) ? 1 : 0.5);

    // 异常天体（到过才看得见；星云本身就是星的样子，一直画）
    if (s.anomaly && !nebula && explored(s)) drawAnomaly(s, x, y, r, now);

    // 进攻方光晕：握有控制度最高的非星主一方
    let att = -1, attC = 0;
    for (let f = 0; f < F; f++) if (f !== s.owner && s.control[f] > attC) { att = f; attC = s.control[f]; }
    ctx.globalCompositeOperation = 'lighter';
    if (att >= 0 && s.ships[att] > 0 && iA > 0.02) {
      const g = ctx.createRadialGradient(x, y, r * 0.8, x, y, r * 3.4);
      g.addColorStop(0, rgba(facRgb[att], (0.38 * attC / 100 + 0.12) * iA));
      g.addColorStop(1, rgba(facRgb[att], 0));
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(x, y, r * 3.4, 0, Math.PI * 2); ctx.fill();
    }

    if (nebula) {
      drawNebula(s, x, y, r, col, now, owned);
    } else {
      // 光晕：势力星亮而饱和，中立星收着
      const gr = owned ? r * 3.2 : r * 2.3;
      const glow = ctx.createRadialGradient(x, y, 0, x, y, gr);
      glow.addColorStop(0, rgba(col, owned ? 0.55 : 0.2));
      glow.addColorStop(0.4, rgba(col, owned ? 0.18 : 0.05));
      glow.addColorStop(1, rgba(col, 0));
      ctx.fillStyle = glow;
      ctx.beginPath(); ctx.arc(x, y, gr, 0, Math.PI * 2); ctx.fill();
      ctx.globalCompositeOperation = 'source-over';
      // 星体（带一点呼吸；等离子星抖得厉害些）：势力星只留很小的白芯，主体是势力色
      const wob = s.anomaly === 'plasma' && explored(s) ? 0.1 * Math.sin(now * 9 + s.id) : 0;
      const br = r * (1 + 0.05 * Math.sin(now * 2.2 + s.x * 1.3 - s.y) + wob);
      const body = ctx.createRadialGradient(x, y, 0, x, y, br);
      body.addColorStop(0, rgba(mix(col, WHITE, owned ? 0.75 : 0.9), 1));
      body.addColorStop(owned ? 0.22 : 0.35, rgba(mix(col, WHITE, owned ? 0.2 : 0.55), 1));
      body.addColorStop(0.62, rgba(col, owned ? 0.95 : 0.7));
      body.addColorStop(1, rgba(col, 0));
      ctx.fillStyle = body;
      ctx.beginPath(); ctx.arc(x, y, br, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalCompositeOperation = 'source-over';

    if (iA > 0.02) {
      ctx.globalAlpha = iA;
      // 原地防守的护盾环
      if (owned && s.order < 0) {
        ctx.strokeStyle = rgba(facRgb[s.owner], 0.28 + 0.12 * Math.sin(now * 3 + s.id));
        ctx.lineWidth = 1.4;
        ctx.beginPath(); ctx.arc(x, y, r * 2.35, 0, Math.PI * 2); ctx.stroke();
      }

      // 控制度圆环：星主顺时针，挑战者逆时针（都从正上方起）
      const ring = r * 1.85;
      const lead = owned ? s.owner : dominantControl(s);
      const contested = att >= 0 && attC > 0;
      if ((owned && (s.control[s.owner] < 100 || contested)) || (!owned && lead >= 0 && s.control[lead] > 0)) {
        ctx.lineWidth = Math.max(2, r * 0.18);
        ctx.strokeStyle = 'rgba(255,255,255,0.10)';
        ctx.beginPath(); ctx.arc(x, y, ring, 0, Math.PI * 2); ctx.stroke();
        if (lead >= 0 && s.control[lead] > 0) {
          ctx.strokeStyle = rgba(facRgb[lead], 0.95);
          ctx.beginPath(); ctx.arc(x, y, ring, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * s.control[lead] / 100); ctx.stroke();
        }
        if (owned && contested) {
          ctx.strokeStyle = rgba(facRgb[att], 0.95);
          ctx.beginPath(); ctx.arc(x, y, ring, -Math.PI / 2, -Math.PI / 2 - Math.PI * 2 * attC / 100, true); ctx.stroke();
        }
      }

    }
    {
      // 驻军：绕星旋转的光点（每方最多画 28 个）；自己的舰船永远看得见
      let lane = 0;
      for (let k = -1; k < F; k++) {
        const f = k < 0 ? s.owner : k;
        if (f < 0 || (k >= 0 && f === s.owner)) continue;
        const n = s.ships[f];
        if (n <= 0) continue;
        const fa = f === me ? kA : iA;
        if (fa < 0.02) { lane++; continue; }
        ctx.globalAlpha = fa;
        const m = Math.min(n, 28);
        const orbit = r * (1.32 + lane * 0.28);
        const w = (f === s.owner ? 0.7 : -1.0) * (1 + lane * 0.1);
        ctx.fillStyle = rgba(mix(facRgb[f], WHITE, 0.25), 0.95);
        ctx.beginPath();
        for (let i = 0; i < m; i++) {
          const a = now * w + (i / m) * Math.PI * 2 + s.id;
          const px = x + Math.cos(a) * orbit, py = y + Math.sin(a) * orbit * 0.92;
          ctx.moveTo(px + 1.5, py);
          ctx.arc(px, py, 1.5, 0, Math.PI * 2);
        }
        ctx.fill();
        lane++;
      }
    }
    ctx.restore();
  }

  /** 生效中的能力标记（看得见的才画）：爱国护盾、宣传虚线环、防御炮台、破坏瞄准刻度；自己开暗幕时自己的星蒙一层紫纱 */
  function drawEffects(now) {
    for (const e of G.effects) {
      if (e.card !== 'patriotism' && e.card !== 'propaganda' && e.card !== 'defense' && e.card !== 'offense') continue;
      const s = G.stars[e.dst];
      const k = knownA[s.id];
      const v = (reveal || e.f === me ? 1 : infoA(s)) * k;
      if (v < 0.05) continue;
      const x = sx(s.x, s.y), y = sy(s.x, s.y), r = starR(s);
      const col = facRgb[e.f];
      const fade = Math.min(1, Math.max(0, e.until - G.time) / 2);   // 最后 2 秒淡出
      ctx.save();
      ctx.globalAlpha = v * (0.35 + 0.65 * fade);
      ctx.strokeStyle = rgba(mix(col, WHITE, 0.25), 0.9);
      ctx.fillStyle = rgba(mix(col, WHITE, 0.35), 0.95);
      if (e.card === 'patriotism') {
        ctx.lineWidth = 2.5;
        ctx.beginPath(); ctx.arc(x, y, r * 2.75, 0, Math.PI * 2); ctx.stroke();
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.arc(x, y, r * 3.05, 0, Math.PI * 2); ctx.stroke();
      } else if (e.card === 'propaganda') {
        ctx.lineWidth = 2;
        ctx.setLineDash([r * 0.55, r * 0.4]);
        ctx.lineDashOffset = -now * r * 2.5;
        ctx.beginPath(); ctx.arc(x, y, r * 2.85, 0, Math.PI * 2); ctx.stroke();
      } else if (e.card === 'defense') {
        ctx.lineWidth = 1.2;
        ctx.beginPath(); ctx.arc(x, y, r * 2.6, 0, Math.PI * 2); ctx.stroke();
        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
          const a = now * 0.8 + (i * Math.PI) / 3;
          const px = x + Math.cos(a) * r * 2.6, py = y + Math.sin(a) * r * 2.6;
          ctx.moveTo(px + 3, py); ctx.arc(px, py, 3, 0, Math.PI * 2);
        }
        ctx.fill();
      } else {
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        for (let i = 0; i < 4; i++) {
          const a = now * 0.6 + (i * Math.PI) / 2;
          ctx.moveTo(x + Math.cos(a) * r * 3.2, y + Math.sin(a) * r * 3.2);
          ctx.lineTo(x + Math.cos(a) * r * 2.35, y + Math.sin(a) * r * 2.35);
        }
        ctx.stroke();
      }
      ctx.restore();
    }
    if (meStealth) {
      for (const s of G.stars) {
        if (s.owner !== me) continue;
        const x = sx(s.x, s.y), y = sy(s.x, s.y), r = starR(s);
        const g = ctx.createRadialGradient(x, y, r, x, y, r * 2.6);
        g.addColorStop(0, 'rgba(120,80,200,0.28)');
        g.addColorStop(1, 'rgba(120,80,200,0)');
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(x, y, r * 2.6, 0, Math.PI * 2); ctx.fill();
      }
    }
  }

  /** 点了一张卡之后：可选目标闪烁；两步卡选好出发点后，指向悬停的星（不合法时红色虚线） */
  function drawTargeting(ui, now) {
    if (!ui || !ui.armed || me < 0) return;
    const card = ui.armed;
    const col = facRgb[me];
    const pulse = 0.55 + 0.45 * Math.sin(now * 6);
    const mark = (st, solid) => {
      ctx.beginPath(); ctx.arc(sx(st.x, st.y), sy(st.x, st.y), starR(st) * 2.5, 0, Math.PI * 2); ctx.stroke();
    };
    ctx.save();
    ctx.lineWidth = 2;
    if (ui.abSrc < 0) {
      ctx.setLineDash([5, 4]);
      ctx.lineDashOffset = -now * 18;
      ctx.strokeStyle = rgba(mix(col, WHITE, 0.3), 0.45 + 0.45 * pulse);
      for (const st of G.stars) if (knownA[st.id] > 0.5 && validFirst(G, me, card, st.id)) mark(st);
    } else {
      const S = G.stars[ui.abSrc];
      ctx.strokeStyle = 'rgba(255,255,255,0.9)';
      ctx.lineWidth = 2.5;
      mark(S);
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 4]);
      ctx.lineDashOffset = -now * 18;
      ctx.strokeStyle = rgba(mix(col, WHITE, 0.3), 0.45 + 0.45 * pulse);
      // 突击队能飞向任意一颗星：不逐个圈出来，只画指向线
      if (ABILITIES[card].target !== 'teleport') {
        for (const st of G.stars) if (st.id !== ui.abSrc && knownA[st.id] > 0.5 && validSecond(G, me, card, ui.abSrc, st.id)) mark(st);
      }
      if (ui.abHover >= 0 && ui.abHover !== ui.abSrc) {
        const T = G.stars[ui.abHover];
        const ok = validSecond(G, me, card, ui.abSrc, ui.abHover);
        ctx.setLineDash(ok ? [] : [6, 6]);
        ctx.strokeStyle = ok ? rgba(mix(col, WHITE, 0.4), 0.95) : 'rgba(255,90,90,0.85)';
        ctx.lineWidth = ok ? 3 : 2;
        ctx.beginPath(); ctx.moveTo(sx(S.x, S.y), sy(S.x, S.y)); ctx.lineTo(sx(T.x, T.y), sy(T.x, T.y)); ctx.stroke();
      }
    }
    ctx.restore();
  }

  function dominantControl(s) {
    let best = -1, c = 0;
    for (let f = 0; f < s.control.length; f++) if (s.control[f] > c) { c = s.control[f]; best = f; }
    return best;
  }

  // ——— 异常天体 ———

  /** 星云：没有清晰的星体，是几团缓慢翻涌的光雾 */
  function drawNebula(s, x, y, r, col, now, owned) {
    for (let i = 0; i < 6; i++) {
      const dir = i % 2 ? 1 : -1;
      const a = now * 0.12 * dir + i * 1.047 + s.id;
      const d = r * (0.3 + 0.35 * hash(i, s.id));
      const bx = x + Math.cos(a) * d, by = y + Math.sin(a) * d;
      const br = r * (1.15 + 0.5 * hash(i + 7, s.id));
      const g = ctx.createRadialGradient(bx, by, 0, bx, by, br);
      g.addColorStop(0, rgba(col, owned ? 0.3 : 0.2));
      g.addColorStop(0.55, rgba(col, owned ? 0.12 : 0.07));
      g.addColorStop(1, rgba(col, 0));
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(bx, by, br, 0, Math.PI * 2); ctx.fill();
    }
    const core = ctx.createRadialGradient(x, y, 0, x, y, r * 0.55);
    core.addColorStop(0, rgba(mix(col, WHITE, 0.6), 0.55));
    core.addColorStop(1, rgba(col, 0));
    ctx.fillStyle = core;
    ctx.beginPath(); ctx.arc(x, y, r * 0.55, 0, Math.PI * 2); ctx.fill();
  }

  function drawAnomaly(s, x, y, r, now) {
    const id = s.id;
    ctx.save();
    if (s.anomaly === 'gas') {
      // 气体云：青色雾环 + 几团缓慢漂移的烟
      ctx.globalCompositeOperation = 'lighter';
      const g = ctx.createRadialGradient(x, y, r * 0.8, x, y, r * 3);
      g.addColorStop(0, rgba(TEAL, 0));
      g.addColorStop(0.35, rgba(TEAL, 0.17));
      g.addColorStop(1, rgba(TEAL, 0));
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(x, y, r * 3, 0, Math.PI * 2); ctx.fill();
      for (let i = 0; i < 4; i++) {
        const a = now * 0.18 + i * 1.571 + id;
        const px = x + Math.cos(a) * r * 2, py = y + Math.sin(a) * r * 1.8;
        const pg = ctx.createRadialGradient(px, py, 0, px, py, r * 0.95);
        pg.addColorStop(0, rgba(TEAL, 0.13));
        pg.addColorStop(1, rgba(TEAL, 0));
        ctx.fillStyle = pg;
        ctx.beginPath(); ctx.arc(px, py, r * 0.95, 0, Math.PI * 2); ctx.fill();
      }
    } else if (s.anomaly === 'plasma') {
      // 等离子：闪烁的橙色日冕，一颗被撕碎的红矮星拖着一道物质流
      ctx.globalCompositeOperation = 'lighter';
      const fl = 0.75 + 0.25 * Math.sin(now * 7 + id) * Math.sin(now * 3.3 + id * 2);
      const g = ctx.createRadialGradient(x, y, r * 0.8, x, y, r * 2.7);
      g.addColorStop(0, rgba(EMBER, 0.38 * fl));
      g.addColorStop(1, rgba(EMBER, 0));
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(x, y, r * 2.7, 0, Math.PI * 2); ctx.fill();
      const a = now * 0.9 + id;
      const cx = x + Math.cos(a) * r * 1.85, cy = y + Math.sin(a) * r * 1.65;
      const sg = ctx.createLinearGradient(cx, cy, x, y);
      sg.addColorStop(0, rgba(DWARF, 0.65));
      sg.addColorStop(1, rgba(EMBER, 0));
      ctx.strokeStyle = sg;
      ctx.lineWidth = Math.max(1.5, r * 0.28);
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.quadraticCurveTo(x + Math.cos(a + 0.9) * r * 1.2, y + Math.sin(a + 0.9) * r * 1.1, x, y);
      ctx.stroke();
      const dg = ctx.createRadialGradient(cx, cy, 0, cx, cy, r * 0.42);
      dg.addColorStop(0, 'rgba(255,220,200,0.95)');
      dg.addColorStop(0.5, rgba(DWARF, 0.85));
      dg.addColorStop(1, rgba(DWARF, 0));
      ctx.fillStyle = dg;
      ctx.beginPath(); ctx.arc(cx, cy, r * 0.42, 0, Math.PI * 2); ctx.fill();
    } else if (s.anomaly === 'asteroid') {
      // 小行星带：一圈缓慢公转的碎石
      ctx.fillStyle = rgba(ROCK, 0.85);
      ctx.beginPath();
      const n = 34;
      for (let i = 0; i < n; i++) {
        const j = hash(i, id), j2 = hash(i + 31, id), j3 = hash(i + 63, id);
        const a = (i / n) * Math.PI * 2 + now * 0.12 + j * 0.25;
        const rr = r * (1.5 + 0.32 * j2);
        const px = x + Math.cos(a) * rr, py = y + Math.sin(a) * rr * 0.9;
        const z = 0.7 + 1.3 * j3;
        ctx.moveTo(px + z, py);
        ctx.arc(px, py, z, 0, Math.PI * 2);
      }
      ctx.fill();
    } else if (s.anomaly === 'comets') {
      // 彗星：三颗绕星飞行的彗星，尾巴背向恒星
      ctx.globalCompositeOperation = 'lighter';
      const speeds = [0.9, -0.65, 0.5];
      for (let c = 0; c < 3; c++) {
        const orbit = r * (1.7 + 0.45 * c);
        const a = now * speeds[c] + id * 1.7 + c * 2.1;
        const hx = x + Math.cos(a) * orbit, hy = y + Math.sin(a) * orbit * 0.85;
        const dx = hx - x, dy = hy - y, dl = Math.hypot(dx, dy) || 1;
        const tx = hx + (dx / dl) * r * 1.1, ty = hy + (dy / dl) * r * 1.1;
        const tg = ctx.createLinearGradient(hx, hy, tx, ty);
        tg.addColorStop(0, rgba(ICE, 0.7));
        tg.addColorStop(1, rgba(ICE, 0));
        ctx.strokeStyle = tg;
        ctx.lineWidth = Math.max(1.2, r * 0.16);
        ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(hx, hy); ctx.lineTo(tx, ty); ctx.stroke();
        ctx.fillStyle = 'rgba(235,248,255,0.95)';
        ctx.beginPath(); ctx.arc(hx, hy, Math.max(1.3, r * 0.12), 0, Math.PI * 2); ctx.fill();
      }
    } else if (s.anomaly === 'vortex') {
      // 漩涡：三条旋转的螺旋臂，越往外越淡
      ctx.globalCompositeOperation = 'lighter';
      ctx.lineCap = 'round';
      const spin = -now * 1.1 + id;
      for (let arm = 0; arm < 3; arm++) {
        let px = null, py = null;
        for (let i = 0; i <= 16; i++) {
          const t = i / 16;
          const rad = r * (0.95 + 1.9 * t);
          const ang = spin + arm * 2.094 + t * 2.7;
          const qx = x + Math.cos(ang) * rad, qy = y + Math.sin(ang) * rad * 0.92;
          if (px !== null) {
            ctx.strokeStyle = rgba(VIOLET, 0.42 * (1 - t));
            ctx.lineWidth = Math.max(1, r * 0.2 * (1 - t * 0.6));
            ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(qx, qy); ctx.stroke();
          }
          px = qx; py = qy;
        }
      }
    }
    ctx.restore();
  }

  function drawFx(now) {
    let w = 0;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < fx.length; i++) {
      const e = fx[i];
      const t = (now - e.t0) / e.dur;
      if (t > 1) continue;
      fx[w++] = e;
      if (t < 0) continue;
      if (e.k === 'ring') {
        const rr = (e.r0 + (e.r1 - e.r0) * t) * STAR_R * cam.s;
        ctx.strokeStyle = rgba(e.col, (1 - t) * 0.9);
        ctx.lineWidth = e.w * (1 - t * 0.5);
        ctx.beginPath(); ctx.arc(sx(e.x, e.y), sy(e.x, e.y), rr, 0, Math.PI * 2); ctx.stroke();
      } else if (e.k === 'line') {
        ctx.strokeStyle = rgba(e.col, (1 - t) * 0.95);
        ctx.lineWidth = Math.max(1.5, cam.s * 0.25 * (1 - t * 0.7));
        ctx.beginPath(); ctx.moveTo(sx(e.a.x, e.a.y), sy(e.a.x, e.a.y)); ctx.lineTo(sx(e.b.x, e.b.y), sy(e.b.x, e.b.y)); ctx.stroke();
      } else if (e.k === 'spark') {
        const age = t * e.dur;
        const px = sx(e.x, e.y) + e.vx * age, py = sy(e.x, e.y) + e.vy * age;
        ctx.fillStyle = rgba(mix(e.col, WHITE, 0.4), 1 - t);
        ctx.fillRect(px - 1.2, py - 1.2, 2.4, 2.4);
      }
    }
    fx.length = w;
    ctx.restore();
  }

  /** 拖拽中的调兵预览（多指时每根手指一份） */
  function drawPreview(ui, now) {
    if (!ui) return;
    const list = ui.drags ? ui.drags.values() : ui.press >= 0 ? [{ star: ui.press, hover: ui.hover }] : [];
    for (const d of list) drawDrag(d.star, d.hover, now);
  }

  function drawDrag(star, hover, now) {
    const s = G.stars[star];
    const x = sx(s.x, s.y), y = sy(s.x, s.y), r = starR(s);
    // 可选目标：相邻的星淡淡圈出来
    ctx.strokeStyle = 'rgba(255,255,255,0.22)';
    ctx.lineWidth = 1.5;
    for (const nb of s.links) {
      const N = G.stars[nb];
      ctx.beginPath(); ctx.arc(sx(N.x, N.y), sy(N.x, N.y), starR(N) * 2.3, 0, Math.PI * 2); ctx.stroke();
    }
    ctx.strokeStyle = 'rgba(255,255,255,0.85)';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(x, y, r * 2.6, 0, Math.PI * 2); ctx.stroke();
    if (hover >= 0) {
      const T = G.stars[hover];
      const tx = sx(T.x, T.y), ty = sy(T.x, T.y);
      const col = s.owner >= 0 ? facRgb[s.owner] : WHITE;
      ctx.strokeStyle = rgba(col, 0.95);
      ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.arc(tx, ty, starR(T) * 2.6, 0, Math.PI * 2); ctx.stroke();
      ctx.save();
      ctx.setLineDash([6, 6]);
      ctx.lineDashOffset = -now * 40;
      ctx.strokeStyle = 'rgba(255,255,255,0.8)';
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(tx, ty); ctx.stroke();
      ctx.restore();
    }
  }

  /**
   * 教程的手势提示：从一颗星拖到另一颗星的「手指光点」循环播放（按住 0.3 秒 → 拖 1 秒 → 淡出 0.5 秒），
   * 或在一颗星上画脉冲圈。ui.guide = { from, to } 或 { star }
   */
  function drawGuide(ui, now) {
    const g = ui && ui.guide;
    if (!g || !G) return;
    ctx.save();
    const pulseRing = (st, k) => {
      const r = starR(st) * (2.4 + 0.5 * k);
      ctx.strokeStyle = `rgba(255,236,170,${0.9 * (1 - k)})`;
      ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.arc(sx(st.x, st.y), sy(st.x, st.y), r, 0, Math.PI * 2); ctx.stroke();
    };
    if (g.from >= 0 && g.to >= 0) {
      const A = G.stars[g.from], B = G.stars[g.to];
      const ax = sx(A.x, A.y), ay = sy(A.x, A.y), bx = sx(B.x, B.y), by = sy(B.x, B.y);
      const t = now % 1.8;
      const e = (u) => (u < 0.5 ? 2 * u * u : 1 - 2 * (1 - u) * (1 - u));
      const p = t < 0.3 ? 0 : t < 1.3 ? e((t - 0.3) / 1.0) : 1;
      const fade = t > 1.3 ? 1 - (t - 1.3) / 0.5 : 1;
      ctx.setLineDash([6, 7]);
      ctx.lineDashOffset = -now * 30;
      ctx.strokeStyle = 'rgba(255,236,170,0.45)';
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.stroke();
      ctx.setLineDash([]);
      pulseRing(B, (now * 0.8) % 1);
      if (t < 0.6) pulseRing(A, t / 0.6);
      const x = ax + (bx - ax) * p, y = ay + (by - ay) * p;
      const gl = ctx.createRadialGradient(x, y, 0, x, y, 18);
      gl.addColorStop(0, `rgba(255,248,220,${0.95 * fade})`);
      gl.addColorStop(0.35, `rgba(255,226,140,${0.55 * fade})`);
      gl.addColorStop(1, 'rgba(255,226,140,0)');
      ctx.fillStyle = gl;
      ctx.beginPath(); ctx.arc(x, y, 18, 0, Math.PI * 2); ctx.fill();
    } else if (g.star >= 0) {
      const st = G.stars[g.star];
      pulseRing(st, (now * 0.8) % 1);
      pulseRing(st, (now * 0.8 + 0.5) % 1);
    }
    ctx.restore();
  }

  function drawLabels() {
    ctx.font = '600 13px "Segoe UI", "Microsoft YaHei", sans-serif';
    ctx.textBaseline = 'top';
    ctx.lineJoin = 'round';
    for (const s of G.stars) {
      const a = infoA(s) * knownA[s.id];
      const mineHere = me >= 0 && s.ships[me] > 0 && knownA[s.id] > 0.05;
      if (a < 0.05 && !mineHere) continue;
      const parts = [];
      const show = (f) => a >= 0.05 || f === me;
      if (s.owner >= 0 && show(s.owner)) parts.push([s.owner, s.ships[s.owner]]);
      for (let f = 0; f < s.ships.length; f++) if (f !== s.owner && s.ships[f] > 0 && show(f)) parts.push([f, s.ships[f]]);
      if (!parts.length) continue;
      // 多方兵力之间用灰色「·」隔开，免得「1 9」被看成 19
      const sep = ' · ';
      const sepW = ctx.measureText(sep).width;
      const texts = parts.map(([f, n]) => [f, String(n)]);
      const widths = texts.map(([, t]) => ctx.measureText(t).width);
      const total = widths.reduce((p, q) => p + q, 0) + sepW * (texts.length - 1);
      let x = sx(s.x, s.y) - total / 2;
      const y = sy(s.x, s.y) + starR(s) * 2.35 + 3;
      ctx.globalAlpha = Math.max(a, mineHere ? knownA[s.id] : 0);
      ctx.lineWidth = 3.5;
      ctx.strokeStyle = 'rgba(0,0,0,0.8)';
      texts.forEach(([f, t], i) => {
        if (i > 0) {
          ctx.fillStyle = 'rgba(170,180,200,0.8)';
          ctx.strokeText(sep, x, y); ctx.fillText(sep, x, y);
          x += sepW;
        }
        ctx.strokeText(t, x, y);
        ctx.fillStyle = rgba(mix(facRgb[f], WHITE, 0.2), 1);
        ctx.fillText(t, x, y);
        x += widths[i];
      });
    }
    ctx.globalAlpha = 1;
  }

  /** 从 press 星出发、朝屏幕点 (px,py) 方向，夹角最小的相邻星 */
  function aimNeighbor(starId, px, py) {
    const s = G.stars[starId];
    const dx = px - sx(s.x, s.y), dy = py - sy(s.x, s.y);
    const dl = Math.hypot(dx, dy);
    if (dl < 1) return -1;
    let best = -1, bestCos = -2;
    for (const nb of s.links) {
      const N = G.stars[nb];
      const nx = sx(N.x, N.y) - sx(s.x, s.y), ny = sy(N.x, N.y) - sy(s.x, s.y);
      const nl = Math.hypot(nx, ny) || 1;
      const c = (dx * nx + dy * ny) / (dl * nl);
      if (c > bestCos) { bestCos = c; best = nb; }
    }
    return best;
  }

  /** 星的屏幕坐标与半径（CSS 像素，相对画布左上角） */
  const starScreen = (id) => { const s = G.stars[id]; return { x: sx(s.x, s.y), y: sy(s.x, s.y), r: starR(s) }; };

  return {
    setGame, resize, draw, onEvent, flashDeny, pickStar, aimNeighbor, toWorld, starScreen, starView,
    get camera() { return cam; }, insets,
  };
}
