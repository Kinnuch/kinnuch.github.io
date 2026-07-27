// EPT · 战斗模拟器（确定性：固定0.1s步长 + 注入rng，不依赖DOM）
import { hexDist, neighbors, key, COLS, ROWS } from './hex.js';
import { unitStatsAtStar, affSum, UNITS_BY_ID } from '../../data/units.js';
import { countTraits, FLAGGER_BONUS } from '../../data/traits.js';
import { makeLightItem, LIGHT_ITEM_NAMES } from '../../data/items.js';

const DT = 0.1, MAX_T = 45, OVERTIME = 10;

let FID = 1;

// unit: {def, star, items[], progress, pos:{c,r}}   playerCtx: {pvpWins, elfCount?}
export function makeFighter(unit, team, playerCtx) {
  const def = unit.def;
  const base = unitStatsAtStar(def, unit.star);
  const prog = unit.progress || {};
  const f = {
    id: FID++, def, star: unit.star, lvl: Math.min(unit.star, 3) - 1,
    align: def.align, team, items: unit.items || [], tempItems: [],
    base, playerCtx: playerCtx || {},
    pos: { ...unit.pos }, alive: true,
    maxHp: base.hp + (prog.mkHp || 0), hp: 0,
    mana: def.mana[0], manaMax: def.mana[1], breakMana: 0, manaLockUntil: 0,
    bonus: { ad: (prog.mkAd || 0), adPct: 0, asPct: 0, armor: 0, cn: 0, mn: 0, cc: (prog.mkAd || 0), mc: 0, critR: 15, critD: 150, vamp: 0, amp: 0, dr: 0, hpFlat_: 0, hpPct: 0, hsPct: 0, ten: 0, startMana: 0, manaOnAttack: 0, manaOnCast: 0 },
    buffs: [], st: {}, shields: [],
    atkCd: 0, moveCd: 0, atkCount: 0, target: null,
    flags: {}, unitRef: unit,
  };
  return f;
}

export function makeMonsterFighter(m, count, idx, pos) {
  return {
    id: FID++, def: { id: m.id, name: m.name, races: [], classes: [], align: 'phys', monster: m, range: m.range, mana: [0, 9999] },
    star: 1, lvl: 0, align: 'phys', team: 1, items: [], tempItems: [], playerCtx: {},
    base: { ad: m.ad, armor: m.armor || 0, cc: 0, mc: 0, cn: m.cn || 0, mn: m.mn || 0, ten: 0, hp: m.hp, as: m.as },
    pos, alive: true, maxHp: m.hp, hp: 0,
    mana: 0, manaMax: 9999, breakMana: 0, manaLockUntil: 0,
    bonus: { ad: 0, adPct: 0, asPct: 0, armor: 0, cn: 0, mn: 0, cc: 0, mc: 0, critR: 0, critD: 150, vamp: 0, amp: 0, dr: 0, hpFlat_: 0, hpPct: 0, hsPct: 0, ten: 0, startMana: 0, manaOnAttack: 0, manaOnCast: 0 },
    buffs: [], st: {}, shields: [],
    atkCd: 0, moveCd: 0, atkCount: 0, target: null, flags: {}, unitRef: null, isMonster: true,
  };
}

function statOfUnit(f) { return f.def.monster ? { as: f.base.as, range: f.def.range, speed: f.def.monster.speed } : { as: f.def.as, range: f.def.range, speed: f.def.speed }; }

export class Combat {
  constructor(fighters, rng, opts = {}) {
    this.f = fighters; this.rng = rng; this.t = 0;
    this.ev = []; this.done = false; this.result = null;
    this.opts = opts; this.traitInfo = [null, null];
    this.overtimeApplied = false;
    this._setup();
  }

  emit(e) { e.t = this.t; this.ev.push(e); }
  team(n) { return this.f.filter(x => x.team === n && x.alive); }
  enemies(f) { return this.f.filter(x => x.team !== f.team && x.alive && !this.isUntargetable(x)); }
  allies(f) { return this.f.filter(x => x.team === f.team && x.alive); }
  isUntargetable(f) { return (f.st.untargetableUntil || 0) > this.t; }

  // ---------- 静态加成 ----------
  _setup() {
    for (const f of this.f) {
      // 装备静态属性
      for (const it of f.items) this._applyItemStats(f, it);
    }
    for (const team of [0, 1]) this._applyTraits(team);
    for (const f of this.f) {
      f.maxHp = Math.round((f.maxHp + f.bonus.hpFlat_) * (1 + f.bonus.hpPct / 100));
      f.hp = f.maxHp;
      f.mana = Math.min(f.manaMax, f.mana + f.bonus.startMana);
      // 开战护盾类
      if (f.bonus.startShieldPct_) this.addShield(f, f.maxHp * f.bonus.startShieldPct_ / 100, 8, f);
      if (f.bonus.startShieldFlat_) this.addShield(f, f.bonus.startShieldFlat_, 8, f);
      this.emit({ k: 'spawn', id: f.id, team: f.team, defId: f.def.id, name: f.def.name, star: f.star, c: f.pos.c, r: f.pos.r, hp: f.maxHp, monster: !!f.isMonster, mana: Math.round(f.mana), manaMax: f.manaMax, items: [...f.items, ...f.tempItems].map(i => i.name) });
    }
  }

