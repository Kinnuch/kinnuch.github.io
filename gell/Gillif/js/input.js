// 输入：鼠标与触屏共用 Pointer Events，支持多指同时操作（同屏多人时每人按住自己的星各拖各的）。
//   按住能操控的星 → 朝某个方向拖 → 松手：这颗星持续向那个方向上的邻星外发
//   点一下：取消外发、原地防守（防守有战斗加成）
//   双击：打信号
//   点别的星：查看详情（api.inspect）；鼠标悬停同样（api.hover）
// 「能操控」由 api.canControl(星) 决定：单人时是自己的星，同屏多人时是任何一位玩家的星，指令记在星主名下。
// 选中一张能力卡后（ui.armed）进入瞄准（只有一根手指 / 鼠标）：
//   单星卡：点一颗合法的星即发动
//   两步卡：从出发星拖到目标星松手；或先点出发星、再点目标星
//   点了不合法的星 → api.deny；右键取消（Esc 由界面处理）
// 只产生指令，不直接改局面。

import { validFirst, validSecond, isTwoStar } from './abilities.js';

const DRAG_PX = 10;       // 移动超过这么多像素才算拖拽
const DOUBLE_MS = 320;    // 双击间隔

export function attachInput(canvas, R, api) {
  // drags：按下手指 → { star, sx, sy, moved, hover }。press / hover 是最近一次拖拽的镜像（自检与旧代码用）
  const drags = new Map();
  const ui = {
    me: -1, drags, press: -1, hover: -1,
    guide: null,                     // 教程的手势提示 { from, to } 或 { star }
    armed: null, pointerId: null, sx: 0, sy: 0, moved: false,
    abSrc: -1, abHover: -1, abPress: -1, abDragging: false,
  };
  let lastTap = { star: -1, t: 0 };

  const pos = (e) => {
    const r = canvas.getBoundingClientRect();
    return [e.clientX - r.left, e.clientY - r.top];
  };
  const capture = (e) => { try { canvas.setPointerCapture(e.pointerId); } catch { /* 合成事件上会拒绝 */ } };
  const mirror = (d) => { ui.press = d ? d.star : -1; ui.hover = d ? d.hover : -1; };

  // ——— 瞄准（选中能力卡之后）———

  function startSourceDrag(id, e, x, y) {
    ui.abSrc = id; ui.abHover = -1; ui.abDragging = true;
    ui.sx = x; ui.sy = y; ui.moved = false; ui.pointerId = e.pointerId;
    capture(e);
    e.preventDefault();
  }

  function armedDown(e, x, y, id) {
    const G = api.game(), me = api.me(), card = ui.armed;
    if (me < 0) return;
    if (isTwoStar(card)) {
      if (ui.abSrc >= 0) {
        // 出发点已选好：这一下是目标（两次点按）
        if (id >= 0 && id !== ui.abSrc && validSecond(G, me, card, ui.abSrc, id)) { api.cast(card, ui.abSrc, id); return; }
        if (id === ui.abSrc) { ui.abSrc = -1; return; }          // 再点一次出发点：重选
        if (id >= 0 && validFirst(G, me, card, id)) { startSourceDrag(id, e, x, y); return; }
        api.deny(id);
        return;
      }
      if (id >= 0 && validFirst(G, me, card, id)) { startSourceDrag(id, e, x, y); return; }
      api.deny(id);
      return;
    }
    if (id >= 0 && validFirst(G, me, card, id)) {
      ui.abPress = id; ui.pointerId = e.pointerId;
      capture(e);
      e.preventDefault();
      return;
    }
    api.deny(id);
  }

  function armedUp(e, x, y) {
    const G = api.game(), me = api.me(), card = ui.armed;
    const id = R.pickStar(x, y);
    if (ui.abPress >= 0) {
      if (id === ui.abPress) api.cast(card, id, id);
      ui.abPress = -1;
    } else if (ui.abDragging) {
      ui.abDragging = false;
      if (ui.moved && id >= 0 && id !== ui.abSrc) {
        if (validSecond(G, me, card, ui.abSrc, id)) api.cast(card, ui.abSrc, id);
        else api.deny(id);
      }
      // 没拖动（或拖到空处）：出发点保留，等第二下点按
    }
    ui.pointerId = null;
  }

  // ——— 调兵拖拽 ———

  function finish(pointerId, cancel) {
    const d = drags.get(pointerId);
    if (!d) return;
    drags.delete(pointerId);
    const G = api.game();
    const star = d.star;
    const owner = G ? G.stars[star].owner : -1;
    if (!cancel && G && !G.over && api.canControl(star)) {
      if (d.moved) {
        if (d.hover >= 0) api.submit({ type: 'order', f: owner, star, target: d.hover });
      } else {
        const now = performance.now();
        if (lastTap.star === star && now - lastTap.t < DOUBLE_MS) {
          api.submit({ type: 'ping', f: owner, star });
          lastTap = { star: -1, t: 0 };
        } else {
          api.submit({ type: 'order', f: owner, star, target: -1 });
          lastTap = { star, t: now };
        }
      }
    }
    mirror([...drags.values()].pop());
    if (!drags.size) canvas.style.cursor = 'default';
  }

  // ——— 指针事件 ———

  canvas.addEventListener('pointerdown', (e) => {
    if (e.pointerType === 'mouse' && e.button !== 0) {
      if (e.button === 2 && ui.armed && api.cancelArm) api.cancelArm();
      return;
    }
    const G = api.game();
    if (!G || G.over || drags.has(e.pointerId)) return;
    const [x, y] = pos(e);
    const id = R.pickStar(x, y);
    if (ui.armed) {
      if (ui.pointerId === null && !drags.size) armedDown(e, x, y, id);
      return;
    }
    if (id < 0 || !api.canControl(id)) {
      if (!drags.size && api.inspect) api.inspect(id, e.pointerType);
      return;
    }
    if (api.hover) api.hover(-1);
    const d = { star: id, sx: x, sy: y, moved: false, hover: -1 };
    drags.set(e.pointerId, d);
    mirror(d);
    capture(e);
    canvas.style.cursor = 'grabbing';
    e.preventDefault();
  });

  canvas.addEventListener('pointermove', (e) => {
    const [x, y] = pos(e);
    if (ui.armed) {
      ui.abHover = R.pickStar(x, y);
      if (ui.abDragging && e.pointerId === ui.pointerId && !ui.moved && Math.hypot(x - ui.sx, y - ui.sy) > DRAG_PX) ui.moved = true;
      canvas.style.cursor = 'crosshair';
      return;
    }
    const d = drags.get(e.pointerId);
    if (!d) {
      // 悬停：能操控的星给个手型指针，并显示详情
      const G = api.game();
      if (G && e.pointerType === 'mouse' && !drags.size) {
        const id = R.pickStar(x, y);
        canvas.style.cursor = id >= 0 && api.canControl(id) ? 'pointer' : 'default';
        if (api.hover) api.hover(id);
      }
      return;
    }
    if (!d.moved && Math.hypot(x - d.sx, y - d.sy) > DRAG_PX) d.moved = true;
    if (d.moved) d.hover = R.aimNeighbor(d.star, x, y);
    mirror(d);
    // 鼠标在拖拽中被松开却没收到 pointerup（窗口外松手等）：自愈
    if (e.pointerType === 'mouse' && e.buttons === 0) finish(e.pointerId, true);
  });

  canvas.addEventListener('pointerup', (e) => {
    if (ui.armed && e.pointerId === ui.pointerId) { const [x, y] = pos(e); armedUp(e, x, y); return; }
    finish(e.pointerId, false);
  });
  canvas.addEventListener('pointercancel', (e) => {
    if (e.pointerId === ui.pointerId && (ui.abPress >= 0 || ui.abDragging)) { ui.abPress = -1; ui.abDragging = false; ui.pointerId = null; return; }
    finish(e.pointerId, true);
  });
  canvas.addEventListener('lostpointercapture', (e) => { if (drags.has(e.pointerId)) finish(e.pointerId, false); });
  canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  canvas.addEventListener('pointerleave', (e) => { if (e.pointerType === 'mouse' && api.hover && !ui.armed) api.hover(-1); });
  window.addEventListener('blur', () => {
    for (const id of [...drags.keys()]) finish(id, true);
    ui.abPress = -1; ui.abDragging = false; ui.pointerId = null;
  });

  /** 换局时清空手势状态 */
  ui.reset = () => { drags.clear(); mirror(null); ui.pointerId = null; lastTap = { star: -1, t: 0 }; };

  return ui;
}
