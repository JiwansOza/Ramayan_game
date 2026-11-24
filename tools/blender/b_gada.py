import bpy, bmesh, math, numpy as np, sys
from mathutils import Vector, Matrix, Quaternion
argv=sys.argv[sys.argv.index('--')+1:]
blend,out,rigname,hand,length=argv[0],argv[1],argv[2],argv[3],float(argv[4])
bpy.ops.wm.open_mainfile(filepath=blend)
arm=bpy.data.objects[rigname]
# source rest (UAL) for the hand's T-pose-aligned frame
before=set(bpy.data.objects)
bpy.ops.import_scene.gltf(filepath='/home/user/work/dl/UAL1.glb')
new=[o for o in bpy.data.objects if o not in before]; src=[o for o in new if o.type=='ARMATURE'][0]
def wrest(a,n): return a.matrix_world@a.data.bones[n].matrix_local
MAP=[b.name for b in arm.data.bones if b.name in src.data.bones and b.name!='root']
A={}
def align(b,Gp):
    n=b.name
    if n in MAP:
        dt=(Gp.to_matrix()@(wrest(arm,n).to_3x3()@Vector((0,1,0)))).normalized()
        ds=(wrest(src,n).to_3x3()@Vector((0,1,0))).normalized(); G=dt.rotation_difference(ds)@Gp
    else: G=Gp
    A[n]=G
    for c in b.children: align(c,G)
for b in arm.data.bones:
    if b.parent is None: align(b,Quaternion())
axis=(A[hand].inverted()@Vector((0,-1,0))).normalized()   # weapon points along the thumb (forward in the T-pose)
for o in new: bpy.data.objects.remove(o)
for a in list(bpy.data.actions):
    if a.users==0: bpy.data.actions.remove(a)
# the mace from the OBJ
before=set(bpy.data.objects)
bpy.ops.wm.obj_import(filepath='/home/user/work/hanuman.obj')
objs=[o for o in bpy.data.objects if o not in before]
mace=[o for o in objs if o.name.startswith('mace')][0]
for o in objs:
    if o!=mace: bpy.data.objects.remove(o)
bpy.context.view_layer.objects.active=mace
for o in bpy.context.scene.objects: o.select_set(o==mace)
bpy.ops.object.transform_apply(location=True,rotation=True,scale=True)
V=np.array([v.co[:] for v in mace.data.vertices]); c=V.mean(0)
u,s,vt=np.linalg.svd(V-c); ax=vt[0]; t=(V-c)@ax
# head = thicker end
r=np.linalg.norm((V-c)-np.outer(t,ax),axis=1)
hi=t>np.percentile(t,80); lo=t<np.percentile(t,20)
if r[lo].mean()>r[hi].mean(): ax=-ax; t=-t
L=t.max()-t.min(); pommel=c+ax*t.min()
sc=length/L
# grip a fifth of the way up from the pommel
grip_local=pommel+ax*(0.17*L)
R=Vector(ax).rotation_difference(axis).to_matrix().to_4x4()
hb=arm.data.bones[hand]; hw=arm.matrix_world@hb.head_local; tw=arm.matrix_world@hb.tail_local
fist=hw+(tw-hw)*0.55
M=Matrix.Translation(fist)@R@Matrix.Scale(sc,4)@Matrix.Translation(-Vector(grip_local))
mace.data.transform(M); mace.data.update()
# materials: gold head, dark wood + gold bands on the handle
gold=bpy.data.materials.new('GadaGold'); gold.use_nodes=True
p=gold.node_tree.nodes['Principled BSDF']; p.inputs['Base Color'].default_value=(0.85,0.6,0.18,1); p.inputs['Metallic'].default_value=1.0; p.inputs['Roughness'].default_value=0.32
wood=bpy.data.materials.new('GadaHandle'); wood.use_nodes=True
p=wood.node_tree.nodes['Principled BSDF']; p.inputs['Base Color'].default_value=(0.32,0.08,0.05,1); p.inputs['Metallic'].default_value=0.2; p.inputs['Roughness'].default_value=0.55
mace.data.materials.clear(); mace.data.materials.append(gold); mace.data.materials.append(wood)
fist_v=Vector(fist)
for poly in mace.data.polygons:
    cc=poly.center; d=(cc-fist_v).dot(axis)
    rad=((cc-fist_v)-axis*d).length
    poly.material_index=1 if (-0.06*length<d<0.42*length and rad<0.03*length*1.6) else 0
for p in mace.data.polygons: p.use_smooth=True
mace.name='Gada'; mace.data.name='Gada'
# bone-parent to the hand, keep world transform
mw=mace.matrix_world.copy()
mace.parent=arm; mace.parent_type='BONE'; mace.parent_bone=hand
bpy.context.view_layer.update()
mace.matrix_world=mw
print('GADA',L,sc,axis,len(mace.data.vertices))
bpy.ops.wm.save_as_mainfile(filepath=out)
