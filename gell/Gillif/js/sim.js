// 规则内核：固定步长推进对局。不碰 DOM，node 可直接跑。
//
// 每一步依次：执行指令 → 效果到期 → 到港 → 逐星结算（控制度 / 造船 / 外发 / 交战 / AI 调度）
//            → AI 放技能 → 势力刷新。
// 改变局面的玩家操作一律走指令（submit → applyCommand），界面不直接改 G。

import { RULES, CHALLENGES, ABILITY_FX, secondsToSteps } from './rules.js';
import { randRange, randInt } from './rng.js';
import { aiTurn, aiAbilities } from './ai.js';
import {
  anomalyFx, markPresence, factionsPresent, isAtPeace, dominant, starCap,
  createShips, destroyShips, increaseControl, setOwner, routeBetween,
} from './core.js';
import { effectOn, enemyEffectOn, effectAny, spiedBy } from './effects.js';
import { validateAbility, useAbility, expireEffects } from './abilities.js';

// 底层查询从 core.js 转出（测试与界面沿用旧的引用路径）
export { factionsPresent, isAtPeace, dominant, starCap, createShips, increaseControl, setOwner } from './core.js';

// ——— 指令 ———

/** 提交指令；在下一步开始时执行（暂停中可用 flushCommands 立即执行） */
export function submit(G, cmd) { G.queue.push(cmd); }

export function flushCommands(G) {
  for (const c of G.queue) applyCommand(G, c);
  G.queue.length = 0;
}

/**
 * 指令：
 *   { type: 'order', f, star, target }        星主 f 让 star 持续向邻星 target 外发；target = -1 为原地防守
 *   { type: 'ping', f, star }                 给队友打信号（只产生事件，不改局面）
 *   { type: 'ability', f, card, src, dst }    发动能力；单星卡 src = dst
 * 不合法的指令静默丢弃（联机时也可能收到过期指令）。
 */
export function applyCommand(G, c) {
  if (G.over) return false;
  if (c.type === 'order') {
    const s = G.stars[c.star];
    if (!s || s.owner !== c.f) return false;
    if (c.target !== -1 && !s.links.includes(c.target)) return false;
    if (c.target >= 0) {
      // 对面是自己的星、正往这边送兵：顺手取消它，免得两颗星来回倒腾
      const t = G.stars[c.target];
      if (t.owner === c.f && t.order === s.id) t.order = -1;
    }
    s.order = c.target;
  } else if (c.type === 'ping') {
    if (!G.stars[c.star]) return false;
    G.events.push({ t: 'ping', star: c.star, f: c.f });
  } else if (c.type === 'ability') {
    if (!validateAbility(G, c.f, c.card, c.src, c.dst)) return false;
    useAbility(G, c.f, c.card, c.src, c.dst);
  } else {
    return false;
  }
  G.log.push({ tick: G.tick, ...c });
  return true;
}

// ——— 推进 ———

export function step(G) {
  if (G.over) return;
  flushCommands(G);
  G.tick++;
  G.time = G.tick * RULES.dt;
  expireEffects(G);
  arrivals(G);
  const t = G.tick;
  for (const s of G.stars) {
    if (t >= s.tCtrl) {
      adjustControl(G, s);
      s.tCtrl = t + secondsToSteps(RULES.ctrlInterval * randRange(G.rng, 1 - RULES.ctrlJitter, 1 + RULES.ctrlJitter));
    }
    if (t >= s.tProd) produce(G, s);
    if (t >= s.tSend) { send(G, s); s.tSend += RULES.sendEvery; }
    if (t >= s.tFight) { fight(G, s); s.tFight += RULES.fightEvery; }
    if (t >= s.tAI) {
      aiTurn(G, s);
      s.tAI = t + secondsToSteps(RULES.aiInterval * randRange(G.rng, 1 - RULES.aiJitter, 1 + RULES.aiJitter));
    }
  }
  for (const fac of G.factions) {
    if (fac.personality && fac.alive && !fac.human && G.time >= fac.nextAbility) aiAbilities(G, fac.id);
  }
  if (t >= G.nextFac) { factionPass(G); G.nextFac += RULES.facEvery; }
  if (G.events.length > 4000) G.events.splice(0, G.events.length - 2000); // 没人取走时防止无限增长
}

