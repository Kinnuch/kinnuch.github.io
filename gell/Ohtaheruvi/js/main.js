// 启动、输入与回合驱动

import { TEST_MAP } from '../maps/test.js';
import { SCENARIOS, scenarioById } from '../maps/scenarios.js';
import { HERO_ROSTER } from '../data/heroes.js';
import { FACTIONS } from '../data/factions.js';
import * as S from './state.js';
import * as R from './render.js';
import * as UI from './ui.js';
import * as Save from './save.js';
import { runAiTurn, DIFFICULTIES } from './ai.js';
import { startTutorial, tutorialSeen } from './tutorial.js';
import { key, pathTo } from './map.js';
import { UNITS } from '../data/units.js';
import * as SFX from './sound.js';
import { applyCmd, checksum } from './commands.js';
import { Net } from './net.js';
import { drawThumb } from './thumb.js';

const $ = (id) => document.getElementById(id);
const delay = (ms) => new Promise((r) => setTimeout(r, ms));

let G = null, view = null, ui = null, busy = false, wantTutorial = false;
let pickedScenario = SCENARIOS[0], pickedSide = SCENARIOS[0].players[0];
let pickedFog = 'memory', pickedDiff = 'normal';

// ── 联机 ──────────────────────────────────────────────────
// mp.seats: 势力 → 占位者（'me' / peerId / null 表示交给 AI）
let mp = null;

/** 我这一端此刻能不能操作 */
function myFaction() { return mp ? mp.myFaction : (G ? G.humans[0] : null); }
function isMyTurn() { return G && !G.winner && S.current(G) === myFaction(); }

/**
 * 所有会改变局面的操作都从这里走。
 * 单人：立即本地执行。联机：房主定序后广播，各端按同一顺序重放。
 * 两种模式共用一条路径，才不会出现「只有联机才有的 bug」。
 */
function submit(cmd) {
  cmd.p = myFaction();
  if (!mp) return runCmd(cmd);
  if (mp.net.isHost) mp.net.orderCmd(cmd, () => checksum(G));
  else mp.net.sendCmd(cmd);
  return null;                     // 联机时等指令回流再执行
}

/** 真正执行一条指令，并播它的表现 */
function runCmd(cmd) {
  const fx = applyCmd(G, cmd);
  if (!fx) { UI.refreshAll(ui); return null; }
  if (fx.fx === 'battle') SFX.sfxClash();
  if (fx.fx === 'move') SFX.sfxMove();
  if (fx.fx === 'feature') SFX.sfxTreasure();
  UI.refreshAll(ui);
  return fx;
}

const FOG_MODES = [
  { key: 'off', name: '全知', desc: '全图可见，与原作初代一致。' },
  { key: 'memory', name: '记忆制', desc: '走过的地形与城市归属永久保留，敌军只在视野内可见。' },
  { key: 'strict', name: '严格迷雾', desc: '同记忆制，但城市归属只显示你最后一次看到的状态。' },
];

// 战役列表里额外加一项：M1 的小测试地图，用来快速试手感
const TUTORIAL_SCENARIO = {
  id: 'test', map: TEST_MAP, name: '米斯林试炼场（小图）', era: 1,
  blurb: '40×30 的小地图，希斯路姆的诺多对安格班。想快速试规则、试手感就选它。',
  players: [1, 8],
};
const ALL_SCENARIOS = [TUTORIAL_SCENARIO, ...SCENARIOS];

// ── 大厅：模式 → 战役 →（联机）房间 ─────────────────────

function showScreen(id) {
  for (const el of document.querySelectorAll('.screen')) el.style.display = 'none';
  $('game').style.display = 'none';
  if (id) $(id).style.display = '';
}

function renderScenarioList() {
  const list = $('scenarioList');
  list.innerHTML = '';
  for (const sc of ALL_SCENARIOS) {
    const card = document.createElement('div');
    card.className = 'sc-card' + (sc === pickedScenario ? ' active' : '');
    const nm = document.createElement('div');
    nm.className = 'sc-name'; nm.textContent = sc.name;
    const meta = document.createElement('div');
    meta.className = 'sc-meta';
    meta.textContent = `${sc.map.w}×${sc.map.h}　${sc.players.length} 方`
      + (sc.turnLimit ? `　上限 ${sc.turnLimit} 回合` : '　无回合上限');
    card.append(nm, meta);
    card.onclick = () => {
      pickedScenario = sc;
      if (!sc.players.includes(pickedSide)) pickedSide = sc.players[0];
      renderSetup();
    };
    list.appendChild(card);
  }
}

