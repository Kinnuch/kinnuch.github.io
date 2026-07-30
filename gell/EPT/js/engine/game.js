// EPT · 对局流程（回合、配对、结算、掉落、淘汰）
import { makeRng } from './rng.js';
import { Combat, makeFighter, makeMonsterFighter, resetFid } from './combat.js';
import { makePool, makePlayer, makeUnit, rollShop, income, addXp, allUnits, benchSpace, tryMerge, resetUid } from './player.js';
import { UNITS, UNITS_BY_ID, STAGE_DAMAGE } from '../../data/units.js';
import { MONSTERS, STAGE1_WAVES, pveWave, pveDrops, openBag, hobbitReward } from '../../data/monsters.js';
import { T1_COMPS, T2_COMPS, makeComponentItem, makeCombinedItem, makeConsumable, makeSilmaril, upgradeComponent, reforgeItem } from '../../data/items.js';
import { countTraits, traitTier, TRAITS } from '../../data/traits.js';
import { SHOP_ODDS } from '../../data/units.js';
import { COLS } from './hex.js';
import { runAI } from './ai.js';

const AI_NAMES = ['埃尔隆德', '瑟兰督伊', '凯勒博恩', '巴德', '丹恩', '埃奥梅尔', '铁蹄'];
const AI_STYLES = ['gambling', 'balancing', 'strategic'];

export class Game {
  constructor(seed, humanName = '你', opts = {}) {
    resetUid(); resetFid(); // 联机各端计数一致
    this.online = !!opts.roster;
    this.rng = makeRng(seed);
    this.pool = makePool();
    if (opts.roster) {
      this.players = opts.roster.map((r, i) => makePlayer(i, r.name, r.isAI, AI_STYLES[i % 3]));
    } else {
      this.players = [makePlayer(0, humanName, false)];
      for (let i = 0; i < 7; i++) this.players.push(makePlayer(i + 1, AI_NAMES[i], true, AI_STYLES[i % 3]));
    }
    this.roundIdx = 0;
    this.phase = 'planning';
    this.log = [];
    this.pending = null;
    this.over = false;
    // 1-1：共享轮转选秀
    for (const p of this.players) { p.gold = 3; rollShop(this, p); }
    this.startCarousel('first');
    this.addLog('1-1 选秀开始！');
  }

  // ---------- 共享轮转选秀（M2） ----------
  startCarousel(kind) {
    const offers = [];
    for (let i = 0; i < 9; i++) {
      let def;
      if (kind === 'first') def = this.rng.pick(UNITS.filter(u => u.cost === 1));
      else {
        const costs = kind <= 2 ? [1, 2, 2, 3] : kind === 3 ? [2, 3, 3, 4] : kind === 4 ? [3, 3, 4, 4] : [3, 4, 4, 5];
        const c = this.rng.pick(costs);
        def = this.rng.pick(UNITS.filter(u => u.cost === c));
      }
      const comp = kind === 'first' ? this.rng.pick(T1_COMPS) : (this.rng.next() < 0.3 ? this.rng.pick(T2_COMPS) : this.rng.pick(T1_COMPS));
      offers.push({ defId: def.id, comp, takenBy: null });
    }
    const alive = this.alivePlayers();
    const order = (kind === 'first' ? this.rng.shuffle(alive) : alive.slice().sort((a, b) => a.hp - b.hp)).map(p => p.i);
    this.carousel = { offers, order, released: 0, done: false };
  }

  carouselRelease() { // 放行下一批（2名）；AI 被放行后立即选
    const c = this.carousel;
    if (!c) return;
    c.released = Math.min(c.released + 2, c.order.length);
    for (let k = 0; k < c.released; k++) {
      const p = this.players[c.order[k]];
      if (!p.alive || c.offers.some(o => o.takenBy === p.i)) continue;
      if (p.isAI) this.carouselPick(p, this.aiCarouselChoice(p));
    }
    this._carouselCheckDone();
  }

  aiCarouselChoice(p) {
    const mine = allUnits(p);
    let best = -1, bestS = -1;
    this.carousel.offers.forEach((o, i) => {
      if (o.takenBy !== null) return;
      const def = UNITS_BY_ID[o.defId];
      let s = def.cost * 3 + this.rng.next();
      if (mine.some(u => u.def.id === def.id)) s += 20;
      s += mine.reduce((a, u) => a + u.def.races.filter(r => def.races.includes(r)).length + u.def.classes.filter(x => def.classes.includes(x)).length, 0);
      if (s > bestS) { bestS = s; best = i; }
    });
    return best;
  }