/** 连跑若干秒（测试与快进用） */
export function runSeconds(G, sec) {
  const n = Math.round(sec / RULES.dt);
  for (let i = 0; i < n && !G.over; i++) step(G);
}

// ——— 到港 ———

function arrivals(G) {
  const T = G.transit;
  let w = 0;
  for (let i = 0; i < T.length; i++) {
    const tr = T[i];
    if (tr.t1 <= G.time) {
      const s = G.stars[tr.to];
      s.ships[tr.f] += tr.n;
      markPresence(G, s, tr.f);
    } else T[w++] = tr;
  }
  T.length = w;
}

// ——— 局面查询 ———

/** 人类势力按难度享受（或承受）的倍数 [分子, 分母]；AI 与无修正时为 null */
function humanMul(G, f, key) {
  if (!G.factions[f].human) return null;
  const ch = CHALLENGES[G.challenge];
  return ch ? ch[key] : null;
}

/** 这颗星沿当前外发方向的速率（艘/秒）：彗星 ×2、漩涡 ÷2，再看星路被拓宽（+4）还是被干扰（÷4，最少 1） */
export function sendRate(G, s) {
  const a = anomalyFx(s);
  let rate = RULES.sendRate * (a && a.sendMul ? a.sendMul : 1);
  if (s.order >= 0) {
    const r = routeBetween(G, s.id, s.order);
    if (r && r.w > 0) rate += ABILITY_FX.routeBoost;
    else if (r && r.w < 0) rate = Math.max(1, Math.floor(rate / ABILITY_FX.routeChoke));
  }
  return rate;
}

// ——— 造船 ———

function produce(G, s) {
  let cd = RULES.prodInterval * randRange(G.rng, 1 - RULES.prodJitter, 1 + RULES.prodJitter);
  const f = s.owner;
  if (f >= 0) {
    const a = anomalyFx(s);
    // 被己方星包围、又没在打仗也没设外发的「内陆星」不造船
    let friendly = 0, other = 0;
    for (const nb of s.links) { if (G.stars[nb].owner === f) friendly++; else other++; }
    if (!isAtPeace(G, s) || s.order >= 0 || other > 0 || friendly === 0) {
      createShips(G, s, f, a && a.prodAmount ? a.prodAmount : 1);
    }
    if (a && a.prodSlow) cd *= a.prodSlow;
    // 控制度越低造得越慢
    const k = s.control[f] / 100;
    cd = cd * RULES.lowControlSlow + (cd - cd * RULES.lowControlSlow) * k;
  }
  s.tProd = G.tick + secondsToSteps(cd);
}

// ——— 外发 ———

function send(G, s) {
  const f = s.owner;
  if (f < 0 || s.order < 0) { s.sendAcc = 0; return; }
  s.sendAcc += sendRate(G, s) * RULES.sendEvery * RULES.dt;
  const n = Math.min(Math.floor(s.sendAcc), s.ships[f]);
  s.sendAcc -= Math.floor(s.sendAcc);
  if (n <= 0) return;
  s.ships[f] -= n;
  const to = G.stars[s.order];
  const travel = Math.hypot(to.x - s.x, to.y - s.y) * G.factions[f].pace;
  G.transit.push({ f, n, from: s.id, to: to.id, t0: G.time, t1: G.time + travel });
}

// ——— 交战 ———

