// 生成 maps/northwest.js —— 中洲西北 160×120（第三纪元）
// 跑法：node tools/gen-northwest.mjs
//
// 地理依《魔戒》附录地图：西起灰港与夏尔，中为迷雾山脉与安都因大河，
// 东北是幽暗密林、孤山与河谷，南是洛汗、白色山脉与刚铎，
// 东南是魔多（三面环山，只有黑门与西力斯乌苟两处入口），
// 更南是哈拉德与昂巴。

import { writeFileSync } from 'node:fs';
import { makeGrid, rect, ellipse, stroke, noiseFill, road, ford, setScale, X, Y, toRows, get, set } from './paint.mjs';

// 放大 1.3×/1.6×：208×192 更贴近正典中洲西北约 1.1:1 的图幅。
// 地理描述仍写在旧的 160×120 坐标系里，绘制原语按缩放换算。
const W = 208, H = 192;
setScale(W / 160, H / 120);
const g = makeGrid(W, H, 'O');

// ── 陆块 ──────────────────────────────────────────────────
rect(g, 10, 4, 159, 108, 'P');
rect(g, 0, 0, 9, 119, 'O');                       // 大海（西）
rect(g, 0, 109, 159, 119, 'O');                   // 南方大海
ellipse(g, 22, 52, 12, 10, 'O', 3, 3);            // 隆恩湾
ellipse(g, 30, 96, 16, 10, 'O', 3, 7);            // 贝尔法拉斯湾

// ── 迷雾山脉：南北纵贯全图的脊梁 ─────────────────────────
stroke(g, [[74, 6], [72, 30], [76, 52], [80, 70]], 9, 'M', null, 2, 11);
rect(g, 70, 40, 82, 44, 'H', ['M']);              // 摩瑞亚的东西两门

// ── 白色山脉：横贯中南部 ─────────────────────────────────
stroke(g, [[62, 86], [86, 84], [110, 88], [126, 92]], 8, 'M', null, 2, 13);
rect(g, 96, 84, 100, 90, 'H', ['M']);             // 敦哈洛与亡者之道
rect(g, 118, 88, 122, 94, 'H', ['M']);            // 明多路因山脚

// ── 埃利阿多（西北）─────────────────────────────────────
rect(g, 12, 20, 70, 76, 'P', ['O']);
noiseFill(g, 12, 20, 70, 50, 'H', 0.62, 8, 17, ['P']);      // 北岗与风云顶一带
ellipse(g, 34, 62, 13, 8, 'F', 2, 19);                      // 夏尔的耕地
ellipse(g, 52, 40, 9, 7, 'T', 2, 23);                       // 特洛姆林荒野
stroke(g, [[26, 30], [30, 48], [26, 62], [24, 74]], 2, 'V', null, 1, 29);   // 巴兰都因河
ford(g, 28, 44); ford(g, 26, 66);

// ── 安都因大河：从北到南贯穿中洲 ─────────────────────────
stroke(g, [[92, 8], [90, 34], [94, 58], [92, 80], [96, 100], [94, 108]], 3, 'V', null, 1.2, 31);
for (const [fx, fy] of [[91, 26], [92, 46], [93, 66], [94, 86], [96, 102]]) ford(g, fx, fy);   // 安都因五渡，浅滩铺满河宽

// ── 幽暗密林与东北 ───────────────────────────────────────
ellipse(g, 112, 30, 20, 22, 'T', 3, 37);
noiseFill(g, 96, 10, 140, 56, 'T', 0.55, 9, 41, ['P']);
stroke(g, [[104, 12], [140, 10]], 5, 'M', null, 1.5, 43);   // 灰色山脉
ellipse(g, 138, 22, 6, 5, 'M', 1, 47);                      // 孤山
 rect(g, 135.5, 21, 141.5, 29, 'H', ['M']);                      // 埃瑞博的南门与前庭
ellipse(g, 140, 30, 7, 4, 'V', 1, 53);                      // 长湖

// ── 罗瑞恩与迷雾山脉东麓 ─────────────────────────────────
ellipse(g, 98, 52, 8, 7, 'T', 1.5, 59);
rect(g, 84, 58, 96, 74, 'S', ['P']);                        // 格拉顿沼泽

