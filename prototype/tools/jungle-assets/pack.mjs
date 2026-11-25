// Packs the shrunk jungle models into one JSON file next to the game (the models travel as base64,
// like hanuman.json). usage: node pack.mjs <dir of .glb> <out .json>
import fs from 'fs';
import path from 'path';
const [dir, out] = process.argv.slice(2);
const models = {};
for (const f of fs.readdirSync(dir).filter((f) => f.endsWith('.glb')).sort()) models[f.replace(/\.glb$/, '')] = fs.readFileSync(path.join(dir, f)).toString('base64');
const data = {
  source: 'Poly Haven (polyhaven.com), CC0. Shrunk for the browser by tools/jungle-assets/process.mjs',
  models,
};
fs.writeFileSync(out, JSON.stringify(data));
console.log(Object.keys(models).join(', '), (fs.statSync(out).size / 1e6).toFixed(2), 'MB');
