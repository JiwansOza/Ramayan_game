// Interactive Rakshasa Guard AI System for Lanka ki Chhatein
// Enhances enemy behavior, perception (sight & sound), group coordination, combat/attack, and stun/hit reactions

window.LankaEnemyAI = (function () {
  'use strict';

  let THREE = null;

  // Stun particle timer
  let stunParticleClock = 0;

  function init(threeRef) {
    THREE = threeRef;
  }

  // Create or augment guard data with intelligent AI controller
  function setupGuard(guard) {
    guard.ai = {
      state: 'patrol', // 'patrol', 'curious', 'investigate', 'alert', 'chase', 'attack', 'stunned', 'return'
      timer: 0,
      lookTimer: 0,
      investigateTarget: new THREE.Vector3(),
      soundSource: new THREE.Vector3(),
      lastSeenPos: new THREE.Vector3(),
      stunDuration: 0,
      attackCooldown: 0,
      isAttacking: false,
      attackAnim: 0,
      headYaw: 0,
      headPitch: 0,
      bodyLean: 0,
      spearThrust: 0,
      alertness: 0, // 0 - 100
      idleAction: 'none',
      idleTimer: 2 + Math.random() * 4,
      originalSpeed: 1.5
    };
    return guard;
  }

  // Check if player or sound is heard
  function registerSound(guards, soundPos, radius, soundType = 'noise') {
    guards.forEach(g => {
      if (!g.ai) setupGuard(g);
      if (g.ai.state === 'stunned') return;

      const d = Math.hypot(g.pos.x - soundPos.x, g.pos.z - soundPos.z);
      const dy = Math.abs(g.pos.y - soundPos.y);

      // Sound travels up to radius, dampened if on different floors
      const effectiveRadius = dy > 3.0 ? radius * 0.55 : radius;

      if (d <= effectiveRadius) {
        if (g.ai.state === 'alert' || g.ai.state === 'chase') {
          // Already hunting, update target
          g.ai.investigateTarget.copy(soundPos);
          return;
        }

        // Transition to curious or investigate
        if (d < radius * 0.45 || soundType === 'loud') {
          // High priority sound: run and investigate
          g.ai.state = 'investigate';
          g.ai.investigateTarget.copy(soundPos);
          g.ai.timer = 4.5;
          g.want = Math.atan2(soundPos.x - g.pos.x, soundPos.z - g.pos.z);
          if (window.LankaSounds) window.LankaSounds.play('enemyCurious');
        } else if (g.ai.state === 'patrol') {
          // Subtle sound: pause and turn head
          g.ai.state = 'curious';
          g.ai.soundSource.copy(soundPos);
          g.ai.timer = 2.4;
          g.want = Math.atan2(soundPos.x - g.pos.x, soundPos.z - g.pos.z);
        }
      }
    });
  }

  // Fruit direct hit check
  function checkFruitHit(guard, fruitPos, fruitRadius = 0.3) {
    if (!guard.ai) setupGuard(guard);
    const guardCenter = guard.pos.clone().add(new THREE.Vector3(0, 1.2, 0));
    const dist = guardCenter.distanceTo(fruitPos);

    if (dist < 1.0 + fruitRadius) {
      // Direct hit on guard!
      applyStun(guard, 4.0);
      return true;
    }
    return false;
  }

  // Apply Stun / Knockback to guard
  function applyStun(guard, duration = 3.5) {
    if (!guard.ai) setupGuard(guard);
    guard.ai.state = 'stunned';
    guard.ai.stunDuration = duration;
    guard.ai.timer = duration;
    guard.ai.bodyLean = -0.35; // stumbles back

    // Visual & audio feedback
    if (window.LankaParticles) {
      window.LankaParticles.emit.enemyHit(guard.pos.clone().add(new THREE.Vector3(0, 1.4, 0)));
      window.LankaParticles.emit.enemyStun(guard.pos);
    }
    if (window.LankaSounds) {
      window.LankaSounds.play('enemyHit');
      window.LankaSounds.play('enemyGroan');
    }
  }

  // Alert all nearby guards (Call of Rakshasas)
  function alertNearbyGuards(guards, shoutingGuard, alertRadius = 24.0) {
    guards.forEach(g => {
      if (g === shoutingGuard || !g.ai || g.ai.state === 'stunned') return;
      const dist = g.pos.distanceTo(shoutingGuard.pos);
      if (dist < alertRadius) {
        if (g.ai.state !== 'alert' && g.ai.state !== 'chase') {
          g.ai.state = 'investigate';
          g.ai.investigateTarget.copy(shoutingGuard.ai.lastSeenPos.lengthSq() > 0 ? shoutingGuard.ai.lastSeenPos : shoutingGuard.pos);
          g.ai.timer = 6.0;
          g.want = Math.atan2(g.ai.investigateTarget.x - g.pos.x, g.ai.investigateTarget.z - g.pos.z);
        }
      }
    });
  }

  // Main AI Update Loop for a guard
  function update(g, dt, playerPos, playerHidden, playerExposure, allGuards, onPlayerCaught) {
    if (!g.ai) setupGuard(g);
    const ai = g.ai;
    stunParticleClock += dt;

    // Distance & visibility calculations
    const toPlayer = new THREE.Vector3().subVectors(playerPos, g.pos);
    const distToPlayer = toPlayer.length();
    const sameFloor = Math.abs(toPlayer.y) < 1.6;

    // Check line of sight
    let canSeePlayer = false;
    if (!playerHidden && g.sees) {
      canSeePlayer = true;
      ai.lastSeenPos.copy(playerPos);
    }

    // --- State Machine ---
    switch (ai.state) {
      case 'stunned': {
        ai.stunDuration -= dt;
        ai.bodyLean = Math.sin(ai.stunDuration * 6) * 0.15 - 0.2; // wobbling stumble

        // Droop head
        ai.headPitch = 0.4;
        ai.spearThrust = -0.3;

        // Periodic stars
        if (stunParticleClock > 0.35 && window.LankaParticles) {
          window.LankaParticles.emit.enemyStun(g.pos);
          stunParticleClock = 0;
        }

        if (ai.stunDuration <= 0) {
          // Recover into suspicious/investigate
          ai.state = 'investigate';
          ai.investigateTarget.copy(g.pos).add(new THREE.Vector3((Math.random() - 0.5) * 4, 0, (Math.random() - 0.5) * 4));
          ai.timer = 3.0;
          ai.bodyLean = 0;
        }
        return; // Don't move or detect while stunned
      }

      case 'patrol': {
        ai.bodyLean = 0.05;
        ai.spearThrust = 0;
        ai.headPitch = 0;

        // Idle fidgets when waiting at patrol nodes
        if (g.wait > 0) {
          ai.idleTimer -= dt;
          if (ai.idleTimer <= 0) {
            ai.idleTimer = 3 + Math.random() * 4;
            ai.headYaw = (Math.random() - 0.5) * 0.8;
          }
        } else {
          ai.headYaw *= 0.9;
        }

        if (canSeePlayer) {
          ai.state = 'alert';
          ai.timer = 1.0;
          if (window.LankaSounds) window.LankaSounds.play('enemyAlert');
          alertNearbyGuards(allGuards, g);
        }
        break;
      }

      case 'curious': {
        // Pauses patrol and looks closely at sound origin
        ai.bodyLean = 0.15;
        ai.timer -= dt;
        ai.headYaw = Math.sin(ai.timer * 4) * 0.25;

        if (canSeePlayer) {
          ai.state = 'alert';
          if (window.LankaSounds) window.LankaSounds.play('enemyAlert');
          alertNearbyGuards(allGuards, g);
        } else if (ai.timer <= 0) {
          ai.state = 'return';
        }
        break;
      }

      case 'investigate': {
        // Walks briskly toward sound or last seen spot
        ai.bodyLean = 0.18;
        const dx = ai.investigateTarget.x - g.pos.x;
        const dz = ai.investigateTarget.z - g.pos.z;
        const distToTarget = Math.hypot(dx, dz);

        g.want = Math.atan2(dx, dz);

        if (distToTarget > 0.4) {
          const s = Math.min(distToTarget, 2.2 * dt);
          g.pos.x += (dx / distToTarget) * s;
          g.pos.z += (dz / distToTarget) * s;
          g.walk += s * 4.5;
        } else {
          // Arrived at investigation spot: scan around
          ai.timer -= dt;
          ai.headYaw = Math.sin(ai.timer * 3) * 0.75;
          if (ai.timer <= 0) {
            ai.state = 'return';
          }
        }

        if (canSeePlayer) {
          ai.state = 'alert';
          if (window.LankaSounds) window.LankaSounds.play('enemyAlert');
          alertNearbyGuards(allGuards, g);
        }
        break;
      }

      case 'alert':
      case 'chase': {
        ai.bodyLean = 0.28; // Aggressive forward charge lean
        g.want = Math.atan2(playerPos.x - g.pos.x, playerPos.z - g.pos.z);

        if (sameFloor && !g.cfg.scan) {
          // Pursue player on same level
          const speed = 3.2;
          const dx = playerPos.x - g.pos.x;
          const dz = playerPos.z - g.pos.z;
          const d = Math.hypot(dx, dz);

          if (d > 1.4) {
            const s = Math.min(d, speed * dt);
            g.pos.x += (dx / d) * s;
            g.pos.z += (dz / d) * s;
            g.walk += s * 5.5;
          } else {
            // Close enough to attack!
            ai.state = 'attack';
            ai.attackAnim = 0;
          }
        }

        // If player broke line of sight for too long
        if (!canSeePlayer) {
          ai.timer -= dt;
          if (ai.timer <= 0) {
            ai.state = 'investigate';
            ai.investigateTarget.copy(ai.lastSeenPos);
            ai.timer = 5.0;
          }
        } else {
          ai.timer = 2.5;
        }
        break;
      }

      case 'attack': {
        // Spear lunging attack animation
        ai.attackAnim += dt * 3.5;
        if (ai.attackAnim < 0.4) {
          // Windup: spear pulls back
          ai.spearThrust = -ai.attackAnim * 1.5;
          ai.bodyLean = 0.05;
        } else if (ai.attackAnim < 0.8) {
          // Thrust forward!
          ai.spearThrust = (ai.attackAnim - 0.4) * 3.5;
          ai.bodyLean = 0.35;
          if (!ai.isAttacking) {
            ai.isAttacking = true;
            if (window.LankaSounds) window.LankaSounds.play('spearSwing');
          }
        } else {
          // Recovery
          ai.spearThrust *= 0.85;
          if (ai.attackAnim >= 1.2) {
            ai.isAttacking = false;
            ai.state = 'chase';
          }
        }

        // If within lethal spear tip distance and thrusting forward
        if (ai.isAttacking && distToPlayer < 1.7 && sameFloor) {
          if (onPlayerCaught) onPlayerCaught();
        }
        break;
      }

      case 'return': {
        ai.bodyLean = 0.05;
        ai.headYaw *= 0.9;
        const p = g.cfg.path[g.cfg.scan ? 0 : g.idx];
        const dx = p[0] - g.pos.x;
        const dz = p[2] - g.pos.z;
        const d = Math.hypot(dx, dz);

        g.want = Math.atan2(dx, dz);

        if (d > 0.3) {
          const s = Math.min(d, 1.8 * dt);
          g.pos.x += (dx / d) * s;
          g.pos.z += (dz / d) * s;
          g.walk += s * 4.0;
        } else {
          ai.state = 'patrol';
          g.wait = 0.8;
        }

        if (canSeePlayer) {
          ai.state = 'alert';
          if (window.LankaSounds) window.LankaSounds.play('enemyAlert');
          alertNearbyGuards(allGuards, g);
        }
        break;
      }
    }
  }

  // Visual pose applier (bones / groups)
  function applyPose(g) {
    if (!g.ai) return;
    const ai = g.ai;

    // Body forward/backward tilt
    g.g.rotation.x = ai.bodyLean;

    // Spear thrust offset
    if (g.arms && g.arms[1]) {
      g.arms[1].position.z = ai.spearThrust * 0.45;
      g.arms[1].rotation.x += ai.spearThrust * 0.6;
    }
  }

  return {
    init,
    setupGuard,
    registerSound,
    checkFruitHit,
    applyStun,
    alertNearbyGuards,
    update,
    applyPose
  };
})();