let thumbAnimOn = false;

/** 缩略图的呼吸动画：只在战役选择屏可见时跑 */
function animateThumb() {
  if ($('screenSetup').style.display === 'none') { thumbAnimOn = false; return; }
  const sc = pickedScenario;
  drawThumb($('scThumb'), sc.map, {
    owners: sc.owners || {}, players: sc.players, locked: sc.locked,
    cacheKey: sc.id, highlight: pickedSide,
    pulse: (performance.now() % 1400) / 1400,
  });
  requestAnimationFrame(animateThumb);
}

/** 右侧：缩略地图 + 战役介绍 + 选边 + 选项 */
function renderSetup() {
  renderScenarioList();
  const sc = pickedScenario;

  // 缩略图：地形 + 各方都城的点（选中势力的都城带呼吸脉冲）
  drawThumb($('scThumb'), sc.map, {
    owners: sc.owners || {}, players: sc.players, locked: sc.locked,
    cacheKey: sc.id, highlight: pickedSide, pulse: 0,
  });
  if (!thumbAnimOn) { thumbAnimOn = true; requestAnimationFrame(animateThumb); }

  const info = $('scInfo');
  info.innerHTML = '';
  const blurb = document.createElement('p');
  blurb.className = 'sc-blurb';
  blurb.textContent = sc.blurb || '';
  info.appendChild(blurb);

  const facts = document.createElement('div');
  facts.className = 'sc-facts';
  const add = (k, v) => {
    const a = document.createElement('span'); a.className = 'k'; a.textContent = k;
    const b = document.createElement('span'); b.className = 'v'; b.textContent = v;
    facts.append(a, b);
  };
  add('战场', `${sc.map.name}　${sc.map.w}×${sc.map.h}　${sc.map.cities.length} 座城`);
  add('参战', sc.players.map((f) => FACTIONS[f].short).join('、'));
  add('回合', sc.turnLimit ? `上限 ${sc.turnLimit} 回合` : '无上限');
  if (sc.locked) add('战场范围', '只开放地图的一部分（缩略图上压暗处不可进入）');
  info.appendChild(facts);

  // 选边
  const sides = $('sidePick');
  sides.innerHTML = '';
  for (const f of sc.players) {
    const fac = FACTIONS[f];
    const b = document.createElement('button');
    b.className = 'side-btn' + (f === pickedSide ? ' active' : '');
    const dot = document.createElement('span');
    dot.className = 'side-dot'; dot.style.background = fac.color;
    b.append(dot, document.createTextNode(`${fac.emblem} ${fac.short}`));
    b.onclick = () => { pickedSide = f; renderSetup(); };
    sides.appendChild(b);
  }

  // 所选势力的介绍
  const fac = FACTIONS[pickedSide];
  const si = $('sideInfo');
  si.innerHTML = '';
  const head = document.createElement('div');
  head.className = 'si-head';
  const dot = document.createElement('span');
  dot.className = 'side-dot'; dot.style.background = fac.color;
  const nm = document.createElement('b'); nm.textContent = fac.name;
  head.append(dot, nm);
  if (fac.lord) {
    const l = document.createElement('span');
    l.className = 'muted tiny'; l.textContent = `君主 ${fac.lord}`;
    head.appendChild(l);
  }
  si.appendChild(head);
  if (fac.trait) {
    const t = document.createElement('div');
    t.className = 'si-trait'; t.textContent = '专属：' + fac.trait;
    si.appendChild(t);
  }
  if (fac.blurb) {
    const b2 = document.createElement('p');
    b2.className = 'si-blurb'; b2.textContent = fac.blurb;
    si.appendChild(b2);
  }

  const fogBox = $('fogPick');
  fogBox.innerHTML = '';
  for (const m of FOG_MODES) {
    const b = document.createElement('button');
    b.className = 'side-btn' + (m.key === pickedFog ? ' active' : '');
    b.textContent = m.name;
    b.title = m.desc;
    b.onclick = () => { pickedFog = m.key; renderSetup(); };
    fogBox.appendChild(b);
  }

  const diffBox = $('diffPick');
  diffBox.innerHTML = '';
  for (const d of Object.values(DIFFICULTIES)) {
    const b = document.createElement('button');
    b.className = 'side-btn' + (d.key === pickedDiff ? ' active' : '');
    b.textContent = d.name;
    b.title = d.desc;
    b.onclick = () => { pickedDiff = d.key; renderSetup(); };
    diffBox.appendChild(b);
  }
  $('diffDesc').textContent = DIFFICULTIES[pickedDiff].desc;

  // 联机时只有房主能开局
  $('newBtn').disabled = !!(mp && !mp.net.isHost);
  $('newBtn').textContent = mp ? '⚔ 开局（空位补 AI）' : '⚔ 开战';
  $('seedBtn').style.display = mp ? 'none' : '';
}