// ── 洛汗 ─────────────────────────────────────────────────
rect(g, 66, 74, 106, 88, 'P', ['O']);
noiseFill(g, 66, 74, 106, 88, 'F', 0.60, 8, 61, ['P']);
ellipse(g, 80, 78, 6, 4, 'T', 1, 67);                       // 法贡森林边缘

// ── 刚铎 ─────────────────────────────────────────────────
rect(g, 100, 90, 140, 106, 'P', ['O']);
noiseFill(g, 100, 90, 140, 106, 'F', 0.58, 7, 71, ['P']);
ellipse(g, 128, 84, 10, 7, 'T', 2, 73);                     // 伊西利恩

// ── 魔多：三面环山，只有黑门与西力斯乌苟两处入口 ─────────
rect(g, 126, 60, 156, 84, 'W');
stroke(g, [[126, 60], [156, 58]], 5, 'M', null, 1, 79);      // 灰烬山脉（北）
stroke(g, [[126, 60], [124, 84]], 5, 'M', null, 1, 83);      // 埃斐尔杜阿斯（西）
stroke(g, [[126, 84], [156, 86]], 5, 'M', null, 1, 89);      // 埃斐尔杜阿斯（南）
rect(g, 124, 62, 127, 65, 'W');                             // 黑门
rect(g, 123, 76, 126, 79, 'W');                             // 西力斯乌苟
noiseFill(g, 128, 62, 155, 83, 'H', 0.66, 7, 97, ['W']);

// ── 哈拉德与东方 ─────────────────────────────────────────
rect(g, 100, 100, 156, 108, 'W', ['P']);
noiseFill(g, 100, 100, 156, 108, 'P', 0.55, 8, 101, ['W']);
rect(g, 146, 20, 159, 56, 'P', ['T']);                      // 瑞恩的草原

// ── 道路网 ───────────────────────────────────────────────
const ROADS = [
  [[20, 54], [34, 58], [46, 56], [56, 52]],                  // 灰港 → 夏尔 → 布理
  [[56, 52], [66, 46], [72, 42]],                            // 布理 → 瑞文戴尔
  [[72, 42], [80, 42], [92, 46]],                            // 摩瑞亚山口 → 安都因渡口
  [[92, 46], [98, 52], [100, 62]],                           // → 罗瑞恩 → 南下
  [[100, 62], [96, 76], [93, 66]],                           // 沿河
  [[86, 80], [93, 66]],                                      // 洛汗 → 渡口
  [[70, 80], [86, 80], [100, 84], [112, 90]],                // 艾森加德 → 埃多拉斯 → 刚铎
  [[112, 90], [122, 94], [132, 96]],                         // → 米那斯提力斯
  [[132, 96], [140, 100]],                                   // → 南方
  [[124, 78], [132, 84], [128, 90]],                          // 西力斯乌苟 → 伊西利恩
  [[112, 30], [126, 26], [136, 24]],                          // 幽暗密林 → 河谷
];
// road()：四连通步进，拐弯必相连；穿河自动铺成整段浅滩（桥）
for (const path of ROADS) road(g, path);

