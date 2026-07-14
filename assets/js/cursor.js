/* Middle-earth custom cursor.
   Loads each cursor file into a canvas, scales to a uniform size, then
   renders a fixed-position <div> that follows the pointer and swaps
   images depending on hover context.
   Falls back to CSS cursors defined in cursors.css if this script fails. */
(function () {
  if ('ontouchstart' in window || navigator.maxTouchPoints > 0) return;

  var SIZE = 28;
  var HOTSPOT = { x: 3, y: 3 };
  var SOURCES = {
    'default':  '/images/GaladrielCursor.ani',
    'pointer':  '/images/AragornCursor.cur',
    'text':     '/images/WizardstaffCursor.cur',
    'wait':     '/images/RingPointer.cur',
    'progress': '/images/RingCursor.cur'
  };

  var cache = {};
  var pending = Object.keys(SOURCES).length;

  Object.keys(SOURCES).forEach(function (kind) {
    var img = new Image();
    img.onload = function () {
      var scale = window.devicePixelRatio || 1;
      var c = document.createElement('canvas');
      c.width = c.height = Math.round(SIZE * scale);
      var cx = c.getContext('2d');
      cx.imageSmoothingEnabled = true;
      cx.imageSmoothingQuality = 'high';
      cx.drawImage(img, 0, 0, c.width, c.height);
      cache[kind] = c.toDataURL('image/png');
      if (--pending === 0) install();
    };
    img.onerror = function () {
      if (--pending === 0) install();
    };
    img.src = SOURCES[kind];
  });

  function fallbackArrow(tone) {
    var color = tone === 'gold' ? '#d4a54a' : '#2a2a2a';
    var svg =
      '<svg xmlns="http://www.w3.org/2000/svg" width="' + SIZE + '" ' +
      'height="' + SIZE + '" viewBox="0 0 24 24">' +
      '<path d="M3 2 L3 20 L8 16 L11 22 L14 21 L11 14 L18 14 Z" ' +
      'fill="' + color + '" stroke="white" stroke-width="1.3"/></svg>';
    return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
  }

  function install() {
    ['default','pointer','text'].forEach(function (k) {
      if (!cache[k]) cache[k] = fallbackArrow('dark');
    });
    ['wait','progress'].forEach(function (k) {
      if (!cache[k]) cache[k] = fallbackArrow('gold');
    });

    var el = document.createElement('div');
    el.id = 'custom-cursor';
    el.style.cssText =
      'position:fixed;top:0;left:0;' +
      'width:' + SIZE + 'px;height:' + SIZE + 'px;' +
      'pointer-events:none;z-index:2147483647;' +
      'background-size:' + SIZE + 'px ' + SIZE + 'px;' +
      'background-repeat:no-repeat;' +
      'transform:translate3d(-100px,-100px,0);' +
      'opacity:0;transition:opacity 0.15s;' +
      'will-change:transform,background-image;';
    var host = document.body || document.documentElement;
    host.appendChild(el);
    document.documentElement.classList.add('has-custom-cursor');

    var current = null;
    function setKind(kind) {
      if (kind === current) return;
      current = kind;
      el.style.backgroundImage = 'url("' + cache[kind] + '")';
    }
    setKind('default');

    var LINK_SEL =
      'a,button,[role="button"],.btn,summary,label[for],' +
      'input[type="button"],input[type="submit"],input[type="reset"],' +
      '.me-weather,.map-city,.map-modal__close,.map-grid-toggle,' +
      '.comments-fab,.comments-drawer__close,#theme-toggle,' +
      '.gallery-btn,.gallery-dot';
    var TEXT_SEL =
      'input[type="text"],input[type="search"],input[type="email"],' +
      'input[type="url"],input[type="password"],input[type="number"],' +
      'input[type="tel"],input:not([type]),textarea,[contenteditable="true"]';

    var lastX = 0, lastY = 0, rafPending = false;
    function updatePos() {
      rafPending = false;
      el.style.transform =
        'translate3d(' + (lastX - HOTSPOT.x) + 'px,' +
                         (lastY - HOTSPOT.y) + 'px,0)';
    }

    function detectKind(target) {
      var root = document.documentElement;
      if (root.classList.contains('is-busy')) return 'wait';
      if (root.classList.contains('is-loading')) return 'progress';
      if (target && target.closest) {
        if (target.closest('[aria-busy="true"]')) return 'wait';
        if (target.closest('[data-loading="true"]')) return 'progress';
        if (target.closest(LINK_SEL)) return 'pointer';
        if (target.closest(TEXT_SEL)) return 'text';
      }
      return 'default';
    }

    document.addEventListener('pointermove', function (e) {
      lastX = e.clientX;
      lastY = e.clientY;
      el.style.opacity = '1';
      if (!rafPending) {
        rafPending = true;
        requestAnimationFrame(updatePos);
      }
      setKind(detectKind(e.target));
    }, { passive: true });

    document.addEventListener('pointerdown', function (e) {
      setKind(detectKind(e.target));
    }, { passive: true });

    window.addEventListener('blur', function () { el.style.opacity = '0'; });
    document.addEventListener('mouseleave', function () { el.style.opacity = '0'; });
    document.addEventListener('mouseenter', function () { el.style.opacity = '1'; });
  }
})();
