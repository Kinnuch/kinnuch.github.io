// EPT · 对局流程（回合、配对、结算、掉落、淘汰）
import { makeRng } from './rng.js';
import { Combat, makeFighter, makeMonsterFighter } from './combat.js';
import { makePool, makePlayer, makeUnit, rollShop, income, addXp, allUnits, benchSpace, tryMerge } from './player.js';
import { UNITS, UNITS_BY_ID, STAGE_DAMAGE } from '../../data/units.js';
import { MONSTERS, STAGE1_WAVES, pveWave, pveDrops, openBag, hobbitReward } from '../../data/monsters.js';
import { T1_COMPS, T2_COMPS, makeComponentItem, makeCombinedItem } from '../../data/items.js';
import { countTraits, traitTier } from '../../data/traits.js';
import { COLS } from './hex.js';
import { runAI } from './ai.js';

const AI_NAMES = ['埃尔隆德', '瑟兰督伊', '凯勒博恩', '巴德', '丹恩', '埃奥梅尔', '铁蹄'];
const AI_STYLES = ['eco', 'aggro', 'balanced'];

export class Game {
  constructor(seed, humanName = '你') {
    this.rng = makeRng(seed);
    this.pool = makePool();
    this.players = [makePlayer(0, humanName, false)];
    for (let i = 0; i < 7; i++) this.players.push(makePlayer(i + 1, AI_NAMES[i], true, AI_STYLES[i % 3]));
    this.roundIdx = 0;
    this.phase = 'planning';
    this.log = [];
    this.pending = null;
    this.over = false;
    // 1-1：发牌（选秀 M1 简化）
    for (const p of this.players) {
      p.gold = 3;
      const oneCosts = UNITS.filter(u => u.cost === 1 && this.pool[u.id] > 0);
      const pick = this.rng.pick(oneCosts);
      this.pool[pick.id]--;
      p.bench[0] = makeUnit(pick.id);
      p.items.push(makeComponentItem(this.rng.pick(T1_COMPS)));
      rollShop(this, p);
    }
    this.addLog('1-1 选秀：每人获得一名 1 费棋子与一件散件。');
  }

  addLog(s) { this.log.push(s); if (this.log.length > 60) this.log.shift(); }

  // 回合序列：阶段1 = 3场PvE；阶段2+ = pvp*3, pvp*2, pve（X-4发牌在 X-3 结算后）
  roundInfo(idx = this.roundIdx) {
    if (idx < 3) return { stage: 1, label: `1-${idx + 2}`, type: 'pve', wave: idx };
    const k = idx - 3, stage = Math.floor(k / 6) + 2, pos = k % 6;
    const label = `${stage}-${pos < 3 ? pos + 1 : pos + 2}`;
    return { stage, label, type: pos === 5 ? 'pve' : 'pvp', pos };
  }
  stageOf() { return this.roundInfo().stage; }
  alivePlayers() { return this.players.filter(p => p.alive); }

  // ---------- 战斗准备 ----------
  prepareCombats() {
    const round = this.roundInfo();
    // AI 规划
    for (const p of this.players) if (p.isAI && p.alive) runAI(this, p);
    this.autoFillBoard(this.players[0]);
    const combats = [];
    if (round.type === 'pve') {
      for (const p of this.alivePlayers()) combats.push(this.buildPvE(p, round));
    } else {
      const shuffled = this.rng.shuffle(this.alivePlayers());
      for (let i = 0; i + 1 < shuffled.length; i += 2) combats.push(this.buildPvP(shuffled[i], shuffled[i + 1], false));
      if (shuffled.length % 2 === 1) {
        const solo = shuffled[shuffled.length - 1];
        const ghostSrc = this.rng.pick(shuffled.filter(p => p !== solo));
        combats.push(this.buildPvP(solo, ghostSrc, true));
      }
    }
    this.pending = { round, combats };
    this.phase = 'combat';
    return this.pending;
  }

  autoFillBoard(p) { // 人口未满时自动上场最贵棋子
    while (p.board.length < p.level) {
      const cands = p.bench.filter(Boolean).sort((a, b) => (b.def.cost * b.star) - (a.def.cost * a.star));
      if (!cands.length) break;
      const u = cands[0];
      const spot = this.freeSpot(p, u.def.range > 1);
      if (!spot) break;
      p.bench[p.bench.findIndex(x => x && x.uid === u.uid)] = null;
      p.board.push({ unit: u, c: spot[0], r: spot[1] });
    }
  }
  freeSpot(p, back) {
    const rows = back ? [7, 6, 5, 4] : [4, 5, 6, 7];
    const cols = [3, 2, 4, 1, 5, 0, 6];
    for (const r of rows) for (const c of cols) if (!p.board.some(b => b.c === c && b.r === r)) return [c, r];
    return null;
  }