function makeGame(seed) {
  const sc = pickedScenario === TUTORIAL_SCENARIO ? null : pickedScenario;
  return S.newGame(pickedScenario.map, {
    seed, scenario: sc, humans: [pickedSide],
    fogMode: pickedFog, difficulty: pickedDiff,
  });
}

// ── 联机 ──────────────────────────────────────────────────

function renderRoster() {
  if (!mp) return;
  $('mpPlayers').textContent = '在座：' + mp.roster.map((r) => r.name + (r.host ? '（房主）' : '')).join('、');
}

function bindNet(net) {
  net.on('hello', (msg, conn) => {
    if (!net.isHost) return;
    conn._id = 'p' + mp.roster.length;
    mp.roster.push({ id: conn._id, name: msg.name });
    renderRoster();
    net.broadcast({ t: 'roster', roster: mp.roster, you: conn._id });
    try { conn.send({ t: 'roster', roster: mp.roster, you: conn._id }); } catch (err) { /* ignore */ }
  });
  net.on('roster', (msg) => {
    mp.roster = msg.roster;
    if (msg.you && !mp.myId) mp.myId = msg.you;
    renderRoster();
  });
  net.on('start', (msg) => beginNetGame(msg, mp.myId || 'me'));
  net.on('cmd', (msg) => {
    if (!G) return;
    const fx = runCmd(msg.cmd);
    if (fx) showFx(fx);
    if (msg.sum != null && checksum(G) !== msg.sum) {
      S.pushLog(G, '与房主的局面出现分歧，正在请求重新同步…', 'warn');
      mp.net.sendToHost({ t: 'desync' });
      UI.refreshAll(ui);
    }
    if (!mp.net.isHost) return;
    if (!G.winner && !S.isHuman(G, S.current(G))) advanceAiTurns();
  });
  net.on('desync', (msg, conn) => {
    if (!net.isHost) return;
    try { conn.send({ t: 'resync', save: Save.serialize(G) }); } catch (err) { /* ignore */ }
  });
  net.on('resync', (msg) => {
    const sc = ALL_SCENARIOS.find((x) => x.id === (msg.save.scenarioId || 'test'));
    G = Save.deserialize(msg.save, sc ? sc.map : TEST_MAP,
      (p2, id) => (HERO_ROSTER[p2] || []).find((h) => h.id === id),
      sc && sc.id !== 'test' ? sc : null);
    view.G = G; ui.G = G;
    R.invalidateTerrain(view);
    UI.refreshAll(ui);
    S.pushLog(G, '已与房主重新同步。', 'info');
  });
  net.on('hostLost', () => { alert('与房主的连接断开了。'); });
  net.on('peerLost', () => { if (mp) renderRoster(); });
}

function beginNetGame(setup, myId) {
  const sc = ALL_SCENARIOS.find((x) => x.id === setup.scenario) || pickedScenario;
  pickedScenario = sc;
  mp.seats = setup.seats;
  mp.myId = myId;
  const mine = Object.keys(setup.seats).find((f) => setup.seats[f] === myId);
  mp.myFaction = mine != null ? Number(mine) : sc.players[0];
  const humans = Object.keys(setup.seats).map(Number);
  start(S.newGame(sc.map, {
    seed: setup.seed,
    scenario: sc.id === 'test' ? null : sc,
    humans,
    fogMode: setup.fog,
    difficulty: setup.diff,
  }));
  S.pushLog(G, `联机开局：你执掌 ${FACTIONS[mp.myFaction].name}`, 'turn');
  UI.refreshAll(ui);
}