  _applyItemStats(f, it) {
    const s = it.stats || {}; const b = f.bonus;
    b.hpFlat_ = b.hpFlat_ || 0;
    if (s.adPct) b.adPct += s.adPct;
    if (s.asPct) b.asPct += s.asPct;
    if (s.armor) b.armor += s.armor;
    if (s.hp) b.hpFlat_ += s.hp;
    if (s.hpPct) b.hpPct += s.hpPct;
    if (s.mana) b.startMana += s.mana;
    if (s.critR) b.critR += s.critR;
    if (s.critD) b.critD += s.critD;
    if (s.hsPct) b.hsPct += s.hsPct;
    if (s.sp) { if (this._adaptSide(f) === 'cc') b.cc += s.sp; else b.mc += s.sp; }
    if (s.spLight) b.cc += s.spLight;
    if (s.mres) { if (this._adaptResSide(f) === 'cn') b.cn += s.mres; else b.mn += s.mres; }
    if (s.affAll) { // 双圣树的光辉散件：六维各+4 → 近似换算派生
      b.ad += 20; b.armor += 12; b.cc += 16; b.mc += 16; b.cn += 12; b.mn += 12; b.ten += 8;
    }
    const e = it.eff;
    if (e) {
      if (e.dmgAmp) b.amp += e.dmgAmp;
      if (e.vamp) b.vamp += e.vamp;
      if (e.dr) b.dr += e.dr;
      if (e.manaOnAttack) b.manaOnAttack += e.manaOnAttack;
      if (e.manaOnCast) b.manaOnCast += e.manaOnCast;
      if (e.startShieldPct) b.startShieldPct_ = (b.startShieldPct_ || 0) + e.startShieldPct;
      if (e.startMana) b.startMana += e.startMana;
    }
  }
  _adaptSide(f) { const cc = f.base.cc + f.bonus.cc, mc = f.base.mc + f.bonus.mc; if (cc === mc) return f.align === 'dark' ? 'mc' : 'cc'; return cc > mc ? 'cc' : 'mc'; }
  _adaptResSide(f) { const cn = f.base.cn + f.bonus.cn, mn = f.base.mn + f.bonus.mn; if (cn === mn) return f.align === 'dark' ? 'mn' : 'cn'; return cn > mn ? 'cn' : 'mn'; }

  _applyTraits(team) {
    const members = this.f.filter(x => x.team === team && !x.isMonster);
    if (!members.length) { this.traitInfo[team] = { list: [], tiers: {} }; return; }
    const traits = countTraits(members);
    const tiers = {}; for (const tr of traits) if (tr.tier > 0) tiers[tr.id] = tr.tier;
    this.traitInfo[team] = { list: traits, tiers };
    const T = tiers;
    const elfCount = new Set(members.filter(m => m.def.races.some(r => ['noldor', 'sinda', 'gondolin', 'fingolfinH'].includes(r))).map(m => m.def.id)).size;

    for (const f of members) {
      const b = f.bonus; b.hpFlat_ = b.hpFlat_ || 0;
      const has = id => f.def.races.includes(id) || f.def.classes.includes(id);
      if (T.warrior && has('warrior')) { b.dr += [5, 10, 17, 33][T.warrior - 1]; f.warriorVamp = [10, 15, 22, 30][T.warrior - 1]; b.vamp += f.warriorVamp; }
      if (T.dwarf && has('dwarf')) b.dr += [8, 15][T.dwarf - 1];
      if (T.mankind && has('mankind')) b.hpFlat_ += [100, 200, 300, 500][T.mankind - 1];
      if (T.dunedain && has('dunedain')) {
        const mult = 1 + Math.min((this.opts.pvpWins?.[team] || 0) * 0.1, 0.7);
        b.hpFlat_ += Math.round([100, 175, 300][T.dunedain - 1] * mult);
        const v = Math.round([5, 15, 30][T.dunedain - 1] * mult);
        b.ad += v; b.cc += v;
      }
      if (T.hador && has('hador')) { b.hpPct += elfCount * T.hador; b.amp += elfCount * T.hador; }
      if (has('rohirrim')) b.ad += Math.round(10 * f.def.speed);
      if (T.mordor && has('mordor')) f.mordorAS = [5, 8, 12, 20][T.mordor - 1];
      if (T.angband && has('angband')) f.angband = { adSteal: [1, 3, 5, 15][T.angband - 1], hpSteal: [7, 12, 21, 45][T.angband - 1], adCap: [5, 21, 45, 180][T.angband - 1], hpCap: [35, 84, 189, 540][T.angband - 1], vampAtCap: [2, 5, 7, 15][T.angband - 1], stacks: 0 };
      if (T.ranger && has('ranger')) f.rangerGain = [5, 7, 10, 10, 10, 11][T.ranger - 1];
      if (T.killer >= 1 && has('killer')) f.killerMax = [30, 75][T.killer - 1];
      if (T.chivalry && has('chivalry')) f.chivalryPct = [10, 25, 60][T.chivalry - 1];
      if (T.gondolin && has('gondolin')) f.gondolinMark = [5, 10, 20][T.gondolin - 1];
    }
    if (T.mordor) this['mordorTimer' + team] = { at: [12, 10, 8, 5][T.mordor - 1], tier: T.mordor, done: false };
    if (T.adventurer) this['adv' + team] = [5, 15][T.adventurer - 1];
    if (T.executor) this['exec' + team] = [8, 20][T.executor - 1];
    // 诺多：最强大的 1/2/3/5 名获得随机光明装（当场）
    if (T.noldor) {
      const n = [1, 2, 3, 5][T.noldor - 1];
      const noldorF = members.filter(m => m.def.races.includes('noldor'))
        .sort((a, b) => affSum(b.def, b.star) - affSum(a.def, a.star));
      for (let i = 0; i < Math.min(n, noldorF.length); i++) {
        const it = makeLightItem(this.rng.pick(LIGHT_ITEM_NAMES));
        noldorF[i].tempItems.push(it);
        this._applyItemStats(noldorF[i], it);
        this.emit({ k: 'lightItem', id: noldorF[i].id, item: it.name });
      }
    }
    // 掌旗官
    if (T.flagger) {
      const flaggers = members.filter(m => m.def.classes.includes('flagger'));
      const mult = [1, 1.5, 2.5][T.flagger - 1], extra = [0.5, 0.75, 1][T.flagger - 1];
      const sum = { adPct: 0, sp: 0, vamp: 0, shield: 0 };
      for (const fl of flaggers) {
        const bo = FLAGGER_BONUS[fl.def.id];
        if (bo) for (const k of ['adPct', 'sp', 'vamp', 'shield']) sum[k] += bo[k] || 0;
      }
      const strongest = flaggers.slice().sort((a, b) => affSum(b.def, b.star) - affSum(a.def, a.star))[0];
      for (const fl of flaggers) {
        const m2 = mult + (fl === strongest ? extra : 0);
        fl.bonus.adPct += sum.adPct * m2;
        fl.bonus.vamp += sum.vamp * m2;
        if (sum.sp) { const side = this._adaptSide(fl); fl.bonus[side === 'cc' ? 'cc' : 'mc'] += sum.sp * m2; }
        if (sum.shield) fl.bonus.startShieldFlat_ = (fl.bonus.startShieldFlat_ || 0) + sum.shield * m2;
      }
    }
  }