// ── 城市 ─────────────────────────────────────────────────
// 11 刚铎 12 洛汗 13 瑞文戴尔 14 罗瑞恩 15 北方同盟 16 艾森加德 17 魔多 18 哈拉德
const CITIES = [
  // 刚铎
  ['minas_tirith', '米那斯提力斯', 120, 94, 'capital', 11, ['gondor_militia', 'gondor_guard', 'tower_guard', 'rohirrim']],
  ['osgiliath', '奥斯吉利亚斯', 129, 96, 'city', 11, ['gondor_guard', 'gondor_militia', 'ithilien_ranger']],
  ['pelargir', '佩拉基尔', 118, 102, 'city', 11, ['gondor_militia', 'gondor_guard']],
  ['dol_amroth', '多阿姆洛斯', 104, 100, 'city', 11, ['gondor_guard', 'rohirrim', 'gondor_militia']],
  ['lossarnach', '洛萨那赫', 112, 98, 'town', 11, ['gondor_militia', 'gondor_guard']],
  ['cair_andros', '卡尔安德罗斯', 122, 88, 'town', 11, ['gondor_guard', 'ithilien_ranger']],

  // 洛汗
  ['edoras', '埃多拉斯', 88, 80, 'capital', 12, ['rohirrim', 'gondor_militia', 'gondor_guard', 'tower_guard']],
  ['helms_deep', '号角堡', 78, 82, 'city', 12, ['gondor_guard', 'rohirrim', 'tower_guard']],
  ['isen_ford', '艾森渡口', 70, 78, 'town', 12, ['rohirrim', 'gondor_militia']],
  ['dunharrow', '敦哈洛', 96, 86, 'town', 12, ['rohirrim', 'gondor_guard']],

  // 瑞文戴尔与北方杜内丹
  ['imladris', '伊姆拉缀斯', 68, 42, 'capital', 13, ['dunedain_ranger', 'mirkwood_archer', 'gondor_guard', 'great_eagle']],
  ['bree', '布理', 54, 52, 'town', 13, ['bree_militia', 'dunedain_ranger']],
  ['fornost', '佛诺斯特', 44, 34, 'town', 0, ['dunedain_ranger', 'bree_militia']],
  ['annuminas', '安努米那斯', 34, 40, 'town', 0, ['dunedain_ranger']],
  ['hobbiton', '霍比屯', 32, 60, 'village', 0, ['bree_militia']],
  ['mithlond', '灰港', 16, 50, 'city', 0, ['mirkwood_archer', 'bree_militia', 'gondor_guard']],
  ['weathertop', '风云顶', 50, 44, 'village', 0, ['dunedain_ranger']],

  // 罗瑞恩
  ['caras_galadhon', '卡拉斯加拉松', 96, 52, 'capital', 14, ['lorien_galadhrim', 'mirkwood_archer', 'great_eagle', 'gondor_guard']],
  ['cerin_amroth', '凯林安罗斯', 100, 48, 'town', 14, ['lorien_galadhrim', 'mirkwood_archer']],

  // 幽暗密林与孤山
  ['thranduil_halls', '森林王宫', 110, 20, 'capital', 15, ['mirkwood_archer', 'gondor_guard', 'lorien_galadhrim', 'great_eagle']],
  ['erebor', '埃瑞博', 137, 21, 'capital', 15, ['erebor_guard', 'dale_archer', 'tower_guard', 'gondor_guard']],
  ['dale', '河谷城', 134, 26, 'city', 15, ['dale_archer', 'gondor_guard', 'erebor_guard']],
  ['esgaroth', '埃斯加洛斯', 141, 34, 'town', 15, ['dale_archer', 'bree_militia']],
  ['carrock', '卡拉克岩', 98, 26, 'town', 0, ['dale_archer', 'mirkwood_archer']],
  ['beorn', '贝奥恩之家', 96, 34, 'village', 0, ['dale_archer']],

  // 艾森加德
  ['orthanc', '欧尔桑克', 68, 72, 'capital', 16, ['uruk_hai', 'siege_troll', 'warg_pack', 'orc_soldier']],
  ['isengard_pit', '艾森加德的矿坑', 66, 68, 'town', 16, ['orc_soldier', 'warg_pack']],

  // 魔多
  ['barad_dur', '巴拉都尔', 144, 70, 'capital', 17, ['orc_soldier', 'black_numenorean', 'olog_hai', 'nazgul']],
  ['minas_morgul', '米那斯魔古尔', 128, 78, 'capital', 17, ['orc_soldier', 'orc_bowman', 'black_numenorean', 'shelob_spawn']],
  ['morannon', '黑门', 128, 62, 'city', 17, ['orc_soldier', 'siege_troll', 'warg_pack']],
  ['dol_guldur', '多尔哥多', 106, 42, 'city', 17, ['orc_bowman', 'shelob_spawn', 'warg_pack']],
  ['durthang', '都尔桑', 136, 66, 'town', 17, ['orc_soldier', 'orc_bowman']],
  ['nurn', '努尔恩', 146, 80, 'town', 17, ['orc_soldier', 'black_numenorean']],
  ['moria', '凯撒督姆', 76, 40, 'city', 0, ['moria_orc', 'olog_hai', 'shelob_spawn']],
  ['gundabad', '刚达巴德', 84, 10, 'city', 17, ['moria_orc', 'warg_pack', 'olog_hai']],

  // 哈拉德与东方人
  ['umbar', '昂巴', 112, 106, 'capital', 18, ['mumak', 'easterling_chariot', 'orc_soldier', 'black_numenorean']],
  ['harad_town', '哈拉德威斯', 132, 104, 'city', 18, ['mumak', 'easterling_chariot', 'orc_soldier']],
  ['khand', '康德', 150, 96, 'town', 18, ['easterling_chariot', 'orc_soldier']],
  ['rhun_camp', '瑞恩的营地', 150, 40, 'city', 18, ['easterling_chariot', 'orc_soldier', 'orc_bowman']],
  ['east_bight', '东谷', 128, 46, 'town', 18, ['easterling_chariot', 'orc_bowman']],

  // 地图放大后的加密城镇（多为中立，名取正典地名）
  ['tharbad', '塔巴德', 52, 64, 'town', 0, ['bree_militia', 'gondor_militia']],
  ['michel_delving', '大洞镇', 26, 60, 'village', 0, ['bree_militia']],
  ['sarn_ford', '沙恩渡口', 40, 68, 'village', 0, ['dunedain_ranger']],
  ['north_downs', '北岗营地', 46, 28, 'village', 0, ['dunedain_ranger', 'bree_militia']],
  ['mount_gram', '格拉姆山巢', 58, 24, 'town', 0, ['moria_orc', 'warg_pack']],
  ['goblin_town', '半兽人镇', 80, 22, 'village', 0, ['moria_orc']],
  ['forlond', '福隆德', 13, 42, 'village', 0, ['mirkwood_archer']],
  ['linhir', '林希尔', 110, 104, 'village', 11, ['gondor_militia']],
  ['erech', '埃瑞赫', 98, 94, 'village', 0, ['gondor_militia']],
  ['west_emnet', '西埃姆内特', 78, 76, 'village', 12, ['rohirrim']],
  ['dorwinion', '多温尼安', 152, 30, 'town', 0, ['dale_archer']],
  ['calembel', '卡兰贝尔', 102, 94, 'village', 11, ['gondor_militia', 'gondor_guard']],
];

