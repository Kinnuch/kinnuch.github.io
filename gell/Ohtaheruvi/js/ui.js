// 界面：面板、报表、交互。所有 DOM 操作集中在这里。

import { FACTIONS } from '../data/factions.js';
import { UNITS, upkeepOf } from '../data/units.js';
import { ITEMS } from '../data/items.js';
import { HERO_ROSTER, commandBonus, hireCost } from '../data/heroes.js';
import { CITY_SIZE, TERRAIN, cityDefBonus } from '../data/terrain.js';
import { terrainAt, featureAt, MAX_STACK } from './map.js';
import { statsPanel } from './chart.js';
import { tutorialTick } from './tutorial.js';
import * as S from './state.js';
import { estimateOdds, msBreakdown, sideContext, computeMS } from './combat.js';
import { isHero, heroOf, unitName, unitStr, unitMaxHp, unitSwatch, unitElvish } from './unit.js';
import { portrait } from './portraits.js';
import * as R from './render.js';
import * as Save from './save.js';

const $ = (id) => document.getElementById(id);
const el = (tag, cls, text) => {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text != null) n.textContent = text;
  return n;
};

export function createUI(G, view) {
  const ui = {
    G, view,
    picked: new Set(),     // 队列中被勾选的单位 uid
    selectedArmy: null,
    selectedCity: null,
    inspect: null,         // 当前查看的格子 {x,y}
    tutorial: null,
    onChange: () => {},
    // 所有会改变局面的操作都交回给 main.js 的指令层。
    // 界面自己绝不直接改状态 —— 否则联机时这些改动不会同步到别人那里。
    dispatch: () => {},
  };
  ui.refresh = () => refreshAll(ui);
  ui.selectArmy = (a) => selectArmy(ui, a);
  ui.selectCity = (c) => { ui.selectedCity = c; refreshAll(ui); };
  return ui;
}

// ── 选择 ──────────────────────────────────────────────────

export function selectArmy(ui, army) {
  const { G, view } = ui;
  ui.selectedArmy = army;
  ui.picked = new Set(army ? army.units.map((u) => u.uid) : []);
  view.selected = army ? { x: army.x, y: army.y } : null;
  updateReach(ui);
  refreshAll(ui);
}

export function updateReach(ui) {
  const { G, view } = ui;
  const a = ui.selectedArmy;
  if (!a || a.owner !== S.current(G) || G.winner) {
    view.reach = null; view.attackTargets = null; return;
  }
  const units = a.units.filter((u) => ui.picked.has(u.uid));
  view.reach = units.length ? S.reachFor(G, a, units) : null;

  // 相邻的可攻击目标
  const targets = [];
  if (units.length && S.stackBudget(G, { units }) > 0) {
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      if (!dx && !dy) continue;
      const x = a.x + dx, y = a.y + dy;
      if (x < 0 || y < 0 || x >= G.map.w || y >= G.map.h) continue;
      const foe = S.armyAt(G, x, y);
      const city = S.cityAt(G, x, y);
      if ((foe && foe.owner !== a.owner) || (city && city.owner !== a.owner)) targets.push({ x, y });
    }
  }
  view.attackTargets = targets.length ? targets : null;
}

// ── 顶栏 ──────────────────────────────────────────────────

function refreshTop(ui) {
  const { G } = ui;
  // 顶栏永远显示「我」的势力与金库 —— 不随行动方切换。
  // 轮到别人（AI 或联机对手）时，只在旁边注明谁在行动。
  const me = ui.view.viewer ?? S.current(G);
  const cur = S.current(G);
  const f = FACTIONS[me];
  $('turnLabel').textContent = `第 ${G.turn} 回合`;
  const fl = $('factionLabel');
  fl.textContent = f.name + (cur !== me ? `　⏳ ${FACTIONS[cur].short} 行动中…` : '');
  fl.style.color = f.color;
  const inc = S.incomeOf(G, me), up = S.upkeepOfPlayer(G, me);
  $('goldLabel').textContent = G.gold[me];
  $('flowLabel').textContent = `+${inc} / −${up}`;
  $('flowLabel').className = inc - up >= 0 ? 'flow good' : 'flow bad';
  $('endTurn').disabled = !!G.winner || cur !== me;
}

