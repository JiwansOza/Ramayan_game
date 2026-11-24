import bpy, bmesh, math, sys, numpy as np
from mathutils import Vector, Matrix, Quaternion, kdtree
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath='/home/user/work/dl/Superhero_Male.glb')
for o in list(bpy.data.objects):
    if o.name.startswith('Icosphere'): bpy.data.objects.remove(o)
arm=[o for o in bpy.data.objects if o.type=='ARMATURE'][0]; arm.name='RakshasaRig'
body=bpy.data.objects['SuperHero_Male']; body.name='Rakshasa'
eyes=bpy.data.objects['Eyes']; brows=bpy.data.objects['Eyebrows']
# ---------- skin: re-tint the albedo to a dark blue-teal rakshasa ----------
img=bpy.data.images['T_Superhero_Male_Dark']
w,h=img.size; px=np.array(img.pixels[:],dtype=np.float32).reshape(h,w,4)
rgb=px[...,:3]; L=(rgb*[0.3,0.59,0.11]).sum(-1,keepdims=True)
Ln=np.clip(L/ max(1e-3,np.percentile(L,97)),0,1)
dark=np.array([0.035,0.045,0.08]); mid=np.array([0.11,0.2,0.27]); hi=np.array([0.3,0.43,0.48])
t=Ln; col=np.where(t<0.5, dark+(mid-dark)*(t/0.5), mid+(hi-mid)*((t-0.5)/0.5))
# keep very dark cloth (the shorts) near black-maroon
cloth=(L<0.035)
col=np.where(cloth, np.array([0.05,0.012,0.012])+L*0.6, col)
px[...,:3]=col; img.pixels[:]=px.ravel().tolist(); img.update()
from PIL import Image as PI
arr=(np.clip(px[::-1,:,:3],0,1)*255).astype(np.uint8)
PI.fromarray(arr).save('/home/user/work/rakshasa_skin.jpg',quality=88)
nimg=bpy.data.images.load('/home/user/work/rakshasa_skin.jpg'); nimg.pack(); img.user_remap(nimg)
def mat(name,col,metal=0.0,rough=0.6,emit=None,es=0):
    m=bpy.data.materials.new(name); m.use_nodes=True; p=m.node_tree.nodes['Principled BSDF']
    p.inputs['Base Color'].default_value=(*col,1); p.inputs['Metallic'].default_value=metal; p.inputs['Roughness'].default_value=rough
    if emit: p.inputs['Emission Color'].default_value=(*emit,1); p.inputs['Emission Strength'].default_value=es
    return m
GOLD=mat('RGold',(0.8,0.55,0.16),1.0,0.3)
BRONZE=mat('RBronze',(0.42,0.25,0.1),0.9,0.42)
IVORY=mat('RIvory',(0.78,0.72,0.58),0.0,0.45)
HORN=mat('RHorn',(0.16,0.1,0.08),0.1,0.5)
HAIR=mat('RHair',(0.02,0.015,0.018),0.0,0.8)
CLOTH=mat('RCloth',(0.32,0.03,0.04),0.0,0.85)
CLOTH2=mat('RCloth2',(0.62,0.33,0.06),0.2,0.7)
EYE=mat('REye',(1.0,0.25,0.05),0.0,0.4,(1.0,0.22,0.04),6.0)
eyes.data.materials.clear(); eyes.data.materials.append(EYE)
brows.data.materials.clear(); brows.data.materials.append(HAIR)
B=lambda n: (arm.matrix_world@arm.data.bones[n].head_local, arm.matrix_world@arm.data.bones[n].tail_local)
parts=[]  # (obj, rule)
def new_obj(name,bm,m):
    me=bpy.data.meshes.new(name); bm.to_mesh(me); bm.free()
    o=bpy.data.objects.new(name,me); bpy.context.scene.collection.objects.link(o)
    if isinstance(m,list):
        for x in m: me.materials.append(x)
    else: me.materials.append(m)
    for p in me.polygons: p.use_smooth=True
    return o
def tube(bm,pts,radii,seg=10,cap=True):
    rings=[]
    for i,p in enumerate(pts):
        d=(pts[min(i+1,len(pts)-1)]-pts[max(i-1,0)]).normalized()
        a=d.orthogonal().normalized(); b=d.cross(a)
        ring=[bm.verts.new(p+(a*math.cos(k/seg*2*math.pi)+b*math.sin(k/seg*2*math.pi))*radii[i]) for k in range(seg)]
        rings.append(ring)
    for r0,r1 in zip(rings,rings[1:]):
        for k in range(seg): bm.faces.new((r0[k],r0[(k+1)%seg],r1[(k+1)%seg],r1[k]))
    if cap:
        tip=bm.verts.new(pts[-1]+(pts[-1]-pts[-2]).normalized()*radii[-1]*0.5)
        for k in range(seg): bm.faces.new((rings[-1][k],rings[-1][(k+1)%seg],tip))
        bm.faces.new(list(reversed(rings[0])))
