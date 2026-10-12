// 建局：生成星系、放置各势力母星，得到一份可直接序列化的对局状态 G。

import { generateGalaxy, chooseHomes, GALAXY_TYPES } from './galaxy.js';
import { seedState, randInt } from './rng.js';
import { RULES, CHALLENGES, ABILITIES, PERSONALITIES, DECK_POINTS, DEFAULT_DECK } from './rules.js';
import { factionPass } from './sim.js';

// 势力配色：在深色星空上彼此分得开，色盲也大致可辨（亮度错开）
export const FACTIONS = [
  { name: '蓝', color: '#38c8ff' },
  { name: '红', color: '#ff5050' },
  { name: '绿', color: '#52e86e' },
  { name: '黄', color: '#ffd23a' },
  { name: '橙', color: '#ff8a2a' },
  { name: '紫', color: '#cf63ff' },
];

/**
 * @param {object} o
 * @param {number} o.seed
 * @param {string} [o.galaxy='large']
 * @param {number} [o.factions=4]   势力数（含玩家）
 * @param {number[]} [o.humans=[0]] 由人操控的势力；空数组 = 全 AI 观战
 * @param {string} [o.challenge='normal']
 * @param {number} [o.timeLimit=900] 时限（秒），到时星最多者胜；0 = 不限时
 * @param {boolean} [o.sandbox=false] 沙盒：不判胜负（测试与教学用）
 * @param {boolean} [o.fog=true]      战争迷雾（只影响画面；内核照常记录各方足迹）
 * @param {string[]} [o.deck]         人类玩家的能力卡组（总点数超出 DECK_POINTS 的部分丢掉）
 */
export function newGame(o = {}) {
  const seed = (o.seed >>> 0) || 1;
  const galaxy = o.galaxy || 'large';
  const T = GALAXY_TYPES[galaxy];
  const nF = Math.max(2, Math.min(T.maxFactions, o.factions || 4));
  const gal = generateGalaxy(galaxy, seed);
  const homes = chooseHomes(gal, nF, seed);
  return buildGame(gal, homes, { ...o, seed, galaxy });
}

/**
 * 按给定星图建局（newGame 用它；测试也直接用它搭小星图）。
 * gal: { stars:[{id,x,y,size,tint}], routes:[[a,b]], links:[[...]], bounds, center }
 * homes[f] = 势力 f 的母星编号
 */
