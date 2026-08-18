// 战斗结算（设计文档 01 章第五节）
//
// MS = min(14, 基础强度 + min(5, 加成总和))
// 每交锋轮：双方各掷 d20 + MS，高者令对方失 1 耐久，平局重掷。
// 逐个单杀：最左对最左，胜者带剩余耐久继续，直到一方全灭。

import { cityDefBonus } from '../data/terrain.js';
import { ITEMS } from '../data/items.js';
import {
  isHero, heroOf, unitStr, unitFlags, unitTags, unitName, itemSum,
  stackCommand, stackItemBonus,
} from './unit.js';
import { UNITS } from '../data/units.js';
import { scratchRng } from './rng.js';

export const MS_CAP = 14;
export const BONUS_CAP = 5;

/** 一侧的静态战斗环境（与具体对手无关的那部分加成） */
export function sideContext(G, units, opts) {
  const { terr, city, isDefender, foeUnits } = opts;
  const cmd = stackCommand(G, units);
  const stackItems = stackItemBonus(G, units);

  // 恐惧：对方军团中若有恐惧源，我方全体 −1（不叠加）
  const foeFear = (foeUnits || []).some((u) => {
    const h = heroOf(G, u);
    if (h) return !!h.fear || (h.dread || 0) > 0;
    return (UNITS[u.type].flags || []).includes('fear');
  });
  // 格劳龙式的「龙之威慑」按 dread 值给更强的减值
  let dread = 0;
  for (const u of foeUnits || []) {
    const h = heroOf(G, u);
    if (h && h.dread) dread = Math.max(dread, h.dread);
  }

  return {
    terr, city, isDefender,
    command: cmd.bonus,
    stackItems,
    cityBonus: isDefender && city && !city.razed ? cityDefBonus(city.defense) : 0,
    fear: foeFear ? 1 : 0,
    dread,
  };
}

/** 与对手无关的加成 */
function baseBonus(G, u, ctx) {
  let b = 0;
  const h = heroOf(G, u);
  const flags = unitFlags(G, u);

  // 地形亲和（一律取防守方所在格）
  if (!h) {
    const def = UNITS[u.type];
    const t = def.terr || {};
    if (ctx.city && t.city) b += t.city;
    else if (t[ctx.terr.id]) b += t[ctx.terr.id];
  }

  b += ctx.command;
  b += ctx.stackItems;
  if (ctx.isDefender) b += ctx.cityBonus;
  if (u.blessed) b += 1;

  // 战力类神器（仅英雄本人）
  if (h) b += itemSum(G, h, 'battle');

  // 白昼惩罚：城市与森林之外
  if (flags.includes('sun') && !ctx.city && ctx.terr.id !== 'T') b -= 1;

  // 恐惧 / 威慑（持龙盔一类免疫）
  const immune = h && (h.items || []).some((id) => ITEMS[id] && ITEMS[id].immuneFear);
  if (!immune) {
    b -= ctx.fear;
    b -= ctx.dread;
  }
  return b;
}

/** 与具体对手相关的加成 */
function pairBonus(G, u, foe) {
  let b = 0;
  const flags = unitFlags(G, u);
  const foeTags = unitTags(G, foe);
  const h = heroOf(G, u);

  if (flags.includes('antiDragon') && foeTags.includes('dragon')) b += 3;
  if (flags.includes('antiLiving') && foeTags.includes('living')) b += 1;
  if (flags.includes('antiMounted') && foeTags.includes('mounted')) b += 1;
  if (h) {
    const anti = itemSum(G, h, 'antiDragon');
    if (anti && foeTags.includes('dragon')) b += anti;
  }
  // 攻城破坏者：对方在城中时抵消其城防加成的一半（向上取整）
  return b;
}

export function computeMS(G, u, ctx, foe) {
  const raw = baseBonus(G, u, ctx) + (foe ? pairBonus(G, u, foe) : 0);
  const capped = Math.min(BONUS_CAP, raw);
  return Math.max(1, Math.min(MS_CAP, unitStr(G, u) + capped));
}