def bez(p0,p1,p2,n):
    return [ (1-t)**2*p0+2*(1-t)*t*p1+t*t*p2 for t in [i/(n-1) for i in range(n)] ]
def torus(bm,c,axis,R,r,seg=24,rs=8,squash=1.0):
    axis=axis.normalized(); a=axis.orthogonal().normalized(); b=axis.cross(a)
    rings=[]
    for i in range(seg):
        u=i/seg*2*math.pi; cu=a*math.cos(u)+b*math.sin(u); cen=c+cu*R
        rings.append([bm.verts.new(cen+(cu*math.cos(v/rs*2*math.pi)*r+axis*math.sin(v/rs*2*math.pi)*r*squash)) for v in range(rs)])
    for i in range(seg):
        r0,r1=rings[i],rings[(i+1)%seg]
        for k in range(rs): bm.faces.new((r0[k],r1[k],r1[(k+1)%rs],r0[(k+1)%rs]))
hh,ht=B('Head'); headc=hh+Vector((0,-0.02,0.1))
# horns: from the temples, up and outward, curling back
bm=bmesh.new()
for s in (1,-1):
    p0=headc+Vector((0.06*s,-0.035,0.06)); p1=p0+Vector((0.17*s,-0.01,0.05)); p2=p0+Vector((0.19*s,0.05,0.2))
    pts=bez(p0,p1,p2,14); tube(bm,pts,[0.032*(1-i/13)**0.9+0.002 for i in range(14)],10)
horns=new_obj('Horns',bm,HORN); parts.append((horns,'Head'))
# tusks from the lower jaw
bm=bmesh.new()
for s in (1,-1):
    p0=hh+Vector((0.03*s,-0.1,0.005)); p1=p0+Vector((0.012*s,-0.02,0.03)); p2=p0+Vector((0.022*s,-0.012,0.06))
    tube(bm,bez(p0,p1,p2,7),[0.011*(1-i/6)+0.001 for i in range(7)],8)
tusks=new_obj('Tusks',bm,IVORY); parts.append((tusks,'Head'))
# crown band + spikes
bm=bmesh.new(); torus(bm,headc+Vector((0,0.0,0.045)),Vector((0,0.12,1)),0.105,0.014,28,6,1.4)
for k in range(5):
    ang=math.radians(-60+30*k); d=Vector((math.sin(ang),-math.cos(ang),0))
    base=headc+Vector((0,0,0.055))+d*0.1
    tube(bm,[base,base+Vector((0,0,0.05))+d*0.01,base+Vector((0,0,0.09))+d*0.015],[0.018,0.012,0.003],6)
crown=new_obj('Crown',bm,GOLD); parts.append((crown,'Head'))
# wild hair behind the head
bm=bmesh.new(); import random; random.seed(3)
for k in range(16):
    ang=math.radians(-80+160*k/15); d=Vector((math.sin(ang),math.cos(ang),0))
    p0=headc+d*0.07+Vector((0,0.02,0.05+random.uniform(-0.03,0.03)))
    p2=p0+d*0.12+Vector((0,0.1,-0.22-random.uniform(0,0.1)))
    tube(bm,bez(p0,p0+d*0.1+Vector((0,0.06,0.02)),p2,7),[0.03*(1-i/6)+0.002 for i in range(7)],6)
hair=new_obj('Hair',bm,HAIR); parts.append((hair,'skin'))
# earrings
bm=bmesh.new()
for s in (1,-1): torus(bm,hh+Vector((0.085*s,0.0,0.0)),Vector((1,0,0)),0.025,0.006,16,6)
ear=new_obj('Earrings',bm,GOLD); parts.append((ear,'Head'))
# necklace
nh,nt=B('neck_01'); bm=bmesh.new(); torus(bm,nh+Vector((0,-0.025,-0.035)),Vector((0,0.35,1)),0.105,0.016,28,6,0.8)
torus(bm,nh+Vector((0,-0.055,-0.09)),Vector((0,0.6,1)),0.12,0.01,28,6)
neck=new_obj('Necklace',bm,GOLD); parts.append((neck,'skin'))
# armlets and wrist cuffs
bm=bmesh.new()
for s in 'lr':
    a0,a1=B('upperarm_'+s); torus(bm,a0+(a1-a0)*0.55,(a1-a0),0.058,0.012,20,6,1.6)
    l0,l1=B('lowerarm_'+s); torus(bm,l0+(l1-l0)*0.82,(l1-l0),0.044,0.014,20,6,2.2)