export function buildGame(gal, homes, o = {}) {
  const seed = (o.seed >>> 0) || 1;
  const galaxy = o.galaxy || 'custom';
  const nF = homes.length;
  const humans = o.humans || [0];
  const challenge = CHALLENGES[o.challenge] ? o.challenge : 'normal';
  const ch = CHALLENGES[challenge];
  const rng = seedState((seed ^ 0xbb67ae85) >>> 0);

  const stars = gal.stars.map((s) => ({
    id: s.id, x: s.x, y: s.y, size: s.size, tint: s.tint,
    anomaly: s.anomaly || null,        // 异常天体：nebula / gas / plasma / asteroid / comets / vortex
    links: gal.links[s.id].slice(),
    owner: -1,
    order: -1,                         // 星主的外发目标（邻星编号），-1 = 原地防守
    ships: new Array(nF).fill(0),      // 各势力在此星的舰船
    control: new Array(nF).fill(0),    // 各势力在此星的控制度 0–100
    visited: new Array(nF).fill(false), // 各势力是否到过（拥有或有船在场）
    presence: new Array(nF).fill(-1e9), // 各势力最近一次在场的时刻（秒）
    sendAcc: 0,
    lastFight: -1e9,
    // 各周期错开相位，免得全图在同一步一齐动作
    tCtrl: randInt(rng, 1, 21), tProd: randInt(rng, 1, 21),
    tSend: randInt(rng, 1, RULES.sendEvery + 1), tFight: randInt(rng, 1, RULES.fightEvery + 1),
    tAI: randInt(rng, 1, 21),
  }));

  // AI 性格（上将及以上）：随机一种，带上它的卡组
  const persKeys = Object.keys(PERSONALITIES);
  const humanDeck = cleanDeck(o.deck ?? DEFAULT_DECK);
  const factions = Array.from({ length: nF }, (_, f) => {
    const human = humans.includes(f);
    const personality = !human && ch.personalities ? persKeys[randInt(rng, 0, persKeys.length)] : null;
    const deck = human ? humanDeck.slice() : personality ? PERSONALITIES[personality].deck.slice() : [];
    return {
      id: f,
      name: FACTIONS[f].name,
      color: FACTIONS[f].color,
      human,
      personality,
      pace: human ? 1 : ch.aiPace,
      alive: true,
      home: homes[f],
      stars: 0,
      total: 0,                          // 全部舰船（驻留 + 在途）
      deck,
      ready: Object.fromEntries(deck.map((c) => [c, ABILITIES[c].cd])),   // 开局即在冷却中
      cdTotal: Object.fromEntries(deck.map((c) => [c, ABILITIES[c].cd])),
      nextAbility: 0,
      stats: { created: 0, lost: 0, captured: 0, starsLost: 0, maxStars: 1, maxShips: RULES.homeShips },
    };
  });

  const G = {
    v: 3,
    seed, galaxy, challenge,
    timeLimit: o.timeLimit ?? RULES.timeLimit,
    sandbox: !!o.sandbox,
    fog: o.fog ?? true,
    tick: 0, time: 0,
    rng,
    stars,
    routes: gal.routes.map(([a, b]) => ({ a, b, w: 0 })),   // w：拓宽 +1 / 干扰 −1
    transit: [],                       // 在途舰船：{ f, n, from, to, t0, t1, tp? }（tp = 突击队）
    effects: [],                       // 生效中的能力：{ card, f, src, dst, until }
    factions,
    cap: stars.length * RULES.capPerStar,
    bounds: gal.bounds,
    center: gal.center,
    queue: [],                         // 待执行的指令
    log: [],                           // 已执行的指令（带步数），可整局重放
    events: [],                        // 给画面与界面的事件，由界面取走
    incoming: [], threat: [],
    nextFac: 0,
    over: false, winner: -1, endReason: '',
  };

  for (let f = 0; f < nF; f++) {
    const s = stars[homes[f]];
    s.owner = f;
    s.control[f] = 100;
    s.ships[f] = RULES.homeShips;
    s.visited[f] = true;
    s.presence[f] = 0;
    factions[f].total = RULES.homeShips;
  }
  factionPass(G);
  G.nextFac = RULES.facEvery;
  return G;
}

/** 两颗星之间的航线长度 */
export function routeLength(G, a, b) {
  const A = G.stars[a], B = G.stars[b];
  return Math.hypot(A.x - B.x, A.y - B.y);
}

/** 由人操控的第一个势力（单机里就是玩家）；没有则 -1 */
export function humanFaction(G) {
  const f = G.factions.find((x) => x.human);
  return f ? f.id : -1;
}

/**
 * 整理卡组：只留认识的、允许的卡，去重；总点数超出上限的部分从后往前丢。
 * limit 默认 12 点；allowed(card) 可再加一道筛选（成长模式的解锁规则）。
 */
export function cleanDeck(deck, limit = DECK_POINTS, allowed = null) {
  const out = [];
  let pts = 0;
  for (const c of deck || []) {
    if (!ABILITIES[c] || out.includes(c) || (allowed && !allowed(c)) || pts + ABILITIES[c].cost > limit) continue;
    out.push(c);
    pts += ABILITIES[c].cost;
  }
  return out;
}

export const deckPoints = (deck) => deck.reduce((a, c) => a + (ABILITIES[c] ? ABILITIES[c].cost : 0), 0);
