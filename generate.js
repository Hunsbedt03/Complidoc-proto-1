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
        system: 'Du er en ekspert på teknisk dokumentasjon og CE-merking. Svar KUN med et JSON-objekt. Ingen markdown, ingen forklaring. Bare ren JSON som starter med { og slutter med }.',
        messages: [{ role: 'user', content: prompt }]
      })
    });

    const data = await response.json();
    if (!response.ok) return res.status(500).json({ error: data.error?.message || 'API-feil' });

    const text = data.content[0].text.trim();
    const start = text.indexOf('{');
    const end = text.lastIndexOf('}');
    if (start === -1 || end === -1) return res.status(500).json({ error: 'Ingen JSON i svar' });

    const parsed = JSON.parse(text.substring(start, end + 1));

    if (docType && parsed[docType]) {
      const content = parsed[docType];
      const names = { risk: 'Risikovurdering', tech: 'Teknisk_Fil', doc: 'Samsvarserklaring', qc: 'QC_Sjekkliste' };
      const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
        body{font-family:Arial,sans-serif;margin:40px;font-size:12pt;line-height:1.5;}
        h1{font-size:18pt;border-bottom:2px solid #000;padding-bottom:8px;}
        h2{font-size:14pt;margin-top:20px;}
        table{width:100%;border-collapse:collapse;margin:10px 0;}
        td,th{border:1px solid #000;padding:6px 8px;font-size:11pt;}
        th{background:#f0f0f0;font-weight:bold;}
        .header{text-align:center;margin-bottom:30px;}
      </style></head><body>${content.replace(/\n/g,'<br>')}</body></html>`;
      res.setHeader('Content-Type', 'application/msword');
      res.setHeader('Content-Disposition', `attachment; filename="Complidoc_${names[docType] || docType}.doc"`);
      return res.send(html);
    }

    return res.status(200).json(parsed);

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
