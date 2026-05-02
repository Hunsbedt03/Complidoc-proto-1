export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { prompt } = req.body;
  if (!prompt) return res.status(400).json({ error: 'Mangler prompt' });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'API-nøkkel ikke konfigurert' });

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
        system: 'Du er en ekspert på teknisk dokumentasjon og CE-merking. Svar KUN med et JSON-objekt som starter med { og slutter med }. Ingen markdown, ingen forklaring.',
        messages: [{ role: 'user', content: prompt }]
      })
    });

    const data = await response.json();
    if (!response.ok) return res.status(500).json({ error: data.error?.message || 'API-feil' });

    const text = data.content[0].text.trim();

    let parsed;
    try {
      const start = text.indexOf('{');
      const end = text.lastIndexOf('}');
      if (start === -1 || end === -1) throw new Error('Ingen JSON');
      parsed = JSON.parse(text.substring(start, end + 1));
    } catch (e) {
      parsed = {
        risk: text.substring(0, 3000) || 'Feil ved parsing',
        tech: 'Se risk-feltet for rådata fra AI',
        doc: '',
        qc: ''
      };
    }

    return res.status(200).json(parsed);

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
