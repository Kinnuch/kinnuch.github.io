// 兵种表（设计文档 02 章 · 第一纪元）
// str 强度 / hp 耐久 / mp 移动点 / cost 造价 / build 建造回合数
// upkeep 由 floor(cost/2) 推导，不单独存
// terr 地形亲和：键为地形 id，值为 +N；'city' 为「在城市中作战」
// flags:
//   fly            飞行：一切地形消耗 1，可越河越山越海
//   mountaineer    山地系：可进入山地，消耗 3
//   ignoreTerrain  无视陆地地形消耗（恒为 1），但不可越河越海
//   fear           恐惧：相邻敌军团 MS −1（不叠加）
//   sun            白昼惩罚：在城市/森林外作战 −1
//   noCapture      不可单独占领城市
//   antiDragon     对 tags 含 dragon 的目标 +3
//   antiLiving     对 tags 含 living 的目标 +1
//   ship / transport  海军（M2 实装）
// impl: 'M2' 表示该兵种的特殊机制留待 M2，M1 的生产列表会过滤掉
// nameElvish 仅在正典有实际词形时填写；未经签字的构词一律留空（见 design/07-命名清单.md）

import { UNITS_T3 } from './era3.js';
export const UNITS = {
  // ── 光明诸族通用 ──
  edain_militia: {
    id: 'edain_militia', name: '埃代因民兵', faction: 'light',
    str: 3, hp: 2, mp: 10, cost: 6, build: 1,
    terr: { P: 1, F: 1 }, tags: ['living', 'man'], flags: [], swatch: '#b08d5a',
  },
  noldor_sword: {
    id: 'noldor_sword', name: '诺多剑士', faction: 'light',
    str: 4, hp: 2, mp: 8, cost: 10, build: 2,
    terr: { city: 1 }, tags: ['living', 'elf'], flags: [], swatch: '#8fa8c8',
  },
  sindar_archer: {
    id: 'sindar_archer', name: '辛达弓手', faction: 'light',
    str: 4, hp: 2, mp: 10, cost: 12, build: 2,
    terr: { T: 2 }, tags: ['living', 'elf'], flags: [], swatch: '#7d9a6a',
  },
  haladin_axe: {
    id: 'haladin_axe', name: '哈拉丁斧兵', faction: 'light',
    str: 4, hp: 2, mp: 10, cost: 10, build: 2,
    terr: { T: 1, H: 1 }, tags: ['living', 'man'], flags: [], swatch: '#a07a4a',
  },
  hithlum_horse: {
    id: 'hithlum_horse', name: '希斯路姆骑兵', nameElvish: 'roquen', lang: 'q', gloss: '昆雅「马之人、骑士」',
    faction: 'light',
    str: 5, hp: 2, mp: 16, cost: 20, build: 3,
    terr: { P: 2, F: 2, T: -1 }, tags: ['living', 'elf', 'mounted'], flags: [], swatch: '#6f8fb8',
  },

  // ── 势力精锐 ──
  gondolin_guard: {
    id: 'gondolin_guard', name: '刚多林卫队', faction: 'light',
    str: 6, hp: 3, mp: 8, cost: 28, build: 4,
    terr: { city: 2 }, tags: ['living', 'elf'], flags: [], swatch: '#e2e2ea',
  },
  doriath_warden: {
    id: 'doriath_warden', name: '多瑞亚斯边界卫士', faction: 'light',
    str: 5, hp: 2, mp: 12, cost: 18, build: 3,
    terr: { T: 2 }, tags: ['living', 'elf'], flags: ['forestrider'], swatch: '#7f9c88',
  },
  galadhrim_bow: {
    id: 'galadhrim_bow', name: '加拉兹民长弓手', nameElvish: 'Galadhrim', lang: 's', gloss: '辛达语「树之民」',
    faction: 'light',
    str: 5, hp: 2, mp: 10, cost: 18, build: 3,
    terr: { T: 2, H: 1 }, tags: ['living', 'elf'], flags: [], swatch: '#6d8f5c',
  },
  hithlum_lance: {
    id: 'hithlum_lance', name: '希斯路姆枪骑', faction: 'light',
    str: 6, hp: 2, mp: 16, cost: 26, build: 4,
    terr: { P: 2, F: 2 }, tags: ['living', 'elf', 'mounted'], flags: ['antiMounted'], swatch: '#5a7fb0',
  },
  feanor_warrior: {
    id: 'feanor_warrior', name: '费艾诺家武士', nameElvish: 'ohtar', lang: 'q', gloss: '昆雅「战士」',
    faction: 'light',
    str: 5, hp: 3, mp: 10, cost: 22, build: 3,
    terr: { H: 1 }, tags: ['living', 'elf'], flags: [], swatch: '#c05a4a',
  },
  dwarf_heavy: {
    id: 'dwarf_heavy', name: '蓝山矮人重装', faction: 'light',
    str: 5, hp: 3, mp: 8, cost: 22, build: 3,
    terr: { M: 2, H: 1 }, tags: ['living', 'dwarf'], flags: ['mountaineer'], swatch: '#a06a3a',
  },
  dwarf_axe: {
    id: 'dwarf_axe', name: '贝烈国斯特掷斧手', faction: 'light',
    str: 4, hp: 2, mp: 8, cost: 14, build: 2,
    terr: { M: 1 }, tags: ['living', 'dwarf'], flags: ['mountaineer'], swatch: '#8a5c34',
  },
  dwarf_mask: {
    id: 'dwarf_mask', name: '诺格罗德面甲卫士', faction: 'light',
    str: 6, hp: 3, mp: 8, cost: 30, build: 4,
    terr: { M: 2 }, tags: ['living', 'dwarf'], flags: ['mountaineer', 'antiDragon'], swatch: '#c08a3a',
  },
  falas_sailor: {
    id: 'falas_sailor', name: '法拉斯水手', nameElvish: 'Falathrim', lang: 's', gloss: '辛达语「海岸之民」',
    faction: 'light',
    str: 3, hp: 2, mp: 10, cost: 8, build: 1,
    terr: {}, tags: ['living', 'elf'], flags: [], swatch: '#5a92a8',
  },

  // ── 海军（M2 实装载运与海战） ──
  falas_transport: {
    id: 'falas_transport', name: '法拉斯运输船', faction: 'light', impl: 'M2',
    str: 2, hp: 2, mp: 20, cost: 14, build: 2,
    terr: {}, tags: ['ship'], flags: ['ship', 'transport'], capacity: 8, swatch: '#4a7f96',
  },
  teleri_ship: {
    id: 'teleri_ship', name: '泰勒瑞白船', faction: 'light', impl: 'M2',
    str: 5, hp: 3, mp: 24, cost: 26, build: 3,
    terr: {}, tags: ['ship'], flags: ['ship'], swatch: '#dfe8ee',
  },

  // ── 安格班 ──
  orc_foot: {
    id: 'orc_foot', name: '半兽人步兵', nameElvish: 'Yrch', lang: 's', gloss: '辛达语「奥克」（复数）',
    faction: 'dark',
    str: 3, hp: 2, mp: 10, cost: 5, build: 1,
    terr: { W: 1 }, tags: ['living', 'orc'], flags: [], swatch: '#6a6a4a',
  },
  orc_archer: {
    id: 'orc_archer', name: '半兽人弓手', faction: 'dark',
    str: 3, hp: 2, mp: 10, cost: 8, build: 2,
    terr: { W: 1 }, tags: ['living', 'orc'], flags: [], swatch: '#5c6040',
  },
  warg_rider: {
    id: 'warg_rider', name: '座狼骑兵', faction: 'dark',
    str: 4, hp: 2, mp: 18, cost: 16, build: 2,
    terr: { W: 1, T: 1 }, tags: ['living', 'orc', 'mounted'], flags: [], swatch: '#7a5a3a',
  },
  boldog_guard: {
    id: 'boldog_guard', name: '波尔多加卫队', faction: 'dark',
    str: 5, hp: 2, mp: 10, cost: 16, build: 3,
    terr: { W: 1 }, tags: ['living', 'orc'], flags: [], swatch: '#8a4a3a',
  },
  troll: {
    id: 'troll', name: '山怪', nameElvish: 'Torog', lang: 's', gloss: '辛达语「食人妖」（单数形，复数待核）',
    faction: 'dark',
    str: 6, hp: 3, mp: 8, cost: 30, build: 4,
    terr: { M: 2 }, tags: ['living', 'troll'], flags: ['mountaineer', 'sun'], swatch: '#6b7a6b',
  },
  angband_sorcerer: {
    id: 'angband_sorcerer', name: '安格班巫术师', faction: 'dark',
    str: 7, hp: 2, mp: 12, cost: 44, build: 6,
    terr: {}, tags: ['living'], flags: ['fear'], swatch: '#5a3a6a',
  },

  // ── 盟友（仅遗迹掉落，个别都城可产） ──
  eagle: {
    id: 'eagle', name: '大鹰', nameElvish: 'Thoron', lang: 's', gloss: '辛达语「鹰」（复数形待核）',
    faction: 'ally',
    str: 6, hp: 3, mp: 24, cost: 40, build: 5,
    terr: {}, tags: ['living', 'beast'], flags: ['fly', 'noCapture'], swatch: '#c8b070',
  },
  shade: {
    id: 'shade', name: '幽影', faction: 'ally',
    str: 5, hp: 2, mp: 14, cost: 24, build: 4,
    terr: {}, tags: ['undead'], flags: ['ignoreTerrain', 'noCapture', 'antiLiving'], swatch: '#8a8aa8',
  },
  spider: {
    id: 'spider', name: '巨蛛', faction: 'ally',
    str: 6, hp: 3, mp: 12, cost: 34, build: 5,
    terr: { T: 2 }, tags: ['living', 'beast'], flags: ['mountaineer'], swatch: '#4a3a4a',
  },
  balrog: {
    id: 'balrog', name: '炎魔', nameElvish: 'Valaraukar', lang: 'q', gloss: '昆雅「力量之魔」（复数）；辛达语作 Balrog',
    faction: 'ally',
    str: 8, hp: 4, mp: 14, cost: 80, build: 8,
    terr: {}, tags: ['maia'], flags: ['mountaineer', 'fear'], swatch: '#c04a20',
  },
  dragon: {
    id: 'dragon', name: '火龙', faction: 'ally',
    str: 9, hp: 4, mp: 18, cost: 90, build: 8,
    terr: {}, tags: ['dragon'], flags: ['mountaineer', 'siegebreaker'], swatch: '#a03020',
  },
  winged_dragon: {
    id: 'winged_dragon', name: '翼龙', faction: 'ally', impl: 'M3', scenarioOnly: true,
    str: 9, hp: 5, mp: 22, cost: 0, build: 0, upkeep: 50,
    terr: {}, tags: ['dragon'], flags: ['fly', 'siegebreaker'], swatch: '#7a1a10',
  },
};

export function upkeepOf(type) {
  const u = UNITS[type];
  return u.upkeep != null ? u.upkeep : Math.floor(u.cost / 2);
}

// M1 可生产的兵种（过滤掉留待后续里程碑的机制）
export function producibleInM1(type) {
  const u = UNITS[type];
  return !!u && !u.impl && !u.scenarioOnly;
}

// 合入第三纪元兵种：同一张表，由各城的产兵表决定哪些能造
Object.assign(UNITS, UNITS_T3);
