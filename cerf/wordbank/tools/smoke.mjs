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
  args: ['--no-sandbox', '--disable-dev-shm-usage', '--use-fake-ui-for-media-stream',
    '--autoplay-policy=no-user-gesture-required'],
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
  // pointing the audio element at the next word aborts the previous clip's request
  if (r.url().includes('dict.youdao.com') && (r.failure() || {}).errorText === 'net::ERR_ABORTED') return;
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

log('\n--- 4b. 题型比例被真正遵守 ---');
// Everything off except 认词义: no typing question, no self-assessment card may
// appear. This is the regression for "拼写关了还是出现拼写题".
await page.click('[data-tab="settings"]');
await page.waitForSelector('[data-type="spell"]');
await page.evaluate(() => {
  const set = (k, v) => {
    const el = document.querySelector(`[data-type="${k}"]`);
    el.value = String(v);
    el.dispatchEvent(new Event('change', { bubbles: true }));
  };
  ['recall', 'cn2en', 'spell', 'cloze', 'listen'].forEach(k => set(k, 0));
  set('en2cn', 3);
});
await sleep(400);
check('比例说明随之更新', (await page.$eval('#type-mix', e => e.textContent)).includes('认词义 100%'),
  await page.$eval('#type-mix', e => e.textContent.slice(0, 40)));

await page.click('[data-tab="study"]');
await page.waitForSelector('[data-act="spot"]');
await page.click('[data-act="spot"]');
await page.waitForSelector('#session:not(.is-hidden) .q', { visible: true });
const kindsSeen = new Set();
for (let i = 0; i < 14; i++) {
  if (await page.$('.done')) break;
  const k = await page.evaluate(() => (document.querySelector('.q__kind') || {}).textContent || '');
  if (k) kindsSeen.add(k);
  const opt = await page.$('#ses-body .opt[data-right="1"]');
  if (opt) { await page.evaluate(() => document.querySelector('#ses-body .opt[data-right="1"]').click()); }
  else break;
  await sleep(140);
  const next = await page.$('[data-act="next"]');
  if (next) { await next.click(); await sleep(140); }
}
log('   抽查中出现的题型: ' + [...kindsSeen].join('、'));
check('关掉的题型一次都没出现', [...kindsSeen].every(k => k === '认词义'), [...kindsSeen].join('、'));
check('没有出现拼写输入框', !(await page.$('#spell-in')));
await page.evaluate(() => document.querySelector('#ses-close').click());
await sleep(300);

log('\n--- 4c. 抽查自评卡模式 ---');
await page.click('[data-tab="settings"]');
await page.waitForSelector('[data-set="spotRecall"]');
await page.evaluate(() => {
  const el = document.querySelector('[data-set="spotRecall"]');
  el.checked = true;
  el.dispatchEvent(new Event('change', { bubbles: true }));
});
await sleep(400);
await page.click('[data-tab="study"]');
await page.waitForSelector('[data-act="spot"]');
await page.click('[data-act="spot"]');
await page.waitForSelector('#session:not(.is-hidden) .q', { visible: true });
check('抽查用自评卡', (await page.$eval('.q__kind', e => e.textContent)) === '自评回忆');
check('自评卡不给选项', !(await page.$('#ses-body .opt')));
const spotBody = await page.$eval('#ses-body', e => e.textContent);
check('自评前不显示释义', !/[一-鿿]/.test(spotBody.replace(/自评回忆|发音|还记得意思吗？想好了再看答案/g, '')),
  spotBody.replace(/\s+/g, ' ').trim().slice(0, 50));
await shot('05b-spot-recall');
await page.click('#ses-foot [data-grade="5"]');
await sleep(250);
check('自评后揭晓释义', !!(await page.$('#ses-body .reveal')));
check('抽查答对不改排期', (await page.$eval('#ses-foot', e => e.textContent)).includes('抽查不改排期'),
  await page.$eval('#ses-foot .small', e => e.textContent));
