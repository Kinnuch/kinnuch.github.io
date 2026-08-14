/* Changelog page: renders assets/data/commits.json as a filterable, grouped
   timeline plus a per-day activity heatmap.

   Same data source as calendar.js (the Sindarin-calendar widget in the
   sidebar), so the two never disagree. */
(function () {
  var root = document.getElementById('changelog');
  if (!root) return;

  var COMMITS_URL = '/assets/data/commits.json';
  var REPO = 'Kinnuch/kinnuch.github.io';
  var CHORE_RE = /^chore: refresh commits\.json/i;

  var listEl = document.getElementById('changelog-list');
  var statsEl = document.getElementById('changelog-stats');
  var heatEl = document.getElementById('changelog-heatmap');
  var filterEl = document.getElementById('changelog-filter');
  var choreEl = document.getElementById('changelog-hide-chore');

  var all = [];

  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function dayKey(iso) { return String(iso || '').slice(0, 10); }
  function monthKey(iso) { return String(iso || '').slice(0, 7); }

  function visible() {
    var q = (filterEl.value || '').trim().toLowerCase();
    var hideChore = choreEl.checked;
    return all.filter(function (c) {
      if (hideChore && CHORE_RE.test(c.msg || '')) return false;
      if (q && (c.msg || '').toLowerCase().indexOf(q) === -1) return false;
      return true;
    });
  }

  function renderStats(rows) {
    if (!rows.length) { statsEl.innerHTML = ''; return; }
    // commits.json is newest-first; guard anyway rather than assume.
    var dates = rows.map(function (c) { return c.date; }).filter(Boolean).sort();
    var first = dates[0], last = dates[dates.length - 1];
    var days = {};
    rows.forEach(function (c) { days[dayKey(c.date)] = true; });
    statsEl.innerHTML =
      '<span><strong>' + rows.length + '</strong> 次提交</span>' +
      '<span><strong>' + Object.keys(days).length + '</strong> 个活跃日</span>' +
      '<span>首次 <strong>' + esc(dayKey(first)) + '</strong></span>' +
      '<span>最近 <strong>' + esc(dayKey(last)) + '</strong></span>';
  }

  function renderHeatmap(rows) {
    var byDay = {};
    rows.forEach(function (c) {
      var k = dayKey(c.date);
      if (k) byDay[k] = (byDay[k] || 0) + 1;
    });
    var keys = Object.keys(byDay).sort();
    if (!keys.length) { heatEl.innerHTML = ''; return; }

    var years = {};
    keys.forEach(function (k) { years[k.slice(0, 4)] = true; });

    var html = '';
    Object.keys(years).sort().reverse().forEach(function (y) {
      html += '<div class="heat-year"><div class="heat-year__label">' + y + '</div><div class="heat-year__grid">';
      for (var m = 1; m <= 12; m++) {
        var mm = y + '-' + (m < 10 ? '0' + m : m);
        var total = 0;
        keys.forEach(function (k) { if (k.indexOf(mm) === 0) total += byDay[k]; });
        var level = total === 0 ? 0 : total < 3 ? 1 : total < 8 ? 2 : total < 20 ? 3 : 4;
        html += '<span class="heat-cell heat-cell--' + level + '" title="' + mm + '：' + total + ' 次提交">'
              + m + '</span>';
      }
      html += '</div></div>';
    });
    heatEl.innerHTML = html;
  }

  function renderList(rows) {
    if (!rows.length) {
      listEl.innerHTML = '<p class="changelog__loading">没有符合条件的提交。</p>';
      return;
    }
    var groups = [];
    var lastMonth = null;
    rows.forEach(function (c) {
      var mk = monthKey(c.date);
      if (mk !== lastMonth) { groups.push({ month: mk, items: [] }); lastMonth = mk; }
      groups[groups.length - 1].items.push(c);
    });

    var html = '';
    groups.forEach(function (g) {
      html += '<section class="changelog__month">'
            + '<h2 class="changelog__month-title">' + esc(g.month) + ''
            + ' <span class="changelog__month-count">' + g.items.length + '</span></h2><ul>';
      g.items.forEach(function (c) {
        var url = 'https://github.com/' + REPO + '/commit/' + encodeURIComponent(c.hash);
        html += '<li class="changelog__item">'
              + '<a class="changelog__hash" href="' + url + '" target="_blank" rel="noopener">'
              + '<code>' + esc(c.short) + '</code></a>'
              + '<span class="changelog__date">' + esc(dayKey(c.date)) + '</span>'
              + '<span class="changelog__msg">' + esc(c.msg) + '</span>'
              + '</li>';
      });
      html += '</ul></section>';
    });
    listEl.innerHTML = html;
  }

  function refresh() {
    var rows = visible();
    renderStats(rows);
    renderHeatmap(rows);
    renderList(rows);
  }

  fetch(COMMITS_URL, { cache: 'no-cache' })
    .then(function (r) { return r.ok ? r.json() : []; })
    .then(function (rows) {
      all = Array.isArray(rows) ? rows : [];
      all.sort(function (a, b) { return String(b.date).localeCompare(String(a.date)); });
      refresh();
    })
    .catch(function () {
      listEl.innerHTML = '<p class="changelog__loading">提交记录加载失败。</p>';
    });

  var timer = null;
  filterEl.addEventListener('input', function () {
    clearTimeout(timer);
    timer = setTimeout(refresh, 150);
  });
  choreEl.addEventListener('change', refresh);
})();
