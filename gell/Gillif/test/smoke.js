// 规则内核无头测试：node test/smoke.js
// 不碰 DOM，只跑 rng / galaxy / state / sim / ai。

import { seedState, rand, randInt } from '../js/rng.js';
import { generateGalaxy, chooseHomes, hopTable, segmentsCross, GALAXY_TYPES, GEN } from '../js/galaxy.js';
import { newGame, buildGame, cleanDeck } from '../js/state.js';
import { step, runSeconds, submit, flushCommands, applyCommand, recount, factionsPresent, leader, score } from '../js/sim.js';
import { RULES, ANOMALY_POOL, CHALLENGES, ABILITIES, DEFAULT_DECK, GROWTH, TITLES } from '../js/rules.js';
import {
  newProfile, normalizeProfile, levelOf, levelProgress, titleOf, pointsAtLevel, abilityPoints, cardAllowed, unlockLevel,
  xpMultiplier, settleGame, MAX_EXP,
} from '../js/profile.js';
import { createTutorial, TUTORIAL } from '../js/tutorial.js';
import { cardReady } from '../js/abilities.js';

let fails = 0, passes = 0;
const ok = (cond, msg) => {
  if (cond) passes++; else fails++;
  if (!cond || process.env.VERBOSE) console.log((cond ? '  ok   ' : '  FAIL ') + msg);
};
const section = (t) => console.log('— ' + t + ' —');

// 手搭小星图：pts = [[x,y],...] 或 [[x,y,'异常'],...]，routes = [[a,b],...]
function tinyGalaxy(pts, routes) {
  const stars = pts.map(([x, y, anomaly], id) => ({ id, x, y, size: 1, tint: [1, 1, 1], anomaly: anomaly || null }));
  const links = stars.map(() => []);
  for (const [a, b] of routes) { links[a].push(b); links[b].push(a); }
  const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]);
  const bounds = { x0: Math.min(...xs), y0: Math.min(...ys), x1: Math.max(...xs), y1: Math.max(...ys) };
  return { stars, routes, links, bounds, center: { x: (bounds.x0 + bounds.x1) / 2, y: (bounds.y0 + bounds.y1) / 2 } };
}
// 默认全由「人」操控，免得 AI 自作主张
const tiny = (pts, routes, homes, o = {}) => buildGame(tinyGalaxy(pts, routes), homes, { seed: 7, humans: homes.map((_, i) => i), timeLimit: 0, sandbox: true, ...o });

// —————————————————————————————————————————————
section('随机数');
{
  const a = seedState(123), b = seedState(123), c = seedState(124);
  const sa = [], sb = [], sc = [];
  for (let i = 0; i < 50; i++) { sa.push(rand(a)); sb.push(rand(b)); sc.push(rand(c)); }
  ok(sa.every((v, i) => v === sb[i]), '同种子同序列');
  ok(sa.some((v, i) => v !== sc[i]), '相邻种子序列不同');
  const st = seedState(9);
  let lo = Infinity, hi = -Infinity;
  for (let i = 0; i < 20000; i++) { const v = randInt(st, 3, 6); lo = Math.min(lo, v); hi = Math.max(hi, v); }
  ok(lo === 3 && hi === 5, `randInt(3,6) 取值 ${lo}–${hi}（不含上限）`);
}

// —————————————————————————————————————————————
section('星系生成（6 种 × 60 个种子）');
{
  const stats = {};
  for (const type of Object.keys(GALAXY_TYPES)) {
    const T = GALAXY_TYPES[type];
    let bad = [], deg = 0, n = 0, routes = 0, dropped = 0;
    for (let seed = 1; seed <= 60; seed++) {
      const g = generateGalaxy(type, seed * 7919);
      const g2 = generateGalaxy(type, seed * 7919);
      if (JSON.stringify(g) !== JSON.stringify(g2)) bad.push(`${seed}:不可复现`);
      dropped += T.stars - g.stars.length;
      if (g.stars.length < T.stars - 2) bad.push(`${seed}:星数${g.stars.length}`);
      // 星距
      for (let i = 0; i < g.stars.length; i++) for (let j = i + 1; j < g.stars.length; j++) {
        const d = Math.hypot(g.stars[i].x - g.stars[j].x, g.stars[i].y - g.stars[j].y);
        if (d < GEN.gapCore * g.scale * 0.999) bad.push(`${seed}:星距${d.toFixed(2)}`);
      }
      // 航线：无重复、两端对称、互不交叉
      const keys = new Set();
      for (const [a, b] of g.routes) {
        const k = a < b ? a + ',' + b : b + ',' + a;
        if (keys.has(k) || a === b) bad.push(`${seed}:重复航线`);
        keys.add(k);
        if (!g.links[a].includes(b) || !g.links[b].includes(a)) bad.push(`${seed}:邻接不对称`);
      }
      for (let i = 0; i < g.routes.length; i++) for (let j = i + 1; j < g.routes.length; j++) {
        const [a, b] = g.routes[i], [c, d] = g.routes[j];
        if (segmentsCross(g.stars[a], g.stars[b], g.stars[c], g.stars[d])) bad.push(`${seed}:航线交叉`);
      }
      // 连通
      const hops = hopTable(g.links);
      if (hops[0].some((h) => h === Infinity)) bad.push(`${seed}:不连通`);
      deg += g.links.reduce((a, l) => a + l.length, 0); n += g.stars.length; routes += g.routes.length;
      // 母星
      const homes = chooseHomes(g, T.maxFactions, seed);
      if (new Set(homes).size !== homes.length || homes.length !== T.maxFactions) bad.push(`${seed}:母星重复或不足`);
      if (homes.some((h) => g.links[h].length < 1)) bad.push(`${seed}:母星无航线`);
    }
    stats[type] = { avgDegree: (deg / n).toFixed(2), routes: (routes / 60).toFixed(1), dropped };
    ok(bad.length === 0, `${T.name}（${type}）${bad.length ? '：' + bad.slice(0, 5).join(' ') : ''}`);
  }
  console.log('  ', Object.entries(stats).map(([k, v]) => `${k} 航线${v.routes} 度${v.avgDegree}`).join(' · '));
  ok(+stats.desolate.routes < +stats.large.routes, '荒疏星系的航线少于大型');
}

// —————————————————————————————————————————————
section('建局');
{
  const G = newGame({ seed: 2024, factions: 6 });
  ok(G.stars.length === 32, `大型星系 ${G.stars.length} 颗星`);
  ok(G.factions.length === 6, '6 个势力');
  ok(G.factions[0].human && !G.factions[1].human, '默认势力 0 由玩家操控');
  for (const f of G.factions) {
    const s = G.stars[f.home];
    if (s.owner !== f.id || s.ships[f.id] !== RULES.homeShips || s.control[f.id] !== 100) ok(false, `${f.name}方母星设置有误`);
  }
  ok(G.factions.every((f) => f.stars === 1 && f.total === RULES.homeShips), '各方 1 星 10 船开局');
  ok(G.cap === 32 * RULES.capPerStar, `势力舰船上限 ${G.cap}`);
}

