/* Import parsing.

   The goal is that any of these can be pasted in and just work:

     abandon                              (bare list -> looked up in the offline dict)
     abandon  vt. 放弃，抛弃               (tab / spaces)
     abandon,vt. 放弃                     (csv, with or without a header row)
     单词,音标,释义                        (扇贝 / 欧路 style export header)
     1. abandon —— 放弃                   (numbered, dash separated)
     give up 放弃                         (multi-word phrase + gloss)

   Nothing here is tied to one exporter: columns are identified by what they
   contain, so an unknown app's CSV still lands in the right fields. */

/* Han characters only. Full-width punctuation deliberately excluded: a line like
   "cross， a cross" is an English list that happens to use a Chinese comma, and
   treating it as Chinese made the whole line get dropped. */
const CJK = /[一-鿿㐀-䶿]/;
const POS_TAIL = /(?:^|\s)((?:[nvadjprepconint]{1,4}\.\s*)+)$/i;

export const MODES = [
  ['auto', '自动识别'],
  ['lookup', '每行一个单词（自动查词）'],
  ['pair', '单词 + 释义'],
  ['csv', 'CSV / 表格'],
  ['block', '两行一组（单词一行，释义一行）'],
];

const strip = s => String(s == null ? '' : s).replace(/\s+/g, ' ').trim();

/* Leading list numbering: "1. ", "12、", "3) ", "- ", "* ".
   A punctuated marker needs no space after it ("3、candid"), a bare number does
   ("3 candid") — otherwise "3D" would lose its digit. */
function unnumber(line) {
  return line.replace(/^\s*(?:[-*•]\s+|\d{1,4}\s*[.．、)）:：]\s*|\d{1,4}\s+)/, '').trim();
}

function looksEnglish(s) {
  return !!s && !CJK.test(s) && /[A-Za-z]/.test(s);
}

/* Words that make a two-word string a phrase rather than two separate words.
   "give up" and "belong to" contain one; "obtain attain" does not. */
const GLUE = new Set([
  'a', 'an', 'the', 'be', 'am', 'is', 'are', 'was', 'were', 'been', 'being',
  'to', 'of', 'in', 'on', 'at', 'by', 'for', 'with', 'from', 'into', 'onto',
  'up', 'out', 'off', 'down', 'over', 'under', 'about', 'after', 'before',
  'around', 'across', 'through', 'against', 'between', 'along', 'away', 'back',
  'and', 'or', 'nor', 'but', 'as', 'than', 'that', 'so', 'such', 'not', 'no',
  'sth', 'sb', 'sth.', 'sb.', 'something', 'somebody', 'someone', 'oneself',
  'one\'s', 'do', 'doing', 'done', 'it', 'its', 'his', 'her', 'your', 'my',
]);

/* "as ... as", "so/such ... that" — grammar frames, not dictionary entries.
   They must survive intact rather than being split on their dots. */
const FRAME = /\.{3,}|…/;

const LIST_SEP = /\s*[.,;，、；]\s*|\s{2,}/;

/* One line of an English word list can hold several entries:

     target. goal. aim                     -> three words
     cross， a cross                        -> two, full-width comma
     attractive charming. fascinating      -> "attractive charming" is really two
     because of. due to. owing to          -> three phrases, each kept whole

   The last two cases are the reason for GLUE: inside a list, a segment whose
   words are all content words is mis-punctuated rather than a real phrase.
   That test is only applied to segments of a line that was already split, so a
   standalone "bachelor's degree" or "the West Lake" is never broken up. */
/* A slash with spaces around it separates alternatives:

     shelves / shelf                 -> two words
     form / develop                  -> two words
     be covered by / with            -> the tail preposition varies, so the
                                        second alternative is "be covered with",
                                        not a bare "with"

   A slash without spaces ("so/such ... that") is left alone — the dictionary
   expands that form itself, where it can check both readings against the data. */
