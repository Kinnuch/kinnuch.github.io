import puppeteer from 'puppeteer-core';

const sleep = ms => new Promise(r => setTimeout(r, ms));
const errors = [];
const browser = await puppeteer.launch({
  executablePath: process.env.CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: 'new', args: ['--no-sandbox'],
});
const page = await browser.newPage();
await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
page.on('pageerror', e => errors.push('pageerror: ' + e.message));
page.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
const check = (n, ok, x) => console.log((ok ? '  PASS  ' : '  FAIL  ') + n + (x ? '  — ' + x : '')) || (ok || errors.push('assert: ' + n));

await page.goto('http://localhost:8765/cerf/wordbank/', { waitUntil: 'networkidle0' });
await page.waitForSelector('#view .empty');

console.log('\n--- 内置词书导入 ---');
await page.click('[data-act="import"]');
await page.waitForSelector('#imp-body', { visible: true });
await sleep(400);
await page.evaluate(() => document.querySelector('[data-imp="book"]').click());
await page.waitForSelector('[data-act="imp-load-dict"]', { visible: true });
console.log('   首次进入词书页提示下载词库');
await page.evaluate(() => document.querySelector('[data-act="imp-load-dict"]').click());
await page.waitForSelector('#imp-book', { visible: true, timeout: 60000 });

const books = await page.$$eval('#imp-book option', os => os.map(o => o.textContent));
console.log('   ' + books.join(' | '));
check('列出 14 本词书', books.length === 14, books.length + ' 本');

await page.select('#imp-book', 'cet4');
await page.$eval('#imp-from', e => { e.value = '1'; });
await page.$eval('#imp-to', e => { e.value = '30'; });
await page.evaluate(() => document.querySelector('[data-act="imp-book"]').click());
await page.waitForSelector('.preview table', { visible: true });
const rows = await page.$$eval('.preview tbody tr', rs => rs.map(r => r.children[0].textContent + ' — ' + r.children[1].textContent));
console.log('   前 5 条: \n     ' + rows.slice(0, 5).join('\n     '));
check('取到 30 条', rows.length === 30, rows.length + ' 条');
check('全部带释义', rows.every(r => !r.endsWith('待查')));
check('无「自动查词」开关（已有释义）', !(await page.$('#imp-fill')));

await page.evaluate(() => document.querySelector('[data-act="imp-commit"]').click());
await page.waitForFunction(() => document.querySelector('#toast').classList.contains('on'));
console.log('   toast: ' + await page.$eval('#toast', e => e.textContent));
await sleep(500);

const stored = await page.evaluate(() => new Promise(res => {
  const rq = indexedDB.open('wordbank');
  rq.onsuccess = () => {
    const g = rq.result.transaction('words').objectStore('words').getAll();
    g.onsuccess = () => res(g.result);
  };
}));
check('30 个词入库', stored.length === 30, stored.length + ' 个');
check('带 四级 标签', (stored[0].tags || []).includes('四级'), JSON.stringify(stored[0].tags));
check('带音标', stored.filter(w => w.phon).length >= 28, stored.filter(w => w.phon).length + '/30');
check('带例句', stored.filter(w => w.exEn).length >= 20, stored.filter(w => w.exEn).length + '/30');

console.log('\n--- 重复导入应被跳过 ---');
await page.evaluate(() => document.querySelector('[data-act="import"]').click());
await page.waitForSelector('#imp-body', { visible: true });
await sleep(400);
await page.evaluate(() => document.querySelector('[data-imp="book"]').click());
await page.waitForSelector('#imp-book', { visible: true });
await page.select('#imp-book', 'cet4');
await page.$eval('#imp-to', e => { e.value = '30'; });
await page.evaluate(() => document.querySelector('[data-act="imp-book"]').click());
await page.waitForSelector('.preview table');
const btn = await page.$eval('[data-act="imp-commit"]', e => e.textContent.trim());
console.log('   按钮文案: ' + btn);
check('识别出全部重复并禁用按钮', btn.includes('都已在词库中'), btn);

console.log(errors.length ? '\n发现问题:\n  ' + errors.join('\n  ') : '\n全部通过。');
await browser.close();
process.exit(errors.length ? 1 : 0);
