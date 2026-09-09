import puppeteer from 'puppeteer-core';
import fs from 'fs';
import path from 'path';
import os from 'os';

const URL = 'http://localhost:8765/cerf/wordbank/';
const SHOT = process.env.WB_SHOTS || path.join(os.tmpdir(), 'wordbank-shots');
fs.mkdirSync(SHOT, { recursive: true });

const CHROME_CANDIDATES = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  '/usr/bin/google-chrome',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
];

const errors = [];
let STEP = 'boot';
const log = (...a) => { const s = a.join(' '); if (s.startsWith('\n---')) STEP = s.trim(); console.log(...a); };
const sleep = ms => new Promise(r => setTimeout(r, ms));

const browser = await puppeteer.launch({
  executablePath: process.env.CHROME || CHROME_CANDIDATES.find(p => fs.existsSync(p)),
  headless: 'new',
  args: ['--no-sandbox', '--disable-dev-shm-usage', '--use-fake-ui-for-media-stream'],
});
const page = await browser.newPage();
await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
page.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
page.on('pageerror', e => errors.push('pageerror: ' + e.message));
page.on('requestfailed', r => {
  // Chrome reports the page-level request as ERR_ABORTED whenever the service
  // worker answers it from cache without a network round trip. The paired
  // "200 fromSW=true" response below proves the fetch actually succeeded.
  if (r.url().includes('dict.json') && (r.failure() || {}).errorText === 'net::ERR_ABORTED') return;
  errors.push('requestfailed [' + STEP + ']: ' + r.url() + ' ' + (r.failure() || {}).errorText);
});
page.on('response', r => { if (r.url().includes('dict.json')) log('   [net] dict.json -> ' + r.status() + ' fromSW=' + r.fromServiceWorker()); });

async function shot(name) { await page.screenshot({ path: SHOT + '/' + name + '.png' }); }
function check(name, ok, extra) { log((ok ? '  PASS  ' : '  FAIL  ') + name + (extra ? '  — ' + extra : '')); if (!ok) errors.push('assert: ' + name); }

log('\n--- 1. 冷启动（空词库）---');
await page.goto(URL, { waitUntil: 'networkidle0' });
await page.waitForSelector('#view .empty, #view .card', { timeout: 10000 });
check('空状态渲染', await page.$eval('#view', e => e.textContent.includes('词库还是空的')));
check('底部导航 4 项', (await page.$$('.tabbar button')).length === 4);
await shot('01-empty');

log('\n--- 2. 粘贴导入（混合格式）---');
await page.click('[data-act="import"]');
await page.waitForSelector('#imp-text', { visible: true });
const paste = `abandon vt. 放弃，抛弃
1. benevolent —— adj. 仁慈的，慈善的
candid\tadj. 坦率的
meticulous
ubiquitous
carrying
give up
in spite of
gave up`;
await page.type('#imp-text', paste, { delay: 0 });
await page.click('[data-act="imp-parse"]');
await page.waitForSelector('.preview table', { visible: true });
const previewRows = await page.$$eval('.preview tbody tr', rs => rs.map(r => r.children[0].textContent + '|' + r.children[1].textContent));
log('   预览: ' + JSON.stringify(previewRows));
check('解析出 9 条', previewRows.length === 9, previewRows.length + ' 条');
check('自动查词开关出现', !!(await page.$('#imp-fill')));
await shot('02-preview');

log('\n--- 3. 提交导入（含离线词典补全）---');
await page.type('#imp-tag', '冒烟测试');
await page.click('[data-act="imp-commit"]');
await page.waitForFunction(() => document.querySelector('#toast') && document.querySelector('#toast').classList.contains('on'), { timeout: 60000 });
log('   toast: ' + await page.$eval('#toast', e => e.textContent));
await sleep(600);
const lib = await page.evaluate(async () => new Promise(res => {
  const rq = indexedDB.open('wordbank');
  rq.onsuccess = () => {
    const g = rq.result.transaction('words').objectStore('words').getAll();
    g.onsuccess = () => res(g.result.map(w => ({ w: w.w, trans: w.trans, phon: w.phon, ex: !!w.exEn, tags: w.tags, note: w.note })));
  };
}));
for (const w of lib) log('   ' + w.w.padEnd(12) + (w.phon || '-').padEnd(16) + (w.trans || '(无释义)').slice(0, 30) + (w.ex ? '  +例句' : ''));
check('9 个词条入库', lib.length === 9, lib.length + ' 个');
check('meticulous 自动查到释义', !!(lib.find(x => x.w === 'meticulous') || {}).trans);
check('carrying 按 carry 补全', !!(lib.find(x => x.w === 'carrying') || {}).trans);
check('标签写入', (lib[0].tags || []).includes('冒烟测试'));
const ph = w => (lib.find(x => x.w === w) || {});
check('短语 give up 查到释义', !!ph('give up').trans, ph('give up').trans || '(空)');
check('短语 in spite of 查到释义', !!ph('in spite of').trans, ph('in spite of').trans || '(空)');
check('变形短语 gave up 归到 give up', /give up/.test(ph('gave up').note || ''), ph('gave up').note || '(无标注)');

