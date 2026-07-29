// EPT · M1 基础 AI：买牌合成、羁绊倾向、升级曲线、简单布阵、装备穿戴
import { UNITS_BY_ID } from '../../data/units.js';
import { buyCard, buyXp, reroll, allUnits, sellUnit, benchSpace } from './player.js';
import { makeCombinedItem, canCombine } from '../../data/items.js';

export function runAI(game, p) {
  const stage = game.stageOf();
  // 升级曲线
  const targetLevel = stage <= 1 ? 3 : stage === 2 ? 5 : stage === 3 ? 6 : stage === 4 ? 7 : stage === 5 ? 8 : 9;
  let reserve = p.aiStyle === 'eco' ? 20 : p.aiStyle === 'aggro' ? 0 : 10;
  if (stage <= 2 || p.gold > 45) reserve = 0; // 前期保命/金币溢出时强制消费
  let guard = 0;
  while (p.level < targetLevel && p.gold - 4 >= (stage >= 4 ? 0 : reserve) && guard++ < 20) {
    if (!buyXp(game, p)) break;
  }
  // 买牌：按"凑对>羁绊>补人口"打分，最多三轮刷新
  for (let round = 0; round < 4 && guard < 80; round++) {
    const scored = [];
    for (let i = 0; i < 5; i++) {
      const id = p.shop[i];
      if (!id) continue;
      const def = UNITS_BY_ID[id];
      const owned = allUnits(p).filter(u => u.def.id === id && u.star < 3).length;
      const traitN = allUnits(p).reduce((s, u) =>
        s + u.def.races.filter(r => def.races.includes(r)).length + u.def.classes.filter(c => def.classes.includes(c)).length, 0);
      let score = owned >= 2 ? 100 : owned === 1 ? 40 : 0;
      score += Math.min(traitN, 6) * 4 + def.cost * 2;
      if (allUnits(p).length < p.level + 2) score += 15;
      scored.push({ i, def, score });
    }
    scored.sort((a, b) => b.score - a.score);
    for (const s of scored) {
      guard++;
      if (s.score <= 4) continue;
      if (p.gold - s.def.cost < (stage >= 4 ? 0 : Math.min(reserve, 20))) continue;
      buyCard(game, p, s.i);
    }
    if (round < 3 && p.gold > reserve + 12 && benchSpace(p) >= 0) { if (!reroll(game, p)) break; } else break;
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
