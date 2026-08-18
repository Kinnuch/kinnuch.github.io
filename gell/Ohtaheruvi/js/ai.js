// AI（设计文档 06 章第三节）
//
// 三层，逐层降级以保证时间预算：
//   1 战略层：威胁评估、给每座城打前线/腹地标签、决定金币分配
//   2 战役层：给每支军团派任务（DEFEND / ATTACK / EXPLORE / ESCORT / MERGE）
//   3 战术层：沿跨回合路线推进，交战前用胜率阈值决定打还是等
//
// **不给 AI 任何数值作弊**：它和玩家用同一套规则、同一个胜率函数，
// 前三档难度同样受战争迷雾限制（只有「魔苟斯」档全知，且在难度说明里写明）。

import { UNITS, upkeepOf } from '../data/units.js';
import { CITY_SIZE } from '../data/terrain.js';
import * as S from './state.js';
import { chebyshev, key, terrainAt } from './map.js';
import { estimateOdds } from './combat.js';
import { isHero } from './unit.js';
import { hasExplored, canSee } from './fog.js';

export const DIFFICULTIES = {
  // 四档的差别落在三件真正影响局势的事上：
  //   targetRange 愿意为一个目标跑多远（决定扩张速度）
  //   minStack    打有主之城前肯攒多少兵（决定攻坚强度）
  //   defendRatio 多大比例的军团留守（决定还剩多少兵能出门）
  // attackOdds 只在目标有守军时才生效，单独调它几乎看不出差别。
  merciful: {
    key: 'merciful', name: '仁慈',
    attackOdds: 0.72, defendRatio: 0.45, minStack: 6,
    targetRange: 16, exploreRange: 8, scoutRatio: 0.05, omniscient: false,
    desc: 'AI 谨慎：留近半数军团守家，只打附近的目标，攻坚前要攒满六人，也很少派人去探图。适合第一次上手。',
  },
  normal: {
    key: 'normal', name: '正常',
    attackOdds: 0.60, defendRatio: 0.30, minStack: 4,
    targetRange: 30, exploreRange: 12, scoutRatio: 0.15, omniscient: false,
    desc: 'AI 按常规打法推进：三成军团留守，会为中距离的目标出兵，也会分出少量斥候探图。',
  },
  hard: {
    key: 'hard', name: '困难',
    attackOdds: 0.52, defendRatio: 0.15, minStack: 3,
    targetRange: 60, exploreRange: 20, scoutRatio: 0.30, omniscient: false,
    desc: 'AI 更敢冒险：几乎倾巢而出，会长途奔袭，会主动抢遗迹与渡口，并持续派斥候拓展视野。',
  },
  morgoth: {
    key: 'morgoth', name: '魔苟斯',
    attackOdds: 0.46, defendRatio: 0.08, minStack: 2,
    targetRange: Infinity, exploreRange: 32, scoutRatio: 0, omniscient: true,
    desc: 'AI 不受战争迷雾限制（全图可见），倾巢而出且不挑目标。数值上仍不作弊。',
  },
};

// 每个 AI 回合最多处理这么多支军团。
// 早先这里是「1500ms 时间预算」，但联机要求各端推演完全一致 ——
// 快的机器多走几支、慢的少走几支，局面立刻分叉。
// 实测最大的图（160×120，八方满编）一回合也就 52ms，用固定动作上限完全够。
const MAX_ARMY_ACTIONS = 400;

export function runAiTurn(G, player) {
  const cfg = DIFFICULTIES[G.difficulty] || DIFFICULTIES.normal;

  const plan = strategise(G, player, cfg);          // 第一层
  aiHeroOffer(G, player, plan);
  aiProduction(G, player, plan);

  const tasks = assignTasks(G, player, cfg, plan);  // 第二层

  let acted = 0;
  for (const { army, task } of tasks) {             // 第三层
    if (acted++ >= MAX_ARMY_ACTIONS) break;
    if (!G.armies.includes(army)) continue;
    execute(G, player, cfg, army, task);
  }
  S.clearUndo(G);
}

