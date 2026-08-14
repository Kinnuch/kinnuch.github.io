/* Minimal-pair listening drill.

   Only phonemes that have an ISOLATED recording go into the drill — the
   `*man.mp3` files are readings of example words, so training on them would
   test word recognition, not the vowel. Add a row to PHONEMES (with an
   `isolated` path) and the pair table below picks it up automatically. */
(function () {
  var root = document.getElementById('drill');
  if (!root) return;

  var BASE = '/laim/sindarin.assets/';

  var PHONEMES = {
    a:  { label: 'a',  ipa: 'ɑ',  isolated: BASE + 'Amanwoman.mp3', words: BASE + 'Aman.mp3' },
    e:  { label: 'e',  ipa: 'ɛ',  isolated: BASE + 'Emanwoman.mp3', words: BASE + 'Eman.mp3' },
    i:  { label: 'i',  ipa: 'i',  isolated: BASE + 'Imanwoman.mp3', words: BASE + 'Iman.mp3' },
    o:  { label: 'o',  ipa: 'ɔ',  isolated: BASE + 'Omanwoman.mp3', words: BASE + 'Oman.mp3' },
    u:  { label: 'u',  ipa: 'u',  isolated: BASE + 'Umanwoman.mp3', words: BASE + 'Uman.mp3' },
    y:  { label: 'y',  ipa: 'y',  isolated: BASE + 'Ymanwoman.mp3', words: BASE + 'Yman.mp3' },
    ae: { label: 'ae', ipa: 'ɑɛ', isolated: BASE + 'AE.mp3',        words: BASE + 'AEman.mp3' },
    aw: { label: 'aw', ipa: 'ɑu', isolated: BASE + 'AW.mp3',        words: BASE + 'AWman.mp3' },
    oe: { label: 'oe', ipa: 'ɔɛ', isolated: BASE + 'OE.mp3',        words: BASE + 'OEman.mp3' }
  };

  var PAIRS = [
    { a: 'i', b: 'y', why: '唯一区别是圆唇。教程明确说这两个构成不圆唇 / 圆唇对立，是最容易混的一组。' },
    { a: 'u', b: 'y', why: '都是圆唇，区别在舌位前后。' },
    { a: 'e', b: 'i', why: '前元音的开口度对立。' },
    { a: 'a', b: 'e', why: '开口度对立，e 不是汉语的 e。' },
    { a: 'o', b: 'u', why: '后圆唇元音的开口度对立。' },
    { a: 'a', b: 'o', why: '前后对立，注意辛达语的 a 稍稍靠后。' },
    { a: 'ae', b: 'aw', why: '两个降调双元音，收尾口型不同。' },
    { a: 'ae', b: 'oe', why: '起点不同，收尾都在 e 的口型。' }
  ];

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  var setupEl = document.getElementById('drill-setup');
  var pairsEl = document.getElementById('drill-pairs');
  var runEl = document.getElementById('drill-run');
  var scoreEl = document.getElementById('drill-score');
  var playBtn = document.getElementById('drill-play');
  var choicesEl = document.getElementById('drill-choices');
  var feedbackEl = document.getElementById('drill-feedback');

  var audio = new Audio();
  var pair = null, target = null, right = 0, total = 0, answered = false;

  function renderPairs() {
    var html = '';
    for (var i = 0; i < PAIRS.length; i++) {
      var p = PAIRS[i];
      if (!PHONEMES[p.a] || !PHONEMES[p.b]) continue;
      html += '<button class="drill-pair" data-pair="' + i + '">'
            + '<span class="drill-pair__letters">' + esc(PHONEMES[p.a].label)
            + ' <em>vs</em> ' + esc(PHONEMES[p.b].label) + '</span>'
            + '<span class="drill-pair__ipa">[' + esc(PHONEMES[p.a].ipa) + '] / ['
            + esc(PHONEMES[p.b].ipa) + ']</span>'
            + '<span class="drill-pair__why">' + esc(p.why) + '</span>'
            + '</button>';
    }
    pairsEl.innerHTML = html;
  }

  function start(idx) {
    pair = PAIRS[idx];
    right = 0; total = 0;
    setupEl.classList.add('is-hidden');
    runEl.classList.remove('is-hidden');
    next();
  }

  function next() {
    answered = false;
    target = Math.random() < 0.5 ? pair.a : pair.b;
    feedbackEl.innerHTML = '';
    feedbackEl.className = 'drill__feedback';

    choicesEl.innerHTML = [pair.a, pair.b].map(function (k) {
      return '<button class="drill-choice" data-key="' + esc(k) + '">'
           + '<span class="drill-choice__letter">' + esc(PHONEMES[k].label) + '</span>'
           + '<span class="drill-choice__ipa">[' + esc(PHONEMES[k].ipa) + ']</span>'
           + '</button>';
    }).join('');

    updateScore();
    play();
  }

  function play() {
    if (!target) return;
    audio.src = PHONEMES[target].isolated;
    audio.currentTime = 0;
    var p = audio.play();
    if (p && p.catch) p.catch(function () { /* autoplay blocked — user taps ▶ */ });
  }

  function updateScore() {
    scoreEl.textContent = total ? ('正确 ' + right + ' / ' + total
      + '（' + Math.round(right / total * 100) + '%）') : '开始吧';
  }

  function answer(key) {
    if (answered) return;
    answered = true;
    total++;
    var ok = key === target;
    if (ok) right++;

    choicesEl.querySelectorAll('.drill-choice').forEach(function (b) {
      var k = b.getAttribute('data-key');
      if (k === target) b.classList.add('is-correct');
      else if (k === key) b.classList.add('is-wrong');
      b.disabled = true;
    });

    var other = target === pair.a ? pair.b : pair.a;
    feedbackEl.className = 'drill__feedback ' + (ok ? 'is-right' : 'is-wrong');
    feedbackEl.innerHTML =
      '<p>' + (ok ? '对了' : '不对')
      + '，刚才是 <strong>' + esc(PHONEMES[target].label) + '</strong> ['
      + esc(PHONEMES[target].ipa) + ']。</p>'
      + '<p class="drill__compare">对比着再听一遍：'
      + '<button class="drill__mini" data-src="' + esc(PHONEMES[target].isolated) + '">'
      + esc(PHONEMES[target].label) + '</button>'
      + '<button class="drill__mini" data-src="' + esc(PHONEMES[other].isolated) + '">'
      + esc(PHONEMES[other].label) + '</button>'
      + '</p>'
      + '<p class="drill__words">词例：'
      + '<button class="drill__mini" data-src="' + esc(PHONEMES[target].words) + '">'
      + esc(PHONEMES[target].label) + ' 的例词</button></p>'
      + '<button class="drill__next" id="drill-next">下一题</button>';

    updateScore();
  }

  // Wrong answers replay both sounds automatically — that contrast is the
  // whole point of a minimal-pair drill.
  function autoCompare(other) {
    audio.src = PHONEMES[target].isolated;
    audio.play().catch(function () {});
    audio.onended = function () {
      audio.onended = null;
      audio.src = PHONEMES[other].isolated;
      audio.play().catch(function () {});
    };
  }

  pairsEl.addEventListener('click', function (e) {
    var btn = e.target.closest('.drill-pair');
    if (btn) start(parseInt(btn.getAttribute('data-pair'), 10));
  });

  choicesEl.addEventListener('click', function (e) {
    var btn = e.target.closest('.drill-choice');
    if (!btn || btn.disabled) return;
    var key = btn.getAttribute('data-key');
    answer(key);
    if (key !== target) autoCompare(key);
  });

  feedbackEl.addEventListener('click', function (e) {
    var mini = e.target.closest('.drill__mini');
    if (mini) {
      audio.onended = null;
      audio.src = mini.getAttribute('data-src');
      audio.play().catch(function () {});
      return;
    }
    if (e.target.closest('#drill-next')) next();
  });

  playBtn.addEventListener('click', function () { audio.onended = null; play(); });

  document.getElementById('drill-quit').addEventListener('click', function () {
    runEl.classList.add('is-hidden');
    setupEl.classList.remove('is-hidden');
  });

  renderPairs();
})();
