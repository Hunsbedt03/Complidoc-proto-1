import fs from 'fs';
import path from 'path';

const publicDir = path.join(process.cwd(), 'public');
const legacy = path.join(publicDir, 'index.html');

if (fs.existsSync(legacy)) {
  fs.unlinkSync(legacy);
  console.log('[build] removed legacy public/index.html');
}

if (fs.existsSync(publicDir) && fs.readdirSync(publicDir).length === 0) {
  fs.rmdirSync(publicDir);
  console.log('[build] removed empty public/ (legacy static output)');
}
