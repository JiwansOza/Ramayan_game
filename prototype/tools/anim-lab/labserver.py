# serves the animation lab and saves what the page POSTs to /save/<name> into the out folder
import http.server, os, sys, re
ROOT = sys.argv[1]; OUT = sys.argv[2]; PORT = int(sys.argv[3])
class H(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *a, **k): super().__init__(*a, directory=ROOT, **k)
    def do_POST(self):
        m = re.fullmatch(r'/save/([A-Za-z0-9_.-]+)', self.path)
        if not m: self.send_response(404); self.end_headers(); return
        n = int(self.headers.get('Content-Length', 0)); data = self.rfile.read(n)
        with open(os.path.join(OUT, m.group(1)), 'wb') as f: f.write(data)
        self.send_response(200); self.end_headers(); self.wfile.write(b'saved %d' % len(data))
http.server.ThreadingHTTPServer(('127.0.0.1', PORT), H).serve_forever()