// ── 第一层：战略 ──────────────────────────────────────────

function strategise(G, player, cfg) {
  const mine = S.citiesOf(G, player);
  const known = knownCities(G, player, cfg);
  const foes = known.filter((c) => c.owner !== player);

  // 每座己方城市离最近的敌对城市有多远 → 前线还是腹地
  const frontier = new Map();
  for (const c of mine) {
    let d = Infinity;
    for (const f of foes) d = Math.min(d, chebyshev(c, f));
    frontier.set(c.id, d);
  }
  const frontLine = mine.filter((c) => (frontier.get(c.id) ?? Infinity) <= 14);

  // 威胁：能看见的敌军里，离我方城市多近、多强
  let threat = 0;
  for (const a of G.armies) {
    if (a.owner === player || a.owner === 0) continue;
    if (!cfg.omniscient && !canSee(G, player, a.x, a.y)) continue;
    let d = Infinity;
    for (const c of mine) d = Math.min(d, chebyshev(a, c));
    if (d <= 12) threat += a.units.length * (13 - d) / 12;
  }

  const income = S.incomeOf(G, player);
  const upkeep = S.upkeepOfPlayer(G, player);

  return {
    frontier,
    frontLine: new Set(frontLine.map((c) => c.id)),
    known, foes, threat,
    headroom: income - upkeep,
    scoutSpots: cfg.omniscient ? [] : knowledgeFrontier(G, player),
  };
}

/**
 * 认知边界：已探索格子的外沿。
 * 迷雾才是真正卡住 AI 扩张的东西 —— 它只会打自己见过的城，
 * 没有斥候就会在探索完周边后彻底停滞。抽样扫描，避免每回合全图遍历太贵。
 */
function knowledgeFrontier(G, player) {
  const spots = [];
  const step = G.map.w > 80 ? 3 : 2;
  for (let y = 1; y < G.map.h - 1; y += step) {
    for (let x = 1; x < G.map.w - 1; x += step) {
      // 目标必须是「已探索、走得进去」的格子 —— 早期版本挑的是未探索格，
      // 结果安格班四周的未知区域全是山，寻路一律返回 null，AI 就地站了几十回合。
      if (!hasExplored(G, player, x, y)) continue;
      const t = terrainAt(G.map, x, y);
      if (t.kind === 'water' || t.kind === 'river' || t.kind === 'mountain') continue;
      // 紧挨着未知区域 → 走到这里就能揭开新视野
      if (!hasExplored(G, player, x - 1, y) || !hasExplored(G, player, x + 1, y)
        || !hasExplored(G, player, x, y - 1) || !hasExplored(G, player, x, y + 1)) {
        spots.push({ x, y });
      }
    }
  }
  return spots;
}

/** AI 只知道自己探索过的城市（魔苟斯档除外） */
function knownCities(G, player, cfg) {
  if (cfg.omniscient || G.fogMode === 'off') return G.cities;
  return G.cities.filter((c) => hasExplored(G, player, c.x, c.y));
}

// ── 英雄与生产 ────────────────────────────────────────────

function aiHeroOffer(G, player, plan) {
  if (!G.offer || G.offer.player !== player) return;
  // 英雄不吃维护费，是纯赚的；只要付得起且不至于立刻见底就雇
  const margin = plan.threat > 8 ? 1.2 : 1.8;
  if (G.gold[player] >= G.offer.cost * margin) S.acceptOffer(G);
  else S.declineOffer(G);
}

function aiProduction(G, player, plan) {
  let headroom = plan.headroom;
  for (const c of S.citiesOf(G, player)) {
    if (c.razed || !c.produces.length) continue;
    const front = plan.frontLine.has(c.id);
    // 前线城造能打的，腹地城造性价比高的填线兵
    const ranked = c.produces.slice().sort((a, b) =>
      front ? power(b) - power(a) : value(b) - value(a));
    let pick = ranked[0];
    if (headroom < upkeepOf(pick)) {
      pick = c.produces.slice().sort((a, b) => upkeepOf(a) - upkeepOf(b))[0];
    }
    if (!c.building || c.building.type !== pick) S.setProduction(G, c, pick);
    headroom -= upkeepOf(pick) / Math.max(1, UNITS[pick].build);
  }
}

