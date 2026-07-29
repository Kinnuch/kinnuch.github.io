// EPT · M1 野怪波次与掉落（掉落为审核文档的 M1 简化版：袋子开出金币/卡牌/散件）

export const MONSTERS = {
  orcWarrior: { id: 'orcWarrior', name: '奥克战士', hp: 250, ad: 20, as: 0.8, range: 1, armor: 0, cn: 0, mn: 0, speed: 1.0 },
  orcArcher: { id: 'orcArcher', name: '奥克弓箭手', hp: 150, ad: 40, as: 0.8, range: 3, armor: 0, cn: 0, mn: 0, speed: 1.0 },
  troll: { id: 'troll', name: '山区食人妖', hp: 1200, ad: 110, as: 0.8, range: 1, armor: 50, cn: 25, mn: 25, speed: 0.9, onAllyDeathHealFull: true },
  // M2 平衡：3-7 之后的野怪较设计文档削弱（用户裁决 2026-07-29）
  boarBig: { id: 'boarBig', name: '埃韦霍尔特的野猪王', hp: 1700, ad: 125, as: 1.0, range: 1, armor: 25, cn: 0, mn: 0, speed: 1.1 },
  boarSmall: { id: 'boarSmall', name: '埃韦霍尔特的野猪', hp: 1150, ad: 100, as: 1.0, range: 1, armor: 25, cn: 0, mn: 0, speed: 1.1 },
  warg: { id: 'warg', name: '座狼', hp: 1800, ad: 140, as: 0.8, range: 1, armor: 0, cn: 0, mn: 0, speed: 1.2, onAllyDeathAS: 30 },
  coldDrake: { id: 'coldDrake', name: '冷龙', hp: 5600, ad: 470, as: 0.9, range: 2, armor: 0, cn: 0, mn: 0, speed: 1.0, aoe: true },
  balrog: { id: 'balrog', name: '炎魔', hp: 8200, ad: 430, as: 0.9, range: 1, armor: 50, cn: 0, mn: 0, speed: 1.0, aoe: true, onHit: { burn: 2, gw: 2, stunChance: 0.1 } },
};

// key: `${stage}-${step}`（step 为该阶段内 PvE 回合位置），waves 为怪物 id 列表
export function pveWave(stage) {
  if (stage === 1) return null; // 阶段1的三场由 stage1Waves 给出
  if (stage === 2) return ['troll', 'troll', 'troll'];
  if (stage === 3) return ['boarBig', 'boarSmall', 'boarSmall', 'boarSmall', 'boarSmall'];
  if (stage === 4) return ['warg', 'warg', 'warg', 'warg', 'warg'];
  if (stage === 5) return ['coldDrake'];
  return ['balrog'];
}
export const STAGE1_WAVES = [
  ['orcWarrior', 'orcWarrior'],
  ['orcWarrior', 'orcWarrior', 'orcArcher'],
  ['orcWarrior', 'orcWarrior', 'orcArcher', 'orcArcher'],
];

// ---- 掉落（M1 简化）----
// 元素：{t:'comp1'|'comp2'|'gold'|'card'|'bagS'|'bagM'|'bagL', n?}，card 为随机本级可见卡
export function pveDrops(stage, step, rng) {
  const roll = p => rng.next() < p;
  const out = [];
  if (stage === 1) {
    if (step === 0) { out.push({ t: 'comp1' }); if (roll(0.2)) out.push({ t: 'bagS' }); }
    if (step === 1) { out.push({ t: 'comp1' }); if (roll(0.1)) out.push({ t: 'comp2' }); else if (roll(0.2)) out.push({ t: 'comp1' }); if (roll(0.15)) out.push({ t: 'bagS' }); }
    if (step === 2) { out.push(roll(0.8) ? { t: 'comp1' } : { t: 'comp2' }); if (roll(0.1)) out.push({ t: 'comp2' }); out.push({ t: 'bagS' }); }
    return out;
  }
  if (stage === 2) { out.push(roll(0.8) ? { t: 'comp1' } : { t: 'comp2' }); out.push(roll(0.6) ? { t: 'comp1' } : { t: 'bagM' }); out.push(roll(0.6) ? { t: 'bagM' } : { t: 'comp1' }); return out; }
  if (stage === 3) { out.push({ t: 'bagS' }, { t: 'bagS' }); out.push(roll(0.7) ? { t: 'comp1' } : { t: 'bagM' }); out.push(roll(0.5) ? { t: 'comp2' } : { t: 'bagM' }); return out; }
  if (stage === 4) { out.push({ t: 'bagS' }, { t: 'bagM' }); out.push(roll(0.8) ? { t: 'comp1' } : { t: 'comp2' }); return out; }
  out.push({ t: 'bagS' }, { t: 'bagM' }, { t: 'comp2' }); // 5-7 及以后（中成装 M2，先给大散件）
  return out;
}

