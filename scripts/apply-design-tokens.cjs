const fs = require('fs');
const path = 'app/globals.css';
let css = fs.readFileSync(path, 'utf8');

const tokens = `:root {
  /* Surfaces — tre nivåer av mørke (aldri rent svart) */
  --surface-0: #0E1116;
  --surface-1: #161A22;
  --surface-2: #1E232D;

  /* Borders */
  --border: #252B36;
  --border-strong: #323A47;
  --border-warning: #4A3A15;
  --border-danger: #5A2A2A;

  /* Accent — kun handling / navigasjon */
  --accent: #3B82F6;
  --accent-hover: #2E6FD6;
  --bg-accent: #16233A;
  --text-accent: #7CB0F5;

  /* Text */
  --text-primary: #F2F4F8;
  --text-secondary: #A8B0BD;
  --text-muted: #6B7280;

  /* Status */
  --bg-success: #12271C;
  --text-success: #5CC98D;
  --bg-warning: #2A2210;
  --text-warning: #E0B341;
  --bg-danger: #2A1515;
  --text-danger: #E8756F;

  /* Spacing / radius */
  --space-1: 8px;
  --space-2: 12px;
  --space-3: 16px;
  --space-4: 24px;
  --radius-sm: 8px;
  --radius-md: 12px;
  --radius-pill: 20px;

  /* Bakoverkompatibilitet */
  --text1: var(--text-primary);
  --text2: var(--text-secondary);
  --text3: var(--text-muted);
  --surface2: var(--surface-2);
}

`;

if (!css.trimStart().startsWith(':root')) {
  css = tokens + css;
}

const pairs = [
  ['#0D0F12', 'var(--surface-0)'],
  ['#0F1217', 'var(--surface-1)'],
  ['#111318', 'var(--surface-1)'],
  ['#16191F', 'var(--surface-1)'],
  ['#1A6FD4', 'var(--accent)'],
  ['#1558A8', 'var(--accent-hover)'],
  ['#85B7EB', 'var(--text-accent)'],
  ['#7EB8FF', 'var(--text-accent)'],
  ['#F1F3F8', 'var(--text-primary)'],
  ['#E8EAF0', 'var(--text-primary)'],
  ['#D1D5DB', 'var(--text-primary)'],
  ['#9CA3AF', 'var(--text-secondary)'],
  ['#6B7280', 'var(--text-muted)'],
  ['#4B5563', 'var(--text-muted)'],
  ['#97C459', 'var(--text-success)'],
  ['#9FD66A', 'var(--text-success)'],
  ['#EF9F27', 'var(--text-warning)'],
  ['#F5C878', 'var(--text-warning)'],
  ['#FCD34D', 'var(--text-warning)'],
  ['#E24B4A', 'var(--text-danger)'],
  ['#FCA5A5', 'var(--text-danger)'],
  ['#60a5fa', 'var(--text-accent)'],
];

for (const [from, to] of pairs) {
  const re = new RegExp(from, 'gi');
  css = css.replace(re, to);
}

css = css.replace(
  /0\.5px solid rgba\(255,\s*255,\s*255,\s*0\.0[6-9]\)/g,
  '0.5px solid var(--border)'
);
css = css.replace(
  /0\.5px solid rgba\(255,\s*255,\s*255,\s*0\.1[0-5]?\)/g,
  '0.5px solid var(--border)'
);
css = css.replace(
  /1px solid rgba\(255,\s*255,\s*255,\s*0\.1[0-2]?\)/g,
  '1px solid var(--border)'
);

fs.writeFileSync(path, css);
console.log('OK', css.length);
