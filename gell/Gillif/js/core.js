// 内核的底层操作：舰船增减、易主、控制度、星路增删、足迹。
// sim（推进）、abilities（能力）、ai 都通过这里改局面，保证统计与总数始终一致。

import { RULES, ANOMALY_FX } from './rules.js';

export const anomalyFx = (s) => (s.anomaly ? ANOMALY_FX[s.anomaly] : null);

/** 足迹：f 到过这颗星（迷雾里显示异常与航线），以及最近一次在场的时刻 */
export function markPresence(G, s, f) {
  s.presence[f] = G.time;
  s.visited[f] = true;
}

/** f 「刚到过」这颗星：拥有、有船在场，或离开不到 1 秒（能力的目标判定用） */
export function recentlyVisited(G, f, s) {
  return s.owner === f || s.ships[f] > 0 || G.time - s.presence[f] <= RULES.lingerSec;
}

/** f 此刻在这颗星上：拥有或有船 */
export const present = (s, f) => s.owner === f || s.ships[f] > 0;

/** 此星上有几方在场（星主算一方，哪怕一艘船都没有） */
export function factionsPresent(s) {
  let n = s.owner >= 0 ? 1 : 0;
  for (let f = 0; f < s.ships.length; f++) if (f !== s.owner && s.ships[f] > 0) n++;
  return n;
}

export function isAtPeace(G, s) {
  return factionsPresent(s) < 2 && G.time - s.lastFight > RULES.peaceGrace;
}

/** 此星当前占优的一方：船最多者，平手时星主优先，其次编号小者；全空且无主则 -1 */
export function dominant(s) {
  let dom = s.owner, n = s.owner >= 0 ? s.ships[s.owner] : 0;
  for (let f = 0; f < s.ships.length; f++) {
    if (f !== s.owner && s.ships[f] > n) { dom = f; n = s.ships[f]; }
  }
  return dom;
}

/** 次大的一方：占优者不是星主时，星主（哪怕没船）垫底；没有则 -1 */
export function secondary(s, dom) {
  let sec = dom !== s.owner && s.owner >= 0 ? s.owner : -1;
  let n = sec >= 0 ? s.ships[sec] : 0;
  for (let f = 0; f < s.ships.length; f++) {
    if (f !== dom && s.ships[f] > n) { sec = f; n = s.ships[f]; }
  }
  return sec;
}

/** 这颗星的造船上限（等离子星只有 25） */
export function starCap(s) {
  const a = anomalyFx(s);
  return a && a.fleetCap ? Math.min(RULES.starCap, a.fleetCap) : RULES.starCap;
}

/** 造船：受单星上限与势力总上限约束；返回实际造出的数量 */
export function createShips(G, s, f, n) {
  const fac = G.factions[f];
  n = Math.min(n, starCap(s) - s.ships[f], G.cap - fac.total);
  return n > 0 ? addShips(G, s, f, n) : 0;
}

/** 凭空增加舰船、不受任何上限（征兵、策反） */
export function addShips(G, s, f, n) {
  if (n <= 0) return 0;
  s.ships[f] += n;
  const fac = G.factions[f];
  fac.total += n;
  fac.stats.created += n;
  if (s.ships[f] > 0) markPresence(G, s, f);
  return n;
}

export function destroyShips(G, s, f, n) {
  n = Math.min(n, s.ships[f]);
  if (n <= 0) return 0;
  s.ships[f] -= n;
  const fac = G.factions[f];
  fac.total -= n;
  fac.stats.lost += n;
  return n;
}

export function increaseControl(G, s, f, g) {
  if (s.control[f] >= 100) return;
  s.control[f] = Math.min(100, s.control[f] + g);
  for (let h = 0; h < s.control.length; h++) {
    if (h === f || s.control[h] <= 0) continue;
    s.control[h] = Math.max(0, s.control[h] - g);
    if (h === s.owner && s.control[h] < RULES.loseBelow) setOwner(G, s, s.control[f] === 100 ? f : -1);
  }
  if (s.owner < 0 && s.control[f] === 100) setOwner(G, s, f);
}

export function setOwner(G, s, f) {
  const old = s.owner;
  if (old === f) return;
  s.owner = f;
  s.order = -1;
  s.sendAcc = 0;
  if (old >= 0) G.factions[old].stats.starsLost++;
  if (f >= 0) { G.factions[f].stats.captured++; markPresence(G, s, f); }
  G.events.push({ t: f >= 0 ? 'capture' : 'neutral', star: s.id, f, from: old });
}

// ——— 星路 ———

/** a、b 之间的星路对象（没有则 null） */
export function routeBetween(G, a, b) {
  for (const r of G.routes) if ((r.a === a && r.b === b) || (r.a === b && r.b === a)) return r;
  return null;
}

export function addRoute(G, a, b) {
  if (a === b || routeBetween(G, a, b)) return null;
  const r = { a, b, w: 0 };
  G.routes.push(r);
  G.stars[a].links.push(b);
  G.stars[b].links.push(a);
  return r;
}

/** 删星路：两端沿它的外发清零；已经在路上的舰船照常到港 */
export function removeRoute(G, a, b) {
  const i = G.routes.findIndex((r) => (r.a === a && r.b === b) || (r.a === b && r.b === a));
  if (i < 0) return false;
  G.routes.splice(i, 1);
  for (const [u, v] of [[a, b], [b, a]]) {
    const s = G.stars[u];
    s.links = s.links.filter((x) => x !== v);
    if (s.order === v) { s.order = -1; s.sendAcc = 0; }
  }
  return true;
}
