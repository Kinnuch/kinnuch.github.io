// 启动：大厅（档案、卡组、模式）↔ 对局、主循环、HUD、星体详情、暂停与菜单、结算与经验、新手教程。
//
// 开发参数（URL）：?auto=1 跳过大厅直接开局 · seed=N 星图编号 · ai=N 对手数 · time=分钟（0 不限）
//                  galaxy=星系类型 · challenge=难度 · fog=0 关迷雾 · spectate=1 全 AI 观战 · hotseat=N 同屏 N 人
//                  tutorial=1 直接进新手教程 · speed=K 推演倍速 · ff=秒 开局先快进 · nohint=1 不显示提示
//                  selftest=1 输入链路自检（同屏、教程、大厅、结算各有一套，见文件末尾）· perf=1 量绘制耗时
//                  autopilot=1 由 AI 代玩（视角仍是玩家，截图用）

import { newGame, humanFaction, cleanDeck, deckPoints } from './state.js';
import { step, submit, flushCommands, score, leader } from './sim.js';
import { RULES, ANOMALIES, CHALLENGES, ABILITIES, PERSONALITIES, TARGET_TEXT, DEFAULT_DECK, GROWTH } from './rules.js';
import { isTwoStar, cardReady } from './abilities.js';
import { ownEffect } from './effects.js';
import { GALAXY_TYPES } from './galaxy.js';
import { freshSeed } from './rng.js';
import { createRenderer } from './render.js';
import { attachInput } from './input.js';
import {
  newProfile, normalizeProfile, profileSummary, abilityPoints, cardAllowed, unlockLevel, levelOf, settleGame,
} from './profile.js';
import { createTutorial, TUTORIAL } from './tutorial.js';
import { Network } from './net.js';

const $ = (id) => document.getElementById(id);
const params = new URLSearchParams(location.search);
const KEY = {
  opts: 'gillif-opts', hint: 'gillif-hint-seen', best: 'gillif-best', anomalies: 'gillif-anomalies-seen',
  deck: 'gillif-deck', profile: 'gillif-profile',
};

const load = (k, fallback) => { try { const v = JSON.parse(localStorage.getItem(k)); return v ?? fallback; } catch { return fallback; } };
const save = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* 无痕模式 */ } };

const canvas = $('board');
const R = createRenderer(canvas);
let G = null;
let lastOpts = null;
let paused = false, menuOpen = false, menuWasPaused = false, endShown = false;
let acc = 0, lastFrame = 0;
const speed = Math.max(0.1, Math.min(32, +(params.get('speed') || 1)));

// 这一局的身份：mode = solo / tutorial / hotseat / spectate；ranked = 计入成长；settled = 已结算经验
let session = { mode: 'solo', ranked: false, settled: false };
let tutorial = null;
let network = null, networkFaction = -1;
let lastForfeit = null;      // 中途离开的那一局的结算（大厅 / 下一局开头提一句）

const autopilot = params.get('autopilot') === '1';
const me = () => {
  if (G && session.mode === 'online') return networkFaction;
  if (!G || session.mode === 'hotseat' || session.mode === 'spectate') return -1;
  return autopilot ? 0 : humanFaction(G);
};
const ui = attachInput(canvas, R, {
  game: () => G,
  me,
  // 单人：只能操控自己的星；同屏多人：任何一位玩家的星都行，指令记在星主名下
  canControl: (id) => {
    if (!G || id < 0) return false;
    const o = G.stars[id].owner;
    if (o < 0) return false;
    return session.mode === 'hotseat' ? G.factions[o].human && G.factions[o].alive : o === me();
  },
  submit: (cmd) => dispatch(cmd),
  hover: (id) => onHover(id),
  inspect: (id, type) => onInspect(id, type),
  cast: (card, src, dst) => castAbility(card, src, dst),
  deny: (id) => denyTarget(id),
  cancelArm: () => setArmed(null),
});

const fmt = (sec) => { const s = Math.floor(sec); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };
const fmtNum = (n) => Math.round(n).toLocaleString('zh-CN');

// ——— 档案与卡组 ———

let profile = normalizeProfile(load(KEY.profile, null));
const saveProfile = () => save(KEY.profile, profile);

// 成长模式和自由模式各存一副卡组（M3 的存档只有一副，两边都用它起步）
let decks = (() => {
  const d = load(KEY.deck, null);
  if (Array.isArray(d)) return { grow: d.slice(), free: d.slice() };
  const pick = (v) => (Array.isArray(v) ? v.slice() : DEFAULT_DECK.slice());
  return d && typeof d === 'object' ? { grow: pick(d.grow), free: pick(d.free) } : { grow: DEFAULT_DECK.slice(), free: DEFAULT_DECK.slice() };
})();
const deckKey = () => (profile.ranked ? 'grow' : 'free');
const deckAllowed = (c) => cardAllowed(c, profile);
/** 当前模式下实际能带进对局的卡组（超点、未解锁的卡从后往前去掉） */
const currentDeck = () => cleanDeck(decks[deckKey()], abilityPoints(profile), deckAllowed);
const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const playerName = () => esc(profile.name || '你');

function renderProfile() {
  const sm = profileSummary(profile);
  $('pfLevel').textContent = sm.level;
  $('pfTitle').textContent = sm.title;
  if (document.activeElement !== $('pfName')) $('pfName').value = profile.name;
  $('pfXp').style.width = `${(sm.progress * 100).toFixed(1)}%`;
  const per = GROWTH.expPerLevel;
  const into = sm.level >= GROWTH.maxLevel ? '已满级' : `${fmtNum(profile.exp - (sm.level - 1) * per)} / ${fmtNum(per)}`;
  $('pfMeta').innerHTML = `经验 ${into} · 能力点 ${sm.points}${profile.ranked ? '' : '（自由模式）'} · 胜 ${profile.won} 负 ${profile.lost}`
    + `<span class="muted"> · 计入成长 ${profile.games} 局</span>`;
  $('pfMeta').title = `各难度累计最多星数：指挥官 ${profile.stars.normal} · 上将 ${profile.stars.hard} · 皇帝 ${profile.stars.nightmare}`;
  $('optRanked').checked = profile.ranked;
  $('firstTime').hidden = !(profile.tutorial === '' && profile.games === 0);
  const note = $('pfNote');
  note.hidden = !lastForfeit;
  if (lastForfeit) note.textContent = forfeitText(lastForfeit);
}

function forfeitText(res) {
  if (res.xp > 0) return `上一局中途离开，按认输结算：经验 +${fmtNum(res.xp)}${res.lost ? '，记一负' : ''}。`;
  return `上一局中途离开，按认输结算${res.lost ? '：记一负' : ''}（不足 2 分钟没有得分，也就没有经验）。`;
}

