// EPT · M1 装备
// 强度/抗性均为“自适应”（sp=自适应强度, mres=自适应抗性）——加到棋子较高的一系
// M1 简化：成装数值用组件贡献表推算（近似审核文档），特殊效果实装一部分，其余 M2 精确化。

export const COMPONENTS = {
  ad1: { name: '阿尔诺重剑', tier: 1, stats: { adPct: 8 } },
  ad2: { name: '白塔守卫的佩剑', tier: 2, stats: { adPct: 12 } },
  as1: { name: '绿精灵的短匕', tier: 1, stats: { asPct: 8 } },
  as2: { name: '努门诺尔刚弓', tier: 2, stats: { asPct: 12 } },
  ap1: { name: '甘道夫的烟斗', tier: 1, stats: { sp: 8 } },
  ap2: { name: '费艾诺之灯', tier: 2, stats: { sp: 12 } },
  m1: { name: '涅娜的泪珠', tier: 1, stats: { mana: 10 } },
  m2: { name: '精灵的绿叶胸针', tier: 2, stats: { mana: 20 } },
  a1: { name: '洛汗锁子甲', tier: 1, stats: { armor: 15 } },
  a2: { name: '矮人圆盾', tier: 2, stats: { armor: 25 } },
  mr1: { name: '刺叮剑', tier: 1, stats: { mres: 15 } },
  mr2: { name: '星光瓶', tier: 2, stats: { mres: 25 } },
  hp1: { name: '米茹沃', tier: 1, stats: { hp: 100 } },
  hp2: { name: '兰巴斯', tier: 2, stats: { hp: 200 } },
  hs1: { name: '王叶草', tier: 1, stats: { hsPct: 8 } },
  hs2: { name: '树人饮料', tier: 2, stats: { hsPct: 12 } },
  csc1: { name: '矮人工匠的重锤', tier: 1, stats: { critR: 15 } },
  csc2: { name: '加拉兹民的长弓', tier: 2, stats: { critR: 25 } },
  al: { name: '双圣树的光辉', tier: 2, stats: { affAll: 4 }, isAL: true },
};

// 组件在成装中的贡献（M1 近似值）
const COMBINE_BONUS = {
  ad1: { adPct: 18 }, ad2: { adPct: 26 },
  as1: { asPct: 18 }, as2: { asPct: 26 },
  ap1: { sp: 18 }, ap2: { sp: 26 },
  m1: { mana: 15 }, m2: { mana: 25 },
  a1: { armor: 30 }, a2: { armor: 45 },
  mr1: { mres: 28 }, mr2: { mres: 42 },
  hp1: { hp: 220 }, hp2: { hp: 380 },
  hs1: { hsPct: 12 }, hs2: { hsPct: 18 },
  csc1: { critR: 20 }, csc2: { critR: 30 },
};

