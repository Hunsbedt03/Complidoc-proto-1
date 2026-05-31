const http = require('http');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');

const root = path.join(__dirname, '..');
const port = Number(process.env.PORT) || 8765;
const apiHandler = require(path.join(root, 'api', 'generate', 'index.js'));

function readBody(req) {
  return new Promise(function(resolve) {
    const chunks = [];
    req.on('data', function(c) { chunks.push(c); });
    req.on('end', function() {
      const raw = Buffer.concat(chunks).toString('utf8');
      if (!raw) return resolve(undefined);
      try { resolve(JSON.parse(raw)); } catch (e) { resolve(raw); }
    });
  });
}

function serveApi(req, res) {
  readBody(req).then(function(body) {
    const vercelRes = {
      statusCode: 200,
      headers: {},
      status: function(code) { this.statusCode = code; return this; },
      setHeader: function(k, v) { this.headers[k] = v; },
      json: function(obj) {
        res.writeHead(this.statusCode, Object.assign({ 'Content-Type': 'application/json' }, this.headers));
        res.end(JSON.stringify(obj));
      },
      end: function(text) {
        res.writeHead(this.statusCode, this.headers);
        res.end(text);
      }
    };

    Promise.resolve(apiHandler({ method: req.method, body: body, headers: req.headers }, vercelRes))
      .catch(function(err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
      });
  });
}

function serveStatic(req, res, pathname) {
  const staticRoot = path.join(root, 'public');
  let file = pathname === '/' ? '/index.html' : pathname;
  file = path.normalize(path.join(staticRoot, file.replace(/^\//, '')));
  if (!file.startsWith(staticRoot)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }
  fs.readFile(file, function(err, data) {
    if (err) {
      res.writeHead(404);
      res.end('Not found');
      return;
    }
    const ext = path.extname(file);
    const types = { '.html': 'text/html; charset=utf-8', '.js': 'application/javascript', '.css': 'text/css' };
    res.writeHead(200, { 'Content-Type': types[ext] || 'text/plain' });
    res.end(data);
  });
}

http.createServer(function(req, res) {
  const pathname = new URL(req.url, 'http://127.0.0.1').pathname;
  if (pathname === '/api/generate' || pathname === '/api/generate/') {
    serveApi(req, res);
    return;
  }
  serveStatic(req, res, pathname);
}).listen(port, '127.0.0.1', function() {
  console.log('[dev-server] http://127.0.0.1:' + port);
  console.log('[dev-server] API health: http://127.0.0.1:' + port + '/api/generate');
});
