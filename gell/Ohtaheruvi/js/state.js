// 对局状态与规则推进

import { makeRng } from './rng.js';
import { buildMap, terrainAt, cityIdAt, featureAt, citySizeInfo, MAX_STACK, computeReach, routePath, moveCost } from './map.js';
import { UNITS, upkeepOf, producibleInM1 } from '../data/units.js';
import { HERO_ROSTER, hireCost, heroHp } from '../data/heroes.js';
import { ITEMS, RUIN_ITEM_POOL, RUIN_REWARDS, RUIN_GUARDIANS, RUIN_ALLIES } from '../data/items.js';
import { FACTIONS } from '../data/factions.js';
import { makeUnit, makeHeroUnit, unitMp, unitMaxHp, unitUpkeep, isHero, heroOf, unitName, itemSum } from './unit.js';
import { resolveBattle } from './combat.js';
import { applyScenario, isLocked, tickScenario } from './scenario.js';
import { makeSeen, refreshFog, canSee, hasExplored } from './fog.js';

export const VECTOR_DELAY = 2;

export function newGame(sourceDef, opts = {}) {
  const seed = opts.seed || (Date.now() & 0x7fffffff);
  const sc = opts.scenario || null;
  // 地物会被就地打上 explored / usedBy / guardian 标记，必须先克隆，
  // 否则同一页面内重开一局会继承上一局的探索状态。
  // 场景层（城归谁、开局带什么兵、封锁区）在此叠加到地形层上。
  const base = sc ? applyScenario(sourceDef, sc) : sourceDef;
  const mapDef = { ...base, features: base.features.map((f) => ({ ...f })) };
  const G = {
    seed,
    rng: makeRng(seed),
    map: buildMap(mapDef),
    mapId: mapDef.id,
    turn: 1,
    players: mapDef.players.slice(),
    currentIdx: 0,
    gold: {},
    cities: [],
    armies: [],
    heroes: {},
    rosterIdx: {},
    pending: [],       // 生产投送在途
    offer: null,       // 待决的英雄求聘
    log: [],
    settings: { attOrder: 'asc', defOrder: 'asc', animate: true, ...(opts.settings || {}) },
    nextArmyId: 1,
    nextUid: 1,        // 单位编号：属于这一局，不是全局计数器
    winner: null,
    scenario: sc,
    turnLimit: (sc && sc.turnLimit) || null,
    fogMode: opts.fogMode || 'memory',   // off / memory / strict
    difficulty: opts.difficulty || 'normal',
    seen: {},
    visible: {},
    cityMemory: {},
    humans: opts.humans || [mapDef.players[0]],  // 其余由 AI 执棋
    undo: [],                                    // 移动撤回栈（仅本回合内有效）
    history: [],                                 // 逐回合统计，供曲线图使用
    battles: [],                                 // 战史：每场战斗的完整逐次决斗记录
  };

  for (const p of G.players) {
    const scGold = sc && sc.startGold && sc.startGold[p];
    G.gold[p] = scGold != null ? scGold : (opts.startGold != null ? opts.startGold : 120);
    G.rosterIdx[p] = 0;
  }
  // 场景可指定先手方（骤火之战是安格班先动）
  if (sc && sc.firstPlayer != null) {
    const i = G.players.indexOf(sc.firstPlayer);
    if (i >= 0) G.currentIdx = i;
  }

  // 城市
  for (const c of mapDef.cities) {
    const info = citySizeInfo(c.size);
    G.cities.push({
      id: c.id, name: c.name, x: c.x, y: c.y, size: c.size,
      owner: c.owner, defense: info.defense, income: info.income,
      produces: c.produces.filter(producibleInM1),
      building: null, vectorTo: null, razed: false,
    });
  }

  // 君主英雄进都城
  for (const p of G.players) {
    const roster = HERO_ROSTER[p] || [];
    const lord = (sc && sc.lords && sc.lords[p]) || roster.find((h) => h.role === 'lord');
    if (lord) spawnHero(G, lord, p);
    G.rosterIdx[p] = roster.findIndex((h) => h.role !== 'lord');
    if (G.rosterIdx[p] < 0) G.rosterIdx[p] = roster.length;
  }

  // 参战方的起始驻军（停在城池右下角，与君主英雄自动合流）
  for (const [cityId, types] of Object.entries(mapDef.garrisons || {})) {
    const city = G.cities.find((c) => c.id === cityId);
    if (!city) continue;
    const at = cityAnchor(city);
    placeArmy(G, at.x, at.y, city.owner, types.map((t) => makeUnit(G, t)));
  }

  // 中立城市的守军按规模自动生成：规模越大，守军越多也越强
  for (const c of G.cities) {
    if (c.owner !== 0) continue;
    const at = cityAnchor(c);
    if (armyAt(G, at.x, at.y)) continue;
    placeArmy(G, at.x, at.y, 0, neutralGarrison(G, c));
  }

  // 各城开局默认生产其第一种兵
  for (const c of G.cities) if (c.produces.length && G.players.includes(c.owner)) setProduction(G, c, c.produces[0]);

  for (const p of G.players) {
    G.seen[p] = makeSeen(G.map.w, G.map.h);
    G.visible[p] = new Set();
    G.cityMemory[p] = {};
  }
  for (const p of G.players) refreshFog(G, p);

  refreshMp(G, G.players[0]);
  recordHistory(G);
  pushLog(G, `第 1 回合 · ${FACTIONS[G.players[0]].name} 行动`);
  return G;
}