function fight(G, s) {
  const a = anomalyFx(s);
  const own = s.owner;
  // 防御（星主对自己的星）优先于破坏（别人对这颗星）；开着它们时哪怕只有一方在场也照常结算
  const card = own >= 0 ? (effectOn(G, 'defense', own, s.id) || enemyEffectOn(G, 'offense', own, s.id)) : null;
  if (factionsPresent(s) >= 2 || card) {
    s.lastFight = G.time;
    const stealthOwner = own >= 0 && !!effectAny(G, 'stealth', own);
    const spied = own >= 0 && spiedBy(G, own).length > 0;
    const F = s.ships.length;
    const size = s.ships.slice();          // 同时结算：先拍下各方兵力
    const losses = new Array(F).fill(0);
    let any = false;
    for (let f = 0; f < F; f++) {
      const n = size[f];
      if (n <= 0) continue;
      let fewer = false, extra = false;
      if (card) {
        if (f === card.f) {
          if (n < ABILITY_FX.cardMinShips) continue;   // 施放方不足 6 艘时不损失
          fewer = true;
        } else extra = true;
      }
      let enemy = 0;
      for (let g = 0; g < F; g++) if (g !== f && size[g] > enemy) enemy = size[g];
      const defending = f === own && s.order < 0;
      const shielded = !!(a && a.shielded) || (stealthOwner && f === own);
      let [lo, hi] = defending && shielded ? RULES.lossBoth : defending || shielded ? RULES.lossShielded : RULES.lossBase;
      if (spied && f === own) { lo += 1; hi += 1; }
      if (a && a.lossAdd) { lo += a.lossAdd[0]; hi += a.lossAdd[1]; }
      if (extra) { lo <<= 1; hi <<= 1; } else if (fewer) { lo >>= 1; hi >>= 1; }
      let cap = enemy * RULES.lossCapMul;
      const k = Math.min(RULES.bigBattleMax, Math.floor(Math.max(n, enemy) / RULES.bigBattle));
      if (k > 1) { lo *= k; hi *= k; cap *= k; }
      let v = Math.min(randInt(G.rng, lo, hi), cap);
      const m = humanMul(G, f, 'loss');
      if (m) v = Math.trunc((v * m[0]) / m[1]);
      v = Math.min(v, n);
      if (v > 0) { losses[f] = v; any = true; }
    }
    if (any) {
      for (let f = 0; f < F; f++) if (losses[f]) destroyShips(G, s, f, losses[f]);
      G.events.push({ t: 'fight', star: s.id, losses });
    }
  }
  // 等离子：每方最多驻留 25，多出的烧毁（和平时也照烧）
  if (a && a.fleetCap) {
    let burnt = null;
    for (let f = 0; f < s.ships.length; f++) {
      if (s.ships[f] > a.fleetCap) {
        burnt ||= new Array(s.ships.length).fill(0);
        burnt[f] = destroyShips(G, s, f, s.ships[f] - a.fleetCap);
      }
    }
    if (burnt) G.events.push({ t: 'burn', star: s.id, losses: burnt });
  }
}

// ——— 控制度 ———

function adjustControl(G, s) {
  const own = s.owner;
  const dom = dominant(s);
  if (dom < 0) return;
  // 爱国：星主对这颗星开着（未被宣传抵消）。宣传：别人对这颗星开着（爱国在时无效）
  const pat = own >= 0 ? effectOn(G, 'patriotism', own, s.id) : null;
  const pro = own >= 0 && !pat ? enemyEffectOn(G, 'propaganda', own, s.id) : null;
  // 次大的一方：占优者不是星主时，星主（哪怕没船）垫底
  let sec = (dom !== own && own >= 0) ? s.ships[own] : 0;
  for (let f = 0; f < s.ships.length; f++) if (f !== dom && s.ships[f] > sec) sec = s.ships[f];
  let g = Math.min(RULES.growthCap, Math.round((s.ships[dom] - sec) / RULES.growthDiv));
  const m = humanMul(G, dom, 'growth');
  if (m) g = Math.trunc((g * m[0]) / m[1]);
  let adj = 0;
  if (pro) {
    if (dom === own) adj -= 1;               // 星主占优：回升减半，也没有自然回复
    else if (dom === pro.f) adj += 1;        // 宣传方占优：增长加倍
  } else if (dom === own) {
    g += RULES.ownerBonus;
    if (pat) adj += 1;                       // 爱国：回升加倍
  }
  const a = anomalyFx(s);
  if (a && a.growthAdj) adj += a.growthAdj;
  if (own >= 0 && dom !== own && s.ships[own] > RULES.ownerHold) adj -= 1;
  g = adj >= 0 ? g * (1 + adj) : g >> -adj;
  if (g > 0 && (!pat || dom === own)) increaseControl(G, s, dom, g);   // 爱国：敌人涨不了控制度
}

// ——— 势力刷新 ———

