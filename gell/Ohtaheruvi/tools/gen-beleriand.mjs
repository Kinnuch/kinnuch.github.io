// 生成 maps/beleriand.js —— 贝烈瑞安德全图（140×110）
// 跑法：node tools/gen-beleriand.mjs
//
// 地理依《精灵宝钻》与托尔金的贝烈瑞安德地图：
// 北面铁山与安格班，其南阿德加兰平原；西为希斯路姆盆地（埃瑞德威斯林环抱）与
// 尼弗瑞斯特海岸；中为西瑞安河谷，两侧多松尼安高地与西瑞安隘口；
// 南为西贝烈瑞安德的森林与纳国斯隆德；东为多瑞亚斯、东贝烈瑞安德与欧西瑞安德七河，
// 再东是蓝色山脉与矮人的诺格罗德、贝烈国斯特；南端为西瑞安河口与巴拉尔岛。

import { writeFileSync } from 'node:fs';
import { makeGrid, rect, ellipse, stroke, noiseFill, road, ford, setScale, X, Y, toRows, get, set } from './paint.mjs';

// 放大 1.5×/1.36×：210×150 更贴近正典贝烈瑞安德地图约 1.4:1 的横长比例。
// 地理描述仍写在旧的 140×110 坐标系里，绘制原语会按缩放换算 ——
// 要改地理只动下面的描述，不用碰任何数字换算。
const W = 210, H = 150;
setScale(W / 140, H / 110);
const g = makeGrid(W, H, 'O');

// ── 陆块 ──────────────────────────────────────────────────
rect(g, 14, 0, 139, 101, 'P');                       // 主陆块
ellipse(g, 18, 76, 10, 20, 'O', 3, 11);              // 西海岸的凹入
rect(g, 0, 0, 13, 109, 'O');                         // 西面大海
rect(g, 0, 102, 139, 109, 'O');                      // 南面大海（巴拉尔湾）
ellipse(g, 62, 105, 28, 6, 'O', 2, 5);

// ── 北方：铁山与安格班 ────────────────────────────────────
rect(g, 14, 0, 139, 8, 'M');
stroke(g, [[20, 9], [60, 11], [100, 9], [139, 11]], 5, 'M', null, 1.5, 7);
// 安格班盆地：桑戈洛锥姆三峰之下的谷口，是全图北面唯一的进出通道
rect(g, 62, 3, 78, 13, 'W');
stroke(g, [[62, 3], [62, 9]], 3, 'M');                 // 谷口西壁
stroke(g, [[78, 3], [78, 9]], 3, 'M');                 // 谷口东壁
rect(g, 56, 6, 58, 13, 'W');                           // 铁山南门的缺口
rect(g, 95, 6, 98, 13, 'W');                           // 铁山东门的缺口

// ── 阿德加兰（骤火之战后即安佛格砾斯）────────────────────
rect(g, 20, 12, 132, 30, 'P');
noiseFill(g, 20, 12, 132, 26, 'W', 0.46, 9, 21, ['P']);        // 阿德加兰北缘的焦土斑块

// ── 埃瑞德罗明与埃瑞德威斯林：环抱希斯路姆 ────────────────
stroke(g, [[22, 14], [21, 34], [23, 52]], 6, 'M', null, 1.2, 13);      // 埃瑞德罗明（西）
stroke(g, [[22, 15], [40, 17], [52, 22]], 6, 'M', null, 1.2, 17);      // 北墙
stroke(g, [[52, 22], [54, 34], [50, 46]], 6, 'M', null, 1.2, 19);      // 东墙（临西瑞安隘口）
rect(g, 26, 22, 48, 44, 'H', ['P']);                                   // 希斯路姆盆地
noiseFill(g, 26, 22, 48, 44, 'P', 0.42, 7, 31, ['H']);         // 希斯路姆盆地里的开阔地
ellipse(g, 37, 31, 7, 4, 'V', 1, 23);                                  // 米斯林湖

