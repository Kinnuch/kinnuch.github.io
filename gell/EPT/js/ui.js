// EPT · UI：布阵/商店/拖拽/战斗回放（M1.5：实时蓝条、观战、装备拖拽、战斗中操作等）
import { Game } from './engine/game.js';
import { buyCard, reroll, buyXp, sellUnit, placeUnit, unfieldUnit, allUnits, isFielded } from './engine/player.js';
import { RACES, CLASSES, UNITS, UNITS_BY_ID, unitStatsAtStar, XP_TO_LEVEL, SHOP_ODDS } from '../data/units.js';
import { countTraits, TRAITS } from '../data/traits.js';
import { canCombine, makeCombinedItem, COMPONENTS, COMBO_NAMES, comboKey } from '../data/items.js';

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

const $ = id => document.getElementById(id);

const COMP_ICON = { ad1: '⚔', ad2: '⚔', as1: '🗡', as2: '🏹', ap1: '✨', ap2: '✨', m1: '💧', m2: '💧', a1: '🛡', a2: '🛡', mr1: '🔮', mr2: '🔮', hp1: '❤', hp2: '❤', hs1: '🌿', hs2: '🌿', csc1: '💥', csc2: '💥', al: '☀' };
function itemIcon(it) {
  if (it.kind === 'component') return COMP_ICON[it.comp] || '';
  if (it.kind === 'light') return '☀';
  if (it.comps) return (COMP_ICON[it.comps[0]] || '') + (COMP_ICON[it.comps[1]] || '');
  return '🔸';
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
    $('lobby').style.display = 'none';
    $('game').style.display = 'block';
    startGame((Math.random() * 0xFFFFFFFF) >>> 0);
  };
  $('startBtn').onclick = () => { if (game && game.phase === 'planning') beginCombat(); };
  $('speedBtn').onclick = () => { if (playback) { playback.speed = playback.speed >= 4 ? 1 : playback.speed * 2; $('speedBtn').textContent = '▶ ' + playback.speed + 'x'; } };
  $('skipBtn').onclick = () => { if (playback) playback.skip = true; };
  $('rerollBtn').onclick = () => { if (actOk() && reroll(game, me())) renderAll(); };
  $('xpBtn').onclick = () => { if (actOk() && buyXp(game, me())) renderAll(); };
  $('lockBtn').onclick = () => { if (game) { me().shopLocked = !me().shopLocked; renderShop(); } };
  $('againBtn').onclick = () => { $('overScreen').style.display = 'none'; $('game').style.display = 'block'; startGame((Math.random() * 0xFFFFFFFF) >>> 0); };
  $('scoutModal').onclick = e => { if (e.target === $('scoutModal')) $('scoutModal').style.display = 'none'; };
  $('goldBig').onpointerenter = e => { if (game && !tooltipPinned) showTooltip(goldTooltip(), e); };
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
  document.addEventListener('keydown', e => { if (e.key === 'Escape') { tooltipPinned = false; hideTooltip(true); $('scoutModal').style.display = 'none'; } });
  buildBoardCells();
  // 开发用：?auto=1 自动开局，?seed=N 固定种子，?fight=1 自动开战
  const q = new URLSearchParams(location.search);
  if (q.get('auto')) {
    $('lobby').style.display = 'none';
    $('game').style.display = 'block';
    startGame(q.get('seed') ? +q.get('seed') : (Math.random() * 0xFFFFFFFF) >>> 0);
    if (q.get('fight')) setTimeout(() => { if (game.phase === 'planning') beginCombat(); }, 800);
  }
}

function me() { return game.players[0]; }
function planOk() { return game && game.phase === 'planning'; }
function actOk() { return game && !game.over; } // 买卖/刷新/经验：战斗中也允许

function startGame(seed) {
  game = new Game(seed, '你');
  selectedItem = null;
  renderAll();
  startPlanTimer();
}

