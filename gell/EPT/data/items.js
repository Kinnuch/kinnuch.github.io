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

// 成装精确数值（M2，取自审核文档；缺项时回退到组件贡献近似公式）
export const COMBO_STATS = {
  安督利尔: { adPct: 44 }, 古尔桑: { adPct: 55 }, 凛吉尔: { adPct: 66 },
  埃格洛斯: { adPct: 24, asPct: 8, sp: 16 }, 奥克锐斯特: { adPct: 30, asPct: 10, sp: 20 }, 贝尔斯隆丁: { adPct: 36, asPct: 12, sp: 24 },
  都林之斧: { asPct: 32 }, 赫鲁格林: { asPct: 40 }, 格拉姆德凛: { asPct: 48 },
  饼干之火: { adPct: 12, sp: 12 }, 安格锐斯特: { adPct: 15, sp: 15 }, 气之戒: { adPct: 18, sp: 18 },
  戴赖尔: { asPct: 12, sp: 8 }, 布瑞国尔之弓: { asPct: 15, sp: 10 }, 埃莱萨: { asPct: 18, sp: 12 },
  火之戒: { sp: 40 }, 银树之叶: { sp: 50 }, 至尊戒: { sp: 60 },
  波罗米尔的号角: { adPct: 16, sp: 16, mana: 12 }, 欧洛米的号角: { adPct: 20, sp: 20, mana: 15 }, 长谷叶: { adPct: 24, sp: 24, mana: 18 },
  魔古尔之刃: { asPct: 16, sp: 12, mana: 12 }, 红箭: { asPct: 20, sp: 15, mana: 15 }, 纳兹古尔之戒: { asPct: 24, sp: 18, mana: 18 },
  阿肯宝石: { sp: 16, mana: 12 }, 领主的金发: { sp: 20, mana: 15 }, 金树之叶: { sp: 24, mana: 18 },
  王之喷泉: { adPct: 16, sp: 16, mana: 16 }, 巴拉希尔之戒: { adPct: 20, sp: 20, mana: 20 }, 暮星项链: { adPct: 24, sp: 24, mana: 24 },
  刚铎骑兵胸甲: { adPct: 8, armor: 16 }, 矮人面具: { adPct: 10, armor: 20 }, 洛格的战盾: { adPct: 12, armor: 24 },
  木桶: { asPct: 8, armor: 16 }, 橡木盾: { asPct: 10, armor: 20 }, 星辰之冠: { asPct: 12, armor: 24 },
  巫师帽: { armor: 16, sp: 24 }, 龙鳞甲: { armor: 20, sp: 20, hp: 100 }, 露西恩的斗篷: { armor: 24, sp: 24, hp: 120 },
  霜龙之角: { mana: 24, armor: 16 }, 甘道夫的匡威: { mana: 30, armor: 20 }, 埃克塞里安的水晶盔: { mana: 36, armor: 24 },
  蓝山矮人铁盾: { armor: 44, hpPct: 5 }, 安卡拉刚的鳞片: { armor: 55, hpPct: 5 }, 秘银甲: { armor: 66, hpPct: 8 },
  八芒星徽章: { adPct: 16, sp: 12, mres: 16 }, 乌苟立安特之齿: { adPct: 20, sp: 15, mres: 20 }, 提卡尔之剑: { adPct: 24, sp: 18, mres: 24 },
  安盖诺尔: { adPct: 20, asPct: 8, mres: 16 }, 卡哈洛斯之牙: { adPct: 25, asPct: 10, mres: 20 }, 炎魔之鞭: { adPct: 30, asPct: 12, mres: 24 },
  瓦尔妲的井水: { sp: 12, mres: 20, hp: 120 }, 瑙格拉都尔的铠甲: { sp: 15, mres: 25, hp: 150 }, 劳瑞林的花瓣: { sp: 18, mres: 30, hp: 180 },
  篆刻有腾格瓦的石砖: { sp: 12, mana: 12, mres: 16 }, 阿刚那斯的指甲盖: { sp: 15, mana: 15, mres: 20 }, 维拉奇尔卡: { sp: 18, mana: 18, mres: 24 },
  路姆巴珥的碎片: { armor: 24, mres: 24, hp: 80 }, 奈纳珥的碎片: { armor: 30, mres: 30, hp: 100 }, 埃伦弥瑞的碎片: { armor: 36, mres: 36, hp: 120 },
  埃克塞里安的笛子: { mres: 52, hpPct: 7 }, 凯勒布林博的锤子: { mres: 65, hpPct: 8 }, 山姆的炖兔子汤: { mres: 78, hpPct: 12 },
  南塔斯仁的柳叶花环: { adPct: 12, hp: 160 }, 欧尔桑克妖火: { adPct: 15, hp: 200 }, 密火: { adPct: 18, hp: 240 },
  埃伦玛奇尔之枪: { hp: 250, asPct: 18 }, 魔苟斯之戒: { hp: 250, sp: 15 }, 洛汗王旗: { hp: 250, mana: 15 },
  遗留之盔: { hp: 250, armor: 30 }, 恩特婆的花楸树: { hp: 250, mres: 25 }, 睡莲盆栽: { hp: 500 },
  胡安的尾巴毛: { hp: 350, asPct: 20 }, 格洛芬德尔之剑: { hp: 350, asPct: 25 }, 加拉兹民的斗篷: { hp: 350, sp: 12 },
  帕兰提尔: { hp: 350, sp: 18 }, 玛格洛尔的竖琴: { hp: 350, mana: 15 }, 杜瓦林的六弦琴: { hp: 350, mana: 25 },
  芬国昐的蓝水晶盾: { hp: 400, armor: 30 }, 瑙格拉弥尔: { hp: 400, armor: 40 }, 拉达加斯特的皮帽: { hp: 400, mres: 25 },
  薇瑞的纺织品: { hp: 400, mres: 35 }, 玻吉尔的碎片: { hp: 650 }, 巨龙之牙: { hp: 900 },
  血腥长矛: { adPct: 15, hsPct: 10 }, 瑁珑树种: { asPct: 15, hsPct: 10 }, 绿龙酒馆佳酿: { sp: 15, hsPct: 10 },
  莱戈拉斯的美声唱片: { mana: 15, hsPct: 10 }, 吉瑞安的项链: { armor: 20, hsPct: 10 }, 夏警帽子: { mres: 20, hsPct: 10 },
  埃拉诺: { hp: 200, hsPct: 10 }, 金鸢尾花: { hsPct: 25 },
  阿佐格的义肢: { adPct: 18, hsPct: 15 }, 大鹰之羽: { adPct: 25, hsPct: 15 }, 希斯莱恩: { asPct: 18, hsPct: 15 },
  汶基洛特的船帆: { asPct: 30, hsPct: 15 }, 沼泽地的鲜美蘑菇: { sp: 18, hsPct: 15 }, 阿尔达的冠冕: { sp: 30, hsPct: 15 },
  王女的汤: { mana: 18, hsPct: 15 }, 辛贝穆奈: { mana: 30, hsPct: 15 }, 放置一个纪元的兰巴斯: { hp: 150, armor: 30, hsPct: 15 },
  食人妖的战鼓: { armor: 45, hsPct: 15 }, 西界红皮书: { mres: 25, hsPct: 15 }, 莱贝斯隆手杖: { mres: 40, hsPct: 15 },
  贝奥恩一族的蜂蜜蛋糕: { hp: 250, hsPct: 15 }, 阿尔达之叶: { hp: 450, hsPct: 15 }, 妮芙瑞迪尔: { hsPct: 30 }, 莱瑞洛雪指环: { hsPct: 40 },
  龙盔: { adPct: 15, critR: 20 }, 加尔沃恩的碎片: { asPct: 15, critR: 20 }, 萨茹曼的手杖: { sp: 15, critR: 20 },
  雄鹿地动员号角: { mana: 15, critR: 20 }, 猛犸的象牙: { armor: 25, critR: 20 }, 替身稻草: { mres: 20, critR: 20 },
  被诅咒的金币: { hp: 200, critR: 20 }, 伊希利恩的野土豆: { hsPct: 12, critR: 20 }, 窃贼手套: {},
  格龙德: { adPct: 20, critR: 30 }, 黑箭: { adPct: 30, critR: 30 }, 阿兰如斯: { asPct: 20, critR: 30 },
  芬巩之弓: { asPct: 32, critR: 30 }, 华贵罗瑞恩长弓: { sp: 15, critR: 30 }, 水之戒: { sp: 30, critR: 30 },
  奎维耶能湖水: { mana: 18, critR: 30 }, 乌欧牟的海螺号角: { mana: 30, critR: 30 }, 德拉姆博烈格: { armor: 30, critR: 30 },
  安努米那斯的权杖: { armor: 45, critR: 30 }, 邪念斗篷: { mres: 25, critR: 30 }, 金项圈: { mres: 40, critR: 30 },
  加尔多的投石索: { hp: 250, critR: 30 }, 安格玛巫王的钉头锤: { hp: 450, critR: 30 }, 宁斐洛斯: { hsPct: 12, critR: 30 },
  魔苟斯的铁王冠: { hsPct: 18, critR: 30 }, 格里马的财宝箱: { critR: 45, critD: 20 }, 飞贼的戒指: {},
};

