// Lanka ki Chhatein: sound.
// Every recording is CC0 and came from GitHub: Kenney's Impact Sounds (via Boyquotes/kenney-impact-sounds-for-godot),
// Meta's Open Sound pack (facebookincubator/Meta-open-sound) and the alvana-audio library (seyedpouramir/alvana-audio,
// music by HoliznaCC0). See assets/audio/CREDITS.md. A soft tanpura drone is synthesised on top.
window.LankaAudio = (function () {
  'use strict';
  const BASE = 'assets/audio/';
  // name -> number of variants (name1..nameN); 0 means a single file called name.ogg
  const SFX = {
    swing: 3, swing_heavy: 3, punch: 3, punch_hard: 3, metal: 3, thump: 3, clash: 0,
    r_hurt: 5, r_death: 3, r_laugh: 2, r_effort: 2, r_roar: 0, h_effort: 2, h_hurt: 2,
    step_concrete: 5, step_wood: 5, step_grass: 5, land: 2, land_soft: 0, bush: 3, cloth: 2,
    magic: 0, chime: 0, ui: 0, sting: 0, gong: 0, thunder: 0, bodyfall: 2, fruit_hit: 0,
  };
  const LOOPS = ['amb_night', 'crickets', 'rain', 'wind', 'water', 'flag', 'chimes'];
  const MUSIC = ['bgm_stealth', 'bgm_combat', 'bgm_title'];

  let ctx = null, master, sfxBus, musicBus, ambBus, musicLP, comp;
  const buffers = {};
  let muted = false, ready = false, loading = null;
  const listener = { x: 0, y: 0, z: 0, yaw: 0 };
  const loops = {};
  const music = {};
  let musicState = null;

  function init() {
    if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return loading; }
    try { ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return Promise.resolve(); }
    comp = ctx.createDynamicsCompressor(); comp.threshold.value = -14; comp.ratio.value = 4; comp.connect(ctx.destination);
    master = ctx.createGain(); master.gain.value = 0.9; master.connect(comp);
    sfxBus = ctx.createGain(); sfxBus.gain.value = 0.9; sfxBus.connect(master);
    ambBus = ctx.createGain(); ambBus.gain.value = 0.55; ambBus.connect(master);
    musicLP = ctx.createBiquadFilter(); musicLP.type = 'lowpass'; musicLP.frequency.value = 18000; musicLP.connect(master);
    musicBus = ctx.createGain(); musicBus.gain.value = 0.42; musicBus.connect(musicLP);
    drone();
    loading = loadAll();
    return loading;
  }

  async function fetchBuf(name) {
    try {
      const r = await fetch(BASE + name + '.ogg'); if (!r.ok) return;
      const ab = await r.arrayBuffer();
      buffers[name] = await new Promise((ok, no) => ctx.decodeAudioData(ab, ok, no));
    } catch (e) { /* a missing sound is not fatal */ }
  }
  async function loadAll() {
    const names = [];
    for (const k in SFX) { if (SFX[k]) for (let i = 1; i <= SFX[k]; i++) names.push(k + i); else names.push(k); }
    // ambience and music first, so the night is heard straight away
    await Promise.all(LOOPS.concat(['bgm_title']).map(fetchBuf));
    ready = true;
    startAmbience();
    await Promise.all(names.map(fetchBuf));
    await Promise.all(['bgm_stealth', 'bgm_combat'].map(fetchBuf));
    if (musicState) { const s = musicState; musicState = null; setMusic(s); }
  }

  // the tanpura: Sa and Pa with slow beating, very quiet, always under the music
  function drone() {
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 900; lp.connect(musicBus);
    const g = ctx.createGain(); g.gain.value = 0.05; g.connect(lp);
    [[65.4, 'sawtooth', 1], [98.0, 'sawtooth', 0.7], [130.8, 'triangle', 0.6], [196.0, 'sine', 0.25]].forEach(([f, t, v]) => {
      const o = ctx.createOscillator(); o.type = t; o.frequency.value = f;
      const og = ctx.createGain(); og.gain.value = v; o.connect(og); og.connect(g);
      const lfo = ctx.createOscillator(); lfo.frequency.value = 0.06 + Math.random() * 0.08;
      const lg = ctx.createGain(); lg.gain.value = 2.5; lfo.connect(lg); lg.connect(o.detune);
      o.start(); lfo.start();
    });
  }

  function pick(name) {
    if (buffers[name]) return buffers[name];
    const n = SFX[name]; if (!n) return null;
    const i = 1 + Math.floor(Math.random() * n); return buffers[name + i] || buffers[name + '1'];
  }

  // play a one-shot; pos (THREE.Vector3 or {x,y,z}) makes it fade with distance and pan left/right
  function play(name, opt = {}) {
    if (!ctx || muted || !ready) return;
    const b = pick(name); if (!b) return;
    const src = ctx.createBufferSource(); src.buffer = b;
    src.playbackRate.value = (opt.rate || 1) * (1 + (Math.random() - 0.5) * (opt.vary == null ? 0.12 : opt.vary));
    const g = ctx.createGain(); let vol = opt.vol == null ? 1 : opt.vol;
    let node = src;
    if (opt.pos) {
      const dx = opt.pos.x - listener.x, dy = opt.pos.y - listener.y, dz = opt.pos.z - listener.z;
      const d = Math.hypot(dx, dy, dz), ref = opt.ref || 4, max = opt.max || 40;
      if (d > max) return;
      vol *= Math.min(1, ref / Math.max(ref, d)) * (1 - d / max * 0.5);
      if (ctx.createStereoPanner) {
        const p = ctx.createStereoPanner();
        // listener yaw looks along (sin yaw, cos yaw); right is (-cos yaw, sin yaw)
        const rx = -Math.cos(listener.yaw), rz = Math.sin(listener.yaw);
        p.pan.value = Math.max(-0.85, Math.min(0.85, (dx * rx + dz * rz) / Math.max(1, d)));
        src.connect(p); node = p;
      }
    }
    g.gain.value = vol; node.connect(g); g.connect(opt.bus === 'amb' ? ambBus : sfxBus);
    src.start(ctx.currentTime + (opt.delay || 0));
    return src;
  }

  function loop(name, vol) {
    if (!ctx || !buffers[name]) return null;
    if (loops[name]) return loops[name];
    const src = ctx.createBufferSource(); src.buffer = buffers[name]; src.loop = true;
    const g = ctx.createGain(); g.gain.value = 0; src.connect(g); g.connect(ambBus); src.start(ctx.currentTime + Math.random() * 0.1);
    const h = { src, g, target: vol, set(v, t = 0.8) { this.target = v; g.gain.setTargetAtTime(v, ctx.currentTime, t / 3); } };
    h.set(vol, 1.5); loops[name] = h; return h;
  }
  function setLoop(name, vol, t) { const h = loops[name] || (vol > 0.001 ? loop(name, 0) : null); if (h) h.set(vol, t); }
  function startAmbience() { loop('amb_night', 0.5); loop('crickets', 0.35); loop('wind', 0.12); }

  // music: title, stealth and combat, crossfaded
  function setMusic(state) {
    if (!ctx) { musicState = state; return; }
    if (musicState === state) return;
    musicState = state;
    for (const k of MUSIC) {
      const want = k === 'bgm_' + state ? (state === 'combat' ? 0.95 : 0.8) : 0;
      if (!music[k] && want > 0 && buffers[k]) {
        const src = ctx.createBufferSource(); src.buffer = buffers[k]; src.loop = true;
        const g = ctx.createGain(); g.gain.value = 0; src.connect(g); g.connect(musicBus); src.start();
        music[k] = { src, g };
      }
      if (music[k]) music[k].g.gain.setTargetAtTime(want, ctx.currentTime, want > 0 ? 0.9 : 1.6);
    }
  }
  function muffle(on) { if (musicLP) musicLP.frequency.setTargetAtTime(on ? 700 : 18000, ctx.currentTime, 0.25); }
  function setMuted(m) { muted = m; if (master) master.gain.setTargetAtTime(m ? 0 : 0.9, ctx.currentTime, 0.05); }
  function setListener(x, y, z, yaw) { listener.x = x; listener.y = y; listener.z = z; listener.yaw = yaw; }

  // a tiny crackle for torches, made from noise
  let crackleT = 0;
  function crackle(dt, nearTorch) {
    if (!ctx || muted || !ready) return;
    crackleT -= dt;
    if (crackleT > 0 || nearTorch > 6) return;
    crackleT = 0.05 + Math.random() * 0.22;
    const len = 0.02 + Math.random() * 0.05, n = Math.floor(ctx.sampleRate * len), b = ctx.createBuffer(1, n, ctx.sampleRate), d = b.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 3);
    const s = ctx.createBufferSource(); s.buffer = b;
    const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 1200 + Math.random() * 2500; f.Q.value = 0.8;
    const g = ctx.createGain(); g.gain.value = 0.18 * (1 - nearTorch / 6) * (0.4 + Math.random() * 0.6);
    s.connect(f); f.connect(g); g.connect(ambBus); s.start();
  }

  return { init, play, setLoop, setMusic, muffle, setMuted, setListener, crackle, get muted() { return muted; }, get ready() { return ready; } };
})();
