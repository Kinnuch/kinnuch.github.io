// 第三纪元战役（设计文档 04 章第五节）

import { NORTHWEST } from './northwest.js';
import { fractionOfCities, captureCities } from '../js/scenario.js';
import { makeUnit } from '../js/unit.js';

function reinforce(G, cityId, types) {
  const c = G.cities.find((x) => x.id === cityId);
  if (!c) return;
  const army = G.armies.find((a) => a.x === c.x + 1 && a.y === c.y + 1);
  for (const t of types) {
    const u = makeUnit(G, t); u.mp = 0;
    if (army && army.units.length < 8) army.units.push(u);
  }
}

/** 持戒的英雄（魔戒是唯一物品，最多在一人身上） */
function ringBearer(G) {
  for (const h of Object.values(G.heroes)) {
    if (h.alive && (h.items || []).includes('one_ring')) return h;
  }
  return null;
}

function armyOfHero(G, heroId) {
  return G.armies.find((a) => a.units.some((u) => u.heroId === heroId)) || null;
}

export const SCENARIOS_T3 = [
  // ── T0 自由征服 ────────────────────────────────────────
  {
    id: 't_free',
    map: NORTHWEST,
    name: '中洲自由征服',
    era: 3,
    blurb: '第三纪元末的中洲西北，八方混战。没有剧本，没有回合上限——'
      + '控制全图三分之二的城市即胜。',
    players: [11, 12, 13, 14, 15, 16, 17, 18],
    victory: [fractionOfCities(2 / 3)],
  },

  // ── T1 魔戒战争 ────────────────────────────────────────
  {
    id: 'war_of_the_ring',
    map: NORTHWEST,
    name: '魔戒战争',
    era: 3,
    blurb: '至尊魔戒在瑞文戴尔。你可以正面打赢这场战争，也可以派一名英雄'
      + '带着它穿过黑门抵达末日火山——但戒指每回合都在腐蚀持有者。',
    players: [11, 12, 13, 14, 15, 16, 17, 18],
    turnLimit: 60,
    startGold: { 17: 500, 16: 350 },
    events: [
      {
        turn: 1,
        run: (G, log) => {
          // 魔戒交给瑞文戴尔的君主
          const elrond = G.heroes.elrond;
          if (elrond && elrond.alive) {
            elrond.items = elrond.items || [];
            if (!elrond.items.includes('one_ring')) elrond.items.push('one_ring');
            log(G, '至尊魔戒在爱隆手中。把它送进末日火山，或者正面打赢这场战争。', 'hero');
          }
          G.ringCorruption = 0;
        },
      },
      {
        turn: 20,
        run: (G, log) => {
          reinforce(G, 'orthanc', ['uruk_hai', 'uruk_hai', 'siege_troll']);
          log(G, '萨茹曼的乌鲁克大军开出艾森加德，扑向洛汗。', 'warn');
        },
      },
      {
        turn: 35,
        run: (G, log) => {
          reinforce(G, 'minas_morgul', ['black_numenorean', 'olog_hai', 'siege_troll']);
          reinforce(G, 'morannon', ['siege_troll', 'olog_hai']);
          log(G, '魔多总攻奥斯吉利亚斯。', 'warn');
        },
      },
      {
        // 腐化：持戒者每回合都在被侵蚀，满了就带着戒指叛投魔多
        turn: 2, repeat: true,
        run: (G, log) => {
          const bearer = ringBearer(G);
          if (!bearer) return;
          if (!G.rng.chance(0.15)) return;
          G.ringCorruption = (G.ringCorruption || 0) + 1;
          if (G.ringCorruption < 7) {
            if (G.ringCorruption % 3 === 0) {
              log(G, `${bearer.name} 被魔戒侵蚀得更深了（${G.ringCorruption}/7）。`, 'warn');
            }
            return;
          }
          const army = armyOfHero(G, bearer.id);
          bearer.faction = 17;
          if (army) army.owner = 17;
          log(G, `${bearer.name} 终于屈服于魔戒，携戒投向魔多。`, 'warn');
          G.ringCorruption = 0;
        },
      },
    ],
    victory: [
      // 毁戒：持戒英雄抵达末日火山
      {
        label: '将至尊魔戒投入末日火山',
        check: (G) => {
          const bearer = ringBearer(G);
          if (!bearer || bearer.faction === 17) return null;
          const army = armyOfHero(G, bearer.id);
          if (!army) return null;
          const mt = G.map.def.features.find((f) => f.type === 'orodruin');
          if (!mt) return null;
          const d = Math.max(Math.abs(army.x - mt.x), Math.abs(army.y - mt.y));
          return d <= 1 ? bearer.faction : null;
        },
      },
      // 魔多：攻陷米那斯提力斯与伊姆拉缀斯
      captureCities(17, ['minas_tirith', 'imladris']),
      // 或者常规的军事胜利
      fractionOfCities(2 / 3),
    ],
  },

  // ── T2 北方战争 ────────────────────────────────────────
  {
    id: 'northern_war',
    map: NORTHWEST,
    name: '北方战争',
    era: 3,
    blurb: '与魔戒战争同时发生、却几乎无人讲述的一场仗：幽暗密林与孤山'
      + '对多尔哥多与东方人。战场只开放地图东北角。',
    players: [15, 17, 18],
    turnLimit: 30,
    locked: { rect: [114, 6, 207, 96] },
    owners: { carrock: 15, beorn: 15 },
    garrisons: {
      erebor: ['erebor_guard', 'erebor_guard', 'tower_guard', 'dale_archer'],
      dale: ['dale_archer', 'dale_archer', 'gondor_guard'],
      thranduil_halls: ['mirkwood_archer', 'mirkwood_archer', 'lorien_galadhrim'],
      esgaroth: ['dale_archer', 'bree_militia'],
      dol_guldur: ['orc_bowman', 'orc_bowman', 'shelob_spawn', 'warg_pack'],
      rhun_camp: ['easterling_chariot', 'easterling_chariot', 'orc_soldier'],
      east_bight: ['easterling_chariot', 'orc_bowman'],
    },
    events: [
      {
        turn: 12,
        run: (G, log) => {
          reinforce(G, 'dol_guldur', ['shelob_spawn', 'orc_bowman', 'warg_pack']);
          log(G, '多尔哥多倾巢而出，林中的黑影向北蔓延。', 'warn');
        },
      },
    ],
    victory: [
      captureCities(15, ['dol_guldur']),
      captureCities(17, ['erebor', 'thranduil_halls']),
    ],
  },
];
