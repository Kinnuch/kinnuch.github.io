// 规则内核无头冒烟测试：node test/smoke.js
// 不涉及任何 DOM，只跑 state / map / combat。

import { TEST_MAP } from '../maps/test.js';
import * as S from '../js/state.js';
import { estimateOdds, computeMS, sideContext, resolveBattle } from '../js/combat.js';
import { makeUnit, unitName, unitMaxHp } from '../js/unit.js';
import { makeRng } from '../js/rng.js';
import { terrainAt } from '../js/map.js';
import { runAiTurn, DIFFICULTIES } from '../js/ai.js';
import { hasExplored, canSee, encodeSeen, decodeSeen } from '../js/fog.js';
import { UNITS } from '../data/units.js';

let fails = 0;
const ok = (cond, msg) => { console.log((cond ? '  ok   ' : '  FAIL ') + msg); if (!cond) fails++; };

console.log('— 建局 —');
const G = S.newGame(TEST_MAP, { seed: 20260817 });
ok(G.cities.length === 8, `城市 ${G.cities.length} 座`);
ok(G.armies.length >= 8, `初始军团 ${G.armies.length} 支`);
ok(!!G.heroes.fingolfin && !!G.heroes.sauron, '两位君主英雄已就位');

const mithrim = S.cityById(G, 'mithrim');
const mAnchor = S.cityAnchor(mithrim);
const mArmy = S.armyAt(G, mAnchor.x, mAnchor.y);
ok(!!mArmy && mArmy.owner === 1, '米斯林有希斯路姆驻军');
ok(mAnchor.x === mithrim.x + 1 && mAnchor.y === mithrim.y + 1, '驻军停在城池右下角，不遮住城市立绘');
ok(mArmy.units.length <= 8, `堆叠 ${mArmy.units.length} ≤ 8`);
// 君主入都城（希斯路姆的都城是巴拉德埃塞尔，不是米斯林）
const eithelCity = S.cityById(G, 'eithel');
const eAnchor = S.cityAnchor(eithelCity);
const eArmy0 = S.armyAt(G, eAnchor.x, eAnchor.y);
ok(eArmy0.units.some((u) => u.type === 'hero'), '芬国昐在都城并与驻军合流');
const angbandAnchor = S.cityAnchor(S.cityById(G, 'angband'));
ok(S.armyAt(G, angbandAnchor.x, angbandAnchor.y).units.some((u) => u.type === 'hero'), '索隆在安格班');

console.log('\n— 中立城池守军 —');
{
  const bySize = {};
  for (const c of G.cities) {
    if (c.owner !== 0) continue;
    const at = S.cityAnchor(c);
    const g = S.armyAt(G, at.x, at.y);
    ok(!!g && g.owner === 0, `${c.name}（${c.size}）有中立守军 ${g ? g.units.length : 0} 个单位`);
    bySize[c.size] = g.units.length;
    // 守军兵种必须出自该城自己的产兵表
    ok(g.units.every((u) => c.produces.includes(u.type)), `${c.name} 的守军取自本地兵种`);
  }
  ok(bySize.village < bySize.town, `规模越大守军越多：村镇 ${bySize.village} < 城 ${bySize.town}`);
  const village = G.cities.find((c) => c.owner === 0 && c.size === 'village');
  const town = G.cities.find((c) => c.owner === 0 && c.size === 'town');
  const vg = S.armyAt(G, S.cityAnchor(village).x, S.cityAnchor(village).y);
  const tg = S.armyAt(G, S.cityAnchor(town).x, S.cityAnchor(town).y);
  const maxStr = (a) => Math.max(...a.units.map((u) => UNITS[u.type].str));
  ok(maxStr(tg) > maxStr(vg), `规模越大守军越强：城的最强守军 ${maxStr(tg)} > 村镇的 ${maxStr(vg)}`);
}

