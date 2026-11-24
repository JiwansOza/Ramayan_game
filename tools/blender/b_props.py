import bpy, glob, os
bpy.ops.wm.read_factory_settings(use_empty=True)
files=sorted(glob.glob('/home/user/work/env/*/*.glb'))
x=0
for f in files:
    kit=f.split('/')[-2]; name=os.path.basename(f)[:-4]
    before=set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=f)
    new=[o for o in bpy.data.objects if o not in before]
    meshes=[o for o in new if o.type=='MESH']
    for o in bpy.context.scene.objects: o.select_set(False)
    for o in meshes: o.select_set(True)
    bpy.context.view_layer.objects.active=meshes[0]
    for o in meshes:
        bpy.context.view_layer.objects.active=o
    bpy.ops.object.parent_clear(type='CLEAR_KEEP_TRANSFORM')
    for o in new:
        if o.type!='MESH': bpy.data.objects.remove(o)
    bpy.context.view_layer.objects.active=meshes[0]
    for o in meshes: o.select_set(True)
    if len(meshes)>1: bpy.ops.object.join()
    o=bpy.context.view_layer.objects.active
    bpy.ops.object.transform_apply(location=True,rotation=True,scale=True)
    o.name='P_'+name.replace('-','_'); o.data.name=o.name
    print('PROP',o.name,tuple(round(v,2) for v in o.dimensions))
for o in bpy.context.scene.objects: o.select_set(True)
bpy.ops.export_scene.gltf(filepath='/home/user/work/props.glb',export_format='GLB',use_selection=False,export_animations=False,export_image_format='AUTO',export_yup=True)