// ── 军团面板 ──────────────────────────────────────────────

function refreshStack(ui) {
  const { G } = ui;
  const box = $('stackPanel');
  box.innerHTML = '';
  const a = ui.selectedArmy;
  if (!a) {
    box.appendChild(el('p', 'muted', '点击地图上的军团以查看队列。'));
    return;
  }

  // 「我的军团」以视角方为准 —— AI 行动时点自己的军团不能被当成敌方
  const mine = a.owner === (ui.view.viewer ?? S.current(G));
  const head = el('div', 'stack-head');
  head.appendChild(el('span', 'stack-title',
    mine ? `军团 · ${a.units.length}/${MAX_STACK}` : `${FACTIONS[a.owner].name} · ${a.units.length}/${MAX_STACK}`));
  const budget = S.stackBudget(G, a);
  head.appendChild(el('span', 'muted', mine ? `移动点 ${isFinite(budget) ? budget : 0}` : '（敌方，仅供查看）'));
  box.appendChild(head);

  const list = el('div', 'slots');
  for (const u of a.units) {
    const row = el('div', 'slot' + (mine && ui.picked.has(u.uid) ? ' picked' : ''));
    const pic = portrait(isHero(u) ? 'hero' : u.type, 30, isHero(u));
    pic.className = 'slot-pic';
    row.appendChild(pic);

    const main = el('div', 'slot-main');
    const nm = el('div', 'slot-name', unitName(G, u));
    if (isHero(u)) nm.classList.add('hero');
    main.appendChild(nm);
    // 副标：英雄显示力量与统率；兵种只在有正典词形时显示精灵语，
    // 没有词形的就不显示（绝不用占位符或重复中文名）
    const subText = isHero(u)
      ? `力量 ${unitStr(G, u)} · 统率 +${commandBonus(heroOf(G, u).str)}`
      : (unitElvish(u)?.text || '');
    if (subText) main.appendChild(el('div', 'slot-sub', subText));
    row.appendChild(main);

    const stat = el('div', 'slot-stat');
    stat.appendChild(el('span', 'str', String(unitStr(G, u))));
    const hp = el('span', 'hp');
    for (let i = 0; i < unitMaxHp(G, u); i++) hp.appendChild(el('i', i < u.hp ? 'on' : 'off'));
    stat.appendChild(hp);
    if (u.blessed) stat.appendChild(el('span', 'blessed', '✦'));
    row.appendChild(stat);

    if (mine) {
      row.onclick = () => {
        if (ui.picked.has(u.uid)) ui.picked.delete(u.uid); else ui.picked.add(u.uid);
        if (!ui.picked.size) ui.picked = new Set(a.units.map((x) => x.uid));
        updateReach(ui); refreshAll(ui);
      };
    } else {
      row.classList.remove('picked');
      row.style.cursor = 'default';
    }
    row.title = describeUnit(G, u, a);
    list.appendChild(row);
  }
  box.appendChild(list);

  if (!mine) return;

  const acts = el('div', 'acts');
  const bAll = el('button', 'mini', ui.picked.size === a.units.length ? '取消全选' : '全选');
  bAll.onclick = () => {
    ui.picked = ui.picked.size === a.units.length ? new Set([a.units[0].uid]) : new Set(a.units.map((u) => u.uid));
    updateReach(ui); refreshAll(ui);
  };
  acts.appendChild(bAll);

  const f = featureAt(G.map, a.x, a.y);
  if (S.canExplore(G, a) && a.owner === S.current(G)) {
    const b = el('button', 'mini gold', f.type === 'ruin' ? '探索遗迹' : f.type === 'temple' ? '接受祝福' : '求教先知');
    b.onclick = () => doExplore(ui);
    acts.appendChild(b);
  } else if (f && !a.units.some(isHero)) {
    acts.appendChild(el('span', 'muted tiny', `${f.name}：需英雄带队`));
  }

  if ((G.dropped || []).some((d) => d.x === a.x && d.y === a.y) && a.units.some(isHero)) {
    const b = el('button', 'mini gold', '拾取遗落神器');
    b.onclick = () => ui.dispatch({ k: 'pickup', army: a.id });
    acts.appendChild(b);
  }
  box.appendChild(acts);
}

