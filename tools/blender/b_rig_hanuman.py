import bpy, mathutils, math, sys, bmesh
from mathutils import Vector, Matrix
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.fbx(filepath='/home/user/work/tripo.fbx')
meshes=[o for o in bpy.context.scene.objects if o.type=='MESH']
PARTS={}
for o in meshes:
    for x in bpy.context.scene.objects: x.select_set(False)
    o.select_set(True); bpy.context.view_layer.objects.active=o
    bpy.ops.object.parent_clear(type='CLEAR_KEEP_TRANSFORM')
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    PARTS[o.name.split('_Clone')[0]]=o
for o in list(bpy.context.scene.objects):
    if o.type=='EMPTY': bpy.data.objects.remove(o)
# original coords: faces -X, right=+Y, z up; shift y, rotate +90 about Z, scale to game height
H=1.25; S=H/0.96
M=Matrix.Scale(S,4)@Matrix.Rotation(math.radians(90),4,'Z')@Matrix.Translation((0,-0.019,0))
for o in meshes: o.data.transform(M); o.data.update()
body=PARTS['Object_3']
def P(x,y,z): return (M@Vector((x,y-0.0,z)))  # joints below are already y-shifted
J={}
def j(n,x,y,z): J[n]=P(x,y+0.019,z)  # convert back since M shifts
# spine (orig frame, y already centered -> add 0.019 then M subtracts)
j('pelvis',-0.01,0,0.33); j('spine_01',-0.02,0,0.42); j('spine_02',-0.025,0,0.52); j('spine_03',-0.012,0,0.61)
j('neck_01',0.0,0,0.735); j('Head',-0.005,0,0.785); j('Head_end',0.0,0,0.95)
for s,sg in (('r',1),('l',-1)):
    j('thigh_'+s,-0.01,0.083*sg,0.30); j('calf_'+s,-0.006,0.083*sg,0.175); j('foot_'+s,0.045,0.083*sg,0.075)
    j('ball_'+s,-0.045,0.108*sg,0.025); j('ball_end_'+s,-0.10,0.122*sg,0.015)
    j('clavicle_'+s,0.0,0.03*sg,0.70)
j('upperarm_r',0.0,0.176,0.675); j('lowerarm_r',-0.02,0.205,0.535); j('hand_r',-0.165,0.228,0.62); j('hand_end_r',-0.25,0.228,0.655)
j('upperarm_l',0.01,-0.178,0.675); j('lowerarm_l',0.0,-0.227,0.54); j('hand_l',-0.02,-0.262,0.43); j('hand_end_l',-0.03,-0.265,0.35)
tail=[(0.075,0.0,0.457),(0.12,-0.004,0.448),(0.15,-0.05,0.40),(0.19,-0.124,0.385),(0.23,-0.154,0.41),(0.29,-0.162,0.45)]
for i,t in enumerate(tail): j(f'tail_{i+1:02d}' if i<5 else 'tail_end',*t)
J['root']=Vector((0,0,0))
bones=[ # name, head, tail, parent
 ('root','root',None,None),
 ('pelvis','pelvis','spine_01','root'),('spine_01','spine_01','spine_02','pelvis'),('spine_02','spine_02','spine_03','spine_01'),
 ('spine_03','spine_03','neck_01','spine_02'),('neck_01','neck_01','Head','spine_03'),('Head','Head','Head_end','neck_01'),
]
for s in 'rl':
    bones+= [('clavicle_'+s,'clavicle_'+s,'upperarm_'+s,'spine_03'),('upperarm_'+s,'upperarm_'+s,'lowerarm_'+s,'clavicle_'+s),
             ('lowerarm_'+s,'lowerarm_'+s,'hand_'+s,'upperarm_'+s),('hand_'+s,'hand_'+s,'hand_end_'+s,'lowerarm_'+s),
             ('thigh_'+s,'thigh_'+s,'calf_'+s,'pelvis'),('calf_'+s,'calf_'+s,'foot_'+s,'thigh_'+s),
             ('foot_'+s,'foot_'+s,'ball_'+s,'calf_'+s),('ball_'+s,'ball_'+s,'ball_end_'+s,'foot_'+s)]