// ── 尼弗瑞斯特（西海岸）──────────────────────────────────
rect(g, 15, 46, 24, 66, 'P', ['O', 'M']);
noiseFill(g, 15, 46, 24, 66, 'S', 0.60, 6, 41, ['P']);         // 尼弗瑞斯特的沼泽

// ── 西瑞安隘口与西瑞安河 ─────────────────────────────────
rect(g, 53, 20, 58, 34, 'P', ['M']);
stroke(g, [[56, 22], [58, 40], [56, 58], [60, 76], [58, 96], [60, 101]], 3, 'V', null, 1, 29);
for (const [fx, fy] of [[57, 30], [58, 52], [59, 70], [59, 88]]) ford(g, fx, fy);   // 全图仅四处渡口，浅滩铺满整条河宽

// ── 多松尼安高地 ─────────────────────────────────────────
ellipse(g, 78, 22, 20, 8, 'H', 2, 37);
noiseFill(g, 58, 14, 98, 30, 'T', 0.48, 8, 43, ['H']);         // 陶尔努浮阴的松林                      // 陶尔努浮阴的松林
stroke(g, [[62, 30], [78, 32], [96, 29]], 3, 'H', ['P'], 1, 47);

// ── 刚多林：环山之内的图姆拉登 ───────────────────────────
ellipse(g, 44, 40, 9, 8, 'M', 1, 53);
ellipse(g, 44, 40, 5, 4, 'P', 0.5, 59);
rect(g, 49, 43, 50.5, 44.5, 'H');                                      // 隐秘之路（唯一入口）

// ── 西贝烈瑞安德 ─────────────────────────────────────────
rect(g, 26, 50, 56, 96, 'P', ['O']);
ellipse(g, 46, 64, 12, 9, 'T', 2, 61);                                 // 陶尔恩法罗斯
ellipse(g, 62, 58, 8, 6, 'T', 1.5, 67);                                // 布瑞希尔森林
stroke(g, [[36, 56], [44, 62], [50, 72]], 2, 'V', null, 0.8, 71);      // 纳洛格河
ford(g, 42, 60); ford(g, 47, 68);
// 托尔西瑞安是河心岛（正典如此），放大后河宽把它整个围住 —— 南北各架一座桥
ford(g, 57, 37.2); ford(g, 57, 39.8);

// ── 法拉斯海岸 ───────────────────────────────────────────
rect(g, 22, 58, 30, 84, 'P', ['O']);
noiseFill(g, 22, 58, 27, 84, 'H', 0.62, 6, 73, ['P']);         // 法拉斯背后的丘陵

// ── 多瑞亚斯：涅尔多瑞斯与瑞吉安两片林海 ─────────────────
ellipse(g, 84, 48, 16, 9, 'T', 2, 79);
ellipse(g, 86, 66, 15, 10, 'T', 2, 83);
stroke(g, [[72, 44], [84, 54], [92, 70], [88, 84]], 2, 'V', null, 0.8, 89);   // 埃斯加尔都因
ford(g, 80, 50); ford(g, 90, 76);

// ── 安德拉姆长墙 ─────────────────────────────────────────
stroke(g, [[58, 82], [86, 79], [116, 82]], 4, 'H', ['P', 'T'], 1, 97);
rect(g, 74, 78, 78, 84, 'P', ['H']);                                   // 长墙上的缺口

// ── 东贝烈瑞安德 ─────────────────────────────────────────
rect(g, 96, 24, 130, 80, 'P', ['O']);
ellipse(g, 106, 30, 7, 5, 'H', 1, 101);                                // 希姆凛丘陵
rect(g, 98, 18, 108, 26, 'P', ['M', 'H']);                             // 迈格洛尔缺口
ellipse(g, 116, 74, 5, 4, 'H', 1, 103);                                // 阿蒙埃瑞布
noiseFill(g, 96, 36, 128, 76, 'T', 0.66, 7, 107, ['P']);       // 东贝烈瑞安德的疏林