function describeUnit(G, u, army) {
  if (isHero(u)) {
    const h = heroOf(G, u);
    const items = (h.items || []).map((i) => ITEMS[i].name).join('、') || '无';
    return `${h.name}\n力量 ${h.str}｜统率 +${commandBonus(h.str)}｜耐久 ${u.hp}/${unitMaxHp(G, u)}\n神器：${items}`;
  }
  const d = UNITS[u.type];
  const terr = Object.entries(d.terr || {}).map(([k, v]) => `${k === 'city' ? '城中' : k}${v > 0 ? '+' : ''}${v}`).join('、') || '无';
  return `${d.name}${d.nameElvish ? `（${d.nameElvish}）` : ''}\n强度 ${d.str}｜耐久 ${d.hp}｜移动 ${d.mp}\n造价 ${d.cost}｜维护 ${upkeepOf(u.type)}｜建造 ${d.build} 回合\n地形亲和：${terr}`;
}

// ── 英雄面板 ──────────────────────────────────────────────

function refreshHeroes(ui) {
  const { G } = ui;
  const box = $('heroPanel');
  box.innerHTML = '';
  const p = ui.view.viewer ?? S.current(G);   // 我的英雄，不随行动方切换
  const mine = Object.values(G.heroes).filter((h) => h.alive && h.faction === p);
  if (!mine.length) { box.appendChild(el('p', 'muted', '尚无在世英雄。')); return; }
  for (const h of mine) {
    const row = el('div', 'hero-row');
    row.appendChild(el('span', 'hero-name', h.name));
    row.appendChild(el('span', 'muted tiny', `力量 ${h.str}｜统率 +${commandBonus(h.str)}`));
    if (h.items.length) {
      const it = el('div', 'hero-items', h.items.map((i) => ITEMS[i].name).join(' · '));
      row.appendChild(it);
    }
    row.onclick = () => {
      const army = G.armies.find((a) => a.units.some((u) => isHero(u) && u.heroId === h.id));
      if (army) { R.centerOn(ui.view, army.x, army.y); selectArmy(ui, army); }
    };
    box.appendChild(row);
  }
}

// ── 城市面板 ──────────────────────────────────────────────

function refreshCity(ui) {
  const { G } = ui;
  const box = $('cityPanel');
  box.innerHTML = '';
  const c = ui.selectedCity;
  if (!c) { box.appendChild(el('p', 'muted', '点击城市以调整生产。')); return; }

  const info = CITY_SIZE[c.size];
  const head = el('div', 'city-head');
  head.appendChild(el('h4', null, c.name));
  const owner = el('span', 'chip');
  owner.textContent = FACTIONS[c.owner].name;
  owner.style.borderColor = FACTIONS[c.owner].color;
  head.appendChild(owner);
  box.appendChild(head);

  const stats = el('div', 'kv');
  const add = (k, v) => { stats.appendChild(el('span', 'k', k)); stats.appendChild(el('span', 'v', v)); };
  add('规模', info.name);
  add('收入', c.razed ? '0（已夷平）' : `${c.income}/回合`);
  add('防御', String(c.defense));
  box.appendChild(stats);

  if (c.owner !== S.current(G) || G.winner) {
    box.appendChild(el('p', 'muted tiny', c.produces.length ? `可产：${c.produces.map((t) => UNITS[t].name).join('、')}` : '不产兵'));
    return;
  }
  if (c.razed || !c.produces.length) { box.appendChild(el('p', 'muted', '该城无法生产。')); return; }

  box.appendChild(el('label', 'lbl', '生产（点卡片切换，切换会清空当前进度）'));
  const grid = el('div', 'unit-cards');
  for (const t of c.produces) grid.appendChild(unitCard(G, ui, c, t));
  box.appendChild(grid);

  if (c.building) {
    const total = UNITS[c.building.type].build;
    const bar = el('div', 'bar');
    const fill = el('div', 'bar-fill');
    fill.style.width = `${((total - c.building.turnsLeft) / total) * 100}%`;
    bar.appendChild(fill);
    box.appendChild(bar);
    box.appendChild(el('div', 'muted tiny', `还需 ${c.building.turnsLeft} / ${total} 回合`));
  }

  const vsel = el('select', 'sel');
  const none = el('option', null, '（不投送，就地出兵）'); none.value = '';
  vsel.appendChild(none);
  for (const t of S.citiesOf(G, c.owner)) {
    if (t.id === c.id) continue;
    const o = el('option', null, t.name); o.value = t.id;
    if (c.vectorTo === t.id) o.selected = true;
    vsel.appendChild(o);
  }
  vsel.onchange = () => ui.dispatch({ k: 'vector', city: c.id, target: vsel.value || null });
  box.appendChild(el('label', 'lbl', `投送目标（在途 ${S.VECTOR_DELAY} 回合）`));
  box.appendChild(vsel);

  const raze = el('button', 'mini danger', '夷平此城');
  raze.onclick = () => {
    if (confirm(`确定夷平 ${c.name}？收入归零、不再产兵，且无法恢复。`)) {
      ui.dispatch({ k: 'raze', city: c.id });
    }
  };
  box.appendChild(raze);
}