export const isHuman = (G, p) => G.humans.includes(p);

// ── 中立守军 ──────────────────────────────────────────────
// 规模越大的中立城越难啃：村镇一个杂兵，都城四个含两名精锐。
// 兵种从该城自己的产兵表里取，所以矮人城守的是矮人、森林城守的是弓手。

const NEUTRAL_COUNT = { village: 1, town: 2, city: 3, capital: 4 };
const NEUTRAL_ELITE = { village: 0, town: 1, city: 1, capital: 2 };

export function neutralGarrison(G, city) {
  const n = NEUTRAL_COUNT[city.size] ?? 1;
  const elite = NEUTRAL_ELITE[city.size] ?? 0;
  const pool = (city.produces.length ? city.produces : ['edain_militia'])
    .slice().sort((a, b) => UNITS[a].str - UNITS[b].str);
  const weakest = pool[0], strongest = pool[pool.length - 1];
  const units = [];
  for (let i = 0; i < elite; i++) units.push(makeUnit(G, strongest));
  for (let i = elite; i < n; i++) units.push(makeUnit(G, weakest));
  return units;
}

// ── 统计历史（曲线图数据源）──────────────────────────────

export function recordHistory(G) {
  const row = { turn: G.turn, by: {} };
  for (const p of G.players) {
    row.by[p] = {
      gold: G.gold[p],
      cities: citiesOf(G, p).length,
      units: armiesOf(G, p).reduce((n, a) => n + a.units.length, 0),
      income: incomeOf(G, p),
      upkeep: upkeepOfPlayer(G, p),
    };
  }
  const last = G.history[G.history.length - 1];
  if (last && last.turn === G.turn) G.history[G.history.length - 1] = row;
  else G.history.push(row);
}

// ── 撤回 ──────────────────────────────────────────────────
// 只对「移动」可撤回。战斗与遗迹探索会消耗随机数并揭示信息，
// 一旦发生就清空撤回栈 —— 否则就成了读档大法。

export function snapshot(G) {
  return {
    armies: structuredClone(G.armies),
    cities: structuredClone(G.cities),
    heroes: structuredClone(G.heroes),
    dropped: structuredClone(G.dropped || []),
    gold: { ...G.gold },
    logLen: G.log.length,
    nextArmyId: G.nextArmyId,
    rngSeed: G.rng.seed,
    features: G.map.def.features.map((f) => ({
      explored: !!f.explored, usedBy: (f.usedBy || []).slice(), guardian: f.guardian || null,
    })),
    cityMemory: structuredClone(G.cityMemory),
  };
}

export function restoreSnapshot(G, s) {
  G.armies = s.armies;
  G.cities = s.cities;
  G.heroes = s.heroes;
  G.dropped = s.dropped;
  G.gold = { ...s.gold };
  G.log.length = s.logLen;
  G.nextArmyId = s.nextArmyId;
  G.rng.seed = s.rngSeed;
  s.features.forEach((f, i) => {
    const t = G.map.def.features[i];
    if (!t) return;
    t.explored = f.explored; t.usedBy = f.usedBy; t.guardian = f.guardian;
  });
  G.cityMemory = s.cityMemory;
  // 已探索区域是单调的，撤回不必抹掉（看过就是看过）；但视野要按还原后的位置重算
  for (const p of G.players) refreshFog(G, p);
}

