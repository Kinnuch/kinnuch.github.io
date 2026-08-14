/* Name Forger — Chinese/English name -> Sindarin.

   Two modes:
   - "sense": look each morpheme up in the real 558-entry dictionary and
     compound the hits using documented Sindarin word-formation + lenition.
   - "sound": rewrite the input to fit Sindarin's phoneme inventory and
     phonotactics. Carries no meaning; it only sounds Sindarin.

   Everything this produces is a draft. The page says so, loudly. */
(function () {
  var root = document.getElementById('forger');
  if (!root) return;

  var DICT_URL = '/laim/sindarin.assets/SindarinDatabase/dictionary.json';
  var dict = null;
  var dictLoad = null;

  function loadDict() {
    if (dictLoad) return dictLoad;
    dictLoad = fetch(DICT_URL, { cache: 'force-cache' })
      .then(function (r) { return r.ok ? r.json() : []; })
      .then(function (rows) { dict = Array.isArray(rows) ? rows : []; return dict; })
      .catch(function () { dict = []; return dict; });
    return dictLoad;
  }

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  // ---- Lenition (soft mutation) -------------------------------------------
  // Ordered longest-digraph-first so "lh"/"rh" win over bare "l"/"r".
  var LENITION = [
    ['lh', 'thl'], ['rh', 'thr'],
    ['p', 'b'], ['t', 'd'], ['c', 'g'],
    ['b', 'v'], ['d', 'dh'], ['g', ''],
    ['m', 'v'], ['s', 'h'], ['h', 'ch']
  ];

  function lenite(word) {
    var w = String(word || '');
    for (var i = 0; i < LENITION.length; i++) {
      var from = LENITION[i][0], to = LENITION[i][1];
      if (w.toLowerCase().indexOf(from) === 0) {
        return to + w.slice(from.length);
      }
    }
    return w; // vowel-initial, or an onset with no documented soft grade
  }

  // ---- Segmentation -------------------------------------------------------
  function isCJK(ch) {
    var c = ch.charCodeAt(0);
    return (c >= 0x4e00 && c <= 0x9fff) || (c >= 0x3400 && c <= 0x4dbf);
  }

  function segment(input, rows) {
    var text = String(input || '').trim();
    if (!text) return [];

    // Latin input: split on whitespace and punctuation.
    if (!/[㐀-鿿]/.test(text)) {
      return text.split(/[\s,，、/]+/).filter(Boolean);
    }

    // CJK: greedy two-character lookup, falling back to single characters.
    var out = [];
    var i = 0;
    while (i < text.length) {
      var ch = text[i];
      if (!isCJK(ch)) { i++; continue; }
      var two = text.slice(i, i + 2);
      if (two.length === 2 && isCJK(two[1]) && lookup(two, rows).length) {
        out.push(two); i += 2;
      } else {
        out.push(ch); i += 1;
      }
    }
    return out;
  }

  // ---- Dictionary lookup --------------------------------------------------
  // Ranked: exact > prefix > contains; content words beat function words.
  var PART_RANK = {
    'noun': 0, 'adjective': 1, 'adj': 1, 'verb': 2, 'affix': 3,
    'adverb': 4, 'preposition': 6, 'conjunction': 6, 'pronoun': 5, 'interjection': 6
  };

  function splitSenses(s) {
    return String(s || '').split(/[,，;；/、]+/).map(function (x) { return x.trim(); })
      .filter(Boolean);
  }

  function lookup(term, rows) {
    if (!rows || !rows.length) return [];
    var q = String(term).trim().toLowerCase();
    if (!q) return [];

    var hits = [];
    for (var i = 0; i < rows.length; i++) {
      var e = rows[i];
      var zhSenses = splitSenses(e.definition);
      var enSenses = splitSenses(e.english);
      var all = zhSenses.concat(enSenses);
      var best = -1;

      for (var j = 0; j < all.length; j++) {
        var sense = all[j].toLowerCase();
        var tier = -1;
        if (sense === q) tier = 0;
        else if (sense.indexOf(q) === 0) tier = 1;
        else if (sense.indexOf(q) !== -1) tier = 2;
        if (tier !== -1 && (best === -1 || tier < best)) best = tier;
      }
      if (best === -1) continue;

      hits.push({
        entry: e,
        tier: best,
        partRank: PART_RANK[String(e.part || '').toLowerCase()] != null
          ? PART_RANK[String(e.part || '').toLowerCase()] : 7
      });
    }

    hits.sort(function (a, b) {
      if (a.tier !== b.tier) return a.tier - b.tier;
      if (a.partRank !== b.partRank) return a.partRank - b.partRank;
      return String(a.entry.dict_form).length - String(b.entry.dict_form).length;
    });
    return hits.slice(0, 8);
  }

  // A dict_form can carry variants ("a(ar)/ah") or a leading hyphen for
  // affixes; take the first clean citation form for compounding.
  function citationForm(dictForm) {
    var f = String(dictForm || '').split('/')[0];
    f = f.replace(/\([^)]*\)/g, '');
    return f.replace(/^-+|-+$/g, '').trim();
  }

  // ---- Sense mode ---------------------------------------------------------
  var input = document.getElementById('forge-input');
  var slotsEl = document.getElementById('forge-slots');
  var resultEl = document.getElementById('forge-result');

  var chosen = {};   // segment index -> selected hit index

  function renderSlots(segs, rows) {
    if (!segs.length) { slotsEl.innerHTML = ''; resultEl.innerHTML = ''; return; }

    var html = '';
    for (var i = 0; i < segs.length; i++) {
      var hits = lookup(segs[i], rows);
      html += '<div class="forge-slot" data-seg="' + i + '">'
            + '<div class="forge-slot__term">' + esc(segs[i]) + '</div>';
      if (!hits.length) {
        html += '<p class="forge-slot__miss">词典里没有对应词条。'
              + '换一个近义的说法试试，或改用音译模式。</p>';
      } else {
        html += '<div class="forge-slot__options">';
        for (var j = 0; j < hits.length; j++) {
          var e = hits[j].entry;
          var sel = (chosen[i] == null ? 0 : chosen[i]) === j ? ' is-chosen' : '';
          html += '<button class="forge-opt' + sel + '" data-seg="' + i + '" data-hit="' + j + '">'
                + '<span class="forge-opt__form">' + esc(citationForm(e.dict_form)) + '</span>'
                + '<span class="forge-opt__part">' + esc(e.part || '') + '</span>'
                + '<span class="forge-opt__gloss">' + esc(e.definition || e.english) + '</span>'
                + '</button>';
        }
        html += '</div>';
      }
      html += '</div>';
    }
    slotsEl.innerHTML = html;

    slotsEl.querySelectorAll('.forge-opt').forEach(function (btn) {
      btn.addEventListener('click', function () {
        chosen[+btn.getAttribute('data-seg')] = +btn.getAttribute('data-hit');
        renderSlots(segs, rows);
        renderResult(segs, rows);
      });
    });
  }

  function renderResult(segs, rows) {
    var picked = [];
    for (var i = 0; i < segs.length; i++) {
      var hits = lookup(segs[i], rows);
      if (!hits.length) continue;
      var h = hits[chosen[i] == null ? 0 : chosen[i]] || hits[0];
      picked.push({ seg: segs[i], entry: h.entry, form: citationForm(h.entry.dict_form) });
    }

    if (!picked.length) { resultEl.innerHTML = ''; return; }

    if (picked.length === 1) {
      var only = picked[0];
      resultEl.innerHTML =
        '<div class="forge-out">'
        + '<p class="forge-out__label">单语素，直接取词典形：</p>'
        + '<p class="forge-out__name">' + esc(cap(only.form)) + '</p>'
        + breakdown(picked)
        + '</div>';
      return;
    }

    // Head-final: everything but the last element modifies the last one.
    var head = picked[picked.length - 1];
    var mods = picked.slice(0, picked.length - 1);
    var modPart = mods.map(function (p) { return p.form; }).join('');
    var lenited = lenite(head.form);

    var joined = cap(modPart + lenited);
    var hyphen = cap(mods.map(function (p) { return p.form; }).join('-') + '-' + lenited);
    var noMut = cap(modPart + head.form);

    resultEl.innerHTML =
      '<div class="forge-out">'
      + '<p class="forge-out__label">复合（限定成分在前，中心成分在后，中心成分软音变）：</p>'
      + '<p class="forge-out__name">' + esc(joined) + '</p>'
      + '<ul class="forge-out__variants">'
      +   '<li><strong>连字符写法</strong>：' + esc(hyphen) + '</li>'
      +   '<li><strong>不触发音变</strong>：' + esc(noMut)
      +     '<span class="forge-out__note">（第一成分以辅音收尾时，接触位置常发生别的变化，此式未必错）</span></li>'
      + '</ul>'
      + '<p class="forge-out__mutinfo">音变：<code>' + esc(head.form) + '</code> → <code>'
      +   esc(lenited || '（首辅音脱落）') + '</code></p>'
      + breakdown(picked)
      + '</div>';
  }

  function cap(s) {
    s = String(s || '');
    return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
  }

  function breakdown(picked) {
    var html = '<details class="forge-src"><summary>逐语素依据（点开）</summary><table class="forge-src__table">'
             + '<thead><tr><th>输入</th><th>词典形</th><th>词性</th><th>释义</th><th>备注</th></tr></thead><tbody>';
    for (var i = 0; i < picked.length; i++) {
      var p = picked[i], e = p.entry;
      html += '<tr>'
            + '<td>' + esc(p.seg) + '</td>'
            + '<td><code>' + esc(e.dict_form) + '</code></td>'
            + '<td>' + esc(e.part || '') + '</td>'
            + '<td>' + esc(e.definition || '') + ' / ' + esc(e.english || '') + '</td>'
            + '<td>' + esc((e.other || '').split('\n')[0]) + '</td>'
            + '</tr>';
    }
    return html + '</tbody></table></details>';
  }

  var senseTimer = null;
  input.addEventListener('input', function () {
    clearTimeout(senseTimer);
    senseTimer = setTimeout(function () {
      chosen = {};
      loadDict().then(function (rows) {
        var segs = segment(input.value, rows);
        renderSlots(segs, rows);
        renderResult(segs, rows);
      });
    }, 200);
  });

  // ---- Sound mode ---------------------------------------------------------
  /* Sindarin's inventory has no z, j, ʒ, or affricates, no /v/-initial in
     native words, and a restricted set of codas. These rewrites map the
     commonest pinyin/English onsets onto the nearest Sindarin phoneme. */
  var SOUND_MAP = [
    ['zh', 'd'], ['ch', 'th'], ['sh', 's'], ['ng', 'ng'],
    ['qu', 'cu'], ['q', 'c'], ['x', 'h'], ['j', 'g'],
    ['z', 's'], ['c', 'c'], ['r', 'r'], ['y', 'i'], ['w', 'gw'],
    ['v', 'b'], ['f', 'ph'], ['k', 'c'], ['ü', 'y'], ['ǖ', 'y']
  ];
  var VOWELS = 'aeiouyâêîôûáéíóú';

  function sindarinise(raw) {
    var syllables = String(raw || '').toLowerCase()
      .split(/[\s'’\-_.]+/).filter(Boolean);
    if (!syllables.length) return null;

    var out = syllables.map(function (syl) {
      var s = syl.replace(/[^a-zü]/g, '');
      if (!s) return '';
      for (var i = 0; i < SOUND_MAP.length; i++) {
        var from = SOUND_MAP[i][0], to = SOUND_MAP[i][1];
        if (s.indexOf(from) === 0) { s = to + s.slice(from.length); break; }
      }
      // Sindarin allows no /ou/ or /ei/ spellings of these; fold them.
      s = s.replace(/ou/g, 'o').replace(/uo/g, 'o').replace(/ie/g, 'ae')
           .replace(/uu/g, 'û').replace(/ii/g, 'î');
      // Every syllable needs a nucleus.
      var hasVowel = false;
      for (var k = 0; k < s.length; k++) {
        if (VOWELS.indexOf(s[k]) !== -1) { hasVowel = true; break; }
      }
      if (!hasVowel) s += 'a';
      return s;
    }).filter(Boolean);

    var joined = out.join('');
    // Sindarin dislikes final -u and -i in names; -ui / -in are fine.
    joined = joined.replace(/u$/, 'ui').replace(/([^aeiouy])i$/, '$1in');
    // No geminates outside the documented set.
    joined = joined.replace(/([bcdfgptv])\1+/g, '$1');
    return { syllables: out, name: cap(joined) };
  }

  var soundInput = document.getElementById('forge-sound-input');
  var soundResult = document.getElementById('forge-sound-result');

  soundInput.addEventListener('input', function () {
    var r = sindarinise(soundInput.value);
    if (!r) { soundResult.innerHTML = ''; return; }
    soundResult.innerHTML =
      '<div class="forge-out">'
      + '<p class="forge-out__label">按辛达语音位库与音位配列改写：</p>'
      + '<p class="forge-out__name">' + esc(r.name) + '</p>'
      + '<p class="forge-out__mutinfo">音节：'
      + r.syllables.map(function (s) { return '<code>' + esc(s) + '</code>'; }).join(' · ')
      + '</p>'
      + '<p class="forge-out__note">音译不携带语义。想要有含义的名字，请用意译模式。</p>'
      + '</div>';
  });

  // ---- Mode switch --------------------------------------------------------
  root.querySelectorAll('.forger__mode').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var mode = btn.getAttribute('data-mode');
      root.querySelectorAll('.forger__mode').forEach(function (b) {
        b.classList.toggle('is-active', b === btn);
      });
      root.querySelectorAll('.forger__panel').forEach(function (p) {
        p.classList.toggle('is-hidden', p.getAttribute('data-panel') !== mode);
      });
    });
  });

  loadDict();
})();