/** 兵种卡片：每排两张，摊开基本数值，取代原来的下拉框 */
function unitCard(G, ui, city, type) {
  const d = UNITS[type];
  const active = city.building && city.building.type === type;
  const card = el('div', 'ucard' + (active ? ' active' : ''));

  const head = el('div', 'ucard-head');
  const pic = portrait(type, 26, false);
  pic.className = 'ucard-pic';
  head.appendChild(pic);
  head.appendChild(el('span', 'ucard-name', d.name));
  card.appendChild(head);
  if (d.nameElvish) card.appendChild(el('div', 'ucard-elvish', d.nameElvish));

  const stats = el('div', 'ucard-stats');
  const stat = (k, v, title) => {
    const s = el('span', 'ucard-stat');
    s.appendChild(el('i', null, k));
    s.appendChild(el('b', null, String(v)));
    if (title) s.title = title;
    return s;
  };
  stats.appendChild(stat('攻', d.str, '基础强度：战斗结算的底数'));
  stats.appendChild(stat('耐', d.hp, '耐久点：掉光即阵亡'));
  stats.appendChild(stat('移', d.mp, '移动点'));
  card.appendChild(stats);

  const cost = el('div', 'ucard-cost');
  const c1 = el('span', null, `${d.cost} 金`); c1.title = '造价';
  const c2 = el('span', 'muted', `维护 ${upkeepOf(type)}`); c2.title = '每回合维护费';
  const c3 = el('span', 'muted', `${d.build} 回合`); c3.title = '建造回合数';
  cost.append(c1, c2, c3);
  card.appendChild(cost);

  const terr = Object.entries(d.terr || {})
    .map(([k, v]) => `${k === 'city' ? '城中' : (TERRAIN[k] ? TERRAIN[k].name : k)} ${v > 0 ? '+' : ''}${v}`);
  const flags = [];
  if ((d.flags || []).includes('fly')) flags.push('飞行');
  if ((d.flags || []).includes('mountaineer')) flags.push('山地');
  if ((d.flags || []).includes('fear')) flags.push('恐惧');
  if ((d.flags || []).includes('sun')) flags.push('白昼 −1');
  if ((d.flags || []).includes('antiDragon')) flags.push('对龙 +3');
  if ((d.flags || []).includes('noCapture')) flags.push('不可占城');
  const tags = [...terr, ...flags];
  if (tags.length) card.appendChild(el('div', 'ucard-tags', tags.join(' · ')));

  card.onclick = () => ui.dispatch({ k: 'produce', city: city.id, type });
  return card;
}

// ── 地块信息 ──────────────────────────────────────────────