function renderDeck() {
  const grid = $('deckGrid');
  grid.innerHTML = '';
  const limit = abilityPoints(profile);
  const deck = currentDeck();
  const pts = deckPoints(deck);
  $('deckPts').textContent = `${pts} / ${limit} 点`;
  $('deckPts').classList.toggle('full', pts === limit);
  if (profile.ranked) {
    const lv = levelOf(profile.exp);
    const next = Object.keys(ABILITIES).map(unlockLevel).filter((l) => l > lv).sort((a, b) => a - b)[0];
    $('deckNote').textContent = `成长模式：能力点随等级增长，现在 ${limit} 点；比能力点便宜的卡才能选（2 点的卡随时可选）。`
      + (next ? `Lv ${next} 解锁下一档。` : '');
  } else {
    $('deckNote').textContent = '自由模式：12 点随便配，但 6 点的卡不能用；对局不计经验。';
  }
  for (const [key, a] of Object.entries(ABILITIES)) {
    const on = deck.includes(key);
    const allowed = deckAllowed(key);
    const fits = on || (allowed && pts + a.cost <= limit);
    const lock = allowed ? '' : profile.ranked ? `Lv ${unlockLevel(key)} 解锁` : '自由模式不可用';
    const el = document.createElement('button');
    el.type = 'button';
    el.className = 'dcard' + (on ? ' on' : '') + (fits ? '' : ' off') + (allowed ? '' : ' locked');
    el.dataset.card = key;
    el.innerHTML = `<span class="dc-top"><b>${a.name}</b><span class="dc-cost" title="点数">${a.cost}</span></span>`
      + `<span class="dc-meta">${a.dur ? `持续 ${a.dur} 秒 · ` : '即时 · '}冷却 ${a.cd} 秒</span>`
      + `<span class="dc-desc">${a.desc}</span>`
      + `<span class="dc-tgt">目标：${TARGET_TEXT[a.target]}${a.counter ? ` · 与「${ABILITIES[a.counter].name}」互克` : ''}</span>`
      + (lock ? `<span class="dc-lock">${lock}</span>` : '');
    el.addEventListener('click', () => {
      if (on) decks[deckKey()] = deck.filter((c) => c !== key);
      else if (fits) decks[deckKey()] = [...deck, key];
      else return;
      save(KEY.deck, decks);
      renderDeck();
    });
    grid.appendChild(el);
  }
}

$('pfName').addEventListener('input', () => { profile.name = $('pfName').value.trim().slice(0, 16); saveProfile(); });
$('optRanked').addEventListener('change', () => {
  profile.ranked = $('optRanked').checked;
  saveProfile();
  renderProfile();
  renderDeck();
});
$('pfReset').addEventListener('click', () => {
  if (!confirm('重置档案？等级、经验和战绩都会清零（卡组保留）。')) return;
  profile = newProfile();
  lastForfeit = null;
  saveProfile();
  renderProfile();
  renderDeck();
});
$('deckReset').addEventListener('click', () => { decks[deckKey()] = DEFAULT_DECK.slice(); save(KEY.deck, decks); renderDeck(); });
$('tutorialBtn').addEventListener('click', () => startTutorial());
$('firstTutorial').addEventListener('click', () => startTutorial());
$('firstSkip').addEventListener('click', () => { profile.tutorial = 'skipped'; saveProfile(); renderProfile(); });

// ——— 大厅：模式与对局设置 ———

const aiPref = { solo: 3, hotseat: 0 };

function fillCounts() {
  const T = GALAXY_TYPES[$('optGalaxy').value];
  const max = T.maxFactions;
  const hot = $('optMode').value === 'hotseat';
  $('playersField').hidden = !hot;
  $('aiLabel').textContent = hot ? '加 AI' : '对手';
  const ps = $('optPlayers');
  const wantP = Math.max(2, Math.min(max, +ps.value || aiPref.players || 2));
  ps.innerHTML = '';
  for (let i = 2; i <= max; i++) ps.add(new Option(`${i} 人`, String(i)));
  ps.value = String(wantP);
  const sel = $('optAi');
  const lo = hot ? 0 : 1, hi = hot ? max - wantP : max - 1;
  const want = aiPref[hot ? 'hotseat' : 'solo'];
  sel.innerHTML = '';
  for (let i = lo; i <= hi; i++) sel.add(new Option(hot && i === 0 ? '不加' : `${i} 个`, String(i)));
  sel.value = String(Math.max(lo, Math.min(hi, want)));
  $('galaxyNote').textContent = T.desc;
}

let fogPref = null;           // 切到同屏多人时迷雾显示为关，切回来恢复
function updateModeUi() {
  const hot = $('optMode').value === 'hotseat';
  $('modeNote').textContent = hot ? '几个人共用一块屏幕，各自按住自己颜色的星调兵；全图可见，不用能力卡，不计经验' : '';
  if (hot && !$('optFog').disabled) { fogPref = $('optFog').checked; $('optFog').checked = false; }
  if (!hot && $('optFog').disabled && fogPref !== null) $('optFog').checked = fogPref;
  $('optFog').disabled = hot;
  $('optFog').closest('.toggle').classList.toggle('dim', hot);
  $('deckBox').hidden = hot;
}
function noteChallenge() { $('challengeNote').textContent = CHALLENGES[$('optChallenge').value].desc; }

{
  const o = load(KEY.opts, {});
  if (o.galaxy && GALAXY_TYPES[o.galaxy]) $('optGalaxy').value = o.galaxy;
  if (o.challenge && CHALLENGES[o.challenge]) $('optChallenge').value = o.challenge;
  if (o.time !== undefined) $('optTime').value = String(o.time);
  if (o.fog !== undefined) $('optFog').checked = !!o.fog;
  if (o.mode === 'hotseat') $('optMode').value = 'hotseat';
  if (o.ai !== undefined) aiPref.solo = o.ai;
  if (o.hotAi !== undefined) aiPref.hotseat = o.hotAi;
  if (o.players) aiPref.players = o.players;
  fillCounts();
  updateModeUi();
  noteChallenge();
  renderProfile();
  renderDeck();
  $('anomalyList').innerHTML = Object.values(ANOMALIES).map((a) =>
    `<li><span class="an">${a.name}</span>：${a.good ? `<span class="good">${a.good}</span>` : ''}${a.good && a.bad ? '；' : ''}${a.bad ? `<span class="bad">${a.bad}</span>` : ''}</li>`).join('');
}
$('optGalaxy').addEventListener('change', fillCounts);
$('optMode').addEventListener('change', () => { fillCounts(); updateModeUi(); });
$('optPlayers').addEventListener('change', () => { aiPref.players = +$('optPlayers').value; fillCounts(); });
$('optAi').addEventListener('change', () => { aiPref[$('optMode').value === 'hotseat' ? 'hotseat' : 'solo'] = +$('optAi').value; });
$('optChallenge').addEventListener('change', noteChallenge);

function readLobby() {
  const seedText = $('optSeed').value.trim();
  const mode = $('optMode').value === 'hotseat' ? 'hotseat' : 'solo';
  return {
    mode,
    galaxy: $('optGalaxy').value,
    players: mode === 'hotseat' ? +$('optPlayers').value : 1,
    ai: +$('optAi').value,
    challenge: $('optChallenge').value,
    time: +$('optTime').value,
    fog: $('optFog').disabled && fogPref !== null ? fogPref : $('optFog').checked,
    seed: /^\d+$/.test(seedText) ? +seedText : 0,
  };
}

$('startBtn').addEventListener('click', () => {
  const o = readLobby();
  save(KEY.opts, {
    galaxy: o.galaxy, challenge: o.challenge, time: o.time, fog: o.fog, mode: o.mode,
    ai: aiPref.solo, hotAi: aiPref.hotseat, players: aiPref.players,
  });
  startGame(o);
});
$('optSeed').addEventListener('keydown', (e) => { if (e.key === 'Enter') $('startBtn').click(); });

function startTutorial() {
  startGame({ mode: 'tutorial', players: 1, ...TUTORIAL });
}

// 联机操作统一发送给房主；客户端绝不自行改规则状态。
function dispatch(cmd) {
  if (!G) return;
  if (session.mode === 'online') network?.command(cmd);
  else { submit(G,cmd); if (paused) flushCommands(G); }
}

