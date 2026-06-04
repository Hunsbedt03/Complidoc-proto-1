import { execSync } from 'child_process';
import { existsSync, readdirSync, rmSync } from 'fs';
import path from 'path';

const PORTS = [3000, 3001, 3002, 3003];

function killPortWindows(port) {
  try {
    const out = execSync(`netstat -ano -p tcp | findstr ":${port} "`, {
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'ignore'],
    });
    const pids = new Set();
    for (const line of out.split('\n')) {
      if (!line.includes('LISTENING')) continue;
      const pid = line.trim().split(/\s+/).at(-1);
      if (pid && /^\d+$/.test(pid) && pid !== '0') pids.add(pid);
    }
    for (const pid of pids) {
      try {
        execSync(`taskkill /PID ${pid} /F`, { stdio: 'ignore' });
        console.log(`[samsiq] Stopped process ${pid} (port ${port})`);
      } catch {
        /* already gone */
      }
    }
  } catch {
    /* port free */
  }
}

if (process.platform === 'win32') {
  for (const port of PORTS) killPortWindows(port);
} else {
  console.log('[samsiq] Stop other "next dev" processes manually before starting dev.');
}

const nextDir = path.join(process.cwd(), '.next');
const middlewareManifest = path.join(nextDir, 'server', 'middleware-manifest.json');
const routesManifest = path.join(nextDir, 'routes-manifest.json');
const devCssDir = path.join(nextDir, 'static', 'css');

function devCssMissing() {
  if (!existsSync(devCssDir)) return true;
  try {
    return !readdirSync(devCssDir).some((f) => f.endsWith('.css'));
  } catch {
    return true;
  }
}

const forceClean = process.env.SAMSIQ_DEV_CLEAN === '1';
const corrupt =
  existsSync(nextDir) &&
  (!existsSync(middlewareManifest) || !existsSync(routesManifest) || devCssMissing());

if (existsSync(nextDir) && (forceClean || corrupt)) {
  rmSync(nextDir, { recursive: true, force: true });
  console.log('[samsiq] Removed .next (corrupt cache / missing CSS / forced clean)');
} else if (corrupt) {
  console.log('[samsiq] .next looks corrupt — set SAMSIQ_DEV_CLEAN=1 to reset');
}

console.log('[samsiq] Dev clean complete. Start one server: npm run dev');
