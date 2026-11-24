import bpy, sys, math
from mathutils import Vector
argv=sys.argv[sys.argv.index('--')+1:]
bpy.ops.wm.open_mainfile(filepath=argv[0]); out=argv[1]; arm=bpy.data.objects[argv[2]]
clips=argv[3].split(','); n=int(argv[4]) if len(argv)>4 else 6
view=argv[5] if len(argv)>5 else 'side'
sc=bpy.context.scene
sc.render.engine='BLENDER_WORKBENCH'; sc.display.shading.light='STUDIO'; sc.display.shading.color_type='TEXTURE'
sc.render.resolution_x=256; sc.render.resolution_y=320; sc.render.film_transparent=True
cam=bpy.data.objects.new('cam',bpy.data.cameras.new('cam')); sc.collection.objects.link(cam); sc.camera=cam
cam.data.type='ORTHO'
h=max(o.dimensions.z for o in sc.objects if o.type=='MESH')
cam.data.ortho_scale=h*1.7
d={'side':Vector((1,0,0)),'front':Vector((0,-1,0)),'iso':Vector((0.8,-0.6,0)).normalized()}[view]
cam.location=Vector((0,0,h*0.55))+d*10; cam.rotation_euler=(-d).to_track_quat('-Z','Y').to_euler()
for tr in arm.animation_data.nla_tracks: tr.mute=True
for c in clips:
    a=bpy.data.actions[c]; arm.animation_data.action=a
    try: arm.animation_data.action_slot=a.slots[0]
    except: pass
    f0,f1=a.frame_range
    for i in range(n):
        f=f0+(f1-f0)*i/(n-1 if n>1 else 1)
        sc.frame_set(int(round(f)))
        sc.render.filepath=f'{out}_{c}_{i}.png'; bpy.ops.render.render(write_still=True)