export function pushUndo(G) {
  G.undo.push(snapshot(G));
  if (G.undo.length > 40) G.undo.shift();
}
export const canUndo = (G) => G.undo.length > 0;
export function undoMove(G) {
  const s = G.undo.pop();
  if (!s) return false;
  restoreSnapshot(G, s);
  return true;
}
export function clearUndo(G) { G.undo.length = 0; }

// ── 基础查询 ──────────────────────────────────────────────

export const current = (G) => G.players[G.currentIdx];
export const armyAt = (G, x, y) => G.armies.find((a) => a.x === x && a.y === y) || null;
export const cityById = (G, id) => G.cities.find((c) => c.id === id) || null;
export const cityAt = (G, x, y) => { const id = cityIdAt(G.map, x, y); return id ? cityById(G, id) : null; };
export const armiesOf = (G, p) => G.armies.filter((a) => a.owner === p);
export const citiesOf = (G, p) => G.cities.filter((c) => c.owner === p);

/** 城市占 2×2，这是它的四格 */
export const cityTiles = (c) => [
  { x: c.x, y: c.y }, { x: c.x + 1, y: c.y },
  { x: c.x, y: c.y + 1 }, { x: c.x + 1, y: c.y + 1 },
];

/** 驻军的停放点：城池右下角，这样不会盖住城市立绘 */
export const cityAnchor = (c) => ({ x: c.x + 1, y: c.y + 1 });

/** 城内驻军（对 attacker 而言的守军）。城占四格，守军可能在其中任意一格。 */
export function defenderIn(G, city, attackerOwner) {
  for (const t of cityTiles(city)) {
    const a = armyAt(G, t.x, t.y);
    if (a && a.owner !== attackerOwner) return a;
  }
  return null;
}

/**
 * 进攻某格时真正要打的守军。
 * 目标是城市时按整座城的四格判定 —— 守军默认停在右下角，
 * 若只看被点的那一格，从空着的城格进去就能绕过驻军白拿一座城。
 * 战前预估与实战必须共用这个判定，否则两边会给出不一致的结果。
 */
export function resolveDefender(G, attackerOwner, tx, ty) {
  const city = cityAt(G, tx, ty);
  if (city) return defenderIn(G, city, attackerOwner);
  const a = armyAt(G, tx, ty);
  return a && a.owner !== attackerOwner ? a : null;
}

/** 城内自己人的驻军 */
export const garrisonOf = (G, city) => {
  for (const t of cityTiles(city)) {
    const a = armyAt(G, t.x, t.y);
    if (a && a.owner === city.owner) return a;
  }
  return null;
};

export function stackBudget(G, army) {
  return army.units.reduce((m, u) => Math.min(m, u.mp), Infinity);
}

export function pushLog(G, text, kind = 'info') {
  G.log.push({ turn: G.turn, player: current(G), text, kind });
  if (G.log.length > 400) G.log.shift();
}

// ── 军团 ──────────────────────────────────────────────────

export function placeArmy(G, x, y, owner, units) {
  for (const u of units) if (u.mp == null) u.mp = unitMp(G, u);
  const existing = armyAt(G, x, y);
  if (existing && existing.owner === owner) {
    for (const u of units) if (existing.units.length < MAX_STACK) existing.units.push(u);
    return existing;
  }
  const army = { id: G.nextArmyId++, x, y, owner, units };
  G.armies.push(army);
  return army;
}

export function mergeArmies(G, target, source) {
  while (source.units.length && target.units.length < MAX_STACK) target.units.push(source.units.shift());
  if (!source.units.length) removeArmy(G, source);
}

export function removeArmy(G, army) {
  const i = G.armies.indexOf(army);
  if (i >= 0) G.armies.splice(i, 1);
}

export function refreshMp(G, player) {
  for (const a of armiesOf(G, player)) for (const u of a.units) u.mp = unitMp(G, u);
}

/** 该格能否被本方军团进入（不含发起战斗的情况） */
export function blockedFor(G, owner) {
  return (x, y) => {
    if (isLocked(G, x, y)) return true;   // 本场战役的封锁区
    const other = armyAt(G, x, y);
    if (other && other.owner !== owner) return true;
    if (other && other.owner === owner && other.units.length >= MAX_STACK) return true;
    const c = cityAt(G, x, y);
    if (c && c.owner !== owner) return true;
    return false;
  };
}

