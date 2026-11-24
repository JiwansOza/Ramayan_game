import bpy, bmesh, math, sys, numpy as np
from mathutils import Vector, Matrix, Quaternion
argv=sys.argv[sys.argv.index('--')+1:]
bpy.ops.wm.open_mainfile(filepath=argv[0]); out=argv[1]
arm=bpy.data.objects['RakshasaRig']
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
act=bpy.data.actions['Idle_Torch_Loop']; src.animation_data.action=act; src.animation_data.action_slot=act.slots[0]
bpy.context.scene.frame_set(10)
Rp=(src.matrix_world@src.pose.bones['hand_l'].matrix).to_quaternion(); Rr=wrest(src,'hand_l').to_quaternion()
TORCH_FWD=(Rr@Rp.inverted()@Vector((0.0,-0.25,1.0)).normalized())
src.animation_data.action=None; bpy.context.scene.frame_set(0)
for o in new: bpy.data.objects.remove(o)
for a in list(bpy.data.actions):
    if a.users==0: bpy.data.actions.remove(a)
def mat(name,col,metal=0.0,rough=0.6,emit=None,es=0):
    m=bpy.data.materials.new(name); m.use_nodes=True; p=m.node_tree.nodes['Principled BSDF']
    p.inputs['Base Color'].default_value=(*col,1); p.inputs['Metallic'].default_value=metal; p.inputs['Roughness'].default_value=rough
    if emit: p.inputs['Emission Color'].default_value=(*emit,1); p.inputs['Emission Strength'].default_value=es
    return m
def attach(o, hand, length, grip=0.18, ax=None, fwd=Vector((0,-1,0))):
    # o: object with handle along +Z from z=min (butt) to head; scale to length, grip at grip fraction, point along the thumb
    for x in bpy.context.scene.objects: x.select_set(x==o)
    bpy.context.view_layer.objects.active=o
    bpy.ops.object.transform_apply(location=True,rotation=True,scale=True)
    V=np.array([v.co[:] for v in o.data.vertices]); zmin,zmax=V[:,2].min(),V[:,2].max(); L=zmax-zmin
    cx,cy=np.median(V[:,0]),np.median(V[:,1])
    axis=(A[hand].inverted()@fwd).normalized()
    hb=arm.data.bones[hand]; hw=arm.matrix_world@hb.head_local; tw=arm.matrix_world@hb.tail_local
    fist=hw+(tw-hw)*0.6
    R=Vector((0,0,1)).rotation_difference(axis).to_matrix().to_4x4()
    s=length/L
    M=Matrix.Translation(fist)@R@Matrix.Scale(s,4)@Matrix.Translation(Vector((-cx,-cy,-(zmin+grip*L))))
    o.data.transform(M); o.data.update()
    mw=o.matrix_world.copy(); o.parent=arm; o.parent_type='BONE'; o.parent_bone=hand
    o.matrix_parent_inverse=Matrix.Identity(4)
    bpy.context.view_layer.update(); o.matrix_world=Matrix.Identity(4)
    return o
def glb_weapon(f,name):
    before=set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=f'/home/user/work/dl/{f}.glb')
    ms=[o for o in bpy.data.objects if o not in before and o.type=='MESH']
    for o in bpy.data.objects:
        if o not in before and o.type!='MESH': bpy.data.objects.remove(o)
    for x in bpy.context.scene.objects: x.select_set(x in ms)
    bpy.context.view_layer.objects.active=ms[0]
    bpy.ops.object.parent_clear(type='CLEAR_KEEP_TRANSFORM')
    bpy.ops.object.join(); o=bpy.context.view_layer.objects.active; o.name=name; o.data.name=name
    return o
axe=attach(glb_weapon('Axe','W_Axe'),'hand_r',1.05,0.12)
club=attach(glb_weapon('Hammer_Small','W_Club'),'hand_r',0.95,0.12)
# trishul: pole, gold collar, three prongs
IRON=mat('WIron',(0.55,0.56,0.6),1.0,0.35); WOOD=mat('WWood',(0.25,0.12,0.06),0.0,0.7); GOLD=mat('WGold',(0.8,0.55,0.16),1.0,0.3)
bm=bmesh.new()
def cyl(r1,r2,z0,z1,m,x=0.0,seg=10):
    g=bmesh.ops.create_cone(bm,cap_ends=True,segments=seg,radius1=r1,radius2=r2,depth=z1-z0,matrix=Matrix.Translation((x,0,(z0+z1)/2)))
    for f in {f for v in g['verts'] for f in v.link_faces}: f.material_index=m
cyl(0.018,0.018,0,1.5,0); cyl(0.032,0.032,1.48,1.56,1); cyl(0.0,0.0,0,0,1)
cyl(0.016,0.002,1.56,1.86,2,0.0,8)
for s in (-1,1):
    pts=[Vector((0.0,0,1.56)),Vector((0.09*s,0,1.6)),Vector((0.1*s,0,1.78))]
    for a,b in zip(pts,pts[1:]):
        d=b-a; g=bmesh.ops.create_cone(bm,cap_ends=True,segments=8,radius1=0.014,radius2=0.01 if b!=pts[-1] else 0.002,depth=d.length,
            matrix=Matrix.Translation((a+b)/2)@Vector((0,0,1)).rotation_difference(d).to_matrix().to_4x4())
        for f in {f for v in g['verts'] for f in v.link_faces}: f.material_index=2
me=bpy.data.meshes.new('W_Trishul'); bm.to_mesh(me); bm.free()
for m in (WOOD,GOLD,IRON): me.materials.append(m)
tri=bpy.data.objects.new('W_Trishul',me); bpy.context.scene.collection.objects.link(tri)
tri=attach(tri,'hand_r',1.6,0.35)
# torch for the left hand, with an empty at the flame
bm=bmesh.new()
g=bmesh.ops.create_cone(bm,cap_ends=True,segments=8,radius1=0.022,radius2=0.03,depth=0.55,matrix=Matrix.Translation((0,0,0.275)))
for f in {f for v in g['verts'] for f in v.link_faces}: f.material_index=0
g=bmesh.ops.create_cone(bm,cap_ends=True,segments=10,radius1=0.035,radius2=0.075,depth=0.1,matrix=Matrix.Translation((0,0,0.6)))
for f in {f for v in g['verts'] for f in v.link_faces}: f.material_index=1
me=bpy.data.meshes.new('W_Torch'); bm.to_mesh(me); bm.free(); me.materials.append(WOOD); me.materials.append(GOLD)
torch=bpy.data.objects.new('W_Torch',me); bpy.context.scene.collection.objects.link(torch)
torch=attach(torch,'hand_l',0.65,0.3,fwd=TORCH_FWD)
fire=bpy.data.objects.new('TorchFire',None); bpy.context.scene.collection.objects.link(fire)
fire.parent=torch; fire.location=(0,0,0)
# place the empty at the bowl: top of the torch in world space
V=[torch.matrix_world@v.co for v in torch.data.vertices]
hb=arm.data.bones['hand_l']; hw=arm.matrix_world@hb.head_local
far=max(V,key=lambda p:(p-hw).length)
fire.matrix_world=Matrix.Translation(far)
for o in (axe,club,tri,torch):
    for p in o.data.polygons: p.use_smooth=True
print('WEAPONS OK')
bpy.ops.wm.save_as_mainfile(filepath=out)
