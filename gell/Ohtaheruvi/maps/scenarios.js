// 第一纪元战役（设计文档 04 章第三节）
//
// 每个场景只是一份配置：谁参战、城归谁、开局带什么兵、开放哪片区域、
// 怎样算赢、第几回合触发什么。地形层是同一张 beleriand.js。

import { BELERIAND } from './beleriand.js';
import {
  fractionOfCities, captureCities, holdCities, clearRegion, surviveUntil,
} from '../js/scenario.js';
import { makeUnit } from '../js/unit.js';
import { SCENARIOS_T3 } from './scenarios-t3.js';


// 把一片区域的地形整体换掉（骤火之战把阿德加兰烧成安佛格砾斯）
function scorch(G, x0, y0, x1, y1) {
  let n = 0;
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
    const i = y * G.map.w + x;
    const ch = G.map.tiles[i];
    if (ch === 'P' || ch === 'F' || ch === 'H') { G.map.tiles[i] = 'W'; n++; }
  }
  return n;
}

// 场景脚本里要用到的两个小工具
const citiesCount = (G, p) => G.cities.filter((c) => c.owner === p).length;

function drown(G, army) {
  const i = G.armies.indexOf(army);
  if (i >= 0) G.armies.splice(i, 1);
}

function reinforce(G, cityId, types) {
  const c = G.cities.find((x) => x.id === cityId);
  if (!c) return;
  const at = { x: c.x + 1, y: c.y + 1 };
  const army = G.armies.find((a) => a.x === at.x && a.y === at.y);
  for (const t of types) {
    const u = makeUnit(G, t); u.mp = 0;
    if (army && army.units.length < 8) army.units.push(u);
  }
}

