// 地形绘制原语：生成器用它把「地理描述」画成地形网格。
// 这些函数只在构建地图时跑一次（node tools/gen-*.mjs），运行时不加载。
//
// 缩放：setScale(sx, sy) 之后，rect / ellipse / stroke / noiseFill / road / ford
// 的**入口坐标与尺寸**都会乘上缩放 —— 生成器里的地理描述保持旧坐标系不变，
// 地图却可以整体放大。set / get 刻意**不**缩放（真实网格语义），
// 逐格扫描类的代码（铺农地、校验）必须自己用 X()/Y() 换算。

export function makeGrid(w, h, fill = 'O') {
  return { w, h, t: Array.from({ length: h }, () => new Array(w).fill(fill)) };
}

let SX = 1, SY = 1;
export function setScale(sx, sy) { SX = sx; SY = sy; }
export const X = (v) => Math.round(v * SX);
export const Y = (v) => Math.round(v * SY);
const SAVG = () => (SX + SY) / 2;

const inb = (g, x, y) => x >= 0 && y >= 0 && x < g.w && y < g.h;
export const get = (g, x, y) => (inb(g, x, y) ? g.t[y][x] : null);
export const set = (g, x, y, ch) => { if (inb(g, x, y)) g.t[y][x] = ch; };

export function rect(g, x0, y0, x1, y1, ch, only) {
  for (let y = Y(y0); y <= Y(y1); y++) for (let x = X(x0); x <= X(x1); x++) {
    if (only && !only.includes(get(g, x, y))) continue;
    set(g, x, y, ch);
  }
}

/** 椭圆填充，rx/ry 为半径；wobble 用确定性噪声让边缘不那么规整 */
export function ellipse(g, cx, cy, rx, ry, ch, wobble = 0, seed = 1, only) {
  const CX = cx * SX, CY = cy * SY, RX = rx * SX, RY = ry * SY, W = wobble * SAVG();
  for (let y = Math.floor(CY - RY - 2); y <= Math.ceil(CY + RY + 2); y++) {
    for (let x = Math.floor(CX - RX - 2); x <= Math.ceil(CX + RX + 2); x++) {
      const n = W ? (hash(x * 7 + seed, y * 13 + seed) - 0.5) * 2 * W : 0;
      const d = ((x - CX) / (RX + n)) ** 2 + ((y - CY) / (RY + n)) ** 2;
      if (d > 1) continue;
      if (only && !only.includes(get(g, x, y))) continue;
      set(g, x, y, ch);
    }
  }
}

/** 折线加粗描画（山脉、河流都用它）。宽度随缩放放大。 */
export function stroke(g, pts, width, ch, only, wobble = 0, seed = 3) {
  const P = pts.map(([x, y]) => [x * SX, y * SY]);
  const W = width * SAVG(), WO = wobble * SAVG();
  for (let i = 0; i < P.length - 1; i++) {
    const [ax, ay] = P[i], [bx, by] = P[i + 1];
    const steps = Math.max(Math.abs(bx - ax), Math.abs(by - ay)) * 2 + 1;
    for (let s = 0; s <= steps; s++) {
      const t = s / steps;
      const x = ax + (bx - ax) * t, y = ay + (by - ay) * t;
      const w = W + (WO ? (hash(Math.round(x) + seed, Math.round(y) + seed) - 0.5) * 2 * WO : 0);
      const r = Math.max(0, w / 2);
      for (let dy = -Math.ceil(r); dy <= Math.ceil(r); dy++) {
        for (let dx = -Math.ceil(r); dx <= Math.ceil(r); dx++) {
          if (dx * dx + dy * dy > r * r + 0.25) continue;
          const px = Math.round(x + dx), py = Math.round(y + dy);
          if (only && !only.includes(get(g, px, py))) continue;
          set(g, px, py, ch);
        }
      }
    }
  }
}

/**
 * 道路：**四连通**步进 —— 每一步只往 x 或 y 挪一格，拐弯处必然相连，
 * 渲染层按四邻判断就永远不会画出断头路。
 * 穿过河流（V）时自动铺成浅滩 D：路径穿过几格河，就是几格连续的桥，
 * 桥因此天然跨满整条河宽。海与山不铺（留给校验去报断路）。
 */
