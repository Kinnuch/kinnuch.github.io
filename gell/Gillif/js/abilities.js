// 能力：目标校验与发动。数值见 rules.js 的 ABILITIES / ABILITY_FX，规则说明见 design/00 第十节。
//
// 人类玩家的指令先过 validateAbility（卡在卡组里、冷却好了、目标合法）再发动；
// AI 按自己的规则挑目标，直接调用 useAbility。

import { ABILITIES, ABILITY_FX as FX } from './rules.js';
import { randInt } from './rng.js';
import { segmentsCross, angleAt, GEN } from './galaxy.js';
import {
  recentlyVisited, present, addShips, destroyShips, increaseControl, setOwner,
  dominant, secondary, routeBetween, addRoute, removeRoute,
} from './core.js';
import { effectOn, effectAny } from './effects.js';

/** 需要选两颗星的卡：第一颗是出发点（或星路一端），第二颗是目标 */
export const TWO_STAR = new Set(['teleport', 'stabilize', 'degrade', 'remove', 'add']);
export const isTwoStar = (card) => TWO_STAR.has(card);

const adjacentToOwn = (G, f, s) => s.links.some((n) => G.stars[n].owner === f);
const hasEnemyShips = (s, f) => s.ships.some((n, g) => g !== f && n > 0);
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

/** 第一颗星（单星卡就是目标星）是否合法 */
export function validFirst(G, f, card, id) {
  const s = G.stars[id];
  if (!s || !ABILITIES[card]) return false;
  switch (ABILITIES[card].target) {
    case 'own': return s.owner === f;
    case 'enemy': return s.owner >= 0 && s.owner !== f && (adjacentToOwn(G, f, s) || recentlyVisited(G, f, s));
    case 'ownOrNeutral': return s.owner === f || (s.owner < 0 && (adjacentToOwn(G, f, s) || recentlyVisited(G, f, s)));
    case 'battle': return recentlyVisited(G, f, s) && hasEnemyShips(s, f);
    case 'visited': return recentlyVisited(G, f, s) && s.control[f] < 100;
    case 'enemyVisited': return s.owner >= 0 && s.owner !== f && recentlyVisited(G, f, s);
    case 'teleport': return s.owner === f;
    case 'route': case 'newRoute': return present(s, f);
    default: return false;
  }
}

/** 两步卡的第二颗星是否合法 */
export function validSecond(G, f, card, a, b) {
  if (a === b || !G.stars[a] || !G.stars[b]) return false;
  switch (ABILITIES[card].target) {
    case 'teleport': return true;
    case 'route': return G.stars[a].links.includes(b);
    case 'newRoute': return canCreateRoute(G, a, b);
    default: return false;
  }
}

/** 能否在 a、b 之间新开星路：不重复、长度不超过 10、不与已有星路交叉、两端与已有星路夹角都 ≥ 25° */
export function canCreateRoute(G, a, b) {
  if (a === b || routeBetween(G, a, b)) return false;
  const A = G.stars[a], B = G.stars[b];
  if (Math.hypot(A.x - B.x, A.y - B.y) > GEN.maxRoute) return false;
  const p1 = { x: A.x + (B.x - A.x) * 0.01, y: A.y + (B.y - A.y) * 0.01 };
  const p2 = { x: A.x + (B.x - A.x) * 0.99, y: A.y + (B.y - A.y) * 0.99 };
  for (const r of G.routes) if (segmentsCross(p1, p2, G.stars[r.a], G.stars[r.b])) return false;
  for (const n of A.links) if (angleAt(A, B, G.stars[n]) < GEN.minAngle) return false;
  for (const n of B.links) if (angleAt(B, A, G.stars[n]) < GEN.minAngle) return false;
  return true;
}

/** 卡在 f 的卡组里且冷却好了 */
export function cardReady(G, f, card) {
  const fac = G.factions[f];
  return !!fac && fac.deck.includes(card) && G.time >= fac.ready[card];
}

/** 校验一条人类指令（单星卡的 src 与 dst 相同） */
export function validateAbility(G, f, card, src, dst) {
  if (!ABILITIES[card] || !cardReady(G, f, card)) return false;
  if (isTwoStar(card)) return validFirst(G, f, card, src) && validSecond(G, f, card, src, dst);
  return validFirst(G, f, card, dst);
}

// ——— 持续生效的卡 ———

const ROUTE_CARD = { stabilize: 1, degrade: -1 };

function putEffect(G, card, f, src, dst, dur) {
  const i = G.effects.findIndex((e) => e.card === card && e.f === f);
  if (i >= 0) endEffect(G, i);                    // 同一种卡再次发动：覆盖上一次
  if (ROUTE_CARD[card]) {
    const r = routeBetween(G, src, dst);
    if (!r) return;
    r.w += ROUTE_CARD[card];
  }
  G.effects.push({ card, f, src, dst, until: G.time + dur });
}

function endEffect(G, i) {
  const e = G.effects[i];
  if (ROUTE_CARD[e.card]) {
    const r = routeBetween(G, e.src, e.dst);
    if (r) r.w -= ROUTE_CARD[e.card];
  }
  G.effects.splice(i, 1);
}