// ── 欧西瑞安德七河与蓝色山脉 ─────────────────────────────
rect(g, 120, 40, 133, 96, 'T', ['P']);
for (let i = 0; i < 6; i++) {
  const y0 = 44 + i * 8;
  stroke(g, [[133, y0], [124, y0 + 5], [116, y0 + 9]], 1, 'V', null, 0.5, 109 + i);
}
stroke(g, [[132, 14], [136, 50], [133, 96]], 7, 'M', null, 1.5, 127);  // 埃瑞德路因

// ── 南端：西瑞安河口与巴拉尔岛 ───────────────────────────
rect(g, 48, 92, 72, 101, 'S', ['P']);
ellipse(g, 40, 105, 5, 3, 'P', 1, 131);                                // 巴拉尔岛
rect(g, 30, 96, 46, 101, 'P', ['O']);                                  // 阿佛尔尼恩海岸

// ── 道路网：只连要地，且必须过渡口 ───────────────────────
const ROADS = [
  [[66, 12], [64, 24], [61, 30], [57, 30]],            // 安格班 → 西瑞安隘口渡口（垂直过河）
  [[57, 30], [50, 30], [42, 30], [34, 32]],            // 隘口 → 希斯路姆
  [[58, 52], [54, 52], [50, 56], [45, 62]],            // 渡口 → 纳国斯隆德（垂直过河）
  [[58, 52], [66, 54], [76, 52], [84, 52]],            // 渡口 → 多瑞亚斯
  [[84, 52], [96, 56], [106, 60]],                     // 多瑞亚斯 → 东贝烈瑞安德
  [[106, 60], [116, 54], [126, 48], [131, 44]],        // → 矮人大道
  [[45, 62], [36, 66], [28, 70]],                      // 纳国斯隆德 → 法拉斯
  [[59, 70], [59, 88], [58, 96]],                      // 西瑞安下游 → 河口
  [[106, 60], [108, 40], [106, 32]],                   // 东贝 → 希姆凛
];
// road()：四连通步进，拐弯必相连；穿河自动铺成整段浅滩（桥）
for (const path of ROADS) road(g, path);