console.log('\n— 移动与可达域 —');
const reach = S.reachFor(G, mArmy);
ok(reach.size > 0, `可达 ${reach.size} 格`);
const budget = S.stackBudget(G, mArmy);
ok(budget === 8, `军团预算取最慢者 = ${budget}（诺多剑士 8）`);
// 山地不可入（无山地系单位）
const mtn = [...reach.keys()].filter((k) => terrainAt(G.map, k % 4096, Math.floor(k / 4096)).kind === 'mountain');
ok(mtn.length === 0, '普通军团无法进入山地');
// 河流不可入
const riv = [...reach.keys()].filter((k) => terrainAt(G.map, k % 4096, Math.floor(k / 4096)).kind === 'river');
ok(riv.length === 0, '普通军团无法渡河（须走浅滩）');

// 回归：英雄单位的 type 是 'hero'，不在兵种表里，寻路必须能兜底
{
  const eArmy = S.armyAt(G, eAnchor.x, eAnchor.y);
  const heroUnit = eArmy.units.find((u) => u.type === 'hero');
  const soloReach = S.reachFor(G, eArmy, [heroUnit]);
  ok(soloReach.size > 0, `英雄单独行动可达 ${soloReach.size} 格（含英雄的军团寻路不崩）`);
  const heroMtn = [...soloReach.keys()].filter((k) => terrainAt(G.map, k % 4096, Math.floor(k / 4096)).kind === 'mountain');
  ok(heroMtn.length === 0, '英雄不能独自翻山');
}

console.log('\n— 飞行与山地系 —');
const eagleArmy = S.placeArmy(G, 20, 10, 1, [makeUnit(G, 'eagle')]);
const eReach = S.reachFor(G, eagleArmy);
const eMtn = [...eReach.keys()].filter((k) => terrainAt(G.map, k % 4096, Math.floor(k / 4096)).kind === 'mountain');
ok(eMtn.length > 0, `大鹰可越山（${eMtn.length} 格山地在可达域内）`);
S.removeArmy(G, eagleArmy);

console.log('\n— 战斗公式 —');
const terr = terrainAt(G.map, 20, 10);
const ctxA = sideContext(G, [makeUnit(null, 'orc_foot')], { terr, city: null, isDefender: false, foeUnits: [] });
ok(computeMS(G, makeUnit(null, 'orc_foot'), ctxA, null) === 3, '半兽人在草原 MS = 3');
const ctxB = sideContext(G, [makeUnit(null, 'sindar_archer')], { terr: { id: 'T', name: '森林', cost: 4, kind: 'land' }, city: null, isDefender: true, foeUnits: [] });
ok(computeMS(G, makeUnit(null, 'sindar_archer'), ctxB, null) === 6, '辛达弓手在森林 MS = 4+2 = 6');
// 加成上限
const capUnit = makeUnit(null, 'sindar_archer'); capUnit.blessed = true;
const fakeCtx = { terr: { id: 'T', name: '森林' }, city: null, isDefender: true, command: 3, stackItems: 1, cityBonus: 3, fear: 0, dread: 0 };
ok(computeMS(G, capUnit, fakeCtx, null) === 9, `加成封顶 +5：4+5 = ${computeMS(G, capUnit, fakeCtx, null)}`);

console.log('\n— 单轮胜率标定 —');
const rng = makeRng(7);
for (const [d, expect] of [[0, 0.500], [1, 0.551], [3, 0.645], [5, 0.727], [8, 0.830]]) {
  let w = 0, n = 200000;
  for (let i = 0; i < n; i++) {
    const a = rng.die(20) + d, b = rng.die(20);
    if (a === b) { i--; continue; }
    if (a > b) w++;
  }
  const p = w / n;
  ok(Math.abs(p - expect) < 0.01, `强度差 ${d} → 单轮胜率 ${(p * 100).toFixed(1)}%（设计值 ${(expect * 100).toFixed(1)}%）`);
}

