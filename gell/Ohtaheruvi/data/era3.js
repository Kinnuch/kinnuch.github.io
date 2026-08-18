// 第三纪元 · 中洲西北的势力、兵种、英雄、神器
// （设计文档 02 章第二节、03 章第二节）
//
// 势力编号从 11 起，与第一纪元的 1~9 分开，同一份存档格式能装两个纪元。
// 兵种底盘与第一纪元共用，只是换名换图；代码里始终是一张表，
// 由地图各城的产兵表决定哪些能造。

export const FACTIONS_T3 = {
  11: { id: 11, name: '刚铎',                short: '刚铎',   color: '#cfd6e0', dark: '#6f7784', emblem: '☘', side: 'light', era: 3,
        lord: '迪耐瑟二世', trait: '塔楼卫队',
        blurb: '中洲最后的堡垒，城多、收入高，正面顶着魔多。塔楼卫队守城 +2；但奥斯吉利亚斯就在安都因河对岸，压力从第一回合就来了。' },
  12: { id: 12, name: '洛汗',                short: '洛汗',   color: '#4a9a5a', dark: '#26502e', emblem: '♞', side: 'light', era: 3,
        lord: '希奥顿', trait: '洛希尔骠骑',
        blurb: '骑马的民族，移动 18 的重骑是全场机动力天花板，平原上 +2。城少而散，靠速度换空间。' },
  13: { id: 13, name: '瑞文戴尔与北方杜内丹', short: '瑞文戴尔', color: '#5a6fc8', dark: '#2c366b', emblem: '✶', side: 'light', era: 3,
        lord: '爱隆', trait: '杜内丹游侠',
        blurb: '爱隆的居所与北方的游侠。英雄阵容全场最强（爱隆、阿拉贡、格洛芬德尔各有力量 8），魔戒战争里至尊魔戒也在这里。' },
  14: { id: 14, name: '罗瑞恩',              short: '罗瑞恩', color: '#b8c8d8', dark: '#5f6a76', emblem: '❦', side: 'light', era: 3,
        lord: '凯勒博恩', trait: '罗瑞恩加拉兹民',
        blurb: '金色森林。只有两座城，但加拉德瑞尔力量 9、统率 +3，一支带她的军团就是一把攻城锤。' },
  15: { id: 15, name: '幽暗密林与孤山',       short: '北方同盟', color: '#b8823a', dark: '#63431a', emblem: '⛰', side: 'light', era: 3,
        lord: '瑟兰督伊', trait: '孤山矮人卫队 · 幽暗密林弓手',
        blurb: '林地精灵与孤山矮人的联盟，占着地图东北整片。林中弓手 +2、矮人可翻山，地形吃得最开。' },
  16: { id: 16, name: '艾森加德',            short: '艾森加德', color: '#6a6a72', dark: '#33333a', emblem: '⚙', side: 'dark', era: 3,
        lord: '萨茹曼', trait: '乌鲁克-海 · 攻城食人妖',
        blurb: '只有两座城，但兵种质量极高：乌鲁克-海无白昼惩罚，攻城食人妖攻城无视城防。开局就顶在洛汗鼻子底下。' },
  17: { id: 17, name: '魔多',                short: '魔多',   color: '#8a2a2a', dark: '#3f1010', emblem: '◉', side: 'dark', era: 3,
        lord: '索伦（坐镇巴拉都尔）', trait: '戒灵 · 食人妖 · 半兽人海',
        blurb: '三面环山的黑地，只有黑门与西力斯乌苟两个出入口——易守难攻，出兵也慢。戒灵会飞、力量 8 且带恐惧，被杀后还会在巴拉都尔重生。' },
  18: { id: 18, name: '哈拉德与东方人',       short: '哈拉德', color: '#c8a03a', dark: '#6b541a', emblem: '☾', side: 'dark', era: 3,
        lord: '蛇王', trait: '哈拉德战象 · 东方人战车',
        blurb: '南方与东方的两块飞地，隔着大半张地图。战象强度 7、耐久 4，平原上 +2，是黑暗方唯一的重装冲击力量。' },
};

