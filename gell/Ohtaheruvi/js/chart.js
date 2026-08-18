// 逐回合统计曲线图（SVG）
//
// 三张小多图，各自独立的一根 y 轴 —— 金币、城池数、部队数量纲不同，
// 绝不共用一张图的双轴。
//
// 配色不用地图上的势力色：那套色是为了在地形上可辨（并有纹章双编码）而选的，
// 拿来做图表通不过校验（#4a8a5a↔#c04a3a 的 CVD ΔE 仅 4.6，正常视觉 7.9，
// 低于 15 的硬底线）。这里改用经校验的分类色板按固定槽位分配，
// 身份由图例中的势力纹章 + 名称 + 线端直接标注承担，不靠颜色单独承担。

import { FACTIONS } from '../data/factions.js';

const PALETTE_LIGHT = ['#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#e87ba4', '#008300', '#4a3aa7', '#e34948'];
const PALETTE_DARK  = ['#3987e5', '#d95926', '#199e70', '#c98500', '#d55181', '#008300', '#9085e9', '#e66767'];

const METRICS = [
  { key: 'gold',   label: '金币',   fmt: (v) => String(v) },
  { key: 'cities', label: '城池数', fmt: (v) => String(v) },
  { key: 'units',  label: '部队数', fmt: (v) => String(v) },
];

const NS = 'http://www.w3.org/2000/svg';
const svgEl = (tag, attrs = {}) => {
  const n = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, v);
  return n;
};
const el = (tag, cls, text) => {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text != null) n.textContent = text;
  return n;
};

function isDark() {
  const stamped = document.documentElement.getAttribute('data-theme');
  if (stamped) return stamped === 'dark';
  return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
}

export function statsPanel(G) {
  const wrap = el('div', 'stats-wrap');
  const dark = isDark();
  const palette = dark ? PALETTE_DARK : PALETTE_LIGHT;
  const series = G.players.map((p, i) => ({
    player: p, faction: FACTIONS[p], color: palette[i % palette.length],
  }));

  if (G.history.length < 2) {
    wrap.appendChild(el('p', 'muted', '还没有足够的数据——至少要经过两个回合才画得出曲线。'));
    return wrap;
  }

  // 图例：色块 + 纹章 + 名称，身份不靠颜色单独承担
  const legend = el('div', 'chart-legend');
  for (const s of series) {
    const item = el('span', 'legend-item');
    const dot = el('span', 'legend-dot');
    dot.style.background = s.color;
    item.appendChild(dot);
    item.appendChild(el('span', 'legend-emblem', s.faction.emblem));
    item.appendChild(el('span', null, s.faction.name));
    legend.appendChild(item);
  }
  wrap.appendChild(legend);

  const charts = el('div', 'charts');
  for (const m of METRICS) charts.appendChild(lineChart(G, series, m, dark));
  wrap.appendChild(charts);

  // 表格视图：低对比色槽位的兜底，也方便直接读数
  const toggle = el('button', 'mini', '切换表格视图');
  const table = buildTable(G, series);
  table.style.display = 'none';
  toggle.onclick = () => {
    const showTable = table.style.display === 'none';
    table.style.display = showTable ? '' : 'none';
    charts.style.display = showTable ? 'none' : '';
    toggle.textContent = showTable ? '切换曲线视图' : '切换表格视图';
  };
  wrap.appendChild(toggle);
  wrap.appendChild(table);
  return wrap;
}

