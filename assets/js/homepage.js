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

    var flashTimer = 0;

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

      if (type === 'thunder' && flashTimer > 0) {
        ctx.fillStyle = 'rgba(255,255,255,' + (flashTimer * 0.15) + ')';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        flashTimer--;
      }
      if (type === 'thunder' && Math.random() < 0.005) {
        flashTimer = 4;
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