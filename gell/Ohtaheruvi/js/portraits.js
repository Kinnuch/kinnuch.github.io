// 单位肖像：程序化绘制的圆形剪影
//
// 不用任何图片素材（版权红线 + 体积上限），全部用路径画。
// 每个兵种按它的族裔与兵种类型选一个「原型」——头盔、弓、马首、龙头、
// 骷髅、船帆、翼、角……再套上该兵种的色板。
// 画好的肖像按「类型 + 尺寸」缓存成离屏画布，同一种只画一次。

import { UNITS } from '../data/units.js';

const cache = new Map();

/** 从兵种的 tags / flags 推出该用哪个原型 */
export function archetypeOf(def) {
  const tags = def.tags || [], flags = def.flags || [];
  if (tags.includes('dragon')) return 'dragon';
  if (tags.includes('maia')) return 'balrog';
  if (tags.includes('undead')) return 'undead';
  if (tags.includes('troll')) return 'troll';
  if (tags.includes('ship') || flags.includes('ship')) return 'ship';
  if (flags.includes('fly')) return 'wing';
  if (tags.includes('beast')) return 'beast';
  if (tags.includes('mounted')) return 'mounted';
  if (def.id && /archer|bow/.test(def.id)) return 'archer';
  if (tags.includes('dwarf')) return 'dwarf';
  if (tags.includes('orc')) return 'orc';
  if (tags.includes('elf')) return 'elf';
  return 'man';
}

const INK = '#241d14';

/** 画一枚肖像到给定尺寸的离屏画布上；结果缓存 */
export function portrait(type, size, isHero) {
  const key = `${type}|${size}|${isHero ? 'h' : ''}`;
  const hit = cache.get(key);
  if (hit) return hit;

  const cv = document.createElement('canvas');
  cv.width = size; cv.height = size;
  const c = cv.getContext('2d');
  const def = UNITS[type];
  const base = isHero ? '#d4af5a' : (def ? def.swatch : '#888');
  const arch = isHero ? 'hero' : archetypeOf(def || {});

  // 底：径向渐变让圆盘有点体积感
  const grad = c.createRadialGradient(size * 0.38, size * 0.32, size * 0.05, size * 0.5, size * 0.5, size * 0.55);
  grad.addColorStop(0, lighten(base, 0.28));
  grad.addColorStop(1, darken(base, 0.18));
  c.beginPath();
  c.arc(size / 2, size / 2, size / 2 - 1, 0, Math.PI * 2);
  c.fillStyle = grad;
  c.fill();

  c.save();
  c.beginPath();
  c.arc(size / 2, size / 2, size / 2 - 1.5, 0, Math.PI * 2);
  c.clip();
  drawArchetype(c, arch, size, base);
  c.restore();

  // 深色收边：整套美术的「棋盘感」就靠它
  c.beginPath();
  c.arc(size / 2, size / 2, size / 2 - 1, 0, Math.PI * 2);
  c.strokeStyle = INK;
  c.lineWidth = Math.max(1.5, size * 0.045);
  c.stroke();

  cache.set(key, cv);
  return cv;
}

