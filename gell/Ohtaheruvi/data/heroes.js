// 英雄名录（设计文档 03 章 · 第一纪元）
// role: 'lord' 君主（开局即在都城）/ 'heir' 继位者 / 'hire' 可雇佣
// 名录按数组顺序求聘；酬金 = 力量 × 30

import { HEROES_T3 } from './era3.js';
export const HERO_ROSTER = {
  1: [ // 希斯路姆的诺多
    { id: 'fingolfin', name: '芬国昐', str: 9, mp: 14, role: 'lord' },
    { id: 'fingon',    name: '芬巩',   str: 8, mp: 14, role: 'heir' },
    { id: 'hurin',     name: '胡林',   str: 8, mp: 12, role: 'hire' },
    { id: 'huor',      name: '胡奥',   str: 7, mp: 12, role: 'hire' },
    { id: 'galdor',    name: '加尔多', str: 6, mp: 12, role: 'hire' },
    { id: 'dorlomin_lord', name: '多尔洛明的领主', str: 5, mp: 12, role: 'hire' },
  ],
  2: [ // 费艾诺众子
    { id: 'maedhros',   name: '迈兹洛斯',   str: 8, mp: 14, role: 'lord' },
    { id: 'maglor',     name: '迈格洛尔',   str: 7, mp: 14, role: 'heir' },
    { id: 'celegorm',   name: '凯勒巩',     str: 7, mp: 16, role: 'hire' },
    { id: 'curufin',    name: '库茹芬',     str: 7, mp: 14, role: 'hire' },
    { id: 'caranthir',  name: '卡兰希尔',   str: 6, mp: 14, role: 'hire' },
    { id: 'celebrimbor',name: '凯勒布林博', str: 6, mp: 12, role: 'hire' },
    { id: 'amrod',      name: '安罗德',     str: 5, mp: 16, role: 'hire' },
    { id: 'amras',      name: '安瑞斯',     str: 5, mp: 16, role: 'hire' },
    // 费艾诺仅「星下之战」剧本登场，由场景层注入
  ],
  3: [ // 纳国斯隆德
    { id: 'finrod',    name: '芬罗德',     str: 8, mp: 14, role: 'lord' },
    { id: 'orodreth',  name: '欧洛德瑞斯', str: 6, mp: 12, role: 'heir' },
    { id: 'turin',     name: '图林',       str: 8, mp: 12, role: 'hire' },
    { id: 'gwindor',   name: '格温多',     str: 6, mp: 12, role: 'hire' },
    { id: 'edrahil',   name: '埃德拉冯',   str: 5, mp: 12, role: 'hire' },
  ],
  4: [ // 刚多林
    { id: 'turgon',    name: '图尔巩',     str: 8, mp: 12, role: 'lord' },
    { id: 'ecthelion', name: '埃克塞理安', str: 7, mp: 12, role: 'heir' },
    { id: 'glorfindel',name: '格洛芬德尔', str: 8, mp: 14, role: 'hire' },
    { id: 'tuor',      name: '图奥',       str: 7, mp: 12, role: 'hire' },
    { id: 'earendil',  name: '埃雅仁迪尔', str: 7, mp: 14, role: 'hire' },
    { id: 'maeglin',   name: '玛埃格林',   str: 6, mp: 12, role: 'hire' },
    { id: 'rog',       name: '洛格',       str: 6, mp: 10, role: 'hire' },
  ],
  5: [ // 多瑞亚斯
    { id: 'thingol', name: '辛葛',   str: 8, mp: 12, role: 'lord' },
    { id: 'dior',    name: '迪奥',   str: 7, mp: 12, role: 'heir' },
    { id: 'beleg',   name: '贝烈格', str: 7, mp: 16, role: 'hire' },
    { id: 'mablung', name: '马布隆', str: 6, mp: 14, role: 'hire' },
    { id: 'beren',   name: '贝伦',   str: 7, mp: 14, role: 'hire' },
    { id: 'nellas',  name: '奈勒斯', str: 5, mp: 14, role: 'hire' },
  ],
  6: [ // 法拉斯
    { id: 'cirdan',       name: '奇尔丹',       str: 7, mp: 12, role: 'lord' },
    { id: 'falas_captain',name: '法拉斯的船长', str: 6, mp: 12, role: 'heir' },
    { id: 'gelmir',       name: '盖尔米尔',     str: 5, mp: 12, role: 'hire' },
  ],
  7: [ // 蓝色山脉的矮人
    { id: 'azaghal',       name: '阿扎格哈尔',       str: 7, mp: 10, role: 'lord' },
    { id: 'nogrod_lord',   name: '诺格罗德的领主',   str: 6, mp: 10, role: 'heir' },
    { id: 'belegost_smith',name: '贝烈国斯特的匠师', str: 5, mp: 10, role: 'hire' },
    { id: 'mim',           name: '密姆',             str: 4, mp: 10, role: 'hire', treachery: 0.25 },
  ],
  8: [ // 安格班
    { id: 'sauron',   name: '索隆',   str: 9, mp: 14, role: 'lord' },
    { id: 'gothmog',  name: '高斯魔格', str: 9, mp: 14, role: 'heir', fear: true },
    { id: 'glaurung', name: '格劳龙', str: 9, mp: 16, role: 'hire', dread: 2, tags: ['dragon'] },
    { id: 'ulfang',   name: '乌方格', str: 6, mp: 12, role: 'hire' },
    { id: 'uldor',    name: '乌勒多', str: 5, mp: 12, role: 'hire' },
  ],
};

// 统率加成（01 章 5.2）
export function commandBonus(str) {
  if (str >= 9) return 3;
  if (str >= 7) return 2;
  if (str >= 4) return 1;
  return 0;
}

export function hireCost(str) { return str * 30; }

// 英雄耐久 = 3 + floor(力量 / 3)
export function heroHp(str) { return 3 + Math.floor(str / 3); }

// 合入第三纪元的英雄名录（势力 11~18）
Object.assign(HERO_ROSTER, HEROES_T3);