/** 加成明细，供 UI 摊开给玩家看 */
export function msBreakdown(G, u, ctx, foe) {
  const rows = [];
  const h = heroOf(G, u);
  const flags = unitFlags(G, u);
  rows.push(['基础强度', unitStr(G, u)]);
  if (!h) {
    const t = UNITS[u.type].terr || {};
    if (ctx.city && t.city) rows.push([`城中作战`, t.city]);
    else if (t[ctx.terr.id]) rows.push([`${ctx.terr.name}亲和`, t[ctx.terr.id]]);
  }
  if (ctx.command) rows.push(['英雄统率', ctx.command]);
  if (ctx.stackItems) rows.push(['军团神器', ctx.stackItems]);
  if (ctx.isDefender && ctx.cityBonus) rows.push(['城防', ctx.cityBonus]);
  if (u.blessed) rows.push(['祭坛祝福', 1]);
  if (h) { const b = itemSum(G, h, 'battle'); if (b) rows.push(['神器', b]); }
  if (flags.includes('sun') && !ctx.city && ctx.terr.id !== 'T') rows.push(['白昼', -1]);
  if (ctx.fear) rows.push(['恐惧', -ctx.fear]);
  if (ctx.dread) rows.push(['龙之威慑', -ctx.dread]);
  if (foe) { const p = pairBonus(G, u, foe); if (p) rows.push(['克制', p]); }
  return rows;
}

const sortForBattle = (G, units, order) => {
  const arr = units.slice();
  arr.sort((a, b) => order === 'desc'
    ? unitStr(G, b) - unitStr(G, a)
    : unitStr(G, a) - unitStr(G, b));
  return arr;
};

/**
 * 结算一场战斗。会直接修改传入单位的 hp，所以模拟时请传副本。
 * 返回 { winner:'att'|'def', rounds, log, attLost, defLost }
 */
export function resolveBattle(G, attUnits, defUnits, env, rng) {
  const { terr, city, attOrder = 'asc', defOrder = 'asc' } = env;

  const attCtx = sideContext(G, attUnits, { terr, city, isDefender: false, foeUnits: defUnits });
  const defCtx = sideContext(G, defUnits, { terr, city, isDefender: true, foeUnits: attUnits });

  const att = sortForBattle(G, attUnits, attOrder);
  const def = sortForBattle(G, defUnits, defOrder);
  const log = [];
  let ai = 0, di = 0, rounds = 0;
  const attLost = [], defLost = [];

  while (ai < att.length && di < def.length) {
    const a = att[ai], d = def[di];
    const aMS = computeMS(G, a, attCtx, d);
    const dMS = computeMS(G, d, defCtx, a);
    const duel = { att: unitName(G, a), def: unitName(G, d), aMS, dMS, hits: [] };

    let guard = 0;
    while (a.hp > 0 && d.hp > 0 && guard++ < 200) {
      const ra = rng.die(20) + aMS;
      const rd = rng.die(20) + dMS;
      if (ra === rd) continue;
      rounds++;
      if (ra > rd) { d.hp--; duel.hits.push('a'); }
      else { a.hp--; duel.hits.push('d'); }
    }

    if (d.hp <= 0) { duel.result = 'att'; defLost.push(d); di++; }
    else { duel.result = 'def'; attLost.push(a); ai++; }
    log.push(duel);
  }

  const winner = di >= def.length ? 'att' : 'def';
  return {
    winner, rounds, log, attLost, defLost,
    attSurvivors: att.filter((u) => u.hp > 0),
    defSurvivors: def.filter((u) => u.hp > 0),
  };
}

/** 战前胜率预估：蒙特卡洛。不触碰对局种子。 */
export function estimateOdds(G, attUnits, defUnits, env, trials = 2000, seed = 12345) {
  const rng = scratchRng(seed);
  let wins = 0, survivorSum = 0;
  for (let i = 0; i < trials; i++) {
    const a = attUnits.map((u) => ({ ...u }));
    const d = defUnits.map((u) => ({ ...u }));
    const r = resolveBattle(G, a, d, env, rng);
    if (r.winner === 'att') { wins++; survivorSum += r.attSurvivors.length; }
  }
  return {
    win: wins / trials,
    avgSurvivors: wins ? survivorSum / wins : 0,
  };
}

/** 战斗结束后所有幸存单位耐久全恢复（原作行为：不做跨战损伤） */
export function restoreHp(G, units, maxHpOf) {
  for (const u of units) u.hp = maxHpOf(u);
}
