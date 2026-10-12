// AI：逐星决策，没有全局规划。每颗 AI 的星大约每秒自己判断一次：
//   1. 受威胁（敌方兵力 + 5 ≥ 己方）→ 取消外发，原地防守（拿防守加成）
//   2. 只有一条航线 → 全部往外送
//   3. 给自己和每颗邻星打「军事优先级」分，送往分数更高的邻星
//   4. 都不值得 → 沿威胁场往前线输送（后方兵力自动汇向交战区）
// 兵力估算 = 驻留（星主守军按 11/7 计）+ 正在飞来的。
//
// 上将、皇帝难度下 AI 还各带一种性格（rules.js 的 PERSONALITIES），按卡组放技能：见文末 aiAbilities。

import { RULES } from './rules.js';
import { dominant, isAtPeace } from './core.js';
import { ownEffect } from './effects.js';
import { useAbility } from './abilities.js';

function strength(G, s, f) {
  let n = s.ships[f];
  if (s.owner === f) n = Math.trunc(n * RULES.aiOwnerWeight);
  return n + (G.incoming[s.id] ? G.incoming[s.id][f] : 0);
}

/**
 * f 在此星的兵力，以及最强「对手」的兵力。
 * 对手只算在这颗星上已经握有控制度的敌方（星主，或正在压过星主的进攻方）——
 * 路过、刚到、或者只是在飞来路上的敌船不算。这让 AI 只在真的快守不住时才缩回防守，
 * 平时敢于外发；按全部敌方兵力算的话 AI 会过度保守，全图僵持。
 */
export function presence(G, s, f) {
  const mine = strength(G, s, f);
  let enemy = 0;
  for (let g = 0; g < s.ships.length; g++) {
    if (g !== f && s.control[g] > 0) enemy = Math.max(enemy, strength(G, s, g));
  }
  return { mine, enemy };
}

/** 对势力 f 而言，这颗星有多值得派兵过去（越大越值得） */
export function priority(G, s, f) {
  const { mine, enemy } = presence(G, s, f);
  const diff = mine - enemy;
  let ne = 0, en = 0;
  for (const nb of s.links) {
    const o = G.stars[nb].owner;
    if (o < 0) ne++;
    else if (o !== f) en++;
  }
  const own = s.owner === f;
  if (own && en === 0 && ne === 0) return -1000;   // 内陆星：自己不需要兵
  let p = ne * 5;                                  // 邻接中立星越多越好（便于扩张）
  if (own) p += en * 10;                           // 自己的前线星
  else if (s.owner >= 0 && mine === 0) p -= en * 3;
  if (diff > 4) p -= diff;                         // 已经够了的地方别再堆
  if (own) {
    if (diff < 0) p += diff >= -20 ? 10 : -25;     // 守得住就去救，救不了就算了
    if (diff > 50) p -= 75;
    if (diff > 80) p -= 150;
  } else if (enemy < 5) p += 25;                   // 软柿子
  else if (diff < -20) p -= 50;                    // 啃不动
  return p;
}

export function aiTurn(G, s) {
  const f = s.owner;
  if (f < 0 || !s.links.length) return;
  const fac = G.factions[f];
  if (fac.human || !fac.alive) return;

  const { mine, enemy } = presence(G, s, f);
  let target = -1;
  if (enemy > 0 && mine < enemy + RULES.aiDefendMargin) {
    target = -1;
  } else if (s.links.length === 1) {
    target = s.links[0];
  } else {
    const myP = priority(G, s, f);
    let best = myP;
    for (const nb of s.links) {
      const p = priority(G, G.stars[nb], f);
      if (p > best) { best = p; target = nb; }
    }
    if (target < 0 && G.threat[f]) {
      let hi = G.threat[f][s.id];
      for (const nb of s.links) {
        const th = G.threat[f][nb];
        if (th > hi) { hi = th; target = nb; }
      }
    }
  }
  s.order = target;
}

// ——— 能力 ———