// ── 换算到放大后的真实网格：农地、校验与输出全部用真实坐标 ──
const RC = CITIES.map(([id, n, x, y, size, o, pr]) => [id, n, X(x), Y(y), size, o, pr]);

// 城市周边铺农地
for (const [, , cx, cy, size] of RC) {
  const r = Math.round({ village: 2, town: 3, city: 4, capital: 5 }[size] * 1.4);
  for (let y = cy - r; y <= cy + r + 1; y++) for (let x = cx - r; x <= cx + r + 1; x++) {
    if (get(g, x, y) === 'P' && Math.hypot(x - cx - 0.5, y - cy - 0.5) <= r) set(g, x, y, 'F');
  }
}

const FEATURES = [
  ['ruin', 46, 46, '风云顶的塔基'], ['ruin', 60, 30, '安格马的废墟'],
  ['ruin', 38, 28, '北岗的墓丘'], ['ruin', 20, 66, '塔丘的石阵'],
  ['ruin', 86, 44, '迷雾山脉的兽人洞'], ['ruin', 104, 60, '格拉顿的沉陷地'],
  ['ruin', 118, 34, '幽暗密林的黑塔'], ['ruin', 144, 46, '东方的碑林'],
  ['ruin', 74, 90, '白色山脉的墓室'], ['ruin', 134, 100, '哈拉德的陵墓'],
  ['ruin', 152, 66, '魔多的地窖'], ['ruin', 92, 14, '灰色山脉的龙穴'],
  ['temple', 40, 52, '埃利阿多的祭坛'], ['temple', 100, 70, '安都因畔的祭坛'],
  ['temple', 82, 76, '洛汗的祭坛'], ['temple', 124, 98, '刚铎的祭坛'],
  ['temple', 116, 26, '林地的祭坛'], ['temple', 148, 88, '努尔恩的祭坛'],
  ['sage', 66, 46, '伊姆拉缀斯的智者'], ['sage', 98, 56, '罗瑞恩的明镜'],
  ['sage', 136, 30, '河谷的史官'], ['sage', 36, 64, '夏尔的老学究'],
  ['ruin', 52, 58, '古大道的驿站废墟'], ['ruin', 108, 14, '灰色山脉的旧矿'],
  ['temple', 56, 68, '沙恩渡口的祭坛'], ['sage', 120, 96, '米那斯提力斯的学士'],
  ['orodruin', 140, 74, '末日火山'],
];