  // ---------- 有效属性 ----------
  eff(f) {
    const b = f.bonus, st = statOfUnit(f);
    let ad = f.base.ad + b.ad, armor = f.base.armor + b.armor, cn = f.base.cn + b.cn, mn = f.base.mn + b.mn;
    let cc = f.base.cc + b.cc, mc = f.base.mc + b.mc;
    let adPct = b.adPct, asPct = b.asPct, amp = b.amp, dr = b.dr, vamp = b.vamp, critR = b.critR, critD = b.critD, ten = f.base.ten + b.ten, hs = b.hsPct;
    for (const bu of f.buffs) {
      if (bu.until < this.t) continue;
      const s = bu.stats;
      ad += s.ad || 0; armor += s.armor || 0; cn += s.cn || 0; mn += s.mn || 0; cc += s.cc || 0; mc += s.mc || 0;
      adPct += s.adPct || 0; asPct += s.asPct || 0; amp += s.amp || 0; dr += s.dr || 0; vamp += s.vamp || 0;
      critR += s.critR || 0; critD += s.critD || 0; ten += s.ten || 0;
    }
    if (f.killerMax) ad += Math.min(1, (1 - f.hp / f.maxHp) / 0.7) * f.killerMax;
    if (f.warriorVamp && f.hp < f.maxHp * 0.3) vamp += f.warriorVamp;
    let as = st.as * (1 + asPct / 100);
    if ((f.st.chillUntil || 0) > this.t) as *= 0.9;
    if (this.t >= MAX_T) as *= 1.5;
    return { ad: Math.max(1, ad * (1 + adPct / 100)), as: Math.max(0.1, as), armor: Math.max(0, armor), cn: Math.max(0, cn), mn: Math.max(0, mn), cc, mc, amp, dr: Math.min(dr, 70), vamp, critR: Math.min(critR, 100), critD, ten, hs, range: st.range, speed: st.speed };
  }
  adaptStrength(f) { const e = this.eff(f); return Math.max(e.cc, e.mc); }

  buff(f, stats, dur) { f.buffs.push({ stats, until: this.t + dur }); }
  ccDur(f, dur) { const e = this.eff(f); return (f.st.ccImmuneUntil || 0) > this.t ? 0 : dur * 100 / (100 + e.ten); }
  applyStatus(f, type, dur, src) {
    const d = ['stun', 'chill', 'disarm'].includes(type) ? this.ccDur(f, dur) : dur;
    if (d <= 0) return;
    const untilKey = type + 'Until';
    f.st[untilKey] = Math.max(f.st[untilKey] || 0, this.t + d);
    if (type === 'burn') f.st.burnSrc = src;
    if (type === 'taunt') f.st.tauntSrc = src;
    this.emit({ k: 'status', id: f.id, type, dur: d });
  }

  addShield(f, v, dur, src) {
    const e = src ? this.eff(src) : { hs: 0 };
    const val = v * (1 + e.hs / 100);
    f.shields.push({ v: val, until: this.t + dur });
    this.emit({ k: 'shield', id: f.id, v: Math.round(val), total: this.shieldTotal(f) });
  }
  shieldTotal(f) { return f.shields.reduce((s, x) => x.until >= this.t ? s + x.v : s, 0); }

  heal(f, amount, src) {
    if (!f.alive) return;
    const e = src ? this.eff(src) : { hs: 0 };
    let v = amount * (1 + e.hs / 100);
    if ((f.st.gwUntil || 0) > this.t) v *= 0.65;
    const before = f.hp;
    f.hp = Math.min(f.maxHp, f.hp + v);
    const over = v - (f.hp - before);
    // 溢出转护盾（雅凡娜的颂歌）
    for (const it of [...f.items, ...f.tempItems]) if (it.eff && it.eff.overhealShield && over > 0) this.addShield(f, Math.min(over, it.eff.overhealShield), 4, f);
    if (f.hp - before > 0.5) this.emit({ k: 'heal', id: f.id, v: Math.round(f.hp - before), hp: Math.round(f.hp) });
  }

