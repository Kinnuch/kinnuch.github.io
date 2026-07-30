// EPT · UI：布阵/商店/拖拽/战斗回放（M1.5：实时蓝条、观战、装备拖拽、战斗中操作等）
import { Game } from './engine/game.js';
import { Combat, makeFighter } from './engine/combat.js';
import { makeRng } from './engine/rng.js';
import { applyAction } from './engine/actions.js';
import { Net } from './net.js';
import { buyCard, reroll, buyXp, sellUnit, placeUnit, unfieldUnit, allUnits, isFielded } from './engine/player.js';
import { RACES, CLASSES, UNITS, UNITS_BY_ID, unitStatsAtStar, XP_TO_LEVEL, SHOP_ODDS, affAtStar } from '../data/units.js';
import { countTraits, TRAITS, FLAGGER_BONUS } from '../data/traits.js';
import { canCombine, makeCombinedItem, makeComponentItem, COMPONENTS, COMBO_NAMES, comboKey, CONSUMABLES } from '../data/items.js';

const CELL_W = 70, ROW_H = 58, COLS = 7, ROWS = 8;
const COST_COLOR = { 1: 'var(--c1)', 2: 'var(--c2)', 3: 'var(--c3)', 4: 'var(--c4)', 5: 'var(--c5)' };
const CLASS_ICON = { warrior: '⚔️', trickshot: '🏹', flagger: '🚩', arcanist: '✨', hunter: '🐾', killer: '🗡️', forger: '🔨', adventurer: '🧭', ranger: '🌿', executor: '💥', chivalry: '🛡️', indulger: '🌀' };
const RACE_COLOR = {
  noldor: '#c8b273', gondolin: '#9fb8c8', mordor: '#6b3434', angband: '#4a3455', hobbit: '#7a9a5a',
  dwarf: '#a07540', rohirrim: '#b09468', dunedain: '#5a708a', hador: '#8a8a99', mankind: '#8a8a99',
  sinda: '#78a890', maia: '#b8a0c8', vala: '#d8c890', wood: '#6a8a5a', dog: '#a89078',
};
const DMG_COLOR = { phys: 'var(--dmg-phys)', light: 'var(--dmg-light)', dark: 'var(--dmg-dark)', true: 'var(--dmg-true)', pure: 'var(--dmg-true)' };
const TIER_CLASS = ['', 'tier-bronze', 'tier-silver', 'tier-gold', 'tier-prisma', 'tier-prisma', 'tier-prisma'];

let game = null, selectedItem = null, planTimer = null, planLeft = 0;
let playback = null, drag = null, tooltipPinned = false, pinnedLive = null, audioCtx = null;
let shiftDown = false, lastTipFn = null, lastTipPost = null;
const shiftHint = () => shiftDown ? '' : '<div class="tt-shift">按住 ⇧Shift 查看详情</div>';

const $ = id => document.getElementById(id);

// 装备图标（M4）：game-icons.net SVG（CC BY 3.0），CSS mask 上色随主题
const GI = k => `<span class="gi gi-${k}"></span>`;
const COMP_ICON = Object.fromEntries(['ad1', 'ad2', 'as1', 'as2', 'ap1', 'ap2', 'm1', 'm2', 'a1', 'a2', 'mr1', 'mr2', 'hp1', 'hp2', 'hs1', 'hs2', 'csc1', 'csc2', 'al'].map(k => [k, GI(k)]));
const CONS_ICON = Object.fromEntries(['smallDup', 'bigDup', 'jobBook', 'dice', 'silmaril', 'remover', 'reforger', 'upgrader'].map(k => [k, GI(k)]));
function itemIcon(it) {
  if (it.kind === 'component') return COMP_ICON[it.comp] || '';
  if (it.kind === 'light') return GI('light');
  if (it.kind === 'artifact') return GI('silmaril');
  if (it.kind === 'consumable') return CONS_ICON[it.type] || '🎁';
  if (it.comps) return (COMP_ICON[it.comps[0]] || '') + (COMP_ICON[it.comps[1]] || '');
  return '🔸';
}
// ---------- 段位系统 ----------
const TIERS = ['黑铁', '黄铜', '白银', '黄金', '秘银', '加尔沃恩', '提卡尔', '熙利玛'];
const SUBS = ['Ⅴ', 'Ⅳ', 'Ⅲ', 'Ⅱ', 'Ⅰ'];
const PLACE_PTS = [30, 20, 10, 5, -5, -10, -20, -30];
const ALL_NAMES = ['你', '埃尔隆德', '瑟兰督伊', '凯勒博恩', '巴德', '丹恩', '埃奥梅尔', '铁蹄'];
function ladder() { try { return JSON.parse(localStorage.getItem('ept-ladder') || '{}'); } catch { return {}; } }
function rankOf(s) {
  const st = Math.floor(s / 100);
  if (st >= 35) return `熙利玛（${s - 3500}分）`;
  return TIERS[Math.floor(st / 5)] + SUBS[st % 5];
}
function rankShort(s) {
  const st = Math.floor(s / 100);
  return st >= 35 ? '熙利玛' : TIERS[Math.floor(st / 5)] + SUBS[st % 5];
}
function applyLadder() { // 结算积分（含段位修正：b×(0.5+0.5e^(-0.03c²))）
  const l = ladder();
  const subs = game.players.map(pl => Math.floor((l[pl.name] || 0) / 100));
  const avg = subs.reduce((a, b) => a + b, 0) / game.players.length;
  const res = {};
  game.players.forEach((pl, i) => {
    const base = PLACE_PTS[(pl.placement || 8) - 1];
    const c = subs[i] - avg;
    const delta = Math.round(base * (0.5 + 0.5 * Math.exp(-0.03 * c * c)));
    const oldS = l[pl.name] || 0;
    l[pl.name] = Math.max(0, oldS + delta);
    res[pl.name] = { delta, oldS, newS: l[pl.name] };
  });
  localStorage.setItem('ept-ladder', JSON.stringify(l));
  return res;
}
// ---------- 伤害统计 ----------
let dmgOpen = typeof localStorage !== 'undefined' && localStorage.getItem('ept-dmg') === '1';
const dmgSecOpen = { dealt: true, taken: false, heal: false };
let lastAcc = null, lastNodes = null;
function renderDmgPanel() {
  $('dmgPanel').classList.toggle('open', dmgOpen);
  $('dmgToggle').style.borderColor = dmgOpen ? 'var(--accent)' : '';
  if (!dmgOpen) return;
  const acc = (playback && playback.acc) || lastAcc;
  const nodes = (playback && playback.nodes) || lastNodes;
  const box = $('dmgSections');
  if (!acc || !nodes) { box.innerHTML = '<div class="tt-sub">进入战斗后开始统计</div>'; return; }
  const SECS = [['dealt', '⚔ 造成伤害', 'var(--dmg-phys)'], ['taken', '🛡 承受伤害', '#ef5350'], ['heal', '💚 治疗量', 'var(--heal)']];
  let html = '';
  for (const [key, label, color] of SECS) {
    const rows = Object.entries(acc[key])
      .map(([id, v]) => ({ n: nodes[id], v }))
      .filter(x => x.n && !x.n.enemy && !x.n.def.monster)
      .sort((a, b) => b.v - a.v);
    const max = rows[0]?.v || 1;
    html += `<div class="dmg-sec-h" data-sec="${key}"><span>${label}</span><span>${dmgSecOpen[key] ? '▾' : '▸'}</span></div>`;
    if (dmgSecOpen[key]) {
      html += rows.map(x => `<div class="dmg-row"><div class="barfill" style="width:${x.v / max * 100}%;background:${color}"></div><span>${x.n.def.name}${'★'.repeat(x.n.star || 0)}</span><span>${Math.round(x.v)}</span></div>`).join('')
        || '<div class="tt-sub" style="font-size:11px;padding:2px 5px">暂无</div>';
    }
  }
  box.innerHTML = html;
  box.querySelectorAll('.dmg-sec-h').forEach(h => h.onclick = () => { dmgSecOpen[h.dataset.sec] = !dmgSecOpen[h.dataset.sec]; renderDmgPanel(); });
}
// ---------- 暂停 & 新手指引 ----------
let paused = false, tutEnabled = false, tutShown = {};
function setPaused(v) {
  paused = v;
  $('pauseBtn').textContent = paused ? '▶ 继续' : '⏸ 暂停';
  $('pauseBtn').style.background = paused ? 'var(--accent)' : '';
  $('pauseBtn').style.color = paused ? '#fff8e8' : '';
}
const TUT_STEPS = {
  welcome: ['欢迎来到中土自走棋', '目标：活到最后。每回合你会获得金币收入（含利息与连胜奖励）。用金币在下方<b>商店</b>购买棋子、<b>刷新</b>商店（2金币）或<b>购买经验</b>升级（4金币）。等级决定能上场的棋子数量和商店刷出高费卡的概率。'],
  board: ['布阵', '把备战席的棋子<b>拖拽</b>到棋盘下半区上场（上限=你的等级）。近战放前排、远程放后排。拖起棋子时商店会变成红色出售区，拖进去即可卖出。'],
  items: ['装备', '野怪回合会掉落<b>散件</b>。把散件拖到棋子身上穿戴；两件散件（拖到一起）可以合成强力<b>成装</b>。右键散件可以查看全部合成配方。金色边框的是稀有的光明装。'],
  traits: ['羁绊', '右侧面板显示你场上的<b>羁绊</b>：同种族/职业的独特棋子达到一定数量时激活强力加成（铜→银→金→彩代表档位深度）。悬浮任意羁绊可以看到详细数值和棋子清单。'],
  combat: ['战斗', '战斗自动进行。可以用 <b>▶倍速</b> 和 <b>⏭跳过</b> 控制回放；左键悬浮棋子看实时血蓝，<b>右键</b>棋子固定完整面板（实时属性、装备、技能数值）。战斗中仍可购买棋子、刷新商店、调整备战席。'],
  pvp: ['玩家对战', '从第二阶段起将与其他玩家对战。<b>输掉</b>会按阶段和对方存活棋子扣除你的生命值，归零即淘汰。连胜或连败都有额外金币；每 10 金币每回合产 1 利息（至多5）——存钱也是战略。点击左侧玩家可以侦查他们的阵容。'],
  starup: ['三合一升星', '集齐 3 张相同棋子自动合成升星（3张1星→2星，9张→3星）：生命×1.8、主属性大幅提升。升星是中后期战力的核心来源。'],
  consumable: ['消耗道具', '你获得了<b>消耗道具</b>（虚线边框）：点击选中后再点击目标棋子使用（复制器/纹章/骰子/精灵宝钻），重铸器和升级器则是选中后点击目标<b>装备</b>。'],
  carousel: ['共享选秀', '选秀时 9 个<b>自带散件的棋子</b>供 8 名玩家轮流挑选：<b>血量低的玩家先放行</b>（首轮随机顺序）。轮到你时卡片会亮起，点击即可拿走；不选的话超时会自动补选。'],
};
function maybeTut(tag) {
  if (!tutEnabled || tutShown[tag] || !TUT_STEPS[tag]) return;
  tutShown[tag] = true;
  const [title, body] = TUT_STEPS[tag];
  $('tutTitle').textContent = '🎓 ' + title;
  $('tutBody').innerHTML = body;
  $('tutModal').style.display = 'flex';
  setPaused(true);
}

function bell(freq = 880) {
  try {
    audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
    const o = audioCtx.createOscillator(), g = audioCtx.createGain();
    o.type = 'sine'; o.frequency.value = freq;
    g.gain.setValueAtTime(0.18, audioCtx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.5);
    o.connect(g); g.connect(audioCtx.destination);
    o.start(); o.stop(audioCtx.currentTime + 0.5);
  } catch (e) { /* 无声环境忽略 */ }
}
function showCount(n) {
  const el = $('countNum');
  el.textContent = n;
  el.classList.remove('tick'); void el.offsetWidth; el.classList.add('tick');
}
function applyView() {
  $('board').classList.toggle('tilt', localStorage.getItem('ept-view') !== '2d');
}

