const fs = require('fs');
const path = 'app/globals.css';
let css = fs.readFileSync(path, 'utf8');

// Fix remaining old blue rgba
css = css.replace(/rgba\(26,\s*111,\s*212,\s*0\.(0[8-9]|1[0-5]|2[0-5])\)/g, 'var(--bg-accent)');
css = css.replace(/rgba\(59,\s*130,\s*246,\s*0\.(15|2|3)\)/g, 'var(--bg-accent)');
css = css.replace(/border-color:rgba\(26,\s*111,\s*212,\s*0\.\d+\)/g, 'border-color:var(--border-strong)');

// Patch structural blocks via targeted string replacements
const patches = [
  [
    'nav{display:flex;align-items:center;justify-content:space-between;padding:20px 40px;border-bottom:0.5px solid var(--border);position:sticky;top:0;background:var(--surface-0);z-index:100;}',
    'nav{display:flex;align-items:center;justify-content:space-between;padding:16px 24px;border-bottom:0.5px solid var(--border);position:sticky;top:0;background:var(--surface-1);z-index:100;}',
  ],
  [
    '.logo-name{font-size:16px;font-weight:600;letter-spacing:-0.4px;}',
    '.logo-name{font-size:16px;font-weight:500;letter-spacing:-0.4px;color:var(--text-primary);}',
  ],
  [
    '.nav-cta{background:var(--accent);color:white;border:none;padding:8px 18px;border-radius:8px;font-size:13px;font-weight:500;cursor:pointer;transition:background 0.15s;}',
    '.nav-cta{background:var(--accent);color:#fff;border:none;padding:9px 16px;border-radius:var(--radius-sm);font-size:14px;font-weight:500;cursor:pointer;transition:background 0.15s;}',
  ],
  [
    '.hero{padding:80px 40px 60px;max-width:780px;margin:0 auto;text-align:center;}',
    '.hero{padding:80px 40px 60px;max-width:780px;margin:0 auto;text-align:center;position:relative;}.hero::before{content:\'\';position:absolute;inset:0;left:50%;transform:translateX(-50%);width:min(900px,100%);background:radial-gradient(ellipse at 50% 0%,rgba(59,130,246,0.08),transparent 65%);pointer-events:none;z-index:0;}.hero>*{position:relative;z-index:1;}',
  ],
  [
    '.hero-badge{display:inline-flex;align-items:center;gap:6px;background:var(--bg-accent);border:0.5px solid rgba(26,111,212,0.4);border-radius:20px;padding:5px 14px;font-size:12px;color:var(--text-accent);margin-bottom:28px;}',
    '.hero-badge{display:inline-flex;align-items:center;gap:6px;background:var(--bg-accent);border:0.5px solid var(--border);border-radius:var(--radius-pill);padding:5px 14px;font-size:12px;color:var(--text-secondary);margin-bottom:28px;}',
  ],
  [
    'h1{font-size:46px;font-weight:600;line-height:1.15;letter-spacing:-1.2px;color:var(--text-primary);margin-bottom:20px;}',
    'h1{font-size:46px;font-weight:500;line-height:1.15;letter-spacing:-1.2px;color:var(--text-primary);margin-bottom:20px;}',
  ],
  [
    'h1 span{color:var(--accent);}',
    'h1 span{color:var(--text-primary);}',
  ],
  [
    '.btn-ghost{background:transparent;color:var(--text-secondary);border:0.5px solid var(--border);padding:13px 24px;border-radius:8px;font-size:14px;cursor:pointer;transition:all 0.15s;}',
    '.btn-ghost{background:transparent;color:var(--text-secondary);border:0.5px solid var(--border-strong);padding:13px 24px;border-radius:var(--radius-sm);font-size:14px;font-weight:400;cursor:pointer;transition:all 0.15s;}',
  ],
  [
    '.btn-ghost:hover{border-color:rgba(255,255,255,0.35);color:var(--text-primary);}',
    '.btn-ghost:hover{background:var(--surface-2);border-color:var(--border-strong);color:var(--text-primary);}',
  ],
  [
    '.eyebrow{font-size:11px;font-weight:600;color:var(--accent);text-transform:uppercase;letter-spacing:0.8px;margin-bottom:12px;}',
    '.eyebrow{font-size:12px;font-weight:400;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.04em;margin-bottom:12px;}',
  ],
  [
    'h2{font-size:30px;font-weight:600;letter-spacing:-0.6px;color:var(--text-primary);margin-bottom:14px;line-height:1.25;}',
    'h2{font-size:30px;font-weight:500;letter-spacing:-0.6px;color:var(--text-primary);margin-bottom:14px;line-height:1.25;}',
  ],
  [
    '.divider{height:0.5px;background:rgba(255,255,255,0.06);margin:0 40px;}',
    '.divider{height:0.5px;background:var(--border);margin:0 40px;}',
  ],
  [
    '.flow-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:1px;background:rgba(255,255,255,0.07);border-radius:12px;overflow:hidden;margin-top:40px;}',
    '.flow-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-top:40px;}',
  ],
  [
    '.flow-step{background:var(--surface-1);padding:24px 20px;}',
    '.flow-step{background:var(--surface-1);padding:24px 20px;border-radius:var(--radius-md);border:0.5px solid var(--border);}',
  ],
  [
    '.flow-num{font-size:11px;font-weight:600;color:var(--accent);margin-bottom:12px;}',
    '.flow-num{font-size:12px;font-weight:500;color:var(--text-muted);margin-bottom:12px;letter-spacing:0.04em;}',
  ],
  [
    '.features-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:1px;background:rgba(255,255,255,0.07);border-radius:12px;overflow:hidden;margin-top:40px;}',
    '.features-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-top:40px;}',
  ],
  [
    '.feature{background:var(--surface-1);padding:24px 20px;}',
    '.feature{background:var(--surface-1);padding:24px 20px;border-radius:var(--radius-md);border:0.5px solid var(--border);}',
  ],
  [
    '.feature-icon{width:32px;height:32px;border-radius:8px;display:flex;align-items:center;justify-content:center;margin-bottom:14px;}',
    '.feature-icon{width:32px;height:32px;border-radius:8px;display:flex;align-items:center;justify-content:center;margin-bottom:14px;background:var(--bg-accent);color:var(--text-accent);}',
  ],
  // App shell
  [
    '.app-nav-item{display:flex;align-items:center;gap:8px;padding:8px 10px;border-radius:6px;font-size:13px;color:var(--text-muted);margin-bottom:2px;cursor:pointer;transition:all 0.15s;}',
    '.app-nav-item{display:flex;align-items:center;gap:8px;padding:8px 10px;border-radius:var(--radius-sm);font-size:13px;color:var(--text-secondary);margin-bottom:2px;cursor:pointer;transition:all 0.15s;}',
  ],
  [
    '.app-nav-item:hover{background:rgba(255,255,255,0.05);color:var(--text-primary);}',
    '.app-nav-item:hover{background:var(--surface-2);color:var(--text-primary);}',
  ],
  [
    '.app-nav-item.active{background:var(--bg-accent);color:var(--text-accent);}',
    '.app-nav-item.active{background:var(--bg-accent);color:var(--text-accent);font-weight:500;}',
  ],
  [
    '.app-topbar{padding:16px 24px;background:var(--surface-1);border-bottom:0.5px solid var(--border);display:flex;align-items:center;justify-content:space-between;}',
    '.app-topbar{padding:16px 24px;background:var(--surface-1);border-bottom:0.5px solid var(--border);display:flex;align-items:center;justify-content:space-between;}',
  ],
  [
    '.app-content{flex:1;overflow-y:auto;padding:24px;}',
    '.app-content{flex:1;overflow-y:auto;padding:var(--space-4);background:var(--surface-0);}',
  ],
  // Dashboard
  [
    '.stat-card{background:var(--surface-1);border-radius:8px;padding:14px 16px;}',
    '.stat-card{background:var(--surface-1);border-radius:var(--radius-md);padding:var(--space-3);}',
  ],
  [
    '.stat-label{font-size:11px;color:var(--text-muted);margin-bottom:6px;}',
    '.stat-label{font-size:13px;color:var(--text-muted);margin-bottom:8px;}',
  ],
  [
    '.stat-val{font-size:22px;font-weight:600;color:var(--text-primary);}',
    '.stat-val{font-size:26px;font-weight:500;color:var(--text-primary);}',
  ],
  [
    '.stat-sub{font-size:11px;color:var(--text-muted);margin-top:2px;}',
    '.stat-sub{font-size:12px;color:var(--text-muted);margin-top:4px;}',
  ],
  [
    '.proj-card{background:var(--surface-1);border:0.5px solid var(--border);border-radius:8px;padding:14px 16px;display:flex;align-items:center;gap:12px;cursor:pointer;transition:border-color 0.15s;width:100%;text-align:left;color:inherit;font:inherit;}',
    '.proj-card{background:var(--surface-1);border:0.5px solid var(--border);border-radius:var(--radius-md);padding:14px 16px;display:flex;align-items:center;gap:12px;cursor:pointer;transition:background 0.15s,border-color 0.15s;width:100%;text-align:left;color:inherit;font:inherit;}',
  ],
  [
    '.proj-card:hover{border-color:rgba(26,111,212,0.4);}',
    '.proj-card:hover{background:var(--surface-2);border-color:var(--border-strong);}',
  ],
  [
    '.proj-icon{width:34px;height:34px;border-radius:6px;background:var(--bg-accent);display:flex;align-items:center;justify-content:center;flex-shrink:0;}',
    '.proj-icon{width:38px;height:38px;border-radius:8px;background:var(--bg-accent);color:var(--text-accent);display:flex;align-items:center;justify-content:center;flex-shrink:0;}',
  ],
  [
    '.proj-name{font-size:13px;font-weight:500;color:var(--text-primary);}',
    '.proj-name{font-size:13px;font-weight:500;color:var(--text-primary);}',
  ],
  [
    '.badge{font-size:11px;padding:3px 10px;border-radius:12px;font-weight:500;margin-left:auto;flex-shrink:0;}',
    '.badge{font-size:12px;padding:5px 11px;border-radius:var(--radius-pill);font-weight:500;margin-left:auto;flex-shrink:0;}',
  ],
  [
    '.badge-done{background:rgba(59,109,17,0.2);color:var(--text-success);}',
    '.badge-done{background:var(--bg-success);color:var(--text-success);}',
  ],
  [
    '.badge-prog{background:rgba(133,79,11,0.2);color:var(--text-warning);}',
    '.badge-prog{background:var(--bg-warning);color:var(--text-warning);}',
  ],
  [
    '.badge-draft{background:rgba(107,114,128,0.2);color:var(--text-secondary);border:0.5px solid rgba(107,114,128,0.35);}',
    '.badge-draft{background:var(--surface-2);color:var(--text-muted);border:0.5px solid var(--border);}',
  ],
  [
    '.badge-new{background:var(--bg-accent);color:var(--text-accent);}',
    '.badge-new{background:var(--bg-accent);color:var(--text-accent);}',
  ],
  [
    '.section-label{font-size:10px;font-weight:600;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.6px;margin-bottom:10px;}',
    '.section-label{font-size:12px;font-weight:400;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.04em;margin-bottom:10px;}',
  ],
  // Buttons
  [
    '.btn-cancel{background:transparent;border:0.5px solid var(--border);color:var(--text-muted);padding:8px 16px;border-radius:6px;font-size:13px;cursor:pointer;margin-right:8px;}',
    '.btn-cancel{background:transparent;border:0.5px solid var(--border-strong);color:var(--text-secondary);padding:9px 16px;border-radius:var(--radius-sm);font-size:14px;font-weight:400;cursor:pointer;margin-right:8px;}',
  ],
  [
    '.btn-generate{background:var(--accent);color:white;border:none;padding:8px 20px;border-radius:6px;font-size:13px;font-weight:500;cursor:pointer;transition:background 0.15s;}',
    '.btn-generate{background:var(--accent);color:#fff;border:none;padding:9px 16px;border-radius:var(--radius-sm);font-size:14px;font-weight:500;cursor:pointer;transition:background 0.15s;}',
  ],
  [
    '.btn-dl{font-size:12px;padding:6px 12px;background:var(--bg-accent);color:var(--text-accent);border:none;border-radius:6px;cursor:pointer;font-weight:500;}',
    '.btn-dl{font-size:12px;padding:6px 12px;background:transparent;color:var(--text-secondary);border:0.5px solid var(--border-strong);border-radius:var(--radius-sm);cursor:pointer;font-weight:400;}',
  ],
  [
    '.btn-dl:hover{background:var(--bg-accent);}',
    '.btn-dl:hover{background:var(--surface-2);color:var(--text-primary);}',
  ],
  [
    '.btn-zip{background:var(--accent);color:white;border:none;padding:10px 20px;border-radius:8px;font-size:13px;font-weight:500;cursor:pointer;}',
    '.btn-zip{background:var(--accent);color:#fff;border:none;padding:9px 16px;border-radius:var(--radius-sm);font-size:14px;font-weight:500;cursor:pointer;}',
  ],
  [
    '.btn-new{background:transparent;border:0.5px solid var(--border);color:var(--text-secondary);padding:10px 16px;border-radius:8px;font-size:13px;cursor:pointer;}',
    '.btn-new{background:transparent;border:0.5px solid var(--border-strong);color:var(--text-secondary);padding:9px 16px;border-radius:var(--radius-sm);font-size:14px;font-weight:400;cursor:pointer;}',
  ],
  [
    '.form-card{background:var(--surface-1);border:0.5px solid var(--border);border-radius:10px;padding:20px;margin-bottom:16px;}',
    '.form-card{background:var(--surface-1);border:0.5px solid var(--border);border-radius:var(--radius-md);padding:var(--space-3);margin-bottom:var(--space-3);}',
  ],
  [
    '.doc-card{background:var(--surface-1);border:0.5px solid var(--border);border-radius:10px;padding:16px;display:flex;flex-direction:column;gap:10px;}',
    '.doc-card{background:var(--surface-1);border:0.5px solid var(--border);border-radius:var(--radius-md);padding:var(--space-3);display:flex;flex-direction:column;gap:10px;}',
  ],
  [
    '.price-amount{font-size:32px;font-weight:600;color:var(--text-primary);letter-spacing:-0.8px;}',
    '.price-amount{font-size:32px;font-weight:500;color:var(--text-primary);letter-spacing:-0.8px;}',
  ],
  [
    '.cta-title{font-size:28px;font-weight:600;color:var(--text-primary);letter-spacing:-0.6px;margin-bottom:12px;}',
    '.cta-title{font-size:28px;font-weight:500;color:var(--text-primary);letter-spacing:-0.6px;margin-bottom:12px;}',
  ],
];

let applied = 0;
let missed = [];
for (const [from, to] of patches) {
  if (css.includes(from)) {
    css = css.split(from).join(to);
    applied++;
  } else {
    missed.push(from.slice(0, 60));
  }
}

// badge-review → warning/info semantics
css = css.replace(
  /\.badge-review\{[^}]+\}/,
  '.badge-review{background:var(--bg-warning);color:var(--text-warning);}'
);

// Warning banners
css = css.replace(
  /\.archive-warning[^{]*\{[^}]*background:[^;]+;[^}]*\}/g,
  (m) => m
);

fs.writeFileSync(path, css);
console.log('applied', applied, 'missed', missed.length);
if (missed.length) console.log(missed.slice(0, 15).join('\n'));
