// Merge kajweb/dict word books into one compact offline dictionary for the wordbank PWA.
const fs = require('fs'), path = require('path');
const SRC = process.argv[2], OUT = process.argv[3];

// bit order = display order in the app; several textbook volumes collapse into one book
const BOOKS = [
  ['xiaoxue', '小学',  ['PEPXiaoXue3_1','PEPXiaoXue3_2','PEPXiaoXue4_1','PEPXiaoXue4_2','PEPXiaoXue5_1','PEPXiaoXue5_2','PEPXiaoXue6_1','PEPXiaoXue6_2']],
  ['chuzhong','初中',  ['ChuZhong_3']],
  ['gaozhong','高中',  ['GaoZhong_2']],
  ['cet4',    '四级',  ['CET4_2']],
  ['cet6',    '六级',  ['CET6_3']],
  ['kaoyan',  '考研',  ['KaoYan_2']],
  ['tem4',    '专四',  ['Level4_2']],
  ['tem8',    '专八',  ['Level8_2']],
  ['ielts',   '雅思',  ['IELTS_3']],
  ['toefl',   '托福',  ['TOEFL_2']],
  ['gre',     'GRE',   ['GRE_3']],
  ['sat',     'SAT',   ['SAT_2']],
  ['bec',     'BEC',   ['BEC_3']],
  ['gmat',    'GMAT',  ['GMAT_2']],
];

const clean = s => (s == null ? '' : String(s).replace(/<\/?b>/g, '').replace(/\s+/g, ' ').trim());

const index = new Map();   // key -> entry index
const entries = [];        // [word, phonetic, trans, exEn, exCn]

function score(e) { return (e[1] ? 1 : 0) + (e[2] ? 2 : 0) + (e[3] ? 1 : 0); }

function absorb(headWord, c) {
  const word = clean(headWord);
  if (!word || !/[a-zA-Z]/.test(word)) return -1;
  const key = word.toLowerCase();
  const phon = clean(c.usphone || c.ukphone || c.phone);
  const trans = (c.trans || [])
    .map(t => (clean(t.pos) ? clean(t.pos) + '. ' : '') + clean(t.tranCn))
    .filter(Boolean).join('; ');
  // shortest usable example reads best on a phone
  let ex = (((c.sentence || {}).sentences) || [])
    .map(s => [clean(s.sContent), clean(s.sCn)])
    .filter(([en, cn]) => en && cn && en.length <= 110)
    .sort((a, b) => a[0].length - b[0].length)[0] || ['', ''];
  const fresh = [word, phon, trans, ex[0], ex[1]];

  let i = index.get(key);
  if (i === undefined) { i = entries.length; entries.push(fresh); index.set(key, i); return i; }
  // keep the richer of the two records, field by field
  const cur = entries[i];
  if (!cur[1] && phon) cur[1] = phon;
  if (trans && (!cur[2] || trans.length > cur[2].length)) cur[2] = trans;
  if (!cur[3] && ex[0]) { cur[3] = ex[0]; cur[4] = ex[1]; }
  if (score(fresh) > score(cur) && /[A-Z]/.test(cur[0]) !== /[A-Z]/.test(word)) cur[0] = word;
  return i;
}

const out = { v: 1, books: [], entries };
for (const [key, name, files] of BOOKS) {
  const seen = new Set(), words = [];
  for (const f of files) {
    const p = path.join(SRC, f + '.json');
    if (!fs.existsSync(p)) { console.error('MISSING', p); continue; }
    const rows = fs.readFileSync(p, 'utf8').split('\n').filter(l => l.trim());
    // wordRank is the book's own ordering (roughly frequency / lesson order)
    const parsed = rows.map(l => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean);
    parsed.sort((a, b) => (a.wordRank || 0) - (b.wordRank || 0));
    for (const r of parsed) {
      const c = ((r.content || {}).word || {}).content;
      if (!c) continue;
      const i = absorb(r.headWord, c);
      if (i >= 0 && !seen.has(i)) { seen.add(i); words.push(i); }
    }
  }
  out.books.push({ key, name, words });
  console.error(`${name.padEnd(6)} ${String(words.length).padStart(6)} words`);
}

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, JSON.stringify(out));
const withEx = entries.filter(e => e[3]).length, withPhon = entries.filter(e => e[1]).length;
console.error(`\nunique entries : ${entries.length}`);
console.error(`with phonetic  : ${withPhon}`);
console.error(`with example   : ${withEx}`);
console.error(`size           : ${(fs.statSync(OUT).size / 1048576).toFixed(2)} MB`);
