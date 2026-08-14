/* Spaced-repetition review over the Sindarin dictionary.

   Shares its store with Barad Bith: same localStorage key, same
   "<form>|<part>" primary key. The game writes { attempts, correct, stars };
   we add { due, interval, ease, reps } alongside and never touch its fields,
   so a word unlocked in the tower counts as seen here and vice versa. */
(function () {
  var root = document.getElementById('srs');
  if (!root) return;

  var DICT_URL = '/laim/sindarin.assets/SindarinDatabase/dictionary.json';
  var MASTERY_KEY = 'baradBithMastery';   // identical to BaradBithScript.js
  var DAY = 86400000;

  var dict = [];
  var mastery = load();
  var queue = [];
  var pos = 0;
  var direction = 's2c';

  function load() {
    try { return JSON.parse(localStorage.getItem(MASTERY_KEY)) || {}; }
    catch (e) { return {}; }
  }
  function save() {
    try { localStorage.setItem(MASTERY_KEY, JSON.stringify(mastery)); }
    catch (e) { /* quota or private mode — reviewing still works this session */ }
  }

  function keyOf(entry) {
    return String(entry.dict_form) + '|' + String(entry.part || '');
  }

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function today() {
    var d = new Date();
    return Date.UTC(d.getFullYear(), d.getMonth(), d.getDate());
  }

  // ---- SM-2 ---------------------------------------------------------------
  function schedule(rec, q) {
    if (rec.ease == null) rec.ease = 2.5;
    if (rec.reps == null) rec.reps = 0;
    if (rec.interval == null) rec.interval = 0;

    if (q < 3) {
      rec.reps = 0;
      rec.interval = 0;            // relearn today
    } else {
      rec.reps += 1;
      if (rec.reps === 1) rec.interval = 1;
      else if (rec.reps === 2) rec.interval = 6;
      else rec.interval = Math.round(rec.interval * rec.ease);
    }

    rec.ease = rec.ease + 0.1 - (5 - q) * (0.08 + (5 - q) * 0.02);
    if (rec.ease < 1.3) rec.ease = 1.3;

    rec.due = today() + rec.interval * DAY;
    return rec;
  }

  // ---- Deck building ------------------------------------------------------
  function usable(e) {
    // Skip affixes and entries with no Chinese gloss — nothing to test on.
    if (!e || !e.dict_form) return false;
    if (String(e.part || '').toLowerCase() === 'affix') return false;
    return !!(e.definition && String(e.definition).trim());
  }

  function buildQueue(size) {
    var now = today();
    var due = [], fresh = [];

    for (var i = 0; i < dict.length; i++) {
      var e = dict[i];
      if (!usable(e)) continue;
      var rec = mastery[keyOf(e)];
      if (!rec || rec.due == null) fresh.push(e);
      else if (rec.due <= now) due.push(e);
    }

    // Most-overdue first.
    due.sort(function (a, b) {
      return (mastery[keyOf(a)].due || 0) - (mastery[keyOf(b)].due || 0);
    });
    shuffle(fresh);

    if (!size) return due.concat(fresh.slice(0, Math.ceil(due.length / 2) || 10));

    var freshQuota = Math.max(1, Math.floor(size / 3));
    var out = due.slice(0, size - Math.min(freshQuota, fresh.length));
    out = out.concat(fresh.slice(0, size - out.length));
    shuffle(out);
    return out;
  }

  function shuffle(a) {
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  // ---- Stats --------------------------------------------------------------
  var statsEl = document.getElementById('srs-stats');

  function renderStats() {
    var now = today();
    var total = 0, seen = 0, dueCount = 0, mastered = 0;
    for (var i = 0; i < dict.length; i++) {
      if (!usable(dict[i])) continue;
      total++;
      var rec = mastery[keyOf(dict[i])];
      if (!rec) continue;
      seen++;
      if (rec.due != null && rec.due <= now) dueCount++;
      if ((rec.interval || 0) >= 21) mastered++;
    }
    statsEl.innerHTML =
      '<span><strong>' + total + '</strong> 可复习词条</span>' +
      '<span><strong>' + seen + '</strong> 已接触</span>' +
      '<span><strong>' + dueCount + '</strong> 今日到期</span>' +
      '<span><strong>' + mastered + '</strong> 已长期记忆（间隔 ≥21 天）</span>';
  }

  // ---- Session ------------------------------------------------------------
  var setupEl = document.getElementById('srs-setup');
  var cardEl = document.getElementById('srs-card');
  var doneEl = document.getElementById('srs-done');
  var promptEl = document.getElementById('srs-prompt');
  var answerEl = document.getElementById('srs-answer');
  var gradesEl = document.getElementById('srs-grades');
  var actionsEl = document.getElementById('srs-actions');
  var progressEl = document.getElementById('srs-progress');
  var showBtn = document.getElementById('srs-show');

  function start() {
    direction = (root.querySelector('input[name="srs-dir"]:checked') || {}).value || 's2c';
    var size = parseInt(document.getElementById('srs-size').value, 10);
    queue = buildQueue(size);
    pos = 0;

    if (!queue.length) {
      doneEl.innerHTML = '<p>今天没有到期的词，也没有新词可以排。明天再来，或者去'
        + '<a href="/laim/sindarin.assets/BaradBith/BaradBith.html">爬塔</a>解锁一些新词条。</p>';
      doneEl.classList.remove('is-hidden');
      return;
    }
    setupEl.classList.add('is-hidden');
    doneEl.classList.add('is-hidden');
    cardEl.classList.remove('is-hidden');
    showCard();
  }

  function showCard() {
    var e = queue[pos];
    progressEl.textContent = (pos + 1) + ' / ' + queue.length;

    var front = direction === 's2c'
      ? '<span class="srs__word">' + esc(e.dict_form) + '</span>'
        + '<span class="srs__part">' + esc(e.part || '') + '</span>'
      : '<span class="srs__word">' + esc(e.definition) + '</span>'
        + '<span class="srs__part">' + esc(e.part || '') + '</span>';

    promptEl.innerHTML = front;

    var backParts = [];
    if (direction === 's2c') {
      backParts.push('<p class="srs__gloss">' + esc(e.definition) + '</p>');
      if (e.english) backParts.push('<p class="srs__en">' + esc(e.english) + '</p>');
    } else {
      backParts.push('<p class="srs__gloss">' + esc(e.dict_form) + '</p>');
      if (e.english) backParts.push('<p class="srs__en">' + esc(e.english) + '</p>');
    }
    if (e.sentence && String(e.sentence).trim()) {
      backParts.push('<pre class="srs__sentence">' + esc(String(e.sentence).trim()) + '</pre>');
    }
    if (e.other && String(e.other).trim()) {
      backParts.push('<p class="srs__other">' + esc(String(e.other).trim()) + '</p>');
    }
    answerEl.innerHTML = backParts.join('');

    answerEl.classList.add('is-hidden');
    gradesEl.classList.add('is-hidden');
    actionsEl.classList.remove('is-hidden');
  }

  function reveal() {
    answerEl.classList.remove('is-hidden');
    gradesEl.classList.remove('is-hidden');
    actionsEl.classList.add('is-hidden');
  }

  function grade(q) {
    var e = queue[pos];
    var k = keyOf(e);
    // Preserve whatever Barad Bith already stored under this key.
    var rec = mastery[k] || { attempts: 0, correct: 0 };
    rec.attempts = (rec.attempts || 0) + 1;
    if (q >= 3) rec.correct = (rec.correct || 0) + 1;
    schedule(rec, q);
    mastery[k] = rec;
    save();

    if (q < 3) queue.push(e);   // relearn before the session ends

    pos++;
    if (pos >= queue.length) return finish();
    showCard();
  }

  function finish() {
    cardEl.classList.add('is-hidden');
    setupEl.classList.remove('is-hidden');
    doneEl.classList.remove('is-hidden');
    doneEl.innerHTML = '<p>本轮结束，复习了 <strong>' + queue.length + '</strong> 张卡。</p>';
    renderStats();
  }

  showBtn.addEventListener('click', reveal);
  gradesEl.addEventListener('click', function (e) {
    var btn = e.target.closest('button[data-q]');
    if (btn) grade(parseInt(btn.getAttribute('data-q'), 10));
  });
  document.getElementById('srs-start').addEventListener('click', start);

  document.addEventListener('keydown', function (e) {
    if (cardEl.classList.contains('is-hidden')) return;
    if (e.key === ' ' || e.key === 'Enter') {
      if (!answerEl.classList.contains('is-hidden')) return;
      e.preventDefault(); reveal();
    } else if (/^[1-4]$/.test(e.key) && !gradesEl.classList.contains('is-hidden')) {
      e.preventDefault();
      grade([0, 3, 4, 5][+e.key - 1]);
    }
  });

  // ---- Import / export ----------------------------------------------------
  var msg = document.getElementById('srs-manage-msg');
  document.getElementById('srs-export').addEventListener('click', function () {
    var blob = new Blob([JSON.stringify(mastery, null, 2)], { type: 'application/json' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'sindarin-mastery.json';
    a.click();
    URL.revokeObjectURL(a.href);
    msg.textContent = '已导出。';
  });

  var fileEl = document.getElementById('srs-import-file');
  document.getElementById('srs-import').addEventListener('click', function () { fileEl.click(); });
  fileEl.addEventListener('change', function () {
    var f = fileEl.files && fileEl.files[0];
    if (!f) return;
    var reader = new FileReader();
    reader.onload = function () {
      try {
        var incoming = JSON.parse(reader.result);
        if (!incoming || typeof incoming !== 'object') throw new Error('bad shape');
        // Merge rather than replace, so a stale export cannot wipe the tower's
        // unlock history.
        var added = 0;
        Object.keys(incoming).forEach(function (k) {
          var cur = mastery[k] || {};
          var inc = incoming[k] || {};
          mastery[k] = {
            attempts: Math.max(cur.attempts || 0, inc.attempts || 0),
            correct: Math.max(cur.correct || 0, inc.correct || 0),
            stars: Math.max(cur.stars || 0, inc.stars || 0),
            ease: inc.ease != null ? inc.ease : cur.ease,
            interval: Math.max(cur.interval || 0, inc.interval || 0),
            reps: Math.max(cur.reps || 0, inc.reps || 0),
            due: inc.due != null ? inc.due : cur.due
          };
          added++;
        });
        save();
        renderStats();
        msg.textContent = '已合并 ' + added + ' 条记录。';
      } catch (err) {
        msg.textContent = '导入失败：文件不是有效的存档 JSON。';
      }
    };
    reader.readAsText(f);
  });

  // ---- Boot ---------------------------------------------------------------
  fetch(DICT_URL, { cache: 'force-cache' })
    .then(function (r) { return r.ok ? r.json() : []; })
    .then(function (rows) {
      dict = Array.isArray(rows) ? rows : [];
      renderStats();
    })
    .catch(function () {
      statsEl.textContent = '词典加载失败。';
    });
})();
