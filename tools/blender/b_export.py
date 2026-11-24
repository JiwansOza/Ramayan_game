import bpy, sys
argv=sys.argv[sys.argv.index('--')+1:]
bpy.ops.wm.open_mainfile(filepath=argv[0])
import os
for im in list(bpy.data.images):
    if im.size[0]==0: continue
    p=f'/home/user/work/tex_{im.name.replace(" ","_")}.png'
    sc=bpy.context.scene; im.filepath_raw=p; im.file_format='PNG'
    try: im.save(filepath=p)
    except Exception as e:
        print('save fail',e); continue
    from PIL import Image
    j=p[:-4]+'.jpg'; Image.open(p).convert('RGB').save(j,quality=86)
    n=bpy.data.images.load(j); n.name=im.name+'_j'
    if im.colorspace_settings.name!='sRGB': n.colorspace_settings.name=im.colorspace_settings.name
    im.user_remap(n)
for m in bpy.data.materials:
    if not m.use_nodes: continue
    for nd in m.node_tree.nodes:
        if nd.type=='BSDF_PRINCIPLED':
            for l in list(nd.inputs['Alpha'].links): m.node_tree.links.remove(l)
            nd.inputs['Alpha'].default_value=1.0
for o in bpy.context.scene.objects: o.select_set(True)
kw=dict(filepath=argv[1], export_format='GLB', use_selection=False, export_animations=True, export_animation_mode='NLA_TRACKS',
        export_image_format='JPEG', export_jpeg_quality=int(argv[2]) if len(argv)>2 else 85, export_apply=False, export_skins=True,
        export_force_sampling=True, export_frame_step=1, export_optimize_animation_size=True, export_def_bones=False, export_yup=True)
try: bpy.ops.export_scene.gltf(**kw)
except TypeError as e:
    print('kw',e); raise
print('EXPORTED')
