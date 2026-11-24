# Retarget Quaternius UAL clips onto a target armature by matching bone directions to the source T-pose.
import bpy, sys, math
from mathutils import Vector, Matrix, Quaternion
argv=sys.argv[sys.argv.index('--')+1:]
blend, out, cliplist = argv[0], argv[1], argv[2].split(',')
tgt_name = argv[3] if len(argv)>3 else 'HanumanRig'
bpy.ops.wm.open_mainfile(filepath=blend)
tgt=bpy.data.objects[tgt_name]
before=set(bpy.data.objects)
for f in ['UAL1','UAL2']: bpy.ops.import_scene.gltf(filepath=f'/home/user/work/dl/{f}.glb')
new=[o for o in bpy.data.objects if o not in before]
srcs=[o for o in new if o.type=='ARMATURE']; src=srcs[0]
for o in new:
    if o.type=='MESH': bpy.data.objects.remove(o)
acts={}
for a in bpy.data.actions:
    base=a.name.split('.')[0]
    if base not in acts: acts[base]=a
# hide other armature
for o in srcs[1:]:
    if o.animation_data: o.animation_data.action=None
sc=bpy.context.scene
def wrest(arm,n):
    b=arm.data.bones[n]; return arm.matrix_world@b.matrix_local
MAP=[b.name for b in tgt.data.bones if b.name in src.data.bones and b.name!='root']
# hierarchical alignment: pose the target rest into the source rest, parent first (like physically re-posing it)
A={}
def align(b,Gp):
    n=b.name
    if n in MAP:
        dt=(Gp.to_matrix()@(wrest(tgt,n).to_3x3()@Vector((0,1,0)))).normalized()
        ds=(wrest(src,n).to_3x3()@Vector((0,1,0))).normalized()
        G=dt.rotation_difference(ds)@Gp
    else: G=Gp
    A[n]=G
    for c in b.children: align(c,G)
for b in tgt.data.bones:
    if b.parent is None: align(b,Quaternion())
src_hip=(wrest(src,'pelvis').translation).z; tgt_hip=(wrest(tgt,'pelvis').translation).z
K=tgt_hip/src_hip
print('K',K,'mapped',MAP)
order=[]
def walk(b):
    order.append(b)
    for c in b.children: walk(c)
for b in tgt.data.bones:
    if b.parent is None: walk(b)
if not tgt.animation_data: tgt.animation_data_create()
src.animation_data_create() if not src.animation_data else None
src_rest_pelvis=wrest(src,'pelvis').translation.copy()-wrest(src,'root').translation
tw=tgt.matrix_world; tw_inv=tw.inverted()
made=[]
for clip in cliplist:
    if not clip: continue
    name=clip; srcname=clip
    if '=' in clip: name,srcname=clip.split('=')
    sa=acts.get(srcname)
    if not sa: print('MISSING',srcname); continue
    src.animation_data.action=sa
    try: src.animation_data.action_slot=sa.slots[0]
    except Exception as e: print('slot',e)
    f0,f1=int(math.floor(sa.frame_range[0])),int(math.ceil(sa.frame_range[1]))
    loop=('Loop' in srcname) or srcname in ('Sword_Idle',)
    HS=0.55 if any(k in srcname for k in ('Sword','Punch','Melee','Hit','Death','Zombie','Throw')) else 1.0
    def pel(fr):
        sc.frame_set(fr)
        rw=(src.matrix_world@src.pose.bones['root'].matrix).translation
        return ((src.matrix_world@src.pose.bones['pelvis'].matrix).translation-rw-src_rest_pelvis)*K
    d0=pel(f0); d1=pel(f1); d0.z=0; d1.z=0
    ta=bpy.data.actions.new('TMP_'+name); ta.use_fake_user=True
    tgt.animation_data.action=ta
    for pb in tgt.pose.bones: pb.rotation_mode='QUATERNION'
    for f in range(f0,f1+1):
        sc.frame_set(f)
        desired={}
        for b in order:
            n=b.name; pb=tgt.pose.bones[n]
            rest=tgt.data.bones[n].matrix_local  # armature space
            if b.parent:
                pd=desired[b.parent.name]; prest=b.parent.matrix_local
                base=pd@(prest.inverted()@rest)
            else: base=rest.copy()
            if n in MAP:
                sp=src.matrix_world@src.pose.bones[n].matrix
                Rs=sp.to_quaternion(); Rsr=wrest(src,n).to_quaternion()
                Rtr=(tw@rest).to_quaternion()
                Rt=Rs@Rsr.inverted()@A[n]@Rtr
                Rt_arm=(tw_inv.to_quaternion()@Rt)
                loc=base.translation.copy()
                if n=='pelvis':
                    rootw=(src.matrix_world@src.pose.bones['root'].matrix).translation
                    sp_loc=sp.translation-rootw
                    d=(sp_loc-src_rest_pelvis)*K
                    if not loop:
                        u=(f-f0)/max(1,f1-f0); dr=d0*(1-u)+d1*u
                        d=Vector((d.x-dr.x*1.0, d.y-dr.y*1.0, d.z))*1.0
                        d.x*=HS; d.y*=HS
                    loc=(tw_inv@((tw@rest).translation+d))
                M=Matrix.Translation(loc)@Rt_arm.to_matrix().to_4x4()
            else:
                M=base
            desired[n]=M
            # basis
            if b.parent:
                pd=desired[b.parent.name]; prest=b.parent.matrix_local
                basis=(pd@(prest.inverted()@rest)).inverted()@M
            else: basis=rest.inverted()@M
            if n in MAP or n=='root':
                pb.rotation_quaternion=basis.to_quaternion()
                pb.keyframe_insert('rotation_quaternion',frame=f-f0)
                if n=='pelvis':
                    pb.location=basis.translation; pb.keyframe_insert('location',frame=f-f0)
    made.append(ta)
    print('DONE',name,f1-f0)
for a in list(bpy.data.actions):
    if a not in made: bpy.data.actions.remove(a)
for ta in made: ta.name=ta.name[4:]
# stash actions in NLA so the exporter picks them all
tgt.animation_data.action=None
for ta in made:
    tr=tgt.animation_data.nla_tracks.new(); tr.name=ta.name
    st=tr.strips.new(ta.name,0,ta); tr.mute=True
for o in new:
    try: bpy.data.objects.remove(o)
    except: pass
for pb in tgt.pose.bones: pb.rotation_quaternion=(1,0,0,0); pb.location=(0,0,0)
bpy.ops.wm.save_as_mainfile(filepath=out)