export function initUI() {
  $('startSolo').onclick = () => {
    online = false; myIndex = 0;
    $('lobby').style.display = 'none';
    $('game').style.display = 'block';
    startGame((Math.random() * 0xFFFFFFFF) >>> 0);
  };
  // ---- 多人联机大厅 ----
  $('mpName').value = localStorage.getItem('ept-name') || '';
  $('mpToggle').onclick = () => { $('mpBox').style.display = $('mpBox').style.display === 'none' ? 'block' : 'none'; };
  $('mpHost').onclick = () => {
    const name = mpName();
    if (!name) return;
    initNet();
    $('mpStatus').textContent = '正在创建房间…';
    net.host(name, code => {
      $('mpStatus').innerHTML = `房号：<b style="color:var(--accent);font-size:16px;user-select:all">${code}</b>（发给好友加入）`;
      $('mpStart').style.display = '';
      refreshLobbyUI();
    }, err => { $('mpStatus').textContent = '创建失败：' + err + '（信令服务器不可达？）'; });
  };
  $('mpJoin').onclick = () => {
    const name = mpName();
    const code = $('mpCode').value.trim().toLowerCase();
    if (!name || !code) return;
    initNet();
    $('mpStatus').textContent = '正在连接 ' + code + ' …';
    net.join(code, name, () => { $('mpStatus').textContent = '已加入房间，等待房主开始…'; },
      err => { $('mpStatus').textContent = '加入失败：' + err; });
  };
  $('mpStart').onclick = () => {
    if (!net || !net.isHost) return;
    const roster = [{ name: net.myName, isAI: false }];
    net.conns.forEach((c, i) => { c._pi = i + 1; roster.push({ name: c._name || ('玩家' + (i + 2)), isAI: false }); });
    const AI_POOL = ['埃尔隆德', '瑟兰督伊', '凯勒博恩', '巴德', '丹恩', '埃奥梅尔', '铁蹄'];
    let ai = 0;
    while (roster.length < 8) roster.push({ name: AI_POOL[ai++ % 7], isAI: true });
    const seed = (Math.random() * 0xFFFFFFFF) >>> 0;
    net.conns.forEach(c => c.send({ t: 'start', seed, roster, youIdx: c._pi }));
    startOnline(seed, roster, 0);
  };
  $('pauseBtn').onclick = () => setPaused(!paused);
  $('tutOk').onclick = () => { $('tutModal').style.display = 'none'; setPaused(false); };
  $('dmgToggle').onclick = () => { dmgOpen = !dmgOpen; localStorage.setItem('ept-dmg', dmgOpen ? '1' : '0'); renderDmgPanel(); };
  $('ladderBtn').onclick = () => {
    const l = ladder();
    const myNick = localStorage.getItem('ept-name') || '';
    const names = [...new Set([...ALL_NAMES, ...Object.keys(l)])];
    const rows = names.map(n => ({ n, s: l[n] || 0 })).sort((a, b) => b.s - a.s)
      .map((x, i) => `<div class="lad-row${x.n === '你' || (myNick && x.n === myNick) ? ' me' : ''}"><span class="lad-no">${i + 1}.</span><span class="lad-name">${x.n}</span><span class="lad-rank">${rankOf(x.s)}</span><span class="lad-score"><b>${x.s}</b> 分</span></div>`).join('');
    $('scoutModal').innerHTML = `<div id="scoutBox" style="min-width:380px"><h3>🏆 排行榜</h3>
      <div class="tt-sub" style="margin-bottom:8px">名次积分：+30/+20/+10/+5/−5/−10/−20/−30（含段位修正）；每100分一个小段位，段位序列：黑铁→黄铜→白银→黄金→秘银→加尔沃恩→提卡尔→熙利玛</div>
      ${rows}<div class="tt-sub" style="margin-top:8px">点击空白处关闭</div></div>`;
    $('scoutModal').style.display = 'flex';
  };
  // 快捷键：D 刷新 / F 买经验
  document.addEventListener('keydown', e => {
    if (!game || game.over || e.ctrlKey || e.metaKey || e.repeat && e.key.toLowerCase() === 'f') return;
    const k = e.key.toLowerCase();
    if (k === 'd') dispatch({ k: 'reroll' });
    if (k === 'f') dispatch({ k: 'xp' });
  });
  $('startBtn').onclick = () => { if (game && game.phase === 'planning' && (!online || net.isHost)) requestCombat(); };
  $('speedBtn').onclick = () => {
    if (!playback) return;
    playback.speed = playback.speed >= 4 ? 1 : playback.speed * 2;
    localStorage.setItem('ept-speed', playback.speed);
    $('speedBtn').textContent = '▶ ' + playback.speed + 'x';
  };
  $('skipBtn').onclick = () => { if (playback) playback.skip = true; };
  $('rerollBtn').onclick = () => dispatch({ k: 'reroll' });
  $('xpBtn').onclick = () => dispatch({ k: 'xp' });
  $('lockBtn').onclick = () => dispatch({ k: 'lock' });
  $('againBtn').onclick = () => { online = false; myIndex = 0; $('overScreen').style.display = 'none'; $('game').style.display = 'block'; startGame((Math.random() * 0xFFFFFFFF) >>> 0); };
  $('menuBtn').onclick = () => {
    clearInterval(planTimer); clearInterval(carTimer);
    if (net) { net.close(); net = null; }
    online = false; myIndex = 0; game = null;
    $('overScreen').style.display = 'none';
    $('game').style.display = 'none';
    $('mpStatus').textContent = ''; $('mpPlayers').textContent = ''; $('mpStart').style.display = 'none';
    $('lobby').style.display = 'block';
  };
  $('scoutModal').onclick = e => { if (e.target === $('scoutModal')) $('scoutModal').style.display = 'none'; };
  $('goldBig').onpointerenter = e => { if (game && !tooltipPinned) showTooltip(goldTooltip, e); };
  // 悬浮面板：鼠标进入面板不消失，离开后延迟关闭
  $('tooltip').onpointerenter = () => cancelTipHide();
  $('tooltip').onpointerleave = () => scheduleTipHide();
  $('goldBig').onpointerleave = () => hideTooltip();
  $('viewBtn').onclick = () => {
    localStorage.setItem('ept-view', localStorage.getItem('ept-view') === '2d' ? '25d' : '2d');
    applyView();
  };
  applyView();
  // 滚轮缩放棋盘
  let zoom = parseFloat(localStorage.getItem('ept-zoom')) || 1;
  $('board').style.setProperty('--zoom', zoom);
  $('boardWrap').addEventListener('wheel', e => {
    e.preventDefault();
    zoom = Math.min(1.6, Math.max(0.55, zoom - Math.sign(e.deltaY) * 0.08));
    zoom = Math.round(zoom * 100) / 100;
    localStorage.setItem('ept-zoom', zoom);
    $('board').style.setProperty('--zoom', zoom);
  }, { passive: false });
  document.addEventListener('pointermove', e => { moveTooltip(e); dragMove(e); });
  document.addEventListener('pointerup', dragEnd);
  document.addEventListener('pointerdown', e => {
    if (tooltipPinned && !$('tooltip').contains(e.target)) { tooltipPinned = false; hideTooltip(true); }
  });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') { tooltipPinned = false; hideTooltip(true); $('scoutModal').style.display = 'none'; }
    if (e.key === 'Shift' && !shiftDown) { shiftDown = true; refreshTip(); }
  });
  document.addEventListener('keyup', e => { if (e.key === 'Shift') { shiftDown = false; refreshTip(); } });
  buildBoardCells();
  // 开发用：?auto=1 自动开局，?seed=N 固定种子，?fight=1 自动开战
  const q = new URLSearchParams(location.search);
  if (q.get('auto')) {
    $('lobby').style.display = 'none';
    $('game').style.display = 'block';
    startGame(q.get('seed') ? +q.get('seed') : (Math.random() * 0xFFFFFFFF) >>> 0);
    if (q.get('fight')) setTimeout(() => { if (game.phase === 'planning') requestCombat(); }, 800);
  }
}

let myIndex = 0, online = false, net = null;
let pendingResolve = false, playbackDone = false, resolveSent = false;
function me() { return game.players[myIndex]; }
function planOk() { return game && game.phase === 'planning'; }
function actOk() { return game && !game.over && me().alive; } // 买卖/刷新/经验：战斗中也允许

// 所有玩家操作的统一出口：单机立即应用；联机发给房主定序
function dispatch(a) {
  if (!actOk()) return false;
  if (!online) {
    const r = applyAction(game, myIndex, a);
    if (typeof r === 'string') banner(r);
    renderAll();
    return r;
  }
  if (net.isHost) net.orderAction(myIndex, a);
  else net.sendAction(a);
  return true;
}

// 联机：按房主定序应用操作流
function onStreamItem(pi, a) {
  if (!game) return;
  if (a.k === 'combat') { beginCombatLocal(); return; }
  if (a.k === 'resolve') { onResolveStream(); return; }
  if (a.k === 'carWave') { game.carouselRelease(); carLeft = CAR_WAVE_SEC; carPhase = 'waves'; carWaves++; if (myReleased()) bell(988); renderCarousel(); return; }
  if (a.k === 'carEnd') { finishCarousel(); return; }
  const r = applyAction(game, pi, a);
  if (pi === myIndex && typeof r === 'string') banner(r);
  if (game.carousel) renderCarousel();
  renderAll();
}

function mpName() {
  const n = $('mpName').value.trim().slice(0, 8);
  if (!n) { $('mpStatus').textContent = '请先填写昵称'; return ''; }
  localStorage.setItem('ept-name', n);
  return n;
}
function initNet() {
  if (net) net.close();
  net = new Net();
  net.on('hello', (msg, conn) => { // 房主：新玩家加入
    let nm = (msg.name || '玩家').slice(0, 8);
    const used = [net.myName, ...net.conns.map(c => c._name)].filter(Boolean);
    while (used.includes(nm)) nm += '·';
    conn._name = nm;
    refreshLobbyUI();
    net.broadcast({ t: 'lobby', names: [net.myName, ...net.conns.map(c => c._name)] });
  });
  net.on('lobby', msg => { $('mpPlayers').textContent = '房间成员：' + msg.names.join('、'); });
  net.on('start', msg => startOnline(msg.seed, msg.roster, msg.youIdx));
  net.on('streamItem', m => onStreamItem(m.pi, m.a));
  net.on('peerLost', ({ conn }) => {
    if (!game) { refreshLobbyUI(); return; }
    if (net.isHost && conn && conn._pi !== undefined) net.orderAction(conn._pi, { k: 'aiify' });
  });
  net.on('hostLost', () => { banner('⚠ 房主已断线，对局中止'); clearInterval(planTimer); clearInterval(carTimer); });
}
function refreshLobbyUI() {
  if (!net || !net.isHost) return;
  const names = [net.myName, ...net.conns.map(c => c._name).filter(Boolean)];
  $('mpPlayers').textContent = `房间成员（${names.length}/8）：` + names.join('、');
}
function startOnline(seed, roster, youIdx) {
  online = true;
  myIndex = youIdx;
  $('lobby').style.display = 'none';
  $('game').style.display = 'block';
  $('pauseBtn').style.display = 'none'; // 联机无暂停
  game = new Game(seed, '', { roster });
  selectedItem = null;
  tutEnabled = false;
  tutShown = {};
  lastLevel = 0;
  paused = false;
  renderAll();
  if (game.carousel) showCarousel();
  else startPlanTimer();
}
function startGame(seed) {
  game = new Game(seed, '你');
  selectedItem = null;
  tutEnabled = $('tutCheck').checked;
  tutShown = {};
  lastLevel = 0;
  $('pauseBtn').style.display = '';
  setPaused(false);
  renderAll();
  maybeTut('welcome');
  if (game.carousel) showCarousel();
  else startPlanTimer();
}