/** 按存档记录的地图与战役还原对局 */
function loadSlot(slot) {
  const data = Save.load(slot);
  if (!data) { alert('该槽位没有存档'); return; }
  const sc = data.scenarioId ? ALL_SCENARIOS.find((x) => x.id === data.scenarioId) : null;
  const mapDef = sc ? sc.map : TEST_MAP;
  if (sc) { pickedScenario = sc; pickedSide = (data.humans && data.humans[0]) || sc.players[0]; }
  else if (data.humans) pickedSide = data.humans[0];
  start(Save.deserialize(data, mapDef, (p2, id) => (HERO_ROSTER[p2] || []).find((h) => h.id === id), sc));
}

function initLobby() {
  showScreen('screenMode');

  const auto = Save.slotInfo('auto');
  if (auto) {
    $('modeResume').style.display = '';
    $('resumeInfo').textContent = `第 ${auto.turn} 回合 · ${new Date(auto.savedAt).toLocaleString('zh-CN')}`;
  }

  $('modeSolo').onclick = () => { mp = null; renderSetup(); showScreen('screenSetup'); };
  $('modeMp').onclick = () => showScreen('screenRoom');
  $('modeResume').onclick = () => loadSlot('auto');

  for (const b of document.querySelectorAll('[data-back]')) {
    b.onclick = () => {
      if (mp) { mp.net.close(); mp = null; }
      showScreen(b.dataset.back);
    };
  }

  $('mpHost').onclick = () => {
    const name = ($('mpName').value || '房主').slice(0, 8);
    const net = new Net();
    mp = { net, seats: {}, myFaction: null, myId: 'me', roster: [{ id: 'me', name, host: true }] };
    bindNet(net);
    $('mpStatus').textContent = '正在建立房间…';
    net.host(name, (code) => {
      mp.code = code;
      $('mpStatus').textContent = `房号 ${code} —— 把它发给同伴`;
      $('mpToSetup').style.display = '';
      renderRoster();
    }, (e) => { $('mpStatus').textContent = '建房失败：' + e; mp = null; });
  };

  $('mpJoin').onclick = () => {
    const name = ($('mpName').value || '客人').slice(0, 8);
    const code = ($('mpCode').value || '').trim();
    if (!code) { $('mpStatus').textContent = '请先填房号'; return; }
    const net = new Net();
    mp = { net, seats: {}, myFaction: null, myId: null, roster: [] };
    bindNet(net);
    $('mpStatus').textContent = '正在连接…';
    net.join(code, name, () => {
      $('mpStatus').textContent = '已连上房主，等待他选好战役开局…';
    }, (e) => { $('mpStatus').textContent = '连接失败：' + e; mp = null; });
  };

  $('mpToSetup').onclick = () => { renderSetup(); showScreen('screenSetup'); };

  $('newBtn').onclick = () => {
    wantTutorial = $('tutorCheck').checked;
    if (mp && mp.net.isHost) {
      // 给在座的每个人分一个势力，剩下的交给 AI
      const players = pickedScenario.players;
      const seats = {};
      mp.roster.forEach((r, i) => { if (i < players.length) seats[players[i]] = r.id; });
      const setup = {
        t: 'start', scenario: pickedScenario.id, seed: (Math.random() * 2 ** 31) | 0,
        fog: pickedFog, diff: pickedDiff, seats,
      };
      mp.net.broadcast(setup);
      beginNetGame(setup, 'me');
      return;
    }
    start(makeGame((Math.random() * 2 ** 31) | 0));
  };

  $('seedBtn').onclick = () => {
    const raw = prompt('输入种子（同一种子必定产生同一局）', '20260818');
    if (raw == null) return;
    wantTutorial = $('tutorCheck').checked;
    const seed = parseInt(raw, 10);
    start(makeGame(Number.isFinite(seed) ? seed : 20260818));
  };
}

function start(game) {
  G = game;
  showScreen(null);
  $('game').style.display = '';

  view = R.createView($('board'), G);
  view.viewer = myFaction();                 // 以「我」的视角看这张图
  ui = UI.createUI(G, view);
  ui.onChange = () => { if (!mp) Save.save(G, 'auto'); };
  ui.dispatch = (cmd) => {
    if (!isMyTurn()) return;                 // 不是我的回合就别动
    const fx = submit(cmd);
    if (fx) showFx(fx);
  };

  window.addEventListener('resize', () => { R.resize(view); UI.refreshAll(ui); });
  R.resize(view);

  bindBoard();
  bindChrome();
  focusOnMyCapital();
  UI.refreshAll(ui);

  const me = myFaction();
  UI.turnBanner(G, `第 ${G.turn} 回合 · ${FACTIONS[me].name}`,
    `金库 ${G.gold[me]}　收入 +${S.incomeOf(G, me)}　维护 −${S.upkeepOfPlayer(G, me)}`);

  if (wantTutorial || !tutorialSeen()) startTutorial(ui);

  // 若第一个行动的不是我（比如骤火之战安格班先手），先让 AI 走完再交还给我
  if (!S.isHuman(G, S.current(G))) {
    if (!mp || mp.net.isHost) advanceAiTurns();
  } else if (G.offer) {
    UI.heroOffer(ui);
  }
}