// —————————————————————————————————————————————
section('造船');
{
  // 0 —— 1 —— 2：势力 0 占 0，1 是中立
  const G = tiny([[0, 0], [5, 0], [10, 0]], [[0, 1], [1, 2]], [0]);
  runSeconds(G, 10);
  const n = G.stars[0].ships[0];
  ok(n >= 19 && n <= 21, `邻接中立星的母星 10 秒造 ${n - 10} 艘（约每秒 1 艘）`);
  ok(G.factions[0].total === n && G.factions[0].stats.created === n - 10, '势力总数与统计同步');
}
{
  // 内陆星：邻居全是自己的、又没打仗没外发 → 不造船（一条线的端点也算）
  const G = tiny([[0, 0], [5, 0], [10, 0]], [[0, 1], [1, 2]], [0]);
  for (const id of [0, 1, 2]) { G.stars[id].owner = 0; G.stars[id].control[0] = 100; }
  G.stars[1].ships[0] = 5; G.factions[0].total = 15;
  runSeconds(G, 10);
  ok(G.stars[1].ships[0] === 5 && G.stars[0].ships[0] === 10, `被己方包围的星都不造船（${G.stars[0].ships[0]}/${G.stars[1].ships[0]}/${G.stars[2].ships[0]}）`);
  submit(G, { type: 'order', f: 0, star: 1, target: 2 });
  runSeconds(G, 10);
  ok(G.factions[0].stats.created >= 7, `设了外发的星恢复造船（10 秒造 ${G.factions[0].stats.created}，上限 24 卡住）`);
}
{
  // 8 颗星的线（势力上限 64）：单星造到 50 就停
  const G = tiny([0, 1, 2, 3, 4, 5, 6, 7].map((i) => [i * 5, 0]), [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [6, 7]], [0]);
  runSeconds(G, 60);
  ok(G.stars[0].ships[0] === RULES.starCap, `单星造船上限 ${G.stars[0].ships[0]}`);
}
{
  // 控制度低时造得慢
  const G = tiny([[0, 0], [5, 0]], [[0, 1]], [0]);
  G.stars[0].control[0] = 20;
  G.stars[0].owner = 0;
  const before = G.stars[0].ships[0];
  runSeconds(G, 10);
  const made = G.stars[0].ships[0] - before;
  ok(made >= 3 && made <= 8, `控制度低时造船变慢（10 秒造 ${made} 艘，控制度在回升）`);
}
{
  // 势力总上限：2 颗星 × 8 = 16
  const G = tiny([[0, 0], [5, 0]], [[0, 1]], [0]);
  runSeconds(G, 30);
  ok(G.factions[0].total === 16 && G.cap === 16, `势力舰船上限 = 星数 × 8 = ${G.factions[0].total}`);
}

// —————————————————————————————————————————————
section('外发与航程');
{
  const G = tiny([[0, 0], [6, 0], [12, 0]], [[0, 1], [1, 2]], [0, 1], { humans: [0] }); // 势力 1 是 AI，节奏 1.2
  G.stars[0].ships[0] = 40; G.factions[0].total = 40;
  submit(G, { type: 'order', f: 0, star: 0, target: 1 });
  runSeconds(G, 1);
  const sent = G.transit.filter((t) => t.f === 0).reduce((a, t) => a + t.n, 0);
  ok(sent >= 3 && sent <= 5, `每秒外发约 4 艘（实测 ${sent}）`);
  const tr = G.transit.find((t) => t.f === 0);
  ok(Math.abs((tr.t1 - tr.t0) - 6) < 1e-9, `玩家舰船航程 = 距离 × 1（${(tr.t1 - tr.t0).toFixed(2)} 秒）`);
  ok(G.factions[1].pace === 1.2, 'AI 节奏 1.2（指挥官难度，AI 的船飞得慢些）');
  runSeconds(G, 7);
  ok(G.stars[1].ships[0] > 0 || G.stars[1].owner === 0 || factionsPresent(G.stars[1]) > 0, '舰船到港');
  ok(recount(G).every((v, i) => v === G.factions[i].total), '在途与驻留合计守恒');
}
{
  // 只有星主能下令；目标必须相邻；对面回送会被取消
  const G = tiny([[0, 0], [5, 0], [10, 0]], [[0, 1], [1, 2]], [0, 1]);
  submit(G, { type: 'order', f: 1, star: 0, target: 1 }); flushCommands(G);
  ok(G.stars[0].order === -1, '不能替别人的星下令');
  submit(G, { type: 'order', f: 0, star: 0, target: 2 }); flushCommands(G);
  ok(G.stars[0].order === -1, '不相邻的星不能直接派');
  G.stars[1].owner = 0; G.stars[1].control[0] = 100; G.stars[1].order = 0;
  submit(G, { type: 'order', f: 0, star: 0, target: 1 }); flushCommands(G);
  ok(G.stars[0].order === 1 && G.stars[1].order === -1, '对面正往回送时顺手取消它');
  submit(G, { type: 'order', f: 0, star: 0, target: -1 }); flushCommands(G);
  ok(G.stars[0].order === -1, '点自己的星 = 取消外发、原地防守');
  ok(G.log.length === 2, `指令日志只记成功执行的（${G.log.length} 条）`);
}

// —————————————————————————————————————————————
section('交战');
{
  // 中立星上两方对峙：每 0.5 秒各损 3–5，大战加倍；损失不超过 2 × 敌军
  const G = tiny([[0, 0], [6, 0]], [[0, 1]], [0, 1]);
  const s = G.stars[0];
  s.owner = -1; s.control = [0, 0];
  G.stars[1].owner = -1; G.stars[1].control = [0, 0];
  s.ships = [20, 20]; G.factions[0].total = 20; G.factions[1].total = 20;
  G.stars[1].ships = [0, 0];
  const per = [];
  G.events.length = 0;
  for (let i = 0; i < 200 && s.ships[0] > 0 && s.ships[1] > 0; i++) {
    step(G);
    for (const e of G.events) if (e.t === 'fight' && e.star === 0) per.push(e.losses);
    G.events.length = 0;
  }
  ok(per.length > 0 && per.every(([a, b]) => a >= 0 && a <= 5 && b >= 0 && b <= 5), `20 对 20：每次损失都在 0–5（共 ${per.length} 次）`);
  ok(per.slice(0, 2).every(([a, b]) => a >= 3 && b >= 3), '兵力充足时每次至少损失 3');
}
{
  const G = tiny([[0, 0], [6, 0]], [[0, 1]], [0, 1]);
  const s = G.stars[0];
  s.ships = [60, 3]; G.factions[0].total = 60; G.factions[1].total = 13;
  let first = null;
  for (let i = 0; i < 20 && !first; i++) { step(G); first = G.events.find((e) => e.t === 'fight' && e.star === 0); G.events.length = 0; }
  ok(first && first.losses[0] <= 3 * 2 * 2, `守方 60 对 3：守方损失受「2 × 敌军」上限约束（损 ${first && first.losses[0]}）`);
  ok(first && first.losses[1] === 3, '进攻的 3 艘全灭（大战倍率下损失翻倍）');
}
{
  // 原地防守加成：守方没有外发时每次只损 2–3
  const G = tiny([[0, 0], [6, 0]], [[0, 1]], [0, 1]);
  const s = G.stars[0];
  const lossesDef = [];
  for (let k = 0; k < 40; k++) {
    s.ships = [20, 20]; s.order = -1;
    G.tick = s.tFight - 1; step(G);
    const e = G.events.find((x) => x.t === 'fight' && x.star === 0);
    if (e) lossesDef.push(e.losses[0]);
    G.events.length = 0;
  }
  ok(lossesDef.length > 30 && lossesDef.every((v) => v >= 2 && v <= 3), `原地防守时守方每次损 2–3（${[...new Set(lossesDef)].sort().join('/')}）`);
}