// ---------- 共享选秀 ----------
const CAR_WAVE_SEC = 6, CAR_OBSERVE_SEC = 5;
let carTimer = null, carWaves = 0, carLeft = 0, carPhase = 'observe', carEndSent = false;
function showCarousel() {
  maybeTut('carousel');
  // 入场演出 2 秒：前往选秀会场
  const ib = $('introBanner');
  ib.querySelector('.it-main').textContent = '🎠 正在前往选秀会场…';
  ib.querySelector('.it-sub').textContent = '9 个自带散件的棋子等待挑选';
  ib.classList.remove('show'); void ib.offsetWidth; ib.classList.add('show');
  const bw = $('boardWrap');
  bw.classList.remove('fly-in'); void bw.offsetWidth; bw.classList.add('fly-in');
  bell(698);
  setTimeout(() => {
    ib.classList.remove('show'); bw.classList.remove('fly-in');
    carPhase = 'observe'; carLeft = CAR_OBSERVE_SEC; carWaves = 0; carEndSent = false;
    renderCarousel();
    $('carModal').style.display = 'flex';
    clearInterval(carTimer);
    carTimer = setInterval(carTick, 1000);
  }, 2000);
}
function carTick() {
  if (paused && !online) return;
  const c = game.carousel;
  if (!c || c.done) {
    if (!online) { finishCarousel(); return; }
    if (net.isHost && !carEndSent) { carEndSent = true; net.orderAction(myIndex, { k: 'carEnd' }); }
    return;
  }
  carLeft--;
  if (carLeft <= 0) {
    if (online) {
      if (net.isHost) {
        const maxW = Math.ceil(c.order.length / 2);
        if (carPhase === 'waves' && carWaves >= maxW) {
          if (!carEndSent) { carEndSent = true; net.orderAction(myIndex, { k: 'carEnd' }); }
        } else net.orderAction(myIndex, { k: 'carWave' }); // 流回来时统一推进
      }
      carLeft = 1; // 客户端/等待流期间防负数
    } else if (carPhase === 'observe') {
      carPhase = 'waves'; carWaves = 1;
      game.carouselRelease();
      carLeft = CAR_WAVE_SEC;
      if (myReleased()) bell(988);
    } else {
      const maxW = Math.ceil(c.order.length / 2);
      if (carWaves >= maxW) { finishCarousel(); return; }
      carWaves++;
      const before = myReleased();
      game.carouselRelease();
      carLeft = CAR_WAVE_SEC;
      if (!before && myReleased()) bell(988); // 轮到你了
    }
  }
  renderCarousel();
}
function myReleased() {
  const c = game.carousel;
  if (!c) return false;
  const myPos = c.order.indexOf(myIndex);
  return myPos >= 0 && myPos < c.released && !c.offers.some(o => o.takenBy === myIndex);
}
function finishCarousel() {
  clearInterval(carTimer);
  if (game.carousel) game.carouselFinish();
  $('carModal').style.display = 'none';
  renderAll();
  startPlanTimer();
}
function renderCarousel() {
  const c = game.carousel;
  if (!c) { finishCarousel(); return; }
  const myPos = c.order.indexOf(myIndex);
  const picked = c.offers.some(o => o.takenBy === myIndex);
  const myTurn = myPos >= 0 && myPos < c.released && !picked;
  // 顺位条：✓已选 / 高亮=选择中 / 灰=等待
  const seats = c.order.map((pi, k) => {
    const p = game.players[pi];
    const done = c.offers.some(o => o.takenBy === pi);
    const cls = done ? ' done' : k < c.released ? ' now' : '';
    return `<span class="car-seat${cls}${pi === myIndex ? ' mine' : ''}">${k + 1}.${p.name}${done ? '✓' : ''}</span>`;
  }).join('');
  // 状态行与倒计时
  let status;
  if (carPhase === 'observe') status = `<b style="color:var(--accent2)">👀 观察阶段：${carLeft} 秒后开始放行，看看都有些什么弈子</b>`;
  else if (picked) status = '你已选择，等待其他玩家…';
  else if (myTurn) status = `<b style="color:var(--accent)">轮到你了！点击卡片选择</b>`;
  else {
    const myWave = Math.floor(myPos / 2);
    const secs = (myWave - (carWaves - 1) - 1) * CAR_WAVE_SEC + carLeft;
    status = secs <= CAR_WAVE_SEC
      ? `<b style="color:var(--accent2)">⏳ ${secs} 秒后轮到你，想好要拿哪个！</b>`
      : `你的顺位：第 ${myPos + 1}（约 ${secs} 秒后放行）`;
  }
  const headNote = carPhase === 'observe' ? `观察中 ${carLeft}s` : `每 ${CAR_WAVE_SEC} 秒放行 2 人 · 下一批 ${carLeft}s`;
  let html = `<div id="carBox"><h3>🎠 共享选秀 <span class="tt-sub" style="font-weight:normal">${headNote}</span></h3>
    <div id="carSeats">${seats}</div>
    <div class="tt-sub" style="margin-top:4px">${status}</div>
    <div id="carGrid">`;
  c.offers.forEach((o, i) => {
    const def = UNITS_BY_ID[o.defId];
    const taker = o.takenBy !== null ? game.players[o.takenBy].name : '';
    html += `<div class="car-offer${o.takenBy !== null ? ' taken' : myTurn ? ' pickable' : ''}" data-i="${i}" style="border-color:${COST_COLOR[def.cost]}">
      <div class="sc-name">${CLASS_ICON[def.classes[0]] || ''} ${def.name}</div>
      <div class="sc-traits">${def.cost}费 · ${COMP_ICON[o.comp] || ''} ${COMPONENTS[o.comp].name}</div>
      ${taker ? `<div class="car-taker">${taker} ✓</div>` : ''}</div>`;
  });
  html += `</div></div>`;
  $('carModal').innerHTML = html;
  if (myTurn) $('carModal').querySelectorAll('.car-offer.pickable').forEach(el => {
    el.onclick = () => { dispatch({ k: 'carPick', idx: +el.dataset.i }); renderCarousel(); renderAll(); };
  });
  // 悬浮预览棋子技能/羁绊；散件行单独悬浮看装备详情
  $('carModal').querySelectorAll('.car-offer').forEach(el => {
    const o = c.offers[+el.dataset.i];
    if (!o) return;
    const def = UNITS_BY_ID[o.defId];
    el.onpointerenter = ev => {
      if (!tooltipPinned) showTooltip(() => unitDefTooltip(def, 1) +
        `<div style="margin-top:4px">携带：${COMP_ICON[o.comp] || ''} ${COMPONENTS[o.comp].name}（选中后自动放入物品栏）</div>`, ev);
    };
    el.onpointerleave = () => { hideTooltip(); hideTooltip2(); };
    const compEl = el.querySelector('.sc-traits');
    if (compEl) {
      compEl.onpointerenter = ev => { ev.stopPropagation(); showTooltip2At(itemTooltip(makeComponentItem(o.comp)), ev.clientX + 14, ev.clientY + 10); };
      compEl.onpointerleave = () => hideTooltip2();
    }
  });
}

// ---------- 计时 ----------
function startPlanTimer() {
  clearInterval(planTimer);
  planLeft = 45;
  $('timer').textContent = planLeft + 's';
  planTimer = setInterval(() => {
    if (paused) return;
    planLeft--;
    $('timer').textContent = planLeft + 's';
    if (planLeft > 0 && planLeft <= 5) { bell(planLeft === 1 ? 660 : 880); showCount(planLeft); }
    if (planLeft <= 0) {
      clearInterval(planTimer);
      if (online && !net.isHost) { $('timer').textContent = '…'; return; } // 等待房主指令
      if (planOk()) requestCombat();
    }
  }, 1000);
}
function requestCombat() {
  if (!planOk() || game.carousel) return;
  if (!online) { beginCombatLocal(); return; }
  if (net.isHost) net.orderAction(myIndex, { k: 'combat' });
}

// ---------- 渲染 ----------
let lastLevel = 0;
function renderAll() {
  renderTopbar(); renderPlayers(); renderBoardUnits(); renderBench(); renderItems(); renderShop(); renderTraits(); renderLog(); renderGold(); renderOdds();
  playMergeFx();
  // 升级特效
  const lv = me().level;
  if (lastLevel && lv > lastLevel) {
    banner(`⬆ 升级！等级 ${lv} — 可上场 ${lv} 名棋子`);
    bell(1046); setTimeout(() => bell(1318), 140);
    const btn = $('xpBtn');
    btn.classList.remove('level-flash'); void btn.offsetWidth; btn.classList.add('level-flash');
    const bw = $('boardWrap');
    bw.classList.remove('level-glow'); void bw.offsetWidth; bw.classList.add('level-glow');
  }
  lastLevel = lv;
}
function playMergeFx() {
  if (!game.mergeFx || !game.mergeFx.length) return;
  const list = game.mergeFx;
  game.mergeFx = [];
  let played = false;
  for (const uid of list) {
    const el = document.querySelector(`[data-uid="${uid}"]`);
    if (!el) continue;
    played = true;
    el.classList.add('star-up');
    const ring = document.createElement('div'); ring.className = 'star-fx';
    const txt = document.createElement('div'); txt.className = 'star-txt'; txt.textContent = '★ 升星！';
    el.appendChild(ring); el.appendChild(txt);
    setTimeout(() => { el.classList.remove('star-up'); ring.remove(); txt.remove(); }, 1100);
  }
  if (played) { bell(1318); maybeTut('starup'); }
}

function renderTopbar() {
  const p = me(), r = game.roundInfo();
  if (r.type === 'pvp' && game.phase === 'planning') maybeTut('pvp');
  $('roundLabel').textContent = r.label + (r.type === 'pve' ? ' 野怪' : ' 对战');
  $('phaseInfo').textContent = game.phase === 'planning' ? '备战阶段' : '战斗中';
  $('hpStat').innerHTML = `生命 <b>${Math.max(0, p.hp)}</b>`;
  const st = p.streakW > 0 ? `连胜${p.streakW}` : p.streakL > 0 ? `连败${p.streakL}` : '—';
  $('streakStat').innerHTML = `战绩 <b>${st}</b>`;
  $('startBtn').style.display = game.phase === 'planning' && (!online || (net && net.isHost)) ? '' : 'none';
}

function renderGold() {
  const p = me();
  $('goldBig').innerHTML = `🪙 <b>${p.gold}</b>`;
  const need = p.level >= 10 ? 'MAX' : `${p.xp}/${XP_TO_LEVEL[p.level + 1]}`;
  $('xpBtn').innerHTML = `📖 经验 4🪙<br><span style="font-size:11px;color:var(--sub)">Lv${p.level} (${need})</span>`;
}
function goldTooltip() {
  const p = me();
  const interest = Math.min(Math.floor(p.gold / 10), 5);
  const streak = Math.max(p.streakW, p.streakL);
  const sb = streak >= 5 ? 3 : streak >= 4 ? 2 : streak >= 2 ? 1 : 0;
  return `<h5>下回合收入预估</h5>
  <div>基础收入：+5</div>
  <div>利息（每10金币+1，至多5）：+${interest}</div>
  <div>连胜/连败奖励（当前${streak}）：+${sb}</div>
  <div>战斗胜利：+1（若获胜）</div>
  <div style="margin-top:4px;color:var(--accent)"><b>合计：${5 + interest + sb} ~ ${6 + interest + sb}</b></div>
  ${shiftDown ? '<div class="tt-sub" style="margin-top:4px">野怪回合不计连胜连败，输给野怪会断掉连胜。</div>' : ''}${shiftHint()}`;
}

