import { getCatalogDocument } from './catalog';
import type { MissingRequiredDoc } from './completeness';

export function generateManglerTxt(
  missing: MissingRequiredDoc[],
  projectLabel?: string,
  projectId?: string | null
): string {
  if (missing.length === 0) return '';

  const lines = missing.map((doc) => {
    const ref = doc.directive ?? 'påkrevd';
    return `• ${doc.label} (${ref})`;
  });

  const date = new Date().toLocaleDateString('nb-NO');
  const title = projectLabel ? ` — ${projectLabel}` : '';

  return `MANGLENDE DOKUMENTER${title} — ${date}

Følgende dokumenter mangler før den tekniske filen er komplett:

${lines.join('\n')}

Disse dokumentene må legges inn av bruker eller tredjepart.
AI-genererte dokumenter er klare for gjennomgang.

${
    projectId
      ? `Last opp manglende dokumenter på: https://samsiq.no/app/output (prosjekt ${projectId})`
      : 'Last opp manglende dokumenter i Samsiq prosjektoversikten.'
  }
`;
}

export function getMissingDirective(documentId: string): string | undefined {
  return getCatalogDocument(documentId as never)?.directive;
}
