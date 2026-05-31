// ─── ERSTATNING FOR SCRIPT-BLOKKEN I index.html ──────────────────────────
// Kopier dette inn i <script>-taggen, erstatter alt fra
// "let generatedDocs = {};" til og med "function downloadAll(){...}"
// Behold showLanding(), showApp(), showPanel() uendret over denne blokken.

let zipData = null;      // { zip: base64string, filename: string }

async function generateDocs() {
  const maskintype = document.getElementById('f-maskintype').value;
  const prosjekt   = document.getElementById('f-prosjekt').value   || 'Ukjent lokasjon';
  const serienr    = document.getElementById('f-serienr').value    || 'N/A';
  const kunde      = document.getElementById('f-kunde').value      || 'Ukjent kunde';
  const produsent  = document.getElementById('f-produsent').value  || 'Ukjent produsent';
  const ingenior   = document.getElementById('f-ingenior').value   || 'Ansvarlig ingeniør';
  const driv       = document.getElementById('f-driv').value;
  const spenning   = document.getElementById('f-spenning').value;
  const miljo      = document.getElementById('f-miljo').value;
  const transport  = document.getElementById('f-transport').value;
  const styring    = document.getElementById('f-styring').value;
  const beskrivelse= document.getElementById('f-beskrivelse').value || 'Ikke spesifisert';

  const loading     = document.getElementById('loading');
  const loadingText = document.getElementById('loading-text');
  loading.classList.add('active');

  const messages = [
    'Analyserer maskintype og direktiver...',
    'Genererer risikovurdering...',
    'Utarbeider teknisk fil og samsvarserklæring...',
    'Bygger .docx-filer og pakker ZIP...'
  ];
  let mi = 0;
  const interval = setInterval(() => {
    if (mi < messages.length) { loadingText.textContent = messages[mi]; mi++; }
  }, 5000);

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
    const response = await fetch('/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ machineData })
    });
    const data = await response.json();
    clearInterval(interval);
    loading.classList.remove('active');

    if (data.error) { alert('Feil: ' + data.error); return; }

    // Lagre ZIP-data for nedlasting
    zipData = { zip: data.zip, filename: data.filename };

    document.getElementById('output-title').textContent =
      `Dokumentpakke generert — ${maskintype} · ${prosjekt}`;
    showPanel('output');

  } catch (err) {
    clearInterval(interval);
    loading.classList.remove('active');
    alert('Noe gikk galt. Sjekk konsollen for detaljer.');
    console.error(err);
  }
}

// Last ned én enkelt .docx fra ZIP (ikke nødvendig med server-round-trip —
// vi bruker JSZip i nettleseren til å pakke ut én fil fra base64 ZIP-en)
async function downloadDoc(type) {
  if (!zipData) { alert('Ingen dokumentpakke tilgjengelig. Generer først.'); return; }

  // Last JSZip dynamisk fra CDN hvis ikke tilgjengelig
  if (typeof JSZip === 'undefined') {
    await loadScript('https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js');
  }

  const zip = await JSZip.loadAsync(zipData.zip, { base64: true });
  const names = {
    risk: '01_Risikovurdering',
    tech: '02_Teknisk_Fil',
    doc:  '03_Samsvarserklaring',
    qc:   '04_QC_Sjekkliste'
  };

  // Finn filen i ZIP (den ligger i en undermappe)
  const targetPrefix = names[type];
  let targetFile = null;
  zip.forEach((relativePath, file) => {
    if (relativePath.includes(targetPrefix) && !file.dir) {
      targetFile = file;
    }
  });

  if (!targetFile) { alert('Fant ikke ' + names[type] + ' i pakken.'); return; }

  const blob = await targetFile.async('blob');
  const url  = URL.createObjectURL(new Blob([blob], {
    type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  }));
  const a = document.createElement('a');
  a.href = url;
  a.download = targetFile.name.split('/').pop(); // bare filnavnet, ikke mappe
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// Last ned hele pakken som én .zip
function downloadAll() {
  if (!zipData) { alert('Ingen dokumentpakke tilgjengelig. Generer først.'); return; }

  const bytes    = atob(zipData.zip);
  const byteArr  = new Uint8Array(bytes.length);
  for (let i = 0; i < bytes.length; i++) byteArr[i] = bytes.charCodeAt(i);

  const blob = new Blob([byteArr], { type: 'application/zip' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = zipData.filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// Hjelpefunksjon: last inn ekstern script dynamisk
function loadScript(src) {
  return new Promise((resolve, reject) => {
    const s  = document.createElement('script');
    s.src    = src;
    s.onload = resolve;
    s.onerror = reject;
    document.head.appendChild(s);
  });
}
