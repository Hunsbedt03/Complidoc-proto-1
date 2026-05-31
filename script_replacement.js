// ─── ERSTATTER HELE <script>...</script> BLOKKEN I index.html ───────────────
// Behold alt HTML/CSS uendret. Bare bytt ut script-innholdet med dette.

let zipData = null; // { zip: base64, filename: string }

function showLanding() {
  document.getElementById('landing-page').style.display = 'block';
  document.getElementById('app-page').style.display = 'none';
}
function showApp() {
  document.getElementById('landing-page').style.display = 'none';
  document.getElementById('app-page').style.display = 'block';
}
function showPanel(name) {
  document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
  document.getElementById('panel-' + name).classList.add('active');
  document.querySelectorAll('.app-nav-item').forEach(n => n.classList.remove('active'));
  if (name === 'dashboard') document.getElementById('nav-dashboard').classList.add('active');
  if (name === 'new')       document.getElementById('nav-new').classList.add('active');
  const titles = {
    dashboard: ['Oversikt',          'Foss Solutions · 2025'],
    new:       ['Nytt prosjekt',      'Fyll inn detaljer for å generere dokumentpakke'],
    output:    ['Dokumentpakke klar', 'Last ned og signer'],
  };
  if (titles[name]) {
    document.getElementById('app-title').textContent = titles[name][0];
    document.getElementById('app-sub').textContent   = titles[name][1];
  }
}

async function generateDocs() {
  const get = id => document.getElementById(id).value;
  const maskintype = get('f-maskintype');
  const prosjekt   = get('f-prosjekt')   || 'Ukjent lokasjon';
  const serienr    = get('f-serienr')    || 'N/A';
  const kunde      = get('f-kunde')      || 'Ukjent kunde';
  const produsent  = get('f-produsent')  || 'Ukjent produsent';
  const ingenior   = get('f-ingenior')   || 'Ansvarlig ingeniør';
  const driv       = get('f-driv');
  const spenning   = get('f-spenning');
  const miljo      = get('f-miljo');
  const transport  = get('f-transport');
  const styring    = get('f-styring');
  const beskrivelse= get('f-beskrivelse')|| 'Ikke spesifisert';

  const loading     = document.getElementById('loading');
  const loadingText = document.getElementById('loading-text');
  loading.classList.add('active');

  const steps = [
    'Analyserer maskintype og direktiver...',
    'Genererer risikovurdering (EN ISO 12100)...',
    'Utarbeider teknisk fil og samsvarserklæring...',
    'Bygger .docx-filer og pakker ZIP...',
  ];
  let si = 0;
  loadingText.textContent = steps[0];
  const interval = setInterval(() => {
    si = Math.min(si + 1, steps.length - 1);
    loadingText.textContent = steps[si];
  }, 6000);

  const machineData =
`Maskin: ${maskintype}
Produsent: ${produsent}
Serienummer: ${serienr}
Prosjekt/lokasjon: ${prosjekt}
Kunde: ${kunde}
Ansvarlig ingeniør: ${ingenior}
Drivsystem: ${driv}
Spenningsforsyning: ${spenning}
Installasjonsmiljø: ${miljo}
Transport: ${transport}
Styring: ${styring}
Beskrivelse: ${beskrivelse}`;

  try {
    const res  = await fetch('/api/generate', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ machineData }),
    });

    clearInterval(interval);
    loading.classList.remove('active');

    if (!res.ok) {
      const txt = await res.text();
      alert(`Server feil (${res.status}): ${txt.slice(0, 200)}`);
      return;
    }

    const data = await res.json();
    if (data.error) { alert('Feil: ' + data.error); return; }

    zipData = { zip: data.zip, filename: data.filename };

    document.getElementById('output-title').textContent =
      `Dokumentpakke generert — ${maskintype} · ${prosjekt}`;
    showPanel('output');

  } catch (err) {
    clearInterval(interval);
    loading.classList.remove('active');
    alert('Nettverksfeil: ' + err.message);
    console.error(err);
  }
}

// Last ned hele ZIP
function downloadAll() {
  if (!zipData) { alert('Generer en dokumentpakke først.'); return; }
  const bytes   = atob(zipData.zip);
  const arr     = new Uint8Array(bytes.length);
  for (let i = 0; i < bytes.length; i++) arr[i] = bytes.charCodeAt(i);
  triggerDownload(new Blob([arr], { type: 'application/zip' }), zipData.filename);
}

// Last ned én enkelt .docx — pakk ut fra ZIP i nettleseren
async function downloadDoc(type) {
  if (!zipData) { alert('Generer en dokumentpakke først.'); return; }

  // Last JSZip fra CDN én gang
  if (!window.JSZip) {
    await new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = 'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js';
      s.onload = resolve; s.onerror = reject;
      document.head.appendChild(s);
    });
  }

  const prefixes = { risk: '01_', tech: '02_', doc: '03_', qc: '04_' };
  const zip      = await JSZip.loadAsync(zipData.zip, { base64: true });

  let targetFile = null;
  zip.forEach((path, file) => {
    const prefixMap = { risk: '01_', tech: '02_', doc: '03_', qc: '04_' };
const p = prefixMap[prefix] || prefix;
if (!file.dir && path.includes(p)) target = file;
  });

  if (!targetFile) { alert('Fant ikke filen i pakken.'); return; }

  const blob = await targetFile.async('blob');
  triggerDownload(
    new Blob([blob], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' }),
    targetFile.name.split('/').pop()
  );
}

function triggerDownload(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a   = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click();
  document.body.removeChild(a); URL.revokeObjectURL(url);
}