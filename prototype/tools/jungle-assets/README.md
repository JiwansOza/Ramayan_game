# Jungle assets

Free CC0 models from [Poly Haven](https://polyhaven.com), shrunk for the browser and packed into `../../jungle.json`.

1. `python3 -I fetch.py <dl dir> island_tree_02 pachira_aquatica_01 fern_02 calathea_orbifolia_01 rock_moss_set_01 dead_tree_trunk_02 tree_stump_01 forest_leaves_02`
   downloads the 1k glTF versions (about 70 MB).
2. `node process.mjs <dl dir> <glb dir>` (needs `@gltf-transform/cli@4.1.1`, `sharp@0.33.5`, `meshoptimizer@0.22.0`)
   thins the big tree's leaf cards, simplifies the solid meshes, drops roughness maps and resizes textures to 512 px.
3. `node pack.mjs <glb dir> ../../jungle.json` packs them as base64.

The forest floor texture (`forest_leaves_02`) is copied to `../../tex/` as a plain 1k JPEG.