/** 把镜头对到「我」的都城，并选中那里的军团 */
function focusOnMyCapital() {
  const me = myFaction();
  const capital = G.cities.find((c) => c.owner === me && c.size === 'capital')
    || G.cities.find((c) => c.owner === me);
  if (!capital) return;
  R.centerOn(view, capital.x + 1, capital.y + 1);
  ui.selectedCity = capital;
  const at = S.cityAnchor(capital);
  const army = S.armyAt(G, at.x, at.y);
  if (army && army.owner === me) UI.selectArmy(ui, army);
}

// ── 地图输入 ──────────────────────────────────────────────

function bindBoard() {
  const cv = $('board');
  let dragging = false, moved = false, last = null;

  cv.addEventListener('pointerdown', (e) => {
    cv.setPointerCapture(e.pointerId);
    dragging = true; moved = false; last = { x: e.clientX, y: e.clientY };
  });
  cv.addEventListener('pointermove', (e) => {
    const r = cv.getBoundingClientRect();
    view.hover = R.screenToTile(view, e.clientX - r.left, e.clientY - r.top);
    if (dragging) {
      const dx = e.clientX - last.x, dy = e.clientY - last.y;
      if (Math.abs(dx) + Math.abs(dy) > 4) moved = true;
      view.cam.x -= dx; view.cam.y -= dy;
      last = { x: e.clientX, y: e.clientY };
      R.clampCam(view);
    }
    R.draw(view);
    R.drawMinimap($('minimap'), view);
  });
  cv.addEventListener('pointerup', (e) => {
    dragging = false;
    if (moved) return;
    const r = cv.getBoundingClientRect();
    onTileClick(R.screenToTile(view, e.clientX - r.left, e.clientY - r.top));
  });
  cv.addEventListener('pointerleave', () => { dragging = false; view.hover = null; R.draw(view); });

  // 触屏双指缩放（iPad 上没有滚轮）
  let pinchStart = 0, pinchTile = 0;
  const dist = (t) => Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY);
  cv.addEventListener('touchstart', (e) => {
    if (e.touches.length !== 2) return;
    dragging = false;
    pinchStart = dist(e.touches);
    pinchTile = view.tile;
  }, { passive: true });
  cv.addEventListener('touchmove', (e) => {
    if (e.touches.length !== 2 || !pinchStart) return;
    e.preventDefault();
    const ratio = dist(e.touches) / pinchStart;
    const want = pinchTile * ratio;
    // 吸附到最接近的缩放档
    let best = R.ZOOMS[0];
    for (const z of R.ZOOMS) if (Math.abs(z - want) < Math.abs(best - want)) best = z;
    if (best !== view.tile) {
      const r = cv.getBoundingClientRect();
      R.setZoom(view, best, {
        x: (e.touches[0].clientX + e.touches[1].clientX) / 2 - r.left,
        y: (e.touches[0].clientY + e.touches[1].clientY) / 2 - r.top,
      });
      R.draw(view);
      R.drawMinimap($('minimap'), view);
    }
  }, { passive: false });
  cv.addEventListener('touchend', () => { pinchStart = 0; }, { passive: true });

  cv.addEventListener('wheel', (e) => {
    e.preventDefault();
    const r = cv.getBoundingClientRect();
    const i = R.ZOOMS.indexOf(view.tile);
    const ni = Math.max(0, Math.min(R.ZOOMS.length - 1, i + (e.deltaY > 0 ? -1 : 1)));
    if (ni === i) return;
    R.setZoom(view, R.ZOOMS[ni], { x: e.clientX - r.left, y: e.clientY - r.top });
    R.draw(view);
    R.drawMinimap($('minimap'), view);
  }, { passive: false });

  $('minimap').addEventListener('pointerdown', (e) => {
    const mm = $('minimap');
    const r = mm.getBoundingClientRect();
    const geo = R.drawMinimap(mm, view);
    const x = ((e.clientX - r.left) * (mm.width / r.width) - geo.ox) / geo.px;
    const y = ((e.clientY - r.top) * (mm.height / r.height) - geo.oy) / geo.px;
    R.centerOn(view, x, y);
    UI.refreshAll(ui);
  });
}

