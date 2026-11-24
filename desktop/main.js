// Desktop shell for Lanka ki Chhatein: serves the game folder on a private local port and opens it in a window.
// (The game loads its models and sounds with fetch, which browsers do not allow from file:// pages.)
const { app, BrowserWindow, Menu } = require('electron');
const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = fs.existsSync(path.join(__dirname, 'game')) ? path.join(__dirname, 'game') : path.join(__dirname, '..', 'prototype');
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.json': 'application/json', '.glb': 'model/gltf-binary',
  '.ogg': 'audio/ogg', '.mp3': 'audio/mpeg', '.jpg': 'image/jpeg', '.png': 'image/png', '.woff2': 'font/woff2', '.css': 'text/css' };

function serve() {
  return new Promise((ok) => {
    const srv = http.createServer((req, res) => {
      let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
      if (p === '/') p = '/lanka-ki-chhatein.html';
      const f = path.normalize(path.join(ROOT, p));
      if (!f.startsWith(ROOT)) { res.writeHead(403); res.end(); return; }
      fs.readFile(f, (err, data) => {
        if (err) { res.writeHead(404); res.end('not found'); return; }
        res.writeHead(200, { 'Content-Type': TYPES[path.extname(f).toLowerCase()] || 'application/octet-stream' });
        res.end(data);
      });
    });
    srv.listen(0, '127.0.0.1', () => ok(srv.address().port));
  });
}

app.whenReady().then(async () => {
  const port = await serve();
  Menu.setApplicationMenu(null);
  const win = new BrowserWindow({ width: 1600, height: 900, backgroundColor: '#0e0b1e', title: 'Lanka ki Chhatein', autoHideMenuBar: true,
    webPreferences: { contextIsolation: true, sandbox: true, backgroundThrottling: false } });
  win.loadURL(`http://127.0.0.1:${port}/lanka-ki-chhatein.html`);
  // F11 toggles full screen
  win.webContents.on('before-input-event', (e, input) => { if (input.type === 'keyDown' && input.key === 'F11') { win.setFullScreen(!win.isFullScreen()); e.preventDefault(); } });
});
app.on('window-all-closed', () => app.quit());
