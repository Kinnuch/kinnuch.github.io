/* Ambient weather sound synthesised with Web Audio.
   No external audio files: each weather type builds a small graph of
   noise + oscillators + filters that runs indefinitely at low volume.
   User can toggle on/off from the header button; preference persists. */
(function () {
  var STORAGE_KEY = 'weatherSoundOn';
  var MASTER_GAIN = 0.15; // ceiling for all voices combined

  var toggle = document.getElementById('sound-toggle');
  if (!toggle) return;

  var ctx = null;
  var master = null;
  var currentVoice = null;
  var currentType = null;

  var isOn = false;
  try { isOn = localStorage.getItem(STORAGE_KEY) === '1'; } catch (e) {}
  updateButton();

  toggle.addEventListener('click', function () {
    isOn = !isOn;
    try { localStorage.setItem(STORAGE_KEY, isOn ? '1' : '0'); } catch (e) {}
    updateButton();
    if (isOn) {
      ensureContext();
      if (currentType) startVoice(currentType);
    } else {
      stopVoice();
    }
  });

  // Public API: homepage.js will call this when weather changes.
  window.setWeatherSound = function (type) {
    currentType = type;
    if (!isOn) return;
    ensureContext();
    startVoice(type);
  };

  function updateButton() {
    // 🔊 U+1F50A when on, 🔇 U+1F507 when off
    toggle.innerHTML = isOn ? '&#128266;' : '&#128263;';
    toggle.setAttribute('aria-pressed', isOn ? 'true' : 'false');
    toggle.title = isOn ? 'Ambient sound on — click to mute'
                        : 'Ambient sound off — click to enable';
  }

  function ensureContext() {
    if (ctx) {
      if (ctx.state === 'suspended') ctx.resume();
      return;
    }
    var AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = 0;
    master.connect(ctx.destination);
    fadeTo(master.gain, MASTER_GAIN, 0.6);
  }

  function fadeTo(param, value, seconds) {
    if (!ctx) return;
    var now = ctx.currentTime;
    param.cancelScheduledValues(now);
    param.setValueAtTime(param.value, now);
    param.linearRampToValueAtTime(value, now + seconds);
  }

  function stopVoice() {
    if (!currentVoice) return;
    var v = currentVoice;
    currentVoice = null;
    if (ctx) {
      fadeTo(v.gain.gain, 0, 0.4);
      setTimeout(function () { v.dispose(); }, 500);
    } else {
      v.dispose();
    }
  }

  function startVoice(type) {
    if (!ctx) return;
    if (currentVoice && currentVoice.type === type) return;
    stopVoice();
    var v = buildVoice(type);
    if (!v) return;
    v.type = type;
    v.gain.gain.value = 0;
    v.gain.connect(master);
    fadeTo(v.gain.gain, 1, 0.8);
    currentVoice = v;
  }

  // === Voice builders ===
  // Each returns { gain, dispose }.

  function makeNoise(seconds) {
    var buf = ctx.createBuffer(1, ctx.sampleRate * seconds, ctx.sampleRate);
    var data = buf.getChannelData(0);
    for (var i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    var src = ctx.createBufferSource();
    src.buffer = buf;
    src.loop = true;
    src.start();
    return src;
  }

  function buildVoice(type) {
    switch (type) {
      case 'rain':    return voiceRain(0.55);
      case 'thunder': return voiceThunder();
      case 'snow':    return voiceSnow();
      case 'wind':    return voiceWind(1);
      case 'lava':    return voiceLava();
      case 'grass':   return voiceMeadow();
      case 'sparse':  return voiceBreeze();
      default:        return null;
    }
  }

  function voiceRain(intensity) {
    var g = ctx.createGain();
    var noise = makeNoise(2);
    var hp = ctx.createBiquadFilter();
    hp.type = 'highpass'; hp.frequency.value = 900;
    var lp = ctx.createBiquadFilter();
    lp.type = 'lowpass'; lp.frequency.value = 5000;
    var rainGain = ctx.createGain();
    rainGain.gain.value = 0.9 * intensity;
    noise.connect(hp).connect(lp).connect(rainGain).connect(g);
    return {
      gain: g,
      dispose: function () {
        try { noise.stop(); } catch (e) {}
        g.disconnect();
      }
    };
  }

  function voiceThunder() {
    var rain = voiceRain(0.85);
    var g = ctx.createGain();
    rain.gain.disconnect();
    rain.gain.connect(g);
    var rumbleTimers = [];
    function scheduleRumble() {
      var delay = 8 + Math.random() * 16;
      var t = setTimeout(function () {
        playRumble(g);
        scheduleRumble();
      }, delay * 1000);
      rumbleTimers.push(t);
    }
    scheduleRumble();
    return {
      gain: g,
      dispose: function () {
        rain.dispose();
        rumbleTimers.forEach(clearTimeout);
        g.disconnect();
      }
    };
  }

  function playRumble(dest) {
    var duration = 3 + Math.random() * 2.5;
    var noise = makeNoise(duration + 0.5);
    var lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 180 + Math.random() * 80;
    lp.Q.value = 0.7;
    var g = ctx.createGain();
    g.gain.value = 0;
    var now = ctx.currentTime;
    g.gain.linearRampToValueAtTime(0.9, now + 0.15);
    g.gain.linearRampToValueAtTime(0.4, now + duration * 0.4);
    g.gain.linearRampToValueAtTime(0, now + duration);
    noise.connect(lp).connect(g).connect(dest);
    setTimeout(function () {
      try { noise.stop(); } catch (e) {}
      g.disconnect();
    }, (duration + 0.5) * 1000);
  }

  function voiceSnow() {
    var g = ctx.createGain();
    var noise = makeNoise(3);
    var lp = ctx.createBiquadFilter();
    lp.type = 'lowpass'; lp.frequency.value = 500;
    var q = ctx.createGain();
    q.gain.value = 0.35;
    // Slow LFO on filter cutoff to breathe like distant wind
    var lfo = ctx.createOscillator();
    var lfoGain = ctx.createGain();
    lfo.frequency.value = 0.08;
    lfoGain.gain.value = 180;
    lfo.connect(lfoGain).connect(lp.frequency);
    lfo.start();
    noise.connect(lp).connect(q).connect(g);
    return {
      gain: g,
      dispose: function () {
        try { noise.stop(); lfo.stop(); } catch (e) {}
        g.disconnect();
      }
    };
  }

  function voiceWind(intensity) {
    var g = ctx.createGain();
    var noise = makeNoise(4);
    var bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 420;
    bp.Q.value = 1.2;
    var lfo = ctx.createOscillator();
    var lfoGain = ctx.createGain();
    lfo.frequency.value = 0.15;
    lfoGain.gain.value = 260;
    lfo.connect(lfoGain).connect(bp.frequency);
    lfo.start();
    var amp = ctx.createGain();
    amp.gain.value = 0.75 * intensity;
    var ampLfo = ctx.createOscillator();
    var ampLfoGain = ctx.createGain();
    ampLfo.frequency.value = 0.1;
    ampLfoGain.gain.value = 0.25;
    ampLfo.connect(ampLfoGain).connect(amp.gain);
    ampLfo.start();
    noise.connect(bp).connect(amp).connect(g);
    return {
      gain: g,
      dispose: function () {
        try { noise.stop(); lfo.stop(); ampLfo.stop(); } catch (e) {}
        g.disconnect();
      }
    };
  }

  function voiceLava() {
    var g = ctx.createGain();
    // Low bubbling: brown-ish noise low-passed hard + slow LFO
    var noise = makeNoise(3);
    var lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 220;
    var lp2 = ctx.createBiquadFilter();
    lp2.type = 'lowpass';
    lp2.frequency.value = 350;
    var lfo = ctx.createOscillator();
    var lfoGain = ctx.createGain();
    lfo.frequency.value = 0.4;
    lfoGain.gain.value = 90;
    lfo.connect(lfoGain).connect(lp.frequency);
    lfo.start();
    var amp = ctx.createGain();
    amp.gain.value = 0.9;
    noise.connect(lp).connect(lp2).connect(amp).connect(g);
    return {
      gain: g,
      dispose: function () {
        try { noise.stop(); lfo.stop(); } catch (e) {}
        g.disconnect();
      }
    };
  }

  function voiceMeadow() {
    var g = ctx.createGain();
    // Faint breeze + occasional chirp
    var breeze = voiceWind(0.35);
    breeze.gain.disconnect();
    breeze.gain.connect(g);
    var chirpTimers = [];
    function scheduleChirp() {
      var delay = 6 + Math.random() * 10;
      var t = setTimeout(function () {
        playChirp(g);
        scheduleChirp();
      }, delay * 1000);
      chirpTimers.push(t);
    }
    scheduleChirp();
    return {
      gain: g,
      dispose: function () {
        breeze.dispose();
        chirpTimers.forEach(clearTimeout);
        g.disconnect();
      }
    };
  }

  function playChirp(dest) {
    var burst = 2 + Math.floor(Math.random() * 3);
    var now = ctx.currentTime;
    for (var i = 0; i < burst; i++) {
      var start = now + i * 0.12;
      var osc = ctx.createOscillator();
      osc.type = 'triangle';
      var base = 2400 + Math.random() * 1200;
      osc.frequency.setValueAtTime(base, start);
      osc.frequency.exponentialRampToValueAtTime(base * 1.4, start + 0.05);
      osc.frequency.exponentialRampToValueAtTime(base * 0.7, start + 0.1);
      var g = ctx.createGain();
      g.gain.setValueAtTime(0, start);
      g.gain.linearRampToValueAtTime(0.08, start + 0.015);
      g.gain.exponentialRampToValueAtTime(0.001, start + 0.11);
      osc.connect(g).connect(dest);
      osc.start(start);
      osc.stop(start + 0.13);
    }
  }

  function voiceBreeze() {
    return voiceWind(0.45);
  }
})();