// —————————————————————————————————————————————
section('控制度与易主');
{
  // 25 艘占中立星：增长封顶每秒 5，约 20 秒到 100
  const G = tiny([[0, 0], [6, 0]], [[0, 1]], [0]);
  const s = G.stars[1];
  s.ships[0] = 25; G.factions[0].total += 25;
  let t = 0;
  while (s.owner !== 0 && t < 60) { runSeconds(G, 0.5); t += 0.5; }
  ok(s.owner === 0 && t >= 18 && t <= 23, `25 艘拿下中立星用时 ${t} 秒（约 20）`);
}
{
  const G = tiny([[0, 0], [6, 0]], [[0, 1]], [0]);
  const s = G.stars[1];
  s.ships[0] = 5; G.factions[0].total += 5;
  runSeconds(G, 30);
  ok(s.owner === -1 && s.control[0] >= 26 && s.control[0] <= 34, `只有 5 艘时每秒 +1（30 秒后控制度 ${s.control[0]}）`);
}
{
  // 被围的星照样造船，冒出一艘就换掉进攻方 2 艘：一次冲上去的 30 艘拿不下控制度满的空城
  const G = tiny([[0, 0], [6, 0], [12, 0]], [[0, 1], [1, 2]], [0, 1]);
  const s = G.stars[1];
  s.owner = 1; s.control = [0, 100]; s.ships = [30, 0];
  G.factions[0].total += 30; G.factions[1].total = 0;
  runSeconds(G, 40);
  ok(s.owner === 1, `一波 30 艘耗在满控制度的空城下（剩 ${s.ships[0]} 艘，对方控制度 ${s.control[1]}）`);
}
{
  // 持续派兵：母星 50 艘沿航线不断送过去，满控制度的空城一分钟内拿下
  const G = tiny([[0, 0], [6, 0], [12, 0]], [[0, 1], [1, 2]], [0, 1]);
  const home = G.stars[0], s = G.stars[1];
  home.ships[0] = 50; G.factions[0].total = 50;
  s.owner = 1; s.control = [0, 100]; s.ships = [0, 0]; G.factions[1].total = 0;
  submit(G, { type: 'order', f: 0, star: 0, target: 1 });
  const seen = [];
  for (let i = 0; i < 60 * 20 && s.owner !== 0; i++) {
    step(G);
    for (const e of G.events) if (e.star === 1 && (e.t === 'capture' || e.t === 'neutral')) seen.push(e.t + '@' + G.time.toFixed(0) + 's');
    G.events.length = 0;
  }
  ok(s.owner === 0 && s.control[0] === 100, `持续派兵夺下空城（${seen.join(' → ')}）`);
  ok(seen.length >= 1 && seen.length <= 2, '经过「变中立 → 易主」或直接易主');
  ok(s.order === -1, '易主后外发清零');
  ok(G.factions[1].stats.starsLost === 1 && G.factions[0].stats.captured === 1, '失守与占领计入统计');
}
{
  // 对方控制度已被压到 30：30 艘几秒内使其变中立，再约 18 秒归我
  const G = tiny([[0, 0], [6, 0], [12, 0]], [[0, 1], [1, 2]], [0, 1]);
  const s = G.stars[1];
  s.owner = 1; s.control = [10, 30]; s.ships = [30, 0];
  G.factions[0].total += 30; G.factions[1].total = 0;
  let t = 0;
  while (s.owner !== 0 && t < 40) { runSeconds(G, 0.5); t += 0.5; }
  ok(s.owner === 0 && t <= 25, `控制度见底的敌星 ${t} 秒易手`);
}
{
  // 星主在场超过 10 艘但不占优：对方增长减半
  const G = tiny([[0, 0], [6, 0], [12, 0]], [[0, 1], [1, 2]], [0, 1]);
  const s = G.stars[1];
  s.owner = 1; s.control = [0, 100];
  // 关掉交战，只看控制度：让两方都不掉船
  const fightBackup = RULES.lossBase.slice(), defBackup = RULES.lossShielded.slice();
  RULES.lossBase[0] = 0; RULES.lossBase[1] = 1; RULES.lossShielded[0] = 0; RULES.lossShielded[1] = 1;
  s.ships = [50, 12];
  runSeconds(G, 10);
  const c1 = s.control[1];
  RULES.lossBase.splice(0, 2, ...fightBackup); RULES.lossShielded.splice(0, 2, ...defBackup);
  ok(c1 >= 70 && c1 <= 85, `星主守军 12 艘时被压得慢（10 秒后星主控制度 ${c1}，满速应只剩约 50）`);
}


// —————————————————————————————————————————————
section('M2 · 异常天体的分布');
{
  const bad = [];
  const full = Object.entries(ANOMALY_POOL);
  for (const type of Object.keys(GALAXY_TYPES)) {
    const T = GALAXY_TYPES[type];
    let total = 0;
    for (let seed = 1; seed <= 40; seed++) {
      const g = generateGalaxy(type, seed * 104729);
      const cnt = {};
      for (const st of g.stars) {
        if (st.anomaly && !(st.anomaly in ANOMALY_POOL)) bad.push(`${type}/${seed}:未知异常 ${st.anomaly}`);
        if (st.anomaly) cnt[st.anomaly] = (cnt[st.anomaly] || 0) + 1;
      }
      for (const [k, n] of full) if ((cnt[k] || 0) > n) bad.push(`${type}/${seed}:${k} 超额`);
      if (g.stars.length === 32 && full.some(([k, n]) => (cnt[k] || 0) !== n)) bad.push(`${type}/${seed}:32 星却没配齐`);
      const homes = chooseHomes(g, T.maxFactions, seed);
      if (homes.some((h) => g.stars[h].anomaly === 'nebula')) bad.push(`${type}/${seed}:母星在星云上`);
      total += Object.values(cnt).reduce((a, b) => a + b, 0);
    }
    if (type === 'small') ok(total / 40 > 3 && total / 40 < 6.5, `小型星系平均 ${(total / 40).toFixed(1)} 颗异常星（约 15/32 × 10）`);
  }
  ok(bad.length === 0, bad.length ? bad.slice(0, 4).join(' ') : '异常只有六种、不超配额；32 星的星系正好 10 颗；母星从不落在星云上');
  const G = newGame({ seed: 77, galaxy: 'large' });
  ok(G.stars.filter((x) => x.anomaly).length === 10 && G.stars.every((x) => 'anomaly' in x), '建局后每颗星都带 anomaly 字段');
}

section('M2 · 异常天体的规则');
{
  // 小行星带：每次造 2 艘
  const G = tiny([[0, 0, 'asteroid'], [5, 0]], [[0, 1]], [0]);
  G.cap = 999;
  runSeconds(G, 10);
  const made = G.stars[0].ships[0] - 10;
  ok(made >= 18 && made <= 22, `小行星带 10 秒造 ${made} 艘（每秒约 2）`);
}
{
  // 星云：造船慢一倍
  const G = tiny([[0, 0, 'nebula'], [5, 0]], [[0, 1]], [0]);
  G.cap = 999;
  runSeconds(G, 10);
  const made = G.stars[0].ships[0] - 10;
  ok(made >= 4 && made <= 6, `星云 10 秒造 ${made} 艘（每秒约 0.5）`);
}
{
  // 星云：控制度涨得快一倍，25 艘占中立星约 10 秒
  const G = tiny([[0, 0], [6, 0, 'nebula']], [[0, 1]], [0]);
  const st = G.stars[1];
  st.ships[0] = 25; G.factions[0].total += 25;
  let t = 0;
  while (st.owner !== 0 && t < 40) { runSeconds(G, 0.5); t += 0.5; }
  ok(st.owner === 0 && t >= 8 && t <= 12, `25 艘拿下中立星云用时 ${t} 秒（约 10，平常 20）`);
}
{
  // 等离子：造船上限 25；飞来的超额舰船 0.5 秒内被烧到 25
  const G = tiny([[0, 0, 'plasma'], [5, 0]], [[0, 1]], [0]);
  G.cap = 999;
  runSeconds(G, 40);
  ok(G.stars[0].ships[0] === 25, `等离子星只造到 ${G.stars[0].ships[0]} 艘`);
  const H = tiny([[0, 0], [6, 0, 'plasma']], [[0, 1]], [0]);
  H.stars[1].ships[0] = 40; H.factions[0].total += 40;
  let burnt = 0;
  for (let i = 0; i < 12; i++) { step(H); for (const e of H.events) if (e.t === 'burn') burnt += e.losses[0]; H.events.length = 0; }
  ok(H.stars[1].ships[0] === 25 && burnt === 15, `40 艘停在等离子星上，烧掉 ${burnt} 艘、剩 ${H.stars[1].ships[0]}`);
  ok(H.factions[0].stats.lost === 15 && recount(H)[0] === H.factions[0].total, '烧毁计入损失，总数守恒');
}
{
  // 彗星外发 ×2、漩涡 ÷2
  const rate = (anomaly) => {
    const G = tiny([[0, 0, anomaly], [6, 0]], [[0, 1]], [0]);
    G.stars[0].ships[0] = 50; G.factions[0].total = 50;
    submit(G, { type: 'order', f: 0, star: 0, target: 1 });
    runSeconds(G, 2);
    return G.transit.reduce((a, t) => a + t.n, 0) + G.stars[1].ships[0];
  };
  const base = rate(null), com = rate('comets'), vor = rate('vortex');
  ok(base >= 7 && base <= 9, `平常 2 秒外发 ${base} 艘`);
  ok(com >= 15 && com <= 17, `彗星 2 秒外发 ${com} 艘`);
  ok(vor >= 3 && vor <= 5, `漩涡 2 秒外发 ${vor} 艘`);
}
{
  // 气体云：各方都按防守档 2–3；守方再原地防守 1–2。等离子：3–5 → 4–7
  const lossesAt = (anomaly, ownerDefends) => {
    const out = [[], []];
    for (let k = 0; k < 40; k++) {
      const G = tiny([[0, 0, anomaly], [6, 0]], [[0, 1]], [0, 1], { seed: 100 + k });
      const st = G.stars[0];
      st.ships = [20, 20]; st.order = ownerDefends ? -1 : 1;
      G.tick = st.tFight - 1; step(G);
      const e = G.events.find((x) => x.t === 'fight' && x.star === 0);
      if (e) { out[0].push(e.losses[0]); out[1].push(e.losses[1]); }
    }
    return out.map((v) => [Math.min(...v), Math.max(...v)]);
  };
  const gasAtk = lossesAt('gas', false), gasDef = lossesAt('gas', true), pla = lossesAt('plasma', false);
  ok(gasAtk[0][0] >= 2 && gasAtk[0][1] <= 3 && gasAtk[1][0] >= 2 && gasAtk[1][1] <= 3, `气体云里双方各损 ${gasAtk[1].join('–')}`);
  ok(gasDef[0][0] >= 1 && gasDef[0][1] <= 2, `气体云里原地防守的星主只损 ${gasDef[0].join('–')}`);
  ok(pla[1][0] >= 4 && pla[1][1] <= 7, `等离子里进攻方每次损 ${pla[1].join('–')}`);
}

