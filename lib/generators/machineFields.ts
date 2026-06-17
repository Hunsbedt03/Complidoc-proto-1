export type MachineFields = {
  maskin: string;
  produsent: string;
  serienr: string;
  prosjekt: string;
  kunde: string;
  ingenior: string;
  drivsystem: string;
  energikilde: string;
  installasjonsmiljo: string;
  styring: string;
  tiltenktBruk: string;
  marked: string;
  standarder: string;
  beskrivelse: string;
};

export function parseMachineFields(raw: string): MachineFields {
  const get = (key: string): string => {
    const m = raw.match(
      new RegExp('^' + key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ':\\s*(.+)$', 'm')
    );
    const val = m?.[1]?.trim() ?? '';
    return val && val !== 'Ikke spesifisert' ? val : '—';
  };
  const energikilde = get('Energikilde');
  const spenning = get('Spenningsforsyning');
  return {
    maskin: get('Maskin'),
    produsent: get('Produsent'),
    serienr: get('Serienummer'),
    prosjekt: get('Prosjekt/lokasjon'),
    kunde: get('Kunde'),
    ingenior: get('Ansvarlig ingeniør'),
    drivsystem: get('Drivsystem'),
    energikilde: energikilde !== '—' ? energikilde : spenning,
    installasjonsmiljo: get('Installasjonsmiljø'),
    styring: get('Styring'),
    tiltenktBruk: get('Tiltenkt bruk'),
    marked: get('Marked'),
    standarder: get('Relevante standarder'),
    beskrivelse: get('Beskrivelse'),
  };
}

export function buildPromptContext(machineData: string): string {
  const companyNote = machineData.includes('PRODUSENT / BEDRIFT')
    ? '\nVIKTIG: Produsentinformasjon under «PRODUSENT / BEDRIFT» skal brukes nøyaktig i dokumentet, spesielt i samsvarserklæringen.\n'
    : '';
  return `=== MASKINDATA FRA BRUKER ===
${machineData}
=== SLUTT MASKINDATA ===${companyNote}`;
}
