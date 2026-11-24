// Lanka ki Chhatein: the look. Lanka at sundown on Trikuta hill, the ocean all round.
// Post-processing (bloom, sun shafts, colour grade with vignette), the ocean and far hills in layered haze,
// and golden motes drifting in the air.
window.LankaLook = (function () {
  'use strict';
  let T, renderer, scene, camera, composer = null, bloom = null, shafts = null, grade = null;
  const sunDir = new (function () { this.v = null; })();
  let motes = null, ocean = null;

  // ---------- post-processing ----------
  const SHAFTS = {
    uniforms: { tDiffuse: { value: null }, sunPos: { value: null }, strength: { value: 0.75 }, onScreen: { value: 1 } },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: `
      uniform sampler2D tDiffuse; uniform vec2 sunPos; uniform float strength; uniform float onScreen; varying vec2 vUv;
      void main() {
        vec4 base = texture2D(tDiffuse, vUv);
        vec2 d = (vUv - sunPos) / 40.0 * 0.92;
        vec2 uv = vUv; float illum = 1.0; vec3 acc = vec3(0.0);
        for (int i = 0; i < 40; i++) {
          uv -= d;
          vec3 s = texture2D(tDiffuse, clamp(uv, 0.001, 0.999)).rgb;
          float l = max(0.0, dot(s, vec3(0.3, 0.59, 0.11)) - 0.8) * 2.5;
          acc += s * l * illum; illum *= 0.955;
        }
        acc /= 40.0;
        float fall = 1.0 - smoothstep(0.0, 1.1, length(vUv - sunPos));
        gl_FragColor = vec4(base.rgb + acc * strength * vec3(1.0, 0.78, 0.5) * onScreen * (0.4 + fall), 1.0);
      }`,
  };
  const GRADE = {
    uniforms: { tDiffuse: { value: null }, sat: { value: 1.28 }, warm: { value: 0.05 }, vig: { value: 0.32 }, hurt: { value: 0 }, contrast: { value: 1.12 } },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: `
      uniform sampler2D tDiffuse; uniform float sat, warm, vig, hurt, contrast; varying vec2 vUv;
      vec3 toSRGB(vec3 c) { c = max(c, 0.0); return mix(c * 12.92, 1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055, step(0.0031308, c)); }
      void main() {
        vec3 c = texture2D(tDiffuse, vUv).rgb;
        float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
        c = mix(vec3(l), c, sat);
        // warm highlights, a little violet in the shadows
        c += vec3(warm, warm * 0.45, -warm * 0.4) * smoothstep(0.15, 0.9, l);
        c += vec3(0.012, 0.0, 0.028) * (1.0 - smoothstep(0.0, 0.25, l));
        c = toSRGB(c);
        c = (c - 0.5) * contrast + 0.5;
        vec2 q = vUv - 0.5; float v = 1.0 - dot(q, q) * vig * 2.4;
        c *= v;
        c = mix(c, c * vec3(1.25, 0.55, 0.5), hurt * smoothstep(0.15, 0.75, length(q)));
        gl_FragColor = vec4(clamp(c, 0.0, 1.0), 1.0);
      }`,
  };

  function initPost(w, h, pr, light) {
    if (!T.EffectComposer || !T.UnrealBloomPass) return false;
    const size = renderer.getDrawingBufferSize(new T.Vector2());
    let rt;
    const opts = { minFilter: T.LinearFilter, magFilter: T.LinearFilter, format: T.RGBAFormat, type: T.HalfFloatType };
    if (renderer.capabilities.isWebGL2 && T.WebGLMultisampleRenderTarget && !light) { rt = new T.WebGLMultisampleRenderTarget(size.x, size.y, opts); rt.samples = 4; }
    else rt = new T.WebGLRenderTarget(size.x, size.y, opts);
    composer = new T.EffectComposer(renderer, rt);
    composer.addPass(new T.RenderPass(scene, camera));
    bloom = new T.UnrealBloomPass(new T.Vector2(w, h), light ? 0.35 : 0.45, 0.5, 0.9);
    composer.addPass(bloom);
    if (!light) { shafts = new T.ShaderPass(SHAFTS); shafts.uniforms.sunPos.value = new T.Vector2(0.5, 0.5); composer.addPass(shafts); }
    grade = new T.ShaderPass(GRADE); composer.addPass(grade);
    return true;
  }
  function resize(w, h) { if (composer) { composer.setPixelRatio(renderer.getPixelRatio()); composer.setSize(w, h); } }

  // ---------- the far world: ocean, Trikuta's ridges, haze ----------
  function world(ctx) {
    // ocean: a dark sea with a path of sunlight on it
    const og = new T.PlaneGeometry(3000, 3000, 1, 1);
    const om = new T.MeshStandardMaterial({ color: '#3a3f7a', roughness: 0.22, metalness: 0.15, envMap: ctx.env, envMapIntensity: 1.2 });
    if (ctx.waterNormals) { const n = ctx.waterNormals.clone(); n.needsUpdate = true; n.repeat.set(160, 160); om.normalMap = n; om.normalScale.set(0.6, 0.6); ocean = n; }
    const o = new T.Mesh(og, om); o.rotation.x = -Math.PI / 2; o.position.y = -1.2; scene.add(o);
    // shore: the island the city stands on, sloping into the sea
    const shore = new T.Mesh(new T.CylinderGeometry(150, 190, 3, 48, 1, true), new T.MeshStandardMaterial({ color: '#8a6a52', roughness: 1 }));
    shore.position.set(0, -1.4, 45); scene.add(shore);
    const land = new T.Mesh(new T.CircleGeometry(150, 48), new T.MeshStandardMaterial({ color: '#4e5a34', roughness: 1 }));
    land.rotation.x = -Math.PI / 2; land.position.set(0, -0.02, 45); scene.add(land);
    // ridges of Trikuta and far islands, each layer paler with distance
    const layers = [[260, '#5e4a7a', 38, 0.6], [360, '#7a6090', 60, 0.5], [520, '#9a7aa4', 80, 0.4]];
    layers.forEach(([r, col, hgt, seedK], li) => {
      const seg = 160, pos = [], idx = [];
      for (let i = 0; i <= seg; i++) {
        const a = i / seg * Math.PI * 2;
        let h = 0; for (let k = 1; k <= 5; k++) h += Math.sin(a * k * 3 + li * 7 + k * 1.7) / k;
        h = Math.max(0, (h * 0.5 + 0.55)) * hgt * (0.6 + 0.4 * Math.sin(a * 2 + li));
        // keep the sunset gap open in front of the palace
        const toSun = Math.cos(a - Math.atan2(-0.35, 1)); h *= 1 - Math.max(0, toSun - 0.75) * 2.2;
        const x = Math.sin(a) * r, z = Math.cos(a) * r + 45;
        pos.push(x, -1, z, x, Math.max(0, h) - 1, z);
      }
      for (let i = 0; i < seg; i++) { const a = i * 2; idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); }
      const g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals();
      const m = new T.MeshBasicMaterial({ color: col, side: T.DoubleSide, fog: true });
      scene.add(new T.Mesh(g, m));
    });
  }

  // ---------- golden motes in the air around Hanuman ----------
  function initMotes() {
    const n = 420, g = new T.BufferGeometry(), p = new Float32Array(n * 3), ph = new Float32Array(n);
    for (let i = 0; i < n; i++) { p[i * 3] = (Math.random() - 0.5) * 40; p[i * 3 + 1] = Math.random() * 12; p[i * 3 + 2] = (Math.random() - 0.5) * 40; ph[i] = Math.random() * 10; }
    g.setAttribute('position', new T.BufferAttribute(p, 3)); g.setAttribute('ph', new T.BufferAttribute(ph, 1));
    const m = new T.ShaderMaterial({
      uniforms: { uT: { value: 0 }, uC: { value: new T.Vector3() }, uScale: { value: 500 } }, transparent: true, depthWrite: false, blending: T.AdditiveBlending,
      vertexShader: `attribute float ph; uniform float uT; uniform vec3 uC; uniform float uScale; varying float vA;
        void main() {
          vec3 p = position + vec3(sin(uT * 0.3 + ph) * 1.2, sin(uT * 0.21 + ph * 2.0) * 0.8, cos(uT * 0.27 + ph) * 1.2);
          p.xz = uC.xz + mod(p.xz - uC.xz + 20.0, 40.0) - 20.0; p.y += uC.y - 2.0;
          vec4 mv = modelViewMatrix * vec4(p, 1.0);
          vA = (0.45 + 0.55 * sin(uT * 2.0 + ph * 5.0)) * smoothstep(40.0, 8.0, -mv.z);
          gl_PointSize = uScale * 0.06 / max(0.5, -mv.z);
          gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader: `varying float vA; void main() { float d = length(gl_PointCoord - 0.5) * 2.0; float a = smoothstep(1.0, 0.0, d); gl_FragColor = vec4(1.0, 0.82, 0.5, a * a * vA * 0.9); }`,
    });
    motes = new T.Points(g, m); motes.frustumCulled = false; scene.add(motes);
  }

  let _s = null;
  function update(t, dt, center, hurtK) {
    if (motes) { motes.material.uniforms.uT.value = t; motes.material.uniforms.uC.value.copy(center); motes.material.uniforms.uScale.value = renderer.domElement.clientHeight; }
    if (ocean) ocean.offset.set(t * 0.004, t * 0.006);
    if (shafts) {
      if (!_s) _s = new T.Vector3();
      _s.copy(sunDir.v).multiplyScalar(400).add(camera.position).project(camera);
      shafts.uniforms.sunPos.value.set(_s.x * 0.5 + 0.5, _s.y * 0.5 + 0.5);
      // fade out when the sun is behind the camera
      const facing = _s.z < 1 ? 1 : 0;
      shafts.uniforms.onScreen.value += (facing - shafts.uniforms.onScreen.value) * Math.min(1, dt * 4);
    }
    if (grade) grade.uniforms.hurt.value = hurtK;
  }
  function render() { if (composer) composer.render(); else renderer.render(scene, camera); }

  function init(three, r, s, c, ctx) {
    T = three; renderer = r; scene = s; camera = c; sunDir.v = ctx.sunDir;
    initMotes();
    const ok = initPost(ctx.w, ctx.h, renderer.getPixelRatio(), ctx.light);
    return ok;
  }
  return { init, world, resize, update, render, get composer() { return composer; } };
})();
