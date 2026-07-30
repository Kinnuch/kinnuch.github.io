// EPT · 玩家状态、经济与商店
import { UNITS, UNITS_BY_ID, POOL_SIZE, SHOP_ODDS, XP_TO_LEVEL } from '../../data/units.js';

let UID = 1;
export function resetUid() { UID = 1; } // 联机：各端从相同计数开始，保证 uid 一致

export function makePool() {
  const pool = {};
  for (const u of UNITS) pool[u.id] = POOL_SIZE[u.cost];
  return pool;
}

export function makePlayer(i, name, isAI, aiStyle) {
  return {
    i, name, isAI, aiStyle: aiStyle || 'balanced',
    hp: 100, gold: 0, xp: 0, level: 2,
    bench: Array(9).fill(null), board: [],      // board: [{unit, c, r}]
    items: [],                                   // 物品栏（散件/成装）
    shop: [null, null, null, null, null], shopLocked: false,
    streakW: 0, streakL: 0, pvpWins: 0, lastOpp: -1,
    alive: true, lastResult: null, dwarfGranted: 0,
  };
}

export function makeUnit(defId) {
  return { uid: UID++, def: UNITS_BY_ID[defId], star: 1, items: [], progress: {}, };
}

export function fieldedUnits(p) { return p.board.map(b => b.unit); }
export function allUnits(p) { return [...p.bench.filter(Boolean), ...fieldedUnits(p)]; }
export function benchSpace(p) { return p.bench.findIndex(x => x === null); }

export function rollShop(game, p) {
  // 归还未买的卡
  for (const s of p.shop) if (s) game.pool[s] = (game.pool[s] || 0) + 1;
  const odds = SHOP_ODDS[p.level];
  for (let i = 0; i < 5; i++) {
    p.shop[i] = null;
    const r = game.rng.next() * 100;
    let acc = 0, cost = 1;
    for (let c = 0; c < 5; c++) { acc += odds[c]; if (r < acc) { cost = c + 1; break; } }
    // 按剩余张数加权抽取该费用的棋子
    let cands = UNITS.filter(u => u.cost === cost && game.pool[u.id] > 0);
    if (!cands.length) cands = UNITS.filter(u => game.pool[u.id] > 0);
    if (!cands.length) continue;
    const total = cands.reduce((s, u) => s + game.pool[u.id], 0);
    let pick = game.rng.next() * total;
    for (const u of cands) { pick -= game.pool[u.id]; if (pick <= 0) { p.shop[i] = u.id; game.pool[u.id]--; break; } }
    if (!p.shop[i]) { p.shop[i] = cands[0].id; game.pool[cands[0].id]--; }
  }
}

export function reroll(game, p) {
  if (p.gold < 2) return false;
  p.gold -= 2; rollShop(game, p); return true;
}

export function buyXp(game, p) {
  if (p.gold < 4 || p.level >= 10) return false;
  p.gold -= 4; addXp(game, p, 4); return true;
}

export function addXp(game, p, n) {
  if (p.level >= 10) return;
  p.xp += n;
  while (p.level < 10 && p.xp >= XP_TO_LEVEL[p.level + 1]) {
    p.xp -= XP_TO_LEVEL[p.level + 1];
    p.level++;
  }
}

export function buyCard(game, p, slot) {
  const defId = p.shop[slot];
  if (!defId) return false;
  const def = UNITS_BY_ID[defId];
  if (p.gold < def.cost) return false;
  // 无位置且无法合成时拒绝
  const wouldMerge = countCopies(p, defId, 1) >= 2;
  if (benchSpace(p) < 0 && !wouldMerge) return false;
  p.gold -= def.cost;
  p.shop[slot] = null;
  const u = makeUnit(defId);
  const bs = benchSpace(p);
  if (bs >= 0) p.bench[bs] = u; else p.bench.push(u); // 临时溢出，合成后收回
  tryMerge(game, p, defId);
  if (p.bench.length > 9) p.bench = p.bench.slice(0, 9);
  return true;
}