function renderOdds() {
  const odds = SHOP_ODDS[me().level];
  $('oddsBar').innerHTML = '等级 ' + me().level + '：' + odds.map((o, i) =>
    `<span style="color:${COST_COLOR[i + 1]};font-weight:bold">${i + 1}费 ${o}%</span>`).join('　');
}

function renderPlayers() {
  const box = $('playersBox');
  box.innerHTML = '<h4>玩家（点击查看棋盘）</h4>';
  const sorted = game.players.slice().sort((a, b) => (b.alive - a.alive) || (b.hp - a.hp));
  for (const p of sorted) {
    const row = document.createElement('div');
    row.className = 'pl-row' + (p.i === myIndex ? ' me' : '') + (p.alive ? '' : ' dead');
    const fire = p.alive && p.streakW >= 2 ? `<span class="fire">🔥${p.streakW}</span>` : '';
    const rk = `<span class="pl-rank">${rankShort(ladder()[p.name] || 0)}</span>`;
    row.innerHTML = `<div class="pl-top"><span class="pl-name">${p.name}</span>${rk}${fire}</div>
      <div class="pl-bot"><span class="pl-hp"><div style="width:${Math.max(0, p.hp)}%"></div></span><span class="pl-hpnum">${Math.max(0, p.hp)}</span></div>`;
    if (p.alive) row.onclick = () => showScout(p);
    box.appendChild(row);
  }
}

function buildBoardCells() {
  const board = $('board');
  board.style.width = (COLS + 0.5) * CELL_W + 'px';
  board.style.height = (ROWS * ROW_H + 16) + 'px';
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
    const cell = document.createElement('div');
    cell.className = 'cell' + (r >= 4 ? ' mine' : ' foe');
    cell.id = `cell-${c}-${r}`;
    cell.style.width = (CELL_W - 4) + 'px';
    cell.style.height = (ROW_H + 8) + 'px';
    const { x, y } = cellPos(c, r);
    cell.style.left = x + 'px';
    cell.style.top = y + 'px';
    board.appendChild(cell);
  }
}
function cellPos(c, r) { return { x: (c + (r % 2 ? 0.5 : 0)) * CELL_W + 2, y: r * ROW_H + 4 }; }

function makeUnitNode(def, star, opts = {}) {
  const el = document.createElement('div');
  el.className = 'unit';
  const color = def.monster ? '#5a4a3a' : (RACE_COLOR[def.races[0]] || '#888');
  const icon = def.monster ? '👹' : (CLASS_ICON[def.classes[0]] || '❔');
  const cost = def.monster ? 1 : def.cost;
  el.innerHTML = `
    <div class="st-marks"></div>
    <div class="stars">${'★'.repeat(star)}</div>
    <div class="portrait" style="background:linear-gradient(160deg, ${color}, #00000055), ${COST_COLOR[cost]};border:none;">
      <div class="ring" style="box-shadow:inset 0 0 0 3px ${COST_COLOR[cost]}"></div>${icon}</div>
    <div class="uname">${def.name}</div>
    ${opts.bars ? `<div class="bars${opts.enemy ? ' enemy' : ''}"><div class="hpfill" style="width:100%"></div><div class="shfill"></div></div><div class="mbar"><div class="mfill" style="width:${opts.manaPct || 0}%"></div></div>` : ''}
    <div class="items-dots"></div>`;
  return el;
}

function renderUnitItems(el, unit) {
  const dots = el.querySelector('.items-dots');
  dots.innerHTML = unit.items.map(() => '<i></i>').join('');
}

function renderBoardUnits() {
  if (game.phase !== 'planning') return; // 战斗中由回放接管棋盘，绝不清场（修复开战瞬间拖拽 bug）
  document.querySelectorAll('#board .unit').forEach(n => n.remove());
  document.querySelectorAll('#board .float-txt,#board .proj').forEach(n => n.remove());
  const p = me();
  for (const b of p.board) {
    const el = makeUnitNode(b.unit.def, b.unit.star, { bars: true, manaPct: b.unit.def.mana[1] ? b.unit.def.mana[0] / b.unit.def.mana[1] * 100 : 0 });
    positionUnit(el, b.c, b.r);
    renderUnitItems(el, b.unit);
    attachUnitInteract(el, b.unit, { from: 'board' });
    $('board').appendChild(el);
  }
}
function positionUnit(el, c, r) {
  const { x, y } = cellPos(c, r);
  el.style.left = (x + 6) + 'px';
  el.style.top = (y - 8) + 'px';
}

function renderBench() {
  const row = $('benchRow');
  row.innerHTML = '';
  const p = me();
  if (p.bench.some(Boolean)) maybeTut('board');
  p.bench.forEach((u, i) => {
    const slot = document.createElement('div');
    slot.className = 'bench-slot';
    slot.dataset.bench = i;
    if (u) {
      const el = makeUnitNode(u.def, u.star);
      renderUnitItems(el, u);
      attachUnitInteract(el, u, { from: 'bench', idx: i });
      slot.appendChild(el);
    }
    row.appendChild(slot);
  });
}

function renderItems() {
  const row = $('itemRow');
  row.innerHTML = '';
  const p = me();
  if (p.items.length) maybeTut('items');
  if (p.items.some(x => x.kind === 'consumable')) maybeTut('consumable');
  p.items.forEach((it, i) => {
    const chip = document.createElement('div');
    chip.className = 'item-chip' + (it.kind !== 'component' ? ' combined' : '') + (selectedItem === it ? ' selected' : '')
      + (it.kind === 'light' || it.kind === 'artifact' ? ' light' : '') + (it.kind === 'consumable' ? ' consumable' : '');
    chip.innerHTML = itemIcon(it) + ' ' + it.name;
    chip.dataset.itemIdx = i;
    chip.onclick = () => {
      if (drag) return;
      if (selectedItem && selectedItem !== it && selectedItem.kind === 'consumable' && CONSUMABLES[selectedItem.type]?.target === 'item') {
        dispatch({ k: 'useOnItem', itemIdx: p.items.indexOf(selectedItem), targetIdx: i });
        selectedItem = null;
        renderAll(); return;
      }
      selectedItem = selectedItem === it ? null : it;
      renderItems();
    };
    chip.oncontextmenu = e => { e.preventDefault(); pinItemPreview(it, e); };
    chip.onpointerenter = e => { if (!tooltipPinned) showTooltip(() => itemTooltip(it), e); };
    chip.onpointerleave = () => hideTooltip();
    chip.onpointerdown = e => {
      if (e.button !== 0) return;
      e.preventDefault();
      startDrag({ kind: 'item', item: it, el: chip }, e, () => {
        const g = document.createElement('div');
        g.className = 'item-chip' + (it.kind !== 'component' ? ' combined' : '');
        g.innerHTML = itemIcon(it) + ' ' + it.name;
        return g;
      });
    };
    row.appendChild(chip);
  });
  $('itemHint').style.display = selectedItem ? '' : 'none';
}

function renderShop() {
  const bar = $('shopCards');
  bar.innerHTML = '';
  const p = me();
  p.shop.forEach((id, i) => {
    const card = document.createElement('div');
    if (!id) { card.className = 'shop-card empty'; bar.appendChild(card); return; }
    const def = UNITS_BY_ID[id];
    card.className = 'shop-card';
    // 差一张就能升星：白色扩散特效（买入即合成 2 星，若同时有两只 2 星还会连升 3 星）
    if (allUnits(p).filter(u => u.def.id === id && u.star === 1).length === 2) card.classList.add('upgrade');
    card.style.borderColor = COST_COLOR[def.cost];
    const traits = [...def.races.map(r => `<span class="sc-t" data-t="${r}">${RACES[r]}</span>`),
      ...def.classes.map(c => `<span class="sc-t" data-t="${c}">${CLASSES[c]}</span>`)].join(' · ');
    card.innerHTML = `<div class="sc-name">${CLASS_ICON[def.classes[0]] || ''} ${def.name}</div><div class="sc-traits">${traits}</div><div class="sc-cost">${def.cost}🪙</div>`;
    card.onclick = () => { if (drag) return; dispatch({ k: 'buy', slot: i }); };
    card.onpointerdown = e => {
      if (e.button !== 0 || !actOk()) return;
      e.preventDefault();
      startDrag({ kind: 'shop', slot: i, def, el: card }, e, () => makeUnitNode(def, 1));
    };
    card.onpointerenter = e => { if (!tooltipPinned) showTooltip(() => unitDefTooltip(def, 1), e); };
    card.onpointerleave = () => hideTooltip();
    card.querySelectorAll('.sc-t').forEach(span => {
      const tid = span.dataset.t, tdef = TRAITS[tid];
      if (!tdef) return;
      span.onpointerenter = e => { e.stopPropagation(); if (!tooltipPinned) showTooltip(() => traitTooltip(tid, tdef), e); };
      span.onpointerleave = e => { if (!tooltipPinned) showTooltip(() => unitDefTooltip(def, 1), e); };
    });
    bar.appendChild(card);
  });
  $('lockBtn').textContent = p.shopLocked ? '🔒 已锁定' : '🔓 锁定';
}

