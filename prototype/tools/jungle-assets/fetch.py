import json, os, sys, urllib.request
out = sys.argv[1]
def get(u): return urllib.request.urlopen(urllib.request.Request(u, headers={'User-Agent': 'asset-fetch'})).read()
for mid in sys.argv[2:]:
    d = json.loads(get('https://api.polyhaven.com/files/' + mid)); dst = os.path.join(out, mid); os.makedirs(dst, exist_ok=True)
    if 'gltf' in d:
        g = d['gltf']['1k']['gltf']; files = {os.path.basename(g['url']): g['url']}
        for rel, v in g.get('include', {}).items(): files[rel] = v['url']
    else:
        files = {mid + '_diff_1k.jpg': d['Diffuse']['1k']['jpg']['url'], mid + '_nor_gl_1k.jpg': d['nor_gl']['1k']['jpg']['url']}
    for rel, u in files.items():
        assert u.startswith('https://dl.polyhaven.org/'), u
        p = os.path.normpath(os.path.join(dst, rel)); assert p.startswith(dst)
        os.makedirs(os.path.dirname(p), exist_ok=True); open(p, 'wb').write(get(u))
    print(mid, 'ok', len(files), 'files')