function splitAlternatives(line) {
  if (!/\s\/\s|\s\/|\/\s/.test(line)) return [line];
  const segs = line.split(/\s*\/\s*/).map(x => x.trim()).filter(Boolean);
  if (segs.length < 2) return [line];
  const out = [];
  for (const s of segs) {
    const toks = s.split(/\s+/);
    const prev = out[out.length - 1];
    if (toks.length === 1 && GLUE.has(toks[0].toLowerCase()) && prev) {
      const pt = prev.split(/\s+/);
      if (pt.length >= 2) { out.push(pt.slice(0, -1).concat(toks[0]).join(' ')); continue; }
    }
    out.push(s);
  }
  return out;
}

function expandList(s) {
  const line = String(s).trim();
  if (!line) return [];
  if (!looksEnglish(line) || FRAME.test(line)) return [line];
  const out = [];
  for (const alt of splitAlternatives(line)) {
    const parts = alt.split(LIST_SEP).map(x => x.trim()).filter(Boolean);
    if (!parts.length) { out.push(alt); continue; }
    if (parts.length === 1) { out.push(parts[0]); continue; }   // drops a trailing full stop
    for (const p of parts) {
      const toks = p.split(/\s+/);
      if (toks.length >= 2 && toks.every(t => !GLUE.has(t.toLowerCase()))) out.push(...toks);
      else out.push(p);
    }
  }
  return out;
}
function isHeadwordish(s) {
  // a headword or short phrase, not a sentence
  return looksEnglish(s) && s.length <= 40 && s.split(/\s+/).length <= 4 && !/[.!?]$/.test(s);
}

/* ---- CSV --------------------------------------------------------------- */

export function parseCSV(text) {
  const rows = [];
  let row = [], field = '', q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) {
      if (c === '"') { if (text[i + 1] === '"') { field += '"'; i++; } else q = false; }
      else field += c;
    } else if (c === '"') q = true;
    else if (c === ',') { row.push(field); field = ''; }
    else if (c === '\n') { row.push(field); rows.push(row); row = []; field = ''; }
    else if (c !== '\r') field += c;
  }
  if (field || row.length) { row.push(field); rows.push(row); }
  return rows.filter(r => r.some(f => f.trim()));
}

const HEADERS = {
  w: /^(word|单词|词汇|vocabulary|headword|term|英文|英语)$/i,
  phon: /^(phonetic|音标|发音|pron\w*|ipa)$/i,
  trans: /^(trans\w*|释义|翻译|意思|词义|定义|meaning|definition|中文|解释)$/i,
  exEn: /^(example|例句|sentence|例句英文|英文例句)$/i,
  exCn: /^(例句翻译|例句中文|中文例句|sentence_cn|translation)$/i,
};

/* Identify what each column holds by sampling its values. Used when a table has
   no recognisable header row. */
