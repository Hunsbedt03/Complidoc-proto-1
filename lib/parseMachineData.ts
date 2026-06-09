import type { DocumentId } from './documents/ids';
import type { ISOCertification } from './documents/types';
import type { ProjectFormData } from './types';

const ISO_SLUGS = new Set<ISOCertification>([
  'iso_9001',
  'iso_14001',
  'iso_45001',
  'iso_13485',
  'iso_27001',
  'iatf_16949',
  'as9100',
  'none',
]);

function parseListLine(text: string, label: string): string[] {
  const re = new RegExp(`^${label}:\\s*(.+)$`, 'im');
  const m = text.match(re);
  const raw = m?.[1]?.trim();
  if (!raw || raw === 'Ingen' || raw === 'Ikke spesifisert') return [];
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

/** Les maskinfelter tilbake fra buildMachineData()-tekst (sky-lagrede prosjekter). */
export function projectFormFromMachineData(
  machineData: string | null | undefined,
  meta: {
    prosjekt: string;
    kunde?: string | null;
    produsent?: string | null;
    ingenior?: string | null;
  }
): ProjectFormData {
  const text = machineData ?? '';

  function line(label: string): string {
    const re = new RegExp(`^${label}:\\s*(.+)$`, 'im');
    const m = text.match(re);
    const v = m?.[1]?.trim();
    return v && v !== 'Ikke spesifisert' ? v : '';
  }

  return {
    prosjekt: meta.prosjekt,
    kunde: meta.kunde ?? '',
    produsent: meta.produsent ?? '',
    ingenior: meta.ingenior ?? line('Ansvarlig ingeniør'),
    maskin: line('Maskin'),
    serienr: line('Serienummer'),
    drivsystem: line('Drivsystem'),
    installasjonsmiljo: line('Installasjonsmiljø'),
    styring: line('Styring'),
    tiltenktbruk: line('Tiltenkt bruk'),
    marked: line('Marked'),
    standarder: line('Relevante standarder'),
    beskrivelse: line('Beskrivelse'),
    certifications: parseListLine(text, 'Sertifiseringer').filter((c): c is ISOCertification =>
      ISO_SLUGS.has(c as ISOCertification)
    ),
    addedDocuments: parseListLine(text, 'Tilleggsdokumenter') as DocumentId[],
    selectedDocuments: [],
  };
}
