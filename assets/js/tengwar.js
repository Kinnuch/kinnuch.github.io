/* Sindarin orthography segmenter + script transcriber.

   The segmenter is the verifiable half and is complete: it splits Latin
   transcription into phonemes using longest-match-first, which is what makes
   `dh` one phoneme rather than `d`+`h`.

   Glyph output is driven entirely by _data/tengwar.yml. Cells left blank
   there render as a gap and are counted in the coverage meter — the page
   never invents a letterform. */
(function () {
  var root = document.getElementById('tengwar-tool');
  if (!root) return;

  var dataEl = document.getElementById('tengwar-data');
  var DATA;
  try { DATA = JSON.parse(dataEl.textContent); } catch (e) { DATA = null; }
  if (!DATA) return;

  var vowels = DATA.vowels || [];
  var diphthongs = DATA.diphthongs || [];
  var consonants = DATA.consonants || [];

  // Long and half-long vowels are written with diacritics but are the same
  // phoneme as their short counterpart, carrying a length feature.
  var LONG = { 'â': 'a', 'ê': 'e', 'î': 'i', 'ô': 'o', 'û': 'u', 'ŷ': 'y' };
  var HALF = { 'á': 'a', 'é': 'e', 'í': 'i', 'ó': 'o', 'ú': 'u', 'ý': 'y' };

  // Build the match table, longest first. Digraphs and diphthongs are both
  // two characters, so we simply put every 2-char key ahead of every 1-char.
  var table = [];
  function push(list, kind) {
    for (var i = 0; i < list.length; i++) {
      table.push({
        latin: String(list[i].latin || '').toLowerCase(),
        ipa: list[i].ipa || '',
        note: list[i].note || '',
        tengwa: list[i].tengwa || '',
        certh: list[i].certh || '',
        kind: kind
      });
    }
  }
  push(consonants, 'consonant');
  push(diphthongs, 'diphthong');
  push(vowels, 'vowel');
  table.sort(function (a, b) { return b.latin.length - a.latin.length; });

  var byLatin = {};
  for (var i = 0; i < table.length; i++) {
    if (!byLatin[table[i].latin]) byLatin[table[i].latin] = table[i];
  }

  var VOWEL_CHARS = 'aeiouyâêîôûŷáéíóúý';

  function segment(text) {
    var out = [];
    var s = String(text || '');
    var i = 0;

    while (i < s.length) {
      var ch = s[i];

      // Whitespace and punctuation pass through as separators.
      if (/[\s]/.test(ch)) { out.push({ type: 'space', raw: ch }); i++; continue; }
      if (/[^A-Za-zâêîôûŷáéíóúýÂÊÎÔÛŶÁÉÍÓÚÝ]/.test(ch)) {
        out.push({ type: 'punct', raw: ch }); i++; continue;
      }

      // Length-marked vowels: one phoneme + a length feature.
      var lower = ch.toLowerCase();
      if (LONG[lower] || HALF[lower]) {
        var base = LONG[lower] || HALF[lower];
        var ent = byLatin[base];
        out.push({
          type: 'phoneme', raw: ch, latin: base,
          length: LONG[lower] ? 'long' : 'half',
          ipa: ent ? ent.ipa + (LONG[lower] ? 'ː' : '') : '',
          kind: 'vowel',
          tengwa: ent ? ent.tengwa : '', certh: ent ? ent.certh : ''
        });
        i++;
        continue;
      }

      // Longest match wins — this is what keeps `dh` from becoming `d`+`h`.
      var matched = null;
      for (var t = 0; t < table.length; t++) {
        var key = table[t].latin;
        if (!key) continue;
        if (s.substr(i, key.length).toLowerCase() === key) { matched = table[t]; break; }
      }

      if (!matched) { out.push({ type: 'unknown', raw: ch }); i++; continue; }

      var raw = s.substr(i, matched.latin.length);
      var node = {
        type: 'phoneme', raw: raw, latin: matched.latin,
        ipa: matched.ipa, kind: matched.kind, note: matched.note,
        tengwa: matched.tengwa, certh: matched.certh, length: 'short'
      };

      // `i` before another vowel in the same syllable is the glide /j/.
      if (matched.latin === 'i') {
        var next = s[i + 1];
        if (next && VOWEL_CHARS.indexOf(next.toLowerCase()) !== -1) {
          node.ipa = 'j';
          node.note = '同音节中位于其他元音前，读 /j/';
          node.glide = true;
        }
      }

      // Word-final `f` is /v/.
      if (matched.latin === 'f') {
        var after = s[i + 1];
        if (!after || /[\s.,;:!?]/.test(after)) {
          node.ipa = 'v';
          node.note = '词尾 f 读 /v/';
        }
      }

      out.push(node);
      i += matched.latin.length;
    }
    return out;
  }

  // ---- Rendering ----------------------------------------------------------
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  // "U+16081" -> the actual character; anything else passes through.
  function resolveGlyph(value) {
    var v = String(value || '').trim();
    if (!v) return '';
    var m = /^U\+([0-9A-Fa-f]{4,6})$/.exec(v);
    if (m) {
      try { return String.fromCodePoint(parseInt(m[1], 16)); } catch (e) { return v; }
    }
    return v;
  }

  var inputEl = document.getElementById('tw-input');
  var segEl = document.getElementById('tw-segments');
  var outEl = document.getElementById('tw-output');
  var covEl = document.getElementById('tw-coverage');

  function currentScript() {
    var checked = root.querySelector('input[name="tw-script"]:checked');
    return checked ? checked.value : 'tengwa';
  }

  function render() {
    var script = currentScript();
    var nodes = segment(inputEl.value);

    // --- phoneme breakdown ---
    var segHtml = '<h3 class="tw-h">音位切分</h3><div class="tw-chips">';
    for (var i = 0; i < nodes.length; i++) {
      var n = nodes[i];
      if (n.type === 'space') { segHtml += '<span class="tw-gap"></span>'; continue; }
      if (n.type === 'punct') { segHtml += '<span class="tw-chip tw-chip--punct">' + esc(n.raw) + '</span>'; continue; }
      if (n.type === 'unknown') {
        segHtml += '<span class="tw-chip tw-chip--unknown" title="不在辛达语音位库中">'
                 + esc(n.raw) + '</span>';
        continue;
      }
      var cls = 'tw-chip tw-chip--' + n.kind + (n.length !== 'short' ? ' tw-chip--' + n.length : '');
      segHtml += '<span class="' + cls + '"'
               + (n.note ? ' title="' + esc(n.note) + '"' : '') + '>'
               + '<span class="tw-chip__latin">' + esc(n.raw) + '</span>'
               + '<span class="tw-chip__ipa">' + esc(n.ipa) + '</span>'
               + '</span>';
    }
    segEl.innerHTML = segHtml + '</div>';

    // --- script output ---
    var missing = {};
    var outHtml = '<h3 class="tw-h">' + (script === 'tengwa' ? 'Tengwar' : 'Angerthas') + ' 转写</h3>';
    var line = '';
    var anyGlyph = false;
    for (i = 0; i < nodes.length; i++) {
      n = nodes[i];
      if (n.type === 'space') { line += '<span class="tw-gap"></span>'; continue; }
      if (n.type !== 'phoneme') { line += esc(n.raw); continue; }
      var glyph = resolveGlyph(script === 'tengwa' ? n.tengwa : n.certh);
      if (glyph) {
        anyGlyph = true;
        line += '<span class="tw-glyph" title="' + esc(n.raw) + ' /' + esc(n.ipa) + '/">'
              + esc(glyph) + '</span>';
      } else {
        missing[n.latin] = true;
        line += '<span class="tw-glyph tw-glyph--missing" title="'
              + esc(n.latin) + ' 尚未在 _data/tengwar.yml 中填写">▯</span>';
      }
    }
    outHtml += '<div class="tw-line tw-line--' + script + '">' + line + '</div>';
    if (!anyGlyph) {
      outHtml += '<p class="tw-note">字形表还是空的，所以每个音位都显示为占位符 ▯。'
               + '在 <code>_data/tengwar.yml</code> 里填一格，这里就会亮一格。</p>';
    }
    outEl.innerHTML = outHtml;

    // --- coverage ---
    var key = script === 'tengwa' ? 'tengwa' : 'certh';
    var total = 0, filled = 0, blanks = [];
    for (i = 0; i < table.length; i++) {
      total++;
      if (String(table[i][key] || '').trim()) filled++;
      else blanks.push(table[i].latin);
    }
    var pct = total ? Math.round(filled / total * 100) : 0;
    covEl.innerHTML =
      '<h3 class="tw-h">字形表覆盖率</h3>'
      + '<div class="tw-meter"><div class="tw-meter__fill" style="width:' + pct + '%"></div></div>'
      + '<p class="tw-note">' + (script === 'tengwa' ? 'Tengwar' : 'Angerthas')
      + '：已填 <strong>' + filled + '</strong> / ' + total + '（' + pct + '%）</p>'
      + (blanks.length
          ? '<details class="tw-blanks"><summary>还差 ' + blanks.length + ' 个音位</summary><p>'
            + blanks.map(function (b) { return '<code>' + esc(b) + '</code>'; }).join(' ')
            + '</p></details>'
          : '<p class="tw-note">全部填完了。</p>');
  }

  var timer = null;
  inputEl.addEventListener('input', function () {
    clearTimeout(timer);
    timer = setTimeout(render, 120);
  });
  root.querySelectorAll('input[name="tw-script"]').forEach(function (r) {
    r.addEventListener('change', render);
  });

  render();
})();