function refreshTile(ui) {
  const { G } = ui;
  const box = $('tilePanel');
  if (!box) return;
  box.innerHTML = '';
  const t = ui.inspect;
  if (!t) { box.appendChild(el('p', 'muted', '点击地图上任意一格查看它的信息。')); return; }

  const terr = terrainAt(G.map, t.x, t.y);
  const city = S.cityAt(G, t.x, t.y);
  const feat = featureAt(G.map, t.x, t.y);
  const army = S.armyAt(G, t.x, t.y);

  const head = el('div', 'tile-head');
  head.appendChild(el('span', 'tile-name', city ? `${city.name}（城市）` : terr.name));
  head.appendChild(el('span', 'muted tiny', `(${t.x}, ${t.y})`));
  box.appendChild(head);

  const kv = el('div', 'kv');
  const add = (k, v) => { kv.appendChild(el('span', 'k', k)); kv.appendChild(el('span', 'v', v)); };
  if (terr.kind === 'water') add('通行', '仅船只与飞行单位');
  else if (terr.kind === 'river') add('通行', '不可通行，须走浅滩或桥');
  else if (terr.kind === 'mountain') add('通行', '仅山地系（消耗 3）与飞行');
  else add('移动消耗', String(terr.cost));

  if (city) {
    add('归属', FACTIONS[city.owner].name);
    add('规模', CITY_SIZE[city.size].name);
    add('收入', city.razed ? '0（已夷平）' : `${city.income}/回合`);
    add('防御', `${city.defense}（守方 +${cityDefBonus(city.defense)}）`);
  }
  box.appendChild(kv);

  // 哪些兵种在这里打得更好
  const likes = Object.entries(UNITS)
    .filter(([, u]) => u.terr && ((city && u.terr.city) || (!city && u.terr[terr.id] > 0)))
    .map(([, u]) => `${u.name} +${city ? u.terr.city : u.terr[terr.id]}`);
  if (likes.length) {
    box.appendChild(el('div', 'lbl', '在此格防守时的地形亲和'));
    box.appendChild(el('div', 'muted tiny', likes.join('、')));
  }

  if (feat) {
    box.appendChild(el('div', 'lbl', feat.type === 'ruin' ? '上古遗迹' : feat.type === 'temple' ? '众神祭坛' : '先知之所'));
    const done = feat.type === 'ruin' ? feat.explored : (feat.usedBy || []).includes(S.current(G));
    box.appendChild(el('div', 'muted tiny',
      `${feat.name}${done ? '（已探索）' : '——需英雄带队进入'}`));
  }
  if (army) {
    box.appendChild(el('div', 'lbl', '驻军'));
    box.appendChild(el('div', 'muted tiny',
      `${FACTIONS[army.owner].name} · ${army.units.length} 个单位`));
  }
  if (city && city.produces.length) {
    box.appendChild(el('div', 'lbl', '此城可产'));
    box.appendChild(el('div', 'muted tiny', city.produces.map((x) => UNITS[x].name).join('、')));
  }
}

// ── 日志 ──────────────────────────────────────────────────

function refreshLog(ui) {
  const box = $('logPanel');
  box.innerHTML = '';
  for (const l of ui.G.log.slice(-60)) {
    const row = el('div', `log log-${l.kind}`, l.text);
    box.appendChild(row);
  }
  box.scrollTop = box.scrollHeight;
}

export function refreshAll(ui) {
  refreshTop(ui);
  refreshStack(ui);
  refreshTile(ui);
  refreshHeroes(ui);
  refreshCity(ui);
  refreshLog(ui);
  const undoBtn = $('undoBtn');
  if (undoBtn) {
    undoBtn.disabled = !S.canUndo(ui.G) || ui.G.winner;
    undoBtn.title = S.canUndo(ui.G)
      ? `可撤回 ${ui.G.undo.length} 步移动（Ctrl+Z）`
      : '本回合还没有可撤回的移动（一旦交战或探索遗迹，撤回即失效）';
  }
  R.draw(ui.view);
  R.drawMinimap($('minimap'), ui.view);
  tutorialTick(ui);
}

// ── 统计曲线 ──────────────────────────────────────────────

export function statsDialog(ui) {
  modal('统计曲线', statsPanel(ui.G), [{ label: '关闭', cls: 'mini gold' }]);
}

// ── 回合开始提示（画面中央渐隐）──────────────────────────