  // ---------- 伤害 ----------
  deal(src, tgt, raw, type, o = {}) {
    if (!tgt || !tgt.alive || raw <= 0) return 0;
    const se = src ? this.eff(src) : { amp: 0, critR: 0, critD: 150, vamp: 0 };
    let crit = false;
    if (o.canCrit && this.rng.next() * 100 < se.critR) { crit = true; raw *= se.critD / 100; }
    let amp = 1 + se.amp / 100;
    for (const bu of tgt.buffs) if (bu.until >= this.t && bu.stats.takenAmp) amp *= 1 + bu.stats.takenAmp / 100;
    // 光暗相克
    if ((type === 'light' || type === 'dark') && src && ['light', 'dark'].includes(src.align) && ['light', 'dark'].includes(tgt.align)) {
      amp *= (src.align === tgt.align) ? 0.8 : 1.2;
    }
    // 冒险家
    if (src && this['adv' + src.team] !== undefined && !src.isMonster) {
      const te = this.eff(tgt); const P = te.armor, R = (te.cn + te.mn) / 2, small = Math.min(P, R);
      if (Math.abs(P - R) <= small * 0.1) amp *= 1 + this['adv' + src.team] / 100;
      else amp *= 1 + (this['adv' + src.team] === 5 ? 10 : 20) / 100;
    }
    let pre = raw * amp;
    const te = this.eff(tgt);
    let resist = 0;
    if (type === 'phys') resist = te.armor; else if (type === 'light') resist = te.cn; else if (type === 'dark') resist = te.mn;
    let post = (type === 'true' || type === 'pure') ? pre : pre * (1 - resist / (resist + 100));
    post *= (1 - te.dr / 100);
    // 护盾吸收
    let rem = post;
    for (const sh of f_activeShields(tgt, this.t)) {
      if (rem <= 0) break;
      const use = Math.min(sh.v, rem); sh.v -= use; rem -= use;
    }
    const hpBefore = tgt.hp;
    tgt.hp -= rem;
    // 都林的传承
    if (tgt.def.id === 'durin') {
      const floor = 0.1 * (this.allies(tgt).length - 1) * tgt.maxHp;
      if (floor > 0 && tgt.hp < floor) tgt.hp = Math.min(hpBefore, floor);
    }
    // 法力回复（受击）
    if (!tgt.isMonster) tgt.mana = Math.min(tgt.manaMax + tgt.breakMana, tgt.mana + Math.min(10, raw * 0.01 + post * 0.05));
    this.emit({ k: 'dmg', id: tgt.id, src: src ? src.id : 0, v: Math.round(post), type, crit, hp: Math.round(Math.max(0, tgt.hp)), shield: Math.round(this.shieldTotal(tgt)), tmana: Math.round(tgt.mana) });
    // 吸血
    if (src && se.vamp > 0) this.heal(src, post * se.vamp / 100, null);
    // 反伤类
    if (src && o.isAttack) {
      for (const it of [...tgt.items, ...tgt.tempItems]) {
        const ef = it.eff || {};
        if (ef.thorns && (!tgt.flags['thornsCd_' + it.name] || tgt.flags['thornsCd_' + it.name] <= this.t)) {
          tgt.flags['thornsCd_' + it.name] = this.t + 2;
          const side = this._adaptSide(tgt) === 'cc' ? 'light' : 'dark';
          this.deal(tgt, src, ef.thorns, side, {});
        }
        if (ef.reflectPct && type === 'phys') this.deal(tgt, src, post * ef.reflectPct / 100, 'light', {});
      }
    }
    // 处决（重创之手）
    if (tgt.alive && tgt.hp > 0 && src && this['exec' + src.team] && src.def.classes.includes('executor') && tgt.hp / tgt.maxHp * 100 < this['exec' + src.team]) {
      tgt.hp = 0;
      this.emit({ k: 'execute', id: tgt.id, src: src.id });
    }
    if (tgt.hp <= 0 && tgt.alive) this.kill(tgt, src);
    else if (crit && src) { // 窃贼手套
      for (const it of [...src.items, ...src.tempItems]) {
        const ef = it.eff || {};
        if (it.name === '窃贼手套') this.heal(src, tgt.hp * 0.02, null);
        if (ef.critLightBonus) this.deal(src, tgt, ef.critLightBonus, 'light', {});
      }
    }
    return post;
  }

  kill(tgt, src) {
    tgt.alive = false; tgt.hp = 0;
    this.emit({ k: 'die', id: tgt.id });
    if (!src) return;
    // 人类：全队击杀成长（永久）
    const T = this.traitInfo[src.team]?.tiers || {};
    if (T.mankind) {
      const v = [1, 2, 3, 5][T.mankind - 1];
      for (const m of this.team(src.team)) {
        if (!m.def.races.includes('mankind') || !m.unitRef) continue;
        const p = m.unitRef.progress = m.unitRef.progress || {};
        p.mkKills = (p.mkKills || 0) + 1; p.mkHp = (p.mkHp || 0) + v;
        m.maxHp += v; m.hp += v;
        if (p.mkKills % 10 === 0) p.mkAd = (p.mkAd || 0) + v;
      }
    }
    // 刚多林：击杀冲刺 + 易伤标记
    if (src.gondolinMark && src.alive) {
      const nt = this.nearestEnemy(src);
      if (nt) {
        this.dashAdjacent(src, nt);
        this.buff(nt, { takenAmp: src.gondolinMark }, 3);
        src.target = nt;
      }
    }
    // 技能内置击杀效果
    if (src.flags.onKillHeal) this.heal(src, src.maxHp * src.flags.onKillHeal / 100, null);
  }

  // ---------- 位置 ----------
  occupied() { const m = {}; for (const f of this.f) if (f.alive) m[key(f.pos.c, f.pos.r)] = f; return m; }
  dashAdjacent(f, tgt) {
    const occ = this.occupied();
    const opts = neighbors(tgt.pos.c, tgt.pos.r).filter(([c, r]) => !occ[key(c, r)]);
    if (opts.length) {
      const [c, r] = opts.sort((a, b) => hexDist(a[0], a[1], f.pos.c, f.pos.r) - hexDist(b[0], b[1], f.pos.c, f.pos.r))[0];
      f.pos = { c, r };
      this.emit({ k: 'move', id: f.id, c, r, dash: true });
    }
  }
  knockback(f, tgt) { // 从 f 方向推离 tgt 1格
    const occ = this.occupied();
    const opts = neighbors(tgt.pos.c, tgt.pos.r).filter(([c, r]) => !occ[key(c, r)])
      .sort((a, b) => hexDist(b[0], b[1], f.pos.c, f.pos.r) - hexDist(a[0], a[1], f.pos.c, f.pos.r));
    if (opts.length && hexDist(opts[0][0], opts[0][1], f.pos.c, f.pos.r) > hexDist(tgt.pos.c, tgt.pos.r, f.pos.c, f.pos.r)) {
      tgt.pos = { c: opts[0][0], r: opts[0][1] };
      this.emit({ k: 'move', id: tgt.id, c: tgt.pos.c, r: tgt.pos.r, dash: true });
    }
  }
  nearestEnemy(f) {
    let best = null, bd = 1e9;
    for (const e of this.enemies(f)) {
      const d = hexDist(f.pos.c, f.pos.r, e.pos.c, e.pos.r);
      if (d < bd) { bd = d; best = e; }
    }
    return best;
  }

