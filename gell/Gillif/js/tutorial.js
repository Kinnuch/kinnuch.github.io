// 新手教程：固定的小星图、一个新兵难度的对手。按玩家的进度在星旁依次弹出提示（锚在星或卡牌栏上），
// 画布上配手势动画。只读局面、不改规则；最后一步放完（或这局结束）就记为做完。
//
// 前四步按顺序：认识母星 → 拖拽派兵 → 占领 → 继续扩张；之后的几步看局面触发（遇敌、被攻、内陆星、能力卡），
// 每步只放一次；都放过了、或开局超过 5 分半，放收尾的一步。

import { cardReady } from './abilities.js';

/** 教程对局的设置：星图 8 号小型星系，母星两条星路、离对手四跳，近处没有异常天体 */
export const TUTORIAL = { seed: 8, galaxy: 'small', ai: 1, challenge: 'beginner', time: 15, fog: true, deck: ['recruits'] };

// 计时都用对局时间（秒）：暂停时提示不会自己消失
const GAP = 1.2;              // 两步之间的空当
const FIRST_AT = 0.8;         // 开局多久出第一步
const FINAL_AT = 330;         // 开局 5 分半还没触发完，就直接收尾

/**
 * @param {object} env
 *   G, me            对局与玩家势力
 *   ui               输入状态（写 ui.guide 让画面放手势动画）
 *   R                渲染器（starScreen 定位）
 *   bubble           提示框元素（含 .tu-text / .tu-step / .tu-ok / .tu-skip）
 *   cardBar          卡牌栏元素
 *   onDone()         教程做完（或被跳过）
 */
