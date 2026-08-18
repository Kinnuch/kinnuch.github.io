// 存读档：localStorage，键前缀 ohta.
// 地形不存（从 maps/*.js 重建），只存对局状态与地物标记。

import { newGame } from './state.js';
import { seedUid, currentUid } from './unit.js';
import { encodeSeen, decodeSeen, refreshFog } from './fog.js';

const PREFIX = 'ohta.';
export const SLOTS = ['auto', 's1', 's2', 's3'];

export function serialize(G) {
  return {
    v: 1,
    mapId: G.mapId,
    scenarioId: G.scenario ? G.scenario.id : null,
    seed: G.seed,
    rngState: G.rng.seed,
    turn: G.turn,
    players: G.players,
    currentIdx: G.currentIdx,
    gold: G.gold,
    cities: G.cities,
    armies: G.armies,
    heroes: G.heroes,
    rosterIdx: G.rosterIdx,
    pending: G.pending,
    dropped: G.dropped || [],
    offer: G.offer ? { player: G.offer.player, id: G.offer.entry.id, cost: G.offer.cost } : null,
    log: G.log,
    settings: G.settings,
    nextArmyId: G.nextArmyId,
    winner: G.winner,
    humans: G.humans,
    history: G.history,
    battles: G.battles,
    firedEvents: G.firedEvents || {},
    fogMode: G.fogMode,
    difficulty: G.difficulty,
    // 已探索区域按位打包再 base64，一方约 2.6KB，比存几万个坐标小两个数量级
    seen: Object.fromEntries(Object.entries(G.seen).map(([p, arr]) => [p, encodeSeen(arr)])),
    cityMemory: G.cityMemory,
    uid: currentUid(G),
    features: G.map.def.features.map((f) => ({
      explored: !!f.explored, usedBy: f.usedBy || [], guardian: f.guardian || null,
    })),
    savedAt: new Date().toISOString(),
  };
}

export function deserialize(data, mapDef, rosterLookup, scenario) {
  const G = newGame(mapDef, { seed: data.seed, humans: data.humans, scenario: scenario || null });
  G.rng.seed = data.rngState;
  Object.assign(G, {
    turn: data.turn, players: data.players, currentIdx: data.currentIdx,
    gold: data.gold, cities: data.cities, armies: data.armies, heroes: data.heroes,
    rosterIdx: data.rosterIdx, pending: data.pending, dropped: data.dropped,
    log: data.log, settings: data.settings, nextArmyId: data.nextArmyId, winner: data.winner,
    humans: data.humans || [data.players[0]],
    history: data.history || [],
    battles: data.battles || [],
    firedEvents: data.firedEvents || {},
    fogMode: data.fogMode || 'memory',
    difficulty: data.difficulty || 'normal',
    undo: [],   // 撤回栈只在本回合内有效，不跨存档
  });
  if (data.seen) {
    const bytes = Math.ceil((G.map.w * G.map.h) / 8);
    for (const [p, str] of Object.entries(data.seen)) G.seen[p] = decodeSeen(str, bytes);
  }
  if (data.cityMemory) G.cityMemory = data.cityMemory;
  for (const p of G.players) refreshFog(G, p);
  seedUid(G, data.uid || 1);
  data.features.forEach((f, i) => {
    const tgt = G.map.def.features[i];
    if (!tgt) return;
    tgt.explored = f.explored;
    tgt.usedBy = f.usedBy;
    tgt.guardian = f.guardian;
  });
  if (data.offer && rosterLookup) {
    const entry = rosterLookup(data.offer.player, data.offer.id);
    if (entry) G.offer = { player: data.offer.player, entry, cost: data.offer.cost };
  }
  return G;
}

export function save(G, slot = 'auto') {
  try {
    localStorage.setItem(PREFIX + slot, JSON.stringify(serialize(G)));
    return true;
  } catch (e) {
    console.warn('存档失败', e);
    return false;
  }
}

export function load(slot = 'auto') {
  const raw = localStorage.getItem(PREFIX + slot);
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return null; }
}

export function slotInfo(slot) {
  const d = load(slot);
  if (!d) return null;
  return { turn: d.turn, savedAt: d.savedAt, mapId: d.mapId, winner: d.winner };
}

export function clearSlot(slot) { localStorage.removeItem(PREFIX + slot); }
