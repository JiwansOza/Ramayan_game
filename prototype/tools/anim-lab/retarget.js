// Retargets a Mixamo skeleton's motion onto the Hanuman rig (hanuman-rig.js), bone by bone, by direction:
// limbs swing so each segment points where the Mixamo segment points; the torso and head take a full
// orientation built from an "up" (along the spine) and a "side" (hip to hip, or shoulder to shoulder).
window.RETARGET = (function () {
  const MX = (n) => 'mixamorig' + n;
  // our bone -> [mixamo from, mixamo to, our from joint, our to joint]
  const SWING = {
    thighR: ['RightUpLeg', 'RightLeg', 'thighR', 'shinR'], shinR: ['RightLeg', 'RightFoot', 'shinR', 'footR'], footR: ['RightFoot', 'RightToeBase', 'footR', 'toeR'],
    thighL: ['LeftUpLeg', 'LeftLeg', 'thighL', 'shinL'], shinL: ['LeftLeg', 'LeftFoot', 'shinL', 'footL'], footL: ['LeftFoot', 'LeftToeBase', 'footL', 'toeL'],
    upperArmR: ['RightArm', 'RightForeArm', 'upperArmR', 'foreArmR'], foreArmR: ['RightForeArm', 'RightHand', 'foreArmR', 'handR'],
    upperArmL: ['LeftArm', 'LeftForeArm', 'upperArmL', 'foreArmL'], foreArmL: ['LeftForeArm', 'LeftHand', 'foreArmL', 'handL'],
  };
  // our bone -> [mixamo up from, up to, side from, side to] and [our up from, up to, side from, side to]
  const FRAME = {
    hips: [['Hips', 'Spine', 'RightUpLeg', 'LeftUpLeg'], ['hips', 'spine', 'thighR', 'thighL']],
    spine: [['Spine', 'Spine2', 'RightArm', 'LeftArm'], ['spine', 'chest', 'upperArmR', 'upperArmL']],
    chest: [['Spine2', 'Neck', 'RightArm', 'LeftArm'], ['chest', 'neck', 'upperArmR', 'upperArmL']],
    neck: [['Neck', 'Head', 'RightArm', 'LeftArm'], ['neck', 'head', 'upperArmR', 'upperArmL']],
    head: [['Head', 'HeadTop_End', 'RightArm', 'LeftArm'], ['head', 'headEnd', 'upperArmR', 'upperArmL']],
  };
  const ORDER = ['hips', 'spine', 'chest', 'neck', 'head', 'thighR', 'shinR', 'footR', 'thighL', 'shinL', 'footL', 'upperArmR', 'foreArmR', 'upperArmL', 'foreArmL'];
  const PARENT = { hips: null, spine: 'hips', chest: 'spine', neck: 'chest', head: 'neck', thighR: 'hips', shinR: 'thighR', footR: 'shinR', thighL: 'hips', shinL: 'thighL', footL: 'shinL', upperArmR: 'chest', foreArmR: 'upperArmR', upperArmL: 'chest', foreArmL: 'upperArmL' };

  function basis(T, up, side) {
    const y = up.clone().normalize(), x = side.clone().addScaledVector(y, -side.dot(y)).normalize(), z = new T.Vector3().crossVectors(x, y);
    return new T.Matrix4().makeBasis(x, y, z);
  }
  // J: our joints in model space; mx: function(name) -> world position Vector3 of the mixamo bone at this frame
  function pose(T, J, mxRaw, mirror) {
    // mirror: swap left and right and reflect across x (a right-handed throw becomes left-handed)
    const mx = mirror ? (n) => { const p = mxRaw(n.replace(/^Left/, '#').replace(/^Right/, 'Left').replace(/^#/, 'Right')); p.x = -p.x; return p; } : mxRaw;
    const v = (a) => new T.Vector3().fromArray(J[a]);
    const model = {}, local = {};
    for (const b of ORDER) {
      let q;
      if (FRAME[b]) {
        const [m, o] = FRAME[b];
        const Mm = basis(T, mx(m[1]).sub(mx(m[0])), mx(m[3]).sub(mx(m[2])));
        const Mo = basis(T, v(o[1]).sub(v(o[0])), v(o[3]).sub(v(o[2])));
        q = new T.Quaternion().setFromRotationMatrix(Mm.multiply(Mo.transpose()));
      } else {
        const [a, c, oa, oc] = SWING[b];
        const d = mx(c).sub(mx(a)).normalize(), r = v(oc).sub(v(oa)).normalize();
        q = new T.Quaternion().setFromUnitVectors(r, d);
      }
      model[b] = q;
      const p = PARENT[b];
      local[b] = p ? model[p].clone().invert().multiply(q) : q.clone();
    }
    return local;
  }
  return { ORDER, pose, MX };
})();
