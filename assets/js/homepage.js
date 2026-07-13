(function() {
  // === Gallery ===
  var wrap = document.querySelector('.gallery-wrap');
  if (wrap) {
    var imgs = wrap.querySelectorAll('.gallery-img');
    var prev = wrap.querySelector('.gallery-prev');
    var next = wrap.querySelector('.gallery-next');
    var dotsWrap = wrap.querySelector('.gallery-dots');
    var current = 0;

    for (var i = 0; i < imgs.length; i++) {
      var dot = document.createElement('span');
      dot.className = 'gallery-dot' + (i === 0 ? ' active' : '');
      dot.setAttribute('data-index', i);
      dotsWrap.appendChild(dot);
    }

    function showSlide(n) {
      imgs[current].classList.remove('active');
      var dots = dotsWrap.querySelectorAll('.gallery-dot');
      dots[current].classList.remove('active');
      current = (n + imgs.length) % imgs.length;
      imgs[current].classList.add('active');
      dots[current].classList.add('active');
    }

    prev.addEventListener('click', function() { showSlide(current - 1); });
    next.addEventListener('click', function() { showSlide(current + 1); });
    dotsWrap.addEventListener('click', function(e) {
      if (e.target.classList.contains('gallery-dot')) {
        showSlide(parseInt(e.target.getAttribute('data-index')));
      }
    });
  }

  // === Middle-earth Weather ===
  // x/y are percentages on the SVG map (viewBox 1000x800).
  // x/y are percentages (0-100) relative to the reference map image.
  var cities = [
    { name: 'Mithlond',    x: 24.5, y: 30 },
    { name: 'Annúminas',   x: 34,   y: 25 },
    { name: 'Fornost',     x: 40,   y: 25 },
    { name: 'Hobbiton',    x: 34,   y: 30 },
    { name: 'Bree',        x: 41.5, y: 30 },
    { name: 'Rivendell',   x: 58,   y: 29 },
    { name: 'Erebor',      x: 77.5, y: 23 },
    { name: 'Lothlórien',  x: 62,   y: 40 },
    { name: 'Isengard',    x: 53,   y: 48 },
    { name: 'Edoras',      x: 59,   y: 53 },
    { name: 'Minas Tirith',x: 74,   y: 59 },
    { name: 'Osgiliath',   x: 75,   y: 59 },
    { name: 'Minas Morgul',x: 78,   y: 60, region: 'mordor' },
    { name: 'Cirith Ungol',x: 78,   y: 57, region: 'mordor' },
    { name: 'Orodruin',    x: 82,   y: 56, region: 'mordor' },
    { name: 'Barad-dûr',   x: 84,   y: 56, region: 'mordor' },
    { name: 'Dol Amroth',  x: 57,   y: 64 },
    { name: 'Pelargir',    x: 71.5, y: 65 }
  ];

  var weatherTypes = {
    Clear:        { name: 'Clear',        icon: '☀', hasParticles: true,  particle: 'grass' },
    Cloudy:       { name: 'Cloudy',       icon: '☁', hasParticles: true,  particle: 'sparse' },
    PartlyCloudy: { name: 'Partly Cloudy',icon: '⛅', hasParticles: true,  particle: 'sparse' },
    Rain:         { name: 'Rain',         icon: '🌧', hasParticles: true,  particle: 'rain' },
    Thunderstorm: { name: 'Thunderstorm', icon: '⛈', hasParticles: true,  particle: 'thunder' },
    Snow:         { name: 'Snow',         icon: '🌨', hasParticles: true,  particle: 'snow' },
    Fog:          { name: 'Fog',          icon: '🌫', hasParticles: true,  particle: 'sparse' },
    Windy:        { name: 'Windy',        icon: '💨', hasParticles: true,  particle: 'wind' },
    Lava:         { name: 'Lava',         icon: '🌋', hasParticles: true,  particle: 'lava' }
  };
  var normalOrder = ['Clear','Cloudy','PartlyCloudy','Rain','Thunderstorm','Snow','Fog','Windy'];
  var mordorOrder = ['Rain','Lava'];

  function seededRandom(seed) {
    var x = Math.sin(seed) * 10000;
    return x - Math.floor(x);
  }

  function computeCityWeather(city, hourSeed, cityIdx) {
    var s = hourSeed + cityIdx * 37;
    var month = new Date().getMonth();
    var key;
    if (city.region === 'mordor') {
      key = mordorOrder[Math.floor(seededRandom(s + 1) * mordorOrder.length)];
    } else {
      var idx = Math.floor(seededRandom(s + 1) * normalOrder.length);
      key = normalOrder[idx];
      if (month >= 11 || month <= 1) {
        if (seededRandom(s + 2) > 0.5) key = 'Snow';
      } else if (month >= 3 && month <= 5) {
        if (seededRandom(s + 2) > 0.7) key = 'Rain';
      }
    }

    var baseTemp = 15;
    if (month >= 5 && month <= 8) baseTemp = 25;
    else if (month >= 11 || month <= 1) baseTemp = 2;
    else if (month >= 2 && month <= 4) baseTemp = 12;
    if (city.region === 'mordor') baseTemp += 8;
    if (key === 'Lava') baseTemp = 45 + Math.floor(seededRandom(s + 4) * 20);
    var temp = key === 'Lava'
      ? baseTemp
      : Math.round(baseTemp + (seededRandom(s + 3) - 0.5) * 14);

    return { key: key, weather: weatherTypes[key], temp: temp };
  }

  function getHourSeed() {
    var now = new Date();
    var daySeed = now.getFullYear() * 10000 + (now.getMonth() + 1) * 100 + now.getDate();
    return daySeed * 100 + Math.floor(now.getHours() / 3);
  }

  function getDefaultCity() {
    var now = new Date();
    var daySeed = now.getFullYear() * 10000 + (now.getMonth() + 1) * 100 + now.getDate();
    return cities[Math.floor(seededRandom(daySeed) * cities.length)];
  }

  function readOverride() {
    try {
      var raw = sessionStorage.getItem('meWeatherOverride');
      return raw ? JSON.parse(raw) : null;
    } catch (e) { return null; }
  }
  function writeOverride(cityName) {
    try { sessionStorage.setItem('meWeatherOverride', JSON.stringify({ city: cityName })); }
    catch (e) {}
  }

  function currentSelection() {
    var ov = readOverride();
    var hourSeed = getHourSeed();
    var city, cityIdx;
    if (ov) {
      for (var i = 0; i < cities.length; i++) {
        if (cities[i].name === ov.city) { city = cities[i]; cityIdx = i; break; }
      }
    }
    if (!city) {
      var def = getDefaultCity();
      for (var j = 0; j < cities.length; j++) {
        if (cities[j].name === def.name) { city = cities[j]; cityIdx = j; break; }
      }
    }
    var cw = computeCityWeather(city, hourSeed, cityIdx);
    return { city: city, weather: cw.weather, temp: cw.temp };
  }

  var weatherEl = document.getElementById('me-weather');
  var currentAnim = null;

  function applySelection() {
    var sel = currentSelection();
    if (weatherEl) {
      weatherEl.textContent = sel.weather.icon + ' ' + sel.city.name + ' ' + sel.temp + '°C';
      weatherEl.title = sel.weather.name + ' in ' + sel.city.name + ' — click for map';
    }
    if (currentAnim && currentAnim.stop) currentAnim.stop();
    currentAnim = sel.weather.hasParticles
      ? startWeatherParticles(sel.weather.particle)
      : null;
  }

  if (weatherEl) {
    applySelection();
    weatherEl.addEventListener('click', openMapModal);
  }

  // ===== Map modal =====
  function openMapModal() {
    var modal = document.getElementById('map-modal');
    if (!modal) modal = buildMapModal();
    renderMapCities(modal);
    modal.classList.add('open');
    document.body.style.overflow = 'hidden';
  }
  function closeMapModal() {
    var modal = document.getElementById('map-modal');
    if (!modal) return;
    modal.classList.remove('open');
    document.body.style.overflow = '';
  }

  function buildMapModal() {
    var modal = document.createElement('div');
    modal.id = 'map-modal';
    modal.className = 'map-modal';
    modal.innerHTML =
      '<div class="map-modal__inner" role="dialog" aria-label="Middle-earth map">' +
        '<div class="map-modal__header">' +
          '<h3 class="map-modal__title">Ennorath | 中土地图</h3>' +
          '<div class="map-modal__tools">' +
            '<span class="map-readout" aria-live="polite"></span>' +
            '<button class="map-grid-toggle" type="button" title="Toggle coordinate grid (G)">网格</button>' +
            '<button class="map-modal__close" aria-label="关闭">×</button>' +
          '</div>' +
        '</div>' +
        '<div class="map-modal__body">' +
          buildMapSVG() +
        '</div>' +
      '</div>';
    document.body.appendChild(modal);
    modal.addEventListener('click', function (e) {
      if (e.target === modal) closeMapModal();
    });
    modal.querySelector('.map-modal__close').addEventListener('click', closeMapModal);
    document.addEventListener('keydown', function (e) {
      if (!modal.classList.contains('open')) return;
      if (e.key === 'Escape') closeMapModal();
      else if (e.key === 'g' || e.key === 'G') toggleGrid(modal);
    });
    modal.querySelector('.map-grid-toggle').addEventListener('click', function () {
      toggleGrid(modal);
    });
    attachMapProbe(modal);
    return modal;
  }

  function toggleGrid(modal) {
    var svg = modal.querySelector('.map-svg');
    var existing = svg.querySelector('#map-grid');
    if (existing) {
      existing.parentNode.removeChild(existing);
      modal.querySelector('.map-grid-toggle').classList.remove('is-active');
    } else {
      svg.insertAdjacentHTML('beforeend', buildMapGrid());
      modal.querySelector('.map-grid-toggle').classList.add('is-active');
    }
  }

  function buildMapGrid() {
    var minor = '', major = '', labels = '';
    // vertical lines every 5% (x)
    for (var vx = 0; vx <= 100; vx += 5) {
      var xPx = vx * MAP_VBW / 100;
      var isMajor = vx % 10 === 0;
      (isMajor ? function () { major += '<line x1="' + xPx + '" y1="0" x2="' + xPx + '" y2="' + MAP_VBH + '"/>'; }
               : function () { minor += '<line x1="' + xPx + '" y1="0" x2="' + xPx + '" y2="' + MAP_VBH + '"/>'; })();
      if (isMajor) {
        labels += '<text class="map-grid__label" x="' + (xPx + 3) + '" y="14">' + vx + '</text>';
      }
    }
    // horizontal lines every 5% (y)
    for (var vy = 0; vy <= 100; vy += 5) {
      var yPx = vy * MAP_VBH / 100;
      var isMajorY = vy % 10 === 0;
      (isMajorY ? function () { major += '<line x1="0" y1="' + yPx + '" x2="' + MAP_VBW + '" y2="' + yPx + '"/>'; }
                : function () { minor += '<line x1="0" y1="' + yPx + '" x2="' + MAP_VBW + '" y2="' + yPx + '"/>'; })();
      if (isMajorY) {
        labels += '<text class="map-grid__label" x="3" y="' + (yPx + 12) + '">' + vy + '</text>';
      }
    }
    return (
      '<g id="map-grid" pointer-events="none">' +
        '<g class="map-grid__minor">' + minor + '</g>' +
        '<g class="map-grid__major">' + major + '</g>' +
        labels +
      '</g>'
    );
  }

  function attachMapProbe(modal) {
    var svg = modal.querySelector('.map-svg');
    var readout = modal.querySelector('.map-readout');

    function toPercent(evt) {
      var pt = svg.createSVGPoint();
      pt.x = evt.clientX;
      pt.y = evt.clientY;
      var m = svg.getScreenCTM();
      if (!m) return null;
      var loc = pt.matrixTransform(m.inverse());
      var xp = loc.x / MAP_VBW * 100;
      var yp = loc.y / MAP_VBH * 100;
      return { x: xp, y: yp };
    }

    svg.addEventListener('pointermove', function (e) {
      var p = toPercent(e);
      if (!p) return;
      readout.textContent = 'x: ' + p.x.toFixed(1) + '  y: ' + p.y.toFixed(1);
    });
    svg.addEventListener('pointerleave', function () {
      readout.textContent = '';
    });
    svg.addEventListener('click', function (e) {
      // Only if the click is not on a city marker
      var isCity = e.target.closest && e.target.closest('.map-city');
      if (isCity) return;
      var p = toPercent(e);
      if (!p) return;
      var snippet = '{ x: ' + p.x.toFixed(1) + ', y: ' + p.y.toFixed(1) + ' }';
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(snippet).then(function () {
          readout.textContent = 'copied: ' + snippet;
        }, function () {
          console.log('map coords:', snippet);
          readout.textContent = 'console: ' + snippet;
        });
      } else {
        console.log('map coords:', snippet);
        readout.textContent = 'console: ' + snippet;
      }
    });
  }

  // viewBox roughly matches the reference map aspect ratio (1656:1932).
  var MAP_VBW = 1000, MAP_VBH = 1167;

  function buildMapSVG() {
    return (
      '<svg class="map-svg" viewBox="0 0 ' + MAP_VBW + ' ' + MAP_VBH + '" ' +
        'xmlns="http://www.w3.org/2000/svg" ' +
        'preserveAspectRatio="xMidYMid meet">' +
        '<image href="/images/middle-earth.png" ' +
          'x="0" y="0" width="' + MAP_VBW + '" height="' + MAP_VBH + '" ' +
          'preserveAspectRatio="xMidYMid meet"/>' +
        '<g id="map-cities"></g>' +
      '</svg>'
    );
  }

  // Per-city label overrides for the crowded Mordor/Gondor cluster.
  var LABEL_OVERRIDE = {
    'Minas Tirith': { anchor: 'end',    dx: -10, dy: -6 },
    'Osgiliath':    { anchor: 'middle', dx: 0,   dy: 22 },
    'Minas Morgul': { anchor: 'start',  dx: 10,  dy: 18 },
    'Cirith Ungol': { anchor: 'end',    dx: -10, dy: -6 },
    'Orodruin':     { anchor: 'middle', dx: 0,   dy: -10 },
    'Barad-dûr':    { anchor: 'start',  dx: 10,  dy: 6 },
    'Erebor':       { anchor: 'start',  dx: 10,  dy: 6 },
    'Annúminas':    { anchor: 'end',    dx: -10, dy: -6 },
    'Fornost':      { anchor: 'start',  dx: 10,  dy: -6 },
    'Hobbiton':     { anchor: 'end',    dx: -10, dy: 6 },
    'Bree':         { anchor: 'start',  dx: 10,  dy: -6 },
    'Isengard':     { anchor: 'start',  dx: 10,  dy: -6 },
    'Edoras':       { anchor: 'start',  dx: 10,  dy: 6 }
  };

  function renderMapCities(modal) {
    var svg = modal.querySelector('.map-svg');
    var group = svg.querySelector('#map-cities');
    group.innerHTML = '';
    var hourSeed = getHourSeed();
    var sel = currentSelection();
    for (var i = 0; i < cities.length; i++) {
      var c = cities[i];
      var cw = computeCityWeather(c, hourSeed, i);
      var px = c.x * MAP_VBW / 100;
      var py = c.y * MAP_VBH / 100;
      var isActive = c.name === sel.city.name;
      var g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      g.setAttribute('class',
        'map-city' +
        (c.region === 'mordor' ? ' map-city--mordor' : '') +
        (isActive ? ' map-city--active' : '')
      );
      g.setAttribute('data-city', c.name);

      var ov = LABEL_OVERRIDE[c.name];
      var anchor = ov ? ov.anchor : (c.x > 60 ? 'end' : 'start');
      var dx = ov ? ov.dx : (c.x > 60 ? -8 : 8);
      var dy = ov ? ov.dy : -6;

      g.innerHTML =
        '<circle class="map-city__dot" cx="' + px + '" cy="' + py + '" r="6"/>' +
        '<text class="map-city__label" x="' + (px + dx) + '" y="' + (py + dy) + '" text-anchor="' + anchor + '">' +
          escapeXML(c.name) +
        '</text>' +
        '<text class="map-city__meta" x="' + (px + dx) + '" y="' + (py + dy + 14) + '" text-anchor="' + anchor + '">' +
          cw.weather.icon + ' ' + cw.temp + '°' +
        '</text>';
      g.addEventListener('click', pickCity);
      group.appendChild(g);
    }
  }

  function pickCity(e) {
    var g = e.currentTarget;
    var name = g.getAttribute('data-city');
    writeOverride(name);
    applySelection();
    var modal = document.getElementById('map-modal');
    if (modal) renderMapCities(modal);
    closeMapModal();
  }

  function escapeXML(s) {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  // === Weather Particles ===
  function startWeatherParticles(type) {
    var prev = document.getElementById('weather-particles');
    if (prev) prev.parentNode.removeChild(prev);

    var canvas = document.createElement('canvas');
    canvas.id = 'weather-particles';
    document.body.appendChild(canvas);
    var ctx = canvas.getContext('2d');
    var particles = [];
    var rafId = null;
    var stopped = false;

    var snowColW = 8;
    var snowColumns = null;
    var waterLevel = 0;
    var maxWaterLevel = 55;
    var splashes = [];
    var grassBlades = [];
    var flowers = [];
    var trees = [];
    var butterflies = [];
    var lavaLevel = 0;
    var maxLavaLevel = 65;
    var embers = [];

    function resize() {
      var oldW = canvas.width;
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      if (type === 'snow') {
        var newLen = Math.ceil(canvas.width / snowColW);
        if (!snowColumns) {
          snowColumns = new Array(newLen);
          for (var k = 0; k < newLen; k++) snowColumns[k] = 0;
        } else if (snowColumns.length !== newLen) {
          var oldArr = snowColumns;
          var oldLen = oldArr.length;
          snowColumns = new Array(newLen);
          for (var k2 = 0; k2 < newLen; k2++) {
            var src = Math.floor(k2 * oldLen / newLen);
            snowColumns[k2] = oldArr[src] || 0;
          }
        }
      }
    }
    resize();
    window.addEventListener('resize', resize);

    var count = type === 'snow' ? 80
              : type === 'rain' ? 150
              : type === 'thunder' ? 100
              : type === 'lava' ? 110
              : type === 'wind' ? 80
              : 0;
    for (var i = 0; i < count; i++) {
      particles.push(createParticle(type, true));
    }

    function createButterfly() {
      var side = Math.random() < 0.5 ? -1 : 1;
      return {
        x: side > 0 ? -20 : canvas.width + 20,
        y: canvas.height * (0.35 + Math.random() * 0.4),
        vx: side * (0.4 + Math.random() * 0.7),
        bobPhase: Math.random() * Math.PI * 2,
        bobSpd: 0.025 + Math.random() * 0.025,
        bobAmp: 6 + Math.random() * 10,
        wingPhase: Math.random() * Math.PI * 2,
        wingSpd: 0.35 + Math.random() * 0.2,
        size: 4 + Math.random() * 3,
        hue: [340, 45, 200, 280, 20, 320][Math.floor(Math.random() * 6)]
      };
    }

    if (type === 'grass' || type === 'sparse') {
      var isFull = (type === 'grass');
      var density = isFull ? 1.0 : 0.35;
      var growMult = isFull ? 1.0 : 0.4;

      var bladeCount = Math.floor((30 + canvas.width / 24) * density);
      for (var gi = 0; gi < bladeCount; gi++) {
        var bladeLeaves = [];
        // 60-80% chance of a lower side leaf
        if (Math.random() < 0.75) {
          bladeLeaves.push({
            at: 0.4 + Math.random() * 0.15,
            side: Math.random() < 0.5 ? -1 : 1,
            len: 4 + Math.random() * 3.5,
            curve: 0.5 + Math.random() * 0.4
          });
        }
        // 50% chance of a second higher side leaf
        if (Math.random() < 0.55) {
          bladeLeaves.push({
            at: 0.68 + Math.random() * 0.12,
            side: Math.random() < 0.5 ? -1 : 1,
            len: 3 + Math.random() * 3,
            curve: 0.4 + Math.random() * 0.3
          });
        }
        grassBlades.push({
          x: Math.random() * canvas.width,
          target: 22 + Math.random() * 40,
          current: 0,
          growSpeed: (0.06 + Math.random() * 0.08) * growMult,
          swayPhase: Math.random() * Math.PI * 2,
          swayAmp: 1.5 + Math.random() * 2,
          lean: (Math.random() - 0.5) * 0.35,
          hue: 90 + Math.random() * 40,
          sat: 45 + Math.random() * 20,
          light: 38 + Math.random() * 15,
          leaves: bladeLeaves,
          tipStyle: ['fork','seed','thin','fork'][Math.floor(Math.random() * 4)]
        });
      }

      var flowerCount = Math.floor((6 + canvas.width / 260) * density);
      var flowerHues = [340, 45, 280, 15, 200, 320];
      for (var fi = 0; fi < flowerCount; fi++) {
        flowers.push({
          x: Math.random() * canvas.width,
          target: 3 + Math.random() * 2.5,
          current: 0,
          stemHeight: 22 + Math.random() * 20,
          stemCurrent: 0,
          growSpeed: (0.08 + Math.random() * 0.06) * growMult,
          hue: flowerHues[Math.floor(Math.random() * flowerHues.length)],
          swayPhase: Math.random() * Math.PI * 2
        });
      }

      if (isFull) {
        var treeCount = 2 + Math.floor(canvas.width / 640);
        for (var ti = 0; ti < treeCount; ti++) {
          trees.push({
            x: 60 + Math.random() * (canvas.width - 120),
            target: 58 + Math.random() * 42,
            current: 0,
            growSpeed: 0.03 + Math.random() * 0.025,
            trunkHue: 22 + Math.random() * 14,
            canopyHue: 90 + Math.random() * 40,
            blobs: [
              { dx: 0,   dy: -8, r: 22 },
              { dx: -14, dy: 2,  r: 16 },
              { dx: 14,  dy: 2,  r: 16 },
              { dx: -7,  dy: -16,r: 14 },
              { dx: 8,   dy: -16,r: 14 }
            ],
            swayPhase: Math.random() * Math.PI * 2
          });
        }
        var bcCount = 2 + Math.floor(Math.random() * 2);
        for (var bfi = 0; bfi < bcCount; bfi++) {
          butterflies.push(createButterfly());
        }
      }
    }

    var bolts = [];

    function createSplash(x, y) {
      var num = 3 + Math.floor(Math.random() * 3);
      for (var k = 0; k < num; k++) {
        splashes.push({
          x: x + (Math.random() - 0.5) * 4,
          y: y,
          vx: (Math.random() - 0.5) * 3.5,
          vy: -1.5 - Math.random() * 2.5,
          life: 18,
          maxLife: 18
        });
      }
    }

    function drawSplashes() {
      for (var s = splashes.length - 1; s >= 0; s--) {
        var sp = splashes[s];
        sp.x += sp.vx;
        sp.y += sp.vy;
        sp.vy += 0.28;
        sp.life--;
        var a = sp.life / sp.maxLife;
        ctx.fillStyle = 'rgba(174,194,224,' + (a * 0.75) + ')';
        ctx.fillRect(sp.x, sp.y, 1.6, 1.6);
        if (sp.life <= 0 || sp.y > canvas.height) splashes.splice(s, 1);
      }
    }

    function drawWater() {
      if (waterLevel < 0.4) return;
      var baseY = canvas.height - waterLevel;
      var t = performance.now() / 1000;
      ctx.beginPath();
      ctx.moveTo(0, canvas.height);
      ctx.lineTo(0, baseY);
      for (var x = 0; x <= canvas.width; x += 6) {
        var wave = Math.sin(x * 0.018 + t * 1.8) * 1.4
                 + Math.sin(x * 0.05 + t * 0.9) * 0.7;
        ctx.lineTo(x, baseY + wave);
      }
      ctx.lineTo(canvas.width, canvas.height);
      ctx.closePath();
      var grad = ctx.createLinearGradient(0, baseY - 6, 0, canvas.height);
      grad.addColorStop(0, 'rgba(120,150,200,0.55)');
      grad.addColorStop(1, 'rgba(60,90,140,0.32)');
      ctx.fillStyle = grad;
      ctx.fill();
      ctx.strokeStyle = 'rgba(210,225,255,0.28)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (var x2 = 0; x2 <= canvas.width; x2 += 6) {
        var wave2 = Math.sin(x2 * 0.018 + t * 1.8) * 1.4
                  + Math.sin(x2 * 0.05 + t * 0.9) * 0.7;
        if (x2 === 0) ctx.moveTo(x2, baseY + wave2);
        else ctx.lineTo(x2, baseY + wave2);
      }
      ctx.stroke();
    }

    function drawSnowPile() {
      if (!snowColumns) return;
      ctx.beginPath();
      ctx.moveTo(0, canvas.height);
      for (var c = 0; c < snowColumns.length; c++) {
        var x = c * snowColW;
        var h = snowColumns[c];
        var left = snowColumns[c - 1];
        var right = snowColumns[c + 1];
        if (left === undefined) left = h;
        if (right === undefined) right = h;
        h = (left + h * 2 + right) / 4;
        ctx.lineTo(x, canvas.height - h);
      }
      ctx.lineTo(canvas.width, canvas.height);
      ctx.closePath();
      var grad = ctx.createLinearGradient(0, canvas.height - 80, 0, canvas.height);
      grad.addColorStop(0, 'rgba(255,255,255,0.94)');
      grad.addColorStop(1, 'rgba(220,232,248,0.72)');
      ctx.fillStyle = grad;
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.7)';
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    function spawnEmber(x, y) {
      embers.push({
        x: x + (Math.random() - 0.5) * 6,
        y: y,
        vx: (Math.random() - 0.5) * 0.8,
        vy: -1.2 - Math.random() * 1.8,
        life: 40 + Math.floor(Math.random() * 30),
        maxLife: 60,
        r: 1 + Math.random() * 1.4
      });
    }
    function drawEmbers() {
      for (var e = embers.length - 1; e >= 0; e--) {
        var em = embers[e];
        em.x += em.vx;
        em.y += em.vy;
        em.vy += 0.008;
        em.life--;
        var a = Math.max(0, em.life / em.maxLife);
        ctx.beginPath();
        ctx.arc(em.x, em.y, em.r, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255,' + Math.floor(120 + a * 80) + ',60,' + (a * 0.9) + ')';
        ctx.fill();
        if (em.life <= 0) embers.splice(e, 1);
      }
    }
    function drawLava() {
      if (lavaLevel < 0.4) return;
      var baseY = canvas.height - lavaLevel;
      var t = performance.now() / 1000;
      ctx.beginPath();
      ctx.moveTo(0, canvas.height);
      ctx.lineTo(0, baseY);
      for (var x = 0; x <= canvas.width; x += 6) {
        var wave = Math.sin(x * 0.02 + t * 1.4) * 1.6
                 + Math.sin(x * 0.06 + t * 2.1) * 0.9;
        ctx.lineTo(x, baseY + wave);
      }
      ctx.lineTo(canvas.width, canvas.height);
      ctx.closePath();
      var grad = ctx.createLinearGradient(0, baseY - 8, 0, canvas.height);
      grad.addColorStop(0, 'rgba(255,180,60,0.92)');
      grad.addColorStop(0.4, 'rgba(230,90,30,0.9)');
      grad.addColorStop(1, 'rgba(120,20,10,0.85)');
      ctx.fillStyle = grad;
      ctx.fill();
      // pulsing bright surface stroke
      var pulse = 0.55 + Math.sin(t * 3) * 0.15;
      ctx.strokeStyle = 'rgba(255,220,140,' + pulse + ')';
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      for (var x2 = 0; x2 <= canvas.width; x2 += 6) {
        var wave2 = Math.sin(x2 * 0.02 + t * 1.4) * 1.6
                  + Math.sin(x2 * 0.06 + t * 2.1) * 0.9;
        if (x2 === 0) ctx.moveTo(x2, baseY + wave2);
        else ctx.lineTo(x2, baseY + wave2);
      }
      ctx.stroke();
      // occasional spawn embers from surface
      if (Math.random() < 0.35) {
        spawnEmber(Math.random() * canvas.width, baseY);
      }
    }

    function drawGrass() {
      var t = performance.now() / 1000;
      for (var b = 0; b < grassBlades.length; b++) {
        var bl = grassBlades[b];
        if (bl.current < bl.target) bl.current += bl.growSpeed;
        var sway = Math.sin(t * 1.1 + bl.swayPhase) * bl.swayAmp
                 + bl.lean * bl.current * 0.35;
        var baseY = canvas.height;
        var topX = bl.x + sway;
        var topY = canvas.height - bl.current;
        var midX = bl.x + sway * 0.5;
        var midY = baseY - bl.current * 0.55;

        var color = 'hsla(' + bl.hue + ',' + bl.sat + '%,' + bl.light + '%,0.82)';
        var deep = 'hsla(' + bl.hue + ',' + bl.sat + '%,' + Math.max(20, bl.light - 12) + '%,0.85)';

        ctx.beginPath();
        ctx.moveTo(bl.x, baseY);
        ctx.quadraticCurveTo(midX, midY, topX, topY);
        ctx.strokeStyle = color;
        ctx.lineWidth = 1.4;
        ctx.lineCap = 'round';
        ctx.stroke();

        var progress = bl.current / bl.target;
        for (var li = 0; li < bl.leaves.length; li++) {
          var leaf = bl.leaves[li];
          if (progress < leaf.at) continue;
          var q = leaf.at;
          var qx = (1 - q) * (1 - q) * bl.x + 2 * (1 - q) * q * midX + q * q * topX;
          var qy = (1 - q) * (1 - q) * baseY + 2 * (1 - q) * q * midY + q * q * topY;
          var appear = Math.min(1, (progress - leaf.at) / 0.12);
          var lenNow = leaf.len * appear;
          var dirX = leaf.side * lenNow;
          var dirY = -lenNow * leaf.curve;
          var endX = qx + dirX;
          var endY = qy + dirY;
          var ctrlX = qx + dirX * 0.45;
          var ctrlY = qy + dirY * 1.4;
          ctx.beginPath();
          ctx.moveTo(qx, qy);
          ctx.quadraticCurveTo(ctrlX, ctrlY, endX, endY);
          ctx.strokeStyle = deep;
          ctx.lineWidth = 1;
          ctx.stroke();
        }

        if (progress >= 0.9) {
          if (bl.tipStyle === 'fork') {
            var forkAppear = Math.min(1, (progress - 0.9) / 0.1);
            var forkLen = 4 * forkAppear;
            ctx.strokeStyle = color;
            ctx.lineWidth = 1;
            ctx.lineCap = 'round';
            ctx.beginPath();
            ctx.moveTo(topX, topY);
            ctx.lineTo(topX - forkLen * 0.7, topY - forkLen);
            ctx.moveTo(topX, topY);
            ctx.lineTo(topX + forkLen * 0.7, topY - forkLen);
            ctx.stroke();
          } else if (bl.tipStyle === 'seed') {
            ctx.fillStyle = deep;
            ctx.beginPath();
            ctx.ellipse(topX, topY - 2, 1.3, 2.2, 0, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }
    }

    function drawFlowers() {
      var t = performance.now() / 1000;
      for (var f = 0; f < flowers.length; f++) {
        var fl = flowers[f];
        if (fl.stemCurrent < fl.stemHeight) fl.stemCurrent += fl.growSpeed * 3;
        if (fl.stemCurrent >= fl.stemHeight * 0.85 && fl.current < fl.target) {
          fl.current += fl.growSpeed * 0.5;
        }
        var sway = Math.sin(t * 0.9 + fl.swayPhase) * 1.4;
        var stemBase = canvas.height;
        var stemTop = canvas.height - fl.stemCurrent;
        ctx.strokeStyle = 'hsla(100,50%,32%,0.85)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(fl.x, stemBase);
        ctx.quadraticCurveTo(
          fl.x + sway * 0.5, stemBase - fl.stemCurrent * 0.5,
          fl.x + sway, stemTop
        );
        ctx.stroke();
        if (fl.current > 0.4) {
          var cx = fl.x + sway;
          var cy = stemTop;
          var r = fl.current;
          for (var pi = 0; pi < 5; pi++) {
            var ang = pi * (Math.PI * 2 / 5) - Math.PI / 2;
            ctx.save();
            ctx.translate(cx + Math.cos(ang) * r * 0.7, cy + Math.sin(ang) * r * 0.7);
            ctx.rotate(ang);
            ctx.fillStyle = 'hsla(' + fl.hue + ',78%,68%,0.92)';
            ctx.beginPath();
            ctx.ellipse(0, 0, r * 0.9, r * 0.55, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
          }
          ctx.fillStyle = 'hsla(50,85%,55%,1)';
          ctx.beginPath();
          ctx.arc(cx, cy, r * 0.38, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }

    function drawTrees() {
      var t = performance.now() / 1000;
      for (var tr = 0; tr < trees.length; tr++) {
        var tree = trees[tr];
        if (tree.current < tree.target) tree.current += tree.growSpeed;
        var h = tree.current;
        if (h < 3) continue;
        var sway = Math.sin(t * 0.55 + tree.swayPhase) * 0.9;
        var baseY = canvas.height;
        var topX = tree.x + sway;
        var topY = baseY - h;
        ctx.strokeStyle = 'hsla(' + tree.trunkHue + ',45%,26%,0.92)';
        ctx.lineWidth = 5;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(tree.x, baseY);
        ctx.quadraticCurveTo(tree.x + sway * 0.4, baseY - h * 0.6, topX, topY);
        ctx.stroke();
        var canopyScale = Math.min(1, h / tree.target);
        var canopyR = Math.min(h * 0.55, 30) * canopyScale;
        if (canopyR > 4) {
          var s = canopyR / 22;
          for (var bi = 0; bi < tree.blobs.length; bi++) {
            var blob = tree.blobs[bi];
            ctx.fillStyle = 'hsla(' + tree.canopyHue + ',55%,30%,0.9)';
            ctx.beginPath();
            ctx.arc(topX + blob.dx * s, topY + blob.dy * s, blob.r * s, 0, Math.PI * 2);
            ctx.fill();
          }
          for (var bi2 = 0; bi2 < 3; bi2++) {
            ctx.fillStyle = 'hsla(' + tree.canopyHue + ',60%,44%,0.55)';
            ctx.beginPath();
            ctx.arc(topX + (bi2 - 1) * 8 * s, topY - 8 * s, 5 * s, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }
    }

    function drawButterflies() {
      for (var bi = butterflies.length - 1; bi >= 0; bi--) {
        var bt = butterflies[bi];
        bt.x += bt.vx;
        bt.bobPhase += bt.bobSpd;
        bt.wingPhase += bt.wingSpd;
        var y = bt.y + Math.sin(bt.bobPhase) * bt.bobAmp;
        var wingScale = Math.abs(Math.sin(bt.wingPhase)) * 0.7 + 0.3;
        var dir = bt.vx > 0 ? 1 : -1;
        ctx.save();
        ctx.translate(bt.x, y);
        ctx.scale(dir, 1);
        ctx.fillStyle = 'rgba(30,22,18,0.9)';
        ctx.beginPath();
        ctx.ellipse(0, 0, 1, bt.size * 0.55, 0, 0, Math.PI * 2);
        ctx.fill();
        var wc = 'hsla(' + bt.hue + ',78%,62%,0.88)';
        var wd = 'hsla(' + bt.hue + ',78%,45%,0.92)';
        for (var ws = -1; ws <= 1; ws += 2) {
          ctx.fillStyle = wc;
          ctx.beginPath();
          ctx.ellipse(ws * bt.size * wingScale * 0.7, -bt.size * 0.35,
            bt.size * wingScale * 0.9, bt.size * 0.7, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = wd;
          ctx.beginPath();
          ctx.ellipse(ws * bt.size * wingScale * 0.6, bt.size * 0.3,
            bt.size * wingScale * 0.65, bt.size * 0.5, 0, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
        if ((bt.vx > 0 && bt.x > canvas.width + 40) ||
            (bt.vx < 0 && bt.x < -40)) {
          butterflies[bi] = createButterfly();
        }
      }
    }

    function generateBolt() {
      var startX = canvas.width * (0.15 + Math.random() * 0.7);
      var endX = startX + (Math.random() - 0.5) * canvas.width * 0.4;
      var endY = canvas.height * (0.55 + Math.random() * 0.35);
      var segments = subdivide([{ x: startX, y: 0 }, { x: endX, y: endY }], 6, 90);
      var branches = [];
      for (var i = 1; i < segments.length - 1; i++) {
        if (Math.random() < 0.35) {
          var origin = segments[i];
          var dx = (Math.random() - 0.5) * 220;
          var dy = 60 + Math.random() * 140;
          var bend = subdivide(
            [origin, { x: origin.x + dx, y: origin.y + dy }],
            4, 45
          );
          branches.push(bend);
        }
      }
      bolts.push({ path: segments, branches: branches, life: 22, maxLife: 22 });
    }

    function subdivide(pts, depth, jitter) {
      if (depth === 0) return pts;
      var out = [pts[0]];
      for (var i = 0; i < pts.length - 1; i++) {
        var a = pts[i], b = pts[i + 1];
        var mx = (a.x + b.x) / 2 + (Math.random() - 0.5) * jitter;
        var my = (a.y + b.y) / 2 + (Math.random() - 0.5) * jitter * 0.4;
        out.push({ x: mx, y: my });
        out.push(b);
      }
      return subdivide(out, depth - 1, jitter * 0.55);
    }

    function drawPath(pts, alpha, width, color) {
      if (pts.length < 2) return;
      ctx.beginPath();
      ctx.moveTo(pts[0].x, pts[0].y);
      for (var i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
      ctx.strokeStyle = color.replace('ALPHA', alpha);
      ctx.lineWidth = width;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.stroke();
    }

    function drawBolt(b) {
      var t = b.life / b.maxLife;
      var head = b.path[Math.floor(b.path.length / 2)];
      var glow = ctx.createRadialGradient(
        head.x, head.y, 0,
        head.x, head.y, 320
      );
      glow.addColorStop(0, 'rgba(220,230,255,' + (0.32 * t) + ')');
      glow.addColorStop(0.5, 'rgba(180,200,240,' + (0.12 * t) + ')');
      glow.addColorStop(1, 'rgba(180,200,240,0)');
      ctx.fillStyle = glow;
      ctx.fillRect(head.x - 320, head.y - 320, 640, 640);

      drawPath(b.path, 0.35 * t, 9, 'rgba(180,200,255,ALPHA)');
      drawPath(b.path, 0.7 * t, 4, 'rgba(220,230,255,ALPHA)');
      drawPath(b.path, t, 1.2, 'rgba(255,255,255,ALPHA)');
      for (var i = 0; i < b.branches.length; i++) {
        drawPath(b.branches[i], 0.25 * t, 5, 'rgba(180,200,255,ALPHA)');
        drawPath(b.branches[i], 0.55 * t, 1.5, 'rgba(255,255,255,ALPHA)');
      }
    }

    function createParticle(t, init) {
      var p = {
        x: Math.random() * canvas.width,
        y: init ? Math.random() * canvas.height : -10
      };
      if (t === 'rain') {
        p.speed = 8 + Math.random() * 6;
        p.len = 15 + Math.random() * 10;
        p.opacity = 0.3 + Math.random() * 0.3;
      } else if (t === 'snow') {
        p.speed = 1 + Math.random() * 2;
        p.radius = 2 + Math.random() * 3;
        p.drift = (Math.random() - 0.5) * 0.5;
        p.opacity = 0.5 + Math.random() * 0.4;
      } else if (t === 'lava') {
        p.speed = 0.6 + Math.random() * 1.4;
        p.radius = 1.2 + Math.random() * 2.2;
        p.drift = (Math.random() - 0.5) * 0.9;
        p.wobble = Math.random() * Math.PI * 2;
        p.wobbleSpd = 0.02 + Math.random() * 0.03;
        p.hot = Math.random() < 0.25;
        p.opacity = 0.35 + Math.random() * 0.4;
      } else if (t === 'wind') {
        p.y = Math.random() * canvas.height;
        if (!init) p.x = -30;
        p.kind = Math.random() < 0.45 ? 'line' : 'leaf';
        if (p.kind === 'line') {
          p.vx = 8 + Math.random() * 6;
          p.vy = (Math.random() - 0.5) * 0.3;
          p.len = 40 + Math.random() * 80;
          p.opacity = 0.15 + Math.random() * 0.22;
        } else {
          p.vx = 3 + Math.random() * 3;
          p.vy = 0.15 + Math.random() * 0.6;
          p.rot = Math.random() * Math.PI * 2;
          p.rotSpd = (Math.random() - 0.5) * 0.15;
          p.wobble = Math.random() * Math.PI * 2;
          p.wobbleSpd = 0.04 + Math.random() * 0.06;
          p.size = 4 + Math.random() * 4;
          p.hue = 20 + Math.random() * 45;
          p.sat = 55 + Math.random() * 20;
          p.light = 32 + Math.random() * 18;
          p.opacity = 0.75 + Math.random() * 0.25;
        }
      } else {
        p.speed = 9 + Math.random() * 7;
        p.len = 15 + Math.random() * 12;
        p.opacity = 0.3 + Math.random() * 0.3;
      }
      return p;
    }

    function animate() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      if (type === 'thunder') {
        if (Math.random() < 0.004) generateBolt();
        for (var bi = bolts.length - 1; bi >= 0; bi--) {
          drawBolt(bolts[bi]);
          bolts[bi].life--;
          if (bolts[bi].life <= 0) bolts.splice(bi, 1);
        }
      }

      var waterLandY = canvas.height - waterLevel;
      var lavaLandY = canvas.height - lavaLevel;

      for (var i = 0; i < particles.length; i++) {
        var p = particles[i];
        if (type === 'wind') {
          p.x += p.vx;
          p.y += p.vy;
          if (p.kind === 'line') {
            ctx.strokeStyle = 'rgba(235,240,250,' + p.opacity + ')';
            ctx.lineWidth = 1;
            ctx.lineCap = 'round';
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(p.x + p.len, p.y);
            ctx.stroke();
          } else {
            p.wobble += p.wobbleSpd;
            p.rot += p.rotSpd;
            var yOsc = Math.sin(p.wobble) * 1.2;
            ctx.save();
            ctx.translate(p.x, p.y + yOsc);
            ctx.rotate(p.rot);
            ctx.fillStyle = 'hsla(' + p.hue + ',' + p.sat + '%,' + p.light + '%,' + p.opacity + ')';
            ctx.beginPath();
            ctx.ellipse(0, 0, p.size, p.size * 0.5, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = 'hsla(' + p.hue + ',' + p.sat + '%,' + (p.light - 18) + '%,0.7)';
            ctx.lineWidth = 0.6;
            ctx.beginPath();
            ctx.moveTo(-p.size, 0);
            ctx.lineTo(p.size, 0);
            ctx.stroke();
            ctx.restore();
          }
          if (p.x > canvas.width + 40 || p.y > canvas.height + 20) {
            particles[i] = createParticle(type, false);
          }
        } else if (type === 'lava') {
          p.wobble += p.wobbleSpd;
          p.x += p.drift + Math.sin(p.wobble) * 0.5;
          p.y += p.speed;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
          if (p.hot) {
            ctx.fillStyle = 'rgba(255,140,60,' + p.opacity + ')';
          } else {
            ctx.fillStyle = 'rgba(80,70,65,' + p.opacity + ')';
          }
          ctx.fill();
          if (p.y > lavaLandY) {
            if (p.hot) spawnEmber(p.x, lavaLandY);
            particles[i] = createParticle(type, false);
            particles[i].x = Math.random() * canvas.width;
          }
        } else if (type === 'snow') {
          p.y += p.speed;
          p.x += p.drift;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(255,255,255,' + p.opacity + ')';
          ctx.fill();

          var col = Math.floor(p.x / snowColW);
          if (col < 0) col = 0;
          if (col >= snowColumns.length) col = snowColumns.length - 1;
          var pileTop = canvas.height - snowColumns[col];
          if (p.y + p.radius > pileTop) {
            snowColumns[col] += 0.55;
            if (col > 0) snowColumns[col - 1] += 0.18;
            if (col < snowColumns.length - 1) snowColumns[col + 1] += 0.18;
            if (snowColumns[col] > 120) snowColumns[col] = 120;
            particles[i] = createParticle(type, false);
            particles[i].x = Math.random() * canvas.width;
          } else if (p.y > canvas.height) {
            particles[i] = createParticle(type, false);
            particles[i].x = Math.random() * canvas.width;
          }
        } else {
          p.y += p.speed;
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(p.x + 0.5, p.y + p.len);
          ctx.strokeStyle = 'rgba(174,194,224,' + p.opacity + ')';
          ctx.lineWidth = 1.5;
          ctx.stroke();

          if (p.y > waterLandY) {
            createSplash(p.x, waterLandY);
            particles[i] = createParticle(type, false);
            particles[i].x = Math.random() * canvas.width;
          }
        }
      }

      if (type === 'rain' || type === 'thunder') {
        var rate = type === 'thunder' ? 0.045 : 0.017;
        if (waterLevel < maxWaterLevel) waterLevel += rate;
        drawWater();
        drawSplashes();
      } else if (type === 'snow') {
        drawSnowPile();
      } else if (type === 'grass' || type === 'sparse') {
        drawTrees();
        drawGrass();
        drawFlowers();
        drawButterflies();
      } else if (type === 'lava') {
        if (lavaLevel < maxLavaLevel) lavaLevel += 0.028;
        drawLava();
        drawEmbers();
      }

      if (!stopped) rafId = requestAnimationFrame(animate);
    }
    animate();

    return {
      stop: function () {
        stopped = true;
        if (rafId) cancelAnimationFrame(rafId);
        window.removeEventListener('resize', resize);
        if (canvas.parentNode) canvas.parentNode.removeChild(canvas);
      }
    };
  }
})();