export function reachFor(G, army, units) {
  const probe = units && units.length !== army.units.length
    ? { x: army.x, y: army.y, owner: army.owner, units }
    : army;
  const budget = stackBudget(G, probe);
  if (!isFinite(budget) || budget <= 0) return new Map();
  return computeReach(G.map, probe, budget, blockedFor(G, army.owner));
}

/** 跨回合的完整路线（AI 用；会绕开河流山脉去找渡口与隘口） */
export function routeFor(G, army, tx, ty) {
  return routePath(G.map, army, tx, ty, blockedFor(G, army.owner));
}

/**
 * 把选中的单位从军团里分出来单独行动（原作的分队方式）。
 * 全选时直接返回原军团。分出的临时军团若原地未动会自动并回。
 */
export function detach(G, army, pickedUids) {
  if (!pickedUids || pickedUids.size >= army.units.length) return army;
  const movers = army.units.filter((u) => pickedUids.has(u.uid));
  if (!movers.length) return null;
  army.units = army.units.filter((u) => !pickedUids.has(u.uid));
  const sub = { id: G.nextArmyId++, x: army.x, y: army.y, owner: army.owner, units: movers, _parent: army.id };
  G.armies.push(sub);
  return sub;
}

/** 分队后若原地未动，并回母军团，避免同格出现两支军团 */
export function reattachIfIdle(G, sub) {
  if (!sub || !sub._parent) return;
  const parent = G.armies.find((a) => a.id === sub._parent);
  if (!parent || !G.armies.includes(sub)) return;
  if (parent.x === sub.x && parent.y === sub.y) {
    while (sub.units.length && parent.units.length < MAX_STACK) parent.units.push(sub.units.shift());
    if (!sub.units.length) removeArmy(G, sub);
  } else {
    delete sub._parent;
  }
}

/** 沿路径移动，返回实际抵达的格 */
export function moveAlong(G, army, path) {
  const owner = army.owner;
  for (const step of path) {
    const budget = stackBudget(G, army);
    if (budget <= 0) break;
    const terr = terrainAt(G.map, step.x, step.y);
    let cost = 0;
    for (const u of army.units) {
      const c = unitStepCost(G, u, terr);
      if (c === Infinity) return { x: army.x, y: army.y };
      cost = Math.max(cost, c);
    }
    for (const u of army.units) u.mp = Math.max(0, u.mp - cost);
    army.x = step.x; army.y = step.y;

    const other = armyAt(G, step.x, step.y);
    if (other && other !== army && other.owner === army.owner) { mergeArmies(G, other, army); return { x: step.x, y: step.y, merged: other }; }
    // 进城即占领 —— 但城里还有守军时不算，必须先把守军打掉
    const c = cityAt(G, step.x, step.y);
    if (c && c.owner !== army.owner && !defenderIn(G, c, army.owner)) captureCity(G, c, army.owner);
    refreshFog(G, owner);   // 每走一格都揭开新视野
  }
  return { x: army.x, y: army.y };
}

// 英雄的通行规则由 map.js 的 HERO_CHASSIS 兜底（标准陆行）
function unitStepCost(G, u, terr) {
  return moveCost(u.type, terr);
}

// ── 城市 ──────────────────────────────────────────────────

export function setProduction(G, city, type) {
  if (!city.produces.includes(type)) return false;
  city.building = { type, turnsLeft: UNITS[type].build };
  return true;
}

export function setVector(G, city, targetCityId) {
  city.vectorTo = targetCityId;
}

export function captureCity(G, city, owner) {
  const from = city.owner;
  city.owner = owner;
  city.building = null;
  city.vectorTo = null;
  pushLog(G, `${FACTIONS[owner].name} 占领了 ${city.name}` + (from ? `（原属 ${FACTIONS[from].name}）` : '（原为中立）'), 'capture');
  if (city.produces.length) setProduction(G, city, city.produces[0]);
  checkVictory(G);
}

export function razeCity(G, city) {
  city.razed = true;
  city.income = 0;
  city.defense = 0;
  city.building = null;
  city.produces = [];
  pushLog(G, `${city.name} 被夷平`, 'raze');
}