section('M2 · 难度');
{
  let paceOk = true;
  for (const [k, c] of Object.entries(CHALLENGES)) {
    const G = newGame({ seed: 5, challenge: k, factions: 3 });
    if (G.factions[1].pace !== c.aiPace || G.factions[0].pace !== 1) paceOk = false;
  }
  ok(paceOk, '五档难度的 AI 节奏：新兵 2、中尉 1.5、指挥官 1.2、上将与皇帝 1');
  const captureTime = (challenge) => {
    const G = tiny([[0, 0], [6, 0]], [[0, 1]], [0], { challenge });
    const st = G.stars[1];
    st.ships[0] = 25; G.factions[0].total += 25;
    let t = 0;
    while (st.owner !== 0 && t < 40) { runSeconds(G, 0.5); t += 0.5; }
    return t;
  };
  const tb = captureTime('beginner'), te = captureTime('easy'), tn = captureTime('normal');
  ok(tb >= 8 && tb <= 12, `新兵难度下玩家 25 艘占中立星 ${tb} 秒（快一倍）`);
  ok(te > tb && te < tn, `中尉难度 ${te} 秒，介于新兵与指挥官（${tn} 秒）之间`);
  const lossRange = (challenge, humanSide) => {
    const v = [];
    for (let k = 0; k < 40; k++) {
      const G = tiny([[0, 0], [6, 0], [12, 0]], [[0, 1], [1, 2]], [0, 2], { challenge, humans: [0], seed: 200 + k });
      const st = G.stars[1];
      st.ships = [20, 20];
      G.tick = st.tFight - 1; step(G);
      const e = G.events.find((x) => x.t === 'fight' && x.star === 1);
      if (e) v.push(e.losses[humanSide ? 0 : 1]);
    }
    return [Math.min(...v), Math.max(...v)];
  };
  const bh = lossRange('beginner', true), ba = lossRange('beginner', false), nh = lossRange('nightmare', true);
  ok(bh[0] >= 1 && bh[1] <= 2 && ba[0] >= 3, `新兵：玩家每次损 ${bh.join('–')}，AI 照旧 ${ba.join('–')}`);
  ok(nh[0] >= 3 && nh[1] === 6, `皇帝：玩家每次损 ${nh.join('–')}（3–5 ×1.25 截断）`);
}

section('M2 · 得分');
{
  const G = newGame({ seed: 9, factions: 3, challenge: 'hard' });
  ok(score(G, 0) === 0, '不足 2 分钟记 0 分');
  G.time = 600;
  const st = G.factions[0].stats;
  Object.assign(st, { captured: 12, starsLost: 2, created: 800, lost: 600, maxStars: 10, maxShips: 100 });
  for (const x of G.stars) x.owner = -1;
  for (let i = 0; i < 20; i++) G.stars[i].owner = i % 3;
  // 12×500 − 2×250 + 800×2 − 600 = 6500；保底 10 分钟 × 3333 × min(0.5, 10/20) = 16665 → 取 16665，上将 ×1.5
  ok(score(G, 0) === Math.round(16665 * 1.5), `保底生效且乘难度倍数：${score(G, 0)}`);
  Object.assign(st, { captured: 30, created: 3000, lost: 1000, maxShips: G.cap });
  const raw = Math.trunc(((30 * 500 - 2 * 250 + 3000 * 2 - 1000) * 125) / 100);
  ok(score(G, 0) === Math.round(raw * 1.5), `舰船曾满编 ×1.25：${score(G, 0)}`);
  Object.assign(G.factions[1].stats, st);
  ok(score(G, 1) === raw, 'AI 不乘难度倍数');
}

section('M2 · 足迹（迷雾的数据）');
{
  const G = newGame({ seed: 12, factions: 4 });
  const home = G.stars[G.factions[0].home];
  ok(home.visited[0] && !home.visited[1], '开局只到过自己的母星');
  ok(G.stars.filter((x) => x.visited[0]).length === 1, '玩家只知道一颗星');
  const nb = home.links[0];
  submit(G, { type: 'order', f: 0, star: home.id, target: nb });
  runSeconds(G, 12);
  ok(G.stars[nb].visited[0] && G.time - G.stars[nb].presence[0] < 0.5, '舰船到过的邻星记入足迹，在场时刻刷新');
  ok(G.stars.every((x) => x.visited.every((v, f) => !v || x.presence[f] > -1e8)), '到过的星都有在场时刻');
}


// —————————————————————————————————————————————
section('M3 · 卡组与冷却');
{
  ok(cleanDeck(['patriotism', 'propaganda', 'defense', 'recruits', 'fleet']).join() === 'patriotism,propaganda,defense,recruits', '超出 12 点的卡被丢掉');
  ok(cleanDeck(['nope', 'spy', 'spy']).join() === 'spy', '未知卡与重复卡被丢掉');
  const G = newGame({ seed: 3, factions: 4, deck: ['explosion', 'purge'], challenge: 'nightmare' });
  const me = G.factions[0];
  ok(me.deck.join() === 'explosion,purge' && me.ready.explosion === 20 && me.ready.purge === 25, '玩家卡组按大厅设置，开局即在冷却');
  ok(G.factions.slice(1).every((f) => f.personality && f.deck.length >= 3), '皇帝难度：每个 AI 都有性格和卡组');
  const N = newGame({ seed: 3, factions: 4, challenge: 'normal' });
  ok(N.factions.slice(1).every((f) => !f.personality && f.deck.length === 0), '指挥官难度：AI 没有性格、不带卡');
  ok(newGame({ seed: 3 }).factions[0].deck.join() === DEFAULT_DECK.join(), '不指定卡组时用默认卡组');
}