  // ---------- 主循环 ----------
  step() {
    if (this.done) return;
    this.t = Math.round((this.t + DT) * 10) / 10;
    // 魔多邪黑塔
    for (const team of [0, 1]) {
      const mt = this['mordorTimer' + team];
      if (mt && !mt.done && this.t >= mt.at) {
        mt.done = true;
        const tier = mt.tier;
        this.emit({ k: 'mordor', team });
        for (const e of this.f.filter(x => x.team !== team && x.alive)) {
          this.deal(null, e, e.maxHp * [5, 8, 12, 20][tier - 1] / 100, 'true', {});
          const stun = [0, 0, 0.5, 1][tier - 1];
          if (stun) this.applyStatus(e, 'stun', stun);
          e.breakMana += e.manaMax * [5, 10, 15, 25][tier - 1] / 100;
        }
        for (const m of this.team(team)) if (m.mordorAS) this.buff(m, { asPct: m.mordorAS }, 999);
      }
    }
    for (const f of this.f) {
      if (!f.alive) continue;
      // 灼烧
      if ((f.st.burnUntil || 0) > this.t) {
        f.flags.burnAcc = (f.flags.burnAcc || 0) + DT;
        if (f.flags.burnAcc >= 1) { f.flags.burnAcc -= 1; this.deal(f.st.burnSrc, f, f.maxHp * 0.01, 'true', {}); }
      }
      if (!f.alive) continue;
      // 装备回复
      f.flags.regenAcc = (f.flags.regenAcc || 0) + DT;
      if (f.flags.regenAcc >= 1) {
        f.flags.regenAcc -= 1;
        for (const it of [...f.items, ...f.tempItems]) {
          const ef = it.eff || {};
          if (ef.regenPct) this.heal(f, f.maxHp * ef.regenPct / 100, null);
          if (ef.regenPctPerSec) this.heal(f, f.maxHp * ef.regenPctPerSec / 100, null);
        }
      }
      // 盾骑兵触发
      if (f.chivalryPct && !f.flags.chivDone && f.hp < f.maxHp * 0.5) {
        f.flags.chivDone = true;
        const occ = neighbors(f.pos.c, f.pos.r).map(([c, r]) => this.f.find(x => x.alive && x.team === f.team && x.pos.c === c && x.pos.r === r)).filter(Boolean);
        const group = [f, ...occ];
        const per = f.maxHp * f.chivalryPct / 100 / group.length;
        for (const g of group) this.addShield(g, per, 4, f);
      }
      // 魔苟斯风暴
      if (f.flags.storm && f.flags.storm.until > this.t) { this._stormTick(f); continue; }
      if (f.flags.storm && f.flags.storm.until <= this.t) f.flags.storm = null;
      if ((f.st.stunUntil || 0) > this.t) continue;
      // 施法
      if (!f.isMonster && f.def.skill && f.mana >= f.manaMax + f.breakMana && this.t >= f.manaLockUntil) {
        f.mana = 0; f.breakMana = 0; f.manaLockUntil = this.t + 1;
        this.emit({ k: 'cast', id: f.id, name: f.def.skill.name });
        castSkill(this, f);
        for (const it of [...f.items, ...f.tempItems]) if (it.eff && it.eff.manaOnCast) f.mana += it.eff.manaOnCast;
        if (f.bonus.manaOnCast) f.mana += f.bonus.manaOnCast;
        this.emit({ k: 'mana', id: f.id, v: Math.round(f.mana) });
        continue;
      }
      this._actMoveAttack(f);
    }
    this._checkEnd();
  }

  _stormTick(f) {
    const s = f.flags.storm;
    while (s.next <= this.t) {
      s.next = Math.round((s.next + 0.1) * 10) / 10;
      const c = this.rng.int(COLS), r = this.rng.int(ROWS);
      const hit = this.f.find(x => x.alive && x.pos.c === c && x.pos.r === r);
      this.emit({ k: 'star', c, r });
      if (!hit) { f.mana = Math.min(f.manaMax, f.mana + s.missMana); continue; }
      if (hit.team === f.team) this.addShield(hit, s.shield, 4, f);
      else this.deal(f, hit, hit.maxHp * s.pct / 100, 'true', {});
    }
  }

