// 指令层：把玩家的每一个操作变成一条可序列化、可重放的指令。
//
// 联机用的是「房主定序 + 各端重放」：客户端不直接改状态，而是把指令发给房主，
// 房主赋一个序号再广播给所有人（含自己），各端严格按序号顺序调用 applyCmd。
// 因为随机数是种子化的（rng.js）、AI 是确定性的，同一串指令在每一端
// 都会推演出完全相同的局面 —— 网上只需要传几十字节的指令，不必传状态。
//
// 单人模式走的也是这一条路径，只是指令产生后立即本地执行。
// 这样两种模式共用同一套代码，联机才不会出现「只有联机才有的 bug」。

import * as S from './state.js';
import { runAiTurn } from './ai.js';
import { UNITS } from '../data/units.js';

const armyById = (G, id) => G.armies.find((a) => a.id === id) || null;

/**
 * 执行一条指令。**必须是同步且确定性的** —— 不许碰 Date.now()、
 * Math.random()、也不许在里面做动画。返回一个「表现描述」，
 * 由界面层拿去播动画；返回值不参与推演。
 */
export function applyCmd(G, cmd) {
  switch (cmd.k) {
    case 'move': {
      const army = armyById(G, cmd.army);
      if (!army || army.owner !== cmd.p) return null;
      S.pushUndo(G);
      const picked = cmd.units ? new Set(cmd.units) : null;
      const sub = picked ? S.detach(G, army, picked) : army;
      const mover = sub || army;
      const from = { x: mover.x, y: mover.y };
      S.moveAlong(G, mover, cmd.path);
      S.reattachIfIdle(G, mover);
      return { fx: 'move', from, path: cmd.path, armyId: mover.id };
    }

    case 'attack': {
      const army = armyById(G, cmd.army);
      if (!army || army.owner !== cmd.p) return null;
      const picked = cmd.units ? new Set(cmd.units) : null;
      const sub = picked ? S.detach(G, army, picked) : army;
      const attacker = sub || army;
      const city = S.cityAt(G, cmd.x, cmd.y);
      const place = city ? city.name : `(${cmd.x},${cmd.y})`;
      const res = S.attack(G, attacker, cmd.x, cmd.y);
      S.reattachIfIdle(G, attacker);
      return { fx: 'battle', res, x: cmd.x, y: cmd.y, place };
    }

    case 'explore': {
      const army = armyById(G, cmd.army);
      if (!army || army.owner !== cmd.p) return null;
      const feature = S.canExplore(G, army);
      const res = S.exploreFeature(G, army);
      return res ? { fx: 'feature', res, feature } : null;
    }

    case 'pickup': {
      const army = armyById(G, cmd.army);
      if (!army || army.owner !== cmd.p) return null;
      const drop = S.pickUpDrops(G, army);
      return drop ? { fx: 'pickup', drop } : null;
    }

    case 'produce': {
      const c = S.cityById(G, cmd.city);
      if (!c || c.owner !== cmd.p) return null;
      S.setProduction(G, c, cmd.type);
      return { fx: 'ui' };
    }

    case 'vector': {
      const c = S.cityById(G, cmd.city);
      if (!c || c.owner !== cmd.p) return null;
      S.setVector(G, c, cmd.target || null);
      return { fx: 'ui' };
    }

    case 'raze': {
      const c = S.cityById(G, cmd.city);
      if (!c || c.owner !== cmd.p) return null;
      S.razeCity(G, c);
      return { fx: 'ui' };
    }

    case 'hero': {
      if (!G.offer || G.offer.player !== cmd.p) return null;
      if (cmd.accept) S.acceptOffer(G); else S.declineOffer(G);
      return { fx: 'ui' };
    }

    case 'undo': {
      if (S.current(G) !== cmd.p) return null;
      return S.undoMove(G) ? { fx: 'ui' } : null;
    }

    case 'endturn': {
      if (S.current(G) !== cmd.p) return null;
      S.endTurn(G);
      return { fx: 'turn' };
    }

    case 'ai': {
      // 由房主发起，但**每一端都各自跑一遍** —— AI 是确定性的，
      // 结果处处相同，网上只传这一条指令。
      if (S.current(G) !== cmd.p) return null;
      runAiTurn(G, cmd.p);
      return { fx: 'ai' };
    }

    default:
      return null;
  }
}

/**
 * 局面指纹：用来发现不同端推演结果分叉。
 * 每条指令执行后房主会带上自己的指纹，客户端一比对就知道有没有失步。
 * 只取真正决定局面的东西，别把日志之类的也算进去。
 */
export function checksum(G) {
  let h = 2166136261;
  const mix = (n) => { h ^= n | 0; h = Math.imul(h, 16777619); };
  mix(G.turn); mix(G.currentIdx); mix(G.rng.seed); mix(G.nextArmyId);
  for (const p of G.players) mix(G.gold[p]);
  for (const c of G.cities) {
    mix(c.owner); mix(c.razed ? 1 : 0);
    mix(c.building ? c.building.turnsLeft : -1);
    mix(c.building ? c.building.type.length : 0);
  }
  for (const a of G.armies) {
    mix(a.id); mix(a.x); mix(a.y); mix(a.owner); mix(a.units.length);
    for (const u of a.units) { mix(u.uid); mix(u.hp); mix(u.mp); }
  }
  for (const k of Object.keys(G.heroes)) {
    const hero = G.heroes[k];
    mix(hero.str); mix(hero.alive ? 1 : 0); mix((hero.items || []).length);
  }
  return h >>> 0;
}

/** 界面层用来判断某条指令是不是「我」能发的 */
export function canAct(G, faction) {
  return !G.winner && S.current(G) === faction;
}

export { UNITS };