// ── 战斗 ──────────────────────────────────────────────────

export function battleEnv(G, tx, ty) {
  return {
    terr: terrainAt(G.map, tx, ty),
    city: cityAt(G, tx, ty),
    attOrder: G.settings.attOrder,
    defOrder: G.settings.defOrder,
  };
}

export function attack(G, army, tx, ty) {
  clearUndo(G);   // 战斗已掷骰，不可回溯
  const city = cityAt(G, tx, ty);
  const defender = resolveDefender(G, army.owner, tx, ty);
  const env = battleEnv(G, defender ? defender.x : tx, defender ? defender.y : ty);

  // 真正的空城才直接占领
  if (!defender) {
    if (city && city.owner !== army.owner) {
      moveAlong(G, army, [{ x: tx, y: ty }]);
      return { empty: true };
    }
    return null;
  }

  const result = resolveBattle(G, army.units, defender.units, env, G.rng);

  const dead = [...result.attLost, ...result.defLost];
  for (const u of dead) dropHeroItems(G, u, tx, ty, result);

  army.units = result.attSurvivors;
  defender.units = result.defSurvivors;

  // 幸存者耐久全恢复
  for (const u of [...army.units, ...defender.units]) u.hp = unitMaxHp(G, u);

  const defOwner = defender.owner;
  if (!defender.units.length) removeArmy(G, defender);
  if (!army.units.length) removeArmy(G, army);

  pushLog(G,
    `${FACTIONS[army.owner].name} 进攻 ${city ? city.name : `(${tx},${ty})`}：` +
    (result.winner === 'att'
      ? `胜，歼敌 ${result.defLost.length}，自损 ${result.attLost.length}`
      : `败，自损 ${result.attLost.length}，敌损 ${result.defLost.length}`),
    result.winner === 'att' ? 'win' : 'lose');

  if (result.winner === 'att' && army.units.length) {
    const canCapture = army.units.some((u) => isHero(u) || !(UNITS[u.type].flags || []).includes('noCapture'));
    if (city && city.owner !== army.owner && canCapture) {
      moveAlong(G, army, [{ x: tx, y: ty }]);
    } else if (!city) {
      moveAlong(G, army, [{ x: tx, y: ty }]);
    }
  }

  // 战史（HD 版被称赞的报表之一）：留最近 60 场
  G.battles.push({
    turn: G.turn,
    attacker: army.owner, defender: defOwner,
    place: city ? city.name : `(${tx},${ty})`,
    winner: result.winner,
    attLost: result.attLost.length, defLost: result.defLost.length,
    rounds: result.rounds,
    duels: result.log.map((d) => ({ att: d.att, def: d.def, aMS: d.aMS, dMS: d.dMS, result: d.result })),
  });
  if (G.battles.length > 60) G.battles.shift();

  refreshFog(G, army.owner);
  refreshFog(G, defOwner);
  checkElimination(G, defOwner);
  return result;
}

function dropHeroItems(G, u, x, y, result) {
  if (!isHero(u)) return;
  const h = G.heroes[u.heroId];
  if (!h) return;
  h.alive = false;
  if (h.items && h.items.length) {
    G.dropped = G.dropped || [];
    G.dropped.push({ x, y, items: h.items.slice() });
    pushLog(G, `${h.name} 阵亡，${h.items.map((i) => ITEMS[i].name).join('、')} 遗落在战场上`, 'hero');
    h.items = [];
  } else {
    pushLog(G, `${h.name} 阵亡`, 'hero');
  }
}

// ── 英雄 ──────────────────────────────────────────────────

export function spawnHero(G, entry, faction) {
  const capital = G.cities.find((c) => c.owner === faction && c.size === 'capital')
    || G.cities.find((c) => c.owner === faction);
  const hero = {
    id: entry.id, name: entry.name, faction, str: entry.str, mp: entry.mp,
    items: [], alive: true, fear: !!entry.fear, dread: entry.dread || 0, tags: entry.tags,
  };
  G.heroes[hero.id] = hero;
  if (capital) {
    const hu = makeHeroUnit(hero.id, G);
    hu.mp = hero.mp;
    const at = cityAnchor(capital);
    placeArmy(G, at.x, at.y, faction, [hu]);
  }
  return hero;
}