export function createTutorial(env) {
  const { G, me, ui, R, bubble } = env;
  const fac = G.factions[me];
  const home = fac.home;
  const own = (s) => s.owner === me;
  const myStars = () => G.stars.filter(own);
  const orders = () => G.log.filter((c) => c.type === 'order' && c.f === me).length;
  const casts = () => G.log.filter((c) => c.type === 'ability' && c.f === me).length;
  const enemyShips = (s) => s.ships.reduce((a, n, f) => a + (f !== me ? n : 0), 0);

  // 拖拽示范的目标：母星最近的一颗中立邻星
  const dist = (a, b) => Math.hypot(G.stars[a].x - G.stars[b].x, G.stars[a].y - G.stars[b].y);
  const near = G.stars[home].links.slice().sort((a, b) => dist(home, a) - dist(home, b));
  const dragTarget = near.find((n) => G.stars[n].owner < 0) ?? near[0];

  const ctx = { star: -1, orders0: 0, casts0: 0 };

  const STEPS = [
    {
      id: 'home', seq: true, ack: true, max: 7,
      trigger: () => ({ star: home }),
      guide: () => ({ star: home }),
      until: () => myStars().some((s) => s.order >= 0),
      text: '这是你的<b>母星</b>。自己的星会不停地造船，星下方的数字就是驻军。',
    },
    {
      id: 'drag', seq: true, skipIfDone: true,
      trigger: () => ({ star: dragTarget }),
      guide: () => ({ from: home, to: dragTarget }),
      until: () => myStars().some((s) => s.order >= 0),
      text: '<b>按住母星，朝这颗星拖过去，再松手</b>——舰船会沿星路源源不断地飞过去，直到你改主意。',
    },
    {
      id: 'capture', seq: true, skipIfDone: true, max: 45,
      trigger: () => {
        const s = G.stars.find((x) => !own(x) && x.ships[me] >= 4);
        return s ? { star: s.id } : null;
      },
      guide: (a) => ({ star: a.star }),
      until: () => myStars().length >= 2,
      text: '舰队到了。兵力占优的一方会一点点积累<b>控制度</b>（星外那圈圆环），涨满 100，这颗星就归你。',
    },
    {
      id: 'grow', seq: true, ack: true, min: 2.5, max: 16,
      trigger: () => {
        const s = myStars().filter((x) => x.id !== home).pop();
        if (!s) return null;
        ctx.orders0 = orders();
        const next = s.links.find((n) => G.stars[n].owner < 0);
        return { star: s.id, next: next ?? -1 };
      },
      guide: (a) => (a.next >= 0 ? { from: a.star, to: a.next } : { star: a.star }),
      until: () => orders() > ctx.orders0,
      text: '新占的星也会造船。从它<b>继续拖向下一颗星</b>就能接着扩张；<b>点一下</b>自己的星则停止外发、原地防守。',
    },
    {
      id: 'enemy', ack: true, min: 3, max: 10,
      trigger: () => {
        const s = G.stars.find((x) => !own(x) && x.ships[me] > 0 && (enemyShips(x) > 0 || x.owner >= 0));
        return s ? { star: s.id } : null;
      },
      guide: (a) => ({ star: a.star }),
      text: '遇上敌军了。交战中双方每半秒都有损失，<b>兵多的一方</b>才能夺取控制度——零零星星地送上去，不如攒够了再一起压上。',
    },
    {
      id: 'attacked', ack: true, min: 3, max: 10,
      trigger: () => {
        const s = myStars().find((x) => enemyShips(x) > 0);
        return s ? { star: s.id } : null;
      },
      guide: (a) => ({ star: a.star }),
      text: '你的星<b>遭到进攻</b>！点一下让它原地防守（交战损失更少），再从别的星调兵过来支援。',
    },
    {
      id: 'inland', ack: true, min: 2, max: 15,
      trigger: () => {
        const mine = myStars();
        if (mine.length < 3) return null;
        const s = mine.find((x) => x.order < 0 && x.links.every((n) => G.stars[n].owner === me));
        return s ? { star: s.id } : null;
      },
      guide: (a) => ({ star: a.star }),
      until: (a) => G.stars[a.star].order >= 0 || G.stars[a.star].owner !== me,
      text: '这颗星四周都是自己的星，成了<b>内陆星</b>：闲着时不造船。把它的兵沿星路拖往前线吧。',
    },
    {
      id: 'card', ack: true, max: 30,
      trigger: () => {
        const card = fac.deck[0];
        if (!card || !cardReady(G, me, card)) return null;
        ctx.casts0 = casts();
        return { cards: true };
      },
      guide: () => null,
      until: () => casts() > ctx.casts0,
      text: '能力卡准备好了：点一下右边的<b>「征兵」</b>（或按 1），再点你的一颗星，立刻多出三十多艘船。每张卡用过都要冷却一阵。',
    },
    {
      id: 'final', final: true, ack: true, max: 12,
      trigger: () => {
        const s = G.stars[home].owner === me ? home : (myStars()[0] || {}).id;
        return s >= 0 ? { star: s } : { cards: false, star: -1 };
      },
      guide: () => null,
      text: '教程到这里就结束了。<b>消灭所有对手</b>，或在时限到时握有最多的星，就是胜利。之后可以在大厅里换星系、调难度、配自己的能力卡组。',
    },
  ];

  const done = new Set();
  let cur = null;            // { step, anchor, t0, avoid }
  let nextAt = FIRST_AT;
  let finished = false;

  function show(step, anchor) {
    cur = { step, anchor, t0: G.time };
    bubble.querySelector('.tu-text').innerHTML = step.text;
    const seqN = STEPS.filter((s) => s.seq).length;
    const idx = STEPS.indexOf(step);
    bubble.querySelector('.tu-step').textContent = step.seq ? `${idx + 1} / ${seqN}` : step.final ? '完' : '提示';
    bubble.querySelector('.tu-ok').hidden = !step.ack;
    bubble.hidden = false;
    ui.guide = step.guide ? step.guide(anchor) : null;
    const g = ui.guide || {};
    cur.avoid = [g.from, g.to, g.star].filter((x) => x >= 0);
    place();
  }

  function close() {
    if (!cur) return;
    done.add(cur.step.id);
    const wasFinal = cur.step.final;
    cur = null;
    bubble.hidden = true;
    ui.guide = null;
    nextAt = G.time + GAP;
    if (wasFinal) finish();
  }

  function finish() {
    if (finished) return;
    finished = true;
    cur = null;
    bubble.hidden = true;
    ui.guide = null;
    env.onDone();
  }

  /** 每隔一会儿调用：检查当前一步是否完成、下一步是否该出现 */
  function update() {
    if (finished) return;
    if (G.over) { finish(); return; }
    if (cur) {
      const age = G.time - cur.t0;
      const st = cur.step;
      if (age >= (st.min || 0) && st.until && st.until(cur.anchor)) close();
      else if (st.max && age >= st.max) close();
      return;
    }
    if (G.time < nextAt) return;
    // 拖得太久（比如派出去的船半路全折了）：剩下的步骤不等了，直接收尾
    if (G.time >= FINAL_AT) for (const s of STEPS) if (!s.final) done.add(s.id);
    const seq = STEPS.filter((s) => s.seq && !done.has(s.id));
    if (seq.length) {
      const st = seq[0];
      if (st.skipIfDone && st.until && st.until()) { done.add(st.id); return; }
      const a = st.trigger();
      if (a) show(st, a);
      return;
    }
    const rest = STEPS.filter((s) => !s.seq && !s.final && !done.has(s.id));
    for (const st of rest) {
      const a = st.trigger();
      if (a) { show(st, a); return; }
    }
    if (!rest.length || G.time >= FINAL_AT) {
      const st = STEPS.find((s) => s.final);
      show(st, st.trigger());
    }
  }

  /**
   * 每帧调用：提示框跟着锚点走（镜头会动）。星旁四个方向各试一次，挑一个不挡住要点的星
   * （锚点和手势动画涉及的星）、又不用往屏幕里硬挪的位置。
   */
  function place() {
    if (!cur) return;
    const a = cur.anchor;
    const w = bubble.offsetWidth, h = bubble.offsetHeight;
    const W = innerWidth, H = innerHeight;
    const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
    let pick;
    if (a.cards) {
      const r = env.cardBar.getBoundingClientRect();
      pick = { x: r.left - w - 14, y: r.top, side: 'right' };
    } else if (a.star >= 0) {
      const p = R.starScreen(a.star);
      const off = p.r * 2.6 + 16;
      const keep = [{ x: p.x, y: p.y, r: off - 6 }];
      for (const id of cur.avoid) {
        if (id === a.star) continue;
        const q = R.starScreen(id);
        keep.push({ x: q.x, y: q.y, r: q.r * 2.8 + 8 });
      }
      const cands = [
        { x: p.x + off, y: p.y - h / 2, side: 'left' },
        { x: p.x - off - w, y: p.y - h / 2, side: 'right' },
        { x: p.x - w / 2, y: p.y + off, side: 'top' },
        { x: p.x - w / 2, y: p.y - off - h, side: 'bottom' },
      ];
      let best = Infinity;
      for (const c of cands) {
        const x = clamp(c.x, 8, W - w - 8), y = clamp(c.y, 8, H - h - 8);
        let cost = Math.abs(x - c.x) + Math.abs(y - c.y);          // 被屏幕边缘挤动的距离
        for (const k of keep) {
          const nx = clamp(k.x, x, x + w), ny = clamp(k.y, y, y + h);
          const d = Math.hypot(k.x - nx, k.y - ny);
          if (d < k.r) cost += 1000 + (k.r - d) * 10;              // 挡住要点的星：重罚
        }
        if (cost < best) { best = cost; pick = { x, y, side: c.side }; }
      }
    } else {
      pick = { x: (W - w) / 2, y: H * 0.3, side: '' };
    }
    bubble.style.left = `${Math.round(clamp(pick.x, 8, W - w - 8))}px`;
    bubble.style.top = `${Math.round(clamp(pick.y, 8, H - h - 8))}px`;
    bubble.dataset.side = pick.side;
  }

  bubble.querySelector('.tu-ok').onclick = () => close();
  bubble.querySelector('.tu-skip').onclick = () => finish();

  return {
    update, place,
    /** 离开对局时收起（不算做完） */
    stop() { finished = true; cur = null; bubble.hidden = true; ui.guide = null; },
    get step() { return cur ? cur.step.id : null; },
    get finished() { return finished; },
    steps: STEPS.map((s) => s.id),
    dragTarget,
  };
}