// 三颗星一条线：0 —— 1 —— 2，势力 0 占 0，势力 1 占 2
const line3 = (o = {}) => {
  const G = tiny([[0, 0], [6, 0], [12, 0]], [[0, 1], [1, 2]], [0, 2], o);
  for (const f of [0, 1]) { G.factions[f].deck = Object.keys(ABILITIES); for (const c of G.factions[f].deck) G.factions[f].ready[c] = 0; }
  return G;
};
const cmd = (G, f, card, src, dst = src) => applyCommand(G, { type: 'ability', f, card, src, dst });
const own = (G, id, f, ships) => { const s = G.stars[id]; s.owner = f; s.control.fill(0); s.control[f] = 100; if (ships !== undefined) s.ships[f] = ships; };
const fightOnce = (G, id) => {
  const s = G.stars[id];
  G.tick = s.tFight - 1;
  step(G);
  const e = G.events.find((x) => x.t === 'fight' && x.star === id);
  G.events.length = 0;
  return e ? e.losses : null;
};

section('M3 · 校验与冷却');
{
  const G = line3();
  G.factions[0].deck = ['spy'];
  ok(!cmd(G, 0, 'explosion', 1), '卡组里没有的卡不能用');
  ok(!cmd(G, 0, 'spy', 0), '间谍网不能对自己的星');
  ok(!cmd(G, 0, 'spy', 2), '够不着的敌星不能用（不相邻、也没到过）');
  G.stars[2].ships[0] = 3;
  ok(cmd(G, 0, 'spy', 2), '有船在场的敌星可以');
  ok(G.factions[0].ready.spy === G.time + 30 + 60, '冷却 = 持续 30 + 冷却 60');
  ok(!cmd(G, 0, 'spy', 2), '冷却中不能再用');
  ok(G.log.filter((c) => c.type === 'ability').length === 1, '只有成功的指令进日志');
  const H = line3();
  ok(!cmd(H, 0, 'explosion', 1), '偷袭须有敌舰在场');
  ok(!cmd(H, 0, 'teleport', 1, 2), '突击队须从自己的星出发');
  ok(!cmd(H, 0, 'stabilize', 0, 2), '拓宽须选相连的两颗星');
  ok(cmd(H, 0, 'stabilize', 0, 1), '拓宽相连的星路可以');
}

section('M3 · 爱国与宣传');
{
  const G = line3();
  own(G, 1, 0, 5);
  G.stars[1].ships[1] = 30;
  ok(cmd(G, 0, 'patriotism', 1), '对自己的星开爱国');
  runSeconds(G, 5);
  ok(G.stars[1].control[1] === 0 && G.stars[1].owner === 0, `爱国期间敌人涨不了控制度（敌方 ${G.stars[1].control[1]}）`);
  ok(cmd(G, 1, 'propaganda', 1), '对方用宣传抵消');
  runSeconds(G, 3);
  ok(G.stars[1].control[1] > 0, `宣传抵消爱国后敌人开始涨控制度（${G.stars[1].control[1]}）`);
}
{
  // 宣传：星主占优时回升减半、且没有 +1 自然回复
  const regen = (withPro) => {
    const G = line3();
    own(G, 1, 0, 20);
    G.stars[1].control[0] = 50;
    if (withPro) { G.stars[1].ships[1] = 0; G.stars[2].ships[1] = 1; cmd(G, 1, 'propaganda', 1); }
    const c0 = G.stars[1].control[0];
    runSeconds(G, 5);
    return G.stars[1].control[0] - c0;
  };
  const a = regen(false), b = regen(true);
  ok(a >= 20 && b < a / 2, `星主回升：平常 5 秒 +${a}，被宣传时 +${b}`);
}

section('M3 · 暗幕与间谍网');
{
  const G = line3();
  G.stars[2].visited[0] = true;
  ok(cmd(G, 1, 'stealth', 2), '开暗幕');
  ok(!G.stars[2].visited[0], '敌人忘掉暗幕方的领地');
  G.stars[2].ships = [20, 20];
  G.stars[2].order = -1;
  const l = fightOnce(G, 2);
  ok(l && l[1] >= 1 && l[1] <= 2, `暗幕 + 原地防守：守军每次只损 ${l && l[1]}`);
}
{
  const G = line3();
  G.stars[2].ships = [5, 20];
  ok(cmd(G, 0, 'spy', 2), '对敌星开间谍网');
  ok(G.stars[2].visited[0], '看清目标星主人的领土');
  const v = [];
  for (let k = 0; k < 20; k++) { G.stars[2].ships = [20, 20]; G.stars[2].order = -1; const l = fightOnce(G, 2); if (l) v.push(l[1]); }
  ok(v.length && Math.min(...v) >= 3 && Math.max(...v) <= 4, `被间谍网盯上的守军每次损 ${Math.min(...v)}–${Math.max(...v)}（原地防守 2–3，+1）`);
  ok(cmd(G, 1, 'stealth', 2), '对方开暗幕');
  const w = [];
  for (let k = 0; k < 20; k++) { G.stars[2].ships = [20, 20]; G.stars[2].order = -1; const l = fightOnce(G, 2); if (l) w.push(l[1]); }
  ok(w.length && Math.min(...w) >= 2 && Math.max(...w) <= 3, `暗幕与间谍网互相抵消，回到原地防守 ${Math.min(...w)}–${Math.max(...w)}`);
}

section('M3 · 拓宽与干扰');
{
  const rate = (setup) => {
    const G = line3();
    G.stars[0].ships[0] = 50; G.factions[0].total = 50;
    G.stars[0].order = 1;
    setup(G);
    runSeconds(G, 2);
    return G.transit.filter((t) => t.f === 0).reduce((a, t) => a + t.n, 0) + G.stars[1].ships[0];
  };
  const base = rate(() => {});
  const wide = rate((G) => cmd(G, 0, 'stabilize', 0, 1));
  const choke = rate((G) => { G.stars[1].ships[1] = 1; cmd(G, 1, 'degrade', 1, 0); });
  const both = rate((G) => { cmd(G, 0, 'stabilize', 0, 1); G.stars[1].ships[1] = 1; cmd(G, 1, 'degrade', 1, 0); });
  ok(wide >= 15 && wide <= 17, `拓宽后 2 秒外发 ${wide} 艘（平常 ${base}）`);
  ok(choke >= 1 && choke <= 3, `干扰后 2 秒外发 ${choke} 艘`);
  ok(both >= 7 && both <= 9, `拓宽与干扰同时作用于一条星路：互相抵消（${both} 艘）`);
  const G = line3();
  cmd(G, 0, 'stabilize', 0, 1);
  ok(G.routes.find((r) => r.a === 0 && r.b === 1).w === 1, '拓宽期间星路变宽');
  runSeconds(G, 31);
  ok(G.routes.find((r) => r.a === 0 && r.b === 1).w === 0 && G.effects.length === 0, '30 秒后效果结束、星路恢复');
}

section('M3 · 防御与破坏');
{
  const G = line3();
  own(G, 1, 0);
  const v0 = [], v1 = [];
  for (let k = 0; k < 20; k++) {
    G.stars[1].ships = [20, 20]; G.stars[1].order = -1;
    if (!G.effects.length) { G.factions[0].ready.defense = 0; cmd(G, 0, 'defense', 1); }
    const l = fightOnce(G, 1);
    if (l) { v0.push(l[0]); v1.push(l[1]); }
  }
  ok(Math.max(...v0) <= 1 && Math.min(...v1) >= 6 && Math.max(...v1) <= 11, `防御：守军每次损 ${Math.min(...v0)}–${Math.max(...v0)}，敌军 ${Math.min(...v1)}–${Math.max(...v1)}`);
  G.stars[1].ships = [4, 20];
  const l = fightOnce(G, 1);
  ok(l && l[0] === 0, '防御方不足 6 艘时不损失');
}
{
  const G = line3();
  own(G, 1, 0);
  G.stars[1].ships = [20, 20];
  ok(cmd(G, 1, 'offense', 1), '对相邻的敌星用破坏');
  const v0 = [], v1 = [];
  for (let k = 0; k < 15; k++) { G.stars[1].ships = [20, 20]; G.stars[1].order = -1; const l = fightOnce(G, 1); if (l) { v0.push(l[0]); v1.push(l[1]); } }
  ok(Math.min(...v0) >= 4 && Math.max(...v1) <= 2, `破坏：守军每次损 ${Math.min(...v0)}–${Math.max(...v0)}，破坏方 ${Math.min(...v1)}–${Math.max(...v1)}`);
  G.factions[0].ready.defense = 0;
  ok(cmd(G, 0, 'defense', 1), '守方开防御');
  const w = [];
  for (let k = 0; k < 10; k++) { G.stars[1].ships = [20, 20]; G.stars[1].order = -1; const l = fightOnce(G, 1); if (l) w.push(l[0]); }
  ok(Math.min(...w) >= 2 && Math.max(...w) <= 3, `防御与破坏互相抵消，回到原地防守 ${Math.min(...w)}–${Math.max(...w)}`);
}