console.log('\n— 爆冷概率 —');
{
  const env = { terr, city: null, attOrder: 'asc', defOrder: 'asc' };
  const odds = estimateOdds(G, [makeUnit(null, 'dragon')], [makeUnit(null, 'edain_militia')], env, 20000, 99);
  ok(odds.win > 0.94 && odds.win < 0.99, `火龙打民兵胜率 ${(odds.win * 100).toFixed(1)}%（设计上应留有几个百分点的翻车）`);
}

console.log('\n— 满编对轰 —');
{
  const att = Array.from({ length: 8 }, () => makeUnit(null, 'orc_foot'));
  const def = Array.from({ length: 8 }, () => makeUnit(null, 'noldor_sword'));
  const env = { terr, city: null, attOrder: 'asc', defOrder: 'asc' };
  const odds = estimateOdds(G, att, def, env, 3000, 5);
  // 造价 40 打造价 80，劣势但不是没戏 —— 廉价海量应当是一条真实路线
  ok(odds.win > 0.15 && odds.win < 0.4, `8 半兽人攻 8 诺多剑士胜率 ${(odds.win * 100).toFixed(1)}%（期望 15%~40%）`);
  const odds2 = estimateOdds(G, att, def.slice(0, 3), env, 3000, 5);
  ok(odds2.win > 0.6, `8 打 3 胜率 ${(odds2.win * 100).toFixed(1)}%（数量应能压过质量）`);
}

console.log('\n— 城防 —');
{
  const cityTerr = terrainAt(G.map, mithrim.x, mithrim.y);
  const env = { terr: cityTerr, city: mithrim, attOrder: 'asc', defOrder: 'asc' };
  const att = Array.from({ length: 6 }, () => makeUnit(null, 'orc_foot'));
  const def = Array.from({ length: 3 }, () => makeUnit(null, 'noldor_sword'));
  const withCity = estimateOdds(G, att, def, env, 3000, 11).win;
  const noCity = estimateOdds(G, att, def, { ...env, city: null }, 3000, 11).win;
  ok(withCity < noCity, `城防生效：攻城胜率 ${(withCity * 100).toFixed(1)}% < 野战 ${(noCity * 100).toFixed(1)}%`);
}

console.log('\n— 经济与生产 —');
{
  const g0 = G.gold[1];
  const inc = S.incomeOf(G, 1), up = S.upkeepOfPlayer(G, 1);
  ok(inc === 54, `希斯路姆收入 ${inc}（大城 22 + 都城 32）`);
  ok(up > 0, `维护费 ${up}`);
  const eithel = S.cityById(G, 'eithel');
  S.setProduction(G, eithel, 'hithlum_lance');
  S.setVector(G, eithel, 'mithrim');
  for (let i = 0; i < 12; i++) S.endTurn(G);
  ok(G.gold[1] !== g0, `12 回合后金库 ${G.gold[1]}`);
  const arrived = G.log.some((l) => l.text.includes('抵达 米斯林'));
  ok(arrived, '生产投送：枪骑从巴拉德埃塞尔抵达米斯林');
  ok(G.turn >= 6, `已推进到第 ${G.turn} 回合`);
}

console.log('\n— 破产解散 —');
{
  const G2 = S.newGame(TEST_MAP, { seed: 3, startGold: 0 });
  const eithel = S.cityById(G2, 'eithel');
  const eAt = S.cityAnchor(eithel);
  for (let i = 0; i < 30; i++) {
    const a = S.armyAt(G2, eAt.x, eAt.y);
    if (a && a.units.length < 8) a.units.push(Object.assign(makeUnit(G2, 'dragon'), { mp: 0 }));
  }
  const before = S.upkeepOfPlayer(G2, 1);
  S.endTurn(G2); S.endTurn(G2);
  const after = S.upkeepOfPlayer(G2, 1);
  ok(after < before, `入不敷出触发解散：维护 ${before} → ${after}`);
  ok(G2.gold[1] >= 0, `金库不为负（${G2.gold[1]}）`);
}