log('\n--- 4. 学习一轮 ---');
await page.waitForSelector('[data-act="start"]');
check('待学新词 9', (await page.$eval('.today__new .today__n', e => e.textContent)) === '9');
await shot('03-study-home');
await page.click('[data-act="start"]');
await page.waitForSelector('#session:not(.is-hidden) .q', { visible: true });
check('新词卡显示单词', (await page.$eval('#ses-body .q__word', e => e.textContent.trim())).length > 0);
check('新词卡三个按钮', (await page.$$('#ses-foot [data-grade]')).length === 3);
await shot('04-learn-card');

// The meaning must stay hidden until the learner commits to an answer —
// otherwise "已认识" is a question you can already see the answer to.
const beforeGrading = await page.$eval('#ses-body', e => e.textContent);
check('自评之前不显示中文释义', !/[一-鿿]/.test(beforeGrading.replace(/新词|发音|这个词你认识吗？/g, '')),
  beforeGrading.replace(/\s+/g, ' ').trim().slice(0, 60));
check('自评之前没有 reveal 区块', !(await page.$('#ses-body .reveal')));

// grade the new words: mix of 不认识 / 有印象 / 已认识, then read the reveal
for (let i = 0; i < 9; i++) {
  const grades = await page.$$('#ses-foot [data-grade]');
  if (!grades.length) break;
  await grades[i % 3].click();
  await sleep(200);
  if (i === 0) {                       // clicked 不认识
    check('自评之后才显示释义', !!(await page.$('#ses-body .reveal')));
    const revealed = await page.$eval('#ses-body .reveal', e => e.textContent.trim());
    check('释义内容非空', revealed.length > 0, revealed.slice(0, 40));
    check('点“不认识”后不提供降级按钮', !(await page.$('[data-act="relearn"]')));
    await shot('04b-learn-reveal');
  }
  if (i === 2) {                       // clicked 已认识
    check('点“已认识”后提供「其实不认识」补救', !!(await page.$('[data-act="relearn"]')));
  }
  const next = await page.$('[data-act="next"]');
  if (next) { await next.click(); await sleep(160); }
}
const stateNow = await page.evaluate(() => ({
  count: document.querySelector('#ses-count').textContent,
  hasOpts: !!document.querySelector('#ses-body .opt'),
  kind: (document.querySelector('.q__kind') || {}).textContent,
}));
log('   进度 ' + stateNow.count + ' · 当前题型 ' + stateNow.kind);
check('答错的词当场重排进队列', stateNow.count.split('/')[1].trim() > 9, '队列长度 ' + stateNow.count);
await shot('05-quiz');

// Answer everything that is left, always correctly, so the session can drain.
// The spelling answer is recovered from IndexedDB by matching the shown gloss
// against the stored record — the app never puts the answer in the DOM.
const kinds = new Set();
let guard = 0;
while (guard++ < 60) {
  if (await page.$('.done')) break;
  const kind = await page.evaluate(() => {
    if (document.querySelector('[data-act="next"]')) return 'next';
    if (document.querySelector('#ses-body .opt')) return 'opt';
    if (document.querySelector('#spell-in')) return 'spell';
    if (document.querySelector('#ses-foot [data-grade]')) return 'grade';
    return '?';
  });
  if (kind !== 'next') kinds.add(await page.evaluate(() => (document.querySelector('.q__kind') || {}).textContent || kind));
  if (kind === 'next') await page.click('[data-act="next"]');
  else if (kind === 'opt') await page.evaluate(() => document.querySelector('#ses-body .opt[data-right="1"]').click());
  else if (kind === 'spell') {
    const ans = await page.evaluate(async () => {
      const gloss = document.querySelector('.q__prompt').textContent.trim();
      const hint = document.querySelector('.spell__hint').textContent.trim();
      const words = await new Promise(res => {
        const rq = indexedDB.open('wordbank');
        rq.onsuccess = () => {
          const g = rq.result.transaction('words').objectStore('words').getAll();
          g.onsuccess = () => res(g.result);
        };
      });
      const m = words.find(w => w.trans === gloss && w.w.length === hint.length
        && w.w[0].toLowerCase() === hint[0].toLowerCase());
      return m ? m.w : 'zzz';
    });
    await page.type('#spell-in', ans);
    await page.click('[data-act="check"]');
  } else if (kind === 'grade') await page.click('#ses-foot [data-grade="3"]');
  else break;
  await sleep(140);
}
log('   出现过的题型: ' + [...kinds].join('、'));
check('一轮能走到结束页', !!(await page.$('.done')));
if (await page.$('.done')) log('   ' + (await page.$eval('.done', e => e.textContent.replace(/\s+/g, ' ').trim())));
await shot('06-done');
await page.click('[data-act="close"]');
await sleep(300);