const TRAIT_PARENT = { gondolin: 'noldor', fingolfinH: 'noldor', feanorH: 'noldor', finarfinH: 'noldor', hador: 'mankind', beor: 'mankind', haleth: 'mankind' };
function renderTraits() {
  const box = $('traitsBox');
  box.innerHTML = '<h4>羁绊（场上）</h4>';
  const units = me().board.map(b => ({ def: b.unit.def, extraTraits: b.unit.extraTraits }));
  const list = countTraits(units);
  if (!list.length) box.innerHTML += '<div style="font-size:12px;color:var(--sub)">上场棋子后显示羁绊</div>';
  if (list.some(t => t.count >= 2)) maybeTut('traits');
  // 家族缩进在所属种族之下
  const ordered = [];
  const children = list.filter(t => TRAIT_PARENT[t.id]);
  for (const t of list.filter(t => !TRAIT_PARENT[t.id])) {
    ordered.push(t);
    for (const c of children) if (TRAIT_PARENT[c.id] === t.id) ordered.push({ ...c, sub: true });
  }
  for (const c of children) if (!list.some(t => t.id === TRAIT_PARENT[c.id])) ordered.push({ ...c, sub: true });
  for (const t of ordered) {
    const def = TRAITS[t.id];
    const row = document.createElement('div');
    row.className = 'trait-row' + (t.tier > 0 ? ' active ' + TIER_CLASS[Math.min(t.tier, 4)] : '') + (t.sub ? ' trait-sub' : '');
    const srcLine = t.id === 'flagger' && t.tier > 0 ? flaggerSourcesHtml(t.tier) : '';
    const activeLine = t.tier > 0 ? `<div class="trait-desc">${resolveTraitDesc(def, t.tier)}${srcLine}</div>` : '';
    row.innerHTML = `<div class="trait-head"><span class="tbadge">${t.count}</span><span>${def.name}</span><span class="tcount">${def.tiers.join(' › ')}</span></div>${activeLine}`;
    row.onpointerenter = e => { if (!tooltipPinned) showTooltip(() => traitTooltip(t.id, def, t.tier), e); };
    row.onpointerleave = () => hideTooltip();
    box.appendChild(row);
  }
  // 5费专属（流光行）
  for (const b of me().board) {
    const def = b.unit.def;
    if (def.cost !== 5 || !def.passive) continue;
    const pname = def.passive.split('：')[0];
    const row = document.createElement('div');
    row.className = 'trait-row active trait-unique';
    row.innerHTML = `<span class="tbadge">★</span><span>${pname}</span><span class="tcount">${def.name}</span>`;
    row.onpointerenter = e => { if (!tooltipPinned) showTooltip(() => `<h5>${pname}【${def.name}专属】</h5><div>${def.passive.slice(pname.length + 1)}</div>${shiftHint()}`, e); };
    row.onpointerleave = () => hideTooltip();
    box.appendChild(row);
  }
}
// 羁绊描述保留完整 a/b/c 档位列表，仅把当前激活档的数值加粗高亮
function resolveTraitDesc(def, tier) {
  if (!tier) return def.desc;
  return def.desc.replace(/(\d+(?:\.\d+)?(?:\/\d+(?:\.\d+)?)+)(%?)/g, (m, nums, pct) => {
    const arr = nums.split('/');
    const idx = Math.min(tier - 1, arr.length - 1);
    return arr.map((v, i) => i === idx ? `<b class="tt-hl">${v}</b>` : v).join('/') + pct;
  });
}
function traitTooltip(id, def, tier) {
  const mine = new Set(me().board.map(b => b.unit.def.id));
  const pool = UNITS.filter(u => u.races.includes(id) || u.classes.includes(id)).sort((a, b) => a.cost - b.cost);
  const lines = pool.map(u => `<span style="color:${mine.has(u.id) ? 'var(--accent)' : 'var(--sub)'}">${mine.has(u.id) ? '✓ ' : ''}${u.cost}费 ${u.name}</span>`).join('<br>');
  const srcBlock = id === 'flagger' && tier > 0 ? flaggerSourcesHtml(tier) : '';
  return `<h5>${def.name}（${def.tiers.join('/')}）${tier > 0 ? `<span style="color:var(--accent);font-size:12px">已激活第${tier}档</span>` : ''}</h5>
  <div>${resolveTraitDesc(def, tier)}</div>${srcBlock}
  <div style="margin-top:6px;border-top:1px solid var(--border);padding-top:4px">${lines}</div>
  ${shiftDown ? '<div class="tt-sub" style="margin-top:2px">✓ = 当前在你场上</div>' : ''}${shiftHint()}`;
}
// 掌旗官：列出当前军旗加成池的来源棋子与各自贡献
function flaggerSourcesHtml(tier) {
  const mult = [100, 150, 250][tier - 1], extra = [50, 75, 100][tier - 1];
  const rows = me().board.map(b => b.unit)
    .filter(u => u.def.classes.includes('flagger') || (u.extraTraits || []).includes('flagger'))
    .map(u => {
      const bo = FLAGGER_BONUS[u.def.id];
      const d = bo ? bo.desc : '每3秒回复2%最大生命值（纹章）';
      return `<span style="color:var(--sub)">· ${u.def.name}：</span>${d}`;
    });
  if (!rows.length) return '';
  return `<div style="margin-top:3px">${rows.join('<br>')}<br><span style="color:var(--sub)">全体掌旗官获得以上总和的 <b class="tt-hl">${mult}%</b>，最强者按 ${mult + extra}% 计算</span></div>`;
}

function renderLog() {
  const box = $('logBox');
  box.innerHTML = game.log.slice(-30).map(s => `<div>· ${s}</div>`).join('');
  box.scrollTop = box.scrollHeight;
}

// ---------- 观战 ----------
function showScout(p) {
  const m = $('scoutModal');
  const st = p.streakW > 0 ? `连胜${p.streakW}🔥` : p.streakL > 0 ? `连败${p.streakL}` : '—';
  let html = `<div id="scoutBox"><h3>${p.name} 的棋盘 <span class="pl-rank" style="font-size:12px">${rankShort(ladder()[p.name] || 0)}</span></h3>
  <div class="scout-stats">生命 <b>${Math.max(0, p.hp)}</b>｜金币 <b>${p.gold}</b>｜等级 <b>${p.level}</b>｜战绩 <b>${st}</b>｜物品 <b>${p.items.length}</b></div>
  <div style="display:flex;gap:14px;align-items:flex-start">
  <div class="scout-board" style="width:${(COLS + 0.5) * 46}px;height:${ROWS * 38 + 12}px;flex-shrink:0">`;
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
    const x = (c + (r % 2 ? 0.5 : 0)) * 46, y = r * 38;
    html += `<div class="scout-cell${r >= 4 ? ' mine' : ''}" style="left:${x}px;top:${y}px"></div>`;
  }
  p.board.forEach((b, i) => {
    const x = (b.c + (b.r % 2 ? 0.5 : 0)) * 46, y = b.r * 38;
    const color = RACE_COLOR[b.unit.def.races[0]] || '#888';
    html += `<div class="scout-unit" data-bi="${i}" style="left:${x + 2}px;top:${y - 4}px;background:${color};box-shadow:inset 0 0 0 2px ${COST_COLOR[b.unit.def.cost]}">
      <span>${'★'.repeat(b.unit.star)}</span>${b.unit.def.name.slice(0, 3)}</div>`;
  });
  // 对手羁绊（含转职纹章）
  const tlist = countTraits(p.board.map(b => ({ def: b.unit.def, extraTraits: b.unit.extraTraits })));
  let traitsHtml = '<div style="min-width:150px;max-height:330px;overflow-y:auto">';
  for (const t of tlist) {
    const def = TRAITS[t.id];
    traitsHtml += `<div class="trait-row${t.tier > 0 ? ' active ' + TIER_CLASS[Math.min(t.tier, 4)] : ''}" data-trait="${t.id}" style="font-size:12px">
      <span class="tbadge">${t.count}</span><span>${def.name}</span><span class="tcount">${def.tiers.join('›')}</span></div>`;
  }
  traitsHtml += tlist.length ? '</div>' : '<div class="tt-sub">未上场棋子</div></div>';
  html += `</div>${traitsHtml}</div>
  <div class="scout-bench">备战席：${p.bench.filter(Boolean).map(u => `${u.def.name}${'★'.repeat(u.star)}`).join('、') || '空'}</div>
  <div class="tt-sub" style="margin-top:6px">悬浮棋子/羁绊查看详情 · 点击空白处关闭</div></div>`;
  m.innerHTML = html;
  m.style.display = 'flex';
  // 悬浮绑定：棋子与羁绊
  m.querySelectorAll('.scout-unit').forEach(el => {
    const b = p.board[+el.dataset.bi];
    if (!b) return;
    el.onpointerenter = e => {
      if (tooltipPinned) return;
      showTooltip(() => unitDefTooltip(b.unit.def, b.unit.star, previewLiveOf(b.unit, p)), e);
    };
    el.onpointerleave = () => hideTooltip();
  });
  m.querySelectorAll('.trait-row').forEach(row => {
    const def = TRAITS[row.dataset.trait];
    if (!def) return;
    row.onpointerenter = e => { if (!tooltipPinned) showTooltip(() => `<h5>${def.name}（${def.tiers.join('/')}）</h5><div>${def.desc}</div>`, e); };
    row.onpointerleave = () => hideTooltip();
  });
}