async function onTileClick(t) {
  if (busy || !G || G.winner) return;
  if (t.x < 0 || t.y < 0 || t.x >= G.map.w || t.y >= G.map.h) return;

  ui.inspect = { x: t.x, y: t.y };   // 任意格子都能看信息
  const me = S.current(G);
  const army = ui.selectedArmy;

  // 已选中己方军团 → 先判断移动 / 进攻
  if (army && army.owner === me && G.armies.includes(army)) {
    const isTarget = (view.attackTargets || []).some((a) => a.x === t.x && a.y === t.y);
    if (isTarget) { await doAttack(army, t.x, t.y); return; }
    if (view.reach && view.reach.has(key(t.x, t.y))) {
      const path = pathTo(view.reach, army, t.x, t.y);
      if (path) { await doMove(army, path); return; }
    }
  }

  // 敌方军团也可点开查看（只读），己方的才会算可达域
  const here = S.armyAt(G, t.x, t.y);
  const city = S.cityAt(G, t.x, t.y);
  if (city) ui.selectedCity = city;
  UI.selectArmy(ui, here || null);
  UI.refreshAll(ui);
}

async function doMove(army, path) {
  busy = true;
  const all = ui.picked.size >= army.units.length;
  const fx = submit({ k: 'move', army: army.id, path, units: all ? null : [...ui.picked] });
  busy = false;
  if (!fx) return;                       // 联机：等指令回流
  afterMove(fx);
}

function afterMove(fx) {
  const still = G.armies.find((a) => a.id === fx.armyId);
  UI.selectArmy(ui, still && still.owner === myFaction() && isMyTurn() ? still : null);
  ui.onChange();
  if (S.checkVictory(G)) UI.victoryDialog(ui);
}

async function doAttack(army, tx, ty) {
  UI.battlePreview(ui, army, tx, ty, () => {
    const all = ui.picked.size >= army.units.length;
    const fx = submit({ k: 'attack', army: army.id, x: tx, y: ty, units: all ? null : [...ui.picked] });
    if (fx) showBattle(fx);              // 联机时等指令回流再播
  });
}

async function showBattle(fx) {
  busy = true;
  if (fx.res && fx.res.log && G.settings.animate) await playBattle(fx.res, fx.x, fx.y);
  busy = false;
  UI.refreshAll(ui);
  if (fx.res && fx.res.log) UI.battleReport(ui, fx.res, fx.place);
  UI.selectArmy(ui, null);
  ui.onChange();
  if (G.winner) UI.victoryDialog(ui);
}

// ── 顶栏与快捷键 ──────────────────────────────────────────

function bindChrome() {
  $('endTurn').onclick = doEndTurn;
  $('undoBtn').onclick = doUndo;
  $('statsBtn').onclick = () => UI.statsDialog(ui);
  $('histBtn').onclick = () => UI.battleHistory(ui);
  $('tutorBtn').onclick = () => startTutorial(ui);
  $('prodBtn').onclick = () => UI.productionOverview(ui);
  $('saveBtn').onclick = () => {
    const slot = prompt('存入哪个槽位？（s1 / s2 / s3）', 's1');
    if (!slot) return;
    Save.save(G, slot) ? alert(`已存入 ${slot}`) : alert('存档失败');
  };
  $('loadBtn').onclick = () => {
    const slot = prompt('读取哪个槽位？（auto / s1 / s2 / s3）', 's1');
    if (slot) loadSlot(slot);
  };
  $('soundBtn').onclick = () => {
    SFX.initSound();
    SFX.setSoundEnabled(!SFX.soundEnabled());
    $('soundBtn').textContent = SFX.soundEnabled() ? '音效：开' : '音效：关';
  };
  document.addEventListener('pointerdown', () => SFX.initSound(), { once: true });
  $('animBtn').onclick = () => {
    G.settings.animate = !G.settings.animate;
    $('animBtn').textContent = G.settings.animate ? '动画：开' : '动画：关';
  };
  $('orderBtn').onclick = () => {
    G.settings.attOrder = G.settings.attOrder === 'asc' ? 'desc' : 'asc';
    G.settings.defOrder = G.settings.attOrder;
    $('orderBtn').textContent = G.settings.attOrder === 'asc' ? '出战：弱者先' : '出战：强者先';
    UI.refreshAll(ui);
  };

  document.addEventListener('keydown', (e) => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return;
    if ((e.ctrlKey || e.metaKey) && (e.key === 'z' || e.key === 'Z')) { e.preventDefault(); doUndo(); return; }
    if (e.key === ' ') { e.preventDefault(); doEndTurn(); }
    else if (e.key === 'Tab') { e.preventDefault(); cycleIdle(); }
    else if (e.key === 'e' || e.key === 'E') UI.productionOverview(ui);
    else if (e.key === 'g' || e.key === 'G') UI.statsDialog(ui);
    else if (e.key === 'h' || e.key === 'H') UI.battleHistory(ui);
    else if (e.key === '+' || e.key === '=') zoomBy(1);
    else if (e.key === '-' || e.key === '_') zoomBy(-1);
  });
}