// 全部成装名称表（key 为按组件顺序排序的 "x+y"）
const ORDER = ['ad1', 'ad2', 'as1', 'as2', 'ap1', 'ap2', 'm1', 'm2', 'a1', 'a2', 'mr1', 'mr2', 'hp1', 'hp2', 'hs1', 'hs2', 'csc1', 'csc2', 'al'];
export const COMBO_NAMES = {
  'ad1+ad1': '安督利尔', 'ad1+ad2': '古尔桑', 'ad2+ad2': '凛吉尔',
  'ad1+as1': '埃格洛斯', 'as1+as1': '都林之斧', 'ad1+as2': '奥克锐斯特', 'ad2+as2': '贝尔斯隆丁',
  'as1+as2': '赫鲁格林', 'as2+as2': '格拉姆德凛',
  'ad1+ap1': '饼干之火', 'as1+ap1': '戴赖尔', 'ap1+ap1': '火之戒',
  'ad1+ap2': '安格锐斯特', 'ad2+ap2': '气之戒', 'as1+ap2': '布瑞国尔之弓', 'as2+ap2': '埃莱萨',
  'ap1+ap2': '银树之叶', 'ap2+ap2': '至尊戒',
  'ad1+m1': '波罗米尔的号角', 'as1+m1': '魔古尔之刃', 'ap1+m1': '阿肯宝石', 'm1+m1': '王之喷泉',
  'ad1+m2': '欧洛米的号角', 'ad2+m2': '长谷叶', 'as1+m2': '红箭', 'as2+m2': '纳兹古尔之戒',
  'ap1+m2': '领主的金发', 'ap2+m2': '金树之叶', 'm1+m2': '巴拉希尔之戒', 'm2+m2': '暮星项链',
  'ad1+a1': '刚铎骑兵胸甲', 'as1+a1': '木桶', 'ap1+a1': '巫师帽', 'm1+a1': '霜龙之角', 'a1+a1': '蓝山矮人铁盾',
  'ad1+a2': '矮人面具', 'ad2+a2': '洛格的战盾', 'as1+a2': '橡木盾', 'as2+a2': '星辰之冠',
  'ap1+a2': '龙鳞甲', 'ap2+a2': '露西恩的斗篷', 'm1+a2': '甘道夫的匡威', 'm2+a2': '埃克塞里安的水晶盔',
  'a1+a2': '安卡拉刚的鳞片', 'a2+a2': '秘银甲',
  'ad1+mr1': '八芒星徽章', 'as1+mr1': '安盖诺尔', 'ap1+mr1': '瓦尔妲的井水', 'm1+mr1': '篆刻有腾格瓦的石砖',
  'a1+mr1': '路姆巴珥的碎片', 'mr1+mr1': '埃克塞里安的笛子',
  'ad1+mr2': '乌苟立安特之齿', 'ad2+mr2': '提卡尔之剑', 'as1+mr2': '卡哈洛斯之牙', 'as2+mr2': '炎魔之鞭',
  'ap1+mr2': '瑙格拉都尔的铠甲', 'ap2+mr2': '劳瑞林的花瓣', 'm1+mr2': '阿刚那斯的指甲盖', 'm2+mr2': '维拉奇尔卡',
  'a1+mr2': '奈纳珥的碎片', 'a2+mr2': '埃伦弥瑞的碎片', 'mr1+mr2': '凯勒布林博的锤子', 'mr2+mr2': '山姆的炖兔子汤',
  'ad1+hp1': '南塔斯仁的柳叶花环', 'as1+hp1': '埃伦玛奇尔之枪', 'ap1+hp1': '魔苟斯之戒', 'm1+hp1': '洛汗王旗',
  'a1+hp1': '遗留之盔', 'mr1+hp1': '恩特婆的花楸树', 'hp1+hp1': '睡莲盆栽',
  'ad1+hp2': '欧尔桑克妖火', 'ad2+hp2': '密火', 'as1+hp2': '胡安的尾巴毛', 'as2+hp2': '格洛芬德尔之剑',
  'ap1+hp2': '加拉兹民的斗篷', 'ap2+hp2': '帕兰提尔', 'm1+hp2': '玛格洛尔的竖琴', 'm2+hp2': '杜瓦林的六弦琴',
  'a1+hp2': '芬国昐的蓝水晶盾', 'a2+hp2': '瑙格拉弥尔', 'mr1+hp2': '拉达加斯特的皮帽', 'mr2+hp2': '薇瑞的纺织品',
  'hp1+hp2': '玻吉尔的碎片', 'hp2+hp2': '巨龙之牙',
  'ad1+hs1': '血腥长矛', 'as1+hs1': '瑁珑树种', 'ap1+hs1': '绿龙酒馆佳酿', 'm1+hs1': '莱戈拉斯的美声唱片',
  'a1+hs1': '吉瑞安的项链', 'mr1+hs1': '夏警帽子', 'hp1+hs1': '埃拉诺', 'hs1+hs1': '金鸢尾花',
  'ad1+hs2': '阿佐格的义肢', 'ad2+hs2': '大鹰之羽', 'as1+hs2': '希斯莱恩', 'as2+hs2': '汶基洛特的船帆',
  'ap1+hs2': '沼泽地的鲜美蘑菇', 'ap2+hs2': '阿尔达的冠冕', 'm1+hs2': '王女的汤', 'm2+hs2': '辛贝穆奈',
  'a1+hs2': '放置一个纪元的兰巴斯', 'a2+hs2': '食人妖的战鼓', 'mr1+hs2': '西界红皮书', 'mr2+hs2': '莱贝斯隆手杖',
  'hp1+hs2': '贝奥恩一族的蜂蜜蛋糕', 'hp2+hs2': '阿尔达之叶', 'hs1+hs2': '妮芙瑞迪尔', 'hs2+hs2': '莱瑞洛雪指环',
  'ad1+csc1': '龙盔', 'as1+csc1': '加尔沃恩的碎片', 'ap1+csc1': '萨茹曼的手杖', 'm1+csc1': '雄鹿地动员号角',
  'a1+csc1': '猛犸的象牙', 'mr1+csc1': '替身稻草', 'hp1+csc1': '被诅咒的金币', 'hs1+csc1': '伊希利恩的野土豆',
  'csc1+csc1': '窃贼手套',
  'ad1+csc2': '格龙德', 'ad2+csc2': '黑箭', 'as1+csc2': '阿兰如斯', 'as2+csc2': '芬巩之弓',
  'ap1+csc2': '华贵罗瑞恩长弓', 'ap2+csc2': '水之戒', 'm1+csc2': '奎维耶能湖水', 'm2+csc2': '乌欧牟的海螺号角',
  'a1+csc2': '德拉姆博烈格', 'a2+csc2': '安努米那斯的权杖', 'mr1+csc2': '邪念斗篷', 'mr2+csc2': '金项圈',
  'hp1+csc2': '加尔多的投石索', 'hp2+csc2': '安格玛巫王的钉头锤', 'hs1+csc2': '宁斐洛斯', 'hs2+csc2': '魔苟斯的铁王冠',
  'csc1+csc2': '格里马的财宝箱', 'csc2+csc2': '飞贼的戒指',
  'ad2+al': '泰尔佩瑞安的枝条', 'as2+al': '劳瑞林的流光', 'ap2+al': '维林诺的正午', 'm2+al': '圣泉之水',
  'a2+al': '加拉希理安之干', 'mr2+al': '宁洛丝之花', 'hp2+al': '双树的甘露', 'hs2+al': '雅凡娜的颂歌',
  'csc2+al': '初升之日的锋芒',
};

