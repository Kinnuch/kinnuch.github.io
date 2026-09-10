/* Wordbank — UI and session engine.

   The whole library is held in memory (a Map keyed by lowercase headword) and
   mirrored to IndexedDB on write. At a few thousand words that costs a couple of
   megabytes and makes search, filtering and statistics instant; the alternative,
   querying IndexedDB per keystroke, is noticeably laggy on a phone. */

import * as S from './store.js';
import * as SRS from './srs.js';
import * as D from './dict.js';
import * as P from './parse.js';

const $ = sel => document.querySelector(sel);
const view = () => $('#view');

const LIB = new Map();          // key -> word record
let SET = S.DEFAULTS;           // settings
let DAYS = new Map();           // 'YYYY-MM-DD' -> {date, learned, reviewed, correct, total}
let tab = 'study';
let installPrompt = null;

/* ---- small helpers ----------------------------------------------------- */

const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const norm = w => String(w || '').trim().toLowerCase();

function toast(msg) {
  const t = $('#toast');
  t.textContent = msg;
  t.classList.add('on');
  clearTimeout(toast._t);
  toast._t = setTimeout(() => t.classList.remove('on'), 2200);
}

function shuffle(a) {
  for (let i = a.length - 1; i > 0; i--) {
    const j = (Math.random() * (i + 1)) | 0;
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/* Pronunciation, from two sources tried in order.

   1. Youdao's dictvoice MP3 — real recordings, reachable from mainland China,
      and the endpoint the source word books were built around (their
      ukspeech / usspeech fields are its query strings).
   2. The Web Speech API. It cannot be the only path: on phones without Google
      services it usually exists but has no English voice, so an utterance
      "succeeds" in complete silence — the bug users actually hit.

   Online audio sends the word being studied to dict.youdao.com.
   speak() resolves with 'online' | 'system' | 'superseded', or null on failure.
   It never rejects, so fire-and-forget callers cannot leak unhandled promises. */
let voices = [];
function loadVoices() { voices = speechSynthesis.getVoices ? speechSynthesis.getVoices() : []; }

const player = new Audio();
player.preload = 'auto';
let playToken = 0;
let voiceWarned = false;

const VOICE_FAIL = {
  auto: '发音失败：连不上在线发音，手机也没有英文语音',
  online: '在线发音失败：检查网络，或在设置里改用系统朗读',
  system: '系统朗读失败：这台手机没有英文语音，建议在设置里改用在线发音',
};

function speak(text) {
  if (!text) return Promise.resolve(null);
  const mode = SET.voiceSource || 'auto';
  let blocked = false;
  let p;
  if (mode === 'system' || navigator.onLine === false) p = speakSystem(text);
  else {
    p = playOnline(text);
    if (mode === 'auto') {
      p = p.catch(err => {
        blocked = !!(err && err.name === 'NotAllowedError');
        return speakSystem(text);
      });
    }
  }
  return p.catch(err => {
    if (!voiceWarned) {
      voiceWarned = true;
      const autoplay = blocked || !!(err && err.name === 'NotAllowedError');
      toast(autoplay ? '浏览器拦截了自动发音，点一下「发音」按钮就能播放'
        : (VOICE_FAIL[mode] || VOICE_FAIL.auto));
    }
    return null;
  });
}

function stopSpeaking() {
  playToken++;
  try { player.pause(); } catch (e) { void e; }
  if ('speechSynthesis' in window) speechSynthesis.cancel();
}

function playOnline(text) {
  const token = ++playToken;
  return new Promise((resolve, reject) => {
    let timer = 0;
    const cleanup = () => {
      clearTimeout(timer);
      player.removeEventListener('playing', onPlaying);
      player.removeEventListener('error', onError);
    };
    // a newer word took over the player: not a failure, and no fallback wanted
    const superseded = () => { cleanup(); resolve('superseded'); };
    function onPlaying() {
      if (token !== playToken) return superseded();
      cleanup();
      resolve('online');
    }
    function onError(err) {
      if (token !== playToken) return superseded();
      cleanup();
      reject(err && err.name === 'NotAllowedError' ? err : new Error('online'));
    }
    player.addEventListener('playing', onPlaying);
    player.addEventListener('error', onError);
    // A stalled request on a bad connection neither plays nor errors.
    timer = setTimeout(() => { if (token === playToken) player.pause(); onError(); }, 4000);
    player.src = 'https://dict.youdao.com/dictvoice?audio=' + encodeURIComponent(text)
      + '&type=' + (SET.accent === 'en-GB' ? 1 : 2);
    const pr = player.play();
    if (pr && pr.catch) pr.catch(onError);
  });
}

function speakSystem(text) {
  return new Promise((resolve, reject) => {
    if (!('speechSynthesis' in window)) return reject(new Error('no-tts'));
    if (!voices.length) loadVoices();
    const en = voices.filter(v => /^en/i.test(v.lang || ''));
    // A voice list that loaded but holds no English voice is the phone without
    // Google services: speaking would "succeed" silently, so report it instead.
    if (voices.length && !en.length) return reject(new Error('no-english-voice'));
    speechSynthesis.cancel();
    // Chrome on Android drops an utterance queued in the same tick as cancel().
    setTimeout(() => {
      const u = new SpeechSynthesisUtterance(text);
      u.lang = SET.accent || 'en-US';
      const v = en.find(x => x.lang.replace('_', '-') === u.lang) || en[0];
      if (v) u.voice = v;
      u.rate = 0.92;
      let started = false;
      u.onstart = () => { started = true; resolve('system'); };
      u.onerror = e => {
        if (started) return;
        if (e.error === 'interrupted' || e.error === 'canceled') resolve('superseded');
        else reject(new Error(e.error || 'tts'));
      };
      // some engines never fire onstart at all; do not leave the caller hanging
      setTimeout(() => { if (!started) reject(new Error('tts-silent')); }, 3000);
      speechSynthesis.speak(u);
    }, 60);
  });
}

/* Mobile browsers only let audio start inside a user gesture. Play a silent
   clip on the very first touch, so later programmatic playback — auto-speak
   when a card appears — is not blocked. */
function unlockAudio() {
  document.removeEventListener('pointerdown', unlockAudio, true);
  try {
    if (!player.src) {
      const n = 800, buf = new ArrayBuffer(44 + n), v = new DataView(buf);
      const str = (o, s) => { for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)); };
      str(0, 'RIFF'); v.setUint32(4, 36 + n, true); str(8, 'WAVE'); str(12, 'fmt ');
      v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
      v.setUint32(24, 8000, true); v.setUint32(28, 8000, true);
      v.setUint16(32, 1, true); v.setUint16(34, 8, true);
      str(36, 'data'); v.setUint32(40, n, true);
      new Uint8Array(buf, 44).fill(128);
      const silent = URL.createObjectURL(new Blob([buf], { type: 'audio/wav' }));
      player.src = silent;
      const pr = player.play();
      if (pr && pr.then) pr.then(() => { if (player.src === silent) player.pause(); }).catch(() => { });
    }
    if ('speechSynthesis' in window) speechSynthesis.speak(new SpeechSynthesisUtterance(''));
  } catch (e) { void e; }
}