function zoomBy(d) {
  const i = R.ZOOMS.indexOf(view.tile);
  const ni = Math.max(0, Math.min(R.ZOOMS.length - 1, i + d));
  R.setZoom(view, R.ZOOMS[ni]);
  UI.refreshAll(ui);
}

function cycleIdle() {
  const me = S.current(G);
  const list = S.armiesOf(G, me).filter((a) => S.stackBudget(G, a) > 0);
  if (!list.length) return;
  const i = list.indexOf(ui.selectedArmy);
  const next = list[(i + 1) % list.length];
  R.centerOn(view, next.x, next.y);
  UI.selectArmy(ui, next);
}

// 结束回合：AI 各方自动走完，直接回到玩家，中央浮出回合提示
async function doEndTurn() {
  if (busy || !G || G.winner) return;
  if (mp && !isMyTurn()) return;                 // 联机：只有轮到你才能结束回合
  busy = true;
  UI.selectArmy(ui, null);
  ui.selectedCity = null;

  submit({ k: 'endturn' });
  if (mp) { busy = false; return; }              // 联机：后续由指令流推进

  await advanceAiTurns();
  busy = false;
  if (G.winner) {
    if (G.winner === myFaction()) SFX.sfxVictory(); else SFX.sfxDefeat();
    UI.victoryDialog(ui);
  }
  return;
  const me = S.current(G);
  const cap = G.cities.find((c) => c.owner === me && c.size === 'capital')
    || G.cities.find((c) => c.owner === me);
  if (cap) R.centerOn(view, cap.x + 1, cap.y + 1);
  const first = cap && S.armyAt(G, cap.x, cap.y);
  if (first && first.owner === me) UI.selectArmy(ui, first);
  UI.refreshAll(ui);
  Save.save(G, 'auto');

  if (G.winner) {
    if (G.winner === myFaction()) SFX.sfxVictory(); else SFX.sfxDefeat();
    UI.victoryDialog(ui);
    return;
  }
  const inc = S.incomeOf(G, me), up = S.upkeepOfPlayer(G, me);
  UI.turnBanner(G, `第 ${G.turn} 回合 · ${FACTIONS[me].name}`,
    `金库 ${G.gold[me]}　收入 +${inc}　维护 −${up}`);
  SFX.sfxTurn();
  if (G.offer) UI.heroOffer(ui);
}