export function road(g, pts) {
  const P = pts.map(([x, y]) => [X(x), Y(y)]);
  const put = (x, y) => {
    const ch = get(g, x, y);
    if (ch == null || ch === 'O' || ch === 'M') return;
    if (ch === 'V' || ch === 'D') { set(g, x, y, 'D'); return; }
    set(g, x, y, 'R');
  };
  let [cx, cy] = P[0];
  put(cx, cy);
  for (let i = 1; i < P.length; i++) {
    const [tx, ty] = P[i];
    let guard = 0;
    while ((cx !== tx || cy !== ty) && guard++ < 4096) {
      if (Math.abs(tx - cx) >= Math.abs(ty - cy)) cx += Math.sign(tx - cx);
      else cy += Math.sign(ty - cy);
      put(cx, cy);
    }
  }
}

/**
 * 渡口：在指定点附近找到河（V），沿河的**横断面**把整条河宽铺成浅滩 D。
 * 用于没有道路经过、但希望可以徒涉的河段。
 */
export function ford(g, cx, cy) {
  const x0 = X(cx), y0 = Y(cy);
  let fx = -1, fy = -1;
  outer:
  for (let r = 0; r <= 4; r++) {
    for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
      if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
      if (get(g, x0 + dx, y0 + dy) === 'V') { fx = x0 + dx; fy = y0 + dy; break outer; }
    }
  }
  if (fx < 0) return false;

  // 数一数河往哪个方向延伸得长 —— 桥要沿短轴（横断面）铺
  let h = 1, v = 1;
  for (let i = 1; get(g, fx + i, fy) === 'V'; i++) h++;
  for (let i = 1; get(g, fx - i, fy) === 'V'; i++) h++;
  for (let i = 1; get(g, fx, fy + i) === 'V'; i++) v++;
  for (let i = 1; get(g, fx, fy - i) === 'V'; i++) v++;

  set(g, fx, fy, 'D');
  if (h >= v) {   // 河横向流 → 桥纵向跨
    for (let i = 1; get(g, fx, fy + i) === 'V'; i++) set(g, fx, fy + i, 'D');
    for (let i = 1; get(g, fx, fy - i) === 'V'; i++) set(g, fx, fy - i, 'D');
  } else {        // 河纵向流 → 桥横向跨
    for (let i = 1; get(g, fx + i, fy) === 'V'; i++) set(g, fx + i, fy, 'D');
    for (let i = 1; get(g, fx - i, fy) === 'V'; i++) set(g, fx - i, fy, 'D');
  }
  return true;
}

/**
 * 成片填充：粗网格取样 + 双线性插值得到平滑噪声，高于阈值的格子才填。
 * 逐格随机会画出棋盘噪点，这个画出来的是连成片的地貌。scale 越大斑块越大。
 */
export function noiseFill(g, x0, y0, x1, y1, ch, threshold, scale, seed, only) {
  const S = scale * SAVG();
  const n = (x, y) => {
    const gx = x / S, gy = y / S;
    const ix = Math.floor(gx), iy = Math.floor(gy);
    const fx = gx - ix, fy = gy - iy;
    const sm = (a, b, t) => a + (b - a) * (t * t * (3 - 2 * t));
    const v00 = hash(ix + seed, iy + seed * 3);
    const v10 = hash(ix + 1 + seed, iy + seed * 3);
    const v01 = hash(ix + seed, iy + 1 + seed * 3);
    const v11 = hash(ix + 1 + seed, iy + 1 + seed * 3);
    return sm(sm(v00, v10, fx), sm(v01, v11, fx), fy);
  };
  for (let y = Y(y0); y <= Y(y1); y++) for (let x = X(x0); x <= X(x1); x++) {
    if (only && !only.includes(get(g, x, y))) continue;
    const v = n(x, y) * 0.75 + n(x * 2.7, y * 2.7) * 0.25;
    if (v > threshold) set(g, x, y, ch);
  }
}

export function hash(x, y) {
  let h = (x * 374761393 + y * 668265263) | 0;
  h = (h ^ (h >>> 13)) * 1274126177 | 0;
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

export function toRows(g) { return g.t.map((r) => r.join('')); }