  _actMoveAttack(f) {
    // 目标
    if ((f.st.tauntUntil || 0) > this.t && f.st.tauntSrc && f.st.tauntSrc.alive) f.target = f.st.tauntSrc;
    if (!f.target || !f.target.alive || this.isUntargetable(f.target)) f.target = this.nearestEnemy(f);
    if (!f.target) return;
    const e = this.eff(f);
    const d = hexDist(f.pos.c, f.pos.r, f.target.pos.c, f.target.pos.r);
    if (d <= e.range) {
      f.atkCd -= DT;
      if (f.atkCd <= 0 && (f.st.disarmUntil || 0) <= this.t) {
        f.atkCd = 1 / e.as;
        this._attack(f, f.target, e);
      }
    } else {
      f.atkCd = Math.max(f.atkCd - DT, 0);
      f.moveCd -= DT;
      if (f.moveCd <= 0) {
        f.moveCd = 1 / e.speed;
        const occ = this.occupied();
        const opts = neighbors(f.pos.c, f.pos.r).filter(([c, r]) => !occ[key(c, r)]);
        if (opts.length) {
          opts.sort((a, b) => hexDist(a[0], a[1], f.target.pos.c, f.target.pos.r) - hexDist(b[0], b[1], f.target.pos.c, f.target.pos.r));
          const bd = hexDist(opts[0][0], opts[0][1], f.target.pos.c, f.target.pos.r);
          let step = null;
          if (bd < d) step = opts[0];
          else {
            // 被挡住：允许绕行（走等距格，但不折返上一格）
            const side = opts.find(([c, r]) => hexDist(c, r, f.target.pos.c, f.target.pos.r) === d && key(c, r) !== f.prevKey);
            if (side) step = side;
          }
          if (step) {
            f.prevKey = key(f.pos.c, f.pos.r);
            f.pos = { c: step[0], r: step[1] };
            this.emit({ k: 'move', id: f.id, c: f.pos.c, r: f.pos.r });
          }
        }
      }
    }
  }

  _attack(f, tgt, e) {
    f.atkCount++;
    this.emit({ k: 'atk', id: f.id, tgt: tgt.id, range: e.range });
    // 怪物 AOE
    if (f.isMonster && f.def.monster.aoe) {
      const targets = [tgt, ...neighbors(tgt.pos.c, tgt.pos.r).map(([c, r]) => this.f.find(x => x.alive && x.team !== f.team && x.pos.c === c && x.pos.r === r)).filter(Boolean)];
      for (const t2 of targets) {
        this.deal(f, t2, e.ad, 'phys', { canCrit: true, isAttack: true });
        const oh = f.def.monster.onHit;
        if (oh && t2.alive) {
          if (oh.burn) this.applyStatus(t2, 'burn', oh.burn, f);
          if (oh.gw) this.applyStatus(t2, 'gw', oh.gw);
          if (oh.stunChance && this.rng.next() < oh.stunChance) this.applyStatus(t2, 'stun', 1);
        }
      }
    } else {
      // 加尔多强化攻击
      let bonusDmg = 0;
      if (f.flags.empowered > 0) { f.flags.empowered--; bonusDmg = f.flags.empowerDmg; }
      // 弗罗多摘戒一击
      if (f.flags.ringStrike) { bonusDmg += f.flags.ringStrike; f.flags.ringStrike = 0; }
      this.deal(f, tgt, e.ad + bonusDmg, 'phys', { canCrit: true, isAttack: true });
      // on-hit 装备
      for (const it of [...f.items, ...f.tempItems]) {
        const ef = it.eff || {};
        if (ef.onHitStatus && tgt.alive) {
          this.applyStatus(tgt, ef.onHitStatus.type, ef.onHitStatus.dur, f);
          if (ef.onHitStatus.and) this.applyStatus(tgt, ef.onHitStatus.and, ef.onHitStatus.type === 'gw' ? 1 : ef.onHitStatus.dur, f);
        }
        if (ef.onHitLightPctAD && tgt.alive) this.deal(f, tgt, e.ad * ef.onHitLightPctAD / 100, 'light', {});
        if (ef.every3rdLightPctAD && f.atkCount % 3 === 0 && tgt.alive) this.deal(f, tgt, e.ad * ef.every3rdLightPctAD / 100, 'light', {});
      }
      // 安格班偷取
      if (f.angband && tgt.alive && f.angband.stacks * f.angband.adSteal < f.angband.adCap) {
        f.angband.stacks++;
        f.bonus.ad += f.angband.adSteal;
        this.buff(tgt, { ad: -f.angband.adSteal }, 999);
        this.heal(f, f.angband.hpSteal, null);
        if (f.angband.stacks * f.angband.adSteal >= f.angband.adCap) f.bonus.vamp += f.angband.vampAtCap;
      }
      // 游侠叠攻速
      if (f.rangerGain && (f.flags.rangerStacks || 0) < 12) {
        f.flags.rangerStacks = (f.flags.rangerStacks || 0) + 1;
        f.bonus.asPct += f.rangerGain;
      }
    }
    if (!f.isMonster) {
      f.mana = Math.min(f.manaMax + f.breakMana, f.mana + 10 + f.bonus.manaOnAttack);
      this.emit({ k: 'mana', id: f.id, v: Math.round(f.mana) });
    }
  }

  _checkEnd() {
    const a = this.team(0).length, b = this.team(1).length;
    if (a === 0 || b === 0) {
      this.done = true;
      this.result = { winner: a === 0 ? (b === 0 ? 'draw' : 1) : 0, survivors: [a, b], t: this.t };
      this.emit({ k: 'end', winner: this.result.winner });
      return;
    }
    if (this.t >= MAX_T && !this.overtimeApplied) { this.overtimeApplied = true; this.emit({ k: 'overtime' }); }
    if (this.t >= MAX_T + OVERTIME) {
      this.done = true;
      this.result = { winner: 'draw', survivors: [a, b], t: this.t };
      this.emit({ k: 'end', winner: 'draw' });
    }
  }

  run() { while (!this.done) this.step(); return this.result; }
}

function f_activeShields(f, t) { f.shields = f.shields.filter(s => s.until >= t && s.v > 0.5); return f.shields; }