const RF = FEATURES.map(([t, x, y, n]) => [t, X(x), Y(y), n]);

// ── 校验 ─────────────────────────────────────────────────
const rows = toRows(g);
rows.forEach((r, i) => { if (r.length !== W) throw new Error(`row ${i} len ${r.length}`); });

const IMPASSABLE = 'VOM';
const stamped = new Set();
for (const [, , x, y] of RC) {
  for (const [dx, dy] of [[0, 0], [1, 0], [0, 1], [1, 1]]) stamped.add(`${x + dx},${y + dy}`);
}
const landAt = (x, y) => {
  const ch = get(g, x, y);
  if (ch == null) return false;
  if (stamped.has(`${x},${y}`)) return true;
  return !IMPASSABLE.includes(ch);
};

const warnings = [];
for (const [id, name, x, y] of RC) {
  let open = 0;
  for (let dy = -1; dy <= 2; dy++) for (let dx = -1; dx <= 2; dx++) {
    if (dx >= 0 && dx <= 1 && dy >= 0 && dy <= 1) continue;
    if (landAt(x + dx, y + dy)) open++;
  }
  if (open === 0) warnings.push(`${name}（${id}）四周全是山或水，陆军进不去`);
  if (get(g, x, y) == null) throw new Error(`城市 ${name} 越界`);
}
for (const f of RF) {
  const [, fx, fy, fname] = f;
  if (get(g, fx, fy) == null) throw new Error(`地物 ${fname} 越界`);
  if (!IMPASSABLE.includes(get(g, fx, fy))) continue;
  let moved = false;
  for (let r = 1; r <= 8 && !moved; r++) {
    for (let dy = -r; dy <= r && !moved; dy++) for (let dx = -r; dx <= r && !moved; dx++) {
      if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
      const nx = fx + dx, ny = fy + dy;
      const ch = get(g, nx, ny);
      if (ch == null || IMPASSABLE.includes(ch) || stamped.has(`${nx},${ny}`)) continue;
      console.log(`   地物「${fname}」自 (${fx},${fy}) 挪到 (${nx},${ny})`);
      f[1] = nx; f[2] = ny; moved = true;
    }
  }
  if (!moved) warnings.push(`地物 ${fname} 附近找不到可走的格子`);
}
for (let i = 0; i < RC.length; i++) for (let j = i + 1; j < RC.length; j++) {
  const [, an, ax, ay] = RC[i], [, bn, bx, by] = RC[j];
  if (Math.abs(ax - bx) <= 1 && Math.abs(ay - by) <= 1) throw new Error(`${an} 与 ${bn} 重叠`);
}
if (warnings.length) {
  console.log('⚠ 需要处理：');
  for (const w of warnings) console.log('   ' + w);
}

const q = (s) => `'${s}'`;
const out = `// 中洲西北全图 ${W}×${H}（第三纪元）—— 由 tools/gen-northwest.mjs 生成，请勿手改
// 要调整地理，改生成器里的地理描述后重跑：node tools/gen-northwest.mjs
//
// 地形字符：R道路 P草原 F农地 W荒原 T森林 H丘陵 M山地 S沼泽 D浅滩 V河流 O海洋

export const NORTHWEST = {
  id: 'northwest',
  name: '中洲西北',
  era: 3,
  w: ${W}, h: ${H},
  rows: [
${rows.map((r, i) => `    ${q(r)}, // ${String(i).padStart(3, ' ')}`).join('\n')}
  ],
  cities: [
${RC.map(([id, name, x, y, size, owner, produces]) =>
  `    { id: '${id}', name: '${name}', x: ${x}, y: ${y}, size: '${size}', owner: ${owner},\n      produces: [${produces.map(q).join(', ')}] },`).join('\n')}
  ],
  features: [
${RF.map(([type, x, y, name]) => `    { type: '${type}', x: ${x}, y: ${y}, name: '${name}' },`).join('\n')}
  ],
  garrisons: {},
  players: [11, 12, 13, 14, 15, 16, 17, 18],
};
`;
writeFileSync(new URL('../maps/northwest.js', import.meta.url), out);
console.log(`已生成 ${W}×${H}，城市 ${RC.length} 座，地物 ${RF.length} 处`);
