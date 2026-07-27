// EPT · UI：布阵/商店/拖拽/战斗回放
import { Game } from './engine/game.js';
import { buyCard, reroll, buyXp, sellUnit, placeUnit, unfieldUnit, allUnits } from './engine/player.js';
import { RACES, CLASSES, UNITS_BY_ID, unitStatsAtStar, XP_TO_LEVEL } from '../data/units.js';
import { countTraits, TRAITS } from '../data/traits.js';
import { canCombine, makeCombinedItem } from '../data/items.js';

const CELL_W = 70, ROW_H = 58, COLS = 7, ROWS = 8;
const COST_COLOR = { 1: 'var(--c1)', 2: 'var(--c2)', 3: 'var(--c3)', 4: 'var(--c4)', 5: 'var(--c5)' };
const CLASS_ICON = { warrior: '⚔️', trickshot: '🏹', flagger: '🚩', arcanist: '✨', hunter: '🐾', killer: '🗡️', forger: '🔨', adventurer: '🧭', ranger: '🌿', executor: '💥', chivalry: '🛡️', indulger: '🌀' };
const RACE_COLOR = {
  noldor: '#c8b273', gondolin: '#9fb8c8', mordor: '#6b3434', angband: '#4a3455', hobbit: '#7a9a5a',
  dwarf: '#a07540', rohirrim: '#b09468', dunedain: '#5a708a', hador: '#8a8a99', mankind: '#8a8a99',
  sinda: '#78a890', maia: '#b8a0c8', vala: '#d8c890', wood: '#6a8a5a', dog: '#a89078',
};
const DMG_COLOR = { phys: 'var(--dmg-phys)', light: 'var(--dmg-light)', dark: 'var(--dmg-dark)', true: 'var(--dmg-true)', pure: 'var(--dmg-true)' };

let game = null, selectedItem = null, planTimer = null, planLeft = 0;
let playback = null;

const $ = id => document.getElementById(id);

export function initUI() {
  $('startSolo').onclick = () => {
    $('lobby').style.display = 'none';
    $('game').style.display = 'block';
    startGame((Math.random() * 0xFFFFFFFF) >>> 0);
  };
  $('startBtn').onclick = () => { if (game && game.phase === 'planning') beginCombat(); };
  $('speedBtn').onclick = () => { if (playback) { playback.speed = playback.speed >= 4 ? 1 : playback.speed * 2; $('speedBtn').textContent = '▶ ' + playback.speed + 'x'; } };
  $('skipBtn').onclick = () => { if (playback) playback.skip = true; };
  $('rerollBtn').onclick = () => { if (planOk() && reroll(game, me())) renderAll(); };
  $('xpBtn').onclick = () => { if (planOk() && buyXp(game, me())) renderAll(); };
  $('lockBtn').onclick = () => { me().shopLocked = !me().shopLocked; renderShop(); };
  $('againBtn').onclick = () => { $('overScreen').style.display = 'none'; $('game').style.display = 'block'; startGame((Math.random() * 0xFFFFFFFF) >>> 0); };
  document.addEventListener('pointermove', e => { moveTooltip(e); dragMove(e); });
  document.addEventListener('pointerup', dragEnd);
  buildBoardCells();
  // 开发用：?auto=1 自动开局，?seed=N 固定种子
  const q = new URLSearchParams(location.search);
  if (q.get('auto')) {
    $('lobby').style.display = 'none';
    $('game').style.display = 'block';
    startGame(q.get('seed') ? +q.get('seed') : (Math.random() * 0xFFFFFFFF) >>> 0);
    if (q.get('fight')) setTimeout(() => { if (planOk()) beginCombat(); }, 800);
  }
}

function me() { return game.players[0]; }
function planOk() { return game && game.phase === 'planning'; }

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
    if (planLeft <= 0) { clearInterval(planTimer); if (planOk()) beginCombat(); }
  }, 1000);
}

// ---------- 渲染 ----------
function renderAll() {
  renderTopbar(); renderPlayers(); renderBoardUnits(); renderBench(); renderItems(); renderShop(); renderTraits(); renderLog();
}

