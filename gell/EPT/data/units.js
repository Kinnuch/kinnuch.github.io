// EPT · M1 首发棋子（25个）——数值严格取自 gell/EPT/design 审核定稿
// aff 顺序：[维Y, 能N, 纳A, 卡C, 乌U, 科M]
// align: light | dark | phys（阵营伤害类型）
// mana: [初始, 上限]

export const RACES = {
  noldor: '诺多精灵', gondolin: '刚多林家族', fingolfinH: '芬国昐家族',
  mankind: '人类', hador: '哈多家族', dunedain: '杜内丹人', rohirrim: '洛希尔人',
  hobbit: '霍比特人', dwarf: '矮人', angband: '安格班', mordor: '魔多',
  sinda: '辛达精灵', maia: '迈雅', vala: '维拉', wood: '林中隐士', dog: '神犬',
};

export const CLASSES = {
  warrior: '战士', trickshot: '神射手', flagger: '掌旗官', arcanist: '秘术士',
  hunter: '猎人', killer: '杀手', forger: '工匠', adventurer: '冒险家',
  ranger: '游侠', executor: '重创之手', chivalry: '盾骑兵', indulger: '控灵者',
};

export const UNITS = [
  // ---------- 1费 ----------
  { id: 'grishnakh', name: '格里什纳赫', cost: 1, align: 'dark',
    races: ['mordor'], classes: ['warrior'],
    aff: [0, 8, 0, 0, 12, 8], hp: 550, as: 0.75, range: 1, mana: [0, 60], speed: 1.0,
    skill: { name: '劫掠', desc: '猛击目标，造成 150/225/340%AD 物理伤害；若目标携带装备则额外+20%伤害并回复自身10点法力。' } },
  { id: 'duilin', name: '杜伊林', cost: 1, align: 'light',
    races: ['noldor', 'gondolin'], classes: ['trickshot'],
    aff: [14, 4, 10, 0, 0, 0], hp: 480, as: 0.8, range: 4, mana: [0, 70], speed: 1.0,
    skill: { name: '飞燕三连矢', desc: '连珠发射3箭，每箭造成 70/105/160%AD + 15/20/30CC 的光明伤害。' } },
  { id: 'guthlaf', name: '古斯拉夫', cost: 1, align: 'phys',
    races: ['rohirrim'], classes: ['flagger'],
    aff: [12, 10, 0, 0, 0, 6], hp: 520, as: 0.75, range: 1, mana: [30, 80], speed: 1.4,
    skill: { name: '王旗先驱', desc: '策马突进（洛希尔击退），造成 160/240/360%AD 物理伤害，2格内友军获得 10/15/25% 攻速4秒。' } },
  { id: 'merry', name: '梅里', cost: 1, align: 'phys',
    races: ['hobbit'], classes: ['flagger'],
    aff: [8, 12, 0, 8, 0, 0], hp: 600, as: 0.65, range: 1, mana: [40, 90], speed: 1.0,
    skill: { name: '雄鹿地的呐喊', desc: '获得 150/250/400 护盾，2格内友军获得 15/22/35 韧性4秒。' } },
  { id: 'faramir', name: '法拉米尔', cost: 1, align: 'light',
    races: ['dunedain'], classes: ['adventurer'],
    aff: [12, 8, 8, 0, 0, 0], hp: 500, as: 0.75, range: 3, mana: [0, 70], speed: 1.0,
    skill: { name: '伊希利恩游击', desc: '冷箭造成 180/270/400%AD 物理伤害；若目标正在攻击其他友军，伤害+30%。' } },
  { id: 'carcharoth', name: '卡哈洛斯', cost: 1, align: 'dark',
    races: ['angband'], classes: ['ranger'],
    aff: [0, 6, 0, 0, 12, 10], hp: 540, as: 0.85, range: 1, mana: [0, 60], speed: 1.2,
    skill: { name: '永饥之口', desc: '撕咬造成 160/240/360%AD + 50/75/120%MC 黑暗伤害，并回复该伤害50%的生命。' } },
  { id: 'elemmakil', name: '埃伦玛奇尔', cost: 1, align: 'light',
    races: ['noldor', 'gondolin'], classes: ['chivalry'],
    aff: [8, 16, 4, 0, 0, 0], hp: 620, as: 0.6, range: 1, mana: [50, 100], speed: 1.0,
    skill: { name: '七重门卫', desc: '获得 12/18/30 护甲与光明抗性4秒，并嘲讽邻格敌人2秒。' } },
  { id: 'khamul', name: '可哈穆尔', cost: 1, align: 'dark',
    races: ['mordor'], classes: ['chivalry'],
    aff: [0, 14, 0, 4, 10, 0], hp: 600, as: 0.6, range: 1, mana: [40, 90], speed: 1.0,
    skill: { name: '戒灵的阴影', desc: '获得 200/300/460 + 40/60/90%MC 护盾，并对邻格敌人造成 60/90/140 + 30%MC 黑暗伤害。' } },
  // ---------- 2费 ----------
  { id: 'gimli', name: '吉姆利', cost: 2, align: 'phys',
    races: ['dwarf'], classes: ['warrior'],
    aff: [0, 12, 0, 14, 0, 8], hp: 700, as: 0.7, range: 1, mana: [0, 70], speed: 0.9,
    skill: { name: '战斧旋风', desc: '对邻格所有敌人造成 140/210/320%AD 物理伤害；每命中一名敌人获得 5/8/12 护甲（本场）。' } },
  { id: 'galdor', name: '加尔多', cost: 2, align: 'light',
    races: ['noldor', 'gondolin'], classes: ['ranger'],
    aff: [16, 10, 8, 0, 0, 0], hp: 600, as: 0.8, range: 1, mana: [0, 60], speed: 1.2,
    skill: { name: '绿树疾走', desc: '疾移1格，强化接下来2次攻击各附加 60/90/140%AD 额外物理伤害。' } },
  { id: 'pippin', name: '皮聘', cost: 2, align: 'phys',
    races: ['hobbit'], classes: ['ranger'],
    aff: [14, 12, 0, 8, 0, 0], hp: 580, as: 0.8, range: 2, mana: [0, 60], speed: 1.2,
    skill: { name: '图克的胆量', desc: '投石造成 180/270/400%AD 物理伤害并冰冷2秒，自身获得 20/30/45% 攻速3秒。' } },
  { id: 'mouthofsauron', name: '索伦之口', cost: 2, align: 'dark',
    races: ['mordor'], classes: ['killer'],
    aff: [0, 8, 0, 0, 12, 14], hp: 600, as: 0.85, range: 1, mana: [0, 70], speed: 1.1,
    skill: { name: '亵渎之言', desc: '造成 170/260/390%AD + 60%MC 黑暗伤害，并偷取目标 10/15/25% 攻击力4秒。' } },
  { id: 'theoden', name: '希奥顿', cost: 2, align: 'light',
    races: ['rohirrim'], classes: ['chivalry'],
    aff: [10, 18, 0, 4, 0, 2], hp: 750, as: 0.6, range: 1, mana: [50, 110], speed: 1.4,
    skill: { name: '王者威严', desc: '振军突进（洛希尔击退），获得 280/420/640 + 50%护甲值 护盾，邻格友军获得 10/15/25 护甲4秒。' } },
  { id: 'boromir', name: '波洛米尔', cost: 2, align: 'phys',
    races: ['dunedain'], classes: ['executor'],
    aff: [12, 14, 0, 2, 0, 6], hp: 700, as: 0.75, range: 1, mana: [0, 80], speed: 1.0,
    skill: { name: '号角冲锋', desc: '冲锋造成 220/330/500%AD 物理伤害；对生命值低于35%的目标伤害翻倍。' } },
  // ---------- 3费 ----------
  { id: 'tuor', name: '图奥', cost: 3, align: 'light',
    races: ['mankind', 'hador'], classes: ['warrior'],
    aff: [18, 14, 6, 4, 0, 0], hp: 850, as: 0.75, range: 1, mana: [0, 80], speed: 1.0,
    skill: { name: '德拉姆博烈格', desc: '巨斧猛劈，造成 240/360/540%AD + 40%CC 光明伤害并重伤3秒。' } },
  { id: 'sam', name: '山姆', cost: 3, align: 'phys',
    races: ['hobbit'], classes: ['hunter'],
    aff: [14, 12, 0, 10, 0, 6], hp: 780, as: 0.8, range: 1, mana: [0, 80], speed: 1.1,
    skill: { name: '为了弗罗多先生', desc: '平底锅重击 230/340/520%AD 物理伤害；有低血量霍比特友军时改打威胁者且伤害+30%。' } },
  { id: 'gothmog', name: '勾斯魔格', cost: 3, align: 'dark',
    races: ['angband'], classes: ['killer'],
    aff: [0, 8, 0, 4, 14, 16], hp: 760, as: 0.8, range: 1, mana: [0, 75], speed: 1.1,
    skill: { name: '烈焰长鞭', desc: '横扫目标及其邻格，造成 200/300/450%AD + 60%MC 黑暗伤害并灼烧2秒。' } },
  { id: 'rog', name: '洛格', cost: 3, align: 'phys',
    races: ['noldor', 'gondolin'], classes: ['executor'],
    aff: [14, 16, 0, 8, 0, 4], hp: 820, as: 0.75, range: 1, mana: [0, 85], speed: 1.0,
    skill: { name: '愤怒之锤', desc: '重锤造成 240/360/540%AD 物理伤害，并击碎目标 10/15/25 护甲（本场）。' } },
  { id: 'witchking', name: '安格玛巫王', cost: 3, align: 'dark',
    races: ['mordor'], classes: ['flagger'],
    aff: [0, 8, 0, 12, 18, 4], hp: 700, as: 0.7, range: 3, mana: [30, 90], speed: 1.0,
    skill: { name: '冰封恐惧', desc: '对2格内所有敌人造成 140/210/320 + 60/90/140%MC 黑暗伤害，冰冷3秒并降低 10/15/25 黑抗4秒。' } },
  // ---------- 4费 ----------
  { id: 'glorfindel', name: '格洛芬德尔', cost: 4, align: 'light',
    races: ['noldor', 'gondolin'], classes: ['warrior'],
    aff: [24, 14, 10, 4, 0, 0], hp: 1000, as: 0.8, range: 1, mana: [0, 90], speed: 1.1,
    skill: { name: '金花斗炎魔', desc: '跃向2格内最强大的敌人，造成 260/390/580%AD + 60%CC 光明伤害；击杀则回复30%最大生命。' } },
  { id: 'ancalagon', name: '安卡拉刚', cost: 4, align: 'dark',
    races: ['angband'], classes: ['warrior'],
    aff: [0, 14, 0, 6, 18, 14], hp: 1100, as: 0.7, range: 2, mana: [40, 110], speed: 0.9,
    skill: { name: '黑翼焚空', desc: '喷吐黑焰，对目标直线3格造成 220/330/500 + 90/140/210%MC 黑暗伤害并灼烧3秒。' } },
  { id: 'turin', name: '图林', cost: 4, align: 'phys',
    races: ['mankind', 'hador'], classes: ['ranger'],
    aff: [18, 12, 0, 12, 0, 10], hp: 850, as: 0.85, range: 1, mana: [0, 90], speed: 1.2,
    skill: { name: '黑剑古尔桑', desc: '挥出黑剑，造成 300/450/680%AD 物理伤害；击杀则获得20%攻速（本场）但承受10%反噬。' } },
  { id: 'frodo', name: '弗罗多', cost: 4, align: 'phys',
    races: ['hobbit'], classes: ['adventurer'],
    aff: [16, 14, 0, 14, 0, 8], hp: 800, as: 0.8, range: 1, mana: [0, 80], speed: 1.2,
    skill: { name: '魔戒隐身', desc: '隐身 2/2.5/3 秒，摘戒后的下一击造成 300/450/680%AD 物理伤害，自身受3%最大生命纯粹伤害。' } },
  // ---------- 5费 ----------
  { id: 'durin', name: '都林', cost: 5, align: 'phys',
    races: ['dwarf'], classes: ['chivalry'],
    aff: [8, 22, 4, 24, 0, 6], hp: 1200, as: 0.6, range: 1, mana: [70, 140], speed: 1.0,
    passive: '都林的传承：血量不会低于场上其他己方弈子数量×10%。',
    skill: { name: '磐岩之灵', desc: '获得 300/600/1200+2/3/9×适辉 护盾及大量护甲与自适应抗性2秒，结束时未碎护盾爆炸造成同等物理伤害。' } },
  { id: 'morgoth', name: '魔苟斯', cost: 5, align: 'dark',
    races: ['angband'], classes: ['flagger'],
    aff: [0, 12, 0, 12, 24, 16], hp: 1050, as: 0.9, range: 1, mana: [200, 300], speed: 1.0,
    passive: '堕落爱努：施法后汲取敌方玩家生命（每场一次）。',
    skill: { name: '达戈·达戈拉斯', desc: '召唤黑星风暴 2/3/99 秒：黑星命中友军给护盾、命中敌人造成其最大生命值百分比真实伤害。' } },
];