// 袋子开箱（M2：接入拆卸器/重铸器/复制器/双圣树的光辉，近似原表）
export function openBag(kind, stage, rng) {
  const r = rng.next();
  if (kind === 'bagS') {
    if (stage <= 2) return r < 0.46 ? { cards1: 2 } : r < 0.9 ? { cards2: 1 } : r < 0.94 ? { gold: 2, remover: 1 } : r < 0.98 ? { gold: 2, reforger: 1 } : { smallDup: 1 };
    return r < 0.47 ? { cards3: 1 } : r < 0.9 ? { cards2: 1, gold: 1 } : r < 0.94 ? { gold: 3, remover: 1 } : r < 0.98 ? { gold: 3, reforger: 1 } : { smallDup: 1 };
  }
  if (kind === 'bagM') {
    if (stage <= 3) return r < 0.31 ? { cards3: 1, gold: 3 } : r < 0.62 ? { cards3: 2 } : r < 0.9 ? { cards2: 3 } : r < 0.95 ? { smallDup: 1, cards2: 2 } : { bigDup: 1, cards3: 1 };
    return r < 0.46 ? { cards4: 1, gold: 4 } : r < 0.9 ? { cards3: 1, gold: 2 } : r < 0.94 ? { bigDup: 1, gold: 3 } : { gold: 8, reforger: 1 };
  }
  // bagL
  if (stage <= 3) return r < 0.2 ? { gold: 12 } : r < 0.35 ? { compAL: 1, gold: 4, reforger: 1 } : r < 0.55 ? { cards4: 2, gold: 2 } : r < 0.75 ? { cards3: 3, gold: 2 } : { comp1: 1, comp2: 1, gold: 4 };
  return r < 0.3 ? { cards4: 2, gold: 10 } : r < 0.55 ? { cards5: 1, gold: 13 } : r < 0.75 ? { comp1: 1, comp2: 1, gold: 2 } : r < 0.85 ? { compAL: 1, comp1: 1, gold: 4 } : { upgrader: 2, gold: 5 };
}

// 霍比特奖励表（M2：接入消耗道具，按连败数近似原奖励表）
export function hobbitReward(lossStreak, rng) {
  const r = rng.next();
  const L = Math.min(lossStreak, 12);
  if (L <= 0) return r < 0.78 ? { gold: 1 } : r < 0.88 ? { gold: 2 } : r < 0.98 ? { gold: 3 } : { gold: 4 };
  if (L === 1) return r < 0.3 ? { gold: 2 } : r < 0.45 ? { gold: 3 } : r < 0.55 ? { cards3: 1 } : r < 0.65 ? { cards2: 2 } : r < 0.8 ? { gold: 5 } : r < 0.95 ? { comp1: 1 } : { smallDup: 1 };
  if (L === 2) return r < 0.2 ? { cards3: 1 } : r < 0.5 ? { gold: 5 } : r < 0.7 ? { cards2: 2 } : r < 0.9 ? { comp1: 1 } : { smallDup: 1 };
  if (L === 3) return r < 0.3 ? { gold: 6 } : r < 0.5 ? { cards3: 2 } : r < 0.6 ? { bigDup: 1 } : r < 0.9 ? { gold: 4 } : { dice: 1 };
  if (L === 4) return r < 0.25 ? { cards4: 1, gold: 3 } : r < 0.45 ? { gold: 7 } : r < 0.6 ? { comp1: 1 } : r < 0.9 ? { gold: 4 } : { reforger: 1 };
  if (L === 5) return r < 0.25 ? { gold: 6 } : r < 0.35 ? { cards3: 3 } : r < 0.5 ? { gold: 8 } : r < 0.6 ? { dice: 1 } : r < 0.75 ? { jobBook: 1 } : { gold: 5 };
  if (L === 6) return r < 0.3 ? { gold: 5 } : r < 0.45 ? { comp1: 1 } : r < 0.55 ? { compAL: 1 } : r < 0.7 ? { jobBook: 1 } : r < 0.85 ? { gold: 8 } : { cards4: 2 };
  if (L === 7) return r < 0.3 ? { cards3: 3 } : r < 0.5 ? { cards4: 2 } : r < 0.6 ? { gold: 10 } : r < 0.8 ? { bigDup: 1 } : { cards3: 2 };
  return r < 0.3 ? { gold: 10 } : r < 0.55 ? { comp1: 1, comp2: 1 } : r < 0.7 ? { cards4: 2 } : r < 0.85 ? { jobBook: 1 } : r < 0.95 ? { upgrader: 2 } : { silmaril: 1 };
}