// ---------- 提示框 ----------
function barsHtml(live) {
  const sh = Math.max(0, live.shield || 0);
  const denom = Math.max(live.maxHp, live.hp + sh);
  const hpPct = Math.max(0, Math.min(100, live.hp / denom * 100));
  const shPct = Math.max(0, Math.min(100 - hpPct, sh / denom * 100));
  const brk = live.breakExtra || 0;
  const mpPct = live.manaMax ? Math.max(0, Math.min(100, live.mana / (live.manaMax + brk) * 100)) : 0;
  return `<div class="tt-bar hp"><div style="width:${hpPct}%"></div><div class="shseg" style="width:${shPct}%"></div><span>❤ ${live.hp} / ${live.maxHp}${sh ? `　🛡 ${Math.round(sh)}` : ''}</span></div>
  ${live.manaMax ? `<div class="tt-bar mp${brk ? ' broken' : ''}"><div style="width:${mpPct}%"></div><span>💧 ${live.mana} / ${live.manaMax}${brk ? ` <b style="color:#ef5350">+${Math.round(brk)} 破法</b>` : ''}</span></div>` : ''}`;
}
// 技能描述里的公式 → 按当前星级与实时属性算成具体数字
function computeSkillDesc(def, star, st) {
  const L = Math.min(star, 3) - 1;
  let d = def.skill.desc;
  const fx = m => shiftDown ? `<span class="fx">(${m})</span>` : '';
  d = d.replace(/(\d+(?:\.\d+)?)\/(\d+(?:\.\d+)?)\/(\d+(?:\.\d+)?)×适辉/g, (m, a, b, c) =>
    `<b>${Math.round([+a, +b, +c][L] * Math.max(st.cc, st.mc))}</b>${fx(m)}`);
  d = d.replace(/(\d+(?:\.\d+)?)\/(\d+(?:\.\d+)?)\/(\d+(?:\.\d+)?)(%?)\s*(AD|CC|MC)/g, (m, a, b, c, pct, stat) => {
    const v = [+a, +b, +c][L];
    const sv = stat === 'AD' ? st.ad : stat === 'CC' ? st.cc : st.mc;
    return `<b>${Math.round(pct ? v / 100 * sv : v * sv)}</b>${fx(m)}`;
  });
  d = d.replace(/(\d+(?:\.\d+)?)%(AD|CC|MC)(?![^<]*<\/span>)/g, (m, a, stat) => {
    const sv = stat === 'AD' ? st.ad : stat === 'CC' ? st.cc : st.mc;
    return `<b>${Math.round(+a / 100 * sv)}</b>${fx(m)}`;
  });
  d = d.replace(/(\d+(?:\.\d+)?)\/(\d+(?:\.\d+)?)\/(\d+(?:\.\d+)?)(?![^<]*<\/span>)/g, (m, a, b, c) => `<b>${[+a, +b, +c][L]}</b>${fx(m)}`);
  return d;
}
const STAT_LABELS = [['ad', '攻击力'], ['as', '攻速'], ['range', '射程'], ['armor', '护甲'], ['ten', '韧性'], ['cc', '光强'], ['mc', '黑强'], ['cn', '光抗'], ['mn', '黑抗'], ['critR', '暴击率%'], ['critD', '暴伤%'], ['amp', '增伤%'], ['dr', '减伤%'], ['vamp', '吸血%']];
function statGridHtml(base, cur) {
  const rows = STAT_LABELS.map(([k, label]) => {
    const b = base[k], v = cur[k];
    const cls = v > b ? 'up' : v < b ? 'down' : '';
    return `<div class="stat-row" data-name="${label}" data-base="${b}" data-live="${v}"><span>${label}</span><span class="${cls}">${v}</span></div>`;
  });
  return `<div class="stat-grid">${rows.join('')}</div>`;
}
function baseStatsOf(def, star) {
  const s = unitStatsAtStar(def, star);
  return { ad: s.ad, as: def.as, range: def.range, armor: s.armor, cn: s.cn, mn: s.mn, cc: s.cc, mc: s.mc, ten: s.ten, critR: 15, critD: 150, amp: 0, dr: 0, vamp: 0 };
}
function unitDefTooltip(def, star, live) {
  const s = unitStatsAtStar(def, star);
  const base = baseStatsOf(def, star);
  const cur = (live && live.stats) || base;
  const traits = [...def.races.map(r => RACES[r]), ...def.classes.map(c => CLASSES[c])].join(' · ');
  const align = { light: '光明系', dark: '黑暗系', phys: '物理系' }[def.align];
  const statsBlock = live && live.stats
    ? statGridHtml(base, cur) + (shiftDown ? `<div class="tt-sub">绿=高于纸面，红=低于纸面；悬浮属性看对比</div>` : '')
    : `<div>生命${s.hp}｜攻击${s.ad}｜攻速${def.as}｜射程${def.range}</div>
       <div>护甲${s.armor}｜光抗${s.cn}｜黑抗${s.mn}｜韧性${s.ten}</div>
       <div>光强${s.cc}｜黑强${s.mc}｜法力${def.mana[0]}/${def.mana[1]}</div>`;
  // Shift：六维亲和度（主属性高亮，悬浮看含义——固定面板中可用）
  let affRow = '';
  if (shiftDown && def.aff) {
    const AFF_N = ['维', '能', '纳', '卡', '乌', '科'];
    const affNow = affAtStar(def.aff, star).map(v => Math.round(v));
    const mainIdx = def.aff.indexOf(Math.max(...def.aff));
    affRow = `<div class="aff-row">六维：${affNow.map((v, i) =>
      `<span class="aff${i === mainIdx ? ' main' : ''}" data-aff="${i}">${AFF_N[i]}${v}</span>`).join(' ')}</div>`;
  }
  return `<h5>${def.name} ${'★'.repeat(star)}</h5><div class="tt-sub">${def.cost}费 · ${traits} · ${align}</div>
  ${live ? barsHtml(live) : ''}
  ${affRow}
  ${statsBlock}
  <div style="margin-top:4px"><b>【${def.skill.name}】</b>${computeSkillDesc(def, star, cur)}</div>
  ${def.passive && shiftDown ? `<div class="tt-sub">${def.passive}</div>` : def.passive ? `<div class="tt-sub">被动：${def.passive.split('：')[0]}</div>` : ''}
  ${live ? eqRowHtml(live.items || []) : ''}
  ${shiftHint()}`;
}
function eqRowHtml(items) {
  const slots = [0, 1, 2].map(i => {
    const it = items[i];
    const gold = it && (it.kind === 'light' || it.kind === 'artifact') ? ' gold' : '';
    return `<div class="eq-slot${it ? '' : ' empty'}${gold}" data-eq="${i}">${it ? itemIcon(it) : ''}</div>`;
  }).join('');
  return `<div class="eq-row">${slots}</div>`;
}
function itemTooltip(it) {
  const statNames = { adPct: '%攻击力', asPct: '%攻速', sp: '自适应强度', mres: '自适应抗性', armor: '护甲', hp: '生命', hpPct: '%生命', mana: '法力', critR: '%暴击率', critD: '%暴击伤害', hsPct: '%治疗盾强', spLight: '光明强度', affAll: '六维亲和度' };
  const lines = Object.entries(it.stats || {}).map(([k, v]) => `+${v}${statNames[k] || k}`).join('，');
  return `<h5>${itemIcon(it)} ${it.name}</h5><div>${lines}</div>${it.note ? `<div class="tt-sub">${it.note}</div>` : ''}${shiftDown && it.kind === 'component' ? '<div class="tt-sub">散件：拖到棋子上穿戴 / 拖到另一件散件上合成；右键预览全部合成配方</div>' : ''}${shiftHint()}`;
}
function pinItemPreview(it, e) {
  const build = () => {
    if (it.kind !== 'component') return itemTooltip(it);
    const lines = [];
    for (const other of Object.keys(COMPONENTS)) {
      if (!canCombine(it.comp, other)) continue;
      const name = COMBO_NAMES[comboKey(it.comp, other)];
      if (name) lines.push(`<div class="recipe-line" data-a="${it.comp}" data-b="${other}">＋ ${COMPONENTS[other].name} → <b style="color:var(--accent)">${name}</b></div>`);
    }
    return `<h5>${itemIcon(it)} ${it.name} · 合成配方</h5>${lines.join('') || '<div>无</div>'}${shiftDown ? '<div class="tt-sub" style="margin-top:4px">悬浮配方行看成装详情；Esc 或点击空白处关闭</div>' : shiftHint()}`;
  };
  const bindRecipes = () => $('tooltip').querySelectorAll('.recipe-line').forEach(line => {
    line.onpointerenter = ev => {
      const combined = makeCombinedItem(line.dataset.a, line.dataset.b);
      if (combined) showTooltip2(itemTooltip(combined), ev);
    };
    line.onpointerleave = hideTooltip2;
  });
  showTooltip(build, e);
  pinTooltip();
  lastTipPost = bindRecipes;
  bindRecipes();
}
function pinTooltip() { tooltipPinned = true; $('tooltip').classList.add('pinned'); }
function showTooltip2(html, ev) {
  const rect = $('tooltip').getBoundingClientRect();
  const x = rect.right + 8 + 280 > window.innerWidth ? rect.left - 288 : rect.right + 8;
  showTooltip2At(html, Math.max(4, x), Math.min(ev.clientY - 20, window.innerHeight - 160));
}
function showTooltip2At(html, x, y) {
  const t2 = $('tooltip2');
  t2.innerHTML = html; t2.style.display = 'block';
  t2.style.left = Math.min(x, window.innerWidth - 290) + 'px';
  t2.style.top = Math.max(4, y) + 'px';
}
function hideTooltip2() { $('tooltip2').style.display = 'none'; }
let pinnedItems = [];
function pinLivePanel(n, ev) {
  showTooltip(() => liveTooltip(n), ev);
  pinTooltip();
  pinnedLive = n;
  pinnedItems = n.items;
  lastTipPost = attachStatHovers;
  attachStatHovers();
}
function attachStatHovers() {
  $('tooltip').querySelectorAll('.stat-row').forEach(row => {
    row.onpointerenter = ev => {
      const b = +row.dataset.base, v = +row.dataset.live, d = Math.round((v - b) * 100) / 100;
      showTooltip2(`<h5>${row.dataset.name}</h5><div>纸面基础：${b}</div><div>当前实时：<b style="color:${d > 0 ? '#4caf50' : d < 0 ? '#ef5350' : 'inherit'}">${v}</b>（${d >= 0 ? '+' : ''}${d}）</div><div class="tt-sub">差值 = 装备 + 羁绊 + 战斗中增减益合计（逐项来源溯源开发中）</div>`, ev);
    };
    row.onpointerleave = hideTooltip2;
  });
  $('tooltip').querySelectorAll('.eq-slot').forEach(slot => {
    slot.onpointerenter = ev => {
      const it = pinnedItems[+slot.dataset.eq];
      if (it) showTooltip2(itemTooltip(it), ev);
    };
    slot.onpointerleave = hideTooltip2;
  });
  const AFF_DESC = [
    '维雅亲和度（Vilyanna）：每点提供 2 攻击力、1 光明抗性、1 韧性',
    '能雅亲和度（Nenyanna）：每点提供 3 护甲、1 攻击力',
    '纳雅亲和度（Naryanna）：每点提供 3 光明强度、1 光明抗性',
    '卡萨雅亲和度（Casaryanna）：每点提供 1 光强、1 黑强、1 光抗、1 黑抗',
    '乌来雅亲和度（Ulaianna）：每点提供 3 黑暗强度、1 黑暗抗性',
    '科玛斯塔雅亲和度（Cormastayanna）：每点提供 2 攻击力、1 黑暗抗性、1 韧性',
  ];
  $('tooltip').querySelectorAll('.aff').forEach(sp => {
    sp.onpointerenter = ev => showTooltip2(`<h5>${AFF_DESC[+sp.dataset.aff].split('：')[0]}</h5><div>${AFF_DESC[+sp.dataset.aff].split('：')[1]}</div><div class="tt-sub">主属性（加粗高亮）升星时 ×1.6，其余 ×1.2</div>`, ev);
    sp.onpointerleave = hideTooltip2;
  });
}
function showTooltip(src, e) {
  cancelTipHide();
  lastTipFn = typeof src === 'function' ? src : () => src;
  lastTipPost = null;
  const t = $('tooltip');
  t.innerHTML = lastTipFn();
  t.style.display = 'block';
  t.classList.remove('pinned');
  moveTooltip(e);
}
// 悬浮即固定面板：定位一次不跟随，可把鼠标移入面板内交互，移开自动关闭
let tipHideTimer = null;
function cancelTipHide() { clearTimeout(tipHideTimer); }
function scheduleTipHide() {
  clearTimeout(tipHideTimer);
  tipHideTimer = setTimeout(() => { if (!tooltipPinned) hideTooltip(true); }, 160);
}
function positionTipAt(e) {
  const t = $('tooltip');
  const x = Math.min(e.clientX + 14, window.innerWidth - 310);
  const y = Math.min(e.clientY + 14, window.innerHeight - t.offsetHeight - 10);
  t.style.left = x + 'px'; t.style.top = y + 'px';
}
function hoverPanel(fn, e, post) {
  if (tooltipPinned || drag) return; // 手动固定（如配方预览）优先；拖拽中不弹
  cancelTipHide();
  lastTipFn = fn;
  lastTipPost = post || null;
  const t = $('tooltip');
  t.innerHTML = fn();
  t.style.display = 'block';
  t.classList.add('pinned'); // 开启面板内交互 & 停止跟随
  positionTipAt(e);
  if (post) post();
}
function refreshTip() {
  const t = $('tooltip');
  if (t.style.display === 'block' && lastTipFn) { t.innerHTML = lastTipFn(); if (lastTipPost) lastTipPost(); }
}
function moveTooltip(e) {
  const t = $('tooltip');
  if (tooltipPinned || t.classList.contains('pinned')) return;
  if (t.style.display !== 'block') return;
  const x = Math.min(e.clientX + 14, window.innerWidth - 310);
  const y = Math.min(e.clientY + 14, window.innerHeight - t.offsetHeight - 10);
  t.style.left = x + 'px'; t.style.top = y + 'px';
}
function hideTooltip(force) {
  if (tooltipPinned && !force) return;
  $('tooltip').style.display = 'none';
  $('tooltip').classList.remove('pinned');
  hideTooltip2();
  pinnedLive = null;
}