  carouselPick(p, idx) {
    const c = this.carousel;
    if (!c || idx < 0) return false;
    const o = c.offers[idx];
    const pos = c.order.indexOf(p.i);
    if (!o || o.takenBy !== null || pos < 0 || pos >= c.released) return false;
    if (c.offers.some(x => x.takenBy === p.i)) return false;
    o.takenBy = p.i;
    if (this.pool[o.defId] > 0) this.pool[o.defId]--;
    const u = makeUnit(o.defId);
    p.items.push(makeComponentItem(o.comp)); // 棋子与装备自动分离
    const bs = benchSpace(p);
    if (bs >= 0) { p.bench[bs] = u; tryMerge(this, p, o.defId); }
    else p.gold += u.def.cost;
    this.addLog(`${p.name} 选秀拿到了 ${u.def.name}`);
    this._carouselCheckDone();
    return true;
  }

  _carouselCheckDone() {
    const c = this.carousel;
    if (!c) return;
    const aliveCount = c.order.filter(i => this.players[i].alive).length;
    if (c.offers.filter(o => o.takenBy !== null).length >= aliveCount) c.done = true;
  }

  carouselFinish() { // 收尾：未选的玩家强制补选
    const c = this.carousel;
    if (!c) return;
    c.released = c.order.length;
    for (const pi of c.order) {
      const p = this.players[pi];
      if (!p.alive || c.offers.some(o => o.takenBy === pi)) continue;
      const idx = p.isAI ? this.aiCarouselChoice(p) : c.offers.findIndex(o => o.takenBy === null);
      if (idx >= 0) this.carouselPick(p, idx);
    }
    this.carousel = null;
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
    if (this.carousel) this.carouselFinish(); // 安全网：选秀未结束则强制结算
    const round = this.roundInfo();
    // AI 规划；所有人类玩家人口未满时自动补位
    for (const p of this.players) if (p.isAI && p.alive) runAI(this, p);
    for (const p of this.players) if (!p.isAI && p.alive) this.autoFillBoard(p);
    const combats = [];
    if (round.type === 'pve') {
      for (const p of this.alivePlayers()) combats.push(this.buildPvE(p, round));
    } else {
      // 配对：优先匹配上一场没打过的对手
      const pool = this.rng.shuffle(this.alivePlayers());
      while (pool.length > 1) {
        const p1 = pool.shift();
        let idx = pool.findIndex(q => q.i !== p1.lastOpp && q.lastOpp !== p1.i);
        if (idx < 0) idx = 0;
        const p2 = pool.splice(idx, 1)[0];
        p1.lastOpp = p2.i; p2.lastOpp = p1.i;
        combats.push(this.buildPvP(p1, p2, false));
      }
      if (pool.length === 1) {
        const solo = pool[0];
        const others = this.alivePlayers().filter(p => p !== solo);
        const fresh = others.filter(p => p.i !== solo.lastOpp);
        const ghostSrc = fresh.length ? this.rng.pick(fresh) : this.rng.pick(others);
        solo.lastOpp = ghostSrc.i;
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
      return makeFighter({ def: b.unit.def, star: b.unit.star, items: b.unit.items, progress: b.unit.progress, extraTraits: b.unit.extraTraits, pos }, team, { player: p });
    });
  }

  // ---------- 消耗道具（M2） ----------
  useConsumableOnUnit(p, cons, uid) {
    const u = [...p.bench.filter(Boolean), ...p.board.map(b => b.unit)].find(x => x.uid === uid);
    if (!u) return '找不到目标棋子';
    const t = cons.type;
    if (t === 'smallDup' || t === 'bigDup') {
      if (t === 'smallDup' && u.def.cost > 3) return '小复制器只能复制 1~3 费棋子';
      const bs = p.bench.findIndex(x => x === null);
      if (bs < 0) return '备战席已满';
      if (this.pool[u.def.id] > 0) this.pool[u.def.id]--;
      p.bench[bs] = makeUnit(u.def.id);
      tryMerge(this, p, u.def.id);
      this.addLog(`${p.name} 复制了 ${u.def.name}`);
    } else if (t === 'jobBook') {
      if (u.extraTraits && u.extraTraits.length) return '该棋子已经转职过了';
      const pick = cons.trait || this.rng.pick(Object.keys(TRAITS).filter(id => !['vala', 'dog'].includes(id)));
      if (u.def.races.includes(pick) || u.def.classes.includes(pick)) return '该棋子已拥有此羁绊';
      u.extraTraits = [pick];
      this.addLog(`${u.def.name} 佩上纹章，获得了【${TRAITS[pick].name}】羁绊`);
    } else if (t === 'dice') {
      this.rollShopDice(p, u);
      this.addLog(`${p.name} 掷出了骰子（定向 ${u.def.name}）`);
    } else if (t === 'silmaril') {
      if (u.items.length >= 3) return '装备栏已满';
      if (u.items.some(i => i.eff && i.eff.thief)) return '装备栏被小偷偷占用';
      u.items.push(makeSilmaril());
      this.addLog(`${u.def.name} 戴上了精灵宝钻！`);
    } else if (t === 'remover') {
      const keep = [], removed = [];
      for (const it of u.items) (it.eff && it.eff.silmaril ? keep : removed).push(it);
      if (!removed.length) return '该棋子没有可卸下的装备';
      u.items = keep;
      p.items.push(...removed);
    } else return '该道具不能用在棋子上';
    p.items = p.items.filter(x => x !== cons);
    return true;
  }