// M1 已实装特殊效果的成装（其余成装仅属性生效，效果 M2）
export const COMBO_EFFECTS = {
  '安督利尔': { dmgAmp: 3, note: '造成3%额外伤害' },
  '古尔桑': { dmgAmp: 6, note: '造成6%额外伤害' },
  '凛吉尔': { onHitStatus: { type: 'chill', dur: 1 }, note: '攻击附带冰冷1秒' },
  '都林之斧': { dmgAmp: 2, onHitStatus: { type: 'gw', dur: 1 }, note: '+2%伤害；攻击附带重伤1秒' },
  '赫鲁格林': { dmgAmp: 4, onHitStatus: { type: 'burn', dur: 3, and: 'gw' }, note: '+4%伤害；攻击附带灼烧与重伤3秒' },
  '格拉姆德凛': { dmgAmp: 7, onHitStatus: { type: 'gw', dur: 5, and: 'chill' }, note: '+7%伤害；攻击附带重伤5秒与冰冷1秒' },
  '饼干之火': { vamp: 8, note: '8%全能吸血' },
  '安格锐斯特': { vamp: 15, note: '15%全能吸血' },
  '气之戒': { vamp: 25, note: '25%全能吸血' },
  '火之戒': { dmgAmp: 8, note: '造成8%额外伤害' },
  '银树之叶': { dmgAmp: 15, note: '造成15%额外伤害' },
  '八芒星徽章': { vamp: 12, note: '12%全能吸血' },
  '波罗米尔的号角': { manaOnAttack: 2, note: '攻击额外回2法力' },
  '欧洛米的号角': { manaOnAttack: 4, note: '攻击额外回4法力' },
  '长谷叶': { manaOnAttack: 7, note: '攻击额外回7法力' },
  '巫师帽': { startShieldPct: 20, note: '开战获得20%最大生命护盾8秒' },
  '龙鳞甲': { startShieldPct: 20, note: '开战获得20%最大生命护盾8秒' },
  '露西恩的斗篷': { startShieldPct: 40, note: '开战获得40%最大生命护盾8秒' },
  '蓝山矮人铁盾': { hpPct: 5, dr: 4, note: '+5%最大生命；受到伤害-4%' },
  '安卡拉刚的鳞片': { hpPct: 5, dr: 5, thorns: 80, note: '+5%生命；-5%受伤；被击反伤80（自适应，2秒CD）' },
  '秘银甲': { hpPct: 8, dr: 8, thorns: 120, note: '+8%生命；-8%受伤；被击反伤120（自适应，2秒CD）' },
  '埃克塞里安的笛子': { hpPct: 7, note: '+7%最大生命' },
  '凯勒布林博的锤子': { hpPct: 8, regenPct: 1, note: '+8%生命；每2秒回复2%最大生命' },
  '山姆的炖兔子汤': { hpPct: 12, regenPct: 3, note: '+12%生命；每2秒回复6%最大生命' },
  '金鸢尾花': { regenPct: 1, note: '每秒回复1%最大生命' },
  '窃贼手套': { critR: 25, note: '暴击偷取目标2%当前生命作为治疗' },
  // 光明装（固定光系）
  '泰尔佩瑞安的枝条': { light: true, onHitLightPctAD: 25, note: '攻击额外造成25%AD光明伤害' },
  '劳瑞林的流光': { light: true, every3rdLightPctAD: 50, note: '每第3次攻击追加50%AD光明伤害' },
  '维林诺的正午': { light: true, skillHealPct: 15, note: '技能伤害的15%治疗最低血友军' },
  '圣泉之水': { light: true, startMana: 40, manaOnCast: 10, note: '开战+40法力，施法后回10法力' },
  '加拉希理安之干': { light: true, reflectPct: 10, note: '受物理伤害反弹10%为光明伤害' },
  '宁洛丝之花': { light: true, auraCN: 15, note: '2格内友军+15光抗' },
  '双树的甘露': { light: true, regenPctPerSec: 1, note: '每秒回复1%最大生命' },
  '雅凡娜的颂歌': { light: true, overhealShield: 300, note: '治疗溢出转护盾（至多300）' },
  '初升之日的锋芒': { light: true, critD: 30, critLightBonus: 80, note: '+30%暴伤；暴击附带80光明伤害' },
};