function connectRoom(host) {
  toLobby();
  $('netError').textContent = '正在连接…';
  $('netHost').disabled = $('netJoin').disabled = true;
  const release = () => { $('netHost').disabled = $('netJoin').disabled = false; };
  network = new Network({
    open: code => { release(); $('netCode').value = code; $('netError').textContent = ''; },
    error: text => { release(); $('netError').textContent = text; toast(text); if (session.mode === 'online') {paused=true;$('netSummary').textContent=text;} },
    lost: () => {
      toast('房主已离线，对局停止。请返回大厅重新连接');
      paused = true; $('netSummary').textContent = '房主已离线 · 对局停止';
    },
    game: (state,f) => {
      networkFaction=f;
      startGame({ mode:'online', netState:state, galaxy:state.galaxy, seed:state.seed, time:state.timeLimit/60 });
      $('netPanel').open=true;
    },
    state: (m,f) => {
      if (session.mode !== 'online') return;
      const changed = networkFaction !== f; networkFaction=f; paused=m.paused;
      $('pauseVeil').hidden = !paused || menuOpen || G.over;
      $('pauseBtn').disabled = !network.host;
      $('pauseBtn').textContent = paused ? '▶' : '⏸';
      $('netPlay').hidden = !network.host;
      $('netPlay').textContent = paused ? '开始 / 继续对局' : '暂停对局';
      $('netSummary').textContent = `房号 ${$('netCode').value} · ${network.host ? '房主' : '玩家'} · ${paused ? '等待 / 暂停' : '对局中'}`;
      $('netRoster').textContent = m.members.map(p=>`${p.name}：${p.faction<0?'观战':G.factions[p.faction].name+'方'}`).join(' / ');
      const select=$('netFaction');
      if (select.options.length !== G.factions.length+1) {
        select.replaceChildren(new Option('观战中，请选择势力','-1'));
        G.factions.forEach(fac=>select.add(new Option(`${fac.name}方`,String(fac.id))));
      }
      select.value=String(f);
      for (const option of select.options) if (+option.value>=0) option.disabled=!G.factions[+option.value].alive;
      if(changed) {ui.reset();setArmed(null);R.setGame(G,me());buildCardBar();layoutInsets();}
      buildChips();updateHud(true);
    },
    chat: m => {
      const line=document.createElement('div');line.textContent=`${m.name}：${m.text}`;
      $('netChat').append(line);while($('netChat').children.length>40)$('netChat').firstChild.remove();
      $('netChat').scrollTop=$('netChat').scrollHeight;
    },
  });
  $('netChat').replaceChildren();$('netFaction').replaceChildren();
  const name=$('netName').value || profile.name || '玩家';
  if(host) {
    const o=readLobby();
    try {network.hostRoom(name,{ ...o, seed:o.seed || freshSeed(), timeLimit:o.time*60, layout:$('netLayout').value },$('netRule').value,cleanDeck(decks.free));}
    catch(e) { network.close();network=null;release();$('netError').textContent=e.message; }
  } else {
    const code=$('netCode').value.trim();
    if(!/^gillif-[a-z2-9]{6}$/.test(code)) {network=null;release();$('netError').textContent='请输入完整房号 gillif-xxxxxx';return;}
    network.joinRoom(code,name);
  }
}
$('netHost').onclick=()=>connectRoom(true);
$('netJoin').onclick=()=>connectRoom(false);
$('netFaction').onchange=()=>network?.choose(+$('netFaction').value);
$('netPlay').onclick=()=>network?.pause(!network.paused);
$('netCopy').onclick=async()=>{try {await navigator.clipboard.writeText($('netCode').value);toast('房号已复制');}catch {toast(`房号：${$('netCode').value}`);}};
$('netChatForm').onsubmit=e=>{e.preventDefault();network?.chat($('netText').value);$('netText').value='';};

// ——— 开局、结算、离开 ———

function startGame(o) {
  leaveGame();
  lastOpts = { ...o };
  const mode = o.mode || 'solo';
  const seed = o.seed || freshSeed();
  const hot = mode === 'hotseat';
  const players = hot ? Math.max(2, o.players || 2) : 1;
  G = o.netState || newGame({
    seed,
    galaxy: o.galaxy,
    factions: hot ? players + (o.ai || 0) : o.ai + 1,
    humans: mode === 'spectate' ? [] : Array.from({ length: players }, (_, i) => i),
    challenge: o.challenge,
    timeLimit: o.time * 60,
    fog: hot ? false : o.fog,
    // 同屏多人不用能力卡（一块屏幕放不下几副卡牌栏，原作也是这样）
    deck: hot || mode === 'spectate' ? [] : o.deck ?? currentDeck(),
  });
  if (autopilot && mode !== 'online') G.factions[0].human = false;
  session = { mode, ranked: profile.ranked && (mode === 'solo' || mode === 'tutorial') && !autopilot, settled: false };
  window.gillif = {
    get G() { return G; }, step: () => step(G), R, ui, arm: setArmed, cast: castAbility,
    get profile() { return profile; }, get tutorial() { return tutorial; }, get session() { return session; },
  };   // 控制台与自动化测试用
  const ff = +(params.get('ff') || 0);
  if (ff > 0 && !o.ffDone) {
    o.ffDone = true;
    const n = Math.round(ff / RULES.dt);
    for (let i = 0; i < n && !G.over; i++) { step(G); G.events.length = 0; }
  }

  $('lobby').hidden = true;
  $('game').hidden = false;
  $('endPanel').hidden = true;
  $('menu').hidden = true;
  menuOpen = false;
  endShown = false;
  discovered = new Set();
  hideTip(true);
  ui.reset();
  ui.guide = null;
  setArmed(null);
  $('feed').innerHTML = '';
  $('pauseBtn').disabled = mode === 'online' && !network.host;
  setPaused(mode === 'online' ? network.paused ?? true : false);
  $('netPanel').hidden = mode !== 'online';
  acc = 0;
  lastFrame = performance.now();
  $('toast').innerHTML = '';
  $('hint').hidden = !!load(KEY.hint, false) || params.has('nohint') || mode === 'spectate' || mode === 'tutorial';
  buildChips();
  updateChips();
  buildCardBar();
  layoutInsets();
  R.setGame(G, me());
  tutorial = mode === 'tutorial' && me() >= 0 ? createTutorial({
    G, me: me(), ui, R, bubble: $('tutor'), cardBar: $('cardBar'),
    onDone: () => {
      if (profile.tutorial !== 'done') toast('新手教程完成！');
      profile.tutorial = 'done';
      saveProfile();
    },
  }) : null;
  updateHud(true);
  // 开局在母星上闪两圈信号，免得找不到自己在哪（同屏多人每位玩家都闪）
  const homes = hot ? G.factions.filter((f) => f.human).map((f) => f.home) : me() >= 0 ? [G.factions[me()].home] : [];
  for (const h of homes) R.onEvent({ t: 'ping', star: h, f: G.stars[h].owner }, performance.now() / 1000 + 0.3);
  const T = GALAXY_TYPES[G.galaxy], C = CHALLENGES[G.challenge];
  const ais = G.factions.filter((f) => !f.human).length;
  toast(mode === 'spectate' ? '观战模式：全部由 AI 操控'
    : mode === 'online' ? '房间已连接：选择势力，等待房主开始'
    : mode === 'tutorial' ? '新手教程：跟着提示走，随时可以跳过'
      : hot ? `同屏 ${players} 人${ais ? ` + ${ais} 个 AI（${C.name}）` : ''} · ${T.name}星系 · 星图 ${seed}`
        : `你是${G.factions[0].name}方 · ${C.name} · ${T.name}星系 · ${G.factions.length - 1} 个对手 · 星图 ${seed}`);
  if (lastForfeit) { toast(forfeitText(lastForfeit)); lastForfeit = null; }
}

/** 结算这一局的经验（计入成长的单人局，每局一次）。中途离开时按认输：领先者不记胜负 */
function settle() {
  if (!G || !session.ranked || session.settled) return null;
  session.settled = true;
  const mine = me();
  if (mine < 0) return null;
  const res = settleGame(profile, {
    score: score(G, mine),
    time: G.time,
    winner: (G.over ? G.winner : leader(G)) === mine,
    finished: G.over,
    challenge: G.challenge,
    maxStars: G.factions[mine].stats.maxStars,
  });
  if (res.counted) { profile = res.profile; saveProfile(); }
  return res;
}