export function turnBanner(G, text, sub) {
  document.getElementById('turnBanner')?.remove();
  const n = el('div', 'turn-banner');
  n.id = 'turnBanner';
  n.appendChild(el('div', 'tb-main', text));
  if (sub) n.appendChild(el('div', 'tb-sub', sub));
  const host = $('centerPanel') || document.body;
  host.appendChild(n);
  // 动画结束后自行移除，不留 DOM 垃圾
  n.addEventListener('animationend', () => n.remove());
}

// ── 弹窗 ──────────────────────────────────────────────────

export function modal(title, bodyNode, buttons) {
  const back = el('div', 'modal-back');
  const win = el('div', 'modal');
  win.appendChild(el('h3', null, title));
  const body = el('div', 'modal-body');
  body.appendChild(bodyNode);
  win.appendChild(body);
  const bar = el('div', 'modal-bar');
  for (const b of buttons) {
    const btn = el('button', b.cls || 'mini', b.label);
    btn.onclick = () => { back.remove(); b.onClick && b.onClick(); };
    bar.appendChild(btn);
  }
  win.appendChild(bar);
  back.appendChild(win);
  document.body.appendChild(back);
  return back;
}

// 战前预估
export function battlePreview(ui, army, tx, ty, onConfirm) {
  const { G } = ui;
  // 与实战共用同一个守军判定：攻城时守军可能停在城池四格中的任意一格
  const defender = S.resolveDefender(G, army.owner, tx, ty);
  const city = S.cityAt(G, tx, ty);
  const units = army.units.filter((u) => ui.picked.has(u.uid));

  if (!defender) {   // 真正的空城，直接进
    onConfirm();
    return;
  }
  const env = S.battleEnv(G, defender.x, defender.y);
  const odds = estimateOdds(G, units, defender.units, env, 2000, G.rng.seed ^ 0x5bf03635);

  const body = el('div');
  const head = el('div', 'preview-head');
  head.appendChild(el('div', 'side', `进攻 ${units.length} 个单位`));
  head.appendChild(el('div', 'vs', '⚔'));
  head.appendChild(el('div', 'side', `防守 ${defender.units.length} 个单位${city ? `（${city.name}）` : ''}`));
  body.appendChild(head);

  const pct = Math.round(odds.win * 100);
  const bar = el('div', 'odds');
  const fill = el('div', 'odds-fill');
  fill.style.width = `${pct}%`;
  fill.style.background = pct >= 65 ? '#6b9c4a' : pct >= 40 ? '#c9a227' : '#b0503a';
  bar.appendChild(fill);
  body.appendChild(el('div', 'lbl', `预估胜率 ${pct}%（2000 次模拟；胜时平均剩余 ${odds.avgSurvivors.toFixed(1)} 个单位）`));
  body.appendChild(bar);

  const attCtx = sideContext(G, units, { terr: env.terr, city, isDefender: false, foeUnits: defender.units });
  const defCtx = sideContext(G, defender.units, { terr: env.terr, city, isDefender: true, foeUnits: units });
  const grid = el('div', 'ms-grid');
  grid.appendChild(msColumn(G, '进攻方', units, attCtx));
  grid.appendChild(msColumn(G, '防守方', defender.units, defCtx));
  body.appendChild(grid);

  modal('战前预估', body, [
    { label: '取消', cls: 'mini' },
    { label: '进攻', cls: 'mini gold', onClick: onConfirm },
  ]);
}

function msColumn(G, title, units, ctx) {
  const col = el('div', 'ms-col');
  col.appendChild(el('h4', null, title));
  for (const u of units) {
    const row = el('div', 'ms-row');
    row.appendChild(el('span', 'ms-name', unitName(G, u)));
    row.appendChild(el('span', 'ms-val', String(computeMS(G, u, ctx, null))));
    row.title = msBreakdown(G, u, ctx, null).map(([k, v]) => `${k} ${v > 0 ? '+' : ''}${v}`).join('\n');
    col.appendChild(row);
  }
  return col;
}