// ---------- 技能 ----------
function castSkill(sim, f) {
  const L = f.lvl; // 0/1/2
  const e = sim.eff(f);
  const tgt = f.target && f.target.alive ? f.target : sim.nearestEnemy(f);
  const alliesIn = (range) => sim.allies(f).filter(a => a !== f && hexDist(a.pos.c, a.pos.r, f.pos.c, f.pos.r) <= range);
  const adjEnemies = (of) => neighbors(of.pos.c, of.pos.r).map(([c, r]) => sim.f.find(x => x.alive && x.team !== f.team && x.pos.c === c && x.pos.r === r)).filter(Boolean);
  const pushRohirrim = () => { if (tgt) { sim.knockback(f, tgt); sim.dashAdjacent(f, tgt); } };
  const skillHealHook = (dmg) => {
    for (const it of [...f.items, ...f.tempItems]) if (it.eff && it.eff.skillHealPct) {
      const low = sim.allies(f).sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp)[0];
      if (low) sim.heal(low, dmg * it.eff.skillHealPct / 100, f);
    }
  };
  switch (f.def.id) {
    case 'grishnakh': {
      if (!tgt) break;
      let mult = [1.5, 2.25, 3.4][L];
      if (tgt.items.length) { mult *= 1.2; f.mana += 10; }
      sim.deal(f, tgt, e.ad * mult, 'phys', { canCrit: true });
      break;
    }
    case 'duilin': {
      if (!tgt) break;
      for (let i = 0; i < 3; i++) {
        if (!tgt.alive) break;
        const d = sim.deal(f, tgt, e.ad * [0.7, 1.05, 1.6][L] + [15, 20, 30][L] + e.cc * 0, 'light', { canCrit: true });
        skillHealHook(d);
      }
      break;
    }
    case 'guthlaf': {
      if (tgt) { pushRohirrim(); sim.deal(f, tgt, e.ad * [1.6, 2.4, 3.6][L], 'phys', { canCrit: true }); }
      for (const a of alliesIn(2)) sim.buff(a, { asPct: [10, 15, 25][L] }, 4);
      break;
    }
    case 'merry': {
      sim.addShield(f, [150, 250, 400][L], 4, f);
      for (const a of alliesIn(2)) sim.buff(a, { ten: [15, 22, 35][L] }, 4);
      break;
    }
    case 'faramir': {
      if (!tgt) break;
      let mult = [1.8, 2.7, 4.0][L];
      if (tgt.target && tgt.target !== f) mult *= 1.3;
      const d = sim.deal(f, tgt, e.ad * mult, 'phys', { canCrit: true });
      skillHealHook(d);
      break;
    }
    case 'carcharoth': {
      if (!tgt) break;
      const d = sim.deal(f, tgt, e.ad * [1.6, 2.4, 3.6][L] + e.mc * [0.5, 0.75, 1.2][L], 'dark', { canCrit: true });
      sim.heal(f, d * 0.5, null); skillHealHook(d);
      break;
    }
    case 'elemmakil': {
      sim.buff(f, { armor: [12, 18, 30][L], cn: [12, 18, 30][L] }, 4);
      for (const en of adjEnemies(f)) { sim.applyStatus(en, 'taunt', 2, f); en.target = f; }
      break;
    }
    case 'khamul': {
      sim.addShield(f, [200, 300, 460][L] + e.mc * [0.4, 0.6, 0.9][L], 4, f);
      for (const en of adjEnemies(f)) { const d = sim.deal(f, en, [60, 90, 140][L] + e.mc * 0.3, 'dark', {}); skillHealHook(d); }
      break;
    }
    case 'gimli': {
      for (const en of adjEnemies(f)) {
        sim.deal(f, en, e.ad * [1.4, 2.1, 3.2][L], 'phys', { canCrit: true });
        f.bonus.armor += [5, 8, 12][L];
      }
      break;
    }
    case 'galdor': {
      if (tgt) sim.dashAdjacent(f, tgt);
      f.flags.empowered = 2; f.flags.empowerDmg = e.ad * [0.6, 0.9, 1.4][L];
      break;
    }
    case 'pippin': {
      if (tgt) { sim.deal(f, tgt, e.ad * [1.8, 2.7, 4.0][L], 'phys', { canCrit: true }); if (tgt.alive) sim.applyStatus(tgt, 'chill', 2, f); }
      sim.buff(f, { asPct: [20, 30, 45][L] }, 3);
      break;
    }
    case 'mouthofsauron': {
      if (!tgt) break;
      const d = sim.deal(f, tgt, e.ad * [1.7, 2.6, 3.9][L] + e.mc * 0.6, 'dark', { canCrit: true });
      skillHealHook(d);
      const steal = sim.eff(tgt).ad * [10, 15, 25][L] / 100;
      sim.buff(tgt, { ad: -steal }, 4); sim.buff(f, { ad: steal }, 4);
      break;
    }
    case 'theoden': {
      pushRohirrim();
      sim.addShield(f, [280, 420, 640][L] + e.armor * 0.5, 4, f);
      for (const a of alliesIn(1)) sim.buff(a, { armor: [10, 15, 25][L] }, 4);
      break;
    }
    case 'boromir': {
      if (!tgt) break;
      sim.dashAdjacent(f, tgt);
      let mult = [2.2, 3.3, 5.0][L];
      if (tgt.hp < tgt.maxHp * 0.35) mult *= 2;
      sim.deal(f, tgt, e.ad * mult, 'phys', { canCrit: true });
      break;
    }
    case 'tuor': {
      if (!tgt) break;
      const d = sim.deal(f, tgt, e.ad * [2.4, 3.6, 5.4][L] + e.cc * 0.4, 'light', { canCrit: true });
      if (tgt.alive) sim.applyStatus(tgt, 'gw', 3);
      skillHealHook(d);
      break;
    }
    case 'sam': {
      let target = tgt;
      const lowHobbit = sim.allies(f).find(a => a.def.races.includes('hobbit') && a.hp < a.maxHp * 0.5);
      let mult = [2.3, 3.4, 5.2][L];
      if (lowHobbit) {
        const threat = sim.enemies(f).find(en => en.target === lowHobbit);
        if (threat) { target = threat; mult *= 1.3; }
      }
      if (target) sim.deal(f, target, e.ad * mult, 'phys', { canCrit: true });
      break;
    }
    case 'gothmog': {
      if (!tgt) break;
      const targets = [tgt, ...adjEnemies(tgt)];
      for (const t2 of targets) {
        const d = sim.deal(f, t2, e.ad * [2.0, 3.0, 4.5][L] + e.mc * 0.6, 'dark', { canCrit: true });
        if (t2.alive) sim.applyStatus(t2, 'burn', 2, f);
        skillHealHook(d);
      }
      break;
    }
    case 'rog': {
      if (!tgt) break;
      sim.deal(f, tgt, e.ad * [2.4, 3.6, 5.4][L], 'phys', { canCrit: true });
      if (tgt.alive) tgt.bonus.armor -= [10, 15, 25][L];
      break;
    }
    case 'witchking': {
      const targets = sim.enemies(f).filter(en => hexDist(f.pos.c, f.pos.r, en.pos.c, en.pos.r) <= 2);
      for (const t2 of targets) {
        const d = sim.deal(f, t2, [140, 210, 320][L] + e.mc * [0.6, 0.9, 1.4][L], 'dark', {});
        if (t2.alive) { sim.applyStatus(t2, 'chill', 3, f); sim.buff(t2, { mn: -[10, 15, 25][L] }, 4); }
        skillHealHook(d);
      }
      break;
    }
    case 'glorfindel': {
      const cands = sim.enemies(f).filter(en => hexDist(f.pos.c, f.pos.r, en.pos.c, en.pos.r) <= 2 && !en.isMonster);
      let target = tgt;
      if (cands.length) target = cands.sort((a, b) => affSum(b.def, b.star) - affSum(a.def, a.star))[0];
      if (!target) break;
      sim.dashAdjacent(f, target);
      f.flags.onKillHeal = 30;
      const d = sim.deal(f, target, e.ad * [2.6, 3.9, 5.8][L] + e.cc * 0.6, 'light', { canCrit: true });
      f.flags.onKillHeal = 0;
      skillHealHook(d);
      break;
    }
    case 'ancalagon': {
      if (!tgt) break;
      // 直线3格：以目标方向为轴，取距离<=3且大致同方向的敌人
      const targets = sim.enemies(f).filter(en => {
        const d1 = hexDist(f.pos.c, f.pos.r, en.pos.c, en.pos.r);
        return d1 <= 3 && hexDist(tgt.pos.c, tgt.pos.r, en.pos.c, en.pos.r) <= 1;
      });
      if (!targets.includes(tgt)) targets.push(tgt);
      for (const t2 of targets) {
        const d = sim.deal(f, t2, [220, 330, 500][L] + e.mc * [0.9, 1.4, 2.1][L], 'dark', {});
        if (t2.alive) sim.applyStatus(t2, 'burn', 3, f);
        skillHealHook(d);
      }
      break;
    }
    case 'turin': {
      if (!tgt) break;
      f.flags.onKillTurin = true;
      const before = tgt.alive;
      const d = sim.deal(f, tgt, e.ad * [3.0, 4.5, 6.8][L], 'phys', { canCrit: true });
      if (before && !tgt.alive) {
        sim.buff(f, { asPct: 20 }, 999);
        sim.deal(null, f, d * 0.1, 'true', {});
      }
      break;
    }
    case 'frodo': {
      sim.applyStatus(f, 'untargetable', [2, 2.5, 3][L]);
      f.flags.ringStrike = e.ad * ([3.0, 4.5, 6.8][L] - 1);
      sim.deal(null, f, f.maxHp * 0.03, 'pure', {});
      for (const en of sim.enemies(f)) if (en.target === f) en.target = null;
      break;
    }
    case 'durin': {
      const adapt = Math.max(e.cc, e.mc);
      const shield = [300, 600, 1200][L] + adapt * [2, 3, 9][L];
      sim.addShield(f, shield, 2, f);
      const stat = [130, 260, 1000][L] + (e.armor + e.cn / 2 + e.mn / 2) * [0.15, 0.3, 2.5][L];
      const side = e.cn >= e.mn ? 'cn' : 'mn';
      sim.buff(f, { armor: stat, [side]: stat }, 2);
      f.flags.durinBoom = { at: sim.t + 2, v: shield };
      // 爆炸：注册到风暴机制外的简单延时——用 buff 到期检查
      setTimeoutSim(sim, 2, () => {
        if (!f.alive) return;
        const remain = sim.shieldTotal(f);
        if (remain > 0) for (const en of adjEnemies(f)) sim.deal(f, en, remain, 'phys', {});
      });
      break;
    }
    case 'morgoth': {
      const dur = [2, 3, 99][L] + e.mc * 0.005;
      f.flags.storm = { until: sim.t + dur, next: sim.t, shield: [50, 100, 500][L] + e.mc * [0.5, 1, 10][L], pct: [2, 4, 8][L] + e.mc * [0.08, 0.16, 1][L] / 100, missMana: [13, 9, 1][L] };
      f.st.ccImmuneUntil = sim.t + dur;
      // 专属：堕落爱努（每场一次）
      if (!f.flags.morgothStole) {
        f.flags.morgothStole = true;
        sim.morgothSteal = { team: f.team, amount: [1, 2, 75][L] };
      }
      break;
    }
    default: break;
  }
}

// 简易延时（挂在战斗对象上，由 step 驱动）
function setTimeoutSim(sim, delay, fn) {
  sim._timers = sim._timers || [];
  sim._timers.push({ at: sim.t + delay, fn });
  if (!sim._timerHooked) {
    sim._timerHooked = true;
    const origStep = sim.step.bind(sim);
    sim.step = function () {
      origStep();
      if (sim._timers) for (const tm of sim._timers.filter(x => !x.fired && x.at <= sim.t)) { tm.fired = true; tm.fn(); }
    };
  }
}
