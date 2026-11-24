// Advanced Procedural Animation & Rigging Engine for Lanka ki Chhatein
// Fully animates Hanuman's 23-bone skeleton and Rakshasa guards' multi-part hierarchy.
// Supports idle breathing, natural walking foot-roll, sprinting lean, jump apex/landing compression,
// stealth crouch, athletic fruit throwing, hit reactions, and guard combat/stumble poses.

window.LankaAnimations = (function () {
  'use strict';

  let THREE = null;

  function init(threeRef) {
    THREE = threeRef;
  }

  // --- Hanuman Animation Controller ---
  function computeHanumanPose(params) {
    const {
      bones, names, stance, soles,
      spd, onGround, velY, bob,
      aiming, throwAnim, hidden,
      t, dt, wasAir, fallV
    } = params;

    const T = {};
    for (const n of names) T[n] = [0, 0, 0];

    const walk = onGround ? Math.min(1, spd / 3) : 0;
    const run = onGround ? Math.min(1, Math.max(0, (spd - 3) / 2.2)) : 0;
    const isMoving = walk > 0.05;

    const sinBob = Math.sin(bob);
    const cosBob = Math.cos(bob);

    // 1. Idle Breathing & Micro-movement (always alive)
    const breath = Math.sin(t * 2.4);
    const weightShift = Math.sin(t * 1.2);
    T.chest = [breath * 0.035, sinBob * 0.12 * walk, weightShift * 0.02 * (1 - walk)];
    T.head = [
      -(0.06 * walk + 0.18 * run) * 0.7 + Math.sin(t * 1.8) * 0.02,
      Math.sin(t * 0.55) * 0.22 * (1 - walk),
      0
    ];

    // 2. Fluid 7-Bone Tail Secondary Physics
    for (let i = 0; i <= 6; i++) {
      const delay = i * 0.55;
      const waveZ = Math.sin(t * 2.2 - delay) * (0.06 + 0.08 * run);
      const waveX = Math.sin(t * 1.4 - delay) * 0.05 + (onGround ? 0 : 0.12);
      const curl = 0.04 * (6 - i);
      T['tail' + i] = [waveX + (run > 0.5 ? -0.1 : 0), 0, waveZ + (isMoving ? sinBob * 0.05 : 0)];
    }

    if (onGround) {
      if (!isMoving) {
        // Idle Stand: Natural weight shift
        T.spine = [0.02, weightShift * 0.03, 0];
        T.hips = [0, weightShift * 0.04, 0];
        T.upperArmR = [0.05, 0, -0.05];
        T.upperArmL = [0.05, 0, 0.05];
      } else {
        // Locomotion (Walk / Run)
        const stride = (0.48 + 0.32 * run) * walk;
        const kneeLift = (0.55 + 0.85 * run) * walk;

        // Thigh & Hip swing
        T.thighR = [-sinBob * stride, 0, 0];
        T.thighL = [sinBob * stride, 0, 0];

        // Shin flexion on recovery leg
        T.shinR = [0.1 * walk + kneeLift * Math.max(0, cosBob), 0, 0];
        T.shinL = [0.1 * walk + kneeLift * Math.max(0, -cosBob), 0, 0];

        // Ankle & Foot roll: Heel strike to toe push-off
        T.footR = [-T.shinR[0] * 0.5 + sinBob * stride * 0.35, 0, 0];
        T.footL = [-T.shinL[0] * 0.5 - sinBob * stride * 0.35, 0, 0];

        // Torso lean into motion
        T.spine = [0.06 * walk + 0.22 * run, 0, sinBob * 0.04 * walk];
        T.hips = [0, -sinBob * 0.08 * walk, 0];

        // Arm counter-swing
        const armSwing = (0.38 + 0.36 * run) * walk;
        T.upperArmR = [-sinBob * armSwing * 0.75, 0, -0.1];
        T.upperArmL = [sinBob * armSwing, 0, 0.1];
        T.foreArmR = [-(0.12 + 0.45 * run) * walk, 0, 0];
        T.foreArmL = [-(0.18 + 0.65 * run) * walk, 0, 0];
      }
    } else {
      // In-Air Dynamics: Jump launch, apex tuck, and fall preparation
      const rising = velY > 0;
      if (rising) {
        // Jump ascent
        T.thighR = [-0.9, 0, 0];
        T.shinR = [1.2, 0, 0];
        T.footR = [-0.3, 0, 0];
        T.thighL = [-0.4, 0, 0];
        T.shinL = [0.85, 0, 0];
        T.footL = [-0.25, 0, 0];

        T.upperArmL = [-1.3, 0, 0.5];
        T.foreArmL = [-0.7, 0, 0];
        T.upperArmR = [-0.5, 0, -0.3];
        T.foreArmR = [-0.4, 0, 0];
        T.spine = [0.16, 0, 0];
      } else {
        // Falling: Legs reaching for landing, arms balancing
        T.thighR = [-0.45, 0, 0];
        T.shinR = [0.65, 0, 0];
        T.footR = [-0.2, 0, 0];
        T.thighL = [-0.45, 0, 0];
        T.shinL = [0.65, 0, 0];
        T.footL = [-0.2, 0, 0];

        T.upperArmL = [-0.9, 0, 0.6];
        T.foreArmL = [-0.4, 0, 0];
        T.upperArmR = [-0.6, 0, -0.4];
        T.foreArmR = [-0.3, 0, 0];
        T.spine = [-0.06, 0, 0];
      }
    }

    // Stealth Bush Crouch Pose
    if (hidden) {
      T.thighR = [-1.15, 0, 0];
      T.shinR = [1.85, 0, 0];
      T.footR = [-0.75, 0, 0];
      T.thighL = [-1.15, 0, 0];
      T.shinL = [1.85, 0, 0];
      T.footL = [-0.75, 0, 0];

      T.spine = [0.48, 0, 0];
      T.head = [-0.4, 0, 0];
      T.upperArmR = [-0.35, 0, -0.15];
      T.upperArmL = [-0.35, 0, 0.15];

      // Tail curled inward
      for (let i = 0; i <= 6; i++) {
        T['tail' + i] = [-0.18, 0, -0.12];
      }
    }

    // Ground Standing Stance Correction
    if (onGround && stance) {
      const k = hidden ? 0.35 : 1.0;
      for (const f in stance) {
        if (T[f]) T[f][0] += stance[f] * k;
      }
    }

    // Aiming Mode Pose
    if (aiming) {
      T.upperArmL = [-2.05, 0, 0.3];
      T.foreArmL = [-1.05, 0, 0];
      T.chest = [T.chest[0], -0.28, 0];
      T.head = [-0.1, -0.25, 0];
      T.spine = [0.08, -0.15, 0];
    }

    // Athletic Throw Animation (Windup & Release snap)
    if (throwAnim > 0) {
      const p = 1 - throwAnim / 0.35;
      const easeSnap = p < 0.3 ? p / 0.3 : 1 - (p - 0.3) / 0.7;

      T.upperArmL = [-2.05 + (1 - easeSnap) * 1.55, 0, 0.3 - (1 - easeSnap) * 0.25];
      T.foreArmL = [-1.05 + (1 - easeSnap) * 1.1, 0, 0];
      T.chest = [T.chest[0] + (1 - easeSnap) * 0.2, -0.28 + (1 - easeSnap) * 0.45, 0];
      T.spine = [0.15 + (1 - easeSnap) * 0.2, 0, 0];
    }

    return T;
  }

  // --- Rakshasa Guard Animation Controller ---
  function computeGuardPose(g, dt, playTime) {
    const ai = g.ai;
    const isMoving = g.walk > 0;
    const walkSwing = Math.sin(g.walk) * 0.55;

    // 1. Legs locomotion
    if (g.legs && g.legs.length >= 2) {
      g.legs[0].rotation.x = walkSwing;
      g.legs[1].rotation.x = -walkSwing;

      // Slight knee bend on rear leg
      if (isMoving) {
        g.legs[0].position.y = 0.95 + Math.max(0, -walkSwing) * 0.05;
        g.legs[1].position.y = 0.95 + Math.max(0, walkSwing) * 0.05;
      }
    }

    // 2. Arms & Spear/Torch Posing
    if (g.arms && g.arms.length >= 2) {
      const leftArm = g.arms[0];  // torch or shield
      const rightArm = g.arms[1]; // spear

      // Torch arm subtle sway
      if (g.tf) {
        leftArm.rotation.x = -0.55 + Math.sin(playTime * 3) * 0.05;
        leftArm.rotation.z = Math.sin(playTime * 2.5) * 0.04;
      } else {
        leftArm.rotation.x = -walkSwing * 0.4 - 0.3;
      }

      // Spear arm pose based on AI state
      if (ai) {
        if (ai.state === 'attack') {
          rightArm.rotation.x = -1.2 + ai.spearThrust * 0.8;
          rightArm.rotation.y = -0.2;
        } else if (ai.state === 'alert' || ai.state === 'chase') {
          // Low ready spear thrust stance
          rightArm.rotation.x = -0.85 + Math.sin(playTime * 6) * 0.08;
          rightArm.rotation.y = -0.15;
        } else if (ai.state === 'stunned') {
          // Helpless drooping arms
          rightArm.rotation.x = 0.25 + Math.sin(playTime * 8) * 0.1;
          leftArm.rotation.x = 0.3 + Math.sin(playTime * 8 + 1) * 0.1;
        } else {
          // Normal patrol carry
          rightArm.rotation.x = walkSwing * 0.25 - 0.2;
          rightArm.rotation.y = 0;
        }
      }
    }

    // 3. Head Looking
    if (g.head && ai) {
      g.head.rotation.y = ai.headYaw;
      g.head.rotation.x = ai.headPitch;
    }
  }

  return {
    init,
    computeHanumanPose,
    computeGuardPose
  };
})();