function drawArchetype(c, arch, S, base) {
  const dark = darken(base, 0.42), light = lighten(base, 0.4);
  c.lineJoin = 'round';
  c.lineCap = 'round';
  c.strokeStyle = INK;
  c.lineWidth = Math.max(1, S * 0.035);
  const cx = S / 2;

  const helm = (browTop, crest) => {
    // 肩甲
    c.fillStyle = dark;
    c.beginPath();
    c.moveTo(S * 0.14, S * 1.02);
    c.quadraticCurveTo(S * 0.5, S * 0.66, S * 0.86, S * 1.02);
    c.closePath(); c.fill(); c.stroke();
    // 盔
    c.fillStyle = light;
    c.beginPath();
    c.moveTo(S * 0.30, S * 0.70);
    c.lineTo(S * 0.30, browTop);
    c.quadraticCurveTo(cx, S * 0.14, S * 0.70, browTop);
    c.lineTo(S * 0.70, S * 0.70);
    c.closePath(); c.fill(); c.stroke();
    // 面罩缝
    c.fillStyle = INK;
    c.fillRect(S * 0.34, S * 0.45, S * 0.32, S * 0.07);
    if (crest) {   // 盔顶饰
      c.fillStyle = dark;
      c.beginPath();
      c.moveTo(cx, S * 0.10);
      c.quadraticCurveTo(S * 0.62, S * 0.22, cx, S * 0.30);
      c.quadraticCurveTo(S * 0.38, S * 0.22, cx, S * 0.10);
      c.closePath(); c.fill(); c.stroke();
    }
  };

  switch (arch) {
    case 'man':   helm(S * 0.34, false); break;
    case 'elf':   helm(S * 0.30, true); break;
    case 'dwarf': {
      helm(S * 0.36, false);
      c.fillStyle = dark;    // 大胡子
      c.beginPath();
      c.moveTo(S * 0.32, S * 0.56);
      c.quadraticCurveTo(cx, S * 1.00, S * 0.68, S * 0.56);
      c.closePath(); c.fill(); c.stroke();
      break;
    }
    case 'orc': {
      c.fillStyle = dark;    // 歪斜的粗盔
      c.beginPath();
      c.moveTo(S * 0.18, S * 0.98);
      c.quadraticCurveTo(S * 0.5, S * 0.60, S * 0.84, S * 0.98);
      c.closePath(); c.fill(); c.stroke();
      c.fillStyle = light;
      c.beginPath();
      c.moveTo(S * 0.28, S * 0.66);
      c.quadraticCurveTo(cx, S * 0.16, S * 0.74, S * 0.62);
      c.lineTo(S * 0.68, S * 0.68);
      c.closePath(); c.fill(); c.stroke();
      c.fillStyle = '#c9d64a';   // 一点黄眼
      c.beginPath(); c.arc(S * 0.42, S * 0.50, S * 0.045, 0, Math.PI * 2); c.fill();
      c.beginPath(); c.arc(S * 0.58, S * 0.48, S * 0.045, 0, Math.PI * 2); c.fill();
      break;
    }
    case 'archer': {
      helm(S * 0.34, false);
      c.strokeStyle = INK;   // 弓
      c.lineWidth = Math.max(1.4, S * 0.055);
      c.beginPath();
      c.arc(S * 0.72, S * 0.55, S * 0.28, Math.PI * 0.62, Math.PI * 1.38, true);
      c.stroke();
      c.lineWidth = Math.max(1, S * 0.025);
      c.beginPath();
      c.moveTo(S * 0.62, S * 0.30); c.lineTo(S * 0.62, S * 0.80);
      c.stroke();
      break;
    }
    case 'mounted': {
      c.fillStyle = dark;    // 马首侧影
      c.beginPath();
      c.moveTo(S * 0.20, S * 0.92);
      c.quadraticCurveTo(S * 0.22, S * 0.46, S * 0.50, S * 0.38);
      c.quadraticCurveTo(S * 0.60, S * 0.20, S * 0.74, S * 0.22);
      c.quadraticCurveTo(S * 0.86, S * 0.30, S * 0.80, S * 0.46);
      c.quadraticCurveTo(S * 0.70, S * 0.56, S * 0.56, S * 0.60);
      c.quadraticCurveTo(S * 0.50, S * 0.80, S * 0.52, S * 0.96);
      c.closePath(); c.fill(); c.stroke();
      c.fillStyle = light;   // 鬃
      c.beginPath();
      c.moveTo(S * 0.50, S * 0.38);
      c.quadraticCurveTo(S * 0.42, S * 0.24, S * 0.56, S * 0.20);
      c.quadraticCurveTo(S * 0.54, S * 0.32, S * 0.62, S * 0.36);
      c.closePath(); c.fill();
      break;
    }
    case 'dragon': {
      c.fillStyle = dark;    // 龙首
      c.beginPath();
      c.moveTo(S * 0.16, S * 0.66);
      c.quadraticCurveTo(S * 0.34, S * 0.30, S * 0.66, S * 0.30);
      c.quadraticCurveTo(S * 0.94, S * 0.32, S * 0.92, S * 0.54);
      c.quadraticCurveTo(S * 0.72, S * 0.60, S * 0.60, S * 0.72);
      c.quadraticCurveTo(S * 0.36, S * 0.86, S * 0.16, S * 0.66);
      c.closePath(); c.fill(); c.stroke();
      c.fillStyle = light;   // 角
      c.beginPath();
      c.moveTo(S * 0.52, S * 0.32); c.lineTo(S * 0.44, S * 0.10); c.lineTo(S * 0.64, S * 0.28);
      c.closePath(); c.fill(); c.stroke();
      c.fillStyle = '#ffd24a';
      c.beginPath(); c.arc(S * 0.70, S * 0.44, S * 0.05, 0, Math.PI * 2); c.fill();
      break;
    }
    case 'balrog': {
      c.fillStyle = '#2a1408';
      c.beginPath();
      c.arc(cx, S * 0.56, S * 0.30, 0, Math.PI * 2);
      c.fill(); c.stroke();
      c.strokeStyle = '#e8641c';   // 两只角
      c.lineWidth = Math.max(1.6, S * 0.06);
      c.beginPath();
      c.moveTo(S * 0.34, S * 0.34); c.quadraticCurveTo(S * 0.22, S * 0.12, S * 0.40, S * 0.06);
      c.moveTo(S * 0.66, S * 0.34); c.quadraticCurveTo(S * 0.78, S * 0.12, S * 0.60, S * 0.06);
      c.stroke();
      c.fillStyle = '#ffb020';
      c.beginPath(); c.arc(S * 0.42, S * 0.54, S * 0.055, 0, Math.PI * 2); c.fill();
      c.beginPath(); c.arc(S * 0.58, S * 0.54, S * 0.055, 0, Math.PI * 2); c.fill();
      break;
    }
    case 'troll': {
      c.fillStyle = dark;
      c.beginPath();
      c.ellipse(cx, S * 0.58, S * 0.32, S * 0.30, 0, 0, Math.PI * 2);
      c.fill(); c.stroke();
      c.fillStyle = '#efe6d2';   // 獠牙
      c.beginPath();
      c.moveTo(S * 0.40, S * 0.66); c.lineTo(S * 0.44, S * 0.82); c.lineTo(S * 0.48, S * 0.66);
      c.closePath(); c.fill();
      c.beginPath();
      c.moveTo(S * 0.54, S * 0.66); c.lineTo(S * 0.58, S * 0.84); c.lineTo(S * 0.62, S * 0.66);
      c.closePath(); c.fill();
      c.fillStyle = INK;
      c.beginPath(); c.arc(S * 0.42, S * 0.46, S * 0.04, 0, Math.PI * 2); c.fill();
      c.beginPath(); c.arc(S * 0.60, S * 0.46, S * 0.04, 0, Math.PI * 2); c.fill();
      break;
    }
    case 'undead': {
      c.fillStyle = '#e6e2d4';   // 骷髅
      c.beginPath();
      c.ellipse(cx, S * 0.50, S * 0.26, S * 0.29, 0, 0, Math.PI * 2);
      c.fill(); c.stroke();
      c.fillStyle = '#1a1a22';
      c.beginPath(); c.ellipse(S * 0.41, S * 0.48, S * 0.07, S * 0.08, 0, 0, Math.PI * 2); c.fill();
      c.beginPath(); c.ellipse(S * 0.59, S * 0.48, S * 0.07, S * 0.08, 0, 0, Math.PI * 2); c.fill();
      c.fillRect(S * 0.46, S * 0.62, S * 0.08, S * 0.10);
      break;
    }
    case 'wing': {
      c.fillStyle = light;      // 展开的双翼
      c.beginPath();
      c.moveTo(cx, S * 0.44);
      c.quadraticCurveTo(S * 0.20, S * 0.24, S * 0.06, S * 0.52);
      c.quadraticCurveTo(S * 0.28, S * 0.52, cx, S * 0.70);
      c.quadraticCurveTo(S * 0.72, S * 0.52, S * 0.94, S * 0.52);
      c.quadraticCurveTo(S * 0.80, S * 0.24, cx, S * 0.44);
      c.closePath(); c.fill(); c.stroke();
      c.fillStyle = dark;
      c.beginPath();
      c.ellipse(cx, S * 0.40, S * 0.10, S * 0.13, 0, 0, Math.PI * 2);
      c.fill(); c.stroke();
      break;
    }
    case 'beast': {
      c.fillStyle = dark;       // 兽首 + 尖耳
      c.beginPath();
      c.ellipse(cx, S * 0.58, S * 0.28, S * 0.26, 0, 0, Math.PI * 2);
      c.fill(); c.stroke();
      c.beginPath();
      c.moveTo(S * 0.30, S * 0.40); c.lineTo(S * 0.26, S * 0.16); c.lineTo(S * 0.48, S * 0.34);
      c.closePath(); c.fill(); c.stroke();
      c.beginPath();
      c.moveTo(S * 0.70, S * 0.40); c.lineTo(S * 0.74, S * 0.16); c.lineTo(S * 0.52, S * 0.34);
      c.closePath(); c.fill(); c.stroke();
      c.fillStyle = '#ffd24a';
      c.beginPath(); c.arc(S * 0.42, S * 0.56, S * 0.045, 0, Math.PI * 2); c.fill();
      c.beginPath(); c.arc(S * 0.58, S * 0.56, S * 0.045, 0, Math.PI * 2); c.fill();
      break;
    }
    case 'ship': {
      c.fillStyle = '#f2ead6';   // 帆
      c.beginPath();
      c.moveTo(cx, S * 0.14); c.lineTo(S * 0.78, S * 0.60); c.lineTo(S * 0.26, S * 0.60);
      c.closePath(); c.fill(); c.stroke();
      c.fillStyle = dark;        // 船身
      c.beginPath();
      c.moveTo(S * 0.14, S * 0.64);
      c.quadraticCurveTo(cx, S * 0.96, S * 0.86, S * 0.64);
      c.closePath(); c.fill(); c.stroke();
      break;
    }
    case 'hero': {
      helm(S * 0.36, false);
      c.fillStyle = '#f0d070';   // 王冠
      c.beginPath();
      c.moveTo(S * 0.28, S * 0.32);
      c.lineTo(S * 0.28, S * 0.16); c.lineTo(S * 0.39, S * 0.26);
      c.lineTo(cx, S * 0.12); c.lineTo(S * 0.61, S * 0.26);
      c.lineTo(S * 0.72, S * 0.16); c.lineTo(S * 0.72, S * 0.32);
      c.closePath(); c.fill(); c.stroke();
      break;
    }
    default: helm(S * 0.34, false);
  }
}

// ── 颜色工具 ──────────────────────────────────────────────

function parse(hex) {
  const h = hex.replace('#', '');
  const n = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
const clamp = (v) => Math.max(0, Math.min(255, Math.round(v)));
const toHex = (r, g, b) => `#${[r, g, b].map((v) => clamp(v).toString(16).padStart(2, '0')).join('')}`;

export function lighten(hex, amt) {
  const [r, g, b] = parse(hex);
  return toHex(r + (255 - r) * amt, g + (255 - g) * amt, b + (255 - b) * amt);
}
export function darken(hex, amt) {
  const [r, g, b] = parse(hex);
  return toHex(r * (1 - amt), g * (1 - amt), b * (1 - amt));
}

export function clearPortraitCache() { cache.clear(); }
