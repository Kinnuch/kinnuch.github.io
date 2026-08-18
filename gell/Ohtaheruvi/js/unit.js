// 单位实例的读取器。英雄与普通单位共用一套接口 —— 英雄同样占据军团的一个格位（原作如此）。

import { UNITS, upkeepOf } from '../data/units.js';
import { ITEMS } from '../data/items.js';
import { heroHp, commandBonus } from '../data/heroes.js';

export const isHero = (u) => u.type === 'hero';

export function heroOf(G, u) { return isHero(u) ? G.heroes[u.heroId] : null; }

export function unitDef(u) { return isHero(u) ? null : UNITS[u.type]; }

export function unitName(G, u) {
  const h = heroOf(G, u);
  return h ? h.name : UNITS[u.type].name;
}

// 精灵语副标：只有正典有实际词形的兵种才返回，否则界面只显中文
export function unitElvish(u) {
  if (isHero(u)) return null;
  const d = UNITS[u.type];
  return d.nameElvish ? { text: d.nameElvish, lang: d.lang, gloss: d.gloss } : null;
}

export function unitStr(G, u) {
  const h = heroOf(G, u);
  if (h) return h.str;
  return UNITS[u.type].str;
}

export function unitMaxHp(G, u) {
  const h = heroOf(G, u);
  if (h) return heroHp(h.str) + itemSum(G, h, 'hp');
  return UNITS[u.type].hp;
}

export function unitMp(G, u) {
  const h = heroOf(G, u);
  if (h) return h.mp + itemSum(G, h, 'mp');
  return UNITS[u.type].mp;
}

export function unitFlags(G, u) {
  const h = heroOf(G, u);
  if (h) return h.fear ? ['fear'] : [];
  return UNITS[u.type].flags || [];
}

export function unitTags(G, u) {
  const h = heroOf(G, u);
  if (h) return h.tags || ['living'];
  return UNITS[u.type].tags || [];
}

export function unitSwatch(G, u) {
  const h = heroOf(G, u);
  if (h) return '#d4af5a';
  return UNITS[u.type].swatch || '#888';
}

export function unitUpkeep(G, u) {
  return isHero(u) ? 0 : upkeepOf(u.type);
}

export function itemSum(G, hero, field) {
  let n = 0;
  for (const id of hero.items || []) {
    const it = ITEMS[id];
    if (it && it[field]) n += it[field];
  }
  return n;
}

export function heroHasItemFlag(G, hero, field) {
  return (hero.items || []).some((id) => ITEMS[id] && ITEMS[id][field]);
}

// 军团中最强英雄提供的统率（含统率类神器）
export function stackCommand(G, units) {
  let best = 0, bestHero = null;
  for (const u of units) {
    const h = heroOf(G, u);
    if (!h) continue;
    const c = commandBonus(h.str) + itemSum(G, h, 'command');
    if (c > best) { best = c; bestHero = h; }
  }
  return { bonus: best, hero: bestHero };
}

// 精灵宝钻一类「作用于全军团」的神器加成
export function stackItemBonus(G, units) {
  let n = 0;
  for (const u of units) {
    const h = heroOf(G, u);
    if (!h) continue;
    n += itemSum(G, h, 'stackBonus');
  }
  return n;
}

/**
 * 单位编号**挂在对局上**（G.nextUid），不是模块级的全局计数器。
 * 全局计数器会让「同一个页面里开过第二局的人」从上一局的编号接着数，
 * 而刚进来的人从 1 开始 —— 联机两端的编号对不上，指令就会指错单位。
 * 编号只是「这一局里第几个被造出来的单位」，各端重放同一串指令自然一致。
 */
let orphan = 1;                       // 没有对局上下文时的兜底（只有测试会用到）
const takeUid = (G) => (G ? G.nextUid++ : orphan++);

export function makeUnit(G, type, opts = {}) {
  const def = UNITS[type];
  return {
    uid: takeUid(G),
    type,
    hp: def.hp,
    maxHp: def.hp,
    blessed: false,
    ...opts,
  };
}

export function makeHeroUnit(heroId, G) {
  const h = G.heroes[heroId];
  const hp = heroHp(h.str);
  return { uid: takeUid(G), type: 'hero', heroId, hp, maxHp: hp, blessed: false };
}

export function seedUid(G, n) { G.nextUid = Math.max(G.nextUid || 1, n + 1); }
export function currentUid(G) { return G.nextUid; }
