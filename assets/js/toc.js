/* Auto table of contents for long pages.
   kramdown's auto_ids is enabled in _config.yml, so headings already carry
   ids; we only generate one when a heading somehow lacks it.

   The TOC only appears when a page has enough structure to need it, and it
   collapses into an inline <details> block on narrow screens. */
(function () {
  var MIN_HEADINGS = 4;

  var article = document.querySelector('.article-wrap');
  if (!article) return;

  var headings = article.querySelectorAll('h2, h3');
  if (headings.length < MIN_HEADINGS) return;

  var used = {};
  function slugify(text, i) {
    var base = text.trim().toLowerCase()
      .replace(/[\s]+/g, '-')
      .replace(/[^\w一-鿿À-ɏ-]/g, '');
    if (!base) base = 'section-' + i;
    var slug = base, n = 2;
    while (used[slug]) { slug = base + '-' + n; n++; }
    used[slug] = true;
    return slug;
  }

  var items = [];
  for (var i = 0; i < headings.length; i++) {
    var h = headings[i];
    if (h.id) { used[h.id] = true; }
  }
  for (i = 0; i < headings.length; i++) {
    h = headings[i];
    if (!h.id) h.id = slugify(h.textContent, i);
    items.push({ el: h, level: h.tagName === 'H2' ? 2 : 3, id: h.id, text: h.textContent });
  }

  var nav = document.createElement('nav');
  nav.className = 'toc';
  nav.setAttribute('aria-label', '目录');

  var html = '<details class="toc__details" open>'
           + '<summary class="toc__title">目录</summary><ul class="toc__list">';
  for (i = 0; i < items.length; i++) {
    html += '<li class="toc__item toc__item--h' + items[i].level + '">'
          + '<a href="#' + encodeURIComponent(items[i].id) + '">'
          + items[i].text.replace(/[&<>]/g, function (c) {
              return { '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c];
            })
          + '</a></li>';
  }
  nav.innerHTML = html + '</ul></details>';

  document.body.classList.add('has-toc');
  article.parentNode.insertBefore(nav, article);

  // ---- Scroll spy ---------------------------------------------------------
  var links = nav.querySelectorAll('.toc__item a');
  var byId = {};
  for (i = 0; i < links.length; i++) {
    byId[decodeURIComponent(links[i].getAttribute('href').slice(1))] = links[i];
  }

  var activeLink = null;
  function setActive(id) {
    var link = byId[id];
    if (!link || link === activeLink) return;
    if (activeLink) activeLink.classList.remove('toc__link--active');
    link.classList.add('toc__link--active');
    activeLink = link;
  }

  if ('IntersectionObserver' in window) {
    // Track which headings are above the fold; the lowest one wins.
    var visible = {};
    var observer = new IntersectionObserver(function (entries) {
      for (var k = 0; k < entries.length; k++) {
        visible[entries[k].target.id] = entries[k].isIntersecting;
      }
      for (var j = items.length - 1; j >= 0; j--) {
        if (visible[items[j].id]) { setActive(items[j].id); return; }
      }
    }, { rootMargin: '-10% 0px -70% 0px' });

    for (i = 0; i < items.length; i++) observer.observe(items[i].el);
  }

  // On mobile the TOC starts collapsed to stay out of the way.
  if (window.matchMedia && window.matchMedia('(max-width: 900px)').matches) {
    nav.querySelector('.toc__details').removeAttribute('open');
  }
})();