console.log('\n— 占城与胜负 —');
{
  // 关键回归：守军停在右下角，但玩家从左上角那格进城 ——
  // 必须照样触发战斗，不能绕过驻军白拿一座城
  {
    const Gs = S.newGame(TEST_MAP, { seed: 42 });
    const lad = S.cityById(Gs, 'ladros');
    const sneaker = S.placeArmy(Gs, lad.x, lad.y - 1, 1, [makeUnit(Gs, 'hithlum_lance')]);
    const guard = S.defenderIn(Gs, lad, 1);
    ok(!!guard && (guard.x !== lad.x || guard.y !== lad.y), '守军不在将被进攻的那一格上');
    const sneakRes = S.attack(Gs, sneaker, lad.x, lad.y);
    ok(!!sneakRes && !sneakRes.empty && !!sneakRes.log,
       '从没人的城格进攻，仍然要打掉守军才能进城');
  }

  const G3 = S.newGame(TEST_MAP, { seed: 42 });
  const ladros = S.cityById(G3, 'ladros');
  const attacker = S.placeArmy(G3, ladros.x, ladros.y + 2, 1,
    Array.from({ length: 8 }, () => makeUnit(G3, 'hithlum_lance')));
  const res = S.attack(G3, attacker, ladros.x, ladros.y + 1);
  ok(!!res, '发起了对拉德洛斯哨所的进攻');
  ok(ladros.owner === 1 || res.winner === 'def', `战后归属 ${ladros.owner}`);
  // 幸存者耐久必须回满
  for (const a of G3.armies) for (const u of a.units) {
    if (u.hp !== unitMaxHp(G3, u)) { ok(false, `${unitName(G3, u)} 战后耐久未恢复`); break; }
  }
  ok(true, '战后幸存者耐久已全恢复');

  // 直接把 2/3 城市判给一方，验证胜利判定
  for (const c of G3.cities.slice(0, 6)) c.owner = 1;
  S.checkVictory(G3);
  ok(G3.winner === 1, `胜利判定：winner = ${G3.winner}`);
}

console.log('\n— 英雄求聘 —');
{
  const G4 = S.newGame(TEST_MAP, { seed: 777, startGold: 5000 });
  let offers = 0;
  for (let i = 0; i < 200 && offers < 3; i++) {
    S.endTurn(G4);
    if (G4.offer && G4.offer.player === S.current(G4)) { S.acceptOffer(G4); offers++; }
  }
  ok(offers >= 1, `${offers} 次求聘被接受，英雄总数 ${Object.keys(G4.heroes).length}`);
}

console.log('\n— 撤回 —');
{
  const G5 = S.newGame(TEST_MAP, { seed: 555 });
  const city = S.cityById(G5, 'mithrim');
  const cAt = S.cityAnchor(city);
  const a = S.armyAt(G5, cAt.x, cAt.y);
  const x0 = a.x, y0 = a.y, mp0 = S.stackBudget(G5, a);
  ok(!S.canUndo(G5), '开局没有可撤回的步数');

  S.pushUndo(G5);
  const reach = S.reachFor(G5, a);
  const k = [...reach.keys()][10];
  S.moveAlong(G5, a, [{ x: k % 4096, y: Math.floor(k / 4096) }]);
  ok(S.canUndo(G5), '移动后可撤回');
  ok(a.x !== x0 || a.y !== y0, `已移动到 (${a.x},${a.y})`);

  S.undoMove(G5);
  const back = S.armyAt(G5, x0, y0);
  ok(!!back, '撤回后军团回到原位');
  ok(S.stackBudget(G5, back) === mp0, `移动点也一并还原（${S.stackBudget(G5, back)}）`);
  ok(!S.canUndo(G5), '撤回栈已弹空');

  // 多步撤回
  const a2 = S.armyAt(G5, x0, y0);
  for (let i = 0; i < 3; i++) {
    S.pushUndo(G5);
    const r = S.reachFor(G5, a2);
    if (!r.size) break;
    const kk = [...r.keys()][0];
    S.moveAlong(G5, a2, [{ x: kk % 4096, y: Math.floor(kk / 4096) }]);
  }
  const depth = G5.undo.length;
  while (S.canUndo(G5)) S.undoMove(G5);
  ok(depth >= 2 && !!S.armyAt(G5, x0, y0), `连续 ${depth} 步全部撤回后回到原位`);

  // 交战后撤回必须失效
  S.pushUndo(G5);
  const ladros = S.cityById(G5, 'ladros');
  const striker = S.placeArmy(G5, ladros.x, ladros.y + 2, 1,
    Array.from({ length: 6 }, () => makeUnit(G5, 'hithlum_lance')));
  S.attack(G5, striker, ladros.x, ladros.y);
  ok(!S.canUndo(G5), '交战后撤回栈被清空（防止读档大法）');
}

