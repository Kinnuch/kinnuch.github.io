// EPT · M1 基础 AI：买牌合成、羁绊倾向、升级曲线、简单布阵、装备穿戴
import { UNITS_BY_ID } from '../../data/units.js';
import { buyCard, buyXp, reroll, allUnits, sellUnit, benchSpace } from './player.js';
import { makeCombinedItem, canCombine } from '../../data/items.js';

export function runAI(game, p) {
  const stage = game.stageOf();
  const units = () => allUnits(p);
  // 濒死感知：不再卡利息，倾家荡产求名次
  const desperate = p.hp <= 20 || (p.hp <= 35 && stage >= 4);
  // 低费张数统计
  const cnt = {};
  for (const u of units()) if (u.def.cost <= 2) cnt[u.def.id] = (cnt[u.def.id] || 0) + Math.pow(3, u.star - 1);
  const bestLow = Object.entries(cnt).sort((a, b) => b[1] - a[1])[0];
  // 装备倾向：攻系(攻/攻速/暴击) vs 法系(法强/法力)
  const comps = [...p.items, ...units().flatMap(u => u.items)]
    .flatMap(it => it.comps ? it.comps : it.comp ? [it.comp] : []);
  const offN = comps.filter(c => /^(ad|as|csc)/.test(c)).length;
  const castN = comps.filter(c => /^(ap|m)\d/.test(c)).length;
  // 动态定型（阶段2起一次性）：起手某1/2费≥3张才赌狗，否则按装备倾向+血量选 84/95
  if (!p.styleLocked && stage >= 2) {
    if (bestLow && bestLow[1] >= 3) p.aiStyle = 'gambling';
    else if (castN > offN) p.aiStyle = 'strategic';
    else if (offN > castN) p.aiStyle = 'balancing';
    else p.aiStyle = p.hp >= 55 ? 'strategic' : 'balancing';
    p.styleLocked = true;
  }
  // 赌狗转型：到6级核心还凑不出苗头（<5张）→ 按血量转 84/95，不再死存钱
  if (p.aiStyle === 'gambling' && p.level >= 6 && bestLow && bestLow[1] < 5) {
    p.aiStyle = p.hp >= 55 ? 'strategic' : 'balancing';
  }
  const style = p.aiStyle;
  let core = null, coreCopies = 0;
  if (style === 'gambling' && bestLow) { core = bestLow[0]; coreCopies = bestLow[1]; }
  // 云顶式运营指标：站稳 = 至少2张高费两星，或整体两星数量足够
  const twoStars = units().filter(u => u.star >= 2).length;
  const highPairs = units().filter(u => u.def.cost >= 4 && u.star >= 2).length;
  const stabilized = highPairs >= 2 || twoStars >= 6;
  // 梭哈时机：濒死 / 赌狗差1~2张三星
  const allIn = desperate || (style === 'gambling' && coreCopies >= 7 && coreCopies < 9);
  // 目标等级（Fast-8节奏；8级站稳且富裕→冲9）
  let targetLevel =
    style === 'gambling' ? (coreCopies >= 9 ? 8 : stage <= 2 ? 5 : 6)
      : style === 'strategic' ? (stage <= 2 ? 4 : stage === 3 ? 7 : stage === 4 ? 8 : 9)
        : (stage <= 1 ? 3 : stage === 2 ? 5 : stage === 3 ? 7 : 8);
  if (desperate) targetLevel = Math.min(9, targetLevel + 1);
  if (p.level >= 8 && stabilized && p.gold >= 60) targetLevel = 9;
  // 利息意识：存钱线（卡50吃满5利息）
  let reserve =
    style === 'gambling' ? (p.level >= 5 ? 50 : 10)
      : style === 'strategic' ? (stage <= 4 ? 50 : 30)
        : (stage <= 2 ? 0 : stage === 3 ? 20 : stage === 4 ? 50 : 20);
  // 滚动窗口（rolldown）：到8/9级还没高费两星、或血线告急且质量差 → 深D找卡
  const needStab = (p.level >= 8 && !stabilized) || (stage >= 3 && p.hp < 60 && twoStars < 4 && p.level >= 6);
  let rollFloor = reserve;
  if (needStab) rollFloor = (desperate || p.hp <= 40) ? 0 : 30; // 血厚D到30保利息，血薄D穿
  if (allIn) { reserve = 0; rollFloor = 0; }
  if (p.gold > 75) { reserve = Math.min(reserve, 50); rollFloor = Math.min(rollFloor, 50); targetLevel = Math.min(9, targetLevel + 1); }
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
      // 顺着装备走：攻系装多买物理输出，法系装多买法系
      if (offN - castN > 1 && def.classes.some(c => ['warrior', 'killer', 'ranger', 'hunter', 'trickshot', 'executor'].includes(c))) score += 6;
      if (castN - offN > 1 && def.classes.some(c => ['arcanist', 'indulger', 'flagger', 'forger'].includes(c))) score += 6;
      if (core && id === core) score += 200;
      if (style === 'balancing' && def.cost === 4 && p.level >= 8) score += 60;
      if (style === 'strategic' && def.cost === 5) score += 80;
      if (units().length < p.level + 2) score += 15;
      scored.push({ i, def, score, owned });
    }
    scored.sort((a, b) => b.score - a.score);
    for (const s of scored) {
      guard++;
      if (s.score <= 4) continue;
      // 赌狗核心与高费凑对：无视存钱线也要买
      const mustBuy = (core && s.def.id === core) || (s.def.cost >= 4 && s.owned >= 1);
      if (!mustBuy && p.gold - s.def.cost < rollFloor) continue;
      if (p.gold < s.def.cost) continue;
      buyCard(game, p, s.i);
    }
  };
  buyRound();
  // 备战席腾位：卖掉1星、场上下都仅此一张的非核心独苗，给 rolldown 腾空间
  const sellSpares = keep => {
    let g2 = 0;
    while (p.bench.filter(Boolean).length > keep && g2++ < 9) {
      const spare = p.bench.filter(Boolean)
        .filter(u => u.star === 1 && (!core || u.def.id !== core) && allUnits(p).filter(x => x.def.id === u.def.id).length === 1)
        .sort((a, b) => a.def.cost - b.def.cost)[0];
      if (!spare) break;
      sellUnit(game, p, spare.uid);
    }
  };
  // 刷新（D牌）：站稳前的 rolldown 大预算；8级后钱花不完就继续D质量，别抱着金币等死
  let rerollBudget = allIn ? 40 : needStab ? 30 : style === 'gambling' && p.level >= 5 ? 6 : 3;
  if (p.level >= 8 && p.gold > 100) { rerollBudget = Math.max(rerollBudget, 20); rollFloor = Math.min(rollFloor, 50); }
  for (let r = 0; r < rerollBudget && guard < 300; r++) {
    if (p.gold - 2 < rollFloor) break;
    if (benchSpace(p) < 0 || p.bench.filter(Boolean).length >= 8) sellSpares(6);
    if (p.gold < 2 || benchSpace(p) < 0) break;
    if (!reroll(game, p)) break;
    buyRound();
    if (style === 'gambling' && core) {
      const cc = units().reduce((s, u) => s + (u.def.id === core ? Math.pow(3, u.star - 1) : 0), 0);
      if (cc >= 9) break; // 三星到手收手
    }
    if (needStab && units().filter(u => u.def.cost >= 4 && u.star >= 2).length >= 2) break; // 站稳即收手
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
  // 侦查对策：按上个对手的阵容调整站位（AOE法师多→散开；突进/刺客多→贴角保C位）
  let colOrder = [3, 2, 4, 1, 5, 0, 6];
  const opp = game.players[p.lastOpp];
  if (opp && opp.alive && opp.board.length) {
    const ou = opp.board.map(b => b.unit);
    const casters = ou.filter(u => u.def.classes.some(c => ['arcanist', 'indulger'].includes(c))).length;
    const divers = ou.filter(u => u.def.classes.includes('killer') || u.def.races.includes('gondolin')).length;
    if (divers >= 2) colOrder = [0, 1, 2, 3, 4, 5, 6];      // 贴角抱团
    else if (casters >= 3) colOrder = [0, 6, 2, 4, 1, 5, 3]; // 拉开间距
  }
  const cap = Math.max(0, p.level - p.board.length);
  const benchSorted = p.bench.filter(Boolean).sort((a, b) => (b.def.cost * b.star * b.star) - (a.def.cost * a.star * a.star));
  const occ = new Set(p.board.map(b => b.c + ',' + b.r));
  for (const u of benchSorted.slice(0, cap)) {
    const rows = u.def.range > 1 ? [7, 6, 5, 4] : [4, 5, 6, 7];
    let placed = false;
    for (const r of rows) {
      for (const c of colOrder) {
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