/** 离开当前对局（换局或回大厅）：没打完的按认输结算，收起教程 */
function leaveGame() {
  if (!G) return;
  if (session.mode === 'online') {network?.close();network=null;networkFaction=-1;$('netPanel').hidden=true;}
  if (tutorial) { tutorial.stop(); tutorial = null; }
  if (!G.over) {
    const res = settle();
    if (res && res.counted) lastForfeit = res;
  }
}

function toLobby() {
  leaveGame();
  network?.close(); network=null; networkFaction=-1;
  G = null;
  hideTip(true);
  setArmed(null);
  ui.reset();
  ui.guide = null;
  $('game').hidden = true;
  $('lobby').hidden = false;
  renderProfile();
  renderDeck();
  lastForfeit = null;
  document.title = 'Gillíf · 星路争霸';
}

// ——— 暂停与菜单 ———

function setPaused(p) {
  if (session.mode === 'online' && network) {
    if (!network.host) p = network.paused;
    else if (network.room.paused !== p) network.pause(p);
  }
  paused = p;
  $('pauseBtn').textContent = p ? '▶' : '⏸';
  $('pauseVeil').hidden = !p || menuOpen || !G || G.over;
}

function openMenu(open) {
  if (!G) return;
  menuOpen = open;
  $('menu').hidden = !open;
  $('menuNote').hidden = !(open && session.ranked && !session.settled && !G.over && G.time > GROWTH.minGameSec);
  if (session.mode !== 'online') {if (open) { menuWasPaused = paused; setPaused(true); } else setPaused(menuWasPaused);}
}

$('pauseBtn').addEventListener('click', () => { if (G && !G.over) setPaused(!paused); });
$('menuBtn').addEventListener('click', () => openMenu(!menuOpen));
$('helpBtn').addEventListener('click', () => { $('hint').hidden = !$('hint').hidden; });
$('hintClose').addEventListener('click', () => { $('hint').hidden = true; save(KEY.hint, true); });

function onAction(act) {
  if (session.mode === 'online' && ['restart','new'].includes(act)) {toast('联机请返回大厅后创建新房间');return;}
  if (act === 'resume') openMenu(false);
  else if (act === 'restart') startGame({ ...lastOpts, seed: G ? G.seed : lastOpts.seed });
  else if (act === 'new') startGame(session.mode === 'tutorial' ? readLobby() : { ...lastOpts, seed: 0 });
  else if (act === 'lobby') toLobby();
  else if (act === 'watch') $('endPanel').hidden = true;
}
for (const b of document.querySelectorAll('[data-act]')) b.addEventListener('click', () => onAction(b.dataset.act));

window.addEventListener('keydown', (e) => {
  if (!G || $('game').hidden) return;
  if (e.code === 'Space') {
    e.preventDefault();
    if (!G.over && !menuOpen) setPaused(!paused);
  } else if (e.key === 'Escape') {
    if (armed) { setArmed(null); return; }
    if (G.over) { $('endPanel').hidden = !$('endPanel').hidden; return; }
    openMenu(!menuOpen);
  } else if (/^[1-9]$/.test(e.key) && !menuOpen && me() >= 0) {
    const key = G.factions[me()].deck[+e.key - 1];
    if (key) toggleArm(key);
  }
});

document.addEventListener('visibilitychange', () => {
  if (session.mode !== 'online' && document.hidden && G && !G.over && !paused) setPaused(true); // 切走时自动暂停
});
window.addEventListener('resize', () => { if (G) { layoutInsets(); R.resize(); } });
window.addEventListener('pagehide', () => { if (G && !G.over) settle(); network?.close(); });   // 关页面也按认输结算

// 镜头给顶栏（窄屏时会折成两行）和右侧卡牌栏让位
function layoutInsets() {
  const hud = $('hud').getBoundingClientRect();
  R.insets.top = Math.ceil(hud.bottom) + 6;
  const bar = $('cardBar');
  bar.style.top = `${Math.ceil(hud.bottom) + 8}px`;
  R.insets.right = bar.hidden ? 14 : bar.offsetWidth + 22;
}

// ——— HUD ———

function buildChips() {
  const bar = $('factionBar');
  bar.innerHTML = '';
  const order = G.factions.slice().sort((a, b) => (b.human - a.human) || (a.id - b.id));
  for (const f of order) {
    const el = document.createElement('span');
    el.className = 'chip' + (f.id === me() || (session.mode === 'hotseat' && f.human) ? ' me' : '');
    el.dataset.f = f.id;
    if (f.personality) {
      const P = PERSONALITIES[f.personality];
      el.title = `${f.name}方 · ${P.name}：${P.deck.map((c) => ABILITIES[c].name).join('、')}`;
    } else if (session.mode === 'hotseat') {
      el.title = f.human ? `${f.name}方 · 玩家` : `${f.name}方 · AI`;
    }
    el.innerHTML = `<i style="background:${f.color};color:${f.color}"></i><span class="nm"></span><span class="st"></span><small class="sh"></small>`;
    bar.appendChild(el);
  }
}

function updateChips() {
  for (const el of $('factionBar').children) {
    const f = G.factions[+el.dataset.f];
    el.classList.toggle('out', !f.alive);
    el.querySelector('.nm').textContent = f.id === me() ? '你' : f.name;
    el.querySelector('.st').textContent = `${f.stars} 星`;
    el.querySelector('.sh').textContent = `${f.total} 船`;
  }
}

let hudAt = 0;
function updateHud(force) {
  const now = performance.now();
  if (!force && now - hudAt < 200) return;
  hudAt = now;
  updateChips();
  const clock = $('clock');
  if (G.timeLimit > 0) {
    const left = Math.max(0, G.timeLimit - G.time);
    clock.textContent = fmt(left);
    clock.classList.toggle('urgent', left < 60);
  } else {
    clock.textContent = fmt(G.time);
    clock.classList.remove('urgent');
  }
  checkDiscoveries();
  updateCardBar();
  if (armed && (G.over || me() < 0 || !cardReady(G, me(), armed))) setArmed(null);
  if (tip.id >= 0) $('starTip').innerHTML = tipContent(tip.id, tip.headline);
  if (tutorial) tutorial.update();
}

// ——— 能力：卡牌栏、瞄准、动态 ———

let armed = null;

function buildCardBar() {
  const bar = $('cardBar');
  bar.innerHTML = '';
  const mine = me();
  const list = mine >= 0 ? G.factions[mine].deck : [];
  bar.hidden = !list.length;
  list.forEach((key, i) => {
    const a = ABILITIES[key];
    const el = document.createElement('button');
    el.className = 'gcard';
    el.dataset.card = key;
    el.title = `${a.name}（按 ${i + 1}）：${a.desc}`;
    el.innerHTML = `<i class="pie"></i><span class="key">${i + 1}</span><span class="nm">${a.name}</span><span class="cd"></span>`;
    el.addEventListener('click', () => toggleArm(key));
    bar.appendChild(el);
  });
}

function updateCardBar() {
  const mine = me();
  if (!G || mine < 0) return;
  const fac = G.factions[mine];
  for (const el of $('cardBar').children) {
    const key = el.dataset.card;
    const left = Math.max(0, fac.ready[key] - G.time);
    const eff = ownEffect(G, key, mine);
    el.classList.toggle('cooling', left > 0);
    el.classList.toggle('armed', armed === key);
    el.classList.toggle('active', !!eff);
    el.style.setProperty('--p', left > 0 ? (left / (fac.cdTotal[key] || 1)).toFixed(3) : '0');
    el.querySelector('.cd').textContent = left > 0 ? String(Math.ceil(left)) : '';
  }
}

function toggleArm(key) {
  if (!G || G.over || me() < 0) return;
  if (armed === key) { setArmed(null); return; }
  if (!cardReady(G, me(), key)) {
    const left = Math.ceil(G.factions[me()].ready[key] - G.time);
    toast(`「${ABILITIES[key].name}」还要 ${left} 秒才能再用`);
    return;
  }
  setArmed(key);
}