// 光明装属性（精确取自 06-装备.md 第四节）
export const LIGHT_ITEM_STATS = {
  '泰尔佩瑞安的枝条': { adPct: 35, spLight: 20 },
  '劳瑞林的流光': { asPct: 35 },
  '维林诺的正午': { spLight: 45 },
  '圣泉之水': { mana: 30 },
  '加拉希理安之干': { armor: 60 },
  '宁洛丝之花': { mres: 50 },
  '双树的甘露': { hp: 500 },
  '雅凡娜的颂歌': { hsPct: 30 },
  '初升之日的锋芒': { critR: 40 },
};

export function comboKey(c1, c2) {
  return [c1, c2].sort((a, b) => ORDER.indexOf(a) - ORDER.indexOf(b)).join('+');
}

export function canCombine(c1, c2) {
  const t1 = COMPONENTS[c1], t2 = COMPONENTS[c2];
  if (!t1 || !t2) return false;
  if (c1 === 'al' || c2 === 'al') { // 双圣树的光辉只与大散件（非AL）合成
    const other = c1 === 'al' ? c2 : c1;
    return other !== 'al' && COMPONENTS[other].tier === 2;
  }
  if (t1.tier === 1 && t2.tier === 1) return true;      // 小+小
  if (t1.tier === 2 || t2.tier === 2) return true;      // 大+任意
  return false;
}

export function makeCombinedItem(c1, c2) {
  const key = comboKey(c1, c2);
  const name = COMBO_NAMES[key];
  if (!name) return null;
  let stats;
  if (LIGHT_ITEM_STATS[name]) {
    stats = { ...LIGHT_ITEM_STATS[name] };
  } else {
    stats = {};
    for (const c of [c1, c2]) {
      const b = COMBINE_BONUS[c] || {};
      for (const k in b) stats[k] = (stats[k] || 0) + b[k];
    }
  }
  const eff = COMBO_EFFECTS[name] || null;
  if (eff) {
    for (const k of ['hpPct', 'critR', 'critD']) if (eff[k]) stats[k] = (stats[k] || 0) + eff[k];
  }
  return { kind: 'combined', name, key, comps: [c1, c2], stats, eff, note: eff ? eff.note : '（特殊效果M2实装）' };
}

export function makeComponentItem(id) {
  const c = COMPONENTS[id];
  return { kind: 'component', name: c.name, comp: id, tier: c.tier, stats: { ...c.stats }, isAL: !!c.isAL };
}

export const T1_COMPS = Object.keys(COMPONENTS).filter(k => COMPONENTS[k].tier === 1);
export const T2_COMPS = Object.keys(COMPONENTS).filter(k => COMPONENTS[k].tier === 2 && k !== 'al');
export const LIGHT_ITEM_NAMES = Object.keys(LIGHT_ITEM_STATS);

export function makeLightItem(name) {
  const stats = { ...LIGHT_ITEM_STATS[name] };
  const eff = COMBO_EFFECTS[name] || null;
  return { kind: 'light', name, stats, eff, note: eff ? eff.note : '' };
}
