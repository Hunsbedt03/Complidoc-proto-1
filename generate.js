async function generateSingleDoc(apiKey, docType, machineData) {
  const prompts = {
    risk: `Skriv en komplett profesjonell risikovurdering på norsk for følgende maskin:
${machineData}
Inkluder: dokumentinfo, omfang, risikomatrise (S/P/RPN), minst 8 risikoer i tabellformat, konklusjon og revisjonslogg.
Bruk EN ISO 12100:2010. Svar med kun dokumentteksten, ingen JSON.`,

    tech: `Skriv en komplett teknisk fil på norsk for følgende maskin:
${machineData}
Inkluder: produktidentifikasjon, produsent, teknisk beskrivelse, direktiver, harmoniserte standarder, tegningsliste.
Svar med kun dokumentteksten, ingen JSON.`,

    doc: `Skriv en komplett EF-samsvarserklæring på norsk og engelsk for følgende maskin:
${machineData}
Inkluder: produsent, produkt, direktiver (Maskindirektivet 2006/42/EC, LVD, EMC), standarder, signaturfeld.
Svar med kun dokumentteksten, ingen JSON.`,

    qc: `Skriv en komplett QC-sjekkliste på norsk og engelsk for følgende maskin:
${machineData}
Inkluder minst 25 kontrollpunkter fordelt på: Mekanisk, Hydraulikk, Elektrisk, Sikkerhet, Funksjon, Dokumentasjon.
Hvert punkt skal ha OK/N/A avkrysningsfelt.
Svar med kun dokumentteksten, ingen JSON.`
  };

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: 2000,
      messages: [{ role: 'user', content: prompts[docType] }]
    })
  });

  const data = await response.json();
  if (!response.ok) throw new Error(data.error?.message || 'API-feil');
  return data.content[0].text.trim();
}

function toHtml(title, content) {
  const lines = content.split('\n');
  let body = '';
  let inTable = false;

  for (const line of lines) {
    const t = line.trim();
    if (!t) { if (inTable) { body += '</table>'; inTable = false; } continue; }
    if (t.startsWith('# ')) body += `<h1>${t.slice(2)}</h1>`;
    else if (t.startsWith('## ')) body += `<h2>${t.slice(3)}</h2>`;
    else if (t.startsWith('### ')) body += `<h3>${t.slice(4)}</h3>`;
    else if (t.startsWith('| ')) {
      if (!inTable) { body += '<table>'; inTable = true; }
      const cells = t.split('|').filter(c => c.trim() && !c.match(/^[-: ]+$/));
      if (cells.length) body += `<tr>${cells.map(c => `<td>${c.trim()}</td>`).join('')}</tr>`;
    }
    else if (t.startsWith('- ') || t.startsWith('* ')) {
      if (inTable) { body += '</table>'; inTable = false; }
      body += `<li>${t.slice(2)}</li>`;
    }
    else if (t.match(/^\*\*(.+)\*\*$/)) body += `<h3>${t.replace(/\*\*/g,'')}</h3>`;
    else {
      if (inTable) { body += '</table>'; inTable = false; }
      body += `<p>${t}</p>`;
    }
  }
  if (inTable) body += '</table>';

  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${title}</title>
<style>
@page{margin:2.5cm;}
body{font-family:Arial,sans-serif;font-size:11pt;line-height:1.6;color:#000;}
h1{font-size:15pt;border-bottom:2px solid #000;padding-bottom:6px;margin-top:20px;}
h2{font-size:13pt;margin-top:16px;color:#222;}
h3{font-size:11pt;margin-top:12px;font-weight:bold;}
p{margin:4px 0;}
li{margin:3px 0;margin-left:20px;}
table{width:100%;border-collapse:collapse;margin:12px 0;font-size:10pt;}
td{border:1px solid #666;padding:5px 8px;vertical-align:top;}
tr:first-child td{background:#e8e8e8;font-weight:bold;}
.hdr{text-align:center;border-bottom:3px solid #000;padding-bottom:20px;margin-bottom:28px;}
</style>
</head><body>
<div class="hdr">
  <div style="font-size:22pt;font-weight:bold;margin-bottom:8px;">${title}</div>
  <div style="font-size:10pt;color:#555;">Complidoc &nbsp;&middot;&nbsp; ${new Date().toLocaleDateString('no-NO')}</div>
</div>
${body}
</body></html>`;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { machineData, docType } = req.body;
  if (!machineData) return res.status(400).json({ error: 'Mangler maskindata' });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'Mangler API-nøkkel' });

  const names = { risk: 'Risikovurdering', tech: 'Teknisk Fil', doc: 'Samsvarserklæring', qc: 'QC-Sjekkliste' };

  try {
    if (docType) {
      const content = await generateSingleDoc(apiKey, docType, machineData);
      const html = toHtml(names[docType], content);
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="Complidoc_${names[docType].replace(/ /g,'_')}.html"`);
      return res.send(html);
    }

    // Generate all four docs
    const results = {};
    for (const type of ['risk', 'tech', 'doc', 'qc']) {
      results[type] = await generateSingleDoc(apiKey, type, machineData);
    }
    return res.status(200).json(results);

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