export function rollHeroOffer(G, player) {
  if (G.offer) return null;
  const roster = HERO_ROSTER[player] || [];
  let idx = G.rosterIdx[player] || 0;
  while (idx < roster.length && (G.heroes[roster[idx].id] || roster[idx].role === 'lord')) idx++;
  if (idx >= roster.length) return null;
  if (!G.rng.chance(1 / 6)) { G.rosterIdx[player] = idx; return null; }
  const entry = roster[idx];
  G.rosterIdx[player] = idx;
  G.offer = { player, entry, cost: hireCost(entry.str) };
  return G.offer;
}

export function acceptOffer(G) {
  const o = G.offer;
  if (!o) return false;
  if (G.gold[o.player] < o.cost) return false;
  G.gold[o.player] -= o.cost;
  spawnHero(G, o.entry, o.player);
  pushLog(G, `${o.entry.name} 加入了 ${FACTIONS[o.player].name}（酬金 ${o.cost}）`, 'hero');
  G.rosterIdx[o.player]++;
  G.offer = null;
  return true;
}

export function declineOffer(G) {
  const o = G.offer;
  if (!o) return;
  // 拒绝后回到名录末尾，不永久消失
  const roster = HERO_ROSTER[o.player];
  const i = roster.indexOf(o.entry);
  if (i >= 0) { roster.splice(i, 1); roster.push(o.entry); }
  pushLog(G, `${FACTIONS[o.player].name} 婉拒了 ${o.entry.name}`, 'hero');
  G.offer = null;
}

// ── 地物 ──────────────────────────────────────────────────

export function canExplore(G, army) {
  const f = featureAt(G.map, army.x, army.y);
  if (!f) return null;
  if (f.type === 'ruin' && f.explored) return null;
  if (f.type !== 'ruin' && (f.usedBy || []).includes(army.owner)) return null;
  const hasHero = army.units.some(isHero);
  if (!hasHero) return null;
  return f;
}

export function exploreFeature(G, army) {
  const f = canExplore(G, army);
  if (!f) return null;
  clearUndo(G);   // 遗迹结果已揭晓，不可回溯

  if (f.type === 'temple') {
    f.usedBy = f.usedBy || [];
    f.usedBy.push(army.owner);
    let n = 0;
    for (const u of army.units) if (!u.blessed) { u.blessed = true; n++; }
    pushLog(G, `${f.name}：${n} 个单位获得祝福（永久 +1）`, 'feature');
    return { type: 'temple', blessed: n };
  }

  if (f.type === 'sage') {
    f.usedBy = f.usedBy || [];
    f.usedBy.push(army.owner);
    const gold = 60 + G.rng.int(80);
    G.gold[army.owner] += gold;
    pushLog(G, `${f.name}：先知赠金 ${gold}`, 'feature');
    return { type: 'sage', gold };
  }

  // 遗迹：先打守护者
  const guardType = f.guardian || (f.guardian = G.rng.pick(RUIN_GUARDIANS));
  const guard = [makeUnit(G, guardType)];
  const env = { terr: terrainAt(G.map, army.x, army.y), city: null, attOrder: G.settings.attOrder, defOrder: 'asc' };
  const res = resolveBattle(G, army.units, guard, env, G.rng);
  for (const u of res.attLost) dropHeroItems(G, u, army.x, army.y, res);
  army.units = res.attSurvivors;
  for (const u of army.units) u.hp = unitMaxHp(G, u);
  if (!army.units.length) removeArmy(G, army);

  if (res.winner !== 'att') {
    pushLog(G, `${f.name}：守护者（${UNITS[guardType].name}）击退了来犯者`, 'feature');
    return { type: 'ruin', win: false, guardian: guardType, battle: res };
  }

  f.explored = true;
  const reward = G.rng.weighted(RUIN_REWARDS);
  const out = { type: 'ruin', win: true, guardian: guardType, reward, battle: res };

  if (reward === 'gold') {
    const gold = 80 + G.rng.int(180);
    G.gold[army.owner] += gold;
    out.gold = gold;
    pushLog(G, `${f.name}：斩杀 ${UNITS[guardType].name}，得金 ${gold}`, 'feature');
  } else if (reward === 'item') {
    const owned = new Set(Object.values(G.heroes).flatMap((h) => h.items || []));
    const pool = RUIN_ITEM_POOL.filter((i) => !owned.has(i));
    if (!pool.length) { G.gold[army.owner] += 150; out.reward = 'gold'; out.gold = 150; }
    else {
      const item = G.rng.pick(pool);
      const heroUnit = army.units.find(isHero);
      G.heroes[heroUnit.heroId].items.push(item);
      out.item = item;
      pushLog(G, `${f.name}：${G.heroes[heroUnit.heroId].name} 取得 ${ITEMS[item].name}`, 'feature');
    }
  } else if (reward === 'ally') {
    const ally = G.rng.pick(RUIN_ALLIES);
    if (army.units.length < MAX_STACK) {
      const u = makeUnit(G, ally); u.mp = 0;
      army.units.push(u);
      out.ally = ally;
      pushLog(G, `${f.name}：${UNITS[ally].name} 加入麾下`, 'feature');
    } else { G.gold[army.owner] += 150; out.reward = 'gold'; out.gold = 150; }
  } else if (reward === 'might') {
    const heroUnit = army.units.find(isHero);
    const h = G.heroes[heroUnit.heroId];
    if (h.str < 9) h.str++;
    heroUnit.maxHp = heroHp(h.str) + itemSum(G, h, 'hp');
    heroUnit.hp = heroUnit.maxHp;
    out.might = h.str;
    pushLog(G, `${f.name}：${h.name} 的力量增至 ${h.str}`, 'feature');
  } else {
    out.intel = true;
    pushLog(G, `${f.name}：得到一份地图情报`, 'feature');
  }
  return out;
}

