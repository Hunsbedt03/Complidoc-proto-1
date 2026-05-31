const esbuild = require('esbuild');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const entry = path.join(root, 'api', 'generate.source.js');
const outdir = path.join(root, 'api', 'generate');
const outfile = path.join(outdir, 'index.js');
const legacyFile = path.join(root, 'api', 'generate.js');
const publicIndex = path.join(root, 'public', 'index.html');

if (!fs.existsSync(entry)) {
  console.error('[build-api] missing:', entry);
  process.exit(1);
}

if (!fs.existsSync(publicIndex)) {
  console.error('[build-api] FATAL: public/index.html missing — include it in your deploy');
  process.exit(1);
}

fs.mkdirSync(outdir, { recursive: true });

esbuild.buildSync({
  entryPoints: [entry],
  outfile,
  bundle: true,
  platform: 'node',
  target: 'node20',
  format: 'cjs',
  logLevel: 'info',
  external: ['jszip']
});

if (fs.existsSync(legacyFile)) {
  fs.unlinkSync(legacyFile);
  console.log('[build-api] removed legacy api/generate.js');
}

const sizeKb = Math.round(fs.statSync(outfile).size / 1024);
console.log('[build-api] bundled api/generate/index.js (' + sizeKb + ' KB)');
console.log('[build-api] static output public/index.html (' + fs.statSync(publicIndex).size + ' bytes)');

if (sizeKb < 200) {
  console.error('[build-api] bundle too small — docx may be missing');
  process.exit(1);
}

// #region agent log
try {
  fs.appendFileSync(
    path.join(root, 'debug-8fd491.log'),
    JSON.stringify({
      sessionId: '8fd491',
      location: 'scripts/build-api.js',
      message: 'build complete',
      data: {
        hypothesisId: 'DEP-J',
        publicExists: fs.existsSync(publicIndex),
        publicBytes: fs.statSync(publicIndex).size,
        apiSizeKb: sizeKb
      },
      timestamp: Date.now(),
      runId: 'post-fix-committed-public'
    }) + '\n'
  );
} catch (_) {}
// #endregion