export const SCENARIOS = [
  // ── S0 自由征服 ────────────────────────────────────────
  {
    id: 'free',
    map: BELERIAND,
    name: '自由征服',
    era: 1,
    blurb: '八方混战的贝烈瑞安德沙盘。没有剧本，没有回合上限——控制全图三分之二的城市即胜。',
    players: [1, 2, 3, 4, 5, 6, 7, 8],
    victory: [fractionOfCities(2 / 3)],
  },

  // ── S2 星下之战 ────────────────────────────────────────
  {
    id: 'dagor_nuin_giliath',
    map: BELERIAND,
    name: '星下之战',
    era: 1,
    blurb: '日月尚未升起，费艾诺率诺多登陆米斯林，安格班的大军迎面而来。'
      + '肃清北方的敌军即胜——但若你追得太深，正典在安格班门前等着他。',
    players: [2, 8],
    turnLimit: 25,
    // 费艾诺仅本剧本登场，作为费艾诺众子的君主
    lords: {
      2: { id: 'feanor', name: '费艾诺', str: 9, mp: 16, role: 'lord' },
    },
    // 开放区域：希斯路姆与其北面的战场
    locked: { rect: [27, 0, 120, 71] },
    owners: {
      mithrim: 2, eithel_sirion: 2, hithlum_watch: 2, dor_lomin: 2,
      sirion_pass: 0, dorthonion_hold: 0, tol_sirion: 0,
    },
    garrisons: {
      mithrim: ['feanor_warrior', 'feanor_warrior', 'noldor_sword', 'sindar_archer'],
      eithel_sirion: ['feanor_warrior', 'noldor_sword', 'noldor_sword'],
      dor_lomin: ['noldor_sword', 'hithlum_horse'],
      hithlum_watch: ['noldor_sword'],
      angband: ['orc_foot', 'orc_foot', 'orc_foot', 'boldog_guard', 'troll'],
      iron_gate: ['orc_foot', 'orc_foot', 'warg_rider'],
      west_camp: ['orc_foot', 'warg_rider'],
      thangorodrim: ['orc_foot', 'orc_archer', 'boldog_guard'],
    },
    events: [
      {
        turn: 12,
        when: (G) => {
          const f = G.heroes.feanor;
          if (!f || !f.alive) return false;
          const army = G.armies.find((a) => a.units.some((u) => u.heroId === 'feanor'));
          const ang = G.cities.find((c) => c.id === 'angband');
          return army && ang && Math.max(Math.abs(army.x - ang.x), Math.abs(army.y - ang.y)) <= 9;
        },
        run: (G, log) => {
          const ang = G.cities.find((c) => c.id === 'angband');
          const at = { x: ang.x + 1, y: ang.y + 1 };
          const army = G.armies.find((a) => a.x === at.x && a.y === at.y);
          for (let i = 0; i < 3 && army && army.units.length < 8; i++) {
            const u = makeUnit(G, 'balrog'); u.mp = 0;
            army.units.push(u);
          }
          log(G, '高斯魔格率炎魔自安格班涌出——费艾诺追得太深了。', 'warn');
        },
      },
    ],
    victory: [clearRegion(2, [27, 0, 120, 71]), surviveUntil(8, 25)],
  },

  // ── S4 骤火之战 ────────────────────────────────────────
  {
    id: 'dagor_bragollach',
    map: BELERIAND,
    name: '骤火之战',
    era: 1,
    blurb: '长久围城在一夜之间崩溃：安格班喷出烈焰，阿德加兰化为安佛格砾斯的焦土，'
      + '格劳龙与炎魔倾巢而出。光明诸族只要撑过 45 个回合。',
    players: [1, 2, 3, 4, 5, 6, 7, 8],
    turnLimit: 45,
    firstPlayer: 8,        // 安格班先手
    startGold: { 8: 400 },
    events: [
      {
        turn: 1,
        run: (G, log) => {
          const n = scorch(G, 30, 14, 198, 41);
          log(G, `烈焰漫过阿德加兰——${n} 格草原化为安佛格砾斯的焦土。`, 'warn');
          reinforce(G, 'angband', ['dragon', 'balrog', 'troll']);
          reinforce(G, 'thangorodrim', ['balrog', 'boldog_guard', 'troll']);
          reinforce(G, 'iron_gate', ['balrog', 'warg_rider']);
          reinforce(G, 'east_gate', ['troll', 'warg_rider']);
          log(G, '格劳龙与炎魔倾巢而出。', 'warn');
        },
      },
      {
        turn: 20,
        run: (G, log) => {
          reinforce(G, 'angband', ['dragon', 'troll']);
          log(G, '安格班的第二波大军开出铁山。', 'warn');
        },
      },
    ],
    victory: [
      // 安格班攻陷四座光明方都城即胜
      {
        label: '攻陷四座光明方都城',
        check: (G) => {
          const caps = ['eithel_sirion', 'himring', 'nargothrond', 'gondolin', 'menegroth', 'eglarest', 'belegost', 'nogrod'];
          const taken = caps.filter((id) => {
            const c = G.cities.find((x) => x.id === id);
            return c && c.owner === 8;
          }).length;
          return taken >= 4 ? 8 : null;
        },
      },
      // 光明方撑过 45 回合即胜（归还给城市最多的一方）
      {
        label: '撑过 45 个回合',
        check: (G) => {
          if (G.turn <= 45) return null;
          const light = G.players.filter((p) => p !== 8);
          let best = light[0], bestN = -1;
          for (const p of light) {
            const n = G.cities.filter((c) => c.owner === p).length;
            if (n > bestN) { bestN = n; best = p; }
          }
          return best;
        },
      },
    ],
  },
  // ── S1 贝烈瑞安德第一战 ────────────────────────────────
  {
    id: 'first_battle',
    map: BELERIAND,
    name: '贝烈瑞安德第一战',
    era: 1,
    blurb: '诺多尚未归来，安格班的大军已南下扑向辛达。多瑞亚斯与法拉斯只要守住'
      + '明霓国斯三十个回合——那时美丽安的环带将合拢。',
    players: [5, 6, 8],
    turnLimit: 30,
    firstPlayer: 8,
    owners: {
      neldoreth: 5, region: 5, esgalduin_ford: 5, aelin_uial: 5,
      brithombar: 6, falas_watch: 6, vinyamar: 6,
    },
    garrisons: {
      menegroth: ['doriath_warden', 'doriath_warden', 'sindar_archer', 'sindar_archer'],
      neldoreth: ['doriath_warden', 'sindar_archer'],
      region: ['doriath_warden', 'sindar_archer'],
      eglarest: ['falas_sailor', 'sindar_archer', 'sindar_archer'],
      brithombar: ['falas_sailor', 'sindar_archer'],
      angband: ['orc_foot', 'orc_foot', 'boldog_guard', 'boldog_guard', 'troll'],
      iron_gate: ['orc_foot', 'orc_foot', 'warg_rider', 'warg_rider'],
      east_gate: ['orc_foot', 'orc_archer', 'warg_rider'],
      thangorodrim: ['orc_foot', 'orc_archer', 'troll'],
    },
    events: [
      {
        turn: 14,
        run: (G, log) => {
          reinforce(G, 'iron_gate', ['boldog_guard', 'warg_rider', 'troll']);
          log(G, '第二波兽人大军沿西瑞安河谷南下。', 'warn');
        },
      },
    ],
    victory: [
      holdCities(5, ['menegroth'], 30),
      captureCities(8, ['menegroth', 'eglarest']),
    ],
  },

  // ── S3 荣耀之战 ────────────────────────────────────────
  {
    id: 'dagor_aglareb',
    map: BELERIAND,
    name: '荣耀之战',
    era: 1,
    blurb: '诺多已在贝烈瑞安德站稳。安格班倾力南犯，四方诸侯合力迎击——'
      + '把它的军队全部逐回铁山，长久围城便自此开始。',
    players: [1, 2, 3, 5, 8],
    turnLimit: 40,
    firstPlayer: 8,
    startGold: { 8: 300 },
    // 开局安格班已经突进到南方：多松尼安与阿格隆隘口都已陷落，
    // 否则「把它逐回铁山」这个条件在第一回合就自动成立了
    owners: {
      dorthonion_hold: 8, tarn_aeluin: 8, ladros: 8, aglon: 8, ard_camp: 8,
    },
    garrisons: {
      eithel_sirion: ['noldor_sword', 'noldor_sword', 'sindar_archer', 'hithlum_lance'],
      himring: ['feanor_warrior', 'feanor_warrior', 'noldor_sword'],
      nargothrond: ['noldor_sword', 'galadhrim_bow', 'sindar_archer'],
      menegroth: ['doriath_warden', 'doriath_warden', 'sindar_archer'],
      angband: ['orc_foot', 'orc_foot', 'boldog_guard', 'troll'],
      thangorodrim: ['orc_foot', 'boldog_guard', 'troll'],
      iron_gate: ['orc_foot', 'orc_foot', 'warg_rider'],
      east_gate: ['orc_foot', 'orc_archer', 'warg_rider'],
      west_camp: ['orc_foot', 'warg_rider'],
      dorthonion_hold: ['boldog_guard', 'orc_foot', 'orc_archer', 'troll'],
      tarn_aeluin: ['orc_foot', 'orc_archer', 'warg_rider'],
      ladros: ['orc_foot', 'warg_rider'],
      aglon: ['boldog_guard', 'orc_foot', 'warg_rider'],
    },
    victory: [
      // 把安格班的部队与据点全部赶回铁山以北（y ≤ 14），长久围城即告达成。
      // 至少要打满 12 回合，免得一开局就判定成立。
      {
        label: '将安格班逐回铁山，长久围城开始',
        check: (G) => {
          if (G.turn < 12) return null;
          const armiesOut = G.armies.some((a) => a.owner === 8 && a.y > 19);
          const citiesOut = G.cities.some((c) => c.owner === 8 && c.y > 19);
          return armiesOut || citiesOut ? null : 1;
        },
      },
      surviveUntil(8, 40),
    ],
  },

  // ── S5 泪雨之战 ────────────────────────────────────────
  {
    id: 'nirnaeth',
    map: BELERIAND,
    name: '泪雨之战',
    era: 1,
    blurb: '联军自东西两路合围安格班。攻下它，一切就都还有指望——'
      + '但第 18 回合，会有人变节。',
    players: [1, 2, 3, 7, 8],
    turnLimit: 35,
    startGold: { 1: 260, 2: 260, 8: 450 },
    garrisons: {
      eithel_sirion: ['noldor_sword', 'noldor_sword', 'hithlum_lance', 'hithlum_lance'],
      hithlum_watch: ['noldor_sword', 'sindar_archer', 'hithlum_horse'],
      himring: ['feanor_warrior', 'feanor_warrior', 'feanor_warrior', 'noldor_sword'],
      maglor_gap: ['feanor_warrior', 'hithlum_horse'],
      nargothrond: ['noldor_sword', 'galadhrim_bow'],
      belegost: ['dwarf_heavy', 'dwarf_mask', 'dwarf_axe'],
      nogrod: ['dwarf_heavy', 'dwarf_mask'],
      angband: ['orc_foot', 'orc_foot', 'boldog_guard', 'boldog_guard', 'troll', 'troll'],
      thangorodrim: ['boldog_guard', 'troll', 'orc_archer'],
      iron_gate: ['orc_foot', 'warg_rider', 'boldog_guard'],
      east_gate: ['orc_foot', 'orc_archer', 'warg_rider'],
    },
    events: [
      {
        turn: 18,
        run: (G, log) => {
          // 东来者的背叛：联军中随机一方的两支部队当场倒戈
          const allies = G.players.filter((p) => p !== 8 && citiesCount(G, p) > 0);
          if (!allies.length) return;
          const victim = allies[G.rng.int(allies.length)];
          let turned = 0;
          for (const a of G.armies.filter((x) => x.owner === victim)) {
            if (turned >= 2) break;
            a.owner = 8;
            turned++;
          }
          log(G, turned
            ? `乌方格之子背弃了誓言——${turned} 支军团当场倒戈安格班。`
            : '背叛的消息传来，但阵中已无人可叛。', 'warn');
        },
      },
      {
        turn: 24,
        run: (G, log) => {
          reinforce(G, 'angband', ['dragon', 'balrog']);
          log(G, '格劳龙碾过战场。', 'warn');
        },
      },
    ],
    victory: [
      captureCities(1, ['angband']),
      surviveUntil(8, 35),
    ],
  },

  // ── S6 愤怒之战 ────────────────────────────────────────
  {
    id: 'war_of_wrath',
    map: BELERIAND,
    name: '愤怒之战',
    era: 1,
    blurb: '维拉的大军自西方登陆。攻陷安格班——但从第 40 回合起，'
      + '贝烈瑞安德将开始沉没，土地每回合都在变少。',
    players: [1, 5, 6, 8, 9],
    turnLimit: 50,
    startGold: { 9: 900, 8: 600 },
    owners: {
      balar: 9, sirion_havens: 9, nan_tathren: 9,
      eglarest: 6, brithombar: 6,
      menegroth: 5, neldoreth: 5, region: 5,
    },
    garrisons: {
      balar: ['noldor_sword', 'noldor_sword', 'gondolin_guard', 'eagle'],
      sirion_havens: ['gondolin_guard', 'noldor_sword', 'sindar_archer', 'eagle'],
      nan_tathren: ['noldor_sword', 'sindar_archer'],
      angband: ['balrog', 'balrog', 'dragon', 'troll', 'boldog_guard', 'orc_foot'],
      thangorodrim: ['dragon', 'balrog', 'troll'],
      iron_gate: ['boldog_guard', 'troll', 'warg_rider'],
      east_gate: ['boldog_guard', 'orc_archer', 'warg_rider'],
    },
    events: [
      {
        turn: 8,
        run: (G, log) => {
          reinforce(G, 'sirion_havens', ['eagle', 'gondolin_guard']);
          log(G, '索隆多率鹰群自克瑞赛格林飞来。', 'feature');
        },
      },
      {
        // 贝烈瑞安德的沉没：从西边起，每回合有概率再淹掉一列
        turn: 40, repeat: true,
        when: (G) => G.rng.chance(0.35),
        run: (G, log) => {
          const col = (G.sinkCol = (G.sinkCol ?? 19) + 1);
          if (col >= G.map.w) return;
          let drowned = 0;
          for (let y = 0; y < G.map.h; y++) {
            const i = y * G.map.w + col;
            if (G.map.tiles[i] !== 'O') { G.map.tiles[i] = 'O'; drowned++; }
          }
          for (const a of G.armies.slice()) if (a.x <= col) drown(G, a);
          if (drowned) log(G, `大海漫过第 ${col} 列——贝烈瑞安德正在沉没。`, 'warn');
        },
      },
    ],
    victory: [
      captureCities(9, ['angband']),
      surviveUntil(8, 50),
    ],
  },
];

SCENARIOS.push(...SCENARIOS_T3);

export const scenarioById = (id) => SCENARIOS.find((s) => s.id === id) || SCENARIOS[0];