function setArmed(key) {
  armed = key;
  Object.assign(ui, { armed: key, abSrc: -1, abHover: -1, abPress: -1, abDragging: false });
  const b = $('armBanner');
  if (key) {
    const a = ABILITIES[key];
    b.innerHTML = `<b>${a.name}</b>　${isTwoStar(key) ? '' : '点'}${TARGET_TEXT[a.target]}　<span class="esc">Esc / 右键取消</span>`;
    b.hidden = false;
    $('hint').hidden = true;
  } else {
    b.hidden = true;
  }
  if (G) updateCardBar();
}

function castAbility(card, src, dst) {
  if (!G || me() < 0) return;
  dispatch({ type: 'ability', f: me(), card, src, dst });
  setArmed(null);
}

function denyTarget(id) {
  if (id >= 0) R.flashDeny(id, performance.now() / 1000);
  const b = $('armBanner');
  b.classList.remove('shake');
  void b.offsetWidth;          // 重新触发动画
  b.classList.add('shake');
}

/** 星的称呼：你的星 / 红方的星 / 中立星 */
function starLabel(id, o = G.stars[id].owner) {
  return o < 0 ? '中立星' : o === me() ? '你的星' : `${G.factions[o].name}方的星`;
}

const FEED_N = { recruits: (n) => `+${n} 艘`, explosion: (n) => `炸掉 ${n} 艘`, fleet: (n) => `策反 ${n} 艘`,
  teleport: (n) => `${n} 艘出发`, purge: (n) => `清除 ${n} 艘`, bribe: (n) => `控制度 +${n}` };

function abilityFeed(e) {
  const mine = me();
  const seen = e.f === mine || R.starView(e.dst).seen || R.starView(e.src).seen;
  if (!seen) return;
  const fac = G.factions[e.f];
  const a = ABILITIES[e.card];
  const who = e.f === mine ? '你' : `${fac.name}方${fac.personality ? `（${PERSONALITIES[fac.personality].name}）` : ''}`;
  const where = e.card === 'stealth' || e.card === 'purge' ? '' : ` → ${starLabel(e.dst, e.owner)}`;
  const extra = FEED_N[e.card] && e.n ? `，${FEED_N[e.card](e.n)}` : '';
  // 冲玩家来的标红（同屏多人时，冲任何一位玩家来的都算）
  const hostile = e.f !== mine && e.owner >= 0 && (e.owner === mine || (session.mode === 'hotseat' && G.factions[e.owner].human));
  const box = $('feed');
  const el = document.createElement('div');
  el.className = 'feed-item' + (hostile ? ' hostile' : '');
  el.innerHTML = `<i class="dot" style="background:${fac.color}"></i>${who} · <b>${a.name}</b>${where}${extra}`;
  box.appendChild(el);
  setTimeout(() => el.remove(), 6000);
  while (box.children.length > 5) box.firstChild.remove();
}

function toast(text) {
  const box = $('toast');
  const el = document.createElement('div');
  el.className = 'toast-item';
  el.textContent = text;
  box.appendChild(el);
  setTimeout(() => el.remove(), 3300);
  while (box.children.length > 4) box.firstChild.remove();
}

// ——— 星体详情卡 ———

let tip = { id: -1, until: 0, sticky: false, headline: '' };
let discovered = new Set();

function factionLabel(f) { return f === me() ? '你' : `${G.factions[f].name}`; }

function tipContent(id, headline) {
  const s = G.stars[id];
  const v = R.starView(id);
  const mine = me();
  const who = s.owner < 0 ? '中立星' : s.owner === mine ? '你的星' : `${G.factions[s.owner].name}方的星`;
  const out = [];
  if (headline) out.push(`<div class="kind">${headline}</div>`);
  out.push(`<div class="t">${who}</div>`);
  if (s.anomaly && (v.explored || s.anomaly === 'nebula')) {
    const A = ANOMALIES[s.anomaly];
    if (!headline) out.push(`<div class="kind">${A.name}</div>`);
    if (A.good) out.push(`<div class="good">＋ ${A.good}</div>`);
    if (A.bad) out.push(`<div class="bad">－ ${A.bad}</div>`);
    out.push(`<div class="lore">${A.lore}</div>`);
  } else if (!v.explored) {
    out.push('<div class="lore">尚未探索</div>');
  }
  if (v.seen) {
    const fl = [];
    for (let f = 0; f < s.ships.length; f++) {
      if (s.ships[f] <= 0 && f !== s.owner) continue;
      fl.push(`<span><i class="dot" style="background:${G.factions[f].color}"></i>${factionLabel(f)} ${s.ships[f]}</span>`);
    }
    if (fl.length) out.push(`<div class="row">驻军 ${fl.join('')}</div>`);
    const ctl = [];
    for (let f = 0; f < s.control.length; f++) if (s.control[f] > 0) ctl.push(`${factionLabel(f)} ${s.control[f]}`);
    if (ctl.length && !(s.owner >= 0 && s.control[s.owner] === 100 && ctl.length === 1)) out.push(`<div>控制度 ${ctl.join(' · ')}</div>`);
  } else if (v.explored) {
    out.push('<div class="lore">不在视野内</div>');
  }
  return out.join('');
}

function showTip(id, { ms = 0, sticky = false, headline = '' } = {}) {
  tip = { id, until: ms ? performance.now() + ms : 0, sticky, headline };
  const el = $('starTip');
  el.innerHTML = tipContent(id, headline);
  el.classList.toggle('discover', !!headline);
  el.hidden = false;
  placeTip();
}

function hideTip(force) {
  if (!force && tip.sticky && performance.now() < tip.until) return;
  tip = { id: -1, until: 0, sticky: false, headline: '' };
  $('starTip').hidden = true;
}

function placeTip() {
  if (tip.id < 0 || !G) return;
  const el = $('starTip');
  const p = R.starScreen(tip.id);
  const w = el.offsetWidth, h = el.offsetHeight;
  let x = p.x + p.r * 2.4 + 10, y = p.y - h / 2;
  if (x + w > innerWidth - 8) x = p.x - p.r * 2.4 - 10 - w;
  x = Math.max(8, Math.min(innerWidth - w - 8, x));
  y = Math.max(R.insets.top, Math.min(innerHeight - h - 8, y));
  el.style.left = `${Math.round(x)}px`;
  el.style.top = `${Math.round(y)}px`;
}

function onHover(id) {
  if (!G) return;
  if (id < 0) { if (!(tip.sticky && performance.now() < tip.until)) hideTip(); return; }
  if (tip.id !== id || tip.sticky) showTip(id);
}

function onInspect(id) {
  if (!G) return;
  if (id < 0) { hideTip(true); return; }
  showTip(id, { ms: 4000 });
}

/** 第一次见到某种异常天体（到过那颗星）时，弹出它的介绍；每种只介绍一次 */
function checkDiscoveries() {
  if (!G.fog || me() < 0 || G.over) return;
  if (tip.sticky && performance.now() < tip.until) return;
  const known = new Set(load(KEY.anomalies, []));
  for (const s of G.stars) {
    if (!s.anomaly || discovered.has(s.id) || !s.visited[me()]) continue;
    discovered.add(s.id);
    if (known.has(s.anomaly)) continue;
    known.add(s.anomaly);
    save(KEY.anomalies, [...known]);
    showTip(s.id, { ms: 6000, sticky: true, headline: `发现异常天体：${ANOMALIES[s.anomaly].name}` });
    return;
  }
}

// ——— 事件 ———

