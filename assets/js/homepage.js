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
  var locations = [
    'Minas Tirith', 'Rivendell', 'Hobbiton', 'Lothlórien',
    'Edoras', 'Isengard', 'Dol Amroth', 'Bree',
    'Osgiliath', 'Pelargir', 'Erebor', 'Dale',
    'Mithlond', 'Annúminas', 'Fornost'
  ];

  var weatherTypes = [
    { name: 'Clear', icon: '☀', hasParticles: false },
    { name: 'Cloudy', icon: '☁', hasParticles: false },
    { name: 'Partly Cloudy', icon: '⛅', hasParticles: false },
    { name: 'Rain', icon: '🌧', hasParticles: true, particle: 'rain' },
    { name: 'Thunderstorm', icon: '⛈', hasParticles: true, particle: 'thunder' },
    { name: 'Snow', icon: '🌨', hasParticles: true, particle: 'snow' },
    { name: 'Fog', icon: '🌫', hasParticles: false },
    { name: 'Windy', icon: '💨', hasParticles: false }
  ];

  function seededRandom(seed) {
    var x = Math.sin(seed) * 10000;
    return x - Math.floor(x);
  }

  function getMiddleEarthWeather() {
    var now = new Date();
    var daySeed = now.getFullYear() * 10000 + (now.getMonth()+1) * 100 + now.getDate();
    var hourSeed = daySeed * 100 + Math.floor(now.getHours() / 3);

    var locIdx = Math.floor(seededRandom(daySeed) * locations.length);
    var worIdx = Math.floor(seededRandom(hourSeed + 1) * weatherTypes.length);

    var month = now.getMonth();
    if (month >= 11 || month <= 1) {
      if (seededRandom(hourSeed + 2) > 0.5) worIdx = 5;
    } else if (month >= 3 && month <= 5) {
      if (seededRandom(hourSeed + 2) > 0.7) worIdx = 3;
    }

    var baseTemp = 15;
    if (month >= 5 && month <= 8) baseTemp = 25;
    else if (month >= 11 || month <= 1) baseTemp = 2;
    else if (month >= 2 && month <= 4) baseTemp = 12;
    var temp = Math.round(baseTemp + (seededRandom(hourSeed + 3) - 0.5) * 14);

    return {
      location: locations[locIdx],
      weather: weatherTypes[worIdx],
      temp: temp
    };
  }

  var weatherEl = document.getElementById('me-weather');
  if (weatherEl) {
    var w = getMiddleEarthWeather();
    weatherEl.textContent = w.weather.icon + ' ' + w.location + ' ' + w.temp + '°C';
    weatherEl.title = w.weather.name + ' in ' + w.location;

    if (w.weather.hasParticles) {
      startWeatherParticles(w.weather.particle);
    }
  }

  // === Weather Particles ===
  function startWeatherParticles(type) {
    var canvas = document.createElement('canvas');
    canvas.id = 'weather-particles';
    document.body.appendChild(canvas);
    var ctx = canvas.getContext('2d');
    var particles = [];

    function resize() {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    }
    resize();
    window.addEventListener('resize', resize);

    var count = type === 'snow' ? 80 : type === 'rain' ? 150 : 100;
    for (var i = 0; i < count; i++) {
      particles.push(createParticle(type, true));
    }

    var bolts = [];

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

      for (var i = 0; i < particles.length; i++) {
        var p = particles[i];
        if (type === 'snow') {
          p.y += p.speed;
          p.x += p.drift;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(255,255,255,' + p.opacity + ')';
          ctx.fill();
        } else {
          p.y += p.speed;
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(p.x + 0.5, p.y + p.len);
          ctx.strokeStyle = 'rgba(174,194,224,' + p.opacity + ')';
          ctx.lineWidth = 1.5;
          ctx.stroke();
        }
        if (p.y > canvas.height) {
          particles[i] = createParticle(type, false);
          particles[i].x = Math.random() * canvas.width;
        }
      }
      requestAnimationFrame(animate);
    }
    animate();
  }
})();