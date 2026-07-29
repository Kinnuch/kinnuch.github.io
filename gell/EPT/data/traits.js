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
  sinda: { name: '辛达精灵', type: 'race', tiers: [3, 5, 7],
    desc: '辛达弈子获得 15/30/75% 闪避率（每4秒仅生效一次），闪避成功后下次攻击附带 10/15/25% 护甲穿透与光明穿透。' },
  fingolfinH: { name: '芬国昐家族', type: 'race', tiers: [2, 4],
    desc: '芬国昐家族弈子在战斗开始时为邻格友军提供不可叠加的 10/20 护甲与光明抗性。' },
  feanorH: { name: '费艾诺家族', type: 'race', tiers: [3],
    desc: '最强大的费艾诺家族弈子获得 10% 最大生命值与 10% 额外暴击伤害。' },
  finarfinH: { name: '菲纳芬家族', type: 'race', tiers: [2, 4],
    desc: '菲纳芬家族弈子获得每3秒 3/6 点法力回复。' },
  beor: { name: '贝奥家族', type: 'race', tiers: [3],
    desc: '贝奥家族弈子在战斗开始的前15秒免疫控制。' },
  haleth: { name: '哈烈丝家族', type: 'race', tiers: [2],
    desc: '哈烈丝家族弈子若开战7秒内未阵亡，获得 20 护甲与光明抗性，以及永久 1 攻击力。' },
  maia: { name: '迈雅', type: 'race', tiers: [3],
    desc: '迈雅弈子能够双重施法。' },
  vala: { name: '维拉', type: 'race', tiers: [1],
    desc: '队伍恰有1名维拉时其专属加成给予全队；多于1名时反转为减益。曼威：三系穿透；瓦尔妲：光强；奥力：护甲与抗性；涅娜：治疗盾强。' },
  wood: { name: '林中隐士', type: 'race', tiers: [2],
    desc: '己方获得 15% 治疗强度、护盾强度与控制时长提升；林中隐士技能伤害的 10% 治疗最低血友军。' },
  dog: { name: '神犬', type: 'race', tiers: [1],
    desc: '玩家等级 5/7/9 时胡安三次开口：附带灼烧重伤 → 顺劈+吸血+护甲穿透 → 三维翻倍但施法后逐渐死亡。' },
  // ---- 职业 ----
  arcanist: { name: '秘术士', type: 'class', tiers: [2, 4, 6, 8],
    desc: '为所有友军提供 20/20/50/80 点自适应强度；秘术士自身额外获得 0/30/40/60 点自适应强度与 0/5/10/20% 自适应穿透。' },
  forger: { name: '工匠', type: 'class', tiers: [2, 3, 4, 5],
    desc: '为己方提供 150/200/250/400 最大生命与 10/20/30/40 护甲和自适应抗性；工匠自身双倍。' },
  indulger: { name: '控灵者', type: 'class', tiers: [3, 5, 7],
    desc: '控灵者技能对目标施加 15%破法 / 0.5秒眩晕 / 1秒缴械（对同一目标 12/9/4 秒冷却），成功后获得 50/100/250 护盾。' },
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

// 掌旗官专属加成
export const FLAGGER_BONUS = {
  merry: { desc: '战斗开始时100护盾', shield: 100 },
  guthlaf: { desc: '12%攻击力', adPct: 12 },
  witchking: { desc: '12自适应强度', sp: 12 },
  morgoth: { desc: '8%全能吸血', vamp: 8 },
  finarfin: { desc: '12%攻速', asPct: 12 },
  magor: { desc: '10护甲与10自适应抗性', armor: 10, mres: 10 },
  fingon: { desc: '每秒回复2法力', manaRegen: 2 },
};

// 维拉独修加成（队伍恰1名维拉时全队获得；多于1名则反转为减益）
export const VALA_BONUS = {
  manwe: { desc: '5点三系穿透', penFlat: 5 },
  varda: { desc: '15光明强度', cc: 15 },
  aule: { desc: '15护甲与15自适应抗性', armor: 15, mres: 15 },
  nienna: { desc: '10%治疗和护盾强度', hsPct: 10 },
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