function renderTopbar() {
  const p = me(), r = game.roundInfo();
  $('roundLabel').textContent = r.label + (r.type === 'pve' ? ' 野怪' : ' 对战');
  $('phaseInfo').textContent = game.phase === 'planning' ? '备战阶段' : '战斗中';
  $('goldStat').innerHTML = `金币 <b>${p.gold}</b>`;
  const need = p.level >= 10 ? '-' : XP_TO_LEVEL[p.level + 1];
  $('lvStat').innerHTML = `等级 <b>${p.level}</b> <span style="color:var(--sub)">(${p.xp}/${need})</span>`;
  $('hpStat').innerHTML = `生命 <b>${Math.max(0, p.hp)}</b>`;
  const st = p.streakW > 0 ? `连胜${p.streakW}` : p.streakL > 0 ? `连败${p.streakL}` : '—';
  $('streakStat').innerHTML = `战绩 <b>${st}</b>`;
  $('startBtn').style.display = game.phase === 'planning' ? '' : 'none';
}

function renderPlayers() {
  const box = $('playersBox');
  box.innerHTML = '<h4>玩家</h4>';
  const sorted = game.players.slice().sort((a, b) => (b.alive - a.alive) || (b.hp - a.hp));
  for (const p of sorted) {
    const row = document.createElement('div');
    row.className = 'pl-row' + (p.i === 0 ? ' me' : '') + (p.alive ? '' : ' dead');
    row.innerHTML = `<span class="pl-name">${p.name}</span><span class="pl-hp"><div style="width:${Math.max(0, p.hp)}%"></div></span><span class="pl-hpnum">${Math.max(0, p.hp)}</span>`;
    box.appendChild(row);
  }
}

