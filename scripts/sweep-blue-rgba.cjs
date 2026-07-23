const fs = require('fs');
let c = fs.readFileSync('app/globals.css', 'utf8');
c = c.replace(/rgba\(26,\s*111,\s*212,\s*0\.[0-9]+\)/g, 'var(--bg-accent)');
c = c.replace(
  '.app-nav-item.active{background:var(--bg-accent);color:var(--text-accent);}',
  '.app-nav-item.active{background:var(--bg-accent);color:var(--text-accent);font-weight:500;}'
);
c = c.replace(
  '.app-nav-item.active{background:var(--bg-accent);color:var(--text-accent);}',
  '.app-nav-item.active{background:var(--bg-accent);color:var(--text-accent);font-weight:500;}'
);
// Also if still old rgba form after first replace it becomes var(--bg-accent)
c = c.replace(
  '.archive-warning-banner{margin-bottom:16px;padding:12px 14px;background:rgba(245,158,11,0.08);border:0.5px solid rgba(245,158,11,0.3);border-radius:8px;}',
  '.archive-warning-banner{margin-bottom:16px;padding:12px 14px;background:var(--bg-warning);border:0.5px solid var(--border-warning);border-radius:var(--radius-md);}'
);
c = c.replace(
  '.archive-warning-title{font-size:13px;color:#f59e0b;margin:0 0 8px;}',
  '.archive-warning-title{font-size:13px;font-weight:500;color:var(--text-warning);margin:0 0 8px;}'
);
c = c.replace(
  '.cert-expiry-card{margin-bottom:16px;padding:16px 18px;background:rgba(245,158,11,0.1);border:0.5px solid rgba(245,158,11,0.45);border-radius:10px;}',
  '.cert-expiry-card{margin-bottom:16px;padding:16px 18px;background:var(--bg-warning);border:0.5px solid var(--border-warning);border-radius:var(--radius-md);}'
);
fs.writeFileSync('app/globals.css', c);
const left = (c.match(/rgba\(26,\s*111,\s*212/g) || []).length;
console.log('left blue rgba', left);