// ---------- 拖拽（pending：移动超过阈值才算拖拽，否则视为点击） ----------
function startDrag(d, e, ghostMaker) {
  drag = d;
  d.ghostMaker = ghostMaker;
  d.sx = e.clientX; d.sy = e.clientY;
  d.pending = true;
}
function activateDrag() {
  const d = drag;
  d.pending = false;
  d.el.classList.add('dragging');
  const g = $('dragGhost');
  g.innerHTML = '';
  g.appendChild(d.ghostMaker());
  g.style.display = 'block';
  if (d.kind === 'unit') {
    $('sellOverlay').classList.add('active');
    const price = d.unit.star === 1 ? d.unit.def.cost : d.unit.def.cost * Math.pow(3, d.unit.star - 1) - 1;
    $('sellOverlay').textContent = `⬇ 拖到这里出售（${price} 🪙）`;
    // 高亮可放置区
    if (planOk()) {
      const p = me();
      const full = !isFielded(p, d.unit.uid) && p.board.length >= p.level;
      for (let r = 4; r < 8; r++) for (let c = 0; c < COLS; c++) {
        const occ = p.board.some(b => b.c === c && b.r === r);
        if (occ || !full) $(`cell-${c}-${r}`).classList.add('can-place');
      }
    }
  }
}
// 备战预演：用战斗引擎装配羁绊+装备（不开打、不掷随机光明装），得到真实面板
function previewLiveOf(unit, player) {
  const board = player.board;
  const idx = board.findIndex(b => b.unit === unit);
  const wrap = u => ({ def: u.unit.def, star: u.unit.star, items: u.unit.items, progress: u.unit.progress, extraTraits: u.unit.extraTraits, pos: { c: u.c, r: u.r } });
  let fighters, fi;
  if (idx >= 0) { // 在场：全队装配（羁绊按整个棋盘计算）
    fighters = board.map(b => makeFighter(wrap(b), 0, { player }));
    fi = idx;
  } else { // 备战席：单体装配（只吃装备与自身成长）
    fighters = [makeFighter({ def: unit.def, star: unit.star, items: unit.items, progress: unit.progress, extraTraits: unit.extraTraits, pos: { c: 3, r: 5 } }, 0, { player })];
    fi = 0;
  }
  const sim = new Combat(fighters, makeRng(1), { preview: true, pvpWins: [player.pvpWins || 0, 0] });
  const f = fighters[fi];
  return {
    hp: Math.round(f.maxHp), maxHp: Math.round(f.maxHp),
    mana: Math.round(f.mana), manaMax: f.manaMax,
    items: unit.items, stats: sim.statsSnap(f),
    shield: Math.round(sim.shieldTotal(f)), breakExtra: 0,
  };
}
// 点击棋子：固定完整面板（与战斗中格式统一，含羁绊/装备/永久成长的真实数值）
function pinUnitPanel(unit, e) {
  const live = previewLiveOf(unit, me());
  showTooltip(() => unitDefTooltip(unit.def, unit.star, live), e);
  pinTooltip();
  pinnedItems = unit.items;
  lastTipPost = attachStatHovers;
  attachStatHovers();
}
function attachUnitInteract(el, unit, src) {
  el.dataset.uid = unit.uid;
  el.oncontextmenu = e => e.preventDefault();
  el.onpointerdown = e => {
    if (e.button !== 0 || !actOk()) return;
    e.preventDefault();
    if (selectedItem) { equipItem(unit, selectedItem); return; }
    startDrag({ kind: 'unit', unit, src, el }, e, () => makeUnitNode(unit.def, unit.star));
  };
}
function dragMove(e) {
  if (!drag) return;
  if (drag.pending) {
    if (Math.hypot(e.clientX - drag.sx, e.clientY - drag.sy) < 7) return;
    activateDrag();
  }
  const g = $('dragGhost');
  g.style.left = (e.clientX - 26) + 'px';
  g.style.top = (e.clientY - 30) + 'px';
  document.querySelectorAll('.drop-ok').forEach(n => n.classList.remove('drop-ok'));
  const t = dropTarget(e);
  if (t) t.el.classList.add('drop-ok');
  // 散件拖到散件上：未松开即预览合成结果
  if (drag.kind === 'item' && t && t.type === 'item') {
    const other = me().items[t.idx];
    if (other && drag.item.kind === 'component' && other.kind === 'component' && canCombine(drag.item.comp, other.comp)) {
      const combined = makeCombinedItem(drag.item.comp, other.comp);
      if (combined) { showTooltip2At(itemTooltip(combined), e.clientX + 20, e.clientY - 40); return; }
    }
  }
  if (drag.kind === 'item') hideTooltip2();
}
function dropTarget(e) {
  const els = document.elementsFromPoint(e.clientX, e.clientY);
  for (const el of els) {
    if (drag && drag.kind === 'item') {
      if (el.classList && el.classList.contains('unit') && el.dataset.uid) return { el, type: 'unit', uid: +el.dataset.uid };
      if (el.classList && el.classList.contains('item-chip') && el !== drag.el) return { el, type: 'item', idx: +el.dataset.itemIdx };
    }
    if (el.id && el.id.startsWith('cell-')) {
      const [, c, r] = el.id.split('-').map(Number);
      if (r >= 4) return { el, type: 'cell', c, r };
    }
    if (el.classList && el.classList.contains('bench-slot')) return { el, type: 'bench', idx: +el.dataset.bench };
    if (el.id === 'sellOverlay') return { el, type: 'sell' };
  }
  return null;
}
function cancelDrag() {
  if (!drag) return;
  drag.el.classList.remove('dragging');
  $('dragGhost').style.display = 'none';
  $('sellOverlay').classList.remove('active');
  document.querySelectorAll('.drop-ok,.can-place').forEach(n => n.classList.remove('drop-ok', 'can-place'));
  drag = null;
}
function dragEnd(e) {
  if (!drag) return;
  const d = drag;
  // 未发生拖拽 = 点击：棋子弹出固定面板
  if (d.pending) {
    drag = null;
    if (d.kind === 'unit') pinUnitPanel(d.unit, e);
    return; // 装备/商店卡的点击由各自 onclick 处理
  }
  const t = dropTarget(e);
  cancelDrag();
  const p = me();
  // 商店卡拖出商店区域 = 购买
  if (d.kind === 'shop') {
    const els = document.elementsFromPoint(e.clientX, e.clientY);
    const inShop = els.some(el => el.id === 'shopCards' || el.id === 'shopBar' || (el.classList && el.classList.contains('shop-card')));
    if (!inShop) dispatch({ k: 'buy', slot: d.slot });
    renderAll(); return;
  }
  if (!t) { renderAll(); return; }
  if (d.kind === 'item') {
    const itemIdx = p.items.indexOf(d.item);
    if (t.type === 'unit') dispatch({ k: 'equip', itemIdx, uid: t.uid });
    else if (t.type === 'item') dispatch({ k: 'combineInv', i: itemIdx, j: t.idx });
    renderAll(); return;
  }
  // 棋子
  const unit = d.unit;
  if (t.type === 'cell') {
    if (!planOk()) banner('战斗中无法调整棋盘');
    else {
      const fielded = isFielded(p, unit.uid);
      const occ = p.board.find(b => b.c === t.c && b.r === t.r);
      if (!fielded && !occ && p.board.length >= p.level) banner(`⚠ 人口已满（等级 ${p.level} = ${p.level} 个上场位）`);
      else dispatch({ k: 'place', uid: unit.uid, c: t.c, r: t.r });
    }
  } else if (t.type === 'bench') {
    if (d.src.from === 'board') {
      if (!planOk()) banner('战斗中无法调整棋盘');
      else dispatch({ k: 'unfield', uid: unit.uid, bench: t.idx });
    } else dispatch({ k: 'benchSwap', uid: unit.uid, idx: t.idx });
  } else if (t.type === 'sell') {
    if (!planOk() && isFielded(p, unit.uid)) banner('战斗中不能出售场上棋子');
    else dispatch({ k: 'sell', uid: unit.uid });
  }
  renderAll();
}
function equipItem(unit, it) {
  const itemIdx = me().items.indexOf(it);
  if (itemIdx < 0) return;
  dispatch({ k: 'equip', itemIdx, uid: unit.uid });
  if (selectedItem === it) selectedItem = null;
  renderAll();
}

// ---------- 战斗 ----------
function beginCombatLocal() {
  if (game.carousel) return; // 选秀期间不可开战
  clearInterval(planTimer);
  cancelDrag();
  playbackDone = false; pendingResolve = false; resolveSent = false;
  maybeTut('combat');
  tooltipPinned = false; hideTooltip(true);
  const pending = game.prepareCombats();
  renderTopbar(); renderBench(); renderTraits(); renderGold();
  const my = pending.combats.find(c => c.a === myIndex || c.b === myIndex);
  const enemyName = my ? (my.kind === 'pve' ? '野怪' : game.players[my.a === myIndex ? my.b : my.a].name + (my.ghost ? '（镜像）' : '')) : null;
  $('enemyLabel').textContent = enemyName ? `对阵：${enemyName}` : '本回合轮空';
  $('timer').textContent = '';
  $('speedBtn').style.display = $('skipBtn').style.display = 'inline-block';
  $('speedBtn').textContent = '▶ 1x';
  if (!my) { finishCombat(); return; }
  const mirror = my.a !== myIndex;
  // 入场演出：飞往敌方棋盘 / 野怪来袭
  const isPvE = my.kind === 'pve';
  bell(isPvE ? 440 : 520);
  document.querySelectorAll('#board .unit,#board .float-txt,#board .proj').forEach(n => n.remove());
  const ib = $('introBanner');
  ib.querySelector('.it-main').textContent = isPvE ? '👹 野怪来袭！' : `⚔ 对阵 ${enemyName}`;
  ib.querySelector('.it-sub').textContent = isPvE ? '守住你的棋盘' : '正在飞往对手的棋盘…';
  ib.classList.remove('show'); void ib.offsetWidth; ib.classList.add('show');
  const bw = $('boardWrap');
  bw.classList.remove('fly-in'); void bw.offsetWidth; bw.classList.add('fly-in');
  setTimeout(() => {
    ib.classList.remove('show'); bw.classList.remove('fly-in');
    startPlayback(my.events, mirror);
  }, 1800);
}

function startPlayback(events, mirror) {
  document.querySelectorAll('#board .unit,#board .float-txt,#board .proj').forEach(n => n.remove());
  const savedSpeed = Math.min(4, Math.max(1, parseFloat(localStorage.getItem('ept-speed')) || 1));
  playback = { events, i: 0, t: 0, speed: savedSpeed, skip: false, nodes: {}, last: performance.now(), mirror, acc: { dealt: {}, taken: {}, heal: {} }, lastPanelT: 0 };
  $('speedBtn').textContent = '▶ ' + savedSpeed + 'x';
  lastAcc = playback.acc;
  lastNodes = playback.nodes;
  renderDmgPanel();
  setTimeout(() => playLoop(performance.now()), 16);
}
function mirrorPos(pb, c, r) { return pb.mirror ? { c: COLS - 1 - c, r: 7 - r } : { c, r }; }

function playLoop(now) {
  const pb = playback;
  if (!pb) return;
  if (paused) { pb.last = now; setTimeout(() => playLoop(performance.now()), 60); return; }
  const dt = Math.min((now - pb.last) / 1000, 0.1) * pb.speed;
  pb.last = now;
  pb.t += pb.skip ? 999 : dt;
  let ended = false;
  while (pb.i < pb.events.length && pb.events[pb.i].t <= pb.t) {
    ended = applyEvent(pb, pb.events[pb.i]) || ended;
    pb.i++;
  }
  if (dmgOpen && pb.t - pb.lastPanelT > 0.5) { pb.lastPanelT = pb.t; renderDmgPanel(); }
  if (pb.i >= pb.events.length || ended) { setTimeout(finishCombat, pb.skip ? 100 : 1400); if (dmgOpen) renderDmgPanel(); playback = null; return; }
  setTimeout(() => playLoop(performance.now()), 33);
}

function updateBars(n) {
  const sh = Math.max(0, n.shield || 0);
  const denom = Math.max(n.maxHp, Math.max(0, n.hp) + sh);
  const hpBar = n.el.querySelector('.hpfill');
  if (hpBar) hpBar.style.width = Math.max(0, n.hp) / denom * 100 + '%';
  const shBar = n.el.querySelector('.shfill');
  if (shBar) shBar.style.width = sh / denom * 100 + '%';
  const mWrap = n.el.querySelector('.mbar');
  const mBar = n.el.querySelector('.mfill');
  if (mBar) mBar.style.width = Math.min(100, Math.max(0, n.manaMax ? n.mana / (n.manaMax + (n.breakExtra || 0)) * 100 : 0)) + '%';
  if (mWrap) mWrap.classList.toggle('broken', (n.breakExtra || 0) > 0);
  if (pinnedLive === n) { $('tooltip').innerHTML = liveTooltip(n); attachStatHovers(); } // 固定面板实时刷新
}

