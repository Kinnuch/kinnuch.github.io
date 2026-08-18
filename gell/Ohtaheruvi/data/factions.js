// 势力（设计文档 03 章 · 第一纪元）
// emblem 为纹章符号，与势力色双编码，保证色盲可辨

import { FACTIONS_T3 } from './era3.js';
export const FACTIONS = {
  0: { id: 0, name: '中立',           short: '中立', color: '#9a9a9a', dark: '#5c5c5c', emblem: '·',  side: 'neutral' },
  1: { id: 1, name: '希斯路姆的诺多', short: '希斯路姆', color: '#5a8fc8', dark: '#2e4c6b', emblem: '★', side: 'light',
       lord: '芬国昐', trait: '希斯路姆枪骑',
       blurb: '芬国昐的王庭，正面挡着安格班的诺多主力。骑兵最强，平原上无人能挡；但盆地三面环山，一旦隘口失守就无路可退。' },
  2: { id: 2, name: '费艾诺众子',     short: '费艾诺', color: '#c04a3a', dark: '#6b2820', emblem: '✦', side: 'light',
       lord: '迈兹洛斯', trait: '费艾诺家武士',
       blurb: '守在东境的希姆凛，直面迈格洛尔缺口——全图唯一能让大军平推南下的通道。武士耐久三点，攻坚最扎实。' },
  3: { id: 3, name: '纳国斯隆德',     short: '纳国', color: '#4a8a5a', dark: '#264a30', emblem: '❧', side: 'light',
       lord: '芬罗德', trait: '加拉兹民长弓手',
       blurb: '芬罗德的地下石窟，深藏于纳洛格河西岸的森林里。长弓手在林中 +2，是最适合打防守反击的一方。' },
  4: { id: 4, name: '刚多林',         short: '刚多林', color: '#dcdce6', dark: '#7a7a86', emblem: '✧', side: 'light',
       lord: '图尔巩', trait: '刚多林卫队',
       blurb: '环抱山脉之内的隐匿之城，只有一条隐秘之路通往外界——易守到近乎无解，但也极难向外扩张。卫队守城 +2，还能产大鹰。' },
  5: { id: 5, name: '多瑞亚斯',       short: '多瑞亚斯', color: '#7fa88a', dark: '#3c5c47', emblem: '✿', side: 'light',
       lord: '辛葛', trait: '多瑞亚斯边界卫士',
       blurb: '辛葛与美丽安的林中王国，坐拥全图最大的两片林海。边界卫士在森林里 +2 且穿林如履平地，主场作战几乎不可撼动。' },
  6: { id: 6, name: '法拉斯',         short: '法拉斯', color: '#4aa8b8', dark: '#22585f', emblem: '≈', side: 'light',
       lord: '奇尔丹', trait: '泰勒瑞白船',
       blurb: '奇尔丹的两座海港，沿西海岸铺开。陆战偏弱，但背靠大海不易被合围，是最适合苟着发育的一方。' },
  7: { id: 7, name: '蓝色山脉的矮人', short: '矮人', color: '#b8823a', dark: '#63431a', emblem: '⛰', side: 'light',
       lord: '阿扎格哈尔', trait: '诺格罗德面甲卫士',
       blurb: '诺格罗德与贝烈国斯特两座都城藏在东边的山里。全军可翻山，等于多出一整套别人走不了的路；面甲卫士对龙 +3。' },
  8: { id: 8, name: '安格班',         short: '安格班', color: '#8a2a2a', dark: '#3f1010', emblem: '☾', side: 'dark',
       lord: '索隆（魔苟斯坐镇都城）', trait: '半兽人海 · 山怪 · 火龙',
       blurb: '北方的铁牢。半兽人一回合成军、造价全场最低，靠数量淹人；都城还能产火龙。代价是要从铁山的谷口一路南下，战线极长。' },
  9: { id: 9, name: '维拉的大军',     short: '西方大军', color: '#e8d48a', dark: '#8a7a3a', emblem: '☀', side: 'light',
       lord: '西方的使者', trait: '刚多林卫队 · 大鹰',
       blurb: '愤怒之战里自西方登陆的援军，开局金币极多、精锐成建制。只有一个目标：踏平安格班。' },
};

export function factionOf(id) { return FACTIONS[id] || FACTIONS[0]; }

// 合入第三纪元的八大势力（编号 11~18）
Object.assign(FACTIONS, FACTIONS_T3);