  useConsumableOnItem(p, cons, target) {
    if (target === cons || !p.items.includes(target)) return '目标无效';
    let result = null;
    if (cons.type === 'upgrader') {
      if (target.kind !== 'component' || target.tier !== 1 || target.isAL) return '只能升级小散件';
      result = upgradeComponent(target);
    } else if (cons.type === 'reforger') {
      if (target.kind === 'consumable' || target.kind === 'artifact') return '该装备无法重铸';
      result = reforgeItem(target, this.rng);
    } else return '该道具不能用在装备上';
    if (!result) return '重铸失败';
    p.items[p.items.indexOf(target)] = result;
    p.items = p.items.filter(x => x !== cons);
    this.addLog(`${p.name} 获得了 ${result.name}`);
    return true;
  }

  rollShopDice(p, u) {
    const traits = new Set([...u.def.races, ...u.def.classes, ...(u.extraTraits || [])]);
    for (const s of p.shop) if (s) this.pool[s] = (this.pool[s] || 0) + 1;
    const odds = SHOP_ODDS[p.level];
    for (let i = 0; i < 5; i++) {
      p.shop[i] = null;
      const r = this.rng.next() * 100;
      let acc = 0, cost = 1;
      for (let c = 0; c < 5; c++) { acc += odds[c]; if (r < acc) { cost = c + 1; break; } }
      let cands = UNITS.filter(x => x.cost === cost && this.pool[x.id] > 0 &&
        (x.races.some(t => traits.has(t)) || x.classes.some(t => traits.has(t))));
      if (!cands.length) cands = UNITS.filter(x => x.cost === cost && this.pool[x.id] > 0);
      if (!cands.length) continue;
      const def = this.rng.pick(cands);
      p.shop[i] = def.id;
      this.pool[def.id]--;
    }
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
        if (cb.sim.goldLoot && cb.sim.goldLoot[0]) pa.gold += cb.sim.goldLoot[0];
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
        // 贝伦【独手夺钻】搜刮
        if (cb.sim.goldLoot) {
          if (cb.sim.goldLoot[0]) pa.gold += cb.sim.goldLoot[0];
          if (cb.sim.goldLoot[1] && !cb.ghost) pb.gold += cb.sim.goldLoot[1];
        }
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
        p.placement = this.alivePlayers().length + 1;
        for (const u of allUnits(p)) this.pool[u.def.id] += Math.pow(3, u.star - 1);
        p.bench = Array(9).fill(null); p.board = [];
        this.addLog(`☠ ${p.name} 被淘汰（第 ${p.placement} 名）`);
      }
    }
    const alive = this.alivePlayers();
    if (alive.length <= 1 || (!this.online && !this.players[0].alive)) {
      // 存活者按当前血量排定最终名次
      alive.slice().sort((a, b) => b.hp - a.hp).forEach((p, i) => p.placement = i + 1);
      this.over = true; this.phase = 'over';
      this.placement = this.players[0].placement || 1;
      return;
    }
    // 下一回合
    this.roundIdx++;
    const next = this.roundInfo();
    // X-4 共享轮转选秀
    if (next.type === 'pvp' && next.pos === 3) {
      this.startCarousel(next.stage);
      this.addLog(`${next.stage}-4 选秀开始！`);
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
    if (rw.compAL) p.items.push(makeComponentItem('al'));
    // 消耗道具（AI 不会使用，折算为金币）
    const CONS_GOLD = { smallDup: 3, bigDup: 6, jobBook: 5, dice: 2, silmaril: 8, remover: 1, reforger: 2, upgrader: 4 };
    for (const key of Object.keys(CONS_GOLD)) {
      if (!rw[key]) continue;
      if (p.isAI) { p.gold += CONS_GOLD[key]; continue; }
      const item = makeConsumable(key);
      if (key === 'jobBook') { // 转职书：获得时即随机定羁绊，命名为「XX纹章」
        const pick = this.rng.pick(Object.keys(TRAITS).filter(id => !['vala', 'dog'].includes(id)));
        item.trait = pick;
        item.name = TRAITS[pick].name + '纹章';
        item.note = `使一名己方棋子获得【${TRAITS[pick].name}】羁绊（每名棋子仅能转职一次）。`;
      }
      p.items.push(item);
      this.addLog(`${p.name} 获得了 ${item.name}`);
    }
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