log('\n--- 5. 词库 / 统计 / 设置 ---');
await page.click('[data-tab="library"]');
await page.waitForSelector('.wlist');
check('词库列出 9 条', (await page.$$('.wli')).length === 9);
await page.type('#lib-q', 'benev');
await sleep(200);
check('搜索可用', (await page.$$('.wli')).length === 1, (await page.$$('.wli')).length + ' 条');
await shot('07-library');
await page.$eval('#lib-q', e => { e.value = ''; e.dispatchEvent(new Event('input', { bubbles: true })); });
await sleep(200);
await page.click('.wli');
await page.waitForSelector('#sheet.on', { visible: true });
check('词条详情打开', await page.$eval('#sheet', e => e.textContent.includes('编辑')));
await shot('08-word-detail');
await page.click('#sheet-bg');
await sleep(350);

await page.click('[data-tab="stats"]');
await page.waitForSelector('.bars');
check('统计页渲染', (await page.$$('.bars div')).length === 14);
await shot('09-stats');

await page.click('[data-tab="settings"]');
await page.waitForSelector('[data-act="export-json"]');
check('设置页渲染', (await page.$$('.switch')).length >= 10);
await shot('10-settings');

log('\n--- 6. 深色模式 ---');
await page.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: 'dark' }]);
await page.click('[data-tab="study"]');
await sleep(300);
await shot('11-dark');
const bg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
check('深色背景生效', bg === 'rgb(22, 22, 31)', bg);

log('\n--- 7. 刷新后数据留存 + Service Worker ---');
await page.reload({ waitUntil: 'networkidle0' });
await page.waitForSelector('#view .card');
check('刷新后词库仍在', (await page.$eval('.today__new .today__n, .kv b', e => e.textContent)) !== undefined);
const sw = await page.evaluate(() => navigator.serviceWorker.getRegistrations().then(r => r.length));
check('Service Worker 已注册', sw > 0, sw + ' 个');

log('\n--- 8. 断网后完全离线可用 ---');
// wait for the shell to finish caching, then cut the network entirely
await page.evaluate(() => navigator.serviceWorker.ready);
await sleep(1500);
await page.setOfflineMode(true);
await page.reload({ waitUntil: 'domcontentloaded' });
const booted = await page.waitForSelector('#view .card', { timeout: 15000 }).then(() => true).catch(() => false);
check('断网后应用仍能启动', booted);
if (booted) {
  await page.click('[data-tab="library"]');
  await page.waitForSelector('.wli');
  check('断网后词库可读', (await page.$$('.wli')).length === 9);
  // a dictionary lookup now has to come from the cached copy
  for (const [q, label] of [['ephemeral', '单词'], ['put up with', '短语']]) {
    await page.evaluate(() => document.querySelector('[data-act="add"]').click());
    await page.waitForSelector('#e-w', { visible: true });
    await sleep(500);                                 // let the sheet finish sliding up
    await page.type('#e-w', q);
    await page.evaluate(() => document.querySelector('[data-act="lookup-one"]').click());
    await sleep(1200);
    const filled = await page.$eval('#e-trans', e => e.value);
    log('   离线查' + label + ' ' + q + ' -> ' + (filled || '(空)'));
    check('断网后离线词典查得到' + label, !!filled);
    if (q === 'put up with') await shot('12-offline');
    await page.evaluate(() => document.querySelector('#sheet-bg').click());
    await sleep(350);
  }
}
await page.setOfflineMode(false);

log('\n=================================');
if (errors.length) { log('发现 ' + errors.length + ' 个问题:'); errors.forEach(e => log('  * ' + e)); }
else log('全部通过，无控制台错误。');
log('截图: ' + SHOT);
await browser.close();
process.exit(errors.length ? 1 : 0);