/** 星上除 f 以外最大的一支舰队：[势力, 艘数]（没有则 [-1, 0]） */
function biggestEnemy(s, f) {
  let who = -1, n = 0;
  for (let g = 0; g < s.ships.length; g++) if (g !== f && s.ships[g] > n) { who = g; n = s.ships[g]; }
  return [who, n];
}

/**
 * 带性格的 AI 每秒扫一遍全图，找到第一个值得放技能的地方就放（每次最多一张）。
 * 卡组里没有、或还在冷却的卡 use() 直接返回 false，于是同一套规则适用于所有性格。
 */
export function aiAbilities(G, f) {
  const fac = G.factions[f];
  fac.nextAbility = G.time + 1;
  const ready = (card) => fac.deck.includes(card) && G.time >= fac.ready[card];
  const use = (card, src, dst) => {
    if (!ready(card)) return false;
    useAbility(G, f, card, src, dst);
    fac.nextAbility = G.time + 0.25;          // 放完一张，稍后可以接着放下一张
    return true;
  };
  const patOn = (id) => { const e = ownEffect(G, 'patriotism', f); return !!e && e.dst === id; };
  const proOn = (id) => { const e = ownEffect(G, 'propaganda', f); return !!e && e.dst === id; };

  for (const s of G.stars) {
    const id = s.id;
    if (s.owner === f) {
      // 自己的星
      const [enemy, enemySize] = biggestEnemy(s, f);
      const num = s.ships[f] - enemySize;
      if ((num < -15 && use('patriotism', id, id)) || (enemySize > 50 && use('fleet', id, id))) return;
      if (enemySize < 50 && patOn(id) && ready('fleet')) continue;   // 爱国撑着，留着策反等更大的
      if ((enemySize > 25 && use('fleet', id, id))
        || (enemySize > 20 && (use('purge', id, id) || use('explosion', id, id)))
        || (num < -25 && use('recruits', id, id))
        || (num < -10 && use('defense', id, id))
        || (num < 0 && enemy >= 0 && G.factions[enemy].human && use('stealth', id, id))) return;
      if (num > 25 && enemySize === 0 && isAtPeace(G, s) && ready('teleport')) {
        // 闲着的强星：派突击队去偷一颗中立星或防守薄弱的敌星
        for (const t of G.stars) {
          if (t.id !== id && (t.owner < 0 || (t.owner !== f && t.ships[t.owner] < 4 && isAtPeace(G, t)))) {
            use('teleport', id, t.id);
            return;
          }
        }
      }
      if ((num > 50 && enemySize === 0 && s.order >= 0 && use('stabilize', id, s.order))
        || (num < -9 && s.control[f] < 40 && use('bribe', id, id))) return;
      continue;
    }
    if (s.owner < 0) {
      // 中立星：自己占优但控制度还低，砸钱或募兵加速
      if (dominant(s) === f && s.control[f] < 35 && (use('bribe', id, id) || use('recruits', id, id))) return;
      continue;
    }
    // 别人的星
    const own = s.owner;
    if (s.ships[own] > 10 && s.order >= 0) {
      const remote = G.stars[s.order];
      if (remote.owner === f && use('degrade', remote.id, id)) return;   // 干扰它冲我来的星路
    }
    const mine = s.ships[f];
    if (mine <= 0) continue;
    if ((proOn(id) && use('bribe', id, id))
      || (G.factions[own].human && (use('spy', id, id) || (fac.home >= 0 && G.stars[fac.home].owner === f && use('stealth', fac.home, fac.home))))) return;
    const theirs = s.ships[own];
    const diff = mine - theirs;
    if ((diff < -7 && s.control[f] > 40 && use('bribe', id, id))
      || (diff > 14 && use('propaganda', id, id))
      || (theirs > 40 && use('explosion', id, id))
      || (theirs > 25 && use('fleet', id, id))
      || (theirs > 10 && use('offense', id, id))
      || (theirs < 5 && use('anarchy', id, id))) return;
  }
}