export const UNITS_T3 = {
  // ── 自由之民 ──
  bree_militia: {
    id: 'bree_militia', name: '布理民兵', faction: 'light', era: 3,
    str: 2, hp: 2, mp: 10, cost: 4, build: 1,
    terr: {}, tags: ['living', 'man'], flags: [], swatch: '#9a8a6a',
  },
  gondor_militia: {
    id: 'gondor_militia', name: '刚铎民兵', faction: 'light', era: 3,
    str: 3, hp: 2, mp: 10, cost: 6, build: 1,
    terr: { P: 1, F: 1 }, tags: ['living', 'man'], flags: [], swatch: '#b0b6c0',
  },
  gondor_guard: {
    id: 'gondor_guard', name: '刚铎卫士', faction: 'light', era: 3,
    str: 4, hp: 2, mp: 8, cost: 10, build: 2,
    terr: { city: 1 }, tags: ['living', 'man'], flags: [], swatch: '#8f97a6',
  },
  tower_guard: {
    id: 'tower_guard', name: '塔楼卫队', faction: 'light', era: 3,
    str: 6, hp: 3, mp: 8, cost: 28, build: 4,
    terr: { city: 2 }, tags: ['living', 'man'], flags: [], swatch: '#e6e9ee',
  },
  rohirrim: {
    id: 'rohirrim', name: '洛希尔骠骑', nameElvish: 'Rochirrim', lang: 's', gloss: '辛达语「马之主们」',
    faction: 'light', era: 3,
    str: 6, hp: 2, mp: 18, cost: 26, build: 4,
    terr: { P: 2, F: 2, T: -1 }, tags: ['living', 'man', 'mounted'], flags: [], swatch: '#4a9a5a',
  },
  ithilien_ranger: {
    id: 'ithilien_ranger', name: '伊西利恩游侠', faction: 'light', era: 3,
    str: 5, hp: 2, mp: 12, cost: 18, build: 3,
    terr: { T: 2 }, tags: ['living', 'man'], flags: ['forestrider'], swatch: '#6a8a5a',
  },
  dunedain_ranger: {
    id: 'dunedain_ranger', name: '杜内丹游侠', nameElvish: 'Dúnedain', lang: 's', gloss: '辛达语「西方之民」',
    faction: 'light', era: 3,
    str: 6, hp: 2, mp: 14, cost: 26, build: 4,
    terr: { T: 1, H: 1 }, tags: ['living', 'man'], flags: [], swatch: '#5a6fc8',
  },
  mirkwood_archer: {
    id: 'mirkwood_archer', name: '幽暗密林弓手', faction: 'light', era: 3,
    str: 4, hp: 2, mp: 10, cost: 12, build: 2,
    terr: { T: 2 }, tags: ['living', 'elf'], flags: [], swatch: '#5c7a4a',
  },
  lorien_galadhrim: {
    id: 'lorien_galadhrim', name: '罗瑞恩加拉兹民', nameElvish: 'Galadhrim', lang: 's', gloss: '辛达语「树之民」',
    faction: 'light', era: 3,
    str: 5, hp: 2, mp: 10, cost: 18, build: 3,
    terr: { T: 2 }, tags: ['living', 'elf'], flags: [], swatch: '#c0cbd6',
  },
  erebor_guard: {
    id: 'erebor_guard', name: '孤山矮人卫队', faction: 'light', era: 3,
    str: 5, hp: 3, mp: 8, cost: 22, build: 3,
    terr: { M: 2, H: 1 }, tags: ['living', 'dwarf'], flags: ['mountaineer'], swatch: '#b8823a',
  },
  dale_archer: {
    id: 'dale_archer', name: '河谷弓手', faction: 'light', era: 3,
    str: 4, hp: 2, mp: 10, cost: 12, build: 2,
    terr: { P: 1 }, tags: ['living', 'man'], flags: [], swatch: '#c0a060',
  },
  great_eagle: {
    id: 'great_eagle', name: '巨鹰', nameElvish: 'Thoron', lang: 's', gloss: '辛达语「鹰」（复数形待核）',
    faction: 'ally', era: 3,
    str: 6, hp: 3, mp: 24, cost: 40, build: 5,
    terr: {}, tags: ['living', 'beast'], flags: ['fly', 'noCapture'], swatch: '#c8b070',
  },
  dead_men: {
    id: 'dead_men', name: '死者之军', faction: 'ally', era: 3, scenarioOnly: true,
    str: 7, hp: 3, mp: 16, cost: 0, build: 0, upkeep: 0,
    terr: {}, tags: ['undead'], flags: ['ignoreTerrain', 'noCapture', 'antiLiving'], swatch: '#8fd0c0',
  },
  ent: {
    id: 'ent', name: '树人', nameElvish: 'Onodrim', lang: 's', gloss: '辛达语（复数）',
    faction: 'ally', era: 3, scenarioOnly: true,
    str: 7, hp: 4, mp: 8, cost: 0, build: 0, upkeep: 0,
    terr: { T: 2 }, tags: ['living'], flags: ['siegebreaker', 'forestrider'], swatch: '#4a6a3a',
  },

  // ── 黑暗势力 ──
  moria_orc: {
    id: 'moria_orc', name: '摩瑞亚半兽人', nameElvish: 'Yrch', lang: 's', gloss: '辛达语「奥克」（复数）',
    faction: 'dark', era: 3,
    str: 3, hp: 2, mp: 10, cost: 7, build: 1,
    terr: { M: 1 }, tags: ['living', 'orc'], flags: ['mountaineer'], swatch: '#5a5a4a',
  },
  uruk_hai: {
    id: 'uruk_hai', name: '乌鲁克-海', nameElvish: 'Uruk-hai', lang: 'bs', gloss: '黑语',
    faction: 'dark', era: 3,
    str: 5, hp: 2, mp: 12, cost: 18, build: 3,
    terr: {}, tags: ['living', 'orc'], flags: [], swatch: '#4a4a52',
  },
  black_numenorean: {
    id: 'black_numenorean', name: '黑努门诺尔人', faction: 'dark', era: 3,
    str: 6, hp: 2, mp: 10, cost: 26, build: 4,
    terr: {}, tags: ['living', 'man'], flags: [], swatch: '#6a2a2a',
  },
  olog_hai: {
    id: 'olog_hai', name: '食人妖', nameElvish: 'Olog-hai', lang: 'bs', gloss: '黑语（索伦培育的强化食人妖）',
    faction: 'dark', era: 3,
    str: 6, hp: 3, mp: 8, cost: 30, build: 4,
    terr: { M: 2 }, tags: ['living', 'troll'], flags: ['mountaineer', 'sun'], swatch: '#6b7a6b',
  },
  siege_troll: {
    id: 'siege_troll', name: '攻城食人妖', faction: 'dark', era: 3,
    str: 6, hp: 4, mp: 6, cost: 40, build: 5,
    terr: {}, tags: ['living', 'troll'], flags: ['siegebreaker'], swatch: '#5a6a5a',
  },
  easterling_chariot: {
    id: 'easterling_chariot', name: '东方人战车', faction: 'dark', era: 3,
    str: 5, hp: 2, mp: 16, cost: 20, build: 3,
    terr: { P: 2, F: 2 }, tags: ['living', 'man', 'mounted'], flags: [], swatch: '#c8a03a',
  },
  mumak: {
    id: 'mumak', name: '哈拉德战象', nameElvish: 'Mumakil', lang: 'ha', gloss: '哈拉德语（复数）',
    faction: 'dark', era: 3,
    str: 7, hp: 4, mp: 12, cost: 50, build: 6,
    terr: { P: 2, F: 2 }, tags: ['living', 'beast'], flags: [], swatch: '#8a6a4a',
  },
  shelob_spawn: {
    id: 'shelob_spawn', name: '巨蛛', faction: 'dark', era: 3,
    str: 6, hp: 3, mp: 12, cost: 34, build: 5,
    terr: { T: 2 }, tags: ['living', 'beast'], flags: ['mountaineer'], swatch: '#3a2a3a',
  },
  nazgul: {
    id: 'nazgul', name: '戒灵', nameElvish: 'Nazgul', lang: 'bs', gloss: '黑语；昆雅作 Ulairi',
    faction: 'dark', era: 3, scenarioOnly: true,
    str: 8, hp: 3, mp: 20, cost: 0, build: 0, upkeep: 30,
    terr: {}, tags: ['undead'], flags: ['fly', 'fear'], swatch: '#2a1a2a',
  },
  orc_soldier: {
    id: 'orc_soldier', name: '半兽人步兵', nameElvish: 'Snaga', lang: 'bs', gloss: '黑语「奴隶」',
    faction: 'dark', era: 3,
    str: 3, hp: 2, mp: 10, cost: 5, build: 1,
    terr: { W: 1 }, tags: ['living', 'orc'], flags: [], swatch: '#6a6a4a',
  },
  orc_bowman: {
    id: 'orc_bowman', name: '半兽人弓手', faction: 'dark', era: 3,
    str: 3, hp: 2, mp: 10, cost: 8, build: 2,
    terr: { W: 1 }, tags: ['living', 'orc'], flags: [], swatch: '#5c6040',
  },
  warg_pack: {
    id: 'warg_pack', name: '座狼骑兵', faction: 'dark', era: 3,
    str: 4, hp: 2, mp: 18, cost: 16, build: 2,
    terr: { W: 1, T: 1 }, tags: ['living', 'orc', 'mounted'], flags: [], swatch: '#7a5a3a',
  },
};