// 战报
export function battleReport(ui, result, place) {
  const body = el('div');
  body.appendChild(el('div', 'lbl',
    `${result.winner === 'att' ? '进攻方获胜' : '防守方守住了阵地'} · 共 ${result.rounds} 个交锋轮`));
  const list = el('div', 'duels');
  for (const d of result.log) {
    const row = el('div', 'duel' + (d.result === 'att' ? ' a' : ' d'));
    row.appendChild(el('span', 'duel-a', `${d.att}（${d.aMS}）`));
    row.appendChild(el('span', 'duel-mid', d.result === 'att' ? '击杀 →' : '← 被击杀'));
    row.appendChild(el('span', 'duel-d', `${d.def}（${d.dMS}）`));
    list.appendChild(row);
  }
  body.appendChild(list);
  modal(`战报 · ${place}`, body, [{ label: '知道了', cls: 'mini gold' }]);
}

// 英雄求聘
export function heroOffer(ui) {
  const { G } = ui;
  const o = G.offer;
  if (!o || o.player !== S.current(G)) return;
  const body = el('div');
  body.appendChild(el('p', null,
    `${o.entry.name} 前来求聘 —— 力量 ${o.entry.str}，可为整个军团提供 +${commandBonus(o.entry.str)} 统率。`));
  body.appendChild(el('p', 'lbl', `索取酬金 ${o.cost} 金（现有 ${G.gold[o.player]} 金）`));
  const canAfford = G.gold[o.player] >= o.cost;
  modal('有英雄求聘', body, [
    { label: '婉拒', cls: 'mini', onClick: () => ui.dispatch({ k: 'hero', accept: false }) },
    {
      label: canAfford ? '雇佣' : '金币不足', cls: canAfford ? 'mini gold' : 'mini',
      onClick: () => { if (canAfford) ui.dispatch({ k: 'hero', accept: true }); },
    },
  ]);
}

// 遗迹结果
export function featureResult(ui, res, f) {
  const body = el('div');
  if (res.type === 'temple') body.appendChild(el('p', null, `${res.blessed} 个单位获得永久 +1 的祝福。`));
  else if (res.type === 'sage') body.appendChild(el('p', null, `先知赠予 ${res.gold} 金。`));
  else if (!res.win) body.appendChild(el('p', null, `守护者 ${UNITS[res.guardian].name} 击退了你的队伍。遗迹仍在，可再来。`));
  else {
    body.appendChild(el('p', null, `你的队伍斩杀了守护者 ${UNITS[res.guardian].name}。`));
    if (res.reward === 'gold') body.appendChild(el('p', 'lbl', `得金 ${res.gold}`));
    if (res.item) body.appendChild(el('p', 'lbl', `取得神器：${ITEMS[res.item].name} —— ${ITEMS[res.item].desc}`));
    if (res.ally) body.appendChild(el('p', 'lbl', `${UNITS[res.ally].name} 加入了你的军团`));
    if (res.might) body.appendChild(el('p', 'lbl', `英雄的力量增至 ${res.might}`));
    if (res.intel) body.appendChild(el('p', 'lbl', '得到一份地图情报'));
  }
  modal(f.name, body, [{ label: '好', cls: 'mini gold' }]);
}

function doExplore(ui) {
  const a = ui.selectedArmy;
  if (!a) return;
  ui.dispatch({ k: 'explore', army: a.id });
}

