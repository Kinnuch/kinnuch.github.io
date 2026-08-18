// 联机同步测试：node test/lockstep.js
//
// 联机靠的是「同一串指令在每一端推演出同一个局面」。
// 这里开两局独立的对局（模拟房主与客户端），把同一串指令按同样顺序喂给两边，
// 每一步都比对局面指纹。只要有一步对不上，联机就会失步 —— 这个测试就是防它的。

import { TEST_MAP } from '../maps/test.js';
import { SCENARIOS } from '../maps/scenarios.js';
import * as S from '../js/state.js';
import { applyCmd, checksum } from '../js/commands.js';
import { makeUnit } from '../js/unit.js';

let fails = 0;
const ok = (c, m) => { console.log((c ? '  ok   ' : '  FAIL ') + m); if (!c) fails++; };

function fresh(mapDef, opts) { return S.newGame(mapDef, opts); }

console.log('— 指令流在两端推演一致 —');
{
  const opts = { seed: 20260818, humans: [1, 8], fogMode: 'memory', difficulty: 'normal' };
  const host = fresh(TEST_MAP, opts);
  const peer = fresh(TEST_MAP, opts);

  ok(checksum(host) === checksum(peer), `开局指纹一致（${checksum(host)}）`);

  // 编一串涵盖各类指令的操作
  const cmds = [];
  const eithel = S.cityById(host, 'eithel');
  const mithrim = S.cityById(host, 'mithrim');
  cmds.push({ k: 'produce', p: 1, city: eithel.id, type: 'hithlum_lance' });
  cmds.push({ k: 'vector', p: 1, city: eithel.id, target: mithrim.id });

  const at = S.cityAnchor(mithrim);
  const army = S.armyAt(host, at.x, at.y);
  const reach = S.reachFor(host, army);
  const spot = [...reach.keys()][12];
  cmds.push({ k: 'move', p: 1, army: army.id, units: null,
    path: [{ x: spot % 4096, y: Math.floor(spot / 4096) }] });
  cmds.push({ k: 'undo', p: 1 });
  cmds.push({ k: 'endturn', p: 1 });
  cmds.push({ k: 'ai', p: 8 });
  cmds.push({ k: 'endturn', p: 8 });
  for (let i = 0; i < 12; i++) {
    cmds.push({ k: 'ai', p: i % 2 === 0 ? 1 : 8 });
    cmds.push({ k: 'endturn', p: i % 2 === 0 ? 1 : 8 });
  }

  let diverged = -1;
  for (let i = 0; i < cmds.length; i++) {
    applyCmd(host, cmds[i]);
    applyCmd(peer, cmds[i]);
    if (checksum(host) !== checksum(peer)) { diverged = i; break; }
  }
  ok(diverged < 0, diverged < 0
    ? `${cmds.length} 条指令逐条比对，两端始终一致`
    : `第 ${diverged} 条指令（${cmds[diverged].k}）后两端分叉`);
  ok(host.turn === peer.turn && host.gold[1] === peer.gold[1],
     `回合与金库一致（第 ${host.turn} 回合，${host.gold[1]} 金）`);
}

console.log('\n— 战斗也必须两端一致（掷骰走同一条种子链）—');
{
  const opts = { seed: 5150, humans: [1, 8], fogMode: 'off' };
  const host = fresh(TEST_MAP, opts);
  const peer = fresh(TEST_MAP, opts);
  const mk = (G) => {
    const lad = S.cityById(G, 'ladros');
    return S.placeArmy(G, lad.x, lad.y + 2, 1,
      Array.from({ length: 5 }, () => makeUnit(G, 'hithlum_lance')));
  };
  const a1 = mk(host), a2 = mk(peer);
  ok(a1.id === a2.id, `两端造出的军团 id 一致（${a1.id}）`);

  const lad = S.cityById(host, 'ladros');
  const cmd = { k: 'attack', p: 1, army: a1.id, x: lad.x, y: lad.y + 1, units: null };
  const r1 = applyCmd(host, cmd);
  const r2 = applyCmd(peer, cmd);
  ok(checksum(host) === checksum(peer), '一场战斗后两端指纹一致');
  ok(r1.res.winner === r2.res.winner && r1.res.rounds === r2.res.rounds,
     `战果与交锋轮数一致（${r1.res.winner}，${r1.res.rounds} 轮）`);
  ok(JSON.stringify(r1.res.log) === JSON.stringify(r2.res.log), '逐次决斗的过程也逐条一致');
}

console.log('\n— 大图 + 剧本事件同样一致 —');
{
  const sc = SCENARIOS.find((x) => x.id === 'dagor_bragollach');
  const opts = { seed: 777, scenario: sc, humans: [1], fogMode: 'memory', difficulty: 'hard' };
  const host = fresh(sc.map, opts);
  const peer = fresh(sc.map, opts);
  let diverged = -1;
  for (let i = 0; i < 60; i++) {
    const p = S.current(host);
    const cmds = [{ k: 'ai', p }, { k: 'endturn', p }];
    for (const c of cmds) { applyCmd(host, c); applyCmd(peer, c); }
    if (checksum(host) !== checksum(peer)) { diverged = i; break; }
    if (host.winner) break;
  }
  ok(diverged < 0, diverged < 0
    ? `骤火之战推进到第 ${host.turn} 回合，两端始终一致（含焦土化等剧本事件）`
    : `第 ${diverged} 轮后分叉`);
}

console.log('\n— 指令拒绝非法操作 —');
{
  const G = fresh(TEST_MAP, { seed: 1, humans: [1] });
  const before = checksum(G);
  ok(applyCmd(G, { k: 'produce', p: 8, city: 'eithel', type: 'noldor_sword' }) === null,
     '不能指挥别人的城市');
  ok(applyCmd(G, { k: 'endturn', p: 8 }) === null, '不能替别人结束回合');
  ok(applyCmd(G, { k: 'move', p: 8, army: 1, path: [{ x: 5, y: 5 }] }) === null,
     '不能移动别人的军团');
  ok(checksum(G) === before, '被拒绝的指令没有改动任何状态');
}

console.log(fails ? `\n${fails} 项失败` : '\n全部通过');
process.exit(fails ? 1 : 0);