// ── 城市 ─────────────────────────────────────────────────
// owner 0=中立 1=希斯路姆 2=费艾诺 3=纳国斯隆德 4=刚多林 5=多瑞亚斯 6=法拉斯 7=矮人 8=安格班
const CITIES = [
  // 安格班
  ['angband', '安格班', 65, 3, 'capital', 8, ['orc_foot', 'boldog_guard', 'troll', 'dragon']],
  ['thangorodrim', '桑戈洛锥姆', 72, 4, 'city', 8, ['orc_foot', 'orc_archer', 'troll']],
  ['iron_gate', '铁山南门', 56, 6, 'town', 8, ['orc_foot', 'warg_rider']],
  ['east_gate', '铁山东门', 96, 6, 'town', 8, ['orc_foot', 'orc_archer']],
  ['west_camp', '西方的兽人营', 30, 10, 'village', 8, ['orc_foot']],
  ['ard_camp', '阿德加兰哨站', 84, 16, 'village', 0, ['orc_foot']],

  // 希斯路姆
  ['eithel_sirion', '巴拉德埃塞尔', 50, 24, 'capital', 1, ['noldor_sword', 'sindar_archer', 'hithlum_horse', 'hithlum_lance']],
  ['mithrim', '米斯林', 31, 27, 'city', 1, ['edain_militia', 'noldor_sword', 'hithlum_horse']],
  ['dor_lomin', '多尔洛明', 28, 38, 'city', 1, ['edain_militia', 'hithlum_horse', 'noldor_sword']],
  ['hithlum_watch', '希斯路姆北哨', 40, 21, 'town', 1, ['noldor_sword', 'sindar_archer']],
  ['annon_gelydh', '诺多之门', 24, 45, 'town', 0, ['edain_militia', 'falas_sailor']],

  // 尼弗瑞斯特与法拉斯
  ['vinyamar', '维尼阿马', 17, 50, 'town', 0, ['falas_sailor', 'sindar_archer']],
  ['brithombar', '布砾松巴', 24, 62, 'city', 6, ['falas_sailor', 'sindar_archer', 'noldor_sword']],
  ['eglarest', '埃格拉瑞斯特', 25, 76, 'capital', 6, ['falas_sailor', 'sindar_archer', 'noldor_sword', 'hithlum_horse']],
  ['falas_watch', '法拉斯南望', 27, 88, 'village', 6, ['falas_sailor']],
  ['balar', '巴拉尔岛', 38, 104, 'town', 0, ['falas_sailor', 'sindar_archer']],

  // 刚多林
  ['gondolin', '刚多林', 42, 38, 'capital', 4, ['gondolin_guard', 'noldor_sword', 'sindar_archer', 'eagle']],
  ['crissaegrim', '克瑞赛格林', 50, 34, 'village', 0, ['eagle']],

  // 多松尼安
  ['ladros', '拉德洛斯', 88, 18, 'town', 0, ['edain_militia', 'haladin_axe']],
  ['tarn_aeluin', '塔恩埃路因', 74, 24, 'town', 0, ['edain_militia', 'sindar_archer']],
  ['dorthonion_hold', '多松尼安要塞', 64, 20, 'town', 1, ['noldor_sword', 'sindar_archer']],
  ['aglon', '阿格隆隘口', 98, 22, 'town', 2, ['feanor_warrior', 'noldor_sword']],

  // 西瑞安河谷与西贝烈瑞安德
  ['sirion_pass', '西瑞安隘口哨所', 55, 28, 'town', 1, ['noldor_sword', 'hithlum_horse']],
  ['tol_sirion', '西瑞安河心岛', 57, 38, 'town', 3, ['noldor_sword', 'sindar_archer']],
  ['nargothrond', '纳国斯隆德', 44, 62, 'capital', 3, ['noldor_sword', 'galadhrim_bow', 'sindar_archer', 'hithlum_horse']],
  ['taur_faroth', '陶尔恩法罗斯', 40, 56, 'town', 3, ['galadhrim_bow', 'sindar_archer']],
  ['brethil', '布瑞希尔', 62, 57, 'city', 0, ['haladin_axe', 'sindar_archer', 'edain_militia']],
  ['amon_obel', '阿蒙欧贝尔', 66, 62, 'village', 0, ['haladin_axe']],
  ['amon_rudh', '阿蒙鲁兹', 50, 74, 'village', 0, ['edain_militia']],
  ['nan_tathren', '南塔斯仁', 52, 90, 'town', 0, ['sindar_archer', 'edain_militia']],
  ['sirion_havens', '西瑞安河口', 54, 96, 'city', 0, ['falas_sailor', 'edain_militia', 'sindar_archer']],

  // 多瑞亚斯
  ['menegroth', '明霓国斯', 84, 58, 'capital', 5, ['doriath_warden', 'sindar_archer', 'noldor_sword', 'galadhrim_bow']],
  ['neldoreth', '涅尔多瑞斯林哨', 84, 44, 'city', 5, ['doriath_warden', 'sindar_archer']],
  ['region', '瑞吉安林哨', 88, 70, 'city', 5, ['doriath_warden', 'sindar_archer']],
  ['esgalduin_ford', '埃斯加尔都因渡口', 78, 52, 'town', 5, ['doriath_warden', 'sindar_archer']],
  ['aelin_uial', '埃林尤伊尔', 66, 76, 'town', 0, ['sindar_archer', 'edain_militia']],

  // 东贝烈瑞安德
  ['himring', '希姆凛', 105, 29, 'capital', 2, ['feanor_warrior', 'noldor_sword', 'sindar_archer', 'hithlum_horse']],
  ['maglor_gap', '迈格洛尔缺口', 100, 20, 'town', 2, ['feanor_warrior', 'hithlum_horse']],
  ['himlad', '希姆拉德', 110, 38, 'town', 2, ['feanor_warrior', 'noldor_sword']],
  ['estolad', '埃斯托拉德', 98, 62, 'city', 0, ['edain_militia', 'haladin_axe', 'feanor_warrior']],
  ['amon_ereb', '阿蒙埃瑞布', 114, 73, 'city', 2, ['feanor_warrior', 'edain_militia', 'noldor_sword']],
  ['thargelion', '沙盖理安', 120, 34, 'town', 2, ['feanor_warrior', 'edain_militia']],
  ['ramdal', '拉姆达尔', 122, 82, 'village', 0, ['edain_militia']],

  // 欧西瑞安德与蓝色山脉
  ['ossir_north', '欧西瑞安德北林', 124, 48, 'town', 0, ['galadhrim_bow', 'sindar_archer']],
  ['ossir_south', '欧西瑞安德南林', 126, 76, 'town', 0, ['galadhrim_bow', 'sindar_archer']],
  ['belegost', '贝烈国斯特', 130, 40, 'capital', 7, ['dwarf_heavy', 'dwarf_axe', 'dwarf_mask', 'noldor_sword']],
  ['nogrod', '诺格罗德', 131, 62, 'capital', 7, ['dwarf_heavy', 'dwarf_axe', 'dwarf_mask']],
  ['dwarf_road', '矮人大道驿站', 124, 52, 'village', 7, ['dwarf_axe']],
  ['mount_dolmed', '多尔梅德山口', 132, 51, 'town', 7, ['dwarf_heavy', 'dwarf_axe']],

  // 地图放大后的加密城镇（多为中立，名取正典地名）
  ['lothlann', '洛斯兰边营', 112, 15, 'village', 0, ['orc_foot', 'warg_rider']],
  ['androth', '安德洛斯洞窟', 33, 33, 'village', 0, ['sindar_archer']],
  ['ivrin', '伊芙林泉', 44, 50, 'town', 0, ['sindar_archer', 'edain_militia']],
  ['brithiach', '布砾希阿赫', 61, 46, 'village', 0, ['edain_militia']],
  ['barad_nimras', '巴拉德宁拉斯', 23, 70, 'town', 6, ['falas_sailor', 'sindar_archer']],
  ['arossiach', '阿洛斯渡口镇', 97, 42, 'village', 0, ['sindar_archer']],
  ['thalos_vale', '沙洛斯河谷', 121, 56, 'village', 0, ['galadhrim_bow']],
  ['tol_galen', '托尔加兰', 121, 90, 'town', 0, ['galadhrim_bow', 'sindar_archer']],
  ['taras', '塔拉斯山麓', 17, 57, 'village', 0, ['falas_sailor', 'edain_militia']],
  ['dor_dinen', '多尔迪能哨所', 89, 37, 'village', 0, ['sindar_archer']],
  ['estolad_south', '埃斯托拉德南屯', 100, 68, 'village', 0, ['edain_militia', 'haladin_axe']],
];