function countCopies(p, defId, star) {
  return allUnits(p).filter(u => u.def.id === defId && u.star === star).length;
}

export function tryMerge(game, p, defId) {
  for (let star = 1; star <= 2; star++) {
    let copies = allUnits(p).filter(u => u.def.id === defId && u.star === star);
    while (copies.length >= 3) {
      // 优先保留在场的那个
      copies.sort((a, b) => (isFielded(p, b.uid) ? 1 : 0) - (isFielded(p, a.uid) ? 1 : 0));
      const keep = copies[0], remove = copies.slice(1, 3);
      keep.star = star + 1;
      if (game) (game.mergeFx = game.mergeFx || []).push(keep.uid);
      for (const rm of remove) {
        // 永久成长（人类叠层/哈烈丝/声望等）取最大值继承，不因合成丢失
        const kp = keep.progress = keep.progress || {}, rp = rm.progress || {};
        for (const k of ['mkHp', 'mkKills', 'mkAd', 'permAd', 'renown']) if (rp[k]) kp[k] = Math.max(kp[k] || 0, rp[k]);
        for (const it of rm.items) p.items.push(it);       // 装备回物品栏
        removeUnit(p, rm.uid);
      }
      copies = allUnits(p).filter(u => u.def.id === defId && u.star === star);
    }
  }
}

export function isFielded(p, uid) { return p.board.some(b => b.unit.uid === uid); }

export function removeUnit(p, uid) {
  const bi = p.bench.findIndex(u => u && u.uid === uid);
  if (bi >= 0) { p.bench[bi] = null; return; }
  p.board = p.board.filter(b => b.unit.uid !== uid);
}

export function sellUnit(game, p, uid) {
  const u = allUnits(p).find(x => x.uid === uid);
  if (!u) return false;
  const copies = Math.pow(3, u.star - 1);
  const price = u.star === 1 ? u.def.cost : u.def.cost * copies - 1;
  p.gold += price;
  game.pool[u.def.id] += copies;
  for (const it of u.items) p.items.push(it);
  removeUnit(p, uid);
  return true;
}

export function placeUnit(p, uid, c, r) {
  if (r < 4 || r > 7) return false;
  const u = allUnits(p).find(x => x.uid === uid);
  if (!u) return false;
  const occ = p.board.find(b => b.c === c && b.r === r);
  const fielded = isFielded(p, uid);
  if (!fielded && !occ && p.board.length >= p.level) return false;
  const bi = p.bench.findIndex(x => x && x.uid === uid);
  if (occ) {
    if (fielded) { // 场上互换
      const mine = p.board.find(b => b.unit.uid === uid);
      const [oc, or] = [mine.c, mine.r];
      mine.c = c; mine.r = r; occ.c = oc; occ.r = or;
      if (occ.unit.uid === uid) { /*同一个*/ }
      return true;
    }
    // 备战席 ↔ 场上互换
    p.bench[bi] = occ.unit;
    p.board = p.board.filter(b => b !== occ);
    p.board.push({ unit: u, c, r });
    return true;
  }
  if (fielded) { const mine = p.board.find(b => b.unit.uid === uid); mine.c = c; mine.r = r; return true; }
  p.bench[bi] = null;
  p.board.push({ unit: u, c, r });
  return true;
}

export function unfieldUnit(p, uid, benchIdx) {
  const b = p.board.find(x => x.unit.uid === uid);
  if (!b) return false;
  const bi = benchIdx !== undefined && !p.bench[benchIdx] ? benchIdx : benchSpace(p);
  if (bi < 0) return false;
  p.bench[bi] = b.unit;
  p.board = p.board.filter(x => x !== b);
  return true;
}

export function income(p, won) {
  let g = 5;
  g += Math.min(Math.floor(p.gold / 10), 5);
  const streak = won ? p.streakW : p.streakL;
  if (streak >= 5) g += 3; else if (streak >= 4) g += 2; else if (streak >= 2) g += 1;
  if (won) g += 1;
  p.gold += g;
  return g;
}