export function factionPass(G) {
  const F = G.factions.length;
  // 每颗星各方来袭兵力（在途、目的地是它）
  G.incoming = G.stars.map(() => new Array(F).fill(0));
  for (const tr of G.transit) G.incoming[tr.to][tr.f] += tr.n;

  // 足迹：拥有或有船在场
  for (const s of G.stars) {
    if (s.owner >= 0) markPresence(G, s, s.owner);
    for (let f = 0; f < F; f++) if (s.ships[f] > 0) markPresence(G, s, f);
  }

  for (const fac of G.factions) fac.stars = 0;
  for (const s of G.stars) if (s.owner >= 0) G.factions[s.owner].stars++;
  for (const fac of G.factions) {
    if (fac.stars > fac.stats.maxStars) fac.stats.maxStars = fac.stars;
    if (fac.total > fac.stats.maxShips) fac.stats.maxShips = fac.total;
    if (fac.alive && fac.stars === 0 && fac.total === 0) {
      fac.alive = false;
      G.events.push({ t: 'out', f: fac.id });
    }
  }

  // AI 用的威胁场：有敌人的星和别人的星为源，向外每跳减 1
  G.threat = G.factions.map((fac) => (fac.human || !fac.alive ? null : threatField(G, fac.id)));

  // 胜负：只剩一方；有人类玩家而他们全军覆没；或时间到（星最多者胜，平手比舰船）
  if (G.sandbox) return;
  const alive = G.factions.filter((x) => x.alive);
  const humans = G.factions.filter((x) => x.human);
  if (alive.length <= 1) endGame(G, alive.length ? alive[0].id : -1, 'conquest');
  else if (!G.network && humans.length && humans.every((x) => !x.alive)) endGame(G, leader(G), 'defeat');
  else if (G.timeLimit > 0 && G.time >= G.timeLimit) endGame(G, leader(G), 'time');
}

/** 当前领先者：星最多，平手比舰船，再平手取编号小的 */
export function leader(G) {
  let best = -1;
  for (const fac of G.factions) {
    if (!fac.alive) continue;
    const b = best >= 0 ? G.factions[best] : null;
    if (!b || fac.stars > b.stars || (fac.stars === b.stars && fac.total > b.total)) best = fac.id;
  }
  return best;
}

function threatField(G, f) {
  const n = G.stars.length;
  const d = new Array(n).fill(-1);
  const q = [];
  for (const s of G.stars) {
    let src = s.owner >= 0 && s.owner !== f;
    if (!src) for (let g = 0; g < s.ships.length; g++) if (g !== f && s.ships[g] > 0) { src = true; break; }
    if (src) { d[s.id] = 0; q.push(s.id); }
  }
  for (let h = 0; h < q.length; h++) {
    const u = q[h];
    for (const v of G.stars[u].links) if (d[v] < 0) { d[v] = d[u] + 1; q.push(v); }
  }
  return d.map((x) => (x < 0 ? 0 : Math.max(0, RULES.threatMax - x)));
}

function endGame(G, winner, reason) {
  if (G.over) return;
  G.over = true;
  G.winner = winner;
  G.endReason = reason;
  G.events.push({ t: 'end', winner, reason });
}

// ——— 得分 ———

/**
 * 势力得分：占领 ×500 − 失守 ×250 + 造船 ×2 − 损船；舰船曾逼近上限再 ×1.25；
 * 保底 = 分钟数 × 3333 × min(0.5, 最多星数 / 被占星总数)；人类玩家再乘难度倍数。不足 2 分钟记 0。
 */
export function score(G, f) {
  const fac = G.factions[f];
  const st = fac.stats;
  if (G.time < RULES.scoreMinSec) return 0;
  let v = st.captured * RULES.scoreCapture - st.starsLost * RULES.scoreLostStar
    + st.created * RULES.scoreShipMade - st.lost * RULES.scoreShipLost;
  if (st.maxShips > G.cap * RULES.scoreFullFleet) v = Math.trunc((v * 125) / 100);
  let owned = 0;
  for (const s of G.stars) if (s.owner >= 0) owned++;
  const floor = Math.round((G.time / 60) * RULES.scoreFloorPerMin * Math.min(0.5, st.maxStars / Math.max(1, owned)));
  v = Math.max(v, floor);
  const mul = fac.human && CHALLENGES[G.challenge] ? CHALLENGES[G.challenge].score : 1;
  return Math.round(v * mul);
}

// ——— 校验（测试用）———

/** 重新统计各势力舰船总数，与增量维护的 total 比对 */
export function recount(G) {
  const tot = new Array(G.factions.length).fill(0);
  for (const s of G.stars) for (let f = 0; f < tot.length; f++) tot[f] += s.ships[f];
  for (const tr of G.transit) tot[tr.f] += tr.n;
  return tot;
}