function profile(rows) {
  const n = Math.max(...rows.map(r => r.length));
  const cols = [];
  for (let c = 0; c < n; c++) {
    const vals = rows.slice(0, 60).map(r => strip(r[c])).filter(Boolean);
    if (!vals.length) { cols.push({ role: null, score: 0 }); continue; }
    const cjk = vals.filter(v => CJK.test(v)).length / vals.length;
    const eng = vals.filter(v => looksEnglish(v)).length / vals.length;
    const head = vals.filter(isHeadwordish).length / vals.length;
    const phon = vals.filter(v => /[ˈˌːəɑɔɛɪʊʌŋʃʒθðæ]/.test(v) || /^[[/'].*[\]/']$/.test(v)).length / vals.length;
    const avgWords = vals.reduce((a, v) => a + v.split(/\s+/).length, 0) / vals.length;
    let role = null, score = 0;
    if (phon > 0.5) { role = 'phon'; score = phon; }
    else if (head > 0.7 && eng > 0.8) { role = 'w'; score = head + 1; }
    else if (cjk > 0.5 && avgWords < 14) { role = 'trans'; score = cjk; }
    else if (cjk > 0.5) { role = 'exCn'; score = cjk; }
    else if (eng > 0.6 && avgWords >= 4) { role = 'exEn'; score = eng; }
    else if (eng > 0.6) { role = 'w'; score = eng * 0.5; }
    cols.push({ role, score });
  }
  // one column per role — the best scorer wins, the rest are dropped
  const taken = {};
  cols.forEach((c, i) => {
    if (!c.role) return;
    if (taken[c.role] === undefined || cols[taken[c.role]].score < c.score) taken[c.role] = i;
  });
  return taken;
}

function fromTable(rows) {
  const first = rows[0].map(f => strip(f));
  const matched = {};
  first.forEach((f, i) => {
    for (const role in HEADERS) if (HEADERS[role].test(f)) matched[role] = i;
  });
  let body = rows, map;
  if (matched.w !== undefined || Object.keys(matched).length >= 2) {
    body = rows.slice(1);
    map = matched;
    if (map.w === undefined) map = Object.assign(profile(body.length ? body : rows), map);
  } else {
    map = profile(rows);
  }
  if (map.w === undefined) map.w = 0;
  return body.map(r => ({
    w: strip(r[map.w]),
    phon: map.phon !== undefined ? strip(r[map.phon]) : '',
    trans: map.trans !== undefined ? strip(r[map.trans]) : '',
    exEn: map.exEn !== undefined ? strip(r[map.exEn]) : '',
    exCn: map.exCn !== undefined ? strip(r[map.exCn]) : '',
  })).filter(r => r.w);
}

/* ---- line splitting ---------------------------------------------------- */

/* "abandon vt. 放弃，抛弃" -> ["abandon", "vt. 放弃，抛弃"].
   Splits at the first CJK character, then hands any trailing part-of-speech
   marker back to the gloss, where it belongs. */
function splitAtCJK(line) {
  const i = line.search(CJK);
  if (i <= 0) return null;
  let left = line.slice(0, i).trim();
  let right = line.slice(i).trim();
  const m = left.match(POS_TAIL);
  if (m) { left = left.slice(0, left.length - m[1].length).trim(); right = m[1].trim() + ' ' + right; }
  left = left.replace(/[\s\-–—:：,，;；|/]+$/, '').trim();
  if (!left || !looksEnglish(left)) return null;
  return [left, right.replace(/^[\s\-–—:：|]+/, '').trim()];
}

const SEPS = [
  /\t+/,
  /\s+[—–]{1,2}\s+|\s+-{1,2}\s+/,
  /\s*[;；]\s*/,
  /\s*\|\s*/,
  /\s*[:：]\s+|\s*[:：]/,
  /\s{2,}/,
];

function splitLine(line) {
  for (const re of SEPS) {
    const parts = line.split(re).map(strip).filter(Boolean);
    if (parts.length >= 2 && looksEnglish(parts[0])) return parts;
  }
  return splitAtCJK(line);
}

function partsToRow(parts) {
  const row = { w: parts[0], phon: '', trans: '', exEn: '', exCn: '' };
  for (const p of parts.slice(1)) {
    if (!row.phon && /^[[/].*[\]/]$/.test(p)) { row.phon = p.replace(/^[[/]|[\]/]$/g, ''); continue; }
    if (CJK.test(p)) {
      if (!row.trans) row.trans = p;
      else if (!row.exCn) row.exCn = p;
      else row.trans += '; ' + p;
    } else if (!row.exEn && p.split(/\s+/).length >= 3) row.exEn = p;
    else if (!row.phon) row.phon = p;
  }
  return row;
}

/* ---- entry point ------------------------------------------------------- */

/**
 * @param {string} text raw pasted or file text
 * @param {string} mode one of MODES
 * @returns {{rows: Array, mode: string, note: string}}
 */
export function parse(text, mode = 'auto') {
  const src = String(text || '').replace(/\r\n?/g, '\n').replace(/^﻿/, '');
  const lines = src.split('\n').map(l => l.trim()).filter(l => l && !l.startsWith('#'));
  if (!lines.length) return { rows: [], mode, note: '没有可导入的内容' };

  if (mode === 'auto') {
    const commas = lines.filter(l => l.includes(',')).length / lines.length;
    const tabs = lines.filter(l => l.includes('\t')).length / lines.length;
    const single = lines.filter(l => isHeadwordish(unnumber(l))).length / lines.length;
    if (tabs > 0.6) mode = 'csv';
    else if (single > 0.85) mode = 'lookup';
    else if (commas > 0.7 && (parseCSV(src)[0] || []).length >= 2) mode = 'csv';
    else {
      // a strict alternation of one English line and one Chinese line
      let alt = 0, pairs = Math.floor(lines.length / 2);
      for (let i = 0; i + 1 < lines.length; i += 2)
        if (isHeadwordish(unnumber(lines[i])) && CJK.test(lines[i + 1])) alt++;
      mode = pairs && alt / pairs > 0.8 ? 'block' : 'pair';
    }
  }

  let rows = [];
  if (mode === 'csv') {
    const tabbed = lines.filter(l => l.includes('\t')).length > lines.length / 2;
    const table = tabbed ? lines.map(l => l.split('\t')) : parseCSV(src);
    rows = table.length ? fromTable(table) : [];
  } else if (mode === 'block') {
    for (let i = 0; i < lines.length; i++) {
      const w = unnumber(lines[i]);
      if (!isHeadwordish(w)) continue;
      const next = lines[i + 1];
      if (next && CJK.test(next)) { rows.push({ w, phon: '', trans: strip(next), exEn: '', exCn: '' }); i++; }
      else rows.push({ w, phon: '', trans: '', exEn: '', exCn: '' });
    }
  } else if (mode === 'lookup') {
    for (const l of lines) {
      for (const w of expandList(unnumber(l))) {
        if (looksEnglish(w)) rows.push({ w, phon: '', trans: '', exEn: '', exCn: '' });
      }
    }
  } else { // pair
    for (const raw of lines) {
      const l = unnumber(raw);
      const parts = splitLine(l);
      if (parts) rows.push(partsToRow(parts));
      else if (looksEnglish(l)) {
        for (const w of expandList(l)) rows.push({ w: strip(w), phon: '', trans: '', exEn: '', exCn: '' });
      }
    }
  }

  // tidy + de-duplicate, keeping the richest record for each headword
  const seen = new Map();
  for (const r of rows) {
    // digits stay: "3D printing", "COVID-19", "H2O" are legitimate headwords
    r.w = strip(r.w).replace(/^[^A-Za-z0-9]+/, '').replace(/[^A-Za-z0-9')\].]+$/, '');
    if (!r.w || !/[A-Za-z]/.test(r.w)) continue;
    const k = r.w.toLowerCase();
    const prev = seen.get(k);
    if (!prev) seen.set(k, r);
    else for (const f of ['phon', 'trans', 'exEn', 'exCn']) if (!prev[f] && r[f]) prev[f] = r[f];
  }
  const out = [...seen.values()];
  const missing = out.filter(r => !r.trans).length;
  const note = '识别 ' + out.length + ' 个词条' + (missing ? '，其中 ' + missing + ' 个待查释义' : '');
  return { rows: out, mode, note };
}

export function toCSV(rows) {
  const q = v => {
    const s = String(v == null ? '' : v);
    return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  };
  const head = ['单词', '音标', '释义', '例句', '例句翻译', '状态', '下次复习', '复习次数'];
  return '﻿' + [head.join(',')].concat(rows.map(r => [
    r.w, r.phon, r.trans, r.exEn, r.exCn,
    ['新词', '学习中', '复习中', '已掌握'][r.state] || '',
    r.due ? new Date(r.due).toISOString().slice(0, 10) : '',
    r.reps || 0,
  ].map(q).join(','))).join('\n');
}