tn=[f'tail_{i:02d}' for i in range(1,6)]+['tail_end']
for i in range(5): bones.append((tn[i],tn[i],tn[i+1],'pelvis' if i==0 else tn[i-1]))
arm_d=bpy.data.armatures.new('HanumanRig'); arm=bpy.data.objects.new('HanumanRig',arm_d); bpy.context.scene.collection.objects.link(arm)
bpy.context.view_layer.objects.active=arm; bpy.ops.object.mode_set(mode='EDIT')
eb={}
for n,h,t,p in bones:
    b=arm_d.edit_bones.new(n); b.head=J[h]
    b.tail = J[t] if t else J[h]+Vector((0,0.1,0))
    if p: b.parent=eb[p]; b.use_connect=False
    eb[n]=b
# roll: align so bone local Z points to character's forward(-Y) where possible
for n,b in eb.items():
    b.align_roll(Vector((0,-1,0)) if abs(b.vector.normalized().y)<0.9 else Vector((0,0,1)))
bpy.ops.object.mode_set(mode='OBJECT')

# ---- weights: heat on the body only
for o in bpy.context.scene.objects: o.select_set(False)
body.select_set(True); arm.select_set(True); bpy.context.view_layer.objects.active=arm
bpy.ops.object.parent_set(type='ARMATURE_AUTO')
from mathutils import kdtree
def weights(o): 
    vg={g.index:g.name for g in o.vertex_groups}
    return [{vg[g.group]:g.weight for g in v.groups if g.weight>0.005} for v in o.data.vertices]
BW=weights(body)
good=[i for i,x in enumerate(BW) if x]
kd=kdtree.KDTree(len(good))
for k,i in enumerate(good): kd.insert(body.data.vertices[i].co,k)
kd.balance()
for i,x in enumerate(BW):
    if not x: BW[i]=dict(BW[good[kd.find(body.data.vertices[i].co)[1]]])
def nearest_avg(co,n=6):
    acc={}; tot=0
    for c,k,d in kd.find_n(co,n):
        w=1/(d+1e-4)
        for g,v in BW[good[k]].items(): acc[g]=acc.get(g,0)+v*w
        tot+=w
    return {g:v/tot for g,v in acc.items()}
bnames=[b.name for b in arm.data.bones]
def setw(o,W):
    o.vertex_groups.clear()
    for n in bnames: o.vertex_groups.new(name=n)
    for i,w in enumerate(W):
        items=sorted(w.items(),key=lambda t:-t[1])[:4]; tot=sum(v for _,v in items) or 1
        for g,v in items:
            if v/tot>0.01: o.vertex_groups[g].add([i],v/tot,'REPLACE')
setw(body,BW)
neckz=J['neck_01'].z; headz=J['Head'].z
def headw(co):
    t=max(0,min(1,(co.z-neckz)/(headz-neckz+1e-6)))
    return {'Head':t,'neck_01':1-t} if t<1 else {'Head':1.0}
for key,o in PARTS.items():
    if o==body: continue
    W=[]
    for v in o.data.vertices:
        co=v.co
        if key in ('Object_6','Object_7'): W.append(headw(co))
        elif key=='Object_4':  # skirt: mostly pelvis, legs pull the hem
            w=nearest_avg(co,10); top=J['pelvis'].z+0.03; bot=J['calf_r'].z+0.05
            t=max(0,min(1,(top-co.z)/(top-bot))); k=0.15+0.55*t*t
            out={g:v*k for g,v in w.items()}; out['pelvis']=out.get('pelvis',0)+(1-k); W.append(out)
        else:
            if co.z>J['Head'].z-0.02 and abs(co.x)<0.15 and abs(co.y)<0.15: W.append({'Head':1.0})
            else: W.append(nearest_avg(co,8))
    setw(o,W)
    mod=o.modifiers.new('Armature','ARMATURE'); mod.object=arm; o.parent=arm
# join everything into one skinned mesh
for x in bpy.context.scene.objects: x.select_set(False)
for o in PARTS.values(): o.select_set(True)
bpy.context.view_layer.objects.active=body
bpy.ops.object.join(); body.name='Hanuman'
mods=[m for m in body.modifiers if m.type=='ARMATURE']
for m in mods[1:]: body.modifiers.remove(m)
bpy.ops.wm.save_as_mainfile(filepath='/home/user/work/hanuman_rig2.blend')
print('OK',len(body.data.vertices))
