import { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, HeadingLevel, AlignmentType, BorderStyle, WidthType } from 'docx';

function makeDoc(title, content) {
  const lines = content.split('\n').filter(l => l.trim());
  const children = [];

  children.push(new Paragraph({
    text: title,
    heading: HeadingLevel.TITLE,
    alignment: AlignmentType.CENTER,
    spacing: { after: 400 }
  }));

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    if (trimmed.startsWith('# ')) {
      children.push(new Paragraph({
        text: trimmed.replace(/^#+\s*/, ''),
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 300, after: 100 }
      }));
    } else if (trimmed.startsWith('## ')) {
      children.push(new Paragraph({
        text: trimmed.replace(/^#+\s*/, ''),
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 200, after: 100 }
      }));
    } else if (trimmed.startsWith('| ')) {
      const cells = trimmed.split('|').filter(c => c.trim() && !c.match(/^[-\s]+$/));
      if (cells.length > 0) {
        children.push(new TableRow({
          children: cells.map(cell => new TableCell({
            children: [new Paragraph({ text: cell.trim(), spacing: { before: 60, after: 60 } })],
            width: { size: Math.floor(9000 / cells.length), type: WidthType.DXA }
          }))
        }));
      }
    } else if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      children.push(new Paragraph({
        text: trimmed.replace(/^[-*]\s*/, ''),
        bullet: { level: 0 },
        spacing: { after: 60 }
      }));
    } else {
      children.push(new Paragraph({
        children: [new TextRun({ text: trimmed })],
        spacing: { after: 100 }
      }));
    }
  }

  return new Document({ sections: [{ children }] });
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { prompt, docType } = req.body;
  if (!prompt) return res.status(400).json({ error: 'Mangler prompt' });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'Mangler API-nøkkel' });

  const docTitles = {
    risk: 'Risikovurdering',
    tech: 'Teknisk Fil',
    doc: 'EF-Samsvarserklæring',
    qc: 'QC-Sjekkliste'
  };

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
        system: 'Du er en ekspert på teknisk dokumentasjon og CE-merking. Svar KUN med et JSON-objekt som starter med { og slutter med }. Ingen markdown-kodeblokker. Bare ren JSON.',
        messages: [{ role: 'user', content: prompt }]
      })
    });

    const data = await response.json();
    if (!response.ok) return res.status(500).json({ error: data.error?.message });

    const text = data.content[0].text.trim();
    const start = text.indexOf('{');
    const end = text.lastIndexOf('}');
    if (start === -1 || end === -1) return res.status(500).json({ error: 'Ingen JSON i svar' });

    const parsed = JSON.parse(text.substring(start, end + 1));

    if (docType && parsed[docType]) {
      const doc = makeDoc(docTitles[docType] || docType, parsed[docType]);
      const buffer = await Packer.toBuffer(doc);
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
      res.setHeader('Content-Disposition', `attachment; filename="${docTitles[docType]}.docx"`);
      return res.send(buffer);
    }

    return res.status(200).json(parsed);

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
