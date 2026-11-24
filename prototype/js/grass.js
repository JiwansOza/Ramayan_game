// Lanka ki Chhatein: lush grass. Thousands of instanced blades, each a tapered three-segment strip,
// darker at the root and sunlit at the tip, bending in the same wind as the plants.
window.LankaGrass = (function () {
  'use strict';
  function blade(T) {
    const g = new T.BufferGeometry(), w = 0.07, h = 1;
    const p = [-w / 2, 0, 0, w / 2, 0, 0, -w * 0.38, h * 0.4, 0.02, w * 0.38, h * 0.4, 0.02, -w * 0.18, h * 0.75, 0.06, w * 0.18, h * 0.75, 0.06, 0, h, 0.12];
    g.setAttribute('position', new T.Float32BufferAttribute(p, 3));
    g.setIndex([0, 1, 2, 1, 3, 2, 2, 3, 4, 3, 5, 4, 4, 5, 6]);
    g.computeVertexNormals();
    return g;
  }
  // fields: [{ x0, x1, z0, z1, y, n, h, skip(x,z) }]
  function build(T, scene, wind, fields, rand) {
    const geo = blade(T);
    const mat = new T.MeshLambertMaterial({ side: T.DoubleSide });
    mat.onBeforeCompile = (sh) => {
      sh.uniforms.uTime = wind.uTime; sh.uniforms.uWind = wind.uWind;
      sh.vertexShader = 'uniform float uTime; uniform float uWind; varying float vH;\n' + sh.vertexShader
        .replace('#include <begin_vertex>', `#include <begin_vertex>
          vH = position.y;
          vec3 wp = instanceMatrix[3].xyz;
          float ph = uTime * 1.9 + wp.x * 0.45 + wp.z * 0.3;
          float gust = sin(uTime * 0.6 + wp.x * 0.08 + wp.z * 0.05) * 0.5 + 0.5;
          float bend = (sin(ph) * 0.35 + 0.65 * gust) * uWind * 0.55 * position.y * position.y;
          transformed.x += bend; transformed.z += bend * 0.6; transformed.y -= bend * bend * 0.3;`)
        // up-facing normals so blades light like a soft lawn instead of flickering cards
        .replace('#include <beginnormal_vertex>', 'vec3 objectNormal = vec3(0.0, 1.0, 0.0);');
      sh.fragmentShader = 'varying float vH;\n' + sh.fragmentShader
        .replace('vec4 diffuseColor = vec4( diffuse, opacity );', 'vec4 diffuseColor = vec4( diffuse * mix(0.35, 1.25, vH), opacity );');
    };
    mat.customProgramCacheKey = () => 'grass';
    const meshes = [];
    for (const f of fields) {
      const list = [];
      let tries = 0;
      while (list.length < f.n && tries++ < f.n * 3) {
        const x = f.x0 + rand() * (f.x1 - f.x0), z = f.z0 + rand() * (f.z1 - f.z0);
        if (f.skip && f.skip(x, z)) continue;
        list.push([x, z]);
      }
      const im = new T.InstancedMesh(geo, mat, list.length);
      const o = new T.Object3D(), c = new T.Color();
      list.forEach(([x, z], i) => {
        o.position.set(x, f.y, z); o.rotation.set(0, rand() * Math.PI * 2, 0);
        const hh = f.h * (0.55 + rand() * 0.75); o.scale.set(0.8 + rand() * 0.6, hh, 1); o.updateMatrix(); im.setMatrixAt(i, o.matrix);
        // greens from deep to sunlit, a few dry tips
        const k = rand();
        c.setHSL(0.24 + rand() * 0.07 - (k > 0.92 ? 0.1 : 0), 0.55 + rand() * 0.25, 0.26 + rand() * 0.14);
        im.setColorAt(i, c);
      });
      im.instanceColor.needsUpdate = true;
      im.receiveShadow = true; im.castShadow = false; im.frustumCulled = false;
      scene.add(im); meshes.push(im);
    }
    return meshes;
  }
  return { build };
})();