export const HEROES_T3 = {
  11: [ // 刚铎
    { id: 'denethor', name: '迪耐瑟二世', str: 5, mp: 12, role: 'lord' },
    { id: 'boromir', name: '波洛米尔', str: 7, mp: 12, role: 'heir' },
    { id: 'faramir', name: '法拉米尔', str: 6, mp: 14, role: 'hire' },
    { id: 'imrahil', name: '伊姆拉希尔亲王', str: 7, mp: 16, role: 'hire' },
    { id: 'beregond', name: '贝瑞贡德', str: 5, mp: 12, role: 'hire' },
  ],
  12: [ // 洛汗
    { id: 'theoden', name: '希奥顿', str: 6, mp: 16, role: 'lord' },
    { id: 'eomer', name: '伊奥梅尔', str: 7, mp: 18, role: 'heir' },
    { id: 'eowyn', name: '伊奥温', str: 7, mp: 16, role: 'hire' },
    { id: 'elfhelm', name: '埃尔夫海姆', str: 6, mp: 18, role: 'hire' },
    { id: 'grimbold', name: '格里姆博德', str: 5, mp: 16, role: 'hire' },
  ],
  13: [ // 瑞文戴尔与北方杜内丹
    { id: 'elrond', name: '爱隆', str: 8, mp: 12, role: 'lord' },
    { id: 'aragorn', name: '阿拉贡', str: 8, mp: 16, role: 'heir' },
    { id: 'glorfindel3', name: '格洛芬德尔', str: 8, mp: 16, role: 'hire' },
    { id: 'elladan', name: '埃尔拉丹', str: 7, mp: 16, role: 'hire' },
    { id: 'elrohir', name: '埃尔洛希尔', str: 7, mp: 16, role: 'hire' },
    { id: 'halbarad', name: '哈尔巴拉德', str: 6, mp: 14, role: 'hire' },
  ],
  14: [ // 罗瑞恩
    { id: 'celeborn', name: '凯勒博恩', str: 7, mp: 12, role: 'lord' },
    { id: 'galadriel', name: '加拉德瑞尔', str: 9, mp: 12, role: 'heir' },
    { id: 'haldir', name: '哈尔迪尔', str: 6, mp: 14, role: 'hire' },
    { id: 'rumil', name: '鲁米尔', str: 5, mp: 14, role: 'hire' },
  ],
  15: [ // 幽暗密林与孤山
    { id: 'thranduil', name: '瑟兰督伊', str: 7, mp: 14, role: 'lord' },
    { id: 'legolas', name: '莱戈拉斯', str: 7, mp: 16, role: 'heir' },
    { id: 'gimli', name: '金雳', str: 7, mp: 10, role: 'hire' },
    { id: 'dain', name: '丹恩二世', str: 6, mp: 10, role: 'hire' },
    { id: 'bard2', name: '巴德二世', str: 6, mp: 12, role: 'hire' },
    { id: 'brand', name: '布兰德', str: 5, mp: 12, role: 'hire' },
  ],
  16: [ // 艾森加德
    { id: 'saruman', name: '萨茹曼', str: 8, mp: 12, role: 'lord' },
    { id: 'ugluk', name: '乌格鲁克', str: 6, mp: 12, role: 'heir' },
    { id: 'wormtongue', name: '蛇信格里马', str: 3, mp: 12, role: 'hire' },
  ],
  17: [ // 魔多
    { id: 'witch_king', name: '安格马巫王', str: 9, mp: 18, role: 'lord', fear: true },
    { id: 'khamul', name: '克哈牟尔', str: 8, mp: 18, role: 'heir', fear: true },
    { id: 'mouth_of_sauron', name: '索伦之口', str: 7, mp: 14, role: 'hire' },
    { id: 'gothmog3', name: '戈索格', str: 6, mp: 12, role: 'hire' },
  ],
  18: [ // 哈拉德与东方人
    { id: 'serpent_lord', name: '蛇王', str: 6, mp: 14, role: 'lord' },
    { id: 'umbar_captain', name: '昂巴海盗船长', str: 6, mp: 14, role: 'heir' },
    { id: 'rhun_lord', name: '瑞恩的战车领主', str: 6, mp: 16, role: 'hire' },
    { id: 'south_general', name: '南方的将军', str: 5, mp: 12, role: 'hire' },
  ],
};

