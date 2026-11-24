// Lanka ki Chhatein: a denser Lanka.
// Places Kenney's CC0 props (palms, bushes, grass, flowers, lilies, market stalls, carts, barrels, urns, lanterns,
// fire baskets, banners and flags) along the street, over the rooftops and through Ashok Vatika; adds a wind that
// sways every plant, water with moving ripples, a fountain, rain puddles and low mist.
window.LankaScenery = (function () {
  'use strict';
  let T, C;
  const wind = { uTime: { value: 0 }, uWind: { value: 0.35 } };
  const swayMats = new Map();

  // a material that bends in the wind: the higher a vertex sits in its model, the further it moves
  function swayMat(m, amp = 1) {
    const key = m.uuid + amp;
    if (swayMats.has(key)) return swayMats.get(key);
    const s = m.clone();
    s.onBeforeCompile = (sh) => {
      sh.uniforms.uTime = wind.uTime; sh.uniforms.uWind = wind.uWind;
      sh.vertexShader = 'uniform float uTime; uniform float uWind;\n' + sh.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
        float hgt = max(0.0, position.y);
        vec3 wp = vec3(0.0);
        #ifdef USE_INSTANCING
          wp = instanceMatrix[3].xyz;
        #endif
        wp += modelMatrix[3].xyz;
        float ph = uTime * 1.6 + wp.x * 0.35 + wp.z * 0.27;
        float sway = (sin(ph) * 0.6 + sin(ph * 2.3 + 1.7) * 0.25 + sin(uTime * 0.5 + wp.x * 0.1) * 0.4) * uWind * ${amp.toFixed(2)};
        transformed.x += sway * hgt * hgt * 0.35;
        transformed.z += sway * hgt * hgt * 0.22 * cos(ph * 0.7);`);
    };
    s.customProgramCacheKey = () => 'sway' + amp;
    swayMats.set(key, s);
    return s;
  }

  // ---------- helpers ----------
  function place(name, x, y, z, s = 1, ry = 0, opt = {}) {
    const src = C.props[name]; if (!src) return null;
    if (opt.tint && !src.userData.tinted) { src.userData.tinted = true; const t = (q) => { const c = q.clone(); c.color.set(opt.tint); return c; }; src.material = Array.isArray(src.material) ? src.material.map(t) : t(src.material); }
    const m = new T.Mesh(src.geometry, opt.sway ? (Array.isArray(src.material) ? src.material.map((q) => swayMat(q, opt.sway)) : swayMat(src.material, opt.sway)) : src.material);
    m.position.set(x, y, z); m.scale.setScalar(s); m.rotation.y = ry;
    m.castShadow = opt.shadow !== false; m.receiveShadow = true;
    C.scene.add(m); return m;
  }
  // many copies of one prop in one draw call
  function scatter(name, list, opt = {}) {
    const src = C.props[name]; if (!src || !list.length) return null;
    const mat = opt.sway ? (Array.isArray(src.material) ? src.material.map((q) => swayMat(q, opt.sway)) : swayMat(src.material, opt.sway)) : src.material;
    const im = new T.InstancedMesh(src.geometry, mat, list.length);
    const o = new T.Object3D();
    list.forEach((p, i) => { o.position.set(p[0], p[1], p[2]); o.rotation.set(0, p[4] || 0, 0); o.scale.setScalar(p[3] || 1); o.updateMatrix(); im.setMatrixAt(i, o.matrix); });
    im.castShadow = opt.shadow !== false; im.receiveShadow = true; C.scene.add(im); return im;
  }
  const R = () => C.rand(), rr = (a, b) => C.rr(a, b);

  // ---------- water ----------
  function waterNormals() {
    const n = 256, c = document.createElement('canvas'); c.width = c.height = n; const g = c.getContext('2d');
    const img = g.createImageData(n, n), h = new Float32Array(n * n);
    // a few hundred soft bumps, tiled
    for (let k = 0; k < 420; k++) {
      const cx = R() * n, cy = R() * n, r = 4 + R() * 18, a = (R() - 0.5) * 2;
      for (let y = -r; y <= r; y++) for (let x = -r; x <= r; x++) {
        const d = Math.hypot(x, y) / r; if (d > 1) continue;
        const px = ((Math.floor(cx + x) % n) + n) % n, py = ((Math.floor(cy + y) % n) + n) % n;
        h[py * n + px] += a * (Math.cos(d * Math.PI) + 1) * 0.5;
      }
    }
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
      const i = y * n + x, dx = h[y * n + (x + 1) % n] - h[y * n + (x + n - 1) % n], dy = h[((y + 1) % n) * n + x] - h[((y + n - 1) % n) * n + x];
      const v = [-dx * 2.2, -dy * 2.2, 1], l = Math.hypot(v[0], v[1], v[2]);
      img.data[i * 4] = (v[0] / l * 0.5 + 0.5) * 255; img.data[i * 4 + 1] = (v[1] / l * 0.5 + 0.5) * 255; img.data[i * 4 + 2] = (v[2] / l * 0.5 + 0.5) * 255; img.data[i * 4 + 3] = 255;
    }
    g.putImageData(img, 0, 0);
    const t = new T.CanvasTexture(c); t.wrapS = t.wrapT = T.RepeatWrapping; return t;
  }
  let waterMats = [];
  function water(geo, x, y, z, color = '#0d1a3a', rep = 2) {
    const nt = C.waterNormals || (C.waterNormals = waterNormals());
    const a = nt.clone(); a.needsUpdate = true; a.repeat.set(rep, rep);
    const m = new T.MeshStandardMaterial({ color, roughness: 0.1, metalness: 0.2, normalMap: a, normalScale: new T.Vector2(0.45, 0.45), envMap: C.env, envMapIntensity: 1.0, transparent: true, opacity: 0.94 });
    const w = new T.Mesh(geo, m); w.rotation.x = -Math.PI / 2; w.position.set(x, y, z); w.receiveShadow = true; C.scene.add(w);
    waterMats.push({ m, a, rep }); return w;
  }

  // a saffron pennant (dhwaj) on a bamboo pole, fluttering
  let dhwajParts = null;
  function dhwaj(x, y, z) {
    if (!dhwajParts) {
      const pole = new T.CylinderGeometry(0.03, 0.04, 2.6, 6); pole.translate(0, 1.3, 0);
      const cloth = new T.BufferGeometry(); const v = [], idx = [], nx = 10;
      for (let i = 0; i <= nx; i++) { const u = i / nx, hgt = 0.62 * (1 - u * 0.85); v.push(u * 1.1, 2.55, 0, u * 1.1, 2.55 - hgt, 0); }
      for (let i = 0; i < nx; i++) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
      cloth.setAttribute('position', new T.Float32BufferAttribute(v, 3)); cloth.setIndex(idx); cloth.computeVertexNormals();
      const cm = new T.MeshStandardMaterial({ color: '#f07a1a', roughness: 0.8, side: T.DoubleSide, emissive: new T.Color('#3a1200') });
      cm.onBeforeCompile = (sh) => { sh.uniforms.uTime = wind.uTime; sh.uniforms.uWind = wind.uWind;
        sh.vertexShader = 'uniform float uTime; uniform float uWind;\n' + sh.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
          float u = position.x / 1.1; float ph = uTime * 5.0 - u * 6.0 + modelMatrix[3].x;
          transformed.z += sin(ph) * u * (0.12 + uWind * 0.25); transformed.y += sin(ph * 0.5) * u * 0.05;`); };
      cm.customProgramCacheKey = () => 'dhwaj';
      dhwajParts = { pole, cloth, pm: C.M.wood, cm };
    }
    const g = new T.Group(); g.position.set(x, y, z); g.rotation.y = rr(0, Math.PI * 2);
    const p = new T.Mesh(dhwajParts.pole, dhwajParts.pm); p.castShadow = true; g.add(p);
    const c = new T.Mesh(dhwajParts.cloth, dhwajParts.cm); c.castShadow = true; g.add(c);
    C.scene.add(g); return g;
  }

  // ---------- the build ----------
  const lights = [], flames = [], ponds = [], banners = [], puddles = [];
  function build(ctx) {
    T = ctx.THREE; C = ctx;
    const P = C.props;

    // --- the bazaar street: stalls, carts, barrels, urns and lanterns along both walls ---
    const stalls = [[-2.25, 3.0, Math.PI / 2, 'stall_red'], [2.25, 9.5, -Math.PI / 2, 'stall_green'], [-2.25, 20.5, Math.PI / 2, 'stall_green'], [2.25, 37.5, -Math.PI / 2, 'stall_red'],
      [-2.25, 42.5, Math.PI / 2, 'stall_red'], [2.25, 52.5, -Math.PI / 2, 'stall_green'], [-2.25, 51, Math.PI / 2, 'stall']];
    stalls.forEach(([x, z, ry, n]) => {
      const s = n === 'stall' ? 1.5 : 1.55;
      place(n, x, 0, z, s, ry);
      if (n !== 'stall') {
        C.solid(x - 0.78, x + 0.78, z - 0.78, z + 0.78, 0, 0.62, null, { invisible: true });   // the counter
        place('stall_stool', x + (x < 0 ? 1.0 : -1.0), 0, z + 0.9, 1.3, R() * 6);
        if (R() < 0.6) place('stall_bench', x + (x < 0 ? 0.95 : -0.95), 0, z - 0.6, 1.4, ry);
      }
    });
    [[1.9, 16.8, 0.3], [-2.0, 30.5, 2.6], [2.0, 45.8, -0.4], [-1.9, 58.5, 3.1]].forEach(([x, z, ry]) => { place('cart', x, 0, z, 1.45, ry); C.solid(x - 0.55, x + 0.55, z - 0.75, z + 0.75, 0, 0.7, null, { invisible: true }); });
    const clutter = [];
    for (let z = 1; z < 61; z += rr(1.6, 3.4)) {
      const side = R() < 0.5 ? -1 : 1, x = side * rr(2.45, 2.75);
      if (stalls.some((s) => Math.abs(s[1] - z) < 1.4 && Math.sign(s[0]) === side)) continue;
      clutter.push([x, z, side]);
    }
    const barrels = [], boxes = [], urns = [], urnsQ = [];
    clutter.forEach(([x, z, side]) => {
      const k = R();
      if (k < 0.3) barrels.push([x, 0, z, rr(1.6, 2.0), R() * 6]);
      else if (k < 0.55) { boxes.push([x, 0, z, rr(1.6, 2.1), R() * 6]); if (R() < 0.5) boxes.push([x + rr(-0.2, 0.2), 0.42, z + rr(-0.2, 0.2), rr(1.3, 1.7), R() * 6]); }
      else if (k < 0.8) { urns.push([x, 0, z, rr(1.8, 2.4), R() * 6]); urns.push([x + side * -0.35, 0, z + 0.4, rr(1.4, 1.9), R() * 6]); }
      else urnsQ.push([x, 0, z, rr(1.8, 2.3), R() * 6]);
    });
    scatter('barrel', barrels); scatter('box', boxes); scatter('urn_round', urns); scatter('urn_square', urnsQ);
    // hanging lanterns on the walls of the canyon, lit
    [[-2.85, 3.4, 4.5], [2.85, 3.4, 13], [-2.85, 3.4, 23.5], [2.85, 3.4, 34], [-2.85, 3.4, 47], [2.85, 3.4, 56], [-2.85, 3.4, 60]].forEach(([x, y, z]) => {
      place('lantern_candle', x + (x < 0 ? 0.3 : -0.3), y, z, 1.6, 0); lights.push(new T.Vector3(x + (x < 0 ? 0.3 : -0.3), y + 0.3, z));
    });
    // banners on the walls
    [[-2.98, 3.0, 9.2, Math.PI / 2, 'banner_red'], [2.98, 3.4, 19.5, -Math.PI / 2, 'banner_green'], [-2.98, 3.2, 38.6, Math.PI / 2, 'banner_green'], [2.98, 3.0, 43.5, -Math.PI / 2, 'banner_red'],
      [-2.98, 3.6, 55.4, Math.PI / 2, 'banner_red'], [2.98, 4.2, 6.5, -Math.PI / 2, 'banner_red']].forEach(([x, y, z, ry, n]) => banners.push(place(n, x, y, z, 2.2, ry, { sway: 0.5 })));

    // --- rooftops: potted palms and plants at the corners, urns, fire baskets, flags ---
    const roofs = [[-9, -3, -2, 10.4, 5], [-9, -3, 12, 20, 5.5], [-9, -3, 21.6, 34, 5], [3, 9, 26, 38.4, 5], [3, 9, 40, 48.4, 5.8], [3, 9, 50, 62, 5]];
    const roofPalms = [], roofPlants = [], roofUrns = [], roofFlowers = [];
    roofs.forEach(([x0, x1, z0, z1, h], i) => {
      const outer = x0 < 0 ? x0 + 0.55 : x1 - 0.55;
      [[outer, z0 + 0.6], [outer, z1 - 0.6]].forEach(([x, z], k) => {
        if ((i + k) % 2 === 0) roofPalms.push([x, h, z, rr(2.1, 2.7), R() * 6]);
        else { roofPlants.push([x, h, z, rr(2.4, 3.2), R() * 6]); roofFlowers.push([x + 0.3, h, z + 0.2, 2.2, R() * 6]); }
        roofUrns.push([x + (x < 0 ? 0.35 : -0.35), h, z + (k ? -0.6 : 0.6), 1.9, R() * 6]);
      });
      // a fire basket in the middle of the far edge, and a flag on the corner
      const fx = x0 < 0 ? x0 + 0.6 : x1 - 0.6, fz = (z0 + z1) / 2 + (i % 2 ? 2 : -2);
      place('fire_basket', fx, h, fz, 1.6); flames.push(new T.Vector3(fx, h + 0.32, fz)); lights.push(new T.Vector3(fx, h + 0.6, fz));
      dhwaj(x0 < 0 ? x0 + 0.3 : x1 - 0.3, h, z1 - 0.35);
    });
    scatter('tree_palmDetailedShort', roofPalms, { sway: 0.55 });
    scatter('plant_bushLarge', roofPlants, { sway: 0.4 });
    scatter('flower_redA', roofFlowers, { sway: 0.4, shadow: false });
    scatter('urn_round', roofUrns);

    // --- the tall canyon walls: vines of bamboo and palms peeking over ---
    const peek = [];
    [[-6, 36, 8], [-6, 50, 7.5], [6, 3, 7.5], [6, 17, 8.5]].forEach(([x, z, h]) => { for (let k = 0; k < 2; k++) peek.push([x + rr(-2, 2), h, z + rr(-4, 4), rr(2.6, 3.4), R() * 6]); });
    scatter('tree_palmDetailedTall', peek, { sway: 0.5 });

    // --- outside the walls: a ring of palms against the sky ---
    const far = [];
    for (let i = 0; i < 60; i++) { const s = R() < 0.5 ? -1 : 1; far.push([s * rr(13, 30), 0, rr(-15, 105), rr(4, 7), R() * 6]); }
    scatter('tree_palmDetailedTall', far.slice(0, 30), { sway: 0.35, shadow: false });
    scatter('tree_palmBend', far.slice(30), { sway: 0.35, shadow: false });

    // --- Ashok Vatika: palms, grass, flowers, bamboo, rocks, a fountain, a lotus pond ---
    const gx0 = -11.2, gx1 = 11.2, gz0 = 64, gz1 = 83.6;
    const inPond = (x, z) => Math.hypot(x - 3, z - 75) < 3.6;
    const gPalms = [[-10, 66], [10.2, 66.5], [-10.4, 82], [10, 82.5], [-4.5, 83], [5.5, 66], [-10.6, 74], [10.6, 75]].map(([x, z]) => [x, 0, z, rr(3.2, 4.2), R() * 6]);
    scatter('tree_palmDetailedTall', gPalms, { sway: 0.5 });
    const grass = [], grass2 = [], flowersR = [], flowersY = [], flowersP = [], plants = [], bamboo = [], rocks = [];
    for (let i = 0; i < 420; i++) {
      const x = rr(gx0, gx1), z = rr(gz0, gz1); if (inPond(x, z) || (Math.abs(x) < 1.4 && z < 70)) continue;
      const k = R();
      if (k < 0.45) grass.push([x, 0, z, rr(1.6, 2.6), R() * 6]);
      else if (k < 0.65) grass2.push([x, 0, z, rr(1.8, 2.8), R() * 6]);
      else if (k < 0.74) flowersR.push([x, 0, z, rr(1.8, 2.4), R() * 6]);
      else if (k < 0.82) flowersY.push([x, 0, z, rr(1.8, 2.4), R() * 6]);
      else if (k < 0.88) flowersP.push([x, 0, z, rr(1.8, 2.4), R() * 6]);
      else if (k < 0.95) plants.push([x, 0, z, rr(2.4, 3.6), R() * 6]);
      else rocks.push([x, 0, z, rr(1.5, 3), R() * 6]);
    }
    for (let z = 64.5; z < 83.5; z += rr(1.2, 2.2)) { bamboo.push([-11.1, 0, z, rr(2.2, 3), R() * 6]); bamboo.push([11.1, 0, z + 0.5, rr(2.2, 3), R() * 6]); }
    for (let x = -10.5; x < 10.5; x += rr(1.2, 2.2)) bamboo.push([x, 0, 83.9, rr(2.2, 3), R() * 6]);
    scatter('grass_large', grass, { sway: 1.2, shadow: false }); scatter('grass_leafsLarge', grass2, { sway: 1.2, shadow: false });
    scatter('flower_redA', flowersR, { sway: 1, shadow: false }); scatter('flower_yellowA', flowersY, { sway: 1, shadow: false }); scatter('flower_purpleA', flowersP, { sway: 1, shadow: false });
    scatter('plant_bushDetailed', plants, { sway: 0.5 }); scatter('crops_bambooStageB', bamboo, { sway: 0.6 }); scatter('rock_smallA', rocks);
    // street-side greenery in the canyon too
    const sgrass = []; for (let z = 0; z < 62; z += rr(0.8, 2)) { const s = R() < 0.5 ? -1 : 1; sgrass.push([s * rr(2.6, 2.9), 0, z, rr(1.2, 2), R() * 6]); }
    scatter('grass_leafs', sgrass, { sway: 1, shadow: false });
    // fountain with water, and the lotus pond
    place('fountain_round_detail', -5.5, 0, 76.5, 2.2, 0);
    C.solid(-7.7, -3.3, 74.3, 78.7, 0, 0.55, null, { invisible: true });
    water(new T.CircleGeometry(1.95, 32), -5.5, 0.42, 76.5, '#122a52', 1);
    ponds.push({ x: -5.5, z: 76.5, r: 2, y: 0.42, fountain: true });
    water(new T.CircleGeometry(3.4, 48), 3, 0.05, 75, '#0b1838', 2);
    ponds.push({ x: 3, z: 75, r: 3.4, y: 0.05 });
    const lilies = []; for (let i = 0; i < 18; i++) { const a = R() * 6.28, r = rr(0.4, 3.0); lilies.push([3 + Math.cos(a) * r, 0.06, 75 + Math.sin(a) * r, rr(2, 3.2), R() * 6]); }
    scatter('lily_large', lilies.slice(0, 10), { shadow: false }); scatter('lily_small', lilies.slice(10), { shadow: false });
    // a stone rim for the pond
    const rim = []; for (let i = 0; i < 26; i++) { const a = i / 26 * Math.PI * 2; rim.push([3 + Math.cos(a) * 3.55, 0, 75 + Math.sin(a) * 3.55, rr(1.6, 2.2), a]); }
    scatter('rock_smallFlatA', rim);
    // lamps along the garden path
    [[-1.6, 67], [1.6, 67], [-1.6, 72], [1.6, 72], [-1.6, 77]].forEach(([x, z]) => { place('lantern', x, 0, z, 1.35, 0, { tint: '#8a6a44' }); lights.push(new T.Vector3(x, 2.0, z)); });

    // --- rain puddles on the street (they fill when it rains) ---
    for (let i = 0; i < 14; i++) {
      const x = rr(-1.8, 1.8), z = rr(0, 61), w = rr(0.8, 2.2), d = rr(0.6, 1.6);
      const p = water(new T.CircleGeometry(1, 24), x, 0.012, z, '#0a0f22', 0.6);
      p.scale.set(w, d, 1); p.material.opacity = 0; p.visible = false; puddles.push(p);
    }
    return { lights, flames, ponds, update };
  }

  function update(t, dt, weather) {
    wind.uTime.value = t;
    const wk = 0.35 + weather.rain * 0.9 + Math.sin(t * 0.13) * 0.12 + Math.max(0, Math.sin(t * 0.41)) * 0.1;
    wind.uWind.value += (wk - wind.uWind.value) * Math.min(1, dt * 0.5);
    for (const w of waterMats) { w.a.offset.set(t * 0.012, t * 0.017); w.m.normalScale.setScalar(0.35 + weather.rain * 0.6); }
    for (const p of puddles) { p.visible = weather.wet > 0.02; p.material.opacity = Math.min(0.88, weather.wet); }
  }
  return { build, wind, swayMat };
})();