// ---------- 计时 ----------
function startPlanTimer() {
  clearInterval(planTimer);
  planLeft = 45;
  $('timer').textContent = planLeft + 's';
  planTimer = setInterval(() => {
    planLeft--;
    $('timer').textContent = planLeft + 's';
    if (planLeft > 0 && planLeft <= 5) { bell(planLeft === 1 ? 660 : 880); showCount(planLeft); }
    if (planLeft <= 0) { clearInterval(planTimer); if (planOk()) beginCombat(); }
  }, 1000);
}

// ---------- 渲染 ----------
function renderAll() {
  renderTopbar(); renderPlayers(); renderBoardUnits(); renderBench(); renderItems(); renderShop(); renderTraits(); renderLog(); renderGold(); renderOdds();
}

function renderTopbar() {
  const p = me(), r = game.roundInfo();
  $('roundLabel').textContent = r.label + (r.type === 'pve' ? ' 野怪' : ' 对战');
  $('phaseInfo').textContent = game.phase === 'planning' ? '备战阶段' : '战斗中';
  $('hpStat').innerHTML = `生命 <b>${Math.max(0, p.hp)}</b>`;
  const st = p.streakW > 0 ? `连胜${p.streakW}` : p.streakL > 0 ? `连败${p.streakL}` : '—';
  $('streakStat').innerHTML = `战绩 <b>${st}</b>`;
  $('startBtn').style.display = game.phase === 'planning' ? '' : 'none';
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
  <div class="tt-sub" style="margin-top:4px">野怪回合不计连胜连败，输给野怪会断掉连胜。</div>`;
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
    row.className = 'pl-row' + (p.i === 0 ? ' me' : '') + (p.alive ? '' : ' dead');
    const fire = p.alive && p.streakW >= 2 ? `<span class="fire">🔥${p.streakW}</span>` : '';
    row.innerHTML = `<span class="pl-name">${p.name}${fire}</span><span class="pl-hp"><div style="width:${Math.max(0, p.hp)}%"></div></span><span class="pl-hpnum">${Math.max(0, p.hp)}</span>`;
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
    <div class="stars">${'★'.repeat(star)}</div>
    <div class="portrait" style="background:linear-gradient(160deg, ${color}, #00000055), ${COST_COLOR[cost]};border:none;">
      <div class="ring" style="box-shadow:inset 0 0 0 3px ${COST_COLOR[cost]}"></div>${icon}</div>
    <div class="uname">${def.name}</div>
    ${opts.bars ? `<div class="bars${opts.enemy ? ' enemy' : ''}"><div style="width:100%"></div></div><div class="mbar"><div style="width:${opts.manaPct || 0}%"></div></div>` : ''}
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
  me().items.forEach((it, i) => {
    const chip = document.createElement('div');
    chip.className = 'item-chip' + (it.kind !== 'component' ? ' combined' : '') + (selectedItem === it ? ' selected' : '');
    chip.textContent = itemIcon(it) + ' ' + it.name;
    chip.dataset.itemIdx = i;
    chip.onclick = () => { if (drag) return; selectedItem = selectedItem === it ? null : it; renderItems(); };
    chip.oncontextmenu = e => { e.preventDefault(); pinItemPreview(it, e); };
    chip.onpointerenter = e => { if (!tooltipPinned) showTooltip(itemTooltip(it), e); };
    chip.onpointerleave = () => hideTooltip();
    chip.onpointerdown = e => {
      if (e.button !== 0) return;
      e.preventDefault();
      startDrag({ kind: 'item', item: it, el: chip }, e, () => {
        const g = document.createElement('div');
        g.className = 'item-chip' + (it.kind !== 'component' ? ' combined' : '');
        g.textContent = itemIcon(it) + ' ' + it.name;
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
    card.style.borderColor = COST_COLOR[def.cost];
    const traits = [...def.races.map(r => RACES[r]), ...def.classes.map(c => CLASSES[c])].join(' · ');
    card.innerHTML = `<div class="sc-name">${CLASS_ICON[def.classes[0]] || ''} ${def.name}</div><div class="sc-traits">${traits}</div><div class="sc-cost">${def.cost}🪙</div>`;
    card.onclick = () => { if (actOk() && buyCard(game, p, i)) renderAll(); };
    card.onpointerenter = e => { if (!tooltipPinned) showTooltip(unitDefTooltip(def, 1), e); };
    card.onpointerleave = () => hideTooltip();
    bar.appendChild(card);
  });
  $('lockBtn').textContent = p.shopLocked ? '🔒 已锁定' : '🔓 锁定';
}

function renderTraits() {
  const box = $('traitsBox');
  box.innerHTML = '<h4>羁绊（场上）</h4>';
  const units = me().board.map(b => ({ def: b.unit.def }));
  const list = countTraits(units);
  if (!list.length) box.innerHTML += '<div style="font-size:12px;color:var(--sub)">上场棋子后显示羁绊</div>';
  for (const t of list) {
    const def = TRAITS[t.id];
    const row = document.createElement('div');
    row.className = 'trait-row' + (t.tier > 0 ? ' active ' + TIER_CLASS[Math.min(t.tier, 4)] : '');
    row.innerHTML = `<span class="tbadge">${t.count}</span><span>${def.name}</span><span class="tcount">${def.tiers.join(' › ')}</span>`;
    row.onpointerenter = e => { if (!tooltipPinned) showTooltip(traitTooltip(t.id, def), e); };
    row.onpointerleave = () => hideTooltip();
    box.appendChild(row);
  }
}
function traitTooltip(id, def) {
  const mine = new Set(me().board.map(b => b.unit.def.id));
  const pool = UNITS.filter(u => u.races.includes(id) || u.classes.includes(id)).sort((a, b) => a.cost - b.cost);
  const lines = pool.map(u => `<span style="color:${mine.has(u.id) ? 'var(--accent)' : 'var(--sub)'}">${mine.has(u.id) ? '✓ ' : ''}${u.cost}费 ${u.name}</span>`).join('<br>');
  return `<h5>${def.name}（${def.tiers.join('/')}）</h5><div>${def.desc}</div>
  <div style="margin-top:6px;border-top:1px solid var(--border);padding-top:4px">${lines}</div>
  <div class="tt-sub" style="margin-top:2px">✓ = 当前在你场上（M1 先实装 25 子，其余 M2 加入）</div>`;
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
  let html = `<div id="scoutBox"><h3>${p.name} 的棋盘</h3>
  <div class="scout-stats">生命 <b>${Math.max(0, p.hp)}</b>｜金币 <b>${p.gold}</b>｜等级 <b>${p.level}</b>｜战绩 <b>${st}</b>｜物品 <b>${p.items.length}</b></div>
  <div class="scout-board" style="width:${(COLS + 0.5) * 46}px;height:${ROWS * 38 + 12}px">`;
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
    const x = (c + (r % 2 ? 0.5 : 0)) * 46, y = r * 38;
    html += `<div class="scout-cell${r >= 4 ? ' mine' : ''}" style="left:${x}px;top:${y}px"></div>`;
  }
  for (const b of p.board) {
    const { x, y } = { x: (b.c + (b.r % 2 ? 0.5 : 0)) * 46, y: b.r * 38 };
    const color = RACE_COLOR[b.unit.def.races[0]] || '#888';
    html += `<div class="scout-unit" style="left:${x + 2}px;top:${y - 4}px;background:${color};box-shadow:inset 0 0 0 2px ${COST_COLOR[b.unit.def.cost]}" title="${b.unit.def.name}">
      <span>${'★'.repeat(b.unit.star)}</span>${b.unit.def.name.slice(0, 3)}</div>`;
  }
  html += `</div><div class="scout-bench">备战席：${p.bench.filter(Boolean).map(u => `${u.def.name}${'★'.repeat(u.star)}`).join('、') || '空'}</div>
  <div class="tt-sub" style="margin-top:6px">点击空白处关闭</div></div>`;
  m.innerHTML = html;
  m.style.display = 'flex';
}

// ---------- 提示框 ----------
function barsHtml(live) {
  const hpPct = Math.max(0, Math.min(100, live.hp / live.maxHp * 100));
  const mpPct = live.manaMax ? Math.max(0, Math.min(100, live.mana / live.manaMax * 100)) : 0;
  return `<div class="tt-bar hp"><div style="width:${hpPct}%"></div><span>❤ ${live.hp} / ${live.maxHp}</span></div>
  ${live.manaMax ? `<div class="tt-bar mp"><div style="width:${mpPct}%"></div><span>💧 ${live.mana} / ${live.manaMax}</span></div>` : ''}`;
}
// 技能描述里的公式 → 按当前星级与实时属性算成具体数字
function computeSkillDesc(def, star, st) {
  const L = Math.min(star, 3) - 1;
  let d = def.skill.desc;
  d = d.replace(/(\d+(?:\.\d+)?)\/(\d+(?:\.\d+)?)\/(\d+(?:\.\d+)?)×适辉/g, (m, a, b, c) =>
    `<b>${Math.round([+a, +b, +c][L] * Math.max(st.cc, st.mc))}</b>`);
  d = d.replace(/(\d+(?:\.\d+)?)\/(\d+(?:\.\d+)?)\/(\d+(?:\.\d+)?)(%?)\s*(AD|CC|MC)/g, (m, a, b, c, pct, stat) => {
    const v = [+a, +b, +c][L];
    const sv = stat === 'AD' ? st.ad : stat === 'CC' ? st.cc : st.mc;
    return `<b>${Math.round(pct ? v / 100 * sv : v * sv)}</b>`;
  });
  d = d.replace(/(\d+(?:\.\d+)?)%(AD|CC|MC)/g, (m, a, stat) => {
    const sv = stat === 'AD' ? st.ad : stat === 'CC' ? st.cc : st.mc;
    return `<b>${Math.round(+a / 100 * sv)}</b>`;
  });
  d = d.replace(/(\d+(?:\.\d+)?)\/(\d+(?:\.\d+)?)\/(\d+(?:\.\d+)?)/g, (m, a, b, c) => `<b>${[+a, +b, +c][L]}</b>`);
  return d;
}
const STAT_LABELS = [['ad', '攻击力'], ['as', '攻速'], ['armor', '护甲'], ['ten', '韧性'], ['cc', '光强'], ['mc', '黑强'], ['cn', '光抗'], ['mn', '黑抗'], ['critR', '暴击率%'], ['critD', '暴伤%'], ['amp', '增伤%'], ['dr', '减伤%'], ['vamp', '吸血%']];
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
  return { ad: s.ad, as: def.as, armor: s.armor, cn: s.cn, mn: s.mn, cc: s.cc, mc: s.mc, ten: s.ten, critR: 15, critD: 150, amp: 0, dr: 0, vamp: 0 };
}
function unitDefTooltip(def, star, live) {
  const s = unitStatsAtStar(def, star);
  const base = baseStatsOf(def, star);
  const cur = (live && live.stats) || base;
  const traits = [...def.races.map(r => RACES[r]), ...def.classes.map(c => CLASSES[c])].join(' · ');
  const align = { light: '光明系', dark: '黑暗系', phys: '物理系' }[def.align];
  const statsBlock = live && live.stats
    ? statGridHtml(base, cur) + `<div class="tt-sub">绿=高于纸面，红=低于纸面；悬浮属性看对比</div>`
    : `<div>生命${s.hp}｜攻击${s.ad}｜攻速${def.as}｜射程${def.range}</div>
       <div>护甲${s.armor}｜光抗${s.cn}｜黑抗${s.mn}｜韧性${s.ten}</div>
       <div>光强${s.cc}｜黑强${s.mc}｜法力${def.mana[0]}/${def.mana[1]}</div>`;
  return `<h5>${def.name} ${'★'.repeat(star)}</h5><div class="tt-sub">${def.cost}费 · ${traits} · ${align}</div>
  ${live ? barsHtml(live) : ''}
  ${statsBlock}
  <div style="margin-top:4px"><b>【${def.skill.name}】</b>${computeSkillDesc(def, star, cur)}</div>
  ${def.passive ? `<div class="tt-sub">${def.passive}</div>` : ''}
  ${live && live.items.length ? `<div style="margin-top:4px">装备：${live.items.join('、')}</div>` : ''}`;
}
function itemTooltip(it) {
  const statNames = { adPct: '%攻击力', asPct: '%攻速', sp: '自适应强度', mres: '自适应抗性', armor: '护甲', hp: '生命', hpPct: '%生命', mana: '法力', critR: '%暴击率', critD: '%暴击伤害', hsPct: '%治疗盾强', spLight: '光明强度', affAll: '六维亲和度' };
  const lines = Object.entries(it.stats || {}).map(([k, v]) => `+${v}${statNames[k] || k}`).join('，');
  return `<h5>${it.name}</h5><div>${lines}</div>${it.note ? `<div class="tt-sub">${it.note}</div>` : ''}${it.kind === 'component' ? '<div class="tt-sub">散件：拖到棋子上穿戴 / 拖到另一件散件上合成；右键预览全部合成配方</div>' : ''}`;
}
function pinItemPreview(it, e) {
  let html;
  if (it.kind === 'component') {
    const lines = [];
    for (const other of Object.keys(COMPONENTS)) {
      if (!canCombine(it.comp, other)) continue;
      const name = COMBO_NAMES[comboKey(it.comp, other)];
      if (name) lines.push(`<div class="recipe-line" data-a="${it.comp}" data-b="${other}">＋ ${COMPONENTS[other].name} → <b style="color:var(--accent)">${name}</b></div>`);
    }
    html = `<h5>${itemIcon(it)} ${it.name} · 合成配方<span class="tt-sub" style="font-weight:normal">（悬浮配方看详情）</span></h5>${lines.join('') || '<div>无</div>'}<div class="tt-sub" style="margin-top:4px">Esc 或点击空白处关闭</div>`;
  } else html = itemTooltip(it);
  showTooltip(html, e);
  pinTooltip();
  $('tooltip').querySelectorAll('.recipe-line').forEach(line => {
    line.onpointerenter = ev => {
      const combined = makeCombinedItem(line.dataset.a, line.dataset.b);
      if (combined) showTooltip2(itemTooltip(combined), ev);
    };
    line.onpointerleave = hideTooltip2;
  });
}
function pinTooltip() { tooltipPinned = true; $('tooltip').classList.add('pinned'); }
function showTooltip2(html, ev) {
  const t2 = $('tooltip2'), rect = $('tooltip').getBoundingClientRect();
  t2.innerHTML = html; t2.style.display = 'block';
  const x = rect.right + 8 + 280 > window.innerWidth ? rect.left - 288 : rect.right + 8;
  t2.style.left = Math.max(4, x) + 'px';
  t2.style.top = Math.min(ev.clientY - 20, window.innerHeight - 160) + 'px';
}
function hideTooltip2() { $('tooltip2').style.display = 'none'; }
function pinLivePanel(n, ev) {
  showTooltip(liveTooltip(n), ev);
  pinTooltip();
  pinnedLive = n;
  attachStatHovers();
}
function attachStatHovers() {
  $('tooltip').querySelectorAll('.stat-row').forEach(row => {
    row.onpointerenter = ev => {
      const b = +row.dataset.base, v = +row.dataset.live, d = Math.round((v - b) * 100) / 100;
      showTooltip2(`<h5>${row.dataset.name}</h5><div>纸面基础：${b}</div><div>当前实时：<b class="${d > 0 ? 'up' : d < 0 ? 'down' : ''}" style="color:${d > 0 ? '#4caf50' : d < 0 ? '#ef5350' : 'inherit'}">${v}</b>（${d >= 0 ? '+' : ''}${d}）</div><div class="tt-sub">差值 = 装备 + 羁绊 + 战斗中增减益合计（逐项来源 M2 展开）</div>`, ev);
    };
    row.onpointerleave = hideTooltip2;
  });
}
function showTooltip(html, e) { const t = $('tooltip'); t.innerHTML = html; t.style.display = 'block'; t.classList.remove('pinned'); moveTooltip(e); }
function moveTooltip(e) {
  if (tooltipPinned) return;
  const t = $('tooltip');
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

// ---------- 拖拽 ----------
function startDrag(d, e, ghostMaker) {
  drag = d;
  d.el.classList.add('dragging');
  const g = $('dragGhost');
  g.innerHTML = '';
  g.appendChild(ghostMaker());
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
  dragMove(e);
}
function attachUnitInteract(el, unit, src) {
  el.dataset.uid = unit.uid;
  const info = () => unitDefTooltip(unit.def, unit.star) + (unit.items.length ? `<div style="margin-top:4px">装备：${unit.items.map(i => itemIcon(i) + ' ' + i.name).join('、')}</div>` : '');
  el.onpointerenter = e => { if (!tooltipPinned) showTooltip(info(), e); };
  el.onpointerleave = () => hideTooltip();
  el.oncontextmenu = e => {
    e.preventDefault();
    const s = unitStatsAtStar(unit.def, unit.star);
    const live = { hp: s.hp, maxHp: s.hp, mana: unit.def.mana[0], manaMax: unit.def.mana[1], items: unit.items.map(i => itemIcon(i) + ' ' + i.name) };
    showTooltip(unitDefTooltip(unit.def, unit.star, live), e);
    pinTooltip();
  };
  el.onpointerdown = e => {
    if (e.button !== 0 || !actOk()) return;
    e.preventDefault();
    if (selectedItem) { equipItem(unit, selectedItem); return; }
    startDrag({ kind: 'unit', unit, src, el }, e, () => makeUnitNode(unit.def, unit.star));
  };
}
function dragMove(e) {
  if (!drag) return;
  const g = $('dragGhost');
  g.style.left = (e.clientX - 26) + 'px';
  g.style.top = (e.clientY - 30) + 'px';
  document.querySelectorAll('.drop-ok').forEach(n => n.classList.remove('drop-ok'));
  const t = dropTarget(e);
  if (t) t.el.classList.add('drop-ok');
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
  const t = dropTarget(e);
  const d = drag;
  cancelDrag();
  const p = me();
  if (!t) { renderAll(); return; }
  if (d.kind === 'item') {
    if (t.type === 'unit') {
      const u = allUnits(p).find(x => x.uid === t.uid);
      if (u) equipItem(u, d.item);
    } else if (t.type === 'item') {
      const other = p.items[t.idx];
      if (other && d.item.kind === 'component' && other.kind === 'component' && canCombine(d.item.comp, other.comp)) {
        const combined = makeCombinedItem(d.item.comp, other.comp);
        if (combined) { p.items = p.items.filter(x => x !== d.item && x !== other); p.items.push(combined); banner(`合成：${combined.name}`); }
      } else banner('这两件无法合成');
    }
    renderAll(); return;
  }
  // 棋子
  const unit = d.unit;
  if (t.type === 'cell') {
    if (!planOk()) { banner('战斗中无法调整棋盘'); }
    else {
      const fielded = isFielded(p, unit.uid);
      const occ = p.board.find(b => b.c === t.c && b.r === t.r);
      if (!fielded && !occ && p.board.length >= p.level) banner(`⚠ 人口已满（等级 ${p.level} = ${p.level} 个上场位）`);
      else placeUnit(p, unit.uid, t.c, t.r);
    }
  } else if (t.type === 'bench') {
    if (d.src.from === 'board') {
      if (!planOk()) banner('战斗中无法调整棋盘');
      else unfieldUnit(p, unit.uid, t.idx);
    } else if (!p.bench[t.idx]) {
      const from = p.bench.findIndex(x => x && x.uid === unit.uid);
      if (from >= 0) { p.bench[t.idx] = unit; p.bench[from] = null; }
    } else { // 备战席互换
      const from = p.bench.findIndex(x => x && x.uid === unit.uid);
      if (from >= 0) { const tmp = p.bench[t.idx]; p.bench[t.idx] = unit; p.bench[from] = tmp; }
    }
  } else if (t.type === 'sell') {
    if (!planOk() && isFielded(p, unit.uid)) banner('战斗中不能出售场上棋子');
    else sellUnit(game, p, unit.uid);
  }
  renderAll();
}
function equipItem(unit, it) {
  const p = me();
  let ok = false;
  if (it.kind === 'component') {
    const partner = unit.items.find(x => x.kind === 'component' && canCombine(x.comp, it.comp));
    if (partner) {
      const combined = makeCombinedItem(partner.comp, it.comp);
      if (combined) { unit.items[unit.items.indexOf(partner)] = combined; ok = true; banner(`合成：${combined.name}`); }
    } else if (unit.items.length < 3) { unit.items.push(it); ok = true; }
    else banner('装备栏已满（3件）');
  } else if (unit.items.length < 3) { unit.items.push(it); ok = true; }
  else banner('装备栏已满（3件）');
  if (ok) { p.items = p.items.filter(x => x !== it); if (selectedItem === it) selectedItem = null; renderAll(); }
}

// ---------- 战斗 ----------
function beginCombat() {
  clearInterval(planTimer);
  cancelDrag();
  tooltipPinned = false; hideTooltip(true);
  const pending = game.prepareCombats();
  renderTopbar(); renderBench(); renderTraits(); renderGold();
  const my = pending.combats.find(c => c.a === 0 || c.b === 0);
  const enemyName = my ? (my.kind === 'pve' ? '野怪' : game.players[my.a === 0 ? my.b : my.a].name + (my.ghost ? '（镜像）' : '')) : null;
  $('enemyLabel').textContent = enemyName ? `对阵：${enemyName}` : '本回合轮空';
  $('timer').textContent = '';
  $('speedBtn').style.display = $('skipBtn').style.display = 'inline-block';
  $('speedBtn').textContent = '▶ 1x';
  if (!my) { finishCombat(); return; }
  const mirror = my.a !== 0;
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
  playback = { events, i: 0, t: 0, speed: 1, skip: false, nodes: {}, last: performance.now(), mirror };
  setTimeout(() => playLoop(performance.now()), 16);
}
function mirrorPos(pb, c, r) { return pb.mirror ? { c: COLS - 1 - c, r: 7 - r } : { c, r }; }

function playLoop(now) {
  const pb = playback;
  if (!pb) return;
  const dt = Math.min((now - pb.last) / 1000, 0.1) * pb.speed;
  pb.last = now;
  pb.t += pb.skip ? 999 : dt;
  let ended = false;
  while (pb.i < pb.events.length && pb.events[pb.i].t <= pb.t) {
    ended = applyEvent(pb, pb.events[pb.i]) || ended;
    pb.i++;
  }
  if (pb.i >= pb.events.length || ended) { setTimeout(finishCombat, pb.skip ? 100 : 1400); playback = null; return; }
  setTimeout(() => playLoop(performance.now()), 33);
}

function updateBars(n) {
  const hpBar = n.el.querySelector('.bars > div');
  if (hpBar) hpBar.style.width = Math.max(0, n.hp / n.maxHp * 100) + '%';
  const mBar = n.el.querySelector('.mbar > div');
  if (mBar) mBar.style.width = Math.min(100, Math.max(0, n.manaMax ? n.mana / n.manaMax * 100 : 0)) + '%';
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
      const n = { el, maxHp: e.hp, hp: e.hp, mana: e.mana, manaMax: e.monster ? 0 : e.manaMax, enemy, def, star: e.star, items: e.items || [] };
      nodes[e.id] = n;
      if (!pb.skip) { el.classList.add('spawn-pop'); setTimeout(() => el.classList.remove('spawn-pop'), 500); }
      // 战斗中实时悬浮信息 & 右键固定面板
      el.onpointerenter = ev => { if (!tooltipPinned) showTooltip(liveTooltip(n), ev); };
      el.onpointerleave = () => hideTooltip();
      el.oncontextmenu = ev => { ev.preventDefault(); pinLivePanel(n, ev); };
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
      n.hp = e.hp;
      if (e.tmana !== undefined) n.mana = e.tmana;
      updateBars(n);
      const bars = n.el.querySelector('.bars');
      if (bars) bars.classList.toggle('shielded', e.shield > 0);
      if (!pb.skip) floatText(n.el, (e.crit ? '暴击 ' : '') + e.v, DMG_COLOR[e.type] || '#fff', e.crit);
      break;
    }
    case 'heal': {
      const n = nodes[e.id]; if (!n) break;
      n.hp = e.hp;
      updateBars(n);
      if (!pb.skip && e.v > 5) floatText(n.el, '+' + e.v, 'var(--heal)');
      break;
    }
    case 'shield': { const n = nodes[e.id]; if (n) { const bars = n.el.querySelector('.bars'); if (bars) bars.classList.add('shielded'); } break; }
    case 'cast': {
      const n = nodes[e.id]; if (!n) break;
      n.mana = 0; updateBars(n);
      if (!pb.skip) {
        n.el.classList.add('casting'); setTimeout(() => n.el.classList.remove('casting'), 500);
        floatText(n.el, '【' + e.name + '】', 'var(--accent2)');
      }
      break;
    }
    case 'status': {
      const n = nodes[e.id]; if (!n) break;
      if (e.type === 'untargetable') { n.el.classList.add('untargetable'); setTimeout(() => n.el.classList.remove('untargetable'), e.dur * 1000 / pb.speed); }
      break;
    }
    case 'execute': { const n = nodes[e.id]; if (n && !pb.skip) floatText(n.el, '处决！', 'var(--dmg-true)', true); break; }
    case 'die': { const n = nodes[e.id]; if (n) n.el.classList.add('dead'); break; }
    case 'star': {
      if (pb.skip) break;
      const { c, r } = mirrorPos(pb, e.c, e.r);
      const cell = $(`cell-${c}-${r}`);
      if (cell) { cell.classList.add('star-flash'); setTimeout(() => cell.classList.remove('star-flash'), 200); }
      break;
    }
    case 'mordor': { if (!pb.skip) banner('邪黑塔锁定了棋盘！'); break; }
    case 'lightItem': { const n = nodes[e.id]; if (n) { n.items.push(e.item + '☀'); if (!pb.skip) floatText(n.el, '☀ ' + e.item, 'var(--dmg-light)'); } break; }
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
  return unitDefTooltip(n.def, n.star, { hp: Math.max(0, Math.round(n.hp)), maxHp: n.maxHp, mana: Math.round(n.mana), manaMax: n.manaMax, items: n.items, stats: n.stats });
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

function finishCombat() {
  $('speedBtn').style.display = $('skipBtn').style.display = 'none';
  $('enemyLabel').textContent = '';
  game.resolveRound();
  if (game.over) { showOver(); return; }
  renderAll();
  startPlanTimer();
}

function showOver() {
  clearInterval(planTimer);
  $('game').style.display = 'none';
  const won = game.players[0].alive;
  $('overTitle').textContent = won ? '🏆 胜利！' : '☠ 你被淘汰了';
  $('overDesc').textContent = won ? '你是中洲最后的执棋者。' : `最终排名：第 ${game.placement} 名`;
  $('overScreen').style.display = 'block';
}