function applyEvent(pb, e) {
  const board = $('board');
  const nodes = pb.nodes;
  switch (e.k) {
    case 'spawn': {
      const def = e.monster ? { name: e.name, monster: true, races: [], classes: [] } : UNITS_BY_ID[e.defId];
      const enemy = e.team === (pb.mirror ? 0 : 1);
      const el = makeUnitNode(def, e.star, { bars: true, enemy, manaPct: e.manaMax ? e.mana / e.manaMax * 100 : 0 });
      const { c, r } = mirrorPos(pb, e.c, e.r);
      positionUnit(el, c, r);
      board.appendChild(el);
      const n = { el, maxHp: e.hp, hp: e.hp, mana: e.mana, manaMax: e.monster ? 0 : e.manaMax, enemy, def, star: e.star, items: e.items || [], shield: 0, breakExtra: 0 };
      nodes[e.id] = n;
      if (!pb.skip) { el.classList.add('spawn-pop'); setTimeout(() => el.classList.remove('spawn-pop'), 500); }
      // 点击=固定完整实时面板（可移入面板悬浮装备/属性）
      el.onclick = ev => pinLivePanel(n, ev);
      el.oncontextmenu = ev => ev.preventDefault();
      break;
    }
    case 'move': {
      const n = nodes[e.id]; if (!n) break;
      const { c, r } = mirrorPos(pb, e.c, e.r);
      if (e.dash) { n.el.classList.add('dashing'); setTimeout(() => n.el.classList.remove('dashing'), 200); }
      positionUnit(n.el, c, r);
      break;
    }
    case 'atk': {
      const n = nodes[e.id], t = nodes[e.tgt];
      if (!n) break;
      if (!pb.skip) {
        n.el.classList.remove('lunge'); void n.el.offsetWidth; n.el.classList.add('lunge');
        if (e.range > 1 && t) shootProj(n.el, t.el, n.enemy ? '#ef5350' : '#ffd54f');
      }
      break;
    }
    case 'mana': { const n = nodes[e.id]; if (n) { n.mana = e.v; updateBars(n); } break; }
    case 'stats': { const n = nodes[e.id]; if (n) { n.stats = e.s; if (pinnedLive === n) updateBars(n); } break; }
    case 'dmg': {
      const n = nodes[e.id]; if (!n) break;
      if (e.src) pb.acc.dealt[e.src] = (pb.acc.dealt[e.src] || 0) + e.v;
      pb.acc.taken[e.id] = (pb.acc.taken[e.id] || 0) + e.v;
      n.hp = e.hp;
      n.shield = e.shield || 0;
      if (e.tmana !== undefined) n.mana = e.tmana;
      updateBars(n);
      if (!pb.skip) {
        floatText(n.el, (e.crit ? '暴击 ' : '') + e.v, DMG_COLOR[e.type] || '#fff', e.crit);
        if (e.v >= 600) { const bw = $('boardWrap'); bw.classList.remove('shake'); void bw.offsetWidth; bw.classList.add('shake'); }
      }
      break;
    }
    case 'heal': {
      const n = nodes[e.id]; if (!n) break;
      if (e.src) pb.acc.heal[e.src] = (pb.acc.heal[e.src] || 0) + e.v;
      n.hp = e.hp;
      updateBars(n);
      if (!pb.skip && e.v > 5) floatText(n.el, '+' + e.v, 'var(--heal)');
      break;
    }
    case 'shield': { const n = nodes[e.id]; if (n) { n.shield = e.total || 0; updateBars(n); } break; }
    case 'maxhp': { const n = nodes[e.id]; if (n) { n.maxHp = e.max; n.hp = e.hp; updateBars(n); } break; }
    case 'break': { const n = nodes[e.id]; if (n) { n.breakExtra = e.extra || 0; updateBars(n); if (!pb.skip && e.extra > 0) floatText(n.el, '破法', '#ffffff'); } break; }
    case 'cast': {
      const n = nodes[e.id]; if (!n) break;
      n.mana = 0; updateBars(n);
      if (!pb.skip) {
        n.el.classList.add('casting'); setTimeout(() => n.el.classList.remove('casting'), 500);
        floatText(n.el, '【' + e.name + '】', 'var(--accent2)');
        castBurst(n.el, n.def.align);
      }
      break;
    }
    case 'status': {
      const n = nodes[e.id]; if (!n) break;
      if (e.type === 'untargetable') { n.el.classList.add('untargetable'); setTimeout(() => n.el.classList.remove('untargetable'), e.dur * 1000 / pb.speed); break; }
      if (!pb.skip) addMark(pb, n, e.type, e.dur);
      break;
    }
    case 'cleanse': { const n = nodes[e.id]; if (n) { clearMarks(n); if (!pb.skip) floatText(n.el, '净化', '#8ee08e'); } break; }
    case 'execute': { const n = nodes[e.id]; if (n && !pb.skip) floatText(n.el, '处决！', 'var(--dmg-true)', true); break; }
    case 'miss': { const n = nodes[e.id]; if (n && !pb.skip) floatText(n.el, '闪避', '#9e9e9e'); break; }
    case 'die': { const n = nodes[e.id]; if (n) { n.el.classList.add('dead'); n.el.style.pointerEvents = 'none'; if (!tooltipPinned) hideTooltip(); } break; }
    case 'star': {
      if (pb.skip) break;
      const { c, r } = mirrorPos(pb, e.c, e.r);
      const cell = $(`cell-${c}-${r}`);
      if (cell) { cell.classList.add('star-flash'); setTimeout(() => cell.classList.remove('star-flash'), 200); }
      break;
    }
    case 'mordor': { if (!pb.skip) banner('邪黑塔锁定了棋盘！'); break; }
    case 'lightItem': { const n = nodes[e.id]; if (n) { n.items.push(e.info || { name: e.item, kind: 'light', stats: {}, note: '' }); if (!pb.skip) floatText(n.el, '☀ ' + e.item, 'var(--dmg-light)'); } break; }
    case 'overtime': { if (!pb.skip) banner('加时！全员狂暴'); break; }
    case 'end': {
      const meWon = e.winner === (pb.mirror ? 1 : 0);
      banner(e.winner === 'draw' ? '平局' : meWon ? '胜利！' : '战败…');
      return true;
    }
  }
  return false;
}
function liveTooltip(n) {
  if (n.def.monster) return `<h5>${n.def.name}</h5>` + barsHtml({ hp: Math.max(0, Math.round(n.hp)), maxHp: n.maxHp, mana: 0, manaMax: 0 });
  return unitDefTooltip(n.def, n.star, { hp: Math.max(0, Math.round(n.hp)), maxHp: n.maxHp, mana: Math.round(n.mana), manaMax: n.manaMax, items: n.items, stats: n.stats, shield: n.shield, breakExtra: n.breakExtra });
}
// 左键悬浮：极简实时信息
function liveHover(n) {
  const stars = n.def.monster ? '' : ' ' + '★'.repeat(n.star);
  return `<h5>${n.def.name}${stars}</h5>` +
    barsHtml({ hp: Math.max(0, Math.round(n.hp)), maxHp: n.maxHp, mana: Math.round(n.mana || 0), manaMax: n.manaMax || 0 }) +
    `<div class="tt-sub">右键查看完整面板</div>`;
}

function floatText(el, txt, color, big) {
  const f = document.createElement('div');
  f.className = 'float-txt';
  f.textContent = txt;
  f.style.color = color;
  if (big) f.style.fontSize = '18px';
  f.style.left = (el.offsetLeft + 8 + Math.random() * 24) + 'px';
  f.style.top = (el.offsetTop - 4) + 'px';
  $('board').appendChild(f);
  setTimeout(() => f.remove(), 1000);
}
// 状态头顶标记（M4）
const ST_MARK = { stun: ['💫', '眩晕'], chill: ['❄️', '冰缓'], disarm: ['🚫', '缴械'], burn: ['🔥', '灼烧'], gw: ['💔', '重伤'], taunt: ['😡', '嘲讽'] };
function addMark(pb, n, type, dur) {
  const info = ST_MARK[type]; if (!info) return;
  const box = n.el.querySelector('.st-marks'); if (!box) return;
  n.marks = n.marks || {};
  if (n.marks[type]) clearTimeout(n.marks[type].t);
  else {
    const s = document.createElement('span');
    s.className = 'st-mark'; s.textContent = info[0]; s.title = info[1];
    box.appendChild(s);
    n.marks[type] = { el: s };
  }
  n.marks[type].t = setTimeout(() => { if (n.marks[type]) { n.marks[type].el.remove(); delete n.marks[type]; } }, dur * 1000 / pb.speed);
}
function clearMarks(n) {
  if (!n.marks) return;
  for (const k in n.marks) { clearTimeout(n.marks[k].t); n.marks[k].el.remove(); }
  n.marks = {};
}
// 施法爆发环（按阵营配色）
function castBurst(el, align) {
  const b = document.createElement('div');
  b.className = 'cast-burst';
  b.style.borderColor = align === 'light' ? '#ffd700' : align === 'dark' ? '#b26cff' : '#7ec8ff';
  b.style.left = (el.offsetLeft + 26) + 'px';
  b.style.top = (el.offsetTop + 26) + 'px';
  $('board').appendChild(b);
  setTimeout(() => b.remove(), 650);
}
function shootProj(from, to, color) {
  const p = document.createElement('div');
  p.className = 'proj';
  p.style.background = color;
  p.style.left = (from.offsetLeft + 26) + 'px';
  p.style.top = (from.offsetTop + 26) + 'px';
  p.style.transition = 'left .2s linear, top .2s linear';
  $('board').appendChild(p);
  requestAnimationFrame(() => { p.style.left = (to.offsetLeft + 26) + 'px'; p.style.top = (to.offsetTop + 26) + 'px'; });
  setTimeout(() => p.remove(), 260);
}
function banner(txt) {
  const b = $('banner');
  b.textContent = txt;
  b.style.display = 'block';
  clearTimeout(b._t);
  b._t = setTimeout(() => b.style.display = 'none', 1600);
}

function finishCombat() { // 本地回放结束
  $('speedBtn').style.display = $('skipBtn').style.display = 'none';
  if (!online) { resolveNow(); return; }
  playbackDone = true;
  if (net.isHost && !resolveSent) { resolveSent = true; net.orderAction(myIndex, { k: 'resolve' }); }
  else if (pendingResolve) resolveNow();
  else $('enemyLabel').textContent = '等待其他玩家的战斗结束…';
}
function onResolveStream() {
  pendingResolve = true;
  if (playback) { playback.skip = true; return; } // 回放中：快进后 finishCombat 会接手
  if (playbackDone) resolveNow();
}
function resolveNow() {
  pendingResolve = false; playbackDone = false; resolveSent = false;
  $('enemyLabel').textContent = '';
  game.resolveRound();
  if (game.over) { showOver(); return; }
  if (online && !me().alive && !game.over) banner('☠ 你已被淘汰，观战中…');
  renderAll();
  if (game.carousel) showCarousel();
  else startPlanTimer();
}

function showOver() {
  clearInterval(planTimer);
  clearInterval(carTimer);
  $('game').style.display = 'none';
  const meP = game.players[myIndex];
  const place = meP.placement || 8;
  $('againBtn').style.display = online ? 'none' : ''; // 联机结束回菜单重新组局
  const won = meP.alive && place === 1;
  if (!game.ladderApplied) { game.ladderApplied = true; game.ladderRes = applyLadder(); } // 联机同样计分（本机按昵称记账）
  const r = game.ladderRes[meP.name];
  $('overTitle').textContent = won ? '🏆 胜利！' : '☠ 对局结束';
  $('overDesc').textContent = won ? '你是中洲最后的执棋者。' : `最终排名：第 ${place} 名`;
  $('overLadder').innerHTML = `本局积分：<b style="color:${r.delta >= 0 ? '#4caf50' : '#ef5350'}">${r.delta >= 0 ? '+' : ''}${r.delta}</b>　段位：${rankOf(r.oldS)} → <b style="color:var(--accent)">${rankOf(r.newS)}</b>（${r.newS} 分）`;
  $('overScreen').style.display = 'block';
  // 大段位晋升动画
  const bigOld = Math.floor(Math.min(Math.floor(r.oldS / 100), 35) / 5), bigNew = Math.floor(Math.min(Math.floor(r.newS / 100), 35) / 5);
  if (bigNew > bigOld) {
    $('promoFx').querySelector('.promo-rank').textContent = rankOf(r.newS);
    $('promoFx').classList.add('show');
    bell(880); setTimeout(() => bell(1108), 180); setTimeout(() => bell(1318), 360); setTimeout(() => bell(1760), 540);
    setTimeout(() => $('promoFx').classList.remove('show'), 2700);
  }
}
