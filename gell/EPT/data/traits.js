// EPT · M1 羁绊定义（效果逻辑在 engine/combat.js 与 engine/game.js 中实现）
// tiers: 激活所需的独特棋子数（重创之手为"恰好"判定）

export const TRAITS = {
  // ---- 种族 ----
  noldor: { name: '诺多精灵', type: 'race', tiers: [3, 5, 7, 10],
    desc: '战斗开始时，最强大的 1/2/3/5 名诺多弈子获得一件随机光明装备（当场有效）。' },
  gondolin: { name: '刚多林家族', type: 'race', tiers: [2, 4, 6],
    desc: '刚多林弈子击杀后即刻冲刺至下个目标，并使其多承受 5/10/20% 伤害3秒。' },
  mordor: { name: '魔多', type: 'race', tiers: [2, 3, 4, 5],
    desc: '战斗开始 12/10/8/5 秒后邪黑塔锁定棋盘：敌方受 5/8/12/20% 最大生命真实伤害、0/0/0.5/1秒眩晕与 5/10/15/25% 破法；魔多弈子获得 5/8/12/20% 攻速。' },
  rohirrim: { name: '洛希尔人', type: 'race', tiers: [2],
    desc: '洛希尔人移速的10倍转化为额外攻击力；施法时击退目标1格并前进1格。' },
  hobbit: { name: '霍比特人', type: 'race', tiers: [3, 5, 7],
    desc: '每次输掉战斗回合后投掷骰子获得奖励（3羁绊两枚；5羁绊额外一枚；7羁绊双倍并回3点玩家生命）。' },
  dunedain: { name: '杜内丹人', type: 'race', tiers: [2, 3, 4],
    desc: '获得 100/175/300 最大生命与 5/15/30 攻击力和光明强度；每战胜一名玩家该加成增幅10%（至多70%）。' },
  mankind: { name: '人类', type: 'race', tiers: [2, 4, 6, 9],
    desc: '获得 100/200/300/500 最大生命；己方每次击杀为人类弈子提供永久 1/2/3/5 生命，每叠10次额外永久 1/2/3/5 攻击力与光明强度。' },
  hador: { name: '哈多家族', type: 'race', tiers: [2, 4],
    desc: '队伍中每有一名精灵弈子，哈多弈子获得 1/2% 最大生命与伤害加成。' },
  dwarf: { name: '矮人', type: 'race', tiers: [2, 3],
    desc: '提供 1/2 件交界装备（M1：随机小成装）；矮人弈子获得 8/15% 伤害减免。' },
  angband: { name: '安格班', type: 'race', tiers: [3, 5, 7, 10],
    desc: '安格班弈子的攻击偷取敌人 1/3/5/15 攻击力与 7/12/21/45 生命（有上限），满层后获得额外生命偷取。' },
  // ---- 职业 ----
  warrior: { name: '战士', type: 'class', tiers: [2, 4, 6, 8],
    desc: '战士获得 5/10/17/33% 伤害减免与 10/15/22/30% 全能吸血，血量低于30%时吸血翻倍。' },
  trickshot: { name: '神射手', type: 'class', tiers: [2, 4],
    desc: '神射手的技能弹射 1/2 次，弹射伤害为 40/60%。' },
  flagger: { name: '掌旗官', type: 'class', tiers: [3, 6, 9],
    desc: '每名掌旗官为全体掌旗官提供其专属加成的 100/150/250%，最强大的掌旗官额外获得 50/75/100%。' },
  hunter: { name: '猎人', type: 'class', tiers: [3],
    desc: '每3秒猎人攻击并灼烧百分比血量最高的敌人；首次跌破50%血量时短暂不可选取并猎杀血量最低的敌人。' },
  killer: { name: '杀手', type: 'class', tiers: [3, 5],
    desc: '杀手获得基于已损失生命值的攻击力（至多 30/75），30%血量时最大；暴击附带冰冷。' },
  adventurer: { name: '冒险家', type: 'class', tiers: [2, 4],
    desc: '依据敌人护甲与均抗的差值，额外造成 5/15% 伤害或 10/20% 的针对性伤害。' },
  ranger: { name: '游侠', type: 'class', tiers: [2, 3, 4, 5, 6, 7],
    desc: '【灵敏攻击】攻击提供 5/7/10% 攻速，至多12层（5档以上效果见审核文档，M2实装）。' },
  executor: { name: '重创之手', type: 'class', tiers: [1, 4], exact: true,
    desc: '仅在恰好 1/4 名重创之手时激活：攻击与技能即刻处决生命值低于 8/20% 的敌人。' },
  chivalry: { name: '盾骑兵', type: 'class', tiers: [2, 4, 6],
    desc: '盾骑兵血量跌破50%时，为自身及邻格友军均摊提供 10/25/60% 最大生命的护盾4秒。' },
};

// 掌旗官专属加成（M1 在场的）
export const FLAGGER_BONUS = {
  merry: { desc: '战斗开始时100护盾', shield: 100 },
  guthlaf: { desc: '12%攻击力', adPct: 12 },
  witchking: { desc: '12自适应强度', sp: 12 },
  morgoth: { desc: '8%全能吸血', vamp: 8 },
};

export function traitTier(traitId, count) {
  const t = TRAITS[traitId];
  if (!t) return 0;
  if (t.exact) { const i = t.tiers.indexOf(count); return i >= 0 ? i + 1 : 0; }
  let tier = 0;
  for (let i = 0; i < t.tiers.length; i++) if (count >= t.tiers[i]) tier = i + 1;
  return tier;
}

// 统计一支队伍的羁绊（units: 含 def 的上场棋子数组；同名棋子只计一次）
export function countTraits(units) {
  const seen = new Set(), counts = {};
  for (const u of units) {
    if (seen.has(u.def.id)) continue;
    seen.add(u.def.id);
    for (const t of [...u.def.races, ...u.def.classes]) counts[t] = (counts[t] || 0) + 1;
  }
  const res = [];
  for (const id in counts) {
    if (!TRAITS[id]) continue;
    res.push({ id, count: counts[id], tier: traitTier(id, counts[id]) });
  }
  res.sort((a, b) => (b.tier - a.tier) || (b.count - a.count));
  return res;
}
