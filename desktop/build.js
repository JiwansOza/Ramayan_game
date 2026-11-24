// Packages the game into a stand-alone desktop app: node build.js win32|linux|darwin
const { packager } = require('@electron/packager');
const fs = require('fs'), path = require('path');
const platform = process.argv[2] || 'win32';
const stage = path.join(__dirname, 'stage');
fs.rmSync(stage, { recursive: true, force: true }); fs.mkdirSync(stage);
for (const f of ['package.json', 'main.js']) fs.copyFileSync(path.join(__dirname, f), path.join(stage, f));
// the game itself, everything in prototype/
fs.cpSync(path.join(__dirname, '..', 'prototype'), path.join(stage, 'game'), { recursive: true });
// fail loudly if a file the game needs did not make it in
for (const f of ['lanka-ki-chhatein.html', 'assets/chars/hanuman.glb', 'assets/chars/rakshasa.glb', 'assets/env/props.glb', 'vendor/three.min.js'])
  if (!fs.existsSync(path.join(stage, 'game', f))) throw new Error('missing from build: ' + f);
packager({ dir: stage, electronVersion: '33.2.1', out: path.join(__dirname, 'dist'), platform, arch: 'x64', overwrite: true, asar: true, prune: true,
  name: 'Lanka ki Chhatein', executableName: 'LankaKiChhatein', appCopyright: 'Lanka ki Chhatein' })
  .then((p) => console.log('built', p.join(', ')));
