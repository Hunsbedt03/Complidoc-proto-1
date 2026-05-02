export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { prompt, docType } = req.body;
  if (!prompt) return res.status(400).json({ error: 'Mangler prompt' });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'Mangler API-nøkkel' });

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 8000,
        system: `Du er ekspert på CE-merking og teknisk dokumentasjon. 
Svar ALLTID med et rent JSON-objekt uten markdown-wrapper.
Eksempel på korrekt svar:
{"risk":"innhold her","tech":"innhold her","doc":"innhold her","qc":"innhold her"}
Aldri bruk backticks eller markdown. Bare start direkte med { tegnet.`,
        messages: [{ role: 'user', content: prompt }]
      })
    });

    const data = await response.json();
    if (!response.ok) return res.status(500).json({ error: data.error?.message || 'API-feil' });

    let text = data.content[0].text.trim();
    
    // Strip any markdown wrappers
    text = text.replace(/^```json\s*/i, '').replace(/^```\s*/, '').replace(/\s*```$/, '').trim();
    
    const start = text.indexOf('{');
    const end = text.lastIndexOf('}');
    if (start === -1 || end === -1) return res.status(500).json({ error: 'Ingen JSON i svar', raw: text.substring(0, 200) });

    const parsed = JSON.parse(text.substring(start, end + 1));

    if (docType && parsed[docType]) {
      const names = { risk: 'Risikovurdering', tech: 'Teknisk_Fil', doc: 'Samsvarserklaring', qc: 'QC_Sjekkliste' };
      const docContent = parsed[docType];
      const lines = docContent.split('\n');
      let body = '';
      for (const line of lines) {
        const t = line.trim();
        if (!t) continue;
        if (t.startsWith('# ')) body += `<h1>${t.slice(2)}</h1>`;
        else if (t.startsWith('## ')) body += `<h2>${t.slice(3)}</h2>`;
        else if (t.startsWith('### ')) body += `<h3>${t.slice(4)}</h3>`;
        else if (t.startsWith('| ')) {
          const cells = t.split('|').filter(c => c.trim() && !c.match(/^[-: ]+$/));
          if (cells.length) body += `<tr>${cells.map(c => `<td>${c.trim()}</td>`).join('')}</tr>`;
        }
        else if (t.startsWith('- ') || t.startsWith('* ')) body += `<li>${t.slice(2)}</li>`;
        else body += `<p>${t}</p>`;
      }
      const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${names[docType]}</title><style>@page{margin:2.5cm;}body{font-family:Arial,sans-serif;font-size:11pt;line-height:1.6;}h1{font-size:16pt;border-bottom:2px solid #000;padding-bottom:6px;}h2{font-size:13pt;margin-top:16px;}h3{font-size:11pt;}p{margin:4px 0;}li{margin:3px 0;}table{width:100%;border-collapse:collapse;margin:12px 0;}td{border:1px solid #000;padding:5px 8px;font-size:10pt;}tr:first-child td{background:#f0f0f0;font-weight:bold;}.hdr{text-align:center;border-bottom:3px solid #000;padding-bottom:16px;margin-bottom:24px;}</style></head><body><div class="hdr"><h1 style="border:none;font-size:20pt;">${names[docType]}</h1><p style="color:#444;font-size:10pt;">Complidoc &middot; ${new Date().toLocaleDateString('no-NO')}</p></div>${body}</body></html>`;
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="Complidoc_${names[docType]}.html"`);
      return res.send(html);
    }

    return res.status(200).json(parsed);

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