await page.evaluate(() => document.querySelector('#ses-close').click());
await sleep(300);

// restore a normal mix so the later steps behave like a fresh install
await page.click('[data-tab="settings"]');
await page.waitForSelector('[data-type="spell"]');
await page.evaluate(() => {
  const set = (k, v) => {
    const el = document.querySelector(`[data-type="${k}"]`);
    el.value = String(v); el.dispatchEvent(new Event('change', { bubbles: true }));
  };
  set('recall', 2); set('en2cn', 3); set('cn2en', 2); set('spell', 2); set('cloze', 2);
  const sr = document.querySelector('[data-set="spotRecall"]');
  sr.checked = false; sr.dispatchEvent(new Event('change', { bubbles: true }));
});
await sleep(400);

log('\n--- 4d. 上一题：回退并撤回作答 ---');
const readWord = key => page.evaluate(k => new Promise(res => {
  const rq = indexedDB.open('wordbank');
  rq.onsuccess = () => {
    const g = rq.result.transaction('words').objectStore('words').get(k);
    g.onsuccess = () => res(g.result);
  };
}), key);
const setSpotRecall = on => page.evaluate(v => {
  const el = document.querySelector('[data-set="spotRecall"]');
  el.checked = v;
  el.dispatchEvent(new Event('change', { bubbles: true }));
}, on);

await page.click('[data-tab="settings"]');
await page.waitForSelector('[data-set="spotRecall"]');
await setSpotRecall(true);                 // self-assessment cards make the answer path deterministic
await sleep(400);
await page.click('[data-tab="study"]');
await page.waitForSelector('[data-act="spot"]');
await page.click('[data-act="spot"]');
await page.waitForSelector('#session:not(.is-hidden) #ses-foot [data-grade]', { visible: true });

check('开局时上一题按钮禁用', await page.$eval('#ses-back', b => b.disabled));
const firstWord = await page.$eval('#ses-body .q__word', e => e.textContent.trim());
const firstKey = firstWord.toLowerCase();
const before = await readWord(firstKey);
const countBefore = await page.$eval('#ses-count', e => e.textContent.trim());
const vagueLabel = await page.$eval('#ses-foot [data-grade="3"] small', e => e.textContent.trim());
check('“有印象”最多隔 2 天再来，不会推到几个月后', /^[12] 天后$/.test(vagueLabel), vagueLabel);

await page.click('#ses-foot [data-grade="0"]');            // 不认识: reschedules and requeues
await sleep(400);
check('作答后上一题按钮可用', !(await page.$eval('#ses-back', b => b.disabled)));
check('揭晓页有收藏按钮', !!(await page.$('#ses-foot [data-act="star-ses"]')));
await page.click('#ses-foot [data-act="star-ses"]');
await sleep(300);
check('点收藏后写入词条', (await readWord(firstKey)).starred === 1);
check('收藏按钮变成已收藏',
  (await page.$eval('#ses-foot [data-act="star-ses"]', b => b.textContent.trim())) === '★ 已收藏');
await shot('05d-star-on-reveal');
const afterGrade = await readWord(firstKey);
check('答“不认识”确实改了词条', (afterGrade.lapses || 0) === (before.lapses || 0) + 1,
  'lapses ' + (before.lapses || 0) + ' → ' + (afterGrade.lapses || 0));

await page.click('[data-act="next"]');
await sleep(250);
const secondWord = await page.$eval('#ses-body .q__word', e => e.textContent.trim());
const countSecond = await page.$eval('#ses-count', e => e.textContent.trim());
const totalOf = s => Number(s.split('/')[1]);
check('答错的词被插回队列', totalOf(countSecond) === totalOf(countBefore) + 1, countBefore + ' → ' + countSecond);
log('   第一题 ' + firstWord + '，第二题 ' + secondWord);