  buildFighters(p, team) {
    return p.board.map(b => {
      const pos = team === 0 ? { c: b.c, r: b.r } : { c: COLS - 1 - b.c, r: 7 - b.r };
      return makeFighter({ def: b.unit.def, star: b.unit.star, items: b.unit.items, progress: b.unit.progress, pos }, team, { player: p });
    });
  }

  buildPvP(pa, pb, ghost) {
    const fighters = [...this.buildFighters(pa, 0), ...this.buildFighters(pb, 1)];
    const sim = new Combat(fighters, this.rng.fork(), { pvpWins: [pa.pvpWins, pb.pvpWins] });
    const result = sim.run();
    return { kind: 'pvp', a: pa.i, b: pb.i, ghost, sim, result, events: sim.ev };
  }

  buildPvE(p, round) {
    const waveIds = round.stage === 1 ? STAGE1_WAVES[round.wave] : pveWave(round.stage);
    const fighters = this.buildFighters(p, 0);
    const spots = [[3, 1], [2, 1], [4, 1], [1, 1], [5, 1], [3, 0], [2, 0]];
    waveIds.forEach((mid, i) => fighters.push(makeMonsterFighter(MONSTERS[mid], waveIds.length, i, { c: spots[i][0], r: spots[i][1] })));
    const sim = new Combat(fighters, this.rng.fork(), {});
    this._monsterHooks(sim);
    const result = sim.run();
    return { kind: 'pve', a: p.i, b: 'pve', sim, result, events: sim.ev };
  }

  _monsterHooks(sim) { // 食人妖回血 / 座狼攻速
    const origKill = sim.kill.bind(sim);
    sim.kill = (tgt, src) => {
      origKill(tgt, src);
      if (tgt.isMonster) {
        for (const m of sim.team(1)) {
          if (!m.isMonster) continue;
          if (m.def.monster.onAllyDeathHealFull) m.hp = m.maxHp;
          if (m.def.monster.onAllyDeathAS) sim.buff(m, { asPct: m.def.monster.onAllyDeathAS }, 999);
        }
      }
    };
  }

  // ---------- 结算 ----------
  resolveRound() {
    const { round, combats } = this.pending;
    const stage = round.stage;
    const stageDmg = STAGE_DAMAGE[Math.min(stage, STAGE_DAMAGE.length) - 1];
    for (const cb of combats) {
      const pa = this.players[cb.a];
      if (cb.kind === 'pve') {
        const won = cb.result.winner === 0;
        this._afterCombat(pa, won, false, true);
        if (won) {
          this._grantDrops(pa, stage, round.wave ?? 6);
        } else {
          const dmg = stageDmg + cb.result.survivors[1];
          this._damagePlayer(pa, dmg, '野怪');
          this._hobbitDice(pa);
        }
        this.addLog(`${pa.name} ${won ? '击败了野怪' : '败给了野怪'}`);
      } else {
        const pb = this.players[cb.b];
        const winner = cb.result.winner;
        const aWon = winner === 0, draw = winner === 'draw';
        // 魔苟斯汲取
        if (cb.sim.morgothSteal) {
          const st = cb.sim.morgothSteal;
          const owner = st.team === 0 ? pa : pb, foe = st.team === 0 ? pb : pa;
          owner.hp = Math.min(100, owner.hp + st.amount);
          if (!cb.ghost || foe === pa) { if (foe.hp > 1) foe.hp -= 1; }
          this.addLog(`魔苟斯为 ${owner.name} 汲取了生命`);
        }
        if (draw) {
          this._afterCombat(pa, false, true); if (!cb.ghost) this._afterCombat(pb, false, true);
          this._damagePlayer(pa, stageDmg + cb.result.survivors[1], pb.name);
          if (!cb.ghost) this._damagePlayer(pb, stageDmg + cb.result.survivors[0], pa.name);
          this._hobbitDice(pa); if (!cb.ghost) this._hobbitDice(pb);
        } else {
          const wP = aWon ? pa : pb, lP = aWon ? pb : pa;
          const wSurv = cb.result.survivors[aWon ? 0 : 1];
          this._afterCombat(pa, aWon, false);
          if (!cb.ghost) this._afterCombat(pb, !aWon, false);
          if (aWon || !cb.ghost) { if (!(cb.ghost && !aWon)) wP.pvpWins++; }
          const loserReal = !(cb.ghost && lP === pb);
          if (loserReal) {
            this._damagePlayer(lP, stageDmg + wSurv, wP.name);
            this._hobbitDice(lP);
          }
          this.addLog(`${wP.name} 战胜了 ${lP.name}${cb.ghost ? '（镜像）' : ''}`);
        }
      }
    }
    // 淘汰检查
    for (const p of this.players) {
      if (p.alive && p.hp <= 0) {
        p.alive = false;
        for (const u of allUnits(p)) this.pool[u.def.id] += Math.pow(3, u.star - 1);
        p.bench = Array(9).fill(null); p.board = [];
        this.addLog(`☠ ${p.name} 被淘汰（第 ${this.alivePlayers().length + 1} 名）`);
      }
    }
    const alive = this.alivePlayers();
    if (alive.length <= 1 || !this.players[0].alive) {
      this.over = true; this.phase = 'over';
      this.placement = this.players[0].alive ? 1 : this.alivePlayers().length + 1;
      return;
    }
    // 下一回合
    this.roundIdx++;
    const next = this.roundInfo();
    // X-4 发牌（简化选秀）
    if (next.type === 'pvp' && next.pos === 3) {
      for (const p of this.alivePlayers()) p.items.push(makeComponentItem(this.rng.pick(this.rng.next() < 0.3 ? T2_COMPS : T1_COMPS)));
      this.addLog(`${next.stage}-4 选秀：每人获得一件散件。`);
    }
    // 矮人交界装备（羁绊激活时一次性）
    for (const p of this.alivePlayers()) {
      const tier = traitTier('dwarf', new Set(p.board.filter(b => b.unit.def.races.includes('dwarf')).map(b => b.unit.def.id)).size);
      if (tier > p.dwarfGranted) {
        p.dwarfGranted = tier;
        const c1 = this.rng.pick(T1_COMPS), c2 = this.rng.pick(T1_COMPS);
        const it = makeCombinedItem(c1, c2);
        if (it) { p.items.push(it); this.addLog(`${p.name} 获得矮人的交界装备：${it.name}`); }
      }
    }
    for (const p of this.alivePlayers()) if (!p.shopLocked) rollShop(this, p);
    this.pending = null;
    this.phase = 'planning';
  }

