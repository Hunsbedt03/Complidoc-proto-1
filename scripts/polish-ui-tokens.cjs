const fs = require('fs');
const p = 'app/globals.css';
const s = fs.readFileSync(p, 'utf8');
const paperStart = s.indexOf('.doc-paper{');
const afterPaperEnd = s.indexOf('.project-attachments-title{', paperStart);
if (paperStart < 0 || afterPaperEnd < 0) {
  console.error('markers not found', { paperStart, afterPaperEnd });
  process.exit(1);
}

function polish(chunk) {
  return chunk
    .replace(/font-weight:600/g, 'font-weight:500')
    .replace(/font-weight:700/g, 'font-weight:500')
    .replace(/color:#f87171/gi, 'color:var(--text-danger)')
    .replace(/color:#FECACA/g, 'color:var(--text-danger)')
    .replace(/color:#f59e0b/gi, 'color:var(--text-warning)')
    .replace(/color:#fbbf24/gi, 'color:var(--text-warning)')
    .replace(/background:#1F2937/g, 'background:var(--surface-0)')
    .replace(/background:#2A3A50/g, 'background:var(--surface-2)')
    .replace(
      /\.profile-completeness-pct\{font-size:18px;color:var\(--text-accent\);font-weight:500;\}/,
      '.profile-completeness-pct{font-size:18px;color:var(--text-primary);font-weight:500;}'
    )
    .replace(
      /\.doc-badge-upload\{background:rgba\(245,158,11,0\.15\);color:var\(--text-warning\);border:1px solid rgba\(245,158,11,0\.3\);\}/,
      '.doc-badge-upload{background:var(--bg-warning);color:var(--text-warning);border:1px solid var(--border-warning);}'
    )
    .replace(
      /\.package-export-block\{font-size:12px;color:var\(--text-danger\);margin:0 0 12px;padding:8px 10px;background:rgba\(226,75,74,0\.08\);border-radius:6px;\}/,
      '.package-export-block{font-size:12px;color:var(--text-danger);margin:0 0 12px;padding:8px 10px;background:var(--bg-danger);border-radius:6px;}'
    )
    .replace(
      /\.billing-save-badge\{font-size:10px;padding:2px 6px;border-radius:4px;background:rgba\(97,153,34,0\.25\);color:var\(--text-success);\}/,
      '.billing-save-badge{font-size:10px;padding:2px 6px;border-radius:4px;background:var(--bg-success);color:var(--text-success);}'
    )
    .replace(
      /\.sub-banner--warning\{background:rgba\(239,159,39,0\.1\);border:0\.5px solid rgba\(239,159,39,0\.3\);color:var\(--text-warning);\}/,
      '.sub-banner--warning{background:var(--bg-warning);border:0.5px solid var(--border-warning);color:var(--text-warning);}'
    )
    .replace(
      /\.sub-banner--error\{background:rgba\(239,68,68,0\.1\);border:0\.5px solid rgba\(239,68,68,0\.3\);color:var\(--text-danger);\}/,
      '.sub-banner--error{background:var(--bg-danger);border:0.5px solid var(--border-danger);color:var(--text-danger);}'
    )
    .replace(
      /\.success-bar\{background:rgba\(59,109,17,0\.15\);border:0\.5px solid rgba\(97,153,34,0\.3\);/,
      '.success-bar{background:var(--bg-success);border:0.5px solid rgba(92,201,141,0.35);'
    )
    .replace(
      /\.upload-slot--ok\{border-style:solid;border-color:rgba\(97,153,34,0\.45\);background:rgba\(97,153,34,0\.06);\}/,
      '.upload-slot--ok{border-style:solid;border-color:rgba(92,201,141,0.45);background:var(--bg-success);}'
    )
    .replace(
      /\.upload-slot--warn\{border-color:rgba\(226,75,74,0\.5\);background:rgba\(226,75,74,0\.06);\}/,
      '.upload-slot--warn{border-color:var(--border-danger);background:var(--bg-danger);}'
    )
    .replace(
      /\.upload-slot--error\{border-color:rgba\(226,75,74,0\.55\);background:rgba\(226,75,74,0\.08);\}/,
      '.upload-slot--error{border-color:var(--border-danger);background:var(--bg-danger);}'
    )
    .replace(
      /\.upload-slot--archive\{border-color:rgba\(97,153,34,0\.35\);background:rgba\(97,153,34,0\.06);\}/,
      '.upload-slot--archive{border-color:rgba(92,201,141,0.35);background:var(--bg-success);}'
    )
    .replace(
      /\.upload-slot--archive-missing\{border-color:rgba\(245,158,11,0\.35\);background:rgba\(245,158,11,0\.05);\}/,
      '.upload-slot--archive-missing{border-color:var(--border-warning);background:var(--bg-warning);}'
    )
    .replace(
      /\.completeness-indicator--yellow\{background:rgba\(245,158,11,0\.08\);border-color:rgba\(245,158,11,0\.25);\}/,
      '.completeness-indicator--yellow{background:var(--bg-warning);border-color:var(--border-warning);}'
    )
    .replace(
      /\.completeness-indicator--green\{background:rgba\(97,153,34,0\.08\);border-color:rgba\(97,153,34,0\.3);\}/,
      '.completeness-indicator--green{background:var(--bg-success);border-color:rgba(92,201,141,0.35);}'
    )
    .replace(
      /\.completeness-indicator--yellow \.completeness-indicator-fill\{background:#f59e0b;\}/,
      '.completeness-indicator--yellow .completeness-indicator-fill{background:var(--text-warning);}'
    )
    .replace(/height:1px;background:rgba\(255,255,255,0\.07\)/g, 'height:1px;background:var(--border)')
    .replace(/height:0\.5px;background:rgba\(255,255,255,0\.07\)/g, 'height:0.5px;background:var(--border)')
    .replace(/border:1px dashed rgba\(255,255,255,0\.12\)/g, 'border:1px dashed var(--border)')
    .replace(/border:1px dashed rgba\(255,255,255,0\.08\)/g, 'border:1px dashed var(--border)')
    .replace(/border:2px dashed rgba\(255,255,255,0\.12\)/g, 'border:2px dashed var(--border)')
    .replace(/border-color:rgba\(255,255,255,0\.1\)/g, 'border-color:var(--border)')
    .replace(/background:rgba\(255,255,255,0\.0[2-6]\)/g, 'background:var(--surface-2)');
}

const out =
  polish(s.slice(0, paperStart)) +
  s.slice(paperStart, afterPaperEnd) +
  polish(s.slice(afterPaperEnd));

fs.writeFileSync(p, out);
const final = fs.readFileSync(p, 'utf8');
console.log({
  fw600: (final.match(/font-weight:600/g) || []).length,
  fw700ui: (final.slice(0, final.indexOf('.doc-paper{')).match(/font-weight:700/g) || []).length,
  f87171: final.includes('#f87171'),
  profile: (final.match(/\.profile-completeness-pct\{[^}]+\}/) || [])[0],
});
