// Lanka ki Chhatein: particles and weather.
// Two GPU point clouds (one additive for fire, sparks and magic; one alpha-blended for dust, smoke and leaves),
// expanding shockwave rings, rain streaks with splashes, lightning, and orbiting stun stars.
window.LankaFX = (function () {
  'use strict';
  let T, scene, camera;
  const N_ADD = 2600, N_ALPHA = 2600;
  let add, alpha;
  const rings = [];
  let rain = null, flash = null;
  let stars = [];

  const VERT = `
    attribute float size; attribute vec4 rgba; attribute float spin;
    varying vec4 vC; varying float vSpin;
    uniform float uScale;
    void main() {
      vC = rgba; vSpin = spin;
      vec4 mv = modelViewMatrix * vec4(position, 1.0);
      gl_PointSize = size * uScale / max(0.1, -mv.z);
      gl_Position = projectionMatrix * mv;
    }`;
  const FRAG = `
    varying vec4 vC; varying float vSpin;
    uniform float uSoft;
    void main() {
      vec2 p = gl_PointCoord - 0.5;
      float c = cos(vSpin), s = sin(vSpin); p = vec2(c * p.x - s * p.y, s * p.x + c * p.y);
      float d = length(p) * 2.0;
      float a = uSoft > 0.5 ? smoothstep(1.0, 0.0, d) * smoothstep(1.0, 0.55, d) * 1.4 : smoothstep(1.0, 0.2, d);
      // leaves and chips: a squashed shape
      if (vSpin > 50.0) { a = step(abs(p.x) * 2.2 + abs(p.y) * 0.9, 0.5); }
      gl_FragColor = vec4(vC.rgb, vC.a * a);
      if (gl_FragColor.a < 0.004) discard;
    }`;

  function makeCloud(n, blending, soft) {
    const g = new T.BufferGeometry();
    const pos = new Float32Array(n * 3), col = new Float32Array(n * 4), size = new Float32Array(n), spin = new Float32Array(n);
    g.setAttribute('position', new T.BufferAttribute(pos, 3).setUsage(T.DynamicDrawUsage));
    g.setAttribute('rgba', new T.BufferAttribute(col, 4).setUsage(T.DynamicDrawUsage));
    g.setAttribute('size', new T.BufferAttribute(size, 1).setUsage(T.DynamicDrawUsage));
    g.setAttribute('spin', new T.BufferAttribute(spin, 1).setUsage(T.DynamicDrawUsage));
    const m = new T.ShaderMaterial({ vertexShader: VERT, fragmentShader: FRAG, transparent: true, depthWrite: false, blending,
      uniforms: { uScale: { value: 600 }, uSoft: { value: soft ? 1 : 0 } } });
    const pts = new T.Points(g, m); pts.frustumCulled = false; pts.renderOrder = 3; scene.add(pts);
    const P = [];
    for (let i = 0; i < n; i++) P.push({ life: 0, max: 1, x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, g: 0, drag: 0, s0: 1, s1: 1, r: 1, gC: 1, b: 1, a0: 1, a1: 0, r1: null, sp: 0, vs: 0, leaf: false, floor: -1e9 });
    return { g, m, pts, P, n, next: 0, pos, col, size, spin };
  }

  function init(three, sc, cam) {
    T = three; scene = sc; camera = cam;
    add = makeCloud(N_ADD, T.AdditiveBlending, true);
    alpha = makeCloud(N_ALPHA, T.NormalBlending, true);
    initRain();
    flash = new T.HemisphereLight('#b8c4ff', '#30284a', 0); scene.add(flash);
  }
  function resize(h) { const s = h * 0.9; add.m.uniforms.uScale.value = s; alpha.m.uniforms.uScale.value = s; }

  const C = new (function () { this.set = null; })();
  function col(hex) { const c = new T.Color(hex); return [c.r, c.g, c.b]; }
  function emit(cloud, o) {
    const p = cloud.P[cloud.next]; cloud.next = (cloud.next + 1) % cloud.n;
    p.life = o.life; p.max = o.life; p.x = o.x; p.y = o.y; p.z = o.z; p.vx = o.vx || 0; p.vy = o.vy || 0; p.vz = o.vz || 0;
    p.g = o.g || 0; p.drag = o.drag || 0; p.s0 = o.s0; p.s1 = o.s1 == null ? o.s0 : o.s1;
    const c = o.c; p.r = c[0]; p.gC = c[1]; p.b = c[2]; p.r1 = o.c1 || null; p.a0 = o.a0 == null ? 1 : o.a0; p.a1 = o.a1 == null ? 0 : o.a1;
    p.sp = o.sp || Math.random() * 6; p.vs = o.vs || 0; p.leaf = !!o.leaf; p.floor = o.floor == null ? -1e9 : o.floor;
  }
  const R = (a, b) => a + Math.random() * (b - a);
  function sphere(s) { const u = Math.random() * 2 - 1, t = Math.random() * Math.PI * 2, r = Math.sqrt(1 - u * u); return [r * Math.cos(t) * s, u * s, r * Math.sin(t) * s]; }

  // ---------- effects ----------
  function dust(p, n = 8, k = 1, tint = '#8a7a74') {
    const c = col(tint);
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, sp = R(0.4, 1.4) * k;
      emit(alpha, { x: p.x + Math.cos(a) * 0.15, y: p.y + 0.05, z: p.z + Math.sin(a) * 0.15, vx: Math.cos(a) * sp, vy: R(0.2, 0.9) * k, vz: Math.sin(a) * sp, drag: 2.6, g: -0.3,
        life: R(0.5, 1.0) * (0.7 + k * 0.3), s0: R(0.25, 0.45) * k, s1: R(0.9, 1.6) * k, c, a0: 0.45, a1: 0 });
    }
  }
  function footstep(p, run) { dust(p, run ? 5 : 2, run ? 0.75 : 0.5); }
  function landing(p, heavy) {
    dust(p, heavy ? 26 : 14, heavy ? 1.5 : 1.0);
    ring(p, heavy ? 2.4 : 1.4, '#d8c8b0', heavy ? 0.55 : 0.35, 0.45);
  }
  function ring(p, radius, color, opacity = 0.6, dur = 0.5, y = 0.06, thick = 0.18) {
    let r = rings.find((x) => !x.on);
    if (!r) {
      const m = new T.Mesh(new T.RingGeometry(0.82, 1, 48), new T.MeshBasicMaterial({ transparent: true, depthWrite: false, side: T.DoubleSide, blending: T.AdditiveBlending }));
      m.rotation.x = -Math.PI / 2; m.renderOrder = 4; scene.add(m); r = { m }; rings.push(r);
    }
    r.on = true; r.t = 0; r.dur = dur; r.rad = radius; r.op = opacity; r.m.visible = true;
    r.m.material.color.set(color); r.m.position.set(p.x, p.y + y, p.z); r.m.scale.setScalar(0.1);
    return r;
  }
  // a fist or gada connecting with a rakshasa
  function hit(p, dir, heavy, gada) {
    const spark = col(gada ? '#ffd27a' : '#fff0c8'), hot = col('#ff7a2a');
    const n = gada ? (heavy ? 60 : 38) : (heavy ? 30 : 18);
    for (let i = 0; i < n; i++) {
      const s = sphere(R(2, gada ? 9 : 6));
      const vx = s[0] + (dir ? dir.x * 4 : 0), vz = s[2] + (dir ? dir.z * 4 : 0);
      emit(add, { x: p.x, y: p.y, z: p.z, vx, vy: s[1] + 2, vz, g: -14, drag: 1.5, life: R(0.18, 0.45), s0: R(0.06, 0.12), s1: 0.02, c: spark, c1: hot, a0: 1, a1: 0, floor: p.y - 1.6 });
    }
    // the burst of light at the impact
    emit(add, { x: p.x, y: p.y, z: p.z, life: 0.12, s0: gada ? 2.2 : 1.2, s1: gada ? 3.2 : 1.8, c: col('#ffe6b0'), a0: 0.9, a1: 0 });
    // dark ichor of the rakshasa (kept stylised: violet motes that drift and fade)
    for (let i = 0; i < (heavy ? 16 : 8); i++) {
      const s = sphere(R(0.8, 2.5));
      emit(alpha, { x: p.x, y: p.y, z: p.z, vx: s[0] + (dir ? dir.x * 1.5 : 0), vy: s[1] + 0.8, vz: s[2] + (dir ? dir.z * 1.5 : 0), g: -4, drag: 2, life: R(0.4, 0.8), s0: R(0.08, 0.16), s1: 0.03, c: col('#3a1446'), a0: 0.85, a1: 0 });
    }
    if (gada) ring({ x: p.x, y: p.y - 0.9, z: p.z }, heavy ? 3.2 : 2.0, '#ffcf6a', 0.7, 0.4);
  }
  // Hanuman takes a blow
  function hurt(p) {
    for (let i = 0; i < 22; i++) { const s = sphere(R(1.5, 4)); emit(add, { x: p.x, y: p.y, z: p.z, vx: s[0], vy: s[1] + 1.5, vz: s[2], g: -10, drag: 1.2, life: R(0.2, 0.45), s0: R(0.05, 0.1), s1: 0.01, c: col('#ff5a3c'), c1: col('#ffb36a'), a0: 1, a1: 0 }); }
    emit(add, { x: p.x, y: p.y, z: p.z, life: 0.14, s0: 1.0, s1: 1.6, c: col('#ff6a4a'), a0: 0.7, a1: 0 });
  }
  function block(p) {
    for (let i = 0; i < 26; i++) { const s = sphere(R(3, 7)); emit(add, { x: p.x, y: p.y, z: p.z, vx: s[0], vy: s[1] + 1, vz: s[2], g: -12, drag: 1, life: R(0.12, 0.3), s0: 0.06, s1: 0.01, c: col('#ffffff'), c1: col('#9ac8ff'), a0: 1, a1: 0 }); }
  }
  // a rakshasa falls: dark smoke boils up from the body, embers lift away
  function death(p) {
    for (let i = 0; i < 40; i++) {
      const a = Math.random() * Math.PI * 2, r = R(0, 0.7);
      emit(alpha, { x: p.x + Math.cos(a) * r, y: p.y + R(0, 0.5), z: p.z + Math.sin(a) * r, vx: R(-0.3, 0.3), vy: R(0.6, 1.8), vz: R(-0.3, 0.3), drag: 0.8, g: 0.4,
        life: R(1.2, 2.4), s0: R(0.4, 0.7), s1: R(1.4, 2.4), c: col('#1c1024'), c1: col('#4a2a5a'), a0: 0.6, a1: 0 });
    }
    for (let i = 0; i < 46; i++) {
      const a = Math.random() * Math.PI * 2, r = R(0, 0.8);
      emit(add, { x: p.x + Math.cos(a) * r, y: p.y + R(0, 0.8), z: p.z + Math.sin(a) * r, vx: R(-0.4, 0.4), vy: R(0.8, 2.6), vz: R(-0.4, 0.4), drag: 0.5, g: 0.6,
        life: R(1.0, 2.2), s0: R(0.05, 0.1), s1: 0.02, c: col('#c08cff'), c1: col('#ff8a3a'), a0: 1, a1: 0 });
    }
    ring(p, 2.6, '#a070ff', 0.55, 0.7);
  }
  function fade(p, n = 14) { // the last wisps as the body sinks away
    for (let i = 0; i < n; i++) { const a = Math.random() * Math.PI * 2, r = R(0, 0.6);
      emit(add, { x: p.x + Math.cos(a) * r, y: p.y, z: p.z + Math.sin(a) * r, vy: R(0.5, 1.5), drag: 0.5, life: R(0.6, 1.2), s0: R(0.05, 0.1), s1: 0.02, c: col('#b080ff'), a0: 0.9, a1: 0 }); }
  }
  // the gada appears or is put away: a golden swirl
  function magic(p, color = '#ffd27a') {
    const c = col(color);
    for (let i = 0; i < 50; i++) {
      const a = (i / 50) * Math.PI * 6, h = (i / 50) * 1.6, r = 0.55;
      emit(add, { x: p.x + Math.cos(a) * r, y: p.y + h, z: p.z + Math.sin(a) * r, vx: -Math.sin(a) * 1.5, vy: 0.8, vz: Math.cos(a) * 1.5, drag: 1.5, life: R(0.5, 0.9), s0: 0.12, s1: 0.02, c, a0: 1, a1: 0 });
    }
    ring(p, 1.6, color, 0.6, 0.5);
  }
  function sparkle(p, color = '#ffe9a8', n = 30) {
    const c = col(color);
    for (let i = 0; i < n; i++) { const s = sphere(R(0.5, 2)); emit(add, { x: p.x, y: p.y, z: p.z, vx: s[0], vy: s[1] + 1.2, vz: s[2], drag: 1.2, g: -1, life: R(0.6, 1.3), s0: R(0.07, 0.14), s1: 0.02, c, a0: 1, a1: 0 }); }
  }
  function fruitSplat(p) {
    const c = col('#f0a52a');
    for (let i = 0; i < 16; i++) { const s = sphere(R(1, 3)); emit(alpha, { x: p.x, y: p.y, z: p.z, vx: s[0], vy: Math.abs(s[1]) + 1, vz: s[2], g: -12, drag: 0.6, life: R(0.4, 0.8), s0: R(0.06, 0.12), s1: 0.05, c, a0: 1, a1: 0.6, floor: p.y - 0.1, leaf: true }); }
  }
  function leaves(p, n = 12) {
    for (let i = 0; i < n; i++) {
      const s = sphere(R(0.5, 1.8));
      emit(alpha, { x: p.x + s[0] * 0.3, y: p.y + R(0.4, 1.2), z: p.z + s[2] * 0.3, vx: s[0], vy: Math.abs(s[1]) + 0.6, vz: s[2], g: -2.2, drag: 2.2, life: R(0.9, 1.6),
        s0: R(0.12, 0.2), s1: 0.1, c: col(Math.random() < 0.5 ? '#2f6b34' : '#4a8a3a'), a0: 1, a1: 0, leaf: true, vs: R(-6, 6) });
    }
  }
  function splash(p, n = 18) {
    for (let i = 0; i < n; i++) { const a = Math.random() * Math.PI * 2, sp = R(0.5, 2);
      emit(alpha, { x: p.x, y: p.y, z: p.z, vx: Math.cos(a) * sp, vy: R(1.5, 3.5), vz: Math.sin(a) * sp, g: -12, life: R(0.4, 0.8), s0: R(0.05, 0.09), s1: 0.03, c: col('#b8d0ff'), a0: 0.85, a1: 0, floor: p.y - 0.05 }); }
    ring(p, 0.9, '#a8c0ff', 0.5, 0.6, 0.01);
  }
  // embers rising off a flame
  function ember(p) {
    emit(add, { x: p.x + R(-0.08, 0.08), y: p.y, z: p.z + R(-0.08, 0.08), vx: R(-0.25, 0.25), vy: R(0.6, 1.6), vz: R(-0.25, 0.25), drag: 0.3, g: 0.2,
      life: R(0.7, 1.6), s0: R(0.04, 0.08), s1: 0.01, c: col('#ffb24a'), c1: col('#ff4a1a'), a0: 1, a1: 0 });
  }
  function flameLick(p, k = 1) {
    emit(add, { x: p.x + R(-0.05, 0.05), y: p.y, z: p.z + R(-0.05, 0.05), vx: R(-0.1, 0.1), vy: R(0.8, 1.4), vz: R(-0.1, 0.1), drag: 1, life: R(0.18, 0.35),
      s0: R(0.25, 0.4) * k, s1: 0.05, c: col('#ffd48a'), c1: col('#ff5a1a'), a0: 0.55, a1: 0 });
  }
  function mist(p, r = 3) {
    emit(alpha, { x: p.x + R(-r, r), y: p.y + R(0, 0.4), z: p.z + R(-r, r), vx: R(-0.15, 0.15), vy: R(0, 0.05), vz: R(-0.15, 0.15), life: R(4, 7), s0: R(1.5, 2.5), s1: R(3, 4.5), c: col('#4a4a78'), a0: 0.07, a1: 0 });
  }

  // stun: three little stars circling a head
  function stun(target, dur) {
    for (let i = 0; i < 3; i++) {
      let s = stars.find((x) => !x.on);
      if (!s) {
        const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d');
        g.translate(32, 32); g.fillStyle = '#ffe27a'; g.beginPath(); for (let k = 0; k < 10; k++) { const r = k % 2 ? 11 : 26, a = k * Math.PI / 5 - Math.PI / 2; g.lineTo(Math.cos(a) * r, Math.sin(a) * r); } g.fill();
        const sp = new T.Sprite(new T.SpriteMaterial({ map: new T.CanvasTexture(c), transparent: true, depthWrite: false, blending: T.AdditiveBlending }));
        sp.scale.set(0.22, 0.22, 1); scene.add(sp); s = { sp }; stars.push(s);
      }
      s.on = true; s.t = dur; s.k = i; s.target = target; s.sp.visible = true;
    }
  }

  // ---------- rain ----------
  const RAIN_N = 2600, RAIN_BOX = 26;
  function initRain() {
    const g = new T.BufferGeometry(), pos = new Float32Array(RAIN_N * 6);
    g.setAttribute('position', new T.BufferAttribute(pos, 3).setUsage(T.DynamicDrawUsage));
    const m = new T.LineBasicMaterial({ color: '#9aa8e8', transparent: true, opacity: 0, depthWrite: false });
    const l = new T.LineSegments(g, m); l.frustumCulled = false; l.renderOrder = 2; scene.add(l);
    const drops = [];
    for (let i = 0; i < RAIN_N; i++) drops.push({ x: R(-RAIN_BOX, RAIN_BOX), y: R(0, 24), z: R(-RAIN_BOX, RAIN_BOX), v: R(16, 22) });
    rain = { l, g, pos, drops, k: 0 };
  }
  // ground(x, z) -> height of whatever the drop lands on (roof or street)
  function updateRain(dt, center, k, ground, wind) {
    rain.k = k; rain.l.material.opacity = Math.min(0.55, k * 0.6);
    rain.l.visible = k > 0.01;
    if (!rain.l.visible) return;
    const p = rain.pos, active = Math.floor(RAIN_N * Math.min(1, k));
    let splashes = 0;
    for (let i = 0; i < RAIN_N; i++) {
      const d = rain.drops[i], o = i * 6;
      if (i >= active) { p[o + 1] = p[o + 4] = -100; continue; }
      d.y -= d.v * dt; d.x += wind * dt;
      let gx = center.x + d.x, gz = center.z + d.z;
      const gy = ground(gx, gz);
      if (d.y < gy) {
        if (splashes < 6 && Math.random() < 0.3) { splashes++; emit(alpha, { x: gx, y: gy + 0.02, z: gz, vy: R(0.6, 1.2), g: -9, life: 0.25, s0: 0.06, s1: 0.02, c: [0.7, 0.75, 0.95], a0: 0.7, a1: 0, floor: gy }); }
        d.y = R(14, 22) + center.y * 0.0; d.x = R(-RAIN_BOX, RAIN_BOX); d.z = R(-RAIN_BOX, RAIN_BOX);
        gx = center.x + d.x; gz = center.z + d.z;
      }
      const len = 0.5;
      p[o] = gx; p[o + 1] = d.y; p[o + 2] = gz;
      p[o + 3] = gx - wind * 0.03; p[o + 4] = d.y + len; p[o + 5] = gz;
    }
    rain.g.attributes.position.needsUpdate = true;
  }
  let flashT = 0;
  function lightning() { flashT = 0.45; }

  // ---------- per-frame ----------
  const tmpC = [0, 0, 0];
  function step(cloud, dt) {
    const { P, pos, col: cc, size, spin } = cloud;
    for (let i = 0; i < cloud.n; i++) {
      const p = P[i];
      if (p.life <= 0) { size[i] = 0; cc[i * 4 + 3] = 0; continue; }
      p.life -= dt;
      const k = 1 - Math.max(0, p.life) / p.max;
      const dr = Math.max(0, 1 - p.drag * dt);
      p.vx *= dr; p.vy = p.vy * dr + p.g * dt; p.vz *= dr;
      p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt;
      if (p.y < p.floor) { p.y = p.floor; p.vy *= -0.25; p.vx *= 0.6; p.vz *= 0.6; }
      pos[i * 3] = p.x; pos[i * 3 + 1] = p.y; pos[i * 3 + 2] = p.z;
      let r = p.r, g = p.gC, b = p.b;
      if (p.r1) { r += (p.r1[0] - r) * k; g += (p.r1[1] - g) * k; b += (p.r1[2] - b) * k; }
      cc[i * 4] = r; cc[i * 4 + 1] = g; cc[i * 4 + 2] = b; cc[i * 4 + 3] = p.a0 + (p.a1 - p.a0) * k;
      size[i] = p.s0 + (p.s1 - p.s0) * k;
      p.sp += p.vs * dt; spin[i] = p.leaf ? 60 + p.sp : p.sp;
    }
    cloud.g.attributes.position.needsUpdate = true; cloud.g.attributes.rgba.needsUpdate = true;
    cloud.g.attributes.size.needsUpdate = true; cloud.g.attributes.spin.needsUpdate = true;
  }
  const _v = { x: 0, y: 0, z: 0 };
  function update(dt, t) {
    step(add, dt); step(alpha, dt);
    for (const r of rings) {
      if (!r.on) continue;
      r.t += dt; const k = r.t / r.dur;
      if (k >= 1) { r.on = false; r.m.visible = false; continue; }
      const e = 1 - Math.pow(1 - k, 3);
      r.m.scale.setScalar(0.1 + r.rad * e); r.m.material.opacity = r.op * (1 - k);
    }
    for (const s of stars) {
      if (!s.on) continue;
      s.t -= dt; if (s.t <= 0 || !s.target) { s.on = false; s.sp.visible = false; continue; }
      const a = t * 4 + s.k * 2.094, p = s.target();
      if (!p) { s.on = false; s.sp.visible = false; continue; }
      s.sp.position.set(p.x + Math.cos(a) * 0.32, p.y + 0.1 + Math.sin(t * 6 + s.k) * 0.05, p.z + Math.sin(a) * 0.32);
      s.sp.material.opacity = Math.min(1, s.t * 2);
    }
    if (flashT > 0) {
      flashT -= dt;
      const f = flashT > 0.32 ? 1 : flashT > 0.22 ? 0.2 : flashT > 0.12 ? 0.8 : flashT / 0.12 * 0.4;
      flash.intensity = Math.max(0, f) * 2.6;
    } else flash.intensity = 0;
  }
  function clear() { for (const c of [add, alpha]) for (const p of c.P) p.life = 0; for (const s of stars) { s.on = false; s.sp.visible = false; } }

  return { init, resize, update, updateRain, lightning, dust, footstep, landing, ring, hit, hurt, block, death, fade, magic, sparkle, fruitSplat, leaves, splash, ember, flameLick, mist, stun, clear,
    get flashing() { return flashT > 0; } };
})();
