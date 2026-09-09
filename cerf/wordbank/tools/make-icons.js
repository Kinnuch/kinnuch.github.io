// Minimal PNG writer (no deps) — draws the wordbank app icon: an open book on midnight blue.
const zlib = require('zlib'), fs = require('fs');

function png(w, h, rgba) {
  const raw = Buffer.alloc((w * 4 + 1) * h);
  for (let y = 0; y < h; y++) {
    raw[y * (w * 4 + 1)] = 0;                        // filter: none
    rgba.copy(raw, y * (w * 4 + 1) + 1, y * w * 4, (y + 1) * w * 4);
  }
  const idat = zlib.deflateSync(raw, { level: 9 });
  const chunk = (type, data) => {
    const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
    const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
    const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(body) >>> 0);
    return Buffer.concat([len, body, crc]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr), chunk('IDAT', idat), chunk('IEND', Buffer.alloc(0)),
  ]);
}
let T = null;
function crc32(buf) {
  if (!T) { T = new Int32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; T[n] = c; } }
  let c = -1; for (let i = 0; i < buf.length; i++) c = T[(c ^ buf[i]) & 0xff] ^ (c >>> 8); return c ^ -1;
}

const BG1 = [26, 26, 46], BG2 = [42, 42, 62], GOLD = [212, 165, 74], PAPER = [244, 238, 225];

// `inset` shrinks the glyph so a maskable icon survives Android's circular crop
function draw(S, inset, round) {
  const buf = Buffer.alloc(S * S * 4);
  const SS = 3;                                    // supersampling for smooth edges
  const cx = S / 2, cy = S / 2, g = S * inset;     // glyph box side
  const hw = g * 0.40, yT = cy - g * 0.30, yB = cy + g * 0.30, dip = g * 0.085;
  const r = round ? S * 0.22 : 0;

  const inRound = (x, y) => {
    if (!round) return true;
    const dx = Math.max(r - x, 0, x - (S - r)), dy = Math.max(r - y, 0, y - (S - r));
    return dx * dx + dy * dy <= r * r;
  };
  const shape = (x, y) => {
    const t = Math.abs(x - cx) / hw;
    if (t > 1) return 0;
    const top = yT + dip * (1 - t * t), bot = yB - dip * (1 - t * t) * 0.55;
    if (y < top || y > bot) return 0;
    if (Math.abs(x - cx) < g * 0.018) return 2;            // spine
    // three ruled lines per page
    const rel = (y - top) / (bot - top);
    for (const p of [0.30, 0.52, 0.74]) {
      if (Math.abs(rel - p) < 0.052 && t > 0.10 && t < 0.86 - p * 0.30) return 2;
    }
    return 1;
  };

  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    let acc = [0, 0, 0, 0];
    for (let sy = 0; sy < SS; sy++) for (let sx = 0; sx < SS; sx++) {
      const px = x + (sx + 0.5) / SS, py = y + (sy + 0.5) / SS;
      let col;
      if (!inRound(px, py)) col = [0, 0, 0, 0];
      else {
        const k = py / S, bg = [0, 1, 2].map(i => Math.round(BG1[i] + (BG2[i] - BG1[i]) * k));
        const s = shape(px, py);
        col = s === 1 ? [...PAPER, 255] : s === 2 ? [...GOLD, 255] : [...bg, 255];
      }
      for (let i = 0; i < 4; i++) acc[i] += col[i];
    }
    const o = (y * S + x) * 4, n = SS * SS;
    for (let i = 0; i < 4; i++) buf[o + i] = Math.round(acc[i] / n);
  }
  return png(S, S, buf);
}

const dir = process.argv[2];
fs.writeFileSync(dir + '/icon-192.png', draw(192, 0.62, true));
fs.writeFileSync(dir + '/icon-512.png', draw(512, 0.62, true));
fs.writeFileSync(dir + '/icon-maskable-512.png', draw(512, 0.45, false));
fs.writeFileSync(dir + '/apple-touch-icon.png', draw(180, 0.62, false));
console.log('icons written');
