// A skeleton fitted by hand to the sculpted Hanuman (model units: about 1.9 tall, facing +z,
// his right hand with the mace at -x, the tail rising behind on his left at +x), and skin weights
// worked out from how far each vertex is from each bone.
window.HANUMAN_RIG = (function () {
  const J = {
    hips: [0.04, -0.08, 0.02], spine: [0.02, 0.15, 0.03], chest: [0.0, 0.38, 0.0], neck: [0.0, 0.56, -0.02], head: [0.0, 0.68, 0.0], headEnd: [0.0, 0.95, 0.0],
    thighR: [-0.05, -0.12, 0.02], shinR: [-0.05, -0.5, -0.07], footR: [-0.01, -0.8, -0.12], toeR: [-0.05, -0.95, -0.04],
    thighL: [0.16, -0.12, 0.06], shinL: [0.19, -0.5, 0.12], footL: [0.22, -0.79, 0.04], toeL: [0.24, -0.93, 0.17],
    upperArmR: [-0.22, 0.47, -0.07], foreArmR: [-0.28, 0.16, -0.14], handR: [-0.29, -0.07, -0.12], handEndR: [-0.41, -0.38, 0.29],
    upperArmL: [0.27, 0.47, 0.0], foreArmL: [0.29, 0.17, 0.13], handL: [0.26, -0.06, 0.25], handEndL: [0.25, -0.15, 0.27],
    tail0: [0.12, 0.0, -0.21], tail1: [0.33, 0.06, -0.24], tail2: [0.47, 0.22, -0.29], tail3: [0.42, 0.4, -0.26], tail4: [0.47, 0.6, -0.25], tail5: [0.46, 0.76, -0.26], tail6: [0.39, 0.87, -0.25], tailEnd: [0.27, 0.79, -0.25],
  };
  // bone: [parent, joint, segment end]
  const B = {
    hips: [null, 'hips', 'spine'], spine: ['hips', 'spine', 'chest'], chest: ['spine', 'chest', 'neck'], neck: ['chest', 'neck', 'head'], head: ['neck', 'head', 'headEnd'],
    thighR: ['hips', 'thighR', 'shinR'], shinR: ['thighR', 'shinR', 'footR'], footR: ['shinR', 'footR', 'toeR'],
    thighL: ['hips', 'thighL', 'shinL'], shinL: ['thighL', 'shinL', 'footL'], footL: ['shinL', 'footL', 'toeL'],
    upperArmR: ['chest', 'upperArmR', 'foreArmR'], foreArmR: ['upperArmR', 'foreArmR', 'handR'], handR: ['foreArmR', 'handR', 'handEndR'],
    upperArmL: ['chest', 'upperArmL', 'foreArmL'], foreArmL: ['upperArmL', 'foreArmL', 'handL'], handL: ['foreArmL', 'handL', 'handEndL'],
    tail0: ['hips', 'tail0', 'tail1'], tail1: ['tail0', 'tail1', 'tail2'], tail2: ['tail1', 'tail2', 'tail3'], tail3: ['tail2', 'tail3', 'tail4'], tail4: ['tail3', 'tail4', 'tail5'], tail5: ['tail4', 'tail5', 'tail6'], tail6: ['tail5', 'tail6', 'tailEnd'],
  };
  const names = Object.keys(B);
  const families = {
    body: ['hips', 'spine', 'chest', 'neck', 'head'],
    legR: ['thighR', 'shinR', 'footR'], legL: ['thighL', 'shinL', 'footL'],
    armR: ['upperArmR', 'foreArmR', 'handR'], armL: ['upperArmL', 'foreArmL', 'handL'],
    tail: ['tail0', 'tail1', 'tail2', 'tail3', 'tail4', 'tail5', 'tail6'],
  };
  const sm = (a, b, v) => { const t = Math.min(1, Math.max(0, (v - a) / (b - a))); return t * t * (3 - 2 * t); };
  // which limb a vertex belongs to, with soft edges where a limb meets the body
  const near = (x, y, z, fam) => Math.min(...families[fam].map((b) => Math.sqrt(segDist2(x, y, z, J[B[b][1]], J[B[b][2]])) - (b === 'handR' ? 0.05 : 0)));
  function family(x, y, z) {
    // the tail: low behind the hips, then up his left side well clear of the hair
    if ((z < -0.2 && x > 0.08 && y < 0.3) || (x > 0.25 && z < -0.19 && y >= 0.3) || (z < -0.25 && x > 0.2 && y < 0.3) || (x > 0.2 && near(x, y, z, 'tail') < 0.1)) return [['tail', 1]];
    // the arms: outside the torso and close to the arm's own bones, with soft edges everywhere (a hard edge would tear)
    const out = []; let rest = 1;
    const aR = sm(-0.15, -0.23, x) * sm(0.58, 0.4, y) * sm(-0.66, -0.56, y) * sm(0.2, 0.1, near(x, y, z, 'armR'));
    // (his left hand rests on the hip, fused into it: there the edge is kept sharp so the cut below separates them)
    const dL = near(x, y, z, 'armL'), low = sm(0.2, 0.05, y), bandL = (1 - low) * sm(0.17, 0.09, dL) + low * sm(0.1, 0.092, dL);
    const xL = (1 - low) * sm(0.17, 0.25, x) + low * sm(0.226, 0.236, x);
    const aL = xL * sm(0.58, 0.4, y) * sm(-0.25, -0.17, y) * sm(-0.26, -0.18, z) * bandL;
    if (aR > 0) { out.push(['armR', aR]); rest -= aR; }
    if (aL > 0) { out.push(['armL', aL]); rest -= aL; }
    // the legs below the hips, the two sides blended down the middle of the dhoti
    if (rest > 0 && y < 0) { const w = sm(-0.02, -0.3, y) * rest, s = sm(0.0, 0.13, x); out.push(['legR', w * (1 - s)], ['legL', w * s]); rest -= w; }
    if (rest > 0) out.push(['body', rest]);
    return out;
  }
  function segDist2(px, py, pz, a, b) {
    const abx = b[0] - a[0], aby = b[1] - a[1], abz = b[2] - a[2];
    let t = ((px - a[0]) * abx + (py - a[1]) * aby + (pz - a[2]) * abz) / (abx * abx + aby * aby + abz * abz);
    t = Math.max(0, Math.min(1, t));
    const dx = px - (a[0] + abx * t), dy = py - (a[1] + aby * t), dz = pz - (a[2] + abz * t);
    return dx * dx + dy * dy + dz * dz;
  }
  function weights(x, y, z, famOut) {
    const acc = {};
    const fams = family(x, y, z);
    if (famOut) { for (const k in famOut) famOut[k] = 0; for (const [f, w] of fams) famOut[f] += w; }
    for (const [fam, fw] of fams) {
      if (fw < 0.001) continue;
      const bones = families[fam]; let sum = 0; const ws = [];
      for (const b of bones) { const d2 = segDist2(x, y, z, J[B[b][1]], J[B[b][2]]); const w = 1 / (d2 * d2 + 1e-7); ws.push(w); sum += w; }
      bones.forEach((b, i) => { acc[b] = (acc[b] || 0) + fw * ws[i] / sum; });
    }
    const list = Object.entries(acc).sort((a, b) => b[1] - a[1]).slice(0, 4);
    const tot = list.reduce((s, e) => s + e[1], 0);
    return list.map(([b, w]) => [names.indexOf(b), w / tot]);
  }
  // builds a SkinnedMesh from a plain mesh geometry (already in model units) and material
  function build(THREE, geometry, material) {
    const p = geometry.attributes.position, n = p.count, si = new Uint16Array(n * 4), sw = new Float32Array(n * 4);
    const famKeys = Object.keys(families), fv = new Float32Array(n * famKeys.length), fo = {};
    famKeys.forEach((k) => { fo[k] = 0; });
    for (let i = 0; i < n; i++) {
      const w = weights(p.getX(i), p.getY(i), p.getZ(i), fo); w.forEach(([b, v], k) => { si[i * 4 + k] = b; sw[i * 4 + k] = v; });
      famKeys.forEach((k, j) => { fv[i * famKeys.length + j] = fo[k]; });
    }
    // where a hand is fused to the hip or the tail to something else, the surface jumps from one limb to another
    // inside a single triangle: cut those triangles so a moving limb doesn't drag a sheet of skin with it
    let cut = 0;
    if (geometry.index) {
      const idx = geometry.index.array, F = famKeys.length, keep = [];
      const jump = (a, b) => { let d = 0; for (let j = 0; j < F; j++) d += Math.abs(fv[a * F + j] - fv[b * F + j]); return d; };
      for (let t = 0; t < idx.length; t += 3) {
        const a = idx[t], b = idx[t + 1], c = idx[t + 2];
        if (Math.max(jump(a, b), jump(b, c), jump(a, c)) > 1.0) { cut++; continue; }
        keep.push(a, b, c);
      }
      geometry.setIndex(keep);
    }
    geometry.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(si, 4));
    geometry.setAttribute('skinWeight', new THREE.Float32BufferAttribute(sw, 4));
    const bones = {}, list = names.map((nm) => { const b = new THREE.Bone(); b.name = nm; bones[nm] = b; return b; });
    for (const nm of names) {
      const [parent, joint] = B[nm], j = J[joint];
      if (parent) { const pj = J[B[parent][1]]; bones[nm].position.set(j[0] - pj[0], j[1] - pj[1], j[2] - pj[2]); bones[parent].add(bones[nm]); }
      else bones[nm].position.set(j[0], j[1], j[2]);
    }
    material.skinning = true;
    const mesh = new THREE.SkinnedMesh(geometry, material);
    mesh.add(bones.hips); mesh.updateMatrixWorld(true); mesh.bind(new THREE.Skeleton(list));
    return { mesh, bones, names, cut };
  }
  // The sculpt is caught mid-stride on its toes, the front (left) foot lifted. Standing, both soles go flat on the
  // floor: the back (right) knee bends a little to bring that foot up level with the front one, and each foot turns
  // at the ankle so the heel comes down. (Measured on the model: both soles then sit level, heel and ball.)
  const stance = { thighR: -0.2, shinR: 0.8, footR: -1.6, footL: -0.82 };
  // the heel and the ball of each foot, in that foot bone's own frame: what touches the floor
  const soles = [['footR', [-0.051, -0.035, -0.054]], ['footR', [-0.079, -0.136, 0.016]], ['footL', [-0.017, 0.029, -0.03]], ['footL', [-0.014, -0.14, 0.128]]];
  return { J, B, names, families, weights, build, stance, soles };
})();