// 生产总览（HD 版被称赞的那张表）
export function productionOverview(ui) {
  const { G } = ui;
  const p = ui.view.viewer ?? S.current(G);
  const wrap = el('div');
  const table = el('table', 'ov');
  const thead = el('tr');
  for (const h of ['城市', '规模', '收入', '正在生产', '剩余', '投送至']) thead.appendChild(el('th', null, h));
  table.appendChild(thead);

  for (const c of S.citiesOf(G, p)) {
    const tr = el('tr');
    tr.appendChild(el('td', null, c.name));
    tr.appendChild(el('td', null, CITY_SIZE[c.size].name));
    tr.appendChild(el('td', null, String(c.razed ? 0 : c.income)));

    const tdProd = el('td');
    if (c.razed || !c.produces.length) tdProd.textContent = '—';
    else {
      const sel = el('select', 'sel tiny');
      for (const t of c.produces) {
        const o = el('option', null, UNITS[t].name); o.value = t;
        if (c.building && c.building.type === t) o.selected = true;
        sel.appendChild(o);
      }
      sel.onchange = () => ui.dispatch({ k: 'produce', city: c.id, type: sel.value });
      tdProd.appendChild(sel);
    }
    tr.appendChild(tdProd);
    tr.appendChild(el('td', null, c.building ? `${c.building.turnsLeft} 回合` : '—'));

    const tdVec = el('td');
    if (!c.razed && c.produces.length) {
      const vsel = el('select', 'sel tiny');
      const none = el('option', null, '就地'); none.value = '';
      vsel.appendChild(none);
      for (const t of S.citiesOf(G, p)) {
        if (t.id === c.id) continue;
        const o = el('option', null, t.name); o.value = t.id;
        if (c.vectorTo === t.id) o.selected = true;
        vsel.appendChild(o);
      }
      vsel.onchange = () => ui.dispatch({ k: 'vector', city: c.id, target: vsel.value || null });
      tdVec.appendChild(vsel);
    } else tdVec.textContent = '—';
    tr.appendChild(tdVec);
    table.appendChild(tr);
  }
  wrap.appendChild(table);

  if (G.pending.filter((x) => x.owner === p).length) {
    wrap.appendChild(el('h4', null, '在途投送'));
    for (const pd of G.pending.filter((x) => x.owner === p)) {
      wrap.appendChild(el('div', 'muted tiny',
        `${UNITS[pd.type].name}：${S.cityById(G, pd.from)?.name} → ${S.cityById(G, pd.target)?.name}，还需 ${pd.turnsLeft} 回合`));
    }
  }

  const inc = S.incomeOf(G, p), up = S.upkeepOfPlayer(G, p);
  wrap.appendChild(el('div', 'lbl', `合计收入 ${inc}／维护 ${up}／净额 ${inc - up >= 0 ? '+' : ''}${inc - up}`));
  modal('生产总览', wrap, [{ label: '关闭', cls: 'mini gold' }]);
}

// 战史：最近的每一场战斗，点开看完整的逐次决斗
export function battleHistory(ui) {
  const { G } = ui;
  const wrap = el('div');
  if (!G.battles.length) {
    wrap.appendChild(el('p', 'muted', '还没有打过仗。'));
    modal('战史', wrap, [{ label: '关闭', cls: 'mini gold' }]);
    return;
  }
  for (const b of G.battles.slice().reverse()) {
    const row = el('div', 'bh-row' + (b.winner === 'att' ? ' win' : ' lose'));
    const head = el('div', 'bh-head');
    head.appendChild(el('span', 'bh-turn', `第 ${b.turn} 回合`));
    head.appendChild(el('span', 'bh-place', b.place));
    head.appendChild(el('span', 'bh-sides',
      `${FACTIONS[b.attacker].short} → ${FACTIONS[b.defender].short}`));
    head.appendChild(el('span', 'bh-result',
      b.winner === 'att' ? `攻方胜（损 ${b.attLost}／歼 ${b.defLost}）` : `守方胜（歼 ${b.attLost}／损 ${b.defLost}）`));
    row.appendChild(head);

    const detail = el('div', 'bh-detail');
    detail.style.display = 'none';
    for (const d of b.duels) {
      const line = el('div', 'duel' + (d.result === 'att' ? ' a' : ' d'));
      line.appendChild(el('span', 'duel-a', `${d.att}（${d.aMS}）`));
      line.appendChild(el('span', 'duel-mid', d.result === 'att' ? '击杀 →' : '← 被击杀'));
      line.appendChild(el('span', 'duel-d', `${d.def}（${d.dMS}）`));
      detail.appendChild(line);
    }
    row.appendChild(detail);
    head.onclick = () => { detail.style.display = detail.style.display === 'none' ? '' : 'none'; };
    wrap.appendChild(row);
  }
  modal(`战史 · 最近 ${G.battles.length} 场`, wrap, [{ label: '关闭', cls: 'mini gold' }]);
}

export function victoryDialog(ui) {
  const { G } = ui;
  const f = FACTIONS[G.winner];
  const body = el('div');
  body.appendChild(el('p', null, `${f.name} 取得了胜利。`));
  body.appendChild(el('p', 'muted', `共 ${G.turn} 回合。`));
  modal('战局结束', body, [
    { label: '返回大厅', cls: 'mini gold', onClick: () => location.reload() },
  ]);
}
