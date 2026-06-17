import type {
  FmeaRow,
  FareregisterRow,
  SikkerhetsfunksjonRow,
  StructuredDocumentData,
} from '@/lib/document-model/types';

function extractJsonBlock(text: string): string | null {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced?.[1]) return fenced[1].trim();
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start >= 0 && end > start) return text.slice(start, end + 1);
  return null;
}

function asString(v: unknown, fallback = 'MANGLER'): string {
  if (v == null || v === '') return fallback;
  return String(v);
}

function asManglerNumber(v: unknown): number | string {
  if (typeof v === 'number' && !Number.isNaN(v)) return v;
  if (typeof v === 'string' && v.trim()) {
    const n = Number(v);
    if (!Number.isNaN(n)) return n;
    return v;
  }
  return 'MANGLER';
}

function parseFmeaRows(raw: unknown): FmeaRow[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((row) => {
    const r = row as Record<string, unknown>;
    return {
      komponent: asString(r.komponent ?? r.component),
      feilmodus: asString(r.feilmodus ?? r.failureMode),
      effekt: asString(r.effekt ?? r.effect),
      alvorlighet: asManglerNumber(r.alvorlighet ?? r.severity ?? r.s),
      sannsynlighet: asManglerNumber(r.sannsynlighet ?? r.occurrence ?? r.o),
      detekterbarhet: asManglerNumber(r.detekterbarhet ?? r.detection ?? r.d),
      rpn: asManglerNumber(r.rpn),
      tiltak: asString(r.tiltak ?? r.actions ?? r.tiltakAnbefalt),
      notat: typeof r.notat === 'string' ? r.notat : undefined,
    };
  });
}

function parseFareregisterRows(raw: unknown): FareregisterRow[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((row) => {
    const r = row as Record<string, unknown>;
    return {
      fareId: asString(r.fareId ?? r.id ?? r.fare_id),
      faretype: asString(r.faretype ?? r.hazard),
      livssyklusfase: asString(r.livssyklusfase ?? r.phase),
      eksponertePersoner: asString(r.eksponertePersoner ?? r.exposed),
      risikoForeTiltak: asString(r.risikoForeTiltak ?? r.riskBefore),
      tiltak: asString(r.tiltak ?? r.measures),
      residualrisiko: asString(r.residualrisiko ?? r.residualRisk),
    };
  });
}

function parsePlSilRows(raw: unknown): SikkerhetsfunksjonRow[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((row) => {
    const r = row as Record<string, unknown>;
    const kat = asString(r.kategori ?? r.category, 'MANGLER');
    const validKat =
      kat === 'B' || kat === '1' || kat === '2' || kat === '3' || kat === '4'
        ? kat
        : 'MANGLER';
    return {
      funksjon: asString(r.funksjon ?? r.function),
      kategori: validKat,
      arkitektur: asString(r.arkitektur ?? r.architecture),
      mttfd: (r.mttfd ?? r.MTTFd ?? 'MANGLER') as string | 'MANGLER',
      dc: (r.dc ?? r.DC ?? 'MANGLER') as string | 'MANGLER',
      ccfTiltak: asString(r.ccfTiltak ?? r.ccf),
      resultatPlEllerSil: asString(
        r.resultatPlEllerSil ?? r.pl ?? r.sil,
        'MANGLER'
      ) as string | 'MANGLER',
    };
  });
}

export function parseStructuredResponse(
  text: string,
  kind: StructuredDocumentData['kind']
): StructuredDocumentData | null {
  const jsonText = extractJsonBlock(text);
  if (!jsonText) return null;
  try {
    const parsed = JSON.parse(jsonText) as Record<string, unknown>;
    const rows = parsed.rows ?? parsed.data ?? parsed;
    switch (kind) {
      case 'fmea': {
        const fmeaRows = parseFmeaRows(rows);
        return fmeaRows.length ? { kind: 'fmea', rows: fmeaRows } : null;
      }
      case 'hazard_register': {
        const hrRows = parseFareregisterRows(rows);
        return hrRows.length ? { kind: 'hazard_register', rows: hrRows } : null;
      }
      case 'safety_function_analysis': {
        const sfRows = parsePlSilRows(rows);
        return sfRows.length
          ? { kind: 'safety_function_analysis', rows: sfRows }
          : null;
      }
      default:
        return null;
    }
  } catch {
    return null;
  }
}

/** Konverterer AI markdown til enkel HTML for prosa-dokumenter. */
export function markdownToHtml(text: string): string {
  const lines = text.split('\n');
  const parts: string[] = [];
  let inList = false;

  function closeList() {
    if (inList) {
      parts.push('</ul>');
      inList = false;
    }
  }

  for (const line of lines) {
    const t = line.trim();
    if (!t) {
      closeList();
      continue;
    }
    if (t.startsWith('# ')) {
      closeList();
      parts.push(`<h1>${escape(t.slice(2))}</h1>`);
    } else if (t.startsWith('## ')) {
      closeList();
      parts.push(`<h2>${escape(t.slice(3))}</h2>`);
    } else if (t.startsWith('### ')) {
      closeList();
      parts.push(`<h3>${escape(t.slice(4))}</h3>`);
    } else if (t.startsWith('- ') || t.startsWith('* ')) {
      if (!inList) {
        parts.push('<ul>');
        inList = true;
      }
      parts.push(`<li>${escape(t.replace(/^[-*]\s/, ''))}</li>`);
    } else if (t.startsWith('|') && t.includes('|')) {
      closeList();
      parts.push(`<p>${escape(t.replace(/\|/g, ' · '))}</p>`);
    } else {
      closeList();
      parts.push(`<p>${escape(t)}</p>`);
    }
  }
  closeList();
  return parts.join('\n') || '<p></p>';
}

function escape(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}