console.log('\n— 统计历史 —');
{
  const G6 = S.newGame(TEST_MAP, { seed: 606 });
  ok(G6.history.length === 1, '开局即记录第 1 回合');
  ok(G6.history[0].by[1].gold === 120 && G6.history[0].by[1].cities === 2,
     `第 1 回合快照：金币 ${G6.history[0].by[1].gold}、城池 ${G6.history[0].by[1].cities}`);
  for (let i = 0; i < 8; i++) S.endTurn(G6);
  ok(G6.history.length >= 4, `${G6.history.length} 条记录`);
  const keys = Object.keys(G6.history[0].by[1]);
  ok(['gold', 'cities', 'units', 'income', 'upkeep'].every((k) => keys.includes(k)),
     `每条含 ${keys.join('、')}`);
  ok(G6.history.every((h) => G6.players.every((p) => h.by[p])), '每条都覆盖全部参战方');
}

console.log('\n— 战争迷雾 —');
{
  const Gf = S.newGame(TEST_MAP, { seed: 4, humans: [1], fogMode: 'memory' });
  const total = Gf.map.w * Gf.map.h;
  const count = (p) => { let n = 0; for (let y = 0; y < Gf.map.h; y++) for (let x = 0; x < Gf.map.w; x++) if (hasExplored(Gf, p, x, y)) n++; return n; };
  const before = count(1);
  ok(before > 0 && before < total, `开局只探索了 ${before} / ${total} 格`);
  ok(canSee(Gf, 1, S.cityById(Gf, 'eithel').x, S.cityById(Gf, 'eithel').y), '看得见自己的都城');
  ok(!canSee(Gf, 1, S.cityById(Gf, 'angband').x, S.cityById(Gf, 'angband').y), '看不见敌方的都城');

  const mAt = S.cityAnchor(S.cityById(Gf, 'mithrim'));
  const a = S.armyAt(Gf, mAt.x, mAt.y);
  const r = S.reachFor(Gf, a);
  const k = [...r.keys()][30];
  S.moveAlong(Gf, a, [{ x: k % 4096, y: Math.floor(k / 4096) }]);
  ok(count(1) > before, `行军揭开了新视野（${before} → ${count(1)} 格）`);

  const Goff = S.newGame(TEST_MAP, { seed: 4, humans: [1], fogMode: 'off' });
  ok(canSee(Goff, 1, 18, 1), '全知档下全图可见');

  const packed = encodeSeen(Gf.seen[1]);
  const back = decodeSeen(packed, Gf.seen[1].length);
  ok(back.every((v, i) => v === Gf.seen[1][i]), `已探索区域按位打包往返一致（${packed.length} 字符存下 ${total} 格）`);
}