section('M3 · 征兵、偷袭、策反');
{
  const G = line3();
  const t0 = G.factions[0].total;
  cmd(G, 0, 'recruits', 0);
  const got = G.stars[0].ships[0] - 10;
  ok(got >= 30 && got <= 39 && G.factions[0].total === t0 + got && G.factions[0].stats.created === got, `自己的星征兵 ${got} 艘，计入总数与统计`);
  G.factions[0].ready.recruits = 0;
  cmd(G, 0, 'recruits', 1);
  ok(G.stars[1].ships[0] >= 5 && G.stars[1].ships[0] <= 9, `相邻中立星征兵 ${G.stars[1].ships[0]} 艘`);
  G.factions[0].ready.recruits = 0;
  const before = G.stars[1].ships[0];
  cmd(G, 0, 'recruits', 1);
  ok(G.stars[1].ships[0] - before >= 20 && G.stars[1].ships[0] - before <= 29, '已有自己舰船的星征兵 20–29 艘');
  const H = line3();
  H.stars[0].ships[0] = 50; H.factions[0].total = 50;
  H.factions[0].ready.recruits = 0;
  cmd(H, 0, 'recruits', 0);
  ok(H.stars[0].ships[0] > 50, `征兵不受单星 50 艘上限限制（${H.stars[0].ships[0]}）`);
}
{
  const G = line3();
  G.stars[1].ships = [10, 40]; G.factions[1].total += 40;
  ok(cmd(G, 0, 'explosion', 1), '对有敌舰的交战星用偷袭');
  const lost = 40 - G.stars[1].ships[1];
  ok(lost >= 30 && lost <= 35 && G.stars[1].ships[0] === 10, `偷袭炸掉敌舰 ${lost} 艘（75–89%），自己不受损`);
}
{
  const G = line3();
  own(G, 1, 0, 5);
  G.factions[0].total += 5;
  G.stars[1].ships[1] = 60; G.factions[1].total += 60;
  ok(cmd(G, 0, 'fleet', 1), '对自己的星上的敌军用策反');
  ok(G.stars[1].ships[0] === 55 && G.stars[1].ships[1] === 10, `自己的星上策反 50 艘（剩 ${G.stars[1].ships[1]}）`);
  ok(recount(G).every((v, f) => v === G.factions[f].total), '策反后舰船总数守恒');
  const H = line3();
  H.stars[1].ships = [5, 60];
  cmd(H, 0, 'fleet', 1);
  ok(H.stars[1].ships[0] === 30, '在别处只能策反 25 艘');
}

section('M3 · 贿赂与无政府');
{
  const G = line3();
  G.stars[1].ships[0] = 3;
  ok(cmd(G, 0, 'bribe', 1), '贿赂有自己舰船的中立星');
  ok(G.stars[1].owner === 0, '无人争夺的中立星：控制度 +100，当场归你');
  const H = line3();
  H.stars[1].ships[0] = 3; H.stars[1].control[1] = 30;
  cmd(H, 0, 'bribe', 1);
  ok(H.stars[1].control[0] === 65, '有人争夺的中立星：+65');
  const P = line3();
  own(P, 1, 1, 10); P.stars[1].ships[0] = 3;
  cmd(P, 1, 'patriotism', 2);
  cmd(P, 0, 'bribe', 1);
  ok(P.stars[1].control[0] === 20, `星主开着爱国（哪怕在别的星上）：只有 +${P.stars[1].control[0]}（30 − 守军 10）`);
}
{
  const G = line3();
  own(G, 1, 1, 8);
  G.stars[1].ships[0] = 2;
  ok(cmd(G, 0, 'anarchy', 1), '对到过的敌星用无政府');
  ok(G.stars[1].owner === -1 && G.stars[1].control[1] === 50, '星变中立，原星主控制度减半');
  const ev = G.events.find((e) => e.t === 'ability' && e.card === 'anarchy');
  ok(ev && ev.owner === 1, '能力事件记下发动前的星主（播报据此标红「冲你来的」）');
  const H = line3();
  own(H, 1, 1, 8); H.stars[1].ships[0] = 2;
  cmd(H, 1, 'patriotism', 2);
  cmd(H, 0, 'anarchy', 1);
  ok(H.stars[1].owner === 1 && H.stars[1].control[0] === 20, '星主开着爱国时，无政府只换来 +20 控制度');
}

section('M3 · 突击队、清洗');
{
  const G = line3();
  G.stars[0].ships[0] = 40; G.factions[0].total = 40;
  ok(cmd(G, 0, 'teleport', 0, 2), '从自己的星派突击队去任意一颗星');
  const tr = G.transit.find((t) => t.tp);
  ok(tr && tr.n === 25 && G.stars[0].ships[0] === 15, '最多抽 25 艘');
  ok(Math.abs((tr.t1 - tr.t0) - 1.2) < 1e-9, `十倍速直飞（12 单位 ${(tr.t1 - tr.t0).toFixed(2)} 秒）`);
  ok(Math.abs(G.factions[0].ready.teleport - (G.time + 1.2 + 25)) < 1e-9, '飞行结束后才开始冷却');
  runSeconds(G, 1.5);
  ok(G.stars[2].ships[0] > 0 || G.stars[2].owner !== 1 || G.factions[0].stats.lost > 0, '突击队到港');
}
{
  const G = line3();
  own(G, 1, 0, 5);
  G.stars[0].ships[1] = 7; G.stars[1].ships[1] = 9; G.factions[1].total += 16;
  ok(cmd(G, 0, 'purge', 0), '开清洗');
  ok(G.stars[0].ships[1] === 0 && G.stars[1].ships[1] === 0 && G.factions[1].stats.lost === 16, '你所有星上的敌舰全灭，计入损失');
}

section('M3 · 开辟与断航');
{
  const G = buildGame(tinyGalaxy([[0, 0], [6, 0], [3, 5]], [[0, 1], [1, 2]]), [0, 1], { seed: 7, humans: [0, 1], timeLimit: 0, sandbox: true });
  G.factions[0].deck = Object.keys(ABILITIES); for (const c of G.factions[0].deck) G.factions[0].ready[c] = 0;
  ok(cmd(G, 0, 'add', 0, 2), '在两颗星之间开辟新星路');
  ok(G.stars[0].links.includes(2) && G.stars[2].links.includes(0) && G.routes.length === 3, '星路与邻接表同时更新');
  const L = line3();
  ok(!cmd(L, 0, 'add', 0, 2), '与已有星路夹角太小（或交叉）的不能开');
  L.stars[0].ships[0] = 30; L.factions[0].total = 30;
  L.stars[0].order = 1;
  runSeconds(L, 0.5);
  const inFlight = L.transit.length;
  ok(cmd(L, 0, 'remove', 0, 1), '断航');
  ok(!L.stars[0].links.includes(1) && L.stars[0].order === -1, '星路切断，沿它的外发清零');
  ok(L.transit.length === inFlight, '已经在路上的舰船照常飞');
}

