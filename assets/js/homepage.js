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
    { name: 'Mithlond',    x: 15, y: 27 },
    { name: 'Annúminas',   x: 22, y: 20 },
    { name: 'Fornost',     x: 27, y: 20 },
    { name: 'Hobbiton',    x: 25, y: 28 },
    { name: 'Bree',        x: 32, y: 29 },
    { name: 'Rivendell',   x: 42, y: 30 },
    { name: 'Erebor',      x: 78, y: 25 },
    { name: 'Dale',        x: 80, y: 23 },
    { name: 'Lothlórien',  x: 55, y: 48 },
    { name: 'Isengard',    x: 48, y: 63 },
    { name: 'Edoras',      x: 55, y: 68 },
    { name: 'Minas Tirith',x: 68, y: 70 },
    { name: 'Osgiliath',   x: 71, y: 71 },
    { name: 'Minas Morgul',x: 74, y: 72, region: 'mordor' },
    { name: 'Cirith Ungol',x: 76, y: 68, region: 'mordor' },
    { name: 'Orodruin',    x: 80, y: 71, region: 'mordor' },
    { name: 'Barad-dûr',   x: 85, y: 70, region: 'mordor' },
    { name: 'Dol Amroth',  x: 57, y: 83 },
    { name: 'Pelargir',    x: 68, y: 78 }
  ];

  var weatherTypes = {
    Clear:        { name: 'Clear',        icon: '☀', hasParticles: true,  particle: 'grass' },
    Cloudy:       { name: 'Cloudy',       icon: '☁', hasParticles: false },
    PartlyCloudy: { name: 'Partly Cloudy',icon: '⛅', hasParticles: false },
    Rain:         { name: 'Rain',         icon: '🌧', hasParticles: true,  particle: 'rain' },
    Thunderstorm: { name: 'Thunderstorm', icon: '⛈', hasParticles: true,  particle: 'thunder' },
    Snow:         { name: 'Snow',         icon: '🌨', hasParticles: true,  particle: 'snow' },
    Fog:          { name: 'Fog',          icon: '🌫', hasParticles: false },
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
          '<button class="map-modal__close" aria-label="关闭">×</button>' +
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
      if (e.key === 'Escape' && modal.classList.contains('open')) closeMapModal();
    });
    return modal;
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
    'Minas Morgul': { anchor: 'start', dx: 8,  dy: 2 },
    'Cirith Ungol': { anchor: 'end',   dx: -8, dy: -2 },
    'Orodruin':     { anchor: 'start', dx: 8,  dy: 14 },
    'Barad-dûr':    { anchor: 'start', dx: 8,  dy: -2 },
    'Osgiliath':    { anchor: 'start', dx: 8,  dy: 14 },
    'Minas Tirith': { anchor: 'end',   dx: -8, dy: -2 },
    'Dale':         { anchor: 'end',   dx: -8, dy: -2 },
    'Erebor':       { anchor: 'end',   dx: -8, dy: 14 },
    'Annúminas':    { anchor: 'end',   dx: -8, dy: -2 },
    'Fornost':      { anchor: 'start', dx: 8,  dy: -2 }
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

    if (type === 'grass') {
      var n = 30 + Math.floor(canvas.width / 24);
      for (var gi = 0; gi < n; gi++) {
        grassBlades.push({
          x: Math.random() * canvas.width,
          target: 22 + Math.random() * 40,
          current: 0,
          growSpeed: 0.06 + Math.random() * 0.08,
          swayPhase: Math.random() * Math.PI * 2,
          swayAmp: 1.5 + Math.random() * 2,
          lean: (Math.random() - 0.5) * 0.35,
          hue: 90 + Math.random() * 40,
          sat: 45 + Math.random() * 20,
          light: 38 + Math.random() * 15
        });
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
        ctx.beginPath();
        ctx.moveTo(bl.x, baseY);
        ctx.quadraticCurveTo(
          bl.x + sway * 0.5,
          baseY - bl.current * 0.55,
          topX,
          topY
        );
        ctx.strokeStyle = 'hsla(' + bl.hue + ',' + bl.sat + '%,' + bl.light + '%,0.78)';
        ctx.lineWidth = 1.4;
        ctx.lineCap = 'round';
        ctx.stroke();
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
      } else if (type === 'grass') {
        drawGrass();
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