function download(name, text, type) {
  const blob = new Blob([text], { type: type || 'application/json;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
}

/* Files exported by Chinese apps are still routinely GBK. Decode as UTF-8 first
   and fall back when the result is full of replacement characters. */
async function readTextFile(file) {
  const buf = await file.arrayBuffer();
  let text = new TextDecoder('utf-8').decode(buf);
  if ((text.match(/�/g) || []).length > text.length / 200) {
    for (const enc of ['gbk', 'gb18030', 'big5']) {
      try {
        const alt = new TextDecoder(enc).decode(buf);
        if ((alt.match(/�/g) || []).length < (text.match(/�/g) || []).length) { text = alt; break; }
      } catch (e) { void e; }
    }
  }
  return text;
}

/* ---- day log ----------------------------------------------------------- */

function today() {
  const k = SRS.dayKey();
  let d = DAYS.get(k);
  if (!d) { d = { date: k, learned: 0, reviewed: 0, correct: 0, total: 0 }; DAYS.set(k, d); }
  return d;
}
function saveDay(d) { S.put('days', d); }

/* Consecutive days with any activity. Today counts only if something has been
   done, but an empty today does not break a streak that is otherwise alive —
   at 9am you have not lost yesterday's run. */
function streakDays() {
  let n = 0;
  for (let i = 0; i < 4000; i++) {
    const d = DAYS.get(SRS.dayKey(Date.now() - i * SRS.DAY));
    const active = d && (d.learned || d.reviewed);
    if (active) n++;
    else if (i > 0) break;
  }
  return n;
}

/* ---- library ----------------------------------------------------------- */

function makeWord(row, tag) {
  const key = norm(row.w);
  return SRS.newCard({
    key,
    w: String(row.w).trim(),
    phon: row.phon || '',
    trans: row.trans || '',
    exEn: row.exEn || '',
    exCn: row.exCn || '',
    note: row.note || '',
    tags: tag ? [tag] : [],
    added: Date.now(),
  });
}

async function saveWord(w) {
  LIB.set(w.key, w);
  await S.put('words', w);
}

function dueList(at) {
  const t = at || SRS.endOfDay();
  const out = [];
  for (const w of LIB.values()) if (w.state >= SRS.STATE.LEARNING && w.due <= t) out.push(w);
  return out.sort((a, b) => a.due - b.due);
}
function newList() {
  const out = [];
  for (const w of LIB.values()) if (w.state === SRS.STATE.NEW) out.push(w);
  return out.sort((a, b) => a.added - b.added || a.w.localeCompare(b.w));
}
function counts() {
  let n = 0, l = 0, r = 0, m = 0;
  for (const w of LIB.values()) {
    if (w.state === 0) n++; else if (w.state === 1) l++; else if (w.state === 2) r++; else m++;
  }
  return { total: LIB.size, new: n, learning: l, review: r, mastered: m };
}

/* ======================================================================== */
/*  Study tab                                                               */
/* ======================================================================== */

function renderStudy() {
  const c = counts();
  const due = dueList().length;
  const d = today();
  const goal = SET.newPerDay;
  const newLeft = Math.max(0, goal - d.learned);
  const canNew = Math.min(newLeft, c.new);
  const pct = goal ? Math.min(1, d.learned / goal) : 1;
  const acc = d.total ? Math.round(d.correct / d.total * 100) : null;
  const streak = streakDays();
  const learned = c.total - c.new;
  let starred = 0;
  for (const w of LIB.values()) if (w.starred && w.state >= SRS.STATE.LEARNING) starred++;

  const empty = c.total === 0;

  view().innerHTML = `
    <div class="topbar"><h1>Wordbank<span class="topbar__sub"> · 单词本</span></h1>
      <button class="btn btn--sm" data-act="import">导入</button></div>

    ${empty ? `
      <div class="empty">
        <svg viewBox="0 0 24 24"><path d="M4 5.5A1.5 1.5 0 0 1 5.5 4H11v16H5.5A1.5 1.5 0 0 1 4 18.5zM20 5.5A1.5 1.5 0 0 0 18.5 4H13v16h5.5a1.5 1.5 0 0 0 1.5-1.5z"/></svg>
        <p>词库还是空的。</p>
        <p class="small">粘贴一段单词、选一本内置词书，或手动加一个词就能开始。</p>
        <button class="btn btn--primary" data-act="import" style="margin-top:14px">导入单词</button>
      </div>` : `
      <div class="card">
        <div class="today">
          <div class="today__new"><div class="today__n">${canNew}</div><div class="today__k">待学新词</div></div>
          <div>
            <svg class="ring" width="66" height="66" viewBox="0 0 66 66">
              <circle class="bg" cx="33" cy="33" r="27"/>
              <circle class="fg" cx="33" cy="33" r="27" transform="rotate(-90 33 33)"
                stroke-dasharray="${(2 * Math.PI * 27).toFixed(1)}"
                stroke-dashoffset="${(2 * Math.PI * 27 * (1 - pct)).toFixed(1)}"/>
            </svg>
            <div class="today__k">今日 ${d.learned}/${goal}</div>
          </div>
          <div class="today__due"><div class="today__n">${due}</div><div class="today__k">待复习</div></div>
        </div>
        <button class="btn btn--primary btn--wide" data-act="start"
          ${(canNew + due) ? '' : 'disabled'}>
          ${(canNew + due) ? '开始学习' : '今天的任务已完成'}
        </button>
        ${(canNew + due) ? '' : `<p class="center small muted" style="margin:12px 0 0">
          还想继续可以做一次抽查，或到设置里调高每日新词量。</p>`}
        <div class="streak" title="最近 14 天打卡">
          ${Array.from({ length: 14 }, (_, i) => {
    const k = SRS.dayKey(Date.now() - (13 - i) * SRS.DAY);
    const dd = DAYS.get(k);
    return `<i class="${dd && (dd.learned || dd.reviewed) ? 'on' : ''}"></i>`;
  }).join('')}
        </div>
        <p class="center small muted" style="margin:8px 0 0">
          连续 ${streak} 天${acc === null ? '' : ` · 今日正确率 ${acc}%`}
        </p>
      </div>

      <div class="card">
        <h2>随时抽查</h2>
        <p class="small muted" style="margin:-4px 0 12px">
          从已经学过的词里随机抽 20 个考你。答对不会拉长复习间隔，答错照常算作遗忘 ——
          所以随便抽查多少次都不会打乱排期。${SET.spotRecall
      ? '当前用<b>自评卡</b>：只给单词，不给选项。'
      : '想要不给选项的纯回忆，去设置里打开「抽查只用自评卡」。'}
        </p>
        <div class="row">
          <button class="btn btn--sm" data-act="spot" ${learned ? '' : 'disabled'}>随机抽查</button>
          <button class="btn btn--sm" data-act="spot-star" ${starred ? '' : 'disabled'}>只抽收藏 ${starred || ''}</button>
          <div class="spacer"></div>
        </div>
      </div>

      <div class="card">
        <h2>词库 <span class="n">${c.total} 词</span></h2>
        <div class="kv">
          <div><b>${c.new}</b><span>未学</span></div>
          <div><b>${c.learning}</b><span>学习中</span></div>
          <div><b>${c.review}</b><span>复习中</span></div>
          <div><b>${c.mastered}</b><span>已掌握</span></div>
        </div>
      </div>`}
  `;
}

/* ======================================================================== */
/*  Session                                                                 */
/* ======================================================================== */

const SES = {
  on: false, queue: [], i: 0, spot: false,
  answered: false, right: 0, wrong: 0, seen: 0, started: 0,
  hist: [],       // answer snapshots, newest last — see goBack()
};

/* Which types a given word can actually support. `recall` needs nothing — the
   card is just the word — which makes it the safe fallback. */
function eligible(w) {
  const hasTrans = !!w.trans;
  return {
    recall: true,
    en2cn: hasTrans,
    cn2en: hasTrans,
    spell: hasTrans,
    cloze: !!(w.exEn && clozeRe(w)),
    listen: hasTrans && 'speechSynthesis' in window,
  };
}

/* Draw a question type from the user's weights. There is deliberately no
   difficulty ramp on top: an earlier version quietly forced 认词义 for new
   words and doubled 拼写 for old ones, which silently overrode whatever ratio
   the settings page said. Weight 0 means never, and it means it. */
function pickType(w) {
  if (w.state === SRS.STATE.NEW && !w.reps) return 'learn';
  if (SES.spot && SET.spotRecall) return 'recall';

  const ok = eligible(w);
  const pool = [];
  let total = 0;
  for (const k in ok) {
    const wt = Math.max(0, Math.min(5, Number((SET.types || {})[k]) || 0));
    if (ok[k] && wt > 0) { pool.push([k, wt]); total += wt; }
  }
  if (!pool.length) return 'recall';
  let r = Math.random() * total;
  for (const [k, wt] of pool) { r -= wt; if (r <= 0) return k; }
  return pool[pool.length - 1][0];
}

function clozeRe(w) {
  const base = w.w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp('\\b' + base + '(?:s|es|ed|ing|d)?\\b', 'i');
  return re.test(w.exEn) ? re : null;
}

function buildQueue(opts) {
  const o = opts || {};
  if (o.spot) {
    const pool = [...LIB.values()].filter(w => w.state >= SRS.STATE.LEARNING && (!o.starred || w.starred));
    return shuffle(pool).slice(0, 20).map(w => w.key);
  }
  if (o.keys) return o.keys.slice();

  const d = today();
  const rand = SET.order === 'random';

  // Sequential draws today's new words from the front of the library, which for
  // a built-in book means 考频顺序; random draws from anywhere in the backlog.
  const newPool = newList();
  const fresh = (rand ? shuffle(newPool.slice()) : newPool)
    .slice(0, Math.max(0, SET.newPerDay - d.learned)).map(w => w.key);

  // Reviews are always *selected* by due date — the most overdue matter most —
  // but random shuffles the order they are asked in.
  let due = dueList().slice(0, SET.reviewCap).map(w => w.key);
  if (rand) due = shuffle(due);

  // Spread the new words through the review queue instead of front-loading them:
  // meeting 20 unknown words in a row is the part people quit over.
  if (!fresh.length) return due;
  if (!due.length) return fresh;
  const out = [];
  const step = due.length / fresh.length;
  let fi = 0;
  for (let i = 0; i < due.length; i++) {
    while (fi < fresh.length && fi * step <= i) out.push(fresh[fi++]);
    out.push(due[i]);
  }
  while (fi < fresh.length) out.push(fresh[fi++]);
  return out;
}

function startSession(opts) {
  const queue = buildQueue(opts);
  if (!queue.length) { toast('没有可以学习的词'); return; }
  Object.assign(SES, {
    on: true, queue, i: 0, spot: !!(opts && opts.spot),
    answered: false, right: 0, wrong: 0, seen: 0, started: Date.now(), hist: [],
  });
  $('#session').classList.remove('is-hidden');
  document.body.style.overflow = 'hidden';
  renderCard();
}

function endSession() {
  SES.on = false;
  stopSpeaking();
  $('#session').classList.add('is-hidden');
  document.body.style.overflow = '';
  render();
}

function distractors(w, field, n) {
  // Prefer other words from the user's own library: an option list drawn from
  // the same book is a real test, one drawn from a 20k dictionary is a giveaway.
  const pool = [];
  const mine = [...LIB.values()];
  shuffle(mine);
  for (const x of mine) {
    if (x.key === w.key) continue;
    const v = x[field];
    if (!v || pool.includes(v)) continue;
    pool.push(v);
    if (pool.length >= n) break;
  }
  if (pool.length < n && field === 'trans' && D.isLoaded()) {
    for (const g of D.randomGlosses(n - pool.length, [w.trans, ...pool])) pool.push(g);
  }
  while (pool.length < n) pool.push('—');
  return pool.slice(0, n);
}

const SPEAKER = `<svg viewBox="0 0 24 24"><path d="M11 5 6 9H3v6h3l5 4z"/><path d="M15.5 8.5a5 5 0 0 1 0 7"/><path d="M18.5 5.5a9 9 0 0 1 0 13"/></svg>`;

function renderCard(forceType) {
  const key = SES.queue[SES.i];
  const w = LIB.get(key);
  if (!w) { SES.i++; return SES.i < SES.queue.length ? renderCard() : renderDone(); }

  // going back re-asks the same kind of question instead of drawing a new one
  SES.type = forceType || pickType(w);
  SES.answered = false;
  syncBack();
  const total = SES.queue.length;
  $('#ses-prog').style.width = (SES.i / total * 100) + '%';
  $('#ses-count').textContent = (SES.i + 1) + ' / ' + total;

  const body = $('#ses-body');
  const foot = $('#ses-foot');
  const t = SES.type;

  if (t === 'learn' || t === 'recall') {
    // Word only. Showing the gloss here would make "认识" meaningless —
    // you cannot honestly say you knew a word whose meaning is on screen.
    const isNew = t === 'learn';
    const ivl = SRS.preview(w, SET.masterDays);
    body.innerHTML = `
      <div class="q">
        <div class="q__kind">${isNew ? '新词' : '自评回忆'}</div>
        <div class="q__word en">${esc(w.w)}</div>
        ${w.phon ? `<div class="q__phon ipa">/${esc(w.phon)}/</div>` : ''}
        <button class="q__speak" data-say="${esc(w.w)}">${SPEAKER} 发音</button>
        <p class="small faint" style="margin-top:18px">
          ${isNew ? '这个词你认识吗？' : '还记得意思吗？想好了再看答案'}</p>
      </div>`;
    foot.innerHTML = `
      <div class="grades">
        <button class="grade grade--again" data-grade="0">不认识<small>${isNew ? '现在学' : '重新学'}</small></button>
        <button class="grade" data-grade="3">有印象<small>${SRS.ivlLabel(ivl[3])}后</small></button>
        ${isNew
        ? '<button class="grade grade--good" data-grade="known">已认识<small>不用学了</small></button>'
        : `<button class="grade grade--good" data-grade="5">认识<small>${SES.spot ? '不改排期' : SRS.ivlLabel(ivl[5]) + '后'}</small></button>`}
      </div>`;
    if (SET.autoSpeak) speak(w.w);
    return;
  }

  if (t === 'spell' || t === 'cloze') {
    const isCloze = t === 'cloze';
    const re = isCloze ? clozeRe(w) : null;
    const sentence = isCloze ? w.exEn.replace(re, '<u>&nbsp;</u>') : '';
    const hint = w.w.replace(/[a-z]/gi, (ch, i) => (i === 0 ? ch : '_'));
    body.innerHTML = `
      <div class="q">
        <div class="q__kind">${isCloze ? '例句填空' : '拼写'}</div>
        ${isCloze
        ? `<div class="cloze en">${sentence}</div>
             ${w.exCn ? `<div class="small muted" style="margin-top:8px">${esc(w.exCn)}</div>` : ''}
             <div class="q__prompt" style="margin-top:14px">${esc(w.trans)}</div>`
        : `<div class="q__prompt">${esc(w.trans)}</div>
             ${w.phon ? `<div class="q__phon ipa">/${esc(w.phon)}/</div>` : ''}`}
        <div class="spell">
          <div class="spell__hint en">${esc(hint)}</div>
          <input id="spell-in" type="text" inputmode="text" autocapitalize="off"
                 autocomplete="off" autocorrect="off" spellcheck="false" placeholder="拼出这个单词">
        </div>
      </div>`;
    foot.innerHTML = `<button class="btn btn--primary btn--wide" data-act="check">检查</button>`;
    const input = $('#spell-in');
    input.focus();
    input.addEventListener('keydown', e => { if (e.key === 'Enter') checkSpell(); });
    return;
  }

  if (t === 'listen') {
    const right = w.trans;
    const opts = shuffle([right, ...distractors(w, 'trans', 3)]);
    body.innerHTML = `
      <div class="q">
        <div class="q__kind">听音辨义</div>
        <div class="center" style="padding:22px 0">
          <button class="q__speak q__speak--big" data-say="${esc(w.w)}">${SPEAKER}</button>
          <div class="small muted">点击重听</div>
        </div>
        <div class="opts">${optButtons(opts, right)}</div>
      </div>`;
    foot.innerHTML = '';
    speak(w.w);
    return;
  }

  // en2cn / cn2en
  const en2cn = t === 'en2cn';
  const right = en2cn ? w.trans : w.w;
  const opts = shuffle([right, ...distractors(w, en2cn ? 'trans' : 'w', 3)]);
  body.innerHTML = `
    <div class="q">
      <div class="q__kind">${en2cn ? '认词义' : '选单词'}</div>
      ${en2cn
      ? `<div class="q__word en">${esc(w.w)}</div>
           ${w.phon ? `<div class="q__phon ipa">/${esc(w.phon)}/</div>` : ''}
           <button class="q__speak" data-say="${esc(w.w)}">${SPEAKER} 发音</button>`
      : `<div class="q__prompt">${esc(w.trans)}</div>`}
      <div class="opts">${optButtons(opts, right, !en2cn)}</div>
    </div>`;
  foot.innerHTML = '';
  if (en2cn && SET.autoSpeak) speak(w.w);
}

function optButtons(opts, right, english) {
  return opts.map((o, i) => `
    <button class="opt${english ? ' en' : ''}" data-opt="${esc(o)}" data-right="${o === right ? 1 : 0}">
      <b>${'ABCD'[i]}</b><span>${esc(o)}</span>
    </button>`).join('');
}

function exampleHTML(w) {
  if (!w.exEn) return '';
  const re = clozeRe(w);
  const en = re ? w.exEn.replace(re, m => '<b>' + esc(m) + '</b>') : esc(w.exEn);
  return `<div class="reveal__ex"><em class="en">${en}</em>${w.exCn ? '<br>' + esc(w.exCn) : ''}</div>`;
}

function checkSpell() {
  if (SES.answered) return;
  const w = LIB.get(SES.queue[SES.i]);
  const input = $('#spell-in');
  const val = norm(input.value);
  const ok = val === norm(w.w);
  input.classList.add(ok ? 'is-right' : 'is-wrong');
  input.disabled = true;
  answer(ok);
}

function answer(ok) {
  if (SES.answered) return;
  SES.answered = true;
  const w = LIB.get(SES.queue[SES.i]);
  beginAnswer(w);
  SES.seen++;
  if (ok) SES.right++; else SES.wrong++;

  const d = today();
  d.total++;
  if (ok) d.correct++;
  const wasNew = w.state === SRS.STATE.NEW;

  if (SES.spot && ok) {
    // Spot check: a correct answer proves nothing new about the schedule, so
    // record that it was seen and leave the due date alone.
    w.seen = (w.seen || 0) + 1;
    w.last = Date.now();
    saveWord(w);
  } else {
    SRS.grade(w, ok ? 5 : 0, Date.now(), SET.masterDays);
    saveWord(w);
    if (wasNew) d.learned++;
    else d.reviewed++;
  }
  saveDay(d);

  if (!ok && SET.relearnInSession) requeue();

  showReveal(ok);
}

/* A missed word comes back a few cards later in the same sitting — that
   immediate second look is what makes the first interval stick. */
function requeue() {
  const key = SES.queue[SES.i];
  const at = Math.min(SES.queue.length, SES.i + 4 + ((Math.random() * 3) | 0));
  SES.queue.splice(at, 0, key);
  // remember the insertion so going back can take the extra copy out again
  const top = SES.hist[SES.hist.length - 1];
  if (top && top.pos === SES.i) top.inserted.push(at);
}

/* ---- 上一题 ------------------------------------------------------------- */

/* Before an answer mutates anything, snapshot what it is about to change: the
   word record, today's counters, the session tallies, and (via requeue) where a
   repeat copy gets inserted. Going back pops these newest-first, so the
   previous card returns genuinely unanswered — re-answering it can never
   double-count a review or schedule the word twice. */
function beginAnswer(w) {
  const d = today();
  SES.hist.push({
    pos: SES.i, key: w.key, type: SES.type,
    word: JSON.parse(JSON.stringify(w)),
    day: { date: d.date, learned: d.learned, reviewed: d.reviewed, correct: d.correct, total: d.total },
    ses: { seen: SES.seen, right: SES.right, wrong: SES.wrong },
    inserted: [],
  });
  syncBack();
}

async function undoEntry(e) {
  for (let j = e.inserted.length - 1; j >= 0; j--) SES.queue.splice(e.inserted[j], 1);
  await saveWord(e.word);
  const d = DAYS.get(e.day.date);
  if (d) { Object.assign(d, e.day); saveDay(d); }
  Object.assign(SES, e.ses);
}

let goingBack = false;
async function goBack() {
  if (!SES.on || !SES.hist.length || goingBack) return;
  goingBack = true;
  try {
    stopSpeaking();
    const top = SES.hist[SES.hist.length - 1];
    // the card on screen was already answered: take that answer back first
    if (SES.answered && SES.i < SES.queue.length && top.pos === SES.i) await undoEntry(SES.hist.pop());
    const prev = SES.hist.pop();
    if (prev) {
      await undoEntry(prev);
      SES.i = prev.pos;
      renderCard(prev.type);
    } else {
      renderCard(top.type);        // only the current card had an answer; show it fresh
    }
  } finally {
    goingBack = false;
    syncBack();
  }
}

function syncBack() {
  const b = $('#ses-back');
  if (b) b.disabled = !SES.hist.length;
}

function showReveal(ok) {
  const w = LIB.get(SES.queue[SES.i]);
  document.querySelectorAll('#ses-body .opt').forEach(b => {
    b.disabled = true;
    if (b.dataset.right === '1') b.classList.add('is-right');
    else if (b.dataset.picked === '1') b.classList.add('is-wrong');
  });

  const q = $('#ses-body .q');
  if (q && !q.querySelector('.reveal')) {
    const div = document.createElement('div');
    div.className = 'reveal';
    div.innerHTML = `
      <div class="row"><div class="q__word en" style="font-size:26px">${esc(w.w)}</div>
        <button class="q__speak" data-say="${esc(w.w)}">${SPEAKER}</button></div>
      ${w.phon ? `<div class="q__phon ipa">/${esc(w.phon)}/</div>` : ''}
      <div class="reveal__trans" style="margin-top:6px">${esc(w.trans)}</div>
      ${exampleHTML(w)}`;
    q.appendChild(div);
    div.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  const next = SRS.ivlLabel(w.ivl);
  $('#ses-foot').innerHTML = `
    <div class="row" style="margin-bottom:8px">
      <span class="small ${ok ? '' : 'muted'}" style="color:${ok ? 'var(--good)' : 'var(--bad)'}">
        ${ok ? '答对' : '答错'}</span>
      <span class="small muted">${SES.spot && ok ? '抽查不改排期' : '下次复习：' + next}</span>
      <div class="spacer"></div>
      ${ok && !SES.spot ? '<button class="btn btn--sm btn--ghost" data-act="vague">其实有点模糊</button>' : ''}
    </div>
    <button class="btn btn--primary btn--wide" data-act="next">继续</button>`;
  if (!ok && SET.autoSpeak) speak(w.w);
}

/* Second half of a new-word card: the meaning, shown only once the learner has
   committed to an answer. Saying "已认识" and then reading the gloss is how you
   catch a word you only thought you knew, so the downgrade stays available. */
function showLearnReveal(w, g) {
  const q = $('#ses-body .q');
  if (q) {
    const hint = q.querySelector('.small.faint');
    if (hint) hint.remove();
    const div = document.createElement('div');
    div.className = 'reveal';
    div.innerHTML = `
      <div class="reveal__trans">${esc(w.trans)
      || '<span class="muted">（还没有释义，可在词库里补上）</span>'}</div>
      ${exampleHTML(w)}`;
    q.appendChild(div);
  }
  const label = g === 'known' ? '标为已掌握'
    : g === '0' ? '本轮稍后再来一次'
      : SES.spot ? '抽查不改排期'
        : '下次复习：' + SRS.ivlLabel(w.ivl);
  $('#ses-foot').innerHTML = `
    <div class="row" style="margin-bottom:8px">
      <span class="small muted">${label}</span>
      <div class="spacer"></div>
      ${g === '0' ? '' : '<button class="btn btn--sm btn--ghost" data-act="relearn">其实不认识</button>'}
    </div>
    <button class="btn btn--primary btn--wide" data-act="next">继续</button>`;
}

function nextCard() {
  SES.i++;
  if (SES.i >= SES.queue.length) renderDone();
  else renderCard();
}

function renderDone() {
  syncBack();
  const secs = Math.round((Date.now() - SES.started) / 1000);
  const acc = SES.seen ? Math.round(SES.right / SES.seen * 100) : 0;
  $('#ses-prog').style.width = '100%';
  $('#ses-count').textContent = '完成';
  $('#ses-body').innerHTML = `
    <div class="done">
      <div class="done__big">${acc >= 90 ? '🎉' : acc >= 70 ? '👍' : '💪'}</div>
      <h2 style="margin:0">这一轮结束</h2>
      <div class="done__stats">
        <div><b>${SES.seen}</b><span class="small muted">答题</span></div>
        <div><b>${acc}%</b><span class="small muted">正确率</span></div>
        <div><b>${Math.floor(secs / 60)}′${String(secs % 60).padStart(2, '0')}″</b><span class="small muted">用时</span></div>
      </div>
      <p class="small muted">还剩 ${dueList().length} 个待复习</p>
    </div>`;
  $('#ses-foot').innerHTML = `
    <div class="row">
      <button class="btn btn--wide" data-act="again">再来一轮</button>
      <button class="btn btn--primary btn--wide" data-act="close">完成</button>
    </div>`;
}

/* ======================================================================== */
/*  Library tab                                                             */
/* ======================================================================== */

const LIBQ = { q: '', filter: 'all', limit: 200 };

const FILTERS = [
  ['all', '全部'], ['due', '待复习'], ['new', '未学'],
  ['learning', '学习中'], ['review', '复习中'], ['mastered', '已掌握'], ['star', '收藏'],
];

function filterWords() {
  const q = LIBQ.q.trim().toLowerCase();
  const eod = SRS.endOfDay();
  const out = [];
  for (const w of LIB.values()) {
    if (LIBQ.filter === 'due' && !(w.state >= 1 && w.due <= eod)) continue;
    if (LIBQ.filter === 'new' && w.state !== 0) continue;
    if (LIBQ.filter === 'learning' && w.state !== 1) continue;
    if (LIBQ.filter === 'review' && w.state !== 2) continue;
    if (LIBQ.filter === 'mastered' && w.state !== 3) continue;
    if (LIBQ.filter === 'star' && !w.starred) continue;
    if (q && !w.key.includes(q) && !(w.trans || '').toLowerCase().includes(q)) continue;
    out.push(w);
  }
  return out.sort((a, b) => b.added - a.added);
}

function renderLibrary() {
  const list = filterWords();
  const shown = list.slice(0, LIBQ.limit);
  view().innerHTML = `
    <div class="topbar"><h1>词库<span class="topbar__sub"> · ${LIB.size} 词</span></h1>
      <button class="btn btn--sm" data-act="import">导入</button>
      <button class="btn btn--sm" data-act="add">新增</button></div>
    <div class="search">
      <svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>
      <input id="lib-q" type="search" placeholder="搜索单词或释义" value="${esc(LIBQ.q)}">
    </div>
    <div class="chips" style="margin-bottom:12px">
      ${FILTERS.map(([k, n]) => `<button class="chip" data-filter="${k}"
        aria-pressed="${LIBQ.filter === k}">${n}</button>`).join('')}
    </div>
    ${shown.length ? `<ul class="wlist">${shown.map(wliHTML).join('')}</ul>` : `
      <div class="empty"><p>没有匹配的词。</p></div>`}
    ${list.length > shown.length ? `<button class="btn btn--wide" style="margin-top:12px"
      data-act="more">还有 ${list.length - shown.length} 个，显示更多</button>` : ''}
  `;
  const input = $('#lib-q');
  input.addEventListener('input', () => {
    LIBQ.q = input.value; LIBQ.limit = 200;
    const pos = input.selectionStart;
    renderLibrary();
    const n = $('#lib-q'); n.focus(); n.setSelectionRange(pos, pos);
  });
}

function wliHTML(w) {
  const label = ['未学', '学习中', '复习中', '已掌握'][w.state];
  return `<li class="wli" data-key="${esc(w.key)}">
    <div class="wli__main">
      <div class="wli__w en">${esc(w.w)}</div>
      <div class="wli__t">${esc(w.trans) || '<span class="faint">无释义</span>'}</div>
    </div>
    <span class="wli__s" data-s="${w.state}">${label}</span>
    <button class="star ${w.starred ? 'on' : ''}" data-star="${esc(w.key)}">${w.starred ? '★' : '☆'}</button>
  </li>`;
}

function openWord(key) {
  const w = LIB.get(key);
  if (!w) return;
  const books = D.isLoaded() ? D.bookTagsFor(w.w) : [];
  const tags = [...new Set([...(w.tags || []), ...books])];
  sheet(`
    <div class="row">
      <h3 class="en" style="flex:1;font-size:24px;margin:0">${esc(w.w)}</h3>
      <button class="q__speak" data-say="${esc(w.w)}">${SPEAKER}</button>
    </div>
    ${w.phon ? `<div class="q__phon ipa" style="margin-bottom:8px">/${esc(w.phon)}/</div>` : ''}
    <div style="margin:10px 0 4px">${esc(w.trans) || '<span class="muted">还没有释义</span>'}</div>
    ${exampleHTML(w)}
    ${w.note ? `<p class="small muted">笔记：${esc(w.note)}</p>` : ''}
    <div class="chips" style="margin:14px 0">
      ${tags.map(t => `<span class="chip chip--tag">${esc(t)}</span>`).join('')}
      <span class="chip chip--tag">${['未学', '学习中', '复习中', '已掌握'][w.state]}</span>
      ${w.state ? `<span class="chip chip--tag">下次 ${new Date(w.due).toLocaleDateString('zh-CN')}</span>` : ''}
      ${w.reps ? `<span class="chip chip--tag">复习 ${w.reps} 次</span>` : ''}
      ${w.lapses ? `<span class="chip chip--tag">忘过 ${w.lapses} 次</span>` : ''}
    </div>
    <div class="row row--wrap">
      <button class="btn btn--sm" data-act="edit" data-key="${esc(key)}">编辑</button>
      <button class="btn btn--sm" data-act="reset" data-key="${esc(key)}">重置进度</button>
      <button class="btn btn--sm" data-act="fill" data-key="${esc(key)}">查词补全</button>
      <button class="btn btn--sm btn--danger" data-act="del" data-key="${esc(key)}">删除</button>
    </div>
  `);
}

function editWord(key) {
  const w = key ? LIB.get(key) : { w: '', phon: '', trans: '', exEn: '', exCn: '', note: '' };
  sheet(`
    <h3>${key ? '编辑' : '新增单词'}</h3>
    <label class="field"><span>单词</span>
      <input class="input en" id="e-w" value="${esc(w.w)}" ${key ? 'readonly' : ''}
        autocapitalize="off" autocorrect="off" spellcheck="false"></label>
    <label class="field"><span>音标</span><input class="input ipa" id="e-phon" value="${esc(w.phon)}"></label>
    <label class="field"><span>释义</span><textarea class="input" id="e-trans" style="min-height:64px">${esc(w.trans)}</textarea></label>
    <label class="field"><span>例句</span><textarea class="input en" id="e-exen" style="min-height:56px">${esc(w.exEn)}</textarea></label>
    <label class="field"><span>例句翻译</span><input class="input" id="e-excn" value="${esc(w.exCn)}"></label>
    <label class="field"><span>笔记</span><input class="input" id="e-note" value="${esc(w.note || '')}"></label>
    <div class="row">
      ${key ? '' : '<button class="btn btn--sm" data-act="lookup-one">查词典填充</button>'}
      <div class="spacer"></div>
      <button class="btn btn--primary" data-act="save-word" data-key="${esc(key || '')}">保存</button>
    </div>`);
  if (!key) setTimeout(() => $('#e-w') && $('#e-w').focus(), 260);
}

async function saveEdit(key) {
  const w0 = key ? LIB.get(key) : null;
  const word = $('#e-w').value.trim();
  if (!word) { toast('请填单词'); return; }
  const k = norm(word);
  if (!key && LIB.has(k)) { toast('这个词已经在词库里了'); return; }
  const rec = w0 || makeWord({ w: word }, '手动添加');
  rec.w = word;
  rec.phon = $('#e-phon').value.trim();
  rec.trans = $('#e-trans').value.trim();
  rec.exEn = $('#e-exen').value.trim();
  rec.exCn = $('#e-excn').value.trim();
  rec.note = $('#e-note').value.trim();
  await saveWord(rec);
  closeSheet();
  toast(key ? '已保存' : '已加入词库');
  render();
}

/* ======================================================================== */
/*  Import                                                                  */
/* ======================================================================== */

const IMP = { tab: 'paste', rows: [], mode: 'auto', tag: '', book: null };

function openImport() {
  IMP.rows = [];
  sheet(importHTML(), true);
  wireImport();
}

function importHTML() {
  return `
    <h3>导入单词</h3>
    <div class="imp__tabs">
      ${[['paste', '粘贴文本'], ['file', '选择文件'], ['book', '内置词书']].map(([k, n]) =>
    `<button class="chip" data-imp="${k}" aria-pressed="${IMP.tab === k}"
       style="justify-content:center;text-align:center">${n}</button>`).join('')}
    </div>
    <div id="imp-body">${impBody()}</div>
    <div id="imp-result"></div>`;
}

function impBody() {
  if (IMP.tab === 'paste') return `
    <label class="field"><span>每行一个词条，格式随意</span>
      <textarea class="input" id="imp-text" placeholder="abandon vt. 放弃，抛弃
benevolent adj. 仁慈的
candid

也可以直接贴一列纯单词，或从扇贝、欧路导出的 CSV。"></textarea></label>
    <label class="field"><span>解析方式</span>
      <select class="input" id="imp-mode">
        ${P.MODES.map(([k, n]) => `<option value="${k}">${n}</option>`).join('')}
      </select></label>
    <button class="btn btn--primary btn--wide" data-act="imp-parse">解析</button>`;

  if (IMP.tab === 'file') return `
    <p class="small muted">支持 .txt / .csv / .tsv，UTF-8 与 GBK 都能读。</p>
    <label class="field"><span>选择文件</span>
      <input class="input" id="imp-file" type="file" accept=".txt,.csv,.tsv,text/plain,text/csv"></label>`;

  const books = D.books();
  if (!books.length) return `
    <p class="small muted">内置词书来自 14 本考试词表，共 19,870 个词条（含音标、词性释义和例句）
      与 52,061 条短语。第一次使用需要下载约 2.5 MB，之后完全离线。</p>
    <button class="btn btn--primary btn--wide" data-act="imp-load-dict">载入词书</button>
    <div class="bar is-hidden" id="imp-bar"><i></i></div>`;
  return `
    <label class="field"><span>选择词书</span>
      <select class="input" id="imp-book">
        ${books.map(b => `<option value="${b.key}">${b.name} · ${b.size} 词</option>`).join('')}
      </select></label>
    <div class="row" style="gap:8px">
      <label class="field" style="flex:1;margin:0"><span>从第几个</span>
        <input class="input" id="imp-from" type="number" min="1" value="1"></label>
      <label class="field" style="flex:1;margin:0"><span>到第几个</span>
        <input class="input" id="imp-to" type="number" min="1" placeholder="全部"></label>
    </div>
    <p class="small muted" style="margin:8px 0 12px">词书按考频/课序排列，分批导入更好背。</p>
    <button class="btn btn--primary btn--wide" data-act="imp-book">解析</button>`;
}

function wireImport() {
  const f = $('#imp-file');
  if (f) f.addEventListener('change', async () => {
    if (!f.files || !f.files[0]) return;
    const text = await readTextFile(f.files[0]);
    const r = P.parse(text, 'auto');
    IMP.mode = r.mode;
    showPreview(r.rows, r.note + '（' + f.files[0].name + '）');
  });
}

async function ensureDict(onDone) {
  if (D.isLoaded()) return onDone();
  const bar = $('#imp-bar');
  if (bar) bar.classList.remove('is-hidden');
  try {
    await D.load(p => { if (bar) bar.querySelector('i').style.width = (p * 100) + '%'; });
    onDone();
  } catch (e) {
    toast(e.message || '词库下载失败，检查网络');
    if (bar) bar.classList.add('is-hidden');
  }
}

function showPreview(rows, note) {
  IMP.rows = rows;
  const dup = rows.filter(r => LIB.has(norm(r.w))).length;
  const miss = rows.filter(r => !r.trans).length;
  $('#imp-result').innerHTML = `
    <p class="small muted" style="margin:14px 0 8px">${esc(note)}${dup ? ` · ${dup} 个已在词库中（将跳过）` : ''}</p>
    <div class="preview"><table>
      <thead><tr><th>单词</th><th>释义</th></tr></thead>
      <tbody>${rows.slice(0, 300).map(r => {
    const isDup = LIB.has(norm(r.w));
    return `<tr class="${isDup ? 'dup' : ''} ${r.trans ? '' : 'miss'}">
        <td class="en">${esc(r.w)}</td><td>${esc(r.trans) || '待查'}</td></tr>`;
  }).join('')}</tbody>
    </table></div>
    ${rows.length > 300 ? `<p class="small faint" style="margin:6px 0 0">仅预览前 300 条，导入时是全部 ${rows.length} 条。</p>` : ''}
    ${miss ? `<label class="switch"><span class="switch__label"><b>自动查词典补释义</b>
      <span class="small muted">给 ${miss} 个没有释义的词补上音标、释义和例句</span></span>
      <input type="checkbox" id="imp-fill" checked></label>` : ''}
    <label class="field" style="margin-top:12px"><span>给这批词加个标签（可留空）</span>
      <input class="input" id="imp-tag" placeholder="例如：六月阅读生词"></label>
    <div class="bar is-hidden" id="imp-bar2"><i></i></div>
    <button class="btn btn--primary btn--wide" data-act="imp-commit" ${dup === rows.length ? 'disabled' : ''}>
      ${dup === rows.length ? '这些词都已在词库中' : '导入 ' + (rows.length - dup) + ' 个新词'}</button>`;
}

async function commitImport() {
  const fill = $('#imp-fill');
  const tag = ($('#imp-tag') && $('#imp-tag').value.trim()) || IMP.tag || '';
  let rows = IMP.rows.filter(r => !LIB.has(norm(r.w)));
  if (!rows.length) { toast('这些词都已经在词库里了'); return; }

  if (fill && fill.checked) {
    const bar = $('#imp-bar2');
    bar.classList.remove('is-hidden');
    await ensureDict(() => { });
    if (D.isLoaded()) {
      rows = rows.map(r => {
        if (r.trans) return r;
        const hit = D.lookup(r.w);
        if (!hit) return r;
        return {
          w: r.w, phon: r.phon || hit.phon, trans: hit.trans,
          exEn: r.exEn || hit.exEn, exCn: r.exCn || hit.exCn,
          // "carrying" gets carry's entry; say so rather than quietly mislabelling it
          note: hit.lemma ? '释义取自「' + hit.lemma + '」' : '',
        };
      });
    }
    bar.classList.add('is-hidden');
  }

  const recs = rows.map(r => makeWord(r, tag));
  await S.putMany('words', recs);
  for (const r of recs) LIB.set(r.key, r);
  const stillMissing = recs.filter(r => !r.trans).length;
  closeSheet();
  toast(`导入 ${recs.length} 个词` + (stillMissing ? `，${stillMissing} 个没查到释义` : ''));
  render();
}

/* ======================================================================== */
/*  Stats                                                                   */
/* ======================================================================== */

function renderStats() {
  const c = counts();
  const d = today();
  const eod = SRS.endOfDay();

  const forecast = Array.from({ length: 14 }, () => 0);
  for (const w of LIB.values()) {
    if (w.state < 1) continue;
    const days = Math.max(0, Math.ceil((w.due - eod) / SRS.DAY));
    if (days < 14) forecast[days]++;
  }
  const fmax = Math.max(1, ...forecast);

  const weeks = 8;
  const cells = [];
  const start = Date.now() - (weeks * 7 - 1) * SRS.DAY;
  for (let i = 0; i < weeks * 7; i++) {
    const k = SRS.dayKey(start + i * SRS.DAY);
    const dd = DAYS.get(k);
    const n = dd ? dd.learned + dd.reviewed : 0;
    cells.push(n === 0 ? 0 : n < 10 ? 1 : n < 40 ? 2 : 3);
  }

  let totalSeen = 0, totalLapse = 0;
  for (const w of LIB.values()) { totalSeen += w.seen || 0; totalLapse += w.lapses || 0; }

  const tagCount = new Map();
  for (const w of LIB.values()) for (const t of w.tags || []) tagCount.set(t, (tagCount.get(t) || 0) + 1);
  const tags = [...tagCount.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10);

  view().innerHTML = `
    <div class="topbar"><h1>统计</h1></div>

    <div class="card">
      <h2>今天</h2>
      <div class="kv">
        <div><b>${d.learned}</b><span>新学</span></div>
        <div><b>${d.reviewed}</b><span>复习</span></div>
        <div><b>${d.total ? Math.round(d.correct / d.total * 100) : 0}%</b><span>正确率</span></div>
        <div><b>${streakDays()}</b><span>连续天数</span></div>
      </div>
    </div>

    <div class="card">
      <h2>未来 14 天复习量</h2>
      <div class="bars">${forecast.map(n =>
    `<div class="${n ? '' : 'zero'}" style="height:${n ? Math.max(6, n / fmax * 100) : 2}%" title="${n} 词"></div>`).join('')}</div>
      <div class="axis">${forecast.map((n, i) => `<span>${i % 3 === 0 ? (i === 0 ? '今' : i) : ''}</span>`).join('')}</div>
      <p class="small muted" style="margin:8px 0 0">今天到期 ${forecast[0]} 个。柱子越平，说明排期越健康。</p>
    </div>

    <div class="card">
      <h2>打卡 <span class="n">近 8 周</span></h2>
      <div class="cal">${cells.map(l => `<i data-l="${l}"></i>`).join('')}</div>
    </div>

    <div class="card">
      <h2>词库</h2>
      <div class="kv">
        <div><b>${c.total}</b><span>总词数</span></div>
        <div><b>${c.mastered}</b><span>已掌握</span></div>
        <div><b>${totalSeen}</b><span>累计答题</span></div>
        <div><b>${totalLapse}</b><span>累计遗忘</span></div>
      </div>
      ${tags.length ? `<div class="chips" style="margin-top:14px">
        ${tags.map(([t, n]) => `<span class="chip chip--tag">${esc(t)} ${n}</span>`).join('')}</div>` : ''}
    </div>`;
}

/* ======================================================================== */
/*  Settings                                                                */
/* ======================================================================== */

const TYPE_NAMES = {
  recall: ['自评回忆', '只给单词，自己判断记不记得，选完才看释义'],
  en2cn: ['认词义', '看英文选中文释义'],
  cn2en: ['选单词', '看中文释义选英文'],
  spell: ['拼写', '给中文释义和首字母，把单词打出来'],
  cloze: ['例句填空', '在例句里挖掉单词，把它打出来（也要拼写）'],
  listen: ['听音辨义', '朗读单词后选释义'],
};

const WEIGHTS = [[0, '不出'], [1, '很少'], [2, '正常'], [3, '较多'], [4, '很多'], [5, '最多']];

/* What the weights actually mean, as percentages, so the ratio is not guesswork. */
function typeMixText() {
  const rows = Object.keys(TYPE_NAMES)
    .map(k => [k, Math.max(0, Number(SET.types[k]) || 0)])
    .filter(([, v]) => v > 0);
  const total = rows.reduce((a, [, v]) => a + v, 0);
  if (!total) return '所有题型都关了，会一律使用自评回忆卡。';
  return '大致比例：' + rows
    .sort((a, b) => b[1] - a[1])
    .map(([k, v]) => TYPE_NAMES[k][0] + ' ' + Math.round(v / total * 100) + '%')
    .join(' · ') + '。词条缺例句或释义时会自动跳过对应题型。';
}

function renderSettings() {
  view().innerHTML = `
    <div class="topbar"><h1>设置</h1></div>

    <div class="card">
      <h2>每日计划</h2>
      <label class="switch"><span class="switch__label"><b>每日新词</b>
        <span class="small muted">每天最多学多少个没见过的词</span></span>
        <input type="number" min="0" max="200" value="${SET.newPerDay}" data-set="newPerDay"></label>
      <label class="switch"><span class="switch__label"><b>每日复习上限</b>
        <span class="small muted">到期词太多时先做这么多</span></span>
        <input type="number" min="10" max="999" value="${SET.reviewCap}" data-set="reviewCap"></label>
      <label class="switch"><span class="switch__label"><b>掌握阈值</b>
        <span class="small muted">复习间隔超过这个天数就算已掌握</span></span>
        <input type="number" min="14" max="365" value="${SET.masterDays}" data-set="masterDays"></label>
    </div>

    <div class="card">
      <h2>题型比例</h2>
      <p class="small muted" style="margin:-4px 0 10px">选「不出」就完全不会出现这种题。</p>
      ${Object.keys(TYPE_NAMES).map(k => `
        <label class="switch"><span class="switch__label"><b>${TYPE_NAMES[k][0]}</b>
          <span class="small muted">${TYPE_NAMES[k][1]}</span></span>
          <select data-type="${k}">${WEIGHTS.map(([v, n]) =>
      `<option value="${v}" ${Number(SET.types[k]) === v ? 'selected' : ''}>${n}</option>`).join('')}
          </select></label>`).join('')}
      <p class="small muted" id="type-mix" style="margin:12px 0 0">${typeMixText()}</p>
    </div>

    <div class="card">
      <h2>学习方式</h2>
      <label class="switch"><span class="switch__label"><b>出词顺序</b>
        <span class="small muted">新词按词库顺序取，还是每轮随机打乱</span></span>
        <select data-set="order">
          <option value="seq" ${SET.order === 'seq' ? 'selected' : ''}>按顺序</option>
          <option value="random" ${SET.order === 'random' ? 'selected' : ''}>随机打乱</option>
        </select></label>
      <label class="switch"><span class="switch__label"><b>抽查只用自评卡</b>
        <span class="small muted">抽查时不给选项，只看单词自己判断</span></span>
        <input type="checkbox" data-set="spotRecall" ${SET.spotRecall ? 'checked' : ''}></label>
      <label class="switch"><span class="switch__label"><b>答错当场重来</b>
        <span class="small muted">忘掉的词在本轮内再出现一次</span></span>
        <input type="checkbox" data-set="relearnInSession" ${SET.relearnInSession ? 'checked' : ''}></label>
    </div>

    <div class="card">
      <h2>朗读与外观</h2>
      <label class="switch"><span class="switch__label"><b>自动发音</b>
        <span class="small muted">出题时自动朗读单词</span></span>
        <input type="checkbox" data-set="autoSpeak" ${SET.autoSpeak ? 'checked' : ''}></label>
      <label class="switch"><span class="switch__label"><b>口音</b></span>
        <select data-set="accent">
          <option value="en-US" ${SET.accent === 'en-US' ? 'selected' : ''}>美音</option>
          <option value="en-GB" ${SET.accent === 'en-GB' ? 'selected' : ''}>英音</option>
        </select></label>
      <label class="switch"><span class="switch__label"><b>发音来源</b>
        <span class="small muted">在线 = 有道词典真人录音，需联网；系统 = 手机自带朗读，离线可用，但很多国产手机没有英文语音</span></span>
        <select data-set="voiceSource">
          <option value="auto" ${(SET.voiceSource || 'auto') === 'auto' ? 'selected' : ''}>自动</option>
          <option value="online" ${SET.voiceSource === 'online' ? 'selected' : ''}>只用在线</option>
          <option value="system" ${SET.voiceSource === 'system' ? 'selected' : ''}>只用系统</option>
        </select></label>
      <div class="switch"><span class="switch__label"><b>试听</b>
        <span class="small muted">没声音时先点这里，会告诉你是哪一路出了问题</span></span>
        <button class="btn btn--sm" type="button" data-act="test-voice">试听</button></div>
      <label class="switch"><span class="switch__label"><b>主题</b></span>
        <select data-set="theme">
          <option value="auto" ${SET.theme === 'auto' ? 'selected' : ''}>跟随系统</option>
          <option value="light" ${SET.theme === 'light' ? 'selected' : ''}>浅色</option>
          <option value="dark" ${SET.theme === 'dark' ? 'selected' : ''}>深色</option>
        </select></label>
    </div>

    <div class="card">
      <h2>数据</h2>
      <p class="small muted" style="margin:-4px 0 12px">
        所有数据只存在这台设备的浏览器里，不上传任何服务器。换手机或清缓存前记得导出备份。</p>
      <div class="row row--wrap">
        <button class="btn btn--sm" data-act="export-json">导出备份</button>
        <button class="btn btn--sm" data-act="import-json">恢复备份</button>
        <button class="btn btn--sm" data-act="export-csv">导出 CSV</button>
        <button class="btn btn--sm btn--danger" data-act="wipe">清空词库</button>
      </div>
      <input id="restore-file" type="file" accept="application/json,.json" hidden>
    </div>

    <div class="card">
      <h2>关于</h2>
      <p class="small muted">Wordbank · 离线单词本。安装到手机主屏后可完全离线使用。</p>
      <div class="row row--wrap" style="margin-top:10px">
        ${installPrompt ? '<button class="btn btn--sm btn--primary" data-act="install">安装到主屏幕</button>' : ''}
        <a class="btn btn--sm" href="../../">返回站点</a>
      </div>
      <p class="small faint" style="margin-top:12px">
        复习排期用 SM-2 间隔重复算法，前五次成功复习走 1 / 2 / 4 / 7 / 15 天的固定阶梯，
        之后按每个词自己的熟练度系数递增；答错则难度下调并当场重学。
      </p>
    </div>`;
}

async function applySetting(el) {
  const k = el.dataset.set;
  let v;
  if (el.type === 'checkbox') v = el.checked;
  else if (el.type === 'number') v = Math.max(0, parseInt(el.value, 10) || 0);
  else v = el.value;
  SET = await S.saveSettings({ [k]: v });
  if (k === 'theme') applyTheme();
}

function applyTheme() {
  const root = document.documentElement;
  if (SET.theme === 'auto') root.removeAttribute('data-theme');
  else root.setAttribute('data-theme', SET.theme);
  const dark = SET.theme === 'dark' || (SET.theme === 'auto' && matchMedia('(prefers-color-scheme: dark)').matches);
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.content = dark ? '#16161f' : '#f7f6f3';
}

/* ---- backup ------------------------------------------------------------ */

function exportJSON() {
  download('wordbank-' + SRS.dayKey() + '.json', JSON.stringify({
    app: 'wordbank', v: 1, exported: Date.now(),
    settings: SET, words: [...LIB.values()], days: [...DAYS.values()],
  }));
  toast('备份已导出');
}

async function restoreJSON(file) {
  try {
    const data = JSON.parse(await readTextFile(file));
    if (!data || !Array.isArray(data.words)) throw new Error('不是 Wordbank 备份文件');
    let added = 0, merged = 0;
    const recs = [];
    for (const w of data.words) {
      if (!w || !w.key) continue;
      const cur = LIB.get(w.key);
      // On a conflict keep whichever copy has been studied further.
      if (!cur) { recs.push(w); added++; }
      else if ((w.reps || 0) + (w.seen || 0) > (cur.reps || 0) + (cur.seen || 0)) { recs.push(w); merged++; }
    }
    await S.putMany('words', recs);
    for (const w of recs) LIB.set(w.key, w);
    if (Array.isArray(data.days)) {
      await S.putMany('days', data.days);
      for (const d of data.days) {
        const cur = DAYS.get(d.date);
        if (!cur || (d.learned + d.reviewed) > (cur.learned + cur.reviewed)) DAYS.set(d.date, d);
      }
    }
    if (data.settings) { SET = await S.saveSettings(data.settings); applyTheme(); }
    toast(`恢复完成：新增 ${added}，更新 ${merged}`);
    render();
  } catch (e) {
    toast(e.message || '备份文件读不了');
  }
}

/* ======================================================================== */
/*  Sheet + routing                                                         */
/* ======================================================================== */

function sheet(html) {
  const bg = $('#sheet-bg'), sh = $('#sheet');
  sh.innerHTML = '<div class="sheet__grip"></div>' + html;
  bg.classList.remove('is-hidden');
  sh.classList.remove('is-hidden');
  requestAnimationFrame(() => { bg.classList.add('on'); sh.classList.add('on'); });
}
function closeSheet() {
  const bg = $('#sheet-bg'), sh = $('#sheet');
  bg.classList.remove('on'); sh.classList.remove('on');
  setTimeout(() => { bg.classList.add('is-hidden'); sh.classList.add('is-hidden'); sh.innerHTML = ''; }, 260);
}

function render() {
  if (tab === 'study') renderStudy();
  else if (tab === 'library') renderLibrary();
  else if (tab === 'stats') renderStats();
  else renderSettings();
  document.querySelectorAll('.tabbar button').forEach(b =>
    b.setAttribute('aria-selected', String(b.dataset.tab === tab)));
  view().scrollTop = 0;
}

function go(next) { tab = next; render(); }

/* ---- one delegated click handler for the whole app --------------------- */

document.addEventListener('click', async ev => {
  const t = ev.target.closest('[data-act],[data-tab],[data-say],[data-opt],[data-filter],[data-imp],[data-key],[data-star],.wli');
  if (!t) return;

  if (t.dataset.say !== undefined) { speak(t.dataset.say); return; }
  if (t.dataset.tab) { go(t.dataset.tab); return; }

  if (t.dataset.star !== undefined) {
    ev.stopPropagation();
    const w = LIB.get(t.dataset.star);
    w.starred = w.starred ? 0 : 1;
    await saveWord(w);
    t.classList.toggle('on', !!w.starred);
    t.textContent = w.starred ? '★' : '☆';
    return;
  }

  if (t.dataset.filter) { LIBQ.filter = t.dataset.filter; LIBQ.limit = 200; renderLibrary(); return; }

  if (t.dataset.imp) { IMP.tab = t.dataset.imp; sheet(importHTML()); wireImport(); return; }

  if (t.dataset.opt !== undefined) {
    if (SES.answered) return;
    t.dataset.picked = '1';
    answer(t.dataset.right === '1');
    return;
  }

  if (t.classList.contains('wli')) { openWord(t.dataset.key); return; }

  const act = t.dataset.act;
  const key = t.dataset.key;
  switch (act) {
    case 'start': startSession({}); break;
    case 'spot': startSession({ spot: true }); break;
    case 'spot-star': startSession({ spot: true, starred: true }); break;
    case 'again': startSession({}); break;
    case 'close': endSession(); break;
    case 'next': nextCard(); break;
    case 'check': checkSpell(); break;
    case 'more': LIBQ.limit += 300; renderLibrary(); break;
    case 'import': openImport(); break;
    case 'add': editWord(null); break;
    case 'edit': editWord(key); break;
    case 'save-word': saveEdit(key || null); break;

    case 'test-voice': {
      voiceWarned = false;               // a deliberate test should always report back
      const got = await speak('pronunciation');
      if (got === 'online') toast('✓ 在线发音可用（有道真人录音）');
      else if (got === 'system') toast('✓ 系统朗读可用');
      break;
    }
    case 'relearn': {
      // Read the gloss, realised you did not actually know it.
      const w = LIB.get(SES.queue[SES.i]);
      SRS.grade(w, 0, Date.now(), SET.masterDays);
      await saveWord(w);
      if (SET.relearnInSession) requeue();
      toast('已改为「不认识」，本轮稍后再来一次');
      t.remove();
      break;
    }
    case 'vague': {
      // Downgrade a self-reported shaky "correct" answer.
      const w = LIB.get(SES.queue[SES.i]);
      SRS.grade(w, 3, Date.now(), SET.masterDays);
      await saveWord(w);
      toast('已按「模糊」重排：' + SRS.ivlLabel(w.ivl) + '后');
      t.remove();
      break;
    }
    case 'reset': {
      const w = LIB.get(key);
      Object.assign(w, SRS.newCard({}), { key: w.key, w: w.w, phon: w.phon, trans: w.trans, exEn: w.exEn, exCn: w.exCn, note: w.note, tags: w.tags, added: w.added, starred: w.starred });
      await saveWord(w);
      closeSheet(); toast('已重置'); render();
      break;
    }
    case 'del': {
      if (!confirm('从词库删除「' + LIB.get(key).w + '」？')) break;
      LIB.delete(key);
      await S.del('words', key);
      closeSheet(); toast('已删除'); render();
      break;
    }
    case 'fill': {
      await ensureDict(async () => {
        const w = LIB.get(key);
        const hit = D.lookup(w.w);
        if (!hit) { toast('词典里没有这个词'); return; }
        w.phon = w.phon || hit.phon;
        w.trans = w.trans || hit.trans;
        w.exEn = w.exEn || hit.exEn;
        w.exCn = w.exCn || hit.exCn;
        if (hit.lemma && !w.note) w.note = '释义取自「' + hit.lemma + '」';
        await saveWord(w);
        openWord(key);
        toast('已补全');
      });
      break;
    }
    case 'lookup-one': {
      await ensureDict(() => {
        const hit = D.lookup($('#e-w').value);
        if (!hit) { toast('词典里没有这个词'); return; }
        $('#e-phon').value = hit.phon;
        $('#e-trans').value = hit.trans;
        $('#e-exen').value = hit.exEn;
        $('#e-excn').value = hit.exCn;
        toast(hit.lemma ? '按原形「' + hit.lemma + '」填充' : '已填充');
      });
      break;
    }

    case 'imp-parse': {
      const r = P.parse($('#imp-text').value, $('#imp-mode').value);
      if (!r.rows.length) { toast('没解析出词条，换一种解析方式试试'); return; }
      showPreview(r.rows, r.note);
      break;
    }
    case 'imp-load-dict':
      await ensureDict(() => { sheet(importHTML()); wireImport(); });
      break;
    case 'imp-book': {
      const bk = $('#imp-book').value;
      const from = Math.max(1, parseInt($('#imp-from').value, 10) || 1) - 1;
      const toN = parseInt($('#imp-to').value, 10);
      const rows = D.bookWords(bk, from, toN ? toN : Infinity);
      IMP.tag = (D.books().find(b => b.key === bk) || {}).name || '';
      showPreview(rows, `${IMP.tag} 第 ${from + 1}–${from + rows.length} 个`);
      break;
    }
    case 'imp-commit': await commitImport(); break;

    case 'export-json': exportJSON(); break;
    case 'export-csv':
      download('wordbank-' + SRS.dayKey() + '.csv', P.toCSV([...LIB.values()]), 'text/csv;charset=utf-8');
      toast('CSV 已导出');
      break;
    case 'import-json': $('#restore-file').click(); break;
    case 'wipe':
      if (!confirm('清空全部 ' + LIB.size + ' 个单词和学习进度？这一步不可撤销。')) break;
      if (!confirm('真的确定？建议先导出备份。')) break;
      await S.clear('words'); await S.clear('days');
      LIB.clear(); DAYS.clear();
      toast('已清空'); render();
      break;
    case 'install':
      if (installPrompt) { installPrompt.prompt(); installPrompt = null; }
      break;
    default: break;
  }
});

document.addEventListener('change', ev => {
  const el = ev.target;
  if (el.dataset && el.dataset.set) applySetting(el);
  else if (el.dataset && el.dataset.type) {
    const next = Object.assign({}, SET.types, { [el.dataset.type]: Number(el.value) || 0 });
    SET = Object.assign({}, SET, { types: next });      // update before the await, so
    const mix = $('#type-mix');                          // fast successive edits compound
    if (mix) mix.textContent = typeMixText();
    S.saveSettings({ types: next }).then(s => { SET = s; });
  } else if (el.id === 'restore-file' && el.files && el.files[0]) {
    restoreJSON(el.files[0]);
    el.value = '';
  }
});

document.addEventListener('keydown', ev => {
  if (!SES.on) return;
  if (ev.key === 'Escape') { endSession(); return; }
  if (ev.key === 'ArrowLeft' && !/^(INPUT|TEXTAREA|SELECT)$/.test((ev.target || {}).tagName || '')) {
    goBack();
    return;
  }
  if (ev.key === 'Enter' && SES.answered) { nextCard(); return; }
  if (!SES.answered && /^[1-4]$/.test(ev.key)) {
    const b = document.querySelectorAll('#ses-body .opt')[+ev.key - 1];
    if (b) b.click();
  }
});

window.addEventListener('beforeinstallprompt', e => {
  e.preventDefault();
  installPrompt = e;
  if (tab === 'settings') render();
});

if ('speechSynthesis' in window) {
  loadVoices();
  speechSynthesis.onvoiceschanged = loadVoices;
}
document.addEventListener('pointerdown', unlockAudio, true);

/* ---- boot -------------------------------------------------------------- */

async function boot() {
  SET = await S.loadSettings();
  applyTheme();
  matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    if (SET.theme === 'auto') applyTheme();
  });

  for (const w of await S.all('words')) LIB.set(w.key, w);
  for (const d of await S.all('days')) DAYS.set(d.date, d);

  $('#boot').remove();
  render();

  const q = new URLSearchParams(location.search).get('go');
  if (q === 'import') openImport();
  else if (q === 'study' && (dueList().length || newList().length)) startSession({});

  // Grading buttons on the new-word card live in the session footer.
  $('#ses-foot').addEventListener('click', async ev => {
    const b = ev.target.closest('[data-grade]');
    if (!b || SES.answered) return;
    SES.answered = true;
    const w = LIB.get(SES.queue[SES.i]);
    beginAnswer(w);
    const g = b.dataset.grade;
    const d = today();
    const wasNew = w.state === SRS.STATE.NEW;

    if (g === 'known') {
      w.state = SRS.STATE.MASTERED;
      w.reps = SRS.LADDER.length + 1;
      w.ivl = SET.masterDays;
      w.due = Date.now() + SET.masterDays * SRS.DAY;
      w.last = Date.now();
      w.seen = (w.seen || 0) + 1;
    } else if (SES.spot && +g >= 3) {
      // Spot check: answering early proves nothing new, so leave the schedule be
      w.seen = (w.seen || 0) + 1;
      w.last = Date.now();
    } else {
      SRS.grade(w, +g, Date.now(), SET.masterDays);
    }
    await saveWord(w);

    if (wasNew) d.learned++; else d.reviewed++;
    if (!wasNew) {                       // a recall card is a real test; the intro card is not
      d.total++;
      if (+g >= 3) d.correct++;
      SES.seen++;
      if (+g >= 3) SES.right++; else SES.wrong++;
    }
    saveDay(d);

    if (g === '0' && SET.relearnInSession) requeue();
    showLearnReveal(w, g);
  });

  $('#ses-close').addEventListener('click', endSession);
  $('#ses-back').addEventListener('click', goBack);
  $('#sheet-bg').addEventListener('click', closeSheet);

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js').catch(() => { });
  }
}

boot();