function drainEvents(nowSec) {
  if (!G.events.length) return;
  const mine = me();
  for (const e of G.events) {
    R.onEvent(e, nowSec);
    if (e.t === 'out') {
      toast(e.f === mine ? '你的势力被消灭了' : `${G.factions[e.f].name}方被消灭了`);
    } else if (e.t === 'capture' && e.from >= 0 && G.factions[e.from].home === e.star
      && (e.from === mine || (session.mode === 'hotseat' && G.factions[e.from].human))) {
      // 只提示丢掉母星这种大事，免得刷屏
      toast(e.from === mine ? `母星被${G.factions[e.f].name}方夺走了！` : `${G.factions[e.from].name}方的母星被${G.factions[e.f].name}方夺走了！`);
    } else if (e.t === 'ability') {
      abilityFeed(e);
      if (e.f === mine) updateCardBar();
    } else if (e.t === 'end') {
      showEnd(e);
    }
  }
  G.events.length = 0;
}

function showEnd(e) {
  endShown = true;
  hideTip(true);
  setArmed(null);
  setPaused(false);
  $('pauseVeil').hidden = true;
  const mine = me();
  const hot = session.mode === 'hotseat';
  const title = $('endTitle'), sub = $('endSub');
  const wf = e.winner >= 0 ? G.factions[e.winner] : null;
  if (mine < 0) {
    title.textContent = wf ? `${wf.name}方获胜` : '结束';
    title.className = 'win';
  } else if (e.winner === mine) {
    title.textContent = '胜利';
    title.className = 'win';
  } else {
    title.textContent = '失败';
    title.className = 'lose';
  }
  const why = { conquest: '一统星系', time: '时间到，按星数判胜负', defeat: hot ? '玩家全部出局' : '你的势力被消灭了' }[e.reason] || '';
  const lead = wf && e.winner !== mine && mine >= 0 ? `${wf.name}方以 ${wf.stars} 颗星领先` : '';
  const lines = [[why, lead, `用时 ${fmt(G.time)}`].filter(Boolean).join(' · ')];
  if (mine >= 0) {
    const sc = score(G, mine);
    const C = CHALLENGES[G.challenge];
    const best = load(KEY.best, {});
    const prev = best[G.challenge] || 0;
    let line = `得分 ${fmtNum(sc)}（${C.name}难度 ×${C.score}）`;
    if (G.time < RULES.scoreMinSec) line = '对局不足 2 分钟，不计分';
    else if (sc > prev) { best[G.challenge] = sc; save(KEY.best, best); line += prev ? ` · 新纪录！此前最高 ${fmtNum(prev)}` : ' · 首个纪录'; }
    else line += ` · ${C.name}最高 ${fmtNum(prev)}`;
    lines.push(line);
  }
  sub.innerHTML = lines.map((l) => `<div>${l}</div>`).join('');
  showXp(mine >= 0 && (session.mode === 'solo' || session.mode === 'tutorial') && !autopilot ? settle() ?? { counted: false, reason: profile.ranked ? 'done' : 'free' } : null);

  const rows = G.factions.slice().sort((a, b) => (b.stars - a.stars) || (b.total - a.total));
  const head = '<tr><th>势力</th><th>星</th><th>占领</th><th>失守</th><th>最多星</th><th>造船</th><th>损失</th><th>最多船</th><th>得分</th></tr>';
  const body = rows.map((f) => {
    const s = f.stats;
    const who = f.id === mine ? `${playerName()}（${f.name}）`
      : `${f.name}方${hot && f.human ? '<small>（玩家）</small>' : f.personality ? `<small>（${PERSONALITIES[f.personality].name}）</small>` : ''}`;
    const isMe = f.id === mine || (hot && f.human);
    return `<tr class="${isMe ? 'me' : ''} ${f.alive ? '' : 'out'}"><td><span class="dot" style="background:${f.color}"></span>${who}</td>`
      + `<td>${f.stars}</td><td>${s.captured}</td><td>${s.starsLost}</td><td>${s.maxStars}</td><td>${s.created}</td><td>${s.lost}</td><td>${s.maxShips}</td><td>${fmtNum(score(G, f.id))}</td></tr>`;
  }).join('');
  $('endStats').innerHTML = head + body;
  $('endPanel').hidden = false;
  document.title = `${title.textContent} · Gillíf`;
}

/** 结算面板里的经验条：从结算前的进度涨到结算后（跨级时从头涨起） */
function showXp(res) {
  const box = $('endXp');
  if (!res) { box.hidden = true; return; }
  box.hidden = false;
  const fill = $('endXpFill');
  const lv = $('endXpLv');
  if (!res.counted) {
    $('endXpLine').textContent = res.reason === 'free' ? '自由模式，不计经验'
      : res.reason === 'short' ? `对局不足 ${GROWTH.minGameSec} 秒，不计经验` : '这一局已经结算过了';
    const sm = profileSummary(profile);
    fill.style.transition = 'none';
    fill.style.width = `${(sm.progress * 100).toFixed(1)}%`;
    lv.textContent = `Lv ${sm.level} · ${sm.title}`;
    return;
  }
  const b = res.before, a = res.after;
  const verdict = res.won ? ' · 记一胜' : res.lost ? ' · 记一负' : '';
  $('endXpLine').innerHTML = res.xp > 0
    ? `经验 <b>+${fmtNum(res.xp)}</b>${res.mult > 1.001 ? `<small>（前期加成 ×${res.mult.toFixed(1)}）</small>` : ''}${verdict}`
    : `没有得分，经验不变${verdict}`;
  fill.style.transition = 'none';
  fill.style.width = `${(a.level > b.level ? 0 : b.progress * 100).toFixed(1)}%`;
  void fill.offsetWidth;
  fill.style.transition = '';
  fill.style.width = `${(a.progress * 100).toFixed(1)}%`;
  if (a.level > b.level) {
    const unlocked = Object.keys(ABILITIES).filter((c) => { const u = unlockLevel(c); return u > b.level && u <= a.level; });
    const parts = [`升到 <b>Lv ${a.level}</b>！`];
    if (a.title !== b.title) parts.push(`新头衔「${a.title}」`);
    if (a.points > b.points) parts.push(`能力点 ${b.points} → ${a.points}`);
    if (unlocked.length) parts.push(`解锁 ${unlocked.map((c) => `「${ABILITIES[c].name}」`).join('')}`);
    lv.innerHTML = parts.join(' · ');
    lv.classList.add('up');
  } else {
    const need = a.level >= GROWTH.maxLevel ? 0 : a.level * GROWTH.expPerLevel - res.profile.exp;
    lv.textContent = `Lv ${a.level} · ${a.title}${need > 0 ? ` · 距下一级 ${fmtNum(need)}` : ''}`;
    lv.classList.remove('up');
  }
}

// ——— 主循环 ———

function frame(t) {
  requestAnimationFrame(frame);
  if (!G) return;
  const dt = Math.min(0.25, (t - lastFrame) / 1000);
  lastFrame = t;
  const nowSec = t / 1000;
  if (!paused && !G.over && (session.mode !== 'online' || network?.host)) {
    acc += dt * (session.mode === 'online' ? 1 : speed);
    let n = 0;
    while (acc >= RULES.dt && n < 400) { if (session.mode === 'online') network.tick(); else step(G); acc -= RULES.dt; n++; }
    if (n >= 400) acc = 0;
  }
  network?.pump(nowSec);
  drainEvents(nowSec);
  if (G.over && !endShown) showEnd({ winner: G.winner, reason: G.endReason });
  ui.me = me();
  const d0 = performance.now();
  R.draw(G.time + (paused || G.over ? 0 : acc), nowSec, ui);
  if (perf) perf.push(performance.now() - d0);
  if (tip.id >= 0) {
    if (tip.until && performance.now() > tip.until) hideTip(true);
    else placeTip();
  }
  updateHud(false);
  if (tutorial) tutorial.place();
}

