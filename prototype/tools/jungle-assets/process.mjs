// Shrinks the Poly Haven models for the browser: thins leaf cards (keeping every Nth card, enlarged to fill the gaps),
// simplifies solid meshes, drops roughness maps, resizes textures to 512 and writes one GLB per model.
// usage: node process.mjs <dl dir> <out dir>
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { weld, simplify, dedup, prune, textureCompress, flatten, join } from '@gltf-transform/functions';
import { MeshoptSimplifier } from 'meshoptimizer';
import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

const [dl, out] = process.argv.slice(2);
fs.mkdirSync(out, { recursive: true });
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);

// per model: keep = fraction of leaf cards kept (cards scaled by grow), ratio = simplify target for solid meshes
const CFG = {
  island_tree_02: { keep: 0.12, grow: 1.75, twigs: 0.2, ratio: 0.02, error: 0.02 },
  pachira_aquatica_01: { ratio: 0.3, error: 0.03, leavesSolid: true },
  fern_02: { ratio: 0.6 },
  calathea_orbifolia_01: { ratio: 0.35 },
  rock_moss_set_01: { ratio: 0.08, error: 0.05 },
  dead_tree_trunk_02: { ratio: 0.04 },
  tree_stump_01: { ratio: 0.06 },
};

// keep every Nth connected card of a leaf primitive, enlarged about its own centre
function thinCards(prim, keep, grow) {
  const idx = prim.getIndices().getArray(), pos = prim.getAttribute('POSITION'), n = pos.getCount();
  const parent = new Int32Array(n).map((_, i) => i);
  const find = (a) => { while (parent[a] !== a) a = parent[a] = parent[parent[a]]; return a; };
  for (let t = 0; t < idx.length; t += 3) { const a = find(idx[t]), b = find(idx[t + 1]), c = find(idx[t + 2]); parent[b] = a; parent[find(c)] = a; }
  const tris = new Map();
  for (let t = 0; t < idx.length; t += 3) { const r = find(idx[t]); if (!tris.has(r)) tris.set(r, []); tris.get(r).push(t); }
  const every = Math.max(1, Math.round(1 / keep)), keptIdx = [], p = pos.getArray(); let k = 0;
  const moved = new Uint8Array(n);
  for (const [, list] of tris) {
    if (k++ % every) continue;
    const vs = new Set(); for (const t of list) { vs.add(idx[t]); vs.add(idx[t + 1]); vs.add(idx[t + 2]); keptIdx.push(idx[t], idx[t + 1], idx[t + 2]); }
    let cx = 0, cy = 0, cz = 0; for (const v of vs) { cx += p[v * 3]; cy += p[v * 3 + 1]; cz += p[v * 3 + 2]; }
    cx /= vs.size; cy /= vs.size; cz /= vs.size;
    for (const v of vs) { if (moved[v]) continue; moved[v] = 1; p[v * 3] = cx + (p[v * 3] - cx) * grow; p[v * 3 + 1] = cy + (p[v * 3 + 1] - cy) * grow; p[v * 3 + 2] = cz + (p[v * 3 + 2] - cz) * grow; }
  }
  pos.setArray(p);
  const Arr = n > 65535 ? Uint32Array : Uint16Array;
  prim.getIndices().setArray(new Arr(keptIdx));
  return { cards: tris.size, kept: Math.ceil(tris.size / every) };
}

const isLeaf = (m) => m && (m.getAlphaMode() !== 'OPAQUE' || /leaves/.test(m.getName()));
const report = [];
for (const id of Object.keys(CFG).filter((k) => !process.env.ONLY || process.env.ONLY.split(',').includes(k))) {
  const c = CFG[id], f = fs.readdirSync(path.join(dl, id)).find((x) => x.endsWith('.gltf'));
  const doc = await io.read(path.join(dl, id, f)), root = doc.getRoot();
  let before = 0; for (const m of root.listMeshes()) for (const p of m.listPrimitives()) before += p.getIndices().getCount() / 3;
  const notes = [];
  // big leaf canopies: thin the cards before anything else (simplifying cards would shred them)
  if (c.keep) for (const m of root.listMeshes()) for (const p of m.listPrimitives()) {
    const mat = p.getMaterial(); if (!/leaves/.test(mat?.getName() || '')) continue;
    const r = thinCards(p, c.keep, c.grow); notes.push(`cards ${r.cards}->${r.kept}`);
  }
  // leaves become alpha-tested (cheap, no sorting); everything loses its roughness map
  for (const mat of root.listMaterials()) {
    mat.setMetallicRoughnessTexture(null); mat.setMetallicFactor(0); mat.setRoughnessFactor(isLeaf(mat) ? 0.75 : 0.92);
    if (mat.getAlphaMode() === 'BLEND' || (/leaves/.test(mat.getName()) && !c.leavesSolid)) { mat.setAlphaMode('MASK'); mat.setAlphaCutoff(0.45); }
    if (/leaves/.test(mat.getName()) && c.leavesSolid) { mat.setAlphaMode('MASK'); mat.setAlphaCutoff(0.45); }
    mat.setDoubleSided(isLeaf(mat));
  }
  await doc.transform(dedup(), weld({}));
  // simplify the solid (and modelled-leaf) meshes, leaving thinned card canopies alone
  await MeshoptSimplifier.ready;
  for (const m of root.listMeshes()) for (const p of m.listPrimitives()) {
    if (c.keep && /leaves/.test(p.getMaterial()?.getName() || '')) continue;
    const tmp = [p];
    const sub = (await import('@gltf-transform/functions')).simplifyPrimitive;
    sub(p, { simplifier: MeshoptSimplifier, ratio: c.ratio, error: c.error ?? 0.01, lockBorder: false });
  }
  // the branches simplify into thousands of separate twigs a few triangles each: keep one in so many
  if (c.twigs) for (const m of root.listMeshes()) for (const p of m.listPrimitives()) {
    if (!/branches/.test(p.getMaterial()?.getName() || '')) continue;
    const r = thinCards(p, c.twigs, 1); notes.push(`twigs ${r.cards}->${r.kept}`);
  }
  await doc.transform(prune(), textureCompress({ encoder: sharp, resize: [512, 512], targetFormat: undefined, quality: 80 }));
  // colour and normal maps without alpha travel as JPEG
  for (const t of root.listTextures()) {
    if (t.getMimeType() !== 'image/png') continue;
    const img = sharp(Buffer.from(t.getImage())); const meta = await img.metadata();
    const usedAsAlpha = root.listMaterials().some((m) => m.getBaseColorTexture() === t && m.getAlphaMode() === 'MASK');
    if (!usedAsAlpha || !meta.hasAlpha) { t.setImage(new Uint8Array(await sharp(Buffer.from(t.getImage())).removeAlpha().jpeg({ quality: 80 }).toBuffer())); t.setMimeType('image/jpeg'); t.setURI(''); }
  }
  let after = 0; for (const m of root.listMeshes()) for (const p of m.listPrimitives()) after += p.getIndices().getCount() / 3;
  const file = path.join(out, id + '.glb'); await io.write(file, doc);
  report.push(`${id}: ${before | 0} -> ${after | 0} tris, ${(fs.statSync(file).size / 1e6).toFixed(2)} MB ${notes.join(' ')}`);
  console.log(report.at(-1));
}
