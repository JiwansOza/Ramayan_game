// Lanka ki Chhatein: the rigged characters and their animation.
// hanuman.glb: the textured Hanuman, skinned to a 27-bone skeleton (Unreal-style names plus a five-bone tail), with
//   his gada parented to the right hand. 32 clips retargeted in Blender from Quaternius' Universal Animation Library (CC0).
// rakshasa.glb: a rakshasa built on Quaternius' Superhero base (CC0) with horns, tusks, crown, jewellery and a dhoti,
//   holding an axe, club or trishul and optionally a torch. 21 clips from the same library.
window.LankaActors = (function () {
  'use strict';
  let T;
  const cache = {};

  function load(url) {
    if (cache[url]) return cache[url];
    cache[url] = new Promise((ok, no) => new T.GLTFLoader().load(url, ok, undefined, no));
    return cache[url];
  }

  // ---------- an animation controller: weighted looping layer + one-shot actions on top ----------
  class Animator {
    constructor(root, clips) {
      this.mixer = new T.AnimationMixer(root);
      this.acts = {}; this.dur = {};
      for (const c of clips) {
        const a = this.mixer.clipAction(c); a.enabled = true; a.setEffectiveWeight(0); a.play();
        this.acts[c.name] = a; this.dur[c.name] = c.duration;
      }
      this.base = {}; this.cur = {};   // looping layer: target and current weights
      this.shot = null; this.fading = [];
      this.speed = {};
    }
    has(n) { return !!this.acts[n]; }
    // targets for the looping layer, e.g. { idle: 0.2, walk: 0.8 }
    setBase(map, scales) {
      for (const k in this.cur) if (!(k in map)) this.base[k] = 0;
      for (const k in map) { this.base[k] = map[k]; if (!(k in this.cur)) { this.cur[k] = 0; } }
      if (scales) for (const k in scales) if (this.acts[k]) this.acts[k].timeScale = scales[k];
    }
    // play a one-shot. o: { fade, speed, at (start time in s), hold, events: [[time, fn]], onEnd, out (fade-out time) }
    play(name, o = {}) {
      const a = this.acts[name]; if (!a) { if (o.onEnd) o.onEnd(); return null; }
      if (this.shot) { this.fading.push(this.shot); this.shot.fadeOut = Math.min(this.shot.fadeOut || 0.12, 0.12); this.shot.leaving = true; }
      a.reset(); a.setLoop(T.LoopOnce, 1); a.clampWhenFinished = true; a.timeScale = o.speed || 1; a.time = o.at || 0; a.play();
      this.shot = { name, a, w: o.fade === 0 ? 1 : 0, fade: o.fade == null ? 0.1 : o.fade, fadeOut: o.out == null ? 0.18 : o.out, hold: !!o.hold,
        events: (o.events || []).map((e) => ({ t: e[0], fn: e[1], done: false })), onEnd: o.onEnd, end: o.end || this.dur[name], leaving: false };
      return this.shot;
    }
    stop(fade = 0.15) { if (this.shot) { this.shot.leaving = true; this.shot.fadeOut = fade; this.fading.push(this.shot); this.shot = null; } }
    get busy() { return this.shot ? this.shot.name : null; }
    get progress() { return this.shot ? this.shot.a.time / this.shot.end : 1; }
    get time() { return this.shot ? this.shot.a.time : 0; }
    update(dt) {
      let sw = 0;
      const s = this.shot;
      if (s) {
        const t = s.a.time;
        for (const e of s.events) if (!e.done && t >= e.t) { e.done = true; e.fn(); }
        if (this.shot !== s) { /* an event started another one-shot */ }
        else {
          const left = (s.end - t) / Math.max(0.01, s.a.timeScale);
          s.w = Math.min(1, s.w + dt / Math.max(0.01, s.fade));
          if (!s.hold && left <= s.fadeOut) { s.leaving = true; this.fading.push(s); this.shot = null; if (s.onEnd) s.onEnd(); }
          else if (s.hold && t >= s.end - 1e-3 && s.onEnd && !s.ended) { s.ended = true; s.onEnd(); }
        }
      }
      for (let i = this.fading.length - 1; i >= 0; i--) {
        const f = this.fading[i];
        f.w -= dt / Math.max(0.01, f.fadeOut);
        if (f.w <= 0) { f.a.setEffectiveWeight(0); this.fading.splice(i, 1); }
      }
      if (this.shot) sw = this.shot.w;
      let fw = 0; for (const f of this.fading) fw = Math.max(fw, f.w);
      const baseK = Math.max(0, 1 - Math.max(sw, fw));
      const r = Math.min(1, dt * 10);
      for (const k in this.cur) {
        this.cur[k] += ((this.base[k] || 0) - this.cur[k]) * r;
        if (this.cur[k] < 0.001 && !(this.base[k] > 0)) this.cur[k] = 0;
        this.acts[k].setEffectiveWeight(this.cur[k] * baseK);
      }
      for (const f of this.fading) f.a.setEffectiveWeight(Math.max(0, f.w) * (1 - sw));
      if (this.shot) this.shot.a.setEffectiveWeight(sw);
      this.mixer.update(dt);
    }
  }

  // keep the materials looking right under the game's lights
  function tune(root, env, opt = {}) {
    root.traverse((o) => {
      if (!o.isMesh) return;
      o.castShadow = true; o.receiveShadow = !!opt.receive; o.frustumCulled = false;
      const ms = Array.isArray(o.material) ? o.material : [o.material];
      ms.forEach((m) => { if (env) { m.envMap = env; m.envMapIntensity = opt.envI || 0.5; } if (m.metalness > 0.9 && !m.metalnessMap) m.roughness = Math.max(m.roughness, 0.28); m.needsUpdate = true; });
    });
  }

  // ---------- Hanuman ----------
  async function hanuman(env) {
    const g = await load('assets/chars/hanuman.glb');
    const root = g.scene;
    tune(root, env, { envI: 0.45 });
    root.traverse((o) => { if (o.isMesh && o.material && o.material.map) { o.material.side = T.DoubleSide; } });
    const anim = new Animator(root, g.animations);
    const bone = (n) => root.getObjectByName(n);
    const tail = []; for (let i = 1; i <= 5; i++) { const b = bone('tail_0' + i); if (b) tail.push({ b, q: b.quaternion.clone() }); }
    const gada = root.getObjectByName('Gada');
    const handR = bone('hand_r'), handL = bone('hand_l'), head = bone('Head'), spine = bone('spine_03'), pelvis = bone('pelvis');
    const qs = new T.Quaternion(), eu = new T.Euler();
    // the tail is never in a clip: it sways by itself, lifts when running, curls up in the air
    function tailSway(t, run, air, swing) {
      tail.forEach((x, i) => {
        const k = (i + 1) / tail.length;
        eu.set(Math.sin(t * 1.6 - i * 0.7) * 0.08 + air * 0.18 - run * 0.1, Math.sin(t * 2.1 - i * 0.8) * (0.1 + 0.15 * run) + swing * k * 0.5, Math.sin(t * 1.3 - i * 0.5) * 0.06);
        x.b.quaternion.copy(x.q).multiply(qs.setFromEuler(eu));
      });
    }
    return { root, anim, gada, handR, handL, head, spine, pelvis, tailSway };
  }

  // ---------- rakshasa ----------
  const WEAPONS = ['W_Axe', 'W_Club', 'W_Trishul'];
  async function rakshasa(env, opt = {}) {
    const g = await load('assets/chars/rakshasa.glb');
    const root = T.SkeletonUtils.clone(g.scene);
    tune(root, env, { envI: 0.35 });
    const flashMats = [];
    root.traverse((o) => {
      if (!o.isMesh) return;
      if (Array.isArray(o.material)) o.material = o.material.map((m) => m.clone()); else o.material = o.material.clone();
      (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => { if (m.emissive) { m.userData.e0 = m.emissive.clone(); m.userData.ei = m.emissiveIntensity; flashMats.push(m); } });
    });
    const weapon = opt.weapon || 'W_Axe';
    WEAPONS.forEach((n) => { const w = root.getObjectByName(n); if (w) w.visible = n === weapon; });
    const torch = root.getObjectByName('W_Torch'); if (torch) torch.visible = !!opt.torch;
    const fire = root.getObjectByName('TorchFire');
    const anim = new Animator(root, g.animations);
    const head = root.getObjectByName('Head'), handR = root.getObjectByName('hand_r'), spine = root.getObjectByName('spine_03');
    if (opt.scale) root.scale.setScalar(opt.scale);
    // tint skin per guard so they are not all identical
    if (opt.tint) flashMats.forEach((m) => { if (m.map && m.color) m.color.multiply(new T.Color(opt.tint)); });
    function flash(k) { flashMats.forEach((m) => { m.emissive.copy(m.userData.e0).lerp(new T.Color('#ff6a3a'), k); m.emissiveIntensity = Math.max(m.userData.ei, k * 0.9); }); }
    function dissolve(k) { // sinking away: darken and fade
      root.traverse((o) => { if (!o.isMesh) return; (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => { m.transparent = k < 1; m.opacity = k; m.depthWrite = k > 0.5; }); });
    }
    return { root, anim, head, handR, spine, fire, torch, flash, dissolve };
  }

  // ---------- props ----------
  let props = null;
  async function loadProps() { if (!props) { const g = await load('assets/env/props.glb'); props = {}; g.scene.traverse((o) => { if (o.isMesh && o.name.startsWith('P_')) props[o.name.slice(2)] = o; }); } return props; }

  function init(three) { T = three; }
  return { init, load, hanuman, rakshasa, loadProps, Animator };
})();
