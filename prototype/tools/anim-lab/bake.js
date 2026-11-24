// Bakes the retargeted Mixamo clips for the game and saves them through the lab server.
window.runBake = async function () {
  const L = new THREE.FBXLoader(), clips = {};
  const FILE = { start_walking: 'Start Walking', unarmed_run_forward: 'Unarmed Run Forward', jump: 'Jump', throw: 'Throw' };
  for (const f of ['start_walking', 'unarmed_run_forward', 'jump', 'throw']) {
    clips[f] = await new Promise((res) => L.load('../../assets/animations/mixamo/' + encodeURIComponent(FILE[f]) + '.fbx', (o) => { const m = new THREE.AnimationMixer(o), a = m.clipAction(o.animations[0]); a.play(); res({ o, m, a, dur: o.animations[0].duration }); }));
  }
  const samp = (c, t, mirror) => { const C = clips[c]; C.a.time = t; C.m.update(0); C.o.updateMatrixWorld(true); const mx = (n) => C.o.getObjectByName('mixamorig' + n).getWorldPosition(new THREE.Vector3()); return RETARGET.pose(THREE, HANUMAN_RIG.J, mx, mirror); };
  const ORD = RETARGET.ORDER, fps = 30;
  const range = (c, t0, t1, mirror) => { const out = [], n = Math.round((t1 - t0) * fps); for (let i = 0; i <= n; i++) out.push(samp(c, t0 + (t1 - t0) * i / n, mirror)); return out; };
  // the walk loop (found by comparing poses: 1.533 s to 2.917 s), its seam eased over the last frames
  const w = range('start_walking', 1.533, 2.917, false), nB = 5;
  for (let k = 1; k <= nB; k++) { const i = w.length - 1 - nB + k, f = k / nB; for (const b of ORD) w[i][b] = w[i][b].clone().slerp(w[0][b], f); }
  w.pop();
  const r = range('unarmed_run_forward', 0, clips.unarmed_run_forward.dur, false); r.pop();
  const j = range('jump', 0, clips.jump.dur, false);
  const th = range('throw', 0.4, 1.6, true);
  const idle = [samp('start_walking', 0, false)];
  const pack = (frames) => {
    const a = new Int16Array(frames.length * ORD.length * 4); let k = 0;
    for (const f of frames) for (const b of ORD) { const q = f[b]; a[k++] = Math.round(q.x * 32767); a[k++] = Math.round(q.y * 32767); a[k++] = Math.round(q.z * 32767); a[k++] = Math.round(q.w * 32767); }
    let s = ''; const u = new Uint8Array(a.buffer); for (let i = 0; i < u.length; i++) s += String.fromCharCode(u[i]); return btoa(s);
  };
  const data = {
    fps, bones: ORD,
    source: 'Mixamo clips (Start Walking, Unarmed Run Forward, Jump, Throw mirrored to the left hand), retargeted by direction onto the Hanuman rig',
    format: 'each clip: q = base64 of little-endian int16, frame by frame, bone by bone (x, y, z, w) / 32767',
    handR: 1.1,
    clips: {
      idle: { n: 1, q: pack(idle) },
      walk: { n: w.length, q: pack(w), loop: true, stride: +(264 * 0.87 / 203.6).toFixed(4) },
      run: { n: r.length, q: pack(r), loop: true, stride: +(430.9 * 0.87 / 195).toFixed(4) },
      jump: { n: j.length, q: pack(j), takeoff: 0.07, apex: 0.35, land: 0.6 },
      throw: { n: th.length, q: pack(th), start: 0.4, aim: 0.6, release: 0.85 },
    },
  };
  const body = JSON.stringify(data);
  const res = await fetch('/save/hanuman-anims.json', { method: 'POST', body });
  return { bytes: body.length, saved: await res.text(), frames: { walk: w.length, run: r.length, jump: j.length, throw: th.length } };
};
