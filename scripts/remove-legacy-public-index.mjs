import fs from 'fs';
import path from 'path';

const legacy = path.join(process.cwd(), 'public', 'index.html');
if (fs.existsSync(legacy)) {
  fs.unlinkSync(legacy);
  console.log('[build] removed legacy public/index.html');
}
