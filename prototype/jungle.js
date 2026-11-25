// The jungle around Ashok Vatika, from Poly Haven's CC0 models (jungle.json, shrunk by tools/jungle-assets):
// a broad island tree, small pachira palms, ferns, calathea, mossy rocks, a fallen trunk and a stump.
// Every placement is gathered first and drawn as one InstancedMesh per model part, so a whole forest
// costs a handful of draw calls. The hiding bushes and the far forest are made from the tree's own leaf cards.
window.Jungle = (function () {
  let T = null;
  const models = {}; // name -> [variant] ; variant = { parts: [{ geo, mat }], size, base }
  const placed = new Map(); // "name#variant" -> [Matrix4]
  let ready = false;

  // ---------- loading ----------
  function decode(b64) { const s = atob(b64), u = new Uint8Array(s.length); for (let i = 0; i < s.length; i++) u[i] = s.charCodeAt(i); return u.buffer; }
  function parse(buf) { return new Promise((ok, no) => new T.GLTFLoader().parse(buf, '', ok, no)); }
  // the root nodes of a model are its variants (pachira's bark_a and leaves_a belong together)
  function variants(scene) {
    scene.updateMatrixWorld(true);
    const groups = new Map();
    for (const node of scene.children) {
      const key = node.name.replace(/_(bark|leaves)(?=_|$)/, '');
      if (!groups.has(key)) groups.set(key, []);
      node.traverse((o) => { if (o.isMesh) groups.get(key).push(o); });
    }
    const out = [];
    for (const [, meshes] of groups) {
      const box = new T.Box3(); for (const m of meshes) box.expandByObject(m);
      const c = box.getCenter(new T.Vector3()), size = box.getSize(new T.Vector3());
      const shift = new T.Matrix4().makeTranslation(-c.x, 0, -c.z);
      const parts = meshes.map((m) => { const geo = m.geometry.clone(); geo.applyMatrix4(new T.Matrix4().multiplyMatrices(shift, m.matrixWorld)); return { geo, mat: m.material }; });
      out.push({ parts, size, minY: box.min.y });
    }
    return out;
  }
  function tuneMaterial(mat) {
    if (mat.userData.tuned) return mat; mat.userData.tuned = true;
    mat.envMapIntensity = 0.3;
    if (mat.alphaTest > 0 || mat.transparent) { mat.transparent = false; mat.alphaTest = 0.45; mat.side = T.DoubleSide; }
    if (mat.map) mat.map.anisotropy = 4;
    return mat;
  }
  async function load(THREE, url) {
    T = THREE;
    const j = await fetch(url).then((r) => { if (!r.ok) throw new Error(r.status); return r.json(); });
    for (const name of Object.keys(j.models)) {
      const g = await parse(decode(j.models[name]));
      models[name] = variants(g.scene);
      for (const v of models[name]) for (const p of v.parts) tuneMaterial(p.mat);
    }
    derive();
    ready = true;
    return true;
  }

  // ---------- pieces made from the tree ----------
  // the leaf cards of the island tree, each as its own small list of triangles
  function cardsOf(geo) {
    const idx = geo.index.array, n = geo.attributes.position.count, parent = new Int32Array(n);
    for (let i = 0; i < n; i++) parent[i] = i;
    const find = (a) => { while (parent[a] !== a) a = parent[a] = parent[parent[a]]; return a; };
    for (let t = 0; t < idx.length; t += 3) { const a = find(idx[t]); parent[find(idx[t + 1])] = a; parent[find(idx[t + 2])] = a; }
    const by = new Map();
    for (let t = 0; t < idx.length; t += 3) { const r = find(idx[t]); if (!by.has(r)) by.set(r, []); by.get(r).push(idx[t], idx[t + 1], idx[t + 2]); }
    return [...by.values()];
  }
  // a new geometry from a list of cards, each card moved by fn(cardIndex, centre) -> [dx, dy, dz, scale]
  function fromCards(src, cards, fn) {
    const P = src.attributes.position, N = src.attributes.normal, U = src.attributes.uv;
    let n = 0; for (const c of cards) n += c.length;
    const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3), uv = new Float32Array(n * 2);
    let o = 0;
    cards.forEach((c, ci) => {
      let cx = 0, cy = 0, cz = 0; for (const v of c) { cx += P.getX(v); cy += P.getY(v); cz += P.getZ(v); } cx /= c.length; cy /= c.length; cz /= c.length;
      const [dx, dy, dz, s] = fn(ci, cx, cy, cz);
      for (const v of c) {
        pos[o * 3] = cx + dx + (P.getX(v) - cx) * s; pos[o * 3 + 1] = cy + dy + (P.getY(v) - cy) * s; pos[o * 3 + 2] = cz + dz + (P.getZ(v) - cz) * s;
        nor[o * 3] = N.getX(v); nor[o * 3 + 1] = N.getY(v); nor[o * 3 + 2] = N.getZ(v); uv[o * 2] = U.getX(v); uv[o * 2 + 1] = U.getY(v); o++;
      }
    });
    const g = new T.BufferGeometry();
    g.setAttribute('position', new T.BufferAttribute(pos, 3)); g.setAttribute('normal', new T.BufferAttribute(nor, 3)); g.setAttribute('uv', new T.BufferAttribute(uv, 2));
    g.computeBoundingSphere(); return g;
  }
  let leafMat = null;
  function derive() {
    const tree = models.island_tree_02[0], leaves = tree.parts.find((p) => /leaves/.test(p.mat.name));
    leafMat = leaves.mat;
    const cards = cardsOf(leaves.geo);
    // the far forest: the same tree with a quarter of its cards, each a little bigger
    const far = cards.filter((_, i) => i % 4 === 0);
    const lod = { parts: tree.parts.map((p) => (p === leaves ? { geo: fromCards(leaves.geo, far, () => [0, 0, 0, 1.45]), mat: p.mat } : p)), size: tree.size, minY: tree.minY };
    models.tree_far = [lod];
    // and for the deep forest in the fog: one card in twenty, bigger still, and only the main trunk
    const vfar = cards.filter((_, i) => i % 20 === 0);
    models.tree_vfar = [{ parts: tree.parts.filter((p) => p === leaves || !/branches/.test(p.mat.name)).map((p) => (p === leaves ? { geo: fromCards(leaves.geo, vfar, () => [0, 0, 0, 2.5]), mat: p.mat } : p)), size: tree.size, minY: tree.minY }];
    // hiding bushes: a dome of cards taken from the canopy, three shapes
    let seed = 11; const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
    models.leaf_bush = [0, 1, 2].map((k) => {
      const pick = []; for (let i = 0; i < 150; i++) pick.push(cards[Math.floor(rnd() * cards.length)]);
      const geo = fromCards(leaves.geo, pick, (i, cx, cy, cz) => {
        const a = rnd() * Math.PI * 2, u = Math.sqrt(rnd()), r = (0.15 + 0.75 * u) * (k === 1 ? 1.15 : 1), h = (1 - u * u) * (1.0 + k * 0.12) + 0.15 + rnd() * 0.2;
        return [Math.cos(a) * r - cx, h - cy, Math.sin(a) * r - cz, 0.9];
      });
      return { parts: [{ geo, mat: leafMat }], size: new T.Vector3(1.9, 1.3, 1.9), minY: 0 };
    });
  }

  // ---------- placing ----------
  // place(name, x, y, z, scale, rotY, variant) — scale: a number or [sx, sy, sz]; variant: an index, or omitted to pick one from (x, z)
  function place(name, x, y, z, s = 1, ry = 0, variant) {
    const list = models[name]; if (!list) return null;
    const vi = variant == null ? Math.abs(Math.floor(x * 7.31 + z * 3.17)) % list.length : variant % list.length;
    const key = name + '#' + vi;
    const m = new T.Matrix4().compose(new T.Vector3(x, y, z), new T.Quaternion().setFromEuler(new T.Euler(0, ry, 0)), Array.isArray(s) ? new T.Vector3(s[0], s[1], s[2]) : new T.Vector3(s, s, s));
    if (!placed.has(key)) placed.set(key, []);
    placed.get(key).push(m);
    return list[vi];
  }
  function size(name, variant = 0) { const v = models[name] && models[name][variant]; return v ? v.size : null; }
  function count(name) { return models[name] ? models[name].length : 0; }
  // every placement becomes instances; returns the meshes made
  function build(scene, opts = {}) {
    const made = [];
    for (const [key, mats] of placed) {
      const [name, vi] = key.split('#'), v = models[name][+vi];
      for (const p of v.parts) {
        const im = new T.InstancedMesh(p.geo, p.mat, mats.length);
        mats.forEach((m, i) => im.setMatrixAt(i, m));
        im.instanceMatrix.needsUpdate = true;
        const leafy = p.mat.alphaTest > 0;
        im.castShadow = opts.shadows !== false && !/far/.test(name) && (!leafy || /island|leaf_bush/.test(name));
        im.receiveShadow = true;
        if (leafy && im.castShadow) im.customDepthMaterial = new T.MeshDepthMaterial({ depthPacking: T.RGBADepthPacking, map: p.mat.map, alphaTest: p.mat.alphaTest });
        im.frustumCulled = false; // instances spread past the template's bounding sphere
        scene.add(im); made.push(im);
      }
    }
    placed.clear();
    return made;
  }
  // a stone texture from the mossy rocks, for the cliffs
  function rockMaterial() { const v = models.rock_moss_set_01 && models.rock_moss_set_01[0]; return v ? v.parts[0].mat : null; }
  function leafMaterial() { return leafMat; }

  return { load, place, build, size, count, rockMaterial, leafMaterial, get ready() { return ready; } };
})();
