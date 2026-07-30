// EPT · M1 基础 AI：买牌合成、羁绊倾向、升级曲线、简单布阵、装备穿戴
import { UNITS_BY_ID } from '../../data/units.js';
import { buyCard, buyXp, reroll, allUnits, sellUnit, benchSpace } from './player.js';
import { makeCombinedItem, canCombine } from '../../data/items.js';

export function runAI(game, p) {
  const stage = game.stageOf();
  const style = p.aiStyle;
  const units = () => allUnits(p);
  // 濒死感知：不再卡利息，倾家荡产求名次
  const desperate = p.hp <= 20 || (p.hp <= 35 && stage >= 4);
  // gambling：锁定张数最多的 1/2 费为"赌狗核心"
  let core = null, coreCopies = 0;
  if (style === 'gambling') {
    const cnt = {};
    for (const u of units()) if (u.def.cost <= 2) cnt[u.def.id] = (cnt[u.def.id] || 0) + Math.pow(3, u.star - 1);
    core = Object.entries(cnt).sort((a, b) => b[1] - a[1])[0]?.[0] || null;
    coreCopies = core ? cnt[core] : 0;
  }
  const has4star2 = units().some(u => u.def.cost === 4 && u.star >= 2);
  // 梭哈时机：濒死 / 赌狗差1~2张三星 / 84流上8级找4费
  const allIn = desperate
    || (style === 'gambling' && coreCopies >= 7 && coreCopies < 9)
    || (style === 'balancing' && p.level >= 8 && !has4star2);
  // 目标等级
  let targetLevel =
    style === 'gambling' ? (coreCopies >= 9 ? 8 : stage <= 2 ? 5 : 6)
      : style === 'strategic' ? (stage <= 2 ? 4 : stage === 3 ? 7 : stage === 4 ? 8 : 9)
        : (stage <= 1 ? 3 : stage === 2 ? 5 : stage === 3 ? 7 : 8);
  if (desperate) targetLevel = Math.min(9, targetLevel + 1);
  // 利息意识：存钱线（卡50吃满5利息）
  let reserve =
    style === 'gambling' ? (p.level >= 5 ? 50 : 10)
      : style === 'strategic' ? (stage <= 4 ? 50 : 30)
        : (stage <= 2 ? 0 : stage === 3 ? 20 : stage === 4 ? 50 : 20);
  if (allIn) reserve = 0;
  let guard = 0;
  // 经验（gambling 5级前不买经验）
  const xpOK = style !== 'gambling' || p.level >= 5 || desperate;
  while (xpOK && p.level < targetLevel && p.gold - 4 >= reserve && guard++ < 30) if (!buyXp(game, p)) break;
  // 买牌打分（strategic 前期只要霍比特人和5费系羁绊/高费质量卡）
  const buyFilter = def => {
    if (style === 'strategic' && stage <= 3 && !desperate) {
      return def.races.includes('hobbit') || def.cost >= 4
        || def.races.some(r => ['noldor', 'vala', 'dwarf', 'sinda', 'angband', 'dunedain'].includes(r));
    }
    return true;
  };
  const buyRound = () => {
    const scored = [];
    for (let i = 0; i < 5; i++) {
      const id = p.shop[i];
      if (!id) continue;
      const def = UNITS_BY_ID[id];
      if (!buyFilter(def)) continue;
      const owned = units().filter(u => u.def.id === id && u.star < 3).length;
      const traitN = units().reduce((s, u) =>
        s + u.def.races.filter(r => def.races.includes(r)).length + u.def.classes.filter(c => def.classes.includes(c)).length, 0);
      let score = owned >= 2 ? 100 : owned === 1 ? 40 : 0;
      score += Math.min(traitN, 6) * 4 + def.cost * 2;
      if (core && id === core) score += 200;
      if (style === 'balancing' && def.cost === 4 && p.level >= 8) score += 60;
      if (style === 'strategic' && def.cost === 5) score += 80;
      if (units().length < p.level + 2) score += 15;
      scored.push({ i, def, score });
    }
    scored.sort((a, b) => b.score - a.score);
    for (const s of scored) {
      guard++;
      if (s.score <= 4) continue;
      const mustBuy = core && s.def.id === core;
      if (!mustBuy && p.gold - s.def.cost < reserve) continue;
      if (p.gold < s.def.cost) continue;
      buyCard(game, p, s.i);
    }
  };
  buyRound();
  // 刷新（D牌）策略
  const rerollBudget = allIn ? 40 : style === 'gambling' && p.level >= 5 ? 6 : 3;
  for (let r = 0; r < rerollBudget && guard < 200; r++) {
    if (!allIn && p.gold - 2 < reserve) break;
    if (p.gold < 2 || benchSpace(p) < 0) break;
    if (!reroll(game, p)) break;
    buyRound();
    if (style === 'gambling' && core) {
      const cc = units().reduce((s, u) => s + (u.def.id === core ? Math.pow(3, u.star - 1) : 0), 0);
      if (cc >= 9) break; // 三星到手收手
    }
  }
  // 卖掉多余的低费独苗（备战席满时）
  if (benchSpace(p) < 0 || p.bench.filter(Boolean).length >= 8) {
    const spare = p.bench.filter(Boolean)
      .filter(u => u.star === 1 && allUnits(p).filter(x => x.def.id === u.def.id).length === 1)
      .sort((a, b) => a.def.cost - b.def.cost)[0];
    if (spare && p.bench.filter(Boolean).length + p.board.length > p.level + 3) sellUnit(game, p, spare.uid);
  }
  // 布阵：清空重摆
  for (const b of [...p.board]) {
    const bs = benchSpace(p);
    if (bs < 0) break;
    p.bench[bs] = b.unit;
    p.board = p.board.filter(x => x !== b);
  }
  const cap = Math.max(0, p.level - p.board.length);
  const benchSorted = p.bench.filter(Boolean).sort((a, b) => (b.def.cost * b.star * b.star) - (a.def.cost * a.star * a.star));
  const occ = new Set(p.board.map(b => b.c + ',' + b.r));
  for (const u of benchSorted.slice(0, cap)) {
    const rows = u.def.range > 1 ? [7, 6, 5, 4] : [4, 5, 6, 7];
    let placed = false;
    for (const r of rows) {
      for (const c of [3, 2, 4, 1, 5, 0, 6]) {
        if (occ.has(c + ',' + r)) continue;
        occ.add(c + ',' + r);
        const idx = p.bench.findIndex(x => x && x.uid === u.uid);
        p.bench[idx] = null;
        p.board.push({ unit: u, c, r });
        placed = true; break;
      }
      if (placed) break;
    }
  }
  // 装备：散件优先合成后给最强棋子
  aiEquip(game, p);
}