const power = (t) => UNITS[t].str * UNITS[t].hp;
const value = (t) => (UNITS[t].str * UNITS[t].hp) / (UNITS[t].cost + UNITS[t].build * 4);

// ── 第二层：给军团派任务 ──────────────────────────────────

function assignTasks(G, player, cfg, plan) {
  const armies = S.armiesOf(G, player).filter((a) => S.stackBudget(G, a) > 0);
  const out = [];

  // 留守：按难度取一定比例的军团守在前线城里，优先留最小的几支
  const quota = Math.round(armies.length * cfg.defendRatio);
  const guarded = new Set();
  const candidates = armies
    .filter((a) => {
      const c = S.cityAt(G, a.x, a.y);
      return c && c.owner === player && plan.frontLine.has(c.id);
    })
    .sort((x, y) => x.units.length - y.units.length);
  for (const a of candidates) {
    if (guarded.size >= quota) break;
    const c = S.cityAt(G, a.x, a.y);
    if (guarded.has(c.id)) continue;
    guarded.add(c.id);
    out.push({ army: a, task: { kind: 'DEFEND', city: c } });
  }

  for (const a of armies) {
    if (out.some((o) => o.army === a)) continue;

    // 带英雄的小队去探索地物
    if (a.units.some(isHero) && a.units.length <= 4) {
      const f = nearestFeature(G, a, cfg);
      if (f) { out.push({ army: a, task: { kind: 'EXPLORE', at: f } }); continue; }
    }

    // 兵太少先去和最近的友军合流，别送
    if (a.units.length <= 2) {
      const mate = nearestFriendlyStack(G, a);
      if (mate && chebyshev(a, mate) <= 10) {
        out.push({ army: a, task: { kind: 'MERGE', at: mate } });
        continue;
      }
    }

    const target = bestTargetCity(G, player, cfg, plan, a);
    if (target) { out.push({ army: a, task: { kind: 'ATTACK', city: target } }); continue; }

    // 无仗可打 → 去拓展视野；斥候比例高的难度还会主动分兵去探
    const spot = nearestScoutSpot(plan, a);
    if (spot) out.push({ army: a, task: { kind: 'SCOUT', at: spot } });
  }

  // 按难度抽一部分军团改派侦察，让高难度的 AI 更快看清全图
  const scoutQuota = Math.round(armies.length * (cfg.scoutRatio || 0));
  if (scoutQuota > 0 && plan.scoutSpots.length) {
    let converted = 0;
    for (const o of out) {
      if (converted >= scoutQuota) break;
      if (o.task.kind !== 'ATTACK') continue;
      if (o.army.units.length > 3) continue;          // 只抽小队，别拆主力
      const spot = nearestScoutSpot(plan, o.army);
      if (!spot) continue;
      o.task = { kind: 'SCOUT', at: spot };
      converted++;
    }
  }

  // 满编的先动，让主力打头阵
  out.sort((x, y) => y.army.units.length - x.army.units.length);
  return out;
}

function nearestFeature(G, army, cfg) {
  let best = null, bestD = Infinity;
  for (const f of G.map.def.features) {
    if (f.type === 'ruin' && f.explored) continue;
    if (f.type !== 'ruin' && (f.usedBy || []).includes(army.owner)) continue;
    if (!cfg.omniscient && G.fogMode !== 'off' && !hasExplored(G, army.owner, f.x, f.y)) continue;
    const d = chebyshev(f, army);
    if (d < bestD && d <= cfg.exploreRange) { bestD = d; best = f; }
  }
  return best;
}

function nearestScoutSpot(plan, army) {
  let best = null, bestD = Infinity;
  for (const s of plan.scoutSpots) {
    const d = chebyshev(s, army);
    if (d < bestD) { bestD = d; best = s; }
  }
  return best;
}

