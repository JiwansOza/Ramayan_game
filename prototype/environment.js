// Dense Environment System for Lanka ki Chhatein
// Enriches the world with dense vegetation (climbing vines, palms, hanging garlands, rooftop moss),
// water effects (puddles, ripples, lotus pond), wind simulation, and bazaar props (canopies, banners, crates, barrels).

window.LankaEnvironment = (function () {
  'use strict';

  let THREE = null;
  let scene = null;
  let M = null; // materials

  // Dynamic elements tracked for wind & water updates
  const windSwayList = [];
  const waterRipples = [];
  const mistPatches = [];

  function init(ctx) {
    THREE = ctx.THREE;
    scene = ctx.scene;
    M = ctx.M;
  }

  // --- Procedural 3D Plant & Prop Builders ---

  // 1. Climbing Wall Vines & Ivy
  function createWallVine(x, yStart, yEnd, z, face = 'front') {
    const height = yEnd - yStart;
    const curvePts = [];
    const segments = 12;

    for (let i = 0; i <= segments; i++) {
      const t = i / segments;
      const py = yStart + t * height;
      const px = x + Math.sin(t * 8) * 0.18;
      const pz = z + Math.cos(t * 7) * 0.08;
      curvePts.push(new THREE.Vector3(px, py, pz));
    }

    const curve = new THREE.CatmullRomCurve3(curvePts);
    const stemGeo = new THREE.TubeGeometry(curve, 16, 0.035, 5, false);
    const stemMat = new THREE.MeshStandardMaterial({ color: 0x2e4428, roughness: 0.9 });
    const stemMesh = new THREE.Mesh(stemGeo, stemMat);
    scene.add(stemMesh);

    // Add leaf clusters along vine
    const leafMat = new THREE.MeshStandardMaterial({
      color: 0x336633,
      roughness: 0.8,
      side: THREE.DoubleSide
    });

    const leafGeo = new THREE.PlaneGeometry(0.24, 0.32);
    for (let i = 2; i < segments - 1; i += 2) {
      const pt = curvePts[i];
      for (let k = 0; k < 3; k++) {
        const leaf = new THREE.Mesh(leafGeo, leafMat);
        leaf.position.set(
          pt.x + (Math.random() - 0.5) * 0.25,
          pt.y + (Math.random() - 0.5) * 0.2,
          pt.z + (Math.random() - 0.5) * 0.15
        );
        leaf.rotation.set(Math.random(), Math.random(), Math.random());
        scene.add(leaf);
        windSwayList.push({ obj: leaf, baseRot: leaf.rotation.clone(), speed: 2.2 + Math.random(), amp: 0.12 });
      }
    }
  }

  // 2. Hanging Flower Garlands (Toran / Genda Phool)
  function createFloralGarland(p1, p2, colorHex = 0xff8811) {
    const mid = new THREE.Vector3().addVectors(p1, p2).multiplyScalar(0.5);
    mid.y -= 0.65; // droop

    const curve = new THREE.CatmullRomCurve3([p1, mid, p2]);
    const ropeGeo = new THREE.TubeGeometry(curve, 18, 0.015, 4, false);
    const ropeMat = new THREE.MeshStandardMaterial({ color: 0x886633 });
    const ropeMesh = new THREE.Mesh(ropeGeo, ropeMat);
    scene.add(ropeMesh);

    // Strung marigold flower balls
    const flowerGeo = new THREE.SphereGeometry(0.08, 6, 6);
    const flowerMat = new THREE.MeshStandardMaterial({
      color: colorHex,
      roughness: 0.6,
      emissive: new THREE.Color(colorHex).multiplyScalar(0.2)
    });

    const numFlowers = 18;
    for (let i = 1; i < numFlowers; i++) {
      const t = i / numFlowers;
      const pt = curve.getPoint(t);
      const fl = new THREE.Mesh(flowerGeo, flowerMat);
      fl.position.copy(pt);
      scene.add(fl);
      windSwayList.push({ obj: fl, basePos: fl.position.clone(), speed: 1.8, amp: 0.06 });
    }
  }

  // 3. Banana Palm & Tropical Plants
  function createPalmPlant(x, y, z, scale = 1.0) {
    const group = new THREE.Group();
    group.position.set(x, y, z);

    // Terracotta base planter
    const potGeo = new THREE.CylinderGeometry(0.35 * scale, 0.25 * scale, 0.5 * scale, 12);
    const potMat = new THREE.MeshStandardMaterial({ color: 0x8a452a, roughness: 0.85 });
    const pot = new THREE.Mesh(potGeo, potMat);
    pot.position.y = 0.25 * scale;
    group.add(pot);

    // Large arching banana leaves
    const numLeaves = 7;
    const leafMat = new THREE.MeshStandardMaterial({
      color: 0x2e6633,
      roughness: 0.75,
      side: THREE.DoubleSide
    });

    for (let i = 0; i < numLeaves; i++) {
      const angle = (i / numLeaves) * Math.PI * 2;
      const leafGroup = new THREE.Group();
      leafGroup.rotation.y = angle;

      // Leaf arch curve
      const leafCurve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(0, 0.45 * scale, 0),
        new THREE.Vector3(0.5 * scale, 0.9 * scale, 0),
        new THREE.Vector3(1.1 * scale, 0.7 * scale, 0),
        new THREE.Vector3(1.4 * scale, 0.3 * scale, 0)
      ]);

      const stem = new THREE.Mesh(new THREE.TubeGeometry(leafCurve, 8, 0.02 * scale, 4, false), potMat);
      leafGroup.add(stem);

      // Leaf blade
      const bladeGeo = new THREE.PlaneGeometry(0.45 * scale, 1.1 * scale, 3, 5);
      const blade = new THREE.Mesh(bladeGeo, leafMat);
      blade.position.set(0.85 * scale, 0.75 * scale, 0);
      blade.rotation.z = -0.55;
      blade.rotation.x = Math.PI / 2;
      leafGroup.add(blade);

      group.add(leafGroup);
      windSwayList.push({ obj: leafGroup, baseRot: leafGroup.rotation.clone(), speed: 1.6 + i * 0.2, amp: 0.08 });
    }

    scene.add(group);
  }

  // 4. Street Crates & Stacked Barrels
  function createCratesAndBarrels(x, y, z) {
    const woodMat = new THREE.MeshStandardMaterial({ color: 0x6e4a2a, roughness: 0.9 });
    const crateGeo = new THREE.BoxGeometry(0.8, 0.8, 0.8);
    const barrelGeo = new THREE.CylinderGeometry(0.35, 0.32, 0.9, 10);

    // Base crate
    const c1 = new THREE.Mesh(crateGeo, woodMat);
    c1.position.set(x, y + 0.4, z);
    c1.castShadow = true;
    scene.add(c1);

    // Stacked crate
    const c2 = new THREE.Mesh(crateGeo, woodMat);
    c2.position.set(x + 0.15, y + 1.2, z + 0.05);
    c2.rotation.y = 0.25;
    c2.castShadow = true;
    scene.add(c2);

    // Neighboring barrel
    const b1 = new THREE.Mesh(barrelGeo, woodMat);
    b1.position.set(x + 0.85, y + 0.45, z - 0.2);
    b1.castShadow = true;
    scene.add(b1);
  }

  // 5. Rain Puddles with Water Ripple Animation
  function createPuddle(x, y, z, rx = 1.4, rz = 0.9) {
    const puddleGeo = new THREE.CircleGeometry(1, 24);
    const puddleMat = new THREE.MeshStandardMaterial({
      color: 0x182436,
      metalness: 0.92,
      roughness: 0.08,
      transparent: true,
      opacity: 0.82
    });

    const puddle = new THREE.Mesh(puddleGeo, puddleMat);
    puddle.rotation.x = -Math.PI / 2;
    puddle.position.set(x, y + 0.015, z);
    puddle.scale.set(rx, rz, 1);
    scene.add(puddle);

    // Ripple ring
    const ripGeo = new THREE.RingGeometry(0.1, 0.18, 16);
    const ripMat = new THREE.MeshBasicMaterial({
      color: 0x88bbdd,
      transparent: true,
      opacity: 0.5,
      side: THREE.DoubleSide
    });
    const rip = new THREE.Mesh(ripGeo, ripMat);
    rip.rotation.x = -Math.PI / 2;
    rip.position.set(x, y + 0.02, z);
    scene.add(rip);

    waterRipples.push({ mesh: rip, x, z, scale: 0.2, maxScale: rx * 0.8, timer: Math.random() * 2 });
  }

  // 6. Rooftop Cloth Awning / Canopy
  function createClothAwning(x1, x2, z, y, colorHex = 0x992222) {
    const width = x2 - x1;
    const awningGeo = new THREE.PlaneGeometry(width, 1.8, 6, 4);
    const awningMat = new THREE.MeshStandardMaterial({
      color: colorHex,
      roughness: 0.85,
      side: THREE.DoubleSide
    });

    const awning = new THREE.Mesh(awningGeo, awningMat);
    awning.position.set((x1 + x2) / 2, y, z);
    awning.rotation.x = Math.PI / 3;
    scene.add(awning);

    windSwayList.push({ obj: awning, baseRot: awning.rotation.clone(), speed: 2.5, amp: 0.06 });
  }

  // 7. Ground Mist / Night Fog
  function createMist(x, y, z, radius = 5.0) {
    const c = document.createElement('canvas');
    c.width = 64; c.height = 64;
    const g = c.getContext('2d');
    const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    gr.addColorStop(0, 'rgba(180, 195, 230, 0.22)');
    gr.addColorStop(0.5, 'rgba(140, 160, 200, 0.1)');
    gr.addColorStop(1, 'rgba(100, 120, 180, 0)');
    g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
    const tex = new THREE.CanvasTexture(c);

    const mistMat = new THREE.SpriteMaterial({
      map: tex,
      transparent: true,
      opacity: 0.35,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    const sprite = new THREE.Sprite(mistMat);
    sprite.position.set(x, y + 0.8, z);
    sprite.scale.set(radius, radius * 0.5, 1);
    scene.add(sprite);

    mistPatches.push({ sprite, baseX: x, baseZ: z, phase: Math.random() * Math.PI * 2 });
  }

  // --- Load and place External CC0 3D Models (.glb) ---
  function loadExternalModels() {
    if (!THREE || !THREE.GLTFLoader) return;
    const loader = new THREE.GLTFLoader();

    // 1. Tall Foliage Trees in Ashok Vatika
    loader.load('assets/models/tree-tall.glb', (gltf) => {
      const positions = [
        [-6.5, 0, 77, 1.8],
        [7.2, 0, 78, 1.9],
        [-1.8, 0, 82, 1.6],
        [8.0, 0, 67, 1.7]
      ];
      positions.forEach(([x, y, z, s]) => {
        const clone = gltf.scene.clone();
        clone.position.set(x, y, z);
        clone.scale.set(s, s, s);
        clone.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
        scene.add(clone);
        windSwayList.push({ obj: clone, baseRot: clone.rotation.clone(), speed: 1.4, amp: 0.04 });
      });
    }, undefined, () => {});

    // 2. Medium Trees
    loader.load('assets/models/tree.glb', (gltf) => {
      const positions = [
        [4.8, 0, 69, 1.6],
        [-7.8, 0, 71, 1.7],
        [2.2, 0, 80, 1.5]
      ];
      positions.forEach(([x, y, z, s]) => {
        const clone = gltf.scene.clone();
        clone.position.set(x, y, z);
        clone.scale.set(s, s, s);
        clone.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
        scene.add(clone);
        windSwayList.push({ obj: clone, baseRot: clone.rotation.clone(), speed: 1.7, amp: 0.05 });
      });
    }, undefined, () => {});

    // 3. Garden Fountain in Ashok Vatika
    loader.load('assets/models/fountain.glb', (gltf) => {
      const fountain = gltf.scene;
      fountain.position.set(-0.2, 0, 73.5);
      fountain.scale.set(1.4, 1.4, 1.4);
      fountain.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
      scene.add(fountain);
    }, undefined, () => {});

    // 4. Rooftop Flags
    loader.load('assets/models/flag.glb', (gltf) => {
      const flagSpots = [
        [-8.8, 5.4, 10.0, 1.2],
        [-8.8, 5.4, 22.0, 1.2],
        [8.8, 5.0, 27.0, 1.2],
        [8.8, 5.8, 48.0, 1.2],
        [0, 4.8, 63.2, 1.5] // Ashok Vatika Gate
      ];
      flagSpots.forEach(([x, y, z, s]) => {
        const flag = gltf.scene.clone();
        flag.position.set(x, y, z);
        flag.scale.set(s, s, s);
        flag.traverse((o) => { if (o.isMesh) { o.castShadow = true; } });
        scene.add(flag);
        windSwayList.push({ obj: flag, baseRot: flag.rotation.clone(), speed: 3.0, amp: 0.1 });
      });
    }, undefined, () => {});

    // 5. Grass Clusters
    loader.load('assets/models/grass.glb', (gltf) => {
      const grassSpots = [
        [-6.0, 5.0, 3.4],
        [-5.0, 5.0, 15.0],
        [5.5, 5.0, 30.0],
        [6.0, 5.8, 44.0],
        [-2.0, 0, 66.0],
        [1.5, 0, 67.0]
      ];
      grassSpots.forEach(([x, y, z]) => {
        const grass = gltf.scene.clone();
        grass.position.set(x, y, z);
        grass.scale.set(1.2, 1.2, 1.2);
        grass.traverse((o) => { if (o.isMesh) o.receiveShadow = true; });
        scene.add(grass);
      });
    }, undefined, () => {});
  }

  // Populate the entire game world with dense environmental details
  function populate() {
    loadExternalModels();
    // --- Wall Vines on Rooftops and Alleys ---
    createWallVine(-8.9, 0, 5.0, 4.0);
    createWallVine(-8.9, 0, 5.2, 14.0);
    createWallVine(-3.1, 0, 4.8, 24.0);
    createWallVine(3.1, 0, 5.0, 32.0);
    createWallVine(8.9, 0, 5.5, 44.0);
    createWallVine(-8.9, 0, 5.0, 30.0);

    // --- Hanging Flower Garlands Across Alleys ---
    createFloralGarland(new THREE.Vector3(-3.0, 4.8, 10.0), new THREE.Vector3(3.0, 4.8, 10.0), 0xff9900);
    createFloralGarland(new THREE.Vector3(-3.0, 4.8, 25.0), new THREE.Vector3(3.0, 4.8, 25.0), 0xee4422);
    createFloralGarland(new THREE.Vector3(-3.0, 4.8, 48.0), new THREE.Vector3(3.0, 4.8, 48.0), 0xffaa11);

    // --- Tropical Palms & Planters on Rooftops and Garden ---
    createPalmPlant(-7.5, 5.0, 1.5, 1.1);
    createPalmPlant(-4.5, 5.5, 17.5, 1.0);
    createPalmPlant(4.8, 5.0, 28.5, 1.2);
    createPalmPlant(7.2, 5.8, 43.5, 1.1);
    createPalmPlant(-5.0, 5.0, 31.0, 0.9);
    createPalmPlant(-4.0, 0, 68.0, 1.4);
    createPalmPlant(4.0, 0, 72.0, 1.3);

    // --- Merchant Awnings & Canopies ---
    createClothAwning(-2.8, -0.5, 8.5, 2.8, 0x8b2500);
    createClothAwning(0.5, 2.8, 19.5, 2.8, 0xb87333);
    createClothAwning(-2.8, -0.6, 38.0, 2.8, 0x4a1525);

    // --- Crates & Barrels Street Clutter ---
    createCratesAndBarrels(-2.4, 0, 11.0);
    createCratesAndBarrels(2.2, 0, 23.5);
    createCratesAndBarrels(-2.3, 0, 42.0);
    createCratesAndBarrels(2.3, 0, 54.0);

    // Rooftop crates
    createCratesAndBarrels(-8.2, 5.0, 8.0);
    createCratesAndBarrels(8.0, 5.0, 36.0);

    // --- Rain Puddles on Cobblestone Streets ---
    createPuddle(0.4, 0, 8.0, 1.6, 1.2);
    createPuddle(-0.6, 0, 20.0, 2.1, 1.3);
    createPuddle(0.8, 0, 35.0, 1.8, 1.4);
    createPuddle(-0.3, 0, 50.0, 2.2, 1.5);
    createPuddle(0.2, 0, 60.0, 1.9, 1.3);

    // --- Atmospheric Mist Patches ---
    createMist(0, 0, 15.0, 7.0);
    createMist(0, 0, 36.0, 8.0);
    createMist(0, 0, 55.0, 7.5);
    createMist(-2.0, 0, 72.0, 9.0); // Garden mist
  }

  // Per-frame Wind & Water animation
  function update(t, dt) {
    // 1. Wind sway on vegetation and banners
    windSwayList.forEach(item => {
      const sway = Math.sin(t * item.speed) * item.amp;
      if (item.baseRot) {
        item.obj.rotation.z = item.baseRot.z + sway;
        item.obj.rotation.x = item.baseRot.x + sway * 0.4;
      }
      if (item.basePos) {
        item.obj.position.x = item.basePos.x + sway * 0.5;
        item.obj.position.y = item.basePos.y + Math.abs(sway) * 0.3;
      }
    });

    // 2. Animated water ripples on rain puddles
    waterRipples.forEach(r => {
      r.timer += dt;
      const progress = (r.timer % 1.6) / 1.6;
      const curScale = r.scale + (r.maxScale - r.scale) * progress;
      r.mesh.scale.set(curScale, curScale, 1);
      r.mesh.material.opacity = (1 - progress) * 0.45;
    });

    // 3. Drifting mist in alleys
    mistPatches.forEach(m => {
      m.sprite.position.x = m.baseX + Math.sin(t * 0.3 + m.phase) * 0.8;
      m.sprite.position.z = m.baseZ + Math.cos(t * 0.25 + m.phase) * 1.2;
    });
  }

  return {
    init,
    populate,
    update
  };
})();
