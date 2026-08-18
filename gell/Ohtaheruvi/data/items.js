// 神器（设计文档 03 章 · 第一纪元）
// kind: battle 战力（仅持有英雄）/ command 统率（作用全堆叠）/ special 脚本效果
// 所有加成仍受「加成总和 ≤ +5、MS ≤ 14」的总上限约束

import { ITEMS_T3, RUIN_ITEM_POOL_T3 } from './era3.js';
export const ITEMS = {
  silmaril:   { id: 'silmaril',   name: '精灵宝钻',       kind: 'command', command: 3, stackBonus: 1,
                desc: '统率 +3；所在军团全体 +1；安格班永久优先攻击持有者', unique: true },
  ringil:     { id: 'ringil',     name: '灵刚',           kind: 'battle',  battle: 3, desc: '芬国昐之剑，战斗强度 +3' },
  gurthang:   { id: 'gurthang',   name: '安格拉赫尔',     kind: 'battle',  battle: 3, backfire: 0.05,
                desc: '战斗强度 +3；每场战斗 5% 概率反噬，持有者失 1 耐久' },
  dragonhelm: { id: 'dragonhelm', name: '多尔洛明的龙盔', kind: 'special', hp: 1, immuneFear: true,
                desc: '耐久 +1；免疫恐惧与龙之威慑' },
  aranruth:   { id: 'aranruth',   name: '阿蓝露丝',       kind: 'battle',  battle: 2, desc: '辛葛之剑，战斗强度 +2' },
  belthronding:{id: 'belthronding',name: '贝尔沙拉赫',    kind: 'battle',  battle: 2, mp: 4,
                desc: '贝烈格之弓，战斗强度 +2、移动 +4' },
  glamdring:  { id: 'glamdring',  name: '格拉姆德凌',     kind: 'battle',  battle: 2, desc: '战斗强度 +2' },
  orcrist:    { id: 'orcrist',    name: '奥克锐斯特',     kind: 'battle',  battle: 2, desc: '战斗强度 +2' },
  azaghal_mask:{id: 'azaghal_mask',name: '阿扎格哈尔的面甲', kind: 'special', antiDragon: 3,
                desc: '对龙 +3' },
  nauglamir:  { id: 'nauglamir',  name: '矮人项链',       kind: 'special', income: 10,
                desc: '收入 +10/回合；若同时持有精灵宝钻，额外统率 +1' },
  horn_fingolfin:{id:'horn_fingolfin',name:'芬国昐的号角', kind: 'command', command: 2, desc: '统率 +2' },
  star_gem:   { id: 'star_gem',   name: '诺多的星辉宝石', kind: 'special', vision: 3, desc: '所在军团视野 +3' },
  sea_chart:  { id: 'sea_chart',  name: '埃盖拉斯的海图', kind: 'special', shipMp: 6, desc: '己方所有船只移动 +6' },
  amulet:     { id: 'amulet',     name: '提尔卡尔的护符', kind: 'special', hp: 1, desc: '耐久 +1' },
};

// 遗迹可掉落的神器池（精灵宝钻由剧本控制，不进池）
export const RUIN_ITEM_POOL = [
  'ringil', 'gurthang', 'dragonhelm', 'aranruth', 'belthronding',
  'glamdring', 'orcrist', 'azaghal_mask', 'nauglamir',
  'horn_fingolfin', 'star_gem', 'sea_chart', 'amulet',
];

// 遗迹奖励权重（01 章第六节）
export const RUIN_REWARDS = [
  ['gold',   30],
  ['item',   25],
  ['ally',   20],
  ['might',  15],
  ['intel',  10],
];

// 遗迹守护者候选
export const RUIN_GUARDIANS = ['troll', 'spider', 'shade', 'dragon', 'balrog'];

// 遗迹可招募的盟友
export const RUIN_ALLIES = ['eagle', 'shade', 'spider', 'dragon', 'balrog'];

// 合入第三纪元神器
Object.assign(ITEMS, ITEMS_T3);
export const RUIN_POOL_BY_ERA = { 1: RUIN_ITEM_POOL, 3: RUIN_ITEM_POOL_T3 };