export const ITEMS_T3 = {
  anduril:     { id: 'anduril', name: '安都瑞尔', kind: 'battle', battle: 3,
                 desc: '战斗强度 +3；持有者可召唤死者之军（一局一次）' },
  glamdring3:  { id: 'glamdring3', name: '格拉姆德凌', kind: 'battle', battle: 2, desc: '战斗强度 +2' },
  orcrist3:    { id: 'orcrist3', name: '奥克锐斯特', kind: 'battle', battle: 2, desc: '战斗强度 +2' },
  sting:       { id: 'sting', name: '刺叮', kind: 'battle', battle: 1, antiOrc: 2,
                 desc: '战斗强度 +1；对半兽人／乌鲁克 +2' },
  mithril_coat:{ id: 'mithril_coat', name: '秘银甲', kind: 'special', hp: 1, desc: '耐久 +1' },
  phial:       { id: 'phial', name: '加拉德瑞尔的水晶瓶', kind: 'special', immuneFear: true, antiUndead: 3,
                 desc: '对亡灵／蜘蛛 +3；免疫恐惧' },
  palantir:    { id: 'palantir', name: '真知晶石', kind: 'special', vision: 6,
                 desc: '视野 +6；每次使用有被索伦反制的风险' },
  horn_rohan:  { id: 'horn_rohan', name: '洛汗的大号角', kind: 'command', command: 2, desc: '统率 +2' },
  horn_buck:   { id: 'horn_buck', name: '巴克兰号角', kind: 'command', command: 1,
                 desc: '统率 +1；驱散相邻敌军团的恐惧' },
  elendilmir:  { id: 'elendilmir', name: '埃兰迪尔之星', kind: 'command', command: 2, desc: '统率 +2；夜战无惩罚' },
  one_ring:    { id: 'one_ring', name: '至尊魔戒', kind: 'special', mp: 4, unique: true,
                 desc: '持有者不被 AI 锁定、移动 +4；每回合累积腐化；带至末日火山即光明方胜利' },
};

export const RUIN_ITEM_POOL_T3 = [
  'anduril', 'glamdring3', 'orcrist3', 'sting', 'mithril_coat',
  'phial', 'palantir', 'horn_rohan', 'horn_buck', 'elendilmir',
];