function buildBoardCells() {
  const board = $('board');
  board.style.width = (COLS + 0.5) * CELL_W + 'px';
  board.style.height = (ROWS * ROW_H + 16) + 'px';
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
    const cell = document.createElement('div');
    cell.className = 'cell' + (r >= 4 ? ' mine' : '');
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
    ${opts.bars ? `<div class="bars${opts.enemy ? ' enemy' : ''}"><div style="width:100%"></div></div>` : ''}
    <div class="items-dots"></div>`;
  return el;
}

function renderUnitItems(el, unit) {
  const dots = el.querySelector('.items-dots');
  dots.innerHTML = unit.items.map(() => '<i></i>').join('');
}

function renderBoardUnits() {
  document.querySelectorAll('#board .unit').forEach(n => n.remove());
  document.querySelectorAll('#board .float-txt,#board .proj').forEach(n => n.remove());
  if (game.phase !== 'planning') return;
  const p = me();
  for (const b of p.board) {
    const el = makeUnitNode(b.unit.def, b.unit.star);
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
    chip.textContent = it.name;
    chip.onclick = () => { selectedItem = selectedItem === it ? null : it; renderItems(); };
    chip.onpointerenter = e => showTooltip(itemTooltip(it), e);
    chip.onpointerleave = hideTooltip;
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
    card.onclick = () => { if (planOk() && buyCard(game, p, i)) renderAll(); };
    card.onpointerenter = e => showTooltip(unitDefTooltip(def, 1), e);
    card.onpointerleave = hideTooltip;
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
    row.className = 'trait-row' + (t.tier > 0 ? ' active' : '');
    row.innerHTML = `<span>${def.name}</span><span class="tcount">${t.count}/${def.tiers.join('·')}</span>`;
    row.onpointerenter = e => showTooltip(`<h5>${def.name}</h5><div>${def.desc}</div>`, e);
    row.onpointerleave = hideTooltip;
    box.appendChild(row);
  }
}

function renderLog() {
  const box = $('logBox');
  box.innerHTML = game.log.slice(-30).map(s => `<div>· ${s}</div>`).join('');
  box.scrollTop = box.scrollHeight;
}

// ---------- 提示框 ----------
function unitDefTooltip(def, star) {
  const s = unitStatsAtStar(def, star);
  const traits = [...def.races.map(r => RACES[r]), ...def.classes.map(c => CLASSES[c])].join(' · ');
  const align = { light: '光明系', dark: '黑暗系', phys: '物理系' }[def.align];
  return `<h5>${def.name} ${'★'.repeat(star)}</h5><div class="tt-sub">${def.cost}费 · ${traits} · ${align}</div>
  <div>生命${s.hp}｜攻击${s.ad}｜攻速${def.as}｜射程${def.range}</div>
  <div>护甲${s.armor}｜光抗${s.cn}｜黑抗${s.mn}｜韧性${s.ten}</div>
  <div>光强${s.cc}｜黑强${s.mc}｜法力${def.mana[0]}/${def.mana[1]}</div>
  <div style="margin-top:4px"><b>【${def.skill.name}】</b>${def.skill.desc}</div>
  ${def.passive ? `<div class="tt-sub">${def.passive}</div>` : ''}`;
}
function itemTooltip(it) {
  const statNames = { adPct: '%攻击力', asPct: '%攻速', sp: '自适应强度', mres: '自适应抗性', armor: '护甲', hp: '生命', hpPct: '%生命', mana: '法力', critR: '%暴击率', critD: '%暴击伤害', hsPct: '%治疗盾强', spLight: '光明强度', affAll: '六维亲和度' };
  const lines = Object.entries(it.stats || {}).map(([k, v]) => `+${v}${statNames[k] || k}`).join('，');
  return `<h5>${it.name}</h5><div>${lines}</div>${it.note ? `<div class="tt-sub">${it.note}</div>` : ''}${it.kind === 'component' ? '<div class="tt-sub">散件：点击选中后再点击棋子穿戴，可与其他散件合成</div>' : ''}`;
}
function showTooltip(html, e) { const t = $('tooltip'); t.innerHTML = html; t.style.display = 'block'; moveTooltip(e); }
function moveTooltip(e) {
  const t = $('tooltip');
  if (t.style.display !== 'block') return;
  const x = Math.min(e.clientX + 14, window.innerWidth - 310);
  const y = Math.min(e.clientY + 14, window.innerHeight - t.offsetHeight - 10);
  t.style.left = x + 'px'; t.style.top = y + 'px';
}
function hideTooltip() { $('tooltip').style.display = 'none'; }

// ---------- 拖拽与装备 ----------
let drag = null;
function attachUnitInteract(el, unit, src) {
  el.onpointerenter = e => showTooltip(unitDefTooltip(unit.def, unit.star) + (unit.items.length ? `<div style="margin-top:4px">装备：${unit.items.map(i => i.name).join('、')}</div>` : ''), e);
  el.onpointerleave = hideTooltip;
  el.onpointerdown = e => {
    if (!planOk()) return;
    e.preventDefault();
    if (selectedItem) { equipSelected(unit); return; }
    drag = { unit, src, el };
    el.classList.add('dragging');
    const g = $('dragGhost');
    g.innerHTML = '';
    g.appendChild(makeUnitNode(unit.def, unit.star));
    g.style.display = 'block';
    $('sellZone').classList.add('active');
    const price = unit.star === 1 ? unit.def.cost : unit.def.cost * Math.pow(3, unit.star - 1) - 1;
    $('sellZone').textContent = `拖到这里出售（${price} 金币）`;
    dragMove(e);
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
    if (el.id && el.id.startsWith('cell-')) {
      const [, c, r] = el.id.split('-').map(Number);
      if (r >= 4) return { el, type: 'cell', c, r };
    }
    if (el.classList && el.classList.contains('bench-slot')) return { el, type: 'bench', idx: +el.dataset.bench };
    if (el.id === 'sellZone') return { el, type: 'sell' };
  }
  return null;
}
function dragEnd(e) {
  if (!drag) return;
  const t = dropTarget(e);
  const { unit } = drag;
  drag.el.classList.remove('dragging');
  $('dragGhost').style.display = 'none';
  $('sellZone').classList.remove('active');
  document.querySelectorAll('.drop-ok').forEach(n => n.classList.remove('drop-ok'));
  const p = me();
  if (t) {
    if (t.type === 'cell') placeUnit(p, unit.uid, t.c, t.r);
    else if (t.type === 'bench') {
      if (drag.src.from === 'board') unfieldUnit(p, unit.uid, t.idx);
      else if (!p.bench[t.idx]) { const from = p.bench.findIndex(x => x && x.uid === unit.uid); if (from >= 0) { p.bench[t.idx] = unit; p.bench[from] = null; } }
    }
    else if (t.type === 'sell') sellUnit(game, p, unit.uid);
  }
  drag = null;
  renderAll();
}
function equipSelected(unit) {
  const p = me(), it = selectedItem;
  if (!it) return;
  let ok = false;
  if (it.kind === 'component') {
    const partner = unit.items.find(x => x.kind === 'component' && canCombine(x.comp, it.comp));
    if (partner) {
      const combined = makeCombinedItem(partner.comp, it.comp);
      if (combined) { unit.items[unit.items.indexOf(partner)] = combined; ok = true; }
    } else if (unit.items.length < 3) { unit.items.push(it); ok = true; }
  } else if (unit.items.length < 3) { unit.items.push(it); ok = true; }
  if (ok) { p.items = p.items.filter(x => x !== it); selectedItem = null; renderAll(); }
}

// ---------- 战斗 ----------
function beginCombat() {
  clearInterval(planTimer);
  hideTooltip();
  const pending = game.prepareCombats();
  renderTopbar();
  const my = pending.combats.find(c => c.a === 0 || c.b === 0);
  const enemyName = my ? (my.kind === 'pve' ? '野怪' : game.players[my.a === 0 ? my.b : my.a].name + (my.ghost ? '（镜像）' : '')) : null;
  $('enemyLabel').textContent = enemyName ? `对阵：${enemyName}` : '本回合轮空';
  renderBench(); renderTraits();
  $('speedBtn').style.display = $('skipBtn').style.display = 'inline-block';
  $('speedBtn').textContent = '▶ 1x';
  if (!my) { finishCombat(); return; }
  // 若人类在 b 侧，事件坐标需要镜像
  const mirror = my.a !== 0;
  startPlayback(my.events, mirror);
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

function applyEvent(pb, e) {
  const board = $('board');
  const nodes = pb.nodes;
  switch (e.k) {
    case 'spawn': {
      const def = e.monster ? { name: e.name, monster: true, races: [], classes: [] } : UNITS_BY_ID[e.defId];
      const enemy = e.team === (pb.mirror ? 0 : 1);
      const el = makeUnitNode(def, e.star, { bars: true, enemy });
      const { c, r } = mirrorPos(pb, e.c, e.r);
      positionUnit(el, c, r);
      board.appendChild(el);
      nodes[e.id] = { el, maxHp: e.hp, hp: e.hp, enemy };
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
    case 'dmg': {
      const n = nodes[e.id]; if (!n) break;
      n.hp = e.hp;
      const bar = n.el.querySelector('.bars > div');
      if (bar) bar.style.width = Math.max(0, e.hp / n.maxHp * 100) + '%';
      const bars = n.el.querySelector('.bars');
      if (bars) bars.classList.toggle('shielded', e.shield > 0);
      if (!pb.skip) floatText(n.el, (e.crit ? '暴击 ' : '') + e.v, DMG_COLOR[e.type] || '#fff', e.crit);
      break;
    }
    case 'heal': {
      const n = nodes[e.id]; if (!n) break;
      n.hp = e.hp;
      const bar = n.el.querySelector('.bars > div');
      if (bar) bar.style.width = Math.max(0, e.hp / n.maxHp * 100) + '%';
      if (!pb.skip && e.v > 5) floatText(n.el, '+' + e.v, 'var(--heal)');
      break;
    }
    case 'shield': { const n = nodes[e.id]; if (n) { const bars = n.el.querySelector('.bars'); if (bars) bars.classList.add('shielded'); } break; }
    case 'cast': {
      const n = nodes[e.id]; if (!n) break;
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
    case 'lightItem': { const n = nodes[e.id]; if (n && !pb.skip) floatText(n.el, '☀ ' + e.item, 'var(--dmg-light)'); break; }
    case 'overtime': { if (!pb.skip) banner('加时！全员狂暴'); break; }
    case 'end': {
      const meWon = e.winner === (pb.mirror ? 1 : 0);
      banner(e.winner === 'draw' ? '平局' : meWon ? '胜利！' : '战败…');
      return true;
    }
  }
  return false;
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
  b._t = setTimeout(() => b.style.display = 'none', 1500);
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