function lineChart(G, series, metric, dark) {
  const W = 620, H = 168, ML = 46, MR = 62, MT = 22, MB = 26;
  const plotW = W - ML - MR, plotH = H - MT - MB;

  const turns = G.history.map((h) => h.turn);
  const t0 = turns[0], t1 = turns[turns.length - 1];
  let vMax = 0;
  for (const h of G.history) for (const s of series) vMax = Math.max(vMax, h.by[s.player]?.[metric.key] ?? 0);
  vMax = niceMax(vMax);

  const sx = (t) => ML + (t1 === t0 ? 0 : ((t - t0) / (t1 - t0)) * plotW);
  const sy = (v) => MT + plotH - (vMax === 0 ? 0 : (v / vMax) * plotH);

  const box = el('figure', 'chart');
  box.appendChild(el('figcaption', 'chart-title', metric.label));

  const svg = svgEl('svg', {
    viewBox: `0 0 ${W} ${H}`, class: 'chart-svg',
    role: 'img', 'aria-label': `${metric.label}逐回合变化`,
  });

  const ink = dark ? '#c3c2b7' : '#52514e';
  const grid = dark ? '#3a352c' : '#ddd6c4';

  // 网格与 y 轴刻度（弱化）
  for (let i = 0; i <= 2; i++) {
    const v = (vMax / 2) * i;
    const y = sy(v);
    svg.appendChild(svgEl('line', { x1: ML, x2: ML + plotW, y1: y, y2: y, stroke: grid, 'stroke-width': 1 }));
    const t = svgEl('text', { x: ML - 8, y: y + 4, 'text-anchor': 'end', fill: ink, 'font-size': 11 });
    t.textContent = metric.fmt(Math.round(v));
    svg.appendChild(t);
  }
  // x 轴刻度
  const step = Math.max(1, Math.ceil((t1 - t0) / 6));
  for (let t = t0; t <= t1; t += step) {
    const x = sx(t);
    const lab = svgEl('text', { x, y: H - 8, 'text-anchor': 'middle', fill: ink, 'font-size': 11 });
    lab.textContent = String(t);
    svg.appendChild(lab);
  }

  // 数据线
  for (const s of series) {
    const pts = G.history
      .map((h) => ({ t: h.turn, v: h.by[s.player]?.[metric.key] }))
      .filter((p) => p.v != null);
    if (!pts.length) continue;
    const d = pts.map((p, i) => `${i ? 'L' : 'M'}${sx(p.t).toFixed(1)},${sy(p.v).toFixed(1)}`).join(' ');
    svg.appendChild(svgEl('path', {
      d, fill: 'none', stroke: s.color, 'stroke-width': 2,
      'stroke-linejoin': 'round', 'stroke-linecap': 'round',
    }));
    // 线端直接标注：彩色圆点 + 文字（文字用文本色，不用系列色）
    const last = pts[pts.length - 1];
    svg.appendChild(svgEl('circle', { cx: sx(last.t), cy: sy(last.v), r: 3.5, fill: s.color }));
    const lab = svgEl('text', {
      x: sx(last.t) + 8, y: sy(last.v) + 4, fill: ink, 'font-size': 11,
    });
    lab.textContent = `${s.faction.short} ${metric.fmt(last.v)}`;
    svg.appendChild(lab);
  }

  // 悬停十字准星
  const cross = svgEl('line', { y1: MT, y2: MT + plotH, stroke: ink, 'stroke-width': 1, 'stroke-dasharray': '3 3', opacity: 0 });
  svg.appendChild(cross);
  const dots = svgEl('g', { opacity: 0 });
  svg.appendChild(dots);

  const tip = el('div', 'chart-tip');
  tip.style.display = 'none';
  box.appendChild(tip);

  const hit = svgEl('rect', { x: ML, y: MT, width: plotW, height: plotH, fill: 'transparent' });
  svg.appendChild(hit);

  svg.addEventListener('pointermove', (e) => {
    const r = svg.getBoundingClientRect();
    const px = ((e.clientX - r.left) / r.width) * W;
    if (px < ML || px > ML + plotW) return;
    const t = Math.round(t0 + ((px - ML) / plotW) * (t1 - t0));
    const row = G.history.find((h) => h.turn === t) || G.history[G.history.length - 1];
    cross.setAttribute('x1', sx(row.turn));
    cross.setAttribute('x2', sx(row.turn));
    cross.setAttribute('opacity', 1);
    dots.innerHTML = '';
    for (const s of series) {
      const v = row.by[s.player]?.[metric.key];
      if (v == null) continue;
      dots.appendChild(svgEl('circle', { cx: sx(row.turn), cy: sy(v), r: 4.5, fill: s.color, stroke: dark ? '#1a1a19' : '#fff', 'stroke-width': 2 }));
    }
    dots.setAttribute('opacity', 1);
    tip.style.display = '';
    tip.innerHTML = `<b>第 ${row.turn} 回合</b>` + series.map((s) => {
      const v = row.by[s.player]?.[metric.key];
      return v == null ? '' : `<span><i style="background:${s.color}"></i>${s.faction.short} ${metric.fmt(v)}</span>`;
    }).join('');
    const relX = (sx(row.turn) / W) * r.width;
    tip.style.left = `${Math.min(r.width - 130, Math.max(0, relX - 60))}px`;
  });
  svg.addEventListener('pointerleave', () => {
    cross.setAttribute('opacity', 0);
    dots.setAttribute('opacity', 0);
    tip.style.display = 'none';
  });

  box.appendChild(svg);
  return box;
}

// 小数值取偶数上界，保证中间那道刻度也是整数（城池数这类小整数序列尤其需要）
function niceMax(v) {
  if (v <= 2) return 2;
  if (v <= 4) return 4;
  if (v <= 6) return 6;
  if (v <= 10) return 10;
  const mag = 10 ** Math.floor(Math.log10(v));
  return Math.ceil(v / mag) * mag;
}

function buildTable(G, series) {
  const t = el('table', 'ov');
  const head = el('tr');
  head.appendChild(el('th', null, '回合'));
  for (const s of series) for (const m of METRICS) head.appendChild(el('th', null, `${s.faction.short}·${m.label}`));
  t.appendChild(head);
  for (const h of G.history) {
    const tr = el('tr');
    tr.appendChild(el('td', null, String(h.turn)));
    for (const s of series) for (const m of METRICS) {
      tr.appendChild(el('td', null, String(h.by[s.player]?.[m.key] ?? '—')));
    }
    t.appendChild(tr);
  }
  return t;
}
