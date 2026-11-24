// High-Performance Particle System for Lanka ki Chhatein
// Covers: footstep dust, jump/land impact shockwaves, fruit hit impact, enemy damage/stun,
// fruit sparkle trails, deep sacred fire burst, bush rustle leaves, floating embers & rain.

window.LankaParticles = (function () {
  'use strict';

  let THREE = null;
  let scene = null;

  // Particle pools
  const MAX_PARTICLES = 1200;
  let pointGeo = null;
  let pointMat = null;
  let pointMesh = null;
  let positions = null;
  let colors = null;
  let sizes = null;

  // State of active particles
  const pool = [];
  let nextIdx = 0;

  // Shockwave rings pool (expanding meshes)
  const rings = [];

  // Weather / Rain particles
  const MAX_RAIN = 1500;
  let rainGeo = null;
  let rainMesh = null;
  let rainPos = null;
  let rainEnabled = true;

  function init(s, threeRef, canvasTexRef) {
    scene = s;
    THREE = threeRef;

    // Create particle texture on canvas
    let particleTex;
    if (canvasTexRef) {
      particleTex = canvasTexRef;
    } else {
      const c = document.createElement('canvas');
      c.width = 64;
      c.height = 64;
      const g = c.getContext('2d');
      const gr = g.createRadialGradient(32, 32, 0, 32, 32, 30);
      gr.addColorStop(0, 'rgba(255, 255, 255, 1)');
      gr.addColorStop(0.3, 'rgba(255, 240, 200, 0.8)');
      gr.addColorStop(0.7, 'rgba(255, 180, 80, 0.3)');
      gr.addColorStop(1, 'rgba(255, 120, 40, 0)');
      g.fillStyle = gr;
      g.fillRect(0, 0, 64, 64);
      particleTex = new THREE.CanvasTexture(c);
    }

    // Dynamic points buffer for all generic particles
    positions = new Float32Array(MAX_PARTICLES * 3);
    colors = new Float32Array(MAX_PARTICLES * 3);
    sizes = new Float32Array(MAX_PARTICLES);

    for (let i = 0; i < MAX_PARTICLES; i++) {
      positions[i * 3 + 1] = -9999; // start hidden
      colors[i * 3] = 1;
      colors[i * 3 + 1] = 1;
      colors[i * 3 + 2] = 1;
      sizes[i] = 0;

      pool.push({
        active: false,
        x: 0, y: -9999, z: 0,
        vx: 0, vy: 0, vz: 0,
        r: 1, g: 1, b: 1,
        size: 0.1,
        growth: 0,
        alpha: 1,
        life: 0,
        maxLife: 1,
        drag: 0.98,
        gravity: 0
      });
    }

    pointGeo = new THREE.BufferGeometry();
    pointGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    pointGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    pointGeo.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    pointMat = new THREE.PointsMaterial({
      size: 0.25,
      map: particleTex,
      vertexColors: true,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });

    pointMesh = new THREE.Points(pointGeo, pointMat);
    pointMesh.frustumCulled = false;
    scene.add(pointMesh);

    // Rain system
    initRain();
  }

  function initRain() {
    rainPos = new Float32Array(MAX_RAIN * 3);
    for (let i = 0; i < MAX_RAIN; i++) {
      rainPos[i * 3] = (Math.random() - 0.5) * 60;
      rainPos[i * 3 + 1] = Math.random() * 25;
      rainPos[i * 3 + 2] = (Math.random() - 0.5) * 80 + 35;
    }

    rainGeo = new THREE.BufferGeometry();
    rainGeo.setAttribute('position', new THREE.BufferAttribute(rainPos, 3));

    const rainMat = new THREE.PointsMaterial({
      color: 0x8aa8d8,
      size: 0.18,
      transparent: true,
      opacity: 0.45,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    rainMesh = new THREE.Points(rainGeo, rainMat);
    rainMesh.frustumCulled = false;
    scene.add(rainMesh);
  }

  // --- Particle Spawner ---
  function spawn(opts) {
    const p = pool[nextIdx];
    nextIdx = (nextIdx + 1) % MAX_PARTICLES;

    p.active = true;
    p.x = opts.x || 0;
    p.y = opts.y || 0;
    p.z = opts.z || 0;
    p.vx = opts.vx || 0;
    p.vy = opts.vy || 0;
    p.vz = opts.vz || 0;
    p.r = opts.r != null ? opts.r : 1;
    p.g = opts.g != null ? opts.g : 1;
    p.b = opts.b != null ? opts.b : 1;
    p.size = opts.size || 0.15;
    p.growth = opts.growth || 0;
    p.life = 0;
    p.maxLife = opts.life || 0.6;
    p.drag = opts.drag || 0.96;
    p.gravity = opts.gravity || 0;

    return p;
  }

  // --- Shockwave Spawner (Expanding ground rings) ---
  function spawnShockwave(x, y, z, maxRadius = 1.6, color = 0xe9c46a, duration = 0.5) {
    if (!THREE || !scene) return;
    const ringGeo = new THREE.RingGeometry(0.1, 0.22, 24);
    const ringMat = new THREE.MeshBasicMaterial({
      color: color,
      transparent: true,
      opacity: 0.85,
      side: THREE.DoubleSide,
      depthWrite: false
    });
    const mesh = new THREE.Mesh(ringGeo, ringMat);
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.set(x, y + 0.03, z);
    scene.add(mesh);

    rings.push({
      mesh,
      life: 0,
      duration,
      maxRadius,
      initScale: 0.3
    });
  }

  // --- Pre-packaged Emitters for Game Events ---
  const emit = {
    // 1. Dust puff at footstep
    footstep(pos, isRun) {
      const count = isRun ? 8 : 4;
      for (let i = 0; i < count; i++) {
        const ang = Math.random() * Math.PI * 2;
        const spd = 0.4 + Math.random() * 0.8;
        spawn({
          x: pos.x + (Math.random() - 0.5) * 0.2,
          y: pos.y + 0.05,
          z: pos.z + (Math.random() - 0.5) * 0.2,
          vx: Math.cos(ang) * spd,
          vy: 0.3 + Math.random() * 0.5,
          vz: Math.sin(ang) * spd,
          r: 0.72 + Math.random() * 0.15,
          g: 0.62 + Math.random() * 0.15,
          b: 0.48 + Math.random() * 0.1,
          size: 0.14 + Math.random() * 0.12,
          growth: 0.25,
          life: 0.45 + Math.random() * 0.3,
          drag: 0.9,
          gravity: 0.1
        });
      }
    },

    // 2. Landing Impact
    landing(pos, heavy = false) {
      const count = heavy ? 32 : 16;
      for (let i = 0; i < count; i++) {
        const ang = (i / count) * Math.PI * 2 + (Math.random() - 0.5) * 0.3;
        const spd = (heavy ? 2.5 : 1.4) + Math.random() * 1.0;
        spawn({
          x: pos.x,
          y: pos.y + 0.08,
          z: pos.z,
          vx: Math.cos(ang) * spd,
          vy: 0.4 + Math.random() * (heavy ? 1.6 : 0.8),
          vz: Math.sin(ang) * spd,
          r: 0.8, g: 0.7, b: 0.52,
          size: heavy ? 0.28 : 0.18,
          growth: 0.35,
          life: heavy ? 0.75 : 0.5,
          drag: 0.91,
          gravity: 0.3
        });
      }
      spawnShockwave(pos.x, pos.y, pos.z, heavy ? 2.4 : 1.2, 0xebd29c, heavy ? 0.6 : 0.4);
    },

    // 3. Enemy Hit by Fruit (explosive splat + sparks)
    enemyHit(pos) {
      // Orange fruit pulp chunks
      for (let i = 0; i < 28; i++) {
        const spd = 2.0 + Math.random() * 3.5;
        const theta = Math.random() * Math.PI * 2;
        const phi = (Math.random() - 0.5) * Math.PI;
        spawn({
          x: pos.x,
          y: pos.y,
          z: pos.z,
          vx: Math.cos(theta) * Math.cos(phi) * spd,
          vy: Math.sin(phi) * spd + 1.2,
          vz: Math.sin(theta) * Math.cos(phi) * spd,
          r: 1.0,
          g: 0.55 + Math.random() * 0.3,
          b: 0.12,
          size: 0.22 + Math.random() * 0.16,
          growth: -0.1,
          life: 0.5 + Math.random() * 0.4,
          drag: 0.93,
          gravity: 7.0 // falls to floor
        });
      }

      // Golden impact flash
      for (let i = 0; i < 18; i++) {
        const spd = 3.5 + Math.random() * 2.5;
        const ang = Math.random() * Math.PI * 2;
        spawn({
          x: pos.x, y: pos.y, z: pos.z,
          vx: Math.cos(ang) * spd,
          vy: (Math.random() - 0.2) * spd,
          vz: Math.sin(ang) * spd,
          r: 1.0, g: 0.92, b: 0.45,
          size: 0.18,
          life: 0.3,
          drag: 0.88,
          gravity: 0.5
        });
      }
      spawnShockwave(pos.x, pos.y - 0.5, pos.z, 1.8, 0xffaa33, 0.45);
    },

    // 4. Enemy Stun / Dizzy Stars
    enemyStun(pos) {
      for (let i = 0; i < 6; i++) {
        const ang = (i / 6) * Math.PI * 2;
        spawn({
          x: pos.x + Math.cos(ang) * 0.45,
          y: pos.y + 2.1,
          z: pos.z + Math.sin(ang) * 0.45,
          vx: -Math.sin(ang) * 0.9,
          vy: 0.15,
          vz: Math.cos(ang) * 0.9,
          r: 1.0, g: 0.85, b: 0.2,
          size: 0.2,
          life: 0.7,
          drag: 0.98,
          gravity: 0
        });
      }
    },

    // 5. Player Caught / Damage Flash Particles
    playerDamage(pos) {
      for (let i = 0; i < 35; i++) {
        const spd = 1.5 + Math.random() * 3.0;
        const theta = Math.random() * Math.PI * 2;
        const phi = (Math.random() - 0.5) * Math.PI;
        spawn({
          x: pos.x, y: pos.y + 0.6, z: pos.z,
          vx: Math.cos(theta) * Math.cos(phi) * spd,
          vy: Math.sin(phi) * spd,
          vz: Math.sin(theta) * Math.cos(phi) * spd,
          r: 0.95, g: 0.2, b: 0.1,
          size: 0.25,
          life: 0.65,
          drag: 0.92,
          gravity: -0.5
        });
      }
      spawnShockwave(pos.x, pos.y, pos.z, 2.8, 0xef4433, 0.6);
    },

    // 6. Fruit Sparkle Trail (while in air)
    fruitTrail(pos) {
      spawn({
        x: pos.x + (Math.random() - 0.5) * 0.08,
        y: pos.y + (Math.random() - 0.5) * 0.08,
        z: pos.z + (Math.random() - 0.5) * 0.08,
        vx: (Math.random() - 0.5) * 0.2,
        vy: 0.1 + Math.random() * 0.2,
        vz: (Math.random() - 0.5) * 0.2,
        r: 1.0, g: 0.75, b: 0.25,
        size: 0.14,
        growth: -0.1,
        life: 0.35,
        drag: 0.95,
        gravity: 0.1
      });
    },

    // 7. Checkpoint Deep Sacred Flame Vortex
    checkpointLit(pos) {
      for (let i = 0; i < 40; i++) {
        const ang = (i / 40) * Math.PI * 2;
        const rad = 0.3 + Math.random() * 0.5;
        spawn({
          x: pos.x + Math.cos(ang) * rad,
          y: pos.y + 0.5,
          z: pos.z + Math.sin(ang) * rad,
          vx: -Math.sin(ang) * 1.2,
          vy: 1.2 + Math.random() * 2.5,
          vz: Math.cos(ang) * 1.2,
          r: 1.0, g: 0.85, b: 0.3,
          size: 0.24,
          life: 0.9 + Math.random() * 0.4,
          drag: 0.94,
          gravity: -0.8 // rises up
        });
      }
      spawnShockwave(pos.x, pos.y, pos.z, 2.0, 0xffd700, 0.7);
    },

    // 8. Bush Rustle / Foliage Leaves
    bushRustle(pos) {
      for (let i = 0; i < 12; i++) {
        spawn({
          x: pos.x + (Math.random() - 0.5) * 0.6,
          y: pos.y + 0.4 + Math.random() * 0.5,
          z: pos.z + (Math.random() - 0.5) * 0.6,
          vx: (Math.random() - 0.5) * 0.8,
          vy: 0.5 + Math.random() * 0.6,
          vz: (Math.random() - 0.5) * 0.8,
          r: 0.22 + Math.random() * 0.15,
          g: 0.65 + Math.random() * 0.25,
          b: 0.28,
          size: 0.18,
          life: 0.55,
          drag: 0.92,
          gravity: 1.5
        });
      }
    }
  };

  // --- Main Update Loop ---
  function update(dt, playerPos) {
    let activeCount = 0;

    for (let i = 0; i < MAX_PARTICLES; i++) {
      const p = pool[i];
      if (!p.active) {
        positions[i * 3 + 1] = -9999;
        sizes[i] = 0;
        continue;
      }

      p.life += dt;
      if (p.life >= p.maxLife) {
        p.active = false;
        positions[i * 3 + 1] = -9999;
        sizes[i] = 0;
        continue;
      }

      const progress = p.life / p.maxLife;

      // Physics
      p.vx *= p.drag;
      p.vz *= p.drag;
      p.vy = (p.vy - p.gravity * dt) * p.drag;

      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.z += p.vz * dt;

      // Color fade
      const alpha = 1 - progress;
      positions[i * 3] = p.x;
      positions[i * 3 + 1] = p.y;
      positions[i * 3 + 2] = p.z;

      colors[i * 3] = p.r * alpha;
      colors[i * 3 + 1] = p.g * alpha;
      colors[i * 3 + 2] = p.b * alpha;

      sizes[i] = Math.max(0, (p.size + p.growth * progress) * alpha * 1.5);
      activeCount++;
    }

    if (pointGeo) {
      pointGeo.attributes.position.needsUpdate = true;
      pointGeo.attributes.color.needsUpdate = true;
      pointGeo.attributes.size.needsUpdate = true;
    }

    // Update Shockwaves
    for (let i = rings.length - 1; i >= 0; i--) {
      const r = rings[i];
      r.life += dt;
      const progress = r.life / r.duration;
      if (progress >= 1) {
        scene.remove(r.mesh);
        r.mesh.geometry.dispose();
        r.mesh.material.dispose();
        rings.splice(i, 1);
      } else {
        const curR = r.initScale + (r.maxRadius - r.initScale) * Math.sin(progress * Math.PI / 2);
        r.mesh.scale.set(curR, curR, 1);
        r.mesh.material.opacity = (1 - progress) * 0.85;
      }
    }

    // Update Rain
    if (rainEnabled && rainGeo && playerPos) {
      const rainArray = rainGeo.attributes.position.array;
      const fallSpeed = 38 * dt;
      const windAngle = 0.22;

      for (let i = 0; i < MAX_RAIN; i++) {
        rainArray[i * 3 + 1] -= fallSpeed;
        rainArray[i * 3] += fallSpeed * windAngle;

        // Reset drops above player region
        if (rainArray[i * 3 + 1] < 0) {
          rainArray[i * 3 + 1] = 22 + Math.random() * 6;
          rainArray[i * 3] = playerPos.x + (Math.random() - 0.5) * 45;
          rainArray[i * 3 + 2] = playerPos.z + (Math.random() - 0.5) * 45;
        }
      }
      rainGeo.attributes.position.needsUpdate = true;
    }
  }

  function setRain(enabled) {
    rainEnabled = enabled;
    if (rainMesh) rainMesh.visible = enabled;
  }

  return {
    init,
    emit,
    update,
    setRain
  };
})();
