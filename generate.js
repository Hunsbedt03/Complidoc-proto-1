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
        system: 'Du svarer KUN med ren JSON. Ingen forklaring. Ingen markdown. Bare JSON.',
        messages: [{ role: 'user', content: prompt }]
      })
    });

    const data = await response.json();
    if (!response.ok) return res.status(500).json({ error: data.error?.message || 'API-feil' });

    const text = data.content[0].text.trim();
    
    // Return raw text so we can see what AI actually says
    if (process.env.DEBUG_MODE === 'true') {
      return res.status(200).json({ debug: true, raw: text.substring(0, 1000) });
    }

    const start = text.indexOf('{');
    const end = text.lastIndexOf('}');
    
    if (start === -1 || end === -1) {
      return res.status(200).json({ 
        debug_raw: text.substring(0, 500),
        risk: text,
        tech: '',
        doc: '',
        qc: ''
      });
    }

    let parsed;
    try {
      parsed = JSON.parse(text.substring(start, end + 1));
    } catch(e) {
      return res.status(200).json({
        risk: text,
        tech: '',
        doc: '',
        qc: ''
      });
    }

    if (docType && parsed[docType]) {
      const names = { risk: 'Risikovurdering', tech: 'Teknisk_Fil', doc: 'Samsvarserklaring', qc: 'QC_Sjekkliste' };
      const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>body{font-family:Arial,sans-serif;margin:40px;font-size:12pt;line-height:1.6;}h1{font-size:16pt;border-bottom:2px solid #333;padding-bottom:6px;}h2{font-size:13pt;color:#333;}</style></head><body>${parsed[docType].replace(/\n/g,'<br>')}</body></html>`;
      res.setHeader('Content-Type', 'application/msword');
      res.setHeader('Content-Disposition', `attachment; filename="Complidoc_${names[docType]}.doc"`);
      return res.send(html);
    }

    return res.status(200).json(parsed);

  } catch (err) {
    return res.status(500).json({ error: err.message, stack: err.stack });
  }
}
