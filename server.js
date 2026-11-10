// خادم بسيط بدون أي مكتبات خارجية: بيقدّم الصفحة + بيحفظ التصميم + بيبث التعديلات لكل المتصلين.
const http = require('http'), fs = require('fs'), path = require('path');
const PORT = process.env.PORT || 3000;
const PASS = process.env.APP_PASSWORD || '';
const DATA = process.env.DATA_FILE || path.join(__dirname, 'data', 'project.json');
let state = null;
try { state = JSON.parse(fs.readFileSync(DATA, 'utf8')); } catch (e) {}
const clients = new Set();
const allowed = (req, u) => !PASS || req.headers['x-pass'] === PASS || u.searchParams.get('p') === PASS;
function save() {
  try { fs.mkdirSync(path.dirname(DATA), { recursive: true }); fs.writeFileSync(DATA + '.tmp', JSON.stringify(state)); fs.renameSync(DATA + '.tmp', DATA); } catch (e) { console.error('save failed', e.message); }
}
http.createServer((req, res) => {
  const u = new URL(req.url, 'http://localhost');
  if (u.pathname === '/' || u.pathname === '/index.html') {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    return res.end(fs.readFileSync(path.join(__dirname, 'index.html')));
  }
  if (u.pathname === '/api/ping') { res.writeHead(200, { 'Content-Type': 'application/json' }); return res.end(JSON.stringify({ auth: !!PASS })); }
  if (!u.pathname.startsWith('/api/')) { res.writeHead(404); return res.end(); }
  if (!allowed(req, u)) { res.writeHead(401); return res.end(); }
  if (u.pathname === '/api/project' && req.method === 'GET') { res.writeHead(200, { 'Content-Type': 'application/json' }); return res.end(JSON.stringify(state)); }
  if (u.pathname === '/api/project' && req.method === 'POST') {
    let body = '', big = false;
    req.on('data', c => { body += c; if (body.length > 6e6) { big = true; req.destroy(); } });
    req.on('end', () => {
      if (big) return;
      try {
        const d = JSON.parse(body);
        if (typeof d.json !== 'string') throw 0;
        state = { json: d.json, by: String(d.by || ''), ts: Date.now() };
        save();
        const msg = 'data: ' + JSON.stringify(state) + '\n\n';
        clients.forEach(c => c.write(msg));
        res.writeHead(200, { 'Content-Type': 'application/json' }); res.end('{}');
      } catch (e) { res.writeHead(400); res.end(); }
    });
    return;
  }
  if (u.pathname === '/api/events') {
    res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive', 'X-Accel-Buffering': 'no' });
    res.write('retry: 2000\n\n');
    clients.add(res);
    const hb = setInterval(() => res.write(': ping\n\n'), 25000);
    req.on('close', () => { clearInterval(hb); clients.delete(res); });
    return;
  }
  res.writeHead(404); res.end();
}).listen(PORT, () => console.log('Apartment site running on port ' + PORT + (PASS ? ' (password protected)' : ' (NO password)')));
