import type { ProjectFormData } from './types';

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
    selectedDocuments: [],
  };
}
