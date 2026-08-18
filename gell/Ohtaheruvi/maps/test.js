// M1 测试地图「米斯林试炼场」40×30
// 北端为环抱安格班的山墙（仅 x=17,18 一处隘口），中部草原与森林，
// 一条横贯东西的河（x=18 有唯一的浅滩，即桥位），南部农地、丘陵与沼泽海岸。
// 一条南北大道沿 x=18 从安格班的隘口贯通到南方，浅滩是它跨河的唯一节点 ——
// 谁握住这一格，谁就掐住了全图的南北通道。
// 城市不写在地形串里 —— 由 map.js 按 cities 坐标把 2×2 范围压成 'C'。
//
// 地形字符见 data/terrain.js：R道路 P草原 F农地 W荒原 T森林 H丘陵 M山地 S沼泽 D浅滩 V河流 O海洋

export const TEST_MAP = {
  id: 'test_mithrim',
  name: '米斯林试炼场',
  era: 1,
  w: 40, h: 30,
  rows: [
    'MMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMM', //  0
    'MMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMM', //  1
    'MMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMMM', //  2
    'MMMMMMMMMMMMMMMMMWRMMMMMMMMMMMMMMMMMMMMM', //  3  ← 隘口
    'MMMMMMMMMWWWWWWWWWRWWWWWWWWWWWMMMMMMMMMM', //  4
    'MMMMMMWWWWWWWWWWWWRWWWWWWWWWWWWWWMMMMMMM', //  5
    'MMMMWWWWWWWWWWWWWWRWWWWWWWWWWWWWWWWWMMMM', //  6
    'MMWWWWWWWWWWWWPPPPRPPPPPWWWWWWWWWWWWWWMM', //  7
    'MWWWWWWWWWWPPPPPPPRPPPPPPPPWWWWWWWWWWWWM', //  8
    'WWWWWWWWWPPPPPPPPPRPPPPPPPPPPPPWWWWWWWWW', //  9
    'WWWWWWTTTTPPPPPPPPRPPPPPPPPPPPPPWWWHHHHH', // 10
    'WWWTTTTTTTTPPPPPPPRPPPPPPPPPPPPPWWHHHHHH', // 11
    'WWTTTTTTTTTTPPPPPPRPPPPPPPPPPPPPWHHHHHHH', // 12
    'WTTTTTTTTTTTPPPPPPRPPPPPPPPPPPPPHHHHHHHH', // 13
    'TTTTTTTTTTTTPPPPPPRPPPPPPPPPPPPPHHHHHHHH', // 14
    'VVVVVVVVVVVVVVVVVVDVVVVVVVVVVVVVVVVVVVVV', // 15 ← 河与浅滩
    'TTTTTTTTTTTTPPPPPPRPPPPPPPPPPPPPHHHHHHHH', // 16
    'TTTTTTTTTTPPPPPPPPRPPPPPPPPPPPPPPPHHHHHH', // 17
    'TTTTTTTTPPPPPPPPPPRPPPPPPPPPPPPPPPPPHHHH', // 18
    'TTTTTTPPPPPPPPPPPPRPPPPPPPPPPPPPPPPPPPHH', // 19
    'TTTTFFFFFFPPPPPPPPRPPPPPPPPPFFFFFFPPPPHH', // 20
    'TTFFFFFFFFPPPPPPPPRPPPPPPPPPFFFFFFFFPPHH', // 21
    'TTFFFFFFFFPPPPPPPPRPPPPPPPPPFFFFFFFFPPHH', // 22
    'TTTFFFFFFPPPPPPPPPRPPPPPPPPPPFFFFFFPPPHH', // 23
    'SSTTTTTTTPPPPPPPPPRPPPPPPPPPPPPPPPPHHHHH', // 24
    'SSSSTTTTTPPPPPPPPPPPPPPPPPPPPPPPPPHHHHHH', // 25
    'OSSSSSTTTPPPPPPPPPPPPPPPPPPPPPPPPHHHHMMM', // 26
    'OOSSSSSTTPPPPPPPPPPPPPPPPPPPPPPPHHHMMMMM', // 27
    'OOOSSSSSTTPPPPPPPPPPPPPPPPPPPPHHHMMMMMMM', // 28
    'OOOOOSSSSTTTTPPPPPPPPPPPPPPHHHMMMMMMMMMM', // 29
  ],
  // 城市：x,y 为 2×2 的左上角
  cities: [
    { id: 'angband',  name: '安格班',       x: 18, y: 1,  size: 'capital', owner: 8,
      produces: ['orc_foot', 'boldog_guard', 'troll', 'dragon'] },
    { id: 'orc_camp', name: '半兽人营地',   x: 10, y: 6,  size: 'village', owner: 8,
      produces: ['orc_foot'] },
    { id: 'ladros',   name: '拉德洛斯哨所', x: 28, y: 7,  size: 'village', owner: 0,
      produces: ['edain_militia'] },
    { id: 'brethil',  name: '布瑞希尔',     x: 6,  y: 13, size: 'town',    owner: 0,
      produces: ['haladin_axe', 'sindar_archer'] },
    { id: 'amon_ereb',name: '阿蒙埃瑞布',   x: 34, y: 12, size: 'town',    owner: 0,
      produces: ['edain_militia', 'feanor_warrior'] },
    { id: 'mithrim',  name: '米斯林',       x: 8,  y: 20, size: 'city',    owner: 1,
      produces: ['edain_militia', 'noldor_sword', 'hithlum_horse'] },
    { id: 'estolad',  name: '埃斯托拉德',   x: 22, y: 24, size: 'town',    owner: 0,
      produces: ['edain_militia', 'haladin_axe'] },
    { id: 'eithel',   name: '巴拉德埃塞尔', x: 30, y: 21, size: 'capital', owner: 1,
      produces: ['noldor_sword', 'sindar_archer', 'hithlum_horse', 'hithlum_lance'] },
  ],
  features: [
    { type: 'ruin',   x: 4,  y: 10, name: '北荒的坟丘' },
    { type: 'ruin',   x: 24, y: 6,  name: '焦土下的地窖' },
    { type: 'ruin',   x: 36, y: 17, name: '东丘的石环' },
    { type: 'temple', x: 16, y: 10, name: '西瑞安的祭坛' },
    { type: 'sage',   x: 12, y: 26, name: '沼畔的先知' },
  ],
  // 开局部队：城市 id → [兵种...]
  // 只写参战方的起始驻军；中立城市的守军由 state.js 按城市规模自动生成
  // （规模越大守军越多、越强 —— 见 neutralGarrison）
  garrisons: {
    angband:  ['orc_foot', 'orc_foot', 'orc_foot', 'troll'],
    orc_camp: ['orc_foot', 'orc_foot', 'warg_rider'],
    mithrim:  ['edain_militia', 'edain_militia', 'noldor_sword'],
    eithel:   ['noldor_sword', 'noldor_sword', 'sindar_archer'],
  },
  // M1 参战方（1 = 希斯路姆，8 = 安格班），其余为中立
  players: [1, 8],
};
