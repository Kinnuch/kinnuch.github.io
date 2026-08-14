/* Bilingual reading mode.

   Pages like the Sindarin textbook and the Gondolin translations interleave
   an Elvish line with its Chinese line, paragraph by paragraph. Reading only
   one of the two is a common need (drilling comprehension, or just reading
   the story), so classify each block and let the reader hide the other side.

   Classification is by script census, not by language ID: a block whose
   characters are mostly CJK is the Chinese side, mostly Latin is the other.
   Blocks that are genuinely mixed stay visible in every mode. */
(function () {
  var MIN_PER_SIDE = 5;   // below this the page isn't really bilingual

  var article = document.querySelector('.article-wrap');
  if (!article) return;

  var blocks = article.querySelectorAll('blockquote p, blockquote li');
  if (!blocks.length) return;

  var cjkBlocks = [], latinBlocks = [];

  for (var i = 0; i < blocks.length; i++) {
    var el = blocks[i];
    var text = el.textContent || '';
    var cjk = 0, latin = 0;

    for (var j = 0; j < text.length; j++) {
      var c = text.charCodeAt(j);
      if ((c >= 0x4e00 && c <= 0x9fff) || (c >= 0x3400 && c <= 0x4dbf)) cjk++;
      else if ((c >= 0x41 && c <= 0x5a) || (c >= 0x61 && c <= 0x7a) ||
               (c >= 0xc0 && c <= 0x24f)) latin++;
    }
    var scripted = cjk + latin;
    if (scripted < 4) continue;   // punctuation-only or a stray line

    if (cjk / scripted > 0.6) { el.setAttribute('data-lang', 'zh'); cjkBlocks.push(el); }
    else if (latin / scripted > 0.8) { el.setAttribute('data-lang', 'lat'); latinBlocks.push(el); }
  }

  if (cjkBlocks.length < MIN_PER_SIDE || latinBlocks.length < MIN_PER_SIDE) return;

  var bar = document.createElement('div');
  bar.className = 'bilingual';
  bar.innerHTML =
    '<span class="bilingual__label">阅读模式</span>' +
    '<button class="bilingual__btn is-active" data-mode="both">对照</button>' +
    '<button class="bilingual__btn" data-mode="lat">仅原文</button>' +
    '<button class="bilingual__btn" data-mode="zh">仅中文</button>';

  article.parentNode.insertBefore(bar, article);

  var STORE = 'readingMode';
  function apply(mode) {
    article.setAttribute('data-reading', mode);
    bar.querySelectorAll('.bilingual__btn').forEach(function (b) {
      b.classList.toggle('is-active', b.getAttribute('data-mode') === mode);
    });
    try { localStorage.setItem(STORE, mode); } catch (e) { /* private mode */ }
  }

  bar.addEventListener('click', function (e) {
    var btn = e.target.closest('.bilingual__btn');
    if (btn) apply(btn.getAttribute('data-mode'));
  });

  var saved = null;
  try { saved = localStorage.getItem(STORE); } catch (e) { /* ignore */ }
  apply(saved === 'lat' || saved === 'zh' ? saved : 'both');
})();
