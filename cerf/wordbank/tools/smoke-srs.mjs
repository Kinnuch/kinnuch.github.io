/* Scheduler rules, checked in isolation — no browser, no dictionary.

   The case that prompted this file: a word marked 已认识 on first sight is
   filed at 60 days; answering 有印象 on it later used to preview "3 个月后"
   (60 × 1.25, plus fuzz = 83 days). Hesitating on a word means its interval is
   too long, so 有印象 must pull it back, never push it out. */

import fs from 'fs'; import os from 'os'; import path from 'path';
import { pathToFileURL, fileURLToPath } from 'url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'wb-srs-'));
fs.copyFileSync(path.join(HERE, '../js/srs.js'), path.join(tmp, 'srs.mjs'));
const S = await import(pathToFileURL(path.join(tmp, 'srs.mjs')).href);

let bad = 0;
const check = (name, ok, extra) => {
  console.log((ok ? '  PASS  ' : '  FAIL  ') + name + (extra !== undefined ? '  — ' + extra : ''));
  if (!ok) bad++;
};
const DAY = S.DAY;
const card = fields => S.newCard(Object.assign({ key: 'testword', w: 'testword' }, fields));
const within = (v, lo, hi) => v >= lo && v <= hi;

// 认识 climbs the fixed ladder (fuzz is ±12% and only applies from 4 days up)
{
  const c = card();
  let now = Date.now();
  const got = [];
  for (let i = 0; i < 5; i++) { S.grade(c, 5, now); got.push(c.ivl); now = c.due; }
  check('认识沿 1/2/4/7/15 阶梯',
    got[0] === 1 && got[1] === 2 && within(got[2], 3, 5) && within(got[3], 6, 8) && within(got[4], 13, 17),
    got.join(' → '));
  const before = c.ivl;
  S.grade(c, 5, now);
  check('阶梯走完后按熟练度系数增长', c.ivl > before, before + ' → ' + c.ivl);
}

// the reported case: 已认识 on a brand-new word, then 有印象 at a later review
{
  const c = card({ state: S.STATE.MASTERED, reps: S.LADDER.length + 1, ivl: 60, due: Date.now() + 60 * DAY });
  const p = S.preview(c, 60);
  check('已认识的词答有印象：按钮预览不再是几个月', p[3] <= 2, p[3] + ' 天（旧规则 83 天）');
  S.grade(c, 3);
  check('已认识的词答有印象：实际间隔 ≤ 2 天', within(c.ivl, 1, 2), c.ivl + ' 天');
  check('已认识的词答有印象：退出已掌握', c.state === S.STATE.REVIEW, 'state ' + c.state);
}

// 有印象 on a long-mature word also drops back rather than growing
{
  const c = card({ state: S.STATE.MASTERED, reps: 12, ivl: 200, ease: 2.6, due: Date.now() });
  S.grade(c, 3);
  check('成熟词答有印象也拉回 ≤ 2 天', within(c.ivl, 1, 2), c.ivl + ' 天');
  check('有印象按 SM-2 下调熟练度系数 0.14', Math.abs(c.ease - 2.46) < 1e-9, c.ease.toFixed(2));
  // climbing back is quick: the ladder continues from where 有印象 left it
  let now = c.due;
  const up = [];
  for (let i = 0; i < 3; i++) { S.grade(c, 5, now); up.push(c.ivl); now = c.due; }
  check('之后答认识重新爬阶梯', within(up[0], 3, 5) && within(up[1], 6, 8) && within(up[2], 13, 17), up.join(' → '));
}

// a brand-new word answered 有印象 on its intro card
{
  const c = card();
  S.grade(c, 3);
  check('新词答有印象：1 天后', c.ivl === 1, c.ivl + ' 天');
}

// 不认识 resets outright
{
  const c = card({ reps: 6, ivl: 40, lapses: 1, ease: 2.5 });
  S.grade(c, 0);
  check('不认识：间隔清零、本轮重来',
    c.ivl === 0 && c.reps === 0 && c.state === S.STATE.LEARNING, 'ivl ' + c.ivl + ', reps ' + c.reps);
  check('不认识：遗忘次数 +1、系数 −0.2',
    c.lapses === 2 && Math.abs(c.ease - 2.3) < 1e-9, 'lapses ' + c.lapses + ', ease ' + c.ease.toFixed(2));
}

// whatever state a word is in, 有印象 can never schedule it further out than 认识
{
  const cases = [0, 1, 3, 5, 6, 10].map(reps =>
    card({ key: 'w' + reps, reps, ivl: reps ? S.LADDER[Math.min(reps, 5) - 1] * 2 : 0 }));
  const worst = cases.map(c => { const p = S.preview(c, 60); return [c.reps, p[3], p[5]]; });
  check('任何状态下「有印象」都不会比「认识」排得更远',
    worst.every(([, v, k]) => v <= k), worst.map(([r, v, k]) => `reps${r}:${v}≤${k}`).join(' '));
}

console.log('\n' + (bad ? bad + ' 项未通过' : '全部通过'));
process.exit(bad ? 1 : 0);
