// Lanka at night, built in code: the architecture on the street fronts (arched doors, pilasters, jharokhas,
// chhajjas, kangura parapets, chhatris and onion domes), plants in pots, street things (matkas, awnings, torans,
// lanterns, rugs), the rakshasa guards, and the sky (gradient dome, clouds, embers, pools of torchlight).
// Static pieces are gathered per material and merged into a few meshes so the city stays light to draw.
window.LankaWorld = (function () {
  let T, C, M; // THREE, the game's context, materials made here
  const parts = new Map();
  const live = { clouds: [], embers: null, emberData: [], lanterns: [] };

  // ---------- helpers ----------
  const _o = { p: null, q: null, s: null, e: null, m: null };
  function mat4(x, y, z, ry = 0, rx = 0, rz = 0, sx = 1, sy = 1, sz = 1) {
    if (!_o.m) { _o.p = new T.Vector3(); _o.q = new T.Quaternion(); _o.s = new T.Vector3(); _o.e = new T.Euler(0, 0, 0, 'YXZ'); }
    _o.p.set(x, y, z); _o.e.set(rx, ry, rz, 'YXZ'); _o.q.setFromEuler(_o.e); _o.s.set(sx, sy, sz);
    return new T.Matrix4().compose(_o.p, _o.q, _o.s);
  }
  function add(mat, geo, m) {
    let g = geo.index ? geo.toNonIndexed() : geo.clone();
    if (m) g.applyMatrix4(m);
    for (const k of Object.keys(g.attributes)) if (k !== 'position' && k !== 'normal' && k !== 'uv') g.deleteAttribute(k);
    if (!g.attributes.uv) g.setAttribute('uv', new T.BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2));
    if (!g.attributes.normal) g.computeVertexNormals();
    g.clearGroups();
    if (!parts.has(mat)) parts.set(mat, []);
    parts.get(mat).push(g);
  }
  function mergeAll() {
    for (const [mat, list] of parts) {
      let n = 0; for (const g of list) n += g.attributes.position.count;
      const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3), uv = new Float32Array(n * 2);
      let o = 0;
      for (const g of list) { const c = g.attributes.position.count; pos.set(g.attributes.position.array, o * 3); nor.set(g.attributes.normal.array, o * 3); uv.set(g.attributes.uv.array, o * 2); o += c; g.dispose(); }
      const geo = new T.BufferGeometry();
      geo.setAttribute('position', new T.BufferAttribute(pos, 3)); geo.setAttribute('normal', new T.BufferAttribute(nor, 3)); geo.setAttribute('uv', new T.BufferAttribute(uv, 2));
      geo.computeBoundingSphere();
      const mesh = new T.Mesh(geo, mat);
      mesh.castShadow = !mat.userData.noShadow; mesh.receiveShadow = true; mesh.renderOrder = mat.userData.order || 0;
      C.scene.add(mesh);
    }
    parts.clear();
  }
  function archShape(w, h) {
    const s = new T.Shape(); s.moveTo(-w / 2, 0); s.lineTo(-w / 2, h - w / 2); s.absarc(0, h - w / 2, w / 2, Math.PI, 0, true); s.lineTo(w / 2, 0); s.lineTo(-w / 2, 0); return s;
  }
  function archFrame(w, h, t, depth) {
    const outer = archShape(w + t * 2, h + t), inner = new T.Path();
    inner.moveTo(-w / 2, 0); inner.lineTo(w / 2, 0); inner.lineTo(w / 2, h - w / 2); inner.absarc(0, h - w / 2, w / 2, 0, Math.PI, false); inner.lineTo(-w / 2, 0);
    outer.holes.push(inner);
    return new T.ExtrudeGeometry(outer, { depth, bevelEnabled: false, curveSegments: 10 });
  }
  const box = (w, h, d) => new T.BoxGeometry(w, h, d);
  function onion(r, h) {
    // the bulb swells out from its drum, then draws in to a point
    const prof = [[0.72, 0], [0.92, 0.1], [1.0, 0.28], [0.95, 0.45], [0.75, 0.62], [0.45, 0.78], [0.2, 0.9], [0.08, 0.97], [0.001, 1]];
    return new T.LatheGeometry(prof.map(([a, b]) => new T.Vector2(a * r, b * h)), 18);
  }
  function potGeo(r, h) {
    const pts = [[0.001, 0], [r * 0.55, 0], [r * 0.95, h * 0.25], [r, h * 0.5], [r * 0.8, h * 0.82], [r * 0.5, h * 0.9], [r * 0.62, h], [r * 0.5, h]].map(([a, b]) => new T.Vector2(a, b));
    return new T.LatheGeometry(pts, 14);
  }

  // ---------- textures ----------
  function textures() {
    const ct = C.canvasTex, rand = C.rand;
    const leaf = ct(256, 256, (g, w, h) => {
      g.clearRect(0, 0, w, h);
      for (let i = 0; i < 70; i++) {
        const x = 20 + rand() * (w - 40), y = 20 + rand() * (h - 40), a = rand() * Math.PI * 2, L = 18 + rand() * 22, W = L * (0.32 + rand() * 0.12);
        g.save(); g.translate(x, y); g.rotate(a);
        g.fillStyle = `hsl(${105 + rand() * 30}, ${35 + rand() * 30}%, ${16 + rand() * 18}%)`;
        g.beginPath(); g.ellipse(0, 0, L / 2, W / 2, 0, 0, Math.PI * 2); g.fill();
        g.strokeStyle = 'rgba(200,230,150,0.25)'; g.lineWidth = 1; g.beginPath(); g.moveTo(-L / 2, 0); g.lineTo(L / 2, 0); g.stroke();
        g.restore();
      }
    });
    const flower = ct(128, 128, (g, w, h) => {
      g.clearRect(0, 0, w, h);
      for (let i = 0; i < 26; i++) { const x = 10 + rand() * (w - 20), y = 10 + rand() * (h - 20); g.fillStyle = `hsl(${8 + rand() * 25}, 90%, ${45 + rand() * 15}%)`; for (let k = 0; k < 5; k++) { g.beginPath(); g.arc(x + Math.cos(k * 1.26) * 3, y + Math.sin(k * 1.26) * 3, 2.6, 0, Math.PI * 2); g.fill(); } }
    });
    const cloth = ct(128, 128, (g, w, h) => {
      const cols = ['#c0392b', '#e8a33c', '#f3e6c2', '#8e2a4a'];
      for (let x = 0; x < w; x += 16) { g.fillStyle = cols[(x / 16) % cols.length]; g.fillRect(x, 0, 16, h); }
      g.fillStyle = 'rgba(0,0,0,0.15)'; for (let y = 0; y < h; y += 4) g.fillRect(0, y, w, 1);
      g.fillStyle = '#e8c25a'; for (let x = 0; x < w; x += 8) { g.beginPath(); g.moveTo(x, h); g.lineTo(x + 4, h - 8); g.lineTo(x + 8, h); g.fill(); }
    });
    const rug = ct(256, 128, (g, w, h) => {
      g.fillStyle = '#7a1f2b'; g.fillRect(0, 0, w, h); g.strokeStyle = '#e8c25a'; g.lineWidth = 6; g.strokeRect(8, 8, w - 16, h - 16);
      g.lineWidth = 2; g.strokeStyle = '#1f3a5a'; g.strokeRect(20, 20, w - 40, h - 40);
      g.fillStyle = '#e8c25a'; for (let i = 0; i < 5; i++) { const cx = 48 + i * 40; g.beginPath(); g.moveTo(cx, 40); g.lineTo(cx + 14, 64); g.lineTo(cx, 88); g.lineTo(cx - 14, 64); g.fill(); }
    });
    const cloud = ct(256, 128, (g, w, h) => {
      g.clearRect(0, 0, w, h);
      for (let i = 0; i < 40; i++) { const x = 30 + rand() * (w - 60), y = 40 + rand() * (h - 70), r = 14 + rand() * 30; const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, 'rgba(255,255,255,0.35)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2); }
    });
    const pool = ct(128, 128, (g, w, h) => { const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64); gr.addColorStop(0, 'rgba(255,170,90,0.55)'); gr.addColorStop(0.45, 'rgba(255,130,50,0.18)'); gr.addColorStop(1, 'rgba(255,120,40,0)'); g.fillStyle = gr; g.fillRect(0, 0, w, h); });
    const stone = ct(256, 256, (g, w, h) => { g.fillStyle = '#b39a80'; g.fillRect(0, 0, w, h); for (let i = 0; i < 3000; i++) { g.fillStyle = `rgba(${rand() < 0.5 ? '60,40,30' : '255,240,220'},${rand() * 0.12})`; g.fillRect(rand() * w, rand() * h, 2, 2); } g.strokeStyle = 'rgba(70,50,40,0.35)'; for (let y = 0; y < h; y += 32) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); } });
    // the far houses: plaster in shadow, rows of small arched windows, a few of them lit
    const farWall = ct(256, 256, (g, w, h) => {
      g.fillStyle = '#5a4a58'; g.fillRect(0, 0, w, h);
      for (let i = 0; i < 2000; i++) { g.fillStyle = `rgba(0,0,0,${rand() * 0.15})`; g.fillRect(rand() * w, rand() * h, 2, 2); }
      g.fillStyle = '#7a5a3a'; g.fillRect(0, 0, w, 10);
      for (let r = 0; r < 3; r++) for (let c = 0; c < 4; c++) { const x = 20 + c * 60, y = 40 + r * 70; g.fillStyle = rand() < 0.18 ? '#ffae5c' : '#140c18'; g.beginPath(); g.moveTo(x, y + 40); g.lineTo(x, y + 12); g.arc(x + 12, y + 12, 12, Math.PI, 0); g.lineTo(x + 24, y + 40); g.fill(); }
    });
    return { leaf, flower, cloth, rug, cloud, pool, stone, farWall };
  }

  // ---------- materials ----------
  function materials(tx) {
    const S = (o) => new T.MeshStandardMaterial(o);
    const m = {
      stone: S({ map: tx.stone, roughness: 0.85 }),
      stoneDark: S({ color: '#6e5646', roughness: 0.9 }),
      recess: new T.MeshBasicMaterial({ color: '#0c070c' }),
      glowWin: new T.MeshBasicMaterial({ color: '#ff9b45' }),
      gold: C.M.gold,
      ochre: S({ color: '#b5762e', roughness: 0.55, metalness: 0.35 }),
      clay: S({ color: '#9a4a2a', roughness: 0.85 }),
      clayPaint: S({ color: '#e8c25a', roughness: 0.6 }),
      brass: S({ color: '#b88a3a', roughness: 0.35, metalness: 0.8 }),
      wood: C.M.wood,
      leaf: S({ map: tx.leaf, alphaTest: 0.45, side: T.DoubleSide, roughness: 0.85 }),
      flower: S({ map: tx.flower, alphaTest: 0.4, side: T.DoubleSide, roughness: 0.7, emissive: new T.Color('#2a0800') }),
      cloth: S({ map: tx.cloth, side: T.DoubleSide, roughness: 0.9 }),
      rug: S({ map: tx.rug, roughness: 0.95 }),
      rope: S({ color: '#2a1d14', roughness: 1 }),
      flagA: S({ color: '#d8452a', side: T.DoubleSide, roughness: 0.8 }), flagB: S({ color: '#e8b23a', side: T.DoubleSide, roughness: 0.8 }), flagC: S({ color: '#f3e6c2', side: T.DoubleSide, roughness: 0.8 }),
      far: S({ map: tx.farWall, roughness: 0.95, color: '#8a7a8e' }),
      pool: new T.MeshBasicMaterial({ map: tx.pool, transparent: true, depthWrite: false, blending: T.AdditiveBlending, polygonOffset: true, polygonOffsetFactor: -2 }),
    };
    m.leaf.userData.noShadow = true; m.flower.userData.noShadow = true; m.pool.userData.noShadow = true; m.pool.userData.order = 2;
    m.recess.userData.noShadow = true; m.glowWin.userData.noShadow = true;
    return m;
  }

  // ---------- architecture ----------
  // a street front: local x runs along the wall, local z points out into the street
  function front(s) {
    const left = s.maxX <= 0, x0 = left ? s.maxX : s.minX, sg = left ? 1 : -1, ry = left ? Math.PI / 2 : -Math.PI / 2;
    return { put: (mat, geo, u, y, out, rx = 0, sx = 1, sy = 1, sz = 1) => add(mat, geo, mat4(x0 + sg * out, y, u, ry, rx, 0, sx, sy, sz)), u0: s.minZ, u1: s.maxZ, x0, sg };
  }
  function jharokha(F, u, y, lit) {
    F.put(M.stoneDark, box(1.5, 0.22, 0.7), u, y + 0.11, 0.35);
    for (const du of [-0.5, 0, 0.5]) F.put(M.stoneDark, box(0.14, 0.4, 0.5), u + du, y - 0.15, 0.25);
    F.put(M.stone, box(1.3, 0.95, 0.6), u, y + 0.7, 0.32);
    for (const du of [-0.4, 0, 0.4]) F.put(lit && du === 0 ? M.glowWin : M.recess, new T.ShapeGeometry(archShape(0.26, 0.62), 6), u + du, y + 0.3, 0.625);
    for (const du of [-0.62, 0.62]) F.put(M.ochre, box(0.08, 0.95, 0.08), u + du, y + 0.7, 0.6);
    F.put(M.ochre, box(1.55, 0.08, 0.8), u, y + 1.2, 0.34);
    const dome = new T.SphereGeometry(0.5, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2);
    F.put(M.ochre, dome, u, y + 1.22, 0.33, 0, 1.45, 0.75, 0.75);
    F.put(M.gold, new T.ConeGeometry(0.05, 0.28, 6), u, y + 1.72, 0.33);
  }
  function streetFront(s) {
    const F = front(s), len = s.maxZ - s.minZ, mid = (s.minZ + s.maxZ) / 2, rand = C.rand;
    F.put(M.stoneDark, box(len, 0.35, 0.12), mid, 0.175, 0.06);
    F.put(M.stone, box(len, 0.16, 0.16), mid, 2.85, 0.08);
    // ground floor: arched doorways between pilasters, some lit, some under awnings
    const n = Math.max(1, Math.floor(len / 3)), step = len / n;
    for (let i = 0; i < n; i++) {
      const u = s.minZ + step * (i + 0.5), lit = rand() < 0.35;
      F.put(lit ? M.glowWin : M.recess, new T.ShapeGeometry(archShape(1.1, 2.1), 8), u, 0.3, 0.02);
      F.put(M.stone, archFrame(1.1, 2.1, 0.16, 0.12), u, 0.3, 0.0);
      if (rand() < 0.45) { F.put(M.cloth, new T.PlaneGeometry(1.7, 1.1), u, 2.45, 0.55, Math.PI / 2 + 0.38); }
      else if (lit && rand() < 0.6) lantern(F, u + 0.85, 2.25, 0.35);
    }
    for (let i = 0; i <= n; i++) {
      const u = s.minZ + step * i; if (u < s.minZ + 0.2 || u > s.maxZ - 0.2) continue;
      F.put(M.stone, box(0.26, 2.55, 0.14), u, 1.55, 0.07); F.put(M.stone, box(0.38, 0.14, 0.2), u, 2.78, 0.1);
    }
    // upper floors: jharokhas
    const floors = s.h >= 7 ? [2.9, 5.3] : [2.9];
    for (const fy of floors) {
      const k = Math.max(1, Math.floor((len - 1) / 4.6)), st = len / k;
      for (let i = 0; i < k; i++) jharokha(F, s.minZ + st * (i + 0.5), fy, rand() < 0.4);
    }
    // the chhajja: a sloped eave under the roof line, on brackets
    const cy = s.h - 0.34;
    F.put(M.ochre, box(len + 0.3, 0.07, 0.55), mid, cy, 0.24, 0.3);
    for (let u = s.minZ + 0.5; u < s.maxZ; u += 1.2) F.put(M.stoneDark, box(0.1, 0.3, 0.32), u, cy - 0.2, 0.15);
  }
  function kangura(x1, z1, x2, z2, y, mat) {
    const len = Math.hypot(x2 - x1, z2 - z1), ry = Math.atan2(x2 - x1, z2 - z1), cx = (x1 + x2) / 2, cz = (z1 + z2) / 2;
    const n = Math.floor(len / 0.42);
    for (let i = 0; i < n; i++) {
      const t = (i + 0.5) / n, x = x1 + (x2 - x1) * t, z = z1 + (z2 - z1) * t;
      add(mat, box(0.14, 0.24, 0.22), mat4(x, y + 0.12, z, ry));
      add(mat, new T.ConeGeometry(0.12, 0.15, 4), mat4(x, y + 0.315, z, ry + Math.PI / 4));
    }
    return { len, ry, cx, cz };
  }
  function chhatri(x, y, z, r) {
    for (const [dx, dz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) add(M.stone, new T.CylinderGeometry(0.07 * r, 0.08 * r, 1.1 * r, 8), mat4(x + dx * 0.55 * r, y + 0.55 * r, z + dz * 0.55 * r));
    add(M.stoneDark, box(1.4 * r, 0.12 * r, 1.4 * r), mat4(x, y + 1.15 * r, z));
    add(M.ochre, new T.SphereGeometry(0.62 * r, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2), mat4(x, y + 1.2 * r, z, 0, 0, 0, 1, 0.9, 1));
    add(M.gold, new T.ConeGeometry(0.07 * r, 0.4 * r, 6), mat4(x, y + 1.95 * r, z));
    add(M.stoneDark, box(1.5 * r, 0.12 * r, 1.5 * r), mat4(x, y + 0.06 * r, z));
  }
  function decorate(s) {
    streetFront(s);
    const back = s.maxX <= 0 ? s.minX : s.maxX;
    if (s.route) {
      // a low parapet along the back edge: solid, so nobody walks off the back of the roof
      const x0 = s.maxX <= 0 ? back : back - 0.3, x1 = s.maxX <= 0 ? back + 0.3 : back;
      C.solid(x0, x1, s.minZ, s.maxZ, s.h, s.h + 0.42, C.boxMats(C.M.wallB));
      kangura(back + (s.maxX <= 0 ? 0.15 : -0.15), s.minZ + 0.2, back + (s.maxX <= 0 ? 0.15 : -0.15), s.maxZ - 0.2, s.h + 0.42, M.stone);
      if (C.rand() < 0.7) { const u = s.minZ + 1 + C.rand() * (s.maxZ - s.minZ - 2), xr = back + (s.maxX <= 0 ? 1.3 : -1.3); add(M.rug, new T.PlaneGeometry(1.4, 2.4), mat4(xr, s.h + 0.012, u, 0, -Math.PI / 2)); }
      for (let i = 0; i < 2; i++) { const u = s.minZ + 0.8 + C.rand() * (s.maxZ - s.minZ - 1.6), xm = back + (s.maxX <= 0 ? 0.55 : -0.55); matka(xm, s.h, u, 0.8 + C.rand() * 0.3); }
    } else {
      // the tall houses: kangura all round, chhatris at the street corners, an onion dome
      const y = s.h, inset = 0.15;
      kangura(s.minX + inset, s.minZ + inset, s.minX + inset, s.maxZ - inset, y, M.stone);
      kangura(s.maxX - inset, s.minZ + inset, s.maxX - inset, s.maxZ - inset, y, M.stone);
      kangura(s.minX + inset, s.minZ + inset, s.maxX - inset, s.minZ + inset, y, M.stone);
      kangura(s.minX + inset, s.maxZ - inset, s.maxX - inset, s.maxZ - inset, y, M.stone);
      const sx = s.maxX <= 0 ? s.maxX - 1.1 : s.minX + 1.1;
      chhatri(sx, y, s.minZ + 1.2, 1); chhatri(sx, y, s.maxZ - 1.2, 1);
      const cx = (s.minX + s.maxX) / 2 + (s.maxX <= 0 ? -0.8 : 0.8), cz = (s.minZ + s.maxZ) / 2;
      add(M.stoneDark, new T.CylinderGeometry(1.3, 1.4, 0.9, 16), mat4(cx, y + 0.45, cz));
      add(M.gold, onion(1.35, 2.6), mat4(cx, y + 0.9, cz));
      add(M.gold, new T.ConeGeometry(0.09, 0.9, 8), mat4(cx, y + 3.9, cz));
    }
  }

  // ---------- plants and things ----------
  function matka(x, y, z, s) {
    add(M.clay, potGeo(0.26 * s, 0.5 * s), mat4(x, y, z));
    add(M.clayPaint, new T.TorusGeometry(0.235 * s, 0.018 * s, 5, 16), mat4(x, y + 0.27 * s, z, 0, Math.PI / 2));
  }
  function leafCluster(x, y, z, r, n, mat = M.leaf) {
    const rand = C.rand;
    for (let i = 0; i < n; i++) {
      const a = rand() * Math.PI, d = rand() * r * 0.45, s = r * (0.9 + rand() * 0.5);
      add(mat, new T.PlaneGeometry(1, 1), mat4(x + Math.cos(a * 2) * d, y + (rand() - 0.3) * r * 0.6, z + Math.sin(a * 2) * d, a, (rand() - 0.5) * 0.7, (rand() - 0.5) * 0.4, s, s, s));
    }
  }
  function bush(x, y, z) {
    add(M.clay, potGeo(0.55, 0.62), mat4(x, y, z));
    add(M.clayPaint, new T.TorusGeometry(0.5, 0.03, 5, 18), mat4(x, y + 0.36, z, 0, Math.PI / 2));
    leafCluster(x, y + 1.0, z, 1.15, 10);
    leafCluster(x, y + 1.35, z, 0.8, 5);
  }
  function tree(x, z, s) {
    add(M.wood, new T.CylinderGeometry(0.16 * s, 0.32 * s, 3.2 * s, 9), mat4(x, 1.6 * s, z));
    const rand = C.rand;
    for (let i = 0; i < 4; i++) {
      const a = i * 1.57 + rand() * 0.6, len = (1.2 + rand() * 0.5) * s;
      add(M.wood, new T.CylinderGeometry(0.05 * s, 0.11 * s, len, 6), mat4(x + Math.sin(a) * len * 0.35, (2.7 + rand() * 0.4) * s + len * 0.3, z + Math.cos(a) * len * 0.35, a, 0.9, 0));
      const tx = x + Math.sin(a) * len * 0.75, tz = z + Math.cos(a) * len * 0.75, ty = (3.3 + rand() * 0.6) * s + len * 0.45;
      leafCluster(tx, ty, tz, 1.5 * s, 9);
      leafCluster(tx, ty + 0.2 * s, tz, 1.0 * s, 4, M.flower);
    }
    leafCluster(x, 4.6 * s, z, 1.8 * s, 10); leafCluster(x, 4.8 * s, z, 1.2 * s, 5, M.flower);
  }
  function lantern(F, u, y, out) {
    F.put(M.rope, box(0.02, 0.35, 0.02), u, y + 0.35, out);
    F.put(M.brass, new T.CylinderGeometry(0.13, 0.1, 0.22, 8), u, y + 0.12, out);
    F.put(M.glowWin, new T.CylinderGeometry(0.1, 0.1, 0.16, 8), u, y - 0.04, out);
    F.put(M.brass, new T.ConeGeometry(0.15, 0.14, 8), u, y + 0.28, out);
    const w = F.x0 + F.sg * out;
    live.lanterns.push({ x: w, y: y - 0.04, z: u });
  }
  function toran(z, y) {
    const N = 18, pts = [];
    for (let i = 0; i <= N; i++) { const t = i / N; pts.push(new T.Vector3(-3 + 6 * t, y - Math.sin(Math.PI * t) * 0.55, z)); }
    add(M.rope, new T.TubeGeometry(new T.CatmullRomCurve3(pts), 24, 0.014, 4, false));
    const tri = new T.Shape(); tri.moveTo(-0.11, 0); tri.lineTo(0.11, 0); tri.lineTo(0, -0.3); tri.lineTo(-0.11, 0);
    const flags = [M.flagA, M.flagB, M.flagC];
    for (let i = 1; i < 16; i++) { const t = i / 16, x = -3 + 6 * t, yy = y - Math.sin(Math.PI * t) * 0.55; add(flags[i % 3], new T.ShapeGeometry(tri), mat4(x, yy, z, 0, 0.15 * Math.sin(i))); }
  }

  // ---------- the sky and the air ----------
  function sky(tx) {
    const geo = new T.SphereGeometry(470, 32, 16), cols = new Float32Array(geo.attributes.position.count * 3);
    const hor = new T.Color('#3b2a5a'), mid = new T.Color('#161036'), zen = new T.Color('#04030d'), warm = new T.Color('#5a3550'), c = new T.Color();
    const moon = C.moonDir;
    for (let i = 0; i < geo.attributes.position.count; i++) {
      const x = geo.attributes.position.getX(i), y = geo.attributes.position.getY(i), z = geo.attributes.position.getZ(i), t = Math.max(0, y / 470);
      if (t < 0.25) c.copy(hor).lerp(mid, t / 0.25); else c.copy(mid).lerp(zen, Math.min(1, (t - 0.25) / 0.6));
      const toMoon = Math.max(0, (x * moon.x + y * moon.y + z * moon.z) / 470);
      c.lerp(warm, Math.pow(toMoon, 6) * 0.5 * (1 - t));
      cols[i * 3] = c.r; cols[i * 3 + 1] = c.g; cols[i * 3 + 2] = c.b;
    }
    geo.setAttribute('color', new T.BufferAttribute(cols, 3));
    const dome = new T.Mesh(geo, new T.MeshBasicMaterial({ vertexColors: true, side: T.BackSide, fog: false, depthWrite: false }));
    dome.renderOrder = -10; C.scene.add(dome); C.skyDome = dome;
    for (let i = 0; i < 9; i++) {
      const s = new T.Sprite(new T.SpriteMaterial({ map: tx.cloud, color: '#8a86c8', transparent: true, opacity: 0.22 + C.rand() * 0.18, fog: false, depthWrite: false }));
      const a = -0.9 + C.rand() * 1.4, e = 0.18 + C.rand() * 0.35, r = 380;
      s.position.set(Math.sin(a) * Math.cos(e) * r, Math.sin(e) * r, Math.cos(a) * Math.cos(e) * r);
      const sc = 90 + C.rand() * 110; s.scale.set(sc * 2, sc, 1); s.userData = { a, e, r, v: 0.004 + C.rand() * 0.006 };
      C.scene.add(s); live.clouds.push(s);
    }
  }
  function torchlight(tx, specs) {
    // a warm pool of light under every torch, and a glow on the wall behind the wall torches
    for (const [x, y, z, pole] of specs) {
      if (pole) add(M.pool, new T.PlaneGeometry(5, 5), mat4(x, y + 0.02, z, 0, -Math.PI / 2));
      else {
        const inX = x < 0 ? 1 : -1;
        add(M.pool, new T.PlaneGeometry(6, 6), mat4(x + inX * 1.2, 0.03, z, 0, -Math.PI / 2));
        add(M.pool, new T.PlaneGeometry(3.4, 3.4), mat4(x + inX * 0.03, y, z, x < 0 ? Math.PI / 2 : -Math.PI / 2));
      }
    }
    // embers rising from each flame
    const per = C.isTouch ? 6 : 12, n = specs.length * per, pos = new Float32Array(n * 3);
    specs.forEach(([x, y, z, pole], i) => { for (let k = 0; k < per; k++) live.emberData.push({ x: x, y: y + (pole ? 2.05 : 0.35), z, t: C.rand() * 2, life: 1.4 + C.rand() * 1.2, dx: (C.rand() - 0.5) * 0.4, dz: (C.rand() - 0.5) * 0.4 }); });
    const g = new T.BufferGeometry(); g.setAttribute('position', new T.BufferAttribute(pos, 3));
    live.embers = new T.Points(g, new T.PointsMaterial({ color: '#ffb35a', size: 0.07, map: C.glowTex, transparent: true, depthWrite: false, blending: T.AdditiveBlending }));
    live.embers.frustumCulled = false; C.scene.add(live.embers);
    for (const l of live.lanterns) {
      const s = new T.Sprite(new T.SpriteMaterial({ map: C.glowTex, color: '#ffa04a', transparent: true, opacity: 0.7, depthWrite: false, blending: T.AdditiveBlending }));
      s.position.set(l.x, l.y, l.z); s.scale.set(1.1, 1.1, 1); C.scene.add(s); l.s = s; l.p = C.rand() * 10;
    }
  }

  // ---------- rakshasa ----------
  function rakshasa(opts) {
    const S = (o) => new T.MeshStandardMaterial(o);
    const skin = S({ color: '#22302e', roughness: 0.55 }), cloth = S({ color: '#3e0c14', roughness: 0.9 }), dark = S({ color: '#160c10', roughness: 0.9 }), bone = S({ color: '#cfc2a4', roughness: 0.5 });
    const eye = new T.MeshBasicMaterial({ color: '#ff4a1a' }), gold = C.M.gold, leather = S({ color: '#4a2a18', roughness: 0.8 });
    const g = new T.Group(), mk = (geo, mat, x, y, z, parent = g) => { const m = new T.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = true; parent.add(m); return m; };
    // legs (pivot at the hip)
    const legs = [];
    for (const sx of [-1, 1]) {
      const p = new T.Group(); p.position.set(0.17 * sx, 0.95, 0); g.add(p);
      mk(new T.CylinderGeometry(0.15, 0.12, 0.5, 10), skin, 0, -0.25, 0, p);
      mk(new T.CylinderGeometry(0.12, 0.09, 0.45, 10), skin, 0, -0.68, 0, p);
      mk(new T.CylinderGeometry(0.13, 0.13, 0.16, 10), gold, 0, -0.62, 0, p);
      mk(new T.BoxGeometry(0.17, 0.08, 0.3), dark, 0, -0.92, 0.06, p);
      legs.push(p);
    }
    // the body: a skirt of cloth, a gold belt, a broad chest under a breastplate
    mk(new T.CylinderGeometry(0.34, 0.5, 0.55, 14, 1, true), cloth, 0, 0.82, 0).material.side = T.DoubleSide;
    mk(new T.TorusGeometry(0.36, 0.05, 6, 18), gold, 0, 1.08, 0).rotation.x = Math.PI / 2;
    const torsoPts = [[0.3, 0], [0.34, 0.15], [0.44, 0.45], [0.48, 0.62], [0.36, 0.78], [0.14, 0.82]].map(([a, b]) => new T.Vector2(a, b));
    const torso = mk(new T.LatheGeometry(torsoPts, 16), skin, 0, 1.08, 0); torso.scale.z = 0.72;
    const plate = mk(new T.SphereGeometry(0.42, 16, 10, -0.9, 1.8, 0.5, 1.1), gold, 0, 1.5, 0.02); plate.scale.set(1, 1, 0.72); plate.rotation.y = 0;
    mk(new T.TorusGeometry(0.18, 0.035, 6, 14), gold, 0, 1.86, 0).rotation.x = Math.PI / 2;
    // a leather strap across the chest and a dark cloth over the shoulders, falling behind
    const strap = mk(new T.BoxGeometry(0.1, 0.95, 0.04), leather, 0, 1.45, 0.3); strap.rotation.z = 0.7; strap.scale.z = 1;
    const cape = mk(new T.PlaneGeometry(0.9, 1.25), dark, 0, 1.2, -0.3); cape.material = dark; cape.rotation.x = 0.12; dark.side = T.DoubleSide;
    // arms (pivot at the shoulder); the right holds a spear, the left a torch or a shield
    const arms = [];
    for (const sx of [-1, 1]) {
      mk(new T.SphereGeometry(0.19, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), gold, 0.48 * sx, 1.78, 0);
      const p = new T.Group(); p.position.set(0.5 * sx, 1.72, 0); g.add(p);
      mk(new T.CylinderGeometry(0.11, 0.1, 0.42, 10), skin, 0, -0.22, 0, p);
      mk(new T.CylinderGeometry(0.1, 0.085, 0.38, 10), skin, 0, -0.6, 0.06, p).rotation.x = -0.3;
      mk(new T.CylinderGeometry(0.105, 0.105, 0.18, 10), gold, 0, -0.62, 0.07, p).rotation.x = -0.3;
      mk(new T.SphereGeometry(0.09, 10, 8), skin, 0, -0.82, 0.13, p);
      arms.push(p);
    }
    const spear = new T.Group(); spear.position.set(0, -0.82, 0.14); arms[1].add(spear);
    mk(new T.CylinderGeometry(0.028, 0.028, 2.6, 6), leather, 0, 0.45, 0, spear);
    mk(new T.ConeGeometry(0.075, 0.38, 4), S({ color: '#c9c2d8', metalness: 0.85, roughness: 0.25 }), 0, 1.92, 0, spear);
    mk(new T.SphereGeometry(0.06, 8, 6), gold, 0, 1.72, 0, spear);
    mk(new T.ConeGeometry(0.07, 0.2, 6), cloth, 0, 1.6, 0, spear).rotation.x = Math.PI;
    let torchMount = null;
    if (opts.torch) { torchMount = new T.Group(); torchMount.position.set(0, -0.8, 0.16); arms[0].add(torchMount); mk(new T.CylinderGeometry(0.035, 0.045, 0.55, 6), leather, 0, 0.12, 0, torchMount); }
    else { const sh = mk(new T.CylinderGeometry(0.3, 0.3, 0.06, 18), gold, 0.05 * -1, -0.6, 0.2, arms[0]); sh.rotation.x = Math.PI / 2; sh.rotation.z = 0.2; mk(new T.SphereGeometry(0.08, 8, 6), cloth, 0, -0.6, 0.26, arms[0]); }
    // the head: heavy brow, glowing eyes, tusks, curled horns, a gold crown
    const head = new T.Group(); head.position.set(0, 2.02, 0.02); g.add(head);
    mk(new T.SphereGeometry(0.22, 16, 12), skin, 0, 0, 0, head).scale.set(1, 1.05, 1);
    mk(new T.BoxGeometry(0.3, 0.12, 0.2), skin, 0, -0.12, 0.09, head);
    mk(new T.BoxGeometry(0.34, 0.06, 0.12), dark, 0, 0.06, 0.16, head);
    for (const sx of [-1, 1]) {
      mk(new T.SphereGeometry(0.035, 8, 6), eye, 0.08 * sx, 0.01, 0.2, head);
      const tusk = mk(new T.ConeGeometry(0.025, 0.14, 6), bone, 0.09 * sx, -0.08, 0.17, head); tusk.rotation.z = -0.25 * sx;
      const curve = new T.CatmullRomCurve3([new T.Vector3(0.14 * sx, 0.12, 0), new T.Vector3(0.3 * sx, 0.22, -0.02), new T.Vector3(0.34 * sx, 0.42, -0.06), new T.Vector3(0.24 * sx, 0.52, -0.04)]);
      mk(new T.TubeGeometry(curve, 12, 0.035, 6, false), bone, 0, 0, 0, head);
    }
    const crown = mk(new T.CylinderGeometry(0.2, 0.22, 0.1, 14, 1, true), gold, 0, 0.15, 0, head); crown.material = gold;
    for (let i = 0; i < 5; i++) { const a = -0.9 + i * 0.45; mk(new T.ConeGeometry(0.035, 0.14, 4), gold, Math.sin(a) * 0.2, 0.25, Math.cos(a) * 0.2, head); }
    return { group: g, legs, arms, torchMount, head };
  }

  // ---------- per-frame life ----------
  function update(t, dt) {
    for (const s of live.clouds) { const u = s.userData; u.a += u.v * dt; s.position.set(Math.sin(u.a) * Math.cos(u.e) * u.r, Math.sin(u.e) * u.r, Math.cos(u.a) * Math.cos(u.e) * u.r); }
    if (live.embers) {
      const a = live.embers.geometry.attributes.position.array;
      live.emberData.forEach((e, i) => {
        e.t += dt; if (e.t > e.life) { e.t = 0; e.dx = (C.rand() - 0.5) * 0.4; e.dz = (C.rand() - 0.5) * 0.4; }
        const k = e.t / e.life; a[i * 3] = e.x + e.dx * k + Math.sin(t * 3 + i) * 0.05 * k; a[i * 3 + 1] = e.y + k * 1.6; a[i * 3 + 2] = e.z + e.dz * k;
      });
      live.embers.geometry.attributes.position.needsUpdate = true;
    }
    for (const l of live.lanterns) if (l.s) l.s.material.opacity = 0.55 + Math.sin(t * 7 + l.p) * 0.1 + Math.sin(t * 13 + l.p) * 0.05;
  }

  function farHouse(x, z, w, d, h) {
    const fg = box(w, h, d), uv = fg.attributes.uv, dims = [[d, h], [d, h], [w, d], [w, d], [w, h], [w, h]];
    for (let f = 0; f < 6; f++) for (let i = 0; i < 4; i++) { const k = f * 4 + i; uv.setXY(k, uv.getX(k) * dims[f][0] / 4, uv.getY(k) * dims[f][1] / 4); }
    add(M.far, fg, mat4(x, h / 2, z));
    add(M.stoneDark, box(w + 0.3, 0.3, d + 0.3), mat4(x, h - 0.1, z));
    if (C.rand() < 0.5) { kangura(x - w / 2 + 0.2, z - d / 2 + 0.2, x + w / 2 - 0.2, z - d / 2 + 0.2, h, M.stoneDark); kangura(x - w / 2 + 0.2, z - d / 2 + 0.2, x - w / 2 + 0.2, z + d / 2 - 0.2, h, M.stoneDark); kangura(x + w / 2 - 0.2, z - d / 2 + 0.2, x + w / 2 - 0.2, z + d / 2 - 0.2, h, M.stoneDark); }
    else if (C.rand() < 0.6) chhatri(x, h, z, 1.6);
  }

  return {
    farHouse,
    init(ctx) { C = ctx; T = ctx.THREE; const tx = textures(); M = materials(tx); C.tx = tx; return M; },
    building(spec) { decorate(spec); },
    bush, tree, matka, toran,
    finish(torchSpecs) { sky(C.tx); torchlight(C.tx, torchSpecs); mergeAll(); },
    rakshasa, update,
  };
})();
