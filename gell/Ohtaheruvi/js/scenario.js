// 场景层（设计文档 04 章第一节）
//
// 地形层（maps/*.js）只描述地理：地形、城市位置、地物、道路。
// 场景层（maps/scenarios/*.js）描述「这一战」：谁参战、城归谁、开局带什么兵、
// 哪片区域开放、怎样算赢、第几回合触发什么。
//
// 于是 6 场第一纪元战役 = 1 张贝烈瑞安德地形图 + 6 个几 KB 的配置，
// 新增一战不用重画地图。

import { FACTIONS } from '../data/factions.js';

/** 把场景配置叠加到地形层上，产出 newGame 能直接吃的地图定义 */
export function applyScenario(mapDef, sc) {
  const players = sc.players || mapDef.players;
  const cities = mapDef.cities.map((c) => {
    let owner = (sc.owners && sc.owners[c.id]) ?? c.owner;
    // 本场不参战的势力，其城池一律转为中立 —— 否则地图上会挂着
    // 永远不会行动的旗号，玩家还以为那是个对手
    if (!players.includes(owner)) owner = 0;
    return { ...c, owner };
  });
  return {
    ...mapDef,
    id: `${mapDef.id}:${sc.id}`,
    scenarioId: sc.id,
    cities,
    players,
    garrisons: { ...(sc.garrisons || {}) },
    // 封锁区：本场战役打不到的地方，灰雾覆盖且不可进入
    locked: sc.locked || null,
  };
}

/** 该格是否被本场战役封锁 */
export function isLocked(G, x, y) {
  const L = G.map.def.locked;
  if (!L) return false;
  if (L.rect) {
    const [x0, y0, x1, y1] = L.rect;   // rect 是「开放区域」，之外全锁
    return x < x0 || y < y0 || x > x1 || y > y1;
  }
  return false;
}

/** 每回合结束时跑一遍：脚本事件 + 胜负条件 */
export function tickScenario(G, sc, pushLog) {
  if (!sc) return null;

  // 「已触发」记在**对局**上，不能记在场景对象上 ——
  // 场景定义是所有对局共享的模块级常量，把标记打在它身上，
  // 同一进程里的第二局（以及联机的另一端）就会以为剧本已经发生过了。
  const fired = G.firedEvents || (G.firedEvents = {});
  (sc.events || []).forEach((ev, i) => {
    if (fired[i] && !ev.repeat) return;
    if (ev.turn != null && G.turn < ev.turn) return;
    if (ev.when && !ev.when(G)) return;
    fired[i] = true;             // repeat 的事件不看这个标记，每回合都会再判一次
    ev.run(G, pushLog);
  });

  for (const cond of sc.victory || []) {
    const winner = cond.check(G);
    if (winner != null) return { winner, reason: cond.label };
  }
  return null;
}

// ── 常用的胜负条件构件 ────────────────────────────────────

export const holdCities = (player, ids, untilTurn) => ({
  label: `守住${ids.length}座城至第 ${untilTurn} 回合`,
  check: (G) => {
    const lost = ids.some((id) => {
      const c = G.cities.find((x) => x.id === id);
      return !c || c.owner !== player;
    });
    if (lost) return G.players.find((p) => p !== player) ?? null;
    return G.turn > untilTurn ? player : null;
  },
});

export const captureCities = (player, ids) => ({
  label: `攻陷 ${ids.join('、')}`,
  check: (G) => ids.every((id) => {
    const c = G.cities.find((x) => x.id === id);
    return c && c.owner === player;
  }) ? player : null,
});

export const clearRegion = (player, rect) => ({
  label: '肃清开放区域内的敌军',
  check: (G) => {
    const [x0, y0, x1, y1] = rect;
    const foes = G.armies.filter((a) =>
      a.owner !== player && a.owner !== 0 &&
      a.x >= x0 && a.x <= x1 && a.y >= y0 && a.y <= y1);
    return foes.length ? null : player;
  },
});

export const surviveUntil = (player, turn) => ({
  label: `存活至第 ${turn} 回合`,
  check: (G) => (G.turn > turn ? player : null),
});

export const fractionOfCities = (frac) => ({
  label: `控制全图 ${Math.round(frac * 100)}% 的城市`,
  check: (G) => {
    for (const p of G.players) {
      if (G.cities.filter((c) => c.owner === p).length / G.cities.length >= frac) return p;
    }
    return null;
  },
});

export const describeSides = (sc) =>
  (sc.players || []).map((p) => FACTIONS[p].name).join('、');
