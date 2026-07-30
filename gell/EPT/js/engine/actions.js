// EPT · 操作层：所有玩家操作的统一入口（单机直接应用；联机由房主定序后各端按同序应用）
// 保证：只要各端以相同顺序对相同状态应用相同操作，游戏状态（含随机数流）完全一致。
import { buyCard, sellUnit, reroll, buyXp, placeUnit, unfieldUnit, allUnits } from './player.js';
import { canCombine, makeCombinedItem, CONSUMABLES } from '../../data/items.js';

// 装备穿戴（共享逻辑；返回 true 或失败原因字符串）
export function equipApply(game, p, u, it) {
  if (!p.items.includes(it) || !u) return '目标无效';
  if (it.kind === 'consumable') {
    if (CONSUMABLES[it.type]?.target !== 'unit') return '该道具应作用于装备';
    return game.useConsumableOnUnit(p, it, u.uid);
  }
  if (u.items.some(x => x.eff && x.eff.thief)) return '装备栏被小偷偷占用';
  if (it.eff && it.eff.thief && u.items.length > 0) return '小偷偷需要空的装备栏（它会占满3格）';
  if (it.kind === 'component') {
    const partner = u.items.find(x => x.kind === 'component' && canCombine(x.comp, it.comp));
    if (partner) {
      const combined = makeCombinedItem(partner.comp, it.comp);
      if (combined) {
        u.items[u.items.indexOf(partner)] = combined;
        p.items = p.items.filter(x => x !== it);
        return combined.name; // 返回合成名供 UI 提示
      }
    }
    if (u.items.length >= 3) return '装备栏已满（3件）';
    u.items.push(it);
    p.items = p.items.filter(x => x !== it);
    return true;
  }
  if (u.items.length >= 3) return '装备栏已满（3件）';
  u.items.push(it);
  p.items = p.items.filter(x => x !== it);
  return true;
}

export function applyAction(game, pi, a) {
  const p = game.players[pi];
  if (!p || !p.alive || game.over) return false;
  switch (a.k) {
    case 'buy': return buyCard(game, p, a.slot);
    case 'sell': {
      if (game.phase !== 'planning' && p.board.some(b => b.unit.uid === a.uid)) return '战斗中不能出售场上棋子';
      return sellUnit(game, p, a.uid);
    }
    case 'reroll': return reroll(game, p);
    case 'xp': return buyXp(game, p);
    case 'lock': p.shopLocked = !p.shopLocked; return true;
    case 'place': {
      if (game.phase !== 'planning') return '战斗中无法调整棋盘';
      return placeUnit(p, a.uid, a.c, a.r);
    }
    case 'unfield': {
      if (game.phase !== 'planning') return '战斗中无法调整棋盘';
      return unfieldUnit(p, a.uid, a.bench);
    }
    case 'benchSwap': {
      const from = p.bench.findIndex(x => x && x.uid === a.uid);
      if (from < 0 || a.idx === from) return false;
      const tmp = p.bench[a.idx];
      p.bench[a.idx] = p.bench[from];
      p.bench[from] = tmp || null;
      return true;
    }
    case 'equip': {
      const it = p.items[a.itemIdx];
      const u = allUnits(p).find(x => x.uid === a.uid);
      return equipApply(game, p, u, it);
    }
    case 'combineInv': {
      const A = p.items[a.i], B = p.items[a.j];
      if (!A || !B || A === B || A.kind !== 'component' || B.kind !== 'component' || !canCombine(A.comp, B.comp)) return '这两件无法合成';
      const c = makeCombinedItem(A.comp, B.comp);
      if (!c) return false;
      p.items = p.items.filter(x => x !== A && x !== B);
      p.items.push(c);
      return c.name;
    }
    case 'useOnItem': {
      const it = p.items[a.itemIdx], tg = p.items[a.targetIdx];
      if (!it || !tg) return '目标无效';
      return game.useConsumableOnItem(p, it, tg);
    }
    case 'carPick': return game.carouselPick(p, a.idx);
    // ---- 房主定序的流程事件（联机） ----
    case 'carWave': game.carouselRelease(); return true;
    case 'carEnd': game.carouselFinish(); return true;
    case 'aiify': p.isAI = true; return true; // 断线接管
    default: return false;
  }
}
