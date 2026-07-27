// 六边形棋盘：7列 × 8行，odd-r 偏移布局（奇数行右移半格）
export const COLS = 7, ROWS = 8;

export function inBoard(c, r) { return c >= 0 && c < COLS && r >= 0 && r < ROWS; }
export function key(c, r) { return c + ',' + r; }

// odd-r 偏移 → cube 坐标
function toCube(c, r) {
  const q = c - ((r - (r & 1)) >> 1);
  return [q, -q - r, r];
}
export function hexDist(c1, r1, c2, r2) {
  const a = toCube(c1, r1), b = toCube(c2, r2);
  return Math.max(Math.abs(a[0] - b[0]), Math.abs(a[1] - b[1]), Math.abs(a[2] - b[2]));
}
export function neighbors(c, r) {
  const even = (r & 1) === 0;
  const dirs = even
    ? [[1, 0], [-1, 0], [0, -1], [-1, -1], [0, 1], [-1, 1]]
    : [[1, 0], [-1, 0], [1, -1], [0, -1], [1, 1], [0, 1]];
  const out = [];
  for (const [dc, dr] of dirs) {
    const nc = c + dc, nr = r + dr;
    if (inBoard(nc, nr)) out.push([nc, nr]);
  }
  return out;
}
export function cellsWithin(c, r, range) {
  const out = [];
  for (let rr = 0; rr < ROWS; rr++)
    for (let cc = 0; cc < COLS; cc++)
      if (hexDist(c, r, cc, rr) <= range) out.push([cc, rr]);
  return out;
}
// 屏幕坐标（供 UI 使用；单位：格宽比例）
export function hexPixel(c, r) {
  return { x: c + (r & 1 ? 0.5 : 0), y: r * 0.82 };
}
