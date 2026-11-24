// Procedural Sound System for Lanka ki Chhatein
// Zero paid dependencies, 100% Web Audio API synthesized audio (PlinkFX / sfxr inspired)
// Features authentic Indian Tanpura drone, atmospheric wind & crickets, footsteps, combat and interaction SFX

window.LankaSounds = (function () {
  'use strict';

  let ctx = null;
  let masterGain = null;
  let sfxGain = null;
  let bgmGain = null;
  let ambienceGain = null;

  let isMuted = false;
  let bgmRunning = false;
  let bgmNodes = [];
  let ambienceNodes = [];

  // Real Audio Assets cache
  const audioBuffers = {};
  const audioFiles = {
    footstepStone: 'assets/audio/footstep.ogg',
    footstepFoliage: 'assets/audio/footstep.ogg',
    jump: 'assets/audio/jump.ogg',
    land: 'assets/audio/land.ogg',
    landHeavy: 'assets/audio/land.ogg',
    fruitHitGround: 'assets/audio/hit.ogg',
    enemyHit: 'assets/audio/hit.ogg',
    chime: 'assets/audio/chime.ogg',
    deepLit: 'assets/audio/chime.ogg',
    pickup: 'assets/audio/chime.ogg',
    ambience: 'assets/audio/ambience.ogg'
  };

  function preloadAudio() {
    if (!ctx) return;
    Object.entries(audioFiles).forEach(([name, path]) => {
      fetch(path)
        .then(r => {
          if (!r.ok) throw new Error(r.status);
          return r.arrayBuffer();
        })
        .then(ab => ctx.decodeAudioData(ab))
        .then(buf => { audioBuffers[name] = buf; })
        .catch(() => {});
    });
  }

  function init(existingContext) {
    if (ctx) {
      if (ctx.state === 'suspended') ctx.resume();
      preloadAudio();
      return;
    }
    try {
      ctx = existingContext || new (window.AudioContext || window.webkitAudioContext)();
    } catch (e) {
      console.warn('AudioContext not supported');
      return;
    }

    masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(0.7, ctx.currentTime);
    masterGain.connect(ctx.destination);

    sfxGain = ctx.createGain();
    sfxGain.gain.setValueAtTime(0.8, ctx.currentTime);
    sfxGain.connect(masterGain);

    bgmGain = ctx.createGain();
    bgmGain.gain.setValueAtTime(0.35, ctx.currentTime);
    bgmGain.connect(masterGain);

    ambienceGain = ctx.createGain();
    ambienceGain.gain.setValueAtTime(0.25, ctx.currentTime);
    ambienceGain.connect(masterGain);

    preloadAudio();
  }

  function getCtx() {
    if (!ctx) init();
    if (ctx && ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  // --- Noise generator helper ---
  function createNoiseBuffer(duration, color = 'white') {
    const c = getCtx();
    if (!c) return null;
    const bufferSize = Math.floor(c.sampleRate * duration);
    const buffer = c.createBuffer(1, bufferSize, c.sampleRate);
    const data = buffer.getChannelData(0);
    let lastOut = 0.0;

    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      if (color === 'pink') {
        data[i] = (lastOut + 0.02 * white) / 1.02;
        lastOut = data[i];
      } else if (color === 'brown') {
        data[i] = (lastOut + 0.01 * white) / 1.01;
        lastOut = data[i];
      } else {
        data[i] = white;
      }
    }
    return buffer;
  }

  // --- Rich Tanpura-inspired BGM Drone (Sa - Pa tuning) ---
  function startBGM() {
    const c = getCtx();
    if (!c || bgmRunning) return;
    bgmRunning = true;

    // Fundamental frequencies for Indian classical night mood (Bhairav/Darbari mood: D / A)
    // Sa = 73.42 Hz (D2), Pa = 110 Hz (A2) with sub-harmonics & rich overtones
    const roots = [
      { f: 73.42, type: 'sawtooth', gain: 0.18, detune: -4, lfoF: 0.08, lfoDepth: 8 },
      { f: 73.42, type: 'sawtooth', gain: 0.18, detune: 4, lfoF: 0.09, lfoDepth: 8 },
      { f: 110.0, type: 'triangle', gain: 0.22, detune: 0, lfoF: 0.06, lfoDepth: 5 },
      { f: 146.83, type: 'sine', gain: 0.14, detune: 2, lfoF: 0.12, lfoDepth: 4 },
      { f: 220.0, type: 'sine', gain: 0.09, detune: -3, lfoF: 0.05, lfoDepth: 3 },
      { f: 293.66, type: 'triangle', gain: 0.06, detune: 1, lfoF: 0.07, lfoDepth: 2 }
    ];

    const filter = c.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(650, c.currentTime);
    filter.Q.setValueAtTime(2.5, c.currentTime);

    // Slow filter modulation for breathing drone feeling
    const filterLfo = c.createOscillator();
    filterLfo.frequency.setValueAtTime(0.04, c.currentTime);
    const filterLfoGain = c.createGain();
    filterLfoGain.gain.setValueAtTime(200, c.currentTime);
    filterLfo.connect(filterLfoGain);
    filterLfoGain.connect(filter.frequency);
    filterLfo.start();
    bgmNodes.push(filterLfo);

    roots.forEach(spec => {
      const osc = c.createOscillator();
      osc.type = spec.type;
      osc.frequency.setValueAtTime(spec.f, c.currentTime);
      osc.detune.setValueAtTime(spec.detune, c.currentTime);

      // Fine LFO detune
      const lfo = c.createOscillator();
      lfo.frequency.setValueAtTime(spec.lfoF, c.currentTime);
      const lg = c.createGain();
      lg.gain.setValueAtTime(spec.lfoDepth, c.currentTime);
      lfo.connect(lg);
      lg.connect(osc.detune);
      lfo.start();
      bgmNodes.push(lfo);

      const g = c.createGain();
      g.gain.setValueAtTime(spec.gain, c.currentTime);

      osc.connect(g);
      g.connect(filter);
      osc.start();
      bgmNodes.push(osc);
    });

    filter.connect(bgmGain);

    // Start night ambience (wind + crickets)
    startAmbience();
  }

  function stopBGM() {
    bgmNodes.forEach(node => {
      try { node.stop(); node.disconnect(); } catch (e) {}
    });
    bgmNodes = [];
    bgmRunning = false;
    stopAmbience();
  }

  // --- Ambient Night Wind & Crickets ---
  let cricketTimer = null;
  function startAmbience() {
    const c = getCtx();
    if (!c) return;

    // Wind synth using brownian noise buffer through resonant bandpass
    const windBuffer = createNoiseBuffer(4.0, 'brown');
    if (windBuffer) {
      const windSource = c.createBufferSource();
      windSource.buffer = windBuffer;
      windSource.loop = true;

      const windFilter = c.createBiquadFilter();
      windFilter.type = 'bandpass';
      windFilter.frequency.setValueAtTime(320, c.currentTime);
      windFilter.Q.setValueAtTime(2.0, c.currentTime);

      // Wind gust modulator
      const windLfo = c.createOscillator();
      windLfo.frequency.setValueAtTime(0.12, c.currentTime);
      const windLfoGain = c.createGain();
      windLfoGain.gain.setValueAtTime(220, c.currentTime);
      windLfo.connect(windLfoGain);
      windLfoGain.connect(windFilter.frequency);
      windLfo.start();

      const windVol = c.createGain();
      windVol.gain.setValueAtTime(0.4, c.currentTime);

      windSource.connect(windFilter);
      windFilter.connect(windVol);
      windVol.connect(ambienceGain);
      windSource.start();

      ambienceNodes.push(windSource, windLfo);
    }

    // Crickets chirp loop
    function scheduleCricket() {
      if (!bgmRunning) return;
      playCricketChirp();
      cricketTimer = setTimeout(scheduleCricket, 1800 + Math.random() * 3500);
    }
    scheduleCricket();
  }

  function stopAmbience() {
    if (cricketTimer) clearTimeout(cricketTimer);
    ambienceNodes.forEach(n => {
      try { n.stop(); n.disconnect(); } catch (e) {}
    });
    ambienceNodes = [];
  }

  function playCricketChirp() {
    const c = getCtx();
    if (!c || isMuted) return;
    const now = c.currentTime;
    const count = 3 + Math.floor(Math.random() * 4);
    const baseF = 4600 + Math.random() * 600;

    for (let i = 0; i < count; i++) {
      const t = now + i * 0.045;
      const osc = c.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(baseF, t);
      osc.frequency.exponentialRampToValueAtTime(baseF + 250, t + 0.025);

      const g = c.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(0.035, t + 0.008);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.035);

      osc.connect(g);
      g.connect(ambienceGain);
      osc.start(t);
      osc.stop(t + 0.04);
    }
  }

  // --- Sound Effects Generator ---
  function play(name, opts = {}) {
    const c = getCtx();
    if (!c || isMuted) return;

    // Check if pre-recorded audio buffer is loaded
    if (audioBuffers[name]) {
      try {
        const source = c.createBufferSource();
        source.buffer = audioBuffers[name];
        source.playbackRate.value = opts.pitch || (0.92 + Math.random() * 0.16);

        const gainNode = c.createGain();
        gainNode.gain.value = opts.vol != null ? opts.vol : 0.55;

        source.connect(gainNode);
        gainNode.connect(sfxGain);
        source.start();
        return;
      } catch (err) {}
    }

    const now = c.currentTime;

    switch (name) {
      // 1. Footstep Stone (short filtered click/tap with pitch variation)
      case 'footstepStone': {
        const pitch = opts.pitch || (0.9 + Math.random() * 0.25);
        const vol = (opts.vol || 0.12);

        const osc = c.createOscillator();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(140 * pitch, now);
        osc.frequency.exponentialRampToValueAtTime(45, now + 0.07);

        const noiseBuf = createNoiseBuffer(0.08, 'pink');
        const noise = c.createBufferSource();
        noise.buffer = noiseBuf;

        const filter = c.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(1200 * pitch, now);
        filter.Q.setValueAtTime(3.0, now);

        const g = c.createGain();
        g.gain.setValueAtTime(vol, now);
        g.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

        noise.connect(filter);
        filter.connect(g);
        osc.connect(g);
        g.connect(sfxGain);

        noise.start(now);
        osc.start(now);
        noise.stop(now + 0.08);
        osc.stop(now + 0.08);
        break;
      }

      // 2. Footstep Foliage / Bush
      case 'footstepFoliage': {
        const vol = (opts.vol || 0.15);
        const noiseBuf = createNoiseBuffer(0.12, 'white');
        const noise = c.createBufferSource();
        noise.buffer = noiseBuf;

        const filter = c.createBiquadFilter();
        filter.type = 'highpass';
        filter.frequency.setValueAtTime(1800, now);

        const g = c.createGain();
        g.gain.setValueAtTime(vol, now);
        g.gain.exponentialRampToValueAtTime(0.001, now + 0.11);

        noise.connect(filter);
        filter.connect(g);
        g.connect(sfxGain);

        noise.start(now);
        noise.stop(now + 0.12);
        break;
      }

      // 3. Jump Swoosh
      case 'jump': {
        const osc = c.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(120, now);
        osc.frequency.exponentialRampToValueAtTime(360, now + 0.18);

        const noise = c.createBufferSource();
        noise.buffer = createNoiseBuffer(0.2, 'pink');
        const filter = c.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(400, now);
        filter.frequency.exponentialRampToValueAtTime(1200, now + 0.18);
        filter.Q.setValueAtTime(1.5, now);

        const g = c.createGain();
        g.gain.setValueAtTime(0.001, now);
        g.gain.linearRampToValueAtTime(0.16, now + 0.04);
        g.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

        osc.connect(g);
        noise.connect(filter);
        filter.connect(g);
        g.connect(sfxGain);

        osc.start(now);
        noise.start(now);
        osc.stop(now + 0.2);
        noise.stop(now + 0.2);
        break;
      }

      // 4. Land Soft
      case 'land': {
        const osc = c.createOscillator();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(180, now);
        osc.frequency.exponentialRampToValueAtTime(50, now + 0.15);

        const g = c.createGain();
        g.gain.setValueAtTime(0.25, now);
        g.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

        osc.connect(g);
        g.connect(sfxGain);
        osc.start(now);
        osc.stop(now + 0.15);
        break;
      }

      // 5. Land Heavy / Impact
      case 'landHeavy': {
        const osc = c.createOscillator();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(160, now);
        osc.frequency.exponentialRampToValueAtTime(35, now + 0.28);

        const noise = c.createBufferSource();
        noise.buffer = createNoiseBuffer(0.25, 'brown');
        const filter = c.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(250, now);

        const g = c.createGain();
        g.gain.setValueAtTime(0.45, now);
        g.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

        osc.connect(g);
        noise.connect(filter);
        filter.connect(g);
        g.connect(sfxGain);

        osc.start(now);
        noise.start(now);
        osc.stop(now + 0.3);
        noise.stop(now + 0.3);
        break;
      }

      // 6. Throw Fruit (swoosh)
      case 'throw': {
        const noise = c.createBufferSource();
        noise.buffer = createNoiseBuffer(0.25, 'white');
        const filter = c.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(600, now);
        filter.frequency.exponentialRampToValueAtTime(1600, now + 0.12);
        filter.frequency.exponentialRampToValueAtTime(500, now + 0.24);
        filter.Q.setValueAtTime(2.5, now);

        const g = c.createGain();
        g.gain.setValueAtTime(0.001, now);
        g.gain.linearRampToValueAtTime(0.22, now + 0.05);
        g.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

        noise.connect(filter);
        filter.connect(g);
        g.connect(sfxGain);

        noise.start(now);
        noise.stop(now + 0.25);
        break;
      }

      // 7. Fruit Hit Ground / Wall
      case 'fruitHitGround': {
        const osc = c.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(260, now);
        osc.frequency.exponentialRampToValueAtTime(80, now + 0.12);

        const g = c.createGain();
        g.gain.setValueAtTime(0.25, now);
        g.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

        osc.connect(g);
        g.connect(sfxGain);
        osc.start(now);
        osc.stop(now + 0.12);
        break;
      }

      // 8. Fruit Hit Enemy (splat / bonk impact)
      case 'enemyHit': {
        // High impact bonk + wet splat
        const osc1 = c.createOscillator();
        osc1.type = 'triangle';
        osc1.frequency.setValueAtTime(420, now);
        osc1.frequency.exponentialRampToValueAtTime(75, now + 0.22);

        const noise = c.createBufferSource();
        noise.buffer = createNoiseBuffer(0.18, 'pink');
        const filter = c.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(850, now);
        filter.Q.setValueAtTime(1.8, now);

        const g = c.createGain();
        g.gain.setValueAtTime(0.4, now);
        g.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

        osc1.connect(g);
        noise.connect(filter);
        filter.connect(g);
        g.connect(sfxGain);

        osc1.start(now);
        noise.start(now);
        osc1.stop(now + 0.22);
        noise.stop(now + 0.22);
        break;
      }

      // 9. Enemy Stumble / Groan
      case 'enemyGroan': {
        const osc = c.createOscillator();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(110, now);
        osc.frequency.exponentialRampToValueAtTime(65, now + 0.45);

        const filter = c.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(380, now);

        const g = c.createGain();
        g.gain.setValueAtTime(0.3, now);
        g.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

        osc.connect(filter);
        filter.connect(g);
        g.connect(sfxGain);

        osc.start(now);
        osc.stop(now + 0.45);
        break;
      }

      // 10. Guard Alert / Shout
      case 'enemyAlert': {
        // Dramatic Indian trumpet / horn call (Kahal / Karnal horn emulation)
        const freqs = [196, 293.66, 392]; // G3, D4, G4
        freqs.forEach((f, i) => {
          const osc = c.createOscillator();
          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(f, now);
          osc.frequency.linearRampToValueAtTime(f * 1.08, now + 0.12);

          const filter = c.createBiquadFilter();
          filter.type = 'bandpass';
          filter.frequency.setValueAtTime(f * 2, now);
          filter.Q.setValueAtTime(3.5, now);

          const g = c.createGain();
          g.gain.setValueAtTime(0.001, now);
          g.gain.linearRampToValueAtTime(0.18, now + 0.05);
          g.gain.exponentialRampToValueAtTime(0.001, now + 0.55);

          osc.connect(filter);
          filter.connect(g);
          g.connect(sfxGain);

          osc.start(now);
          osc.stop(now + 0.55);
        });
        break;
      }

      // 11. Guard Suspicious "Huh?"
      case 'enemyCurious': {
        const osc = c.createOscillator();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(95, now);
        osc.frequency.linearRampToValueAtTime(145, now + 0.28);

        const g = c.createGain();
        g.gain.setValueAtTime(0.001, now);
        g.gain.linearRampToValueAtTime(0.2, now + 0.06);
        g.gain.exponentialRampToValueAtTime(0.001, now + 0.32);

        osc.connect(g);
        g.connect(sfxGain);
        osc.start(now);
        osc.stop(now + 0.32);
        break;
      }

      // 12. Guard Spear Attack Swoosh
      case 'spearSwing': {
        const noise = c.createBufferSource();
        noise.buffer = createNoiseBuffer(0.28, 'white');
        const filter = c.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(800, now);
        filter.frequency.exponentialRampToValueAtTime(2400, now + 0.12);
        filter.frequency.exponentialRampToValueAtTime(300, now + 0.28);
        filter.Q.setValueAtTime(3.5, now);

        const g = c.createGain();
        g.gain.setValueAtTime(0.001, now);
        g.gain.linearRampToValueAtTime(0.35, now + 0.08);
        g.gain.exponentialRampToValueAtTime(0.001, now + 0.28);

        noise.connect(filter);
        filter.connect(g);
        g.connect(sfxGain);

        noise.start(now);
        noise.stop(now + 0.28);
        break;
      }

      // 13. Deep Checkpoint Temple Bell (rich harmonics)
      case 'chime':
      case 'deepLit': {
        const bellHarmonics = [587.33, 880, 1174.66, 1760, 2349.32]; // D5 major harmonics
        const decays = [1.8, 1.4, 1.1, 0.8, 0.5];

        bellHarmonics.forEach((f, i) => {
          const osc = c.createOscillator();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(f, now);

          const g = c.createGain();
          g.gain.setValueAtTime(0.18 / (i + 1), now);
          g.gain.exponentialRampToValueAtTime(0.0001, now + decays[i]);

          osc.connect(g);
          g.connect(sfxGain);
          osc.start(now);
          osc.stop(now + decays[i]);
        });
        break;
      }

      // 14. Suspicion Sting / Detection
      case 'sting': {
        [220, 233.08, 311.13].forEach((f, i) => {
          const osc = c.createOscillator();
          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(f, now);

          const filter = c.createBiquadFilter();
          filter.type = 'lowpass';
          filter.frequency.setValueAtTime(1400, now);

          const g = c.createGain();
          g.gain.setValueAtTime(0.14, now);
          g.gain.exponentialRampToValueAtTime(0.001, now + 0.42);

          osc.connect(filter);
          filter.connect(g);
          g.connect(sfxGain);
          osc.start(now);
          osc.stop(now + 0.42);
        });
        break;
      }

      // 15. Caught / Defeat Doom Chord
      case 'caught': {
        const chord = [73.42, 87.31, 110.0, 146.83]; // D minor / ominous
        chord.forEach((f, i) => {
          const osc = c.createOscillator();
          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(f, now);
          osc.frequency.exponentialRampToValueAtTime(f * 0.94, now + 1.2);

          const filter = c.createBiquadFilter();
          filter.type = 'lowpass';
          filter.frequency.setValueAtTime(600, now);
          filter.frequency.exponentialRampToValueAtTime(120, now + 1.2);

          const g = c.createGain();
          g.gain.setValueAtTime(0.28, now);
          g.gain.exponentialRampToValueAtTime(0.0001, now + 1.2);

          osc.connect(filter);
          filter.connect(g);
          g.connect(sfxGain);
          osc.start(now);
          osc.stop(now + 1.2);
        });
        break;
      }

      // 16. Pickup / Fruit Basket
      case 'pickup': {
        [587.33, 739.99, 880, 1174.66].forEach((f, i) => {
          const t = now + i * 0.06;
          const osc = c.createOscillator();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(f, t);

          const g = c.createGain();
          g.gain.setValueAtTime(0.15, t);
          g.gain.exponentialRampToValueAtTime(0.001, t + 0.35);

          osc.connect(g);
          g.connect(sfxGain);
          osc.start(t);
          osc.stop(t + 0.35);
        });
        break;
      }

      // 17. Victory / Level Won
      case 'won': {
        // Joyous ascending Indian Raga fanfare
        const notes = [293.66, 369.99, 440, 554.37, 587.33, 739.99, 880];
        notes.forEach((f, i) => {
          const t = now + i * 0.12;
          const osc = c.createOscillator();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(f, t);

          const g = c.createGain();
          g.gain.setValueAtTime(0.2, t);
          g.gain.exponentialRampToValueAtTime(0.001, t + 1.4);

          osc.connect(g);
          g.connect(sfxGain);
          osc.start(t);
          osc.stop(t + 1.4);
        });
        break;
      }

      default:
        break;
    }
  }

  function setMuted(muted) {
    isMuted = muted;
    if (masterGain && ctx) {
      masterGain.gain.setValueAtTime(muted ? 0.0 : 0.7, ctx.currentTime);
    }
  }

  function toggleMute() {
    setMuted(!isMuted);
    return isMuted;
  }

  return {
    init,
    startBGM,
    stopBGM,
    play,
    setMuted,
    toggleMute,
    isMuted: () => isMuted
  };
})();