// 组件在成装中的贡献（精确表缺项时的回退公式）
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
  '窃贼手套': { thief: 'small', note: '小偷偷：占用棋子全部3个装备栏，每场战斗开始时随机偷来2件散件装上（仅当场有效，每场重新随机）' },
  '飞贼的戒指': { thief: 'big', note: '大偷偷：占用棋子全部3个装备栏，每场战斗开始时随机偷来2件成装装上（仅当场有效，每场重新随机）' },
  '戴赖尔': { asOnAttack: 2, note: '攻击提供可叠加的2%攻速' },
  '布瑞国尔之弓': { asOnAttack: 4, note: '攻击提供可叠加的4%攻速' },
  '埃莱萨': { asOnAttack: 7, note: '攻击提供可叠加的7%攻速' },
  '阿肯宝石': { spRamp: 10, rampEvery: 5, note: '战斗中每5秒获得10自适应强度' },
  '领主的金发': { spRamp: 20, rampEvery: 5, note: '战斗中每5秒获得20自适应强度' },
  '金树之叶': { spRamp: 7, rampEvery: 1, note: '战斗中每秒获得7自适应强度' },
  '魔古尔之刃': { every3rdMagic: 50, magicTargets: 1, note: '每第3次攻击对目标造成50魔法伤害（自适应）' },
  '红箭': { every3rdMagic: 30, magicTargets: 4, note: '每第3次攻击对4名敌人造成30魔法伤害（自适应）' },
  '纳兹古尔之戒': { every3rdMagic: 20, magicTargets: 99, note: '每第3次攻击对全体敌人造成20魔法伤害（自适应）' },
  '奎维耶能湖水': { startMana: 30, note: '战斗开始时获得30点法力' },
  '暮星项链': { dmgAmp: 8, note: '造成伤害增加8%' },
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
  if (LIGHT_ITEM_STATS[name]) stats = { ...LIGHT_ITEM_STATS[name] };
  else if (COMBO_STATS[name]) stats = { ...COMBO_STATS[name] };
  else {
    stats = {};
    for (const c of [c1, c2]) {
      const b = COMBINE_BONUS[c] || {};
      for (const k in b) stats[k] = (stats[k] || 0) + b[k];
    }
  }
  const eff = COMBO_EFFECTS[name] || null;
  if (eff && !COMBO_STATS[name]) {
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

// ---------- 消耗道具（M2） ----------
export const CONSUMABLES = {
  smallDup: { name: '小复制器', note: '选择一名己方 1~3 费棋子，获得一张该棋子的 1 星卡。', target: 'unit' },
  bigDup: { name: '大复制器', note: '选择一名己方任意棋子，获得一张该棋子的 1 星卡。', target: 'unit' },
  jobBook: { name: '转职书', note: '使一名己方棋子获得一个随机羁绊（每名棋子仅能转职一次）。', target: 'unit' },
  dice: { name: '骰子', note: '放到一名己方棋子上：商店免费特殊刷新，5张卡全部与该棋子共享至少一个羁绊。', target: 'unit' },
  silmaril: { name: '精灵宝钻', note: '神器装备：六维亲和度各+12，且永远视为"最强大"。代价：敌方安格班弈子对你的队伍伤害+5%。', target: 'unit', equip: true },
  remover: { name: '拆卸器', note: '卸下一名棋子身上的全部装备，放回物品栏。', target: 'unit' },
  reforger: { name: '重铸器', note: '将一件装备重铸为同级别的随机另一件装备。', target: 'item' },
  upgrader: { name: '散件升级器', note: '将一件小散件升级为同类的大散件。', target: 'item' },
};
export function makeConsumable(type) {
  const c = CONSUMABLES[type];
  return { kind: 'consumable', type, name: c.name, note: c.note, stats: {} };
}
export function makeSilmaril() {
  return { kind: 'artifact', name: '精灵宝钻', stats: { affAll: 12 }, eff: { silmaril: true, note: '六维亲和度各+12；永远视为"最强大"；敌方安格班对你的队伍伤害+5%' }, note: '' };
}
export function randomCombinedItem(rng) {
  const keys = Object.keys(COMBO_NAMES).filter(k => !k.endsWith('+al'));
  const [a, b] = rng.pick(keys).split('+');
  return makeCombinedItem(a, b);
}
const T1_TO_T2 = { ad1: 'ad2', as1: 'as2', ap1: 'ap2', m1: 'm2', a1: 'a2', mr1: 'mr2', hp1: 'hp2', hs1: 'hs2', csc1: 'csc2' };
export function upgradeComponent(it) {
  const t2 = T1_TO_T2[it.comp];
  return t2 ? makeComponentItem(t2) : null;
}
export function reforgeItem(it, rng) {
  if (it.kind === 'component') {
    const pool = (it.tier === 1 ? T1_COMPS : T2_COMPS).filter(c => c !== it.comp);
    return makeComponentItem(rng.pick(pool));
  }
  if (it.kind === 'combined' && it.comps) {
    const lvl = k => COMPONENTS[k].tier;
    const myLvl = lvl(it.comps[0]) + lvl(it.comps[1]);
    const cands = Object.keys(COMBO_NAMES).filter(key => {
      const [a, b] = key.split('+');
      if (a === 'al' || b === 'al') return false;
      return lvl(a) + lvl(b) === myLvl && COMBO_NAMES[key] !== it.name;
    });
    if (!cands.length) return null;
    const [a, b] = rng.pick(cands).split('+');
    return makeCombinedItem(a, b);
  }
  return null;
}