// 地形被剧本改过没有？（骤火之战烧焦土、愤怒之战沉没都会改）
// 抽样即可，不必逐格比对。
function terrainSignature(G) {
  const t = G.map.tiles;
  let h = 2166136261;
  for (let i = 0; i < t.length; i += 61) {
    h ^= t[i].charCodeAt(0);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** 指令执行后的表现：遗迹结果、拾宝提示等 */
function showFx(fx) {
  if (!fx) return;
  if (fx.fx === 'feature' && fx.feature) UI.featureResult(ui, fx.res, fx.feature);
  if (fx.fx === 'battle') showBattle(fx);
  if (fx.fx === 'move') afterMove(fx);
  UI.refreshAll(ui);
}

/** 轮到 AI 就一路走完，直到回到某个人类玩家 */
async function advanceAiTurns() {
  let guard = 0;
  const wasMine = isMyTurn();
  while (!G.winner && !S.isHuman(G, S.current(G)) && guard++ < 24) {
    const p = S.current(G);
    UI.turnBanner(G, `${FACTIONS[p].name} 的回合`, '正在行动…');
    UI.refreshAll(ui);
    await delay(G.settings.animate ? 260 : 0);
    const before = terrainSignature(G);
    if (mp) {
      if (mp.net.isHost) mp.net.orderCmd({ k: 'ai', p }, () => checksum(G));
      else return;                                // 客户端等房主推进
    } else {
      applyCmd(G, { k: 'ai', p });
    }
    if (terrainSignature(G) !== before) R.invalidateTerrain(view);
    UI.refreshAll(ui);
    await delay(G.settings.animate ? 420 : 0);
    if (G.winner) break;
    if (mp) {
      if (mp.net.isHost) mp.net.orderCmd({ k: 'endturn', p }, () => checksum(G));
      else return;
    } else {
      applyCmd(G, { k: 'endturn', p });
    }
  }
  // 轮回自己：镜头与选中都回到我这边
  if (!wasMine && isMyTurn()) {
    focusOnMyCapital();
    const me = myFaction();
    UI.turnBanner(G, `第 ${G.turn} 回合 · ${FACTIONS[me].name}`,
      `金库 ${G.gold[me]}　收入 +${S.incomeOf(G, me)}　维护 −${S.upkeepOfPlayer(G, me)}`);
    SFX.sfxTurn();
    UI.refreshAll(ui);
    if (G.offer) UI.heroOffer(ui);
  }
}

/** 逐次决斗的画面表现：结果早已算完，这里只是把它演出来 */
async function playBattle(res, tx, ty) {
  const hpOf = (name) => {
    const def = Object.values(UNITS).find((u) => u.name === name);
    return def ? def.hp : 3;
  };
  for (const d of res.log) {
    const att = { type: guessType(d.att), hero: !UNITS_BY_NAME(d.att), hp: hpOf(d.att), maxHp: hpOf(d.att) };
    const def = { type: guessType(d.def), hero: !UNITS_BY_NAME(d.def), hp: hpOf(d.def), maxHp: hpOf(d.def) };
    view.battleFx = { x: tx, y: ty, att, def, step: 0, shake: false };
    R.draw(view);
    await delay(90);
    // 每一击：抖一下、熄一颗耐久点
    const loser = d.result === 'att' ? def : att;
    while (loser.hp > 0) {
      loser.hp--;
      view.battleFx.shake = true;
      view.battleFx.step += 0.7;
      SFX.sfxClash();
      R.draw(view);
      await delay(120);
      view.battleFx.shake = false;
      R.draw(view);
      await delay(70);
    }
    SFX.sfxKill();
    await delay(110);
  }
  view.battleFx = null;
  R.draw(view);
}

const UNITS_BY_NAME = (name) => Object.values(UNITS).find((u) => u.name === name);
const guessType = (name) => { const u = UNITS_BY_NAME(name); return u ? u.id : 'edain_militia'; };

function doUndo() {
  if (busy || !G || G.winner) return;
  if (mp && !isMyTurn()) return;
  if (!S.canUndo(G)) return;
  submit({ k: 'undo' });
  UI.selectArmy(ui, null);
  UI.refreshAll(ui);
  ui.onChange();
}

// 全局错误兜底：把异常写进日志面板，别让界面静默死掉
window.addEventListener('error', (e) => {
  console.error(e.error || e.message);
  const box = $('logPanel');
  if (box) {
    const n = document.createElement('div');
    n.className = 'log log-warn';
    n.textContent = `出错了：${e.message}`;
    box.appendChild(n);
  }
});

initLobby();

// ?screen=setup 直接进战役选择屏；?seed=12345&sc=xxx 直接开局
// （复现某一局、分享给别人、以及自动化验证都用得上）
const params = new URLSearchParams(location.search);
if (params.get('screen') === 'setup') { renderSetup(); showScreen('screenSetup'); }
const seedParam = params.get('seed');
if (seedParam !== null) {
  const scParam = params.get('sc');
  if (scParam) {
    const found = ALL_SCENARIOS.find((x) => x.id === scParam);
    if (found) { pickedScenario = found; pickedSide = found.players[0]; }
  }
  const seed = parseInt(seedParam, 10);
  start(makeGame(Number.isFinite(seed) ? seed : 20260817));
}