await page.click('#ses-back');
await sleep(500);
check('回到了上一题', (await page.$eval('#ses-body .q__word', e => e.textContent.trim())) === firstWord);
check('上一题恢复为未作答', !(await page.$('#ses-body .reveal')) && !!(await page.$('#ses-foot [data-grade]')));
const restored = await readWord(firstKey);
check('词条排期被撤回',
  (restored.lapses || 0) === (before.lapses || 0) && restored.due === before.due && restored.reps === before.reps,
  'lapses ' + (restored.lapses || 0) + ', reps ' + restored.reps);
const countBack = await page.$eval('#ses-count', e => e.textContent.trim());
check('插回队列的重复卡被撤回', countBack === countBefore, countBack);
check('上一题不会撤掉收藏', (await readWord(firstKey)).starred === 1);
check('回到第一题后按钮再次禁用', await page.$eval('#ses-back', b => b.disabled));
await shot('05c-go-back');

// 有印象 inside a spot check must pull the word closer — not be ignored, not push it out
await page.click('#ses-foot [data-grade="3"]');
await sleep(400);
const vague = await readWord(firstKey);
check('抽查里答“有印象”会把词拉回近期', vague.ivl >= 1 && vague.ivl <= 2, 'ivl ' + vague.ivl + ' 天');
const vagueFoot = await page.$eval('#ses-foot .small', e => e.textContent.trim());
check('揭晓页如实显示下次复习时间', /^下次复习：[12] 天$/.test(vagueFoot), vagueFoot);
await page.evaluate(() => document.querySelector('#ses-close').click());
await sleep(300);

log('\n--- 4e. 发音 ---');
const audioReqs = [];
page.on('request', r => { if (r.url().includes('dict.youdao.com/dictvoice')) audioReqs.push(r.url()); });
const setSelect = (sel, val) => page.evaluate((s, v) => {
  const el = document.querySelector(s);
  el.value = v;
  el.dispatchEvent(new Event('change', { bubbles: true }));
}, sel, val);
async function clickAndToast(sel, timeout = 12000) {
  await page.evaluate(() => { const t = document.querySelector('#toast'); t.textContent = ''; t.classList.remove('on'); });
  await page.evaluate(s => document.querySelector(s).click(), sel);
  await page.waitForFunction(() => document.querySelector('#toast').textContent.trim().length > 0, { timeout })
    .catch(() => { });
  return page.$eval('#toast', e => e.textContent.trim());
}

await page.click('[data-tab="settings"]');
await page.waitForSelector('[data-act="test-voice"]');
await setSpotRecall(false);
await setSelect('[data-set="voiceSource"]', 'auto');
await sleep(300);
const t1 = await clickAndToast('[data-act="test-voice"]');
log('   试听（自动）→ ' + (t1 || '(无反馈)'));
check('试听请求了有道美音', audioReqs.some(u => /audio=pronunciation&type=2/.test(u)), audioReqs[0] || '(没有请求)');
check('在线发音真正播放了', t1.includes('在线发音可用'), t1);

await setSelect('[data-set="accent"]', 'en-GB');
await sleep(300);
await clickAndToast('[data-act="test-voice"]');
check('英音走 type=1', audioReqs.some(u => /audio=pronunciation&type=1/.test(u)));
await setSelect('[data-set="accent"]', 'en-US');

// The user's phone: Web Speech API present, but the voice list holds no English voice.
await setSelect('[data-set="voiceSource"]', 'system');
await sleep(300);
await page.evaluate(() => {
  speechSynthesis.getVoices = () => [{ lang: 'zh-CN', name: '中文', voiceURI: 'zh-CN' }];
  if (speechSynthesis.onvoiceschanged) speechSynthesis.onvoiceschanged();
});
const t2 = await clickAndToast('[data-act="test-voice"]');
log('   模拟国行手机（只有中文语音）→ ' + (t2 || '(无反馈)'));
check('没有英文语音时明确提示而不是静默', t2.includes('没有英文语音'), t2);
await setSelect('[data-set="voiceSource"]', 'auto');
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
