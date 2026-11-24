import bpy, sys
from mathutils import Vector
argv=sys.argv[sys.argv.index('--')+1:]
bpy.ops.wm.open_mainfile(filepath=argv[0]); arm=bpy.data.objects[argv[1]]
for tr in arm.animation_data.nla_tracks: tr.mute=True
sc=bpy.context.scene
for c in argv[2].split(','):
    a=bpy.data.actions[c]; arm.animation_data.action=a; arm.animation_data.action_slot=a.slots[0]
    f0,f1=int(a.frame_range[0]),int(a.frame_range[1]); best=(-9,0); speeds=[]
    prev=None
    for f in range(f0,f1+1):
        sc.frame_set(f)
        hand=c.startswith('punch') and ('hand_l' if c=='punch_jab' else 'hand_r') or 'hand_r'
        hp=(arm.matrix_world@arm.pose.bones[hand].matrix).translation
        pv=(arm.matrix_world@arm.pose.bones['pelvis'].matrix).translation
        fwd=-(hp-pv).y  # forward is -Y
        sp=(hp-prev).length*24 if prev is not None else 0; prev=hp.copy()
        speeds.append((sp,f))
        if fwd>best[0]: best=(fwd,f)
    ms=max(speeds)
    print('C',c,'dur',round((f1-f0)/24,2),'reach_t',round((best[1]-f0)/24,2),'maxspeed_t',round((ms[1]-f0)/24,2))
