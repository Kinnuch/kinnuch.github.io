/* Regression test for a real, messy word list a user pasted in.
   Runs parse + dictionary lookup together — no browser needed.

   The fixture is deliberately nasty: numbering with gaps, unnumbered
   continuation lines, synonyms crammed onto one line with full stops, a
   full-width comma, sth/sb placeholders, leading articles, and grammar frames
   written with an ellipsis and a slash. */

import fs from 'fs'; import os from 'os'; import path from 'path';
import { pathToFileURL, fileURLToPath } from 'url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const APP = path.resolve(HERE, '..');

const t = fs.mkdtempSync(path.join(os.tmpdir(), 'wb-'));
fs.copyFileSync(path.join(APP, 'js/parse.js'), path.join(t, 'parse.mjs'));
fs.copyFileSync(path.join(APP, 'js/dict.js'), path.join(t, 'dict.mjs'));
globalThis.fetch = async () => ({
  ok: true, headers: { get: () => null },
  json: async () => JSON.parse(fs.readFileSync(path.join(APP, 'data/dict.json'), 'utf8')),
});
const P = await import(pathToFileURL(path.join(t, 'parse.mjs')).href);
const D = await import(pathToFileURL(path.join(t, 'dict.mjs')).href);
await D.load();

const errors = [];
const check = (name, ok, extra) => {
  console.log((ok ? '  PASS  ' : '  FAIL  ') + name + (extra ? '  — ' + extra : ''));
  if (!ok) errors.push(name);
};

let got = new Map();
const has = (w, re) => {
  const g = got.get(w);
  return g !== undefined && (re ? re.test(g) : !!g);
};

function load(fixture) {
  const input = fs.readFileSync(path.join(HERE, 'fixtures', fixture), 'utf8');
  const r = P.parse(input, 'auto');
  got = new Map();
  for (const row of r.rows) got.set(row.w, row.trans || (D.lookup(row.w) || {}).trans || '');
  console.log('\n=== ' + fixture + ' · 解析方式 ' + r.mode + ' · ' + r.rows.length + ' 个词条 ===\n');
  return r;
}

function coverage(min) {
  const found = [...got.values()].filter(Boolean).length;
  const pct = Math.round(found / got.size * 100);
  check('整体覆盖率 ≥ ' + min + '%', pct >= min, found + '/' + got.size + ' = ' + pct + '%');
  const missing = [...got.entries()].filter(([, g]) => !g).map(([w]) => w);
  if (missing.length) console.log('  查不到: ' + missing.join(' | '));
}

const r = load('real-list.txt');

// the synonym lines must become separate entries
check('“target. goal. aim” 拆成三个词', ['target', 'goal', 'aim'].every(w => got.has(w)));
check('“attractive charming. …” 拆成四个词',
  ['attractive', 'charming', 'fascinating', 'appealing'].every(w => got.has(w)));
check('“gain. obtain attain. acquire” 拆成四个词',
  ['gain', 'obtain', 'attain', 'acquire'].every(w => got.has(w)));
check('全角逗号行不被丢弃', got.has('cross') && got.has('a cross'));
check('“because of. due to. owing to” 拆成三个短语',
  ['because of', 'due to', 'owing to'].every(w => got.has(w)));
check('未编号的续行保留', got.has('intention') && got.has('applicant'));

// glosses that used to be wrong or missing
check('due to = 由于，不是 due 的“到期的”', has('due to', /由于|因为/), got.get('due to'));
check('owing to = 由于', has('owing to', /由于|因为/), got.get('owing to'));
check('the provincial capital = 省会', has('the provincial capital', /省会/), got.get('the provincial capital'));
check('the West Lake = 西湖', has('the West Lake', /西湖/), got.get('the West Lake'));
check('be busy with sth 查得到', has('be busy with sth', /忙/), got.get('be busy with sth'));
check('help sb with sth 查得到', has('help sb with sth', /帮/), got.get('help sb with sth'));
check('be the same as 查得到', has('be the same as', /相同|一致|等同/), got.get('be the same as'));
check('belong to = 属于', has('belong to', /属于/), got.get('belong to'));
check('be born = 出生', has('be born', /出生|诞生/), got.get('be born'));
check('a little 查得到', has('a little'), got.get('a little'));

// grammar frames: resolved via the supplement, never via a single stray word
check('as ... as 查得到且不是 as 的释义', has('as ... as', /一样/), got.get('as ... as'));
check('so/such ... that 走斜杠展开', has('so/such ... that', /以至于/), got.get('so/such ... that'));
check('not so/as ... as 走斜杠展开', has('not so/as ... as', /不如|不像/), got.get('not so/as ... as'));
check('neither ... nor 查得到', has('neither ... nor', /既不/), got.get('neither ... nor'));

// phrases straight out of the harvested corpus
check('go through / look after / work out 等短语查得到',
  ['go through', 'look after', 'care for', 'work out', 'work on', 'sell out', 'in case of',
    'differ from', 'graduate from', 'be keen on'].every(w => has(w)));

coverage(98);

/* Second fixture: numbering on its own line, a "第2页" page break in the middle,
   no numbering at all in the back half, and alternatives joined by a slash. */
load('real-list-2.txt');

check('编号单独占一行时词形仍取到', got.has('bacteria') && got.has('curriculum'));
check('页码行“第2页”被丢弃', !got.has('第2页') && ![...got.keys()].some(k => /第|页/.test(k)));
check('“shelves / shelf” 拆成两条', got.has('shelves') && got.has('shelf'));
check('“form / develop” 拆成两条', got.has('form') && got.has('develop'));
check('“all kinds of / all sorts of / various” 拆成三条',
  ['all kinds of', 'all sorts of', 'various'].every(w => got.has(w)));
check('“take / follow / adopt one\'s” 拆成三条',
  got.has('take') && got.has('follow') && got.has("adopt one's"));
// the tail preposition varies, so the second alternative rebuilds the phrase
check('“be covered by / with” 展开成两个完整短语',
  got.has('be covered by') && got.has('be covered with'), [...got.keys()].filter(k => k.startsWith('be covered')).join(' + '));
check('不产生孤零零的 “with” 词条', !got.has('with'));

check('all kinds of = 各种各样的', has('all kinds of', /各种各样/), got.get('all kinds of'));
check('be covered by = 被……覆盖', has('be covered by', /覆盖/), got.get('be covered by'));
check('there be 查得到', has('there be', /有/), got.get('there be'));
// a verb phrase plus its object should gloss the verb phrase, not just the verb
check('look up new words 走 look up 而不是 look',
  (D.lookup('look up new words') || {}).lemma === 'look up', got.get('look up new words'));
check('refer to dictionary 走 refer to',
  (D.lookup('refer to dictionary') || {}).lemma === 'refer to', got.get('refer to dictionary'));
check('divide ... into ... 查得到', has('divide ... into ...', /分成/), got.get('divide ... into ...'));
check('need to be done / need doing 都查得到',
  has('need to be done', /需要/) && has('need doing', /需要/));

coverage(98);

console.log('\n' + (errors.length ? errors.length + ' 项未通过' : '全部通过'));
process.exit(errors.length ? 1 : 0);