// ?perf=1：开局 3 秒后量 180 帧的绘制耗时，结果写进标题
let perf = null;
if (params.get('perf') === '1') {
  setTimeout(() => { perf = []; }, 3000);
  const check = setInterval(() => {
    if (!perf || perf.length < 180) return;
    clearInterval(check);
    const v = perf.slice().sort((a, b) => a - b);
    const avg = v.reduce((a, b) => a + b, 0) / v.length;
    document.title = `PERF draw avg=${avg.toFixed(2)}ms p95=${v[Math.floor(v.length * 0.95)].toFixed(2)}ms transit=${G ? G.transit.length : 0}`;
    perf = null;
  }, 200);
}
requestAnimationFrame((t) => { lastFrame = t; requestAnimationFrame(frame); });

// ——— 直达开局（开发与自动化测试）———

const selftest = params.get('selftest');
if (params.get('tutorial') === '1') {
  startTutorial();
  if (selftest === '1') setTimeout(selfTestTutorial, 600);
} else if (params.get('auto') === '1') {
  const galaxy = GALAXY_TYPES[params.get('galaxy')] ? params.get('galaxy') : 'large';
  const maxF = GALAXY_TYPES[galaxy].maxFactions;
  const hotN = Math.max(0, Math.min(maxF, +(params.get('hotseat') || 0)));
  const mode = params.get('spectate') === '1' ? 'spectate' : hotN >= 2 ? 'hotseat' : 'solo';
  startGame({
    mode,
    galaxy,
    players: hotN,
    ai: mode === 'hotseat' ? Math.max(0, Math.min(maxF - hotN, +(params.get('ai') || 0)))
      : Math.max(1, Math.min(maxF - 1, +(params.get('ai') || 3))),
    challenge: CHALLENGES[params.get('challenge')] ? params.get('challenge') : 'normal',
    time: params.has('time') ? +params.get('time') : 15,
    fog: params.get('fog') !== '0',
    seed: +(params.get('seed') || 0),
  });
  if (selftest === '1') setTimeout(mode === 'hotseat' ? selfTestHotseat : selfTest, 1500);
  if (selftest === 'xp') setTimeout(selfTestXp, 800);
} else if (selftest === 'lobby') {
  setTimeout(selfTestLobby, 300);
}

// ——— 自检：在页面上合成真实的输入，核对结果，写进标题（无头浏览器读 document.title）———
// 注意 --dump-dom 模式下没有动画帧：需要推演的检查都手动 step(G)。

const firePointer = (type, p, buttons, id = 7, kind = 'mouse') => {
  const rect = canvas.getBoundingClientRect();
  canvas.dispatchEvent(new PointerEvent(type, {
    bubbles: true, cancelable: true, pointerId: id, pointerType: kind, isPrimary: id === 7,
    button: 0, buttons, clientX: rect.left + p.x, clientY: rect.top + p.y,
  }));
};
const dragPointer = (a, b, id = 7, kind = 'mouse') => {
  firePointer('pointerdown', a, 1, id, kind);
  for (let i = 1; i <= 6; i++) firePointer('pointermove', { x: a.x + (b.x - a.x) * i / 6, y: a.y + (b.y - a.y) * i / 6 }, 1, id, kind);
};

function selfTest() {
  const out = [];
  const fire = (type, p, buttons) => firePointer(type, p, buttons);
  const home = G.factions[me()].home;
  const nb = G.stars[home].links[0];
  const a = R.starScreen(home), b = R.starScreen(nb);
  // 1. 按住 → 拖向邻星 → 松手
  dragPointer(a, b);
  const aimed = ui.hover;
  fire('pointerup', b, 0);
  flushCommands(G);
  out.push(G.stars[home].order === nb && aimed === nb ? 'drag-ok' : `drag-FAIL(${G.stars[home].order}/${aimed}->${nb})`);
  // 2. 单击 = 原地防守
  setTimeout(() => {
    fire('pointerdown', a, 1); fire('pointerup', a, 0);
    flushCommands(G);
    out.push(G.stars[home].order === -1 ? 'tap-ok' : 'tap-FAIL');
    // 3. 紧接着再点一下 = 双击打信号
    G.events.length = 0;
    fire('pointerdown', a, 1); fire('pointerup', a, 0);
    flushCommands(G);
    out.push(G.events.some((e) => e.t === 'ping') ? 'ping-ok' : 'ping-FAIL');
    // 4. 点邻近的中立星：不下指令，只弹出详情
    const before = JSON.stringify(G.log);
    const p = R.starScreen(nb);
    hideTip(true);
    fire('pointerdown', p, 1); fire('pointerup', p, 0); flushCommands(G);
    out.push(JSON.stringify(G.log) === before ? 'foreign-ok' : 'foreign-FAIL');
    out.push(!$('starTip').hidden && tip.id === nb ? 'tip-ok' : 'tip-FAIL');
    // 5. 迷雾：开局只认得母星和邻星
    const knownN = G.stars.filter((s) => R.starView(s.id).known).length;
    const expect = 1 + G.stars[home].links.length;
    out.push(!G.fog || knownN === expect ? 'fog-ok' : `fog-FAIL(${knownN}/${expect})`);
    // 6. 能力：选「防御」→ 点自己的母星
    const fac = G.factions[me()];
    for (const c of ['defense', 'teleport']) { if (!fac.deck.includes(c)) fac.deck.push(c); fac.ready[c] = 0; fac.cdTotal[c] = 1; }
    buildCardBar();
    $('cardBar').querySelector('[data-card="defense"]').click();
    const armedOk = ui.armed === 'defense' && !$('armBanner').hidden;
    fire('pointerdown', a, 1); fire('pointerup', a, 0); flushCommands(G);
    out.push(armedOk && G.effects.some((x) => x.card === 'defense' && x.dst === home) && !ui.armed ? 'ability-ok' : 'ability-FAIL');
    drainEvents(performance.now() / 1000);
    out.push(/防御/.test($('feed').textContent) ? 'feed-ok' : 'feed-FAIL');
    // 7. 两步卡：按 2 号键选「突击队」，从母星拖到邻星
    G.stars[home].ships[me()] = Math.max(G.stars[home].ships[me()], 30);
    window.dispatchEvent(new KeyboardEvent('keydown', { key: String(fac.deck.indexOf('teleport') + 1) }));
    dragPointer(a, b);
    fire('pointerup', b, 0); flushCommands(G);
    out.push(G.transit.some((t) => t.tp && t.from === home && t.to === nb) ? 'teleport-ok' : 'teleport-FAIL');
    // 8. 点不合法的目标：不发动，提示条抖一下
    fac.ready.defense = 0;
    $('cardBar').querySelector('[data-card="defense"]').click();
    const logN = G.log.length;
    fire('pointerdown', b, 1); fire('pointerup', b, 0); flushCommands(G);
    out.push(G.log.length === logN && $('armBanner').classList.contains('shake') ? 'deny-ok' : 'deny-FAIL');
    setArmed(null);
    document.title = 'SELFTEST ' + out.join(' ');
  }, 400);
}

