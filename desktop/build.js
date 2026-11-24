// Packages the game into a stand-alone desktop app: node build.js win32|linux|darwin
const { packager } = require('@electron/packager');
const fs = require('fs'), path = require('path');
const platform = process.argv[2] || 'win32';
const stage = path.join(__dirname, 'stage');
fs.rmSync(stage, { recursive: true, force: true }); fs.mkdirSync(stage);
for (const f of ['package.json', 'main.js']) fs.copyFileSync(path.join(__dirname, f), path.join(stage, f));
// the game itself, without the old unused files
const SKIP = new Set(['hanuman.glb', 'hanuman.json', 'hanuman-rig.js', 'animations.js', 'enemy-ai.js', 'environment.js', 'particles.js', 'sounds.js']);
fs.cpSync(path.join(__dirname, '..', 'prototype'), path.join(stage, 'game'), { recursive: true, filter: (src) => !SKIP.has(path.basename(src)) });
packager({ dir: stage, electronVersion: '33.2.1', out: path.join(__dirname, 'dist'), platform, arch: 'x64', overwrite: true, asar: true, prune: true,
  name: 'Lanka ki Chhatein', executableName: 'LankaKiChhatein', appCopyright: 'Lanka ki Chhatein' })
  .then((p) => console.log('built', p.join(', ')));
