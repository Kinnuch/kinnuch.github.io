// EPT · 战斗模拟器（确定性：固定0.1s步长 + 注入rng，不依赖DOM）
import { hexDist, neighbors, key, COLS, ROWS } from './hex.js';
import { unitStatsAtStar, affSum, UNITS_BY_ID } from '../../data/units.js';
import { countTraits, FLAGGER_BONUS, VALA_BONUS } from '../../data/traits.js';
import { makeLightItem, LIGHT_ITEM_NAMES, makeComponentItem, T1_COMPS, randomCombinedItem } from '../../data/items.js';

const DT = 0.1, MAX_T = 45, OVERTIME = 10;

let FID = 1;

// unit: {def, star, items[], progress, pos:{c,r}}   playerCtx: {pvpWins, elfCount?}
export function makeFighter(unit, team, playerCtx) {
  const def = unit.def;
  const base = unitStatsAtStar(def, unit.star);
  const prog = unit.progress || {};
  const f = {
    id: FID++, def, star: unit.star, lvl: Math.min(unit.star, 3) - 1,
    align: def.align, team, items: unit.items || [], tempItems: [], extraTraits: unit.extraTraits || [],
    base, playerCtx: playerCtx || {},
    pos: { ...unit.pos }, alive: true,
    maxHp: base.hp + (prog.mkHp || 0), hp: 0,
    mana: def.mana[0], manaMax: def.mana[1], breakMana: 0, manaLockUntil: 0,
    bonus: { ad: (prog.mkAd || 0) + (prog.permAd || 0), adPct: 0, asPct: 0, armor: 0, cn: 0, mn: 0, cc: (prog.mkAd || 0), mc: 0, critR: 15, critD: 150, vamp: 0, amp: 0, dr: 0, hpFlat_: 0, hpPct: 0, hsPct: 0, ten: 0, startMana: 0, manaOnAttack: 0, manaOnCast: 0, penFlat: 0, penPct: 0, penPctM: 0 },
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
    bonus: { ad: 0, adPct: 0, asPct: 0, armor: 0, cn: 0, mn: 0, cc: 0, mc: 0, critR: 0, critD: 150, vamp: 0, amp: 0, dr: 0, hpFlat_: 0, hpPct: 0, hsPct: 0, ten: 0, startMana: 0, manaOnAttack: 0, manaOnCast: 0, penFlat: 0, penPct: 0, penPctM: 0 },
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
    this._timers = []; this.castingUnit = null;
    this._setup();
  }

  after(delay, fn) { this._timers.push({ at: this.t + delay, fn, fired: false }); }

  emit(e) { e.t = this.t; this.ev.push(e); }
  team(n) { return this.f.filter(x => x.team === n && x.alive); }
  enemies(f) { return this.f.filter(x => x.team !== f.team && x.alive && !this.isUntargetable(x)); }
  allies(f) { return this.f.filter(x => x.team === f.team && x.alive); }
  isUntargetable(f) { return (f.st.untargetableUntil || 0) > this.t; }

  // ---------- 静态加成 ----------
  _setup() {
    for (const f of this.f) {
      // 偷偷：每场战斗随机偷来2件装备（小=散件 / 大=成装）
      const thief = f.items.find(i => i.eff && i.eff.thief);
      if (thief) {
        for (let i = 0; i < 2; i++)
          f.tempItems.push(thief.eff.thief === 'big' ? randomCombinedItem(this.rng) : makeComponentItem(this.rng.pick(T1_COMPS)));
      }
      // 装备静态属性
      for (const it of [...f.items, ...f.tempItems]) this._applyItemStats(f, it);
    }
    for (const team of [0, 1]) this._applyTraits(team);
    for (const f of this.f) {
      f.maxHp = Math.round((f.maxHp + f.bonus.hpFlat_) * (1 + f.bonus.hpPct / 100));
      f.hp = f.maxHp;
      f.mana = Math.min(f.manaMax, f.mana + f.bonus.startMana);
      // 开战护盾类
      if (f.bonus.startShieldPct_) this.addShield(f, f.maxHp * f.bonus.startShieldPct_ / 100, 8, f);
      if (f.bonus.startShieldFlat_) this.addShield(f, f.bonus.startShieldFlat_, 8, f);
      this.emit({ k: 'spawn', id: f.id, team: f.team, defId: f.def.id, name: f.def.name, star: f.star, c: f.pos.c, r: f.pos.r, hp: f.maxHp, monster: !!f.isMonster, mana: Math.round(f.mana), manaMax: f.manaMax, items: [...f.items, ...f.tempItems].map(i => ({ name: i.name, kind: i.kind, comp: i.comp, comps: i.comps, stats: i.stats, note: i.note || (i.eff && i.eff.note) || '' })) });
      if (!f.isMonster) this.emit({ k: 'stats', id: f.id, s: this.statsSnap(f) });
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
    if (s.affAll) { // 六维亲和度各+n → 按派生公式换算（双圣树的光辉 n=4 / 精灵宝钻 n=12）
      const n = s.affAll;
      b.ad += 5 * n; b.armor += 3 * n; b.cc += 4 * n; b.mc += 4 * n; b.cn += 3 * n; b.mn += 3 * n; b.ten += 2 * n;
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

    const foeSilm = this.f.filter(x => x.team !== team && [...x.items].some(i => i.eff && i.eff.silmaril)).length;
    for (const f of members) {
      const b = f.bonus; b.hpFlat_ = b.hpFlat_ || 0;
      const has = id => f.def.races.includes(id) || f.def.classes.includes(id) || f.extraTraits.includes(id);
      if (has('angband') && foeSilm) b.amp += 5 * foeSilm; // 誓言的仇恨
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
    // ---- M2 新增羁绊 ----
    for (const f of members) {
      const b = f.bonus;
      const has = id => f.def.races.includes(id) || f.def.classes.includes(id) || f.extraTraits.includes(id);
      if (T.sinda && has('sinda')) f.sindaDodge = { pct: [15, 30, 75][T.sinda - 1], pen: [10, 15, 25][T.sinda - 1], last: -99 };
      if (T.beor && has('beor')) f.st.ccImmuneUntil = 15;
      if (T.haleth && has('haleth')) f.halethPending = true;
      if (T.maia && has('maia')) f.doubleCast = true;
      if (T.killer && has('killer')) f.killerChill = true;
      if (T.wood) { b.hsPct += 15; f.ccBoost = 15; }
      if (T.wood && has('wood')) f.woodHealPct = 10;
      if (T.arcanist) { const side = this._adaptSide(f) === 'cc' ? 'cc' : 'mc'; b[side] += [20, 20, 50, 80][T.arcanist - 1]; }
      if (T.arcanist && has('arcanist')) {
        const side = this._adaptSide(f) === 'cc' ? 'cc' : 'mc';
        b[side] += [0, 30, 40, 60][T.arcanist - 1];
        b.penPctM += [0, 5, 10, 20][T.arcanist - 1];
      }
      if (T.forger) {
        const mult = has('forger') ? 2 : 1;
        b.hpFlat_ += [150, 200, 250, 400][T.forger - 1] * mult;
        b.armor += [10, 20, 30, 40][T.forger - 1] * mult;
        const rs = this._adaptResSide(f);
        b[rs] += [10, 20, 30, 40][T.forger - 1] * mult;
      }
      if (T.hunter && has('hunter')) f.hunterOn = true;
      if (T.finarfinH && has('finarfinH')) f.finarfinRegen = [3, 6][T.finarfinH - 1];
      if (has('indulger') && T.indulger) f.indulger = { tier: T.indulger, shield: [50, 100, 250][T.indulger - 1] };
      if (T.ranger >= 5 && has('ranger')) { // 隐秘/迂回
        const tier = T.ranger;
        if (tier <= 6) { f.rangerGain = 0; b.asPct += [30, 40][tier - 5]; b.dr += [9, 12][tier - 5]; f.rangerCleave = [8, 12][tier - 5]; }
        else { f.rangerGain = 11; b.asPct += 15; b.dr += 15; f.rangerCleave = 15; }
        f.rangerFirst5 = true; // 前5秒翻倍（简化：额外加同量buff 5秒）
        this.buff(f, { asPct: tier === 7 ? 15 : [30, 40][tier - 5], dr: tier === 7 ? 15 : [9, 12][tier - 5] }, 5);
      }
    }
    // 芬国昐家族：邻格友军+护甲光抗（开战时，不可叠加）
    if (T.fingolfinH) {
      const v = [10, 20][T.fingolfinH - 1];
      const fam = members.filter(m => m.def.races.includes('fingolfinH'));
      const done = new Set();
      for (const fm of fam) for (const [c, r] of neighbors(fm.pos.c, fm.pos.r)) {
        const ally = members.find(m => m.pos.c === c && m.pos.r === r && !done.has(m.id));
        if (ally) { done.add(ally.id); ally.bonus.armor += v; ally.bonus.cn += v; }
      }
    }
    // 费艾诺家族：最强大者+10%生命+10%暴伤
    if (T.feanorH) {
      const fam = members.filter(m => m.def.races.includes('feanorH')).sort((a, b) => this.strongSum(b) - this.strongSum(a))[0];
      if (fam) { fam.bonus.hpPct += 10; fam.bonus.critD += 10; }
    }
    // 维拉：恰1名→全队增益；多于1名→反转为减益
    const valas = members.filter(m => m.def.races.includes('vala'));
    if (valas.length) {
      const sign = valas.length === 1 ? 1 : -1;
      for (const v of valas) {
        const bo = VALA_BONUS[v.def.id];
        if (!bo) continue;
        for (const m of members) {
          if (bo.penFlat) m.bonus.penFlat += sign * bo.penFlat;
          if (bo.cc) m.bonus.cc += sign * bo.cc;
          if (bo.armor) m.bonus.armor += sign * bo.armor;
          if (bo.mres) m.bonus[this._adaptResSide(m)] += sign * bo.mres;
          if (bo.hsPct) m.bonus.hsPct += sign * bo.hsPct;
        }
      }
    }
    // 神犬（胡安随玩家等级觉醒）
    for (const f of members) {
      if (f.def.id !== 'huan') continue;
      const lv = this.opts.levels?.[team] || f.playerCtx.player?.level || 1;
      f.huanStage = lv >= 9 ? 3 : lv >= 7 ? 2 : lv >= 5 ? 1 : 0;
      if (f.huanStage >= 2) f.bonus.penPct += 15;
      if (f.huanStage >= 3) { f.maxHp *= 2; f.bonus.adPct += 100; f.bonus.asPct += 100; }
    }
    // 5费专属
    for (const f of members) {
      const L = f.lvl;
      if (f.def.id === 'fingolfin') {
        const uniqueNoldor = new Set(members.filter(m => m.def.races.includes('noldor')).map(m => m.def.id)).size;
        f.highKing = Math.min(uniqueNoldor * 5, 25) / 100;
        f.fingolfinLives = 0;
      }
      if (f.def.id === 'manwe') for (const m of members) m.bonus.penPct += [5, 15, 75][L];
      if (f.def.id === 'feanor') f.feanorSoul = [15, 25, 75][L];
      if (f.def.id === 'varda') f.vardaStar = [3, 6, 30][L];
      if (f.def.id === 'beleg') f.belegBow = [0.1, 0.15, 0.75][L];
      if (f.def.id === 'ecthelion') {
        f.ectFount = [0.25, 0.5, 1][L];
        for (const m of members) if (m !== f) { m.ectRef = f; m.ectShare = [3, 6, 10][Math.min(m.star, 3) - 1] / 100; }
      }
      if (f.def.id === 'aragorn') {
        const rn = (f.unitRef?.progress?.renown) || 0;
        f.aragornSkill = rn >= 300 ? 2 : rn >= 100 ? 1 : 0;
      }
    }
    if (T.mordor) this['mordorTimer' + team] = { at: [12, 10, 8, 5][T.mordor - 1], tier: T.mordor, done: false };
    if (T.adventurer) this['adv' + team] = [5, 15][T.adventurer - 1];
    if (T.executor) this['exec' + team] = [8, 20][T.executor - 1];
    if (T.hunter) this['hunterT' + team] = { next: 3 };
    // 诺多：最强大的 1/2/3/5 名获得随机光明装（当场；预演模式跳过随机分发）
    if (T.noldor && !this.opts.preview) {
      const n = [1, 2, 3, 5][T.noldor - 1];
      const noldorF = members.filter(m => m.def.races.includes('noldor'))
        .sort((a, b) => this.strongSum(b) - this.strongSum(a));
      for (let i = 0; i < Math.min(n, noldorF.length); i++) {
        const it = makeLightItem(this.rng.pick(LIGHT_ITEM_NAMES));
        noldorF[i].tempItems.push(it);
        this._applyItemStats(noldorF[i], it);
        this.emit({ k: 'lightItem', id: noldorF[i].id, item: it.name, info: { name: it.name, kind: 'light', stats: it.stats, note: (it.eff && it.eff.note) || '' } });
      }
    }
    // 掌旗官
    if (T.flagger) {
      const flaggers = members.filter(m => m.def.classes.includes('flagger') || m.extraTraits.includes('flagger'));
      const mult = [1, 1.5, 2.5][T.flagger - 1], extra = [0.5, 0.75, 1][T.flagger - 1];
      const sum = { adPct: 0, sp: 0, vamp: 0, shield: 0, asPct: 0, armor: 0, mres: 0, manaRegen: 0, hpRegen3s: 0 };
      for (const fl of flaggers) {
        const bo = FLAGGER_BONUS[fl.def.id] || (fl.extraTraits.includes('flagger') ? { hpRegen3s: 2 } : null);
        if (bo) for (const k in sum) sum[k] += bo[k] || 0;
      }
      const strongest = flaggers.slice().sort((a, b) => this.strongSum(b) - this.strongSum(a))[0];
      for (const fl of flaggers) {
        const m2 = mult + (fl === strongest ? extra : 0);
        fl.bonus.adPct += sum.adPct * m2;
        fl.bonus.asPct += sum.asPct * m2;
        fl.bonus.armor += sum.armor * m2;
        fl.bonus.vamp += sum.vamp * m2;
        if (sum.mres) fl.bonus[this._adaptResSide(fl)] += sum.mres * m2;
        if (sum.sp) { const side = this._adaptSide(fl); fl.bonus[side === 'cc' ? 'cc' : 'mc'] += sum.sp * m2; }
        if (sum.shield) fl.bonus.startShieldFlat_ = (fl.bonus.startShieldFlat_ || 0) + sum.shield * m2;
        if (sum.manaRegen) fl.flaggerManaRegen = sum.manaRegen * m2;
        if (sum.hpRegen3s) fl.flaggerHpRegen = sum.hpRegen3s * m2;
      }
    }
  }

  // ---------- 有效属性 ----------
  eff(f) {
    const b = f.bonus, st = statOfUnit(f);
    let ad = f.base.ad + b.ad, armor = f.base.armor + b.armor, cn = f.base.cn + b.cn, mn = f.base.mn + b.mn;
    let cc = f.base.cc + b.cc, mc = f.base.mc + b.mc;
    let adPct = b.adPct, asPct = b.asPct, amp = b.amp, dr = b.dr, vamp = b.vamp, critR = b.critR, critD = b.critD, ten = f.base.ten + b.ten, hs = b.hsPct;
    let penFlat = b.penFlat, penPct = b.penPct, penPctM = b.penPctM;
    for (const bu of f.buffs) {
      if (bu.until < this.t) continue;
      const s = bu.stats;
      ad += s.ad || 0; armor += s.armor || 0; cn += s.cn || 0; mn += s.mn || 0; cc += s.cc || 0; mc += s.mc || 0;
      adPct += s.adPct || 0; asPct += s.asPct || 0; amp += s.amp || 0; dr += s.dr || 0; vamp += s.vamp || 0;
      critR += s.critR || 0; critD += s.critD || 0; ten += s.ten || 0;
      penFlat += s.penFlat || 0; penPct += s.penPct || 0; penPctM += s.penPctM || 0;
    }
    if (f.killerMax) ad += Math.min(1, (1 - f.hp / f.maxHp) / 0.7) * f.killerMax;
    if (f.warriorVamp && f.hp < f.maxHp * 0.3) vamp += f.warriorVamp;
    if (f.ectFount) vamp += (1 - f.hp / f.maxHp) * 100 * f.ectFount;
    if (f.ectRef && f.ectRef.alive) vamp += (1 - f.ectRef.hp / f.ectRef.maxHp) * 100 * f.ectRef.ectFount * f.ectShare;
    let as = st.as * (1 + asPct / 100);
    if ((f.st.chillUntil || 0) > this.t) as *= 0.9;
    if (this.t >= MAX_T) as *= 1.5;
    return { ad: Math.max(1, ad * (1 + adPct / 100)), as: Math.max(0.1, as), armor: Math.max(0, armor), cn: Math.max(0, cn), mn: Math.max(0, mn), cc, mc, amp, dr: Math.min(dr, 70), vamp, critR: Math.min(critR, 100), critD, ten, hs, range: st.range, speed: st.speed, penFlat, penPct: Math.min(penPct, 90), penPctM: Math.min(penPctM, 90) };
  }
  adaptStrength(f) { const e = this.eff(f); return Math.max(e.cc, e.mc); }
  strongSum(f) { return affSum(f.def, f.star) + ([...f.items, ...f.tempItems].some(i => i.eff && i.eff.silmaril) ? 1e6 : 0); }
  statsSnap(f) {
    const e = this.eff(f);
    return { ad: Math.round(e.ad), as: Math.round(e.as * 100) / 100, armor: Math.round(e.armor), cn: Math.round(e.cn), mn: Math.round(e.mn), cc: Math.round(e.cc), mc: Math.round(e.mc), critR: Math.round(e.critR), critD: Math.round(e.critD), amp: Math.round(e.amp), dr: Math.round(e.dr), vamp: Math.round(e.vamp), ten: Math.round(e.ten) };
  }

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
    let val = v * (1 + e.hs / 100);
    for (const bu of f.buffs) if (bu.until >= this.t && bu.stats.shieldRecv) val *= 1 + bu.stats.shieldRecv / 100;
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
    if (f.hp - before > 0.5) this.emit({ k: 'heal', id: f.id, v: Math.round(f.hp - before), hp: Math.round(f.hp), src: src ? src.id : f.id });
  }

  // ---------- 伤害 ----------
  deal(src, tgt, raw, type, o = {}) {
    if (!tgt || !tgt.alive || raw <= 0) return 0;
    // 完全闪避（阿拉贡斗篷）与辛达闪避
    if (o.isAttack && src) {
      if ((tgt.st.evadeUntil || 0) > this.t) {
        this.emit({ k: 'miss', id: tgt.id });
        const ao = tgt.evadeOwner;
        if (ao && ao.alive) {
          if (ao.unitRef) { const p = ao.unitRef.progress = ao.unitRef.progress || {}; p.renown = (p.renown || 0) + 1; }
          if (ao.flags.cloakAdPer) this.buff(ao, { ad: ao.flags.cloakAdPer }, 999);
        }
        return 0;
      }
      if (tgt.sindaDodge && this.t - tgt.sindaDodge.last >= 4 && this.rng.next() * 100 < tgt.sindaDodge.pct) {
        tgt.sindaDodge.last = this.t;
        tgt.flags.sindaPenNext = tgt.sindaDodge.pen;
        this.emit({ k: 'miss', id: tgt.id });
        return 0;
      }
    }
    const se = src ? this.eff(src) : { amp: 0, critR: 0, critD: 150, vamp: 0, penFlat: 0, penPct: 0, penPctM: 0 };
    let crit = false;
    if (o.canCrit && this.rng.next() * 100 < se.critR) {
      if (src && src.belegBow) { if (tgt.alive) this.applyStatus(tgt, 'disarm', src.belegBow * (o.isAttack ? 1 : 2), src); }
      else { crit = true; raw *= se.critD / 100; }
    }
    let amp = 1 + se.amp / 100;
    for (const bu of tgt.buffs) if (bu.until >= this.t && bu.stats.takenAmp) amp *= 1 + bu.stats.takenAmp / 100;
    if (src && src.feanorSoul) amp *= 1 + src.feanorSoul * Math.min(1, (1 - tgt.hp / tgt.maxHp) / 0.7) / 100;
    if (src && src.vardaStar) amp *= 1 + src.vardaStar * hexDist(src.pos.c, src.pos.r, tgt.pos.c, tgt.pos.r) / 100;
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
    // 穿透：百分比先、固定值后
    const pPct = (se.penPct || 0) + ((type === 'light' || type === 'dark') ? (se.penPctM || 0) : 0);
    resist = Math.max(0, resist * (1 - pPct / 100) - (se.penFlat || 0));
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
    // 芬国昐【视死如归】：濒死免死（每次触发效果减半）
    if (tgt.hp <= 0 && tgt.highKing !== undefined && (tgt.flags.immortalUntil || 0) <= this.t && (tgt.fingolfinLives || 0) < 3) {
      const L = tgt.lvl, factor = Math.pow(0.5, tgt.fingolfinLives);
      tgt.fingolfinLives++;
      const dur = [1, 1.5, 10][L] * (1 + tgt.highKing) * factor;
      tgt.flags.immortalUntil = this.t + dur;
      tgt.hp = 1;
      this.buff(tgt, { asPct: 200 * factor }, dur);
      this.emit({ k: 'cast', id: tgt.id, name: '视死如归' });
      this.after(dur, () => {
        if (!tgt.alive) return;
        const t2 = tgt.target && tgt.target.alive ? tgt.target : this.nearestEnemy(tgt);
        if (!t2) return;
        const e2 = this.eff(tgt);
        this.applyStatus(t2, 'gw', [1.5, 3, 10][L] * factor);
        this.deal(tgt, t2, (e2.ad * [2, 3, 9][L] + e2.cc * [0.7, 1, 1.7][L]) * factor, 'phys', { canCrit: true });
      });
    }
    if ((tgt.flags.immortalUntil || 0) > this.t && tgt.hp < 1) tgt.hp = 1;
    // 林中隐士：技能伤害的10%治疗最低血友军
    if (src && src.woodHealPct && this.castingUnit === src) {
      const low = this.allies(src).sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp)[0];
      if (low) this.heal(low, (hpBefore - tgt.hp) * src.woodHealPct / 100, src);
    }
    // 法力回复（受击）
    if (!tgt.isMonster) tgt.mana = Math.min(tgt.manaMax + tgt.breakMana, tgt.mana + Math.min(10, raw * 0.01 + post * 0.05));
    this.emit({ k: 'dmg', id: tgt.id, src: src ? src.id : 0, v: Math.round(post), type, crit, hp: Math.round(Math.max(0, tgt.hp)), shield: Math.round(this.shieldTotal(tgt)), tmana: Math.round(tgt.mana) });
    // 吸血
    if (src && se.vamp > 0) this.heal(src, post * se.vamp / 100, null);
    // 反伤类
    if (src && o.isAttack) {
      if (tgt.flags.hurinReflect && tgt.flags.hurinReflect.until > this.t) this.deal(tgt, src, tgt.flags.hurinReflect.dmg, 'phys', {});
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
    else if (crit && src) {
      if (src.killerChill) this.applyStatus(tgt, 'chill', 1.5, src); // 杀手：暴击冰冷
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
    // 刚多林：击杀冲刺（冲到自己射程可及处，远程不贴脸）+ 易伤标记
    if (src.gondolinMark && src.alive) {
      const nt = this.nearestEnemy(src);
      if (nt) {
        this.dashToRange(src, nt);
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
  dashToRange(f, tgt) { // 冲刺到能攻击到目标的最近位置（远程停在射程边缘）
    const range = this.eff(f).range;
    if (hexDist(f.pos.c, f.pos.r, tgt.pos.c, tgt.pos.r) <= range) return;
    const occ = this.occupied();
    let best = null, bd = 1e9;
    for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
      if (occ[key(c, r)]) continue;
      if (hexDist(c, r, tgt.pos.c, tgt.pos.r) > range) continue;
      const d = hexDist(c, r, f.pos.c, f.pos.r);
      if (d < bd) { bd = d; best = [c, r]; }
    }
    if (best) { f.pos = { c: best[0], r: best[1] }; this.emit({ k: 'move', id: f.id, c: best[0], r: best[1], dash: true }); }
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
    // 延时任务
    for (const tm of this._timers) if (!tm.fired && tm.at <= this.t) { tm.fired = true; tm.fn(); }
    // 猎人：每3秒集火最高百分比血量的敌人
    for (const team of [0, 1]) {
      const ht = this['hunterT' + team];
      if (ht && this.t >= ht.next) {
        ht.next += 3;
        for (const h of this.team(team)) {
          if (!h.hunterOn) continue;
          const tgt = this.enemies(h).sort((a, b) => b.hp / b.maxHp - a.hp / a.maxHp)[0];
          if (tgt) { this.deal(h, tgt, this.eff(h).ad, 'phys', { canCrit: true }); if (tgt.alive) this.applyStatus(tgt, 'burn', 2, h); }
        }
      }
    }
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
          this.emit({ k: 'break', id: e.id, extra: Math.round(e.breakMana) });
        }
        for (const m of this.team(team)) if (m.mordorAS) this.buff(m, { asPct: m.mordorAS }, 999);
      }
    }
    const doStats = Math.round(this.t * 10) % 5 === 0; // 每0.5秒广播实时属性
    for (const f of this.f) {
      if (!f.alive) continue;
      if (doStats && !f.isMonster) this.emit({ k: 'stats', id: f.id, s: this.statsSnap(f) });
      // 灼烧
      if ((f.st.burnUntil || 0) > this.t) {
        f.flags.burnAcc = (f.flags.burnAcc || 0) + DT;
        if (f.flags.burnAcc >= 1) { f.flags.burnAcc -= 1; this.deal(f.st.burnSrc, f, f.maxHp * 0.01, 'true', {}); }
      }
      if (!f.alive) continue;
      // 装备/羁绊周期效果（每秒）
      f.flags.regenAcc = (f.flags.regenAcc || 0) + DT;
      if (f.flags.regenAcc >= 1) {
        f.flags.regenAcc -= 1;
        for (const it of [...f.items, ...f.tempItems]) {
          const ef = it.eff || {};
          if (ef.regenPct) this.heal(f, f.maxHp * ef.regenPct / 100, null);
          if (ef.regenPctPerSec) this.heal(f, f.maxHp * ef.regenPctPerSec / 100, null);
          if (ef.spRamp) {
            const key = 'spAcc_' + it.name;
            f.flags[key] = (f.flags[key] || 0) + 1;
            if (f.flags[key] >= (ef.rampEvery || 5)) {
              f.flags[key] = 0;
              f.bonus[this._adaptSide(f) === 'cc' ? 'cc' : 'mc'] += ef.spRamp;
            }
          }
        }
        if (f.flaggerManaRegen) f.mana = Math.min(f.manaMax + f.breakMana, f.mana + f.flaggerManaRegen);
        if (f.flaggerHpRegen) {
          f.flags.fhAcc = (f.flags.fhAcc || 0) + 1;
          if (f.flags.fhAcc >= 3) { f.flags.fhAcc = 0; this.heal(f, f.maxHp * f.flaggerHpRegen / 100, null); }
        }
        if (f.finarfinRegen) {
          f.flags.finAcc = (f.flags.finAcc || 0) + 1;
          if (f.flags.finAcc >= 3) { f.flags.finAcc = 0; f.mana = Math.min(f.manaMax + f.breakMana, f.mana + f.finarfinRegen); }
        }
        if (f.flags.huanDecay) this.deal(null, f, f.maxHp * 0.1, 'pure', {});
        // 护盾过期同步（供 UI 白条消退）
        const stot = this.shieldTotal(f);
        if (Math.abs((f.flags.shEmit || 0) - stot) > 1) {
          f.flags.shEmit = stot;
          this.emit({ k: 'shield', id: f.id, v: 0, total: Math.round(stot) });
        }
      }
      // 哈烈丝家族：开战7秒未阵亡
      if (f.halethPending && this.t >= 7) {
        f.halethPending = false;
        this.buff(f, { armor: 20, cn: 20 }, 999);
        f.bonus.ad += 1;
        if (f.unitRef) { const p = f.unitRef.progress = f.unitRef.progress || {}; p.permAd = (p.permAd || 0) + 1; }
      }
      // 猎人：首次跌破50%血量
      if (f.hunterOn && !f.flags.huntEvaded && f.hp < f.maxHp * 0.5) {
        f.flags.huntEvaded = true;
        this.applyStatus(f, 'untargetable', 1);
        const low = this.enemies(f).sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp)[0];
        if (low) { this.deal(f, low, this.eff(f).ad, 'phys', { canCrit: true }); if (low.alive) this.applyStatus(low, 'burn', 2, f); }
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
      // 施法（迈雅双重施法）
      if (!f.isMonster && f.def.skill && f.mana >= f.manaMax + f.breakMana && this.t >= f.manaLockUntil) {
        if (f.breakMana > 0) this.emit({ k: 'break', id: f.id, extra: 0 }); // 施法后破法解除
        f.mana = 0; f.breakMana = 0; f.manaLockUntil = this.t + 1;
        this.emit({ k: 'cast', id: f.id, name: f.def.skill.name });
        this.castingUnit = f;
        castSkill(this, f);
        if (f.doubleCast && f.alive) castSkill(this, f);
        this.castingUnit = null;
        if (f.huanStage >= 3 && f.def.id === 'huan') f.flags.huanDecay = true;
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
      // 辛达闪避后的穿透强化
      if (f.flags.sindaPenNext) { this.buff(f, { penPct: f.flags.sindaPenNext }, 0.15); f.flags.sindaPenNext = 0; }
      // 加尔多强化攻击
      let bonusDmg = 0;
      if (f.flags.empowered > 0) { f.flags.empowered--; bonusDmg = f.flags.empowerDmg; }
      // 弗罗多摘戒一击
      if (f.flags.ringStrike) { bonusDmg += f.flags.ringStrike; f.flags.ringStrike = 0; }
      this.deal(f, tgt, e.ad + bonusDmg, 'phys', { canCrit: true, isAttack: true });
      // 神犬觉醒效果
      if (f.huanStage >= 1 && tgt.alive) { this.applyStatus(tgt, 'burn', 2, f); this.applyStatus(tgt, 'gw', 2); }
      if (f.huanStage >= 2) {
        for (const t2 of neighbors(tgt.pos.c, tgt.pos.r).map(([c, r]) => this.f.find(x => x.alive && x.team !== f.team && x.pos.c === c && x.pos.r === r)).filter(Boolean))
          this.deal(f, t2, e.ad, 'phys', { isAttack: true });
        this.heal(f, f.maxHp * 0.02, null);
      }
      // on-hit 装备
      for (const it of [...f.items, ...f.tempItems]) {
        const ef = it.eff || {};
        if (ef.onHitStatus && tgt.alive) {
          this.applyStatus(tgt, ef.onHitStatus.type, ef.onHitStatus.dur, f);
          if (ef.onHitStatus.and) this.applyStatus(tgt, ef.onHitStatus.and, ef.onHitStatus.type === 'gw' ? 1 : ef.onHitStatus.dur, f);
        }
        if (ef.onHitLightPctAD && tgt.alive) this.deal(f, tgt, e.ad * ef.onHitLightPctAD / 100, 'light', {});
        if (ef.every3rdLightPctAD && f.atkCount % 3 === 0 && tgt.alive) this.deal(f, tgt, e.ad * ef.every3rdLightPctAD / 100, 'light', {});
        if (ef.asOnAttack) f.bonus.asPct += ef.asOnAttack;
        if (ef.every3rdMagic && f.atkCount % 3 === 0) {
          const type = this._adaptSide(f) === 'cc' ? 'light' : 'dark';
          const targets = ef.magicTargets >= 99 ? this.enemies(f)
            : [tgt, ...this.enemies(f).filter(x => x !== tgt)].slice(0, ef.magicTargets);
          for (const t2 of targets) this.deal(f, t2, ef.every3rdMagic, type, {});
        }
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
      this._accrueRenown();
      this.emit({ k: 'end', winner: this.result.winner });
      return;
    }
    if (this.t >= MAX_T && !this.overtimeApplied) { this.overtimeApplied = true; this.emit({ k: 'overtime' }); }
    if (this.t >= MAX_T + OVERTIME) {
      this.done = true;
      this.result = { winner: 'draw', survivors: [a, b], t: this.t };
      this._accrueRenown();
      this.emit({ k: 'end', winner: 'draw' });
    }
  }

  _accrueRenown() { // 阿拉贡【人皇】：战斗结束时存活则积攒声望
    if (this.opts.noProgress) return;
    for (const f of this.f) {
      if (!f.alive || f.def.id !== 'aragorn' || !f.unitRef) continue;
      const p = f.unitRef.progress = f.unitRef.progress || {};
      p.renown = (p.renown || 0) + this.team(f.team).length + 1;
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
  const T = sim.traitInfo[f.team]?.tiers || {};
  // 控灵者羁绊触发（对同一目标有冷却）
  const indulgerProc = (target) => {
    if (!f.indulger || !target || !target.alive) return;
    const cdKey = 'indCd_' + f.id;
    if ((target.flags[cdKey] || 0) > sim.t) return;
    target.flags[cdKey] = sim.t + [12, 9, 4][f.indulger.tier - 1];
    if (f.indulger.tier === 1) { target.breakMana += target.manaMax * 0.15; sim.emit({ k: 'break', id: target.id, extra: Math.round(target.breakMana) }); }
    else if (f.indulger.tier === 2) sim.applyStatus(target, 'stun', 0.5, f);
    else sim.applyStatus(target, 'disarm', 1, f);
    sim.addShield(f, f.indulger.shield, 4, f);
  };
  // 神射手弹射
  const trickBounce = (target, dmg, type) => {
    const tier = T.trickshot || 0;
    if (!tier || !target || dmg <= 0) return;
    const times = [1, 2][tier - 1], pct = [40, 60][tier - 1];
    let prev = target;
    for (let i = 0; i < times; i++) {
      const next = sim.enemies(f).filter(x => x !== prev)
        .sort((a, b) => hexDist(a.pos.c, a.pos.r, prev.pos.c, prev.pos.r) - hexDist(b.pos.c, b.pos.r, prev.pos.c, prev.pos.r))[0];
      if (!next) break;
      sim.deal(f, next, dmg * pct / 100, type);
      prev = next;
    }
  };
  const lowestAlly = () => sim.allies(f).sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp)[0];
  const skillHealHook = (dmg) => {
    for (const it of [...f.items, ...f.tempItems]) if (it.eff && it.eff.skillHealPct) {
      const low = sim.allies(f).sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp)[0];
      if (low) sim.heal(low, dmg * it.eff.skillHealPct / 100, f);
    }
  };
  switch (f.def.id) {
    case 'grishnakh': {
      if (!tgt) break;
      let dmg = [300, 450, 680][L] + e.ad;
      if (tgt.items.length) { dmg *= 1.2; f.mana += 10; }
      sim.deal(f, tgt, dmg, 'phys', { canCrit: true });
      break;
    }
    case 'duilin': {
      if (!tgt) break;
      let lastD = 0;
      for (let i = 0; i < 3; i++) {
        if (!tgt.alive) break;
        lastD = sim.deal(f, tgt, [90, 135, 200][L] + e.ad * 0.4 + e.cc * [0.15, 0.2, 0.3][L], 'light', { canCrit: true });
        skillHealHook(lastD);
      }
      trickBounce(tgt, lastD, 'light');
      break;
    }
    case 'guthlaf': {
      if (tgt) { pushRohirrim(); sim.deal(f, tgt, [250, 375, 560][L] + e.ad, 'phys', { canCrit: true }); }
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
      let dmg = [280, 420, 630][L] + e.ad * 0.8;
      if (tgt.target && tgt.target !== f) dmg *= 1.3;
      const d = sim.deal(f, tgt, dmg, 'phys', { canCrit: true });
      skillHealHook(d);
      break;
    }
    case 'carcharoth': {
      if (!tgt) break;
      const d = sim.deal(f, tgt, [260, 390, 580][L] + e.ad * 0.6 + e.mc * [0.5, 0.75, 1.2][L], 'dark', { canCrit: true });
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
        sim.deal(f, en, [180, 270, 400][L] + e.ad * 0.8, 'phys', { canCrit: true });
        f.bonus.armor += [5, 8, 12][L];
      }
      break;
    }
    case 'galdor': {
      if (tgt) sim.dashAdjacent(f, tgt);
      f.flags.empowered = 2; f.flags.empowerDmg = [120, 180, 270][L] + e.ad * 0.6;
      break;
    }
    case 'pippin': {
      if (tgt) { sim.deal(f, tgt, [280, 420, 630][L] + e.ad * 0.8, 'phys', { canCrit: true }); if (tgt.alive) sim.applyStatus(tgt, 'chill', 2, f); }
      sim.buff(f, { asPct: [20, 30, 45][L] }, 3);
      break;
    }
    case 'mouthofsauron': {
      if (!tgt) break;
      const d = sim.deal(f, tgt, [300, 450, 680][L] + e.ad * 0.6 + e.mc * 0.6, 'dark', { canCrit: true });
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
      let dmg = [320, 480, 720][L] + e.ad;
      if (tgt.hp < tgt.maxHp * 0.35) dmg *= 2;
      sim.deal(f, tgt, dmg, 'phys', { canCrit: true });
      break;
    }
    case 'tuor': {
      if (!tgt) break;
      const d = sim.deal(f, tgt, [400, 600, 900][L] + e.ad + e.cc * 0.4, 'light', { canCrit: true });
      if (tgt.alive) sim.applyStatus(tgt, 'gw', 3);
      skillHealHook(d);
      break;
    }
    case 'sam': {
      let target = tgt;
      const lowHobbit = sim.allies(f).find(a => a.def.races.includes('hobbit') && a.hp < a.maxHp * 0.5);
      let dmg = [400, 600, 900][L] + e.ad;
      if (lowHobbit) {
        const threat = sim.enemies(f).find(en => en.target === lowHobbit);
        if (threat) { target = threat; dmg *= 1.3; }
      }
      if (target) sim.deal(f, target, dmg, 'phys', { canCrit: true });
      break;
    }
    case 'gothmog': {
      if (!tgt) break;
      const targets = [tgt, ...adjEnemies(tgt)];
      for (const t2 of targets) {
        const d = sim.deal(f, t2, [280, 420, 630][L] + e.ad * 0.6 + e.mc * 0.6, 'dark', { canCrit: true });
        if (t2.alive) sim.applyStatus(t2, 'burn', 2, f);
        skillHealHook(d);
      }
      break;
    }
    case 'rog': {
      if (!tgt) break;
      sim.deal(f, tgt, [400, 600, 900][L] + e.ad, 'phys', { canCrit: true });
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
      if (cands.length) target = cands.sort((a, b) => sim.strongSum(b) - sim.strongSum(a))[0];
      if (!target) break;
      sim.dashAdjacent(f, target);
      f.flags.onKillHeal = 30;
      const d = sim.deal(f, target, [550, 830, 1250][L] + e.ad + e.cc * 0.6, 'light', { canCrit: true });
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
      const d = sim.deal(f, tgt, [550, 830, 1250][L] + e.ad * 1.2, 'phys', { canCrit: true });
      if (before && !tgt.alive) {
        sim.buff(f, { asPct: 20 }, 999);
        sim.deal(null, f, d * 0.1, 'true', {});
      }
      break;
    }
    case 'frodo': {
      sim.applyStatus(f, 'untargetable', [2, 2.5, 3][L]);
      f.flags.ringStrike = [450, 680, 1020][L] + e.ad * 1.2;
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
      sim.after(2, () => {
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
    // ================= M2 新增技能 =================
    case 'idril': {
      if (!tgt) break;
      const d = sim.deal(f, tgt, [280, 420, 630][L] + e.cc * [0.7, 1, 1.6][L], 'light', { canCrit: true });
      const low = lowestAlly();
      if (low) sim.addShield(low, d * 0.4, 4, f);
      break;
    }
    case 'huan': {
      if (!tgt) break;
      sim.deal(f, tgt, e.ad * [2.0, 3.0, 4.5][L], 'phys', { canCrit: true });
      if (tgt.alive && tgt.hp > tgt.maxHp * 0.5) sim.applyStatus(tgt, 'burn', 2, f);
      break;
    }
    case 'bregor': {
      sim.addShield(f, [250, 380, 580][L] + e.armor * 0.8, 4, f);
      for (const a of alliesIn(1)) sim.buff(a, { armor: [10, 15, 25][L] }, 4);
      break;
    }
    case 'brandir': {
      const low = lowestAlly();
      if (low) sim.heal(low, [200, 300, 450][L] + f.maxHp * [3, 4, 6][L] / 100, f);
      break;
    }
    case 'tevildo': {
      const cands = sim.enemies(f).filter(en => hexDist(f.pos.c, f.pos.r, en.pos.c, en.pos.r) <= 2);
      const target = cands.sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp)[0] || tgt;
      if (!target) break;
      sim.dashAdjacent(f, target);
      let dmg = [270, 400, 600][L] + e.ad * 0.8;
      if (target.hp < target.maxHp * 0.3) dmg *= 2;
      sim.deal(f, target, dmg, 'dark', { canCrit: true });
      break;
    }
    case 'goldberry': {
      if (!tgt) break;
      sim.deal(f, tgt, [260, 390, 580][L] + e.cc * [0.7, 1, 1.6][L], 'light', { canCrit: true });
      if (tgt.alive) sim.buff(tgt, { asPct: -20 }, 3);
      indulgerProc(tgt);
      break;
    }
    case 'aredhel': {
      if (!tgt) break;
      const d = sim.deal(f, tgt, [350, 525, 790][L] + e.ad * 0.6 + e.cc * 0.4, 'light', { canCrit: true });
      trickBounce(tgt, d, 'light');
      break;
    }
    case 'finarfin': {
      const lows = sim.allies(f).filter(a => a !== f && !a.isMonster).sort((a, b) => a.mana - b.mana).slice(0, 2);
      for (const a of lows) a.mana = Math.min(a.manaMax + a.breakMana, a.mana + [15, 22, 35][L]);
      sim.addShield(f, [180, 270, 420][L] + e.cc * 0.6, 4, f);
      break;
    }
    case 'magor': {
      if (tgt) sim.deal(f, tgt, [300, 450, 680][L] + e.ad, 'phys', { canCrit: true });
      f.flags.empowered = 3;
      f.flags.empowerDmg = e.ad * [0.3, 0.45, 0.7][L];
      break;
    }
    case 'nimrodel': {
      if (!tgt) break;
      const d = sim.deal(f, tgt, [330, 500, 750][L] + e.cc * [0.8, 1.2, 1.9][L], 'light', { canCrit: true });
      sim.heal(f, d * 0.3, null);
      break;
    }
    case 'glaurung': {
      if (!tgt) break;
      sim.deal(f, tgt, [320, 480, 720][L] + e.mc * [0.8, 1.2, 1.9][L], 'dark', { canCrit: true });
      if (tgt.alive) sim.applyStatus(tgt, 'gw', 3);
      break;
    }
    case 'haleth': {
      if (!tgt) break;
      let dmg = [300, 450, 680][L] + e.ad;
      if (f.hp < f.maxHp * 0.5) dmg *= 1.4;
      sim.deal(f, tgt, dmg / 2, 'phys', { canCrit: true });
      sim.deal(f, tgt, dmg / 2, 'phys', { canCrit: true });
      break;
    }
    case 'barahir': {
      if (tgt) sim.deal(f, tgt, [320, 480, 720][L] + e.ad * 0.8, 'phys', { canCrit: true });
      sim.buff(f, { dr: [15, 20, 30][L] }, 3);
      break;
    }
    case 'gandalf': {
      if (!tgt) break;
      const targets = [tgt, ...adjEnemies(tgt)];
      for (const t2 of targets) {
        sim.deal(f, t2, [160, 240, 360][L] + e.cc * [0.7, 1, 1.6][L], 'light', {});
        if (t2.alive) sim.knockback(f, t2);
      }
      indulgerProc(tgt);
      break;
    }
    case 'saruman': {
      if (!tgt) break;
      f.flags.saruCast = (f.flags.saruCast || 0) + 1;
      const isLight = f.flags.saruCast % 2 === 1;
      const dmg = [380, 570, 860][L] + (isLight ? e.cc : e.mc) * [0.8, 1.2, 1.9][L];
      sim.deal(f, tgt, dmg, isLight ? 'light' : 'dark', { canCrit: true });
      if (!isLight && tgt.alive) sim.applyStatus(tgt, 'burn', 2, f);
      break;
    }
    case 'tombombadil': {
      for (const a of sim.allies(f)) sim.heal(a, [100, 150, 240][L] + e.cc * [0.4, 0.6, 0.9][L], f);
      const low = lowestAlly();
      if (low) for (const k of ['burnUntil', 'gwUntil', 'chillUntil', 'stunUntil', 'disarmUntil']) low.st[k] = 0;
      break;
    }
    case 'maglor': {
      const lows = sim.allies(f).sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp).slice(0, 2);
      for (const a of lows) {
        sim.addShield(a, [170, 250, 380][L] + e.cc * [0.7, 1, 1.6][L], 4, f);
        for (let s = 1; s <= 4; s++) sim.after(s, () => { if (a.alive && sim.shieldTotal(a) > 0) sim.heal(a, a.maxHp * 0.02, f); });
      }
      break;
    }
    case 'finrod': {
      if (!tgt) break;
      sim.deal(f, tgt, [380, 570, 860][L] + e.cc * [0.8, 1.2, 1.9][L], 'light', { canCrit: true });
      if (tgt.alive) sim.applyStatus(tgt, 'disarm', [1, 1.5, 2][L], f);
      break;
    }
    case 'gilgalad': {
      if (!tgt) break;
      const dmg = [280, 420, 630][L] + e.ad * 0.6 + e.cc * 0.5;
      sim.deal(f, tgt, dmg, 'light', { canCrit: true });
      const behind = adjEnemies(tgt).sort((a, b) => hexDist(b.pos.c, b.pos.r, f.pos.c, f.pos.r) - hexDist(a.pos.c, a.pos.r, f.pos.c, f.pos.r))[0];
      if (behind) sim.deal(f, behind, dmg, 'light', { canCrit: true });
      break;
    }
    case 'maeglin': {
      const cands = sim.enemies(f).filter(en => hexDist(f.pos.c, f.pos.r, en.pos.c, en.pos.r) <= 2);
      const target = cands.sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp)[0] || tgt;
      if (!target) break;
      sim.dashAdjacent(f, target);
      let dmg = [380, 570, 860][L] + e.ad * 0.8 + e.mc * 0.4;
      const execLine = sim['exec' + f.team];
      if (execLine && target.hp / target.maxHp * 100 < execLine) dmg *= 1.5;
      sim.deal(f, target, dmg, 'dark', { canCrit: true });
      break;
    }
    case 'hurin': {
      sim.addShield(f, [320, 480, 720][L] + e.armor * 0.6, 4, f);
      f.flags.hurinReflect = { until: sim.t + 4, dmg: e.ad * [0.7, 1.0, 1.5][L] };
      break;
    }
    case 'luthien': {
      if (!tgt) break;
      for (const t2 of [tgt, ...adjEnemies(tgt)]) {
        sim.applyStatus(t2, 'stun', [1, 1.5, 2][L], f);
        sim.deal(f, t2, [170, 250, 380][L] + e.cc * [0.7, 1, 1.6][L], 'light', {});
      }
      indulgerProc(tgt);
      break;
    }
    case 'nienna': {
      const low = lowestAlly();
      if (low) sim.heal(low, [200, 300, 450][L] + e.cc * [0.8, 1.2, 1.9][L], f);
      if (tgt && tgt.alive) { sim.buff(tgt, { amp: -[15, 20, 30][L] }, 4); indulgerProc(tgt); }
      break;
    }
    case 'legolas': {
      let arrows = [5, 7, 12][L];
      let target = tgt, lastDmg = 0;
      for (let i = 0; i < arrows && i < 20; i++) {
        if (!target || !target.alive) target = sim.nearestEnemy(f);
        if (!target) break;
        const before = target.alive;
        lastDmg = sim.deal(f, target, [60, 90, 135][L] + e.ad * 0.6 + e.cc * 0.15, 'light', { canCrit: true });
        if (before && !target.alive) arrows++;
      }
      trickBounce(target, lastDmg, 'light');
      break;
    }
    case 'fingon': {
      for (const a of sim.allies(f)) sim.buff(a, { asPct: [12, 18, 28][L] }, 4);
      if (tgt) { sim.dashAdjacent(f, tgt); sim.deal(f, tgt, [380, 570, 860][L] + e.ad, 'phys', { canCrit: true }); }
      break;
    }
    case 'galadriel': {
      const dense = sim.enemies(f).sort((a, b) => adjEnemies(b).length - adjEnemies(a).length)[0] || tgt;
      if (!dense) break;
      for (const t2 of sim.enemies(f).filter(en => hexDist(dense.pos.c, dense.pos.r, en.pos.c, en.pos.r) <= 2)) {
        sim.deal(f, t2, [260, 390, 580][L] + e.cc * [1.1, 1.7, 2.6][L], 'light', {});
        if (t2.alive && t2.align === 'dark') sim.applyStatus(t2, 'disarm', [1, 1.5, 2][L], f);
      }
      break;
    }
    case 'beren': {
      if (!tgt) break;
      sim.deal(f, tgt, [500, 750, 1130][L] + e.ad, 'phys', { canCrit: true });
      if (tgt.alive && tgt.hp < tgt.maxHp * 0.2) {
        tgt.hp = 0; sim.emit({ k: 'execute', id: tgt.id, src: f.id }); sim.kill(tgt, f);
        if ((f.flags.berenLoots || 0) < 2) {
          f.flags.berenLoots = (f.flags.berenLoots || 0) + 1;
          sim.goldLoot = sim.goldLoot || { 0: 0, 1: 0 };
          sim.goldLoot[f.team]++;
        }
      }
      break;
    }
    case 'maedhros': {
      if (!tgt) break;
      const per = ([500, 750, 1130][L] + e.ad * 1.2) / 3;
      sim.deal(f, tgt, per, 'phys', { canCrit: true });
      sim.deal(f, tgt, per, 'phys', { canCrit: true });
      if (tgt.alive) {
        const forced = tgt.hp < tgt.maxHp * 0.3;
        sim.deal(f, tgt, forced ? per * e.critD / 100 : per, 'phys', { canCrit: !forced });
      }
      break;
    }
    case 'aule': {
      for (const a of sim.allies(f)) {
        const rs = e.cn >= e.mn ? 'cn' : 'mn';
        sim.buff(a, { armor: [15, 22, 32][L], [rs]: [15, 22, 32][L] }, 4);
      }
      if (!f.flags.forged) {
        f.flags.forged = true;
        const cand = sim.allies(f).filter(a => a.items.length + a.tempItems.length < 3);
        if (cand.length) {
          const ally = sim.rng.pick(cand);
          const it = makeComponentItem(sim.rng.pick(T1_COMPS));
          ally.tempItems.push(it);
          sim._applyItemStats(ally, it);
          sim.emit({ k: 'lightItem', id: ally.id, item: it.name, info: { name: it.name, kind: 'component', comp: it.comp, stats: it.stats, note: '' } });
        }
      }
      break;
    }
    case 'eonwe': {
      sim.addShield(f, [350, 520, 780][L] + e.armor * 0.6, 4, f);
      for (const a of alliesIn(1)) sim.buff(a, { shieldRecv: [15, 22, 35][L] }, 4);
      break;
    }
    case 'sauron': {
      if (!tgt) break;
      sim.applyStatus(tgt, 'stun', [1, 1.5, 2][L], f);
      sim.deal(f, tgt, [450, 680, 1020][L] + e.mc * [1.0, 1.5, 2.3][L], 'dark', { canCrit: true });
      const target = tgt;
      sim.after(3, () => { if (!target.alive && f.alive) f.mana = Math.min(f.manaMax + f.breakMana, f.mana + 30); });
      indulgerProc(tgt);
      break;
    }
    case 'fingolfin': {
      const dur = [3, 5, 20][L] * (1 + (f.highKing || 0));
      f.st.ccImmuneUntil = Math.max(f.st.ccImmuneUntil || 0, sim.t + dur);
      for (const k of ['stunUntil', 'chillUntil', 'disarmUntil']) f.st[k] = 0;
      sim.buff(f, { ad: [30, 50, 150][L], vamp: [10, 15, 45][L] * (1 + (f.highKing || 0)) }, dur);
      break;
    }
    case 'manwe': {
      const highest = sim.enemies(f).sort((a, b) => b.hp - a.hp).slice(0, [1, 2, 5][L]);
      for (const t2 of highest) sim.applyStatus(t2, 'stun', [0.5, 1, 5][L], f);
      const delay = [1.5, 1, 0.5][L];
      sim.after(delay, () => {
        if (!f.alive) return;
        const dense = sim.enemies(f).sort((a, b) => adjEnemies(b).length - adjEnemies(a).length)[0];
        if (!dense) return;
        let total = 0;
        for (const t2 of sim.enemies(f).filter(en => hexDist(dense.pos.c, dense.pos.r, en.pos.c, en.pos.r) <= 3))
          total += sim.deal(f, t2, [200, 400, 2000][L] + sim.eff(f).cc * [1.5, 2.5, 10][L], 'light', {});
        const allies = sim.allies(f);
        for (const a of allies) sim.addShield(a, total * 0.2 / allies.length, 5, f);
      });
      break;
    }
    case 'feanor': {
      const far = sim.enemies(f).filter(en => hexDist(f.pos.c, f.pos.r, en.pos.c, en.pos.r) <= 3)
        .sort((a, b) => hexDist(b.pos.c, b.pos.r, f.pos.c, f.pos.r) - hexDist(a.pos.c, a.pos.r, f.pos.c, f.pos.r))[0] || tgt;
      if (!far) break;
      sim.dashAdjacent(f, far);
      for (const t2 of [far, ...adjEnemies(f)]) {
        t2.breakMana += t2.manaMax * 0.15;
        sim.emit({ k: 'break', id: t2.id, extra: Math.round(t2.breakMana) });
        sim.deal(f, t2, [450, 700, 2000][L] + e.ad * 1.2 + e.cc * [0.4, 0.8, 4.0][L], 'phys', { canCrit: true });
      }
      sim.buff(f, { critR: [25, 25, 100][L], critD: [15, 25, 100][L] }, 2);
      break;
    }
    case 'ecthelion': {
      sim.deal(null, f, f.hp * [0.4, 0.25, 0.05][L], 'pure', {});
      sim.buff(f, { asPct: 5 + e.ad * [0.05, 0.1, 0.2][L], critD: [15, 25, 100][L] }, [5, 7, 20][L]);
      break;
    }
    case 'varda': {
      if (!tgt) break;
      f.flags.vardaCount = (f.flags.vardaCount || 0) + 1;
      const third = f.flags.vardaCount % 3 === 0;
      const target = tgt;
      sim.after(0.5, () => {
        if (!f.alive || !target.alive) return;
        const e2 = sim.eff(f);
        if (third) {
          const d = sim.deal(f, target, [700, 1400, 3500][L] + e2.cc * [4, 8, 50][L], 'light', {});
          for (const t2 of adjEnemies(target)) sim.deal(f, t2, d / 2, 'light', {});
        } else {
          const before = target.alive;
          sim.deal(f, target, [450, 900, 2200][L] + e2.cc * [2.5, 5, 20][L], 'light', {});
          if (before && !target.alive) f.mana = Math.min(f.manaMax, f.mana + [20, 30, 100][L]);
        }
      });
      indulgerProc(tgt);
      break;
    }
    case 'beleg': {
      const fars = sim.enemies(f).sort((a, b) =>
        hexDist(b.pos.c, b.pos.r, f.pos.c, f.pos.r) - hexDist(a.pos.c, a.pos.r, f.pos.c, f.pos.r)).slice(0, 3);
      let lastD = 0, lastT = null;
      for (const t2 of fars) {
        lastD = sim.deal(f, t2, [250, 400, 1300][L] + e.ad + e.cc * [0.2, 0.3, 1.0][L], 'phys', { canCrit: true });
        lastT = t2;
        for (const t3 of adjEnemies(t2)) sim.deal(f, t3, [120, 200, 650][L] + e.ad * 0.5, 'phys', {});
      }
      trickBounce(lastT, lastD, 'phys');
      break;
    }
    case 'aragorn': {
      if (f.aragornSkill === 2 && !f.flags.crowned) { // 加冕为王（每场一次）
        f.flags.crowned = true;
        sim.emit({ k: 'cast', id: f.id, name: '加冕为王' });
        for (const a of sim.allies(f)) {
          for (const k of ['burnUntil', 'gwUntil', 'chillUntil', 'stunUntil', 'disarmUntil']) a.st[k] = 0;
          sim.heal(a, [200, 300, 1000][L] + e.cc * [0.8, 1.2, 3][L], f);
          sim.buff(a, { adPct: [15, 22, 50][L], cc: sim.eff(a).cc * [15, 22, 50][L] / 100, ten: 20 }, 8);
        }
        for (const en of sim.enemies(f)) { sim.applyStatus(en, 'chill', 3, f); sim.applyStatus(en, 'gw', 3); }
      } else if (f.aragornSkill >= 1) { // 西方之焰
        sim.emit({ k: 'cast', id: f.id, name: '西方之焰' });
        const dense = sim.enemies(f).sort((a, b) => adjEnemies(b).length - adjEnemies(a).length)[0] || tgt;
        if (dense) {
          sim.dashAdjacent(f, dense);
          for (const t2 of sim.enemies(f).filter(en => hexDist(f.pos.c, f.pos.r, en.pos.c, en.pos.r) <= 2)) {
            sim.deal(f, t2, e.ad * [2, 3, 9][L] + e.cc * [0.5, 0.8, 2][L], 'light', { canCrit: true });
            if (t2.alive) sim.applyStatus(t2, 'burn', 3, f);
          }
          for (const a of sim.allies(f)) sim.buff(a, { amp: [10, 15, 40][L] }, 5);
        }
      } else { // 北方游侠
        const ally = sim.allies(f).filter(a => a !== f)
          .sort((a, b) => hexDist(a.pos.c, a.pos.r, f.pos.c, f.pos.r) - hexDist(b.pos.c, b.pos.r, f.pos.c, f.pos.r))[0];
        const dur = [1, 2, 10][L];
        f.st.evadeUntil = sim.t + dur; f.evadeOwner = f;
        if (ally) { ally.st.evadeUntil = sim.t + dur; ally.evadeOwner = f; }
        f.flags.cloakAdPer = [0.1, 0.2, 1][L];
      }
      break;
    }
    default: break;
  }
}