/** 每步开头调用：到期的效果结束（拓宽 / 干扰的星路恢复原宽） */
export function expireEffects(G) {
  for (let i = G.effects.length - 1; i >= 0; i--) if (G.effects[i].until <= G.time) endEffect(G, i);
}

// ——— 发动 ———

/** 发动一张卡（不查冷却与目标）。返回事件里报告的数量（征兵、偷袭、策反、突击队、清洗的舰船数，贿赂的控制度） */
export function useAbility(G, f, card, src, dst) {
  const def = ABILITIES[card];
  const fac = G.factions[f];
  const S = G.stars[src], T = G.stars[dst];
  const owner = T.owner;         // 发动前的星主（无政府、贿赂之后可能已经换人）
  let busy = def.dur;            // 持续期间不冷却
  let n = 0;
  switch (card) {
    case 'patriotism': case 'propaganda': case 'defense': case 'offense':
      putEffect(G, card, f, src, dst, def.dur);
      break;
    case 'stealth':
      putEffect(G, card, f, src, dst, def.dur);
      // 敌人忘掉你的领地
      for (const s of G.stars) if (s.owner === f) for (let g = 0; g < s.visited.length; g++) if (g !== f) s.visited[g] = false;
      break;
    case 'spy':
      putEffect(G, card, f, src, dst, def.dur);
      if (T.owner >= 0) for (const s of G.stars) if (s.owner === T.owner) s.visited[f] = true;
      break;
    case 'stabilize': case 'degrade':
      putEffect(G, card, f, src, dst, def.dur);
      break;
    case 'recruits': {
      const [lo, hi] = T.owner === f ? FX.recruitsOwn : T.ships[f] > 0 ? FX.recruitsHere : FX.recruitsElse;
      n = addShips(G, T, f, randInt(G.rng, lo, hi));
      break;
    }
    case 'explosion':
      for (let g = 0; g < T.ships.length; g++) {
        if (g === f || T.ships[g] <= 0) continue;
        n += destroyShips(G, T, g, Math.trunc((T.ships[g] * randInt(G.rng, FX.explosionPct[0], FX.explosionPct[1])) / 100));
      }
      break;
    case 'bribe': {
      const own = T.owner;
      let contested = own >= 0 && own !== f;
      if (!contested && own < 0) contested = T.control.some((c, g) => g !== f && c > FX.bribeContestCtrl);
      n = contested ? FX.bribeContested : FX.bribeFree;
      if (own >= 0) {
        if (effectAny(G, 'patriotism', own)) n = clamp(FX.bribeVsPatriot[1] - T.ships[own], FX.bribeVsPatriot[0], FX.bribeVsPatriot[1]);
        else if (effectOn(G, 'propaganda', f, dst)) n = clamp(FX.bribeWithPropaganda[1] - T.ships[own], FX.bribeWithPropaganda[0], FX.bribeWithPropaganda[1]);
      }
      increaseControl(G, T, f, n);
      break;
    }
    case 'anarchy': {
      const own = T.owner;
      if (own < 0) break;
      if (effectAny(G, 'patriotism', own)) { increaseControl(G, T, f, FX.anarchyVsPatriot); n = FX.anarchyVsPatriot; break; }
      for (let h = 0; h < T.control.length; h++) if (T.control[h] > 0) T.control[h] = h === own ? T.control[h] >> 1 : 0;
      setOwner(G, T, -1);
      break;
    }
    case 'teleport': {
      n = Math.min(FX.teleportMax, S.ships[f]);
      if (n > 0) {
        S.ships[f] -= n;
        const travel = Math.hypot(T.x - S.x, T.y - S.y) * FX.teleportPace;
        G.transit.push({ f, n, from: src, to: dst, t0: G.time, t1: G.time + travel, tp: true });
        busy = travel;
      }
      break;
    }
    case 'purge':
      for (const s of G.stars) {
        if (s.owner !== f) continue;
        for (let g = 0; g < s.ships.length; g++) if (g !== f) n += destroyShips(G, s, g, s.ships[g]);
      }
      break;
    case 'add':
      addRoute(G, src, dst);
      break;
    case 'remove':
      // 依附在这条星路上的拓宽 / 干扰一并结束
      for (let i = G.effects.length - 1; i >= 0; i--) {
        const e = G.effects[i];
        if (ROUTE_CARD[e.card] && ((e.src === src && e.dst === dst) || (e.src === dst && e.dst === src))) G.effects.splice(i, 1);
      }
      removeRoute(G, src, dst);
      break;
    case 'fleet': {
      const dom = dominant(T);
      if (dom < 0) break;
      const victim = dom === f ? secondary(T, dom) : dom;
      if (victim < 0 || victim === f) break;
      n = Math.min(T.owner === f ? FX.fleetAtOwn : FX.fleetElse, T.ships[victim]);
      if (n > 0) { destroyShips(G, T, victim, n); addShips(G, T, f, n); }
      break;
    }
    default:
      return 0;
  }
  fac.ready[card] = G.time + busy + def.cd;
  fac.cdTotal[card] = busy + def.cd;
  G.events.push({ t: 'ability', card, f, src, dst, n, owner });
  return n;
}