export function pickUpDrops(G, army) {
  if (!G.dropped) return null;
  const i = G.dropped.findIndex((d) => d.x === army.x && d.y === army.y);
  if (i < 0) return null;
  const heroUnit = army.units.find(isHero);
  if (!heroUnit) return null;
  const drop = G.dropped.splice(i, 1)[0];
  G.heroes[heroUnit.heroId].items.push(...drop.items);
  pushLog(G, `${G.heroes[heroUnit.heroId].name} 拾起了 ${drop.items.map((x) => ITEMS[x].name).join('、')}`, 'hero');
  return drop;
}

// ── 回合推进 ──────────────────────────────────────────────

export function incomeOf(G, p) {
  let n = 0;
  for (const c of citiesOf(G, p)) n += c.razed ? 0 : c.income;
  for (const h of Object.values(G.heroes)) if (h.alive && h.faction === p) n += itemSum(G, h, 'income');
  return n;
}

export function upkeepOfPlayer(G, p) {
  let n = 0;
  for (const a of armiesOf(G, p)) for (const u of a.units) n += unitUpkeep(G, u);
  return n;
}

function settle(G, p) {
  const inc = incomeOf(G, p);
  const up = upkeepOfPlayer(G, p);
  G.gold[p] += inc - up;

  // 破产：从维护费最高者开始解散，直到收支平衡
  const disbanded = [];
  while (G.gold[p] < 0) {
    let worst = null, worstArmy = null, worstCost = -1;
    for (const a of armiesOf(G, p)) for (const u of a.units) {
      if (isHero(u)) continue;
      const c = unitUpkeep(G, u);
      if (c > worstCost) { worstCost = c; worst = u; worstArmy = a; }
    }
    if (!worst) { G.gold[p] = 0; break; }
    worstArmy.units.splice(worstArmy.units.indexOf(worst), 1);
    if (!worstArmy.units.length) removeArmy(G, worstArmy);
    G.gold[p] += worstCost;
    disbanded.push(UNITS[worst.type].name);
  }
  if (disbanded.length) pushLog(G, `金库告罄，解散了 ${disbanded.join('、')}`, 'warn');
  return { inc, up, disbanded };
}