// ── 换算到放大后的真实网格：农地、校验与输出全部用真实坐标 ──
const RC = CITIES.map(([id, n, x, y, size, o, pr]) => [id, n, X(x), Y(y), size, o, pr]);

// ── 城市周边铺农地，让城池看起来有人烟 ───────────────────
for (const [, , cx, cy, size] of RC) {
  const r = Math.round({ village: 2, town: 3, city: 4, capital: 5 }[size] * 1.4);
  for (let y = cy - r; y <= cy + r + 1; y++) for (let x = cx - r; x <= cx + r + 1; x++) {
    if (get(g, x, y) === 'P' && Math.hypot(x - cx - 0.5, y - cy - 0.5) <= r) set(g, x, y, 'F');
  }
}

// ── 地物 ─────────────────────────────────────────────────
const FEATURES = [
  ['ruin', 34, 16, '阿德加兰的坟丘'], ['ruin', 92, 12, '铁山脚的地窖'],
  ['ruin', 70, 34, '多松尼安的石环'], ['ruin', 36, 48, '希斯路姆的旧塔'],
  ['ruin', 54, 66, '纳洛格河畔的废墟'], ['ruin', 72, 88, '长墙下的墓室'],
  ['ruin', 108, 46, '东境的碑林'], ['ruin', 128, 88, '欧西瑞安德的祭石'],
  ['ruin', 20, 84, '海岸的沉船窟'], ['ruin', 96, 78, '阿蒙埃瑞布的地穴'],
  ['ruin', 46, 96, '沼泽中的塔基'], ['ruin', 118, 20, '缺口北的哨堡遗址'],
  ['temple', 58, 44, '西瑞安的祭坛'], ['temple', 30, 60, '海畔的祭坛'],
  ['temple', 92, 36, '多瑞亚斯北境的祭坛'], ['temple', 116, 62, '七河之间的祭坛'],
  ['temple', 44, 80, '南方的祭坛'], ['temple', 104, 14, '缺口的祭坛'],
  ['sage', 40, 70, '纳洛格的先知'], ['sage', 86, 62, '明霓国斯的智者'],
  ['sage', 126, 44, '矮人的匠师'], ['sage', 62, 94, '河口的观星者'],
  ['ruin', 60, 12, '铁山南麓的坑道'], ['ruin', 30, 66, '法拉斯的古灯塔'],
  ['temple', 68, 66, '布瑞希尔的祭坛'], ['sage', 108, 34, '希姆凛的星象师'],
];