/** 同屏多人：两根手指同时从两位玩家的母星各拖各的 */
function selfTestHotseat() {
  const out = [];
  const [A, B] = G.factions.filter((f) => f.human).map((f) => f.home);
  const na = G.stars[A].links[0], nb = G.stars[B].links[0];
  const pa = R.starScreen(A), pb = R.starScreen(B), ta = R.starScreen(na), tb = R.starScreen(nb);
  firePointer('pointerdown', pa, 1, 21, 'touch');
  firePointer('pointerdown', pb, 1, 22, 'touch');
  for (let i = 1; i <= 6; i++) {
    firePointer('pointermove', { x: pa.x + (ta.x - pa.x) * i / 6, y: pa.y + (ta.y - pa.y) * i / 6 }, 1, 21, 'touch');
    firePointer('pointermove', { x: pb.x + (tb.x - pb.x) * i / 6, y: pb.y + (tb.y - pb.y) * i / 6 }, 1, 22, 'touch');
  }
  const both = ui.drags.size === 2;
  firePointer('pointerup', ta, 0, 21, 'touch');
  firePointer('pointerup', tb, 0, 22, 'touch');
  flushCommands(G);
  const cmds = G.log.filter((c) => c.type === 'order');
  out.push(both && G.stars[A].order === na && G.stars[B].order === nb && cmds.some((c) => c.f === 0) && cmds.some((c) => c.f === 1)
    ? 'multi-ok' : `multi-FAIL(${both}/${G.stars[A].order}->${na}/${G.stars[B].order}->${nb})`);
  // 点中立星只看详情
  const neutral = G.stars.find((s) => s.owner < 0);
  const n0 = G.log.length;
  const pn = R.starScreen(neutral.id);
  firePointer('pointerdown', pn, 1, 23, 'touch'); firePointer('pointerup', pn, 0, 23, 'touch'); flushCommands(G);
  out.push(G.log.length === n0 ? 'foreign-ok' : 'foreign-FAIL');
  out.push(me() === -1 && G.stars.every((s) => R.starView(s.id).known && R.starView(s.id).seen) ? 'reveal-ok' : 'reveal-FAIL');
  out.push($('cardBar').hidden && G.factions.every((f) => !f.human || f.deck.length === 0) ? 'nocards-ok' : 'nocards-FAIL');
  document.title = 'HOTSEAT ' + out.join(' ');
}

/** 教程：头四步按顺序出现，锚在对的星上，完成动作后前进 */
function selfTestTutorial() {
  const out = [];
  const T = tutorial;
  const run = (sec) => { for (let i = 0; i < sec * 20 && !G.over; i++) { step(G); G.events.length = 0; } };
  const tick = (sec = 0.3) => { run(sec); T.update(); };
  const near = (id) => {
    const p = R.starScreen(id), r = $('tutor').getBoundingClientRect();
    const dx = Math.max(r.left - p.x, 0, p.x - r.right), dy = Math.max(r.top - p.y, 0, p.y - r.bottom);
    return Math.hypot(dx, dy) < 160;
  };
  const home = G.factions[0].home;
  tick(1);
  out.push(T.step === 'home' && !$('tutor').hidden && near(home) && ui.guide && ui.guide.star === home ? 'home-ok' : `home-FAIL(${T.step})`);
  $('tutor').querySelector('.tu-ok').click();
  tick(1.5);
  const tgt = T.dragTarget;
  out.push(T.step === 'drag' && ui.guide && ui.guide.from === home && ui.guide.to === tgt && near(tgt) ? 'guide-ok' : `guide-FAIL(${T.step})`);
  dragPointer(R.starScreen(home), R.starScreen(tgt));
  firePointer('pointerup', R.starScreen(tgt), 0);
  flushCommands(G);
  T.update();
  out.push(T.step === null && G.stars[home].order === tgt ? 'drag-ok' : `drag-FAIL(${T.step})`);
  let waited = 0;
  while (T.step !== 'capture' && waited < 60) { tick(1); waited++; }
  out.push(T.step === 'capture' && near(tgt) ? 'capture-ok' : `capture-FAIL(${T.step}@${waited}s)`);
  waited = 0;
  while (T.step !== 'grow' && waited < 90) { tick(1); waited++; }
  out.push(T.step === 'grow' && G.stars[tgt].owner === 0 ? 'grow-ok' : `grow-FAIL(${T.step}@${waited}s)`);
  // 暂停（不推演）时提示不会自己消失
  for (let i = 0; i < 50; i++) T.update();
  out.push(T.step === 'grow' ? 'pause-ok' : 'pause-FAIL');
  document.title = 'TUTORIAL ' + out.join(' ');
}

/** 结算：快进到时间到，看结算面板的经验条；做完把档案恢复原样 */
function selfTestXp() {
  const saved = localStorage.getItem(KEY.profile), savedBest = localStorage.getItem(KEY.best);
  const out = [];
  profile = newProfile();
  session.ranked = true;
  G.timeLimit = Math.ceil(G.time) + 1;
  for (let i = 0; i < 60 && !G.over; i++) step(G);
  drainEvents(performance.now() / 1000);
  out.push(G.over && endShown && !$('endXp').hidden ? 'end-ok' : 'end-FAIL');
  out.push(/经验/.test($('endXpLine').textContent) && profile.games === 1 && profile.exp > 0 ? `xp-ok(${profile.exp})` : `xp-FAIL(${$('endXpLine').textContent})`);
  out.push(/Lv \d/.test($('endXpLv').textContent) ? 'level-ok' : 'level-FAIL');
  session.settled = true;
  if (saved === null) localStorage.removeItem(KEY.profile); else localStorage.setItem(KEY.profile, saved);
  if (savedBest === null) localStorage.removeItem(KEY.best); else localStorage.setItem(KEY.best, savedBest);
  document.title = 'XPTEST ' + out.join(' ');
}

/** 大厅：等级决定能力点与解锁；自由模式 12 点但 6 点卡不可用；做完把档案恢复原样 */
function selfTestLobby() {
  const saved = localStorage.getItem(KEY.profile), savedDeck = localStorage.getItem(KEY.deck);
  const out = [];
  const card = (k) => $('deckGrid').querySelector(`[data-card="${k}"]`);
  profile = { ...newProfile(), exp: 6 * GROWTH.expPerLevel };   // Lv 7：4 点，3 点卡刚解锁
  decks = { grow: [], free: [] };
  renderProfile(); renderDeck();
  out.push($('pfLevel').textContent === '7' && /4 点/.test($('deckPts').textContent) ? 'level-ok' : `level-FAIL(${$('pfLevel').textContent}/${$('deckPts').textContent})`);
  out.push(!card('stealth').classList.contains('locked') && card('defense').classList.contains('locked') && /Lv 10/.test(card('defense').textContent)
    ? 'unlock-ok' : 'unlock-FAIL');
  card('defense').click();
  card('stealth').click();
  out.push(currentDeck().join() === 'stealth' ? 'pick-ok' : `pick-FAIL(${currentDeck().join()})`);
  card('patriotism').click();     // 3 + 2 > 4：放不下
  out.push(currentDeck().join() === 'stealth' ? 'limit-ok' : `limit-FAIL(${currentDeck().join()})`);
  $('optRanked').click();          // 切到自由模式
  out.push(!profile.ranked && /12 点/.test($('deckPts').textContent) && card('fleet').classList.contains('locked') && !card('purge').classList.contains('locked')
    ? 'free-ok' : 'free-FAIL');
  const fog0 = $('optFog').checked;
  $('optMode').value = 'hotseat'; $('optMode').dispatchEvent(new Event('change'));
  out.push(!$('playersField').hidden && $('deckBox').hidden && $('optFog').disabled && !$('optFog').checked ? 'hotseat-ok' : 'hotseat-FAIL');
  const savedOpts = localStorage.getItem(KEY.opts);
  $('startBtn').click();
  out.push(G && session.mode === 'hotseat' && G.factions.filter((f) => f.human).length === 2 && !G.fog && me() === -1 ? 'start-ok' : 'start-FAIL');
  toLobby();
  $('optMode').value = 'solo'; $('optMode').dispatchEvent(new Event('change'));
  out.push($('optFog').checked === fog0 && !$('optFog').disabled ? 'fogpref-ok' : 'fogpref-FAIL');
  if (savedOpts === null) localStorage.removeItem(KEY.opts); else localStorage.setItem(KEY.opts, savedOpts);
  if (saved === null) localStorage.removeItem(KEY.profile); else localStorage.setItem(KEY.profile, saved);
  if (savedDeck === null) localStorage.removeItem(KEY.deck); else localStorage.setItem(KEY.deck, savedDeck);
  profile = normalizeProfile(load(KEY.profile, null));
  document.title = 'LOBBY ' + out.join(' ');
}