export const UNITS_BY_ID = Object.fromEntries(UNITS.map(u => [u.id, u]));

// 六维 → 派生（00-总纲公式）
export function deriveStats(aff) {
  const [Y, N, A, C, U, M] = aff;
  return {
    ad: 2 * Y + N + 2 * M, armor: 3 * N,
    cc: 3 * A + C, mc: 3 * U + C,
    cn: Y + A + C, mn: C + U + M,
    ten: Y + M,
  };
}

// 升星：主属性亲和 ×1.6、其余 ×1.2、HP ×1.8（用户裁决①）
export function affAtStar(aff, star) {
  const max = Math.max(...aff);
  const mainIdx = aff.indexOf(max);
  return aff.map((v, i) => v * Math.pow(i === mainIdx ? 1.6 : 1.2, star - 1));
}

export function unitStatsAtStar(def, star) {
  const s = deriveStats(affAtStar(def.aff, star));
  s.hp = Math.round(def.hp * Math.pow(1.8, star - 1));
  for (const k of ['ad', 'armor', 'cc', 'mc', 'cn', 'mn', 'ten']) s[k] = Math.round(s[k]);
  return s;
}

export function affSum(def, star) {
  return affAtStar(def.aff, star).reduce((a, b) => a + b, 0);
}

// 商店卡池张数（按费用）与概率
export const POOL_SIZE = { 1: 27, 2: 22, 3: 18, 4: 12, 5: 10 };
export const SHOP_ODDS = {
  2: [100, 0, 0, 0, 0], 3: [75, 25, 0, 0, 0], 4: [50, 30, 20, 0, 0],
  5: [40, 33, 25, 2, 0], 6: [25, 40, 30, 5, 0], 7: [19, 30, 35, 15, 1],
  8: [15, 20, 35, 25, 5], 9: [10, 15, 30, 30, 15], 10: [5, 10, 20, 40, 25],
};
export const XP_TO_LEVEL = { 2: 2, 3: 2, 4: 6, 5: 10, 6: 20, 7: 36, 8: 56, 9: 80, 10: 100 };
// 阶段玩家伤害（阶段1..8）
export const STAGE_DAMAGE = [0, 0, 4, 8, 10, 12, 17, 150];