function aiEquip(game, p) {
  const carry = p.board.slice().sort((a, b) => (b.unit.def.cost * b.unit.star) - (a.unit.def.cost * a.unit.star))[0];
  if (!carry) return;
  let guard = 0;
  while (guard++ < 12 && p.items.length) {
    const comps = p.items.filter(it => it.kind === 'component');
    let combined = null;
    outer: for (let i = 0; i < comps.length; i++)
      for (let j = i + 1; j < comps.length; j++)
        if (canCombine(comps[i].comp, comps[j].comp)) {
          combined = makeCombinedItem(comps[i].comp, comps[j].comp);
          if (combined) { p.items = p.items.filter(x => x !== comps[i] && x !== comps[j]); break outer; }
          combined = null;
        }
    if (combined) p.items.push(combined);
    // 穿戴
    const target = p.board.map(b => b.unit).filter(u => u.items.length < 3 && !u.items.some(i => i.eff && i.eff.thief)).sort((a, b) => (b.def.cost * b.star) - (a.def.cost * a.star))[0];
    if (!target) break;
    const wearable = p.items.find(it => it.kind === 'combined' || it.kind === 'light') || (combined ? null : p.items.find(it => it.kind === 'component'));
    if (!wearable) break;
    p.items = p.items.filter(x => x !== wearable);
    target.items.push(wearable);
    if (!combined && !p.items.some(it => it.kind !== 'component')) break;
  }
}