bands=new_obj('Bands',bm,GOLD); parts.append((bands,'skin'))
# shoulder guards
bm=bmesh.new()
for s in (1,-1):
    a0,a1=B('upperarm_'+('l' if s>0 else 'r'))
    c=a0+(a1-a0)*0.08+Vector((0,0,0.035))
    bmesh.ops.create_uvsphere(bm,u_segments=14,v_segments=8,radius=0.085,matrix=Matrix.Translation(c)@Matrix.Diagonal((1.15,1.0,0.6,1)))
pads=new_obj('Pauldrons',bm,BRONZE); parts.append((pads,'skin'))
# dhoti: a flared skirt from the waist to just above the knee, gold hem
ph,pt=B('pelvis'); th,tt=B('thigh_r'); kz=tt.z
bm=bmesh.new(); seg=32; prof=[(ph.z+0.1,0.15),(ph.z+0.075,0.155),(ph.z+0.02,0.165),(ph.z-0.12,0.18),(kz+0.2,0.19),(kz+0.11,0.194),(kz+0.08,0.195)]
rings=[]
for z,r in prof:
    rings.append([bm.verts.new(Vector((math.cos(k/seg*2*math.pi)*r*1.12, math.sin(k/seg*2*math.pi)*r*0.82+0.03, z))) for k in range(seg)])
for i,(r0,r1) in enumerate(zip(rings,rings[1:])):
    for k in range(seg):
        f=bm.faces.new((r0[k],r0[(k+1)%seg],r1[(k+1)%seg],r1[k])); f.material_index=1 if i==len(rings)-2 or i==0 else 0
dhoti=new_obj('Dhoti',bm,[CLOTH,CLOTH2]); parts.append((dhoti,'skirt'))
bm=bmesh.new(); torus(bm,Vector((0,0.03,ph.z+0.085)),Vector((0,0,1)),0.162,0.018,32,6,1.3)
belt=new_obj('Belt',bm,GOLD); parts.append((belt,'pelvis'))
# ---------- weights ----------
bnames=[b.name for b in arm.data.bones]
vgn={g.index:g.name for g in body.vertex_groups}
BW=[{vgn[g.group]:g.weight for g in v.groups if g.weight>0.01} for v in body.data.vertices]
good=[i for i,x in enumerate(BW) if x]
kd=kdtree.KDTree(len(good))
for k,i in enumerate(good): kd.insert(body.matrix_world@body.data.vertices[i].co,k)
kd.balance()
def near(co,n=8):
    acc={}; tot=0
    for c,k,d in kd.find_n(co,n):
        ww=1/(d+1e-4)
        for g,v in BW[good[k]].items(): acc[g]=acc.get(g,0)+v*ww
        tot+=ww
    return {g:v/tot for g,v in acc.items()}
for o,rule in parts:
    for n in bnames: o.vertex_groups.new(name=n)
    for i,v in enumerate(o.data.vertices):
        co=v.co
        if rule=='skin': w=near(co)
        elif rule=='skirt':
            ww=near(co,12); top=ph.z+0.1; bot=kz
            t=max(0,min(1,(top-co.z)/(top-bot))); k=0.1+0.6*t*t
            w={g:x*k for g,x in ww.items()}; w['pelvis']=w.get('pelvis',0)+(1-k)
        else: w={rule:1.0}
        items=sorted(w.items(),key=lambda t:-t[1])[:4]; tot=sum(x for _,x in items)
        for g,x in items:
            if x/tot>0.01: o.vertex_groups[g].add([i],x/tot,'REPLACE')
    md=o.modifiers.new('Armature','ARMATURE'); md.object=arm; o.parent=arm
for x in bpy.context.scene.objects: x.select_set(False)
for o,_ in parts: o.select_set(True)
body.select_set(True); bpy.context.view_layer.objects.active=body
bpy.ops.object.join()
mods=[m for m in body.modifiers if m.type=='ARMATURE']
for m in mods[1:]: body.modifiers.remove(m)
# bigger than Hanuman: about 2.05 m
for o in (arm,): o.scale=(1.13,1.13,1.13)
for x in bpy.context.scene.objects: x.select_set(x in (arm,body,eyes,brows))
bpy.context.view_layer.objects.active=arm
bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
bpy.ops.wm.save_as_mainfile(filepath='/home/user/work/rakshasa_rig.blend')
print('OK',len(body.data.vertices))