section('M3 · 带能力的确定性与 AI');
{
  const play = () => {
    const G = newGame({ seed: 4242, factions: 4, challenge: 'nightmare', deck: ['recruits', 'explosion', 'bribe'] });
    for (let i = 0; i < 20 * 180; i++) {
      if (i % 40 === 0) {
        const home = G.factions[0].home;
        if (G.stars[home].owner === 0) submit(G, { type: 'ability', f: 0, card: 'recruits', src: home, dst: home });
        const tgt = G.stars.find((s) => s.ships[0] > 0 && s.ships.some((n, g) => g !== 0 && n > 0));
        if (tgt) submit(G, { type: 'ability', f: 0, card: 'explosion', src: tgt.id, dst: tgt.id });
      }
      step(G);
      G.events.length = 0;
    }
    return G;
  };
  const a = play(), b = play();
  const snap = (G) => JSON.stringify({ s: G.stars.map((s) => [s.owner, s.order, s.ships, s.control]), t: G.transit, e: G.effects, r: G.rng, rt: G.routes });
  ok(snap(a) === snap(b), '同种子同指令（含能力）→ 3 分钟后局面一致');
  ok(a.log.some((c) => c.type === 'ability'), `玩家脚本放出了 ${a.log.filter((c) => c.type === 'ability').length} 次能力`);
  const R = newGame({ seed: 4242, factions: 4, challenge: 'nightmare', deck: ['recruits', 'explosion', 'bribe'] });
  let li = 0;
  for (let i = 0; i < 20 * 180; i++) {
    while (li < a.log.length && a.log[li].tick === R.tick) { const { tick, ...c } = a.log[li++]; submit(R, c); }
    step(R);
    R.events.length = 0;
  }
  ok(snap(R) === snap(a), '按日志重放得到同一局面');
}
{
  let uses = 0, kinds = new Set();
  for (const seed of [1, 2, 3, 4]) {
    const G = newGame({ seed: seed * 313, factions: 6, humans: [], challenge: 'hard' });
    for (let i = 0; i < 20 * 600 && !G.over; i++) {
      step(G);
      for (const e of G.events) if (e.t === 'ability') { uses++; kinds.add(e.card); }
      G.events.length = 0;
    }
  }
  ok(uses > 40 && kinds.size >= 8, `上将难度 4 局 × 10 分钟：AI 放了 ${uses} 次能力、${kinds.size} 种`);
}

// —————————————————————————————————————————————
section('M4 · 档案与成长');
{
  ok(levelOf(0) === 1 && levelOf(49999) === 1 && levelOf(50000) === 2 && levelOf(1e9) === 70 && MAX_EXP === 3450000,
    '每 50,000 经验升一级，满级 70（345 万经验）');
  ok(Math.abs(levelProgress(75000) - 0.5) < 1e-9 && levelProgress(MAX_EXP) === 1, '本级进度；满级恒为 1');
  ok(titleOf(1) === TITLES[0] && titleOf(5) === TITLES[0] && titleOf(6) === TITLES[1] && titleOf(70) === TITLES[13] && TITLES.length === 14,
    '每 5 级一个头衔，共 14 个');
  ok([1, 3, 4, 6, 7, 30, 31, 70].map(pointsAtLevel).join() === '2,2,3,3,4,11,12,12', '能力点 = 2 + ⌊(等级 − 1) / 3⌋，31 级满 12');
  const P = (lv, ranked = true) => ({ ...newProfile(), exp: (lv - 1) * GROWTH.expPerLevel, ranked });
  ok(cardAllowed('patriotism', P(1)) && !cardAllowed('stealth', P(6)) && cardAllowed('stealth', P(7)),
    '成长模式：卡要比能力点便宜才能选（3 点卡 7 级解锁），2 点卡随时可选');
  ok(['patriotism', 'stealth', 'defense', 'bribe', 'fleet'].map(unlockLevel).join() === '1,7,10,13,16', '各档卡的解锁等级：1 / 7 / 10 / 13 / 16');
  ok(Object.keys(ABILITIES).every((c) => cardAllowed(c, P(unlockLevel(c))) && (unlockLevel(c) === 1 || !cardAllowed(c, P(unlockLevel(c) - 1)))),
    '解锁等级与选卡规则一致（17 张逐一核对）');
  ok(abilityPoints(P(1, false)) === 12 && cardAllowed('purge', P(1, false)) && !cardAllowed('fleet', P(1, false)),
    '自由模式：直接 12 点，但 6 点的卡不能选');
  ok(Math.abs(xpMultiplier(1) - 10) < 1e-9 && Math.abs(xpMultiplier(11) - 6.625) < 1e-9 && xpMultiplier(21) === 1 && xpMultiplier(60) === 1,
    '前期加成：1 级 ×10，11 级 ×6.625，21 级起 ×1');

  const game = (o) => ({ score: 1000, time: 300, winner: true, finished: true, challenge: 'normal', maxStars: 5, ...o });
  const p1 = P(1);
  const w = settleGame(p1, game({ challenge: 'hard', maxStars: 9 }));
  ok(w.counted && w.xp === 10000 && w.profile.won === 1 && w.profile.lost === 0 && w.profile.games === 1 && w.profile.stars.hard === 9,
    '胜局：经验 = 得分 × 前期加成，记一胜，最多星数记到对应难度');
  ok(p1.exp === 0 && p1.games === 0, '结算不改传入的档案');
  const l = settleGame(P(1), game({ winner: false, finished: false }));
  ok(l.counted && l.xp === 10000 && l.lost && l.profile.lost === 1, '中途离开、不领先：按认输记一负，经验照给');
  const lead = settleGame(P(1), game({ finished: false }));
  ok(lead.profile.won === 0 && lead.profile.lost === 0 && lead.xp === 10000, '中途离开但领先：不记胜负');
  const short = settleGame(P(1), game({ time: GROWTH.minGameSec }));
  ok(!short.counted && short.reason === 'short' && short.profile.exp === 0, `不足 ${GROWTH.minGameSec} 秒（含）不结算`);
  const free = settleGame(P(1, false), game());
  ok(!free.counted && free.reason === 'free', '自由模式不结算');
  const zero = settleGame(P(1), game({ score: 0, winner: false }));
  ok(zero.counted && zero.xp === 0 && zero.profile.lost === 0 && zero.profile.games === 1, '没有得分：只记局数，不记胜负');
  const up = settleGame(P(1), game({ score: 12000 }));
  ok(up.before.level === 1 && up.after.level === 3 && up.after.points === 2 && up.xp === 120000, '一局跨两级（1 级 ×10 加成）');
  const vet = settleGame(P(30), game({ score: 5000 }));
  ok(vet.xp === 5000 && vet.mult === 1, '21 级起没有加成');
  const top = settleGame({ ...newProfile(), exp: MAX_EXP - 10 }, game({ score: 9000 }));
  ok(top.profile.exp === MAX_EXP && top.after.level === 70, '经验封顶 345 万');
  const junk = normalizeProfile({ exp: -5, name: 42, stars: null, won: 'x', tutorial: 'maybe', ranked: false, games: 3.7 });
  ok(junk.exp === 0 && junk.name === '' && junk.stars.hard === 0 && junk.won === 0 && junk.tutorial === '' && !junk.ranked && junk.games === 3,
    '读档时纠正坏值、补齐缺的字段');
  ok(normalizeProfile(null).ranked && normalizeProfile(undefined).exp === 0, '没有存档：新档案（成长模式）');
  ok(cleanDeck(['defense', 'stealth', 'patriotism'], 4, (c) => cardAllowed(c, P(7))).join() === 'stealth',
    '卡组按能力点与解锁规则整理（防御未解锁、爱国放不下）');
  ok(cleanDeck(DEFAULT_DECK, abilityPoints(P(1)), (c) => cardAllowed(c, P(1))).join() === 'patriotism', '新档案 2 点：默认卡组只剩爱国');
}

