# Lanka ki Chhatein

A 3D stealth-action game in the browser (three.js). Night in Lanka: Hanuman, in his small form, crosses the rooftops
and bazaar lanes past rakshasa guards to reach Sita Mata in Ashok Vatika and give her Rama's ring.

## Play

### On a PC (no install)
Download the Windows build (`Lanka-ki-Chhatein-win32-x64.zip`), unzip it, and run `LankaKiChhatein.exe`.
To build it yourself, see [Desktop build](#desktop-build).

### In a browser
The game loads its models and sounds with `fetch`, so it needs a local web server (opening the HTML file directly won't work):

```bash
python3 -m http.server 8765 --directory prototype
```

Then open http://localhost:8765/lanka-ki-chhatein.html. Everything is bundled, so no internet is needed.

## Controls

| Action | Keyboard and mouse | Touch |
|---|---|---|
| Move / look | W A S D / mouse | left stick / drag |
| Sprint (noisy) | Shift | push the stick all the way |
| Jump; press again in the air for a flip | Space | Kudo |
| Jump at a wall up to about 2.5 m tall to climb it | Space while moving | Kudo |
| Crouch and sneak | C | |
| Attack (3-hit combo) | Left click | Vaar |
| Heavy attack (gada slam) / talk | E | Bhaari |
| Switch between gada and fists | Q | Gada |
| Dodge roll (dodges hits) | R | Lot |
| Aim and throw fruit | hold Right click or F, release | hold Phenko |
| Pause | P / Esc | II |

Tips: an attack from behind on an unaware guard does triple damage. A fruit on a guard's head stuns him. Lighting a
deep (lamp) restores your health and sets the checkpoint.

## What's in the repo

| Path | Contents |
|---|---|
| `prototype/lanka-ki-chhatein.html` | The game: level, player, guards, combat, stealth, weather, HUD |
| `prototype/lanka-world.js` | Procedural Lanka architecture, sky, torchlight, potted plants |
| `prototype/js/actors.js` | Loads the rigged characters; animation controller (blended loops plus one-shots) |
| `prototype/js/fx.js` | Particles: dust, hit sparks, shockwaves, death smoke, stun stars, embers, rain, lightning |
| `prototype/js/scenery.js` | Dense set dressing with Kenney props, wind sway, water, fountain, puddles, mist |
| `prototype/js/audio.js` | Sound: positional SFX, ambience loops, stealth/combat music, tanpura drone |
| `prototype/assets/chars/` | `hanuman.glb` (rigged, 32 clips, gada) and `rakshasa.glb` (rigged, 21 clips, 4 weapons) |
| `prototype/assets/env/props.glb` | 40 Kenney props in one file |
| `prototype/assets/audio/` | 78 CC0 sounds and music tracks |
| `prototype/vendor/` | three.js r128 and fonts, bundled for offline play |
| `tools/blender/` | Blender (bpy) scripts that rig, skin, retarget and export the characters |
| `desktop/` | Electron wrapper that turns the game into a PC app |
| `design/`, `research/` | Game design doc and a technical study of a reference web game |

## Rebuilding the characters
The rigging pipeline runs headless with the `bpy` package (`pip install bpy`):

1. `b_rig_hanuman.py`: builds the skeleton (Unreal-style bone names plus a 5-bone tail), heat-weights the body and
   transfers weights to the armour, skirt, head and hair.
2. `b_gada.py`: takes the mace from `hanuman.obj` and attaches it to the right hand.
3. `b_retarget.py`: retargets the Quaternius clips by matching each bone's direction to the source T-pose, parent first.
4. `b_rakshasa.py` and `b_weapons.py`: build the rakshasa and its weapons.
5. `b_export.py`: exports the GLB with JPEG textures.

## Desktop build
```bash
cd desktop
npm install
npm run build:win
```
The app is written to `desktop/dist/`. `npm start` runs it straight from the source folder.

## Credits
All third-party art, animation and sound is CC0; see [CREDITS.md](CREDITS.md).