function nearestFriendlyStack(G, army) {
  let best = null, bestD = Infinity;
  for (const a of G.armies) {
    if (a === army || a.owner !== army.owner) continue;
    if (a.units.length + army.units.length > 8) continue;
    const d = chebyshev(a, army);
    if (d < bestD) { bestD = d; best = a; }
  }
  return best;
}

function bestTargetCity(G, player, cfg, plan, army) {
  let best = null, bestScore = -Infinity;
  for (const c of plan.known) {
    if (c.owner === player) continue;
    const d = chebyshev(c, army);
    if (d > cfg.targetRange) continue;                       // 跑不了那么远
    // 打有主之城要先攒够兵；中立城不设门槛，捡地盘不用等
    if (c.owner !== 0 && army.units.length < cfg.minStack) continue;
    // 守军停在城池右下角，不能只看左上格
    const garrison = S.defenderIn(G, c, player);
    const defenders = garrison ? garrison.units.length : 0;
    const s = (CITY_SIZE[c.size].income * 2 + (c.owner === 0 ? 10 : 0)) / (d + 4)
      - defenders * 0.7
      + (army.units.length >= 6 ? 2 : 0);
    if (s > bestScore) { bestScore = s; best = c; }
  }
  return best;
}

// ── 第三层：战术 ──────────────────────────────────────────

function execute(G, player, cfg, army, task) {
  // 先看相邻有没有值得打的
  if (tryAdjacentAttack(G, player, cfg, army)) return;

  if (task.kind === 'DEFEND') return;              // 原地守着

  if (task.kind === 'EXPLORE') {
    const f = task.at;
    if (f.x === army.x && f.y === army.y) { S.exploreFeature(G, army); return; }
    if (stepToward(G, army, f.x, f.y) && S.canExplore(G, army)) S.exploreFeature(G, army);
    return;
  }

  if (task.kind === 'MERGE' || task.kind === 'SCOUT') {
    stepToward(G, army, task.at.x, task.at.y);
    return;
  }

  if (task.kind === 'ATTACK') {
    const c = task.city;
    // 走到城边，下一回合由 tryAdjacentAttack 发起进攻
    stepToward(G, army, c.x + 1, c.y + 1);
  }
}

function tryAdjacentAttack(G, player, cfg, army) {
  const targets = [];
  for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
    if (!dx && !dy) continue;
    const x = army.x + dx, y = army.y + dy;
    if (x < 0 || y < 0 || x >= G.map.w || y >= G.map.h) continue;
    const foe = S.armyAt(G, x, y);
    const city = S.cityAt(G, x, y);
    if ((foe && foe.owner !== player) || (city && city.owner !== player)) {
      targets.push({ x, y, weight: city ? CITY_SIZE[city.size].income : 5 });
    }
  }
  targets.sort((a, b) => b.weight - a.weight);

  for (const t of targets) {
    const defender = S.resolveDefender(G, player, t.x, t.y);
    if (!defender) { S.attack(G, army, t.x, t.y); return true; }   // 空城直接进
    const env = S.battleEnv(G, defender.x, defender.y);
    const odds = estimateOdds(G, army.units, defender.units, env, 200,
      (G.rng.seed ^ (t.x * 73 + t.y)) | 0);
    if (odds.win >= cfg.attackOdds) { S.attack(G, army, t.x, t.y); return true; }
  }
  return false;
}

/**
 * 朝目标推进：先算跨回合的完整路线（会自己绕去渡口、走隘口），
 * 再沿路线走完本回合的移动点。
 * 只看直线距离的贪心会顶在河岸上一动不动 —— 因为没有任何相邻格能拉近距离。
 */
function stepToward(G, army, tx, ty) {
  const route = S.routeFor(G, army, tx, ty);
  if (!route || !route.length) return false;
  const reach = S.reachFor(G, army);
  if (!reach.size) return false;

  let cut = -1;
  for (let i = 0; i < route.length; i++) {
    if (!reach.has(key(route[i].x, route[i].y))) break;
    cut = i;
  }
  if (cut < 0) return false;
  S.moveAlong(G, army, route.slice(0, cut + 1));
  return true;
}