console.log('\n— AI 三层与四档难度 —');
{
  const G7 = S.newGame(TEST_MAP, { seed: 707, humans: [1], fogMode: 'off', difficulty: 'normal' });
  const t0 = Date.now();
  let aiTurns = 0, aiCaptures = 0;
  for (let i = 0; i < 60 && !G7.winner; i++) {
    S.endTurn(G7);
    if (!S.isHuman(G7, S.current(G7))) {
      const b = S.citiesOf(G7, 8).length;
      runAiTurn(G7, S.current(G7));
      aiTurns++;
      if (S.citiesOf(G7, 8).length > b) aiCaptures++;
    }
  }
  const ms = Date.now() - t0;
  ok(aiTurns > 0, `AI 执行了 ${aiTurns} 个回合`);
  ok(ms / Math.max(1, aiTurns) < 1500, `平均每 AI 回合 ${(ms / Math.max(1, aiTurns)).toFixed(0)}ms（预算 1500ms）`);
  ok(aiCaptures > 0, `全知档下 AI 主动攻占了 ${aiCaptures} 座城`);
  ok(G7.gold[8] >= 0, `AI 没有把自己搞破产（金库 ${G7.gold[8]}）`);

  // 回归：侦察目标一度选成未探索格，而安格班四周全是山，
  // 寻路一律失败，AI 在迷雾下原地站了几十个回合
  const Gfog = S.newGame(TEST_MAP, { seed: 707, humans: [1], fogMode: 'memory', difficulty: 'normal' });
  const seenAt = () => { let n = 0; for (let y = 0; y < Gfog.map.h; y++) for (let x = 0; x < Gfog.map.w; x++) if (hasExplored(Gfog, 8, x, y)) n++; return n; };
  const start = seenAt();
  for (let i = 0; i < 120 && !Gfog.winner; i++) {
    S.endTurn(Gfog);
    if (!S.isHuman(Gfog, S.current(Gfog))) runAiTurn(Gfog, S.current(Gfog));
  }
  ok(seenAt() > start * 3, `迷雾下 AI 会主动侦察拓展视野（${start} → ${seenAt()} 格）`);
  ok(S.citiesOf(Gfog, 8).length > 2, `迷雾下 AI 仍能扩张到 ${S.citiesOf(Gfog, 8).length} 座城`);

  const spread = {};
  for (const d of Object.keys(DIFFICULTIES)) {
    const Gd = S.newGame(TEST_MAP, { seed: 22, humans: [1], fogMode: 'memory', difficulty: d });
    for (let i = 0; i < 100 && !Gd.winner; i++) {
      S.endTurn(Gd);
      if (!S.isHuman(Gd, S.current(Gd))) runAiTurn(Gd, S.current(Gd));
    }
    let ex = 0;
    for (let y = 0; y < Gd.map.h; y++) for (let x = 0; x < Gd.map.w; x++) if (hasExplored(Gd, 8, x, y)) ex++;
    spread[d] = ex;
  }
  ok(spread.morgoth !== spread.merciful,
     `四档难度的表现确有差别（探图 ${Object.entries(spread).map(([k, v]) => k + ':' + v).join(' ')}）`);
}

console.log('\n— 战史 —');
{
  const Gb = S.newGame(TEST_MAP, { seed: 9, humans: [1] });
  const lad = S.cityById(Gb, 'ladros');
  const striker = S.placeArmy(Gb, lad.x, lad.y + 2, 1, Array.from({ length: 6 }, () => makeUnit(Gb, 'hithlum_lance')));
  S.attack(Gb, striker, lad.x, lad.y + 1);
  ok(Gb.battles.length === 1, '战斗被记入战史');
  ok(Gb.battles[0].duels.length > 0, `战史里保留了 ${Gb.battles[0].duels.length} 场逐次决斗`);
  ok(Gb.battles[0].place === lad.name, `战史标出了地点「${Gb.battles[0].place}」`);
}

console.log('\n— 确定性 —');
{
  const a = S.newGame(TEST_MAP, { seed: 12345 });
  const b = S.newGame(TEST_MAP, { seed: 12345 });
  for (let i = 0; i < 20; i++) { S.endTurn(a); S.endTurn(b); }
  ok(JSON.stringify(a.log) === JSON.stringify(b.log), '同种子重放出完全相同的日志');
}

console.log(fails ? `\n${fails} 项失败` : '\n全部通过');
process.exit(fails ? 1 : 0);
