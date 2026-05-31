const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const https = require('https');

const root = path.join(__dirname, '..');
process.chdir(root);

function download(url, dest) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    https.get(url, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        file.close();
        fs.unlinkSync(dest);
        return download(res.headers.location, dest).then(resolve, reject);
      }
      if (res.statusCode !== 200) {
        reject(new Error('HTTP ' + res.statusCode + ' for ' + url));
        return;
      }
      res.pipe(file);
      file.on('finish', () => file.close(resolve));
    }).on('error', reject);
  });
}

async function npmPack(name, version) {
  const base = name.startsWith('@') ? name.split('/')[1] : name;
  const tgz = path.join(root, base + '.tgz');
  const url = name.startsWith('@')
    ? `https://registry.npmjs.org/${name}/-/${base}-${version}.tgz`
    : `https://registry.npmjs.org/${name}/-/${name}-${version}.tgz`;
  await download(url, tgz);
  execFileSync('tar', ['-xf', tgz, '-C', root], { stdio: 'inherit' });
  const extracted = path.join(root, 'package');
  const dest = path.join(root, 'node_modules', name);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  if (fs.existsSync(dest)) fs.rmSync(dest, { recursive: true, force: true });
  fs.renameSync(extracted, dest);
  fs.unlinkSync(tgz);
}

(async () => {
  fs.mkdirSync(path.join(root, 'node_modules'), { recursive: true });
  console.log('[local-install] docx...');
  await npmPack('docx', '9.0.2');
  console.log('[local-install] jszip...');
  await npmPack('jszip', '3.10.1');
  console.log('[local-install] esbuild...');
  await npmPack('esbuild', '0.25.0');
  console.log('[local-install] @esbuild/win32-x64...');
  await npmPack('@esbuild/win32-x64', '0.25.0');
  require(path.join(root, 'node_modules', 'esbuild', 'install.js'));
  console.log('[local-install] running build-api...');
  require('./build-api.js');
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