section('M4 · 同屏多人');
{
  const G = newGame({ seed: 5, galaxy: 'medium', factions: 4, humans: [0, 1, 2], challenge: 'normal' });
  ok(G.factions.map((f) => f.human).join() === 'true,true,true,false', '三位玩家 + 一个 AI');
  const [a, b, c] = [0, 1, 2].map((f) => G.factions[f].home);
  submit(G, { type: 'order', f: 0, star: a, target: G.stars[a].links[0] });
  submit(G, { type: 'order', f: 1, star: b, target: G.stars[b].links[0] });
  submit(G, { type: 'order', f: 0, star: b, target: G.stars[b].links[1] ?? G.stars[b].links[0] });
  flushCommands(G);
  ok(G.stars[a].order === G.stars[a].links[0] && G.stars[b].order === G.stars[b].links[0] && G.log.length === 2,
    '两位玩家的指令各自生效；替别人的星下令无效');
  runSeconds(G, 60);
  ok(G.stars[c].order === -1 && G.factions[2].stars === 1, '没下令的玩家不会被 AI 代管');
  ok(G.factions[3].stars > 1, 'AI 照常扩张');
}

section('M4 · 新手教程（脚本代玩，提示框用替身）');
{
  globalThis.innerWidth = 1280; globalThis.innerHeight = 800;
  const el = () => ({ hidden: true, innerHTML: '', textContent: '', style: {}, dataset: {}, onclick: null, offsetWidth: 300, offsetHeight: 120,
    getBoundingClientRect: () => ({ left: 1190, top: 60, right: 1270, bottom: 104 }) });
  const parts = { '.tu-text': el(), '.tu-step': el(), '.tu-ok': el(), '.tu-skip': el() };
  const bubble = { ...el(), querySelector: (q) => parts[q] };
  const G = newGame({ seed: TUTORIAL.seed, galaxy: TUTORIAL.galaxy, factions: TUTORIAL.ai + 1, humans: [0],
    challenge: TUTORIAL.challenge, timeLimit: TUTORIAL.time * 60, fog: true, deck: TUTORIAL.deck });
  const R = { starScreen: (id) => ({ x: 640 + G.stars[id].x * 25, y: 400 + G.stars[id].y * 25, r: 6 }) };
  const ui = { guide: null };
  let doneCalls = 0;
  const T = createTutorial({ G, me: 0, ui, R, bubble, cardBar: el(), onDone: () => doneCalls++ });
  const home = G.factions[0].home;
  ok(G.stars[home].links.length >= 2 && G.stars[T.dragTarget].owner < 0 && !G.stars[home].anomaly && !G.stars[T.dragTarget].anomaly,
    `教程星图 ${TUTORIAL.seed} 号：母星 ${G.stars[home].links.length} 条星路，示范目标是中立星，两颗都不是异常天体`);
  const shown = [];
  const guides = {};
  for (let sec = 0; sec < 420 && !T.finished; sec++) {
    // 代玩：看到拖拽提示后才开始派兵；每颗攒够 8 艘、闲着的星往不是自己的邻星送；卡好了、提示出来就用
    if (shown.includes('drag')) {
      for (const s of G.stars) {
        if (s.owner !== 0 || s.order >= 0 || s.ships[0] < 8) continue;
        const t = s.links.find((n) => G.stars[n].owner !== 0);
        if (t !== undefined) submit(G, { type: 'order', f: 0, star: s.id, target: t });
      }
    }
    if (T.step === 'card' && cardReady(G, 0, 'recruits') && G.stars[home].owner === 0) submit(G, { type: 'ability', f: 0, card: 'recruits', src: home, dst: home });
    runSeconds(G, 1);
    G.events.length = 0;
    T.update();
    if (T.step && shown[shown.length - 1] !== T.step) { shown.push(T.step); guides[T.step] = ui.guide; }
  }
  ok(shown.slice(0, 4).join() === 'home,drag,capture,grow', `头四步按顺序出现（${shown.join(' → ')}）`);
  ok(guides.drag && guides.drag.from === home && guides.drag.to === T.dragTarget, '拖拽一步配手势动画：母星 → 示范目标');
  ok(shown.includes('card') && G.log.some((c) => c.type === 'ability'), '能力卡好了会提示，用过就收起');
  ok(shown[shown.length - 1] === 'final' && T.finished && doneCalls === 1, `放完收尾一步、记为做完（${Math.round(G.time)} 秒）`);
  ok(bubble.hidden && ui.guide === null, '结束后提示框与手势都收起');
}

section('确定性与重放');
{
  const play = () => {
    const G = newGame({ seed: 31337, factions: 4 });
    const orders = [];
    for (let i = 0; i < 20 * 120; i++) {
      // 玩家脚本：每 5 秒把所有自己的星派往第一颗非己方邻星
      if (i % 100 === 0) {
        for (const s of G.stars) {
          if (s.owner !== 0) continue;
          const t = s.links.find((l) => G.stars[l].owner !== 0);
          submit(G, { type: 'order', f: 0, star: s.id, target: t ?? -1 });
        }
      }
      step(G);
      G.events.length = 0;
    }
    return G;
  };
  const a = play(), b = play();
  const snap = (G) => JSON.stringify({ s: G.stars.map((s) => [s.owner, s.order, s.ships, s.control]), t: G.transit, r: G.rng });
  ok(snap(a) === snap(b), '同种子同指令 → 2 分钟后局面逐字节一致');
  // 只凭种子 + 指令日志重放
  const R = newGame({ seed: 31337, factions: 4 });
  let li = 0;
  for (let i = 0; i < 20 * 120; i++) {
    while (li < a.log.length && a.log[li].tick === R.tick) { const { tick, ...c } = a.log[li++]; submit(R, c); }
    step(R);
    R.events.length = 0;
  }
  ok(snap(R) === snap(a), `按日志重放（${a.log.length} 条指令）得到同一局面`);
}

// —————————————————————————————————————————————
section('全 AI 对局：不变量与收尾');
{
  let worst = '', t0 = Date.now(), ended = 0, games = 0;
  const types = Object.keys(GALAXY_TYPES), chs = Object.keys(CHALLENGES);
  for (const seed of [1, 2, 3, 4, 5, 6]) for (const nf of [2, 4, 6]) {
    const galaxy = types[(seed + nf) % types.length], challenge = chs[(seed * 3 + nf) % chs.length];
    const G = newGame({ seed: seed * 101, factions: nf, humans: [], galaxy, challenge });
    games++;
    for (let i = 0; i < 20 * 60 * 16 && !G.over; i++) {
      step(G);
      G.events.length = 0;
      if (i % 200 === 0) {
        const rc = recount(G);
        if (!rc.every((v, f) => v === G.factions[f].total)) worst ||= `seed${seed}/${nf}方 舰船总数对不上`;
        for (const s of G.stars) {
          if (s.ships.some((v) => v < 0 || !Number.isInteger(v))) worst ||= `seed${seed} 舰船出现负数或小数`;
          if (s.control.some((v) => v < 0 || v > 100)) worst ||= `seed${seed} 控制度越界`;
          if (s.owner >= 0 && s.control[s.owner] < RULES.loseBelow) worst ||= `seed${seed} 星主控制度低于 20 却没失守`;
          if (s.order >= 0 && !s.links.includes(s.order)) worst ||= `seed${seed} 外发目标不相邻`;
        }
        for (const tr of G.transit) if (!tr.tp && !G.stars[tr.from].links.includes(tr.to)) worst ||= `seed${seed} 在途舰船走了不存在的航线（突击队除外）`;
      }
      if (i === 20 * 180) {
        const grown = G.factions.filter((f) => f.alive && f.stars >= 3).length;
        if (grown < Math.min(G.factions.length, 2)) worst ||= `seed${seed}/${galaxy}/${nf}方 3 分钟后 AI 没有扩张`;
      }
    }
    if (G.over) ended++;
    if (G.over && G.endReason === 'time' && G.winner !== leader(G)) worst ||= `seed${seed} 时间到却没判星最多者胜`;
  }
  ok(!worst, worst || `${games} 局（六种星系、五档难度轮换）不变量全部成立`);
  ok(ended === games, `每局都能收尾（时限 15 分钟），${ended}/${games}`);
  const ms = Date.now() - t0;
  ok(ms < 20000, `${games} 局 × 15 分钟推演耗时 ${(ms / 1000).toFixed(1)} 秒`);
}

console.log(`\n${passes} 项通过，${fails} 项失败`);
process.exit(fails ? 1 : 0);