const RF = FEATURES.map(([t, x, y, n]) => [t, X(x), Y(y), n]);

// ── 校验 ─────────────────────────────────────────────────
const rows = toRows(g);
rows.forEach((r, i) => { if (r.length !== W) throw new Error(`row ${i} len ${r.length}`); });

// 城市格在运行时会被 buildMap 压成 'C'（可通行），所以城市开在山里没问题
// （安格班本就在桑戈洛锥姆之下）。真正要保证的是「陆军进得来」：
// 城池四周至少有一格陆路可通。
const IMPASSABLE = 'VOM';
const stamped = new Set();
for (const [, , x, y] of RC) {
  for (const [dx, dy] of [[0, 0], [1, 0], [0, 1], [1, 1]]) stamped.add(`${x + dx},${y + dy}`);
}
const landAt = (x, y) => {
  const ch = get(g, x, y);
  if (ch == null) return false;
  if (stamped.has(`${x},${y}`)) return true;      // 别的城格也算陆路
  return !IMPASSABLE.includes(ch);
};

const warnings = [];
for (const [id, name, x, y] of RC) {
  let open = 0;
  for (let dy = -1; dy <= 2; dy++) for (let dx = -1; dx <= 2; dx++) {
    if (dx >= 0 && dx <= 1 && dy >= 0 && dy <= 1) continue;   // 跳过城市自身四格
    if (landAt(x + dx, y + dy)) open++;
  }
  if (open === 0) warnings.push(`${name}（${id}）四周全是山或水，陆军进不去`);
  if (get(g, x, y) == null) throw new Error(`城市 ${name} 越界`);
}
// 地物若落在河/海/山上，自动挪到最近的可走格（改地理后能自愈）
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
// 城市不许互相重叠
for (let i = 0; i < RC.length; i++) for (let j = i + 1; j < RC.length; j++) {
  const [, an, ax, ay] = RC[i], [, bn, bx, by] = RC[j];
  if (Math.abs(ax - bx) <= 1 && Math.abs(ay - by) <= 1) throw new Error(`${an} 与 ${bn} 重叠`);
}
if (warnings.length) {
  console.log('⚠ 需要处理：');
  for (const w of warnings) console.log('   ' + w);
}

const q = (s) => `'${s}'`;
const out = `// 贝烈瑞安德全图 ${W}×${H} —— 由 tools/gen-beleriand.mjs 生成，请勿手改
// 要调整地理，改生成器里的地理描述后重跑：node tools/gen-beleriand.mjs
//
// 地形字符：R道路 P草原 F农地 W荒原 T森林 H丘陵 M山地 S沼泽 D浅滩 V河流 O海洋

export const BELERIAND = {
  id: 'beleriand',
  name: '贝烈瑞安德',
  era: 1,
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
  players: [1, 2, 3, 4, 5, 6, 7, 8],
};
`;
writeFileSync(new URL('../maps/beleriand.js', import.meta.url), out);
console.log(`已生成 ${W}×${H}，城市 ${RC.length} 座，地物 ${RF.length} 处`);