  _afterCombat(p, won, draw, pve) {
    if (pve) {
      // 野怪不计入连胜连败：赢不加连胜，输只断掉连胜
      if (!won) p.streakW = 0;
    } else if (draw) { p.streakW = 0; p.streakL++; }
    else if (won) { p.streakW++; p.streakL = 0; }
    else { p.streakL++; p.streakW = 0; }
    income(p, won && !draw);
    addXp(this, p, 2);
    p.lastResult = draw ? 'draw' : won ? 'win' : 'loss';
  }

  _damagePlayer(p, dmg, from) {
    p.hp -= dmg;
    this.addLog(`${p.name} 受到 ${dmg} 点伤害（${from}）`);
  }

  _hobbitDice(p) {
    const hobbits = new Set(p.board.filter(b => b.unit.def.races.includes('hobbit')).map(b => b.unit.def.id)).size;
    const tier = traitTier('hobbit', hobbits);
    if (!tier) return;
    let rolls = tier === 1 ? 2 : tier === 2 ? 3 : 4;
    if (tier >= 3) { p.hp = Math.min(100, p.hp + 3); rolls = 4; }
    for (let i = 0; i < rolls; i++) this._grantReward(p, hobbitReward(p.streakL, this.rng));
    this.addLog(`${p.name} 的霍比特人掷出了骰子（×${rolls}）`);
  }

  _grantReward(p, rw) {
    if (!rw) return;
    if (rw.gold) p.gold += rw.gold;
    if (rw.comp1) for (let i = 0; i < rw.comp1; i++) p.items.push(makeComponentItem(this.rng.pick(T1_COMPS)));
    if (rw.comp2) for (let i = 0; i < rw.comp2; i++) p.items.push(makeComponentItem(this.rng.pick(T2_COMPS)));
    for (const k of ['cards1', 'cards2', 'cards3', 'cards4', 'cards5']) {
      if (!rw[k]) continue;
      const cost = +k.slice(5);
      for (let i = 0; i < rw[k]; i++) {
        const cands = UNITS.filter(u => u.cost === cost && this.pool[u.id] > 0);
        if (!cands.length) { p.gold += cost; continue; }
        const def = this.rng.pick(cands);
        const bs = benchSpace(p);
        if (bs < 0) { p.gold += cost; continue; }
        this.pool[def.id]--;
        p.bench[bs] = makeUnit(def.id);
        tryMerge(this, p, def.id);
      }
    }
  }

  _grantDrops(p, stage, wave) {
    const drops = pveDrops(stage, wave, this.rng);
    for (const d of drops) {
      if (d.t === 'comp1') p.items.push(makeComponentItem(this.rng.pick(T1_COMPS)));
      else if (d.t === 'comp2') p.items.push(makeComponentItem(this.rng.pick(T2_COMPS)));
      else if (d.t === 'gold') p.gold += d.n || 2;
      else this._grantReward(p, openBag(d.t, stage, this.rng));
    }
    this.addLog(`${p.name} 获得了野怪掉落`);
  }
}
