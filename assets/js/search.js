/* Site search.
   Lazily fetches /search.json (built by search.json's Liquid template) the
   first time the user opens the overlay or lands on /search/, then ranks
   client-side.

   Chinese has no word boundaries, so we do not tokenise the corpus. Instead
   the query is split on whitespace and each term is substring-matched — this
   behaves correctly for both "sindarin mutation" and "辅音 变音". */
(function () {
  var INDEX_URL = '/search.json';
  var index = null;
  var loading = null;

  function load() {
    if (loading) return loading;
    loading = fetch(INDEX_URL, { cache: 'no-cache' })
      .then(function (r) { return r.ok ? r.json() : []; })
      .then(function (rows) { index = rows; return rows; })
      .catch(function () { index = []; return []; });
    return loading;
  }

  function norm(s) { return String(s || '').toLowerCase(); }

  // Count non-overlapping occurrences of `term` in `hay`.
  function countOf(hay, term) {
    if (!term) return 0;
    var n = 0, i = 0;
    while ((i = hay.indexOf(term, i)) !== -1) { n++; i += term.length; }
    return n;
  }

  function search(query, rows) {
    var terms = norm(query).split(/\s+/).filter(Boolean);
    if (!terms.length) return [];

    var out = [];
    for (var i = 0; i < rows.length; i++) {
      var r = rows[i];
      var t = norm(r.t), d = norm(r.d), b = norm(r.b);
      var score = 0, matchedAll = true;

      for (var j = 0; j < terms.length; j++) {
        var term = terms[j];
        var inT = countOf(t, term);
        var inD = countOf(d, term);
        var inB = countOf(b, term);
        if (!inT && !inD && !inB) { matchedAll = false; break; }
        // Title hits dominate; body hits saturate so a long page cannot win
        // on sheer length alone.
        score += inT * 40;
        if (t === term) score += 60;
        score += inD * 8;
        score += Math.min(inB, 8) * 2;
      }
      if (!matchedAll) continue;
      out.push({ row: r, score: score, snippet: snippetFor(r, terms) });
    }
    out.sort(function (a, b) { return b.score - a.score; });
    return out.slice(0, 40);
  }

  function snippetFor(r, terms) {
    var body = r.b || r.d || '';
    var lower = norm(body);
    var at = -1;
    for (var i = 0; i < terms.length && at === -1; i++) {
      at = lower.indexOf(terms[i]);
    }
    if (at === -1) return body.slice(0, 120);
    var start = Math.max(0, at - 45);
    var text = body.slice(start, start + 150);
    return (start > 0 ? '…' : '') + text + (start + 150 < body.length ? '…' : '');
  }

  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function highlight(text, terms) {
    var html = esc(text);
    for (var i = 0; i < terms.length; i++) {
      var t = terms[i];
      if (!t) continue;
      // Escape regex metacharacters in the user's term.
      var re = new RegExp(t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
      html = html.replace(re, function (m) { return '<mark>' + m + '</mark>'; });
    }
    return html;
  }

  function render(container, results, query) {
    var terms = norm(query).split(/\s+/).filter(Boolean);
    if (!query.trim()) { container.innerHTML = ''; return; }
    if (!results.length) {
      container.innerHTML = '<p class="search-empty">没有找到与「' + esc(query) + '」相关的页面。</p>';
      return;
    }
    var html = '<p class="search-count">找到 ' + results.length + ' 个结果</p><ul class="search-results">';
    for (var i = 0; i < results.length; i++) {
      var r = results[i];
      html += '<li class="search-result">'
        + '<a class="search-result__title" href="' + esc(r.row.u) + '">'
        + highlight(r.row.t, terms) + '</a>'
        + '<p class="search-result__url">' + esc(r.row.u) + '</p>'
        + '<p class="search-result__snippet">' + highlight(r.snippet, terms) + '</p>'
        + '</li>';
    }
    container.innerHTML = html + '</ul>';
  }

  function wire(input, container, onNavigate) {
    var timer = null;
    function run() {
      var q = input.value;
      load().then(function (rows) {
        render(container, search(q, rows), q);
      });
    }
    input.addEventListener('input', function () {
      clearTimeout(timer);
      timer = setTimeout(run, 120);
    });
    input.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') {
        var first = container.querySelector('.search-result__title');
        if (first) { e.preventDefault(); if (onNavigate) onNavigate(); first.click(); }
      }
    });
    return run;
  }

  // ---- Standalone /search/ page -------------------------------------------
  var pageInput = document.getElementById('search-input');
  if (pageInput) {
    var pageResults = document.getElementById('search-results');
    var run = wire(pageInput, pageResults);
    var q = new URLSearchParams(window.location.search).get('q');
    if (q) { pageInput.value = q; run(); }
    pageInput.focus();
  }

  // ---- Nav overlay --------------------------------------------------------
  var trigger = document.getElementById('search-toggle');
  if (!trigger) return;

  var overlay = null, overlayInput = null;

  function buildOverlay() {
    overlay = document.createElement('div');
    overlay.className = 'search-overlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-label', '站内搜索');
    overlay.innerHTML =
      '<div class="search-overlay__panel">' +
        '<div class="search-overlay__bar">' +
          '<input id="search-overlay-input" type="search" autocomplete="off" ' +
                 'placeholder="搜索站内内容…（辛达语 / 中文 / English）" aria-label="搜索">' +
          '<button class="search-overlay__close" type="button" aria-label="关闭">×</button>' +
        '</div>' +
        '<div id="search-overlay-results" class="search-overlay__results"></div>' +
      '</div>';
    document.body.appendChild(overlay);

    overlayInput = overlay.querySelector('#search-overlay-input');
    wire(overlayInput, overlay.querySelector('#search-overlay-results'), close);

    overlay.addEventListener('click', function (e) {
      if (e.target === overlay) close();
    });
    overlay.querySelector('.search-overlay__close').addEventListener('click', close);
  }

  function open() {
    if (!overlay) buildOverlay();
    overlay.classList.add('open');
    document.body.style.overflow = 'hidden';
    overlayInput.focus();
    overlayInput.select();
    load();
  }

  function close() {
    if (!overlay) return;
    overlay.classList.remove('open');
    document.body.style.overflow = '';
  }

  trigger.addEventListener('click', open);

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && overlay && overlay.classList.contains('open')) {
      close();
      return;
    }
    // Ctrl/Cmd-K opens search, as long as focus is not already in a field.
    var tag = (document.activeElement && document.activeElement.tagName) || '';
    var editing = tag === 'INPUT' || tag === 'TEXTAREA' ||
                  (document.activeElement && document.activeElement.isContentEditable);
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      open();
    } else if (e.key === '/' && !editing && !(overlay && overlay.classList.contains('open'))) {
      e.preventDefault();
      open();
    }
  });
})();