function tickProduction(G, p) {
  const done = [];
  // 在途投送
  for (const pend of G.pending.filter((x) => x.owner === p)) {
    pend.turnsLeft--;
    if (pend.turnsLeft <= 0) {
      const c = cityById(G, pend.target);
      if (c && c.owner === p) {
        const u = makeUnit(G, pend.type); u.mp = 0;
        const at = cityAnchor(c);
        placeArmy(G, at.x, at.y, p, [u]);
        done.push(`${UNITS[pend.type].name} 抵达 ${c.name}`);
      }
      G.pending.splice(G.pending.indexOf(pend), 1);
    }
  }
  for (const c of citiesOf(G, p)) {
    if (!c.building || c.razed) continue;
    c.building.turnsLeft--;
    if (c.building.turnsLeft > 0) continue;
    const type = c.building.type;
    const target = c.vectorTo && cityById(G, c.vectorTo);
    if (target && target.owner === p && target.id !== c.id) {
      G.pending.push({ owner: p, type, target: target.id, turnsLeft: VECTOR_DELAY, from: c.id });
      done.push(`${c.name} 产出 ${UNITS[type].name} → 投送 ${target.name}`);
    } else {
      const at = cityAnchor(c);
      const here = armyAt(G, at.x, at.y);
      if (here && here.owner === p && here.units.length >= MAX_STACK) {
        done.push(`${c.name} 的 ${UNITS[type].name} 无处可放（该格已满）`);
        c.building.turnsLeft = 1; // 下回合重试
        continue;
      }
      const u = makeUnit(G, type); u.mp = 0;
      placeArmy(G, at.x, at.y, p, [u]);
      done.push(`${c.name} 产出 ${UNITS[type].name}`);
    }
    setProduction(G, c, type); // 继续生产同一种
  }
  return done;
}

export function endTurn(G) {
  if (G.winner) return;
  G.offer = null;
  clearUndo(G);
  G.currentIdx++;
  if (G.currentIdx >= G.players.length) { G.currentIdx = 0; G.turn++; }
  const p = current(G);

  if (!citiesOf(G, p).length && !armiesOf(G, p).length) { endTurn(G); return; }

  const money = settle(G, p);
  const prod = tickProduction(G, p);
  refreshMp(G, p);
  refreshFog(G, p);
  rollHeroOffer(G, p);

  pushLog(G, `第 ${G.turn} 回合 · ${FACTIONS[p].name} 行动（收入 ${money.inc}，维护 ${money.up}）`, 'turn');
  for (const d of prod) pushLog(G, d, 'prod');
  recordHistory(G);

  // 场景脚本与场景胜负条件
  if (G.scenario) {
    const r = tickScenario(G, G.scenario, pushLog);
    if (r && !G.winner) {
      G.winner = r.winner;
      pushLog(G, `${FACTIONS[r.winner].name} 达成「${r.reason}」，取得胜利！`, 'victory');
      return;
    }
    if (G.turnLimit && G.turn > G.turnLimit && !G.winner) {
      // 到点未分胜负：城市多者胜
      let best = G.players[0], bestN = -1;
      for (const p of G.players) {
        const n = citiesOf(G, p).length;
        if (n > bestN) { bestN = n; best = p; }
      }
      G.winner = best;
      pushLog(G, `第 ${G.turnLimit} 回合已过，${FACTIONS[best].name} 以 ${bestN} 座城市胜出。`, 'victory');
      return;
    }
  }
  checkVictory(G);
}

function checkElimination(G, p) {
  if (!G.players.includes(p)) return;
  if (citiesOf(G, p).length || armiesOf(G, p).length) return;
  pushLog(G, `${FACTIONS[p].name} 已被消灭`, 'elim');
  checkVictory(G);
}

export function checkVictory(G) {
  if (G.winner) return G.winner;
  // 有自定胜负条件的战役不套用默认的 2/3 规则
  if (G.scenario && G.scenario.victory && G.scenario.id !== 'free') {
    const alive0 = G.players.filter((p) => citiesOf(G, p).length || armiesOf(G, p).length);
    if (alive0.length === 1) {
      G.winner = alive0[0];
      pushLog(G, `${FACTIONS[alive0[0]].name} 是最后的幸存者，取得胜利！`, 'victory');
      return G.winner;
    }
    return null;
  }
  const total = G.cities.length;
  for (const p of G.players) {
    if (citiesOf(G, p).length / total >= 2 / 3) {
      G.winner = p;
      pushLog(G, `${FACTIONS[p].name} 控制了全图三分之二的城市，取得胜利！`, 'victory');
      return p;
    }
  }
  const alive = G.players.filter((p) => citiesOf(G, p).length || armiesOf(G, p).length);
  if (alive.length === 1) {
    G.winner = alive[0];
    pushLog(G, `${FACTIONS[alive[0]].name} 是最后的幸存者，取得胜利！`, 'victory');
    return alive[0];
  }
  return null;
}

export { MAX_STACK };
